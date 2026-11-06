/* Past papers, opened in the browser instead of downloaded straight away.

   The PDFs are assets on the repository's GitHub releases (one per subject), and GitHub sends
   them as attachments, so a browser can only save them. This Cloudflare Pages Function serves
   /paper-pdf/<release>/<file>.pdf from ialprep.com: it fetches the asset from GitHub and passes
   it on as a PDF to show inline, so the browser opens it in its PDF viewer and the reader saves
   it from there (on an iPhone, Share > Save to Files). Each file is kept in Cloudflare's cache
   for a day. */

const REPO = 'https://github.com/mirakludbA08/IALqBank/releases/download/';
const RELEASES = new Set(['papers-physics', 'papers-chemistry', 'papers-biology', 'papers-maths']);
const FILE = /^[A-Za-z0-9_.-]+\.pdf$/;

export async function onRequest(context) {
  const { request, params } = context;
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const parts = Array.isArray(params.path) ? params.path : [];
  if (parts.length !== 2 || !RELEASES.has(parts[0]) || !FILE.test(parts[1])) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const key = new Request(new URL(request.url).origin + '/paper-pdf/' + parts[0] + '/' + parts[1]);
  let res = await cache.match(key);
  if (!res) {
    const upstream = await fetch(REPO + parts[0] + '/' + parts[1], { redirect: 'follow' });
    if (!upstream.ok) return new Response('This paper could not be found.', { status: 404 });
    res = new Response(upstream.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + parts[1] + '"',
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff'
      }
    });
    context.waitUntil(cache.put(key, res.clone()));
  }
  return request.method === 'HEAD' ? new Response(null, { headers: res.headers }) : res;
}
