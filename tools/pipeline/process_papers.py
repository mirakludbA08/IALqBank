"""Inventory IAL papers for one subject, split each question paper into questions and
level-1 parts, crop a screenshot per part (question stem + part) and write one JSON
file per paper. Dependent ("hence") parts are bundled later by bundle_parts.py.

Usage: python -I process_papers.py <subject> [limit]
Reads papers from the extracted Drive folders and writes to D:\\IAL-drive-papers\\bank\\<subject>\\_raw.
"""
import json
import os
import re
import subprocess
import sys
import xml.etree.ElementTree as ET

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pagefilter import strip_has_content  # noqa: E402

# pdftotext needs -bbox-layout, which the copy that comes with Git for Windows does not have.
_MIKTEX = r"C:\Users\VICTUS\AppData\Local\Programs\MiKTeX\miktex\bin\x64"
if os.path.isdir(_MIKTEX):
    os.environ["PATH"] = _MIKTEX + os.pathsep + os.environ.get("PATH", "")

SUBJECTS = {
    "physics": {"root": r"D:\IALqBank_D\Physics", "code": "WPH"},
    "chemistry": {"root": r"D:\IALqBank_D\Chem", "code": "WCH"},
    "biology": {"root": r"D:\IALqBank_D\Bio\Biology", "code": "WBI"},
    "maths": {"root": r"D:\IALqBank_D\Maths\Math", "code": "W(?:MA|ME|ST|FM|DM)"},
}
BANK = r"D:\IAL-drive-papers\bank"
DPI = 110
XH = "{http://www.w3.org/1999/xhtml}"

MONTHS = {
    "jan": "Jan", "january": "Jan", "feb": "Feb", "may": "May", "june": "Jun", "jun": "Jun",
    "oct": "Oct", "october": "Oct", "nov": "Nov", "november": "Nov",
}
LETTERS = "abcdefghijklmnopqrstuvwxyz"
NOISE = re.compile(r"^\*?[A-Z]\d{4,6}[A-Z]\d{4}\*?$|DO NOT WRITE IN THIS AREA|^P\d{5}A|^Turn over|^\u00a9|^\d{1,2}$|^BLANK PAGE|^\s*Turn over")


def session_key(folder):
    m = re.match(r"(\d{4})\s*(.*)$", folder.strip(), re.I)
    if not m:
        return None
    year, rest = m.group(1), m.group(2).strip().lower()
    for k in sorted(MONTHS, key=len, reverse=True):
        if rest.startswith(k):
            return year, MONTHS[k]
    return None


def inventory(subject):
    cfg = SUBJECTS[subject]
    code = cfg["code"]
    papers = {}
    for dirpath, _dirs, files in os.walk(cfg["root"]):
        rel = os.path.relpath(dirpath, cfg["root"])
        parts = rel.split(os.sep)
        sess = session_key(parts[0]) if parts and parts[0] != "." else None
        if not sess:
            continue
        year, month = sess
        if int(year) >= 2025 or int(year) < 2013:
            continue
        low_path = rel.lower()
        if "modified" in low_path:
            continue
        folder_kind = None
        if "question-paper" in low_path:
            folder_kind = "qp"
        elif "mark-scheme" in low_path:
            folder_kind = "ms"
        elif "examiner-report" in low_path:
            folder_kind = "er"
        for fn in files:
            if not fn.lower().endswith(".pdf"):
                continue
            m = re.search("(" + code + r"\d{2})", fn, re.I)
            if not m:
                continue
            low = fn.lower()
            if any(w in low for w in ("insert", "data", "formula", "booklet", "graph", "sample", "modified")):
                continue
            kind = folder_kind
            if kind is None:
                if re.search(r"_que_|question|^wph\d\d_\d\d_\w+\d{6}|oct\d\d|nov\d\d|jun\d\d|jan\d\d", low) and not re.search(r"msc|rms|mark|pef|examiner", low):
                    kind = "qp"
                elif re.search(r"_msc_|_rms_|mark", low):
                    kind = "ms"
                elif re.search(r"_pef_|examiner|_rep_", low):
                    kind = "er"
            if not kind:
                continue
            unit = m.group(1).upper()
            papers.setdefault((unit, year, month), {})[kind] = os.path.join(dirpath, fn)
    out = []
    for (unit, year, month), d in sorted(papers.items(), key=lambda kv: (kv[0][1], kv[0][2], kv[0][0])):
        if "qp" not in d:
            continue
        out.append({
            "paper_id": "%s_%s%s" % (unit, month, year),
            "unit": unit, "year": year, "month": month,
            "qp": d.get("qp"), "ms": d.get("ms"), "er": d.get("er"),
        })
    return out


RELEASE = r"D:\IALqBank_D\_release"


def release_inventory(subject, min_year=2025):
    """Papers from the release staging folders (<paper>_QP.pdf with <paper>_MS.pdf beside it), from
    min_year on. A paper such as WPH11A_Jan2026 is the "A" version of Unit 1 for that session: its
    unit is WPH11 and its paper id keeps the A."""
    out = []
    d = os.path.join(RELEASE, subject)
    for fn in sorted(os.listdir(d)):
        m = re.match(r"^(W[A-Z]{2}\d{2})(A?)_([A-Za-z]+)(\d{4})_QP\.pdf$", fn)
        if not m or int(m.group(4)) < min_year:
            continue
        unit, var, month, year = m.group(1), m.group(2), m.group(3), m.group(4)
        pid = "%s%s_%s%s" % (unit, var, month, year)
        ms = os.path.join(d, pid + "_MS.pdf")
        out.append({"paper_id": pid, "unit": unit, "year": year, "month": month,
                    "qp": os.path.join(d, fn), "ms": ms if os.path.exists(ms) else None, "er": None})
    return out


def run(cmd):
    return subprocess.run(cmd, capture_output=True, check=False)


def bbox_pages_fitz(pdf):
    """The text lines of every page, read with PyMuPDF (no outside program, nothing written to
    disk). Used when pdftotext cannot run (PP_FITZ=1, or it failed)."""
    import pymupdf
    pages = []
    with pymupdf.open(pdf) as doc:
        for pg in doc:
            lines = []
            for b in pg.get_text("dict")["blocks"]:
                if b.get("type") != 0:
                    continue
                for ln in b["lines"]:
                    words = "".join(sp["text"] for sp in ln["spans"]).split()
                    if not words:
                        continue
                    x0, y0, x1, y1 = ln["bbox"]
                    lines.append({"x0": x0, "y0": y0, "x1": x1, "y1": y1, "words": words, "text": " ".join(words)})
            lines.sort(key=lambda l: (round(l["y0"] / 3), l["x0"]))
            pages.append({"w": pg.rect.width, "h": pg.rect.height, "lines": lines})
    return pages


def bbox_pages(pdf, tmp_xml):
    if os.environ.get("PP_FITZ"):
        return bbox_pages_fitz(pdf)
    try:
        return bbox_pages_pdftotext(pdf, tmp_xml)
    except RuntimeError:
        return bbox_pages_fitz(pdf)


def bbox_pages_pdftotext(pdf, tmp_xml):
    for attempt in range(4):
        res = run(["pdftotext", "-bbox-layout", "-enc", "UTF-8", pdf, tmp_xml])
        if os.path.exists(tmp_xml):
            break
        if attempt == 3:
            raise RuntimeError("pdftotext failed on %s: %r" % (pdf, res.stderr[-300:]))
    with open(tmp_xml, "rb") as f:
        data = f.read().decode("utf-8", "replace")
    data = re.sub(r"<!DOCTYPE[^>]*>", "", data)
    data = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f￾￿]", "", data)
    root = ET.fromstring(data)
    pages = []
    for page in root.iter(XH + "page"):
        lines = []
        for line in page.iter(XH + "line"):
            words = [w.text or "" for w in line.iter(XH + "word")]
            lines.append({
                "x0": float(line.get("xMin")), "y0": float(line.get("yMin")),
                "x1": float(line.get("xMax")), "y1": float(line.get("yMax")),
                "words": words, "text": " ".join(words),
            })
        lines.sort(key=lambda l: (round(l["y0"] / 3), l["x0"]))
        pages.append({"w": float(page.get("width")), "h": float(page.get("height")), "lines": lines})
    return pages


def part_label(words, x0):
    """Return the part label if this line starts a part, e.g. '(a)' or '(ii)'."""
    if words and x0 < 140:
        w = words[0]
        if w == "*" and len(words) > 1:
            w = words[1]
        # a leading asterisk marks the extended-writing (quality of written communication) part
        m = re.fullmatch(r"\*?\(([a-z]{1,4})\)", w)
        if m:
            return m.group(1)
    return None


def is_garbled(text):
    """Some papers print body text in a font whose codes are shifted by 29 and lose spaces/digits."""
    t = text.strip()
    if len(t) < 12:
        return False
    return t.count(" ") < len(t) / 10 and sum(1 for c in t if 33 <= ord(c) <= 93) >= 0.6 * len(t)


def decode_garbled(text):
    return "".join(chr(ord(c) + 29) if 33 <= ord(c) <= 93 else c for c in text)


def first_question_line(pages, last_page):
    """Where Question 1 starts: its number ("1", "1." or "1 Some text") at the left margin, on any
    page after the cover up to last_page. Returns (page, y) just above it, or None."""
    for pi in range(1, min(last_page, len(pages) - 1) + 1):
        for ln in pages[pi]["lines"]:
            if ln["x0"] < 110 and re.match(r"^1(\.|\s|$)", ln["text"].strip()):
                return (pi, ln["y0"] - 2)
    return None


def split_questions(pages):
    """Regions are cut at the 'Total for Question N' markers, which every IAL paper prints."""
    markers = []
    first_start = None
    for pi, p in enumerate(pages):
        for ln in p["lines"]:
            txt = ln["text"].strip()
            m = re.search(r"Total for Question (\d+)\s*(?:=|is)\s*(\d+)\s*marks?", txt, re.I)
            m2 = re.fullmatch(r"\(?\s*Total\s+(\d+)\s+marks?\s*\)?", txt, re.I)
            if m:
                markers.append((pi, ln["y1"], int(m.group(1)), int(m.group(2))))
            elif m2:
                # Maths papers print "(Total 7 marks)" with no question number: number them in order
                markers.append((pi, ln["y1"], None, int(m2.group(1))))
            elif first_start is None and re.search(r"Answer ALL questions|^SECTION A", txt):
                first_start = (pi, ln["y1"])
    if not markers:
        return []
    markers.sort(key=lambda t: (t[0], t[1]))
    # No "Answer ALL questions" line (most Maths papers, some Chemistry practicals): Question 1
    # starts at its number, which can be a page or more before its Total line.
    if first_start is None or first_start > (markers[0][0], markers[0][1]):
        first_start = first_question_line(pages, markers[0][0]) or first_start
    # a duplicated or out-of-order number (e.g. "19" read as "1") continues the sequence instead
    fixed = []
    last = 0
    for pi_, y_, num_, marks_ in markers:
        if num_ is None or num_ <= last:
            num_ = last + 1
        fixed.append((pi_, y_, num_, marks_))
        last = num_
    markers = fixed
    questions = []
    prev = first_start if first_start and first_start <= (markers[0][0], markers[0][1]) else (markers[0][0], 30)
    for pi_end, y_end, num, marks in markers:
        end = (pi_end, y_end)
        q = {"number": num, "start": prev, "end": end, "marks": marks, "lines": [], "parts": []}
        next_letter = 0
        for pi in range(prev[0], pi_end + 1):
            for ln in pages[pi]["lines"]:
                pos = (pi, ln["y0"])
                if pos <= prev or pos > end:
                    continue
                txt = ln["text"].strip()
                if NOISE.search(txt) or not txt:
                    continue
                q["lines"].append((pi, ln["y0"], txt))
                lab = part_label(ln["words"], ln["x0"])
                if not lab and marks > 3 and next_letter < 26 and ln["x0"] < 140 and len(ln["words"]) > 1:
                    w0 = ln["words"][0]
                    if len(w0) == 1 and "A" <= w0 <= "Z" and chr(ord(w0) + 29) == LETTERS[next_letter] and is_garbled(" ".join(ln["words"][1:])):
                        lab = LETTERS[next_letter]
                if lab:
                    top_level = len(lab) == 1 and next_letter < 26 and lab == LETTERS[next_letter]
                    if top_level and lab in "ivx" and q["parts"] and q["parts"][-1]["label"] != LETTERS[next_letter - 1]:
                        top_level = False
                    if top_level:
                        q["parts"].append({"label": lab, "start": (pi, ln["y0"]), "subs": []})
                        next_letter += 1
                    elif q["parts"]:
                        q["parts"][-1]["subs"].append(lab)
        if q["lines"]:
            q["start"] = (q["lines"][0][0], q["lines"][0][1])
        questions.append(q)
        prev = end
    return questions


def render_pages_fitz(pdf, outdir):
    import pymupdf
    with pymupdf.open(pdf) as doc:
        width = max(2, len(str(len(doc))))
        for i, pg in enumerate(doc):
            pg.get_pixmap(dpi=DPI).save(os.path.join(outdir, "pg-%0*d.jpg" % (width, i + 1)), jpg_quality=80)


def render_pages(pdf, outdir):
    os.makedirs(outdir, exist_ok=True)
    if os.environ.get("PP_FITZ"):
        render_pages_fitz(pdf, outdir)
    else:
        run(["pdftoppm", "-r", str(DPI), "-jpeg", "-jpegopt", "quality=80", pdf, os.path.join(outdir, "pg")])
        if not any(f.startswith("pg-") for f in os.listdir(outdir)):
            render_pages_fitz(pdf, outdir)
    files = sorted(f for f in os.listdir(outdir) if f.startswith("pg-") and f.endswith(".jpg"))
    return [os.path.join(outdir, f) for f in files]


def strips_for_range(a, b, pages, imgs):
    """Vertical strips from position a=(page,y) up to position b=(page,y)."""
    scale = DPI / 72.0
    out = []
    every = []      # all the strips, used only if the filter would leave nothing
    for pi in range(a[0], b[0] + 1):
        if pi >= len(imgs):
            break
        im = Image.open(imgs[pi])
        ph = pages[pi]["h"]
        top, bottom = 30, ph - 38
        if pi == a[0]:
            top = max(0, a[1] - 6)
        else:
            # A "Question 4 continued" heading at the top of a follow-on page adds nothing.
            for ln in pages[pi]["lines"]:
                if ln["y0"] < 140 and re.match(r"^Question \d+ continued", ln["text"].strip(), re.I):
                    top = max(top, ln["y1"] + 4)
        if pi == b[0]:
            bottom = min(ph, b[1] + 8)
        lines = pages[pi]["lines"]
        if TRIM_ANSWER_SPACE and lines:
            # Stop above the page footer (page number, barcode, "Turn over").
            foot = [ln["y0"] for ln in lines if ln["y0"] > ph - 90 and NOISE.search(ln["text"].strip())]
            if foot and pi != b[0]:
                bottom = min(bottom, min(foot) - 6)
        if bottom <= top:
            continue
        # Leave out a page strip with none of the question on it: a blank page, the tail of the
        # page before the question, or a follow-on page of lines to write on (see pagefilter.py).
        strip = im.crop((0, int(top * scale), im.width, int(bottom * scale)))
        every.append(strip)
        if not strip_has_content(lines, im, top, bottom, scale):
            continue
        out.append(strip)
    return out or every


def save_strips(strips, out_path):
    if not strips:
        return False
    width = max(s.width for s in strips)
    height = sum(s.height for s in strips)
    canvas = Image.new("RGB", (width, height), "white")
    y = 0
    for s in strips:
        canvas.paste(s, (0, y))
        y += s.height
    if TRIM_ANSWER_SPACE:
        canvas = squeeze_answer_space(canvas)
    canvas.save(out_path, "JPEG", quality=82)
    return True


# Maths papers leave a page or more of ruled answer lines under each question. With this on,
# save_strips squeezes every long stretch of empty or ruled space down to a small gap, so a
# screenshot shows the question rather than the answer space. Set per subject by the callers.
TRIM_ANSWER_SPACE = False


def squeeze_answer_space(img, min_run=None, keep=None):
    """Rows are read across the middle of the page only (the bordered answer box and the
    "DO NOT WRITE IN THIS AREA" strips run down both sides). A row is space when it has at most
    two dark pixels, or a ruled line when dark pixels cover most of it; any other row (text, a
    figure, a table, graph paper) is kept. Runs of space and ruled lines taller than min_run
    are cut down to keep pixels at each end."""
    scale = DPI / 72.0
    min_run = min_run or int(80 * scale)   # about 1.1 inches
    keep = keep or int(9 * scale)
    w, h = img.size
    x0, x1 = int(w * 0.12), int(w * 0.86)
    col = img.convert("L").crop((x0, 0, x1, h)).point(lambda v: 255 if v < 170 else 0)
    cw = x1 - x0
    sums = list(col.resize((1, h), Image.BOX).getdata())   # mean of each row, 0..255
    dark = [s / 255.0 * cw for s in sums]
    blank = [d <= 2.5 or d >= 0.45 * cw for d in dark]
    keep_rows = []
    y = 0
    while y < h:
        if not blank[y]:
            keep_rows.append((y, y + 1))
            y += 1
            continue
        end = y
        while end < h and blank[end]:
            end += 1
        if end - y > min_run:
            keep_rows.append((y, y + keep))
            keep_rows.append((end - keep, end))
        else:
            keep_rows.append((y, end))
        y = end
    # Join neighbouring row ranges, then paste them one under the other.
    spans = []
    for a, b in keep_rows:
        if spans and spans[-1][1] == a:
            spans[-1] = (spans[-1][0], b)
        else:
            spans.append((a, b))
    if len(spans) == 1 and spans[0] == (0, h):
        return img
    out = Image.new("RGB", (w, sum(b - a for a, b in spans)), "white")
    y = 0
    for a, b in spans:
        out.paste(img.crop((0, a, w, b)), (0, y))
        y += b - a
    return out


def clean_text(t):
    t = t.replace("\u2212", "-")
    t = re.sub(r"[ \t]+", " ", t).strip()
    if is_garbled(t):
        t = "[decoded, spaces and numbers lost] " + decode_garbled(t)
    return t


def lines_text(q, a=None, b=None):
    out = []
    for pi, y, t in q["lines"]:
        if a is not None and (pi, y) < a:
            continue
        if b is not None and (pi, y) >= b:
            continue
        out.append(clean_text(t))
    return "\n".join(out)


def process(subject, entry):
    pid = entry["paper_id"]
    raw_dir = os.path.join(BANK, subject, "_raw", pid)
    os.makedirs(raw_dir, exist_ok=True)
    tmp = os.path.join(raw_dir, "_bbox.xml")
    pages = bbox_pages(entry["qp"], tmp)
    if os.path.exists(tmp):
        os.remove(tmp)
    qs = split_questions(pages)
    imgs = render_pages(entry["qp"], os.path.join(raw_dir, "_pages"))
    result = {
        "paper_id": pid, "unit": entry["unit"], "year": entry["year"], "month": entry["month"],
        "qp_path": entry["qp"], "ms_path": entry.get("ms"), "er_path": entry.get("er"),
        "pages_dir": os.path.join(raw_dir, "_pages"),
        "page_sizes": [(p["w"], p["h"]) for p in pages],
        "questions": [],
    }
    for q in qs:
        qid = "%s-Q%d" % (pid, q["number"])
        parts_out = []
        plist = q["parts"]
        stem_end = (plist[0]["start"][0], plist[0]["start"][1] - 10) if plist else None
        stem_strips = strips_for_range(q["start"], stem_end, pages, imgs) if plist else []
        if plist and stem_end and stem_end[1] - q["start"][1] < 2 and stem_end[0] == q["start"][0]:
            stem_strips = []
        for i, p in enumerate(plist):
            # stop 2pt above the next part's first line so no clipped sliver of it shows
            end = (plist[i + 1]["start"][0], plist[i + 1]["start"][1] - 10) if i + 1 < len(plist) else q["end"]
            part_id = "%s-%s" % (qid, p["label"])
            shot = os.path.join(raw_dir, "Q%d_%s.jpg" % (q["number"], p["label"]))
            ok = save_strips(stem_strips + strips_for_range(p["start"], end, pages, imgs), shot)
            parts_out.append({
                "id": part_id, "label": p["label"], "subs": p["subs"],
                "start": p["start"], "end": end,
                "screenshot": shot if ok else None,
                "text": lines_text(q, p["start"], end),
            })
        whole_shot = os.path.join(raw_dir, "Q%d.jpg" % q["number"])
        ok_whole = save_strips(strips_for_range(q["start"], q["end"], pages, imgs), whole_shot)
        result["questions"].append({
            "id": qid, "number": q["number"], "marks": q["marks"],
            "pages": [q["start"][0] + 1, q["end"][0] + 1],
            "start": q["start"], "end": q["end"],
            "screenshot": whole_shot if ok_whole else None,
            "stem_text": lines_text(q, None, plist[0]["start"]) if plist else lines_text(q),
            "parts": parts_out,
            "text": lines_text(q),
        })
    if entry.get("ms"):
        ms_txt = os.path.join(raw_dir, "ms.txt")
        if os.environ.get("PP_FITZ"):
            import pymupdf
            with pymupdf.open(entry["ms"]) as mdoc:
                ms = "".join(p.get_text("text") for p in mdoc)
        else:
            run(["pdftotext", "-layout", "-enc", "UTF-8", entry["ms"], ms_txt])
            with open(ms_txt, encoding="utf-8", errors="replace") as f:
                ms = f.read()
        ms = re.sub(r"[ \t]+", " ", ms.replace("\f", "\n"))
        ms = re.sub(r"\n{3,}", "\n\n", ms)
        with open(ms_txt, "w", encoding="utf-8") as f:
            f.write(ms)
        result["ms_text_file"] = ms_txt
    with open(os.path.join(raw_dir, "paper.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, indent=1, ensure_ascii=False)
    return result


def main():
    global TRIM_ANSWER_SPACE
    subject = sys.argv[1]
    TRIM_ANSWER_SPACE = subject == "maths"
    only = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].isdigit() else None
    limit = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
    release = "--release" in sys.argv
    if release:
        # 2025 and 2026 papers: skip the ones already split
        inv = [e for e in release_inventory(subject)
               if not os.path.exists(os.path.join(BANK, subject, "_raw", e["paper_id"], "paper.json"))]
        sys.argv = [a for a in sys.argv if a != "--release"]
        only = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].isdigit() else None
        limit = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else None
    else:
        inv = inventory(subject)
    if only:
        inv = [e for e in inv if e["paper_id"] == only]
    os.makedirs(os.path.join(BANK, subject), exist_ok=True)
    with open(os.path.join(BANK, subject, "inventory-release.json" if release else "inventory.json"), "w", encoding="utf-8") as f:
        json.dump(inv, f, indent=1)
    print("papers in inventory:", len(inv), "| with MS:", sum(1 for e in inv if e.get("ms")))
    todo = inv[:limit] if limit else inv
    for i, e in enumerate(todo, 1):
        try:
            r = process(subject, e)
            nq = len(r["questions"])
            nparts = sum(len(q["parts"]) for q in r["questions"])
            unmarked = sum(1 for q in r["questions"] if q["marks"] is None)
            print("[%d/%d] %s questions=%d parts=%d unclosed=%d" % (i, len(todo), e["paper_id"], nq, nparts, unmarked), flush=True)
        except Exception as ex:
            print("[%d/%d] %s FAILED: %r" % (i, len(todo), e["paper_id"], ex), flush=True)


if __name__ == "__main__":
    main()
