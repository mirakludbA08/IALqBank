/* Biology 1b: Mammalian transport — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. Oxygen dissociation curve, the Bohr effect and fetal haemoglobin
     ====================================================================== */
  const HILL = 2.7;            // Hill coefficient for haemoglobin
  const PCO2_NORMAL = 5.3;     // kPa, arterial / alveolar
  const P_LUNGS = 13;          // kPa, pO2 in the alveoli
  // blood pH from pCO2 (Henderson–Hasselbalch, hydrogencarbonate 24 mmol dm⁻³)
  const bloodPH = (pco2) => 6.1 + Math.log10(24 / (0.23 * pco2));
  // P50 of adult haemoglobin: 3.55 kPa at pH 7.40, Bohr coefficient −0.48
  const p50Adult = (pco2) => 3.55 * Math.pow(10, 0.48 * (7.4 - bloodPH(pco2)));
  const p50Fetal = (pco2) => 0.71 * p50Adult(pco2);
  const sat = (po2, p50) => (po2 <= 0 ? 0 : 100 * Math.pow(po2, HILL) / (Math.pow(po2, HILL) + Math.pow(p50, HILL)));

  Sim.create('#sim-bio-1b-odc', {
    title: 'Oxygen dissociation curve: the Bohr effect',
    alt: 'Graph of percentage saturation of haemoglobin against partial pressure of oxygen, with the curve shifting right as carbon dioxide rises',
    height: (w) => (w >= 640 ? 380 : Math.round(Math.min(420, w * 1.05))),
    controls: [
      { key: 'po2', label: 'Chosen pO₂ (in a tissue)', min: 0, max: 14, step: 0.1, value: 4, unit: 'kPa', format: (v) => v.toFixed(1) },
      { key: 'pco2', label: 'pCO₂ of the blood', min: 4, max: 9, step: 0.1, value: 5.3, unit: 'kPa', format: (v) => v.toFixed(1) },
      { key: 'fetal', type: 'check', label: 'Show fetal haemoglobin', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const narrow = w < 520;
      const gb = { x: narrow ? 44 : 60, y: 36, w: w - (narrow ? 44 : 60) - 18, h: h - 36 - 50 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 14, ymin: 0, ymax: 100, xstep: 2, ystep: 20, xlabel: 'pO₂ / kPa', ylabel: 'saturation of haemoglobin / %' }, gb)).axes();
      const P50n = p50Adult(PCO2_NORMAL), P50 = p50Adult(p.pco2), P50f = p50Fetal(p.pco2);
      const shifted = Math.abs(p.pco2 - PCO2_NORMAL) > 0.05;
      // where the blood is
      const mark = (x, lab) => {
        Sim.line(ctx, g.px(x), g.py(0), g.px(x), g.py(0) - 6, { color: C.navy, width: 2 });
        Sim.text(ctx, lab, g.px(x), g.py(0) + 24, { size: 11, color: C.navy, align: 'center', bold: true });
      };
      mark(P_LUNGS, 'lungs');
      if (!narrow) { mark(5.3, 'resting tissue'); mark(2.5, 'active muscle'); }
      // curves
      if (shifted) g.plot((x) => sat(x, P50n), { color: C.grey, width: 2, dash: [6, 5] });
      if (p.fetal) g.plot((x) => sat(x, P50f), { color: C.purple, width: 2.8 });
      g.plot((x) => sat(x, P50), { color: C.red, width: 3 });
      // Bohr shift arrow at 50 % saturation
      if (shifted && Math.abs(g.px(P50) - g.px(P50n)) > 10) {
        Sim.arrow(ctx, g.px(P50n), g.py(50), g.px(P50), g.py(50), { color: C.orange, width: 2.2, head: 9 });
        Sim.text(ctx, p.pco2 > PCO2_NORMAL ? 'Bohr shift: lower affinity' : 'shift left: higher affinity', g.px(Math.max(P50, P50n)) + 8, g.py(50) + 2, { size: 11.5, bold: true, color: '#b35c00', bg: 'rgba(255,255,255,0.9)' });
      }
      // chosen pO2
      const x = p.po2;
      g.vline(x, { color: C.navy, dash: [4, 4] });
      const pts = [[sat(x, P50), C.red]];
      if (shifted) pts.push([sat(x, P50n), C.grey]);
      if (p.fetal) pts.push([sat(x, P50f), C.purple]);
      pts.forEach(([y, col]) => {
        Sim.line(ctx, g.px(0), g.py(y), g.px(x), g.py(y), { color: col, dash: [3, 4], width: 1.2 });
        g.dot(x, y, { color: col, r: 5 });
      });
      Sim.text(ctx, sat(x, P50).toFixed(0) + '%', g.px(0) + 4, g.py(sat(x, P50)) - 9, { size: 12, bold: true, color: C.red, bg: 'rgba(255,255,255,0.85)' });
      if (p.fetal) Sim.text(ctx, sat(x, P50f).toFixed(0) + '%', g.px(0) + 4, g.py(sat(x, P50f)) - 9, { size: 12, bold: true, color: C.purple, bg: 'rgba(255,255,255,0.85)' });
      // legend in the empty bottom-right corner
      const lx = g.px(narrow ? 5.6 : 7.4), ly = g.py(narrow ? 40 : 36);
      const rows = [[C.red, narrow ? 'adult Hb' : 'adult Hb, pCO₂ ' + p.pco2.toFixed(1) + ' kPa', null]];
      if (shifted) rows.push([C.grey, narrow ? 'adult, normal CO₂' : 'adult Hb, pCO₂ 5.3 kPa (normal)', [6, 5]]);
      if (p.fetal) rows.push([C.purple, narrow ? 'fetal Hb' : 'fetal Hb, same pCO₂', null]);
      rows.forEach(([col, lab, dash], i) => {
        const y = ly + i * 19;
        Sim.line(ctx, lx, y, lx + 22, y, { color: col, width: 3, dash: dash || undefined });
        Sim.text(ctx, lab, lx + 28, y, { size: 11.5, color: C.ink, bg: 'rgba(255,255,255,0.85)', pad: 2 });
      });
    },
    readout(s) {
      const p = s.p;
      const P50 = p50Adult(p.pco2), P50n = p50Adult(PCO2_NORMAL);
      const out = [
        ['blood pH ≈', bloodPH(p.pco2).toFixed(2)],
        ['P₅₀ (50% saturated) =', P50.toFixed(1) + ' kPa'],
        ['saturation at ' + p.po2.toFixed(1) + ' kPa:', sat(p.po2, P50).toFixed(0) + '%', true]
      ];
      if (p.fetal) out.push(['fetal Hb at ' + p.po2.toFixed(1) + ' kPa:', sat(p.po2, p50Fetal(p.pco2)).toFixed(0) + '%']);
      const loaded = sat(P_LUNGS, P50n);
      out.push(['loaded in lungs (13 kPa):', loaded.toFixed(0) + '%']);
      out.push(['O₂ given up here:', Math.max(0, loaded - sat(p.po2, P50)).toFixed(0) + '% of capacity']);
      if (Math.abs(p.pco2 - PCO2_NORMAL) > 0.05) out.push(['at normal CO₂ it would be:', Math.max(0, loaded - sat(p.po2, P50n)).toFixed(0) + '% of capacity']);
      return out;
    }
  });

  /* ======================================================================
     2. Tissue fluid: hydrostatic against oncotic pressure along a capillary
     ====================================================================== */
  const ONCOTIC_PER_GDM3 = 3.3 / 70;   // kPa per g dm⁻³ of plasma protein
  function fluidModel(p) {
    const Pa = p.pa, Pv = Math.min(p.pv, p.pa), pi = p.prot * ONCOTIC_PER_GDM3;
    const Pc = (x) => Pa - (Pa - Pv) * x;
    let out = 0, back = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const net = Pc((i + 0.5) / N) - pi;
      if (net > 0) out += net / N; else back -= net / N;
    }
    const cross = Pa === Pv ? null : (Pa - pi) / (Pa - Pv);
    return { Pa, Pv, pi, Pc, out, back, cross: cross != null && cross > 0 && cross < 1 ? cross : null };
  }
  const FLUID_OUT = 'rgba(240,140,0,0.22)', FLUID_IN = 'rgba(12,166,120,0.22)';

  Sim.create('#sim-bio-1b-tissuefluid', {
    title: 'Tissue fluid: pressures along a capillary',
    alt: 'A capillary with fluid leaving at the arterial end and returning at the venous end, and a graph of hydrostatic and oncotic pressure along it',
    height: (w) => (w >= 720 ? 340 : 560),
    controls: [
      { key: 'pa', label: 'Hydrostatic pressure, arterial end', min: 3.5, max: 7, step: 0.1, value: 4.7, unit: 'kPa', format: (v) => v.toFixed(1) },
      { key: 'pv', label: 'Hydrostatic pressure, venous end', min: 0.5, max: 3.5, step: 0.1, value: 2.0, unit: 'kPa', format: (v) => v.toFixed(1) },
      { key: 'prot', label: 'Plasma protein concentration', min: 30, max: 90, step: 1, value: 70, unit: 'g dm⁻³', format: (v) => v.toFixed(0) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      const rbc = [], prot = [], drops = [];
      for (let i = 0; i < 9; i++) rbc.push({ u: i / 9 + Math.random() * 0.05, v: Math.random() * 0.6 - 0.3 });
      for (let i = 0; i < 26; i++) prot.push({ u: Math.random(), v: Math.random() * 1.6 - 0.8, sp: 0.8 + Math.random() * 0.4 });
      s.state = { rbc, prot, drops, spawn: 0 };
    },
    update(s, dt) {
      const st = s.state;
      const m = fluidModel(s.p);
      st.rbc.forEach((q) => { q.u += dt * 0.12; if (q.u > 1.05) q.u -= 1.1; });
      st.prot.forEach((q) => { q.u += dt * 0.12 * q.sp; if (q.u > 1) q.u -= 1; });
      // fluid crossing the wall at 7 positions along the capillary
      st.spawn += dt;
      while (st.spawn > 0.09) {
        st.spawn -= 0.09;
        const k = Math.floor(Math.random() * 7);
        const x = (k + 0.5) / 7;
        const net = m.Pc(x) - m.pi;
        if (Math.random() < Math.min(1, Math.abs(net) / 2.2)) {
          st.drops.push({ x, side: Math.random() < 0.5 ? -1 : 1, t: 0, dir: net > 0 ? 1 : -1 });
        }
      }
      st.drops.forEach((d) => { d.t += dt * 0.9; });
      st.drops = st.drops.filter((d) => d.t < 1);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const m = fluidModel(p);
      const wide = w >= 720;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.5), h } : { x: 0, y: 0, w, h: 270 };
      /* the capillary picture */
      const cx0 = sc.x + 34, cx1 = sc.x + sc.w - 24;
      const cyc = sc.y + sc.h * (wide ? 0.5 : 0.52);
      const rad = wide ? 26 : 22;
      const len = cx1 - cx0;
      // tissue cells
      const cellsY = [cyc - rad - (wide ? 70 : 58), cyc + rad + (wide ? 34 : 26)];
      const cellH = wide ? 36 : 30;
      cellsY.forEach((y) => {
        for (let i = 0; i < 4; i++) {
          const x = cx0 + 8 + i * (len / 4);
          Sim.rect(ctx, x, y, len / 4 - 16, cellH, { fill: '#fff4e6', stroke: '#e8b67a', width: 1.2, r: 10 });
          Sim.circle(ctx, x + (len / 4 - 16) / 2, y + cellH / 2, 5, { fill: '#e8b67a' });
        }
      });
      Sim.text(ctx, 'body cells bathed in tissue fluid', (cx0 + cx1) / 2, cellsY[1] + cellH + 12, { size: 12, color: '#a0612a', align: 'center', italic: true });
      Sim.text(ctx, 'arterial end', cx0, cellsY[0] - 12, { size: 12, bold: true, color: '#c92a2a', align: 'left' });
      Sim.text(ctx, 'venous end', cx1, cellsY[0] - 12, { size: 12, bold: true, color: '#1864ab', align: 'right' });
      // capillary
      Sim.rect(ctx, cx0, cyc - rad, len, rad * 2, { fill: '#ffe3e3' });
      Sim.line(ctx, cx0, cyc - rad, cx1, cyc - rad, { color: '#c92a2a', width: 2.5 });
      Sim.line(ctx, cx0, cyc + rad, cx1, cyc + rad, { color: '#c92a2a', width: 2.5 });
      st.prot.forEach((q) => Sim.circle(ctx, cx0 + q.u * len, cyc + q.v * rad * 0.8, 2.6, { fill: C.purple }));
      st.rbc.forEach((q) => {
        if (q.u < 0 || q.u > 1) return;
        ctx.save();
        ctx.fillStyle = '#e03131';
        ctx.beginPath();
        ctx.ellipse(cx0 + q.u * len, cyc + q.v * rad, 7, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      Sim.arrow(ctx, cx0 - 26, cyc, cx0 + 6, cyc, { color: '#c92a2a', width: 2.5, head: 9 });
      Sim.arrow(ctx, cx1 - 6, cyc, cx1 + 20, cyc, { color: '#1864ab', width: 2.5, head: 9 });
      // net pressure arrows across the wall
      for (let k = 0; k < 7; k++) {
        const xf = (k + 0.5) / 7, X = cx0 + xf * len;
        const net = m.Pc(xf) - m.pi;
        const L = clamp(Math.abs(net) * 12, 0, wide ? 34 : 28);
        if (L < 3) continue;
        const col = net > 0 ? C.orange : C.teal;
        [-1, 1].forEach((sd) => {
          const yWall = cyc + sd * rad;
          if (net > 0) Sim.arrow(ctx, X, yWall - sd * 4, X, yWall + sd * (L + 2), { color: col, width: 2.2, head: 7 });
          else Sim.arrow(ctx, X, yWall + sd * (L + 2), X, yWall - sd * 4, { color: col, width: 2.2, head: 7 });
        });
      }
      // droplets of fluid crossing
      st.drops.forEach((d) => {
        const X = cx0 + d.x * len + (d.side * 7);
        const f = d.dir > 0 ? d.t : 1 - d.t;
        const Y = cyc + d.side * (rad * 0.4 + f * 34);
        Sim.circle(ctx, X, Y, 2.3, { fill: '#4dabf7' });
      });
      // key
      const ky = wide ? sc.y + 14 : sc.y + sc.h - 26;
      Sim.circle(ctx, sc.x + 14, ky, 3, { fill: C.purple });
      Sim.text(ctx, 'plasma proteins (too big to leave)', sc.x + 22, ky, { size: 11.5, color: C.muted });
      Sim.circle(ctx, sc.x + 14, ky + 17, 3, { fill: '#4dabf7' });
      Sim.text(ctx, 'water and small solutes', sc.x + 22, ky + 17, { size: 11.5, color: C.muted });

      /* the pressure graph */
      const gb = wide ? { x: sc.w + 54, y: 34, w: w - sc.w - 54 - 20, h: h - 34 - 52 } : { x: 46, y: sc.h + 34, w: w - 46 - 16, h: h - sc.h - 34 - 50 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 100, ymin: 0, ymax: 8, xstep: 25, ystep: 1, ylabel: 'pressure / kPa' }, gb)).axes();
      const Pc = (x) => m.Pc(x / 100);
      g.fill((x) => Math.max(Pc(x), m.pi), 0, 100, { base: m.pi, color: FLUID_OUT });
      g.fill((x) => Math.min(Pc(x), m.pi), 0, 100, { base: m.pi, color: FLUID_IN });
      g.plot(() => m.pi, { color: C.purple, width: 2.6 });
      g.plot(Pc, { color: '#c92a2a', width: 3 });
      // key in the empty top of the graph
      [['#c92a2a', 'hydrostatic pressure (blood pressure)', 7.2], [C.purple, 'oncotic pressure (plasma proteins)', 6.5]].forEach(([col, lab, y]) => {
        const str = gb.w > 360 ? lab : lab.replace(' pressure', '');
        const xr = g.px(98), tw = Sim.measure(ctx, str, { size: 11.5, bold: true });
        Sim.line(ctx, xr - tw - 30, g.py(y), xr - tw - 8, g.py(y), { color: col, width: 3 });
        Sim.text(ctx, str, xr, g.py(y), { size: 11.5, bold: true, color: col, align: 'right', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      });
      if (m.cross != null) {
        g.vline(m.cross * 100, { color: C.grey, dash: [4, 4] });
        if (m.cross > 0.14) g.label(m.cross * 50, 0.6, 'fluid out', { size: 11.5, color: '#b35c00', align: 'center' });
        if (m.cross < 0.86) g.label(50 + m.cross * 50, 0.6, 'fluid in', { size: 11.5, color: '#087f5b', align: 'center' });
      } else {
        g.label(50, 0.6, m.Pv > m.pi ? 'fluid leaves all the way along' : 'fluid enters all the way along', { size: 11.5, color: m.Pv > m.pi ? '#b35c00' : '#087f5b', align: 'center' });
      }
      Sim.text(ctx, gb.w > 340 ? 'distance along the capillary from the arterial end / %' : 'distance from the arterial end / %', gb.x + gb.w / 2, gb.y + gb.h + 33, { size: 12, bold: true, color: C.ink, align: 'center' });
    },
    readout(s) {
      const m = fluidModel(s.p);
      const netA = m.Pa - m.pi, netV = m.Pv - m.pi;
      const dirn = (v) => (v > 0.005 ? ' outwards' : v < -0.005 ? ' inwards' : '');
      const out = [
        ['oncotic pressure =', m.pi.toFixed(1) + ' kPa'],
        ['net, arterial end:', Math.abs(netA).toFixed(1) + ' kPa' + dirn(netA)],
        ['net, venous end:', Math.abs(netV).toFixed(1) + ' kPa' + dirn(netV)]
      ];
      if (m.out <= 1e-6) out.push(['no fluid is forced out:', 'tissue fluid is not formed', true]);
      else if (m.back >= m.out) out.push(['fluid returned to the blood:', 'all of it (more is drawn back than leaves)', true]);
      else {
        const ret = (100 * m.back) / m.out;
        out.push(['returned to the capillary ≈', ret.toFixed(0) + '%', true]);
        out.push(['drains into lymph ≈', (100 - ret).toFixed(0) + '%']);
        if (ret < 50) out.push(['result:', 'tissue fluid builds up and the tissue swells (oedema)']);
      }
      return out;
    }
  });
})();
