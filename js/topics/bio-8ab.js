/* Biology 8ab: Nervous system and coordination — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  function wrapText(ctx, str, maxW, o) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const test = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, test, o) > maxW) { lines.push(cur); cur = wd; } else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /* ----------------------------------------------------------------------
     A simple model of the membrane potential at one point on an axon.
     Values follow the notes: rest −70 mV, threshold −55 mV, peak about
     +40 mV, hyperpolarisation to about −90 mV. Times in ms.
     ---------------------------------------------------------------------- */
  const REST = -70, THR = -55, PEAK = 40, VMIN = -90;
  const ARP = 2.4;        // absolute refractory period, from the start of the action potential
  const RRP_END = 8;      // end of the relative refractory period
  const smooth = (x) => x * x * (3 - 2 * x);
  /* The action potential, u ms after threshold was reached at potential V0. */
  function template(u, V0) {
    if (u < 0.6) return V0 + (PEAK - V0) * smooth(u / 0.6);                                  // depolarisation
    return VMIN + (PEAK - VMIN) * 0.5 * (1 + Math.cos(Math.PI * Math.min(1, (u - 0.6) / 1.8))); // repolarisation, then hyperpolarisation
  }
  /* Return from −90 mV to rest after the absolute refractory period. */
  function recovery(u) { const v = u - ARP; return REST - 20 * (1 + v) * Math.exp(-v); }
  /* During the relative refractory period the threshold is higher than normal. */
  const thresholdAt = (u) => (u < ARP ? Infinity : THR + 25 * Math.exp(-(u - ARP) / 1.2));
  /* Step through time. syn(t, since) gives the depolarisation (mV) caused by
     stimuli or synapses that started at or after `since`. */
  function simulate(syn, tmax) {
    const dt = 0.01, n = Math.round(tmax / dt);
    const pts = new Array(n + 1), aps = [];
    let ta = null, V0 = THR, since = 0, vmax = -Infinity;
    for (let i = 0; i <= n; i++) {
      const t = i * dt;
      let V;
      if (ta !== null && t - ta < ARP) V = template(t - ta, V0);
      else {
        if (ta !== null) since = Math.max(since, ta + ARP);   // anything arriving during the absolute refractory period has no effect
        V = (ta === null ? REST : recovery(t - ta)) + syn(t, since);
        const thr = ta === null ? THR : thresholdAt(t - ta);
        if (V >= thr - 0.01) { ta = t; V0 = V; aps.push(t); }
      }
      vmax = Math.max(vmax, V);
      pts[i] = [t, V];
    }
    return { pts, aps, dt, vmax };
  }
  const vAt = (sim, t) => sim.pts[clamp(Math.round(t / sim.dt), 0, sim.pts.length - 1)][1];
  const lastAP = (sim, t) => { let a = null; sim.aps.forEach((x) => { if (x <= t + 1e-9) a = x; }); return a; };

  /* Membrane-potential axes: the x axis is drawn along the bottom, with a reference line at 0 mV. */
  function mvGraph(ctx, box, tmax) {
    const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: tmax, ymin: -100, ymax: 50, ystep: 20, xstep: tmax > 30 ? 10 : 5, ticks: false }, box));
    g.axes();
    const yb = g.y + g.h;
    Sim.line(ctx, g.x, yb, g.x + g.w, yb, { color: C.axis, width: 1.5 });
    for (let v = -100; v <= 40; v += 20) {
      Sim.line(ctx, g.x - 4, g.py(v), g.x, g.py(v), { color: C.axis, width: 1 });
      Sim.text(ctx, v > 0 ? '+' + v : String(v), g.x - 6, g.py(v), { size: 11, color: C.muted, align: 'right' });
    }
    const xs = tmax > 30 ? 10 : 5;
    for (let t = 0; t <= tmax + 1e-9; t += xs) {
      Sim.line(ctx, g.px(t), yb, g.px(t), yb + 4, { color: C.axis, width: 1 });
      Sim.text(ctx, String(t), g.px(t), yb + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
    }
    Sim.text(ctx, 'time / ms', g.x + g.w, yb + 22, { size: 12, bold: true, align: 'right', baseline: 'top' });
    Sim.text(ctx, 'membrane potential / mV', g.x + 6, g.y + 2, { size: 12.5, bold: true, baseline: 'top' });
    Sim.text(ctx, '0 mV', g.x + g.w - 2, g.py(0) - 7, { size: 10.5, color: C.muted, align: 'right' });
    g.hline(THR, { color: C.orange, dash: [6, 4] });
    g.hline(REST, { color: '#adb5bd', dash: [2, 4] });
    return g;
  }
  function shadeRefractory(ctx, g, aps) {
    aps.forEach((ta) => {
      const a = g.px(ta), b = g.px(Math.min(g.xmax, ta + ARP)), c = g.px(Math.min(g.xmax, ta + RRP_END));
      Sim.rect(ctx, a, g.y, b - a, g.h, { fill: 'rgba(224,49,49,0.08)' });
      if (c > b) Sim.rect(ctx, b, g.y, c - b, g.h, { fill: 'rgba(240,140,0,0.07)' });
    });
  }

  /* ======================================================================
     1. The action potential: threshold, all-or-none, refractory periods
     ====================================================================== */
  const STIM_DUR = 1.0;
  function pulseKernel(dtp, A) {
    if (dtp < 0) return 0;
    if (dtp <= STIM_DUR) return A * (1 - Math.exp(-dtp / 0.12));
    return A * (1 - Math.exp(-STIM_DUR / 0.12)) * Math.exp(-(dtp - STIM_DUR) / 1.5);
  }
  const SUS0 = 5, SUS1 = 45;
  function apSetup(p) {
    if (p.mode === 'sustained') {
      const syn = (t, since) => {
        const start = Math.max(SUS0, since);
        if (t < start || start >= SUS1) return 0;
        const v = p.A * (1 - Math.exp(-(Math.min(t, SUS1) - start) / 0.4));
        return t > SUS1 ? v * Math.exp(-(t - SUS1) / 1.5) : v;
      };
      return { tmax: 50, stims: [[SUS0, SUS1]], syn };
    }
    const times = p.mode === 'two' ? [2, 2 + p.gap] : [2];
    const syn = (t, since) => times.reduce((acc, t0) => acc + (t0 >= since - 1e-9 ? pulseKernel(t - t0, p.A) : 0), 0);
    return { tmax: p.mode === 'two' ? 25 : 15, stims: times.map((t0) => [t0, t0 + STIM_DUR]), syn };
  }
  function apPhase(sim, t) {
    const V = vAt(sim, t);
    const ta = lastAP(sim, t);
    const u = ta === null ? Infinity : t - ta;
    if (u < 0.6) return { key: 'dep', name: 'Depolarisation', col: C.red, na: 'open: Na⁺ floods in', k: 'closed', txt: 'Threshold was reached, so voltage-gated Na⁺ channels open. Na⁺ diffuses in, which opens more Na⁺ channels (positive feedback). The inside becomes positive, up to about +40 mV.', u };
    if (u < 1.94) return { key: 'rep', name: 'Repolarisation', col: C.blue, na: 'closed and inactivated', k: 'open: K⁺ diffuses out', txt: 'The Na⁺ channels close and are inactivated. Voltage-gated K⁺ channels open and K⁺ diffuses out, so the inside becomes negative again.', u };
    if (u < ARP) return { key: 'hyp', name: 'Hyperpolarisation', col: C.purple, na: 'inactivated', k: 'open, slow to close', txt: 'The K⁺ channels are slow to close, so too much K⁺ leaves and the potential overshoots below −70 mV, to about −90 mV.', u };
    if (u < RRP_END && V < REST - 0.5) return { key: 'rec', name: 'Returning to rest', col: C.purple, na: 'closed: can open again', k: 'closing', txt: 'The K⁺ channels close. The Na⁺/K⁺ pump and the leak channels bring the membrane back to the resting potential of −70 mV.', u };
    if (V > REST + 0.5) return { key: 'sub', name: 'Depolarised, below threshold', col: C.orange, na: 'a few open', k: 'closed', txt: 'The stimulus lets some Na⁺ in, but unless the membrane reaches the threshold of −55 mV no action potential starts, and the membrane returns to rest.', u };
    return { key: 'rest', name: 'Resting potential', col: '#495057', na: 'closed', k: 'closed (K⁺ leak channels open)', txt: 'The inside is about −70 mV. The Na⁺/K⁺ pump moves 3 Na⁺ out for every 2 K⁺ in, and K⁺ leaks out through open leak channels.', u };
  }
  function apLayout(w) {
    if (w >= 760) return { wide: true, g: { x: 52, y: 26, w: w - 52 - 300, h: 270 }, stimY: 358, panel: { x: w - 276, y: 20, w: 262 } };
    return { wide: false, g: { x: 46, y: 26, w: w - 46 - 14, h: 230 }, stimY: 318, panel: { x: 14, y: 344, w: w - 28 } };
  }
  function syncGap(s) { const c = s.controls.gap; if (c) { c.el.disabled = s.p.mode !== 'two'; c.el.closest('.ctrl').style.opacity = s.p.mode === 'two' ? '' : '0.45'; } }

  Sim.create('#sim-bio-8ab-ap', {
    title: 'The action potential: threshold and refractory period',
    alt: 'Graph of membrane potential against time after a stimulus, with the threshold marked and the refractory periods shaded.',
    height: (w) => (w >= 760 ? 400 : 580),
    controls: [
      { key: 'mode', type: 'select', label: 'Stimulus', value: 'single', options: [['single', 'One stimulus'], ['two', 'Two stimuli'], ['sustained', 'A long, steady stimulus']], onChange: (s) => { s.state.cursor = null; syncGap(s); } },
      { key: 'A', label: 'Stimulus strength (depolarisation it causes)', min: 0, max: 40, step: 1, value: 20, unit: 'mV', format: (v) => v.toFixed(0), onChange: (s) => { s.state.cursor = null; } },
      { key: 'gap', label: 'Time between the two stimuli', min: 1, max: 15, step: 0.5, value: 6, unit: 'ms', format: (v) => v.toFixed(1), onChange: (s) => { s.state.cursor = null; } }
    ],
    init(s) { s.state = { cursor: null, key: '', sim: null }; syncGap(s); },
    pointer: {
      down(s, pt) { cursorFromPointer(s, pt); },
      move(s, pt) { cursorFromPointer(s, pt); }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const L = apLayout(w);
      const fs = L.wide ? 12.5 : 11.5;
      const key = p.mode + '|' + p.A + '|' + p.gap;
      if (st.key !== key) { const set = apSetup(p); st.set = set; st.sim = simulate(set.syn, set.tmax); st.key = key; }
      const set = st.set, sim = st.sim;
      const g = mvGraph(ctx, L.g, set.tmax);
      shadeRefractory(ctx, g, sim.aps);
      g.label(set.tmax * 0.99, THR + 4, 'threshold −55 mV', { color: '#d9480f', size: 11, align: 'right', bold: false });
      g.label(set.tmax * 0.99, REST - 5, 'resting potential −70 mV', { color: C.muted, size: 11, align: 'right', bold: false });
      g.path(sim.pts, { color: C.navy, width: 2.5 });
      // labels for the refractory periods on the first action potential
      if (sim.aps.length) {
        const ta = sim.aps[0];
        if (g.px(ta + ARP) - g.px(ta) > 22) Sim.text(ctx, 'ARP', (g.px(ta) + g.px(ta + ARP)) / 2, g.y + g.h - 10, { size: 10.5, bold: true, color: '#c92a2a', align: 'center' });
        const e = Math.min(g.xmax, ta + RRP_END);
        if (g.px(e) - g.px(ta + ARP) > 22) Sim.text(ctx, 'RRP', (g.px(ta + ARP) + g.px(e)) / 2, g.y + g.h - 10, { size: 10.5, bold: true, color: '#d9480f', align: 'center' });
      }
      // stimulus trace
      const sy = L.stimY, sh = 16;
      Sim.text(ctx, 'stimulus', g.x - 6, sy - sh / 2, { size: 11, color: C.muted, align: 'right' });
      const hgt = sh * clamp(p.A / 40, 0.05, 1);
      const sp = [[g.x, sy]];
      set.stims.forEach(([a, b]) => { sp.push([g.px(a), sy], [g.px(a), sy - hgt], [g.px(b), sy - hgt], [g.px(b), sy]); });
      sp.push([g.x + g.w, sy]);
      Sim.polyline(ctx, sp, { color: C.green, width: 2 });

      // cursor
      if (st.cursor === null) st.cursor = sim.aps.length ? sim.aps[0] + 0.3 : set.stims[0][0] + 1;
      const t = clamp(st.cursor, 0, set.tmax);
      const V = vAt(sim, t);
      Sim.line(ctx, g.px(t), g.y, g.px(t), sy, { color: C.ink, width: 1, dash: [3, 3] });
      g.dot(t, V, { color: C.red, r: 5 });

      /* explanation panel */
      const P = L.panel;
      const ph = apPhase(sim, t);
      let y = P.y + 6;
      Sim.text(ctx, 't = ' + t.toFixed(1) + ' ms,  V = ' + (V > 0 ? '+' : '') + V.toFixed(0) + ' mV', P.x, y, { size: fs, color: C.muted });
      y += 20;
      Sim.text(ctx, ph.name, P.x, y, { size: fs + 1.5, bold: true, color: ph.col });
      y += 18;
      wrapText(ctx, ph.txt, P.w, { size: fs }).forEach((ln) => { Sim.text(ctx, ln, P.x, y, { size: fs, color: C.ink }); y += 15; });
      y += 8;
      wrapText(ctx, 'Voltage-gated Na⁺ channels: ' + ph.na, P.w, { size: fs, bold: true }).forEach((ln) => { Sim.text(ctx, ln, P.x, y, { size: fs, color: '#c92a2a', bold: true }); y += 15; });
      y += 2;
      wrapText(ctx, 'Voltage-gated K⁺ channels: ' + ph.k, P.w, { size: fs, bold: true }).forEach((ln) => { Sim.text(ctx, ln, P.x, y, { size: fs, color: '#1971c2', bold: true }); y += 15; });
      y += 6;
      let ref = null;
      if (ph.u < 0.6) ref = ['Absolute refractory period:', 'the Na⁺ channels are already open, so no further stimulus can start another action potential.', '#c92a2a'];
      else if (ph.u < ARP) ref = ['Absolute refractory period:', 'Na⁺ channels are inactivated, so no stimulus can start another action potential.', '#c92a2a'];
      else if (ph.u < RRP_END) ref = ['Relative refractory period:', 'another action potential needs a larger than normal stimulus.', '#d9480f'];
      if (ref) wrapText(ctx, ref[0] + ' ' + ref[1], P.w, { size: fs }).forEach((ln) => { Sim.text(ctx, ln, P.x, y, { size: fs, color: ref[2], italic: true }); y += 15; });
      if (L.wide) Sim.text(ctx, 'Drag along the graph to move the cursor.', P.x, s.h - 14, { size: 11, color: C.muted, italic: true });
    },
    readout(s) {
      const sim = s.state.sim, p = s.p;
      if (!sim) return [];
      const n = sim.aps.length;
      const out = [['action potentials:', String(n), true]];
      if (n === 0) out.push(['highest potential reached', Math.round(sim.vmax) + ' mV (below threshold)']);
      else out.push(['peak of each one', '+' + PEAK + ' mV, whatever the stimulus strength']);
      if (p.mode === 'two' && n === 1) out.push(['second stimulus', 2 + p.gap - sim.aps[0] < ARP ? 'arrived in the absolute refractory period' : 'too weak: the membrane had not fully recovered']);
      if (p.mode === 'sustained' && n >= 2) out.push(['impulse frequency', Math.round(((n - 1) / (sim.aps[n - 1] - sim.aps[0])) * 1000) + ' Hz']);
      return out;
    }
  });
  function cursorFromPointer(s, pt) {
    const L = apLayout(s.w);
    const g = L.g;
    if (!pt.down && !(pt.x >= g.x && pt.x <= g.x + g.w && pt.y >= g.y && pt.y <= L.stimY + 6)) return;
    if (pt.x < g.x - 10 || pt.x > g.x + g.w + 10 || pt.y > L.stimY + 30) return;
    const tmax = s.state.set ? s.state.set.tmax : 15;
    s.state.cursor = clamp(((pt.x - g.x) / g.w) * tmax, 0, tmax);
  }

  /* ======================================================================
     2. Synapses: spatial and temporal summation
     ====================================================================== */
  const TR = 0.6;   // rise time constant of a postsynaptic potential / ms
  function psp(A, td) {
    const tpk = ((TR * td) / (td - TR)) * Math.log(td / TR);
    const norm = 1 / (Math.exp(-tpk / td) - Math.exp(-tpk / TR));
    return (x) => (x <= 0 ? 0 : A * norm * (Math.exp(-x / td) - Math.exp(-x / TR)));
  }
  const DRUGS = {
    none: { A: 7, td: 4, note: '' },
    ache: { A: 8, td: 12, note: 'acetylcholinesterase inhibited: ACh stays in the cleft' },
    block: { A: 0.5, td: 4, note: 'almost all ACh receptors blocked' }
  };
  const IPSP = { A: -8, td: 6 };
  const T_SUM = 30;
  function sumSetup(p) {
    const d = DRUGS[p.drug];
    const ep = psp(d.A, d.td), ip = psp(IPSP.A, IPSP.td);
    const ev = [];
    for (let k = 0; k < p.nImp; k++) {
      const t0 = 2 + k * p.gap;
      for (let n = 0; n < p.nE; n++) ev.push({ t0, f: ep });
      if (p.inh) ev.push({ t0, f: ip });
    }
    const syn = (t, since) => ev.reduce((acc, e) => acc + (e.t0 >= since - 1e-9 ? e.f(t - e.t0) : 0), 0);
    return { syn, times: ev.filter((e, i, a) => a.findIndex((q) => q.t0 === e.t0) === i).map((e) => e.t0) };
  }

  Sim.create('#sim-bio-8ab-summation', {
    title: 'Summation at a synapse',
    alt: 'Three excitatory and one inhibitory neurone synapse with one postsynaptic neurone; a graph shows the postsynaptic membrane potential.',
    height: (w) => (w >= 720 ? 360 : 560),
    controls: [
      { key: 'nE', label: 'Excitatory neurones firing together', min: 1, max: 3, step: 1, value: 1, format: (v) => v.toFixed(0) },
      { key: 'nImp', label: 'Impulses from each neurone', min: 1, max: 5, step: 1, value: 1, format: (v) => v.toFixed(0) },
      { key: 'gap', label: 'Time between impulses', min: 1, max: 8, step: 0.5, value: 2, unit: 'ms', format: (v) => v.toFixed(1) },
      { key: 'inh', type: 'check', label: 'Inhibitory neurone fires too', value: false },
      { key: 'drug', type: 'select', label: 'Drug at the excitatory synapses', value: 'none', options: [['none', 'None'], ['ache', 'Acetylcholinesterase inhibitor'], ['block', 'Receptor blocker (cobra α-toxin)']] }
    ],
    init(s) { s.state = { key: '', sim: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 720;
      const key = [p.nE, p.nImp, p.gap, p.inh, p.drug].join('|');
      if (st.key !== key) { st.set = sumSetup(p); st.sim = simulate(st.set.syn, T_SUM); st.key = key; }
      const sim = st.sim;

      /* schematic of the synapses */
      const sb = wide ? { x: 10, y: 10, w: 250, h: h - 20 } : { x: 10, y: 6, w: w - 20, h: 190 };
      const cx = sb.x + sb.w * (wide ? 0.66 : 0.55), cy = wide ? sb.y + sb.h * 0.42 : sb.y + 72;
      const squash = wide ? 0.75 : 0.5;
      const R = 26;
      // postsynaptic axon leaving to the right
      Sim.line(ctx, cx + R, cy, sb.x + sb.w - 4, cy, { color: C.navy, width: 5 });
      Sim.text(ctx, 'to axon', sb.x + sb.w - 6, cy - 12, { size: 11, color: C.navy, align: 'right' });
      const fired = sim.aps.length > 0;
      Sim.circle(ctx, cx, cy, R, { fill: fired ? '#ffe3e3' : '#e7f5ff', stroke: C.navy, width: 2.5 });
      Sim.text(ctx, fired ? 'fires!' : 'no AP', cx, cy, { size: 11.5, bold: true, color: fired ? C.red : C.navy, align: 'center' });
      const inputs = [
        { lab: 'E1', ang: -2.35, on: p.nE >= 1, ex: true },
        { lab: 'E2', ang: -2.85, on: p.nE >= 2, ex: true },
        { lab: 'E3', ang: 2.85, on: p.nE >= 3, ex: true },
        { lab: 'I', ang: 2.3, on: p.inh, ex: false }
      ];
      const len = Math.min(150, (cx - sb.x - 26) / 0.96 - (R + 7));
      inputs.forEach((q) => {
        const kx = cx + Math.cos(q.ang) * (R + 7), ky = cy + Math.sin(q.ang) * (R + 7);
        const sx = cx + Math.cos(q.ang) * (R + 7 + len), sy = cy + Math.sin(q.ang) * (R + 7 + len) * squash;
        const col = !q.on ? '#ced4da' : q.ex ? C.green : C.red;
        Sim.line(ctx, sx, sy, kx, ky, { color: col, width: 3 });
        Sim.circle(ctx, kx, ky, 6.5, { fill: col });
        Sim.text(ctx, q.lab, sx - 4, sy, { size: 12, bold: true, color: q.on ? col : C.muted, align: 'right' });
        if (q.on) {
          // impulses on their way, one mark per impulse
          for (let k = 0; k < p.nImp; k++) {
            const f = 0.25 + (0.55 * k) / Math.max(1, p.nImp);
            const ix = Sim.lerp(sx, kx, f), iy = Sim.lerp(sy, ky, f);
            Sim.circle(ctx, ix, iy, 3.5, { fill: '#fff', stroke: col, width: 2 });
          }
        }
      });
      const note = DRUGS[p.drug].note;
      const nl = wrapText(ctx, note || 'Excitatory synapses: ACh opens Na⁺ channels. Inhibitory synapse: makes the inside more negative.', sb.w - 10, { size: 11 });
      nl.forEach((ln, i) => Sim.text(ctx, ln, sb.x + 4, sb.y + sb.h - 8 - (nl.length - 1 - i) * 14, { size: 11, color: note ? '#c92a2a' : C.muted, italic: true }));

      /* the postsynaptic membrane potential */
      const gb = wide ? { x: sb.x + sb.w + 54, y: 26, w: w - (sb.x + sb.w + 54) - 16, h: h - 26 - 52 } : { x: 46, y: sb.y + sb.h + 26, w: w - 46 - 14, h: h - (sb.y + sb.h + 26) - 50 };
      const g = mvGraph(ctx, gb, T_SUM);
      shadeRefractory(ctx, g, sim.aps);
      g.label(T_SUM * 0.99, THR + 4, 'threshold', { color: '#d9480f', size: 11, align: 'right', bold: false });
      g.path(sim.pts, { color: C.navy, width: 2.5 });
      st.set.times.forEach((t0) => {
        const x = g.px(t0);
        Sim.line(ctx, x, g.y + g.h - 8, x, g.y + g.h, { color: C.green, width: 2.5 });
      });
      Sim.text(ctx, 'impulses arrive', g.px(2) + 4, g.y + g.h - 14, { size: 10.5, color: '#2b8a3e', align: 'left' });
    },
    readout(s) {
      const sim = s.state.sim, p = s.p;
      if (!sim) return [];
      const n = sim.aps.length;
      const type = p.nE > 1 && p.nImp > 1 ? 'spatial and temporal' : p.nE > 1 ? 'spatial' : p.nImp > 1 ? 'temporal' : 'none (one impulse)';
      return [
        ['summation:', type],
        ['single excitatory potential', '+' + DRUGS[p.drug].A.toFixed(1) + ' mV'],
        n ? ['postsynaptic neurone', 'fires ' + n + ' action potential' + (n > 1 ? 's' : ''), true] : ['postsynaptic neurone', 'no action potential: peak ' + Math.round(sim.vmax) + ' mV', true]
      ];
    }
  });
})();
