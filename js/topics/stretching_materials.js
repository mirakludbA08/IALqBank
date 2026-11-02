/* Stretching Materials — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
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
    if (Math.abs(d) < 1e-30) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  function niceCeil(x) {
    if (!(x > 0) || !isFinite(x)) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const n = x / e;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
  }
  /* Small labelled marker on a graph: dot, leader line and text offset by (dx, dy) pixels. */
  function mark(ctx, g, x, y, text, dx, dy, color) {
    const X = g.px(x), Y = g.py(y);
    Sim.line(ctx, X, Y, X + dx * 0.8, Y + dy * 0.8, { color: color || C.ink, width: 1 });
    Sim.circle(ctx, X, Y, 4.5, { fill: color || C.red, stroke: '#fff', width: 1.5 });
    Sim.text(ctx, text, X + dx, Y + dy, { size: 12, bold: true, color: color || C.ink, align: dx < 0 ? 'right' : 'left', bg: 'rgba(255,255,255,0.85)' });
  }

  /* ======================================================================
     0. Static figure: force between two atoms (SVG built here)
     ====================================================================== */
  (function bondDiagram() {
    const svg = document.getElementById('bond-diagram');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
      (parent || svg).appendChild(n);
      return n;
    };
    const R0X = 140, Y0 = 130, SX = 150, SY = 80, A = 1.5;
    const F = (d) => 2 * A * (Math.exp(-2 * A * d) - Math.exp(-A * d));   // Morse-type force, r₀ at d = 0
    const X = (d) => R0X + d * SX, Y = (f) => Y0 - f * SY;
    const defs = mk('defs', {});
    const m = mk('marker', { id: 'bd-ax', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
    mk('path', { d: 'M0 0 L10 5 L0 10 z', fill: '#495057' }, m);
    mk('line', { x1: 60, y1: 252, x2: 60, y2: 12, stroke: '#495057', 'stroke-width': 2, 'marker-end': 'url(#bd-ax)' });
    mk('line', { x1: 60, y1: Y0, x2: 450, y2: Y0, stroke: '#495057', 'stroke-width': 2, 'marker-end': 'url(#bd-ax)' });
    const pts = [];
    for (let d = -0.2; d <= 2.0001; d += 0.02) pts.push(X(d).toFixed(1) + ' ' + Y(F(d)).toFixed(1));
    mk('path', { d: 'M' + pts.join(' L'), fill: 'none', stroke: '#002b80', 'stroke-width': 3 });
    const t = 0.14, slope = -2 * A * A;
    mk('line', { x1: X(-t), y1: Y(slope * -t), x2: X(t), y2: Y(slope * t), stroke: '#2f9e44', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.85 });
    mk('circle', { cx: X(0), cy: Y0, r: 5, fill: '#e03131' });
    const txt = (x, y, s, o) => { const n = mk('text', Object.assign({ x, y, 'font-size': 14, fill: '#333' }, o || {})); n.textContent = s; return n; };
    txt(68, 22, 'force between atoms', { 'font-weight': 'bold' });
    txt(448, Y0 + 22, 'separation r', { 'text-anchor': 'end', 'font-weight': 'bold' });
    txt(146, Y0 + 20, 'r₀', { 'font-style': 'italic', 'font-size': 15 });
    txt(150, 40, 'repulsion');
    txt(232, 222, 'attraction');
    txt(168, 96, 'almost a straight line near r₀', { fill: '#2f9e44', 'font-weight': 'bold', 'font-size': 13.5 });
  })();

  /* ======================================================================
     1. Hooke's law: hang masses on a spring
     ====================================================================== */
  const SPR = {
    A: { k: 25, FLP: 4.5, dE: 0.5, c: 0.04, h: 0.04, xmax: 0.85 },
    B: { k: 50, FLP: 7.0, dE: 0.6, c: 0.02, h: 0.025, xmax: 0.35 }
  };
  const HK_L0 = 0.10, HK_STEP = 0.1, HK_MAXN = 10;
  function hkElastic(S, F) {
    let x = F / S.k;
    const d = F - S.FLP;
    if (d > 0) x += d <= S.dE ? S.c * d * d : S.c * S.dE * S.dE + 2 * S.c * S.dE * (d - S.dE);
    return x;
  }
  function hkVirgin(S, F) {
    const FEL = S.FLP + S.dE;
    return hkElastic(S, F) + (F > FEL ? S.h * (F - FEL) : 0);
  }
  function hkExt(S, F, Fmax) {
    if (F >= Fmax) return hkVirgin(S, F);
    if (Fmax <= S.FLP + S.dE) return hkElastic(S, F);
    return hkVirgin(S, Fmax) - (Fmax - F) / S.k;
  }
  function hkSet(s, n) {
    const st = s.state, S = SPR[s.p.spr];
    n = clamp(n, 0, HK_MAXN);
    if (n === st.n) return;
    const F = n * HK_STEP * G;
    const x = hkExt(S, F, st.Fmax);
    const un = n < st.n;
    st.Fmax = Math.max(st.Fmax, F);
    st.n = n; st.F = F; st.x = x;
    st.pts.push([x, F, un]);
  }
  Sim.create('#sim-hooke', {
    title: "Hooke's law: load a spring",
    height: (w) => (w >= 640 ? 410 : 660),
    controls: [
      { key: 'spr', type: 'select', label: 'Spring', value: 'A', options: [['A', 'Spring A (softer)'], ['B', 'Spring B (stiffer)']], onChange: (s) => s.reset() },
      { key: 'area', type: 'check', label: 'Shade the area under the graph', value: false },
      { type: 'button', label: '+ 100 g', onClick: (s) => hkSet(s, s.state.n + 1) },
      { type: 'button', label: '− 100 g', onClick: (s) => hkSet(s, s.state.n - 1) },
      { type: 'button', label: 'New spring', ghost: true, onClick: (s) => s.reset() }
    ],
    init(s) { s.state = { n: 0, F: 0, x: 0, Fmax: 0, pts: [[0, 0, false]] }; },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state, S = SPR[s.p.spr];
      const wide = w >= 640;
      const scene = wide ? { x: 0, y: 0, w: Math.min(250, w * 0.3), h } : { x: 0, y: 0, w, h: 320 };
      // stand, clamp and spring
      const cx = scene.x + scene.w * 0.42;
      const top = 34;
      const avail = scene.h - top - 70;
      const pxm = avail / (HK_L0 + S.xmax);
      Sim.rect(ctx, scene.x + 14, top - 14, 8, scene.h - top, { fill: '#adb5bd' });
      Sim.rect(ctx, scene.x + 14, top - 16, cx - scene.x - 6, 8, { fill: '#adb5bd' });
      Sim.rect(ctx, scene.x + 2, scene.h - 10, 60, 8, { fill: '#868e96', r: 2 });
      const yNat = top + HK_L0 * pxm, yBot = top + (HK_L0 + st.x) * pxm;
      Sim.spring(ctx, cx, top - 8, cx, yBot, { coils: 8, width: 9, color: '#495057', lineWidth: 2, lead: 5 });
      // ruler
      const rx = cx + 34;
      Sim.rect(ctx, rx, top - 8, 22, scene.h - top - 4, { fill: '#fff3bf', stroke: '#e0b000', width: 1 });
      for (let cm = 0; (top + cm / 100 * pxm) < scene.h - 14; cm += 5) {
        const y = top + (cm / 100) * pxm;
        const major = cm % 10 === 0;
        Sim.line(ctx, rx, y, rx + (major ? 9 : 5), y, { color: '#5c4b00', width: 1 });
        if (major && pxm * 0.1 > 16) Sim.text(ctx, String(cm), rx + 11, y, { size: 10.5, color: '#5c4b00' });
      }
      Sim.text(ctx, 'cm', rx + 11, top - 16, { size: 11, color: C.muted });
      Sim.line(ctx, cx + 4, yBot, rx, yBot, { color: C.red, width: 2 });
      // natural length and extension
      Sim.line(ctx, cx - 30, yNat, cx + 12, yNat, { color: C.grey, width: 1.2, dash: [4, 3] });
      if (st.x * pxm > 14) {
        Sim.arrow(ctx, cx - 22, yNat, cx - 22, yBot, { color: C.green, width: 1.8, head: 7 });
        Sim.arrow(ctx, cx - 22, yBot, cx - 22, yNat, { color: C.green, width: 1.8, head: 7 });
        Sim.text(ctx, 'Δx', cx - 27, (yNat + yBot) / 2, { size: 13, bold: true, color: C.green, align: 'right' });
      }
      // hanger and slotted masses
      Sim.line(ctx, cx, yBot, cx, yBot + 10, { color: '#495057', width: 2 });
      for (let i = 0; i < st.n; i++) Sim.rect(ctx, cx - 17, yBot + 10 + i * 5, 34, 4.5, { fill: i % 2 ? '#5c677d' : '#7d8597', r: 1.5 });
      Sim.rect(ctx, cx - 19, yBot + 10 + st.n * 5, 38, 4, { fill: '#343a40', r: 1 });
      Sim.text(ctx, st.n * 100 + ' g', cx, yBot + 26 + st.n * 5, { size: 12, bold: true, color: C.ink, align: 'center' });

      // graph
      const gb = wide ? { x: scene.w + 62, y: 34, w: w - scene.w - 62 - 22, h: h - 34 - 40 } : { x: 56, y: scene.h + 36, w: w - 56 - 22, h: h - scene.h - 36 - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: S.xmax, ymin: 0, ymax: 10.5, xlabel: 'Δx / m', ylabel: 'F / N', title: 'force against extension' }, gb)).axes();
      const FEL = S.FLP + S.dE;
      if (s.p.area && st.F > 0) {
        // area under the path actually followed (loading curve up to F, or the unloading line)
        const poly = [];
        const n = 40;
        if (st.Fmax <= FEL || st.F >= st.Fmax) for (let i = 0; i <= n; i++) { const F = (st.F * i) / n; poly.push([hkVirgin(S, F), F]); }
        else { const x0 = hkExt(S, 0, st.Fmax); poly.push([x0, 0], [st.x, st.F]); }
        g.clip();
        ctx.fillStyle = 'rgba(47,158,68,0.22)';
        ctx.beginPath();
        ctx.moveTo(g.px(poly[0][0]), g.py(0));
        poly.forEach((q) => ctx.lineTo(g.px(q[0]), g.py(q[1])));
        ctx.lineTo(g.px(st.x), g.py(0));
        ctx.closePath(); ctx.fill();
        g.unclip();
      }
      g.plot((x) => (x * S.k <= S.FLP ? S.k * x : null), { color: C.green, width: 1.8, dash: [6, 4] });
      Sim.text(ctx, 'gradient = k = ' + S.k + ' N m⁻¹', g.px(S.FLP / S.k * 0.5) + 12, g.py(S.FLP * 0.5) + 14, { size: 12, bold: true, color: C.green, bg: 'rgba(255,255,255,0.85)' });
      g.path(st.pts.map((q) => [q[0], q[1]]), { color: '#adb5bd', width: 1.2 });
      st.pts.forEach((q) => g.dot(q[0], q[1], { color: q[2] ? C.orange : C.navy, r: 4.5 }));
      if (st.Fmax > S.FLP) mark(ctx, g, hkElastic(S, S.FLP), S.FLP, 'limit of proportionality', 16, 26, C.red);
      if (st.Fmax > FEL) mark(ctx, g, hkElastic(S, FEL), FEL, 'elastic limit', -16, -20, C.purple);
      if (st.pts.length === 1) Sim.text(ctx, 'Press “+ 100 g” to add a mass', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state, S = SPR[s.p.spr];
      const FEL = S.FLP + S.dE;
      const out = [
        ['load:', st.n * 100 + ' g, so F = mg = ' + st.F.toFixed(2) + ' N'],
        ['extension Δx =', (st.x * 100).toFixed(1) + ' cm']
      ];
      if (st.x > 1e-6 && st.F > 0) out.push(['F / Δx =', Sim.fmt(st.F / st.x, 3) + ' N m⁻¹']);
      const perm = st.Fmax > FEL ? hkVirgin(S, st.Fmax) - st.Fmax / S.k : 0;
      if (st.Fmax > FEL) out.push(['plastic:', 'permanent extension ' + (perm * 100).toFixed(1) + ' cm', true]);
      else if (st.Fmax > S.FLP) out.push(['beyond the limit of proportionality:', 'curved, but still elastic', true]);
      else if (st.n > 0) {
        out.push(['obeys Hooke’s law:', 'F = kΔx', true]);
        out.push(['energy stored ½FΔx =', Sim.fmt(0.5 * st.F * st.x, 3) + ' J']);
      }
      return out;
    }
  });

  /* ======================================================================
     2. Springs in series and parallel (beyond the spec)
     ====================================================================== */
  Sim.create('#sim-springs', {
    title: 'Springs combined',
    height: (w) => (w >= 600 ? 360 : 520),
    controls: [
      { key: 'arr', type: 'select', label: 'Arrangement', value: 'series', options: [['single', 'One spring (k₁ only)'], ['series', 'Two in series'], ['parallel', 'Two in parallel']] },
      { key: 'k1', label: 'Stiffness k₁', min: 20, max: 100, step: 5, value: 40, unit: 'N m⁻¹', format: (v) => v.toFixed(0) },
      { key: 'k2', label: 'Stiffness k₂', min: 20, max: 100, step: 5, value: 40, unit: 'N m⁻¹', format: (v) => v.toFixed(0) },
      { key: 'F', label: 'Load F', min: 0, max: 4, step: 0.2, value: 2, unit: 'N', format: (v) => v.toFixed(1) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 600;
      const L0 = 0.10;
      const kEff = p.arr === 'single' ? p.k1 : p.arr === 'series' ? 1 / (1 / p.k1 + 1 / p.k2) : p.k1 + p.k2;
      const x = p.F / kEff;
      const scene = wide ? { w: Math.min(300, w * 0.42), h } : { w, h: 260 };
      const top = 30, pxm = (scene.h - top - 60) / (2 * L0 + 0.4);
      const cx = scene.w * 0.5;
      Sim.rect(ctx, cx - 90, top - 12, 180, 10, { fill: '#adb5bd' });
      let yLoad;
      const lab = (str, xx, yy, col, al) => Sim.text(ctx, str, xx, yy, { size: 12, bold: true, color: col, align: al || 'left', bg: 'rgba(255,255,255,0.85)' });
      if (p.arr === 'parallel') {
        const yb = top + (L0 + x) * pxm;
        Sim.spring(ctx, cx - 40, top - 2, cx - 40, yb, { coils: 10, width: 8, color: C.blue, lineWidth: 2 });
        Sim.spring(ctx, cx + 40, top - 2, cx + 40, yb, { coils: 10, width: 8, color: C.orange, lineWidth: 2 });
        Sim.rect(ctx, cx - 56, yb, 112, 6, { fill: '#495057', r: 2 });
        lab('F₁ = ' + (p.k1 * x).toFixed(2) + ' N', cx - 54, (top + yb) / 2, C.blue, 'right');
        lab('F₂ = ' + (p.k2 * x).toFixed(2) + ' N', cx + 54, (top + yb) / 2, '#c46f00');
        yLoad = yb + 6;
      } else {
        const x1 = p.F / p.k1, x2 = p.arr === 'series' ? p.F / p.k2 : 0;
        const y1 = top + (L0 + x1) * pxm;
        Sim.spring(ctx, cx, top - 2, cx, y1, { coils: 10, width: 8, color: C.blue, lineWidth: 2 });
        lab('Δx₁ = ' + (x1 * 100).toFixed(1) + ' cm', cx + 18, (top + y1) / 2, C.blue);
        yLoad = y1;
        if (p.arr === 'series') {
          Sim.circle(ctx, cx, y1, 3, { fill: '#495057' });
          const y2 = y1 + (L0 + x2) * pxm;
          Sim.spring(ctx, cx, y1, cx, y2, { coils: 10, width: 8, color: C.orange, lineWidth: 2 });
          lab('Δx₂ = ' + (x2 * 100).toFixed(1) + ' cm', cx + 18, (y1 + y2) / 2, '#c46f00');
          yLoad = y2;
        }
      }
      Sim.line(ctx, cx, yLoad, cx, yLoad + 8, { color: '#495057', width: 2 });
      Sim.rect(ctx, cx - 20, yLoad + 8, 40, 24, { fill: '#5c677d', r: 4 });
      Sim.text(ctx, p.F.toFixed(1) + ' N', cx, yLoad + 20, { size: 12, bold: true, color: '#fff', align: 'center' });
      // graph comparing the arrangements
      const gb = wide ? { x: scene.w + 60, y: 34, w: w - scene.w - 60 - 22, h: h - 34 - 40 } : { x: 56, y: scene.h + 34, w: w - 56 - 22, h: h - scene.h - 34 - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.2, ymin: 0, ymax: 4.4, xlabel: 'Δx / m', ylabel: 'F / N', title: 'force against total extension' }, gb)).axes();
      const lines = [
        ['series', 1 / (1 / p.k1 + 1 / p.k2), 1.2],
        ['one spring k₁', p.k1, 2.4],
        ['parallel', p.k1 + p.k2, 3.6]
      ];
      lines.forEach(([name, k, Fl]) => {
        const active = (name === 'one spring k₁' && p.arr === 'single') || name === p.arr;
        g.plot((xx) => k * xx, { color: active ? C.navy : '#ced4da', width: active ? 3 : 2 });
        const xl = Math.min(Fl / k, 0.17);
        Sim.text(ctx, name, g.px(xl) + 8, g.py(k * xl) + 4, { size: 12, bold: active, color: active ? C.navy : C.grey, bg: 'rgba(255,255,255,0.8)' });
      });
      if (x <= 0.2) g.dot(x, p.F, { color: C.red });
    },
    readout(s) {
      const p = s.p;
      const kEff = p.arr === 'single' ? p.k1 : p.arr === 'series' ? 1 / (1 / p.k1 + 1 / p.k2) : p.k1 + p.k2;
      return [
        ['combined stiffness k =', Sim.fmt(kEff, 3) + ' N m⁻¹', true],
        ['total extension F / k =', (p.F / kEff * 100).toFixed(1) + ' cm'],
        [p.arr === 'parallel' ? 'rule: k = k₁ + k₂' : p.arr === 'series' ? 'rule: 1/k = 1/k₁ + 1/k₂' : 'single spring', '']
      ];
    }
  });

  /* ======================================================================
     3. Material testing machine: stress–strain curves
     ====================================================================== */
  /* Each curve is a cubic Hermite spline through knots [strain, stress / MPa, gradient / MPa]. */
  const MATS = {
    steel: {
      name: 'mild steel', E: 200000, brk: 0.25, uts: 0.15, el: 0.00125, zoom: 0.003, zoomY: 300, fill: '#adb5bd',
      knots: [[0, 0, 200000], [0.00115, 230, 200000], [0.00125, 245, 120000], [0.00135, 258, 0], [0.0017, 240, 0], [0.015, 246, 1200], [0.15, 420, 0], [0.25, 330, -2500]],
      marks: [['lp', 0.00115, 'limit of proportionality', 14, 24], ['el', 0.00125, 'elastic limit', -14, -18], ['yp', 0.00135, 'yield point', 14, -16]]
    },
    copper: {
      name: 'copper', E: 120000, brk: 0.45, uts: 0.35, el: 0.0007, zoom: 0.003, zoomY: 100, fill: '#e8955a',
      knots: [[0, 0, 120000], [0.0005, 60, 120000], [0.0007, 72, 30000], [0.0012, 80, 6000], [0.003, 88, 2500], [0.02, 115, 900], [0.1, 170, 400], [0.35, 220, 0], [0.45, 195, -500]],
      marks: [['lp', 0.0005, 'limit of proportionality', 14, 24], ['el', 0.0007, 'elastic limit', -14, -18]]
    },
    glass: {
      name: 'glass', E: 70000, brk: 0.001, uts: 0.001, el: 0.001, zoom: null, fill: 'rgba(165,216,255,0.85)',
      knots: [[0, 0, 70000], [0.001, 70, 70000]], marks: []
    },
    rubber: {
      name: 'rubber', E: 2, brk: 6.0, uts: 6.0, el: 6.0, zoom: null, fill: '#495057',
      knots: [[0, 0, 2.0], [1.0, 1.0, 0.6], [3.0, 2.0, 0.7], [5.0, 6.0, 5], [6.0, 14, 10]], marks: []
    }
  };
  function hermite(K, e) {
    if (e <= K[0][0]) return 0;
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (e <= b[0]) {
        const hh = b[0] - a[0], t = (e - a[0]) / hh, t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * a[1] + (t3 - 2 * t2 + t) * hh * a[2] + (-2 * t3 + 3 * t2) * b[1] + (t3 - t2) * hh * b[2];
      }
    }
    return K[K.length - 1][1];
  }
  let tMat = 'steel';
  function pullToStrain(key, u) {
    const M = MATS[key], end = 1.03 * M.brk;
    if (M.zoom) return u <= 300 ? (M.zoom * u) / 300 : M.zoom + ((end - M.zoom) * (u - 300)) / 700;
    return (end * u) / 1000;
  }
  function tsStress(M, st, e) {
    if (st.broken) return 0;
    if (e >= st.em || st.em <= M.el) return hermite(M.knots, e);
    return Math.max(0, hermite(M.knots, st.em) - M.E * (st.em - e));
  }
  const tsPerm = (M, st) => (st.em > M.el ? Math.max(0, st.em - hermite(M.knots, st.em) / M.E) : 0);
  function tsMove(s, u) {
    const st = s.state, M = MATS[s.p.mat];
    const u0 = st.u;
    const n = Math.max(1, Math.ceil(Math.abs(u - u0) / 2));
    for (let i = 1; i <= n && !st.broken; i++) {
      const e = pullToStrain(s.p.mat, u0 + ((u - u0) * i) / n);
      if (e >= M.brk) {
        st.brkAt = [M.brk, hermite(M.knots, M.brk)];
        st.trace.push(st.brkAt.slice());
        st.em = M.brk;
        st.broken = true;
        break;
      }
      const sig = tsStress(M, st, e);
      if (e > st.em) st.em = e;
      st.trace.push([e, sig]);
    }
    st.u = u;
    if (st.trace.length > 5000) st.trace.splice(1, st.trace.length - 5000);
  }
  function drawSample(ctx, w, M, key, st, e, sig) {
    const yc = 48, x0 = 44, Lg = Math.min(w * 0.5, 420);
    const vis = Math.min(1, 0.6 / M.brk);
    const perm = tsPerm(M, st);
    const eShow = st.broken ? (key === 'rubber' ? 0 : perm) : Math.max(e, perm);
    const len = Lg * (1 + eShow * vis);
    Sim.rect(ctx, 12, yc - 28, 32, 56, { fill: '#495057', r: 4 });
    const neck = !st.broken && M.uts < M.brk && st.em > M.uts ? 1 - 0.55 * (st.em - M.uts) / (M.brk - M.uts) : 1;
    const th = key === 'rubber' ? 14 / Math.sqrt(1 + 0.25 * eShow) : 14;
    const tab = 22;
    const gap = st.broken ? 16 : 0;
    const xm = x0 + tab + (len - 2 * tab) / 2;
    const xr = x0 + len + gap;
    const piece = (xa, xb, jagSide) => {
      ctx.save();
      ctx.fillStyle = M.fill; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(xa, yc - th / 2);
      ctx.lineTo(xb, yc - th / 2);
      if (jagSide) { ctx.lineTo(xb + 4 * jagSide, yc - 2); ctx.lineTo(xb - 3 * jagSide, yc + 2); }
      ctx.lineTo(xb, yc + th / 2);
      ctx.lineTo(xa, yc + th / 2);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    // end tabs
    Sim.rect(ctx, x0, yc - 13, tab, 26, { fill: M.fill, stroke: '#343a40', width: 1.2 });
    Sim.rect(ctx, xr - tab, yc - 13, tab, 26, { fill: M.fill, stroke: '#343a40', width: 1.2 });
    if (!st.broken) {
      if (neck < 0.999) {
        ctx.save();
        ctx.fillStyle = M.fill; ctx.strokeStyle = '#343a40'; ctx.lineWidth = 1.2;
        const a = x0 + tab, b = xr - tab, nw = 40;
        ctx.beginPath();
        ctx.moveTo(a, yc - th / 2); ctx.lineTo(xm - nw, yc - th / 2);
        ctx.quadraticCurveTo(xm, yc - (th / 2) * neck * 0.6, xm + nw, yc - th / 2);
        ctx.lineTo(b, yc - th / 2); ctx.lineTo(b, yc + th / 2); ctx.lineTo(xm + nw, yc + th / 2);
        ctx.quadraticCurveTo(xm, yc + (th / 2) * neck * 0.6, xm - nw, yc + th / 2);
        ctx.lineTo(a, yc + th / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        Sim.text(ctx, 'neck (not in spec)', xm, yc + 22, { size: 11.5, color: C.muted, align: 'center' });
      } else piece(x0 + tab, xr - tab, 0);
    } else if (key === 'rubber') {
      piece(x0 + tab, x0 + tab + (Lg - 2 * tab) / 2 - 4, 1);
      piece(xr - tab - (Lg - 2 * tab) / 2 + 4, xr - tab, 0);
    } else {
      piece(x0 + tab, xm - 2, 1);
      piece(xm + gap - 2, xr - tab, 0);
      Sim.text(ctx, 'snap!', xm + gap / 2, yc - 24, { size: 12, bold: true, color: C.red, align: 'center' });
    }
    Sim.rect(ctx, xr, yc - 28, 32, 56, { fill: '#495057', r: 4 });
    if (sig > 0) Sim.arrow(ctx, xr + 36, yc, xr + 70, yc, { color: C.red, width: 3, label: 'F', labelOffset: 10 });
    Sim.text(ctx, key === 'rubber' ? 'sample (stretch drawn shorter than real)' : 'sample (stretch drawn to scale)', x0, yc + 40, { size: 11.5, color: C.muted });
  }
  Sim.create('#sim-tester', {
    title: 'Material testing machine',
    height: (w) => (w >= 700 ? 440 : 680),
    controls: [
      {
        key: 'mat', type: 'select', label: 'Material', value: 'steel',
        options: [['steel', 'Mild steel'], ['copper', 'Copper'], ['glass', 'Glass'], ['rubber', 'Rubber']],
        onChange: (s, v) => { tMat = v; s.reset(); s.set('pull', 0); }
      },
      { key: 'pull', label: 'Stretch (slide back to unload)', min: 0, max: 1000, step: 1, value: 0, format: (v) => 'strain ' + Sim.fmt(pullToStrain(tMat, v) * 100, 3) + ' %', onChange: (s, v) => tsMove(s, v) },
      { type: 'button', label: 'New sample', onClick: (s) => { s.reset(); s.set('pull', 0); } }
    ],
    init(s) { tMat = s.p.mat; s.state = { em: 0, broken: false, brkAt: null, trace: [[0, 0]], u: 0 }; },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state, key = s.p.mat, M = MATS[key];
      const e = pullToStrain(key, st.u);
      const sig = tsStress(M, st, e);
      drawSample(ctx, w, M, key, st, e, sig);
      const top = 96 + 34, wide = w >= 700;
      const boxes = [];
      if (M.zoom) {
        if (wide) {
          const gw = (w - 60 - 60 - 24) / 2;
          boxes.push({ x: 60, y: top, w: gw, h: h - top - 40 }, { x: 60 + gw + 60, y: top, w: gw, h: h - top - 40 });
        } else {
          const gh = (h - top - 40 - 74) / 2;
          boxes.push({ x: 58, y: top, w: w - 58 - 22, h: gh }, { x: 58, y: top + gh + 74, w: w - 58 - 22, h: gh });
        }
      } else boxes.push(wide ? { x: 60, y: top, w: w - 60 - 30, h: h - top - 40 } : { x: 58, y: top, w: w - 58 - 22, h: h - top - 40 });
      const sigMax = M.knots.reduce((a, k) => Math.max(a, k[1]), 0);
      const gFull = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 105 * M.brk, ymin: 0, ymax: niceCeil(sigMax * 1.12), xlabel: 'strain / %', ylabel: 'stress / MPa', title: M.zoom ? 'whole test' : 'stress against strain' }, boxes[0])).axes();
      const tr = st.trace.map((q) => [q[0] * 100, q[1]]);
      gFull.path(tr, { color: C.navy, width: 2.6 });
      let gZ = null;
      if (M.zoom) {
        gZ = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: M.zoom * 100, ymin: 0, ymax: M.zoomY, xlabel: 'strain / %', ylabel: 'stress / MPa', title: 'zoom: the first ' + (M.zoom * 100).toFixed(1) + ' % of strain' }, boxes[1])).axes();
        gZ.path(tr, { color: C.navy, width: 2.6 });
      }
      const gm = gZ || gFull;
      M.marks.forEach(([, eps, label, dx, dy]) => { if (st.em >= eps) mark(ctx, gm, eps * 100, hermite(M.knots, eps), label, dx, dy, C.red); });
      if (M.uts < M.brk && st.em >= M.uts) mark(ctx, gFull, M.uts * 100, hermite(M.knots, M.uts), 'maximum stress', -12, -18, C.purple);
      if (st.broken) mark(ctx, gFull, st.brkAt[0] * 100, st.brkAt[1], 'breaking stress ' + Sim.fmt(st.brkAt[1], 3) + ' MPa', -14, key === 'rubber' ? 22 : 24, C.red);
      if (!st.broken) {
        gFull.dot(e * 100, sig, { color: C.orange });
        if (gZ && e <= M.zoom) gZ.dot(e * 100, sig, { color: C.orange });
      }
      if (key === 'glass' && !st.broken && st.em > 0) Sim.text(ctx, 'a straight line all the way: Hooke’s law right up to fracture', boxes[0].x + boxes[0].w - 8, boxes[0].y + 14, { size: 12, color: C.green, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      if (key === 'rubber' && st.em > 0.4) Sim.text(ctx, 'curved from the start, yet fully elastic', boxes[0].x + boxes[0].w - 8, boxes[0].y + 14, { size: 12, color: C.green, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      if (key === 'copper' && gZ && st.em > 0.0012) Sim.text(ctx, 'no sharp yield point: copper yields gradually', gZ.x + gZ.w - 8, gZ.py(30), { size: 12, color: C.muted, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const st = s.state, key = s.p.mat, M = MATS[key];
      const e = pullToStrain(key, st.u);
      const sig = tsStress(M, st, e);
      const out = [['material:', M.name]];
      if (st.broken) {
        out.push(['broken:', 'breaking stress = ' + Sim.fmt(st.brkAt[1], 3) + ' MPa', true]);
        if (key !== 'rubber' && key !== 'glass') out.push(['permanent strain of the pieces ≈', Sim.fmt(tsPerm(M, st) * 100, 3) + ' %']);
        return out;
      }
      out.push(['strain =', Sim.fmt(e * 100, 3) + ' %'], ['stress =', Sim.fmt(sig, 3) + ' MPa']);
      out.push(key === 'rubber' ? ['Young modulus:', 'not constant (curved graph)'] : ['Young modulus E =', Sim.fmt(M.E / 1000, 3) + ' GPa']);
      const perm = tsPerm(M, st);
      if (perm > 0) out.push([sig <= 0 ? 'unloaded:' : 'plastic:', 'permanent strain ' + Sim.fmt(perm * 100, 3) + ' %', true]);
      else if (st.em > 0) out.push(['elastic:', 'returns to its original length if unloaded', true]);
      return out;
    }
  });

  /* ======================================================================
     4. Core practical 3: Young modulus of a copper wire
     ====================================================================== */
  const CP3 = { L: 2.0, d: 0.376e-3, E: 1.2e11, sLP: 150e6 };
  const CP3_A = (Math.PI * CP3.d * CP3.d) / 4;
  const cpVirgin = (sig) => sig / CP3.E + (sig > CP3.sLP ? 0.6e-3 * Math.pow((sig - CP3.sLP) / 25e6, 2) : 0);
  function cpExt(F, Fmax) {
    const sig = F / CP3_A, sm = Fmax / CP3_A;
    if (F >= Fmax) return CP3.L * cpVirgin(sig);
    if (sm <= CP3.sLP) return (CP3.L * sig) / CP3.E;
    return CP3.L * (cpVirgin(sm) - (sm - sig) / CP3.E);
  }
  function cpLoad(s, m) {
    const st = s.state;
    const F = m * G;
    st.x = cpExt(F, st.Fmax);
    st.Fmax = Math.max(st.Fmax, F);
    st.F = F;
  }
  const cpMeanD = (st) => (st.dReads.length ? st.dReads.reduce((a, b) => a + b, 0) / st.dReads.length : null);
  function drawMicrometer(ctx, box, reading) {
    Sim.rect(ctx, box.x, box.y, box.w, box.h, { fill: '#f8f9fa', stroke: '#dfe5ee', width: 1, r: 8 });
    Sim.text(ctx, 'micrometer: last diameter reading', box.x + 10, box.y + 14, { size: 12, bold: true, color: C.navy });
    if (reading == null) { Sim.text(ctx, 'press “Measure diameter”', box.x + box.w / 2, box.y + box.h / 2 + 8, { size: 12.5, color: C.muted, italic: true, align: 'center' }); return; }
    const yc = box.y + 56, x = box.x;
    // frame, anvil, wire and spindle
    Sim.polyline(ctx, [[x + 22, yc + 8], [x + 22, yc + 30], [x + 84, yc + 30], [x + 84, yc + 10]], { color: '#868e96', width: 6 });
    Sim.rect(ctx, x + 14, yc - 8, 14, 16, { fill: '#495057', r: 2 });
    Sim.circle(ctx, x + 34, yc, 5.5, { fill: '#e8955a', stroke: '#9c4f17', width: 1 });
    Sim.rect(ctx, x + 40, yc - 6, 26, 12, { fill: '#adb5bd' });
    // sleeve with the main scale (mm above the datum line, half mm below)
    const per = 60, sx = (mm) => x + 76 + mm * per;
    const edge = sx(reading);
    Sim.rect(ctx, x + 66, yc - 9, edge - (x + 66), 18, { fill: '#e9ecef', stroke: '#868e96', width: 1 });
    Sim.line(ctx, x + 66, yc, edge, yc, { color: '#343a40', width: 1 });
    for (let h2 = 0; sx(h2 / 2) < edge; h2++) {
      const X = sx(h2 / 2);
      if (h2 % 2 === 0) { Sim.line(ctx, X, yc, X, yc - 8, { color: '#343a40', width: 1.2 }); Sim.text(ctx, String(h2 / 2), X, yc - 16, { size: 11, color: C.ink, align: 'center' }); }
      else Sim.line(ctx, X, yc, X, yc + 7, { color: '#343a40', width: 1.2 });
    }
    // thimble with 50 divisions of 0.01 mm
    const sleeve = Math.floor(reading * 2 + 1e-9) / 2;
    const hund = Math.round((reading - sleeve) * 100);
    Sim.rect(ctx, edge, yc - 21, 92, 42, { fill: '#ced4da', stroke: '#495057', width: 1.2, r: 3 });
    Sim.rect(ctx, edge + 92, yc - 8, 18, 16, { fill: '#868e96', r: 2 });
    for (let j = hund - 3; j <= hund + 3; j++) {
      const y = yc + (hund - j) * 6;
      const v = ((j % 50) + 50) % 50;
      const big = v % 5 === 0;
      Sim.line(ctx, edge, y, edge + (big ? 12 : 7), y, { color: '#212529', width: 1 });
      if (big) Sim.text(ctx, String(v), edge + 15, y, { size: 10.5, color: C.ink });
    }
    Sim.line(ctx, edge - 3, yc, edge + 3, yc, { color: C.red, width: 2 });
    Sim.text(ctx, 'sleeve ' + sleeve.toFixed(2) + ' mm + thimble ' + (hund / 100).toFixed(2) + ' mm = ' + reading.toFixed(2) + ' mm', box.x + 10, box.y + box.h - 9, { size: 11.5, color: C.green, bold: true });
  }
  Sim.create('#sim-cp3', {
    title: 'Virtual experiment: Young modulus of a copper wire',
    height: (w) => (w >= 700 ? 450 : 700),
    controls: [
      { key: 'm', label: 'Load on the hanger m', min: 0, max: 2.0, step: 0.1, value: 0, unit: 'kg', format: (v) => v.toFixed(1), onChange: (s, v) => cpLoad(s, v) },
      { type: 'button', label: 'Measure diameter', ghost: true, onClick: (s) => { const st = s.state; if (st.dReads.length < 12) st.dReads.push(Math.round((CP3.d * 1e3 + gaussian() * 0.003) * 100) / 100); } },
      { type: 'button', label: 'Record reading', onClick: (s) => { const st = s.state; const r = Math.max(0, Math.round((st.x + gaussian() * 0.05e-3) / 1e-4) * 1e-4); st.data.push({ F: st.F, x: r, beyond: st.Fmax / CP3_A > CP3.sLP }); } },
      { type: 'button', label: 'New wire', ghost: true, onClick: (s) => { s.reset(); s.set('m', 0); } }
    ],
    init(s) { s.state = { F: 0, x: 0, Fmax: 0, dReads: [], data: [] }; cpLoad(s, s.p.m); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      // bench, clamp, wire, pulley, masses
      const yw = 66;
      Sim.rect(ctx, 0, 90, w - 70, 12, { fill: '#d8c3a5' });
      Sim.rect(ctx, 8, yw - 10, 22, 34, { fill: '#495057', r: 3 });
      Sim.text(ctx, 'clamp', 19, 116, { size: 11.5, color: C.muted, align: 'center' });
      const pcx = w - 56, pcy = yw + 14;
      Sim.line(ctx, 30, yw, pcx, yw, { color: '#c46f00', width: 1.6 });
      Sim.circle(ctx, pcx, pcy, 14, { fill: '#dee2e6', stroke: '#495057', width: 2 });
      Sim.circle(ctx, pcx, pcy, 3, { fill: '#495057' });
      Sim.line(ctx, pcx - 14, pcy + 4, pcx - 24, 96, { color: '#495057', width: 2 });
      Sim.line(ctx, pcx + 14, pcy, pcx + 14, 112, { color: '#c46f00', width: 1.6 });
      const mh = 6 + 18 * p.m;
      Sim.line(ctx, pcx + 14, 112, pcx + 14, 116, { color: '#495057', width: 2 });
      Sim.rect(ctx, pcx + 2, 116, 24, mh, { fill: '#5c677d', r: 3 });
      Sim.text(ctx, p.m.toFixed(1) + ' kg', pcx - 2, 124 + mh / 2, { size: 12, bold: true, color: C.ink, align: 'right' });
      Sim.text(ctx, 'pulley', pcx, yw - 22, { size: 11.5, color: C.muted, align: 'center' });
      const xm = Math.max(170, w - 190);
      Sim.polyline(ctx, [[xm, yw - 2], [xm - 6, yw - 14], [xm + 6, yw - 14]], { close: true, fill: C.red, color: C.red, width: 1 });
      Sim.rect(ctx, xm - 50, 80, 110, 9, { fill: '#fff3bf', stroke: '#e0b000', width: 1 });
      for (let i = 0; i <= 22; i++) Sim.line(ctx, xm - 50 + i * 5, 80, xm - 50 + i * 5, i % 2 ? 84 : 88, { color: '#5c4b00', width: 1 });
      Sim.text(ctx, 'marker', xm + 10, yw - 12, { size: 11.5, color: C.red });
      Sim.arrow(ctx, 30, 30, xm, 30, { color: C.green, width: 1.5, head: 7 });
      Sim.arrow(ctx, xm, 30, 30, 30, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, w < 520 ? 'x = 2.000 m' : 'original length x = 2.000 m (clamp to marker)', (30 + xm) / 2, 18, { size: 12, bold: true, color: C.green, align: 'center' });

      // insets
      const IW = wide ? 290 : w - 32;
      const i1 = { x: 16, y: 168, w: IW, h: 78 };
      Sim.rect(ctx, i1.x, i1.y, i1.w, i1.h, { fill: '#f8f9fa', stroke: '#dfe5ee', width: 1, r: 8 });
      Sim.text(ctx, 'marker against the scale (magnified)', i1.x + 10, i1.y + 14, { size: 12, bold: true, color: C.navy });
      const s0 = i1.x + 18, s1 = i1.x + i1.w - 18, mmMax = 5;
      const sxm = (mm) => s0 + ((s1 - s0) * mm) / mmMax;
      Sim.rect(ctx, s0 - 6, i1.y + 40, s1 - s0 + 12, 18, { fill: '#fff3bf', stroke: '#e0b000', width: 1 });
      for (let t = 0; t <= mmMax * 10 + 1e-9; t++) {
        const X = sxm(t / 10), big = t % 10 === 0, mid = t % 5 === 0;
        Sim.line(ctx, X, i1.y + 40, X, i1.y + 40 + (big ? 12 : mid ? 8 : 5), { color: '#5c4b00', width: 1 });
        if (big) Sim.text(ctx, String(t / 10), X, i1.y + 67, { size: 11, color: '#5c4b00', align: 'center' });
      }
      Sim.text(ctx, 'mm', s1, i1.y + 30, { size: 11, color: C.muted, align: 'right' });
      const mx = sxm(clamp(st.x * 1e3, 0, mmMax));
      Sim.polyline(ctx, [[mx, i1.y + 40], [mx - 6, i1.y + 26], [mx + 6, i1.y + 26]], { close: true, fill: C.red, color: C.red, width: 1 });
      const i2 = { x: 16, y: i1.y + i1.h + 10, w: IW, h: 108 };
      drawMicrometer(ctx, i2, st.dReads.length ? st.dReads[st.dReads.length - 1] : null);

      // graph: stress against strain
      const gb = wide ? { x: 16 + IW + 70, y: 160, w: w - (16 + IW + 70) - 22, h: h - 160 - 40 } : { x: 58, y: i2.y + i2.h + 40, w: w - 58 - 22, h: h - (i2.y + i2.h + 40) - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2.4, ymin: 0, ymax: 200, xlabel: 'strain / 10⁻³', ylabel: 'stress / MPa', title: 'stress against strain' }, gb)).axes();
      const dm = cpMeanD(st);
      if (dm == null) {
        Sim.text(ctx, wide ? 'Measure the diameter first: stress needs the area' : 'Measure the diameter first', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
        return;
      }
      const A = (Math.PI * Math.pow(dm * 1e-3, 2)) / 4;
      const pts = st.data.map((d) => ({ e: (d.x / CP3.L) * 1e3, s: d.F / A / 1e6, beyond: d.beyond }));
      const good = pts.filter((q) => !q.beyond).map((q) => [q.e, q.s]);
      const fit = good.length >= 3 ? fitLine(good) : null;
      if (fit) g.plot((x) => fit.m * x + fit.c, { color: C.green, width: 2 });
      pts.forEach((q) => g.dot(q.e, q.s, { color: q.beyond ? C.orange : C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, wide ? 'Add some load, then press “Record reading”' : 'Add load, then record a reading', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const out = [
        ['load F = mg =', st.F.toFixed(2) + ' N'],
        ['marker reading Δx ≈', (Math.round(st.x / 1e-4) * 0.1).toFixed(1) + ' mm']
      ];
      const dm = cpMeanD(st);
      if (dm != null) {
        const A = (Math.PI * Math.pow(dm * 1e-3, 2)) / 4;
        out.push(['mean diameter (' + st.dReads.length + ' readings) =', dm.toFixed(3) + ' mm']);
        out.push(['A = πd²/4 =', Sim.fmt(A, 3) + ' m²']);
        const good = st.data.filter((d) => !d.beyond).map((d) => [d.x / CP3.L, d.F / A]);
        out.push(['readings:', String(st.data.length)]);
        const fit = good.length >= 3 ? fitLine(good) : null;
        if (fit && fit.m > 0) out.push(['E = gradient =', Sim.fmt(fit.m, 3) + ' Pa', true]);
        else out.push(['record at least 3 points', 'on the straight part']);
        if (st.data.some((d) => d.beyond)) out.push(['orange points:', 'past the limit of proportionality, left out of the fit']);
      } else out.push(['diameter:', 'not measured yet']);
      return out;
    }
  });

  /* ======================================================================
     5. Area under a non-linear force–extension graph (counting squares)
     ====================================================================== */
  const AREA_CURVES = {
    rubber: (u) => 8 * u - 16 * u * u + 17 * u * u * u,
    metal: (u) => (u <= 0.3 ? 20 * u : 6 + (3 * (1 - Math.exp(-(u - 0.3) / 0.18))) / (1 - Math.exp(-0.7 / 0.18))),
    spring: (u) => 9 * u
  };
  const aF = (key, xcm) => AREA_CURVES[key](clamp(xcm / 10, 0, 1));          // x in cm, F in N
  function aIntegral(key, xl) {
    const n = 400, hh = xl / n;
    let sum = aF(key, 0) + aF(key, xl);
    for (let i = 1; i < n; i++) sum += aF(key, i * hh) * (i % 2 ? 4 : 2);
    return ((sum * hh) / 3) * 0.01;                                       // N × cm → J
  }
  function aCount(key, xl, dx, dy) {
    const cells = [];
    for (let x0 = 0; x0 < xl - 1e-9; x0 += dx) {
      const xa = x0, xb = Math.min(x0 + dx, xl);
      for (let y0 = 0; y0 < 10 - 1e-9; y0 += dy) {
        let cov = 0;
        const n = 16;
        for (let i = 0; i < n; i++) {
          const x = xa + ((xb - xa) * (i + 0.5)) / n;
          cov += clamp(aF(key, x) - y0, 0, dy);
        }
        cov = (cov / n) * (xb - xa) / (dx * dy);
        if (cov > 0.001) cells.push([x0, y0, cov]);
        if (cov < 0.001) break;
      }
    }
    return cells;
  }
  Sim.create('#sim-area', {
    title: 'Counting squares under a curved graph',
    height: (w) => Math.round(clamp(w * 0.62, 340, 470)),
    controls: [
      { key: 'curve', type: 'select', label: 'Graph', value: 'rubber', options: [['rubber', 'Rubber band (curved)'], ['metal', 'Metal wire (curves over)'], ['spring', 'Spring obeying Hooke’s law (straight)']] },
      { key: 'grid', type: 'select', label: 'Grid', value: 'coarse', options: [['coarse', 'Coarse: 1 cm × 1 N squares'], ['fine', 'Fine: 0.5 cm × 0.5 N squares']] },
      { key: 'xl', label: 'Extension Δx', min: 1, max: 10, step: 0.5, value: 10, unit: 'cm', format: (v) => v.toFixed(1) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const dx = p.grid === 'fine' ? 0.5 : 1, dy = dx;
      const gb = { x: 54, y: 30, w: w - 54 - 24, h: h - 30 - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 10, ymin: 0, ymax: 10, xlabel: 'Δx / cm', ylabel: 'F / N', title: 'force against extension', grid: false }, gb)).axes();
      // squares
      const cells = aCount(p.curve, p.xl, dx, dy);
      cells.forEach(([x0, y0, cov]) => {
        const X = g.px(x0), Y = g.py(y0 + dy), W = g.px(x0 + dx) - X, H = g.py(y0) - Y;
        ctx.fillStyle = cov > 0.5 ? 'rgba(47,158,68,0.32)' : 'rgba(240,140,0,0.16)';
        ctx.fillRect(X + 0.5, Y + 0.5, W - 1, H - 1);
      });
      ctx.save();
      ctx.strokeStyle = '#d5deec'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= 10 + 1e-9; x += dx) { const X = Math.round(g.px(x)) + 0.5; ctx.moveTo(X, g.y); ctx.lineTo(X, g.y + g.h); }
      for (let y = 0; y <= 10 + 1e-9; y += dy) { const Y = Math.round(g.py(y)) + 0.5; ctx.moveTo(g.x, Y); ctx.lineTo(g.x + g.w, Y); }
      ctx.stroke();
      ctx.restore();
      Sim.line(ctx, g.x, g.py(0), g.x + g.w, g.py(0), { color: C.axis, width: 1.5 });
      Sim.line(ctx, g.px(0), g.y, g.px(0), g.y + g.h, { color: C.axis, width: 1.5 });
      // triangle ½FΔx and the curve
      const Fl = aF(p.curve, p.xl);
      Sim.polyline(ctx, [[g.px(0), g.py(0)], [g.px(p.xl), g.py(Fl)], [g.px(p.xl), g.py(0)]], { close: true, color: C.red, width: 1.8, dash: [6, 4] });
      g.plot((x) => aF(p.curve, x), { color: C.navy, width: 3 });
      g.vline(p.xl, { color: C.grey });
      g.dot(p.xl, Fl, { color: C.navy });
      Sim.text(ctx, '½FΔx triangle', g.px(p.xl) - 6, g.py(Fl * 0.18), { size: 12, color: C.red, align: 'right', bold: true, bg: 'rgba(255,255,255,0.85)' });
      const L = g.x + 56;
      Sim.rect(ctx, L, g.y + 8, 12, 12, { fill: 'rgba(47,158,68,0.5)' });
      Sim.text(ctx, 'counted (more than half under)', L + 18, g.y + 14, { size: 12, color: C.ink, bg: 'rgba(255,255,255,0.85)' });
      Sim.rect(ctx, L, g.y + 28, 12, 12, { fill: 'rgba(240,140,0,0.35)' });
      Sim.text(ctx, 'not counted (less than half)', L + 18, g.y + 34, { size: 12, color: C.ink, bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const p = s.p;
      const dx = p.grid === 'fine' ? 0.5 : 1, dy = dx;
      const cells = aCount(p.curve, p.xl, dx, dy);
      const n = cells.filter((c) => c[2] > 0.5).length;
      const per = dx * 0.01 * dy;
      const est = n * per, exact = aIntegral(p.curve, p.xl), tri = 0.5 * aF(p.curve, p.xl) * p.xl * 0.01;
      return [
        ['squares counted:', String(n)],
        ['one square =', dy + ' N × ' + (dx / 100) + ' m = ' + Sim.fmt(per, 2) + ' J'],
        ['estimate =', Sim.fmt(est, 3) + ' J', true],
        ['true area =', Sim.fmt(exact, 3) + ' J'],
        ['½FΔx would give', Sim.fmt(tri, 3) + ' J (' + (tri >= exact ? '+' : '−') + Math.abs((tri / exact - 1) * 100).toFixed(0) + '%)']
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) { this.move(s, pt); },
      move(s, pt) {
        if (!pt.down) return;
        const gx = 54, gw = s.w - 54 - 24;
        const v = clamp(Math.round((((pt.x - gx) / gw) * 10) * 2) / 2, 1, 10);
        if (v !== s.p.xl) s.set('xl', v);
      }
    }
  });
})();
