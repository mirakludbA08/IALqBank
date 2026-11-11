/* Screenshots for the predicted question banks (tools/pipeline/export_predicted.py writes the pages
   and the job file and runs this; it is not run by hand).

   A job is a list of HTML pages. Each page holds <section class="q" id="..."> blocks, 760 CSS px
   wide like a page of a real paper; every block is saved as its own PNG at the page's scale, and
   what the mock paper maker needs to know about it is measured (in CSS px, top of the block = 0):
     n  where the question number goes: the first line of the question  [left, top, height]
     t  the "(Total for ...)" line                                         [left, top, right, height]
     L  where answer space is added: [top, lines, left] for each part with answer lines
   node shoot-predicted.mjs <job.json>   -> writes <out>/<id>.png and <out>/metrics.json per page */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const job = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find((p) => fs.existsSync(p));
const PROFILE = process.env.CHROME_PROFILE || 'D:/tmp/ialq-chrome-profile-pred';
fs.mkdirSync(PROFILE, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, protocolTimeout: 0, userDataDir: PROFILE,
  args: ['--disk-cache-dir=' + PROFILE + '/cache', '--allow-file-access-from-files']
});

for (const pg of job.pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: 760, height: 1200, deviceScaleFactor: pg.scale });
  await page.goto(pathToFileURL(pg.html).href, { waitUntil: 'networkidle0', timeout: 120000 });
  // KaTeX (maths) sets window.__done when it has rendered; other pages set it at once.
  await page.waitForFunction('window.__done === true', { timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('section.q').forEach((sec) => {
      // Whole CSS pixels, so the picture and the measurements agree.
      sec.style.height = '';
      const h = Math.ceil(sec.getBoundingClientRect().height);
      sec.style.height = h + 'px';
      const r = sec.getBoundingClientRect();
      const y = (e) => e.getBoundingClientRect().top - r.top;
      const m = { h: h };
      const lead = sec.querySelector('.lead');
      if (lead) {
        const probe = document.createElement('span');
        probe.textContent = '0';
        lead.insertBefore(probe, lead.firstChild);
        const p = probe.getBoundingClientRect();
        m.n = [p.top - r.top, p.height];
        probe.remove();
      }
      const tot = sec.querySelector('.total span');
      if (tot) { const b = tot.getBoundingClientRect(); m.t = [b.left - r.left, b.top - r.top, b.right - r.left, b.height]; }
      m.L = [...sec.querySelectorAll('.ls')].map((e) => [y(e), +e.dataset.n, e.getBoundingClientRect().left - r.left]);
      out[sec.id] = m;
    });
    return out;
  });
  fs.mkdirSync(pg.out, { recursive: true });
  const secs = await page.$$('section.q');
  for (const s of secs) {
    const id = await s.evaluate((e) => e.id);
    await s.screenshot({ path: path.join(pg.out, id + '.png') });
  }
  fs.writeFileSync(path.join(pg.out, 'metrics.json'), JSON.stringify(metrics));
  console.log('shot', secs.length, 'from', path.basename(pg.html));
  await page.close();
}
await browser.close();
