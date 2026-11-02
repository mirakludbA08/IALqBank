/* Biology 7b: Muscles and the heart — interactive diagrams */
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
  /* Horizontal dimension line with end bars and a centred label. */
  function dim(ctx, xa, xb, y, label, col, o) {
    o = o || {};
    if (xb - xa < 1) {
      Sim.text(ctx, label + (o.zero ? ' = 0' : ''), (xa + xb) / 2, y - (o.below ? -12 : 10), { size: o.size || 12, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.85)' });
      return;
    }
    Sim.line(ctx, xa, y, xb, y, { color: col, width: 1.5 });
    Sim.line(ctx, xa, y - 5, xa, y + 5, { color: col, width: 1.5 });
    Sim.line(ctx, xb, y - 5, xb, y + 5, { color: col, width: 1.5 });
    Sim.text(ctx, label, (xa + xb) / 2, y + (o.below ? 12 : -10), { size: o.size || 12, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.85)', pad: 2 });
  }

  /* ======================================================================
     1. The sliding filament model: one sarcomere
     ====================================================================== */
  const MYO = 1.6;    // length of a thick (myosin) filament = A band / µm
  const ACT = 1.0;    // length of a thin (actin) filament from the Z line / µm
  const LMIN = 2.0, LMAX = 3.4;

  Sim.create('#sim-bio-7b-sarcomere', {
    title: 'Sliding filaments in a sarcomere',
    alt: 'A sarcomere between two Z lines with thin actin and thick myosin filaments; the bands above change width as it shortens.',
    height: (w) => (w >= 600 ? 300 : 310),
    controls: [
      { key: 'L', label: 'Sarcomere length', min: LMIN, max: LMAX, step: 0.02, value: 3.0, unit: 'µm', format: (v) => v.toFixed(2), onChange: (s) => s.pause() }
    ],
    animate: true,
    autoplay: false,
    resetButton: false,
    init(s) { s.state = { ph: 0, lastL: null }; },
    update(s, dt) {
      // contract and relax smoothly while playing, starting from the slider's length
      const st = s.state;
      if (st.lastL === null || Math.abs(s.p.L - st.lastL) > 1e-9) st.ph = Math.acos(clamp((2 * (s.p.L - LMIN)) / (LMAX - LMIN) - 1, -1, 1));
      st.ph += dt * 1.2;
      const L = Math.round((LMIN + ((LMAX - LMIN) * (1 + Math.cos(st.ph))) / 2) * 50) / 50;
      st.lastL = L;
      s.set('L', L);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const L = p.L;
      const k = Math.min(120, (w - 30) / 6.2);     // px per µm
      const cx = w / 2;
      const X = (um) => cx + um * k;               // position relative to the M line
      const zl = X(-L / 2), zr = X(L / 2);
      const fs = w < 600 ? 11.5 : 12.5;
      const H = Math.max(0, L - 2 * ACT);          // H zone
      const I = L - MYO;                           // I band
      const left = 8, right = w - 8;

      /* band pattern as seen down the microscope */
      const by = 58, bh = 20;
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, by, right - left, bh);
      ctx.clip();
      Sim.rect(ctx, left, by, right - left, bh, { fill: '#f1f3f5' });
      [-1, 0, 1].forEach((n) => {
        const m = n * L;
        Sim.rect(ctx, X(m - MYO / 2), by, MYO * k, bh, { fill: '#7f8b99' });               // A band
        const hz = Math.max(0, L - 2 * ACT);
        if (hz > 0) Sim.rect(ctx, X(m - hz / 2), by, hz * k, bh, { fill: '#b8c1cc' });       // H zone
        Sim.line(ctx, X(m), by, X(m), by + bh, { color: '#495057', width: 1 });              // M line
        Sim.line(ctx, X(m + L / 2), by - 2, X(m + L / 2), by + bh + 2, { color: '#212529', width: 2.5 }); // Z line
        Sim.line(ctx, X(m - L / 2), by - 2, X(m - L / 2), by + bh + 2, { color: '#212529', width: 2.5 });
      });
      ctx.restore();
      Sim.rect(ctx, left, by, right - left, bh, { stroke: '#adb5bd', width: 1 });

      /* filaments */
      const fy = by + bh + 40;
      const rows = { actin: [fy, fy + 44, fy + 88], myosin: [fy + 22, fy + 66] };
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, fy - 16, right - left, 120);
      ctx.clip();
      // thin filaments: each Z line carries actin pointing both ways
      [-1.5, -0.5, 0.5, 1.5].forEach((zn) => {
        const z = zn * L;
        rows.actin.forEach((y) => {
          Sim.line(ctx, X(z - ACT), y, X(z + ACT), y, { color: C.blue, width: 3 });
        });
      });
      // thick filaments with myosin heads
      [-1, 0, 1].forEach((n) => {
        const m = n * L;
        rows.myosin.forEach((y) => {
          Sim.line(ctx, X(m - MYO / 2), y, X(m + MYO / 2), y, { color: C.red, width: 7, cap: 'butt' });
          const step = Math.max(0.12, 11 / k);
          for (let d = 0.12; d <= MYO / 2 - 0.02; d += step) {
            [-1, 1].forEach((side) => {
              const hx = X(m + side * d);
              // is there actin over this head? actin from the nearer Z line reaches m ± (L/2 − ACT)
              const attached = d >= L / 2 - ACT;
              [-1, 1].forEach((ud) => {
                const tipY = attached ? y + ud * 19 : y + ud * 9;
                Sim.line(ctx, hx, y + ud * 3, hx - side * 4, tipY, { color: attached ? '#c92a2a' : '#ffa8a8', width: attached ? 1.8 : 1.4 });
              });
            });
          }
        });
      });
      // Z lines and M line
      [-1.5, -0.5, 0.5, 1.5].forEach((zn) => Sim.line(ctx, X(zn * L), fy - 12, X(zn * L), fy + 100, { color: '#212529', width: 3 }));
      Sim.line(ctx, cx, fy + 8, cx, fy + 80, { color: C.grey, width: 1.5, dash: [3, 3] });
      ctx.restore();

      /* labels and dimensions */
      Sim.text(ctx, 'Z', zl, fy + 112, { size: fs, bold: true, align: 'center' });
      Sim.text(ctx, 'Z', zr, fy + 112, { size: fs, bold: true, align: 'center' });
      Sim.text(ctx, 'M', cx, fy + 112, { size: fs, bold: true, align: 'center', color: C.muted });
      dim(ctx, X(-MYO / 2), X(MYO / 2), by - 34, 'A band ' + MYO.toFixed(2) + ' µm', '#495057', { size: fs });
      dim(ctx, X(-H / 2), X(H / 2), by - 12, 'H zone', '#5c7cfa', { size: fs - 0.5, zero: true });
      dim(ctx, X(-L / 2 - I / 2), X(-L / 2 + I / 2), by + bh + 8, 'I band', C.blue, { size: fs - 0.5, below: true });
      dim(ctx, zl, zr, fy + 132, 'sarcomere ' + L.toFixed(2) + ' µm', C.navy, { size: fs, below: true });
      // key
      const ky = h - 14;
      Sim.line(ctx, 14, ky, 34, ky, { color: C.blue, width: 3 });
      Sim.text(ctx, 'actin (thin)', 40, ky, { size: 11.5, color: C.muted });
      const kx = w < 600 ? 128 : 150;
      Sim.line(ctx, kx, ky, kx + 20, ky, { color: C.red, width: 6, cap: 'butt' });
      Sim.text(ctx, 'myosin (thick) with heads', kx + 26, ky, { size: 11.5, color: C.muted });
    },
    readout(s) {
      const L = s.p.L;
      return [
        ['sarcomere', L.toFixed(2) + ' µm'],
        ['A band', MYO.toFixed(2) + ' µm (unchanged)', true],
        ['I band', (L - MYO).toFixed(2) + ' µm'],
        ['H zone', Math.max(0, L - 2 * ACT).toFixed(2) + ' µm'],
        ['actin filaments', ACT.toFixed(2) + ' µm each (unchanged)']
      ];
    }
  });

  /* ======================================================================
     2. The cardiac cycle: pressures on the left side of the heart
     ====================================================================== */
  /* Monotone cubic (Fritsch–Carlson) interpolation through [x, y] points. */
  function mono(pts) {
    const n = pts.length, xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], ss = a * a + b * b;
      if (ss > 9) { const t = 3 / Math.sqrt(ss); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const hh = xs[i + 1] - xs[i], t = (x - xs[i]) / hh;
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1];
    };
  }
  /* One cycle at 75 beats per minute (0.8 s), starting at the P wave. Pressures in kPa. */
  const T0 = 0.8;
  const LA = mono([[0, 0.5], [0.06, 0.5], [0.10, 0.85], [0.13, 1.25], [0.16, 0.95], [0.19, 0.5], [0.23, 0.3], [0.36, 0.6], [0.50, 1.0], [0.53, 1.05], [0.58, 0.65], [0.66, 0.5], [0.80, 0.5]]);
  const LV = mono([[0, 0.3], [0.06, 0.35], [0.10, 0.65], [0.13, 1.0], [0.155, 1.1], [0.18, 2.6], [0.205, 7.5], [0.225, 11.6], [0.25, 13.9], [0.31, 16.0], [0.37, 15.6], [0.43, 14.3], [0.46, 13.2], [0.49, 7.5], [0.52, 2.0], [0.545, 0.5], [0.58, 0.2], [0.68, 0.25], [0.80, 0.3]]);
  const T_SLC = 0.46;          // semilunar valve closes (end of the T wave)
  const T_N = 0.485, P_N = 13.6, TAU_AO = 2.3;   // dicrotic notch and the fall of aortic pressure in diastole
  const aoDecay = (tau) => P_N * Math.exp(-((tau < T_N ? tau + T0 : tau) - T_N) / TAU_AO);
  const firstCross = (f, a, b) => { for (let t = a; t < b; t += 0.0005) if (f(t)) return t; return b; };
  const T_SLO = firstCross((t) => LV(t) >= aoDecay(t), 0.16, 0.3);     // semilunar valve opens
  const T_AVC = firstCross((t) => LV(t) > LA(t), 0.06, 0.3);           // AV valve closes
  const T_AVO = firstCross((t) => LV(t) < LA(t), 0.47, 0.7);           // AV valve opens
  function AO(tau) {
    if (tau < T_SLO) return aoDecay(tau);
    if (tau < 0.43) return LV(tau) - 0.25 * Math.min(1, (tau - T_SLO) / 0.02);
    if (tau < T_SLC) return LV(tau) - (0.25 * (T_SLC - tau)) / (T_SLC - 0.43);   // ventricle falls below aorta at closure
    if (tau < T_N) {
      const a = LV(T_SLC), dip = a - 0.45;
      const u = (tau - T_SLC) / (T_N - T_SLC);
      return u < 0.35 ? a + (dip - a) * (u / 0.35) : dip + (P_N - dip) * Math.sin(((u - 0.35) / 0.65) * Math.PI / 2);
    }
    return aoDecay(tau);
  }
  const gauss = (x, c, sd) => Math.exp(-((x - c) * (x - c)) / (2 * sd * sd));
  const ECG = (tau) => 0.15 * gauss(tau, 0.05, 0.016) - 0.12 * gauss(tau, 0.133, 0.005) + 1.1 * gauss(tau, 0.145, 0.007) - 0.25 * gauss(tau, 0.157, 0.006) + 0.3 * gauss(tau, 0.39, 0.03);
  /* Faster hearts shorten diastole much more than systole. */
  const SPLIT = 0.56;
  function warp(hr) {
    const T = 60 / hr;
    const sc = Math.pow(T / T0, 0.6);
    return {
      T,
      tau: (t) => (t < SPLIT * sc ? t / sc : SPLIT + ((t - SPLIT * sc) * (T0 - SPLIT)) / (T - SPLIT * sc)),
      real: (tau) => (tau < SPLIT ? tau * sc : SPLIT * sc + ((tau - SPLIT) * (T - SPLIT * sc)) / (T0 - SPLIT))
    };
  }
  function phaseOf(tau) {
    if (tau < 0.06) return ['Diastole', 'The whole heart is relaxed. Blood flows from the atrium through the open AV valve into the ventricle.'];
    if (tau < T_AVC) return ['Atrial systole', 'The atrium contracts, pushing the last of its blood into the ventricle. Atrial pressure rises a little.'];
    if (tau < T_SLO) return ['Ventricular systole', 'The ventricle contracts. Its pressure rises above atrial pressure, so the AV valve shuts. Both valves are closed while pressure builds.'];
    if (tau < T_SLC) return ['Ventricular systole', 'Ventricular pressure is above aortic pressure, so the semilunar valve is open and blood is forced into the aorta.'];
    if (tau < T_AVO) return ['Diastole', 'The ventricle relaxes. Its pressure falls below aortic pressure, so the semilunar valve shuts. Both valves are closed.'];
    return ['Diastole', 'Ventricular pressure falls below atrial pressure, so the AV valve opens and the ventricle fills.'];
  }
  const EVENTS = [['A', T_AVC, 'AV valve closes'], ['B', T_SLO, 'semilunar valve opens'], ['C', T_SLC, 'semilunar valve closes'], ['D', T_AVO, 'AV valve opens']];

  function cardiacLayout(w) {
    const wide = w >= 720;
    if (wide) return { wide, g: { x: 60, y: 44, w: w - 60 - 250, h: 230 }, e: { y: 312, h: 64 }, panel: { x: w - 224, y: 30, w: 208 } };
    return { wide, g: { x: 50, y: 44, w: w - 50 - 16, h: 210 }, e: { y: 290, h: 56 }, panel: { x: 14, y: 372, w: w - 28 } };
  }

  Sim.create('#sim-bio-7b-cardiac', {
    title: 'The cardiac cycle: left side of the heart',
    alt: 'Graph of pressure in the left atrium, left ventricle and aorta during one heartbeat, with the ECG underneath and the state of each valve.',
    height: (w) => (w >= 720 ? 400 : 560),
    controls: [
      { key: 'hr', label: 'Heart rate', min: 50, max: 120, step: 1, value: 75, unit: 'beats min⁻¹', format: (v) => v.toFixed(0), onChange: (s) => { s.state.t = s.state.t % (60 / s.p.hr); } },
      { key: 'ecg', type: 'check', label: 'Show the ECG', value: true }
    ],
    animate: true,
    resetButton: false,
    init(s) { s.state = { t: 0 }; s.speed = 0.3; },
    update(s, dt) {
      const T = 60 / s.p.hr;
      s.state.t = (s.state.t + dt) % T;
    },
    pointer: {
      down(s, pt) { if (setFromPointer(s, pt)) s.pause(); },
      move(s, pt) { if (pt.down) setFromPointer(s, pt); }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const L = cardiacLayout(w);
      const W = warp(p.hr);
      const fs = L.wide ? 12.5 : 11.5;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: W.T, ymin: 0, ymax: 18, ystep: 2, xstep: 0.1, xlabel: 'time / s', ylabel: 'pressure / kPa' }, L.g));
      g.axes();
      // ventricular systole shaded
      Sim.rect(ctx, g.px(W.real(T_AVC)), g.y, g.px(W.real(T_SLC)) - g.px(W.real(T_AVC)), g.h, { fill: 'rgba(224,49,49,0.06)' });
      const vsx = (g.px(W.real(T_AVC)) + g.px(W.real(T_SLC))) / 2;
      Sim.text(ctx, 'ventricular', vsx, g.py(9), { size: 11, color: '#c92a2a', align: 'center', italic: true });
      Sim.text(ctx, 'systole', vsx, g.py(9) + 14, { size: 11, color: '#c92a2a', align: 'center', italic: true });
      // valve events
      EVENTS.forEach(([lab, tau]) => {
        const x = g.px(W.real(tau));
        Sim.line(ctx, x, g.y + 22, x, g.y + g.h, { color: '#adb5bd', width: 1, dash: [3, 3] });
        Sim.circle(ctx, x, g.y - 12, 8, { fill: '#fff', stroke: C.navy, width: 1.5 });
        Sim.text(ctx, lab, x, g.y - 11.5, { size: 10.5, bold: true, color: C.navy, align: 'center' });
      });
      const curve = (f) => (t) => f(W.tau(t));
      g.plot(curve(AO), { color: C.red, width: 2.5, samples: 400 });
      g.plot(curve(LV), { color: C.navy, width: 2.5, samples: 400 });
      g.plot(curve(LA), { color: C.orange, width: 2.5, samples: 400 });
      // curve labels
      g.label(W.real(0.62), AO(0.62) + 1.1, 'aorta', { color: C.red, size: fs, align: 'center' });
      g.label(W.real(0.40), 16.6, 'left ventricle', { color: C.navy, size: fs, align: 'left' });
      g.label(W.real(0.33), 2.0, 'left atrium', { color: '#d9480f', size: fs, align: 'center' });

      // ECG strip on the same time axis
      const t = s.state.t, tau = W.tau(t);
      if (p.ecg) {
        const e = { x: g.x, y: L.e.y, w: g.w, h: L.e.h };
        Sim.rect(ctx, e.x, e.y, e.w, e.h, { fill: '#fff8f8', stroke: '#ffc9c9', width: 1 });
        const yE = (v) => e.y + e.h * 0.72 - v * e.h * 0.55;
        const pts = [];
        for (let i = 0; i <= 400; i++) { const tt = (W.T * i) / 400; pts.push([e.x + (tt / W.T) * e.w, yE(ECG(W.tau(tt)))]); }
        Sim.polyline(ctx, pts, { color: '#c92a2a', width: 1.8 });
        Sim.text(ctx, 'ECG', e.x - 8, e.y + e.h / 2, { size: 11.5, bold: true, color: '#c92a2a', align: 'right' });
        [['P', 0.05, 0.25], ['QRS', 0.145, 1.22], ['T', 0.39, 0.42]].forEach(([lab, c, v]) => Sim.text(ctx, lab, e.x + (W.real(c) / W.T) * e.w + (lab === 'QRS' ? 16 : 0), yE(v) - 2, { size: 10.5, bold: true, color: '#c92a2a', align: 'center' }));
        Sim.line(ctx, g.px(t), e.y, g.px(t), e.y + e.h, { color: C.ink, width: 1.5 });
      }
      // time cursor and current pressures
      Sim.line(ctx, g.px(t), g.y, g.px(t), g.y + g.h, { color: C.ink, width: 1.5 });
      g.dot(t, AO(tau), { color: C.red, r: 4.5 });
      g.dot(t, LV(tau), { color: C.navy, r: 4.5 });
      g.dot(t, LA(tau), { color: C.orange, r: 4.5 });

      /* valves and phase */
      const P = L.panel;
      const avOpen = tau < T_AVC || tau >= T_AVO;
      const slOpen = tau >= T_SLO && tau < T_SLC;
      const valve = (x, y, name, open) => {
        Sim.text(ctx, name, x, y, { size: fs, bold: true, color: C.ink });
        Sim.rect(ctx, x, y + 10, 74, 22, { fill: open ? '#d3f9d8' : '#ffe3e3', stroke: open ? C.green : C.red, width: 1.5, r: 11 });
        Sim.text(ctx, open ? 'OPEN' : 'CLOSED', x + 37, y + 21, { size: 11.5, bold: true, color: open ? '#2b8a3e' : '#c92a2a', align: 'center' });
      };
      let py = P.y;
      if (L.wide) {
        valve(P.x, py, 'AV (bicuspid) valve', avOpen);
        valve(P.x, py + 50, 'Semilunar (aortic) valve', slOpen);
        py += 108;
      } else {
        valve(P.x, py, 'AV (bicuspid) valve', avOpen);
        valve(P.x + Math.min(190, P.w / 2), py, 'Semilunar valve', slOpen);
        py += 50;
      }
      const ph = phaseOf(tau);
      Sim.text(ctx, ph[0], P.x, py, { size: fs + 1, bold: true, color: C.navy });
      const lines = wrapText(ctx, ph[1], P.w, { size: fs });
      lines.forEach((ln, i) => Sim.text(ctx, ln, P.x, py + 18 + i * 15, { size: fs, color: C.ink }));
      py += 18 + lines.length * 15 + 8;
      if (L.wide || py < s.h - 20) {
        EVENTS.forEach(([lab, , txt], i) => {
          const yy = py + i * 16;
          if (yy > s.h - 8) return;
          Sim.text(ctx, lab, P.x + 6, yy, { size: 10.5, bold: true, color: C.navy, align: 'center' });
          Sim.text(ctx, txt, P.x + 16, yy, { size: 11, color: C.muted });
        });
      }
    },
    readout(s) {
      const W = warp(s.p.hr);
      const tau = W.tau(s.state.t);
      return [
        ['t =', s.state.t.toFixed(2) + ' s'],
        ['one beat lasts', W.T.toFixed(2) + ' s'],
        ['left atrium', LA(tau).toFixed(1) + ' kPa'],
        ['left ventricle', LV(tau).toFixed(1) + ' kPa', true],
        ['aorta', AO(tau).toFixed(1) + ' kPa'],
        ['ventricular diastole lasts', (W.T - (W.real(T_SLC) - W.real(T_AVC))).toFixed(2) + ' s']
      ];
    }
  });
  function setFromPointer(s, pt) {
    const L = cardiacLayout(s.w);
    const g = L.g;
    const bottom = s.p.ecg ? L.e.y + L.e.h : g.y + g.h;
    if (pt.x < g.x - 10 || pt.x > g.x + g.w + 10 || pt.y < g.y - 24 || pt.y > bottom + 10) return false;
    const T = 60 / s.p.hr;
    s.state.t = clamp(((pt.x - g.x) / g.w) * T, 0, T * 0.9999);
    return true;
  }
})();
