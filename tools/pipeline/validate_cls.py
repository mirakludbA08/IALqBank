"""Validate agent classification files against the splitter output.

Usage: python -E validate_cls.py <subject>
Prints per-paper problems: bad JSON, missing ids, unknown ids, unknown topic codes, missing fields.
"""
import json
import os
import re
import sys

BANK = r"D:\IAL-drive-papers\bank"
SPEC = r"D:\IAL-drive-papers\spec"


def main():
    subject = sys.argv[1]
    with open(os.path.join(SPEC, "%s-taxonomy.json" % subject), encoding="utf-8") as f:
        valid_codes = {("S%d" % e["num"]) if subject == "physics" else (e.get("code") or "S%d" % e["num"]) for e in json.load(f)}
    valid_codes |= {"G", "OFF", "P3.planning", "P3.implementation", "P3.results", "P6.planning", "P6.implementation", "P6.analysis"}
    cls_dir = os.path.join(BANK, subject, "_cls")
    raw_dir = os.path.join(BANK, subject, "_raw")
    done = sorted(f[:-5] for f in os.listdir(cls_dir) if f.endswith(".json"))
    problems = 0
    total_items = 0
    for pid in done:
        try:
            with open(os.path.join(cls_dir, pid + ".json"), encoding="utf-8") as f:
                cls = json.load(f)
        except Exception as ex:
            print(pid, "BAD JSON", ex)
            problems += 1
            continue
        with open(os.path.join(raw_dir, pid, "paper.json"), encoding="utf-8") as f:
            paper = json.load(f)
        expected = []
        for q in paper["questions"]:
            if q["parts"]:
                expected += [p["id"] for p in q["parts"]]
            else:
                expected.append(q["id"])
        got = [it.get("id") for it in cls.get("items", [])]
        total_items += len(got)
        missing = [x for x in expected if x not in got]
        extra = [x for x in got if x not in expected]
        dup = sorted({x for x in got if got.count(x) > 1})
        bad_topic = sorted({it.get("topic") for it in cls["items"] if it.get("topic") not in valid_codes})
        bad_also = sorted({t for it in cls["items"] for t in it.get("also", []) if t not in valid_codes})
        no_fields = [it.get("id") for it in cls["items"] if not it.get("name") or not it.get("how_asked") or not it.get("ms_expectation")]
        bad_dep = []
        ids = set(got)
        for it in cls["items"]:
            for d in it.get("depends_on", []):
                if d.get("id") not in ids:
                    bad_dep.append("%s->%s" % (it["id"], d.get("id")))
        msgs = []
        if missing:
            msgs.append("missing %d: %s" % (len(missing), ",".join(m.split("-", 1)[1] for m in missing[:8])))
        if extra:
            msgs.append("extra %d: %s" % (len(extra), ",".join(extra[:5])))
        if dup:
            msgs.append("dup: %s" % dup[:5])
        if bad_topic:
            msgs.append("bad topic: %s" % bad_topic)
        if bad_also:
            msgs.append("bad also: %s" % bad_also)
        if no_fields:
            msgs.append("empty fields: %d" % len(no_fields))
        if bad_dep:
            msgs.append("bad depends_on: %s" % bad_dep[:4])
        if msgs:
            problems += 1
            print(pid, "|", " | ".join(msgs))
    print("papers validated: %d, with problems: %d, items: %d" % (len(done), problems, total_items))


if __name__ == "__main__":
    main()
