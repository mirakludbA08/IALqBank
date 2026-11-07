"""Checks data/mock-<subject>.json for what the mock paper would print wrongly: a stem shown twice
(a later part of a question that still starts with the top of the question), and a page's barcode
left in the middle of a question.

Run it after build_mock_data.py. With --drop it takes the questions it finds out of the data file,
and any paper shape that can no longer be filled.

Usage: python -E check_mock_stems.py [--drop] [subject ...]
"""
import json
import os
import sys

import numpy as np
from PIL import Image

SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
SUBJECTS = ["physics", "chemistry", "biology", "maths"]
ROWS = 26       # enough for a line of text, the question's number line
CELLS = 192


def signature(path, y, cache):
    """The ROWS rows of a picture from y down, across the writing area, as a small grid."""
    if path not in cache:
        im = Image.open(path).convert("L")
        w, h = im.size
        box = (int(w * 0.1), 0, int(w * 0.86), h)
        cache[path] = np.frombuffer(im.crop(box).resize((CELLS, h), Image.BOX).tobytes(), dtype=np.uint8).reshape(h, CELLS).astype(int)
    grid = cache[path]
    y = int(y)
    return grid[y:y + ROWS] if y + ROWS <= len(grid) else None


def repeats(q, folder, cache):
    first = signature(os.path.join(folder, q["g"][0][0]), q["g"][0][1][0][0], cache)
    if first is None or (first < 180).mean() < 0.01:
        return False
    for name, rows in q["g"][1:]:
        if not rows:
            continue
        path = os.path.join(folder, name)
        for shift in range(-4, 9):
            other = signature(path, max(0, rows[0][0] + shift), cache)
            if other is not None and other.shape == first.shape and (np.abs(first - other) > 70).mean() < 0.012:
                return True
    return False


def has_barcode(q, folder):
    """A page's barcode left in the middle of a question: a short band of identical rows, each
    crossing from black to white many times, over a third of the page's width. Graph paper is
    alike too, but taller and wider, and its grid lines keep breaking the band."""
    for name, rows in q["g"]:
        im = np.asarray(Image.open(os.path.join(folder, name)).convert("L"))
        h, w = im.shape
        band = im[:, int(w * 0.2):int(w * 0.8)] < 128
        cross = band[:, 1:] != band[:, :-1]
        for a, b in rows:
            run = 0
            for y in range(max(1, int(a)), min(h, int(b))):
                xs = np.flatnonzero(cross[y])
                busy = len(xs) >= 36 and xs[-1] - xs[0] < 0.75 * band.shape[1] and (band[y] == band[y - 1]).mean() > 0.9
                if busy:
                    run += 1
                    continue
                if 14 <= run <= 48:
                    return True
                run = 0
    return False


def main():
    args = [a for a in sys.argv[1:] if a != "--drop"]
    drop = "--drop" in sys.argv
    for subject in args or SUBJECTS:
        path = os.path.join(SITE, "data", "mock-%s.json" % subject)
        data = json.load(open(path, encoding="utf-8"))
        folder = os.path.join(SITE, "img", subject)
        found = 0
        multi = 0
        codes = 0
        for u in data["units"]:
            bad = []
            for q in u["qs"]:
                if has_barcode(q, folder):
                    bad.append(q)
                    codes += 1
                    continue
                if len(q["g"]) < 2:
                    continue
                multi += 1
                cache = {}
                if repeats(q, folder, cache):
                    bad.append(q)
            found += len(bad)
            for q in bad[:4]:
                print("   ", q["i"], [(g[0].split("-Q")[-1], g[1][0]) for g in q["g"]])
            if drop and bad:
                ids = {q["i"] for q in bad}
                u["qs"] = [q for q in u["qs"] if q["i"] not in ids]
                supply = {}
                for q in u["qs"]:
                    supply[(q["k"], q["m"])] = supply.get((q["k"], q["m"]), 0) + 1

                def fillable(f):
                    need = {}
                    for s in f["slots"]:
                        need[(s["k"], s["m"])] = need.get((s["k"], s["m"]), 0) + 1
                    return all(n <= supply.get(key, 0) for key, n in need.items())

                u["frames"] = [f for f in u["frames"] if fillable(f)]
        print(subject, "%d with a page barcode left in, %d of %d multi-part questions repeat their stem" % (codes, found - codes, multi))
        if drop and found:
            with open(path, "w", encoding="utf-8", newline="\n") as f:
                json.dump(data, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
