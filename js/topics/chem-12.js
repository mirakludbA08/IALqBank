/* Chemistry 12: Entropy and energetics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const R = 8.31;
  const minus = (str) => String(str).replace(/-/g, '−');
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v);
  function niceStep(range, target) {
    const raw = range / (target || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  /* ======================================================================
     1. Born–Haber cycle, step by step, drawn to scale
     ====================================================================== */
  const BH = {
    NaCl: { start: 'Na(s) + ½Cl₂(g)', fH: -411, n: 1, steps: [
      ['ΔatH(Na)', 107, 'Na(g) + ½Cl₂(g)', 'Atomise sodium: Na(s) → Na(g)'],
      ['1st IE(Na)', 496, 'Na⁺(g) + e⁻ + ½Cl₂(g)', 'Ionise sodium: Na(g) → Na⁺(g) + e⁻'],
      ['ΔatH(Cl)', 122, 'Na⁺(g) + e⁻ + Cl(g)', 'Atomise chlorine: ½Cl₂(g) → Cl(g)'],
      ['1st EA(Cl)', -349, 'Na⁺(g) + Cl⁻(g)', 'Chlorine gains the electron: Cl(g) + e⁻ → Cl⁻(g)', 'EA'],
      ['LE(NaCl)', -787, 'NaCl(s)', 'The gaseous ions form the lattice: Na⁺(g) + Cl⁻(g) → NaCl(s)', 'LE']] },
    KCl: { start: 'K(s) + ½Cl₂(g)', fH: -437, n: 1, steps: [
      ['ΔatH(K)', 89, 'K(g) + ½Cl₂(g)', 'Atomise potassium: K(s) → K(g)'],
      ['1st IE(K)', 419, 'K⁺(g) + e⁻ + ½Cl₂(g)', 'Ionise potassium: K(g) → K⁺(g) + e⁻'],
      ['ΔatH(Cl)', 122, 'K⁺(g) + e⁻ + Cl(g)', 'Atomise chlorine: ½Cl₂(g) → Cl(g)'],
      ['1st EA(Cl)', -349, 'K⁺(g) + Cl⁻(g)', 'Chlorine gains the electron: Cl(g) + e⁻ → Cl⁻(g)', 'EA'],
      ['LE(KCl)', -718, 'KCl(s)', 'The gaseous ions form the lattice: K⁺(g) + Cl⁻(g) → KCl(s)', 'LE']] },
    MgCl2: { start: 'Mg(s) + Cl₂(g)', fH: -641, n: 2, steps: [
      ['ΔatH(Mg)', 148, 'Mg(g) + Cl₂(g)', 'Atomise magnesium: Mg(s) → Mg(g)'],
      ['1st IE(Mg)', 738, 'Mg⁺(g) + e⁻ + Cl₂(g)', 'First ionisation: Mg(g) → Mg⁺(g) + e⁻'],
      ['2nd IE(Mg)', 1451, 'Mg²⁺(g) + 2e⁻ + Cl₂(g)', 'Second ionisation: Mg⁺(g) → Mg²⁺(g) + e⁻'],
      ['2 × ΔatH(Cl)', 244, 'Mg²⁺(g) + 2e⁻ + 2Cl(g)', 'Atomise chlorine: Cl₂(g) → 2Cl(g), twice the atomisation enthalpy'],
      ['2 × 1st EA(Cl)', -698, 'Mg²⁺(g) + 2Cl⁻(g)', 'Two chlorine atoms each gain an electron: 2Cl(g) + 2e⁻ → 2Cl⁻(g)', 'EA'],
      ['LE(MgCl₂)', -2524, 'MgCl₂(s)', 'The gaseous ions form the lattice: Mg²⁺(g) + 2Cl⁻(g) → MgCl₂(s)', 'LE']] },
    CaCl2: { start: 'Ca(s) + Cl₂(g)', fH: -796, n: 2, steps: [
      ['ΔatH(Ca)', 178, 'Ca(g) + Cl₂(g)', 'Atomise calcium: Ca(s) → Ca(g)'],
      ['1st IE(Ca)', 590, 'Ca⁺(g) + e⁻ + Cl₂(g)', 'First ionisation: Ca(g) → Ca⁺(g) + e⁻'],
      ['2nd IE(Ca)', 1145, 'Ca²⁺(g) + 2e⁻ + Cl₂(g)', 'Second ionisation: Ca⁺(g) → Ca²⁺(g) + e⁻'],
      ['2 × ΔatH(Cl)', 244, 'Ca²⁺(g) + 2e⁻ + 2Cl(g)', 'Atomise chlorine: Cl₂(g) → 2Cl(g), twice the atomisation enthalpy'],
      ['2 × 1st EA(Cl)', -698, 'Ca²⁺(g) + 2Cl⁻(g)', 'Two chlorine atoms each gain an electron: 2Cl(g) + 2e⁻ → 2Cl⁻(g)', 'EA'],
      ['LE(CaCl₂)', -2255, 'CaCl₂(s)', 'The gaseous ions form the lattice: Ca²⁺(g) + 2Cl⁻(g) → CaCl₂(s)', 'LE']] },
    MgO: { start: 'Mg(s) + ½O₂(g)', fH: -602, n: 1, steps: [
      ['ΔatH(Mg)', 148, 'Mg(g) + ½O₂(g)', 'Atomise magnesium: Mg(s) → Mg(g)'],
      ['1st IE(Mg)', 738, 'Mg⁺(g) + e⁻ + ½O₂(g)', 'First ionisation: Mg(g) → Mg⁺(g) + e⁻'],
      ['2nd IE(Mg)', 1451, 'Mg²⁺(g) + 2e⁻ + ½O₂(g)', 'Second ionisation: Mg⁺(g) → Mg²⁺(g) + e⁻'],
      ['ΔatH(O)', 249, 'Mg²⁺(g) + 2e⁻ + O(g)', 'Atomise oxygen: ½O₂(g) → O(g)'],
      ['1st EA(O)', -141, 'Mg²⁺(g) + e⁻ + O⁻(g)', 'First electron affinity: O(g) + e⁻ → O⁻(g), exothermic', 'EA'],
      ['2nd EA(O)', 798, 'Mg²⁺(g) + O²⁻(g)', 'Second electron affinity: O⁻(g) + e⁻ → O²⁻(g). Endothermic: the electron is repelled by the negative ion, so this arrow points UP'],
      ['LE(MgO)', -3845, 'MgO(s)', 'The gaseous ions form the lattice: Mg²⁺(g) + O²⁻(g) → MgO(s)', 'LE']] },
    CaO: { start: 'Ca(s) + ½O₂(g)', fH: -635, n: 1, steps: [
      ['ΔatH(Ca)', 178, 'Ca(g) + ½O₂(g)', 'Atomise calcium: Ca(s) → Ca(g)'],
      ['1st IE(Ca)', 590, 'Ca⁺(g) + e⁻ + ½O₂(g)', 'First ionisation: Ca(g) → Ca⁺(g) + e⁻'],
      ['2nd IE(Ca)', 1145, 'Ca²⁺(g) + 2e⁻ + ½O₂(g)', 'Second ionisation: Ca⁺(g) → Ca²⁺(g) + e⁻'],
      ['ΔatH(O)', 249, 'Ca²⁺(g) + 2e⁻ + O(g)', 'Atomise oxygen: ½O₂(g) → O(g)'],
      ['1st EA(O)', -141, 'Ca²⁺(g) + e⁻ + O⁻(g)', 'First electron affinity: O(g) + e⁻ → O⁻(g), exothermic', 'EA'],
      ['2nd EA(O)', 798, 'Ca²⁺(g) + O²⁻(g)', 'Second electron affinity: O⁻(g) + e⁻ → O²⁻(g). Endothermic: the electron is repelled by the negative ion, so this arrow points UP'],
      ['LE(CaO)', -3454, 'CaO(s)', 'The gaseous ions form the lattice: Ca²⁺(g) + O²⁻(g) → CaO(s)', 'LE']] }
  };
  const UNKNOWN = { LE: 'lattice energy', EA: 'first electron affinity', fH: 'enthalpy of formation' };
  function bhSolve(D, unk) {
    const vals = D.steps.map((st) => st[1]);
    const iLE = D.steps.findIndex((st) => st[4] === 'LE');
    const iEA = D.steps.findIndex((st) => st[4] === 'EA');
    const sumExcept = (i) => vals.reduce((a, v, j) => (j === i ? a : a + v), 0);
    if (unk === 'fH') return { text: 'ΔfH = sum of every step = ' + minus(vals.map(signed).join(' + ').replace(/\+ −/g, '− ')) + ' = ' + signed(D.fH) + ' kJ mol⁻¹', value: D.fH };
    if (unk === 'LE') {
      const s = sumExcept(iLE);
      return { text: 'LE = ΔfH − (sum of the other steps) = ' + signed(D.fH) + ' − (' + signed(s) + ') = ' + signed(vals[iLE]) + ' kJ mol⁻¹', value: vals[iLE] };
    }
    const s = sumExcept(iEA);
    const tot = D.fH - s;
    const pre = D.n === 2 ? '2 × EA = ' : 'EA = ';
    return { text: pre + 'ΔfH − (sum of the other steps) = ' + signed(D.fH) + ' − (' + signed(s) + ') = ' + signed(tot) + ' kJ mol⁻¹' + (D.n === 2 ? ', so EA = ' + signed(tot / 2) + ' kJ mol⁻¹' : ''), value: tot / D.n };
  }
  function unknownIndex(D, unk) {
    if (unk === 'fH') return -1;
    return D.steps.findIndex((st) => st[4] === unk);
  }

  Sim.create('#sim-chem-12-bh', {
    title: 'Born–Haber cycle, step by step',
    height: (w) => (w >= 640 ? 470 : 520),
    resetButton: false,
    controls: [
      { key: 'cmp', type: 'select', label: 'Compound', value: 'NaCl', options: [['NaCl', 'sodium chloride, NaCl'], ['KCl', 'potassium chloride, KCl'], ['MgCl2', 'magnesium chloride, MgCl₂'], ['CaCl2', 'calcium chloride, CaCl₂'], ['MgO', 'magnesium oxide, MgO'], ['CaO', 'calcium oxide, CaO']], onChange: (s) => { s.state.step = 0; } },
      { key: 'unk', type: 'select', label: 'Find', value: 'LE', options: [['LE', 'the lattice energy'], ['EA', 'the first electron affinity'], ['fH', 'the enthalpy of formation']], onChange: (s) => { s.state.step = 0; } },
      { type: 'button', label: '◀ Back', ghost: true, onClick: (s) => { s.state.step = Math.max(0, s.state.step - 1); } },
      { type: 'button', label: 'Next step ▶', onClick: (s) => { s.state.step = Math.min(BH[s.p.cmp].steps.length + 1, s.state.step + 1); } },
      { type: 'button', label: 'Show all', ghost: true, onClick: (s) => { s.state.step = BH[s.p.cmp].steps.length + 1; } }
    ],
    init(s) { s.state = { step: 0 }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const D = BH[p.cmp];
      const S = D.steps.length;
      const step = s.state.step;
      const solved = step > S;
      const iU = unknownIndex(D, p.unk);
      // cumulative energies
      const E = [0];
      D.steps.forEach((st) => E.push(E[E.length - 1] + st[1]));
      const Emax = Math.max.apply(null, E), Emin = Math.min.apply(null, E);
      const narrow = w < 640;
      const labelW = narrow ? 128 : clamp(w * 0.34, 190, 270);
      const fs = narrow ? 10.5 : 12.5;
      const xA = 16, xB = w - labelW - 12;
      const top = 26, bot = h - 22;
      const Y = (e) => top + (Emax - e) / (Emax - Emin) * (bot - top);
      const xf = xA + 14;
      const xs = (k) => (k === S ? xB - 14 : xA + 44 + (k - 1) * (xB - xA - 74) / Math.max(1, S - 1));
      const dx = (xB - xA - 74) / Math.max(1, S - 1);
      // levels to draw
      const levels = [{ e: 0, text: D.start, x: xA }];
      for (let k = 1; k <= Math.min(step, S); k++) levels.push({ e: E[k], text: D.steps[k - 1][2], x: xs(k) - 10, cur: k === step });
      if (p.unk !== 'fH') {
        if (!levels.some((L) => L.e === E[S] && L.text === D.steps[S - 1][2])) levels.push({ e: E[S], text: D.steps[S - 1][2], x: xA, ghost: step < S });
      }
      levels.forEach((L) => {
        Sim.line(ctx, L.x, Y(L.e), xB, Y(L.e), { color: L.ghost ? '#adb5bd' : '#343a40', width: L.cur ? 2.6 : 1.8, dash: L.ghost ? [5, 4] : null });
      });
      // labels in a column on the right, pushed apart so they never overlap
      const lab = levels.map((L) => ({ y0: Y(L.e), y: Y(L.e), text: L.text, cur: L.cur, ghost: L.ghost }));
      lab.sort((a, b) => a.y0 - b.y0);
      const gap = fs + 4;
      for (let i = 1; i < lab.length; i++) if (lab[i].y < lab[i - 1].y + gap) lab[i].y = lab[i - 1].y + gap;
      for (let i = lab.length - 1; i >= 0; i--) {
        const lim = i === lab.length - 1 ? h - 8 : lab[i + 1].y - gap;
        if (lab[i].y > lim) lab[i].y = lim;
      }
      lab.forEach((L) => {
        Sim.line(ctx, xB, L.y0, xB + 8, L.y, { color: '#adb5bd', width: 1 });
        Sim.text(ctx, L.text, xB + 11, L.y, { size: fs, bold: !!L.cur, color: L.ghost ? C.grey : L.cur ? C.navy : C.ink });
      });
      // step arrows
      for (let k = 1; k <= Math.min(step, S); k++) {
        const v = D.steps[k - 1][1];
        const x = xs(k);
        const up = v > 0;
        const col = k === step ? C.orange : up ? C.red : C.blue;
        Sim.arrow(ctx, x, Y(E[k - 1]), x, Y(E[k]), { color: col, width: k === step ? 3 : 2.2, head: Math.min(9, Math.abs(Y(E[k]) - Y(E[k - 1])) * 0.6) });
        const isU = k - 1 === iU && !solved;
        const showVal = isU || k === step || dx >= 46 || k === S;
        if (showVal) {
          const t = isU ? '?' : signed(v);
          const ym = (Y(E[k - 1]) + Y(E[k])) / 2;
          const right = k !== S;
          Sim.text(ctx, t, x + (right ? 5 : -5), ym, { size: isU ? 15 : 11.5, bold: true, color: isU ? C.purple : col, align: right ? 'left' : 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
        }
      }
      // enthalpy of formation arrow (left)
      if (p.unk !== 'fH' || solved) {
        Sim.arrow(ctx, xf, Y(0), xf, Y(D.fH), { color: C.green, width: 2.4, head: 9 });
        Sim.text(ctx, 'ΔfH', xf + 5, (Y(0) + Y(D.fH)) / 2 - 8, { size: 11.5, bold: true, color: C.green });
        Sim.text(ctx, signed(D.fH), xf + 5, (Y(0) + Y(D.fH)) / 2 + 8, { size: 11.5, bold: true, color: C.green });
      } else if (step >= S) {
        Sim.arrow(ctx, xf, Y(0), xf, Y(D.fH), { color: C.purple, width: 2.4, head: 9, dash: [5, 4] });
        Sim.text(ctx, '?', xf + 6, (Y(0) + Y(D.fH)) / 2, { size: 15, bold: true, color: C.purple });
      }
      Sim.text(ctx, 'energy (to scale)', xA, 12, { size: 11, color: C.muted });
    },
    readout: (s) => {
      const D = BH[s.p.cmp];
      const S = D.steps.length;
      const step = s.state.step;
      const iU = unknownIndex(D, s.p.unk);
      const sub = (t) => t.replace(/Δat/g, 'Δ<sub>at</sub>').replace(/ΔfH/g, 'Δ<sub>f</sub>H');
      if (step === 0) return [['Start', 'the elements in their standard states, ' + D.start + '. Press Next step. Unknown: the ' + UNKNOWN[s.p.unk] + '.']];
      if (step <= S) {
        const st = D.steps[step - 1];
        return [['Step ' + step + ' of ' + S + ':', st[3], true], ['Value', step - 1 === iU ? '? (the unknown)' : sub(st[0]) + ' = ' + signed(st[1]) + ' kJ mol⁻¹']];
      }
      const sol = bhSolve(D, s.p.unk);
      return [['Hess’s law:', sub(sol.text), true]];
    }
  });

  /* ======================================================================
     2. Entropy as the number of ways of sharing energy quanta
     ====================================================================== */
  function choose(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = r * (n - k + i) / i;
    return Math.round(r);
  }
  const ways = (N, q) => choose(q + N - 1, N - 1);
  function compositions(N, q) {
    const out = [];
    const cur = new Array(N).fill(0);
    (function rec(i, left) {
      if (i === N - 1) { cur[i] = left; out.push(cur.slice()); return; }
      for (let a = left; a >= 0; a--) { cur[i] = a; rec(i + 1, left - a); }
    })(0, q);
    return out;
  }
  function drawParticles(ctx, x, y, w, h, arr, col, label) {
    const N = arr.length;
    const cw = Math.min(58, (w - 8) / N);
    const x0 = x + (w - cw * N) / 2;
    const r = Math.min(8, cw / 4.2);
    arr.forEach((qn, i) => {
      const cx = x0 + cw * i + cw / 2;
      Sim.rect(ctx, cx - cw / 2 + 4, y, cw - 8, h, { fill: '#f8f9fb', stroke: '#ced4da', r: 8 });
      for (let j = 0; j < qn; j++) Sim.circle(ctx, cx, y + h - 10 - j * (2 * r + 3) - r, r, { fill: col, stroke: '#fff', width: 1.2 });
      Sim.text(ctx, String(qn), cx, y + h + 12, { size: 11, color: C.muted, align: 'center' });
    });
    if (label) Sim.text(ctx, label, x + w / 2, y - 12, { size: 12.5, bold: true, color: C.navy, align: 'center' });
  }

  Sim.create('#sim-chem-12-quanta', {
    title: 'Entropy: counting the ways to share energy',
    height: (w) => (w >= 640 ? 380 : 560),
    resetButton: false,
    controls: [
      { key: 'mode', type: 'select', label: 'Model', value: 'one', options: [['one', 'one substance'], ['two', 'two substances in contact']], onChange: (s) => { s.state.idx = 0; } },
      { key: 'N', label: 'Particles (one substance)', min: 2, max: 6, step: 1, value: 3, format: (v) => v.toFixed(0), onChange: (s) => { s.state.idx = 0; } },
      { key: 'q', label: 'Energy quanta', min: 0, max: 8, step: 1, value: 3, format: (v) => v.toFixed(0), onChange: (s) => { s.state.idx = 0; if (s.p.qa > s.p.q) s.set('qa', s.p.q); } },
      { key: 'qa', label: 'Quanta in substance A (two substances)', min: 0, max: 8, step: 1, value: 3, format: (v) => v.toFixed(0), onChange: (s, v) => { if (v > s.p.q) s.set('qa', s.p.q); } },
      { type: 'button', label: 'Next arrangement', onClick: (s) => { s.state.idx += 1; } }
    ],
    init(s) { s.state = { idx: 0 }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const narrow = w < 640;
      if (p.mode === 'one') {
        const N = p.N, q = p.q;
        const all = compositions(N, q);
        const W = all.length;
        const arr = all[s.state.idx % W];
        const pw = narrow ? w - 24 : w * 0.5 - 24;
        const ph = narrow ? 190 : h - 120;
        drawParticles(ctx, 12, 48, pw, ph, arr, C.orange, 'Arrangement ' + (s.state.idx % W + 1) + ' of ' + W);
        Sim.text(ctx, 'W = ' + W + (W === 1 ? ' way' : ' ways'), 12 + pw / 2, 48 + ph + 40, { size: 20, bold: true, color: C.purple, align: 'center' });
        // bar chart of W against q
        const gx = narrow ? 56 : w * 0.5 + 40, gy = narrow ? 48 + ph + 90 : 40;
        const gw = narrow ? w - 56 - 18 : w * 0.5 - 60, gh = narrow ? h - gy - 44 : h - 40 - 50;
        const wmax = ways(N, 8);
        const g = Sim.graph(ctx, { x: gx, y: gy, w: gw, h: gh, xmin: 0, xmax: 9.4, ymin: 0, ymax: wmax * 1.12, ylabel: 'W', title: 'Number of ways W for ' + N + ' particles', ticks: false, grid: false });
        g.axes();
        for (let k = 0; k <= 8; k++) {
          const v = ways(N, k);
          const X = g.px(k + 0.7), bw = Math.max(6, gw / 9 * 0.6);
          Sim.text(ctx, String(k), X, g.py(0) + 12, { size: 11, color: C.muted, align: 'center' });
          Sim.rect(ctx, X - bw / 2, g.py(v), bw, g.py(0) - g.py(v), { fill: k === q ? C.purple : '#d0bfff' });
          if (k === q || narrow === false) Sim.text(ctx, String(v), X, g.py(v) - 8, { size: 10.5, color: k === q ? C.purple : C.muted, align: 'center', bold: k === q });
        }
        Sim.text(ctx, 'quanta', gx + gw, gy + gh + 30, { size: 12, bold: true, color: C.ink, align: 'right' });
      } else {
        const q = p.q, qa = Math.min(p.qa, q), qb = q - qa;
        const NA = 3, NB = 3;
        const pw = narrow ? (w - 36) / 2 : w * 0.25 - 16;
        const ph = narrow ? 170 : h - 140;
        const A = [], B = [];
        // a representative arrangement: quanta spread as evenly as possible within each substance
        for (let i = 0; i < NA; i++) A.push(Math.floor(qa / NA) + (i < qa % NA ? 1 : 0));
        for (let i = 0; i < NB; i++) B.push(Math.floor(qb / NB) + (i < qb % NB ? 1 : 0));
        drawParticles(ctx, 12, 48, pw, ph, A, C.red, 'A: ' + qa + ' quanta');
        drawParticles(ctx, 24 + pw, 48, pw, ph, B, C.blue, 'B: ' + qb + ' quanta');
        const Wt = ways(NA, qa) * ways(NB, qb);
        Sim.text(ctx, 'W = ' + ways(NA, qa) + ' × ' + ways(NB, qb) + ' = ' + Wt, 12 + pw + 6, 48 + ph + 38, { size: 17, bold: true, color: C.purple, align: 'center' });
        const gx = narrow ? 56 : w * 0.5 + 40, gy = narrow ? 48 + ph + 86 : 40;
        const gw = narrow ? w - 56 - 18 : w * 0.5 - 60, gh = narrow ? h - gy - 44 : h - 40 - 50;
        let wmax = 0;
        for (let k = 0; k <= q; k++) wmax = Math.max(wmax, ways(NA, k) * ways(NB, q - k));
        const g = Sim.graph(ctx, { x: gx, y: gy, w: gw, h: gh, xmin: 0, xmax: q + 1.4, ymin: 0, ymax: wmax * 1.15, ylabel: 'W (A and B together)', title: 'Ways for each split of ' + q + ' quanta', ticks: false, grid: false });
        g.axes();
        for (let k = 0; k <= q; k++) {
          const v = ways(NA, k) * ways(NB, q - k);
          const X = g.px(k + 0.7), bw = Math.max(6, gw / (q + 1) * 0.6);
          Sim.rect(ctx, X - bw / 2, g.py(v), bw, g.py(0) - g.py(v), { fill: k === qa ? C.purple : '#d0bfff' });
          Sim.text(ctx, String(k), X, g.py(0) + 12, { size: 11, color: C.muted, align: 'center' });
          if (k === qa || q <= 8) Sim.text(ctx, String(v), X, g.py(v) - 8, { size: 10.5, color: k === qa ? C.purple : C.muted, align: 'center', bold: k === qa });
        }
        Sim.text(ctx, 'quanta in A', gx + gw, gy + gh + 30, { size: 12, bold: true, color: C.ink, align: 'right' });
      }
    },
    readout: (s) => {
      const p = s.p;
      if (p.mode === 'one') {
        return [['W', ways(p.N, p.q) + ' ways to share ' + p.q + ' quanta among ' + p.N + ' particles', true], ['Try', 'add one quantum: W for ' + (p.q + 1) + ' quanta would be ' + ways(p.N, p.q + 1)]];
      }
      const q = p.q, qa = Math.min(p.qa, q);
      let tot = 0, best = 0, bestK = 0;
      for (let k = 0; k <= q; k++) { const v = ways(3, k) * ways(3, q - k); tot += v; if (v > best) { best = v; bestK = k; } }
      const v = ways(3, qa) * ways(3, q - qa);
      return [['This split', Sim.fmt(100 * v / tot, 2) + '% of all ' + tot + ' arrangements', true], ['Most likely split', bestK + ' quanta in A, ' + (q - bestK) + ' in B: energy spreads out evenly. With 10²³ particles the even split is almost certain.']];
    }
  });

  /* ======================================================================
     3. ΔG = ΔH − TΔS against temperature: when does a reaction become feasible?
     ====================================================================== */
  const PRE = {
    caco3: { name: 'CaCO₃(s) → CaO(s) + CO₂(g)', dH: 178.3, dS: 160.4 },
    nh3: { name: 'N₂(g) + 3H₂(g) → 2NH₃(g)', dH: -92.2, dS: -198.8 },
    h2o2: { name: '2H₂O₂(l) → 2H₂O(l) + O₂(g)', dH: -196.0, dS: 125.6 },
    no2: { name: 'N₂(g) + 2O₂(g) → 2NO₂(g)', dH: 66.4, dS: -121.6 },
    ice: { name: 'H₂O(s) → H₂O(l)', dH: 6.0, dS: 22.0 },
    nh4no3: { name: 'NH₄NO₃(s) + aq → NH₄⁺(aq) + NO₃⁻(aq)', dH: 25.7, dS: 108.7 }
  };
  function gLayout(w, h) {
    if (w >= 640) return { a: { x: 66, y: 34, w: w * 0.64 - 80, h: h - 34 - 40 }, b: { x: w * 0.64 + 12, y: 34, w: w * 0.36 - 26, h: h - 34 - 40 } };
    return { a: { x: 60, y: 34, w: w - 60 - 16, h: 250 }, b: { x: 12, y: 34 + 250 + 46, w: w - 24, h: h - (34 + 250 + 46) - 12 } };
  }
  function logK(dG, T) { return -dG * 1000 / (R * T) / Math.LN10; }

  Sim.create('#sim-chem-12-gibbs', {
    title: 'ΔG = ΔH − TΔS: when does a reaction become feasible?',
    height: (w) => (w >= 640 ? 380 : 560),
    resetButton: false,
    controls: [
      { key: 'pre', type: 'select', label: 'Reaction', value: 'caco3', options: [['caco3', 'CaCO₃ → CaO + CO₂'], ['nh3', 'N₂ + 3H₂ → 2NH₃'], ['h2o2', '2H₂O₂ → 2H₂O + O₂'], ['no2', 'N₂ + 2O₂ → 2NO₂'], ['ice', 'ice melting'], ['nh4no3', 'NH₄NO₃ dissolving'], ['custom', 'your own values']],
        onChange: (s, v) => { if (PRE[v]) { s.set('dH', PRE[v].dH); s.set('dS', PRE[v].dS); } } },
      { key: 'dH', label: 'ΔH', min: -300, max: 300, step: 0.1, value: 178.3, unit: 'kJ mol⁻¹', format: (v) => minus(v.toFixed(1)), onChange: (s) => { s.set('pre', 'custom'); } },
      { key: 'dS', label: 'ΔS (system)', min: -300, max: 300, step: 0.1, value: 160.4, unit: 'J K⁻¹ mol⁻¹', format: (v) => minus(v.toFixed(1)), onChange: (s) => { s.set('pre', 'custom'); } },
      { key: 'T', label: 'Temperature T', min: 50, max: 2000, step: 1, value: 298, unit: 'K', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const L = gLayout(w, h);
      const dH = p.dH, dS = p.dS, T = p.T;
      const G = (t) => dH - t * dS / 1000;
      const g0 = G(0), g1 = G(2000);
      let ymin = Math.min(g0, g1, -20), ymax = Math.max(g0, g1, 20);
      const pad = (ymax - ymin) * 0.1;
      ymin -= pad; ymax += pad;
      const ys = niceStep(ymax - ymin, 5);
      ymin = Math.floor(ymin / ys) * ys; ymax = Math.ceil(ymax / ys) * ys;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2000, ymin, ymax, xstep: 500, ystep: ys, xlabel: 'T / K', ylabel: 'ΔG / kJ mol⁻¹', title: PRE[p.pre] ? PRE[p.pre].name : 'Your reaction' }, L.a));
      g.axes();
      g.clip();
      Sim.rect(ctx, g.x, g.py(0), g.w, g.y + g.h - g.py(0), { fill: 'rgba(47,158,68,0.08)' });
      Sim.rect(ctx, g.x, g.y, g.w, g.py(0) - g.y, { fill: 'rgba(224,49,49,0.06)' });
      g.unclip();
      if (ymin < 0) Sim.text(ctx, 'feasible (ΔG < 0)', g.x + g.w - 6, g.y + g.h - 10, { size: 11.5, bold: true, color: C.green, align: 'right' });
      if (ymax > 0) Sim.text(ctx, 'not feasible (ΔG > 0)', g.x + g.w - 6, g.y + 12, { size: 11.5, bold: true, color: C.red, align: 'right' });
      g.plot(G, { color: C.navy, width: 2.8 });
      if (Math.abs(dS) > 1e-6) {
        const Tc = dH * 1000 / dS;
        if (Tc > 0 && Tc < 2000) {
          g.vline(Tc, { color: C.purple, dash: [5, 4] });
          g.dot(Tc, 0, { color: C.purple, r: 5 });
          const lt = 'T = ΔH/ΔS = ' + Math.round(Tc) + ' K';
          const left = g.px(Tc) - 10 - Sim.measure(ctx, lt, { size: 11.5, bold: true }) > g.x;
          const dy = (dS > 0) === left ? 14 : -14;
          Sim.text(ctx, lt, g.px(Tc) + (left ? -6 : 6), g.py(0) + dy, { size: 11.5, bold: true, color: C.purple, align: left ? 'right' : 'left', bg: 'rgba(255,255,255,0.85)', pad: 2 });
        }
      }
      g.vline(T, { color: C.orange, dash: [3, 3] });
      g.dot(T, G(T), { color: C.orange, r: 6 });
      /* entropy bars at T */
      const b = L.b;
      const sys = dS, sur = -dH * 1000 / T, tot = sys + sur;
      Sim.rect(ctx, b.x, b.y - 8, b.w, b.h + 8, { fill: '#f8f9fb', r: 10 });
      Sim.text(ctx, 'Entropy changes at ' + Math.round(T) + ' K', b.x + b.w / 2, b.y + 8, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'J K⁻¹ mol⁻¹', b.x + b.w / 2, b.y + 24, { size: 11, color: C.muted, align: 'center' });
      const mAbs = Math.max(50, Math.abs(sys), Math.abs(sur), Math.abs(tot));
      const zy = b.y + 40 + (b.h - 70) / 2;
      const half = (b.h - 70) / 2;
      Sim.line(ctx, b.x + 8, zy, b.x + b.w - 8, zy, { color: C.axis, width: 1.2 });
      const bars = [['system', sys, C.blue], ['surroundings', sur, C.orange], ['total', tot, tot > 0 ? C.green : C.red]];
      const bw = (b.w - 30) / 3;
      bars.forEach((bar, i) => {
        const X = b.x + 15 + i * bw;
        const hh = bar[1] / mAbs * half * 0.82;
        Sim.rect(ctx, X + 8, hh > 0 ? zy - hh : zy, bw - 16, Math.abs(hh), { fill: bar[2], r: 3 });
        Sim.text(ctx, minus(Math.round(bar[1])), X + bw / 2, hh > 0 ? zy - hh - 9 : zy - hh + 9, { size: 11, bold: true, color: bar[2], align: 'center' });
        Sim.text(ctx, bar[0], X + bw / 2, b.y + b.h - 6, { size: 11, color: C.ink, align: 'center' });
      });
    },
    readout: (s) => {
      const p = s.p;
      const dG = p.dH - p.T * p.dS / 1000;
      const tot = p.dS - p.dH * 1000 / p.T;
      const lk = logK(dG, p.T);
      const K = Math.abs(lk) < 300 ? Sim.fmt(Math.pow(10, lk), 3) : '10' + Sim.sup(Math.round(lk));
      const ok = dG < 0;
      return [
        ['At ' + Math.round(p.T) + ' K:', 'ΔG = ' + minus(Sim.fmt(dG, 3)) + ' kJ mol⁻¹, ΔS(total) = ' + minus(Sim.fmt(tot, 3)) + ' J K⁻¹ mol⁻¹', ok],
        ['K = e^(−ΔG/RT) =', minus(K)],
        ['Verdict', ok ? 'feasible: ΔG is negative and ΔS(total) is positive' : 'not feasible at this temperature: ΔG is positive and ΔS(total) is negative']
      ];
    }
  });
})();
