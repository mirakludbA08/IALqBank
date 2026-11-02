/* Biology 2a: Membranes and transport — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. Fick's law: rate ∝ surface area × difference in concentration ÷ thickness
     ====================================================================== */
  const REF = { A: 70, dp: 8, d: 0.5 };    // healthy human lungs
  const BLOOD_PO2 = 5.3;                   // kPa, blood arriving at the lungs
  const fick = (A, dp, d) => (A * dp) / d;
  const REF_RATE = fick(REF.A, REF.dp, REF.d);
  const VARS = {
    A: { name: 'surface area', sym: 'A', unit: 'm²', min: 0, max: 100, step: 20, axis: 'surface area A / m²' },
    dp: { name: 'difference in pO₂', sym: 'Δp', unit: 'kPa', min: 0, max: 12, step: 2, axis: 'difference in pO₂ Δp / kPa' },
    d: { name: 'thickness', sym: 'd', unit: 'µm', min: 0, max: 3, step: 0.5, axis: 'thickness d / µm' }
  };

  Sim.create('#sim-bio-2a-fick', {
    title: "Fick's law: diffusion across an exchange surface",
    alt: 'Oxygen molecules diffusing across an exchange surface, and a graph of the rate of diffusion against surface area, concentration difference or thickness',
    height: (w) => (w >= 700 ? 340 : 520),
    controls: [
      { key: 'A', label: 'Surface area A', min: 10, max: 100, step: 1, value: 70, unit: 'm²', format: (v) => v.toFixed(0) },
      { key: 'dp', label: 'Difference in pO₂ across it, Δp', min: 1, max: 12, step: 0.5, value: 8, unit: 'kPa', format: (v) => v.toFixed(1) },
      { key: 'd', label: 'Thickness of the surface d', min: 0.2, max: 3, step: 0.1, value: 0.5, unit: 'µm', format: (v) => v.toFixed(1) },
      { key: 'gx', type: 'select', label: 'Graph rate against', value: 'd', options: [['A', 'surface area'], ['dp', 'difference in pO₂'], ['d', 'thickness']] }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      const air = [], blood = [];
      for (let i = 0; i < 70; i++) air.push({ u: Math.random(), v: Math.random(), a: Math.random() * 6.28 });
      for (let i = 0; i < 70; i++) blood.push({ u: Math.random(), v: Math.random(), a: Math.random() * 6.28 });
      s.state = { air, blood, movers: [], acc: 0 };
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      const jig = (q) => {
        q.a += (Math.random() - 0.5) * 2.4 * dt * 10;
        q.u += Math.cos(q.a) * 0.08 * dt; q.v += Math.sin(q.a) * 0.16 * dt;
        if (q.u < 0) { q.u = -q.u; q.a = Math.PI - q.a; } if (q.u > 1) { q.u = 2 - q.u; q.a = Math.PI - q.a; }
        if (q.v < 0) { q.v = -q.v; q.a = -q.a; } if (q.v > 1) { q.v = 2 - q.v; q.a = -q.a; }
      };
      st.air.forEach(jig);
      st.blood.forEach(jig);
      // molecules crossing: number per second proportional to the Fick rate
      st.acc += dt * 12 * fick(p.A, p.dp, p.d) / REF_RATE;
      while (st.acc >= 1 && st.movers.length < 160) { st.acc -= 1; st.movers.push({ u: Math.random(), t: 0 }); }
      if (st.acc > 1) st.acc = 0;
      st.movers.forEach((m) => { m.t += dt * 1.2; });
      st.movers = st.movers.filter((m) => m.t < 1);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.44), h } : { x: 0, y: 0, w, h: 230 };
      /* the exchange surface */
      const fullW = sc.w - 40;
      const memW = fullW * (p.A / 100);
      const mx0 = sc.x + 20 + (fullW - memW) / 2;
      const memT = sc.y + 34 + (wide ? 90 : 72);
      const memH = 6 + (p.d / 3) * (wide ? 54 : 40);
      const airTop = sc.y + 34, bloodBot = sc.y + sc.h - (wide ? 30 : 16);
      // compartments
      Sim.rect(ctx, sc.x + 20, airTop, fullW, memT - airTop, { fill: '#e7f5ff' });
      Sim.rect(ctx, sc.x + 20, memT + memH, fullW, bloodBot - memT - memH, { fill: '#fff0f0' });
      // impermeable wall either side of the exchange surface
      Sim.rect(ctx, sc.x + 20, memT, mx0 - sc.x - 20, memH, { fill: '#adb5bd' });
      Sim.rect(ctx, mx0 + memW, memT, sc.x + 20 + fullW - mx0 - memW, memH, { fill: '#adb5bd' });
      Sim.rect(ctx, mx0, memT, memW, memH, { fill: '#ffd8a8', stroke: '#e8590c', width: 1.5 });
      Sim.text(ctx, 'air in alveolus: pO₂ = ' + (BLOOD_PO2 + p.dp).toFixed(1) + ' kPa', sc.x + 26, airTop + 12, { size: 11.5, bold: true, color: '#1864ab' });
      Sim.text(ctx, 'blood: pO₂ = ' + BLOOD_PO2.toFixed(1) + ' kPa', sc.x + 26, bloodBot - 10, { size: 11.5, bold: true, color: '#c92a2a' });
      Sim.text(ctx, 'exchange surface', mx0 + memW / 2, memT + memH / 2, { size: 11, bold: true, color: '#a5410e', align: 'center', bg: memH < 16 ? 'rgba(255,255,255,0.8)' : null });
      // molecules: density in each compartment proportional to pO2
      const nAir = Math.round(70 * clamp((BLOOD_PO2 + p.dp) / 17.3, 0, 1));
      const nBlood = Math.round(70 * BLOOD_PO2 / 17.3);
      const airH = memT - airTop - 26, bloodH = bloodBot - memT - memH - 26;
      st.air.slice(0, nAir).forEach((q) => Sim.circle(ctx, sc.x + 26 + q.u * (fullW - 12), airTop + 22 + q.v * airH, 2.8, { fill: C.blue }));
      st.blood.slice(0, nBlood).forEach((q) => Sim.circle(ctx, sc.x + 26 + q.u * (fullW - 12), memT + memH + 4 + q.v * bloodH, 2.8, { fill: C.blue }));
      st.movers.forEach((m) => {
        const X = mx0 + 4 + m.u * (memW - 8);
        const Y = memT - 10 + m.t * (memH + 20);
        Sim.circle(ctx, X, Y, 3, { fill: C.navy });
      });
      Sim.text(ctx, 'O₂ diffuses down its gradient', sc.x + sc.w / 2, sc.y + 14, { size: 12, italic: true, color: C.muted, align: 'center' });

      /* the graph */
      const gb = wide ? { x: sc.w + 64, y: 34, w: w - sc.w - 64 - 20, h: h - 34 - 46 } : { x: 54, y: sc.h + 36, w: w - 54 - 18, h: h - sc.h - 36 - 44 };
      const V = VARS[p.gx];
      const rate = (x) => {
        const A = p.gx === 'A' ? x : p.A, dp = p.gx === 'dp' ? x : p.dp, d = p.gx === 'd' ? x : p.d;
        return d <= 0 ? null : (100 * fick(A, dp, d)) / REF_RATE;
      };
      const cur = rate(p[p.gx]);
      let ymax = 0;
      for (let i = 1; i <= 60; i++) { const v = rate(V.min + ((V.max - V.min) * i) / 60); if (v != null && isFinite(v)) ymax = Math.max(ymax, v); }
      if (p.gx === 'd') ymax = Math.max(cur * 1.6, rate(0.2));
      const nice = [50, 100, 150, 200, 300, 400, 500, 600, 800, 1000, 1500, 2000];
      ymax = nice.find((n) => n >= ymax * 1.05) || 2500;
      const g = Sim.graph(ctx, Object.assign({ xmin: V.min, xmax: V.max, xstep: V.step, ymin: 0, ymax, ylabel: 'rate / % of healthy lung' }, gb)).axes();
      Sim.text(ctx, V.axis, gb.x + gb.w / 2, gb.y + gb.h + 32, { size: 12.5, bold: true, color: C.ink, align: 'center' });
      g.plot(rate, { from: p.gx === 'd' ? 0.05 : V.min, color: C.orange, width: 3 });
      if (ymax >= 110) {
        g.hline(100, { color: C.grey, dash: [4, 4], width: 1.2 });
        g.label(V.max, 100, 'healthy lung', { size: 11, color: C.muted, align: 'right', bold: false, baseline: 'bottom' });
      }
      g.dot(p[p.gx], Math.min(cur, ymax), { color: C.navy, r: 6 });
      const shape = p.gx === 'd' ? 'rate ∝ 1/d: double the thickness, halve the rate' : 'rate ∝ ' + V.sym + ': a straight line through the origin';
      Sim.text(ctx, shape, gb.x + gb.w / 2, gb.y - 14, { size: 12, bold: true, color: C.navy, align: 'center' });
    },
    readout(s) {
      const p = s.p;
      const R = fick(p.A, p.dp, p.d);
      return [
        ['rate ∝ A × Δp ÷ d =', p.A.toFixed(0) + ' × ' + p.dp.toFixed(1) + ' ÷ ' + p.d.toFixed(1) + ' = ' + Sim.fmt(R, 3)],
        ['compared with a healthy lung:', ((100 * R) / REF_RATE).toFixed(0) + '%', true],
        ['healthy lung:', '70 m², Δp 8 kPa, 0.5 µm']
      ];
    }
  });

  /* ======================================================================
     2. Surface area to volume ratio of cubes
     ====================================================================== */
  function isoCube(ctx, ox, oy, L, px, o) {
    // ox, oy = front bottom corner; px = pixels per cm
    const a = L * px;
    const dx = Math.cos(Math.PI / 6) * a, dy = Math.sin(Math.PI / 6) * a;
    const top = [[ox, oy - a], [ox + dx, oy - a - dy], [ox, oy - a - 2 * dy], [ox - dx, oy - a - dy]];
    const right = [[ox, oy], [ox + dx, oy - dy], [ox + dx, oy - a - dy], [ox, oy - a]];
    const left = [[ox, oy], [ox - dx, oy - dy], [ox - dx, oy - a - dy], [ox, oy - a]];
    Sim.polyline(ctx, left, { close: true, fill: '#a5d8ff', color: C.navy, width: 1.5 });
    Sim.polyline(ctx, right, { close: true, fill: '#74c0fc', color: C.navy, width: 1.5 });
    Sim.polyline(ctx, top, { close: true, fill: '#d0ebff', color: C.navy, width: 1.5 });
    if (o.grid && px >= 6) {
      // 1 cm grid on the three visible faces
      const n = Math.floor(L + 1e-9);
      const ux = Math.cos(Math.PI / 6) * px, uy = Math.sin(Math.PI / 6) * px;
      ctx.save();
      ctx.strokeStyle = 'rgba(0,43,128,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i <= n; i++) {
        if (i >= L - 1e-9) break;
        // vertical lines on the side faces
        ctx.moveTo(ox + ux * i, oy - uy * i); ctx.lineTo(ox + ux * i, oy - uy * i - a);
        ctx.moveTo(ox - ux * i, oy - uy * i); ctx.lineTo(ox - ux * i, oy - uy * i - a);
        // horizontal lines on the side faces
        ctx.moveTo(ox, oy - px * i); ctx.lineTo(ox + dx, oy - dy - px * i);
        ctx.moveTo(ox, oy - px * i); ctx.lineTo(ox - dx, oy - dy - px * i);
        // the top face
        ctx.moveTo(ox + ux * i, oy - a - uy * i); ctx.lineTo(ox + ux * i - dx, oy - a - uy * i - dy);
        ctx.moveTo(ox - ux * i, oy - a - uy * i); ctx.lineTo(ox - ux * i + dx, oy - a - uy * i - dy);
      }
      ctx.stroke();
      ctx.restore();
    }
    return { dx, dy, a };
  }

  Sim.create('#sim-bio-2a-sav', {
    title: 'Surface area to volume ratio',
    alt: 'A cube whose side length can be changed, and a graph showing the surface area to volume ratio falling as the cube gets bigger',
    height: (w) => (w >= 680 ? 330 : 540),
    controls: [
      { key: 'L', label: 'Side length of the cube L', min: 1, max: 10, step: 0.5, value: 2, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'grid', type: 'check', label: 'Show 1 cm squares', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 680;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.42), h } : { x: 0, y: 0, w, h: 250 };
      // scale so a 10 cm cube fits the panel
      const avail = Math.min((sc.w - 40) / (2 * Math.cos(Math.PI / 6)), (sc.h - 60) / 2);
      const px = avail / 10;
      const ox = sc.x + sc.w / 2, oy = sc.y + sc.h - 22 - Math.sin(Math.PI / 6) * 0;
      const L = p.L;
      const cube = isoCube(ctx, ox, oy - 4, L, px, { grid: p.grid });
      // dimension label
      Sim.text(ctx, 'L = ' + L.toFixed(1) + ' cm', ox + cube.dx / 2 + 10, oy - 4 - cube.dy / 2 + 12, { size: 12.5, bold: true, color: C.navy, align: 'left' });
      const SA = 6 * L * L, V = L * L * L;
      Sim.text(ctx, 'surface area = 6L² = ' + Sim.fmt(SA, 3) + ' cm²', sc.x + 14, sc.y + 16, { size: 12.5, color: C.ink, bold: true });
      Sim.text(ctx, 'volume = L³ = ' + Sim.fmt(V, 3) + ' cm³', sc.x + 14, sc.y + 36, { size: 12.5, color: C.ink, bold: true });
      Sim.text(ctx, 'SA : V = ' + (SA / V).toFixed(2) + ' : 1', sc.x + 14, sc.y + 56, { size: 13, color: C.red, bold: true });

      const gb = wide ? { x: sc.w + 56, y: 34, w: w - sc.w - 56 - 20, h: h - 34 - 44 } : { x: 48, y: sc.h + 34, w: w - 48 - 18, h: h - sc.h - 34 - 42 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 10, ymin: 0, ymax: 7, xstep: 1, ystep: 1, ylabel: 'SA : V / cm⁻¹' }, gb)).axes();
      Sim.text(ctx, 'side length L / cm', gb.x + gb.w / 2, gb.y + gb.h + 30, { size: 12.5, bold: true, color: C.ink, align: 'center' });
      g.plot((x) => 6 / x, { from: 1, to: 10, color: C.red, width: 3 });
      g.dot(L, 6 / L, { color: C.navy, r: 6 });
      Sim.line(ctx, g.px(L), g.py(6 / L), g.px(L), g.py(0), { color: C.navy, dash: [3, 4], width: 1.2 });
      Sim.line(ctx, g.px(0), g.py(6 / L), g.px(L), g.py(6 / L), { color: C.navy, dash: [3, 4], width: 1.2 });
      g.label(5.2, 3.6, 'SA : V = 6 / L', { size: 12.5, color: C.red, align: 'left' });
    },
    readout(s) {
      const L = s.p.L, SA = 6 * L * L, V = L * L * L;
      return [
        ['surface area =', Sim.fmt(SA, 3) + ' cm²'],
        ['volume =', Sim.fmt(V, 3) + ' cm³'],
        ['SA : V =', (SA / V).toFixed(2) + ' : 1', true],
        ['distance from surface to centre =', (L / 2).toFixed(2) + ' cm']
      ];
    }
  });
})();
