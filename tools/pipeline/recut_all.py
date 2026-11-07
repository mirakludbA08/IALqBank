"""Re-cut every question and part screenshot of a subject's current-specification papers from the
page images already rendered, with the page filter in pagefilter.py: pages with none of the
question on them (blank pages, follow-on pages of lines to write on) are left out.

The questions and parts stay as they are in paper.json, so the classifications still match.
Run build_bank.py afterwards (it re-makes the bundled "hence" screenshots with the same filter),
then reexport_changed.py.

Usage: python -E recut_all.py <subject> [paper_id ...]
"""
import json
import os
import re
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_papers as pp  # noqa: E402
import recrop  # noqa: E402

SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
OLD_SPEC = re.compile(r"^(WPH0\d|WCH0\d|WBI0\d|WMA0[12]|WDM01)")


def site_papers(subject):
    with open(os.path.join(SITE, "data", subject + ".json"), encoding="utf-8") as f:
        items = json.load(f)["items"]
    return sorted({x["paper"] for x in items if not OLD_SPEC.match(x["paper"])})


def one(job):
    subject, pid = job
    pp.TRIM_ANSWER_SPACE = subject == "maths"
    pj = os.path.join(pp.BANK, subject, "_raw", pid, "paper.json")
    if not os.path.exists(pj):
        return pid, "no paper.json"
    with open(pj, encoding="utf-8") as f:
        paper = json.load(f)
    if not paper["questions"]:
        return pid, "no questions"
    tmp = os.path.join(tempfile.gettempdir(), "recut_%s_%d.xml" % (pid, os.getpid()))
    pages = pp.bbox_pages(paper["qp_path"], tmp)
    try:
        os.remove(tmp)
    except OSError:
        pass
    imgs = sorted(os.path.join(paper["pages_dir"], f) for f in os.listdir(paper["pages_dir"]) if f.startswith("pg-") and f.endswith(".jpg"))
    recrop.shots(paper, pages, imgs)
    with open(pj, "w", encoding="utf-8") as f:
        json.dump(paper, f, indent=1, ensure_ascii=False)
    return pid, "ok"


def main():
    subject = sys.argv[1]
    papers = sys.argv[2:] or site_papers(subject)
    bad = []
    with ProcessPoolExecutor(max_workers=int(os.environ.get("WORKERS", "2"))) as ex:
        for i, (pid, status) in enumerate(ex.map(one, [(subject, p) for p in papers]), 1):
            if status != "ok":
                bad.append((pid, status))
            if i % 50 == 0:
                print("  re-cut", i, "of", len(papers), flush=True)
    print(subject, "papers re-cut:", len(papers) - len(bad), "| skipped:", bad)


if __name__ == "__main__":
    main()
