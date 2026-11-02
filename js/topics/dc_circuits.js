/* Circuits, Potential Dividers & E.M.F. — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const INK = C.ink;

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
  function ohms(R) {
    if (R >= 1e6) return Sim.fmt(R / 1e6, 3) + ' MΩ';
    if (R >= 1e3) return Sim.fmt(R / 1e3, 3) + ' kΩ';
    return Sim.fmt(R, 3) + ' Ω';
  }

  /* ---------- circuit symbols ---------- */
  function rot(ctx, x, y, ang, fn) { ctx.save(); ctx.translate(x, y); ctx.rotate(ang || 0); fn(); ctx.restore(); }
  function resistor(ctx, x, y, ang, fill) { rot(ctx, x, y, ang, () => Sim.rect(ctx, -22, -8, 44, 16, { fill: fill || '#fff', stroke: INK, width: 2 })); }
  function ldr(ctx, x, y, ang) {
    rot(ctx, x, y, ang, () => {
      Sim.circle(ctx, 0, 0, 27, { fill: '#fff', stroke: INK, width: 1.8 });
      Sim.rect(ctx, -17, -7, 34, 14, { fill: '#fff', stroke: INK, width: 2 });
    });
    // arrows pointing in (drawn unrotated so they always come from the upper left)
    Sim.arrow(ctx, x - 44, y - 40, x - 22, y - 18, { color: INK, width: 1.6, head: 7 });
    Sim.arrow(ctx, x - 34, y - 48, x - 12, y - 26, { color: INK, width: 1.6, head: 7 });
  }
  function thermistor(ctx, x, y, ang) {
    rot(ctx, x, y, ang, () => {
      Sim.rect(ctx, -22, -8, 44, 16, { fill: '#fff', stroke: INK, width: 2 });
      Sim.line(ctx, -16, 14, 18, -14, { color: INK, width: 1.8 });
      Sim.line(ctx, -26, 14, -16, 14, { color: INK, width: 1.8 });
    });
  }
  function meter(ctx, x, y, letter) {
    Sim.circle(ctx, x, y, 13, { fill: '#fff', stroke: INK, width: 2 });
    Sim.text(ctx, letter, x, y + 1, { size: 14, bold: true, align: 'center', color: INK });
  }
  /* cell on a vertical wire, positive (long) plate on top */
  function cellV(ctx, x, y) {
    Sim.rect(ctx, x - 18, y - 9, 36, 18, { fill: '#fff' });
    Sim.line(ctx, x - 15, y - 5, x + 15, y - 5, { color: INK, width: 2 });
    Sim.line(ctx, x - 8, y + 5, x + 8, y + 5, { color: INK, width: 4.5 });
    Sim.text(ctx, '+', x + 20, y - 11, { size: 13, bold: true, color: C.red, align: 'center' });
  }
  /* cell on a horizontal wire, positive (long) plate on the right */
  function cellH(ctx, x, y) {
    Sim.rect(ctx, x - 9, y - 18, 18, 36, { fill: '#fff' });
    Sim.line(ctx, x + 5, y - 15, x + 5, y + 15, { color: INK, width: 2 });
    Sim.line(ctx, x - 5, y - 8, x - 5, y + 8, { color: INK, width: 4.5 });
    Sim.text(ctx, '+', x + 14, y - 18, { size: 13, bold: true, color: C.red, align: 'center' });
  }
  function lamp(ctx, x, y, on) {
    if (on) Sim.circle(ctx, x, y, 24, { fill: 'rgba(255,212,59,0.55)' });
    Sim.circle(ctx, x, y, 12, { fill: on ? '#fff3bf' : '#fff', stroke: INK, width: 2 });
    const d = 8.5;
    Sim.line(ctx, x - d, y - d, x + d, y + d, { color: INK, width: 2 });
    Sim.line(ctx, x - d, y + d, x + d, y - d, { color: INK, width: 2 });
  }
  function node(ctx, x, y) { Sim.circle(ctx, x, y, 3.5, { fill: INK }); }
  function wire(ctx, pts) { Sim.polyline(ctx, pts, { color: INK, width: 2 }); }

  /* point at arc length d along a polyline */
  function along(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (d <= L) { const k = L > 0 ? d / L : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
      d -= L;
    }
    return pts[pts.length - 1];
  }
  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  function flowDots(ctx, pts, phase) {
    const L = pathLen(pts);
    if (L < 1) return;
    const n = Math.max(1, Math.round(L / 26));
    for (let i = 0; i < n; i++) {
      const d = (((phase + (i * L) / n) % L) + L) % L;
      const q = along(pts, d);
      Sim.circle(ctx, q[0], q[1], 3.6, { fill: C.orange, stroke: '#fff', width: 1 });
    }
  }

  /* ======================================================================
     1. Series and parallel, with a potential-height graph
     ====================================================================== */
  function solveCircuit(p) {
    if (p.mode === 'series') {
      const R = p.R1 + p.R2, I = p.V / R;
      return { R, I, I1: I, I2: I, V1: I * p.R1, V2: I * p.R2 };
    }
    const I1 = p.V / p.R1, I2 = p.V / p.R2;
    return { R: (p.R1 * p.R2) / (p.R1 + p.R2), I: I1 + I2, I1, I2, V1: p.V, V2: p.V };
  }

  Sim.create('#sim-circuit', {
    title: 'Series and parallel: current, p.d. and potential',
    height: (w) => (w >= 720 ? 340 : 590),
    controls: [
      { key: 'mode', type: 'select', label: 'Connection', value: 'series', options: [['series', 'Series'], ['parallel', 'Parallel']] },
      { key: 'V', label: 'Supply e.m.f. ε', min: 1, max: 12, step: 0.5, value: 6, unit: 'V', format: (v) => v.toFixed(1) },
      { key: 'R1', label: 'Resistance R₁', min: 1, max: 20, step: 1, value: 4, unit: 'Ω', format: (v) => v.toFixed(0) },
      { key: 'R2', label: 'Resistance R₂', min: 1, max: 20, step: 1, value: 12, unit: 'Ω', format: (v) => v.toFixed(0) },
      { key: 'flow', type: 'check', label: 'Show the charges moving', value: true }
    ],
    animate: true,
    init(s) { s.state = { main: 0, b1: 0, b2: 0, t: 0 }; },
    update(s, dt) {
      const st = s.state;
      const c = solveCircuit(s.p);
      const k = Math.min(40, 170 / Math.max(c.I, 1e-6));
      st.main += k * c.I * dt;
      st.b1 += k * c.I1 * dt;
      st.b2 += k * c.I2 * dt;
      st.t += dt;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const c = solveCircuit(p);
      const wide = w >= 720;
      const bw = wide ? Math.round(w * 0.5) : w, bh = wide ? h : 290;
      const x0 = 40, x1 = bw - 26, y1 = 56, y3 = bh - 44;
      const yc = (y1 + y3) / 2;
      const series = p.mode === 'series';
      let paths;
      if (series) {
        const loop = [[x0, y3], [x0, y1], [x1, y1], [x1, y3], [x0, y3]];
        wire(ctx, loop);
        paths = [[loop, st.main]];
        const xr1 = x0 + (x1 - x0) * 0.34, xr2 = x0 + (x1 - x0) * 0.72;
        if (p.flow) flowDots(ctx, loop, st.main);
        resistor(ctx, xr1, y1, 0);
        resistor(ctx, xr2, y1, 0);
        Sim.text(ctx, 'R₁ = ' + p.R1 + ' Ω', xr1, y1 + 22, { size: 12, bold: true, align: 'center' });
        Sim.text(ctx, 'R₂ = ' + p.R2 + ' Ω', xr2, y1 + 22, { size: 12, bold: true, align: 'center' });
        Sim.text(ctx, 'V₁ = ' + c.V1.toFixed(2) + ' V', xr1, y1 - 20, { size: 13, bold: true, color: C.red, align: 'center' });
        Sim.text(ctx, 'V₂ = ' + c.V2.toFixed(2) + ' V', xr2, y1 - 20, { size: 13, bold: true, color: C.red, align: 'center' });
        meter(ctx, (x0 + x1) / 2, y3, 'A');
        Sim.text(ctx, 'I = ' + c.I.toFixed(2) + ' A', (x0 + x1) / 2, y3 + 24, { size: 13, bold: true, color: C.blue, align: 'center' });
        Sim.text(ctx, 'same current everywhere', (x0 + x1) / 2 + 10, yc, { size: 12, color: C.muted, align: 'center', italic: true });
      } else {
        const xa = x0 + (x1 - x0) * 0.2, y2 = yc + 6;
        const main = [[x1, y2], [x1, y3], [x0, y3], [x0, y1], [xa, y1]];
        const b1 = [[xa, y1], [x1, y1], [x1, y2]];
        const b2 = [[xa, y1], [xa, y2], [x1, y2]];
        wire(ctx, main); wire(ctx, b1); wire(ctx, b2);
        if (p.flow) { flowDots(ctx, main, st.main); flowDots(ctx, b1, st.b1); flowDots(ctx, b2, st.b2); }
        node(ctx, xa, y1); node(ctx, x1, y2);
        const xr = xa + (x1 - xa) * 0.62, xm = xa + (x1 - xa) * 0.24;
        resistor(ctx, xr, y1, 0);
        resistor(ctx, xr, y2, 0);
        meter(ctx, xm, y1, 'A');
        meter(ctx, xm, y2, 'A');
        meter(ctx, (x0 + x1) / 2, y3, 'A');
        Sim.text(ctx, 'R₁ = ' + p.R1 + ' Ω', xr, y1 + 22, { size: 12, bold: true, align: 'center' });
        Sim.text(ctx, 'R₂ = ' + p.R2 + ' Ω', xr, y2 + 22, { size: 12, bold: true, align: 'center' });
        Sim.text(ctx, 'V₁ = ' + c.V1.toFixed(2) + ' V', xr, y1 - 20, { size: 13, bold: true, color: C.red, align: 'center' });
        Sim.text(ctx, 'V₂ = ' + c.V2.toFixed(2) + ' V', xr, y2 - 20, { size: 13, bold: true, color: C.red, align: 'center' });
        Sim.text(ctx, 'I₁ = ' + c.I1.toFixed(2) + ' A', xm, y1 - 22, { size: 12.5, bold: true, color: C.blue, align: 'center' });
        Sim.text(ctx, 'I₂ = ' + c.I2.toFixed(2) + ' A', xm, y2 + 24, { size: 12.5, bold: true, color: C.blue, align: 'center' });
        Sim.text(ctx, 'I = ' + c.I.toFixed(2) + ' A', (x0 + x1) / 2, y3 + 24, { size: 13, bold: true, color: C.blue, align: 'center' });
      }
      cellV(ctx, x0, yc);
      Sim.text(ctx, 'ε = ' + p.V.toFixed(1) + ' V', x0 + 24, yc + 24, { size: 12, bold: true, color: INK });
      Sim.arrow(ctx, x0 + 10, y1 + 34, x0 + 10, y1 + 8, { color: C.red, width: 2, head: 8 });
      Sim.text(ctx, 'I', x0 + 20, y1 + 24, { size: 13, bold: true, color: C.red });

      /* potential-height graph */
      const gb = wide ? { x: bw + 56, y: 40, w: w - bw - 56 - 18, h: h - 40 - 52 } : { x: 52, y: bh + 40, w: w - 52 - 16, h: h - bh - 40 - 50 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 1, ymin: 0, ymax: 12, ystep: 2, xstep: 2, ylabel: 'potential / V', title: 'Potential "height" round the circuit' }, gb)).axes();
      const cellX = [0.03, 0.1], r1X = [0.3, 0.44], r2X = [0.62, 0.76];
      const pathS = [[0, 0], [cellX[0], 0], [cellX[1], p.V], [r1X[0], p.V], [r1X[1], p.V - c.V1], [r2X[0], p.V - c.V1], [r2X[1], 0], [1, 0]];
      const path1 = [[0, 0], [cellX[0], 0], [cellX[1], p.V], [r1X[0], p.V], [r1X[1], 0], [1, 0]];
      const path2 = [[0, 0], [cellX[0], 0], [cellX[1], p.V], [r2X[0], p.V], [r2X[1], 0], [1, 0]];
      // shading of the component positions
      [[cellX, 'rgba(47,158,68,0.10)', 'cell'], [r1X, 'rgba(224,49,49,0.08)', 'R₁'], [r2X, 'rgba(224,49,49,0.08)', 'R₂']].forEach(([xr, col, lab]) => {
        Sim.rect(ctx, g.px(xr[0]), g.y, g.px(xr[1]) - g.px(xr[0]), g.h, { fill: col });
        Sim.text(ctx, lab, (g.px(xr[0]) + g.px(xr[1])) / 2, g.y + g.h + 14, { size: 12, bold: true, align: 'center', color: lab === 'cell' ? C.green : C.red });
      });
      const toPx = (pts) => pts.map((q) => [g.px(q[0]), g.py(q[1])]);
      const mover = (pts, phase, col) => {
        const pp = toPx(pts), L = pathLen(pp);
        const q = along(pp, ((phase % L) + L) % L);
        Sim.circle(ctx, q[0], q[1], 6, { fill: col, stroke: '#fff', width: 2 });
      };
      const sp = (st.t * 70);
      if (series) {
        g.path(pathS, { color: C.navy, width: 3 });
        Sim.text(ctx, '−' + c.V1.toFixed(1) + ' V', g.px(r1X[1]) + 4, g.py(p.V - c.V1 / 2), { size: 12, bold: true, color: C.red });
        Sim.text(ctx, '−' + c.V2.toFixed(1) + ' V', g.px(r2X[1]) + 4, g.py((p.V - c.V1) / 2), { size: 12, bold: true, color: C.red });
        if (p.flow) mover(pathS, sp, C.orange);
      } else {
        g.path(path1, { color: C.navy, width: 3 });
        g.path(path2, { color: C.purple, width: 3, dash: [7, 5] });
        Sim.text(ctx, 'via R₁', g.px(r1X[1]) + 6, g.py(p.V * 0.35), { size: 12, bold: true, color: C.navy });
        Sim.text(ctx, 'via R₂', g.px(r2X[1]) + 6, g.py(p.V * 0.35), { size: 12, bold: true, color: C.purple });
        if (p.flow) { mover(path1, sp, C.orange); mover(path2, sp + 60, C.orange); }
      }
      Sim.text(ctx, '+' + p.V.toFixed(1) + ' V', g.px(cellX[1]) + 4, g.py(p.V) - 10, { size: 12, bold: true, color: C.green });
    },
    readout(s) {
      const p = s.p, c = solveCircuit(p);
      if (p.mode === 'series') {
        return [
          ['total R = R₁ + R₂ =', c.R.toFixed(1) + ' Ω'],
          ['I = ε / total R =', c.I.toFixed(3) + ' A'],
          ['V₁ = IR₁ =', c.V1.toFixed(2) + ' V'],
          ['V₂ = IR₂ =', c.V2.toFixed(2) + ' V'],
          ['V₁ + V₂ =', (c.V1 + c.V2).toFixed(2) + ' V = ε (energy)', true]
        ];
      }
      return [
        ['1/total R = 1/R₁ + 1/R₂, so total R =', c.R.toFixed(2) + ' Ω'],
        ['I₁ = ε/R₁ =', c.I1.toFixed(3) + ' A'],
        ['I₂ = ε/R₂ =', c.I2.toFixed(3) + ' A'],
        ['I₁ + I₂ =', c.I.toFixed(3) + ' A = I (charge)', true],
        ['p.d. across each branch =', p.V.toFixed(2) + ' V']
      ];
    }
  });

  /* ======================================================================
     2. Potential along a uniform resistance wire
     ====================================================================== */
  Sim.create('#sim-wire', {
    title: 'Potential along a uniform resistance wire',
    height: (w) => (w >= 640 ? 430 : 450),
    controls: [
      { key: 'V0', label: 'p.d. across the whole wire V₀', min: 1, max: 6, step: 0.1, value: 3, unit: 'V', format: (v) => v.toFixed(1) },
      { key: 'x', label: 'Sliding contact: distance x from A', min: 0, max: 1, step: 0.01, value: 0.35, unit: 'm', format: (v) => v.toFixed(2) }
    ],
    init(s) { s.state = { drag: false }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const xA = 40, xB = w - 40, yw = 112;
      const X = (x) => xA + x * (xB - xA);
      st.geo = { xA, xB, yw };
      // cell and supply leads
      const xc = (xA + xB) / 2, yc = 46;
      wire(ctx, [[xA, yw], [xA, yc], [xB, yc], [xB, yw]]);
      cellH(ctx, xc, yc);
      Sim.text(ctx, 'V₀ = ' + p.V0.toFixed(1) + ' V', xc + 22, yc - 22, { size: 12.5, bold: true, color: INK });
      // the wire, coloured by potential
      for (let i = 0; i < 60; i++) {
        const a = i / 60, b = (i + 1) / 60;
        Sim.line(ctx, X(a), yw, X(b) + 0.5, yw, { color: 'rgb(' + Math.round(40 + 200 * a) + ',' + Math.round(110 - 60 * a) + ',' + Math.round(230 - 190 * a) + ')', width: 7, cap: 'butt' });
      }
      Sim.text(ctx, 'A', xA - 10, yw, { size: 13, bold: true, color: C.blue, align: 'right' });
      Sim.text(ctx, '0 V', xA - 10, yw + 16, { size: 11, bold: true, color: C.blue, align: 'right' });
      Sim.text(ctx, 'B', xB + 10, yw, { size: 13, bold: true, color: C.red });
      Sim.text(ctx, p.V0.toFixed(1) + ' V', xB + 8, yw + 16, { size: 11, bold: true, color: C.red });
      // ruler ticks
      for (let i = 0; i <= 10; i++) Sim.line(ctx, X(i / 10), yw + 6, X(i / 10), yw + (i % 5 ? 10 : 14), { color: C.muted, width: 1 });
      // sliding contact and voltmeter between A and the contact
      const xs = X(p.x), ym = yw + 62;
      const xv = Math.max(xA + 34, (xA + xs) / 2);
      wire(ctx, [[xA, yw + 4], [xA, ym], [xv - 13, ym]]);
      if (xs >= xv + 24) wire(ctx, [[xv + 13, ym], [xs, ym], [xs, yw + 10]]);
      else wire(ctx, [[xv + 13, ym], [xv + 26, ym], [xv + 26, ym - 26], [xs, ym - 26], [xs, yw + 10]]);
      meter(ctx, xv, ym, 'V');
      ctx.save();
      ctx.fillStyle = C.navy;
      ctx.beginPath();
      ctx.moveTo(xs, yw + 3); ctx.lineTo(xs - 8, yw - 12); ctx.lineTo(xs + 8, yw - 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      Sim.text(ctx, '↔ drag', Sim.clamp(xs, xA + 20, xB - 20), yw - 22, { size: 11.5, color: C.muted, align: 'center' });
      const Vx = p.V0 * p.x;
      Sim.text(ctx, Vx.toFixed(2) + ' V', xv, ym + 24, { size: 13, bold: true, color: C.blue, align: 'center' });
      // graph of p.d. against x
      const gb = { x: 56, y: ym + 54, w: w - 56 - 20, h: h - ym - 54 - 34 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 1, ymin: 0, ymax: 6, xstep: 0.2, ystep: 1, xlabel: 'x / m', ylabel: 'p.d. between A and contact / V' }, gb)).axes();
      g.plot((x) => p.V0 * x, { color: C.navy, width: 2.6 });
      g.vline(p.x, { color: C.grey });
      g.dot(p.x, Vx, { color: C.red, r: 6 });
    },
    readout(s) {
      const p = s.p;
      return [
        ['x =', p.x.toFixed(2) + ' m'],
        ['p.d. between A and contact = V₀x/L =', (p.V0 * p.x).toFixed(2) + ' V', true],
        ['potential gradient V₀/L =', p.V0.toFixed(1) + ' V m⁻¹'],
        ['p.d. between contact and B =', (p.V0 * (1 - p.x)).toFixed(2) + ' V']
      ];
    },
    pointer: {
      touchAction: 'pan-y',
      cursor: 'grab',
      down(s, pt) {
        const st = s.state, g = st.geo;
        if (!g) return;
        const xs = g.xA + s.p.x * (g.xB - g.xA);
        st.drag = Math.abs(pt.x - xs) < 26 && Math.abs(pt.y - g.yw) < 34;
      },
      move(s, pt) {
        const st = s.state, g = st.geo;
        if (!pt.down || !st.drag || !g) return;
        s.set('x', Sim.clamp(Math.round(((pt.x - g.xA) / (g.xB - g.xA)) * 100) / 100, 0, 1));
      },
      up(s) { s.state.drag = false; }
    }
  });

  /* ======================================================================
     3. Sensor in a potential divider
     ====================================================================== */
  const VIN = 6.0, VTH = 3.0;
  const R_LDR = (L) => Math.pow(10, 6 - (3 * L) / 100);
  const R_NTC = (T) => 10e3 * Math.exp(3900 * (1 / (T + 273.15) - 1 / 298.15));
  function divider(p, env) {
    const e = env == null ? p.env : env;
    const Rs = p.sensor === 'ldr' ? R_LDR(e) : R_NTC(e);
    const Rf = p.Rf * 1e3;
    const Vout = p.pos === 'bottom' ? (VIN * Rs) / (Rs + Rf) : (VIN * Rf) / (Rs + Rf);
    return { Rs, Rf, Vout, I: VIN / (Rs + Rf) };
  }

  Sim.create('#sim-divider', {
    title: 'Sensor in a potential divider',
    height: (w) => (w >= 680 ? 360 : 620),
    controls: [
      {
        key: 'sensor', type: 'select', label: 'Sensor', value: 'ldr', options: [['ldr', 'LDR'], ['ntc', 'NTC thermistor']],
        onChange: (s, v) => { s.setLabel('env', v === 'ldr' ? 'Light level / %' : 'Temperature / °C'); s.set('env', v === 'ldr' ? 80 : 20); }
      },
      { key: 'pos', type: 'select', label: 'Output taken across', value: 'bottom', options: [['bottom', 'the sensor (bottom)'], ['top', 'the fixed resistor']] },
      { key: 'env', label: 'Light level / %', min: 0, max: 100, step: 1, value: 80, format: (v) => v.toFixed(0) },
      { key: 'Rf', label: 'Fixed resistor', min: 1, max: 50, step: 1, value: 10, unit: 'kΩ', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const d = divider(p);
      const on = d.Vout > VTH;
      const wide = w >= 680;
      const bw = wide ? Math.round(w * 0.46) : w, bh = wide ? h : 300;
      const xd = wide ? 120 : 110, yT = 40, yB = bh - 36, ym = (yT + yB) / 2;
      // rails
      wire(ctx, [[30, yT], [bw - 20, yT]]);
      wire(ctx, [[30, yB], [bw - 20, yB]]);
      Sim.text(ctx, '+' + VIN.toFixed(1) + ' V', 30, yT - 14, { size: 12.5, bold: true, color: C.red });
      Sim.text(ctx, '0 V', 30, yB + 16, { size: 12.5, bold: true, color: C.blue });
      wire(ctx, [[xd, yT], [xd, yB]]);
      const yTop = (yT + ym) / 2, yBot = (ym + yB) / 2;
      const sensorAt = p.pos === 'top' ? yTop : yBot, fixedAt = p.pos === 'top' ? yBot : yTop;
      resistor(ctx, xd, fixedAt, Math.PI / 2);
      if (p.sensor === 'ldr') ldr(ctx, xd, sensorAt, Math.PI / 2);
      else thermistor(ctx, xd, sensorAt, Math.PI / 2);
      Sim.text(ctx, 'R = ' + p.Rf + ' kΩ', xd + 20, fixedAt, { size: 12.5, bold: true, color: INK });
      Sim.text(ctx, p.sensor === 'ldr' ? 'LDR' : 'thermistor', xd + 32, sensorAt - 9, { size: 12, color: C.purple });
      Sim.text(ctx, ohms(d.Rs), xd + 32, sensorAt + 9, { size: 12.5, bold: true, color: C.purple });
      // environment indicator
      if (p.sensor === 'ldr') {
        const a = 0.15 + 0.85 * (p.env / 100);
        Sim.circle(ctx, 40, sensorAt - 40, 11, { fill: 'rgba(250,176,5,' + a.toFixed(2) + ')' });
        for (let i = 0; i < 8; i++) { const an = (i * Math.PI) / 4; Sim.line(ctx, 40 + 15 * Math.cos(an), sensorAt - 40 + 15 * Math.sin(an), 40 + 20 * Math.cos(an), sensorAt - 40 + 20 * Math.sin(an), { color: 'rgba(250,176,5,' + a.toFixed(2) + ')', width: 2 }); }
      } else {
        const tx = 40, ty = sensorAt - 46;
        Sim.rect(ctx, tx - 4, ty - 14, 8, 30, { fill: '#fff', stroke: C.grey, width: 1.5, r: 4 });
        const fr = p.env / 100;
        Sim.rect(ctx, tx - 2, ty + 14 - 26 * fr, 4, 26 * fr + 1, { fill: C.red });
        Sim.circle(ctx, tx, ty + 18, 6, { fill: C.red });
        Sim.text(ctx, p.env.toFixed(0) + ' °C', tx + 10, ty - 6, { size: 11.5, color: C.red, bold: true });
      }
      // output, voltmeter and switching circuit
      const xo = xd + (wide ? 150 : 140);
      node(ctx, xd, ym);
      wire(ctx, [[xd, ym], [xo, ym], [xo, ym + 10]]);
      wire(ctx, [[xo, ym + 36], [xo, yB]]);
      node(ctx, xo, yB);
      meter(ctx, xo, ym + 23, 'V');
      Sim.text(ctx, 'Vout = ' + d.Vout.toFixed(2) + ' V', xo - 10, ym - 14, { size: 13, bold: true, color: on ? C.green : C.navy, align: 'right' });
      const sx = Math.min(bw - 80, xo + 24), sy = ym + 8;
      wire(ctx, [[xo, ym], [sx + 12, ym], [sx + 12, sy]]);
      Sim.rect(ctx, sx, sy, 62, 34, { fill: '#f3f0ff', stroke: '#6741d9', width: 1.5, r: 5 });
      Sim.text(ctx, 'switch', sx + 31, sy + 11, { size: 11, bold: true, color: '#6741d9', align: 'center' });
      Sim.text(ctx, 'on > ' + VTH.toFixed(1) + ' V', sx + 31, sy + 24, { size: 11, color: '#6741d9', align: 'center' });
      lamp(ctx, sx + 31, sy + 64, on);
      Sim.text(ctx, on ? 'lamp ON' : 'lamp off', sx + 31, sy + 94, { size: 12, bold: true, color: on ? '#b35c00' : C.muted, align: 'center' });

      // graph of V_out against the environment
      const gb = wide ? { x: bw + 54, y: 36, w: w - bw - 54 - 18, h: h - 36 - 44 } : { x: 50, y: bh + 34, w: w - 50 - 16, h: h - bh - 34 - 42 };
      const isL = p.sensor === 'ldr';
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 100, ymin: 0, ymax: 6.8, xstep: 20, ystep: 1, ylabel: 'Vout / V', title: 'Output p.d. against ' + (isL ? 'light level' : 'temperature') }, gb)).axes();
      Sim.text(ctx, isL ? 'light level / %' : 'temperature / °C', g.x + g.w / 2, g.py(0) + 27, { size: 12.5, bold: true, align: 'center' });
      const f = (x) => divider(p, x).Vout;
      g.clip();
      ctx.fillStyle = 'rgba(255,212,59,0.22)';
      ctx.fillRect(g.x, g.y, g.w, g.py(VTH) - g.y);
      g.unclip();
      g.hline(VTH, { color: '#6741d9' });
      const leftFree = Math.abs(f(12) - (VTH + 0.4)) > Math.abs(f(88) - (VTH + 0.4));
      Sim.text(ctx, 'lamp on above ' + VTH.toFixed(1) + ' V', leftFree ? g.x + 8 : g.x + g.w - 6, g.py(VTH) - 10, { size: 11.5, color: '#6741d9', bold: true, align: leftFree ? 'left' : 'right' });
      g.plot(f, { color: C.navy, width: 2.8 });
      g.dot(p.env, d.Vout, { color: on ? C.green : C.red, r: 6 });
    },
    readout(s) {
      const p = s.p, d = divider(p);
      const top = p.pos === 'top';
      return [
        [p.sensor === 'ldr' ? 'R(LDR) =' : 'R(thermistor) =', ohms(d.Rs)],
        ['I = Vin / (R₁ + R₂) =', Sim.fmt(d.I * 1000, 3) + ' mA'],
        ['Vout = Vin × ' + (top ? 'R / (R + R(sensor))' : 'R(sensor) / (R + R(sensor))') + ' =', d.Vout.toFixed(2) + ' V', true],
        ['lamp:', d.Vout > VTH ? 'ON' : 'off']
      ];
    }
  });

  /* ======================================================================
     4. Core practical 8: e.m.f. and internal resistance
     ====================================================================== */
  const CELLS = { a: { emf: 1.55, r: 0.45 }, b: { emf: 1.47, r: 1.6 } };
  const R_PROT = 1.0;
  function cellNow(s) {
    const c = CELLS[s.p.cell];
    return { emf: c.emf - s.state.drain, r: c.r };
  }
  function cp8Clear(s) { s.state.data = []; s.state.drain = 0; s.state.last = null; }
  function cp8Read(s) {
    const c = cellNow(s);
    const I = c.emf / (s.p.R + R_PROT + c.r);
    const V = c.emf - I * c.r;
    const Im = Math.round((I + gaussian() * 0.004) * 100) / 100;
    const Vm = Math.round((V + gaussian() * 0.004) * 100) / 100;
    s.state.data.push([Im, Vm]);
    s.state.last = [Im, Vm];
    if (s.p.closed) s.state.drain += 0.012 + 0.03 * I; // the cell runs down while the switch stays closed
  }

  Sim.create('#sim-cp8', {
    title: 'Virtual experiment: e.m.f. and internal resistance',
    height: (w) => (w >= 700 ? 380 : 640),
    controls: [
      { key: 'cell', type: 'select', label: 'Cell', value: 'a', options: [['a', 'Cell A'], ['b', 'Cell B (an older cell)']], onChange: (s) => cp8Clear(s) },
      { key: 'R', label: 'Variable resistor R', min: 0, max: 15, step: 0.1, value: 4, unit: 'Ω', format: (v) => v.toFixed(1) },
      { key: 'closed', type: 'check', label: 'Leave the switch closed between readings', value: false },
      { type: 'button', label: 'Take reading', onClick: (s) => cp8Read(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => cp8Clear(s) }
    ],
    init(s) { s.state = { data: [], drain: 0, last: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const c = cellNow(s);
      const I = c.emf / (p.R + R_PROT + c.r);
      const V = c.emf - I * c.r;
      const Pcell = I * I * c.r;
      const wide = w >= 700;
      const bw = wide ? Math.round(w * 0.44) : w, bh = wide ? h : 300;
      const x0 = 76, x1 = bw - 92, y1 = 46, y3 = bh - 48;
      const yb1 = y1 + 26, yb2 = y3 - 26, ycell = yb1 + (yb2 - yb1) * 0.3, yr = yb1 + (yb2 - yb1) * 0.72;
      // loop
      wire(ctx, [[x0, yb1], [x0, y1], [x1, y1], [x1, y3], [x0, y3], [x0, yb2]]);
      wire(ctx, [[x0, yb1], [x0, yb2]]);
      // warm glow around the cell
      const glow = Sim.clamp(Pcell / 0.55, 0, 1);
      if (glow > 0.02) Sim.circle(ctx, x0, ycell, 22 + 16 * glow, { fill: 'rgba(240,140,0,' + (0.45 * glow).toFixed(2) + ')' });
      cellV(ctx, x0, ycell);
      resistor(ctx, x0, yr, Math.PI / 2);
      Sim.text(ctx, 'r', x0 + 16, yr, { size: 13, bold: true, italic: true, color: INK });
      Sim.rect(ctx, x0 - 26, yb1 - 4, 52, yb2 - yb1 + 8, { stroke: C.grey, width: 1.5, dash: [5, 4], r: 6 });
      Sim.text(ctx, 'cell', x0 + 32, ycell + 6, { size: 11.5, color: C.muted });
      // voltmeter across the terminals
      const xv = x0 - 50;
      wire(ctx, [[x0, yb1], [xv, yb1], [xv, (yb1 + yb2) / 2 - 13]]);
      wire(ctx, [[xv, (yb1 + yb2) / 2 + 13], [xv, yb2], [x0, yb2]]);
      node(ctx, x0, yb1); node(ctx, x0, yb2);
      meter(ctx, xv, (yb1 + yb2) / 2, 'V');
      // switch, ammeter, protective resistor, rheostat
      const xs = x0 + (x1 - x0) * 0.3, xa = x0 + (x1 - x0) * 0.72;
      Sim.rect(ctx, xs - 16, y1 - 3, 32, 6, { fill: '#fff' });
      node(ctx, xs - 14, y1); node(ctx, xs + 14, y1);
      Sim.line(ctx, xs - 14, y1, xs + 13, y1 - 1, { color: INK, width: 2 });
      Sim.text(ctx, 'switch', xs, y1 - 16, { size: 11, color: C.muted, align: 'center' });
      meter(ctx, xa, y1, 'A');
      resistor(ctx, (x0 + x1) / 2, y3, 0);
      Sim.text(ctx, R_PROT.toFixed(1) + ' Ω', (x0 + x1) / 2, y3 + 20, { size: 11.5, color: C.muted, align: 'center' });
      resistor(ctx, x1, (y1 + y3) / 2, Math.PI / 2);
      Sim.arrow(ctx, x1 - 18, (y1 + y3) / 2 + 18, x1 + 18, (y1 + y3) / 2 - 18, { color: INK, width: 1.6, head: 7 });
      Sim.text(ctx, 'R = ' + p.R.toFixed(1) + ' Ω', x1 - 24, (y1 + y3) / 2 + 36, { size: 12, bold: true, color: INK, align: 'right' });
      // live meter readings
      Sim.text(ctx, 'V = ' + V.toFixed(2) + ' V', (x0 + x1) / 2 + 6, (y1 + y3) / 2 - 12, { size: 13.5, bold: true, color: C.blue, align: 'center' });
      Sim.text(ctx, 'I = ' + I.toFixed(2) + ' A', (x0 + x1) / 2 + 6, (y1 + y3) / 2 + 10, { size: 13.5, bold: true, color: C.blue, align: 'center' });
      // energy-per-coulomb bar: ε = V + Ir
      const bx = bw - 40, bt = y1 + 4, bb = y3;
      const scale = (bb - bt) / 1.7;
      Sim.rect(ctx, bx, bb - V * scale, 22, V * scale, { fill: C.blue });
      Sim.rect(ctx, bx, bb - c.emf * scale, 22, (c.emf - V) * scale, { fill: C.red });
      Sim.text(ctx, 'ε', bx + 11, bb - c.emf * scale - 10, { size: 13, bold: true, align: 'center', color: INK });
      Sim.text(ctx, 'Ir', bx - 4, bb - (c.emf + V) / 2 * scale, { size: 12, bold: true, color: C.red, align: 'right' });
      Sim.text(ctx, 'V', bx - 4, bb - (V / 2) * scale, { size: 12, bold: true, color: C.blue, align: 'right' });

      // graph of V against I
      const gb = wide ? { x: bw + 54, y: 36, w: w - bw - 54 - 18, h: h - 36 - 36 } : { x: 50, y: bh + 34, w: w - 50 - 16, h: h - bh - 34 - 32 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 1.2, ymin: 0, ymax: 1.8, xstep: 0.2, ystep: 0.2, xlabel: 'I / A', ylabel: 'V / V', title: 'Terminal p.d. against current' }, gb)).axes();
      const fit = fitLine(st.data);
      if (fit && st.data.length >= 3) {
        g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
        g.dot(0, fit.c, { color: C.orange, r: 5, label: 'intercept = ε', dx: 10, dy: -12 });
        const xm = 0.75;
        Sim.text(ctx, 'gradient = −r', g.px(xm) + 6, g.py(fit.m * xm + fit.c) - 14, { size: 12, bold: true, color: '#b35c00' });
      }
      st.data.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!st.data.length) Sim.text(ctx, 'Set R, then press “Take reading”', gb.x + gb.w / 2, gb.y + gb.h * 0.7, { size: 12.5, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const c = cellNow(s);
      const I = c.emf / (p.R + R_PROT + c.r);
      const out = [['readings:', String(st.data.length)], ['power wasted in the cell I²r =', Sim.fmt(I * I * c.r, 2) + ' W']];
      const fit = fitLine(st.data);
      if (fit && st.data.length >= 3) {
        out.push(['intercept: ε =', fit.c.toFixed(2) + ' V', true], ['gradient = ' + fit.m.toFixed(2) + ' Ω, so r =', (-fit.m).toFixed(2) + ' Ω', true]);
        if (st.data.length >= 6 && !p.closed && st.drain === 0) out.push(['true values:', 'ε = ' + CELLS[p.cell].emf.toFixed(2) + ' V, r = ' + CELLS[p.cell].r.toFixed(2) + ' Ω']);
      } else if (st.data.length) out.push(['take at least 3 readings', 'to fit a line']);
      if (st.drain > 0) out.push(['cell has run down by', (st.drain * 1000).toFixed(0) + ' mV']);
      return out;
    }
  });

  /* The shared .tag style is nowrap, so the long derivation badge overflows on phones. */
  const wrapTags = () => document.querySelectorAll('.derive-head .tag').forEach((t) => { t.style.whiteSpace = 'normal'; });
  wrapTags();
  document.addEventListener('DOMContentLoaded', wrapTags);
})();
