/* Chemistry Topic 1, Formulae, equations and amounts of substance: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const fmt = Sim.fmt;
  const L = 6.02e23;     // Avogadro constant / mol⁻¹
  const VM = 24.0;       // molar gas volume at r.t.p. / dm³ mol⁻¹

  const mix = (a, b, t) => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * clamp(t, 0, 1));
  const rgb = (a, al) => (al == null ? 'rgb(' : 'rgba(') + a.map((v) => Math.round(v)).join(',') + (al == null ? ')' : ',' + al + ')');

  /* Point on the edge of a box (centre cx,cy, half-sizes hw,hh) in direction (dx,dy). */
  function boxEdge(cx, cy, hw, hh, dx, dy) {
    const t = Math.min(dx ? hw / Math.abs(dx) : 1e9, dy ? hh / Math.abs(dy) : 1e9);
    return [cx + dx * t, cy + dy * t];
  }

  /* ======================================================================
     1. The mole hub: mass, particles, gas volume and solution all go
        through the amount in moles.
     ====================================================================== */
  const SUBS = {
    h2o: { f: 'H₂O', name: 'water', M: 18.0, part: 'molecules', gas: 'a liquid at r.t.p.', sol: 'water is the solvent itself' },
    co2: { f: 'CO₂', name: 'carbon dioxide', M: 44.0, part: 'molecules', gas: true, sol: 'only slightly soluble in water' },
    o2: { f: 'O₂', name: 'oxygen', M: 32.0, part: 'molecules', gas: true, sol: 'barely soluble in water' },
    ch4: { f: 'CH₄', name: 'methane', M: 16.0, part: 'molecules', gas: true, sol: 'barely soluble in water' },
    nh3: { f: 'NH₃', name: 'ammonia', M: 17.0, part: 'molecules', gas: true, sol: true },
    hcl: { f: 'HCl', name: 'hydrogen chloride', M: 36.5, part: 'molecules', gas: true, sol: true },
    nacl: { f: 'NaCl', name: 'sodium chloride', M: 58.5, part: 'formula units', gas: 'a solid at r.t.p.', sol: true },
    naoh: { f: 'NaOH', name: 'sodium hydroxide', M: 40.0, part: 'formula units', gas: 'a solid at r.t.p.', sol: true },
    cuso4: { f: 'CuSO₄·5H₂O', name: 'hydrated copper(II) sulfate', M: 249.6, part: 'formula units', gas: 'a solid at r.t.p.', sol: true },
    gluc: { f: 'C₆H₁₂O₆', name: 'glucose', M: 180.0, part: 'molecules', gas: 'a solid at r.t.p.', sol: true },
    caco3: { f: 'CaCO₃', name: 'calcium carbonate', M: 100.1, part: 'formula units', gas: 'a solid at r.t.p.', sol: 'insoluble in water' },
    mg: { f: 'Mg', name: 'magnesium', M: 24.3, part: 'atoms', gas: 'a solid at r.t.p.', sol: 'a metal that does not dissolve' }
  };
  const FROM = {
    m: { label: 'Mass you weighed, m', min: 0.1, max: 200, step: 0.1, value: 10, show: (v) => v.toFixed(1) + ' g' },
    n: { label: 'Amount, n', min: 0.01, max: 5, step: 0.01, value: 0.5, show: (v) => v.toFixed(2) + ' mol' },
    N: { label: 'Number of particles, N', min: 0.1, max: 30, step: 0.1, value: 3.0, show: (v) => v.toFixed(1) + ' × 10²³' },
    g: { label: 'Gas volume at r.t.p., V', min: 0.1, max: 120, step: 0.1, value: 12, show: (v) => v.toFixed(1) + ' dm³' },
    c: { label: 'Concentration of the solution, c', min: 0.01, max: 2, step: 0.01, value: 0.1, show: (v) => v.toFixed(2) + ' mol dm⁻³' }
  };
  let moleFrom = 'm';

  function moleState(p) {
    const S = SUBS[p.sub];
    let n = NaN, bad = null;
    if (p.from === 'm') n = p.val / S.M;
    else if (p.from === 'n') n = p.val;
    else if (p.from === 'N') n = (p.val * 1e23) / L;
    else if (p.from === 'g') { if (S.gas === true) n = p.val / VM; else bad = 'g'; }
    else if (p.from === 'c') { if (S.sol === true) n = (p.val * p.V) / 1000; else bad = 'c'; }
    return { S, n, bad, m: n * S.M, N: n * L, Vg: n * VM, c: n / (p.V / 1000) };
  }

  Sim.create('#sim-chem-01-moles', {
    title: 'The mole hub: every route goes through moles',
    alt: 'A central circle showing the amount in moles, linked by labelled arrows to boxes for mass, number of particles, gas volume at room temperature and pressure, and concentration of a solution',
    height: (w) => (w >= 560 ? 380 : 450),
    controls: [
      { key: 'sub', type: 'select', label: 'Substance', value: 'h2o', options: Object.keys(SUBS).map((k) => [k, SUBS[k].f + ', ' + SUBS[k].name]) },
      {
        key: 'from', type: 'select', label: 'What you know', value: 'm',
        options: [['m', 'its mass'], ['n', 'the amount in moles'], ['N', 'the number of particles'], ['g', 'its gas volume at r.t.p.'], ['c', 'the concentration of its solution']],
        onChange(s, v) {
          moleFrom = v;
          const F = FROM[v];
          const el = s.controls.val.el;
          el.min = F.min; el.max = F.max; el.step = F.step;
          s.setLabel('val', F.label);
          s.set('val', F.value);
        }
      },
      { key: 'val', label: FROM.m.label, min: FROM.m.min, max: FROM.m.max, step: FROM.m.step, value: FROM.m.value, format: (v) => FROM[moleFrom].show(v) },
      { key: 'V', label: 'Volume of solution', min: 50, max: 1000, step: 50, value: 250, unit: 'cm³', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = moleState(p);
      const S = st.S;
      const narrow = w < 560;
      const bw = narrow ? Math.min(w * 0.47, 210) : clamp(w * 0.32, 180, 250);
      const bh = 92, pad = 8;
      const hx = w / 2, hy = h / 2, hr = narrow ? 50 : 60;
      const ok = !isNaN(st.n);
      const boxes = [
        { k: 'm', x: pad, y: pad, title: 'Mass', val: fmt(st.m) + ' g', sub: 'M = ' + S.M.toFixed(1) + ' g mol⁻¹', inOp: '÷ M', outOp: '× M', on: true },
        { k: 'N', x: w - pad - bw, y: pad, title: 'Particles (' + S.part + ')', val: fmt(st.N), sub: 'L = 6.02 × 10²³ mol⁻¹', inOp: '÷ L', outOp: '× L', on: true },
        { k: 'g', x: pad, y: h - pad - bh, title: 'Gas volume at r.t.p.', val: fmt(st.Vg) + ' dm³', sub: 'molar volume 24.0 dm³ mol⁻¹', inOp: '÷ 24.0', outOp: '× 24.0', on: S.gas === true, why: S.gas },
        { k: 'c', x: w - pad - bw, y: h - pad - bh, title: 'Solution, ' + p.V.toFixed(0) + ' cm³', val: fmt(st.c) + ' mol dm⁻³', sub: 'c = n ÷ V, V = ' + (p.V / 1000).toFixed(3) + ' dm³', inOp: 'n = c × V', outOp: '÷ V', on: S.sol === true, why: S.sol }
      ];
      if (p.from === 'c') boxes[3].val = fmt(p.val) + ' mol dm⁻³';
      // arrows first, so the boxes sit on top of them
      boxes.forEach((b) => {
        const cx = b.x + bw / 2, cy = b.y + bh / 2;
        let dx = hx - cx, dy = hy - cy;
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;
        const a = boxEdge(cx, cy, bw / 2 + 4, bh / 2 + 4, dx, dy);
        const hb = [hx - dx * (hr + 6), hy - dy * (hr + 6)];
        const known = p.from === b.k;
        if (!b.on) {
          Sim.line(ctx, a[0], a[1], hb[0], hb[1], { color: '#ced4da', width: 2, dash: [5, 5] });
          return;
        }
        const col = known ? C.orange : ok ? C.blue : '#ced4da';
        if (known) Sim.arrow(ctx, a[0], a[1], hb[0], hb[1], { color: col, width: 3 });
        else if (ok) Sim.arrow(ctx, hb[0], hb[1], a[0], a[1], { color: col, width: 3 });
        else Sim.line(ctx, a[0], a[1], hb[0], hb[1], { color: col, width: 2, dash: [5, 5] });
        if (ok || known) {
          const mx = (a[0] + hb[0]) / 2, my = (a[1] + hb[1]) / 2;
          Sim.text(ctx, known ? b.inOp : b.outOp, mx, my, { size: narrow ? 12 : 13.5, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.95)' });
        }
      });
      // boxes
      boxes.forEach((b) => {
        const known = p.from === b.k;
        const fill = !b.on ? '#f1f3f5' : known ? '#fff4e6' : '#f8fbff';
        const stroke = !b.on ? '#ced4da' : known ? C.orange : C.blue;
        Sim.rect(ctx, b.x, b.y, bw, bh, { fill, stroke, width: known ? 2.5 : 1.5, r: 8 });
        const cx = b.x + bw / 2;
        Sim.text(ctx, b.title + (known ? '  (known)' : ''), cx, b.y + 16, { size: narrow ? 11.5 : 13, bold: true, color: !b.on ? C.grey : known ? '#d9480f' : C.navy, align: 'center' });
        if (!b.on) {
          Sim.text(ctx, 'does not apply:', cx, b.y + 44, { size: narrow ? 11.5 : 12.5, color: C.muted, align: 'center' });
          Sim.text(ctx, String(b.why), cx, b.y + 62, { size: narrow ? 11 : 12, color: C.muted, align: 'center', italic: true });
        } else {
          Sim.text(ctx, ok ? b.val : '—', cx, b.y + 47, { size: narrow ? 15 : 18, bold: true, color: C.ink, align: 'center' });
          Sim.text(ctx, b.sub, cx, b.y + 74, { size: narrow ? 10.5 : 11.5, color: C.muted, align: 'center' });
        }
      });
      // hub
      const hubKnown = p.from === 'n';
      Sim.circle(ctx, hx, hy, hr, { fill: hubKnown ? '#fff4e6' : '#e7f5ff', stroke: hubKnown ? C.orange : C.navy, width: 3 });
      Sim.text(ctx, 'amount', hx, hy - hr * 0.42, { size: 12, color: C.muted, align: 'center' });
      Sim.text(ctx, ok ? fmt(st.n) : '?', hx, hy + 2, { size: narrow ? 17 : 20, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'mol', hx, hy + hr * 0.45, { size: 12.5, color: C.muted, align: 'center' });
      Sim.text(ctx, S.f, hx, hy - hr - 12, { size: 14, bold: true, color: C.navy, align: 'center', bg: 'rgba(255,255,255,0.9)' });
      if (st.bad) {
        const msg = st.bad === 'g' ? S.name + ' is ' + S.gas + ', so 24.0 dm³ mol⁻¹ does not apply' : S.name + ': ' + S.sol + ', so it has no concentration';
        Sim.text(ctx, msg, hx, hy + hr + 16, { size: 12, color: C.red, bold: true, align: 'center', bg: 'rgba(255,255,255,0.95)' });
      }
    },
    readout(s) {
      const st = moleState(s.p);
      if (isNaN(st.n)) return [['Amount', 'pick another starting quantity', true]];
      const r = [['Amount n', fmt(st.n) + ' mol', true], ['Mass', fmt(st.m) + ' g'], [st.S.part, fmt(st.N)]];
      if (st.S.gas === true) r.push(['Gas volume at r.t.p.', fmt(st.Vg) + ' dm³']);
      if (st.S.sol === true) r.push(['Concentration in ' + s.p.V.toFixed(0) + ' cm³', fmt(s.p.from === 'c' ? s.p.val : st.c) + ' mol dm⁻³']);
      return r;
    }
  });

  /* ======================================================================
     2. Acid–alkali titration: NaOH(aq) 0.100 mol dm⁻³ in the burette,
        25.0 cm³ of an acid of unknown concentration in the flask.
     ====================================================================== */
  const CB = 0.100, VA = 25.0, DROP = 0.05, KW = 1e-14;
  const ACIDS = {
    hcl: { f: 'HCl', name: 'hydrochloric acid', H: 1, lo: 0.080, hi: 0.130, eq: 'HCl + NaOH → NaCl + H₂O' },
    h2so4: { f: 'H₂SO₄', name: 'sulfuric acid', H: 2, lo: 0.040, hi: 0.065, eq: 'H₂SO₄ + 2NaOH → Na₂SO₄ + 2H₂O' }
  };
  function newFlask(st) {
    st.r0 = Math.floor(Math.random() * 21) * DROP;   // initial burette reading, 0.00–1.00 cm³
    st.drops = 0;
  }
  function titInit(s) {
    const A = ACIDS[s.p.acid];
    const st = s.state;
    st.cA = +(A.lo + Math.random() * (A.hi - A.lo)).toFixed(4);
    st.titres = [];
    newFlask(st);
  }
  const added = (st) => st.drops * DROP;
  function titPH(st, acid) {
    const nH = (st.cA * VA / 1000) * ACIDS[acid].H;
    const nOH = (CB * added(st)) / 1000;
    const V = (VA + added(st)) / 1000;
    const d = (nH - nOH) / V;
    const r = Math.sqrt(d * d + 4 * KW);
    const hplus = d >= 0 ? (d + r) / 2 : KW / ((-d + r) / 2);
    return -Math.log10(hplus);
  }
  const RED = [214, 40, 40], ORANGE = [245, 130, 20], YELLOW = [250, 205, 45], CLEAR = [238, 245, 252], PINK = [214, 51, 132];
  function indicator(ind, pH) {
    if (ind === 'pp') {
      const f = clamp((pH - 8.2) / 3.8, 0, 1);
      const col = mix(CLEAR, PINK, Math.pow(f, 0.7));
      if (pH < 8.2) return { col, word: 'colourless', state: 'under' };
      if (pH < 10.6) return { col, word: 'pale pink', state: 'end' };
      return { col, word: 'deep pink', state: 'over' };
    }
    let col;
    if (pH <= 3.2) col = RED;
    else if (pH <= 4.0) col = mix(RED, ORANGE, (pH - 3.2) / 0.8);
    else if (pH <= 4.6) col = mix(ORANGE, YELLOW, (pH - 4.0) / 0.6);
    else col = YELLOW;
    if (pH < 3.6) return { col, word: pH < 3.2 ? 'red' : 'red-orange', state: 'under' };
    if (pH <= 4.6) return { col, word: 'orange', state: 'end' };
    return { col, word: 'yellow', state: 'over' };
  }
  function concordant(titres) {
    const acc = titres.slice(1).map((t) => t.v).sort((a, b) => a - b);
    let best = null;
    for (let i = 0; i < acc.length; i++) {
      for (let j = i + 1; j < acc.length; j++) {
        if (acc[j] - acc[i] > 0.10 + 1e-9) break;
        const n = j - i + 1, spread = acc[j] - acc[i];
        if (!best || n > best.n || (n === best.n && spread < best.spread)) best = { n, spread, vals: acc.slice(i, j + 1) };
      }
    }
    if (!best) return null;
    best.mean = best.vals.reduce((a, b) => a + b, 0) / best.n;
    return best;
  }
  function addDrops(s, k) {
    const st = s.state;
    const maxDrops = Math.round((50 - st.r0) / DROP);
    st.drops = Math.min(maxDrops, st.drops + k);
  }

  Sim.create('#sim-chem-01-titration', {
    title: 'Acid–alkali titration',
    alt: 'A burette of sodium hydroxide above a conical flask of acid with indicator; the flask colour changes as alkali is added, and a table records the titres',
    height: (w) => (w >= 620 ? 470 : 790),
    resetButton: false,
    controls: [
      { key: 'acid', type: 'select', label: 'Acid in the flask (25.0 cm³)', value: 'hcl', options: [['hcl', 'hydrochloric acid, HCl'], ['h2so4', 'sulfuric acid, H₂SO₄']], onChange: (s) => s.reset() },
      { key: 'ind', type: 'select', label: 'Indicator', value: 'pp', options: [['pp', 'phenolphthalein'], ['mo', 'methyl orange']] },
      { key: 'ph', type: 'check', label: 'Show a pH meter', value: false },
      { key: 'reveal', type: 'check', label: 'Reveal the true concentration', value: false },
      { type: 'button', label: '+ 5.00 cm³', onClick: (s) => addDrops(s, 100) },
      { type: 'button', label: '+ 1.00 cm³', onClick: (s) => addDrops(s, 20) },
      { type: 'button', label: '+ 1 drop', onClick: (s) => addDrops(s, 1) },
      {
        type: 'button', label: 'Record titre and refill', onClick(s) {
          const st = s.state;
          if (st.titres.length >= 6 || st.drops === 0) return;
          const ind = indicator(s.p.ind, titPH(st, s.p.acid));
          st.titres.push({ v: +added(st).toFixed(2), state: ind.state, r0: st.r0, r1: st.r0 + added(st) });
          newFlask(st);
        }
      },
      { type: 'button', label: 'New unknown acid', ghost: true, onClick: (s) => s.reset() }
    ],
    init(s) { titInit(s); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const A = ACIDS[p.acid];
      const pH = titPH(st, p.acid);
      const ind = indicator(p.ind, pH);
      const wide = w >= 620;
      const ax = wide ? Math.min(w * 0.22, 150) : w * 0.3;      // burette x
      const top = 26, bH = wide ? 230 : 220;
      const reading = st.r0 + added(st);
      /* burette */
      Sim.rect(ctx, ax - 9, top, 18, bH, { fill: '#fff', stroke: C.axis, width: 1.5, r: 3 });
      const level = top + (reading / 50) * bH;
      Sim.rect(ctx, ax - 7.5, level, 15, top + bH - level, { fill: 'rgba(165,216,255,0.55)' });
      Sim.line(ctx, ax - 7.5, level, ax + 7.5, level, { color: C.navy, width: 2 });
      for (let v = 0; v <= 50; v += 1) {
        const y = top + (v / 50) * bH;
        const major = v % 10 === 0, mid = v % 5 === 0;
        Sim.line(ctx, ax - 9, y, ax - 9 + (major ? 9 : mid ? 6 : 3.5), y, { color: C.axis, width: 1 });
        if (major) Sim.text(ctx, String(v), ax - 14, y, { size: 10.5, color: C.muted, align: 'right' });
      }
      Sim.text(ctx, 'NaOH(aq), 0.100 mol dm⁻³', ax, top - 13, { size: 12, bold: true, color: C.navy, align: 'center' });
      // reading label at the meniscus
      Sim.text(ctx, '◀ ' + reading.toFixed(2) + ' cm³', ax + 14, level, { size: 12.5, bold: true, color: C.navy, bg: 'rgba(255,255,255,0.9)' });
      // tap and jet
      const tapY = top + bH + 10;
      Sim.line(ctx, ax, top + bH, ax, tapY + 12, { color: C.axis, width: 4 });
      Sim.rect(ctx, ax - 12, tapY - 4, 24, 8, { fill: '#495057', r: 3 });
      /* conical flask */
      const fy = tapY + 26, fH = wide ? 120 : 110, neckW = 30, baseW = wide ? 130 : 120;
      const fx = ax;
      const flask = [[fx - neckW / 2, fy], [fx - neckW / 2, fy + 28], [fx - baseW / 2, fy + fH], [fx + baseW / 2, fy + fH], [fx + neckW / 2, fy + 28], [fx + neckW / 2, fy]];
      // liquid: 25 cm³ fills the bottom 30%, 75 cm³ fills about 62%
      const frac = 0.30 + 0.32 * clamp(added(st) / 50, 0, 1);
      const ly = fy + fH - frac * (fH - 28);
      const halfAt = (y) => (y <= fy + 28 ? neckW / 2 : neckW / 2 + ((y - fy - 28) / (fH - 28)) * (baseW - neckW) / 2);
      Sim.polyline(ctx, [[fx - halfAt(ly), ly], [fx - baseW / 2, fy + fH], [fx + baseW / 2, fy + fH], [fx + halfAt(ly), ly]], { color: 'rgba(0,0,0,0)', width: 0.1, fill: rgb(ind.col, 0.9), close: true });
      Sim.polyline(ctx, flask, { color: C.axis, width: 2 });
      Sim.line(ctx, fx - baseW / 2 - 14, fy + fH + 3, fx + baseW / 2 + 14, fy + fH + 3, { color: '#ced4da', width: 5 });
      Sim.text(ctx, '25.0 cm³ ' + A.f + '(aq) + ' + (p.ind === 'pp' ? 'phenolphthalein' : 'methyl orange'), fx, fy + fH + 18, { size: 11.5, color: C.muted, align: 'center' });
      if (p.ph) {
        Sim.rect(ctx, fx + baseW / 2 + 8, fy + fH - 28, 70, 26, { fill: '#212529', r: 5 });
        Sim.text(ctx, 'pH ' + pH.toFixed(2), fx + baseW / 2 + 43, fy + fH - 15, { size: 13, bold: true, color: '#8ce99a', align: 'center' });
      }

      /* panel: status and titre table */
      const px = wide ? Math.max(ax + baseW / 2 + 80, w * 0.45) : 14;
      const py = wide ? 18 : fy + fH + 40;
      const pw = w - px - 12;
      const stateCol = ind.state === 'under' ? C.muted : ind.state === 'end' ? C.green : C.red;
      const stateMsg = ind.state === 'under' ? 'keep adding' : ind.state === 'end' ? 'end point: record this titre' : 'overshot the end point';
      Sim.text(ctx, 'Colour: ' + ind.word + ', ' + stateMsg, px, py, { size: 13, bold: true, color: stateCol });
      Sim.text(ctx, 'Initial reading ' + st.r0.toFixed(2) + ' cm³ · added ' + added(st).toFixed(2) + ' cm³', px, py + 20, { size: 12, color: C.muted });
      const rows = Math.max(st.titres.length, 1);
      const ty = py + 44, rh = 21;
      const cw = [0, Math.min(70, pw * 0.2), Math.min(205, pw * 0.58)];
      Sim.rect(ctx, px, ty, pw, rh, { fill: C.navy, r: 4 });
      Sim.text(ctx, 'Run', px + 8, ty + rh / 2, { size: 12, bold: true, color: '#fff' });
      Sim.text(ctx, 'Titre / cm³', px + cw[1], ty + rh / 2, { size: 12, bold: true, color: '#fff' });
      Sim.text(ctx, 'Note', px + cw[2], ty + rh / 2, { size: 12, bold: true, color: '#fff' });
      const conc = concordant(st.titres);
      if (!st.titres.length) Sim.text(ctx, 'no titres yet: do a rough run first', px + 8, ty + rh * 1.5, { size: 12, color: C.muted, italic: true });
      st.titres.forEach((t, i) => {
        const y = ty + rh * (i + 1) + rh / 2;
        if (i % 2) Sim.rect(ctx, px, y - rh / 2, pw, rh, { fill: '#f1f5fb' });
        const isConc = !!conc && i > 0 && t.v >= conc.vals[0] - 1e-9 && t.v <= conc.vals[conc.vals.length - 1] + 1e-9;
        Sim.text(ctx, i === 0 ? 'rough' : String(i), px + 8, y, { size: 12.5, color: C.ink });
        Sim.text(ctx, t.v.toFixed(2), px + cw[1], y, { size: 12.5, bold: true, color: C.ink });
        let note = t.state === 'under' ? 'stopped before the end point' : t.state === 'over' ? 'overshot' : 'at the end point';
        if (isConc) note += ' · concordant';
        Sim.text(ctx, note, px + cw[2], y, { size: 11.5, color: isConc ? C.green : t.state === 'end' ? C.muted : C.red, bold: isConc });
      });
      let y = ty + rh * (rows + 1) + 18;
      if (conc) {
        const nB = (CB * conc.mean) / 1000, nA = nB / A.H, cA = nA / (VA / 1000);
        const lines = [
          'Mean concordant titre = ' + conc.mean.toFixed(2) + ' cm³',
          'n(NaOH) = 0.100 × ' + conc.mean.toFixed(2) + ' ÷ 1000 = ' + fmt(nB, 4) + ' mol',
          A.eq,
          'n(' + A.f + ') = ' + (A.H === 1 ? 'n(NaOH)' : 'n(NaOH) ÷ 2') + ' = ' + fmt(nA, 4) + ' mol',
          'c(' + A.f + ') = ' + fmt(nA, 4) + ' ÷ 0.0250 = ' + fmt(cA, 3) + ' mol dm⁻³'
        ];
        lines.forEach((t, i) => Sim.text(ctx, t, px, y + i * 19, { size: wide ? 12.5 : 11.5, color: i === 4 ? C.navy : i === 2 ? C.muted : C.ink, bold: i === 4 }));
        y += lines.length * 19 + 6;
      } else if (st.titres.length > 1) {
        Sim.text(ctx, 'No concordant pair yet: aim for two titres within 0.10 cm³.', px, y, { size: 12, color: C.muted, italic: true });
        y += 24;
      }
      if (p.reveal) Sim.text(ctx, 'True concentration: ' + st.cA.toFixed(4) + ' mol dm⁻³', px, y, { size: 12.5, bold: true, color: C.purple });
      if (st.titres.length >= 6) Sim.text(ctx, 'Table full: press "New unknown acid" to start again.', px, y + 20, { size: 12, color: C.red });
    },
    readout(s) {
      const st = s.state;
      const pH = titPH(st, s.p.acid);
      const r = [['Burette reading', (st.r0 + added(st)).toFixed(2) + ' cm³'], ['Volume added', added(st).toFixed(2) + ' cm³', true]];
      if (s.p.ph) r.push(['pH', pH.toFixed(2)]);
      const c = concordant(st.titres);
      if (c) r.push(['Mean titre', c.mean.toFixed(2) + ' cm³']);
      return r;
    }
  });

  /* ======================================================================
     3. Percentage yield and atom economy
     ====================================================================== */
  const RX = {
    lime: { name: 'Making lime', R: [['CaCO₃', 1, 100.1]], P: [['CaO', 1, 56.1, true], ['CO₂', 1, 44.0]], conv: 100 },
    iron: { name: 'Extracting iron', R: [['Fe₂O₃', 1, 159.6], ['CO', 3, 28.0]], P: [['Fe', 2, 55.8, true], ['CO₂', 3, 44.0]], conv: 100 },
    ferment: { name: 'Ethanol by fermentation', R: [['C₆H₁₂O₆', 1, 180.0]], P: [['C₂H₅OH', 2, 46.0, true], ['CO₂', 2, 44.0]], conv: 100 },
    hydrate: { name: 'Ethanol by hydration of ethene', R: [['C₂H₄', 1, 28.0], ['H₂O', 1, 18.0]], P: [['C₂H₅OH', 1, 46.0, true]], conv: 100 },
    steam: { name: 'Hydrogen from methane', R: [['CH₄', 1, 16.0], ['H₂O', 1, 18.0]], P: [['CO', 1, 28.0], ['H₂', 3, 2.0, true]], conv: 100 },
    haber: { name: 'Ammonia (reversible)', R: [['N₂', 1, 28.0], ['H₂', 3, 2.0]], P: [['NH₃', 2, 17.0, true]], conv: 15, rev: true }
  };
  const side = (list) => list.map((x) => (x[1] > 1 ? x[1] : '') + x[0]).join(' + ');
  function yieldState(p) {
    const R = RX[p.rx];
    const r0 = R.R[0];
    const want = R.P.find((x) => x[3]);
    const massIn = R.R.reduce((a, x) => a + x[1] * x[2], 0);
    const ae = (want[1] * want[2]) / massIn * 100;
    const n0 = p.m / r0[2];
    const theo = n0 * (want[1] / r0[1]) * want[2];
    const made = theo * p.conv / 100;
    const actual = made * (1 - p.loss / 100);
    return { R, r0, want, massIn, ae, theo, made, actual, yld: theo > 0 ? actual / theo * 100 : 0 };
  }

  Sim.create('#sim-chem-01-yield', {
    title: 'Percentage yield and atom economy',
    alt: 'Bars comparing the mass of reactants with the mass of products, with the wanted product shaded, and a second bar splitting the theoretical yield into product obtained, product lost and reactant not converted',
    height: (w) => (w >= 600 ? 370 : 430),
    controls: [
      {
        key: 'rx', type: 'select', label: 'Reaction', value: 'lime', options: Object.keys(RX).map((k) => [k, RX[k].name]),
        onChange: (s, v) => s.set('conv', RX[v].conv)
      },
      { key: 'm', label: 'Mass of the first reactant', min: 1, max: 100, step: 1, value: 50, unit: 'g', format: (v) => v.toFixed(0) },
      { key: 'conv', label: 'Reactant that reacts', min: 0, max: 100, step: 1, value: 100, unit: '%', format: (v) => v.toFixed(0) },
      { key: 'loss', label: 'Product lost in transfers and purification', min: 0, max: 50, step: 1, value: 10, unit: '%', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const Y = yieldState(p);
      const R = Y.R;
      const narrow = w < 600;
      const x0 = narrow ? 12 : 140, bw = w - x0 - 16;
      Sim.text(ctx, side(R.R) + (R.rev ? '  ⇌  ' : '  →  ') + side(R.P), w / 2, 20, { size: narrow ? 15 : 17, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'masses per mole of equation; any second reactant is in excess', w / 2, 40, { size: 11.5, color: C.muted, align: 'center', italic: true });
      /* mass in and mass out bars */
      const rowY = narrow ? [72, 132] : [66, 118];
      const barH = 30;
      const shades = ['#4dabf7', '#228be6', '#1971c2'];
      [['Reactants', R.R], ['Products', R.P]].forEach(([lab, list], k) => {
        const y = rowY[k];
        if (narrow) Sim.text(ctx, lab + ' (mass in ' + (k ? 'products' : 'reactants') + ')', x0, y - 10, { size: 12, bold: true, color: C.ink });
        else Sim.text(ctx, lab, x0 - 12, y + barH / 2, { size: 13, bold: true, color: C.ink, align: 'right' });
        let x = x0;
        list.forEach((it, i) => {
          const m = it[1] * it[2];
          const seg = (m / Y.massIn) * bw;
          const fill = k === 0 ? shades[i % 3] : it[3] ? C.green : '#adb5bd';
          Sim.rect(ctx, x, y, seg, barH, { fill, stroke: '#fff', width: 1.5 });
          const label = (it[1] > 1 ? it[1] : '') + it[0] + ' ' + m.toFixed(1) + ' g';
          if (Sim.measure(ctx, label, { size: 12, bold: true }) < seg - 6) Sim.text(ctx, label, x + seg / 2, y + barH / 2, { size: 12, bold: true, color: '#fff', align: 'center' });
          else if (Sim.measure(ctx, it[0], { size: 11 }) < seg - 4) Sim.text(ctx, it[0], x + seg / 2, y + barH / 2, { size: 11, bold: true, color: '#fff', align: 'center' });
          x += seg;
        });
      });
      const aeY = rowY[1] + barH + 16;
      Sim.text(ctx, 'Total mass in = total mass out = ' + Y.massIn.toFixed(1) + ' g.  Atom economy = ' + (Y.want[1] > 1 ? Y.want[1] + ' × ' : '') + Y.want[2].toFixed(1) + ' ÷ ' + Y.massIn.toFixed(1) + ' × 100 = ' + Y.ae.toFixed(1) + '%', narrow ? x0 : x0, aeY, { size: narrow ? 11 : 12.5, bold: true, color: C.green });
      /* yield bar */
      const yy = aeY + (narrow ? 52 : 50);
      Sim.text(ctx, 'Theoretical yield of ' + Y.want[0] + ' from ' + p.m.toFixed(0) + ' g of ' + Y.r0[0] + ' = ' + fmt(Y.theo) + ' g', narrow ? x0 : x0, yy - 20, { size: narrow ? 12 : 13, bold: true, color: C.ink });
      if (!narrow) Sim.text(ctx, 'Yield', x0 - 12, yy + barH / 2, { size: 13, bold: true, color: C.ink, align: 'right' });
      const fGot = Y.actual / Y.theo, fLost = (Y.made - Y.actual) / Y.theo, fNot = 1 - Y.made / Y.theo;
      let x = x0;
      [[fGot, C.green, 'obtained ' + fmt(Y.actual) + ' g'], [fLost, '#ff8787', 'lost ' + fmt(Y.made - Y.actual) + ' g'], [fNot, '#dee2e6', 'not converted']].forEach(([f, col, lab]) => {
        const seg = f * bw;
        if (seg > 0.5) {
          Sim.rect(ctx, x, yy, seg, barH, { fill: col, stroke: '#fff', width: 1.5 });
          if (Sim.measure(ctx, lab, { size: 11.5, bold: true }) < seg - 6) Sim.text(ctx, lab, x + seg / 2, yy + barH / 2, { size: 11.5, bold: true, color: col === '#dee2e6' ? C.muted : '#fff', align: 'center' });
        }
        x += seg;
      });
      Sim.rect(ctx, x0, yy, bw, barH, { stroke: C.axis, width: 1.5 });
      Sim.text(ctx, '% yield = ' + fmt(Y.actual) + ' ÷ ' + fmt(Y.theo) + ' × 100 = ' + Y.yld.toFixed(1) + '%', x0, yy + barH + 20, { size: narrow ? 12.5 : 14, bold: true, color: C.navy });
      if (R.rev) Sim.text(ctx, 'Reversible: only part of the reactant is converted on each pass, even though the atom economy is 100%.', x0, yy + barH + 42, { size: 11.5, color: C.purple, italic: true });
    },
    readout(s) {
      const Y = yieldState(s.p);
      return [['Theoretical yield', fmt(Y.theo) + ' g'], ['Actual yield', fmt(Y.actual) + ' g'], ['% yield', Y.yld.toFixed(1) + '%', true], ['Atom economy', Y.ae.toFixed(1) + '%', true]];
    }
  });
})();
