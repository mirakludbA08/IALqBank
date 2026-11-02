import json
import re

SPEC = r"D:\IAL-drive-papers\spec\maths-spec.txt"
OUT_JSON = r"D:\IAL-drive-papers\spec\maths-taxonomy.json"
OUT_TXT = r"D:\IAL-drive-papers\spec\maths-taxonomy.txt"

# unit label, unit name, paper codes (current / previous specification)
UNITS = [
    ("P1", "Pure Mathematics 1", "WMA11 / WMA01"),
    ("P2", "Pure Mathematics 2", "WMA12 / WMA02"),
    ("P3", "Pure Mathematics 3", "WMA13"),
    ("P4", "Pure Mathematics 4", "WMA14"),
    ("FP1", "Further Pure Mathematics 1", "WFM01"),
    ("FP2", "Further Pure Mathematics 2", "WFM02"),
    ("FP3", "Further Pure Mathematics 3", "WFM03"),
    ("M1", "Mechanics 1", "WME01"),
    ("M2", "Mechanics 2", "WME02"),
    ("M3", "Mechanics 3", "WME03"),
    ("S1", "Statistics 1", "WST01"),
    ("S2", "Statistics 2", "WST02"),
    ("S3", "Statistics 3", "WST03"),
    ("D1", "Decision Mathematics 1", "WDM11 / WDM01"),
]


def clean(text):
    text = text.replace("\u2019", "'").replace("\u2013", "-").replace("\u2212", "-")
    text = re.sub(r"[^\x20-\x7e]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    with open(SPEC, encoding="utf-8", errors="replace") as f:
        lines = f.read().replace("\r", "").split("\n")
    # content sections start at "<UNIT>.3 Unit content"
    starts = []
    for i, line in enumerate(lines):
        m = re.match(r"^\s*(P1|P2|P3|P4|FP1|FP2|FP3|M1|M2|M3|S1|S2|S3|D1)\.3\s+Unit content", line)
        if m:
            starts.append((i, m.group(1)))
    entries = []
    topic_re = re.compile(r"^\s{0,2}(\d{1,2})\.\s+([A-Z][^\d]{2,80}?)(?:\s+continued)?\s*$")
    stmt_re = re.compile(r"^\s{0,3}(\d{1,2})\.(\d{1,2})\s+(\S.*)$")
    for k, (start, unit) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        # stop at the next unit's first heading so descriptions are not read as content
        for j in range(start + 1, end):
            if re.match(r"^\s*Unit (P|FP|M|S|D)\d?\d?: ", lines[j]) and lines[j].strip() != "":
                end = j
                break
        uname = next(u[1] for u in UNITS if u[0] == unit)
        topics = {}
        cur_topic = None
        cur = None
        for j in range(start + 1, end):
            line = lines[j]
            if "Pearson Edexcel International Advanced" in line or "Specification" in line and "Pearson" in line:
                continue
            m = topic_re.match(line)
            if m and not re.search(r"\s{6,}", line.strip()):
                cur_topic = int(m.group(1))
                topics.setdefault(cur_topic, clean(m.group(2)))
                cur = None
                continue
            m = stmt_re.match(line)
            if m and cur_topic is not None and int(m.group(1)) == cur_topic:
                parts = re.split(r"\s{6,}", m.group(3))
                cur = {
                    "unit": unit,
                    "unit_name": uname,
                    "topic_num": cur_topic,
                    "topic": topics[cur_topic],
                    "num": int(m.group(2)),
                    "code": "%s.%d.%d" % (unit, cur_topic, int(m.group(2))),
                    "text": clean(parts[0]),
                }
                entries.append(cur)
            elif cur is not None and line.strip() and re.match(r"^\s{4,}\S", line) and not re.match(r"^\s{30,}", line):
                parts = re.split(r"\s{6,}", line.strip())
                cur["text"] = (cur["text"] + " " + clean(parts[0]))[:140]
    for e in entries:
        e["text"] = e["text"][:140]
    json.dump(entries, open(OUT_JSON, "w", encoding="utf-8"), indent=1)
    out = []
    last = None
    for e in entries:
        key = (e["unit"], e["topic_num"])
        if key != last:
            out.append("")
            out.append("Unit %s %s > Topic %d %s" % (e["unit"], e["unit_name"], e["topic_num"], e["topic"]))
            last = key
        out.append("  %s: %s" % (e["code"], e["text"]))
    out.append("")
    out.append("Paper codes: " + "; ".join("%s = %s" % (u[2], u[0] + " " + u[1]) for u in UNITS))
    open(OUT_TXT, "w", encoding="utf-8").write("\n".join(out))
    by = {}
    for e in entries:
        by[e["unit"]] = by.get(e["unit"], 0) + 1
    print("entries:", len(entries), "per unit:", by)


if __name__ == "__main__":
    main()
