"""Cut the real mark scheme for every question on the site out of the Pearson mark scheme PDFs.

For each paper in data/<subject>.json this opens the paper's mark scheme PDF, finds each question's
rows (ms_index.py), renders each question as one tall "sheet" (ms_crop.py), packs the paper's sheets one
under another into a few WebP files, img/ms/<subject>/<paper>-<k>.webp (the site has a file limit, so
not one file per question), and writes data/ms-<subject>.json: for every item, where its part sits.

    data/ms-<subject>.json  {"<item id>": [top, height, width, header_top, header_height, whole, k]}

`top` and `header_top` are pixels down file <paper>-<k>.webp.

`whole` is 1 when the item shows the whole question's mark scheme (a question with no parts, a
part the index could not find, and every Maths question, because Maths schemes keep the notes for
all the parts after the table), 0 when it shows just the item's part. Items with no entry have no
real mark scheme on the site: the bank shows a mark scheme written for the site in the same table
format instead.

The PDFs come from the release staging folders (tools/papers/build-manifest.mjs sorts out which
file in each session folder is the mark scheme).

Usage: python -E build_ms_crops.py <subject> [paper_id ... | --new]
"""
import json
import os
import re
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ms_crop as mc  # noqa: E402

SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
RELEASE = r"D:\IALqBank_D\_release"
RAW = r"D:\IAL-drive-papers\bank"
OUT_WIDTH = 900
MAXH = 12000          # tallest packed picture (WebP stops at 16383)
TOO_TALL = 9000       # a single question taller than this is not a real crop
QUALITY = 50
OLD_SPEC = re.compile(r"^(WPH0\d|WCH0\d|WBI0\d|WMA0[12]|WDM01)")


def ms_pdf(subject, paper):
    name = paper.replace("_May", "_Jun").replace("May2024", "Jun2024") + "_MS.pdf"
    return os.path.join(RELEASE, subject, name)


def item_parts(item):
    m = re.match(r"^.*-Q\d+(?:-(.+))?$", item["id"])
    return [p for p in (m.group(1).split("-") if m and m.group(1) else []) if p]


def is_mark_scheme(ms, paper):
    """The PDF is a mark scheme for this paper: its first pages say so."""
    doc = ms["doc"]
    txt = " ".join(doc[i].get_text("text") for i in range(min(3, len(doc)))).lower()
    unit = paper.split("_")[0].lower()
    if "mark scheme" not in txt and "markscheme" not in txt and "marking guidance" not in txt:
        return False
    if "examiners' report" in txt or "examiner's report" in txt or "examiners\u2019 report" in txt:
        return False
    return True


def save_packed(out_dir, paper, packed, result):
    """Stack the paper's question sheets one under another into pictures of at most MAXH pixels
    (a question is never split) and give each item its place in them."""
    chunks, cur, h = [], [], 0
    for p in packed:
        if cur and h + p[1].height > MAXH:
            chunks.append(cur)
            cur, h = [], 0
        cur.append(p)
        h += p[1].height
    if cur:
        chunks.append(cur)
    # the earlier one-file-per-question pictures of this paper are not used any more
    for f in os.listdir(out_dir):
        if f.startswith(paper + "-Q") and f.endswith(".webp"):
            os.remove(os.path.join(out_dir, f))
    for k, chunk in enumerate(chunks, 1):
        canvas = Image.new("RGB", (OUT_WIDTH, sum(p[1].height for p in chunk)), "white")
        y = 0
        for q, small, entries in chunk:
            canvas.paste(small, (0, y))
            for iid, e in entries:
                result[iid] = [e[0] + y, e[1], e[2], (e[3] + y) if e[4] else 0, e[4], e[5], k]
            y += small.height
        canvas.save(os.path.join(out_dir, "%s-%d.webp" % (paper, k)), "WEBP", quality=QUALITY, method=6)
    # a paper that now needs fewer pictures than before
    n = len(chunks)
    for f in os.listdir(out_dir):
        m = re.fullmatch(re.escape(paper) + r"-(\d+)\.webp", f)
        if m and int(m.group(1)) > n:
            os.remove(os.path.join(out_dir, f))


def main():
    subject = sys.argv[1]
    only = set(a for a in sys.argv[2:] if a != "--new")
    new_only = "--new" in sys.argv[2:]     # just the 2025 and 2026 papers
    with open(os.path.join(SITE, "data", subject + ".json"), encoding="utf-8") as f:
        items = json.load(f)["items"]
    by_paper = {}
    for x in items:
        if OLD_SPEC.match(x["paper"]):
            continue
        if only and x["paper"] not in only:
            continue
        if new_only and not re.search(r"_(Jan|Feb|May|Jun|Oct|Nov)202[56]$", x["paper"]):
            continue
        by_paper.setdefault(x["paper"], []).append(x)
    out_dir = os.path.join(SITE, "img", "ms", subject)
    os.makedirs(out_dir, exist_ok=True)
    result_path = os.path.join(SITE, "data", "ms-%s.json" % subject)
    result = {}
    if (only or new_only) and os.path.exists(result_path):
        with open(result_path, encoding="utf-8") as f:
            result = json.load(f)
    report = {"no_file": [], "not_ms": [], "scanned": [], "q_missing": [], "part_missing": [], "marks_differ": [], "marks_checked": 0, "error": [], "sheets": 0, "items": 0}
    t0 = time.time()
    strict = subject == "maths"
    for n, (paper, its) in enumerate(sorted(by_paper.items()), 1):
        path = ms_pdf(subject, paper)
        if not os.path.exists(path):
            report["no_file"].append(paper)
            continue
        try:
            ms = mc.open_ms(path, strict=strict)
            if ms.get("scanned"):
                report["scanned"].append(paper)
                continue
            if not is_mark_scheme(ms, paper):
                report["not_ms"].append(paper)
                continue
            packed = []
            for q in sorted({x["q"] for x in its}):
                qitems = [x for x in its if x["q"] == q]
                sh = mc.make_sheet(ms, q)
                if not sh:
                    report["q_missing"] += [x["id"] for x in qitems]
                    continue
                im = sh["image"]
                # cut the blank foot off the sheet
                bottom = im.height
                bw = im.convert("L").point(lambda v: 255 if v < 235 else 0)
                bb = bw.getbbox()
                if bb:
                    bottom = min(im.height, bb[3] + 8)
                im = im.crop((0, 0, im.width, bottom))
                total = bottom
                scale = OUT_WIDTH / im.width
                small = im.resize((OUT_WIDTH, max(1, int(round(im.height * scale)))), Image.LANCZOS)
                if small.height > TOO_TALL:
                    # the question's end was not found, so its rows ran on through the file:
                    # not a real crop, use the written mark scheme instead
                    report["q_missing"] += [x["id"] for x in qitems]
                    continue
                report["sheets"] += 1
                entries = []
                hdr = sh["header"] or (0, 0)

                def s(v):
                    return int(round(v * scale))

                for x in qitems:
                    parts = item_parts(x)
                    whole = 1
                    top, bot = 0, total
                    if parts and not strict and all(p in sh["parts"] for p in parts):
                        top = min(sh["parts"][p][0] for p in parts)
                        bot = max(sh["parts"][p][1] for p in parts)
                        whole = 0
                        pm = [sh["part_marks"].get(p) for p in parts]
                        if x.get("marks") is not None and all(v is not None for v in pm):
                            report["marks_checked"] += 1
                            if sum(pm) != x["marks"]:
                                report["marks_differ"].append((x["id"], x["marks"], sum(pm)))
                    elif parts and not strict:
                        report["part_missing"].append(x["id"])
                    bot = min(bot, total)
                    if bot - top < 12:
                        top, bot, whole = 0, total, 1
                    hy, hh = (0, 0) if (whole or top <= hdr[1]) else (s(hdr[0]), s(hdr[1]) - s(hdr[0]))
                    entries.append((x["id"], [s(top), s(bot) - s(top), small.width, hy, hh, whole]))
                    report["items"] += 1
                packed.append((q, small, entries))
            save_packed(out_dir, paper, packed, result)
        except Exception as e:  # keep going: the bank falls back to the written mark scheme
            report["error"].append((paper, repr(e)[:120]))
        if n % 10 == 0:
            print("  %d/%d papers, %d sheets, %.0fs" % (n, len(by_paper), report["sheets"], time.time() - t0), flush=True)
    on_site = {x["id"] for x in items}
    result = {k: v for k, v in result.items() if k in on_site}      # drop items taken off the site
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(result, f, separators=(",", ":"))
    rep_path = os.path.join(RAW, "_snapshots", "ms-report-%s.json" % subject)
    os.makedirs(os.path.dirname(rep_path), exist_ok=True)
    with open(rep_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=0, ensure_ascii=False)
    print(subject, {k: (len(v) if isinstance(v, list) else v) for k, v in report.items()}, "| items with a real mark scheme:", len(result))


if __name__ == "__main__":
    main()
