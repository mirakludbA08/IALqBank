/* Chemistry core practicals — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const RGAS = 8.31;

  /* ======================================================================
     1. CP9a: [I₂] against time is a straight line (zero order in iodine)
     rate = k[CH₃COCH₃][H⁺], with propanone and acid in large excess.
     ====================================================================== */
  const K9 = 2.0e-5;   // rate in mol dm⁻³ s⁻¹ when [propanone] = [H⁺] = 1.00 mol dm⁻³
  Sim.create('#sim-chem-prac-iodine', {
    title: 'Iodine–propanone: following [I₂] by titration',
    height: 300,
    controls: [
      { key: 'p', label: '[propanone]', min: 0.5, max: 2, step: 0.25, value: 1, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'h', label: '[H⁺]', min: 0.5, max: 2, step: 0.25, value: 1, unit: 'mol dm⁻³', format: (v) => v.toFixed(2) },
      { key: 'i', label: 'Starting [I₂]', min: 0.002, max: 0.006, step: 0.001, value: 0.004, unit: 'mol dm⁻³', format: (v) => v.toFixed(3) },
      { key: 'ref', type: 'check', label: 'Keep the standard run (1.00, 1.00, 0.004) for comparison', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const g = Sim.graph(ctx, { x: 58, y: 20, w: w - 78, h: h - 20 - 46, xmin: 0, xmax: 600, ymin: 0, ymax: 6, xstep: 100, ystep: 1, xlabel: 'time / s', ylabel: '[I₂] / mmol dm⁻³' });
      g.axes();
      const line = (i0, rate, opt) => {
        const tEnd = Math.min(600, i0 / rate);
        g.path([[0, i0 * 1000], [tEnd, Math.max(0, (i0 - rate * tEnd) * 1000)], [600, Math.max(0, (i0 - rate * 600) * 1000)]], opt);
      };
      if (p.ref) line(0.004, K9, { color: C.grey, width: 2, dash: [6, 4] });
      const rate = K9 * p.p * p.h;
      line(p.i, rate, { color: C.purple, width: 2.8 });
      // sample points, as if from titrations every 60 s
      for (let t = 0; t <= 600; t += 60) {
        const c = Math.max(0, p.i - rate * t) * 1000;
        if (c > 0) g.dot(t, c, { color: C.purple, r: 3.5 });
      }
    },
    readout(s) {
      const p = s.p;
      const rate = K9 * p.p * p.h;
      return [
        ['Rate (minus the gradient)', Sim.fmt(rate) + ' mol dm⁻³ s⁻¹', true],
        ['Compared with the standard run', '× ' + (rate / K9).toFixed(2)],
        ['Changing [I₂]', 'moves the line up or down but does not change its slope: zero order in iodine']
      ];
    }
  });

  /* ======================================================================
     2. CP10: Arrhenius plot of ln(1/t) against 1/T
     ====================================================================== */
  const TEMPS = [293, 303, 313, 323, 333];
  const T0 = 293, t0 = 60;   // 60 s at 20 °C
  // A fixed set of random-looking factors, so the "results" do not jump about on every redraw.
  const NOISE = [0.6, -1.0, 0.3, 0.9, -0.5];

  function results(p) {
    return TEMPS.map((T, i) => {
      const t = t0 * Math.exp((p.ea * 1000 / RGAS) * (1 / T - 1 / T0)) * (1 + NOISE[i] * p.err / 100);
      return { T, t, x: 1 / T, y: Math.log(1 / t) };
    });
  }
  function fit(pts) {
    const n = pts.length;
    const mx = pts.reduce((a, q) => a + q.x, 0) / n, my = pts.reduce((a, q) => a + q.y, 0) / n;
    const sxy = pts.reduce((a, q) => a + (q.x - mx) * (q.y - my), 0), sxx = pts.reduce((a, q) => a + (q.x - mx) * (q.x - mx), 0);
    const m = sxy / sxx;
    return { m, c: my - m * mx };
  }

  Sim.create('#sim-chem-prac-arrhenius', {
    title: 'Activation energy from an Arrhenius plot',
    height: 320,
    controls: [
      { key: 'ea', label: 'Activation energy of the reaction', min: 20, max: 90, step: 1, value: 50, unit: 'kJ mol⁻¹', format: (v) => v.toFixed(0) },
      { key: 'err', label: 'Random error in timing', min: 0, max: 10, step: 1, value: 3, unit: '%', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const pts = results(p);
      const f = fit(pts);
      const ys = pts.map((q) => q.y);
      const ymin = Math.floor(Math.min(...ys) - 0.3), ymax = Math.ceil(Math.max(...ys) + 0.3);
      const g = Sim.graph(ctx, { x: 64, y: 20, w: w - 84, h: h - 20 - 46, xmin: 0.00298, xmax: 0.00343, ymin, ymax, xstep: 0.00005, ystep: 0.5, xlabel: '1/T / K⁻¹', ylabel: 'ln(1/t)' });
      g.axes();
      g.plot((x) => f.m * x + f.c, { color: C.blue, width: 2.2 });
      pts.forEach((q) => g.dot(q.x, q.y, { color: C.red, r: 4.5 }));
    },
    readout(s) {
      const p = s.p;
      const pts = results(p);
      const f = fit(pts);
      const ea = -f.m * RGAS / 1000;
      return [
        ['Gradient = −Ea/R', f.m.toFixed(0) + ' K', true],
        ['Ea = −gradient × 8.31', ea.toFixed(1) + ' kJ mol⁻¹ (true value ' + p.ea + ')'],
        ['Times', pts.map((q) => (q.T - 273) + ' °C: ' + q.t.toFixed(1) + ' s').join(', ')]
      ];
    }
  });
})();
