"""Merge splitter output with the agents' classifications into the final topic-organised bank.

Usage: python -E build_bank.py <subject>
Reads   bank/<subject>/_raw/<paper>/paper.json, bank/<subject>/_cls/<paper>.json, spec/<subject>-taxonomy.json
Writes  bank/<subject>/topics/<Unit>/<Topic>/<code>/<item>.jpg   (one screenshot per to-do item)
        bank/<subject>/bank.json                                 (every item with notes, location, prerequisites)

Hence rule: a part that builds on the part(s) before it ("hence", "otherwise", "use your answer to (a)")
is saved together with them as one bundle (one screenshot); the separate entries are removed from the
to-do list (marked bundled_into).
"""
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_papers as pp  # noqa: E402

BANK = pp.BANK
SPEC = r"D:\IAL-drive-papers\spec"


def safe(name):
    return re.sub(r"[^A-Za-z0-9 _.,()+&-]", "", name).strip(" .")[:70] or "item"


def load_taxonomy(subject):
    path = os.path.join(SPEC, "%s-taxonomy.json" % subject)
    with open(path, encoding="utf-8") as f:
        tax = json.load(f)
    by_code = {}
    for e in tax:
        by_code[e.get("code") if subject != "physics" else "S%d" % e["num"]] = e
    return by_code


def topic_path(code, tax):
    if code in tax:
        e = tax[code]
        short = re.sub(r"^(be able to|know and understand|know,? and understand how to|understand|know)\s+", "", e["text"], flags=re.I)
        short = safe(short)[:28].rstrip(" .-")
        topic = e["topic"]
        if e.get("topic_num"):
            topic = "Topic %d %s" % (e["topic_num"], e["topic"])
        unit_label = ("Unit %d %s" % (e["unit"], e["unit_name"])) if isinstance(e["unit"], int) else ("Unit %s %s" % (e["unit"], e["unit_name"]))
        return (safe(unit_label), safe(topic), safe("%s - %s" % (code, short)))
    m = re.match(r"P(\d)\.(\w+)", code or "")
    if m:
        unit = "Unit %s Practical Skills" % m.group(1)
        return (safe(unit), "Practical skills", safe(code))
    if code == "G":
        return ("General skills", "Units, measurement, graphs and uncertainty", "G")
    if code == "OFF":
        return ("Off current spec", "Older-spec content not on the 2018 spec", "OFF")
    return ("Unmapped", "Unmapped", safe(code or "none"))


def rebuild_pages(paper):
    # The text lines let strips_for_range drop "Question N continued" headings.
    pages = pp.bbox_pages(paper["qp_path"], os.path.join(BANK, "_bundle_bbox.xml"))
    if len(pages) != len(paper["page_sizes"]):
        pages = [{"w": w, "h": h, "lines": []} for (w, h) in paper["page_sizes"]]
    pdir = paper["pages_dir"]
    imgs = sorted(os.path.join(pdir, f) for f in os.listdir(pdir) if f.startswith("pg-") and f.endswith(".jpg"))
    return pages, imgs


def main():
    subject = sys.argv[1]
    pp.TRIM_ANSWER_SPACE = subject == "maths"
    tax = load_taxonomy(subject)
    globals()["subject"] = subject
    raw_root = os.path.join(BANK, subject, "_raw")
    cls_root = os.path.join(BANK, subject, "_cls")
    out_root = os.path.join(BANK, subject, "topics")
    if os.path.isdir(out_root):
        shutil.rmtree(out_root)
    items_out = []
    stats = {"papers": 0, "items": 0, "bundles": 0, "missing_cls": 0, "no_shot": 0}
    for pid in sorted(os.listdir(raw_root)):
        pj = os.path.join(raw_root, pid, "paper.json")
        cj = os.path.join(cls_root, pid + ".json")
        if not os.path.exists(pj):
            continue
        if not os.path.exists(cj):
            stats["missing_cls"] += 1
            continue
        with open(pj, encoding="utf-8") as f:
            paper = json.load(f)
        with open(cj, encoding="utf-8") as f:
            cls = json.load(f)
        stats["papers"] += 1
        cls_by_id = {it["id"]: it for it in cls["items"]}
        # index raw questions/parts
        unit_index = {}
        for q in paper["questions"]:
            if q["parts"]:
                for i, p in enumerate(q["parts"]):
                    unit_index[p["id"]] = (q, i)
            else:
                unit_index[q["id"]] = (q, None)
        bundled = {}
        pages = imgs = None
        for it in cls["items"]:
            if not it.get("hence") or it["id"] not in unit_index:
                continue
            q, i = unit_index[it["id"]]
            if i is None or i == 0:
                continue
            # earliest same-question part it depends on (hence chain), else the previous part
            deps = [d["id"] for d in it.get("depends_on", []) if d["id"] in unit_index and unit_index[d["id"]][0] is q]
            first = i - 1
            for d in deps:
                first = min(first, unit_index[d][1])
            first = max(0, min(first, i - 1))
            # extend left through chained hence parts
            while first > 0 and cls_by_id.get(q["parts"][first]["id"], {}).get("hence"):
                first -= 1
            ids = [q["parts"][k]["id"] for k in range(first, i + 1)]
            if pages is None:
                pages, imgs = rebuild_pages(paper)
            plist = q["parts"]
            stem_end = (plist[0]["start"][0], plist[0]["start"][1] - 10)
            stem = pp.strips_for_range(tuple(q["start"]), stem_end, pages, imgs) if tuple(q["start"]) < stem_end else []
            body = pp.strips_for_range(tuple(plist[first]["start"]), tuple(plist[i]["end"]), pages, imgs)
            bundle_id = "%s-%s" % (q["id"], "-".join(plist[k]["label"] for k in range(first, i + 1)))
            shot = os.path.join(BANK, subject, "_raw", pid, "bundle_%s.jpg" % bundle_id.split("-Q", 1)[1].replace("-", "_"))
            if pp.save_strips(stem + body, shot):
                bundled[bundle_id] = {"ids": ids, "shot": shot, "last": it["id"]}
        member_of = {}
        for bid, b in bundled.items():
            for pid_ in b["ids"]:
                member_of[pid_] = bid
        for it in cls["items"]:
            u = unit_index.get(it["id"])
            if not u:
                continue
            q, i = u
            part = q["parts"][i] if i is not None else None
            shot = (part or q)["screenshot"]
            rec = {
                "id": it["id"],
                "paper_id": pid,
                "question": q["number"],
                "part": part["label"] if part else None,
                "name": it.get("name"),
                "topic": it.get("topic"),
                "also": it.get("also", []),
                "marks": it.get("marks"),
                "how_asked": it.get("how_asked"),
                "ms_expectation": it.get("ms_expectation"),
                "depends_on": it.get("depends_on", []),
                "hence": bool(it.get("hence")),
                "qp_path": paper["qp_path"],
                "ms_path": paper["ms_path"],
                "pages": q["pages"],
                "screenshot_src": shot,
                "bundled_into": member_of.get(it["id"]),
            }
            items_out.append(rec)
        for bid, b in bundled.items():
            last = cls_by_id[b["last"]]
            q = unit_index[b["last"]][0]
            names = [cls_by_id[x].get("name", x) for x in b["ids"] if x in cls_by_id]
            rec = {
                "id": bid,
                "paper_id": pid,
                "question": q["number"],
                "part": "+".join(x.rsplit("-", 1)[1] for x in b["ids"]),
                "name": " + ".join(names),
                "topic": last.get("topic"),
                "also": sorted({t for x in b["ids"] for t in ([cls_by_id[x].get("topic")] + cls_by_id[x].get("also", [])) if t and t != last.get("topic")}),
                "marks": sum((cls_by_id[x].get("marks") or 0) for x in b["ids"]) or None,
                "how_asked": last.get("how_asked"),
                "ms_expectation": last.get("ms_expectation"),
                "depends_on": [],
                "hence": True,
                "bundle_of": b["ids"],
                "qp_path": paper["qp_path"],
                "ms_path": paper["ms_path"],
                "pages": q["pages"],
                "screenshot_src": b["shot"],
                "bundled_into": None,
            }
            items_out.append(rec)
            stats["bundles"] += 1
    # to-do list = items not bundled into something else; copy screenshots into topic folders
    todo = [r for r in items_out if not r["bundled_into"]]
    for r in todo:
        tp = topic_path(r["topic"], tax)
        folder = os.path.join(out_root, *tp)
        os.makedirs(folder, exist_ok=True)
        if r["screenshot_src"] and os.path.exists(r["screenshot_src"]):
            dest = os.path.join(folder, safe(r["id"]) + ".jpg")
            shutil.copyfile(r["screenshot_src"], dest)
            r["screenshot"] = dest
        else:
            r["screenshot"] = None
            stats["no_shot"] += 1
        r["topic_path"] = list(tp)
    stats["items"] = len(items_out)
    with open(os.path.join(BANK, subject, "bank.json"), "w", encoding="utf-8") as f:
        json.dump({"subject": subject, "todo": todo, "bundled_members": [r for r in items_out if r["bundled_into"]]}, f, indent=1, ensure_ascii=False)
    print(json.dumps(stats), "todo items:", len(todo))


if __name__ == "__main__":
    main()
