/* Capacitors — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const INK = C.ink;

  /* ---------- helpers ---------- */
  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const m = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / m;
    const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (const k of steps) if (n <= k + 1e-9) return k * m;
    return 10 * m;
  }
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
  /* current in mA, shown as 0 when negligible */
  function fmtI(amps) {
    const mA = amps * 1e3;
    if (Math.abs(mA) < 5e-4) return '0';
    return Sim.fmt(mA, 3);
  }

  /* ---------- circuit symbols ---------- */
  function wire(ctx, pts, o) { Sim.polyline(ctx, pts, Object.assign({ color: INK, width: 2 }, o || {})); }
  function resistorV(ctx, x, y1, y2) {
    const mid = (y1 + y2) / 2, half = Math.min(18, (y2 - y1) / 2 - 4);
    Sim.line(ctx, x, y1, x, mid - half, { color: INK, width: 2 });
    Sim.line(ctx, x, mid + half, x, y2, { color: INK, width: 2 });
    Sim.rect(ctx, x - 8, mid - half, 16, 2 * half, { fill: '#fff', stroke: INK, width: 2 });
  }
  function capacitorV(ctx, x, y1, y2) {
    const mid = (y1 + y2) / 2, gap = 9;
    Sim.line(ctx, x, y1, x, mid - gap / 2, { color: INK, width: 2 });
    Sim.line(ctx, x, mid + gap / 2, x, y2, { color: INK, width: 2 });
    Sim.line(ctx, x - 20, mid - gap / 2, x + 20, mid - gap / 2, { color: INK, width: 3.5, cap: 'butt' });
    Sim.line(ctx, x - 20, mid + gap / 2, x + 20, mid + gap / 2, { color: INK, width: 3.5, cap: 'butt' });
    return { top: mid - gap / 2, bot: mid + gap / 2 };
  }
  function cellV(ctx, x, y1, y2) {
    const mid = (y1 + y2) / 2;
    Sim.line(ctx, x, y1, x, mid - 5, { color: INK, width: 2 });
    Sim.line(ctx, x, mid + 5, x, y2, { color: INK, width: 2 });
    Sim.line(ctx, x - 15, mid - 5, x + 15, mid - 5, { color: INK, width: 2.5, cap: 'butt' });
    Sim.line(ctx, x - 8, mid + 5, x + 8, mid + 5, { color: INK, width: 5, cap: 'butt' });
    return mid;
  }
  function contact(ctx, x, y) { Sim.circle(ctx, x, y, 4, { fill: '#fff', stroke: INK, width: 2 }); }
  /* small dots that drift along a polyline to show current */
  function flowDots(ctx, pts, phase, color) {
    const spacing = 22;
    let acc = 0;
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segs.push([pts[i - 1], pts[i], acc, L]);
      acc += L;
    }
    const off = ((phase % spacing) + spacing) % spacing;
    for (let d = off; d < acc; d += spacing) {
      const sg = segs.find((q) => d >= q[2] && d <= q[2] + q[3]);
      if (!sg || sg[3] < 1e-6) continue;
      const f = (d - sg[2]) / sg[3];
      Sim.circle(ctx, sg[0][0] + (sg[1][0] - sg[0][0]) * f, sg[0][1] + (sg[1][1] - sg[0][1]) * f, 3, { fill: color });
    }
  }

  /* ======================================================================
     1. Energy stored = area under the V–Q graph
     ====================================================================== */
  function drawPlates(ctx, box, k, n, V, Q) {
    const cx = box.x + box.w / 2;
    const top = box.y + 80, bot = box.y + box.h - (box.h > 300 ? 120 : 62);
    const gap = 70;
    const xl = cx - gap / 2, xr = cx + gap / 2;
    Sim.rect(ctx, xl, top, gap, bot - top, { fill: '#fff4e6' });
    Sim.rect(ctx, xl - 10, top, 10, bot - top, { fill: C.navy });
    Sim.rect(ctx, xr, top, 10, bot - top, { fill: C.navy });
    const m = n > 0 ? Math.round((10 * k) / n) : 0;
    for (let i = 0; i < m; i++) {
      const y = top + ((i + 0.5) * (bot - top)) / 10;
      Sim.text(ctx, '+', xl + 7, y, { size: 14, bold: true, color: C.red, align: 'center' });
      Sim.text(ctx, '−', xr - 7, y, { size: 16, bold: true, color: C.blue, align: 'center' });
    }
    // field arrows, more of them as V grows
    const nf = Math.round(m / 3);
    for (let i = 0; i < nf; i++) {
      const y = top + ((i + 0.5) * (bot - top)) / nf;
      Sim.arrow(ctx, xl + 16, y, xr - 16, y, { color: C.orange, width: 1.5, head: 7 });
    }
    Sim.text(ctx, '+Q', xl - 5, top - 14, { size: 14, bold: true, color: C.red, align: 'center' });
    Sim.text(ctx, '−Q', xr + 5, top - 14, { size: 14, bold: true, color: C.blue, align: 'center' });
    // "work moving ΔQ" arrow over the top
    if (k < n) {
      ctx.save();
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xr + 14, top - 26);
      ctx.quadraticCurveTo(cx, top - 58, xl - 14, top - 26);
      ctx.stroke();
      ctx.restore();
      Sim.arrow(ctx, xl - 4, top - 34, xl - 14, top - 26, { color: C.orange, width: 2, head: 9 });
      Sim.text(ctx, 'next ΔQ', cx, top - 50, { size: 12, color: '#b35c00', bold: true, align: 'center', bg: 'rgba(255,255,255,0.85)' });
    }
    const ty = bot + (box.h > 300 ? 30 : 22);
    Sim.text(ctx, 'Q = ' + Sim.fmt(Q * 1e3, 3) + ' mC', cx, ty, { size: 14, bold: true, color: C.navy, align: 'center' });
    Sim.text(ctx, 'V = ' + V.toFixed(2) + ' V', cx, ty + 20, { size: 14, bold: true, color: C.navy, align: 'center' });
    if (box.h > 300) Sim.text(ctx, 'packets added: ' + k + ' of ' + n, cx, ty + 42, { size: 12, color: C.muted, align: 'center' });
  }

  Sim.create('#sim-vq', {
    title: 'Energy stored = area under the V–Q graph',
    height: (w) => (w >= 640 ? 390 : 620),
    controls: [
      { key: 'C', label: 'Capacitance C', min: 100, max: 1000, step: 10, value: 470, unit: 'μF', format: (v) => v.toFixed(0), onChange: (s) => { s.state.k = Math.round(s.p.n); } },
      { key: 'V', label: 'Battery p.d. V', min: 2, max: 12, step: 0.5, value: 9, unit: 'V', format: (v) => v.toFixed(1), onChange: (s) => { s.state.k = Math.round(s.p.n); } },
      { key: 'n', label: 'Number of charge packets', min: 3, max: 40, step: 1, value: 6, format: (v) => v.toFixed(0), onChange: (s) => { s.state.k = Math.round(s.p.n); } },
      { type: 'button', label: 'Add one packet ΔQ', onClick: (s) => { if (s.state.k < Math.round(s.p.n)) s.state.k++; } },
      { type: 'button', label: 'Empty', ghost: true, onClick: (s) => { s.state.k = 0; } },
      { type: 'button', label: 'Fill', ghost: true, onClick: (s) => { s.state.k = Math.round(s.p.n); } }
    ],
    init(s) { s.state = { k: Math.round(s.p.n) }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const n = Math.round(p.n);
      const k = Math.min(s.state.k, n);
      const Cf = p.C * 1e-6;
      const dQ = (Cf * p.V) / n;
      const Q = k * dQ, V = Q / Cf;
      const wide = w >= 640;
      const pic = wide ? { x: 0, y: 0, w: 230, h } : { x: 0, y: 0, w, h: 240 };
      drawPlates(ctx, pic, k, n, V, Q);
      const gb = wide ? { x: 230 + 46, y: 36, w: w - 230 - 46 - 22, h: h - 36 - 34 } : { x: 46, y: 240 + 36, w: w - 46 - 18, h: h - 240 - 36 - 34 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 12, ymin: 0, ymax: 13, xlabel: 'Q / mC', ylabel: 'V / V', title: 'p.d. against charge' }, gb)).axes();
      const y0 = g.py(0);
      for (let j = 0; j < k; j++) {
        const x0 = g.px(j * dQ * 1e3), x1 = g.px((j + 1) * dQ * 1e3);
        const vj = (j * dQ) / Cf, vj1 = ((j + 1) * dQ) / Cf;
        const yy = g.py(vj);
        if (y0 - yy > 0.5) Sim.rect(ctx, x0, yy, x1 - x0, y0 - yy, { fill: j === k - 1 ? 'rgba(240,140,0,0.6)' : 'rgba(0,123,255,0.33)', stroke: '#fff', width: x1 - x0 > 6 ? 1 : 0.3 });
        Sim.polyline(ctx, [[x0, yy], [x1, yy], [x1, g.py(vj1)]], { close: true, color: 'rgba(224,49,49,0.55)', width: 1, fill: 'rgba(224,49,49,0.14)' });
      }
      // the full line for this capacitor and battery
      g.plot((q) => (q * 1e-3) / Cf, { from: 0, to: Cf * p.V * 1e3, color: C.navy, width: 2.5 });
      g.plot((q) => (q * 1e-3) / Cf, { from: Cf * p.V * 1e3, to: 12, color: C.navy, width: 1.2, dash: [4, 5] });
      if (k > 0) {
        const last = k - 1;
        const xm = g.px((last + 0.5) * dQ * 1e3);
        const vtop = (last * dQ) / Cf;
        if (g.px(dQ * 1e3) - g.px(0) > 28 && y0 - g.py(vtop) > 22) {
          Sim.text(ctx, 'VΔQ', xm, (y0 + g.py(vtop)) / 2, { size: 12, bold: true, color: '#8a4a00', align: 'center' });
        }
        g.dot(Q * 1e3, V, { color: C.navy, r: 5 });
      }
      const Wstrips = (dQ * dQ * (k * (k - 1))) / 2 / Cf;
      const Wtri = 0.5 * Q * V;
      const bx = gb.x + gb.w - 8;
      Sim.text(ctx, 'sum of strips = ' + Sim.fmt(Wstrips * 1e3, 3) + ' mJ', bx, gb.y + 14, { size: 12.5, color: C.blue, bold: true, align: 'right', bg: 'rgba(255,255,255,0.9)' });
      Sim.text(ctx, 'triangle ½QV = ' + Sim.fmt(Wtri * 1e3, 3) + ' mJ', bx, gb.y + 36, { size: 12.5, color: C.navy, bold: true, align: 'right', bg: 'rgba(255,255,255,0.9)' });
    },
    readout(s) {
      const p = s.p, n = Math.round(p.n), k = Math.min(s.state.k, n);
      const Cf = p.C * 1e-6, dQ = (Cf * p.V) / n, Q = k * dQ, V = Q / Cf;
      const Wstrips = (dQ * dQ * (k * (k - 1))) / 2 / Cf;
      const Wtri = 0.5 * Q * V;
      const out = [
        ['ΔQ per packet =', Sim.fmt(dQ * 1e3, 3) + ' mC'],
        ['Q =', Sim.fmt(Q * 1e3, 3) + ' mC'],
        ['V = Q/C =', V.toFixed(2) + ' V'],
        ['sum of strips =', Sim.fmt(Wstrips * 1e3, 3) + ' mJ'],
        ['W = ½QV =', Sim.fmt(Wtri * 1e3, 3) + ' mJ', true]
      ];
      if (k > 1) out.push(['strips capture', ((100 * (k - 1)) / k).toFixed(1) + '% of the area']);
      return out;
    }
  });

  /* ======================================================================
     2. RC circuit: charging and discharging
     ====================================================================== */
  const T_WIN = 60, RC_SPEED = 3;
  function rcCurrent(p, Q, mode) {
    const Cf = p.C * 1e-6, R = p.R * 1e3;
    const Vc = Q / Cf;
    return mode === 'charge' ? (p.V - Vc) / R : -Vc / R;
  }
  function rcRecord(s) {
    const st = s.state, p = s.p;
    st.rec.push([st.t, st.Q, rcCurrent(p, st.Q, st.mode), st.Q / (p.C * 1e-6)]);
  }
  function rcFlip(s) {
    const st = s.state;
    if (st.done) { st.t = 0; st.rec = []; st.done = false; }
    st.mode = st.mode === 'charge' ? 'discharge' : 'charge';
    st.seg = { t: st.t, Q: st.Q };
    rcRecord(s);
    if (!s.running) s.play();
  }
  function drawRCCircuit(ctx, x0, y0, bw, bh, st, p, I) {
    const T = y0 + 44, B = y0 + bh - 18;
    const L = x0 + 74, Rx = x0 + bw - 96, Px = Rx - 44, Kx = Px - 50, Bx = L + 36;
    const Ay = T - 17, By = T + 17;
    const charging = st.mode === 'charge';
    const mid = (T + B) / 2;
    // battery branch
    wire(ctx, [[Kx, Ay], [L, Ay]]);
    const cm = cellV(ctx, L, Ay, B);
    Sim.text(ctx, 'V₀ =', L - 20, cm - 9, { size: 12.5, color: INK, align: 'right', bold: true });
    Sim.text(ctx, p.V.toFixed(1) + ' V', L - 20, cm + 9, { size: 12.5, color: INK, align: 'right', bold: true });
    // contact B branch
    wire(ctx, [[Kx, By], [Bx, By], [Bx, B]]);
    // bottom wire
    wire(ctx, [[L, B], [Rx, B]]);
    // pivot to R–C branch
    wire(ctx, [[Px, T], [Rx, T]]);
    resistorV(ctx, Rx, T, mid);
    const cap = capacitorV(ctx, Rx, mid, B);
    // switch blade
    const tip = charging ? [Kx, Ay] : [Kx, By];
    Sim.line(ctx, Px, T, tip[0] + 3, tip[1] + (charging ? 1 : -1), { color: C.navy, width: 3.5 });
    Sim.circle(ctx, Px, T, 4.5, { fill: C.navy });
    contact(ctx, Kx, Ay);
    contact(ctx, Kx, By);
    Sim.text(ctx, 'A: charge', Kx + 4, Ay - 15, { size: 12, color: charging ? C.green : C.muted, bold: charging, align: 'center' });
    Sim.text(ctx, 'B: discharge', Kx + 4, By + 15, { size: 12, color: !charging ? C.red : C.muted, bold: !charging, align: 'center' });
    Sim.text(ctx, 'R = ' + p.R.toFixed(1) + ' kΩ', Rx + 16, (T + mid) / 2, { size: 12.5, color: INK, bold: true });
    Sim.text(ctx, 'C = ' + p.C.toFixed(0) + ' μF', Rx + 25, (mid + B) / 2, { size: 12, color: INK, bold: true });
    // charges on the plates
    const Vc = st.Q / (p.C * 1e-6);
    const m = Math.min(5, Math.round((5 * Vc) / 12 + 0.2 * (Vc > 0.05)));
    for (let i = 0; i < m; i++) {
      const x = Rx - 16 + (i * 32) / 4;
      Sim.text(ctx, '+', x, cap.top - 8, { size: 12, bold: true, color: C.red, align: 'center' });
      Sim.text(ctx, '−', x, cap.bot + 9, { size: 13, bold: true, color: C.blue, align: 'center' });
    }
    // current arrow beside the resistor
    const Imax = p.V / (p.R * 1e3);
    const frac = Imax > 0 ? Sim.clamp(Math.abs(I) / Imax, 0, 1) : 0;
    const ax = Rx - 22, ay = (T + mid) / 2;
    if (frac > 0.02) {
      const len = 8 + 22 * frac;
      const dir = I > 0 ? 1 : -1;
      Sim.arrow(ctx, ax, ay - (dir * len) / 2, ax, ay + (dir * len) / 2, { color: C.red, width: 2.5, head: 8 });
      Sim.text(ctx, 'I', ax - 10, ay, { size: 13, bold: true, color: C.red, align: 'right' });
    }
    // drifting dots of conventional current
    if (frac > 0.02) {
      const col = 'rgba(224,49,49,0.75)';
      if (charging) {
        flowDots(ctx, [[L, cm - 6], [L, Ay], [Kx, Ay], [Px, T], [Rx, T], [Rx, cap.top - 2]], st.phase, col);
        flowDots(ctx, [[Rx, cap.bot + 2], [Rx, B], [L, B], [L, cm + 6]], st.phase, col);
      } else {
        flowDots(ctx, [[Rx, cap.top - 2], [Rx, T], [Px, T], [Kx, By], [Bx, By], [Bx, B], [Rx, B], [Rx, cap.bot + 2]], st.phase, col);
      }
    }
  }
  function drawBars(ctx, x, y, bw, compact, p, st, I) {
    const Cf = p.C * 1e-6, R = p.R * 1e3;
    const Vc = st.Q / Cf, VR = Math.abs(I) * R;
    const charging = st.mode === 'charge';
    const rowH = compact ? 20 : 30;
    const labW = compact ? 84 : 112;
    const sc = (bw - labW - 96) / 12;
    const rows = [
      [compact ? 'battery' : 'battery e.m.f.', charging ? p.V : 0, '#adb5bd', charging ? p.V.toFixed(1) + ' V' : 'switched out'],
      [compact ? 'V_C' : 'V_C (capacitor)', Vc, C.blue, Vc.toFixed(2) + ' V'],
      ['V_R = IR', VR, C.orange, VR.toFixed(2) + ' V']
    ];
    rows.forEach((r, i) => {
      const yy = y + i * rowH;
      Sim.text(ctx, r[0], x + labW - 8, yy + rowH / 2, { size: compact ? 11 : 12.5, color: INK, align: 'right' });
      Sim.rect(ctx, x + labW, yy + 4, 12 * sc, rowH - 8, { fill: '#f1f3f5', r: 3 });
      if (r[1] > 0.005) Sim.rect(ctx, x + labW, yy + 4, Math.min(12, r[1]) * sc, rowH - 8, { fill: r[2], r: 3 });
      Sim.text(ctx, r[3], x + labW + 12 * sc + 6, yy + rowH / 2, { size: compact ? 11 : 12.5, color: INK, bold: true });
    });
    if (!compact) {
      const W = 0.5 * Cf * Vc * Vc;
      const ty = y + 3 * rowH + 18;
      Sim.text(ctx, 'energy stored ½CV² = ' + Sim.fmt(W * 1e3, 3) + ' mJ', x + labW, ty, { size: 12.5, color: C.green, bold: true });
      const msg = charging
        ? 'V₀ = V_C + V_R: as V_C rises, V_R = IR must fall, so the current falls.'
        : 'Battery out: V_R = V_C, so I = V_C/R falls as the capacitor empties.';
      Sim.text(ctx, msg, x, ty + 26, { size: 12.5, color: C.muted, italic: true });
    }
  }

  Sim.create('#sim-rc', {
    title: 'RC circuit: charge and discharge',
    height: (w) => (w >= 720 ? 470 : 262 + 3 * 165),
    controls: [
      { key: 'R', label: 'Resistance R', min: 1, max: 10, step: 0.1, value: 4.7, unit: 'kΩ', format: (v) => v.toFixed(1), onChange: (s) => { s.state.seg = { t: s.state.t, Q: s.state.Q }; } },
      { key: 'C', label: 'Capacitance C', min: 100, max: 1000, step: 10, value: 1000, unit: 'μF', format: (v) => v.toFixed(0), onChange: (s) => { s.state.seg = { t: s.state.t, Q: s.state.Q }; } },
      { key: 'V', label: 'Battery e.m.f. V₀', min: 1, max: 12, step: 0.5, value: 6, unit: 'V', format: (v) => v.toFixed(1), onChange: (s) => { s.state.seg = { t: s.state.t, Q: s.state.Q }; } },
      { key: 'marks', type: 'check', label: 'Show time-constant markers', value: true },
      { type: 'button', label: 'Flip switch', onClick: (s) => rcFlip(s) }
    ],
    animate: true,
    init(s) {
      s.state = { t: 0, Q: 0, mode: 'charge', seg: { t: 0, Q: 0 }, rec: [], done: false, phase: 0 };
      rcRecord(s);
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (st.done || dt <= 0) return;
      const T = dt * RC_SPEED;
      const Cf = p.C * 1e-6, RC = p.R * 1e3 * Cf;
      const Qf = st.mode === 'charge' ? Cf * p.V : 0;
      st.Q = Qf + (st.Q - Qf) * Math.exp(-T / RC);
      st.t += T;
      const I = rcCurrent(p, st.Q, st.mode);
      st.phase += dt * 70 * Sim.clamp(Math.abs(I) / (p.V / (p.R * 1e3)), 0, 1);
      rcRecord(s);
      if (st.t >= T_WIN) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 720;
      const Cf = p.C * 1e-6, RC = p.R * 1e3 * Cf;
      const I = rcCurrent(p, st.Q, st.mode);
      const cw = 340;
      drawRCCircuit(ctx, wide ? 0 : Math.max(0, (w - cw) / 2), 0, cw, 196, st, p, I);
      if (wide) drawBars(ctx, 372, 26, w - 372 - 20, false, p, st, I);
      else drawBars(ctx, 4, 198, w - 8, true, p, st, I);

      /* graphs */
      const rec = st.rec;
      let qmax = Cf * p.V, vmax = p.V, imax = p.V / (p.R * 1e3);
      for (const r of rec) { qmax = Math.max(qmax, r[1]); vmax = Math.max(vmax, r[3]); imax = Math.max(imax, Math.abs(r[2])); }
      qmax = niceMax(qmax * 1e3 * 1.08); vmax = niceMax(vmax * 1.08); imax = niceMax(imax * 1e3 * 1.08);
      const boxes = [];
      if (wide) {
        const top = 236, gh = h - top - 30, left = 46, gap = 58;
        const gw = (w - left - 18 - 2 * gap) / 3;
        for (let i = 0; i < 3; i++) boxes.push({ x: left + i * (gw + gap), y: top, w: gw, h: gh });
      } else {
        const top = 262, rowH = (h - top) / 3, gw = w - 46 - 16;
        for (let i = 0; i < 3; i++) boxes.push({ x: 46, y: top + 22 + i * rowH, w: gw, h: rowH - 56 });
      }
      const gq = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_WIN, ymin: 0, ymax: qmax, xlabel: 't / s', ylabel: 'Q / mC', title: 'charge–time' }, boxes[0])).axes();
      const gvv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_WIN, ymin: 0, ymax: vmax, xlabel: 't / s', ylabel: 'V_C / V', title: 'p.d.–time' }, boxes[1])).axes();
      const gi = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_WIN, ymin: -imax, ymax: imax, xlabel: 't / s', ylabel: 'I / mA', title: 'current–time' }, boxes[2])).axes();

      // time-constant markers for the current segment
      if (p.marks) {
        const seg = st.seg;
        const Qf = st.mode === 'charge' ? Cf * p.V : 0;
        const tm = seg.t + RC, th = seg.t + RC * Math.LN2;
        if (Math.abs(seg.Q - Qf) > 0.03 * Cf * Math.max(p.V, 1) && tm < T_WIN) {
          const Qm = Qf + (seg.Q - Qf) / Math.E;
          const I0 = st.mode === 'charge' ? (p.V - seg.Q / Cf) / (p.R * 1e3) : -(seg.Q / Cf) / (p.R * 1e3);
          const levels = [[gq, Qm * 1e3], [gvv, Qm / Cf], [gi, (I0 / Math.E) * 1e3]];
          levels.forEach(([g, yv]) => {
            Sim.line(ctx, g.px(tm), g.py(0), g.px(tm), g.py(yv), { color: C.orange, width: 1.5, dash: [5, 4] });
            Sim.line(ctx, g.px(seg.t), g.py(yv), g.px(tm), g.py(yv), { color: C.orange, width: 1.5, dash: [5, 4] });
            g.dot(tm, yv, { color: C.orange, r: 4.5 });
          });
          const pct = st.mode === 'charge' ? '63% of the way' : '37% left';
          const lx = gq.px(tm) + 6;
          const right = lx + 135 > gq.x + gq.w;
          Sim.line(ctx, gq.px(tm), gq.py(Qm * 1e3), gq.px(tm), gq.y + 26, { color: 'rgba(240,140,0,0.45)', width: 1.2, dash: [3, 4] });
          Sim.text(ctx, 't = RC: ' + pct, right ? gq.px(tm) - 6 : lx, gq.y + 30, { size: 11.5, color: '#b35c00', bold: true, align: right ? 'right' : 'left', bg: 'rgba(255,255,255,0.85)' });
          if (th < T_WIN) {
            const Qh = (Qf + (seg.Q - Qf) / 2) * 1e3;
            gq.dot(th, Qh, { color: C.green, r: 4 });
            Sim.text(ctx, 't½: half way', gq.px(th) + 7, gq.py(Qh) + (st.mode === 'charge' ? 6 : -10), { size: 11.5, color: C.green, bold: true, align: 'left', bg: 'rgba(255,255,255,0.8)' });
          }
        }
      }
      gi.hline(0, { color: C.axis, dash: [1, 0], width: 1 });
      gq.path(rec.map((r) => [r[0], r[1] * 1e3]), { color: C.navy, width: 2.6 });
      gvv.path(rec.map((r) => [r[0], r[3]]), { color: C.blue, width: 2.6 });
      gi.path(rec.map((r) => [r[0], r[2] * 1e3]), { color: C.red, width: 2.6 });
      const last = rec[rec.length - 1];
      if (last) {
        gq.dot(last[0], last[1] * 1e3, { color: C.navy });
        gvv.dot(last[0], last[3], { color: C.blue });
        gi.dot(last[0], last[2] * 1e3, { color: C.red });
      }
      if (st.done) {
        Sim.text(ctx, 'Time window full: press Flip switch to carry on, or Reset', w / 2, boxes[0].y - 30, { size: 12.5, color: C.muted, italic: true, align: 'center', bg: 'rgba(255,255,255,0.9)' });
      }
    },
    readout(s) {
      const st = s.state, p = s.p;
      const Cf = p.C * 1e-6, RC = p.R * 1e3 * Cf;
      const I = rcCurrent(p, st.Q, st.mode);
      return [
        ['switch at', st.mode === 'charge' ? 'A (charging)' : 'B (discharging)'],
        ['t =', st.t.toFixed(1) + ' s'],
        ['Q =', Sim.fmt(st.Q * 1e3, 3) + ' mC'],
        ['V_C =', (st.Q / Cf).toFixed(2) + ' V'],
        ['I =', fmtI(I) + ' mA'],
        ['RC =', Sim.fmt(RC, 3) + ' s', true],
        ['t½ = 0.69RC =', Sim.fmt(RC * Math.LN2, 3) + ' s']
      ];
    }
  });

  /* ======================================================================
     3. Water-tank analogy
     ====================================================================== */
  const TANK_WIN = 20;
  Sim.create('#sim-tank', {
    title: 'Water-tank analogy for discharge',
    height: (w) => (w >= 700 ? 370 : 560),
    controls: [
      { key: 'R', label: 'Pipe narrowness (like R)', min: 0.5, max: 3, step: 0.1, value: 1.5, format: (v) => v.toFixed(1) },
      { key: 'A', label: 'Tank width (like C)', min: 0.5, max: 2, step: 0.1, value: 1.2, format: (v) => v.toFixed(1) },
      { key: 'half', type: 'check', label: 'Show half-lives', value: true },
      { key: 'tan', type: 'check', label: 'Show starting-rate tangent', value: true },
      { type: 'button', label: 'Refill and release', onClick: (s) => { s.reset(); s.play(); } }
    ],
    animate: true,
    init(s) {
      s.state = { t: 0, h: 1, rec: [[0, 1]], done: false };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state;
      if (st.done || dt <= 0) return;
      const tau = s.p.R * s.p.A;
      st.h *= Math.exp(-dt / tau);
      st.t += dt;
      st.rec.push([st.t, st.h]);
      if (st.t >= TANK_WIN || st.h < 0.004) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const tau = p.R * p.A;
      const wide = w >= 700;
      const sc = wide ? { x: 0, y: 0, w: 360, h } : { x: 0, y: 0, w, h: 250 };
      // tank
      const tankH = sc.h - (wide ? 130 : 110);
      const tankW = 50 + 70 * p.A;
      const tx = sc.x + (wide ? 40 : Math.max(16, sc.w / 2 - tankW / 2 - 70)), ty = sc.y + 40;
      const level = st.h * tankH;
      Sim.rect(ctx, tx, ty + tankH - level, tankW, level, { fill: 'rgba(77,171,247,0.55)' });
      Sim.line(ctx, tx, ty - 6, tx, ty + tankH, { color: C.axis, width: 3 });
      Sim.line(ctx, tx + tankW, ty - 6, tx + tankW, ty + tankH, { color: C.axis, width: 3 });
      Sim.line(ctx, tx, ty + tankH, tx + tankW, ty + tankH, { color: C.axis, width: 3 });
      // pipe out of the bottom right
      const pipeD = Sim.clamp(16 / p.R, 4, 22);
      const py = ty + tankH - pipeD / 2 - 3;
      const pipeL = 56;
      Sim.rect(ctx, tx + tankW, py - pipeD / 2, pipeL, pipeD, { fill: 'rgba(77,171,247,0.55)', stroke: C.axis, width: 2 });
      // outflow stream (flow = h / R)
      const flow = st.h / p.R;
      const streamW = Sim.clamp(flow * 9, 0, pipeD - 1);
      if (streamW > 0.4 && !st.done) {
        const sx = tx + tankW + pipeL;
        ctx.save();
        ctx.fillStyle = 'rgba(0,123,255,0.55)';
        ctx.beginPath();
        ctx.moveTo(sx, py - streamW / 2);
        ctx.quadraticCurveTo(sx + 10 + 40 * flow, py, sx + 8 + 30 * flow, ty + tankH + 60);
        ctx.lineTo(sx + 8 + 30 * flow - streamW, ty + tankH + 60);
        ctx.quadraticCurveTo(sx + 4 + 30 * flow, py + streamW, sx, py + streamW / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // depth marker
      Sim.arrow(ctx, tx - 14, ty + tankH, tx - 14, ty + tankH - level, { color: C.navy, width: 2, head: 7 });
      Sim.text(ctx, 'h', tx - 20, ty + tankH - level / 2, { size: 14, bold: true, color: C.navy, align: 'right' });
      // analogy labels
      const lx = tx + tankW + 10, lsz = wide ? 12.5 : 11.5;
      const labels = [
        ['depth h  ↔  p.d. V', C.navy],
        ['volume  ↔  charge Q', C.blue],
        ['flow rate  ↔  current I', '#0b7285'],
        ['tank width  ↔  C', C.green],
        ['narrow pipe  ↔  R', C.orange]
      ];
      labels.forEach((L, i) => Sim.text(ctx, L[0], lx + (wide ? 0 : 0), ty + 4 + i * (wide ? 22 : 19), { size: lsz, color: L[1], bold: true }));
      Sim.text(ctx, 'flow ∝ depth, just as I = V/R', tx, ty + tankH + (wide ? 70 : 64), { size: 12, color: C.muted, italic: true });

      // graph of depth against time
      const gb = wide ? { x: 360 + 50, y: 36, w: w - 360 - 50 - 22, h: h - 36 - 36 } : { x: 46, y: 250 + 36, w: w - 46 - 18, h: h - 250 - 36 - 36 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: TANK_WIN, ymin: 0, ymax: 110, xlabel: 't / s', ylabel: 'depth / % of start', title: 'depth against time' }, gb)).axes();
      if (p.tan) {
        g.plot((t) => 100 * (1 - t / tau), { from: 0, to: Math.min(tau, TANK_WIN), color: C.orange, width: 2, dash: [6, 4] });
        if (tau <= TANK_WIN) {
          g.dot(tau, 0, { color: C.orange, r: 4.5 });
          Sim.text(ctx, 't = RC', g.px(tau) + 8, g.py(0) - 12, { size: 12, color: '#b35c00', bold: true, align: 'left', bg: 'rgba(255,255,255,0.85)' });
          g.vline(tau, { color: 'rgba(240,140,0,0.5)' });
          g.dot(tau, 100 / Math.E, { color: C.orange, r: 4, label: '37%', dx: 8, dy: -10 });
        }
      }
      if (p.half) {
        const th = tau * Math.LN2;
        for (let k = 0; k <= 6; k++) {
          const t = k * th;
          if (t > TANK_WIN) break;
          const val = 100 / Math.pow(2, k);
          g.dot(t, val, { color: C.green, r: 4.5 });
          if (k > 0 && k <= 4 && g.px(th) - g.px(0) > 34) g.label(t, val + 9, '÷2', { size: 11.5, color: C.green, align: 'center' });
        }
      }
      g.path(st.rec.map((r) => [r[0], r[1] * 100]), { color: C.blue, width: 2.8 });
      g.plot((t) => 100 * Math.exp(-t / tau), { from: st.t, to: TANK_WIN, color: C.blue, width: 1.2, dash: [3, 5] });
      g.dot(st.t, st.h * 100, { color: C.blue });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const tau = p.R * p.A;
      return [
        ['t =', st.t.toFixed(1) + ' s'],
        ['depth =', (st.h * 100).toFixed(1) + '%'],
        ['time constant (R × width) =', tau.toFixed(2) + ' s', true],
        ['half-life = 0.69 × that =', (tau * Math.LN2).toFixed(2) + ' s']
      ];
    }
  });

  /* ======================================================================
     4. Core Practical 11 — data-logger discharge
     ====================================================================== */
  const V_START = 6.0;
  Sim.create('#sim-cp11', {
    title: 'Virtual experiment: logging a discharge',
    height: (w) => (w >= 700 ? 390 : 640),
    controls: [
      { key: 'R', type: 'select', label: 'Resistor', value: '47', options: [['10', '10 kΩ'], ['22', '22 kΩ'], ['47', '47 kΩ'], ['100', '100 kΩ']], onChange: (s) => clearLog(s) },
      { key: 'Cl', type: 'select', label: 'Capacitor (label)', value: '470', options: [['100', '100 μF'], ['220', '220 μF'], ['470', '470 μF'], ['1000', '1000 μF']], onChange: (s) => clearLog(s) },
      { key: 'dt', type: 'select', label: 'Logging interval', value: '2', options: [['0.5', 'every 0.5 s'], ['1', 'every 1 s'], ['2', 'every 2 s'], ['5', 'every 5 s']], onChange: (s) => clearLog(s) },
      { key: 'plot', type: 'select', label: 'Analysis graph', value: 'ln', options: [['ln', 'ln(V / V) against t'], ['v', 'V against t']] },
      { key: 'meter', type: 'check', label: 'Logger resistance only 1 MΩ (systematic error)', value: false, onChange: (s) => clearLog(s) },
      { type: 'button', label: 'Start discharge', onClick: (s) => startLog(s) },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => clearLog(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      // each capacitor has its own hidden tolerance error, fixed for the visit
      const tol = {};
      ['100', '220', '470', '1000'].forEach((k) => { tol[k] = 1 + (Math.random() * 0.3 - 0.1); });
      s.state = { tol, run: null, data: [] };
      startLog(s);
    },
    update(s, dt) {
      const r = s.state.run;
      if (!r || r.finished) return;
      r.t += dt * r.speed;
      while (r.next <= r.t + 1e-9 && !r.finished) {
        const Vt = V_START * Math.exp(-r.next / r.RCeff);
        const Vm = Math.round((Vt + gaussian() * 0.004) * 100) / 100;
        if (Vm < 0.1 || r.next > 4.2 * r.RCeff) { r.finished = true; break; }
        s.state.data.push([r.next, Vm]);
        r.next += r.dt;
        if (s.state.data.length >= 200) r.finished = true;
      }
      if (r.t > 4.5 * r.RCeff) r.finished = true;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const R = parseFloat(p.R) * 1e3;
      const Cn = parseFloat(p.Cl) * 1e-6;
      const RCn = R * Cn;
      const tmax = niceMax(4.2 * RCn);
      // logger screen
      const scr = wide ? { x: 16, y: 34, w: 300, h: h - 34 - 70 } : { x: 16, y: 30, w: w - 32, h: 200 };
      Sim.rect(ctx, scr.x - 6, scr.y - 26, scr.w + 12, scr.h + 66, { fill: '#343a40', r: 10 });
      Sim.text(ctx, 'DATA LOGGER  ·  V across C', scr.x + 4, scr.y - 13, { size: 11.5, color: '#ced4da', bold: true });
      Sim.rect(ctx, scr.x, scr.y, scr.w, scr.h, { fill: '#0b1d12', r: 4 });
      const X = (t) => scr.x + 8 + (t / tmax) * (scr.w - 16);
      const Y = (v) => scr.y + scr.h - 8 - (v / 6.5) * (scr.h - 16);
      ctx.save();
      ctx.strokeStyle = 'rgba(105,219,124,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < 6; i++) { const gx = scr.x + (i * scr.w) / 6; ctx.moveTo(gx, scr.y); ctx.lineTo(gx, scr.y + scr.h); }
      for (let i = 1; i < 4; i++) { const gy = scr.y + (i * scr.h) / 4; ctx.moveTo(scr.x, gy); ctx.lineTo(scr.x + scr.w, gy); }
      ctx.stroke();
      ctx.restore();
      const pts = st.data;
      if (pts.length > 1) Sim.polyline(ctx, pts.map((q) => [X(q[0]), Y(q[1])]), { color: '#69db7c', width: 2 });
      pts.forEach((q) => Sim.circle(ctx, X(q[0]), Y(q[1]), 2.6, { fill: '#b2f2bb' }));
      const r = st.run;
      const nowV = r ? V_START * Math.exp(-Math.min(r.t, 4.5 * r.RCeff) / r.RCeff) : V_START;
      Sim.text(ctx, nowV.toFixed(2) + ' V', scr.x + scr.w - 8, scr.y + 16, { size: 16, bold: true, color: '#69db7c', align: 'right' });
      Sim.text(ctx, 't = ' + (r ? Math.min(r.t, 4.5 * r.RCeff).toFixed(1) : '0.0') + ' s', scr.x + scr.w - 8, scr.y + 36, { size: 12, color: '#b2f2bb', align: 'right' });
      Sim.text(ctx, '0 → ' + Sim.fmt(tmax, 2) + ' s', scr.x + 4, scr.y + scr.h + 14, { size: 11, color: '#ced4da' });
      if (r && r.speed > 1.05) Sim.text(ctx, 'shown ×' + r.speed.toFixed(0) + ' speed', scr.x + scr.w, scr.y + scr.h + 14, { size: 11, color: '#ced4da', align: 'right' });
      if (r && r.speed < 0.95) Sim.text(ctx, 'slow motion', scr.x + scr.w, scr.y + scr.h + 14, { size: 11, color: '#ced4da', align: 'right' });
      Sim.text(ctx, 'R = ' + p.R + ' kΩ   C (label) = ' + p.Cl + ' μF', scr.x + 4, scr.y + scr.h + 32, { size: 11.5, color: '#fff', bold: true });

      // analysis graph
      const gb = wide ? { x: 316 + 70, y: 34, w: w - 316 - 70 - 22, h: h - 34 - 40 } : { x: 50, y: 300, w: w - 50 - 18, h: h - 300 - 40 };
      if (p.plot === 'ln') {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: tmax, ymin: -2.5, ymax: 2, xlabel: 't / s', ylabel: 'ln(V / V)', title: 'ln V against t' }, gb)).axes();
        const lp = pts.map((q) => [q[0], Math.log(q[1])]);
        const fit = lp.length >= 3 ? fitLine(lp) : null;
        if (fit) g.plot((t) => fit.m * t + fit.c, { color: C.orange, width: 2 });
        lp.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4 }));
        if (fit) {
          g.label(tmax * 0.98, 1.75, 'gradient = ' + Sim.fmt(fit.m, 3) + ' s⁻¹', { size: 12.5, color: '#b35c00', align: 'right' });
          g.label(tmax * 0.98, 1.45, 'intercept = ' + fit.c.toFixed(2), { size: 12.5, color: '#b35c00', align: 'right' });
        }
      } else {
        const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: tmax, ymin: 0, ymax: 7, xlabel: 't / s', ylabel: 'V / V', title: 'V against t' }, gb)).axes();
        const lp = pts.map((q) => [q[0], Math.log(q[1])]);
        const fit = lp.length >= 3 ? fitLine(lp) : null;
        if (fit) {
          g.plot((t) => Math.exp(fit.c + fit.m * t), { color: C.orange, width: 2 });
          const tc = -1 / fit.m;
          if (tc > 0 && tc < tmax) {
            g.hline(Math.exp(fit.c) / Math.E, { color: 'rgba(240,140,0,0.6)' });
            g.vline(tc, { color: 'rgba(240,140,0,0.6)' });
            g.label(tc, Math.exp(fit.c) / Math.E + 0.45, '37% at t = RC', { size: 12, color: '#b35c00', align: 'left' });
          }
        }
        pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4 }));
      }
      if (!pts.length) Sim.text(ctx, 'Press “Start discharge” to log readings', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true, bg: 'rgba(255,255,255,0.9)' });
      else if (r && r.finished && pts.length < 4) Sim.text(ctx, 'Too few readings: choose a shorter interval', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.red, align: 'center', bold: true, bg: 'rgba(255,255,255,0.9)' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const R = parseFloat(p.R) * 1e3;
      const lp = st.data.map((q) => [q[0], Math.log(q[1])]);
      const fit = lp.length >= 3 ? fitLine(lp) : null;
      const out = [['readings:', String(st.data.length)]];
      if (fit && fit.m < 0) {
        const RC = -1 / fit.m;
        const Cm = RC / R;
        out.push(['gradient =', Sim.fmt(fit.m, 3) + ' s⁻¹']);
        out.push(['RC = −1/gradient =', Sim.fmt(RC, 3) + ' s', true]);
        out.push(['C = RC/R =', Sim.fmt(Cm * 1e6, 3) + ' μF', true]);
        const diff = ((Cm * 1e6) / parseFloat(p.Cl) - 1) * 100;
        out.push(['vs label:', (diff >= 0 ? '+' : '') + diff.toFixed(0) + '%']);
        out.push(['V₀ = e^intercept =', Math.exp(fit.c).toFixed(2) + ' V']);
      } else if (st.data.length) out.push(['need at least 3 readings', 'to fit a line']);
      return out;
    }
  });
  function clearLog(s) { s.state.data = []; s.state.run = null; }
  function startLog(s) {
    const p = s.p;
    const R = parseFloat(p.R) * 1e3;
    const Ctrue = parseFloat(p.Cl) * 1e-6 * s.state.tol[p.Cl];
    const Reff = p.meter ? (R * 1e6) / (R + 1e6) : R;
    const RCeff = Reff * Ctrue;
    const speed = Sim.clamp((4.2 * RCeff) / 8, 0.25, 100);
    s.state.data = [];
    s.state.run = { t: 0, next: 0, dt: parseFloat(p.dt), RCeff, speed, finished: false };
  }
})();
