"""Aggregate bank.json into a compact statistics file for the study-report writer.

Usage: python -E report_data.py <subject>
Writes bank/<subject>/report-data.md
"""
import collections
import json
import os
import re
import sys

BANK = r"D:\IAL-drive-papers\bank"
SPEC = r"D:\IAL-drive-papers\spec"
CMD = ["Calculate", "Explain", "Describe", "Deduce", "Show that", "State", "Suggest", "Determine", "Sketch", "Draw", "Compare",
       "Justify", "Evaluate", "Identify", "Discuss", "Estimate", "Plot", "Analyse", "Predict", "Outline", "Name", "Write", "Give", "Complete", "Find", "Use"]


def main():
    subject = sys.argv[1]
    bank = json.load(open(os.path.join(BANK, subject, "bank.json"), encoding="utf-8"))
    todo = bank["todo"]
    tax_path = os.path.join(SPEC, "%s-taxonomy.json" % subject)
    tax = {}
    for e in json.load(open(tax_path, encoding="utf-8")):
        tax[e.get("code") or "S%d" % e["num"]] = e
    out = []
    out.append("# %s question bank statistics" % subject.title())
    out.append("")
    out.append("Items in to-do list (after bundling hence parts): %d" % len(todo))
    papers = sorted({r["paper_id"] for r in todo})
    out.append("Papers covered: %d" % len(papers))
    years = collections.Counter(re.search(r"(\d{4})$", p).group(1) for p in papers)
    out.append("Papers per year: " + ", ".join("%s=%d" % kv for kv in sorted(years.items())))
    mcq = sum(1 for r in todo if (r.get("marks") == 1))
    out.append("One-mark items (multiple choice): %d (%.0f%%)" % (mcq, 100.0 * mcq / max(1, len(todo))))
    hence = sum(1 for r in todo if r.get("hence"))
    dep = sum(1 for r in todo if r.get("depends_on"))
    out.append("Bundled hence items: %d ; items with listed prerequisites: %d" % (hence, dep))
    # unit totals
    by_unit = collections.defaultdict(lambda: [0, 0])
    for r in todo:
        u = (r.get("topic_path") or ["?"])[0]
        by_unit[u][0] += 1
        by_unit[u][1] += r.get("marks") or 0
    out.append("")
    out.append("## Items and marks by unit")
    for u, (n, m) in sorted(by_unit.items()):
        out.append("- %s: %d items, %d marks" % (u, n, m))
    # command words
    cw = collections.Counter()
    for r in todo:
        ha = r.get("how_asked") or ""
        for w in CMD:
            if re.search(r"\b%s\b" % re.escape(w), ha, re.I):
                cw[w] += 1
                break
    out.append("")
    out.append("## Command words found in how_asked (first match per item)")
    out.append(", ".join("%s=%d" % kv for kv in cw.most_common()))
    # per topic code
    groups = collections.defaultdict(list)
    for r in todo:
        groups[r.get("topic") or "none"].append(r)
    out.append("")
    out.append("## Per spec point (sorted by frequency)")
    for code, rs in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        e = tax.get(code)
        title = ("%s %s" % (code, e["text"][:90])) if e else code
        marks = sum(r.get("marks") or 0 for r in rs)
        yr = collections.Counter(re.search(r"(\d{4})$", r["paper_id"]).group(1) for r in rs)
        out.append("")
        out.append("### %s | %d items | %d marks | years: %s" % (title, len(rs), marks, ",".join("%s:%d" % kv for kv in sorted(yr.items()))))
        if e:
            out.append("Path: Unit %s > %s" % (e["unit"], e["topic"]))
        for r in rs[:3]:
            out.append("- how: " + (r.get("how_asked") or "")[:200])
            out.append("  ms: " + (r.get("ms_expectation") or "")[:220])
    with open(os.path.join(BANK, subject, "report-data.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print("report-data.md written,", len("\n".join(out)), "chars")


if __name__ == "__main__":
    main()
