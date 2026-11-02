import json
import re
import sys

SPEC = r"D:\IAL-drive-papers\spec\physics-spec.txt"
OUT = r"D:\IAL-drive-papers\spec\physics-taxonomy.json"

# (unit, topic name, first line number (1-based), last line number exclusive)
SECTIONS = [
    (1, "Mechanics", 675, 761),
    (1, "Materials", 761, 805),
    (2, "Waves and Particle Nature of Light", 854, 951),
    (2, "Electric Circuits", 951, 1024),
    (3, "Practical Skills: Planning", 1068, 1093),
    (3, "Practical Skills: Implementation and Measurements", 1093, 1117),
    (3, "Practical Skills: Processing Results", 1117, 1144),
    (4, "Further Mechanics", 1193, 1239),
    (4, "Electric and Magnetic Fields", 1239, 1324),
    (4, "Nuclear and Particle Physics", 1324, 1372),
    (5, "Thermodynamics", 1427, 1455),
    (5, "Nuclear Decay", 1455, 1495),
    (5, "Oscillations", 1495, 1536),
    (5, "Astrophysics and Cosmology", 1536, 1601),
    (6, "Practical Skills: Planning", 1651, 1672),
    (6, "Practical Skills: Implementation and Measurements", 1672, 1695),
    (6, "Practical Skills: Analysis", 1695, 1724),
]

UNIT_NAMES = {
    1: "Mechanics and Materials",
    2: "Waves and Electricity",
    3: "Practical Skills in Physics I",
    4: "Further Mechanics, Fields and Particles",
    5: "Thermodynamics, Radiation, Oscillations and Cosmology",
    6: "Practical Skills in Physics II",
}


def clean(text):
    text = text.replace("\u00e2\u20ac\u2122", "'").replace("\u00e2\u20ac\u201c", "-")
    text = re.sub(r"[^\x20-\x7e]", "", text)
    return re.sub(r"\s+", " ", text).strip()


def main():
    with open(SPEC, encoding="utf-8", errors="replace") as f:
        lines = f.read().replace("\r", "").split("\n")
    entries = []
    stmt_re = re.compile(r"^\s{0,8}(\d{1,3})\s{2,}(\S.*)$")
    for unit, topic, start, end in SECTIONS:
        current = None
        for i in range(start - 1, end - 1):
            line = lines[i]
            if "Pearson Edexcel International Advanced" in line:
                continue
            m = stmt_re.match(line)
            if m:
                current = {
                    "unit": unit,
                    "unit_name": UNIT_NAMES[unit],
                    "topic": topic,
                    "num": int(m.group(1)),
                    "text": clean(m.group(2)),
                }
                entries.append(current)
            elif current is not None and line.strip():
                current["text"] = (current["text"] + " " + clean(line))[:140]
    for e in entries:
        e["text"] = e["text"][:140]
        e["code"] = "U%d.%d" % (e["unit"], e["num"])
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=1)
    print("entries:", len(entries))
    by = {}
    for e in entries:
        by.setdefault((e["unit"], e["topic"]), []).append(e["num"])
    for k, v in by.items():
        print(k, len(v), "statements", min(v), "-", max(v))


if __name__ == "__main__":
    sys.exit(main())
