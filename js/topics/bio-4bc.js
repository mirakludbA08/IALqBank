/* Classification, biodiversity and conservation: interactive diagrams (biology notes 4bc) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. Index of diversity, D = N(N − 1) / Σn(n − 1)
     ====================================================================== */
  const SPECIES = ['Yorkshire fog grass', 'White clover', 'Dandelion', 'Meadow buttercup', 'Ribwort plantain'];
  const SHORT = ['Grass', 'Clover', 'Dandelion', 'Buttercup', 'Plantain'];
  const BAR = [C.green, C.pink, C.orange, '#e6b800', C.teal];
  const PRESETS = {
    A: { name: 'Site A: unmown meadow', counts: [12, 9, 11, 8, 10] },
    B: { name: 'Site B: mown lawn', counts: [38, 6, 3, 2, 1] }
  };
  function diversity(counts) {
    const N = counts.reduce((a, n) => a + n, 0);
    const sum = counts.reduce((a, n) => a + n * (n - 1), 0);
    const rich = counts.filter((n) => n > 0).length;
    const D = N >= 2 && sum > 0 ? (N * (N - 1)) / sum : null;
    return { N, sum, top: N * (N - 1), D, rich };
  }

  const countCtl = SPECIES.map((name, i) => ({
    key: 'n' + i, label: name, min: 0, max: 40, step: 1, value: PRESETS.A.counts[i], format: (v) => v.toFixed(0),
    onChange: (s, v) => { s.state.sites[s.p.site][i] = v; }
  }));

  Sim.create('#sim-bio-4bc-diversity', {
    title: 'Index of diversity calculator',
    alt: 'A bar chart of the number of each of five plant species counted at a site, beside a table that works out N(N − 1), the sum of n(n − 1) and the index of diversity D for two sites.',
    height: (w) => (w >= 700 ? 340 : 560),
    controls: [
      { key: 'site', type: 'select', label: 'Site being edited', value: 'A', options: [['A', PRESETS.A.name], ['B', PRESETS.B.name]],
        onChange: (s, v) => { s.state.sites[v].forEach((n, i) => s.set('n' + i, n)); } }
    ].concat(countCtl).concat([
      { type: 'button', label: 'Restore the sample data', ghost: true, onClick: (s) => {
        s.state.sites = { A: PRESETS.A.counts.slice(), B: PRESETS.B.counts.slice() };
        s.state.sites[s.p.site].forEach((n, i) => s.set('n' + i, n));
      } }
    ]),
    init(s) { s.state = { sites: { A: PRESETS.A.counts.slice(), B: PRESETS.B.counts.slice() } }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const counts = s.state.sites[p.site];
      const wide = w >= 700;
      const gb = wide ? { x: 50, y: 34, w: w * 0.46 - 50, h: h - 34 - 64 } : { x: 50, y: 34, w: w - 68, h: 230 };
      const ymax = Math.max(20, Math.ceil((Math.max.apply(null, counts) + 6) / 10) * 10);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 5, ymin: 0, ymax, ystep: ymax > 30 ? 10 : 5, ylabel: 'number counted, n', title: PRESETS[p.site].name }, gb));
      g.xstep = 100;
      g.axes();
      counts.forEach((n, i) => {
        const x0 = g.px(i + 0.15), x1 = g.px(i + 0.85);
        if (n > 0) Sim.rect(ctx, x0, g.py(n), x1 - x0, g.py(0) - g.py(n), { fill: BAR[i], r: 3 });
        Sim.text(ctx, String(n), (x0 + x1) / 2, g.py(n) - 9, { size: 12, bold: true, align: 'center', color: C.ink });
        Sim.text(ctx, SHORT[i], (x0 + x1) / 2, g.py(0) + 8, { size: 11.5, align: 'center', baseline: 'top', color: C.muted });
      });

      // calculation table
      const tb = wide ? { x: w * 0.5 + 10, y: 20, w: w * 0.5 - 24 } : { x: 14, y: gb.y + gb.h + 50, w: w - 28 };
      const d = diversity(counts);
      const cols = [tb.x, tb.x + tb.w * 0.5, tb.x + tb.w * 0.75];
      let y = tb.y;
      Sim.rect(ctx, tb.x - 6, y - 4, tb.w + 12, 24, { fill: '#edf2ff', r: 4 });
      Sim.text(ctx, 'Species', cols[0], y + 8, { size: 12.5, bold: true });
      Sim.text(ctx, 'n', cols[1], y + 8, { size: 12.5, bold: true, italic: true });
      Sim.text(ctx, 'n(n − 1)', cols[2], y + 8, { size: 12.5, bold: true });
      y += 28;
      counts.forEach((n, i) => {
        Sim.text(ctx, SHORT[i], cols[0], y, { size: 12.5, color: BAR[i], bold: true });
        Sim.text(ctx, String(n), cols[1], y, { size: 12.5 });
        Sim.text(ctx, String(n * (n - 1)), cols[2], y, { size: 12.5 });
        y += 20;
      });
      Sim.line(ctx, tb.x - 6, y - 8, tb.x + tb.w + 6, y - 8, { color: C.axis, width: 1 });
      Sim.text(ctx, 'Total', cols[0], y + 2, { size: 12.5, bold: true });
      Sim.text(ctx, 'N = ' + d.N, cols[1], y + 2, { size: 12.5, bold: true });
      Sim.text(ctx, 'Σ = ' + d.sum, cols[2], y + 2, { size: 12.5, bold: true });
      y += 30;
      const dTxt = d.D == null ? 'cannot be calculated' : d.D.toFixed(2);
      Sim.text(ctx, 'D = N(N − 1) ÷ Σn(n − 1) = ' + d.top + ' ÷ ' + d.sum + ' = ' + dTxt, tb.x, y, { size: 13, bold: true, color: C.navy });
      y += 28;
      const other = p.site === 'A' ? 'B' : 'A';
      const dO = diversity(s.state.sites[other]);
      Sim.text(ctx, 'Compare: ' + PRESETS[other].name.split(':')[0] + ' has D = ' + (dO.D == null ? '—' : dO.D.toFixed(2)) + ' with ' + dO.rich + ' species', tb.x, y, { size: 12.5, color: C.muted });
    },
    readout(s) {
      const d = diversity(s.state.sites[s.p.site]);
      return [
        ['Species richness =', d.rich + ' species'],
        ['N =', String(d.N)],
        ['Σn(n − 1) =', String(d.sum)],
        ['Index of diversity D =', d.D == null ? 'needs N ≥ 2 and at least one species with n ≥ 2' : d.D.toFixed(2), true]
      ];
    }
  });

  /* ======================================================================
     2. Heterozygosity index from a gel, with the Hardy-Weinberg prediction
     ====================================================================== */
  function sampleGenotypes(st, p, N, F) {
    const q = 1 - p;
    const pAA = p * p + F * p * q;
    const pAa = 2 * p * q * (1 - F);
    st.g = [];
    for (let i = 0; i < N; i++) {
      const r = Math.random();
      st.g.push(r < pAA ? 'AA' : r < pAA + pAa ? 'Aa' : 'aa');
    }
  }
  function tally(gs) {
    const t = { AA: 0, Aa: 0, aa: 0 };
    gs.forEach((x) => { t[x]++; });
    const N = gs.length;
    const p = N ? (2 * t.AA + t.Aa) / (2 * N) : 0;
    return { t, N, p, q: 1 - p, H: N ? t.Aa / N : 0 };
  }
  const resample = (s) => sampleGenotypes(s.state, s.p.freq, Math.round(s.p.n), s.p.inbred ? 0.5 : 0);

  Sim.create('#sim-bio-4bc-hetero', {
    title: 'Heterozygosity index from DNA bands',
    alt: 'A gel with one lane per individual. Homozygous individuals show one band and heterozygous individuals show two. A bar chart compares the observed genotype frequencies with those predicted by the Hardy-Weinberg equation.',
    height: (w) => (w >= 700 ? 360 : 640),
    controls: [
      { key: 'freq', label: 'Frequency of allele A in the population, p', min: 0.05, max: 0.95, step: 0.05, value: 0.5, format: (v) => v.toFixed(2), onChange: resample },
      { key: 'n', label: 'Individuals sampled', min: 10, max: 40, step: 2, value: 24, format: (v) => v.toFixed(0), onChange: resample },
      { key: 'inbred', type: 'check', label: 'Small, inbred population', value: false, onChange: resample },
      { type: 'button', label: 'Take another sample', onClick: resample }
    ],
    init(s) { s.state = {}; resample(s); },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const T = tally(st.g);
      const wide = w >= 700;
      const gel = wide ? { x: 14, y: 30, w: w * 0.58 - 20, h: h - 52 } : { x: 14, y: 30, w: w - 28, h: 300 };
      Sim.text(ctx, 'Gel: one lane per individual', gel.x, gel.y - 16, { size: 13, bold: true, color: C.navy });
      Sim.rect(ctx, gel.x, gel.y, gel.w, gel.h, { fill: '#1d2b4f', r: 8 });
      const rows = T.N > 20 ? 2 : 1;
      const perRow = Math.ceil(T.N / rows);
      const lw = (gel.w - 70) / perRow;
      const rowH = gel.h / rows;
      for (let rI = 0; rI < rows; rI++) {
        const top = gel.y + rI * rowH;
        Sim.text(ctx, '450 bp', gel.x + 8, top + rowH * 0.34, { size: 11, color: '#c5d3f0' });
        Sim.text(ctx, '300 bp', gel.x + 8, top + rowH * 0.66, { size: 11, color: '#c5d3f0' });
        for (let k = 0; k < perRow; k++) {
          const i = rI * perRow + k;
          if (i >= T.N) break;
          const x = gel.x + 60 + k * lw;
          const bw = Math.max(4, lw - 4);
          Sim.rect(ctx, x + 1, top + 12, bw, 5, { fill: '#0d1631' });
          const gt = st.g[i];
          const het = gt === 'Aa';
          const band = (yy, col) => Sim.rect(ctx, x + 1, yy, bw, Math.max(3, Math.min(7, rowH * 0.05)), { fill: col, r: 1.5 });
          if (gt !== 'aa') band(top + rowH * 0.34 - 3, het ? '#ffd43b' : '#f1f3f5');
          if (gt !== 'AA') band(top + rowH * 0.66 - 3, het ? '#ffd43b' : '#f1f3f5');
          if (lw >= 11) Sim.text(ctx, String(i + 1), x + 1 + bw / 2, top + rowH - 10, { size: lw >= 16 ? 10 : 8, color: '#8da2cf', align: 'center' });
        }
      }

      // genotype bars: observed against Hardy-Weinberg
      const gb = wide ? { x: w * 0.58 + 44, y: 40, w: w * 0.42 - 62, h: h - 40 - 64 } : { x: 50, y: gel.y + gel.h + 46, w: w - 68, h: h - gel.y - gel.h - 46 - 60 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 3, ymin: 0, ymax: 1, ystep: 0.2, ylabel: 'frequency', title: 'observed vs Hardy-Weinberg' }, gb));
      g.xstep = 100;
      g.axes();
      const exp = [T.p * T.p, 2 * T.p * T.q, T.q * T.q];
      const obs = ['AA', 'Aa', 'aa'].map((k) => (T.N ? T.t[k] / T.N : 0));
      ['AA', 'Aa', 'aa'].forEach((k, i) => {
        const xa = g.px(i + 0.15), xb = g.px(i + 0.5), xc = g.px(i + 0.85);
        Sim.rect(ctx, xa, g.py(obs[i]), xb - xa - 2, g.py(0) - g.py(obs[i]), { fill: k === 'Aa' ? '#e6b800' : C.blue, r: 2 });
        Sim.rect(ctx, xb, g.py(exp[i]), xc - xb, g.py(0) - g.py(exp[i]), { fill: 'rgba(134,142,150,0.35)', stroke: C.grey, width: 1.2, r: 2 });
        Sim.text(ctx, k, (xa + xc) / 2, g.py(0) + 8, { size: 12.5, bold: true, align: 'center', baseline: 'top' });
      });
      const ly = gb.y + gb.h + 32;
      Sim.rect(ctx, gb.x, ly - 6, 12, 12, { fill: C.blue, r: 2 });
      Sim.text(ctx, 'observed', gb.x + 17, ly, { size: 12 });
      Sim.rect(ctx, gb.x + 90, ly - 6, 12, 12, { fill: 'rgba(134,142,150,0.35)', stroke: C.grey, r: 2 });
      Sim.text(ctx, 'expected: p², 2pq, q²', gb.x + 107, ly, { size: 12 });
    },
    readout(s) {
      const T = tally(s.state.g);
      return [
        ['Heterozygotes (two bands) =', T.t.Aa + ' of ' + T.N],
        ['Heterozygosity index H =', (T.N ? T.H : 0).toFixed(2), true],
        ['p from the bands =', T.p.toFixed(2)],
        ['Expected 2pq =', (2 * T.p * T.q).toFixed(2)]
      ];
    }
  });

  /* ======================================================================
     3. Hardy-Weinberg from the frequency of the recessive phenotype
     ====================================================================== */
  Sim.create('#sim-bio-4bc-hw', {
    title: 'Hardy-Weinberg: from q² to every genotype',
    alt: 'A slider sets the percentage of a population showing a recessive phenotype. A bar divided into three parts shows the resulting frequencies of homozygous dominant, heterozygous and homozygous recessive individuals.',
    height: (w) => (w >= 600 ? 220 : 250),
    controls: [
      { key: 'rec', label: 'Individuals showing the recessive phenotype', min: 1, max: 81, step: 1, value: 9, unit: '%', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const q2 = p.rec / 100, q = Math.sqrt(q2), pp = 1 - q;
      const parts = [['AA', pp * pp, C.blue], ['Aa', 2 * pp * q, '#e6b800'], ['aa', q2, C.pink]];
      const x0 = 20, x1 = w - 20, y = 56, bh = 46;
      let x = x0;
      Sim.text(ctx, 'One population of 100 %', x0, 24, { size: 13, bold: true, color: C.navy });
      parts.forEach(([k, f, col]) => {
        const ww = (x1 - x0) * f;
        Sim.rect(ctx, x, y, ww, bh, { fill: col });
        if (ww > 54) {
          Sim.text(ctx, k, x + ww / 2, y + 15, { size: 13, bold: true, color: '#fff', align: 'center' });
          Sim.text(ctx, (f * 100).toFixed(1) + ' %', x + ww / 2, y + 33, { size: 12, color: '#fff', align: 'center' });
        }
        x += ww;
      });
      // colour key, so narrow segments are still identified
      let kx = x0;
      parts.forEach(([k, , col]) => {
        Sim.rect(ctx, kx, y + bh + 8, 12, 12, { fill: col, r: 2 });
        Sim.text(ctx, k, kx + 16, y + bh + 14, { size: 12 });
        kx += 56;
      });
      const lines = [
        'q² = ' + q2.toFixed(2) + '   →   q = √' + q2.toFixed(2) + ' = ' + q.toFixed(2) + '   →   p = 1 − q = ' + pp.toFixed(2),
        'p² = ' + (pp * pp).toFixed(3) + '      2pq = ' + (2 * pp * q).toFixed(3) + '      q² = ' + q2.toFixed(3) + '      total = 1'
      ];
      if (w < 600) {
        Sim.text(ctx, 'q² = ' + q2.toFixed(2) + ', q = ' + q.toFixed(2) + ', p = ' + pp.toFixed(2), x0, y + bh + 48, { size: 13 });
        Sim.text(ctx, 'p² = ' + (pp * pp).toFixed(3) + ', 2pq = ' + (2 * pp * q).toFixed(3), x0, y + bh + 72, { size: 13 });
        Sim.text(ctx, 'q² = ' + q2.toFixed(3) + ' (sum = 1)', x0, y + bh + 96, { size: 13 });
      } else {
        Sim.text(ctx, lines[0], x0, y + bh + 48, { size: 13.5 });
        Sim.text(ctx, lines[1], x0, y + bh + 74, { size: 13.5 });
      }
    },
    readout(s) {
      const q2 = s.p.rec / 100, q = Math.sqrt(q2), pp = 1 - q;
      return [
        ['Carriers (Aa) =', (2 * pp * q * 100).toFixed(1) + ' %', true],
        ['Recessive allele frequency q =', q.toFixed(2)],
        ['Dominant allele frequency p =', pp.toFixed(2)]
      ];
    }
  });
})();
