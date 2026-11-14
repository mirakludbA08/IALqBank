/* IAL Prep — the moving parts of the site's look (css/control.css), shared by every page.
   window.CTL:
     typeIn(node, text, delay)        new words type in behind a cursor
     toast(label, title, sub, icon)   a notification at the top right (bottom on phones)
     placeInk(tablist, flash)         moves a tab list's filled block under its selected tab
     seal(subject)                    draws the subject's seal behind the page
     leave(dir) / enter()             the slide out and in of a change of subject inside a page
   Each page also gets its seal and a Back to top button, and the blocks it marks .ctl-in draw in
   as it comes up.
   Load with defer on every page. */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const SUBJECTS = ['physics', 'chemistry', 'biology', 'maths'];
  const SEAL = {
    physics: 'IAL PREP · PHYSICS · UNITS 1 TO 6 · WPH11 TO WPH16 · ',
    chemistry: 'IAL PREP · CHEMISTRY · UNITS 1 TO 6 · WCH11 TO WCH16 · ',
    biology: 'IAL PREP · BIOLOGY · UNITS 1 TO 6 · WBI11 TO WBI16 · ',
    maths: 'IAL PREP · MATHS · PURE, MECHANICS, STATISTICS, DECISION · ',
    home: 'IAL PREP · EDEXCEL INTERNATIONAL AS AND A LEVEL · '
  };
  const ICON = {
    check: '<path d="m4.5 10.5 3.5 3.5 7.5-8"/>',
    clock: '<circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.5"/>',
    down: '<path d="M10 3.5v9m0 0-3.5-3.5M10 12.5l3.5-3.5M4.5 16h11"/>',
    info: '<circle cx="10" cy="10" r="6.5"/><path d="M10 9v4.5M10 6.5v.5"/>'
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ---------- New words type in ----------
     The full text sits in a hidden copy for screen readers; the letters not yet typed keep their
     place, so nothing below moves. */
  const typing = new WeakMap();
  function typeIn(node, text, delay) {
    if (!node) return;
    const old = typing.get(node);
    if (old) { cancelAnimationFrame(old.raf); clearTimeout(old.t); }
    node.textContent = text;
    if (reduce.matches || !text) return;
    const sr = el('span', 'ctl-sr', text);
    const vis = el('span', 'ctl-typing');
    vis.setAttribute('aria-hidden', 'true');
    const done = el('span', 'ctl-typed');
    const rest = el('span', 'ctl-ghost', text);
    vis.append(done, rest);
    node.textContent = '';
    node.append(sr, vis);
    const per = Math.max(9, Math.min(30, 480 / text.length));
    const start = performance.now() + (delay || 0);
    const job = { raf: 0, t: 0 };
    typing.set(node, job);
    let shown = -1;
    const tick = (now) => {
      const n = Math.max(0, Math.min(text.length, Math.floor((now - start) / per)));
      if (n !== shown) { shown = n; done.textContent = text.slice(0, n); rest.textContent = text.slice(n); }
      if (n < text.length) { job.raf = requestAnimationFrame(tick); return; }
      // The cursor stays a moment at the end of the line, then the plain text takes its place.
      job.t = setTimeout(() => { if (node.contains(vis)) node.textContent = text; }, 420);
    };
    job.raf = requestAnimationFrame(tick);
  }

  /* ---------- Notifications ---------- */
  let host = null;
  function toast(label, title, sub, icon) {
    if (!host) {
      host = el('div', 'ctl-toasts');
      host.setAttribute('role', 'status');
      host.setAttribute('aria-live', 'polite');
      document.body.appendChild(host);
    }
    const t = el('div', 'ctl-toast');
    const ic = el('span', 'ctl-toast-ic');
    ic.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true">' + (ICON[icon] || ICON.check) + '</svg>';
    const lb = el('p', 'ctl-label');
    const tt = el('p', 'ctl-toast-t');
    t.append(ic, lb, tt, el('p', 'ctl-toast-s', sub || ''));
    Array.from(host.children).slice(0, -1).forEach((o) => o.remove());
    host.appendChild(t);
    typeIn(lb, label);
    typeIn(tt, title, 140);
    setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 220); }, 2600);
  }

  /* ---------- Tabs ---------- */
  function placeInk(list, flash) {
    if (!list) return;
    const ink = list.querySelector(':scope > .ctl-ink');
    const on = list.querySelector('[aria-selected="true"], [aria-current="page"], [aria-pressed="true"]');
    if (!ink) return;
    if (!on) { ink.style.width = '0px'; return; }
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    if (flash && !reduce.matches) {
      ink.classList.remove('is-flash');
      void ink.offsetWidth;
      ink.classList.add('is-flash');
    }
  }

  /* ---------- The seal behind the page ---------- */
  let sealTurn = 0;
  let sealHost = null;
  function glyph(s) {
    const pts = (f, a, b, n) => {
      let d = '';
      for (let i = 0; i <= n; i++) { const p = f(a + (b - a) * i / n); d += (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }
      return d;
    };
    if (s === 'physics') {
      return '<path d="M300,500H700" stroke-width="2.5"/><path d="M500,330V670" stroke-width="2.5"/>' +
        '<path d="' + pts((x) => [x, 500 - 120 * Math.sin((x - 300) / 400 * Math.PI * 3)], 300, 700, 120) + '"/>' +
        '<path d="' + pts((x) => [x, 500 - 60 * Math.sin((x - 300) / 400 * Math.PI * 3 + 1.1)], 300, 700, 120) + '" stroke-width="3"/>';
    }
    if (s === 'chemistry') {
      let h = '';
      for (let i = 0; i < 6; i++) { const a = (60 * i - 90) * Math.PI / 180; h += (i ? 'L' : 'M') + (500 + 190 * Math.cos(a)).toFixed(1) + ',' + (500 + 190 * Math.sin(a)).toFixed(1); }
      return '<path d="' + h + 'Z"/><circle cx="500" cy="500" r="112" stroke-width="4"/>' +
        '<path d="M500,310V250M664.5,405L716,375M664.5,595L716,625" stroke-width="4"/>';
    }
    if (s === 'biology') {
      const w = (y) => 95 * Math.sin((y - 290) / 420 * Math.PI * 2.5);
      let rungs = '';
      for (let i = 1; i < 14; i++) { const y = 290 + i * 30; const x = w(y); if (Math.abs(x) > 18) rungs += 'M' + (500 - x).toFixed(1) + ',' + y + 'L' + (500 + x).toFixed(1) + ',' + y; }
      return '<path d="' + pts((y) => [500 + w(y), y], 290, 710, 120) + '"/><path d="' + pts((y) => [500 - w(y), y], 290, 710, 120) + '"/>' +
        '<path d="' + rungs + '" stroke-width="3"/>';
    }
    if (s === 'maths') {
      return '<path d="M300,620H700M340,700V300" stroke-width="2.5"/>' +
        '<path d="' + pts((x) => [x, 620 - 0.0042 * Math.pow(x - 340, 2) * 1.15], 340, 650, 80) + '"/>' +
        '<path d="M420,640L680,370" stroke-width="3"/><circle cx="560" cy="511" r="9" fill="currentColor" stroke="none"/>';
    }
    // The home page: the four subjects' marks in a square.
    return '<g transform="translate(-95,-95) scale(0.62) translate(306,306)" stroke-width="9">' + glyph('physics') + '</g>' +
      '<g transform="translate(95,-95) scale(0.62) translate(306,306)" stroke-width="9">' + glyph('chemistry') + '</g>' +
      '<g transform="translate(-95,95) scale(0.62) translate(306,306)" stroke-width="9">' + glyph('biology') + '</g>' +
      '<g transform="translate(95,95) scale(0.62) translate(306,306)" stroke-width="9">' + glyph('maths') + '</g>';
  }
  function seal(subject) {
    const s = SEAL[subject] ? subject : 'home';
    if (!sealHost) {
      sealHost = el('div', 'ctl-seal');
      sealHost.setAttribute('aria-hidden', 'true');
      sealHost.innerHTML = '<svg viewBox="0 0 1000 1000" focusable="false"></svg>';
      document.body.prepend(sealHost);
    }
    const c = 500;
    let g = '<circle cx="500" cy="500" r="486" stroke-width="3"/><circle cx="500" cy="500" r="470" stroke-width="1.2"/>';
    g += '<defs><path id="ctl-seal-ring" d="M500,500 m-428,0 a428,428 0 1,1 856,0 a428,428 0 1,1 -856,0"/></defs>';
    const ring = SEAL[s].repeat(4);
    g += '<text><textPath href="#ctl-seal-ring" textLength="2680" lengthAdjust="spacing">' + ring.slice(0, Math.round(ring.length / 2.05)) + '</textPath></text>';
    for (let i = 0; i < 120; i++) {
      const a = (i * 3) * Math.PI / 180;
      const r1 = i % 10 === 0 ? 352 : 372;
      g += '<line x1="' + (c + r1 * Math.cos(a)).toFixed(1) + '" y1="' + (c + r1 * Math.sin(a)).toFixed(1) + '" x2="' + (c + 392 * Math.cos(a)).toFixed(1) + '" y2="' + (c + 392 * Math.sin(a)).toFixed(1) + '" stroke-width="' + (i % 10 === 0 ? 3 : 1.4) + '"/>';
    }
    g += '<circle cx="500" cy="500" r="336" stroke-width="1.2"/><circle cx="500" cy="500" r="262" stroke-width="5"/>';
    g += '<g stroke-width="7" stroke-linecap="square">' + glyph(s) + '</g>';
    const svg = sealHost.firstChild;
    svg.innerHTML = g;
    sealTurn += 40;
    svg.style.transform = 'rotate(' + sealTurn + 'deg)';
  }

  /* ---------- A change of subject inside a page ----------
     leave(dir) slides the page's .ctl-shift blocks out (toward the tab left behind: dir 1 when the
     new tab is to the right) and resolves when they are gone; enter() brings them back in. */
  let enterT = 0;
  function leave(dir) {
    const body = document.body;
    body.style.setProperty('--dir', dir < 0 ? -1 : 1);
    body.classList.remove('is-entering');
    body.classList.add('is-leaving');
    return new Promise((r) => setTimeout(r, reduce.matches ? 120 : 210));
  }
  function enter() {
    const body = document.body;
    body.classList.remove('is-leaving');
    void body.offsetWidth;
    body.classList.add('is-entering');
    clearTimeout(enterT);
    enterT = setTimeout(() => body.classList.remove('is-entering'), 800);
  }

  /* ---------- The page coming up ---------- */
  function pageSubject() {
    const b = document.body.dataset.subject || document.documentElement.dataset.subject || window.NOTES_SUBJECT;
    if (SUBJECTS.includes(b)) return b;
    const s = new URLSearchParams(location.search).get('s');
    return SUBJECTS.includes(s) ? s : 'home';
  }
  function boot() {
    seal(pageSubject());
    const blocks = document.querySelectorAll('.ctl-in');
    blocks.forEach((b, i) => { if (!b.style.getPropertyValue('--n')) b.style.setProperty('--n', i); });
    document.querySelectorAll('.ctl-shift').forEach((b, i) => { if (!b.style.getPropertyValue('--n')) b.style.setProperty('--n', i); });
    if (blocks.length && !reduce.matches) {
      document.body.classList.add('ctl-boot');
      setTimeout(() => document.body.classList.remove('ctl-boot'), 1000);
    }
    document.querySelectorAll('[data-type-in]').forEach((n) => typeIn(n, n.textContent.trim()));
    // Tab lists with a filled block: place it now and again once the fonts are in.
    const lists = () => document.querySelectorAll('.ctl-tabs');
    lists().forEach((l) => placeInk(l, false));
    if (document.fonts) document.fonts.ready.then(() => lists().forEach((l) => placeInk(l, false)));
    let rz = 0;
    window.addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => lists().forEach((l) => placeInk(l, false))); });
    backToTop();
  }

  /* ---------- Back to top ----------
     Comes up once the page is a screen down (body.ctl-top-on while it shows, so anything else in
     that corner can make room); the line along its foot is how far down the page is. After the
     jump the page's heading has the focus, so the next Tab starts from the top. */
  function backToTop() {
    const btn = el('button', 'ctl-top');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg class="ctl-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5V4m0 0L4.5 9.5M10 4l5.5 5.5"/></svg><span class="ctl-top-t" aria-hidden="true">Back to top</span>';
    document.body.appendChild(btn);
    let on = false;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const show = y > Math.max(400, window.innerHeight * 0.9);
      if (show !== on) {
        on = show;
        btn.classList.toggle('is-on', on);
        document.body.classList.toggle('ctl-top-on', on);
      }
      btn.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(3) : '0');
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    paint();
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' });
      const head = Array.from(document.querySelectorAll('main h1, h1')).find((h) => h.getClientRects().length) || document.querySelector('main');
      if (!head) return;
      if (!head.hasAttribute('tabindex')) {
        head.setAttribute('tabindex', '-1');
        head.addEventListener('blur', () => head.removeAttribute('tabindex'), { once: true });
      }
      head.focus({ preventScroll: true });
    });
  }

  window.CTL = { typeIn: typeIn, toast: toast, placeInk: placeInk, seal: seal, leave: leave, enter: enter, reduce: reduce, pageSubject: pageSubject };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
