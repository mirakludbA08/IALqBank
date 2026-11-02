"""Where the splitter saw a whole question (no parts) but an agent classified lettered parts,
merge those part items into one item with the question id so the bank has an entry for it.

Usage: python -E merge_part_items.py <subject>
"""
import json
import os
import sys

BANK = r"D:\IAL-drive-papers\bank"


def main():
    subject = sys.argv[1]
    raw = os.path.join(BANK, subject, "_raw")
    cls_dir = os.path.join(BANK, subject, "_cls")
    fixed = 0
    for pid in sorted(os.listdir(raw)):
        pj = os.path.join(raw, pid, "paper.json")
        cj = os.path.join(cls_dir, pid + ".json")
        if not (os.path.exists(pj) and os.path.exists(cj)):
            continue
        paper = json.load(open(pj, encoding="utf-8"))
        cls = json.load(open(cj, encoding="utf-8"))
        have = {it["id"] for it in cls["items"]}
        changed = False
        for q in paper["questions"]:
            if q["parts"] or q["id"] in have:
                continue
            kids = [it for it in cls["items"] if it["id"].startswith(q["id"] + "-")]
            if not kids:
                continue
            marks = sum((k.get("marks") or 0) for k in kids) or q.get("marks")
            also = []
            for k in kids:
                for c in [k.get("topic")] + list(k.get("also", [])):
                    if c and c != kids[0].get("topic") and c not in also:
                        also.append(c)
            cls["items"].append({
                "id": q["id"],
                "name": (kids[0].get("name") or q["id"])[:60],
                "topic": kids[0].get("topic"),
                "also": also[:3],
                "marks": marks,
                "how_asked": "Whole question (parts " + ", ".join(k["id"].rsplit("-", 1)[1] for k in kids) + "): " + (kids[0].get("how_asked") or ""),
                "ms_expectation": " | ".join("(%s) %s" % (k["id"].rsplit("-", 1)[1], (k.get("ms_expectation") or "")[:200]) for k in kids)[:900],
                "depends_on": [],
                "hence": any(k.get("hence") for k in kids),
            })
            changed = True
            fixed += 1
        if changed:
            json.dump(cls, open(cj, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    print("merged question items:", fixed)


if __name__ == "__main__":
    main()
