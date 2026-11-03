"""Re-cut a subject's question screenshots from the page images already rendered, after two
fixes to the splitter in process_papers.py:

- Question 1 now starts at its number when the paper prints no "Answer ALL questions" line
  (most Maths papers and some Chemistry practicals), instead of on the page of its Total line,
  which could leave only the "Question 1 continued" answer page in the screenshot.
- Maths screenshots squeeze out the long stretches of ruled answer space, and follow-on pages
  drop their "Question N continued" heading.

The questions and parts stay as they are in paper.json, so the agents' classifications still
match their ids. Run build_bank.py and export_site.py afterwards.

Usage: python -E recrop.py <subject>
"""
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_papers as pp  # noqa: E402


def shots(paper, pages, imgs, only_first=False):
    """Save each question's whole screenshot and its parts' screenshots, as process() does."""
    raw_dir = os.path.dirname(paper["questions"][0]["screenshot"] or paper["pages_dir"])
    for qi, q in enumerate(paper["questions"]):
        if only_first and qi > 0:
            break
        start, qend = tuple(q["start"]), tuple(q["end"])
        plist = q["parts"]
        stem_strips = []
        if plist:
            stem_end = (plist[0]["start"][0], plist[0]["start"][1] - 10)
            if not (stem_end[0] == start[0] and stem_end[1] - start[1] < 2):
                stem_strips = pp.strips_for_range(start, stem_end, pages, imgs)
        for p in plist:
            shot = p["screenshot"] or os.path.join(raw_dir, "Q%d_%s.jpg" % (q["number"], p["label"]))
            if pp.save_strips(stem_strips + pp.strips_for_range(tuple(p["start"]), tuple(p["end"]), pages, imgs), shot):
                p["screenshot"] = shot
        whole = q["screenshot"] or os.path.join(raw_dir, "Q%d.jpg" % q["number"])
        if pp.save_strips(pp.strips_for_range(start, qend, pages, imgs), whole):
            q["screenshot"] = whole


def main():
    subject = sys.argv[1]
    pp.TRIM_ANSWER_SPACE = subject == "maths"
    raw_root = os.path.join(pp.BANK, subject, "_raw")
    tmp = os.path.join(tempfile.gettempdir(), "recrop_%s.xml" % subject)
    moved = []
    done = 0
    only = sys.argv[2] if len(sys.argv) > 2 else None   # one paper, for a test
    for pid in sorted(os.listdir(raw_root)):
        if only and pid != only:
            continue
        pj = os.path.join(raw_root, pid, "paper.json")
        if not os.path.exists(pj):
            continue
        with open(pj, encoding="utf-8") as f:
            paper = json.load(f)
        if not paper["questions"]:
            continue
        pages = pp.bbox_pages(paper["qp_path"], tmp)
        imgs = sorted(os.path.join(paper["pages_dir"], f) for f in os.listdir(paper["pages_dir"]) if f.startswith("pg-") and f.endswith(".jpg"))
        q1 = paper["questions"][0]
        fixed = pp.split_questions(pages)
        changed = False
        if fixed:
            new = tuple(fixed[0]["start"])
            old = tuple(q1["start"])
            # Earlier page, or more than 15pt higher on the same page.
            if new[0] < old[0] or (new[0] == old[0] and old[1] - new[1] > 15):
                q1["start"] = [new[0], new[1]]
                q1["pages"] = [new[0] + 1, q1["pages"][1]]
                moved.append(pid)
                changed = True
        if subject == "maths":
            shots(paper, pages, imgs)
        elif changed:
            shots(paper, pages, imgs, only_first=True)
        else:
            continue
        with open(pj, "w", encoding="utf-8") as f:
            json.dump(paper, f, indent=1, ensure_ascii=False)
        done += 1
        if done % 25 == 0:
            print("  re-cut", done, "papers", flush=True)
    print(subject, "papers re-cut:", done, "| Question 1 moved earlier in", len(moved))
    with open(os.path.join(pp.BANK, subject, "recrop.log"), "w", encoding="utf-8") as f:
        f.write("\n".join(moved))


if __name__ == "__main__":
    main()
