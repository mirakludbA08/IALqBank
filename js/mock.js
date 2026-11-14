/* IAL Prep mock papers: the mock paper maker on the past papers page.

   js/mock-pick.js chooses the questions; this file makes them into a paper and a mark scheme, as
   PDFs, in the browser, and keeps them.

   The paper is laid out like a real one: each question's screenshots are joined into the whole
   question once through (data/mock-<subject>.json says which rows of which pictures) at the
   full width of the page, renumbered, and run on page after page, breaking in the white space
   between lines. The mark scheme gives each question the rows of the Pearson mark scheme.

   A mock stays until the Delete button beside it is pressed. The list is kept in localStorage,
   and the two PDFs in IndexedDB, both in this browser. If a browser clears the PDFs to make room,
   the list still knows the questions, so the PDFs can be made again. */
(function () {
  'use strict';

  const box = document.getElementById('mock');
  if (!box) return;

  const params = new URLSearchParams(location.search);
  const SUBJECT_LABELS = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', maths: 'Maths' };
  const subject = SUBJECT_LABELS[params.get('s')] ? params.get('s') : 'physics';
  const label = SUBJECT_LABELS[subject];
  // What a candidate is given with the paper, which a mock cannot print.
  const SHEETS = {
    physics: 'You will need the List of data, formulae and relationships (it is at the back of any past paper).',
    chemistry: 'You will need a Periodic Table (it is at the back of any past paper).',
    biology: 'A calculator may be used.',
    maths: 'You will need the Mathematical Formulae and Statistical Tables booklet.'
  };
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const FILE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4 16h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MONTHS = { Jan: 'January', Feb: 'February', May: 'May/June', Jun: 'May/June', Oct: 'October', Nov: 'November' };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const pause = () => new Promise((r) => setTimeout(r));   // lets the page repaint between steps
  const mb = (bytes) => (bytes / 1048576 < 0.95 ? Math.max(0.1, bytes / 1048576).toFixed(1) : Math.round(bytes / 1048576)) + ' MB';
  const timeWords = (m) => {
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return (h ? h + (h === 1 ? ' hour' : ' hours') : '') + (h && rest ? ' ' : '') + (rest ? rest + ' minutes' : '');
  };

  /* ---------- The list of mocks, and their PDFs ---------- */
  const KEY = 'ialqb_mocks_' + subject;
  let mocks = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  })();
  const saveList = () => {
    try { localStorage.setItem(KEY, JSON.stringify(mocks)); } catch (e) { /* storage blocked: the list lasts until the page is closed */ }
  };
  // The report's topics with its own shares, beside each one's share in the mock counted the same
  // way: out of the marks on the Unit's own topics, not those it shares with other Units.
  const topicShares = (m) => {
    const own = m.topics.filter((t) => t.report != null);
    const all = own.reduce((n, t) => n + t.got, 0) || 1;
    return own.map((t) => [t.name, t.report.toFixed(1) + '%', (100 * t.got / all).toFixed(1) + '%']);
  };
  const blobs = new Map();      // the PDFs seen so far on this visit
  const urls = new Map();       // blob: addresses given to the download links

  let dbOpen = null;
  function db() {
    if (!dbOpen) {
      dbOpen = new Promise((resolve, reject) => {
        const r = indexedDB.open('ialqb_mocks', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('pdfs');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    return dbOpen;
  }
  function pdfStore(mode, work) {
    return db().then((d) => new Promise((resolve, reject) => {
      const t = d.transaction('pdfs', mode);
      const req = work(t.objectStore('pdfs'));
      t.oncomplete = () => resolve(req.result);
      t.onerror = t.onabort = () => reject(t.error);
    }));
  }
  function putPdf(key, blob) {
    blobs.set(key, blob);
    return pdfStore('readwrite', (s) => s.put(blob, key)).catch(() => { /* no room or blocked: it lasts until the page is closed */ });
  }
  function getPdf(key) {
    if (blobs.has(key)) return Promise.resolve(blobs.get(key));
    return pdfStore('readonly', (s) => s.get(key)).then((b) => { if (b) blobs.set(key, b); return b; }).catch(() => null);
  }
  function dropPdf(key) {
    blobs.delete(key);
    if (urls.has(key)) { URL.revokeObjectURL(urls.get(key)); urls.delete(key); }
    return pdfStore('readwrite', (s) => s.delete(key)).catch(() => {});
  }

  /* ---------- Pictures ---------- */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('a picture could not be loaded (' + src.split('/').pop() + ')'));
      im.src = src;
    });
  }
  function loadJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = JSPDF_URL;
      s.onload = () => (window.jspdf && window.jspdf.jsPDF ? resolve() : reject(new Error('the PDF maker did not start')));
      s.onerror = () => reject(new Error('the PDF maker could not be downloaded; check the connection'));
      document.head.appendChild(s);
    });
  }

  /* ---------- Laying out pages ----------
     An A4 page at 150 dots to the inch. The screenshots are of whole pages, 760 pixels wide, so at
     the full width of the page they are the size they were printed. */
  const PAGE_W = 1240;
  const PAGE_H = 1754;
  const S = PAGE_W / 760;
  const TOP = 56;
  const BOTTOM = PAGE_H - 96;
  const SERIF = '"Times New Roman", Times, "Liberation Serif", serif';
  const SANS = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const pointsToPx = (pt) => pt * 150 / 72;

  function book(footer) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    let y = TOP;
    let used = false;
    let pages = 0;
    const blank = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, PAGE_W, PAGE_H);
      y = TOP;
      used = false;
    };
    function flush() {
      pages++;
      ctx.fillStyle = '#555';
      ctx.textBaseline = 'alphabetic';
      ctx.font = pointsToPx(8.5) + 'px ' + SANS;
      ctx.textAlign = 'left';
      ctx.fillText(footer, 96, PAGE_H - 44);
      ctx.textAlign = 'right';
      ctx.fillText('Page ' + pages, PAGE_W - 96, PAGE_H - 44);
      ctx.textAlign = 'left';
      if (pages > 1) doc.addPage();
      doc.addImage(canvas.toDataURL('image/jpeg', 0.8), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      blank();
    }
    function wrap(text, font, width) {
      ctx.font = font;
      const out = [];
      String(text).split('\n').forEach((para) => {
        let line = '';
        para.split(/\s+/).filter(Boolean).forEach((word) => {
          const next = line ? line + ' ' + word : word;
          if (ctx.measureText(next).width <= width || !line) line = next;
          else { out.push(line); line = word; }
        });
        out.push(line);
      });
      return out;
    }
    /* The lowest row at or above "limit" to break a picture on: a clear band of white over the
       writing area. A figure has white inside it too, so with text set, the band must also have
       writing start at the left margin straight under it: a line of text or an answer line.
       Figures sit further in. Returns null if there is no such row. */
    function breakRow(picture, from, limit, low, text) {
      const g = picture.getContext('2d', { willReadFrequently: true });
      const x = Math.round(picture.width * low);
      const w = Math.round(picture.width * (1 - 2 * low));
      const start = Math.max(from + 60, limit - 560);
      const h = Math.min(limit + 60, picture.height) - start;
      if (h < 12 || w < 10) return null;
      const px = g.getImageData(x, start, w, h).data;
      const inkInRow = (row, end) => {
        let dark = 0;
        for (let i = row * w * 4; i < row * w * 4 + end * 4; i += 8) if (px[i] < 150) dark++;
        return dark * 2;
      };
      const margin = Math.round(w * 0.2);
      let run = 0;
      for (let row = Math.min(limit - start, h) - 1; row >= 0; row--) {
        if (inkInRow(row, w) <= w * 0.012) run++; else run = 0;
        if (run < 7) continue;
        const under = row + run;
        if (!text) return start + row + 3;
        for (let r = under; r < Math.min(h, under + 50); r++) {
          if (inkInRow(r, w) > w * 0.012) {
            if (inkInRow(r, margin) || inkInRow(r + 4 < h ? r + 4 : r, margin)) return start + row + 3;
            break;
          }
        }
      }
      return null;
    }
    blank();
    return {
      get space() { return BOTTOM - y; },
      nextPage() { if (used) flush(); },
      gap(px) { y += px; },
      need(h) { if (used && y + h > BOTTOM) flush(); },
      // One or more lines of text. o: pt, font, bold, color, align ('left', 'center', 'right'), x, width, after.
      text(str, o) {
        o = o || {};
        const size = pointsToPx(o.pt || 11);
        const font = (o.bold ? '700 ' : '400 ') + size + 'px ' + (o.font || SANS);
        const width = o.width || PAGE_W - 2 * (o.x || 96);
        const x = o.x || 96;
        const lh = Math.round(size * (o.leading || 1.32));
        wrap(str, font, width).forEach((ln) => {
          this.need(lh);
          ctx.font = font;
          ctx.fillStyle = o.color || '#111';
          ctx.textBaseline = 'alphabetic';
          ctx.textAlign = o.align || 'left';
          ctx.fillText(ln, o.align === 'center' ? PAGE_W / 2 : o.align === 'right' ? x + width : x, y + size);
          ctx.textAlign = 'left';
          y += lh;
          used = true;
        });
        y += o.after || 0;
      },
      rule(color) {
        ctx.fillStyle = color || '#b9c2cf';
        ctx.fillRect(96, y, PAGE_W - 192, 2);
        y += 2;
        used = true;
      },
      field(name, x, w) {
        const size = pointsToPx(10.5);
        ctx.fillStyle = '#111';
        ctx.font = '400 ' + size + 'px ' + SANS;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(name, x, y + size);
        const nw = ctx.measureText(name).width + 12;
        ctx.fillStyle = '#555';
        ctx.fillRect(x + nw, y + size + 4, w - nw, 2);
        used = true;
      },
      // Rows of a table. cols: [{x, w, align}]; rows: arrays of strings, the first is the header.
      table(cols, rows, o) {
        o = o || {};
        const size = pointsToPx(o.pt || 9.5);
        rows.forEach((cells, r) => {
          const font = (r === 0 ? '700 ' : '400 ') + size + 'px ' + SANS;
          const lines = cells.map((c, i) => wrap(c, font, cols[i].w - 10));
          const lh = Math.round(size * 1.3);
          const h = Math.max.apply(null, lines.map((l) => l.length)) * lh + 10;
          this.need(h);
          if (r === 0) { ctx.fillStyle = '#e6eaf1'; ctx.fillRect(96, y, PAGE_W - 192, h); }
          ctx.fillStyle = '#111';
          ctx.font = font;
          ctx.textBaseline = 'alphabetic';
          lines.forEach((ls, i) => {
            ctx.textAlign = cols[i].align || 'left';
            const x = cols[i].align === 'right' ? cols[i].x + cols[i].w - 6 : cols[i].x + 6;
            ls.forEach((ln, k) => ctx.fillText(ln, x, y + 5 + size + k * lh));
          });
          ctx.textAlign = 'left';
          y += h;
          ctx.fillStyle = '#cfd6e0';
          ctx.fillRect(96, y - 1, PAGE_W - 192, 1);
          used = true;
        });
      },
      /* A picture (a canvas) across the page. keep: do not break it, unless it is taller than a page.
         A long one carries on over the page, breaking at a row breakRow likes; if there is none
         it moves to a fresh page, which gives a tall figure the best chance of staying whole. x, low and table: where it sits
         on the page, how much of each side to ignore when looking for white, and that it is a
         table, which can break at any white row. */
      picture(p, o) {
        o = o || {};
        const x = o.x || 0;
        const w = o.w || PAGE_W;
        const k = w / p.width;
        const H = p.height * k;
        const page = BOTTOM - TOP;
        const low = o.low == null ? 0.12 : o.low;
        if (used && y + H > BOTTOM && (o.keep || H < page * 0.3 || this.space < 200) && H <= page) flush();
        let from = 0;      // rows of the picture drawn so far
        while (from < p.height - 0.5) {
          const room = (BOTTOM - y) / k;
          let to = p.height;
          if (from + room < p.height) {
            const limit = Math.floor(from + room);
            let at = breakRow(p, from, limit, low, !o.table);
            if (!at && used) { flush(); continue; }
            if (!at) at = breakRow(p, from, limit, low, false);
            to = at || limit;
          }
          ctx.drawImage(p, 0, from, p.width, to - from, x, y, w, (to - from) * k);
          y += (to - from) * k;
          from = to;
          used = true;
          if (from < p.height - 0.5) flush();
        }
      },
      finish() {
        if (used || !pages) flush();
        return doc.output('blob');
      }
    };
  }

  function typeOf(style, size) {
    return (style & 1 ? '700 ' : '400 ') + size + 'px ' + (style & 2 ? SANS : SERIF);
  }

  /* An AI predicted question's picture has no answer lines (it is also what the question bank shows):
     q.L says where each part's answer space goes, [top, lines, left], in 760ths of the page width.
     Science papers get dotted lines; Maths papers leave blank space, as the real ones do. */
  const LINE = 28;
  function answerSpace(g, top, gap) {
    if (subject === 'maths') return;
    g.save();
    g.strokeStyle = '#444';
    g.lineWidth = Math.max(1, 0.8 * S);
    g.setLineDash([1.2 * S, 2.8 * S]);
    for (let i = 1; i <= gap[1]; i++) {
      const yy = Math.round((top + i * LINE - 6) * S) + 0.5;
      g.beginPath();
      g.moveTo(gap[2] * S, yy);
      g.lineTo(702 * S, yy);
      g.stroke();
    }
    g.restore();
  }

  // The whole question once through, from the rows of its screenshots, under its new number.
  async function questionPicture(q, number) {
    const gaps = q.L || [];
    const height = q.g.reduce((t, f) => t + f[1].reduce((u, r) => u + r[1] - r[0], 0), 0) +
      gaps.reduce((t, l) => t + l[1] * LINE, 0);
    const c = document.createElement('canvas');
    c.width = PAGE_W;
    c.height = Math.ceil(height * S);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    let y = 0;
    for (const f of q.g) {
      const im = await loadImage('img/' + subject + '/' + f[0]);
      // Rows are in 760ths of the page width: the real screenshots are 760 pixels wide, an AI
      // question's picture is wider (sharper), so its rows are scaled to its pixels.
      const px = im.naturalWidth / 760;
      const draw = (a, b) => {
        g.drawImage(im, 0, a * px, im.naturalWidth, (b - a) * px, 0, y * S, PAGE_W, (b - a) * S);
        y += b - a;
      };
      f[1].forEach((r) => {
        let from = r[0];
        gaps.filter((l) => l[0] > r[0] && l[0] <= r[1]).forEach((l) => {
          draw(from, l[0]);
          answerSpace(g, y, l);
          y += l[1] * LINE;
          from = l[0];
        });
        draw(from, r[1]);
      });
    }
    const paint = (x0, top, x1, h) => { g.fillStyle = '#fff'; g.fillRect((x0 - 2) * S, (top - 2) * S, (x1 - x0 + 4) * S, (h + 4) * S); g.fillStyle = '#000'; };
    g.textBaseline = 'alphabetic';
    const n = q.n;
    paint(n[0], n[1], n[2], n[3]);
    g.font = typeOf(n[5], n[4] * S);
    g.fillText(number + n[6], n[0] * S, (n[1] + n[3] * 0.8) * S);
    const t = q.t;
    if (t) {
      const top = height - t[1];
      paint(t[0], top, t[2], t[3]);
      g.font = typeOf(t[5], t[4] * S);
      g.textAlign = 'right';
      g.fillText(t[6].replace('{n}', number), t[2] * S, (top + t[3] * 0.8) * S);
      g.textAlign = 'left';
    }
    if (q.qb) {
      const b = q.qb;
      const top = height - b[1];
      paint(b[0], top, b[2], b[3]);
      g.font = typeOf(1, b[4] * S);
      g.fillText('Q' + number, b[0] * S, (top + b[3] * 0.8) * S);
    }
    return c;
  }

  // A heading from the real paper the mock is shaped on: "SECTION B", the instructions.
  async function headingPicture(h) {
    const im = await loadImage('img/' + subject + '/' + h[0]);
    const k = PAGE_W / im.naturalWidth;
    const c = document.createElement('canvas');
    c.width = PAGE_W;
    c.height = Math.ceil((h[2] - h[1]) * k);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, 0, h[1], im.naturalWidth, h[2] - h[1], 0, 0, PAGE_W, c.height);
    return c;
  }

  const sectionOf = (k) => k.replace('m', '');

  async function buildPaper(m, slots, say) {
    await loadJsPdf();
    const b = book('IAL Prep mock ' + m.id + ' · ' + label + ' ' + m.code);
    // The cover.
    b.gap(40);
    b.text('IAL Prep', { pt: 13, bold: true, color: '#333', after: 6 });
    b.text('Mock paper', { pt: 36, bold: true, color: '#111', after: 18 });
    b.rule('#111');
    b.gap(26);
    b.text(label, { pt: 20, bold: true, after: 4 });
    b.text(m.unit, { pt: 16, after: 6 });
    b.text('Unit code ' + m.code + ' · Mock ' + m.id + (m.src === 'ai' ? ' · AI predicted questions' : ''), { pt: 11, color: '#444', after: 34 });
    b.text('Time: ' + timeWords(m.minutes), { pt: 14, bold: true, after: 4 });
    b.text('Total marks: ' + m.marks, { pt: 14, bold: true, after: 40 });
    b.field('Name', 96, 640);
    b.field('Date', 770, 374);
    b.gap(70);
    b.text('Instructions', { pt: 13, bold: true, after: 8 });
    ['Use black ink or ball-point pen.', 'Answer all the questions.', 'Answer in the spaces provided; use extra paper where there is not enough room, and label your answers clearly.', 'Show your working where a calculation is asked for.', 'Where a question mentions an answer book, or a diagram to complete in one, there is none with this mock: answer on your own paper.']
      .forEach((t) => b.text('•  ' + t, { pt: 11.5, after: 5 }));
    b.gap(20);
    b.text('Information', { pt: 13, bold: true, after: 8 });
    ['The total mark for this paper is ' + m.marks + '.', 'The marks for each question are shown in brackets.', SHEETS[subject]]
      .forEach((t) => b.text('•  ' + t, { pt: 11.5, after: 5 }));
    b.gap(50);
    b.rule();
    b.gap(14);
    b.text(m.src === 'ai'
      ? 'Made by IAL Prep for revision. The questions are new: written by AI in the Edexcel style and predicted for the next exams, then laid out in the shape of the real paper ' + m.frame.replace('_', ' ') + '. This is not a Pearson paper and is not published or endorsed by Pearson. The mark scheme is a separate file.'
      : 'Made by IAL Prep for revision, from real Pearson Edexcel past-paper questions. The questions are renumbered and mixed from different papers. This is not a Pearson paper and is not published or endorsed by Pearson. The mark scheme is a separate file.', { pt: 9.5, color: '#444' });
    b.nextPage();

    const pickedMarks = {};
    slots.forEach((s) => { const k = sectionOf(s.k); pickedMarks[k] = (pickedMarks[k] || 0) + s.m; });
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      say('Building the paper: question ' + (i + 1) + ' of ' + slots.length);
      const q = await questionPicture(s.q, i + 1);
      if (s.h) {
        const h = await headingPicture(s.h);
        b.need(h.height + Math.min(q.height, 400));    // a heading stays with the start of its question
        b.picture(h, { keep: true });
      }
      b.picture(q, { keep: s.m <= 2 });
      b.gap(14);
      const here = sectionOf(s.k);
      const next = slots[i + 1] ? sectionOf(slots[i + 1].k) : null;
      if (here && here !== next) b.text('TOTAL FOR SECTION ' + here + ' = ' + pickedMarks[here] + ' MARKS', { pt: 11, bold: true, font: SERIF, align: 'right', after: 14 });
      await pause();
    }
    b.gap(10);
    b.text('TOTAL FOR PAPER = ' + m.marks + ' MARKS', { pt: 11, bold: true, font: SERIF, align: 'right' });
    return b.finish();
  }

  // Each sheet of a paper's mark scheme is big: keep only the last few in memory.
  const sheets = new Map();
  function sheet(src) {
    if (!sheets.has(src)) {
      sheets.set(src, loadImage(src));
      while (sheets.size > 5) {
        const oldest = sheets.keys().next().value;
        const gone = sheets.get(oldest);
        sheets.delete(oldest);
        gone.then((im) => { im.src = ''; }).catch(() => {});
      }
    }
    return sheets.get(src);
  }

  // A question's rows of the real mark scheme, with the header row over them once. An AI question's
  // mark scheme is one picture on a sheet of them (q.ms: sheet, top, height, width).
  async function schemePicture(q) {
    if (q.ai) {
      const im = await sheet('img/ms/' + subject + '/ai/' + q.ms[0]);
      const c = document.createElement('canvas');
      c.width = q.ms[3];
      c.height = q.ms[2];
      const g = c.getContext('2d', { willReadFrequently: true });
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, q.ms[1], q.ms[3], q.ms[2], 0, 0, q.ms[3], q.ms[2]);
      return c;
    }
    const parts = [];
    for (let r = 0; r < q.ms.length; r++) {
      const row = q.ms[r];
      const im = await sheet('img/ms/' + subject + '/' + q.p + '-' + row[0] + '.webp');
      if (!parts.length && row[5]) parts.push({ im: im, y: row[4], h: row[5], w: row[3] });
      parts.push({ im: im, y: row[1], h: row[2], w: row[3] });
    }
    const width = Math.max.apply(null, parts.map((p) => p.w));
    const c = document.createElement('canvas');
    c.width = width;
    c.height = parts.reduce((t, p) => t + p.h, 0);
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = '#fff';
    g.fillRect(0, 0, c.width, c.height);
    let y = 0;
    parts.forEach((p) => { g.drawImage(p.im, 0, p.y, p.w, p.h, 0, y, p.w, p.h); y += p.h; });
    return trimFoot(c);
  }

  // The last question of a paper picks up what is printed under the table at the end of the mark
  // scheme (Pearson's address): stop at the table's bottom edge.
  function trimFoot(c) {
    const g = c.getContext('2d', { willReadFrequently: true });
    const look = Math.min(c.height, 260);
    const top = c.height - look;
    const px = g.getImageData(0, top, c.width, look).data;
    for (let row = look - 1; row >= 0; row--) {
      let dark = 0;
      for (let i = row * c.width * 4; i < (row + 1) * c.width * 4; i += 8) if (px[i] < 170) dark++;
      if (dark * 2 > c.width * 0.6) {
        if (row >= look - 8) return c;      // the table runs to the end: nothing under it
        const out = document.createElement('canvas');
        out.width = c.width;
        out.height = top + row + 3;
        out.getContext('2d', { willReadFrequently: true }).drawImage(c, 0, 0);
        return out;
      }
    }
    return c;
  }

  const fromWords = (q) => (q.ai ? 'AI predicted question, spec point ' + q.sp
    : q.p.split('_')[0] + ' ' + (MONTHS[q.mo] || q.mo) + ' ' + q.y + ', Question ' + q.q);
  const topicWords = (q, cats) => q.c.slice().sort((a, b) => b[1] - a[1]).map((c) => cats[c[0]] ? cats[c[0]][0] : '').filter(Boolean).slice(0, 2).join('; ');

  async function buildScheme(m, slots, cats, say) {
    await loadJsPdf();
    const b = book('IAL Prep mock ' + m.id + ' mark scheme · ' + label + ' ' + m.code);
    b.text('Mock paper mark scheme', { pt: 24, bold: true, after: 6 });
    b.text(label + ' · ' + m.unit + ' · Mock ' + m.id, { pt: 12.5, after: 4 });
    b.text(m.marks + ' marks · ' + timeWords(m.minutes) + ' · the layout follows the real paper ' + m.frame.replace('_', ' '), { pt: 10.5, color: '#444', after: 18 });
    b.text(m.src === 'ai'
      ? 'Each question below has a mark scheme written for IAL Prep in the Edexcel layout: it is not a Pearson mark scheme. Its parts, (a), (b)(i) and so on, are those of the question numbered above it.'
      : 'Each question below has the rows of the Pearson mark scheme for the paper it came from, where it has its original question number.', { pt: 10.5, after: 14 });
    b.text('Where each question came from', { pt: 13, bold: true, after: 8 });
    const W = PAGE_W - 192;
    b.table([{ x: 96, w: 70 }, { x: 166, w: 80, align: 'right' }, { x: 246, w: W - 570 }, { x: W - 324 + 96 + 0, w: 420 }],
      [['Q', 'Marks', 'Topic', 'From']].concat(slots.map((s, i) => [String(i + 1), String(s.m), topicWords(s.q, cats), fromWords(s.q)])));
    b.gap(26);
    b.text('Marks by topic, against the study report', { pt: 13, bold: true, after: 8 });
    b.table([{ x: 96, w: W - 340 }, { x: W - 244, w: 170, align: 'right' }, { x: W - 74, w: 170, align: 'right' }],
      [['Topic', 'Study report', 'This mock']].concat(topicShares(m)));
    b.nextPage();
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      say('Building the mark scheme: question ' + (i + 1) + ' of ' + slots.length);
      const pic = await schemePicture(s.q);
      const shown = pic.height * (PAGE_W - 192) / pic.width;
      const small = shown < 520;
      b.need(90 + (small ? shown : 300));    // the heading stays with the start of its table
      b.text('Question ' + (i + 1) + ' (' + s.m + (s.m === 1 ? ' mark)' : ' marks)'), { pt: 13, bold: true, after: 2 });
      b.text('From ' + fromWords(s.q) + ' · ' + topicWords(s.q, cats), { pt: 9.5, color: '#444', after: 8 });
      b.picture(pic, { x: 96, w: PAGE_W - 192, low: 0.02, keep: small, table: true });
      b.gap(30);
      await pause();
    }
    return b.finish();
  }

  /* ---------- Making a mock ---------- */
  let data = null;
  function loadData() {
    if (data) return Promise.resolve(data);
    return fetch('data/mock-' + subject + '.json', { cache: 'no-cache' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((json) => { data = json; return json; });
  }

  /* The "AI predicted questions only" setting: data/mock-ai-<subject>.json (tools/pipeline/
     export_predicted.py) has, for the units that have them, questions written for the next exams in
     the same form as the real ones. A mock of them keeps the real unit's topics, study-report shares
     and paper shapes, using only the shapes the AI questions can fill. */
  let aiData = null;
  const aiLoad = fetch('data/mock-ai-' + subject + '.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
    .then((json) => { aiData = json && json.units ? json : { units: [] }; return aiData; });
  const aiUnits = new Map();
  function aiUnit(real) {
    if (aiUnits.has(real.code)) return aiUnits.get(real.code);
    const ai = aiData && aiData.units.find((u) => u.code === real.code);
    let unit = null;
    if (ai) {
      const names = real.cats.map((c) => c[0]);
      const topicOf = (name) => (names.indexOf(name) >= 0 ? names.indexOf(name) : names.indexOf('Other'));
      const qs = ai.qs.map((q) => Object.assign({}, q, { c: q.c.map((c) => [topicOf(c[0]), c[1]]).filter((c) => c[0] >= 0) }));
      const have = new Map();
      qs.forEach((q) => have.set(q.k + '|' + q.m, (have.get(q.k + '|' + q.m) || 0) + 1));
      const frames = real.frames.filter((f) => {
        const need = new Map();
        f.slots.forEach((s) => need.set(s.k + '|' + s.m, (need.get(s.k + '|' + s.m) || 0) + 1));
        return [...need].every(([key, n]) => (have.get(key) || 0) >= n);
      });
      unit = Object.assign({}, real, { qs: qs, frames: frames });
    }
    aiUnits.set(real.code, unit);
    return unit;
  }
  // The unit to choose from: the real one, or its AI questions.
  async function unitFor(code, src) {
    const json = await loadData();
    const real = json.units.find((u) => u.code === code);
    if (!real) throw new Error('this unit has no questions for a mock yet');
    if (src !== 'ai') return real;
    await aiLoad;
    const unit = aiUnit(real);
    if (!unit) throw new Error('this unit has no AI predicted questions yet');
    if (!unit.frames.length) throw new Error('there are not yet enough AI predicted questions to fill a paper of this unit');
    return unit;
  }

  let busy = false;
  const status = (text, bad) => {
    const s = $('#mk-status');
    s.hidden = !text;
    s.textContent = text || '';
    s.classList.toggle('is-bad', !!bad);
  };
  const setBusy = (on) => {
    busy = on;
    box.classList.toggle('is-busy', on);   // a thin moving bar under the status line (css/papers.css)
    $('#mk-make').disabled = on;
    box.querySelectorAll('.mk-remake, .mk-del').forEach((b) => { b.disabled = on; });
  };

  async function makePdfs(m, slots, cats) {
    const paper = await buildPaper(m, slots, status);
    const scheme = await buildScheme(m, slots, cats, status);
    await putPdf(m.id + '|qp', paper);
    await putPdf(m.id + '|ms', scheme);
  }

  async function make() {
    if (busy) return;
    setBusy(true);
    try {
      status('Choosing the questions…');
      await pause();
      const code = $('#mk-unit').value;
      const src = srcBox.hidden ? '' : $('#mk-src').value;
      const unit = await unitFor(code, src);
      const word = new Uint32Array(1);
      crypto.getRandomValues(word);
      const seed = word[0];
      const avoid = [].concat(...mocks.filter((x) => x.code === code).map((x) => x.qs));
      const picked = window.IALQB_MOCK_PICK.pick(unit, seed, avoid);
      const slots = picked.slots;
      const opt = $('#mk-unit').selectedOptions[0];
      const m = {
        id: seed.toString(36).toUpperCase().padStart(5, '0').slice(-5), code: code, unit: opt ? opt.textContent : unit.name,
        marks: picked.marks, minutes: picked.minutes, frame: picked.frame, qs: slots.map((s) => s.q.i), topics: picked.topics, made: Date.now()
      };
      if (src === 'ai') m.src = 'ai';
      await makePdfs(m, slots, unit.cats);
      mocks.unshift(m);
      saveList();
      status('');
      renderList();
    } catch (err) {
      status('The mock could not be made: ' + err.message + '.', true);
    } finally {
      setBusy(false);
    }
  }

  // The browser cleared the PDFs: make them again from the questions the list remembers.
  async function remake(m) {
    if (busy) return;
    setBusy(true);
    try {
      status('Making the PDFs again…');
      const unit = await unitFor(m.code, m.src);
      const byId = new Map(unit.qs.map((q) => [q.i, q]));
      const frame = (await loadData()).units.find((u) => u.code === m.code).frames.find((f) => f.paper === m.frame);
      const slots = m.qs.map((id, i) => {
        const q = byId.get(id);
        if (!q || !frame) throw new Error('a question in this mock is no longer in the bank');
        return { k: frame.slots[i].k, m: frame.slots[i].m, h: frame.slots[i].h, q: q };
      });
      await makePdfs(m, slots, unit.cats);
      status('');
      renderList();
    } catch (err) {
      status('The PDFs could not be made again: ' + err.message + '.', true);
    } finally {
      setBusy(false);
    }
  }

  function remove(m) {
    if (busy) return;
    mocks = mocks.filter((x) => x.id !== m.id);
    saveList();
    dropPdf(m.id + '|qp');
    dropPdf(m.id + '|ms');
    renderList();
  }

  function downloadLink(m, kind, blob) {
    const key = m.id + '|' + kind;
    if (!urls.has(key)) urls.set(key, URL.createObjectURL(blob));
    const a = el('a', 'ctl-btn mk-dl' + (kind === 'ms' ? ' is-ms' : ' ctl-btn-solid'));
    a.innerHTML = FILE_ICON;
    a.append(kind === 'ms' ? 'Mark scheme PDF' : 'Paper PDF', el('small', null, mb(blob.size)));
    a.href = urls.get(key);
    a.download = label + ' ' + m.code + (m.src === 'ai' ? ' AI' : '') + ' mock ' + m.id + (kind === 'ms' ? ' mark scheme' : '') + '.pdf';
    return a;
  }

  function topicsTable(m) {
    const d = el('details', 'mk-topics');
    d.appendChild(el('summary', null, 'Topics against the study report'));
    const t = el('table');
    const head = el('tr');
    ['Topic', 'Study report', 'This mock'].forEach((x) => head.appendChild(el('th', null, x)));
    t.appendChild(head);
    topicShares(m).forEach((x) => {
      const r = el('tr');
      x.forEach((cell) => r.appendChild(el('td', null, cell)));
      t.appendChild(r);
    });
    d.appendChild(t);
    return d;
  }

  function renderList() {
    const list = $('#mk-list');
    list.textContent = '';
    list.hidden = !mocks.length;
    $('#mk-note').hidden = !mocks.length;
    mocks.forEach((m) => {
      const li = el('li', 'mk-row');
      const info = el('div', 'mk-info');
      const name = el('strong', 'mk-name');
      name.append(el('span', null, m.unit), el('span', 'mk-id', 'mock ' + m.id));
      info.appendChild(name);
      const when = new Date(m.made).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      // Each fact its own piece, spaced by the layout rather than by dots.
      const meta = el('span', 'mk-meta');
      [m.marks + ' marks', timeWords(m.minutes), m.qs.length + ' questions' + (m.src === 'ai' ? ' (AI predicted)' : ''), 'made ' + when]
        .forEach((x) => meta.appendChild(el('span', null, x)));
      info.appendChild(meta);
      info.appendChild(topicsTable(m));
      const acts = el('div', 'mk-actions');
      const del = el('button', 'ctl-btn mk-del', 'Delete');
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete mock ' + m.id);
      del.addEventListener('click', () => remove(m));
      acts.appendChild(del);
      li.append(info, acts);
      list.appendChild(li);
      Promise.all([getPdf(m.id + '|qp'), getPdf(m.id + '|ms')]).then(([qp, ms]) => {
        if (qp && ms) {
          acts.insertBefore(downloadLink(m, 'qp', qp), del);
          acts.insertBefore(downloadLink(m, 'ms', ms), del);
        } else {
          const again = el('button', 'ctl-btn mk-remake', 'Make the PDFs again');
          again.type = 'button';
          again.addEventListener('click', () => remake(m));
          acts.insertBefore(again, del);
        }
      });
    });
  }

  /* The Unit menu lists every unit, or with "AI predicted questions only" the units that have them.
     The choice of questions is remembered in this browser. */
  const KEY_SRC = 'ialqb_mock_src';
  const srcBox = $('#mk-src-field');
  let allUnits = [];
  function fillUnits() {
    const select = $('#mk-unit');
    const before = select.value || params.get('unit');
    const ai = !srcBox.hidden && $('#mk-src').value === 'ai';
    const codes = new Set((aiData ? aiData.units : []).map((u) => u.code));
    const shown = ai ? allUnits.filter((u) => codes.has(u.code)) : allUnits;
    select.textContent = '';
    shown.forEach((u) => {
      const o = el('option', null, u.label);
      o.value = u.code;
      select.appendChild(o);
    });
    if (before && shown.some((u) => u.code === before)) select.value = before;
    const note = $('#mk-src-note');
    note.hidden = !ai;
    if (ai) note.textContent = 'New questions written by AI in the Edexcel style and predicted for the next exams, laid out in the shape of a real paper, with a mark scheme written for IAL Prep. Ready so far for ' + shown.map((u) => u.label.split(':')[0]).join(', ') + '.';
  }
  $('#mk-src').addEventListener('change', () => {
    try { localStorage.setItem(KEY_SRC, $('#mk-src').value); } catch (err) { /* storage blocked */ }
    fillUnits();
  });

  // js/papers.js says which units there are once its list has loaded.
  window.addEventListener('ialqb-units', (e) => {
    allUnits = e.detail;
    aiLoad.then(() => {
      const codes = new Set(aiData.units.map((u) => u.code));
      srcBox.hidden = !allUnits.some((u) => codes.has(u.code));
      // AI predicted questions to start with, unless this browser chose real ones before, or the
      // address asks for a unit (or real questions) that the AI questions do not cover.
      let saved = null;
      try { saved = localStorage.getItem(KEY_SRC); } catch (err) { /* storage blocked */ }
      if (params.get('src') === 'ai' || params.get('src') === 'real') saved = params.get('src') === 'ai' ? 'ai' : '';
      else if (params.get('unit') && !codes.has(params.get('unit'))) saved = '';
      $('#mk-src').value = saved !== '' && !srcBox.hidden ? 'ai' : '';
      fillUnits();
      $('#mk-report').href = 'report?s=' + subject;
      box.hidden = false;
      renderList();
    });
  });
  $('#mk-make').addEventListener('click', make);
})();
