/* Astrophysics & Cosmology — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const H_PL = 6.63e-34, CL = 3.0e8, KB = 1.38e-23, SIGMA = 5.67e-8, WIEN = 2.898e-3;
  const SPACE = '#0b1d4d';
  const MPC = 3.09e22, YEAR = 3.15e7;

  /* ---------- shared helpers ---------- */
  function rng(seed) {
    let x = seed || 1;
    return () => (x = (x * 16807) % 2147483647) / 2147483647;
  }
  function gauss(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function stars(ctx, x0, y0, w, h, n, seed) {
    const r = rng(seed);
    for (let i = 0; i < n; i++) {
      const px = x0 + r() * w, py = y0 + r() * h, rad = 0.4 + r() * 1.1, a = 0.25 + r() * 0.55;
      Sim.circle(ctx, px, py, rad, { fill: 'rgba(255,255,255,' + a.toFixed(2) + ')' });
    }
  }
  function wrap(ctx, str, x, y, maxW, lh, o) {
    const words = str.split(' ');
    let line = '', yy = y;
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (line && Sim.measure(ctx, test, o) > maxW) { Sim.text(ctx, line, x, yy, o); line = wd; yy += lh; } else line = test;
    }
    if (line) Sim.text(ctx, line, x, yy, o);
    return yy;
  }
  /* approximate colour of a black body (sRGB) */
  const BB = [[1000, [255, 56, 0]], [1500, [255, 109, 0]], [2000, [255, 137, 18]], [2500, [255, 161, 72]], [3000, [255, 180, 107]], [3500, [255, 196, 137]], [4000, [255, 209, 163]], [4500, [255, 219, 186]], [5000, [255, 228, 206]], [5500, [255, 236, 224]], [6000, [255, 243, 239]], [6500, [255, 249, 253]], [7000, [245, 243, 255]], [8000, [227, 233, 255]], [9000, [214, 225, 255]], [10000, [204, 219, 255]], [12000, [191, 211, 255]], [15000, [179, 204, 255]], [20000, [168, 197, 255]], [30000, [159, 191, 255]], [40000, [155, 188, 255]], [60000, [150, 185, 255]]];
  function starRGB(T) {
    T = Sim.clamp(T, 1000, 60000);
    for (let i = 1; i < BB.length; i++) {
      if (T <= BB[i][0]) {
        const a = BB[i - 1], b = BB[i], f = (T - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map((k) => Math.round(Sim.lerp(a[1][k], b[1][k], f)));
      }
    }
    return BB[BB.length - 1][1];
  }
  function starColor(T, alpha) {
    const c = starRGB(T);
    return alpha == null ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + alpha + ')';
  }
  function colourName(T) {
    if (T < 3700) return 'red';
    if (T < 5200) return 'orange';
    if (T < 6000) return 'yellow-white';
    if (T < 7500) return 'white';
    if (T < 10000) return 'bluish white';
    return 'blue-white';
  }
  function glowStar(ctx, x, y, r, T) {
    ctx.save();
    const g = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.2);
    g.addColorStop(0, starColor(T, 0.9));
    g.addColorStop(0.45, starColor(T, 0.35));
    g.addColorStop(1, starColor(T, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    Sim.circle(ctx, x, y, r, { fill: starColor(T) });
  }
  const tidy = (T) => (T >= 10000 ? Math.round(T / 100) * 100 : Math.round(T / 10) * 10).toLocaleString('en-GB').replace(/,/g, ' ');

  /* ======================================================================
     1. Black-body spectrum
     ====================================================================== */
  function planck(lamM, T) {
    if (lamM <= 0 || T <= 0) return 0;
    const x = (H_PL * CL) / (lamM * KB * T);
    if (x > 700) return 0;
    return 1 / (Math.pow(lamM, 5) * (Math.exp(x) - 1));
  }
  const BREF = planck(WIEN / 6000, 6000);
  const bbRel = (nm, T) => planck(nm * 1e-9, T) / BREF;

  Sim.create('#sim-blackbody', {
    title: 'Black-body radiation curves',
    height: (w) => (w >= 700 ? 390 : 540),
    controls: [
      { key: 'T', label: 'Surface temperature T', min: 2500, max: 12000, step: 100, value: 5800, unit: 'K', format: (v) => tidy(v) },
      { key: 'ref', type: 'check', label: 'Show 3000 K, 4500 K and 6000 K for comparison', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const T = p.T;
      const wide = w >= 700;
      const panel = wide ? { x: w - 214, y: 14, w: 200, h: h - 28 } : { x: 0, y: 0, w, h: 130 };
      const gb = wide ? { x: 62, y: 30, w: w - 214 - 62 - 34, h: h - 30 - 44 } : { x: 56, y: 130 + 34, w: w - 56 - 18, h: h - 130 - 34 - 44 };
      const peakRel = Math.pow(T / 6000, 5);
      const ymax = Math.max(1, peakRel) * 1.15;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2500, ymin: 0, ymax, xstep: 500, xlabel: 'λ / nm', ylabel: 'intensity (relative)' }, gb));
      g.ticks = true;
      g.axes();
      // visible band
      for (let nm = 380; nm < 750; nm += 4) {
        const x1 = g.px(nm), x2 = g.px(nm + 4);
        Sim.rect(ctx, x1, g.y, x2 - x1 + 0.6, g.h, { fill: Sim.spectrum(nm + 2, 0.12) });
        Sim.rect(ctx, x1, g.y + g.h - 9, x2 - x1 + 0.6, 9, { fill: Sim.spectrum(nm + 2, 0.95) });
      }
      const lb = { size: 11.5, align: 'center', bold: true, bg: 'rgba(255,255,255,0.8)', pad: 2 };
      Sim.text(ctx, 'UV', g.px(wide ? 190 : 230), g.y + g.h - 18, Object.assign({ color: C.purple }, lb));
      Sim.text(ctx, 'visible', g.px(565), g.y + g.h - 20, Object.assign({ color: C.ink }, lb));
      Sim.text(ctx, 'infrared', g.px(wide ? 1850 : 1650), g.y + g.h - 18, Object.assign({ color: C.red }, lb));
      if (p.ref) {
        [3000, 4500, 6000].forEach((Tr) => {
          g.plot((nm) => bbRel(nm, Tr), { from: 20, to: 2500, color: C.grey, width: 1.5, dash: [5, 4] });
          const lm = (WIEN / Tr) * 1e9, pk = bbRel(lm, Tr);
          if (g.py(pk) > g.y + 12 && pk > 0.06 * ymax && Math.abs(lm - (WIEN / T) * 1e9) > 250) g.label(lm + 30, pk + ymax * 0.03, Sim.fmt(Tr, 4) + ' K', { size: 11.5, color: C.muted, align: 'left', bold: false });
        });
      }
      // Wien locus through the peaks
      g.plot((nm) => Math.pow((WIEN / (nm * 1e-9)) / 6000, 5), { from: 200, to: 2500, color: C.purple, width: 1.4, dash: [2, 4] });
      Sim.text(ctx, 'dotted purple line: every peak lies on it (Wien’s law)', g.x + g.w - 6, wide ? g.y + 12 : g.y - 18, { size: 11.5, color: C.purple, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      // this star
      g.fill((nm) => bbRel(nm, T), 20, 2500, { color: 'rgba(224,49,49,0.13)', samples: 200 });
      g.plot((nm) => bbRel(nm, T), { from: 20, to: 2500, color: C.red, width: 3 });
      const lmax = (WIEN / T) * 1e9;
      g.vline(lmax, { color: C.red, dash: [4, 4], width: 1.2 });
      g.dot(lmax, peakRel, { color: C.red, label: 'λmax = ' + Sim.fmt(lmax, 3) + ' nm', dx: 10, dy: -4 });

      // star panel
      Sim.rect(ctx, panel.x, panel.y, panel.w, panel.h, { fill: SPACE, r: wide ? 10 : 0 });
      stars(ctx, panel.x, panel.y, panel.w, panel.h, 30, 17);
      const sx = wide ? panel.x + panel.w / 2 : panel.x + 70, sy = wide ? panel.y + 80 : panel.y + panel.h / 2;
      glowStar(ctx, sx, sy, 26, T);
      const tx = wide ? panel.x + panel.w / 2 : panel.x + 150, al = wide ? 'center' : 'left';
      const ty = wide ? panel.y + 160 : panel.y + 30;
      Sim.text(ctx, tidy(T) + ' K', tx, ty, { size: 16, bold: true, color: '#fff', align: al });
      Sim.text(ctx, 'looks ' + colourName(T), tx, ty + 22, { size: 13, color: '#dbe4ff', align: al });
      const rel = Math.pow(T / 5800, 4);
      const bx = wide ? panel.x + 20 : tx, bw = wide ? panel.w - 40 : Math.min(panel.w - tx - 16, 220), by = ty + 48;
      Sim.text(ctx, 'power per m² ∝ T⁴', bx, by, { size: 12, color: '#dbe4ff' });
      Sim.rect(ctx, bx, by + 10, bw, 10, { fill: 'rgba(255,255,255,0.15)', r: 5 });
      Sim.rect(ctx, bx, by + 10, bw * Sim.clamp(rel / 19, 0.004, 1), 10, { fill: starColor(T), r: 5 });
      Sim.text(ctx, Sim.fmt(rel, 3) + ' × the Sun', bx, by + 34, { size: 12, color: '#fff', bold: true });
    },
    readout(s) {
      const T = s.p.T;
      const lmax = WIEN / T;
      return [
        ['T =', tidy(T) + ' K'],
        ['λmax = 2.898 × 10⁻³ ÷ T =', Sim.fmt(lmax * 1e9, 3) + ' nm', true],
        ['power per m² σT⁴ =', Sim.fmt(SIGMA * Math.pow(T, 4), 3) + ' W m⁻²'],
        ['compared with a 5800 K star (T/5800)⁴ =', Sim.fmt(Math.pow(T / 5800, 4), 3), true]
      ];
    }
  });

  /* ======================================================================
     2. Trigonometric parallax
     ====================================================================== */
  const BGSTARS = (() => { const r = rng(91); const a = []; for (let i = 0; i < 26; i++) a.push([r(), r(), 0.8 + r() * 1.6]); return a; })();
  Sim.create('#sim-parallax', {
    title: 'Parallax: a nearby star shifts against distant ones',
    height: (w) => (w >= 700 ? 390 : 520),
    controls: [
      { key: 'd', label: 'Distance to the star d', min: 1.3, max: 50, step: 0.1, value: 4, unit: 'pc', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    init(s) { s.state = { th: Math.PI / 2 }; },
    update(s, dt) { s.state.th = (s.state.th + (2 * Math.PI * dt) / 6) % (2 * Math.PI); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const th = s.state.th;
      const wide = w >= 700;
      const A = wide ? { x: 0, y: 0, w: Math.round(w * 0.56), h } : { x: 0, y: 0, w, h: 300 };
      const V = wide ? { x: A.w + 14, y: 40, w: w - A.w - 28, h: h - 100 } : { x: 14, y: 336, w: w - 28, h: h - 336 - 46 };
      /* top-down diagram */
      Sim.rect(ctx, A.x, A.y, A.w, A.h, { fill: '#f3f6fb' });
      const R0 = Math.min(62, A.w * 0.14);
      const cx = A.x + A.w / 2, cy = A.y + A.h - R0 - 26;
      const bandY = A.y + 30;
      const Dmin = 2.0 * R0, Dmax = cy - bandY - 46;
      const f = Math.log(p.d / 1.3) / Math.log(50 / 1.3);
      const D = Dmin + (Dmax - Dmin) * Sim.clamp(f, 0, 1);
      const sx = cx, sy = cy - D;
      // background stars band
      Sim.rect(ctx, A.x, A.y, A.w, bandY + 14, { fill: SPACE });
      BGSTARS.forEach((q) => Sim.circle(ctx, A.x + q[0] * A.w, A.y + 6 + q[1] * (bandY + 2), q[2] * 0.8, { fill: '#fff' }));
      Sim.text(ctx, 'very distant stars', A.x + 10, A.y + bandY + 2, { size: 11.5, color: '#dbe4ff' });
      // orbit, Sun, positions six months apart
      Sim.circle(ctx, cx, cy, R0, { stroke: C.grey, width: 1.2, dash: [4, 4] });
      Sim.circle(ctx, cx, cy, 9, { fill: '#ffd43b', stroke: '#f08c00', width: 1.5 });
      const pA = [cx + R0, cy], pB = [cx - R0, cy];
      const ext = (P) => { const k = (bandY + 8 - P[1]) / (sy - P[1]); return [P[0] + (sx - P[0]) * k, bandY + 8]; };
      [pA, pB].forEach((P) => { const e = ext(P); Sim.line(ctx, P[0], P[1], e[0], e[1], { color: C.blue, width: 1.2, dash: [5, 4], alpha: 0.7 }); });
      Sim.line(ctx, cx, cy, sx, sy, { color: C.ink, width: 1, dash: [3, 3] });
      Sim.line(ctx, cx, cy, pA[0], pA[1], { color: C.green, width: 2 });
      Sim.text(ctx, '1 AU', (cx + pA[0]) / 2, cy + 12, { size: 12, color: C.green, bold: true, align: 'center' });
      Sim.text(ctx, 'd', cx - 9, (cy + sy) / 2, { size: 14, color: C.ink, bold: true, italic: true, align: 'right' });
      // angle p at the star
      const angDown = Math.PI / 2, angA = Math.atan2(pA[1] - sy, pA[0] - sx);
      Sim.arc(ctx, sx, sy, 26, angA, angDown, { color: C.red, width: 2, label: 'p', labelGap: 10, bold: true });
      [pA, pB].forEach((P, i) => {
        Sim.circle(ctx, P[0], P[1], 6, { stroke: C.navy, width: 1.5, fill: '#fff' });
        Sim.text(ctx, i ? 'July' : 'January', P[0] + (i ? -10 : 10), P[1] + 22, { size: 11.5, color: C.navy, bold: true, align: i ? 'right' : 'left' });
      });
      // the Earth, moving, and its line of sight
      const E = [cx + R0 * Math.cos(th), cy - R0 * Math.sin(th) * 0.999];
      const eE = ext(E);
      Sim.line(ctx, E[0], E[1], eE[0], eE[1], { color: C.orange, width: 2 });
      Sim.circle(ctx, E[0], E[1], 7, { fill: C.blue, stroke: '#fff', width: 1.5 });
      Sim.circle(ctx, eE[0], eE[1], 4.5, { fill: C.orange, stroke: '#fff', width: 1 });
      glowStar(ctx, sx, sy, 6, 4500);
      Sim.text(ctx, 'nearby star', sx + 12, sy - 4, { size: 12, color: C.ink, bold: true });
      Sim.circle(ctx, A.x + 14, A.y + A.h - 12, 5, { fill: C.blue });
      Sim.text(ctx, wide ? 'Earth, moving round its orbit' : 'Earth (moving)', A.x + 24, A.y + A.h - 12, { size: 11.5, color: C.blue, bold: true });
      Sim.text(ctx, wide ? 'not to scale: angles hugely exaggerated' : 'angles exaggerated', A.x + A.w - 8, A.y + A.h - 12, { size: 11.5, color: C.muted, align: 'right', italic: true });

      /* telescope view */
      Sim.text(ctx, 'view through the telescope', V.x + V.w / 2, V.y - 14, { size: 13, color: C.navy, bold: true, align: 'center' });
      Sim.rect(ctx, V.x, V.y, V.w, V.h, { fill: '#050b24', r: 10 });
      BGSTARS.forEach((q, i) => { if (i % 2 === 0) Sim.circle(ctx, V.x + 10 + q[1] * (V.w - 20), V.y + 10 + q[0] * (V.h - 20), q[2] * 0.7, { fill: 'rgba(255,255,255,0.85)' }); });
      const K = (0.4 * V.w) * 1.3; // px per arcsecond
      const pArc = 1 / p.d;
      const vx = V.x + V.w / 2, vy = V.y + V.h / 2;
      const off = -K * pArc * Math.cos(th);
      Sim.line(ctx, vx - K * pArc, vy, vx + K * pArc, vy, { color: 'rgba(255,192,120,0.55)', width: 2 });
      [-1, 1].forEach((sg) => Sim.line(ctx, vx + sg * K * pArc, vy - 7, vx + sg * K * pArc, vy + 7, { color: '#ffc078', width: 2 }));
      glowStar(ctx, vx + off, vy, 5, 4500);
      Sim.text(ctx, 'shift = 2p', vx, vy + 22, { size: 12, color: '#ffc078', bold: true, align: 'center' });
      const bar = K * 0.5;
      Sim.line(ctx, V.x + 14, V.y + V.h - 14, V.x + 14 + bar, V.y + V.h - 14, { color: '#dbe4ff', width: 2 });
      Sim.text(ctx, '0.5 arcsec', V.x + 20 + bar, V.y + V.h - 14, { size: 11.5, color: '#dbe4ff' });
    },
    readout(s) {
      const d = s.p.d, pArc = 1 / d;
      return [
        ['parallax angle p =', Sim.fmt(pArc, 3) + ' arcsec'],
        ['d = 1/p =', d.toFixed(1) + ' pc', true],
        ['=', Sim.fmt(d * 3.26, 3) + ' light-years'],
        ['=', Sim.fmt(d * 3.09e16, 3) + ' m'],
        ['total shift over six months 2p =', Sim.fmt(2 * pArc, 3) + ' arcsec']
      ];
    }
  });

  /* ======================================================================
     3 & 4. The Hertzsprung–Russell diagram (shared drawing)
     ====================================================================== */
  const HRB = { lt0: Math.log10(50000), lt1: Math.log10(2000), ll0: -5, ll1: 7 };
  const LOG_TSUN = Math.log10(5800);
  const MS_TAB = [[3.415, -3.3], [3.491, -2.1], [3.585, -1.15], [3.643, -0.85], [3.724, -0.4], [3.763, 0], [3.863, 0.8], [3.991, 1.7], [4.188, 2.9], [4.477, 4.7], [4.623, 5.7]];
  function msL(lt) {
    if (lt <= MS_TAB[0][0]) return MS_TAB[0][1];
    for (let i = 1; i < MS_TAB.length; i++) {
      if (lt <= MS_TAB[i][0]) { const a = MS_TAB[i - 1], b = MS_TAB[i]; return a[1] + ((lt - a[0]) / (b[0] - a[0])) * (b[1] - a[1]); }
    }
    return MS_TAB[MS_TAB.length - 1][1];
  }
  const wdL = (lt) => -3.84 + 4 * (lt - LOG_TSUN);
  const HR_STARS = (() => {
    const r = rng(2024), out = [];
    for (let i = 0; i < 260; i++) { const lt = 3.42 + r() * 1.2; out.push([lt, msL(lt) + gauss(r) * 0.22, 'ms']); }
    for (let i = 0; i < 55; i++) { const lt = 3.52 + r() * 0.2; out.push([lt, 1 + ((3.72 - lt) / 0.2) * 1.6 + gauss(r) * 0.3, 'g']); }
    for (let i = 0; i < 26; i++) { const lt = 3.5 + r() * 1.0; out.push([lt, 4.4 + r() * 1.4, 'sg']); }
    for (let i = 0; i < 36; i++) { const lt = 3.75 + r() * 0.7; out.push([lt, wdL(lt) + gauss(r) * 0.2, 'wd']); }
    return out.map((q) => q.concat([starColor(Math.pow(10, q[0]))]));
  })();
  function hrMap(b) {
    const sx = (HRB.lt0 - HRB.lt1), sy = (HRB.ll1 - HRB.ll0);
    return {
      box: b,
      XL: (lt) => b.x + ((HRB.lt0 - lt) / sx) * b.w,
      YL: (ll) => b.y + ((HRB.ll1 - ll) / sy) * b.h,
      inv: (px, py) => ({ lt: HRB.lt0 - ((px - b.x) / b.w) * sx, ll: HRB.ll1 - ((py - b.y) / b.h) * sy })
    };
  }
  const RADII = [[0.01, -1], [0.1, 1], [1, 3], [10, 4], [100, 5], [1000, 6]];
  function drawHR(ctx, m, o) {
    const b = m.box;
    Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: SPACE });
    ctx.save();
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    for (let e = HRB.ll0; e <= HRB.ll1; e++) Sim.line(ctx, b.x, m.YL(e), b.x + b.w, m.YL(e), { color: 'rgba(255,255,255,0.07)', width: 1 });
    [40000, 20000, 10000, 5000, 3000].forEach((T) => Sim.line(ctx, m.XL(Math.log10(T)), b.y, m.XL(Math.log10(T)), b.y + b.h, { color: 'rgba(255,255,255,0.07)', width: 1 }));
    if (o.radii) {
      RADII.forEach(([R, labL]) => {
        const ll = (lt) => 2 * Math.log10(R) + 4 * (lt - LOG_TSUN);
        Sim.line(ctx, m.XL(HRB.lt0), m.YL(ll(HRB.lt0)), m.XL(HRB.lt1), m.YL(ll(HRB.lt1)), { color: 'rgba(255,255,255,0.3)', width: 1, dash: [4, 5] });
        const lt = LOG_TSUN + (labL - 2 * Math.log10(R)) / 4;
        const X = m.XL(lt), Y = m.YL(labL);
        if (X > b.x + 20 && X < b.x + b.w - 40) Sim.text(ctx, String(R) + ' R☉', X + 4, Y - 7, { size: 11, color: 'rgba(255,255,255,0.75)' });
      });
    }
    const alpha = o.alpha == null ? 1 : o.alpha;
    ctx.globalAlpha = alpha;
    HR_STARS.forEach((q) => {
      const rr = q[2] === 'wd' ? 1.6 : Sim.clamp(1.4 + (q[1] + 3) * 0.32, 1.4, 4);
      Sim.circle(ctx, m.XL(q[0]), m.YL(q[1]), rr, { fill: q[3] });
    });
    ctx.globalAlpha = 1;
    ctx.restore();
    // axes labels
    const step = b.h / (HRB.ll1 - HRB.ll0) < 18 ? 2 : 1;
    for (let e = HRB.ll0; e <= HRB.ll1; e++) {
      if ((e - HRB.ll0) % step) continue;
      Sim.text(ctx, e === 0 ? '1' : '10' + Sim.sup(e), b.x - 6, m.YL(e), { size: 11, color: C.muted, align: 'right' });
    }
    [40000, 20000, 10000, 5000, 3000].forEach((T) => {
      Sim.text(ctx, T.toLocaleString('en-GB').replace(/,/g, ' '), m.XL(Math.log10(T)), b.y + b.h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
    });
    Sim.text(ctx, 'luminosity / L☉', b.x - 4, b.y - 11, { size: 12.5, bold: true, color: C.ink });
    Sim.text(ctx, 'surface temperature / K   (hot ← → cool)', b.x + b.w / 2, b.y + b.h + 28, { size: 12.5, bold: true, color: C.ink, align: 'center' });
    // the Sun
    const sx = m.XL(LOG_TSUN), sy = m.YL(0);
    Sim.circle(ctx, sx, sy, 6, { stroke: '#ffd43b', width: 2 });
    Sim.circle(ctx, sx, sy, 1.8, { fill: '#ffd43b' });
    if (o.sunLabel !== false) Sim.text(ctx, 'Sun', sx + 9, sy + 9, { size: 12, bold: true, color: '#ffe066' });
  }
  function hrBox(w, h, rightGap) {
    return { x: 58, y: 24, w: w - 58 - (rightGap || 14), h: h - 24 - 46 };
  }
  function regionAt(lt, ll) {
    if (lt > HRB.lt0 || lt < HRB.lt1 || ll > HRB.ll1 || ll < HRB.ll0) return null;
    if (lt >= 3.4 && lt <= 4.66 && Math.abs(ll - msL(lt)) < 0.75) return 'ms';
    if (ll >= 3.7) return 'sg';
    if (lt >= 3.45 && lt <= 3.8 && ll >= 0.5 && ll < 3.7) return 'g';
    if (lt >= 3.65 && Math.abs(ll - wdL(lt)) < 0.9) return 'wd';
    return null;
  }
  const REGIONS = {
    ms: ['Main sequence', '2500 – 45 000 K', '10⁻⁴ – 10⁶ L☉', '0.1 – 20 R☉', 'fusing hydrogen into helium in the core; about 90% of all stars'],
    g: ['Red giants', '3000 – 5000 K', '10 – 1000 L☉', '10 – 100 R☉', 'core hydrogen used up: hydrogen fusing in a shell, later helium fusing to carbon'],
    sg: ['Supergiants', '3000 – 40 000 K', '10⁴ – 10⁶ L☉', '30 – 1000 R☉', 'massive stars fusing heavier elements; they will end as supernovae'],
    wd: ['White dwarfs', '5000 – 40 000 K', '10⁻⁴ – 10⁻¹ L☉', 'about 0.01 R☉, the size of the Earth', 'no fusion: the hot, dense leftover cores of low-mass stars, slowly cooling']
  };
  function regionOutline(ctx, m, key) {
    const pts = [];
    const col = '#ffd43b';
    if (key === 'ms') {
      for (let lt = 3.4; lt <= 4.66; lt += 0.02) pts.push([m.XL(lt), m.YL(msL(lt) + 0.75)]);
      for (let lt = 4.66; lt >= 3.4; lt -= 0.02) pts.push([m.XL(lt), m.YL(msL(lt) - 0.75)]);
    } else if (key === 'wd') {
      for (let lt = 3.65; lt <= HRB.lt0; lt += 0.02) pts.push([m.XL(lt), m.YL(wdL(lt) + 0.9)]);
      for (let lt = HRB.lt0; lt >= 3.65; lt -= 0.02) pts.push([m.XL(lt), m.YL(wdL(lt) - 0.9)]);
    } else if (key === 'g') {
      [[3.8, 3.7], [3.45, 3.7], [3.45, 0.5], [3.8, 0.5]].forEach((q) => pts.push([m.XL(q[0]), m.YL(q[1])]));
    } else if (key === 'sg') {
      [[HRB.lt0, 6.95], [HRB.lt1, 6.95], [HRB.lt1, 3.7], [HRB.lt0, 3.7]].forEach((q) => pts.push([m.XL(q[0]), m.YL(q[1])]));
    }
    ctx.save();
    const b = m.box;
    ctx.beginPath();
    ctx.rect(b.x, b.y, b.w, b.h);
    ctx.clip();
    Sim.polyline(ctx, pts, { color: col, width: 2, close: true, fill: 'rgba(255,212,59,0.12)', dash: [6, 4] });
    ctx.restore();
  }
  function regionLabels(ctx, m, narrow) {
    const o = { size: narrow ? 11.5 : 13, bold: true, color: '#e9ecef' };
    const a = m.XL(4.3), b = m.XL(3.6);
    const ang = Math.atan2(m.YL(msL(3.6)) - m.YL(msL(4.3)), b - a);
    const lt = 4.05, off = narrow ? 20 : 26;
    Sim.text(ctx, 'main sequence', m.XL(lt) - Math.sin(ang) * off, m.YL(msL(lt)) + Math.cos(ang) * off, Object.assign({ rotate: ang, align: 'center' }, o));
    Sim.text(ctx, 'red giants', m.XL(narrow ? 3.57 : 3.6), m.YL(narrow ? 3.5 : 0.1), Object.assign({ align: 'center' }, o));
    Sim.text(ctx, 'supergiants', m.XL(3.95), m.YL(6.35), Object.assign({ align: 'center' }, o));
    Sim.text(ctx, 'white dwarfs', m.XL(4.3), m.YL(-3.6), Object.assign({ align: 'center' }, o));
  }

  Sim.create('#sim-hr', {
    title: 'Explore the Hertzsprung–Russell diagram',
    height: (w) => (w >= 640 ? 470 : 470),
    controls: [
      { key: 'radii', type: 'check', label: 'Show lines of constant radius', value: true }
    ],
    init(s) { s.state = { sel: null, hover: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const m = hrMap(hrBox(w, h));
      st.map = m;
      drawHR(ctx, m, { radii: p.radii });
      regionLabels(ctx, m, w < 640);
      if (st.sel) regionOutline(ctx, m, st.sel);
      if (st.hover) {
        const X = m.XL(st.hover.lt), Y = m.YL(st.hover.ll);
        Sim.line(ctx, X - 9, Y, X + 9, Y, { color: '#fff', width: 1.5 });
        Sim.line(ctx, X, Y - 9, X, Y + 9, { color: '#fff', width: 1.5 });
      }
      if (!st.sel) Sim.text(ctx, 'click a group of stars', m.box.x + m.box.w - 8, m.box.y + m.box.h - 14, { size: 12, color: '#ffe066', align: 'right', italic: true });
    },
    readout(s) {
      const st = s.state;
      const out = [];
      if (st.sel) {
        const r = REGIONS[st.sel];
        out.push([r[0], '', true], ['T:', r[1]], ['L:', r[2]], ['radius:', r[3]], ['inside:', r[4]]);
      } else out.push(['Click a group of stars to identify it', '']);
      if (st.hover) {
        const T = Math.pow(10, st.hover.lt), L = Math.pow(10, st.hover.ll);
        const R = Math.sqrt(L) * Math.pow(5800 / T, 2);
        out.push(['pointer: T =', tidy(T) + ' K'], ['L =', Sim.fmt(L, 2) + ' L☉'], ['radius from L = 4πr²σT⁴:', Sim.fmt(R, 2) + ' R☉', true]);
      }
      return out;
    },
    pointer: {
      cursor: 'crosshair',
      touchAction: 'pan-y',
      move(s, pt) {
        const m = s.state.map;
        if (!m) return;
        const b = m.box;
        if (pt.x < b.x || pt.x > b.x + b.w || pt.y < b.y || pt.y > b.y + b.h) { s.state.hover = null; return; }
        s.state.hover = m.inv(pt.x, pt.y);
      },
      down(s, pt) {
        this.move(s, pt);
        const hv = s.state.hover;
        if (hv) s.state.sel = regionAt(hv.lt, hv.ll) || s.state.sel;
      },
      leave(s) { s.state.hover = null; }
    }
  });

  /* evolution tracks: [logT, logL, stage, seconds to get here] */
  const TRACKS = {
    sun: {
      stages: [
        ['Protostar', 'tens of millions of years', 'A cloud of gas collapses under gravity and heats up. It shines from gravitational energy, before fusion starts.'],
        ['Main sequence', 'about 10 billion years', 'Hydrogen fuses into helium in the core. Pressure balances gravity, so the star is stable.'],
        ['Red giant', 'about 1 billion years', 'Core hydrogen runs out. The core shrinks and heats, hydrogen fuses in a shell, and the outer layers swell and cool. Later helium fuses into carbon.'],
        ['Planetary nebula', 'tens of thousands of years', 'The outer layers drift off into space, exposing the hot core.'],
        ['White dwarf', 'billions of years, fading', 'No fusion. A hot, dense, Earth-sized core that slowly cools and fades.']
      ],
      keys: [[3.6, 1.0, 0, 0], [3.62, 0.4, 0, 0.5], [3.7, 0.1, 0, 0.4], [3.763, 0, 1, 0.4], [3.76, 0.15, 1, 1.2], [3.75, 0.3, 1, 1.2], [3.72, 0.5, 2, 0.4], [3.68, 1.0, 2, 0.4], [3.64, 2.0, 2, 0.5], [3.58, 3.0, 2, 0.5], [3.55, 3.3, 2, 0.4], [3.62, 3.5, 3, 0.4], [4.0, 3.6, 3, 0.5], [4.4, 3.5, 3, 0.5], [4.68, 3.0, 3, 0.5], [4.66, 2.0, 4, 0.5], [4.6, 0.5, 4, 0.6], [4.5, -1.0, 4, 0.6], [4.3, -2.2, 4, 0.6], [4.05, -3.2, 4, 0.7], [3.85, -4.0, 4, 0.8]]
    },
    massive: {
      stages: [
        ['Protostar', 'less than a million years', 'A large gas cloud collapses and heats up quickly.'],
        ['Main sequence', 'about 10 million years', 'Hydrogen fuses into helium in the core, much faster than in the Sun, so its life is short.'],
        ['Red supergiant', 'about a million years', 'The star swells enormously and fuses heavier and heavier elements in shells, up to iron.'],
        ['Supernova', 'a few weeks', 'The iron core collapses in under a second and the outer layers are blasted out. For a while it can outshine a whole galaxy (far above the top of this diagram).'],
        ['Neutron star', 'remains', 'The collapsed core: about 20 km across and as dense as an atomic nucleus. Far too small and faint to show here.']
      ],
      keys: [[4.3, 4.05, 0, 0], [4.42, 4.2, 0, 0.6], [4.48, 4.3, 1, 0.5], [4.45, 4.5, 1, 1.2], [4.4, 4.65, 1, 1.2], [4.3, 4.75, 2, 0.4], [4.0, 4.8, 2, 0.5], [3.75, 4.85, 2, 0.5], [3.56, 4.9, 2, 0.6], [3.56, 4.9, 3, 1.8], [3.56, 4.9, 4, 0.6]]
    },
    huge: {
      stages: [
        ['Protostar', 'less than a million years', 'A very large gas cloud collapses and heats up quickly.'],
        ['Main sequence', 'a few million years', 'Hydrogen fuses into helium at a furious rate: one of the brightest stars there is.'],
        ['Supergiant', 'a few hundred thousand years', 'Swells and fuses heavier elements in shells, up to iron.'],
        ['Supernova', 'a few weeks', 'The iron core collapses and the outer layers are blasted into space.'],
        ['Black hole', 'remains', 'The core is so massive that nothing stops its collapse. Its gravity is so strong that not even light can escape.']
      ],
      keys: [[4.45, 5.05, 0, 0], [4.56, 5.2, 0, 0.6], [4.62, 5.3, 1, 0.5], [4.58, 5.5, 1, 1.2], [4.55, 5.6, 1, 1.2], [4.3, 5.7, 2, 0.4], [3.9, 5.75, 2, 0.5], [3.6, 5.8, 2, 0.6], [3.6, 5.8, 3, 1.8], [3.6, 5.8, 4, 0.6]]
    }
  };
  function trackAt(tr, t) {
    const k = tr.keys;
    let acc = 0;
    for (let i = 1; i < k.length; i++) {
      const d = k[i][3];
      if (t <= acc + d) {
        const f = d > 0 ? (t - acc) / d : 1;
        return { lt: Sim.lerp(k[i - 1][0], k[i][0], f), ll: Sim.lerp(k[i - 1][1], k[i][1], f), stage: k[i][2], i, f };
      }
      acc += d;
    }
    const L = k[k.length - 1];
    return { lt: L[0], ll: L[1], stage: L[2], i: k.length - 1, f: 1, end: true };
  }
  const trackTotal = (tr) => tr.keys.reduce((a, q) => a + q[3], 0);

  Sim.create('#sim-evolve', {
    title: 'The life of a star on the HR diagram',
    height: (w) => (w >= 700 ? 470 : 640),
    controls: [
      { key: 'm', type: 'select', label: 'Starting mass', value: 'sun', options: [['sun', 'Sun-like star (1 solar mass)'], ['massive', 'Massive star (about 15 solar masses)'], ['huge', 'Very massive star (about 40 solar masses)']],
        onChange: (s) => { s.reset(); s.play(); } }
    ],
    animate: true,
    init(s) { s.state = { t: 0, ended: false }; if (!s.running && s.frame > 0) s.play(); },
    update(s, dt) {
      const tr = TRACKS[s.p.m], st = s.state;
      if (st.ended) { st.t = 0; st.ended = false; }  // pressing Play at the end starts again
      st.t += dt;
      if (st.t >= trackTotal(tr)) { st.t = trackTotal(tr); st.ended = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const tr = TRACKS[p.m];
      const wide = w >= 700;
      const panel = wide ? { x: w - 214, y: 14, w: 200, h: h - 28 } : { x: 0, y: h - 200, w, h: 200 };
      const m = hrMap(wide ? hrBox(w - 214, h, 20) : hrBox(w, h - 200));
      drawHR(ctx, m, { radii: false, alpha: 0.35 });
      const now = trackAt(tr, s.state.t);
      // trail so far
      const pts = [];
      for (let i = 0; i < now.i; i++) pts.push([m.XL(tr.keys[i][0]), m.YL(tr.keys[i][1])]);
      pts.push([m.XL(now.lt), m.YL(now.ll)]);
      ctx.save();
      ctx.beginPath();
      ctx.rect(m.box.x, m.box.y, m.box.w, m.box.h);
      ctx.clip();
      Sim.polyline(ctx, pts, { color: '#ffd43b', width: 2.5 });
      const T = Math.pow(10, now.lt), L = Math.pow(10, now.ll);
      const R = Math.sqrt(L) * Math.pow(5800 / T, 2);
      const stage = tr.stages[now.stage];
      const X = m.XL(now.lt), Y = m.YL(now.ll);
      const remnant = now.stage === 4 && p.m !== 'sun';
      if (now.stage === 3 && p.m !== 'sun') {
        const pulse = 0.5 + 0.5 * Math.sin(s.t * 12);
        ctx.save();
        const g = ctx.createRadialGradient(X, Y, 2, X, Y, 60);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.7 + 0.3 * pulse) + ')');
        g.addColorStop(0.4, 'rgba(255,212,59,0.5)');
        g.addColorStop(1, 'rgba(240,140,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(X, Y, 60, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (!remnant) {
        glowStar(ctx, X, Y, 5, T);
      }
      ctx.restore();
      Sim.text(ctx, stage[0], Sim.clamp(X + 12, m.box.x + 4, m.box.x + m.box.w - 110), Sim.clamp(Y - 14, m.box.y + 10, m.box.y + m.box.h - 10), { size: 13, bold: true, color: '#fff', bg: 'rgba(0,43,128,0.8)', pad: 3 });

      // side panel: what the star looks like
      Sim.rect(ctx, panel.x, panel.y, panel.w, panel.h, { fill: SPACE, r: wide ? 10 : 0 });
      const cxp = wide ? panel.x + panel.w / 2 : panel.x + 70, cyp = wide ? panel.y + 82 : panel.y + panel.h / 2;
      if (remnant) {
        if (p.m === 'huge') { Sim.circle(ctx, cxp, cyp, 12, { fill: '#000', stroke: '#ffc078', width: 2 }); }
        else glowStar(ctx, cxp, cyp, 3, 40000);
      } else if (now.stage === 3 && p.m !== 'sun') {
        glowStar(ctx, cxp, cyp, 30, 8000);
      } else {
        const rpx = Sim.clamp(4 + 7.5 * (Math.log10(Math.max(R, 1e-3)) + 2), 3, 52);
        glowStar(ctx, cxp, cyp, rpx, T);
      }
      const tx = wide ? panel.x + 14 : panel.x + 150;
      const tw = wide ? panel.w - 28 : panel.w - 150 - 14;
      let ty = wide ? panel.y + 160 : panel.y + 22;
      Sim.text(ctx, stage[0], tx, ty, { size: 15, bold: true, color: '#fff' });
      ty += 20;
      Sim.text(ctx, stage[1], tx, ty, { size: 12, color: '#ffe066' });
      ty += 22;
      wrap(ctx, stage[2], tx, ty, tw, 16, { size: 12, color: '#dbe4ff' });
      Sim.text(ctx, remnant ? '' : 'size shown on a log scale', wide ? panel.x + panel.w / 2 : cxp, panel.y + panel.h - 12, { size: 11, color: 'rgba(255,255,255,0.6)', align: 'center' });
    },
    readout(s) {
      const tr = TRACKS[s.p.m];
      const now = trackAt(tr, s.state.t);
      const st = tr.stages[now.stage];
      const out = [['stage:', st[0], true], ['time in this stage:', st[1]]];
      if (!(now.stage >= 3 && s.p.m !== 'sun')) {
        const T = Math.pow(10, now.lt), L = Math.pow(10, now.ll);
        out.push(['surface T ≈', tidy(T) + ' K'], ['L ≈', Sim.fmt(L, 2) + ' L☉'], ['radius ≈', Sim.fmt(Math.sqrt(L) * Math.pow(5800 / T, 2), 2) + ' R☉']);
      }
      return out;
    }
  });

  /* ======================================================================
     5. Doppler effect and redshift
     ====================================================================== */
  const LINES = [['Ca', 393.4], ['', 396.8], ['Hδ', 410.2], ['Hγ', 434.0], ['Hβ', 486.1], ['Na', 589.0], ['Hα', 656.3]];
  Sim.create('#sim-redshift', {
    title: 'Redshift: a moving galaxy and its spectrum',
    height: (w) => (w >= 640 ? 372 : 362),
    controls: [
      { key: 'v', label: 'Velocity of the galaxy (+ = away from us)', min: -30000, max: 60000, step: 500, value: 15000, unit: 'km s⁻¹', format: (v) => Sim.fmt(v, 3) }
    ],
    animate: true,
    init(s) { s.state = { fronts: [], gx: null, tEmit: 0 }; },
    update(s, dt) {
      const st = s.state;
      const w = s.w;
      const beta = (s.p.v * 1e3) / CL;
      const cvis = 85, vvis = beta * cvis * 4;
      const lo = w * 0.42, hi = w * 0.86;
      if (st.gx == null) st.gx = w * 0.6;
      st.gx += vvis * dt;
      if (st.gx > hi) st.gx = lo;
      if (st.gx < lo) st.gx = hi;
      st.tEmit += dt;
      if (st.tEmit >= 0.42) { st.tEmit = 0; st.fronts.push({ x: st.gx, r: 0 }); }
      st.fronts.forEach((f) => { f.r += cvis * dt; });
      st.fronts = st.fronts.filter((f) => f.r < w * 1.1);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const beta = (p.v * 1e3) / CL;
      const z = beta;
      const SH = w >= 640 ? 180 : 170, sy = SH / 2 + 6;
      Sim.rect(ctx, 0, 0, w, SH, { fill: SPACE });
      stars(ctx, 0, 0, w, SH, 50, 33);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, SH);
      ctx.clip();
      st.fronts.forEach((f) => Sim.circle(ctx, f.x, sy, f.r, { stroke: 'rgba(165,216,255,' + Sim.clamp(1 - f.r / w, 0.15, 0.9).toFixed(2) + ')', width: 1.6 }));
      ctx.restore();
      const gx = st.gx == null ? w * 0.6 : st.gx;
      // galaxy
      ctx.save();
      ctx.translate(gx, sy);
      ctx.scale(1, 0.5);
      const gg = ctx.createRadialGradient(0, 0, 1, 0, 0, 20);
      gg.addColorStop(0, 'rgba(255,248,220,1)');
      gg.addColorStop(0.5, 'rgba(255,224,160,0.6)');
      gg.addColorStop(1, 'rgba(255,224,160,0)');
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (Math.abs(p.v) > 0) Sim.arrow(ctx, gx, sy - 24, gx + Math.sign(p.v) * Sim.clamp(Math.abs(beta) * 260, 12, 70), sy - 24, { color: '#ffc078', width: 2.5, head: 8 });
      Sim.text(ctx, 'galaxy', gx, sy + 22, { size: 12, color: '#ffe8cc', align: 'center', bold: true });
      // telescope on the left
      Sim.rect(ctx, 10, sy - 8, 26, 16, { fill: '#adb5bd', r: 3 });
      Sim.rect(ctx, 34, sy - 11, 8, 22, { fill: '#868e96', r: 2 });
      Sim.text(ctx, 'telescope', 10, sy + 24, { size: 12, color: '#dbe4ff', bold: true });
      Sim.text(ctx, p.v > 0 ? 'crests arrive further apart: red-shift' : p.v < 0 ? 'crests arrive closer together: blue-shift' : 'no shift', 10, 16, { size: 12.5, color: p.v > 0 ? '#ff8787' : p.v < 0 ? '#74c0fc' : '#fff', bold: true });
      Sim.text(ctx, 'speed exaggerated ×4 in this picture', w - 10, SH - 12, { size: 11.5, color: 'rgba(255,255,255,0.65)', align: 'right', italic: true });

      // spectra
      const left = 70, right = 18, sw = w - left - right;
      const X = (nm) => left + ((nm - 380) / 400) * sw;
      const strip = (y, hh, shiftZ, label) => {
        for (let nm = 380; nm < 780; nm += 2) Sim.rect(ctx, X(nm), y, X(nm + 2) - X(nm) + 0.6, hh, { fill: Sim.spectrum(nm + 1) });
        LINES.forEach((ln) => {
          const lam = ln[1] * (1 + shiftZ);
          if (lam >= 380 && lam <= 780) Sim.line(ctx, X(lam), y, X(lam), y + hh, { color: '#111', width: 2.6, cap: 'butt' });
        });
        Sim.text(ctx, label, left - 8, y + hh / 2, { size: 12, bold: true, color: C.ink, align: 'right' });
      };
      const y1 = SH + 34, hh = 34, y2 = y1 + hh + 52;
      strip(y1, hh, 0, 'lab');
      strip(y2, hh, z, 'galaxy');
      const narrow = w < 640;
      LINES.forEach((ln) => {
        if (!ln[0] || (narrow && (ln[0] === 'Hδ' || ln[0] === 'Ca'))) return;
        Sim.text(ctx, ln[0], X(ln[0] === 'Ca' ? 395 : ln[1]), y1 - 9, { size: 11.5, bold: true, color: C.ink, align: 'center' });
      });
      LINES.forEach((ln) => {
        const lam = ln[1] * (1 + z);
        if (lam >= 380 && lam <= 780) Sim.line(ctx, X(ln[1]), y1 + hh + 2, X(lam), y2 - 2, { color: C.grey, width: 1, dash: [3, 3] });
      });
      [400, 500, 600, 700].forEach((nm) => {
        Sim.line(ctx, X(nm), y2 + hh, X(nm), y2 + hh + 5, { color: C.axis, width: 1 });
        Sim.text(ctx, nm + ' nm', X(nm), y2 + hh + 8, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      });
      const ha = 656.3 * (1 + z);
      if (ha > 780) Sim.text(ctx, 'Hα now at ' + Sim.fmt(ha, 3) + ' nm (infrared) →', w - right, y2 - 10, { size: 11.5, color: C.red, bold: true, align: 'right' });
    },
    readout(s) {
      const v = s.p.v, z = (v * 1e3) / CL;
      const out = [
        ['v =', Sim.fmt(v * 1e3, 3) + ' m s⁻¹ = ' + Sim.fmt(z, 2) + 'c'],
        ['z = v/c =', Sim.fmt(z, 3), true],
        ['Hα: 656.3 nm →', Sim.fmt(656.3 * (1 + z), 4) + ' nm'],
        ['Δλ = zλ =', Sim.fmt(656.3 * z, 3) + ' nm']
      ];
      if (v > 0) out.push(['if this is the expansion, d = v/H₀ ≈', Sim.fmt(v / 70, 3) + ' Mpc (H₀ = 70 km s⁻¹ Mpc⁻¹)']);
      return out;
    }
  });

  /* ======================================================================
     6. Hubble's law plot
     ====================================================================== */
  function hubbleData(seed) {
    const r = rng(seed);
    const out = [];
    for (let i = 0; i < 24; i++) {
      const d = 15 + r() * 430;
      const v = Math.max(200, 70 * d * (1 + 0.07 * gauss(r)) + 350 * gauss(r));
      out.push([d, v]);
    }
    return out;
  }
  const ageGyr = (H) => (H > 0 ? (MPC / 1e3 / H) / YEAR / 1e9 : Infinity);
  Sim.create('#sim-hubble', {
    title: "Hubble's law: find H₀ and the age of the universe",
    height: (w) => (w >= 640 ? 390 : 420),
    controls: [
      { key: 'H', label: 'Your line: H₀', min: 40, max: 100, step: 0.5, value: 50, unit: 'km s⁻¹ Mpc⁻¹', format: (v) => v.toFixed(1) },
      { key: 'fit', type: 'check', label: 'Show the best-fit line', value: false },
      { type: 'button', label: 'New data set', ghost: true, onClick: (s) => { s.state.seed = (s.state.seed * 48271) % 2147483647; s.state.data = hubbleData(s.state.seed); } }
    ],
    init(s) { s.state = { seed: 7, data: hubbleData(7) }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const data = s.state.data;
      const g = Sim.graph(ctx, { x: 62, y: 30, w: w - 62 - 24, h: h - 30 - 44, xmin: 0, xmax: 500, ymin: 0, ymax: 40, xstep: 100, ystep: 10, xlabel: 'd / Mpc', ylabel: 'v / 10³ km s⁻¹', title: 'recession velocity against distance' }).axes();
      const fit = fitOrigin(data);
      // residuals to your line
      data.forEach(([d, v]) => Sim.line(ctx, g.px(d), g.py(v / 1e3), g.px(d), g.py((p.H * d) / 1e3), { color: 'rgba(240,140,0,0.45)', width: 1 }));
      g.plot((d) => (p.H * d) / 1e3, { color: C.orange, width: 2.5 });
      if (p.fit && fit) g.plot((d) => (fit * d) / 1e3, { color: C.green, width: 2.5, dash: [7, 4] });
      data.forEach(([d, v]) => {
        Sim.line(ctx, g.px(d * 0.92), g.py(v / 1e3), g.px(d * 1.08), g.py(v / 1e3), { color: C.navy, width: 1.2, alpha: 0.6 });
        g.dot(d, v / 1e3, { color: C.navy, r: 4 });
      });
      // labels at the right-hand end of each line, on the side away from the data
      const below = fit != null && p.H < fit;
      const tag = (H, str, col, under) => {
        if (under) Sim.text(ctx, str, g.px(400), g.py((H * 400) / 1e3) + 16, { size: 12, color: col, bold: true, align: 'left' });
        else if ((H * 492) / 1e3 < 39) Sim.text(ctx, str, g.px(492), g.py((H * 492) / 1e3) - 12, { size: 12, color: col, bold: true, align: 'right' });
      };
      tag(p.H, 'your line', '#b35c00', below);
      if (p.fit && fit) tag(fit, 'best fit', C.green, !below);
      Sim.text(ctx, 'bars: ±8% distance uncertainty', g.x + g.w - 6, g.y + g.h - 30, { size: 11.5, color: C.muted, align: 'right', italic: true });
    },
    readout(s) {
      const p = s.p, data = s.state.data;
      let ss = 0;
      data.forEach(([d, v]) => { ss += (v - p.H * d) * (v - p.H * d); });
      const rms = Math.sqrt(ss / data.length);
      const out = [
        ['your H₀ =', p.H.toFixed(1) + ' km s⁻¹ Mpc⁻¹ = ' + Sim.fmt((p.H * 1e3) / MPC, 3) + ' s⁻¹'],
        ['age ≈ 1/H₀ =', Sim.fmt(ageGyr(p.H), 3) + ' billion years', true],
        ['typical miss from your line:', Sim.fmt(rms, 2) + ' km s⁻¹']
      ];
      const fit = fitOrigin(data);
      if (p.fit && fit) {
        out.push(['best-fit H₀ =', Sim.fmt(fit, 3) + ' km s⁻¹ Mpc⁻¹', true]);
        out.push(['best-fit age =', Sim.fmt(ageGyr(fit), 3) + ' billion years']);
      }
      return out;
    }
  });
  function fitOrigin(pts) {
    let sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sxx += x * x; sxy += x * y; });
    return sxx > 0 ? sxy / sxx : null;
  }

  /* ======================================================================
     7. Galaxy rotation curve and dark matter
     ====================================================================== */
  const GK = 4.30e-6;               // G in kpc (km/s)² per solar mass
  const MVIS = 1.0e11, AV = 3;      // visible mass (Plummer model) and scale / kpc
  const RC = 6, V0SQ = 40000;       // dark halo core radius / kpc and v∞² at full strength
  const mVis = (r) => (MVIS * r * r * r) / Math.pow(r * r + AV * AV, 1.5);
  const vVis = (r) => Math.sqrt((GK * mVis(r)) / Math.max(r, 1e-6));
  const vHalo2 = (r, f) => (r > 0 ? f * V0SQ * (1 - (RC / r) * Math.atan(r / RC)) : 0);
  const vTot = (r, f) => Math.sqrt(vVis(r) * vVis(r) + Math.max(0, vHalo2(r, f)));
  const ROT_DATA = (() => { const r = rng(555); const out = []; for (let x = 2; x <= 48; x += 3) out.push([x, vTot(x, 1) + gauss(r) * 6]); return out; })();
  const GAL_STARS = (() => {
    const r = rng(77), out = [];
    for (let i = 0; i < 230; i++) {
      const rad = Math.min(31, 0.6 + -Math.log(1 - r() * 0.985) * 6.5);
      const arm = i % 2;
      const phi = arm * Math.PI + Math.log(rad + 1) * 2.1 + gauss(r) * 0.35;
      out.push([rad, phi, 0.5 + r() * 1.2]);
    }
    return out;
  })();
  Sim.create('#sim-rotation', {
    title: 'Galaxy rotation curve: evidence for dark matter',
    height: (w) => (w >= 700 ? 390 : 600),
    controls: [
      { key: 'f', label: 'Dark matter in the halo (mass inside 50 kpc)', min: 0, max: 1.5, step: 0.05, value: 0,
        format: (v) => ((v * (V0SQ * 50 * (1 - (RC / 50) * Math.atan(50 / RC)) / GK)) / mVis(50)).toFixed(1) + ' × visible' },
      { key: 'data', type: 'check', label: 'Show the observed speeds', value: true }
    ],
    animate: true,
    init(s) { s.state = { t: 0 }; },
    update(s, dt) { s.state.t += dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 700;
      const V = wide ? { x: 0, y: 0, w: Math.min(h, w * 0.42), h } : { x: 0, y: 0, w, h: 270 };
      const gb = wide ? { x: V.w + 66, y: 30, w: w - V.w - 66 - 22, h: h - 30 - 44 } : { x: 60, y: V.h + 40, w: w - 60 - 20, h: h - V.h - 40 - 44 };
      // galaxy view
      Sim.rect(ctx, V.x, V.y, V.w, V.h, { fill: '#050b24' });
      const cx = V.x + V.w / 2, cy = V.y + V.h / 2;
      const k = (Math.min(V.w, V.h) / 2 - 10) / 32;
      if (p.f > 0) {
        ctx.save();
        const hg = ctx.createRadialGradient(cx, cy, 5, cx, cy, 32 * k);
        hg.addColorStop(0, 'rgba(151,117,250,' + (0.35 * Math.min(1, p.f)).toFixed(2) + ')');
        hg.addColorStop(1, 'rgba(151,117,250,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(cx, cy, 32 * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      const bulge = ctx.createRadialGradient(cx, cy, 1, cx, cy, 6 * k);
      bulge.addColorStop(0, 'rgba(255,244,214,0.95)');
      bulge.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.save();
      ctx.fillStyle = bulge;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 * k, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const kv = (2 * Math.PI) / (6 * (vTot(8, 1) / 8)); // inner marker star takes about 6 s with dark matter
      const t = s.state.t;
      GAL_STARS.forEach(([rad, phi, sz]) => {
        const a = phi + (vTot(rad, p.f) / rad) * kv * t;
        Sim.circle(ctx, cx + rad * k * Math.cos(a), cy + rad * k * Math.sin(a), sz, { fill: 'rgba(220,230,255,0.85)' });
      });
      [[8, C.sky], [27, '#ffd43b']].forEach(([rad, col]) => {
        const a = (vTot(rad, p.f) / rad) * kv * t;
        const x = cx + rad * k * Math.cos(a), y = cy + rad * k * Math.sin(a);
        Sim.circle(ctx, cx, cy, rad * k, { stroke: 'rgba(255,255,255,0.15)', width: 1, dash: [3, 4] });
        const vl = vTot(rad, p.f) * 0.22;
        Sim.arrow(ctx, x, y, x - Math.sin(a) * vl, y + Math.cos(a) * vl, { color: col, width: 2.5, head: 8 });
        Sim.circle(ctx, x, y, 4.5, { fill: col, stroke: '#fff', width: 1 });
      });
      if (p.f > 0) Sim.text(ctx, 'purple glow: dark matter halo (really invisible)', V.x + 8, V.y + V.h - 12, { size: 11.5, color: '#d0bfff' });
      Sim.text(ctx, 'arrows: orbital speed of two stars', V.x + 8, V.y + 14, { size: 11.5, color: '#dbe4ff' });

      // rotation curve
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 50, ymin: 0, ymax: 300, xstep: 10, ystep: 50, xlabel: 'r / kpc', ylabel: 'v / km s⁻¹', title: 'orbital speed against distance from the centre' }, gb)).axes();
      g.plot(vVis, { from: 0.2, to: 50, color: C.orange, width: 2.5, dash: [7, 4] });
      g.plot((r) => vTot(r, p.f), { from: 0.2, to: 50, color: C.blue, width: 3 });
      if (p.data) ROT_DATA.forEach(([r, v]) => {
        Sim.line(ctx, g.px(r), g.py(v - 10), g.px(r), g.py(v + 10), { color: C.green, width: 1.2 });
        g.dot(r, v, { color: C.green, r: 4 });
      });
      [[8, C.sky], [27, '#f59f00']].forEach(([r, col]) => g.dot(r, vTot(r, p.f), { color: col, r: 5 }));
      const lx = g.x + g.w - 8;
      Sim.text(ctx, 'visible matter only (predicted)', lx, g.py(vVis(44)) + 16, { size: 11.5, color: '#b35c00', bold: true, align: 'right' });
      Sim.text(ctx, 'your model', lx, g.py(vTot(46, p.f)) - (p.f > 0.3 ? -26 : 14), { size: 11.5, color: C.blue, bold: true, align: 'right' });
    },
    readout(s) {
      const f = s.p.f;
      const v30 = vTot(30, f), M50 = (vTot(50, f) * vTot(50, f) * 50) / GK;
      return [
        ['at 30 kpc: visible matter predicts', Sim.fmt(vVis(30), 3) + ' km s⁻¹'],
        ['observed ≈', Sim.fmt(vTot(30, 1), 3) + ' km s⁻¹'],
        ['your model', Sim.fmt(v30, 3) + ' km s⁻¹', true],
        ['mass inside 50 kpc, M = v²r/G =', Sim.fmt(M50, 3) + ' solar masses', true],
        ['visible mass', Sim.fmt(mVis(50), 3) + ' solar masses'],
        ['dark matter share', Math.round((1 - mVis(50) / M50) * 100) + '%']
      ];
    }
  });
})();
