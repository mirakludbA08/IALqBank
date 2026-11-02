/* Biology practical skills — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;

  /* ======================================================================
     Mean, standard deviation and an unpaired t-test for two samples
     ====================================================================== */
  // Inverse normal (Abramowitz & Stegun 26.2.23), used to spread n sample values evenly.
  function zOf(pr) {
    const q = pr < 0.5 ? pr : 1 - pr;
    const t = Math.sqrt(-2 * Math.log(q));
    const z = t - (2.515517 + 0.802853 * t + 0.010328 * t * t) / (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
    return pr < 0.5 ? -z : z;
  }
  // n values with exactly the requested mean and sample standard deviation.
  function sample(n, mean, sd) {
    const z = Array.from({ length: n }, (_, i) => zOf((i + 0.5) / n));
    const m = z.reduce((a, b) => a + b, 0) / n;
    const s = Math.sqrt(z.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1));
    return z.map((v) => mean + sd * (v - m) / s);
  }
  // Critical t for p = 0.05 (two-tailed) by degrees of freedom.
  const TCRIT = { 8: 2.306, 10: 2.228, 12: 2.179, 14: 2.145, 16: 2.120, 18: 2.101, 20: 2.086, 22: 2.074, 24: 2.064, 26: 2.056, 28: 2.048, 30: 2.042, 32: 2.037, 34: 2.032, 36: 2.028, 38: 2.024 };

  function stats(p) {
    const a = sample(p.n, p.ma, p.sa), b = sample(p.n, p.mb, p.sb);
    const t = Math.abs(p.ma - p.mb) / Math.sqrt(p.sa * p.sa / p.n + p.sb * p.sb / p.n);
    const df = 2 * p.n - 2;
    return { a, b, t, df, crit: TCRIT[df] };
  }

  Sim.create('#sim-bio-prac-ttest', {
    title: 'Comparing two means: standard deviation and the t-test',
    height: 300,
    controls: [
      { key: 'ma', label: 'Mean of the control group', min: 20, max: 80, step: 1, value: 45, unit: 'mm', format: (v) => v.toFixed(0) },
      { key: 'mb', label: 'Mean of the treated group', min: 20, max: 80, step: 1, value: 55, unit: 'mm', format: (v) => v.toFixed(0) },
      { key: 'sa', label: 'Standard deviation (control)', min: 1, max: 20, step: 0.5, value: 8, unit: 'mm', format: (v) => v.toFixed(1) },
      { key: 'sb', label: 'Standard deviation (treated)', min: 1, max: 20, step: 0.5, value: 8, unit: 'mm', format: (v) => v.toFixed(1) },
      { key: 'n', label: 'Number in each sample', min: 5, max: 20, step: 1, value: 10, format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = stats(p);
      const g = Sim.graph(ctx, { x: 40, y: 20, w: w - 60, h: h - 20 - 46, xmin: 0, xmax: 100, ymin: 0, ymax: 3, xstep: 10, ystep: 10, grid: false, xlabel: 'seedling height / mm', ylabel: '' });
      g.axes();
      const row = (vals, mean, sd, y, col, label) => {
        vals.forEach((v, i) => g.dot(v, y + ((i % 3) - 1) * 0.08, { color: col, r: 4 }));
        Sim.line(ctx, g.px(mean - sd), g.py(y + 0.38), g.px(mean + sd), g.py(y + 0.38), { color: col, width: 2.5 });
        Sim.line(ctx, g.px(mean - sd), g.py(y + 0.3), g.px(mean - sd), g.py(y + 0.46), { color: col, width: 2.5 });
        Sim.line(ctx, g.px(mean + sd), g.py(y + 0.3), g.px(mean + sd), g.py(y + 0.46), { color: col, width: 2.5 });
        Sim.line(ctx, g.px(mean), g.py(y - 0.3), g.px(mean), g.py(y + 0.5), { color: col, width: 2 });
        Sim.text(ctx, label, g.x + 6, g.py(y + 0.55), { size: 12, bold: true, color: col });
      };
      row(st.a, p.ma, p.sa, 2, C.blue, 'control: mean ± 1 SD');
      row(st.b, p.mb, p.sb, 0.9, C.orange, 'treated: mean ± 1 SD');
    },
    readout(s) {
      const p = s.p;
      const st = stats(p);
      const sig = st.t > st.crit;
      return [
        ['t = |x̄₁ − x̄₂| ÷ √(s₁²/n₁ + s₂²/n₂)', st.t.toFixed(2), true],
        ['Critical value (p = 0.05, ' + st.df + ' degrees of freedom)', st.crit.toFixed(3)],
        ['Conclusion', sig ? 't is greater than the critical value: reject the null hypothesis; the difference is significant (p < 0.05)' : 't is smaller than the critical value: accept the null hypothesis; the difference could be due to chance'],
        ['Error bars', (Math.abs(p.ma - p.mb) < p.sa + p.sb ? 'the ±1 SD bars overlap' : 'the ±1 SD bars do not overlap') + ', a rough guide only: the t-test decides']
      ];
    }
  });
})();
