/* Chemistry topic 9: Introduction to kinetics and equilibria — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const RGAS = 8.314;

  /* complementary error function (Abramowitz & Stegun 7.1.26, error < 2 × 10⁻⁷) */
  function erfc(x) {
    const t = 1 / (1 + 0.3275911 * x);
    const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    return y * Math.exp(-x * x);
  }
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((k) => n <= k + 1e-9) * p;
  }

  /* ======================================================================
     1. Maxwell–Boltzmann distribution, temperature and catalysts
     Energies are in units of kT at 300 K, so the tail is visible.
     ====================================================================== */
  const EA = 7.0, EA_CAT = 4.5, EMAX = 12;
  const fMB = (E, kT) => (E <= 0 ? 0 : (2 / Math.sqrt(Math.PI)) * Math.pow(kT, -1.5) * Math.sqrt(E) * Math.exp(-E / kT));
  const above = (Ea, kT) => { const x = Ea / kT; return erfc(Math.sqrt(x)) + 2 * Math.sqrt(x / Math.PI) * Math.exp(-x); };
  const pct = (f) => (f >= 0.1 ? (f * 100).toFixed(1) : f >= 0.001 ? (f * 100).toFixed(2) : (f * 100).toFixed(3)) + '%';

  function profile(ctx, x, y, w, h, cat) {
    const ax = x + 30, ay = y + 10, aw = w - 40, ah = h - 34;
    Sim.arrow(ctx, ax, ay + ah, ax, ay, { color: C.axis, width: 1.5, head: 8 });
    Sim.arrow(ctx, ax, ay + ah, ax + aw, ay + ah, { color: C.axis, width: 1.5, head: 8 });
    Sim.text(ctx, 'enthalpy', ax - 12, ay + ah / 2, { size: 11.5, color: C.muted, align: 'center', rotate: -Math.PI / 2 });
    Sim.text(ctx, 'progress of reaction', ax + aw / 2, ay + ah + 14, { size: 11.5, color: C.muted, align: 'center' });
    const yR = ay + ah * 0.55, yP = ay + ah * 0.85;
    const yTop = yR - (ah * 0.5) * (EA / EA);
    const yCat = yR - (ah * 0.5) * (EA_CAT / EA);
    const x0 = ax + 6, x1 = ax + aw * 0.25, xm = ax + aw * 0.5, x2 = ax + aw * 0.72, x3 = ax + aw - 4;
    function hump(top, col, dash) {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x0, yR);
      ctx.lineTo(x1, yR);
      ctx.bezierCurveTo(x1 + (xm - x1) * 0.55, yR, xm - (xm - x1) * 0.45, top, xm, top);
      ctx.bezierCurveTo(xm + (x2 - xm) * 0.45, top, x2 - (x2 - xm) * 0.55, yP, x2, yP);
      ctx.lineTo(x3, yP);
      ctx.stroke();
      ctx.restore();
    }
    hump(yTop, C.navy);
    if (cat) hump(yCat, C.green, [7, 4]);
    Sim.line(ctx, x1, yR, x3, yR, { color: C.grey, width: 1, dash: [4, 4] });
    Sim.arrow(ctx, xm - 14, yR, xm - 14, yTop + 3, { color: C.red, width: 2 });
    Sim.text(ctx, 'Eₐ', xm - 20, (yR + yTop) / 2, { size: 12.5, bold: true, color: C.red, align: 'right' });
    if (cat) {
      Sim.arrow(ctx, xm + 14, yR, xm + 14, yCat + 3, { color: C.green, width: 2 });
      Sim.text(ctx, 'Eₐ with catalyst', xm + 20, (yR + yCat) / 2, { size: 12, bold: true, color: C.green });
    }
    Sim.arrow(ctx, x3 - 12, yR, x3 - 12, yP - 2, { color: C.orange, width: 2 });
    Sim.text(ctx, 'ΔH', x3 - 18, (yR + yP) / 2 + 2, { size: 12, bold: true, color: C.orange, align: 'right' });
    Sim.text(ctx, 'reactants', x0, yR - 9, { size: 11.5 });
    Sim.text(ctx, 'products', x2 + 4, yP + 11, { size: 11.5 });
  }

  Sim.create('#sim-chem-09-mb', {
    title: 'Maxwell–Boltzmann distribution',
    height: (w) => (w >= 680 ? 360 : 580),
    controls: [
      { key: 'T', label: 'Temperature', min: 200, max: 800, step: 10, value: 300, unit: 'K', format: (v) => v.toFixed(0) },
      { key: 'cat', type: 'check', label: 'Add a catalyst', value: false },
      { key: 'ref', type: 'check', label: 'Show the 300 K curve', value: true },
      { key: 'dbl', type: 'check', label: 'Double the number of molecules', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 680;
      const kT = p.T / 300;
      const mult = p.dbl ? 2 : 1;
      const Ea = p.cat ? EA_CAT : EA;
      const gb = wide ? { x: 46, y: 30, w: w * 0.6 - 46, h: h - 30 - 34 } : { x: 40, y: 30, w: w - 56, h: 280 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 0, xmax: EMAX, ymin: 0, ymax: p.dbl ? 1.5 : 0.78, ticks: false, grid: false,
        xlabel: 'energy', ylabel: 'number of molecules' }));
      g.axes();
      const fn = (E) => mult * fMB(E, kT);
      g.fill(fn, Ea, EMAX, { color: 'rgba(240,140,0,0.38)', samples: 160 });
      if (p.ref && !p.dbl && Math.abs(p.T - 300) > 1) g.plot((E) => fMB(E, 1), { color: C.grey, width: 2, dash: [6, 4] });
      if (p.dbl) g.plot((E) => fMB(E, kT), { color: C.sky, width: 2, dash: [3, 4] });
      g.plot(fn, { color: C.navy, width: 2.8, samples: 300 });
      // E_a lines
      if (p.cat) {
        g.vline(EA, { color: C.grey, dash: [4, 4] });
        g.label(EA, (p.dbl ? 1.5 : 0.78) * 0.93, 'Eₐ', { color: C.grey, align: 'left', size: 12 });
      }
      Sim.line(ctx, g.px(Ea), g.y, g.px(Ea), g.y + g.h, { color: p.cat ? C.green : C.red, width: 2 });
      Sim.text(ctx, p.cat ? 'Eₐ (catalysed)' : 'Eₐ', g.px(Ea) + 5, g.y + 12, { size: 12.5, bold: true, color: p.cat ? C.green : C.red });
      // most probable and mean energies
      const Emp = kT / 2, Emean = 1.5 * kT;
      g.dot(Emp, fn(Emp), { color: C.navy, r: 4 });
      Sim.text(ctx, 'Eₘₚ', g.px(Emp), g.py(fn(Emp)) - 12, { size: 12, bold: true, color: C.navy, align: 'center' });
      Sim.line(ctx, g.px(Emean), g.py(fn(Emean)) - 8, g.px(Emean), g.y + g.h, { color: C.purple, width: 1.5, dash: [3, 3] });
      Sim.text(ctx, 'mean', g.px(Emean) + 4, g.py(fn(Emean)) - 12, { size: 11.5, color: C.purple });
      // legend
      let ly = g.y + 30;
      const lx = g.x + g.w - 8;
      Sim.text(ctx, p.T.toFixed(0) + ' K', lx, ly, { size: 12.5, bold: true, color: C.navy, align: 'right' }); ly += 17;
      if (p.ref && !p.dbl && Math.abs(p.T - 300) > 1) { Sim.text(ctx, '- - 300 K', lx, ly, { size: 12, color: C.grey, align: 'right' }); ly += 17; }
      if (p.dbl) { Sim.text(ctx, '··· original number', lx, ly, { size: 12, color: C.sky, align: 'right' }); ly += 17; }
      Sim.text(ctx, 'shaded: E ≥ Eₐ', lx, ly, { size: 12, color: C.orange, align: 'right', bold: true });
      // reaction profile
      if (wide) profile(ctx, w * 0.63, 24, w * 0.37 - 10, h - 40, p.cat);
      else profile(ctx, 6, gb.y + gb.h + 40, w - 16, h - gb.y - gb.h - 52, p.cat);
    },
    readout(s) {
      const p = s.p;
      const kT = p.T / 300;
      const Ea = p.cat ? EA_CAT : EA;
      const f = above(Ea, kT);
      const f0 = above(EA, 1);
      const ratio = (p.dbl ? 2 : 1) * (f / f0) * Math.sqrt(p.T / 300);
      return [
        ['Fraction of molecules with E ≥ Eₐ', pct(f), true],
        ['Rate compared with 300 K, no catalyst', '× ' + (ratio >= 100 ? ratio.toFixed(0) : ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2))],
        ['Area under the curve', p.dbl ? 'doubled (twice as many molecules)' : 'unchanged by temperature']
      ];
    }
  });

  /* ======================================================================
     2. Rate of reaction: magnesium + excess hydrochloric acid, gas syringe
     ====================================================================== */
  const VM = 24000, VACID = 50, TEND = 180;
  const KEEPCOL = [C.orange, C.purple, C.teal, C.pink];
  function runRate(p) {
    const n0 = p.m / 24.3;
    const nA0 = p.c * VACID / 1000;
    const T = p.T + 273;
    const k = 0.0277 * Math.exp((-50000 / RGAS) * (1 / T - 1 / 293)) * (p.form === 'powder' ? 6 : 1);
    const dt = 0.05;
    let n = n0, nA = nA0;
    const pts = [];
    for (let i = 0; i <= TEND / dt; i++) {
      if (i % 5 === 0) pts.push([i * dt, (n0 - n) * VM]);
      const kk = k * (nA / (VACID / 1000));
      const dn = n * (1 - Math.exp(-kk * dt));
      n -= dn;
      nA -= 2 * dn;
    }
    const Vmax = n0 * VM;
    const t95 = (pts.find((q) => q[1] >= 0.95 * Vmax) || [null])[0];
    return { pts, Vmax, init: k * p.c * n0 * VM, t95, n0, nA0 };
  }
  const desc = (p) => p.c.toFixed(2) + ' M, ' + p.T + ' °C, ' + p.form + ', ' + p.m.toFixed(2) + ' g';

  Sim.create('#sim-chem-09-rate', {
    title: 'Following a reaction with a gas syringe',
    height: (w) => (w >= 680 ? 380 : 600),
    animate: true,
    controls: [
      { key: 'c', label: 'Concentration of HCl (50 cm³, excess)', min: 0.5, max: 2, step: 0.25, value: 1, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'T', label: 'Temperature', min: 20, max: 60, step: 5, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'm', label: 'Mass of magnesium (limiting)', min: 0.02, max: 0.08, step: 0.01, value: 0.06, unit: 'g', format: (v) => v.toFixed(2) },
      { key: 'form', type: 'select', label: 'Magnesium as', options: [['ribbon', 'ribbon'], ['powder', 'powder (larger surface area)']], value: 'ribbon' },
      { key: 'tan', type: 'check', label: 'Show the tangent at t = 0', value: true },
      { type: 'button', label: '📌 Keep this curve', onClick: (s) => {
        const st = s.state;
        if (st.kept.length >= 4) st.kept.shift();
        st.kept.push({ pts: st.run.pts, col: KEEPCOL[st.keptN % 4], label: String.fromCharCode(65 + (st.keptN % 26)), desc: desc(s.p) });
        st.keptN++;
      } },
      { type: 'button', label: 'Clear kept curves', ghost: true, onClick: (s) => { s.state.kept = []; s.state.keptN = 0; } }
    ],
    onChange(s, key) {
      if (key === 'tan') return;
      const kept = s.state.kept, keptN = s.state.keptN;
      s.reset();
      s.state.kept = kept;
      s.state.keptN = keptN;
      s.play();
    },
    init(s) {
      s.state.run = runRate(s.p);
      s.state.clock = 0;
      if (!s.state.kept) { s.state.kept = []; s.state.keptN = 0; }
    },
    update(s, dt) {
      if (s.state.clock >= TEND) { s.pause(); return; }
      s.state.clock = Math.min(TEND, s.state.clock + dt * 30);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const run = st.run;
      const wide = w >= 680;
      const clock = st.clock;
      const idx = Math.min(run.pts.length - 1, Math.round(clock / 0.25));
      const V = run.pts[idx][1];
      /* apparatus: flask + delivery tube + gas syringe */
      const ax = wide ? 14 : 10, ay = wide ? 40 : 30, aw = wide ? w * 0.36 : w - 20;
      const fx = ax + 10, fy = ay + 60, fw = Math.min(90, aw * 0.3), fh = 90;
      // conical flask
      const neck = fw * 0.28;
      Sim.polyline(ctx, [[fx + fw / 2 - neck / 2, fy], [fx + fw / 2 - neck / 2, fy + 22], [fx, fy + fh], [fx + fw, fy + fh], [fx + fw / 2 + neck / 2, fy + 22], [fx + fw / 2 + neck / 2, fy]], { color: '#868e96', width: 2 });
      const ly = fy + fh * 0.5;
      const wAt = (yy) => (fw / 2 - neck / 2) * (yy - (fy + 22)) / (fh - 22);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fx + fw / 2 - neck / 2 - wAt(ly), ly);
      ctx.lineTo(fx + 2, fy + fh - 2);
      ctx.lineTo(fx + fw - 2, fy + fh - 2);
      ctx.lineTo(fx + fw / 2 + neck / 2 + wAt(ly), ly);
      ctx.closePath();
      ctx.fillStyle = 'rgba(208,228,255,0.8)';
      ctx.fill();
      ctx.restore();
      const left = clamp(1 - V / run.Vmax, 0, 1);
      if (p.form === 'ribbon') {
        if (left > 0.01) Sim.rect(ctx, fx + fw * 0.3, fy + fh - 8, fw * 0.4 * left + 2, 4, { fill: '#adb5bd', r: 1 });
      } else {
        for (let i = 0; i < Math.round(14 * left); i++) Sim.circle(ctx, fx + fw * 0.22 + ((i * 7.3) % (fw * 0.56)), fy + fh - 6 - (i % 3) * 2, 1.6, { fill: '#868e96' });
      }
      const rateNow = idx > 0 ? (run.pts[idx][1] - run.pts[idx - 1][1]) / 0.25 : run.init;
      const nb = clamp(Math.round(rateNow * 4), 0, 14);
      for (let i = 0; i < nb && left > 0.01 && clock < TEND; i++) {
        const ph = (s.t * 1.3 + i * 0.29) % 1;
        Sim.circle(ctx, fx + fw * 0.3 + ((i * 11) % (fw * 0.4)), fy + fh - 10 - ph * (fh * 0.42), 2, { stroke: '#868e96', width: 1 });
      }
      Sim.rect(ctx, fx + fw / 2 - neck / 2 - 3, fy - 10, neck + 6, 12, { fill: '#f08c00', r: 2 });
      // delivery tube to the syringe
      const sx = fx + fw + 26, sy = fy - 34, sl = aw - (sx - ax) - 10, sh = 22;
      Sim.polyline(ctx, [[fx + fw / 2, fy - 10], [fx + fw / 2, sy + sh / 2], [sx, sy + sh / 2]], { color: '#868e96', width: 3 });
      Sim.rect(ctx, sx, sy, sl, sh, { fill: '#f8f9fa', stroke: '#868e96', width: 2, r: 3 });
      for (let k = 0; k <= 10; k++) Sim.line(ctx, sx + 6 + (sl - 12) * k / 10, sy, sx + 6 + (sl - 12) * k / 10, sy + (k % 5 === 0 ? 8 : 5), { color: '#868e96', width: 1 });
      const px = sx + 6 + (sl - 12) * clamp(V / 100, 0, 1);
      Sim.rect(ctx, sx + 6, sy + 3, px - sx - 6, sh - 6, { fill: 'rgba(77,171,247,0.15)' });
      Sim.rect(ctx, px - 2, sy + 2, 5, sh - 4, { fill: C.axis });
      Sim.line(ctx, px + 2, sy + sh / 2, px + 34, sy + sh / 2, { color: C.axis, width: 3 });
      Sim.text(ctx, 'gas syringe: ' + V.toFixed(1) + ' cm³', sx + sl / 2, sy - 12, { size: 12, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'Mg + 2HCl → MgCl₂ + H₂', fx, fy + fh + 18, { size: 12, color: C.ink });
      Sim.text(ctx, 't = ' + clock.toFixed(0) + ' s', fx, fy + fh + 36, { size: 12, color: C.muted });
      /* graph */
      const gb = wide ? { x: w * 0.4 + 30, y: 30, w: w * 0.6 - 30 - 16, h: h - 30 - 46 } : { x: 46, y: 270, w: w - 46 - 16, h: h - 270 - 44 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 0, xmax: TEND, ymin: 0, ymax: 100, xstep: 30, ystep: 20, xlabel: 'time / s', ylabel: 'volume of H₂ / cm³' }));
      g.axes();
      st.kept.forEach((K) => {
        g.path(K.pts, { color: K.col, width: 2 });
        const vEnd = K.pts[K.pts.length - 1][1];
        const half = K.pts.find((q) => q[1] >= 0.5 * vEnd) || K.pts[K.pts.length - 1];
        Sim.text(ctx, K.label, g.px(half[0]) - 7, g.py(half[1]) - 6, { size: 13, bold: true, color: K.col, align: 'right', bg: 'rgba(255,255,255,0.8)', pad: 2 });
      });
      g.path(run.pts.slice(0, idx + 1), { color: C.navy, width: 2.8 });
      if (p.tan) {
        const tEnd = Math.min(TEND, 100 / run.init);
        g.path([[0, 0], [tEnd, run.init * tEnd]], { color: C.red, width: 1.8, dash: [6, 4] });
      }
      g.hline(run.Vmax, { color: C.grey });
    },
    readout(s) {
      const run = s.state.run;
      const rows = [
        ['Initial rate (tangent gradient)', run.init.toFixed(2) + ' cm³ s⁻¹', true],
        ['Final volume', run.Vmax.toFixed(1) + ' cm³'],
        ['Time to 95% complete', run.t95 == null ? 'more than 180 s' : run.t95.toFixed(0) + ' s'],
        ['Amounts', run.n0.toExponential(2).replace('e-', ' × 10⁻').replace(/⁻(\d)/, (m, d) => '⁻' + Sim.sup(d)) + ' mol Mg, ' + run.nA0.toFixed(3) + ' mol HCl']
      ];
      s.state.kept.forEach((K) => rows.push([K.label, K.desc]));
      return rows;
    }
  });

  /* ======================================================================
     3. Dynamic equilibrium and Le Chatelier's principle
     ====================================================================== */
  const SYS = {
    no2: {
      opt: '2NO₂(g) ⇌ N₂O₄(g)  (brown ⇌ colourless)', eq: '2NO₂(g) ⇌ N₂O₄(g)', dH: -57, gas: true, T0: 298, Tmin: 248, Tmax: 398, dT: 25,
      sp: [{ f: 'NO₂', nu: -2, c: 0.044, col: '#c2410c' }, { f: 'N₂O₄', nu: 1, c: 0, col: '#868e96' }], K0: 170,
      tint: { i: 0, rgb: '160,70,20', scale: 0.03 },
      b1: { label: 'Inject more NO₂', i: 0, add: 0.012 }, b2: { label: 'Inject more N₂O₄', i: 1, add: 0.008 }
    },
    nh3: {
      opt: 'N₂(g) + 3H₂(g) ⇌ 2NH₃(g)', eq: 'N₂(g) + 3H₂(g) ⇌ 2NH₃(g)', dH: -92, gas: true, T0: 700, Tmin: 500, Tmax: 900, dT: 50,
      sp: [{ f: 'N₂', nu: -1, c: 0.5, col: C.blue }, { f: 'H₂', nu: -3, c: 1.5, col: C.grey }, { f: 'NH₃', nu: 2, c: 0, col: C.green }], K0: 0.73,
      b1: { label: 'Add more N₂', i: 0, add: 0.3 }, b2: { label: 'Remove NH₃ (liquefy it)', i: 2, scale: 0.2 }
    },
    hi: {
      opt: 'H₂(g) + I₂(g) ⇌ 2HI(g)  (purple I₂)', eq: 'H₂(g) + I₂(g) ⇌ 2HI(g)', dH: -9.4, gas: true, T0: 700, Tmin: 500, Tmax: 900, dT: 50,
      sp: [{ f: 'H₂', nu: -1, c: 0.010, col: C.grey }, { f: 'I₂', nu: -1, c: 0.010, col: C.purple }, { f: 'HI', nu: 2, c: 0, col: C.teal }], K0: 54,
      tint: { i: 1, rgb: '120,40,160', scale: 0.012 },
      b1: { label: 'Add more H₂', i: 0, add: 0.006 }, b2: { label: 'Remove some HI', i: 2, scale: 0.4 }
    },
    iod: {
      opt: 'I₂(aq) + 2OH⁻(aq) ⇌ I⁻(aq) + IO⁻(aq) + H₂O(l)', eq: 'I₂(aq) + 2OH⁻(aq) ⇌ I⁻(aq) + IO⁻(aq) + H₂O(l)', dH: null, gas: false, T0: 298,
      sp: [{ f: 'I₂', nu: -1, c: 0.010, col: '#8c5014' }, { f: 'OH⁻', nu: -2, c: 0.010, col: C.blue }, { f: 'I⁻', nu: 1, c: 0, col: C.green }, { f: 'IO⁻', nu: 1, c: 0, col: C.pink }], K0: 2000,
      tint: { i: 0, rgb: '140,80,20', scale: 0.012 },
      b1: { label: 'Add NaOH(aq) (more OH⁻)', i: 1, add: 0.02 }, b2: { label: 'Add acid (removes OH⁻)', i: 1, scale: 0.1 }
    }
  };
  const Kof = (S, T) => (S.dH == null ? S.K0 : S.K0 * Math.exp((-S.dH * 1000 / RGAS) * (1 / T - 1 / S.T0)));
  function solveXi(base, nu, K) {
    let lo = -Infinity, hi = Infinity;
    nu.forEach((v, i) => { if (v > 0) lo = Math.max(lo, -base[i] / v); else hi = Math.min(hi, base[i] / -v); });
    const lnK = Math.log(K);
    const f = (x) => nu.reduce((a, v, i) => a + v * Math.log(base[i] + v * x), 0) - lnK;
    for (let it = 0; it < 200; it++) {
      const mid = (lo + hi) / 2;
      if (mid === lo || mid === hi) break;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }
  function eqConc(st, S) { return st.base.map((b, i) => Math.max(0, b + S.sp[i].nu * st.xi)); }
  function eqStart(s) {
    const S = SYS[s.p.sys];
    const st = s.state;
    st.T = S.T0;
    st.V = 1;
    st.t = 0;
    st.base = S.sp.map((q) => q.c);
    st.xi = 0;
    st.xiEq = solveXi(st.base, S.sp.map((q) => q.nu), Kof(S, st.T));
    st.hist = [];
    st.events = [{ t: 0, label: 'start' }];
    st.msg = 'Only ' + (S.sp[0].c > 0 && S.sp[S.sp.length - 1].c === 0 ? 'reactants' : 'some species') + ' at the start. Watch the forward rate fall and the backward rate rise until they are equal: dynamic equilibrium.';
    st.sample = 0;
  }
  function gasMoles(S) {
    let l = 0, r = 0;
    S.sp.forEach((q) => { if (q.nu < 0) l -= q.nu; else r += q.nu; });
    return { l, r };
  }
  function disturb(s, type) {
    const S = SYS[s.p.sys];
    const st = s.state;
    const nu = S.sp.map((q) => q.nu);
    const c = eqConc(st, S);
    const dirOf = (xe, base) => {
      const scale = Math.max.apply(null, base);
      return Math.abs(xe) < scale * 1e-4 ? 'none' : xe > 0 ? 'right' : 'left';
    };
    const dirTxt = (d) => (d === 'right' ? 'to the right (forwards)' : d === 'left' ? 'to the left (backwards)' : 'hardly at all');
    let label = '', msg = '';
    /* The change is applied twice: to the actual mixture (which may still be settling after
       an earlier change), and to the equilibrium mixture the system was heading for. The
       second one gives the Le Chatelier direction caused by this change alone. */
    let apply = (arr) => arr.slice();
    if (type === 'heat' || type === 'cool') {
      if (S.dH == null) { st.msg = 'Temperature is not explored for this aqueous system: try one of the gas equilibria.'; return; }
      const T = clamp(st.T + (type === 'heat' ? S.dT : -S.dT), S.Tmin, S.Tmax);
      if (T === st.T) { st.msg = 'That is as far as the temperature goes in this model.'; return; }
      st.T = T;
      label = type === 'heat' ? 'heated' : 'cooled';
    } else if (type === 'comp' || type === 'exp') {
      if (!S.gas) { st.msg = 'There are no gases in this system, so changing the pressure has no effect on it.'; return; }
      const f = type === 'comp' ? 2 : 0.5;
      if (st.V / f > 2.01 || st.V / f < 0.249) { st.msg = 'The syringe cannot go any further that way.'; return; }
      st.V /= f;
      apply = (arr) => arr.map((x) => x * f);
      label = type === 'comp' ? 'compressed' : 'expanded';
    } else if (type === 'b1' || type === 'b2') {
      const B = S[type];
      apply = (arr) => { const a = arr.slice(); if (B.add) a[B.i] += B.add; else a[B.i] *= B.scale; return a; };
      label = B.add ? '+' + S.sp[B.i].f : '−' + S.sp[B.i].f;
    }
    const K = Kof(S, st.T);
    const target = apply(st.base.map((b, i) => Math.max(0, b + nu[i] * st.xiEq)));
    const d = dirOf(solveXi(target, nu, K), target);
    st.base = apply(c);
    st.xi = 0;
    st.xiEq = solveXi(st.base, nu, K);
    if (type === 'heat') msg = 'Temperature raised to ' + st.T + ' K. The equilibrium shifts ' + dirTxt(d) + ', the endothermic direction, which absorbs some of the added heat.';
    else if (type === 'cool') msg = 'Temperature lowered to ' + st.T + ' K. The equilibrium shifts ' + dirTxt(d) + ', the exothermic direction, which releases heat.';
    else if (type === 'comp' || type === 'exp') {
      const gm = gasMoles(S);
      const head = type === 'comp' ? 'Pressure doubled (volume halved): every concentration doubles at once. ' : 'Pressure halved (volume doubled): every concentration halves at once. ';
      if (gm.l === gm.r || d === 'none') msg = head + 'Both sides have ' + gm.l + ' gas molecules, so the position of equilibrium does not change.';
      else msg = head + 'The equilibrium then shifts ' + dirTxt(d) + ', towards the side with ' + (type === 'comp' ? 'fewer' : 'more') + ' gas molecules (' + (d === 'right' ? gm.r : gm.l) + ' rather than ' + (d === 'right' ? gm.l : gm.r) + ').';
    } else {
      const B = S[type];
      const f = S.sp[B.i].f;
      msg = (B.add ? 'More ' + f + ' added' : 'Some ' + f + ' removed') + '. The equilibrium shifts ' + dirTxt(d) + ' to ' + (B.add ? 'use up some of the added ' + f : 'replace some of the ' + f + ' that was removed') + '.';
    }
    st.msg = msg;
    st.events.push({ t: st.t, label });
  }

  Sim.create('#sim-chem-09-eq', {
    title: 'Disturbing an equilibrium',
    height: (w) => (w >= 700 ? 390 : 640),
    animate: true,
    controls: [
      { key: 'sys', type: 'select', label: 'Equilibrium', options: Object.keys(SYS).map((k) => [k, SYS[k].opt]), value: 'no2' },
      { key: 'cat', type: 'check', label: 'Catalyst present', value: false },
      { key: 'heat', type: 'button', label: '🔥 Heat', onClick: (s) => disturb(s, 'heat') },
      { key: 'cool', type: 'button', label: '❄ Cool', onClick: (s) => disturb(s, 'cool') },
      { key: 'comp', type: 'button', label: 'Compress ×2', onClick: (s) => disturb(s, 'comp') },
      { key: 'exp', type: 'button', label: 'Expand ×½', onClick: (s) => disturb(s, 'exp') },
      { key: 'b1', type: 'button', label: 'Inject more NO₂', onClick: (s) => disturb(s, 'b1') },
      { key: 'b2', type: 'button', label: 'Inject more N₂O₄', onClick: (s) => disturb(s, 'b2') }
    ],
    onChange(s, key, v) {
      if (key === 'sys') {
        const S = SYS[v];
        s.controls.b1.el.textContent = S.b1.label;
        s.controls.b2.el.textContent = S.b2.label;
        s.reset();
        s.play();
      } else if (key === 'cat') {
        s.state.msg = v
          ? 'Catalyst added: the forward and backward reactions both speed up by the same factor. Equilibrium is reached sooner, but its position does not change.'
          : 'Catalyst removed: both reactions slow down by the same factor, and the position of equilibrium is unchanged.';
        s.state.events.push({ t: s.state.t, label: v ? 'catalyst' : 'no catalyst' });
      }
    },
    init(s) { eqStart(s); },
    update(s, dt) {
      const S = SYS[s.p.sys];
      const st = s.state;
      const tau = 1.2 * (s.p.cat ? 0.18 : 1) * Math.exp((40000 / RGAS) * (1 / st.T - 1 / S.T0));
      st.xi += (st.xiEq - st.xi) * (1 - Math.exp(-dt / tau));
      st.t += dt;
      st.sample += dt;
      if (st.sample >= 0.05 || !st.hist.length) {
        st.sample = 0;
        st.hist.push([st.t, eqConc(st, S)]);
        while (st.hist.length && st.hist[0][0] < st.t - 30) st.hist.shift();
      }
      while (st.events.length && st.events[0].t < st.t - 30) st.events.shift();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const S = SYS[p.sys];
      const st = s.state;
      const c = eqConc(st, S);
      const wide = w >= 700;
      Sim.text(ctx, S.eq + (S.dH == null ? '' : '    ΔH = ' + (S.dH < 0 ? '−' : '+') + Math.abs(S.dH) + ' kJ mol⁻¹'), w / 2, 16, { size: wide ? 14 : 12, bold: true, color: C.navy, align: 'center' });
      /* graph of concentration against time */
      const gb = wide ? { x: 56, y: 44, w: w * 0.6 - 56, h: h - 44 - 64 } : { x: 50, y: 300, w: w - 50 - 14, h: h - 300 - 64 };
      let top = 0;
      st.hist.forEach((q) => q[1].forEach((x) => { top = Math.max(top, x); }));
      top = Math.max(top, ...c);
      const t1 = Math.max(30, st.t), t0 = t1 - 30;
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: t0, xmax: t1, ymin: 0, ymax: niceCeil(top * 1.12), xstep: 5, xlabel: 'time / s', ylabel: 'concentration / mol dm⁻³' }));
      g.axes();
      st.events.forEach((e) => {
        if (e.t < t0) return;
        g.vline(e.t, { color: '#ced4da', dash: [3, 3], width: 1 });
        Sim.text(ctx, e.label, g.px(e.t) + 3, g.y + g.h - 8, { size: 10.5, color: C.muted, rotate: -Math.PI / 2 });
      });
      S.sp.forEach((q, i) => g.path(st.hist.map((r) => [r[0], r[1][i]]), { color: q.col, width: 2.4 }));
      // legend
      S.sp.forEach((q, i) => {
        const lx = g.x + i * Math.min(120, g.w / S.sp.length), lyy = g.y + g.h + 34;
        Sim.rect(ctx, lx, lyy - 4, 14, 8, { fill: q.col, r: 2 });
        Sim.text(ctx, q.f + ' ' + (c[i] < 0.01 ? c[i].toFixed(4) : c[i] < 0.1 ? c[i].toFixed(3) : c[i].toFixed(2)), lx + 18, lyy, { size: 11.5, color: C.ink, bg: 'rgba(255,255,255,0.8)', pad: 2 });
      });
      /* vessel */
      const vx = wide ? w * 0.63 : 16, vy = wide ? 50 : 40, vw = wide ? w * 0.37 - 24 : w - 32, vh = 110;
      const tint = S.tint ? 'rgba(' + S.tint.rgb + ',' + (0.85 * clamp(c[S.tint.i] / S.tint.scale, 0, 1)).toFixed(3) + ')' : 'rgba(0,0,0,0)';
      let innerX, innerW;
      if (S.gas) {
        const bl = vw - 40;
        Sim.rect(ctx, vx, vy, bl, vh, { fill: '#f8f9fa', stroke: '#868e96', width: 2, r: 6 });
        const pl = vx + 8 + (bl - 16) * (st.V / 2);
        innerX = vx + 4; innerW = pl - vx - 4;
        Sim.rect(ctx, innerX, vy + 4, innerW, vh - 8, { fill: tint, r: 4 });
        Sim.rect(ctx, pl, vy + 2, 7, vh - 4, { fill: C.axis, r: 2 });
        Sim.line(ctx, pl + 7, vy + vh / 2, vx + vw, vy + vh / 2, { color: C.axis, width: 5 });
        Sim.text(ctx, 'volume ×' + st.V.toFixed(2).replace(/0$/, '') + '   T = ' + st.T + ' K', vx, vy + vh + 16, { size: 12, color: C.ink });
      } else {
        Sim.polyline(ctx, [[vx + 20, vy], [vx + 20, vy + vh], [vx + vw - 40, vy + vh], [vx + vw - 40, vy]], { color: '#868e96', width: 2.5 });
        innerX = vx + 22; innerW = vw - 64;
        Sim.rect(ctx, innerX, vy + 18, innerW, vh - 20, { fill: 'rgba(208,228,255,0.45)' });
        Sim.rect(ctx, innerX, vy + 18, innerW, vh - 20, { fill: tint });
        Sim.text(ctx, 'solution at ' + st.T + ' K', vx + 20, vy + vh + 16, { size: 12, color: C.ink });
      }
      // molecules as dots (amount = concentration × volume)
      const total0 = S.sp.reduce((a, q) => a + Math.max(0, q.c), 0);
      const unit = total0 / 36;
      let k = 0;
      S.sp.forEach((q, i) => {
        const n = Math.round(c[i] * st.V / unit);
        for (let j = 0; j < n && k < 160; j++, k++) {
          const hx = ((k * 0.6180339) % 1), hy = ((k * 0.7548777 + 0.31) % 1);
          const jx = Math.sin(s.t * 2.1 + k) * 2, jy = Math.cos(s.t * 1.7 + k * 1.3) * 2;
          const x = innerX + 6 + hx * Math.max(4, innerW - 12) + jx;
          const y = vy + (S.gas ? 10 : 24) + hy * (vh - (S.gas ? 20 : 32)) + jy;
          Sim.circle(ctx, x, y, 3.2, { fill: q.col, stroke: '#fff', width: 0.8 });
        }
      });
      /* forward and backward rates */
      const K = Kof(S, st.T);
      const kf = (p.cat ? 6 : 1) * Math.exp((-40000 / RGAS) * (1 / st.T - 1 / S.T0));
      let rf = kf, rb = kf / K;
      S.sp.forEach((q, i) => { if (q.nu < 0) rf *= Math.pow(c[i], -q.nu); else rb *= Math.pow(c[i], q.nu); });
      const mx = Math.max(rf, rb) || 1;
      const by = vy + vh + 34, bw = vw - 90;
      [['forward', rf / mx, C.blue], ['backward', rb / mx, C.red]].forEach(([lab, f, col], j) => {
        const yy = by + j * 24;
        Sim.text(ctx, lab, vx, yy + 7, { size: 12, color: C.ink });
        Sim.rect(ctx, vx + 72, yy, bw, 14, { fill: C.light, r: 3 });
        Sim.rect(ctx, vx + 72, yy, Math.max(2, bw * f), 14, { fill: col, r: 3 });
      });
      const eqm = Math.abs(rf - rb) / mx < 0.03;
      Sim.text(ctx, eqm ? 'rates equal: dynamic equilibrium' : rf > rb ? 'forward faster: shifting right' : 'backward faster: shifting left',
        vx + 72 + bw / 2, by + 60, { size: 12.5, bold: true, color: eqm ? C.green : C.orange, align: 'center' });
    },
    readout(s) {
      return [['What happened', s.state.msg, true]];
    }
  });
})();
