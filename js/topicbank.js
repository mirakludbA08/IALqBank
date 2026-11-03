/* IALqBank topic bank.
   Loads data/<subject>.json (built from the sorted past-paper bank) and shows every question part as a
   screenshot with notes on how it is asked, what the mark scheme rewards, where the paper is, and which
   earlier questions it depends on. Questions are filtered by the Unit > Topic > Spec point tree, by
   search, year and marks. "Hence" parts are shown bundled with the part they build on.
   The tree shows how many questions are done in each Unit, topic and spec point; keyboard
   shortcuts move between questions and mark them; the topic is kept in the address, and where
   you left off is saved for "Continue" in the navigation bar and on the landing page. */
(function () {
  'use strict';

  const SUBJECTS = {
    physics: { label: 'Physics' },
    chemistry: { label: 'Chemistry' },
    biology: { label: 'Biology' },
    maths: { label: 'Maths' }
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
  const KEY_SEL = 'ialqb_tb_sel_' + subject;
  // Read by the navigation bar (js/nav.js) and the landing page (js/landing.js).
  const KEY_TOTAL = 'ialqb_tb_total_' + subject;        // how many questions the subject has
  const KEY_PROGRESS = 'ialqb_tb_progress_' + subject;  // done and total per Unit
  const KEY_LAST = 'ialqb_last_' + subject;             // where this subject was left: topic and question
  const KEY_LAST_ANY = 'ialqb_last';                    // the same, for the subject used last
  const done = new Set(store.get(KEY_DONE));
  const later = new Set(store.get(KEY_LATER));
  const selected = new Set(store.get(KEY_SEL));   // questions picked for the QP / MS download
  const readJson = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  const writeJson = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage blocked */ } };

  let data = null;
  let byId = new Map();
  let state = { path: [], q: '', year: '', marks: '', unit: '', show: '', only: null, shown: PAGE, sort: 'new' };

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
    },
    biology: {
      1: 'Molecules, Diet, Transport and Health', 2: 'Cells, Development, Biodiversity and Conservation',
      3: 'Practical Skills in Biology I', 4: 'Energy, Environment, Microbiology and Immunity',
      5: 'Respiration, Internal Environment, Coordination and Gene Technology', 6: 'Practical Skills in Biology II'
    }
  };
  // Maths paper codes: the two letters after W name the strand (MA Pure, FM Further Pure, ME Mechanics,
  // ST Statistics, DM Decision) and the two digits the unit in that strand. WMA01/WMA02 are the earlier
  // versions of Pure 1 and Pure 2; WDM01 is the earlier Decision 1.
  const MATHS_UNITS = {
    WMA11: ['P1', 'Pure Mathematics 1'], WMA01: ['P1', 'Pure Mathematics 1'],
    WMA12: ['P2', 'Pure Mathematics 2'], WMA02: ['P2', 'Pure Mathematics 2'],
    WMA13: ['P3', 'Pure Mathematics 3'], WMA14: ['P4', 'Pure Mathematics 4'],
    WFM01: ['FP1', 'Further Pure Mathematics 1'], WFM02: ['FP2', 'Further Pure Mathematics 2'], WFM03: ['FP3', 'Further Pure Mathematics 3'],
    WME01: ['M1', 'Mechanics 1'], WME02: ['M2', 'Mechanics 2'], WME03: ['M3', 'Mechanics 3'],
    WST01: ['S1', 'Statistics 1'], WST02: ['S2', 'Statistics 2'], WST03: ['S3', 'Statistics 3'],
    WDM11: ['D1', 'Decision Mathematics 1'], WDM01: ['D1', 'Decision Mathematics 1']
  };
  const MATHS_ORDER = ['P1', 'P2', 'P3', 'P4', 'FP1', 'FP2', 'FP3', 'M1', 'M2', 'M3', 'S1', 'S2', 'S3', 'D1'];
  const MATHS_OLD = ['WMA01', 'WMA02', 'WDM01'];
  const MONTHS = { Jan: 'January', Feb: 'February', May: 'May', Jun: 'June', Oct: 'October', Nov: 'November' };

  function unitInfo(code) {
    if (subject === 'maths') {
      const mu = MATHS_UNITS[code];
      if (!mu) return { code: code, n: 99, short: code, name: '', level: '', spec: '' };
      return { code: code, n: MATHS_ORDER.indexOf(mu[0]) + 1, short: 'Unit ' + mu[0], label: mu[0], name: mu[1], level: '',
        spec: MATHS_OLD.indexOf(code) >= 0 ? 'previous specification' : 'current specification' };
    }
    const m = /^W(PH|CH|BI)(\d)(\d)$/.exec(code || '');
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
    const extra = [u.level, u.spec].filter(Boolean).join(', ');
    return SUBJECTS[subject].label + ' ' + u.short + (u.name ? ': ' + u.name : '') + (extra ? ' (' + extra + ')' : '') + ' · ' + sessionLabel(it) + ' · paper code ' + it.unit;
  }

  function partLabel(it) {
    if (!it.part) return 'Q' + it.q;
    return 'Q' + it.q + '(' + it.part.split('+').join(') + (') + ')';
  }

  function pathKey(path) { return path.join(' > '); }

  /* ---------- Progress through the topic tree ----------
     Every Unit, topic and spec point in the tree shows how many of its questions are done, and
     each Unit has a bar. Keys: '' for everything, then the Unit, "Unit > Topic" and
     "Unit > Topic > point". Marking a question done updates the four counts it belongs to. */
  const nodes = new Map();
  const itemPath = (it) => it.path || ['Unmapped', 'Unmapped', 'none'];
  const keysOf = (it) => {
    const p = itemPath(it);
    return ['', p[0], pathKey([p[0], p[1]]), pathKey(p)];
  };

  function treeLabel(host, name, key, withBar) {
    const n = nodes.get(key);
    host.appendChild(el('span', 'tree-name', name));
    n.count = el('span', 'tree-count');
    n.count.setAttribute('aria-hidden', 'true');
    n.spoken = el('span', 'tb-sr');
    host.append(n.count, n.spoken);
    if (withBar) {
      const bar = el('span', 'tree-bar');
      bar.setAttribute('aria-hidden', 'true');
      n.bar = el('span');
      bar.appendChild(n.bar);
      host.appendChild(bar);
    }
    paintNode(key);
  }

  function paintNode(key) {
    const n = nodes.get(key);
    if (!n || !n.count) return;
    n.count.textContent = n.done ? n.done.toLocaleString() + '/' + n.total.toLocaleString() : n.total.toLocaleString();
    n.count.classList.toggle('is-started', n.done > 0);
    n.count.classList.toggle('is-complete', n.done === n.total);
    n.spoken.textContent = ', ' + n.done + ' of ' + n.total + ' done';
    if (n.bar) n.bar.style.width = (n.total ? (100 * n.done) / n.total : 0) + '%';
  }

  // Done and total per Unit, for the navigation bar's menus and the landing page.
  function saveProgress() {
    const units = {};
    nodes.forEach((n, key) => {
      const m = !key.includes(' > ') && /^Unit (\S+)/.exec(key);
      if (m) units[m[1]] = [n.done, n.total];
    });
    const all = nodes.get('');
    writeJson(KEY_PROGRESS, { units: units, all: all ? [all.done, all.total] : null });
  }

  function bumpProgress(it, delta) {
    keysOf(it).forEach((k) => {
      const n = nodes.get(k);
      if (n) { n.done += delta; paintNode(k); }
    });
    saveProgress();
  }

  function buildTree() {
    const tree = new Map();
    nodes.clear();
    data.items.forEach((it) => {
      const p = itemPath(it);
      keysOf(it).forEach((k) => {
        let n = nodes.get(k);
        if (!n) { n = { total: 0, done: 0, count: null, spoken: null, bar: null }; nodes.set(k, n); }
        n.total++;
        if (done.has(it.id)) n.done++;
      });
      let u = tree.get(p[0]);
      if (!u) { u = { name: p[0], kids: new Map() }; tree.set(p[0], u); }
      let t = u.kids.get(p[1]);
      if (!t) { t = { name: p[1], kids: new Map() }; u.kids.set(p[1], t); }
      if (!t.kids.has(p[2])) t.kids.set(p[2], { name: p[2] });
    });
    const host = $('#tree');
    host.textContent = '';
    const all = el('button', 'tree-all');
    all.type = 'button';
    all.dataset.path = '';
    treeLabel(all, 'All topics', '', true);
    host.appendChild(all);
    const unitKey = (name) => {
      if (subject !== 'maths') return null;
      const m = /^Unit (\S+)/.exec(name);
      const i = m ? MATHS_ORDER.indexOf(m[1]) : -1;
      return i < 0 ? 99 : i;
    };
    [...tree.values()].sort((a, b) => {
      const ka = unitKey(a.name);
      const kb = unitKey(b.name);
      if (ka !== null && ka !== kb) return ka - kb;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    }).forEach((u) => {
      const d1 = el('details', 'tree-unit');
      const s1 = el('summary');
      s1.dataset.path = u.name;
      treeLabel(s1, u.name, u.name, true);
      d1.appendChild(s1);
      [...u.kids.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((t) => {
        const d2 = el('details', 'tree-topic');
        const s2 = el('summary');
        s2.dataset.path = pathKey([u.name, t.name]);
        treeLabel(s2, t.name, s2.dataset.path, false);
        d2.appendChild(s2);
        [...t.kids.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })).forEach((s) => {
          const b = el('button', 'tree-leaf');
          b.type = 'button';
          b.dataset.path = pathKey([u.name, t.name, s.name]);
          treeLabel(b, s.name, b.dataset.path, false);
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
      const o = el('option', null, 'Unit ' + (u.label || n) + ': ' + u.name + ' (' + codes.join(', ') + ')');
      o.value = codes.join(',');
      us.appendChild(o);
    });
    buildCodesPanel(groups);
  }

  function buildCodesPanel(groups) {
    const host = $('#codes-body');
    host.textContent = '';
    const label = SUBJECTS[subject].label;
    if (subject === 'maths') {
      const pm = el('p');
      pm.appendChild(document.createTextNode('Pearson gives every exam paper a code, such as '));
      pm.appendChild(el('strong', null, 'WMA11'));
      pm.appendChild(document.createTextNode('. Read it in three parts:'));
      host.appendChild(pm);
      const um = el('ul');
      [
        ['W', 'a Pearson Edexcel International Advanced Level paper.'],
        ['The two letters', 'the strand: MA is Pure Mathematics, FM is Further Pure Mathematics, ME is Mechanics, ST is Statistics, DM is Decision Mathematics.'],
        ['The two digits', 'the unit within that strand. WMA11 is Pure Mathematics 1 (P1), WMA12 is P2, WMA13 is P3 and WMA14 is P4; WFM01 is Further Pure 1 (FP1); WME01 is Mechanics 1 (M1); WST01 is Statistics 1 (S1); WDM11 is Decision 1 (D1). WMA01, WMA02 and WDM01 are the earlier versions of P1, P2 and D1 from the previous specification.']
      ].forEach((r) => {
        const li = el('li');
        li.appendChild(el('strong', null, r[0] + ': '));
        li.appendChild(document.createTextNode(r[1]));
        um.appendChild(li);
      });
      host.appendChild(um);
      host.appendChild(el('p', null, '"Q7(b)" means question 7, part (b). An item ID joins the paper code, the exam session and the question: WMA12_Jun2021-Q7-b is Pure Mathematics 2, June 2021, question 7 part (b).'));
      const tm = el('table', 'codes-table');
      const hm = el('tr');
      ['Unit', 'Name', 'Paper codes in this bank'].forEach((h) => hm.appendChild(el('th', null, h)));
      tm.appendChild(hm);
      [...groups.keys()].sort((a, b) => a - b).forEach((n) => {
        const codes = [...groups.get(n)].sort();
        const u = unitInfo(codes[0]);
        const tr = el('tr');
        [u.label, u.name, codes.join(', ')].forEach((t) => tr.appendChild(el('td', null, t)));
        tm.appendChild(tr);
      });
      host.appendChild(tm);
      return;
    }
    const pre = { physics: 'WPH', chemistry: 'WCH', biology: 'WBI' }[subject];
    const code = { physics: 'PH', chemistry: 'CH', biology: 'BI' }[subject];
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
    if (state.show === 'todo' && done.has(it.id)) return false;
    if (state.show === 'done' && !done.has(it.id)) return false;
    if (state.show === 'later' && !later.has(it.id)) return false;
    if (state.show === 'sel' && !selected.has(it.id)) return false;
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
    const art = el('article', 'qcard' + (done.has(it.id) ? ' is-done' : '') + (later.has(it.id) ? ' is-later' : '') + (selected.has(it.id) ? ' is-selected' : '') + (it.id === currentId ? ' is-current' : ''));
    art.id = 'q-' + it.id;
    art.tabIndex = -1;   // the keyboard shortcuts move focus from card to card
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
    const bSel = el('button', 'act act-sel' + (selected.has(it.id) ? ' on' : ''), selected.has(it.id) ? 'Selected ✓' : 'Select for download');
    bSel.type = 'button'; bSel.dataset.act = 'sel'; bSel.dataset.id = it.id;
    bSel.setAttribute('aria-pressed', String(selected.has(it.id)));
    actions.appendChild(bSel); actions.appendChild(bDone); actions.appendChild(bLater);
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
    updateCount();
    const more = $('#more');
    more.hidden = current.length <= state.shown;
    more.textContent = 'Show ' + Math.min(PAGE, current.length - state.shown) + ' more';
    const back = $('#back');
    back.hidden = !state.only;
    $('#empty').hidden = current.length > 0;
    updateBar();
  }

  function updateCount() {
    const n = current.length;
    const doneHere = current.reduce((t, it) => t + (done.has(it.id) ? 1 : 0), 0);
    const bits = [n.toLocaleString() + ' of ' + data.items.length.toLocaleString() + ' questions'];
    if (n) bits.push(doneHere.toLocaleString() + ' done');
    if (state.path.length) bits.push(state.path[state.path.length - 1]);
    $('#count').textContent = bits.join(' · ');
  }

  // Highlights the open topic in the tree. reveal also opens the Units and topics around it,
  // for a topic reached from the address or "Continue" rather than by clicking the tree.
  function markActive(reveal) {
    document.querySelectorAll('#tree .active').forEach((n) => n.classList.remove('active'));
    const key = pathKey(state.path);
    const target = Array.from(document.querySelectorAll('#tree [data-path]')).find((n) => n.dataset.path === key);
    if (!target) return;
    target.classList.add('active');
    if (reveal) {
      for (let d = target.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    }
  }

  const narrow = () => window.matchMedia('(max-width: 980px)').matches;

  function setPath(path, from) {
    state.path = path ? path.split(' > ') : [];
    state.only = null;
    markActive(false);
    render(true);
    // On a phone the topic list sits above the questions: put it away once a topic is picked.
    if (from && from.tagName === 'BUTTON' && narrow()) showTopics(false);
    $('#qlist').scrollIntoView({ block: 'start' });
    syncUrl(true);
    remember();
  }

  function showTopics(open) {
    $('#sidebar').classList.toggle('open', open);
    $('#topics-toggle').setAttribute('aria-expanded', String(open));
  }

  // One question on its own, from a "Do these first" link.
  function showOnly(id) {
    if (!byId.has(id)) return;
    state.only = id;
    render(true);
    $('#qlist').scrollIntoView({ block: 'start' });
    syncUrl(true);
    remember(id);
  }

  /* ---------- Done, review later and select ----------
     The card is redrawn in place, keeping its notes open and the focus on the same button;
     a card that no longer fits the "Show" filter is taken out of the list. */
  function toggle(act, id) {
    const it = byId.get(id);
    if (!it) return;
    const set = act === 'done' ? done : act === 'sel' ? selected : later;
    const on = !set.has(id);
    if (on) set.add(id); else set.delete(id);
    store.set(act === 'done' ? KEY_DONE : act === 'sel' ? KEY_SEL : KEY_LATER, [...set]);
    if (act === 'done') bumpProgress(it, on ? 1 : -1);
    const art = document.getElementById('q-' + id);
    if (art) {
      if (!matches(it)) {
        const next = art.nextElementSibling || art.previousElementSibling;
        art.remove();
        current = current.filter((x) => x.id !== id);
        if (currentId === id) setCurrent(next && next.id ? next.id.slice(2) : null, false, true);
      } else {
        redraw(art, it);
      }
    }
    updateCount();
    updateBar();
    remember(currentId || id);
  }

  function redraw(art, it) {
    const notesOpen = art.querySelector('.qcard-notes').open;
    const locOpen = art.querySelector('.qcard-loc').open;
    const focused = art.contains(document.activeElement) ? document.activeElement : null;
    const fresh = card(it);
    fresh.querySelector('.qcard-notes').open = notesOpen;
    fresh.querySelector('.qcard-loc').open = locOpen;
    art.replaceWith(fresh);
    if (focused) {
      const again = focused.dataset.act ? fresh.querySelector('[data-act="' + focused.dataset.act + '"]') : fresh;
      (again || fresh).focus({ preventScroll: true });
    }
    return fresh;
  }

  /* ---------- Keyboard shortcuts ----------
     J and K move an outline from question to question, and D, R, S and M act on the outlined
     one; / jumps to the search box and ? lists them all. Nothing happens while typing in a
     field or with Ctrl, Alt or Cmd held. Clicking or tabbing into a card outlines it too. */
  let currentId = null;
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const barHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-nav-h')) || 0;

  function setCurrent(id, scroll, focus) {
    const old = currentId && document.getElementById('q-' + currentId);
    if (old) old.classList.remove('is-current');
    currentId = id;
    const art = id && document.getElementById('q-' + id);
    if (!art) return null;
    art.classList.add('is-current');
    if (scroll) art.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
    if (scroll || focus) art.focus({ preventScroll: true });
    return art;
  }

  // The first question whose bottom edge is below the navigation bar.
  function firstOnScreen() {
    const top = barHeight() + 8;
    const cards = Array.from(document.querySelectorAll('#qlist .qcard'));
    return cards.find((c) => c.getBoundingClientRect().bottom > top) || cards[0] || null;
  }

  function step(dir) {
    const cards = Array.from(document.querySelectorAll('#qlist .qcard'));
    if (!cards.length) return;
    const i = cards.findIndex((c) => c.id === 'q-' + currentId);
    if (i < 0) {
      const first = firstOnScreen();
      if (first) { setCurrent(first.id.slice(2), true); remember(currentId); }
      return;
    }
    const j = i + dir;
    if (j < 0) return;
    if (j >= cards.length) {
      // Past the last card on the page: show the next batch and carry on into it.
      if (current.length > state.shown) { state.shown += PAGE; render(false); step(dir); }
      return;
    }
    setCurrent(cards[j].id.slice(2), true);
    remember(currentId);
  }

  function openKeys() {
    const d = $('#keys');
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }

  function onKey(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if ($('#keys').open || $('#app').hidden || document.documentElement.classList.contains('site-nav-lock')) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : '';
    if (!key) return;
    if (key === '?') { e.preventDefault(); openKeys(); return; }
    if (key === '/') { e.preventDefault(); $('#f-search').focus(); return; }
    if (key === 'j' || key === 'k') { e.preventDefault(); step(key === 'j' ? 1 : -1); return; }
    if ('drsm'.indexOf(key) < 0) return;
    let art = currentId && document.getElementById('q-' + currentId);
    if (!art) {
      const first = firstOnScreen();
      if (!first) return;
      art = setCurrent(first.id.slice(2), false, true);
    }
    e.preventDefault();
    if (key === 'm') {
      const notes = art.querySelector('.qcard-notes');
      notes.open = !notes.open;
      return;
    }
    toggle(key === 'd' ? 'done' : key === 'r' ? 'later' : 'sel', currentId);
  }

  /* ---------- Where you left off ----------
     The topic in view and the question being worked on are saved as you go, for "Continue" in
     the navigation bar and on the landing page. The topic is also kept in the address (?t=), so
     reloading or sharing the page keeps it, and Back goes to the previous topic. The navigation
     bar links to a Unit as ?unit=, the study reports to a spec point as ?code=, and "Continue"
     adds the question as ?at=. */
  let rememberTimer = 0;
  function remember(id) {
    clearTimeout(rememberTimer);
    rememberTimer = setTimeout(() => {
      const at = id ? byId.get(id) : null;
      const top = at || (firstOnScreen() ? byId.get(firstOnScreen().id.slice(2)) : null);
      const last = { s: subject, path: state.path, item: top ? top.id : null, name: top ? (top.name || top.id) : null, at: Date.now() };
      writeJson(KEY_LAST, last);
      writeJson(KEY_LAST_ANY, last);
    }, 300);
  }

  function readUrl() {
    const q = new URLSearchParams(location.search);
    let path = q.get('t') || '';
    if (path && !nodes.has(path)) path = '';
    const unit = q.get('unit');
    if (!path && unit) {
      const re = new RegExp('^Unit ' + unit.replace(/\W/g, '') + '\\b');
      path = Array.from(nodes.keys()).find((k) => k && k.indexOf(' > ') < 0 && re.test(k)) || '';
    }
    // A spec code (S25, C6.5, P1.2.3), as the study reports link to it: open its spec point.
    const code = q.get('code');
    if (!path && code) {
      const hit = data.items.find((it) => it.topic === code);
      if (hit) path = pathKey(itemPath(hit));
    }
    const item = q.get('item');
    return { path: path, only: item && byId.has(item) ? item : null, at: q.get('at') };
  }

  function syncUrl(push) {
    const u = new URL(location.href);
    u.searchParams.set('s', subject);
    u.searchParams.delete('unit');
    u.searchParams.delete('code');
    u.searchParams.delete('at');
    if (state.path.length) u.searchParams.set('t', pathKey(state.path)); else u.searchParams.delete('t');
    if (state.only) u.searchParams.set('item', state.only); else u.searchParams.delete('item');
    if (push) u.hash = '';
    if (u.href === location.href) return;
    try { history[push ? 'pushState' : 'replaceState'](null, '', u.href); } catch (err) { /* address cannot change here */ }
  }

  // Shows a question that may be further down the list than the first page of cards. Pictures
  // above it can still be loading and push it down, so it is lined up again once they settle,
  // unless the reader has started scrolling by then.
  function jumpTo(id) {
    const i = current.findIndex((it) => it.id === id);
    if (i < 0) return false;
    if (i >= state.shown) { state.shown = Math.ceil((i + 1) / PAGE) * PAGE; render(false); }
    let moved = false;
    const stop = () => { moved = true; };
    ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
    const line = () => {
      const art = document.getElementById('q-' + id);
      if (!moved && art && Math.abs(art.getBoundingClientRect().top - barHeight()) > 40) art.scrollIntoView({ block: 'start' });
    };
    setTimeout(() => { setCurrent(id, false, true); line(); }, 0);
    setTimeout(line, 500);
    setTimeout(line, 1400);
    return true;
  }

  function offerResume(saved) {
    if (!saved) return;
    const path = saved.path && saved.path.length && nodes.has(pathKey(saved.path)) ? saved.path : [];
    const item = saved.item && byId.has(saved.item) ? byId.get(saved.item) : null;
    if (!path.length && !item) return;
    const where = path.length ? path[path.length - 1] : 'All topics';
    $('#resume-text').textContent = 'Pick up where you left off: ' + where + (item ? ', at “' + (item.name || item.id) + '”' : '') + '.';
    $('#resume').hidden = false;
    $('#resume-go').addEventListener('click', () => {
      $('#resume').hidden = true;
      state.path = path.slice();
      state.only = null;
      markActive(true);
      render(true);
      syncUrl(true);
      if (!item || !jumpTo(item.id)) $('#qlist').scrollIntoView({ block: 'start' });
    });
    $('#resume-x').addEventListener('click', () => { $('#resume').hidden = true; });
  }

  function openCodes() {
    if (location.hash !== '#codes') return;
    const d = $('#codes');
    d.open = true;
    d.scrollIntoView({ block: 'start' });
  }

  function bind() {
    $('#tree').addEventListener('click', (e) => {
      const t = e.target.closest('[data-path]');
      if (!t) return;
      setPath(t.dataset.path, t);
    });
    $('#f-search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); state.only = null; render(true); });
    $('#f-year').addEventListener('change', (e) => { state.year = e.target.value; render(true); });
    $('#f-unit').addEventListener('change', (e) => { state.unit = e.target.value; render(true); });
    $('#f-marks').addEventListener('change', (e) => { state.marks = e.target.value; render(true); });
    $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(true); });
    $('#f-show').addEventListener('change', (e) => { state.show = e.target.value; render(true); });
    $('#more').addEventListener('click', () => { state.shown += PAGE; render(false); });
    $('#back').addEventListener('click', () => { state.only = null; render(true); syncUrl(true); });
    $('#topics-toggle').addEventListener('click', () => showTopics(!$('#sidebar').classList.contains('open')));
    $('#qlist').addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) { showOnly(g.dataset.goto); return; }
      const art = e.target.closest('.qcard');
      if (art && art.id.slice(2) !== currentId) setCurrent(art.id.slice(2), false);
      const a = e.target.closest('[data-act]');
      if (a) toggle(a.dataset.act, a.dataset.id);
    });
    $('#qlist').addEventListener('focusin', (e) => {
      const art = e.target.closest('.qcard');
      if (art && art.id.slice(2) !== currentId) setCurrent(art.id.slice(2), false);
    });
    document.addEventListener('keydown', onKey);
    $('#keys-open').addEventListener('click', openKeys);
    $('#keys').addEventListener('click', (e) => {
      // Older browsers without <dialog>: the Close button just hides it.
      if (e.target.closest('button') && typeof $('#keys').showModal !== 'function') $('#keys').removeAttribute('open');
    });
    window.addEventListener('scroll', () => remember(), { passive: true });
    window.addEventListener('popstate', () => {
      const u = readUrl();
      state.path = u.path ? u.path.split(' > ') : [];
      state.only = u.only;
      markActive(true);
      render(true);
    });
    window.addEventListener('hashchange', openCodes);
    $('#dl-all').addEventListener('click', () => {
      current.forEach((it) => selected.add(it.id));
      saveSelection();
    });
    $('#dl-clear').addEventListener('click', () => {
      selected.clear();
      saveSelection();
    });
    $('#dl-qp').addEventListener('click', (e) => download('qp', e.currentTarget));
    $('#dl-ms').addEventListener('click', (e) => download('ms', e.currentTarget));
    // Keep the light/dark switch above the download bar (see .theme-toggle in topicbank.css).
    const bar = $('.tb-dl');
    const lift = () => document.body.style.setProperty('--dl-h', bar.offsetHeight + 'px');
    if (window.ResizeObserver) new ResizeObserver(lift).observe(bar);
    lift();
  }

  /* ---------- Download the selected questions ----------
     "Download QP" makes a PDF of the selected questions' screenshots; "Download MS"
     makes a matching PDF of what the mark scheme rewards for each one, numbered the
     same way, with a link to the full Pearson mark scheme where the papers page has it.
     Each A4 page is drawn on a canvas and added to the PDF as a picture, so every
     symbol the browser can draw (λ, Ω, ⁻¹, →) comes out right, on iPhone too. */
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const MAX_DOWNLOAD = 150;   // a few hundred pages is as much as an iPhone tab can hold while building
  const DPI = 200;
  const MM = DPI / 25.4;
  const PAGE_W = Math.round(210 * MM);
  const PAGE_H = Math.round(297 * MM);
  const MARGIN = Math.round(14 * MM);
  const BOTTOM = PAGE_H - Math.round(14 * MM);
  const PDF_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  let busy = false;

  function saveSelection() {
    store.set(KEY_SEL, [...selected]);
    document.querySelectorAll('#qlist .qcard').forEach((art) => {
      const it = byId.get(art.id.slice(2));
      if (it) art.replaceWith(card(it));
    });
    updateBar();
  }

  function updateBar() {
    const n = selected.size;
    $('.tb-dl').classList.toggle('is-empty', !n);
    $('#dl-count').textContent = n ? n + (n === 1 ? ' question selected' : ' questions selected') : 'Select questions to download them';
    const all = $('#dl-all');
    all.textContent = 'Select all ' + current.length + ' shown';
    all.disabled = busy || !current.length || current.every((it) => selected.has(it.id));
    $('#dl-clear').disabled = busy || !n;
    $('#dl-qp').disabled = $('#dl-ms').disabled = busy || !n;
  }

  function loadScript(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => (ready() ? resolve() : reject(new Error('the PDF maker did not start')));
      s.onerror = () => reject(new Error('the PDF maker could not be downloaded; check the connection'));
      document.head.appendChild(s);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error('missing image'));
      im.src = src;
    });
  }

  // Where the full mark scheme for a paper can be downloaded (from the papers page's list).
  let paperIndex = null;
  function loadPaperIndex() {
    if (paperIndex) return Promise.resolve(paperIndex);
    return fetch('data/papers-' + subject + '.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((json) => {
        paperIndex = new Map();
        if (json) json.papers.forEach((p) => paperIndex.set(p.id, { tag: json.tag, paper: p }));
        return paperIndex;
      });
  }
  const RELEASES = 'https://github.com/mirakludbA08/IALqBank/releases/download/';

  // Lays out one A4 page at a time on a canvas, then adds it to the PDF.
  function composer(doc) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W;
    canvas.height = PAGE_H;
    const ctx = canvas.getContext('2d');
    const W = PAGE_W - 2 * MARGIN;
    let y = MARGIN;
    let used = false;
    let pages = 0;
    let links = [];
    const px = (pt) => Math.round(pt * DPI / 72);
    const blank = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, PAGE_W, PAGE_H); y = MARGIN; used = false; links = []; };
    const flush = () => {
      if (pages) doc.addPage();
      doc.addImage(canvas.toDataURL('image/jpeg', 0.82), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      links.forEach((l) => doc.link(l.x / MM, l.y / MM, l.w / MM, l.h / MM, { url: l.url }));
      pages++;
      blank();
    };
    const setFont = (o) => { ctx.font = (o.bold ? '700 ' : '400 ') + px(o.pt || 10) + 'px ' + PDF_FONT; };
    function wrap(str, o) {
      setFont(o);
      const max = W - (o.indent || 0);
      const out = [];
      String(str).split('\n').forEach((para) => {
        let line = '';
        para.split(/\s+/).filter(Boolean).forEach((word) => {
          const next = line ? line + ' ' + word : word;
          if (ctx.measureText(next).width <= max || !line) line = next;
          else { out.push(line); line = word; }
          // A single word wider than the page (a long file name) is cut where it fits.
          while (ctx.measureText(line).width > max && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > max) cut--;
            out.push(line.slice(0, cut));
            line = line.slice(cut);
          }
        });
        out.push(line);
      });
      return out;
    }
    const lineH = (o) => Math.round(px(o.pt || 10) * 1.4);
    blank();
    return {
      measure: (str, o) => wrap(str, o).length * lineH(o) + (o.after || 0),
      // Height of a picture drawn at the full page width.
      fit: (im) => Math.round(im.naturalHeight * W / im.naturalWidth),
      // Room for a heading plus a picture of height h: the whole picture if it fits on
      // one page, otherwise a good first slice of it.
      room: (head, h) => head + (head + h <= BOTTOM - MARGIN ? h : Math.round((BOTTOM - MARGIN) / 4)),
      // Start a new page unless h more pixels fit on this one.
      need(h) { if (used && y + h > BOTTOM) flush(); },
      text(str, o) {
        o = o || {};
        const lh = lineH(o);
        wrap(str, o).forEach((line) => {
          this.need(lh);
          setFont(o);
          ctx.fillStyle = o.color || '#1d2330';
          ctx.textBaseline = 'top';
          ctx.fillText(line, MARGIN + (o.indent || 0), y);
          if (o.url) {
            const w = ctx.measureText(line).width;
            ctx.fillRect(MARGIN + (o.indent || 0), y + px(o.pt || 10) + 2, w, 2);
            links.push({ x: MARGIN + (o.indent || 0), y: y, w: w, h: lh, url: o.url });
          }
          y += lh;
          used = true;
        });
        y += o.after || 0;
      },
      // A picture at the full page width. One taller than the space left carries on
      // at the top of the next page, like a question running over in the paper.
      image(im) {
        const scale = W / im.naturalWidth;
        const H = im.naturalHeight * scale;
        let drawn = 0;
        ctx.strokeStyle = '#c7d2e3';
        ctx.lineWidth = 2;
        while (drawn < H - 0.5) {
          if (BOTTOM - y < px(40)) flush();
          const h = Math.min(BOTTOM - y, H - drawn);
          ctx.drawImage(im, 0, drawn / scale, im.naturalWidth, h / scale, MARGIN, y, W, h);
          ctx.strokeRect(MARGIN, y, W, h);
          y += h;
          drawn += h;
          used = true;
        }
      },
      rule() {
        this.need(px(14));
        ctx.fillStyle = '#dfe5ee';
        ctx.fillRect(MARGIN, y + px(6), W, 2);
        y += px(14);
      },
      space(pt) { y += px(pt); },
      finish() { if (used || !pages) flush(); return pages; }
    };
  }

  async function download(kind, btn) {
    if (busy) return;
    const items = sorted([...selected].map((id) => byId.get(id)).filter(Boolean));
    if (!items.length) return;
    if (items.length > MAX_DOWNLOAD) {
      alert('That is ' + items.length + ' questions. Select ' + MAX_DOWNLOAD + ' or fewer and download them in batches.');
      return;
    }
    const label = btn.textContent;
    busy = true;
    updateBar();
    try {
      btn.textContent = 'Getting ready…';
      await loadScript(JSPDF_URL, () => !!(window.jspdf && window.jspdf.jsPDF));
      if (kind === 'ms') await loadPaperIndex();
      const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const page = composer(doc);
      const name = SUBJECTS[subject].label;
      const marks = items.reduce((t, it) => t + (it.marks || 0), 0);
      const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      page.text(name + (kind === 'qp' ? ' questions' : ' mark scheme'), { pt: 20, bold: true, color: '#002b80', after: 4 });
      page.text(items.length + (items.length === 1 ? ' question' : ' questions') + ', ' + marks + ' marks · made on IALqBank, ' + today, { pt: 10, color: '#5b6573', after: 6 });
      if (kind === 'ms') {
        page.text('For each question: what the Pearson mark scheme rewards, from the IALqBank notes. These notes were written by AI from the mark scheme, so check the full mark scheme (linked under each answer) for every acceptable answer.', { pt: 9.5, color: '#5b6573', after: 6 });
      }
      page.rule();

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        btn.textContent = 'Building ' + (i + 1) + ' of ' + items.length + '…';
        const title = { pt: 12, bold: true, color: '#002b80', after: 2 };
        const meta = { pt: 9, color: '#5b6573', after: 8 };
        const head = (i + 1) + '. ' + (it.name || it.id);
        const sub = paperLabel(it) + ' · ' + partLabel(it) + (it.marks != null ? ' · ' + it.marks + (it.marks === 1 ? ' mark' : ' marks') : '') + ' · ' + it.id;
        if (kind === 'qp') {
          let im = null;
          try { im = it.img ? await loadImage(it.img) : null; } catch (err) { im = null; }
          // Keep each heading on the same page as its question.
          page.need(page.room(page.measure(head, title) + page.measure(sub, meta), im ? page.fit(im) : 0));
          page.text(head, title);
          page.text(sub, meta);
          if (im) page.image(im);
          else page.text('The screenshot for this question could not be loaded.', { pt: 10, color: '#e03131' });
        } else {
          const body = { pt: 10.5, after: 4 };
          page.need(page.measure(head, title) + page.measure(sub, meta) + page.measure(it.ms || 'Not recorded.', body));
          page.text(head, title);
          page.text(sub, meta);
          page.text(it.ms || 'Not recorded.', body);
          // The bank calls the May/June session "May", the papers list "Jun".
          const hit = paperIndex && (paperIndex.get(it.paper) || paperIndex.get(it.paper.replace(/_May(\d{4})$/, '_Jun$1')));
          if (hit && hit.paper.ms) {
            page.text('Full mark scheme: ' + paperLabel(it) + ' (' + it.unit + ')', { pt: 9.5, color: '#0044cc', url: RELEASES + hit.tag + '/' + hit.paper.ms.file });
          } else if (it.msf) {
            page.text('Full mark scheme: ' + it.msf.split('/').pop(), { pt: 9.5, color: '#5b6573' });
          }
        }
        page.space(10);
        page.rule();
        if (i % 4 === 3) await new Promise((r) => setTimeout(r));   // let the page repaint the progress
      }
      const total = page.finish();
      for (let p = 1; p <= total; p++) {
        doc.setPage(p);
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text('IALqBank - ' + name + (kind === 'qp' ? ' questions' : ' mark scheme'), 14, 290);
        doc.text(p + ' / ' + total, 196, 290, { align: 'right' });
      }
      doc.save(name + ' ' + (kind === 'qp' ? 'questions' : 'mark scheme') + ' (' + items.length + ').pdf');
    } catch (err) {
      alert('The PDF could not be made: ' + err.message + '.');
    } finally {
      btn.textContent = label;
      busy = false;
      updateBar();
    }
  }

  function init(json) {
    data = json;
    byId = new Map(data.items.map((i) => [i.id, i]));
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    $('#blurb-count').textContent = data.count.toLocaleString() + ' question parts from 2014 to 2024 papers, sorted by Unit, topic and specification point.';
    buildTree();
    buildFilters();
    bind();
    writeJson(KEY_TOTAL, data.count);
    saveProgress();

    // Open the topic or question the address asks for; otherwise offer to go back to the last one.
    const saved = readJson(KEY_LAST);
    const u = readUrl();
    state.path = u.path ? u.path.split(' > ') : [];
    state.only = u.only;
    markActive(true);
    render(true);
    $('#loading').hidden = true;
    $('#codes summary').textContent = 'What do paper codes like ' + ({ physics: 'WPH11', chemistry: 'WCH11', biology: 'WBI11', maths: 'WMA11' }[subject] || 'WPH11') + ' mean?';
    $('#codes').hidden = false;
    $('#app').hidden = false;
    syncUrl(false);
    if (u.at) jumpTo(u.at);
    else if (!u.path && !u.only && location.hash !== '#codes') offerResume(saved);
    // On a phone the intro and filters fill the first screen; go straight to a topic's questions.
    if (state.path.length && !u.at && narrow()) $('.tb-countbar').scrollIntoView({ block: 'start' });
    openCodes();
  }

  function soon() {
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    $('#loading').hidden = true;
    const s = $('#soon');
    s.hidden = false;
    s.textContent = SUBJECTS[subject].label + ' is not in the bank yet: the International A Level papers for this subject have not been added. Physics and Chemistry are ready.';
  }

  $('#papers-link').href = 'papers.html?s=' + subject;
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
