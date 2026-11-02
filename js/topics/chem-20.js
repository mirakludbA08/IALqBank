/* Chemistry topic 20: Organic synthesis — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;

  /* ======================================================================
     1. Synthetic route finder: fewest steps between two functional groups
     ====================================================================== */
  const NODES = {
    alkane: ['alkane', 0.08, 0.07], alkene: ['alkene', 0.30, 0.07], dihalo: ['dihalogenoalkane', 0.53, 0.07], diol: ['diol', 0.74, 0.07], poly: ['poly(alkene)', 0.92, 0.07],
    grig: ['Grignard reagent', 0.08, 0.29], halo: ['halogenoalkane', 0.30, 0.29], nitrile: ['nitrile', 0.53, 0.29], amine: ['amine', 0.74, 0.29], amide2: ['N-substituted amide', 0.92, 0.29],
    alc3: ['tertiary alcohol', 0.08, 0.51], alc1: ['primary alcohol', 0.30, 0.51], acid: ['carboxylic acid', 0.53, 0.51], acyl: ['acyl chloride', 0.74, 0.51], amide: ['primary amide', 0.92, 0.51],
    alc2: ['secondary alcohol', 0.08, 0.73], ald: ['aldehyde', 0.30, 0.73], ester: ['ester', 0.53, 0.73], hcn: ['hydroxynitrile', 0.74, 0.73], hacid: ['hydroxy acid', 0.92, 0.73],
    ket: ['ketone', 0.08, 0.94]
  };
  // [from, to, reagents and conditions, type of reaction]
  const EDGES = [
    ['alkane', 'halo', 'Cl₂ or Br₂, UV light', 'free-radical substitution'],
    ['alkene', 'alkane', 'H₂, nickel catalyst, heat', 'addition (reduction)'],
    ['alkene', 'halo', 'HBr, room temperature', 'electrophilic addition'],
    ['alkene', 'dihalo', 'Br₂, room temperature', 'electrophilic addition'],
    ['alkene', 'alc1', 'steam, H₃PO₄ catalyst, high temperature and pressure (ethene gives ethanol)', 'hydration'],
    ['alkene', 'alc2', 'steam, H₃PO₄ catalyst, high temperature and pressure (propene gives mainly propan-2-ol)', 'hydration'],
    ['halo', 'alc2', 'NaOH(aq), heat under reflux (from a secondary halogenoalkane)', 'nucleophilic substitution'],
    ['alc2', 'halo', 'PCl₅, or KBr + 50% H₂SO₄', 'substitution'],
    ['alc2', 'alkene', 'concentrated H₃PO₄, heat', 'elimination (dehydration)'],
    ['ald', 'alc2', 'a Grignard reagent RMgX in dry ether, then water', 'Grignard addition'],
    ['ket', 'alc3', 'a Grignard reagent RMgX in dry ether, then water', 'Grignard addition'],
    ['alkene', 'diol', 'acidified KMnO₄', 'oxidation'],
    ['alkene', 'poly', 'high pressure, catalyst', 'addition polymerisation'],
    ['dihalo', 'diol', 'NaOH(aq), heat under reflux', 'nucleophilic substitution'],
    ['halo', 'alc1', 'NaOH(aq) or KOH(aq), heat under reflux', 'nucleophilic substitution'],
    ['halo', 'alkene', 'KOH in ethanol, heat under reflux', 'elimination'],
    ['halo', 'nitrile', 'KCN in aqueous ethanol, heat under reflux', 'nucleophilic substitution (+1 carbon)'],
    ['halo', 'amine', 'excess NH₃ in ethanol, heat in a sealed tube', 'nucleophilic substitution'],
    ['halo', 'grig', 'Mg, dry ether', 'forms RMgX'],
    ['grig', 'alc1', 'methanal, then water', 'Grignard addition (+1 carbon)'],
    ['grig', 'alc2', 'an aldehyde, then water', 'Grignard addition'],
    ['grig', 'alc3', 'a ketone, then water', 'Grignard addition'],
    ['grig', 'acid', 'CO₂, then water', 'Grignard addition (+1 carbon)'],
    ['alc1', 'halo', 'PCl₅, or KBr + 50% H₂SO₄', 'substitution'],
    ['alc1', 'alkene', 'concentrated H₃PO₄, heat', 'elimination (dehydration)'],
    ['alc1', 'ald', 'K₂Cr₂O₇ / H₂SO₄, heat gently and distil off', 'oxidation'],
    ['alc1', 'acid', 'excess K₂Cr₂O₇ / H₂SO₄, heat under reflux', 'oxidation'],
    ['alc1', 'ester', 'carboxylic acid + concentrated H₂SO₄, heat', 'esterification'],
    ['alc2', 'ket', 'K₂Cr₂O₇ / H₂SO₄, heat under reflux', 'oxidation'],
    ['ald', 'acid', 'excess K₂Cr₂O₇ / H₂SO₄, heat under reflux', 'oxidation'],
    ['ald', 'alc1', 'LiAlH₄ in dry ether', 'reduction'],
    ['ket', 'alc2', 'LiAlH₄ in dry ether', 'reduction'],
    ['ald', 'hcn', 'HCN with KCN', 'nucleophilic addition (+1 carbon)'],
    ['ket', 'hcn', 'HCN with KCN', 'nucleophilic addition (+1 carbon)'],
    ['hcn', 'hacid', 'dilute HCl, heat under reflux', 'hydrolysis'],
    ['nitrile', 'acid', 'dilute HCl, heat under reflux', 'hydrolysis'],
    ['nitrile', 'amine', 'LiAlH₄ in dry ether, or H₂ / Ni', 'reduction'],
    ['acid', 'alc1', 'LiAlH₄ in dry ether', 'reduction'],
    ['acid', 'acyl', 'PCl₅, room temperature', 'substitution'],
    ['acid', 'ester', 'alcohol + concentrated H₂SO₄, heat', 'esterification'],
    ['acyl', 'acid', 'water, room temperature', 'addition–elimination (hydrolysis)'],
    ['acyl', 'ester', 'alcohol, room temperature', 'addition–elimination'],
    ['acyl', 'amide', 'concentrated NH₃, room temperature', 'addition–elimination'],
    ['acyl', 'amide2', 'primary amine, room temperature', 'addition–elimination'],
    ['amine', 'amide2', 'acyl chloride, room temperature', 'addition–elimination'],
    ['ester', 'acid', 'dilute acid or NaOH(aq), heat under reflux', 'hydrolysis']
  ];
  const ADJ = {};
  EDGES.forEach((e, i) => { (ADJ[e[0]] = ADJ[e[0]] || []).push(i); });
  function route(a, b) {
    if (a === b) return [];
    const prev = { [a]: null };
    const queue = [a];
    while (queue.length) {
      const n = queue.shift();
      for (const i of ADJ[n] || []) {
        const t = EDGES[i][1];
        if (t in prev) continue;
        prev[t] = i;
        if (t === b) {
          const path = [];
          let cur = b;
          while (prev[cur] != null) { path.unshift(prev[cur]); cur = EDGES[prev[cur]][0]; }
          return path;
        }
        queue.push(t);
      }
    }
    return null;
  }
  const OPTS = Object.keys(NODES).map((k) => [k, NODES[k][0]]);

  Sim.create('#sim-chem-20-routes', {
    title: 'Synthetic route finder',
    height: (w) => (w >= 700 ? 380 : 440),
    controls: [
      { key: 'from', type: 'select', label: 'Start', options: OPTS, value: 'halo' },
      { key: 'to', type: 'select', label: 'Target', options: OPTS, value: 'ester' }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const path = route(p.from, p.to) || [];
      const on = new Set(path);
      const pos = (k) => [16 + NODES[k][1] * (w - 32), 22 + NODES[k][2] * (h - 50)];
      const fs = w >= 700 ? 12 : 9.5;
      const bw = w >= 700 ? 112 : Math.max(62, w / 5.6), bh = w >= 700 ? 26 : 30;
      // all reactions faintly, the route boldly
      EDGES.forEach((e, i) => {
        if (on.has(i)) return;
        const [x1, y1] = pos(e[0]), [x2, y2] = pos(e[1]);
        Sim.line(ctx, x1, y1, x2, y2, { color: 'rgba(134,142,150,0.22)', width: 1 });
      });
      path.forEach((i, n) => {
        const e = EDGES[i];
        const [x1, y1] = pos(e[0]), [x2, y2] = pos(e[1]);
        const L = Math.hypot(x2 - x1, y2 - y1) || 1;
        const sx = x1 + (x2 - x1) * (bh * 0.7 / L), sy = y1 + (y2 - y1) * (bh * 0.7 / L);
        const ex = x2 - (x2 - x1) * (bh * 0.9 / L), ey = y2 - (y2 - y1) * (bh * 0.9 / L);
        Sim.arrow(ctx, sx, sy, ex, ey, { color: C.red, width: 3, head: 10 });
        Sim.text(ctx, String(n + 1), (x1 + x2) / 2 + 8, (y1 + y2) / 2 - 8, { size: 13, bold: true, color: C.red, bg: 'rgba(255,255,255,0.9)', pad: 3 });
      });
      Object.keys(NODES).forEach((k) => {
        const [x, y] = pos(k);
        const isEnd = k === p.from || k === p.to;
        const inPath = isEnd || path.some((i) => EDGES[i][0] === k || EDGES[i][1] === k);
        Sim.rect(ctx, x - bw / 2, y - bh / 2, bw, bh, { fill: isEnd ? (k === p.from ? '#d0ebff' : '#d3f9d8') : inPath ? '#fff3bf' : '#f8f9fa', stroke: inPath ? C.ink : '#ced4da', width: inPath ? 1.6 : 1, r: 6 });
        Sim.text(ctx, NODES[k][0], x, y + 1, { size: fs, bold: inPath, color: C.ink, align: 'center' });
      });
    },
    readout(s) {
      const p = s.p;
      if (p.from === p.to) return [['Route', 'choose two different functional groups', true]];
      const path = route(p.from, p.to);
      if (!path) return [['Route', 'no route on this map from ' + NODES[p.from][0] + ' to ' + NODES[p.to][0], true]];
      return [['Steps', path.length + (path.length === 1 ? ' step' : ' steps'), true]].concat(path.map((i, n) => {
        const e = EDGES[i];
        return [(n + 1) + '. ' + NODES[e[0]][0] + ' → ' + NODES[e[1]][0], e[2] + ' (' + e[3] + ')'];
      }));
    }
  });

  /* ======================================================================
     2. Grignard reagents: which product?
     ====================================================================== */
  const R = {
    me: { f: 'CH₃', name: 'CH₃MgI (methylmagnesium iodide)' },
    et: { f: 'CH₃CH₂', name: 'CH₃CH₂MgBr (ethylmagnesium bromide)' },
    ph: { f: 'C₆H₅', name: 'C₆H₅MgBr (phenylmagnesium bromide)' }
  };
  const PARTNERS = {
    methanal: { f: 'HCHO', rest: 'CH₂OH', cls: 'primary alcohol', names: { me: 'ethanol', et: 'propan-1-ol', ph: 'phenylmethanol' } },
    ethanal: { f: 'CH₃CHO', rest: 'CH(OH)CH₃', cls: 'secondary alcohol', names: { me: 'propan-2-ol', et: 'butan-2-ol', ph: '1-phenylethanol' } },
    propanone: { f: 'CH₃COCH₃', rest: 'C(OH)(CH₃)₂', cls: 'tertiary alcohol', names: { me: '2-methylpropan-2-ol', et: '2-methylbutan-2-ol', ph: '2-phenylpropan-2-ol' } },
    co2: { f: 'CO₂', rest: 'COOH', cls: 'carboxylic acid', names: { me: 'ethanoic acid', et: 'propanoic acid', ph: 'benzenecarboxylic acid' } }
  };

  Sim.create('#sim-chem-20-grignard', {
    title: 'Grignard reactions',
    height: 190,
    controls: [
      { key: 'r', type: 'select', label: 'Grignard reagent', options: Object.keys(R).map((k) => [k, R[k].name]), value: 'et' },
      { key: 'c', type: 'select', label: 'Reacts with', options: [['methanal', 'methanal, HCHO'], ['ethanal', 'ethanal, CH₃CHO'], ['propanone', 'propanone, CH₃COCH₃'], ['co2', 'carbon dioxide, CO₂']], value: 'propanone' }
    ],
    draw(s) {
      const { ctx, w, p } = s;
      const G = R[p.r], P = PARTNERS[p.c];
      const big = w >= 600 ? 18 : 14;
      Sim.text(ctx, G.f + 'MgX  +  ' + P.f + '   then  H₂O', w / 2, 34, { size: big, bold: true, color: C.ink, align: 'center' });
      Sim.arrow(ctx, w / 2, 52, w / 2, 86, { color: C.grey, width: 2, head: 8 });
      // product, with the new C–C bond in red
      const left = G.f, right = P.rest;
      ctx.save();
      ctx.font = 'bold ' + (big + 2) + 'px sans-serif';
      const lw = ctx.measureText(left).width, rw = ctx.measureText(right).width;
      ctx.restore();
      const total = lw + 34 + rw, x0 = w / 2 - total / 2, y = 116;
      Sim.text(ctx, left, x0, y, { size: big + 2, bold: true, color: C.blue });
      Sim.line(ctx, x0 + lw + 6, y, x0 + lw + 28, y, { color: C.red, width: 4 });
      Sim.text(ctx, right, x0 + lw + 34, y, { size: big + 2, bold: true, color: C.ink });
      Sim.text(ctx, 'new C–C bond', x0 + lw + 17, y + 22, { size: 11.5, color: C.red, align: 'center' });
      Sim.text(ctx, P.names[p.r] + ' (' + P.cls + ')', w / 2, y + 48, { size: 13, bold: true, color: C.navy, align: 'center' });
    },
    readout(s) {
      const P = PARTNERS[s.p.c];
      return [
        ['Product', P.names[s.p.r] + ', a ' + P.cls, true],
        ['Rule', 'methanal → primary alcohol; other aldehydes → secondary; ketones → tertiary; CO₂ → carboxylic acid']
      ];
    }
  });
})();
