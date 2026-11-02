/* Motion — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const DEG = Math.PI / 180;

  /* Round a range outwards to tidy numbers so axes don't jitter. */
  function niceRange(lo, hi, minSpan) {
    if (hi - lo < minSpan) {
      if (lo >= 0) hi = lo + minSpan;
      else if (hi <= 0) lo = hi - minSpan;
      else { const pad = (minSpan - (hi - lo)) / 2; lo -= pad; hi += pad; }
    }
    const step = Math.pow(10, Math.floor(Math.log10(hi - lo))) / 2;
    return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step];
  }

  /* ======================================================================
     1. Linked s–t, v–t and a–t graphs
     ====================================================================== */
  const T_END = 20;
  const PRESETS = {
    drive: { u: 0, a: null },
    const: { u: 4, a: () => 0 },
    accel: { u: 0, a: () => 0.8 },
    trip: { u: 0, a: (t) => (t < 5 ? 1.2 : t < 12 ? 0 : t < 17 ? -1.2 : 0) },
    reverse: { u: 8, a: () => -1 }
  };
  const accAt = (s, t) => {
    const pr = PRESETS[s.p.preset];
    return pr.a ? pr.a(t) : s.p.acc;
  };

  function drawCar(ctx, x, y, color) {
    Sim.rect(ctx, x - 22, y - 20, 44, 14, { fill: color, r: 5 });
    Sim.rect(ctx, x - 12, y - 30, 22, 12, { fill: color, r: 4 });
    Sim.rect(ctx, x - 8, y - 27, 7, 7, { fill: '#dbe8ff', r: 2 });
    Sim.rect(ctx, x + 1, y - 27, 7, 7, { fill: '#dbe8ff', r: 2 });
    Sim.circle(ctx, x - 12, y - 5, 6, { fill: '#333' });
    Sim.circle(ctx, x + 12, y - 5, 6, { fill: '#333' });
    Sim.circle(ctx, x - 12, y - 5, 2.5, { fill: '#bbb' });
    Sim.circle(ctx, x + 12, y - 5, 2.5, { fill: '#bbb' });
  }

  Sim.create('#sim-graphs', {
    title: 'Linked motion graphs: drive the car',
    height: (w) => (w >= 720 ? 410 : 100 + 3 * 180),
    controls: [
      {
        key: 'preset', type: 'select', label: 'Motion', value: 'trip',
        options: [
          ['trip', 'Speed up, cruise, brake'],
          ['const', 'Constant velocity'],
          ['accel', 'Uniform acceleration from rest'],
          ['reverse', 'Rolled up a slope, comes back'],
          ['drive', 'Drive it yourself (use the slider)']
        ],
        onChange: (s) => { s.reset(); s.play(); }
      },
      { key: 'acc', label: 'Acceleration a (drive mode)', min: -2, max: 2, step: 0.1, value: 0.6, unit: 'm s⁻²', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    init(s) {
      const u = PRESETS[s.p.preset].u;
      s.state = { t: 0, s: 0, v: u, a: accAt(s, 0), rec: [[0, 0, u, accAt(s, 0)]], done: false, cursor: null, boxes: [] };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state;
      if (st.done || dt <= 0) return;
      const n = 4, h = dt / n;
      for (let i = 0; i < n; i++) {
        let a = accAt(s, st.t);
        if (Math.abs(st.v) >= 15 && Math.sign(a) === Math.sign(st.v)) a = 0;
        st.s += st.v * h + 0.5 * a * h * h;
        st.v += a * h;
        st.t += h;
        st.a = a;
      }
      st.rec.push([st.t, st.s, st.v, st.a]);
      if (st.t >= T_END) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const rec = st.rec;
      let smin = 0, smax = 0, vmin = 0, vmax = 0, amin = 0, amax = 0;
      for (const r of rec) {
        smin = Math.min(smin, r[1]); smax = Math.max(smax, r[1]);
        vmin = Math.min(vmin, r[2]); vmax = Math.max(vmax, r[2]);
        amin = Math.min(amin, r[3]); amax = Math.max(amax, r[3]);
      }
      [smin, smax] = niceRange(smin, smax * 1.05, 10);
      [vmin, vmax] = niceRange(vmin * 1.1, vmax * 1.1, 4);
      [amin, amax] = niceRange(Math.min(amin, -0.5) * 1.2, Math.max(amax, 0.5) * 1.2, 2);

      /* road */
      const roadH = 92;
      const rx0 = 40, rx1 = w - 40;
      const roadX = (x) => rx0 + ((x - smin) / (smax - smin)) * (rx1 - rx0);
      Sim.rect(ctx, 0, 0, w, roadH, { fill: '#f3f6fb' });
      Sim.rect(ctx, 0, roadH - 26, w, 18, { fill: '#c9d1dc' });
      for (let x = 0; x < w; x += 28) Sim.line(ctx, x, roadH - 17, x + 14, roadH - 17, { color: '#fff', width: 2 });
      const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(smax - smin))) / (smax - smin > 40 ? 1 : 2));
      for (let m = Math.ceil(smin / step) * step; m <= smax + 1e-9; m += step) {
        const X = roadX(m);
        Sim.line(ctx, X, roadH - 8, X, roadH - 3, { color: C.axis, width: 1 });
        Sim.text(ctx, +m.toFixed(2) + ' m', X, roadH - 1, { size: 10.5, color: C.muted, align: 'center', baseline: 'bottom' });
      }
      // one dot per second, like ticker tape
      for (const r of rec) {
        const sec = Math.round(r[0]);
        if (Math.abs(r[0] - sec) < 0.009 && sec > 0) Sim.circle(ctx, roadX(r[1]), roadH - 34, 3, { fill: C.blue });
      }
      const tc = st.cursor;
      const showRec = tc != null ? rec[nearest(rec, tc)] : rec[rec.length - 1];
      const carX = roadX(showRec[1]);
      drawCar(ctx, carX, roadH - 26, tc != null ? C.grey : C.blue);
      if (Math.abs(showRec[2]) > 0.05) {
        const len = Sim.clamp(showRec[2] * 6, -90, 90);
        Sim.arrow(ctx, carX, 18, carX + len, 18, { color: C.navy, width: 2.5, label: 'v', labelOffset: 10 });
      }

      /* graphs */
      const wide = w >= 720;
      const boxes = [];
      if (wide) {
        const top = roadH + 34, gh = h - top - 30, left = 46, gap = 56;
        const gw = (w - left - 18 - 2 * gap) / 3;
        for (let i = 0; i < 3; i++) boxes.push({ x: left + i * (gw + gap), y: top, w: gw, h: gh });
      } else {
        const top = roadH + 30, rowH = (h - top) / 3, gw = w - 46 - 18;
        for (let i = 0; i < 3; i++) boxes.push({ x: 46, y: top + i * rowH, w: gw, h: rowH - 52 });
      }
      st.boxes = boxes;
      const gs = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_END, ymin: smin, ymax: smax, xlabel: 't / s', ylabel: 's / m', title: 'displacement–time' }, boxes[0])).axes();
      const gv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_END, ymin: vmin, ymax: vmax, xlabel: 't / s', ylabel: 'v / m s⁻¹', title: 'velocity–time' }, boxes[1])).axes();
      const ga = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_END, ymin: amin, ymax: amax, xlabel: 't / s', ylabel: 'a / m s⁻²', title: 'acceleration–time' }, boxes[2])).axes();

      if (tc != null) {
        const k = nearest(rec, tc);
        const r = rec[k];
        const upto = rec.slice(0, k + 1);
        gv.clip(); areaPoly(gv, upto, 2, 'rgba(0,123,255,0.22)'); gv.unclip();
        ga.clip(); areaPoly(ga, upto, 3, 'rgba(224,49,49,0.18)'); ga.unclip();
        gs.plot((t) => r[1] + r[2] * (t - r[0]), { from: r[0] - 4, to: r[0] + 4, color: C.orange, width: 2, dash: [6, 4] });
        [gs, gv, ga].forEach((g) => g.vline(r[0]));
      }
      gs.path(rec.map((r) => [r[0], r[1]]), { color: C.navy, width: 2.8 });
      gv.path(rec.map((r) => [r[0], r[2]]), { color: C.blue, width: 2.8 });
      ga.path(rec.map((r) => [r[0], r[3]]), { color: C.red, width: 2.8 });
      const r = showRec;
      gs.dot(r[0], r[1], { color: C.navy });
      gv.dot(r[0], r[2], { color: C.blue });
      ga.dot(r[0], r[3], { color: C.red });
      if (tc == null && st.done) {
        Sim.text(ctx, 'Move your mouse over a graph to inspect it', w / 2, roadH + 12, { size: 12.5, color: C.muted, align: 'center', italic: true });
      }
    },
    readout(s) {
      const st = s.state;
      const r = st.cursor != null ? st.rec[nearest(st.rec, st.cursor)] : st.rec[st.rec.length - 1];
      const out = [
        ['t =', r[0].toFixed(1) + ' s'],
        ['s =', Sim.fmt(r[1], 3) + ' m'],
        ['v =', r[2].toFixed(2) + ' m s⁻¹'],
        ['a =', r[3].toFixed(2) + ' m s⁻²']
      ];
      if (st.cursor != null) {
        out.push(['gradient of s–t =', r[2].toFixed(2) + ' m s⁻¹ = v', true]);
        out.push(['area under v–t =', Sim.fmt(r[1], 3) + ' m = s', true]);
        out.push(['area under a–t =', (r[2] - st.rec[0][2]).toFixed(2) + ' m s⁻¹ = Δv', true]);
      }
      return out;
    },
    pointer: {
      cursor: 'crosshair',
      touchAction: 'pan-y',
      move(s, pt) {
        const st = s.state;
        if (s.running) { st.cursor = null; return; }
        const b = st.boxes.find((b) => pt.x >= b.x && pt.x <= b.x + b.w && pt.y >= b.y - 10 && pt.y <= b.y + b.h + 10);
        if (!b) { st.cursor = null; return; }
        const t = ((pt.x - b.x) / b.w) * T_END;
        st.cursor = Sim.clamp(t, 0, st.t);
      },
      down(s, pt) { this.move(s, pt); },
      leave(s) { s.state.cursor = null; }
    }
  });

  function nearest(rec, t) {
    let lo = 0, hi = rec.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (rec[mid][0] < t) lo = mid; else hi = mid; }
    return Math.abs(rec[lo][0] - t) < Math.abs(rec[hi][0] - t) ? lo : hi;
  }
  function areaPoly(g, pts, idx, color) {
    const ctx = g.ctx;
    if (pts.length < 2) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(g.px(pts[0][0]), g.py(0));
    for (const p of pts) ctx.lineTo(g.px(p[0]), g.py(p[idx]));
    ctx.lineTo(g.px(pts[pts.length - 1][0]), g.py(0));
    ctx.closePath();
    ctx.fill();
  }

  /* ======================================================================
     2. Area under a v–t graph → SUVAT
     ====================================================================== */
  Sim.create('#sim-suvat', {
    title: 'Where s = ut + ½at² comes from',
    height: (w) => Math.min(400, Math.max(300, w * 0.5)),
    controls: [
      { key: 'u', label: 'Initial velocity u', min: 0, max: 20, step: 0.5, value: 6, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'a', label: 'Acceleration a', min: -3, max: 4, step: 0.1, value: 1.5, unit: 'm s⁻²', format: (v) => v.toFixed(1) },
      { key: 't', label: 'Time t', min: 1, max: 10, step: 0.1, value: 6, unit: 's', format: (v) => v.toFixed(1) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const v = p.u + p.a * p.t;
      const top = Math.max(p.u, v, 5);
      const ymax = Math.ceil((top * 1.2) / 5) * 5;
      const ymin = v < 0 ? -Math.ceil((-v * 1.25) / 5) * 5 : 0;
      const g = Sim.graph(ctx, { x: 52, y: 26, w: w - 52 - 24, h: h - 26 - 34, xmin: 0, xmax: 10.5, ymin, ymax, xlabel: 't / s', ylabel: 'v / m s⁻¹' }).axes();
      const X = g.px, Y = g.py;
      const fnv = (t) => p.u + p.a * t;

      if (v >= 0) {
        // rectangle u×t
        Sim.rect(ctx, X(0), Y(p.u), X(p.t) - X(0), Y(0) - Y(p.u), { fill: 'rgba(0,123,255,0.20)' });
        // triangle between u-level and the line
        Sim.polyline(ctx, [[X(0), Y(p.u)], [X(p.t), Y(p.u)], [X(p.t), Y(v)]], {
          close: true, width: 1, color: p.a >= 0 ? C.orange : C.red,
          fill: p.a >= 0 ? 'rgba(240,140,0,0.30)' : 'rgba(224,49,49,0.25)'
        });
        if (p.u > 0.8) Sim.text(ctx, 'ut', X(p.t / 2), Y(p.u / 2), { size: 15, bold: true, color: C.navy, align: 'center' });
        if (Math.abs(p.a) * p.t > 1.2) {
          const ty = Y(p.u + (v - p.u) * 0.28);
          Sim.text(ctx, p.a >= 0 ? '½at²' : '−½|a|t²', X(p.t * 0.8), ty, { size: 15, bold: true, color: p.a >= 0 ? '#b35c00' : C.red, align: 'center' });
        }
      } else {
        g.fill(fnv, 0, p.t, { color: 'rgba(0,123,255,0.18)' });
      }
      g.plot(fnv, { from: 0, to: p.t, color: C.navy, width: 3 });
      g.vline(p.t, { color: C.grey });
      g.dot(0, p.u, { color: C.blue, label: 'u', dx: 8, dy: -10 });
      g.dot(p.t, v, { color: C.navy, label: 'v = ' + v.toFixed(1), dx: 8, dy: p.a >= 0 ? -12 : 14 });

      // gradient triangle
      if (Math.abs(p.a) > 0.05 && p.t > 2) {
        const t1 = p.t * 0.12, t2 = p.t * 0.12 + Math.min(1.5, p.t * 0.25);
        Sim.line(ctx, X(t1), Y(fnv(t1)), X(t2), Y(fnv(t1)), { color: C.green, width: 1.5, dash: [4, 3] });
        Sim.line(ctx, X(t2), Y(fnv(t1)), X(t2), Y(fnv(t2)), { color: C.green, width: 1.5, dash: [4, 3] });
        const lx = (X(t1) + X(t2)) / 2, ly = Y(fnv((t1 + t2) / 2)) + (p.a >= 0 ? -14 : 14);
        Sim.text(ctx, 'gradient = a', lx, ly, { size: 12.5, color: C.green, bold: true, align: 'center', bg: 'rgba(255,255,255,0.8)' });
      }
    },
    readout(s) {
      const { u, a, t } = s.p;
      const v = u + a * t;
      const sDisp = u * t + 0.5 * a * t * t;
      return [
        ['v = u + at =', v.toFixed(2) + ' m s⁻¹'],
        ['ut =', (u * t).toFixed(2) + ' m'],
        ['½at² =', (0.5 * a * t * t).toFixed(2) + ' m'],
        ['s = ut + ½at² =', sDisp.toFixed(2) + ' m', true],
        ['½(u + v)t =', (0.5 * (u + v) * t).toFixed(2) + ' m'],
        ['check v² = u² + 2as:', (v * v).toFixed(1) + ' = ' + (u * u + 2 * a * sDisp).toFixed(1)]
      ];
    }
  });

  /* ======================================================================
     3. Resolving and adding vectors
     ====================================================================== */
  Sim.create('#sim-vectors', {
    title: 'Resolve a vector, then add two',
    height: (w) => Math.min(420, Math.max(320, w * 0.52)),
    controls: [{
      key: 'add', type: 'check', label: 'Add a second vector', value: false,
      onChange: (s, on) => { s.state.A = on ? [6, 1.5] : [9, 5]; s.state.B = [2, 5]; }
    }],
    init(s) { s.state = { A: [9, 5], B: [2, 5], drag: null }; },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const unit = Math.max(18, Math.min(30, w / 28));
      const O = [Math.round(w * (s.p.add ? 0.2 : 0.28)), Math.round(h * 0.78)];
      st.O = O; st.unit = unit;
      const P = (v) => [O[0] + v[0] * unit, O[1] - v[1] * unit];
      // grid
      ctx.save();
      ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = O[0] % unit; x < w; x += unit) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = O[1] % unit; y < h; y += unit) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      ctx.restore();
      Sim.line(ctx, 0, O[1], w, O[1], { color: '#adb5bd', width: 1.5 });
      Sim.line(ctx, O[0], 0, O[0], h, { color: '#adb5bd', width: 1.5 });
      Sim.text(ctx, 'grid: 1 square = 1 N', w - 10, h - 12, { size: 12, color: C.muted, align: 'right' });

      const A = st.A, PA = P(A);
      const magA = Math.hypot(A[0], A[1]);
      const angA = Math.atan2(A[1], A[0]);
      if (!s.p.add) {
        // components
        Sim.arrow(ctx, O[0], O[1], PA[0], O[1], { color: C.blue, width: 3 });
        Sim.line(ctx, PA[0], O[1], PA[0], PA[1], { color: C.red, width: 1.5, dash: [5, 4] });
        Sim.arrow(ctx, PA[0], O[1], PA[0], PA[1], { color: C.red, width: 3 });
        Sim.text(ctx, 'F cos θ = ' + A[0].toFixed(1) + ' N', (O[0] + PA[0]) / 2, O[1] + (A[1] >= 0 ? 16 : -16), { color: C.blue, bold: true, align: 'center', size: 13.5, bg: 'rgba(255,255,255,0.85)' });
        Sim.text(ctx, 'F sin θ = ' + A[1].toFixed(1) + ' N', PA[0] + (A[0] >= 0 ? 8 : -8), (O[1] + PA[1]) / 2, { color: C.red, bold: true, align: A[0] >= 0 ? 'left' : 'right', size: 13.5, bg: 'rgba(255,255,255,0.85)' });
        Sim.arrow(ctx, O[0], O[1], PA[0], PA[1], { color: C.navy, width: 4 });
        if (magA > 1) Sim.arc(ctx, O[0], O[1], 34, 0, -angA, { color: C.ink, label: 'θ', labelGap: 12 });
        const mid = [(O[0] + PA[0]) / 2, (O[1] + PA[1]) / 2];
        Sim.text(ctx, 'F = ' + magA.toFixed(1) + ' N', mid[0] - 10 * Math.sin(angA) - 6, mid[1] - 10 * Math.cos(angA) - 6, { color: C.navy, bold: true, align: 'right', size: 14 });
      } else {
        const B = st.B;
        const R = [A[0] + B[0], A[1] + B[1]];
        const PR = P(R);
        Sim.line(ctx, PA[0], PA[1], PR[0], PR[1], { color: C.purple, width: 1 });
        // faint parallelogram
        const PB0 = P(B);
        Sim.line(ctx, O[0], O[1], PB0[0], PB0[1], { color: C.purple, width: 1.2, dash: [4, 4], alpha: 0.5 });
        Sim.line(ctx, PB0[0], PB0[1], PR[0], PR[1], { color: C.navy, width: 1.2, dash: [4, 4], alpha: 0.5 });
        Sim.arrow(ctx, O[0], O[1], PR[0], PR[1], { color: C.green, width: 4.5 });
        Sim.arrow(ctx, O[0], O[1], PA[0], PA[1], { color: C.navy, width: 3.5, label: 'A', labelOffset: -26 });
        Sim.arrow(ctx, PA[0], PA[1], PR[0], PR[1], { color: C.purple, width: 3.5 });
        Sim.text(ctx, 'B', (PA[0] + PR[0]) / 2 + 10, (PA[1] + PR[1]) / 2, { color: C.purple, bold: true, size: 15 });
        Sim.text(ctx, 'R = A + B', (O[0] + PR[0]) / 2 + 12, (O[1] + PR[1]) / 2 + 14, { color: C.green, bold: true, size: 14, bg: 'rgba(255,255,255,0.85)' });
        handle(ctx, P(R));
      }
      handle(ctx, PA);
      if (s.p.add) handle(ctx, P([A[0] + st.B[0], A[1] + st.B[1]]));
    },
    readout(s) {
      const { A, B } = s.state;
      const magA = Math.hypot(A[0], A[1]);
      const angA = Math.atan2(A[1], A[0]) / DEG;
      if (!s.p.add) {
        return [
          ['F =', magA.toFixed(2) + ' N'],
          ['θ =', angA.toFixed(1) + '°'],
          ['Fₓ = F cos θ =', (magA * Math.cos(angA * DEG)).toFixed(2) + ' N'],
          ['F_y = F sin θ =', (magA * Math.sin(angA * DEG)).toFixed(2) + ' N'],
          ['check √(Fₓ² + F_y²) =', Math.hypot(A[0], A[1]).toFixed(2) + ' N', true]
        ];
      }
      const R = [A[0] + B[0], A[1] + B[1]];
      const between = Math.abs(((Math.atan2(B[1], B[0]) - Math.atan2(A[1], A[0])) / DEG + 540) % 360 - 180);
      const out = [
        ['A =', magA.toFixed(2) + ' N'],
        ['B =', Math.hypot(B[0], B[1]).toFixed(2) + ' N'],
        ['angle between =', between.toFixed(0) + '°'],
        ['R =', Math.hypot(R[0], R[1]).toFixed(2) + ' N', true],
        ['direction of R =', (Math.atan2(R[1], R[0]) / DEG).toFixed(1) + '° above x-axis']
      ];
      if (Math.abs(between - 90) < 3) out.push(['right angle, so R = √(A² + B²) =', Math.sqrt(magA * magA + B[0] * B[0] + B[1] * B[1]).toFixed(2) + ' N', true]);
      return out;
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const st = s.state;
        const P = (v) => [st.O[0] + v[0] * st.unit, st.O[1] - v[1] * st.unit];
        const pa = P(st.A);
        const pr = P([st.A[0] + st.B[0], st.A[1] + st.B[1]]);
        const dA = Math.hypot(pt.x - pa[0], pt.y - pa[1]);
        const dR = s.p.add ? Math.hypot(pt.x - pr[0], pt.y - pr[1]) : Infinity;
        st.drag = dR < 26 && dR <= dA ? 'B' : dA < 26 ? 'A' : null;
        s.canvas.style.cursor = st.drag ? 'grabbing' : 'grab';
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const raw = [(pt.x - st.O[0]) / st.unit, (st.O[1] - pt.y) / st.unit];
        const snap = (v) => Math.round(v * 2) / 2;
        const maxX = (s.w - st.O[0] - 10) / st.unit, minX = -(st.O[0] - 10) / st.unit;
        const maxY = (st.O[1] - 10) / st.unit, minY = -(s.h - st.O[1] - 10) / st.unit;
        const v = [Sim.clamp(snap(raw[0]), minX, maxX), Sim.clamp(snap(raw[1]), minY, maxY)];
        if (st.drag === 'A') {
          // keep the resultant on screen too
          if (s.p.add) {
            v[0] = Sim.clamp(v[0], minX - st.B[0], maxX - st.B[0]);
            v[1] = Sim.clamp(v[1], minY - st.B[1], maxY - st.B[1]);
          }
          st.A = v;
        } else st.B = [v[0] - st.A[0], v[1] - st.A[1]];
      },
      up(s) { s.state.drag = null; s.canvas.style.cursor = 'grab'; }
    }
  });
  function handle(ctx, p) {
    Sim.circle(ctx, p[0], p[1], 9, { fill: '#fff', stroke: C.navy, width: 2.5 });
    Sim.circle(ctx, p[0], p[1], 3, { fill: C.navy });
  }

  /* ======================================================================
     4. Projectile launcher
     ====================================================================== */
  const DRAG_K = 0.012; // drag constant / mass, per metre
  function flightPath(u, deg, h0, drag) {
    const th = deg * DEG;
    let x = 0, y = h0, vx = u * Math.cos(th), vy = u * Math.sin(th), t = 0;
    const dt = 0.004;
    const pts = [[0, x, y, vx, vy]];
    let ymax = y;
    const k = drag ? DRAG_K : 0;
    if (h0 <= 0 && vy <= 0) return { pts, T: 0, R: 0, H: h0 };
    while (t < 40) {
      const sp = Math.hypot(vx, vy);
      vx += -k * sp * vx * dt;
      vy += (-G - k * sp * vy) * dt;
      const nx = x + vx * dt, ny = y + vy * dt;
      t += dt;
      if (ny < 0) {
        const f = y / (y - ny);
        pts.push([t - dt + f * dt, x + f * (nx - x), 0, vx, vy]);
        break;
      }
      x = nx; y = ny;
      if (y > ymax) ymax = y;
      pts.push([t, x, y, vx, vy]);
    }
    const last = pts[pts.length - 1];
    return { pts, T: last[0], R: last[1], H: ymax };
  }
  function exactFlight(u, deg, h0) {
    const uy = u * Math.sin(deg * DEG), ux = u * Math.cos(deg * DEG);
    const T = (uy + Math.sqrt(uy * uy + 2 * G * h0)) / G;
    return { T, R: ux * T, H: h0 + (uy > 0 ? (uy * uy) / (2 * G) : 0) };
  }

  Sim.create('#sim-projectile', {
    title: 'Projectile launcher',
    height: (w) => Math.min(460, Math.max(330, w * 0.55)),
    controls: [
      { key: 'u', label: 'Launch speed u', min: 5, max: 30, step: 0.5, value: 20, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'deg', label: 'Launch angle θ', min: 0, max: 90, step: 1, value: 45, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'h0', label: 'Launch height', min: 0, max: 30, step: 1, value: 0, unit: 'm', format: (v) => v.toFixed(0) },
      { key: 'comp', type: 'check', label: 'Show velocity components', value: true },
      { key: 'drag', type: 'check', label: 'Air resistance (beyond the spec)', value: false },
      { type: 'button', label: '🚀 Launch', onClick: (s) => launch(s) },
      { type: 'button', label: 'Clear trails', ghost: true, onClick: (s) => { s.state.trails = []; } }
    ],
    animate: true,
    resetButton: false,
    init(s) {
      s.state = { trails: [], fly: null };
      launch(s);
    },
    update(s, dt) {
      const f = s.state.fly;
      if (!f) return;
      f.t += dt;
      if (f.t >= f.path.T) {
        s.state.trails.push({ pts: f.path.pts.map((q) => [q[1], q[2]]), drag: f.drag });
        if (s.state.trails.length > 6) s.state.trails.shift();
        s.state.last = f;
        s.state.fly = null;
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const preview = flightPath(p.u, p.deg, p.h0, p.drag);
      let maxX = Math.max(preview.R, 10), maxY = Math.max(preview.H, 5);
      st.trails.forEach((tr) => tr.pts.forEach((q) => { maxX = Math.max(maxX, q[0]); maxY = Math.max(maxY, q[1]); }));
      if (st.fly) { maxX = Math.max(maxX, st.fly.path.R); maxY = Math.max(maxY, st.fly.path.H); }
      const left = 58, right = 24, top = 22, bottom = 40;
      const scale = Math.min((w - left - right) / (maxX * 1.05), (h - top - bottom) / (maxY * 1.12));
      const X = (x) => left + x * scale, Y = (y) => h - bottom - y * scale;

      // ground & axes
      Sim.rect(ctx, 0, Y(0), w, bottom, { fill: '#e6eddc' });
      Sim.line(ctx, 0, Y(0), w, Y(0), { color: '#7d8f69', width: 2 });
      const xs = tickStep(maxX), ys = tickStep(maxY);
      for (let x = 0; X(x) < w - 10; x += xs) {
        Sim.line(ctx, X(x), Y(0), X(x), Y(0) + 5, { color: C.axis, width: 1 });
        Sim.text(ctx, x + ' m', X(x), Y(0) + 8, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.line(ctx, left - 16, Y(0), left - 16, top, { color: '#ced4da', width: 1.5 });
      for (let y = ys; Y(y) > top; y += ys) {
        Sim.line(ctx, left - 20, Y(y), left - 12, Y(y), { color: C.axis, width: 1 });
        Sim.text(ctx, y + ' m', left - 22, Y(y), { size: 10.5, color: C.muted, align: 'right' });
      }
      // platform
      if (p.h0 > 0) Sim.rect(ctx, X(0) - 26, Y(p.h0), 26, Y(0) - Y(p.h0), { fill: '#b9a68b', stroke: '#8c7a62', width: 1 });

      // old trails, then preview
      st.trails.forEach((tr, i) => {
        Sim.polyline(ctx, tr.pts.map((q) => [X(q[0]), Y(q[1])]), { color: tr.drag ? C.orange : C.sky, width: 2, alpha: 0.35 + 0.1 * i });
      });
      if (!st.fly) Sim.polyline(ctx, preview.pts.filter((_, i) => i % 3 === 0 || i === preview.pts.length - 1).map((q) => [X(q[1]), Y(q[2])]), { color: C.grey, width: 1.5, dash: [5, 5] });

      // cannon
      const th = p.deg * DEG;
      ctx.save();
      ctx.translate(X(0), Y(p.h0));
      ctx.rotate(-th);
      Sim.rect(ctx, -6, -7, 34, 14, { fill: C.navy, r: 5 });
      ctx.restore();
      Sim.circle(ctx, X(0), Y(p.h0), 9, { fill: '#444' });

      // the ball
      const f = st.fly;
      if (f) {
        const pts = f.path.pts;
        const i = Math.min(pts.length - 1, Math.floor(f.t / 0.004));
        const q = pts[i];
        Sim.polyline(ctx, pts.slice(0, i + 1).filter((_, j) => j % 2 === 0).map((r) => [X(r[1]), Y(r[2])]), { color: f.drag ? C.orange : C.blue, width: 2.5 });
        const bx = X(q[1]), by = Y(q[2]);
        // shadows on the axes
        Sim.line(ctx, bx, by, bx, Y(0), { color: C.blue, dash: [3, 4], width: 1, alpha: 0.6 });
        Sim.line(ctx, bx, by, left - 16, by, { color: C.red, dash: [3, 4], width: 1, alpha: 0.6 });
        Sim.circle(ctx, bx, Y(0), 6, { fill: C.blue, stroke: '#fff', width: 2 });
        Sim.circle(ctx, left - 16, by, 6, { fill: C.red, stroke: '#fff', width: 2 });
        if (p.comp) {
          const k = 2.6;
          Sim.arrow(ctx, bx, by, bx + q[3] * k, by, { color: C.blue, width: 2.5, label: 'vₓ', labelOffset: 12 });
          if (Math.abs(q[4]) > 1.5) Sim.arrow(ctx, bx, by, bx, by - q[4] * k, { color: C.red, width: 2.5, label: 'v_y', labelOffset: 12 });
          Sim.arrow(ctx, bx, by, bx + q[3] * k, by - q[4] * k, { color: C.navy, width: 2, alpha: 0.7 });
        }
        Sim.circle(ctx, bx, by, 8, { fill: '#222', stroke: '#fff', width: 2 });
      }
    },
    readout(s) {
      const p = s.p;
      const f = s.state.fly;
      const res = p.drag ? flightPath(p.u, p.deg, p.h0, true) : exactFlight(p.u, p.deg, p.h0);
      const out = [
        ['time of flight =', res.T.toFixed(2) + ' s'],
        ['range =', res.R.toFixed(1) + ' m', true],
        ['max height =', res.H.toFixed(1) + ' m'],
        ['uₓ = u cos θ =', (p.u * Math.cos(p.deg * DEG)).toFixed(2) + ' m s⁻¹'],
        ['u_y = u sin θ =', (p.u * Math.sin(p.deg * DEG)).toFixed(2) + ' m s⁻¹']
      ];
      if (f) {
        const q = f.path.pts[Math.min(f.path.pts.length - 1, Math.floor(f.t / 0.004))];
        out.push(['now: vₓ =', q[3].toFixed(1) + ' m s⁻¹'], ['v_y =', q[4].toFixed(1) + ' m s⁻¹']);
      }
      if (p.drag) out.push(['with air resistance', 'numerical model']);
      return out;
    }
  });
  function launch(s) {
    const p = s.p;
    s.state.fly = { t: 0, path: flightPath(p.u, p.deg, p.h0, p.drag), drag: p.drag };
    if (!s.running) s.play();
  }
  function tickStep(max) {
    const raw = max / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }

  /* ======================================================================
     5. Core practical 1 — measuring g by free fall
     ====================================================================== */
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

  Sim.create('#sim-freefall', {
    title: 'Virtual experiment: free fall',
    height: (w) => (w >= 640 ? 380 : 620),
    controls: [
      { key: 'h', label: 'Drop height h', min: 0.2, max: 1.5, step: 0.05, value: 0.5, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'delay', type: 'check', label: 'Magnet release delay (systematic error)', value: false },
      { type: 'button', label: 'Drop the ball', onClick: (s) => drop(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.last = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], fall: null, last: null }; },
    update(s, dt) {
      const f = s.state.fall;
      if (!f) return;
      f.t += dt * 0.35; // slow motion so you can see it
      if (f.t >= f.tTrue) {
        s.state.data.push([f.h, f.tMeas]);
        s.state.last = f;
        s.state.fall = null;
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const scene = wide ? { x: 0, y: 0, w: Math.min(260, w * 0.34), h } : { x: 0, y: 0, w, h: 250 };
      // stand
      const topY = scene.y + 40, baseY = scene.y + scene.h - 34;
      const pxPerM = (baseY - topY - 10) / 1.5;
      const cx = scene.x + scene.w / 2;
      Sim.rect(ctx, cx - 70, baseY, 140, 10, { fill: '#868e96', r: 3 });
      Sim.rect(ctx, cx - 58, topY - 20, 8, baseY - topY + 20, { fill: '#adb5bd' });
      Sim.rect(ctx, cx - 54, topY - 22, 54, 8, { fill: '#adb5bd' });
      Sim.rect(ctx, cx - 14, topY - 16, 28, 18, { fill: C.red, r: 3 });
      Sim.text(ctx, 'magnet', cx + 18, topY - 8, { size: 11, color: C.muted });
      const gateY = topY + 10 + p.h * pxPerM;
      Sim.rect(ctx, cx - 30, gateY - 3, 12, 8, { fill: C.navy, r: 2 });
      Sim.rect(ctx, cx + 18, gateY - 3, 12, 8, { fill: C.navy, r: 2 });
      Sim.line(ctx, cx - 18, gateY + 1, cx + 18, gateY + 1, { color: 'rgba(224,49,49,0.6)', width: 1.5, dash: [3, 3] });
      Sim.text(ctx, 'light gate', cx + 34, gateY + 1, { size: 11, color: C.muted });
      // height marker
      Sim.arrow(ctx, cx - 32, topY + 10, cx - 32, gateY, { color: C.green, width: 1.5, head: 7 });
      Sim.arrow(ctx, cx - 32, gateY, cx - 32, topY + 10, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, 'h = ' + p.h.toFixed(2) + ' m', cx + 16, (topY + gateY) / 2, { size: 12, color: C.green, bold: true });
      // ball
      let by = topY + 10;
      const f = st.fall;
      if (f) by = topY + 10 + 0.5 * G * f.t * f.t * pxPerM;
      else if (st.last && Math.abs(st.last.h - p.h) < 1e-6) by = gateY + 4;
      Sim.circle(ctx, cx, by - 8, 8, { fill: '#555', stroke: '#222', width: 1.5 });
      // timer
      const shown = f ? Math.min(f.t, f.tTrue) + (f.delayed ? 0.025 : 0) : st.last ? st.last.tMeas : 0;
      Sim.rect(ctx, cx - 44, scene.y + scene.h - 26, 88, 22, { fill: '#212529', r: 4 });
      Sim.text(ctx, shown.toFixed(3) + ' s', cx, scene.y + scene.h - 15, { size: 14, bold: true, color: '#69db7c', align: 'center' });

      // graph of h against t²
      const gb = wide ? { x: scene.w + 56, y: 30, w: w - scene.w - 56 - 22, h: h - 30 - 40 } : { x: 56, y: 290, w: w - 56 - 22, h: h - 290 - 40 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.36, ymin: 0, ymax: 1.6, xlabel: 't² / s²', ylabel: 'h / m', title: 'h against t²' }, gb)).axes();
      const pts = st.data.map(([hh, t]) => [t * t, hh]);
      const fit = fitLine(pts);
      if (fit) g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
      g.plot((x) => (G / 2) * x, { color: C.green, width: 1.5, dash: [6, 5] });
      g.label(0.25, (G / 2) * 0.25 + 0.08, 'true line (g = 9.81)', { size: 11, color: C.green, align: 'right', bold: false });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Press “Drop the ball” to take a reading', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const pts = st.data.map(([hh, t]) => [t * t, hh]);
      const fit = fitLine(pts);
      const out = [['readings:', String(st.data.length)]];
      if (st.last) out.push(['last time:', st.last.tMeas.toFixed(3) + ' s']);
      if (fit && pts.length >= 3) {
        const gEst = 2 * fit.m;
        out.push(['gradient =', fit.m.toFixed(2) + ' m s⁻²']);
        out.push(['g = 2 × gradient =', gEst.toFixed(2) + ' m s⁻²', true]);
        out.push(['intercept =', fit.c.toFixed(3) + ' m']);
        out.push(['difference from 9.81:', (Math.abs(gEst - G) / G * 100).toFixed(1) + '%']);
      } else if (pts.length) out.push(['take at least 3 readings', 'to fit a line']);
      return out;
    }
  });
  function drop(s) {
    if (s.state.fall) return;
    const hh = s.p.h;
    const tTrue = Math.sqrt((2 * hh) / G);
    const delayed = s.p.delay;
    const tMeas = tTrue + gaussian() * 0.003 + (delayed ? 0.025 : 0);
    s.state.fall = { h: hh, t: 0, tTrue, tMeas, delayed };
  }
})();
