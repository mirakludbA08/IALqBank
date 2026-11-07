"""Decide whether a strip of a question-paper page shows any of the question.

The screenshots are cut from whole pages, so a question that runs over a page could pick up a blank
page ("BLANK PAGE"), the tail of the page before it, or a follow-on page that is only ruled or
dotted lines to write on. strips_for_range() in process_papers.py asks strip_has_content() about
each page strip and leaves out the ones with nothing of the question on them.

A strip counts as showing the question when it has

- a line of text that is not page furniture (barcode, page number, "Turn over", "BLANK PAGE",
  "Question 4 continued", "(Total for Question 4 = 8 marks)", ...) and not just dots or underscores, or
- a figure with no text of its own: a table frame to fill in, a diagram.

Everything else is left out: a blank page, a page of lines to write on, and a page of empty graph
paper to plot on (a graph with its axes labelled has text, so it stays). Set KEEP_GRAPH_PAPER to
keep the empty graph paper pages.
"""
import re

from PIL import Image

DOT_LINE = re.compile(r"^[\s.…·•_\-–—=]{3,}$")
FURNITURE = re.compile(
    r"^\*?[A-Z]\d{4,6}[A-Z]{0,3}\d{3,6}\*?$"
    r"|^P\d{5}[A-Z]"
    r"|DO NOT WRITE IN THIS AREA"
    r"|^©"
    r"|^\d{1,2}$"
    r"|^BLANK PAGE"
    r"|^\s*Turn over"
    r"|^Question \d+ continued"
    r"|^\(?\s*Total for Question"
    r"|^\(?\s*Total \d+ marks?\s*\)?$"
    r"|^TOTAL FOR (SECTION|PAPER)"
    r"|^END OF (PAPER|QUESTIONS)"
    r"|^\(\s*\d+\s*\)$"
    r"|^\*?(Extra|ADDITIONAL) (answer )?(space|page)"
    r"|^Q\d{1,2}$"                 # the examiner's box at the foot of a Maths answer page
    r"|^\d{1,2}\.$"                # a bare question number with nothing after it
    r"|^END$"
    r"|^Leave( blank)?$|^blank$",
    re.I,
)

KEEP_GRAPH_PAPER = False

# Central part of the page, clear of the "DO NOT WRITE IN THIS AREA" strips and the page frame.
X0, X1 = 0.14, 0.86


def is_furniture(text):
    t = text.strip()
    # No letter or digit at all (every page has a footer line of private-use symbols), dots, or
    # one of the page-furniture lines above.
    return not re.search(r"\w", t) or bool(DOT_LINE.match(t)) or bool(FURNITURE.search(t))


def strip_has_content(page_lines, img, top, bottom, scale):
    """page_lines: the text lines of the page (pdftotext bbox, points). img: the rendered page
    (PIL image at `scale` pixels per point). top/bottom: the strip, in points."""
    inside = [ln for ln in page_lines if top - 1 <= ln["y0"] < bottom]
    texts = [ln["text"] for ln in inside if not is_furniture(ln["text"])]
    # A site's watermark (https://britishstudentroom.com/) runs across some pages: its fragments
    # are lines of a few letters each, not question text.
    joined = "".join(texts).replace(" ", "").lower()
    if texts and len(joined) < 80 and "britishstudent" in joined:
        texts = []
    if texts:
        return True
    # No question text: look for a figure (graph paper, empty table, diagram) in the pixels, with
    # the page furniture and the dotted lines painted out.
    w, h = img.size
    y0, y1 = max(0, int(top * scale)), min(h, int(bottom * scale))
    if y1 - y0 < 12:
        return False
    x0, x1 = int(w * X0), int(w * X1)
    g = img.convert("L").crop((x0, y0, x1, y1))
    px = g.load()
    for ln in inside:
        a = max(0, int(ln["x0"] * scale) - x0 - 2)
        b = min(g.width, int(ln["x1"] * scale) - x0 + 2)
        c = max(0, int(ln["y0"] * scale) - y0 - 2)
        d = min(g.height, int(ln["y1"] * scale) - y0 + 2)
        for yy in range(c, d):
            for xx in range(a, b):
                px[xx, yy] = 255
    # Vertical rules: graph paper (a great many, in light grey) and the frame of a table (a few).
    # Dotted lines and solid answer lines have none.
    light = g.point(lambda v: 255 if v < 225 else 0)
    lw, lh = light.size
    ld = light.load()
    vert = 0
    in_line = False
    for xx in range(lw):
        run = best = 0
        for yy in range(lh):
            if ld[xx, yy]:
                run += 1
                if run > best:
                    best = run
            else:
                run = 0
        long_col = best >= int(1.2 * 110)
        if long_col and not in_line:
            vert += 1
        in_line = long_col
    if vert >= 12:
        return KEEP_GRAPH_PAPER
    bw = g.point(lambda v: 255 if v < 150 else 0)
    cw, ch = bw.size
    data = bw.load()
    # Other ink: rows that are not part of a ruled or dotted line.
    rows = [sum(1 for xx in range(cw) if data[xx, yy]) for yy in range(ch)]
    line_row = [r >= 0.22 * cw for r in rows]
    near = [False] * ch
    for yy in range(ch):
        if line_row[yy]:
            for k in range(max(0, yy - 3), min(ch, yy + 4)):
                near[k] = True
    ink_rows = sum(1 for yy in range(ch) if not near[yy] and rows[yy] >= 3)
    return ink_rows > 14
