import json
import re

SPEC = r"D:\IAL-drive-papers\spec\biology-spec.txt"
OUT_JSON = r"D:\IAL-drive-papers\spec\biology-taxonomy.json"
OUT_TXT = r"D:\IAL-drive-papers\spec\biology-taxonomy.txt"

TOPIC_TITLES = {
    1: "Molecules, Transport and Health",
    2: "Membranes, Proteins, DNA and Gene Expression",
    3: "Cell Structure, Reproduction and Development",
    4: "Plant Structure and Function, Biodiversity and Conservation",
    5: "Energy Flow, Ecosystems and the Environment",
    6: "Microbiology, Immunity and Forensics",
    7: "Respiration, Muscles and the Internal Environment",
    8: "Coordination, Response and Gene Technology",
}
UNIT_OF_TOPIC = {1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4, 7: 5, 8: 5}
UNIT_NAMES = {
    1: "Molecules, Diet, Transport and Health",
    2: "Cells, Development, Biodiversity and Conservation",
    3: "Practical Skills in Biology I",
    4: "Energy, Environment, Microbiology and Immunity",
    5: "Respiration, Internal Environment, Coordination and Gene Technology",
    6: "Practical Skills in Biology II",
}


def clean(text):
    text = text.replace("\u2019", "'").replace("\u2013", "-").replace("\u03b2", "beta")
    text = re.sub(r"[^\x20-\x7e]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    with open(SPEC, encoding="utf-8", errors="replace") as f:
        lines = f.read().replace("\r", "").split("\n")
    topic_re = re.compile(r"^\s*Topic (\d) [\u2013-] ")
    stmt_re = re.compile(r"^\s{0,8}(\d)\.(\d{1,2})\s{2,}(\S.*)$")
    entries = []
    cur_topic = None
    cur = None
    seen = set()
    for i, line in enumerate(lines):
        if i < 600:
            continue
        m = topic_re.match(line)
        if m and int(m.group(1)) not in seen:
            cur_topic = int(m.group(1))
            seen.add(cur_topic)
            cur = None
            continue
        if cur_topic is None:
            continue
        if "Pearson Edexcel International Advanced" in line:
            continue
        if re.match(r"^\s*Unit \d: .*\d+\s*$", line) and i > 1700:
            break
        m = stmt_re.match(line)
        if m and int(m.group(1)) == cur_topic:
            cur = {
                "unit": UNIT_OF_TOPIC[cur_topic],
                "unit_name": UNIT_NAMES[UNIT_OF_TOPIC[cur_topic]],
                "topic_num": cur_topic,
                "topic": TOPIC_TITLES[cur_topic],
                "num": int(m.group(2)),
                "code": "B%d.%d" % (cur_topic, int(m.group(2))),
                "text": clean(m.group(3)),
            }
            entries.append(cur)
        elif cur is not None and line.strip() and not re.match(r"^\s*Topic \d", line):
            cur["text"] = (cur["text"] + " " + clean(line))[:140]
    for e in entries:
        e["text"] = e["text"][:140]
    json.dump(entries, open(OUT_JSON, "w", encoding="utf-8"), indent=1)
    out = []
    last = None
    for e in entries:
        key = (e["unit"], e["topic_num"])
        if key != last:
            out.append("")
            out.append("Unit %d %s > Topic %d %s" % (e["unit"], e["unit_name"], e["topic_num"], e["topic"]))
            last = key
        out.append("  %s: %s" % (e["code"], e["text"]))
    out.append("")
    out.append("Unit 3 and Unit 6 are practical-skills papers: use P3.planning, P3.implementation, P3.results (Unit 3) or P6.planning, P6.implementation, P6.analysis (Unit 6) plus any B-code they test in `also`.")
    open(OUT_TXT, "w", encoding="utf-8").write("\n".join(out))
    by = {}
    for e in entries:
        by[e["topic_num"]] = by.get(e["topic_num"], 0) + 1
    print("entries:", len(entries), "per topic:", by)


if __name__ == "__main__":
    main()
