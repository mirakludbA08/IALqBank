/* Chemistry Topic 2, Atomic structure and the periodic table: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const sup = Sim.sup;

  const SYM = ['', 'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca',
    'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr'];
  const NAME = ['', 'hydrogen', 'helium', 'lithium', 'beryllium', 'boron', 'carbon', 'nitrogen', 'oxygen', 'fluorine', 'neon',
    'sodium', 'magnesium', 'aluminium', 'silicon', 'phosphorus', 'sulfur', 'chlorine', 'argon', 'potassium', 'calcium',
    'scandium', 'titanium', 'vanadium', 'chromium', 'manganese', 'iron', 'cobalt', 'nickel', 'copper', 'zinc',
    'gallium', 'germanium', 'arsenic', 'selenium', 'bromine', 'krypton'];

  /* Text with raised (1) and lowered (−1) parts, drawn piece by piece so that
     charges such as ⁺ stay legible at small sizes. parts = [[text, mode], ...] */
  function rich(ctx, parts, x, y, o) {
    o = o || {};
    const size = o.size || 13, small = Math.round(size * 0.74 * 10) / 10;
    const f = (m) => ({ size: m ? small : size, bold: o.bold, italic: o.italic });
    const widths = parts.map(([t, m]) => Sim.measure(ctx, String(t), f(m)));
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    if (o.bg) Sim.rect(ctx, cx - 3, y - size * 0.78, total + 6, size * 1.56, { fill: o.bg, r: 3 });
    parts.forEach(([t, m], i) => {
      Sim.text(ctx, String(t), cx, y + (m === 1 ? -size * 0.36 : m === -1 ? size * 0.28 : 0), Object.assign(f(m), { color: o.color }));
      cx += widths[i];
    });
    return total;
  }
  function wrap(ctx, str, maxW, size) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, t, { size }) > maxW) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  const formulaParts = (str) => {
    const out = [];
    str.replace(/([A-Z][a-z]?)(\d*)/g, (_, el, n) => { out.push([el, 0]); if (n) out.push([n, -1]); return ''; });
    return out;
  };
  const chargeSup = (q) => (Math.abs(q) > 1 ? Math.abs(q) : '') + (q > 0 ? '+' : '−');

  /* ======================================================================
     1. Mass spectra: elements, diatomic molecules and a molecular ion
     ====================================================================== */
  const ELEM = {
    li: { sym: 'Li', name: 'lithium', table: '6.9', iso: [[6, 7.59], [7, 92.41]] },
    b: { sym: 'B', name: 'boron', table: '10.8', iso: [[10, 19.9], [11, 80.1]] },
    ne: { sym: 'Ne', name: 'neon', table: '20.2', iso: [[20, 90.48], [21, 0.27], [22, 9.25]] },
    mg: { sym: 'Mg', name: 'magnesium', table: '24.3', iso: [[24, 78.99], [25, 10.00], [26, 11.01]] },
    si: { sym: 'Si', name: 'silicon', table: '28.1', iso: [[28, 92.23], [29, 4.68], [30, 3.09]] },
    s: { sym: 'S', name: 'sulfur', table: '32.1', iso: [[32, 94.99], [33, 0.75], [34, 4.25], [36, 0.01]] },
    cl: { sym: 'Cl', name: 'chlorine atoms', table: '35.5', iso: [[35, 75.78], [37, 24.22]] },
    k: { sym: 'K', name: 'potassium', table: '39.1', iso: [[39, 93.26], [40, 0.01], [41, 6.73]] },
    pb: { sym: 'Pb', name: 'lead', table: '207.2', iso: [[204, 1.4], [206, 24.1], [207, 22.1], [208, 52.4]] }
  };
  const DIAT = {
    cl2: { sym: 'Cl', name: 'chlorine, Cl₂', iso: [[35, 0.75], [37, 0.25]] },
    br2: { sym: 'Br', name: 'bromine, Br₂', iso: [[79, 0.5], [81, 0.5]] }
  };
  const BUTANE = [[15, 6, 'CH3'], [27, 37, 'C2H3'], [28, 33, 'C2H4'], [29, 44, 'C2H5'], [41, 28, 'C3H5'], [43, 100, 'C3H7'], [58, 12, 'C4H10']];

  function spectrum(p) {
    const peaks = [];
    if (ELEM[p.samp]) {
      const E = ELEM[p.samp];
      E.iso.forEach(([m, a]) => peaks.push({ x: m, y: a, parts: [[m, 1], [E.sym, 0], ['+', 1]], tail: ':  m/z = ' + m + ', ' + a.toFixed(2) + '% abundance', main: true }));
      if (p.two) E.iso.forEach(([m, a]) => peaks.push({ x: m / 2, y: a * 0.03, parts: [[m, 1], [E.sym, 0], ['2+', 1]], tail: ':  m/z = ' + m + ' ÷ 2 = ' + (m / 2) + ', small (few atoms lose two electrons)', main: false }));
      return { kind: 'el', E, peaks, ylab: '% abundance', ymax: 100 };
    }
    if (DIAT[p.samp]) {
      const D = DIAT[p.samp];
      const [[m1, p1], [m2, p2]] = D.iso;
      const lab = (a, b) => [[a, 1], [D.sym, 0], ['–', 0], [b, 1], [D.sym, 0], ['+', 1]];
      const list = [[m1 + m1, p1 * p1, lab(m1, m1)], [m1 + m2, 2 * p1 * p2, lab(m1, m2)], [m2 + m2, p2 * p2, lab(m2, m2)]];
      const top = Math.max(...list.map((q) => q[1]));
      list.forEach(([m, a, parts]) => peaks.push({ x: m, y: (a / top) * 100, parts, tail: ':  m/z = ' + m + ', ' + (a * 16).toFixed(0) + '/16 of the molecules', main: true }));
      return { kind: 'di', D, peaks, ylab: 'relative abundance', ymax: 100 };
    }
    BUTANE.forEach(([m, a, f]) => peaks.push({ x: m, y: a, parts: formulaParts(f).concat([['+', 1]]), tail: ':  m/z = ' + m + (m === 58 ? ', the molecular ion, so Mr = 58' : ', a fragment ion'), main: m === 58 || m === 43 }));
    return { kind: 'mol', peaks, ylab: 'relative abundance', ymax: 100 };
  }

  Sim.create('#sim-chem-02-ms', {
    title: 'Reading a mass spectrum',
    alt: 'A mass spectrum: vertical lines at each mass-to-charge ratio, with heights showing abundance, for the chosen sample',
    height: (w) => Math.round(clamp(w * 0.55, 300, 380)),
    controls: [
      {
        key: 'samp', type: 'select', label: 'Sample', value: 'mg',
        options: Object.keys(ELEM).map((k) => [k, ELEM[k].sym + ' (' + ELEM[k].name + ')']).concat([['cl2', 'Cl₂ molecules'], ['br2', 'Br₂ molecules'], ['c4h10', 'butane, C₄H₁₀']])
      },
      { key: 'two', type: 'check', label: 'Include 2+ ions (elements only)', value: false }
    ],
    init(s) { s.state.hover = -1; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const sp = spectrum(p);
      const xs = sp.peaks.map((q) => q.x);
      let xmin = Math.floor(Math.min(...xs)) - 3, xmax = Math.ceil(Math.max(...xs)) + 3;
      if (sp.kind === 'mol') { xmin = 10; xmax = 65; }
      const g = Sim.graph(ctx, { x: 52, y: 26, w: w - 52 - 22, h: h - 26 - 44, xmin, xmax, ymin: 0, ymax: sp.ymax * 1.16, xlabel: 'm/z', ylabel: sp.ylab, ystep: 20 });
      g.axes();
      s.state.g = g;
      s.state.peaks = sp.peaks;
      const narrow = w < 520;
      sp.peaks.forEach((q, i) => {
        const X = g.px(q.x), Y0 = g.py(0), Y = Math.min(Y0 - 2, g.py(q.y));
        const hot = i === s.state.hover;
        const col = hot ? C.orange : q.main ? C.navy : C.purple;
        Sim.line(ctx, X, Y0, X, Y, { color: col, width: hot ? 6 : 4, cap: 'butt' });
        const showLabel = sp.kind !== 'mol' || q.main || hot;
        if (showLabel) rich(ctx, q.parts, X, Y - 12, { size: narrow ? 12 : 13.5, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.85)' });
        if (sp.kind === 'el' && q.main && q.y > 0.5 && !narrow) Sim.text(ctx, q.y.toFixed(1) + '%', X + 6, Math.max(Y + 10, g.y + 10), { size: 11, color: C.muted });
        if (sp.kind === 'mol' && q.x === 58) rich(ctx, [['M', 0], ['+', 1], [' (highest m/z)', 0]], X, Y - 34, { size: 12.5, bold: true, color: C.red, align: 'center' });
      });
      if (sp.kind === 'di') {
        const r = sp.peaks.map((q) => q.y);
        const base = Math.min(...r);
        Sim.text(ctx, 'ratio ' + r.map((v) => Math.round(v / base)).join(' : '), g.x + g.w - 6, g.y + 14, { size: 14, bold: true, color: C.green, align: 'right' });
      }
      if (s.state.hover >= 0 && sp.peaks[s.state.hover]) {
        const q = sp.peaks[s.state.hover];
        rich(ctx, q.parts.concat([[q.tail, 0]]), g.x + g.w / 2, h - 11, { size: narrow ? 11.5 : 13, bold: true, color: '#d9480f', align: 'center', bg: 'rgba(255,255,255,0.95)' });
      } else {
        Sim.text(ctx, 'hover over or tap a peak to identify it', g.x + g.w / 2, h - 10, { size: 11.5, color: C.muted, align: 'center', italic: true });
      }
    },
    pointer: {
      move(s, pt) {
        const g = s.state.g;
        if (!g || !s.state.peaks) return;
        let best = -1, bd = 16;
        s.state.peaks.forEach((q, i) => { const d = Math.abs(g.px(q.x) - pt.x); if (d < bd) { bd = d; best = i; } });
        s.state.hover = best;
      },
      down(s, pt) { this.move(s, pt); },
      leave(s) { s.state.hover = -1; }
    },
    readout(s) {
      const sp = spectrum(s.p);
      if (sp.kind === 'el') {
        const iso = sp.E.iso;
        const sum = iso.reduce((a, [m, x]) => a + m * x, 0);
        const terms = iso.map(([m, x]) => '(' + m + ' × ' + x.toFixed(2) + ')').join(' + ');
        return '<span class="ro hl">A<sub>r</sub>(' + sp.E.sym + ') = [' + terms + '] ÷ 100 = <b>' + (sum / 100).toFixed(2) + '</b></span>' +
          '<span class="ro">Periodic table value <b>' + sp.E.table + '</b></span>' +
          (s.p.two ? '<span class="ro">2+ peaks are the same isotopes, so leave them out of A<sub>r</sub></span>' : '');
      }
      if (sp.kind === 'di') {
        const [[m1, p1], [m2, p2]] = sp.D.iso;
        return '<span class="ro hl">' + (m1 * 2) + ': ' + p1 + ' × ' + p1 + ' = <b>' + (p1 * p1).toFixed(4).replace(/0+$/, '') + '</b></span>' +
          '<span class="ro hl">' + (m1 + m2) + ': 2 × ' + p1 + ' × ' + p2 + ' = <b>' + (2 * p1 * p2).toFixed(4).replace(/0+$/, '') + '</b></span>' +
          '<span class="ro hl">' + (m2 * 2) + ': ' + p2 + ' × ' + p2 + ' = <b>' + (p2 * p2).toFixed(4).replace(/0+$/, '') + '</b></span>';
      }
      return '<span class="ro hl">Molecular ion C<sub>4</sub>H<sub>10</sub><sup>+</sup> at m/z <b>58</b>, so M<sub>r</sub> = <b>58</b></span><span class="ro">Tallest peak (43) is a fragment, C<sub>3</sub>H<sub>7</sub><sup>+</sup></span>';
    }
  });

  /* ======================================================================
     2. Electrons in boxes, Z = 1 to 36, atoms and ions
     ====================================================================== */
  const ORDER = [
    { id: '1s', n: 1, l: 0, cap: 2 }, { id: '2s', n: 2, l: 0, cap: 2 }, { id: '2p', n: 2, l: 1, cap: 6 },
    { id: '3s', n: 3, l: 0, cap: 2 }, { id: '3p', n: 3, l: 1, cap: 6 }, { id: '4s', n: 4, l: 0, cap: 2 },
    { id: '3d', n: 3, l: 2, cap: 10 }, { id: '4p', n: 4, l: 1, cap: 6 }
  ];
  const NOBLE = { 2: 'He', 10: 'Ne', 18: 'Ar', 36: 'Kr' };
  const COMMON = new Set(['1:1', '3:1', '4:2', '7:-3', '8:-2', '9:-1', '11:1', '12:2', '13:3', '15:-3', '16:-2', '17:-1', '19:1', '20:2',
    '21:3', '23:3', '24:3', '25:2', '26:2', '26:3', '27:2', '28:2', '29:1', '29:2', '30:2', '31:3', '34:-2', '35:-1']);

  function fillTo(e) {
    const occ = {};
    ORDER.forEach((o) => { occ[o.id] = 0; });
    let left = e;
    for (const o of ORDER) { const k = Math.min(o.cap, left); occ[o.id] = k; left -= k; if (left <= 0) break; }
    return occ;
  }
  function neutral(Z) {
    const occ = fillTo(Z);
    if (Z === 24) { occ['4s'] = 1; occ['3d'] = 5; }
    if (Z === 29) { occ['4s'] = 1; occ['3d'] = 10; }
    return occ;
  }
  function config(Z, q) {
    const e = Z - q;
    if (e < 0 || e > 36) return null;
    if (q <= 0) {
      if (q === 0) return neutral(Z);
      const occ = neutral(Z);
      let add = -q;
      for (const o of ORDER) { const room = o.cap - occ[o.id]; const k = Math.min(room, add); occ[o.id] += k; add -= k; if (!add) break; }
      return occ;
    }
    const occ = neutral(Z);
    let rem = q;
    const byOuter = ORDER.slice().sort((a, b) => b.n - a.n || b.l - a.l);
    for (const o of byOuter) { const k = Math.min(occ[o.id], rem); occ[o.id] -= k; rem -= k; if (!rem) break; }
    return occ;
  }
  const written = ORDER.slice().sort((a, b) => a.n - b.n || a.l - b.l);
  function configString(occ, short) {
    const parts = written.filter((o) => occ[o.id] > 0).map((o) => o.id + sup(occ[o.id]));
    if (!short) return parts.join(' ') || '(no electrons)';
    // shorthand: largest noble-gas core that the configuration contains
    const total = Object.values(occ).reduce((a, b) => a + b, 0);
    let core = 0;
    [2, 10, 18, 36].forEach((nz) => {
      if (nz >= total) return;
      const ref = fillTo(nz);
      if (ORDER.every((o) => ref[o.id] === 0 || occ[o.id] >= ref[o.id])) core = nz;
    });
    if (!core) return parts.join(' ');
    const ref = fillTo(core);
    const rest = written.filter((o) => occ[o.id] - ref[o.id] > 0).map((o) => o.id + sup(occ[o.id] - ref[o.id]));
    return '[' + NOBLE[core] + '] ' + rest.join(' ');
  }
  function blockOf(Z) {
    if (Z === 2) return 's block (placed with the noble gases in the p block)';
    if ([1, 3, 4, 11, 12, 19, 20].includes(Z)) return 's block';
    if (Z >= 21 && Z <= 30) return 'd block';
    return 'p block';
  }
  const chargeText = (q) => (q === 0 ? '0 (atom)' : q > 0 ? '+' + q : '−' + -q);
  const ionHTML = (Z, q) => SYM[Z] + (q === 0 ? '' : '<sup>' + chargeSup(q) + '</sup>');

  Sim.create('#sim-chem-02-config', {
    title: 'Electrons in boxes',
    alt: 'An energy-level diagram of orbitals from 1s to 4p, drawn as boxes, with arrows showing the electrons of the chosen atom or ion',
    height: (w) => (w >= 560 ? 400 : 470),
    controls: [
      { key: 'Z', label: 'Atomic number Z', min: 1, max: 36, step: 1, value: 8, format: (v) => v.toFixed(0) + ' (' + SYM[v] + ')' },
      { key: 'q', label: 'Charge', min: -3, max: 3, step: 1, value: 0, format: (v) => chargeText(v) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const Z = p.Z, q = p.q;
      const occ = config(Z, q);
      const narrow = w < 560;
      rich(ctx, [[SYM[Z], 0]].concat(q ? [[chargeSup(q), 1]] : []).concat([['  ·  ' + NAME[Z] + (q ? ' ion' : ' atom') + '  ·  ' + (Z - q) + ' electrons', 0]]), 14, 18, { size: narrow ? 14 : 16, bold: true, color: C.navy });
      if (!occ) {
        const msg = Z - q < 0 ? 'Not possible: ' + NAME[Z] + ' has only ' + Z + ' electron' + (Z > 1 ? 's' : '') + ' to lose.' : 'This would need orbitals beyond 4p, which this diagram does not show.';
        Sim.text(ctx, msg, w / 2, h / 2, { size: 14, color: C.red, bold: true, align: 'center' });
        return;
      }
      // energy axis
      const top = 46, bottom = h - 86;
      const ax = 18;
      Sim.arrow(ctx, ax, bottom + 6, ax, top - 6, { color: C.grey, width: 1.5, head: 8 });
      Sim.text(ctx, 'energy', ax + 6, top - 4, { size: 11, color: C.muted, rotate: 0 });
      const levels = { '1s': 0, '2s': 1, '2p': 1.6, '3s': 2.6, '3p': 3.2, '4s': 4.1, '3d': 4.45, '4p': 5.2 };
      const yOf = (id) => bottom - (levels[id] / 5.2) * (bottom - top);
      const bs = narrow ? 22 : 28;
      const xOf = (o) => {
        if (o.id === '1s' || o.id === '2s' || o.id === '3s' || o.id === '4s') return ax + 52;
        if (o.id === '2p' || o.id === '3p' || o.id === '4p') return ax + 52 + bs + (narrow ? 26 : 40);
        return ax + 52 + bs + (narrow ? 26 : 40) + 3 * bs + (narrow ? 22 : 40);   // 3d
      };
      const lastFilled = (() => { let id = null; ORDER.forEach((o) => { if (occ[o.id] > 0) id = o.id; }); return id; })();
      ORDER.forEach((o) => {
        const y = yOf(o.id);
        const nOrb = o.cap / 2;
        const x0 = xOf(o);
        const k = occ[o.id];
        const used = k > 0;
        Sim.text(ctx, o.id, x0 - 6, y, { size: narrow ? 12 : 13.5, bold: true, color: used ? C.navy : C.grey, align: 'right' });
        for (let b = 0; b < nOrb; b++) {
          const bx = x0 + b * bs;
          Sim.rect(ctx, bx, y - bs / 2, bs, bs, { fill: used ? '#fff' : '#f8f9fa', stroke: used ? C.navy : '#ced4da', width: 1.5 });
          const ups = Math.min(k, nOrb), downs = Math.max(0, k - nOrb);
          const hasUp = b < ups, hasDown = b < downs;
          const col = o.id === lastFilled && q === 0 ? C.red : C.blue;
          if (hasUp) Sim.arrow(ctx, bx + bs * (hasDown ? 0.33 : 0.5), y + bs * 0.36, bx + bs * (hasDown ? 0.33 : 0.5), y - bs * 0.38, { color: col, width: 2, head: 6 });
          if (hasDown) Sim.arrow(ctx, bx + bs * 0.67, y - bs * 0.36, bx + bs * 0.67, y + bs * 0.38, { color: col, width: 2, head: 6 });
        }
      });
      if (!narrow) {
        const nx = xOf(ORDER[6]) + 5 * bs + 18;
        if (nx < w - 150) {
          Sim.text(ctx, '4s fills before 3d:', nx, yOf('4s'), { size: 12, color: C.muted });
          Sim.text(ctx, 'it is lower in energy', nx, yOf('4s') + 16, { size: 12, color: C.muted });
        }
      }
      // configuration strings
      const full = configString(occ, false), short = configString(occ, true);
      const by = h - 52;
      Sim.text(ctx, full, 14, by, { size: narrow ? 13 : 15, bold: true, color: C.ink });
      Sim.text(ctx, short !== full ? 'short form: ' + short : '', 14, by + 22, { size: narrow ? 12 : 13.5, color: C.muted });
      if ((Z === 24 || Z === 29) && q === 0) Sim.text(ctx, Z === 24 ? 'exception: 3d⁵ 4s¹ (half-full 3d is more stable)' : 'exception: 3d¹⁰ 4s¹ (full 3d is more stable)', w - 14, 16, { size: 12, bold: true, color: C.red, align: 'right' });
    },
    readout(s) {
      const { Z, q } = s.p;
      const occ = config(Z, q);
      if (!occ) return [['Electrons', Z - q < 0 ? 'none left' : 'beyond 4p']];
      const e = Z - q;
      let unpaired = 0;
      ORDER.forEach((o) => { const k = occ[o.id], n = o.cap / 2; unpaired += k <= n ? k : 2 * n - k; });
      const r = [['Block', blockOf(Z)], ['Unpaired electrons', String(unpaired)]];
      if (NOBLE[e] && configString(occ, false) === configString(fillTo(e), false)) r.push(['Isoelectronic with', NOBLE[e] + (q === 0 ? '' : ' (a noble gas)'), true]);
      if (q !== 0) r.push(['Ion', COMMON.has(Z + ':' + q) ? ionHTML(Z, q) + ' is a common ion' : 'not an ion this element normally forms']);
      return r;
    }
  });

  /* ======================================================================
     3. Ionisation energies: successive IEs (Li–Ca) and first IEs (H–Kr)
     ====================================================================== */
  const SUCC = {
    3: [520.2, 7298.1, 11815.0],
    4: [899.5, 1757.1, 14848.7, 21006.6],
    5: [800.6, 2427.1, 3659.7, 25025.8, 32826.7],
    6: [1086.5, 2352.6, 4620.5, 6222.7, 37831, 47277.0],
    7: [1402.3, 2856, 4578.1, 7475.0, 9444.9, 53266.6, 64360],
    8: [1313.9, 3388.3, 5300.5, 7469.2, 10989.5, 13326.5, 71330, 84078.0],
    9: [1681.0, 3374.2, 6050.4, 8407.7, 11022.7, 15164.1, 17868, 92038.1, 106434.3],
    10: [2080.7, 3952.3, 6122, 9371, 12177, 15238, 19999.0, 23069.5, 115379.5, 131432],
    11: [495.8, 4562, 6910.3, 9543, 13354, 16613, 20117, 25496, 28932, 141362, 159076],
    12: [737.7, 1450.7, 7732.7, 10542.5, 13630, 18020, 21711, 25661, 31653, 35458, 169988, 189368],
    13: [577.5, 1816.7, 2744.8, 11577, 14842, 18379, 23326, 27465, 31853, 38473, 42647, 201266, 222316],
    14: [786.5, 1577.1, 3231.6, 4355.5, 16091, 19805, 23780, 29287, 33878, 38726, 45962, 50502, 235196, 257923],
    15: [1011.8, 1907, 2914.1, 4963.6, 6273.9, 21267, 25431, 29872, 35905, 40950, 46261, 54110, 59024, 271791, 296195],
    16: [999.6, 2252, 3357, 4556, 7004.3, 8495.8, 27107, 31719, 36621, 43177, 48710, 54460, 62930, 68216, 311048, 337138],
    17: [1251.2, 2298, 3822, 5158.6, 6542, 9362, 11018, 33604, 38600, 43961, 51068, 57118, 63363, 72341, 78095, 352994, 380760],
    18: [1520.6, 2665.8, 3931, 5771, 7238, 8781, 11995, 13842, 40760, 46186, 52002, 59653, 66199, 72918, 82473, 88576, 397605, 427066],
    19: [418.8, 3052, 4420, 5877, 7975, 9590, 11343, 14944, 16963.7, 48610, 54490, 60730, 68950, 75900, 83080, 93400, 99710, 444880, 476063],
    20: [589.8, 1145.4, 4912.4, 6491, 8153, 10496, 12270, 14206, 18191, 20385, 57110, 63410, 70110, 78890, 86310, 94000, 104900, 111710, 494850, 527762]
  };
  const FIRST = [0, 1312, 2372, 520, 900, 801, 1086, 1402, 1314, 1681, 2081, 496, 738, 578, 787, 1012, 1000, 1251, 1521, 419, 590,
    633, 659, 651, 653, 717, 762, 760, 737, 746, 906, 579, 762, 947, 941, 1140, 1351];
  const WHY = {
    1: 'one 1s electron, attracted by a single proton',
    2: 'highest of all: 1s electrons are closest to the nucleus, with no shielding, and there are two protons',
    3: 'big drop: the outer electron is in a new shell (2s), further out and shielded by 1s²',
    4: 'rise: one more proton, electron still in 2s',
    5: 'small drop: this electron is in 2p, higher in energy than 2s and partly shielded by the 2s electrons',
    6: 'rise: more protons, same 2p sub-shell',
    7: 'rise: three 2p electrons, one in each orbital',
    8: 'small drop: the fourth 2p electron is paired, and repulsion between the pair makes it easier to remove',
    9: 'rise: more protons, same shell',
    10: 'peak: full second shell and the most protons in period 2',
    11: 'big drop: the outer electron is in a new shell (3s), further out and shielded by two full shells',
    12: 'rise: one more proton, electron still in 3s',
    13: 'small drop: the electron is in 3p, higher in energy than 3s and partly shielded by the 3s electrons',
    14: 'rise: more protons, same 3p sub-shell',
    15: 'rise: three 3p electrons, one in each orbital',
    16: 'small drop: the fourth 3p electron is paired, and the pair repel each other',
    17: 'rise: more protons, same shell',
    18: 'peak: the most protons in period 3',
    19: 'big drop: a new shell (4s), further out and more shielded',
    20: 'rise: one more proton, 4s²',
    30: 'zinc: 3d¹⁰ 4s², with every d orbital full, is noticeably harder to ionise',
    31: 'drop: gallium’s outer electron is in 4p, higher in energy than 4s',
    32: 'rise: more protons, same 4p sub-shell',
    33: 'rise: three 4p electrons, one in each orbital',
    34: 'small drop: the fourth 4p electron is paired',
    35: 'rise: more protons, same shell',
    36: 'peak: the end of period 4'
  };
  for (let z = 21; z <= 29; z++) WHY[z] = 'd block: the electrons are added to the inner 3d sub-shell, which shields the 4s electron, so the values rise only slowly';
  const SHELL_COL = { 1: C.purple, 2: C.red, 3: C.orange, 4: C.green };
  const GROUP = { 1: 1, 2: 2, 3: 13, 4: 14, 5: 15, 6: 16, 7: 17, 8: 18 };

  /* the sub-shell that each successive electron is removed from (Z ≤ 20) */
  function removalShells(Z) {
    const seq = [];
    let left = Z;
    for (const o of ORDER.slice(0, 6)) { const k = Math.min(o.cap, left); for (let i = 0; i < k; i++) seq.push(o); left -= k; if (!left) break; }
    return seq.reverse();
  }

  Sim.create('#sim-chem-02-ie', {
    title: 'Ionisation energies',
    alt: 'Either a bar chart of the successive ionisation energies of one element, coloured by shell, or a graph of first ionisation energy against atomic number from hydrogen to krypton',
    height: (w) => Math.round(clamp(w * 0.58, 320, 420)),
    controls: [
      { key: 'mode', type: 'select', label: 'Show', value: 'succ', options: [['succ', 'successive ionisation energies'], ['first', 'first ionisation energy, H to Kr']], onChange: (s) => { s.state.hover = -1; } },
      { key: 'Z', type: 'select', label: 'Element (successive mode)', value: '11', options: Object.keys(SUCC).map((z) => [z, SYM[z] + ', ' + NAME[z] + ' (Z = ' + z + ')']) },
      { key: 'log', type: 'check', label: 'Log scale (successive mode)', value: true }
    ],
    init(s) { s.state.hover = -1; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const narrow = w < 520;
      if (p.mode === 'first') {
        const g = Sim.graph(ctx, { x: 54, y: 34, w: w - 54 - 16, h: h - 34 - 70, xmin: 0, xmax: 37, ymin: 0, ymax: 2600, xlabel: 'Z', xstep: 5, ystep: 500 });
        g.axes();
        s.state.g = g;
        Sim.text(ctx, 'first ionisation energy / kJ mol⁻¹', 10, 14, { size: 12.5, bold: true, color: C.ink });
        [[0.5, 2.5, 'period 1'], [2.5, 10.5, 'period 2'], [10.5, 18.5, 'period 3'], [18.5, 36.5, 'period 4']].forEach(([a, b, lab], i) => {
          if (i % 2) Sim.rect(ctx, g.px(a), g.y, g.px(b) - g.px(a), g.h, { fill: 'rgba(0,43,128,0.045)' });
          Sim.text(ctx, lab, (g.px(a) + g.px(b)) / 2, g.y + 10, { size: 11, color: C.muted, align: 'center' });
        });
        const pts = [];
        for (let z = 1; z <= 36; z++) pts.push([z, FIRST[z]]);
        g.path(pts, { color: C.blue, width: 2 });
        for (let z = 1; z <= 36; z++) {
          const hot = z === s.state.hover;
          const dip = [5, 8, 13, 16, 31, 34].includes(z);
          g.dot(z, FIRST[z], { r: hot ? 6.5 : 4, color: hot ? C.orange : dip ? C.red : [2, 10, 18, 36].includes(z) ? C.purple : [3, 11, 19].includes(z) ? C.green : C.navy });
          if (!narrow || [2, 3, 10, 11, 18, 19, 36].includes(z) || hot) Sim.text(ctx, SYM[z], g.px(z), g.py(FIRST[z]) + ((z % 2) ? -12 : 13), { size: 10.5, bold: true, color: C.ink, align: 'center' });
        }
        const z = s.state.hover;
        if (z >= 1 && z <= 36) {
          Sim.text(ctx, SYM[z] + ' (Z = ' + z + '): ' + FIRST[z] + ' kJ mol⁻¹', w / 2, h - 44, { size: narrow ? 12.5 : 13.5, bold: true, color: '#d9480f', align: 'center' });
          const fs = narrow ? 11 : 12;
          const lines = wrap(ctx, WHY[z], w - 24, fs);
          lines.forEach((t, i) => Sim.text(ctx, t, w / 2, h - 26 + i * 15 - (lines.length - 1) * 4, { size: fs, color: C.ink, align: 'center' }));
        } else Sim.text(ctx, 'hover over or tap a point for an explanation', w / 2, h - 24, { size: 11.5, italic: true, color: C.muted, align: 'center' });
        return;
      }
      const Z = +p.Z;
      const ie = SUCC[Z];
      const shells = removalShells(Z);
      const lg = p.log;
      const ymax = lg ? 6 : Math.max(...ie) * 1.08;
      const ymin = lg ? 2 : 0;
      const g = Sim.graph(ctx, { x: 58, y: 34, w: w - 58 - 16, h: h - 34 - 74, xmin: 0, xmax: Z + 1, ymin, ymax, xstep: Z > 12 ? 2 : 1, ystep: lg ? 1 : undefined });
      g.axes();
      s.state.g = g;
      Sim.text(ctx, lg ? 'log₁₀(ionisation energy / kJ mol⁻¹)' : 'ionisation energy / kJ mol⁻¹', 10, 14, { size: 12.5, bold: true, color: C.ink });
      Sim.text(ctx, 'number of the electron removed (1st, 2nd, 3rd …)', g.x + g.w / 2, g.y + g.h + 30, { size: 12, bold: true, color: C.ink, align: 'center' });
      const bw = Math.max(4, (g.w / (Z + 1)) * 0.62);
      ie.forEach((v, i) => {
        const n = i + 1;
        const val = lg ? Math.log10(v) : v;
        const X = g.px(n), Y = g.py(val), Y0 = g.py(ymin);
        const hot = n === s.state.hover;
        Sim.rect(ctx, X - bw / 2, Y, bw, Y0 - Y, { fill: SHELL_COL[shells[i].n], stroke: hot ? C.ink : null, width: 2 });
      });
      // the jumps between shells
      for (let i = 1; i < Z; i++) {
        if (shells[i].n !== shells[i - 1].n) {
          const X = (g.px(i) + g.px(i + 1)) / 2;
          Sim.line(ctx, X, g.y + 4, X, g.y + g.h, { color: C.grey, dash: [4, 4], width: 1.2 });
          if (shells[i - 1].n === shells[0].n) Sim.text(ctx, '◀ big jump', X + 4, g.y + 10, { size: 12, bold: true, color: C.ink, bg: 'rgba(255,255,255,0.92)' });
        }
      }
      // legend
      let lx = g.x + 8;
      const used = [...new Set(shells.map((o) => o.n))].sort();
      used.forEach((n) => {
        Sim.rect(ctx, lx, h - 22, 12, 12, { fill: SHELL_COL[n] });
        const t = 'shell ' + n;
        Sim.text(ctx, t, lx + 16, h - 16, { size: 11.5, color: C.ink });
        lx += 22 + Sim.measure(ctx, t, { size: 11.5 }) + 10;
      });
      const k = s.state.hover;
      if (k >= 1 && k <= Z) {
        const o = shells[k - 1];
        const t = 'IE ' + k + ' = ' + Math.round(ie[k - 1]).toLocaleString('en-GB') + ' kJ mol⁻¹, from ' + o.id;
        Sim.text(ctx, t, w - 14, h - 16, { size: narrow ? 11 : 12.5, bold: true, color: C.orange, align: 'right' });
      }
    },
    pointer: {
      move(s, pt) {
        const g = s.state.g;
        if (!g) return;
        const v = g.inv(pt.x, pt.y).x;
        const n = Math.round(v);
        const max = s.p.mode === 'first' ? 36 : +s.p.Z;
        s.state.hover = Math.abs(v - n) < 0.5 && n >= 1 && n <= max ? n : -1;
      },
      down(s, pt) { this.move(s, pt); },
      leave(s) { s.state.hover = -1; }
    },
    readout(s) {
      if (s.p.mode === 'first') return [['Pattern', 'rises across a period, falls down a group, small dips at groups 13 and 16']];
      const Z = +s.p.Z;
      const shells = removalShells(Z);
      const outerN = shells[0].n;
      const outer = shells.filter((o) => o.n === outerN).length;
      const ie = SUCC[Z];
      const r = [['Element', SYM[Z] + ' (' + NAME[Z] + ')']];
      if (outer < Z) r.push(['Big jump', 'between IE ' + outer + ' (' + Math.round(ie[outer - 1]).toLocaleString('en-GB') + ') and IE ' + (outer + 1) + ' (' + Math.round(ie[outer]).toLocaleString('en-GB') + ')', true]);
      r.push(['Outer electrons', String(outer)], ['Group', String(GROUP[outer]), true]);
      return r;
    }
  });
})();
