"""Serve the site locally the way Cloudflare Pages serves ialprep.com.

    python tools/serve.py            # http://127.0.0.1:8771/
    python tools/serve.py 8800       # another port

Unlike `python -m http.server`, this follows the same address rules as the live site, so links
without ".html" work in a local preview:

- /questions serves questions.html, and /questions.html redirects (308) to /questions;
- /pages/ serves pages/index.html, /pages redirects to /pages/, /pages/index.html to /pages/;
- /pages/Motion/ redirects to /pages/Motion;
- an address with no file gets 404.html with status 404;
- /paper-pdf/<release>/<file>.pdf (a Cloudflare Pages Function on the live site) redirects to the
  file on the repository's GitHub releases.
"""
import http.server
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASES = 'https://github.com/mirakludbA08/IALqBank/releases/download/'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def redirect(self, location, code=308):
        self.send_response(code)
        self.send_header('Location', location)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def serve_file(self, rel, status=200):
        full = os.path.join(ROOT, rel)
        with open(full, 'rb') as f:
            body = f.read()
        self.send_response(status)
        self.send_header('Content-Type', self.guess_type(full))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def route(self):
        parts = urllib.parse.urlsplit(self.path)
        path = urllib.parse.unquote(parts.path)
        query = ('?' + parts.query) if parts.query else ''
        if '..' in path.split('/'):
            return self.serve_file('404.html', 404)

        if path.startswith('/paper-pdf/'):
            return self.redirect(RELEASES + path[len('/paper-pdf/'):], 302)

        rel = path.lstrip('/')
        full = os.path.join(ROOT, rel)

        if rel.endswith('index.html'):
            return self.redirect('/' + rel[:-len('index.html')] + query)
        if rel.endswith('.html') and os.path.isfile(full):
            return self.redirect('/' + rel[:-len('.html')] + query)
        if rel == '' or os.path.isdir(full):
            if rel and not rel.endswith('/'):
                return self.redirect('/' + rel + '/' + query)
            if os.path.isfile(os.path.join(full, 'index.html')):
                return self.serve_file(os.path.join(rel, 'index.html'))
            return self.serve_file('404.html', 404)
        if rel.endswith('/') and os.path.isfile(os.path.join(ROOT, rel[:-1] + '.html')):
            return self.redirect('/' + rel[:-1] + query)
        if os.path.isfile(full + '.html'):
            return self.serve_file(rel + '.html')
        if os.path.isfile(full):
            return self.serve_file(rel)
        return self.serve_file('404.html', 404)

    def do_GET(self):
        self.route()

    def do_HEAD(self):
        self.route()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8771
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print('IAL Prep on http://127.0.0.1:%d/ (Ctrl+C to stop)' % port)
    server.serve_forever()
