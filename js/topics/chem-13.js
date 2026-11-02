/* Chemistry topic 13: Chemical equilibria — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const RGAS = 8.314;

  // Extent of reaction ξ that makes Σ ν·ln(n₀ + νξ) − (Σν)·ln V equal ln K. The left side
  // rises steadily with ξ, so bisection between the limits set by running out of
  // a reactant (top) or a product (bottom) always finds the one answer.
  function extent(n0, nu, V, K) {
    let lo = -Infinity, hi = Infinity;
    nu.forEach((v, i) => { if (v > 0) lo = Math.max(lo, -n0[i] / v); else hi = Math.min(hi, n0[i] / -v); });
    if (!(hi > lo)) return null;
    const f = (x) => nu.reduce((a, v, i) => a + v * Math.log((n0[i] + v * x) / V), 0) - Math.log(K);
    for (let it = 0; it < 200; it++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  // Three significant figures, as in the worked examples.
  const f3 = (v) => (Math.abs(v) < 1e-9 ? '0' : Math.abs(v) >= 1000 ? v.toFixed(0) : v.toPrecision(3));

  /* ======================================================================
     1. Calculating Kc: an ICE table for any starting mixture
     ====================================================================== */
  const RX = {
    hi: {
      opt: 'H₂(g) + I₂(g) ⇌ 2HI(g)', K: 54.0, unit: 'no units',
      sp: [{ f: 'H₂', nu: -1, n: 0.5, col: C.grey }, { f: 'I₂', nu: -1, n: 0.5, col: C.purple }, { f: 'HI', nu: 2, n: 0, col: C.teal }],
      V: 2, expr: '[HI]² / ([H₂][I₂])'
    },
    so3: {
      opt: '2SO₂(g) + O₂(g) ⇌ 2SO₃(g)', K: 200, unit: 'dm³ mol⁻¹',
      sp: [{ f: 'SO₂', nu: -2, n: 2, col: C.orange }, { f: 'O₂', nu: -1, n: 1.2, col: C.blue }, { f: 'SO₃', nu: 2, n: 0, col: C.red }],
      V: 5, expr: '[SO₃]² / ([SO₂]²[O₂])'
    },
    ester: {
      opt: 'CH₃COOH + C₂H₅OH ⇌ CH₃COOC₂H₅ + H₂O', K: 4.0, unit: 'no units',
      sp: [{ f: 'acid', nu: -1, n: 0.2, col: C.red }, { f: 'ethanol', nu: -1, n: 0.2, col: C.blue }, { f: 'ester', nu: 1, n: 0, col: C.green }, { f: 'water', nu: 1, n: 0, col: C.sky }],
      V: 1, expr: '[ester][H₂O] / ([acid][ethanol])'
    }
  };
  const SLIDERS = ['a', 'b', 'c'];   // first reactant, second reactant, first product

  function setupRx(s) {
    const R = RX[s.p.rx];
    SLIDERS.forEach((k, i) => {
      const q = R.sp[i === 2 ? 2 : i];
      s.setLabel(k, 'Starting moles of ' + q.f);
    });
  }

  function solveIce(s) {
    const R = RX[s.p.rx];
    const n0 = R.sp.map((q, i) => (i === 0 ? s.p.a : i === 1 ? s.p.b : i === 2 ? s.p.c : 0));
    const V = s.p.V;
    const nu = R.sp.map((q) => q.nu);
    const x = extent(n0, nu, V, R.K);
    if (x == null) return { R, n0, V, ok: false };
    const n = n0.map((v, i) => Math.max(0, v + nu[i] * x));
    return { R, n0, n, x, V, ok: true, conc: n.map((v) => v / V) };
  }

  Sim.create('#sim-chem-13-ice', {
    title: 'Calculating Kc from an ICE table',
    height: (w) => (w >= 680 ? 300 : 330),
    controls: [
      { key: 'rx', type: 'select', label: 'Reaction', options: Object.keys(RX).map((k) => [k, RX[k].opt]), value: 'hi' },
      { key: 'a', label: 'Starting moles of H₂', min: 0, max: 3, step: 0.05, value: 0.5, unit: 'mol', format: (v) => v.toFixed(2) },
      { key: 'b', label: 'Starting moles of I₂', min: 0, max: 3, step: 0.05, value: 0.5, unit: 'mol', format: (v) => v.toFixed(2) },
      { key: 'c', label: 'Starting moles of HI', min: 0, max: 3, step: 0.05, value: 0, unit: 'mol', format: (v) => v.toFixed(2) },
      { key: 'V', label: 'Volume', min: 0.5, max: 10, step: 0.5, value: 2, unit: 'dm³', format: (v) => v.toFixed(1) }
    ],
    init(s) { setupRx(s); },
    onChange(s, key, v) {
      if (key !== 'rx') return;
      const R = RX[v];
      s.set('a', R.sp[0].n);
      s.set('b', R.sp[1].n);
      s.set('c', R.sp[2].n);
      s.set('V', R.V);
      setupRx(s);
    },
    draw(s) {
      const { ctx, w, h } = s;
      const r = solveIce(s);
      const R = r.R;
      Sim.text(ctx, R.opt + '    Kc = ' + R.K + (R.unit === 'no units' ? '' : ' ' + R.unit), w / 2, 18, { size: w >= 600 ? 14 : 12, bold: true, color: C.navy, align: 'center' });
      if (!r.ok) {
        Sim.text(ctx, 'Nothing can react: put in some of every reactant, or some product to run it backwards.', w / 2, h / 2, { size: 13, color: C.red, align: 'center' });
        return;
      }
      // grouped bars: starting moles (pale) and equilibrium moles (solid) for each substance
      const top = Math.max(0.1, ...r.n0, ...r.n) * 1.15;
      const g = Sim.graph(ctx, { x: 52, y: 40, w: w - 70, h: h - 40 - 46, xmin: 0, xmax: R.sp.length, ymin: 0, ymax: top, xstep: 1, ticks: true, grid: true, ylabel: 'amount / mol' });
      g.axes();
      const slot = g.w / R.sp.length;
      R.sp.forEach((q, i) => {
        const bw = Math.min(46, slot * 0.32);
        const x0 = g.x + slot * i + slot / 2 - bw - 3;
        const hy0 = g.py(r.n0[i]), hy1 = g.py(r.n[i]);
        Sim.rect(ctx, x0, hy0, bw, g.y + g.h - hy0, { fill: q.col, r: 3 });
        ctx.save(); ctx.globalAlpha = 0.35;
        Sim.rect(ctx, x0, hy0, bw, g.y + g.h - hy0, { fill: '#ffffff' });
        ctx.restore();
        Sim.rect(ctx, x0 + bw + 6, hy1, bw, g.y + g.h - hy1, { fill: q.col, r: 3 });
        Sim.text(ctx, q.f, g.x + slot * i + slot / 2, g.y + g.h + 16, { size: 12.5, bold: true, color: C.ink, align: 'center' });
        Sim.text(ctx, 'start  equilibrium', g.x + slot * i + slot / 2, g.y + g.h + 31, { size: 10.5, color: C.muted, align: 'center' });
      });
    },
    readout(s) {
      const r = solveIce(s);
      if (!r.ok) return [['Kc', 'no reaction possible from this mixture', true]];
      const R = r.R;
      const vUnit = r.V + ' dm³';
      const row = (label, vals) => '<tr><td>' + label + '</td>' + vals.map((v) => '<td>' + v + '</td>').join('') + '</tr>';
      const Kcheck = R.sp.reduce((a, q, i) => a * Math.pow(r.conc[i], q.nu), 1);
      return '<div class="table-wrap" style="flex:1 1 100%"><table class="data">' +
        '<tr><th></th>' + R.sp.map((q) => '<th>' + q.f + '</th>').join('') + '</tr>' +
        row('Initial / mol', r.n0.map(f3)) +
        row('Change / mol', r.n.map((v, i) => (v - r.n0[i] >= 0 ? '+' : '−') + f3(Math.abs(v - r.n0[i])))) +
        row('Equilibrium / mol', r.n.map(f3)) +
        row('Concentration / mol dm⁻³ (÷ ' + vUnit + ')', r.conc.map(f3)) +
        '</table></div>' +
        '<span class="ro hl">Kc = ' + R.expr + ' = <b>' + f3(Kcheck) + (R.unit === 'no units' ? ' (no units)' : ' ' + R.unit) + '</b></span>' +
        '<span class="ro">The equilibrium amounts change with the starting mixture, but K<sub>c</sub> <b>stays the same</b> at a fixed temperature.</span>';
    }
  });

  /* ======================================================================
     2. Kp for the Haber process: pressure moves the position, only T changes Kp
     Kp = 1.64 × 10⁻⁴ atm⁻² at 673 K; ΔH = −92 kJ mol⁻¹ (van 't Hoff).
     Feed 1 mol N₂ : 3 mol H₂; a = fraction of N₂ converted.
     ====================================================================== */
  const KP673 = 1.64e-4, DH = -92000;
  const KpOf = (T) => KP673 * Math.exp((-DH / RGAS) * (1 / T - 1 / 673));
  function haber(P, T) {
    const K = KpOf(T);
    const frac = (a) => { const t = 4 - 2 * a; return { N2: (1 - a) / t, H2: 3 * (1 - a) / t, NH3: 2 * a / t }; };
    const g = (a) => { const x = frac(a); return 2 * Math.log(x.NH3) - Math.log(x.N2) - 3 * Math.log(x.H2) - 2 * Math.log(P) - Math.log(K); };
    let lo = 1e-12, hi = 1 - 1e-12;
    for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (g(m) > 0) hi = m; else lo = m; }
    const a = (lo + hi) / 2;
    const x = frac(a);
    return { K, a, x, p: { N2: x.N2 * P, H2: x.H2 * P, NH3: x.NH3 * P } };
  }

  Sim.create('#sim-chem-13-kp', {
    title: 'Kp and the Haber process',
    height: (w) => (w >= 680 ? 330 : 600),
    controls: [
      { key: 'P', label: 'Total pressure', min: 10, max: 400, step: 10, value: 200, unit: 'atm', format: (v) => v.toFixed(0) },
      { key: 'T', label: 'Temperature', min: 573, max: 873, step: 25, value: 723, unit: 'K', format: (v) => v.toFixed(0) + ' (' + (v - 273).toFixed(0) + ' °C)' }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 680;
      const r = haber(p.P, p.T);
      // partial pressure bars
      const bx = wide ? 20 : 20, by = 34, bw = wide ? w * 0.36 : w - 40, bh = wide ? h - 80 : 200;
      Sim.text(ctx, 'Partial pressures at equilibrium (they add up to ' + p.P + ' atm)', bx, 18, { size: 12.5, bold: true, color: C.navy });
      const items = [['N₂', r.p.N2, C.blue], ['H₂', r.p.H2, C.grey], ['NH₃', r.p.NH3, C.green]];
      const colW = bw / 3;
      items.forEach(([lab, val, col], i) => {
        const hh = (val / 400) * bh;
        const x = bx + colW * i + colW * 0.2;
        Sim.rect(ctx, x, by + bh - hh, colW * 0.6, hh, { fill: col, r: 3 });
        Sim.text(ctx, lab, x + colW * 0.3, by + bh + 15, { size: 12.5, bold: true, color: C.ink, align: 'center' });
        Sim.text(ctx, val.toFixed(1) + ' atm', x + colW * 0.3, by + bh - hh - 8, { size: 11.5, color: C.ink, align: 'center' });
      });
      Sim.line(ctx, bx, by + bh, bx + bw, by + bh, { color: C.axis, width: 1.5 });
      // % NH3 against pressure at this temperature, and at 450 °C for comparison
      const gb = wide ? { x: w * 0.45 + 30, y: 30, w: w * 0.55 - 50, h: h - 30 - 46 } : { x: 50, y: by + bh + 70, w: w - 66, h: h - (by + bh + 70) - 46 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 0, xmax: 400, ymin: 0, ymax: 100, xstep: 100, ystep: 20, xlabel: 'total pressure / atm', ylabel: '% NH₃ at equilibrium' }));
      g.axes();
      const pct = (P, T) => { const q = haber(P, T); return 100 * q.x.NH3; };
      if (p.T !== 723) g.plot((P) => pct(Math.max(P, 1), 723), { color: C.grey, width: 1.8, dash: [6, 4], samples: 80 });
      g.plot((P) => pct(Math.max(P, 1), p.T), { color: C.green, width: 2.8, samples: 80 });
      g.dot(p.P, 100 * r.x.NH3, { color: C.green, r: 5 });
      Sim.text(ctx, (p.T - 273) + ' °C', g.x + g.w - 6, g.y + 12, { size: 12, bold: true, color: C.green, align: 'right' });
      if (p.T !== 723) Sim.text(ctx, '- - 450 °C', g.x + g.w - 6, g.y + 28, { size: 11.5, color: C.grey, align: 'right' });
    },
    readout(s) {
      const p = s.p;
      const r = haber(p.P, p.T);
      const quot = (r.x.NH3 * r.x.NH3) / (r.x.N2 * Math.pow(r.x.H2, 3));
      return [
        ['Kp at this temperature', Sim.fmt(r.K) + ' atm⁻²', true],
        ['Mole-fraction part × 1/P²', Sim.fmt(quot) + ' × 1/' + p.P + '² = ' + Sim.fmt(quot / (p.P * p.P))],
        ['NH₃ in the equilibrium mixture', (100 * r.x.NH3).toFixed(1) + '% by moles'],
        ['What to notice', 'pressure changes the mole fractions but Kp stays the same; temperature changes Kp itself']
      ];
    }
  });

  /* ======================================================================
     3. Why temperature changes K: ΔS_total = ΔS_system − ΔH/T = R ln K, for A ⇌ B
     ====================================================================== */
  const TYPES = {
    exo: { opt: 'Exothermic: ΔH = −40 kJ mol⁻¹, ΔS(system) = −100 J K⁻¹ mol⁻¹', dH: -40000, dS: -100 },
    endo: { opt: 'Endothermic: ΔH = +40 kJ mol⁻¹, ΔS(system) = +100 J K⁻¹ mol⁻¹', dH: 40000, dS: 100 }
  };
  const ent = (Y, T) => {
    const surr = -Y.dH / T;
    const tot = Y.dS + surr;
    const K = Math.exp(tot / RGAS);
    return { surr, tot, K, frac: K / (1 + K) };
  };

  Sim.create('#sim-chem-13-entropy', {
    title: 'Temperature, entropy and K',
    height: (w) => (w >= 680 ? 320 : 600),
    controls: [
      { key: 'type', type: 'select', label: 'Reaction A ⇌ B', options: Object.keys(TYPES).map((k) => [k, TYPES[k].opt]), value: 'exo' },
      { key: 'T', label: 'Temperature', min: 200, max: 800, step: 10, value: 300, unit: 'K', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const Y = TYPES[p.type];
      const wide = w >= 680;
      const e = ent(Y, p.T);
      // log10 K against temperature
      const gb = wide ? { x: 56, y: 26, w: w * 0.5 - 70, h: h - 26 - 46 } : { x: 50, y: 26, w: w - 66, h: 230 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 200, xmax: 800, ymin: -6, ymax: 6, xstep: 100, ystep: 2, xlabel: 'temperature / K', ylabel: 'log₁₀ K' }));
      g.axes();
      g.hline(0, { color: C.grey });
      g.label(790, 0.5, 'K = 1', { color: C.muted, align: 'right', size: 11.5 });
      g.plot((T) => Math.max(-6, Math.min(6, Math.log10(ent(Y, T).K))), { color: Y.dH < 0 ? C.red : C.blue, width: 2.8, samples: 120 });
      g.dot(p.T, Math.max(-6, Math.min(6, Math.log10(e.K))), { color: C.navy, r: 5 });
      // entropy bars
      const ex = wide ? w * 0.5 + 20 : 20, ey = wide ? 40 : gb.y + gb.h + 70, ew = wide ? w * 0.5 - 40 : w - 40;
      const mid = ex + ew * 0.5, scale = (ew * 0.45) / 250;
      Sim.text(ctx, 'Entropy changes / J K⁻¹ mol⁻¹', ex, ey - 14, { size: 12.5, bold: true, color: C.navy });
      Sim.line(ctx, mid, ey - 4, mid, ey + 3 * 30, { color: C.axis, width: 1 });
      [['system', Y.dS], ['surroundings (−ΔH/T)', e.surr], ['total', e.tot]].forEach(([lab, val], i) => {
        const y = ey + i * 30;
        const len = Math.max(-250, Math.min(250, val)) * scale;
        Sim.rect(ctx, len >= 0 ? mid : mid + len, y, Math.abs(len), 18, { fill: i === 2 ? (val >= 0 ? C.green : C.red) : C.sky, r: 3 });
        Sim.text(ctx, lab + ': ' + (val >= 0 ? '+' : '−') + Math.abs(val).toFixed(0), len >= 0 ? mid - 6 : mid + 6, y + 10, { size: 11.5, color: C.ink, align: len >= 0 ? 'right' : 'left' });
      });
      // equilibrium mixture of A and B
      const my = ey + 3 * 30 + 24;
      Sim.text(ctx, 'Equilibrium mixture', ex, my, { size: 12.5, bold: true, color: C.navy });
      Sim.rect(ctx, ex, my + 10, ew, 22, { fill: C.light, r: 4 });
      Sim.rect(ctx, ex, my + 10, ew * e.frac, 22, { fill: C.green, r: 4 });
      Sim.text(ctx, 'B (product) ' + (100 * e.frac).toFixed(e.frac > 0.999 || e.frac < 0.001 ? 2 : 1) + '%', ex + 6, my + 21, { size: 11.5, bold: true, color: '#fff' });
    },
    readout(s) {
      const Y = TYPES[s.p.type];
      const e = ent(Y, s.p.T);
      return [
        ['ΔS(surroundings) = −ΔH/T', (e.surr >= 0 ? '+' : '−') + Math.abs(e.surr).toFixed(1) + ' J K⁻¹ mol⁻¹'],
        ['ΔS(total)', (e.tot >= 0 ? '+' : '−') + Math.abs(e.tot).toFixed(1) + ' J K⁻¹ mol⁻¹', true],
        ['K = e^(ΔS(total)/R)', Sim.fmt(e.K)],
        ['Raising T', Y.dH < 0 ? 'makes −ΔH/T smaller, so ΔS(total) and K fall' : 'makes −ΔH/T less negative, so ΔS(total) and K rise']
      ];
    }
  });
})();
