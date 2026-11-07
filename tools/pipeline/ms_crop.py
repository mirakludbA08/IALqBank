"""Cut the real Pearson mark scheme for a question out of the mark scheme PDF.

make_sheet(ms, q) returns one tall image with the mark scheme rows of question q (all its parts, in
order, the way they are printed, across page breaks), and the position of every part in it:

    sheet = make_sheet(ms, 12)
    sheet["image"]            PIL image
    sheet["parts"]["b"]       (top, bottom) in pixels of part (b)'s rows
    sheet["header"]           (top, bottom) of the "Question Number | Answer | Mark" row, or None
    sheet["whole"]            (top, bottom) of the whole question

`ms` is index_ms() output with the open document attached (open_ms()).
"""
import re

import pymupdf as fitz
from PIL import Image, ImageChops

import ms_index as mi

WIDTH = 1000          # pixels across the table
MAX_SCALE = 3.0
MIN_SCALE = 1.0


def open_ms(path, strict=False):
    idx = mi.index_ms(path, strict=strict)
    idx["doc"] = fitz.open(path)
    idx["pg"] = [mi.Page(p) for p in idx["doc"]] if not idx.get("scanned") else []
    return idx


def _header_above(ms, page, y, within=45):
    best = None
    for h in ms["headers"]:
        if h["page"] == page and -10 <= y - h["bot"] <= within:
            if best is None or h["bot"] > best["bot"]:
                best = h
    return best


def _row_top(ms, label):
    """Top of a label's row: the header row above it when it is the first row of a table, else the
    rule above it."""
    p = ms["pg"][label["page"]]
    h = _header_above(ms, label["page"], label["y0"])
    if h:
        return h["top"] - 1, h
    r = p.rule_above(label["y0"], within=26)
    return (r - 0.5 if r is not None else label["y0"] - 4), None


def _content_box(ms, page):
    """Top and bottom of the printed table content on a page (points), leaving out a lone page
    number at the foot."""
    p = ms["pg"][page]
    ys0, ys1 = [], []
    for w in p.words:
        if w[1] < 20:
            continue
        if w[3] > p.h - 70 and re.fullmatch(r"\d{1,2}", w[4]) and 0.35 * p.w < w[0] < 0.65 * p.w:
            continue
        if w[1] > p.h - 28:
            continue
        ys0.append(w[1])
        ys1.append(w[3])
    rr = [r for r in p.hrules if 10 < r < p.h - 40]
    if rr:
        ys0.append(min(rr))
        ys1.append(max(rr))
    if not ys0:
        return None
    return max(0.0, min(ys0) - 3), min(p.h, max(ys1) + 3)


def _x_range(ms, page):
    p = ms["pg"][page]
    c = p.cols()
    if c:
        return c[0] - 2, c[2] + 2
    xs0 = [w[0] for w in p.words if w[1] > 20]
    xs1 = [w[2] for w in p.words if w[1] > 20]
    if not xs0:
        return 30.0, p.w - 30.0
    return max(0.0, min(xs0) - 8), min(p.w, max(xs1) + 8)


def question_labels(ms, q):
    return [l for l in ms["labels"] if l["q"] == q]


def printed_marks(ms, a, b):
    """The mark totals printed in the last column ("Mark") of the rows between position a and b,
    each (page, y). None when the pages have no table borders to find that column by."""
    total = 0
    found = False
    for pg in range(a[0], b[0] + 1):
        p = ms["pg"][pg]
        xs = sorted({round(x) for x, y0, y1 in p.vrules if y1 - y0 >= 8})
        if len(xs) < 3:
            return None
        left = xs[-2] - 2
        ya = a[1] if pg == a[0] else 0
        yb = b[1] if pg == b[0] else p.h
        total_ys = [w[1] for w in p.words if w[4].lower().startswith("total")]
        for w in p.words:
            if w[0] >= left and ya - 1 <= w[1] < yb - 1:
                if any(abs(w[1] - ty) <= 3 for ty in total_ys):
                    continue          # the "Total for question" row is not part of a part
                m = re.fullmatch(r"\(?(\d{1,2})\)?", w[4])
                if m:
                    total += int(m.group(1))
                    found = True
    return total if found else None


def make_sheet(ms, q, doc_scale=None):
    labels = question_labels(ms, q)
    if not labels:
        return None
    first = labels[0]
    s_y, s_hdr = _row_top(ms, first)
    start = (first["page"], s_y)
    nxt = [l for l in ms["labels"] if l["q"] > q]
    if nxt:
        n_y, _ = _row_top(ms, nxt[0])
        end = (nxt[0]["page"], n_y)
        if nxt[0]["q"] > q + 1:
            # A question between them has no label we could read (an extended-response row, say):
            # stop at this question's own "Total" row so its rows do not run on into that one.
            last = labels[-1]

            for pg in range(last["page"], end[0] + 1):
                p = ms["pg"][pg]
                tots = [w for w in p.words if w[4].lower().startswith("total") and (pg, w[1]) > (last["page"], last["y0"]) and (pg, w[1]) < end]
                if tots:
                    t = min(tots, key=lambda w: w[1])
                    below = p.rule_below(t[3], within=14)
                    end = (pg, (below if below is not None else t[3] + 3) + 0.5)
                    break
        if ms.get("strict") and labels:
            # A Maths question's table ends with a "(5 marks)" row and its notes follow; the next
            # question's table starts at the next header, which can be well above its first label
            # (a diagram or a long row in between).
            last = labels[-1]
            for pg in range(last["page"], end[0] + 1):
                p = ms["pg"][pg]
                rows = [ln for ln in p.lines() if (pg, ln[0]) > (last["page"], last["y0"]) and (pg, ln[0]) < end
                        and re.fullmatch(r"\(?\s*\d+\s*marks?\s*\)?|\[\s*\d+\s*\]", ln[3].strip(), re.I)]
                if rows:
                    m = (pg, rows[0][1])
                    hs = sorted((h["page"], h["top"]) for h in ms["headers"] if (h["page"], h["top"]) > m and (h["page"], h["top"]) < end)
                    if hs:
                        end = (hs[0][0], hs[0][1] - 1)
                    break
    else:
        last = ms["pages"] - 1
        cb = _content_box(ms, last)
        end = (last, cb[1] if cb else ms["pg"][last].h)
    # Chunks of pages in order.
    chunks = []
    for pg in range(start[0], end[0] + 1):
        cb = _content_box(ms, pg)
        if cb is None:
            continue
        ya = start[1] if pg == start[0] else cb[0]
        yb = end[1] if pg == end[0] else cb[1]
        if pg == end[0] and pg != start[0] and yb - cb[0] < 24:
            continue   # the next question begins at the top of this page: nothing of ours on it
        if pg == end[0] and pg != start[0]:
            # nothing but the next table's header row on this part of the page: not ours
            p = ms["pg"][pg]
            heads = [h for h in ms["headers"] if h["page"] == pg]
            ours = [w for w in p.words if ya <= w[1] < yb and not any(h["top"] - 3 <= w[1] <= h["bot"] + 3 for h in heads)]
            if not ours:
                continue
        if yb - ya < 6:
            continue
        chunks.append((pg, ya, yb))
    if not chunks:
        return None
    # A question that does not start right under a table header (e.g. a multiple-choice row in the
    # middle of the table) gets the nearest header above it, so the sheet always reads as a table.
    pre = None
    if s_hdr is None:
        earlier = [h for h in ms["headers"] if (h["page"], h["bot"]) <= (start[0], start[1])]
        if earlier:
            h0 = max(earlier, key=lambda h: (h["page"], h["bot"]))
            pre = (h0["page"], h0["top"] - 1, h0["bot"] + 0.5)
            chunks.insert(0, pre)
    # Scale: the table is drawn WIDTH pixels across.
    xr = _x_range(ms, chunks[0][0])
    scale = max(MIN_SCALE, min(MAX_SCALE, WIDTH / max(60.0, xr[1] - xr[0])))
    images = []
    for pg, ya, yb in chunks:
        x0, x1 = _x_range(ms, pg)
        page = ms["doc"][pg]
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, clip=fitz.Rect(x0, ya, x1, yb), colorspace=fitz.csRGB, alpha=False)
        im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        images.append(im)
    width = max(im.width for im in images)
    # Offsets of each chunk in the sheet
    offs = []
    y = 0
    for im in images:
        offs.append(y)
        y += im.height
    sheet = Image.new("RGB", (width, y), "white")
    for im, off in zip(images, offs):
        sheet.paste(im, (0, off))

    def px(page, ypt):
        for (pg, ya, yb), off in zip(chunks, offs):
            if pg == page and ya - 0.5 <= ypt <= yb + 0.5:
                return int(round(off + (ypt - ya) * scale))
        # a position outside every chunk: clamp to the nearest chunk edge
        best = None
        for (pg, ya, yb), off in zip(chunks, offs):
            if pg == page:
                return int(round(off + (min(max(ypt, ya), yb) - ya) * scale))
            d = abs(pg - page)
            if best is None or d < best[0]:
                best = (d, off if pg > page else off + int((yb - ya) * scale))
        return best[1] if best else 0

    tops = []
    for i, l in enumerate(labels):
        y_, _h = _row_top(ms, l)
        tops.append(px(l["page"], y_))
    total = sheet.height
    # A part runs from its first row to the first row of the next different part.
    order = []
    for i, l in enumerate(labels):
        if l["p"] and (not order or order[-1][0] != l["p"]):
            order.append((l["p"], tops[i], (l["page"], _row_top(ms, l)[0])))
    parts = {}
    part_marks = {}
    for k, (p, a, pos_a) in enumerate(order):
        if p in parts:
            continue
        b = order[k + 1][1] if k + 1 < len(order) else total
        parts[p] = (a, b)
        if k + 1 < len(order):
            pos_b = order[k + 1][2]
        else:
            pos_b = end
        try:
            part_marks[p] = printed_marks(ms, pos_a, pos_b)
        except Exception:
            part_marks[p] = None
    header = None
    if pre is not None:
        header = (0, offs[1] if len(offs) > 1 else offs[0] + images[0].height)
    elif s_hdr is not None:
        header = (px(first["page"], s_hdr["top"] - 1), px(first["page"], s_hdr["bot"] + 0.5))
    return {"image": sheet, "parts": parts, "part_marks": part_marks, "header": header, "whole": (0, total), "scale": scale,
            "pages": sorted({c[0] for c in chunks})}


def trim_blank(im, pad=6):
    """Cut blank rows off the foot (and head) of the sheet."""
    bg = Image.new(im.mode, im.size, "white")
    bbox = ImageChops.difference(im, bg).getbbox()
    if not bbox:
        return im, 0
    top = max(0, bbox[1] - pad)
    bot = min(im.height, bbox[3] + pad)
    return im.crop((0, top, im.width, bot)), top
