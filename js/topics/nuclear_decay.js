/* Nuclear Decay — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const KB = 1.38e-23, QE = 1.6e-19;
  const MEV_PER_K = KB / QE / 1e6;     // kT in MeV per kelvin
  const LN2 = Math.LN2;

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function poisson(mean) {
    if (!(mean > 0)) return 0;
    if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * gaussian()));
    const L = Math.exp(-mean);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
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
  function errBar(g, x, y, e, color) {
    if (!(e > 0)) return;
    const X = g.px(x), y1 = g.py(y - e), y2 = g.py(y + e);
    Sim.line(g.ctx, X, y1, X, y2, { color: color || C.navy, width: 1.3 });
    Sim.line(g.ctx, X - 4, y1, X + 4, y1, { color: color || C.navy, width: 1.3 });
    Sim.line(g.ctx, X - 4, y2, X + 4, y2, { color: color || C.navy, width: 1.3 });
  }
  /* Small wiggly line for a gamma photon, centred at (x,y) heading along +x. */
  function photon(ctx, x, y, len, color, alpha) {
    ctx.save();
    ctx.strokeStyle = color || C.orange;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const X = x - len / 2 + (len * i) / 12, Y = y + Math.sin(i * 1.6) * 3.5;
      if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ======================================================================
     1. Binding energy per nucleon curve
     ====================================================================== */
  const NUC = [
    [2, 'H-2', 'hydrogen-2 (deuterium)', 1.112], [3, 'H-3', 'hydrogen-3 (tritium)', 2.827], [3, 'He-3', 'helium-3', 2.573],
    [4, 'He-4', 'helium-4', 7.074], [6, 'Li-6', 'lithium-6', 5.332], [7, 'Li-7', 'lithium-7', 5.606], [9, 'Be-9', 'beryllium-9', 6.463],
    [11, 'B-11', 'boron-11', 6.928], [12, 'C-12', 'carbon-12', 7.680], [14, 'N-14', 'nitrogen-14', 7.476], [16, 'O-16', 'oxygen-16', 7.976],
    [19, 'F-19', 'fluorine-19', 7.779], [20, 'Ne-20', 'neon-20', 8.032], [23, 'Na-23', 'sodium-23', 8.112], [24, 'Mg-24', 'magnesium-24', 8.261],
    [27, 'Al-27', 'aluminium-27', 8.332], [28, 'Si-28', 'silicon-28', 8.448], [31, 'P-31', 'phosphorus-31', 8.481], [32, 'S-32', 'sulfur-32', 8.493],
    [35, 'Cl-35', 'chlorine-35', 8.520], [40, 'Ca-40', 'calcium-40', 8.551], [48, 'Ti-48', 'titanium-48', 8.723], [52, 'Cr-52', 'chromium-52', 8.776],
    [56, 'Fe-56', 'iron-56', 8.790], [62, 'Ni-62', 'nickel-62', 8.795], [63, 'Cu-63', 'copper-63', 8.752], [64, 'Zn-64', 'zinc-64', 8.736],
    [84, 'Kr-84', 'krypton-84', 8.717], [88, 'Sr-88', 'strontium-88', 8.733], [92, 'Kr-92', 'krypton-92 (a fission product)', 8.513],
    [98, 'Mo-98', 'molybdenum-98', 8.635], [107, 'Ag-107', 'silver-107', 8.554], [120, 'Sn-120', 'tin-120', 8.505], [130, 'Te-130', 'tellurium-130', 8.430],
    [138, 'Ba-138', 'barium-138', 8.393], [141, 'Ba-141', 'barium-141 (a fission product)', 8.326], [152, 'Sm-152', 'samarium-152', 8.244],
    [166, 'Er-166', 'erbium-166', 8.142], [184, 'W-184', 'tungsten-184', 8.005], [197, 'Au-197', 'gold-197', 7.916], [208, 'Pb-208', 'lead-208', 7.868],
    [209, 'Bi-209', 'bismuth-209', 7.848], [222, 'Rn-222', 'radon-222', 7.695], [226, 'Ra-226', 'radium-226', 7.662], [232, 'Th-232', 'thorium-232', 7.615],
    [235, 'U-235', 'uranium-235', 7.591], [238, 'U-238', 'uranium-238', 7.570]
  ];
  const OFF_CURVE = ['H-3', 'He-3', 'Li-6', 'Kr-92', 'Ba-141'];
  const CURVE = NUC.filter((n) => OFF_CURVE.indexOf(n[1]) < 0);
  const nuc = (sym) => NUC.find((n) => n[1] === sym);
  const REACT = {
    fission: { from: ['U-235'], to: ['Ba-141', 'Kr-92'], eq: 'U-235 + n → Ba-141 + Kr-92 + 3n', color: C.orange },
    fusion: { from: ['H-2', 'H-3'], to: ['He-4'], eq: 'H-2 + H-3 → He-4 + n', color: C.green }
  };
  const totalB = (sym) => { const n = nuc(sym); return n[0] * n[3]; };

  Sim.create('#sim-bepn', {
    title: 'The binding energy per nucleon curve',
    height: (w) => Math.min(440, Math.max(340, w * 0.48)),
    controls: [
      { key: 'show', type: 'select', label: 'Show', value: 'none', options: [['none', 'The whole curve'], ['fission', 'Fission of uranium-235'], ['fusion', 'Fusion of hydrogen-2 and hydrogen-3']] }
    ],
    init(s) { s.state = { hover: null, g: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const zoom = p.show === 'fusion', yzoom = p.show === 'fission';
      const g = Sim.graph(ctx, { x: 54, y: 30, w: w - 54 - 22, h: h - 30 - 42, xmin: 0, xmax: zoom ? 24 : 250, xstep: zoom ? 4 : 50, ymin: yzoom ? 7 : 0, ymax: yzoom ? 9 : 10, ystep: yzoom ? 0.5 : 2, xlabel: 'nucleon number A', ylabel: 'B/A / MeV', title: zoom ? (w < 560 ? 'light nuclei (zoomed in)' : 'binding energy per nucleon (zoomed in on light nuclei)') : yzoom ? (w < 560 ? 'zoomed in: 7 to 9 MeV' : 'binding energy per nucleon (zoomed in: 7 to 9 MeV)') : 'binding energy per nucleon' }).axes();
      st.g = g;
      const narrow = w < 560;
      // regions
      g.clip();
      ctx.fillStyle = 'rgba(47,158,68,0.06)'; ctx.fillRect(g.px(0), g.y, g.px(56) - g.px(0), g.h);
      ctx.fillStyle = 'rgba(240,140,0,0.06)'; ctx.fillRect(g.px(56), g.y, g.px(250) - g.px(56), g.h);
      g.unclip();
      g.path(CURVE.map((n) => [n[0], n[3]]), { color: C.navy, width: 2.6 });
      const inView = (n) => n[0] <= g.xmax && n[3] >= g.ymin && n[3] <= g.ymax;
      NUC.filter(inView).forEach((n) => g.dot(n[0], n[3], { color: OFF_CURVE.indexOf(n[1]) >= 0 ? C.grey : C.navy, r: 3 }));
      const fe = nuc('Fe-56');
      g.dot(fe[0], fe[3], { color: C.red, r: 5.5 });
      if (p.show === 'none') Sim.text(ctx, 'iron-56: most stable', g.px(60), g.py(fe[3]) - 14, { size: 12, bold: true, color: C.red, align: 'left', bg: 'rgba(255,255,255,0.85)' });

      if (p.show === 'none') {
        Sim.arrow(ctx, g.px(8), g.py(3.4), g.px(narrow ? 40 : 34), g.py(6.2), { color: C.green, width: 3 });
        Sim.text(ctx, 'fusion', g.px(narrow ? 30 : 26), g.py(3.0), { size: 13, bold: true, color: C.green, align: 'left' });
        Sim.text(ctx, 'releases energy', g.px(narrow ? 30 : 26), g.py(3.0) + 16, { size: 12, color: C.green, align: 'left' });
        Sim.arrow(ctx, g.px(236), g.py(6.6), g.px(150), g.py(7.4), { color: C.orange, width: 3 });
        Sim.text(ctx, 'fission releases energy', g.px(244), g.py(6.0), { size: 13, bold: true, color: '#b35c00', align: 'right' });
        if (!narrow) Sim.text(ctx, 'He-4', g.px(4), g.py(7.074) - 14, { size: 12, bold: true, color: C.navy, align: 'center', bg: 'rgba(255,255,255,0.85)' });
        Sim.text(ctx, 'U-235', g.px(235), g.py(7.591) + 16, { size: 12, bold: true, color: C.navy, align: 'center' });
      } else {
        const R = REACT[p.show];
        R.from.forEach((a) => R.to.forEach((b) => {
          const A = nuc(a), B = nuc(b);
          Sim.arrow(ctx, g.px(A[0]), g.py(A[3]), g.px(B[0]), g.py(B[3]), { color: R.color, width: 2.5 });
        }));
        R.from.concat(R.to).forEach((sym, k) => {
          const n = nuc(sym);
          g.dot(n[0], n[3], { color: R.color, r: 6 });
          const isTo = R.to.indexOf(sym) >= 0;
          const place = { 'U-235': [-8, 18, 'right'], 'Ba-141': [6, -16, 'left'], 'Kr-92': [-6, -16, 'right'], 'H-2': [12, 0, 'left'], 'H-3': [12, 0, 'left'], 'He-4': [12, -12, 'left'] }[sym];
          Sim.text(ctx, narrow && zoom ? sym : sym + '  ' + n[3].toFixed(2) + ' MeV', g.px(n[0]) + place[0], g.py(n[3]) + place[1], { size: 12, bold: true, color: isTo ? C.navy : R.color, align: place[2], bg: 'rgba(255,255,255,0.85)' });
          void k;
        });
        const before = R.from.reduce((a, sym) => a + totalB(sym), 0), after = R.to.reduce((a, sym) => a + totalB(sym), 0);
        const bx = g.x + g.w * (narrow ? 0.28 : 0.4), by = g.y + g.h * (yzoom ? 0.56 : 0.54);
        const lines = [R.eq, 'total B before = ' + before.toFixed(1) + ' MeV', 'total B after = ' + after.toFixed(1) + ' MeV', 'energy released = ' + (after - before).toFixed(1) + ' MeV'];
        const bw = Math.min(g.x + g.w - 4 - bx, 270);
        Sim.rect(ctx, bx, by, bw, 84, { fill: 'rgba(255,255,255,0.92)', stroke: R.color, width: 1.5, r: 8 });
        lines.forEach((t, i) => Sim.text(ctx, t, bx + 10, by + 15 + i * 19, { size: narrow ? 11.5 : 12.5, bold: i === 0 || i === 3, color: i === 3 ? R.color : C.ink }));
      }

      const hv = st.hover;
      if (hv) {
        const n = hv;
        const X = g.px(n[0]), Y = g.py(n[3]);
        g.vline(n[0], { color: '#ced4da', dash: [3, 4] });
        Sim.circle(ctx, X, Y, 8, { stroke: C.blue, width: 2.5 });
        const lines = [n[2], 'B/A = ' + n[3].toFixed(3) + ' MeV', 'total B = ' + (n[0] * n[3]).toFixed(0) + ' MeV'];
        const tw = Math.max.apply(null, lines.map((t, i) => Sim.measure(ctx, t, { size: 12.5, bold: i === 0 }))) + 18;
        let tx = X + 14, ty = Y + 14;
        if (tx + tw > w - 8) tx = X - 14 - tw;
        if (ty + 66 > g.y + g.h) ty = Y - 80;
        Sim.rect(ctx, tx, ty, tw, 64, { fill: '#fff', stroke: C.blue, width: 1.5, r: 8 });
        lines.forEach((t, i) => Sim.text(ctx, t, tx + 9, ty + 14 + i * 18, { size: 12.5, bold: i === 0, color: i === 0 ? C.navy : C.ink }));
      } else if (p.show === 'none') {
        Sim.text(ctx, narrow ? 'Tap the curve to read a nucleus' : 'Move over the curve to read off a nucleus', g.x + g.w - 4, g.py(3.4), { size: 12, italic: true, color: C.muted, align: 'right' });
      }
    },
    readout(s) {
      const p = s.p, hv = s.state.hover;
      const out = [];
      if (hv) out.push([hv[1] + ':', hv[3].toFixed(2) + ' MeV per nucleon, ' + (hv[0] * hv[3]).toFixed(0) + ' MeV in total']);
      if (p.show !== 'none') {
        const R = REACT[p.show];
        const before = R.from.reduce((a, sym) => a + totalB(sym), 0), after = R.to.reduce((a, sym) => a + totalB(sym), 0);
        const nucleons = R.from.reduce((a, sym) => a + nuc(sym)[0], 0);
        out.push(['energy released =', (after - before).toFixed(1) + ' MeV', true]);
        out.push(['= ', Sim.fmt((after - before) * 1.6e-13, 3) + ' J']);
        out.push(['per nucleon =', ((after - before) / nucleons).toFixed(2) + ' MeV']);
      } else out.push(['peak:', 'iron-56 at 8.79 MeV per nucleon (nickel-62 is a whisker higher)']);
      return out;
    },
    pointer: {
      cursor: 'crosshair',
      touchAction: 'pan-y',
      move(s, pt) {
        const g = s.state.g;
        if (!g || !g.inside(pt.x, pt.y)) { s.state.hover = null; return; }
        let best = null, bd = 1e9;
        NUC.forEach((n) => { if (n[0] > g.xmax || n[3] < g.ymin || n[3] > g.ymax) return; const d = Math.hypot(g.px(n[0]) - pt.x, (g.py(n[3]) - pt.y) * 0.35); if (d < bd) { bd = d; best = n; } });
        s.state.hover = best;
      },
      down(s, pt) { this.move(s, pt); },
      leave(s) { s.state.hover = null; }
    }
  });

  /* ======================================================================
     2. Fusion: nuclei and the Coulomb barrier
     ====================================================================== */
  const KE2 = 1.438;       // e²/4πε₀ in MeV fm
  const R_NUC = 3;         // fm, separation at which the strong force takes over
  const BARRIER = KE2 / R_NUC;
  const RAD = 8;           // px radius of a drawn nucleus
  const visSpeed = (T) => 42 * Math.pow(T / 1e8, 0.18);
  function fusionBox(s) {
    const w = s.w, h = s.h;
    return w >= 700 ? { x: 20, y: 30, w: Math.round(w * 0.44), h: h - 60 } : { x: 14, y: 30, w: w - 28, h: 230 };
  }
  function fusionAdd(s, n) {
    const st = s.state, b = st.box || fusionBox(s);
    const v = visSpeed(Math.pow(10, s.p.lt));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      st.nuc.push({ x: RAD + Math.random() * (b.w - 2 * RAD), y: RAD + Math.random() * (b.h - 2 * RAD), vx: Math.cos(a) * v, vy: Math.sin(a) * v });
    }
  }
  function probAbove(T) {
    const x = BARRIER / (Math.max(T, 1) * MEV_PER_K);
    return { p: Math.exp(-x) * (1 + x), log10: (-x + Math.log(1 + x)) / Math.LN10 };
  }

  Sim.create('#sim-fusion', {
    title: 'Fusion: getting over the Coulomb barrier',
    height: (w) => (w >= 700 ? 370 : 620),
    controls: [
      { key: 'lt', label: 'Temperature T', min: 7, max: 10, step: 0.05, value: 8, format: (v) => Sim.fmt(Math.pow(10, v), 2) + ' K' },
      { key: 'n', label: 'Nuclei in the box (density)', min: 6, max: 40, step: 2, value: 16, format: (v) => v.toFixed(0) }
    ],
    animate: true,
    onChange(s, key) {
      const st = s.state;
      if (key === 'lt') {
        const v = visSpeed(Math.pow(10, s.p.lt));
        st.nuc.forEach((q) => { const sp = Math.hypot(q.vx, q.vy) || 1; q.vx *= v / sp; q.vy *= v / sp; });
      }
      if (key === 'n') {
        const total = st.nuc.length + st.pending;
        if (s.p.n > total) fusionAdd(s, s.p.n - total);
        else { st.nuc.length = Math.max(0, s.p.n - st.pending); }
      }
      st.coll = 0; st.fus = 0; st.time = 0; st.last = null;
    },
    init(s) {
      s.state = { nuc: [], fx: [], coll: 0, fus: 0, time: 0, last: null, pending: 0, box: s.state && s.state.box };
      fusionAdd(s, s.p.n);
    },
    update(s, dt) {
      const st = s.state;
      if (dt <= 0 || !st.box) return;
      const T = Math.pow(10, s.p.lt), kT = T * MEV_PER_K;
      const bw = st.box.w, bh = st.box.h;
      st.time += dt;
      st.nuc.forEach((q) => {
        q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.x < RAD) { q.x = RAD; q.vx = Math.abs(q.vx); }
        if (q.x > bw - RAD) { q.x = bw - RAD; q.vx = -Math.abs(q.vx); }
        if (q.y < RAD) { q.y = RAD; q.vy = Math.abs(q.vy); }
        if (q.y > bh - RAD) { q.y = bh - RAD; q.vy = -Math.abs(q.vy); }
      });
      const dead = new Set();
      for (let i = 0; i < st.nuc.length; i++) {
        if (dead.has(i)) continue;
        for (let j = i + 1; j < st.nuc.length; j++) {
          if (dead.has(j)) continue;
          const a = st.nuc[i], b = st.nuc[j];
          const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
          if (d >= 2 * RAD || d < 1e-6) continue;
          const nx = dx / d, ny = dy / d;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rel >= 0) continue;
          st.coll++;
          let u1 = Math.random(), u2 = Math.random();
          if (u1 < 1e-12) u1 = 1e-12; if (u2 < 1e-12) u2 = 1e-12;
          const E = -kT * Math.log(u1 * u2);
          const fused = E > BARRIER;
          st.last = { E, fused };
          if (fused) {
            st.fus++;
            dead.add(i); dead.add(j);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            st.fx.push({ kind: 'flash', x: mx, y: my, t: 0, life: 0.6 });
            st.fx.push({ kind: 'he', x: mx, y: my, vx: (a.vx + b.vx) / 2, vy: (a.vy + b.vy) / 2, t: 0, life: 1.6 });
            const ang = Math.random() * Math.PI * 2;
            st.fx.push({ kind: 'n', x: mx, y: my, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, t: 0, life: 1.5 });
            st.pending += 2;
            break;
          } else {
            a.vx += rel * nx; a.vy += rel * ny;
            b.vx -= rel * nx; b.vy -= rel * ny;
            const push = (2 * RAD - d) / 2;
            a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
          }
        }
      }
      if (dead.size) st.nuc = st.nuc.filter((_, k) => !dead.has(k));
      st.fx.forEach((f) => { f.t += dt; if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; } });
      const finishedHe = st.fx.filter((f) => f.kind === 'he' && f.t >= f.life).length;
      st.fx = st.fx.filter((f) => f.t < f.life);
      if (finishedHe) { const add = Math.min(st.pending, 2 * finishedHe); st.pending -= add; fusionAdd(s, add); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const box = fusionBox(s);
      if (!st.box || st.box.w !== box.w || st.box.h !== box.h) {
        if (st.box) { const kx = box.w / st.box.w, ky = box.h / st.box.h; st.nuc.forEach((q) => { q.x *= kx; q.y *= ky; }); }
        st.box = { w: box.w, h: box.h };
      }
      const T = Math.pow(10, p.lt);
      Sim.rect(ctx, box.x, box.y, box.w, box.h, { fill: T > 1e9 ? '#fff4e6' : '#f8fbff', stroke: C.axis, width: 2, r: 6 });
      Sim.text(ctx, 'deuterium plasma at ' + Sim.fmt(T, 2) + ' K', box.x, box.y - 13, { size: 12.5, bold: true, color: C.navy });
      ctx.save();
      ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      st.fx.forEach((f) => {
        const X = box.x + f.x, Y = box.y + f.y, k = f.t / f.life;
        if (f.kind === 'flash') Sim.circle(ctx, X, Y, 8 + 30 * k, { fill: 'rgba(255,212,59,' + (0.7 * (1 - k)) + ')' });
        if (f.kind === 'he') { Sim.circle(ctx, X, Y, RAD + 2, { fill: C.green, stroke: '#fff', width: 1.5 }); Sim.text(ctx, 'He', X, Y + 0.5, { size: 10, bold: true, color: '#fff', align: 'center' }); }
        if (f.kind === 'n') Sim.circle(ctx, X, Y, 4, { fill: C.grey });
      });
      st.nuc.forEach((q) => {
        const X = box.x + q.x, Y = box.y + q.y;
        Sim.circle(ctx, X, Y, RAD, { fill: C.red, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, '+', X, Y + 0.5, { size: 12, bold: true, color: '#fff', align: 'center' });
      });
      ctx.restore();

      // potential energy against separation
      const gb = wide ? { x: box.x + box.w + 70, y: 32, w: w - (box.x + box.w + 70) - 22, h: h - 32 - 44 } : { x: 50, y: box.y + box.h + 50, w: w - 50 - 18, h: h - (box.y + box.h + 50) - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 20, ymin: -0.6, ymax: 1.2, ystep: 0.2, xlabel: 'r / fm', ylabel: 'energy / MeV', title: 'energy of two nuclei against separation' }, gb)).axes();
      g.clip();
      ctx.fillStyle = 'rgba(47,158,68,0.12)';
      ctx.fillRect(g.px(0), g.py(0), g.px(R_NUC) - g.px(0), g.py(-0.5) - g.py(0));
      g.unclip();
      g.plot((r) => (r >= R_NUC ? KE2 / r : null), { from: R_NUC, to: 18.5, color: C.red, width: 2.8 });
      g.path([[R_NUC, BARRIER], [R_NUC, -0.5], [0, -0.5]], { color: C.green, width: 2.8 });
      g.label(8, KE2 / 8 + 0.13, 'electrostatic repulsion', { size: 11.5, color: C.red, align: 'left' });
      g.label(0.2, -0.2, 'strong', { size: 11, color: C.green, align: 'left', bold: true });
      g.label(0.2, -0.33, 'force', { size: 11, color: C.green, align: 'left', bold: true });
      g.label(R_NUC + 0.3, BARRIER + 0.06, 'barrier ≈ 0.48 MeV', { size: 11.5, color: C.red, align: 'left' });
      const avg = 1.5 * T * MEV_PER_K;
      if (avg < 1.2) {
        g.hline(avg, { color: C.blue, dash: [6, 4] });
        if (avg > 0.3) g.label(19.8, avg + 0.06, '3/2 kT', { size: 11.5, color: C.blue, align: 'right' });
        else g.label(R_NUC + 0.4, avg + 0.07, '3/2 kT', { size: 11.5, color: C.blue, align: 'left' });
      }
      const L = st.last;
      if (L) {
        const E = Math.min(L.E, 1.15);
        if (L.fused) {
          Sim.arrow(ctx, g.px(19), g.py(E), g.px(0.6), g.py(E), { color: C.green, width: 2.5 });
        } else {
          const rt = KE2 / Math.max(L.E, 1e-9);
          if (rt < 19) {
            Sim.line(ctx, g.px(19), g.py(E), g.px(rt), g.py(E), { color: C.purple, width: 2.2 });
            Sim.arrow(ctx, g.px(rt), g.py(E) + 7, g.px(Math.min(19, rt + 4)), g.py(E) + 7, { color: C.purple, width: 1.8 });
          }
        }
      }
    },
    readout(s) {
      const st = s.state, T = Math.pow(10, s.p.lt);
      const avg = 1.5 * T * MEV_PER_K;
      const pr = probAbove(T);
      const out = [
        ['3/2 kT =', avg < 0.1 ? Sim.fmt(avg * 1000, 3) + ' keV' : Sim.fmt(avg, 3) + ' MeV'],
        ['barrier ≈', BARRIER.toFixed(2) + ' MeV'],
        ['fraction of collisions with enough energy ≈', pr.log10 > -6 ? Sim.fmt(pr.p, 2) : '10' + Sim.sup(Math.round(pr.log10)), true],
        ['collisions:', String(st.coll)],
        ['fusions:', String(st.fus)]
      ];
      if (st.time > 1) out.push(['collisions per second ≈', (st.coll / st.time).toFixed(1)]);
      if (st.last) out.push(st.last.fused ? ['last collision:', 'over the barrier, fused (green arrow)'] : ['last collision: bounced, closest approach =', Sim.fmt(KE2 / Math.max(st.last.E, 1e-9), 2) + ' fm']);
      return out;
    }
  });

  /* ======================================================================
     3. Penetration of alpha, beta and gamma
     ====================================================================== */
  const SRC = {
    a: { name: 'alpha', r2: 60, color: C.red, speed: 150 },
    b: { name: 'beta', r2: 45, color: C.blue, speed: 260 },
    g: { name: 'gamma', r2: 12, color: C.orange, speed: 420 }
  };
  const ABS = { none: { name: 'no absorber', px: 0 }, paper: { name: 'paper', px: 3, col: '#f1f3f5' }, al: { name: 'aluminium 3 mm', px: 8, col: '#ced4da' }, pb: { name: 'lead 25 mm', px: 18, col: '#5c677d' } };
  const BG_RATE = 0.5;
  function transmission(src, abs, d) {
    if (src === 'a') {
      const air = d <= 3.8 ? 1 : d >= 5.2 ? 0 : (5.2 - d) / 1.4;
      return abs === 'none' ? air : 0;
    }
    if (src === 'b') {
      const air = Math.exp(-d / 60);
      return air * ({ none: 1, paper: 0.92, al: 0.01, pb: 0 })[abs];
    }
    return ({ none: 1, paper: 1, al: 0.96, pb: 0.19 })[abs];
  }
  const sourceRate = (p) => SRC[p.src].r2 * Math.pow(2 / p.d, 2) * transmission(p.src, p.abs, p.d);

  Sim.create('#sim-penetrate', {
    title: 'Penetration: α, β and γ',
    height: 240,
    controls: [
      { key: 'src', type: 'select', label: 'Source', value: 'a', options: [['a', 'Alpha (americium-241)'], ['b', 'Beta (strontium-90)'], ['g', 'Gamma (cobalt-60)']] },
      { key: 'abs', type: 'select', label: 'Absorber', value: 'none', options: [['none', 'No absorber'], ['paper', 'Sheet of paper'], ['al', 'Aluminium, 3 mm'], ['pb', 'Lead, 25 mm']] },
      { key: 'd', label: 'Distance from source to GM tube', min: 2, max: 20, step: 0.5, value: 3, unit: 'cm', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    onChange(s) { s.state.counts = 0; s.state.time = 0; s.state.parts = []; },
    init(s) { s.state = { counts: 0, time: 0, parts: [], emit: 0, clicks: [] }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0 || !st.geo) return;
      st.time += dt;
      const n = poisson((sourceRate(p) + BG_RATE) * dt);
      st.counts += n;
      for (let k = 0; k < n; k++) st.clicks.push(0);
      st.clicks = st.clicks.map((c) => c + dt).filter((c) => c < 0.15);
      // visible particles (illustrative, not one per count)
      const G = st.geo;
      st.emit += dt * 26;
      while (st.emit >= 1) {
        st.emit -= 1;
        const ang = (Math.random() - 0.5) * 0.32;
        const q = { x: G.x0, y: G.yc, ang, t: 0, stop: Infinity, dead: -1 };
        if (p.src === 'a') {
          const range = G.x0 + (4.5 + gaussian() * 0.3) * G.pxcm;
          q.stop = p.abs === 'none' ? range : Math.min(range, G.ax);
        } else if (p.src === 'b') {
          if ((p.abs === 'al' || p.abs === 'pb') && Math.random() > (p.abs === 'al' ? 0.01 : 0)) q.stop = G.ax + Math.random() * G.aw;
          else if (p.abs === 'paper' && Math.random() < 0.08) q.stop = G.ax + Math.random() * G.aw;
        } else if (p.abs === 'pb' && Math.random() < 0.81) q.stop = G.ax + Math.random() * G.aw;
        st.parts.push(q);
      }
      const sp = SRC[p.src].speed;
      st.parts.forEach((q) => {
        if (q.dead >= 0) { q.dead += dt; return; }
        const step = sp * dt;
        q.x += step * Math.cos(q.ang);
        q.y += step * Math.sin(q.ang);
        if (p.src === 'b') q.ang += (Math.random() - 0.5) * 0.5;
        q.ang = clamp(q.ang, -0.6, 0.6);
        if (q.x >= q.stop) { q.x = q.stop; q.dead = 0; }
        else if (q.x >= G.xt && q.x < G.xt + 20 && Math.abs(q.y - G.yc) < 15) { q.dead = 0.2; }
      });
      st.parts = st.parts.filter((q) => q.dead < 0.35 && q.x < s.w + 10 && Math.abs(q.y - G.yc) < 120);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const x0 = 48, yc = h * 0.42;
      const pxcm = (w - x0 - 100) / 20;
      const xt = x0 + p.d * pxcm;
      const A = ABS[p.abs];
      const ax = A.px ? Math.max(x0 + 8, x0 + (xt - x0) * 0.45 - A.px / 2) : xt + 1000;
      st.geo = { x0, yc, pxcm, ax, aw: A.px, xt };
      // ruler
      const ry = h - 34;
      Sim.line(ctx, x0, ry, x0 + 20 * pxcm, ry, { color: C.axis, width: 1.2 });
      for (let c = 0; c <= 20; c += 2) {
        const X = x0 + c * pxcm;
        Sim.line(ctx, X, ry, X, ry + 5, { color: C.axis, width: 1 });
        if (c % (pxcm < 14 ? 4 : 2) === 0) Sim.text(ctx, String(c), X, ry + 8, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'cm', x0 + 20 * pxcm + 10, ry + 8, { size: 11, color: C.muted, align: 'left', baseline: 'top' });
      if (p.src === 'a') {
        const X = x0 + 4.5 * pxcm;
        Sim.line(ctx, X, yc - 46, X, ry - 4, { color: 'rgba(224,49,49,0.35)', width: 1.2, dash: [4, 4] });
        Sim.text(ctx, 'α range in air', X + 4, yc - 52, { size: 11, color: C.red, align: 'left' });
      }
      // absorber
      if (A.px) {
        Sim.rect(ctx, ax, yc - 46, A.px, 92, { fill: A.col, stroke: C.axis, width: 1.2 });
        Sim.text(ctx, A.name, ax + A.px / 2, yc - 58, { size: 11.5, bold: true, color: C.ink, align: 'center' });
      }
      // particles
      st.parts.forEach((q) => {
        const alpha = q.dead >= 0 ? 1 - q.dead / 0.35 : 1;
        if (p.src === 'a') {
          for (let k = 1; k <= 4; k++) Sim.circle(ctx, q.x - k * 6, q.y - Math.tan(q.ang) * k * 6, 1.6, { fill: 'rgba(224,49,49,' + 0.25 * alpha + ')' });
          Sim.circle(ctx, q.x, q.y, 4.2, { fill: 'rgba(224,49,49,' + alpha + ')' });
        } else if (p.src === 'b') Sim.circle(ctx, q.x, q.y, 2.6, { fill: 'rgba(0,123,255,' + alpha + ')' });
        else photon(ctx, q.x, q.y, 16, C.orange, alpha);
      });
      // source
      Sim.rect(ctx, x0 - 34, yc - 14, 34, 28, { fill: '#495057', r: 4 });
      Sim.rect(ctx, x0 - 4, yc - 6, 6, 12, { fill: SRC[p.src].color, r: 2 });
      Sim.text(ctx, SRC[p.src].name + ' source', x0 - 34, yc + 30, { size: 11.5, color: C.muted, align: 'left' });
      // GM tube
      const flash = st.clicks.length > 0;
      Sim.rect(ctx, xt, yc - 15, 66, 30, { fill: flash ? '#ffe066' : '#dee2e6', stroke: C.axis, width: 1.5, r: 6 });
      Sim.rect(ctx, xt - 3, yc - 12, 5, 24, { fill: '#868e96', r: 1 });
      Sim.text(ctx, 'GM tube', xt + 33, yc + 0.5, { size: 11.5, bold: true, color: C.ink, align: 'center' });
      // counter
      Sim.rect(ctx, w - 150, 10, 140, 46, { fill: '#212529', r: 6 });
      Sim.text(ctx, String(st.counts).padStart(5, ' ') + ' counts', w - 20, 24, { size: 13, bold: true, color: '#69db7c', align: 'right' });
      Sim.text(ctx, 't = ' + st.time.toFixed(1) + ' s', w - 20, 43, { size: 12.5, color: '#ffd43b', align: 'right' });
    },
    readout(s) {
      const st = s.state;
      const rate = st.time > 0.5 ? st.counts / st.time : 0;
      return [
        ['measured count rate =', st.time > 0.5 ? rate.toFixed(2) + ' s⁻¹' : 'counting…'],
        ['background =', BG_RATE.toFixed(2) + ' s⁻¹'],
        ['corrected count rate =', st.time > 0.5 ? Math.max(0, rate - BG_RATE).toFixed(2) + ' s⁻¹' : '…', true]
      ];
    }
  });

  /* ======================================================================
     4. Core practical 15: gamma absorption by lead
     ====================================================================== */
  const R0_G = 25, MU = 0.066, BG_G = 0.45;
  const gammaRate = (x) => R0_G * Math.exp(-MU * x);
  Sim.create('#sim-cp15', {
    title: 'Virtual experiment: lead absorbing gamma rays',
    height: (w) => (w >= 680 ? 380 : 620),
    controls: [
      { key: 'x', label: 'Lead thickness x', min: 0, max: 40, step: 2, value: 0, unit: 'mm', format: (v) => v.toFixed(0) },
      { key: 'plot', type: 'select', label: 'Graph', value: 'lin', options: [['lin', 'Count rate against x'], ['ln', 'ln(count rate) against x (beyond the spec)']] },
      { key: 'sub', type: 'check', label: 'Subtract background', value: true },
      { type: 'button', label: 'Count for 100 s', onClick: (s) => startCount(s, 'src') },
      { type: 'button', label: 'Measure background (600 s)', ghost: true, onClick: (s) => startCount(s, 'bg') },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.bg = null; s.state.last = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], bg: null, run: null, last: null, phot: [], emit: 0 }; },
    update(s, dt) {
      const st = s.state;
      const r = st.run;
      if (r) {
        const k = r.type === 'bg' ? 120 : 50;
        const dts = Math.min(dt * k, r.dur - r.t);
        r.n += poisson(r.rate * dts);
        r.t += dts;
        if (r.t >= r.dur - 1e-9) {
          if (r.type === 'bg') st.bg = { n: r.n, t: r.dur };
          else { st.data = st.data.filter((q) => q.x !== r.x); st.data.push({ x: r.x, n: r.n, t: r.dur }); st.data.sort((a, b) => a.x - b.x); st.last = { x: r.x, n: r.n, t: r.dur }; }
          st.run = null;
        }
      }
      // photons for the picture
      if (r && r.type === 'src') {
        st.emit += dt * 18;
        while (st.emit >= 1) { st.emit -= 1; st.phot.push({ u: 0, y: (Math.random() - 0.5) * 16, stop: Math.random() < 1 - Math.exp(-MU * r.x) ? 0.35 + Math.random() * 0.3 : 2 }); }
      }
      st.phot.forEach((q) => { q.u += dt * 1.4; });
      st.phot = st.phot.filter((q) => q.u < Math.min(q.stop, 1.05));
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: 300, h } : { x: 0, y: 0, w, h: 200 };
      const yc = sc.y + (wide ? 140 : 96);
      const sx = sc.x + 44, tx = sc.x + sc.w - 92;
      const lw = p.x * 2, lx = (sx + tx) / 2 - lw / 2, lh = wide ? 104 : 80;
      const r = st.run;
      // photons
      st.phot.forEach((q) => photon(ctx, sx + q.u * (tx - sx), yc + q.y, 14, C.orange, 0.9));
      // lead
      if (lw > 0) {
        for (let k = 0; k < p.x / 2; k++) Sim.rect(ctx, lx + k * 4, yc - lh / 2, 4, lh, { fill: k % 2 ? '#6c757d' : '#5c677d' });
        Sim.rect(ctx, lx, yc - lh / 2, lw, lh, { stroke: '#343a40', width: 1.2 });
      }
      Sim.text(ctx, 'lead: ' + p.x + ' mm', (sx + tx) / 2, yc - lh / 2 - 12, { size: 12, bold: true, color: C.ink, align: 'center' });
      // source & tube
      Sim.rect(ctx, sx - 32, yc - 15, 32, 30, { fill: '#495057', r: 4 });
      Sim.rect(ctx, sx - 4, yc - 7, 6, 14, { fill: C.orange, r: 2 });
      Sim.text(ctx, 'Co-60', sx - 16, yc + 28, { size: 11.5, color: C.muted, align: 'center' });
      Sim.rect(ctx, tx, yc - 15, 66, 30, { fill: r && r.type === 'src' ? '#ffe066' : '#dee2e6', stroke: C.axis, width: 1.5, r: 6 });
      Sim.text(ctx, 'GM tube', tx + 33, yc + 0.5, { size: 11.5, bold: true, color: C.ink, align: 'center' });
      // fixed distance
      const dy = yc + lh / 2 + 16;
      Sim.arrow(ctx, (sx + tx) / 2, dy, sx, dy, { color: C.muted, width: 1.3, head: 7 });
      Sim.arrow(ctx, (sx + tx) / 2, dy, tx, dy, { color: C.muted, width: 1.3, head: 7 });
      Sim.text(ctx, 'distance kept fixed', (sx + tx) / 2, dy + 13, { size: 11.5, color: C.muted, align: 'center' });
      // counter
      const cx = wide ? sc.x + (sc.w - 150) / 2 : sc.x + sc.w - 160, cy = wide ? dy + 34 : 6;
      Sim.rect(ctx, cx, cy, 150, 46, { fill: '#212529', r: 6 });
      const shownN = r ? r.n : st.last ? st.last.n : 0;
      const shownT = r ? r.t : st.last ? st.last.t : 0;
      Sim.text(ctx, shownN + ' counts', cx + 140, cy + 15, { size: 13, bold: true, color: '#69db7c', align: 'right' });
      Sim.text(ctx, 't = ' + shownT.toFixed(0) + ' s' + (r ? (r.type === 'bg' ? '  (background)' : '') : ''), cx + 140, cy + 34, { size: 12, color: '#ffd43b', align: 'right' });
      if (r && r.type === 'bg') Sim.text(ctx, 'source locked away', (sx + tx) / 2, yc, { size: 12, italic: true, color: C.muted, align: 'center', bg: 'rgba(255,255,255,0.9)' });

      // graph
      const gb = wide ? { x: sc.w + 56, y: 30, w: w - sc.w - 56 - 22, h: h - 30 - 44 } : { x: 52, y: sc.h + 38, w: w - 52 - 18, h: h - sc.h - 38 - 44 };
      const bgRate = st.bg ? st.bg.n / st.bg.t : null;
      const corr = p.sub && bgRate != null;
      const pts = st.data.map((q) => { const rate = q.n / q.t; return { x: q.x, y: corr ? rate - bgRate : rate, e: Math.sqrt(q.n) / q.t }; });
      if (p.plot === 'lin') {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 42, ymin: 0, ymax: 30, ystep: 5, xstep: 10, xlabel: 'x / mm', ylabel: (corr ? 'corrected ' : '') + 'count rate / s⁻¹', title: 'count rate against lead thickness' }, gb)).axes();
        if (pts.length >= 2) g.path(pts.map((q) => [q.x, q.y]), { color: C.blue, width: 1.8 });
        if (bgRate != null && !corr) { g.hline(bgRate, { color: C.red, dash: [6, 4] }); g.label(41, bgRate + 1.2, 'background', { size: 11.5, color: C.red, align: 'right' }); }
        pts.forEach((q) => { errBar(g, q.x, q.y, q.e); g.dot(q.x, q.y, { color: C.navy, r: 4 }); });
      } else {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 42, ymin: -1, ymax: 4, ystep: 1, xstep: 10, xlabel: 'x / mm', ylabel: 'ln(' + (corr ? 'corrected ' : '') + 'count rate / s⁻¹)', title: 'ln(count rate) against x (beyond the spec)' }, gb)).axes();
        const lp = pts.filter((q) => q.y > 0).map((q) => [q.x, Math.log(q.y)]);
        const fit = fitLine(lp);
        if (fit) g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
        lp.filter((q) => q[1] >= -1).forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4 }));
      }
      if (!st.data.length && !r) Sim.text(ctx, st.bg ? 'Now count at several thicknesses' : 'Start by measuring the background', gb.x + gb.w / 2, gb.y + gb.h * 0.42, { size: 13, italic: true, color: C.muted, align: 'center' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const bgRate = st.bg ? st.bg.n / st.bg.t : null;
      const out = [['background =', bgRate == null ? 'not measured yet' : bgRate.toFixed(2) + ' s⁻¹ (' + st.bg.n + ' counts in 600 s)']];
      if (st.last) {
        const rate = st.last.n / st.last.t;
        out.push(['last: x = ' + st.last.x + ' mm,', st.last.n + ' counts in 100 s']);
        out.push(['count rate =', rate.toFixed(2) + ' ± ' + (Math.sqrt(st.last.n) / st.last.t).toFixed(2) + ' s⁻¹']);
        if (bgRate != null) out.push(['corrected =', (rate - bgRate).toFixed(2) + ' s⁻¹', true]);
      }
      if (p.plot === 'ln') {
        const corr = p.sub && bgRate != null;
        const lp = st.data.map((q) => [q.x, q.n / q.t - (corr ? bgRate : 0)]).filter((q) => q[1] > 0).map((q) => [q[0], Math.log(q[1])]);
        const fit = fitLine(lp);
        if (fit && lp.length >= 3 && fit.m < 0) {
          out.push(['gradient = −μ =', fit.m.toFixed(4) + ' mm⁻¹']);
          out.push(['half-thickness ln 2/μ =', (LN2 / -fit.m).toFixed(1) + ' mm']);
        }
      }
      return out;
    }
  });
  function startCount(s, type) {
    const st = s.state;
    if (st.run) return;
    st.run = type === 'bg' ? { type, t: 0, dur: 600, n: 0, rate: BG_G } : { type, t: 0, dur: 100, n: 0, rate: gammaRate(s.p.x) + BG_G, x: s.p.x };
  }

  /* ======================================================================
     5. Random decay: a grid of nuclei
     ====================================================================== */
  const P_SIX = 1 / 6, LAM_DICE = -Math.log(5 / 6);
  Sim.create('#sim-decay', {
    title: 'Random decay: watch the nuclei',
    height: (w) => (w >= 700 ? 400 : Math.min(w - 32, 300) + 330),
    controls: [
      { key: 'N0', type: 'select', label: 'Starting number N₀', value: '400', options: [['25', '25 nuclei'], ['100', '100 nuclei'], ['400', '400 nuclei'], ['1600', '1600 nuclei']], onChange: (s) => s.reset() },
      { key: 'mode', type: 'select', label: 'Model', value: 'cont', options: [['cont', 'Nuclei with half-life t½'], ['dice', 'Dice: a six means “decayed”']], onChange: (s) => s.reset() },
      { key: 'th', label: 'Half-life t½ (nuclei model)', min: 1, max: 10, step: 0.5, value: 4, unit: 's', format: (v) => v.toFixed(1), onChange: (s) => s.reset() }
    ],
    animate: true,
    init(s) {
      const N0 = +s.p.N0;
      s.state = { alive: new Uint8Array(N0).fill(1), flash: new Float32Array(N0), roll: new Uint8Array(N0), N: N0, t: 0, rec: [[0, N0]], clock: 0, half: null, done: false };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      for (let i = 0; i < st.flash.length; i++) if (st.flash[i] > 0) st.flash[i] = Math.max(0, st.flash[i] - dt);
      if (st.done) return;
      const N0 = +p.N0;
      if (p.mode === 'cont') {
        const lam = LN2 / p.th;
        const pr = 1 - Math.exp(-lam * dt);
        for (let i = 0; i < N0; i++) if (st.alive[i] && Math.random() < pr) { st.alive[i] = 0; st.flash[i] = 0.5; st.N--; }
        st.t += dt;
        st.rec.push([st.t, st.N]);
        if (st.t >= 6 * p.th || st.N === 0) st.done = true;
      } else {
        st.clock += dt;
        if (st.clock >= 0.7) {
          st.clock = 0;
          for (let i = 0; i < N0; i++) {
            if (!st.alive[i]) continue;
            st.roll[i] = 1 + Math.floor(Math.random() * 6);
            if (st.roll[i] === 6) { st.alive[i] = 0; st.flash[i] = 0.6; st.N--; }
          }
          st.t += 1;
          st.rec.push([st.t, st.N]);
          if (st.t >= 24 || st.N === 0) st.done = true;
        }
      }
      if (st.half == null && st.N <= N0 / 2) st.half = st.t;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const N0 = +p.N0, n = Math.round(Math.sqrt(N0));
      const dice = p.mode === 'dice';
      const wide = w >= 700;
      const G = wide ? h - 60 : Math.min(w - 32, 300);
      const gx = wide ? 24 : (w - G) / 2, gy = 32;
      const cell = G / n;
      Sim.rect(ctx, gx - 4, gy - 4, G + 8, G + 8, { fill: '#f8f9fa', r: 6 });
      // decayed
      ctx.fillStyle = '#dee2e6';
      for (let i = 0; i < N0; i++) {
        if (st.alive[i] || st.flash[i] > 0) continue;
        const X = gx + (i % n) * cell, Y = gy + Math.floor(i / n) * cell;
        ctx.fillRect(X + cell * 0.3, Y + cell * 0.3, cell * 0.4, cell * 0.4);
      }
      // undecayed
      ctx.fillStyle = C.blue;
      ctx.beginPath();
      for (let i = 0; i < N0; i++) {
        if (!st.alive[i]) continue;
        const X = gx + (i % n + 0.5) * cell, Y = gy + (Math.floor(i / n) + 0.5) * cell;
        if (dice) { ctx.rect(X - cell * 0.38, Y - cell * 0.38, cell * 0.76, cell * 0.76); }
        else { ctx.moveTo(X + cell * 0.38, Y); ctx.arc(X, Y, cell * 0.38, 0, Math.PI * 2); }
      }
      ctx.fill();
      // just decayed
      for (let i = 0; i < N0; i++) {
        if (st.alive[i] || !(st.flash[i] > 0)) continue;
        const X = gx + (i % n + 0.5) * cell, Y = gy + (Math.floor(i / n) + 0.5) * cell;
        Sim.circle(ctx, X, Y, cell * 0.42, { fill: dice ? C.red : '#ffd43b' });
      }
      if (dice && cell >= 22) {
        for (let i = 0; i < N0; i++) {
          if (!st.roll[i] || (!st.alive[i] && !(st.flash[i] > 0))) continue;
          const X = gx + (i % n + 0.5) * cell, Y = gy + (Math.floor(i / n) + 0.5) * cell;
          Sim.text(ctx, String(st.roll[i]), X, Y + 0.5, { size: Math.min(16, cell * 0.45), bold: true, color: '#fff', align: 'center' });
        }
      }
      Sim.text(ctx, st.N + ' of ' + N0 + ' ' + (dice ? 'dice' : 'nuclei') + ' left', gx, gy - 14, { size: 12.5, bold: true, color: C.navy });

      // graph
      const gb = wide ? { x: gx + G + 70, y: 32, w: w - (gx + G + 70) - 24, h: h - 32 - 44 } : { x: 54, y: gy + G + 50, w: w - 54 - 20, h: h - (gy + G + 50) - 40 };
      const xmax = dice ? 24 : 6 * p.th;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax, ymin: 0, ymax: N0, xlabel: dice ? 'throws' : 't / s', ylabel: 'N', title: 'undecayed nuclei against time' }, gb)).axes();
      const th = dice ? LN2 / LAM_DICE : p.th;
      [1, 2, 3].forEach((k) => {
        if (k * th > xmax) return;
        Sim.line(ctx, g.px(0), g.py(N0 / Math.pow(2, k)), g.px(k * th), g.py(N0 / Math.pow(2, k)), { color: '#ced4da', dash: [4, 4], width: 1.2 });
        Sim.line(ctx, g.px(k * th), g.py(N0 / Math.pow(2, k)), g.px(k * th), g.py(0), { color: '#ced4da', dash: [4, 4], width: 1.2 });
        g.label(k * th, N0 * 0.06, (k === 1 ? '' : k) + 't½', { size: 11, color: C.muted, align: 'left', bold: false });
      });
      g.plot((t) => (dice ? N0 * Math.pow(5 / 6, t) : N0 * Math.exp((-LN2 / p.th) * t)), { color: C.orange, width: 2, dash: [6, 4] });
      if (dice) {
        const pts = [];
        st.rec.forEach((r, i) => { if (i > 0) pts.push([r[0], st.rec[i - 1][1]]); pts.push(r); });
        g.path(pts, { color: C.navy, width: 2.4 });
      } else g.path(st.rec.filter((r, i) => i % 2 === 0 || i === st.rec.length - 1), { color: C.navy, width: 2.4 });
      const last = st.rec[st.rec.length - 1];
      g.dot(last[0], last[1], { color: C.navy });
      g.label(xmax, N0 * 0.93, dice ? 'prediction N₀(5/6)ⁿ' : 'prediction N₀e^(−λt)', { size: 11.5, color: '#b35c00', align: 'right', bold: false });
    },
    readout(s) {
      const st = s.state, p = s.p, N0 = +p.N0;
      if (p.mode === 'dice') {
        return [
          ['throws:', String(st.t)],
          ['dice left N =', String(st.N)],
          ['prediction N₀(5/6)ⁿ =', (N0 * Math.pow(5 / 6, st.t)).toFixed(1)],
          ['chance per throw =', '1/6, so t½ ≈ 3.8 throws'],
          ['throws to halve in this run:', st.half == null ? '…' : String(st.half), true]
        ];
      }
      const lam = LN2 / p.th;
      return [
        ['t =', st.t.toFixed(1) + ' s'],
        ['N =', String(st.N)],
        ['N₀e^(−λt) =', (N0 * Math.exp(-lam * st.t)).toFixed(1)],
        ['λ = ln 2 / t½ =', lam.toFixed(3) + ' s⁻¹'],
        ['activity A = λN ≈', (lam * st.N).toFixed(1) + ' Bq'],
        ['time to halve in this run:', st.half == null ? '…' : st.half.toFixed(1) + ' s', true]
      ];
    }
  });

  /* ======================================================================
     6. Measuring a half-life with a log graph
     ====================================================================== */
  const ISO = { pa: { name: 'protactinium-234m', th: 72 }, rn: { name: 'radon-220', th: 56 } };
  const C0 = 40, BG_L = 0.8, STEP = 10, T_END = 400;
  Sim.create('#sim-lnplot', {
    title: 'Measuring a half-life with a log graph',
    height: (w) => Math.min(420, Math.max(330, w * 0.44)),
    controls: [
      { key: 'iso', type: 'select', label: 'Isotope', value: 'pa', options: [['pa', 'Protactinium-234m'], ['rn', 'Radon-220'], ['x', 'Mystery isotope']], onChange: (s) => { s.state.data = []; s.state.run = null; } },
      { key: 'plot', type: 'select', label: 'Graph', value: 'lin', options: [['lin', 'Count rate against t'], ['ln', 'ln(count rate) against t']] },
      { key: 'sub', type: 'check', label: 'Subtract background (0.80 s⁻¹)', value: true },
      { type: 'button', label: 'Start measuring', onClick: (s) => { s.state.data = []; s.state.run = { t: 0, next: STEP, n: 0 }; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], run: null, mystery: 35 + Math.round(Math.random() * 100) }; },
    update(s, dt) {
      const st = s.state, r = st.run;
      if (!r || dt <= 0) return;
      const th = s.p.iso === 'x' ? st.mystery : ISO[s.p.iso].th;
      const lam = LN2 / th;
      const t1 = Math.min(T_END, r.next, r.t + dt * 50);
      r.n += poisson((C0 / lam) * (Math.exp(-lam * r.t) - Math.exp(-lam * t1)) + BG_L * (t1 - r.t));
      r.t = t1;
      if (r.t >= r.next - 1e-9) { st.data.push({ t: r.next - STEP / 2, n: r.n }); r.n = 0; r.next += STEP; }
      if (r.t >= T_END - 1e-9) st.run = null;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const gb = { x: 60, y: 32, w: w - 60 - 24, h: h - 32 - 44 };
      const pts = st.data.map((q) => ({ t: q.t, y: q.n / STEP - (p.sub ? BG_L : 0) }));
      if (p.plot === 'lin') {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_END, ymin: 0, ymax: 45, ystep: 5, xlabel: 't / s', ylabel: (p.sub ? 'corrected ' : '') + 'count rate / s⁻¹', title: 'count rate against time' }, gb)).axes();
        pts.forEach((q) => g.dot(q.t, q.y, { color: C.navy, r: 4 }));
      } else {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_END, ymin: -1, ymax: 4, ystep: 1, xlabel: 't / s', ylabel: 'ln(' + (p.sub ? 'corrected ' : '') + 'count rate / s⁻¹)', title: 'ln(count rate) against time' }, gb)).axes();
        const lp = pts.filter((q) => q.y > 0).map((q) => [q.t, Math.log(q.y)]);
        const fit = fitLine(lp.filter((q) => q[1] >= 0));
        if (fit && lp.length >= 3) {
          g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
          g.label(T_END * 0.5, fit.m * T_END * 0.5 + fit.c + 0.45, 'gradient = −λ', { size: 12, color: '#b35c00', align: 'left', bg: 'rgba(255,255,255,0.85)' });
        }
        lp.filter((q) => q[1] >= -1).forEach((q) => g.dot(q[0], q[1], { color: q[1] >= 0 ? C.navy : '#adb5bd', r: 4 }));
        if (lp.some((q) => q[1] < 0)) g.label(T_END, -0.75, 'grey points (below 1 s⁻¹) left out of the fit', { size: 11, color: C.muted, align: 'right', bold: false });
      }
      const tNow = st.run ? st.run.t : st.data.length ? T_END : 0;
      Sim.rect(ctx, w - 160, gb.y + 30, 132, 26, { fill: '#212529', r: 5 });
      Sim.text(ctx, 't = ' + tNow.toFixed(0) + ' s', w - 36, gb.y + 43, { size: 13, bold: true, color: '#69db7c', align: 'right' });
      if (!st.data.length && !st.run) Sim.text(ctx, 'Press “Start measuring”', gb.x + gb.w / 2, gb.y + gb.h * 0.45, { size: 13, italic: true, color: C.muted, align: 'center' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const pts = st.data.map((q) => [q.t, q.n / STEP - (p.sub ? BG_L : 0)]).filter((q) => q[1] >= 1).map((q) => [q[0], Math.log(q[1])]);
      const fit = fitLine(pts);
      const out = [['readings (10 s each):', String(st.data.length)]];
      if (fit && pts.length >= 3 && fit.m < 0) {
        out.push(['gradient of ln graph =', fit.m.toFixed(4) + ' s⁻¹']);
        out.push(['λ =', (-fit.m).toFixed(4) + ' s⁻¹']);
        out.push(['t½ = ln 2 / λ =', (LN2 / -fit.m).toFixed(0) + ' s', true]);
      }
      const done = !st.run && st.data.length * STEP >= T_END;
      if (p.iso !== 'x') out.push(['accepted t½ of ' + ISO[p.iso].name + ':', ISO[p.iso].th + ' s']);
      else out.push(['mystery t½:', done ? st.mystery + ' s (revealed)' : 'revealed when the run ends']);
      return out;
    }
  });
})();
