/* Superposition & Stationary Waves — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const TAU = 2 * Math.PI;
  const G = 9.81;

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
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
  function niceCeil(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  /* A phase in radians written as a tidy multiple of π where possible. */
  function piText(phi) {
    const r = phi / Math.PI;
    if (Math.abs(r) < 1e-6) return '0';
    for (const d of [1, 2, 3, 4, 6]) {
      const n = Math.round(r * d);
      if (n !== 0 && Math.abs(r * d - n) < 0.012) {
        const num = n === 1 ? 'π' : n + 'π';
        return d === 1 ? num : num + '/' + d;
      }
    }
    return r.toFixed(2) + 'π';
  }
  const frac1 = (x) => ((x % 1) + 1) % 1;
  /* Small numbers always in standard form, e.g. 2.2 × 10⁻³ */
  function sci(v) {
    if (!(v > 0) || !isFinite(v)) return Sim.fmt(v, 2);
    let e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    if (+m.toFixed(1) >= 10) { m /= 10; e += 1; }
    return m.toFixed(1) + ' × 10' + Sim.sup(e);
  }

  /* ======================================================================
     1. Phase difference between two points on a progressive wave
     ====================================================================== */
  const V_VIS = 0.4;   // m s⁻¹, slowed down so you can follow it
  const XLEN = 2.0;    // metres of string shown
  const A_CM = 2.0;    // amplitude in cm (for the graph)

  Sim.create('#sim-phase', {
    title: 'Phase difference between two points',
    height: (w) => (w >= 640 ? 400 : 430),
    controls: [
      { key: 'lam', label: 'Wavelength λ', min: 0.3, max: 1.0, step: 0.05, value: 0.8, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'marks', type: 'check', label: 'Mark the points in phase with P', value: true }
    ],
    animate: true,
    init(s) { s.state = { t: 0, xp: 0.3, xq: 0.5, drag: null }; },
    update(s, dt) { s.state.t += dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const lam = p.lam, T = lam / V_VIS;
      const left = 34, right = 22;
      const X = (x) => left + (x / XLEN) * (w - left - right);
      st.left = left; st.right = right; st.X = X;
      const Apx = 42, y0 = 96;
      const disp = (x, t) => Math.sin(TAU * (t / T - x / lam));

      // direction of travel
      Sim.arrow(ctx, w - right - 86, 14, w - right, 14, { color: C.muted, width: 2, head: 8 });
      Sim.text(ctx, 'wave travels', w - right - 92, 14, { size: 12, color: C.muted, align: 'right' });
      // equilibrium line and distance scale
      Sim.line(ctx, X(0), y0, X(XLEN), y0, { color: '#ced4da', width: 1, dash: [4, 4] });
      const tick = w >= 640 ? 0.25 : 0.5;
      for (let x = 0; x <= XLEN + 1e-9; x += tick) {
        Sim.line(ctx, X(x), y0 + Apx + 8, X(x), y0 + Apx + 13, { color: C.axis, width: 1 });
        Sim.text(ctx, +x.toFixed(2) + (x === 0 ? '' : ' m'), X(x), y0 + Apx + 16, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      // points in phase with P
      if (p.marks) {
        for (let n = -8; n <= 8; n++) {
          if (n === 0) continue;
          const x = st.xp + n * lam;
          if (x < -1e-9 || x > XLEN + 1e-9) continue;
          Sim.line(ctx, X(x), y0 - Apx - 6, X(x), y0 + Apx + 4, { color: C.red, width: 1.2, dash: [3, 4], alpha: 0.7 });
          Sim.circle(ctx, X(x), y0 - Apx * disp(x, st.t), 7, { stroke: C.red, width: 2 });
        }
      }
      // the wave and its particles
      const pts = [];
      for (let i = 0; i <= 200; i++) { const x = (XLEN * i) / 200; pts.push([X(x), y0 - Apx * disp(x, st.t)]); }
      Sim.polyline(ctx, pts, { color: C.navy, width: 2, alpha: 0.55 });
      for (let x = 0; x <= XLEN + 1e-9; x += 0.05) Sim.circle(ctx, X(x), y0 - Apx * disp(x, st.t), 3, { fill: C.grey });
      // P and Q
      const drawPt = (x, col, name) => {
        const yy = y0 - Apx * disp(x, st.t);
        Sim.line(ctx, X(x), 38, X(x), yy - 9, { color: col, width: 1, dash: [2, 3], alpha: 0.8 });
        Sim.circle(ctx, X(x), yy, 8.5, { fill: col, stroke: '#fff', width: 2.5 });
        Sim.text(ctx, name, X(x), 30, { size: 14, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.9)', pad: 3 });
      };
      drawPt(st.xq, C.blue, 'Q');
      drawPt(st.xp, C.red, 'P');
      // Δx bracket
      const xa = X(Math.min(st.xp, st.xq)), xb = X(Math.max(st.xp, st.xq));
      const by = y0 + Apx + 30;
      if (xb - xa > 8) {
        Sim.arrow(ctx, (xa + xb) / 2, by, xa, by, { color: C.ink, width: 1.5, head: 7 });
        Sim.arrow(ctx, (xa + xb) / 2, by, xb, by, { color: C.ink, width: 1.5, head: 7 });
      }
      const dxm = Math.abs(st.xq - st.xp);
      const lab = 'Δx = ' + dxm.toFixed(2) + ' m = ' + (dxm / lam).toFixed(2) + 'λ';
      const lw = Sim.measure(ctx, lab, { size: 12.5, bold: true });
      const lx = Sim.clamp((xa + xb) / 2, left + lw / 2 + 4, w - right - lw / 2 - 4);
      Sim.text(ctx, lab, lx, by + 16, { size: 12.5, bold: true, color: C.ink, align: 'center', bg: 'rgba(255,255,255,0.92)' });

      // displacement–time graph for P and Q
      const gy = 222;
      const gr = Sim.graph(ctx, { x: 46, y: gy, w: w - 46 - 20, h: h - gy - 30, xmin: 0, xmax: 2.12 * T, ymin: -3.5, ymax: 3.5, xlabel: 't / s', ylabel: 'y / cm', title: 'displacement–time graphs for P and Q' }).axes();
      const yP = (t) => A_CM * disp(st.xp, t), yQ = (t) => A_CM * disp(st.xq, t);
      gr.plot(yQ, { color: C.blue, width: 2.5, to: 2 * T });
      gr.plot(yP, { color: C.red, width: 2.5, to: 2 * T });
      // time lag between a crest of P and the next crest of Q
      const lagFrac = frac1((st.xq - st.xp) / lam);
      let tp = -1;
      for (let k = 0; k < 2 && tp < 0; k++) {
        const c = T * (frac1(0.25 + st.xp / lam) + k);
        if (c >= 0.08 * T && c + T * lagFrac <= 2 * T) tp = c;
      }
      const tq = tp + T * lagFrac;
      if (tp >= 0 && lagFrac > 0.02 && lagFrac < 0.98) {
        gr.vline(tp, { color: C.red, dash: [2, 3], width: 1 });
        gr.vline(tq, { color: C.blue, dash: [2, 3], width: 1 });
        const ay = gr.py(2.75);
        Sim.arrow(ctx, gr.px(tp), ay, gr.px(tq), ay, { color: C.green, width: 2, head: 8 });
        const room = gr.x + gr.w - gr.px(tq) > 44;
        Sim.text(ctx, 'Δt', room ? gr.px(tq) + 6 : gr.px(tp) - 6, ay, { size: 12.5, bold: true, color: C.green, align: room ? 'left' : 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      }
      const tc = st.t % (2 * T);
      gr.vline(tc, { color: C.grey, dash: [5, 4], width: 1 });
      gr.dot(tc, yQ(tc), { color: C.blue });
      gr.dot(tc, yP(tc), { color: C.red });
    },
    readout(s) {
      const st = s.state, lam = s.p.lam, T = lam / V_VIS;
      const dx = st.xq - st.xp, adx = Math.abs(dx);
      const cyc = adx / lam;
      const phi = TAU * cyc;
      const fr = frac1(cyc + 1e-9) - 1e-9;
      let rel;
      if (adx < 1e-9) rel = 'same point';
      else if (fr < 0.004 || fr > 0.996) rel = 'in phase';
      else if (Math.abs(fr - 0.5) < 0.004) rel = 'antiphase';
      else rel = (dx > 0 ? 'Q' : 'P') + ' lags behind by ' + (fr * 360).toFixed(0) + '°';
      return [
        ['period T =', Sim.fmt(T, 3) + ' s (slowed down)'],
        ['Δx =', adx.toFixed(2) + ' m'],
        ['Δx/λ =', cyc.toFixed(3)],
        ['φ = 2πΔx/λ =', phi.toFixed(2) + ' rad = ' + piText(phi) + ' = ' + (cyc * 360).toFixed(0) + '°', true],
        ['Δt/T =', fr.toFixed(3)],
        ['', rel, true]
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) {
        const st = s.state;
        if (!st.X || pt.y > 205) { st.drag = null; return; }
        const dp = Math.abs(pt.x - st.X(st.xp)), dq = Math.abs(pt.x - st.X(st.xq));
        st.drag = Math.min(dp, dq) < 30 ? (dp <= dq ? 'xp' : 'xq') : null;
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const x = Sim.clamp(((pt.x - st.left) / Math.max(1, s.w - st.left - st.right)) * XLEN, 0, XLEN);
        st[st.drag] = Math.round(x * 100) / 100;
      },
      up(s) { s.state.drag = null; }
    }
  });

  /* ======================================================================
     2. Superposition of two waves
     ====================================================================== */
  Sim.create('#sim-super', {
    title: 'Superposition: adding two waves',
    height: (w) => (w >= 640 ? 390 : 430),
    controls: [
      { key: 'a1', label: 'Amplitude of wave 1, A₁', min: 0, max: 2, step: 0.1, value: 1, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'a2', label: 'Amplitude of wave 2, A₂', min: 0, max: 2, step: 0.1, value: 1, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'phi', label: 'Phase difference φ', min: 0, max: 360, step: 5, value: 60, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'mode', type: 'select', label: 'Frequency of wave 2', value: 'same', options: [['same', 'Same as wave 1'], ['beat', 'Beats (not in spec)']] }
    ],
    animate: true,
    init(s) { s.state = { t: 0, probe: null, boxes: null }; },
    update(s, dt) { s.state.t += dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const beat = p.mode === 'beat';
      const lam1 = 0.4, lam2 = beat ? (lam1 * 12) / 13 : lam1;
      const xend = beat ? 4.8 : 1.2, xmax = xend * (w >= 640 ? 1.07 : 1.13);
      const T1 = 2.5, T2 = (T1 * lam2) / lam1;
      const ph = (p.phi * Math.PI) / 180;
      const y1 = (x) => p.a1 * Math.sin(TAU * (x / lam1 - st.t / T1));
      const y2 = (x) => p.a2 * Math.sin(TAU * (x / lam2 - st.t / T2) + ph);
      const ys = (x) => y1(x) + y2(x);
      const left = 50, right = 20, top = 30, gap = 52, bottom = 30;
      const avail = h - top - gap - bottom;
      const h1 = Math.round(avail * 0.42), h2 = avail - h1;
      const g1 = Sim.graph(ctx, { x: left, y: top, w: w - left - right, h: h1, xmin: 0, xmax, ymin: -2.4, ymax: 2.4, xlabel: 'x / m', ylabel: 'y / cm', title: 'wave 1 (red) and wave 2 (blue)', yticks: 4 }).axes();
      const g2 = Sim.graph(ctx, { x: left, y: top + h1 + gap, w: w - left - right, h: h2, xmin: 0, xmax, ymin: -4.4, ymax: 4.4, xlabel: 'x / m', ylabel: 'y / cm', title: 'resultant: y = y₁ + y₂', yticks: 4 }).axes();
      st.boxes = [g1, g2];
      const n = Math.round(g1.w * 1.5);
      g1.plot(y1, { color: C.red, width: 2.5, samples: n, to: xend });
      g1.plot(y2, { color: C.blue, width: 2.5, samples: n, to: xend });
      g2.plot(y1, { color: C.red, width: 1.2, samples: n, to: xend });
      g2.plot(y2, { color: C.blue, width: 1.2, samples: n, to: xend });
      if (beat) {
        const dk = TAU * (1 / lam2 - 1 / lam1), dw = TAU * (1 / T2 - 1 / T1);
        const env = (x) => Math.sqrt(Math.max(0, p.a1 * p.a1 + p.a2 * p.a2 + 2 * p.a1 * p.a2 * Math.cos(dk * x - dw * st.t + ph)));
        g2.plot(env, { color: C.grey, width: 1.5, dash: [5, 4], samples: n, to: xend });
        g2.plot((x) => -env(x), { color: C.grey, width: 1.5, dash: [5, 4], samples: n, to: xend });
      }
      g2.plot(ys, { color: C.navy, width: 3, samples: n, to: xend });
      if (st.probe != null) {
        const x = Sim.clamp(st.probe, 0, xend);
        g1.vline(x, { color: C.grey, width: 1 });
        g2.vline(x, { color: C.grey, width: 1 });
        g1.dot(x, y1(x), { color: C.red });
        g1.dot(x, y2(x), { color: C.blue });
        g2.dot(x, ys(x), { color: C.navy });
        const flip = g2.px(x) > g2.x + g2.w - 120;
        Sim.text(ctx, 'y = ' + ys(x).toFixed(2) + ' cm', g2.px(x) + (flip ? -10 : 10), g2.py(Sim.clamp(ys(x), -3.4, 3.4)) - 14, { size: 12.5, bold: true, color: C.navy, align: flip ? 'right' : 'left', bg: 'rgba(255,255,255,0.9)' });
      } else {
        Sim.text(ctx, 'Move over a graph to add the displacements at one point', w / 2, top + h1 + 24, { size: 12, color: C.muted, align: 'center', italic: true });
      }
    },
    readout(s) {
      const p = s.p, st = s.state;
      const ph = (p.phi * Math.PI) / 180;
      const out = [['φ =', p.phi.toFixed(0) + '° = ' + piText(ph) + ' rad']];
      if (p.mode === 'same') {
        const Ar = Math.sqrt(Math.max(0, p.a1 * p.a1 + p.a2 * p.a2 + 2 * p.a1 * p.a2 * Math.cos(ph)));
        out.push(['equivalent path difference =', (p.phi / 360).toFixed(3) + ' λ']);
        out.push(['resultant amplitude =', Ar.toFixed(2) + ' cm', true]);
        const m = p.phi % 360;
        let verdict = 'partly constructive';
        if (m === 0) verdict = 'in phase: fully constructive, A = A₁ + A₂';
        else if (m === 180) verdict = Math.abs(p.a1 - p.a2) < 1e-9 ? 'antiphase: complete cancellation' : 'antiphase: destructive, A = |A₁ − A₂|';
        else if (Ar < Math.max(p.a1, p.a2)) verdict = 'mostly destructive';
        out.push(['', verdict]);
      } else {
        out.push(['resultant amplitude swings between', Math.abs(p.a1 - p.a2).toFixed(1) + ' and ' + (p.a1 + p.a2).toFixed(1) + ' cm', true]);
        out.push(['f₂/f₁ =', '13/12']);
        out.push(['beats:', 'beyond the spec']);
      }
      if (st.probe != null && st.boxes) {
        const beat = p.mode === 'beat';
        const lam1 = 0.4, lam2 = beat ? (lam1 * 12) / 13 : lam1, T1 = 2.5, T2 = (T1 * lam2) / lam1;
        const x = st.probe;
        const v1 = p.a1 * Math.sin(TAU * (x / lam1 - st.t / T1));
        const v2 = p.a2 * Math.sin(TAU * (x / lam2 - st.t / T2) + ph);
        out.push(['at x = ' + x.toFixed(2) + ' m:', v1.toFixed(2) + ' + (' + v2.toFixed(2) + ') = ' + (v1 + v2).toFixed(2) + ' cm', true]);
      }
      return out;
    },
    pointer: {
      cursor: 'crosshair',
      touchAction: 'pan-y',
      move(s, pt) {
        const st = s.state;
        if (!st.boxes) return;
        const [g1, g2] = st.boxes;
        if (pt.x >= g1.x && pt.x <= g1.x + g1.w && pt.y >= g1.y - 10 && pt.y <= g2.y + g2.h + 10) st.probe = g1.inv(pt.x, pt.y).x;
        else st.probe = null;
      },
      down(s, pt) { this.move(s, pt); },
      leave(s) { s.state.probe = null; }
    }
  });

  /* ======================================================================
     3. Two-source interference in a ripple tank
     ====================================================================== */
  function buildTank(st, w, h, cell, ppc, lam, anti) {
    const gw = Math.ceil(w / cell), gh = Math.ceil(h / cell), n = gw * gh;
    if (!st.off || st.gw !== gw || st.gh !== gh) {
      st.off = document.createElement('canvas');
      st.off.width = gw; st.off.height = gh;
      st.octx = st.off.getContext('2d');
      st.img = st.octx.createImageData(gw, gh);
      for (let i = 3; i < st.img.data.length; i += 4) st.img.data[i] = 255;
      st.Ca = new Float32Array(n); st.Sa = new Float32Array(n); st.Ma = new Float32Array(n);
      st.gw = gw; st.gh = gh;
    }
    const k = TAU / lam, extra = anti ? Math.PI : 0;
    const [s1x, s1y] = st.S1, [s2x, s2y] = st.S2;
    let idx = 0;
    for (let j = 0; j < gh; j++) {
      const yc = ((j + 0.5) * cell) / ppc;
      for (let i = 0; i < gw; i++, idx++) {
        const xc = ((i + 0.5) * cell) / ppc;
        const r1 = Math.hypot(xc - s1x, yc - s1y), r2 = Math.hypot(xc - s2x, yc - s2y);
        const a1 = 1 / Math.sqrt(1 + r1 / 8), a2 = 1 / Math.sqrt(1 + r2 / 8);
        const p1 = k * r1, p2 = k * r2 + extra;
        const c = a1 * Math.cos(p1) + a2 * Math.cos(p2);
        const sn = a1 * Math.sin(p1) + a2 * Math.sin(p2);
        st.Ca[idx] = c; st.Sa[idx] = sn;
        st.Ma[idx] = Math.sqrt(c * c + sn * sn) / (a1 + a2);
      }
    }
    st.ampKey = '';
  }

  Sim.create('#sim-ripple', {
    title: 'Two-source interference (ripple tank)',
    height: (w) => (w >= 640 ? 420 : 380),
    controls: [
      { key: 'lam', label: 'Wavelength λ', min: 1, max: 3, step: 0.1, value: 1.5, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'd', label: 'Source separation', min: 2, max: 10, step: 0.5, value: 6, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'src', type: 'select', label: 'Sources', value: 'in', options: [['in', 'In phase'], ['anti', 'In antiphase (180° apart)']] },
      { key: 'view', type: 'select', label: 'Show', value: 'wave', options: [['wave', 'Ripples (moving)'], ['amp', 'Amplitude map']] }
    ],
    animate: true,
    init(s) { s.state = { t: 0, P: null, drag: false, key: '' }; },
    update(s, dt) { s.state.t += dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const tankW = wide ? 30 : 20;
      const ppc = w / tankW;
      const cell = wide ? 3 : 2;
      const cy = h / 2 / ppc;
      st.ppc = ppc;
      st.S1 = [2, cy - p.d / 2];
      st.S2 = [2, cy + p.d / 2];
      if (!st.P) {
        // start the probe on the first-order maximum, about 60% of the way across
        const px = tankW * 0.62;
        let lo = cy, hi = h / ppc - 0.5;
        const diff = (y) => Math.hypot(px - st.S1[0], y - st.S1[1]) - Math.hypot(px - st.S2[0], y - st.S2[1]);
        for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (diff(mid) < p.lam) lo = mid; else hi = mid; }
        st.P = [px, (lo + hi) / 2];
      }
      st.P = [Sim.clamp(st.P[0], 0.3, w / ppc - 0.3), Sim.clamp(st.P[1], 0.3, h / ppc - 0.3)];
      const key = [w, h, p.lam, p.d, p.src].join('|');
      if (st.key !== key) { buildTank(st, w, h, cell, ppc, p.lam, p.src === 'anti'); st.key = key; }
      const data = st.img.data, n = st.gw * st.gh;
      if (p.view === 'amp') {
        if (st.ampKey !== key) {
          for (let i = 0, q = 0; i < n; i++, q += 4) {
            const m = Math.pow(st.Ma[i], 1.4);
            data[q] = 10 + 235 * m; data[q + 1] = 28 + 214 * m; data[q + 2] = 80 + 170 * m;
          }
          st.ampKey = key;
        }
      } else {
        st.ampKey = '';
        const om = (TAU * st.t) / 1.2;
        const co = Math.cos(om), si = Math.sin(om);
        const Ca = st.Ca, Sa = st.Sa;
        for (let i = 0, q = 0; i < n; i++, q += 4) {
          let v = (Ca[i] * co + Sa[i] * si) * 0.75;
          v = v > 1 ? 1 : v < -1 ? -1 : v;
          const t = (v + 1) / 2;
          data[q] = 12 + 213 * t; data[q + 1] = 42 + 196 * t; data[q + 2] = 110 + 145 * t;
        }
      }
      st.octx.putImageData(st.img, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(st.off, 0, 0, st.gw * cell, st.gh * cell);
      ctx.restore();

      const P = (q) => [q[0] * ppc, q[1] * ppc];
      const ps1 = P(st.S1), ps2 = P(st.S2), pp = P(st.P);
      Sim.line(ctx, ps1[0], ps1[1], pp[0], pp[1], { color: C.orange, width: 2.2, dash: [7, 5] });
      Sim.line(ctx, ps2[0], ps2[1], pp[0], pp[1], { color: '#69db7c', width: 2.2, dash: [7, 5] });
      [[ps1, 'S₁'], [ps2, 'S₂']].forEach(([q, name]) => {
        Sim.circle(ctx, q[0], q[1], 6, { fill: '#fff', stroke: C.navy, width: 2.5 });
        Sim.text(ctx, name, q[0] - 12, q[1], { size: 13, bold: true, color: '#fff', align: 'right', bg: 'rgba(0,43,128,0.8)', pad: 3 });
      });
      Sim.circle(ctx, pp[0], pp[1], 9, { fill: 'rgba(224,49,49,0.9)', stroke: '#fff', width: 2.5 });
      Sim.text(ctx, 'P', pp[0], pp[1] + 0.5, { size: 11, bold: true, color: '#fff', align: 'center' });
      // label at the probe
      const r1 = Math.hypot(st.P[0] - st.S1[0], st.P[1] - st.S1[1]);
      const r2 = Math.hypot(st.P[0] - st.S2[0], st.P[1] - st.S2[1]);
      const nl = Math.abs(r1 - r2) / p.lam;
      const v = verdictRipple(nl, p.src === 'anti');
      const lab = 'Δ = ' + nl.toFixed(2) + 'λ → ' + v.short;
      const lw = Sim.measure(ctx, lab, { size: 13, bold: true });
      const lx = Sim.clamp(pp[0], lw / 2 + 6, w - lw / 2 - 6);
      const ly = pp[1] > 40 ? pp[1] - 24 : pp[1] + 24;
      Sim.text(ctx, lab, lx, ly, { size: 13, bold: true, color: v.col, align: 'center', bg: 'rgba(255,255,255,0.92)' });
      // scale bar
      const sb = 5 * ppc;
      Sim.rect(ctx, 8, h - 30, sb + 16, 22, { fill: 'rgba(0,0,0,0.45)', r: 4 });
      Sim.line(ctx, 16, h - 14, 16 + sb, h - 14, { color: '#fff', width: 2 });
      Sim.text(ctx, '5 cm', 16 + sb / 2, h - 23, { size: 11, color: '#fff', align: 'center', bold: true });
    },
    readout(s) {
      const st = s.state;
      if (!st.P || !st.S1) return [];
      const r1 = Math.hypot(st.P[0] - st.S1[0], st.P[1] - st.S1[1]);
      const r2 = Math.hypot(st.P[0] - st.S2[0], st.P[1] - st.S2[1]);
      const dl = Math.abs(r1 - r2), nl = dl / s.p.lam;
      const anti = s.p.src === 'anti';
      const phiDeg = frac1(nl + (anti ? 0.5 : 0)) * 360;
      const v = verdictRipple(nl, anti);
      return [
        ['S₁P =', r1.toFixed(2) + ' cm'],
        ['S₂P =', r2.toFixed(2) + ' cm'],
        ['path difference =', dl.toFixed(2) + ' cm = ' + nl.toFixed(2) + 'λ', true],
        ['phase difference at P =', (phiDeg > 359.5 ? 0 : phiDeg).toFixed(0) + '°'],
        ['', v.long, true]
      ];
    },
    pointer: {
      cursor: 'crosshair',
      down(s, pt) { s.state.drag = true; setProbe(s, pt); },
      move(s, pt) { if (pt.down && s.state.drag) setProbe(s, pt); },
      up(s) { s.state.drag = false; }
    }
  });
  function setProbe(s, pt) {
    const st = s.state;
    if (!st.ppc) return;
    st.P = [Sim.clamp(pt.x, 6, s.w - 6) / st.ppc, Sim.clamp(pt.y, 6, s.h - 6) / st.ppc];
  }
  function verdictRipple(nl, anti) {
    const f = frac1(nl + (anti ? 0.5 : 0));
    if (f < 0.08 || f > 0.92) return { short: 'maximum', long: 'waves arrive in phase: constructive interference (maximum)', col: C.navy };
    if (Math.abs(f - 0.5) < 0.08) return { short: 'minimum', long: 'waves arrive in antiphase: destructive interference (minimum)', col: C.red };
    return { short: 'in between', long: 'neither a maximum nor a minimum', col: C.ink };
  }

  /* ======================================================================
     4. A stationary wave from two waves travelling in opposite directions
     ====================================================================== */
  Sim.create('#sim-standing', {
    title: 'Two travelling waves make a stationary wave',
    height: (w) => (w >= 640 ? 430 : 470),
    controls: [
      { key: 'speed', label: 'Speed (slow motion)', min: 0.1, max: 1, step: 0.05, value: 0.5, unit: '×', format: (v) => v.toFixed(2) },
      { key: 'comp', type: 'check', label: 'Overlay the two waves on the resultant', value: false },
      { key: 'env', type: 'check', label: 'Envelope', value: true },
      { key: 'snap', type: 'check', label: 'Snapshots every T/8', value: false },
      { key: 'dots', type: 'check', label: 'Particles', value: true }
    ],
    animate: true,
    init(s) { s.state = { t: 0 }; },
    update(s, dt) { s.state.t += dt * s.p.speed; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const t = s.state.t;
      const TP = 2.0, om = (TAU * t) / TP, k = TAU;
      const y1 = (x) => Math.sin(k * x - om);
      const y2 = (x) => Math.sin(k * x + om);
      const left = 46, right = 20, top = 32, gap = 58, bottom = 26;
      const avail = h - top - gap - bottom;
      const h1 = Math.round(avail * 0.4), h2 = avail - h1;
      const wide = w >= 640;
      const g1 = Sim.graph(ctx, { x: left, y: top, w: w - left - right, h: h1, xmin: 0, xmax: wide ? 2.14 : 2.26, ymin: -1.5, ymax: 1.5, xstep: 0.5, ystep: 1, xlabel: 'x / λ', ylabel: 'y / A', title: wide ? 'two progressive waves travelling in opposite directions' : 'two waves travelling opposite ways' }).axes();
      const g2 = Sim.graph(ctx, { x: left, y: top + h1 + gap, w: w - left - right, h: h2, xmin: 0, xmax: wide ? 2.14 : 2.26, ymin: -3, ymax: 3, xstep: 0.5, ystep: 1, xlabel: 'x / λ', ylabel: 'y / A', title: 'their superposition: a stationary wave' }).axes();
      g1.plot(y1, { color: C.red, width: 2.5, to: 2 });
      g1.plot(y2, { color: C.blue, width: 2.5, to: 2 });
      // mark one crest of each wave so you can see them travel
      for (let m = -3; m <= 3; m++) {
        const xr = (Math.PI / 2 + om) / k + m, xl = (Math.PI / 2 - om) / k + m;
        if (xr >= 0 && xr <= 2) g1.dot(xr, 1, { color: C.red, r: 5 });
        if (xl >= 0 && xl <= 2) g1.dot(xl, 1, { color: C.blue, r: 5 });
      }
      Sim.text(ctx, 'wave 1 →', g1.x + 8, g1.y + g1.h - 9, { size: 12.5, bold: true, color: C.red });
      Sim.text(ctx, '← wave 2', g1.x + g1.w - 8, g1.y + g1.h - 9, { size: 12.5, bold: true, color: C.blue, align: 'right' });

      const res = (x) => 2 * Math.sin(k * x) * Math.cos(om);
      for (let j = 0; j <= 4; j++) g2.vline(j / 2, { color: 'rgba(47,158,68,0.35)', dash: [2, 4], width: 1 });
      if (p.env) {
        g2.plot((x) => 2 * Math.abs(Math.sin(k * x)), { color: C.grey, width: 1.5, dash: [6, 4], to: 2 });
        g2.plot((x) => -2 * Math.abs(Math.sin(k * x)), { color: C.grey, width: 1.5, dash: [6, 4], to: 2 });
      }
      if (p.snap) {
        const cols = ['#4dabf7', '#748ffc', '#9775fa', '#da77f2', '#f783ac'];
        for (let j = 0; j <= 4; j++) {
          const c = Math.cos((j * Math.PI) / 4);
          g2.plot((x) => 2 * Math.sin(k * x) * c, { color: cols[j], width: 1.6, to: 2 });
        }
      }
      if (p.comp) {
        g2.plot(y1, { color: C.red, width: 1.3, to: 2 });
        g2.plot(y2, { color: C.blue, width: 1.3, to: 2 });
      }
      g2.plot(res, { color: C.navy, width: 3, to: 2 });
      if (p.dots) {
        for (let i = 0; i <= 40; i++) {
          const x = i * 0.05, sk = Math.sin(k * x);
          const col = Math.abs(sk) < 1e-6 ? C.green : sk > 0 ? C.red : C.blue;
          g2.dot(x, res(x), { color: col, r: 4, stroke: '#fff' });
        }
      }
      for (let j = 0; j <= 4; j++) {
        const X = g2.px(j / 2);
        Sim.circle(ctx, X, g2.py(0), 5, { fill: C.green, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, 'N', Math.max(X, g2.x + 8), g2.py(-2) + 16, { size: 13, bold: true, color: C.green, align: 'center' });
      }
      for (let j = 0; j < 4; j++) Sim.text(ctx, 'A', g2.px(j / 2 + 0.25), g2.py(2) - 14, { size: 13, bold: true, color: C.red, align: 'center' });
    },
    readout(s) {
      const TP = 2.0;
      const ft = (s.state.t % TP) / TP;
      return [
        ['t =', ft.toFixed(2) + ' T'],
        ['node to node =', 'λ/2'],
        ['node to next antinode =', 'λ/4'],
        ['antinode amplitude =', '2A'],
        ['within one loop:', 'all in phase'],
        ['adjacent loops:', 'antiphase', true]
      ];
    }
  });

  /* ======================================================================
     5. Core practical 5 — the vibrating string (sonometer)
     ====================================================================== */
  const WIRES = {
    nylon: { mu: 2.3e-4, label: 'Nylon line, 0.50 mm' },
    steel3: { mu: 5.5e-4, label: 'Steel wire, 0.30 mm' },
    copper: { mu: 1.1e-3, label: 'Copper wire, 0.40 mm' },
    steel6: { mu: 2.2e-3, label: 'Steel wire, 0.60 mm' }
  };
  const ETA = 0.025, A0 = 2.6, NPTS = 121, F_MIN = 5, F_MAX = 600, RES_TOL = 0.04;
  const PLOTS = {
    L: { xmax: 3.5, xlabel: '1/L / m⁻¹', title: 'f₁ against 1/L  (T and μ kept constant)', x: (r) => 1 / r.L },
    T: { xmax: 3.2, xlabel: '√T / √N', title: 'f₁ against √T  (L and μ kept constant)', x: (r) => Math.sqrt(r.T) },
    mu: { xmax: 70, xlabel: '1/√μ  (μ in kg m⁻¹)', title: 'f₁ against 1/√μ  (L and T kept constant)', x: (r) => 1 / Math.sqrt(r.mu) }
  };
  function strPhys(p) {
    const mu = WIRES[p.wire] ? WIRES[p.wire].mu : 5.5e-4;
    const T = p.m * G;
    const v = Math.sqrt(T / mu);
    const f1 = v / (2 * Math.max(0.01, p.L));
    const n = Math.max(1, Math.round(p.f / f1));
    const res = Math.abs(p.f - n * f1) < RES_TOL * f1;
    return { mu, T, v, f1, n, res };
  }
  /* Steady-state shape of a lightly damped string driven at x = 0 and fixed at x = L:
     Y(x) = A0 sin k(L − x) / sin kL with a slightly complex wavenumber k. */
  function stringShape(st, p) {
    const key = [p.L, p.m, p.wire, p.f].join('|');
    if (st.shapeKey === key) return st.shape;
    const { v } = strPhys(p);
    const L = Math.max(0.01, p.L);
    const kr = (TAU * p.f) / v, ki = (ETA * Math.PI) / L;
    const aD = kr * L, bD = -ki * L;
    const Dr = Math.sin(aD) * Math.cosh(bD), Di = Math.cos(aD) * Math.sinh(bD);
    const D2 = Math.max(Dr * Dr + Di * Di, 1e-12);
    const re = new Float32Array(NPTS), im = new Float32Array(NPTS), amp = new Float32Array(NPTS);
    let max = 0;
    for (let i = 0; i < NPTS; i++) {
      const x = (L * i) / (NPTS - 1);
      const a = kr * (L - x), b = -ki * (L - x);
      const Nr = Math.sin(a) * Math.cosh(b), Ni = Math.cos(a) * Math.sinh(b);
      re[i] = (A0 * (Nr * Dr + Ni * Di)) / D2;
      im[i] = (A0 * (Ni * Dr - Nr * Di)) / D2;
      amp[i] = Math.hypot(re[i], im[i]);
      if (amp[i] > max) max = amp[i];
    }
    st.shapeKey = key;
    st.shape = { re, im, amp, max };
    return st.shape;
  }
  function fairTest(data, mode) {
    if (data.length < 2) return true;
    const same = (k) => data.every((r) => Math.abs(r[k] - data[0][k]) <= 1e-9 * Math.max(1, Math.abs(data[0][k])));
    if (mode === 'L') return same('T') && same('mu');
    if (mode === 'T') return same('L') && same('mu');
    return same('L') && same('T');
  }
  function tune(s, n) {
    const ph = strPhys(s.p);
    const target = n * ph.f1 * (1 + 0.005 * gaussian());
    if (target > F_MAX) { s.state.msg = 'Harmonic ' + n + ' would be above ' + F_MAX + ' Hz'; return; }
    s.set('f', Math.round(Sim.clamp(target, F_MIN, F_MAX) * 10) / 10);
    s.state.msg = '';
  }
  function record(s) {
    const p = s.p, ph = strPhys(p);
    if (!ph.res) { s.state.msg = 'Not at resonance: change f until the loops are as big as possible'; return; }
    const f1m = p.f / ph.n;
    s.state.data.push({ L: p.L, T: ph.T, mu: ph.mu, f1: f1m, n: ph.n });
    s.state.msg = 'Recorded f₁ = ' + f1m.toFixed(1) + ' Hz' + (ph.n > 1 ? ' (f ÷ ' + ph.n + ')' : '');
  }

  Sim.create('#sim-string', {
    title: 'Virtual experiment: the vibrating string',
    height: (w) => (w >= 640 ? 470 : 500),
    controls: [
      { key: 'L', label: 'Vibrating length L', min: 0.3, max: 1.2, step: 0.01, value: 0.8, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'm', label: 'Hanging mass m', min: 0.1, max: 1.0, step: 0.05, value: 0.5, unit: 'kg', format: (v) => v.toFixed(2) },
      { key: 'f', label: 'Driving frequency f', min: F_MIN, max: F_MAX, step: 0.1, value: 59.0, unit: 'Hz', format: (v) => v.toFixed(1) },
      { key: 'wire', type: 'select', label: 'Wire', value: 'steel3', options: Object.keys(WIRES).map((k) => [k, WIRES[k].label]) },
      { key: 'plot', type: 'select', label: 'Plot', value: 'L', options: [['L', 'f₁ against 1/L'], ['T', 'f₁ against √T'], ['mu', 'f₁ against 1/√μ']] },
      { type: 'button', label: 'Tune to f₁', onClick: (s) => tune(s, 1) },
      { type: 'button', label: 'Next harmonic', onClick: (s) => { const ph = strPhys(s.p); tune(s, ph.res ? ph.n + 1 : Math.max(1, Math.ceil(s.p.f / ph.f1))); } },
      { type: 'button', label: 'Record reading', onClick: (s) => record(s) },
      { type: 'button', label: 'Clear readings', ghost: true, onClick: (s) => { s.state.data = []; s.state.msg = ''; } }
    ],
    animate: true,
    resetButton: false,
    onChange(s, key) { if (key !== 'plot') s.state.msg = ''; },
    init(s) { s.state = { t: 0, data: [], msg: '' }; },
    update(s, dt) { s.state.t += dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const ph = strPhys(p);
      const shape = stringShape(st, p);
      const y0 = 106, xA = 66, xPul = w - 36;
      const scale = (xPul - 30 - xA) / 1.2;
      const xB = xA + p.L * scale;
      // signal generator
      Sim.rect(ctx, 8, 8, 116, 42, { fill: '#212529', r: 6 });
      Sim.text(ctx, 'signal generator', 16, 20, { size: 11, color: '#adb5bd' });
      Sim.text(ctx, p.f.toFixed(1) + ' Hz', 16, 38, { size: 15, bold: true, color: '#69db7c' });
      Sim.line(ctx, 30, 50, 30, y0 - 8, { color: '#495057', width: 2 });
      // vibration generator
      Sim.rect(ctx, xA - 40, y0 - 8, 34, 46, { fill: '#495057', r: 4 });
      Sim.rect(ctx, xA - 8, y0 - 2, 8, 4, { fill: '#adb5bd' });
      Sim.text(ctx, 'vibrator', xA - 23, y0 + 50, { size: 11, color: C.muted, align: 'center' });
      // fixed string from bridge to pulley, pulley and mass
      Sim.line(ctx, xB, y0, xPul, y0, { color: C.navy, width: 2 });
      Sim.circle(ctx, xPul, y0 + 9, 9, { fill: '#dee2e6', stroke: '#868e96', width: 2 });
      Sim.circle(ctx, xPul, y0 + 9, 2.5, { fill: '#868e96' });
      const mx = xPul + 9, mTop = y0 + 34, mh = 12 + 30 * p.m;
      Sim.line(ctx, mx, y0 + 9, mx, mTop, { color: C.navy, width: 2 });
      Sim.rect(ctx, mx - 11, mTop, 22, mh, { fill: '#868e96', stroke: '#495057', width: 1.5, r: 2 });
      Sim.text(ctx, 'T = mg = ' + Sim.fmt(ph.T, 3) + ' N', mx - 18, mTop + mh / 2, { size: 12, color: C.ink, align: 'right', bold: true, bg: 'rgba(255,255,255,0.9)' });
      // bridge
      Sim.polyline(ctx, [[xB, y0], [xB - 9, y0 + 24], [xB + 9, y0 + 24]], { close: true, fill: '#adb5bd', color: '#868e96', width: 1.5 });
      // vibrating section
      const Ymax = 54;
      const sc = shape.max > Ymax ? Ymax / shape.max : 1;
      const th = TAU * 1.0 * st.t;
      const co = Math.cos(th), si = Math.sin(th);
      const top = [], bot = [], cur = [];
      for (let i = 0; i < NPTS; i++) {
        const x = xA + ((xB - xA) * i) / (NPTS - 1);
        const a = shape.amp[i] * sc;
        top.push([x, y0 - a]); bot.push([x, y0 + a]);
        cur.push([x, y0 - (shape.re[i] * co - shape.im[i] * si) * sc]);
      }
      Sim.polyline(ctx, top.concat(bot.reverse()), { close: true, fill: 'rgba(0,123,255,0.12)', color: 'rgba(0,123,255,0.25)', width: 1 });
      Sim.polyline(ctx, cur, { color: C.navy, width: 2.5 });
      if (ph.res) {
        for (let j = 0; j <= ph.n; j++) Sim.circle(ctx, xA + ((xB - xA) * j) / ph.n, y0, 4, { fill: C.green, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, 'resonance: n = ' + ph.n + (ph.n === 1 ? ' (1 loop)' : ' (' + ph.n + ' loops)'), w - 10, 18, { size: 13, bold: true, color: C.green, align: 'right' });
      } else {
        Sim.text(ctx, 'not resonating', w - 10, 18, { size: 13, bold: true, color: C.muted, align: 'right' });
      }
      Sim.text(ctx, 'motion slowed down', w - 10, 36, { size: 11, color: C.muted, align: 'right', italic: true });
      // length marker
      const ly = y0 + 70;
      Sim.arrow(ctx, (xA + xB) / 2, ly, xA, ly, { color: C.green, width: 1.5, head: 7 });
      Sim.arrow(ctx, (xA + xB) / 2, ly, xB, ly, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, 'L = ' + p.L.toFixed(2) + ' m', (xA + xB) / 2, ly, { size: 12.5, bold: true, color: C.green, align: 'center', bg: 'rgba(255,255,255,0.95)' });

      // results graph
      const cfg = PLOTS[p.plot] || PLOTS.L;
      const pts = st.data.map((r) => [cfg.x(r), r.f1]);
      let ytop = ph.f1;
      pts.forEach((q) => { ytop = Math.max(ytop, q[1]); });
      const gy = 232;
      const gr = Sim.graph(ctx, { x: 58, y: gy, w: w - 58 - 22, h: h - gy - 30, xmin: 0, xmax: cfg.xmax, ymin: 0, ymax: niceCeil(ytop * 1.15), xlabel: cfg.xlabel, ylabel: 'f₁ / Hz', title: w >= 640 ? cfg.title : cfg.title.replace(/\s+\(.*\)$/, '') }).axes();
      const fit = pts.length >= 2 ? fitLine(pts) : null;
      if (fit) gr.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q) => gr.dot(Math.min(q[0], cfg.xmax), q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Find a resonance, then press “Record reading”', gr.x + gr.w / 2, gr.y + gr.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const p = s.p, st = s.state;
      const ph = strPhys(p);
      const out = [
        ['T = mg =', Sim.fmt(ph.T, 3) + ' N'],
        ['μ =', sci(ph.mu) + ' kg m⁻¹'],
        ['v = √(T/μ) =', Sim.fmt(ph.v, 3) + ' m s⁻¹'],
        ['f₁ = v/2L =', Sim.fmt(ph.f1, 3) + ' Hz']
      ];
      if (ph.res) out.push(['resonating at n = ' + ph.n + ':', 'λ = 2L/n = ' + Sim.fmt((2 * p.L) / ph.n, 3) + ' m', true]);
      else out.push(['f/f₁ =', (p.f / ph.f1).toFixed(2) + ' (not a whole number)']);
      out.push(['readings:', String(st.data.length)]);
      const cfg = PLOTS[p.plot] || PLOTS.L;
      const pts = st.data.map((r) => [cfg.x(r), r.f1]);
      const fit = pts.length >= 3 ? fitLine(pts) : null;
      if (fit) {
        const d0 = st.data[0];
        if (p.plot === 'L') {
          out.push(['gradient = v/2 =', Sim.fmt(fit.m, 3) + ' Hz m']);
          out.push(['v = 2 × gradient =', Sim.fmt(2 * fit.m, 3) + ' m s⁻¹', true]);
          out.push(['μ = T/v² =', sci(d0.T / Math.max(1e-9, 4 * fit.m * fit.m)) + ' kg m⁻¹']);
        } else if (p.plot === 'T') {
          out.push(['gradient = 1/(2L√μ) =', Sim.fmt(fit.m, 3)]);
          out.push(['μ = 1/(4L² × gradient²) =', sci(1 / Math.max(1e-12, 4 * d0.L * d0.L * fit.m * fit.m)) + ' kg m⁻¹', true]);
        } else {
          out.push(['gradient = √T/(2L) =', Sim.fmt(fit.m, 3)]);
          out.push(['T = (2L × gradient)² =', Sim.fmt(Math.pow(2 * d0.L * fit.m, 2), 3) + ' N', true]);
        }
        out.push(['intercept =', Sim.fmt(fit.c, 2) + ' Hz']);
        if (!fairTest(st.data, p.plot)) out.push(['⚠', 'a control variable changed between readings: not a fair test']);
      } else if (pts.length) out.push(['take at least 3 readings', 'to fit a line']);
      if (st.msg) out.push(['', st.msg]);
      return out;
    }
  });
})();
