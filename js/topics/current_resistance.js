/* Current, P.D. & Resistance — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const QE = 1.60e-19;

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function fitLine(pts) {
    const n = pts.length;
    if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const d = n * sxx - sx * sx;
    if (Math.abs(d) < 1e-12) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  function timeText(sec) {
    if (!isFinite(sec)) return '—';
    if (sec < 1e-3) return Sim.fmt(sec * 1e6, 3) + ' μs';
    if (sec < 1) return Sim.fmt(sec * 1e3, 3) + ' ms';
    if (sec < 120) return Sim.fmt(sec, 3) + ' s';
    if (sec < 7200) return Sim.fmt(sec / 60, 3) + ' minutes';
    return Sim.fmt(sec / 3600, 3) + ' hours';
  }

  /* ---------- circuit symbols (centred at x, y, horizontal) ---------- */
  const INK = C.ink;
  function symResistor(ctx, x, y) { Sim.rect(ctx, x - 22, y - 8, 44, 16, { fill: '#fff', stroke: INK, width: 2 }); }
  function symLamp(ctx, x, y) {
    Sim.circle(ctx, x, y, 12, { fill: '#fff', stroke: INK, width: 2 });
    const d = 8.5;
    Sim.line(ctx, x - d, y - d, x + d, y + d, { color: INK, width: 2 });
    Sim.line(ctx, x - d, y + d, x + d, y - d, { color: INK, width: 2 });
  }
  function symThermistor(ctx, x, y) {
    symResistor(ctx, x, y);
    Sim.line(ctx, x - 16, y + 14, x + 18, y - 14, { color: INK, width: 1.8 });
    Sim.line(ctx, x - 26, y + 14, x - 16, y + 14, { color: INK, width: 1.8 });
  }
  function symDiode(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 10); ctx.lineTo(x + 8, y); ctx.lineTo(x - 10, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    Sim.line(ctx, x + 9, y - 11, x + 9, y + 11, { color: INK, width: 2.5 });
  }
  function symMeter(ctx, x, y, letter) {
    Sim.circle(ctx, x, y, 13, { fill: '#fff', stroke: INK, width: 2 });
    Sim.text(ctx, letter, x, y + 1, { size: 14, bold: true, align: 'center', color: INK });
  }
  function symSupply(ctx, x, y) {
    Sim.line(ctx, x - 4, y - 14, x - 4, y + 14, { color: INK, width: 2 });
    Sim.line(ctx, x + 4, y - 7, x + 4, y + 7, { color: INK, width: 4 });
    Sim.arrow(ctx, x - 16, y + 14, x + 16, y - 16, { color: INK, width: 1.5, head: 7 });
  }

  /* ======================================================================
     1. Drift velocity in a wire with a narrow section
     ====================================================================== */
  const MATS = {
    cu: { name: 'Copper (metal)', n: 8.5e28, dens: 0.5, fill: '#f6d2b4', edge: '#c17a45' },
    ge: { name: 'Germanium (semiconductor)', n: 2.0e19, dens: 0.035, fill: '#d0d8e4', edge: '#7d8b9c' }
  };
  function driftGeom(s) {
    const st = s.state, p = s.p;
    const key = [s.w, p.A1, p.A2, p.mat].join('|');
    if (st.g && st.g.key === key) return st.g;
    const xL = 14, xR = s.w - 14, W = xR - xL;
    const xa = xL + 0.33 * W, xb = xa + 0.06 * W, xc = xL + 0.61 * W, xd = xc + 0.06 * W;
    const area = (x) => {
      if (x <= xa || x >= xd) return p.A1;
      if (x >= xb && x <= xc) return p.A2;
      const k = x < xb ? (x - xa) / (xb - xa) : (xd - x) / (xd - xc);
      return p.A1 + (p.A2 - p.A1) * k;
    };
    const U = [0];
    for (let x = xL + 1; x <= xR; x++) U.push(U[U.length - 1] + area(x - 0.5));
    const total = U[U.length - 1];
    const g = { key, xL, xR, W, xa, xb, xc, xd, area, U, total, s1: xL + 0.15 * W, s2: (xb + xc) / 2 };
    g.u1 = U[Math.round(g.s1 - xL)];
    g.u2 = U[Math.round(g.s2 - xL)];
    st.g = g;
    const m = MATS[p.mat];
    const N = Math.min(1800, Math.round(m.dens * total));
    st.dots = [];
    for (let i = 0; i < N; i++) st.dots.push({ u: Math.random() * total, r: (Math.random() * 2 - 1) * 0.82, j: Math.random() * 6.28 });
    st.c1 = []; st.c2 = [];
    return g;
  }
  function xOfU(g, u) {
    const U = g.U;
    let lo = 0, hi = U.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (U[mid] < u) lo = mid; else hi = mid; }
    const f = (u - U[lo]) / Math.max(1e-9, U[hi] - U[lo]);
    return g.xL + lo + f;
  }

  Sim.create('#sim-drift', {
    title: 'Drift velocity in a wire: I = nqvA',
    height: (w) => (w < 560 ? 262 : 250),
    controls: [
      { key: 'mat', type: 'select', label: 'Material', value: 'cu', options: [['cu', 'Copper (metal)'], ['ge', 'Germanium (semiconductor)']] },
      { key: 'I', label: 'Current I', min: 0.2, max: 3, step: 0.1, value: 1, unit: 'A', format: (v) => v.toFixed(1) },
      { key: 'A1', label: 'Thick section area A₁', min: 0.5, max: 3, step: 0.1, value: 2, unit: 'mm²', format: (v) => v.toFixed(1) },
      { key: 'A2', label: 'Middle section area A₂', min: 0.5, max: 3, step: 0.1, value: 0.8, unit: 'mm²', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    init(s) { s.state = { t: 0, dots: [], c1: [], c2: [] }; },
    update(s, dt) {
      const st = s.state;
      if (!st.g || dt <= 0) return;
      const g = driftGeom(s);
      st.t += dt;
      const minA = Math.min(s.p.A1, s.p.A2);
      const s0 = Math.min(40 * s.p.I, 240 * minA);
      st.capped = 40 * s.p.I > 240 * minA;
      const du = s0 * dt;
      for (const d of st.dots) {
        const u0 = d.u;
        let u = u0 - du;
        if (u0 >= g.u1 && u < g.u1) st.c1.push(st.t);
        if (u0 >= g.u2 && u < g.u2) st.c2.push(st.t);
        if (u < 0) u += g.total;
        d.u = u;
      }
      while (st.c1.length && st.c1[0] < st.t - 2) st.c1.shift();
      while (st.c2.length && st.c2[0] < st.t - 2) st.c2.shift();
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const g = driftGeom(s);
      const m = MATS[p.mat];
      const cy = 112;
      const hv = (x) => 9 * g.area(x);
      // the wire
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(g.xL, cy - hv(g.xL));
      for (let x = g.xL; x <= g.xR; x += 2) ctx.lineTo(x, cy - hv(x));
      for (let x = g.xR; x >= g.xL; x -= 2) ctx.lineTo(x, cy + hv(x));
      ctx.closePath();
      ctx.fillStyle = m.fill;
      ctx.fill();
      ctx.strokeStyle = m.edge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      // electrons
      ctx.fillStyle = C.navy;
      const t = st.t || 0;
      for (const d of st.dots) {
        const x = xOfU(g, d.u);
        const y = cy + d.r * hv(x) + Math.sin(t * 9 + d.j) * 0.8;
        ctx.fillRect(x - 1.4, y - 1.4, 2.8, 2.8);
      }
      // counting slices
      [g.s1, g.s2].forEach((x) => Sim.line(ctx, x, cy - hv(x) - 7, x, cy + hv(x) + 7, { color: C.orange, width: 2.5, dash: [4, 3] }));
      const v1 = p.I / (m.n * QE * p.A1 * 1e-6), v2 = p.I / (m.n * QE * p.A2 * 1e-6);
      const r1 = (st.c1.length / 2).toFixed(0), r2 = (st.c2.length / 2).toFixed(0);
      const fs = w < 560 ? 11.5 : 12.5;
      Sim.text(ctx, m.name + ':  n = ' + Sim.fmt(m.n, 2) + ' m⁻³', g.xL, 14, { size: 13, bold: true, color: C.navy });
      const top = cy - hv(g.s1) - 50;
      Sim.text(ctx, 'A₁ = ' + p.A1.toFixed(1) + ' mm²   v₁ = ' + Sim.fmt(v1, 3) + ' m s⁻¹', g.xL, top, { size: fs, color: C.ink, bold: true });
      Sim.text(ctx, 'dots crossing this line: ' + r1 + ' per s', g.xL, top + 17, { size: fs, color: '#b35c00' });
      const bot = cy + Math.max(hv(g.s2), hv(g.xR)) + 22;
      Sim.text(ctx, 'A₂ = ' + p.A2.toFixed(1) + ' mm²   v₂ = ' + Sim.fmt(v2, 3) + ' m s⁻¹', g.s2, bot, { size: fs, color: C.ink, bold: true, align: 'center' });
      Sim.text(ctx, 'dots crossing this line: ' + r2 + ' per s', g.s2, bot + 17, { size: fs, color: '#b35c00', align: 'center' });
      // direction labels
      const ay = s.h - 32;
      Sim.text(ctx, 'current I', g.xL, ay, { size: 12, color: C.red, bold: true });
      Sim.arrow(ctx, g.xL + 62, ay, g.xL + 122, ay, { color: C.red, width: 2.5, head: 9 });
      Sim.arrow(ctx, g.xR - 100, ay, g.xR - 160, ay, { color: C.navy, width: 2.5, head: 9 });
      Sim.text(ctx, 'electron drift', g.xR, ay, { size: 12, color: C.navy, bold: true, align: 'right' });
      Sim.text(ctx, 'to +', g.xL, cy + hv(g.xL) + 14, { size: 11.5, color: C.muted, bold: true });
      Sim.text(ctx, 'to −', g.xR, cy + hv(g.xR) + 14, { size: 11.5, color: C.muted, bold: true, align: 'right' });
      Sim.text(ctx, 'Dot density and speed not to scale between materials' + (st.capped ? ' (speed capped)' : ''), w / 2, s.h - 10, { size: 11, color: C.muted, italic: true, align: 'center' });
    },
    readout(s) {
      const m = MATS[s.p.mat];
      const v1 = s.p.I / (m.n * QE * s.p.A1 * 1e-6), v2 = s.p.I / (m.n * QE * s.p.A2 * 1e-6);
      const out = [
        ['v₁ = I/(nqA₁) =', Sim.fmt(v1, 3) + ' m s⁻¹'],
        ['v₂ = I/(nqA₂) =', Sim.fmt(v2, 3) + ' m s⁻¹'],
        ['v₂ / v₁ = A₁ / A₂ =', (s.p.A1 / s.p.A2).toFixed(2), true],
        ['time to drift 1 m (thick part):', timeText(1 / v1)],
        ['current in both sections:', s.p.I.toFixed(1) + ' A']
      ];
      if (s.p.mat === 'ge') out.push(['note:', 'a drift this fast is unrealistic, so with a normal p.d. the current in germanium is far smaller']);
      return out;
    }
  });

  /* ======================================================================
     2. I–V characteristic tracer
     ====================================================================== */
  const T0 = 293;
  const lampR = (T) => 1.53 * Math.pow(T / T0, 1.2);
  const lampLoss = (T) => 2e-4 * (T - T0) + 3.5e-14 * (Math.pow(T, 4) - Math.pow(T0, 4));
  function lampState(V) {
    if (Math.abs(V) < 1e-6) return { I: 0, T: T0 };
    let lo = T0, hi = 3600;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if ((V * V) / lampR(mid) - lampLoss(mid) > 0) lo = mid; else hi = mid;
    }
    const T = (lo + hi) / 2;
    return { I: V / lampR(T), T };
  }
  const ntcR = (T) => 220 * Math.exp(3500 * (1 / T - 1 / 298.15));
  function ntcState(V, TambC) {
    const Ta = TambC + 273.15;
    const f = (T) => T - Ta - (30 * V * V) / ntcR(T);
    let lo = Ta, hi = null;
    for (let T = Ta; T <= Ta + 150; T += 0.5) { if (f(T) >= 0) { hi = T; break; } lo = T; }
    if (hi == null) return { I: V / ntcR(Ta + 150), T: Ta + 150 };
    for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (f(mid) >= 0) hi = mid; else lo = mid; }
    const T = (lo + hi) / 2;
    return { I: V / ntcR(T), T };
  }
  const D_IS = 1e-9, D_NVT = 1.7 * 0.02585, D_RS = 1;
  const diodeI = (Vd) => D_IS * (Math.exp(Math.min(Vd / D_NVT, 60)) - 1);
  function diodeState(V) {
    let lo = Math.min(0, V), hi = Math.max(0, V);
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (mid + diodeI(mid) * D_RS - V > 0) hi = mid; else lo = mid;
    }
    return { I: diodeI((lo + hi) / 2) };
  }
  const COMPS = {
    res: { name: 'Fixed resistor (47 Ω)', vmin: -6, vmax: 6, imin: -150, imax: 150, v0: 4 },
    lamp: { name: 'Filament lamp (6 V, 0.3 A)', vmin: -6, vmax: 6, imin: -350, imax: 350, v0: 4 },
    ntc: { name: 'NTC thermistor', vmin: -5, vmax: 5, imin: -100, imax: 100, v0: 4 },
    diode: { name: 'Silicon diode', vmin: -3, vmax: 1, imin: -40, imax: 200, v0: 0.75 }
  };
  function stateOf(comp, V, Tamb) {
    if (comp === 'res') return { I: V / 47 };
    if (comp === 'lamp') return lampState(V);
    if (comp === 'ntc') return ntcState(V, Tamb);
    return diodeState(V);
  }
  let ivCache = { key: '', pts: [] };
  function ivCurve(comp, Tamb) {
    const key = comp + '|' + Tamb;
    if (ivCache.key === key) return ivCache.pts;
    const c = COMPS[comp];
    const pts = [];
    const n = 240;
    for (let i = 0; i <= n; i++) {
      const V = c.vmin + ((c.vmax - c.vmin) * i) / n;
      pts.push([V, stateOf(comp, V, Tamb).I * 1000]);
    }
    ivCache = { key, pts };
    return pts;
  }

  Sim.create('#sim-iv', {
    title: 'I–V characteristic tracer',
    height: (w) => (w >= 700 ? 350 : 590),
    controls: [
      {
        key: 'comp', type: 'select', label: 'Component', value: 'lamp',
        options: Object.keys(COMPS).map((k) => [k, COMPS[k].name]),
        onChange: (s, v) => {
          const c = COMPS[v];
          const el = s.controls.V.el;
          el.min = c.vmin; el.max = c.vmax; el.step = v === 'diode' ? 0.01 : 0.05;
          s.state.sweep = null;
          s.set('V', c.v0);
        }
      },
      { key: 'V', label: 'p.d. across the component V', min: -6, max: 6, step: 0.05, value: 4, unit: 'V', format: (v) => v.toFixed(2) },
      { key: 'Tamb', label: 'Thermistor surroundings', min: 0, max: 50, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'tan', type: 'check', label: 'Show the tangent (common mistake)', value: false },
      {
        type: 'button', label: 'Sweep the p.d.', onClick: (s) => {
          const c = COMPS[s.p.comp];
          s.state.sweep = true;
          s.set('V', c.vmin);
          s.play();
        }
      }
    ],
    animate: true,
    autoplay: false,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { sweep: null }; },
    update(s, dt) {
      if (!s.state.sweep) { s.pause(); return; }
      const c = COMPS[s.p.comp];
      const V = s.p.V + ((c.vmax - c.vmin) / 4) * dt;
      if (V >= c.vmax) { s.set('V', c.vmax); s.state.sweep = null; s.pause(); return; }
      s.set('V', V);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const c = COMPS[p.comp];
      const st0 = stateOf(p.comp, p.V, p.Tamb);
      const ImA = st0.I * 1000;
      const wide = w >= 700;

      /* circuit */
      const bx = 0, by = 0, bw = wide ? Math.round(w * 0.36) : w, bh = wide ? h : 210;
      const x0 = bx + 34, x1 = bx + bw - 34, yT = by + 44, yB = by + bh - (wide ? 110 : 76);
      const cx = (x0 + x1) / 2;
      Sim.polyline(ctx, [[x0, yT], [x1, yT], [x1, yB], [x0, yB], [x0, yT]], { color: INK, width: 2, close: true });
      const yV = yB + 44;
      Sim.polyline(ctx, [[cx - 46, yB], [cx - 46, yV], [cx + 46, yV], [cx + 46, yB]], { color: INK, width: 2 });
      Sim.circle(ctx, cx - 46, yB, 3, { fill: INK });
      Sim.circle(ctx, cx + 46, yB, 3, { fill: INK });
      Sim.rect(ctx, cx - 14, yT - 16, 28, 32, { fill: '#fff' });
      symSupply(ctx, cx, yT);
      Sim.text(ctx, 'variable supply', cx, yT - 26, { size: 11.5, color: C.muted, align: 'center' });
      symMeter(ctx, x0, (yT + yB) / 2, 'A');
      symMeter(ctx, cx, yV, 'V');
      if (p.comp === 'res') symResistor(ctx, cx, yB);
      else if (p.comp === 'lamp') symLamp(ctx, cx, yB);
      else if (p.comp === 'ntc') symThermistor(ctx, cx, yB);
      else symDiode(ctx, cx, yB);
      if (p.comp === 'lamp') {
        const glow = Sim.clamp((st0.T - 900) / 1700, 0, 1);
        if (glow > 0) Sim.circle(ctx, cx, yB, 12 + 14 * glow, { fill: 'rgba(255,212,59,' + (0.45 * glow).toFixed(2) + ')' });
        symLamp(ctx, cx, yB);
      }
      Sim.text(ctx, 'I = ' + Sim.fmt(ImA, 3) + ' mA', x0 + 20, (yT + yB) / 2, { size: 13, bold: true, color: C.blue });
      Sim.text(ctx, 'V = ' + p.V.toFixed(2) + ' V', cx, yV + 26, { size: 13, bold: true, color: C.blue, align: 'center' });
      if (p.V < 0) Sim.text(ctx, 'supply connections reversed', cx, yT + 26, { size: 11.5, color: C.red, align: 'center', italic: true });

      /* graph */
      const gb = wide ? { x: bw + 56, y: 34, w: w - bw - 56 - 20, h: h - 34 - 74 } : { x: 56, y: bh + 30, w: w - 56 - 18, h: h - bh - 30 - 72 };
      const g = Sim.graph(ctx, Object.assign({ xmin: c.vmin, xmax: c.vmax, ymin: c.imin, ymax: c.imax, xlabel: 'V / V', ylabel: 'I / mA', title: 'I–V characteristic: ' + c.name.replace(/ \(.*\)/, '') }, gb)).axes();
      const pts = ivCurve(p.comp, p.Tamb);
      g.path(pts, { color: C.navy, width: 2.8 });
      // chord from the origin through the point: its gradient is I/V = 1/R
      if (Math.abs(p.V) > 0.02 && Math.abs(ImA) > 1e-3) g.path([[0, 0], [p.V * 1.15, ImA * 1.15]], { color: C.orange, width: 2.5 });
      const ly = g.y + g.h + 34;
      Sim.line(ctx, g.x - 30, ly, g.x - 10, ly, { color: C.orange, width: 2.5 });
      Sim.text(ctx, 'line from origin: gradient I/V = 1/R', g.x - 4, ly, { size: 12, bold: true, color: '#b35c00' });
      if (p.tan) {
        const hstep = (c.vmax - c.vmin) / 400;
        const slope = ((stateOf(p.comp, p.V + hstep, p.Tamb).I - stateOf(p.comp, p.V - hstep, p.Tamb).I) * 1000) / (2 * hstep);
        const span = (c.vmax - c.vmin) * 0.22;
        g.path([[p.V - span, ImA - slope * span], [p.V + span, ImA + slope * span]], { color: C.purple, width: 2, dash: [6, 4] });
        Sim.line(ctx, g.x - 30, ly + 19, g.x - 10, ly + 19, { color: C.purple, width: 2, dash: [6, 4] });
        Sim.text(ctx, 'tangent: its gradient is not 1/R', g.x - 4, ly + 19, { size: 12, bold: true, color: C.purple });
      }
      g.dot(p.V, ImA, { color: C.red, r: 6 });
    },
    readout(s) {
      const p = s.p;
      const st = stateOf(p.comp, p.V, p.Tamb);
      const R = Math.abs(st.I) > 1e-15 ? p.V / st.I : Infinity;
      const out = [['V =', p.V.toFixed(2) + ' V'], ['I =', Sim.fmt(st.I * 1000, 3) + ' mA'], ['R = V/I =', Math.abs(p.V) < 0.02 ? '— (choose V ≠ 0)' : Sim.fmt(R, 3) + ' Ω', true]];
      if (p.tan) {
        const c = COMPS[p.comp], hstep = (c.vmax - c.vmin) / 400;
        const slope = (stateOf(p.comp, p.V + hstep, p.Tamb).I - stateOf(p.comp, p.V - hstep, p.Tamb).I) / (2 * hstep);
        out.push(['1 / (tangent gradient) =', (Math.abs(slope) > 1e-15 ? Sim.fmt(1 / slope, 3) + ' Ω' : '—') + ' (not R)']);
      }
      if (p.comp === 'lamp') out.push(['filament temperature ≈', Math.round(st.T) + ' K']);
      if (p.comp === 'ntc') out.push(['thermistor temperature ≈', (st.T - 273.15).toFixed(1) + ' °C']);
      return out;
    }
  });

  /* ======================================================================
     3. Core practical 7: resistivity rig
     ====================================================================== */
  const WIRES = {
    con: { name: 'Constantan wire', rho: 4.9e-7, d: 0.274e-3, col: '#b08d57' },
    nic: { name: 'Nichrome wire', rho: 1.1e-6, d: 0.376e-3, col: '#868e96' }
  };
  const CONTACT = 0.35;
  const meanOf = (a) => a.reduce((x, y) => x + y, 0) / a.length;

  Sim.create('#sim-cp7', {
    title: 'Virtual experiment: resistivity of a wire',
    height: (w) => (w >= 640 ? 380 : 540),
    controls: [
      { key: 'wire', type: 'select', label: 'Wire', value: 'con', options: [['con', 'Constantan wire'], ['nic', 'Nichrome wire']], onChange: (s) => { s.state.data = []; s.state.dias = []; s.state.last = null; } },
      { key: 'l', label: 'Length between the clips l', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'contact', type: 'check', label: 'Contact resistance at the clips (systematic error)', value: false },
      { type: 'button', label: 'Measure R', onClick: (s) => measureR(s) },
      { type: 'button', label: 'Measure diameter', onClick: (s) => measureD(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.dias = []; s.state.last = null; } }
    ],
    init(s) { s.state = { data: [], dias: [], last: null, drag: false }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wr = WIRES[p.wire];
      const wide = w >= 640;
      const rx0 = 34, rx1 = w - 30;
      const X = (l) => rx0 + l * (rx1 - rx0);
      st.rx = [rx0, rx1];
      // metre rule and wire
      const ry = 58;
      Sim.rect(ctx, rx0 - 10, ry, rx1 - rx0 + 20, 24, { fill: '#f8e7b5', stroke: '#c9a227', width: 1, r: 3 });
      for (let i = 0; i <= 20; i++) {
        const x = X(i / 20);
        Sim.line(ctx, x, ry, x, ry + (i % 2 ? 6 : 10), { color: '#7a5c00', width: 1 });
        if (i % 2 === 0 && (wide || i % 4 === 0)) Sim.text(ctx, (i / 20).toFixed(1) + (i === 20 ? ' m' : ''), x, ry + 16, { size: 11, color: '#5c4500', align: i === 20 ? 'right' : 'center' });
      }
      Sim.line(ctx, X(0) - 6, ry - 8, X(1) + 6, ry - 8, { color: wr.col, width: 2.5 });
      // multimeter and micrometer panels
      const mw = wide ? 170 : (w - 44) / 2, mh = 76;
      const mx = 16, my = 108;
      const dx = wide ? 16 : mx + mw + 12, dy = wide ? my + mh + 18 : my;
      Sim.rect(ctx, mx, my, mw, mh, { fill: '#343a40', r: 8 });
      Sim.rect(ctx, mx + 10, my + 10, mw - 20, 34, { fill: '#d8f5a2', r: 4 });
      Sim.text(ctx, st.last ? st.last.R.toFixed(2) + ' Ω' : '- - - Ω', mx + mw - 18, my + 27, { size: 18, bold: true, color: '#212529', align: 'right' });
      Sim.text(ctx, 'ohmmeter', mx + mw / 2, my + 60, { size: 11.5, color: '#dee2e6', align: 'center', bold: true });
      // leads from the meter to the clips
      const clipY = ry - 8;
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = C.red;
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(mx + 6, my + 6); ctx.lineTo(8, my + 6); ctx.lineTo(8, clipY - 4); ctx.lineTo(X(0) - 6, clipY - 4); ctx.stroke();
      ctx.strokeStyle = '#212529';
      ctx.beginPath(); ctx.moveTo(mx + mw - 22, my); ctx.bezierCurveTo(mx + mw - 22, my - 40, X(p.l), clipY + 60, X(p.l), clipY + 6); ctx.stroke();
      ctx.restore();
      const clip = (x, col) => {
        Sim.rect(ctx, x - 7, clipY - 14, 14, 20, { fill: col, r: 3 });
        Sim.line(ctx, x - 7, clipY - 2, x + 7, clipY - 2, { color: '#fff', width: 1 });
      };
      clip(X(0), C.red);
      clip(X(p.l), '#212529');
      Sim.text(ctx, '↔', X(p.l), clipY - 24, { size: 14, color: C.muted, align: 'center', bold: true });
      Sim.arrow(ctx, X(0) + 8, 18, X(p.l) - 4, 18, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, 'l = ' + p.l.toFixed(2) + ' m', (X(0) + X(p.l)) / 2, 8, { size: 12, color: C.green, bold: true, align: 'center' });
      // micrometer panel
      Sim.rect(ctx, dx, dy, mw, mh, { fill: '#eef3ff', stroke: '#c5d0e0', width: 1, r: 8 });
      Sim.text(ctx, 'micrometer', dx + 10, dy + 14, { size: 11.5, bold: true, color: C.navy });
      const dl = st.dias.length;
      Sim.text(ctx, dl ? 'd = ' + st.dias[dl - 1].toFixed(2) + ' mm' : 'no readings yet', dx + 10, dy + 36, { size: 15, bold: true, color: C.ink });
      if (dl) Sim.text(ctx, 'mean of ' + dl + ': ' + meanOf(st.dias).toFixed(3) + ' mm', dx + 10, dy + 58, { size: 11.5, color: C.muted });

      // graph of R against l
      const gb = wide ? { x: mx + mw + 64, y: 120, w: w - mx - mw - 64 - 20, h: h - 120 - 34 } : { x: 52, y: my + mh + 40, w: w - 52 - 18, h: h - my - mh - 40 - 30 };
      const ymax = Math.ceil(((wr.rho / (Math.PI * wr.d * wr.d / 4)) * 1.0 + 0.6) * 1.1);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 1.05, ymin: 0, ymax, xlabel: 'l / m', ylabel: 'R / Ω', title: 'R against l' }, gb)).axes();
      const fit = fitLine(st.data);
      if (fit && st.data.length >= 3) {
        g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
        Sim.text(ctx, 'gradient = ρ / A', g.px(0.62) + 8, g.py(fit.m * 0.62 + fit.c) + 16, { size: 12, color: '#b35c00', bold: true });
      }
      st.data.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!st.data.length) Sim.text(ctx, 'Set a length, then press “Measure R”', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 12.5, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state, wr = WIRES[s.p.wire];
      const out = [['readings:', String(st.data.length)]];
      const fit = fitLine(st.data);
      const dl = st.dias.length;
      let A = null;
      if (dl) {
        const d = meanOf(st.dias) * 1e-3;
        A = (Math.PI * d * d) / 4;
        out.push(['A = πd²/4 =', Sim.fmt(A, 3) + ' m²']);
      } else out.push(['diameter:', 'not measured yet']);
      if (fit && st.data.length >= 3) {
        out.push(['gradient =', fit.m.toFixed(2) + ' Ω m⁻¹'], ['intercept =', fit.c.toFixed(2) + ' Ω']);
        if (A) {
          const rho = fit.m * A;
          out.push(['ρ = gradient × A =', Sim.fmt(rho, 3) + ' Ω m', true]);
          if (st.data.length >= 5 && dl >= 3) out.push(['accepted value:', Sim.fmt(wr.rho, 2) + ' Ω m (' + (((rho - wr.rho) / wr.rho) * 100).toFixed(1) + '%)']);
        }
      } else if (st.data.length) out.push(['take at least 3 readings', 'to fit a line']);
      return out;
    },
    pointer: {
      touchAction: 'pan-y',
      cursor: 'grab',
      down(s, pt) {
        const st = s.state;
        if (!st.rx) return;
        const x = st.rx[0] + s.p.l * (st.rx[1] - st.rx[0]);
        st.drag = Math.abs(pt.x - x) < 24 && pt.y < 100;
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const l = Sim.clamp(Math.round(((pt.x - st.rx[0]) / (st.rx[1] - st.rx[0])) * 100) / 100, 0.1, 1);
        s.set('l', l);
      },
      up(s) { s.state.drag = false; }
    }
  });
  function measureR(s) {
    const wr = WIRES[s.p.wire];
    const A = (Math.PI * wr.d * wr.d) / 4;
    const Rt = (wr.rho * s.p.l) / A + 0.04 + (s.p.contact ? CONTACT : 0);
    const R = Math.round((Rt + gaussian() * (0.02 + 0.004 * Rt)) * 100) / 100;
    s.state.data.push([s.p.l, R]);
    s.state.last = { R };
  }
  function measureD(s) {
    const wr = WIRES[s.p.wire];
    const d = Math.round((wr.d * 1e3 + gaussian() * 0.004) * 100) / 100;
    s.state.dias.push(d);
  }

  /* ======================================================================
     4. Lattice model: metal, NTC thermistor and LDR
     ====================================================================== */
  const Rmetal = (T) => 10 * (1 + 0.0039 * (T - 20));
  const Rntc = (T) => 2200 * Math.exp(3900 * (1 / (T + 273.15) - 1 / 298.15));
  const Rldr = (L) => 400 * Math.pow(1000 / (L * 10 + 0.05), 0.75);
  function nFree(p) {
    if (p.mat === 'metal') return 44;
    if (p.mat === 'ntc') return Math.round(3 + (44 * Rntc(100)) / Rntc(p.T));
    return Math.round(3 + (44 * Rldr(100)) / Rldr(p.L));
  }
  function ohms(R) {
    if (R >= 1e6) return Sim.fmt(R / 1e6, 3) + ' MΩ';
    if (R >= 1e3) return Sim.fmt(R / 1e3, 3) + ' kΩ';
    return Sim.fmt(R, 3) + ' Ω';
  }

  Sim.create('#sim-lattice', {
    title: 'Lattice model: metal, thermistor and LDR',
    height: (w) => (w >= 640 ? 310 : 520),
    controls: [
      { key: 'mat', type: 'select', label: 'Material', value: 'metal', options: [['metal', 'Metal wire (copper)'], ['ntc', 'NTC thermistor'], ['ldr', 'LDR']] },
      { key: 'T', label: 'Temperature', min: -20, max: 100, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'L', label: 'Light level (LDR)', min: 0, max: 100, step: 1, value: 20, unit: '%', format: (v) => v.toFixed(0) }
    ],
    animate: true,
    init(s) { s.state = { t: 0, el: [], col: 0, colRate: 0, drift: 0 }; },
    update(s, dt) {
      const st = s.state, b = st.box;
      if (!b || dt <= 0) return;
      st.t += dt;
      const want = nFree(s.p);
      while (st.el.length < want) {
        const i = Math.floor(Math.random() * b.nx), j = Math.floor(Math.random() * b.ny);
        const a = Math.random() * 6.283;
        st.el.push({ x: b.x + b.sp * (i + 0.5) + 10, y: b.y + b.sp * (j + 0.5), vx: 80 * Math.cos(a), vy: 80 * Math.sin(a), born: st.t });
      }
      if (st.el.length > want) st.el.splice(want);
      const amp = 1.2 + (6.5 * (s.p.T + 20)) / 120;
      const rc = 6 + amp;
      let hits = 0, sumVx = 0;
      for (const e of st.el) {
        e.vx = Math.max(-230, e.vx - 140 * dt); // the field accelerates electrons to the left between collisions
        if (Math.random() < 0.5 * dt) { const a = Math.random() * 6.283; e.vx = 80 * Math.cos(a); e.vy = 80 * Math.sin(a); } // impurity scattering
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.y < b.y + 4) { e.y = b.y + 4; e.vy = Math.abs(e.vy); }
        if (e.y > b.y + b.h - 4) { e.y = b.y + b.h - 4; e.vy = -Math.abs(e.vy); }
        if (e.x < b.x) e.x += b.w;
        if (e.x > b.x + b.w) e.x -= b.w;
        const i = Math.round((e.x - b.x) / b.sp - 0.5), j = Math.round((e.y - b.y) / b.sp - 0.5);
        if (i >= 0 && i < b.nx && j >= 0 && j < b.ny) {
          const ion = ionPos(b, i, j, st.t, amp);
          const ddx = e.x - ion[0], ddy = e.y - ion[1], dd = Math.hypot(ddx, ddy);
          if (dd < rc && dd > 1e-6) {
            const a = Math.random() * 6.283;
            e.vx = 80 * Math.cos(a);
            e.vy = 80 * Math.sin(a);
            e.x = ion[0] + (ddx / dd) * (rc + 0.5);
            e.y = ion[1] + (ddy / dd) * (rc + 0.5);
            hits++;
          }
        }
        sumVx += e.vx;
      }
      const n = Math.max(1, st.el.length);
      const k = Math.min(1, dt * 0.8);
      st.colRate += ((hits / n / dt) - st.colRate) * k;
      st.drift += ((-sumVx / n) - st.drift) * k;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const sp = wide ? 40 : 34;
      const bw0 = wide ? Math.round(w * 0.55) - 24 : w - 24;
      const nx = Math.max(4, Math.floor(bw0 / sp)), ny = wide ? Math.floor((h - 60) / sp) : 6;
      const b = { x: 12, y: 30, w: nx * sp, h: ny * sp, sp, nx, ny };
      if (!st.box || st.box.w !== b.w || st.box.h !== b.h) st.el = [];
      st.box = b;
      const amp = 1.2 + (6.5 * (p.T + 20)) / 120;
      const heat = (p.T + 20) / 120;
      Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: 'rgb(' + Math.round(240 + 15 * heat) + ',' + Math.round(244 - 30 * heat) + ',' + Math.round(250 - 60 * heat) + ')', stroke: '#c5d0e0', width: 1, r: 6 });
      if (p.mat === 'ldr' && p.L > 0) Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: 'rgba(255,224,102,' + (0.45 * p.L / 100).toFixed(2) + ')', r: 6 });
      const title = p.mat === 'metal' ? 'Copper: lattice ions + free electrons' : p.mat === 'ntc' ? 'NTC thermistor (semiconductor)' : 'LDR (semiconductor) in ' + (p.L < 5 ? 'darkness' : p.L + '% light');
      Sim.text(ctx, title, b.x, 14, { size: 13, bold: true, color: C.navy });
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
        const q = ionPos(b, i, j, st.t || 0, amp);
        Sim.circle(ctx, q[0], q[1], 7.5, { fill: '#ffc9c9', stroke: C.red, width: 1.5 });
        Sim.text(ctx, '+', q[0], q[1] + 0.5, { size: 11, bold: true, color: C.red, align: 'center' });
      }
      for (const e of st.el) {
        const young = st.t - e.born < 0.4;
        Sim.circle(ctx, e.x, e.y, young ? 5 : 3.2, { fill: young ? C.green : C.blue });
      }
      Sim.arrow(ctx, b.x + b.w - 8, b.y + b.h + 14, b.x + b.w - 78, b.y + b.h + 14, { color: C.blue, width: 2, head: 8 });
      Sim.text(ctx, 'electron drift', b.x + b.w - 86, b.y + b.h + 14, { size: 11.5, color: C.blue, align: 'right' });
      Sim.text(ctx, 'free electrons: ' + st.el.length, b.x, b.y + b.h + 14, { size: 12, bold: true, color: C.ink });

      // graph
      const gb = wide ? { x: b.x + b.w + 62, y: 34, w: w - b.x - b.w - 62 - 18, h: h - 34 - 34 } : { x: 56, y: b.y + b.h + 56, w: w - 56 - 18, h: h - b.y - b.h - 56 - 30 };
      if (p.mat === 'ldr') {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 100, ymin: 2, ymax: 6, xstep: 25, ystep: 1, ticks: false, xlabel: 'light level / %', ylabel: 'R (log scale)', title: 'LDR: R against light level' }, gb)).axes();
        ['100 Ω', '1 kΩ', '10 kΩ', '100 kΩ', '1 MΩ'].forEach((lab, i) => Sim.text(ctx, lab, g.x - 6, g.py(2 + i), { size: 11, color: C.muted, align: 'right' }));
        [0, 25, 50, 75, 100].forEach((v) => Sim.text(ctx, String(v), g.px(v), g.py(2) + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' }));
        g.plot((x) => Math.log10(Rldr(x)), { color: C.navy, width: 2.6 });
        g.dot(p.L, Math.log10(Rldr(p.L)), { color: C.red, r: 6 });
      } else {
        const ntc = p.mat === 'ntc';
        const g = Sim.graph(ctx, Object.assign({ xmin: -20, xmax: 100, ymin: 0, ymax: ntc ? 24 : 15, xstep: 20, xlabel: 'T / °C', ylabel: ntc ? 'R / kΩ' : 'R / Ω', title: ntc ? 'NTC thermistor: R against T' : 'Metal: R against T' }, gb)).axes();
        const f = ntc ? (x) => Rntc(x) / 1000 : Rmetal;
        g.plot(f, { color: C.navy, width: 2.6 });
        g.dot(p.T, f(p.T), { color: C.red, r: 6 });
      }
    },
    readout(s) {
      const p = s.p, st = s.state;
      const R = p.mat === 'metal' ? Rmetal(p.T) : p.mat === 'ntc' ? Rntc(p.T) : Rldr(p.L);
      const why = p.mat === 'metal' ? 'same n, more collisions: R rises with T' : p.mat === 'ntc' ? 'n rises steeply with T: R falls' : 'more light frees more electrons: R falls';
      return [
        ['free electrons shown:', String(nFree(p))],
        ['collisions per electron per second ≈', st.colRate.toFixed(1)],
        ['R =', ohms(R), true],
        ['model:', why]
      ];
    }
  });
  function ionPos(b, i, j, t, amp) {
    const ph = i * 1.7 + j * 2.3;
    return [b.x + b.sp * (i + 0.5) + amp * Math.sin(t * 13 + ph), b.y + b.sp * (j + 0.5) + amp * Math.cos(t * 11 + ph * 1.3)];
  }

  /* The shared .tag style is nowrap, so the long derivation badge overflows on phones. */
  const wrapTags = () => document.querySelectorAll('.derive-head .tag').forEach((t) => { t.style.whiteSpace = 'normal'; });
  wrapTags();
  document.addEventListener('DOMContentLoaded', wrapTags);
})();
