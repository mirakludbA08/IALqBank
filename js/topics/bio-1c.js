/* Biology 1c: Cardiovascular health — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ======================================================================
     Energy budget and BMI calculator
     ====================================================================== */
  const KJ_PER_KG_FAT = 32000;   // energy stored in 1 kg of body fat (adipose tissue)
  const E_MAX = 16000;           // kJ per day, end of the bar scale
  const MIN_MASS = 30;           // kg; the projection stops here
  const BANDS = [
    { lo: 0, hi: 20, name: 'underweight', short: 'under', col: '#a5d8ff', ink: '#1864ab' },
    { lo: 20, hi: 25, name: 'normal', short: 'normal', col: '#b2f2bb', ink: '#2b8a3e' },
    { lo: 25, hi: 30, name: 'overweight', short: 'over', col: '#ffec99', ink: '#9c6c00' },
    { lo: 30, hi: 40, name: 'obese', short: 'obese', col: '#ffc078', ink: '#b35c00' },
    { lo: 40, hi: 99, name: 'severely obese', short: 'severe', col: '#ffa8a8', ink: '#c92a2a' }
  ];
  const bandOf = (bmi) => BANDS.find((b) => bmi < b.hi) || BANDS[BANDS.length - 1];
  const niceDown = (v, step) => Math.floor(v / step) * step;
  const niceUp = (v, step) => Math.ceil(v / step) * step;

  function model(p) {
    const h2 = p.ht * p.ht;
    const bal = p.ein - p.eout;                      // kJ per day
    const perWeek = (bal * 7) / KJ_PER_KG_FAT;       // kg per week
    const raw = p.m + perWeek * p.weeks;
    const mEnd = Math.max(MIN_MASS, raw);
    const tStop = raw < MIN_MASS && perWeek < 0 ? (MIN_MASS - p.m) / perWeek : null;
    return { h2, bal, perWeek, mEnd, tStop, bmi0: p.m / h2, bmi1: mEnd / h2 };
  }
  const signed = (v, d) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);

  Sim.create('#sim-bio-1c-energy', {
    title: 'Energy budget and BMI',
    alt: 'Bars comparing daily energy intake and output, a BMI scale, and a graph of predicted body mass over the following weeks',
    height: (w) => (w >= 720 ? 360 : 540),
    controls: [
      { key: 'm', label: 'Body mass', min: 40, max: 150, step: 0.5, value: 70, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'ht', label: 'Height', min: 1.4, max: 2.1, step: 0.01, value: 1.75, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'ein', label: 'Energy in (food and drink)', min: 4000, max: 16000, step: 100, value: 10500, unit: 'kJ day⁻¹', format: (v) => v.toFixed(0) },
      { key: 'eout', label: 'Energy out (metabolism and activity)', min: 4000, max: 16000, step: 100, value: 10000, unit: 'kJ day⁻¹', format: (v) => v.toFixed(0) },
      { key: 'weeks', label: 'Keep this up for', min: 1, max: 52, step: 1, value: 12, unit: 'weeks', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const md = model(p);
      const wide = w >= 720;
      const pw = wide ? 300 : w;         // width of the panel on the left (or top)
      const x0 = 14, labW = 86;

      /* energy budget bars */
      Sim.text(ctx, 'Energy budget (per day)', x0, 16, { size: 13.5, bold: true, color: C.navy });
      const barX = x0 + labW, barW = pw - barX - 18;
      const scale = (v) => (barW * clamp(v, 0, E_MAX)) / E_MAX;
      [['energy in', p.ein, C.green], ['energy out', p.eout, C.orange]].forEach(([lab, v, col], i) => {
        const y = 34 + i * 30;
        Sim.text(ctx, lab, x0, y + 10, { size: 12.5, color: C.ink });
        Sim.rect(ctx, barX, y, barW, 20, { fill: C.light, r: 4 });
        Sim.rect(ctx, barX, y, scale(v), 20, { fill: col, r: 4 });
        Sim.text(ctx, v.toFixed(0) + ' kJ', barX + 6, y + 10, { size: 12, bold: true, color: '#fff' });
      });
      // the difference between the bars
      const xa = barX + scale(Math.min(p.ein, p.eout)), xb = barX + scale(Math.max(p.ein, p.eout));
      if (xb - xa > 2) {
        Sim.rect(ctx, xa, p.ein > p.eout ? 34 : 64, xb - xa, 20, { stroke: md.bal > 0 ? C.red : C.blue, width: 2, dash: [4, 3], r: 3 });
      }
      const balTxt = md.bal === 0 ? 'balanced: mass stays the same'
        : (md.bal > 0 ? 'surplus ' : 'deficit ') + Math.abs(md.bal).toFixed(0) + ' kJ per day → ' + (md.bal > 0 ? 'stored as fat' : 'fat stores used');
      Sim.text(ctx, balTxt, x0, 104, { size: 12.5, bold: true, color: md.bal > 0 ? C.red : md.bal < 0 ? C.blue : C.green });
      Sim.text(ctx, '1 kg of body fat stores about 32 000 kJ', x0, 122, { size: 11.5, italic: true, color: C.muted });

      /* BMI scale */
      const sx0 = x0 + 4, sx1 = pw - 22, sy = 184;
      const bx = (b) => sx0 + ((clamp(b, 15, 45) - 15) / 30) * (sx1 - sx0);
      Sim.text(ctx, 'BMI = mass ÷ height²  (kg m⁻²)', x0, 148, { size: 13, bold: true, color: C.navy });
      BANDS.forEach((b) => {
        const a = bx(Math.max(15, b.lo)), c = bx(Math.min(45, b.hi));
        Sim.rect(ctx, a, sy, c - a, 18, { fill: b.col });
        if (c - a > Sim.measure(ctx, b.short, { size: 10.5 }) + 4) Sim.text(ctx, b.short, (a + c) / 2, sy + 9, { size: 10.5, color: b.ink, align: 'center' });
      });
      Sim.rect(ctx, sx0, sy, sx1 - sx0, 18, { stroke: C.axis, width: 1 });
      [15, 20, 25, 30, 35, 40, 45].forEach((v) => {
        Sim.line(ctx, bx(v), sy + 18, bx(v), sy + 22, { color: C.axis, width: 1 });
        Sim.text(ctx, String(v), bx(v), sy + 30, { size: 10.5, color: C.muted, align: 'center' });
      });
      // markers: "now" above the scale, "after" below the tick labels
      const tri = (b, col, above, lab) => {
        const X = bx(b), Y = above ? sy - 2 : sy + 38;
        const k = above ? -1 : 1;
        ctx.save();
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(X, Y); ctx.lineTo(X - 6, Y + k * 10); ctx.lineTo(X + 6, Y + k * 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        Sim.text(ctx, lab, clamp(X, sx0 + 40, sx1 - 40), Y + k * 19, { size: 11.5, bold: true, color: col, align: 'center', bg: 'rgba(255,255,255,0.85)', pad: 2 });
      };
      tri(md.bmi0, C.navy, true, 'now ' + md.bmi0.toFixed(1));
      if (Math.abs(md.bmi1 - md.bmi0) > 0.05) tri(md.bmi1, C.purple, false, 'after ' + p.weeks + ' wk: ' + md.bmi1.toFixed(1));

      /* mass against time */
      const gb = wide ? { x: pw + 60, y: 34, w: w - pw - 60 - 20, h: h - 34 - 46 } : { x: 52, y: 270, w: w - 52 - 18, h: h - 270 - 44 };
      const lo = Math.min(p.m, md.mEnd), hi = Math.max(p.m, md.mEnd);
      let ymin = niceDown(lo - 6, 5), ymax = niceUp(hi + 6, 5);
      if (ymax - ymin < 20) { const mid = (ymax + ymin) / 2; ymin = niceDown(mid - 10, 5); ymax = ymin + 20; }
      ymin = Math.max(20, ymin);
      const xstep = p.weeks <= 6 ? 1 : p.weeks <= 12 ? 2 : p.weeks <= 30 ? 5 : 10;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: p.weeks, ymin, ymax, xstep, bg: null, ylabel: 'body mass / kg' }, gb));
      // BMI bands for this person's height, shaded behind the line
      g.clip();
      BANDS.forEach((b) => {
        const mLo = b.lo * md.h2, mHi = b.hi * md.h2;
        if (mHi < ymin || mLo > ymax) return;
        const yTop = g.py(Math.min(ymax, mHi)), yBot = g.py(Math.max(ymin, mLo));
        ctx.save();
        ctx.globalAlpha = 0.38;
        ctx.fillStyle = b.col;
        ctx.fillRect(g.x, yTop, g.w, yBot - yTop);
        ctx.restore();
        if (yBot - yTop > 22) Sim.text(ctx, b.name, g.x + g.w - 6, yTop + 10, { size: 11, color: b.ink, align: 'right', bold: true });
      });
      g.unclip();
      g.axes();
      const tEnd = md.tStop != null ? md.tStop : p.weeks;
      g.path([[0, p.m], [tEnd, md.mEnd]].concat(md.tStop != null ? [[p.weeks, md.mEnd]] : []), { color: C.purple, width: 3 });
      g.dot(0, p.m, { color: C.navy });
      g.dot(p.weeks, md.mEnd, { color: C.purple });
      Sim.text(ctx, signed(md.mEnd - p.m, 1) + ' kg', g.px(p.weeks) - 8, g.py(md.mEnd) + (md.mEnd >= p.m ? 16 : -16), { size: 12.5, bold: true, color: C.purple, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      Sim.text(ctx, 'time / weeks', gb.x + gb.w / 2, gb.y + gb.h + 32, { size: 12.5, bold: true, color: C.ink, align: 'center' });
    },
    readout(s) {
      const p = s.p, md = model(p);
      const out = [
        ['BMI now = ' + p.m.toFixed(1) + ' ÷ ' + p.ht.toFixed(2) + '² =', md.bmi0.toFixed(1) + ' (' + bandOf(md.bmi0).name + ')'],
        ['energy balance:', signed(md.bal, 0) + ' kJ per day'],
        ['change in mass ≈', signed(md.perWeek, 2) + ' kg per week'],
        ['after ' + p.weeks + ' weeks:', md.mEnd.toFixed(1) + ' kg, BMI ' + md.bmi1.toFixed(1) + ' (' + bandOf(md.bmi1).name + ')', true]
      ];
      if (md.tStop != null || md.bmi1 < 15) out.push(['note:', 'a deficit this large could not safely be kept up']);
      out.push(['model:', 'energy in and out stay the same every day']);
      return out;
    }
  });
  /* ======================================================================
     Atherosclerosis: an atheroma narrowing an artery, and thrombosis
     ====================================================================== */
  Sim.create('#sim-bio-1c-artery', {
    title: 'Atherosclerosis in an artery',
    height: (w) => (w >= 640 ? 300 : 480),
    controls: [
      { key: 'plaque', label: 'Thickness of the atheroma', min: 0, max: 85, step: 1, value: 35, unit: '% of the lumen width', format: (v) => v.toFixed(0) },
      { key: 'clot', type: 'check', label: 'The atheroma ruptures and a thrombus forms', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const cx = wide ? w * 0.28 : w / 2, cy = wide ? h / 2 : 150, R = Math.min(110, h * 0.36);
      const r0 = R * 0.62;                       // healthy lumen radius
      const r = r0 * (1 - p.plaque / 100);      // narrowed lumen
      // artery wall
      Sim.circle(ctx, cx, cy, R, { fill: '#f3b6b6', stroke: '#c92a2a', width: 2 });
      Sim.circle(ctx, cx, cy, r0 + 4, { fill: '#ffe3e3' });
      // the atheroma fills the space between the healthy lumen and the narrowed one, on one side
      Sim.circle(ctx, cx, cy, r0, { fill: '#ffd43b', stroke: '#f08c00', width: 1.5 });
      const off = r0 - r;
      Sim.circle(ctx, cx + off * 0.9, cy, r, { fill: p.clot ? '#7a1010' : '#e03131', stroke: '#c92a2a', width: 1 });
      if (p.clot && p.plaque < 60) {
        Sim.circle(ctx, cx + off * 0.9, cy, r * 0.75, { fill: '#e03131' });
        Sim.text(ctx, 'thrombus', cx + off * 0.9, cy + r * 0.85 + 14, { size: 11.5, bold: true, color: '#7a1010', align: 'center' });
      }
      if (p.plaque > 15) Sim.text(ctx, 'atheroma', cx + off * 0.9 - r - 6, cy + 4, { size: 11.5, bold: true, color: '#8a5a00', align: 'right' });
      Sim.text(ctx, 'artery wall', cx, cy - R - 10, { size: 11.5, color: C.muted, align: 'center' });
      // lumen area bar and what happens
      const blocked = p.clot && p.plaque >= 60;
      const area = blocked ? 0 : (p.clot ? 0.5625 : 1) * Math.pow(r / r0, 2);
      const bx = wide ? w * 0.56 : 30, by = wide ? 60 : 320, bw = wide ? w * 0.36 : w - 90;
      Sim.text(ctx, 'Lumen area compared with a healthy artery', bx, by - 10, { size: 12, bold: true, color: C.navy });
      Sim.rect(ctx, bx, by, bw, 18, { fill: C.light, r: 4 });
      Sim.rect(ctx, bx, by, Math.max(2, bw * area), 18, { fill: blocked ? '#7a1010' : '#e03131', r: 4 });
      Sim.text(ctx, (area * 100).toFixed(0) + '%', bx + bw + 6, by + 10, { size: 12, bold: true, color: C.ink });
      const lines = blocked
        ? ['Blood flow stops beyond the clot.', 'Cells there are starved of oxygen:', 'in a coronary artery, a heart attack;', 'in the brain, a stroke.']
        : p.clot
          ? ['A thrombus has formed on the ruptured', 'atheroma, narrowing the lumen further.', 'If it grows, or breaks off and lodges in a', 'smaller artery, it can block blood flow.']
        : p.plaque > 50
          ? ['Much narrower lumen: blood pressure rises,', 'which damages more endothelium, so more', 'atheromas form: positive feedback.', 'A rupture could trigger a thrombus.']
          : p.plaque > 5
            ? ['Endothelium damaged; white blood cells and', 'cholesterol build up under it as an atheroma.', 'The artery wall also becomes less elastic.']
            : ['A healthy artery: smooth endothelium,', 'wide lumen, elastic wall.'];
      lines.forEach((t, i) => Sim.text(ctx, t, bx, by + 50 + i * 20, { size: 12, color: C.ink }));
    },
    readout(s) {
      const p = s.p;
      const blocked = p.clot && p.plaque >= 60;
      return [
        ['Stage', blocked ? 'complete blockage by a thrombus' : p.clot ? 'thrombus partly blocking the narrowed lumen' : p.plaque > 5 ? 'atheroma narrowing the lumen' : 'healthy', true],
        ['Why a clot forms', 'a ruptured atheroma exposes collagen; platelets stick and release thromboplastin, starting the clotting cascade']
      ];
    }
  });

})();
