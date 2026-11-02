/* Chemistry topic 14: Acid-base equilibria — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const KW = 1e-14;

  /* Exact pH of a mixture from the charge balance
       [H⁺] + [cations] = [OH⁻] + [Cl⁻] + [A⁻]
     acid: total weak-acid concentration ca with Ka (a strong acid is given a huge Ka);
     base: total base concentration cb; kab is Ka of its conjugate acid (0 for NaOH);
     na and cl are spectator Na⁺ and Cl⁻ from salts or added strong acid/alkali.
     Every term rises with [H⁺] except [OH⁻], which falls, so bisection on log[H⁺] works. */
  function pHof(o) {
    const f = (h) => {
      const base = o.cb ? (o.kab ? o.cb * h / (h + o.kab) : o.cb) : 0;
      const acid = o.ca ? o.ca * o.ka / (o.ka + h) : 0;
      return h + base + (o.na || 0) - KW / h - (o.cl || 0) - acid;
    };
    let lo = -15, hi = 1.5;
    for (let i = 0; i < 80; i++) {
      const m = (lo + hi) / 2;
      if (f(Math.pow(10, m)) > 0) hi = m; else lo = m;
    }
    return -(lo + hi) / 2;
  }

  // Universal-indicator style colour for a pH value: red, orange, yellow, green, blue, violet.
  function uiColour(pH, alpha) {
    const hue = clamp((pH - 1) / 12, 0, 1) * 270;
    return 'hsla(' + hue.toFixed(0) + ',75%,52%,' + (alpha == null ? 0.75 : alpha) + ')';
  }

  /* ======================================================================
     1. Titration curves: 25.0 cm³ of 0.100 mol dm⁻³ acid, 0.100 mol dm⁻³ base
     ====================================================================== */
  const ACIDS = {
    hcl: { name: 'HCl (strong)', ka: 1e8 },
    eth: { name: 'CH₃COOH (weak, pKa 4.77)', ka: 1.7e-5 }
  };
  const BASES = {
    naoh: { name: 'NaOH (strong)', kab: 0 },
    nh3: { name: 'NH₃ (weak, pKa of NH₄⁺ 9.25)', kab: 5.6e-10 }
  };
  const INDICATORS = {
    mo: { name: 'methyl orange', lo: 3.1, hi: 4.4 },
    pp: { name: 'phenolphthalein', lo: 8.3, hi: 10.0 }
  };
  const VA = 25, CA = 0.1, CB = 0.1, VEQ = VA * CA / CB;
  const titPH = (acid, base, vb) => {
    const vt = VA + vb;
    return pHof({ ca: CA * VA / vt, ka: ACIDS[acid].ka, cb: CB * vb / vt, kab: BASES[base].kab });
  };
  function indicatorColour(ind, pH) {
    if (ind === 'mo') {
      const t = clamp((pH - 3.1) / 1.3, 0, 1);    // red → yellow
      return 'rgba(' + Math.round(220 + 20 * t) + ',' + Math.round(40 + 160 * t) + ',' + Math.round(40 - 10 * t) + ',0.7)';
    }
    if (ind === 'pp') {
      const t = clamp((pH - 8.3) / 1.7, 0, 1);    // colourless → pink
      if (t === 0) return 'rgba(208,228,255,0.55)';
      return 'rgba(214,51,140,' + (0.15 + 0.55 * t).toFixed(2) + ')';
    }
    return 'rgba(208,228,255,0.55)';
  }
  // The steep section: pH from 0.5 cm³ before to 0.5 cm³ after the equivalence point.
  const steep = (acid, base) => [titPH(acid, base, VEQ - 0.5), titPH(acid, base, VEQ + 0.5)];

  Sim.create('#sim-chem-14-titration', {
    title: 'Titration curves and indicators',
    height: (w) => (w >= 680 ? 360 : 600),
    controls: [
      { key: 'acid', type: 'select', label: 'Acid in the flask (25.0 cm³, 0.100 mol dm⁻³)', options: Object.keys(ACIDS).map((k) => [k, ACIDS[k].name]), value: 'eth' },
      { key: 'base', type: 'select', label: 'Base in the burette (0.100 mol dm⁻³)', options: Object.keys(BASES).map((k) => [k, BASES[k].name]), value: 'naoh' },
      { key: 'vb', label: 'Volume of base added', min: 0, max: 50, step: 0.1, value: 12.5, unit: 'cm³', format: (v) => v.toFixed(1) },
      { key: 'ind', type: 'select', label: 'Indicator in the flask', options: [['none', 'none'], ['mo', 'methyl orange'], ['pp', 'phenolphthalein']], value: 'pp' },
      { key: 'bands', type: 'check', label: 'Show indicator ranges', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 680;
      const pH = titPH(p.acid, p.base, p.vb);
      /* flask */
      const fx = wide ? 24 : w / 2 - 50, fy = wide ? 110 : 30, fw = 100, fh = 110;
      const neck = 28;
      Sim.line(ctx, fx + fw / 2, fy - 90, fx + fw / 2, fy - 20, { color: C.grey, width: 6 });
      Sim.text(ctx, 'burette: ' + p.vb.toFixed(1) + ' cm³ added', fx + fw / 2, fy - 98, { size: 11.5, color: C.muted, align: 'center' });
      const pts = [[fx + fw / 2 - neck / 2, fy], [fx + fw / 2 - neck / 2, fy + 26], [fx, fy + fh], [fx + fw, fy + fh], [fx + fw / 2 + neck / 2, fy + 26], [fx + fw / 2 + neck / 2, fy]];
      ctx.save();
      ctx.beginPath();
      const ly = fy + fh * 0.45;
      const wAt = (yy) => (fw / 2 - neck / 2) * (yy - (fy + 26)) / (fh - 26);
      ctx.moveTo(fx + fw / 2 - neck / 2 - wAt(ly), ly);
      ctx.lineTo(fx + 2, fy + fh - 2);
      ctx.lineTo(fx + fw - 2, fy + fh - 2);
      ctx.lineTo(fx + fw / 2 + neck / 2 + wAt(ly), ly);
      ctx.closePath();
      ctx.fillStyle = indicatorColour(p.ind, pH);
      ctx.fill();
      ctx.restore();
      Sim.polyline(ctx, pts, { color: '#868e96', width: 2 });
      Sim.text(ctx, 'pH ' + pH.toFixed(2), fx + fw / 2, fy + fh + 20, { size: 15, bold: true, color: C.navy, align: 'center' });
      /* curve */
      const gb = wide ? { x: 200, y: 20, w: w - 200 - 20, h: h - 20 - 46 } : { x: 46, y: 210, w: w - 46 - 16, h: h - 210 - 46 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: 0, xmax: 50, ymin: 0, ymax: 14, xstep: 10, ystep: 2, xlabel: 'volume of base added / cm³', ylabel: 'pH' }));
      if (p.bands) {
        Object.keys(INDICATORS).forEach((k) => {
          const I = INDICATORS[k];
          Sim.rect(ctx, g.x, g.py(I.hi), g.w, g.py(I.lo) - g.py(I.hi), { fill: k === 'mo' ? 'rgba(240,140,0,0.16)' : 'rgba(214,51,140,0.14)' });
          Sim.text(ctx, I.name, g.x + g.w - 4, g.py(I.hi) + 11, { size: 11, color: k === 'mo' ? '#b35f00' : '#a61e6a', align: 'right' });
        });
      }
      g.axes();
      g.plot((v) => titPH(p.acid, p.base, v), { color: C.navy, width: 2.8, samples: 400 });
      g.vline(VEQ, { color: C.grey });
      const pEq = titPH(p.acid, p.base, VEQ);
      g.dot(VEQ, pEq, { color: C.red, r: 4.5 });
      Sim.text(ctx, 'equivalence, pH ' + pEq.toFixed(2), g.px(VEQ) + 6, g.py(pEq) + (pEq > 7 ? 16 : -10), { size: 11.5, bold: true, color: C.red });
      if (p.acid === 'eth') {
        const pHalf = titPH(p.acid, p.base, VEQ / 2);
        g.dot(VEQ / 2, pHalf, { color: C.purple, r: 4.5 });
        Sim.text(ctx, 'half-neutralised: pH = pKa', g.px(VEQ / 2), g.py(pHalf) - 12, { size: 11.5, bold: true, color: C.purple, align: 'center' });
      }
      g.dot(p.vb, pH, { color: C.orange, r: 5.5 });
    },
    readout(s) {
      const p = s.p;
      const [a, b] = steep(p.acid, p.base);
      const ok = Object.keys(INDICATORS).filter((k) => INDICATORS[k].lo >= a && INDICATORS[k].hi <= b).map((k) => INDICATORS[k].name);
      const rows = [
        ['pH now', titPH(p.acid, p.base, p.vb).toFixed(2), true],
        ['Equivalence point', VEQ.toFixed(1) + ' cm³, pH ' + titPH(p.acid, p.base, VEQ).toFixed(2)],
        ['Steep section (±0.5 cm³)', 'pH ' + a.toFixed(1) + ' to ' + b.toFixed(1)],
        ['Suitable indicator', ok.length ? ok.join(' or ') : 'none: no sharp change, use a pH meter']
      ];
      if (p.acid === 'eth') rows.push(['pH at 12.5 cm³', titPH(p.acid, p.base, 12.5).toFixed(2) + ' = pKa of ethanoic acid']);
      return rows;
    }
  });

  /* ======================================================================
     2. A buffer against pure water: 100 cm³ of each, acid or alkali added as
        a few drops of concentrated solution (volume change ignored)
     ====================================================================== */
  const KA_ETH = 1.7e-5, VOL = 0.1;
  const waterPH = (mmol) => pHof({ na: Math.max(0, mmol) / 1000 / VOL, cl: Math.max(0, -mmol) / 1000 / VOL });
  const bufferPH = (mmol, c) => pHof({ ca: 2 * c, ka: KA_ETH, na: c + Math.max(0, mmol) / 1000 / VOL, cl: Math.max(0, -mmol) / 1000 / VOL });

  function beaker(ctx, x, y, w, h, pH, label) {
    Sim.rect(ctx, x + 3, y + h * 0.25, w - 6, h * 0.75 - 3, { fill: uiColour(pH, 0.55) });
    Sim.polyline(ctx, [[x, y], [x, y + h], [x + w, y + h], [x + w, y]], { color: '#868e96', width: 2.5 });
    Sim.text(ctx, 'pH ' + pH.toFixed(2), x + w / 2, y + h * 0.62, { size: 15, bold: true, color: C.ink, align: 'center', bg: 'rgba(255,255,255,0.75)', pad: 3 });
    Sim.text(ctx, label, x + w / 2, y + h + 16, { size: 12, color: C.ink, align: 'center' });
  }

  Sim.create('#sim-chem-14-buffer', {
    title: 'Buffer or water?',
    height: (w) => (w >= 680 ? 330 : 560),
    controls: [
      { key: 'add', label: 'Added (left: HCl, right: NaOH)', min: -6, max: 6, step: 0.1, value: 0, unit: 'mmol', format: (v) => (v < 0 ? Math.abs(v).toFixed(1) + ' mmol HCl' : v > 0 ? v.toFixed(1) + ' mmol NaOH' : 'nothing') },
      { key: 'c', type: 'select', label: 'Buffer: ethanoic acid and sodium ethanoate, each', options: [['0.05', '0.050 mol dm⁻³'], ['0.1', '0.100 mol dm⁻³'], ['0.2', '0.200 mol dm⁻³']], value: '0.1' }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 680;
      const c = +p.c;
      const pw = waterPH(p.add), pb = bufferPH(p.add, c);
      const bw = 92, bh = 110;
      if (wide) {
        beaker(ctx, 24, 40, bw, bh, pw, '100 cm³ water');
        beaker(ctx, 24 + bw + 30, 40, bw, bh, pb, '100 cm³ buffer');
      } else {
        beaker(ctx, w / 2 - bw - 15, 30, bw, bh, pw, '100 cm³ water');
        beaker(ctx, w / 2 + 15, 30, bw, bh, pb, '100 cm³ buffer');
      }
      const gb = wide ? { x: 2 * bw + 110, y: 20, w: w - 2 * bw - 130, h: h - 20 - 46 } : { x: 46, y: 200, w: w - 62, h: h - 200 - 46 };
      const g = Sim.graph(ctx, Object.assign({}, gb, { xmin: -6, xmax: 6, ymin: 0, ymax: 14, xstep: 2, ystep: 2, xlabel: '← HCl added / mmol      NaOH added / mmol →', ylabel: 'pH' }));
      g.axes();
      g.plot((m) => waterPH(m), { color: C.grey, width: 2.4, samples: 300 });
      g.plot((m) => bufferPH(m, c), { color: C.blue, width: 2.8, samples: 300 });
      g.dot(p.add, pw, { color: C.grey, r: 5 });
      g.dot(p.add, pb, { color: C.blue, r: 5 });
      const cap = c * VOL * 1000;
      if (cap <= 6) {
        g.vline(cap, { color: C.red, dash: [3, 4], width: 1 });
        g.vline(-cap, { color: C.red, dash: [3, 4], width: 1 });
        Sim.text(ctx, 'buffer used up', g.px(cap) - 4, g.y + 12, { size: 11, color: C.red, align: 'right' });
      }
      Sim.text(ctx, 'water', g.x + g.w - 6, g.py(waterPH(5.5)) - 10, { size: 12, bold: true, color: C.grey, align: 'right' });
      Sim.text(ctx, 'buffer', g.x + 8, g.py(bufferPH(-1, c)) - 12, { size: 12, bold: true, color: C.blue });
    },
    readout(s) {
      const p = s.p;
      const c = +p.c;
      const pw = waterPH(p.add), pb = bufferPH(p.add, c);
      const pw0 = waterPH(0), pb0 = bufferPH(0, c);
      const sign = (d) => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2);
      const n = c * VOL * 1000;
      const acid = n - p.add, salt = n + p.add;
      return [
        ['Buffer pH', pb.toFixed(2) + ' (change ' + sign(pb - pb0) + ')', true],
        ['Water pH', pw.toFixed(2) + ' (change ' + sign(pw - pw0) + ')'],
        ['Buffer now holds', acid > 0 && salt > 0 ? acid.toFixed(1) + ' mmol acid, ' + salt.toFixed(1) + ' mmol ethanoate' : (acid <= 0 ? 'no ethanoic acid left' : 'no ethanoate left') + ': it has stopped buffering']
      ];
    }
  });
})();
