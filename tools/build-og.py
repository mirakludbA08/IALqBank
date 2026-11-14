"""Make og/: the site as it looked before the Control restyle, for the "CRAZY AIDZ mode" setting.

    python tools/build-og.py           # writes og/ (refuses if og/ already exists)
    python tools/build-og.py --force   # overwrites og/ from the branch again

The old design is kept on the branch `old-design` (the site as it was on 2026-11-14, before the
restyle). This copies its pages, stylesheets and scripts into og/, so /og/questions is the old
question bank, /og/physics/unit-1 the old unit page, and so on. Everything else (pictures, data,
fonts, PDFs) is not copied: _redirects serves /og/img/..., /og/data/... and the rest from the
real folders, so the old pages always show today's questions and papers.

Run it once. og/ was then changed by hand to carry the newer features (the answer spaces, focus
mode, the mark scheme beside the question, back to top, Settings), so --force would undo those.

Each old page is changed only so that it fits under /og/:
- it is kept out of search results (noindex; its canonical address stays the normal page);
- its stylesheet and script versions start again at ?v=og1;
- the few links written from the site's root ("/questions") point into /og/;
- og-extras.css and og-extras.js are added (the features the old pages did not have).
Which design a reader sees is the 'ialqb_style' setting: js/theme.js sends a reader who chose the
old style to /og/, and og/js/theme.js sends everyone else back.
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = 'old-design'
OUT = os.path.join(ROOT, 'og')
SKIP = ('tools/', 'docs/', 'sample-control/', 'bank-pdfs-preview/', 'functions/', 'og/')
PAGES = r'(?:questions|papers|report|privacy|settings|physics|chemistry|biology|maths|notes|pages)'


def git(*args):
    return subprocess.run(['git', '-C', ROOT] + list(args), capture_output=True, check=True).stdout


def fix_html(text):
    # Versions: everything under og/ is new to browsers, so they start again.
    text = re.sub(r'(\.(?:css|js))\?v=[^"\'\s>]+', r'\1?v=og1', text)
    # Links written from the site's root stay in the old design.
    text = re.sub(r'(href|src)="/(css|js)/', r'\1="/og/\2/', text)
    text = re.sub(r'href="/"', 'href="/og/"', text)
    text = re.sub(r'href="/(' + PAGES + r')([/?"])', r'href="/og/\1\2', text)
    # Never in search results: the normal page is the one to find.
    text = re.sub(r'\s*<meta name="robots"[^>]*>', '', text)
    text = re.sub(r'(<head[^>]*>)', r'\1\n    <meta name="robots" content="noindex">', text, count=1)
    # The newer features, in the old look.
    m = re.search(r'<link rel="stylesheet" href="([^"]*?)css/', text)
    prefix = m.group(1) if m else ''
    extra = ('    <link rel="stylesheet" href="%scss/og-extras.css?v=og1">\n'
             '    <script src="%sjs/og-extras.js?v=og1" defer></script>\n' % (prefix, prefix))
    text = text.replace('</head>', extra + '</head>', 1)
    return text


def main():
    if os.path.exists(OUT) and '--force' not in sys.argv:
        sys.exit('og/ is there already (and has been changed by hand). Use --force to overwrite it.')
    names = git('ls-tree', '-r', '--name-only', REF).decode('utf-8').split('\n')
    files = [n for n in names if re.search(r'\.(html|css|js)$', n) and not n.startswith(SKIP)]
    for n in files:
        data = git('show', '%s:%s' % (REF, n))
        if n.endswith('.html'):
            data = fix_html(data.decode('utf-8')).encode('utf-8')
        dest = os.path.join(OUT, n)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'wb') as f:
            f.write(data)
    print('og/: %d files from %s' % (len(files), REF))


if __name__ == '__main__':
    main()
