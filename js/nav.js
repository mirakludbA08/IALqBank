/* IALqBank — the navigation bar along the top of every page.
   One menu per subject. On a wide screen each opens a panel of columns under the bar: the
   question bank's Units, the notes pages Unit by Unit, and the past papers, study report and
   paper-code guide. On a phone the bar shows a Menu button that opens the same menus as a
   full-screen list, one subject open at a time. "Continue" goes back to the topic and question
   last used in the question bank (saved by js/topicbank.js).
   Built from js/sitemap.js. Load both with defer, sitemap.js first, and css/nav.css. */
(function () {
  'use strict';

  const SITE = window.IALQB_SITE;
  if (!SITE) return;
  const ORDER = ['physics', 'chemistry', 'biology', 'maths'];
  const src = document.currentScript && document.currentScript.src;
  const ROOT = src ? new URL('../', src) : new URL('./', location.href);
  const link = (path) => new URL(path, ROOT).href;
  const wide = window.matchMedia('(min-width: 901px)');
  const params = new URLSearchParams(location.search);
  const file = decodeURIComponent(location.pathname.split('/').pop() || 'index.html') || 'index.html';
  const appPage = /^(questions|papers|report)\.html$/.test(file);

  // The subject this page belongs to, if any: notes pages set NOTES_SUBJECT, and the question
  // bank, papers and report pages carry it as ?s= (Physics when it is missing, as they do).
  const pageSubject = window.NOTES_SUBJECT || (SITE[params.get('s')] ? params.get('s') : (appPage ? 'physics' : null));

  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const CHEVRON = '<svg class="site-nav-chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ARROW = '<svg class="site-nav-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const MENU = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  const CLOSE = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  const bankUrl = (key, unit) => link('questions.html?s=' + key + (unit ? '&unit=' + encodeURIComponent(unit) : ''));

  // A link is the current page when it opens this notes page, or this subject's papers page
  // or study report.
  function isHere(href) {
    const u = new URL(href);
    if (u.pathname !== location.pathname) return false;
    const s = u.searchParams.get('s');
    if (!s) return true;
    return (file === 'papers.html' || file === 'report.html') && s === (params.get('s') || 'physics');
  }

  function item(href, title, desc, note) {
    const li = el('li');
    const a = el('a', 'site-nav-link');
    a.href = href;
    a.appendChild(el('span', 'site-nav-link-title', title));
    if (desc) a.appendChild(el('span', 'site-nav-link-desc', desc));
    if (note) a.appendChild(el('span', 'site-nav-link-note', note));
    if (isHere(href)) a.setAttribute('aria-current', 'page');
    li.appendChild(a);
    return li;
  }

  function column(id, title, items) {
    const col = el('section', 'site-nav-col');
    const head = el('span', 'site-nav-col-title', title);
    head.id = id;
    const ul = el('ul', 'site-nav-links');
    ul.setAttribute('aria-labelledby', id);
    items.forEach((li) => ul.appendChild(li));
    col.append(head, ul);
    return col;
  }

  // Questions marked done, per Unit, as the question bank last saved them.
  function progressOf(key) {
    return readJson('ialqb_tb_progress_' + key) || { units: {}, all: null };
  }
  const doneNote = (p) => (p && p[0] ? p[0].toLocaleString() + ' of ' + p[1].toLocaleString() + ' done' : null);

  function panel(key) {
    const s = SITE[key];
    const prog = progressOf(key);
    const box = el('div', 'site-nav-panel');
    box.id = 'site-nav-panel-' + key;
    box.dataset.navSubject = key;
    box.hidden = true;

    const cols = el('div', 'site-nav-cols');
    s.bank.forEach((group, gi) => {
      const isMaths = key === 'maths';
      cols.appendChild(column('site-nav-' + key + '-bank-' + gi, group.name, group.units.map((u) => item(
        bankUrl(key, u[0]),
        isMaths ? u[1] : 'Unit ' + u[0],
        isMaths ? u[0] + ' questions' : u[1] + (u[2] ? ' · ' + u[2] : ''),
        doneNote((prog.units || {})[u[0]])
      ))));
    });

    const practical = [];
    (s.notes || []).forEach((g, gi) => {
      const pages = g.pages.map((p) => item(link(s.notesDir + p[0]), p[1], p[2]));
      if (/practical/i.test(g.name)) { practical.push(...pages); return; }
      cols.appendChild(column('site-nav-' + key + '-notes-' + gi, g.unit + ' notes', pages));
    });

    const more = [
      item(link('papers.html?s=' + key), 'Past papers', 'Every paper and mark scheme, 2014 to 2024'),
      item(link('report.html?s=' + key), 'Study report', 'What the exam tests most, topic by topic')
    ].concat(practical, [item(bankUrl(key) + '#codes', 'Paper codes', 'What a code like ' + s.code + ' means')]);
    cols.appendChild(column('site-nav-' + key + '-more', 'Papers and more', more));
    box.appendChild(cols);

    const foot = el('div', 'site-nav-foot');
    const all = el('a', 'site-nav-all');
    all.href = bankUrl(key);
    all.innerHTML = '<span></span>' + ARROW;
    all.firstChild.textContent = 'All ' + s.label + ' questions';
    foot.appendChild(all);
    const side = el('div', 'site-nav-foot-side');
    if (prog.all && prog.all[0]) side.appendChild(el('span', 'site-nav-foot-progress', doneNote(prog.all) + ' in the question bank'));
    if (s.notesHome) {
      const n = el('a', null, s.label + ' notes home');
      n.href = link(s.notesHome);
      side.appendChild(n);
    }
    foot.appendChild(side);
    box.appendChild(foot);
    return box;
  }

  // Back to the last topic and question used in the question bank.
  function continueLink() {
    const last = readJson('ialqb_last');
    if (!last || !SITE[last.s]) return null;
    let href = 'questions.html?s=' + last.s;
    if (last.path && last.path.length) href += '&t=' + encodeURIComponent(last.path.join(' > '));
    if (last.item) href += '&at=' + encodeURIComponent(last.item);
    const a = el('a', 'site-nav-continue');
    a.href = link(href);
    a.appendChild(el('span', 'site-nav-continue-label', 'Continue'));
    a.appendChild(el('span', 'site-nav-continue-where', SITE[last.s].label));
    const where = last.path && last.path.length ? last.path[last.path.length - 1] : 'all topics';
    a.title = 'Back to ' + SITE[last.s].label + ': ' + where;
    return a;
  }

  function build() {
    let header = document.querySelector('header.site-nav');
    if (!header) {
      header = el('header', 'site-nav');
      document.body.prepend(header);
    }
    header.textContent = '';
    header.dataset.subject = pageSubject || 'home';

    const bar = el('div', 'site-nav-bar');
    const logo = el('a', 'site-nav-logo', 'IALqBank');
    logo.href = link('index.html');

    const menu = el('nav', 'site-nav-menu');
    menu.id = 'site-nav-menu';
    menu.setAttribute('aria-label', 'Subjects');
    const list = el('ul', 'site-nav-list');
    ORDER.forEach((key) => {
      const li = el('li', 'site-nav-item');
      const btn = el('button', 'site-nav-trigger' + (key === pageSubject ? ' is-current' : ''));
      btn.type = 'button';
      btn.innerHTML = '<span></span>' + CHEVRON;
      btn.firstChild.textContent = SITE[key].label;
      btn.dataset.key = key;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'site-nav-panel-' + key);
      li.append(btn, panel(key));
      list.appendChild(li);
    });
    menu.appendChild(list);

    const end = el('div', 'site-nav-end');
    const cont = continueLink();
    if (cont) end.appendChild(cont);
    const burger = el('button', 'site-nav-burger');
    burger.type = 'button';
    burger.setAttribute('aria-controls', 'site-nav-menu');
    end.appendChild(burger);

    bar.append(logo, menu, end);
    header.appendChild(bar);
    wire(header, list, burger);
  }

  function wire(header, list, burger) {
    const triggers = Array.from(list.querySelectorAll('.site-nav-trigger'));
    const panelOf = (btn) => document.getElementById(btn.getAttribute('aria-controls'));
    let openBtn = null;
    let openedBy = null;      // 'hover' or 'click'
    let hoverTimer = 0;
    let leaveTimer = 0;

    function show(btn, how) {
      triggers.forEach((b) => {
        const on = b === btn;
        b.setAttribute('aria-expanded', String(on));
        b.parentElement.classList.toggle('is-open', on);
        panelOf(b).hidden = !on;
      });
      openBtn = btn;
      openedBy = btn ? how : null;
      header.classList.toggle('has-panel', !!btn && wide.matches);
    }

    function setSheet(open) {
      header.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('site-nav-lock', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close the menu' : 'Open the menu');
      burger.innerHTML = (open ? CLOSE : MENU) + '<span>' + (open ? 'Close' : 'Menu') + '</span>';
      if (open && !openBtn) show(triggers.find((b) => b.dataset.key === pageSubject) || triggers[0], 'click');
      if (!open) show(null);
    }
    setSheet(false);

    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        clearTimeout(hoverTimer);
        // A panel the mouse opened stays open when its button is then clicked.
        if (openBtn === btn && openedBy === 'hover') { openedBy = 'click'; return; }
        show(openBtn === btn ? null : btn, 'click');
      });
      btn.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !wide.matches) return;
        clearTimeout(hoverTimer);
        // Wait a moment before the first panel opens, so passing over the bar does not
        // flash one open; move straight between panels once one is open.
        hoverTimer = setTimeout(() => { if (openBtn !== btn) show(btn, 'hover'); }, openBtn ? 0 : 140);
      });
      btn.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
    });

    header.addEventListener('pointerenter', () => clearTimeout(leaveTimer));
    header.addEventListener('pointerleave', (e) => {
      if (e.pointerType !== 'mouse' || !wide.matches || openedBy !== 'hover') return;
      leaveTimer = setTimeout(() => show(null), 260);
    });

    burger.addEventListener('click', () => setSheet(!header.classList.contains('is-open')));

    // Following a link closes the menus (a link to this page's own #codes does not reload it).
    header.addEventListener('click', (e) => {
      if (e.target.closest('a')) { show(null); if (header.classList.contains('is-open')) setSheet(false); }
    });

    document.addEventListener('click', (e) => {
      if (header.contains(e.target)) return;
      if (openBtn && wide.matches) show(null);
    });

    // Tabbing out of an open panel closes it.
    header.addEventListener('focusout', (e) => {
      if (!wide.matches || !openBtn) return;
      const to = e.relatedTarget;
      if (to && !openBtn.parentElement.contains(to)) show(null);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (header.classList.contains('is-open')) { setSheet(false); burger.focus(); return; }
      if (openBtn) { const b = openBtn; show(null); b.focus(); }
    });

    const onWidth = () => { if (wide.matches && header.classList.contains('is-open')) setSheet(false); else show(null); };
    if (wide.addEventListener) wide.addEventListener('change', onWidth);
    else if (wide.addListener) wide.addListener(onWidth);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
