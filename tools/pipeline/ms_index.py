"""Find where each question and part sits in a Pearson mark scheme PDF.

Every Pearson IAL mark scheme is a table whose first column ("Question Number") holds the label of
each row: "12", "12(a)", "16(a)(ii)", "14a", "(b)". index_ms(path) reads those labels with their
positions on the page and returns, for each question, the run of the mark scheme that belongs to
it, plus the position of each part inside that run.

Coordinates are in points on the page as it is displayed (some Chemistry mark schemes are
landscape pages drawn rotated), measured down from the top.
"""
import re
import warnings
from collections import Counter

warnings.filterwarnings("ignore")
import pymupdf as fitz  # noqa: E402

ROMAN = r"(?:i{1,3}|iv|v|vi{1,3}|ix|x)"
LABEL_FORMS = [
    # 12   12(a)   12(a)(ii)   14a   14b(i)   *14   15(b)*
    re.compile(r"^\*?(?P<q>\d{1,2})(?:\(?(?P<p>[a-h])\)?)?(?:\(?(?P<s>" + ROMAN + r")\)?)?\*?$"),
    # 3(i)   3(ii)  (a Maths question whose parts are numbered with roman numerals)
    re.compile(r"^\*?(?P<q>\d{1,2})\((?P<s>" + ROMAN + r")\)\*?$"),
    # (b)   (b)(ii)   (ii)   b
    re.compile(r"^\*?\((?P<p>[a-h])\)(?:\((?P<s>" + ROMAN + r")\))?\*?$"),
    re.compile(r"^\*?\((?P<s>" + ROMAN + r")\)\*?$"),
]
HEADER_WORDS = {"question", "number", "qu.", "no.", "answer", "scheme", "mark", "marks", "guidance", "additional"}


def parse_label(text):
    t = text.replace(" ", "").replace("–", "-")
    t = re.sub(r"^(\*?\d{1,2})\.(?!\d)", r"\1", t)      # "4.(a)" -> "4(a)", "1." -> "1" (but not "1.1": numbered guidance)
    for rx in LABEL_FORMS:
        m = rx.match(t)
        if m:
            g = m.groupdict()
            return {"q": int(g["q"]) if g.get("q") else None, "p": g.get("p"), "s": g.get("s")}
    return None


class Page:
    def __init__(self, pg):
        self.w, self.h = pg.rect.width, pg.rect.height
        m = pg.rotation_matrix
        self.words = []
        for x0, y0, x1, y1, w, *_ in pg.get_text("words"):
            r = fitz.Rect(x0, y0, x1, y1) * m
            r.normalize()
            self.words.append((r.x0, r.y0, r.x1, r.y1, w))
        self.hrules, self.vrules = [], []
        try:
            drawings = pg.get_drawings()
        except Exception:
            drawings = []
        for d in drawings:
            r = fitz.Rect(d["rect"]) * m
            r.normalize()
            if r.height <= 1.8 and r.width >= 30:
                self.hrules.append((r.y0 + r.y1) / 2.0)
                self.hr_extent = getattr(self, "hr_extent", [])
                self.hr_extent.append((r.x0, r.x1, (r.y0 + r.y1) / 2.0))
            elif r.width <= 1.8 and r.height >= 8:
                self.vrules.append(((r.x0 + r.x1) / 2.0, r.y0, r.y1))
        self.hrules = sorted(set(round(v, 1) for v in self.hrules))
        self.hr_extent = getattr(self, "hr_extent", [])

    def lines(self, x_lo=None, x_hi=None):
        """Words grouped into display lines: [(y0, y1, x0, text, words)]."""
        ws = [w for w in self.words if (x_lo is None or w[0] >= x_lo) and (x_hi is None or w[0] <= x_hi)]
        ws.sort(key=lambda w: (round(w[1] / 3.0), w[0]))
        out = []
        for w in ws:
            if out and abs(out[-1][0] - w[1]) <= 3.0:
                out[-1][4].append(w)
            else:
                out.append([w[1], w[3], w[0], "", [w]])
        for ln in out:
            ln[4].sort(key=lambda w: w[0])
            ln[2] = ln[4][0][0]
            ln[3] = " ".join(w[4] for w in ln[4])
            ln[1] = max(w[3] for w in ln[4])
        return out

    def rule_above(self, y, within=30):
        c = [r for r in self.hrules if y - within <= r <= y + 2]
        return max(c) if c else None

    def rule_below(self, y, within=40):
        c = [r for r in self.hrules if y - 1 <= r <= y + within]
        return min(c) if c else None

    def cols(self):
        """(left edge, right edge of the first column, right edge) of the tables, from the vertical
        rules, or None when the page has no table borders."""
        xs = {}
        for x, y0, y1 in self.vrules:
            xs[round(x / 2) * 2] = xs.get(round(x / 2) * 2, 0) + (y1 - y0)
        xs = sorted(x for x, tot in xs.items() if tot >= 30)
        if len(xs) < 2:
            return None
        left = xs[0]
        nxt = [x for x in xs if x > left + 25]
        return (left, nxt[0] if nxt else xs[1], xs[-1])

    def in_table(self, y, left):
        """True when a vertical rule at the table's left edge runs past height y (the label is in a
        table row, not in the free text that follows it)."""
        return any(abs(x - left) <= 3 and y0 - 2 <= y <= y1 + 2 for x, y0, y1 in self.vrules)

    def table_x(self):
        c = self.cols()
        if c:
            return c[0], c[2]
        return 40.0, self.w - 40.0


def header_cols(p):
    """(left, right) of the first column from a "Question Number | Answer" header row."""
    for ln in p.lines():
        words = ln[4]
        low = [w[4].lower() for w in words]
        if ("question" in low or "qu." in low) and words[0][0] < 0.4 * p.w:
            nxt = [w for w in words if w[4].lower() in ("answer", "scheme", "marking", "mark", "marks") and w[0] > words[0][0] + 30]
            if nxt:
                return words[0][0] - 6, min(nxt[0][0] - 4, words[0][0] + 70)
    # A header with only "Question Number" on it (the Answer heading further down or missing).
    for ln in p.lines():
        words = ln[4]
        low = [w[4].lower().rstrip(".") for w in words]
        if low and low[0] in ("question", "qu") and words[0][0] < 0.4 * p.w and len(low) <= 3:
            return words[0][0] - 6, words[0][0] + 66
    return None


def has_header_above(p, y, within=60):
    """A "Question | Scheme | Marks" header row sits just above y on this page."""
    for ln in p.lines():
        low = [w[4].lower().rstrip(".") for w in ln[4]]
        if ("question" in low or "qu" in low) and ln[2] < 0.4 * p.w and len(low) <= 8                 and any(x in low for x in ("number", "no", "answer", "scheme", "mark", "marks")) and 0 <= y - ln[1] <= within:
            return True
    return False


def find_headers(pages):
    """Table header rows ("Question Number | Answer | Mark"): top, bottom, page."""
    out = []
    for pi, p in enumerate(pages):
        for ln in p.lines():
            low = [w[4].lower() for w in ln[4]]
            is_head = ("question" in low or "qu." in low) and ln[2] < 0.4 * p.w and len(low) <= 6 and "paper" not in low and "log" not in low                 and any(x in low for x in ("number", "no.", "answer", "scheme", "mark", "marks", "guidance"))
            if not is_head and low[:1] in (["question"], ["qu."], ["qu"]) and len(low) <= 2 and ln[2] < 0.4 * p.w:
                # "Question" on its own line, with "Scheme" / "Marks" a little way up or down the same row
                is_head = any(abs(w[1] - ln[0]) <= 22 and w[0] > 0.3 * p.w and w[4].lower().rstrip(".") in ("scheme", "answer", "marks", "mark") for w in p.words)
            if is_head:
                top = p.rule_above(ln[0]) or ln[0] - 4
                bot = p.rule_below(ln[1]) or ln[1] + 4
                # the second word row ("Number") of a two-line header
                nxt = [l2 for l2 in p.lines() if 0 < l2[0] - ln[0] <= 16 and l2[2] < 0.4 * p.w and l2[3].lower().startswith(("number", "no."))]
                if nxt:
                    bot = p.rule_below(nxt[0][1]) or nxt[0][1] + 4
                out.append({"page": pi, "top": top, "bot": bot, "x0": ln[2]})
    return out


def index_ms(path, strict=False):
    """strict: the mark scheme has free text (notes) after each table (Maths), so a label counts
    only when it sits in a table row, found from the vertical rules."""
    doc = fitz.open(path)
    pages = [Page(pg) for pg in doc]
    n_words = sum(len(p.words) for p in pages)
    res = {"path": path, "pages": len(pages), "words": n_words, "labels": [], "headers": [], "page_info": [], "strict": strict}
    if n_words < 50:
        res["scanned"] = True
        return res
    # The first column ("Question Number") of the tables, page by page: from the vertical rules
    # when the page has them, else from the header row; a page with neither uses the most common
    # column of the document.
    cols_page = []
    for p in pages:
        c = p.cols()
        if c:
            cols_page.append((c[0], c[1], "v"))
        else:
            h = header_cols(p)
            cols_page.append((h[0], h[1], "h") if h else None)
    common = Counter((round(c[0] / 4) * 4, round(c[1] / 4) * 4) for c in cols_page if c).most_common(1)
    doc_col = common[0][0] if common else None
    hdrs = find_headers(pages)
    # The real tables start at the first "Question Number" header: the marking guidance before it
    # has borders and example labels ("2(c)(i)") too.
    first_table = min((h["page"] for h in hdrs), default=None)
    if first_table is None:
        first_table = next((i for i, c in enumerate(cols_page) if c), 0)
    labels = []
    for pi, p in enumerate(pages):
        if pi < first_table:
            continue
        c = cols_page[pi]
        left, right = (c[0], c[1]) if c else (doc_col if doc_col else (None, None))
        if left is None:
            continue
        for ln in p.lines(x_hi=right + 2):
            lab_txt = None
            for k in range(len(ln[4]), 0, -1):
                cand = "".join(w[4] for w in ln[4][:k])
                if parse_label(cand) and ln[4][k - 1][2] <= right + 2:
                    lab_txt = cand
                    break
            if not lab_txt:
                continue
            first = ln[4][0]
            if first[0] < left - 4 or first[0] > right - 2:
                continue
            in_tbl = True
            if strict:
                in_tbl = bool(c and c[2] == "v" and p.in_table(ln[0], c[0])) or has_header_above(p, ln[0])
            labels.append({"page": pi, "y0": ln[0], "y1": ln[1], "x0": first[0], "text": lab_txt, "tbl": in_tbl, **parse_label(lab_txt)})
    # Question numbers only go up. Take each full label (with its number) as the current question;
    # a label without a number (b, (ii)) belongs to the current question.
    ordered = sorted(labels, key=lambda c: (c["page"], c["y0"]))
    # Keep the longest run of question numbers that never goes down: a stray number in a table
    # body ("22" between questions 13 and 14) is then dropped instead of ending the sequence.
    prov, cur_q = [], 0
    for c in ordered:
        if c["q"] is None:
            if cur_q == 0:
                continue
            prov.append((cur_q, c))
        else:
            cur_q = c["q"]
            prov.append((cur_q, c))
    n = len(prov)
    best = [1] * n
    prev = [-1] * n
    for i in range(n):
        for j in range(i):
            if prov[j][0] <= prov[i][0] and best[j] + 1 > best[i]:
                best[i], prev[i] = best[j] + 1, j
    if n:
        end_i = max(range(n), key=lambda i: (best[i], -i))
        keep = []
        while end_i != -1:
            keep.append(end_i)
            end_i = prev[end_i]
        keep_ids = {id(prov[i][1]) for i in keep}
        ordered = [c for c in ordered if id(c) in keep_ids]
    seq = []
    cur = 0
    for c in ordered:
        q = c["q"]
        if q is None:
            if cur == 0:
                continue
            q = cur
        elif not c["tbl"] and q != cur:
            continue          # a new question starts in a table row, never in the free text after it
        elif q < cur or q > cur + (2 if strict else 14) or (strict and q == cur + 2 and (not c["tbl"] or c["p"] not in (None, "a") or c["s"] not in (None, "i"))):
            continue      # (outside Maths, a number in the first column of a table is always a label)
        elif q == cur and c["p"] is None and c["s"] is None and seq and seq[-1]["q"] == q and seq[-1]["text"].lstrip("*") == c["text"].lstrip("*"):
            continue
        cur = q
        c = dict(c)
        c["q"] = q
        seq.append(c)
    res["labels"] = seq
    res["col"] = doc_col
    res["headers"] = hdrs
    res["page_info"] = [{"w": p.w, "h": p.h, "col": cols_page[i] if i < len(cols_page) else None} for i, p in enumerate(pages)]
    return res
