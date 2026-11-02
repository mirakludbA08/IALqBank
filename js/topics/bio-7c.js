/* Biology 7c: Control of the internal environment — interactive diagrams */
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
  /* Labelled horizontal bar, f from 0 to 1. */
  function bar(ctx, x, y, w, f, label, col, o) {
    o = o || {};
    const fs = o.size || 12;
    Sim.text(ctx, label, x, y, { size: fs, color: f > 0.02 ? C.ink : C.muted, bold: f > 0.02 });
    const by = y + 9;
    Sim.rect(ctx, x, by, w, 8, { fill: C.light, r: 4 });
    if (f > 0.005) Sim.rect(ctx, x, by, Math.max(8, w * clamp(f, 0, 1)), 8, { fill: col, r: 4 });
    if (o.value) Sim.text(ctx, o.value, x + w, y, { size: fs, color: C.navy, bold: true, align: 'right' });
  }

  /* ======================================================================
     1. Thermoregulation by negative feedback
     ====================================================================== */
  const HEAT_CAP = 245000;   // heat capacity of a 70 kg body / J K⁻¹ (70 kg × 3.5 kJ kg⁻¹ K⁻¹)
  const SET = 37.0;          // set point / °C
  const MIN_PER_S = 2;       // simulated minutes per real second
  const WINDOW = 60;         // minutes shown on the graph
  /* Effector activity (0 to 1) set by the hypothalamus from the difference from the set point. */
  function effectors(T, on) {
    if (!on) return { sw: 0, vd: 0, vc: 0, he: 0, sh: 0, mr: 0 };
    const e = T - SET;
    return {
      sw: clamp((e - 0.1) / 1.2, 0, 1),     // sweating
      vd: clamp(e / 0.6, 0, 1),             // vasodilation of skin arterioles
      vc: clamp(-e / 0.5, 0, 1),            // vasoconstriction of skin arterioles
      he: clamp(-e / 0.3, 0, 1),            // hairs raised by the erector pili muscles
      sh: clamp((-e - 0.2) / 0.8, 0, 1),    // shivering
      mr: clamp((-e - 0.3) / 1.0, 0, 1)     // adrenaline and thyroxine raise metabolic rate
    };
  }
  /* Heat flows in W. */
  function heatFlows(T, p, E) {
    const made = 100 + (p.ex ? 500 : 0) + 350 * E.sh + 80 * E.mr;
    const k = 9 + 20 * E.vd - 4 * E.vc - 0.5 * E.he;     // W K⁻¹: skin blood flow controls heat transfer
    const dry = k * (T - p.Ta);                            // radiation, conduction and convection (negative = heat gained)
    const evap = 10 + 650 * E.sw;                          // evaporation of sweat (and from the lungs)
    return { made, dry, evap, lost: dry + evap };
  }

  function thermoLayout(w, h) {
    if (w >= 720) return { wide: true, g: { x: 58, y: 34, w: w - 58 - 320, h: h - 34 - 44 }, panel: { x: w - 290, y: 18, w: 272 } };
    return { wide: false, g: { x: 50, y: 34, w: w - 50 - 16, h: 210 }, panel: { x: 16, y: 292, w: w - 32 } };
  }

  Sim.create('#sim-bio-7c-thermo', {
    title: 'Negative feedback: controlling body temperature',
    alt: 'Graph of core body temperature against time, with bars showing how strongly each effector is working.',
    height: (w) => (w >= 720 ? 380 : 580),
    controls: [
      { key: 'Ta', label: 'Air temperature', min: 0, max: 45, step: 1, value: 25, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'ex', type: 'check', label: 'Exercising', value: false },
      { key: 'fb', type: 'check', label: 'Hypothalamus control working', value: true }
    ],
    animate: true,
    init(s) { s.state = { T: SET, t: 0, hist: [[0, SET]], E: effectors(SET, true) }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      let rem = dt * MIN_PER_S * 60;          // seconds of body time this frame
      while (rem > 1e-9) {
        const h = Math.min(0.5, rem);
        rem -= h;
        const E = effectors(st.T, p.fb);
        const f = heatFlows(st.T, p, E);
        st.T = clamp(st.T + ((f.made - f.lost) * h) / HEAT_CAP, 25, 45);
        st.t += h / 60;
      }
      st.E = effectors(st.T, p.fb);
      const last = st.hist[st.hist.length - 1];
      if (st.t - last[0] >= 0.1) st.hist.push([st.t, st.T]);
      if (st.hist.length > 2000) st.hist.splice(0, st.hist.length - 1500);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const L = thermoLayout(w, h);
      const fs = L.wide ? 12.5 : 11.5;
      const x1 = Math.max(WINDOW, st.t), x0 = x1 - WINDOW;
      const g = Sim.graph(ctx, Object.assign({ xmin: x0, xmax: x1, ymin: 34, ymax: 42, ystep: 1, xstep: 10, xlabel: 'time / min', ylabel: 'core temperature / °C' }, L.g));
      g.axes();
      // normal range and danger levels
      Sim.rect(ctx, g.x, g.py(37.5), g.w, g.py(36.5) - g.py(37.5), { fill: 'rgba(47,158,68,0.10)' });
      g.hline(SET, { color: C.green, dash: [6, 4] });
      g.label(x0 + WINDOW * 0.02, 37.05, 'set point 37 °C', { color: '#2b8a3e', size: 11, align: 'left', baseline: 'bottom', bg: 'rgba(255,255,255,0.8)', pad: 2 });
      g.hline(40, { color: '#ffa8a8', dash: [3, 4] });
      g.label(x0 + WINDOW * 0.02, 40.05, 'heat stroke risk above 40 °C', { color: '#c92a2a', size: 10.5, align: 'left', baseline: 'bottom', bold: false, bg: 'rgba(255,255,255,0.8)', pad: 2 });
      g.hline(35, { color: '#a5d8ff', dash: [3, 4] });
      g.label(x0 + WINDOW * 0.02, 34.95, 'hypothermia below 35 °C', { color: '#1971c2', size: 10.5, align: 'left', baseline: 'top', bold: false, bg: 'rgba(255,255,255,0.8)', pad: 2 });
      g.path(st.hist.filter((q) => q[0] >= x0 - 1).concat([[st.t, st.T]]), { color: C.red, width: 2.5 });
      g.dot(st.t, clamp(st.T, 34, 42), { color: C.red, r: 5 });
      if (st.T >= 41.9 || st.T <= 34.1) Sim.text(ctx, 'Off the scale: press Reset', g.x + g.w / 2, g.y + 20, { size: 12, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.9)' });

      /* hypothalamus and effectors */
      const P = L.panel;
      const E = st.E;
      const e = st.T - SET;
      const lossOn = p.fb && e > 0.02, gainOn = p.fb && e < -0.02;
      let y = P.y + 8;
      Sim.text(ctx, 'Hypothalamus', P.x, y, { size: fs + 1, bold: true, color: C.navy });
      Sim.text(ctx, p.fb ? 'compares blood temperature with 37 °C' : 'control switched off: no response', P.x, y + 17, { size: 11, color: p.fb ? C.muted : C.red, italic: true });
      y += 40;
      const bw = P.w;
      const head = (txt, on, col) => {
        Sim.rect(ctx, P.x, y - 9, bw, 20, { fill: on ? col : '#f1f3f5', r: 5 });
        Sim.text(ctx, txt, P.x + 8, y + 1, { size: fs, bold: true, color: on ? '#fff' : C.muted });
        y += 22;
      };
      head('Heat loss centre' + (lossOn ? ': active' : ''), lossOn, C.red);
      bar(ctx, P.x, y, bw, E.sw, 'Sweat glands secrete sweat', C.red, { size: fs }); y += 26;
      bar(ctx, P.x, y, bw, E.vd, 'Skin arterioles dilate', C.red, { size: fs }); y += 30;
      head('Heat gain centre' + (gainOn ? ': active' : ''), gainOn, C.blue);
      bar(ctx, P.x, y, bw, E.vc, 'Skin arterioles constrict', C.blue, { size: fs }); y += 26;
      bar(ctx, P.x, y, bw, E.he, 'Erector pili contract: hairs raised', C.blue, { size: fs }); y += 26;
      bar(ctx, P.x, y, bw, E.sh, 'Shivering', C.blue, { size: fs }); y += 26;
      bar(ctx, P.x, y, bw, E.mr, 'More adrenaline and thyroxine', C.blue, { size: fs }); y += 28;
      const f = heatFlows(st.T, p, E);
      Sim.text(ctx, 'heat made ' + f.made.toFixed(0) + ' W   heat lost ' + f.lost.toFixed(0) + ' W', P.x, y, { size: fs, bold: true, color: C.ink });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const f = heatFlows(st.T, p, st.E);
      const net = f.made - f.lost;
      return [
        ['core temperature', st.T.toFixed(2) + ' °C', true],
        ['difference from set point', (st.T - SET >= 0 ? '+' : '−') + Math.abs(st.T - SET).toFixed(2) + ' °C'],
        ['heat made', f.made.toFixed(0) + ' W'],
        ['heat lost', f.lost.toFixed(0) + ' W'],
        ['body is', Math.abs(net) < 3 ? 'in balance' : net > 0 ? 'warming' : 'cooling']
      ];
    }
  });

  /* ======================================================================
     2. Cardiac output during exercise
     ====================================================================== */
  const FIT = {
    untrained: { name: 'untrained', hr0: 72, hr1: 195, sv0: 70, sv1: 110 },
    trained: { name: 'endurance-trained', hr0: 50, hr1: 190, sv0: 100, sv1: 160 }
  };
  const hrAt = (f, i) => f.hr0 + (f.hr1 - f.hr0) * i;                                                   // beats min⁻¹, rises steadily
  const svAt = (f, i) => f.sv0 + ((f.sv1 - f.sv0) * (1 - Math.exp(-i / 0.18))) / (1 - Math.exp(-1 / 0.18)); // cm³, levels off at about 40–50 %
  const coAt = (f, i) => (hrAt(f, i) * svAt(f, i)) / 1000;                                              // dm³ min⁻¹

  Sim.create('#sim-bio-7c-output', {
    title: 'Heart rate, stroke volume and cardiac output in exercise',
    alt: 'Graph of cardiac output against exercise intensity for an untrained and a trained person, with bars for heart rate and stroke volume.',
    height: (w) => (w >= 700 ? 340 : 560),
    controls: [
      { key: 'i', label: 'Exercise intensity (% of maximum)', min: 0, max: 100, step: 1, value: 0, unit: '%', format: (v) => v.toFixed(0) },
      { key: 'fit', type: 'select', label: 'Person', value: 'untrained', options: [['untrained', 'Untrained'], ['trained', 'Endurance-trained athlete']] }
    ],
    draw(s) {
      const { ctx, w, p } = s;
      const wide = w >= 700;
      const fs = wide ? 12.5 : 11.5;
      const i = p.i / 100;
      const f = FIT[p.fit], other = FIT[p.fit === 'trained' ? 'untrained' : 'trained'];
      const gb = wide ? { x: 60, y: 30, w: w - 60 - 330, h: 270 } : { x: 50, y: 30, w: w - 50 - 16, h: 220 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 100, ymin: 0, ymax: 35, xstep: 20, ystep: 5, xlabel: 'intensity / %', ylabel: 'cardiac output / dm³ min⁻¹' }, gb));
      g.axes();
      g.plot((x) => coAt(other, x / 100), { color: '#adb5bd', width: 2, dash: [6, 4] });
      g.plot((x) => coAt(f, x / 100), { color: C.navy, width: 3 });
      // the trained curve is the upper one: label it above, and the untrained curve below
      g.label(98, coAt(other, 1) + (p.fit === 'trained' ? -3.6 : 1.8), other.name, { color: C.muted, size: 11, align: 'right', bold: false });
      g.label(98, coAt(f, 1) + (p.fit === 'trained' ? 1.8 : -3.6), f.name, { color: C.navy, size: 11.5, align: 'right' });
      g.vline(p.i, { color: '#ced4da' });
      g.dot(p.i, coAt(f, i), { color: C.red, r: 6 });

      /* panel */
      const P = wide ? { x: w - 300, y: 22, w: 284 } : { x: 16, y: 290, w: w - 32 };
      let y = P.y;
      const hr = hrAt(f, i), sv = svAt(f, i), co = coAt(f, i);
      bar(ctx, P.x, y, P.w, hr / 200, 'Heart rate', C.red, { size: fs, value: hr.toFixed(0) + ' beats min⁻¹' }); y += 32;
      bar(ctx, P.x, y, P.w, sv / 180, 'Stroke volume', C.purple, { size: fs, value: sv.toFixed(0) + ' cm³' }); y += 32;
      bar(ctx, P.x, y, P.w, co / 35, 'Cardiac output = SV × HR', C.navy, { size: fs, value: co.toFixed(1) + ' dm³ min⁻¹' }); y += 40;
      const vag = clamp(0.9 - 1.6 * i, 0.05, 0.9), sym = clamp(0.1 + 0.9 * Math.pow(i, 1.2), 0.1, 1);
      Sim.text(ctx, 'Cardiovascular control centre (medulla)', P.x, y, { size: fs, bold: true, color: C.navy }); y += 18;
      bar(ctx, P.x, y, P.w, vag, 'Parasympathetic (vagus) impulses to SAN', C.teal, { size: 11.5 }); y += 28;
      bar(ctx, P.x, y, P.w, sym, 'Sympathetic impulses and adrenaline', C.orange, { size: 11.5 }); y += 30;
      const msg = 'Working muscles squeeze more blood back to the heart, so the end diastolic volume rises. The stretched ventricle contracts more strongly (Frank–Starling), so stroke volume rises until it levels off. Heart rate keeps rising.';
      wrapText(ctx, msg, P.w, { size: 11.5 }).forEach((ln, k) => Sim.text(ctx, ln, P.x, y + k * 15, { size: 11.5, color: C.muted }));
    },
    readout(s) {
      const f = FIT[s.p.fit], i = s.p.i / 100;
      const hr = hrAt(f, i), sv = svAt(f, i);
      const co = Math.round(hr) * Math.round(sv);
      return [
        ['heart rate', Math.round(hr) + ' beats min⁻¹'],
        ['stroke volume', Math.round(sv) + ' cm³'],
        ['cardiac output = ' + Math.round(sv) + ' × ' + Math.round(hr) + ' =', co.toLocaleString('en-GB').replace(/,/g, ' ') + ' cm³ min⁻¹', true],
        ['rise from rest', '× ' + (coAt(f, i) / coAt(f, 0)).toFixed(1)]
      ];
    }
  });
})();
