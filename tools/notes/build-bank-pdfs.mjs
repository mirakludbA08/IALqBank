/* Builds the ready-made question bank PDFs: for every topic (Unit > Topic) of a subject, one PDF
   of all its questions and one of their mark schemes. They are made by the question bank's own
   PDF code (js/topicbank.js, window.IALQB_BANK) in headless Chrome, so they match "Select for
   download" exactly, past-paper questions first and then the AI practice questions.

   The PDFs go to OUT/<subject>/ (default D:/claude-scratch/ialqbank/bankpdf) to be uploaded to the
   GitHub release bank-<subject>; data/bank-pdfs-<subject>.json lists them for the question bank.

   Run from this folder after the bank data changes:
     node build-bank-pdfs.mjs                 every subject
     node build-bank-pdfs.mjs physics         one subject
   then upload, for example:
     gh release upload bank-physics D:/claude-scratch/ialqbank/bankpdf/physics/*.pdf --clobber */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = process.env.OUT || 'D:/claude-scratch/ialqbank/bankpdf';
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find((p) => fs.existsSync(p));
const SUBJECTS = process.argv[2] ? [process.argv[2]] : ['physics', 'chemistry', 'biology', 'maths'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.md': 'text/plain' };

// The site, served from this folder, so the page can load its data and screenshots.
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = 'http://localhost:' + server.address().port + '/';

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, protocolTimeout: 0 });
const page = await browser.newPage();
// The ready-made PDFs are made without ads or other outside requests except the PDF library.
await page.setRequestInterception(true);
page.on('request', (r) => (/googlesyndication|doubleclick|googleadservices/.test(r.url()) ? r.abort() : r.continue()));

for (const subject of SUBJECTS) {
  const outDir = path.join(OUT, subject);
  fs.mkdirSync(outDir, { recursive: true });
  await page.goto(base + 'questions.html?s=' + subject, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.IALQB_BANK, { timeout: 60000 });
  const all = await page.evaluate(() => window.IALQB_BANK.ids());
  const topics = new Map();
  all.forEach((it) => {
    const key = it.path[0] + ' > ' + it.path[1];
    if (!topics.has(key)) topics.set(key, { unit: it.path[0], topic: it.path[1], ids: [] });
    topics.get(key).ids.push(it.id);
  });
  const manifest = { subject, tag: 'bank-' + subject, topics: {} };
  for (const [key, t] of topics) {
    const unit = (/^Unit (\S+)/.exec(t.unit) || [])[1];
    const heading = (unit ? 'Unit ' + unit + ', ' : '') + t.topic.replace(/^Topic \d+\s+/, '');
    const stem = slug(subject + '-' + (unit ? 'unit-' + unit : t.unit) + '-' + t.topic.replace(/^Topic \d+\s+/, ''));
    const entry = { n: t.ids.length };
    for (const kind of ['qp', 'ms']) {
      const started = Date.now();
      const uri = await page.evaluate((k, ids, h) => window.IALQB_BANK.pdf(k, ids, h), kind, t.ids, heading);
      const file = stem + (kind === 'qp' ? '-questions' : '-mark-scheme') + '.pdf';
      fs.writeFileSync(path.join(outDir, file), Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64'));
      const bytes = fs.statSync(path.join(outDir, file)).size;
      entry[kind] = { file, bytes };
      console.log(subject, file, t.ids.length + ' questions', (bytes / 1048576).toFixed(1) + ' MB', ((Date.now() - started) / 1000).toFixed(0) + ' s');
    }
    manifest.topics[key] = entry;
  }
  fs.writeFileSync(path.join(ROOT, 'data', 'bank-pdfs-' + subject + '.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(subject + ': ' + topics.size + ' topics');
}
await browser.close();
server.close();
