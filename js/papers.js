/* IALqBank past papers.
   Loads data/papers-<subject>.json (built by tools/papers/build-manifest.mjs) and lists every
   International A Level paper by exam session, with the question paper and mark scheme to
   download. The PDFs are assets on the repository's GitHub releases (one release per subject).
   Downloading a question paper puts the paper in the done list; "Mark done" does it by hand.
   The done list is kept in this browser (localStorage), like the question bank's. */
(function () {
  'use strict';

  const SUBJECTS = {
    physics: { label: 'Physics', notes: 'pages/index.html', bank: true },
    chemistry: { label: 'Chemistry', notes: 'notes/chemistry/index.html', bank: true },
    biology: { label: 'Biology', notes: 'notes/biology/index.html', bank: true },
    maths: { label: 'Maths', bank: true }
  };
  const RELEASES = 'https://github.com/mirakludbA08/IALqBank/releases/download/';
  const SESSIONS = { Jan: 'January', Jun: 'May/June', Oct: 'October' };

  const params = new URLSearchParams(location.search);
  let subject = params.get('s');
  if (!SUBJECTS[subject]) subject = 'physics';
  document.body.dataset.subject = subject;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const KEY_DONE = 'ialqb_papers_done_' + subject;
  const done = new Set((() => {
    try { return JSON.parse(localStorage.getItem(KEY_DONE) || '[]'); } catch (e) { return []; }
  })());
  const save = () => {
    try { localStorage.setItem(KEY_DONE, JSON.stringify([...done])); } catch (e) { /* storage blocked: the list lasts until the page is closed */ }
  };

  let data = null;
  let units = new Map();
  const state = { unit: '', year: '', show: '' };

  // The subject menus are in the navigation bar (js/nav.js); this names the page and links
  // to the subject's question bank and notes.
  function buildHeading() {
    const s = SUBJECTS[subject];
    $('#subject-title').textContent = s.label + ' past papers';
    document.title = s.label + ' past papers · IALqBank';
    const links = $('#subject-links');
    if (s.bank) { const a = el('a', null, s.label + ' question bank'); a.href = 'questions.html?s=' + subject; links.appendChild(a); }
    if (s.notes) { const a = el('a', null, s.label + ' notes'); a.href = s.notes; links.appendChild(a); }
    const report = el('a', null, s.label + ' study report');
    report.href = 'report.html?s=' + subject;
    links.appendChild(report);
  }

  const url = (file) => RELEASES + data.tag + '/' + encodeURIComponent(file.file);
  const size = (file) => (file.bytes ? ' (' + (file.bytes / 1048576).toFixed(1) + ' MB)' : '');
  const sessionKey = (p) => p.year + '-' + p.month;
  const sessionLabel = (p) => (SESSIONS[p.month] || p.month) + ' ' + p.year;

  function unitLabel(p) {
    const u = units.get(p.code);
    return (u ? u.name : p.code) + (p.variant ? ' (paper ' + p.variant + ')' : '');
  }

  function buildFilters() {
    const us = $('#f-unit');
    data.units.forEach((u) => {
      const o = el('option', null, u.code + ': ' + u.name.replace(/^Unit \d+: /, ''));
      o.value = u.code;
      us.appendChild(o);
    });
    const ys = $('#f-year');
    [...new Set(data.papers.map((p) => p.year))].sort((a, b) => b - a).forEach((y) => {
      const o = el('option', null, String(y));
      o.value = String(y);
      ys.appendChild(o);
    });
  }

  function matches(p) {
    if (state.unit && p.code !== state.unit) return false;
    if (state.year && String(p.year) !== state.year) return false;
    if (state.show === 'done' && !done.has(p.id)) return false;
    if (state.show === 'todo' && done.has(p.id)) return false;
    return true;
  }

  function row(p) {
    const isDone = done.has(p.id);
    const li = el('li', 'pp-row' + (isDone ? ' is-done' : ''));
    li.dataset.id = p.id;
    const info = el('div', 'pp-info');
    info.appendChild(el('strong', 'pp-name', unitLabel(p)));
    const u = units.get(p.code);
    info.appendChild(el('span', 'pp-code', p.code + (u ? ' · ' + (u.spec === '2018' ? 'current spec' : 'previous spec') : '') + ' · ' + sessionLabel(p)));
    li.appendChild(info);

    const acts = el('div', 'pp-actions');
    const qp = el('a', 'pp-dl pp-qp', 'Question paper');
    qp.href = url(p.qp);
    qp.dataset.qp = p.id;
    qp.title = 'Download the question paper' + size(p.qp) + '. This marks the paper done.';
    acts.appendChild(qp);
    if (p.ms) {
      const ms = el('a', 'pp-dl', 'Mark scheme');
      ms.href = url(p.ms);
      ms.title = 'Download the mark scheme' + size(p.ms);
      acts.appendChild(ms);
    }
    (p.extra || []).forEach((x) => {
      const a = el('a', 'pp-dl', x.label);
      a.href = url(x);
      a.title = 'Download' + size(x);
      acts.appendChild(a);
    });
    const b = el('button', 'act pp-done' + (isDone ? ' on' : ''), isDone ? 'Done ✓' : 'Mark done');
    b.type = 'button';
    b.dataset.done = p.id;
    b.setAttribute('aria-pressed', String(isDone));
    acts.appendChild(b);
    li.appendChild(acts);
    return li;
  }

  function progress() {
    const total = data.papers.length;
    const n = data.papers.filter((p) => done.has(p.id)).length;
    $('#progress-text').textContent = n + ' of ' + total + ' papers done' + (n ? ' (' + Math.round((100 * n) / total) + '%)' : '');
    $('#progress-bar').style.width = (total ? (100 * n) / total : 0) + '%';
  }

  function render() {
    const list = $('#list');
    list.textContent = '';
    const shown = data.papers.filter(matches);
    const groups = new Map();
    shown.forEach((p) => {
      const k = sessionKey(p);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(p);
    });
    const frag = document.createDocumentFragment();
    groups.forEach((papers) => {
      const sec = el('section', 'pp-session');
      const h = el('h2', null, sessionLabel(papers[0]));
      const all = data.papers.filter((p) => sessionKey(p) === sessionKey(papers[0]));
      h.appendChild(el('span', 'pp-session-count', all.filter((p) => done.has(p.id)).length + ' of ' + all.length + ' done'));
      sec.appendChild(h);
      const ul = el('ul');
      papers.forEach((p) => ul.appendChild(row(p)));
      sec.appendChild(ul);
      frag.appendChild(sec);
    });
    list.appendChild(frag);
    $('#count').textContent = shown.length + ' of ' + data.papers.length + ' papers';
    $('#empty').hidden = shown.length > 0;
    progress();
  }

  function setDone(id, on) {
    if (on) done.add(id); else done.delete(id);
    save();
    // Redraw just this paper (and its session's count) so the list does not jump.
    const li = $('#list .pp-row[data-id="' + id + '"]');
    const p = data.papers.find((x) => x.id === id);
    if (state.show && li) { render(); return; }
    if (li && p) {
      li.replaceWith(row(p));
      const sec = $('#list .pp-row[data-id="' + id + '"]').closest('.pp-session');
      const all = data.papers.filter((x) => sessionKey(x) === sessionKey(p));
      sec.querySelector('.pp-session-count').textContent = all.filter((x) => done.has(x.id)).length + ' of ' + all.length + ' done';
    }
    progress();
  }

  function bind() {
    $('#f-unit').addEventListener('change', (e) => { state.unit = e.target.value; render(); keepFilters(); });
    $('#f-year').addEventListener('change', (e) => { state.year = e.target.value; render(); keepFilters(); });
    $('#f-show').addEventListener('change', (e) => { state.show = e.target.value; render(); keepFilters(); });
    $('#list').addEventListener('click', (e) => {
      const qp = e.target.closest('a[data-qp]');
      // Let the download go ahead; just record it. Done after the browser has started it,
      // so a redraw cannot get in the way of the tap.
      if (qp) { setTimeout(() => setDone(qp.dataset.qp, true), 0); return; }
      const b = e.target.closest('[data-done]');
      if (b) setDone(b.dataset.done, !done.has(b.dataset.done));
    });
  }

  // The filters are kept in the address (?unit=, ?year=, ?show=), so reloading the page or
  // "Continue" in the navigation bar (js/nav.js, told by the ialqb-papers event) brings them back.
  function keepFilters() {
    const u = new URL(location.href);
    [['unit', state.unit], ['year', state.year], ['show', state.show]].forEach(([k, v]) => {
      if (v) u.searchParams.set(k, v); else u.searchParams.delete(k);
    });
    try { history.replaceState(null, '', u.href); } catch (e) { /* address cannot change here */ }
    window.dispatchEvent(new Event('ialqb-papers'));
  }

  function readFilters() {
    [['unit', '#f-unit'], ['year', '#f-year'], ['show', '#f-show']].forEach(([k, sel]) => {
      const v = params.get(k);
      const box = $(sel);
      if (v && Array.from(box.options).some((o) => o.value === v)) {
        box.value = v;
        state[k] = v;
      }
    });
  }

  function init(json) {
    data = json;
    units = new Map(data.units.map((u) => [u.code, u]));
    buildFilters();
    readFilters();
    bind();
    render();
    window.dispatchEvent(new Event('ialqb-papers'));
    $('#loading').hidden = true;
    $('#app').hidden = false;
  }

  buildHeading();
  fetch('data/papers-' + subject + '.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(init)
    .catch((err) => {
      $('#loading').hidden = true;
      const s = $('#soon');
      s.hidden = false;
      s.textContent = 'The list of papers could not be loaded (' + err.message + '). Try reloading the page.';
    });
})();
