/* Moments — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const DEG = Math.PI / 180;
  const BG = 'rgba(255,255,255,0.88)';

  function fx(v, d) {
    if (!isFinite(v)) return '—';
    const s = v.toFixed(d);
    return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
  }
  function niceStep(range, target) {
    const raw = Math.max(1e-9, range) / (target || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  function niceMax(v) { const st = niceStep(v, 4); return Math.ceil(v / st) * st; }
  function handle(ctx, x, y, color) {
    Sim.circle(ctx, x, y, 9, { fill: '#fff', stroke: color || C.navy, width: 2.5 });
    Sim.circle(ctx, x, y, 3, { fill: color || C.navy });
  }
  function hexagon(ctx, x, y, r, fill, stroke) {
    const pts = [];
    for (let i = 0; i < 6; i++) pts.push([x + r * Math.cos(i * Math.PI / 3 + Math.PI / 6), y + r * Math.sin(i * Math.PI / 3 + Math.PI / 6)]);
    Sim.polyline(ctx, pts, { close: true, fill, color: stroke, width: 2 });
  }
  function stick(ctx, x, feet, hgt, color, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    const hr = hgt * 0.1;
    Sim.circle(ctx, x, feet - hgt + hr, hr, { fill: color });
    Sim.line(ctx, x, feet - hgt + 2 * hr, x, feet - hgt * 0.42, { color, width: Math.max(2, hgt * 0.07) });
    Sim.line(ctx, x, feet - hgt * 0.42, x - hgt * 0.12, feet, { color, width: Math.max(2, hgt * 0.06) });
    Sim.line(ctx, x, feet - hgt * 0.42, x + hgt * 0.12, feet, { color, width: Math.max(2, hgt * 0.06) });
    Sim.line(ctx, x, feet - hgt * 0.72, x - hgt * 0.17, feet - hgt * 0.5, { color, width: Math.max(2, hgt * 0.05) });
    Sim.line(ctx, x, feet - hgt * 0.72, x + hgt * 0.17, feet - hgt * 0.5, { color, width: Math.max(2, hgt * 0.05) });
    ctx.restore();
  }

  /* ======================================================================
     1. Spanner: perpendicular distance and moment
     ====================================================================== */
  const NUT = 15; // N m needed to undo the nut
  function spannerGeom(s) {
    const { w, h, p } = s;
    const wide = w >= 640;
    const O = [Math.round(w * (wide ? 0.2 : 0.15)), Math.round(h * 0.52)];
    const L = wide ? Math.min(w * 0.5, 470) : w * 0.56;
    const A = [O[0] + (p.d / 0.30) * L, O[1]];
    const kF = Math.min(L * 0.45, h * 0.38) / 100;
    return { O, L, A, kF, wide };
  }
  function spannerSolve(p, ang) {
    const th = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))); // angle to the spanner, 0..π
    const x = p.d * Math.sin(th);
    const torque = p.d * p.F * Math.sin(ang); // canvas: + is clockwise
    return { th, x, M: Math.abs(torque), cw: torque > 1e-9, acw: torque < -1e-9 };
  }

  Sim.create('#sim-spanner', {
    title: 'Spanner: the perpendicular distance',
    height: (w) => (w >= 640 ? 370 : 340),
    controls: [
      { key: 'F', label: 'Force F', min: 10, max: 100, step: 1, value: 60, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'd', label: 'Distance along the spanner d', min: 0.05, max: 0.3, step: 0.01, value: 0.25, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'comp', type: 'check', label: 'Show the components of F', value: false }
    ],
    init(s) { s.state = { ang: -60 * DEG, drag: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const g = spannerGeom(s);
      const { O, L, A, kF } = g;
      const r = spannerSolve(p, st.ang);
      const u = [Math.cos(st.ang), Math.sin(st.ang)];
      const T = [A[0] + u[0] * p.F * kF, A[1] + u[1] * p.F * kF];

      // spanner
      Sim.rect(ctx, O[0], O[1] - 9, L + 26, 18, { fill: '#ced4da', stroke: '#868e96', width: 1.5, r: 9 });
      Sim.circle(ctx, O[0], O[1], 26, { fill: '#ced4da', stroke: '#868e96', width: 1.5 });
      hexagon(ctx, O[0], O[1], 15, '#868e96', '#495057');
      Sim.circle(ctx, O[0], O[1], 4, { fill: C.ink });
      for (let i = 1; i <= 6; i++) {
        const X = O[0] + (i * 0.05 / 0.3) * L;
        Sim.line(ctx, X, O[1] + 3, X, O[1] + 9, { color: '#495057', width: 1 });
      }
      Sim.text(ctx, '0.30 m', O[0] + L, O[1] + 22, { size: 11.5, color: C.muted, align: 'center' });

      // line of action
      Sim.line(ctx, A[0] - u[0] * 2000, A[1] - u[1] * 2000, A[0] + u[0] * 2000, A[1] + u[1] * 2000, { color: C.grey, width: 1.3, dash: [7, 5] });
      // perpendicular distance
      const t = (O[0] - A[0]) * u[0] + (O[1] - A[1]) * u[1];
      const Fp = [A[0] + u[0] * t, A[1] + u[1] * t];
      const xpx = Math.hypot(Fp[0] - O[0], Fp[1] - O[1]);
      if (xpx > 2) {
        Sim.line(ctx, O[0], O[1], Fp[0], Fp[1], { color: C.green, width: 3 });
        const vx = (O[0] - Fp[0]) / xpx, vy = (O[1] - Fp[1]) / xpx, q = 9;
        Sim.polyline(ctx, [[Fp[0] + vx * q, Fp[1] + vy * q], [Fp[0] + vx * q + u[0] * q, Fp[1] + vy * q + u[1] * q], [Fp[0] + u[0] * q, Fp[1] + u[1] * q]], { color: C.green, width: 1.5 });
        const mx = (O[0] + Fp[0]) / 2, my = (O[1] + Fp[1]) / 2;
        const side = u[0] >= 0 ? -1 : 1;
        Sim.text(ctx, 'x = ' + fx(r.x, 3) + ' m', mx + side * u[0] * 16 - 4, my + side * u[1] * 16, { size: 13, bold: true, color: C.green, align: 'center', bg: BG });
      }
      // components
      if (p.comp) {
        const cx = Math.cos(st.ang) * p.F * kF, cy = Math.sin(st.ang) * p.F * kF;
        if (Math.abs(cx) > 4) Sim.arrow(ctx, A[0], A[1], A[0] + cx, A[1], { color: C.purple, width: 2.5, dash: [5, 4] });
        if (Math.abs(cy) > 4) Sim.arrow(ctx, A[0], A[1], A[0], A[1] + cy, { color: C.pink, width: 2.5, dash: [5, 4] });
        if (Math.abs(cx) > 30) Sim.text(ctx, 'F cos θ', A[0] + cx / 2, A[1] + (cy < 0 ? 16 : -16), { size: 12.5, bold: true, color: C.purple, align: 'center', bg: BG });
        if (Math.abs(cy) > 30) Sim.text(ctx, 'F sin θ', A[0] + (cx >= 0 ? -8 : 8), A[1] + cy / 2, { size: 12.5, bold: true, color: C.pink, align: cx >= 0 ? 'right' : 'left', bg: BG });
      }
      // angle
      if (r.th > 4 * DEG && r.th < 176 * DEG) {
        const a2 = Math.atan2(u[1], u[0]);
        Sim.arc(ctx, A[0], A[1], 30, 0, a2, { color: C.ink, label: 'θ', labelGap: 11 });
      }
      // force
      Sim.arrow(ctx, A[0], A[1], T[0], T[1], { color: C.red, width: 4 });
      Sim.text(ctx, 'F = ' + fx(p.F, 0) + ' N', T[0] + u[0] * 18, T[1] + u[1] * 18 + (Math.abs(u[1]) < 0.4 ? -14 : 0), { size: 13.5, bold: true, color: C.red, align: 'center', bg: BG });
      handle(ctx, A[0], A[1], C.navy);
      handle(ctx, T[0], T[1], C.red);

      // turning direction and the nut
      const status = r.M < 0.01 ? 'no turning effect' : r.acw ? 'anticlockwise' : 'clockwise';
      Sim.text(ctx, 'moment = Fx = ' + fx(r.M, 1) + ' N m ' + (r.M < 0.01 ? '' : '(' + status + ')'), 14, 18, { size: 14, bold: true, color: C.navy });
      let msg, col;
      if (r.acw && r.M >= NUT) { msg = 'The nut undoes! (needs ' + NUT + ' N m anticlockwise)'; col = C.green; }
      else if (r.cw && r.M >= NUT) { msg = 'Wrong way: that tightens the nut'; col = C.red; }
      else { msg = 'Nut needs ' + NUT + ' N m anticlockwise to undo'; col = C.muted; }
      Sim.text(ctx, msg, 14, 40, { size: 12.5, color: col, bold: col !== C.muted });
      // moment meter
      const mw = g.wide ? 180 : Math.min(150, w * 0.42), mx0 = w - mw - 14, my0 = h - 22;
      Sim.rect(ctx, mx0, my0 - 6, mw, 12, { fill: '#e9ecef', r: 6 });
      const fr = Sim.clamp(r.M / 30, 0, 1);
      Sim.rect(ctx, mx0, my0 - 6, mw * fr, 12, { fill: r.M >= NUT ? (r.acw ? C.green : C.red) : C.blue, r: 6 });
      Sim.line(ctx, mx0 + mw / 2, my0 - 10, mx0 + mw / 2, my0 + 10, { color: C.ink, width: 1.5 });
      Sim.text(ctx, '15 N m', mx0 + mw / 2, my0 - 17, { size: 11, color: C.muted, align: 'center' });
    },
    readout(s) {
      const p = s.p, r = spannerSolve(p, s.state.ang);
      return [
        ['θ =', fx(r.th / DEG, 0) + '°'],
        ['x = d sin θ =', fx(r.x, 3) + ' m'],
        ['F sin θ =', fx(p.F * Math.sin(r.th), 1) + ' N'],
        ['moment = Fx =', fx(r.M, 2) + ' N m', true],
        ['check (F sin θ) × d =', fx(p.F * Math.sin(r.th) * p.d, 2) + ' N m']
      ];
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const g = spannerGeom(s), st = s.state;
        const dA = Math.hypot(pt.x - g.A[0], pt.y - g.A[1]);
        const T = [g.A[0] + Math.cos(st.ang) * s.p.F * g.kF, g.A[1] + Math.sin(st.ang) * s.p.F * g.kF];
        const dT = Math.hypot(pt.x - T[0], pt.y - T[1]);
        st.drag = dA < 18 && dA < dT ? 'pos' : 'dir';
        this.move(s, pt);
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const g = spannerGeom(s);
        if (st.drag === 'pos') {
          const d = Sim.clamp(Math.round(((pt.x - g.O[0]) / g.L) * 0.3 * 100) / 100, 0.05, 0.3);
          if (d !== s.p.d) s.set('d', d);
        } else {
          const dx = pt.x - g.A[0], dy = pt.y - g.A[1];
          if (Math.hypot(dx, dy) > 12) st.ang = Math.atan2(dy, dx);
        }
      },
      up(s) { s.state.drag = null; }
    }
  });

  /* ======================================================================
     2. Metre-rule balance
     ====================================================================== */
  const RULE_M = 0.1;
  const MASSES = [['A', 'mA', C.blue], ['B', 'mB', C.orange], ['C', 'mC', C.purple]];
  function beamMoments(s) {
    const p = s.p, pos = s.state.pos;
    const parts = [];
    MASSES.forEach(([n, k, col]) => {
      const m = p[k] / 1000;
      if (m > 0) parts.push({ name: n, M: m * G * (pos[n] - p.pv) / 100, col, W: m * G, c: pos[n] });
    });
    if (p.rule) parts.push({ name: 'rule', M: RULE_M * G * (50 - p.pv) / 100, col: '#868e96', W: RULE_M * G, c: 50 });
    let cw = 0, acw = 0;
    parts.forEach((q) => { if (q.M > 0) cw += q.M; else acw -= q.M; });
    return { parts, cw, acw, net: cw - acw };
  }

  Sim.create('#sim-beam', {
    title: 'Metre-rule balance',
    height: (w) => (w >= 640 ? 345 : 360),
    controls: [
      { key: 'mA', label: 'Mass A', min: 0, max: 500, step: 50, value: 200, unit: 'g', format: (v) => v.toFixed(0) },
      { key: 'mB', label: 'Mass B', min: 0, max: 500, step: 50, value: 100, unit: 'g', format: (v) => v.toFixed(0) },
      { key: 'mC', label: 'Mass C', min: 0, max: 500, step: 50, value: 0, unit: 'g', format: (v) => v.toFixed(0) },
      { key: 'pv', label: 'Pivot position', min: 20, max: 80, step: 1, value: 50, unit: 'cm', format: (v) => v.toFixed(0) },
      { key: 'rule', type: 'check', label: 'Include the rule’s own weight (100 g)', value: true }
    ],
    init(s) { s.state = { pos: { A: 30, B: 90, C: 70 }, drag: null, geo: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const bm = beamMoments(s);
      const balanced = Math.abs(bm.net) < 0.003;
      const alpha = balanced ? 0 : Math.sign(bm.net) * 6 * DEG;
      const x0 = 30, x1 = w - 30, k = (x1 - x0) / 100, yb = 64;
      const P = [x0 + p.pv * k, yb];
      const ca = Math.cos(alpha), sa = Math.sin(alpha);
      const at = (c) => [P[0] + (c - p.pv) * k * ca, P[1] + (c - p.pv) * k * sa];
      st.geo = { P, k, ca, pv: p.pv };
      const SH = wide ? 210 : 220;
      // stand
      Sim.rect(ctx, P[0] - 5, yb + 14, 10, SH - yb - 34, { fill: '#adb5bd' });
      Sim.rect(ctx, P[0] - 50, SH - 22, 100, 8, { fill: '#868e96', r: 3 });
      Sim.polyline(ctx, [[P[0], yb + 5], [P[0] - 11, yb + 22], [P[0] + 11, yb + 22]], { close: true, fill: '#495057', color: '#495057' });
      // stops
      Sim.rect(ctx, x0 - 8, yb + 12, 14, 6, { fill: '#ced4da', r: 2 });
      Sim.rect(ctx, x1 - 6, yb + 12, 14, 6, { fill: '#ced4da', r: 2 });
      // beam
      ctx.save();
      ctx.translate(P[0], P[1]);
      ctx.rotate(alpha);
      const left = -p.pv * k, len = 100 * k;
      Sim.rect(ctx, left, -6, len, 12, { fill: '#f4e3b5', stroke: '#b08d3c', width: 1.5, r: 2 });
      for (let c = 0; c <= 100; c += 5) {
        const X = left + c * k;
        Sim.line(ctx, X, -6, X, c % 10 === 0 ? 1 : -2, { color: '#7a5d1a', width: 1 });
        if (c % 10 === 0 && (wide || c % 20 === 0)) Sim.text(ctx, String(c), X, -14, { size: 11, color: '#7a5d1a', align: 'center' });
      }
      ctx.restore();
      Sim.circle(ctx, P[0], P[1], 3.5, { fill: C.ink });
      // rule's weight
      if (p.rule) {
        const c = at(50);
        Sim.arrow(ctx, c[0], c[1] + 6, c[0], c[1] + 52, { color: '#868e96', width: 2.5, head: 8 });
        Sim.text(ctx, 'rule 0.98 N', c[0] + 6, c[1] + 62, { size: 11.5, color: '#5b6573', align: 'left', bg: BG });
      }
      // masses
      MASSES.forEach(([n, key, col]) => {
        const m = p[key];
        if (m <= 0) return;
        const a = at(st.pos[n]);
        const top = a[1] + 46, bh = 10 + m / 20, bw = 22 + m / 25;
        Sim.line(ctx, a[0], a[1] + 4, a[0], top, { color: '#495057', width: 1.5 });
        Sim.circle(ctx, a[0], a[1] + 4, 4, { stroke: '#495057', width: 1.5 });
        Sim.rect(ctx, a[0] - bw / 2, top, bw, bh, { fill: col, r: 3 });
        Sim.text(ctx, n, a[0], top + bh / 2, { size: 12, bold: true, color: '#fff', align: 'center' });
        Sim.text(ctx, m + ' g', a[0], top + bh + 11, { size: 11.5, bold: true, color: col, align: 'center' });
        if (st.drag === n) Sim.circle(ctx, a[0], a[1] + 4, 11, { stroke: col, width: 2 });
      });
      Sim.text(ctx, balanced ? 'Balanced: clockwise = anticlockwise' : 'Not balanced: it tips ' + (bm.net > 0 ? 'clockwise' : 'anticlockwise'), w / 2, 16, { size: 13.5, bold: true, color: balanced ? C.green : C.red, align: 'center' });

      // moment bars
      const by = SH + 8;
      Sim.line(ctx, 14, by - 4, w - 14, by - 4, { color: '#dfe5ee', width: 1 });
      Sim.text(ctx, 'Moments about the pivot / N m', 14, by + 10, { size: 13, bold: true, color: C.navy });
      const lw = wide ? 112 : 96, bw = w - 14 - lw - 56;
      const mx = Math.max(bm.cw, bm.acw, 0.05);
      const sc = bw / mx;
      const row = (y, label, list, total) => {
        Sim.text(ctx, label, 14, y, { size: 12.5, color: C.muted });
        let x = 14 + lw;
        Sim.rect(ctx, x, y - 10, bw, 20, { fill: '#f1f3f7', r: 3 });
        list.forEach((q) => {
          const ww = Math.abs(q.M) * sc;
          if (ww < 0.5) return;
          Sim.rect(ctx, x, y - 10, ww, 20, { fill: q.col, r: 2 });
          if (ww > 26) Sim.text(ctx, q.name, x + ww / 2, y, { size: 11.5, bold: true, color: '#fff', align: 'center' });
          x += ww;
        });
        Sim.text(ctx, fx(total, 3), 14 + lw + bw + 6, y, { size: 12, bold: true, color: C.ink });
      };
      row(by + 38, 'anticlockwise', bm.parts.filter((q) => q.M < 0), bm.acw);
      row(by + 66, 'clockwise', bm.parts.filter((q) => q.M > 0), bm.cw);
      const ex = bm.parts.filter((q) => Math.abs(q.M) > 1e-9).map((q) => q.name + ': ' + fx(q.W, 2) + ' N × ' + fx(Math.abs(q.c - p.pv) / 100, 2) + ' m');
      const lines = wide ? [ex.join('    ')] : [ex.slice(0, 2).join('   '), ex.slice(2).join('   ')];
      lines.forEach((ln, i) => { if (ln) Sim.text(ctx, ln, 14, by + 94 + i * 17, { size: 12, color: C.ink }); });
    },
    readout(s) {
      const bm = beamMoments(s);
      return [
        ['anticlockwise =', fx(bm.acw, 3) + ' N m'],
        ['clockwise =', fx(bm.cw, 3) + ' N m'],
        ['resultant moment =', fx(Math.abs(bm.net), 3) + ' N m' + (Math.abs(bm.net) < 0.003 ? ' (balanced)' : bm.net > 0 ? ' clockwise' : ' anticlockwise'), true]
      ];
    },
    pointer: {
      cursor: 'grab',
      touchAction: 'pan-y',
      down(s, pt) {
        const st = s.state, g = st.geo;
        if (!g) return;
        let best = null, bd = 26;
        MASSES.forEach(([n, key]) => {
          if (s.p[key] <= 0) return;
          const ax = g.P[0] + (st.pos[n] - g.pv) * g.k * g.ca;
          const d = Math.abs(pt.x - ax);
          if (d < bd && pt.y > g.P[1] - 24 && pt.y < g.P[1] + 120) { bd = d; best = n; }
        });
        st.drag = best;
      },
      move(s, pt) {
        const st = s.state, g = st.geo;
        if (!pt.down || !st.drag || !g) return;
        st.pos[st.drag] = Sim.clamp(Math.round((pt.x - g.P[0]) / (g.k * g.ca) + g.pv), 0, 100);
      },
      up(s) { s.state.drag = null; }
    }
  });

  /* ======================================================================
     3. Centre of gravity by suspension (plumb lines)
     ====================================================================== */
  const SHAPE = [[-95, -55], [-40, -88], [25, -75], [70, -95], [105, -40], [85, 5], [115, 55], [55, 92], [0, 70], [-50, 95], [-105, 45], [-80, 0]];
  const CG = (function () {
    let A = 0, cx = 0, cy = 0;
    for (let i = 0; i < SHAPE.length; i++) {
      const [x1, y1] = SHAPE[i], [x2, y2] = SHAPE[(i + 1) % SHAPE.length];
      const c = x1 * y2 - x2 * y1;
      A += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c;
    }
    A /= 2;
    return [cx / (6 * A), cy / (6 * A)];
  })();
  const HOLES = [0, 4, 7].map((i) => [SHAPE[i][0] * 0.8 + CG[0] * 0.2, SHAPE[i][1] * 0.8 + CG[1] * 0.2]);
  const CARD_W = 0.05 * G; // a 50 g card
  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
  function plumbGeom(s) {
    const { w, h } = s;
    const sc = Math.min(1.15, w / 400, (h - 70) / 225);
    return { P: [w / 2, 34], sc };
  }

  Sim.create('#sim-plumb', {
    title: 'Centre of gravity by suspension',
    height: (w) => (w >= 640 ? 360 : 340),
    controls: [
      { key: 'hole', type: 'select', label: 'Hang it from', value: '0', options: [['0', 'Hole 1'], ['1', 'Hole 2'], ['2', 'Hole 3']], onChange: (s) => { s.state.om = 0; } },
      { key: 'show', type: 'check', label: 'Reveal the centre of gravity', value: false },
      { type: 'button', label: 'Draw plumb line', onClick: (s) => drawLine(s) },
      { type: 'button', label: 'Clear lines', ghost: true, onClick: (s) => { s.state.lines = []; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { a: 0.9, om: 0, lines: [], drag: null, warn: false }; },
    update(s, dt) {
      const st = s.state;
      if (st.drag) return;
      const H = HOLES[+s.p.hole];
      const r = rot([CG[0] - H[0], CG[1] - H[1]], st.a);
      const rl = Math.hypot(r[0], r[1]) || 1;
      const n = 4, hh = dt / n;
      for (let i = 0; i < n; i++) {
        const rr = rot([CG[0] - H[0], CG[1] - H[1]], st.a);
        const alpha = 20 * (rr[0] / rl) - 1.7 * st.om;
        st.om += alpha * hh;
        st.a += st.om * hh;
      }
      if (Math.abs(st.om) < 0.002 && Math.abs(r[0] / rl) < 0.002) st.om = 0;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const { P, sc } = plumbGeom(s);
      const H = HOLES[+p.hole];
      const toW = (q) => { const v = rot([(q[0] - H[0]) * sc, (q[1] - H[1]) * sc], st.a); return [P[0] + v[0], P[1] + v[1]]; };
      // board
      Sim.rect(ctx, P[0] - 60, 8, 120, 10, { fill: '#a07a4a', r: 2 });
      // lamina
      const pts = SHAPE.map(toW);
      Sim.polyline(ctx, pts, { close: true, fill: '#fff3bf', color: '#d9a400', width: 2 });
      // drawn lines, clipped to the card
      ctx.save();
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.closePath();
      ctx.clip();
      st.lines.forEach((ln) => {
        const a = toW(ln[0]), b = toW(ln[1]);
        const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
        Sim.line(ctx, a[0] - dx / L * 600, a[1] - dy / L * 600, a[0] + dx / L * 600, a[1] + dy / L * 600, { color: C.navy, width: 2 });
      });
      ctx.restore();
      // holes
      HOLES.forEach((q, i) => {
        const c = toW(q);
        Sim.circle(ctx, c[0], c[1], 4.5, { fill: '#fff', stroke: '#7a5d1a', width: 1.5 });
        if (i !== +p.hole) Sim.text(ctx, String(i + 1), c[0] + 9, c[1] - 8, { size: 12, bold: true, color: '#7a5d1a' });
      });
      // intersection of the first two lines
      if (st.lines.length >= 2) {
        const X = intersect(st.lines[0], st.lines[1]);
        if (X) { const c = toW(X); Sim.circle(ctx, c[0], c[1], 7, { stroke: C.orange, width: 2.5 }); }
      }
      // plumb line
      const bobY = h - 22;
      Sim.line(ctx, P[0], P[1], P[0], bobY - 8, { color: '#343a40', width: 1.2 });
      Sim.polyline(ctx, [[P[0], bobY - 8], [P[0] - 6, bobY], [P[0], bobY + 10], [P[0] + 6, bobY]], { close: true, fill: '#495057', color: '#343a40', width: 1 });
      Sim.circle(ctx, P[0], P[1], 4, { fill: C.ink });
      // centre of gravity and its moment arm
      const g = toW(CG);
      if (p.show) {
        Sim.circle(ctx, g[0], g[1], 6, { fill: C.red, stroke: '#fff', width: 2 });
        Sim.arrow(ctx, g[0], g[1], g[0], g[1] + 46, { color: C.red, width: 2.5, head: 8 });
        Sim.text(ctx, 'W', g[0] + 8, g[1] + 40, { size: 13, bold: true, color: C.red });
        const xd = g[0] - P[0];
        if (Math.abs(xd) > 4) {
          Sim.line(ctx, P[0], g[1], g[0], g[1], { color: C.green, width: 2, dash: [5, 4] });
          Sim.text(ctx, 'x', (P[0] + g[0]) / 2, g[1] - 10, { size: 13, bold: true, color: C.green, align: 'center', bg: BG });
        }
      }
      const moving = Math.abs(st.om) > 0.05 || st.drag;
      Sim.text(ctx, moving ? 'swinging…' : 'at rest', 12, 16, { size: 12.5, italic: true, color: moving ? C.orange : C.green });
      if (st.warn && moving) Sim.text(ctx, 'That line was drawn while it was still moving!', 12, h - 12, { size: 12, color: C.red });
      Sim.text(ctx, 'lines: ' + st.lines.length, w - 12, 16, { size: 12.5, color: C.muted, align: 'right' });
    },
    readout(s) {
      const st = s.state, H = HOLES[+s.p.hole];
      const { sc } = plumbGeom(s);
      const r = rot([(CG[0] - H[0]) * sc, (CG[1] - H[1]) * sc], st.a);
      const xm = Math.abs(r[0]) / sc / 1000; // 100 px on the card = 0.10 m
      return [
        ['card weight W =', fx(CARD_W, 2) + ' N'],
        ['horizontal distance x =', fx(xm * 100, 1) + ' cm'],
        ['moment of W about the pin =', fx(CARD_W * xm, 4) + ' N m', true],
        ['lines drawn:', String(st.lines.length)]
      ];
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const { P } = plumbGeom(s);
        s.state.drag = { ang: Math.atan2(pt.y - P[1], pt.x - P[0]) };
        s.state.om = 0;
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const { P } = plumbGeom(s);
        if (Math.hypot(pt.x - P[0], pt.y - P[1]) < 14) return;
        const ang = Math.atan2(pt.y - P[1], pt.x - P[0]);
        let d = ang - st.drag.ang;
        if (d > Math.PI) d -= 2 * Math.PI;
        if (d < -Math.PI) d += 2 * Math.PI;
        st.a += d;
        st.drag.ang = ang;
      },
      up(s) { s.state.drag = null; s.state.om = 0; }
    }
  });
  function drawLine(s) {
    const st = s.state, H = HOLES[+s.p.hole];
    const { sc } = plumbGeom(s);
    // the vertical through the pin, converted to card coordinates
    const back = (v) => { const r = rot(v, -st.a); return [H[0] + r[0] / sc, H[1] + r[1] / sc]; };
    st.lines.push([back([0, 0]), back([0, 300])]);
    if (st.lines.length > 6) st.lines.shift();
    st.warn = Math.abs(st.om) > 0.05;
  }
  function intersect(l1, l2) {
    const [a, b] = l1, [c, d] = l2;
    const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]];
    const den = r[0] * q[1] - r[1] * q[0];
    if (Math.abs(den) < 1e-6) return null;
    const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den;
    return [a[0] + r[0] * t, a[1] + r[1] * t];
  }

  /* ======================================================================
     4. Plank on two supports
     ====================================================================== */
  const PLANK = 4.0;
  function plankSolve(p) {
    const tot = p.Wp + p.Wm;
    let RB = (p.Wp * PLANK / 2 + p.Wm * p.x) / p.b;
    let RA = tot - RB;
    let tips = false;
    if (RA < -1e-9) { tips = true; RA = 0; RB = tot; }
    const xc = p.b + (p.Wp * (p.b - PLANK / 2)) / p.Wm;
    return { RA, RB, tot, tips, xc };
  }

  Sim.create('#sim-plank', {
    title: 'Plank on two supports',
    height: (w) => (w >= 640 ? 380 : 560),
    controls: [
      { key: 'x', label: 'Person’s position x', min: 0, max: 4, step: 0.05, value: 1, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'Wm', label: 'Person’s weight', min: 300, max: 900, step: 10, value: 600, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'Wp', label: 'Plank’s weight', min: 100, max: 400, step: 10, value: 200, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'b', label: 'Position of support B', min: 2, max: 4, step: 0.1, value: 4, unit: 'm', format: (v) => v.toFixed(1) }
    ],
    init(s) { s.state = { geo: null, drag: false }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const r = plankSolve(p);
      const colW = wide ? Math.round(w * 0.56) : w;
      const X0 = 34, kp = (colW - 2 * X0) / PLANK;
      const X = (m) => X0 + m * kp;
      // picture
      const yp = 118;
      st.geo = { X0, kp, y0: 0, y1: yp + 30 };
      Sim.rect(ctx, 0, 0, colW, yp + 40, { fill: '#f6f9fe' });
      Sim.line(ctx, 0, yp + 40, colW, yp + 40, { color: '#8c7a62', width: 2 });
      for (let m = 0; m <= PLANK; m += 1) Sim.text(ctx, m + ' m', X(m), yp + 51, { size: 11, color: C.muted, align: 'center' });
      const tilt = r.tips ? 9 * DEG : 0; // clockwise about B: the A end lifts
      const piv = [X(p.b), yp + 6];
      const tp = (m, dy) => {
        const v = rot([(m - p.b) * kp, dy], tilt);
        return [piv[0] + v[0], piv[1] + v[1]];
      };
      // supports
      [0, p.b].forEach((m, i) => {
        const sx = X(m);
        Sim.polyline(ctx, [[sx, yp + 6], [sx - 13, yp + 40], [sx + 13, yp + 40]], { close: true, fill: '#868e96', color: '#495057', width: 1 });
        Sim.text(ctx, i ? 'B' : 'A', sx + (i ? 18 : -18), yp + 28, { size: 13, bold: true, color: C.navy, align: 'center' });
      });
      // plank
      ctx.save();
      ctx.translate(piv[0], piv[1]);
      ctx.rotate(tilt);
      Sim.rect(ctx, -p.b * kp, -12, PLANK * kp, 12, { fill: '#d9b77e', stroke: '#8c6d46', width: 1.5, r: 2 });
      ctx.restore();
      // person
      const pf = tp(p.x, -12);
      stick(ctx, pf[0], pf[1], 64, C.navy);
      handle(ctx, pf[0], pf[1] - 30, C.navy);
      if (r.tips) Sim.text(ctx, 'R_A = 0: the plank tips about B!', colW / 2, 16, { size: 13.5, bold: true, color: C.red, align: 'center', bg: BG });
      else Sim.text(ctx, 'Drag the person', colW / 2, 16, { size: 12.5, italic: true, color: C.muted, align: 'center' });

      // free-body diagram of the plank
      const fy0 = yp + 64, fh = wide ? h - fy0 - 8 : 190;
      Sim.text(ctx, 'Free-body diagram of the plank', 14, fy0 + 10, { size: 13, bold: true, color: C.navy });
      const ly = fy0 + 24 + (fh - 40) / 2;
      Sim.line(ctx, X(0), ly, X(PLANK), ly, { color: '#8c6d46', width: 6 });
      const fmax = Math.max(r.RA, r.RB, p.Wm, p.Wp, 1);
      const kf = ((fh - 40) / 2 - 18) / fmax;
      const al = (side) => (side > 0 ? 'left' : side < 0 ? 'right' : 'center');
      // every arrow starts where the force acts: reactions point up, weights point down
      const up = (m, F, label, color, side) => {
        if (F * kf < 2) { Sim.text(ctx, label + ' = 0', X(m), ly - 16, { size: 12, bold: true, color, align: 'center', bg: BG }); return; }
        Sim.arrow(ctx, X(m), ly, X(m), ly - F * kf, { color, width: 3 });
        Sim.text(ctx, label + ' ' + fx(F, 0) + ' N', X(m) + side * 6, ly - F * kf + 4, { size: 12, bold: true, color, align: al(side), bg: BG });
      };
      const down = (m, F, label, color, side, ox) => {
        Sim.arrow(ctx, X(m) + ox, ly, X(m) + ox, ly + F * kf, { color, width: 3 });
        Sim.text(ctx, label + ' ' + fx(F, 0) + ' N', X(m) + ox + side * 6, ly + F * kf - 4, { size: 12, bold: true, color, align: al(side), bg: BG });
      };
      const sideP = p.x < PLANK / 2 ? -1 : 1;
      const close = Math.abs(p.x - PLANK / 2) < 0.2;
      up(0, r.RA, 'R_A', C.blue, 1);
      up(p.b, r.RB, 'R_B', C.blue, p.b > 3.6 ? -1 : 1);
      down(PLANK / 2, p.Wp, 'plank', '#868e96', -sideP, close ? -sideP * 5 : 0);
      down(p.x, p.Wm, 'person', C.red, X(p.x) + 110 > colW ? -1 : X(p.x) - 110 < 0 ? 1 : sideP, close ? sideP * 5 : 0);
      for (let m = 0; m <= PLANK; m += 1) Sim.line(ctx, X(m), ly - 4, X(m), ly + 4, { color: '#5b4325', width: 1.5 });

      // graph
      const gb = wide ? { x: colW + 52, y: 34, w: w - colW - 52 - 18, h: h - 34 - 40 } : { x: 54, y: fy0 + fh + 34, w: w - 72, h: h - (fy0 + fh + 34) - 34 };
      const ymax = niceMax(r.tot * 1.3);
      const gr = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: PLANK, ymin: 0, ymax, xlabel: 'x / m', ylabel: 'force / N', title: 'reactions against position', xstep: 1 }, gb)).axes();
      const RBf = (x) => (p.Wp * PLANK / 2 + p.Wm * x) / p.b;
      const RAf = (x) => r.tot - RBf(x);
      const xe = Math.min(PLANK, r.xc);
      if (xe < PLANK) {
        Sim.rect(ctx, gr.px(xe), gr.y, gr.px(PLANK) - gr.px(xe), gr.h, { fill: 'rgba(224,49,49,0.10)' });
        Sim.text(ctx, 'tips', (gr.px(xe) + gr.px(PLANK)) / 2, gr.y + 14, { size: 12, bold: true, color: C.red, align: 'center' });
      }
      gr.hline(r.tot, { color: C.grey });
      Sim.text(ctx, 'R_A + R_B = total weight', gr.x + 8, gr.py(r.tot) - 10, { size: 11.5, color: C.muted, align: 'left', bg: BG });
      gr.plot(RAf, { from: 0, to: xe, color: C.sky, width: 2.6 });
      gr.plot(RBf, { from: 0, to: xe, color: C.navy, width: 2.6 });
      gr.vline(p.x, { color: C.grey });
      gr.dot(Math.min(p.x, xe), Math.max(0, RAf(Math.min(p.x, xe))), { color: C.sky, label: 'R_A', dx: 11, dy: 11 });
      gr.dot(Math.min(p.x, xe), RBf(Math.min(p.x, xe)), { color: C.navy, label: 'R_B', dx: 11, dy: -11 });
    },
    readout(s) {
      const p = s.p, r = plankSolve(p);
      const out = [
        ['R_A =', fx(r.RA, 0) + ' N'],
        ['R_B =', fx(r.RB, 0) + ' N'],
        ['R_A + R_B =', fx(r.RA + r.RB, 0) + ' N'],
        ['clockwise moments about A =', fx(p.Wp * 2 + p.Wm * p.x, 0) + ' N m'],
        ['anticlockwise: R_B × ' + fx(p.b, 1) + ' m =', fx(r.RB * p.b, 0) + ' N m', !r.tips]
      ];
      if (r.tips) out.push(['moments don’t balance:', 'the plank tips about B', true]);
      if (r.xc < PLANK) out.push(['tips once x >', fx(r.xc, 2) + ' m', r.tips]);
      return out;
    },
    pointer: {
      cursor: 'grab',
      touchAction: 'pan-y',
      down(s, pt) {
        const g = s.state.geo;
        s.state.drag = !!g && pt.y < g.y1 + 10;
        this.move(s, pt);
      },
      move(s, pt) {
        const g = s.state.geo;
        if (!pt.down || !s.state.drag || !g) return;
        const x = Sim.clamp(Math.round(((pt.x - g.X0) / g.kp) * 20) / 20, 0, PLANK);
        if (x !== s.p.x) s.set('x', x);
      },
      up(s) { s.state.drag = false; }
    }
  });

  /* ======================================================================
     5. Toppling block (beyond the spec)
     ====================================================================== */
  function toppleGeom(p, psi) {
    const a = p.th * DEG + psi;
    const gx = (p.b / 2) * Math.cos(a) - (p.hh / 2) * Math.sin(a);
    const gy = (p.b / 2) * Math.sin(a) + (p.hh / 2) * Math.cos(a);
    return { a, gx, gy, r: Math.hypot(p.b / 2, p.hh / 2) };
  }

  Sim.create('#sim-topple', {
    title: 'Toppling block (beyond the spec)',
    height: (w) => (w >= 640 ? 360 : 340),
    controls: [
      { key: 'th', label: 'Tilt angle θ', min: 0, max: 60, step: 1, value: 15, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'b', label: 'Base width b', min: 0.3, max: 1.2, step: 0.05, value: 0.6, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'hh', label: 'Height h', min: 0.3, max: 1.6, step: 0.05, value: 1.2, unit: 'm', format: (v) => v.toFixed(2) }
    ],
    onChange(s) { s.state.psi = 0; s.state.om = 0; },
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { psi: 0, om: 0 }; },
    update(s, dt) {
      const st = s.state;
      const g0 = toppleGeom(s.p, st.psi);
      if (g0.gx >= 0 && st.psi <= 0) return;
      const n = 4, hh = dt / n;
      for (let i = 0; i < n; i++) {
        const g = toppleGeom(s.p, st.psi);
        st.om += (-9 * g.gx / g.r) * hh;
        st.psi += st.om * hh;
        if (st.psi >= Math.PI / 2) { st.psi = Math.PI / 2; st.om = 0; break; }
        if (st.psi < 0) { st.psi = 0; st.om = 0; break; }
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const th = p.th * DEG;
      const S = Math.min((h * 0.55) / 1.6, w / 3.6);
      const Pc = [w * 0.52, h * 0.72];
      const M = (x, y) => [Pc[0] + x * S, Pc[1] - y * S];
      // plane
      const far = 2000;
      Sim.polyline(ctx, [[Pc[0] - far * Math.cos(th), Pc[1] + far * Math.sin(th)], [Pc[0] + far * Math.cos(th), Pc[1] - far * Math.sin(th)], [w + 10, h + 10], [-10, h + 10]], { close: true, fill: '#e8dfcc', color: '#8c7a62', width: 2.5 });
      if (p.th >= 3) {
        Sim.line(ctx, Pc[0], Pc[1], Pc[0] + 90, Pc[1], { color: C.grey, width: 1.2, dash: [5, 4] });
        Sim.arc(ctx, Pc[0], Pc[1], 56, -th, 0, { color: C.ink, label: 'θ', labelGap: 12 });
      }
      // block
      const g = toppleGeom(p, st.psi);
      const ca = Math.cos(g.a), sa = Math.sin(g.a);
      const corner = (lx, ly) => M(lx * ca - ly * sa, lx * sa + ly * ca);
      const box = [corner(0, 0), corner(p.b, 0), corner(p.b, p.hh), corner(0, p.hh)];
      Sim.polyline(ctx, box, { close: true, fill: '#cfe0ff', color: C.navy, width: 2 });
      const cg = M(g.gx, g.gy);
      // line of action of the weight
      Sim.line(ctx, cg[0], cg[1], cg[0], Pc[1] + 40, { color: C.red, width: 1.5, dash: [6, 4] });
      const wl = Math.min(44, Math.max(24, (Pc[1] - cg[1]) * 0.55));
      Sim.arrow(ctx, cg[0], cg[1], cg[0], cg[1] + wl, { color: C.red, width: 3 });
      Sim.text(ctx, 'W', cg[0] + 8, cg[1] + 12, { size: 13, bold: true, color: C.red });
      Sim.circle(ctx, cg[0], cg[1], 5, { fill: C.red, stroke: '#fff', width: 1.5 });
      Sim.circle(ctx, Pc[0], Pc[1], 5, { fill: C.ink });
      // moment arm about the corner
      if (Math.abs(g.gx) * S > 3 && st.psi < 0.02) {
        Sim.line(ctx, Pc[0], Pc[1] + 26, cg[0], Pc[1] + 26, { color: g.gx >= 0 ? C.green : C.red, width: 2.5 });
        Sim.line(ctx, Pc[0], Pc[1] + 20, Pc[0], Pc[1] + 32, { color: C.ink, width: 1.2 });
      }
      const stable = toppleGeom(p, 0).gx >= 0;
      const tip = Math.atan(p.b / p.hh) / DEG;
      Sim.text(ctx, stable ? 'Stable: the weight acts inside the base' : 'Topples: the weight acts outside the base', 14, 18, { size: 13.5, bold: true, color: stable ? C.green : C.red });
      Sim.text(ctx, 'tips over at θ = ' + fx(tip, 1) + '°', 14, 38, { size: 12.5, color: C.muted });
      if (st.psi < 0.02) Sim.text(ctx, 'corner it pivots about', Pc[0] - 10, Pc[1] + 48, { size: 11.5, color: C.muted, align: 'right' });
    },
    readout(s) {
      const p = s.p, g = toppleGeom(p, 0);
      return [
        ['critical angle tan⁻¹(b/h) =', fx(Math.atan(p.b / p.hh) / DEG, 1) + '°'],
        ['CoG is', fx(Math.abs(g.gx) * 100, 1) + ' cm ' + (g.gx >= 0 ? 'inside the corner' : 'outside the corner')],
        ['', g.gx >= 0 ? 'moment of W tips it back' : 'moment of W tips it over', true]
      ];
    }
  });
})();
