/* Notes — site-wide behaviour, shared by every subject.
   Builds the sidebar, the "on this page" list, prev/next links, step-by-step
   derivations and quick-check questions. Every page loads this file.
   To add a page: add it to the subject config (js/notes-<subject>.js) and it appears everywhere. */
(function () {
  'use strict';

  // The topic list comes from the subject config loaded before this file
  // (js/notes-physics.js, js/notes-biology.js, ...).
  const SITE = (window.NOTES_SITE || []).filter((g) => g.pages.length);   // skip units with no pages yet

  const scriptSrc = document.currentScript && document.currentScript.src;
  const ROOT = scriptSrc ? new URL('../', scriptSrc) : new URL('./', location.href);
  // This page's file name. ialprep.com serves pages without ".html" (/pages/Motion), so it is added back.
  const here = ((last) => (!last ? 'index.html' : /\.html$/.test(last) ? last : last + '.html'))(
    decodeURIComponent(location.pathname.split('/').pop() || ''));
  // Links use the address ialprep.com serves a page at (/pages/Motion, /pages/), so following one
  // never goes through a redirect. tools/serve.py serves them the same way locally.
  const clean = (url) => url.replace(/(\/)index\.html(?=[?#]|$)/, '$1').replace(/\.html(?=[?#]|$)/, '');
  const href = (file) => clean(new URL((window.NOTES_DIR || 'pages/') + file, ROOT).href);
  const flat = [];
  SITE.forEach((g) => g.pages.forEach((p) => flat.push({ file: p[0], title: p[1], blurb: p[2], group: g })));
  const current = flat.find((p) => p.file === here);

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  const levelClass = (level) => (level === 'AS' ? 'level-as' : level === 'A2' ? 'level-a2' : '');

  /* ---------- Sidebar ---------- */
  function buildSidebar() {
    let nav = document.querySelector('nav.sidebar');
    if (!nav) {
      nav = el('nav', 'sidebar');
      document.body.prepend(nav);
    }
    nav.setAttribute('aria-label', 'Topics');
    nav.id = 'site-nav';
    nav.innerHTML = '';

    const logo = el('a', 'logo', window.NOTES_LOGO || 'Physics Notes');
    logo.href = href('index.html');
    nav.appendChild(logo);

    const bankLink = el('a', 'bank-back', '← Question bank');
    bankLink.href = new URL('questions?s=' + (window.NOTES_SUBJECT || 'physics'), ROOT).href;
    nav.appendChild(bankLink);

    const homeList = el('ul', 'nav-links');
    const homeLi = el('li');
    const homeA = el('a', 'nav-link' + (here === 'index.html' ? ' active' : ''), 'Home');
    homeA.href = href('index.html');
    homeLi.appendChild(homeA);
    homeList.appendChild(homeLi);
    nav.appendChild(homeList);

    SITE.forEach((g, gi) => {
      const isCurrent = g.pages.some((p) => p[0] === here);
      const wasOpen = isCurrent || openState.units.includes(g.unit);
      const group = el('div', 'nav-group' + (wasOpen ? ' open' : ''));
      const head = el('button', 'nav-group-head');
      head.type = 'button';
      // Just the level and Unit ("AS · Unit 2"); the Unit's full name shows on hover. The Unit
      // never breaks across lines ("Units 3 & 6").
      head.innerHTML =
        '<span class="nav-group-name">' + g.level + ' · ' + g.unit.replace(/ /g, '&nbsp;') + '</span>' +
        '<span class="chev" aria-hidden="true">›</span>';
      head.title = g.name;
      head.setAttribute('aria-expanded', String(wasOpen));
      head.setAttribute('aria-controls', 'nav-group-' + gi);
      head.addEventListener('click', () => {
        const open = group.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
        remember('units', g.unit, open);
      });
      const list = el('ul', 'nav-links');
      list.id = 'nav-group-' + gi;
      g.pages.forEach(([file, title]) => {
        const li = el('li');
        const a = el('a', 'nav-link' + (file === here ? ' active' : ''));
        a.textContent = title;
        a.href = href(file);
        if (file === here) a.setAttribute('aria-current', 'page');
        li.appendChild(a);
        addSectionToggle(li, file, title);
        li.appendChild(pagePdf(file, title));
        list.appendChild(li);
      });
      group.append(head, unitPdf(g, 'nav-group-pdf'), list);
      nav.appendChild(group);
    });

    // Mobile toggle + scrim
    const toggle = el('button', 'menu-toggle', '☰ Topics');
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'site-nav');
    toggle.setAttribute('aria-expanded', 'false');
    const scrim = el('div', 'nav-scrim');
    const setOpen = (open) => {
      document.body.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? '✕ Close' : '☰ Topics';
    };
    // Wide screens: the Hide button at the top of the sidebar puts it away so the notes get the
    // whole width, and the Topics button brings it back. Remembered in this browser; js/theme.js
    // applies it in <head> so the page is drawn that way from the start. (Phones keep the sidebar
    // behind the Topics button as before.)
    const KEY_HIDDEN = 'ialqb_notes_nav_hidden';
    const wide = window.matchMedia('(min-width: 901px)');
    const hide = el('button', 'nav-hide', '<span aria-hidden="true">«</span> Hide');
    hide.type = 'button';
    hide.title = 'Hide the topics list';
    hide.setAttribute('aria-label', 'Hide the topics list');
    hide.setAttribute('aria-controls', 'site-nav');
    nav.prepend(hide);
    const setHidden = (on) => {
      document.documentElement.classList.toggle('notes-nav-hidden', on);
      try { localStorage.setItem(KEY_HIDDEN, on ? '1' : ''); } catch (e) { /* storage blocked: lasts until the page is left */ }
      // Keyboard users carry on from the button that does the opposite.
      (on ? toggle : hide).focus({ preventScroll: true });
    };
    hide.addEventListener('click', () => setHidden(true));

    toggle.addEventListener('click', () => {
      if (wide.matches) setHidden(false);
      else setOpen(!document.body.classList.contains('nav-open'));
    });
    scrim.addEventListener('click', () => setOpen(false));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    document.body.append(toggle, scrim);

    const active = nav.querySelector('a.active');
    if (active) nav.scrollTop = Math.max(0, active.offsetTop - nav.clientHeight / 2);
  }

  /* ---------- Each page's sections, as a drop-down in the sidebar ----------
     Every page link gets an arrow that opens a list of that page's sections, so
     you can jump straight to one. Other pages are fetched the first time their
     arrow is opened; the current page's list starts open and highlights the
     section being read. */

  // A page's sections as [id, title], with ids given the same way as
  // buildTopicChrome gives them, so links from other pages land on the right heading.
  function sectionsOf(doc) {
    const page = doc.querySelector('.content .page') || doc.querySelector('.content');
    if (!page) return [];
    const used = new Set();
    return Array.from(page.querySelectorAll('h2.section-title')).map((h) => {
      let id = h.id;
      if (!id) {
        id = slug(headText(h));
        while (used.has(id) || doc.getElementById(id)) id += '-x';
      }
      used.add(id);
      return [id, headText(h)];
    });
  }

  function fillSections(sub, base, list) {
    sub.innerHTML = '';
    if (!list.length) {
      sub.appendChild(el('li', 'nav-sections-note', 'No sections on this page.'));
      return;
    }
    list.forEach(([id, title]) => {
      const item = el('li');
      const a = el('a', null);
      a.textContent = title;
      a.href = base + '#' + id;
      item.appendChild(a);
      sub.appendChild(item);
    });
  }

  function loadSections(file, sub) {
    sub.innerHTML = '';
    sub.appendChild(el('li', 'nav-sections-note', 'Loading…'));
    fetch(href(file))
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((html) => fillSections(sub, href(file), sectionsOf(new DOMParser().parseFromString(html, 'text/html'))))
      .catch(() => {
        sub.innerHTML = '';
        sub.appendChild(el('li', 'nav-sections-note', 'Could not load the sections. Open the page instead.'));
      });
  }

  /* Which units and section lists are open is kept for this tab (sessionStorage), so opening a
     page keeps open what was open on the last one. */
  const OPEN_KEY = 'ialqb_nav_open_' + (window.NOTES_SUBJECT || 'physics');
  const openState = (() => {
    try {
      const v = JSON.parse(sessionStorage.getItem(OPEN_KEY) || '{}');
      return { units: Array.isArray(v.units) ? v.units : [], pages: Array.isArray(v.pages) ? v.pages : [] };
    } catch (e) { return { units: [], pages: [] }; }
  })();
  function remember(kind, name, open) {
    const list = openState[kind].filter((x) => x !== name);
    if (open) list.push(name);
    openState[kind] = list;
    try { sessionStorage.setItem(OPEN_KEY, JSON.stringify(openState)); } catch (e) { /* storage blocked */ }
  }

  function addSectionToggle(li, file, title) {
    li.classList.add('has-sections');
    const sub = el('ol', 'nav-sections');
    sub.id = 'nav-sections-' + slug(file);
    const btn = el('button', 'nav-sections-toggle', '<span aria-hidden="true">›</span>');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Sections of ' + title);
    btn.setAttribute('aria-controls', sub.id);
    btn.setAttribute('aria-expanded', 'false');
    const setOpen = (open) => {
      li.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (open && !li.dataset.loaded) {
        li.dataset.loaded = '1';
        loadSections(file, sub);
      }
    };
    btn.addEventListener('click', () => {
      const open = !li.classList.contains('open');
      setOpen(open);
      remember('pages', file, open);
    });
    li.append(btn, sub);
    // Opened on an earlier page in this tab: open again. (This page's own list is opened by buildSectionMenu.)
    if (openState.pages.includes(file) && file !== here) setOpen(true);
  }

  function buildSectionMenu(heads) {
    const active = document.querySelector('nav.sidebar a.nav-link.active');
    const li = active && active.parentElement;
    if (!li || !li.classList.contains('has-sections')) return;
    const sub = li.querySelector('.nav-sections');
    fillSections(sub, '', heads.map((h) => [h.id, headText(h)]));
    li.dataset.loaded = '1';
    li.classList.add('open');
    li.querySelector('.nav-sections-toggle').setAttribute('aria-expanded', 'true');
    if (!heads.length) return;

    const links = Array.from(sub.querySelectorAll('a'));
    let ticking = false;
    const mark = () => {
      ticking = false;
      let at = 0;
      heads.forEach((h, i) => { if (h.getBoundingClientRect().top < 140) at = i; });
      links.forEach((a, i) => a.classList.toggle('current', i === at));
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(mark); }
    }, { passive: true });
    mark();
  }

  /* ---------- Topic chips, prev/next ---------- */
  function slug(text) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
  }

  // A section heading's words for menus and ids. A spec badge's small "Spec" label is
  // left out, so "<small>Spec</small>1.4 Water" reads "1.4 Water".
  function headText(h) {
    const c = h.cloneNode(true);
    c.querySelectorAll('.spec-badge small').forEach((s) => s.remove());
    c.querySelectorAll('.spec-badge').forEach((b) => b.append(' '));
    return c.textContent.replace(/\s+/g, ' ').trim();
  }

  function buildTopicChrome() {
    const page = document.querySelector('.content .page') || document.querySelector('.content');
    if (!page || !current) return;
    const title = page.querySelector('.main-title');

    if (!page.querySelector('.topic-meta') && title) {
      const meta = el('div', 'topic-meta');
      meta.innerHTML =
        '<span class="chip ' + levelClass(current.group.level) + '">' + current.group.level + ' · ' + current.group.unit + ' · ' + current.group.code + '</span>' +
        '<span class="chip">' + current.group.name + '</span>';
      title.before(meta);
    }

    // The ready-made PDF of these notes: pdf/<subject>/<page>.pdf, built by
    // tools/notes/build-pdfs.mjs.
    const meta = page.querySelector('.topic-meta');
    if (meta && !meta.querySelector('.pdf-download')) {
      const subject = window.NOTES_SUBJECT || 'physics';
      const pdf = el('a', 'pdf-download', '<span aria-hidden="true">⤓</span> Download PDF');
      pdf.href = new URL('pdf/' + subject + '/' + current.file.replace(/\.html$/, '.pdf'), ROOT).href;
      pdf.download = (current.title + ' - ' + subject + ' notes.pdf').replace(/[\\/:*?"<>|]/g, '');
      meta.appendChild(pdf);
    }

    const heads = Array.from(page.querySelectorAll('h2.section-title'));
    const used = new Set();
    heads.forEach((h) => {
      if (!h.id) {
        let id = slug(headText(h));
        while (used.has(id) || document.getElementById(id)) id += '-x';
        h.id = id;
      }
      used.add(h.id);
    });
    // The page's sections live in the sidebar now (buildSectionMenu), so drop any
    // contents box written into the page itself.
    const oldToc = page.querySelector('nav.toc');
    if (oldToc) oldToc.remove();
    buildSectionMenu(heads);

    const i = flat.indexOf(current);
    const prev = flat[i - 1];
    const next = flat[i + 1];
    let pn = page.querySelector('.page-nav');
    if (!pn) {
      pn = el('nav', 'page-nav');
      page.appendChild(pn);
    }
    pn.setAttribute('aria-label', 'Previous and next topic');
    pn.innerHTML =
      (prev ? '<a class="prev" href="' + href(prev.file) + '"><small>‹ Previous</small><strong>' + prev.title + '</strong></a>' : '') +
      (next ? '<a class="next" href="' + href(next.file) + '"><small>Next ›</small><strong>' + next.title + '</strong></a>' : '');
  }

  /* ---------- A whole unit's notes as one PDF ----------
     pdf/<subject>/unit-1.pdf and so on, built by tools/notes/build-pdfs.mjs from the topic PDFs
     (which leave out the interactive diagrams). The file name follows the unit's label. */
  const DOWNLOAD_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4 16h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function unitPdf(g, cls) {
    const subject = window.NOTES_SUBJECT || 'physics';
    const file = g.unit.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
    const a = el('a', cls, DOWNLOAD_ICON);
    a.href = new URL('pdf/' + subject + '/' + file, ROOT).href;
    a.download = (g.unit + ' ' + g.name + ' - ' + subject + ' notes.pdf').replace(/[\\/:*?"<>|&]/g, '').replace(/\s+/g, ' ');
    const words = 'Download all of ' + g.unit + ' (' + g.name.replace(/&/g, 'and') + ') as one PDF';
    a.title = words;
    a.setAttribute('aria-label', words);
    return a;
  }

  // One topic's notes as a PDF (pdf/<subject>/<page>.pdf), for the icon beside it in the sidebar.
  function pagePdf(file, title) {
    const subject = window.NOTES_SUBJECT || 'physics';
    const a = el('a', 'nav-page-pdf', DOWNLOAD_ICON);
    a.href = new URL('pdf/' + subject + '/' + file.replace(/\.html$/, '.pdf'), ROOT).href;
    a.download = (title + ' - ' + subject + ' notes.pdf').replace(/[\\/:*?"<>|&]/g, '').replace(/\s+/g, ' ');
    const words = 'Download ' + title.replace(/&/g, 'and') + ' as a PDF';
    a.title = words;
    a.setAttribute('aria-label', words);
    return a;
  }

  /* ---------- Home page unit cards ---------- */
  function buildUnitGrid() {
    const grid = document.querySelector('[data-fill="units"]');
    if (!grid) return;
    grid.innerHTML = '';
    SITE.forEach((g) => {
      const kind = g.level === 'AS' ? 'as' : g.level === 'A2' ? 'a2' : 'prac';
      const card = el('section', 'unit-card ' + kind);
      card.innerHTML = '<header><h3>' + g.level + ' · ' + g.unit + '</h3></header>';
      card.querySelector('header').title = g.name;
      card.querySelector('header').appendChild(unitPdf(g, 'unit-pdf'));
      const ul = el('ul');
      g.pages.forEach(([file, title, blurb]) => {
        const li = el('li');
        li.innerHTML = '<a href="' + href(file) + '"><strong>' + title + '</strong><span>' + blurb + '</span></a>';
        ul.appendChild(li);
      });
      card.appendChild(ul);
      grid.appendChild(card);
    });
  }

  /* ---------- Step-by-step derivations ----------
     <div class="derive" data-title="Deriving ..." data-spec="derive|use|off">
       <div class="step"> ... </div> ...
     </div> */
  const SPEC_TAGS = {
    derive: ['req', 'Spec: you must be able to derive this'],
    use: ['use', 'Derivation not required · you only need to use the result'],
    off: ['offspec', 'Not part of the Edexcel spec']
  };
  function buildDerivations() {
    document.querySelectorAll('.derive').forEach((box) => {
      if (box.dataset.ready) return;
      box.dataset.ready = '1';
      const steps = Array.from(box.querySelectorAll(':scope > .step'));
      const head = el('div', 'derive-head');
      const t = el('span', 'derive-title');
      t.textContent = box.dataset.title || 'Derivation';
      head.appendChild(t);
      // The derive/use/off labels describe physics derivations; other subjects
      // use these blocks for step-through processes, so they get no label.
      const spec = (window.NOTES_SUBJECT || 'physics') === 'physics' && SPEC_TAGS[box.dataset.spec];
      if (spec) head.appendChild(el('span', 'tag ' + spec[0], spec[1]));
      const wrap = el('div', 'derive-steps');
      steps.forEach((s) => wrap.appendChild(s));
      box.prepend(head);
      box.appendChild(wrap);
      if (steps.length < 2) return;

      box.classList.add('js');
      const controls = el('div', 'derive-controls');
      const next = el('button', 'btn', 'Next step ▶');
      const all = el('button', 'btn ghost', 'Show all');
      const reset = el('button', 'btn ghost', 'Reset');
      const count = el('span', 'derive-count');
      [next, all, reset].forEach((b) => (b.type = 'button'));
      controls.append(next, all, reset, count);
      box.appendChild(controls);

      let shown = 1;
      const render = (animateFrom) => {
        steps.forEach((s, i) => {
          s.classList.toggle('hidden', i >= shown);
          s.classList.toggle('revealed', animateFrom != null && i >= animateFrom && i < shown);
        });
        count.textContent = 'Step ' + shown + ' of ' + steps.length;
        next.disabled = all.disabled = shown >= steps.length;
      };
      next.addEventListener('click', () => {
        if (shown < steps.length) { shown++; render(shown - 1); }
      });
      all.addEventListener('click', () => { const from = shown; shown = steps.length; render(from); });
      reset.addEventListener('click', () => { shown = 1; render(); });
      render();
    });
  }

  /* ---------- Quick-check multiple choice ----------
     <div class="mcq"><p class="mcq-q">..</p><div class="mcq-options">
       <button>..</button><button data-correct>..</button></div>
       <div class="mcq-why">..</div></div> */
  function buildQuizzes() {
    document.querySelectorAll('.mcq').forEach((q) => {
      if (q.dataset.ready) return;
      q.dataset.ready = '1';
      if (!q.querySelector('.mcq-label')) q.prepend(el('span', 'mcq-label', q.dataset.label || 'Quick check'));
      const options = Array.from(q.querySelectorAll('.mcq-options button'));
      options.forEach((b) => {
        b.type = 'button';
        b.addEventListener('click', () => {
          if (q.classList.contains('done')) return;
          if (b.hasAttribute('data-correct')) {
            b.classList.add('correct');
            q.classList.add('done');
          } else {
            b.classList.remove('wrong');
            void b.offsetWidth;
            b.classList.add('wrong');
          }
        });
      });
    });
  }

  /* ---------- Printing ----------
     Printing (or "Save as PDF" from the print menu, also on iPhone and iPad) gets
     the whole page: every worked solution open, in light mode. The print styles in
     styles.css hide the sidebar and the interactive diagrams. build-pdfs.mjs fires
     the same event when it makes the downloadable PDFs. */
  function setUpPrinting() {
    const root = document.documentElement;
    let opened = [];
    let theme = null;
    window.addEventListener('beforeprint', () => {
      opened = Array.from(document.querySelectorAll('.content details:not([open])'));
      opened.forEach((d) => (d.open = true));
      theme = root.dataset.theme;
      root.dataset.theme = 'light';
    });
    window.addEventListener('afterprint', () => {
      opened.forEach((d) => (d.open = false));
      opened = [];
      if (theme) root.dataset.theme = theme;
    });
  }

  function init() {
    setUpPrinting();
    buildSidebar();
    buildTopicChrome();
    buildUnitGrid();
    buildDerivations();
    buildQuizzes();
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) setTimeout(() => target.scrollIntoView(), 0);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
