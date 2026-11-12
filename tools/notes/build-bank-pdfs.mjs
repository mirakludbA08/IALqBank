/* Builds the ready-made question bank PDFs: for every topic (Unit > Topic) of a subject, one PDF
   of all its questions and one of their mark schemes, and the same for every whole Unit. A topic's
   PDF has a contents list and is in sections by the year of the paper, newest first, each starting
   on a new page under a banner, then a last section of the AI practice questions (those predicted
   for the next exams first); a Unit's PDF has the same inside each topic, with a bigger banner
   starting each topic. They are made by the question bank's own PDF code (js/topicbank.js,
   window.IALQB_BANK) in headless Chrome, so they look like "Select for download", and the
   questions PDFs have the same lines to write on under each question that needs a written answer.

   The PDFs go to OUT/<subject>/ (default D:/claude-scratch/ialqbank/bankpdf) to be uploaded to the
   GitHub release bank-<subject>; data/bank-pdfs-<subject>.json lists them for the question bank.

   Run from this folder after the bank data changes:
     node build-bank-pdfs.mjs                 every subject
     node build-bank-pdfs.mjs physics         one subject
     PREVIEW=1 node build-bank-pdfs.mjs ...   also copy them to bank-pdfs-preview/ (git-ignored), which
                                              the question bank reads on 127.0.0.1 / localhost
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
// Chrome keeps its profile and cache on D: (CHROME_PROFILE to change it), not in the user's temp
// folder on C:, which a big PDF run can fill.
const PROFILE = process.env.CHROME_PROFILE || 'D:/tmp/ialq-chrome-profile';
fs.mkdirSync(PROFILE, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0, userDataDir: PROFILE,
  args: ['--disk-cache-dir=' + PROFILE + '/cache']
});
let page = null;
async function newPage() {
  if (page) await page.close().catch(() => {});
  page = await browser.newPage();
  // The ready-made PDFs are made without ads or other outside requests except the PDF library.
  await page.setRequestInterception(true);
  page.on('request', (r) => (/googlesyndication|doubleclick|googleadservices/.test(r.url()) ? r.abort() : r.continue()));
}
await newPage();
// A long run in one page can run it out of memory (a big Unit PDF is hundreds of megabytes of
// pictures), so a fresh page is opened every few PDFs, and a PDF that has not come back in
// PDF_TIMEOUT_MS is tried again in a new page.
const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS || 420000);
let currentSubject = null;
let made = 0;
async function openBank() {
  await page.goto(base + 'questions.html?s=' + currentSubject, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => window.IALQB_BANK, { timeout: 60000 });
}
async function makePdf(kind, ids, heading, group) {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await newPage();
    if (attempt > 0 || made % 6 === 0) await openBank();
    made++;
    const job = page.evaluate((k, i, h, g) => window.IALQB_BANK.pdf(k, i, h, g, true), kind, ids, heading, group).catch((e) => { console.log('error:', String(e).slice(0, 120)); return null; });
    const uri = await Promise.race([job, new Promise((r) => setTimeout(() => r(null), PDF_TIMEOUT_MS))]);
    if (uri) return uri;
    console.log('error: the PDF (' + heading + ', ' + kind + ') did not come back; opening a new page and trying again');
  }
  throw new Error('could not build ' + heading);
}

for (const subject of SUBJECTS) {
  const outDir = path.join(OUT, subject);
  fs.mkdirSync(outDir, { recursive: true });
  currentSubject = subject;
  await openBank();
  made = 0;
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
      const uri = await makePdf(kind, t.ids, heading, 'year');
      const file = stem + (kind === 'qp' ? '-questions' : '-mark-scheme') + '.pdf';
      fs.writeFileSync(path.join(outDir, file), Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64'));
      const bytes = fs.statSync(path.join(outDir, file)).size;
      entry[kind] = { file, bytes };
      console.log(subject, file, t.ids.length + ' questions', (bytes / 1048576).toFixed(1) + ' MB', ((Date.now() - started) / 1000).toFixed(0) + ' s');
    }
    manifest.topics[key] = entry;
  }
  // One PDF per Unit, with a divider between its topics (and between the spec points in each).
  const units = new Map();
  all.forEach((it) => {
    if (!units.has(it.path[0])) units.set(it.path[0], []);
    units.get(it.path[0]).push(it.id);
  });
  manifest.units = {};
  for (const [unitName, ids] of units) {
    const unit = (/^Unit (\S+)/.exec(unitName) || [])[1];
    const heading = unitName;
    const stem = slug(subject + '-' + (unit ? 'unit-' + unit : unitName));
    const entry = { n: ids.length };
    for (const kind of ['qp', 'ms']) {
      const started = Date.now();
      const uri = await makePdf(kind, ids, heading, 'topic-year');
      const file = stem + (kind === 'qp' ? '-questions' : '-mark-scheme') + '.pdf';
      fs.writeFileSync(path.join(outDir, file), Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64'));
      const bytes = fs.statSync(path.join(outDir, file)).size;
      entry[kind] = { file, bytes };
      console.log(subject, file, ids.length + ' questions', (bytes / 1048576).toFixed(1) + ' MB', ((Date.now() - started) / 1000).toFixed(0) + ' s');
    }
    manifest.units[unitName] = entry;
  }
  if (process.env.PREVIEW) {
    const prev = path.join(ROOT, 'bank-pdfs-preview', 'bank-' + subject);
    fs.mkdirSync(prev, { recursive: true });
    for (const f of fs.readdirSync(outDir)) if (f.endsWith('.pdf')) fs.copyFileSync(path.join(outDir, f), path.join(prev, f));
  }
  fs.writeFileSync(path.join(ROOT, 'data', 'bank-pdfs-' + subject + '.json'), JSON.stringify(manifest, null, 1) + '\n');
  console.log(subject + ': ' + topics.size + ' topics, ' + units.size + ' units');
}
await browser.close();
server.close();
