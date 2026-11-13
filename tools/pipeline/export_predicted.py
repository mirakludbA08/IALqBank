"""Adds predicted question banks (predicted-bank/<Subject>/<UNIT>/<UNIT>.json, written for the next
series by tools in D:/IALqBank_D/predicted-bank) to the site, as AI practice questions in the
question bank and as the questions of the mock paper maker's "AI predicted questions" setting.

  python -E export_predicted.py <unit_dir> [<unit_dir> ...]
  e.g. python -E export_predicted.py D:/IALqBank_D/predicted-bank/Physics/WPH14

For each unit it writes
  img/<subject>/ai/<uid>.webp           every question as a picture in the look of a real paper,
                                        without its number, and without answer lines (the mock
                                        paper maker adds the number and the answer space)
  img/ms/<subject>/ai/<UNIT>-<k>.webp   the questions' mark schemes, in the Edexcel table layout,
                                        packed a few dozen to a picture (to keep the file count down)
  data/ai-<subject>.json                the unit's questions as AI items ("pred": true), replacing
                                        the ones from an earlier run; the older AI items stay
  data/mock-ai-<subject>.json           the unit's questions for the mock paper maker
The pictures are taken in headless Chrome by tools/notes/shoot-predicted.mjs.
"""
import collections
import html
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image

SITE = Path(__file__).resolve().parents[2]
PRED = Path(os.environ.get("PREDICTED_BANK", "D:/IALqBank_D/predicted-bank"))
sys.path.insert(0, str(PRED / "tools"))
import build as pb  # noqa: E402  (the predicted bank's own text formatting: bold, sub/superscripts, LaTeX)

_plain_fmt = pb._fmt_plain
# "4 × 10⁻¹⁴ m" stays on one line.
pb._fmt_plain = lambda s: re.sub(r"(\d) × (?=\d)", "\\1\u00a0×\u00a0", _plain_fmt(s))

WORK = Path(os.environ.get("EXPORT_WORK", "D:/tmp/predicted-export"))
Q_SCALE = 1.5        # question pictures: 760 CSS px wide -> 1140 px
MS_SCALE = 1.25      # mark scheme pictures: 950 px
SHEET_MAX = 12000    # tallest mark scheme picture, in pixels
NUM_X = 50           # where the mock paper maker writes the question number (CSS px)
KATEX = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist"
SUBJECT_DIR = {"physics": "Physics", "chemistry": "Chemistry", "biology": "Biology", "maths": "Maths"}
MATHS_LABEL = {"WMA11": "P1", "WMA12": "P2", "WMA13": "P3", "WMA14": "P4", "WFM01": "FP1", "WFM02": "FP2",
               "WFM03": "FP3", "WME01": "M1", "WME02": "M2", "WME03": "M3", "WST01": "S1", "WST02": "S2",
               "WST03": "S3", "WDM11": "D1"}

Q_CSS = """
html,body{margin:0;background:#fff}
body{width:760px;color:#000;font:15px/1.42 "Times New Roman",Times,"Liberation Serif",serif}
section.q{box-sizing:border-box;width:760px;padding:20px 58px 18px 80px;position:relative;overflow:hidden;background:#fff}
p{margin:0 0 8px}
p.bul{margin:0 0 4px;padding-left:18px;text-indent:-14px}
.stem{margin:0 0 4px}
.fig{margin:8px 0 12px;text-align:center}
.fig img{max-width:100%;max-height:340px}
table.data{border-collapse:collapse;margin:8px auto 12px;font-size:14px}
table.data caption{caption-side:top;font-size:13.5px;margin-bottom:4px}
table.data th,table.data td{border:1px solid #000;padding:4px 10px;text-align:center}
table.data th{font-weight:700}
.opts{margin:8px 0 2px}
.opt{display:flex;align-items:baseline;gap:12px;margin:0 0 8px}
.opt .box{flex:none;width:12px;height:12px;border:1.3px solid #000;position:relative;top:2px}
.opt .ol{flex:none;font-weight:700;width:12px}
.part{display:flex;margin:14px 0 0}
.part.sub{padding-left:34px}
.plab{flex:none;width:34px}
.ptext{flex:1;min-width:0}
.ptext>p:last-of-type{margin-bottom:0}
.pm{text-align:right;font-weight:700;margin-top:6px}
.ls{height:0}
.total{text-align:right;font-weight:700;margin-top:16px}
.katex{font-size:1.04em}
.katex-display{margin:6px 0}
"""

MS_CSS = """
html,body{margin:0;background:#fff}
body{width:760px;color:#000;font:12.5px/1.4 Arial,Helvetica,sans-serif}
section.q{width:760px;background:#fff}
table.ms{width:760px;border-collapse:collapse;table-layout:fixed}
table.ms th{background:#d9d9d9;font-weight:700;text-align:left;border:1px solid #000;padding:5px 6px}
table.ms td{border:1px solid #000;padding:5px 6px;vertical-align:top}
td.ml{font-weight:700}
td.mk{text-align:center;font-weight:700}
.mp{display:flex;gap:8px;margin:0 0 3px}
.mp .t{flex:1}
.mp .m{flex:none;font-weight:700}
.note{font-style:italic;margin-top:4px}
.ans{font-weight:700;margin-top:4px}
.key{font-weight:700;margin-bottom:4px}
.katex{font-size:1.02em}
"""

MS_COLS = {
    "physics": [("Question Number", 86), ("Answer", None), ("Mark", 52)],
    "chemistry": [("Question Number", 80), ("Answer", 330), ("Additional guidance", None), ("Mark", 50)],
    "biology": [("Question Number", 80), ("Answer", 330), ("Additional guidance", None), ("Mark", 50)],
    "maths": [("Question", 80), ("Scheme", None), ("Marks", 70)],
}


# ---------------------------------------------------------------- text

def paras(s, lead=False):
    """Text -> paragraphs, one per line of the source (bullets "• " get a hanging indent)."""
    out = []
    for i, line in enumerate((s or "").split("\n")):
        if not line.strip():
            continue
        cls = ["bul"] if line.lstrip().startswith("•") else []
        if lead and not out:
            cls.append("lead")
        out.append(f'<p{" class=" + chr(34) + " ".join(cls) + chr(34) if cls else ""}>{pb.fmt(line)}</p>')
    return "".join(out)


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"\*\*|_\{|\^\{|\}", "", s or "")).strip()


def show_label(lab):
    m = re.match(r"^([a-z])(?:\((\w+)\))?$", lab)
    return f"({m.group(1)})" + (f"({m.group(2)})" if m.group(2) else "") if m else lab


def answer_lines(subject, p):
    """How many lines of answer space a part gets in a mock (maths: blank space of the same height)."""
    if not p["marks"] or p.get("options"):
        return 0
    if "lines" in p:
        return p["lines"]
    if subject == "maths":
        return min(18, 3 * p["marks"])
    return min(10, max(2, 2 * p["marks"]))


def figs_html(names):
    return "".join(f'<div class="fig"><img src="fig/{html.escape(n)}.svg"></div>' for n in names or [])


def opts_html(options):
    return '<div class="opts">' + "".join(
        f'<div class="opt"><span class="box"></span><span class="ol">{L}</span><span>{pb.fmt(o)}</span></div>'
        for L, o in zip("ABCD", options)) + "</div>"


# ---------------------------------------------------------------- question and mark scheme pages

def total_text(subject, marks, num):
    word = "mark" if marks == 1 else "marks"
    return f"(Total for {num} {'is' if subject == 'maths' else '='} {marks} {word})"


def question_html(q, subject):
    body = ""
    if q.get("stem"):
        body += f'<div class="stem">{paras(q["stem"], lead=True)}</div>'
    body += figs_html(q.get("figs")) + pb.table_html(q.get("table"))
    if q["kind"] == "mcq":
        body += opts_html(q["options"])
    else:
        prev_letter = None
        single = len(q["parts"]) == 1
        first = not q.get("stem")
        for p in q["parts"]:
            lab = "" if single else show_label(p["label"])
            sub = "(" in p["label"]
            if sub and prev_letter == p["label"][0]:
                lab = lab[3:]           # "(ii)" on its own once "(b)" has been shown
            prev_letter = p["label"][0]
            star = "*" if p.get("star") else ""
            text = re.sub(r"^\s*\*\s*", "", p["text"]) if p.get("star") else p["text"]
            n = answer_lines(subject, p)
            lines = f'<div class="ls" data-n="{n}"></div>' if n else ""
            mk = f'<div class="pm">({p["marks"]})</div>' if p["marks"] else ""
            labcls = "plab lead" if first else "plab"
            first = False
            body += (f'<div class="part{" sub" if sub else ""}"><div class="{labcls}">{star}{lab}</div><div class="ptext">'
                     f'{paras(text)}{pb.table_html(p.get("table"))}{figs_html(p.get("figs"))}'
                     f'{opts_html(p["options"]) if p.get("options") else ""}{lines}{mk}</div></div>')
    tot = total_text(subject, q["marks"], "this question")
    return f'<section class="q" id="{html.escape(q["uid"])}">{body}<div class="total"><span>{tot}</span></div></section>'


def ms_html(q, subject):
    cols = MS_COLS[subject]
    head = "".join(f"<th>{c}</th>" for c, w in cols)
    colgroup = "".join(f'<col style="width:{w}px">' if w else "<col>" for c, w in cols)
    guide = len(cols) == 4
    rows = []
    if q["kind"] == "mcq":
        key = f'<div class="key">The only correct answer is {html.escape(q["answer"])}</div>'
        if guide:
            rows.append(f'<tr><td class="ml"></td><td>{key}</td><td>{pb.fmt(q["ms"])}</td><td class="mk">1</td></tr>')
        else:
            rows.append(f'<tr><td class="ml"></td><td>{key}{pb.fmt(q["ms"])}</td><td class="mk">1</td></tr>')
    single = len(q.get("parts", [])) == 1
    for p in q.get("parts", []):
        if not p["marks"]:
            continue
        lab = "" if single else show_label(p["label"])
        key = f'<div class="key">The only correct answer is {html.escape(p["answer"])}</div>' if p.get("options") else ""
        ans = f'<div class="ans">Answer: {pb.fmt(p["answer"])}</div>' if p.get("answer") and not p.get("options") else ""
        note = pb.fmt(p["ms_note"]) if p.get("ms_note") else ""
        if subject == "maths":
            pts = p["ms"]
            span = len(pts) + 1
            for i, e in enumerate(pts):
                code = e[2] if len(e) > 2 else ("B1" if e[1] == 1 else f"B{e[1]}")
                first = f'<td class="ml" rowspan="{span}">{lab}</td>' if i == 0 else ""
                rows.append(f"<tr>{first}<td>{pb.fmt(e[0])}</td><td class=\"mk\">{html.escape(code)}</td></tr>")
            tail = (f'<div class="note">{note}</div>' if note else "") + ans
            rows.append(f'<tr><td>{tail}</td><td class="mk">({p["marks"]})</td></tr>')
            continue
        pts = "".join(f'<div class="mp"><span class="t">{pb.fmt(e[0])}</span><span class="m">'
                      f'{html.escape(e[2]) if len(e) > 2 else "(" + str(e[1]) + ")"}</span></div>' for e in p["ms"])
        if guide:
            rows.append(f'<tr><td class="ml">{lab}</td><td>{key}{pts}{ans}</td><td>{note}</td>'
                        f'<td class="mk">{p["marks"]}</td></tr>')
        else:
            rows.append(f'<tr><td class="ml">{lab}</td><td>{key}{pts}{"<div class=note>" + note + "</div>" if note else ""}{ans}</td>'
                        f'<td class="mk">{p["marks"]}</td></tr>')
    return (f'<section class="q" id="{html.escape(q["uid"])}"><table class="ms"><colgroup>{colgroup}</colgroup>'
            f'<thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table></section>')


def page(css, sections, base, maths):
    if maths:
        tail = (f'<link rel="stylesheet" href="{KATEX}/katex.min.css"><script src="{KATEX}/katex.min.js"></script>'
                f'<script src="{KATEX}/contrib/auto-render.min.js"></script>'
                '<script>renderMathInElement(document.body,{delimiters:[{left:"$$",right:"$$",display:true},'
                '{left:"$",right:"$",display:false}],throwOnError:false});'
                'document.fonts.ready.then(function(){window.__done=true;});</script>')
    else:
        tail = "<script>document.fonts.ready.then(function(){window.__done=true;});</script>"
    return (f'<!doctype html><html><head><meta charset="utf-8"><base href="{base}"><style>{css}</style></head>'
            f'<body>{"".join(sections)}{tail}</body></html>')


# ---------------------------------------------------------------- where each question goes on the site

def site_paths(subject, unit):
    data = json.loads((SITE / "data" / f"{subject}.json").read_text(encoding="utf-8"))
    head = "Unit " + (MATHS_LABEL[unit] if subject == "maths" else unit[-1]) + " "
    by = collections.defaultdict(collections.Counter)
    for it in data["items"]:
        p = it.get("path")
        if p and not it.get("ai") and p[0].startswith(head):
            by[p[2].split(" - ")[0]][tuple(p)] += 1
    unit_name = next((p[0] for c in by.values() for p in c), None)
    # The site's own wording of each topic: the taxonomy can spell a topic differently
    # ("Topic 15 Organic Chemistry: Carbonyls, ..."), which would make a second topic in the tree.
    site_topics = {t for c in by.values() for p in c for t in [p[1]]}
    squash = lambda t: re.sub(r"[^a-z0-9]", "", t.lower())

    def site_topic(name):
        same = [t for t in site_topics if squash(t) == squash(name)]
        if not same:
            m = re.match(r"^(Topic \d+)\b", name)
            same = [t for t in site_topics if m and re.match(re.escape(m.group(1)) + r"\b", t)]
        return same[0] if len(same) == 1 else name
    tax = {}
    for e in data.get("taxonomy", []):
        code = e["code"]
        if subject == "physics":                 # spec point S82 is the taxonomy's U4.82
            m = re.match(r"^U(\d)\.(\d+)$", code)
            if not m or m.group(1) != unit[-1]:
                continue
            code = "S" + m.group(2)
        tax[code] = e

    def path(code):
        if code in by:
            return list(by[code].most_common(1)[0][0])
        e = tax.get(code)
        if not e or not unit_name:
            raise SystemExit(f"{unit}: spec point {code} is not in the site's taxonomy")
        text = e["text"]
        while True:
            t = re.sub(r"^(understand|know|be able to)\s+", "", text, flags=re.I)
            if t == text:
                break
            text = t
        text = re.sub(r"[^A-Za-z0-9 ,.()'-]", "", text)[:45].strip()
        return [unit_name, site_topic(e["topic"]), code + " - " + text]
    return path


# ---------------------------------------------------------------- export one unit

def export(unit_dir):
    unit_dir = Path(unit_dir).resolve()
    unit = unit_dir.name
    data = json.loads((unit_dir / f"{unit}.json").read_text(encoding="utf-8"))
    subject = data["subject"]
    pb.MATH_ON = subject == "maths"
    qs = data["questions"]
    work = WORK / unit
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    base = unit_dir.as_uri() + "/"
    (work / "q.html").write_text(page(Q_CSS, [question_html(q, subject) for q in qs], base, pb.MATH_ON), encoding="utf-8")
    (work / "ms.html").write_text(page(MS_CSS, [ms_html(q, subject) for q in qs], base, pb.MATH_ON), encoding="utf-8")
    job = {"pages": [{"html": str(work / "q.html"), "out": str(work / "q"), "scale": Q_SCALE},
                     {"html": str(work / "ms.html"), "out": str(work / "ms"), "scale": MS_SCALE}]}
    (work / "job.json").write_text(json.dumps(job), encoding="utf-8")
    subprocess.run(["node", "shoot-predicted.mjs", str(work / "job.json")], cwd=SITE / "tools" / "notes", check=True)
    qm = json.loads((work / "q" / "metrics.json").read_text(encoding="utf-8"))

    # Question pictures.
    qdir = SITE / "img" / subject / "ai"
    qdir.mkdir(parents=True, exist_ok=True)
    for old in qdir.glob(f"{unit}-*.webp"):
        old.unlink()
    for q in qs:
        im = Image.open(work / "q" / f"{q['uid']}.png").convert("RGB")
        im.save(qdir / f"{q['uid']}.webp", "WEBP", quality=80, method=6)

    # Mark schemes, packed into sheets.
    msdir = SITE / "img" / "ms" / subject / "ai"
    msdir.mkdir(parents=True, exist_ok=True)
    for old in msdir.glob(f"{unit}-*.webp"):
        old.unlink()
    sheets, cur, where = [], [], {}
    height = 0
    for q in qs:
        im = Image.open(work / "ms" / f"{q['uid']}.png").convert("RGB")
        if cur and height + im.height > SHEET_MAX:
            sheets.append(cur)
            cur, height = [], 0
        cur.append((q["uid"], im))
        height += im.height
    if cur:
        sheets.append(cur)
    for k, sheet in enumerate(sheets, 1):
        w = max(im.width for _, im in sheet)
        out = Image.new("RGB", (w, sum(im.height for _, im in sheet)), "white")
        y = 0
        for uid, im in sheet:
            out.paste(im, (0, y))
            where[uid] = [f"{unit}-{k}.webp", y, im.height, im.width]
            y += im.height
        out.save(msdir / f"{unit}-{k}.webp", "WEBP", quality=78, method=6)

    # The question bank's AI items. L: where each part's answer lines go in the questions PDF
    # ([top, lines, left] in CSS px of the 760 px picture), as in the mock paper maker.
    path_of = site_paths(subject, unit)
    topic_names = [t["name"] for t in data["topics"]]
    items = []
    for q in qs:
        text = [q.get("stem", "")] + q.get("options", []) + [x for p in q.get("parts", [])
                                                             for x in [p["text"]] + p.get("options", [])]
        ms = [q.get("ms", "")] if q["kind"] == "mcq" else [e[0] for p in q.get("parts", []) for e in p.get("ms", [])]
        items.append({
            "id": "AI-" + q["uid"], "ai": True, "pred": True,
            "name": data["points"][q["spec"]]["name"], "unit": unit, "paper": "AI", "year": 0, "month": "",
            "q": "", "part": None, "marks": q["marks"], "topic": q["spec"], "also": q.get("also", []),
            "path": path_of(q["spec"]),
            "img": f"img/{subject}/ai/{q['uid']}.webp",
            "L": [[round(y, 1), n, round(x, 1)] for y, n, x in qm[q["uid"]]["L"]],
            "msc": ["img/ms/" + subject + "/ai/" + where[q["uid"]][0]] + where[q["uid"]][1:],
            "question": plain(" ".join(text)), "ms": plain(" ".join(ms)),
            "why": q.get("why", ""), "keywords": [q["topic"]],
        })
    ai_file = SITE / "data" / f"ai-{subject}.json"
    ai = json.loads(ai_file.read_text(encoding="utf-8"))
    ai["items"] = [i for i in ai["items"] if not (i.get("pred") and i.get("unit") == unit)] + items
    ai["count"] = len(ai["items"])
    ai["note"] = ("Practice questions written by AI in the Edexcel style, each filed under one spec point. Items with "
                  "\"pred\" are from the predicted question banks (tools/pipeline/export_predicted.py): their question "
                  "and mark scheme are pictures.")
    ai_file.write_text(json.dumps(ai, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # The mock paper maker's questions. Sizes are in CSS px (760 = the width of the page).
    mq = []
    for q in qs:
        m = qm[q["uid"]]
        h = m["h"]
        t = m["t"]
        suffix = "." if subject == "maths" else ""
        mq.append({
            "i": "AI-" + q["uid"], "p": "AI-" + q["uid"], "ai": 1, "m": q["m"], "k": q["k"], "np": q["np"], "pos": q["pos"],
            "g": [[f"ai/{q['uid']}.webp", [[0, h]]]],
            "n": [NUM_X, round(m["n"][0], 1), NUM_X + 22, round(m["n"][1], 1), 15, 1, suffix],
            "t": [round(t[0], 1), round(h - t[1], 1), round(t[2], 1), round(t[3], 1), 15, 1,
                  total_text(subject, q["marks"], "Question {n}")],
            "qb": None,
            "L": [[round(y, 1), n, round(x, 1)] for y, n, x in m["L"]],
            "ms": where[q["uid"]],
            "c": [[topic_names[i], v] for i, v in q["c"]],
            "s": q["s"], "sp": q["spec"],
        })
    mock_file = SITE / "data" / f"mock-ai-{subject}.json"
    mock = json.loads(mock_file.read_text(encoding="utf-8")) if mock_file.exists() else {"subject": subject, "units": []}
    mock["note"] = ("AI predicted questions for the mock paper maker's AI setting (tools/pipeline/export_predicted.py). "
                    "Pictures are in img/<subject>/ (g) and img/ms/<subject>/ (ms: sheet, top, height, width in pixels); "
                    "n, t and L are in CSS px of a 760 px page: where the number and total go, and the answer space "
                    "to add [top, lines, left]. The topics (c) are matched by name to the unit's topics in "
                    "data/mock-<subject>.json, and so are the real papers' shapes the mocks follow.")
    mock["units"] = [u for u in mock["units"] if u["code"] != unit] + [{"code": unit, "name": data["name"], "qs": mq}]
    mock["units"].sort(key=lambda u: u["code"])
    mock_file.write_text(json.dumps(mock, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{unit}: {len(qs)} questions, {len(sheets)} mark scheme sheets")


if __name__ == "__main__":
    for d in sys.argv[1:]:
        export(d)
