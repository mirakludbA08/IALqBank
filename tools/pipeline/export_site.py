"""Export a subject's bank for the website: slim JSON plus compressed WebP screenshots.

Usage: python -E export_site.py <subject>
Reads   bank/<subject>/bank.json and the screenshots it points to
Writes  site-export/data/<subject>.json and site-export/img/<subject>/<id>.webp
"""
import json
import os
import re
import sys

from PIL import Image

BANK = r"D:\IAL-drive-papers\bank"
SPEC = r"D:\IAL-drive-papers\spec"
OUT = r"D:\IAL-drive-papers\site-export"
ROOTS = {
    "physics": r"D:\IALqBank_D\Physics",
    "chemistry": r"D:\IALqBank_D\Chem",
    "biology": r"D:\IALqBank_D\Bio\Biology",
    "maths": r"D:\IALqBank_D\Maths\Math",
}
WIDTH = 760
QUALITY = 60


def rel(path, subject):
    if not path:
        return None
    root = ROOTS[subject]
    p = path[len(root):].lstrip("\\/") if path.lower().startswith(root.lower()) else path
    return subject.title() + "/" + p.replace("\\", "/")


def safe_file(i):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", i)


def main():
    subject = sys.argv[1]
    data = json.load(open(os.path.join(BANK, subject, "bank.json"), encoding="utf-8"))
    todo = data["todo"]
    members = {r["id"]: r.get("bundled_into") for r in data["bundled_members"]}
    visible = {r["id"] for r in todo}

    def target(i):
        if i in visible:
            return i
        return members.get(i)

    img_dir = os.path.join(OUT, "img", subject)
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(os.path.join(OUT, "data"), exist_ok=True)
    items = []
    saved = skipped = 0
    for r in todo:
        pid = r["paper_id"]
        m = re.match(r"(W[A-Z]{2}\d{2})_([A-Za-z]+)(\d{4})$", pid)
        unit_code, month, year = (m.group(1), m.group(2), int(m.group(3))) if m else (pid, "", 0)
        img_name = safe_file(r["id"]) + ".webp"
        src = r.get("screenshot")
        ok = False
        if src and os.path.exists(src):
            dest = os.path.join(img_dir, img_name)
            if not os.path.exists(dest) or r.get("bundle_of"):
                im = Image.open(src).convert("RGB")
                if im.width > WIDTH:
                    h = int(im.height * WIDTH / im.width)
                    im = im.resize((WIDTH, h), Image.LANCZOS)
                im.save(dest, "WEBP", quality=QUALITY, method=6)
            ok = True
            saved += 1
        else:
            skipped += 1
        deps = []
        for d in r.get("depends_on", []):
            t = target(d.get("id"))
            if t and t != r["id"] and t not in [x["id"] for x in deps]:
                deps.append({"id": t, "name": d.get("name"), "why": d.get("why")})
        items.append({
            "id": r["id"],
            "paper": pid,
            "unit": unit_code,
            "month": month,
            "year": year,
            "q": r["question"],
            "part": r.get("part"),
            "name": r.get("name"),
            "topic": r.get("topic"),
            "also": r.get("also") or [],
            "marks": r.get("marks"),
            "how": r.get("how_asked"),
            "ms": r.get("ms_expectation"),
            "deps": deps,
            "bundle": r.get("bundle_of"),
            "hence": bool(r.get("hence")),
            "qp": rel(r.get("qp_path"), subject),
            "msf": rel(r.get("ms_path"), subject),
            "pages": r.get("pages"),
            "path": r.get("topic_path"),
            "img": ("img/%s/%s" % (subject, img_name)) if ok else None,
        })
    tax = json.load(open(os.path.join(SPEC, "%s-taxonomy.json" % subject), encoding="utf-8"))
    tax_out = []
    for e in tax:
        tax_out.append({"code": e.get("code") or "S%d" % e["num"], "unit": e["unit"], "unit_name": e["unit_name"],
                        "topic": ("Topic %d %s" % (e["topic_num"], e["topic"])) if e.get("topic_num") else e["topic"],
                        "text": e["text"]})
    out = {"subject": subject, "count": len(items), "taxonomy": tax_out, "items": items}
    with open(os.path.join(OUT, "data", subject + ".json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    size = os.path.getsize(os.path.join(OUT, "data", subject + ".json"))
    print("items:", len(items), "images saved:", saved, "no image:", skipped, "json MB: %.1f" % (size / 1e6))


if __name__ == "__main__":
    main()
