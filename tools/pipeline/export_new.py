"""Add the 2025 and 2026 questions to the website: their screenshots in img/<subject>/ and their
items in data/<subject>.json.

Usage: python -E export_new.py <subject>
Reads   bank/<subject>/bank.json (made by build_bank.py after the agents' _cls files are in)
Writes  img/<subject>/<id>.webp for each new item, and appends the items to data/<subject>.json,
        leaving every existing item as it is.

Same item fields, image width and quality as export_site.py. A paper id such as WPH11A_Jan2026 is
the "A" version of Unit WPH11 for that session: its unit is WPH11. The question paper and mark
scheme are named by the paper id, as in the release staging folders (WPH11A_Jan2026_QP.pdf).
Answer-book pages that repeat the questions, the data sheet and inserts (the splitter reads them as
extra questions, and the classifying agents named them) are left out.
"""
import json
import os
import re
import sys

from PIL import Image

BANK = r"D:\IAL-drive-papers\bank"
SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
WIDTH = 760
QUALITY = 60
NEW = re.compile(r"_(Jan|Feb|May|Jun|Oct|Nov)202[56]$")


def safe_file(i):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", i)


# Pages the splitter reads as questions that are not: the answer book's copy of the paper, the
# data and formulae sheet, an insert. The classifying agents named them as such.
ANSWER_BOOK = re.compile(r"answer[ -]?book", re.I)
NOT_A_QUESTION = re.compile(r"not a question|data and formulae|data sheet|cover page|^insert:", re.I)


def is_filler(r):
    name = str(r.get("name") or "")
    if ANSWER_BOOK.search(name):
        return True
    return not r.get("marks") and bool(NOT_A_QUESTION.search(name))


def main():
    subject = sys.argv[1]
    with open(os.path.join(BANK, subject, "bank.json"), encoding="utf-8") as f:
        bank = json.load(f)
    # The answer book's copy of the paper follows the data sheet at the end of a question paper
    # (the splitter reads each page of it as a question, and the agents do not always say so): cut
    # each paper at its first data sheet or answer-book item.
    cut = {}
    for r in bank["todo"]:
        if NEW.search(r["paper_id"]) and is_filler(r):
            cut[r["paper_id"]] = min(cut.get(r["paper_id"], 10 ** 6), r["question"])
    todo = [r for r in bank["todo"] if NEW.search(r["paper_id"]) and r["question"] < cut.get(r["paper_id"], 10 ** 6)]
    members = {r["id"]: r.get("bundled_into") for r in bank["bundled_members"] if NEW.search(r["paper_id"])}
    visible = {r["id"] for r in todo}

    def target(i):
        return i if i in visible else members.get(i)

    path = os.path.join(SITE, "data", subject + ".json")
    with open(path, encoding="utf-8") as f:
        site = json.load(f)
    have = {x["id"] for x in site["items"]}
    # The site's topic tree is built from each item's path, so a new item takes the path the
    # existing items with the same topic code already have (the short spec-point names differ in
    # spelling between builds, which would split one spec point into two).
    canon = {}
    for x in site["items"]:
        if x.get("topic") and x.get("path") and x["topic"] not in canon and not NEW.search(x["paper"]):
            canon[x["topic"]] = x["path"]
    img_dir = os.path.join(SITE, "img", subject)
    os.makedirs(img_dir, exist_ok=True)
    added = no_img = 0
    for r in todo:
        if r["id"] in have:
            continue
        pid = r["paper_id"]
        m = re.match(r"(W[A-Z]{2}\d{2})A?_([A-Za-z]+)(\d{4})$", pid)
        unit_code, month, year = (m.group(1), m.group(2), int(m.group(3))) if m else (pid, "", 0)
        img_name = safe_file(r["id"]) + ".webp"
        src = r.get("screenshot")
        ok = False
        if src and os.path.exists(src):
            im = Image.open(src).convert("RGB")
            if im.width > WIDTH:
                im = im.resize((WIDTH, int(im.height * WIDTH / im.width)), Image.LANCZOS)
            im.save(os.path.join(img_dir, img_name), "WEBP", quality=QUALITY, method=6)
            ok = True
        else:
            no_img += 1
        deps = []
        for d in r.get("depends_on", []):
            t = target(d.get("id"))
            if t and t != r["id"] and t not in [x["id"] for x in deps]:
                deps.append({"id": t, "name": d.get("name"), "why": d.get("why")})
        site["items"].append({
            "id": r["id"], "paper": pid, "unit": unit_code, "month": month, "year": year,
            "q": r["question"], "part": r.get("part"), "name": r.get("name"), "topic": r.get("topic"),
            "also": r.get("also") or [], "marks": r.get("marks"), "how": r.get("how_asked"),
            "ms": r.get("ms_expectation"), "deps": deps, "bundle": r.get("bundle_of"),
            "hence": bool(r.get("hence")),
            "qp": subject.title() + "/" + pid + "_QP.pdf", "msf": subject.title() + "/" + pid + "_MS.pdf",
            "pages": r.get("pages"), "path": canon.get(r.get("topic")) or r.get("topic_path"),
            "img": ("img/%s/%s" % (subject, img_name)) if ok else None,
        })
        added += 1
    site["count"] = len(site["items"])
    with open(path, "w", encoding="utf-8") as f:
        json.dump(site, f, ensure_ascii=False, separators=(",", ":"))
    print(subject, "items added:", added, "| without an image:", no_img, "| items on the site now:", site["count"])


if __name__ == "__main__":
    main()
