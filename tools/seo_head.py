"""Link previews for every page: Open Graph and Twitter card tags, made from the page's own
<title>, description and canonical address, so a link shared on WhatsApp, Discord, Reddit or X
shows a card with the title, a line of description and assets/og-image.png.

Run from the repository root after adding or changing pages (tools/build-unit-pages.py runs it
for the pages it writes):

    python tools/seo_head.py

It is safe to run again: the tags it wrote last time are replaced, not added twice.
"""
import glob
import io
import re

SITE = 'https://ialprep.com/'
IMAGE = SITE + 'assets/og-image.png'
SKIP_DIRS = ('tools', 'docs', 'node_modules', 'bank-pdfs-preview', 'reports')
SKIP_FILES = {'404.html'}

OLD = re.compile(r'[ \t]*<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>\r?\n?')
TITLE = re.compile(r'<title>(.*?)</title>', re.S)
DESC = re.compile(r'([ \t]*)<meta\s+name="description"\s+content="([^"]*)"\s*/?>\r?\n?')
CANON = re.compile(r'<link\s+rel="canonical"\s+href="([^"]*)"')


def attr(text):
    return re.sub(r'\s+', ' ', text).strip().replace('"', '&quot;')


def tags(title, desc, url=None, indent='    ', nl='\n'):
    """The <meta> lines for one page, each ending in a newline."""
    title = attr(re.sub(r'\s*·\s*IAL Prep\s*$', '', title)) or 'IAL Prep'
    rows = [
        ('property', 'og:type', 'website'),
        ('property', 'og:site_name', 'IAL Prep'),
        ('property', 'og:title', title),
        ('property', 'og:description', attr(desc)),
    ]
    if url:
        rows.append(('property', 'og:url', url))
    rows += [
        ('property', 'og:image', IMAGE),
        ('property', 'og:image:width', '1200'),
        ('property', 'og:image:height', '630'),
        ('property', 'og:image:alt', 'IAL Prep: Edexcel International AS and A Level revision'),
        ('name', 'twitter:card', 'summary_large_image'),
    ]
    return ''.join('%s<meta %s="%s" content="%s">%s' % (indent, k, n, v, nl) for k, n, v in rows)


def apply(html):
    """The page with its link-preview tags written (or rewritten) after the description."""
    html = OLD.sub('', html)
    t, d = TITLE.search(html), DESC.search(html)
    if not t or not d:
        return html
    c = CANON.search(html)
    nl = '\r\n' if '\r\n' in html[:2000] else '\n'
    block = tags(t.group(1), d.group(2), c.group(1) if c else None, d.group(1), nl)
    return html[:d.end()] + block + html[d.end():]


def pages():
    out = []
    for f in glob.glob('**/*.html', recursive=True):
        f = f.replace('\\', '/')
        if f.split('/')[0] in SKIP_DIRS or f in SKIP_FILES:
            continue
        out.append(f)
    return sorted(out)


def main():
    changed = 0
    for f in pages():
        s = io.open(f, encoding='utf-8', newline='').read()
        t = apply(s)
        if t != s:
            io.open(f, 'w', encoding='utf-8', newline='').write(t)
            changed += 1
    print('link-preview tags written on %d pages' % changed)


if __name__ == '__main__':
    main()
