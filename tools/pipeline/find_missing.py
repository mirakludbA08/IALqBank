"""List the question parts the splitter now finds that an agent file does not cover yet.

Usage: python -E find_missing.py <subject>
Writes bank/<subject>/patch.json  {paper_id: [missing ids]}  and prints a summary.
"""
import json
import os
import sys

BANK = r"D:\IAL-drive-papers\bank"


def main():
    subject = sys.argv[1]
    raw = os.path.join(BANK, subject, "_raw")
    cls_dir = os.path.join(BANK, subject, "_cls")
    patch = {}
    n_missing = 0
    for pid in sorted(os.listdir(raw)):
        pj = os.path.join(raw, pid, "paper.json")
        cj = os.path.join(cls_dir, pid + ".json")
        if not (os.path.exists(pj) and os.path.exists(cj)):
            continue
        paper = json.load(open(pj, encoding="utf-8"))
        cls = json.load(open(cj, encoding="utf-8"))
        have = {it.get("id") for it in cls.get("items", [])}
        expected = []
        for q in paper["questions"]:
            if q["parts"]:
                expected += [p["id"] for p in q["parts"]]
            else:
                expected.append(q["id"])
        missing = [x for x in expected if x not in have]
        if missing:
            patch[pid] = missing
            n_missing += len(missing)
    json.dump(patch, open(os.path.join(BANK, subject, "patch.json"), "w", encoding="utf-8"), indent=1)
    print(subject, "papers with missing items:", len(patch), "| missing items:", n_missing)


if __name__ == "__main__":
    main()
