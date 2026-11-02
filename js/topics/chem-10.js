/* Chemistry 10: Halogenoalkanes, alcohols and spectra — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const RED = '#e03131';
  const DELTA = '#1c7ed6';

  /* ---------- small drawing helpers (design coordinates) ---------- */
  function txt(ctx, s, x, y, o) { Sim.text(ctx, s, x, y, Object.assign({ align: 'center', size: 17 }, o || {})); }
  function bond(ctx, x1, y1, x2, y2, dashed) {
    Sim.line(ctx, x1, y1, x2, y2, { color: '#343a40', width: 2, dash: dashed ? [4, 3] : null });
  }
  function dots(ctx, pts) { pts.forEach((p) => Sim.circle(ctx, p[0], p[1], 2.3, { fill: '#212529' })); }
  /* Curly arrow: quadratic curve from (x1,y1) to (x2,y2) through control point (cx,cy). */
  function curly(ctx, x1, y1, cx, cy, x2, y2, color) {
    color = color || RED;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
    const a = Math.atan2(y2 - cy, x2 - cx), L = 10;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - L * Math.cos(a - 0.42), y2 - L * Math.sin(a - 0.42));
    ctx.lineTo(x2 - L * Math.cos(a + 0.42), y2 - L * Math.sin(a + 0.42));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function bracket(ctx, x, y1, y2, right) {
    const d = right ? -9 : 9;
    Sim.polyline(ctx, [[x + d, y1], [x, y1], [x, y2], [x + d, y2]], { color: '#343a40', width: 1.6 });
  }

  /* ======================================================================
     1. SN2 versus SN1, step by step, with energy profiles and rates
     ====================================================================== */
  const SN = {
    p: {
      mech: 'SN2', sub: 'bromoethane, CH₃CH₂Br (primary)', rate: 'rate = k[CH₃CH₂Br][OH⁻]',
      pts: [[0, 0], [0.08, 0], [0.5, 1], [0.92, -0.45], [1, -0.45]],
      marks: [0.05, 0.3, 0.5, 0.95],
      steps: [
        'Reactants. The C–Br bond is polar, so the carbon is δ+. The hydroxide ion has lone pairs.',
        'One step: the lone pair on OH⁻ attacks the δ+ carbon from the side opposite the Br, and at the same time the C–Br bond breaks.',
        'Transition state: the O–C bond is half made and the C–Br bond half broken. It sits at the top of the energy barrier and cannot be isolated.',
        'Products: ethanol and a bromide ion. The single step contains two species, CH₃CH₂Br and OH⁻, so this is SN2.'
      ]
    },
    t: {
      mech: 'SN1', sub: '2-bromo-2-methylpropane, (CH₃)₃CBr (tertiary)', rate: 'rate = k[(CH₃)₃CBr]',
      pts: [[0, 0], [0.08, 0], [0.3, 1], [0.5, 0.55], [0.68, 0.72], [0.92, -0.45], [1, -0.45]],
      marks: [0.05, 0.3, 0.5, 0.95],
      steps: [
        'Reactants. The C–Br bond is polar, so the carbon is δ+. Three methyl groups crowd the carbon, blocking attack from the far side.',
        'Step 1 (slow): the C–Br bond breaks heterolytically on its own. Both electrons go to bromine. This is the highest barrier, so it controls the rate.',
        'A tertiary carbocation intermediate forms, stabilised by three electron-releasing methyl groups. Step 2 (fast): the lone pair on OH⁻ attacks the positive carbon.',
        'Products: 2-methylpropan-2-ol and a bromide ion. Only one species, (CH₃)₃CBr, is in the slow step, so this is SN1.'
      ]
    }
  };
  function profileE(pts, x) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      if (x <= x1 || i === pts.length - 2) {
        const t = clamp((x - x0) / (x1 - x0), 0, 1);
        return y0 + (y1 - y0) * (1 - Math.cos(Math.PI * t)) / 2;
      }
    }
    return 0;
  }
  function deltas(ctx, cx) {
    txt(ctx, 'δ+', cx + 19, 118, { size: 13, color: DELTA, bold: true });
    txt(ctx, 'δ−', cx + 62, 120, { size: 13, color: DELTA, bold: true });
  }
  /* An ion label: the symbol centred at x with its charge raised at the top right. */
  function ion(ctx, base, charge, x, y, o) {
    o = o || {};
    const size = o.size || 17;
    const bw = Sim.measure(ctx, base, { size, bold: o.bold });
    txt(ctx, base, x, y, { size, bold: o.bold });
    Sim.text(ctx, charge, x + bw / 2 + 1, y - size * 0.42, { size: size * 0.72, color: o.chargeColor || '#212529' });
  }
  function plusBromide(ctx, x, y) {
    txt(ctx, '+', x - 34, y);
    ion(ctx, 'Br', '−', x, y);
  }
  function snLayout(w) {
    const wide = w >= 700;
    const sc = Math.min(1.3, (w - 20) / 430);
    const mh = Math.round(200 * sc + 20);
    const top = mh + 24;
    return { wide, sc, mh, top, h: wide ? top + 300 : top + 14 + 230 + 46 + 185 };
  }
  function hydroxide(ctx, x, y, side) {
    // "HO" with a lone pair on oxygen; side: 'up' puts the pair above O, 'left' to its left
    if (side === 'left') {
      txt(ctx, 'OH', x, y);
      txt(ctx, '−', x + 22, y - 10, { size: 15 });
      dots(ctx, [[x - 16, y - 4], [x - 16, y + 4]]);
    } else {
      txt(ctx, 'HO', x, y);
      txt(ctx, '−', x + 22, y - 10, { size: 15 });
      dots(ctx, [[x + 3, y - 15], [x + 10, y - 15]]);
    }
  }
  function drawSN2(ctx, step) {
    const cx = 200;
    if (step <= 1) {
      hydroxide(ctx, 78, 152, 'up');
      txt(ctx, 'H₃C', cx - 38, 100);
      bond(ctx, cx - 22, 100, cx - 11, 100);
      txt(ctx, 'C', cx, 100, { bold: true });
      bond(ctx, cx, 88, cx, 68); txt(ctx, 'H', cx, 58);
      bond(ctx, cx, 112, cx, 132); txt(ctx, 'H', cx, 142);
      bond(ctx, cx + 11, 100, cx + 43, 100); txt(ctx, 'Br', cx + 58, 100, { bold: true });
      deltas(ctx, cx);
      if (step === 1) {
        curly(ctx, 85, 132, 104, 100, 188, 108);
        curly(ctx, cx + 27, 95, cx + 38, 66, cx + 54, 86);
      }
    } else if (step === 2) {
      const x = 320;
      bracket(ctx, 236, 38, 162, false);
      bracket(ctx, 406, 38, 162, true);
      txt(ctx, '−', 414, 42, { size: 16 });
      txt(ctx, 'HO', 258, 100);
      bond(ctx, 276, 100, 306, 100, true);
      txt(ctx, 'C', x, 100, { bold: true });
      bond(ctx, x - 6, 89, x - 14, 72); txt(ctx, 'H', x - 18, 62);
      bond(ctx, x + 6, 89, x + 14, 72); txt(ctx, 'H', x + 18, 62);
      bond(ctx, x, 112, x, 128); txt(ctx, 'CH₃', x, 141);
      bond(ctx, x + 11, 100, x + 41, 100, true);
      txt(ctx, 'Br', x + 58, 100);
      txt(ctx, 'transition state', x, 182, { size: 13, color: C.muted });
    } else {
      txt(ctx, 'H₃C', cx - 38, 100);
      bond(ctx, cx - 22, 100, cx - 11, 100);
      txt(ctx, 'C', cx, 100, { bold: true });
      bond(ctx, cx, 88, cx, 68); txt(ctx, 'H', cx, 58);
      bond(ctx, cx, 112, cx, 132); txt(ctx, 'H', cx, 142);
      bond(ctx, cx + 11, 100, cx + 35, 100); txt(ctx, 'OH', cx + 52, 100);
      plusBromide(ctx, cx + 160, 100);
      txt(ctx, 'ethanol', cx + 10, 182, { size: 13, color: C.muted });
    }
  }
  function methylFrame(ctx, cx, plus) {
    txt(ctx, 'H₃C', cx - 38, 100);
    bond(ctx, cx - 22, 100, cx - 11, 100);
    txt(ctx, 'C', cx, 100, { bold: true });
    bond(ctx, cx, 88, cx, 70); txt(ctx, 'CH₃', cx, 58);
    bond(ctx, cx, 112, cx, 130); txt(ctx, 'CH₃', cx, 142);
    if (plus) txt(ctx, '+', cx + 13, 86, { size: 18, color: RED, bold: true });
  }
  function drawSN1(ctx, step) {
    const cx = 200;
    if (step <= 1) {
      methylFrame(ctx, cx, false);
      bond(ctx, cx + 11, 100, cx + 43, 100); txt(ctx, 'Br', cx + 58, 100, { bold: true });
      deltas(ctx, cx);
      hydroxide(ctx, 440, 100, 'left');
      txt(ctx, 'waits: not involved yet', 440, 132, { size: 12, color: C.muted });
      if (step === 1) curly(ctx, cx + 27, 95, cx + 38, 66, cx + 54, 86);
    } else if (step === 2) {
      methylFrame(ctx, cx, true);
      hydroxide(ctx, 300, 100, 'left');
      curly(ctx, 282, 95, 252, 64, cx + 16, 94);
      ion(ctx, 'Br', '−', 300, 150);
      txt(ctx, 'tertiary carbocation', cx, 182, { size: 13, color: C.muted });
    } else {
      methylFrame(ctx, cx, false);
      bond(ctx, cx + 11, 100, cx + 35, 100); txt(ctx, 'OH', cx + 52, 100);
      plusBromide(ctx, cx + 160, 100);
      txt(ctx, '2-methylpropan-2-ol', cx, 182, { size: 13, color: C.muted });
    }
  }

  Sim.create('#sim-chem-10-sn', {
    title: 'Nucleophilic substitution: SN2 versus SN1',
    height: (w) => snLayout(w).h,
    controls: [
      { key: 'sub', type: 'select', label: 'Halogenoalkane', options: [['p', 'Bromoethane (primary)'], ['t', '2-Bromo-2-methylpropane (tertiary)']], onChange: (s) => { s.state.step = 0; } },
      { key: 'rx', label: '[halogenoalkane]', min: 0.1, max: 1, step: 0.1, value: 0.1, unit: 'mol dm⁻³', format: (v) => v.toFixed(1) },
      { key: 'oh', label: '[OH⁻]', min: 0.1, max: 1, step: 0.1, value: 0.1, unit: 'mol dm⁻³', format: (v) => v.toFixed(1) },
      { type: 'button', label: '◀ Back', ghost: true, onClick: (s) => { s.state.step = Math.max(0, s.state.step - 1); } },
      { type: 'button', label: 'Next step ▶', onClick: (s) => { s.state.step = Math.min(3, s.state.step + 1); } }
    ],
    init(s) { s.state = { step: 0 }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const D = SN[p.sub];
      const step = s.state.step;
      const L = snLayout(w), wide = L.wide, mh = L.mh, sc = L.sc;
      /* mechanism panel */
      Sim.rect(ctx, 8, 8, w - 16, mh, { fill: '#f8f9fb', r: 10 });
      Sim.text(ctx, 'Step ' + (step + 1) + ' of 4', 22, 26, { size: 13, bold: true, color: C.navy });
      Sim.text(ctx, D.mech + ' mechanism', w - 22, 26, { size: 13, bold: true, color: D.mech === 'SN2' ? C.blue : C.purple, align: 'right' });
      ctx.save();
      ctx.translate(w / 2 - 265 * sc, 8 + mh / 2 - 108 * sc);
      ctx.scale(sc, sc);
      if (D.mech === 'SN2') drawSN2(ctx, step); else drawSN1(ctx, step);
      ctx.restore();

      /* energy profile */
      const top = L.top;
      let ex, ey, ew, eh, rx, ry, rw, rh;
      if (wide) {
        ex = 50; ey = top + 14; ew = w * 0.58 - 60; eh = h - top - 50;
        rx = w * 0.58 + 16; ry = top + 14; rw = w - rx - 18; rh = h - top - 50;
      } else {
        ex = 44; ey = top + 14; ew = w - 64; eh = 230;
        rx = 18; ry = ey + eh + 46; rw = w - 36; rh = h - ry - 16;
      }
      const g = Sim.graph(ctx, { x: ex, y: ey, w: ew, h: eh, xmin: 0, xmax: 1, ymin: -0.7, ymax: 1.25, ticks: false, grid: false });
      Sim.line(ctx, ex, ey + eh, ex + ew, ey + eh, { color: C.axis });
      Sim.arrow(ctx, ex, ey + eh, ex, ey - 6, { color: C.axis, width: 1.5, head: 8 });
      Sim.text(ctx, 'energy', ex - 8, ey + eh / 2, { size: 12, color: C.ink, bold: true, rotate: -Math.PI / 2, align: 'center' });
      Sim.text(ctx, 'progress of reaction →', ex + ew, ey + eh + 14, { size: 12, color: C.ink, bold: true, align: 'right' });
      g.plot((x) => profileE(D.pts, x), { color: C.navy, width: 2.5 });
      g.hline(0, { color: '#adb5bd', dash: [4, 4], width: 1 });
      if (D.mech === 'SN2') {
        g.label(0.5, 1.12, 'transition state', { size: 12, color: C.muted, align: 'center' });
      } else {
        g.label(0.3, 1.12, 'slow step', { size: 12, color: C.muted, align: 'center' });
        g.label(0.5, 0.38, 'carbocation', { size: 12, color: C.muted, align: 'center' });
        g.label(0.72, 0.88, 'fast', { size: 12, color: C.muted, align: 'center' });
      }
      const pk = D.mech === 'SN2' ? 0.5 : 0.3;
      Sim.arrow(ctx, g.px(pk), g.py(0), g.px(pk), g.py(0.97), { color: C.orange, width: 1.6, head: 7 });
      Sim.text(ctx, 'Ea', g.px(pk) - 6, g.py(0.45), { size: 13, bold: true, color: C.orange, align: 'right' });
      g.label(0.02, -0.12, 'reactants', { size: 11.5, color: C.muted });
      g.label(0.99, -0.58, 'products', { size: 11.5, color: C.muted, align: 'right' });
      const mx = D.marks[step];
      g.dot(mx, profileE(D.pts, mx), { color: RED, r: 7 });

      /* rate panel */
      Sim.rect(ctx, rx, ry, rw, rh, { fill: '#f8f9fb', r: 10 });
      const rel = D.mech === 'SN2' ? (p.rx / 0.1) * (p.oh / 0.1) : p.rx / 0.1;
      const max = D.mech === 'SN2' ? 100 : 10;
      Sim.text(ctx, D.rate, rx + 14, ry + 22, { size: 14, bold: true, color: C.navy });
      Sim.text(ctx, 'Initial rate compared with', rx + 14, ry + 48, { size: 12.5, color: C.muted });
      Sim.text(ctx, 'both concentrations at 0.1 mol dm⁻³:', rx + 14, ry + 66, { size: 12.5, color: C.muted });
      const by = ry + 84, bw = rw - 28, bh = 26;
      Sim.rect(ctx, rx + 14, by, bw, bh, { fill: '#fff', stroke: '#ced4da', r: 6 });
      Sim.rect(ctx, rx + 14, by, Math.max(3, bw * rel / max), bh, { fill: D.mech === 'SN2' ? C.blue : C.purple, r: 6 });
      Sim.text(ctx, '× ' + Sim.fmt(rel, 3), rx + 22, by + bh / 2, { size: 13, bold: true, color: rel / max > 0.25 ? '#fff' : C.ink });
      Sim.text(ctx, 'scale: 0 to ×' + max, rx + 14 + bw, by + bh + 12, { size: 11, color: C.muted, align: 'right' });
      const why = D.mech === 'SN2'
        ? ['OH⁻ is in the one and only step,', 'so changing [OH⁻] changes the rate.']
        : ['OH⁻ only reacts after the slow step,', 'so changing [OH⁻] has no effect.'];
      Sim.text(ctx, why[0], rx + 14, by + bh + 34, { size: 12.5, color: C.ink });
      Sim.text(ctx, why[1], rx + 14, by + bh + 52, { size: 12.5, color: C.ink });
    },
    readout: (s) => {
      const D = SN[s.p.sub];
      return '<span class="ro">' + D.steps[s.state.step] + '</span>';
    }
  });

  /* ======================================================================
     2. Mass spectra of isomers: click a peak to identify the ion
     ====================================================================== */
  const MS = {
    propanal: { name: 'propanal', f: 'CH₃CH₂CHO', M: 58, peaks: [
      [29, 100, '[CHO]⁺ or [CH₃CH₂]⁺', 'The C–C bond next to C=O breaks: [CH₃CH₂CHO]⁺• → [CHO]⁺ + •CH₂CH₃, or → [CH₃CH₂]⁺ + •CHO'],
      [57, 15, '[CH₃CH₂CO]⁺', 'An H atom is lost from the CHO group: [CH₃CH₂CHO]⁺• → [CH₃CH₂CO]⁺ + H•'],
      [58, 70, '[CH₃CH₂CHO]⁺•', 'Molecular ion: no bond broken, so m/z = Mr = 58']] },
    propanone: { name: 'propanone', f: 'CH₃COCH₃', M: 58, peaks: [
      [15, 25, '[CH₃]⁺', '[CH₃COCH₃]⁺• → [CH₃]⁺ + •COCH₃'],
      [43, 100, '[CH₃CO]⁺', 'A C–C bond next to C=O breaks: [CH₃COCH₃]⁺• → [CH₃CO]⁺ + •CH₃. The acylium ion is stable, so this is the base peak'],
      [58, 65, '[CH₃COCH₃]⁺•', 'Molecular ion: m/z = Mr = 58. No peak at 29: propanone has no C₂H₅ or CHO group']] },
    p1ol: { name: 'propan-1-ol', f: 'CH₃CH₂CH₂OH', M: 60, peaks: [
      [29, 15, '[CH₃CH₂]⁺', '[CH₃CH₂CH₂OH]⁺• → [CH₃CH₂]⁺ + •CH₂OH'],
      [31, 100, '[CH₂OH]⁺', 'The C–C bond next to the C–O breaks: [CH₃CH₂CH₂OH]⁺• → [CH₂OH]⁺ + •CH₂CH₃. Typical of a primary alcohol'],
      [59, 10, '[CH₃CH₂CHOH]⁺', 'An H atom is lost: [CH₃CH₂CH₂OH]⁺• → [CH₃CH₂CHOH]⁺ + H•'],
      [60, 8, '[CH₃CH₂CH₂OH]⁺•', 'Molecular ion: m/z = Mr = 60']] },
    p2ol: { name: 'propan-2-ol', f: 'CH₃CH(OH)CH₃', M: 60, peaks: [
      [43, 15, '[CH₃CHCH₃]⁺', 'The C–O bond breaks: [CH₃CH(OH)CH₃]⁺• → [CH₃CHCH₃]⁺ + •OH'],
      [45, 100, '[CH₃CHOH]⁺', 'A C–C bond next to the C–O breaks: [CH₃CH(OH)CH₃]⁺• → [CH₃CHOH]⁺ + •CH₃. Propan-1-ol cannot give this ion'],
      [59, 4, '[CH₃C(OH)CH₃]⁺', 'An H atom is lost: [CH₃CH(OH)CH₃]⁺• → [CH₃C(OH)CH₃]⁺ + H•'],
      [60, 1, '[CH₃CH(OH)CH₃]⁺•', 'Molecular ion: m/z = Mr = 60. Very small, because this ion fragments so easily']] },
    butane: { name: 'butane', f: 'CH₃CH₂CH₂CH₃', M: 58, peaks: [
      [15, 6, '[CH₃]⁺', '[CH₃CH₂CH₂CH₃]⁺• → [CH₃]⁺ + •CH₂CH₂CH₃'],
      [29, 45, '[CH₃CH₂]⁺', 'The middle C–C bond breaks: [CH₃CH₂CH₂CH₃]⁺• → [CH₃CH₂]⁺ + •CH₂CH₃'],
      [43, 100, '[CH₃CH₂CH₂]⁺', 'An end C–C bond breaks: [CH₃CH₂CH₂CH₃]⁺• → [CH₃CH₂CH₂]⁺ + •CH₃'],
      [58, 12, '[C₄H₁₀]⁺•', 'Molecular ion: m/z = Mr = 58']] },
    mprop: { name: 'methylpropane', f: '(CH₃)₃CH', M: 58, peaks: [
      [15, 6, '[CH₃]⁺', '[(CH₃)₃CH]⁺• → [CH₃]⁺ + •CH(CH₃)₂'],
      [43, 100, '[(CH₃)₂CH]⁺', 'A C–C bond breaks: [(CH₃)₃CH]⁺• → [(CH₃)₂CH]⁺ + •CH₃. Every C–C bond gives this split, so the peak is huge. No C–C bond can break to give an ethyl ion, so there is almost nothing at 29'],
      [58, 3, '[C₄H₁₀]⁺•', 'Molecular ion: m/z = Mr = 58']] },
    pen2: { name: 'pentan-2-one', f: 'CH₃COCH₂CH₂CH₃', M: 86, peaks: [
      [43, 100, '[CH₃CO]⁺', '[CH₃COCH₂CH₂CH₃]⁺• → [CH₃CO]⁺ + •CH₂CH₂CH₃'],
      [71, 8, '[CH₃CH₂CH₂CO]⁺', '[CH₃COCH₂CH₂CH₃]⁺• → [CH₃CH₂CH₂CO]⁺ + •CH₃'],
      [86, 14, '[C₅H₁₀O]⁺•', 'Molecular ion: m/z = Mr = 86']] },
    pen3: { name: 'pentan-3-one', f: 'CH₃CH₂COCH₂CH₃', M: 86, peaks: [
      [29, 65, '[CH₃CH₂]⁺', '[CH₃CH₂COCH₂CH₃]⁺• → [CH₃CH₂]⁺ + •COCH₂CH₃'],
      [57, 100, '[CH₃CH₂CO]⁺', '[CH₃CH₂COCH₂CH₃]⁺• → [CH₃CH₂CO]⁺ + •CH₂CH₃. No peak at 43: there is no CH₃CO group'],
      [86, 20, '[C₅H₁₀O]⁺•', 'Molecular ion: m/z = Mr = 86']] }
  };
  const MS_PAIRS = { carbonyl: ['propanal', 'propanone'], alcohol: ['p1ol', 'p2ol'], ketone: ['pen2', 'pen3'], alkane: ['butane', 'mprop'] };

  function msLayout(s) {
    const { w, h } = s;
    const pair = MS_PAIRS[s.p.pair];
    const xmax = Math.ceil((Math.max(MS[pair[0]].M, MS[pair[1]].M) + 10) / 10) * 10;
    const left = 52, gw = w - left - 22;
    const gh = (h - 40 - 3 * 34) / 2;
    return pair.map((k, i) => ({ key: k, g: Sim.graph(s.ctx, { x: left, y: 40 + i * (gh + 52), w: gw, h: gh, xmin: 0, xmax, ymin: 0, ymax: 112, xstep: 10, ystep: 20, tickSize: 10.5 }) }));
  }
  function msHit(s, pt) {
    const L = msLayout(s);
    let best = null, bd = 1e9;
    L.forEach((o, i) => {
      if (pt.y < o.g.y - 10 || pt.y > o.g.y + o.g.h + 6) return;
      MS[o.key].peaks.forEach((pk) => {
        const d = Math.abs(o.g.px(pk[0]) - pt.x);
        if (d < 9 && d < bd) { bd = d; best = { i, mz: pk[0] }; }
      });
    });
    return best;
  }

  Sim.create('#sim-chem-10-ms', {
    title: 'Mass spectra of isomers',
    height: (w) => (w >= 600 ? 420 : 460),
    controls: [
      { key: 'pair', type: 'select', label: 'Isomers', options: [['carbonyl', 'propanal and propanone (C₃H₆O)'], ['alcohol', 'propan-1-ol and propan-2-ol (C₃H₈O)'], ['ketone', 'pentan-2-one and pentan-3-one (C₅H₁₀O)'], ['alkane', 'butane and methylpropane (C₄H₁₀)']], onChange: (s) => { s.state.sel = null; } },
      { key: 'labels', type: 'check', label: 'Label every peak', value: false }
    ],
    init(s) { s.state = { sel: null, hover: null }; },
    pointer: {
      down(s, pt) { const hit = msHit(s, pt); s.state.sel = hit; },
      move(s, pt) { s.state.hover = msHit(s, pt); },
      leave(s) { s.state.hover = null; }
    },
    draw(s) {
      const { ctx, p } = s;
      const L = msLayout(s);
      L.forEach((o, i) => {
        const D = MS[o.key];
        o.g.axes();
        Sim.text(ctx, D.name + '  ' + D.f + '   (Mᵣ = ' + D.M + ')', o.g.x, o.g.y - 14, { size: 13.5, bold: true, color: C.navy });
        Sim.text(ctx, 'abundance / %', 13, o.g.y + o.g.h / 2, { size: 11, color: C.muted, align: 'center', rotate: -Math.PI / 2 });
        Sim.text(ctx, 'm/z', o.g.x + o.g.w, o.g.y + o.g.h + 24, { size: 11.5, color: C.ink, bold: true, align: 'right' });
        D.peaks.forEach((pk) => {
          const sel = s.state.sel && s.state.sel.i === i && s.state.sel.mz === pk[0];
          const hov = s.state.hover && s.state.hover.i === i && s.state.hover.mz === pk[0];
          const X = o.g.px(pk[0]);
          const col = sel ? RED : hov ? C.orange : (pk[0] === D.M ? C.purple : C.blue);
          Sim.line(ctx, X, o.g.py(0), X, o.g.py(Math.max(pk[1], 1.2)), { color: col, width: sel || hov ? 5 : 3.5, cap: 'butt' });
          Sim.text(ctx, String(pk[0]), X, o.g.py(Math.max(pk[1], 1.2)) - 8, { size: 11.5, bold: true, color: col, align: 'center' });
          if (p.labels || sel) {
            const right = X > o.g.x + o.g.w * 0.68;
            Sim.text(ctx, pk[2], X + (right ? -6 : 6), o.g.py(Math.max(pk[1], 1.2)) + 10, { size: 11.5, color: col, bold: true, bg: 'rgba(255,255,255,0.85)', pad: 2, align: right ? 'right' : 'left' });
          }
        });
      });
      if (!s.state.sel) Sim.text(ctx, 'Click a peak', s.w - 24, 20, { size: 12, color: C.muted, align: 'right' });
    },
    readout: (s) => {
      const sel = s.state.sel;
      if (!sel) return [['Tip', 'the purple line in each spectrum is the molecular ion peak; click any line for its ion']];
      const key = MS_PAIRS[s.p.pair][sel.i];
      const pk = MS[key].peaks.find((q) => q[0] === sel.mz);
      if (!pk) return '';
      return [['m/z ' + pk[0] + ' in ' + MS[key].name + ':', pk[2], true], ['', pk[3]]];
    }
  });

  /* ======================================================================
     3. Infrared spectra: identify functional groups from absorptions
     ====================================================================== */
  const BOND = {
    OHa: 'O–H in an alcohol: 3200–3600 cm⁻¹, broad because of hydrogen bonding',
    OHc: 'O–H in a carboxylic acid: 2500–3300 cm⁻¹, very broad',
    NH: 'N–H in an amine: 3300–3500 cm⁻¹ (a primary amine shows two peaks)',
    NHb: 'N–H bending in an amine: about 1600 cm⁻¹',
    CH: 'C–H: 2850–3100 cm⁻¹, found in almost every organic compound',
    CHe: 'C–H on a C=C carbon: just above 3000 cm⁻¹',
    CHO: 'C–H of the aldehyde CHO group: two weaker peaks near 2720 and 2820 cm⁻¹',
    CN: 'C≡N in a nitrile: 2200–2260 cm⁻¹',
    CO: 'C=O in an aldehyde, ketone, acid or ester: 1680–1750 cm⁻¹, strong',
    CC: 'C=C in an alkene: 1620–1680 cm⁻¹',
    CO1: 'C–O: 1000–1300 cm⁻¹ (inside the fingerprint region)',
    CBr: 'C–Br: about 500–650 cm⁻¹ (deep in the fingerprint region)'
  };
  // [wavenumber, depth, half-width, shape ('l' sharp / 'g' broad), bond key or null]
  const IR = {
    p1ol: { name: 'propan-1-ol', f: 'CH₃CH₂CH₂OH', cls: 'primary alcohol', b: [
      [3340, 1.3, 170, 'g', 'OHa'], [2962, 1.1, 14, 'l', 'CH'], [2935, 0.9, 13, 'l', 'CH'], [2877, 0.8, 12, 'l', 'CH'],
      [1460, 0.45, 12, 'l', null], [1380, 0.3, 10, 'l', null], [1240, 0.15, 15, 'l', null], [1060, 1.4, 16, 'l', 'CO1'], [970, 0.6, 12, 'l', null], [890, 0.35, 10, 'l', null]] },
    propanal: { name: 'propanal', f: 'CH₃CH₂CHO', cls: 'aldehyde', b: [
      [2985, 0.7, 12, 'l', 'CH'], [2945, 0.5, 12, 'l', 'CH'], [2905, 0.4, 12, 'l', 'CH'], [2820, 0.35, 10, 'l', 'CHO'], [2720, 0.4, 12, 'l', 'CHO'],
      [1732, 2.0, 12, 'l', 'CO'], [1460, 0.4, 10, 'l', null], [1395, 0.4, 10, 'l', null], [1340, 0.2, 10, 'l', null], [1120, 0.5, 14, 'l', null], [860, 0.3, 12, 'l', null], [660, 0.2, 12, 'l', null]] },
    pacid: { name: 'propanoic acid', f: 'CH₃CH₂COOH', cls: 'carboxylic acid', b: [
      [2980, 1.15, 290, 'g', 'OHc'], [2985, 0.45, 10, 'l', 'CH'], [2945, 0.35, 10, 'l', 'CH'], [2650, 0.25, 40, 'l', 'OHc'],
      [1715, 2.1, 14, 'l', 'CO'], [1465, 0.4, 10, 'l', null], [1415, 0.6, 12, 'l', null], [1240, 1.1, 18, 'l', 'CO1'], [1080, 0.3, 12, 'l', null], [935, 0.6, 25, 'l', null], [810, 0.2, 10, 'l', null]] },
    propanone: { name: 'propanone', f: 'CH₃COCH₃', cls: 'ketone', b: [
      [3005, 0.35, 12, 'l', 'CH'], [2925, 0.25, 12, 'l', 'CH'], [1716, 2.1, 12, 'l', 'CO'],
      [1422, 0.6, 12, 'l', null], [1362, 1.1, 10, 'l', null], [1222, 1.2, 14, 'l', null], [1092, 0.3, 10, 'l', null], [902, 0.15, 10, 'l', null], [530, 0.5, 12, 'l', null]] },
    hexane: { name: 'hexane', f: 'CH₃(CH₂)₄CH₃', cls: 'alkane', b: [
      [2958, 1.3, 14, 'l', 'CH'], [2927, 1.6, 14, 'l', 'CH'], [2873, 1.0, 12, 'l', 'CH'], [2860, 0.9, 12, 'l', 'CH'],
      [1467, 0.7, 10, 'l', null], [1379, 0.45, 8, 'l', null], [1140, 0.08, 20, 'l', null], [890, 0.08, 10, 'l', null], [727, 0.3, 8, 'l', null]] },
    hexene: { name: 'hex-1-ene', f: 'CH₂=CH(CH₂)₃CH₃', cls: 'alkene', b: [
      [3080, 0.45, 10, 'l', 'CHe'], [2960, 1.0, 14, 'l', 'CH'], [2928, 1.3, 14, 'l', 'CH'], [2860, 0.8, 12, 'l', 'CH'], [1642, 0.65, 8, 'l', 'CC'],
      [1460, 0.5, 10, 'l', null], [1380, 0.3, 8, 'l', null], [993, 0.6, 8, 'l', null], [910, 0.9, 8, 'l', null]] },
    bromo: { name: '1-bromobutane', f: 'CH₃CH₂CH₂CH₂Br', cls: 'halogenoalkane', b: [
      [2962, 1.2, 14, 'l', 'CH'], [2934, 1.0, 13, 'l', 'CH'], [2874, 0.8, 12, 'l', 'CH'], [1465, 0.6, 10, 'l', null], [1435, 0.4, 10, 'l', null], [1380, 0.3, 8, 'l', null],
      [1250, 0.8, 10, 'l', null], [1210, 0.3, 10, 'l', null], [740, 0.3, 10, 'l', null], [645, 0.7, 10, 'l', 'CBr'], [565, 0.8, 10, 'l', 'CBr']] },
    nitrile: { name: 'butanenitrile', f: 'CH₃CH₂CH₂CN', cls: 'nitrile', b: [
      [2970, 1.0, 14, 'l', 'CH'], [2940, 0.7, 13, 'l', 'CH'], [2880, 0.6, 12, 'l', 'CH'], [2250, 0.8, 8, 'l', 'CN'],
      [1465, 0.6, 10, 'l', null], [1430, 0.5, 10, 'l', null], [1385, 0.3, 8, 'l', null], [1100, 0.2, 12, 'l', null], [760, 0.3, 10, 'l', null]] },
    amine: { name: 'propylamine', f: 'CH₃CH₂CH₂NH₂', cls: 'primary amine', b: [
      [3370, 0.45, 30, 'l', 'NH'], [3290, 0.4, 30, 'l', 'NH'], [2960, 1.0, 14, 'l', 'CH'], [2930, 0.8, 13, 'l', 'CH'], [2875, 0.7, 12, 'l', 'CH'], [1605, 0.35, 20, 'l', 'NHb'],
      [1465, 0.4, 10, 'l', null], [1380, 0.25, 8, 'l', null], [1075, 0.4, 14, 'l', null], [800, 0.7, 60, 'g', null]] }
  };
  const IR_KEYS = Object.keys(IR);
  function bandShape(b, nu) {
    const u = (nu - b[0]) / b[2];
    return b[3] === 'g' ? Math.exp(-0.6931 * u * u) : 1 / (1 + u * u);
  }
  function transmittance(D, nu) {
    let a = 0;
    D.b.forEach((b) => { a += b[1] * bandShape(b, nu); });
    return (95 - 4 * (nu - 500) / 3500) * Math.exp(-a);
  }
  function irCompound(s) { return s.p.cmp === 'mystery' ? IR[s.state.mystery] : IR[s.p.cmp]; }
  function pickMystery(s) {
    let k;
    do { k = IR_KEYS[Math.floor(Math.random() * IR_KEYS.length)]; } while (k === s.state.mystery && IR_KEYS.length > 1);
    s.state.mystery = k;
    s.state.reveal = false;
  }
  function irGraph(s) {
    const { w, h } = s;
    return { x: 50, y: 46, w: w - 50 - 20, h: h - 46 - 48 };
  }
  const nuToX = (G, nu) => G.x + (4000 - nu) / 3500 * G.w;
  const xToNu = (G, x) => 4000 - (x - G.x) / G.w * 3500;

  Sim.create('#sim-chem-10-ir', {
    title: 'Infrared spectra: identify the functional groups',
    height: (w) => (w >= 600 ? 360 : 330),
    controls: [
      { key: 'cmp', type: 'select', label: 'Compound', value: 'p1ol', options: [
        ['p1ol', 'propan-1-ol'], ['propanal', 'propanal'], ['pacid', 'propanoic acid'], ['propanone', 'propanone'], ['hexane', 'hexane'],
        ['hexene', 'hex-1-ene'], ['bromo', '1-bromobutane'], ['nitrile', 'butanenitrile'], ['amine', 'propylamine'], ['mystery', 'Mystery compound']],
        onChange: (s, v) => { if (v === 'mystery') pickMystery(s); } },
      { type: 'button', label: 'New mystery', onClick: (s) => { s.set('cmp', 'mystery'); pickMystery(s); } },
      { type: 'button', label: 'Reveal answer', ghost: true, onClick: (s) => { if (s.p.cmp === 'mystery') s.state.reveal = true; } }
    ],
    init(s) { s.state = { hoverNu: null, mystery: 'propanone', reveal: false }; },
    pointer: {
      touchAction: 'pan-y',
      down(s, pt) { const G = irGraph(s); if (pt.x >= G.x && pt.x <= G.x + G.w) s.state.hoverNu = clamp(xToNu(G, pt.x), 500, 4000); },
      move(s, pt) { const G = irGraph(s); s.state.hoverNu = pt.x >= G.x && pt.x <= G.x + G.w && pt.y >= G.y - 10 && pt.y <= G.y + G.h + 10 ? clamp(xToNu(G, pt.x), 500, 4000) : null; },
      leave(s) { s.state.hoverNu = null; }
    },
    draw(s) {
      const { ctx } = s;
      const D = irCompound(s);
      const G = irGraph(s);
      const hidden = s.p.cmp === 'mystery' && !s.state.reveal;
      Sim.rect(ctx, G.x, G.y, G.w, G.h, { fill: '#fff' });
      // fingerprint region
      Sim.rect(ctx, nuToX(G, 1500), G.y, nuToX(G, 500) - nuToX(G, 1500), G.h, { fill: 'rgba(134,142,150,0.10)' });
      Sim.text(ctx, 'fingerprint region', (nuToX(G, 1500) + nuToX(G, 500)) / 2, G.y + G.h - 10, { size: 11.5, color: C.muted, align: 'center' });
      // grid and ticks
      for (let nu = 4000; nu >= 500; nu -= 500) {
        const X = nuToX(G, nu);
        Sim.line(ctx, X, G.y, X, G.y + G.h, { color: C.grid, width: 1 });
        Sim.line(ctx, X, G.y + G.h, X, G.y + G.h + 4, { color: C.axis, width: 1 });
        if (G.w >= 420 || nu % 1000 === 0 || nu === 500 || nu === 1500) Sim.text(ctx, String(nu), X, G.y + G.h + 13, { size: 10.5, color: C.muted, align: 'center' });
      }
      for (let t = 0; t <= 100; t += 25) {
        const Y = G.y + G.h - t / 100 * G.h;
        Sim.line(ctx, G.x, Y, G.x + G.w, Y, { color: C.grid, width: 1 });
        Sim.text(ctx, String(t), G.x - 6, Y, { size: 10.5, color: C.muted, align: 'right' });
      }
      Sim.line(ctx, G.x, G.y, G.x, G.y + G.h, { color: C.axis, width: 1.5 });
      Sim.line(ctx, G.x, G.y + G.h, G.x + G.w, G.y + G.h, { color: C.axis, width: 1.5 });
      Sim.text(ctx, 'transmittance / %', G.x + 6, G.y - 9, { size: 11.5, bold: true, color: C.ink });
      Sim.text(ctx, 'wavenumber / cm⁻¹', G.x + G.w, G.y + G.h + 32, { size: 11.5, bold: true, color: C.ink, align: 'right' });
      // spectrum
      const pts = [];
      for (let X = G.x; X <= G.x + G.w; X += 1) {
        const nu = xToNu(G, X);
        pts.push([X, G.y + G.h - transmittance(D, nu) / 100 * G.h]);
      }
      Sim.polyline(ctx, pts, { color: C.navy, width: 1.8 });
      // name
      const wideT = G.w > 450;
      const title = hidden ? (wideT ? 'Mystery compound: which functional groups can you see?' : 'Mystery compound') : D.name + '   ' + D.f + (wideT ? '   (' + D.cls + ')' : '');
      Sim.text(ctx, title, G.x + G.w, 14, { size: 13, bold: true, color: hidden ? C.purple : C.navy, align: 'right' });
      // hover
      const nu = s.state.hoverNu;
      if (nu != null) {
        const X = nuToX(G, nu);
        Sim.line(ctx, X, G.y, X, G.y + G.h, { color: C.orange, width: 1.5, dash: [4, 3] });
        const Y = G.y + G.h - transmittance(D, nu) / 100 * G.h;
        Sim.circle(ctx, X, Y, 4.5, { fill: C.orange, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, Math.round(nu) + ' cm⁻¹', X + (X > G.x + G.w - 80 ? -6 : 6), G.y + 12, { size: 12, bold: true, color: C.orange, align: X > G.x + G.w - 80 ? 'right' : 'left', bg: 'rgba(255,255,255,0.9)', pad: 2 });
      }
    },
    readout: (s) => {
      const D = irCompound(s);
      const nu = s.state.hoverNu;
      const rows = [];
      if (nu != null) {
        let best = null, bv = 0;
        D.b.forEach((b) => { const v = b[1] * bandShape(b, nu); if (v > bv) { bv = v; best = b; } });
        let msg;
        if (!best || bv < 0.08) msg = 'no significant absorption here';
        else if (best[4]) msg = BOND[best[4]];
        else msg = 'a fingerprint-region absorption (bending or skeletal vibration): unique to this compound, not used to spot functional groups';
        rows.push(['At ' + Math.round(nu) + ' cm⁻¹:', msg, true]);
      } else {
        rows.push(['Pointer', 'move across the spectrum to identify each trough']);
      }
      if (s.p.cmp === 'mystery') {
        rows.push(['Answer:', s.state.reveal ? D.name + ' (' + D.cls + ')' : 'hidden: press Reveal answer when you have decided']);
      }
      return rows;
    }
  });
})();
