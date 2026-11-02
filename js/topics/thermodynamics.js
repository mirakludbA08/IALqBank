/* Thermodynamics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const KB = 1.38e-23;   // Boltzmann constant / J K⁻¹
  const U = 1.66e-27;    // atomic mass unit / kg
  const clamp = Sim.clamp;

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
    if (Math.abs(d) < 1e-18) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  /* Round up to 1, 2, 2.5 or 5 × a power of ten. */
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function niceCeilFine(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    return steps.find((k) => n <= k + 1e-9) * p;
  }
  /* Blue (cold) → red (hot) for f in 0..1 */
  const heatColor = (f, a) => 'hsla(' + Math.round(215 - 215 * clamp(f, 0, 1)) + ',78%,' + Math.round(52 - 6 * clamp(f, 0, 1)) + '%,' + (a == null ? 1 : a) + ')';

  /* Thermometer drawn vertically: bulb at the bottom. */
  function thermometer(ctx, x, top, bottom, frac) {
    Sim.rect(ctx, x - 4, top, 8, bottom - top, { fill: '#fff', stroke: '#868e96', width: 1.2, r: 4 });
    const lvl = bottom - 6 - clamp(frac, 0, 1) * (bottom - top - 12);
    Sim.rect(ctx, x - 2, lvl, 4, bottom - lvl, { fill: C.red });
    Sim.circle(ctx, x, bottom + 3, 6.5, { fill: C.red, stroke: '#868e96', width: 1.2 });
  }
  /* Dial gauge. value/max sets the needle; label underneath. */
  function gauge(ctx, cx, cy, r, value, max, label) {
    Sim.circle(ctx, cx, cy, r, { fill: '#fff', stroke: C.axis, width: 2 });
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (a1 - a0) * i / 4;
      Sim.line(ctx, cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7), cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), { color: C.axis, width: 1.5 });
    }
    const a = a0 + (a1 - a0) * clamp(value / max, 0, 1);
    Sim.line(ctx, cx, cy, cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6), { color: C.red, width: 2.5 });
    Sim.circle(ctx, cx, cy, 3, { fill: C.ink });
    if (label) Sim.text(ctx, label, cx, cy + r * 0.55, { size: 11, color: C.muted, align: 'center' });
  }

  /* ======================================================================
     1. Heating curve: ice → water → steam
     ====================================================================== */
  const W = { ci: 2100, cw: 4180, cs: 2010, Lf: 3.34e5, Lv: 2.26e6 };
  function stages(m) {
    return [
      { name: 'ice warming', short: 'ice', kind: 'warm', E: m * W.ci * 20, c: W.ci, from: -20, to: 0 },
      { name: 'melting at 0 °C', short: 'melting', kind: 'change', E: m * W.Lf, L: W.Lf, at: 0 },
      { name: 'water warming', short: 'water', kind: 'warm', E: m * W.cw * 100, c: W.cw, from: 0, to: 100 },
      { name: 'boiling at 100 °C', short: 'boiling', kind: 'change', E: m * W.Lv, L: W.Lv, at: 100 },
      { name: 'steam warming', short: 'steam', kind: 'warm', E: m * W.cs * 20, c: W.cs, from: 100, to: 120 }
    ];
  }
  function heatState(m, E) {
    const st = stages(m);
    let acc = 0;
    for (let i = 0; i < st.length; i++) {
      const g = st[i];
      if (E <= acc + g.E || i === st.length - 1) {
        const f = clamp((E - acc) / g.E, 0, 1);
        return {
          i, g, f,
          theta: g.kind === 'warm' ? g.from + f * (g.to - g.from) : g.at,
          melt: i < 1 ? 0 : i === 1 ? f : 1,
          boil: i < 3 ? 0 : i === 3 ? f : 1
        };
      }
      acc += g.E;
    }
    return null;
  }
  const totalE = (m) => stages(m).reduce((a, g) => a + g.E, 0);
  const NMOL = 24;
  function makeMolecules() {
    const mol = [];
    const order = [];
    for (let i = 0; i < NMOL; i++) order.push(i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    for (let i = 0; i < NMOL; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const hx = 0.17 + col * 0.132, hy = 0.9 - row * 0.105;
      mol.push({ hx, hy, x: hx, y: hy, vx: 0, vy: 0, mode: 'solid', ph: Math.random() * 6.28, ph2: Math.random() * 6.28, rank: order.indexOf(i) });
    }
    return mol;
  }
  function moveMolecules(mol, info, dt, t) {
    const TK = info.theta + 273;
    const nMelt = Math.round(info.melt * NMOL), nBoil = Math.round(info.boil * NMOL);
    for (const q of mol) {
      const mode = q.rank < nBoil ? 'gas' : q.rank < nMelt ? 'liquid' : 'solid';
      if (mode !== q.mode) {
        const a = Math.random() * Math.PI * 2;
        q.vx = Math.cos(a); q.vy = Math.sin(a);
        if (mode === 'gas') q.vy = -Math.abs(q.vy) - 0.3;
        q.mode = mode;
      }
      if (mode === 'solid') {
        const amp = 0.006 + 0.016 * (TK - 250) / 25;
        q.x = q.hx + amp * Math.sin(31 * t + q.ph);
        q.y = q.hy + amp * Math.sin(37 * t + q.ph2);
        continue;
      }
      const sp = (mode === 'gas' ? 0.55 : 0.16) * Math.sqrt(TK / 300);
      if (mode === 'liquid') {
        const turn = (Math.random() - 0.5) * 2.2 * Math.sqrt(dt * 30) * 0.5;
        const c = Math.cos(turn), s = Math.sin(turn);
        const vx = q.vx * c - q.vy * s, vy = q.vx * s + q.vy * c;
        q.vx = vx; q.vy = vy;
      }
      const n = Math.hypot(q.vx, q.vy) || 1;
      q.x += (q.vx / n) * sp * dt;
      q.y += (q.vy / n) * sp * dt;
      const top = mode === 'liquid' ? 0.56 : 0.05;
      if (q.x < 0.06) { q.x = 0.06; q.vx = Math.abs(q.vx); }
      if (q.x > 0.94) { q.x = 0.94; q.vx = -Math.abs(q.vx); }
      if (q.y < top) { q.y = top; q.vy = Math.abs(q.vy); }
      if (q.y > 0.94) { q.y = 0.94; q.vy = -Math.abs(q.vy); }
    }
  }

  Sim.create('#sim-heating', {
    title: 'Heating curve: ice → water → steam',
    height: (w) => (w >= 700 ? 410 : 590),
    controls: [
      { key: 'P', label: 'Heater power P', min: 100, max: 2000, step: 50, value: 400, unit: 'W', format: (v) => v.toFixed(0) },
      { key: 'm', label: 'Mass of ice m (restarts)', min: 0.05, max: 0.5, step: 0.05, value: 0.2, unit: 'kg', format: (v) => v.toFixed(2), onChange: (s) => { s.reset(); } }
    ],
    animate: true,
    init(s) {
      s.state = { E: 0, t: 0, rec: [[0, -20, 0]], mol: makeMolecules(), done: false };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state;
      const m = s.p.m;
      const info0 = heatState(m, st.E);
      moveMolecules(st.mol, info0, dt, s.t);
      if (st.done || dt <= 0) return;
      const Et = totalE(m);
      const dE = (Et / 18) * dt;
      st.E = Math.min(Et, st.E + dE);
      st.t += dE / s.p.P;
      const info = heatState(m, st.E);
      st.rec.push([st.t, info.theta, info.i]);
      if (st.E >= Et) { st.done = true; }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const info = heatState(p.m, st.E);
      const wide = w >= 700;
      let bx, by, bw, bh, gb;
      if (wide) { bx = 22; by = 30; bw = 250; bh = h - 162; gb = { x: 340, y: 34, w: w - 340 - 26, h: h - 34 - 42 }; }
      else { bx = 14; by = 28; bw = Math.min(220, w * 0.6); bh = 190; gb = { x: 50, y: by + bh + 82, w: w - 50 - 18, h: h - (by + bh + 82) - 40 }; }

      /* the container with the molecules */
      const TK = info.theta + 273;
      Sim.rect(ctx, bx, by, bw, bh, { fill: '#f8fbff', stroke: C.axis, width: 2, r: 6 });
      const nMelt = Math.round(info.melt * NMOL);
      if (info.melt > 0 && info.boil < 1) {
        const lt = by + bh * 0.53;
        Sim.rect(ctx, bx + 3, lt, bw - 6, by + bh - lt - 3, { fill: 'rgba(77,171,247,' + (0.10 + 0.14 * info.melt * (1 - info.boil)) + ')', r: 4 });
      }
      const P = (q) => [bx + q.x * bw, by + q.y * bh];
      // bonds between neighbouring solid molecules
      st.mol.forEach((q, i) => {
        if (q.mode !== 'solid') return;
        const col = i % 6, right = st.mol[i + 1], up = st.mol[i + 6];
        if (col < 5 && right && right.mode === 'solid') { const a = P(q), b = P(right); Sim.line(ctx, a[0], a[1], b[0], b[1], { color: '#a5d8ff', width: 2 }); }
        if (up && up.mode === 'solid') { const a = P(q), b = P(up); Sim.line(ctx, a[0], a[1], b[0], b[1], { color: '#a5d8ff', width: 2 }); }
      });
      st.mol.forEach((q) => {
        const [x, y] = P(q);
        const col = q.mode === 'solid' ? '#1c7ed6' : q.mode === 'liquid' ? C.blue : '#74c0fc';
        Sim.circle(ctx, x, y, Math.max(5, bw / 34), { fill: col, stroke: '#fff', width: 1.5 });
      });
      const phase = info.i === 0 ? 'solid' : info.i === 1 ? 'solid + liquid' : info.i === 2 ? 'liquid' : info.i === 3 ? 'liquid + gas' : 'gas';
      Sim.text(ctx, 'molecules: ' + phase, bx + bw / 2, by - 12, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      // heater strip under the container
      Sim.rect(ctx, bx + bw * 0.15, by + bh + 6, bw * 0.7, 9, { fill: heatColor(0.55 + 0.45 * p.P / 2000), r: 3 });
      Sim.text(ctx, 'heater ' + p.P.toFixed(0) + ' W', bx + bw / 2, by + bh + 26, { size: 12, color: C.muted, align: 'center' });

      /* energy bars */
      const keF = clamp((TK - 253) / (393 - 253), 0, 1) * 0.85 + 0.15;
      const peF = (info.melt * W.Lf + info.boil * W.Lv) / (W.Lf + W.Lv);
      const changing = info.g.kind === 'change' && !st.done;
      const warming = info.g.kind === 'warm' && !st.done && st.E > 0;
      if (wide) {
        const y0 = by + bh + 60, bwid = bw - 92;
        [['kinetic', keF, C.red, warming], ['potential', peF, C.purple, changing]].forEach(([lab, f, col, on], k) => {
          const y = y0 + k * 30;
          Sim.text(ctx, lab, bx, y + 8, { size: 12.5, color: on ? col : C.muted, bold: on });
          Sim.rect(ctx, bx + 76, y, bwid, 16, { fill: C.light, r: 4 });
          if (f > 0.002) Sim.rect(ctx, bx + 76, y, bwid * f, 16, { fill: col, r: 4 });
        });
        Sim.text(ctx, 'energy of the molecules', bx + bw / 2, y0 - 13, { size: 11.5, color: C.muted, align: 'center', italic: true });
      } else {
        const x0 = bx + bw + 18, avail = w - x0 - 10, colW = Math.min(36, (avail - 16) / 2);
        const top = by + 18, bot = by + bh - 4;
        [['KE', keF, C.red, warming], ['PE', peF, C.purple, changing]].forEach(([lab, f, col, on], k) => {
          const x = x0 + k * (colW + 16);
          Sim.rect(ctx, x, top, colW, bot - top, { fill: C.light, r: 4 });
          if (f > 0.002) Sim.rect(ctx, x, bot - (bot - top) * f, colW, (bot - top) * f, { fill: col, r: 4 });
          Sim.text(ctx, lab, x + colW / 2, bot + 14, { size: 12.5, bold: true, color: on ? col : C.muted, align: 'center' });
        });
        Sim.text(ctx, 'energy', x0 + colW + 8, by + 4, { size: 11.5, color: C.muted, align: 'center', italic: true });
      }

      /* the heating curve */
      const Et = totalE(p.m);
      const tEnd = st.t + (Et - st.E) / p.P;
      const xmax = niceCeil(tEnd * 1.04);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax, ymin: -30, ymax: 130, ystep: 20, xlabel: 't / s', ylabel: 'θ / °C', title: 'temperature against time' }, gb)).axes();
      g.hline(0, { color: '#a5d8ff' });
      g.hline(100, { color: '#a5d8ff' });
      const rec = st.rec;
      const cols = [C.sky, C.purple, C.blue, C.purple, C.orange];
      let start = 0;
      for (let i = 1; i <= rec.length; i++) {
        if (i === rec.length || rec[i][2] !== rec[start][2]) {
          const seg = rec.slice(Math.max(0, start - 1), i).map((r) => [r[0], r[1]]);
          g.path(seg, { color: cols[rec[start][2]], width: 3 });
          // label the stage once it has some length
          const t0 = rec[start][0], t1 = rec[i - 1][0];
          const gst = stages(p.m)[rec[start][2]];
          const pxw = g.px(t1) - g.px(t0);
          const lcol = rec[start][2] === 0 ? '#1971c2' : cols[rec[start][2]];
          if (gst.kind === 'change' && pxw > 30) {
            if (gst.at === 0) Sim.text(ctx, gst.short + ': ΔE = mL', g.px(t0) + 4, g.py(0) + 28, { size: 11.5, bold: true, color: lcol, align: 'left', bg: 'rgba(255,255,255,0.85)' });
            else Sim.text(ctx, gst.short + ': ΔE = mL', g.px((t0 + t1) / 2), g.py(gst.at) - 13, { size: 11.5, bold: true, color: lcol, align: 'center', bg: 'rgba(255,255,255,0.85)' });
          } else if (gst.kind === 'warm' && pxw > 40 && Math.abs(g.py(rec[i - 1][1]) - g.py(rec[start][1])) > 50) {
            const k = Math.floor((start + i - 1) / 2);
            Sim.text(ctx, gst.short + ': ΔE = mcΔθ', g.px(rec[k][0]) + 10, g.py(rec[k][1]) + 8, { size: 11.5, bold: true, color: lcol, align: 'left', bg: 'rgba(255,255,255,0.85)' });
          }
          start = i;
        }
      }
      // labels for melting / boiling points on the right
      g.label(xmax, 104, 'boiling point', { size: 11, color: '#1971c2', align: 'right', bold: false, baseline: 'bottom' });
      const last = rec[rec.length - 1];
      g.dot(last[0], last[1], { color: C.navy });
      if (st.done) Sim.text(ctx, 'All steam at 120 °C. Press Reset to run again.', gb.x + gb.w / 2, gb.y + 16, { size: 12, italic: true, color: C.muted, align: 'center' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const info = heatState(p.m, st.E);
      const out = [
        ['stage:', info.g.name],
        ['θ =', info.theta.toFixed(1) + ' °C'],
        ['t =', st.t.toFixed(0) + ' s'],
        ['energy supplied =', Sim.fmt(st.E / 1000, 3) + ' kJ']
      ];
      if (info.g.kind === 'warm') out.push(['gradient = P / mc =', Sim.fmt(p.P / (p.m * info.g.c), 3) + ' K s⁻¹', true]);
      else {
        out.push(['changing state at P / L =', Sim.fmt((p.P / info.g.L) * 1000, 3) + ' g s⁻¹', true]);
        out.push([info.i === 1 ? 'melted so far =' : 'boiled so far =', Sim.fmt(info.f * p.m * 1000, 3) + ' g']);
      }
      return out;
    }
  });

  /* ======================================================================
     2. Core practical 13: latent heat of vaporisation
     ====================================================================== */
  const LV_G = 2260;   // J per gram
  const RUN_T = 300;   // seconds per run
  Sim.create('#sim-latent', {
    title: 'Virtual experiment: boiling water on a balance',
    height: (w) => (w >= 660 ? 380 : 640),
    controls: [
      { key: 'P', label: 'Heater power P', min: 20, max: 100, step: 5, value: 50, unit: 'W', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Run for 300 s', onClick: (s) => runHeater(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.last = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], run: null, mass: 250, last: null, bubbles: [] }; },
    update(s, dt) {
      const st = s.state;
      const r = st.run;
      if (r) {
        r.t = Math.min(RUN_T, r.t + dt * 90);
        st.mass = r.m0 - r.dm * (r.t / RUN_T);
        if (Math.random() < dt * 40) st.bubbles.push({ x: Math.random() - 0.5, y: 0, v: 0.6 + Math.random() * 0.6 });
        if (r.t >= RUN_T) {
          st.mass = r.m0 - r.dm;
          st.data.push([r.dm / RUN_T, r.P]);
          st.last = r;
          st.run = null;
          if (st.mass < 160) st.mass = 250;
        }
      }
      st.bubbles.forEach((b) => { b.y += b.v * dt; });
      st.bubbles = st.bubbles.filter((b) => b.y < 1);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 660;
      const sc = wide ? { x: 0, y: 0, w: 290, h } : { x: 0, y: 0, w, h: 280 };
      const cx = sc.x + sc.w / 2 + (wide ? 18 : 30);
      const by = sc.y + sc.h - 64;
      // balance
      Sim.rect(ctx, cx - 92, by, 184, 40, { fill: '#dee2e6', stroke: '#adb5bd', width: 1.5, r: 6 });
      Sim.rect(ctx, cx - 82, by - 7, 164, 7, { fill: '#868e96', r: 2 });
      Sim.rect(ctx, cx - 54, by + 9, 108, 23, { fill: '#212529', r: 4 });
      Sim.text(ctx, st.mass.toFixed(2) + ' g', cx, by + 21, { size: 14, bold: true, color: '#69db7c', align: 'center' });
      Sim.text(ctx, 'top-pan balance', cx, by + 52, { size: 11, color: C.muted, align: 'center' });
      // beaker + water
      const bTop = by - 7 - 136, bL = cx - 56, bR = cx + 56;
      const lvl = by - 7 - st.mass * 0.42;
      Sim.rect(ctx, bL + 2, lvl, bR - bL - 4, by - 9 - lvl, { fill: 'rgba(77,171,247,0.30)' });
      Sim.line(ctx, bL, bTop, bL, by - 7, { color: C.axis, width: 2.5 });
      Sim.line(ctx, bR, bTop, bR, by - 7, { color: C.axis, width: 2.5 });
      Sim.line(ctx, bL, by - 7, bR, by - 7, { color: C.axis, width: 2.5 });
      // heater
      const hx = cx + 18;
      Sim.line(ctx, hx, bTop - 26, hx, by - 32, { color: '#495057', width: 4 });
      ctx.save();
      ctx.strokeStyle = st.run ? C.red : '#868e96';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const a = i / 40 * Math.PI * 8;
        const X = hx - 20 + i, Y = by - 26 + Math.sin(a) * 6;
        if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      ctx.restore();
      // bubbles and steam
      st.bubbles.forEach((b) => {
        const y = by - 30 - b.y * (by - 30 - lvl);
        Sim.circle(ctx, hx + b.x * 36, y, 3, { stroke: '#1c7ed6', width: 1.2 });
      });
      if (st.run) {
        for (let k = 0; k < 3; k++) {
          const x0 = cx - 34 + k * 22, ph = s.t * 3 + k;
          ctx.save();
          ctx.strokeStyle = 'rgba(134,142,150,0.55)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 20; i++) { const yy = lvl - 6 - i * 3; const xx = x0 + Math.sin(ph + i * 0.5) * 4; if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); }
          ctx.stroke();
          ctx.restore();
        }
      }
      // joulemeter / supply
      const jx = sc.x + 12, jy = sc.y + 12;
      Sim.rect(ctx, jx, jy, 112, 50, { fill: '#212529', r: 6 });
      Sim.text(ctx, 'P = ' + (st.run ? st.run.P : p.P).toFixed(0) + ' W', jx + 10, jy + 15, { size: 13, bold: true, color: '#ffd43b' });
      const tShow = st.run ? st.run.t : st.last ? RUN_T : 0;
      Sim.text(ctx, 't = ' + tShow.toFixed(0) + ' s', jx + 10, jy + 35, { size: 13, bold: true, color: '#69db7c' });
      Sim.line(ctx, jx + 112, jy + 25, hx, jy + 25, { color: '#495057', width: 1.5 });
      Sim.line(ctx, hx, jy + 25, hx, bTop - 26, { color: '#495057', width: 1.5 });

      // graph: P against rate of mass loss
      const gb = wide ? { x: sc.w + 66, y: 32, w: w - sc.w - 66 - 22, h: h - 32 - 44 } : { x: 58, y: sc.h + 34, w: w - 58 - 20, h: h - sc.h - 34 - 44 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.05, ymin: 0, ymax: 110, xlabel: 'Δm/Δt / g s⁻¹', ylabel: 'P / W', title: 'power against rate of mass loss' }, gb)).axes();
      const fit = fitLine(st.data);
      if (fit && st.data.length >= 2) {
        g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
        if (fit.c > 0) {
          g.dot(0, fit.c, { color: C.orange, r: 5 });
          g.label(0.0015, fit.c + 6, 'intercept = heat loss rate', { size: 11.5, color: '#b35c00', align: 'left', bg: 'rgba(255,255,255,0.85)' });
        }
      }
      st.data.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!st.data.length) Sim.text(ctx, 'Choose a power and press “Run for 300 s”', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const out = [['runs:', String(st.data.length)]];
      if (st.last) {
        out.push(['last run: Δm =', st.last.dm.toFixed(2) + ' g in 300 s']);
        out.push(['single-run L = Pt/Δm =', Sim.fmt((st.last.P * RUN_T) / (st.last.dm / 1000), 3) + ' J kg⁻¹']);
      }
      const fit = fitLine(st.data);
      if (fit && st.data.length >= 2) {
        out.push(['gradient = L =', Sim.fmt(fit.m * 1000, 3) + ' J kg⁻¹', true]);
        out.push(['heat loss rate =', fit.c.toFixed(1) + ' W']);
      } else if (st.data.length === 1) out.push(['do another run at a different power', 'to draw a line']);
      out.push(['accepted value:', '2.26 × 10⁶ J kg⁻¹']);
      return out;
    }
  });
  function runHeater(s) {
    const st = s.state;
    if (st.run) return;
    const P = s.p.P;
    const loss = 9 + gaussian() * 0.6;
    const dm = Math.max(0.05, ((P - loss) * RUN_T) / LV_G + gaussian() * 0.06);
    st.run = { P, t: 0, m0: st.mass, dm };
  }

  /* ======================================================================
     3. Core practical 12: thermistor potential divider
     ====================================================================== */
  const VIN = 5.0;
  const rTherm = (theta) => 10 * Math.exp(3950 * (1 / (theta + 273.15) - 1 / 298.15)); // kΩ
  const vOut = (theta, R) => (VIN * R) / (R + rTherm(theta));

  Sim.create('#sim-thermistor', {
    title: 'Calibrating a thermistor thermostat',
    height: (w) => (w >= 700 ? 360 : 640),
    controls: [
      { key: 'theta', label: 'Water temperature θ', min: 0, max: 100, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'R', label: 'Fixed resistor R', min: 1, max: 22, step: 0.5, value: 10, unit: 'kΩ', format: (v) => v.toFixed(1), onChange: (s) => { s.state.data = []; } },
      { key: 'vset', label: 'Switch-off voltage', min: 0.5, max: 4.5, step: 0.05, value: 3.0, unit: 'V', format: (v) => v.toFixed(2) },
      { type: 'button', label: 'Record reading', onClick: (s) => {
        const st = s.state;
        const th = s.p.theta;
        st.data = st.data.filter((q) => q[0] !== th);
        st.data.push([th, clamp(vOut(th, s.p.R) + gaussian() * 0.01, 0, VIN)]);
        st.data.sort((a, b) => a[0] - b[0]);
      } },
      { type: 'button', label: 'Clear readings', ghost: true, onClick: (s) => { s.state.data = []; } }
    ],
    init(s) { s.state = { data: [] }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 0, y: 0, w: 380, h } : { x: 0, y: 0, w, h: 300 };
      const L = sc.x + 40, R = sc.x + sc.w * 0.5, VX = sc.x + sc.w * 0.84;
      const T = sc.y + 34, B = sc.y + sc.h - 26, M = sc.y + sc.h * 0.56;
      const yb = (T + B) / 2, yt = T + (M - T) * 0.56, yr = (M + B) / 2;
      const V = vOut(p.theta, p.R);
      const wire = { color: C.ink, width: 2 };
      // wires
      Sim.line(ctx, L, T, R, T, wire);
      Sim.line(ctx, L, B, VX, B, wire);
      Sim.line(ctx, L, T, L, yb - 8, wire);
      Sim.line(ctx, L, yb + 8, L, B, wire);
      Sim.line(ctx, L - 16, yb - 8, L + 16, yb - 8, { color: C.ink, width: 3 });
      Sim.line(ctx, L - 8, yb + 8, L + 8, yb + 8, { color: C.ink, width: 5 });
      Sim.text(ctx, VIN.toFixed(1) + ' V', L + 22, yb, { size: 13, bold: true, color: C.ink });
      // beaker of water around the thermistor
      const bxL = R - 50, bxR = R + 50, bT = T + 14, bB = M - 10;
      Sim.rect(ctx, bxL, bT + 12, bxR - bxL, bB - bT - 12, { fill: heatColor(p.theta / 100, 0.28) });
      Sim.line(ctx, bxL, bT, bxL, bB, { color: C.axis, width: 2 });
      Sim.line(ctx, bxR, bT, bxR, bB, { color: C.axis, width: 2 });
      Sim.line(ctx, bxL, bB, bxR, bB, { color: C.axis, width: 2 });
      thermometer(ctx, R + 34, bT - 6, bB - 12, p.theta / 100);
      Sim.text(ctx, p.theta.toFixed(0) + ' °C', bxR + 6, bT + 4, { size: 12.5, bold: true, color: C.red });
      // thermistor
      Sim.line(ctx, R, T, R, yt - 20, wire);
      Sim.rect(ctx, R - 8, yt - 20, 16, 40, { fill: '#fff', stroke: C.ink, width: 2 });
      Sim.line(ctx, R, yt + 20, R, M, wire);
      Sim.line(ctx, R - 15, yt + 17, R + 15, yt - 17, { color: C.ink, width: 1.8 });
      Sim.line(ctx, R - 22, yt + 17, R - 15, yt + 17, { color: C.ink, width: 1.8 });
      Sim.text(ctx, 'thermistor', bxL - 6, yt, { size: 11.5, color: C.muted, align: 'right' });
      // fixed resistor
      Sim.line(ctx, R, M, R, yr - 20, wire);
      Sim.rect(ctx, R - 8, yr - 20, 16, 40, { fill: '#fff', stroke: C.ink, width: 2 });
      Sim.line(ctx, R, yr + 20, R, B, wire);
      Sim.text(ctx, 'R = ' + p.R.toFixed(1) + ' kΩ', R - 16, yr, { size: 12.5, bold: true, color: C.navy, align: 'right' });
      // voltmeter across the fixed resistor
      Sim.line(ctx, R, M, VX, M, wire);
      Sim.line(ctx, VX, M, VX, yr - 17, wire);
      Sim.line(ctx, VX, yr + 17, VX, B, wire);
      Sim.circle(ctx, VX, yr, 17, { fill: '#fff', stroke: C.ink, width: 2 });
      Sim.text(ctx, 'V', VX, yr + 1, { size: 15, bold: true, color: C.ink, align: 'center' });
      Sim.text(ctx, V.toFixed(2) + ' V', VX, M - 12, { size: 13, bold: true, color: C.blue, align: 'center', bg: 'rgba(255,255,255,0.9)' });
      [[R, M], [R, B]].forEach(([x, y]) => Sim.circle(ctx, x, y, 3.5, { fill: C.ink }));
      // thermostat state
      const on = V < p.vset;
      Sim.text(ctx, on ? 'heater ON' : 'heater OFF', sc.x + sc.w - 10, sc.y + 14, { size: 12.5, bold: true, color: '#fff', align: 'right', bg: on ? C.red : C.grey, pad: 5 });

      // calibration graph
      const gb = wide ? { x: sc.w + 52, y: 32, w: w - sc.w - 52 - 22, h: h - 32 - 44 } : { x: 50, y: sc.h + 40, w: w - 50 - 20, h: h - sc.h - 40 - 44 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 100, ymin: 0, ymax: 5, xlabel: 'θ / °C', ylabel: 'V_out / V', title: 'calibration curve' }, gb)).axes();
      const pts = st.data;
      if (pts.length >= 2) g.path(pts, { color: C.blue, width: 2.2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      g.hline(p.vset, { color: C.orange, dash: [6, 4] });
      g.label(2, p.vset + 0.22, 'switch-off voltage', { size: 11, color: '#b35c00', align: 'left', bold: false });
      const sw = switchTemp(pts, p.vset);
      if (sw != null) {
        Sim.line(ctx, g.px(sw), g.py(p.vset), g.px(sw), g.py(0), { color: C.orange, dash: [4, 4], width: 1.5 });
        g.label(sw, 0.35, Math.round(sw) + ' °C', { size: 12, color: '#b35c00', align: sw > 80 ? 'right' : 'left', bg: 'rgba(255,255,255,0.9)' });
      }
      Sim.circle(ctx, g.px(p.theta), g.py(V), 7, { stroke: C.red, width: 2 });
      if (!pts.length) Sim.text(ctx, 'Set a temperature and press “Record reading”', gb.x + gb.w / 2 + 10, gb.y + gb.h - 30, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const p = s.p;
      const Rth = rTherm(p.theta);
      const V = vOut(p.theta, p.R);
      const dV = (vOut(Math.min(100, p.theta + 0.5), p.R) - vOut(Math.max(0, p.theta - 0.5), p.R)) / ((Math.min(100, p.theta + 0.5) - Math.max(0, p.theta - 0.5)) || 1);
      const sw = switchTemp(s.state.data, p.vset);
      return [
        ['R_th =', Sim.fmt(Rth, 3) + ' kΩ'],
        ['V_out = 5.0 × R/(R + R_th) =', V.toFixed(2) + ' V'],
        ['sensitivity here =', (dV * 1000).toFixed(0) + ' mV per K', true],
        ['readings:', String(s.state.data.length)],
        ['switches off at', sw == null ? 'record readings either side' : sw.toFixed(0) + ' °C (from your curve)']
      ];
    }
  });
  function switchTemp(pts, v) {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if ((a[1] - v) * (b[1] - v) <= 0 && a[1] !== b[1]) return a[0] + ((v - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
    }
    return null;
  }

  /* ======================================================================
     4. Absolute zero: extrapolating pressure against temperature
     ====================================================================== */
  const FLASK = { A: { p0: 100, col: C.blue, name: 'flask A' }, B: { p0: 150, col: C.red, name: 'flask B' } };
  const pFlask = (f, th) => FLASK[f].p0 * (th + 273.15) / 273.15;

  Sim.create('#sim-zero', {
    title: 'Finding absolute zero',
    height: (w) => (w >= 680 ? 350 : 590),
    controls: [
      { key: 'theta', label: 'Water bath temperature θ', min: 0, max: 100, step: 5, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'flask', type: 'select', label: 'Gas sample', value: 'A', options: [['A', 'Flask A: less gas'], ['B', 'Flask B: more gas']] },
      { key: 'ext', type: 'check', label: 'Extrapolate to zero pressure', value: false },
      { type: 'button', label: 'Take reading', onClick: (s) => {
        const st = s.state, f = s.p.flask, th = s.p.theta;
        st.data = st.data.filter((q) => !(q.f === f && q.th === th));
        st.data.push({ f, th, p: pFlask(f, th) + gaussian() * 0.2 });
      } },
      { type: 'button', label: 'Clear readings', ghost: true, onClick: (s) => { s.state.data = []; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      const mol = [];
      for (let i = 0; i < 22; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.8; mol.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, a: Math.random() * 6.28 }); }
      s.state = { data: [], mol };
    },
    update(s, dt) {
      const sp = 0.9 * Math.sqrt((s.p.theta + 273) / 293);
      s.state.mol.forEach((q) => {
        q.x += Math.cos(q.a) * sp * dt; q.y += Math.sin(q.a) * sp * dt;
        const r = Math.hypot(q.x, q.y);
        if (r > 0.86) {
          const nx = q.x / r, ny = q.y / r;
          let vx = Math.cos(q.a), vy = Math.sin(q.a);
          const d = vx * nx + vy * ny;
          if (d > 0) { vx -= 2 * d * nx; vy -= 2 * d * ny; q.a = Math.atan2(vy, vx); }
          q.x = nx * 0.86; q.y = ny * 0.86;
        }
      });
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: 240, h } : { x: 0, y: 0, w, h: 240 };
      const cx = sc.x + sc.w / 2;
      const pNow = pFlask(p.flask, p.theta);
      // bath
      const bathT = sc.y + sc.h * 0.4, bathB = sc.y + sc.h - 18;
      const bL = cx - Math.min(100, sc.w * 0.4), bR = cx + Math.min(100, sc.w * 0.4);
      Sim.rect(ctx, bL, bathT + 10, bR - bL, bathB - bathT - 10, { fill: heatColor(p.theta / 100, 0.25) });
      Sim.line(ctx, bL, bathT, bL, bathB, { color: C.axis, width: 2 });
      Sim.line(ctx, bR, bathT, bR, bathB, { color: C.axis, width: 2 });
      Sim.line(ctx, bL, bathB, bR, bathB, { color: C.axis, width: 2 });
      // flask
      const fr = Math.min(52, (bathB - bathT) * 0.36);
      const fy = bathB - fr - 12;
      const gy = sc.y + 38;
      Sim.rect(ctx, cx - 6, gy + 26, 12, fy - fr - gy - 24, { fill: '#f1f3f5', stroke: C.axis, width: 1.5 });
      Sim.circle(ctx, cx, fy, fr, { fill: '#f8fbff', stroke: C.axis, width: 2 });
      const col = FLASK[p.flask].col;
      const nShow = p.flask === 'B' ? 22 : 15;
      st.mol.slice(0, nShow).forEach((q) => Sim.circle(ctx, cx + q.x * fr, fy + q.y * fr, 3.5, { fill: col }));
      gauge(ctx, cx, gy, 28, pNow, 200, 'kPa');
      Sim.text(ctx, pNow.toFixed(0) + ' kPa', cx + 36, gy - 8, { size: 13, bold: true, color: col });
      thermometer(ctx, bR - 16, bathT - 18, bathB - 16, p.theta / 100);
      Sim.text(ctx, p.theta.toFixed(0) + ' °C', bR - 26, bathT - 6, { size: 12.5, bold: true, color: C.red, align: 'right' });

      // graph
      const gb = wide ? { x: sc.w + 58, y: 30, w: w - sc.w - 58 - 22, h: h - 30 - 44 } : { x: 54, y: sc.h + 36, w: w - 54 - 18, h: h - sc.h - 36 - 44 };
      const g = Sim.graph(ctx, Object.assign({ xmin: -300, xmax: 100, ymin: 0, ymax: 200, xstep: 100, xlabel: 'θ / °C', ylabel: 'p / kPa', title: 'pressure against temperature' }, gb)).axes();
      const intercepts = [];
      ['A', 'B'].forEach((f) => {
        const pts = st.data.filter((q) => q.f === f).map((q) => [q.th, q.p]);
        const fit = pts.length >= 2 ? fitLine(pts) : null;
        if (fit && Math.abs(fit.m) > 1e-6) {
          const x0 = -fit.c / fit.m;
          g.plot((x) => fit.m * x + fit.c, { from: 0, to: 100, color: FLASK[f].col, width: 2 });
          if (p.ext) {
            g.plot((x) => fit.m * x + fit.c, { from: Math.max(-300, x0), to: 0, color: FLASK[f].col, width: 1.8, dash: [6, 5] });
            intercepts.push([f, x0]);
          }
        }
        pts.forEach((q) => g.dot(q[0], q[1], { color: FLASK[f].col, r: 4.5 }));
      });
      if (p.ext) {
        g.vline(-273, { color: C.green, dash: [3, 4] });
        intercepts.forEach(([f, x0], k) => {
          if (x0 > -300 && x0 < 0) {
            g.dot(x0, 0, { color: FLASK[f].col, r: 5 });
            g.label(x0 + 6, 16 + k * 18, Math.round(x0) + ' °C', { size: 12, color: FLASK[f].col, align: 'left', bg: 'rgba(255,255,255,0.9)' });
          }
        });
        g.label(-292, 185, 'absolute zero, −273 °C', { size: 11.5, color: C.green, align: 'left', bold: false, bg: 'rgba(255,255,255,0.85)' });
      }
      Sim.circle(ctx, g.px(p.theta), g.py(pNow), 7, { stroke: col, width: 2 });
      if (!st.data.length) Sim.text(ctx, wide ? 'Press “Take reading” at a few temperatures' : 'Take a few readings', gb.x + gb.w * 0.36, gb.y + gb.h * 0.3, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const p = s.p;
      const out = [['T = θ + 273 =', (p.theta + 273).toFixed(0) + ' K'], ['p =', pFlask(p.flask, p.theta).toFixed(1) + ' kPa']];
      const pts = s.state.data.filter((q) => q.f === p.flask).map((q) => [q.th, q.p]);
      const fit = pts.length >= 2 ? fitLine(pts) : null;
      if (fit && Math.abs(fit.m) > 1e-6) {
        out.push(['gradient =', fit.m.toFixed(3) + ' kPa K⁻¹']);
        out.push(['line meets p = 0 at', (-fit.c / fit.m).toFixed(0) + ' °C', true]);
      } else out.push([FLASK[p.flask].name + ':', 'take at least 2 readings']);
      return out;
    }
  });

  /* ======================================================================
     5. Core practical 14: Boyle's law with a syringe
     ====================================================================== */
  const NKT = 5000;   // kPa cm³ (p = 100 kPa at 50 cm³)
  const VDEAD = 4;    // cm³
  const pSyringe = (V, dead) => NKT / (V + (dead ? VDEAD : 0));

  Sim.create('#sim-boyle', {
    title: "Virtual experiment: Boyle's law",
    height: (w) => (w >= 700 ? 350 : 560),
    controls: [
      { key: 'V', label: 'Volume reading V', min: 20, max: 60, step: 1, value: 50, unit: 'cm³', format: (v) => v.toFixed(0) },
      { key: 'plot', type: 'select', label: 'Graph', value: 'pV', options: [['pV', 'p against V'], ['pinv', 'p against 1/V'], ['vinv', 'V against 1/p']] },
      { key: 'dead', type: 'check', label: 'Dead volume in the tubing (clears readings)', value: false, onChange: (s) => { s.state.data = []; } },
      { type: 'button', label: 'Record reading', onClick: (s) => {
        const st = s.state, V = s.p.V;
        st.data = st.data.filter((q) => q[0] !== V);
        st.data.push([V, pSyringe(V, s.p.dead) + gaussian() * 0.5]);
      } },
      { type: 'button', label: 'Clear readings', ghost: true, onClick: (s) => { s.state.data = []; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      const mol = [];
      for (let i = 0; i < 34; i++) { const a = Math.random() * 6.28; mol.push({ u: Math.random(), v: Math.random(), vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 }); }
      s.state = { data: [], mol, len: 200, wid: 40 };
    },
    update(s, dt) {
      const st = s.state;
      st.mol.forEach((q) => {
        q.u += (q.vx * dt) / st.len; q.v += (q.vy * dt) / st.wid;
        if (q.u < 0) { q.u = -q.u; q.vx = Math.abs(q.vx); }
        if (q.u > 1) { q.u = 2 - q.u; q.vx = -Math.abs(q.vx); }
        if (q.v < 0) { q.v = -q.v; q.vy = Math.abs(q.vy); }
        if (q.v > 1) { q.v = 2 - q.v; q.vy = -Math.abs(q.vy); }
        q.u = clamp(q.u, 0, 1); q.v = clamp(q.v, 0, 1);
      });
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.5), h } : { x: 0, y: 0, w, h: 200 };
      const pNow = pSyringe(p.V, p.dead);
      // syringe geometry
      const bx0 = sc.x + 70, rodLen = wide ? 80 : 70;
      const len = sc.w - 70 - rodLen - 30;
      const pxPerCm3 = len / 62;
      const yc = sc.y + sc.h * (wide ? 0.56 : 0.58), bh = wide ? 60 : 46;
      const xp = bx0 + p.V * pxPerCm3;
      // barrel
      Sim.rect(ctx, bx0, yc - bh / 2, xp - bx0, bh, { fill: 'rgba(77,171,247,0.13)' });
      Sim.line(ctx, bx0, yc - bh / 2, bx0 + len, yc - bh / 2, { color: C.axis, width: 2 });
      Sim.line(ctx, bx0, yc + bh / 2, bx0 + len, yc + bh / 2, { color: C.axis, width: 2 });
      Sim.line(ctx, bx0, yc - bh / 2, bx0, yc - 6, { color: C.axis, width: 2 });
      Sim.line(ctx, bx0, yc + 6, bx0, yc + bh / 2, { color: C.axis, width: 2 });
      for (let v = 0; v <= 60; v += 10) {
        const X = bx0 + v * pxPerCm3;
        Sim.line(ctx, X, yc + bh / 2, X, yc + bh / 2 + 6, { color: C.axis, width: 1 });
        Sim.text(ctx, String(v), X, yc + bh / 2 + 9, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'cm³', bx0 + 60 * pxPerCm3 + 14, yc + bh / 2 + 9, { size: 11, color: C.muted, align: 'left', baseline: 'top' });
      // molecules
      st.len = Math.max(10, xp - bx0); st.wid = bh - 8;
      st.mol.forEach((q) => Sim.circle(ctx, bx0 + 4 + q.u * (xp - bx0 - 8), yc - bh / 2 + 4 + q.v * (bh - 8), 3.2, { fill: C.blue }));
      // plunger
      Sim.rect(ctx, xp, yc - bh / 2 + 2, 8, bh - 4, { fill: '#495057', r: 2 });
      Sim.rect(ctx, xp + 8, yc - 4, rodLen, 8, { fill: '#868e96' });
      Sim.rect(ctx, xp + 8 + rodLen, yc - 20, 8, 40, { fill: '#495057', r: 2 });
      // tubing and gauge
      const gx = sc.x + 36, gy = yc - 74;
      const tube = p.dead ? { color: 'rgba(240,140,0,0.75)', width: 9 } : { color: C.axis, width: 3 };
      Sim.line(ctx, bx0, yc, gx, yc, tube);
      Sim.line(ctx, gx, yc, gx, gy + 28, tube);
      if (p.dead) Sim.text(ctx, 'dead volume', gx + 8, yc - 14, { size: 11.5, color: '#b35c00', bold: true });
      gauge(ctx, gx, gy, 27, pNow, 300, 'kPa');
      Sim.text(ctx, 'p = ' + pNow.toFixed(1) + ' kPa', gx + 34, gy - 10, { size: 13, bold: true, color: C.navy });
      Sim.text(ctx, 'V = ' + p.V.toFixed(0) + ' cm³', xp, yc - bh / 2 - 12, { size: 12.5, bold: true, color: C.blue, align: 'center' });
      Sim.text(ctx, 'temperature held at 20 °C', bx0 + len / 2, yc + bh / 2 + 34, { size: 12, color: C.muted, align: 'center', italic: true });

      // graph
      const gb = wide ? { x: sc.w + 60, y: 30, w: w - sc.w - 60 - 22, h: h - 30 - 44 } : { x: 56, y: sc.h + 36, w: w - 56 - 20, h: h - sc.h - 36 - 44 };
      const pts = st.data;
      let g, xy;
      if (p.plot === 'pV') {
        g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 65, ymin: 0, ymax: 300, xlabel: 'V / cm³', ylabel: 'p / kPa', title: 'p against V' }, gb)).axes();
        xy = pts.map((q) => [q[0], q[1]]);
        if (xy.length >= 3) {
          const k = xy.reduce((a, q) => a + q[0] * q[1], 0) / xy.length;
          g.plot((x) => (x > 1 ? k / x : null), { from: 12, to: 65, color: C.orange, width: 1.8, dash: [6, 4] });
        }
        Sim.circle(ctx, g.px(p.V), g.py(pNow), 7, { stroke: C.red, width: 2 });
      } else if (p.plot === 'pinv') {
        g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.055, ymin: 0, ymax: 300, xstep: 0.01, xlabel: '1/V / cm⁻³', ylabel: 'p / kPa', title: 'p against 1/V' }, gb)).axes();
        xy = pts.map((q) => [1 / q[0], q[1]]);
        const fit = xy.length >= 2 ? fitLine(xy) : null;
        if (fit) g.plot((x) => fit.m * x + fit.c, { from: 0, to: 0.055, color: C.orange, width: 2 });
        Sim.circle(ctx, g.px(1 / p.V), g.py(pNow), 7, { stroke: C.red, width: 2 });
      } else {
        g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.014, ymin: -10, ymax: 70, xstep: 0.002, ystep: 10, xlabel: '1/p / kPa⁻¹', ylabel: 'V / cm³', title: 'V against 1/p' }, gb)).axes();
        xy = pts.map((q) => [1 / q[1], q[0]]);
        const fit = xy.length >= 2 ? fitLine(xy) : null;
        if (fit) {
          g.plot((x) => fit.m * x + fit.c, { from: 0, to: 0.014, color: C.orange, width: 2 });
          g.dot(0, fit.c, { color: C.orange, r: 5 });
          g.label(0.0004, fit.c - 4, 'intercept ' + fit.c.toFixed(1) + ' cm³', { size: 11.5, color: '#b35c00', align: 'left', bg: 'rgba(255,255,255,0.85)' });
        }
        Sim.circle(ctx, g.px(1 / pNow), g.py(p.V), 7, { stroke: C.red, width: 2 });
      }
      xy.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Set a volume and press “Record reading”', gb.x + gb.w / 2, gb.y + gb.h * 0.35, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const p = s.p, pts = s.state.data;
      const pNow = pSyringe(p.V, p.dead);
      const out = [['readings:', String(pts.length)], ['pV now =', (pNow * p.V).toFixed(0) + ' kPa cm³']];
      if (pts.length >= 2) {
        if (p.plot === 'vinv') {
          const fit = fitLine(pts.map((q) => [1 / q[1], q[0]]));
          if (fit) out.push(['intercept on V axis =', fit.c.toFixed(1) + ' cm³', true]);
        } else {
          const fit = fitLine(pts.map((q) => [1 / q[0], q[1]]));
          if (fit) {
            const nkt = fit.m * 1e3 * 1e-6;   // kPa cm³ → J
            out.push(['gradient of p–1/V = NkT =', Sim.fmt(nkt, 3) + ' J', true]);
            out.push(['so N = gradient / kT =', Sim.fmt(nkt / (KB * 293), 3) + ' molecules']);
            out.push(['p–1/V intercept =', fit.c.toFixed(1) + ' kPa']);
          }
        }
      }
      return out;
    }
  });

  /* ======================================================================
     6. Gas in a box: kinetic theory
     ====================================================================== */
  const GASES = { he: { m: 4 * U, name: 'helium', u: 4 }, n2: { m: 28 * U, name: 'nitrogen', u: 28 }, xe: { m: 131 * U, name: 'xenon', u: 131 } };
  const BOX_H = 10e-9, BOX_D = 10e-9;   // m
  const TIME_SCALE = 2.6e-11;           // simulated seconds per real second
  function gasInit(s) {
    const st = s.state;
    st.mol = [];
    addMolecules(s, s.p.N);
    st.gas = s.p.gas; st.T = s.p.T; st.L = s.p.V * 1e-9;
    resetMeasure(st);
  }
  function addMolecules(s, n) {
    const st = s.state, m = GASES[s.p.gas].m, sig = Math.sqrt((KB * s.p.T) / m);
    const L = s.p.V * 1e-9;
    for (let i = 0; i < n; i++) {
      st.mol.push({ x: Math.random() * L, y: Math.random() * BOX_H, z: Math.random() * BOX_D, vx: gaussian() * sig, vy: gaussian() * sig, vz: gaussian() * sig });
    }
    normaliseEnergy(s);
  }
  function normaliseEnergy(s) {
    const st = s.state, m = GASES[s.p.gas].m;
    if (!st.mol.length) return;
    const c2 = st.mol.reduce((a, q) => a + q.vx * q.vx + q.vy * q.vy + q.vz * q.vz, 0) / st.mol.length;
    const k = c2 > 0 ? Math.sqrt((3 * KB * s.p.T) / m / c2) : 1;
    st.mol.forEach((q) => { q.vx *= k; q.vy *= k; q.vz *= k; });
  }
  function resetMeasure(st) { st.imp = 0; st.tm = 0; st.hits = 0; }
  function crms(s) { return Math.sqrt((3 * KB * s.p.T) / GASES[s.p.gas].m); }

  Sim.create('#sim-gas', {
    title: 'Gas in a box: pressure from collisions',
    height: (w) => (w >= 700 ? 360 : 640),
    controls: [
      { key: 'T', label: 'Temperature T', min: 50, max: 1000, step: 10, value: 300, unit: 'K', format: (v) => v.toFixed(0) },
      { key: 'V', label: 'Volume V', min: 4, max: 10, step: 0.5, value: 10, unit: '× 10⁻²⁵ m³', format: (v) => v.toFixed(1) },
      { key: 'N', label: 'Number of molecules N', min: 10, max: 200, step: 10, value: 60, format: (v) => v.toFixed(0) },
      { key: 'gas', type: 'select', label: 'Gas', value: 'n2', options: [['he', 'Helium (4 u)'], ['n2', 'Nitrogen (28 u)'], ['xe', 'Xenon (131 u)']] },
      { key: 'mb', type: 'check', label: 'Show Maxwell–Boltzmann curve (beyond the spec)', value: false },
      { type: 'button', label: 'Give every molecule the same speed', ghost: true, onClick: (s) => {
        const c = crms(s);
        s.state.mol.forEach((q) => {
          const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
          q.vx = c * r * Math.cos(a); q.vy = c * r * Math.sin(a); q.vz = c * z;
        });
        resetMeasure(s.state);
      } }
    ],
    animate: true,
    onChange(s, key) {
      const st = s.state;
      if (key === 'T') { const k = Math.sqrt(s.p.T / st.T); st.mol.forEach((q) => { q.vx *= k; q.vy *= k; q.vz *= k; }); st.T = s.p.T; }
      if (key === 'gas') { const k = Math.sqrt(GASES[st.gas].m / GASES[s.p.gas].m); st.mol.forEach((q) => { q.vx *= k; q.vy *= k; q.vz *= k; }); st.gas = s.p.gas; }
      if (key === 'V') { const L = s.p.V * 1e-9, k = L / st.L; st.mol.forEach((q) => { q.x *= k; }); st.L = L; }
      if (key === 'N') {
        if (s.p.N > st.mol.length) addMolecules(s, s.p.N - st.mol.length);
        else st.mol.length = s.p.N;
      }
      if (key !== 'mb') resetMeasure(st);
    },
    init(s) { s.state = { flashes: [] }; gasInit(s); },
    update(s, dt) {
      const st = s.state;
      if (dt <= 0) return;
      const m = GASES[s.p.gas].m, L = st.L;
      const tau = dt * TIME_SCALE;
      let imp = 0;
      for (const q of st.mol) {
        q.x += q.vx * tau; q.y += q.vy * tau; q.z += q.vz * tau;
        if (q.x < 0) { q.x = -q.x; q.vx = -q.vx; imp += 2 * m * Math.abs(q.vx); st.hits++; }
        if (q.x > L) { q.x = 2 * L - q.x; q.vx = -q.vx; imp += 2 * m * Math.abs(q.vx); st.hits++; st.flashes.push({ y: q.y, t: 0 }); }
        if (q.y < 0) { q.y = -q.y; q.vy = -q.vy; imp += 2 * m * Math.abs(q.vy); st.hits++; }
        if (q.y > BOX_H) { q.y = 2 * BOX_H - q.y; q.vy = -q.vy; imp += 2 * m * Math.abs(q.vy); st.hits++; }
        if (q.z < 0) { q.z = -q.z; q.vz = -q.vz; imp += 2 * m * Math.abs(q.vz); st.hits++; }
        if (q.z > BOX_D) { q.z = 2 * BOX_D - q.z; q.vz = -q.vz; imp += 2 * m * Math.abs(q.vz); st.hits++; }
        q.x = clamp(q.x, 0, L); q.y = clamp(q.y, 0, BOX_H); q.z = clamp(q.z, 0, BOX_D);
      }
      st.imp += imp; st.tm += tau;
      // random elastic collisions between pairs of molecules (they share energy, total unchanged)
      const n = st.mol.length;
      const nColl = Math.min(n, Math.round(n * 1.5 * dt + Math.random()));
      for (let k = 0; k < nColl && n > 1; k++) {
        const i = Math.floor(Math.random() * n);
        let j = Math.floor(Math.random() * (n - 1)); if (j >= i) j++;
        const a = st.mol[i], b = st.mol[j];
        const cx = (a.vx + b.vx) / 2, cy = (a.vy + b.vy) / 2, cz = (a.vz + b.vz) / 2;
        const g = Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz) / 2;
        const z = Math.random() * 2 - 1, ph = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
        const ux = r * Math.cos(ph) * g, uy = r * Math.sin(ph) * g, uz = z * g;
        a.vx = cx + ux; a.vy = cy + uy; a.vz = cz + uz;
        b.vx = cx - ux; b.vy = cy - uy; b.vz = cz - uz;
      }
      st.flashes.forEach((f) => { f.t += dt; });
      st.flashes = st.flashes.filter((f) => f.t < 0.35);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const S = wide ? Math.min(h - 70, w * 0.42) : Math.min(w - 60, 280);
      const ox = wide ? 34 : (w - S) / 2 - 8, oy = 34;
      const bw = S * (st.L / 10e-9);
      // max-volume outline and box
      Sim.rect(ctx, ox, oy, S, S, { stroke: '#ced4da', width: 1.2, dash: [5, 5] });
      Sim.rect(ctx, ox, oy, bw, S, { fill: '#f8fbff', stroke: C.axis, width: 2 });
      Sim.rect(ctx, ox + bw, oy - 6, 9, S + 12, { fill: '#868e96', r: 2 });
      Sim.text(ctx, 'moving wall', ox + bw + 4, oy + S + 18, { size: 11, color: C.muted, align: 'center' });
      st.flashes.forEach((f) => {
        const y = oy + (f.y / BOX_H) * S;
        Sim.line(ctx, ox + bw - 1, y - 5, ox + bw - 1, y + 5, { color: C.orange, width: 4, alpha: 1 - f.t / 0.35 });
      });
      const cr = crms(s);
      st.mol.forEach((q) => {
        const sp = Math.hypot(q.vx, q.vy, q.vz);
        const x = ox + (q.x / st.L) * bw, y = oy + (q.y / BOX_H) * S;
        Sim.circle(ctx, x, y, 3.2 + 1.6 * (q.z / BOX_D), { fill: heatColor(sp / (2 * cr)) });
      });
      Sim.text(ctx, GASES[p.gas].name + ' at ' + p.T.toFixed(0) + ' K', ox, oy - 14, { size: 12.5, bold: true, color: C.navy });
      Sim.text(ctx, '10 nm', ox - 8, oy + S / 2, { size: 11, color: C.muted, align: 'center', rotate: -Math.PI / 2 });

      // speed histogram
      const gb = wide ? { x: ox + S + 96, y: 34, w: w - (ox + S + 96) - 22, h: h - 34 - 44 } : { x: 46, y: oy + S + 50, w: w - 46 - 18, h: h - (oy + S + 50) - 40 };
      const cmax = niceCeilFine(2.4 * cr);
      const nb = 14, bwid = cmax / nb;
      const counts = new Array(nb).fill(0);
      st.mol.forEach((q) => { const k = Math.floor(Math.hypot(q.vx, q.vy, q.vz) / bwid); if (k >= 0 && k < nb) counts[k]++; });
      const fmb = (c) => { const a = GASES[p.gas].m / (2 * KB * p.T); return 4 * Math.PI * Math.pow(a / Math.PI, 1.5) * c * c * Math.exp(-a * c * c); };
      const peak = st.mol.length * bwid * fmb(Math.sqrt(2 * KB * p.T / GASES[p.gas].m));
      const ymax = niceCeil(Math.max(Math.max.apply(null, counts), peak) * 1.25);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: cmax, ymin: 0, ymax, xlabel: 'c / m s⁻¹', ylabel: 'molecules', title: 'speed distribution' }, gb)).axes();
      counts.forEach((n, k) => {
        if (!n) return;
        const x0 = g.px(k * bwid) + 1, x1 = g.px((k + 1) * bwid) - 1;
        Sim.rect(ctx, x0, g.py(n), x1 - x0, g.py(0) - g.py(n), { fill: heatColor((k + 0.5) * bwid / (2 * cr), 0.75) });
      });
      if (p.mb) {
        g.plot((c) => st.mol.length * bwid * fmb(c), { color: C.orange, width: 2.5 });
        g.label(cmax, ymax * 0.93, 'Maxwell–Boltzmann (beyond the spec)', { size: 11, color: '#b35c00', align: 'right', bold: false, bg: 'rgba(255,255,255,0.85)' });
      }
      g.vline(cr, { color: C.navy, dash: [5, 4] });
      g.label(cr, ymax * (p.mb ? 0.8 : 0.92), ' c_rms', { size: 12, color: C.navy, align: 'left' });
    },
    readout(s) {
      const st = s.state, p = s.p, m = GASES[p.gas].m;
      const V = p.V * 1e-25;
      const pth = (st.mol.length * KB * p.T) / V;
      const area = 2 * (st.L * BOX_H + st.L * BOX_D + BOX_H * BOX_D);
      const pm = st.tm > 0 ? st.imp / (area * st.tm) : 0;
      const c2 = st.mol.length ? st.mol.reduce((a, q) => a + q.vx * q.vx + q.vy * q.vy + q.vz * q.vz, 0) / st.mol.length : 0;
      return [
        ['measured p (from ' + st.hits + ' wall hits) =', st.hits > 20 ? (pm / 1000).toFixed(0) + ' kPa' : 'measuring…'],
        ['NkT / V =', (pth / 1000).toFixed(0) + ' kPa', true],
        ['½m⟨c²⟩ =', Sim.fmt(0.5 * m * c2, 3) + ' J'],
        ['3/2 kT =', Sim.fmt(1.5 * KB * p.T, 3) + ' J'],
        ['c_rms = √(3kT/m) =', Sim.fmt(Math.sqrt(c2), 3) + ' m s⁻¹']
      ];
    }
  });
})();
