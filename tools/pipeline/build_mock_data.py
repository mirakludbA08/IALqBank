"""Build data/mock-<subject>.json, what the mock paper maker on the past papers page works from.

For every Unit it holds:
  - the paper's size (marks, time) read from the covers of the real papers;
  - the topic shares from the study report (reports/<Subject> - Exam Study Report.md), which the
    maker has to follow;
  - frames: the real papers whose shape can be used, each as its list of question slots (section,
    marks, parts, the paper's own heading at that place), so a mock has the shape of a paper that
    was really set;
  - every whole question that can go in a mock. The bank keeps a question's parts as separate
    screenshots, each repeating the stem, so each question says which rows of which screenshots
    make the question once through, and where its number and "Total for Question" line are, so
    the maker can renumber it. No new pictures are made: Cloudflare Pages allows 20,000 files.

A question only goes in if all of it is in the bank, every part has its real Pearson mark scheme,
and it does not lean on another question.

Usage: python -E build_mock_data.py <subject> [...]   (no subject: all four)
MOCK_ONLY=WPH11 limits a run to one Unit's papers, to try a change quickly.
Needs the question paper PDFs and the pipeline's paper.json files (D:\\IAL-drive-papers\\bank).
"""
import collections
import io
import json
import os
import re
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import process_papers as pp  # noqa: E402

SITE = os.environ.get("IALQ_SITE", r"D:\IALqBank")
SUBJECTS = {"physics": "Physics", "chemistry": "Chemistry", "biology": "Biology", "maths": "Maths"}
TOTAL_LINE = re.compile(r"Total for Question (\d+)\s*(?:=|is)\s*(\d+)\s*marks?", re.I)
TOTAL_ANY = re.compile(r"Total\s+\d+\s+marks?", re.I)
COVER_TIME = re.compile(r"Time:?\s*(\d+)\s*hours?(?:\s*(\d+)\s*minutes?)?|Time:?\s*(\d+)\s*minutes?", re.I)
COVER_MARKS = re.compile(r"total marks? for this paper is\s*(\d+)", re.I)
SECTION = re.compile(r"^SECTION\s+([A-C])\b")
# Lines over a question that are not its heading.
NOT_HEADING = re.compile(r"^TOTAL FOR|^END OF|^BLANK PAGE|Question \d+ continued|^\*\w+\*$", re.I)
FULL = {"Analytical Tec": "Analytical Techniques"}   # as in tools/reports/build-reports.py
# What can stand over a question's number; anything else means the number was misread.
HEADING = re.compile(r"SECTION|answer|question|cross|\bbox\b|your mind|minutes|spaces|^.{0,12}$", re.I)
WATERMARK = "studentroom"     # a website's name printed across some copies of the papers


class Skip(Exception):
    """This question cannot go in a mock; the message says why (totalled at the end of a run)."""


def page_text(pdf, furniture=True):
    """Every page's lines and words, with the size and weight of the type, and what else is drawn
    on it (which content_span needs, and Maths does not)."""
    import pymupdf
    pages = []
    with pymupdf.open(pdf) as doc:
        for pg in doc:
            try:
                pg.set_cropbox(pg.mediabox)    # paper.json's positions count from the whole sheet, as pdftotext does
            except ValueError:
                pass                           # an odd page box; the checks on each question catch a bad fit
            lines, spans = [], []
            for b in pg.get_text("dict")["blocks"]:
                if b.get("type") != 0:
                    continue
                for ln in b["lines"]:
                    words = "".join(sp["text"] for sp in ln["spans"]).split()
                    if not words:
                        continue
                    x0, y0, x1, y1 = ln["bbox"]
                    lines.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1, "words": words, "text": " ".join(words)})
                    spans.extend(ln["spans"])
            lines.sort(key=lambda l: (round(l["y0"] / 3), l["x0"]))
            boxes = [tuple(d["rect"]) for d in pg.get_drawings()] + [tuple(i["bbox"]) for i in pg.get_image_info()] if furniture else []
            marked = WATERMARK in "".join(ln["text"] for ln in lines).replace(" ", "").lower()
            pages.append({"w": pg.rect.width, "h": pg.rect.height, "lines": lines, "spans": spans, "words": pg.get_text("words"), "boxes": boxes, "marked": marked})
    return pages


def type_at(page, bbox):
    """Size of the text in a box on the page, whether it is bold, and whether it is a sans serif."""
    x, y = (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    for sp in page["spans"]:
        b = sp["bbox"]
        if b[0] - 1 <= x <= b[2] + 1 and b[1] - 1 <= y <= b[3] + 1:
            font = sp["font"].lower()
            return sp["size"], bool(sp["flags"] & 16) or "bold" in font, any(n in font for n in ("arial", "helvetica", "verdana", "sans"))
    return 11.0, True, False


def spans_for_range(a, b, pages, squeezed):
    """The page strips pp.strips_for_range cuts from position a to b, as (page, top, bottom), in
    points, before its filter leaves out the strips with nothing on them."""
    out = []
    for pi in range(a[0], b[0] + 1):
        if pi >= len(pages):
            break
        ph = pages[pi]["h"]
        top, bottom = 30, ph - 38
        lines = pages[pi]["lines"]
        if pi == a[0]:
            top = max(0, a[1] - 6)
        else:
            for ln in lines:
                if ln["y0"] < 140 and re.match(r"^Question \d+ continued", ln["text"].strip(), re.I):
                    top = max(top, ln["y1"] + 4)
        if pi == b[0]:
            bottom = min(ph, b[1] + 8)
        if squeezed and lines:
            foot = [ln["y0"] for ln in lines if ln["y0"] > ph - 90 and pp.NOISE.search(ln["text"].strip())]
            if foot and pi != b[0]:
                bottom = min(bottom, min(foot) - 6)
        if bottom <= top:
            continue
        out.append((pi, top, bottom))
    return out


def src_height(strips):
    scale = pp.DPI / 72.0
    return sum(int(s[2] * scale) - int(s[1] * scale) for s in strips)


def match_strips(strips, width_src, width_site, height_site):
    """The strips really in a screenshot: its height says which ones the filter left out."""
    n = len(strips)
    if n > 10:
        return None
    best = None
    for mask in range((1 << n) - 1):
        kept = [s for i, s in enumerate(strips) if not mask >> i & 1]
        miss = abs(int(src_height(kept) * width_site / width_src) - height_site)
        rank = (miss, bin(mask).count("1"))       # the closest fit; the fewest left out if two tie
        if miss <= 2 + n and (best is None or rank < best[0]):
            best = (rank, kept)
    return best[1] if best else None


def ink_band(im, x0, x1, y0, y1, lowest=False):
    """The rows of a line of writing in a part of a picture, from the picture itself: the tallest
    run of rows with ink on them, or the lowest one tall enough to be writing, leaving out ruled
    lines. Returns (top, bottom) or None."""
    w, h = im.size
    x0, x1 = max(0, int(x0)), min(w, int(x1) + 1)
    y0, y1 = max(0, int(y0)), min(h, int(y1) + 1)
    if x1 - x0 < 2 or y1 - y0 < 2:
        return None
    ink = np.asarray(im.convert("L").crop((x0, y0, x1, y1))) < 130
    share = ink.mean(axis=1)
    text = (share > 0.02) & (share < 0.8)
    best = None
    y = 0
    while y < len(text):
        if not text[y]:
            y += 1
            continue
        end = y
        while end + 1 < len(text) and (text[end + 1] or (end + 2 < len(text) and text[end + 2])):
            end += 1
        if lowest:
            if end - y >= 7:
                best = (y, end)
        elif best is None or end - y >= best[1] - best[0]:      # the lower of two equal runs
            best = (y, end)
        y = end + 1
    return (y0 + best[0], y0 + best[1] + 1) if best else None


def snap_boxes(first, last, top, n_box, t_box):
    """Sets the number's and the Total line's rows from where they are in the pictures. The PDF's
    positions can be a few rows out, and a patch in the wrong place leaves the old line showing."""
    if n_box:
        band = ink_band(first, n_box[0] - 1, n_box[2] + 1, top + n_box[1] - 10, top + n_box[1] + n_box[3] + 10)
        if band and 6 <= band[1] - band[0] <= 34:
            n_box[1], n_box[3] = round(band[0] - top, 1), band[1] - band[0]
    if t_box:
        # The Total line is the last thing in a question.
        H = last.height
        band = ink_band(last, t_box[0], t_box[2], H - 70, H, lowest=True)
        if band and 6 <= band[1] - band[0] <= 34:
            t_box[1], t_box[3] = H - band[0], band[1] - band[0]


def foot_top(page):
    """Where a page's footer (page number, barcode, "Turn over") starts, in points. The barcode's
    bars stand well above its line of text."""
    ph = page["h"]
    foot = [ln["y0"] for ln in page["lines"] if ln["y0"] > ph - 90 and (pp.NOISE.search(ln["text"].strip()) or re.search(r"^\*\w+\*$", ln["text"].strip()))]
    return min(foot) - 14 if foot else None


def content_span(page):
    """Where what is printed on a page starts and stops, in points, leaving out the page's own
    furniture: the frame round the answer area, the corner marks, the "DO NOT WRITE" strips, the
    footer. Where a question runs over a page these would otherwise show up in its middle."""
    if "span" not in page:
        w, h = page["w"], page["h"]
        foot = foot_top(page) or h - 62
        near = [(ln["y0"], ln["y1"]) for ln in page["lines"]
                if 30 <= ln["y0"] < foot and ln["x0"] < w - 65 and ln["x1"] > 60 and not pp.NOISE.search(ln["text"].strip())]
        near += [(b[1], b[3]) for b in page["boxes"]
                 if b[3] - b[1] < 0.5 * h and b[1] >= 46 and b[3] <= foot and b[0] < w - 65 and b[2] > 60]
        page["span"] = (min(n[0] for n in near), max(n[1] for n in near)) if near else None
    return page["span"]


def stem_rows(first, other):
    """Where the stem ends in the second of two screenshots of one question: the row of it where
    the two stop showing the same thing. The pictures can start a few rows apart, so they are lined
    up first; each was resized on its own, so a line can still sit a row or two out; and a single
    row that differs means nothing, so the stem ends where most of the next rows differ."""
    a, b = first.convert("L"), other.convert("L")
    w = min(a.width, b.width)
    h = min(a.height, b.height)
    box = (int(w * 0.1), 0, int(w * 0.86), h)
    cells = 192          # fine enough to tell one word from another, not just one line of text from a gap
    size = (cells, h)
    pa = np.frombuffer(a.crop(box).resize(size, Image.BOX).tobytes(), dtype=np.uint8).reshape(h, cells).astype(int)
    pb = np.frombuffer(b.crop(box).resize(size, Image.BOX).tobytes(), dtype=np.uint8).reshape(h, cells).astype(int)

    def mismatch(s):
        n = min(h - abs(s), 240)
        return np.abs(pa[max(0, s):max(0, s) + n] - pb[max(0, -s):max(0, -s) + n]).mean() if n > 20 else 255

    lag = min(range(-30, 31), key=mismatch)    # row y of the first is row y - lag of the second
    off = np.min([(np.abs(pa - np.roll(pb, lag + shift, axis=0)) > 70).sum(axis=1) for shift in range(-2, 3)], axis=0)
    differs = off >= 3
    for y in range(max(0, lag + 3), max(0, h - 8)):
        if differs[y:y + 8].sum() >= 4:
            return max(0, y - lag)
    return max(0, h - lag)


def dark(im, box):
    """Dark pixels in a box of a picture."""
    w, h = im.size
    box = (max(0, int(box[0])), max(0, int(box[1])), min(w, int(box[2]) + 1), min(h, int(box[3]) + 1))
    if box[2] <= box[0] or box[3] <= box[1]:
        return 0
    return sum(1 for v in im.convert("L").crop(box).tobytes() if v < 120)


def part_labels(part):
    return part.split("+") if part else []


def cover_parts(items, labels):
    """Items that cover the question's parts once each, in order. Bundles overlap the items next
    to them (a "hence" part shown with the part before it), so this picks the fewest that fit."""
    got = []

    def step(i):
        if i == len(labels):
            return True
        for it in sorted(items, key=lambda x: -len(part_labels(x["part"]))):
            ls = part_labels(it["part"])
            if ls and ls == labels[i:i + len(ls)]:
                got.append(it)
                if step(i + len(ls)):
                    return True
                got.pop()
        return False

    return got if step(0) else None


def find_number(q, pages, column=None):
    """Where the question's number is printed: at the start of a line near the left margin. The
    recorded start of a question is often the footer of the page before, so look on from there.
    column: where the paper's numbers stand, so a digit in a table is not taken for one."""
    start, end = q["start"], q["end"]
    for pi in range(start[0], min(end[0], len(pages) - 1) + 1):
        page = pages[pi]
        for w in sorted(page["words"], key=lambda w: (w[1], w[0])):
            if (pi == start[0] and w[1] < start[1] - 3) or (pi == end[0] and w[1] > end[1]):
                continue
            if w[0] < 135 and (column is None or abs(w[0] - column) < 8) and re.fullmatch(r"%d\.?" % q["number"], w[4]):
                if any(abs(ln["x0"] - w[0]) < 2 and abs(ln["y0"] - w[1]) < 5 for ln in page["lines"]):
                    return pi, w
    return None


def number_again(q, found, pages):
    """Whether the number is printed a second time in the question. Some recent papers put it on
    each part ("14 (a)", "14 (b)"), where a mock's new number would not reach."""
    pi0, first = found
    end = q["end"]
    for pi in range(pi0, min(end[0], len(pages) - 1) + 1):
        for w in pages[pi]["words"]:
            if (pi == pi0 and w[1] <= first[1] + 3) or (pi == end[0] and w[1] > end[1]):
                continue
            if abs(w[0] - first[0]) < 3 and re.fullmatch(r"%d\.?" % q["number"], w[4]):
                return True
    return False


def heading_lines(q, found, pages):
    """The lines over the question's number: a section heading, "Answer ALL questions"."""
    pi, word = found
    start = q["start"]
    out = []
    for ln in pages[pi]["lines"]:
        t = ln["text"].strip()
        if ln["y0"] >= word[1] - 2 or ln["y0"] < 30 or (pi == start[0] and ln["y0"] < start[1] - 1):
            continue
        if t and not pp.NOISE.search(t) and not NOT_HEADING.search(t):
            out.append(ln)
    return out


def question_geometry(q, parts_items, pages, subject, found):
    """Which rows of which screenshots make this question, its heading, and where its number and
    Total line are. All in pixels of the site's screenshots (760 wide): the number from the top of
    the finished question, the Total line from the bottom."""
    squeezed = subject == "maths"
    start, end = tuple(q["start"]), tuple(q["end"])
    npi, word = found
    npage = pages[npi]
    ny = word[1]
    heads = heading_lines(q, found, pages)
    if any(not HEADING.search(ln["text"].strip()) for ln in heads):
        raise Skip("text above the number")

    total = None
    lpage = pages[min(end[0], len(pages) - 1)]
    for ln in lpage["lines"]:
        if abs(ln["y1"] - end[1]) < 12 and (TOTAL_LINE.search(ln["text"]) or TOTAL_ANY.search(ln["text"])):
            if total is None or abs(ln["y1"] - end[1]) < abs(total["y1"] - end[1]):
                total = ln
    if total is None:
        raise Skip("total line not found")

    plist = q["parts"]
    has_stem = False
    stem_end = None
    if plist:
        stem_end = (plist[0]["start"][0], plist[0]["start"][1] - 10)
        has_stem = not (stem_end[0] == start[0] and stem_end[1] - start[1] < 2)
    by_label = {p["label"]: p for p in plist}
    scale = pp.DPI / 72.0
    files = []
    first_im = last_im = None
    heading = None
    k = None
    lead = 0
    contains = lambda s: s[0] == npi and s[1] - 1 <= ny < s[2]
    for idx, it in enumerate(parts_items):
        path = os.path.join(SITE, it["img"].replace("/", os.sep))
        if not os.path.exists(path):
            raise Skip("no screenshot")
        im = Image.open(path)
        W, H = im.size
        k = W / npage["w"]
        width_src = int(npage["w"] * scale + 0.5)
        ls = part_labels(it["part"])
        stem = spans_for_range(start, stem_end, pages, squeezed) if has_stem and ls else []
        if ls:
            body = spans_for_range(tuple(by_label[ls[0]]["start"]), tuple(by_label[ls[-1]]["end"]), pages, squeezed)
        else:
            body = spans_for_range(start, end, pages, squeezed)
        rows = None
        kept = None if squeezed else match_strips(stem + body, width_src, W, H)
        if kept and any(s in body for s in kept) and (idx > 0 or any(contains(s) for s in kept)):
            # Lay the strips out as they are in the picture; keep what the question needs.
            f = H / max(1, src_height(kept))
            rows = []
            y = 0.0
            body_set = set(body)
            begun = idx > 0
            for j, s in enumerate(kept):
                hpx = (int(s[2] * scale) - int(s[1] * scale)) * f
                here = idx == 0 and contains(s)
                begun = begun or here
                if begun and (idx == 0 or s in body_set):
                    cut = foot_top(pages[s[0]])
                    bot = s[2] if cut is None or cut >= s[2] or cut <= s[1] else cut
                    span = content_span(pages[s[0]])
                    if span and j < len(kept) - 1:             # runs over the page: stop at the last thing on this one
                        bot = max(s[1] + 1, min(bot, span[1] + 6))
                    if idx == len(parts_items) - 1 and j == len(kept) - 1:
                        bot = s[2]                             # the question ends at its Total line: nothing to trim
                    top = y + (ny - 2 - s[1]) * scale * f if here else y
                    if here:
                        lead = (ny - 2 - s[1]) * k
                    if span and not here and s[1] <= 31 and span[0] - 6 > s[1]:   # carries on at the top of a page
                        top = y + (span[0] - 6 - s[1]) * scale * f
                    if here and heads:
                        over = min(ln["y0"] for ln in heads) - 3
                        heading = [os.path.basename(it["img"]), round(y + max(0, over - s[1]) * scale * f, 1), round(top, 1)]
                    rows.append([top, y + (bot - s[1]) * scale * f])
                y += hpx
        if rows is None:
            # Maths screenshots have their answer space squeezed out, so the page positions do not
            # carry over past the first lines: compare the pictures instead. A strip before the
            # number has only the page's footer on it, which the page filter left out.
            if idx == 0:
                s = next((s for s in stem + body if contains(s)), None)
                if s is None:
                    raise Skip("number outside the strips")
                top = lead = (ny - 2 - s[1]) * k
                if heads:
                    over = min(ln["y0"] for ln in heads) - 3
                    heading = [os.path.basename(it["img"]), round(max(0, over - s[1]) * k, 1), round(top, 1)]
                rows = [[top, H]]
            else:
                cut = 0
                if has_stem:
                    # Identical rows are good evidence; stopping well short of where the PDF puts
                    # the end of the stem is not.
                    cut = stem_rows(first_im, im)
                    guess = sum(s[2] - s[1] for s in stem if s[0] >= npi) * k
                    cut = cut if cut >= guess - 14 else guess
                rows = [[max(0, cut - 3), H]]
        elif idx > 0:
            rows[0][0] += 4 * k    # the picture before it already shows the gap between parts
        if idx == 0:
            first_im = im.copy()
        if idx == len(parts_items) - 1:
            last_im = im.copy()
        files.append({"id": it["id"], "img": it["img"], "rows": rows, "H": H})
    if not files or not files[0]["rows"]:
        raise Skip("no rows")

    size, bold, sans = type_at(npage, word[:4])
    top = files[0]["rows"][0][0]
    # With no heading, the number is the first thing in its strip. (An earlier strip in the picture
    # is only the end of the page before.)
    if lead > 160 and not heads:
        raise Skip("something above the number")
    n_box = [round(word[0] * k, 1), round(2 * k, 1), round(word[2] * k, 1), round((word[3] - word[1]) * k, 1), round(size * k, 1),
             (1 if bold else 0) + (2 if sans else 0), "." if word[4].endswith(".") else ""]
    tsize, tbold, tsans = type_at(lpage, (total["x0"], total["y0"], total["x1"], total["y1"]))
    text = total["text"].strip()
    m = TOTAL_LINE.search(text)
    t_box = None
    below = end[1] + 8 - total["y0"]          # the screenshot stops about 8 points under this line
    if m:
        t_box = [round(total["x0"] * k, 1), round(below * k, 1), round(total["x1"] * k, 1), round((total["y1"] - total["y0"]) * k, 1), round(tsize * k, 1),
                 (1 if tbold else 0) + (2 if tsans else 0), text[:m.start(1)] + "{n}" + text[m.end(1):]]
    snap_boxes(first_im, last_im, top, n_box, t_box)
    if n_box[1] < 2:              # the number stands higher than the PDF said: start the question above it
        rise = 2 - n_box[1]
        files[0]["rows"][0][0] = max(0, top - rise)
        top = files[0]["rows"][0][0]
        n_box[1] = 2
    if dark(first_im, (n_box[0] - 1, top + n_box[1], n_box[2] + 1, top + n_box[1] + n_box[3])) < 4:
        raise Skip("no number at its place")
    if t_box and dark(last_im, (t_box[0], last_im.height - t_box[1], t_box[2], last_im.height - t_box[1] + t_box[3])) < 20:
        raise Skip("no total line at its place")
    # Older Maths papers put a boxed "Q5" beside the total.
    q_box = None
    for ln in lpage["lines"]:
        if abs(ln["y1"] - total["y1"]) < 14 and re.fullmatch(r"Q\s*%d" % q["number"], ln["text"].strip()):
            q_box = [round(ln["x0"] * k, 1), round((end[1] + 8 - ln["y0"]) * k, 1), round(ln["x1"] * k, 1), round((ln["y1"] - ln["y0"]) * k, 1),
                     round(type_at(lpage, (ln["x0"], ln["y0"], ln["x1"], ln["y1"]))[0] * k, 1)]
    return files, n_box, t_box, q_box, heading


def read_report(subject):
    """The study report's tables: {unit title: {"topics": [(name, share)], "points": [(code, share, years)]}}."""
    path = os.path.join(SITE, "reports", SUBJECTS[subject] + " - Exam Study Report.md")
    units, unit, table = {}, None, None
    with io.open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("### "):
                unit = line[4:].strip()
                units[unit] = {"topics": [], "points": []}
                table = None
            elif line.startswith("| Topic |"):
                table = "topics"
            elif line.startswith("| Spec point |"):
                table = "points"
            elif unit and line.startswith("|") and not line.startswith("|---"):
                cells = [c.strip() for c in line.strip("|").split("|")]
                share = float(cells[1].rstrip("%").replace("<", ""))
                if table == "topics":
                    units[unit]["topics"].append((cells[0], share))
                elif table == "points":
                    units[unit]["points"].append((cells[0].split(" ")[0], share, int(cells[2])))
    return units


def report_title(path0):
    t = path0
    for a, b in FULL.items():
        if t.endswith(a):
            t = t[:-len(a)] + b
    return t


def build(subject):
    with open(os.path.join(SITE, "data", subject + ".json"), encoding="utf-8") as f:
        bank = json.load(f)
    with open(os.path.join(SITE, "data", "ms-%s.json" % subject), encoding="utf-8") as f:
        ms = json.load(f)
    with open(os.path.join(SITE, "data", "papers-%s.json" % subject), encoding="utf-8") as f:
        listing = json.load(f)
    with open(os.path.join(SITE, "tools", "reports", "names.json"), encoding="utf-8") as f:
        extra = json.load(f)
    group_of = {}
    for name, codes in extra["groups"].get(subject, []):
        for c in codes:
            group_of[c] = name
    report = read_report(subject)
    items = [i for i in bank["items"] if i.get("path")]
    by_q = collections.defaultdict(list)
    for it in items:
        by_q[(it["paper"], it["q"])].append(it)
    papers = sorted({i["paper"] for i in items})
    only = os.environ.get("MOCK_ONLY")
    if only:
        papers = [p for p in papers if p.startswith(only)]
    code_of = lambda pid: re.match(r"(W[A-Z]{2}\d{2})", pid).group(1)
    pool = collections.defaultdict(list)       # unit code: questions
    frames = collections.defaultdict(list)     # unit code: real papers as slot lists
    covers = collections.defaultdict(lambda: {"time": collections.Counter(), "marks": collections.Counter()})
    skipped = collections.Counter()
    for n, pid in enumerate(papers, 1):
        pj = os.path.join(pp.BANK, subject, "_raw", pid, "paper.json")
        if not os.path.exists(pj):
            skipped["no paper.json"] += 1
            continue
        with open(pj, encoding="utf-8") as f:
            paper = json.load(f)
        if not paper["questions"] or not os.path.exists(paper["qp_path"]):
            skipped["no paper file"] += 1
            continue
        pages = page_text(paper["qp_path"], subject != "maths")
        code = code_of(pid)
        cover = " ".join(ln["text"] for pg in pages[:2] for ln in pg["lines"])
        m = COVER_TIME.search(cover)
        if m:
            minutes = int(m.group(3)) if m.group(3) else int(m.group(1)) * 60 + int(m.group(2) or 0)
            covers[code]["time"][minutes] += 1
        m = COVER_MARKS.search(cover)
        if m:
            covers[code]["marks"][int(m.group(1))] += 1
        # The paper's shape comes from the printed totals, so a question the bank has only part of
        # still counts towards it.
        text = " ".join(ln["text"] for pg in pages for ln in pg["lines"])
        section = "A" if re.search(r"\bSECTION B\b", text) else ""
        unit_marks = covers[code]["marks"].most_common(1)[0][0] if covers[code]["marks"] else None
        real, seen_marks = [], 0
        for q in sorted(paper["questions"], key=lambda q: q["number"]):
            # An answer book bound in after the paper repeats every question: stop at the paper's marks.
            if unit_marks and seen_marks >= unit_marks:
                break
            seen_marks += q["marks"]
            real.append(q)
        slots = []
        shaped = True
        xs = sorted(f[1][0] for f in (find_number(q, pages) for q in real) if f)
        column = xs[len(xs) // 2] if xs else None
        for i, q in enumerate(real):
            found = find_number(q, pages, column)
            if found:
                for ln in heading_lines(q, found, pages):
                    mm = SECTION.match(ln["text"].strip())
                    if mm:
                        section = mm.group(1)
            its = by_q.get((pid, q["number"]), [])
            labels = [p["label"] for p in q["parts"]]
            use = geometry = why = None
            try:
                if not its:
                    raise Skip("not in the bank")
                if not found:
                    raise Skip("number not found")
                if labels and all(x.get("part") for x in its):
                    use = cover_parts(its, labels)
                else:
                    whole = [x for x in its if not x.get("part")]
                    use = whole if len(whole) == 1 else None
                if not use:
                    raise Skip("parts do not cover the question")
                geometry = question_geometry(q, use, pages, subject, found)
                if number_again(q, found, pages):
                    raise Skip("its number printed again inside it")
                if any(x["path"][0] == "Off current spec" for x in its):
                    raise Skip("off the current spec")
                if any(pages[pi]["marked"] for pi in range(q["start"][0], min(q["end"][0], len(pages) - 1) + 1)):
                    raise Skip("a website's watermark across it")
                if not all(x["id"] in ms for x in use):
                    raise Skip("no real mark scheme")
                if [d for x in use for d in (x.get("deps") or []) if not str(d.get("id", "")).startswith(q["id"])]:
                    raise Skip("leans on another question")
            except Skip as e:
                why = str(e)
                skipped[why] += 1
            total = q["marks"]
            single = (len(use) == 1 and not use[0].get("part")) if use else not labels
            kind = section + ("m" if single and total == 1 else "")
            nparts = max(1, len(use) if use else len(labels))
            # A heading that could not be placed spoils the paper as a shape.
            if geometry is None and (not found or heading_lines(q, found, pages)):
                shaped = False
            slots.append({"k": kind, "m": total, "np": nparts, "h": geometry[4] if geometry else None})
            if why:
                continue
            files, n_box, t_box, q_box, _ = geometry
            part_sum = sum(x.get("marks") or 0 for x in use) or 1
            cats = collections.Counter()
            for x in use:
                cats[(x["path"][0], x["topic"], x["path"][1])] += (x.get("marks") or 0) * total / part_sum
            # Its rows of the mark scheme sheets: a part whose scheme is the whole question's shares them.
            sheets = []
            for x in use:
                c = ms[x["id"]]
                row = [(c[6] if len(c) > 6 and c[6] else "Q%d" % q["number"]), c[0], c[1], c[2], c[3], c[4]]
                if not any(r[0] == row[0] and r[1] == row[1] and r[2] == row[2] for r in sheets):
                    sheets.append(row)
            pool[code].append({
                "i": q["id"], "p": pid, "q": q["number"], "m": total, "k": kind, "np": nparts,
                "pos": round(i / max(1, len(real) - 1), 3), "y": paper["year"], "mo": paper["month"],
                "_cats": cats, "g": [[os.path.basename(f["img"]), [[round(a, 1), round(b, 1)] for a, b in f["rows"]]] for f in files],
                "n": n_box, "t": t_box, "qb": q_box, "ms": sheets,
            })
        if unit_marks and shaped and sum(s["m"] for s in slots) == unit_marks:
            frames[code].append({"paper": pid, "slots": slots})
        if n % 40 == 0:
            print("  ", subject, n, "of", len(papers), flush=True)

    units = []
    order = [u["code"] for u in listing["units"]]
    for code in sorted(pool, key=lambda c: order.index(c) if c in order else 99):
        qs = pool[code]
        marks = covers[code]["marks"].most_common(1)[0][0]
        minutes = covers[code]["time"].most_common(1)[0][0]
        # This Unit's section of the study report: the one most of its marks fall under.
        heads = collections.Counter()
        for x in qs:
            for key, v in x["_cats"].items():
                heads[key[0]] += v
        home = next((u for u, _ in heads.most_common() if report_title(u) in report), None)
        rep = report.get(report_title(home)) if home else None
        if not rep:
            print("   no report section for", code)
            continue
        # One topic in the report (the practical Units): its spec points carry the shares instead.
        by_point = len(rep["topics"]) < 2
        cats = [(c, s) for c, s, _ in rep["points"]] if by_point else list(rep["topics"])
        index = {name: i for i, (name, _) in enumerate(cats)}
        other = len(cats)
        have = collections.Counter()
        for x in qs:
            split = collections.Counter()
            points = collections.Counter()
            for (head, topic, path1), v in x["_cats"].items():
                name = topic if by_point else (group_of.get(topic) or re.sub(r"^Topic \d+\s+", "", path1))
                c = index[name] if head == home and name in index else other
                split[c] += v
                have[c] += v
                points[topic] += v
            x["c"] = sorted([c, round(v, 2)] for c, v in split.items() if v > 0)
            x["s"] = sorted([t, round(v, 2)] for t, v in points.items())
            del x["_cats"]
        # A paper's shape is only any use if there are enough questions for each of its slots.
        supply = collections.Counter((x["k"], x["m"]) for x in qs)
        usable = [f for f in frames[code] if all(n <= supply[key] for key, n in collections.Counter((t["k"], t["m"]) for t in f["slots"]).items())]
        all_marks = sum(have.values()) or 1
        other_share = 100.0 * have[other] / all_marks
        scale = (100.0 - other_share) / (sum(s for _, s in cats) or 1)
        targets = [[name, s, round(s * scale, 2)] for name, s in cats]
        if other_share > 0:
            targets.append(["Other", None, round(other_share, 2)])
        points = [[c, s] for c, s, _ in rep["points"]] if not by_point else []
        u = [x for x in listing["units"] if x["code"] == code]
        units.append({
            "code": code, "name": u[0]["name"] if u else code, "report": report_title(home),
            "marks": marks, "minutes": minutes, "cats": targets, "points": points, "frames": usable, "qs": qs,
        })
        print("   %s: %d marks, %d min, %d questions, %d frames of %d, %.1f%% other" % (code, marks, minutes, len(qs), len(usable), len(frames[code]), other_share))
    out = {"subject": subject, "units": units}
    path = os.path.join(SITE, "data", "mock-%s.json" % subject)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(subject, "written", os.path.getsize(path) // 1024, "KB; left out:", skipped.most_common())


def main():
    for s in sys.argv[1:] or SUBJECTS:
        build(s)


if __name__ == "__main__":
    main()
