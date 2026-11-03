/* IALqBank — the study timetable. js/nav.js puts an arrow on the right edge of every page; it
   slides this in over the whole screen and loads this file the first time.

   - Exam dates: one per subject, as a date or just a month. A month alone counts as the 1st of
     that month, so revision ends the day before it starts.
   - Adding sessions: pick a subject, then drag down a day on the week grid (or tap a slot on a
     touch screen) to add a session; tap a session to change its subject or times, repeat it
     every week until the exam, or delete it. "Repeat this week" copies a whole week forward.
   - Auto-plan: from the subjects and exam dates alone, no AI. Weekdays after school, weekend
     mornings and afternoons; more sessions as an exam gets closer; Friday evenings free until
     the last four weeks; the day before an exam is for that subject; nothing on exam days.
     Nearer exams get more of the sessions, in a repeating weighted rotation.
   Everything is kept in this browser (localStorage, ialqb_tt). While a session is on, the
   navigation bar shows its subject with a button back to where it was left. */
(function () {
  'use strict';

  const KEY = 'ialqb_tt';
  const ORDER = ['physics', 'chemistry', 'biology', 'maths'];
  const LABEL = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', maths: 'Maths' };
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const FIRST = 7 * 60;     // the grid runs from 07:00
  const LAST = 23 * 60;     // to 23:00
  const STEP = 30;          // in half hours
  const DAY = 864e5;
  // The auto-plan's mark: a wand with a spark.
  const WAND = '<svg class="tt-wand" viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 16.5 12 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14.5 2.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7zM16 10l.45 1.05L17.5 11.5l-1.05.45L16 13l-.45-1.05L14.5 11.5l1.05-.45zM8.5 3l.4.9.9.4-.9.4-.4.9-.4-.9-.9-.4.9-.4z" fill="currentColor"/></svg>';

  // Auto-plan sessions per day: [weekday, weekend], each by how close the nearest exam is
  // (more than 8 weeks, 4 to 8 weeks, the last 4 weeks).
  const PLAN = {
    weekday: [
      [['17:00', '18:00']],
      [['16:30', '17:30'], ['18:00', '19:00']],
      [['16:30', '17:30'], ['17:45', '18:45'], ['19:30', '20:30']]
    ],
    weekend: [
      [['10:00', '11:30'], ['14:00', '15:00']],
      [['09:30', '11:00'], ['11:30', '12:30'], ['14:00', '15:30']],
      [['09:00', '10:30'], ['11:00', '12:30'], ['14:00', '15:30'], ['16:00', '17:00']]
    ]
  };

  /* ---------- Dates and times ---------- */
  const pad = (n) => (n < 10 ? '0' : '') + n;
  const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const fromIso = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const midnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mondayOf = (d) => addDays(midnight(d), -((d.getDay() + 6) % 7));
  const toMin = (t) => { const p = t.split(':').map(Number); return p[0] * 60 + p[1]; };
  const toTime = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  const daysBetween = (a, b) => Math.round((midnight(b) - midnight(a)) / DAY);
  const fmt = (d, o) => d.toLocaleDateString(undefined, o);
  const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

  /* ---------- Storage ---------- */
  function load() {
    try {
      const t = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (t && Array.isArray(t.sessions)) return { exams: Array.isArray(t.exams) ? t.exams : [], sessions: t.sessions };
    } catch (e) { /* storage blocked or damaged: start empty */ }
    return { exams: [], sessions: [] };
  }
  let data = load();
  let undoData = null;   // the timetable as it was before "Reset", until the panel closes
  // Any change after a reset (a session, an exam date, an auto-plan) gives up its undo, so the
  // button goes back to Reset; only the reset itself keeps it.
  function save(keepUndo) {
    if (!keepUndo) undoData = null;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage blocked: kept until the page closes */ }
    window.dispatchEvent(new Event('ialqb-timetable'));
  }
  let seq = Date.now();
  const newId = () => (seq++).toString(36);

  // An exam is { s, y, m, day }; day is null when only the month is known.
  const examDate = (e) => new Date(e.y, e.m - 1, e.day || 1);
  const examOf = (s) => data.exams.find((e) => e.s === s);
  const sessionsOn = (key) => data.sessions.filter((x) => x.d === key).sort((p, q) => toMin(p.a) - toMin(q.a));
  const clash = (key, a, b, skip) => data.sessions.some((x) => x.d === key && x.id !== skip && toMin(x.a) < b && a < toMin(x.b));

  /* ---------- Small DOM helpers ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text, onClick) {
    const b = el('button', cls, text);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function select(options, value, onChange, label) {
    const s = el('select');
    options.forEach((o) => {
      const opt = el('option', null, o[1]);
      opt.value = o[0];
      s.appendChild(opt);
    });
    s.value = value;
    if (label) s.setAttribute('aria-label', label);
    s.addEventListener('change', () => onChange(s.value));
    return s;
  }
  const times = (from, to) => { const out = []; for (let m = from; m <= to; m += STEP) out.push([toTime(m), toTime(m)]); return out; };

  /* ---------- State ---------- */
  let root = null;
  let week = mondayOf(new Date());
  let day = midnight(new Date());          // the day shown on a narrow screen
  let brush = null;
  let editing = null;                      // id of the session in the editor
  let sheet = false;                       // the exams and auto-plan sheet is open
  const narrow = window.matchMedia('(max-width: 760px)');

  function takes() {
    const s = data.exams.map((e) => e.s).filter((s) => LABEL[s]);
    return s.length ? ORDER.filter((x) => s.indexOf(x) >= 0) : ORDER.slice();
  }

  function status(text) {
    const p = root && root.querySelector('.tt-status');
    if (p) p.textContent = text;
  }

  /* ---------- Header: countdown to the exams ---------- */
  function countdown() {
    const today = midnight(new Date());
    const ahead = data.exams.map((e) => ({ s: e.s, date: examDate(e), monthOnly: !e.day }))
      .filter((e) => e.date >= today).sort((a, b) => a.date - b.date);
    const p = el('p', 'tt-count');
    if (!ahead.length) {
      p.textContent = 'No exam dates yet. ';
      const set = button('tt-linkbtn', 'Add them in Auto-plan', openPlan);
      p.append(set, document.createTextNode(' for a countdown and a ready-made plan.'));
      return p;
    }
    ahead.forEach((e, i) => {
      const n = daysBetween(today, e.date);
      const when = e.monthOnly ? MONTHS[e.date.getMonth()] + ' ' + e.date.getFullYear() : fmt(e.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
      const span = el('span', 'tt-count-item');
      span.dataset.subject = e.s;
      span.appendChild(el('strong', null, LABEL[e.s]));
      span.appendChild(document.createTextNode(' ' + (n === 0 ? 'today' : n === 1 ? 'tomorrow' : 'in ' + n + ' days') + ' (' + when + ')'));
      p.appendChild(span);
      if (i < ahead.length - 1) p.appendChild(document.createTextNode(' · '));
    });
    return p;
  }

  /* ---------- Exams and auto-plan ---------- */
  function examSheet() {
    const box = el('section', 'tt-sheet');
    box.setAttribute('aria-labelledby', 'tt-plan-title');
    const top = el('div', 'tt-sheet-top');
    const t = el('h3', 'tt-sheet-title');
    t.id = 'tt-plan-title';
    t.innerHTML = WAND;
    t.appendChild(document.createTextNode('Auto-plan'));
    top.append(t, el('p', 'tt-note', 'Two steps: tell it your subjects and exam dates, then let it fill every week up to the exams. You can change any session afterwards.'));
    box.appendChild(top);
    box.appendChild(el('h4', 'tt-step', '1. Your subjects and exam dates'));
    box.appendChild(el('p', 'tt-note', 'Tick the subjects you take and pick the month of each exam, and the day if you know it. With only the month, the plan counts the exam as the start of that month.'));
    const year = new Date().getFullYear();
    const years = [year, year + 1, year + 2].map((y) => [String(y), String(y)]);
    const dayOpts = [['', 'Day not known']].concat(Array.from({ length: 31 }, (_, i) => [String(i + 1), String(i + 1)]));
    const monthOpts = MONTHS.map((m, i) => [String(i + 1), m]);
    const list = el('div', 'tt-exams');
    ORDER.forEach((s) => {
      const e = examOf(s);
      const row = el('div', 'tt-exam');
      row.dataset.subject = s;
      const tick = el('label', 'tt-exam-take');
      const cb = el('input');
      cb.type = 'checkbox';
      cb.checked = !!e;
      tick.append(cb, el('span', null, LABEL[s]));
      const def = e || { s: s, y: new Date().getMonth() >= 4 ? year + 1 : year, m: 5, day: null };
      const upd = (patch) => {
        let cur = examOf(s);
        if (!cur) { cur = Object.assign({}, def); data.exams.push(cur); cb.checked = true; }
        Object.assign(cur, patch);
        save();
        refreshHead();
        render();
      };
      const mSel = select(monthOpts, String(def.m), (v) => upd({ m: Number(v) }), LABEL[s] + ' exam month');
      const ySel = select(years, String(def.y), (v) => upd({ y: Number(v) }), LABEL[s] + ' exam year');
      const dSel = select(dayOpts, def.day ? String(def.day) : '', (v) => upd({ day: v ? Number(v) : null }), LABEL[s] + ' exam day');
      const fields = el('div', 'tt-exam-when');
      fields.append(mSel, ySel, dSel);
      const sync = () => { [mSel, ySel, dSel].forEach((x) => { x.disabled = !cb.checked; }); };
      cb.addEventListener('change', () => {
        if (cb.checked) { if (!examOf(s)) data.exams.push(Object.assign({}, def, { m: Number(mSel.value), y: Number(ySel.value), day: dSel.value ? Number(dSel.value) : null })); }
        else data.exams = data.exams.filter((x) => x.s !== s);
        sync();
        save();
        refreshHead();
        render();
      });
      sync();
      row.append(tick, fields);
      list.appendChild(row);
    });
    box.appendChild(list);

    const plan = el('div', 'tt-plan');
    plan.appendChild(el('h4', 'tt-step', '2. Make the plan'));
    plan.appendChild(el('p', 'tt-note', 'Fills your timetable from today until each exam: after school on weekdays and mornings and afternoons at weekends, with more sessions as an exam gets closer. Friday evenings stay free until the last four weeks, the day before an exam is for that subject, and nothing is planned on exam days. Sessions you added yourself are kept; an earlier auto-plan is replaced.'));
    const go = button('tt-btn tt-btn-primary tt-btn-big', null, autoPlan);
    go.innerHTML = WAND;
    go.appendChild(document.createTextNode('Make my timetable'));
    plan.appendChild(go);
    box.appendChild(plan);
    return box;
  }

  // Opens the auto-plan sheet and puts the focus on its first subject.
  function openPlan() {
    sheet = true;
    render();
    const s = root.querySelector('.tt-sheet');
    if (!s) return;
    s.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const first = s.querySelector('input');
    if (first) first.focus({ preventScroll: true });
  }

  // Shown while the timetable is empty: the quickest way in is the auto-plan.
  function startCard() {
    const box = el('section', 'tt-start');
    box.setAttribute('aria-labelledby', 'tt-start-title');
    const text = el('div', 'tt-start-text');
    const h = el('h3', null, 'Plan your revision in one go');
    h.id = 'tt-start-title';
    text.append(h, el('p', null, 'Auto-plan fills every week up to your exams from your subjects and exam dates. Or pick a subject below and drag on the grid to add sessions yourself.'));
    const go = button('tt-btn tt-btn-primary tt-btn-big', null, openPlan);
    go.innerHTML = WAND;
    go.appendChild(document.createTextNode('Auto-plan my timetable'));
    box.append(text, go);
    return box;
  }

  /* ---------- Reset, with an undo until the timetable is closed ---------- */
  function resetAll() {
    if (!data.sessions.length && !data.exams.length) return;
    undoData = JSON.parse(JSON.stringify(data));
    data = { exams: [], sessions: [] };
    editing = null;
    sheet = false;
    save(true);
    render();
    status('Timetable reset: every session and exam date is gone. Undo puts them back until you close the timetable.');
    const u = root.querySelector('.tt-btn-undo');
    if (u) u.focus();
  }
  function undoReset() {
    if (!undoData) return;
    data = undoData;
    undoData = null;
    save();
    render();
    status('Timetable put back as it was.');
    const r = root.querySelector('.tt-btn-reset');
    if (r) r.focus();
  }

  function autoPlan() {
    const today = midnight(new Date());
    const exams = data.exams.map((e) => ({ s: e.s, date: examDate(e) })).filter((e) => e.date > today);
    if (!exams.length) { status('Tick a subject and set its exam month first.'); return; }
    const last = exams.reduce((m, e) => (e.date > m ? e.date : m), exams[0].date);
    const start = iso(today);
    data.sessions = data.sessions.filter((x) => !(x.auto && x.d >= start));
    const credit = {};
    exams.forEach((e) => { credit[e.s] = 0; });
    let made = 0;
    for (let d = today; d < last; d = addDays(d, 1)) {
      const key = iso(d);
      if (exams.some((e) => iso(e.date) === key)) continue;          // exam day
      const active = exams.filter((e) => d < e.date);
      if (!active.length) continue;
      const left = (e) => daysBetween(d, e.date);
      const nearest = Math.min.apply(null, active.map(left));
      const phase = nearest <= 28 ? 2 : nearest <= 56 ? 1 : 0;
      const wd = d.getDay();
      if (wd === 5 && phase < 2) continue;                           // Friday evening off
      const slots = PLAN[wd === 0 || wd === 6 ? 'weekend' : 'weekday'][phase];
      const eve = active.find((e) => left(e) === 1);                 // exam tomorrow
      slots.forEach((slot, i) => {
        const a = toMin(slot[0]);
        const b = toMin(slot[1]);
        if (key === start && a <= nowMin()) return;                  // already started today
        let s;
        if (eve) {
          if (i > 1) return;
          s = eve.s;
        } else {
          // Weighted rotation: each session goes to the subject with the most credit, and an
          // exam within 4 weeks earns twice the credit, within 10 days three times.
          let total = 0;
          let best = null;
          active.forEach((e) => {
            const w = left(e) <= 10 ? 3 : left(e) <= 28 ? 2 : 1;
            credit[e.s] += w;
            total += w;
            if (best === null || credit[e.s] > credit[best]) best = e.s;
          });
          credit[best] -= total;
          s = best;
        }
        if (clash(key, a, b)) return;
        data.sessions.push({ id: newId(), d: key, a: slot[0], b: slot[1], s: s, auto: true });
        made++;
      });
    }
    save();
    sheet = false;
    week = mondayOf(today);
    day = today;
    render();
    status('Planned ' + made + ' sessions from today until ' + fmt(addDays(last, -1), { day: 'numeric', month: 'long', year: 'numeric' }) + '. Tap any session to change it.');
  }

  /* ---------- Adding, repeating and clearing ---------- */
  // A new session on day key from minute a to b, for the brush subject, fitted around the
  // sessions already there. Returns it, or null when there is no room.
  function addSession(key, a, b) {
    const before = sessionsOn(key);
    const inside = before.find((x) => toMin(x.a) <= a && a < toMin(x.b));
    if (inside) { openEditor(inside.id); return null; }
    const next = before.find((x) => toMin(x.a) > a);
    if (next) b = Math.min(b, toMin(next.a));
    b = Math.min(b, LAST);
    if (b - a < STEP) return null;
    const s = { id: newId(), d: key, a: toTime(a), b: toTime(b), s: brush };
    data.sessions.push(s);
    save();
    render();
    status(LABEL[s.s] + ' added on ' + fmt(fromIso(key), { weekday: 'long', day: 'numeric', month: 'short' }) + ', ' + s.a + ' to ' + s.b + '.');
    return s;
  }

  // Copies of a session on the same weekday each week, until its subject's exam (or 8 weeks).
  function repeatWeekly(s) {
    const e = examOf(s.s);
    const until = e ? examDate(e) : addDays(fromIso(s.d), 7 * 9);
    s.g = s.g || newId();
    let made = 0;
    for (let d = addDays(fromIso(s.d), 7); d < until; d = addDays(d, 7)) {
      const key = iso(d);
      if (clash(key, toMin(s.a), toMin(s.b))) continue;
      data.sessions.push({ id: newId(), d: key, a: s.a, b: s.b, s: s.s, g: s.g });
      made++;
    }
    save();
    render();
    status(made ? 'Repeated on ' + made + ' more ' + fmt(fromIso(s.d), { weekday: 'long' }) + 's' + (e ? ', up to the exam.' : ' (no exam date set, so for 8 weeks).') : 'No free time on the following weeks to repeat it.');
  }

  function repeatWeek() {
    const keys = Array.from({ length: 7 }, (_, i) => iso(addDays(week, i)));
    const here = data.sessions.filter((x) => keys.indexOf(x.d) >= 0);
    if (!here.length) { status('This week has no sessions to repeat yet.'); return; }
    const lastExam = data.exams.length ? data.exams.map(examDate).reduce((m, d) => (d > m ? d : m)) : addDays(week, 7 * 9);
    let made = 0;
    let weeks = 0;
    for (let w = 1; addDays(week, 7 * w) < lastExam; w++) {
      weeks = w;
      here.forEach((s) => {
        const d = addDays(fromIso(s.d), 7 * w);
        const e = examOf(s.s);
        if (e && d >= examDate(e)) return;
        if (d >= lastExam) return;
        const key = iso(d);
        if (clash(key, toMin(s.a), toMin(s.b))) return;
        data.sessions.push({ id: newId(), d: key, a: s.a, b: s.b, s: s.s });
        made++;
      });
    }
    save();
    render();
    status(made ? 'Copied this week into the next ' + weeks + ' weeks (' + made + ' sessions), up to the exams.' : 'The following weeks are already full at those times.');
  }

  function clearWeek() {
    const keys = Array.from({ length: 7 }, (_, i) => iso(addDays(week, i)));
    const n = data.sessions.filter((x) => keys.indexOf(x.d) >= 0).length;
    if (!n) { status('This week is already empty.'); return; }
    if (!window.confirm('Delete the ' + n + ' sessions in this week?')) return;
    data.sessions = data.sessions.filter((x) => keys.indexOf(x.d) < 0);
    editing = null;
    save();
    render();
    status('Cleared this week.');
  }

  // Keyboard-friendly way in: a one-hour session in the first free hour of the day shown.
  function quickAdd() {
    const today = midnight(new Date());
    const inWeek = today >= week && today < addDays(week, 7);
    const key = iso(narrow.matches ? day : inWeek ? today : week);
    const starts = [17 * 60, 18 * 60, 19 * 60, 20 * 60, 10 * 60, 11 * 60, 14 * 60, 15 * 60, 16 * 60, 9 * 60, 8 * 60];
    const a = starts.find((m) => !clash(key, m, m + 60));
    if (a == null) { status('That day is full.'); return; }
    const s = addSession(key, a, a + 60);
    if (s) openEditor(s.id);
  }

  /* ---------- Editing one session ---------- */
  function openEditor(id) {
    editing = id;
    render();
    const first = root.querySelector('.tt-editor select');
    if (first) first.focus();
  }

  function editor() {
    const s = data.sessions.find((x) => x.id === editing);
    if (!s) return null;
    const box = el('div', 'tt-editor');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Change this session');
    box.dataset.subject = s.s;
    const head = el('p', 'tt-editor-head');
    head.appendChild(el('strong', null, fmt(fromIso(s.d), { weekday: 'long', day: 'numeric', month: 'long' })));
    box.appendChild(head);
    const fix = (patch) => {
      const next = Object.assign({}, s, patch);
      let a = toMin(next.a);
      let b = toMin(next.b);
      if (b <= a) b = Math.min(a + 60, LAST);
      if (clash(s.d, a, b, s.id)) { status('That time overlaps another session.'); render(); return; }
      next.a = toTime(a);
      next.b = toTime(b);
      Object.assign(s, next, { auto: false });
      save();
      render();
    };
    const row = el('div', 'tt-editor-row');
    const lab = (text, ctl) => { const l = el('label', 'tt-field'); l.append(el('span', null, text), ctl); return l; };
    row.append(
      lab('Subject', select(ORDER.map((x) => [x, LABEL[x]]), s.s, (v) => fix({ s: v }))),
      lab('From', select(times(FIRST, LAST - STEP), s.a, (v) => fix({ a: v }))),
      lab('To', select(times(FIRST + STEP, LAST), s.b, (v) => fix({ b: v })))
    );
    box.appendChild(row);
    const acts = el('div', 'tt-editor-acts');
    acts.appendChild(button('tt-btn', 'Repeat weekly until the exam', () => repeatWeekly(s)));
    acts.appendChild(button('tt-btn tt-btn-danger', 'Delete', () => {
      data.sessions = data.sessions.filter((x) => x.id !== s.id);
      editing = null;
      save();
      render();
      status('Session deleted.');
    }));
    const group = s.g ? data.sessions.filter((x) => x.g === s.g) : [];
    if (group.length > 1) {
      acts.appendChild(button('tt-btn tt-btn-danger', 'Delete all ' + group.length + ' repeats', () => {
        data.sessions = data.sessions.filter((x) => x.g !== s.g);
        editing = null;
        save();
        render();
        status('Deleted the session and its repeats.');
      }));
    }
    acts.appendChild(button('tt-btn tt-btn-primary', 'Done', () => { editing = null; render(); }));
    box.appendChild(acts);
    return box;
  }

  /* ---------- The week grid ---------- */
  function grid() {
    const days = narrow.matches ? [day] : Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const today = iso(midnight(new Date()));
    const wrap = el('div', 'tt-grid');
    wrap.style.setProperty('--tt-days', String(days.length));
    const rows = (LAST - FIRST) / STEP;
    wrap.style.setProperty('--tt-rows', String(rows));

    // Day headings, with exams marked.
    wrap.appendChild(el('div', 'tt-corner'));
    days.forEach((d) => {
      const key = iso(d);
      const h = el('div', 'tt-dayhead' + (key === today ? ' is-today' : ''));
      h.appendChild(el('span', 'tt-dayname', fmt(d, { weekday: 'short' })));
      h.appendChild(el('span', 'tt-daynum', fmt(d, { day: 'numeric', month: 'short' })));
      data.exams.filter((e) => iso(examDate(e)) === key).forEach((e) => {
        const b = el('span', 'tt-examtag', LABEL[e.s] + (e.day ? ' exam' : ' exam month'));
        b.dataset.subject = e.s;
        h.appendChild(b);
      });
      wrap.appendChild(h);
    });

    // Hours down the side.
    const hours = el('div', 'tt-hours');
    for (let m = FIRST; m < LAST; m += 60) hours.appendChild(el('span', null, toTime(m)));
    wrap.appendChild(hours);

    days.forEach((d) => {
      const key = iso(d);
      const col = el('div', 'tt-col' + (key === today ? ' is-today' : '') + (key < today ? ' is-past' : ''));
      col.dataset.day = key;
      col.setAttribute('aria-label', fmt(d, { weekday: 'long', day: 'numeric', month: 'long' }));
      sessionsOn(key).forEach((s) => {
        const b = button('tt-sess' + (s.id === editing ? ' is-editing' : ''));
        b.dataset.subject = s.s;
        b.dataset.id = s.id;
        b.style.top = 'calc(var(--tt-row) * ' + (toMin(s.a) - FIRST) / STEP + ')';
        b.style.height = 'calc(var(--tt-row) * ' + (toMin(s.b) - toMin(s.a)) / STEP + ' - 2px)';
        b.appendChild(el('span', 'tt-sess-subject', LABEL[s.s]));
        b.appendChild(el('span', 'tt-sess-time', s.a + '–' + s.b));
        b.setAttribute('aria-label', LABEL[s.s] + ', ' + s.a + ' to ' + s.b + '. Change');
        col.appendChild(b);
      });
      if (key === today) {
        const m = nowMin();
        if (m >= FIRST && m < LAST) {
          const line = el('div', 'tt-now');
          line.style.top = 'calc(var(--tt-row) * ' + (m - FIRST) / STEP + ')';
          col.appendChild(line);
        }
      }
      wireColumn(col);
      wrap.appendChild(col);
    });
    return wrap;
  }

  // Drag down a day with the mouse or a pen to paint a session; on a touch screen, tap a slot
  // for a one-hour session (dragging there scrolls the page as usual).
  function wireColumn(col) {
    const rowH = () => col.getBoundingClientRect().height / ((LAST - FIRST) / STEP);
    const slotAt = (y) => {
      const r = col.getBoundingClientRect();
      const i = Math.max(0, Math.min((LAST - FIRST) / STEP - 1, Math.floor((y - r.top) / rowH())));
      return FIRST + i * STEP;
    };
    let drag = null;
    col.addEventListener('pointerdown', (e) => {
      if (e.button > 0 || e.target.closest('.tt-sess') || e.pointerType === 'touch') return;
      e.preventDefault();
      const a = slotAt(e.clientY);
      const ghost = el('div', 'tt-ghost');
      ghost.dataset.subject = brush;
      col.appendChild(ghost);
      drag = { a: a, b: a + STEP, ghost: ghost };
      const paint = () => {
        const lo = Math.min(drag.a, drag.b - STEP);
        const hi = Math.max(drag.a + STEP, drag.b);
        ghost.style.top = 'calc(var(--tt-row) * ' + (lo - FIRST) / STEP + ')';
        ghost.style.height = 'calc(var(--tt-row) * ' + (hi - lo) / STEP + ')';
        ghost.textContent = toTime(lo) + '–' + toTime(hi);
      };
      paint();
      col.setPointerCapture(e.pointerId);
      const move = (ev) => { drag.b = slotAt(ev.clientY) + STEP; paint(); };
      const up = () => {
        col.removeEventListener('pointermove', move);
        col.removeEventListener('pointerup', up);
        col.removeEventListener('pointercancel', up);
        ghost.remove();
        let lo = Math.min(drag.a, drag.b - STEP);
        let hi = Math.max(drag.a + STEP, drag.b);
        if (hi - lo === STEP) hi = Math.min(lo + 60, LAST);   // a click: one hour
        drag = null;
        addSession(col.dataset.day, lo, hi);
      };
      col.addEventListener('pointermove', move);
      col.addEventListener('pointerup', up);
      col.addEventListener('pointercancel', up);
    });
    let touch = null;
    col.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touch = { x: e.clientX, y: e.clientY }; });
    col.addEventListener('click', (e) => {
      const sess = e.target.closest('.tt-sess');
      if (sess) { openEditor(sess.dataset.id); return; }
      if (!touch) return;
      const moved = Math.abs(e.clientX - touch.x) + Math.abs(e.clientY - touch.y);
      touch = null;
      if (moved > 10) return;
      const a = slotAt(e.clientY);
      addSession(col.dataset.day, a, Math.min(a + 60, LAST));
    });
  }

  /* ---------- Toolbar ---------- */
  function toolbar() {
    const bar = el('div', 'tt-tools');

    const brushes = el('div', 'tt-brushes');
    brushes.setAttribute('role', 'radiogroup');
    brushes.setAttribute('aria-label', 'Subject for new sessions');
    takes().forEach((s) => {
      const b = button('tt-brush' + (s === brush ? ' is-on' : ''), LABEL[s], () => { brush = s; render(); });
      b.dataset.subject = s;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(s === brush));
      brushes.appendChild(b);
    });
    bar.appendChild(brushes);

    const nav = el('div', 'tt-weeknav');
    const step = narrow.matches ? 1 : 7;
    nav.appendChild(button('tt-btn tt-icon', '‹', () => { move(-step); }));
    nav.lastChild.setAttribute('aria-label', narrow.matches ? 'Previous day' : 'Previous week');
    const label = narrow.matches
      ? fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })
      : fmt(week, { day: 'numeric', month: 'short' }) + ' – ' + fmt(addDays(week, 6), { day: 'numeric', month: 'short', year: 'numeric' });
    nav.appendChild(el('span', 'tt-weeklabel', label));
    nav.appendChild(button('tt-btn tt-icon', '›', () => { move(step); }));
    nav.lastChild.setAttribute('aria-label', narrow.matches ? 'Next day' : 'Next week');
    nav.appendChild(button('tt-btn', 'Today', () => { week = mondayOf(new Date()); day = midnight(new Date()); render(); }));
    bar.appendChild(nav);

    const acts = el('div', 'tt-weekacts');
    acts.appendChild(button('tt-btn', '+ Add session', quickAdd));
    acts.appendChild(button('tt-btn', 'Repeat this week', repeatWeek));
    acts.appendChild(button('tt-btn', 'Clear this week', clearWeek));
    bar.appendChild(acts);
    return bar;
  }

  function move(n) {
    if (narrow.matches) { day = addDays(day, n); week = mondayOf(day); }
    else { week = addDays(week, n); day = week; }
    editing = null;
    render();
  }

  // On a narrow screen, the days of the week as tabs over the one-day grid.
  function dayTabs() {
    const tabs = el('div', 'tt-daytabs');
    tabs.setAttribute('role', 'tablist');
    const today = iso(midnight(new Date()));
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i);
      const key = iso(d);
      const n = data.sessions.filter((x) => x.d === key).length;
      const t = button('tt-daytab' + (key === iso(day) ? ' is-on' : '') + (key === today ? ' is-today' : ''), null, () => { day = d; render(); });
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', String(key === iso(day)));
      t.appendChild(el('span', null, fmt(d, { weekday: 'narrow' })));
      t.appendChild(el('strong', null, String(d.getDate())));
      if (n) t.appendChild(el('i', 'tt-daytab-dot'));
      tabs.appendChild(t);
    }
    return tabs;
  }

  /* ---------- Drawing ---------- */
  function refreshHead() {
    const old = root && root.querySelector('.tt-count');
    if (old) old.replaceWith(countdown());
  }

  function render() {
    if (!root) return;
    if (!brush || takes().indexOf(brush) < 0) brush = takes()[0];
    const keepScroll = root.querySelector('.tt-gridwrap') ? root.querySelector('.tt-gridwrap').scrollTop : null;
    const msg = root.querySelector('.tt-status') ? root.querySelector('.tt-status').textContent : '';
    // The exams sheet is kept as it is while one of its fields is in use, so changing a
    // month does not throw the focus out of it.
    const oldSheet = root.querySelector('.tt-sheet');
    const focused = document.activeElement;
    const keepSheet = sheet && oldSheet && oldSheet.contains(focused) ? oldSheet : null;
    root.textContent = '';

    const head = el('header', 'tt-head');
    const titles = el('div', 'tt-titles');
    const h = el('h2', null, 'Study timetable');
    h.id = 'tt-title';
    h.tabIndex = -1;
    titles.append(h, countdown());
    const planBtn = button('tt-btn tt-btn-auto' + (sheet ? ' is-on' : ''), null, () => { if (sheet) { sheet = false; render(); } else openPlan(); });
    planBtn.innerHTML = WAND;
    planBtn.appendChild(document.createTextNode(sheet ? 'Hide auto-plan' : 'Auto-plan'));
    planBtn.setAttribute('aria-expanded', String(sheet));
    planBtn.title = 'Make a timetable from your subjects and exam dates';
    // Reset clears everything; Undo takes its place until the timetable is closed.
    const reset = undoData
      ? button('tt-btn tt-btn-undo', 'Undo reset', undoReset)
      : button('tt-btn tt-btn-danger tt-btn-reset', 'Reset timetable', resetAll);
    if (!undoData && !data.sessions.length && !data.exams.length) reset.disabled = true;
    const close = button('tt-btn', 'Close', () => window.IALQB_TT_CLOSE && window.IALQB_TT_CLOSE());
    const hacts = el('div', 'tt-head-acts');
    hacts.append(planBtn, reset, close);
    head.append(titles, hacts);
    root.appendChild(head);

    if (sheet) {
      root.appendChild(keepSheet || examSheet());
      if (keepSheet) focused.focus({ preventScroll: true });
    } else if (!data.sessions.length) {
      root.appendChild(startCard());
    }

    root.appendChild(toolbar());
    const hint = el('p', 'tt-hint', narrow.matches
      ? 'Pick a subject, then tap a time to add an hour of it. Tap a session to change its times, repeat it each week or delete it.'
      : 'Pick a subject, then drag down a day to add a session (a click adds an hour). Click a session to change its times, repeat it each week or delete it.');
    root.appendChild(hint);
    const st = el('p', 'tt-status');
    st.setAttribute('role', 'status');
    st.textContent = msg;
    root.appendChild(st);

    if (narrow.matches) root.appendChild(dayTabs());
    const gw = el('div', 'tt-gridwrap');
    gw.appendChild(grid());
    root.appendChild(gw);
    const ed = editor();
    if (ed) root.appendChild(ed);

    // Start the grid at the afternoon, where most sessions are, the first time.
    if (keepScroll != null) gw.scrollTop = keepScroll;
    else gw.scrollTop = Math.max(0, gw.scrollHeight * ((15 * 60 - FIRST) / (LAST - FIRST)) - 40);
  }

  let timer = 0;
  window.IALQB_TT = {
    show(body) {
      data = load();
      if (!root) {
        root = el('div', 'tt-wrap');
        body.textContent = '';
        body.appendChild(root);
        const re = () => render();
        if (narrow.addEventListener) narrow.addEventListener('change', re);
      }
      render();
      const h = root.querySelector('#tt-title');
      if (h) h.focus({ preventScroll: true });
      clearInterval(timer);
      // Keep the red line at the time now.
      timer = setInterval(() => {
        const n = root.querySelector('.tt-now');
        if (n) n.style.top = 'calc(var(--tt-row) * ' + (nowMin() - FIRST) / STEP + ')';
      }, 60000);
    },
    hide() {
      clearInterval(timer);
      editing = null;
      undoData = null;   // closing the timetable keeps the reset
    },
    // Escape closes the session editor or the exams sheet first; true when it did.
    escape() {
      if (editing) { editing = null; render(); return true; }
      if (sheet) { sheet = false; render(); return true; }
      return false;
    }
  };
})();
