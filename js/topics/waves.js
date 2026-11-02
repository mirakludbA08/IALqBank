/* Progressive Waves — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const TAU = Math.PI * 2;

  /* ---------- small helpers ---------- */
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
  /* round up to 1, 2 or 5 × 10ⁿ */
  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
  }
  /* deterministic pseudo-random number in [0, 1) */
  function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  /* horizontal double-headed measuring arrow with a label in the middle */
  function bracket(ctx, x1, x2, y, label, color) {
    if (Math.abs(x2 - x1) < 6) return;
    if (x2 < x1) { const tmp = x1; x1 = x2; x2 = tmp; }
    Sim.line(ctx, x1, y - 6, x1, y + 6, { color, width: 1.5 });
    Sim.line(ctx, x2, y - 6, x2, y + 6, { color, width: 1.5 });
    const m = (x1 + x2) / 2;
    Sim.arrow(ctx, m, y, x1 + 1, y, { color, width: 1.6, head: Math.min(7, (x2 - x1) / 4) });
    Sim.arrow(ctx, m, y, x2 - 1, y, { color, width: 1.6, head: Math.min(7, (x2 - x1) / 4) });
    if (!label) return;
    const tw = Sim.measure(ctx, label, { size: 13, bold: true });
    const o = { color, bold: true, size: 13, bg: 'rgba(255,255,255,0.92)', pad: 3 };
    if (x2 - x1 >= tw + 18) Sim.text(ctx, label, m, y, Object.assign({ align: 'center' }, o));
    else Sim.text(ctx, label, x2 + 7, y, Object.assign({ align: 'left' }, o)); // too narrow: label beside it
  }
  /* A graph whose tick labels sit along the bottom and left edges, so they never collide with a
     curve that crosses zero. Pass xstep / ystep (and optional xfmt / yfmt). */
  function edgeGraph(ctx, o) {
    const g = Sim.graph(ctx, Object.assign({}, o, { ticks: false, xlabel: '' })).axes();
    Sim.line(ctx, g.x, g.y + g.h, g.x + g.w, g.y + g.h, { color: '#ced4da', width: 1 });
    if (o.xstep) {
      for (let v = Math.ceil(g.xmin / o.xstep - 1e-9) * o.xstep; v <= g.xmax + 1e-9; v += o.xstep) {
        const X = g.px(v);
        Sim.line(ctx, X, g.y + g.h, X, g.y + g.h + 4, { color: C.axis, width: 1 });
        Sim.text(ctx, (o.xfmt || ((q) => String(+q.toFixed(4))))(v), X, g.y + g.h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
    }
    if (o.ystep) {
      for (let v = Math.ceil(g.ymin / o.ystep - 1e-9) * o.ystep; v <= g.ymax + 1e-9; v += o.ystep) {
        const Y = g.py(v);
        Sim.line(ctx, g.x - 4, Y, g.x, Y, { color: C.axis, width: 1 });
        Sim.text(ctx, (o.yfmt || ((q) => String(+q.toFixed(4))))(v), g.x - 6, Y, { size: 11, color: C.muted, align: 'right' });
      }
    }
    if (o.xlabel) Sim.text(ctx, o.xlabel, g.x + g.w, g.y + g.h + 20, { size: 12.5, bold: true, color: C.ink, align: 'right', baseline: 'top' });
    return g;
  }

  /* ======================================================================
     1. Transverse and longitudinal waves
     ====================================================================== */
  const T_DEMO = 2; // period of the demo wave in seconds
  Sim.create('#sim-types', {
    title: 'Transverse and longitudinal waves',
    height: (w) => (w >= 640 ? 480 : 500),
    controls: [
      {
        key: 'type', type: 'select', label: 'Wave type', value: 'long',
        options: [['trans', 'Transverse (a rope, light)'], ['long', 'Longitudinal (sound in air)']]
      },
      { key: 'slow', type: 'check', label: 'Slow motion', value: false, onChange: (s, on) => { s.speed = on ? 0.3 : 1; } },
      { key: 'rest', type: 'check', label: 'Mark the red particle’s rest position', value: true }
    ],
    animate: true,
    init(s) { s.speed = s.p.slow ? 0.3 : 1; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const long = p.type === 'long';
      const wide = w >= 640;
      const x0 = 46, x1 = w - 16, span = x1 - x0;
      const lam = span / (wide ? 2.6 : 2.15);
      const t = s.t;
      const ph = (x) => TAU * (t / T_DEMO - (x - x0) / lam);
      const sceneTop = 44, sceneH = 128, sceneMid = sceneTop + sceneH / 2;
      const gTop = sceneTop + sceneH + 40;
      const gh = (h - gTop - 46 - 34) / 2;
      const b1 = { x: x0, y: gTop, w: span, h: gh };
      const b2 = { x: x0, y: gTop + gh + 46, w: span, h: gh };

      /* header line */
      Sim.text(ctx, wide ? 'wave travels (energy transfer) →' : 'wave travels →', x0, 14, { size: 12.5, bold: true, color: C.navy });
      Sim.text(ctx, long ? (wide ? 'particles oscillate ↔ (parallel)' : 'particles move ↔') : (wide ? 'particles oscillate ↕ (perpendicular)' : 'particles move ↕'), x1, 14, { size: 12.5, bold: true, color: C.red, align: 'right' });

      /* feature markers: compressions/rarefactions or crests/troughs, moving with the wave */
      const feats = [];
      const off1 = long ? 0 : 0.25, off2 = long ? 0.5 : 0.75;
      for (let m = -3; m <= 6; m++) {
        const xa = x0 + lam * (t / T_DEMO - off1 - m);
        const xb = x0 + lam * (t / T_DEMO - off2 - m);
        if (xa >= x0 && xa <= x1) feats.push([xa, 0]);
        if (xb >= x0 && xb <= x1) feats.push([xb, 1]);
      }
      const names = long ? (wide ? ['compression', 'rarefaction'] : ['C', 'R']) : ['crest', 'trough'];
      const fcol = [C.orange, C.sky];
      const featLines = () => {
        const segs = [[sceneTop, sceneTop + sceneH], [b1.y, b1.y + b1.h]];
        if (long) segs.push([b2.y, b2.y + b2.h]);
        feats.forEach(([x, k]) => segs.forEach(([ya, yb]) => Sim.line(ctx, x, ya, x, yb, { color: fcol[k], width: 1.2, dash: [4, 4], alpha: 0.8 })));
      };
      feats.forEach(([x, k]) => {
        Sim.text(ctx, names[k], x, sceneTop - 12, { size: 12, bold: true, color: k ? '#1c7ed6' : '#c46a00', align: 'center', bg: 'rgba(255,255,255,0.9)', pad: 2 });
      });

      /* the particles */
      ctx.save();
      ctx.beginPath(); ctx.rect(0, sceneTop, w, sceneH); ctx.clip();
      Sim.rect(ctx, 0, sceneTop, w, sceneH, { fill: '#f6f9ff' });
      let red = null;
      if (!long) {
        const A = sceneH * 0.33;
        const n = Math.max(12, Math.floor(span / 13));
        const pts = [];
        for (let i = 0; i <= n; i++) {
          const x = x0 + (i * span) / n;
          pts.push([x, sceneMid - A * Math.sin(ph(x))]);
        }
        Sim.line(ctx, 0, sceneMid, w, sceneMid, { color: '#ced4da', width: 1, dash: [3, 4] });
        Sim.polyline(ctx, pts, { color: '#b8c4d6', width: 2 });
        const iR = Math.round(n * 0.42);
        pts.forEach((q, i) => { if (i !== iR) Sim.circle(ctx, q[0], q[1], 3.6, { fill: C.navy }); });
        red = { x: pts[iR][0], y: pts[iR][1], rx: pts[iR][0], ry: sceneMid, A };
        if (p.rest) {
          Sim.line(ctx, red.rx, sceneMid - A, red.rx, sceneMid + A, { color: C.red, width: 1.2, dash: [2, 3] });
          Sim.line(ctx, red.rx - 7, sceneMid, red.rx + 7, sceneMid, { color: C.red, width: 2 });
        }
        Sim.circle(ctx, red.x, red.y, 6.5, { fill: C.red, stroke: '#fff', width: 2 });
      } else {
        const rows = 7;
        const dx = wide ? 10.5 : 9;
        const A = 0.62 * lam / TAU;
        const n = Math.floor((span + 40) / dx);
        const rowY = (j) => sceneTop + 12 + (j * (sceneH - 24)) / (rows - 1);
        const iR = Math.round(n * 0.42), jR = 3;
        for (let j = 0; j < rows; j++) {
          for (let i = -2; i <= n; i++) {
            const xr = x0 - 20 + i * dx + (hash(i * 13 + j * 7) - 0.5) * dx * 0.55;
            const yj = rowY(j) + (hash(i * 5 + j * 11) - 0.5) * 6;
            const x = xr + A * Math.sin(ph(xr));
            if (i === iR && j === jR) { red = { x, y: yj, rx: xr, ry: yj, A }; continue; }
            Sim.circle(ctx, x, yj, 2.7, { fill: C.navy });
          }
        }
        if (red) {
          if (p.rest) {
            Sim.line(ctx, red.rx - A, red.y, red.rx + A, red.y, { color: C.red, width: 1.2, dash: [2, 3] });
            Sim.line(ctx, red.rx, red.y - 9, red.rx, red.y + 9, { color: C.red, width: 2 });
          }
          Sim.circle(ctx, red.x, red.y, 6, { fill: C.red, stroke: '#fff', width: 2 });
        }
      }
      ctx.restore();
      Sim.rect(ctx, 0.5, sceneTop + 0.5, w - 1, sceneH - 1, { stroke: '#dbe4f0', width: 1 });

      /* graph 1: displacement–distance */
      const g1 = Sim.graph(ctx, Object.assign({
        xmin: x0, xmax: x1, ymin: -1.3, ymax: 1.3, ticks: false, xticks: 8, yticks: 4,
        ylabel: long ? 'displacement (+ = to the right)' : 'displacement (+ = up)',
        title: 'displacement–distance graph (a snapshot)'
      }, b1)).axes();
      g1.plot((x) => Math.sin(ph(x)), { color: C.navy, width: 2.6 });
      Sim.text(ctx, 'distance x', b1.x + b1.w - 2, g1.py(0) + 12, { size: 12, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });

      /* graph 2: pressure–distance (longitudinal) or displacement–time of the red particle (transverse) */
      if (long) {
        const g2 = Sim.graph(ctx, Object.assign({
          xmin: x0, xmax: x1, ymin: -1.3, ymax: 1.3, ticks: false, xticks: 8, yticks: 4,
          ylabel: 'pressure − normal pressure', title: 'pressure–distance graph'
        }, b2)).axes();
        g2.plot((x) => Math.cos(ph(x)), { color: C.green, width: 2.6 });
        Sim.text(ctx, 'distance x', b2.x + b2.w - 2, g2.py(0) + 12, { size: 12, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
        featLines();
        if (red) g2.dot(red.rx, Math.cos(ph(red.rx)), { color: C.red, r: 5.5 });
      } else if (red) {
        featLines();
        const W = 2 * T_DEMO;
        const t0 = Math.floor(t / W) * W;
        const tau = t - t0;
        const g2 = Sim.graph(ctx, Object.assign({
          xmin: 0, xmax: W, ymin: -1.3, ymax: 1.3, ticks: false, xstep: 0.5, yticks: 4,
          ylabel: 'displacement of the red particle', title: 'displacement–time graph (red particle only)'
        }, b2)).axes();
        const q = (red.rx - x0) / lam;
        const yR = (tt) => Math.sin(TAU * (tt / T_DEMO - q));
        g2.plot((tt) => yR(t0 + tt), { from: 0, to: tau, color: C.red, width: 2.6 });
        g2.plot((tt) => yR(t0 + tt), { from: tau, to: W, color: '#f3b3b3', width: 1.5, dash: [5, 5] });
        g2.dot(tau, yR(t), { color: C.red, r: 5.5 });
        Sim.text(ctx, 'time t', b2.x + b2.w - 2, g2.py(0) + 12, { size: 12, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
        // one period, trough to trough (t0 is a whole number of periods)
        let tp = ((0.75 + q) * T_DEMO) % T_DEMO;
        while (tp < 0.05 * W) tp += T_DEMO;
        if (tp + T_DEMO <= W) {
          const y = g2.py(-1.18);
          Sim.line(ctx, g2.px(tp), g2.py(-1), g2.px(tp), y, { color: C.purple, width: 1, dash: [3, 3] });
          Sim.line(ctx, g2.px(tp + T_DEMO), g2.py(-1), g2.px(tp + T_DEMO), y, { color: C.purple, width: 1, dash: [3, 3] });
          bracket(ctx, g2.px(tp), g2.px(tp + T_DEMO), y, 'period T', C.purple);
        }
      }
      if (red) g1.dot(red.rx, Math.sin(ph(red.rx)), { color: C.red, r: 5.5 });

      /* wavelength bracket on graph 1, between troughs (or rarefactions) along the bottom */
      const fx = feats.filter((f) => f[1] === 1).map((f) => f[0]).sort((a, b) => a - b);
      if (fx.length && fx[0] + lam <= x1) {
        const y = g1.py(-1.18);
        bracket(ctx, fx[0], fx[0] + lam, y, 'wavelength λ', C.purple);
      }
    },
    readout(s) {
      if (s.p.type === 'long') {
        return [
          s.w < 640 ? ['C, R =', 'compression, rarefaction'] : null,
          ['particles oscillate', 'parallel to the energy transfer'],
          ['compression to next rarefaction', 'λ/2'],
          ['pressure is highest where', 'displacement = 0 (graph sloping down)', true],
          ['examples', 'sound, ultrasound, P-waves']
        ];
      }
      return [
        ['particles oscillate', 'perpendicular to the energy transfer'],
        ['crest to next crest', 'λ'],
        ['red particle', 'only moves up and down', true],
        ['examples', 'light and all EM waves, waves on strings, S-waves']
      ];
    }
  });

  /* ======================================================================
     2. v = fλ explorer
     ====================================================================== */
  const X_MAX = 8;
  const SWEEP = 4;
  Sim.create('#sim-vfl', {
    title: 'v = fλ explorer: linked wave graphs',
    height: (w) => (w >= 640 ? 450 : 470),
    controls: [
      { key: 'f', label: 'Frequency f', min: 0.5, max: 2.5, step: 0.05, value: 1.0, unit: 'Hz', format: (v) => v.toFixed(2) },
      { key: 'v', label: 'Wave speed v', min: 1, max: 4, step: 0.1, value: 2.0, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'A', label: 'Amplitude A', min: 0.05, max: 0.4, step: 0.01, value: 0.25, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'crest', type: 'check', label: 'Follow one crest', value: true }
    ],
    animate: true,
    init(s) { s.state = { xP: 2.0, drag: false, b1: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const lam = p.v / Math.max(p.f, 1e-6);
      const t = s.t;
      const y = (x, tt) => p.A * Math.sin(TAU * (p.f * tt - x / lam));
      const left = 52, right = 18;
      const gh = (h - 32 - 40 - 76) / 2;
      const b1 = { x: left, y: 32, w: w - left - right, h: gh };
      const b2 = { x: left, y: 32 + gh + 76, w: w - left - right, h: gh };
      st.b1 = b1;

      const g1 = edgeGraph(ctx, Object.assign({
        xmin: 0, xmax: X_MAX, ymin: -0.6, ymax: 0.6, xstep: 1, ystep: 0.2,
        xlabel: 'distance x / m', ylabel: 'displacement / m', title: 'displacement–distance (snapshot at time t)'
      }, b1));
      g1.plot((x) => y(x, t), { color: C.navy, width: 2.8 });

      // wavelength bracket between two neighbouring troughs, along the bottom of the graph
      const trough0 = p.v * t - (3 * lam) / 4; // position of one trough
      const xa = trough0 - Math.floor((trough0 - 0.2) / lam) * lam; // first trough at or after 0.2 m
      if (xa + lam <= X_MAX - 0.1) {
        const yb = g1.py(-Math.min(0.53, p.A + 0.12));
        Sim.line(ctx, g1.px(xa), g1.py(-p.A), g1.px(xa), yb, { color: C.purple, width: 1, dash: [3, 3] });
        Sim.line(ctx, g1.px(xa + lam), g1.py(-p.A), g1.px(xa + lam), yb, { color: C.purple, width: 1, dash: [3, 3] });
        bracket(ctx, g1.px(xa), g1.px(xa + lam), yb, 'λ = ' + lam.toFixed(2) + ' m', C.purple);
      } else {
        Sim.text(ctx, 'λ = ' + lam.toFixed(1) + ' m is longer than this window', b1.x + b1.w - 6, b1.y + 12, { size: 12, color: C.purple, bold: true, align: 'right', bg: 'rgba(255,255,255,0.9)' });
      }

      // a crest we follow as it travels at speed v
      if (p.crest) {
        const K = Math.max(1, Math.ceil((X_MAX + 0.6) / lam));
        let xc = ((p.v * t - lam / 4) % (K * lam) + K * lam) % (K * lam);
        if (xc <= X_MAX) {
          g1.dot(xc, p.A, { color: C.orange, r: 6, label: 'crest', dy: p.A > 0.3 ? 14 : -14, dx: 9 });
        }
      }
      // point P
      g1.vline(st.xP, { color: C.green, dash: [4, 4], width: 1.2 });
      g1.dot(st.xP, y(st.xP, t), { color: C.green, r: 6.5 });
      const pRight = st.xP < X_MAX - 1.2;
      const yPv = y(st.xP, t);
      Sim.text(ctx, 'P (drag me)', g1.px(st.xP) + (pRight ? 10 : -10), g1.py(yPv) + (yPv > 0 ? 16 : -16), { size: 12.5, bold: true, color: C.green, align: pRight ? 'left' : 'right', bg: 'rgba(255,255,255,0.9)', pad: 2 });

      // displacement–time graph for P (oscilloscope-style sweep)
      const t0 = Math.floor(t / SWEEP) * SWEEP;
      const tau = t - t0;
      const g2 = edgeGraph(ctx, Object.assign({
        xmin: 0, xmax: SWEEP, ymin: -0.6, ymax: 0.6, xstep: 0.5, ystep: 0.2,
        xlabel: 'time / s (sweep restarts every 4 s)', ylabel: 'displacement of P / m', title: 'displacement–time for point P'
      }, b2));
      g2.plot((q) => y(st.xP, t0 + q), { from: 0, to: tau, color: C.green, width: 2.8 });
      g2.plot((q) => y(st.xP, t0 + q), { from: tau, to: SWEEP, color: '#a9d8b4', width: 1.5, dash: [5, 5] });
      g2.dot(tau, y(st.xP, t), { color: C.green, r: 6 });
      // period bracket between two successive troughs of P's motion, along the bottom
      const T = 1 / Math.max(p.f, 1e-6);
      let tpk = ((0.75 + st.xP / lam) * T - t0) % T;
      if (tpk < 0) tpk += T;
      while (tpk < 0.12) tpk += T;
      if (tpk + T <= SWEEP - 0.05) {
        const yb = g2.py(-Math.min(0.53, p.A + 0.12));
        Sim.line(ctx, g2.px(tpk), g2.py(-p.A), g2.px(tpk), yb, { color: C.purple, width: 1, dash: [3, 3] });
        Sim.line(ctx, g2.px(tpk + T), g2.py(-p.A), g2.px(tpk + T), yb, { color: C.purple, width: 1, dash: [3, 3] });
        bracket(ctx, g2.px(tpk), g2.px(tpk + T), yb, 'T = ' + T.toFixed(2) + ' s', C.purple);
      }
    },
    readout(s) {
      const { f, v, A } = s.p;
      const lam = v / Math.max(f, 1e-6);
      return [
        ['f =', f.toFixed(2) + ' Hz'],
        ['T = 1/f =', (1 / Math.max(f, 1e-6)).toFixed(3) + ' s'],
        ['λ = v/f =', lam.toFixed(2) + ' m', true],
        ['check: fλ =', (f * lam).toFixed(2) + ' m s⁻¹ = v'],
        ['amplitude', A.toFixed(2) + ' m (changes neither v nor λ)']
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) {
        const b = s.state.b1;
        if (b && pt.y >= b.y - 14 && pt.y <= b.y + b.h + 14) { s.state.drag = true; setP(s, pt.x); }
      },
      move(s, pt) { if (pt.down && s.state.drag) setP(s, pt.x); },
      up(s) { s.state.drag = false; }
    }
  });
  function setP(s, X) {
    const b = s.state.b1;
    if (!b) return;
    const x = ((X - b.x) / b.w) * X_MAX;
    s.state.xP = Math.round(Sim.clamp(x, 0, X_MAX) * 20) / 20;
  }

  /* ======================================================================
     3. Core practical 4 — speed of sound with a two-beam oscilloscope
     ====================================================================== */
  const V_SOUND = 343; // m s⁻¹ at about 20 °C
  const TIMEBASES = [0.05, 0.1, 0.2, 0.5]; // ms per division
  const lamCm = (fk) => (V_SOUND * 100) / (Math.max(fk, 0.01) * 1000);
  const phaseDeg = (d, fk) => {
    const q = ((d / lamCm(fk)) % 1 + 1) % 1;
    return q * 360;
  };
  const phaseErr = (d, fk) => { const ph = phaseDeg(d, fk); return Math.min(ph, 360 - ph); };
  function timebase(fk) {
    let best = TIMEBASES[0];
    TIMEBASES.forEach((tb) => { if (Math.abs(10 * tb * fk - 4) < Math.abs(10 * best * fk - 4)) best = tb; });
    return best;
  }

  Sim.create('#sim-cp4', {
    title: 'Core Practical 4: speed of sound with an oscilloscope',
    height: (w) => (w >= 700 ? 480 : 700),
    controls: [
      {
        key: 'f', label: 'Signal generator frequency f', min: 1.0, max: 5.0, step: 0.1, value: 2.0, unit: 'kHz', format: (v) => v.toFixed(1),
        onChange: (s) => { if (s.state.data.length) s.state.msg = 'f changed, so the old readings were cleared'; s.state.data = []; }
      },
      { key: 'd', label: 'Microphone position on the rule', min: 5, max: 100, step: 0.1, value: 10, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'hint', type: 'check', label: 'Show the phase difference (hint)', value: false },
      { type: 'button', label: 'Record in-phase position', onClick: (s) => recordCP4(s) },
      { type: 'button', label: 'Clear readings', ghost: true, onClick: (s) => { s.state.data = []; s.state.msg = ''; } }
    ],
    init(s) { s.state = { data: [], msg: '', drag: false, bench: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const fk = p.f;
      const lam = lamCm(fk);

      /* ---- bench ---- */
      const benchH = 132;
      const rx0 = 78, rx1 = w - 26;
      const X = (cm) => rx0 + (cm / 100) * (rx1 - rx0);
      st.bench = { rx0, rx1, h: benchH };
      Sim.rect(ctx, 0, 0, w, benchH, { fill: '#f6f9ff' });
      const ruleY = benchH - 34;
      const yS = ruleY - 34;
      // sound wavefronts (a snapshot of the compressions)
      ctx.save();
      ctx.beginPath(); ctx.rect(X(0), 0, rx1 - X(0) + 20, ruleY); ctx.clip();
      for (let n = 1; X(n * lam) < w + 40; n++) {
        const r = X(n * lam) - X(0);
        ctx.strokeStyle = 'rgba(77,171,247,0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(X(0), yS, r, -0.55, 0.55);
        ctx.stroke();
      }
      ctx.restore();
      // speaker
      Sim.rect(ctx, X(0) - 40, yS - 28, 30, 56, { fill: '#495057', r: 4 });
      Sim.polyline(ctx, [[X(0) - 10, yS - 12], [X(0), yS - 26], [X(0), yS + 26], [X(0) - 10, yS + 12]], { close: true, color: '#343a40', width: 1.5, fill: '#868e96' });
      Sim.text(ctx, 'speaker', X(0) - 25, yS - 38, { size: 11.5, color: C.muted, align: 'center' });
      // metre rule
      Sim.rect(ctx, X(0), ruleY, X(100) - X(0), 14, { fill: '#f4e2b8', stroke: '#c9a75b', width: 1 });
      const tickEvery = wide ? 10 : 20;
      for (let cm = 0; cm <= 100; cm += 5) {
        const major = cm % tickEvery === 0;
        Sim.line(ctx, X(cm), ruleY, X(cm), ruleY + (major ? 9 : 5), { color: '#7a5c1e', width: 1 });
        if (major) Sim.text(ctx, String(cm), X(cm), ruleY + 16, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'cm', X(0) - 10, ruleY + 22, { size: 11, color: C.muted, align: 'right' });
      // microphone on a stand
      const mx = X(p.d);
      Sim.line(ctx, mx + 6, yS + 6, mx + 6, ruleY, { color: '#868e96', width: 3 });
      Sim.rect(ctx, mx - 4, ruleY - 4, 20, 5, { fill: '#868e96', r: 2 });
      Sim.rect(ctx, mx - 2, yS - 7, 22, 14, { fill: '#343a40', r: 6 });
      Sim.circle(ctx, mx, yS, 8, { fill: '#212529', stroke: '#fff', width: 1.5 });
      Sim.line(ctx, mx, ruleY + 2, mx, ruleY + 12, { color: C.red, width: 2 });
      Sim.text(ctx, 'microphone', Sim.clamp(mx + 10, 110, w - 50), yS - 34, { size: 11.5, color: C.muted, align: 'center' });
      Sim.text(ctx, 'd = ' + p.d.toFixed(1) + ' cm', Sim.clamp(mx + 10, 80, w - 50), yS - 18, { size: 12.5, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.85)' });

      /* ---- oscilloscope ---- */
      const sc = wide
        ? { x: 18, y: benchH + 18, w: Math.round(w * 0.47) - 18, h: h - benchH - 36 }
        : { x: 10, y: benchH + 14, w: w - 20, h: 250 };
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#343a40', r: 10 });
      const scr = { x: sc.x + 12, y: sc.y + 30, w: sc.w - 24, h: sc.h - 44 };
      Sim.rect(ctx, scr.x, scr.y, scr.w, scr.h, { fill: '#0c1f17', r: 4 });
      const tb = timebase(fk);
      Sim.text(ctx, 'OSCILLOSCOPE', sc.x + 12, sc.y + 15, { size: 11.5, bold: true, color: '#ced4da' });
      Sim.text(ctx, 'time-base ' + tb + ' ms/div', sc.x + sc.w - 12, sc.y + 15, { size: 11.5, color: '#ced4da', align: 'right' });
      // graticule 10 × 8
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 10; i++) { const gx = Math.round(scr.x + (i * scr.w) / 10) + 0.5; ctx.moveTo(gx, scr.y); ctx.lineTo(gx, scr.y + scr.h); }
      for (let j = 0; j <= 8; j++) { const gy = Math.round(scr.y + (j * scr.h) / 8) + 0.5; ctx.moveTo(scr.x, gy); ctx.lineTo(scr.x + scr.w, gy); }
      ctx.stroke();
      ctx.restore();
      const div = scr.h / 8;
      const y1c = scr.y + 2 * div, y2c = scr.y + 6 * div;
      const a2 = Sim.clamp(1.5 * Math.pow(15 / Math.max(p.d, 15), 0.7), 0.4, 1.5);
      const phi = TAU * (p.d / lam);
      const trace = (yc, amp, shift, color, noise) => {
        const pts = [];
        for (let i = 0; i <= scr.w; i += 1.5) {
          const tt = (i / scr.w) * 10 * tb; // ms
          pts.push([scr.x + i, yc - div * (amp * Math.sin(TAU * fk * tt - shift) + (noise ? (Math.random() - 0.5) * 0.08 : 0))]);
        }
        ctx.save();
        ctx.shadowColor = color; ctx.shadowBlur = 4;
        Sim.polyline(ctx, pts, { color, width: 2 });
        ctx.restore();
      };
      trace(y1c, 1.5, 0, '#ffd43b', false);
      trace(y2c, a2, phi, '#66d9e8', true);
      Sim.text(ctx, 'CH1: signal to speaker', scr.x + 6, scr.y + 10, { size: 11, color: '#ffd43b' });
      Sim.text(ctx, 'CH2: microphone', scr.x + 6, scr.y + scr.h - 10, { size: 11, color: '#66d9e8' });
      // a marker line to help line up the peaks
      const xPeak = scr.x + (scr.w * (0.25 / (fk * 10 * tb)));
      Sim.line(ctx, xPeak, scr.y + 4, xPeak, scr.y + scr.h - 18, { color: 'rgba(255,255,255,0.35)', width: 1, dash: [3, 4] });
      const err = phaseErr(p.d, fk);

      /* ---- graph of position against number of wavelengths ---- */
      const gb = wide
        ? { x: Math.round(w * 0.47) + 62, y: benchH + 44, w: w - Math.round(w * 0.47) - 62 - 22, h: h - benchH - 44 - 46 }
        : { x: 56, y: sc.y + sc.h + 38, w: w - 56 - 20, h: h - (sc.y + sc.h + 38) - 44 };
      const pts = cp4Points(st.data, lam);
      const nMax = Math.max(5, pts.reduce((m, q) => Math.max(m, q[0]), 0) + 1);
      const g = Sim.graph(ctx, Object.assign({
        xmin: 0, xmax: nMax, ymin: 0, ymax: 100, xstep: nMax > 10 ? 2 : 1, ystep: 20,
        xlabel: 'n (wavelengths moved)', ylabel: 'd / cm', title: 'mic position against n'
      }, gb)).axes();
      const fit = fitLine(pts);
      if (fit && pts.length >= 2) g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: q[2] > 25 ? C.red : C.navy, r: 4.5 }));
      if (!pts.length) {
        const lines = ['Slide the microphone until the', 'two traces are in phase, then', 'press “Record in-phase position”.'];
        lines.forEach((ln, i) => Sim.text(ctx, ln, gb.x + gb.w / 2, gb.y + gb.h / 2 - 18 + i * 18, { size: 12.5, color: C.muted, align: 'center', italic: true }));
      }
      if (p.hint) {
        Sim.text(ctx, err < 8 ? 'in phase ✓' : 'phase difference ' + phaseDeg(p.d, fk).toFixed(0) + '°', scr.x + scr.w - 6, scr.y + scr.h - 10, { size: 12, bold: true, color: err < 8 ? '#8ce99a' : '#ffa8a8', align: 'right' });
      }
    },
    readout(s) {
      const st = s.state;
      const lam = lamCm(s.p.f);
      const pts = cp4Points(st.data, lam);
      const out = [['f =', (s.p.f * 1000).toFixed(0) + ' Hz'], ['readings:', String(pts.length)]];
      if (s.p.hint) out.push(['phase difference =', phaseDeg(s.p.d, s.p.f).toFixed(0) + '°']);
      const fit = fitLine(pts);
      if (fit && pts.length >= 3) {
        const lm = fit.m / 100;
        out.push(['gradient = λ =', fit.m.toFixed(2) + ' cm']);
        out.push(['v = fλ =', (s.p.f * 1000 * lm).toFixed(0) + ' m s⁻¹', true]);
        out.push(['accepted value at 20 °C:', V_SOUND + ' m s⁻¹']);
      } else if (pts.length) out.push(['take at least 3 readings', 'to fit a line']);
      if (st.msg) out.push(['note:', st.msg]);
      return out;
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) {
        const b = s.state.bench;
        if (!b || pt.y > b.h) return;
        const mx = b.rx0 + (s.p.d / 100) * (b.rx1 - b.rx0);
        if (Math.abs(pt.x - mx) < 34) { s.state.drag = true; moveMic(s, pt.x); }
      },
      move(s, pt) { if (pt.down && s.state.drag) moveMic(s, pt.x); },
      up(s) { s.state.drag = false; }
    }
  });
  function moveMic(s, x) {
    const b = s.state.bench;
    const d = ((x - b.rx0) / Math.max(1, b.rx1 - b.rx0)) * 100;
    s.set('d', Math.round(Sim.clamp(d, 5, 100) * 10) / 10);
  }
  function recordCP4(s) {
    const d = s.p.d;
    const err = phaseErr(d, s.p.f);
    s.state.data.push({ d: Sim.clamp(d + gaussian() * 0.15, 0, 100), err });
    s.state.msg = err > 25 ? 'the traces were ' + err.toFixed(0) + '° out of phase for that reading' : '';
  }
  /* n is the number of wavelengths counted from the first (nearest) reading */
  function cp4Points(data, lam) {
    if (!data.length) return [];
    const sorted = data.slice().sort((a, b) => a.d - b.d);
    const d0 = sorted[0].d;
    return sorted.map((q) => [Math.round((q.d - d0) / lam), q.d, q.err]);
  }

  /* ======================================================================
     4. Intensity from a point source
     ====================================================================== */
  const BEAM_AREA = 0.010; // m²
  const R_MAX = 4.2;
  Sim.create('#sim-intensity', {
    title: 'Intensity spreading out from a source',
    height: (w) => (w >= 700 ? 350 : 540),
    controls: [
      { key: 'src', type: 'select', label: 'Source', value: 'point', options: [['point', 'Point source (spreads out in all directions)'], ['beam', 'Parallel beam, cross-section 0.010 m²']] },
      { key: 'P', label: 'Power P', min: 1, max: 100, step: 1, value: 60, unit: 'W', format: (v) => v.toFixed(0) },
      { key: 'r', label: 'Detector distance r', min: 0.5, max: 4, step: 0.05, value: 2, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'grid', type: 'check', label: 'Show windows at 1 m, 2 m and 3 m', value: true }
    ],
    animate: true,
    init(s) {
      const dots = [];
      for (let i = 0; i < 150; i++) dots.push({ a: Math.random() * 2 - 1, b: Math.random() * 2 - 1, d: Math.random() * R_MAX });
      s.state = { dots, drag: false, scene: null };
    },
    update(s, dt) {
      s.state.dots.forEach((q) => {
        q.d += 0.8 * dt;
        if (q.d > R_MAX) { q.d -= R_MAX; q.a = Math.random() * 2 - 1; q.b = Math.random() * 2 - 1; }
      });
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const point = p.src === 'point';
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.58), h } : { x: 0, y: 0, w, h: 270 };
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#10172a' });
      const x0 = sc.x + 34, sx = (sc.w - 34 - 46) / R_MAX;
      const yc = sc.y + sc.h / 2 + 4;
      const kap = (sc.h - 50) / (2.56 * R_MAX);
      const X = (d) => x0 + d * sx;
      st.scene = { x0, sx, sc };
      const half = (d) => kap * (point ? d : 1);
      const corner = (d, a, b) => {
        const u = half(d);
        return [X(d) + b * 0.42 * u, yc - a * u + b * 0.28 * u];
      };
      const iAt = (d) => (point ? p.P / (4 * Math.PI * Math.max(d, 0.05) * Math.max(d, 0.05)) : p.P / BEAM_AREA);
      const I1 = iAt(1);
      const glow = (d) => Sim.clamp(0.5 * Math.sqrt(iAt(d) / I1) * (p.P / 60) ** 0.5, 0.05, 0.75);
      const quad = (d, fill, stroke, lw) => {
        const q = [corner(d, 1, -1), corner(d, 1, 1), corner(d, -1, 1), corner(d, -1, -1)];
        Sim.polyline(ctx, q, { close: true, fill, color: stroke, width: lw || 1.2 });
        return q;
      };
      // pyramid (or prism) edges
      [[1, -1], [1, 1], [-1, 1], [-1, -1]].forEach(([a, b]) => {
        const e = corner(R_MAX, a, b), s0 = point ? [X(0), yc] : corner(0, a, b);
        Sim.line(ctx, s0[0], s0[1], e[0], e[1], { color: 'rgba(255,212,59,0.28)', width: 1 });
      });
      // reference windows at 1, 2, 3 m
      if (p.grid) {
        [1, 2, 3].forEach((d) => {
          const q = quad(d, 'rgba(255,212,59,' + (glow(d) * 0.35).toFixed(3) + ')', 'rgba(255,255,255,0.45)', 1);
          const n = point ? d : 1;
          for (let k = 1; k < n; k++) {
            const f = -1 + (2 * k) / n;
            const p1 = corner(d, 1, f), p2 = corner(d, -1, f), p3 = corner(d, f, -1), p4 = corner(d, f, 1);
            Sim.line(ctx, p1[0], p1[1], p2[0], p2[1], { color: 'rgba(255,255,255,0.35)', width: 1 });
            Sim.line(ctx, p3[0], p3[1], p4[0], p4[1], { color: 'rgba(255,255,255,0.35)', width: 1 });
          }
          if (Math.abs(d - p.r) > 0.3) Sim.text(ctx, d + ' m', X(d), Math.min(q[0][1], q[1][1]) - 9, { size: 11, color: '#ced4da', align: 'center' });
        });
      }
      // energy "packets"
      st.dots.forEach((q) => {
        const pos = corner(q.d, q.a, q.b);
        Sim.circle(ctx, pos[0], pos[1], 1.8, { fill: 'rgba(255,224,102,0.9)' });
      });
      // detector window at r
      const qd = quad(p.r, 'rgba(77,171,247,' + glow(p.r).toFixed(3) + ')', '#74c0fc', 2.2);
      const topY = Math.min(qd[0][1], qd[1][1]);
      const botY = Math.max(qd[2][1], qd[3][1]);
      const below = !point || p.r < 2.5; // keep clear of the 1 m / 2 m / 3 m labels above the windows
      Sim.text(ctx, 'detector at r = ' + p.r.toFixed(2) + ' m', Sim.clamp(X(p.r), sc.x + 70, sc.x + sc.w - 70), below ? botY + 14 : Math.max(sc.y + 12, topY - 12), { size: 12, bold: true, color: '#a5d8ff', align: 'center' });
      // source
      if (point) {
        Sim.circle(ctx, X(0), yc, 9, { fill: '#ffe066' });
        Sim.circle(ctx, X(0), yc, 15, { fill: 'rgba(255,224,102,0.25)' });
      } else {
        quad(0, '#ffe066', '#fab005', 1.5);
      }
      Sim.text(ctx, point ? 'area ∝ r², so I ∝ 1/r²' : 'area stays the same, so I stays the same', sc.x + sc.w / 2, sc.y + sc.h - 12, { size: 12.5, color: '#ffe066', align: 'center', bold: true });

      // graph of I against r
      const gb = wide
        ? { x: sc.w + 64, y: 34, w: w - sc.w - 64 - 20, h: h - 34 - 46 }
        : { x: 60, y: sc.h + 40, w: w - 60 - 20, h: h - sc.h - 40 - 44 };
      const ymax = point ? niceMax(p.P / (4 * Math.PI * 0.25)) : niceMax(iAt(1) * 1.4);
      const g = Sim.graph(ctx, Object.assign({
        xmin: 0, xmax: 4, ymin: 0, ymax, xstep: 1,
        xlabel: 'r / m', ylabel: '', title: 'intensity against distance'
      }, gb)).axes();
      g.plot((r) => (r < 0.2 ? null : iAt(r)), { from: 0.2, to: 4, color: C.orange, width: 2.6 });
      g.vline(p.r, { color: C.blue, width: 1.2 });
      Sim.text(ctx, 'I / W m⁻²', g.x + 6, g.y + 2, { size: 12.5, bold: true, baseline: 'top', bg: 'rgba(255,255,255,0.92)', pad: 2 });
      g.dot(p.r, iAt(p.r), { color: C.blue, r: 5.5 });
      if (point && 2 * p.r <= 4) {
        const leftSide = 2 * p.r > 2.6;
        g.dot(2 * p.r, iAt(2 * p.r), { color: C.purple, r: 4.5, label: 'at 2r: I ÷ 4', dx: leftSide ? -8 : 8, dy: leftSide ? -32 : -14, align: leftSide ? 'right' : 'left' });
      }
    },
    readout(s) {
      const { P, r } = s.p;
      if (s.p.src === 'point') {
        const A = 4 * Math.PI * r * r;
        const I = P / A;
        return [
          ['A = 4πr² =', Sim.fmt(A, 3) + ' m²'],
          ['I = P/A =', Sim.fmt(I, 3) + ' W m⁻²', true],
          ['at 2r:', Sim.fmt(I / 4, 3) + ' W m⁻² (a quarter)'],
          ['a 1.0 cm² detector receives', Sim.fmt(I * 1e-4, 3) + ' W']
        ];
      }
      const I = P / BEAM_AREA;
      return [
        ['A =', '0.010 m² at every distance'],
        ['I = P/A =', Sim.fmt(I, 3) + ' W m⁻²', true],
        ['a 1.0 cm² detector receives', Sim.fmt(I * 1e-4, 3) + ' W']
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) {
        const sc = s.state.scene;
        if (!sc || pt.x > sc.sc.x + sc.sc.w || pt.y > sc.sc.y + sc.sc.h) return;
        s.state.drag = true; moveDet(s, pt.x);
      },
      move(s, pt) { if (pt.down && s.state.drag) moveDet(s, pt.x); },
      up(s) { s.state.drag = false; }
    }
  });
  function moveDet(s, x) {
    const sc = s.state.scene;
    const r = (x - sc.x0) / Math.max(1, sc.sx);
    s.set('r', Math.round(Sim.clamp(r, 0.5, 4) * 20) / 20);
  }

  /* ======================================================================
     5. Pulse-echo: an ultrasound A-scan
     ====================================================================== */
  const V_T = 1.54; // speed of ultrasound in soft tissue, mm per μs (1540 m s⁻¹)
  const D1 = 13; // depth of the first boundary / mm
  const DEPTH = 30; // depth shown / mm
  const T_SCAN = (2 * DEPTH) / V_T; // μs
  const LOOP = T_SCAN + 6;
  const R1 = 0.62, R2 = 0.5;
  Sim.create('#sim-echo', {
    title: 'Pulse-echo: an ultrasound A-scan',
    height: (w) => (w >= 640 ? 440 : 480),
    controls: [
      { key: 'f', label: 'Ultrasound frequency f', min: 1, max: 5, step: 0.1, value: 2, unit: 'MHz', format: (v) => v.toFixed(1) },
      { key: 'N', label: 'Pulse length', min: 1, max: 8, step: 1, value: 4, unit: 'cycles', format: (v) => v.toFixed(0) },
      { key: 'gap', label: 'Boundary gap', min: 0.5, max: 8, step: 0.1, value: 4, unit: 'mm', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    init(s) { s.state = { tu: 0 }; },
    update(s, dt) {
      s.state.tu += dt * 11;
      if (s.state.tu > LOOP) s.state.tu = 0;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const tu = s.state.tu;
      const lam = V_T / Math.max(p.f, 0.1); // mm
      const tauP = p.N / Math.max(p.f, 0.1); // μs
      const Ls = V_T * tauP; // spatial pulse length, mm
      const d1 = D1, d2 = D1 + p.gap;
      const xL = 58, xR = w - 18;
      const X = (d) => xL + (d / DEPTH) * (xR - xL);
      const pxmm = (xR - xL) / DEPTH;
      const top = 30, sceneH = 178;
      const laneO = top + 52, laneE = top + 124, amp = 22;

      // tissue
      Sim.rect(ctx, X(0), top, X(d1) - X(0), sceneH, { fill: '#fdf1ec' });
      Sim.rect(ctx, X(d1), top, X(d2) - X(d1), sceneH, { fill: '#f5d5c8' });
      Sim.rect(ctx, X(d2), top, X(DEPTH) - X(d2), sceneH, { fill: '#fbe6dd' });
      [d1, d2].forEach((d) => Sim.line(ctx, X(d), top - 6, X(d), top + sceneH, { color: '#c2255c', width: 2 }));
      Sim.text(ctx, 'boundary 1', X(d1) - 5, top - 12, { size: 11.5, bold: true, color: '#a61e4d', align: 'right' });
      Sim.text(ctx, 'boundary 2', X(d2) + 5, top - 12, { size: 11.5, bold: true, color: '#a61e4d' });
      // probe
      Sim.rect(ctx, 6, laneO - 26, xL - 10, laneE - laneO + 52, { fill: '#495057', r: 6 });
      Sim.rect(ctx, xL - 8, laneO - 26, 8, laneE - laneO + 52, { fill: '#adb5bd', r: 2 });
      Sim.text(ctx, 'probe', (xL - 4) / 2 + 3, (laneO + laneE) / 2, { size: 11.5, bold: true, color: '#fff', align: 'center', rotate: -Math.PI / 2 });
      Sim.text(ctx, 'pulse out →', X(0) + 6, laneO - 32, { size: 12, bold: true, color: C.navy });
      Sim.text(ctx, '← echoes', X(0) + 6, laneE - 32, { size: 12, bold: true, color: C.purple });
      Sim.line(ctx, X(0), laneO, X(DEPTH), laneO, { color: 'rgba(0,43,128,0.18)', width: 1 });
      Sim.line(ctx, X(0), laneE, X(DEPTH), laneE, { color: 'rgba(112,72,232,0.18)', width: 1 });

      const env = (xi) => (xi <= 0 || xi >= Ls ? 0 : Math.pow(Math.sin((Math.PI * xi) / Ls), 2));
      const drawPacket = (fn, lo, hi, yLane, color) => {
        lo = Math.max(0, lo); hi = Math.min(DEPTH, hi);
        if (hi <= lo) return;
        const step = 1 / pxmm; // one pixel
        const showOsc = lam * pxmm >= 5;
        const top1 = [], bot1 = [], osc = [];
        for (let x = lo; x <= hi + 1e-9; x += step * (showOsc ? 0.5 : 1)) {
          const r = fn(x);
          top1.push([X(x), yLane - amp * r.e]);
          bot1.push([X(x), yLane + amp * r.e]);
          osc.push([X(x), yLane - amp * r.y]);
        }
        if (showOsc) {
          Sim.polyline(ctx, top1, { color, width: 1, alpha: 0.3 });
          Sim.polyline(ctx, bot1, { color, width: 1, alpha: 0.3 });
          Sim.polyline(ctx, osc, { color, width: 1.8 });
        } else {
          Sim.polyline(ctx, top1.concat(bot1.reverse()), { close: true, color, width: 1, fill: color === C.navy ? 'rgba(0,43,128,0.35)' : 'rgba(112,72,232,0.35)' });
        }
      };
      const ampOut = (x) => (x < d1 ? 1 : x < d2 ? 0.78 : 0.6);
      // outgoing pulse: leading edge at V·t
      const lead = V_T * tu;
      if (tu < LOOP) {
        drawPacket((x) => {
          const xi = lead - x;
          const e = env(xi) * ampOut(x);
          return { e, y: e * Math.sin((TAU * xi) / lam) };
        }, lead - Ls, lead, laneO, C.navy);
      }
      // echoes travelling back
      const echoes = [[d1, R1], [d2, R2]];
      let lo = Infinity, hi = -Infinity;
      echoes.forEach(([d, R]) => {
        if (V_T * tu < d) return;
        const le = 2 * d - V_T * tu;
        lo = Math.min(lo, le); hi = Math.max(hi, Math.min(d, le + Ls));
      });
      if (hi > lo) {
        drawPacket((x) => {
          let e = 0, yv = 0;
          echoes.forEach(([d, R]) => {
            if (V_T * tu < d || x > d) return;
            const xi = x - (2 * d - V_T * tu);
            const en = env(xi) * R;
            e += en; yv += en * Math.sin((TAU * xi) / lam);
          });
          return { e, y: yv };
        }, lo, hi, laneE, C.purple);
      }
      // depth ruler
      const ry = top + sceneH;
      Sim.line(ctx, X(0), ry, X(DEPTH), ry, { color: C.axis, width: 1.2 });
      for (let d = 0; d <= DEPTH; d += 5) {
        Sim.line(ctx, X(d), ry, X(d), ry + 5, { color: C.axis, width: 1 });
        Sim.text(ctx, String(d), X(d), ry + 7, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'depth / mm', X(DEPTH), ry + 21, { size: 12, bold: true, align: 'right', baseline: 'top' });

      // A-scan: echo amplitude against time, same horizontal scale (x = X(vt/2))
      const resolved = p.gap >= Ls / 2;
      Sim.text(ctx, resolved ? 'two separate echoes ✓' : 'echoes overlap: looks like one boundary ✗', X(DEPTH) - 4, top + sceneH - 12, {
        size: 12.5, bold: true, color: resolved ? C.green : C.red, align: 'right', bg: 'rgba(255,255,255,0.92)'
      });

      // A-scan: echo amplitude against time, on the same horizontal scale (x = X(vt/2))
      const gb = { x: X(0), y: ry + 64, w: X(DEPTH) - X(0), h: h - (ry + 64) - 40 };
      const g = Sim.graph(ctx, Object.assign({
        xmin: 0, xmax: T_SCAN, ymin: 0, ymax: 1.25, xstep: 5, yticks: 2, ticks: true,
        xlabel: 't / μs', ylabel: 'echo amplitude'
      }, gb)).axes();
      Sim.text(ctx, 'A-scan: what the probe receives', gb.x, gb.y - 12, { size: 13.5, bold: true, color: C.navy });
      const t1 = (2 * d1) / V_T, t2 = (2 * d2) / V_T;
      const envT = (dtm) => (dtm <= 0 || dtm >= tauP ? 0 : Math.pow(Math.sin((Math.PI * dtm) / tauP), 2));
      const scan = (t) => 1.0 * envT(t) + R1 * envT(t - t1) + R2 * envT(t - t2);
      [t1, t2].forEach((tt) => Sim.line(ctx, g.px(tt), gb.y, g.px(tt), gb.y + gb.h, { color: 'rgba(194,37,92,0.4)', width: 1, dash: [3, 4] }));
      g.plot(scan, { color: '#ced4da', width: 1.4, dash: [4, 4], samples: 500 });
      g.plot(scan, { from: 0, to: Math.min(tu, T_SCAN), color: C.purple, width: 2.4, samples: 500 });
      Sim.text(ctx, '← pulse sent', g.px(tauP) + 4, g.py(0.7), { size: 11, color: C.muted });
    },
    readout(s) {
      const { f, N, gap } = s.p;
      const lam = V_T / Math.max(f, 0.1);
      const tauP = N / Math.max(f, 0.1);
      const Ls = V_T * tauP;
      const t1 = (2 * D1) / V_T, t2 = (2 * (D1 + gap)) / V_T;
      return [
        ['λ = v/f =', lam.toFixed(2) + ' mm'],
        ['pulse duration τ = N/f =', tauP.toFixed(2) + ' μs'],
        ['pulse length vτ =', Ls.toFixed(2) + ' mm'],
        ['echo times t₁, t₂ =', t1.toFixed(1) + ', ' + t2.toFixed(1) + ' μs'],
        ['depths = vt/2 =', D1.toFixed(1) + ', ' + (D1 + gap).toFixed(1) + ' mm'],
        ['smallest gap resolved ≈ vτ/2 =', (Ls / 2).toFixed(2) + ' mm', true]
      ];
    }
  });
})();
