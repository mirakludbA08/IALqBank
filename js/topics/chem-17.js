/* Chemistry topic 17: Transition metals — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     1. d-orbital splitting and colour
     ====================================================================== */
  const PRESETS = {
    cuaq: { name: '[Cu(H₂O)₆]²⁺', nm: 615, d: 9 },
    cunh3: { name: '[Cu(NH₃)₄(H₂O)₂]²⁺', nm: 585, d: 9 },
    cucl4: { name: '[CuCl₄]²⁻', nm: 430, d: 9 },
    coaq: { name: '[Co(H₂O)₆]²⁺', nm: 515, d: 7 },
    cocl4: { name: '[CoCl₄]²⁻', nm: 625, d: 7 },
    niaq: { name: '[Ni(H₂O)₆]²⁺', nm: 680, d: 8 },
    custom: { name: 'choose your own gap', nm: 550, d: 9 }
  };
  // The colour seen is the complementary colour of the light absorbed, read from a
  // colour wheel: absorb violet, see yellow; absorb orange, see blue; absorb red, see green.
  const WHEEL = [
    [400, [230, 225, 40]], [450, [240, 170, 40]], [480, [240, 120, 40]], [500, [220, 60, 60]],
    [530, [215, 70, 150]], [560, [140, 60, 190]], [585, [70, 60, 200]], [605, [40, 90, 225]],
    [625, [40, 140, 215]], [650, [50, 170, 110]], [700, [80, 190, 80]]
  ];
  function seen(nm) {
    for (let i = 1; i < WHEEL.length; i++) {
      if (nm <= WHEEL[i][0]) {
        const [a, ca] = WHEEL[i - 1], [b, cb] = WHEEL[i];
        const t = (nm - a) / (b - a);
        return ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
      }
    }
    return WHEEL[WHEEL.length - 1][1];
  }
  const kJ = (nm) => 119627 / nm;   // energy of one mole of photons, kJ mol⁻¹

  Sim.create('#sim-chem-17-colour', {
    title: 'd-orbital splitting and colour',
    height: (w) => (w >= 640 ? 300 : 460),
    controls: [
      { key: 'pre', type: 'select', label: 'Complex ion', options: Object.keys(PRESETS).map((k) => [k, PRESETS[k].name]), value: 'cuaq' },
      { key: 'nm', label: 'Wavelength absorbed (sets ΔE)', min: 400, max: 700, step: 5, value: 615, unit: 'nm', format: (v) => v.toFixed(0) }
    ],
    onChange(s, key, v) {
      if (key === 'pre' && v !== 'custom') s.set('nm', PRESETS[v].nm);
      if (key === 'nm' && s.p.pre !== 'custom') s.set('pre', 'custom');
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const dE = kJ(p.nm);
      // energy diagram: five degenerate d orbitals split into three lower and two upper
      const dx = 30, dw = wide ? w * 0.42 : w - 60, base = wide ? h - 70 : 200;
      const gap = clamp((dE - 150) / 160, 0, 1) * 70 + 40;
      const yUp = base - gap, yLow = base;
      const box = (x, y, n) => {
        Sim.line(ctx, x, y, x + 34, y, { color: C.ink, width: 2.5 });
        if (n >= 1) Sim.text(ctx, '↑', x + 11, y - 9, { size: 15, bold: true, color: C.navy, align: 'center' });
        if (n >= 2) Sim.text(ctx, '↓', x + 23, y - 9, { size: 15, bold: true, color: C.navy, align: 'center' });
      };
      // fill with the d electrons of the ion (ground state), then show one promoted
      const nd = PRESETS[p.pre].d;
      const low = [0, 0, 0], up = [0, 0];
      let e = nd;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < 3 && e > 0; i++) if (low[i] === pass) { low[i]++; e--; }
        for (let i = 0; i < 2 && e > 0; i++) if (up[i] === pass) { up[i]++; e--; }
      }
      const lx = dx + 96;
      [0, 1, 2].forEach((i) => box(lx + i * 44, yLow, low[i]));
      [0, 1].forEach((i) => box(lx + 22 + i * 44, yUp, up[i]));
      Sim.arrow(ctx, lx + 150, yLow, lx + 150, yUp, { color: C.red, width: 2, head: 7 });
      Sim.arrow(ctx, lx + 150, yUp, lx + 150, yLow, { color: C.red, width: 2, head: 7 });
      Sim.text(ctx, 'ΔE = ' + dE.toFixed(0) + ' kJ mol⁻¹', lx + 158, (yUp + yLow) / 2, { size: 12.5, bold: true, color: C.red });
      Sim.text(ctx, 'd orbitals in an octahedral complex (' + nd + ' d electrons)', dx, 18, { size: 12, bold: true, color: C.navy });
      // incoming photon, to the left of the orbitals
      const px0 = dx - 20, py0 = (yUp + yLow) / 2;
      ctx.save();
      ctx.strokeStyle = Sim.spectrum(p.nm);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.02) {
        const x = px0 + 20 + t * 70, y = py0 + Math.sin(t * Math.PI * 8) * 6;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      Sim.text(ctx, 'photon, ' + p.nm + ' nm', px0 + 20, py0 + 20, { size: 11.5, color: C.muted });
      // spectrum strip with the absorbed band darkened
      const sx = wide ? w * 0.52 : 30, sw = wide ? w * 0.45 : w - 60, sy = wide ? 40 : 250;
      for (let x = 0; x < sw; x++) {
        const nm = 400 + 300 * x / sw;
        const a = Math.exp(-Math.pow((nm - p.nm) / 38, 2));
        Sim.line(ctx, sx + x, sy, sx + x, sy + 26, { color: Sim.spectrum(nm), width: 1.2 });
        if (a > 0.02) Sim.line(ctx, sx + x, sy, sx + x, sy + 26, { color: 'rgba(20,20,30,' + (0.85 * a).toFixed(2) + ')', width: 1.2 });
      }
      Sim.text(ctx, '400 nm', sx, sy + 40, { size: 11, color: C.muted });
      Sim.text(ctx, '700 nm', sx + sw, sy + 40, { size: 11, color: C.muted, align: 'right' });
      Sim.text(ctx, 'white light, with the absorbed band removed', sx, sy - 10, { size: 11.5, color: C.ink });
      // the solution
      const c = seen(p.nm);
      const tx = sx + sw / 2 - 30, ty = sy + 60;
      Sim.rect(ctx, tx, ty + 20, 60, 90, { fill: 'rgb(' + c.join(',') + ')', r: 6 });
      Sim.polyline(ctx, [[tx, ty], [tx, ty + 110], [tx + 60, ty + 110], [tx + 60, ty]], { color: '#868e96', width: 2 });
      Sim.text(ctx, 'colour seen', tx + 30, ty + 128, { size: 12, bold: true, color: C.ink, align: 'center' });
    },
    readout(s) {
      const p = s.p;
      return [
        ['Light absorbed', p.nm + ' nm', true],
        ['Energy gap ΔE = hf', kJ(p.nm).toFixed(0) + ' kJ mol⁻¹'],
        ['Larger ΔE', 'absorbs shorter wavelengths (towards blue), so the colour seen shifts towards red and yellow']
      ];
    }
  });

  /* ======================================================================
     2. Test-tube reactions of metal aqua ions
     ====================================================================== */
  const ION = {
    cu: { sym: 'Cu', q: 2, sol: [70, 150, 230, 0.75], solName: 'blue', ppt: '#3d7fd1', pptName: 'blue',
      nh3Xs: { sol: [40, 50, 200, 0.85], what: 'deep blue solution', prod: '[Cu(NH₃)₄(H₂O)₂]²⁺', eq: '[Cu(OH)₂(H₂O)₄] + 4NH₃ → [Cu(NH₃)₄(H₂O)₂]²⁺ + 2H₂O + 2OH⁻', type: 'ligand exchange (incomplete: two water ligands stay)' },
      hcl: { sol: [160, 200, 60, 0.75], what: 'yellow-green solution', prod: '[CuCl₄]²⁻, tetrahedral', eq: '[Cu(H₂O)₆]²⁺ + 4Cl⁻ ⇌ [CuCl₄]²⁻ + 6H₂O', type: 'ligand exchange; coordination number 6 → 4' } },
    fe2: { sym: 'Fe', q: 2, sol: [150, 200, 140, 0.5], solName: 'pale green', ppt: '#4f7a3a', pptName: 'green',
      air: 'on standing in air the precipitate turns orange-brown at the surface, as iron(II) is oxidised to [Fe(OH)₃(H₂O)₃]' },
    fe3: { sym: 'Fe', q: 3, sol: [200, 140, 40, 0.6], solName: 'yellow-brown', ppt: '#9c4a14', pptName: 'orange-brown' },
    cr3: { sym: 'Cr', q: 3, sol: [60, 140, 80, 0.6], solName: 'green', ppt: '#5f7f5f', pptName: 'grey-green',
      ohXs: { sol: [30, 110, 50, 0.75], what: 'dark green solution', prod: '[Cr(OH)₆]³⁻', eq: '[Cr(OH)₃(H₂O)₃] + 3OH⁻ → [Cr(OH)₆]³⁻ + 3H₂O', type: 'amphoteric hydroxide: deprotonation continues' },
      nh3Xs: { sol: [130, 60, 160, 0.65], what: 'purple solution (slowly, with a large excess)', prod: '[Cr(NH₃)₆]³⁺', eq: '[Cr(OH)₃(H₂O)₃] + 6NH₃ → [Cr(NH₃)₆]³⁺ + 3H₂O + 3OH⁻', type: 'ligand exchange' } },
    co2: { sym: 'Co', q: 2, sol: [230, 120, 160, 0.55], solName: 'pink', ppt: '#4a6fb3', pptName: 'blue',
      air: 'on standing the precipitate turns pink, then brown, as cobalt(II) is oxidised by air',
      nh3Xs: { sol: [210, 180, 90, 0.6], what: 'pale straw-coloured solution, darkening to brown in air', prod: '[Co(NH₃)₆]²⁺ (oxidised by air to [Co(NH₃)₆]³⁺)', eq: '[Co(OH)₂(H₂O)₄] + 6NH₃ → [Co(NH₃)₆]²⁺ + 4H₂O + 2OH⁻', type: 'ligand exchange' },
      hcl: { sol: [40, 90, 220, 0.75], what: 'blue solution', prod: '[CoCl₄]²⁻, tetrahedral', eq: '[Co(H₂O)₆]²⁺ + 4Cl⁻ ⇌ [CoCl₄]²⁻ + 6H₂O', type: 'ligand exchange; coordination number 6 → 4' } },
    ni2: { sym: 'Ni', q: 2, sol: [90, 180, 110, 0.6], solName: 'green', ppt: '#4c9a5a', pptName: 'green',
      nh3Xs: { sol: [90, 110, 220, 0.65], what: 'blue (lilac-blue) solution', prod: '[Ni(NH₃)₆]²⁺', eq: '[Ni(OH)₂(H₂O)₄] + 6NH₃ → [Ni(NH₃)₆]²⁺ + 4H₂O + 2OH⁻', type: 'ligand exchange' } },
    mn2: { sym: 'Mn', q: 2, sol: [240, 200, 210, 0.4], solName: 'very pale pink', ppt: '#cbb79a', pptName: 'off-white (pale brown)',
      air: 'the precipitate darkens to brown on standing, as manganese(II) is oxidised by air' },
    zn2: { sym: 'Zn', q: 2, sol: [230, 236, 245, 0.5], solName: 'colourless', ppt: '#f1f3f5', pptName: 'white',
      ohXs: { sol: [230, 236, 245, 0.5], what: 'colourless solution', prod: '[Zn(OH)₄]²⁻', eq: '[Zn(OH)₂(H₂O)₄] + 2OH⁻ → [Zn(OH)₄]²⁻ + 4H₂O', type: 'amphoteric hydroxide: deprotonation continues' },
      nh3Xs: { sol: [230, 236, 245, 0.5], what: 'colourless solution', prod: '[Zn(NH₃)₄]²⁺', eq: '[Zn(OH)₂(H₂O)₄] + 4NH₃ → [Zn(NH₃)₄]²⁺ + 4H₂O + 2OH⁻', type: 'ligand exchange' } }
  };
  const aqua = (I) => '[' + I.sym + '(H₂O)₆]' + (I.q === 2 ? '²⁺' : '³⁺');
  const hydroxide = (I) => (I.q === 2 ? '[' + I.sym + '(OH)₂(H₂O)₄]' : '[' + I.sym + '(OH)₃(H₂O)₃]');
  function result(ionKey, reagent) {
    const I = ION[ionKey];
    const n = I.q === 2 ? '2' : '3';
    const ppt = { ppt: I.ppt, sol: null, what: I.pptName + ' precipitate', prod: hydroxide(I) };
    if (reagent === 'naoh_few') return Object.assign(ppt, { eq: aqua(I) + ' + ' + n + 'OH⁻ → ' + hydroxide(I) + ' + ' + n + 'H₂O', type: 'deprotonation (acid–base): OH⁻ removes H⁺ from water ligands' });
    if (reagent === 'nh3_few') return Object.assign(ppt, { eq: aqua(I) + ' + ' + n + 'NH₃ → ' + hydroxide(I) + ' + ' + n + 'NH₄⁺', type: 'deprotonation (acid–base): NH₃ acts as a Brønsted–Lowry base' });
    if (reagent === 'naoh_xs') return I.ohXs ? Object.assign({ ppt: null }, I.ohXs) : Object.assign(ppt, { what: I.pptName + ' precipitate, which does not dissolve in excess', eq: 'no further reaction', type: 'not amphoteric' });
    if (reagent === 'nh3_xs') return I.nh3Xs ? Object.assign({ ppt: null }, I.nh3Xs) : Object.assign(ppt, { what: I.pptName + ' precipitate, which does not dissolve in excess', eq: 'no further reaction', type: 'no ligand exchange with ammonia' });
    if (reagent === 'hcl') return I.hcl ? Object.assign({ ppt: null }, I.hcl) : { ppt: null, sol: I.sol, what: 'no visible change', prod: aqua(I), eq: '—', type: '—' };
    return { ppt: null, sol: I.sol, what: I.solName + ' solution', prod: aqua(I), eq: '—', type: 'the hexaaqua ion' };
  }
  const css = (c) => 'rgba(' + c.join(',') + ')';
  function tube(ctx, x, y, w, h, fill, ppt, label) {
    Sim.rect(ctx, x + 3, y + h * 0.3, w - 6, h * 0.7 - 6, { fill: css(fill), r: 4 });
    if (ppt) {
      Sim.rect(ctx, x + 3, y + h * 0.3, w - 6, h * 0.7 - 6, { fill: 'rgba(255,255,255,0.25)', r: 4 });
      Sim.rect(ctx, x + 3, y + h * 0.72, w - 6, h * 0.28 - 6, { fill: ppt, r: 6 });
      for (let i = 0; i < 14; i++) Sim.circle(ctx, x + 8 + ((i * 13) % (w - 16)), y + h * 0.35 + ((i * 23) % (h * 0.34)), 2, { fill: ppt });
    }
    ctx.save();
    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - w / 2);
    ctx.arc(x + w / 2, y + h - w / 2, w / 2, Math.PI, 0, true);
    ctx.lineTo(x + w, y);
    ctx.stroke();
    ctx.restore();
    Sim.text(ctx, label, x + w / 2, y + h + 16, { size: 11.5, color: C.ink, align: 'center' });
  }

  Sim.create('#sim-chem-17-tubes', {
    title: 'Test-tube reactions of metal aqua ions',
    height: 280,
    controls: [
      { key: 'ion', type: 'select', label: 'Aqua ion', options: [['cu', 'copper(II)'], ['fe2', 'iron(II)'], ['fe3', 'iron(III)'], ['cr3', 'chromium(III)'], ['co2', 'cobalt(II)'], ['ni2', 'nickel(II)'], ['mn2', 'manganese(II)'], ['zn2', 'zinc']], value: 'cu' },
      { key: 'rg', type: 'select', label: 'Add', options: [['naoh_few', 'a few drops of NaOH(aq)'], ['naoh_xs', 'excess NaOH(aq)'], ['nh3_few', 'a few drops of NH₃(aq)'], ['nh3_xs', 'excess NH₃(aq)'], ['hcl', 'concentrated HCl']], value: 'nh3_xs' }
    ],
    draw(s) {
      const { ctx, w, p } = s;
      const I = ION[p.ion];
      const r = result(p.ion, p.rg);
      const tw = 46, th = 170, y = 40;
      tube(ctx, w * 0.3 - tw / 2, y, tw, th, I.sol, null, 'before');
      tube(ctx, w * 0.62 - tw / 2, y, tw, th, r.sol || I.sol, r.ppt, 'after');
      Sim.arrow(ctx, w * 0.3 + 40, y + th / 2, w * 0.62 - 40, y + th / 2, { color: C.grey, width: 2, head: 8 });
      Sim.text(ctx, aqua(I), w * 0.3, 22, { size: 13, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, r.prod, w * 0.62, 22, { size: 13, bold: true, color: C.navy, align: 'center' });
    },
    readout(s) {
      const r = result(s.p.ion, s.p.rg);
      const I = ION[s.p.ion];
      const rows = [['Observation', r.what, true], ['Equation', r.eq], ['Type of reaction', r.type]];
      if (I.air && r.ppt) rows.push(['On standing', I.air]);
      return rows;
    }
  });

  /* ======================================================================
     3. Autocatalysis: manganate(VII) with ethanedioate, catalysed by Mn²⁺
     d[MnO₄⁻]/dt = −(k₀ + k₁[Mn²⁺])[MnO₄⁻], with [Mn²⁺] = m₀ + ([MnO₄⁻]₀ − [MnO₄⁻])
     ====================================================================== */
  function run(m0) {
    const k0 = 0.004, k1 = 25, x0 = 0.002, dt = 0.5;
    let x = x0;
    const pts = [];
    for (let t = 0; t <= 300; t += dt) {
      if (Math.round(t) === t) pts.push([t, x * 1000]);
      const m = m0 + (x0 - x);
      x -= (k0 + k1 * m) * x * dt;
      if (x < 0) x = 0;
    }
    return pts;
  }
  Sim.create('#sim-chem-17-autocat', {
    title: 'Autocatalysis by Mn²⁺',
    height: 280,
    controls: [
      { key: 'add', type: 'check', label: 'Add Mn²⁺ at the start', value: false },
      { key: 'both', type: 'check', label: 'Show both curves', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const g = Sim.graph(ctx, { x: 56, y: 20, w: w - 76, h: h - 20 - 46, xmin: 0, xmax: 300, ymin: 0, ymax: 2.2, xstep: 50, ystep: 0.5, xlabel: 'time / s', ylabel: '[MnO₄⁻] / mmol dm⁻³' });
      g.axes();
      const a = run(0), b = run(0.0005);
      if (p.both || !p.add) g.path(a, { color: C.purple, width: p.add ? 1.8 : 2.8, dash: p.add ? [6, 4] : null });
      if (p.both || p.add) g.path(b, { color: C.orange, width: p.add ? 2.8 : 1.8, dash: p.add ? null : [6, 4] });
      if (p.both || !p.add) Sim.text(ctx, 'no Mn²⁺ added: slow start, then fast', g.px(95), g.py(1.75), { size: 12, bold: true, color: C.purple });
      if (p.both || p.add) Sim.text(ctx, 'Mn²⁺ added at the start', g.px(18), g.py(0.5), { size: 12, bold: true, color: C.orange });
    },
    readout(s) {
      return [
        ['Why the slow start', 'two negative ions (MnO₄⁻ and C₂O₄²⁻) repel, so the uncatalysed reaction has a high activation energy', true],
        ['Why it then speeds up', 'Mn²⁺, a product, catalyses the reaction by a route through Mn³⁺']
      ];
    }
  });
})();
