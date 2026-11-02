/* Biology 2c: Gene expression and genetics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. Monohybrid cross: Punnett square builder
     ====================================================================== */
  const TRAITS = {
    cf: {
      dom: 'F', rec: 'f', incomplete: false,
      geno: { DD: 'FF', Dd: 'Ff', dd: 'ff' },
      opt: { DD: 'FF (unaffected)', Dd: 'Ff (carrier)', dd: 'ff (has cystic fibrosis)' },
      phen: { DD: 'unaffected', Dd: 'unaffected carrier', dd: 'cystic fibrosis' },
      cellTxt: { DD: 'unaffected', Dd: 'carrier', dd: 'has CF' },
      col: { DD: '#b2f2bb', Dd: '#d3f9d8', dd: '#ffc9c9' },
      groups: [{ name: 'unaffected', of: ['DD', 'Dd'], col: '#40c057' }, { name: 'cystic fibrosis', of: ['dd'], col: '#fa5252' }]
    },
    gen: {
      dom: 'A', rec: 'a', incomplete: false,
      geno: { DD: 'AA', Dd: 'Aa', dd: 'aa' },
      opt: { DD: 'AA (homozygous dominant)', Dd: 'Aa (heterozygous)', dd: 'aa (homozygous recessive)' },
      phen: { DD: 'dominant phenotype', Dd: 'dominant phenotype', dd: 'recessive phenotype' },
      cellTxt: { DD: 'dominant', Dd: 'dominant', dd: 'recessive' },
      col: { DD: '#a5d8ff', Dd: '#d0ebff', dd: '#ffe8cc' },
      groups: [{ name: 'dominant phenotype', of: ['DD', 'Dd'], col: '#339af0' }, { name: 'recessive phenotype', of: ['dd'], col: '#ff922b' }]
    },
    inc: {
      dom: 'Cᴿ', rec: 'Cᵂ', incomplete: true,
      geno: { DD: 'CᴿCᴿ', Dd: 'CᴿCᵂ', dd: 'CᵂCᵂ' },
      opt: { DD: 'CᴿCᴿ (red flowers)', Dd: 'CᴿCᵂ (pink flowers)', dd: 'CᵂCᵂ (white flowers)' },
      phen: { DD: 'red', Dd: 'pink', dd: 'white' },
      cellTxt: { DD: 'red', Dd: 'pink', dd: 'white' },
      col: { DD: '#ff8787', Dd: '#fcc2d7', dd: '#ffffff' },
      groups: [{ name: 'red', of: ['DD'], col: '#e03131' }, { name: 'pink', of: ['Dd'], col: '#f783ac' }, { name: 'white', of: ['dd'], col: '#ced4da' }]
    }
  };
  const gametesOf = (g) => (g === 'DD' ? ['D', 'D'] : g === 'dd' ? ['d', 'd'] : ['D', 'd']);
  const combine = (a, b) => (a === 'D' && b === 'D' ? 'DD' : a === 'd' && b === 'd' ? 'dd' : 'Dd');
  const allele = (T, x) => (x === 'D' ? T.dom : T.rec);
  function cross(p1, p2) {
    const g1 = gametesOf(p1), g2 = gametesOf(p2);
    const cells = [];
    const count = { DD: 0, Dd: 0, dd: 0 };
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const k = combine(g1[i], g2[j]); cells.push({ i, j, k }); count[k]++; }
    return { g1, g2, cells, count };
  }
  function ratioText(parts) {
    // parts: [[n, label], ...] with n out of 4; reduce by the common factor
    const nz = parts.filter((q) => q[0] > 0);
    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    if (nz.length === 1) return 'all ' + nz[0][1];
    const g = nz.reduce((a, q) => gcd(a, q[0]), 0) || 1;
    return nz.map((q) => q[0] / g + ' ' + q[1]).join(' : ');
  }
  function relabel(s) {
    const T = TRAITS[s.p.trait];
    ['p1', 'p2'].forEach((key) => {
      const sel = s.controls[key].el;
      Array.from(sel.options).forEach((op) => { op.textContent = T.opt[op.value]; });
    });
  }

  Sim.create('#sim-bio-2c-punnett', {
    title: 'Monohybrid cross: Punnett square',
    alt: 'A Punnett square showing the gametes of two parents and the genotypes of their offspring, with a bar chart of the expected and observed phenotypes',
    height: (w) => (w >= 700 ? 340 : 555),
    controls: [
      { key: 'trait', type: 'select', label: 'Characteristic', value: 'cf', options: [['cf', 'Cystic fibrosis (F, f)'], ['gen', 'Dominant and recessive alleles (A, a)'], ['inc', 'Incomplete dominance: flower colour']], onChange: (s) => { relabel(s); s.state.kids = { DD: 0, Dd: 0, dd: 0 }; } },
      { key: 'p1', type: 'select', label: 'Parent 1', value: 'Dd', options: [['DD', 'FF (unaffected)'], ['Dd', 'Ff (carrier)'], ['dd', 'ff (has cystic fibrosis)']], onChange: (s) => { s.state.kids = { DD: 0, Dd: 0, dd: 0 }; } },
      { key: 'p2', type: 'select', label: 'Parent 2', value: 'Dd', options: [['DD', 'FF (unaffected)'], ['Dd', 'Ff (carrier)'], ['dd', 'ff (has cystic fibrosis)']], onChange: (s) => { s.state.kids = { DD: 0, Dd: 0, dd: 0 }; } },
      { type: 'button', label: 'Have 1 child', onClick: (s) => addKids(s, 1) },
      { type: 'button', label: 'Have 100 children', onClick: (s) => addKids(s, 100) },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { s.state.kids = { DD: 0, Dd: 0, dd: 0 }; s.state.last = null; } }
    ],
    init(s) { s.state = { kids: { DD: 0, Dd: 0, dd: 0 }, last: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const T = TRAITS[p.trait];
      const X = cross(p.p1, p.p2);
      const wide = w >= 700;
      /* parents and gametes */
      const lp = wide ? { x: 0, y: 0, w: Math.round(w * 0.5), h } : { x: 0, y: 0, w, h: 330 };
      const cell = Math.min(wide ? 78 : 72, (lp.w - 120) / 2.4);
      const gx = lp.x + lp.w / 2 - cell + 22, gy = lp.y + 110;
      Sim.text(ctx, 'Parent 1: ' + T.geno[p.p1] + ' (' + T.phen[p.p1] + ')', lp.x + 14, lp.y + 16, { size: 12.5, bold: true, color: C.navy });
      Sim.text(ctx, 'Parent 2: ' + T.geno[p.p2] + ' (' + T.phen[p.p2] + ')', lp.x + 14, lp.y + 36, { size: 12.5, bold: true, color: C.purple });
      Sim.text(ctx, 'gametes', gx - 40, gy - 34, { size: 11.5, italic: true, color: C.muted, align: 'center' });
      // gametes of parent 1 along the top, parent 2 down the side
      for (let i = 0; i < 2; i++) {
        const cx = gx + cell * (i + 0.5), cy = gy - 26;
        Sim.circle(ctx, cx, cy, 16, { fill: '#edf2ff', stroke: C.navy, width: 1.5 });
        Sim.text(ctx, allele(T, X.g1[i]), cx, cy + 1, { size: 14, bold: true, color: C.navy, align: 'center' });
        const rx = gx - 26, ry = gy + cell * (i + 0.5);
        Sim.circle(ctx, rx, ry, 16, { fill: '#f3f0ff', stroke: C.purple, width: 1.5 });
        Sim.text(ctx, allele(T, X.g2[i]), rx, ry + 1, { size: 14, bold: true, color: C.purple, align: 'center' });
      }
      X.cells.forEach((c) => {
        const x = gx + c.j * cell, y = gy + c.i * cell;
        // rows: parent 2's gamete i; columns: parent 1's gamete j
        const k = combine(X.g2[c.i], X.g1[c.j]);
        Sim.rect(ctx, x, y, cell, cell, { fill: T.col[k], stroke: C.axis, width: 1.5 });
        const gt = allele(T, k === 'dd' ? 'd' : 'D') + allele(T, k === 'DD' ? 'D' : 'd');
        Sim.text(ctx, gt, x + cell / 2, y + cell / 2 - 8, { size: 15, bold: true, color: C.ink, align: 'center' });
        Sim.text(ctx, T.cellTxt[k], x + cell / 2, y + cell / 2 + 12, { size: 10.5, color: C.muted, align: 'center' });
      });
      Sim.text(ctx, 'each box: probability 1/4 (25%)', gx + cell, gy + 2 * cell + 18, { size: 11.5, italic: true, color: C.muted, align: 'center' });

      /* expected and observed phenotypes */
      const bp = wide ? { x: lp.w + 10, y: 0, w: w - lp.w - 26, h } : { x: 0, y: lp.h, w, h: h - lp.h };
      const nk = st.kids.DD + st.kids.Dd + st.kids.dd;
      const groups = T.groups.map((gr) => ({
        name: gr.name, col: gr.col,
        exp: gr.of.reduce((a, k) => a + X.count[k], 0) / 4,
        obs: nk ? gr.of.reduce((a, k) => a + st.kids[k], 0) / nk : null
      }));
      Sim.text(ctx, 'Phenotypes of the children', bp.x + 14, bp.y + 16, { size: 12.5, bold: true, color: C.navy });
      const bx0 = bp.x + 14, bw = bp.w - 28;
      const rowH = Math.min(52, (bp.h - 80) / groups.length);
      groups.forEach((gr, i) => {
        const y = bp.y + 40 + i * rowH;
        Sim.text(ctx, gr.name, bx0, y, { size: 12, bold: true, color: C.ink });
        const barY = y + 10;
        const lw = 70;
        Sim.text(ctx, 'expected', bx0, barY + 6, { size: 11, color: C.muted });
        Sim.rect(ctx, bx0 + lw, barY, bw - lw - 46, 12, { fill: C.light, r: 3 });
        if (gr.exp > 0) Sim.rect(ctx, bx0 + lw, barY, (bw - lw - 46) * gr.exp, 12, { fill: gr.col, r: 3 });
        Sim.text(ctx, (gr.exp * 100).toFixed(0) + '%', bx0 + bw - 40, barY + 6, { size: 11.5, bold: true, color: C.ink });
        if (gr.obs != null) {
          Sim.text(ctx, 'observed', bx0, barY + 22, { size: 11, color: C.muted });
          Sim.rect(ctx, bx0 + lw, barY + 16, bw - lw - 46, 12, { fill: C.light, r: 3 });
          if (gr.obs > 0) Sim.rect(ctx, bx0 + lw, barY + 16, (bw - lw - 46) * gr.obs, 12, { fill: gr.col, r: 3, stroke: C.axis, width: 1 });
          Sim.text(ctx, (gr.obs * 100).toFixed(0) + '%', bx0 + bw - 40, barY + 22, { size: 11.5, bold: true, color: C.ink });
        }
      });
      const ny = bp.y + 40 + groups.length * rowH + 6;
      if (nk) {
        Sim.text(ctx, nk + ' children so far' + (st.last ? ': last one ' + T.geno[st.last] + ' (' + T.phen[st.last] + ')' : ''), bx0, ny, { size: 11.5, color: C.ink });
      } else {
        Sim.text(ctx, 'Press "Have 1 child" to see chance at work', bx0, ny, { size: 11.5, italic: true, color: C.muted });
      }
    },
    readout(s) {
      const p = s.p, T = TRAITS[p.trait];
      const X = cross(p.p1, p.p2);
      const gtxt = ratioText([[X.count.DD, T.geno.DD], [X.count.Dd, T.geno.Dd], [X.count.dd, T.geno.dd]]);
      const ptxt = ratioText(T.groups.map((gr) => [gr.of.reduce((a, k) => a + X.count[k], 0), gr.name]));
      const out = [['genotype ratio:', gtxt], ['phenotype ratio:', ptxt]];
      if (p.trait === 'cf') {
        out.push(['P(child has CF) =', (X.count.dd * 25) + '%', true]);
        out.push(['P(child is a carrier) =', (X.count.Dd * 25) + '%']);
      } else if (p.trait === 'gen') {
        out.push(['P(recessive phenotype) =', (X.count.dd * 25) + '%', true]);
      } else {
        out.push(['P(pink flowers) =', (X.count.Dd * 25) + '%', true]);
      }
      out.push(['each child:', 'an independent event with the same chances']);
      return out;
    }
  });
  function addKids(s, n) {
    const st = s.state;
    for (let i = 0; i < n; i++) {
      const a = gametesOf(s.p.p1)[Math.random() < 0.5 ? 0 : 1];
      const b = gametesOf(s.p.p2)[Math.random() < 0.5 ? 0 : 1];
      const k = combine(a, b);
      st.kids[k]++;
      st.last = k;
    }
    if (n > 1) st.last = null;
  }

  /* ======================================================================
     2. Polygenic inheritance: from separate classes to a bell curve
     ====================================================================== */
  function binom(n, k) { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return r; }
  const LETTERS = 'ABCDEF';
  Sim.create('#sim-bio-2c-polygenic', {
    title: 'Polygenic inheritance and continuous variation',
    alt: 'Bar chart of the phenotypes produced by a cross between parents heterozygous at one or more loci, becoming a bell-shaped curve as loci and environmental effects are added',
    height: (w) => (w >= 640 ? 330 : 400),
    controls: [
      { key: 'n', label: 'Number of loci', min: 1, max: 6, step: 1, value: 1, format: (v) => v.toFixed(0) },
      { key: 'env', label: 'Effect of the environment (spread)', min: 0, max: 1.5, step: 0.1, value: 0, format: (v) => (v === 0 ? 'none' : v.toFixed(1)) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const n = Math.round(p.n), sd = p.env;
      const m = 2 * n;
      const P = [];
      for (let k = 0; k <= m; k++) P.push(binom(m, k) / Math.pow(4, n));
      const parent = LETTERS.slice(0, n).split('').map((L) => L + L.toLowerCase()).join('');
      Sim.text(ctx, 'Cross: ' + parent + ' × ' + parent, 14, 16, { size: 13, bold: true, color: C.navy });
      Sim.text(ctx, 'each capital-letter allele adds one unit to the phenotype', 14, 35, { size: 11.5, italic: true, color: C.muted });
      const gb = { x: 54, y: 62, w: w - 54 - 18, h: h - 62 - 44 };
      const pmax = Math.max.apply(null, P);
      const env = sd > 0.02;
      // graph coordinate X = phenotype value + 1, so the vertical axis sits at the left edge
      const dens = (X) => P.reduce((a, pk, k) => a + pk * Math.exp(-0.5 * Math.pow((X - 1 - k) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI)), 0);
      let top = pmax;
      if (env) for (let i = 0; i <= 400; i++) top = Math.max(top, dens(((m + 2) * i) / 400));
      const ymax = top * 1.15;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: m + 2, ymin: 0, ymax, xstep: 1, ylabel: 'proportion of offspring' }, gb)).axes();
      // relabel the x axis in phenotype values
      const y0 = g.py(0);
      Sim.rect(ctx, g.x - 14, y0 + 3, g.w + 28, 17, { fill: '#fff' });
      for (let k = 0; k <= m; k += m > 8 ? 2 : 1) Sim.text(ctx, String(k), g.px(k + 1), y0 + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      const xTitle = env ? 'phenotype value' : gb.w > 360 ? 'phenotype value (number of capital-letter alleles)' : 'number of capital-letter alleles';
      Sim.text(ctx, xTitle, gb.x + gb.w / 2, gb.y + gb.h + 32, { size: 12.5, bold: true, color: C.ink, align: 'center' });
      const bar = (k, pk, fill) => Sim.rect(ctx, g.px(k + 0.7), g.py(pk), g.px(k + 1.3) - g.px(k + 0.7), y0 - g.py(pk), { fill });
      if (env) {
        P.forEach((pk, k) => bar(k, pk, 'rgba(112,72,232,0.18)'));
        g.fill(dens, 0, m + 2, { color: 'rgba(240,140,0,0.25)', samples: 300 });
        g.plot(dens, { color: C.orange, width: 2.8, samples: 400 });
        Sim.text(ctx, 'genotype classes only', w - 18, 50, { size: 11.5, bold: true, color: C.purple, align: 'right' });
        Sim.text(ctx, 'with the environment', w - 18 - Sim.measure(ctx, 'genotype classes only', { size: 11.5, bold: true }) - 16, 50, { size: 11.5, bold: true, color: '#b35c00', align: 'right' });
      } else {
        const showFrac = n <= (gb.w > 420 ? 3 : 2);
        P.forEach((pk, k) => {
          bar(k, pk, C.purple);
          if (showFrac) Sim.text(ctx, binom(m, k) + '/' + Math.pow(4, n), g.px(k + 1), g.py(pk) - 9, { size: 11, color: C.purple, align: 'center', bold: true });
        });
        if (n === 1) ['aa', 'Aa', 'AA'].forEach((gt, k) => Sim.text(ctx, gt, g.px(k + 1), g.py(P[k] / 2), { size: 12.5, bold: true, color: '#fff', align: 'center' }));
      }
    },
    readout(s) {
      const n = Math.round(s.p.n), sd = s.p.env;
      const classes = 2 * n + 1;
      const ext = 1 / Math.pow(4, n);
      let kind;
      if (sd >= 0.4) kind = 'continuous: the classes overlap into one smooth curve';
      else if (sd > 0.02) kind = 'classes beginning to overlap';
      else kind = n === 1 ? 'discontinuous: three separate classes' : 'separate classes, but more of them';
      return [
        ['loci:', String(n)],
        ['phenotype classes without the environment:', String(classes)],
        ['offspring at each extreme:', '1 in ' + Math.pow(4, n) + ' (' + Sim.fmt(ext * 100, 2) + '%)'],
        ['variation:', kind, true]
      ];
    }
  });
})();
