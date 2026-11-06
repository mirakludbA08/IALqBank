"""Build sitemap.xml and robots.txt for search engines.

Lists every page a student would land on: the home page, each subject's question bank, past
papers and study report, and every notes page. Each page's date is the last commit that changed
it. Run from the repository root after adding or renaming pages:

    python tools/build-sitemap.py
"""
import glob
import io
import os
import subprocess

SITE = 'https://ialprep.com/'
SUBJECTS = ['physics', 'chemistry', 'biology', 'maths']


def changed(path):
    """The date of the last commit that changed this file (YYYY-MM-DD)."""
    out = subprocess.run(['git', 'log', '-1', '--format=%cs', '--', path], capture_output=True, text=True).stdout.strip()
    return out or None


def url(path, query=''):
    rel = path.replace(os.sep, '/')
    # Cloudflare Pages serves pages without ".html" (and redirects the .html address), so the
    # sitemap lists the address a page finally loads at.
    if rel == 'index.html':
        rel = ''
    elif rel.endswith('/index.html'):
        rel = rel[:-len('index.html')]
    elif rel.endswith('.html'):
        rel = rel[:-len('.html')]
    return SITE + rel + query


entries = [(url('index.html'), changed('index.html'), '1.0'), (url('privacy.html'), changed('privacy.html') or None, '0.2')]
for page, priority in (('questions.html', '0.9'), ('papers.html', '0.7'), ('report.html', '0.6')):
    # These pages draw their data from data/; a change there is a change to the page.
    data = {'questions.html': 'data/%s.json', 'papers.html': 'data/papers-%s.json', 'report.html': 'reports'}[page]
    for s in SUBJECTS:
        dates = [d for d in (changed(page), changed(data % s if '%s' in data else data)) if d]
        entries.append((url(page, '?s=' + s), max(dates) if dates else None, priority))
notes = sorted(glob.glob('pages/*.html')) + sorted(glob.glob('notes/*/*.html'))
for page in notes:
    entries.append((url(page), changed(page), '0.8'))

lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for loc, lastmod, priority in entries:
    lines.append('  <url>')
    lines.append('    <loc>%s</loc>' % loc.replace('&', '&amp;'))
    if lastmod:
        lines.append('    <lastmod>%s</lastmod>' % lastmod)
    lines.append('    <priority>%s</priority>' % priority)
    lines.append('  </url>')
lines.append('</urlset>')
io.open('sitemap.xml', 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')

robots = [
    'User-agent: *',
    'Allow: /',
    '# Build scripts and working notes, not pages for students.',
    'Disallow: /tools/',
    'Disallow: /docs/',
    '',
    'Sitemap: ' + SITE + 'sitemap.xml',
]
io.open('robots.txt', 'w', encoding='utf-8', newline='\n').write('\n'.join(robots) + '\n')
print(len(entries), 'pages in sitemap.xml; robots.txt points to', SITE + 'sitemap.xml')
