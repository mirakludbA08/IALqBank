/* Builds the downloadable PDF of every notes page: pdf/<subject>/<page>.pdf.

   Each page is opened in the installed Chrome (or Edge), MathJax is allowed to
   finish, the page's own beforeprint handler opens every solution, and the print
   styles in css/styles.css leave out the sidebar and the interactive diagrams.

   Run from this folder:
     npm install
     node build-pdfs.mjs              every page
     node build-pdfs.mjs Waves        only pages whose file name contains "Waves"
   Set CHROME to the browser's path if it is not in the usual place. MathJax is
   loaded from its CDN, so this needs an internet connection. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome'
].find((p) => fs.existsSync(p));

// [folder of the notes pages, subject]; the PDFs go in pdf/<subject>/.
const SOURCES = [['pages', 'physics'], ['notes/chemistry', 'chemistry'], ['notes/biology', 'biology']];
const only = process.argv[2];

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

if (!CHROME) throw new Error('Chrome not found: set CHROME to its path.');
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.emulateMediaFeatures([
  { name: 'prefers-color-scheme', value: 'light' },
  { name: 'prefers-reduced-motion', value: 'reduce' }
]);
await page.setViewport({ width: 1100, height: 1400 });

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
        '<span>' + esc(title) + ' · ' + label + ' · IALqBank</span>' +
        '<span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
    });
    made++;
    console.log(path.relative(ROOT, out), Math.round(fs.statSync(out).size / 1024) + ' KB');
  }
}
await browser.close();
console.log(made + ' PDFs');
