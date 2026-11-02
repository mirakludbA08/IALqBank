/* Biology 5b-c, Ecology, environment and climate change: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const WHITE = 'rgba(255,255,255,0.9)';

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  /* Round up to a tidy axis maximum */
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    return steps.find((k) => n <= k + 1e-9) * p;
  }
  /* Draw text wrapped to a width; returns the number of lines used. */
  function wrap(ctx, str, x, y, maxW, o, lh) {
    let line = '', n = 0;
    str.split(' ').forEach((wd) => {
      const t = line ? line + ' ' + wd : wd;
      if (line && Sim.measure(ctx, t, o) > maxW) { Sim.text(ctx, line, x, y + n * lh, o); n++; line = wd; } else line = t;
    });
    if (line) { Sim.text(ctx, line, x, y + n * lh, o); n++; }
    return n;
  }
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  function sd(a) {
    if (a.length < 2) return null;
    const m = mean(a);
    return Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / (a.length - 1));
  }

  /* ======================================================================
     1. Random quadrat sampling of a 10 m × 10 m field
     ====================================================================== */
  const FIELD = 10;   // m along each side, so 100 possible 1 m² quadrats

  function makeField(dist) {
    const N = Math.round(550 + Math.random() * 400);
    const pts = [];
    if (dist === 'random') {
      for (let i = 0; i < N; i++) pts.push([Math.random() * FIELD, Math.random() * FIELD]);
    } else {
      const k = 5 + Math.floor(Math.random() * 4);
      const cl = [];
      for (let j = 0; j < k; j++) cl.push({ x: 0.8 + Math.random() * 8.4, y: 0.8 + Math.random() * 8.4, s: 0.45 + Math.random() * 0.6 });
      while (pts.length < N) {
        const c = cl[Math.floor(Math.random() * k)];
        const x = c.x + gaussian() * c.s, y = c.y + gaussian() * c.s;
        if (x >= 0 && x < FIELD && y >= 0 && y < FIELD) pts.push([x, y]);
      }
    }
    const counts = [];
    for (let i = 0; i < FIELD; i++) { counts.push([]); for (let j = 0; j < FIELD; j++) counts[i].push(0); }
    pts.forEach(([x, y]) => { counts[Math.floor(x)][Math.floor(y)]++; });
    return { pts, N, counts };
  }
  function placeQuadrats(s, n) {
    const st = s.state;
    for (let k = 0; k < n; k++) {
      const free = [];
      for (let i = 0; i < FIELD; i++) for (let j = 0; j < FIELD; j++) if (!st.quads.some((q) => q.i === i && q.j === j)) free.push([i, j]);
      if (!free.length) return;
      const [i, j] = free[Math.floor(Math.random() * free.length)];
      st.quads.push({ i, j, n: st.field.counts[i][j] });
      st.est.push(mean(st.quads.map((q) => q.n)) * FIELD * FIELD);
    }
  }
  function newField(s) {
    s.state.field = makeField(s.p.dist);
    s.state.quads = [];
    s.state.est = [];
  }
  function quadLayout(w, h) {
    const wide = w >= 640;
    if (wide) {
      const S = Math.min(h - 62, w * 0.46);
      const fx = 40, fy = 26;
      return { wide, S, fx, fy, gb: { x: fx + S + 78, y: 30, w: w - (fx + S + 78) - 18, h: h - 30 - 46 } };
    }
    const S = Math.min(w - 54, 330);
    const fx = 40, fy = 22;
    const gy = fy + S + 64;
    return { wide, S, fx, fy, gb: { x: 58, y: gy, w: w - 58 - 16, h: h - gy - 44 } };
  }

  Sim.create('#sim-bio-5bc-quadrat', {
    title: 'Random quadrat sampling',
    alt: 'A 10 metre square field of daisies with 1 square metre quadrats placed at random coordinates, and a graph of the population estimate against the number of quadrats',
    height: (w) => (w >= 640 ? 410 : Math.min(w - 54, 330) + 300),
    controls: [
      { key: 'dist', type: 'select', label: 'How the daisies grow', value: 'random', options: [['random', 'Spread at random'], ['clumped', 'In clumps']], onChange: (s) => newField(s) },
      { key: 'show', type: 'check', label: 'Show the true population', value: false },
      { type: 'button', label: 'Place a random quadrat', onClick: (s) => placeQuadrats(s, 1) },
      { type: 'button', label: 'Place 10 more', onClick: (s) => placeQuadrats(s, 10) },
      { type: 'button', label: 'New field', ghost: true, onClick: (s) => newField(s) }
    ],
    init(s) { s.state = {}; newField(s); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const L = quadLayout(w, h);
      const k = L.S / FIELD;
      const X = (m) => L.fx + m * k, Y = (m) => L.fy + L.S - m * k;

      /* the field */
      Sim.rect(ctx, L.fx, L.fy, L.S, L.S, { fill: '#d8f0c8', stroke: '#8fbf6f', width: 1.5 });
      ctx.save();
      ctx.strokeStyle = 'rgba(80,120,60,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < FIELD; i++) {
        ctx.moveTo(Math.round(X(i)) + 0.5, L.fy); ctx.lineTo(Math.round(X(i)) + 0.5, L.fy + L.S);
        ctx.moveTo(L.fx, Math.round(Y(i)) + 0.5); ctx.lineTo(L.fx + L.S, Math.round(Y(i)) + 0.5);
      }
      ctx.stroke();
      const pr = clamp(k * 0.075, 1.6, 2.6);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(90,110,80,0.55)';
      ctx.lineWidth = 0.6;
      st.field.pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), pr, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      ctx.fillStyle = '#f59f00';
      st.field.pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(X(x), Y(y), pr * 0.45, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();

      /* tape measures along two edges */
      for (let m = 0; m <= FIELD; m++) {
        Sim.line(ctx, X(m), L.fy + L.S, X(m), L.fy + L.S + 5, { color: C.axis, width: 1 });
        Sim.line(ctx, L.fx - 5, Y(m), L.fx, Y(m), { color: C.axis, width: 1 });
        if (m % 2 === 0) {
          Sim.text(ctx, String(m), X(m), L.fy + L.S + 7, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
          Sim.text(ctx, String(m), L.fx - 7, Y(m), { size: 10.5, color: C.muted, align: 'right' });
        }
      }
      Sim.text(ctx, 'x / m', L.fx + L.S, L.fy + L.S + 22, { size: 11, color: C.muted, align: 'right', baseline: 'top' });
      Sim.text(ctx, 'y / m', L.fx - 7, L.fy - 10, { size: 11, color: C.muted, align: 'center' });

      /* quadrats */
      const last = st.quads[st.quads.length - 1];
      st.quads.forEach((q) => {
        const isLast = q === last;
        Sim.rect(ctx, X(q.i), Y(q.j + 1), k, k, { stroke: isLast ? C.red : '#e8590c', width: isLast ? 2.4 : 1.6, fill: 'rgba(255,255,255,0.25)' });
        if (k >= 22) Sim.text(ctx, String(q.n), X(q.i + 0.5), Y(q.j + 0.5), { size: 11, bold: true, color: isLast ? C.red : '#c2410c', align: 'center', bg: WHITE, pad: 2 });
      });
      if (last) Sim.text(ctx, 'last quadrat at (' + last.i + ', ' + last.j + ')', L.fx + L.S, L.fy - 10, { size: 11.5, bold: true, color: C.red, align: 'right' });

      /* running estimate */
      const n = st.est.length;
      const xmax = Math.max(10, Math.ceil(n / 10) * 10);
      const ymax = niceCeil(Math.max(1500, st.field.N, ...st.est) * 1.1);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax, ymin: 0, ymax, xlabel: 'number of quadrats', ylabel: 'estimated population', title: L.wide ? 'estimate as more quadrats are added' : null }, L.gb)).axes();
      if (p.show) {
        g.hline(st.field.N, { color: C.green, dash: [6, 4], width: 1.6 });
        g.label(xmax, st.field.N, 'true ' + st.field.N, { size: 11.5, color: C.green, align: 'right', baseline: 'bottom', bg: WHITE });
      }
      if (n) {
        g.path(st.est.map((e, i) => [i + 1, e]), { color: C.blue, width: 2.2 });
        st.est.forEach((e, i) => g.dot(i + 1, e, { color: C.navy, r: n > 30 ? 2.5 : 3.5, stroke: '#fff' }));
      } else {
        Sim.text(ctx, 'Place some quadrats', L.gb.x + L.gb.w / 2, L.gb.y + L.gb.h / 2, { size: 13, italic: true, color: C.muted, align: 'center' });
      }
    },
    readout(s) {
      const st = s.state;
      const counts = st.quads.map((q) => q.n);
      const out = [['quadrats:', String(counts.length)]];
      if (counts.length) {
        const m = mean(counts), sdev = sd(counts);
        out.push(['mean per 1 m² quadrat =', m.toFixed(1) + (sdev == null ? '' : ' ± ' + sdev.toFixed(1) + ' (SD)')]);
        out.push(['estimated population = mean × 100 m² =', Math.round(m * 100).toString(), true]);
        out.push(['percentage frequency =', Math.round((100 * counts.filter((c) => c > 0).length) / counts.length) + '%']);
        if (s.p.show) out.push(['true population =', st.field.N + ' (error ' + (((m * 100 - st.field.N) / st.field.N) * 100).toFixed(0) + '%)']);
      } else if (s.p.show) out.push(['true population =', String(st.field.N)]);
      return out;
    }
  });

  /* ======================================================================
     2. Temperature and Q10
     ====================================================================== */
  /* Rate of an enzyme-controlled reaction: multiplied by Q10 for every 10 °C,
     until denaturation takes over above about 40 °C. */
  const rateQ = (T, q) => (10 * Math.pow(q, (T - 20) / 10)) / (1 + Math.exp((T - 45) / 2));
  function optimum(q) {
    let best = 0, tb = 0;
    for (let t = 20; t <= 55; t += 0.1) { const r = rateQ(t, q); if (r > best) { best = r; tb = t; } }
    return { T: tb, r: best };
  }

  Sim.create('#sim-bio-5bc-q10', {
    title: 'Temperature coefficient, Q10',
    alt: 'Graph of the rate of an enzyme-controlled reaction against temperature, with two chosen temperatures marked',
    height: (w) => Math.round(clamp(w * 0.6, 320, 400)),
    controls: [
      { key: 'T', label: 'Starting temperature T', min: 0, max: 40, step: 1, value: 15, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'dT', label: 'Temperature rise ΔT', min: 1, max: 20, step: 1, value: 10, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'q', label: 'Q10 of the reaction', min: 1.5, max: 3, step: 0.1, value: 2, format: (v) => v.toFixed(1) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const opt = optimum(p.q);
      const ymax = niceCeil(opt.r * 1.15);
      const left = w < 480 ? 46 : 54;
      const g = Sim.graph(ctx, { x: left, y: 28, w: w - left - 16, h: h - 28 - 44, xmin: 0, xmax: 60, ymin: 0, ymax, xstep: 10, bg: false, ylabel: 'rate / a.u.' });
      Sim.rect(ctx, g.px(opt.T), g.y, g.px(60) - g.px(opt.T), g.h, { fill: 'rgba(224,49,49,0.07)' });
      g.axes();
      Sim.text(ctx, 'temperature / °C', g.x + g.w / 2, g.y + g.h + 22, { size: 12.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });
      g.vline(opt.T, { color: C.red, dash: [4, 4], width: 1.2 });
      const right = g.px(60) - g.px(opt.T);
      if (right > 90) {
        Sim.text(ctx, 'above the optimum:', (g.px(opt.T) + g.px(60)) / 2, g.y + 30, { size: 11, bold: true, color: '#c92a2a', align: 'center' });
        Sim.text(ctx, 'enzymes denature', (g.px(opt.T) + g.px(60)) / 2, g.y + 44, { size: 11, bold: true, color: '#c92a2a', align: 'center' });
      }
      g.plot((t) => rateQ(t, p.q), { color: C.green, width: 3 });
      Sim.text(ctx, 'optimum ' + opt.T.toFixed(0) + ' °C', g.px(opt.T) - 6, g.py(opt.r) - 12, { size: 11.5, bold: true, color: '#c92a2a', align: 'right', bg: WHITE, pad: 2 });

      const T1 = p.T, T2 = p.T + p.dT;
      const r1 = rateQ(T1, p.q), r2 = rateQ(T2, p.q);
      [[T1, r1], [T2, r2]].forEach(([t, r]) => {
        Sim.line(ctx, g.px(t), g.py(r), g.px(t), g.py(0), { color: C.blue, dash: [4, 4], width: 1.2 });
        Sim.line(ctx, g.px(0), g.py(r), g.px(t), g.py(r), { color: C.blue, dash: [4, 4], width: 1.2 });
        g.dot(t, r, { color: C.blue, r: 5 });
      });
      Sim.text(ctx, 'T', g.px(T1), g.py(0) - 10, { size: 12, bold: true, color: C.blue, align: 'center', bg: WHITE, pad: 2 });
      Sim.text(ctx, 'T + ΔT', g.px(T2), g.py(0) - 10, { size: 12, bold: true, color: C.blue, align: 'center', bg: WHITE, pad: 2 });
      const ratio = r2 / r1;
      const xa = g.px(T2) + 14;
      if (Math.abs(g.py(r2) - g.py(r1)) > 14) {
        Sim.arrow(ctx, xa, g.py(r1), xa, g.py(r2), { color: C.purple, width: 2, head: 8 });
      }
      const lx = xa + 6 + 70 < g.x + g.w ? xa + 6 : g.px(T2) - 14;
      Sim.text(ctx, '× ' + ratio.toFixed(2), lx, (g.py(r1) + g.py(r2)) / 2, { size: 12.5, bold: true, color: C.purple, align: lx > xa ? 'left' : 'right', bg: WHITE, pad: 2 });
    },
    readout(s) {
      const p = s.p;
      const T2 = p.T + p.dT;
      const r1 = rateQ(p.T, p.q), r2 = rateQ(T2, p.q);
      const opt = optimum(p.q);
      const rising = T2 <= opt.T - 4;
      const out = [
        ['rate at ' + p.T.toFixed(0) + ' °C =', r1.toFixed(2) + ' a.u.'],
        ['rate at ' + T2.toFixed(0) + ' °C =', r2.toFixed(2) + ' a.u.'],
        [p.dT === 10 && rising ? 'Q10 = ' + r2.toFixed(2) + ' ÷ ' + r1.toFixed(2) + ' =' : 'rate multiplied by', (r2 / r1).toFixed(2), true]
      ];
      if (!rising) out.push(['note:', 'near or above the optimum, so the rise is less than Q10 predicts']);
      else if (p.dT !== 10) out.push(['Q10 predicts ' + p.q.toFixed(1) + ' to the power ' + (p.dT / 10).toFixed(1) + ' =', Math.pow(p.q, p.dT / 10).toFixed(2)]);
      return out;
    }
  });
})();
