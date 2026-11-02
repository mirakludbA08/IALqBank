/* Practical skills — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function fitLine(pts) {
    const n = pts.length;
    if (n < 2) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const d = n * sxx - sx * sx;
    if (Math.abs(d) < 1e-12) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }

  /* ======================================================================
     1. Accuracy vs precision
     ====================================================================== */
  const OFFSET_DIR = 40 * Math.PI / 180;
  Sim.create('#sim-target', {
    title: 'Accuracy vs precision',
    height: (w) => (w >= 620 ? 340 : 560),
    controls: [
      { key: 'sys', label: 'Systematic offset', min: 0, max: 0.7, step: 0.01, value: 0.35, format: (v) => (v * 10).toFixed(1) + ' units' },
      { key: 'rand', label: 'Random spread', min: 0.01, max: 0.4, step: 0.01, value: 0.06, format: (v) => (v * 10).toFixed(1) + ' units' },
      { type: 'button', label: 'Take 10 readings', onClick: (s) => shoot(s, 10) },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { s.state.shots = []; } }
    ],
    init(s) { s.state = { shots: [] }; shoot(s, 10); },
    onChange(s) { s.state.shots = []; shoot(s, 10); },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const wide = w >= 620;
      const R = wide ? Math.min(h * 0.42, w * 0.22) : Math.min(w * 0.36, 150);
      const cx = wide ? R + 40 : w / 2, cy = wide ? h / 2 : R + 30;
      // target
      [1, 0.8, 0.6, 0.4, 0.2].forEach((f, i) => Sim.circle(ctx, cx, cy, R * f, { fill: i % 2 ? '#fff' : '#eef3ff', stroke: '#c5d0e0', width: 1 }));
      Sim.circle(ctx, cx, cy, R * 0.07, { fill: C.red });
      Sim.text(ctx, 'true value', cx, cy + R + 16, { size: 12, color: C.muted, align: 'center' });
      const pts = st.shots;
      pts.forEach(([x, y]) => Sim.circle(ctx, cx + x * R, cy - y * R, 4.5, { fill: C.navy, stroke: '#fff', width: 1 }));
      if (pts.length) {
        const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const X = cx + mx * R, Y = cy - my * R;
        Sim.line(ctx, X - 9, Y, X + 9, Y, { color: C.orange, width: 3 });
        Sim.line(ctx, X, Y - 9, X, Y + 9, { color: C.orange, width: 3 });
      }
      // 1D view: readings along the offset direction, like a set of repeats
      const gx = wide ? cx + R + 70 : 50, gy = wide ? 40 : cy + R + 60;
      const gw = wide ? w - gx - 30 : w - 80, gh = wide ? h - 90 : h - gy - 50;
      const g = Sim.graph(ctx, { x: gx, y: gy, w: gw, h: gh, xmin: -1, xmax: 1, ymin: 0, ymax: Math.max(10, pts.length) + 1, xlabel: 'reading − true value', ylabel: 'reading number', ticks: false, title: 'the same readings as a list of repeats' });
      g.axes();
      g.vline(0, { color: C.red, dash: [], width: 2 });
      const vals = pts.map((p) => p[0] * Math.cos(OFFSET_DIR) + p[1] * Math.sin(OFFSET_DIR));
      vals.forEach((v, i) => g.dot(Sim.clamp(v, -1, 1), i + 1, { color: C.navy, r: 4 }));
      if (vals.length > 1) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const lo = Math.min(...vals), hi = Math.max(...vals);
        const yb = g.py(0) - 12;
        Sim.line(ctx, g.px(Math.max(lo, -1)), yb, g.px(Math.min(hi, 1)), yb, { color: C.purple, width: 3 });
        Sim.text(ctx, 'range', g.px((lo + hi) / 2), yb - 10, { size: 11.5, color: C.purple, align: 'center', bold: true });
        g.vline(Sim.clamp(mean, -1, 1), { color: C.orange, dash: [5, 4], width: 2 });
      }
    },
    readout(s) {
      const pts = s.state.shots;
      if (!pts.length) return [['readings', '0']];
      const vals = pts.map((p) => p[0] * Math.cos(OFFSET_DIR) + p[1] * Math.sin(OFFSET_DIR));
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const half = (Math.max(...vals) - Math.min(...vals)) / 2;
      const precise = half < 0.15, accurate = Math.abs(mean) < Math.max(0.08, half);
      return [
        ['readings', String(pts.length)],
        ['mean − true =', (mean * 10).toFixed(2) + ' units'],
        ['uncertainty (½ range) =', '± ' + (half * 10).toFixed(2) + ' units'],
        [precise ? 'precise' : 'not precise', precise ? '✔' : '✘', precise],
        [accurate ? 'accurate' : 'not accurate', accurate ? '✔' : '✘', accurate]
      ];
    }
  });
  function shoot(s, n) {
    for (let i = 0; i < n; i++) {
      const x = s.p.sys * Math.cos(OFFSET_DIR) + gaussian() * s.p.rand;
      const y = s.p.sys * Math.sin(OFFSET_DIR) + gaussian() * s.p.rand;
      s.state.shots.push([x, y]);
    }
    if (s.state.shots.length > 40) s.state.shots.splice(0, s.state.shots.length - 40);
  }

  /* ======================================================================
     2. Vernier calipers
     ====================================================================== */
  Sim.create('#sim-vernier', {
    title: 'Read the vernier calipers',
    height: (w) => (w >= 620 ? 250 : 270),
    controls: [
      { key: 'r', label: 'Jaw opening', min: 0, max: 50, step: 0.1, value: 23.7, unit: 'mm', format: (v) => (s_showV ? v.toFixed(1) : '??') },
      { key: 'show', type: 'check', label: 'Show the reading', value: false, onChange: (s, v) => { s_showV = v; s.set('r', s.p.r); } },
      { type: 'button', label: 'Random object', onClick: (s) => { s.set('show', false); s_showV = false; s.set('r', Math.round(Math.random() * 480 + 10) / 10); } }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const r = p.r;
      // overview drawing of the calipers gripping a ball
      const ox = 30, oy = 20, scaleO = Math.min(4, (w - 60) / 70);
      const beamY = oy + 40;
      Sim.rect(ctx, ox, beamY, 66 * scaleO, 16, { fill: '#ced4da', stroke: '#868e96', width: 1 });
      Sim.rect(ctx, ox, oy, 10, beamY - oy + 16, { fill: '#adb5bd' });
      const jx = ox + 10 + r * scaleO;
      Sim.rect(ctx, jx, oy, 10, beamY - oy + 16, { fill: C.blue });
      Sim.rect(ctx, jx, beamY + 16, 46, 20, { fill: C.blue, r: 3 });
      if (r > 1) Sim.circle(ctx, ox + 10 + (r * scaleO) / 2, oy + 18, Math.min(18, (r * scaleO) / 2), { fill: '#868e96', stroke: '#495057', width: 1 });
      Sim.text(ctx, 'fixed jaw', ox, oy - 8, { size: 11, color: C.muted });
      Sim.text(ctx, 'sliding jaw + vernier', jx, oy - 8, { size: 11, color: C.blue });

      // zoomed scales
      const zy = beamY + 90;
      const ppm = w >= 620 ? 26 : 22; // px per mm in the zoomed view
      const centre = r + 4.5;
      const zx = (mm) => w / 2 + (mm - centre) * ppm;
      Sim.rect(ctx, 10, zy - 44, w - 20, 120, { fill: '#f8f9fa', stroke: '#dee2e6', width: 1, r: 8 });
      Sim.text(ctx, 'zoomed in on the scales', 20, zy - 32, { size: 11.5, color: C.muted, italic: true });
      // main scale
      for (let mm = Math.floor(centre - w / (2 * ppm)); mm <= centre + w / (2 * ppm); mm++) {
        if (mm < 0 || mm > 150) continue;
        const X = zx(mm);
        if (X < 14 || X > w - 14) continue;
        const L = mm % 10 === 0 ? 22 : mm % 5 === 0 ? 16 : 10;
        Sim.line(ctx, X, zy, X, zy - L, { color: C.ink, width: mm % 10 === 0 ? 2 : 1.2 });
        if (mm % 10 === 0) Sim.text(ctx, String(mm / 10), X, zy - 28, { size: 13, bold: true, align: 'center' });
      }
      Sim.text(ctx, 'main scale (cm)', w - 20, zy - 30, { size: 11, color: C.muted, align: 'right' });
      Sim.line(ctx, 14, zy, w - 14, zy, { color: C.ink, width: 1 });
      // vernier scale: 10 divisions in 9 mm
      const tenth = Math.round((r - Math.floor(r + 1e-9)) * 10) % 10;
      Sim.rect(ctx, zx(r) - 12, zy + 2, 9 * ppm + 24, 40, { fill: 'rgba(0,123,255,0.10)', stroke: C.blue, width: 1, r: 4 });
      for (let i = 0; i <= 10; i++) {
        const X = zx(r + i * 0.9);
        const match = i === tenth && s.p.show;
        Sim.line(ctx, X, zy + 2, X, zy + (i % 5 === 0 ? 22 : 15), { color: match ? C.green : C.navy, width: match ? 3 : 1.4 });
        if (i % 1 === 0) Sim.text(ctx, String(i), X, zy + 31, { size: 11.5, align: 'center', color: match ? C.green : C.navy, bold: match });
        if (match) Sim.line(ctx, X, zy - 26, X, zy + 2, { color: C.green, width: 2, dash: [3, 3] });
      }
      Sim.text(ctx, 'vernier', zx(r) - 16, zy + 22, { size: 11, color: C.blue, align: 'right' });
      if (s.p.show) {
        const whole = Math.floor(r + 1e-9);
        Sim.text(ctx, 'main scale: ' + whole + ' mm   +   vernier line ' + tenth + ' lines up: 0.' + tenth + ' mm   =   ' + r.toFixed(1) + ' mm', w / 2, zy + 64, { size: 13, bold: true, color: C.green, align: 'center' });
      } else {
        Sim.text(ctx, w < 500 ? 'Find the vernier zero, then the line that lines up.' : 'Where is the vernier zero? Which vernier line lines up exactly?', w / 2, zy + 64, { size: w < 500 ? 11.5 : 12.5, color: C.muted, align: 'center', italic: true });
      }
    },
    readout(s) {
      return s.p.show ? [['reading =', s.p.r.toFixed(1) + ' mm', true], ['uncertainty', '± 0.05 mm (half the 0.1 mm resolution)']] : [['reading =', 'hidden: have a go first']];
    }
  });
  var s_showV = false;

  /* ======================================================================
     3. Micrometer screw gauge
     ====================================================================== */
  var s_showM = false;
  Sim.create('#sim-micrometer', {
    title: 'Read the micrometer',
    height: (w) => (w >= 620 ? 300 : 330),
    controls: [
      { key: 'r', label: 'Gap between the jaws', min: 0, max: 12, step: 0.01, value: 5.78, unit: 'mm', format: (v) => (s_showM ? v.toFixed(2) : '??') },
      { key: 'zero', type: 'check', label: 'Instrument has a +0.03 mm zero error', value: false },
      { key: 'show', type: 'check', label: 'Show the reading', value: false, onChange: (s, v) => { s_showM = v; s.set('r', s.p.r); } },
      { type: 'button', label: 'Random wire', onClick: (s) => { s.set('show', false); s_showM = false; s.set('r', Math.round(Math.random() * 1100 + 20) / 100); } }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const shown = p.r + (p.zero ? 0.03 : 0); // what the instrument displays
      const ppm = Math.min(36, (w - 220) / 13);
      const x0 = 90, y0 = h / 2 - 10;
      // anvil, frame and spindle
      Sim.rect(ctx, 20, y0 - 60, 18, 120, { fill: '#adb5bd', r: 4 });
      Sim.rect(ctx, 38, y0 - 10, 20, 20, { fill: '#868e96' });
      Sim.rect(ctx, 58 + 0, y0 - 9, Math.max(0, x0 - 58 - 10), 18, { fill: '#e9ecef' });
      if (p.r > 0.2) Sim.rect(ctx, 58, y0 - 4, Math.max(2, Math.min(p.r * 3, x0 - 70)), 8, { fill: C.orange, r: 2 });
      // sleeve: only the part left of the thimble edge is visible
      const tx = x0 + shown * ppm;
      Sim.rect(ctx, x0 - 10, y0 - 18, tx - x0 + 10, 36, { fill: '#dee2e6', stroke: '#adb5bd', width: 1 });
      Sim.line(ctx, x0, y0, tx, y0, { color: C.ink, width: 1.5 });
      for (let mm = 0; mm <= 12; mm++) {
        const X = x0 + mm * ppm;
        if (X <= tx + 0.5) {
          Sim.line(ctx, X, y0, X, y0 - 12, { color: C.ink, width: 1.4 });
          if (mm % 5 === 0) Sim.text(ctx, String(mm), X, y0 - 22, { size: 12, bold: true, align: 'center' });
        }
        if (mm < 12 && X + ppm / 2 <= tx + 0.5) Sim.line(ctx, X + ppm / 2, y0, X + ppm / 2, y0 + 9, { color: C.ink, width: 1.2 });
      }
      // thimble: its left edge sits at the reading, ratchet beyond it
      const tw = Math.min(150, Math.max(70, w - tx - 50));
      Sim.rect(ctx, tx + tw, y0 - 16, 34, 32, { fill: '#adb5bd', stroke: '#868e96', width: 1, r: 4 });
      Sim.text(ctx, 'ratchet', tx + tw + 17, y0 + 28, { size: 10.5, color: C.muted, align: 'center' });
      Sim.rect(ctx, tx, y0 - 46, tw, 92, { fill: '#cfe2ff', stroke: C.blue, width: 1.5, r: 6 });
      Sim.line(ctx, tx, y0 - 46, tx, y0 + 46, { color: C.navy, width: 3 });
      // thimble scale: 50 divisions; datum line points at the division
      const frac = ((shown % 0.5) + 0.5) % 0.5;
      const div = frac / 0.01; // 0..50
      const spacing = 9;
      for (let k = -5; k <= 5; k++) {
        const d = Math.round(div) + k;
        const Y = y0 - (d - div) * spacing;
        if (Y < y0 - 44 || Y > y0 + 44) continue;
        const dd = ((d % 50) + 50) % 50;
        Sim.line(ctx, tx, Y, tx + (dd % 5 === 0 ? 16 : 10), Y, { color: C.navy, width: 1.3 });
        if (dd % 5 === 0) Sim.text(ctx, String(dd), tx + 20, Y, { size: 11.5, color: C.navy, bold: true });
      }
      Sim.text(ctx, 'sleeve', x0 + 4, y0 + 32, { size: 11, color: C.muted });
      Sim.text(ctx, 'thimble', tx + 46, y0 - 32, { size: 11, color: C.blue });
      if (s.p.show) {
        const halfMm = Math.floor(shown / 0.5 + 1e-9) * 0.5;
        const thim = Math.round(div) % 50;
        let msg = 'sleeve ' + halfMm.toFixed(1) + ' mm + thimble ' + thim + ' × 0.01 mm = ' + shown.toFixed(2) + ' mm';
        if (p.zero) msg += '   →   corrected: ' + shown.toFixed(2) + ' − 0.03 = ' + p.r.toFixed(2) + ' mm';
        Sim.text(ctx, msg, w / 2, h - 18, { size: 12.5, bold: true, color: C.green, align: 'center' });
      } else {
        Sim.text(ctx, 'Read the last visible sleeve mark (is a half-mm showing?), then the thimble line on the datum.', w / 2, h - 18, { size: 12, color: C.muted, align: 'center', italic: true });
      }
    },
    readout(s) {
      if (!s.p.show) return [['reading =', 'hidden: have a go first']];
      const shown = s.p.r + (s.p.zero ? 0.03 : 0);
      const out = [['instrument reads', shown.toFixed(2) + ' mm'], ['uncertainty', '± 0.005 mm (half of 0.01 mm)']];
      if (s.p.zero) out.push(['true diameter = reading − zero error =', s.p.r.toFixed(2) + ' mm', true]);
      return out;
    }
  });

  /* ======================================================================
     4. Combining uncertainties
     ====================================================================== */
  const FORMULAS = {
    resist: {
      name: 'ρ = πd²R / 4l', result: 'resistivity ρ', unit: 'Ω m',
      vars: [
        { name: 'diameter d', unit: 'mm', min: 0.1, max: 1.0, dp: 2, power: 2, good: 0.005, bad: 0.5, goodInst: 'micrometer', badInst: 'ruler' },
        { name: 'resistance R', unit: 'Ω', min: 1, max: 20, dp: 1, power: 1, good: 0.05, bad: 0.5, goodInst: 'digital meter', badInst: 'analogue meter' },
        { name: 'length l', unit: 'm', min: 0.2, max: 1.0, dp: 3, power: 1, good: 0.002, bad: 0.01, goodInst: 'metre rule, careful clip', badInst: 'rough estimate' }
      ],
      calc: (v) => (Math.PI * Math.pow(v[0] * 1e-3, 2) * v[1]) / (4 * v[2])
    },
    density: {
      name: 'ρ = m / L³', result: 'density ρ', unit: 'kg m⁻³',
      vars: [
        { name: 'mass m', unit: 'g', min: 5, max: 100, dp: 2, power: 1, good: 0.005, bad: 0.5, goodInst: '0.01 g balance', badInst: '1 g balance' },
        { name: 'side L', unit: 'mm', min: 10, max: 40, dp: 1, power: 3, good: 0.05, bad: 0.5, goodInst: 'vernier calipers', badInst: 'ruler' },
        null
      ],
      calc: (v) => (v[0] * 1e-3) / Math.pow(v[1] * 1e-3, 3)
    },
    pend: {
      name: 'g = 4π²l / T²', result: 'g', unit: 'm s⁻²',
      vars: [
        { name: 'length l', unit: 'm', min: 0.2, max: 1.5, dp: 3, power: 1, good: 0.002, bad: 0.01, goodInst: 'metre rule to bob centre', badInst: 'rough estimate' },
        { name: 'oscillations timed', unit: '', min: 1, max: 30, dp: 0, power: 2, isCount: true, good: 0.01, bad: 0.2, goodInst: 'light gate (± 0.01 s)', badInst: 'stopwatch (reaction ± 0.2 s)' },
        null
      ],
      calc: (v) => 9.81
    }
  };
  const valueOf = (vd, t) => (vd.isCount ? Math.round(vd.min + t * (vd.max - vd.min)) : vd.min + t * (vd.max - vd.min));
  let currentF = FORMULAS.resist;
  function fmtVar(i, t) {
    const vd = currentF.vars[i];
    if (!vd) return '—';
    const v = valueOf(vd, t);
    return vd.isCount ? String(v) : v.toFixed(vd.dp) + ' ' + vd.unit;
  }
  Sim.create('#sim-uncert', {
    title: 'Which measurement limits your answer?',
    height: (w) => (w >= 620 ? 260 : 330),
    controls: [
      { key: 'f', type: 'select', label: 'Calculation', value: 'resist', options: [['resist', 'Resistivity of a wire (CP7)'], ['density', 'Density of a metal cube'], ['pend', 'g from a simple pendulum']], onChange: (s, v) => configure(s, v) },
      { key: 'q0', label: 'diameter d', min: 0, max: 1, step: 0.005, value: 0.4, format: (t) => fmtVar(0, t) },
      { key: 'q1', label: 'resistance R', min: 0, max: 1, step: 0.005, value: 0.3, format: (t) => fmtVar(1, t) },
      { key: 'q2', label: 'length l', min: 0, max: 1, step: 0.005, value: 0.6, format: (t) => fmtVar(2, t) },
      { key: 'cheap', type: 'check', label: 'Use the cheaper instruments', value: false }
    ],
    init(s) { configure(s, s.p.f); },
    draw(s) {
      const { ctx, w, h } = s;
      const r = compute(s);
      const left = Math.min(220, w * 0.38), right = 70, top = 24, rowH = Math.min(46, (h - top - 30) / (r.rows.length + 1.4));
      const maxPct = Math.max(5, r.total * 1.08);
      const bx = (pct) => left + (pct / maxPct) * (w - left - right);
      Sim.text(ctx, currentF.name + ': percentage uncertainty contributions', 12, 12, { size: 13, bold: true, color: C.navy });
      r.rows.forEach((row, i) => {
        const y = top + 12 + i * rowH;
        Sim.text(ctx, row.label, left - 10, y + rowH * 0.32, { size: 12.5, align: 'right', bold: row.biggest });
        Sim.text(ctx, row.inst, left - 10, y + rowH * 0.32 + 15, { size: 10.5, align: 'right', color: C.muted });
        Sim.rect(ctx, left, y + 2, Math.max(1, bx(row.pct) - left), rowH * 0.6, { fill: row.biggest ? C.orange : C.blue, r: 4 });
        Sim.text(ctx, row.pct.toFixed(row.pct < 1 ? 2 : 1) + '%' + (row.power > 1 ? '  (' + row.power + ' × ' + (row.pct / row.power).toFixed(2) + '%)' : ''), bx(row.pct) + 6, y + 2 + rowH * 0.3, { size: 12, bold: true, color: row.biggest ? '#b35c00' : C.navy });
      });
      const y = top + 12 + r.rows.length * rowH + 6;
      Sim.text(ctx, 'total', left - 10, y + rowH * 0.32, { size: 13, align: 'right', bold: true });
      let x = left;
      r.rows.forEach((row) => { const wd = bx(row.pct) - left; Sim.rect(ctx, x, y + 2, Math.max(1, wd), rowH * 0.6, { fill: row.biggest ? C.orange : C.blue, stroke: '#fff', width: 1 }); x += wd; });
      Sim.text(ctx, r.total.toFixed(1) + '%', x + 6, y + 2 + rowH * 0.3, { size: 13, bold: true, color: C.ink });
    },
    readout(s) {
      const r = compute(s);
      return [
        [currentF.result + ' =', Sim.fmt(r.value, 3) + ' ' + currentF.unit],
        ['± ' + r.total.toFixed(1) + '% =', '± ' + Sim.fmt((r.value * r.total) / 100, 2) + ' ' + currentF.unit, true],
        ['improve first:', r.rows.find((x) => x.biggest).label]
      ];
    }
  });
  function configure(s, key) {
    currentF = FORMULAS[key];
    currentF.vars.forEach((vd, i) => {
      const c = s.controls['q' + i];
      if (!c) return;
      c.el.disabled = !vd;
      s.setLabel('q' + i, vd ? vd.name : '(not used)');
      s.set('q' + i, s.p['q' + i]);
    });
    s.redraw();
  }
  function compute(s) {
    const vals = currentF.vars.map((vd, i) => (vd ? valueOf(vd, s.p['q' + i]) : null));
    const rows = [];
    currentF.vars.forEach((vd, i) => {
      if (!vd) return;
      const abs = s.p.cheap ? vd.bad : vd.good;
      let pct;
      if (vd.isCount) {
        const T = 2 * Math.PI * Math.sqrt(vals[0] / 9.81);
        pct = (abs / Math.max(1e-6, vals[i] * T)) * 100 * vd.power;
      } else pct = (abs / Math.max(1e-9, vals[i])) * 100 * vd.power;
      rows.push({ label: vd.name, pct, power: vd.power, inst: (s.p.cheap ? vd.badInst : vd.goodInst) + (vd.isCount ? '' : ', ± ' + abs + ' ' + vd.unit) });
    });
    const total = rows.reduce((a, r) => a + r.pct, 0);
    let big = rows[0];
    rows.forEach((r) => { if (r.pct > big.pct) big = r; });
    big.biggest = true;
    return { rows, total, value: currentF.calc(vals) };
  }

  /* ======================================================================
     5. Line of best fit by eye
     ====================================================================== */
  const BF = { xmax: 1.0, ymax: 12 };
  Sim.create('#sim-bestfit', {
    title: 'Draw the line of best fit',
    height: (w) => Math.min(420, Math.max(320, w * 0.5)),
    controls: [
      { key: 'ls', type: 'check', label: 'Show least-squares line', value: false },
      { key: 'tri', type: 'check', label: 'Show gradient triangle', value: true },
      { type: 'button', label: 'New data', onClick: (s) => newData(s) }
    ],
    init(s) { newData(s); },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const g = Sim.graph(ctx, { x: 56, y: 24, w: w - 56 - 24, h: h - 24 - 40, xmin: 0, xmax: BF.xmax, ymin: 0, ymax: BF.ymax, xlabel: 'l / m', ylabel: 'R / Ω' }).axes();
      st.g = g;
      const [a, b] = st.handles;
      const m = (b[1] - a[1]) / (b[0] - a[0] || 1e-9);
      const c = a[1] - m * a[0];
      if (s.p.ls && st.fit) g.plot((x) => st.fit.m * x + st.fit.c, { color: C.green, width: 2, dash: [6, 5] });
      g.plot((x) => m * x + c, { color: C.navy, width: 2.5 });
      if (s.p.tri) {
        const x1 = 0.12 * BF.xmax, x2 = 0.88 * BF.xmax;
        const y1 = m * x1 + c, y2 = m * x2 + c;
        Sim.line(ctx, g.px(x1), g.py(y1), g.px(x2), g.py(y1), { color: C.orange, width: 2 });
        Sim.line(ctx, g.px(x2), g.py(y1), g.px(x2), g.py(y2), { color: C.orange, width: 2 });
        Sim.text(ctx, 'Δx = ' + (x2 - x1).toFixed(2) + ' m', g.px((x1 + x2) / 2), g.py(y1) + (y2 > y1 ? 14 : -14), { size: 12, color: '#b35c00', bold: true, align: 'center' });
        Sim.text(ctx, 'Δy = ' + (y2 - y1).toFixed(2) + ' Ω', g.px(x2) + 6, g.py((y1 + y2) / 2), { size: 12, color: '#b35c00', bold: true });
      }
      st.data.forEach(([x, y]) => {
        Sim.line(ctx, g.px(x) - 5, g.py(y) - 5, g.px(x) + 5, g.py(y) + 5, { color: C.red, width: 2 });
        Sim.line(ctx, g.px(x) - 5, g.py(y) + 5, g.px(x) + 5, g.py(y) - 5, { color: C.red, width: 2 });
      });
      [a, b].forEach((p) => {
        Sim.circle(ctx, g.px(p[0]), g.py(p[1]), 9, { fill: '#fff', stroke: C.navy, width: 2.5 });
        Sim.circle(ctx, g.px(p[0]), g.py(p[1]), 3, { fill: C.navy });
      });
    },
    readout(s) {
      const st = s.state;
      const [a, b] = st.handles;
      const m = (b[1] - a[1]) / (b[0] - a[0] || 1e-9);
      const c = a[1] - m * a[0];
      const out = [['your gradient =', m.toFixed(2) + ' Ω m⁻¹'], ['your intercept =', c.toFixed(2) + ' Ω']];
      if (s.p.ls && st.fit) {
        out.push(['least-squares gradient =', st.fit.m.toFixed(2) + ' Ω m⁻¹', true]);
        out.push(['difference =', (Math.abs(m - st.fit.m) / Math.abs(st.fit.m) * 100).toFixed(1) + '%']);
      }
      return out;
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const st = s.state, g = st.g;
        st.drag = null;
        st.handles.forEach((p, i) => { if (Math.hypot(pt.x - g.px(p[0]), pt.y - g.py(p[1])) < 22) st.drag = i; });
      },
      move(s, pt) {
        const st = s.state, g = st.g;
        if (!pt.down || st.drag == null) return;
        const d = g.inv(pt.x, pt.y);
        const other = st.handles[1 - st.drag];
        let x = Sim.clamp(d.x, 0, BF.xmax);
        if (Math.abs(x - other[0]) < 0.08) x = other[0] + (st.drag === 0 ? -0.08 : 0.08);
        st.handles[st.drag] = [Sim.clamp(x, 0, BF.xmax), Sim.clamp(d.y, 0, BF.ymax)];
      },
      up(s) { s.state.drag = null; }
    }
  });
  function newData(s) {
    const m = 8 + Math.random() * 3, c = Math.random() * 0.6;
    const noise = 0.25 + Math.random() * 0.45;
    const data = [];
    for (let i = 1; i <= 8; i++) {
      const x = i * 0.11;
      data.push([x, Math.max(0, m * x + c + gaussian() * noise)]);
    }
    s.state.data = data;
    s.state.fit = fitLine(data);
    s.state.handles = [[0.05, 3], [0.95, 6]];
    if (s.p) s.set('ls', false);
  }

  /* ======================================================================
     6. Straightening graphs with logs
     ====================================================================== */
  Sim.create('#sim-loglin', {
    title: 'Straighten it with logs',
    height: (w) => (w >= 640 ? 330 : 600),
    controls: [
      { key: 'kind', type: 'select', label: 'Relationship', value: 'power', options: [['power', 'Power law  y = k xⁿ'], ['exp', 'Exponential decay  y = A e^(−kx)']] },
      { key: 'n', label: 'Power n (power law)', min: -2, max: 3, step: 0.5, value: 0.5, format: (v) => v.toFixed(1) },
      { key: 'k', label: 'Decay constant k (exponential)', min: 0.1, max: 1.2, step: 0.05, value: 0.4, unit: 's⁻¹', format: (v) => v.toFixed(2) },
      { type: 'button', label: 'New readings', onClick: (s) => { s.state.seed = Math.random() * 1000; } }
    ],
    init(s) { s.state.seed = 1; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const b1 = wide ? { x: 52, y: 30, w: w / 2 - 80, h: h - 70 } : { x: 52, y: 30, w: w - 76, h: h / 2 - 60 };
      const b2 = wide ? { x: w / 2 + 44, y: 30, w: w / 2 - 68, h: h - 70 } : { x: 52, y: h / 2 + 30, w: w - 76, h: h / 2 - 70 };
      let rand = s.state.seed;
      const noise = () => { rand = (rand * 9301 + 49297) % 233280; return (rand / 233280 - 0.5) * 0.06; };
      if (p.kind === 'power') {
        const k = 2, n = p.n;
        const xs = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
        const pts = xs.map((x) => [x, k * Math.pow(x, n) * (1 + noise())]);
        const ymax = Math.max(...pts.map((q) => q[1])) * 1.15;
        const g1 = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 4.4, ymin: 0, ymax, xlabel: 'x', ylabel: 'y', title: 'raw data: y = 2xⁿ' }, b1)).axes();
        g1.plot((x) => (x > 0 ? k * Math.pow(x, n) : null), { from: 0.3, color: C.grey, width: 1.5, dash: [5, 4] });
        pts.forEach((q) => g1.dot(q[0], q[1], { color: C.navy, r: 4 }));
        const lp = pts.map((q) => [Math.log10(q[0]), Math.log10(q[1])]);
        const fit = fitLine(lp);
        const ys = lp.map((q) => q[1]);
        const ylo = Math.min(...ys), yhi = Math.max(...ys);
        const pad = Math.max(0.15, (yhi - ylo) * 0.15);
        const g2 = Sim.graph(ctx, Object.assign({ xmin: -0.4, xmax: 0.7, ymin: Math.min(0, ylo - pad), ymax: yhi + pad, xlabel: 'log x', ylabel: 'log y', title: 'log y against log x' }, b2)).axes();
        if (fit) g2.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2.2 });
        lp.forEach((q) => g2.dot(q[0], q[1], { color: C.navy, r: 4 }));
        s.state.res = fit ? [['gradient =', fit.m.toFixed(2) + ' (= n)', true], ['intercept =', fit.c.toFixed(2) + ' = log k, so k = ' + Math.pow(10, fit.c).toFixed(2)]] : [];
      } else {
        const A = 10, k = p.k;
        const xs = [0, 1, 2, 3, 4, 5, 6, 7];
        const pts = xs.map((x) => [x, A * Math.exp(-k * x) * (1 + noise())]);
        const g1 = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 7.5, ymin: 0, ymax: 11.5, xlabel: 't / s', ylabel: 'V / V', title: 'raw data: V = 10 e^(−kt)' }, b1)).axes();
        g1.plot((x) => A * Math.exp(-k * x), { color: C.grey, width: 1.5, dash: [5, 4] });
        pts.forEach((q) => g1.dot(q[0], q[1], { color: C.navy, r: 4 }));
        const lp = pts.map((q) => [q[0], Math.log(q[1])]);
        const fit = fitLine(lp);
        const ys = lp.map((q) => q[1]);
        const g2 = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 7.5, ymin: Math.min(-0.5, Math.min(...ys) - 0.3), ymax: Math.max(...ys) + 0.4, xlabel: 't / s', ylabel: 'ln (V / V)', title: 'ln V against t' }, b2)).axes();
        if (fit) g2.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2.2 });
        lp.forEach((q) => g2.dot(q[0], q[1], { color: C.navy, r: 4 }));
        s.state.res = fit ? [['gradient =', fit.m.toFixed(3) + ' s⁻¹ (= −k)', true], ['intercept =', fit.c.toFixed(2) + ' = ln A, so A = ' + Math.exp(fit.c).toFixed(1) + ' V']] : [];
      }
    },
    readout(s) { return s.state.res || []; }
  });
})();
