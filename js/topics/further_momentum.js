/* Impulse & 2D Collisions — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const DEG = Math.PI / 180;

  /* ---------- shared helpers ---------- */
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
  /* Round up to 1, 2, 2.5 or 5 × 10ⁿ for tidy axes. */
  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  /* Fit a set of vector-diagram points (y up) into a pixel box, same scale on both axes. */
  function fitBox(pts, box, pad) {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    const spanX = Math.max(x1 - x0, 1e-6), spanY = Math.max(y1 - y0, 1e-6);
    const k = Math.min((box.w - 2 * pad) / spanX, (box.h - 2 * pad) / spanY, 1e6);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return {
      k,
      X: (x) => box.x + box.w / 2 + (x - cx) * k,
      Y: (y) => box.y + box.h / 2 - (y - cy) * k
    };
  }
  function panel(ctx, b, title) {
    Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 8 });
    if (title) Sim.text(ctx, title, b.x + 10, b.y + 15, { size: 12.5, bold: true, color: C.navy });
  }
  /* Label at the middle of a segment, pushed sideways by 16 px. side = ±1. */
  function midLabel(ctx, a, b, str, color, side) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const L = Math.hypot(dx, dy);
    if (L < 2) return;
    const nx = (-dy / L) * side, ny = (dx / L) * side;
    Sim.text(ctx, str, (a[0] + b[0]) / 2 + nx * 17, (a[1] + b[1]) / 2 + ny * 17, { color, bold: true, size: 12.5, align: 'center', bg: 'rgba(255,255,255,0.85)' });
  }
  const f2 = (x) => (Math.abs(x) < 0.005 ? 0 : x).toFixed(2);
  const f1 = (x) => (Math.abs(x) < 0.05 ? 0 : x).toFixed(1);
  const mag = (v) => Math.hypot(v[0], v[1]);

  /* ======================================================================
     1. Egg drop: same Δp, different contact times
     ====================================================================== */
  const SURFACES = {
    concrete: { name: 'concrete', tau: 0.003, fill: '#ced4da', edge: '#868e96', give: 1.5 },
    wood: { name: 'wooden table', tau: 0.006, fill: '#e3c29b', edge: '#a47c4f', give: 3 },
    carpet: { name: 'carpet', tau: 0.012, fill: '#d0bfff', edge: '#7950f2', give: 6 },
    grass: { name: 'grass', tau: 0.020, fill: '#b2f2bb', edge: '#2f9e44', give: 10 },
    foam: { name: 'foam cushion', tau: 0.050, fill: '#ffec99', edge: '#f08c00', give: 22 }
  };
  const EGG_M = 0.060, EGG_BREAK = 30;
  const pulse = (run) => (tms) => {
    const t = tms / 1000;
    return t >= 0 && t <= run.tau ? run.Fpk * Math.sin((Math.PI * t) / run.tau) : 0;
  };

  function eggDrop(s) {
    const st = s.state;
    if (st.run && st.run.phase === 'done') st.ghost = st.run;
    const sf = SURFACES[s.p.surf] || SURFACES.concrete;
    const v = Math.sqrt(2 * G * s.p.h);
    const dp = EGG_M * v;
    const Fpk = (Math.PI * dp) / (2 * sf.tau);
    st.run = { surf: s.p.surf, h: s.p.h, v, dp, tau: sf.tau, Fpk, phase: 'fall', t: 0, tc: 0, tDone: 0, broken: Fpk > EGG_BREAK };
    s.play();
  }
  function drawEgg(ctx, x, yBottom, squash) {
    const rx = 12 + squash * 0.3, ry = Math.max(9, 16 - squash * 0.45);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, yBottom - ry, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fill();
    ctx.strokeStyle = '#b08850';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  function drawSplat(ctx, x, y) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(x, y - 3, 30, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 236, 200, 0.95)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 2, y - 4, 10, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#f59f00';
    ctx.fill();
    ctx.restore();
    Sim.polyline(ctx, [[x - 22, y - 4], [x - 16, y - 16], [x - 10, y - 4]], { color: '#b08850', width: 1.5, fill: '#fff4e0', close: true });
    Sim.polyline(ctx, [[x + 12, y - 4], [x + 20, y - 14], [x + 26, y - 4]], { color: '#b08850', width: 1.5, fill: '#fff4e0', close: true });
  }

  Sim.create('#sim-impulse', {
    title: 'Egg drop: force–time graphs',
    height: (w) => (w >= 640 ? 360 : 570),
    controls: [
      {
        key: 'surf', type: 'select', label: 'Landing surface', value: 'concrete',
        options: [['concrete', 'Concrete floor'], ['wood', 'Wooden table'], ['carpet', 'Carpet'], ['grass', 'Grass'], ['foam', 'Foam cushion']]
      },
      { key: 'h', label: 'Drop height h', min: 0.2, max: 2.0, step: 0.1, value: 1.0, unit: 'm', format: (v) => v.toFixed(1) },
      { type: 'button', label: 'Drop the egg', onClick: (s) => eggDrop(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    onChange(s) { eggDrop(s); },
    init(s) {
      s.state = { ghost: null, run: null };
      eggDrop(s);
    },
    update(s, dt) {
      const r = s.state.run;
      if (!r) return;
      if (r.phase === 'fall') {
        r.t += dt;
        if (r.t >= Math.sqrt((2 * r.h) / G)) { r.phase = 'impact'; r.tc = 0; }
      } else if (r.phase === 'impact') {
        r.tc += (dt * r.tau) / 1.2; // slow motion: every impact plays over 1.2 s
        if (r.tc >= r.tau) { r.tc = r.tau; r.phase = 'done'; }
      } else {
        r.tDone += dt;
        if (r.tDone > 0.4) s.pause();
      }
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state, r = st.run;
      if (!r) return;
      const wide = w >= 640;
      const sc = wide ? { x: 0, y: 0, w: Math.min(260, w * 0.32), h } : { x: 0, y: 0, w, h: 236 };
      const sf = SURFACES[r.surf];
      const cx = sc.x + sc.w / 2;
      const groundY = sc.y + sc.h - 30;
      const padH = 8 + sf.give * 0.9;
      const surfTop = groundY - padH;
      const topY = sc.y + 44;
      const pxm = (surfTop - 22 - topY) / 2.0;
      const dent = r.phase === 'impact' ? sf.give * Math.sin((Math.PI * r.tc) / r.tau) : 0;

      // floor and landing surface (with a dent under the egg)
      const half = Math.min(80, sc.w * 0.4);
      Sim.rect(ctx, cx - half - 10, groundY, 2 * half + 20, 8, { fill: '#868e96', r: 2 });
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - half, groundY);
      ctx.lineTo(cx - half, surfTop);
      ctx.lineTo(cx - 26, surfTop);
      ctx.quadraticCurveTo(cx, surfTop + 2 * dent, cx + 26, surfTop);
      ctx.lineTo(cx + half, surfTop);
      ctx.lineTo(cx + half, groundY);
      ctx.closePath();
      ctx.fillStyle = sf.fill;
      ctx.fill();
      ctx.strokeStyle = sf.edge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      Sim.text(ctx, sf.name, cx, groundY + 19, { size: 12, color: C.muted, align: 'center' });

      // drop height marker
      const yDrop = surfTop - r.h * pxm;
      Sim.line(ctx, cx - 22, yDrop, cx + 22, yDrop, { color: C.grey, dash: [4, 4], width: 1 });
      Sim.arrow(ctx, cx - 40, yDrop, cx - 40, surfTop, { color: C.green, width: 1.5, head: 7 });
      Sim.arrow(ctx, cx - 40, surfTop, cx - 40, yDrop, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, 'h = ' + r.h.toFixed(1) + ' m', cx - 46, (yDrop + surfTop) / 2, { size: 12.5, bold: true, color: C.green, align: 'right' });

      // the egg
      if (r.phase === 'fall') {
        const fallen = 0.5 * G * r.t * r.t;
        drawEgg(ctx, cx, surfTop - Math.max(0, r.h - fallen) * pxm, 0);
      } else if (r.phase === 'impact') {
        drawEgg(ctx, cx, surfTop + dent, dent * (r.broken ? 0.9 : 0.5));
        Sim.text(ctx, 'slow motion ×' + Math.round(1.2 / r.tau), cx, sc.y + 16, { size: 12, color: C.purple, bold: true, align: 'center' });
      } else if (r.broken) {
        drawSplat(ctx, cx, surfTop);
        Sim.text(ctx, 'Crack!', cx + 30, surfTop - 34, { size: 15, bold: true, color: C.red, align: 'left' });
      } else {
        drawEgg(ctx, cx, surfTop, 0);
        Sim.text(ctx, 'Survived', cx + 22, surfTop - 34, { size: 15, bold: true, color: C.green, align: 'left' });
      }

      // force–time graph
      const gb = wide
        ? { x: sc.w + 58, y: 36, w: w - sc.w - 58 - 22, h: h - 36 - 36 }
        : { x: 54, y: sc.h + 40, w: w - 54 - 18, h: h - sc.h - 40 - 36 };
      const fmax = Math.max(r.Fpk, st.ghost ? st.ghost.Fpk : 0);
      const ymax = niceMax(fmax * 1.15);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 60, ymin: 0, ymax, xlabel: 't / ms', ylabel: 'F / N', title: 'Force on the egg during impact' }, gb)).axes();
      if (EGG_BREAK < ymax) {
        g.hline(EGG_BREAK, { color: C.red, dash: [3, 4], width: 1.2 });
        g.label(59, EGG_BREAK, 'egg cracks above 30 N', { size: 11.5, color: C.red, bold: false, align: 'right', baseline: 'bottom' });
      }
      if (st.ghost) g.plot(pulse(st.ghost), { color: C.grey, width: 2, dash: [6, 4] });
      if (r.phase !== 'fall') {
        const tNow = r.tc * 1000;
        if (tNow > 0) {
          g.fill(pulse(r), 0, tNow, { color: 'rgba(0,123,255,0.22)' });
          g.plot(pulse(r), { from: 0, to: tNow, color: C.blue, width: 3 });
        }
      }
      if (st.ghost) {
        g.clip();
        ctx.fillStyle = 'rgba(134,142,150,0.12)';
        ctx.beginPath();
        ctx.moveTo(g.px(0), g.py(0));
        for (let i = 0; i <= 80; i++) { const t = (st.ghost.tau * 1000 * i) / 80; ctx.lineTo(g.px(t), g.py(pulse(st.ghost)(t))); }
        ctx.closePath();
        ctx.fill();
        g.unclip();
      }
      // legend
      const lx = gb.x + gb.w - 8;
      const ly = gb.y + 14;
      Sim.text(ctx, 'now: ' + sf.name + ' (Δt = ' + Math.round(r.tau * 1000) + ' ms)', lx, ly, { size: 11.5, color: C.blue, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      if (st.ghost) Sim.text(ctx, 'dashed: ' + SURFACES[st.ghost.surf].name + ', h = ' + st.ghost.h.toFixed(1) + ' m', lx, ly + 18, { size: 11.5, color: C.grey, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const r = s.state.run;
      if (!r) return [];
      const out = [
        ['impact speed v = √(2gh) =', r.v.toFixed(2) + ' m s⁻¹'],
        ['Δp = mv =', r.dp.toFixed(3) + ' N s'],
        ['contact time Δt =', Math.round(r.tau * 1000) + ' ms'],
        ['average force = Δp/Δt =', Sim.fmt(r.dp / r.tau, 3) + ' N'],
        ['peak force =', Sim.fmt(r.Fpk, 3) + ' N', true],
        ['area under graph =', ((2 * r.Fpk * r.tau) / Math.PI).toFixed(3) + ' N s']
      ];
      if (s.state.ghost) out.push(['dashed run: area =', s.state.ghost.dp.toFixed(3) + ' N s, peak ' + Sim.fmt(s.state.ghost.Fpk, 3) + ' N']);
      return out;
    }
  });

  /* ======================================================================
     2. Core practical 9 — trolley, force sensor and light gates
     ====================================================================== */
  const CP9 = { M: 0.800, L: 0.050, x1: 0.20, x2: 0.70, xEnd: 0.86, fric: 0.08 };
  function cp9Run(s) {
    if (s.state.run) return;
    const m = s.p.mh / 1000, M = CP9.M;
    const f = s.p.comp ? 0 : CP9.fric;
    const a = Math.max(0.02, (m * G - f) / (M + m));
    const T = m * (G - a);
    const t1 = Math.sqrt((2 * CP9.x1) / a), t2 = Math.sqrt((2 * CP9.x2) / a);
    const u = a * t1, v = a * t2;
    const tc1 = CP9.L / u + gaussian() * 0.0002;
    const tc2 = CP9.L / v + gaussian() * 0.0002;
    const meas = {
      mh: s.p.mh, comp: s.p.comp,
      F: T + gaussian() * 0.004,
      tc1, tc2,
      u: CP9.L / tc1, v: CP9.L / tc2,
      dt: t2 - t1 + gaussian() * 0.001
    };
    meas.Fdt = meas.F * meas.dt;
    meas.dp = M * (meas.v - meas.u);
    s.state.run = { a, t: 0, tEnd: Math.sqrt((2 * CP9.xEnd) / a), meas, recorded: false, t2 };
  }

  Sim.create('#sim-cp9', {
    title: 'Virtual experiment: impulse and momentum',
    height: (w) => (w >= 700 ? 470 : 560),
    controls: [
      { key: 'mh', label: 'Hanging mass', min: 20, max: 200, step: 10, value: 50, unit: 'g', format: (v) => v.toFixed(0) },
      { key: 'comp', type: 'check', label: 'Runway friction-compensated', value: true },
      { type: 'button', label: 'Release the trolley', onClick: (s) => cp9Run(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.last = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], run: null, last: null, x: 0 }; },
    update(s, dt) {
      const st = s.state, r = st.run;
      if (!r) return;
      r.t = Math.min(r.t + dt, r.tEnd);
      st.x = 0.5 * r.a * r.t * r.t;
      if (!r.recorded && r.t >= r.t2 + 0.03) {
        r.recorded = true;
        st.data.push(r.meas);
        st.last = r.meas;
      }
      if (r.t >= r.tEnd) { st.run = null; st.parkedAt = st.x; }
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const x = st.run ? st.x : 0;
      const benchY = 100, sceneH = 196, floorY = sceneH - 10;
      const rx0 = 46, pulX = w - 46;
      const pxm = (pulX - 40 - rx0) / 0.95;
      const X = (q) => rx0 + q * pxm;

      // floor, bench and pulley
      Sim.line(ctx, 4, floorY, w - 4, floorY, { color: '#adb5bd', width: 2 });
      [24, pulX - 30].forEach((lx) => Sim.rect(ctx, lx, benchY + 12, 8, floorY - benchY - 12, { fill: '#c8a27a' }));
      Sim.rect(ctx, 6, benchY, pulX - 2, 12, { fill: '#d8b48a', stroke: '#a47c4f', width: 1, r: 2 });
      Sim.rect(ctx, pulX - 6, benchY - 8, 12, 14, { fill: '#868e96', r: 2 });
      Sim.circle(ctx, pulX, benchY - 7, 9, { fill: '#dee2e6', stroke: C.axis, width: 2 });
      Sim.circle(ctx, pulX, benchY - 7, 2.5, { fill: C.axis });
      Sim.rect(ctx, rx0 + 0.88 * pxm, benchY - 14, 8, 14, { fill: '#495057', r: 2 }); // buffer

      // light gates (posts behind the trolley)
      const cardH0 = benchY - 46, cardH1 = benchY - 26;
      [CP9.x1, CP9.x2].forEach((xg, i) => {
        const gx = X(xg);
        const blocked = Math.abs(x - xg) < CP9.L / 2 && st.run;
        Sim.rect(ctx, gx - 3, benchY - 66, 6, 66, { fill: '#adb5bd' });
        Sim.rect(ctx, gx - 8, benchY - 44, 16, 14, { fill: C.navy, r: 3 });
        Sim.circle(ctx, gx, benchY - 37, 3, { fill: blocked ? C.red : '#ffc9c9' });
        Sim.text(ctx, 'gate ' + (i + 1), gx, benchY - 76, { size: 12, color: C.navy, bold: true, align: 'center' });
      });

      // trolley
      const tx = X(x);
      const tw = Sim.clamp(0.16 * pxm, 44, 86);
      const cw = Math.max(8, CP9.L * pxm);
      Sim.rect(ctx, tx - cw / 2, cardH0, cw, cardH1 - cardH0, { fill: '#343a40', r: 2 });
      Sim.rect(ctx, tx - tw / 2, benchY - 25, tw, 17, { fill: C.blue, r: 4 });
      Sim.rect(ctx, tx + tw / 2, benchY - 22, 12, 11, { fill: C.orange, r: 2 });
      Sim.circle(ctx, tx - tw * 0.3, benchY - 5, 5, { fill: '#333' });
      Sim.circle(ctx, tx + tw * 0.3, benchY - 5, 5, { fill: '#333' });
      // string to pulley and the hanging mass
      const mH = 8 + s.p.mh / 10;
      const massTravel = floorY - 4 - 28 - (benchY + 6);
      const myTop = benchY + 6 + (x / CP9.xEnd) * massTravel;
      Sim.line(ctx, tx + tw / 2 + 12, benchY - 16, pulX, benchY - 16, { color: '#495057', width: 1.2 });
      Sim.line(ctx, pulX + 9, benchY - 7, pulX + 9, myTop, { color: '#495057', width: 1.2 });
      Sim.rect(ctx, pulX + 1, myTop, 16, mH, { fill: '#868e96', stroke: '#495057', width: 1, r: 2 });
      Sim.text(ctx, s.p.mh + ' g', pulX - 4, myTop + mH / 2, { size: 11.5, color: C.muted, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      Sim.text(ctx, '↑ force sensor', tx + tw / 2 - 2, benchY + 24, { size: 11, color: '#b35c00', align: 'left', bold: true });
      if (!s.p.comp) Sim.text(ctx, 'friction not compensated', 12, 14, { size: 12, color: C.red, bold: true });

      // graph and results table
      const wide = w >= 700;
      const top = sceneH + 28;
      const gb = wide ? { x: 58, y: top, w: w - 58 - 360, h: h - top - 36 } : { x: 56, y: top, w: w - 56 - 18, h: h - top - 36 };
      const pts = st.data.map((d) => [d.Fdt, d.dp]);
      let mx = 0.7;
      pts.forEach((q) => { mx = Math.max(mx, q[0] * 1.1, q[1] * 1.1); });
      mx = niceMax(mx);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: mx, ymin: 0, ymax: mx, xlabel: 'FΔt / N s', ylabel: 'Δp / N s', title: 'Δp against FΔt' }, gb)).axes();
      g.plot((q) => q, { color: C.green, width: 1.5, dash: [6, 5] });
      g.label(mx * 0.93, mx * 0.93, 'gradient = 1', { size: 11.5, color: C.green, align: 'right', bold: false, baseline: 'bottom' });
      const fit = fitLine(pts);
      if (fit && pts.length >= 3) g.plot((q) => fit.m * q + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q, i) => g.dot(q[0], q[1], { color: st.data[i].comp ? C.navy : C.red, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Press “Release the trolley” to take a reading', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });

      if (wide) {
        const tx0 = w - 340, ty0 = top - 6;
        const cols = [['m / g', 0], ['F / N', 56], ['Δt / s', 118], ['FΔt / N s', 184], ['Δp / N s', 262]];
        Sim.rect(ctx, tx0 - 8, ty0 - 10, 336, Math.min(h - ty0 - 12, 30 + 19 * Math.max(1, Math.min(9, st.data.length))), { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 8 });
        cols.forEach(([lab, dx]) => Sim.text(ctx, lab, tx0 + dx, ty0 + 6, { size: 12, bold: true, color: C.navy }));
        const rows = st.data.slice(-9);
        rows.forEach((d, i) => {
          const y = ty0 + 28 + i * 19;
          const col = d.comp ? C.ink : C.red;
          Sim.text(ctx, String(d.mh), tx0, y, { size: 12, color: col });
          Sim.text(ctx, d.F.toFixed(3), tx0 + 56, y, { size: 12, color: col });
          Sim.text(ctx, d.dt.toFixed(3), tx0 + 118, y, { size: 12, color: col });
          Sim.text(ctx, d.Fdt.toFixed(3), tx0 + 184, y, { size: 12, color: col });
          Sim.text(ctx, d.dp.toFixed(3), tx0 + 262, y, { size: 12, color: col });
        });
        if (!rows.length) Sim.text(ctx, 'results table', tx0, ty0 + 28, { size: 12, color: C.muted, italic: true });
      }
    },
    readout(s) {
      const st = s.state;
      const out = [['readings:', String(st.data.length)]];
      const d = st.last;
      if (d) {
        out.push(['last: F =', d.F.toFixed(3) + ' N']);
        out.push(['u = L/t₁ =', d.u.toFixed(3) + ' m s⁻¹']);
        out.push(['v = L/t₂ =', d.v.toFixed(3) + ' m s⁻¹']);
        out.push(['Δt =', d.dt.toFixed(3) + ' s']);
        out.push(['FΔt =', d.Fdt.toFixed(3) + ' N s']);
        out.push(['Δp = m(v − u) =', d.dp.toFixed(3) + ' N s']);
      }
      const fit = fitLine(st.data.map((q) => [q.Fdt, q.dp]));
      if (fit && st.data.length >= 3) {
        out.push(['gradient of best-fit line =', fit.m.toFixed(3), true]);
        out.push(['intercept =', fit.c.toFixed(3) + ' N s']);
      } else if (st.data.length) out.push(['take at least 3 readings', 'to fit a line']);
      return out;
    }
  });

  /* ======================================================================
     3. 2D collision on an air-hockey table
     ====================================================================== */
  function collideSetup(p) {
    const rA = 0.07 * Math.cbrt(p.mA), rB = 0.07 * Math.cbrt(p.mB);
    const R = rA + rB;
    const b = p.b * R; // A travels this far above B's centre line
    const xB = 1.0, xA0 = 0.14;
    const xc = xB - R * Math.sqrt(Math.max(0, 1 - p.b * p.b));
    const tc = Math.max(0, (xc - xA0) / p.u);
    const n = [Math.sqrt(Math.max(0, 1 - p.b * p.b)), -p.b]; // unit vector from A to B at contact
    let vA, vB;
    if (p.type === 'stick') {
      const V = (p.mA * p.u) / (p.mA + p.mB);
      vA = [V, 0];
      vB = [V, 0];
    } else {
      const e = p.type === 'elastic' ? 1 : 0.5;
      const J = (1 + e) * ((p.mA * p.mB) / (p.mA + p.mB)) * p.u * n[0];
      vA = [p.u - (J / p.mA) * n[0], -(J / p.mA) * n[1]];
      vB = [(J / p.mB) * n[0], (J / p.mB) * n[1]];
    }
    return { rA, rB, b, xB, xA0, xc, tc, vA, vB };
  }
  function collidePos(c, p, t) {
    if (t <= c.tc) return { A: [c.xA0 + p.u * t, c.b], B: [c.xB, 0] };
    const d = t - c.tc;
    return { A: [c.xc + c.vA[0] * d, c.b + c.vA[1] * d], B: [c.xB + c.vB[0] * d, c.vB[1] * d] };
  }

  Sim.create('#sim-collide', {
    title: '2D collision: momentum vectors',
    height: (w) => (w >= 700 ? 400 : 520),
    controls: [
      { key: 'mA', label: 'Mass of A', min: 0.5, max: 3, step: 0.1, value: 1.0, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'mB', label: 'Mass of B', min: 0.5, max: 3, step: 0.1, value: 1.0, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'u', label: 'Speed of A', min: 0.5, max: 3, step: 0.1, value: 1.5, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'b', label: 'Aim offset', min: -0.9, max: 0.9, step: 0.05, value: 0.5, format: (v) => (Math.abs(v) < 0.01 ? 'head-on' : (v > 0 ? 'high ' : 'low ') + Math.round(Math.abs(v) * 100) + '%') },
      { key: 'type', type: 'select', label: 'Collision', value: 'elastic', options: [['elastic', 'Elastic (kinetic energy kept)'], ['inelastic', 'Inelastic (some energy lost)'], ['stick', 'Stick together']] }
    ],
    animate: true,
    onChange(s) { s.reset(); s.play(); },
    init(s) {
      s.state = { t: 0, c: collideSetup(s.p) };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state;
      st.t += dt * 0.6;
      const q = collidePos(st.c, s.p, st.t);
      const out = (P) => P[0] < -0.2 || P[0] > 2.2 || Math.abs(P[1]) > 0.85;
      if ((st.t > st.c.tc + 0.3 && out(q.A) && out(q.B)) || st.t > st.c.tc + 3.2) s.pause();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state, c = st.c;
      const wide = w >= 700;
      const tb = wide ? { x: 10, y: 10, w: w * 0.6 - 15, h: h - 20 } : { x: 8, y: 8, w: w - 16, h: 250 };
      const vb = wide ? { x: w * 0.6 + 5, y: 10, w: w * 0.4 - 15, h: h - 20 } : { x: 8, y: 268, w: w - 16, h: h - 276 };
      const k = tb.w / 2.0;
      const cy = tb.y + tb.h / 2;
      const X = (x) => tb.x + x * k, Y = (y) => cy - y * k;

      Sim.rect(ctx, tb.x, tb.y, tb.w, tb.h, { fill: '#e7f5ff', stroke: '#74c0fc', width: 2, r: 10 });
      ctx.save();
      ctx.beginPath();
      ctx.rect(tb.x, tb.y, tb.w, tb.h);
      ctx.clip();
      Sim.line(ctx, X(0), Y(c.b), X(c.xc), Y(c.b), { color: C.blue, width: 1, dash: [4, 5], alpha: 0.5 });
      for (let tk = 0; tk <= st.t + 1e-9; tk += 0.1) {
        const q = collidePos(c, p, tk);
        Sim.circle(ctx, X(q.A[0]), Y(q.A[1]), c.rA * k, { stroke: C.blue, width: 1.2, fill: 'rgba(0,123,255,0.07)' });
        Sim.circle(ctx, X(q.B[0]), Y(q.B[1]), c.rB * k, { stroke: C.orange, width: 1.2, fill: 'rgba(240,140,0,0.07)' });
      }
      const q = collidePos(c, p, st.t);
      const after = st.t > c.tc;
      const vA = after ? c.vA : [p.u, 0], vB = after ? c.vB : [0, 0];
      Sim.circle(ctx, X(q.A[0]), Y(q.A[1]), c.rA * k, { fill: C.blue, stroke: '#fff', width: 2 });
      Sim.circle(ctx, X(q.B[0]), Y(q.B[1]), c.rB * k, { fill: C.orange, stroke: '#fff', width: 2 });
      Sim.text(ctx, 'A', X(q.A[0]), Y(q.A[1]), { size: 13, bold: true, color: '#fff', align: 'center' });
      Sim.text(ctx, 'B', X(q.B[0]), Y(q.B[1]), { size: 13, bold: true, color: '#fff', align: 'center' });
      const ak = 0.35 * k;
      if (mag(vA) > 0.02) Sim.arrow(ctx, X(q.A[0]), Y(q.A[1]), X(q.A[0]) + vA[0] * ak, Y(q.A[1]) - vA[1] * ak, { color: C.navy, width: 2.5 });
      if (mag(vB) > 0.02) Sim.arrow(ctx, X(q.B[0]), Y(q.B[1]), X(q.B[0]) + vB[0] * ak, Y(q.B[1]) - vB[1] * ak, { color: '#b35c00', width: 2.5 });
      ctx.restore();
      Sim.text(ctx, 'top view · circles every 0.1 s', tb.x + 10, tb.y + tb.h - 12, { size: 11.5, color: C.muted });

      // momentum vector diagram
      panel(ctx, vb, 'Momentum vectors (kg m s⁻¹)');
      const P = [p.mA * p.u, 0];
      const pA = [p.mA * c.vA[0], p.mA * c.vA[1]];
      const box = { x: vb.x + 6, y: vb.y + 26, w: vb.w - 12, h: vb.h - 26 - 34 };
      const fb = fitBox([[0, 0], P, pA], box, 34);
      const O = [fb.X(0), fb.Y(0)], PT = [fb.X(P[0]), fb.Y(P[1])], AT = [fb.X(pA[0]), fb.Y(pA[1])];
      Sim.arrow(ctx, O[0], O[1], PT[0], PT[1], { color: '#adb5bd', width: 8, head: 18 });
      midLabel(ctx, O, PT, 'total before = ' + P[0].toFixed(2), C.muted, 1);
      if (after) {
        Sim.arrow(ctx, O[0], O[1], AT[0], AT[1], { color: C.blue, width: 3 });
        Sim.arrow(ctx, AT[0], AT[1], PT[0], PT[1], { color: C.red, width: 3 });
        const side = pA[1] >= 0 ? -1 : 1;
        midLabel(ctx, O, AT, 'p_A = ' + mag(pA).toFixed(2), C.blue, side);
        midLabel(ctx, AT, PT, 'p_B = ' + (p.mB * mag(c.vB)).toFixed(2), C.red, side);
        Sim.text(ctx, 'after: p_A + p_B (tip to tail) = total before', vb.x + vb.w / 2, vb.y + vb.h - 14, { size: 11.5, color: C.ink, align: 'center' });
      } else {
        Sim.text(ctx, 'waiting for the collision…', vb.x + vb.w / 2, vb.y + vb.h - 14, { size: 12, color: C.muted, italic: true, align: 'center' });
      }
    },
    readout(s) {
      const p = s.p, c = s.state.c;
      const pxAfter = p.mA * c.vA[0] + p.mB * c.vB[0];
      const pyAfter = p.mA * c.vA[1] + p.mB * c.vB[1];
      const ke0 = 0.5 * p.mA * p.u * p.u;
      const ke1 = 0.5 * p.mA * (c.vA[0] ** 2 + c.vA[1] ** 2) + 0.5 * p.mB * (c.vB[0] ** 2 + c.vB[1] ** 2);
      const out = [
        ['Σpₓ before =', f2(p.mA * p.u)],
        ['Σpₓ after =', f2(pxAfter)],
        ['Σp_y before =', '0.00'],
        ['Σp_y after =', f2(pyAfter)],
        ['Eₖ before =', ke0.toFixed(2) + ' J'],
        ['Eₖ after =', ke1.toFixed(2) + ' J'],
        ['Eₖ kept =', ke0 > 0 ? Math.round((100 * ke1) / ke0) + '%' : '—', true]
      ];
      if (p.type !== 'stick' && mag(c.vA) > 0.02 && mag(c.vB) > 0.02) {
        const cosA = (c.vA[0] * c.vB[0] + c.vA[1] * c.vB[1]) / (mag(c.vA) * mag(c.vB));
        out.push(['angle between paths =', (Math.acos(Sim.clamp(cosA, -1, 1)) / DEG).toFixed(1) + '°']);
      }
      out.push(['speeds after: v_A =', mag(c.vA).toFixed(2) + ' m s⁻¹, v_B = ' + mag(c.vB).toFixed(2) + ' m s⁻¹']);
      return out;
    }
  });

  /* ======================================================================
     4. Explosion into three pieces
     ====================================================================== */
  const EX = { mA: 1.0, mB: 1.0, mC: 2.0, t0: 0.5, fly: 1.5 };
  function exCalc(p) {
    const aA = 90 * DEG, aB = (90 - p.ang) * DEG;
    const vA = [p.vA * Math.cos(aA), p.vA * Math.sin(aA)];
    const vB = [p.vB * Math.cos(aB), p.vB * Math.sin(aB)];
    const pA = [EX.mA * vA[0], EX.mA * vA[1]];
    const pB = [EX.mB * vB[0], EX.mB * vB[1]];
    const pC = [-(pA[0] + pB[0]), -(pA[1] + pB[1])];
    const vC = [pC[0] / EX.mC, pC[1] / EX.mC];
    return { vA, vB, vC, pA, pB, pC };
  }

  Sim.create('#sim-explode', {
    title: 'Explosion in 2D: closing the triangle',
    height: (w) => (w >= 700 ? 380 : 560),
    controls: [
      { key: 'vA', label: 'Speed of A (1.0 kg)', min: 1, max: 6, step: 0.5, value: 4, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'vB', label: 'Speed of B (1.0 kg)', min: 1, max: 6, step: 0.5, value: 3, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'ang', label: 'Angle between A and B', min: 30, max: 180, step: 5, value: 120, unit: '°', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Explode!', onClick: (s) => { s.reset(); s.play(); } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    onChange(s) { s.reset(); s.play(); },
    init(s) {
      s.state = { t: 0 };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      s.state.t += dt;
      if (s.state.t > EX.t0 + EX.fly + 0.2) s.pause();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const r = exCalc(p);
      const wide = w >= 700;
      const sc = wide ? { x: 10, y: 10, w: w * 0.55 - 15, h: h - 20 } : { x: 8, y: 8, w: w - 16, h: 300 };
      const vb = wide ? { x: w * 0.55 + 5, y: 10, w: w * 0.45 - 15, h: h - 20 } : { x: 8, y: 318, w: w - 16, h: h - 326 };
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 8 });
      const cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2;
      const vmax = Math.max(1, mag(r.vA), mag(r.vB), mag(r.vC));
      const k = (Math.min(sc.w, sc.h) / 2 - 50) / (vmax * EX.fly);
      const frags = [
        { v: r.vA, m: EX.mA, col: C.blue, lab: 'A', rad: 10 },
        { v: r.vB, m: EX.mB, col: C.red, lab: 'B', rad: 10 },
        { v: r.vC, m: EX.mC, col: C.green, lab: 'C', rad: 13 }
      ];
      const tf = Math.max(0, Math.min(st.t, EX.t0 + EX.fly) - EX.t0);
      if (st.t < EX.t0) {
        Sim.circle(ctx, cx, cy, 20, { fill: '#495057', stroke: '#212529', width: 2 });
        Sim.text(ctx, '4.0 kg, at rest', cx, cy + 34, { size: 12.5, color: C.muted, align: 'center' });
      } else {
        if (tf < 0.18) {
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6;
            Sim.line(ctx, cx + Math.cos(a) * 14, cy + Math.sin(a) * 14, cx + Math.cos(a) * (30 + 120 * tf), cy + Math.sin(a) * (30 + 120 * tf), { color: C.orange, width: 3, alpha: 1 - tf * 4 });
          }
        }
        for (let tk = 0.1; tk <= tf + 1e-9; tk += 0.1) {
          frags.forEach((f) => Sim.circle(ctx, cx + f.v[0] * tk * k, cy - f.v[1] * tk * k, 3, { fill: f.col }));
        }
        frags.forEach((f) => {
          const fx = cx + f.v[0] * tf * k, fy = cy - f.v[1] * tf * k;
          Sim.circle(ctx, fx, fy, f.rad, { fill: f.col, stroke: '#fff', width: 2 });
          Sim.text(ctx, f.lab, fx, fy, { size: 12, bold: true, color: '#fff', align: 'center' });
          if (tf > EX.fly * 0.6 && mag(f.v) > 0.05) {
            const L = mag(f.v);
            const lx = Sim.clamp(fx + (f.v[0] / L) * (f.rad + 34), sc.x + 40, sc.x + sc.w - 40);
            const ly = Sim.clamp(fy - (f.v[1] / L) * (f.rad + 14), sc.y + 12, sc.y + sc.h - 12);
            Sim.text(ctx, mag(f.v).toFixed(1) + ' m s⁻¹', lx, ly, { size: 12, bold: true, color: f.col, align: 'center', bg: 'rgba(255,255,255,0.85)' });
          }
        });
      }
      Sim.text(ctx, 'A 1.0 kg · B 1.0 kg · C 2.0 kg', sc.x + 10, sc.y + 14, { size: 11.5, color: C.muted });

      // momentum triangle
      panel(ctx, vb, 'Momentum after (kg m s⁻¹): a closed triangle');
      const AB = [r.pA[0] + r.pB[0], r.pA[1] + r.pB[1]];
      const box = { x: vb.x + 6, y: vb.y + 26, w: vb.w - 12, h: vb.h - 26 - 30 };
      const fb = fitBox([[0, 0], r.pA, AB], box, 38);
      const O = [fb.X(0), fb.Y(0)], T1 = [fb.X(r.pA[0]), fb.Y(r.pA[1])], T2 = [fb.X(AB[0]), fb.Y(AB[1])];
      Sim.arrow(ctx, O[0], O[1], T1[0], T1[1], { color: C.blue, width: 3 });
      Sim.arrow(ctx, T1[0], T1[1], T2[0], T2[1], { color: C.red, width: 3 });
      if (mag(r.pC) > 0.02) Sim.arrow(ctx, T2[0], T2[1], O[0], O[1], { color: C.green, width: 3 });
      // label each side on the outside of the triangle
      const cxT = (O[0] + T1[0] + T2[0]) / 3, cyT = (O[1] + T1[1] + T2[1]) / 3;
      const outSide = (a, b) => {
        const mx = (a[0] + b[0]) / 2 - cxT, my = (a[1] + b[1]) / 2 - cyT;
        const nx = -(b[1] - a[1]), ny = b[0] - a[0];
        return nx * mx + ny * my >= 0 ? 1 : -1;
      };
      midLabel(ctx, O, T1, 'p_A = ' + mag(r.pA).toFixed(2), C.blue, outSide(O, T1));
      midLabel(ctx, T1, T2, 'p_B = ' + mag(r.pB).toFixed(2), C.red, outSide(T1, T2));
      if (mag(r.pC) > 0.02) midLabel(ctx, T2, O, 'p_C = ' + mag(r.pC).toFixed(2), C.green, outSide(T2, O));
      Sim.text(ctx, 'p_A + p_B + p_C = 0, just as before the explosion', vb.x + vb.w / 2, vb.y + vb.h - 13, { size: 11.5, color: C.ink, align: 'center' });
    },
    readout(s) {
      const r = exCalc(s.p);
      const pc = mag(r.pC);
      const ke = 0.5 * EX.mA * mag(r.vA) ** 2 + 0.5 * EX.mB * mag(r.vB) ** 2 + 0.5 * EX.mC * mag(r.vC) ** 2;
      let dir = '—';
      if (pc > 0.02) {
        const cosT = (r.pC[0] * r.pA[0] + r.pC[1] * r.pA[1]) / (pc * mag(r.pA));
        dir = (Math.acos(Sim.clamp(cosT, -1, 1)) / DEG).toFixed(0) + '° from A';
      }
      return [
        ['p_A =', mag(r.pA).toFixed(2) + ' kg m s⁻¹'],
        ['p_B =', mag(r.pB).toFixed(2) + ' kg m s⁻¹'],
        ['p_C = |p_A + p_B| =', pc.toFixed(2) + ' kg m s⁻¹'],
        ['v_C = p_C / m_C =', (pc / EX.mC).toFixed(2) + ' m s⁻¹', true],
        ['direction of C:', dir],
        ['Σpₓ, Σp_y after =', '0.00, 0.00'],
        ['kinetic energy released =', ke.toFixed(1) + ' J']
      ];
    }
  });

  /* ======================================================================
     5. Core practical 10 — video analysis of a collision
     ====================================================================== */
  const CP10_DT = 0.05, CP10_N = 24, FOV_W = 0.80, FOV_H = 0.36;
  const CP10_SETS = {
    steel: { mA: 0.0282, mB: 0.0282, rA: 0.0095, rB: 0.0095, e: 0.94, b: 0.45, u: 0.60, colB: '#adb5bd', nameB: 'steel ball' },
    marble: { mA: 0.0282, mB: 0.0054, rA: 0.0095, rB: 0.0080, e: 0.90, b: 0.35, u: 0.45, colB: '#74c0fc', nameB: 'glass marble' },
    putty: { mA: 0.0282, mB: 0.0310, rA: 0.0095, rB: 0.0105, e: 0.10, b: 0.30, u: 0.60, colB: '#e599f7', nameB: 'ball with Plasticine' }
  };
  function cp10Build(key) {
    const c = CP10_SETS[key] || CP10_SETS.steel;
    const R = c.rA + c.rB, b = c.b * R;
    const xB = 0.30, xA0 = 0.03;
    const nx = Math.sqrt(1 - c.b * c.b);
    const xc = xB - R * nx;
    const tc = (xc - xA0) / c.u;
    const n = [nx, -c.b];
    const J = (1 + c.e) * ((c.mA * c.mB) / (c.mA + c.mB)) * c.u * n[0];
    const vA = [c.u - (J / c.mA) * n[0], -(J / c.mA) * n[1]];
    const vB = [(J / c.mB) * n[0], (J / c.mB) * n[1]];
    const pos = (t) => (t <= tc
      ? { A: [xA0 + c.u * t, b], B: [xB, 0] }
      : { A: [xc + vA[0] * (t - tc), b + vA[1] * (t - tc)], B: [xB + vB[0] * (t - tc), vB[1] * (t - tc)] });
    const inView = (P) => P[0] > 0.01 && P[0] < FOV_W - 0.01 && Math.abs(P[1]) < FOV_H / 2 - 0.005;
    const frames = [];
    for (let i = 0; i <= CP10_N; i++) {
      const t = i * CP10_DT, q = pos(t);
      const mark = (P) => (inView(P) ? [P[0] + gaussian() * 0.0015, P[1] + gaussian() * 0.0015] : null);
      frames.push({ t, A: q.A, B: q.B, mA: mark(q.A), mB: mark(q.B), after: t > tc });
    }
    const fitV = (which, after) => {
      const pts = frames.filter((f) => f.after === after && f[which] && Math.abs(f.t - tc) > 0.02);
      const fx = fitLine(pts.map((f) => [f.t, f[which][0]]));
      const fy = fitLine(pts.map((f) => [f.t, f[which][1]]));
      return fx && fy ? { v: [fx.m, fy.m], fx, fy, t0: pts[0].t, t1: pts[pts.length - 1].t } : { v: [0, 0], fx: null, fy: null };
    };
    const fit = { A0: fitV('mA', false), B0: fitV('mB', false), A1: fitV('mA', true), B1: fitV('mB', true) };
    return { c, tc, frames, fit };
  }
  function drawBall(ctx, x, y, r, col) {
    ctx.save();
    const gr = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(1, col);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = gr;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  function cross(ctx, x, y, col) {
    Sim.line(ctx, x - 4, y - 4, x + 4, y + 4, { color: col, width: 1.6 });
    Sim.line(ctx, x - 4, y + 4, x + 4, y - 4, { color: col, width: 1.6 });
  }

  Sim.create('#sim-cp10', {
    title: 'Video analysis of a collision (CP10)',
    height: (w) => Math.round(((w - 20) / FOV_W) * FOV_H + 56),
    controls: [
      { key: 'set', type: 'select', label: 'Collision filmed', value: 'steel', options: [['steel', 'Two steel ball bearings'], ['marble', 'Steel ball hits a lighter glass marble'], ['putty', 'Steel balls with Plasticine (sticky)']], onChange: (s) => { s.state.d = cp10Build(s.p.set); s.set('frame', 0); } },
      { key: 'frame', label: 'Video frame', min: 0, max: CP10_N, step: 1, value: 0, format: (v) => v.toFixed(0) + ' / ' + CP10_N },
      { key: 'marks', type: 'check', label: 'Show marked positions and fitted lines', value: true },
      { key: 'arrows', type: 'check', label: 'Show fitted velocity arrows', value: false }
    ],
    animate: true,
    autoplay: false,
    init(s) {
      s.state = { d: cp10Build(s.p.set), acc: 0, lastWall: 0 };
      if (s.p.frame) s.set('frame', 0);
    },
    update(s, dt) {
      const st = s.state;
      const now = performance.now();
      const fresh = now - st.lastWall > 250;
      st.lastWall = now;
      if (fresh && s.p.frame >= CP10_N) s.set('frame', 0);
      st.acc += dt;
      while (st.acc >= 0.12) {
        st.acc -= 0.12;
        if (s.p.frame < CP10_N) s.set('frame', s.p.frame + 1);
        else { st.acc = 0; s.pause(); break; }
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const d = s.state.d, c = d.c;
      const k = (w - 20) / FOV_W;
      const x0 = 10, y0 = 8, fh = FOV_H * k;
      const X = (x) => x0 + x * k, Y = (y) => y0 + fh / 2 - y * k;
      // table top with a 5 cm grid
      Sim.rect(ctx, x0, y0, w - 20, fh, { fill: '#eef1f4' });
      ctx.save();
      ctx.strokeStyle = '#d3d9e0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let gx = 0; gx <= FOV_W + 1e-9; gx += 0.05) { ctx.moveTo(Math.round(X(gx)) + 0.5, y0); ctx.lineTo(Math.round(X(gx)) + 0.5, y0 + fh); }
      for (let gy = -FOV_H / 2; gy <= FOV_H / 2 + 1e-9; gy += 0.05) { ctx.moveTo(x0, Math.round(Y(gy)) + 0.5); ctx.lineTo(x0 + w - 20, Math.round(Y(gy)) + 0.5); }
      ctx.stroke();
      ctx.restore();
      // ruler
      const ry = y0 + fh + 6;
      Sim.rect(ctx, x0, ry, w - 20, 18, { fill: '#fff3bf', stroke: '#e0c060', width: 1 });
      const step = w < 500 ? 0.2 : 0.1;
      for (let gx = 0; gx <= FOV_W + 1e-9; gx += 0.01) {
        const major = Math.abs(gx / step - Math.round(gx / step)) < 1e-6;
        Sim.line(ctx, X(gx), ry, X(gx), ry + (major ? 9 : Math.abs(gx * 20 - Math.round(gx * 20)) < 1e-6 ? 6 : 3), { color: '#7a6520', width: 1 });
        if (major && X(gx) < w - 36) Sim.text(ctx, Math.round(gx * 100) + (gx === 0 ? ' cm' : ''), X(gx) + 3, ry + 13, { size: 11, color: '#7a6520', align: 'left' });
      }

      const f = Math.round(Sim.clamp(p.frame, 0, CP10_N));
      const fr = d.frames[f];
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, w - 20, fh);
      ctx.clip();
      if (p.marks) {
        // fitted lines through the marked points
        const seg = (ft, col) => {
          if (!ft.fx) return;
          const ta = ft.t0, tb2 = ft.t1;
          Sim.line(ctx, X(ft.fx.m * ta + ft.fx.c), Y(ft.fy.m * ta + ft.fy.c), X(ft.fx.m * tb2 + ft.fx.c), Y(ft.fy.m * tb2 + ft.fy.c), { color: col, width: 1.2, dash: [5, 4], alpha: 0.8 });
        };
        if (f >= 2) seg(d.fit.A0, C.navy);
        if (fr.after) { seg(d.fit.A1, C.navy); seg(d.fit.B1, '#b35c00'); }
        for (let i = 0; i <= f; i++) {
          const q = d.frames[i];
          if (q.mA) cross(ctx, X(q.mA[0]), Y(q.mA[1]), C.navy);
          if (q.mB && (i === 0 || q.after)) cross(ctx, X(q.mB[0]), Y(q.mB[1]), '#b35c00');
        }
      }
      const rA = Math.max(5, c.rA * k), rB = Math.max(4.5, c.rB * k);
      drawBall(ctx, X(fr.B[0]), Y(fr.B[1]), rB, c.colB);
      drawBall(ctx, X(fr.A[0]), Y(fr.A[1]), rA, '#868e96');
      Sim.text(ctx, 'A', X(fr.A[0]), Y(fr.A[1]) - rA - 9, { size: 12, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'B', X(fr.B[0]), Y(fr.B[1]) + rB + 10, { size: 12, bold: true, color: '#b35c00', align: 'center' });
      if (p.arrows) {
        const ak = 0.3 * k;
        const va = fr.after ? d.fit.A1.v : d.fit.A0.v;
        const vbv = fr.after ? d.fit.B1.v : [0, 0];
        if (mag(va) > 0.01) Sim.arrow(ctx, X(fr.A[0]), Y(fr.A[1]), X(fr.A[0]) + va[0] * ak, Y(fr.A[1]) - va[1] * ak, { color: C.navy, width: 2.5 });
        if (mag(vbv) > 0.01) Sim.arrow(ctx, X(fr.B[0]), Y(fr.B[1]), X(fr.B[0]) + vbv[0] * ak, Y(fr.B[1]) - vbv[1] * ak, { color: '#b35c00', width: 2.5 });
      }
      ctx.restore();
      // video overlay
      const label = 'frame ' + f + '   t = ' + fr.t.toFixed(2) + ' s';
      const lw = Sim.measure(ctx, label, { size: 12, bold: true }) + 16;
      Sim.rect(ctx, x0 + 6, y0 + 6, lw, 22, { fill: 'rgba(33,37,41,0.8)', r: 5 });
      Sim.text(ctx, label, x0 + 14, y0 + 17, { size: 12, bold: true, color: '#fff' });
      Sim.text(ctx, '5 cm grid', x0 + w - 28, y0 + 17, { size: 11.5, color: C.muted, align: 'right' });
    },
    readout(s) {
      const d = s.state.d, c = d.c;
      const f = Math.round(Sim.clamp(s.p.frame, 0, CP10_N));
      const fr = d.frames[f];
      const cm = (P) => (P ? '(' + f1(P[0] * 100) + ', ' + f1(P[1] * 100) + ') cm' : 'out of view');
      const pB = [c.mA * d.fit.A0.v[0] + c.mB * d.fit.B0.v[0], c.mA * d.fit.A0.v[1] + c.mB * d.fit.B0.v[1]];
      const pAft = [c.mA * d.fit.A1.v[0] + c.mB * d.fit.B1.v[0], c.mA * d.fit.A1.v[1] + c.mB * d.fit.B1.v[1]];
      const ke0 = 0.5 * c.mA * mag(d.fit.A0.v) ** 2 + 0.5 * c.mB * mag(d.fit.B0.v) ** 2;
      const ke1 = 0.5 * c.mA * mag(d.fit.A1.v) ** 2 + 0.5 * c.mB * mag(d.fit.B1.v) ** 2;
      const mp = (x) => f1(x * 1000);
      return [
        ['masses: A =', (c.mA * 1000).toFixed(1) + ' g, B = ' + (c.mB * 1000).toFixed(1) + ' g'],
        ['A marked at', cm(fr.mA)],
        ['B marked at', cm(fr.mB)],
        ['fitted v_A before =', mag(d.fit.A0.v).toFixed(3) + ' m s⁻¹'],
        ['v_A after =', mag(d.fit.A1.v).toFixed(3) + ' m s⁻¹'],
        ['v_B after =', mag(d.fit.B1.v).toFixed(3) + ' m s⁻¹'],
        ['Σpₓ before → after (×10⁻³ kg m s⁻¹):', mp(pB[0]) + ' → ' + mp(pAft[0]), true],
        ['Σp_y before → after:', mp(pB[1]) + ' → ' + mp(pAft[1]), true],
        ['Eₖ before → after:', (ke0 * 1000).toFixed(2) + ' → ' + (ke1 * 1000).toFixed(2) + ' mJ'],
        ['Eₖ kept =', ke0 > 0 ? Math.round((100 * ke1) / ke0) + '%' : '—', true]
      ];
    }
  });
})();
