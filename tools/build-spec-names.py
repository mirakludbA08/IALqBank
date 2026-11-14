"""Clean spec point names for the question bank's squares and headings.

    python tools/build-spec-names.py

The bank's data keeps each spec point as a short, cut-off form of the specification's wording
("S1 - use the equations for uniformly accelerated m"). This writes data/specnames-<subject>.json,
{"Unit 1 ... > Mechanics > S1 - use the ...": ["S1", "Equations of uniformly accelerated motion",
"pages/Motion#sp-1"]}, with the code, a readable name and the notes section (or null), named the way
the unit pages name them (tools/build-unit-pages.py: the notes' own heading for the spec point when
there is one, otherwise the specification's wording shortened). Run it after the bank data or the
notes change, with tools/build-unit-pages.py.
"""
import importlib.util
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
spec = importlib.util.spec_from_file_location('unit_pages', os.path.join(ROOT, 'tools', 'build-unit-pages.py'))
up = importlib.util.module_from_spec(spec)
sys.modules['unit_pages'] = up
spec.loader.exec_module(up)


def main():
    site = up.site_map()
    for key in up.SUBJECTS:
        s = up.Subject(key, site)
        out = {}
        for it in s.items + s.ai:
            path = it.get('path')
            if not path or len(path) < 3:
                continue
            k = ' > '.join(path)
            if k in out:
                continue
            code, text, notes = s.spec_label(it.get('topic'), path[2])
            if not code:
                code = path[2].split(' - ')[0]
            out[k] = [code, text, notes]
        dest = os.path.join('data', 'specnames-%s.json' % key)
        io.open(dest, 'w', encoding='utf-8', newline='\n').write(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
        print('%s: %d spec points -> %s' % (key, len(out), dest))


if __name__ == '__main__':
    main()
