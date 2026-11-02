/* Chemistry topic 15: Carbonyls, carboxylic acids and chirality — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const RAD = Math.PI / 180;

  /* ======================================================================
     1. A chiral molecule and its mirror image (2-hydroxypropanoic acid)
     ====================================================================== */
  const S3 = 1 / Math.sqrt(3);
  const GROUPS = [
    { name: 'OH', v: [S3, S3, S3], col: '#e03131', r: 15 },
    { name: 'CH₃', v: [S3, -S3, -S3], col: '#868e96', r: 16 },
    { name: 'H', v: [-S3, S3, -S3], col: '#f1f3f5', r: 11 },
    { name: 'COOH', v: [-S3, -S3, S3], col: '#1971c2', r: 17 }
  ];
  const VIEW = { yaw: 25 * RAD, pitch: -18 * RAD };
  function rot([x, y, z], yaw, pitch, roll) {
    // roll about z, then pitch about x, then yaw about y
    let x1 = x * Math.cos(roll) - y * Math.sin(roll), y1 = x * Math.sin(roll) + y * Math.cos(roll), z1 = z;
    let y2 = y1 * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = y1 * Math.sin(pitch) + z1 * Math.cos(pitch), x2 = x1;
    return [x2 * Math.cos(yaw) + z2 * Math.sin(yaw), y2, -x2 * Math.sin(yaw) + z2 * Math.cos(yaw)];
  }
  const mirrored = (g, p) => rot([-g.v[0], g.v[1], g.v[2]], p.yaw * RAD, p.pitch * RAD, p.roll * RAD);
  function molecule(ctx, cx, cy, size, vecs, alpha, label) {
    const pts = vecs.map((v, i) => {
      const w = rot(v, VIEW.yaw, VIEW.pitch, 0);
      return { g: GROUPS[i], x: cx + w[0] * size, y: cy - w[1] * size, z: w[2] };
    });
    ctx.save();
    ctx.globalAlpha = alpha;
    const back = pts.filter((q) => q.z < 0).sort((a, b) => a.z - b.z);
    const front = pts.filter((q) => q.z >= 0).sort((a, b) => a.z - b.z);
    const atom = (q) => {
      Sim.line(ctx, cx, cy, q.x, q.y, { color: '#495057', width: 5 + 2 * q.z });
      const r = q.g.r * (1 + 0.18 * q.z);
      Sim.circle(ctx, q.x, q.y, r, { fill: q.g.col, stroke: '#343a40', width: 1.2 });
      Sim.text(ctx, q.g.name, q.x, q.y + 1, { size: q.g.name.length > 2 ? 10.5 : 12, bold: true, color: q.g.name === 'H' ? '#212529' : '#fff', align: 'center' });
    };
    back.forEach(atom);
    Sim.circle(ctx, cx, cy, 13, { fill: '#343a40', stroke: '#212529', width: 1 });
    Sim.text(ctx, 'C', cx, cy + 1, { size: 12, bold: true, color: '#fff', align: 'center' });
    front.forEach(atom);
    ctx.restore();
    if (label) Sim.text(ctx, label, cx, cy + size + 34, { size: 12.5, bold: true, color: C.navy, align: 'center' });
  }
  function matches(p) {
    return GROUPS.filter((g) => {
      const m = mirrored(g, p);
      return g.v[0] * m[0] + g.v[1] * m[1] + g.v[2] * m[2] > Math.cos(14 * RAD);
    }).length;
  }

  Sim.create('#sim-chem-15-chiral', {
    title: 'Non-superimposable mirror images',
    height: (w) => (w >= 600 ? 300 : 520),
    controls: [
      { key: 'yaw', label: 'Turn the mirror image about the vertical', min: 0, max: 360, step: 5, value: 0, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'pitch', label: 'Tip it forwards', min: 0, max: 360, step: 5, value: 0, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'roll', label: 'Spin it in the page', min: 0, max: 360, step: 5, value: 0, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'overlay', type: 'check', label: 'Lay the mirror image over the original', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 600;
      const size = wide ? 78 : 70;
      const A = wide ? [w * 0.27, h / 2 - 10] : [w / 2, 120];
      const B = wide ? [w * 0.73, h / 2 - 10] : [w / 2, 360];
      molecule(ctx, A[0], A[1], size, GROUPS.map((g) => g.v), 1, 'original');
      if (wide) Sim.line(ctx, w / 2, 20, w / 2, h - 20, { color: C.grey, width: 1.5, dash: [6, 5] });
      else Sim.line(ctx, 20, 240, w - 20, 240, { color: C.grey, width: 1.5, dash: [6, 5] });
      Sim.text(ctx, 'mirror', wide ? w / 2 + 6 : 24, wide ? 30 : 232, { size: 11.5, color: C.muted });
      const mv = GROUPS.map((g) => mirrored(g, p));
      molecule(ctx, B[0], B[1], size, mv, 1, 'mirror image (turned)');
      if (p.overlay) molecule(ctx, A[0], A[1], size, mv, 0.45);
    },
    readout(s) {
      const k = matches(s.p);
      return [
        ['Groups lined up with the original', k + ' of 4', true],
        ['Verdict', k === 4 ? 'superimposable' : 'not superimposable: at best two groups ever match, because the two are mirror images']
      ];
    }
  });

  /* ======================================================================
     2. Polarimeter: rotation of plane-polarised light by a mixture of enantiomers
     ====================================================================== */
  const ALPHA_MAX = 30;   // rotation of this sample of the pure (+) enantiomer, in degrees
  Sim.create('#sim-chem-15-polarimeter', {
    title: 'Polarimeter',
    height: 230,
    controls: [
      { key: 'f', label: 'Proportion of the (+) enantiomer', min: 0, max: 100, step: 5, value: 100, unit: '%', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const a = (2 * p.f / 100 - 1) * ALPHA_MAX;
      const y = h / 2 + 4;
      const x0 = 20, x1 = Math.max(w * 0.2, 90), tx = x1 + 60, tw = Math.max(120, w - tx - 140), x2 = tx + tw + 40;
      // unpolarised light
      Sim.circle(ctx, x0 + 12, y, 10, { fill: '#ffd43b', stroke: '#f08c00', width: 1.5 });
      for (let k = 0; k < 4; k++) {
        const t = k * Math.PI / 4, dx = Math.cos(t) * 16, dy = Math.sin(t) * 16;
        Sim.line(ctx, x1 - 30 - dx, y - dy, x1 - 30 + dx, y + dy, { color: '#f08c00', width: 2 });
      }
      Sim.text(ctx, 'unpolarised', x1 - 30, y + 34, { size: 11, color: C.muted, align: 'center' });
      // polariser
      Sim.rect(ctx, x1 - 4, y - 36, 8, 72, { fill: '#adb5bd', r: 2 });
      Sim.text(ctx, 'polariser', x1, y - 44, { size: 11, color: C.muted, align: 'center' });
      Sim.arrow(ctx, x1 + 30, y + 18, x1 + 30, y - 18, { color: C.navy, width: 2, head: 6 });
      Sim.arrow(ctx, x1 + 30, y - 18, x1 + 30, y + 18, { color: C.navy, width: 2, head: 6 });
      // sample tube, coloured by its make-up
      Sim.rect(ctx, tx, y - 22, tw, 44, { fill: 'rgba(208,228,255,0.6)', stroke: '#868e96', width: 2, r: 10 });
      const n = 18;
      for (let i = 0; i < n; i++) {
        const plus = i < Math.round(n * p.f / 100);
        Sim.circle(ctx, tx + 12 + ((i * 37) % (tw - 24)), y - 12 + ((i * 11) % 24), 4, { fill: plus ? C.blue : C.orange });
      }
      Sim.text(ctx, '(+) enantiomer', tx, y + 38, { size: 11, color: C.blue });
      Sim.text(ctx, '(−) enantiomer', tx + tw, y + 38, { size: 11, color: C.orange, align: 'right' });
      // emerging plane
      const L = 22, ar = a * RAD;
      const dx = Math.sin(ar) * L, dy = Math.cos(ar) * L;
      Sim.line(ctx, x2, y - 30, x2, y + 30, { color: C.grey, width: 1, dash: [3, 3] });
      Sim.arrow(ctx, x2 - dx, y + dy, x2 + dx, y - dy, { color: C.red, width: 2.5, head: 7 });
      Sim.arrow(ctx, x2 + dx, y - dy, x2 - dx, y + dy, { color: C.red, width: 2.5, head: 7 });
      Sim.text(ctx, (a >= 0 ? '+' : '−') + Math.abs(a).toFixed(0) + '°', x2 + 36, y, { size: 15, bold: true, color: C.red });
      Sim.text(ctx, 'emerging light', x2, y + 46, { size: 11, color: C.muted, align: 'center' });
    },
    readout(s) {
      const f = s.p.f;
      const a = (2 * f / 100 - 1) * ALPHA_MAX;
      return [
        ['Observed rotation', (a > 0 ? '+' : a < 0 ? '−' : '') + Math.abs(a).toFixed(0) + '°', true],
        ['Sample', f === 50 ? 'racemic mixture: optically inactive' : f === 100 || f === 0 ? 'a single enantiomer' : 'an excess of the ' + (f > 50 ? '(+)' : '(−)') + ' enantiomer']
      ];
    }
  });

  /* ======================================================================
     3. NMR explorer: ¹H spectra with n + 1 splitting, and ¹³C spectra
     ====================================================================== */
  const MULT = ['singlet', 'doublet', 'triplet', 'quartet', 'quintet', 'sextet', 'septet'];
  const MOLS = {
    ethanol: { name: 'ethanol', parts: [['a', 'CH₃'], ['b', 'CH₂'], ['c', 'OH']],
      H: [{ l: 'a', t: 'CH₃', d: 1.2, n: 3, nb: 2 }, { l: 'b', t: 'CH₂ (next to O)', d: 3.7, n: 2, nb: 3 }, { l: 'c', t: 'O–H', d: 2.6, n: 1, nb: 0, note: 'O–H: a singlet that does not split its neighbours' }],
      C: [[18, 'CH₃'], [58, 'CH₂–O']] },
    propanone: { name: 'propanone', parts: [['a', 'CH₃'], [null, 'CO'], ['a', 'CH₃']],
      H: [{ l: 'a', t: 'CH₃ (next to C=O)', d: 2.2, n: 6, nb: 0 }],
      C: [[30, 'CH₃ (both)'], [206, 'C=O']] },
    butanone: { name: 'butanone', parts: [['a', 'CH₃'], [null, 'CO'], ['b', 'CH₂'], ['c', 'CH₃']],
      H: [{ l: 'a', t: 'CH₃ (next to C=O)', d: 2.1, n: 3, nb: 0 }, { l: 'b', t: 'CH₂ (next to C=O)', d: 2.4, n: 2, nb: 3 }, { l: 'c', t: 'CH₃', d: 1.1, n: 3, nb: 2 }],
      C: [[8, 'CH₃ of ethyl'], [29, 'CH₃–C=O'], [37, 'CH₂'], [209, 'C=O']] },
    ethylethanoate: { name: 'ethyl ethanoate', parts: [['a', 'CH₃'], [null, 'COO'], ['b', 'CH₂'], ['c', 'CH₃']],
      H: [{ l: 'a', t: 'CH₃ (next to C=O)', d: 2.0, n: 3, nb: 0 }, { l: 'b', t: 'CH₂ (next to O)', d: 4.1, n: 2, nb: 3 }, { l: 'c', t: 'CH₃', d: 1.3, n: 3, nb: 2 }],
      C: [[14, 'CH₃ of ethyl'], [21, 'CH₃–C=O'], [61, 'O–CH₂'], [171, 'C=O']] },
    methylpropanoate: { name: 'methyl propanoate', parts: [['a', 'CH₃'], ['b', 'CH₂'], [null, 'COO'], ['c', 'CH₃']],
      H: [{ l: 'a', t: 'CH₃', d: 1.1, n: 3, nb: 2 }, { l: 'b', t: 'CH₂ (next to C=O)', d: 2.3, n: 2, nb: 3 }, { l: 'c', t: 'O–CH₃', d: 3.7, n: 3, nb: 0 }],
      C: [[9, 'CH₃'], [27, 'CH₂'], [52, 'O–CH₃'], [175, 'C=O']] },
    propanoicacid: { name: 'propanoic acid', parts: [['a', 'CH₃'], ['b', 'CH₂'], [null, 'CO'], ['c', 'OH']],
      H: [{ l: 'a', t: 'CH₃', d: 1.2, n: 3, nb: 2 }, { l: 'b', t: 'CH₂ (next to C=O)', d: 2.4, n: 2, nb: 3 }, { l: 'c', t: 'COOH', d: 11.7, n: 1, nb: 0 }],
      C: [[9, 'CH₃'], [28, 'CH₂'], [181, 'C=O']] },
    propan2ol: { name: 'propan-2-ol', parts: [['a', 'CH₃'], ['b', 'CH'], ['c', '(OH)'], ['a', 'CH₃']],
      H: [{ l: 'a', t: 'CH₃ (two, equivalent)', d: 1.2, n: 6, nb: 1 }, { l: 'b', t: 'CH (next to O)', d: 4.0, n: 1, nb: 6 }, { l: 'c', t: 'O–H', d: 2.2, n: 1, nb: 0, note: 'O–H: a singlet that does not split its neighbours' }],
      C: [[25, 'CH₃ (both)'], [64, 'CH–O']] }
  };
  const COLS = { a: C.blue, b: C.green, c: C.purple };
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
  const SPREAD = 0.07;   // ppm between the lines of a multiplet, exaggerated so you can see them

  function geom(s) {
    const { w, h } = s;
    const nuc = s.p.nuc;
    const top = 70;
    return Sim.graph(s.ctx, { x: 30, y: top, w: w - 50, h: h - top - 44, xmin: nuc === 'H' ? 13 : 225, xmax: nuc === 'H' ? -0.5 : -5, ymin: 0, ymax: 1.15, ticks: true, grid: false, xstep: nuc === 'H' ? 1 : 20, xlabel: 'δ / ppm', ylabel: '' });
  }

  Sim.create('#sim-chem-15-nmr', {
    title: 'NMR spectra explorer',
    height: (w) => (w >= 600 ? 340 : 360),
    controls: [
      { key: 'mol', type: 'select', label: 'Compound', options: Object.keys(MOLS).map((k) => [k, MOLS[k].name]), value: 'ethylethanoate' },
      { key: 'nuc', type: 'select', label: 'Spectrum', options: [['H', '¹H NMR'], ['C', '¹³C NMR']], value: 'H' },
      { key: 'tms', type: 'check', label: 'Show the TMS reference peak', value: true }
    ],
    init(s) { s.state.sel = 'b'; },
    onChange(s, key) { if (key === 'mol') s.state.sel = 'b'; },
    pointer: {
      down(s, pt) {
        if (s.p.nuc !== 'H') return;
        const M = MOLS[s.p.mol];
        const g = geom(s);
        let best = null, bd = 40;
        M.H.forEach((q) => { const d = Math.abs(g.px(q.d) - pt.x); if (d < bd) { bd = d; best = q.l; } });
        // or a click on the formula at the top
        if (pt.y < 52) {
          const x0 = s.state.partX || [];
          x0.forEach(([l, a, b]) => { if (l && pt.x >= a && pt.x <= b) best = l; });
        }
        if (best) { s.state.sel = best; s.redraw(); }
      }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const M = MOLS[p.mol];
      const sel = s.state.sel;
      // formula with labelled groups
      let x = 30;
      s.state.partX = [];
      M.parts.forEach(([l, t], i) => {
        if (i) { Sim.text(ctx, '–', x, 26, { size: 18, color: C.ink }); x += 14; }
        const col = l ? COLS[l] : C.ink;
        const wd = Sim.measure ? Sim.measure(ctx, t, { size: 18, bold: true }) : t.length * 11;
        if (l && l === sel && p.nuc === 'H') Sim.rect(ctx, x - 4, 8, wd + 8, 30, { fill: 'rgba(255,212,59,0.45)', r: 5 });
        Sim.text(ctx, t, x, 26, { size: 18, bold: true, color: col });
        if (l) Sim.text(ctx, l, x + wd / 2, 48, { size: 11, color: col, align: 'center' });
        s.state.partX.push([l, x - 4, x + wd + 4]);
        x += wd + 6;
      });
      Sim.text(ctx, M.name, w - 20, 26, { size: 13, color: C.muted, align: 'right' });
      const g = geom(s);
      // δ runs from right to left, which Sim.graph's own axes do not handle, so draw it here.
      Sim.line(ctx, g.x, g.py(0), g.x + g.w, g.py(0), { color: C.axis, width: 1.5 });
      const step = p.nuc === 'H' ? 1 : 20, topD = p.nuc === 'H' ? 12 : 220;
      for (let v = 0; v <= topD; v += step) {
        const X = g.px(v);
        Sim.line(ctx, X, g.py(0), X, g.py(0) + 4, { color: C.axis, width: 1 });
        Sim.text(ctx, String(v), X, g.py(0) + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'δ / ppm', g.x + g.w, g.py(0) + 26, { size: 12, bold: true, color: C.ink, align: 'right' });
      if (p.tms) {
        Sim.line(ctx, g.px(0), g.py(0), g.px(0), g.py(0.5), { color: C.grey, width: 2 });
        Sim.text(ctx, 'TMS', g.px(0), g.py(0.5) - 8, { size: 11, color: C.grey, align: 'center' });
      }
      if (p.nuc === 'H') {
        const maxN = Math.max.apply(null, M.H.map((q) => q.n));
        M.H.forEach((q) => {
          const k = q.nb;                       // n neighbours → n + 1 lines
          const lines = k + 1;
          const peak = Math.max.apply(null, Array.from({ length: lines }, (_, i) => binom(k, i)));
          const col = q.l === sel ? C.red : COLS[q.l];
          for (let i = 0; i < lines; i++) {
            const dd = q.d + (i - k / 2) * SPREAD;
            const hgt = (q.n / maxN) * (binom(k, i) / peak) * 0.95;
            Sim.line(ctx, g.px(dd), g.py(0), g.px(dd), g.py(hgt), { color: col, width: q.l === sel ? 2.4 : 1.8 });
          }
          Sim.text(ctx, q.l + ' (' + q.n + 'H)', g.px(q.d), g.py(Math.min(1.08, (q.n / maxN) * 0.95 + 0.08)), { size: 11.5, bold: true, color: col, align: 'center' });
        });
      } else {
        M.C.forEach(([d, lab], i) => {
          Sim.line(ctx, g.px(d), g.py(0), g.px(d), g.py(0.8), { color: C.navy, width: 2.2 });
          Sim.text(ctx, d + '', g.px(d), g.py(0.8) - 8 - (i % 2) * 14, { size: 11, bold: true, color: C.navy, align: 'center' });
        });
      }
    },
    readout(s) {
      const M = MOLS[s.p.mol];
      if (s.p.nuc === 'C') {
        return [['Carbon environments', M.C.length + ' peaks', true]].concat(M.C.map(([d, lab]) => [lab, 'δ ≈ ' + d + ' ppm']));
      }
      const rows = [['Hydrogen environments', M.H.length + ' peaks, area ratio ' + M.H.map((q) => q.n).join(' : '), true]];
      M.H.forEach((q) => {
        const split = MULT[q.nb] || (q.nb + 1) + ' lines';
        rows.push([q.l + ': ' + q.t, 'δ ' + q.d.toFixed(1) + ', ' + q.n + 'H, ' + split + (q.note ? ' (' + q.note + ')' : ' (' + q.nb + ' H on neighbouring C, so ' + (q.nb + 1) + (q.nb ? ' lines)' : ' line)')), q.l === s.state.sel]);
      });
      return rows;
    }
  });
})();
