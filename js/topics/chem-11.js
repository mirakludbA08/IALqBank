/* Chemistry 11: Kinetics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const R = 8.31;

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /* Round up to 1, 2, 2.5 or 5 × a power of ten. */
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function fitLine(pts) {
    const n = pts.length;
    if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const d = n * sxx - sx * sx;
    if (Math.abs(d) < 1e-30) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  /* Always standard form: 6.40 × 10⁻⁴ */
  function sci(v, sig) {
    if (!(v > 0)) return '0';
    let e = Math.floor(Math.log10(v));
    let m = v / Math.pow(10, e);
    if (+m.toFixed(sig - 1) >= 10) { m /= 10; e += 1; }
    return m.toFixed(sig - 1) + ' × 10' + Sim.sup(e);
  }
  const minus = (str) => String(str).replace(/-/g, '−');
  function niceStep(range, target) {
    const raw = range / (target || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  /* Grid, ticks and labels along the left and bottom edges, wherever zero is. */
  function boxAxes(ctx, g, xstep, ystep, xdp, ydp) {
    Sim.rect(ctx, g.x, g.y, g.w, g.h, { fill: '#fff' });
    for (let v = Math.ceil(g.xmin / xstep - 1e-9) * xstep; v <= g.xmax + 1e-9; v += xstep) {
      const X = g.px(v);
      Sim.line(ctx, X, g.y, X, g.y + g.h, { color: C.grid, width: 1 });
      Sim.line(ctx, X, g.y + g.h, X, g.y + g.h + 4, { color: C.axis, width: 1 });
      Sim.text(ctx, minus(v.toFixed(xdp)), X, g.y + g.h + 12, { size: 11, color: C.muted, align: 'center' });
    }
    for (let v = Math.ceil(g.ymin / ystep - 1e-9) * ystep; v <= g.ymax + 1e-9; v += ystep) {
      const Y = g.py(v);
      Sim.line(ctx, g.x, Y, g.x + g.w, Y, { color: C.grid, width: 1 });
      Sim.line(ctx, g.x - 4, Y, g.x, Y, { color: C.axis, width: 1 });
      Sim.text(ctx, minus((Math.abs(v) < 1e-9 ? 0 : v).toFixed(ydp)), g.x - 6, Y, { size: 11, color: C.muted, align: 'right' });
    }
    Sim.line(ctx, g.x, g.y, g.x, g.y + g.h, { color: C.axis, width: 1.5 });
    Sim.line(ctx, g.x, g.y + g.h, g.x + g.w, g.y + g.h, { color: C.axis, width: 1.5 });
    if (g.xlabel) Sim.text(ctx, g.xlabel, g.x + g.w, g.y + g.h + 30, { size: 12.5, bold: true, color: C.ink, align: 'right' });
    if (g.ylabel) Sim.text(ctx, g.ylabel, g.x + 6, g.y + 4, { size: 12.5, bold: true, color: C.ink, baseline: 'top' });
    if (g.title) Sim.text(ctx, g.title, g.x + g.w / 2, g.y - 12, { size: 13.5, bold: true, color: C.navy, align: 'center' });
  }
  const kUnits = (n) => ['mol dm⁻³ s⁻¹', 's⁻¹', 'dm³ mol⁻¹ s⁻¹', 'dm⁶ mol⁻² s⁻¹', 'dm⁹ mol⁻³ s⁻¹'][n];

  /* ======================================================================
     1. Zero, first and second order: concentration–time and rate–concentration
     ====================================================================== */
  const ORD = {
    0: { base: 0.002, v: 5, eq: 'rate = k' },
    1: { base: 0.01, v: 3, eq: 'rate = k[A]' },
    2: { base: 0.05, v: 3, eq: 'rate = k[A]²' }
  };
  let curOrder = 1;
  const TMAX = 100;
  function concAt(n, A0, k, t) {
    if (n === 0) return Math.max(0, A0 - k * t);
    if (n === 1) return A0 * Math.exp(-k * t);
    return A0 / (1 + k * A0 * t);
  }
  function rateAt(n, k, A) { return n === 0 ? (A > 1e-12 ? k : 0) : k * Math.pow(A, n); }
  /* Time at which [A] has fallen to A0 / 2^(i+1). */
  function halfTime(n, A0, k, i) {
    const f = Math.pow(2, i + 1);
    if (n === 0) return (A0 - A0 / f) / k;
    if (n === 1) return (i + 1) * Math.LN2 / k;
    return (f - 1) / (k * A0);
  }
  function ordLayout(w, h) {
    if (w >= 640) {
      const gw = (w - 70 - 70 - 30) / 2;
      return { a: { x: 60, y: 34, w: gw, h: h - 34 - 48 }, b: { x: 60 + gw + 80, y: 34, w: gw, h: h - 34 - 48 } };
    }
    const gh = (h - 34 - 48 - 70) / 2;
    return { a: { x: 56, y: 34, w: w - 56 - 18, h: gh }, b: { x: 56, y: 34 + gh + 70, w: w - 56 - 18, h: gh } };
  }

  Sim.create('#sim-chem-11-orders', {
    title: 'Orders of reaction: concentration–time and rate–concentration graphs',
    height: (w) => (w >= 640 ? 380 : 600),
    controls: [
      { key: 'n', type: 'select', label: 'Order with respect to A', value: '1', options: [['0', 'zero order: rate = k'], ['1', 'first order: rate = k[A]'], ['2', 'second order: rate = k[A]²']],
        onChange: (s, v) => { curOrder = +v; s.set('v', ORD[v].v); } },
      { key: 'A0', label: 'Starting concentration [A]₀', min: 0.2, max: 1, step: 0.05, value: 0.8, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'v', label: 'Rate constant k', min: 1, max: 10, step: 0.5, value: 3, format: (v) => Sim.fmt(v * ORD[curOrder].base, 2) + ' ' + kUnits(curOrder) },
      { key: 't', label: 'Time for the tangent', min: 0, max: 100, step: 1, value: 15, unit: 's', format: (v) => v.toFixed(0) },
      { key: 'halves', type: 'check', label: 'Show successive half-lives', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const n = +p.n, k = p.v * ORD[n].base, A0 = p.A0;
      const L = ordLayout(w, h);
      /* concentration–time */
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: TMAX, ymin: 0, ymax: 1, xstep: 20, ystep: 0.2, xlabel: 'time / s', ylabel: '[A] / mol dm⁻³', title: 'Concentration of A against time' }, L.a));
      boxAxes(ctx, g, 20, 0.2, 0, 1);
      if (p.halves) {
        const cols = [C.green, C.orange, C.purple, C.pink];
        let prev = 0;
        for (let i = 0; i < 4; i++) {
          const th = halfTime(n, A0, k, i);
          if (!(th <= TMAX)) break;
          const c = A0 / Math.pow(2, i + 1);
          Sim.line(ctx, g.px(0), g.py(c), g.px(th), g.py(c), { color: '#adb5bd', dash: [4, 4], width: 1.2 });
          Sim.line(ctx, g.px(th), g.py(c), g.px(th), g.py(0), { color: '#adb5bd', dash: [4, 4], width: 1.2 });
          const yb = g.py(0) - 10 - (i % 2) * 14;
          Sim.line(ctx, g.px(prev) + 1, yb, g.px(th) - 1, yb, { color: cols[i], width: 3 });
          if (g.px(th) - g.px(prev) > 34) Sim.text(ctx, Sim.fmt(th - prev, 2) + ' s', (g.px(prev) + g.px(th)) / 2, yb - 8, { size: 11, bold: true, color: cols[i], align: 'center' });
          prev = th;
        }
      }
      g.plot((t) => concAt(n, A0, k, t), { color: C.navy, width: 2.6 });
      const t = p.t, At = concAt(n, A0, k, t), r = rateAt(n, k, At);
      if (At > 1e-6) {
        const d = TMAX * 0.18;
        g.clip();
        Sim.line(ctx, g.px(t - d), g.py(At + r * d), g.px(t + d), g.py(At - r * d), { color: C.red, width: 2 });
        g.unclip();
      }
      g.dot(t, At, { color: C.red });
      Sim.text(ctx, 'gradient = −' + Sim.fmt(r, 2), g.px(t) + 8, g.py(At) - 14, { size: 11.5, bold: true, color: C.red, bg: 'rgba(255,255,255,0.85)', pad: 2 });
      /* rate–concentration */
      const rmax = niceCeil(rateAt(n, k, 1) * 1.15);
      const gr = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 1, ymin: 0, ymax: rmax, xstep: 0.2, xlabel: '[A] / mol dm⁻³', ylabel: 'rate / mol dm⁻³ s⁻¹', title: 'Rate against concentration' }, L.b));
      { const ys = niceStep(rmax, 4); boxAxes(ctx, gr, 0.2, ys, 1, Math.max(0, -Math.floor(Math.log10(ys) + 1e-9))); }
      gr.plot((A) => rateAt(n, k, A), { color: C.blue, width: 2.6, from: n === 0 ? 0.002 : 0 });
      gr.dot(At, r, { color: C.red });
    },
    readout: (s) => {
      const p = s.p, n = +p.n, k = p.v * ORD[n].base;
      const At = concAt(n, p.A0, k, p.t), r = rateAt(n, k, At);
      const hl = [];
      let prev = 0;
      for (let i = 0; i < 4; i++) { const th = halfTime(n, p.A0, k, i); hl.push(Sim.fmt(th - prev, 3)); prev = th; }
      return [
        ['Rate equation', ORD[n].eq, true],
        ['At t = ' + p.t.toFixed(0) + ' s:', '[A] = ' + Sim.fmt(At, 3) + ' mol dm⁻³, rate = ' + Sim.fmt(r, 3) + ' mol dm⁻³ s⁻¹'],
        ['Successive half-lives', hl.join(' s, ') + ' s']
      ];
    }
  });

  /* ======================================================================
     2. Initial-rates laboratory: find a hidden rate equation
     ====================================================================== */
  function newMystery(s) {
    let a, b;
    do { a = Math.floor(Math.random() * 3); b = Math.floor(Math.random() * 3); } while (a === 0 && b === 0);
    const r0 = [1.2, 2.0, 3.5, 5.0, 6.4][Math.floor(Math.random() * 5)] * 1e-4;
    s.state = { a, b, k: r0 / Math.pow(0.1, a + b), runs: [], count: 0, msg: 'Run some experiments. Change one concentration at a time.', ok: false };
  }
  function labRate(st, A, B) { return st.k * Math.pow(A, st.a) * Math.pow(B, st.b); }
  const pow = (o) => (o === 0 ? '⁰' : o === 1 ? '' : '²');

  Sim.create('#sim-chem-11-lab', {
    title: 'Initial-rates lab: find the rate equation',
    height: (w) => (w >= 600 ? 340 : 360),
    resetButton: false,
    controls: [
      { key: 'A', label: 'Initial [A]', min: 0.1, max: 0.5, step: 0.05, value: 0.1, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'B', label: 'Initial [B]', min: 0.1, max: 0.5, step: 0.05, value: 0.1, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'ga', type: 'select', label: 'Your order in A', value: '?', options: [['?', '?'], ['0', '0'], ['1', '1'], ['2', '2']] },
      { key: 'gb', type: 'select', label: 'Your order in B', value: '?', options: [['?', '?'], ['0', '0'], ['1', '1'], ['2', '2']] },
      { type: 'button', label: 'Run experiment', onClick: (s) => {
        const st = s.state;
        st.count += 1;
        st.runs.push({ n: st.count, A: s.p.A, B: s.p.B, r: labRate(st, s.p.A, s.p.B) });
        if (st.runs.length > 7) st.runs.shift();
        st.msg = 'Experiment ' + st.count + ' done. Compare pairs of runs.';
      } },
      { type: 'button', label: 'Check my orders', onClick: (s) => {
        const st = s.state;
        if (s.p.ga === '?' || s.p.gb === '?') { st.msg = 'Choose an order for both A and B first.'; st.ok = false; return; }
        const ga = +s.p.ga, gb = +s.p.gb;
        if (ga === st.a && gb === st.b) {
          st.ok = true;
          st.msg = 'Correct! rate = k' + (st.a ? '[A]' + pow(st.a) : '') + (st.b ? '[B]' + pow(st.b) : '') + ', overall order ' + (st.a + st.b) + ', k = ' + Sim.fmt(st.k, 3) + ' ' + kUnits(st.a + st.b) + '.';
        } else {
          st.ok = false;
          const bad = [];
          if (ga !== st.a) bad.push('A');
          if (gb !== st.b) bad.push('B');
          st.msg = 'Not yet: your order for ' + bad.join(' and ') + ' does not fit. Find two runs where only that concentration changed, and see what happened to the rate.';
        }
      } },
      { type: 'button', label: 'New reaction', ghost: true, onClick: (s) => { newMystery(s); s.set('ga', '?'); s.set('gb', '?'); } }
    ],
    init(s) { newMystery(s); },
    draw(s) {
      const { ctx, w } = s;
      const st = s.state;
      Sim.text(ctx, 'A + B → products        rate = k[A]' + (st.ok ? pow(st.a) : '?') + '[B]' + (st.ok ? pow(st.b) : '?'), 18, 22, { size: 14, bold: true, color: C.navy });
      const cols = w >= 520 ? [18, 0.2, 0.43, 0.66] : [10, 0.17, 0.42, 0.66];
      const X = [cols[0], w * cols[1], w * cols[2], w * cols[3]];
      Sim.text(ctx, 'Concentrations in mol dm⁻³; rates in mol dm⁻³ s⁻¹', 18, 44, { size: 12, color: C.muted });
      const top = 58, rowH = 34;
      Sim.rect(ctx, 10, top, w - 20, rowH, { fill: C.navy, r: 6 });
      const hdr = ['Exp', '[A] / mol dm⁻³', '[B] / mol dm⁻³', 'Initial rate / mol dm⁻³ s⁻¹'];
      const short = ['Exp', '[A]', '[B]', 'Initial rate'];
      hdr.forEach((t, i) => Sim.text(ctx, w >= 520 ? t : short[i], X[i] + 8, top + rowH / 2, { size: 12.5, bold: true, color: '#fff' }));
      if (!st.runs.length) {
        Sim.text(ctx, 'No experiments yet: set [A] and [B], then press Run experiment.', w / 2, top + rowH + 40, { size: 13, color: C.muted, align: 'center' });
      }
      st.runs.forEach((run, j) => {
        const y = top + rowH * (j + 1);
        if (j % 2 === 1) Sim.rect(ctx, 10, y, w - 20, rowH, { fill: '#f1f3f5' });
        Sim.text(ctx, String(run.n), X[0] + 8, y + rowH / 2, { size: 13.5, color: C.ink });
        Sim.text(ctx, run.A.toFixed(2), X[1] + 8, y + rowH / 2, { size: 13.5, color: C.ink });
        Sim.text(ctx, run.B.toFixed(2), X[2] + 8, y + rowH / 2, { size: 13.5, color: C.ink });
        Sim.text(ctx, sci(run.r, 3), X[3] + 8, y + rowH / 2, { size: 13.5, bold: true, color: C.blue });
      });
    },
    readout: (s) => [[s.state.ok ? '✔' : 'Lab notes', s.state.msg, s.state.ok]]
  });

  /* ======================================================================
     3. Arrhenius plot: activation energy from the gradient of ln k against 1/T
     ====================================================================== */
  const AFAC = 1.0e10;   // Arrhenius constant / s⁻¹
  const kOf = (Ea, T) => AFAC * Math.exp(-Ea * 1000 / (R * T));
  function measure(s, T) {
    const k0 = kOf(s.p.Ea, T);
    const k = s.p.scatter ? k0 * clamp(1 + 0.04 * gaussian(), 0.85, 1.15) : k0;
    s.state.pts.push({ T, k });
    if (s.state.pts.length > 12) s.state.pts.shift();
  }
  function arrLayout(w, h) {
    if (w >= 640) {
      const gw = (w - 74 - 74 - 30) / 2;
      return { a: { x: 66, y: 34, w: gw, h: h - 34 - 48 }, b: { x: 66 + gw + 86, y: 34, w: gw, h: h - 34 - 48 } };
    }
    const gh = (h - 34 - 48 - 74) / 2;
    return { a: { x: 60, y: 34, w: w - 60 - 18, h: gh }, b: { x: 60, y: 34 + gh + 74, w: w - 60 - 18, h: gh } };
  }

  Sim.create('#sim-chem-11-arrhenius', {
    title: 'The Arrhenius plot',
    height: (w) => (w >= 640 ? 380 : 620),
    resetButton: false,
    controls: [
      { key: 'Ea', label: 'Activation energy Eₐ (clears data)', min: 20, max: 120, step: 1, value: 55, unit: 'kJ mol⁻¹', format: (v) => v.toFixed(0), onChange: (s) => { s.state.pts = []; } },
      { key: 'T', label: 'Temperature T', min: 280, max: 360, step: 1, value: 300, unit: 'K', format: (v) => v.toFixed(0) },
      { key: 'scatter', type: 'check', label: 'Experimental scatter (±4%)', value: true },
      { type: 'button', label: 'Measure k at T', onClick: (s) => { measure(s, s.p.T); } },
      { type: 'button', label: 'Measure at 5 temperatures', onClick: (s) => { [290, 305, 320, 335, 350].forEach((T) => measure(s, T)); } },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { s.state.pts = []; } }
    ],
    init(s) { s.state = { pts: [] }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const L = arrLayout(w, h);
      const Ea = p.Ea;
      /* k against T */
      const kTop = kOf(Ea, 370) * 1.05;
      const e = Math.floor(Math.log10(kTop));
      const sc = Math.pow(10, e);
      const g = Sim.graph(ctx, Object.assign({ xmin: 270, xmax: 370, ymin: 0, ymax: niceCeil(kTop / sc), xstep: 20, xlabel: 'T / K', ylabel: 'k / 10' + Sim.sup(e) + ' s⁻¹', title: 'Rate constant against temperature' }, L.a));
      g.axes();
      g.vline(p.T, { color: C.orange });
      g.plot((T) => kOf(Ea, T) / sc, { color: '#a5d8ff', width: 2 });
      s.state.pts.forEach((q) => g.dot(q.T, q.k / sc, { color: C.blue, r: 4.5 }));
      /* ln k against 1/T */
      const y1 = Math.log(kOf(Ea, 370)), y0 = Math.log(kOf(Ea, 270));
      const span = y1 - y0;
      const ymin = Math.floor(y0 - span * 0.08), ymax = Math.ceil(y1 + span * 0.08);
      const gl = Sim.graph(ctx, Object.assign({ xmin: 2.7, xmax: 3.7, ymin, ymax, xstep: 0.2, xlabel: '1/T / 10⁻³ K⁻¹', ylabel: 'ln k', title: 'ln k against 1/T' }, L.b));
      boxAxes(ctx, gl, 0.2, niceStep(ymax - ymin, 5), 1, 0);
      gl.vline(1000 / p.T, { color: C.orange });
      const pts = s.state.pts.map((q) => [1 / q.T, Math.log(q.k)]);
      const fit = fitLine(pts);
      if (fit) gl.plot((x) => fit.m * x / 1000 + fit.c, { color: C.red, width: 2, dash: [6, 4] });
      pts.forEach((q) => gl.dot(q[0] * 1000, q[1], { color: C.blue, r: 4.5 }));
      if (fit) Sim.text(ctx, 'gradient = ' + minus(Sim.fmt(fit.m, 3)) + ' K', gl.x + gl.w - 6, gl.y + 14, { size: 12, bold: true, color: C.red, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      if (!pts.length) Sim.text(ctx, 'Measure k to add points', gl.x + gl.w / 2, gl.y + gl.h / 2, { size: 13, color: C.muted, align: 'center' });
    },
    readout: (s) => {
      const p = s.p;
      const kT = kOf(p.Ea, p.T);
      const pts = s.state.pts.map((q) => [1 / q.T, Math.log(q.k)]);
      const fit = fitLine(pts);
      const rows = [['k at ' + p.T.toFixed(0) + ' K', Sim.fmt(kT, 3) + ' s⁻¹']];
      if (fit) rows.push(['From the graph: Eₐ = −gradient × R =', Sim.fmt(-fit.m * R / 1000, 3) + ' kJ mol⁻¹', true]);
      else rows.push(['Points', pts.length + ' (need at least 2 for a line)']);
      return rows;
    }
  });
})();
