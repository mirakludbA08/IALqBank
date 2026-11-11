/* IAL Prep topic bank.
   Loads data/<subject>.json (built from the sorted past-paper bank) and shows every question part as a
   screenshot with notes on how it is asked, what the mark scheme rewards, where the paper is, and which
   earlier questions it depends on. Questions are filtered by the Unit > Topic > Spec point tree, by
   search, year and marks; any number of Units, topics and spec points can be ticked together.
   "Hence" parts are shown bundled with the part they build on.
   The tree shows how many questions are done in each Unit, topic and spec point; keyboard
   shortcuts move between questions and mark them; the topics are kept in the address, and where
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

  // Search engines: this subject's own title, description and address on ialprep.com.
  function seo(title, desc, path) {
    document.title = title;
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute('content', desc);
    let l = document.querySelector('link[rel="canonical"]');
    if (!l) { l = document.createElement('link'); l.rel = 'canonical'; document.head.appendChild(l); }
    l.href = 'https://ialprep.com/' + path;
  }
  seo(SUBJECTS[subject].label + ' question bank · Edexcel IAL · IAL Prep',
    'Edexcel IAL ' + SUBJECTS[subject].label + ' past-paper questions sorted by unit, topic and spec point, with mark-scheme notes and AI practice questions.',
    'questions?s=' + subject);

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
  // sel: the spec points ticked, as "Unit > Topic > point" keys; empty means all topics.
  let state = { sel: new Set(), q: '', year: '', marks: '', unit: '', show: '', only: null, shown: PAGE, sort: 'new', source: '' };

  // Which questions the bank shows: past papers and the AI practice questions together (''),
  // past papers only ('past') or AI practice only ('ai'). Remembered in this browser.
  const KEY_SOURCE = 'ialqb_tb_source';
  try { const v = localStorage.getItem(KEY_SOURCE); if (v === 'past' || v === 'ai') state.source = v; } catch (e) { /* storage blocked */ }
  // Pearson's regional papers (paper A, "WPH11/01A", set since 2025 alongside the main paper) can be
  // left out with a tick box. Remembered in this browser.
  const KEY_REGIONAL = 'ialqb_tb_noregional';
  const isRegional = (it) => !it.ai && /^W[A-Z]{2}\d{2}A_/.test(it.paper || '');
  try { state.noRegional = localStorage.getItem(KEY_REGIONAL) === '1'; } catch (e) { /* storage blocked */ }
  const inSource = (it) => !(state.noRegional && isRegional(it)) &&
    (state.source === 'past' ? !it.ai : state.source === 'ai' ? !!it.ai : true);

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
    if (it.ai) return it.pred ? 'AI predicted question' : 'AI practice question';
    const u = unitInfo(it.unit);
    // 2025 and 2026 sessions have a regional "A" version of some papers (WPH11A_Jan2026): a different paper.
    const variant = isRegional(it) ? ' (regional paper A)' : '';
    return SUBJECTS[subject].label + ' ' + u.short + variant + ' · ' + sessionLabel(it);
  }

  function partLabel(it) {
    if (it.ai) return '';
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
    paintMenus();
  }

  // The tree as built, in its order: [{ name, kids: [{ name, kids: [{ name }] }] }]. The Unit,
  // Topic and Spec point menus over the questions are filled from it.
  let treeData = [];
  // The spec point keys under every row of the tree ('' for all of them), the rows' tick boxes,
  // and the rows themselves (a Unit or topic's summary, a spec point's line).
  const leaves = new Map();
  const ticks = new Map();
  const rowOf = new Map();

  function tickBox(key, name) {
    const box = el('input', 'tree-tick');
    box.type = 'checkbox';
    box.dataset.key = key;
    box.setAttribute('aria-label', 'Include ' + name);
    ticks.set(key, box);
    return box;
  }

  /* ---------- Ready-made topic PDFs ----------
     Every topic's questions and mark schemes as PDFs made ahead of time (tools/notes/
     build-bank-pdfs.mjs), so they open at once. data/bank-pdfs-<subject>.json lists them; the
     files are on the GitHub release bank-<subject> and open in the browser on ialprep.com. */
  let readyMade = null;
  const FILE_ICON = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 3.5v9m0 0-3.6-3.6M10 12.5l3.6-3.6M4 16h12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const mb = (bytes) => (bytes / 1048576 < 0.95 ? Math.max(0.1, bytes / 1048576).toFixed(1) : Math.round(bytes / 1048576)) + ' MB';
  function readyHref(f) {
    // On this computer (127.0.0.1 / localhost) the PDFs are read from bank-pdfs-preview/, where
    // build-bank-pdfs.mjs --preview puts a copy, so they can be looked at before they are uploaded.
    const local = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    const base = local ? 'bank-pdfs-preview/' : (location.hostname === 'ialprep.com' ? '/paper-pdf/' : RELEASES);
    return base + readyMade.tag + '/' + encodeURIComponent(f.file);
  }
  // One download button: kind 'qp' is the questions PDF, 'ms' the mark scheme PDF; the file size is on it.
  function pdfButton(f, kind, title) {
    const a = el('a', 'pb-btn' + (kind === 'ms' ? ' is-ms' : ''));
    a.innerHTML = FILE_ICON;
    a.append(kind === 'ms' ? 'Mark scheme PDF' : 'Questions PDF', el('small', null, mb(f.bytes)));
    a.href = readyHref(f);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = title;
    a.setAttribute('aria-label', title + ' (' + mb(f.bytes) + ')');
    return a;
  }
  // The Questions and Mark scheme buttons of one ready-made paper. what: where its questions are
  // from, for the button's description ("on Mechanics", "in Unit 1 Mechanics and Materials").
  function pdfButtons(ready, what) {
    const box = el('div', 'pb-btns');
    if (ready.qp) box.appendChild(pdfButton(ready.qp, 'qp', 'Open all ' + ready.n + ' questions ' + what + ' as a PDF'));
    if (ready.ms) box.appendChild(pdfButton(ready.ms, 'ms', 'Open the mark scheme for all ' + ready.n + ' questions ' + what + ' as a PDF'));
    return box;
  }

  function buildTree() {
    const tree = new Map();
    nodes.clear();
    data.items.filter(inSource).forEach((it) => {
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
    const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });
    treeData = [...tree.values()].sort((a, b) => {
      const ka = unitKey(a.name);
      const kb = unitKey(b.name);
      if (ka !== null && ka !== kb) return ka - kb;
      return byName(a, b);
    }).map((u) => ({
      name: u.name,
      kids: [...u.kids.values()].sort(byName).map((t) => ({ name: t.name, kids: [...t.kids.values()].sort(byName) }))
    }));
    leaves.clear();
    ticks.clear();
    rowOf.clear();
    leaves.set('', []);
    // Each row: a tick box to add it to the topics already chosen, then its name, which
    // chooses just that row.
    treeData.forEach((u) => {
      leaves.set(u.name, []);
      const d1 = el('details', 'tree-unit');
      const s1 = el('summary');
      s1.dataset.path = u.name;
      s1.appendChild(tickBox(u.name, u.name));
      treeLabel(s1, u.name, u.name, true);
      rowOf.set(u.name, s1);
      d1.appendChild(s1);
      u.kids.forEach((t) => {
        const tk = pathKey([u.name, t.name]);
        leaves.set(tk, []);
        const d2 = el('details', 'tree-topic');
        const s2 = el('summary');
        s2.dataset.path = tk;
        s2.appendChild(tickBox(tk, t.name));
        treeLabel(s2, t.name, tk, false);
        rowOf.set(tk, s2);
        d2.appendChild(s2);
        t.kids.forEach((s) => {
          const sk = pathKey([u.name, t.name, s.name]);
          [sk, tk, u.name, ''].forEach((k) => { if (!leaves.has(k)) leaves.set(k, []); leaves.get(k).push(sk); });
          const row = el('div', 'tree-leaf');
          row.appendChild(tickBox(sk, s.name));
          const b = el('button', 'tree-go');
          b.type = 'button';
          b.dataset.path = sk;
          treeLabel(b, s.name, sk, false);
          row.appendChild(b);
          rowOf.set(sk, row);
          d2.appendChild(row);
        });
        d1.appendChild(d2);
      });
      host.appendChild(d1);
    });
  }

  /* ---------- Prebuilt topical papers ----------
     A page of its own, the second button under the heading: every Unit and its topics, each with
     a Questions PDF and a Mark scheme PDF from the ready-made list. A Unit that has just one
     topic (General skills, the practical units) is a single row. The Units keep the tree's order. */
  let view = 'questions';   // 'questions' or 'papers'
  let pbOpen = true;        // do the Units' topic lists start open? (not when there are very many topics)
  const pbUnits = [];       // { box, rows: [{ li, text }], text, multi }, for the search box

  function practiseLink(key) {
    const b = el('button', 'pb-row-link', 'Practise online');
    b.type = 'button';
    b.addEventListener('click', () => practise(key));
    return b;
  }

  function buildPrebuilt() {
    const host = $('#pb-list');
    host.textContent = '';
    pbUnits.length = 0;
    if (!readyMade) return;
    pbOpen = Object.keys(readyMade.topics).length <= 40;
    treeData.forEach((u) => {
      const topics = u.kids.map((t) => ({ name: t.name, key: pathKey([u.name, t.name]) })).filter((t) => readyMade.topics[t.key]);
      // One topic: its questions are the Unit's, so it is one row, not a Unit with a topic inside it.
      const whole = (readyMade.units && readyMade.units[u.name]) || (topics.length === 1 ? readyMade.topics[topics[0].key] : null);
      if (!whole && !topics.length) return;
      const multi = topics.length > 1;
      const box = el(multi ? 'details' : 'div', 'pb-unit');
      if (multi) box.open = pbOpen;
      const head = el(multi ? 'summary' : 'div', 'pb-unit-head');
      const title = el('span', 'pb-unit-title');
      title.appendChild(el('strong', null, u.name));
      const sub = el('span');
      const nq = (whole ? whole.n : topics.reduce((t, x) => t + readyMade.topics[x.key].n, 0)).toLocaleString() + ' questions';
      if (multi) {
        // Closed, it says what is inside; the topics each have their own Questions and Mark scheme PDFs.
        sub.append(el('span', 'pb-when-open', nq + ' in ' + topics.length + ' topics'), el('span', 'pb-when-closed', nq + ' · show the ' + topics.length + ' topics'));
      } else {
        sub.append(nq + ' · ', practiseLink(u.name));
      }
      title.appendChild(sub);
      head.appendChild(title);
      if (whole) {
        const wrap = el('div', 'pb-whole');
        if (multi) wrap.appendChild(el('span', null, 'Whole unit'));
        wrap.appendChild(pdfButtons(whole, 'in ' + u.name));
        head.appendChild(wrap);
      }
      box.appendChild(head);
      const rows = [];
      if (multi) {
        const list = el('ul', 'pb-topics');
        topics.forEach((t) => {
          const r = readyMade.topics[t.key];
          const li = el('li', 'pb-row');
          const name = el('p', 'pb-row-name', t.name);
          const note = el('span', null, r.n.toLocaleString() + ' questions · ');
          note.appendChild(practiseLink(t.key));
          name.appendChild(note);
          li.append(name, pdfButtons(r, 'on ' + t.name));
          list.appendChild(li);
          rows.push({ li: li, text: t.name.toLowerCase() });
        });
        box.appendChild(list);
      }
      host.appendChild(box);
      pbUnits.push({ box: box, rows: rows, multi: multi, text: (u.name + ' ' + (multi ? '' : topics.map((t) => t.name).join(' '))).toLowerCase() });
    });
    $('#pb-fold').hidden = !pbUnits.some((u) => u.multi);
    $('#pb-fold').textContent = pbOpen ? 'Collapse all' : 'Expand all';
    pbFilter();
  }

  // The search box: a Unit that matches shows all its topics, otherwise only the topics that do.
  function pbFilter() {
    const q = $('#pb-find').value.trim().toLowerCase();
    let shown = 0;
    pbUnits.forEach((u) => {
      const unitHit = !q || u.text.indexOf(q) >= 0;
      let any = false;
      u.rows.forEach((r) => {
        const hit = unitHit || r.text.indexOf(q) >= 0;
        r.li.hidden = !hit;
        if (hit) any = true;
      });
      u.box.hidden = !(unitHit || any);
      if (!u.box.hidden) shown++;
      if (u.multi && q) u.box.open = true;
    });
    $('#pb-empty').hidden = shown > 0;
  }

  // mode: 'push' or 'replace' also puts the view in the address (?view=papers); null leaves the address alone.
  function setView(v, mode) {
    view = v === 'papers' && readyMade ? 'papers' : 'questions';
    const papers = view === 'papers';
    $('#app').hidden = papers || !data;   // the keyboard shortcuts and "Continue" also check this
    $('#prebuilt').hidden = !papers;
    $('#view-q').setAttribute('aria-pressed', String(!papers));
    $('#view-p').setAttribute('aria-pressed', String(papers));
    if (!mode) return;
    const u = new URL(location.href);
    if (papers) u.searchParams.set('view', 'papers'); else u.searchParams.delete('view');
    if (u.href !== location.href) {
      try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', u.href); } catch (err) { /* address cannot change here */ }
    }
    if (mode === 'push') $('#views').scrollIntoView({ block: 'start' });
  }

  // From a prebuilt paper's "Practise online": the questions view, on that Unit or topic.
  function practise(key) {
    setView('questions', null);
    $('#resume').hidden = true;
    setChoice([key]);
    state.only = null;
    showChoice(true);
    render(true);
    syncUrl(true);
    $('#qlist').scrollIntoView({ block: 'start' });
  }

  function buildFilters() {
    const past = data.items.filter((i) => !i.ai);
    const years = [...new Set(past.map((i) => i.year))].sort((a, b) => b - a);
    const ys = $('#f-year');
    years.forEach((y) => { const o = el('option', null, String(y)); o.value = String(y); ys.appendChild(o); });
    const us = $('#f-unit');
    const groups = new Map();
    past.forEach((i) => {
      const n = unitInfo(i.unit).n;
      if (!groups.has(n)) groups.set(n, new Set());
      groups.get(n).add(i.unit);
    });
    [...groups.keys()].sort((a, b) => a - b).forEach((n) => {
      const codes = [...groups.get(n)].sort();
      const u = unitInfo(codes[0]);
      const o = el('option', null, 'Unit ' + (u.label || n) + ' papers: ' + u.name);
      o.value = codes.join(',');
      us.appendChild(o);
    });
  }

  /* ---------- Choosing topics ----------
     Any number of Units, topics and spec points can be ticked, and the questions shown are the
     ones in any of them. The choice is kept as the spec points it covers (state.sel), so a Unit
     ticked as a whole and the same Unit's topics ticked one by one are the same choice. */
  const nameOf = (key) => key.split(' > ').pop();
  const countIn = (key) => (leaves.get(key) || []).reduce((n, k) => n + (state.sel.has(k) ? 1 : 0), 0);
  const wholeIn = (key) => { const l = leaves.get(key) || []; return l.length > 0 && countIn(key) === l.length; };
  const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

  function setChoice(keys) {
    state.sel = new Set();
    keys.forEach((k) => (leaves.get(k) || []).forEach((l) => state.sel.add(l)));
  }

  // The fewest rows that make up the choice: a whole Unit as the Unit, a whole topic as the topic.
  function chosen() {
    if (!state.sel.size) return [];
    const out = [];
    treeData.forEach((u) => {
      if (wholeIn(u.name)) { out.push(u.name); return; }
      u.kids.forEach((t) => {
        const tk = pathKey([u.name, t.name]);
        if (wholeIn(tk)) { out.push(tk); return; }
        t.kids.forEach((s) => { const sk = pathKey([tk, s.name]); if (state.sel.has(sk)) out.push(sk); });
      });
    });
    return out;
  }

  // "Momentum", "Momentum and Projectiles", "Momentum and 3 more".
  function chosenLabel(keys) {
    const names = keys.map(nameOf);
    return names.length <= 2 ? names.join(' and ') : names[0] + ' and ' + (names.length - 1) + ' more';
  }

  function paintTicks() {
    ticks.forEach((box, key) => {
      const n = countIn(key);
      box.checked = n > 0 && n === leaves.get(key).length;
      box.indeterminate = n > 0 && !box.checked;
    });
  }

  /* ---------- Unit, Topic and Spec point menus ----------
     The same choice as the tree, over the questions, as three menus of tick boxes. Each lists
     what is in the ticks of the one before it and narrows them: tick Units, then tick topics to
     keep only those topics of their Unit (a Unit with none of its topics ticked stays whole),
     then spec points the same way within topics. menuKeys holds the rows ticked in the menus;
     it is worked out again whenever the choice changes some other way (tree, address, Back). */
  const MENUS = [
    { level: 0, id: '#m-unit', all: ['All units', 'All units'], none: '', plural: 'units' },
    { level: 1, id: '#m-topic', all: ['All topics in this unit', 'All topics in these units'], none: 'Choose a unit first', plural: 'topics' },
    { level: 2, id: '#m-point', all: ['All points in this topic', 'All points in these topics'], none: 'Choose a topic first', plural: 'spec points' }
  ];
  let menuKeys = new Set();

  function menuFromChoice() {
    const out = new Set();
    treeData.forEach((u) => {
      if (!countIn(u.name)) return;
      out.add(u.name);
      if (wholeIn(u.name)) return;
      u.kids.forEach((t) => {
        const tk = pathKey([u.name, t.name]);
        if (!countIn(tk)) return;
        out.add(tk);
        if (wholeIn(tk)) return;
        t.kids.forEach((s) => { const sk = pathKey([tk, s.name]); if (state.sel.has(sk)) out.add(sk); });
      });
    });
    return out;
  }

  function choiceFromMenu() {
    const sel = new Set();
    treeData.forEach((u) => {
      if (!menuKeys.has(u.name)) return;
      const ts = u.kids.filter((t) => menuKeys.has(pathKey([u.name, t.name])));
      (ts.length ? ts : u.kids).forEach((t) => {
        const tk = pathKey([u.name, t.name]);
        const ps = t.kids.filter((s) => menuKeys.has(pathKey([tk, s.name])));
        (ps.length ? ps : t.kids).forEach((s) => sel.add(pathKey([tk, s.name])));
      });
    });
    return sel;
  }

  // What a menu lists: [{ head, rows: [{ key, name }] }], one group per ticked row of the menu before.
  function menuGroups(level) {
    if (level === 0) return [{ head: '', rows: treeData.map((u) => ({ key: u.name, name: u.name })) }];
    if (level === 1) {
      return treeData.filter((u) => menuKeys.has(u.name))
        .map((u) => ({ head: u.name, rows: u.kids.map((t) => ({ key: pathKey([u.name, t.name]), name: t.name })) }));
    }
    const out = [];
    treeData.forEach((u) => u.kids.forEach((t) => {
      const tk = pathKey([u.name, t.name]);
      if (menuKeys.has(tk)) out.push({ head: t.name, rows: t.kids.map((s) => ({ key: pathKey([tk, s.name]), name: s.name })) });
    }));
    return out;
  }

  const doneText = (key) => {
    const n = nodes.get(key);
    return (n && n.done ? n.done + '/' : '') + (n ? n.total : 0);
  };

  function paintMenu(m) {
    const groups = menuGroups(m.level);
    const rows = [].concat(...groups.map((g) => g.rows));
    const ticked = rows.filter((r) => menuKeys.has(r.key));
    const all = m.all[groups.length > 1 ? 1 : 0];
    m.box.classList.toggle('is-disabled', !rows.length);
    m.sum.setAttribute('aria-disabled', String(!rows.length));
    if (!rows.length) m.det.open = false;
    m.sum.textContent = !rows.length ? m.none : !ticked.length ? all : ticked.length === 1 ? ticked[0].name : ticked.length + ' ' + m.plural;
    // The list is only rebuilt when what it lists changes, so ticking keeps the place and focus in it.
    const sig = rows.map((r) => r.key).join('\n');
    if (sig !== m.sig) {
      m.sig = sig;
      m.panel.textContent = '';
      if (rows.length) {
        const clear = el('button', 'tb-menu-all');
        clear.type = 'button';
        clear.dataset.clear = '';
        m.panel.appendChild(clear);
      }
      groups.forEach((g) => {
        if (groups.length > 1) m.panel.appendChild(el('p', 'tb-menu-head', g.head));
        g.rows.forEach((r) => {
          const row = el('label', 'tb-menu-row');
          const box = el('input');
          box.type = 'checkbox';
          box.dataset.key = r.key;
          row.appendChild(box);
          row.appendChild(el('span', 'tb-menu-name', r.name));
          const count = el('span', 'tb-menu-count');
          count.dataset.key = r.key;
          row.appendChild(count);
          m.panel.appendChild(row);
        });
      });
    }
    const clear = $('[data-clear]', m.panel);
    if (clear) {
      clear.textContent = all;
      clear.setAttribute('aria-pressed', String(!ticked.length));
    }
    m.panel.querySelectorAll('input[data-key]').forEach((b) => { b.checked = menuKeys.has(b.dataset.key); });
    m.panel.querySelectorAll('.tb-menu-count').forEach((c) => { c.textContent = doneText(c.dataset.key); });
  }

  function paintMenus() {
    if (!MENUS[0].box) return;
    if (!sameSet(choiceFromMenu(), state.sel)) menuKeys = menuFromChoice();
    MENUS.forEach(paintMenu);
  }

  // A menu opened near the right edge of a narrow screen is moved left to fit.
  function placeMenu(m) {
    m.panel.style.left = '';
    const over = m.panel.getBoundingClientRect().right - (document.documentElement.clientWidth - 8);
    if (over > 0) m.panel.style.left = -over + 'px';
  }

  function matches(it) {
    if (state.only) return it.id === state.only;
    if (!inSource(it)) return false;
    if (state.sel.size && !state.sel.has(pathKey(itemPath(it)))) return false;
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
      const hay = (it.id + ' ' + (it.name || '') + ' ' + (it.how || '') + ' ' + (it.ms || '') + ' ' + (it.topic || '') + ' ' + (it.also || []).join(' ') + ' ' + (it.question || '') + ' ' + (it.keywords || []).join(' ') + ' ' + ui.short + ' ' + ui.name + ' ' + sessionLabel(it)).toLowerCase();
      return state.q.split(/\s+/).every((w) => hay.includes(w));
    }
    return true;
  }

  function sorted(list) {
    const key = state.sort;
    const c = list.slice();
    // Past papers, then the AI questions predicted for the next exams, then the other AI questions.
    const rank = (it) => (!it.ai ? 0 : it.pred ? 1 : 2);
    const ai = (a, b) => rank(a) - rank(b);
    if (key === 'new') c.sort((a, b) => ai(a, b) || b.year - a.year || a.paper.localeCompare(b.paper) || a.q - b.q || String(a.part).localeCompare(String(b.part)));
    else if (key === 'old') c.sort((a, b) => ai(a, b) || a.year - b.year || a.paper.localeCompare(b.paper) || a.q - b.q || String(a.part).localeCompare(String(b.part)));
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
    if (it.ai) meta.appendChild(el('span', 'chip chip-ai', paperLabel(it)));
    else meta.appendChild(el('span', 'chip chip-paper', paperLabel(it) + ' · ' + partLabel(it)));
    if (it.marks != null) meta.appendChild(el('span', 'chip', it.marks + (it.marks === 1 ? ' mark' : ' marks')));
    if (it.topic) meta.appendChild(el('span', 'chip chip-topic', it.topic));
    (it.also || []).forEach((c) => meta.appendChild(el('span', 'chip chip-also', c)));
    if (it.bundle) meta.appendChild(el('span', 'chip chip-hence', 'Hence pair: saved together'));
    head.appendChild(meta);
    art.appendChild(head);

    if (it.img) {
      const im = document.createElement('img');
      im.className = 'qcard-img';
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = it.img;
      im.alt = it.ai ? 'The question: ' + (it.question || it.name || it.id)
        : 'Screenshot of ' + (it.name || it.id) + ' from ' + paperLabel(it) + ', ' + partLabel(it);
      art.appendChild(im);
    }

    if (it.ai && !it.img) {
      const q = aiParts(it);
      const box = el('div', 'qcard-text');
      box.appendChild(el('p', null, q.stem));
      if (q.options.length) {
        const ol = el('ol', 'qcard-opts');
        q.options.forEach((o, i) => {
          const li = el('li');
          li.appendChild(el('b', null, 'ABCD'[i]));
          li.appendChild(document.createTextNode(' ' + o));
          ol.appendChild(li);
        });
        box.appendChild(ol);
      }
      art.appendChild(box);
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
    notes.appendChild(el('summary', null, it.ai ? 'Mark scheme' : 'How it is asked and the mark scheme'));
    if (!it.ai) {
      const n1 = el('p');
      n1.appendChild(el('strong', null, 'How it is asked: '));
      n1.appendChild(document.createTextNode(it.how || 'Not recorded.'));
      notes.appendChild(n1);
    }
    // The mark scheme (and its picture) is made when the reader opens the panel.
    notes.addEventListener('toggle', () => {
      if (notes.open && !notes.dataset.ms) { notes.dataset.ms = '1'; notes.appendChild(markScheme(it)); }
    });
    art.appendChild(notes);

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

  // An AI question's text. A one-mark question ending "A: ...; B: ...; C: ...; D: ..." is split into
  // its stem and four options so the options can go on lines of their own.
  function aiParts(it) {
    const m = it.marks === 1 && /^(.*\S)\s+A[:.)]?\s+(.+?)[;,]?\s+B[:.)]?\s+(.+?)[;,]?\s+C[:.)]?\s+(.+?)[;,]?\s+D[:.)]?\s+(.+?)\.?$/.exec(it.question || '');
    return m ? { stem: m[1], options: [m[2], m[3], m[4], m[5]] } : { stem: it.question || '', options: [] };
  }

  /* ---------- Mark schemes ----------
     A past-paper question shows its real Pearson mark scheme: the rows for its part, cut out of the
     mark scheme PDF (data/ms-<subject>.json says where, img/ms/<subject>/<paper>-Q<n>.webp is the
     question's mark scheme as one tall picture). The AI practice questions, and past-paper questions
     whose mark scheme could not be found, show a mark scheme written for the site in the same table
     layout, marked as such. */
  const MS_COLS = {
    physics: ['Question number', 'Answer', null, 'Mark'],
    chemistry: ['Question number', 'Answer', 'Additional guidance', 'Mark'],
    biology: ['Question number', 'Answer', 'Additional guidance', 'Mark'],
    maths: ['Question', 'Scheme', null, 'Marks']
  };
  let msIndex = {};   // item id -> [top, height, width, header top, header height, whole question, picture number]

  function msLabel(it) {
    if (it.ai) { const m = /-Q(\d+)([a-z]?)$/.exec(it.id); return m ? m[1] + (m[2] ? '(' + m[2] + ')' : '') : ''; }
    return it.q + (it.part ? '(' + it.part.split('+').join(')(') + ')' : '');
  }

  // A paper's mark scheme pictures are packed into a few files, <paper>-<k>.webp; msIndex says which
  // one (and where in it) an item's rows are.
  function msSheet(it) {
    const c = msIndex[it.id];
    return 'img/ms/' + subject + '/' + it.paper + (c && c[6] ? '-' + c[6] : '-Q' + it.q) + '.webp';
  }

  // What the mark scheme table says for a question the site wrote the mark scheme for.
  // lines: {t: text, b: bold, u: underlined heading, i: italic, m: "(1)" mark at the right}.
  function msModel(it) {
    const lines = [];
    const guide = [];
    if (it.ai) {
      const q = aiParts(it);
      const letter = q.options.length ? (/^\s*([A-D])\b/.exec(it.answer || '') || [])[1] : null;
      // A step that ends "(1)" already says its mark: move it to the mark side.
      const split = (str) => {
        const m = /\s*\((\d)\)\.?\s*$/.exec(str);
        return m ? { t: str.slice(0, m.index) + (/\.\s*$/.test(m[0]) ? '.' : ''), m: '(' + m[1] + ')' } : { t: str };
      };
      const steps = (it.steps || []).map(split);
      if (letter) {
        lines.push({ t: 'The only correct answer is ' + letter, b: true, m: '(1)' });
        steps.forEach((x) => lines.push({ t: x.t }));
      } else if (it.scheme) {
        if (it.answer) lines.push({ t: it.answer, b: true });
        steps.forEach((x) => lines.push({ t: x.t, m: x.m || '(1)' }));
      } else if (subject === 'maths') {
        // Method and accuracy marks on the last lines of the working, as the Edexcel Maths schemes do.
        const first = Math.max(0, steps.length - (it.marks || 0));
        steps.forEach((x, k) => {
          let code = '';
          if (steps.length >= (it.marks || 0) && k >= first) code = it.marks === 1 ? 'B1' : (k === steps.length - 1 ? 'A1' : 'M1');
          lines.push({ t: x.t, m: code || x.m });
        });
      } else {
        if (it.answer) lines.push({ t: it.answer, b: true });
        if (steps.length) {
          lines.push({ t: 'Example of working', u: true });
          steps.forEach((x) => lines.push({ t: x.t, m: x.m }));
        }
      }
      (it.accept || []).forEach((a) => guide.push('Allow ' + a));
    } else {
      // One marking point to a line: cut at a semicolon or at the end of a sentence.
      String(it.ms || 'Not recorded.').replace(/([.!?])\s+(?=[A-Z(])/g, '$1\n').split(/\s*;\s+|\n/).filter(Boolean)
        .forEach((s) => lines.push({ t: s }));
    }
    return { label: msLabel(it), lines: lines, guide: guide, marks: it.marks };
  }

  function emulatedMs(it) {
    const cols = MS_COLS[subject];
    const model = msModel(it);
    const wrap = el('div', 'ms-emulated');
    const table = el('table', 'ms-table');
    const hr = el('tr');
    cols.forEach((c, k) => { if (c) hr.appendChild(el('th', ['ms-q', 'ms-a', 'ms-g', 'ms-mk'][k], c)); });
    table.appendChild(el('thead')).appendChild(hr);
    const tr = el('tr');
    tr.appendChild(el('td', 'ms-q', model.label));
    const ans = el('td', 'ms-a');
    model.lines.forEach((l) => {
      const row = el('div', 'ms-line' + (l.b ? ' is-bold' : '') + (l.u ? ' is-head' : ''));
      row.appendChild(el('span', 'ms-t', l.t));
      if (l.m) row.appendChild(el('span', 'ms-m', l.m));
      ans.appendChild(row);
    });
    // No "Additional guidance" column (Physics, Maths): the allowed alternatives go under the answer.
    if (!cols[2]) model.guide.forEach((g) => ans.appendChild(el('div', 'ms-line is-note', g)));
    tr.appendChild(ans);
    if (cols[2]) {
      const g = el('td', 'ms-g');
      model.guide.forEach((x) => g.appendChild(el('div', 'ms-line', x)));
      tr.appendChild(g);
    }
    tr.appendChild(el('td', 'ms-mk', String(model.marks != null ? model.marks : '')));
    table.appendChild(el('tbody')).appendChild(tr);
    wrap.appendChild(table);
    return wrap;
  }

  function markScheme(it) {
    const box = el('div', 'qcard-ms');
    const c = !it.ai && msIndex[it.id];
    const note = (text) => box.appendChild(el('p', 'ms-cap', text));
    const written = (why) => {
      box.textContent = '';
      box.appendChild(emulatedMs(it));
      note(why);
    };
    // A predicted question: its mark scheme is a picture, cut from a sheet of them (it.msc: sheet, top,
    // height, width), with why the question was predicted under it.
    if (it.msc) {
      const fig = el('div', 'ms-real');
      const d = el('div', 'ms-crop');
      d.style.paddingBottom = (it.msc[2] / it.msc[3] * 100) + '%';
      const im = document.createElement('img');
      im.decoding = 'async';
      im.src = it.msc[0];
      im.alt = 'Mark scheme for ' + (it.name || it.id);
      im.style.top = (-it.msc[1] / it.msc[2] * 100) + '%';
      im.addEventListener('error', () => { fig.replaceWith(el('p', 'ms-cap', 'The mark scheme picture could not be loaded. Try reloading the page.')); }, { once: true });
      d.appendChild(im);
      fig.appendChild(d);
      box.appendChild(fig);
      note('Mark scheme written for IAL Prep in the Edexcel layout. It is not a Pearson mark scheme.');
      if (it.why) {
        const p = el('p', 'ms-why');
        p.appendChild(el('strong', null, 'Why it is predicted: '));
        p.appendChild(document.createTextNode(it.why));
        box.appendChild(p);
      }
      return box;
    }
    if (!c) {
      written(it.ai
        ? 'Mark scheme written for IAL Prep in the Edexcel layout. It is not a Pearson mark scheme.'
        : 'The Pearson mark scheme for this paper could not be found, so this one was written for IAL Prep in the Edexcel layout from the question. It is not a Pearson mark scheme.');
      return box;
    }
    const url = msSheet(it);
    const alt = 'Mark scheme for ' + (it.name || it.id) + ' from ' + paperLabel(it) + ', ' + partLabel(it);
    const slices = [];
    if (c[4]) slices.push([c[3], c[4]]);      // the "Question Number | Answer | Mark" header row
    slices.push([c[0], c[1]]);
    const fig = el('div', 'ms-real');
    slices.forEach((s, k) => {
      const d = el('div', 'ms-crop');
      d.style.paddingBottom = (s[1] / c[2] * 100) + '%';
      const im = document.createElement('img');
      im.decoding = 'async';
      im.src = url;
      im.alt = k === slices.length - 1 ? alt : '';
      im.style.top = (-s[0] / s[1] * 100) + '%';
      if (k === slices.length - 1) {
        im.addEventListener('error', () => written('The Pearson mark scheme picture could not be loaded, so this one was written for IAL Prep in the Edexcel layout from the question. It is not a Pearson mark scheme.'), { once: true });
      }
      d.appendChild(im);
      fig.appendChild(d);
    });
    box.appendChild(fig);
    note('Pearson mark scheme, ' + sessionLabel(it) + (c[5] && it.part ? ' (the whole question is shown)' : '') + '.');
    return box;
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
    const bits = [n.toLocaleString() + ' of ' + data.items.filter(inSource).length.toLocaleString() + ' questions'];
    if (n) bits.push(doneHere.toLocaleString() + ' done');
    if (state.sel.size) bits.push(chosenLabel(chosen()));
    $('#count').textContent = bits.join(' · ');
    const box = $('#topic-pdfs');
    box.textContent = '';
    // One topic chosen, or a Unit that has only one topic (General skills, the practical units).
    const keys = chosen();
    let key = keys.length === 1 ? keys[0] : null;
    if (key && readyMade && !readyMade.topics[key]) {
      const inside = Object.keys(readyMade.topics).filter((k) => k.indexOf(key + ' > ') === 0);
      key = inside.length === 1 ? inside[0] : null;
    }
    let ready = readyMade && key && readyMade.topics[key];
    let scope = 'topic';
    // A whole Unit (with several topics) has its own PDF, with a divider between the topics.
    const unitKey = keys.length === 1 ? keys[0] : null;
    if (!ready && readyMade && readyMade.units && unitKey && readyMade.units[unitKey]) { ready = readyMade.units[unitKey]; scope = 'unit'; }
    box.hidden = !ready;
    if (ready) {
      const name = nameOf(keys[0]);
      const text = el('p', 'tb-topic-pdfs-text');
      text.appendChild(el('strong', null, (scope === 'unit' ? 'Prebuilt paper for the whole unit: ' : 'Prebuilt topical paper: ') + name));
      text.append(ready.n.toLocaleString() + ' questions in one PDF, ready to open. ');
      const all = el('button', null, 'See all prebuilt topical papers');
      all.type = 'button';
      all.addEventListener('click', () => setView('papers', 'push'));
      text.appendChild(all);
      box.append(text, pdfButtons(ready, (scope === 'unit' ? 'in ' : 'on ') + name));
    }
    $('#topics-done').textContent = 'Show ' + (n === 1 ? 'the question' : 'the ' + n.toLocaleString() + ' questions');
  }

  // Ticks the chosen rows in the tree and the menus, and highlights them. reveal also opens the
  // Units and topics around them, for a choice made in the menus or reached from the address or
  // "Continue" rather than in the tree.
  function showChoice(reveal) {
    paintTicks();
    paintMenus();
    document.querySelectorAll('#tree .active').forEach((n) => n.classList.remove('active'));
    const keys = chosen();
    const rows = keys.length ? keys.map((k) => rowOf.get(k)).filter(Boolean) : [$('#tree .tree-all')];
    rows.forEach((row) => {
      row.classList.add('active');
      if (reveal) for (let d = row.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
    });
  }

  const narrow = () => window.matchMedia('(max-width: 980px)').matches;

  // After the choice changes. from: the tree row whose name was clicked, 'tick' for a tick box
  // in the tree, or 'menu'. Ticking leaves the page where it is, since more may follow.
  function applyChoice(from) {
    state.only = null;
    $('#resume').hidden = true;   // a topic picked: the offer to go back is no longer needed
    showChoice(from === 'menu');
    render(true);
    // On a phone the topic list sits above the questions: put it away once a topic is picked.
    if (from && from.tagName === 'BUTTON' && narrow()) showTopics(false);
    // A topic with a prebuilt paper: start at its card, so the download buttons are in view.
    if (from && from.tagName) ($('#topic-pdfs').hidden ? $('#qlist') : $('#topic-pdfs')).scrollIntoView({ block: 'start' });
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
    const focused = art.contains(document.activeElement) ? document.activeElement : null;
    const fresh = card(it);
    fresh.querySelector('.qcard-notes').open = notesOpen;
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
     the navigation bar and on the landing page. The topics are also kept in the address (one ?t=
     each), so reloading or sharing the page keeps them, and Back goes to the previous choice. The navigation
     bar links to a Unit as ?unit=, the study reports to a spec point as ?code=, and "Continue"
     adds the question as ?at=. */
  let rememberTimer = 0;
  function remember(id) {
    clearTimeout(rememberTimer);
    rememberTimer = setTimeout(() => {
      if (view === 'papers') return;   // the questions are not on screen: keep the place saved before
      const at = id ? byId.get(id) : null;
      const top = at || (firstOnScreen() ? byId.get(firstOnScreen().id.slice(2)) : null);
      // path: the one topic chosen, as before; paths: every row chosen, when there are several.
      const keys = chosen();
      const last = { kind: 'bank', s: subject, path: keys.length === 1 ? keys[0].split(' > ') : [], paths: keys, item: top ? top.id : null, name: top ? (top.name || top.id) : null, at: Date.now() };
      writeJson(KEY_LAST, last);
      writeJson(KEY_LAST_ANY, last);
      writeJson('ialqb_place_' + subject, last);   // the latest place in this subject, of any kind (js/nav.js)
    }, 300);
  }

  // keys: the tree rows chosen, one ?t= each.
  function readUrl() {
    const q = new URLSearchParams(location.search);
    const keys = q.getAll('t').filter((k) => k && leaves.has(k));
    const unit = q.get('unit');
    if (!keys.length && unit) {
      const re = new RegExp('^Unit ' + unit.replace(/\W/g, '') + '\\b');
      const hit = Array.from(nodes.keys()).find((k) => k && k.indexOf(' > ') < 0 && re.test(k));
      if (hit) keys.push(hit);
    }
    // A spec code (S25, C6.5, P1.2.3), as the study reports link to it: open its spec point.
    const code = q.get('code');
    if (!keys.length && code) {
      const hit = data.items.find((it) => it.topic === code);
      if (hit) keys.push(pathKey(itemPath(hit)));
    }
    const item = q.get('item');
    return { keys: keys, only: item && byId.has(item) ? item : null, at: q.get('at'), view: q.get('view') === 'papers' ? 'papers' : 'questions' };
  }

  function syncUrl(push) {
    const u = new URL(location.href);
    u.searchParams.set('s', subject);
    u.searchParams.delete('unit');
    u.searchParams.delete('code');
    u.searchParams.delete('at');
    u.searchParams.delete('t');
    if (view === 'papers') u.searchParams.set('view', 'papers'); else u.searchParams.delete('view');
    chosen().forEach((k) => u.searchParams.append('t', k));
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
    const keys = (saved.paths || (saved.path && saved.path.length ? [pathKey(saved.path)] : [])).filter((k) => k && leaves.has(k));
    const item = saved.item && byId.has(saved.item) ? byId.get(saved.item) : null;
    if (!keys.length && !item) return;
    const where = keys.length ? chosenLabel(keys) : 'All topics';
    $('#resume-text').textContent = 'Pick up where you left off: ' + where + (item ? ', at “' + (item.name || item.id) + '”' : '') + '.';
    $('#resume').hidden = false;
    $('#resume-go').addEventListener('click', () => {
      $('#resume').hidden = true;
      setChoice(keys);
      state.only = null;
      showChoice(true);
      render(true);
      syncUrl(true);
      if (!item || !jumpTo(item.id)) $('#qlist').scrollIntoView({ block: 'start' });
    });
    $('#resume-x').addEventListener('click', () => { $('#resume').hidden = true; });
  }

  function bind() {
    // A tick box adds its row to the choice or takes it out; a name chooses just that row.
    $('#tree').addEventListener('change', (e) => {
      const box = e.target.closest('.tree-tick');
      if (!box) return;
      leaves.get(box.dataset.key).forEach((k) => { if (box.checked) state.sel.add(k); else state.sel.delete(k); });
      applyChoice('tick');
    });
    $('#tree').addEventListener('click', (e) => {
      if (e.target.closest('.tree-tick')) return;
      const t = e.target.closest('[data-path]');
      if (!t) return;
      setChoice(t.dataset.path ? [t.dataset.path] : []);
      applyChoice(t);
    });
    $('#topics-done').addEventListener('click', () => {
      showTopics(false);
      $('.tb-countbar').scrollIntoView({ block: 'start' });
    });
    MENUS.forEach((m) => {
      m.box = $(m.id);
      m.det = $('details', m.box);
      m.sum = $('summary', m.box);
      m.panel = $('.tb-menu-panel', m.box);
      m.sum.addEventListener('click', (e) => { if (m.box.classList.contains('is-disabled')) e.preventDefault(); });
      m.det.addEventListener('toggle', () => {
        if (!m.det.open) return;
        MENUS.forEach((o) => { if (o !== m && o.det) o.det.open = false; });
        placeMenu(m);
      });
      m.panel.addEventListener('change', (e) => {
        const key = e.target.dataset.key;
        if (!key) return;
        if (e.target.checked) menuKeys.add(key);
        else menuKeys.forEach((k) => { if (k === key || k.indexOf(key + ' > ') === 0) menuKeys.delete(k); });
        state.sel = choiceFromMenu();
        applyChoice('menu');
      });
      // "All topics in this unit" and the like: untick everything in this menu and the ones after it.
      m.panel.addEventListener('click', (e) => {
        if (!e.target.closest('[data-clear]')) return;
        menuKeys.forEach((k) => { if (k.split(' > ').length > m.level) menuKeys.delete(k); });
        state.sel = choiceFromMenu();
        applyChoice('menu');
      });
    });
    // A menu closes on a click anywhere else, or on Escape.
    document.addEventListener('click', (e) => {
      MENUS.forEach((m) => { if (m.det.open && !m.box.contains(e.target)) m.det.open = false; });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      MENUS.forEach((m) => { if (m.det.open) { m.det.open = false; m.sum.focus(); } });
    });
    $('#f-search').addEventListener('input', (e) => { state.q = e.target.value.trim().toLowerCase(); state.only = null; render(true); });
    $('#f-year').addEventListener('change', (e) => { state.year = e.target.value; render(true); });
    $('#f-unit').addEventListener('change', (e) => { state.unit = e.target.value; render(true); });
    $('#f-marks').addEventListener('change', (e) => { state.marks = e.target.value; render(true); });
    $('#f-sort').addEventListener('change', (e) => { state.sort = e.target.value; render(true); });
    $('#f-show').addEventListener('change', (e) => { state.show = e.target.value; render(true); });
    // "Include AI practice questions", and once it is ticked, "Only AI practice questions".
    const syncSource = () => {
      const on = $('#f-ai').checked;
      if (!on) $('#f-ai-only').checked = false;
      $('#f-ai-only-wrap').hidden = !on;
      state.source = !on ? 'past' : $('#f-ai-only').checked ? 'ai' : '';
      try { localStorage.setItem(KEY_SOURCE, state.source); } catch (err) { /* storage blocked */ }
      buildTree();
      showChoice(false);
      render(true);
    };
    $('#f-ai').addEventListener('change', syncSource);
    $('#f-ai-only').addEventListener('change', syncSource);
    // "Leave out regional papers": the tree's counts and the list both drop the paper A questions.
    $('#f-noregional').addEventListener('change', (e) => {
      state.noRegional = e.target.checked;
      try { localStorage.setItem(KEY_REGIONAL, state.noRegional ? '1' : ''); } catch (err) { /* storage blocked */ }
      buildTree();
      showChoice(false);
      render(true);
    });
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
      setView(u.view, null);
      setChoice(u.keys);
      state.only = u.only;
      showChoice(true);
      render(true);
    });
    // Prebuilt topical papers: the switch under the heading, the button at the top of the topic list.
    $('#view-q').addEventListener('click', () => { if (view !== 'questions') setView('questions', 'push'); });
    $('#view-p').addEventListener('click', () => { if (view !== 'papers') setView('papers', 'push'); });
    $('#side-pb').addEventListener('click', () => {
      if (narrow()) showTopics(false);
      setView('papers', 'push');
    });
    $('#pb-find').addEventListener('input', pbFilter);
    $('#pb-fold').addEventListener('click', () => {
      pbOpen = !pbOpen;
      pbUnits.forEach((u) => { if (u.multi) u.box.open = pbOpen; });
      $('#pb-fold').textContent = pbOpen ? 'Collapse all' : 'Expand all';
    });
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
  // Any number of questions can be downloaded. Big selections save each page a little more
  // compressed, so the PDF takes less memory while it is built (phones have the least).
  const BIG_DOWNLOAD = 150;
  // Page size in pixels at a resolution: 200 dpi for the PDFs made here, less for the ready-made
  // topic PDFs (smaller files). buildPdf sets it before each PDF; one PDF is made at a time.
  let DPI, MM, PAGE_W, PAGE_H, MARGIN, BOTTOM;
  function setDpi(dpi) {
    DPI = dpi;
    MM = DPI / 25.4;
    PAGE_W = Math.round(210 * MM);
    PAGE_H = Math.round(297 * MM);
    MARGIN = Math.round(14 * MM);
    BOTTOM = PAGE_H - Math.round(14 * MM);
  }
  setDpi(200);
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

  // The rows of the real mark scheme that belong to an item, as one picture (a canvas that looks
  // like an image to the PDF maker): the header row, when it is not already on top, then the rows.
  const sheetCache = new Map();
  async function msPicture(it, c) {
    const url = msSheet(it);
    if (!sheetCache.has(url)) {
      sheetCache.set(url, loadImage(url));
      // Keep only the last few pictures: a whole Unit's PDF touches thousands of them, and each
      // decoded picture is several megabytes.
      while (sheetCache.size > 6) {
        const oldest = sheetCache.keys().next().value;
        const gone = sheetCache.get(oldest);
        sheetCache.delete(oldest);
        gone.then((im) => { im.src = ''; }).catch(() => {});
      }
    }
    const sheet = await sheetCache.get(url);
    const slices = c[4] ? [[c[3], c[4]], [c[0], c[1]]] : [[c[0], c[1]]];
    const cv = document.createElement('canvas');
    cv.width = c[2];
    cv.height = slices.reduce((t, s) => t + s[1], 0);
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cv.width, cv.height);
    let yy = 0;
    slices.forEach((s) => { g.drawImage(sheet, 0, s[0], c[2], s[1], 0, yy, c[2], s[1]); yy += s[1]; });
    cv.naturalWidth = cv.width;
    cv.naturalHeight = cv.height;
    return cv;
  }

  // A predicted question's mark scheme, cut from its sheet (it.msc: sheet, top, height, width).
  async function predMsPicture(it) {
    const c = it.msc;
    if (!sheetCache.has(c[0])) sheetCache.set(c[0], loadImage(c[0]));
    const sheet = await sheetCache.get(c[0]);
    const cv = document.createElement('canvas');
    cv.width = c[3];
    cv.height = c[2];
    const g = cv.getContext('2d');
    g.fillStyle = '#fff';
    g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(sheet, 0, c[1], c[3], c[2], 0, 0, c[3], c[2]);
    cv.naturalWidth = cv.width;
    cv.naturalHeight = cv.height;
    return cv;
  }

  // Where the full mark scheme for a paper can be downloaded (from the papers page's list).
  let paperIndex = null;
  function loadPaperIndex() {
    if (paperIndex) return Promise.resolve(paperIndex);
    return fetch('data/papers-' + subject + '.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((json) => {
        paperIndex = new Map();
        if (json) json.papers.forEach((p) => paperIndex.set(p.id, { tag: json.tag, paper: p }));
        return paperIndex;
      });
  }
  const RELEASES = 'https://github.com/mirakludbA08/IALqBank/releases/download/';
  const PAPER_VIEW = 'https://ialprep.com/paper-pdf/';   // functions/paper-pdf: opens in the browser

  // Lays out one A4 page at a time on a canvas, then adds it to the PDF.
  function composer(doc, quality) {
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
      doc.addImage(canvas.toDataURL('image/jpeg', quality), 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      links.forEach((l) => doc.link(l.x / MM, l.y / MM, l.w / MM, l.h / MM, { url: l.url }));
      pages++;
      blank();
    };
    const setFont = (o) => { ctx.font = (o.bold ? '700 ' : '400 ') + px(o.pt || 10) + 'px ' + PDF_FONT; };
    function wrap(str, o) {
      setFont(o);
      const max = (o.maxw || W) - (o.indent || 0);
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
      // Start the next thing on a fresh page (a new section of the PDF).
      breakPage() { if (used) flush(); },
      // A coloured band across the page with a title and, under it, a smaller line: the divider
      // between topics (level 1, dark) and between spec points (level 2, light).
      banner(level, title, sub) {
        const big = level === 1;
        const pt = big ? 15 : 12;
        const lh = lineH({ pt: pt });
        const lines = wrap(title, { pt: pt, bold: true, maxw: W - 2 * px(4) });
        const subLines = sub ? wrap(sub, { pt: 9.5, maxw: W - 2 * px(4) }) : [];
        const h = px(4) * 2 + lines.length * lh + subLines.length * lineH({ pt: 9.5 });
        this.need(h + px(30));
        ctx.fillStyle = big ? '#002b80' : '#e3eaf6';
        ctx.fillRect(MARGIN, y, W, h);
        ctx.fillStyle = big ? '#fff' : '#002b80';
        ctx.textBaseline = 'top';
        let yy = y + px(4);
        setFont({ pt: pt, bold: true });
        lines.forEach((ln) => { ctx.fillText(ln, MARGIN + px(4), yy); yy += lh; });
        setFont({ pt: 9.5 });
        ctx.fillStyle = big ? '#dbe5ff' : '#33415c';
        subLines.forEach((ln) => { ctx.fillText(ln, MARGIN + px(4), yy); yy += lineH({ pt: 9.5 }); });
        y += h + px(8);
        used = true;
      },
      // A mark scheme table written for the site: header row, then one row of cells (label, answer
      // lines with marks, guidance, mark). cols are the header names (a null one is left out).
      table(model, cols) {
        const pt = 9.5;
        const has = !!cols[2];
        const widths = has ? [0.14, 0.46, 0.30, 0.10] : [0.15, 0.75, 0, 0.10];
        const xs = [];
        let acc = MARGIN;
        widths.forEach((f) => { xs.push(acc); acc += Math.round(W * f); });
        const pad = px(3.5);
        const o = { pt: pt };
        const lh = lineH(o);
        // cell text, wrapped to its column
        const cell = (items, col, bold) => {
          const out = [];
          items.forEach((it) => {
            const mw = Math.round(W * widths[col]) - 2 * pad - (it.m ? px(8) : 0);
            wrap(it.t, { pt: pt, bold: it.b || bold, maxw: mw }).forEach((ln, k) => out.push({ t: ln, b: it.b || bold, u: it.u, i: it.i, m: k === 0 ? it.m : null }));
            out.push({ gap: true });
          });
          return out;
        };
        const answer = model.lines.map((l) => ({ t: l.t, b: l.b, u: l.u, m: l.m }));
        if (!has) model.guide.forEach((g) => answer.push({ t: g, i: true }));
        const colsText = [
          cell([{ t: model.label }], 0, true),
          cell(answer, 1, false),
          has ? cell(model.guide.map((g) => ({ t: g })), 2, false) : [],
          cell([{ t: String(model.marks != null ? model.marks : '') }], 3, true)
        ];
        const rows = Math.max.apply(null, colsText.map((c) => c.reduce((n, x) => n + (x.gap ? 0.45 : 1), 0)));
        const headH = lh + 2 * pad;
        const bodyH = Math.round(rows * lh) + 2 * pad;
        this.need(headH + Math.min(bodyH, px(60)));
        // header
        ctx.fillStyle = '#d9d9d9';
        ctx.fillRect(MARGIN, y, W, headH);
        ctx.strokeStyle = '#6b6b6b';
        ctx.lineWidth = 2;
        ctx.strokeRect(MARGIN, y, W, headH);
        ctx.fillStyle = '#000';
        ctx.textBaseline = 'top';
        setFont({ pt: pt });
        cols.forEach((c, k) => { if (c) ctx.fillText(c, xs[k] + pad, y + pad); });
        y += headH;
        // body (a row too tall for the rest of the page continues on the next one)
        this.need(Math.min(bodyH, px(80)));
        const top = y;
        let yy = top + pad;
        const maxLines = Math.max.apply(null, colsText.map((c) => c.length));
        for (let r = 0; r < maxLines; r++) {
          colsText.forEach((c, k) => {
            const x = c[r];
            if (!x || x.gap) return;
            setFont({ pt: pt, bold: x.b });
            ctx.fillStyle = '#000';
            ctx.fillText(x.t, xs[k] + pad, yy);
            if (x.u) ctx.fillRect(xs[k] + pad, yy + px(pt) + 2, ctx.measureText(x.t).width, 2);
            if (x.m) { setFont({ pt: pt }); ctx.fillText(x.m, xs[k] + Math.round(W * widths[k]) - pad - ctx.measureText(x.m).width, yy); }
          });
          const gapRow = colsText.every((c) => !c[r] || c[r].gap);
          yy += gapRow ? Math.round(lh * 0.45) : lh;
          if (yy > BOTTOM - pad) break;
        }
        const h = Math.min(yy + pad, BOTTOM) - top;
        ctx.strokeRect(MARGIN, top, W, h);
        xs.forEach((x, k) => { if (k > 0 && widths[k]) { ctx.beginPath(); ctx.moveTo(x, y - headH); ctx.lineTo(x, top + h); ctx.stroke(); } });
        y = top + h;
        used = true;
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

  /* Builds the question (qp) or mark scheme (ms) PDF of these questions and returns the jsPDF
     document. opts.heading names the set (a topic, for the ready-made PDFs), opts.quality sets
     the JPEG quality of each page, and opts.progress(i, n) hears about each question. */
  async function buildPdf(kind, items, opts) {
    opts = opts || {};
    setDpi(opts.dpi || 200);
    await loadScript(JSPDF_URL, () => !!(window.jspdf && window.jspdf.jsPDF));
    if (kind === 'ms') await loadPaperIndex();
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const page = composer(doc, opts.quality || (items.length > BIG_DOWNLOAD ? 0.7 : 0.82));
    const name = SUBJECTS[subject].label;
    const heading = (opts.heading ? name + ': ' + opts.heading : name) + (kind === 'qp' ? ' questions' : ' mark scheme');
    {
      const marks = items.reduce((t, it) => t + (it.marks || 0), 0);
      const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
      page.text(heading, { pt: 20, bold: true, color: '#002b80', after: 4 });
      page.text(items.length + (items.length === 1 ? ' question' : ' questions') + ', ' + marks + ' marks · made on IAL Prep, ' + today, { pt: 10, color: '#5b6573', after: 6 });
      if (kind === 'ms') {
        page.text('For each question: the Pearson mark scheme for its part, cut from the published mark scheme. Where there is no Pearson mark scheme (the AI practice questions, and papers whose mark scheme could not be found), the mark scheme is written for IAL Prep in the same layout and says so.', { pt: 9.5, color: '#5b6573', after: 6 });
      }
      page.rule();

      // Questions grouped into sections (opts.group: 'spec' = by spec point, for a topic;
      // 'topic' = by topic and then spec point, for a whole Unit). A contents list opens the PDF and
      // each section starts on a new page under a banner, so the subtopics are easy to tell apart.
      let sections = null;
      if (opts.group) {
        const natural = (x, y) => String(x).localeCompare(String(y), undefined, { numeric: true });
        const key = (it, k) => (it.path && it.path[k]) || 'Other';
        // The spec point's full wording, where the taxonomy has it (the path keeps only a short form).
        const tax = new Map();
        (data.taxonomy || []).forEach((e) => {
          tax.set(e.code, e);
          const n = /\.(\d+)$/.exec(e.code);        // Physics: spec point S25 is the entry U1.25
          if (n && !tax.has('S' + n[1])) tax.set('S' + n[1], e);
        });
        const trim = (t) => {
          // the specification text sometimes ends with its page footer: leave that off
          t = t.replace(/\s*(Specification Issue|Pearson Education Limited)[^]*$/i, '').trim();
          return t.length > 150 ? t.slice(0, 150).replace(/\s+\S*$/, '') + '…' : t;
        };
        const specName = (sp) => {
          const code = String(sp).split(' - ')[0];
          const e = tax.get(code);
          return e && e.text ? code + ' - ' + trim(e.text) : sp;
        };
        const by = new Map();
        items.forEach((it) => {
          const t = opts.group === 'topic' ? key(it, 1) : '';
          const sp = key(it, 2);
          const code = String(sp).split(' - ')[0];       // one section per spec point, however its name is spelt
          const k = t + ' | ' + code;
          if (!by.has(k)) by.set(k, { topic: t, spec: specName(sp), order: code, items: [] });
          by.get(k).items.push(it);
        });
        sections = [...by.values()].sort((a, b) => natural(a.topic, b.topic) || natural(a.order, b.order));
        items = [].concat(...sections.map((sec) => sec.items));
        page.text('Contents', { pt: 12, bold: true, color: '#002b80', after: 4 });
        let lastTopic = null;
        sections.forEach((sec) => {
          if (opts.group === 'topic' && sec.topic !== lastTopic) {
            lastTopic = sec.topic;
            page.text(sec.topic, { pt: 10.5, bold: true, after: 1 });
          }
          page.text(sec.spec + ' (' + sec.items.length + (sec.items.length === 1 ? ' question' : ' questions') + ')', { pt: 9.5, indent: opts.group === 'topic' ? Math.round(10 * DPI / 72) : 0, color: '#33415c', after: 1 });
        });
        page.space(6);
        page.rule();
      }
      let sectionAt = new Map();
      if (sections) {
        let n = 0;
        let lastTopic = null;
        sections.forEach((sec) => { sectionAt.set(n, { sec: sec, newTopic: opts.group === 'topic' && sec.topic !== lastTopic }); lastTopic = sec.topic; n += sec.items.length; });
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (opts.progress) opts.progress(i, items.length);
        if (sectionAt.has(i)) {
          const at = sectionAt.get(i);
          page.breakPage();
          if (at.newTopic) page.banner(1, at.sec.topic, null);
          page.banner(2, at.sec.spec, at.sec.items.length + (at.sec.items.length === 1 ? ' question' : ' questions') + ' in this part of the specification');
        }
        const title = { pt: 12, bold: true, color: '#002b80', after: 2 };
        const meta = { pt: 9, color: '#5b6573', after: 8 };
        const head = (i + 1) + '. ' + (it.name || it.id);
        const sub = [paperLabel(it), partLabel(it)].filter(Boolean).join(' · ') + (it.marks != null ? ' · ' + it.marks + (it.marks === 1 ? ' mark' : ' marks') : '') + ' · ' + it.id;
        if (kind === 'qp' && it.ai && !it.img) {
          const q = aiParts(it);
          const text = q.stem + (q.options.length ? '\n' + q.options.map((o, k) => 'ABCD'[k] + '   ' + o).join('\n') : '');
          const body = { pt: 10.5, after: 4 };
          page.need(page.measure(head, title) + page.measure(sub, meta) + page.measure(text, body));
          page.text(head, title);
          page.text(sub, meta);
          page.text(text, body);
        } else if (kind === 'qp') {
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
          const real = !it.ai && msIndex[it.id];
          let pic = null;
          if (real) {
            try { pic = await msPicture(it, real); } catch (err) { pic = null; }
          } else if (it.msc) {
            try { pic = await predMsPicture(it); } catch (err) { pic = null; }
          }
          if (pic) {
            page.need(page.room(page.measure(head, title) + page.measure(sub, meta), page.fit(pic)));
            page.text(head, title);
            page.text(sub, meta);
            page.image(pic);
            page.text(real ? 'Pearson mark scheme, ' + sessionLabel(it) : 'Written for IAL Prep in the Edexcel layout. Not a Pearson mark scheme.', { pt: 8.5, color: '#5b6573', after: 2 });
          } else if (it.msc) {
            page.need(page.measure(head, title) + page.measure(sub, meta) + Math.round(30 * DPI / 72));
            page.text(head, title);
            page.text(sub, meta);
            page.text('The mark scheme picture for this question could not be loaded.', { pt: 10, color: '#e03131' });
          } else {
            page.need(page.measure(head, title) + page.measure(sub, meta) + Math.round(60 * DPI / 72));
            page.text(head, title);
            page.text(sub, meta);
            page.table(msModel(it), MS_COLS[subject]);
            page.text(it.ai
              ? 'Written for IAL Prep in the Edexcel layout. Not a Pearson mark scheme.'
              : 'The Pearson mark scheme for this paper could not be found: this one was written for IAL Prep from the question, in the Edexcel layout. Not a Pearson mark scheme.', { pt: 8.5, color: '#5b6573', after: 2 });
          }
          // The bank calls the May/June session "May", the papers list "Jun".
          const hit = paperIndex && (paperIndex.get(it.paper) || paperIndex.get(it.paper.replace(/_May(\d{4})$/, '_Jun$1')));
          if (hit && hit.paper.ms) {
            page.text('Full mark scheme: ' + paperLabel(it) + ' (' + it.unit + ')', { pt: 9.5, color: '#0044cc', url: PAPER_VIEW + hit.tag + '/' + hit.paper.ms.file });
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
        doc.text('IAL Prep - ' + heading, 14, 290);
        doc.text(p + ' / ' + total, 196, 290, { align: 'right' });
      }
    }
    return doc;
  }

  window.IALQB_BANK = {
    ids: () => data.items.map((it) => ({ id: it.id, path: itemPath(it), ai: !!it.ai })),
    pdf: async (kind, ids, heading, group) => {
      const items = sorted(ids.map((id) => byId.get(id)).filter(Boolean));
      const doc = await buildPdf(kind, items, { heading: heading, quality: 0.62, dpi: 125, group: group || null });
      return doc.output('datauristring');
    }
  };

  async function download(kind, btn) {
    if (busy) return;
    const items = sorted([...selected].map((id) => byId.get(id)).filter(Boolean));
    if (!items.length) return;
    const label = btn.textContent;
    busy = true;
    updateBar();
    try {
      btn.textContent = 'Getting ready…';
      const doc = await buildPdf(kind, items, { progress: (i, n) => { btn.textContent = 'Building ' + (i + 1) + ' of ' + n + '…'; } });
      const file = SUBJECTS[subject].label + ' ' + (kind === 'qp' ? 'questions' : 'mark scheme') + ' (' + items.length + ').pdf';
      ready(kind, doc.output('blob'), file, items.length);
    } catch (err) {
      alert('The PDF could not be made: ' + err.message + '.');
    } finally {
      btn.textContent = label;
      busy = false;
      updateBar();
    }
  }

  /* A finished PDF: "Open" shows it in the browser's PDF viewer in a new tab, to read and then
     save from there (on an iPhone, Share > Save to Files); "Save" saves it straight away. These
     are links the reader taps, so they work on every browser, iPhones included. */
  const readyUrls = {};
  function ready(kind, blob, file, n) {
    if (readyUrls[kind]) URL.revokeObjectURL(readyUrls[kind]);
    const href = readyUrls[kind] = URL.createObjectURL(blob);
    const box = $('#dl-ready');
    box.hidden = false;
    let row = box.querySelector('[data-kind="' + kind + '"]');
    if (!row) {
      row = el('p', 'tb-dl-ready-row');
      row.dataset.kind = kind;
      box.appendChild(row);
    }
    row.textContent = '';
    row.appendChild(el('span', null, (kind === 'qp' ? 'Questions' : 'Mark scheme') + ' PDF ready (' + n + (n === 1 ? ' question' : ' questions') + '):'));
    const open = el('a', 'tb-dl-btn', 'Open');
    open.href = href;
    open.target = '_blank';
    open.rel = 'noopener';
    const keep = el('a', 'act', 'Save');
    keep.href = href;
    keep.download = file;
    row.append(open, keep);
  }

  function init(json, ai, ready, msi) {
    data = json;
    msIndex = msi || {};
    readyMade = ready && ready.topics ? ready : null;
    // The AI practice questions: their mark-scheme text, for search and the MS download.
    // (A predicted question's mark scheme is a picture; its "ms" is already its text, for search.)
    (ai && ai.items || []).forEach((it) => {
      if (!it.pred) it.ms = 'Answer: ' + (it.answer || '') +
        (it.steps && it.steps.length ? '\n' + it.steps.map((x, k) => (k + 1) + '. ' + x).join('\n') : '') +
        (it.accept && it.accept.length ? '\nAlso creditworthy: ' + it.accept.join('; ') : '');
      data.items.push(it);
    });
    // Physics leaves out old-specification content that is no longer examined.
    if (subject === 'physics') {
      data.items = data.items.filter((it) => !it.path || it.path[0] !== 'Off current spec');
      data.count = data.items.length;
    }
    byId = new Map(data.items.map((i) => [i.id, i]));
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    const past = data.items.filter((it) => !it.ai);
    const nAi = data.items.length - past.length;
    const nPred = data.items.filter((it) => it.pred).length;
    const years = past.map((it) => +it.year);
    $('#blurb-count').textContent = past.length.toLocaleString() + ' questions from ' + Math.min(...years) + ' to ' + Math.max(...years) + ' papers, sorted by topic' +
      (nAi ? ', and ' + nAi.toLocaleString() + ' practice questions written by AI' + (nPred ? ' (' + nPred.toLocaleString() + ' of them predicted for the next exams)' : '') + '.' : '.');
    data.count = data.items.length;
    $('#f-ai').checked = state.source !== 'past';
    $('#f-ai-only').checked = state.source === 'ai';
    $('#f-ai-only-wrap').hidden = state.source === 'past';
    $('#source-field').hidden = !nAi;
    $('#f-noregional').checked = !!state.noRegional;
    $('#regional-field').hidden = !past.some(isRegional);
    buildTree();
    buildFilters();
    bind();
    writeJson(KEY_TOTAL, data.count);
    saveProgress();

    // Open the topic or question the address asks for; otherwise offer to go back to the last one.
    const saved = readJson(KEY_LAST);
    const u = readUrl();
    setChoice(u.keys);
    state.only = u.only;
    showChoice(true);
    render(true);
    $('#loading').hidden = true;
    buildPrebuilt();
    $('#views').hidden = !readyMade;
    $('#side-pb').hidden = !readyMade;
    setView(u.view, null);   // shows the questions (#app) or the prebuilt papers
    syncUrl(false);
    if (u.at) jumpTo(u.at);
    else if (!u.keys.length && !u.only) offerResume(saved);
    // On a phone the intro and filters fill the first screen; go straight to a topic's questions.
    if (u.keys.length && !u.at && narrow() && view === 'questions') ($('#topic-pdfs').hidden ? $('.tb-countbar') : $('#topic-pdfs')).scrollIntoView({ block: 'start' });
  }

  function soon() {
    $('#subject-title').textContent = SUBJECTS[subject].label + ' question bank';
    $('#loading').hidden = true;
    const s = $('#soon');
    s.hidden = false;
    s.textContent = SUBJECTS[subject].label + ' is not in the bank yet: the International A Level papers for this subject have not been added. Physics and Chemistry are ready.';
  }

  $('#papers-link').href = 'papers?s=' + subject;
  if (SUBJECTS[subject].soon) { soon(); return; }
  const getJson = (file) => fetch(file, { cache: 'no-cache' })   // rebuilt now and then: always check for a newer copy
    .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  Promise.all([getJson('data/' + subject + '.json'), getJson('data/ai-' + subject + '.json').catch(() => null),
    getJson('data/bank-pdfs-' + subject + '.json').catch(() => null), getJson('data/ms-' + subject + '.json').catch(() => null)])
    .then(([bank, ai, ready, msi]) => init(bank, ai, ready, msi))
    .catch((err) => {
      $('#loading').hidden = true;
      const s = $('#soon');
      s.hidden = false;
      s.textContent = 'The question data could not be loaded (' + err.message + '). Try reloading the page.';
    });
})();
