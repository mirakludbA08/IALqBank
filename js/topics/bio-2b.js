/* Biology 2b: Proteins and DNA — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. Enzyme activity: temperature, pH, substrate and enzyme concentration
     ====================================================================== */
  const ENZ = {
    amylase: { name: 'salivary amylase', pH: 6.8 },
    pepsin: { name: 'pepsin (stomach)', pH: 2.0 },
    trypsin: { name: 'trypsin (small intestine)', pH: 8.0 }
  };
  const KM = 5;            // mmol dm⁻³
  const SITES_PER_PCT = 10; // active-site concentration (mmol dm⁻³) per 1 % enzyme, model scale
  const kT = (T) => Math.pow(2, (T - 37) / 10);                 // Q10 = 2
  const fNative = (T) => 1 / (1 + Math.exp((T - 44) / 3));       // fraction not denatured
  const fPH = (pH, opt) => Math.exp(-Math.pow((pH - opt) / 1.4, 2));
  // initial rate, mmol dm⁻³ min⁻¹: kcat × [enzyme–substrate complex]
  function rateOf(c) {
    const E = c.E * SITES_PER_PCT * fNative(c.T) * fPH(c.pH, ENZ[c.enz].pH);
    const S = c.S;
    if (E <= 0 || S <= 0) return 0;
    const b = E + S + KM;
    const ES = (b - Math.sqrt(Math.max(0, b * b - 4 * E * S))) / 2;
    return 0.5 * kT(c.T) * ES;
  }
  const GX = {
    T: { key: 'T', min: 0, max: 80, step: 10, axis: 'temperature / °C' },
    pH: { key: 'pH', min: 0, max: 14, step: 2, axis: 'pH' },
    S: { key: 'S', min: 0, max: 50, step: 10, axis: '[substrate] / mmol dm⁻³' },
    E: { key: 'E', min: 0, max: 4, step: 1, axis: '[enzyme] / %' }
  };
  const niceMax = (v) => {
    const steps = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100];
    return steps.find((k) => k >= v * 1.08) || Math.ceil(v * 1.1);
  };
  function optimum(c, key, lo, hi) {
    let best = lo, bv = -1;
    for (let i = 0; i <= 400; i++) {
      const x = lo + ((hi - lo) * i) / 400;
      const v = rateOf(Object.assign({}, c, { [key]: x }));
      if (v > bv) { bv = v; best = x; }
    }
    return { x: best, v: bv };
  }
  /* Enzyme with an active site; u = 0 (working shape) … 1 (shape lost). */
  function enzymeIcon(ctx, cx, cy, R, u, t, bound) {
    const pts = [];
    const N = 60;
    for (let i = 0; i <= N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
      let rr = R * (1 + 0.06 * Math.sin(3 * a + 1) + 0.04 * Math.cos(5 * a));
      // the active site: a notch at the top
      const da = Math.atan2(Math.sin(a + Math.PI / 2), Math.cos(a + Math.PI / 2));
      const notch = Math.exp(-Math.pow(da / 0.38, 2));
      rr -= R * 0.42 * notch * (1 - 0.85 * u);
      rr += R * u * 0.16 * Math.sin(7 * a + 2 + t);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    Sim.polyline(ctx, pts, { close: true, fill: u > 0.5 ? '#e5dbff' : '#d3f9d8', color: u > 0.5 ? C.purple : C.green, width: 2 });
    // substrate
    const sy = cy - R * 0.86 - (bound ? 0 : R * 0.55);
    ctx.save();
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.3, sy - R * 0.32);
    ctx.lineTo(cx + R * 0.3, sy - R * 0.32);
    ctx.lineTo(cx, sy + R * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  Sim.create('#sim-bio-2b-enzyme', {
    title: 'Enzyme activity: what limits the rate?',
    alt: 'Graph of the initial rate of an enzyme-controlled reaction against temperature, pH, substrate concentration or enzyme concentration',
    height: (w) => (w >= 720 ? 360 : 520),
    controls: [
      { key: 'gx', type: 'select', label: 'Graph rate against', value: 'T', options: [['T', 'temperature'], ['pH', 'pH'], ['S', 'substrate concentration'], ['E', 'enzyme concentration']] },
      { key: 'enz', type: 'select', label: 'Enzyme', value: 'amylase', options: [['amylase', 'amylase (optimum pH 6.8)'], ['pepsin', 'pepsin (optimum pH 2)'], ['trypsin', 'trypsin (optimum pH 8)']] },
      { key: 'T', label: 'Temperature', min: 0, max: 80, step: 1, value: 37, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'pH', label: 'pH', min: 1, max: 13, step: 0.1, value: 6.8, format: (v) => v.toFixed(1) },
      { key: 'S', label: 'Substrate concentration', min: 0, max: 50, step: 1, value: 20, unit: 'mmol dm⁻³', format: (v) => v.toFixed(0) },
      { key: 'E', label: 'Enzyme concentration', min: 0.1, max: 4, step: 0.1, value: 0.5, unit: '%', format: (v) => v.toFixed(1) }
    ],
    onChange(s, key) { if (key === 'enz') s.set('pH', ENZ[s.p.enz].pH); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 720;
      const G = GX[p.gx];
      const cond = { T: p.T, pH: p.pH, S: p.S, E: p.E, enz: p.enz };
      const f = (x) => rateOf(Object.assign({}, cond, { [G.key]: x }));
      let top = 0;
      for (let i = 0; i <= 200; i++) top = Math.max(top, f(G.min + ((G.max - G.min) * i) / 200));
      const working = fNative(p.T) * fPH(p.pH, ENZ[p.enz].pH);
      const vmax = 0.5 * kT(p.T) * p.E * SITES_PER_PCT * working;   // every active site full
      const smax = 0.5 * kT(p.T) * p.S;                              // every substrate molecule bound
      let ref = 0;
      if (p.gx === 'S') ref = vmax;
      if (p.gx === 'E' && smax < top * 1.6) ref = smax;
      const ymax = niceMax(Math.max(top, ref, 0.05));

      /* the enzyme molecule */
      const ic = wide ? { x: 0, y: 0, w: 190, h } : { x: 0, y: 0, w, h: 120 };
      const u = 1 - working;
      const R = wide ? 42 : 30;
      const icx = wide ? ic.w / 2 : 60, icy = wide ? 110 : 66;
      enzymeIcon(ctx, icx, icy, R, u, 0, working > 0.5);
      const state = working > 0.9 ? 'active site intact' : working > 0.5 ? 'active site slightly changed' : working > 0.1 ? 'most active sites changed' : 'denatured: substrate cannot fit';
      if (wide) {
        Sim.text(ctx, ENZ[p.enz].name, ic.w / 2, 26, { size: 12.5, bold: true, color: C.navy, align: 'center' });
        Sim.text(ctx, state, ic.w / 2, icy + R + 26, { size: 12, bold: true, color: working > 0.5 ? C.green : C.purple, align: 'center' });
        Sim.text(ctx, 'working enzyme: ' + (working * 100).toFixed(0) + '%', ic.w / 2, icy + R + 46, { size: 12, color: C.muted, align: 'center' });
        Sim.text(ctx, 'substrate', ic.w / 2 + R * 0.45, icy - R * 1.45, { size: 11, color: '#b35c00', align: 'left' });
      } else {
        Sim.text(ctx, ENZ[p.enz].name, 112, 34, { size: 12.5, bold: true, color: C.navy });
        Sim.text(ctx, state, 112, 56, { size: 12, bold: true, color: working > 0.5 ? C.green : C.purple });
        Sim.text(ctx, 'working enzyme: ' + (working * 100).toFixed(0) + '%', 112, 76, { size: 12, color: C.muted });
      }

      /* the graph */
      const gb = wide ? { x: ic.w + 56, y: 34, w: w - ic.w - 56 - 20, h: h - 34 - 46 } : { x: 50, y: ic.h + 30, w: w - 50 - 16, h: h - ic.h - 30 - 44 };
      const g = Sim.graph(ctx, Object.assign({ xmin: G.min, xmax: G.max, xstep: G.step, ymin: 0, ymax }, gb)).axes();
      Sim.text(ctx, 'initial rate / mmol dm⁻³ min⁻¹', gb.x - 40, gb.y + gb.h / 2, { size: 12.5, bold: true, color: C.ink, align: 'center', rotate: -Math.PI / 2 });
      Sim.text(ctx, G.axis, gb.x + gb.w / 2, gb.y + gb.h + 32, { size: 12.5, bold: true, color: C.ink, align: 'center' });
      const lab = (x, y, str, col, align) => g.label(x, y, str, { size: 11.5, color: col, align: align || 'center', bg: 'rgba(255,255,255,0.85)' });
      if (p.gx === 'T' || p.gx === 'pH') {
        const o = optimum(cond, G.key, Math.max(G.min, 0.5), G.max);
        if (o.v > 1e-6) {
          g.vline(o.x, { color: C.green, dash: [5, 4] });
          lab(o.x, ymax * 0.93, 'optimum ' + (p.gx === 'T' ? Math.round(o.x) + ' °C' : 'pH ' + o.x.toFixed(1)), C.green);
        }
        if (p.gx === 'T' && o.x < 76) {
          g.fill((x) => ymax, o.x + 6, G.max, { color: 'rgba(112,72,232,0.07)' });
          lab(Math.min(70, o.x + 20), ymax * 0.72, 'denaturation', C.purple);
          if (o.x > 22) lab(o.x / 2, ymax * 0.82, 'more collisions', '#1864ab');
        }
      }
      if (p.gx === 'S') {
        if (vmax > 1e-6) {
          g.hline(vmax, { color: C.green, dash: [6, 4] });
          lab(G.max, vmax, 'all active sites occupied', C.green, 'right');
          lab(9, vmax * 0.18, 'substrate limits', '#1864ab', 'left');
        }
      }
      if (p.gx === 'E') {
        if (ref > 1e-6) {
          g.hline(smax, { color: C.green, dash: [6, 4] });
          lab(G.max, smax, 'substrate now limits the rate', C.green, 'right');
        }
      }
      g.plot(f, { color: C.orange, width: 3, samples: 300 });
      const xNow = p[G.key];
      g.dot(clamp(xNow, G.min, G.max), f(xNow), { color: C.navy, r: 6 });
    },
    readout(s) {
      const p = s.p;
      const cond = { T: p.T, pH: p.pH, S: p.S, E: p.E, enz: p.enz };
      const r = rateOf(cond);
      const working = fNative(p.T) * fPH(p.pH, ENZ[p.enz].pH);
      const vmax = 0.5 * kT(p.T) * p.E * SITES_PER_PCT * working;
      const smax = 0.5 * kT(p.T) * p.S;
      let limit;
      if (working < 0.05) limit = 'the enzyme is denatured or inactive at this temperature and pH';
      else if (r > 0.9 * vmax) limit = 'enzyme concentration (nearly all active sites are full)';
      else if (r > 0.9 * smax) limit = 'substrate concentration (too little substrate for the enzyme)';
      else limit = 'both substrate and enzyme concentration';
      return [
        ['initial rate =', Sim.fmt(r, 3) + ' mmol dm⁻³ min⁻¹', true],
        ['enzyme with a working active site:', (working * 100).toFixed(0) + '%'],
        ['the rate is limited by:', limit]
      ];
    }
  });

  /* ======================================================================
     2. Meselson and Stahl: DNA bands in a density gradient
     ====================================================================== */
  const DENS = { light: 1.710, hybrid: 1.717, heavy: 1.724 };   // g cm⁻³ in CsCl
  const MODELS = {
    semi: 'semi-conservative',
    cons: 'conservative',
    disp: 'dispersive'
  };
  /* Bands after g generations in ¹⁴N: list of { density, frac, kind } */
  function bands(model, g) {
    if (g === 0) return [{ d: DENS.heavy, frac: 1, kind: 'heavy' }];
    const n = Math.pow(2, g);
    if (model === 'semi') {
      const hyb = 2 / n;
      const out = [{ d: DENS.hybrid, frac: hyb, kind: 'hybrid' }];
      if (hyb < 1) out.push({ d: DENS.light, frac: 1 - hyb, kind: 'light' });
      return out;
    }
    if (model === 'cons') return [{ d: DENS.heavy, frac: 1 / n, kind: 'heavy' }, { d: DENS.light, frac: 1 - 1 / n, kind: 'light' }];
    const fh = 1 / n;   // dispersive: every molecule is the same mixture
    return [{ d: DENS.light + (DENS.heavy - DENS.light) * fh, frac: 1, kind: 'mixed', fh }];
  }
  /* The strands of each molecule after g generations: [ [strandA, strandB], ... ]
     where a strand is 'H', 'L' or a number (fraction heavy, dispersive). */
  function molecules(model, g) {
    const n = Math.pow(2, g);
    const out = [];
    for (let i = 0; i < n; i++) {
      if (g === 0) out.push(['H', 'H']);
      else if (model === 'semi') out.push(i < 2 ? ['H', 'L'] : ['L', 'L']);
      else if (model === 'cons') out.push(i < 1 ? ['H', 'H'] : ['L', 'L']);
      else out.push([1 / n, 1 / n]);
    }
    return out;
  }
  const HEAVY = '#1c3d8f', LIGHT = '#ffa94d';

  Sim.create('#sim-bio-2b-meselson', {
    title: 'Meselson and Stahl: DNA after each generation in ¹⁴N',
    alt: 'Centrifuge tubes showing DNA bands at heavy, hybrid and light positions after 0, 1, 2 and 3 generations, and the strands of the DNA molecules',
    height: (w) => (w >= 700 ? 340 : 520),
    controls: [
      { key: 'model', type: 'select', label: 'Model of replication', value: 'semi', options: [['semi', 'semi-conservative'], ['cons', 'conservative'], ['disp', 'dispersive']] },
      { key: 'gen', label: 'Generations in light nitrogen (¹⁴N)', min: 0, max: 3, step: 1, value: 1, format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 700;
      const G = Math.round(p.gen);
      /* tubes */
      const tp = wide ? { x: 0, y: 0, w: Math.round(w * 0.52), h } : { x: 0, y: 0, w, h: 300 };
      const scaleW = wide ? 120 : 92;
      const tubeTop = tp.y + 44, tubeBot = tp.y + tp.h - 40;
      const yOf = (d) => tubeTop + 22 + ((d - 1.700) / (1.734 - 1.700)) * (tubeBot - tubeTop - 40);
      const slotW = (tp.w - scaleW - 10) / 4;
      const tw = Math.min(40, slotW * 0.6);
      Sim.text(ctx, 'density gradient after centrifuging', tp.x + 12, tp.y + 16, { size: 12.5, bold: true, color: C.navy });
      // density scale
      [['light', DENS.light, '¹⁴N/¹⁴N'], ['hybrid', DENS.hybrid, '¹⁵N/¹⁴N'], ['heavy', DENS.heavy, '¹⁵N/¹⁵N']].forEach(([k, d, iso]) => {
        const y = yOf(d);
        Sim.line(ctx, tp.x + scaleW - 6, y, tp.x + tp.w - 8, y, { color: '#ced4da', dash: [3, 4], width: 1 });
        Sim.text(ctx, k + (wide ? ' ' + iso : ''), tp.x + 10, y - 7, { size: 11.5, bold: true, color: k === 'heavy' ? HEAVY : k === 'light' ? '#d9480f' : C.purple });
        Sim.text(ctx, d.toFixed(3) + ' g cm⁻³', tp.x + 10, y + 8, { size: 10.5, color: C.muted });
      });
      for (let gi = 0; gi <= 3; gi++) {
        const cx = tp.x + scaleW + slotW * (gi + 0.5);
        const on = gi <= G;
        ctx.save();
        ctx.globalAlpha = on ? 1 : 0.3;
        // tube with a CsCl gradient
        const grad = ctx.createLinearGradient(0, tubeTop, 0, tubeBot);
        grad.addColorStop(0, '#f8f9fa');
        grad.addColorStop(1, '#dee2e6');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(cx - tw / 2, tubeTop);
        ctx.lineTo(cx - tw / 2, tubeBot - tw / 2);
        ctx.arc(cx, tubeBot - tw / 2, tw / 2, Math.PI, 0, true);
        ctx.lineTo(cx + tw / 2, tubeTop);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        if (on) {
          bands(p.model, gi).forEach((b) => {
            const y = yOf(b.d);
            const col = b.kind === 'heavy' ? HEAVY : b.kind === 'light' ? '#e8590c' : C.purple;
            ctx.globalAlpha = 0.3 + 0.7 * b.frac;
            Sim.rect(ctx, cx - tw / 2 + 2, y - 4, tw - 4, 8, { fill: col, r: 3 });
            ctx.globalAlpha = 1;
          });
        }
        ctx.restore();
        Sim.text(ctx, String(gi), cx, tubeBot + 14, { size: 13, bold: true, color: gi === G ? C.blue : C.muted, align: 'center' });
        if (gi === G) Sim.rect(ctx, cx - slotW / 2 + 3, tubeTop - 10, slotW - 6, tubeBot - tubeTop + 34, { stroke: C.blue, width: 2, r: 8 });
      }
      Sim.text(ctx, 'generations', tp.x + scaleW + slotW * 2, tubeBot + 32, { size: 11.5, color: C.muted, align: 'center' });

      /* the DNA molecules after the chosen generation */
      const mp = wide ? { x: tp.w + 10, y: 0, w: w - tp.w - 20, h } : { x: 0, y: tp.h + 4, w, h: h - tp.h - 4 };
      const mols = molecules(p.model, G);
      Sim.text(ctx, mols.length + ' DNA molecule' + (mols.length > 1 ? 's' : '') + ' (from 1 original)', mp.x + 12, mp.y + 16, { size: 12.5, bold: true, color: C.navy });
      const cols = mols.length <= 2 ? mols.length : mols.length <= 4 ? 4 : 4;
      const rows = Math.ceil(mols.length / cols);
      const cellW = (mp.w - 24) / cols, cellH = Math.min(70, (mp.h - 70) / rows);
      mols.forEach((m, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x0 = mp.x + 12 + c * cellW + cellW * 0.15, x1 = x0 + cellW * 0.7;
        const y0 = mp.y + 40 + r * (cellH + 6);
        [0, 1].forEach((k) => {
          const y = y0 + 8 + k * Math.min(22, cellH * 0.4);
          const st = m[k];
          if (st === 'H' || st === 'L') {
            Sim.line(ctx, x0, y, x1, y, { color: st === 'H' ? HEAVY : LIGHT, width: 6, cap: 'butt' });
          } else {
            // dispersive: pieces of old and new DNA along every strand
            const nSeg = 8;
            const nHeavy = Math.max(1, Math.round(st * nSeg));
            const seq = [];
            for (let q = 0; q < nSeg; q++) seq.push(((q * 5 + i * 3 + k * 2) % nSeg) < nHeavy);
            for (let q = 0; q < nSeg; q++) {
              const a = x0 + ((x1 - x0) * q) / nSeg, b = x0 + ((x1 - x0) * (q + 1)) / nSeg;
              Sim.line(ctx, a, y, b, y, { color: seq[q] ? HEAVY : LIGHT, width: 6, cap: 'butt' });
            }
          }
        });
        // rungs
        const yA = y0 + 8, yB = y0 + 8 + Math.min(22, cellH * 0.4);
        for (let q = 1; q < 6; q++) {
          const x = x0 + ((x1 - x0) * q) / 6;
          Sim.line(ctx, x, yA + 3, x, yB - 3, { color: '#adb5bd', width: 1.2 });
        }
      });
      // key
      const ky = mp.y + mp.h - 18;
      Sim.line(ctx, mp.x + 14, ky, mp.x + 36, ky, { color: HEAVY, width: 6, cap: 'butt' });
      Sim.text(ctx, 'old strand (¹⁵N)', mp.x + 42, ky, { size: 11.5, color: C.ink });
      const k2 = mp.x + 42 + Sim.measure(ctx, 'old strand (¹⁵N)', { size: 11.5 }) + 18;
      Sim.line(ctx, k2, ky, k2 + 22, ky, { color: LIGHT, width: 6, cap: 'butt' });
      Sim.text(ctx, 'new strand (¹⁴N)', k2 + 28, ky, { size: 11.5, color: C.ink });
    },
    readout(s) {
      const p = s.p, G = Math.round(p.gen);
      const b = bands(p.model, G);
      const pct = (kind) => { const x = b.find((q) => q.kind === kind); return x ? (x.frac * 100).toFixed(1).replace(/\.0$/, '') + '%' : '0%'; };
      const out = [['model:', MODELS[p.model]]];
      if (p.model === 'disp' && G > 0) out.push(['one band, made of', (100 / Math.pow(2, G)).toFixed(1).replace(/\.0$/, '') + '% ¹⁵N DNA']);
      else out.push(['heavy:', pct('heavy')], ['hybrid:', pct('hybrid')], ['light:', pct('light')]);
      const real = bands('semi', G);
      const same = real.length === b.length && real.every((q, i) => Math.abs(q.d - b[i].d) < 1e-6 && Math.abs(q.frac - b[i].frac) < 1e-6);
      out.push(['matches what Meselson and Stahl saw?', same ? 'yes' : 'no: this model is ruled out', true]);
      return out;
    }
  });
})();
