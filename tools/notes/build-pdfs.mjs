/* Builds the downloadable PDF of every notes page: pdf/<subject>/<page>.pdf.

   Each page is opened in the installed Chrome (or Edge), MathJax is allowed to
   finish, the page's own beforeprint handler opens every solution, and the print
   styles in css/styles.css leave out the sidebar and the interactive diagrams.

   It then joins each unit's topic PDFs, in the order js/sitemap.js lists them, into one PDF per
   unit: pdf/<subject>/unit-1.pdf, ..., units-3-6.pdf (the notes sidebar and home page link to them).

   Run from this folder:
     npm install
     node build-pdfs.mjs              every page, then the unit PDFs
     node build-pdfs.mjs Waves        only pages whose file name contains "Waves", then the unit PDFs
     node build-pdfs.mjs --units      only the unit PDFs, from the topic PDFs already built
   Set CHROME to the browser's path if it is not in the usual place. MathJax is
   loaded from its CDN, so this needs an internet connection. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';
import { PDFDocument } from 'pdf-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find((p) => fs.existsSync(p));

// [folder of the notes pages, subject]; the PDFs go in pdf/<subject>/.
const SOURCES = [['pages', 'physics'], ['notes/chemistry', 'chemistry'], ['notes/biology', 'biology']];
const unitsOnly = process.argv[2] === '--units';
const only = unitsOnly ? null : process.argv[2];

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

if (!unitsOnly) {
if (!CHROME) throw new Error('Chrome not found: set CHROME to its path.');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'light' },
  { name: 'prefers-reduced-motion', value: 'reduce' }
]);
await page.setViewport({ width: 1100, height: 1400 });
// No ads in the PDFs: the ad script is not loaded.
await page.setRequestInterception(true);
page.on('request', (req) => (/googlesyndication|doubleclick|googleadservices/.test(req.url()) ? req.abort() : req.continue()));

let made = 0;
for (const [dir, subject] of SOURCES) {
  const outDir = path.join(ROOT, 'pdf', subject);
  fs.mkdirSync(outDir, { recursive: true });
  const files = fs.readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.html') && f !== 'index.html' && (!only || f.includes(only)));
  for (const file of files) {
    await page.goto(pathToFileURL(path.join(ROOT, dir, file)).href, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.evaluate(async () => {
      if (window.MathJax && MathJax.startup && MathJax.startup.promise) await MathJax.startup.promise;
      await document.fonts.ready;
      window.dispatchEvent(new Event('beforeprint'));
    });
    const title = (await page.title()).replace(/ · .*$/, '');
    const label = subject[0].toUpperCase() + subject.slice(1) + ' notes';
    const out = path.join(outDir, file.replace(/\.html$/, '.pdf'));
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate:
        '<div style="width:100%;margin:0 14mm;display:flex;justify-content:space-between;font:8px sans-serif;color:#777">' +
        '<span>' + esc(title) + ' · ' + label + ' · IAL Prep</span>' +
        '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
    });
    made++;
    console.log(path.relative(ROOT, out), Math.round(fs.statSync(out).size / 1024) + ' KB');
  }
}
await browser.close();
console.log(made + ' PDFs');
}

/* One PDF per unit, from its topic PDFs. The file name comes from the unit's label in
   js/sitemap.js ("Unit 1" -> unit-1.pdf, "Units 3 & 6" -> units-3-6.pdf); js/script.js uses
   the same rule for its links. */
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js', 'sitemap.js'), 'utf8'), sandbox);
const unitFile = (g) => g.unit.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
let units = 0;
for (const [, subject] of SOURCES) {
  for (const g of sandbox.window.IALQB_SITE[subject].notes || []) {
    if (!g.pages.length) continue;
    const doc = await PDFDocument.create();
    for (const [file] of g.pages) {
      const src = await PDFDocument.load(fs.readFileSync(path.join(ROOT, 'pdf', subject, file.replace(/\.html$/, '.pdf'))));
      (await doc.copyPages(src, src.getPageIndices())).forEach((p) => doc.addPage(p));
    }
    const label = subject[0].toUpperCase() + subject.slice(1);
    doc.setTitle(label + ' notes: ' + g.unit + ', ' + g.name + ' · IAL Prep');
    doc.setAuthor('IAL Prep');
    const out = path.join(ROOT, 'pdf', subject, unitFile(g));
    fs.writeFileSync(out, await doc.save());
    units++;
    console.log(path.relative(ROOT, out), doc.getPageCount() + ' pages', Math.round(fs.statSync(out).size / 1024) + ' KB');
  }
}
console.log(units + ' unit PDFs');
