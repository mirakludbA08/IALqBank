/* Plant structure and function: interactive diagrams (biology notes 4a) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const G = 9.81;   // gravitational field strength / N kg⁻¹

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ======================================================================
     1. Core practical: tensile strength of plant fibres
     ====================================================================== */
  /* d = diameter / mm, sigma = simulated mean tensile strength / MPa.
     The sclerenchyma fibre bundles are far stronger per unit area than the
     celery strand, most of whose cross-section is thin-walled, unlignified tissue. */
  const FIBRES = {
    nettle: { name: 'Nettle fibre bundle', short: 'Nettle', d: 0.08, sigma: 500, col: '#8c6d31' },
    flax: { name: 'Flax fibre bundle', short: 'Flax', d: 0.12, sigma: 600, col: '#c99a2e' },
    celery: { name: 'Celery vascular strand', short: 'Celery', d: 0.50, sigma: 20, col: '#5c940d' }
  };
  const HANGER = 10;   // mass of the empty hanger / g
  const areaM2 = (d) => Math.PI * Math.pow((d / 2) * 1e-3, 2);
  const meanBreakG = (f) => (FIBRES[f].sigma * 1e6 * areaM2(FIBRES[f].d) / G) * 1000;

  function newSample(st, f) {
    const mean = meanBreakG(f);
    st.fibre = f;
    st.brk = mean * clamp(1 + 0.09 * gaussian(), 0.75, 1.25);
    st.load = HANGER;
    st.broken = false;
    st.fall = 0;
    st.cut = 0.3 + 0.4 * Math.random();
  }
  function meanFor(st, f) {
    const t = st.trials.filter((q) => q.f === f);
    if (!t.length) return null;
    return { n: t.length, m: t.reduce((a, q) => a + q.m, 0) / t.length };
  }

  Sim.create('#sim-bio-4a-tensile', {
    title: 'Breaking plant fibres',
    alt: 'A fibre hangs from a clamp with a mass hanger on its lower end. Masses are added until the fibre snaps, and each breaking mass is recorded in a results table.',
    height: (w) => (w >= 680 ? 390 : 710),
    controls: [
      { key: 'fibre', type: 'select', label: 'Fibre', value: 'nettle', options: [['nettle', 'Nettle fibre bundle (d = 0.08 mm)'], ['flax', 'Flax fibre bundle (d = 0.12 mm)'], ['celery', 'Celery vascular strand (d = 0.50 mm)']],
        onChange: (s, v) => newSample(s.state, v) },
      { key: 'step', type: 'select', label: 'Mass added each time', value: '10', options: [['10', '10 g'], ['50', '50 g']] },
      { type: 'button', label: 'Add mass', onClick: (s) => {
        const st = s.state;
        if (st.broken) return;
        st.load += Number(s.p.step);
        if (st.load >= st.brk) {
          st.broken = true;
          st.fall = 0;
          st.trials.push({ f: st.fibre, m: st.load, step: Number(s.p.step) });
          if (st.trials.length > 40) st.trials.shift();
        }
      } },
      { type: 'button', label: 'New fibre', onClick: (s) => newSample(s.state, s.p.fibre) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.trials = []; newSample(s.state, s.p.fibre); } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      s.state = { trials: [] };
      newSample(s.state, s.p.fibre || 'nettle');
    },
    update(s, dt) {
      const st = s.state;
      if (st.broken && st.fall < 1) st.fall = Math.min(1, st.fall + dt * 3.2);
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const F = FIBRES[st.fibre];
      const wide = w >= 680;
      const ap = wide ? { x: 0, y: 0, w: Math.min(300, w * 0.42), h } : { x: 0, y: 0, w, h: 360 };
      const cx = ap.x + ap.w * 0.56;
      const base = ap.y + ap.h - 22;

      // tray of sand under the masses
      Sim.rect(ctx, cx - 62, base - 26, 124, 26, { fill: '#f1e3b6', stroke: C.axis, width: 1.5, r: 3 });
      Sim.text(ctx, 'tray of sand', cx, base + 11, { size: 11, color: C.muted, align: 'center' });
      // clamp stand
      const rodX = ap.x + Math.max(26, ap.w * 0.14);
      Sim.rect(ctx, rodX - 22, base - 8, 70, 8, { fill: '#868e96' });
      Sim.line(ctx, rodX, base - 8, rodX, ap.y + 26, { color: '#495057', width: 6, cap: 'butt' });
      const topY = ap.y + 46;
      Sim.line(ctx, rodX, topY, cx + 10, topY, { color: '#495057', width: 6, cap: 'butt' });
      Sim.rect(ctx, cx - 12, topY - 10, 24, 20, { fill: '#adb5bd', stroke: '#495057', width: 1.5, r: 3 });

      // fibre and hanger
      const L0 = clamp(ap.h - 240, 60, 150);
      const ext = st.broken ? 0 : 10 * clamp((st.load - HANGER) / st.brk, 0, 1);
      const fibTop = topY + 10;
      const fibBot = fibTop + L0 + ext;
      const fw = Math.max(1.5, Math.min(5, F.d * 9));
      const stackH = Math.min(96, (st.load - HANGER) * 0.14);
      if (!st.broken) {
        Sim.line(ctx, cx, fibTop, cx, fibBot, { color: F.col, width: fw });
        drawHanger(ctx, cx, fibBot, stackH, st.load);
      } else {
        const cutY = fibTop + L0 * st.cut;
        Sim.line(ctx, cx, fibTop, cx + 2, cutY, { color: F.col, width: fw });
        // lower piece and hanger fall into the tray
        const restTop = (base - 26) - (18 + Math.max(26, stackH + 10) + 6);
        const y0 = fibBot;
        const dy = (restTop - y0) * st.fall * st.fall;
        const yH = y0 + dy;
        const Lp = (y0 - cutY - 6) * (1 - 0.8 * st.fall);
        ctx.save();
        ctx.strokeStyle = F.col;
        ctx.lineWidth = fw;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, yH);
        ctx.quadraticCurveTo(cx + 14 * st.fall, yH - Lp * 0.6, cx + 26 * st.fall, yH - Lp);
        ctx.stroke();
        ctx.restore();
        drawHanger(ctx, cx, yH, stackH, st.load);
        if (st.fall >= 1) Sim.text(ctx, 'Snapped at ' + st.load + ' g', cx, topY - 26, { size: 13, bold: true, color: C.red, align: 'center' });
      }
      if (!st.broken) Sim.text(ctx, 'Load: ' + st.load + ' g', cx, topY - 26, { size: 13, bold: true, color: C.navy, align: 'center' });

      // results table
      const tb = wide ? { x: ap.w + 24, y: 18, w: w - ap.w - 40 } : { x: 14, y: ap.h + 10, w: w - 28 };
      drawTable(ctx, tb, st);
    },
    readout(s) {
      const st = s.state;
      const F = FIBRES[st.fibre];
      const A = areaM2(F.d);
      const out = [
        ['Cross-sectional area =', Sim.fmt(A, 3) + ' m²'],
        ['Load =', st.load + ' g = ' + (st.load / 1000 * G).toFixed(2) + ' N']
      ];
      const m = meanFor(st, st.fibre);
      if (m) {
        const Fbr = m.m / 1000 * G;
        out.push(['Mean breaking mass (' + m.n + ' fibre' + (m.n > 1 ? 's' : '') + ') =', m.m.toFixed(0) + ' g']);
        out.push(['Tensile strength = F ÷ A =', (Fbr / A / 1e6).toFixed(0) + ' MPa', true]);
      } else out.push([F.short + ':', 'add masses until the fibre snaps']);
      return out;
    }
  });

  function drawHanger(ctx, x, y, stackH, load) {
    Sim.line(ctx, x, y, x, y + 10, { color: '#495057', width: 2 });
    ctx.save();
    ctx.strokeStyle = '#495057';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + 14, 4, -Math.PI / 2, Math.PI * 0.8);
    ctx.stroke();
    ctx.restore();
    const stemTop = y + 18;
    const stemBot = stemTop + Math.max(26, stackH + 10);
    Sim.line(ctx, x, stemTop, x, stemBot, { color: '#495057', width: 3 });
    Sim.rect(ctx, x - 22, stemBot, 44, 6, { fill: '#868e96', stroke: '#495057', width: 1, r: 2 });
    // slotted masses: one disc per 50 g, drawn from the base upwards
    const n = Math.floor((load - HANGER) / 50);
    const part = ((load - HANGER) % 50) / 50;
    const dh = n + (part > 0 ? 1 : 0) > 0 ? stackH / (n + (part > 0 ? part : 0)) : 0;
    let yy = stemBot;
    for (let i = 0; i < n; i++) {
      yy -= dh;
      Sim.rect(ctx, x - 18, yy, 36, dh - 1, { fill: i % 2 ? '#c0a060' : '#d4b373', stroke: '#8a6d3b', width: 1, r: 2 });
    }
    if (part > 0) {
      yy -= dh * part;
      Sim.rect(ctx, x - 18, yy, 36, Math.max(2, dh * part - 1), { fill: '#e6cc93', stroke: '#8a6d3b', width: 1, r: 1 });
    }
  }

  function drawTable(ctx, tb, st) {
    const rowH = 22;
    const cols = [0, 0.18, 0.5, 0.78].map((f) => tb.x + f * tb.w);
    Sim.text(ctx, 'Results', tb.x, tb.y + 4, { size: 14, bold: true, color: C.navy, baseline: 'top' });
    let y = tb.y + 30;
    Sim.rect(ctx, tb.x - 4, y - 4, tb.w + 8, rowH, { fill: '#edf2ff', r: 4 });
    ['Test', 'Fibre', tb.w > 380 ? 'Breaking mass / g' : 'Mass / g', 'Force / N'].forEach((t, i) => Sim.text(ctx, t, cols[i], y + 7, { size: 12, bold: true, color: C.ink }));
    y += rowH;
    const show = st.trials.slice(-8);
    const start = st.trials.length - show.length;
    if (!show.length) Sim.text(ctx, 'No fibres broken yet', tb.x, y + 10, { size: 12.5, italic: true, color: C.muted });
    show.forEach((q, i) => {
      Sim.text(ctx, String(start + i + 1), cols[0], y + 9, { size: 12.5 });
      Sim.text(ctx, FIBRES[q.f].short + (q.step === 50 ? ' (50 g steps)' : ''), cols[1], y + 9, { size: 12.5, color: FIBRES[q.f].col, bold: true });
      Sim.text(ctx, String(q.m), cols[2], y + 9, { size: 12.5 });
      Sim.text(ctx, (q.m / 1000 * G).toFixed(2), cols[3], y + 9, { size: 12.5 });
      y += rowH - 2;
    });
    y = Math.max(y, tb.y + 30 + rowH * 9) + 6;
    Sim.line(ctx, tb.x - 4, y, tb.x + tb.w + 4, y, { color: C.light, width: 1 });
    y += 12;
    Sim.text(ctx, 'Mean for each fibre', tb.x, y, { size: 12.5, bold: true, color: C.navy });
    y += 20;
    Object.keys(FIBRES).forEach((f) => {
      const m = meanFor(st, f);
      const F = FIBRES[f];
      let txt = F.short + ': ';
      if (m) {
        const sig = (m.m / 1000 * G) / areaM2(F.d) / 1e6;
        txt += m.m.toFixed(0) + ' g (n = ' + m.n + ')  →  ' + sig.toFixed(0) + ' MPa';
      } else txt += 'no data';
      Sim.text(ctx, txt, tb.x, y, { size: 12.5, color: m ? F.col : C.muted, bold: !!m });
      y += 19;
    });
  }

  /* ======================================================================
     2. Core practical: antimicrobial properties of plant extracts
     ====================================================================== */
  const DISC = 6;   // paper disc diameter / mm
  const EXTRACTS = [
    { key: 'G', name: 'Garlic', d: 19, col: '#b08900' },
    { key: 'Gi', name: 'Ginger', d: 10, col: '#d9480f' },
    { key: 'M', name: 'Mint', d: 13, col: '#2f9e44' },
    { key: 'C', name: 'Ethanol only (control)', d: DISC, col: '#495057' }
  ];
  const lawnCover = (t) => (t <= 0 ? 0 : 1 / (1 + Math.exp(-(t - 16) / 3.5)));

  function newPlate(st) {
    st.zones = EXTRACTS.map((e) => {
      if (e.d <= DISC) return { dx: DISC, dy: DISC };
      const m = e.d * clamp(1 + 0.07 * gaussian(), 0.85, 1.15);
      const ecc = clamp(1 + 0.04 * gaussian(), 0.93, 1.07);
      return { dx: Math.max(DISC, m * ecc), dy: Math.max(DISC, m / ecc) };
    });
    st.dots = [];
    for (let i = 0; i < 420; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 43;
      st.dots.push([Math.cos(a) * r, Math.sin(a) * r, 0.4 + Math.random() * 0.6]);
    }
  }
  const round1 = (v) => Math.round(v * 2) / 2;   // a ruler reads to the nearest 0.5 mm

  Sim.create('#sim-bio-4a-zones', {
    title: 'Clear zones around plant extracts',
    alt: 'An agar plate seen from above with four paper discs. As incubation time increases a cloudy lawn of bacteria grows, leaving clear zones around discs soaked in garlic, ginger and mint extracts but not around the control disc.',
    height: (w) => (w >= 640 ? 370 : Math.min(w, 340) + 240),
    controls: [
      { key: 't', label: 'Incubation time at 25 °C', min: 0, max: 48, step: 1, value: 0, unit: 'h', format: (v) => v.toFixed(0) },
      { key: 'measure', type: 'check', label: 'Show the measured diameters', value: false },
      { type: 'button', label: 'Pour a new plate', ghost: true, onClick: (s) => { newPlate(s.state); s.set('t', 0); } }
    ],
    init(s) { s.state = {}; newPlate(s.state); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const box = wide ? { x: 0, y: 0, w: Math.min(h, w * 0.52), h } : { x: 0, y: 0, w, h: Math.min(w, 340) };
      Sim.rect(ctx, box.x, box.y, box.w, box.h, { fill: '#343a40' });
      const cx = box.x + box.w / 2, cy = box.y + box.h / 2 - 9;
      const R = Math.min(box.w, box.h) / 2 - 26;
      const k = R / 45;   // px per mm on a 90 mm plate
      Sim.circle(ctx, cx, cy, R + 4, { fill: '#5c5f66', stroke: '#ced4da', width: 2 });
      Sim.circle(ctx, cx, cy, R, { fill: '#6b5f45' });
      const cov = lawnCover(p.t);
      // bacterial lawn, drawn as a cloudy layer
      if (cov > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, R - 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = 0.85 * cov;
        ctx.fillStyle = '#efe4c8';
        ctx.fillRect(cx - R, cy - R, 2 * R, 2 * R);
        ctx.globalAlpha = 0.5 * cov;
        st.dots.forEach((d) => Sim.circle(ctx, cx + d[0] * k, cy + d[1] * k, 1.6 * d[2], { fill: '#fffaf0' }));
        ctx.restore();
      }
      const pos = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map((q) => [cx + q[0] * 20 * k, cy + q[1] * 20 * k]);
      EXTRACTS.forEach((e, i) => {
        const z = st.zones[i];
        const [x, y] = pos[i];
        if (cov > 0.02 && z.dx > DISC) {
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(x, y, (z.dx / 2) * k, (z.dy / 2) * k, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#6b5f45';
          ctx.fill();
          ctx.restore();
        }
        Sim.circle(ctx, x, y, (DISC / 2) * k, { fill: '#ffffff', stroke: '#adb5bd', width: 1 });
        Sim.text(ctx, e.key, x, y + 0.5, { size: Math.max(9, 2.6 * k), bold: true, color: e.col, align: 'center' });
        if (p.measure && cov > 0.5) {
          const hx = (z.dx / 2) * k;
          Sim.line(ctx, x - hx, y, x + hx, y, { color: '#ffd43b', width: 1.5 });
          Sim.line(ctx, x - hx, y - 4, x - hx, y + 4, { color: '#ffd43b', width: 1.5 });
          Sim.line(ctx, x + hx, y - 4, x + hx, y + 4, { color: '#ffd43b', width: 1.5 });
        }
      });
      Sim.text(ctx, 'Plate 90 mm across, viewed from below', cx, box.y + box.h - 5, { size: 11, color: '#ced4da', align: 'center', baseline: 'bottom' });

      // legend and measurements
      const lg = wide ? { x: box.w + 20, y: 20, w: w - box.w - 34 } : { x: 14, y: box.h + 14, w: w - 28 };
      Sim.text(ctx, 'Disc soaked in', lg.x, lg.y, { size: 13.5, bold: true, color: C.navy, baseline: 'top' });
      let y = lg.y + 30;
      EXTRACTS.forEach((e, i) => {
        Sim.circle(ctx, lg.x + 9, y, 9, { fill: '#fff', stroke: '#adb5bd' });
        Sim.text(ctx, e.key, lg.x + 9, y + 0.5, { size: 9.5, bold: true, color: e.col, align: 'center' });
        Sim.text(ctx, e.name, lg.x + 26, y, { size: 13, color: C.ink });
        if (cov > 0.5) {
          const z = st.zones[i];
          const dm = (round1(z.dx) + round1(z.dy)) / 2;
          const txt = z.dx <= DISC ? 'no clear zone' : round1(z.dx).toFixed(1) + ' and ' + round1(z.dy).toFixed(1) + ' mm → mean ' + dm.toFixed(1) + ' mm';
          Sim.text(ctx, p.measure ? txt : 'measure me', lg.x + 26, y + 18, { size: 12, color: p.measure ? C.muted : '#adb5bd', italic: !p.measure });
        }
        y += 46;
      });
      let note;
      if (cov < 0.1) note = 'No visible growth yet: keep incubating.';
      else if (cov < 0.7) note = 'Lawn still thin: the zone edges are hard to see.';
      else note = 'Lawn fully grown: measure each zone across two diameters at right angles.';
      wrapText(ctx, note, lg.x, y + 2, lg.w, 12.5, cov < 0.7 ? C.orange : C.green);
    },
    readout(s) {
      const st = s.state;
      if (lawnCover(s.p.t) < 0.5) return [['Incubation:', s.p.t.toFixed(0) + ' h'], ['Zones:', 'not yet measurable']];
      return EXTRACTS.slice(0, 3).map((e, i) => {
        const z = st.zones[i];
        const dm = (round1(z.dx) + round1(z.dy)) / 2;
        const A = Math.PI * Math.pow(dm / 2, 2);
        return [e.name + ': area = πr² =', A.toFixed(0) + ' mm²', i === 0];
      }).concat([['Control:', 'no zone, so ethanol alone did not kill the bacteria']]);
    }
  });

  function wrapText(ctx, str, x, y, maxW, size, color) {
    const words = str.split(' ');
    let line = '';
    words.forEach((wd) => {
      const test = line ? line + ' ' + wd : wd;
      if (Sim.measure(ctx, test, { size }) > maxW && line) {
        Sim.text(ctx, line, x, y, { size, color });
        y += size + 5;
        line = wd;
      } else line = test;
    });
    if (line) Sim.text(ctx, line, x, y, { size, color });
  }
})();
