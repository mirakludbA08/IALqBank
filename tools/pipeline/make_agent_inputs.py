"""Write one plain-text input file per paper for the classifying agents.

Usage: python -E make_agent_inputs.py <subject> [--missing]
Reads bank/<subject>/_raw/*/paper.json and writes bank/<subject>/_in/<paper_id>.txt
"""
import json
import os
import re
import sys

BANK = r"D:\IAL-drive-papers\bank"


def strip_dots(text):
    out = []
    for ln in text.split("\n"):
        core = re.sub(r"[.\s_…]", "", ln)
        if len(ln.strip()) > 8 and len(core) < 0.25 * len(ln.strip()):
            continue
        ln = re.sub(r"(\.\s?){6,}", " ", ln)
        out.append(ln)
    return "\n".join(out)


def main():
    subject = sys.argv[1]
    raw = os.path.join(BANK, subject, "_raw")
    out_dir = os.path.join(BANK, subject, "_in")
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for pid in sorted(os.listdir(raw)):
        pj = os.path.join(raw, pid, "paper.json")
        if not os.path.exists(pj):
            continue
        # --missing: only the papers that have no input file yet (the 2025 and 2026 papers)
        if "--missing" in sys.argv and os.path.exists(os.path.join(out_dir, pid + ".txt")):
            continue
        with open(pj, encoding="utf-8") as f:
            paper = json.load(f)
        lines = []
        lines.append("PAPER %s | unit %s | session %s %s" % (pid, paper["unit"], paper["month"], paper["year"]))
        lines.append("QP file: %s" % paper["qp_path"])
        lines.append("MS file: %s" % paper.get("ms_path"))
        lines.append("")
        lines.append("=== QUESTIONS (use these ids exactly) ===")
        for q in paper["questions"]:
            lines.append("")
            lines.append("## %s | %s marks | pages %s-%s" % (q["id"], q["marks"], q["pages"][0], q["pages"][1]))
            if q["parts"]:
                if q["stem_text"].strip():
                    lines.append("STEM: " + q["stem_text"].replace("\n", " ")[:1500])
                for p in q["parts"]:
                    lines.append("PART %s | id=%s" % (p["label"], p["id"]))
                    lines.append(p["text"][:1800])
            else:
                lines.append("(no parts) id=%s" % q["id"])
                lines.append(q["text"][:2500])
        lines.append("")
        lines.append("=== MARK SCHEME TEXT ===")
        msf = paper.get("ms_text_file")
        if msf and os.path.exists(msf):
            with open(msf, encoding="utf-8", errors="replace") as f:
                ms = f.read()
            ms = re.sub(r"Pearson Education Limited.*", "", ms)
            ms = re.sub(r"\n\s*\n+", "\n", ms)
            m_tab = re.search(r"(?m)^\s*Question\s*(Number)?\s*$|Question\s+Number", ms)
            if m_tab and m_tab.start() > 1500:
                ms = ms[m_tab.start():]
            lines.append(ms[:45000])
        with open(os.path.join(out_dir, pid + ".txt"), "w", encoding="utf-8") as f:
            f.write(strip_dots("\n".join(lines)))
        n += 1
    print("agent inputs written:", n)


if __name__ == "__main__":
    main()
