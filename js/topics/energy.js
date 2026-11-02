/* Energy — interactive diagrams */
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
  /* energy in J with a sensible number of figures */
  function eJ(v) {
    if (Math.abs(v) >= 1e4) return fx(v / 1000, 1) + ' kJ';
    if (Math.abs(v) >= 1000) return fx(v / 1000, 2) + ' kJ';
    return Sim.fmt(v, 3) + ' J';
  }
  /* vertical energy bars with a constant-total marker */
  function energyBars(ctx, box, bars, total, title) {
    Sim.text(ctx, title, box.x + box.w / 2, box.y + 8, { size: 13, bold: true, color: C.navy, align: 'center' });
    const top = box.y + 28, bot = box.y + box.h - 34, H = bot - top;
    const n = bars.length, gap = 10, bw = Math.min(46, (box.w - gap * (n + 1)) / n);
    const x0 = box.x + (box.w - (n * bw + (n - 1) * gap)) / 2;
    const sc = H / Math.max(1e-9, total);
    Sim.line(ctx, box.x + 4, bot, box.x + box.w - 4, bot, { color: C.axis, width: 1.2 });
    bars.forEach((b, i) => {
      const x = x0 + i * (bw + gap);
      const hh = Sim.clamp(b[1] * sc, 0, H * 1.05);
      if (b[3]) Sim.rect(ctx, x, bot - hh, bw, hh, { stroke: b[2], width: 2.5, r: 3 });
      else Sim.rect(ctx, x, bot - hh, bw, hh, { fill: b[2], r: 3 });
      Sim.text(ctx, b[0], x + bw / 2, bot + 11, { size: 11.5, bold: true, color: b[2], align: 'center' });
      Sim.text(ctx, eJ(b[1]), x + bw / 2, bot + 25, { size: 11, color: C.ink, align: 'center' });
    });
    return { top, bot, sc };
  }

  /* ======================================================================
     1. Pulling a sledge: W = Fs cos θ
     ====================================================================== */
  function drawSledge(ctx, x, y, alpha) {
    ctx.save();
    if (alpha != null) ctx.globalAlpha = alpha;
    Sim.rect(ctx, x, y - 26, 62, 16, { fill: '#c0392b', r: 4 });
    Sim.line(ctx, x + 8, y - 10, x + 8, y - 3, { color: '#495057', width: 2.5 });
    Sim.line(ctx, x + 50, y - 10, x + 50, y - 3, { color: '#495057', width: 2.5 });
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 2);
    ctx.lineTo(x + 62, y - 2);
    ctx.quadraticCurveTo(x + 74, y - 2, x + 72, y - 14);
    ctx.stroke();
    ctx.restore();
  }

  Sim.create('#sim-sledge', {
    title: 'Pulling a sledge: W = Fs cos θ',
    height: (w) => (w >= 640 ? 340 : 500),
    controls: [
      { key: 'F', label: 'Pulling force F', min: 10, max: 200, step: 5, value: 120, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'th', label: 'Angle of the rope θ', min: 0, max: 90, step: 1, value: 30, unit: '°', format: (v) => v.toFixed(0) },
      { key: 's', label: 'Distance moved s', min: 1, max: 20, step: 0.5, value: 10, unit: 'm', format: (v) => v.toFixed(1) },
      { key: 'comp', type: 'check', label: 'Show the components of F', value: true },
      { key: 'alt', type: 'check', label: 'Other view: F × (s cos θ)', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const SW = wide ? Math.round(w * 0.56) : w, SH = wide ? h : 260;
      const th = p.th * DEG, cs = Math.cos(th), sn = Math.sin(th);
      const W = p.F * p.s * cs;
      const gy = SH - 58;
      Sim.rect(ctx, 0, 0, SW, gy, { fill: '#eef5fc' });
      Sim.rect(ctx, 0, gy, SW, SH - gy, { fill: '#f8fbff' });
      Sim.line(ctx, 0, gy, SW, gy, { color: '#a5c4e0', width: 2 });
      const x0 = 24, kx = (SW - x0 - 110) / 20;
      const xs0 = x0, xs1 = x0 + p.s * kx;
      drawSledge(ctx, xs1, gy, 0.3);
      drawSledge(ctx, xs0, gy);
      // displacement
      Sim.arrow(ctx, xs0 + 31, gy + 22, xs1 + 31, gy + 22, { color: C.green, width: 3, head: 9 });
      Sim.text(ctx, 's = ' + fx(p.s, 1) + ' m', (xs0 + xs1) / 2 + 31, gy + 40, { size: 13, bold: true, color: C.green, align: 'center' });
      // force at the front of the sledge
      const A = [xs0 + 70, gy - 24];
      const kF = Math.min(200, SH * 0.62) / 200;
      const L = p.F * kF;
      const T = [A[0] + cs * L, A[1] - sn * L];
      Sim.line(ctx, A[0], A[1], A[0] + cs * (L + 40), A[1] - sn * (L + 40), { color: '#8c7a62', width: 1.5 });
      if (p.alt) {
        const ux = cs, uy = -sn, ox = sn * 20, oy = cs * 20; // offset the projection below the rope
        const B = [xs1 + 70, gy - 24];
        const proj = (B[0] - A[0]) * ux + (B[1] - A[1]) * uy;
        const A2 = [A[0] + ox, A[1] + oy], P2 = [A2[0] + ux * proj, A2[1] + uy * proj];
        Sim.line(ctx, A2[0], A2[1], A2[0] + ux * (proj + 50), A2[1] + uy * (proj + 50), { color: C.grey, width: 1.2, dash: [6, 4] });
        Sim.line(ctx, B[0], B[1], P2[0], P2[1], { color: C.grey, width: 1.2, dash: [4, 4] });
        Sim.line(ctx, A[0], A[1], B[0], B[1], { color: C.green, width: 1.5, dash: [3, 3] });
        Sim.arrow(ctx, A2[0], A2[1], P2[0], P2[1], { color: C.teal, width: 3.5, head: 9 });
        if (proj > 40) Sim.text(ctx, 's cos θ = ' + fx(p.s * cs, 2) + ' m', (A2[0] + P2[0]) / 2 + sn * 16, (A2[1] + P2[1]) / 2 + cs * 16, { size: 12.5, bold: true, color: C.teal, align: 'center', bg: BG });
      } else if (p.comp) {
        if (cs * L > 4) Sim.arrow(ctx, A[0], A[1], A[0] + cs * L, A[1], { color: C.blue, width: 3 });
        if (sn * L > 4) Sim.arrow(ctx, A[0] + cs * L, A[1], T[0], T[1], { color: C.pink, width: 2.5, dash: [5, 4] });
        if (cs * L > 50) Sim.text(ctx, 'F cos θ = ' + fx(p.F * cs, 1) + ' N', A[0] + cs * L / 2, A[1] + 13, { size: 12.5, bold: true, color: C.blue, align: 'center', bg: BG });
        if (sn * L > 24) Sim.text(ctx, 'F sin θ', T[0] + 8, A[1] - sn * L / 2, { size: 12.5, bold: true, color: C.pink, align: 'left', bg: BG });
      }
      Sim.arrow(ctx, A[0], A[1], T[0], T[1], { color: C.red, width: 4 });
      Sim.text(ctx, 'F = ' + fx(p.F, 0) + ' N', T[0] + cs * 14 + 4, T[1] - sn * 14 - 8, { size: 13.5, bold: true, color: C.red, align: 'left', bg: BG });
      if (p.th >= 4 && !p.alt) Sim.arc(ctx, A[0], A[1], 30, -th, 0, { color: C.ink, label: 'θ', labelGap: 11 });
      Sim.text(ctx, 'W = Fs cos θ = ' + eJ(W), SW - 12, 18, { size: 14, bold: true, color: C.navy, align: 'right' });

      // graph of W against θ
      const gb = wide ? { x: SW + 58, y: 34, w: w - SW - 58 - 22, h: h - 34 - 42 } : { x: 58, y: SH + 34, w: w - 58 - 22, h: h - SH - 34 - 40 };
      const ymax = niceMax(Math.max(10, p.F * p.s * 1.12));
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 90, ymin: 0, ymax, xlabel: 'θ / °', ylabel: 'W / J', title: 'work done against rope angle', xstep: 15 }, gb)).axes();
      g.plot((t) => p.F * p.s * Math.cos(t * DEG), { color: C.navy, width: 2.6 });
      g.vline(p.th, { color: C.grey });
      g.dot(p.th, W, { color: C.red, label: eJ(W), dx: 8, dy: -12 });
    },
    readout(s) {
      const p = s.p, th = p.th * DEG;
      return [
        ['F cos θ =', fx(p.F * Math.cos(th), 1) + ' N'],
        ['F sin θ =', fx(p.F * Math.sin(th), 1) + ' N'],
        ['W = Fs cos θ =', eJ(p.F * p.s * Math.cos(th)), true],
        ['work done by F sin θ =', '0']
      ];
    }
  });

  /* ======================================================================
     2. Braking distance and kinetic energy
     ====================================================================== */
  const brakeRuns = [];
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
  const brakeD = (p) => (p.m * p.u * p.u) / (2 * p.F);

  Sim.create('#sim-brake', {
    title: 'Braking distance and kinetic energy',
    height: (w) => (w >= 640 ? 360 : 540),
    controls: [
      { key: 'u', label: 'Speed when braking starts u', min: 5, max: 35, step: 1, value: 15, unit: 'm s⁻¹', format: (v) => v.toFixed(0) },
      { key: 'm', label: 'Mass of the car', min: 800, max: 2000, step: 50, value: 1200, unit: 'kg', format: (v) => v.toFixed(0) },
      { key: 'F', label: 'Braking force', min: 3000, max: 12000, step: 500, value: 6000, unit: 'N', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Clear old runs', ghost: true, onClick: () => { brakeRuns.length = 0; } }
    ],
    onChange(s) { s.reset(); s.play(); },
    animate: true,
    init(s) {
      const a = s.p.F / s.p.m, tStop = s.p.u / a;
      s.speed = Sim.clamp(tStop / 3.5, 1, 8);
      s.state = { t: 0, x: 0, v: s.p.u, done: false, wait: 0.4 };
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (st.done) { s.reset(); return; }
      if (st.wait > 0) { st.wait -= dt / (s.speed || 1); return; }
      const a = p.F / p.m, tStop = p.u / a;
      st.t = Math.min(tStop, st.t + dt);
      st.v = Math.max(0, p.u - a * st.t);
      st.x = p.u * st.t - 0.5 * a * st.t * st.t;
      if (st.t >= tStop - 1e-9) {
        st.done = true;
        brakeRuns.push({ u: p.u, d: brakeD(p), m: p.m, F: p.F });
        if (brakeRuns.length > 5) brakeRuns.shift();
        s.pause();
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const d = brakeD(p);
      // road
      const roadH = 118, rx0 = 50, rx1 = w - 26;
      let span = Math.max(d * 1.12, 20);
      brakeRuns.forEach((r) => { span = Math.max(span, r.d * 1.05); });
      span = niceMax(span);
      const RX = (x) => rx0 + (x / span) * (rx1 - rx0);
      Sim.rect(ctx, 0, 0, w, roadH, { fill: '#f3f6fb' });
      Sim.rect(ctx, 0, roadH - 34, w, 20, { fill: '#c9d1dc' });
      for (let x = 0; x < w; x += 28) Sim.line(ctx, x, roadH - 24, x + 14, roadH - 24, { color: '#fff', width: 2 });
      const stp = niceStep(span, wide ? 8 : 4);
      for (let m = 0; m <= span + 1e-9; m += stp) {
        Sim.line(ctx, RX(m), roadH - 14, RX(m), roadH - 9, { color: C.axis, width: 1.5 });
        Sim.text(ctx, fx(m, 0) + ' m', RX(m), roadH - 7, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      brakeRuns.forEach((r) => {
        Sim.line(ctx, RX(r.d), roadH - 36, RX(r.d), roadH - 14, { color: C.orange, width: 2 });
        Sim.text(ctx, r.u + ' m s⁻¹', RX(r.d), roadH - 44, { size: 11, bold: true, color: C.orange, align: 'center' });
      });
      Sim.line(ctx, RX(0), roadH - 40, RX(0), roadH - 14, { color: C.red, width: 2, dash: [3, 3] });
      Sim.text(ctx, 'brakes on', RX(0), roadH - 48, { size: 11, color: C.red, align: 'center' });
      drawCar(ctx, RX(st.x) - 22, roadH - 34, C.blue);
      if (st.v > 0.2) Sim.arrow(ctx, RX(st.x) - 22, 18, RX(st.x) - 22 + Sim.clamp(st.v * 3, 6, 110), 18, { color: C.navy, width: 2.5, label: fx(st.v, 1) + ' m s⁻¹', labelOffset: 34, size: 12 });

      // energy bar
      const KE0 = 0.5 * p.m * p.u * p.u, KE = 0.5 * p.m * st.v * st.v, Wb = p.F * st.x;
      const eb = wide ? { x: 16, y: roadH + 22, w: w * 0.4 - 24 } : { x: 14, y: roadH + 20, w: w - 28 };
      Sim.text(ctx, 'Energy', eb.x, eb.y, { size: 13, bold: true, color: C.navy });
      const bw = eb.w, sc = bw / KE0;
      Sim.rect(ctx, eb.x, eb.y + 16, bw, 26, { fill: '#f1f3f7', r: 4 });
      Sim.rect(ctx, eb.x, eb.y + 16, KE * sc, 26, { fill: C.blue, r: 3 });
      Sim.rect(ctx, eb.x + KE * sc, eb.y + 16, Math.min(bw - KE * sc, Wb * sc), 26, { fill: C.orange, r: 3 });
      Sim.rect(ctx, eb.x, eb.y + 54, 12, 12, { fill: C.blue, r: 2 });
      Sim.text(ctx, 'kinetic energy ' + eJ(KE), eb.x + 18, eb.y + 60, { size: 12, color: C.ink });
      Sim.rect(ctx, eb.x, eb.y + 74, 12, 12, { fill: C.orange, r: 2 });
      Sim.text(ctx, 'work done by brakes Fx = ' + eJ(Wb), eb.x + 18, eb.y + 80, { size: 12, color: C.ink });
      Sim.text(ctx, '(transferred to thermal energy)', eb.x + 18, eb.y + 97, { size: 11.5, color: C.muted, italic: true });

      // graph of braking distance against speed
      const gb = wide ? { x: w * 0.4 + 56, y: roadH + 34, w: w * 0.6 - 56 - 22, h: h - roadH - 34 - 38 } : { x: 54, y: roadH + 150, w: w - 72, h: h - roadH - 150 - 36 };
      const ymax = niceMax((p.m * 35 * 35) / (2 * p.F));
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 35, ymin: 0, ymax, xlabel: 'u / m s⁻¹', ylabel: 'braking distance / m', title: 'braking distance ∝ u²', yticks: 4 }, gb)).axes();
      g.plot((u) => (p.m * u * u) / (2 * p.F), { color: C.navy, width: 2.6 });
      brakeRuns.forEach((r) => { if (r.u <= 35) g.dot(r.u, Math.min(r.d, ymax), { color: '#adb5bd', r: 4 }); });
      if (p.u * 2 <= 35) {
        const d2 = (p.m * 4 * p.u * p.u) / (2 * p.F);
        Sim.line(ctx, g.px(2 * p.u), g.py(0), g.px(2 * p.u), g.py(d2), { color: C.orange, width: 1.5, dash: [5, 4] });
        Sim.line(ctx, g.px(0), g.py(d2), g.px(2 * p.u), g.py(d2), { color: C.orange, width: 1.5, dash: [5, 4] });
        g.dot(2 * p.u, d2, { color: C.orange, r: 4.5, label: '2u → 4× distance', dx: -8, dy: -12, align: 'right' });
      }
      g.dot(p.u, d, { color: C.red, label: fx(d, 1) + ' m', dx: 8, dy: -12 });
    },
    readout(s) {
      const p = s.p, a = p.F / p.m;
      return [
        ['Eₖ = ½mu² =', eJ(0.5 * p.m * p.u * p.u)],
        ['deceleration F/m =', fx(a, 2) + ' m s⁻²'],
        ['braking distance = Eₖ/F =', fx(brakeD(p), 1) + ' m', true],
        ['time to stop =', fx(p.u / a, 2) + ' s']
      ];
    }
  });

  /* ======================================================================
     3. Skate park: energy stores with friction
     ====================================================================== */
  const trackY = (x) => 0.1 * x * x + 1.5 * Math.exp((-x * x) / 3);
  const trackDY = (x) => 0.2 * x - x * Math.exp((-x * x) / 3);
  const XMAX = 7.8;

  Sim.create('#sim-skate', {
    title: 'Skate park: kinetic, potential and thermal energy',
    height: (w) => (w >= 640 ? 360 : 392),
    controls: [
      { key: 'f', label: 'Friction force', min: 0, max: 60, step: 1, value: 0, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'm', label: 'Mass of the skater', min: 30, max: 90, step: 1, value: 50, unit: 'kg', format: (v) => v.toFixed(0), onChange: (s) => release(s, s.state.x) }
    ],
    animate: true,
    init(s) { s.state = {}; release(s, -6.8); },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (st.drag || st.stuck) return;
      const n = 12, hh = dt / n, m = p.m, fm = p.f / m;
      for (let i = 0; i < n; i++) {
        const yp = trackDY(st.x), cs = 1 / Math.sqrt(1 + yp * yp), sn = yp * cs;
        if (Math.abs(st.v) < 1e-3) {
          if (Math.abs(G * sn) <= fm) { st.v = 0; st.stuck = true; break; }
          st.v = -Math.sign(sn) * 1e-3;
        }
        const a = -G * sn - Math.sign(st.v) * fm;
        const v0 = st.v;
        st.v += a * hh;
        if (Math.sign(st.v) !== Math.sign(v0) && Math.abs(G * sn) <= fm) st.v = 0;
        const ds = st.v * hh;
        st.x = Sim.clamp(st.x + ds * cs, -XMAX, XMAX);
        st.th += p.f * Math.abs(ds);
        // keep the books exact: speed comes from the energy that is left
        const ke = st.E0 - st.th - m * G * trackY(st.x);
        if (ke <= 0) { st.th = Math.max(0, Math.min(st.th, st.E0 - m * G * trackY(st.x))); st.v = 0; }
        else if (st.v !== 0) st.v = Math.sign(st.v) * Math.sqrt((2 * ke) / m);
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const TW = wide ? Math.round(w * 0.66) : w, TH = wide ? h : 202;
      const k = Math.min((TW - 36) / (2 * 8), (TH - 50) / 6.8);
      const ox = TW / 2, oy = TH - 22;
      const X = (x) => ox + x * k, Y = (y) => oy - y * k;
      st.geo = { ox, k, TW, TH };
      Sim.rect(ctx, 0, 0, TW, TH, { fill: '#f6f9fe' });
      const pts = [];
      for (let x = -8; x <= 8.001; x += 0.1) pts.push([X(x), Y(trackY(x))]);
      Sim.polyline(ctx, pts.concat([[X(8), oy], [X(-8), oy]]), { close: true, fill: '#e3e8ef', color: '#e3e8ef', width: 1 });
      Sim.polyline(ctx, pts, { color: '#495057', width: 4 });
      Sim.line(ctx, 0, oy, TW, oy, { color: '#8c7a62', width: 2 });
      Sim.text(ctx, 'GPE = 0 here', 8, oy + 12, { size: 11, color: C.muted });
      // release height
      const h0 = st.E0 / (p.m * G);
      Sim.line(ctx, X(-8), Y(h0), X(8), Y(h0), { color: C.green, width: 1.2, dash: [6, 5] });
      Sim.text(ctx, 'release height ' + fx(h0, 2) + ' m', TW / 2, Y(h0) - 10, { size: 11.5, color: C.green, align: 'center', bg: BG });
      // skater, standing at right angles to the track
      const yp = trackDY(st.x), nl = Math.hypot(1, yp);
      const bx = 1 / nl, by = -yp / nl;   // tangent (canvas)
      const tx = -yp / nl, ty = -1 / nl;  // normal pointing away from the surface
      const px = X(st.x), py = Y(trackY(st.x));
      Sim.line(ctx, px - bx * 12 + tx * 2, py - by * 12 + ty * 2, px + bx * 12 + tx * 2, py + by * 12 + ty * 2, { color: '#343a40', width: 4 });
      Sim.line(ctx, px + tx * 4, py + ty * 4, px + tx * 24, py + ty * 24, { color: C.navy, width: 5 });
      Sim.circle(ctx, px + tx * 31, py + ty * 31, 7, { fill: C.navy });
      handleDot(ctx, px + tx * 14, py + ty * 14);
      if (st.stuck) Sim.text(ctx, 'stopped: friction holds her still', TW / 2, 16, { size: 12.5, bold: true, color: C.orange, align: 'center' });
      else Sim.text(ctx, 'Drag the skater to a new start point', TW / 2, 16, { size: 12, italic: true, color: C.muted, align: 'center' });

      // energy bars
      const GPE = p.m * G * trackY(st.x), th = st.th, KE = Math.max(0, st.E0 - th - GPE);
      const box = wide ? { x: TW + 10, y: 10, w: w - TW - 20, h: h - 20 } : { x: 10, y: TH + 8, w: w - 20, h: h - TH - 14 };
      const bars = [['KE', KE, C.blue], ['GPE', GPE, C.green], ['thermal', th, C.orange], ['total', st.E0, C.navy, true]];
      energyBars(ctx, box, bars, st.E0 * 1.0, 'Energy stores');
    },
    readout(s) {
      const st = s.state, p = s.p;
      const y = trackY(st.x), GPE = p.m * G * y, KE = Math.max(0, st.E0 - st.th - GPE);
      return [
        ['height =', fx(y, 2) + ' m'],
        ['speed =', fx(Math.sqrt((2 * KE) / p.m), 2) + ' m s⁻¹'],
        ['KE =', eJ(KE)],
        ['GPE =', eJ(GPE)],
        ['thermal =', eJ(st.th)],
        ['total =', eJ(KE + GPE + st.th), true]
      ];
    },
    pointer: {
      cursor: 'grab',
      touchAction: 'pan-y',
      down(s, pt) {
        const g = s.state.geo;
        if (!g || pt.y > g.TH || pt.x > g.TW) return;
        s.state.drag = true;
        this.move(s, pt);
      },
      move(s, pt) {
        const st = s.state, g = st.geo;
        if (!pt.down || !st.drag || !g) return;
        release(s, Sim.clamp((pt.x - g.ox) / g.k, -XMAX, XMAX));
        st.drag = true;
      },
      up(s) { if (s.state.drag) { s.state.drag = false; if (!s.running) s.play(); } }
    }
  });
  function release(s, x) {
    const st = s.state;
    st.x = Sim.clamp(x, -XMAX, XMAX);
    st.v = 0;
    st.th = 0;
    st.E0 = s.p.m * G * trackY(st.x);
    st.stuck = false;
    st.drag = false;
  }
  function handleDot(ctx, x, y) {
    Sim.circle(ctx, x, y, 7, { fill: '#fff', stroke: C.navy, width: 2 });
    Sim.circle(ctx, x, y, 2.5, { fill: C.navy });
  }

  /* ======================================================================
     4. Bouncing ball
     ====================================================================== */
  const BALL_M = 0.058, T_BOUNCE = 10;
  Sim.create('#sim-bounce', {
    title: 'Bouncing ball: where does the energy go?',
    height: (w) => (w >= 640 ? 330 : 470),
    controls: [
      { key: 'h0', label: 'Drop height', min: 0.5, max: 3, step: 0.1, value: 2, unit: 'm', format: (v) => v.toFixed(1) },
      { key: 'f', label: 'Energy kept in each bounce', min: 40, max: 95, step: 1, value: 65, unit: '%', format: (v) => v.toFixed(0) }
    ],
    onChange(s) { s.reset(); s.play(); },
    animate: true,
    init(s) {
      s.state = { t: 0, y: s.p.h0, v: 0, n: 0, lost: 0, rec: [[0, s.p.h0]], peaks: [], done: false, rest: false };
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (st.done) { s.reset(); return; }
      const n = 8, hh = dt / n, f = p.f / 100;
      for (let i = 0; i < n && !st.rest; i++) {
        st.y += st.v * hh - 0.5 * G * hh * hh;
        st.v -= G * hh;
        st.t += hh;
        if (st.y <= 0 && st.v < 0) {
          const vi = Math.sqrt(Math.max(0, st.v * st.v + 2 * G * st.y));
          const ke = 0.5 * BALL_M * vi * vi;
          st.lost += ke * (1 - f);
          st.v = vi * Math.sqrt(f);
          st.y = 0;
          st.n += 1;
          st.peaks.push((st.v * st.v) / (2 * G));
          if (st.v < 0.25) { st.rest = true; st.v = 0; st.lost = BALL_M * G * p.h0; }
        }
      }
      if (st.rest) st.t += dt;
      st.rec.push([Math.min(st.t, T_BOUNCE), st.y]);
      if (st.t >= T_BOUNCE) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const col = wide ? { x: 0, y: 0, w: 130, h } : { x: 0, y: 0, w: 120, h: 230 };
      // ball column
      const floor = col.y + col.h - 24, top = col.y + 22;
      const ky = (floor - top) / 3.1;
      Sim.rect(ctx, col.x, col.y, col.w, col.h, { fill: '#f6f9fe' });
      Sim.rect(ctx, col.x, floor, col.w, col.h - (floor - col.y), { fill: '#d8cbb3' });
      for (let m = 0; m <= 3; m += 1) {
        Sim.line(ctx, col.x + 8, floor - m * ky, col.x + 16, floor - m * ky, { color: C.axis, width: 1 });
        Sim.text(ctx, m + ' m', col.x + 20, floor - m * ky, { size: 11, color: C.muted });
      }
      Sim.line(ctx, col.x + 12, floor, col.x + 12, floor - 3 * ky, { color: '#adb5bd', width: 1 });
      Sim.line(ctx, col.x + 46, floor - p.h0 * ky, col.x + col.w - 6, floor - p.h0 * ky, { color: C.green, width: 1.2, dash: [5, 4] });
      const r = 9, bx = col.x + col.w * 0.66, by = floor - st.y * ky - r;
      Sim.circle(ctx, bx, by, r, { fill: '#c3d82c', stroke: '#7a8a12', width: 1.5 });

      // energy bars
      const GPE = BALL_M * G * st.y, KE = 0.5 * BALL_M * st.v * st.v;
      const tot = BALL_M * G * p.h0;
      const lost = st.rest ? tot : st.lost;
      const box = wide ? { x: w - 250, y: 6, w: 240, h: h - 12 } : { x: col.w + 8, y: 6, w: w - col.w - 14, h: col.h - 8 };
      energyBars(ctx, box, [['GPE', GPE, C.green], ['KE', KE, C.blue], ['thermal', lost, C.orange], ['total', tot, C.navy, true]], tot, 'Energy stores');

      // height–time graph
      const gb = wide ? { x: col.w + 56, y: 34, w: w - col.w - 56 - 270, h: h - 34 - 40 } : { x: 52, y: col.h + 34, w: w - 70, h: h - col.h - 34 - 36 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_BOUNCE, ymin: 0, ymax: 3.2, xlabel: 't / s', ylabel: 'h / m', title: 'height of the ball', xstep: 2 }, gb)).axes();
      g.path(st.rec, { color: C.navy, width: 2.2 });
      g.hline(p.h0, { color: C.green });
      g.dot(Math.min(st.t, T_BOUNCE), st.y, { color: '#7a8a12', r: 4.5 });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const last = st.peaks.length ? st.peaks[st.peaks.length - 1] : null;
      return [
        ['bounces:', String(st.n)],
        ['last rebound height =', last == null ? '—' : fx(last, 2) + ' m'],
        ['rebound ÷ previous =', fx(p.f / 100, 2)],
        ['total energy =', eJ(BALL_M * G * p.h0) + ' (constant)', true]
      ];
    }
  });

  /* ======================================================================
     5. Motor lifting a load: power and efficiency
     ====================================================================== */
  const LIFT_H = 0.8;
  const motorLoss = (P) => 1.0 + 0.03 * P * P;
  const motorOut = (P) => Math.max(0.05, P - motorLoss(P));

  Sim.create('#sim-motor', {
    title: 'Electric motor lifting a load',
    height: (w) => (w >= 640 ? 380 : 520),
    controls: [
      { key: 'm', label: 'Load mass m', min: 0.1, max: 1, step: 0.05, value: 0.4, unit: 'kg', format: (v) => v.toFixed(2) },
      { key: 'P', label: 'Electrical power input', min: 2, max: 24, step: 0.5, value: 6, unit: 'W', format: (v) => v.toFixed(1) },
      { type: 'button', label: 'Lift the load', onClick: (s) => { s.reset(); s.state.go = true; s.play(); } }
    ],
    onChange(s) { s.reset(); },
    animate: true,
    playPause: false,
    init(s) {
      const tl = (s.p.m * G * LIFT_H) / motorOut(s.p.P);
      s.speed = Sim.clamp(tl / 3, 0.05, 4);
      s.state = { t: 0, y: 0, go: false, done: false, tl };
    },
    update(s, dt) {
      const st = s.state;
      if (!st.go || st.done) return;
      st.t = Math.min(st.tl, st.t + dt);
      st.y = (LIFT_H * st.t) / st.tl;
      if (st.t >= st.tl) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const Pout = motorOut(p.P), eff = Pout / p.P;
      // apparatus
      const ap = wide ? { x: 0, y: 0, w: 250, h } : { x: 0, y: 0, w: 150, h: 270 };
      Sim.rect(ctx, ap.x, ap.y, ap.w, ap.h, { fill: '#f6f9fe' });
      const benchY = ap.y + 72, edge = ap.x + ap.w * 0.62;
      Sim.rect(ctx, ap.x, benchY, edge - ap.x, 12, { fill: '#a07a4a' });
      Sim.rect(ctx, ap.x + 10, benchY - 30, 46, 30, { fill: '#495057', r: 4 });
      Sim.text(ctx, 'motor', ap.x + 33, benchY - 15, { size: 11, bold: true, color: '#fff', align: 'center' });
      Sim.circle(ctx, edge - 8, benchY - 8, 8, { fill: '#868e96', stroke: '#495057', width: 1.5 });
      Sim.line(ctx, ap.x + 56, benchY - 14, edge - 8, benchY - 16, { color: '#343a40', width: 1.2 });
      const floor = ap.y + ap.h - 30;
      const ky = (floor - benchY - 70) / LIFT_H;
      const lw = 44 + p.m * 16, lh = 18 + p.m * 14;
      const ly = floor - st.y * ky;
      Sim.line(ctx, edge, benchY - 8, edge, ly - lh, { color: '#343a40', width: 1.2 });
      Sim.rect(ctx, edge - lw / 2, ly - lh, lw, lh, { fill: C.navy, r: 3 });
      Sim.text(ctx, fx(p.m, 2) + ' kg', edge, ly - lh / 2, { size: 11, bold: true, color: '#fff', align: 'center' });
      Sim.line(ctx, ap.x, floor, ap.x + ap.w, floor, { color: '#8c7a62', width: 2 });
      // ruler
      const rx = edge + lw / 2 + 12;
      Sim.line(ctx, rx, floor, rx, floor - LIFT_H * ky - lh, { color: '#adb5bd', width: 3 });
      Sim.line(ctx, rx - 5, floor - LIFT_H * ky - lh, rx + 5, floor - LIFT_H * ky - lh, { color: C.green, width: 2 });
      Sim.text(ctx, '0.80 m', rx + 4, floor - LIFT_H * ky - lh - 10, { size: 11, color: C.green, bold: true, align: 'center' });
      // meters
      const Ein = p.P * st.t;
      Sim.rect(ctx, ap.x + 8, ap.y + 6, wide ? 108 : 64, 20, { fill: '#212529', r: 4 });
      Sim.text(ctx, fx(st.t, 2) + ' s', ap.x + 8 + (wide ? 54 : 32), ap.y + 16, { size: 12.5, bold: true, color: '#69db7c', align: 'center' });
      if (wide) {
        Sim.rect(ctx, ap.x + 124, ap.y + 6, 116, 20, { fill: '#212529', r: 4 });
        Sim.text(ctx, fx(Ein, 2) + ' J in', ap.x + 182, ap.y + 16, { size: 12.5, bold: true, color: '#ffd43b', align: 'center' });
      } else {
        Sim.rect(ctx, ap.x + 76, ap.y + 6, 70, 20, { fill: '#212529', r: 4 });
        Sim.text(ctx, fx(Ein, 1) + ' J', ap.x + 111, ap.y + 16, { size: 12.5, bold: true, color: '#ffd43b', align: 'center' });
      }
      if (!st.go) Sim.text(ctx, 'press “Lift the load”', ap.x + ap.w / 2, floor + 15, { size: 11.5, italic: true, color: C.muted, align: 'center' });
      else if (st.done) Sim.text(ctx, 'lifted in ' + fx(st.tl, 2) + ' s', ap.x + ap.w / 2, floor + 15, { size: 11.5, bold: true, color: C.green, align: 'center' });

      // Sankey diagram
      const sk = wide ? { x: ap.w + 24, y: 14, w: w - ap.w - 40, h: h * 0.5 - 14 } : { x: ap.w + 8, y: 12, w: w - ap.w - 16, h: 250 };
      Sim.text(ctx, 'Sankey diagram (power)', sk.x + sk.w / 2, sk.y + 6, { size: 13, bold: true, color: C.navy, align: 'center' });
      const band = Math.min(64, sk.h * 0.34);
      const y0 = sk.y + 40, xin = sk.x + 4, xs = sk.x + sk.w * (wide ? 0.38 : 0.3);
      const Hu = Math.max(2, band * eff), Hw = band - Hu;
      Sim.rect(ctx, xin, y0, xs - xin, band, { fill: '#748ffc' });
      Sim.text(ctx, fx(p.P, 1) + ' W in', xin + 6, y0 + band / 2, { size: 12, bold: true, color: '#fff' });
      // useful band
      const xe = sk.x + sk.w - 22;
      Sim.rect(ctx, xs, y0, xe - xs, Hu, { fill: C.green });
      Sim.polyline(ctx, [[xe, y0 - 6], [sk.x + sk.w - 2, y0 + Hu / 2], [xe, y0 + Hu + 6]], { close: true, fill: C.green, color: C.green, width: 1 });
      const ulab = 'useful ' + fx(Pout, 2) + ' W (' + fx(eff * 100, 0) + '%)';
      if (Hu >= 18 && Sim.measure(ctx, ulab, { size: 12, bold: true }) < xe - xs - 8) Sim.text(ctx, ulab, (xs + xe) / 2, y0 + Hu / 2, { size: 12, bold: true, color: '#fff', align: 'center' });
      else Sim.text(ctx, ulab, xe, y0 - 11, { size: 12, bold: true, color: C.green, align: 'right' });
      // wasted band turning down
      const r1 = 16, cx = xs, cy = y0 + band + r1;
      const yEnd = sk.y + sk.h - 22;
      ctx.save();
      ctx.fillStyle = C.orange;
      ctx.beginPath();
      ctx.moveTo(xs, y0 + Hu);
      ctx.arc(cx, cy, r1 + Hw, -Math.PI / 2, 0);
      ctx.lineTo(cx + r1 + Hw, yEnd);
      ctx.lineTo(cx + r1, yEnd);
      ctx.lineTo(cx + r1, cy);
      ctx.arc(cx, cy, r1, 0, -Math.PI / 2, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      Sim.polyline(ctx, [[cx + r1 - 6, yEnd], [cx + r1 + Hw / 2, yEnd + 14], [cx + r1 + Hw + 6, yEnd]], { close: true, fill: C.orange, color: C.orange, width: 1 });
      Sim.text(ctx, 'wasted ' + fx(p.P - Pout, 2) + ' W', cx + r1 + Hw + 10, (cy + yEnd) / 2, { size: 12, bold: true, color: '#c26a00', align: 'left', bg: BG });
      if (wide) Sim.text(ctx, '(heating, friction, sound)', cx + r1 + Hw + 10, (cy + yEnd) / 2 + 16, { size: 11, color: C.muted, align: 'left' });
      else {
        Sim.text(ctx, '(heating,', cx + r1 + Hw + 10, (cy + yEnd) / 2 + 16, { size: 11, color: C.muted, align: 'left' });
        Sim.text(ctx, 'friction, sound)', cx + r1 + Hw + 10, (cy + yEnd) / 2 + 30, { size: 11, color: C.muted, align: 'left' });
      }

      // efficiency curve
      const gb = wide ? { x: ap.w + 64, y: h * 0.5 + 28, w: w - ap.w - 64 - 22, h: h * 0.5 - 28 - 36 } : { x: 52, y: 300, w: w - 70, h: h - 300 - 36 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 25, ymin: 0, ymax: 1, xlabel: 'P_in / W', ylabel: 'efficiency', title: 'efficiency against input power', xstep: 5, ystep: 0.2 }, gb)).axes();
      g.plot((P) => (P < 2 ? null : motorOut(P) / P), { from: 2, to: 24, color: C.navy, width: 2.4 });
      g.dot(p.P, eff, { color: C.red, label: fx(eff * 100, 0) + '%', dx: 8, dy: -12 });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const useful = p.m * G * st.y, Ein = p.P * st.t;
      const out = [
        ['ΔE_grav = mgh =', fx(useful, 3) + ' J'],
        ['E_in = P_in t =', fx(Ein, 3) + ' J']
      ];
      if (st.done) {
        out.push(['efficiency = mgh ÷ E_in =', fx((useful / Math.max(1e-9, Ein)) * 100, 1) + '%', true]);
        out.push(['P_out = mgh/t =', fx(useful / Math.max(1e-9, st.t), 2) + ' W']);
        out.push(['P_out ÷ P_in =', fx((useful / Math.max(1e-9, st.t) / p.P) * 100, 1) + '%', true]);
      } else out.push(['efficiency:', 'lift the load to measure it']);
      return out;
    }
  });
})();
