"""Build the study reports (reports/<Subject> - Exam Study Report.md) from the question bank.

Each report is short and only shows what a student revising wants to know:
  1. how the marks in the 2014 to 2024 papers are shared between the units;
  2. for each unit, its topics as a share of that unit's marks, and the spec points
     worth the most marks in it, with how many years they came up.

Usage, from the repository root:  python tools/reports/build-reports.py
Reads data/<subject>.json and tools/reports/names.json (short names for spec points, and
the grouping of physics S codes into topics). report.html shows the result; spec codes in
the tables link to their questions in the question bank. """
import collections, io, json, re

SUBJECTS = {'physics': 'Physics', 'chemistry': 'Chemistry', 'biology': 'Biology', 'maths': 'Maths'}
TOP_POINTS = 6
EXTRA = json.load(io.open('tools/reports/names.json', encoding='utf-8'))
MATHS_ORDER = ['P1', 'P2', 'P3', 'P4', 'FP1', 'FP2', 'FP3', 'M1', 'M2', 'M3', 'S1', 'S2', 'S3', 'D1']
# Unit names cut short in the bank's topic paths.
FULL = {'Analytical Tec': 'Analytical Techniques'}


def pct(part, whole):
    v = 100.0 * part / whole if whole else 0
    return ('%.1f%%' % v) if v >= 0.05 else '<0.1%'


def short(text):
    """A spec point's wording cut to a short label."""
    t = re.sub(r'^\s*(be able to|know and understand|understand|know|recall|Students should)\s+', '', text.strip(), flags=re.I)
    t = re.split(r'\s*[:;]\s*|\s\(', t)[0]
    if len(t) > 64:
        t = t[:64].rsplit(' ', 1)[0].rstrip(',') + '…'
    return t[:1].upper() + t[1:]


def unit_key(subject, unit):
    m = re.match(r'^Unit (\S+)', unit)
    if not m:
        return (99, unit)
    u = m.group(1)
    if subject == 'maths':
        return (MATHS_ORDER.index(u) if u in MATHS_ORDER else 98, unit)
    return (int(u) if u.isdigit() else 97, unit)


def build(subject):
    label = SUBJECTS[subject]
    data = json.load(io.open('data/%s.json' % subject, encoding='utf-8'))
    items = [i for i in data['items'] if i.get('path')]
    tax = {t['code']: t['text'] for t in data.get('taxonomy', [])}
    if subject == 'physics':
        # The physics topic list uses U codes in order; the bank's S1 to S171 follow the same order.
        tax = {'S%d' % (n + 1): t['text'] for n, t in enumerate(data['taxonomy'])}
    names = EXTRA['names'].get(subject, {})
    group_of = {}
    for name, codes in EXTRA['groups'].get(subject, []):
        for c in codes:
            group_of[c] = name

    def point_name(code, it):
        if code in names:
            n = names[code]
            return n if len(n) <= 70 else short(n)
        if code in tax:
            return short(tax[code])
        return short(re.sub(r'^\S+\s+-\s+', '', it['path'][2]))

    marks = lambda its: sum(i.get('marks') or 0 for i in its)
    papers = len(set(i['paper'] for i in items))
    years = sorted(set(str(i['year']) for i in items))
    total = marks(items)
    by_unit = collections.defaultdict(list)
    for it in items:
        if it['path'][0] != 'Off current spec':
            by_unit[it['path'][0]].append(it)
    units = sorted(by_unit, key=lambda u: unit_key(subject, u))
    unit_title = {}
    for u in units:
        t = u
        for a, b in FULL.items():
            if t.endswith(a):
                t = t[:-len(a)] + b
        unit_title[u] = t

    out = ['# %s - Exam Study Report' % label, '']
    out.append('Where the marks are in %d %s papers from %s to %s. Use it to decide what to revise first.'
               % (papers, label, years[0], years[-1]))
    out += ['', '## 1. Marks by unit', '', '| Unit | Share of all marks |', '|---|---|']
    for u in units:
        out.append('| %s | %s |' % (unit_title[u], pct(marks(by_unit[u]), total)))

    out += ['', '## 2. Topics in each unit', '',
            'Each topic\'s share of its unit\'s marks, then the spec points worth the most marks in that unit. '
            '"Years" is how many of the %d years it came up in.' % len(years)]
    for u in units:
        if u == 'General skills':
            continue
        its = by_unit[u]
        um = marks(its)
        out += ['', '### %s' % unit_title[u], '', '| Topic | Share of this unit |', '|---|---|']
        topics = collections.defaultdict(list)
        for it in its:
            t = group_of.get(it['topic']) or re.sub(r'^Topic \d+\s+', '', it['path'][1])
            topics[t].append(it)
        for t in sorted(topics, key=lambda t: -marks(topics[t])):
            out.append('| %s | %s |' % (t, pct(marks(topics[t]), um)))
        points = collections.defaultdict(list)
        for it in its:
            points[it['topic']].append(it)
        top = sorted(points, key=lambda c: (-marks(points[c]), c))[:TOP_POINTS]
        out += ['', '| Spec point | Share of this unit | Years |', '|---|---|---|']
        for c in top:
            out.append('| %s %s | %s | %d |' % (c, point_name(c, points[c][0]), pct(marks(points[c]), um),
                                               len(set(str(i['year']) for i in points[c]))))
    io.open('reports/%s - Exam Study Report.md' % label, 'w', encoding='utf-8', newline='\n').write('\n'.join(out) + '\n')
    print(label, len(units), 'units', len(out), 'lines')


for s in SUBJECTS:
    build(s)
