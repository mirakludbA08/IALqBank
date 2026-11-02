import json
import re

SPEC = r"D:\IAL-drive-papers\spec\chemistry-spec.txt"
OUT_JSON = r"D:\IAL-drive-papers\spec\chemistry-taxonomy.json"
OUT_TXT = r"D:\IAL-drive-papers\spec\chemistry-taxonomy.txt"

UNIT_OF_TOPIC = {}
for t in range(1, 6):
    UNIT_OF_TOPIC[t] = 1
for t in range(6, 11):
    UNIT_OF_TOPIC[t] = 2
for t in range(11, 16):
    UNIT_OF_TOPIC[t] = 4
for t in range(16, 21):
    UNIT_OF_TOPIC[t] = 5
UNIT_NAMES = {
    1: "Structure, Bonding and Introduction to Organic Chemistry",
    2: "Energetics, Group Chemistry, Halogenoalkanes and Analytical Techniques",
    3: "Practical Skills in Chemistry I",
    4: "Rates, Equilibria and Further Organic Chemistry",
    5: "Transition Metals and Organic Nitrogen Chemistry",
    6: "Practical Skills in Chemistry II",
}


def clean(text):
    text = text.replace("\u2019", "'").replace("\u2013", "-")
    text = re.sub(r"[^\x20-\x7e]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    with open(SPEC, encoding="utf-8", errors="replace") as f:
        lines = f.read().replace("\r", "").split("\n")
    topic_re = re.compile(r"^\s*Topic (\d{1,2}): (.+)$")
    stmt_re = re.compile(r"^\s{0,8}(\d{1,2})\.(\d{1,2})\s{2,}(\S.*)$")
    topics = {}
    entries = []
    cur_topic = None
    cur = None
    for i, line in enumerate(lines):
        if i < 700:
            continue
        m = topic_re.match(line)
        if m and int(m.group(1)) not in topics:
            cur_topic = int(m.group(1))
            topics[cur_topic] = clean(m.group(2))
            cur = None
            continue
        if cur_topic is None:
            continue
        if re.match(r"^\s*Unit \d: ", line) and "Pearson" not in line and i > 2700:
            break
        if "Pearson Edexcel International Advanced" in line:
            continue
        m = stmt_re.match(line)
        if m and int(m.group(1)) == cur_topic:
            cur = {
                "unit": UNIT_OF_TOPIC[cur_topic],
                "unit_name": UNIT_NAMES[UNIT_OF_TOPIC[cur_topic]],
                "topic_num": cur_topic,
                "topic": topics[cur_topic],
                "num": int(m.group(2)),
                "code": "C%d.%d" % (cur_topic, int(m.group(2))),
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
    out.append("Unit 3 and Unit 6 are practical-skills papers: use P3.planning, P3.implementation, P3.results (Unit 3) or P6.planning, P6.implementation, P6.analysis (Unit 6) plus any C-code they test in `also`.")
    open(OUT_TXT, "w", encoding="utf-8").write("\n".join(out))
    by = {}
    for e in entries:
        by.setdefault(e["topic_num"], 0)
        by[e["topic_num"]] += 1
    print("entries:", len(entries), "per topic:", by)


if __name__ == "__main__":
    main()
