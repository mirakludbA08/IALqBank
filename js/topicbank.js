/* IALqBank topic bank.
   Loads data/<subject>.json (built from the sorted past-paper bank) and shows every question part as a
   screenshot with notes on how it is asked, what the mark scheme rewards, where the paper is, and which
   earlier questions it depends on. Questions are filtered by the Unit > Topic > Spec point tree, by
   search, year and marks. "Hence" parts are shown bundled with the part they build on. */
(function () {
  'use strict';

  const SUBJECTS = {
    physics: { label: 'Physics' },
    chemistry: { label: 'Chemistry' },
    biology: { label: 'Biology', soon: true },
    maths: { label: 'Maths', soon: true }
  };
  const PAGE = 30;
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

  const store = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage blocked */ } }
  };
  const KEY_DONE = 'ialqb_tb_done_' + subject;
  const KEY_LATER = 'ialqb_tb_later_' + subject;
  const done = new Set(store.get(KEY_DONE));
  const later = new Set(store.get(KEY_LATER));

  let data = null;
  let byId = new Map();
  let state = { path: [], q: '', year: '', marks: '', unit: '', hide: false, only: null, shown: PAGE, sort: 'new' };

  function buildTabs() {
    const nav = $('.subject-tabs');
    nav.textContent = '';
    Object.keys(SUBJECTS).forEach((key) => {
      const a = el('a', 'subject-tab' + (key === subject ? ' active' : '') + (SUBJECTS[key].soon ? ' soon' : ''), SUBJECTS[key].label);
      a.href = 'questions.html?s=' + key;
      a.dataset.subject = key;
      nav.appendChild(a);
    });
  }

  // Pearson paper codes: W + PH/CH + spec digit + unit digit. WPH11 = Physics, current (2018) spec, Unit 1;
  // WPH04 = Physics, previous (2013) spec, Unit 4. Units 1-3 are International AS, units 4-6 are A2.
  const UNIT_NAMES = {
    physics: {
      1: 'Mechanics and Materials', 2: 'Waves and Electricity', 3: 'Practical Skills in Physics I',
      4: 'Further Mechanics, Fields and Particles', 5: 'Thermodynamics, Radiation, Oscillations and Cosmology',
      6: 'Practical Skills in Physics II', 7: 'Physics Practical Examination'
    },
    chemistry: {
      1: 'Structure, Bonding and Introduction to Organic Chemistry',
      2: 'Energetics, Group Chemistry, Halogenoalkanes and Analytical Techniques',
      3: 'Practical Skills in Chemistry I', 4: 'Rates, Equilibria and Further Organic Chemistry',
      5: 'Transition Metals and Organic Nitrogen Chemistry', 6: 'Practical Skills in Chemistry II',
      7: 'Chemistry Practical Examination'
    }
  };
  const MONTHS = { Jan: 'January', Feb: 'February', May: 'May', Jun: 'June', Oct: 'October', Nov: 'November' };

  function unitInfo(code) {
    const m = /^W(PH|CH)(\d)(\d)$/.exec(code || '');
    if (!m) return { code: code, short: code, name: '', level: '', spec: '' };
    const spec = m[2] === '1' ? 'current 2018 specification' : 'previous 2013 specification';
    const n = parseInt(m[3], 10);
    const level = n === 7 ? 'practical examination' : (n <= 3 ? 'International AS' : 'International A2');
    const name = (UNIT_NAMES[subject] || {})[n] || '';
    return { code: code, n: n, short: 'Unit ' + n, name: name, level: level, spec: spec };
  }

  function sessionLabel(it) { return (MONTHS[it.month] || it.month) + ' ' + it.year; }

  function paperLabel(it) {
    const u = unitInfo(it.unit);
    return SUBJECTS[subject].label + ' ' + u.short + ' · ' + sessionLabel(it);
  }

  function paperLine(it) {
    const u = unitInfo(it.unit);
    return SUBJECTS[subject].label + ' ' + u.short + (u.name ? ': ' + u.name : '') + ' (' + u.level + ', ' + u.spec + ') · ' + sessionLabel(it) + ' · paper code ' + it.unit;
  }

  function partLabel(it) {
    if (!it.part) return 'Q' + it.q;
    return 'Q' + it.q + '(' + it.part.split('+').join(') + (') + ')';
  }

  function pathKey(path) { return path.join(' > '); }

  function buildTree() {
    const tree = new Map();
    data.items.forEach((it) => {
      const p = it.path || ['Unmapped', 'Unmapped', 'none'];
      let u = tree.get(p[0]);
      if (!u) { u = { name: p[0], count: 0, kids: new Map() }; tree.set(p[0], u); }
      u.count++;
      let t = u.kids.get(p[1]);
      if (!t) { t = { name: p[1], count: 0, kids: new Map() }; u.kids.set(p[1], t); }
      t.count++;
      let s = t.kids.get(p[2]);
      if (!s) { s = { name: p[2], count: 0 }; t.kids.set(p[2], s); }
      s.count++;
    });
    const host = $('#tree');
    host.textContent = '';
    const all = el('button', 'tree-all', 'All topics (' + data.items.length + ')');
    all.type = 'button';
    all.dataset.path = '';
    host.appendChild(all);
    [...tree.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((u) => {
      const d1 = el('details', 'tree-unit');
      const s1 = el('summary', null, u.name + ' (' + u.count + ')');
      s1.dataset.path = u.name;
      d1.appendChild(s1);
      [...u.kids.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((t) => {
        const d2 = el('details', 'tree-topic');
        const s2 = el('summary', null, t.name + ' (' + t.count + ')');
        s2.dataset.path = pathKey([u.name, t.name]);
        d2.appendChild(s2);
        [...t.kids.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((s) => {
          const b = el('button', 'tree-leaf', s.name + ' (' + s.count + ')');
          b.type = 'button';
          b.dataset.path = pathKey([u.name, t.name, s.name]);
          d2.appendChild(b);
        });
        d1.appendChild(d2);
      });
      host.appendChild(d1);
    });
  }

  function buildFilters() {
    const years = [...new Set(data.items.map((i) => i.year))].sort((a, b) => b - a);
    const ys = $('#f-year');
    years.forEach((y) => { const o = el('option', null, String(y)); o.value = String(y); ys.appendChild(o); });
    const us = $('#f-unit');
    const groups = new Map();
    data.items.forEach((i) => {
      const n = unitInfo(i.unit).n;
      if (!groups.has(n)) groups.set(n, new Set());
      groups.get(n).add(i.unit);
    });
    [...groups.keys()].sort((a, b) => a - b).forEach((n) => {
      const codes = [...groups.get(n)].sort();
      const u = unitInfo(codes[0]);
      const o = el('option', null, 'Unit ' + n + ': ' + u.name + ' (' + codes.join(', ') + ')');
      o.value = codes.join(',');
      us.appendChild(o);
    });
    buildCodesPanel(groups);
  }

  function buildCodesPanel(groups) {
    const host = $('#codes-body');
    host.textContent = '';
    const label = SUBJECTS[subject].label;
    const pre = subject === 'physics' ? 'WPH' : 'WCH';
    const code = subject === 'physics' ? 'PH' : 'CH';
    const p1 = el('p');
    p1.appendChild(document.createTextNode('Pearson gives every exam paper a code, such as '));
    p1.appendChild(el('strong', null, pre + '11'));
    p1.appendChild(document.createTextNode('. Read it in four parts:'));
    host.appendChild(p1);
    const ul = el('ul');
    [
      ['W', 'a Pearson Edexcel International Advanced Level paper.'],
      [code, label + ' (the subject).'],
      ['1 or 0', 'the first digit is the specification. 1 means the current 2018 specification (' + pre + '11 to ' + pre + '16); 0 means the previous 2013 specification (' + pre + '01 to ' + pre + '07), which this bank files under the closest 2018 topic.'],
      ['1 to 7', 'the last digit is the unit number. Units 1 to 3 are the International AS; units 4 to 6 are the A2; unit 7 (previous specification, 2017 only) was a practical examination.']
    ].forEach((r) => {
      const li = el('li');
      li.appendChild(el('strong', null, r[0] + ': '));
      li.appendChild(document.createTextNode(r[1]));
      ul.appendChild(li);
    });
    host.appendChild(ul);
    host.appendChild(el('p', null, 'So ' + pre + '11 is ' + label + ', Unit 1, current specification. ' + pre + '04 is ' + label + ', Unit 4, previous specification. "Q13(b)" means question 13, part (b). An item ID joins the paper code, the exam session and the question: ' + pre + '11_Oct2019-Q13-b is ' + label + ' Unit 1, October 2019, question 13 part (b).'));
    const tbl = el('table', 'codes-table');
    const head = el('tr');
    ['Unit', 'Name', 'Level', 'Paper codes in this bank'].forEach((h) => head.appendChild(el('th', null, h)));
    tbl.appendChild(head);
    [...groups.keys()].sort((a, b) => a - b).forEach((n) => {
      const codes = [...groups.get(n)].sort();
      const u = unitInfo(codes[0]);
      const tr = el('tr');
      [String(n), u.name, u.level, codes.join(', ')].forEach((t) => tr.appendChild(el('td', null, t)));
      tbl.appendChild(tr);
    });
    host.appendChild(tbl);
  }

  function matches(it) {
    if (state.only) return it.id === state.only;
    if (state.path.length) {
      const p = it.path || [];
      for (let i = 0; i < state.path.length; i++) if (p[i] !== state.path[i]) return false;
    }
    if (state.year && String(it.year) !== state.year) return false;
    if (state.unit && state.unit.split(',').indexOf(it.unit) === -1) return false;
    if (state.marks) {
      const m = it.marks || 0;
      if (state.marks === '1' && m !== 1) return false;
      if (state.marks === '2-4' && (m < 2 || m > 4)) return false;
      if (state.marks === '5-8' && (m < 5 || m > 8)) return false;
      if (state.marks === '9+' && m < 9) return false;
    }
    if (state.hide && done.has(it.id)) return false;
    if (state.q) {
      const ui = unitInfo(it.unit);
      const hay = (it.id + ' ' + (it.name || '') + ' ' + (it.how || '') + ' ' + (it.ms || '') + ' ' + (it.topic || '') + ' ' + (it.also || []).join(' ') + ' ' + ui.short + ' ' + ui.name + ' ' + sessionLabel(it)).toLowerCase();
      return state.q.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  }

  function sorted(list) {
    const key = state.sort;
    const c = list.slice();
    if (key === 'new') c.sort((a, b) => b.year - a.year || a.paper.localeCompare(b.paper) || a.q - b.q || String(a.part).localeCompare(String(b.part)));
    else if (key === 'old') c.sort((a, b) => a.year - b.year || a.paper.localeCompare(b.paper) || a.q - b.q || String(a.part).localeCompare(String(b.part)));
    else if (key === 'marks') c.sort((a, b) => (b.marks || 0) - (a.marks || 0));
    else c.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return c;
  }

  function card(it) {
    const art = el('article', 'qcard' + (done.has(it.id) ? ' is-done' : '') + (later.has(it.id) ? ' is-later' : ''));
    art.id = 'q-' + it.id;
    const head = el('header', 'qcard-head');
    head.appendChild(el('h3', 'qcard-name', it.name || it.id));
    const meta = el('div', 'qcard-meta');
    meta.appendChild(el('span', 'chip chip-paper', paperLabel(it) + ' · ' + partLabel(it)));
    if (it.marks != null) meta.appendChild(el('span', 'chip', it.marks + (it.marks === 1 ? ' mark' : ' marks')));
    if (it.topic) meta.appendChild(el('span', 'chip chip-topic', it.topic));
    (it.also || []).forEach((c) => meta.appendChild(el('span', 'chip chip-also', c)));
    if (it.bundle) meta.appendChild(el('span', 'chip chip-hence', 'Hence pair: saved together'));
    head.appendChild(meta);
    art.appendChild(head);
    art.appendChild(el('p', 'qcard-paper', 'Paper: ' + paperLine(it)));
    art.appendChild(el('p', 'qcard-id', 'Item ID: ' + it.id));

    if (it.img) {
      const im = document.createElement('img');
      im.className = 'qcard-img';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = it.img;
      im.alt = 'Screenshot of ' + (it.name || it.id) + ' from ' + paperLabel(it) + ', ' + partLabel(it);
      art.appendChild(im);
    }

    if (it.deps && it.deps.length) {
      const box = el('div', 'qcard-deps');
      box.appendChild(el('strong', null, 'Do these first'));
      const ul = el('ul');
      it.deps.forEach((d) => {
        const li = el('li');
        const b = el('button', 'link-btn', d.name || d.id);
        b.type = 'button';
        b.dataset.goto = d.id;
        li.appendChild(b);
        li.appendChild(el('span', 'dep-meta', ' · ' + d.id + (d.why ? ' · ' + d.why : '')));
        ul.appendChild(li);
      });
      box.appendChild(ul);
      art.appendChild(box);
    }

    const notes = el('details', 'qcard-notes');
    notes.appendChild(el('summary', null, 'How it is asked and what the mark scheme wants'));
    const n1 = el('p');
    n1.appendChild(el('strong', null, 'How it is asked: '));
    n1.appendChild(document.createTextNode(it.how || 'Not recorded.'));
    const n2 = el('p');
    n2.appendChild(el('strong', null, 'Mark scheme: '));
    n2.appendChild(document.createTextNode(it.ms || 'Not recorded.'));
    notes.appendChild(n1);
    notes.appendChild(n2);
    art.appendChild(notes);

    const loc = el('details', 'qcard-loc');
    loc.appendChild(el('summary', null, 'Paper location'));
    const l1 = el('p', null, 'Question paper: ' + (it.qp || 'unknown'));
    const l2 = el('p', null, 'Mark scheme: ' + (it.msf || 'unknown'));
    const l3 = el('p', null, 'Pages in the paper: ' + (it.pages ? it.pages[0] + (it.pages[1] !== it.pages[0] ? '–' + it.pages[1] : '') : 'unknown'));
    loc.appendChild(l1); loc.appendChild(l2); loc.appendChild(l3);
    art.appendChild(loc);

    const actions = el('div', 'qcard-actions');
    const bDone = el('button', 'act' + (done.has(it.id) ? ' on' : ''), done.has(it.id) ? 'Done ✓' : 'Mark done');
    bDone.type = 'button'; bDone.dataset.act = 'done'; bDone.dataset.id = it.id;
    const bLater = el('button', 'act' + (later.has(it.id) ? ' on' : ''), later.has(it.id) ? 'In review later' : 'Review later');
    bLater.type = 'button'; bLater.dataset.act = 'later'; bLater.dataset.id = it.id;
    actions.appendChild(bDone); actions.appendChild(bLater);
    art.appendChild(actions);
    return art;
  }

  let current = [];
  function render(reset) {
    if (reset) state.shown = PAGE;
    current = sorted(data.items.filter(matches));
    const list = $('#qlist');
    list.textContent = '';
    const frag = document.createDocumentFragment();
    current.slice(0, state.shown).forEach((it) => frag.appendChild(card(it)));
    list.appendChild(frag);
    const bits = [current.length + ' of ' + data.items.length + ' items'];
    if (state.path.length) bits.push(state.path[state.path.length - 1]);
    $('#count').textContent = bits.join(' · ');
    const more = $('#more');
    more.hidden = current.length <= state.shown;
    more.textContent = 'Show ' + Math.min(PAGE, current.length - state.shown) + ' more';
    const back = $('#back');
    back.hidden = !state.only;
    $('#empty').hidden = current.length > 0;
  }

  function setPath(path) {
    state.path = path ? path.split(' > ') : [];
    state.only = null;
    document.querySelectorAll('#tree .active').forEach((n) => n.classList.remove('active'));
    const target = document.querySelector('#tree [data-path="' + (path || '').replace(/"/g, '\\"') + '"]');
    if (target) target.classList.add('active');
    render(true);
    $('#qlist').scrollIntoView({ block: 'start' });
  }

  function bind() {
    $('#tree').addEventListener('click', (e) => {
      const t = e.target.closest('[data-path]');
      if (!t) return;
      if (t.tagName === 'SUMMARY') { setPath(t.dataset.path); return; }
      setPath(t.dataset.path);
    });
    $('#f-search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); state.only = null; render(true); });
    $('#f-year').addEventListener('change', (e) => { state.year = e.target.value; render(true); });
    $('#f-unit').addEventListener('change', (e) => { state.unit = e.target.value; render(true); });
    $('#f-marks').addEventListener('change', (e) => { state.marks = e.target.value; render(true); });
    $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(true); });
    $('#f-hide').addEventListener('change', (e) => { state.hide = e.target.checked; render(true); });
    $('#more').addEventListener('click', () => { state.shown += PAGE; render(false); });
    $('#back').addEventListener('click', () => { state.only = null; render(true); });
    $('#topics-toggle').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); });
    $('#qlist').addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) {
        const id = g.dataset.goto;
        if (byId.has(id)) { state.only = id; render(true); $('#qlist').scrollIntoView({ block: 'start' }); }
        return;
      }
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const id = a.dataset.id;
      const set = a.dataset.act === 'done' ? done : later;
      if (set.has(id)) set.delete(id); else set.add(id);
      store.set(a.dataset.act === 'done' ? KEY_DONE : KEY_LATER, [...set]);
      const art = a.closest('.qcard');
      const fresh = card(byId.get(id));
      if (state.hide && done.has(id)) art.remove(); else art.replaceWith(fresh);
    });
  }

  function init(json) {
    data = json;
    byId = new Map(data.items.map((i) => [i.id, i]));
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    $('#blurb-count').textContent = data.count.toLocaleString() + ' question parts from 2014 to 2024 papers, sorted by Unit, topic and specification point.';
    buildTree();
    buildFilters();
    bind();
    render(true);
    $('#loading').hidden = true;
    $('#codes').hidden = false;
    $('#app').hidden = false;
  }

  function soon() {
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    $('#loading').hidden = true;
    const s = $('#soon');
    s.hidden = false;
    s.textContent = SUBJECTS[subject].label + ' is not in the bank yet: the International A Level papers for this subject have not been added. Physics and Chemistry are ready.';
  }

  buildTabs();
  if (SUBJECTS[subject].soon) { soon(); return; }
  fetch('data/' + subject + '.json')
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(init)
    .catch((err) => {
      $('#loading').hidden = true;
      const s = $('#soon');
      s.hidden = false;
      s.textContent = 'The question data could not be loaded (' + err.message + '). Try reloading the page.';
    });
})();
