/* Biology 8c: Gene technology — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  function wrapText(ctx, str, maxW, o) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const test = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, test, o) > maxW) { lines.push(cur); cur = wd; } else cur = test;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  const pow10 = (n) => '10' + Sim.sup(n);
  const bigNum = (v) => (v < 1e5 ? String(Math.round(v)) : Sim.fmt(v, 3));

  /* ======================================================================
     1. PCR: denature, anneal, extend; the number of copies doubles each cycle
     ====================================================================== */
  const MAXC = 35;
  const K_MAX = 1e11;            // copies at which primers and nucleotides run out
  const STAGES = [
    { name: 'Denaturation', T: 95, from: 0, to: 0.25, col: C.red, txt: 'At about 95 °C the hydrogen bonds between the bases break, so the two DNA strands separate.' },
    { name: 'Annealing', T: 55, from: 0.25, to: 0.5, col: C.blue, txt: 'At about 55 °C short primers bind to the 3′ end of each single strand by complementary base pairing.' },
    { name: 'Extension', T: 72, from: 0.5, to: 1, col: C.green, txt: 'At about 72 °C heat-stable DNA polymerase adds free nucleotides to each primer, building a complementary strand.' }
  ];
  const stageAt = (f) => (f < 0.25 ? STAGES[0] : f < 0.5 ? STAGES[1] : STAGES[2]);
  /* Temperature during one cycle (f = fraction of the cycle, 0 to 1); short ramps between steps. */
  function tempAt(f) {
    const r = 0.035;
    if (f < r) return Sim.lerp(72, 95, f / r);
    if (f < 0.25) return 95;
    if (f < 0.25 + r) return Sim.lerp(95, 55, (f - 0.25) / r);
    if (f < 0.5) return 55;
    if (f < 0.5 + r) return Sim.lerp(55, 72, (f - 0.5) / r);
    return 72;
  }
  const CYCLE_MIN = 2;           // minutes for one cycle in the thermocycler
  const nextN = (n, plateau) => n * (1 + (plateau ? Math.max(0, 1 - n / K_MAX) : 1));

  /* One template molecule at fraction f of a cycle. */
  function drawDNA(ctx, box, f, running) {
    const L = box.w - 60, x0 = box.x + 30, x1 = x0 + L;
    const mid = box.y + box.h / 2;
    const sepD = f < 0.03 || !running ? 0 : clamp((f - 0.03) / 0.17, 0, 1);
    const half = 6 + 26 * sepD;                            // half the gap between the template strands
    const yT = mid - half, yB = mid + half;
    const blue = '#1c7ed6', green = '#2f9e44', orange = C.orange;
    // base pairs between the original strands
    if (sepD < 0.98) for (let x = x0 + 4; x < x1; x += 8) Sim.line(ctx, x, yT + 2, x, yB - 2, { color: 'rgba(134,142,150,' + (0.7 * (1 - sepD)) + ')', width: 1.2 });
    Sim.line(ctx, x0, yT, x1, yT, { color: blue, width: 4 });
    Sim.line(ctx, x0, yB, x1, yB, { color: blue, width: 4 });
    Sim.text(ctx, '5′', x0 - 6, yT, { size: 11, bold: true, color: blue, align: 'right' });
    Sim.text(ctx, '3′', x1 + 6, yT, { size: 11, bold: true, color: blue });
    Sim.text(ctx, '3′', x0 - 6, yB, { size: 11, bold: true, color: blue, align: 'right' });
    Sim.text(ctx, '5′', x1 + 6, yB, { size: 11, bold: true, color: blue });
    if (!running || f < 0.25) return;
    // primers bind at the 3′ end of each template strand
    const pl = L * 0.14;
    const bind = clamp((f - 0.27) / 0.18, 0, 1);
    const gap = 14 + 22 * (1 - bind);
    const yPT = yT + gap, yPB = yB - gap;
    Sim.line(ctx, x1 - pl, yPT, x1, yPT, { color: orange, width: 4 });   // primer for the top strand
    Sim.line(ctx, x0, yPB, x0 + pl, yPB, { color: orange, width: 4 });   // primer for the bottom strand
    if (f < 0.5) {
      if (bind > 0.9) Sim.text(ctx, 'primer', x1 - pl / 2, yPT + 12, { size: 10.5, bold: true, color: '#d9480f', align: 'center' });
      return;
    }
    // extension: new strands grow 5′ → 3′ from each primer
    const ext = clamp((f - 0.52) / 0.44, 0, 1) * (L - pl);
    Sim.line(ctx, x1 - pl - ext, yPT, x1 - pl, yPT, { color: green, width: 4 });
    Sim.line(ctx, x0 + pl, yPB, x0 + pl + ext, yPB, { color: green, width: 4 });
    for (let x = x1 - 4; x > x1 - pl - ext; x -= 8) Sim.line(ctx, x, yT + 2, x, yPT - 2, { color: 'rgba(134,142,150,0.6)', width: 1.2 });
    for (let x = x0 + 4; x < x0 + pl + ext; x += 8) Sim.line(ctx, x, yPB + 2, x, yB - 2, { color: 'rgba(134,142,150,0.6)', width: 1.2 });
    if (ext < L - pl - 1) {
      [[x1 - pl - ext, (yT + yPT) / 2], [x0 + pl + ext, (yPB + yB) / 2]].forEach(([px, py]) => {
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(px, py, 11, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(112,72,232,0.85)';
        ctx.fill();
        ctx.restore();
      });
      Sim.text(ctx, 'DNA polymerase', x0 + pl + ext + 14, yB + 16, { size: 10.5, bold: true, color: C.purple, align: 'center' });
    }
  }

  function pcrLayout(w) {
    if (w >= 720) {
      const tw = Math.round(w * 0.4);
      return { wide: true, tg: { x: 56, y: 40, w: tw - 70, h: 130 }, dna: { x: tw + 10, y: 30, w: w - tw - 24, h: 150 }, cg: { x: 76, y: 226, w: w - 76 - 20, h: 170 } };
    }
    return { wide: false, tg: { x: 46, y: 40, w: w - 46 - 16, h: 110 }, dna: { x: 10, y: 186, w: w - 20, h: 130 }, cg: { x: 66, y: 372, w: w - 66 - 16, h: 180 } };
  }

  Sim.create('#sim-bio-8c-pcr', {
    title: 'PCR: copying DNA cycle by cycle',
    alt: 'The temperature of one PCR cycle, a template DNA molecule being copied, and a graph of the number of DNA molecules against the number of cycles.',
    height: (w) => (w >= 720 ? 440 : 600),
    controls: [
      { key: 'n0', type: 'select', label: 'Starting DNA molecules', value: '1', options: [['1', '1'], ['10', '10'], ['100', '100'], ['1000', '1000']], onChange: (s) => s.reset() },
      { key: 'plateau', type: 'check', label: 'Primers and nucleotides run out', value: false, onChange: (s) => s.reset() },
      { key: 'log', type: 'check', label: 'Logarithmic scale', value: false },
      { type: 'button', label: 'Run one cycle', onClick: (s) => { if (s.state.cyc < MAXC) { s.state.stop = s.state.cyc + 1; s.play(); } } }
    ],
    animate: true,
    autoplay: false,
    init(s) {
      s.state = { cyc: 0, f: 0, N: [parseInt(s.p.n0, 10)], stop: null };
      if (s.running) s.pause();
    },
    update(s, dt) {
      const st = s.state;
      if (st.cyc >= MAXC) { s.pause(); return; }
      st.f += dt / (st.cyc < 3 || st.stop !== null ? 3.0 : 0.8);
      if (st.f >= 1) {
        st.f = 0;
        st.cyc++;
        st.N.push(nextN(st.N[st.N.length - 1], s.p.plateau));
        if ((st.stop !== null && st.cyc >= st.stop) || st.cyc >= MAXC) { st.stop = null; s.pause(); }
      }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const L = pcrLayout(w);
      const fs = L.wide ? 12.5 : 11.5;
      const active = s.running || st.f > 0;
      const stg = stageAt(st.f);

      /* temperature during one cycle */
      const tg = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: CYCLE_MIN, ymin: 40, ymax: 110, ystep: 20, xstep: 0.5, xlabel: 'time / min', ylabel: 'temperature / °C' }, L.tg));
      tg.axes();
      STAGES.forEach((g0) => {
        const a = tg.px(g0.from * CYCLE_MIN), b = tg.px(g0.to * CYCLE_MIN);
        Sim.rect(ctx, a, tg.y, b - a, tg.h, { fill: active && g0 === stg ? 'rgba(0,123,255,0.08)' : 'rgba(0,0,0,0)' });
        Sim.text(ctx, g0.T + ' °C', (a + b) / 2, tg.py(g0.T) + (g0.T === 72 ? -10 : 12), { size: 11, bold: true, color: g0.col, align: 'center' });
      });
      tg.plot((x) => tempAt(x / CYCLE_MIN), { color: C.ink, width: 2.2, samples: 300 });
      if (active) tg.dot(st.f * CYCLE_MIN, tempAt(st.f), { color: stg.col, r: 5.5 });
      Sim.text(ctx, 'one cycle in the thermocycler', tg.x + tg.w / 2, tg.y - 22, { size: 12, bold: true, color: C.navy, align: 'center' });

      /* the DNA */
      const d = L.dna;
      Sim.text(ctx, active ? 'Cycle ' + (st.cyc + 1) + ': ' + stg.name : st.cyc ? st.cyc + ' cycle' + (st.cyc > 1 ? 's' : '') + ' done' : 'Press Play or “Run one cycle”', d.x + 6, d.y + 2, { size: fs + 1, bold: true, color: active ? stg.col : C.navy });
      const tl = wrapText(ctx, active ? stg.txt : 'One template molecule is shown. Every molecule in the tube is copied in the same way.', d.w - 12, { size: fs });
      tl.forEach((ln, i) => Sim.text(ctx, ln, d.x + 6, d.y + 20 + i * 15, { size: fs, color: C.ink }));
      drawDNA(ctx, { x: d.x + 4, y: d.y + 20 + tl.length * 15, w: d.w - 8, h: d.h - 16 - tl.length * 15 + 26 }, st.f, active);

      /* number of molecules against cycle number */
      const N = st.N, n0 = N[0];
      const cg = L.cg;
      let g;
      if (p.log) {
        const lo = Math.floor(Math.log10(n0)), hi = Math.ceil(Math.log10(n0) + MAXC * Math.log10(2));
        g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: MAXC, ymin: lo, ymax: hi, xstep: 5, ystep: 1, ticks: false }, cg));
        g.axes();
        for (let e = lo; e <= hi; e += hi - lo > 8 ? 2 : 1) Sim.text(ctx, pow10(e), g.x - 6, g.py(e), { size: 11, color: C.muted, align: 'right' });
      } else {
        const raw = Math.max(n0 * 4, N[N.length - 1] * 1.25);   // headroom above the newest point
        let step = Math.pow(10, Math.floor(Math.log10(raw / 5)));
        const r = raw / 5 / step;
        step = Math.max(1, step * (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10));
        const ymax = Math.ceil(raw / step) * step;
        g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: MAXC, ymin: 0, ymax, xstep: 5, ystep: step, ticks: false }, cg));
        g.axes();
        for (let v = step; v <= ymax + 1e-6 * step; v += step) Sim.text(ctx, v < 1e5 ? String(Math.round(v)) : Sim.fmt(v, 2), g.x - 6, g.py(v), { size: 11, color: C.muted, align: 'right' });
      }
      for (let c = 0; c <= MAXC; c += 5) Sim.text(ctx, String(c), g.px(c), g.y + g.h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      Sim.text(ctx, 'number of cycles', g.x + g.w, g.y + g.h + 22, { size: 12, bold: true, align: 'right', baseline: 'top' });
      Sim.text(ctx, 'DNA molecules' + (p.log ? ' (log scale)' : ''), g.x + 6, g.y + 2, { size: 12.5, bold: true, baseline: 'top' });
      const Y = (v) => (p.log ? Math.log10(v) : v);
      // the ideal doubling curve for comparison
      if (p.plateau) g.plot((c) => Y(n0 * Math.pow(2, c)), { color: '#adb5bd', width: 1.5, dash: [5, 4], to: Math.min(MAXC, Math.max(st.cyc, 1)) });
      g.path(N.map((v, c) => [c, Y(v)]), { color: C.navy, width: 2 });
      N.forEach((v, c) => g.dot(c, Y(v), { color: C.navy, r: N.length > 20 ? 3 : 4 }));
    },
    readout(s) {
      const st = s.state, p = s.p;
      const n0 = parseInt(p.n0, 10);
      const n = st.N[st.N.length - 1];
      const out = [['cycles done', String(st.cyc)]];
      if (p.plateau) {
        out.push(['DNA molecules', bigNum(n), true]);
        out.push(['if every cycle doubled', n0 + ' × 2' + Sim.sup(st.cyc) + ' = ' + bigNum(n0 * Math.pow(2, st.cyc))]);
      } else out.push(['DNA molecules = ' + n0 + ' × 2' + Sim.sup(st.cyc) + ' =', bigNum(n), true]);
      if (s.running || st.f > 0) out.push(['now', stageAt(st.f).name.toLowerCase() + ' at ' + tempAt(st.f).toFixed(0) + ' °C']);
      return out;
    }
  });

  /* ======================================================================
     2. Gel electrophoresis: separating fragments by size
     ====================================================================== */
  /* A 5000 bp recombinant plasmid: EcoRI cuts at 0 and 1000 (the ends of the inserted gene),
     BamHI cuts at 400 (in the gene) and 2600 (in the vector). */
  const LANES = [
    { lab: 'M', name: 'size marker', sizes: [100, 200, 300, 400, 500, 700, 1000, 1500, 2000, 3000, 5000], marker: true },
    { lab: '1', name: 'plasmid cut with EcoRI', sizes: [1000, 4000] },
    { lab: '2', name: 'plasmid cut with BamHI', sizes: [2200, 2800] },
    { lab: '3', name: 'plasmid cut with EcoRI and BamHI', sizes: [400, 600, 1600, 2400] }
  ];
  const GEL_MM = 75;               // length of the gel from the wells / mm
  const SPEED = 2.4;               // mm min⁻¹ for a fragment with mobility 1 (about 100 V)
  const mobility = (bp) => 1.2 - 0.27 * Math.log10(bp);
  const distance = (bp, t) => SPEED * t * mobility(bp);
  /* Estimate a size from a distance using a straight-line fit of log(size) against distance for the marker. */
  function calibrate(t) {
    const pts = LANES[0].sizes.map((b) => [distance(b, t), Math.log10(b)]).filter((q) => q[0] <= GEL_MM);
    if (pts.length < 2 || t <= 0) return null;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const n = pts.length, m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { m, c: (sy - m * sx) / n, pts };
  }
  function gelLayout(w) {
    if (w >= 720) {
      const gw = Math.min(360, Math.round(w * 0.44));
      return { wide: true, gel: { x: 64, y: 58, w: gw, h: 300 }, cal: { x: 64 + gw + 92, y: 50, w: w - (64 + gw + 92) - 18, h: 220 }, key: { x: 64 + gw + 42, y: 322 } };
    }
    return { wide: false, gel: { x: 52, y: 58, w: w - 52 - 16, h: 240 }, cal: { x: 64, y: 456, w: w - 64 - 16, h: 170 }, key: { x: 16, y: 362 } };
  }
  function bandsOf(t, L) {
    const out = [];
    const lw = L.gel.w / LANES.length;
    const k = L.gel.h / GEL_MM;
    LANES.forEach((ln, li) => ln.sizes.forEach((b) => {
      const d = distance(b, t);
      out.push({ li, b, d, x: L.gel.x + lw * (li + 0.5), y: L.gel.y + 10 + d * k, off: d > GEL_MM });
    }));
    return out;
  }

  Sim.create('#sim-bio-8c-gel', {
    title: 'Gel electrophoresis of a recombinant plasmid',
    alt: 'An agarose gel with a size marker and three digests of a plasmid, and a calibration graph of fragment size against distance moved.',
    height: (w) => (w >= 720 ? 420 : 680),
    controls: [
      { key: 't', label: 'Running time', min: 0, max: 60, step: 1, value: 40, unit: 'min', format: (v) => v.toFixed(0) },
      { key: 'show', type: 'check', label: 'Show the real fragment sizes', value: false }
    ],
    init(s) { s.state = { sel: { li: 3, b: 1600 } }; },
    pointer: {
      down(s, pt) {
        const L = gelLayout(s.w);
        let best = null, bd = 14;
        bandsOf(s.p.t, L).forEach((q) => {
          if (q.off || Math.abs(pt.x - q.x) > L.gel.w / LANES.length / 2) return;
          const dd = Math.abs(pt.y - q.y);
          if (dd < bd) { bd = dd; best = q; }
        });
        if (best) s.state.sel = { li: best.li, b: best.b };
      }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const L = gelLayout(w);
      const G = L.gel;
      const fs = L.wide ? 12.5 : 11.5;
      const lw = G.w / LANES.length;
      /* tank and electrodes */
      Sim.rect(ctx, G.x - 8, G.y - 30, G.w + 16, G.h + 58, { fill: '#f8f9fa', stroke: '#ced4da', width: 1.5, r: 8 });
      Sim.rect(ctx, G.x, G.y - 22, G.w, 6, { fill: '#343a40', r: 3 });
      Sim.text(ctx, '−', G.x - 20, G.y - 19, { size: 18, bold: true, color: '#212529', align: 'center' });
      Sim.rect(ctx, G.x, G.y + G.h + 16, G.w, 6, { fill: C.red, r: 3 });
      Sim.text(ctx, '+', G.x - 20, G.y + G.h + 19, { size: 18, bold: true, color: C.red, align: 'center' });
      /* gel */
      Sim.rect(ctx, G.x, G.y, G.w, G.h + 10, { fill: '#e7f5ff', stroke: '#a5d8ff', width: 1.5 });
      LANES.forEach((ln, li) => {
        const cx = G.x + lw * (li + 0.5);
        Sim.rect(ctx, cx - lw * 0.32, G.y + 3, lw * 0.64, 6, { fill: '#495057', r: 1.5 });
        Sim.text(ctx, ln.lab, cx, G.y - 38, { size: 13, bold: true, color: C.navy, align: 'center' });
      });
      Sim.text(ctx, 'wells', G.x - 4, G.y + 6, { size: 10, color: C.muted, align: 'right' });
      /* bands */
      const sel = s.state.sel;
      let selBand = null, lastLab = -1e9;
      bandsOf(p.t, L).forEach((q) => {
        if (q.off) return;
        const ln = LANES[q.li];
        // each digest has equal numbers of every fragment, so bigger fragments carry more DNA and stain darker
        const a = ln.marker ? 0.75 : clamp(0.3 + 0.7 * Math.pow(q.b / 4000, 0.6), 0.3, 1);
        const bh = 3.5 + q.d * 0.03;
        Sim.rect(ctx, q.x - lw * 0.26, q.y - bh / 2, lw * 0.52, bh, { fill: 'rgba(24,61,142,' + a.toFixed(2) + ')', r: 1.5 });
        if (sel && sel.li === q.li && sel.b === q.b) selBand = q;
        if (!ln.marker && p.show) Sim.text(ctx, String(q.b), q.x + lw * 0.28, q.y, { size: 9.5, bold: true, color: '#c92a2a' });
      });
      // marker sizes beside the gel, skipping any that would overlap
      if (p.t > 0) bandsOf(p.t, L).filter((q) => q.li === 0 && !q.off).sort((m, n) => m.y - n.y).forEach((q) => {
        if (q.y - lastLab < 11) return;
        Sim.text(ctx, String(q.b), G.x - 4, q.y, { size: 9.5, color: C.muted, align: 'right' });
        lastLab = q.y;
      });
      if (selBand) {
        // measure from the bottom of the well to the middle of the band
        const q = selBand, bh = 3.5 + q.d * 0.03;
        Sim.rect(ctx, q.x - lw * 0.3, q.y - bh / 2 - 4, lw * 0.6, bh + 8, { stroke: C.red, width: 2, r: 3 });
        const mx = q.x - lw * 0.38, y0 = G.y + 10;
        if (q.y - y0 > 12) {
          Sim.arrow(ctx, mx, y0 + (q.y - y0) / 2, mx, q.y, { color: C.red, width: 1.5, head: 6 });
          Sim.arrow(ctx, mx, y0 + (q.y - y0) / 2, mx, y0, { color: C.red, width: 1.5, head: 6 });
          Sim.text(ctx, q.d.toFixed(1) + ' mm', mx - 4, y0 + (q.y - y0) / 2, { size: 10.5, bold: true, color: C.red, align: 'center', rotate: -Math.PI / 2, bg: 'rgba(231,245,255,0.9)', pad: 2 });
        }
      }
      const off = bandsOf(p.t, L).filter((q) => q.off).length;
      if (off) Sim.text(ctx, off + ' band' + (off > 1 ? 's have' : ' has') + ' run off the end of the gel', G.x + G.w / 2, G.y + G.h + 40, { size: 11, bold: true, color: C.red, align: 'center' });
      else Sim.text(ctx, 'DNA is negatively charged, so it moves towards +', G.x + G.w / 2, G.y + G.h + 40, { size: 11, color: C.muted, align: 'center' });

      /* calibration graph: size (log scale) against distance */
      const cal = calibrate(p.t);
      const cb = L.cal;
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: GEL_MM, ymin: 2, ymax: 4, xstep: 10, ystep: 1, ticks: false }, cb));
      g.axes();
      [2, 3, 4].forEach((e) => Sim.text(ctx, String(Math.pow(10, e)), g.x - 6, g.py(e), { size: 11, color: C.muted, align: 'right' }));
      [200, 300, 500, 2000, 3000, 5000].forEach((b) => Sim.line(ctx, g.x - 3, g.py(Math.log10(b)), g.x, g.py(Math.log10(b)), { color: C.axis, width: 1 }));
      for (let mm = 0; mm <= GEL_MM; mm += 10) Sim.text(ctx, String(mm), g.px(mm), g.y + g.h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
      Sim.text(ctx, 'distance moved / mm', g.x + g.w, g.y + g.h + 22, { size: 12, bold: true, align: 'right', baseline: 'top' });
      Sim.text(ctx, 'size / bp (log scale)', g.x + g.w - 4, g.y + 2, { size: 12.5, bold: true, baseline: 'top', align: 'right' });
      Sim.text(ctx, 'Size marker calibration', g.x + g.w / 2, g.y - 14, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      let est = null;
      if (cal) {
        g.plot((x) => cal.m * x + cal.c, { color: '#91a7ff', width: 1.5 });
        cal.pts.forEach(([x, y]) => g.dot(x, y, { color: C.navy, r: 3.5 }));
        if (selBand && !selBand.off) {
          est = Math.pow(10, cal.m * selBand.d + cal.c);
          const ly = Math.log10(est);
          if (ly >= 2 && ly <= 4) {
            Sim.line(ctx, g.px(selBand.d), g.y + g.h, g.px(selBand.d), g.py(ly), { color: C.red, width: 1.5, dash: [4, 3] });
            Sim.line(ctx, g.x, g.py(ly), g.px(selBand.d), g.py(ly), { color: C.red, width: 1.5, dash: [4, 3] });
            g.dot(selBand.d, ly, { color: C.red, r: 5 });
          }
        }
      } else Sim.text(ctx, 'Run the gel to see the marker bands', g.x + g.w / 2, g.y + g.h / 2, { size: 12, italic: true, color: C.muted, align: 'center' });
      s.state.est = est;
      s.state.selBand = selBand;

      /* key */
      const ky = L.key.y, kx = L.key.x;
      LANES.slice(1).forEach((ln, i) => Sim.text(ctx, 'Lane ' + ln.lab + ': ' + ln.name, kx, ky + i * 16, { size: fs, color: C.ink }));
      Sim.text(ctx, 'The plasmid is 5000 bp. Click a band to measure it.', kx, ky + 3 * 16 + 2, { size: fs, color: C.muted, italic: true });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const q = st.selBand;
      if (p.t <= 0) return [['running time', '0 min: nothing has moved yet']];
      if (!q) return [['selected band', 'none (it may have run off the gel)']];
      const out = [
        ['lane', LANES[q.li].lab],
        ['distance moved', q.d.toFixed(1) + ' mm']
      ];
      if (st.est) out.push(['size read from the marker', '≈ ' + (Math.round(st.est / 10) * 10) + ' bp', true]);
      if (p.show || LANES[q.li].marker) out.push(['actual size', q.b + ' bp']);
      return out;
    }
  });
})();
