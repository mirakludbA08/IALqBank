/* Topic 4: Introductory organic chemistry and alkanes — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const SUBD = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const sub = (v) => String(v).replace(/[0-9]/g, (d) => SUBD[+d]);
  /* CₙHₘ with a subscript 1 left out (CH₄, not C₁H₄) */
  const formula = (c, h) => 'C' + (c > 1 ? sub(c) : '') + (h > 0 ? 'H' + (h > 1 ? sub(h) : '') : '');
  /* HTML version for the readouts */
  const hformula = (c, h) => 'C' + (c > 1 ? '<sub>' + c + '</sub>' : '') + 'H' + (h > 1 ? '<sub>' + h + '</sub>' : '');
  /* Canvas text with real subscripts: Unicode subscript digits in the string
     are drawn as smaller, lowered digits; ⁺ and ⁻ as raised charges. */
  const SUPC = { '⁺': '+', '⁻': '−' };
  function ctext(ctx, str, x, y, o) {
    o = o || {};
    const size = o.size || 14;
    const runs = [];
    for (const ch of String(str)) {
      const k = SUBD.indexOf(ch) >= 0 ? 1 : SUPC[ch] ? 2 : 0;
      const t = k === 1 ? String(SUBD.indexOf(ch)) : k === 2 ? SUPC[ch] : ch;
      if (runs.length && runs[runs.length - 1][1] === k) runs[runs.length - 1][0] += t;
      else runs.push([t, k]);
    }
    const font = (k) => (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + (k ? size * 0.72 : size) + 'px ' + Sim.font;
    ctx.save();
    let total = 0;
    runs.forEach(([t, k]) => { ctx.font = font(k); total += ctx.measureText(t).width; });
    let x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    if (o.bg) Sim.rect(ctx, x0 - 4, y - size / 2 - 4, total + 8, size + 8, { fill: o.bg, r: 4 });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = o.color || C.ink;
    runs.forEach(([t, k]) => {
      ctx.font = font(k);
      ctx.fillText(t, x0, y + (k === 1 ? size * 0.28 : k === 2 ? -size * 0.32 : 0));
      x0 += ctx.measureText(t).width;
    });
    ctx.restore();
    return total;
  }
  const ALKANE = ['methane', 'ethane', 'propane', 'butane', 'pentane', 'hexane', 'heptane', 'octane', 'nonane', 'decane',
    'undecane', 'dodecane', 'tridecane', 'tetradecane', 'pentadecane', 'hexadecane'];
  const ALKENE = ['', 'ethene', 'propene', 'a butene', 'a pentene', 'a hexene', 'a heptene', 'an octene', 'a nonene', 'a decene',
    'an undecene', 'a dodecene', 'a tridecene', 'a tetradecene'];

  /* ======================================================================
     1. Boiling temperatures of alkanes: chain length and branching
     ====================================================================== */
  /* Skeletons in bond-length units: a zig-zag chain, plus any branches. */
  const zig = (n) => Array.from({ length: n }, (_, i) => [i * 0.866, i % 2 ? -0.5 : 0]);
  function chain(n, extras) {
    const atoms = zig(n);
    const bonds = [];
    for (let i = 0; i < n - 1; i++) bonds.push([i, i + 1]);
    (extras || []).forEach(([at, pt]) => { atoms.push(pt); bonds.push([at, atoms.length - 1]); });
    return { atoms, bonds };
  }
  const UP = [1, [0.866, -1.5]];                                // a methyl pointing up from carbon 2
  const PAIR = [[1, [0.366, -1.366]], [1, [1.366, -1.366]]];     // two methyls on carbon 2
  const BP_STRAIGHT = [-161.5, -88.6, -42.1, -0.5, 36.1, 68.7, 98.4, 125.6, 150.8, 174.1];
  const STRAIGHT = BP_STRAIGHT.map((bp, i) => Object.assign({ n: i + 1, name: ALKANE[i], bp, kind: 'straight' }, chain(i + 1)));
  const BRANCHED = [
    Object.assign({ n: 4, name: '2-methylpropane', bp: -11.7, kind: 'one' }, { atoms: [[0, 0], [-0.866, 0.5], [0.866, 0.5], [0, -1]], bonds: [[0, 1], [0, 2], [0, 3]] }),
    Object.assign({ n: 5, name: '2-methylbutane', bp: 27.8, kind: 'one' }, chain(4, [UP])),
    Object.assign({ n: 5, name: '2,2-dimethylpropane', bp: 9.5, kind: 'more' }, { atoms: [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] }),
    Object.assign({ n: 6, name: '2-methylpentane', bp: 60.3, kind: 'one' }, chain(5, [UP])),
    Object.assign({ n: 6, name: '2,2-dimethylbutane', bp: 49.7, kind: 'more' }, chain(4, PAIR)),
    Object.assign({ n: 7, name: '2-methylhexane', bp: 90.0, kind: 'one' }, chain(6, [UP])),
    Object.assign({ n: 7, name: '2,2,3-trimethylbutane', bp: 80.9, kind: 'more' }, chain(4, PAIR.concat([[2, [1.732, 1]]]))),
    Object.assign({ n: 8, name: '2-methylheptane', bp: 117.6, kind: 'one' }, chain(7, [UP])),
    Object.assign({ n: 8, name: '2,2,4-trimethylpentane', bp: 99.2, kind: 'more' }, chain(5, PAIR.concat([[3, [2.598, -1.5]]])))
  ];

  function pickAlkane(n, shape) {
    const straight = STRAIGHT[n - 1];
    if (shape === 'straight') return { mol: straight };
    if (n < 4) return { mol: straight, note: 'With 1, 2 or 3 carbon atoms there is only one way to join them, so there are no branched isomers.' };
    if (n > 8) return { mol: straight, note: 'Branched isomers are plotted only up to eight carbon atoms.' };
    let m = BRANCHED.find((b) => b.n === n && b.kind === shape);
    let note = null;
    if (!m) { m = BRANCHED.find((b) => b.n === n); note = 'Butane has only one branched isomer, 2-methylpropane.'; }
    return { mol: m, note };
  }

  /* Pack a second copy of the molecule against the first as closely as the
     "electron clouds" allow, trying both orientations and a range of sideways
     shifts, and keep the arrangement with the most close contacts. */
  const DMIN = 1.25, DCONTACT = 1.45, CLOUD = 0.6;
  const packCache = new Map();
  function packing(mol) {
    if (packCache.has(mol)) return packCache.get(mol);
    const A = mol.atoms;
    let best = null;
    [false, true].forEach((mirror) => {
      for (let k = -8; k <= 8; k++) {
        const sx = k * 0.2165;
        const B0 = A.map(([x, y]) => [x + sx, mirror ? -y : y]);
        let dy = 0;
        for (; dy < 8; dy += 0.01) {
          let md = 1e9;
          for (const a of A) for (const b of B0) md = Math.min(md, Math.hypot(a[0] - b[0], a[1] - b[1] - dy));
          if (md >= DMIN) break;
        }
        const B = B0.map(([x, y]) => [x, y + dy]);
        const contacts = [];
        A.forEach((a, i) => B.forEach((b, j) => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= DCONTACT) contacts.push([i, j]); }));
        if (!best || contacts.length > best.contacts.length || (contacts.length === best.contacts.length && Math.abs(sx) < Math.abs(best.sx))) {
          best = { B, contacts, sx };
        }
      }
    });
    packCache.set(mol, best);
    return best;
  }

  function drawPair(ctx, mol, box, label) {
    const P = packing(mol);
    const all = mol.atoms.concat(P.B);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    all.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    x0 -= CLOUD; x1 += CLOUD; y0 -= CLOUD; y1 += CLOUD;
    const sc = Math.min(box.w / (x1 - x0), (box.h - 26) / (y1 - y0), 44);
    const ox = box.x + (box.w - (x1 - x0) * sc) / 2 - x0 * sc;
    const oy = box.y + 4 + (box.h - 26 - (y1 - y0) * sc) / 2 - y0 * sc;
    const X = (p) => ox + p[0] * sc, Y = (p) => oy + p[1] * sc;
    const cloud = (atoms, col) => {
      ctx.save();
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2 * CLOUD * sc;
      if (mol.bonds.length === 0) { ctx.beginPath(); ctx.arc(X(atoms[0]), Y(atoms[0]), CLOUD * sc, 0, 7); ctx.fill(); }
      mol.bonds.forEach(([i, j]) => { ctx.beginPath(); ctx.moveTo(X(atoms[i]), Y(atoms[i])); ctx.lineTo(X(atoms[j]), Y(atoms[j])); ctx.stroke(); });
      ctx.restore();
    };
    const skeleton = (atoms) => {
      mol.bonds.forEach(([i, j]) => Sim.line(ctx, X(atoms[i]), Y(atoms[i]), X(atoms[j]), Y(atoms[j]), { color: C.ink, width: 2.2 }));
      atoms.forEach((a) => Sim.circle(ctx, X(a), Y(a), Math.max(2.2, sc * 0.09), { fill: C.ink }));
    };
    cloud(mol.atoms, '#d0ebff');
    cloud(P.B, '#ffe8cc');
    P.contacts.forEach(([i, j]) => {
      const a = mol.atoms[i], b = P.B[j];
      Sim.line(ctx, X(a), Y(a), X(b), Y(b), { color: C.red, width: 1.4, dash: [3, 3] });
    });
    skeleton(mol.atoms);
    skeleton(P.B);
    if (label) Sim.text(ctx, label, box.x + box.w / 2, box.y + box.h - 8, { size: 12, color: C.muted, align: 'center' });
  }

  Sim.create('#sim-chem-04-boiling', {
    title: 'Boiling temperatures of the alkanes',
    height: (w) => (w >= 640 ? 390 : 626),
    controls: [
      { key: 'n', label: 'Carbon atoms n', min: 1, max: 10, step: 1, value: 5, format: (v) => v.toFixed(0) },
      { key: 'shape', type: 'select', label: 'Shape of the molecule', value: 'straight', options: [['straight', 'Straight chain'], ['one', 'One methyl branch'], ['more', 'Most branched isomer']] }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const n = Math.round(p.n);
      const sel = pickAlkane(n, p.shape);
      const mol = sel.mol;
      const wide = w >= 640;
      const gb = wide ? { x: 64, y: 30, w: w * 0.56 - 70, h: h - 82 } : { x: 60, y: 30, w: w - 80, h: 280 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 11, ymin: -200, ymax: 200 }, gb));
      /* axes drawn by hand so that the x axis sits at the bottom, not at 0 °C */
      Sim.rect(ctx, gb.x, gb.y, gb.w, gb.h, { fill: '#fff' });
      for (let t = -200; t <= 200; t += 50) {
        const Y = g.py(t);
        Sim.line(ctx, gb.x, Y, gb.x + gb.w, Y, { color: C.grid, width: 1 });
        Sim.text(ctx, String(t).replace('-', '−'), gb.x - 6, Y, { size: 11, color: C.muted, align: 'right' });
      }
      for (let k = 1; k <= 10; k++) {
        const X = g.px(k);
        Sim.line(ctx, X, gb.y, X, gb.y + gb.h, { color: C.grid, width: 1 });
        Sim.text(ctx, String(k), X, gb.y + gb.h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.line(ctx, gb.x, gb.y + gb.h, gb.x + gb.w, gb.y + gb.h, { color: C.axis, width: 1.5 });
      Sim.line(ctx, gb.x, gb.y, gb.x, gb.y + gb.h, { color: C.axis, width: 1.5 });
      Sim.text(ctx, 'number of carbon atoms, n', gb.x + gb.w / 2, gb.y + gb.h + 24, { size: 12, bold: true, align: 'center', baseline: 'top' });
      Sim.text(ctx, 'boiling temperature / °C', gb.x - 46, gb.y + gb.h / 2, { size: 12, bold: true, align: 'center', rotate: -Math.PI / 2 });
      /* room temperature */
      g.hline(25, { color: C.orange, dash: [6, 4] });
      Sim.text(ctx, '25 °C', gb.x + 6, g.py(25) - 9, { size: 11, color: C.orange, align: 'left', bold: true });
      Sim.text(ctx, '↑ liquid at 25 °C', gb.x + gb.w - 6, g.py(25) - 10, { size: 10.5, color: C.muted, italic: true, align: 'right' });
      Sim.text(ctx, '↓ gas at 25 °C', gb.x + gb.w - 6, g.py(25) + 11, { size: 10.5, color: C.muted, italic: true, align: 'right' });
      /* the data */
      g.path(STRAIGHT.map((m) => [m.n, m.bp]), { color: C.blue, width: 2 });
      STRAIGHT.forEach((m) => g.dot(m.n, m.bp, { color: C.blue, r: 4.5 }));
      BRANCHED.forEach((m) => g.dot(m.n, m.bp, { color: m.kind === 'one' ? C.orange : C.purple, r: 4.5 }));
      const hx = g.px(mol.n), hy = g.py(mol.bp);
      Sim.circle(ctx, hx, hy, 9, { stroke: C.red, width: 2.5 });
      const left = mol.n >= 3;
      Sim.text(ctx, mol.name + ', ' + mol.bp.toFixed(1).replace('-', '−') + ' °C', clamp(hx + (left ? -12 : 12), gb.x + 4, gb.x + gb.w - 4), hy - 18,
        { size: 12, bold: true, color: C.red, align: left ? 'right' : 'left', bg: 'rgba(255,255,255,0.88)' });
      /* legend */
      const lx = gb.x + 10, ly = gb.y + 12;
      [['straight chain', C.blue], ['one branch', C.orange], ['most branched', C.purple]].forEach(([t, col], i) => {
        Sim.circle(ctx, lx + 5, ly + i * 17, 4.5, { fill: col });
        Sim.text(ctx, t, lx + 15, ly + i * 17, { size: 11.5, color: C.ink });
      });

      /* two neighbouring molecules */
      const box = wide ? { x: w * 0.58, y: 34, w: w * 0.42 - 14, h: h - 92 } : { x: 14, y: 388, w: w - 28, h: h - 400 };
      Sim.text(ctx, 'Two neighbouring molecules of ' + mol.name, box.x + box.w / 2, box.y - 14, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      drawPair(ctx, mol, { x: box.x, y: box.y + 4, w: box.w, h: box.h - (sel.note ? 34 : 6) },
        mol.n === 1 ? 'methane: each molecule is a small sphere' : 'red dotted lines: points of close contact');
      if (sel.note) {
        const words = sel.note.split(' ');
        let line1 = '', line2 = '';
        words.forEach((wd) => { if (Sim.measure(ctx, line1 + ' ' + wd, { size: 11.5 }) < box.w - 10 && !line2) line1 += (line1 ? ' ' : '') + wd; else line2 += (line2 ? ' ' : '') + wd; });
        Sim.text(ctx, line1, box.x + box.w / 2, box.y + box.h - 22, { size: 11.5, color: C.purple, align: 'center', italic: true });
        if (line2) Sim.text(ctx, line2, box.x + box.w / 2, box.y + box.h - 6, { size: 11.5, color: C.purple, align: 'center', italic: true });
      }
    },
    readout: (s) => {
      const n = Math.round(s.p.n);
      const sel = pickAlkane(n, s.p.shape);
      const m = sel.mol;
      const rows = [
        ['Alkane', m.name],
        ['Formula', hformula(n, 2 * n + 2)],
        ['Electrons per molecule', String(8 * n + 2)],
        ['Boiling temperature', m.bp.toFixed(1).replace('-', '−') + ' °C', true],
        ['At 25 °C it is a', m.bp < 25 ? 'gas' : 'liquid']
      ];
      if (m.kind !== 'straight') rows.push(['Straight-chain isomer boils', (STRAIGHT[n - 1].bp - m.bp).toFixed(1) + ' °C higher']);
      return rows;
    }
  });

  /* ======================================================================
     2. Free-radical substitution: the chain reaction of methane and chlorine
     ====================================================================== */
  const VW = 520, VH = 300;
  const MSTR = ['CH₄', 'CH₃Cl', 'CH₂Cl₂', 'CHCl₃', 'CCl₄'];
  const RSTR = ['•CH₃', '•CH₂Cl', '•CHCl₂', '•CCl₃'];
  const GSTR = ['CH₃', 'CH₂Cl', 'CHCl₂', 'CCl₃'];
  const COL = { C: '#343a40', Cl: '#40c057', H: '#ffffff', glow: 'rgba(255,212,59,0.55)' };
  const isRad = (sp) => sp === 'Cl' || sp[0] === 'R';
  const MIXES = { ch4: [48, 16], equal: [32, 32], cl2: [16, 48] };

  function newPart(st, sp, x, y, vx, vy, extra) {
    let a = Math.random() * Math.PI * 2;
    const v = 85 * (0.8 + 0.4 * Math.random());
    if (vx == null) { vx = Math.cos(a) * v; vy = Math.sin(a) * v; }
    const q = Object.assign({ sp, x: clamp(x, 8, VW - 8), y: clamp(y, 8, VH - 8), vx, vy, rot: Math.random() * 6.28, spin: (Math.random() - 0.5) * 2 }, extra || {});
    return q;
  }
  function speedFix(q) {
    const v = Math.hypot(q.vx, q.vy) || 1;
    const t = 85 * (0.8 + 0.4 * Math.random());
    q.vx *= t / v; q.vy *= t / v;
    return q;
  }
  /* Draw one particle (centre x, y; scale k = px per virtual unit). */
  function drawSpecies(ctx, sp, x, y, k, rot, extra) {
    const rC = 6 * k, rCl = 6.5 * k, rH = 3.4 * k;
    const atom = (dx, dy, kind) => {
      const r = kind === 'C' ? rC : kind === 'Cl' ? rCl : rH;
      Sim.circle(ctx, x + dx, y + dy, r, { fill: COL[kind], stroke: kind === 'H' ? '#868e96' : 'rgba(0,0,0,0.35)', width: 1 });
    };
    const around = (subs, d, n) => subs.forEach((kind, i) => {
      const a = rot + (i * 2 * Math.PI) / n;
      atom(Math.cos(a) * d * (kind === 'Cl' ? 1.25 : 1), Math.sin(a) * d * (kind === 'Cl' ? 1.25 : 1), kind);
    });
    const glow = (r) => Sim.circle(ctx, x, y, r, { fill: COL.glow });
    if (sp === 'Cl2') {
      const dx = Math.cos(rot) * 5 * k, dy = Math.sin(rot) * 5 * k;
      atom(-dx, -dy, 'Cl'); atom(dx, dy, 'Cl');
    } else if (sp === 'Cl') {
      glow(11 * k); atom(0, 0, 'Cl');
      Sim.circle(ctx, x + 6.5 * k, y - 6.5 * k, Math.max(1.6, 1.8 * k), { fill: C.ink });
    } else if (sp === 'HCl') {
      atom(Math.cos(rot) * 7 * k, Math.sin(rot) * 7 * k, 'H'); atom(0, 0, 'Cl');
    } else if (sp[0] === 'M') {
      const nCl = +sp[1];
      const subs = [];
      for (let i = 0; i < 4; i++) subs.push(i < nCl ? 'Cl' : 'H');
      around(subs, 6.5 * k, 4); atom(0, 0, 'C');
    } else if (sp[0] === 'R') {
      const nCl = +sp[1];
      const subs = [];
      for (let i = 0; i < 3; i++) subs.push(i < nCl ? 'Cl' : 'H');
      glow(12 * k);
      around(subs, 6.5 * k, 3); atom(0, 0, 'C');
      Sim.circle(ctx, x - Math.cos(rot) * 2 * k, y - Math.sin(rot) * 2 * k, Math.max(1.6, 1.8 * k), { fill: '#ffd43b', stroke: C.ink, width: 1 });
    } else if (sp === 'E') {
      const dx = Math.cos(rot) * 5.5 * k, dy = Math.sin(rot) * 5.5 * k;
      atom(-dx * 1.9, -dy * 1.9, (extra && extra.k > 0) ? 'Cl' : 'H');
      atom(dx * 1.9, dy * 1.9, (extra && extra.k > 1) ? 'Cl' : 'H');
      atom(-dx, -dy, 'C'); atom(dx, dy, 'C');
    }
  }

  function addEvent(st, type, text, x, y) {
    st.count[type]++;
    st.log.unshift({ type, text });
    if (st.log.length > 5) st.log.pop();
    st.fx.push({ x, y, t: 0, type });
  }

  /* What happens when radical a meets particle b?  Returns null if nothing. */
  function outcome(a, b) {
    const A = a.sp, B = b.sp;
    if (A === 'Cl') {
      if (B[0] === 'M' && B !== 'M4') {   // hydrogen abstraction
        const k = +B[1];
        return { type: 'prop', text: 'Cl• + ' + MSTR[k] + ' → HCl + ' + RSTR[k], make: [['HCl', a], ['R' + k, b]] };
      }
      if (B === 'Cl') return { type: 'term', text: 'Cl• + Cl• → Cl₂', make: [['Cl2', null]] };
      if (B[0] === 'R') { const k = +B[1]; return { type: 'term', text: RSTR[k] + ' + Cl• → ' + MSTR[k + 1], make: [['M' + (k + 1), null]] }; }
      return null;
    }
    if (A[0] === 'R') {
      const k = +A[1];
      if (B === 'Cl2') return { type: 'prop', text: RSTR[k] + ' + Cl₂ → ' + MSTR[k + 1] + ' + Cl•', make: [['M' + (k + 1), a], ['Cl', b]] };
      if (B === 'Cl') return { type: 'term', text: RSTR[k] + ' + Cl• → ' + MSTR[k + 1], make: [['M' + (k + 1), null]] };
      if (B[0] === 'R') {
        const j = +B[1];
        const name = k + j === 0 ? 'CH₃CH₃' : GSTR[Math.min(k, j)] + GSTR[Math.max(k, j)];
        return { type: 'term', text: RSTR[k] + ' + ' + RSTR[j] + ' → ' + name, make: [['E', null, { k: k + j }]] };
      }
    }
    return null;
  }

  function radicalStep(st, dt) {
    const P = st.parts;
    /* initiation: UV splits Cl–Cl, the weakest bond present */
    if (st.uv) {
      for (const q of P) {
        if (q.sp !== 'Cl2' || q.dead) continue;
        if (Math.random() < 0.02 * dt) {
          q.dead = true;
          const id = ++st.id;
          const ux = Math.cos(q.rot), uy = Math.sin(q.rot);
          st.born.push(newPart(st, 'Cl', q.x - ux * 6, q.y - uy * 6, -ux * 85, -uy * 85, { grp: id, gt: st.time }));
          st.born.push(newPart(st, 'Cl', q.x + ux * 6, q.y + uy * 6, ux * 85, uy * 85, { grp: id, gt: st.time }));
          addEvent(st, 'init', 'Cl₂ → 2Cl•', q.x, q.y);
        }
      }
    }
    /* Radicals are drawn towards each other a little: two radicals pair up
       their electrons whenever they come within RR, other partners within R. */
    const R2 = 15 * 15, RR2 = 34 * 34;
    for (const a of P) {
      if (a.dead || !isRad(a.sp)) continue;
      for (const b of P) {
        if (b === a || b.dead) continue;
        if (a.grp && a.grp === b.grp && st.time - a.gt < 0.6) continue;   // newly separated partners
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy > (isRad(b.sp) ? RR2 : R2)) continue;
        const out = outcome(a, b);
        if (!out) continue;
        a.dead = b.dead = true;
        const id = ++st.id;
        out.make.forEach(([sp, from, extra]) => {
          let q;
          if (from) q = newPart(st, sp, from.x, from.y, from.vx, from.vy, Object.assign({ grp: id, gt: st.time }, extra));
          else q = speedFix(newPart(st, sp, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.vx + b.vx) / 2 + 1, (a.vy + b.vy) / 2, Object.assign({ grp: id, gt: st.time }, extra)));
          st.born.push(q);
        });
        addEvent(st, out.type, out.text, (a.x + b.x) / 2, (a.y + b.y) / 2);
        break;
      }
    }
    st.parts = P.filter((q) => !q.dead).concat(st.born);
    st.born = [];
  }

  function countOf(st, sp) { return st.parts.reduce((n, q) => n + (q.sp === sp ? 1 : 0), 0); }

  Sim.create('#sim-chem-04-radical', {
    title: 'Methane + chlorine in UV light: a chain reaction',
    height: (w) => (w >= 680 ? 400 : Math.round((w - 24) * VH / VW + 345)),
    controls: [
      { key: 'uv', type: 'check', label: 'UV light on', value: true },
      { key: 'mix', type: 'select', label: 'Starting mixture (restarts)', value: 'equal', options: [['ch4', 'Excess methane (3 : 1)'], ['equal', 'Equal amounts (1 : 1)'], ['cl2', 'Excess chlorine (1 : 3)']], onChange: (s) => s.reset() },
      { key: 'spd', label: 'Speed', min: 0.25, max: 3, step: 0.25, value: 1, format: (v) => v.toFixed(2) + '×' }
    ],
    animate: true,
    init(s) {
      const [nm, nc] = MIXES[s.p.mix || 'equal'];
      const st = { parts: [], born: [], log: [], fx: [], count: { init: 0, prop: 0, term: 0 }, time: 0, id: 0, uv: true };
      const all = [];
      for (let i = 0; i < nm; i++) all.push('M0');
      for (let i = 0; i < nc; i++) all.push('Cl2');
      all.forEach((sp, i) => {
        const cols = 10, rows = Math.ceil(all.length / cols);
        const gx = (i % cols + 0.5) * VW / cols + (Math.random() - 0.5) * 20;
        const gy = (Math.floor(i / cols) + 0.5) * VH / rows + (Math.random() - 0.5) * 14;
        st.parts.push(newPart(st, sp, gx, gy));
      });
      for (let i = st.parts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = st.parts[i].sp; st.parts[i].sp = st.parts[j].sp; st.parts[j].sp = t; }
      s.state = st;
    },
    update(s, dt) {
      const st = s.state;
      dt *= s.p.spd;
      st.time += dt;
      st.uv = !!s.p.uv;
      for (const q of st.parts) {
        q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.spin * dt;
        if (q.x < 8) { q.x = 8; q.vx = Math.abs(q.vx); }
        if (q.x > VW - 8) { q.x = VW - 8; q.vx = -Math.abs(q.vx); }
        if (q.y < 8) { q.y = 8; q.vy = Math.abs(q.vy); }
        if (q.y > VH - 8) { q.y = VH - 8; q.vy = -Math.abs(q.vy); }
      }
      radicalStep(st, dt);
      st.fx.forEach((f) => { f.t += dt; });
      st.fx = st.fx.filter((f) => f.t < 0.7);
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const wide = w >= 680;
      const bw = wide ? Math.min(w * 0.6, (h - 60) * VW / VH) : w - 24;
      const k = bw / VW;
      const bh = VH * k;
      const bx = 12, by = 40;
      /* the lamp */
      const lampOn = !!s.p.uv;
      Sim.rect(ctx, bx + bw / 2 - 46, 6, 92, 18, { fill: lampOn ? '#7048e8' : '#adb5bd', r: 9 });
      Sim.text(ctx, lampOn ? 'UV lamp on' : 'UV lamp off', bx + bw / 2, 15, { size: 11.5, bold: true, color: '#fff', align: 'center' });
      if (lampOn) for (let i = -3; i <= 3; i++) Sim.line(ctx, bx + bw / 2 + i * 14, 26, bx + bw / 2 + i * 24, 36, { color: '#9775fa', width: 1.5 });
      Sim.rect(ctx, bx, by, bw, bh, { fill: lampOn ? '#f8f5ff' : '#f8f9fa', stroke: C.axis, width: 2, r: 6 });
      ctx.save();
      ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
      st.fx.forEach((f) => {
        const col = f.type === 'init' ? '124,58,237' : f.type === 'prop' ? '240,140,0' : '134,142,150';
        Sim.circle(ctx, bx + f.x * k, by + f.y * k, (10 + 40 * f.t) * k, { stroke: 'rgba(' + col + ',' + (1 - f.t / 0.7).toFixed(2) + ')', width: 2.5 });
      });
      st.parts.forEach((q) => drawSpecies(ctx, q.sp, bx + q.x * k, by + q.y * k, Math.max(0.75, k), q.rot, q));
      ctx.restore();

      /* side panel */
      const px = wide ? bx + bw + 18 : bx;
      let py = wide ? by : by + bh + 22;
      const pw = wide ? w - px - 10 : w - 24;
      const rowH = 21;
      const item = (sp, label, n, x, y, extra) => {
        drawSpecies(ctx, sp, x + 9, y, 0.85, 0.6, extra);
        ctext(ctx, label + '  ' + n, x + 24, y, { size: 12.5, color: n > 0 ? C.ink : C.grey, bold: n > 0 && isRad(sp) });
      };
      const heading = (t, y) => Sim.text(ctx, t, px, y, { size: 11, bold: true, color: C.navy });
      const colW = Math.min(140, (pw - 4) / (wide ? 2 : 3));
      heading('REACTANTS', py); py += rowH;
      item('M0', 'CH₄', countOf(st, 'M0'), px, py); item('Cl2', 'Cl₂', countOf(st, 'Cl2'), px + colW, py); py += rowH + 4;
      heading('FREE RADICALS (unpaired electron)', py); py += rowH;
      const otherR = countOf(st, 'R1') + countOf(st, 'R2') + countOf(st, 'R3');
      item('Cl', 'Cl•', countOf(st, 'Cl'), px, py); item('R0', '•CH₃', countOf(st, 'R0'), px + colW, py);
      if (!wide) item('R1', 'others', otherR, px + 2 * colW, py);
      py += rowH;
      if (wide) { item('R1', '•CH₂Cl etc.', otherR, px, py); py += rowH; }
      py += 4;
      heading('PRODUCTS', py); py += rowH;
      const prods = [['HCl', 'HCl'], ['M1', 'CH₃Cl'], ['M2', 'CH₂Cl₂'], ['M3', 'CHCl₃'], ['M4', 'CCl₄'], ['E', 'C₂ (e.g. C₂H₆)']];
      const per = wide ? 2 : 3;
      prods.forEach(([sp, lab], i) => {
        const c = sp === 'E' ? countOf(st, 'E') : countOf(st, sp);
        item(sp, lab, c, px + (i % per) * colW, py + Math.floor(i / per) * rowH, { k: 0 });
      });
      py += Math.ceil(prods.length / per) * rowH + 4;
      heading('LATEST STEPS', py); py += rowH - 2;
      const tcol = { init: C.purple, prop: C.orange, term: C.grey };
      const tlet = { init: 'I', prop: 'P', term: 'T' };
      if (!st.log.length) ctext(ctx, lampOn ? 'waiting for UV to split a Cl₂ molecule…' : 'no UV light, so no radicals form', px, py, { size: 12, color: C.muted, italic: true });
      st.log.slice(0, 5).forEach((e, i) => {
        const y = py + i * 19;
        Sim.circle(ctx, px + 7, y, 7, { fill: tcol[e.type] });
        Sim.text(ctx, tlet[e.type], px + 7, y + 0.5, { size: 10, bold: true, color: '#fff', align: 'center' });
        ctext(ctx, e.text, px + 20, y, { size: 12, color: i === 0 ? C.ink : C.muted, bold: i === 0 });
      });
    },
    readout: (s) => {
      const c = s.state.count;
      return [
        ['Initiation steps', String(c.init)],
        ['Propagation steps', String(c.prop), true],
        ['Termination steps', String(c.term)],
        ['Propagation steps per initiation', c.init ? (c.prop / c.init).toFixed(1) : '—']
      ];
    }
  });

  /* ======================================================================
     3. Cracking: break a long alkane into a shorter alkane and alkenes
     ====================================================================== */
  function fragments(n, cuts) {
    const list = [];
    let start = 0;
    const cs = Array.from(cuts).sort((a, b) => a - b);
    cs.forEach((c) => { list.push([start, c]); start = c + 1; });
    list.push([start, n - 1]);
    return list;   // inclusive atom index ranges
  }
  function crackState(st) {
    const frags = fragments(st.n, st.cuts);
    let alk = st.alk;
    if (alk >= frags.length) alk = 0;
    const len = (f) => f[1] - f[0] + 1;
    const ones = frags.map((f, i) => (len(f) === 1 ? i : -1)).filter((i) => i >= 0);
    let error = null;
    if (ones.length > 1) error = 'Two one-carbon pieces: only one of them could become methane, and a single carbon cannot form a C=C double bond.';
    else if (ones.length === 1) alk = ones[0];
    return { frags, alk, error, len };
  }
  function geometry(s, st, info) {
    const { w } = s;
    const m = 26, gap = info.frags.length > 1 ? 44 : 0;
    const sp = Math.min(50, (w - 2 * m - gap * (info.frags.length - 1)) / Math.max(1, st.n - 1));
    const total = sp * (st.n - 1) + gap * (info.frags.length - 1);
    const x0 = (w - total) / 2;
    const yMid = 110;
    const pos = [];
    info.frags.forEach((f, fi) => { for (let i = f[0]; i <= f[1]; i++) pos[i] = [x0 + i * sp + fi * gap, yMid + (i % 2 ? -9 : 9)]; });
    return { pos, sp };
  }

  Sim.create('#sim-chem-04-cracking', {
    title: 'Cracking: choose which C–C bonds break',
    height: 250,
    controls: [
      { key: 'alkane', type: 'select', label: 'Alkane to crack', value: '10', options: [['8', 'octane, C₈H₁₈'], ['10', 'decane, C₁₀H₂₂'], ['12', 'dodecane, C₁₂H₂₆'], ['14', 'tetradecane, C₁₄H₃₀'], ['16', 'hexadecane, C₁₆H₃₄']], onChange: (s) => s.reset() },
      { type: 'button', label: 'Clear breaks', onClick: (s) => { s.state.cuts.clear(); s.state.alk = 0; } }
    ],
    init(s) { s.state = { n: +(s.p.alkane || 10), cuts: new Set(), alk: 0, hover: null }; },
    pointer: {
      move(s, pt) {
        const st = s.state, info = crackState(st), G = geometry(s, st, info);
        st.hover = null;
        for (let i = 0; i < st.n - 1; i++) {
          const mx = (G.pos[i][0] + G.pos[i + 1][0]) / 2, my = (G.pos[i][1] + G.pos[i + 1][1]) / 2;
          if (Math.abs(pt.x - mx) < G.sp * 0.32 + (st.cuts.has(i) ? 14 : 0) && Math.abs(pt.y - my) < 26) st.hover = i;
        }
      },
      down(s, pt) {
        const st = s.state, info = crackState(st), G = geometry(s, st, info);
        for (let i = 0; i < st.n - 1; i++) {
          const mx = (G.pos[i][0] + G.pos[i + 1][0]) / 2, my = (G.pos[i][1] + G.pos[i + 1][1]) / 2;
          if (Math.abs(pt.x - mx) < G.sp * 0.32 + (st.cuts.has(i) ? 14 : 0) && Math.abs(pt.y - my) < 26) {
            if (st.cuts.has(i)) st.cuts.delete(i);
            else if (st.cuts.size < 2) st.cuts.add(i);
            st.alk = 0;
            return;
          }
        }
        /* otherwise: a click on a piece makes that piece the alkane */
        info.frags.forEach((f, fi) => {
          for (let i = f[0]; i <= f[1]; i++) if (Math.hypot(pt.x - G.pos[i][0], pt.y - G.pos[i][1]) < 16) st.alk = fi;
        });
      },
      leave(s) { s.state.hover = null; }
    },
    draw(s) {
      const { ctx, w } = s;
      const st = s.state, info = crackState(st), G = geometry(s, st, info);
      const pos = G.pos;
      const tip1 = st.cuts.size === 0 ? 'Click a C–C bond to break it (you can break up to two).' : 'Click a broken bond to join it up again.';
      const tip2 = 'Click a piece to choose which one becomes the alkane.';
      if (w >= 720) Sim.text(ctx, tip1 + ' ' + tip2, w / 2, 22, { size: 12.5, color: C.muted, align: 'center', italic: true });
      else { Sim.text(ctx, tip1, w / 2, 16, { size: 12, color: C.muted, align: 'center', italic: true }); Sim.text(ctx, tip2, w / 2, 34, { size: 12, color: C.muted, align: 'center', italic: true }); }
      const r = Math.min(13, G.sp * 0.34);
      /* bonds */
      for (let i = 0; i < st.n - 1; i++) {
        if (st.cuts.has(i)) {
          const mx = (pos[i][0] + pos[i + 1][0]) / 2;
          Sim.line(ctx, mx, 70, mx, 150, { color: st.hover === i ? C.red : '#ffc9c9', width: 2, dash: [4, 4] });
          continue;
        }
        const hov = st.hover === i;
        Sim.line(ctx, pos[i][0], pos[i][1], pos[i + 1][0], pos[i + 1][1], { color: hov ? C.red : C.ink, width: hov ? 4 : 2.5 });
      }
      /* double bonds in the alkene pieces, at the broken end */
      if (!info.error) {
        info.frags.forEach((f, fi) => {
          if (fi === info.alk || info.len(f) < 2) return;
          const leftCut = st.cuts.has(f[0] - 1);
          const a = leftCut ? f[0] : f[1] - 1;
          const p1 = pos[a], p2 = pos[a + 1];
          const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy);
          const nx = -dy / L * 6, ny = dx / L * 6;
          const sgn = a % 2 ? 1 : -1;
          Sim.line(ctx, p1[0] + nx * sgn + dx * 0.15, p1[1] + ny * sgn + dy * 0.15, p2[0] + nx * sgn - dx * 0.15, p2[1] + ny * sgn - dy * 0.15, { color: C.green, width: 2.5 });
        });
      }
      /* carbon atoms */
      info.frags.forEach((f, fi) => {
        const isAlk = fi === info.alk || st.cuts.size === 0;
        for (let i = f[0]; i <= f[1]; i++) {
          Sim.circle(ctx, pos[i][0], pos[i][1], r, { fill: info.error ? '#ffe3e3' : isAlk ? '#e9ecef' : '#d3f9d8', stroke: info.error ? C.red : isAlk ? C.axis : C.green, width: 1.8 });
          if (r >= 8) Sim.text(ctx, 'C', pos[i][0], pos[i][1] + 0.5, { size: Math.min(13, r * 1.05), bold: true, color: C.ink, align: 'center' });
        }
        /* label under each piece */
        const nC = info.len(f);
        const cx = (pos[f[0]][0] + pos[f[1]][0]) / 2;
        let lab, name, col;
        if (st.cuts.size === 0) { lab = formula(nC, 2 * nC + 2); name = ALKANE[nC - 1]; col = C.ink; }
        else if (info.error) { lab = formula(nC, nC === 1 ? 4 : 2 * nC); name = '?'; col = C.red; }
        else if (isAlk) { lab = formula(nC, 2 * nC + 2); name = ALKANE[nC - 1] + ' (alkane)'; col = C.ink; }
        else { lab = formula(nC, 2 * nC); name = ALKENE[nC - 1] + ' (alkene)'; col = C.green; }
        ctext(ctx, lab, cx, 152, { size: 15, bold: true, color: col, align: 'center' });
        Sim.text(ctx, name, cx, 172, { size: 11.5, color: col, align: 'center' });
      });
      /* the equation */
      let eq;
      if (st.cuts.size === 0) eq = 'Nothing broken yet: ' + formula(st.n, 2 * st.n + 2) + ' (' + ALKANE[st.n - 1] + ')';
      else if (info.error) eq = info.error;
      else {
        const terms = [];
        const alkF = info.frags[info.alk];
        terms.push(formula(info.len(alkF), 2 * info.len(alkF) + 2));
        const alkenes = {};
        info.frags.forEach((f, fi) => { if (fi !== info.alk) alkenes[info.len(f)] = (alkenes[info.len(f)] || 0) + 1; });
        Object.keys(alkenes).sort((a, b) => b - a).forEach((n) => terms.push((alkenes[n] > 1 ? alkenes[n] : '') + formula(+n, 2 * n)));
        eq = formula(st.n, 2 * st.n + 2) + '  →  ' + terms.join('  +  ');
      }
      ctext(ctx, eq, w / 2, 212, { size: info.error ? 12.5 : 16, bold: !info.error, color: info.error ? C.red : C.navy, align: 'center' });
    },
    readout: (s) => {
      const st = s.state, info = crackState(st);
      if (st.cuts.size === 0 || info.error) return [['Carbon atoms', String(st.n)], ['Hydrogen atoms', String(2 * st.n + 2)]];
      let hProd = 0;
      info.frags.forEach((f, fi) => { const n = info.len(f); hProd += fi === info.alk ? 2 * n + 2 : 2 * n; });
      return [
        ['Carbon atoms', st.n + ' → ' + info.frags.map((f) => info.len(f)).join(' + ')],
        ['Hydrogen atoms', (2 * st.n + 2) + ' → ' + hProd, true],
        ['Balanced', hProd === 2 * st.n + 2 ? 'yes' : 'no']
      ];
    }
  });
})();
