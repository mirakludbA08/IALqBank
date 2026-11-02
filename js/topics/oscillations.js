/* Oscillations — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const TAU = Math.PI * 2;

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
  /* One RK4 step for x'' = acc(x, v, t). */
  function rk4(x, v, t, h, acc) {
    const a1 = acc(x, v, t);
    const x2 = x + v * h / 2, v2 = v + a1 * h / 2, a2 = acc(x2, v2, t + h / 2);
    const x3 = x + v2 * h / 2, v3 = v + a2 * h / 2, a3 = acc(x3, v3, t + h / 2);
    const x4 = x + v3 * h, v4 = v + a3 * h, a4 = acc(x4, v4, t + h);
    return [x + (h / 6) * (v + 2 * v2 + 2 * v3 + v4), v + (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4)];
  }
  function block(ctx, x, y, w, h, color, label) {
    Sim.rect(ctx, x - w / 2, y - h / 2, w, h, { fill: color || C.blue, stroke: '#1c3d7a', width: 1.5, r: 5 });
    if (label) Sim.text(ctx, label, x, y + 0.5, { size: 12, bold: true, color: '#fff', align: 'center' });
  }

  /* ======================================================================
     1. SHM as the shadow of uniform circular motion
     ====================================================================== */
  Sim.create('#sim-circle', {
    title: 'SHM as the shadow of circular motion',
    height: (w) => (w >= 600 ? 280 : 220),
    controls: [
      { key: 'A', label: 'Amplitude A', min: 1, max: 5, step: 0.5, value: 4, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'f', label: 'Frequency f', min: 0.1, max: 1, step: 0.05, value: 0.25, unit: 'Hz', format: (v) => v.toFixed(2) },
      { key: 'vec', type: 'check', label: 'Show velocity and acceleration', value: true }
    ],
    animate: true,
    onChange(s, key) { if (key === 'f') s.state.t = 0; },
    init(s) { s.state = { t: 0 }; },
    update(s, dt) {
      const st = s.state, per = 2 / s.p.f;
      st.t += dt;
      if (st.t >= per) st.t -= per;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const t = s.state.t, om = TAU * p.f;
      const wide = w >= 600;
      const half = (h - 56) / 2;
      const k = half / 5;                 // px per cm
      const Rmax = 5 * k, R = p.A * k;
      const cx = 18 + Rmax, cy = 26 + half;
      const th = om * t;
      const P = [cx + R * Math.sin(th), cy - R * Math.cos(th)];
      const xcm = p.A * Math.cos(th);
      const S = [cx, cy - xcm * k];
      // circle and diameter
      Sim.circle(ctx, cx, cy, R, { stroke: '#a5d8ff', width: 2 });
      Sim.line(ctx, cx, cy - Rmax - 6, cx, cy + Rmax + 6, { color: C.axis, width: 1.5 });
      Sim.circle(ctx, cx, cy, 2.5, { fill: C.axis });
      // radius and angle
      Sim.line(ctx, cx, cy, P[0], P[1], { color: '#74c0fc', width: 1.5 });
      if (R > 20) {
        ctx.save(); ctx.strokeStyle = C.ink; ctx.lineWidth = 1.3; ctx.beginPath();
        ctx.arc(cx, cy, 18, -Math.PI / 2, -Math.PI / 2 + (th % TAU), false); ctx.stroke(); ctx.restore();
        const am = -Math.PI / 2 + (th % TAU) / 2;
        Sim.text(ctx, 'θ = ωt', cx + Math.cos(am) * 34, cy + Math.sin(am) * 34, { size: 12, color: C.ink, align: 'center', bg: 'rgba(255,255,255,0.8)' });
      }
      // projection line
      const gx0 = cx + Rmax + (wide ? 50 : 26);
      const g = Sim.graph(ctx, { x: gx0, y: cy - half, w: w - gx0 - 18, h: 2 * half, xmin: 0, xmax: 2 / p.f, ymin: -5, ymax: 5, xlabel: 't / s', ylabel: 'x / cm', ticks: true });
      g.axes();
      Sim.line(ctx, P[0], P[1], S[0], S[1], { color: C.grey, dash: [3, 3], width: 1.2 });
      Sim.line(ctx, S[0], S[1], g.px(t), g.py(xcm), { color: C.orange, dash: [4, 4], width: 1.2, alpha: 0.7 });
      g.plot((tt) => p.A * Math.cos(om * tt), { from: 0, to: t, color: C.navy, width: 2.6 });
      g.dot(t, xcm, { color: C.navy });
      // vectors
      if (p.vec) {
        const vmag = p.A * om, amag = p.A * om * om;
        const kv = (0.7 * Rmax) / (5 * om), ka = (0.7 * Rmax) / (5 * om * om);
        const vdir = [Math.cos(th), Math.sin(th)];
        const adir = [-Math.sin(th), Math.cos(th)];
        Sim.arrow(ctx, P[0], P[1], P[0] + vdir[0] * vmag * kv, P[1] + vdir[1] * vmag * kv, { color: C.blue, width: 2, alpha: 0.55 });
        Sim.arrow(ctx, P[0], P[1], P[0] + adir[0] * amag * ka, P[1] + adir[1] * amag * ka, { color: C.red, width: 2, alpha: 0.55 });
        const vs = -vmag * Math.sin(th), as = -amag * Math.cos(th);
        Sim.arrow(ctx, S[0] - 7, S[1], S[0] - 7, S[1] - vs * kv, { color: C.blue, width: 3 });
        Sim.arrow(ctx, S[0] + 7, S[1], S[0] + 7, S[1] - as * ka, { color: C.red, width: 3 });
        if (wide) {
          Sim.text(ctx, 'v', S[0] - 18, S[1] - vs * kv / 2, { size: 13, bold: true, color: C.blue, align: 'center' });
          Sim.text(ctx, 'a', S[0] + 18, S[1] - as * ka / 2, { size: 13, bold: true, color: C.red, align: 'center' });
        }
      }
      Sim.circle(ctx, P[0], P[1], 6, { fill: '#74c0fc', stroke: '#fff', width: 1.5 });
      Sim.circle(ctx, S[0], S[1], 7, { fill: C.navy, stroke: '#fff', width: 2 });
      Sim.text(ctx, 'shadow', cx - 12, cy + Rmax + 14, { size: 11.5, color: C.navy, align: 'right' });
    },
    readout(s) {
      const p = s.p, t = s.state.t, om = TAU * p.f;
      const x = p.A * Math.cos(om * t);
      return [
        ['ω = 2πf =', om.toFixed(2) + ' rad s⁻¹'],
        ['T = 1/f =', (1 / p.f).toFixed(2) + ' s'],
        ['x = A cos ωt =', x.toFixed(2) + ' cm'],
        ['v = −Aω sin ωt =', (-p.A * om * Math.sin(om * t)).toFixed(2) + ' cm s⁻¹'],
        ['a = −Aω² cos ωt =', (-p.A * om * om * Math.cos(om * t)).toFixed(2) + ' cm s⁻²'],
        ['−ω²x =', (-om * om * x).toFixed(2) + ' cm s⁻²', true],
        ['v_max = Aω =', (p.A * om).toFixed(2) + ' cm s⁻¹']
      ];
    }
  });

  /* ======================================================================
     2. Mass–spring oscillator with linked graphs and energy bars
     ====================================================================== */
  Sim.create('#sim-spring', {
    title: 'Mass on a spring: x, v, a and energy',
    height: (w) => (w >= 720 ? 440 : 692),
    controls: [
      { key: 'k', label: 'Spring constant k', min: 5, max: 50, step: 1, value: 20, unit: 'N m⁻¹', format: (v) => v.toFixed(0), onChange: (s) => s.reset() },
      { key: 'm', label: 'Mass m', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'kg', format: (v) => v.toFixed(1), onChange: (s) => s.reset() },
      { key: 'A', label: 'Amplitude A', min: 2, max: 10, step: 1, value: 8, unit: 'cm', format: (v) => v.toFixed(0), onChange: (s) => s.reset() },
      { key: 'b', label: 'Damping', min: 0, max: 2, step: 0.05, value: 0, unit: 'kg s⁻¹', format: (v) => v.toFixed(2) },
      { key: 'tan', type: 'check', label: 'Show gradients', value: false }
    ],
    animate: true,
    init(s) {
      const A = s.p.A / 100;
      s.state = { x: A, v: 0, t: 0, rec: [[0, A, 0, -s.p.k / s.p.m * A]] };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      const T0 = TAU * Math.sqrt(p.m / p.k);
      const slow = clamp(T0 / 1.6, 0.25, 1);
      const tt = dt * slow, n = Math.max(2, Math.ceil(tt / 0.002)), hstep = tt / n;
      const acc = (x, v) => (-p.k * x - p.b * v) / p.m;
      for (let i = 0; i < n; i++) { [st.x, st.v] = rk4(st.x, st.v, st.t, hstep, acc); st.t += hstep; }
      st.rec.push([st.t, st.x, st.v, acc(st.x, st.v)]);
      const tw = Math.max(2, 3 * T0);
      while (st.rec.length > 2 && st.rec[1][0] < st.t - tw * 1.05) st.rec.shift();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 720;
      const A = p.A / 100;
      const om = Math.sqrt(p.k / p.m), T0 = TAU / om;
      const E0 = 0.5 * p.k * A * A;
      const KE = 0.5 * p.m * st.v * st.v, PE = 0.5 * p.k * st.x * st.x;
      const lost = Math.max(0, E0 - KE - PE);
      // scene
      const sceneW = wide ? w - 300 : w;
      const pxcm = wide ? Math.min(16, (sceneW - 200) / 22) : Math.min(11, (sceneW - 120) / 22);
      const xe = wide ? 60 + 11 * pxcm + 30 : 46 + 11 * pxcm;
      const yb = 64;
      Sim.rect(ctx, 10, yb - 34, 12, 60, { fill: '#adb5bd' });
      Sim.line(ctx, 10, yb + 26, sceneW - 10, yb + 26, { color: '#adb5bd', width: 2 });
      Sim.line(ctx, xe, yb - 40, xe, yb + 30, { color: C.grey, dash: [4, 4], width: 1.2 });
      Sim.text(ctx, 'equilibrium', xe, yb - 46, { size: 11, color: C.muted, align: 'center' });
      const bx = xe + st.x * 100 * pxcm;
      const bw = 44;
      Sim.spring(ctx, 22, yb, bx - bw / 2, yb, { coils: 12, width: 9, color: C.axis, lineWidth: 2 });
      block(ctx, bx, yb, bw, 36, C.blue, p.m.toFixed(1) + ' kg');
      const F = -p.k * st.x - p.b * st.v;
      const Fmax = p.k * A;
      if (Math.abs(F) > Fmax * 0.03) Sim.arrow(ctx, bx, yb + 40, bx + (F / Fmax) * 60, yb + 40, { color: C.red, width: 3, label: 'F', labelOffset: 11 });
      const vmax = A * om;
      if (Math.abs(st.v) > vmax * 0.03) Sim.arrow(ctx, bx, yb - 28, bx + (st.v / vmax) * 50, yb - 28, { color: C.navy, width: 2.5, label: 'v', labelOffset: 10 });
      const slow = clamp(T0 / 1.6, 0.25, 1);
      if (slow < 0.999) Sim.text(ctx, 'slow motion × ' + slow.toFixed(2), wide ? sceneW - 10 : w - 10, 14, { size: 11.5, italic: true, color: C.muted, align: 'right' });

      // energy bars
      const eb = wide ? { x: w - 280, y: 26, w: 260 } : { x: 14, y: 124, w: w - 28 };
      const rows = [['kinetic', KE, C.red], ['potential ½kx²', PE, C.purple]];
      if (p.b > 0 || lost > E0 * 0.01) rows.push(['dissipated', lost, C.grey]);
      rows.forEach(([lab, E, col], i) => {
        const y = eb.y + i * 22;
        const lw = wide ? 96 : 92;
        Sim.text(ctx, lab, eb.x, y + 8, { size: 12, color: col, bold: true });
        Sim.rect(ctx, eb.x + lw, y, eb.w - lw, 15, { fill: C.light, r: 4 });
        const f = E0 > 0 ? clamp(E / E0, 0, 1) : 0;
        if (f > 0.004) Sim.rect(ctx, eb.x + lw, y, (eb.w - lw) * f, 15, { fill: col, r: 4 });
      });
      Sim.text(ctx, 'energy (bar length = fraction of ½kA²)', eb.x + eb.w, eb.y + rows.length * 22 + 6, { size: 11, italic: true, color: C.muted, align: 'right' });

      // graphs
      const top = wide ? 158 : 222;
      const tw = Math.max(2, 3 * T0);
      const t1 = Math.max(tw, st.t), t0 = t1 - tw;
      const boxes = [];
      if (wide) {
        const gh = h - top - 34, left = 50, gap = 62;
        const gw = (w - left - 18 - 2 * gap) / 3;
        for (let i = 0; i < 3; i++) boxes.push({ x: left + i * (gw + gap), y: top, w: gw, h: gh });
      } else {
        const rowH = (h - top) / 3;
        for (let i = 0; i < 3; i++) boxes.push({ x: 52, y: top + i * rowH + 6, w: w - 52 - 18, h: rowH - 50 });
      }
      const xm = p.A * 1.2, vm = A * om * 1.2, am = A * om * om * 1.2;
      const gX = Sim.graph(ctx, Object.assign({ xmin: t0, xmax: t1, ymin: -xm, ymax: xm, xlabel: 't / s', ylabel: 'x / cm', title: 'displacement–time' }, boxes[0])).axes();
      const gV = Sim.graph(ctx, Object.assign({ xmin: t0, xmax: t1, ymin: -vm, ymax: vm, xlabel: 't / s', ylabel: 'v / m s⁻¹', title: 'velocity–time' }, boxes[1])).axes();
      const gA = Sim.graph(ctx, Object.assign({ xmin: t0, xmax: t1, ymin: -am, ymax: am, xlabel: 't / s', ylabel: 'a / m s⁻²', title: 'acceleration–time' }, boxes[2])).axes();
      const rec = st.rec;
      gX.path(rec.map((r) => [r[0], r[1] * 100]), { color: C.navy, width: 2.4 });
      gV.path(rec.map((r) => [r[0], r[2]]), { color: C.blue, width: 2.4 });
      gA.path(rec.map((r) => [r[0], r[3]]), { color: C.red, width: 2.4 });
      const L = rec[rec.length - 1];
      if (p.tan) {
        const span = tw * 0.14;
        gX.plot((tt) => L[1] * 100 + L[2] * 100 * (tt - L[0]), { from: L[0] - span, to: L[0] + span, color: C.orange, width: 2.2 });
        gV.plot((tt) => L[2] + L[3] * (tt - L[0]), { from: L[0] - span, to: L[0] + span, color: C.orange, width: 2.2 });
        Sim.text(ctx, 'orange: gradient = v', boxes[0].x + boxes[0].w, boxes[0].y + boxes[0].h - 8, { size: 11.5, bold: true, color: '#b35c00', align: 'right', bg: 'rgba(255,255,255,0.85)' });
        Sim.text(ctx, 'orange: gradient = a', boxes[1].x + boxes[1].w, boxes[1].y + boxes[1].h - 8, { size: 11.5, bold: true, color: '#b35c00', align: 'right', bg: 'rgba(255,255,255,0.85)' });
      }
      [gX, gV, gA].forEach((g) => g.vline(L[0], { color: '#ced4da', dash: [3, 4] }));
      gX.dot(L[0], L[1] * 100, { color: C.navy });
      gV.dot(L[0], L[2], { color: C.blue });
      gA.dot(L[0], L[3], { color: C.red });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const T0 = TAU * Math.sqrt(p.m / p.k);
      const KE = 0.5 * p.m * st.v * st.v, PE = 0.5 * p.k * st.x * st.x;
      return [
        ['T = 2π√(m/k) =', T0.toFixed(2) + ' s', true],
        ['x =', (st.x * 100).toFixed(1) + ' cm'],
        ['v =', st.v.toFixed(3) + ' m s⁻¹'],
        ['a =', ((-p.k * st.x - p.b * st.v) / p.m).toFixed(2) + ' m s⁻²'],
        ['KE + PE =', Sim.fmt(KE + PE, 3) + ' J'],
        ['½kA² =', Sim.fmt(0.5 * p.k * Math.pow(p.A / 100, 2), 3) + ' J']
      ];
    }
  });

  /* ======================================================================
     3. Simple pendulum
     ====================================================================== */
  const PLANETS = { earth: ['Earth', 9.81], moon: ['Moon', 1.62], mars: ['Mars', 3.71], jupiter: ['Jupiter', 24.8] };
  Sim.create('#sim-pendulum', {
    title: 'Simple pendulum',
    height: (w) => (w >= 680 ? 380 : 560),
    controls: [
      { key: 'l', label: 'Length l', min: 0.1, max: 2, step: 0.05, value: 1, unit: 'm', format: (v) => v.toFixed(2), onChange: (s) => s.reset() },
      { key: 'planet', type: 'select', label: 'Where?', value: 'earth', options: [['earth', 'Earth, g = 9.81 N kg⁻¹'], ['moon', 'Moon, g = 1.62 N kg⁻¹'], ['mars', 'Mars, g = 3.71 N kg⁻¹'], ['jupiter', 'Jupiter, g = 24.8 N kg⁻¹']], onChange: (s) => s.reset() },
      { key: 'amp', label: 'Release angle θ₀', min: 2, max: 80, step: 1, value: 10, unit: '°', format: (v) => v.toFixed(0), onChange: (s) => s.reset() }
    ],
    animate: true,
    init(s) {
      const th0 = s.p.amp * Math.PI / 180;
      s.state = { th: th0, w: 0, t: 0, rec: [[0, th0]], cross: [], Tm: null };
      if (!s.running && s.frame > 0) s.play();
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      const g = PLANETS[p.planet][1];
      const acc = (x) => -(g / p.l) * Math.sin(x);
      const n = Math.max(4, Math.ceil(dt / 0.001)), hs = dt / n;
      for (let i = 0; i < n; i++) {
        const prev = st.th;
        [st.th, st.w] = rk4(st.th, st.w, st.t, hs, (x) => acc(x));
        st.t += hs;
        if (prev < 0 && st.th >= 0) {
          const tc = st.t - hs * (st.th / (st.th - prev));
          st.cross.push(tc);
          if (st.cross.length > 3) st.cross.shift();
          if (st.cross.length >= 2) st.Tm = st.cross[st.cross.length - 1] - st.cross[st.cross.length - 2];
        }
      }
      st.rec.push([st.t, st.th]);
      const T0 = TAU * Math.sqrt(p.l / g);
      const tw = Math.max(4, 3 * T0);
      while (st.rec.length > 2 && st.rec[1][0] < st.t - tw * 1.05) st.rec.shift();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const g = PLANETS[p.planet][1];
      const T0 = TAU * Math.sqrt(p.l / g);
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.42), h } : { x: 0, y: 0, w, h: 236 };
      const px0 = sc.x + sc.w / 2, py0 = sc.y + 34;
      const scale = (sc.h - 34 - 40) / 2.0;
      const Lp = p.l * scale;
      const th0 = p.amp * Math.PI / 180;
      Sim.rect(ctx, px0 - 60, py0 - 10, 120, 8, { fill: '#868e96', r: 2 });
      Sim.line(ctx, px0, py0, px0, py0 + Lp + 20, { color: '#ced4da', dash: [4, 4], width: 1.2 });
      ctx.save(); ctx.strokeStyle = 'rgba(0,123,255,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
      ctx.beginPath(); ctx.arc(px0, py0, Lp, Math.PI / 2 - th0, Math.PI / 2 + th0); ctx.stroke(); ctx.restore();
      const bx = px0 + Lp * Math.sin(st.th), by = py0 + Lp * Math.cos(st.th);
      Sim.line(ctx, px0, py0, bx, by, { color: C.ink, width: 2 });
      Sim.circle(ctx, bx, by, Math.max(7, Math.min(13, Lp * 0.08)), { fill: C.blue, stroke: '#fff', width: 2 });
      Sim.text(ctx, 'l = ' + p.l.toFixed(2) + ' m', px0 + 8, py0 + 18, { size: 12, color: C.muted });
      Sim.text(ctx, PLANETS[p.planet][0], sc.x + 12, sc.y + 14, { size: 12.5, bold: true, color: C.navy });

      // θ–t graph
      const gb = wide ? { x: sc.w + 54, y: 30, w: w - sc.w - 54 - 22, h: h - 30 - 44 } : { x: 50, y: sc.h + 30, w: w - 50 - 18, h: h - sc.h - 30 - 40 };
      const tw = Math.max(4, 3 * T0);
      const t1 = Math.max(tw, st.t), t0 = t1 - tw;
      const ym = Math.max(5, p.amp * 1.25);
      const gr = Sim.graph(ctx, Object.assign({ xmin: t0, xmax: t1, ymin: -ym, ymax: ym, xlabel: 't / s', ylabel: 'θ / °', title: 'angle against time' }, gb)).axes();
      const om0 = TAU / T0;
      gr.plot((tt) => p.amp * Math.cos(om0 * tt), { from: Math.max(0, t0), to: st.t, color: C.orange, width: 1.8, dash: [6, 4] });
      gr.path(st.rec.map((r) => [r[0], r[1] * 180 / Math.PI]), { color: C.navy, width: 2.4 });
      const L = st.rec[st.rec.length - 1];
      gr.dot(L[0], L[1] * 180 / Math.PI, { color: C.navy });
      Sim.text(ctx, 'dashed: SHM prediction θ₀ cos ωt', gb.x + gb.w, gb.y + gb.h + 30, { size: 11.5, color: '#b35c00', align: 'right' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const g = PLANETS[p.planet][1];
      const T0 = TAU * Math.sqrt(p.l / g);
      const out = [
        ['T = 2π√(l/g) =', T0.toFixed(3) + ' s', true],
        ['measured period =', st.Tm ? st.Tm.toFixed(3) + ' s' : 'timing…']
      ];
      if (st.Tm) out.push(['longer than 2π√(l/g) by', (100 * (st.Tm - T0) / T0).toFixed(1) + '% (large-angle effect, beyond the spec)']);
      return out;
    }
  });

  /* ======================================================================
     4. Driven oscillator and the resonance curve
     ====================================================================== */
  const F0R = 1.0, W0 = TAU * F0R, DRV = 0.5;   // natural frequency / Hz, driver amplitude / cm
  const ampSS = (f, gam) => { const w = TAU * f; return (W0 * W0 * DRV) / Math.sqrt(Math.pow(W0 * W0 - w * w, 2) + Math.pow(gam * w, 2)); };
  Sim.create('#sim-resonance', {
    title: 'Forced oscillations and resonance',
    height: (w) => (w >= 680 ? 370 : 600),
    controls: [
      { key: 'fd', label: 'Driving frequency', min: 0.2, max: 2, step: 0.01, value: 0.6, unit: 'Hz', format: (v) => v.toFixed(2) },
      { key: 'gam', label: 'Damping', min: 0.3, max: 3, step: 0.1, value: 0.4, format: (v) => (v < 0.75 ? 'light' : v < 1.6 ? 'medium' : 'heavy') + ' (' + v.toFixed(1) + ' s⁻¹)' },
      { key: 'cmp', type: 'check', label: 'Compare light and heavy damping', value: true }
    ],
    animate: true,
    init(s) { s.state = { x: 0, v: 0, t: 0, ph: 0, hist: [] }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      const wd = TAU * p.fd;
      const n = Math.max(4, Math.ceil(dt / 0.002)), hs = dt / n;
      for (let i = 0; i < n; i++) {
        const ph = st.ph;
        const acc = (x, v, t) => -W0 * W0 * (x - DRV * Math.cos(ph + wd * (t - st.t))) - p.gam * v;
        [st.x, st.v] = rk4(st.x, st.v, st.t, hs, acc);
        st.t += hs;
        st.ph += wd * hs;
      }
      st.hist.push([st.t, Math.abs(st.x)]);
      const keep = 1 / p.fd + 0.05;
      while (st.hist.length > 2 && st.hist[0][0] < st.t - keep) st.hist.shift();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: 230, h } : { x: 0, y: 0, w, h: 300 };
      const cx = sc.x + sc.w / 2;
      const pxcm = 6.5;
      const yd = DRV * Math.cos(st.ph);
      const topY = sc.y + 30, rodY = topY + 34 - yd * pxcm;
      const eqY = topY + 34 + (wide ? 150 : 128);
      const my = eqY - st.x * pxcm;
      Sim.rect(ctx, cx - 50, topY - 8, 100, 30, { fill: '#495057', r: 5 });
      Sim.text(ctx, 'driver ' + p.fd.toFixed(2) + ' Hz', cx, topY + 7, { size: 12, bold: true, color: '#fff', align: 'center' });
      Sim.line(ctx, cx, topY + 22, cx, rodY, { color: '#868e96', width: 5 });
      Sim.spring(ctx, cx, rodY, cx, my - 18, { coils: 10, width: 10, color: C.axis, lineWidth: 2 });
      Sim.line(ctx, cx - 60, eqY, cx + 60, eqY, { color: C.grey, dash: [4, 4], width: 1.2 });
      block(ctx, cx, my, 46, 36, C.blue, '');
      const amp = st.hist.reduce((a, q) => Math.max(a, q[1]), 0);
      Sim.line(ctx, cx + 44, eqY - amp * pxcm, cx + 64, eqY - amp * pxcm, { color: C.red, width: 2 });
      Sim.line(ctx, cx + 44, eqY + amp * pxcm, cx + 64, eqY + amp * pxcm, { color: C.red, width: 2 });
      Sim.text(ctx, 'amplitude', cx + 68, eqY - amp * pxcm, { size: 11, color: C.red, align: 'left' });

      // resonance curve
      const gb = wide ? { x: sc.w + 56, y: 30, w: w - sc.w - 56 - 22, h: h - 30 - 44 } : { x: 50, y: sc.h + 34, w: w - 50 - 18, h: h - sc.h - 34 - 42 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2, ymin: 0, ymax: 12, ystep: 2, xlabel: 'driving frequency / Hz', ylabel: 'amplitude / cm', title: 'amplitude against driving frequency' }, gb)).axes();
      if (p.cmp) {
        [0.3, 2.0].forEach((gm) => g.plot((f) => ampSS(f, gm), { color: '#ced4da', width: 1.6 }));
        g.label(2, 9.4, 'grey: light and heavy damping', { size: 11, color: C.muted, align: 'right', bold: false });
      }
      g.plot((f) => ampSS(f, p.gam), { color: C.navy, width: 2.6 });
      g.vline(F0R, { color: C.green, dash: [5, 4] });
      g.label(F0R + 0.03, 11.2, 'natural frequency f₀', { size: 11.5, color: C.green, align: 'left' });
      const ss = ampSS(p.fd, p.gam);
      Sim.circle(ctx, g.px(p.fd), g.py(Math.min(12, ss)), 7, { stroke: C.navy, width: 2 });
      g.dot(p.fd, Math.min(12, amp), { color: C.red });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const amp = st.hist.reduce((a, q) => Math.max(a, q[1]), 0);
      return [
        ['driving frequency =', p.fd.toFixed(2) + ' Hz'],
        ['natural frequency f₀ =', F0R.toFixed(2) + ' Hz'],
        ['amplitude now =', amp.toFixed(2) + ' cm', true],
        ['steady-state amplitude =', ampSS(p.fd, p.gam).toFixed(2) + ' cm'],
        ['driver amplitude =', DRV.toFixed(1) + ' cm']
      ];
    }
  });

  /* ======================================================================
     5. Core practical 16: unknown mass from resonant frequencies
     ====================================================================== */
  const KSP = 25, MSP_EFF = 0.010, GAM16 = 0.5, DRV16 = 0.3;
  const omega0 = (m) => Math.sqrt(KSP / (m + MSP_EFF));
  const amp16 = (f, m) => { const w = TAU * f, w0 = omega0(m); return (w0 * w0 * DRV16) / Math.sqrt(Math.pow(w0 * w0 - w * w, 2) + Math.pow(GAM16 * w, 2)); };
  Sim.create('#sim-cp16', {
    title: 'Virtual experiment: resonance and an unknown mass',
    height: (w) => (w >= 680 ? 390 : 640),
    controls: [
      { key: 'mass', type: 'select', label: 'Mass on the spring', value: '0.1', options: [['0.1', '100 g'], ['0.2', '200 g'], ['0.3', '300 g'], ['0.4', '400 g'], ['0.5', '500 g'], ['x', 'Unknown mass']], onChange: (s) => { s.state.peak = 0; } },
      { key: 'f', label: 'Signal generator frequency', min: 0.5, max: 3, step: 0.01, value: 1.5, unit: 'Hz', format: (v) => v.toFixed(2) },
      { type: 'button', label: 'Record resonant frequency', onClick: (s) => {
        const st = s.state, key = s.p.mass;
        if (key === 'x') st.fx = s.p.f;
        else { st.data[key] = s.p.f; }
      } },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = {}; s.state.fx = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: {}, fx: null, amp: 0, peak: 0, ph: 0, mx: Math.round((0.15 + Math.random() * 0.3) * 100) / 100 }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      const m = p.mass === 'x' ? st.mx : +p.mass;
      const target = amp16(p.f, m);
      st.amp += (target - st.amp) * (1 - Math.exp(-dt / 0.45));
      st.peak = Math.max(st.peak * Math.exp(-dt / 30), st.amp);
      st.ph += TAU * p.f * dt;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: 260, h } : { x: 0, y: 0, w, h: 300 };
      const cx = sc.x + (wide ? 120 : sc.w / 2 - 20);
      const pxcm = 6;
      const topY = sc.y + 30;
      const x = st.amp * Math.cos(st.ph);
      const yd = DRV16 * Math.cos(st.ph);
      const rodY = topY + 32 - yd * pxcm, eqY = topY + 32 + 150;
      const my = eqY - x * pxcm;
      // signal generator and vibration generator
      Sim.rect(ctx, cx - 44, topY - 10, 88, 28, { fill: '#495057', r: 5 });
      Sim.text(ctx, 'vibration gen.', cx, topY + 4, { size: 11, bold: true, color: '#fff', align: 'center' });
      Sim.line(ctx, cx, topY + 18, cx, rodY, { color: '#868e96', width: 5 });
      const sgx = sc.x + 10, sgy = sc.y + sc.h - 56;
      Sim.rect(ctx, sgx, sgy, 96, 40, { fill: '#212529', r: 6 });
      Sim.text(ctx, p.f.toFixed(2) + ' Hz', sgx + 86, sgy + 14, { size: 14, bold: true, color: '#69db7c', align: 'right' });
      Sim.text(ctx, 'signal gen.', sgx + 86, sgy + 31, { size: 10.5, color: '#adb5bd', align: 'right' });
      Sim.spring(ctx, cx, rodY, cx, my - 18, { coils: 11, width: 10, color: C.axis, lineWidth: 2 });
      Sim.line(ctx, cx - 50, eqY, cx + 50, eqY, { color: C.grey, dash: [4, 4], width: 1.2 });
      const lab = p.mass === 'x' ? '?' : Math.round(+p.mass * 1000) + ' g';
      block(ctx, cx, my, 50, 36, p.mass === 'x' ? C.purple : C.blue, lab);
      // amplitude meter
      const mx0 = cx + 70, mTop = topY + 40, mH = 200, Amax = 10;
      Sim.rect(ctx, mx0, mTop, 18, mH, { fill: C.light, r: 4 });
      const fa = clamp(st.amp / Amax, 0, 1), fp = clamp(st.peak / Amax, 0, 1);
      Sim.rect(ctx, mx0, mTop + mH * (1 - fa), 18, mH * fa, { fill: C.red, r: 4 });
      Sim.line(ctx, mx0 - 4, mTop + mH * (1 - fp), mx0 + 22, mTop + mH * (1 - fp), { color: C.navy, width: 2 });
      Sim.text(ctx, 'amplitude', mx0 + 9, mTop + mH + 14, { size: 11, color: C.muted, align: 'center' });
      Sim.text(ctx, 'peak', mx0 + 26, mTop + mH * (1 - fp), { size: 10.5, color: C.navy, align: 'left' });

      // T² against m
      const gb = wide ? { x: sc.w + 60, y: 30, w: w - sc.w - 60 - 22, h: h - 30 - 44 } : { x: 54, y: sc.h + 34, w: w - 54 - 18, h: h - sc.h - 34 - 42 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.6, ymin: 0, ymax: 1.0, xstep: 0.1, ystep: 0.2, xlabel: 'm / kg', ylabel: 'T² / s²', title: 'T² against mass' }, gb)).axes();
      const pts = Object.keys(st.data).map((k) => [+k, 1 / Math.pow(st.data[k], 2)]);
      const fit = pts.length >= 2 ? fitLine(pts) : null;
      if (fit) g.plot((mm) => fit.m * mm + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (st.fx && fit && Math.abs(fit.m) > 1e-6) {
        const T2 = 1 / (st.fx * st.fx), mEst = (T2 - fit.c) / fit.m;
        if (mEst > 0 && mEst < 0.6) {
          Sim.line(ctx, g.px(0), g.py(T2), g.px(mEst), g.py(T2), { color: C.purple, dash: [5, 4], width: 1.6 });
          Sim.line(ctx, g.px(mEst), g.py(T2), g.px(mEst), g.py(0), { color: C.purple, dash: [5, 4], width: 1.6 });
          g.dot(mEst, T2, { color: C.purple, r: 5 });
          g.label(mEst + 0.01, 0.05, 'unknown ≈ ' + mEst.toFixed(2) + ' kg', { size: 12, color: C.purple, align: 'left', bg: 'rgba(255,255,255,0.9)' });
        }
      }
      if (!pts.length) Sim.text(ctx, w < 520 ? 'Find a resonance, then record it' : 'Find a resonance, then press “Record resonant frequency”', gb.x + gb.w / 2, gb.y + gb.h * 0.3, { size: 12.5, italic: true, color: C.muted, align: 'center' });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const out = [['amplitude =', st.amp.toFixed(2) + ' cm', true], ['T² = 1/f² =', (1 / (p.f * p.f)).toFixed(3) + ' s²']];
      const pts = Object.keys(st.data).map((k) => [+k, 1 / Math.pow(st.data[k], 2)]);
      const fit = pts.length >= 2 ? fitLine(pts) : null;
      out.push(['masses recorded:', String(pts.length)]);
      if (fit && fit.m > 0) {
        out.push(['gradient = 4π²/k =', fit.m.toFixed(2) + ' s² kg⁻¹']);
        out.push(['k =', (4 * Math.PI * Math.PI / fit.m).toFixed(1) + ' N m⁻¹']);
        if (st.fx) {
          const mEst = (1 / (st.fx * st.fx) - fit.c) / fit.m;
          out.push(['unknown mass ≈', mEst.toFixed(3) + ' kg', true]);
          out.push(['(actual:', st.mx.toFixed(3) + ' kg)']);
        }
      }
      return out;
    }
  });
})();
