/* Biology 3c: Development of organisms — interactive diagrams
   1. From zygote to blastocyst: divisions without growth, totipotent and pluripotent cells
   2. Differential gene expression: transcription factors switch genes on and the cell specialises */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const lerp = Sim.lerp;

  function wrapLines(ctx, str, maxW, o) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, t, o) > maxW) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  function para(ctx, str, x, y, maxW, o) {
    o = Object.assign({ size: 13 }, o || {});
    const lh = Math.round(o.size * 1.38);
    const lines = wrapLines(ctx, str, maxW, o);
    lines.forEach((ln, i) => Sim.text(ctx, ln, x, y + i * lh, Object.assign({}, o, { baseline: 'top' })));
    return y + lines.length * lh;
  }
  function ell(ctx, x, y, rx, ry, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), o.rot || 0, 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }

  /* ======================================================================
     1. Zygote → morula → blastocyst
     ====================================================================== */
  const DEV = [
    { name: 'Zygote', day: 'day 0, just after fertilisation', pot: 'totipotent' },
    { name: '2-cell stage', day: 'about day 1 to 2', pot: 'totipotent' },
    { name: '4-cell stage', day: 'about day 2', pot: 'totipotent' },
    { name: '8-cell stage', day: 'about day 3', pot: 'totipotent' },
    { name: 'Morula', day: 'about day 3 to 4', pot: null },
    { name: 'Morula', day: 'about day 4', pot: null },
    { name: 'Blastocyst', day: 'about day 5', pot: 'inner cell mass pluripotent' },
    { name: 'Blastocyst', day: 'about day 5 to 6', pot: 'inner cell mass pluripotent' }
  ];
  const cellCount = (k) => Math.pow(2, k);
  const countText = (k) => (k >= 6 ? 'about ' : '') + cellCount(k) + (k === 0 ? ' cell' : ' cells');
  /* Cells of the solid stages as [x, y, r, front] in units of the space inside the zona. */
  function ring(n, rad, r, a0, front) {
    const out = [];
    for (let j = 0; j < n; j++) { const a = a0 + (j / n) * Math.PI * 2; out.push([Math.cos(a) * rad, Math.sin(a) * rad, r, front]); }
    return out;
  }
  const SOLID = [
    [[0, 0, 0.97, 1]],
    [[-0.48, 0, 0.5, 1], [0.48, 0, 0.5, 1]],
    ring(3, 0.48, 0.47, Math.PI / 2, 0).concat([[0, 0, 0.42, 1]]),
    ring(4, 0.5, 0.38, Math.PI / 4, 0).concat(ring(4, 0.3, 0.36, 0, 1)),
    ring(10, 0.66, 0.28, 0, 0).concat(ring(6, 0.3, 0.27, 0.3, 1)),
    ring(16, 0.74, 0.2, 0, 0).concat(ring(10, 0.45, 0.2, 0.2, 0), ring(6, 0.17, 0.19, 0.5, 1))
  ];
  const ICM = {
    6: { r: 0.11, rows: [[-0.66, [-0.2, 0, 0.2]], [-0.48, [-0.3, -0.1, 0.1, 0.3]], [-0.31, [-0.1, 0.1]]] },
    7: { r: 0.085, rows: [[-0.72, [-0.24, -0.08, 0.08, 0.24]], [-0.57, [-0.32, -0.16, 0, 0.16, 0.32]], [-0.42, [-0.24, -0.08, 0.08, 0.24]], [-0.28, [0]]] }
  };

  function devLayout(w) {
    const wide = w >= 640;
    if (wide) { const Rz = 132; return { wide, Rz, ox: 26 + Rz, oy: 44 + Rz, lx: 26 + 2 * Rz + 40, ly: 70, lw: w - (26 + 2 * Rz + 40) - 20 }; }
    const Rz = Math.min((w - 40) / 2, 122);
    return { wide, Rz, ox: w / 2, oy: 40 + Rz, lx: 16, ly: 40 + 2 * Rz + 26, lw: w - 32 };
  }

  function marker(ctx, x, y, n) {
    Sim.circle(ctx, x, y, 9, { fill: C.navy, stroke: '#fff', width: 1.5 });
    Sim.text(ctx, String(n), x, y + 0.5, { size: 11, bold: true, color: '#fff', align: 'center' });
  }

  Sim.create('#sim-bio-3c-cleavage', {
    title: 'From zygote to blastocyst',
    alt: 'An early embryo inside the zona pellucida, dividing from one cell into a morula and then a blastocyst with an inner cell mass',
    height: (w) => { const L = devLayout(w); return L.wide ? 2 * L.Rz + 66 : L.ly + 4 * 23 + 12; },
    controls: [
      { key: 'k', label: 'Mitotic divisions since fertilisation', min: 0, max: 7, step: 1, value: 0, format: (v) => v.toFixed(0) + ' → ' + countText(v) }
    ],
    draw(s) {
      const { ctx, p } = s;
      const L = devLayout(s.w);
      const k = p.k, st = DEV[k];
      const { ox, oy, Rz } = L;
      const zin = k === 7 ? 0.9 : 0.86;
      const Rc = Rz * zin * 0.985;
      const P = (x, y) => [ox + x * Rc, oy + y * Rc];

      Sim.text(ctx, st.name + ': ' + countText(k) + ', ' + st.day, L.wide ? 20 : 12, 18, { size: 14.5, bold: true, color: C.navy });
      // zona pellucida
      Sim.circle(ctx, ox, oy, Rz, { fill: '#f1f3f5', stroke: '#adb5bd', width: 1.5 });
      Sim.circle(ctx, ox, oy, Rz * zin, { fill: '#fff', stroke: '#ced4da', width: 1 });
      const legend = [['zona pellucida', 'a glycoprotein layer that came from the egg']];
      const marks = [[ox + Math.cos(-0.6) * Rz * (1 + zin) / 2, oy + Math.sin(-0.6) * Rz * (1 + zin) / 2]];

      if (k <= 5) {
        const cells = SOLID[k];
        const back = cells.filter((c) => !c[3]), front = cells.filter((c) => c[3]);
        back.concat(front).forEach((c) => {
          const [x, y] = P(c[0], c[1]);
          const r = c[2] * Rc;
          Sim.circle(ctx, x, y, r, { fill: c[3] ? '#fff3bf' : '#ffe8a1', stroke: '#e67700', width: 1.5 });
          if (r > 9) Sim.circle(ctx, x - r * 0.12, y - r * 0.1, Math.max(2, r * 0.22), { fill: 'rgba(230,119,0,0.55)' });
        });
        const c0 = front[0];
        marks.push(P(c0[0] + c0[2] * 0.35, c0[1] + c0[2] * 0.45));
        if (k <= 3) legend.push([k === 0 ? 'the zygote: one totipotent cell' : 'one cell: still totipotent', 'it could form every cell type, including the placenta']);
        else legend.push(['morula: a solid ball of cells', 'the cells keep dividing but do not grow, so each is smaller']);
      } else {
        const r1 = k === 7 ? 0.84 : 0.79, r2 = 0.985;
        const m = k === 7 ? 30 : 22;
        Sim.circle(ctx, ox, oy, r1 * Rc, { fill: '#e7f5ff' });
        for (let j = 0; j < m; j++) {
          const a0 = (j / m) * Math.PI * 2, a1 = ((j + 1) / m) * Math.PI * 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(ox, oy, r2 * Rc, a0, a1);
          ctx.arc(ox, oy, r1 * Rc, a1, a0, true);
          ctx.closePath();
          ctx.fillStyle = '#e5dbff';
          ctx.strokeStyle = '#7048e8';
          ctx.lineWidth = 1.2;
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          const am = (a0 + a1) / 2, rm = ((r1 + r2) / 2) * Rc;
          ell(ctx, ox + Math.cos(am) * rm, oy + Math.sin(am) * rm, 2.6, 1.6, { fill: '#7048e8', rot: am + Math.PI / 2 });
        }
        const icm = ICM[k];
        icm.rows.forEach(([y, xs]) => xs.forEach((x) => {
          const [X, Y] = P(x, y);
          Sim.circle(ctx, X, Y, icm.r * Rc * 1.08, { fill: '#b2f2bb', stroke: '#2b8a3e', width: 1.3 });
          Sim.circle(ctx, X, Y, Math.max(1.5, icm.r * Rc * 0.3), { fill: 'rgba(43,138,62,0.6)' });
        }));
        marks.push([ox + Math.cos(0.5) * ((r1 + r2) / 2) * Rc, oy + Math.sin(0.5) * ((r1 + r2) / 2) * Rc]);
        marks.push(P(0.12, icm.rows[1][0]));
        marks.push(P(0.18, 0.3));
        legend.push(['trophoblast (outer layer)', 'will form the placenta']);
        legend.push(['inner cell mass: pluripotent', 'forms the body of the embryo; source of embryonic stem cells']);
        legend.push(['fluid-filled cavity', '']);
      }
      marks.forEach((q, i) => marker(ctx, q[0], q[1], i + 1));

      // legend
      let y = L.ly;
      legend.forEach((lg, i) => {
        marker(ctx, L.lx + 9, y + 8, i + 1);
        if (L.wide) {
          y = para(ctx, lg[0], L.lx + 26, y, L.lw - 26, { size: 13.5, bold: true, color: C.ink });
          if (lg[1]) y = para(ctx, lg[1], L.lx + 26, y, L.lw - 26, { size: 12.5, color: C.muted });
          y += 10;
        } else {
          Sim.text(ctx, lg[0], L.lx + 26, y + 8, { size: 13, bold: true, color: C.ink });
          y += 23;
        }
      });
      if (L.wide) {
        y += 4;
        para(ctx, 'The whole embryo stays about 0.1 mm across: the zygote divides by mitosis without growing.', L.lx, y, L.lw, { size: 12.5, italic: true, color: C.muted });
      }
    },
    readout(s) {
      const k = s.p.k, n = cellCount(k), st = DEV[k];
      const d = Math.round(100 * Math.pow(n, -1 / 3));
      const out = [
        ['stage:', st.name, true],
        ['cells:', countText(k).replace(/ cells?$/, '')],
        ['age:', st.day],
        [k === 0 ? 'zygote:' : 'each cell, on average:', 'about ' + d + ' µm across' + (k ? ', 1/' + n + ' of the zygote’s volume' : '')],
        ['whole embryo:', 'about 0.1 mm across']
      ];
      if (st.pot) out.push(['potency:', st.pot]);
      return out;
    }
  });

  /* ======================================================================
     2. Differential gene expression
     ====================================================================== */
  const GENES = [
    { key: 'resp', l1: 'respiration', l2: 'enzymes', col: '#f08c00', tfCol: '#868e96' },
    { key: 'stem', l1: 'stem cell', l2: 'genes', col: '#1098ad', tfCol: '#0b7285' },
    { key: 'myo', l1: 'myosin', l2: '', col: '#e03131', tfCol: '#a61e4d' },
    { key: 'ins', l1: 'insulin', l2: '', col: '#2f9e44', tfCol: '#2b8a3e' },
    { key: 'dop', l1: 'dopamine', l2: 'enzyme', col: '#7048e8', tfCol: '#5f3dc4' }
  ];
  const GENE_NAME = { resp: 'respiration enzymes', stem: 'stem cell genes', myo: 'myosin', ins: 'insulin', dop: 'dopamine-making enzyme' };
  const TYPE = {
    stem: { name: 'Unspecialised stem cell', text: 'Only the genes every cell needs and the stem cell genes are on. It can still divide and give rise to other cell types.' },
    mus: { name: 'Muscle cell', text: 'Long and full of the contractile protein myosin, so it can contract.' },
    pan: { name: 'Insulin-secreting cell of the pancreas', text: 'Packed with vesicles of insulin, ready to be released by exocytosis.' },
    ner: { name: 'Nerve cell', text: 'Long extensions, and the enzyme that makes dopamine, a chemical it releases to pass on signals.' },
    mixed: { name: 'Not a real cell type', text: 'No normal cell makes this mix of proteins: each type of cell switches on its own set of genes.' }
  };
  function expressed(p) {
    const any = p.mus || p.pan || p.ner;
    return { resp: true, stem: !any, myo: !!p.mus, ins: !!p.pan, dop: !!p.ner };
  }
  function cellType(p) {
    const on = ['mus', 'pan', 'ner'].filter((k) => p[k]);
    return on.length === 0 ? 'stem' : on.length > 1 ? 'mixed' : on[0];
  }
  function geneLayout(w) {
    const wide = w >= 700;
    const y0 = 28;
    const L = { wide, y0, tagY: y0 + 14, l1Y: y0 + 30, l2Y: y0 + 43, dnaY: y0 + 68, envY: y0 + 108 };
    L.gapY = L.envY + 30;
    L.cellTop = L.envY + 48;
    L.Rb = wide ? 52 : 44;
    L.cx = wide ? Math.round(w * 0.3) : Math.round(w * 0.42);
    L.cy = L.cellTop + 26 + L.Rb * 1.25;
    L.tx = wide ? Math.round(w * 0.6) : 16;
    L.ty = wide ? L.cellTop + 4 : L.cy + L.Rb * 1.3 + 18;
    L.tw = wide ? w - Math.round(w * 0.6) - 20 : w - 32;
    return L;
  }
  const GOLD = 2.399963;

  Sim.create('#sim-bio-3c-genes', {
    title: 'Differential gene expression',
    alt: 'A stretch of DNA with five genes; switching transcription factors on makes some genes produce mRNA, and the cell below changes to match the proteins it makes',
    height: (w) => (w >= 700 ? 400 : 480),
    controls: [
      { key: 'mus', type: 'check', label: 'Muscle transcription factor', value: false },
      { key: 'pan', type: 'check', label: 'Pancreas transcription factor', value: false },
      { key: 'ner', type: 'check', label: 'Nerve transcription factor', value: false },
      { type: 'button', label: 'Back to a stem cell', ghost: true, onClick: (s) => { s.set('mus', false); s.set('pan', false); s.set('ner', false); } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      s.state = { lv: { resp: 1, stem: 1, myo: 0, ins: 0, dop: 0 }, rna: [], acc: [0, 0, 0, 0, 0] };
    },
    update(s, dt) {
      const st = s.state;
      const ex = expressed(s.p);
      GENES.forEach((g, i) => {
        const target = ex[g.key] ? 1 : 0;
        st.lv[g.key] += (target - st.lv[g.key]) * Math.min(1, dt * 1.4);
        if (ex[g.key]) {
          st.acc[i] += dt * 2.6;
          while (st.acc[i] >= 1) { st.acc[i] -= 1; st.rna.push({ g: i, u: 0.15 + Math.random() * 0.7, t: 0, ph: Math.random() * 6 }); }
        } else st.acc[i] = 0;
      });
      st.rna.forEach((r) => { r.t += dt * 0.45; });
      st.rna = st.rna.filter((r) => r.t < 1);
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const L = geneLayout(w);
      const ex = expressed(p);
      const lv = st.lv;

      /* the nucleus: the same five genes in every cell */
      Sim.text(ctx, 'Inside the nucleus: every cell has all five genes', 12, 14, { size: L.wide ? 14 : 12.5, bold: true, color: C.navy });
      Sim.rect(ctx, 8, L.y0, w - 16, L.envY - L.y0, { fill: 'rgba(229,219,255,0.45)', r: 10 });
      const sw = (w - 32) / 5;
      const slots = GENES.map((g, i) => {
        const x = 16 + i * sw;
        return { x, pr0: x + 4, pr1: x + 16, g0: x + 19, g1: x + sw - 5, mid: x + 19 + (sw - 24) / 2 };
      });
      // DNA double strand
      ctx.save();
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 1.6;
      [-1, 1].forEach((sg) => {
        ctx.beginPath();
        for (let x = 12; x <= w - 12; x += 3) { const y = L.dnaY + sg * 4 * Math.cos((x - 12) / 9); if (x === 12) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
        ctx.stroke();
      });
      ctx.restore();
      GENES.forEach((g, i) => {
        const sl = slots[i];
        const on = ex[g.key];
        Sim.rect(ctx, sl.pr0, L.dnaY - 6, sl.pr1 - sl.pr0, 12, { fill: '#dee2e6', stroke: '#868e96', width: 1, r: 2 });
        Sim.rect(ctx, sl.g0, L.dnaY - 8, sl.g1 - sl.g0, 16, { fill: on ? g.col : '#e9ecef', stroke: g.col, width: on ? 1.5 : 1.2, r: 3 });
        if (on) {   // transcription factor bound to the promoter
          Sim.circle(ctx, (sl.pr0 + sl.pr1) / 2, L.dnaY - 13, 7.5, { fill: g.tfCol, stroke: '#fff', width: 1.5 });
        }
        Sim.text(ctx, on ? 'ON' : 'off', sl.mid, L.tagY, { size: 11.5, bold: true, color: on ? '#2b8a3e' : C.grey, align: 'center' });
        Sim.text(ctx, g.l1, sl.mid, L.l1Y, { size: 11.5, bold: on, color: on ? C.ink : C.muted, align: 'center' });
        if (g.l2) Sim.text(ctx, g.l2, sl.mid, L.l2Y, { size: 11.5, bold: on, color: on ? C.ink : C.muted, align: 'center' });
      });
      // nuclear envelope with a pore under each gene
      [0, 4].forEach((d) => {
        let x = 8;
        slots.forEach((sl) => {
          Sim.line(ctx, x, L.envY + d, sl.mid - 6, L.envY + d, { color: '#5f3dc4', width: 1.4, cap: 'butt' });
          x = sl.mid + 6;
        });
        Sim.line(ctx, x, L.envY + d, w - 8, L.envY + d, { color: '#5f3dc4', width: 1.4, cap: 'butt' });
      });
      // mRNA moving out through the pores
      st.rna.forEach((r) => {
        const sl = slots[r.g];
        const x0 = lerp(sl.g0, sl.g1, r.u);
        const y = lerp(L.dnaY + 10, L.envY + 24, r.t);
        const x = lerp(x0, sl.mid, clamp(r.t * 1.5, 0, 1));
        const a = r.t < 0.8 ? 1 : (1 - r.t) / 0.2;
        const pts = [];
        for (let j = 0; j <= 6; j++) pts.push([x - 6 + j * 2, y + Math.sin(j * 1.4 + r.ph + r.t * 12) * 2]);
        Sim.polyline(ctx, pts, { color: GENES[r.g].col, width: 2, alpha: a });
      });
      Sim.circle(ctx, slots[0].pr0 + 4, L.dnaY + 22, 4, { fill: GENES[0].tfCol });
      Sim.text(ctx, '= transcription factor bound to the promoter', slots[0].pr0 + 12, L.dnaY + 22, { size: 10.5, color: C.muted });
      Sim.text(ctx, L.wide ? 'mRNA leaves through the nuclear pores and is translated on ribosomes into proteins' : 'mRNA leaves through pores; ribosomes make the proteins', w / 2, L.gapY, { size: L.wide ? 12.5 : 11.5, italic: true, color: C.muted, align: 'center' });

      /* the cell */
      const type = cellType(p);
      const Rb = L.Rb, cx = L.cx - lv.dop * Rb * 0.7, cy = L.cy;
      const m = lv.myo, n = lv.dop, b = lv.ins;
      const rx = Rb * (1 + 1.4 * m), ry = Rb * (1 - 0.32 * m);
      const FILL = '#fff9db', EDGE = '#e67700';
      // nerve processes: outline first
      const procs = [];
      if (n > 0.01) {
        [2.6, 3.1, 3.7, 2.0, 4.3].forEach((a, j) => {
          const len = Rb * (0.65 + 0.15 * (j % 2)) * n;
          const x1 = cx + Math.cos(a) * rx * 0.9, y1 = cy + Math.sin(a) * ry * 0.9;
          const x2 = cx + Math.cos(a) * (rx + len), y2 = cy + Math.sin(a) * (ry + len);
          procs.push([x1, y1, x2, y2, 5]);
          procs.push([x2 - Math.cos(a) * len * 0.35, y2 - Math.sin(a) * len * 0.35, x2 + Math.cos(a + 0.6) * len * 0.35, y2 + Math.sin(a + 0.6) * len * 0.35, 3]);
          procs.push([x2 - Math.cos(a) * len * 0.35, y2 - Math.sin(a) * len * 0.35, x2 + Math.cos(a - 0.6) * len * 0.35, y2 + Math.sin(a - 0.6) * len * 0.35, 3]);
        });
        const ax2 = cx + rx + Rb * 2.1 * n;
        procs.push([cx + rx * 0.9, cy, ax2, cy, 6]);
        [-0.7, 0, 0.7].forEach((a) => procs.push([ax2, cy, ax2 + Math.cos(a) * 14 * n, cy + Math.sin(a) * 14 * n, 3]));
      }
      procs.forEach((q) => Sim.line(ctx, q[0], q[1], q[2], q[3], { color: EDGE, width: q[4] + 3 }));
      ell(ctx, cx, cy, rx, ry, { fill: FILL, stroke: EDGE, width: 2.2 });
      procs.forEach((q) => Sim.line(ctx, q[0], q[1], q[2], q[3], { color: FILL, width: q[4] }));
      if (n > 0.01) {
        const ax2 = cx + rx + Rb * 2.1 * n;
        [-0.7, 0, 0.7].forEach((a) => {
          const X = ax2 + Math.cos(a) * 14 * n, Y = cy + Math.sin(a) * 14 * n;
          Sim.circle(ctx, X, Y, 5 * n + 1, { fill: FILL, stroke: EDGE, width: 1.5 });
          Sim.circle(ctx, X + 1, Y, 1.6, { fill: GENES[4].col });
        });
      }
      // myosin filaments
      if (m > 0.01) {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx - 3, ry - 3, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = m * 0.75;
        for (let j = -2; j <= 2; j++) {
          const y = cy + j * ry * 0.34;
          for (let x = cx - rx; x <= cx + rx; x += 8) Sim.line(ctx, x, y - ry * 0.11, x, y + ry * 0.11, { color: GENES[2].col, width: 3.2, cap: 'butt' });
        }
        ctx.restore();
      }
      // mitochondria (respiration enzymes, in every cell)
      [0.4, 1.5, 2.6, 3.7, 5.0].forEach((a) => ell(ctx, cx + Math.cos(a) * rx * 0.7, cy + Math.sin(a) * ry * 0.7, 6, 3.2, { fill: '#ffd8a8', stroke: GENES[0].col, width: 1.2, rot: a }));
      // insulin vesicles and dopamine in the cell body
      for (let j = 0; j < 22; j++) {
        const a = j * GOLD, t = 0.58 + 0.34 * ((j * 0.618) % 1);
        if (b > 0.01) Sim.circle(ctx, cx + Math.cos(a) * rx * t, cy + Math.sin(a) * ry * t, 3, { fill: 'rgba(47,158,68,' + b + ')' });
      }
      if (n > 0.01) for (let j = 0; j < 8; j++) { const a = j * GOLD + 1; Sim.circle(ctx, cx + Math.cos(a) * rx * 0.62, cy + Math.sin(a) * ry * 0.62, 1.8, { fill: 'rgba(112,72,232,' + n + ')' }); }
      // nucleus
      ell(ctx, cx, cy, Rb * 0.4 * (1 + 0.35 * m), Rb * 0.4 * (1 - 0.15 * m), { fill: '#e5dbff', stroke: '#5f3dc4', width: 1.6 });
      Sim.text(ctx, 'nucleus', cx, cy, { size: 10.5, color: '#5f3dc4', align: 'center' });

      /* what the cell has become */
      const T = TYPE[type];
      let y = L.ty;
      y = para(ctx, T.name, L.tx, y, L.tw, { size: 15, bold: true, color: type === 'mixed' ? C.red : C.navy }) + 2;
      y = para(ctx, T.text, L.tx, y, L.tw, { size: 13, color: C.ink }) + 8;
      const key = [
        ['mitochondria (respiration enzymes)', GENES[0].col, true],
        ['myosin filaments', GENES[2].col, ex.myo],
        ['vesicles of insulin', GENES[3].col, ex.ins],
        ['dopamine in vesicles', GENES[4].col, ex.dop]
      ].filter((q) => q[2]);
      if (L.wide) {
        key.forEach((q) => {
          Sim.circle(ctx, L.tx + 6, y + 8, 5, { fill: q[1] });
          Sim.text(ctx, q[0], L.tx + 18, y + 8, { size: 12.5, color: C.ink });
          y += 21;
        });
      }
    },
    readout(s) {
      const ex = expressed(s.p);
      const on = GENES.filter((g) => ex[g.key]).map((g) => GENE_NAME[g.key]);
      const off = GENES.filter((g) => !ex[g.key]).map((g) => GENE_NAME[g.key]);
      return [
        ['cell:', TYPE[cellType(s.p)].name, true],
        ['genes present:', 'all 5, in every cell'],
        ['switched on:', on.join(', ')],
        ['switched off:', off.length ? off.join(', ') : 'none']
      ];
    }
  });
})();
