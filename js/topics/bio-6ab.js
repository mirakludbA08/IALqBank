/* Biology 6a-b, Microbiology and immunity: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const WHITE = 'rgba(255,255,255,0.9)';
  const LOG2 = Math.log10(2);

  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function niceCeil(v) {
    if (!(v > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    return steps.find((k) => n <= k + 1e-9) * p;
  }
  /* x-axis title centred under the tick labels, clear of the plotted lines */
  function xTitle(ctx, g, str) {
    Sim.text(ctx, str, g.x + g.w / 2, g.y + g.h + 22, { size: 12.5, bold: true, color: C.ink, align: 'center', baseline: 'top' });
  }
  const softplus = (x, s) => (x / s > 30 ? x : s * Math.log1p(Math.exp(x / s)));
  const softmin = (a, b, s) => Math.min(a, b) - s * Math.log1p(Math.exp(-Math.abs(a - b) / s));

  /* ======================================================================
     1. Bacterial growth curve in a broth culture
     ====================================================================== */
  const N0LOG = 4;      // log10 cells cm⁻³ at the start (1 × 10⁴)
  const STAT = 10;      // hours of stationary phase before death outpaces division
  const DEATH = 0.1;    // log10 units lost per hour in the death phase
  const TMAX = 60;
  const DT_K = 2;       // hours used for the gradient triangle

  function growth(p) {
    const r = (60 / p.g) * LOG2;               // log10 units per hour in the log phase
    const cap = p.cap === 'full' ? 9 : 8;      // log10 of the maximum population
    const tStat = p.lag + (cap - N0LOG) / r;
    const tDeath = tStat + STAT;
    const f = (t) => {
      let y = N0LOG + r * (softplus(t - p.lag, 0.5) - softplus(-p.lag, 0.5));
      y = softmin(y, cap, 0.12);
      y -= DEATH * (softplus(t - tDeath, 1.2) - softplus(-tDeath, 1.2));
      return y;
    };
    return { r, cap, tStat, tDeath, f, lag: p.lag };
  }
  function phaseAt(t, G) {
    const sl = (G.f(t + 0.05) - G.f(Math.max(0, t - 0.05))) / (t >= 0.05 ? 0.1 : 0.05 + t);
    if (sl < -0.03) return 'death phase';
    if (sl >= 0.6 * G.r) return 'exponential (log) phase';
    if (t < (G.lag + G.tStat) / 2) return 'lag phase';
    if (sl > 0.15 * G.r) return 'end of the log phase: growth slowing';
    return 'stationary phase';
  }

  Sim.create('#sim-bio-6ab-growth', {
    title: 'Bacterial growth curve',
    alt: 'Graph of the number of bacteria in a broth culture against time, showing the lag, exponential, stationary and death phases',
    height: (w) => Math.round(clamp(w * 0.62, 330, 420)),
    controls: [
      { key: 't', label: 'Time t', min: 0, max: TMAX - DT_K, step: 0.5, value: 6, unit: 'h', format: (v) => v.toFixed(1) },
      { key: 'g', label: 'Generation time', min: 20, max: 60, step: 5, value: 30, unit: 'min', format: (v) => v.toFixed(0) },
      { key: 'lag', label: 'Length of lag phase', min: 0.5, max: 4, step: 0.5, value: 2, unit: 'h', format: (v) => v.toFixed(1) },
      { key: 'cap', type: 'select', label: 'Nutrients', value: 'full', options: [['full', 'Full-strength broth'], ['dilute', 'Broth diluted 1 in 10']] },
      { key: 'log', type: 'check', label: 'Logarithmic scale', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const G = growth(p);
      const left = w < 480 ? 50 : 58;
      const gb = { x: left, y: 28, w: w - left - 16, h: h - 28 - 46 };
      const unit = Math.pow(10, G.cap);
      const yOf = (t) => (p.log ? G.f(t) : Math.pow(10, G.f(t)) / unit);
      const g = Sim.graph(ctx, Object.assign({
        xmin: 0, xmax: TMAX, xstep: 12, bg: false,
        ymin: p.log ? 3 : 0, ymax: p.log ? 10 : 1.2, ystep: p.log ? 1 : 0.2,
        ylabel: p.log ? 'log₁₀ (cells per cm³)' : 'number of cells / 10' + Sim.sup(G.cap) + ' cm⁻³'
      }, gb));

      /* phase bands */
      const bands = [
        [0, G.lag + 0.2, 'lag', 'rgba(134,142,150,0.10)'],
        [G.lag + 0.2, G.tStat, 'log', 'rgba(47,158,68,0.10)'],
        [G.tStat, G.tDeath - 1, 'stationary', 'rgba(0,123,255,0.08)'],
        [G.tDeath - 1, TMAX, 'death', 'rgba(224,49,49,0.08)']
      ];
      bands.forEach(([a, b, , col]) => {
        const x0 = g.px(clamp(a, 0, TMAX)), x1 = g.px(clamp(b, 0, TMAX));
        if (x1 > x0) Sim.rect(ctx, x0, g.y, x1 - x0, g.h, { fill: col });
      });
      g.axes();
      xTitle(ctx, g, 'time / h');
      /* phase names along the bottom; a name too long for its band goes on a second row */
      bands.forEach(([a, b, name]) => {
        const x0 = g.px(clamp(a, 0, TMAX)), x1 = g.px(clamp(b, 0, TMAX));
        const o = { size: 11, bold: true, color: C.muted, align: 'center' };
        if (x1 - x0 > Sim.measure(ctx, name, o) + 6) Sim.text(ctx, name, (x0 + x1) / 2, g.y + g.h - 12, o);
        else if (x1 - x0 > 16) Sim.text(ctx, name, (x0 + x1) / 2, g.y + g.h - 27, o);
      });

      g.plot(yOf, { color: C.navy, width: 2.8 });

      /* the chosen time, with a gradient triangle over the next 2 hours */
      const t1 = p.t, t2 = p.t + DT_K;
      const y1 = yOf(t1), y2 = yOf(t2);
      if (p.log) {
        const exp = phaseAt(t1, G).startsWith('exponential') && phaseAt(t2, G).startsWith('exponential');
        const col = exp ? C.orange : C.grey;
        Sim.line(ctx, g.px(t1), g.py(y1), g.px(t2), g.py(y1), { color: col, width: 2 });
        Sim.line(ctx, g.px(t2), g.py(y1), g.px(t2), g.py(y2), { color: col, width: 2 });
        Sim.text(ctx, 'Δt = ' + DT_K + ' h', (g.px(t1) + g.px(t2)) / 2, g.py(y1) + 12, { size: 11, bold: true, color: col, align: 'center', bg: WHITE, pad: 2 });
        const dy = y2 - y1;
        if (Math.abs(g.py(y2) - g.py(y1)) > 8 || Math.abs(dy) > 0.02) {
          Sim.text(ctx, 'Δlog N = ' + dy.toFixed(2), g.px(t2) + 6, (g.py(y1) + g.py(y2)) / 2, { size: 11, bold: true, color: col, align: g.px(t2) + 90 < g.x + g.w ? 'left' : 'right', bg: WHITE, pad: 2 });
        }
      }
      g.dot(t1, y1, { color: C.red, r: 5.5 });
    },
    readout(s) {
      const p = s.p;
      const G = growth(p);
      const y1 = G.f(p.t), y2 = G.f(p.t + DT_K);
      const ph = phaseAt(p.t, G);
      const kGraph = (y2 - y1) / (LOG2 * DT_K);
      const valid = ph.startsWith('exponential') && phaseAt(p.t + DT_K, G).startsWith('exponential');
      return [
        ['phase:', ph],
        ['N =', Sim.fmt(Math.pow(10, y1), 3) + ' cells cm⁻³'],
        ['log₁₀ N =', y1.toFixed(2)],
        ['k = Δlog N ÷ (0.301 × ' + DT_K + ' h) =', kGraph.toFixed(2) + ' h⁻¹' + (valid ? '' : ' (not valid here)'), valid],
        ['log-phase k = 60 ÷ ' + p.g + ' =', (60 / p.g).toFixed(2) + ' generations per hour']
      ];
    }
  });

  /* ======================================================================
     2. Serial dilution and plate count
     ====================================================================== */
  const NTUBE = 7;
  const VPLATE = 0.1;    // cm³ spread on each plate
  function poisson(l) {
    if (l < 30) {
      const L = Math.exp(-l);
      let k = 0, pr = 1;
      do { k++; pr *= Math.random(); } while (pr > L);
      return k - 1;
    }
    return Math.max(0, Math.round(l + Math.sqrt(l) * gaussian()));
  }
  function newCulture(s) {
    s.state = { logC: 7 + Math.random() * 2, plates: {} };
  }
  function plateFor(st, k) {
    if (!st.plates[k]) {
      const lam = Math.pow(10, st.logC - k) * VPLATE;
      const count = poisson(lam);
      const pts = [];
      const nDraw = Math.min(count, 3000);
      for (let i = 0; i < nDraw; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.93;
        pts.push([Math.cos(a) * r, Math.sin(a) * r, 0.75 + Math.random() * 0.5]);
      }
      st.plates[k] = { count, pts };
    }
    return st.plates[k];
  }
  const tubeLabel = (k) => '10' + Sim.sup(-k);

  Sim.create('#sim-bio-6ab-dilution', {
    title: 'Serial dilution and plate count',
    alt: 'A row of tubes making a ten-fold serial dilution of a culture, and an agar plate spread with 0.1 cubic centimetres from the chosen tube',
    height: (w) => (w >= 700 ? 320 : 230 + Math.min(120, (w - 40) / 2) * 2 + 30),
    controls: [
      { key: 'k', type: 'select', label: 'Spread 0.1 cm³ from tube', value: '4', options: [1, 2, 3, 4, 5, 6, 7].map((k) => [String(k), tubeLabel(k) + ' (dilution factor ' + Math.pow(10, k).toLocaleString('en-GB') + ')']) },
      { key: 'show', type: 'check', label: 'Show the true concentration', value: false },
      { type: 'button', label: 'New culture', ghost: true, onClick: (s) => newCulture(s) }
    ],
    init(s) { newCulture(s); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const k = +p.k;
      const wide = w >= 700;
      const area = wide ? { x: 10, y: 0, w: w - 290 } : { x: 6, y: 0, w: w - 12 };
      const n = NTUBE + 1;
      const gap = area.w / n;
      const tw = clamp(gap * 0.42, 14, 26), th = clamp(gap * 1.5, 56, 84);
      const ty = 40;

      Sim.text(ctx, 'each step: 1 cm³ into 9 cm³ of sterile water (1 in 10)', area.x + area.w / 2, 14, { size: 11.5, italic: true, color: C.muted, align: 'center' });
      for (let i = 0; i < n; i++) {
        const cx = area.x + gap * (i + 0.5);
        const turb = clamp((st.logC - i - 3.5) / 5, 0, 1);
        const sel = i === k;
        if (i === 0) {
          /* culture flask */
          Sim.rect(ctx, cx - tw * 0.7, ty + th * 0.25, tw * 1.4, th * 0.75, { fill: 'rgba(214,180,80,' + (0.25 + 0.6 * turb) + ')', stroke: C.axis, width: 1.5, r: 6 });
          Sim.rect(ctx, cx - tw * 0.3, ty, tw * 0.6, th * 0.3, { stroke: C.axis, width: 1.5 });
          Sim.text(ctx, 'culture', cx, ty + th + 14, { size: 10.5, bold: true, color: C.ink, align: 'center' });
        } else {
          Sim.rect(ctx, cx - tw / 2, ty + th * 0.35, tw, th * 0.65, { fill: 'rgba(214,180,80,' + (0.06 + 0.6 * turb) + ')', r: tw / 2 });
          ctx.save();
          ctx.strokeStyle = sel ? C.blue : C.axis;
          ctx.lineWidth = sel ? 2.6 : 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - tw / 2, ty);
          ctx.lineTo(cx - tw / 2, ty + th - tw / 2);
          ctx.arc(cx, ty + th - tw / 2, tw / 2, Math.PI, 0, true);
          ctx.lineTo(cx + tw / 2, ty);
          ctx.stroke();
          ctx.restore();
          Sim.text(ctx, tubeLabel(i), cx, ty + th + 14, { size: 11, bold: sel, color: sel ? C.blue : C.ink, align: 'center' });
          const px = area.x + gap * (i - 0.5);
          Sim.arrow(ctx, px + tw * 0.6, ty - 6, cx - tw * 0.6, ty - 6, { color: C.grey, width: 1.4, head: 6 });
        }
      }

      /* the plate */
      let R, pcx, pcy;
      if (wide) { R = Math.min(118, (h - 50) / 2); pcx = w - 140; pcy = h / 2 + 6; }
      else { R = Math.min(120, (w - 40) / 2); pcx = w / 2; pcy = 230 + R; }
      const sx = area.x + gap * (k + 0.5);
      if (wide) Sim.arrow(ctx, sx, ty + th + 26, pcx - R - 10, pcy, { color: C.blue, width: 1.8, head: 8 });
      else Sim.arrow(ctx, sx, ty + th + 26, pcx + (sx - pcx) * 0.35, pcy - R - 8, { color: C.blue, width: 1.8, head: 8 });
      const plate = plateFor(st, k);
      Sim.circle(ctx, pcx, pcy, R + 5, { fill: '#f1f3f5', stroke: '#adb5bd', width: 1.5 });
      Sim.circle(ctx, pcx, pcy, R, { fill: '#f4e7bf', stroke: '#d9c58b', width: 1 });
      if (plate.count > 3000) {
        Sim.circle(ctx, pcx, pcy, R * 0.95, { fill: '#fbf3dc', stroke: '#e3d3a3', width: 1 });
        Sim.text(ctx, 'lawn of growth', pcx, pcy, { size: 13, bold: true, color: '#8a6d1d', align: 'center', bg: 'rgba(255,255,255,0.7)' });
      } else {
        const cr = clamp(R * (plate.count > 300 ? 0.022 : 0.04), 1.4, 5);
        ctx.save();
        ctx.fillStyle = '#fffaf0';
        ctx.strokeStyle = '#c8a95a';
        ctx.lineWidth = 0.8;
        plate.pts.forEach(([x, y, sz]) => { ctx.beginPath(); ctx.arc(pcx + x * R, pcy + y * R, cr * sz, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
        ctx.restore();
      }
      Sim.text(ctx, '0.1 cm³ from ' + tubeLabel(k), pcx, pcy + R + 18, { size: 11.5, bold: true, color: C.blue, align: 'center' });

      if (wide) {
        let y = ty + th + 54;
        const x = area.x + 6;
        Sim.text(ctx, 'cells per cm³ of culture =', x, y, { size: 13, bold: true, color: C.navy });
        y += 22;
        Sim.text(ctx, 'colonies ÷ volume spread (cm³) × dilution factor', x, y, { size: 13, color: C.ink });
        y += 30;
        const c = plate.count;
        const ok = c >= 30 && c <= 300;
        const msg = c > 300 ? c > 3000 ? 'Too many colonies to count: use a more dilute tube.' : 'Colonies overlap: more than 300 is too many to count accurately.'
          : c === 0 ? 'No colonies: use a less dilute tube.'
            : c < 30 ? 'Fewer than 30 colonies: chance has a large effect on the count.' : 'Between 30 and 300 separate colonies: a good plate to count.';
        Sim.text(ctx, msg, x, y, { size: 12.5, italic: true, color: ok ? C.green : C.red });
      }
    },
    readout(s) {
      const st = s.state;
      const k = +s.p.k;
      const c = plateFor(st, k).count;
      const out = [['colonies on the plate:', c > 3000 ? 'a lawn (uncountable)' : c > 300 ? c + ' (too many to count)' : String(c)]];
      if (c > 0 && c <= 300) {
        const est = (c / VPLATE) * Math.pow(10, k);
        out.push(['cells per cm³ = ' + c + ' ÷ 0.1 × 10' + Sim.sup(k) + ' =', Sim.fmt(est, 3), c >= 30]);
        if (c < 30) out.push(['note:', 'under 30 colonies, so less reliable']);
      } else if (c === 0) out.push(['no colonies:', 'choose a less dilute tube']);
      else out.push(['choose:', 'a more dilute tube']);
      if (s.p.show) out.push(['true concentration =', Sim.fmt(Math.pow(10, st.logC), 3) + ' cells per cm³']);
      return out;
    }
  });

  /* ======================================================================
     3. Primary and secondary immune responses
     ====================================================================== */
  /* Antibody level x days after exposure: a delayed sigmoid rise, then a
     decline towards a lower level as plasma cells die. Scaled to the peak. */
  function shape(o) {
    const raw = (x) => {
      if (x <= 0) return 0;
      const rise = 1 / (1 + Math.exp(-(x - o.mid) / o.sr)) - 1 / (1 + Math.exp(o.mid / o.sr));
      return Math.max(0, rise) * (o.tail + (1 - o.tail) * Math.exp(-x / o.tau));
    };
    let m = 0, xp = 0;
    for (let x = 0; x <= 80; x += 0.05) { const v = raw(x); if (v > m) { m = v; xp = x; } }
    const f = (x) => (o.peak * raw(x)) / m;
    f.peakDay = xp;
    f.peak = o.peak;
    return f;
  }
  const PRIMARY = shape({ mid: 9, sr: 1.4, tau: 14, tail: 0.12, peak: 10 });
  const SECONDARY = shape({ mid: 3.2, sr: 0.8, tau: 35, tail: 0.25, peak: 100 });
  const PASSIVE0 = 40, PASSIVE_HALF = 21;   // a.u. injected; half-life in days
  const XMAX = 140;
  const firstDetect = (f) => { for (let x = 0; x < 60; x += 0.1) if (f(x) >= 0.05 * f.peak) return x; return null; };
  const days = (d) => { const n = Math.round(d); return n + (n === 1 ? ' day' : ' days'); };

  function immuneCurves(p) {
    const d2 = p.d2;
    if (p.scen === 'diff') {
      return [
        { name: 'antibody to antigen A', col: C.blue, f: (t) => PRIMARY(t) },
        { name: 'antibody to antigen B', col: C.orange, f: (t) => PRIMARY(t - d2) }
      ];
    }
    if (p.scen === 'passive') {
      return [{ name: 'antibody to antigen A', col: C.blue, f: (t) => PASSIVE0 * Math.pow(0.5, t / PASSIVE_HALF) + PRIMARY(t - d2) }];
    }
    return [{ name: 'antibody to antigen A', col: C.blue, f: (t) => PRIMARY(t) + SECONDARY(t - d2) }];
  }
  const EVENTS = {
    same: ['infection by antigen A', 'second infection by A'],
    vacc: ['vaccination against A', 'infection by A'],
    diff: ['infection by antigen A', 'infection by antigen B'],
    passive: ['antibodies to A injected', 'infection by A']
  };

  Sim.create('#sim-bio-6ab-immune', {
    title: 'Primary and secondary immune responses',
    alt: 'Graph of antibody concentration in the blood against time after two exposures to antigens',
    height: (w) => Math.round(clamp(w * 0.62, 330, 420)),
    controls: [
      { key: 'scen', type: 'select', label: 'Situation', value: 'same', options: [['same', 'Infected twice by the same pathogen'], ['vacc', 'Vaccinated, then infected'], ['diff', 'Infected by two different pathogens'], ['passive', 'Given antibodies, then infected']] },
      { key: 'd2', label: 'Day of the second event', min: 20, max: 100, step: 1, value: 40, unit: 'days', format: (v) => v.toFixed(0) },
      { key: 'log', type: 'check', label: 'Logarithmic antibody scale', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const curves = immuneCurves(p);
      const left = w < 480 ? 48 : 56;
      const gb = { x: left, y: 30, w: w - left - 16, h: h - 30 - 46 };
      const Y = (v) => (p.log ? Math.log10(Math.max(v, 0.1)) : v);
      const g = Sim.graph(ctx, Object.assign({
        xmin: 0, xmax: XMAX, xstep: 20,
        ymin: p.log ? -1 : 0, ymax: p.log ? 3 : 140, ystep: p.log ? 0.5 : 20,
        ylabel: p.log ? 'log₁₀ (antibody concentration / a.u.)' : 'antibody concentration / a.u.'
      }, gb)).axes();
      xTitle(ctx, g, 'time / days');

      /* exposure markers */
      const ev = EVENTS[p.scen];
      [[0, ev[0]], [p.d2, ev[1]]].forEach(([d, label], i) => {
        const X = g.px(d);
        Sim.arrow(ctx, X, g.py(g.ymin) - 34, X, g.py(g.ymin) - 4, { color: C.red, width: 2, head: 8 });
        const yy = g.y + (curves.length > 1 ? 70 : 30) + i * 16;
        const fits = X + 8 + Sim.measure(ctx, label, { size: 11, bold: true }) < g.x + g.w;
        Sim.text(ctx, label, fits ? X + 4 : X - 4, yy, { size: 11, bold: true, color: C.red, align: fits ? 'left' : 'right', bg: WHITE, pad: 2 });
        Sim.line(ctx, X, yy + 7, X, g.py(g.ymin) - 36, { color: 'rgba(224,49,49,0.35)', dash: [3, 4], width: 1 });
      });

      curves.forEach((c) => g.plot((t) => Y(c.f(t)), { color: c.col, width: 2.8 }));
      if (curves.length > 1) {
        curves.forEach((c, i) => {
          Sim.line(ctx, g.x + g.w - 150, g.y + 30 + i * 16, g.x + g.w - 132, g.y + 30 + i * 16, { color: c.col, width: 3 });
          Sim.text(ctx, c.name, g.x + g.w - 128, g.y + 30 + i * 16, { size: 11, color: C.ink });
        });
      }

      /* label the peaks */
      const pk = (f, from, to) => { let m = -1, tm = from; for (let t = from; t <= to; t += 0.25) { const v = f(t); if (v > m) { m = v; tm = t; } } return [tm, m]; };
      const c0 = curves[0];
      if (p.scen === 'same' || p.scen === 'vacc') {
        const a = pk(c0.f, 0, p.d2), b = pk(c0.f, p.d2, XMAX);
        g.dot(a[0], Y(a[1]), { color: c0.col, r: 4.5, label: 'primary', dx: 6, dy: -12 });
        g.dot(b[0], Y(b[1]), { color: C.purple, r: 4.5, label: 'secondary', dx: 8, dy: 4 });
      }
    },
    readout(s) {
      const p = s.p;
      const pf = PRIMARY, sf = SECONDARY;
      const prim = 'detectable after ' + days(firstDetect(pf)) + ', peak ' + pf.peak + ' a.u. on day ' + pf.peakDay.toFixed(0);
      if (p.scen === 'same' || p.scen === 'vacc') {
        return [
          [p.scen === 'vacc' ? 'response to the vaccine (primary):' : 'primary response:', prim],
          ['secondary response:', 'detectable after ' + days(firstDetect(sf)) + ', peak ' + sf.peak + ' a.u. ' + days(sf.peakDay) + ' after exposure'],
          ['secondary peak ÷ primary peak =', (sf.peak / pf.peak).toFixed(0) + ' times higher', true]
        ];
      }
      if (p.scen === 'diff') {
        return [
          ['antigen A, primary response:', prim],
          ['antigen B, also a primary response:', 'memory cells for A do not recognise B', true]
        ];
      }
      const left = PASSIVE0 * Math.pow(0.5, p.d2 / PASSIVE_HALF);
      return [
        ['injected antibodies:', 'protect at once, then halve every ' + PASSIVE_HALF + ' days'],
        ['left by day ' + p.d2 + ':', left.toFixed(1) + ' a.u.'],
        ['infection on day ' + p.d2 + ':', 'only a primary response, as no memory cells were made', true]
      ];
    }
  });
})();
