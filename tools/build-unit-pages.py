"""Build the subject and unit pages: /physics/, /physics/unit-1 ... /maths/, /maths/p1 ...

These are plain HTML pages, so search engines can read them without running the question bank's
JavaScript. Each unit page names the unit the way students search for it (its paper code, such as
WPH11, and its number and title), lists its topics and spec points with how many past-paper
questions each has, shows the latest questions on each topic, lists every past paper and mark
scheme for the unit, and links into the question bank, notes and papers pages. Each subject page
lists its units. The home page's "Browse by unit" list is written here too.

Everything comes from data/<subject>.json, data/ai-<subject>.json, data/papers-<subject>.json and
js/sitemap.js (units and notes pages). Run from the repository root after the question bank or
past papers change, then rebuild the sitemap:

    python tools/build-unit-pages.py
    python tools/build-sitemap.py
"""
import collections
import html
import io
import json
import os
import re
import subprocess
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from seo_head import tags as preview_tags  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SITE = 'https://ialprep.com/'

SUBJECTS = {
    'physics': {'label': 'Physics', 'prefix': 'WPH1', 'quals': 'International AS (XPH11) and International A Level (YPH11)'},
    'chemistry': {'label': 'Chemistry', 'prefix': 'WCH1', 'quals': 'International AS (XCH11) and International A Level (YCH11)'},
    'biology': {'label': 'Biology', 'prefix': 'WBI1', 'quals': 'International AS (XBI11) and International A Level (YBI11)'},
    'maths': {'label': 'Maths', 'prefix': None, 'quals': 'International A Level Mathematics (YMA01) and Further Mathematics (YFM01)'},
}
MATHS_CODES = {
    'P1': 'WMA11', 'P2': 'WMA12', 'P3': 'WMA13', 'P4': 'WMA14', 'FP1': 'WFM01', 'FP2': 'WFM02', 'FP3': 'WFM03',
    'M1': 'WME01', 'M2': 'WME02', 'M3': 'WME03', 'S1': 'WST01', 'S2': 'WST02', 'S3': 'WST03', 'D1': 'WDM11',
}
MONTH_ORDER = {'Jan': 1, 'Jun': 6, 'Oct': 10}
MONTH_NAME = {'Jan': 'January', 'Jun': 'June', 'Oct': 'October'}
SESSION_NAME = {'Jan': 'January', 'Jun': 'May/June', 'Oct': 'October'}
# Units 3 and 6 are sorted by the stage of a practical rather than by spec point.
PRACTICAL = {
    'planning': 'Planning an experiment',
    'implementation': 'Carrying out experiments and recording results',
    'results': 'Processing and analysing results',
    'analysis': 'Analysing results, drawing conclusions and evaluating',
}

e = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def load(path):
    with io.open(path, encoding='utf-8') as f:
        return json.load(f)


def site_map():
    """js/sitemap.js, read by Node: the units and notes pages of every subject."""
    js = "global.window={};require('./js/sitemap.js');process.stdout.write(JSON.stringify(window.IALQB_SITE))"
    return json.loads(subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True, encoding='utf-8').stdout)


def versions():
    """The ?v= strings the other pages load the shared files with, so all pages share one copy."""
    s = io.open('index.html', encoding='utf-8').read()
    out = {}
    for name in ('css/control.css', 'css/styles.css', 'css/bank.css', 'css/nav.css', 'css/units.css', 'js/theme.js', 'js/motion.js', 'js/sitemap.js', 'js/nav.js', 'js/control.js'):
        m = re.search(re.escape(name) + r'\?v=([^"]+)"', s)
        out[name] = name + ('?v=' + m.group(1) if m else '')
    return out


def natural(code):
    return [int(p) if p.isdigit() else p for p in re.split(r'(\d+)', code or '')]


def spec_order(code):
    """Spec points in specification order; a practical unit's stages in the order they are done."""
    stage = (code or '').split('.')[-1]
    if stage in PRACTICAL:
        return [code.split('.')[0], list(PRACTICAL).index(stage)]
    return natural(code)


def session_key(p):
    return (p['year'], MONTH_ORDER.get(p['month'], 0))


def clean_spec(text):
    """A spec point's wording, shortened to one readable line. The wording was read from the
    specification PDF, so page footers and sub-point letters ("a", "(i)") are taken out."""
    t = re.sub(r'\s+', ' ', text or '').strip()
    t = re.sub(r'\s*Specification Issue.*$', '', t)
    t = re.sub(r'^(?:\((?:[a-z]|[ivx]+)\)|[a-zA-Z])\s+(?=[a-z])', '', t)
    colon = t.find(':')
    if 25 < colon < len(t) - 1:
        t = t[:colon]
    if len(t) > 120:
        t = t[:117].rsplit(' ', 1)[0].rstrip(',;:') + '…'
    return t[:1].upper() + t[1:]


def plural(n, word, many=None):
    return '%s %s' % ('{:,}'.format(n), word if n == 1 else (many or word + 's'))


def qs(path, **params):
    return path + '?' + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)


class Subject:
    def __init__(self, key, site):
        self.key = key
        self.cfg = SUBJECTS[key]
        self.label = self.cfg['label']
        self.site = site[key]
        bank = load('data/%s.json' % key)
        self.items = [it for it in bank['items'] if it.get('path')]
        self.ai = [it for it in load('data/ai-%s.json' % key)['items'] if it.get('path')]
        papers = load('data/papers-%s.json' % key)
        self.release = papers['tag']
        self.papers = papers['papers']
        self.spec = {t['code']: t['text'] for t in bank['taxonomy']}
        if key == 'physics':   # the bank files physics questions under S<n>, the taxonomy under U<unit>.<n>
            for t in bank['taxonomy']:
                self.spec.setdefault('S' + t['code'].split('.')[-1], t['text'])
        self.notes_spec = self.read_notes()
        self.units = []
        for group in self.site['bank']:
            for u in group['units']:
                ukey, name = u[0], u[1]
                level = u[2] if len(u) > 2 else None
                code = MATHS_CODES[ukey] if key == 'maths' else self.cfg['prefix'] + ukey
                self.units.append(Unit(self, ukey, name, level, group['name'], code))

    def read_notes(self):
        """{spec number: (heading, link)} from the notes pages, whose sections are headed by spec
        point ('<h2 ... id="sp-17"><span class="spec-badge"><small>Spec</small>17</span>Work done')."""
        out = {}
        for g in self.site.get('notes') or []:
            for p in g['pages']:
                path = (self.site.get('notesDir') or '') + p[0]
                if not os.path.exists(path):
                    continue
                page = re.sub(r'\.html$', '', path)
                for m in re.finditer(r'<h2[^>]*\sid="([^"]+)"><span class="spec-badge"><small>Spec</small>([^<]+)</span>(.*?)</h2>',
                                     io.open(path, encoding='utf-8').read(), re.S):
                    title = html.unescape(re.sub(r'<[^>]+>', '', m.group(3))).strip()
                    out.setdefault(m.group(2).strip(), (title, page + '#' + m.group(1)))
        return out

    def spec_label(self, topic, path2):
        """(code to show, wording, notes link or None) for one spec point."""
        if topic and '.' in topic and topic.split('.')[-1] in PRACTICAL and topic.startswith('P'):
            return None, PRACTICAL[topic.split('.')[-1]], None
        # Physics S17, Chemistry C2.4 and Biology B1.20 are Spec 17, 2.4 and 1.20 in the notes.
        notes = self.notes_spec.get(topic[1:]) if topic else None
        if notes:
            return topic, notes[0], notes[1]
        text = self.spec.get(topic) or (path2.split(' - ', 1)[1] if ' - ' in path2 else path2)
        return topic, clean_spec(text), None

    def sessions(self):
        return sorted(self.papers, key=session_key)


class Unit:
    def __init__(self, subject, key, name, level, group, code):
        self.s, self.key, self.name, self.level, self.group, self.code = subject, key, name, level, group, code
        maths = subject.key == 'maths'
        self.slug = key.lower() if maths else 'unit-' + key
        self.short = key if maths else 'Unit ' + key           # "Unit 1", "P1"
        self.title = '%s: %s' % (self.short, name)                # "Unit 1: Mechanics and Materials"
        match = re.compile(r'^Unit ' + re.escape(key) + r'\b')
        self.items = [it for it in subject.items if match.match(it['path'][0])]
        self.ai = [it for it in subject.ai if match.match(it['path'][0])]
        roots = collections.Counter(it['path'][0] for it in self.items)
        self.root = roots.most_common(1)[0][0] if roots else 'Unit %s %s' % (key, name)
        self.papers = sorted([p for p in subject.papers if p['code'] == code],
                             key=lambda p: (session_key(p), p.get('variant') or ''), reverse=True)
        self.url = '%s%s/%s' % (SITE, subject.key, self.slug)

    @property
    def qual(self):
        if self.s.key == 'maths':
            return 'International A Level'
        return 'International AS' if self.level == 'AS' else 'International A Level'

    def span(self):
        if not self.papers:
            return None
        first, last = self.papers[-1], self.papers[0]
        return '%s %d' % (MONTH_NAME[first['month']], first['year']), '%s %d' % (MONTH_NAME[last['month']], last['year'])

    def topics(self):
        """[(topic name, [(path key, code, label, count)], items)] in specification order."""
        by_topic = collections.OrderedDict()
        for it in self.items:
            by_topic.setdefault(it['path'][1], []).append(it)
        out = []
        for name, its in by_topic.items():
            points = collections.OrderedDict()
            for it in its:
                points.setdefault(it['path'][2], []).append(it)
            rows = []
            for p2, pits in points.items():
                code, label, notes = self.s.spec_label(pits[0]['topic'], p2)
                rows.append((' > '.join([self.root, name, p2]), code, label, len(pits), pits[0]['topic'], notes))
            rows.sort(key=lambda r: spec_order(r[4]))
            out.append((name, rows, its))
        out.sort(key=lambda t: spec_order(t[1][0][4]) if t[1] else [])
        return out


def recent(items, n=3):
    """The latest past-paper questions among these, one per paper."""
    seen, out = set(), []
    for it in sorted(items, key=lambda it: (it['year'], MONTH_ORDER.get(it['month'], 0), -(it.get('q') or 0)), reverse=True):
        if it['paper'] in seen:
            continue
        seen.add(it['paper'])
        out.append(it)
        if len(out) == n:
            break
    return out


def question_ref(it):
    paper = it['paper'].split('_')[0]
    part = '(%s)' % it['part'] if it.get('part') else ''
    return '%s %s %d Q%s%s' % (paper, MONTH_NAME.get(it['month'], it['month']), it['year'], it['q'], part)


# ---------------------------------------------------------------- page shell

def page(depth, title, desc, canonical, crumbs, subject_key, body, v):
    up = '../' * depth
    trail = [{'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': url} for i, (name, url) in enumerate(crumbs)]
    ld = json.dumps({'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': trail}, ensure_ascii=False)
    head = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '    <meta charset="UTF-8">',
        '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '    <title>%s</title>' % e(title),
        '    <link rel="canonical" href="%s">' % canonical,
        '    <meta name="description" content="%s">' % e(desc),
    ]
    out = '\n'.join(head) + '\n' + preview_tags(e(title), e(desc), canonical)
    out += '    <script type="application/ld+json">%s</script>\n' % ld.replace('</', '<\\/')
    out += '\n'.join([
        '    <link rel="icon" href="%sassets/favicon.svg" type="image/svg+xml">' % up,
        '    <link rel="stylesheet" href="%s%s">' % (up, v['css/control.css']),
        '    <link rel="stylesheet" href="%s%s">' % (up, v['css/styles.css']),
        '    <link rel="stylesheet" href="%s%s">' % (up, v['css/bank.css']),
        '    <link rel="stylesheet" href="%s%s">' % (up, v['css/nav.css']),
        '    <link rel="stylesheet" href="%s%s">' % (up, v['css/units.css']),
        '    <script src="%s%s"></script>' % (up, v['js/theme.js']),
        '    <script src="%s%s"></script>' % (up, v['js/motion.js']),
        '    <script src="%s%s" defer></script>' % (up, v['js/sitemap.js']),
        '    <script src="%s%s" defer></script>' % (up, v['js/nav.js']),
        '    <script src="%s%s" defer></script>' % (up, v['js/control.js']),
        '</head>',
        '<!-- Written by tools/build-unit-pages.py from the question bank data. Edit that script, not this file. -->',
        '<body class="bank unit-page" data-subject="%s">' % subject_key,
        '    <main class="up">',
    ]) + '\n'
    # The bar under the site's navigation: a back arrow to the page above, then the trail.
    links = []
    for i, (name, url) in enumerate(crumbs):
        rel = url.replace(SITE, up) or './'
        links.append('<span aria-current="page">%s</span>' % e(name) if i == len(crumbs) - 1 else '<a href="%s">%s</a>' % (e(rel), e(name)))
    back_name, back_url = crumbs[-2]
    out += '        <div class="up-bar ctl-in">\n'
    out += '            <a class="up-back" href="%s" aria-label="Back to %s"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 10H4.5m0 0 5-5m-5 5 5 5"/></svg></a>\n' % (
        e(back_url.replace(SITE, up) or './'), e('the IAL Prep home page' if back_url == SITE else back_name))
    out += '            <nav class="up-crumbs" aria-label="Breadcrumb">%s</nav>\n' % '<span class="up-sep" aria-hidden="true">/</span>'.join(links)
    out += '        </div>\n'
    out += body
    out += '    </main>\n</body>\n</html>\n'
    return out


def stat(n, label):
    """One figure in the row under a page's title: the number large, what it counts under it."""
    return '<div class="up-stat"><dt>%s</dt><dd>%s</dd></div>' % (e(label), '{:,}'.format(n))


def counted(n, word, many=None):
    """The word for n of something, without the number: "question" or "questions"."""
    return word if n == 1 else (many or word + 's')


ARROW = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11.5m0 0-5-5m5 5-5 5"/></svg>'


def button(href, text, solid=False, arrow=False):
    return '<a class="ctl-btn%s" href="%s"><span>%s</span>%s</a>' % (' ctl-btn-solid' if solid else '', e(href), e(text), ARROW if arrow else '')


# ---------------------------------------------------------------- unit page

def unit_page(u, v):
    s = u.s
    up = '../'
    topics = u.topics()
    n_points = sum(len(rows) for _, rows, _ in topics)
    span = u.span()
    title = 'IAL %s %s (%s): past papers and topic questions · IAL Prep' % (s.label, u.short, u.code)
    short_span = tuple(x[:3] + x[x.index(' '):] for x in span) if span else None
    desc = 'Edexcel IAL %s %s (%s) %s: %s by topic with real mark schemes, and every past paper%s.' % (
        s.label, u.short, u.code, u.name, plural(len(u.items), 'past-paper question'),
        (' from %s to %s' % short_span) if short_span else '')

    b = []
    b.append('        <header class="up-hero ctl-in">\n')
    # "Unit 1" in the subject's colour, then the name, which types in as the page comes up.
    b.append('            <h1><span class="up-h1-key">%s</span><span class="up-sr">:</span> <span data-type-in>%s</span></h1>\n' % (e(u.short), e(u.name)))
    b.append('            <p class="up-facts"><span>Edexcel %s %s</span><span class="up-code">%s</span></p>\n' % (e(u.qual), e(s.label), e(u.code)))
    lede = ('%s sorted into %s and %s, each with its real Pearson mark scheme.' % (
        plural(len(u.items), 'past-paper question'), plural(len(topics), 'topic'), plural(n_points, 'spec point')))
    if u.ai:
        lede += ' Also %s written for the site.' % plural(len(u.ai), 'AI practice question')
    b.append('            <p class="up-lede">%s</p>\n' % e(lede))
    b.append('            <div class="up-actions">\n')
    b.append('                %s\n' % button(qs(up + 'questions', s=s.key, unit=u.key), 'Practise %s questions' % u.short, solid=True, arrow=True))
    b.append('                %s\n' % button(qs(up + 'papers', s=s.key, unit=u.code), '%s past papers' % u.short))
    notes = unit_notes(u)
    if notes:
        b.append('                %s\n' % button('#notes', '%s notes' % u.short))
    b.append('            </div>\n')
    n_marks = sum(it.get('marks') or 0 for it in u.items)
    b.append('            <dl class="up-stats">%s%s%s%s</dl>\n' % (
        stat(len(u.items), counted(len(u.items), 'past-paper question')), stat(n_marks, counted(n_marks, 'mark')),
        stat(n_points, counted(n_points, 'spec point')), stat(len(u.papers), counted(len(u.papers), 'past paper'))))
    b.append('        </header>\n\n')

    # Two columns on a wide screen: the topics, and beside them the notes, papers and other units.
    b.append('        <div class="up-layout">\n')
    b.append('        <div class="up-col">\n')
    # Topics and spec points
    b.append('        <section class="up-section ctl-in" aria-labelledby="topics">\n')
    b.append('            <h2 id="topics" class="ctl-label">Topics and spec points</h2>\n')
    b.append('            <p class="up-note">The number beside each spec point is how many past-paper questions test it. Each spec point opens those questions in the question bank, with their mark schemes%s.</p>\n' % (
        '; Notes opens that spec point in the notes' if any(r[5] for _, rows, _ in topics for r in rows) else ''))
    for name, rows, its in topics:
        tkey = ' > '.join([u.root, name])
        b.append('            <article class="up-topic">\n')
        b.append('                <h3><a href="%s">%s</a> <span class="up-count">%s</span></h3>\n' % (
            e(qs(up + 'questions', s=s.key, t=tkey)), e(name), e(plural(len(its), 'question'))))
        b.append('                <ul class="up-points">\n')
        for key, code, label, count, _, notes_href in rows:
            code_html = '<span class="up-pt-code">%s</span> ' % e(code) if code else ''
            notes_html = ('<a class="up-pt-notes" href="%s" aria-label="Notes: %s">Notes</a>' % (e(up + notes_href), e(label))) if notes_href else ''
            b.append('                    <li><a class="up-pt" href="%s">%s<span class="up-pt-text">%s</span></a>%s<span class="up-pt-n" title="%s">%d</span></li>\n' % (
                e(qs(up + 'questions', s=s.key, t=key)), code_html, e(label), notes_html, e(plural(count, 'question')), count))
        b.append('                </ul>\n')
        latest = recent(its)
        if latest:
            b.append('                <h4 class="up-recent-title">Latest questions on %s</h4>\n' % e(name.split(' ', 2)[-1] if name.startswith('Topic ') else name))
            b.append('                <ul class="up-recent">\n')
            for it in latest:
                marks = plural(it.get('marks') or 0, 'mark')
                b.append('                    <li><a href="%s">%s</a> <span class="up-ref"><span>%s</span> <span>%s</span></span>%s</li>\n' % (
                    e(qs(up + 'questions', s=s.key, item=it['id'])), e(it['name']), e(question_ref(it)), e(marks),
                    ('<p>%s</p>' % e(it['how'])) if it.get('how') else ''))
            b.append('                </ul>\n')
        b.append('            </article>\n')
    b.append('        </section>\n')
    b.append('        </div>\n\n')

    b.append('        <div class="up-col up-side">\n')
    if notes:
        b.append('        <section class="up-section ctl-in" aria-labelledby="notes">\n')
        b.append('            <h2 id="notes" class="ctl-label">%s notes</h2>\n' % e(u.short))
        b.append('            <ul class="up-notes">\n')
        for href, name, blurb in notes:
            b.append('                <li><a href="%s"><span class="up-notes-t">%s</span><span class="up-notes-b">%s</span>%s</a></li>\n' % (e(up + href), e(name), e(blurb), ARROW))
        b.append('            </ul>\n')
        b.append('        </section>\n\n')

    # Past papers
    b.append('        <section class="up-section ctl-in" aria-labelledby="papers">\n')
    b.append('            <h2 id="papers" class="ctl-label">%s %s past papers and mark schemes</h2>\n' % (e(u.code), e(u.short)))
    if u.papers:
        b.append('            <p class="up-note">Every %s %s paper on the current specification%s. They open as PDFs to read or save. The <a href="%s">past papers page</a> also keeps a list of the ones you have done, and its mock paper maker builds a new %s paper from past questions.</p>\n' % (
            e(s.label), e(u.short), (', %s to %s' % span) if span else '', e(qs(up + 'papers', s=s.key, unit=u.code)), e(u.short)))
        b.append('            <table class="up-papers">\n')
        b.append('                <thead><tr><th scope="col">Session</th><th scope="col">Question paper</th><th scope="col">Mark scheme</th></tr></thead>\n')
        b.append('                <tbody>\n')
        for p in u.papers:
            label = '%s %d' % (SESSION_NAME.get(p['month'], p['month']), p['year'])
            if p.get('variant'):
                label += ' (paper %s)' % p['variant']
            cells = []
            for kind, word in (('qp', 'Question paper'), ('ms', 'Mark scheme')):
                f = p.get(kind)
                if f and f.get('file'):
                    size = (' <small class="up-size">%.1f MB</small>' % (f['bytes'] / 1048576)) if f.get('bytes') else ''
                    cells.append('<td><a class="ctl-btn up-pdf" href="/paper-pdf/%s/%s" rel="nofollow" target="_blank">PDF<span class="up-sr"> of the %s %s</span>%s</a></td>' % (
                        e(s.release), e(urllib.parse.quote(f['file'])), e(label), e(word.lower()), size))
                else:
                    cells.append('<td class="up-none">Not available</td>')
            b.append('                    <tr><th scope="row">%s</th>%s</tr>\n' % (e(label), ''.join(cells)))
        b.append('                </tbody>\n')
        b.append('            </table>\n')
    else:
        b.append('            <p class="up-note">No papers for this unit yet.</p>\n')
    b.append('        </section>\n\n')

    # The subject's other units
    b.append('        <section class="up-section ctl-in" aria-labelledby="units">\n')
    b.append('            <h2 id="units" class="ctl-label">Other %s units</h2>\n' % e(s.label))
    b.append('            <ul class="up-units">\n')
    for o in s.units:
        if o is u:
            continue
        b.append('                <li><a href="%s"><span class="up-code">%s</span> <span class="up-units-t">%s</span></a></li>\n' % (e(o.slug), e(o.code), e(o.title)))
    b.append('            </ul>\n')
    b.append('            <p class="up-note">See the <a href="./">%s overview</a>, or the <a href="%s">%s study report</a> for what the exam tests most.</p>\n' % (
        e(s.label), e(qs(up + 'report', s=s.key)), e(s.label)))
    b.append('        </section>\n')
    b.append('        </div>\n')
    b.append('        </div>\n')

    crumbs = [('IAL Prep', SITE), (s.label, SITE + s.key + '/'), (u.short, u.url)]
    return page(1, title, desc, u.url, crumbs, s.key, ''.join(b), v)


def unit_notes(u):
    """[(href, title, blurb)] of the notes pages for this unit, from js/sitemap.js."""
    s = u.s.site
    out = []
    for g in s.get('notes') or []:
        codes = [c.strip() for c in g.get('code', '').split('/')]
        if u.code in codes:
            for f, name, blurb in g['pages']:
                href = (s.get('notesDir') or '') + f
                href = re.sub(r'(^|/)index\.html$', r'\1', href)
                out.append((re.sub(r'\.html$', '', href), name, blurb))
    return out


# ---------------------------------------------------------------- subject page

def subject_page(s, v):
    up = '../'
    years = [p['year'] for p in s.papers]
    n_items = sum(len(u.items) for u in s.units)
    n_ai = sum(len(u.ai) for u in s.units)
    title = 'Edexcel IAL %s: past papers, topic questions and notes · IAL Prep' % s.label
    if s.key == 'maths':
        title = 'Edexcel IAL Maths: past papers and topic questions by unit · IAL Prep'
    course = 'Maths and Further Maths' if s.key == 'maths' else s.label
    desc = ('Pearson Edexcel International AS and A Level %s: %s sorted by unit, topic and spec point '
            'with real mark schemes, and every past paper from %d to %d.') % (
        course, plural(n_items, 'past-paper question'), min(years), max(years))

    b = []
    b.append('        <header class="up-hero ctl-in">\n')
    b.append('            <h1 data-type-in>Edexcel IAL %s</h1>\n' % e(s.label))
    b.append('            <p class="up-facts"><span>Pearson Edexcel %s</span></p>\n' % e(s.cfg['quals']))
    lede = '%s sorted by unit, topic and spec point, each with its real Pearson mark scheme, and every past paper and mark scheme from %d to %d.' % (
        plural(n_items, 'past-paper question'), min(years), max(years))
    if n_ai:
        lede += ' Also %s written for the site.' % plural(n_ai, 'AI practice question')
    b.append('            <p class="up-lede">%s</p>\n' % e(lede))
    b.append('            <div class="up-actions">\n')
    b.append('                %s\n' % button(qs(up + 'questions', s=s.key), 'Question bank', solid=True, arrow=True))
    if s.site.get('notesHome'):
        b.append('                %s\n' % button(up + re.sub(r'index\.html$', '', s.site['notesHome']), 'Notes'))
    b.append('                %s\n' % button(qs(up + 'papers', s=s.key), 'Past papers'))
    b.append('                %s\n' % button(qs(up + 'report', s=s.key), 'Study report'))
    b.append('            </div>\n')
    b.append('        </header>\n\n')

    groups = collections.OrderedDict()
    for u in s.units:
        groups.setdefault(u.group, []).append(u)
    for gname, units in groups.items():
        heading = 'Units' if gname == 'Question bank' else gname
        gid = 'units' if gname == 'Question bank' else 'units-' + re.sub(r'\W+', '-', gname.lower())
        b.append('        <section class="up-section ctl-in" aria-labelledby="%s">\n' % gid)
        b.append('            <h2 id="%s" class="ctl-label">%s</h2>\n' % (gid, e(heading)))
        b.append('            <div class="up-unit-grid">\n')
        for u in units:
            span = u.span()
            n_points = sum(len(r) for _, r, _ in u.topics())
            # The panel names the Unit alone: "Unit 1" (with AS or A2 beside it), or "P1" in Maths.
            # Its page has the full name.
            b.append('                <article class="up-unit ctl-panel">\n')
            b.append('                    <span class="ctl-frame" aria-hidden="true"></span>\n')
            b.append('                    <h3><a href="%s">%s</a>%s</h3>\n' % (
                e(u.slug), e(u.short), (' <span class="up-level">%s</span>' % e(u.level)) if u.level else ''))
            b.append('                    <dl class="up-unit-facts">%s%s%s</dl>\n' % (
                stat(len(u.items), counted(len(u.items), 'question')), stat(n_points, counted(n_points, 'spec point')),
                stat(len(u.papers), counted(len(u.papers), 'paper'))))
            if span:
                b.append('                    <p class="up-span">Papers from %s to %s</p>\n' % span)
            b.append('                    <div class="up-unit-links">\n')
            b.append('                        %s\n' % button(u.slug, '%s topics and papers' % u.short, solid=True, arrow=True))
            b.append('                        %s\n' % button(qs(up + 'questions', s=s.key, unit=u.key), 'Practise questions', arrow=True))
            b.append('                    </div>\n')
            b.append('                </article>\n')
        b.append('            </div>\n')
        b.append('        </section>\n\n')

    url = SITE + s.key + '/'
    crumbs = [('IAL Prep', SITE), (s.label, url)]
    return page(1, title, desc, url, crumbs, s.key, ''.join(b), v)


# ---------------------------------------------------------------- home page list

def home_units(subjects):
    out = ['        <!-- units:start (written by tools/build-unit-pages.py) -->',
           '        <section class="landing-units ctl-in" aria-labelledby="units-title">',
           '            <h2 id="units-title" class="ctl-label">Browse by unit</h2>',
           '            <div class="lu-grid">']
    for s in subjects:
        out.append('                <div class="lu-col" data-subject="%s">' % s.key)
        out.append('                    <h3><a href="%s/">%s</a></h3>' % (s.key, e(s.label)))
        out.append('                    <ul>')
        for u in s.units:
            out.append('                        <li><a href="%s/%s"><span class="up-code">%s</span> <span class="lu-name">%s</span></a></li>' % (s.key, u.slug, e(u.code), e(u.title)))
        out.append('                    </ul>')
        out.append('                </div>')
    out += ['            </div>', '        </section>', '        <!-- units:end -->']
    return out


def write(path, text):
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    old = io.open(path, encoding='utf-8').read() if os.path.exists(path) else None
    if old != text:
        io.open(path, 'w', encoding='utf-8', newline='\n').write(text)
        return 1
    return 0


def main():
    v = versions()
    site = site_map()
    subjects = [Subject(k, site) for k in SUBJECTS]
    changed, total = 0, 0
    for s in subjects:
        changed += write('%s/index.html' % s.key, subject_page(s, v))
        total += 1
        for u in s.units:
            if not u.items:
                print('  skipped %s %s: no questions' % (s.key, u.short))
                continue
            changed += write('%s/%s.html' % (s.key, u.slug), unit_page(u, v))
            total += 1

    home = io.open('index.html', encoding='utf-8', newline='').read()
    nl = '\r\n' if '\r\n' in home else '\n'
    block = nl.join(home_units(subjects))
    new = re.sub(r'[ \t]*<!-- units:start.*?<!-- units:end -->', lambda m: block, home, flags=re.S)
    if new != home:
        io.open('index.html', 'w', encoding='utf-8', newline='').write(new)
        changed += 1
    print('%d subject and unit pages, %d files changed' % (total, changed))


if __name__ == '__main__':
    main()
