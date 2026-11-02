/* Biology 6c, Decomposition and forensics: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const WHITE = 'rgba(255,255,255,0.9)';

  function xTitle(ctx, g, str) {
    Sim.text(ctx, str, g.x + g.w / 2, g.y + g.h + 22, { size: 12.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });
  }

  /* ======================================================================
     1. Body cooling curve (algor mortis)
     Marshall and Hoare's double exponential, with Henssge's constant B for
     ambient temperatures up to 23 °C. Clothing, air movement and water are
     allowed for by a corrective factor that multiplies the body mass.
     ====================================================================== */
  const T0 = 37.2;   // core temperature at death / °C
  const HMAX = 48;
  const CONDS = {
    still: [1.0, 'naked, still air'],
    moving: [0.75, 'naked, moving air'],
    clothed: [1.3, 'clothed, still air'],
    water: [0.5, 'naked, in still water']
  };
  const coolB = (mass, cf) => -1.2815 * Math.pow(mass * cf, -0.625) + 0.0284;
  const coolQ = (t, B) => 1.25 * Math.exp(B * t) - 0.25 * Math.exp(5 * B * t);
  const bodyT = (t, Ta, B) => Ta + (T0 - Ta) * coolQ(t, B);
  function timeFor(Tm, Ta, B) {
    const q = (Tm - Ta) / (T0 - Ta);
    if (q >= 1) return 0;
    if (q <= 0.01) return null;
    let lo = 0, hi = 300;
    if (coolQ(hi, B) > q) return null;
    for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (coolQ(mid, B) > q) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  Sim.create('#sim-bio-6c-cooling', {
    title: 'Estimating time of death from body temperature',
    alt: 'Graph of core body temperature against time since death, with the measured temperature read across to the curve and down to the time axis',
    height: (w) => Math.round(clamp(w * 0.62, 330, 420)),
    controls: [
      { key: 'Tm', label: 'Measured core temperature', min: 10, max: 37, step: 0.5, value: 30, unit: '°C', format: (v) => v.toFixed(1) },
      { key: 'Ta', label: 'Ambient temperature', min: 0, max: 23, step: 1, value: 15, unit: '°C', format: (v) => v.toFixed(0) },
      { key: 'mass', label: 'Body mass', min: 40, max: 110, step: 5, value: 70, unit: 'kg', format: (v) => v.toFixed(0) },
      { key: 'cond', type: 'select', label: 'Where the body was found', value: 'still', options: Object.keys(CONDS).map((k) => [k, CONDS[k][1].charAt(0).toUpperCase() + CONDS[k][1].slice(1)]) },
      { key: 'cmp', type: 'check', label: 'Compare with the naked, still-air curve', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const left = w < 480 ? 46 : 54;
      const g = Sim.graph(ctx, { x: left, y: 28, w: w - left - 16, h: h - 28 - 46, xmin: 0, xmax: HMAX, xstep: 6, ymin: 0, ymax: 40, ystep: 5, ylabel: 'core temperature / °C' }).axes();
      xTitle(ctx, g, 'time since death / h');
      const B = coolB(p.mass, CONDS[p.cond][0]);
      const B1 = coolB(p.mass, 1);
      const cmp = p.cmp && p.cond !== 'still';

      g.hline(p.Ta, { color: C.sky, dash: [6, 4], width: 1.4 });
      Sim.text(ctx, 'ambient ' + p.Ta.toFixed(0) + ' °C', g.x + g.w - 4, g.py(p.Ta) + 11, { size: 11, bold: true, color: '#1971c2', align: 'right', bg: WHITE, pad: 2 });
      if (cmp) g.plot((t) => bodyT(t, p.Ta, B1), { color: C.grey, width: 2, dash: [6, 4] });
      g.plot((t) => bodyT(t, p.Ta, B), { color: C.red, width: 3 });
      if (cmp) {
        const tl = 30;
        const above = bodyT(tl, p.Ta, B) < bodyT(tl, p.Ta, B1);
        Sim.text(ctx, 'naked, still air', g.px(tl), g.py(bodyT(tl, p.Ta, B1)) + (above ? -12 : 13), { size: 11, color: C.muted, align: 'center', bg: WHITE, pad: 2 });
      }
      Sim.text(ctx, 'plateau', g.px(0) + 8, g.py(T0) + 14, { size: 11, italic: true, color: C.muted, align: 'left' });

      /* read across and down */
      const t = timeFor(p.Tm, p.Ta, B);
      const Y = g.py(p.Tm);
      if (t != null && t <= HMAX) {
        const X = g.px(t);
        Sim.line(ctx, g.px(0), Y, X, Y, { color: C.navy, dash: [5, 4], width: 1.5 });
        Sim.line(ctx, X, Y, X, g.py(0), { color: C.navy, dash: [5, 4], width: 1.5 });
        g.dot(t, p.Tm, { color: C.navy, r: 5.5 });
        Sim.text(ctx, t.toFixed(1) + ' h', X, g.py(0) - 12, { size: 12, bold: true, color: C.navy, align: X > g.x + g.w - 30 ? 'right' : 'center', bg: WHITE, pad: 2 });
        if (cmp) {
          const t1 = timeFor(p.Tm, p.Ta, B1);
          if (t1 != null && t1 <= HMAX) {
            const X1 = g.px(t1);
            Sim.line(ctx, X1, Y, X1, g.py(0), { color: C.grey, dash: [3, 4], width: 1.2 });
            g.dot(t1, p.Tm, { color: C.grey, r: 4 });
            Sim.text(ctx, t1.toFixed(1) + ' h', X1, g.py(0) - 30, { size: 11, bold: true, color: C.muted, align: 'center', bg: WHITE, pad: 2 });
          }
        }
      } else {
        Sim.line(ctx, g.px(0), Y, g.px(HMAX), Y, { color: C.navy, dash: [5, 4], width: 1.5 });
      }
      Sim.text(ctx, p.Tm.toFixed(1) + ' °C', g.px(0) + 6, Y - 10, { size: 11.5, bold: true, color: C.navy, bg: WHITE, pad: 2 });
    },
    readout(s) {
      const p = s.p;
      const B = coolB(p.mass, CONDS[p.cond][0]);
      if (p.Tm <= p.Ta + 0.5) return [['the body has cooled to', 'about the ambient temperature: this method can no longer be used', true]];
      const t = timeFor(p.Tm, p.Ta, B);
      if (t == null || t > HMAX) return [['time since death:', 'more than ' + HMAX + ' h: use other evidence', true]];
      const out = [['time since death ≈', t.toFixed(1) + ' h', true]];
      if (t < 3) out.push(['note:', 'on the early plateau a small error in temperature gives a large error in time']);
      if (p.cond !== 'still') {
        const t1 = timeFor(p.Tm, p.Ta, coolB(p.mass, 1));
        if (t1 != null) out.push(['naked, still-air curve would give', t1.toFixed(1) + ' h (' + (t1 < t ? 'too short' : 'too long') + ')']);
      }
      out.push(['ambient', p.Ta.toFixed(0) + ' °C, ' + CONDS[p.cond][1] + ', ' + p.mass.toFixed(0) + ' kg']);
      return out;
    }
  });

  /* ======================================================================
     2. Blowfly development and the time since the eggs were laid
     Development rate is roughly proportional to (temperature − 9 °C), so the
     time from egg to adult = 176 day-degrees ÷ (T − 9).
     ====================================================================== */
  const ADD = 176, TBASE = 9, DMAX = 40;
  const STAGES = [
    { name: 'eggs', f: 0.06, col: '#f1f3f5' },
    { name: '1st instar larva', f: 0.06, col: '#fff0d4' },
    { name: '2nd instar larva', f: 0.07, col: '#ffe0b2' },
    { name: '3rd instar larva (feeding)', f: 0.14, col: '#ffc978' },
    { name: 'post-feeding larva', f: 0.17, col: '#e8b86a' },
    { name: 'pupa', f: 0.50, col: '#b5793f' }
  ];
  const SHORT = ['egg', 'L1', 'L2', 'L3', 'post', 'pupa'];
  const devTotal = (T) => ADD / (T - TBASE);
  function stageAt(d, T) {
    const tot = devTotal(T);
    let a = 0;
    for (let i = 0; i < STAGES.length; i++) {
      const b = a + STAGES[i].f * tot;
      if (d < b) return { i, a, b, u: (d - a) / (b - a), tot };
      a = b;
    }
    return { i: STAGES.length, a: tot, b: null, u: 0, tot };
  }
  function larvaLength(st) {
    const u = st.u;
    return [1.5, 1.5 + 2.5 * u, 4 + 5 * u, 9 + 8 * u, 17 - 3 * u, 9, 9][st.i];
  }
  function drawMaggot(ctx, x, y, Lpx, col) {
    const W = Lpx * 0.1;   // half-width
    const n = 24;
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      let hw = W * (0.22 + 0.78 * Math.sin((Math.PI / 2) * Math.min(1, u / 0.6)));
      if (u > 0.9) hw *= Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.9) / 0.1, 2)));
      top.push([x + u * Lpx, y - hw]);
      bot.push([x + u * Lpx, y + hw]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top[0][0], top[0][1]);
    top.forEach((q) => ctx.lineTo(q[0], q[1]));
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    ctx.strokeStyle = '#a07d4a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,125,74,0.55)';
    for (let k = 1; k < 11; k++) {
      const i = Math.round((k / 11) * n);
      ctx.beginPath(); ctx.moveTo(top[i][0], top[i][1] + 1); ctx.lineTo(bot[i][0], bot[i][1] - 1); ctx.stroke();
    }
    ctx.restore();
    Sim.line(ctx, x + 1, y - 1, x + Math.max(3, Lpx * 0.05), y, { color: '#212529', width: 1.5 });
    Sim.circle(ctx, x + Lpx * 0.97, y - W * 0.25, Math.max(1, W * 0.12), { fill: '#5c3d1e' });
    Sim.circle(ctx, x + Lpx * 0.97, y + W * 0.25, Math.max(1, W * 0.12), { fill: '#5c3d1e' });
  }
  /* x0 is the zero of the millimetre ruler, so lengths can be read off */
  function drawSpecimen(ctx, st, x0, cx, cy, k) {
    const i = st.i;
    if (i === 0) {
      for (let j = 0; j < 7; j++) {
        const x = x0 + 0.8 * k + (j % 4) * 1.4 * k + (j > 3 ? 0.7 * k : 0), y = cy + (j > 3 ? 0.55 * k : 0);
        ctx.save(); ctx.fillStyle = '#fffdf7'; ctx.strokeStyle = '#adb5bd'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, 0.75 * k, 0.25 * k, 0.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      return;
    }
    if (i <= 4) {
      const L = larvaLength(st) * k;
      drawMaggot(ctx, x0, cy, L, i === 4 ? '#f3e3c3' : '#fff4dc');
      return;
    }
    if (i === 5) {
      const L = 9 * k, W = 3.6 * k;
      Sim.rect(ctx, x0, cy - W / 2, L, W, { fill: '#8b5a2b', stroke: '#5c3a1a', width: 1.2, r: W / 2 });
      for (let j = 1; j < 9; j++) Sim.line(ctx, x0 + (j * L) / 9, cy - W / 2 + 2, x0 + (j * L) / 9, cy + W / 2 - 2, { color: 'rgba(60,35,15,0.35)', width: 1 });
      return;
    }
    /* adult fly beside its empty pupal case */
    const L = 9 * k;
    Sim.rect(ctx, cx - L * 1.25, cy - 1.6 * k, L * 0.8, 3.2 * k, { fill: 'rgba(139,90,43,0.35)', stroke: '#8b5a2b', width: 1, r: 1.6 * k, dash: [3, 2] });
    const fx = cx + L * 0.35;
    ctx.save();
    ctx.fillStyle = 'rgba(200,225,255,0.55)';
    ctx.strokeStyle = '#91a7c0';
    ctx.beginPath(); ctx.ellipse(fx - 0.5 * k, cy - 2.2 * k, 3.4 * k, 1.3 * k, -0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(fx - 0.5 * k, cy + 2.2 * k, 3.4 * k, 1.3 * k, 0.35, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b8a3e';
    ctx.beginPath(); ctx.ellipse(fx, cy, 3.2 * k, 1.5 * k, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath(); ctx.arc(fx + 3.4 * k, cy, 1.2 * k, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    Sim.text(ctx, 'empty pupal case', cx - L * 0.85, cy + 2.8 * k, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
  }

  Sim.create('#sim-bio-6c-blowfly', {
    title: 'Blowfly development and the time since egg laying',
    alt: 'Timeline of the stages of blowfly development at the chosen temperature, with a drawing of the stage reached',
    height: 262,
    controls: [
      { key: 'd', label: 'Time since the eggs were laid', min: 0, max: DMAX, step: 0.25, value: 4, unit: 'days', format: (v) => v.toFixed(2) },
      { key: 'T', label: 'Ambient temperature', min: 14, max: 30, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = stageAt(p.d, p.T);
      const x0 = 18, x1 = w - 18;
      /* the axis stretches to fit the whole life cycle at this temperature */
      const dm = Math.max(12, Math.ceil(Math.max(st.tot * 1.15, p.d + 0.5) / 6) * 6);
      const X = (d) => x0 + (d / dm) * (x1 - x0);
      const by = 46, bh = 26;

      Sim.text(ctx, 'stages at ' + p.T.toFixed(0) + ' °C', x0, 22, { size: 12.5, bold: true, color: C.navy });
      Sim.text(ctx, 'egg to adult: ' + st.tot.toFixed(1) + ' days', x1, 22, { size: 12, color: C.muted, align: 'right' });
      let a = 0;
      STAGES.forEach((g, i) => {
        const b = a + g.f * st.tot;
        const xa = X(a), xb = X(Math.min(b, dm));
        if (xb > xa) {
          Sim.rect(ctx, xa, by, xb - xa, bh, { fill: g.col, stroke: '#fff', width: 1 });
          const name = Sim.measure(ctx, g.name, { size: 10.5 }) + 6 < xb - xa ? g.name : SHORT[i];
          if (Sim.measure(ctx, name, { size: 10.5 }) + 4 < xb - xa) Sim.text(ctx, name, (xa + xb) / 2, by + bh / 2, { size: 10.5, color: i === 5 ? '#fff' : C.ink, align: 'center', bold: i === st.i });
        }
        a = b;
      });
      if (st.tot < dm) {
        Sim.rect(ctx, X(st.tot), by, x1 - X(st.tot), bh, { fill: 'rgba(43,138,62,0.12)' });
        if (x1 - X(st.tot) > 50) Sim.text(ctx, 'adults', (X(st.tot) + x1) / 2, by + bh / 2, { size: 10.5, color: '#2b8a3e', align: 'center' });
      }
      Sim.rect(ctx, x0, by, x1 - x0, bh, { stroke: C.axis, width: 1.2 });
      const lab = dm <= 18 ? 3 : 6;
      for (let d = 0; d <= dm; d += 1) {
        if (dm > 24 && d % 2) continue;
        Sim.line(ctx, X(d), by + bh, X(d), by + bh + 4, { color: C.axis, width: 1 });
        if (d % lab === 0) Sim.text(ctx, String(d), X(d), by + bh + 6, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'days since the eggs were laid', (x0 + x1) / 2, by + bh + 22, { size: 11.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });

      /* the window in which this stage would be the oldest one present */
      if (st.b != null) {
        const ya = by - 7;
        Sim.line(ctx, X(st.a), ya, X(Math.min(st.b, dm)), ya, { color: C.purple, width: 3 });
        Sim.line(ctx, X(st.a), ya - 4, X(st.a), ya + 4, { color: C.purple, width: 2 });
        Sim.line(ctx, X(Math.min(st.b, dm)), ya - 4, X(Math.min(st.b, dm)), ya + 4, { color: C.purple, width: 2 });
      }
      /* cursor */
      Sim.line(ctx, X(p.d), by - 4, X(p.d), by + bh + 4, { color: C.red, width: 2.5 });
      ctx.save();
      ctx.fillStyle = C.red;
      ctx.beginPath(); ctx.moveTo(X(p.d), by + bh + 2); ctx.lineTo(X(p.d) - 6, by + bh + 12); ctx.lineTo(X(p.d) + 6, by + bh + 12); ctx.closePath(); ctx.fill();
      ctx.restore();

      /* the specimen, drawn to scale with a millimetre ruler */
      const k = Math.min(12, (w - 70) / 20);
      const cy = by + bh + 98;
      const cx = w / 2;
      const name = st.i < STAGES.length ? STAGES[st.i].name : 'adult fly has emerged';
      Sim.text(ctx, name, cx, cy - 52, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      const ry = cy + 34, rx0 = cx - 10 * k;
      drawSpecimen(ctx, st, rx0, cx, cy, k);
      if (st.i < STAGES.length) Sim.line(ctx, rx0, cy - 8, rx0, ry, { color: 'rgba(73,80,87,0.4)', dash: [2, 3], width: 1 });
      Sim.line(ctx, rx0, ry, rx0 + 20 * k, ry, { color: C.axis, width: 1.2 });
      for (let mm = 0; mm <= 20; mm++) {
        const big = mm % 5 === 0;
        Sim.line(ctx, rx0 + mm * k, ry, rx0 + mm * k, ry + (big ? 7 : 4), { color: C.axis, width: 1 });
        if (big) Sim.text(ctx, String(mm), rx0 + mm * k, ry + 9, { size: 10, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'mm', rx0 + 20 * k + 6, ry + 2, { size: 10, color: C.muted, align: 'left' });
    },
    readout(s) {
      const p = s.p;
      const st = stageAt(p.d, p.T);
      if (st.i >= STAGES.length) {
        return [['after ' + p.d.toFixed(1) + ' days at ' + p.T.toFixed(0) + ' °C:', 'adults have emerged'], ['egg to adult:', st.tot.toFixed(1) + ' days', true]];
      }
      const out = [['stage:', STAGES[st.i].name]];
      if (st.i >= 1 && st.i <= 4) out.push(['length ≈', larvaLength(st).toFixed(1) + ' mm']);
      out.push(['if this is the oldest stage found, eggs were laid', st.a.toFixed(1) + ' to ' + st.b.toFixed(1) + ' days earlier', true]);
      out.push(['egg to adult at ' + p.T.toFixed(0) + ' °C:', st.tot.toFixed(1) + ' days']);
      return out;
    }
  });

  /* ======================================================================
     3. Succession of insects and other organisms on a body
     Timings are typical for about 15 °C and scale with temperature
     (roughly twice as fast for every 10 °C rise).
     ====================================================================== */
  const SMAX = 60;
  const DECOMP = [
    ['fresh', 0, 4, '#d3f9d8'],
    ['bloated', 4, 9, '#fff3bf'],
    ['active decay', 9, 16, '#ffd8a8'],
    ['advanced decay', 16, 32, '#e9d8c4'],
    ['dry remains', 32, 1e9, '#e9ecef']
  ];
  const GROUPS = [
    ['Blowflies arrive and lay eggs', 0, 9, '#2b8a3e'],
    ['Blowfly maggots feeding', 1, 16, '#e67700'],
    ['Flesh flies', 1, 12, '#66a80f'],
    ['Beetles that eat maggots', 4, 25, '#1971c2'],
    ['Carrion beetles', 8, 30, '#5f3dc4'],
    ['Hide beetles on dry skin', 25, 1e9, '#862e9c'],
    ['Mites', 30, 1e9, '#c2255c']
  ];
  const tempFactor = (T) => Math.pow(2, (15 - T) / 10);

  Sim.create('#sim-bio-6c-succession', {
    title: 'Succession on a body',
    alt: 'Timeline of the stages of decomposition and the groups of insects and other organisms present on a body over 60 days',
    height: (w) => (w >= 600 ? 340 : 360),
    controls: [
      { key: 'day', label: 'Days since death', min: 0, max: SMAX, step: 1, value: 6, unit: 'days', format: (v) => v.toFixed(0) },
      { key: 'T', label: 'Mean ambient temperature', min: 5, max: 30, step: 1, value: 15, unit: '°C', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const f = tempFactor(p.T);
      const x0 = 14, x1 = w - 14;
      const X = (d) => x0 + (clamp(d, 0, SMAX) / SMAX) * (x1 - x0);
      const top = 22, bandH = 26;

      /* stages of decomposition */
      DECOMP.forEach(([name, a, b, col]) => {
        const xa = X(a * f), xb = X(b * f);
        if (xb - xa < 0.5) return;
        const on = p.day >= a * f && p.day < b * f;
        Sim.rect(ctx, xa, top, xb - xa, bandH, { fill: col, stroke: '#fff', width: 1 });
        if (Sim.measure(ctx, name, { size: 10.5, bold: on }) + 6 < xb - xa) Sim.text(ctx, name, (xa + xb) / 2, top + bandH / 2, { size: 10.5, bold: on, color: C.ink, align: 'center' });
      });
      Sim.rect(ctx, x0, top, x1 - x0, bandH, { stroke: C.axis, width: 1 });

      /* when the body is found */
      const rowH = Math.min(32, (h - top - bandH - 60) / GROUPS.length);
      const ay = top + bandH + 14 + GROUPS.length * rowH + 2;
      const xc = X(p.day);
      Sim.line(ctx, xc, top - 4, xc, ay, { color: C.red, width: 2, dash: [5, 3] });
      const now = DECOMP.find(([, a, b]) => p.day >= a * f && p.day < b * f);
      const lab = 'body found: ' + (now ? now[0] : '');
      const right = xc + 6 + Sim.measure(ctx, lab, { size: 11, bold: true }) < x1;
      Sim.text(ctx, lab, right ? xc + 4 : xc - 4, top - 10, { size: 11, bold: true, color: C.red, align: right ? 'left' : 'right' });

      /* groups present */
      GROUPS.forEach(([name, a, b, col], i) => {
        const y = top + bandH + 14 + i * rowH;
        const on = p.day >= a * f && p.day <= b * f;
        Sim.text(ctx, name, x0, y, { size: 11.5, bold: on, color: on ? col : '#adb5bd', bg: WHITE, pad: 1 });
        const xa = X(a * f), xb = X(b * f);
        if (xb > xa) {
          ctx.save();
          ctx.globalAlpha = on ? 1 : 0.35;
          Sim.rect(ctx, xa, y + 8, Math.max(3, xb - xa), 9, { fill: col, r: 4.5 });
          ctx.restore();
        }
      });

      /* time axis */
      Sim.line(ctx, x0, ay, x1, ay, { color: C.axis, width: 1.2 });
      for (let d = 0; d <= SMAX; d += 5) {
        Sim.line(ctx, X(d), ay, X(d), ay + 4, { color: C.axis, width: 1 });
        if (d % 10 === 0) Sim.text(ctx, String(d), X(d), ay + 6, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'days since death', (x0 + x1) / 2, ay + 22, { size: 11.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });
    },
    readout(s) {
      const p = s.p;
      const f = tempFactor(p.T);
      const stage = DECOMP.find(([, a, b]) => p.day >= a * f && p.day < b * f);
      const present = GROUPS.filter(([, a, b]) => p.day >= a * f && p.day <= b * f).map((g) => g[0].toLowerCase());
      return [
        ['day ' + p.day.toFixed(0) + ' at ' + p.T.toFixed(0) + ' °C:', stage ? stage[0] : '—', true],
        ['present:', present.length ? present.join('; ') : 'none of these groups yet'],
        ['dry remains reached after about', (32 * f).toFixed(0) + ' days']
      ];
    }
  });
})();
