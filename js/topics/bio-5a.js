/* Biology 5a, Photosynthesis: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const WHITE = 'rgba(255,255,255,0.9)';

  /* ======================================================================
     1. Limiting factors: rate against light intensity
     Light-response curve: non-rectangular hyperbola. The plateau it levels
     off at is set by whichever of CO2 and temperature is further from its
     best value (Blackman's law of limiting factors).
     ====================================================================== */
  const ALPHA = 2.5;   // rate units per klx while light is limiting
  const THETA = 0.96;  // how sharply the curve bends towards the plateau
  const PABS = 100;    // rate with CO2 and temperature both at their best
  const KC = 0.04;     // % CO2 that gives half the CO2-saturated rate
  const fCO2 = (c) => c / (c + KC);
  /* Enzyme-controlled: roughly doubles every 10 °C, then falls as enzymes denature */
  const gTemp = (t) => Math.pow(2, (t - 25) / 10) / (1 + Math.exp((t - 29) / 3));
  let G_MAX = 0, T_OPT = 25;
  for (let t = 0; t <= 50; t += 0.1) { const v = gTemp(t); if (v > G_MAX) { G_MAX = v; T_OPT = t; } }
  const fTemp = (t) => gTemp(t) / G_MAX;
  const plateau = (c, t) => PABS * Math.min(fCO2(c), fTemp(t));
  function lightRate(I, pm) {
    const a = ALPHA * I;
    if (pm <= 0 || a <= 0) return 0;
    const b = a + pm;
    return (b - Math.sqrt(Math.max(0, b * b - 4 * THETA * a * pm))) / (2 * THETA);
  }
  /* light intensity at which the rate reaches the fraction r of the plateau */
  const lightAt = (r, pm) => (r * pm * (1 - THETA * r)) / (ALPHA * (1 - r));

  function plateauLimit(c, t) {
    const fc = fCO2(c), ft = fTemp(t);
    if (Math.abs(fc - ft) < 0.025) return { short: 'CO₂ and temperature', long: 'CO₂ concentration and temperature together' };
    if (fc < ft) return { short: 'CO₂', long: 'CO₂ concentration' };
    return t < T_OPT
      ? { short: 'temperature', long: 'temperature (too low)' }
      : { short: 'temperature', long: 'temperature (above the optimum)' };
  }
  function limitingAt(I, c, t) {
    const pm = plateau(c, t);
    const pl = plateauLimit(c, t);
    const f = lightRate(I, pm) / pm;
    if (f < 0.85) return { short: 'light', long: 'light intensity' };
    if (f < 0.97) return { short: 'light and ' + pl.short, long: 'light intensity and ' + pl.long + ' (curve levelling off)' };
    return pl;
  }
  const KEEP_COLS = [C.blue, C.orange, C.purple, C.pink];
  const curveName = (c, t) => c.toFixed(2) + '% CO₂, ' + t.toFixed(0) + ' °C';

  Sim.create('#sim-bio-5a-limiting', {
    title: 'Limiting factors: rate against light intensity',
    alt: 'Graph of the rate of photosynthesis against light intensity at the chosen carbon dioxide concentration and temperature',
    height: (w) => Math.round(clamp(w * 0.62, 320, 420)),
    controls: [
      { key: 'I', label: 'Light intensity', min: 0, max: 80, step: 1, value: 12, unit: 'klx', format: (v) => v.toFixed(0) },
      { key: 'co2', label: 'CO₂ concentration', min: 0.01, max: 0.15, step: 0.01, value: 0.04, unit: '%', format: (v) => v.toFixed(2) },
      { key: 'T', label: 'Temperature', min: 5, max: 45, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Keep this curve', onClick: (s) => {
        const st = s.state;
        if (st.kept.some((q) => Math.abs(q.c - s.p.co2) < 1e-6 && q.t === s.p.T)) return;
        st.kept.push({ c: s.p.co2, t: s.p.T, col: KEEP_COLS[st.n++ % KEEP_COLS.length] });
        if (st.kept.length > 4) st.kept.shift();
      } },
      { type: 'button', label: 'Clear kept curves', ghost: true, onClick: (s) => { s.state.kept = []; } }
    ],
    init(s) { s.state = { kept: [], n: 0 }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const left = w < 480 ? 46 : 56;
      const g = Sim.graph(ctx, {
        x: left, y: 28, w: w - left - 16, h: h - 28 - 40,
        xmin: 0, xmax: 80, ymin: 0, ymax: 100, xstep: 10, ystep: 20, bg: false,
        xlabel: 'light intensity / klx', ylabel: 'rate of photosynthesis / a.u.'
      });
      const pm = plateau(p.co2, p.T);
      const pl = plateauLimit(p.co2, p.T);
      const lim = limitingAt(p.I, p.co2, p.T);
      const i85 = Math.min(80, lightAt(0.85, pm));
      const i97 = Math.min(80, lightAt(0.97, pm));

      /* shaded zones: where light limits, and where the plateau factor limits */
      Sim.rect(ctx, g.px(0), g.y, g.px(i85) - g.px(0), g.h, { fill: 'rgba(252,196,25,0.15)' });
      if (i97 < 80) Sim.rect(ctx, g.px(i97), g.y, g.px(80) - g.px(i97), g.h, { fill: 'rgba(77,171,247,0.10)' });
      g.axes();
      /* zone label on one line if it fits, otherwise on two */
      const zoneLabel = (x0, x1, first, col) => {
        const wpx = g.px(x1) - g.px(x0), xc = (g.px(x0) + g.px(x1)) / 2;
        const o = { size: 11.5, bold: true, color: col, align: 'center' };
        const one = first + ' limiting';
        if (wpx > Sim.measure(ctx, one, o) + 8) Sim.text(ctx, one, xc, g.y + 30, o);
        else if (wpx > Math.max(Sim.measure(ctx, first, o), Sim.measure(ctx, 'limiting', o)) + 6) {
          Sim.text(ctx, first, xc, g.y + 26, o);
          Sim.text(ctx, 'limiting', xc, g.y + 40, o);
        }
      };
      zoneLabel(0, i85, 'light', '#946c00');
      if (i97 < 80) zoneLabel(i97, 80, pl.short, '#1864ab');

      /* kept curves, then the current one */
      const labels = [];
      s.state.kept.forEach((q) => {
        const pmq = plateau(q.c, q.t);
        g.plot((x) => lightRate(x, pmq), { color: q.col, width: 2 });
        const same = Math.abs(q.c - p.co2) < 1e-6 && q.t === p.T;
        if (!same) labels.push({ y: g.py(lightRate(80, pmq)) - 10, str: curveName(q.c, q.t), col: q.col });
      });
      g.hline(pm, { color: 'rgba(47,158,68,0.55)', dash: [5, 4], width: 1.2 });
      g.plot((x) => lightRate(x, pm), { color: C.green, width: 3.2 });
      if (s.state.kept.length) labels.push({ y: g.py(lightRate(80, pm)) - 10, str: curveName(p.co2, p.T) + ' (now)', col: '#2b8a3e' });
      labels.sort((a, b) => a.y - b.y);
      for (let i = 1; i < labels.length; i++) if (labels[i].y < labels[i - 1].y + 16) labels[i].y = labels[i - 1].y + 16;
      labels.forEach((l) => Sim.text(ctx, l.str, g.x + g.w - 4, l.y, { size: 11.5, bold: true, color: l.col, align: 'right', bg: WHITE }));

      /* the chosen light intensity */
      const r = lightRate(p.I, pm);
      const X = g.px(p.I), Y = g.py(r);
      Sim.line(ctx, X, Y, X, g.py(0), { color: C.red, dash: [4, 4], width: 1.2 });
      Sim.line(ctx, g.px(0), Y, X, Y, { color: C.red, dash: [4, 4], width: 1.2 });
      g.dot(p.I, r, { color: C.red, r: 5.5 });
      const txt = lim.short + ' limiting';
      const tw = Sim.measure(ctx, txt, { size: 12, bold: true });
      const right = X + 10 + tw < g.x + g.w - 4;
      Sim.text(ctx, txt, right ? X + 10 : X - 10, Math.min(Y + 18, g.py(0) - 12), { size: 12, bold: true, color: C.red, align: right ? 'left' : 'right', bg: WHITE });
    },
    readout(s) {
      const p = s.p, pm = plateau(p.co2, p.T), r = lightRate(p.I, pm);
      return [
        ['rate =', r.toFixed(1) + ' a.u.'],
        ['levels off at', pm.toFixed(1) + ' a.u.'],
        ['limiting factor here:', limitingAt(p.I, p.co2, p.T).long, true]
      ];
    }
  });

  /* ======================================================================
     2. GP and RuBP when light or CO2 changes
     Two pools in a closed cycle: RuBP -> GP (fixation, needs CO2) and
     GP -> GALP -> RuBP (reduction and regeneration, need ATP and reduced
     NADP from the light-dependent stage).
     ====================================================================== */
  const KA = 0.04;     // s⁻¹ fixation at 0.04% CO2
  const KB = 0.02;     // s⁻¹ reduction + regeneration in bright light
  const SPEED = 4;     // model seconds per real second
  const WIN = 120;     // seconds shown on the graph
  const LIGHT = { bright: [1, 'bright light'], dim: [0.3, 'dim light'], dark: [0, 'darkness'] };
  const CO2S = { air: [1, '0.04% CO₂'], low: [0.25, '0.01% CO₂'], none: [0, 'no CO₂'] };
  const COL_GP = C.orange, COL_RUBP = C.blue;
  function calvinRates(p) { return { a: KA * CO2S[p.co2][0], b: KB * LIGHT[p.light][0] }; }
  function addEvent(s, text) { s.state.events.push({ t: s.state.t, text }); }

  function drawCycle(ctx, box, st, p) {
    const { a, b } = calvinRates(p);
    const lf = LIGHT[p.light][0], cf = CO2S[p.co2][0];
    const cx = box.x + box.w / 2, cy = box.y + box.h * 0.5 + 4;
    const R = Math.min(box.w * 0.25, box.h * 0.3, (cx - box.x - 84) / 0.97);   // leaves room for the GALP label
    const P = { r: [cx, cy - R], g: [cx + R * 0.97, cy + R * 0.6], t: [cx - R * 0.97, cy + R * 0.6] };
    const rad = { r: 12 + 20 * Math.sqrt(st.R / 100), g: 12 + 20 * Math.sqrt(st.G / 100), t: 15 };
    const J1 = a * st.R, J2 = b * st.G;
    const wOf = (J) => clamp(1.5 + (5.5 * J) / 1.4, 1.5, 9);
    function link(f, t, J) {
      const [x1, y1] = P[f], [x2, y2] = P[t];
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      Sim.arrow(ctx, x1 + ux * (rad[f] + 5), y1 + uy * (rad[f] + 5), x2 - ux * (rad[t] + 5), y2 - uy * (rad[t] + 5),
        { color: J > 0.02 ? C.green : '#ced4da', width: wOf(J) });
    }
    link('r', 'g', J1);
    link('g', 't', J2);
    link('t', 'r', J2);

    /* nodes: area shows how much of each compound there is */
    Sim.circle(ctx, P.r[0], P.r[1], rad.r, { fill: 'rgba(0,123,255,0.18)', stroke: COL_RUBP, width: 2 });
    Sim.circle(ctx, P.g[0], P.g[1], rad.g, { fill: 'rgba(240,140,0,0.2)', stroke: COL_GP, width: 2 });
    Sim.circle(ctx, P.t[0], P.t[1], rad.t, { fill: '#f1f3f5', stroke: C.grey, width: 1.5, dash: [3, 3] });
    Sim.text(ctx, String(Math.round(st.R)), P.r[0], P.r[1] + 1, { size: 12, bold: true, color: '#1864ab', align: 'center' });
    Sim.text(ctx, String(Math.round(st.G)), P.g[0], P.g[1] + 1, { size: 12, bold: true, color: '#b35c00', align: 'center' });
    Sim.text(ctx, 'RuBP (5C)', P.r[0], P.r[1] - rad.r - 10, { size: 12.5, bold: true, color: COL_RUBP, align: 'center' });
    Sim.text(ctx, 'GP (3C)', P.g[0], P.g[1] + rad.g + 12, { size: 12.5, bold: true, color: '#b35c00', align: 'center' });
    Sim.text(ctx, 'GALP (3C)', P.t[0] - rad.t - 5, P.t[1] - 4, { size: 11.5, bold: true, color: C.muted, align: 'right' });

    /* CO2 enters at the fixation step */
    const m1 = [(P.r[0] + P.g[0]) / 2, (P.r[1] + P.g[1]) / 2];
    if (cf > 0) Sim.arrow(ctx, m1[0] + 44, m1[1] - 18, m1[0] + 9, m1[1] - 3, { color: C.grey, width: 1.5 + 2 * cf });
    Sim.text(ctx, cf > 0 ? 'CO₂' : 'no CO₂', m1[0] + 48, m1[1] - 22, { size: 12, bold: true, color: cf > 0 ? C.ink : C.red, align: 'left' });
    Sim.text(ctx, 'RUBISCO', m1[0] - 6, m1[1] + 18, { size: 10.5, italic: true, color: C.muted, align: 'right' });

    /* ATP and reduced NADP from the light-dependent stage */
    const m2 = [cx, P.g[1]];
    const lcol = lf > 0 ? C.purple : '#ced4da';
    Sim.arrow(ctx, m2[0], m2[1] + 46, m2[0], m2[1] + 8, { color: lcol, width: 1.5 + 2.5 * lf });
    Sim.text(ctx, lf > 0 ? 'ATP + reduced NADP' : 'no ATP or reduced NADP', m2[0], m2[1] + 58, { size: 11.5, bold: true, color: lf > 0 ? C.purple : C.red, align: 'center' });
    const m3 = [(P.t[0] + P.r[0]) / 2, (P.t[1] + P.r[1]) / 2];
    Sim.arrow(ctx, m3[0] - 38, m3[1] - 16, m3[0] - 9, m3[1] - 3, { color: lcol, width: 1.5 + 1.5 * lf });
    Sim.text(ctx, 'ATP', m3[0] - 42, m3[1] - 19, { size: 11.5, bold: true, color: lf > 0 ? C.purple : '#adb5bd', align: 'right' });

    /* GALP leaves the cycle to make glucose */
    Sim.arrow(ctx, P.t[0], P.t[1] + rad.t + 2, P.t[0], P.t[1] + rad.t + 22, { color: J2 > 0.02 ? C.green : '#ced4da', width: 1.8 });
    Sim.text(ctx, 'glucose', P.t[0], P.t[1] + rad.t + 32, { size: 11, color: C.muted, align: 'center' });

    /* conditions */
    const sx = box.x + 20, sy = box.y + 20;
    if (lf > 0) {
      for (let i = 0; i < 8; i++) {
        const an = (i * Math.PI) / 4;
        Sim.line(ctx, sx + Math.cos(an) * 11, sy + Math.sin(an) * 11, sx + Math.cos(an) * (11 + 5 * lf), sy + Math.sin(an) * (11 + 5 * lf), { color: '#f59f00', width: 1.6 });
      }
    }
    Sim.circle(ctx, sx, sy, 8, { fill: lf > 0 ? 'rgba(252,196,25,' + (0.35 + 0.65 * lf) + ')' : '#495057', stroke: lf > 0 ? '#f59f00' : '#343a40', width: 1.2 });
    Sim.text(ctx, LIGHT[p.light][1], sx + 20, sy, { size: 12, bold: true, color: C.ink });
    Sim.text(ctx, CO2S[p.co2][1], box.x + box.w - 8, sy, { size: 12, bold: true, color: C.ink, align: 'right' });
  }

  function trend(d) { return Math.abs(d) < 0.03 ? 'steady' : d > 0 ? 'rising' : 'falling'; }

  Sim.create('#sim-bio-5a-calvin', {
    title: 'GP and RuBP when light or CO₂ changes',
    alt: 'Calvin cycle diagram with the amounts of RuBP and GP, and a graph of their concentrations against time',
    height: (w) => (w >= 680 ? 360 : 600),
    controls: [
      { key: 'light', type: 'select', label: 'Light', value: 'bright', options: [['bright', 'Bright light'], ['dim', 'Dim light'], ['dark', 'Darkness']],
        onChange: (s, v) => addEvent(s, LIGHT[v][1]) },
      { key: 'co2', type: 'select', label: 'CO₂ concentration', value: 'air', options: [['air', '0.04% (air)'], ['low', '0.01%'], ['none', 'None']],
        onChange: (s, v) => addEvent(s, CO2S[v][1]) }
    ],
    animate: true,
    init(s) {
      s.set('light', 'bright');
      s.set('co2', 'air');
      const { a, b } = calvinRates(s.p);
      const R = (100 * b) / (a + b);
      s.state = { t: 0, R, G: 100 - R, hist: [[0, R, 100 - R]], events: [], acc: 0 };
    },
    update(s, dt) {
      const st = s.state, hstep = dt * SPEED;
      if (hstep <= 0) return;
      const { a, b } = calvinRates(s.p);
      const k = a + b;
      if (k > 0) {
        const Rinf = (100 * b) / k;
        st.R = Rinf + (st.R - Rinf) * Math.exp(-k * hstep);
        st.G = 100 - st.R;
      }
      st.t += hstep;
      st.acc += hstep;
      if (st.acc >= 0.5) { st.acc = 0; st.hist.push([st.t, st.R, st.G]); }
      while (st.hist.length > 2 && st.hist[1][0] < st.t - WIN - 2) st.hist.shift();
      st.events = st.events.filter((e) => e.t > st.t - WIN - 2);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 680;
      const box = wide ? { x: 0, y: 0, w: 320, h } : { x: 0, y: 0, w, h: 290 };
      drawCycle(ctx, box, st, p);
      const gb = wide ? { x: box.w + 56, y: 30, w: w - box.w - 56 - 18, h: h - 30 - 44 } : { x: 50, y: box.h + 30, w: w - 50 - 16, h: h - box.h - 30 - 44 };
      const xmin = Math.max(0, st.t - WIN);
      const g = Sim.graph(ctx, Object.assign({ xmin, xmax: xmin + WIN, ymin: 0, ymax: 100, xstep: 20, ystep: 20, ylabel: 'concentration / a.u.' }, gb)).axes();
      Sim.text(ctx, 'time / s', g.x + g.w / 2, g.y + g.h + 22, { size: 12.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });
      st.events.forEach((e, k) => {
        if (e.t < xmin) return;
        g.vline(e.t, { color: C.grey, dash: [4, 4], width: 1.2 });
        const X = g.px(e.t);
        const right = X + 8 + Sim.measure(ctx, e.text, { size: 11 }) < g.x + g.w;
        Sim.text(ctx, e.text, right ? X + 4 : X - 4, g.y + 30 + (k % 3) * 15, { size: 11, color: C.muted, align: right ? 'left' : 'right', bg: WHITE, pad: 2 });
      });
      g.path(st.hist.map((q) => [q[0], q[2]]).concat([[st.t, st.G]]), { color: COL_GP, width: 2.6 });
      g.path(st.hist.map((q) => [q[0], q[1]]).concat([[st.t, st.R]]), { color: COL_RUBP, width: 2.6 });
      g.dot(st.t, st.G, { color: COL_GP, r: 4.5 });
      g.dot(st.t, st.R, { color: COL_RUBP, r: 4.5 });
      let yG = g.py(st.G) - 12, yR = g.py(st.R) - 12;
      if (Math.abs(yG - yR) < 16) { if (st.G >= st.R) { yR = yG + 30; } else { yG = yR + 30; } }
      Sim.text(ctx, 'GP', g.px(st.t) - 8, yG, { size: 12.5, bold: true, color: '#b35c00', align: 'right', bg: WHITE, pad: 2 });
      Sim.text(ctx, 'RuBP', g.px(st.t) - 8, yR, { size: 12.5, bold: true, color: COL_RUBP, align: 'right', bg: WHITE, pad: 2 });
    },
    readout(s) {
      const st = s.state;
      const { a, b } = calvinRates(s.p);
      const dG = a * st.R - b * st.G;
      return [
        ['GP =', st.G.toFixed(0) + ' a.u. (' + trend(dG) + ')'],
        ['RuBP =', st.R.toFixed(0) + ' a.u. (' + trend(-dG) + ')'],
        ['CO₂ fixation rate =', (a * st.R * 60).toFixed(0) + ' a.u. per minute', true]
      ];
    }
  });

  /* ======================================================================
     3. Core practical: separating pigments by chromatography
     ====================================================================== */
  const PIG = [
    { name: 'carotene', rf: 0.95, col: '#f08c00', colour: 'orange-yellow' },
    { name: 'xanthophyll', rf: 0.71, col: '#d4a20a', colour: 'yellow' },
    { name: 'chlorophyll a', rf: 0.60, col: '#0f7a5a', colour: 'blue-green' },
    { name: 'chlorophyll b', rf: 0.45, col: '#7f9c22', colour: 'yellow-green' }
  ];
  const PAPER = 13.2;   // cm, height of the strip
  const ORIGIN = 2.0;   // cm, pencil line above the bottom edge
  const SOLV = 1.0;     // cm, depth of solvent (below the pencil line)
  const RUN_MAX = 10.0; // cm the front may travel before the strip is removed
  const RUN_K = 2.6;    // cm per √s: capillary rise slows as it goes

  function chromLayout(w, h) {
    const wide = w >= 600;
    const tank = wide ? { x: 0, y: 0, w: Math.min(330, w * 0.5), h } : { x: 0, y: 0, w, h: 340 };
    const table = wide ? { x: tank.w + 20, y: 34, w: w - tank.w - 36 } : { x: 18, y: tank.h + 18, w: w - 36 };
    const k = (tank.h - 46) / (PAPER + 0.8);
    const pw = 62;
    const pcx = tank.x + tank.w * 0.42;
    const yBot = tank.y + tank.h - 22;
    return { wide, tank, table, k, pw, pcx, yBot, y: (cm) => yBot - cm * k };
  }
  function spotPos(L, st, i) {
    const dist = st.rf[i] * st.d;
    return { x: L.pcx, y: L.y(ORIGIN + dist), rx: L.k * (0.3 + 0.04 * dist), ry: L.k * (0.18 + 0.03 * dist), dist };
  }

  Sim.create('#sim-bio-5a-chrom', {
    title: 'Virtual chromatography: measuring Rf values',
    alt: 'A strip of chromatography paper in a beaker of solvent, with pigment spots, a ruler and a table of typical Rf values',
    height: (w) => (w >= 600 ? 390 : 520),
    controls: [
      { key: 'spot', type: 'select', label: 'Spot to measure', value: '1', options: [['0', 'Spot 1 (highest)'], ['1', 'Spot 2'], ['2', 'Spot 3'], ['3', 'Spot 4 (lowest)']] },
      { type: 'button', label: 'Run the solvent', onClick: (s) => { if (!s.state.stopped) s.state.running = true; } },
      { type: 'button', label: 'Remove the strip and mark the front', ghost: true, onClick: (s) => {
        const st = s.state;
        if (st.d > 0) { st.running = false; st.stopped = true; }
      } }
    ],
    animate: true,
    playPause: false,
    init(s) {
      s.state = { d: 0, tRun: 0, running: false, stopped: false, rf: PIG.map((q) => q.rf + (Math.random() - 0.5) * 0.016) };
    },
    update(s, dt) {
      const st = s.state;
      if (!st.running || dt <= 0) return;
      st.tRun += dt;
      st.d = Math.min(RUN_MAX, RUN_K * Math.sqrt(st.tRun));
      if (st.d >= RUN_MAX) { st.running = false; st.stopped = true; }
    },
    pointer: {
      down(s, pt) {
        const L = chromLayout(s.w, s.h);
        let best = -1, bd = 22;
        for (let i = 0; i < PIG.length; i++) {
          const q = spotPos(L, s.state, i);
          const dd = Math.hypot(pt.x - q.x, pt.y - q.y);
          if (dd < bd) { bd = dd; best = i; }
        }
        if (best >= 0 && s.state.d > 0.5) s.set('spot', String(best));
      }
    },
    draw(s) {
      const { ctx, p } = s;
      const st = s.state;
      const L = chromLayout(s.w, s.h);
      const sel = +p.spot;
      const left = L.pcx - L.pw / 2, right = L.pcx + L.pw / 2;
      const top = L.y(PAPER);

      /* beaker, rod and solvent */
      const bL = L.pcx - L.pw / 2 - 52, bR = L.pcx + L.pw / 2 + 74;
      Sim.rect(ctx, bL + 2, L.y(SOLV), bR - bL - 4, L.yBot + 6 - L.y(SOLV), { fill: 'rgba(116,192,252,0.35)' });
      Sim.line(ctx, bL, top - 10, bL, L.yBot + 8, { color: C.axis, width: 2.5 });
      Sim.line(ctx, bR, top - 10, bR, L.yBot + 8, { color: C.axis, width: 2.5 });
      Sim.line(ctx, bL, L.yBot + 8, bR, L.yBot + 8, { color: C.axis, width: 2.5 });
      Sim.rect(ctx, bL - 8, top - 6, bR - bL + 16, 6, { fill: '#868e96', r: 2 });
      Sim.text(ctx, 'solvent', bR - 6, L.y(SOLV / 2), { size: 11, color: '#1864ab', align: 'right' });

      /* paper, wet region, pencil line */
      Sim.rect(ctx, left, top, L.pw, L.yBot - top, { fill: '#fffdf6', stroke: '#ced4da', width: 1 });
      if (st.d > 0) Sim.rect(ctx, left + 1, L.y(ORIGIN + st.d), L.pw - 2, L.yBot - L.y(ORIGIN + st.d), { fill: 'rgba(165,216,255,0.22)' });
      Sim.line(ctx, left + 4, L.y(ORIGIN), right - 4, L.y(ORIGIN), { color: '#868e96', width: 1.2 });
      Sim.text(ctx, 'pencil line', L.pcx, L.y(ORIGIN) + 9, { size: 9.5, color: C.muted, align: 'center' });
      if (st.d > 0) {
        Sim.line(ctx, left, L.y(ORIGIN + st.d), right, L.y(ORIGIN + st.d), { color: st.stopped ? '#495057' : '#74c0fc', width: 1.4, dash: st.stopped ? [4, 3] : null });
        if (st.stopped) Sim.text(ctx, 'front', L.pcx, L.y(ORIGIN + st.d) - 8, { size: 9.5, bold: true, color: '#495057', align: 'center' });
      }

      /* ruler on the left, zero at the pencil line */
      const rx = left - 18;
      Sim.line(ctx, rx, L.y(ORIGIN), rx, L.y(ORIGIN + 10.5), { color: C.axis, width: 1 });
      for (let c = 0; c <= 10; c += 0.5) {
        const Y = L.y(ORIGIN + c), major = Math.abs(c - Math.round(c)) < 1e-6;
        Sim.line(ctx, rx - (major ? 6 : 3), Y, rx, Y, { color: C.axis, width: 1 });
        if (major && c % 2 === 0) Sim.text(ctx, String(c), rx - 8, Y, { size: 9.5, color: C.muted, align: 'right' });
      }
      Sim.text(ctx, 'cm', rx, L.y(ORIGIN + 10.5) - 8, { size: 9.5, color: C.muted, align: 'center' });

      /* the spots */
      ctx.save();
      ctx.globalAlpha = 0.85;
      if (st.d < 0.05) {
        ctx.fillStyle = '#2f5d2a';
        ctx.beginPath(); ctx.ellipse(L.pcx, L.y(ORIGIN), L.k * 0.3, L.k * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      } else {
        for (let i = PIG.length - 1; i >= 0; i--) {
          const q = spotPos(L, st, i);
          ctx.fillStyle = PIG[i].col;
          ctx.beginPath(); ctx.ellipse(q.x, q.y, q.rx, q.ry, 0, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();

      /* measuring the selected spot */
      if (st.d >= 0.05) {
        const q = spotPos(L, st, sel);
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = C.red;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(q.x, q.y, q.rx + 4, q.ry + 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        const x1 = right + 12, x2 = right + 30;
        const xd = Math.round(q.dist * 10) / 10, dd = Math.round(st.d * 10) / 10;
        Sim.arrow(ctx, x1, L.y(ORIGIN), x1, q.y, { color: C.red, width: 2, head: 8 });
        Sim.arrow(ctx, x2, L.y(ORIGIN), x2, L.y(ORIGIN + st.d), { color: '#1971c2', width: 2, head: 8 });
        let ys = L.y(ORIGIN + st.d), yp = q.y;
        if (Math.abs(yp - ys) < 26) yp = ys + 26;
        Sim.text(ctx, 'solvent ' + dd.toFixed(1) + ' cm', x2 + 6, ys, { size: 11.5, bold: true, color: '#1971c2', bg: WHITE, pad: 2 });
        Sim.text(ctx, 'spot ' + (sel + 1) + ': ' + xd.toFixed(1) + ' cm', x2 + 6, yp, { size: 11.5, bold: true, color: C.red, bg: WHITE, pad: 2 });
      }

      /* table of typical values */
      const T = L.table;
      const rowH = 22;
      Sim.text(ctx, 'Typical Rf values', T.x, T.y, { size: 13, bold: true, color: C.navy });
      Sim.text(ctx, 'petroleum ether and propanone solvent', T.x, T.y + 17, { size: 11, italic: true, color: C.muted });
      const y0 = T.y + 40;
      const cRf = T.x + Math.min(T.w - 30, 230);
      Sim.text(ctx, 'pigment (colour)', T.x + 22, y0, { size: 11.5, bold: true, color: C.muted });
      Sim.text(ctx, 'Rf', cRf, y0, { size: 11.5, bold: true, color: C.muted, align: 'right' });
      let match = -1;
      const dd = Math.round(st.d * 10) / 10;
      const xd = st.d >= 0.05 ? Math.round(spotPos(L, st, sel).dist * 10) / 10 : 0;
      const rfMeas = dd > 0 ? xd / dd : null;
      if (st.stopped && rfMeas != null && dd >= 3) {
        let bd = 0.04;
        PIG.forEach((q, i) => { if (Math.abs(q.rf - rfMeas) <= bd) { bd = Math.abs(q.rf - rfMeas); match = i; } });
      }
      PIG.forEach((q, i) => {
        const y = y0 + (i + 1) * rowH;
        if (i === match) Sim.rect(ctx, T.x - 4, y - rowH / 2, cRf - T.x + 10, rowH, { fill: 'rgba(0,123,255,0.10)', r: 4 });
        Sim.circle(ctx, T.x + 8, y, 6, { fill: q.col });
        Sim.text(ctx, q.name + ' (' + q.colour + ')', T.x + 22, y, { size: 12, color: C.ink, bold: i === match });
        Sim.text(ctx, q.rf.toFixed(2), cRf, y, { size: 12, color: C.ink, align: 'right', bold: i === match });
      });
      if (L.wide) {
        const msg = st.d < 0.05 ? 'Press “Run the solvent”.' : !st.stopped ? 'Remove the strip before the front reaches the top.' : 'Click a spot to measure it.';
        Sim.text(ctx, msg, T.x, y0 + 5 * rowH + 14, { size: 12, italic: true, color: C.muted });
      }
    },
    readout(s) {
      const st = s.state;
      if (st.d < 0.05) return [['to start:', 'press “Run the solvent”']];
      const L = chromLayout(s.w, s.h);
      const sel = +s.p.spot;
      const dd = Math.round(st.d * 10) / 10;
      const xd = Math.round(spotPos(L, st, sel).dist * 10) / 10;
      const rf = xd / dd;
      const out = [
        ['solvent front moved', dd.toFixed(1) + ' cm'],
        ['spot ' + (sel + 1) + ' moved', xd.toFixed(1) + ' cm'],
        ['Rf = ' + xd.toFixed(1) + ' ÷ ' + dd.toFixed(1) + ' =', rf.toFixed(2), true]
      ];
      if (!st.stopped) out.push(['identify it:', 'after the strip is removed']);
      else if (dd < 3) out.push(['identify it:', 'run further: the spots have not separated']);
      else {
        let best = null, bd = 0.04;
        PIG.forEach((q) => { if (Math.abs(q.rf - rf) <= bd) { bd = Math.abs(q.rf - rf); best = q; } });
        out.push(['closest match:', best ? best.name : 'none in the table']);
      }
      return out;
    }
  });
})();
