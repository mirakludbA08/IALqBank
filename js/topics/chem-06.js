/* Chemistry topic 6: Energetics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const CW = 4.18;            // specific heat capacity of water / J g⁻¹ K⁻¹

  /* numbers with a proper minus sign */
  const num = (v, d) => (v < -1e-12 ? '−' : '') + Math.abs(v).toFixed(d == null ? 1 : d);
  const signed = (v, d) => (v > 1e-12 ? '+' : '') + num(v, d);
  function sig3(v) {
    const a = Math.abs(v);
    if (a === 0) return '0';
    const d = clamp(2 - Math.floor(Math.log10(a)), 0, 4);
    return (v < 0 ? '−' : '') + a.toFixed(d);
  }
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function fitLine(pts) {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const d = n * sxx - sx * sx;
    if (n < 2 || Math.abs(d) < 1e-12) return { m: 0, c: n ? sy / n : 0 };
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  function boxText(ctx, str, cx, cy, o) {
    o = o || {};
    const size = o.size || 14;
    const tw = Sim.measure(ctx, str, { size, bold: o.bold });
    const bw = tw + 22, bh = size + 18;
    Sim.rect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, { fill: o.fill || '#edf2ff', stroke: o.stroke || C.navy, width: 1.5, r: 6 });
    Sim.text(ctx, str, cx, cy + 1, { size, align: 'center', color: o.color || C.ink, bold: o.bold });
    return { l: cx - bw / 2, r: cx + bw / 2, t: cy - bh / 2, b: cy + bh / 2, w: bw, h: bh };
  }

  /* ======================================================================
     1. Calorimetry in a polystyrene cup
     ====================================================================== */
  const TMIX = 240, TEND = 720, TROOM = 20.0;
  const CCUP = 6;             // heat capacity of the cup + thermometer / J K⁻¹ (ignored in the student's calculation)
  const CAL = {
    neut: {
      opt: 'HCl + NaOH (neutralisation)', eq: 'HCl(aq) + NaOH(aq) → NaCl(aq) + H₂O(l)', dH: -57.1, tau: 3, kind: 'mix',
      vLab: 'Volume of each solution', vMin: 25, vMax: 75, vVal: 50,
      aLab: 'Concentration of each solution', aMin: 0.5, aMax: 2, aStep: 0.05, aVal: 1, aUnit: 'mol dm⁻³', per: 'mol of H₂O formed'
    },
    disp: {
      opt: 'CuSO₄(aq) + excess zinc powder', eq: 'Zn(s) + CuSO₄(aq) → ZnSO₄(aq) + Cu(s)', dH: -217, tau: 40, kind: 'soln',
      vLab: 'Volume of CuSO₄(aq)', vMin: 25, vMax: 100, vVal: 50,
      aLab: 'Concentration of CuSO₄(aq)', aMin: 0.1, aMax: 1, aStep: 0.05, aVal: 0.5, aUnit: 'mol dm⁻³', per: 'mol of CuSO₄'
    },
    anh: {
      opt: 'Anhydrous CuSO₄ dissolving (CP2)', eq: 'CuSO₄(s) + aq → CuSO₄(aq)', dH: -66.5, tau: 15, kind: 'solid', M: 159.6,
      vLab: 'Volume of water', vMin: 40, vMax: 100, vVal: 50,
      aLab: 'Mass of anhydrous CuSO₄', aMin: 1, aMax: 6, aStep: 0.05, aVal: 4, aUnit: 'g', per: 'mol of CuSO₄'
    },
    hyd: {
      opt: 'Hydrated CuSO₄·5H₂O dissolving (CP2)', eq: 'CuSO₄·5H₂O(s) + aq → CuSO₄(aq)', dH: 11.7, tau: 25, kind: 'solid', M: 249.6,
      vLab: 'Volume of water', vMin: 40, vMax: 100, vVal: 50,
      aLab: 'Mass of CuSO₄·5H₂O', aMin: 1.5, aMax: 9.5, aStep: 0.05, aVal: 6.25, aUnit: 'g', per: 'mol of CuSO₄·5H₂O'
    },
    khco3: {
      opt: 'KHCO₃ + excess HCl (CP2)', eq: 'KHCO₃(s) + HCl(aq) → KCl(aq) + CO₂(g) + H₂O(l)', dH: 31.5, tau: 12, kind: 'acid', M: 100.1, ratio: 1,
      vLab: 'Volume of 2.00 mol dm⁻³ HCl', vMin: 25, vMax: 100, vVal: 30,
      aLab: 'Mass of KHCO₃', aMin: 1, aMax: 6, aStep: 0.05, aVal: 3, aUnit: 'g', per: 'mol of KHCO₃'
    },
    k2co3: {
      opt: 'K₂CO₃ + excess HCl (CP2)', eq: 'K₂CO₃(s) + 2HCl(aq) → 2KCl(aq) + CO₂(g) + H₂O(l)', dH: -33.1, tau: 12, kind: 'acid', M: 138.2, ratio: 2,
      vLab: 'Volume of 2.00 mol dm⁻³ HCl', vMin: 25, vMax: 100, vVal: 30,
      aLab: 'Mass of K₂CO₃', aMin: 1, aMax: 6, aStep: 0.05, aVal: 2.75, aUnit: 'g', per: 'mol of K₂CO₃'
    }
  };
  let aUnit = 'mol dm⁻³';

  function calAmounts(r, V, a) {
    let m, nCalc, nReact, warn = '';
    if (r.kind === 'mix') { m = 2 * V; nCalc = nReact = a * V / 1000; }
    else if (r.kind === 'soln') { m = V; nCalc = nReact = a * V / 1000; }
    else if (r.kind === 'solid') { m = V; nCalc = nReact = a / r.M; }
    else {
      m = V;
      nCalc = a / r.M;
      const nAcid = 2.0 * V / 1000;
      nReact = Math.min(nCalc, nAcid / r.ratio);
      if (nReact < nCalc - 1e-9) warn = 'HCl is NOT in excess: ' + nAcid.toFixed(4) + ' mol HCl can react with only ' + nReact.toFixed(4) + ' mol of solid, so some is left over.';
    }
    return { m, nCalc, nReact, warn };
  }
  function runCal(p) {
    const r = CAL[p.rx];
    const am = calAmounts(r, p.V, p.a);
    const k = p.lid ? 0.0007 : 0.0019;              // cooling constant / s⁻¹
    const heat = am.nReact * -r.dH * 1000;          // J released into the liquid (negative if endothermic)
    const dt = 0.5, N = Math.round(TEND / dt);
    const T = new Float64Array(N + 1);
    let temp = TROOM;
    for (let i = 0; i <= N; i++) {
      T[i] = temp;
      const t = i * dt;
      let dq = 0;
      if (t + dt > TMIX) {
        const a0 = Math.max(0, t - TMIX), a1 = t + dt - TMIX;
        dq = heat * (Math.exp(-a0 / r.tau) - Math.exp(-a1 / r.tau));
      }
      temp += dq / (am.m * CW + CCUP) - k * (temp - TROOM) * dt;
    }
    const Tat = (t) => T[clamp(Math.round(t / dt), 0, N)];
    const seed = (Object.keys(CAL).indexOf(p.rx) + 1) * 7919 + Math.round(p.V * 13) + Math.round(p.a * 1000) * 31 + (p.lid ? 5 : 0);
    const rand = rng(seed);
    const times = [0, 60, 120, 180];
    for (let t = TMIX + 30; t <= TEND; t += 30) times.push(t);
    const reads = times.map((t) => ({ t, T: Math.round((Tat(t) + (rand() - 0.5) * 0.12) * 10) / 10 }));
    const pre = reads.filter((q) => q.t < TMIX);
    const T0 = pre.reduce((s, q) => s + q.T, 0) / pre.length;
    const post = reads.filter((q) => q.t > TMIX);
    const exo = heat >= 0;
    let ext = post[0];
    post.forEach((q) => { if (exo ? q.T > ext.T : q.T < ext.T) ext = q; });
    const tFrom = Math.max(ext.t, TMIX + 4 * r.tau);
    let fitPts = post.filter((q) => q.t >= tFrom - 1e-9);
    if (fitPts.length < 4) fitPts = post.slice(-4);
    const fit = fitLine(fitPts.map((q) => [q.t, q.T]));
    const Tx = fit.m * TMIX + fit.c;
    return { r, am, T, Tat, reads, T0, ext, fit, fitFrom: fitPts[0].t, Tx, dText: Tx - T0, dTmax: ext.T - T0, heat };
  }
  function calResult(s) {
    const e = s.state.exp;
    const dT = Math.round((s.p.ext ? e.dText : e.dTmax) * 10) / 10;   // read to 0.1 K, as a student would
    const Q = e.am.m * CW * Math.abs(dT);
    const dH = -(e.am.m * CW * dT) / e.am.nCalc / 1000;
    return { dT, Q, dH };
  }
  function configureCal(s) {
    const r = CAL[s.p.rx];
    aUnit = r.aUnit;
    s.setLabel('V', r.vLab);
    s.setLabel('a', r.aLab);
    const vi = s.controls.V.el, ai = s.controls.a.el;
    vi.min = r.vMin; vi.max = r.vMax; vi.step = 5;
    ai.min = r.aMin; ai.max = r.aMax; ai.step = r.aStep;
    s.set('V', r.vVal);
    s.set('a', r.aVal);
  }
  const mmss = (t) => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');

  function drawCup(s, x, y, cw, ch, e, clock) {
    const { ctx, p } = s;
    const r = e.r;
    const f = clock > TMIX ? 1 - Math.exp(-(clock - TMIX) / r.tau) : 0;
    const temp = e.Tat(Math.min(clock, TEND));
    // beaker
    Sim.polyline(ctx, [[x, y + ch * 0.12], [x, y + ch], [x + cw, y + ch], [x + cw, y + ch * 0.12]], { color: '#adb5bd', width: 2.5 });
    // cup (trapezium)
    const cl = x + cw * 0.12, cr = x + cw * 0.88, ct = y + ch * 0.2, cb = y + ch - 6;
    const inset = cw * 0.07;
    const cupPts = [[cl, ct], [cl + inset, cb], [cr - inset, cb], [cr, ct]];
    Sim.polyline(ctx, cupPts, { color: '#ced4da', width: 7 });
    Sim.polyline(ctx, cupPts, { color: '#f8f9fa', width: 4 });
    // liquid
    const lt = ct + (cb - ct) * 0.3;
    const lerpX = (yy, left) => left ? cl + inset * (yy - ct) / (cb - ct) : cr - inset * (yy - ct) / (cb - ct);
    let fill = 'rgba(208,228,255,0.75)';
    if (p.rx === 'disp') fill = 'rgba(28,126,214,' + (0.18 + 0.6 * (1 - f) * Math.min(1, p.a / 0.6)).toFixed(3) + ')';
    else if (p.rx === 'anh' || p.rx === 'hyd') fill = 'rgba(28,126,214,' + (0.12 + 0.55 * f * Math.min(1, e.am.nReact / (p.V / 1000) / 0.6)).toFixed(3) + ')';
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(lerpX(lt, true) + 3, lt);
    ctx.lineTo(lerpX(cb, true) + 3, cb - 3);
    ctx.lineTo(lerpX(cb, false) - 3, cb - 3);
    ctx.lineTo(lerpX(lt, false) - 3, lt);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    // solids at the bottom
    const bw = (cr - cl) - 2 * inset - 10, bx = cl + inset + 5;
    if (p.rx === 'disp') {
      Sim.rect(ctx, bx, cb - 9, bw, 6, { fill: clock > TMIX ? '#b5651d' : '#adb5bd', r: 2 });
    } else if ((p.rx === 'anh' || p.rx === 'hyd' || p.rx === 'khco3' || p.rx === 'k2co3') && clock > TMIX) {
      const left = 1 - f + (e.am.nCalc - e.am.nReact) / e.am.nCalc * f;
      if (left > 0.02) Sim.rect(ctx, bx + bw * (1 - left) / 2, cb - 9, bw * left, 6, { fill: p.rx === 'hyd' ? '#4dabf7' : '#e9ecef', stroke: '#adb5bd', width: 1, r: 2 });
    }
    // bubbles of CO₂
    if ((p.rx === 'khco3' || p.rx === 'k2co3') && clock > TMIX && f < 0.97) {
      for (let i = 0; i < 9; i++) {
        const ph = (s.t * 0.9 + i * 0.37) % 1;
        const bxx = bx + bw * ((i * 0.53) % 1);
        Sim.circle(ctx, bxx, cb - 10 - ph * (cb - lt - 14), 2.5, { stroke: '#868e96', width: 1 });
      }
    }
    // lid
    if (p.lid) Sim.rect(ctx, cl - 6, ct - 7, cr - cl + 12, 7, { fill: '#dee2e6', stroke: '#adb5bd', width: 1, r: 2 });
    // thermometer
    const tx = x + cw * 0.62, ttop = y + 4, tbot = cb - 16;
    Sim.rect(ctx, tx - 4, ttop, 8, tbot - ttop, { fill: '#fff', stroke: '#868e96', width: 1.2, r: 4 });
    const frac = clamp((temp - 10) / 40, 0, 1);
    const lvl = tbot - 6 - frac * (tbot - ttop - 12);
    Sim.rect(ctx, tx - 2, lvl, 4, tbot - lvl, { fill: C.red });
    Sim.circle(ctx, tx, tbot + 3, 6, { fill: C.red, stroke: '#868e96', width: 1.2 });
    Sim.text(ctx, temp.toFixed(1) + ' °C', tx + 10, ttop + 12, { size: 13, bold: true, color: C.red });
    Sim.text(ctx, clock < TMIX ? 'reading start temperature' : clock < TEND ? 'reacting… stir' : 'finished', x + cw / 2, y + ch + 16, { size: 12, color: C.muted, align: 'center' });
  }

  Sim.create('#sim-chem-06-calorimetry', {
    title: 'Calorimetry in a polystyrene cup',
    height: (w) => (w >= 640 ? 390 : 600),
    controls: [
      { key: 'rx', type: 'select', label: 'Experiment', options: Object.keys(CAL).map((k) => [k, CAL[k].opt]), value: 'neut' },
      { key: 'V', label: 'Volume of each solution', min: 25, max: 75, step: 5, value: 50, unit: 'cm³', format: (v) => v.toFixed(0) },
      { key: 'a', label: 'Concentration of each solution', min: 0.5, max: 2, step: 0.05, value: 1, format: (v) => v.toFixed(2) + ' ' + aUnit },
      { key: 'lid', type: 'check', label: 'Lid on, cup standing in a beaker', value: true },
      { key: 'ext', type: 'check', label: 'Extrapolate back to the time of mixing', value: true },
      { type: 'button', label: '⏭ Skip to results', onClick: (s) => { s.state.clock = TEND; s.pause(); } }
    ],
    animate: true,
    onChange(s, key) {
      if (key === 'rx') configureCal(s);
      if (key === 'ext') return;
      s.reset();
      s.play();
    },
    init(s) {
      s.state.exp = runCal(s.p);
      s.state.clock = 0;
    },
    update(s, dt) {
      if (s.state.clock >= TEND) { s.pause(); return; }
      s.state.clock = Math.min(TEND, s.state.clock + dt * 55);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const e = s.state.exp;
      const clock = s.state.clock;
      const wide = w >= 640;
      let ax, ay, aw, ah, gb;
      if (wide) { ax = 18; ay = 46; aw = 170; ah = h - 120; gb = { x: 262, y: 34, w: w - 262 - 22, h: h - 34 - 50 }; }
      else { aw = Math.min(190, w * 0.55); ax = (w - aw) / 2; ay = 36; ah = 190; gb = { x: 52, y: 300, w: w - 52 - 16, h: h - 300 - 46 }; }
      Sim.text(ctx, e.r.eq, wide ? ax : w / 2, 18, { size: wide ? 12.5 : 11.5, bold: true, color: C.navy, align: wide ? 'left' : 'center' });
      drawCup(s, ax, ay, aw, ah, e, clock);

      /* temperature–time graph */
      const shown = e.reads.filter((q) => q.t <= clock + 1e-9);
      let lo = TROOM, hi = TROOM;
      e.reads.forEach((q) => { lo = Math.min(lo, q.T); hi = Math.max(hi, q.T); });
      lo = Math.min(lo, e.Tx); hi = Math.max(hi, e.Tx);
      const span = Math.max(2, hi - lo);
      const ymin = Math.floor(lo - span * 0.15 - 0.5), ymax = Math.ceil(hi + span * 0.15 + 0.5);
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 0, xmax: 12, ymin, ymax, xstep: wide ? 1 : 2, xlabel: 'time / min', ylabel: 'T / °C' }));
      g.axes();
      g.vline(TMIX / 60, { color: C.grey });
      g.label(TMIX / 60, ymax - (ymax - ymin) * 0.04, 'reactants mixed', { size: 11, color: C.muted, align: 'left', bold: false, baseline: 'top' });
      // start temperature line
      g.path([[0, e.T0], [TMIX / 60, e.T0]], { color: C.blue, width: 1.5, dash: [5, 4] });
      // points
      shown.forEach((q) => {
        const X = g.px(q.t / 60), Y = g.py(q.T);
        Sim.line(ctx, X - 4, Y - 4, X + 4, Y + 4, { color: C.navy, width: 1.8 });
        Sim.line(ctx, X - 4, Y + 4, X + 4, Y - 4, { color: C.navy, width: 1.8 });
      });
      const done = clock >= TEND;
      if (done) {
        const res = calResult(s);
        if (p.ext) {
          g.path([[TMIX / 60, e.Tx], [TEND / 60, e.fit.m * TEND + e.fit.c]], { color: C.orange, width: 2, dash: [7, 5] });
          const X = g.px(TMIX / 60) - 8;
          Sim.arrow(ctx, X, g.py(e.T0), X, g.py(e.Tx), { color: C.red, width: 2.2 });
          Sim.text(ctx, 'ΔT = ' + signed(res.dT, 1) + ' K', X - 8, (g.py(e.T0) + g.py(e.Tx)) / 2, { size: 13, bold: true, color: C.red, align: 'right', bg: 'rgba(255,255,255,0.85)' });
        } else {
          g.hline(e.ext.T, { color: C.red });
          const X = g.px(e.ext.t / 60);
          Sim.arrow(ctx, X, g.py(e.T0), X, g.py(e.ext.T), { color: C.red, width: 2.2 });
          Sim.text(ctx, 'ΔT = ' + signed(res.dT, 1) + ' K (highest reading)', Math.min(X + 8, gb.x + gb.w - 230), (g.py(e.T0) + g.py(e.ext.T)) / 2, { size: 12.5, bold: true, color: C.red, bg: 'rgba(255,255,255,0.85)' });
        }
      } else if (clock > 0) {
        const T = e.Tat(clock);
        Sim.circle(ctx, g.px(clock / 60), g.py(T), 3.5, { fill: C.red });
      }
      if (e.am.warn && done) {
        Sim.text(ctx, '⚠ HCl is not in excess', gb.x + gb.w - 4, gb.y + 14, { size: 12.5, bold: true, color: C.red, align: 'right', bg: '#fff0f0' });
      }
    },
    readout(s) {
      const e = s.state.exp;
      const clock = s.state.clock;
      if (clock < TEND) {
        return [['Time', mmss(clock)], ['Temperature', e.Tat(clock).toFixed(1) + ' °C'], ['Mass of liquid heated', e.am.m.toFixed(0) + ' g']];
      }
      const res = calResult(s);
      const rows = [
        ['ΔT' + (s.p.ext ? ' (extrapolated)' : ' (highest reading)'), signed(res.dT, 1) + ' K'],
        ['Q = mcΔT', e.am.m.toFixed(0) + ' × 4.18 × ' + Math.abs(res.dT).toFixed(1) + ' = ' + res.Q.toFixed(0) + ' J'],
        ['n', e.am.nCalc.toFixed(4) + ' ' + e.r.per],
        ['ΔH = ' + (res.dT >= 0 ? '−' : '+') + 'Q ÷ n', (res.dH > 0 ? '+' : '') + sig3(res.dH) + ' kJ mol⁻¹', true],
        ['Data-book value', (e.r.dH > 0 ? '+' : '') + sig3(e.r.dH) + ' kJ mol⁻¹']
      ];
      if (e.am.warn) rows.push(['⚠', e.am.warn, true]);
      return rows;
    }
  });

  /* ======================================================================
     2. Hess cycle builder
     ====================================================================== */
  const HESS = [
    {
      opt: 'Hydrogenation of ethene', R: 'C₂H₄(g) + H₂(g)', P: 'C₂H₆(g)',
      f: { bottom: '2C(s) + 3H₂(g)', r: [[1, 'C₂H₄', 52.4], [1, 'H₂', 0]], p: [[1, 'C₂H₆', -84.7]] },
      c: { bottom: '2CO₂(g) + 3H₂O(l)', r: [[1, 'C₂H₄', -1411.0], [1, 'H₂', -285.8]], p: [[1, 'C₂H₆', -1559.7]] }
    },
    {
      opt: 'Hydration of ethene', R: 'C₂H₄(g) + H₂O(l)', P: 'C₂H₅OH(l)',
      f: { bottom: '2C(s) + 3H₂(g) + ½O₂(g)', r: [[1, 'C₂H₄', 52.4], [1, 'H₂O', -285.8]], p: [[1, 'C₂H₅OH', -277.1]] },
      c: { bottom: '2CO₂(g) + 3H₂O(l)', r: [[1, 'C₂H₄', -1411.0], [1, 'H₂O', 0]], p: [[1, 'C₂H₅OH', -1367.3]], note: 'Liquid water is already fully burned, so its ΔcH is 0.' }
    },
    {
      opt: 'Making methanol from CO and H₂', R: 'CO(g) + 2H₂(g)', P: 'CH₃OH(l)',
      f: { bottom: 'C(s) + 2H₂(g) + ½O₂(g)', r: [[1, 'CO', -110.5], [2, 'H₂', 0]], p: [[1, 'CH₃OH', -239.1]] },
      c: { bottom: 'CO₂(g) + 2H₂O(l)', r: [[1, 'CO', -283.0], [2, 'H₂', -285.8]], p: [[1, 'CH₃OH', -726.0]] }
    },
    {
      opt: 'Formation of propane', R: '3C(s) + 4H₂(g)', P: 'C₃H₈(g)',
      f: null, fWhy: 'This reaction IS the formation of propane, so ΔrH = ΔfH(C₃H₈), the value you are trying to find. Carbon and hydrogen will not react cleanly to make propane, so use combustion data instead.',
      c: { bottom: '3CO₂(g) + 4H₂O(l)', r: [[3, 'C', -393.5], [4, 'H₂', -285.8]], p: [[1, 'C₃H₈', -2219.2]] }
    },
    {
      opt: 'Combustion of ethanol', R: 'C₂H₅OH(l) + 3O₂(g)', P: '2CO₂(g) + 3H₂O(l)',
      f: { bottom: '2C(s) + 3H₂(g) + 3½O₂(g)', r: [[1, 'C₂H₅OH', -277.1], [3, 'O₂', 0]], p: [[2, 'CO₂', -393.5], [3, 'H₂O', -285.8]] },
      c: null, cWhy: 'This reaction IS the combustion of ethanol, so ΔrH is simply ΔcH(C₂H₅OH) = −1367.3 kJ mol⁻¹. No cycle is needed; switch to formation data to calculate it.'
    },
    {
      opt: 'Reducing iron(III) oxide with CO', R: 'Fe₂O₃(s) + 3CO(g)', P: '2Fe(s) + 3CO₂(g)',
      f: { bottom: '2Fe(s) + 3C(s) + 3O₂(g)', r: [[1, 'Fe₂O₃', -824.2], [3, 'CO', -110.5]], p: [[2, 'Fe', 0], [3, 'CO₂', -393.5]] },
      c: null, cWhy: 'Fe₂O₃ and CO₂ are oxides that cannot burn any further, so there are no combustion data for them. Use formation data.'
    },
    {
      opt: 'Decomposing calcium carbonate', R: 'CaCO₃(s)', P: 'CaO(s) + CO₂(g)',
      f: { bottom: 'Ca(s) + C(s) + 1½O₂(g)', r: [[1, 'CaCO₃', -1206.9]], p: [[1, 'CaO', -635.1], [1, 'CO₂', -393.5]] },
      c: null, cWhy: 'None of these compounds burns, so combustion data cannot be used. Use formation data.'
    },
    {
      opt: 'Ammonia + hydrogen chloride', R: 'NH₃(g) + HCl(g)', P: 'NH₄Cl(s)',
      f: { bottom: '½N₂(g) + 2H₂(g) + ½Cl₂(g)', r: [[1, 'NH₃', -46.1], [1, 'HCl', -92.3]], p: [[1, 'NH₄Cl', -314.4]] },
      c: null, cWhy: 'Hydrogen chloride and ammonium chloride do not burn to give simple products, so use formation data.'
    }
  ];
  const sumTerms = (terms) => terms.reduce((a, t) => a + t[0] * t[2], 0);
  const termStr = (terms) => terms.map((t) => (t[0] === 1 ? '' : t[0]) + '(' + signed(t[2], 1).replace(/^0\.0$/, '0') + ')').join(' + ');
  function hessData(s) {
    const rx = HESS[+s.p.rx];
    const mode = s.p.data;
    const d = rx[mode];
    if (!d) return { rx, mode, d: null, why: mode === 'f' ? rx.fWhy : rx.cWhy };
    const sR = sumTerms(d.r), sP = sumTerms(d.p);
    const leg1 = mode === 'f' ? -sR : sR;
    const leg2 = mode === 'f' ? sP : -sP;
    return { rx, mode, d, sR, sP, leg1, leg2, dH: leg1 + leg2 };
  }

  Sim.create('#sim-chem-06-hess', {
    title: 'Hess cycle builder',
    height: (w) => (w >= 640 ? 360 : 330),
    resetButton: true,
    controls: [
      { key: 'rx', type: 'select', label: 'Reaction', options: HESS.map((r, i) => [String(i), r.opt]), value: '0' },
      { key: 'data', type: 'select', label: 'Data used', options: [['f', 'Enthalpies of formation, ΔfH'], ['c', 'Enthalpies of combustion, ΔcH']], value: 'f' },
      { type: 'button', label: 'Next step ▶', onClick: (s) => { s.state.step = Math.min(3, s.state.step + 1); } },
      { type: 'button', label: 'Show all', ghost: true, onClick: (s) => { s.state.step = 3; } }
    ],
    init(s) { s.state.step = 0; },
    onChange(s) { s.state.step = 0; },
    draw(s) {
      const { ctx, w, h } = s;
      const H = hessData(s);
      const wide = w >= 640;
      const fs = wide ? 14 : 12;
      const yTop = 44, yBot = h - 46;
      const cx1 = w * (wide ? 0.27 : 0.25), cx2 = w * (wide ? 0.73 : 0.75);
      const step = s.state.step;
      const bR = boxText(ctx, H.rx.R, cx1, yTop, { size: fs });
      const bP = boxText(ctx, H.rx.P, cx2, yTop, { size: fs });
      // top arrow
      const topCol = step >= 3 && H.d ? C.red : C.navy;
      Sim.arrow(ctx, bR.r + 4, yTop, bP.l - 4, yTop, { color: topCol, width: step >= 3 ? 3 : 2 });
      const topLab = step >= 3 && H.d ? 'ΔᵣH = ' + signed(H.dH, 1) + ' kJ mol⁻¹' : 'ΔᵣH = ?';
      Sim.text(ctx, topLab, w / 2, yTop - 24, { size: fs, bold: true, color: topCol, align: 'center' });
      if (!H.d) {
        const msgW = Math.min(w - 40, 560);
        const words = H.why.split(' ');
        const lines = [];
        let cur = '';
        words.forEach((wd) => {
          const t = cur ? cur + ' ' + wd : wd;
          if (Sim.measure(ctx, t, { size: fs }) > msgW - 24) { lines.push(cur); cur = wd; } else cur = t;
        });
        if (cur) lines.push(cur);
        const bh = lines.length * (fs + 7) + 22;
        const by = (yTop + 30 + h - 10) / 2 - bh / 2;
        Sim.rect(ctx, (w - msgW) / 2, by, msgW, bh, { fill: '#fff4e6', stroke: C.orange, width: 1.5, r: 8 });
        lines.forEach((ln, i) => Sim.text(ctx, ln, w / 2, by + 18 + i * (fs + 7), { size: fs, align: 'center', color: C.ink }));
        return;
      }
      const isF = H.mode === 'f';
      const bB = boxText(ctx, H.d.bottom, w / 2, yBot, { size: fs, fill: '#fff4e6', stroke: C.orange });
      // side arrows
      const pL = [bB.l + bB.w * 0.22, bB.t - 4], pR = [bB.r - bB.w * 0.22, bB.t - 4];
      const qL = [cx1, bR.b + 4], qR = [cx2, bP.b + 4];
      const c1 = step >= 1 ? C.orange : C.navy, c2 = step >= 2 ? C.orange : C.navy;
      if (isF) {
        Sim.arrow(ctx, pL[0], pL[1], qL[0], qL[1], { color: c1, width: step >= 1 ? 3 : 2 });
        Sim.arrow(ctx, pR[0], pR[1], qR[0], qR[1], { color: c2, width: step >= 2 ? 3 : 2 });
      } else {
        Sim.arrow(ctx, qL[0], qL[1], pL[0], pL[1], { color: c1, width: step >= 1 ? 3 : 2 });
        Sim.arrow(ctx, qR[0], qR[1], pR[0], pR[1], { color: c2, width: step >= 2 ? 3 : 2 });
        Sim.text(ctx, '+O₂', (qL[0] + pL[0]) / 2 + 10, (qL[1] + pL[1]) / 2 - 22, { size: 11.5, color: C.muted });
        Sim.text(ctx, '+O₂', (qR[0] + pR[0]) / 2 - 10, (qR[1] + pR[1]) / 2 - 22, { size: 11.5, color: C.muted, align: 'right' });
      }
      const sym = isF ? 'ΣΔfH' : 'ΣΔcH';
      const midL = [(pL[0] + qL[0]) / 2, (pL[1] + qL[1]) / 2], midR = [(pR[0] + qR[0]) / 2, (pR[1] + qR[1]) / 2];
      if (wide) {
        Sim.text(ctx, sym + '(reactants)', midL[0] - 14, midL[1] - 10, { size: 13, align: 'right', color: C.ink });
        Sim.text(ctx, '= ' + signed(H.sR, 1) + ' kJ mol⁻¹', midL[0] - 14, midL[1] + 10, { size: 13, align: 'right', color: C.ink, bold: true });
        Sim.text(ctx, sym + '(products)', midR[0] + 14, midR[1] - 10, { size: 13, color: C.ink });
        Sim.text(ctx, '= ' + signed(H.sP, 1) + ' kJ mol⁻¹', midR[0] + 14, midR[1] + 10, { size: 13, color: C.ink, bold: true });
      } else {
        Sim.text(ctx, signed(H.sR, 1), midL[0] - 10, midL[1], { size: 12, align: 'right', bold: true });
        Sim.text(ctx, signed(H.sP, 1), midR[0] + 10, midR[1], { size: 12, bold: true });
      }
      // leg tags inside the triangle
      const tagO = { size: wide ? 13 : 11.5, bold: true, color: '#fff', bg: C.orange, pad: 4 };
      if (step >= 1) Sim.text(ctx, '① ' + signed(H.leg1, 1), midL[0] + (wide ? 20 : 12), midL[1] + (wide ? 30 : 26), Object.assign({ align: 'left' }, tagO));
      if (step >= 2) Sim.text(ctx, '② ' + signed(H.leg2, 1), midR[0] - (wide ? 20 : 12), midR[1] + (wide ? 30 : 26), Object.assign({ align: 'right' }, tagO));
    },
    readout(s) {
      const H = hessData(s);
      const step = s.state.step;
      if (!H.d) return '<span class="ro">' + H.why + '</span>';
      const isF = H.mode === 'f';
      const sym = isF ? 'Δ<sub>f</sub>H' : 'Δ<sub>c</sub>H';
      let out = '<span class="ro">Σ' + sym + '(reactants) = ' + termStr(H.d.r) + ' = <b>' + signed(H.sR, 1) + '</b></span>' +
        '<span class="ro">Σ' + sym + '(products) = ' + termStr(H.d.p) + ' = <b>' + signed(H.sP, 1) + '</b></span>';
      if (H.d.note) out += '<span class="ro">' + H.d.note + '</span>';
      if (step === 0) out += '<span class="ro">Press <b>Next step</b> to go from reactants to products the long way round.</span>';
      if (step >= 1) {
        out += isF
          ? '<span class="ro hl">① reactants → elements runs <i>against</i> the arrow, so change the sign: <b>' + signed(H.leg1, 1) + '</b></span>'
          : '<span class="ro hl">① reactants → combustion products follows the arrow: <b>' + signed(H.leg1, 1) + '</b></span>';
      }
      if (step >= 2) {
        out += isF
          ? '<span class="ro hl">② elements → products follows the arrow: <b>' + signed(H.leg2, 1) + '</b></span>'
          : '<span class="ro hl">② combustion products → products runs <i>against</i> the arrow, so change the sign: <b>' + signed(H.leg2, 1) + '</b></span>';
      }
      if (step >= 3) out += '<span class="ro hl">Δ<sub>r</sub>H = ' + signed(H.leg1, 1) + ' + (' + signed(H.leg2, 1) + ') = <b>' + signed(H.dH, 1) + ' kJ mol⁻¹</b></span>';
      return out;
    }
  });

  /* ======================================================================
     3. Bond enthalpies: break everything, then make the new bonds
     ====================================================================== */
  const BOND = [
    { opt: 'Burning methane', eq: 'CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(g)', R: 'CH₄ + 2O₂', P: 'CO₂ + 2H₂O', atoms: 'C(g) + 4H(g) + 4O(g)',
      broken: [[4, 'C–H', 413], [2, 'O=O', 498]], made: [[2, 'C=O', 805], [4, 'O–H', 464]], hess: -802.3 },
    { opt: 'Hydrogenating ethene', eq: 'C₂H₄(g) + H₂(g) → C₂H₆(g)', R: 'C₂H₄ + H₂', P: 'C₂H₆', atoms: '2C(g) + 6H(g)',
      broken: [[1, 'C=C', 612], [4, 'C–H', 413], [1, 'H–H', 436]], made: [[1, 'C–C', 347], [6, 'C–H', 413]], hess: -137.1 },
    { opt: 'Hydrogen + chlorine', eq: 'H₂(g) + Cl₂(g) → 2HCl(g)', R: 'H₂ + Cl₂', P: '2HCl', atoms: '2H(g) + 2Cl(g)',
      broken: [[1, 'H–H', 436], [1, 'Cl–Cl', 243]], made: [[2, 'H–Cl', 432]], hess: -184.6 },
    { opt: 'Making ammonia', eq: 'N₂(g) + 3H₂(g) → 2NH₃(g)', R: 'N₂ + 3H₂', P: '2NH₃', atoms: '2N(g) + 6H(g)',
      broken: [[1, 'N≡N', 945], [3, 'H–H', 436]], made: [[6, 'N–H', 391]], hess: -92.2 },
    { opt: 'Hydrogen + oxygen', eq: '2H₂(g) + O₂(g) → 2H₂O(g)', R: '2H₂ + O₂', P: '2H₂O', atoms: '4H(g) + 2O(g)',
      broken: [[2, 'H–H', 436], [1, 'O=O', 498]], made: [[4, 'O–H', 464]], hess: -483.6 },
    { opt: 'Decomposing hydrogen iodide', eq: '2HI(g) → H₂(g) + I₂(g)', R: '2HI', P: 'H₂ + I₂', atoms: '2H(g) + 2I(g)',
      broken: [[2, 'H–I', 298]], made: [[1, 'H–H', 436], [1, 'I–I', 151]], hess: 9.4 }
  ];
  const bondSum = (list) => list.reduce((a, b) => a + b[0] * b[2], 0);
  const bondStr = (list) => list.map((b) => (b[0] === 1 ? '' : b[0] + ' × ') + b[1] + ' (' + b[2] + ')').join(' + ');

  Sim.create('#sim-chem-06-bonds', {
    title: 'Bonds broken, bonds made',
    height: (w) => (w >= 640 ? 380 : 400),
    controls: [
      { key: 'rx', type: 'select', label: 'Reaction (all gases)', options: BOND.map((b, i) => [String(i), b.opt]), value: '0' },
      { key: 'cmp', type: 'check', label: 'Compare with the value from ΔfH data', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const b = BOND[+p.rx];
      const up = bondSum(b.broken), down = bondSum(b.made), dH = up - down;
      const wide = w >= 640;
      const gx = 46, gy = 40, gw = w - gx - 16, gh = h - gy - 30;
      const lo = Math.min(0, dH, b.hess), hi = up;
      const pad = (hi - lo) * 0.1;
      const ymin = lo - pad * 1.6, ymax = hi + pad * 0.9;
      const Y = (E) => gy + gh - (E - ymin) / (ymax - ymin) * gh;
      Sim.text(ctx, b.eq, w / 2, 16, { size: wide ? 14 : 12, bold: true, color: C.navy, align: 'center' });
      Sim.arrow(ctx, gx, gy + gh, gx, gy - 6, { color: C.axis, width: 1.5, head: 8 });
      Sim.text(ctx, 'enthalpy', gx - 8, gy + gh / 2, { size: 12, color: C.muted, align: 'center', rotate: -Math.PI / 2 });
      const xR0 = gx + 16, xR1 = w * 0.36;
      const xA0 = w * 0.26, xA1 = w * 0.74;
      const xP0 = w * 0.64, xP1 = w - 18;
      const fs = wide ? 13 : 11.5;
      // levels
      Sim.line(ctx, xR0, Y(0), xR1, Y(0), { color: C.navy, width: 3 });
      Sim.text(ctx, b.R, (xR0 + xR1) / 2 - 10, Y(0) + (dH < 0 ? -12 : 14), { size: fs, bold: true, align: 'center' });
      Sim.line(ctx, xA0, Y(up), xA1, Y(up), { color: C.purple, width: 3 });
      Sim.text(ctx, b.atoms, w / 2, Y(up) - 12, { size: fs, bold: true, color: C.purple, align: 'center' });
      Sim.line(ctx, xP0, Y(dH), xP1, Y(dH), { color: C.navy, width: 3 });
      if (wide) Sim.text(ctx, b.P, (xP0 + xP1) / 2 - 18, Y(dH) + (dH < 0 ? 14 : -12), { size: fs, bold: true, align: 'center' });
      else Sim.text(ctx, b.P, (xP0 + xP1) / 2 - 10, Y(dH) + 14, { size: fs, bold: true, align: 'center', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      // bonds broken arrow (labels outside the arrows on wide screens, between them on narrow ones)
      const xu = wide ? w * 0.31 : w * 0.24, xd = wide ? w * 0.69 : w * 0.76;
      const m1 = (Y(0) + Y(up)) / 2 + (wide ? 0 : -24), m2 = (Y(up) + Y(dH)) / 2 + (wide ? 0 : 24);
      const ox = wide ? -8 : 8;
      Sim.arrow(ctx, xu, Y(0) - 2, xu, Y(up) + 3, { color: C.red, width: 3 });
      Sim.text(ctx, 'bonds broken', xu + ox, m1 - 10, { size: fs, color: C.red, align: wide ? 'right' : 'left' });
      Sim.text(ctx, '+' + up + ' kJ', xu + ox, m1 + 9, { size: fs + 1, bold: true, color: C.red, align: wide ? 'right' : 'left' });
      Sim.arrow(ctx, xd, Y(up) + 3, xd, Y(dH) - 2, { color: C.green, width: 3 });
      Sim.text(ctx, 'bonds made', xd - ox, m2 - 10, { size: fs, color: C.green, align: wide ? 'left' : 'right' });
      Sim.text(ctx, '−' + down + ' kJ', xd - ox, m2 + 9, { size: fs + 1, bold: true, color: C.green, align: wide ? 'left' : 'right' });
      // bond lists under the atoms level (wide screens only)
      if (wide) {
        Sim.text(ctx, 'broken: ' + bondStr(b.broken), w / 2, Y(up) + 18, { size: 12, color: C.red, align: 'center' });
        Sim.text(ctx, 'made: ' + bondStr(b.made), w / 2, Y(up) + 36, { size: 12, color: C.green, align: 'center' });
      }
      // ΔH arrow
      const xh = w - 40;
      Sim.line(ctx, xR1, Y(0), xh + 10, Y(0), { color: C.grey, width: 1.2, dash: [5, 4] });
      if (Math.abs(Y(dH) - Y(0)) > 12) Sim.arrow(ctx, xh, Y(0), xh, Y(dH), { color: C.orange, width: 2.5 });
      else Sim.line(ctx, xh, Y(0), xh, Y(dH), { color: C.orange, width: 2.5 });
      if (wide) Sim.text(ctx, 'ΔH = ' + signed(dH, 0), xh - 8, (Y(0) + Y(dH)) / 2 + (Math.abs(Y(dH) - Y(0)) < 30 ? (dH < 0 ? 26 : -22) : 0), { size: fs + 1, bold: true, color: C.orange, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      else Sim.text(ctx, 'ΔH = ' + signed(dH, 0) + ' kJ', w - 10, h - 14, { size: fs + 1, bold: true, color: C.orange, align: 'right' });
      if (p.cmp) {
        Sim.line(ctx, xP0, Y(b.hess), xP1, Y(b.hess), { color: C.teal, width: 2, dash: [6, 4] });
        if (wide) Sim.text(ctx, 'from ΔfH data: ' + signed(b.hess, 1), xP0 - 8, Y(b.hess) + (b.hess < dH ? 8 : -8), { size: 12, bold: true, color: C.teal, align: 'right', bg: 'rgba(255,255,255,0.9)' });
        else Sim.text(ctx, 'dashed: from ΔfH data', 10, h - 14, { size: 11.5, bold: true, color: C.teal });
      }
    },
    readout(s) {
      const b = BOND[+s.p.rx];
      const up = bondSum(b.broken), down = bondSum(b.made), dH = up - down;
      const rows = [
        ['Bonds broken', bondStr(b.broken) + ' = +' + up + ' kJ mol⁻¹'],
        ['Bonds made', bondStr(b.made) + ' = −' + down + ' kJ mol⁻¹'],
        ['ΔH = broken − made', signed(dH, 0) + ' kJ mol⁻¹', true]
      ];
      if (s.p.cmp) {
        const diff = Math.abs(dH - b.hess);
        rows.push(['From ΔfH data', signed(b.hess, 1) + ' kJ mol⁻¹']);
        rows.push(['Difference', diff.toFixed(1) + ' kJ mol⁻¹']);
      }
      return rows;
    }
  });
})();
