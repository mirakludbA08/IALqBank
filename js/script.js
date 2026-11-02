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
  const here = decodeURIComponent(location.pathname.split('/').pop() || 'index.html') || 'index.html';
  const href = (file) => new URL((window.NOTES_DIR || 'pages/') + file, ROOT).href;
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
    bankLink.href = new URL('questions.html?s=' + (window.NOTES_SUBJECT || 'physics'), ROOT).href;
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
      const group = el('div', 'nav-group' + (isCurrent ? ' open' : ''));
      const head = el('button', 'nav-group-head');
      head.type = 'button';
      head.innerHTML =
        '<span class="nav-level">' + g.level + ' · ' + g.unit + '</span>' +
        '<span class="nav-group-name">' + g.name + '</span>' +
        '<span class="chev" aria-hidden="true">›</span>';
      head.setAttribute('aria-expanded', String(isCurrent));
      head.setAttribute('aria-controls', 'nav-group-' + gi);
      head.addEventListener('click', () => {
        const open = group.classList.toggle('open');
        head.setAttribute('aria-expanded', String(open));
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
        list.appendChild(li);
      });
      group.append(head, list);
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
    toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
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
        id = slug(h.textContent);
        while (used.has(id) || doc.getElementById(id)) id += '-x';
      }
      used.add(id);
      return [id, h.textContent.trim()];
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

  function addSectionToggle(li, file, title) {
    li.classList.add('has-sections');
    const sub = el('ol', 'nav-sections');
    sub.id = 'nav-sections-' + slug(file);
    const btn = el('button', 'nav-sections-toggle', '<span aria-hidden="true">›</span>');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Sections of ' + title);
    btn.setAttribute('aria-controls', sub.id);
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
      if (open && !li.dataset.loaded) {
        li.dataset.loaded = '1';
        loadSections(file, sub);
      }
    });
    li.append(btn, sub);
  }

  function buildSectionMenu(heads) {
    const active = document.querySelector('nav.sidebar a.nav-link.active');
    const li = active && active.parentElement;
    if (!li || !li.classList.contains('has-sections')) return;
    const sub = li.querySelector('.nav-sections');
    fillSections(sub, '', heads.map((h) => [h.id, h.textContent.trim()]));
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

    const heads = Array.from(page.querySelectorAll('h2.section-title'));
    const used = new Set();
    heads.forEach((h) => {
      if (!h.id) {
        let id = slug(h.textContent);
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

  /* ---------- Home page unit cards ---------- */
  function buildUnitGrid() {
    const grid = document.querySelector('[data-fill="units"]');
    if (!grid) return;
    grid.innerHTML = '';
    SITE.forEach((g) => {
      const kind = g.level === 'AS' ? 'as' : g.level === 'A2' ? 'a2' : 'prac';
      const card = el('section', 'unit-card ' + kind);
      card.innerHTML =
        '<header><div class="unit-code">' + g.level + ' · ' + g.unit + ' · ' + g.code + '</div><h3>' + g.name + '</h3></header>';
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

  function init() {
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
