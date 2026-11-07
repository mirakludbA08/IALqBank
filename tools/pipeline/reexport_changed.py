"""Write the WebP screenshots that changed to the website's img folder.

Use with recut_all.py and build_bank.py:

    python -E reexport_changed.py snapshot <subject>   # before: remember each screenshot's hash
    python -E recut_all.py <subject>
    python -E build_bank.py <subject>
    python -E reexport_changed.py write <subject>      # after: re-encode only the changed ones

Only items that are on the site (in data/<subject>.json) are written, to img/<subject>/<id>.webp,
with the same width and quality as export_site.py.
"""
import hashlib
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor

from PIL import Image

BANK = r"D:\IAL-drive-papers\bank"
SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
SNAP = r"D:\IAL-drive-papers\bank\_snapshots"
WIDTH = 760
QUALITY = 60


def safe_file(i):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", i)


def md5(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def hashes(subject):
    with open(os.path.join(BANK, subject, "bank.json"), encoding="utf-8") as f:
        todo = json.load(f)["todo"]
    out = {}
    for r in todo:
        p = r.get("screenshot")
        if p and os.path.exists(p):
            out[r["id"]] = md5(p)
    return out, {r["id"]: r.get("screenshot") for r in todo}


def encode(job):
    src, dest = job
    im = Image.open(src).convert("RGB")
    if im.width > WIDTH:
        im = im.resize((WIDTH, int(im.height * WIDTH / im.width)), Image.LANCZOS)
    im.save(dest, "WEBP", quality=QUALITY, method=6)
    return dest


def main():
    mode, subject = sys.argv[1], sys.argv[2]
    os.makedirs(SNAP, exist_ok=True)
    snap = os.path.join(SNAP, subject + ".json")
    if mode == "snapshot":
        h, _ = hashes(subject)
        with open(snap, "w", encoding="utf-8") as f:
            json.dump(h, f)
        print(subject, "snapshot:", len(h), "screenshots")
        return
    before = json.load(open(snap, encoding="utf-8"))
    after, paths = hashes(subject)
    with open(os.path.join(SITE, "data", subject + ".json"), encoding="utf-8") as f:
        items = json.load(f)["items"]
    jobs = []
    changed_all = 0
    for x in items:
        i = x["id"]
        if before.get(i) == after.get(i):
            continue
        changed_all += 1
        if not x.get("img") or i not in paths:
            continue
        jobs.append((paths[i], os.path.join(SITE, x["img"])))
    with ProcessPoolExecutor(max_workers=int(os.environ.get("WORKERS", "2"))) as ex:
        for n, _ in enumerate(ex.map(encode, jobs, chunksize=8), 1):
            if n % 200 == 0:
                print("  encoded", n, "of", len(jobs), flush=True)
    with open(os.path.join(SNAP, subject + "-changed.json"), "w", encoding="utf-8") as f:
        json.dump([x for (_, x) in jobs], f)
    print(subject, "site items:", len(items), "| changed:", changed_all, "| webp written:", len(jobs))


if __name__ == "__main__":
    main()
