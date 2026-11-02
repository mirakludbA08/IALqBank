/* Density, Upthrust & Viscous Drag — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const clamp = Sim.clamp;

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
    if (Math.abs(d) < 1e-18) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  /* Round up to 1, 2, 2.5 or 5 × 10ⁿ so axes stay tidy. */
  function niceCeil(x) {
    if (!(x > 0) || !isFinite(x)) return 1;
    const e = Math.pow(10, Math.floor(Math.log10(x)));
    const n = x / e;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * e;
  }
  /* Stream function of ideal flow past a cylinder of radius 1: solve y(1 − 1/r²) = c for y > 0. */
  function solveStream(x, c) {
    let lo = Math.sqrt(Math.max(0, 1 - x * x)) + 1e-9, hi = 12;
    for (let i = 0; i < 60; i++) {
      const m = (lo + hi) / 2;
      if (m - m / (x * x + m * m) - c > 0) hi = m; else lo = m;
    }
    return (lo + hi) / 2;
  }

  /* ======================================================================
     0. Static figure: laminar and turbulent flow past a sphere (SVG)
     ====================================================================== */
  (function buildFlowDiagram() {
    const svg = document.getElementById('flow-diagram');
    if (!svg) return;
    const NS = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
      (parent || svg).appendChild(n);
      return n;
    };
    const S = 19, CY = 106, X0 = -4.4, X1 = 9.6, TOP = 36, BOT = 176;
    const cs = [0.2, 0.55, 1.0, 1.6, 2.4, 3.2];
    const defs = mk('defs', {});
    [[34, false], [340, true]].forEach(([left, turb], pi) => {
      const cx = left - X0 * S;
      const pw = (X1 - X0) * S;
      const clip = mk('clipPath', { id: 'flowclip' + pi }, defs);
      mk('rect', { x: left, y: TOP, width: pw, height: BOT - TOP, rx: 10 }, clip);
      mk('rect', { x: left, y: TOP, width: pw, height: BOT - TOP, rx: 10, fill: '#f3f8ff', stroke: '#dfe5ee' });
      const g = mk('g', { 'clip-path': 'url(#flowclip' + pi + ')', fill: 'none', stroke: '#4dabf7', 'stroke-width': 1.7, 'stroke-linejoin': 'round' });
      let k = 0;
      cs.forEach((c) => [1, -1].forEach((sg) => {
        k++;
        const pts = [];
        for (let x = X0; x <= X1 + 1e-9; x += Math.abs(x) < 2.2 ? 0.12 : 0.4) {
          let y = sg * solveStream(x, c);
          if (turb && x > 0.2) {
            const ramp = Math.min(1, (x - 0.2) / 1.5);
            const amp = Math.max(0, 1.3 - 0.33 * c) * ramp;
            y = y * (1 - 0.25 * Math.min(1, (x - 0.2) / 3)) + amp * Math.sin(1.7 * x + k * 1.9) + 0.35 * amp * Math.sin(4.3 * x + k);
          }
          pts.push((cx + x * S).toFixed(1) + ' ' + (CY - y * S).toFixed(1));
        }
        mk('path', { d: 'M' + pts.join(' L') }, g);
      }));
      if (turb) {
        const eg = mk('g', { 'clip-path': 'url(#flowclip' + pi + ')', fill: 'none', stroke: '#f08c00', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
        [[2.1, 0.75, -1], [4.0, -0.62, 1], [6.0, 0.55, -1], [7.9, -0.5, 1]].forEach(([ex, ey, dir]) => {
          const pts = [];
          for (let th = 0; th <= 3 * Math.PI; th += 0.2) {
            const r = (0.7 - 0.18 * th) * S;
            if (r < 1.5) break;
            pts.push((cx + ex * S + r * Math.cos(th)).toFixed(1) + ' ' + (CY - ey * S + dir * r * Math.sin(th)).toFixed(1));
          }
          mk('path', { d: 'M' + pts.join(' L') }, eg);
        });
      }
      mk('circle', { cx: cx.toFixed(1), cy: CY, r: S, fill: '#868e96', stroke: '#495057', 'stroke-width': 1.5 });
      mk('text', { x: (left + pw / 2).toFixed(1), y: 24, 'font-size': 15, 'font-weight': 'bold', fill: '#002b80', 'text-anchor': 'middle' }).textContent = turb ? 'Turbulent flow' : 'Laminar flow';
      mk('text', { x: (left + pw / 2).toFixed(1), y: 194, 'font-size': 13, fill: '#5b6573', 'text-anchor': 'middle' }).textContent = turb ? 'eddies form and the layers mix' : 'smooth layers that never cross';
    });
  })();

  /* ======================================================================
     1. Displacement can and newton meter
     ====================================================================== */
  const DC_OBJ = {
    al: { rho: 2700, fill: '#c3c9d0' },
    brass: { rho: 8500, fill: '#d9ad3c' },
    pvc: { rho: 1400, fill: '#eef1f5' }
  };
  const DC_LIQ = {
    water: { rho: 1000, fill: 'rgba(77,171,247,0.32)', edge: '#4dabf7', name: 'water' },
    salt: { rho: 1200, fill: 'rgba(12,166,120,0.28)', edge: '#0ca678', name: 'salty water' },
    oil: { rho: 920, fill: 'rgba(240,180,30,0.35)', edge: '#e8a90c', name: 'oil' }
  };
  const DC_V = 1.0e-4;   // block volume, 100 cm³
  const DC_H = 6.0;      // block height in cm
  function dcPhysics(p) {
    const obj = DC_OBJ[p.obj], liq = DC_LIQ[p.liq];
    const depth = p.low - 1.5;                       // cm of block bottom below the surface
    const frac = clamp(depth / DC_H, 0, 1);
    const W = obj.rho * DC_V * G;
    const Vsub = DC_V * frac;
    const U = liq.rho * Vsub * G;
    return { obj, liq, depth, frac, W, U, reading: W - U, mWater: liq.rho * Vsub * 1000 };
  }
  Sim.create('#sim-displace', {
    title: 'Displacement can and newton meter',
    height: (w) => (w >= 640 ? 420 : 440),
    controls: [
      { key: 'low', label: 'Lower the newton meter by', min: 0, max: 10, step: 0.1, value: 0, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'obj', type: 'select', label: 'Block (volume 100 cm³)', value: 'al', options: [['al', 'Aluminium (2700 kg m⁻³)'], ['brass', 'Brass (8500 kg m⁻³)'], ['pvc', 'PVC plastic (1400 kg m⁻³)']] },
      { key: 'liq', type: 'select', label: 'Liquid in the can', value: 'water', options: [['water', 'Water (1000 kg m⁻³)'], ['salt', 'Salty water (1200 kg m⁻³)'], ['oil', 'Cooking oil (920 kg m⁻³)']] }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const P = dcPhysics(p);
      const wide = w >= 640;
      const PX = 8;                                   // px per cm
      const base = h - 28;
      const ys = h - 172;                             // liquid surface
      const canW = clamp(w * 0.26, 86, 120);
      const cxc = wide ? w * 0.27 : Math.max(108, w * 0.36);
      const canL = cxc - canW / 2, canR = cxc + canW / 2, canTop = ys - 16;
      // bench
      Sim.rect(ctx, 0, base, w, h - base, { fill: '#e9e2d6' });
      Sim.line(ctx, 0, base, w, base, { color: '#b9a68b', width: 2 });
      // stand
      const xs = canL - 30;
      Sim.rect(ctx, xs - 26, base - 8, 52, 8, { fill: '#868e96', r: 2 });
      Sim.rect(ctx, xs - 3, 16, 6, base - 24, { fill: '#adb5bd' });
      // can and liquid
      Sim.rect(ctx, canL, ys, canW, base - ys, { fill: P.liq.fill });
      Sim.line(ctx, canL, ys, canR, ys, { color: P.liq.edge, width: 2 });
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(canL, canTop); ctx.lineTo(canL, base); ctx.lineTo(canR, base); ctx.lineTo(canR, canTop); ctx.stroke();
      // spout
      ctx.beginPath(); ctx.moveTo(canR, ys - 4); ctx.lineTo(canR + 26, ys + 6); ctx.moveTo(canR, ys + 5); ctx.lineTo(canR + 26, ys + 14); ctx.stroke();
      ctx.restore();
      Sim.text(ctx, 'displacement can', cxc, base + 14, { size: 11.5, color: C.muted, align: 'center' });
      // beaker on a balance
      const bW = 62, bH = 70;
      const bx = canR + 26 + bW / 2 - 6;
      const balTop = base - 22;
      Sim.rect(ctx, bx - 44, balTop, 88, 22, { fill: '#343a40', r: 4 });
      Sim.rect(ctx, bx - 30, balTop + 4, 60, 14, { fill: '#1b1f23', r: 2 });
      Sim.text(ctx, P.mWater.toFixed(1) + ' g', bx, balTop + 11.5, { size: 12, bold: true, color: '#69db7c', align: 'center' });
      const bTop = balTop - bH;
      const fillH = (bH - 4) * clamp((P.frac * 100) / 150, 0, 1);     // beaker holds 150 cm³
      if (fillH > 0.2) Sim.rect(ctx, bx - bW / 2 + 2, balTop - 2 - fillH, bW - 4, fillH, { fill: P.liq.fill });
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx - bW / 2, bTop); ctx.lineTo(bx - bW / 2, balTop); ctx.lineTo(bx + bW / 2, balTop); ctx.lineTo(bx + bW / 2, bTop); ctx.stroke();
      ctx.restore();
      if (P.frac > 0 && P.frac < 1) Sim.circle(ctx, canR + 24, ys + 22, 2.5, { fill: P.liq.edge });
      Sim.text(ctx, 'beaker', bx, bTop - 10, { size: 11.5, color: C.muted, align: 'center' });

      // block, string and newton meter (all move down together)
      const bw = 44, bh = DC_H * PX;
      const blockBottom = ys + P.depth * PX;
      const blockTop = blockBottom - bh;
      const hookY = blockTop - 38;
      Sim.rect(ctx, cxc - bw / 2, blockTop, bw, bh, { fill: P.obj.fill, stroke: '#495057', width: 1.5, r: 3 });
      // re-draw liquid over the submerged part so it looks immersed
      if (P.frac > 0) {
        const yTopWet = Math.max(ys, blockTop);
        Sim.rect(ctx, cxc - bw / 2, yTopWet, bw, blockBottom - yTopWet, { fill: P.liq.fill });
      }
      Sim.line(ctx, cxc, hookY, cxc, blockTop, { color: '#495057', width: 1.5 });
      const mH = 104, mW = 30, mBot = hookY - 8, mTop = mBot - mH;
      Sim.rect(ctx, xs, mTop - 6, cxc - xs, 6, { fill: '#adb5bd' });
      Sim.rect(ctx, cxc - mW / 2, mTop, mW, mH, { fill: '#f8f9fa', stroke: '#495057', width: 1.5, r: 6 });
      Sim.line(ctx, cxc, mBot, cxc, hookY, { color: '#495057', width: 2 });
      const range = P.W < 4.6 ? 5 : 10;
      const s0 = mTop + 10, s1 = mBot - 10;
      const yOf = (F) => s0 + (s1 - s0) * clamp(F / range, 0, 1);
      const major = range === 5 ? 1 : 2;
      for (let F = 0; F <= range + 1e-9; F += major / 2) {
        const Y = yOf(F);
        const isMajor = Math.abs(F / major - Math.round(F / major)) < 1e-6;
        Sim.line(ctx, cxc - mW / 2 + 3, Y, cxc - mW / 2 + (isMajor ? 11 : 7), Y, { color: C.axis, width: 1 });
        if (isMajor) Sim.text(ctx, String(F), cxc - mW / 2 - 4, Y, { size: 11, color: C.muted, align: 'right' });
      }
      const py = yOf(P.reading);
      Sim.spring(ctx, cxc + 4, mTop + 4, cxc + 4, py - 2, { coils: 7, width: 4, color: '#868e96', lineWidth: 1.4, lead: 3 });
      Sim.polyline(ctx, [[cxc - 4, py], [cxc + 10, py - 5], [cxc + 10, py + 5]], { close: true, color: C.red, fill: C.red, width: 1 });
      Sim.text(ctx, 'N', cxc - mW / 2 - 4, mBot + 2, { size: 11, color: C.muted, align: 'right' });
      Sim.text(ctx, P.reading.toFixed(2) + ' N', cxc + mW / 2 + 6, py, { size: 13, bold: true, color: C.red, bg: 'rgba(255,255,255,0.85)' });

      // comparison bars (wide screens only)
      if (wide) {
        const x0 = Math.max(bx + 80, w * 0.6), x1 = w - 24;
        const top = 52, bot = base - 60;
        Sim.text(ctx, 'Upthrust = weight of liquid displaced', (x0 + x1) / 2, 26, { size: 14, bold: true, color: C.navy, align: 'center' });
        const maxF = 1200 * DC_V * G * 1.15;
        const bwid = Math.min(70, (x1 - x0) / 4);
        const cols = [
          { x: x0 + (x1 - x0) * 0.3, F: P.U, color: C.red, l1: 'drop in newton', l2: 'meter reading' },
          { x: x0 + (x1 - x0) * 0.7, F: P.U, color: P.liq.edge, l1: 'weight of liquid', l2: 'in the beaker' }
        ];
        Sim.line(ctx, x0, bot, x1, bot, { color: C.axis, width: 1.5 });
        cols.forEach((c) => {
          const hh = (bot - top) * clamp(c.F / maxF, 0, 1);
          if (hh > 0.5) Sim.rect(ctx, c.x - bwid / 2, bot - hh, bwid, hh, { fill: c.color, r: 3 });
          Sim.text(ctx, c.F.toFixed(3) + ' N', c.x, bot - hh - 12, { size: 13, bold: true, color: C.ink, align: 'center' });
          Sim.text(ctx, c.l1, c.x, bot + 16, { size: 12, color: C.muted, align: 'center' });
          Sim.text(ctx, c.l2, c.x, bot + 31, { size: 12, color: C.muted, align: 'center' });
        });
        Sim.text(ctx, '=', (x0 + x1) / 2, bot - 30, { size: 22, bold: true, color: C.green, align: 'center' });
      }
    },
    readout(s) {
      const P = dcPhysics(s.p);
      const out = [
        ['weight in air W =', P.W.toFixed(3) + ' N'],
        ['newton meter reads', P.reading.toFixed(3) + ' N'],
        ['upthrust = W − reading =', P.U.toFixed(3) + ' N', true],
        [P.liq.name + ' collected:', P.mWater.toFixed(1) + ' g'],
        ['its weight =', P.U.toFixed(3) + ' N', true]
      ];
      out.push(['block submerged:', (P.frac * 100).toFixed(0) + '%']);
      return out;
    }
  });

  /* ======================================================================
     2. Float or sink: a block in a tank of liquid (drag it)
     ====================================================================== */
  const FL_LIQ = {
    oil: { rho: 920, fill: 'rgba(240,180,30,0.30)', edge: '#e8a90c' },
    water: { rho: 1000, fill: 'rgba(77,171,247,0.30)', edge: '#4dabf7' },
    sea: { rho: 1030, fill: 'rgba(12,166,120,0.26)', edge: '#0ca678' },
    glycerol: { rho: 1260, fill: 'rgba(130,150,190,0.30)', edge: '#8093b8' },
    mercury: { rho: 13600, fill: 'rgba(134,142,150,0.55)', edge: '#6c757d' }
  };
  const FL_MAT = { cork: 240, pine: 500, oak: 750, wax: 900, ice: 917, nylon: 1150, al: 2700, steel: 7800 };
  const FL_A = 0.10, FL_D = 0.30, FL_AIR = 0.15;      // block side, liquid depth, air gap (m)
  const lrToRho = (lr) => 50 * Math.pow(160, lr / 1000);
  const rhoToLr = (rho) => (1000 * Math.log(rho / 50)) / Math.log(160);
  const flRho = (s) => (s.p.mat !== 'custom' && FL_MAT[s.p.mat] ? FL_MAT[s.p.mat] : lrToRho(s.p.lr));
  function flForces(s) {
    const rho = flRho(s), rf = FL_LIQ[s.p.liq].rho;
    const m = rho * FL_A * FL_A * FL_A;
    const sub = clamp(s.state.y, 0, FL_A);
    const W = m * G, U = rf * FL_A * FL_A * sub * G, Umax = rf * FL_A * FL_A * FL_A * G;
    const onFloor = s.state.y >= FL_D - 1e-6 && W > U;
    return { rho, rf, m, sub, frac: sub / FL_A, W, U, Umax, R: onFloor ? W - U : 0, onFloor };
  }
  function flSettled(s, F) {
    return !s.state.drag && !F.onFloor && Math.abs(s.state.v) < 0.01 && F.frac > 0 && F.frac < 1 && Math.abs(F.W - F.U) < 0.005 * F.W;
  }
  function dropBlock(s) {
    s.state.y = -0.05;
    s.state.v = 0;
    s.state.drag = false;
  }
  function blockColor(rho) {
    if (rho < 350) return '#d8b27c';
    if (rho < 850) return '#c08a4e';
    if (rho < 1000) return '#e7f5ff';
    if (rho < 1600) return '#ffe8cc';
    if (rho < 4000) return '#ced4da';
    return '#868e96';
  }
  Sim.create('#sim-float', {
    title: 'Float or sink? A block in a tank',
    height: (w) => (w >= 640 ? 380 : 560),
    controls: [
      {
        key: 'mat', type: 'select', label: 'Block material', value: 'ice',
        options: [['cork', 'Cork (240 kg m⁻³)'], ['pine', 'Pine wood (500)'], ['oak', 'Oak (750)'], ['wax', 'Candle wax (900)'], ['ice', 'Ice (917)'], ['nylon', 'Nylon (1150)'], ['al', 'Aluminium (2700)'], ['steel', 'Steel (7800)'], ['custom', 'Custom: use the slider']],
        onChange: (s, v) => { if (v !== 'custom') s.set('lr', rhoToLr(FL_MAT[v])); dropBlock(s); }
      },
      { key: 'lr', label: 'Block density', min: 0, max: 1000, step: 0.1, value: rhoToLr(917), unit: 'kg m⁻³', format: (v) => Sim.fmt(lrToRho(v), 3), onChange: (s) => s.set('mat', 'custom') },
      {
        key: 'liq', type: 'select', label: 'Liquid', value: 'sea',
        options: [['oil', 'Vegetable oil (920 kg m⁻³)'], ['water', 'Fresh water (1000)'], ['sea', 'Sea water (1030)'], ['glycerol', 'Glycerol (1260)'], ['mercury', 'Mercury (13 600)']],
        onChange: (s) => dropBlock(s)
      },
      { type: 'button', label: 'Drop again', onClick: (s) => dropBlock(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { y: -0.05, v: 0, drag: false, grab: 0, lay: null }; },
    update(s, dt) {
      const st = s.state;
      if (st.drag || dt <= 0) return;
      const rho = flRho(s), rf = FL_LIQ[s.p.liq].rho;
      const m = rho * FL_A * FL_A * FL_A;
      const k = rf * FL_A * FL_A * G;                 // upthrust per metre of depth
      const n = 12, hstep = dt / n;
      for (let i = 0; i < n; i++) {
        const sub = clamp(st.y, 0, FL_A);
        const c = sub > 0 ? 2 * 0.45 * Math.sqrt(k * m) : 0;
        const F = m * G - k * sub - c * st.v;
        st.v += (F / m) * hstep;
        st.y += st.v * hstep;
        if (st.y >= FL_D) { st.y = FL_D; if (st.v > 0) st.v = 0; }
        if (st.y <= -0.14) { st.y = -0.14; if (st.v < 0) st.v = 0; }
      }
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const F = flForces(s);
      const liq = FL_LIQ[s.p.liq];
      const wide = w >= 640;
      const tank = wide ? { x: 30, w: Math.min(440, w * 0.56) } : { x: 18, w: w - 36 };
      const sceneH = wide ? h : 340;
      const top = 24, bottom = sceneH - 60;
      const sc = (bottom - top) / (FL_D + FL_AIR);
      const ys = top + FL_AIR * sc, yb = ys + FL_D * sc;
      const a = FL_A * sc;
      const bx = tank.x + tank.w / 2;
      const bTop = ys + (st.y - FL_A) * sc, bBot = bTop + a;
      st.lay = { bx, bTop, a, ys, sc };

      // tank
      Sim.rect(ctx, tank.x, top, tank.w, ys - top, { fill: '#f8fbff' });
      Sim.text(ctx, 'air', tank.x + 10, top + 12, { size: 12, color: C.muted });
      // block
      Sim.rect(ctx, bx - a / 2, bTop, a, a, { fill: blockColor(F.rho), stroke: '#495057', width: 1.5, r: 3 });
      Sim.text(ctx, Sim.fmt(F.rho, 3) + ' kg m⁻³', bx - a / 2 - 8, bTop + 12, { size: 12, bold: true, color: C.ink, align: 'right', bg: 'rgba(255,255,255,0.8)' });
      // liquid drawn over the block so the submerged part looks immersed
      Sim.rect(ctx, tank.x, ys, tank.w, yb - ys, { fill: liq.fill });
      Sim.line(ctx, tank.x, ys, tank.x + tank.w, ys, { color: liq.edge, width: 2.5 });
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(tank.x, top + 6); ctx.lineTo(tank.x, yb); ctx.lineTo(tank.x + tank.w, yb); ctx.lineTo(tank.x + tank.w, top + 6); ctx.stroke();
      ctx.restore();
      if (flSettled(s, F)) {
        // show the waterline fraction on the block
        Sim.line(ctx, bx + a / 2 + 4, ys, bx + a / 2 + 4, bBot, { color: C.green, width: 2 });
        Sim.text(ctx, (F.frac * 100).toFixed(0) + '% under', bx + a / 2 + 9, (ys + bBot) / 2, { size: 12, bold: true, color: C.green, bg: 'rgba(255,255,255,0.8)' });
      }

      // force arrows
      const maxF = Math.max(F.W, F.Umax, 1e-9);
      const L = Math.min(wide ? 110 : 90, sceneH - 22 - (yb - a / 2));
      const midY = bTop + a / 2;
      Sim.arrow(ctx, bx + 12, midY, bx + 12, midY + L * F.W / maxF, { color: C.red, width: 3, label: 'W', labelOffset: 13 });
      if (F.U > maxF * 0.004) {
        const cb = ys > bTop ? (ys + bBot) / 2 : midY;           // centre of the submerged part
        Sim.arrow(ctx, bx - 12, cb, bx - 12, cb - L * F.U / maxF, { color: C.blue, width: 3, label: 'U', labelOffset: 13 });
      }
      if (F.R > maxF * 0.004) Sim.arrow(ctx, bx + a / 2 - 9, bBot, bx + a / 2 - 9, bBot - L * F.R / maxF, { color: C.purple, width: 3, label: 'R', labelOffset: 12 });
      if (st.drag) {
        const push = F.U - F.W;                                 // force you must supply (down = +)
        const len = L * Math.abs(push) / maxF;
        if (len > 2) {
          if (push > 0) Sim.arrow(ctx, bx + a / 2 - 8, bTop - len, bx + a / 2 - 8, bTop, { color: C.grey, width: 3 });
          else Sim.arrow(ctx, bx + a / 2 - 8, bTop, bx + a / 2 - 8, bTop - len, { color: C.grey, width: 3 });
          Sim.text(ctx, push > 0 ? 'your push' : 'your pull', bx + a / 2 - 2, bTop - Math.max(14, len / 2), { size: 12, bold: true, color: C.grey, bg: 'rgba(255,255,255,0.8)' });
        }
      } else if (st.y < -0.01 && Math.abs(st.v) < 0.05) {
        Sim.text(ctx, 'drag the block', bx, bTop - 14, { size: 12, color: C.muted, align: 'center', italic: true });
      }

      // side panel (right on wide screens, below on narrow ones)
      const pan = wide ? { x: tank.x + tank.w + 40, y: 30, w: w - (tank.x + tank.w + 40) - 20, h: h - 60 } : { x: 18, y: sceneH + 14, w: w - 36, h: h - sceneH - 24 };
      const fw = pan.w * 0.62;
      Sim.text(ctx, 'Forces on the block', pan.x + fw / 2, pan.y, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      const barTop = pan.y + 34, barBot = pan.y + pan.h - 26;
      Sim.line(ctx, pan.x, barBot, pan.x + fw, barBot, { color: C.axis, width: 1.5 });
      const bars = [['W', F.W, C.red], ['U', F.U, C.blue], ['R', F.R, C.purple]];
      const bwid = Math.min(46, fw / 5);
      bars.forEach((b, i) => {
        const x = pan.x + fw * (i + 0.5) / 3;
        const hh = (barBot - barTop) * clamp(b[1] / maxF, 0, 1);
        if (hh > 0.5) Sim.rect(ctx, x - bwid / 2, barBot - hh, bwid, hh, { fill: b[2], r: 3 });
        Sim.text(ctx, b[0], x, barBot + 13, { size: 13, bold: true, color: b[2], align: 'center' });
        Sim.text(ctx, Sim.fmt(b[1], 3) + ' N', x, barBot - hh - 10, { size: 11.5, color: C.ink, align: 'center' });
      });
      // submerged-fraction gauge
      const gx = pan.x + fw + (pan.w - fw) / 2;
      const gw = Math.min(46, (pan.w - fw) * 0.45);
      Sim.text(ctx, 'Submerged', gx, pan.y, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      const g0 = barTop, g1 = barBot;
      Sim.rect(ctx, gx - gw / 2, g0, gw, g1 - g0, { fill: '#fff', stroke: C.axis, width: 1.5 });
      const fh = (g1 - g0) * F.frac;
      if (fh > 0.5) Sim.rect(ctx, gx - gw / 2, g1 - fh, gw, fh, { fill: liq.fill });
      Sim.text(ctx, (F.frac * 100).toFixed(0) + '%', gx, g1 + 13, { size: 13, bold: true, color: C.ink, align: 'center' });
      const ratio = F.rho / F.rf;
      if (ratio < 1) {
        const yr = g1 - (g1 - g0) * ratio;
        Sim.line(ctx, gx - gw / 2 - 6, yr, gx + gw / 2 + 6, yr, { color: C.green, width: 2, dash: [5, 3] });
        Sim.text(ctx, 'ρ/ρf', gx + gw / 2 + 4, yr - 9, { size: 11.5, bold: true, color: C.green });
      }
    },
    readout(s) {
      const F = flForces(s);
      const st = s.state;
      const out = [
        ['volume =', '1.00 × 10⁻³ m³'],
        ['mass = ρV =', Sim.fmt(F.m, 3) + ' kg'],
        ['W =', Sim.fmt(F.W, 3) + ' N'],
        ['U = ρf V_sub g =', Sim.fmt(F.U, 3) + ' N'],
        ['ρ_block / ρ_liquid =', Sim.fmt(F.rho / F.rf, 3)]
      ];
      if (st.drag) out.push(['held by you:', 'resultant of W and U = ' + Sim.fmt(Math.abs(F.W - F.U), 3) + ' N ' + (F.W > F.U ? 'down' : 'up'), true]);
      else if (F.onFloor) out.push(['on the bottom:', 'R = W − U = ' + Sim.fmt(F.R, 3) + ' N', true]);
      else if (flSettled(s, F)) out.push(['floating:', 'U = W, ' + (F.frac * 100).toFixed(0) + '% submerged', true]);
      else out.push(['moving:', 'resultant = ' + Sim.fmt(Math.abs(F.W - F.U), 3) + ' N ' + (F.W > F.U ? 'down' : 'up'), true]);
      return out;
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const L = s.state.lay;
        if (!L) return;
        if (Math.abs(pt.x - L.bx) <= L.a / 2 + 10 && pt.y >= L.bTop - 10 && pt.y <= L.bTop + L.a + 10) {
          s.state.drag = true;
          s.state.grab = pt.y - L.bTop;
          s.state.v = 0;
          s.canvas.style.cursor = 'grabbing';
        }
      },
      move(s, pt) {
        const st = s.state, L = st.lay;
        if (!pt.down || !st.drag || !L) return;
        const bottomPx = pt.y - st.grab + L.a;
        st.y = clamp((bottomPx - L.ys) / L.sc, -0.14, FL_D);
        st.v = 0;
      },
      up(s) { s.state.drag = false; s.canvas.style.cursor = 'grab'; }
    }
  });

  /* ======================================================================
     3. A sphere falling through a liquid: forces and terminal velocity
     ====================================================================== */
  const VF = {
    glycerol: { name: 'glycerol', rho: 1260, eta20: 1.41, B: 7800, fill: 'rgba(130,150,190,0.16)' },
    castor: { name: 'castor oil', rho: 961, eta20: 0.99, B: 6900, fill: 'rgba(240,190,40,0.18)' },
    olive: { name: 'olive oil', rho: 915, eta20: 0.084, B: 3700, fill: 'rgba(150,180,30,0.18)' },
    water: { name: 'water', rho: 998, eta20: 1.0e-3, B: 2100, fill: 'rgba(77,171,247,0.16)' }
  };
  const BALL = { steel: 7800, glass: 2500 };
  /* Viscosity modelled as η = η₂₀ exp[B(1/T − 1/293 K)], fitted to typical data from 10 to 40 °C. */
  const etaAt = (L, T) => L.eta20 * Math.exp(L.B * (1 / (T + 273.15) - 1 / 293.15));
  /* Stokes' law with the Schiller–Naumann correction for when the flow is not slow and smooth. */
  function dragOn(v, r, eta, rf) {
    const av = Math.abs(v);
    const Re = (rf * av * 2 * r) / eta;
    const F = Re < 1000 ? 6 * Math.PI * eta * r * av * (1 + 0.15 * Math.pow(Re, 0.687)) : 0.5 * 0.44 * rf * Math.PI * r * r * av * av;
    return F;
  }
  function fallModel(p) {
    const L = VF[p.liq];
    const rs = BALL[p.ball], rf = L.rho;
    const r = p.r * 1e-3;
    const eta = etaAt(L, p.T);
    const V = (4 / 3) * Math.PI * r * r * r, m = rs * V;
    const W = m * G, U = rf * V * G, net = W - U;
    const vStokes = (2 * r * r * G * (rs - rf)) / (9 * eta);
    let lo = 0, hi = Math.max(vStokes, 1e-9);
    for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (dragOn(mid, r, eta, rf) > net) hi = mid; else lo = mid; }
    const vt = (lo + hi) / 2;
    const gp = net / m;
    const tc = vt / gp;
    const T = 6 * tc, n = 1200, dt = T / n;
    const pts = [[0, 0, 0]];
    let v = 0, x = 0, t99 = T, x99 = 0;
    for (let i = 1; i <= n; i++) {
      const a1 = gp - dragOn(v, r, eta, rf) / m;
      const vm = v + (a1 * dt) / 2;
      const a2 = gp - dragOn(vm, r, eta, rf) / m;
      x += vm * dt;
      v += a2 * dt;
      if (t99 === T && v >= 0.99 * vt) { t99 = i * dt; x99 = x; }
      if (i % 4 === 0) pts.push([i * dt, v, x]);
    }
    const Re = (rf * vt * 2 * r) / eta;
    return { L, r, eta, m, W, U, vt, vStokes, T, pts, t99, x99, Re, rf, rs };
  }
  const tUnit = (T) => (T < 2e-3 ? [1e6, 'µs'] : T < 2 ? [1e3, 'ms'] : [1, 's']);
  const vUnit = (v) => (v < 0.1 ? [1e3, 'mm s⁻¹'] : [1, 'm s⁻¹']);
  function lenStr(x) {
    if (x < 1e-3) return Sim.fmt(x * 1e3, 2) + ' mm';
    if (x < 1) return Sim.fmt(x * 1e3, 2) + ' mm';
    return Sim.fmt(x, 2) + ' m';
  }
  function fallAt(M, t) {
    const pts = M.pts;
    const i = clamp(Math.round((t / M.T) * (pts.length - 1)), 0, pts.length - 1);
    return pts[i];
  }
  function restartFall(s) {
    s.state.M = fallModel(s.p);
    s.state.tp = 0;
    if (!s.running) s.play();
  }
  Sim.create('#sim-fall', {
    title: 'Falling sphere: forces and terminal velocity',
    height: (w) => (w >= 600 ? 370 : 560),
    controls: [
      { key: 'r', label: 'Ball radius r', min: 0.5, max: 3, step: 0.1, value: 1, unit: 'mm', format: (v) => v.toFixed(1) },
      { key: 'ball', type: 'select', label: 'Ball', value: 'steel', options: [['steel', 'Steel (7800 kg m⁻³)'], ['glass', 'Glass (2500 kg m⁻³)']] },
      { key: 'liq', type: 'select', label: 'Liquid', value: 'glycerol', options: [['glycerol', 'Glycerol (1260 kg m⁻³)'], ['castor', 'Castor oil (961 kg m⁻³)'], ['olive', 'Olive oil (915 kg m⁻³)'], ['water', 'Water (998 kg m⁻³)']] },
      { key: 'T', label: 'Liquid temperature', min: 10, max: 40, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0) },
      { type: 'button', label: '↺ Replay', onClick: (s) => restartFall(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    onChange(s) { restartFall(s); },
    init(s) {
      const specks = [];
      for (let i = 0; i < 46; i++) specks.push([Math.random(), Math.random()]);
      s.state = { M: fallModel(s.p), tp: 0, specks };
    },
    update(s, dt) {
      const st = s.state;
      const M = st.M;
      const pt = fallAt(M, st.tp);
      const speed = M.vt > 0 ? pt[1] / M.vt : 0;
      st.specks.forEach((q) => { q[1] -= dt * 0.55 * speed; if (q[1] < 0) { q[1] += 1; q[0] = Math.random(); } });
      st.tp = Math.min(M.T, st.tp + (dt * M.T) / 4);
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state, M = st.M;
      const wide = w >= 600;
      const cur = fallAt(M, st.tp);
      const v = cur[1];
      const F = dragOn(v, M.r, M.eta, M.rf);
      // left panel: the ball in the liquid (the view follows the ball)
      const pnl = wide ? { x: 14, y: 14, w: Math.min(250, w * 0.33), h: h - 28 } : { x: 14, y: 12, w: w - 28, h: 250 };
      Sim.rect(ctx, pnl.x, pnl.y, pnl.w, pnl.h, { fill: M.L.fill, stroke: '#ced4da', width: 1.5, r: 8 });
      const cx = pnl.x + pnl.w * 0.42, cy = pnl.y + pnl.h * 0.36;
      const R = 10 + 4 * (M.r * 1e3);
      st.specks.forEach((q) => {
        let x = pnl.x + 8 + q[0] * (pnl.w - 16);
        const y = pnl.y + 6 + q[1] * (pnl.h - 12);
        const dx = x - cx, dy = y - cy;
        if (Math.abs(dy) < R + 10 && Math.abs(dx) < R + 8) x = cx + Math.sign(dx || 1) * (R + 8);
        Sim.circle(ctx, x, y, 1.8, { fill: 'rgba(0,43,128,0.35)' });
      });
      Sim.circle(ctx, cx, cy, R, { fill: s.p.ball === 'steel' ? '#adb5bd' : 'rgba(208,235,255,0.9)', stroke: '#495057', width: 1.5 });
      Sim.circle(ctx, cx - R * 0.35, cy - R * 0.35, R * 0.25, { fill: 'rgba(255,255,255,0.8)' });
      const Lw = Math.min(110, pnl.h * 0.42);
      const k = Lw / M.W;
      Sim.arrow(ctx, cx, cy, cx, cy + Lw, { color: C.red, width: 3.2, label: 'W', labelOffset: 13 });
      if (M.U * k > 2) Sim.arrow(ctx, cx - 9, cy, cx - 9, cy - M.U * k, { color: C.blue, width: 3 });
      if (M.U * k > 2) Sim.text(ctx, 'U', cx - 15, cy - M.U * k - 6, { size: 14, bold: true, color: C.blue, align: 'right' });
      if (F * k > 2) Sim.arrow(ctx, cx + 9, cy, cx + 9, cy - F * k, { color: C.orange, width: 3 });
      if (F * k > 2) Sim.text(ctx, 'F', cx + 15, cy - F * k - 6, { size: 14, bold: true, color: '#c46f00' });
      const res = M.W - M.U - F;
      const rx = pnl.x + pnl.w - 30;
      Sim.text(ctx, 'resultant', rx, cy - 14, { size: 11.5, color: C.green, align: 'center', bold: true });
      if (res * k > 2) Sim.arrow(ctx, rx, cy, rx, cy + res * k, { color: C.green, width: 3 });
      else Sim.text(ctx, 'zero', rx, cy + 10, { size: 12, color: C.green, align: 'center', bold: true });
      Sim.text(ctx, M.L.name + ' at ' + s.p.T.toFixed(0) + ' °C', pnl.x + 10, pnl.y + pnl.h - 14, { size: 12, color: C.muted });

      // right panel: v–t graph
      const [ts, tu] = tUnit(M.T);
      const [vs, vu] = vUnit(M.vt);
      const gb = wide ? { x: pnl.x + pnl.w + 62, y: 34, w: w - (pnl.x + pnl.w + 62) - 22, h: h - 34 - 40 } : { x: 56, y: pnl.y + pnl.h + 40, w: w - 56 - 22, h: h - (pnl.y + pnl.h + 40) - 36 };
      const ymax = niceCeil(M.vt * vs * 1.25);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: M.T * ts, ymin: 0, ymax, xlabel: 't / ' + tu, ylabel: 'v / ' + vu, title: 'velocity–time' }, gb)).axes();
      g.hline(M.vt * vs, { color: C.green, dash: [6, 4] });
      Sim.text(ctx, 'terminal velocity', g.px(M.T * ts * 0.55), g.py(M.vt * vs) - 5, { size: 12, color: C.green, align: 'center', baseline: 'bottom', bold: true });
      if (M.vStokes * vs <= ymax) {
        if (M.vStokes > M.vt * 1.03) {
          g.hline(M.vStokes * vs, { color: C.orange, dash: [3, 4] });
          g.label(M.T * ts * 0.97, M.vStokes * vs, "Stokes' law prediction", { size: 12, color: '#c46f00', align: 'right', baseline: 'bottom', bold: true });
        }
      } else {
        Sim.text(ctx, "Stokes' law predicts " + Sim.fmt(M.vStokes * vs, 2) + ' ' + vu + ' (off the scale)', gb.x + gb.w - 4, gb.y + 12, { size: 12, color: '#c46f00', align: 'right', bold: true, bg: 'rgba(255,255,255,0.85)' });
      }
      const upto = M.pts.filter((q) => q[0] <= st.tp + 1e-15).map((q) => [q[0] * ts, q[1] * vs]);
      g.path(upto, { color: C.navy, width: 2.8 });
      g.dot(cur[0] * ts, cur[1] * vs, { color: C.navy });
    },
    readout(s) {
      const st = s.state, M = st.M;
      const cur = fallAt(M, st.tp);
      const F = dragOn(cur[1], M.r, M.eta, M.rf);
      const [ts, tu] = tUnit(M.T);
      const [vs, vu] = vUnit(M.vt);
      const valid = M.Re < 1 ? 'laminar, Stokes’ law valid ✓' : M.Re < 100 ? 'drag bigger than Stokes’ law predicts' : 'turbulent wake: Stokes’ law fails ✗';
      return [
        ['η =', Sim.fmt(M.eta, 3) + ' Pa s'],
        ['W =', Sim.fmt(M.W, 3) + ' N'],
        ['U =', Sim.fmt(M.U, 3) + ' N'],
        ['drag F =', Sim.fmt(F, 3) + ' N'],
        ['v =', Sim.fmt(cur[1] * vs, 3) + ' ' + vu],
        ['terminal velocity =', Sim.fmt(M.vt * vs, 3) + ' ' + vu, true],
        ['2r²g(ρs − ρf)/9η =', Sim.fmt(M.vStokes * vs, 3) + ' ' + vu],
        ['flow:', valid],
        ['Reynolds number (beyond the spec):', Sim.fmt(M.Re, 2)],
        ['99% of vₜ after', Sim.fmt(M.t99 * ts, 2) + ' ' + tu + ', in ' + lenStr(M.x99)]
      ];
    }
  });

  /* ======================================================================
     4. Core practical 2: falling-ball viscometer
     ====================================================================== */
  const CP_RS = 7800, CP_RF = 1260, CP_TOP = 0.07, CP_GAP = 0.200, CP_LEN = 0.34;
  const cpEta = (T) => etaAt(VF.glycerol, T);
  function cpDrop(s) {
    const st = s.state;
    if (st.fall) return;
    const dTrue = parseFloat(s.p.d);
    const dMeas = Math.round((dTrue + gaussian() * 0.004) * 100) / 100;
    const r = (dTrue / 2) * 1e-3;
    const vt = (2 * r * r * G * (CP_RS - CP_RF)) / (9 * cpEta(s.p.T));
    const tTrue = CP_GAP / vt;
    const tMeas = Math.max(0.2, tTrue + gaussian() * 0.06 + gaussian() * 0.06);
    const k = Math.max(1, CP_LEN / vt / 3.2);
    st.fall = { t: 0, vt, tMeas, dMeas, k, d: dTrue };
  }
  Sim.create('#sim-cp2', {
    title: 'Virtual experiment: falling-ball viscometer',
    height: (w) => (w >= 640 ? 410 : 640),
    controls: [
      { key: 'd', type: 'select', label: 'Steel ball diameter', value: '2.0', options: [['1.0', '1.0 mm'], ['1.5', '1.5 mm'], ['2.0', '2.0 mm'], ['2.5', '2.5 mm'], ['3.0', '3.0 mm'], ['4.0', '4.0 mm']] },
      { key: 'T', label: 'Glycerol temperature', min: 15, max: 30, step: 0.5, value: 20, unit: '°C', format: (v) => v.toFixed(1), onChange: (s) => { s.state.data = []; s.state.fall = null; s.state.last = null; } },
      { type: 'button', label: 'Drop the ball', onClick: (s) => cpDrop(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.last = null; s.state.fall = null; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { data: [], fall: null, last: null }; },
    update(s, dt) {
      const f = s.state.fall;
      if (!f) return;
      f.t += dt * f.k;
      if (f.t * f.vt >= CP_LEN) {
        const r = (f.dMeas / 2) * 1e-3;
        s.state.data.push({ r, v: CP_GAP / f.tMeas });
        s.state.last = f;
        s.state.fall = null;
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const scene = wide ? { x: 0, y: 0, w: 250, h } : { x: 0, y: 0, w, h: 330 };
      const tubeTop = scene.y + 40, tubeBot = wide ? scene.y + scene.h - 80 : scene.y + scene.h - 26;
      const pxm = (tubeBot - tubeTop - 14) / (CP_LEN + 0.02);
      const tx = wide ? scene.x + 96 : scene.x + Math.max(80, w * 0.3);
      const tw = 66;
      const surf = tubeTop + 14;
      // tube
      Sim.rect(ctx, tx - tw / 2, surf, tw, tubeBot - surf, { fill: 'rgba(130,150,190,0.22)' });
      Sim.line(ctx, tx - tw / 2, surf, tx + tw / 2, surf, { color: '#8093b8', width: 2 });
      ctx.save();
      ctx.strokeStyle = C.axis; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(tx - tw / 2, tubeTop); ctx.lineTo(tx - tw / 2, tubeBot); ctx.lineTo(tx + tw / 2, tubeBot); ctx.lineTo(tx + tw / 2, tubeTop); ctx.stroke();
      ctx.restore();
      Sim.rect(ctx, tx - tw / 2 - 16, tubeBot, tw + 32, 8, { fill: '#868e96', r: 2 });
      Sim.text(ctx, 'glycerol, ' + p.T.toFixed(1) + ' °C', tx, tubeTop - 16, { size: 12, color: C.muted, align: 'center' });
      // rubber bands
      const yA = surf + CP_TOP * pxm, yB = surf + (CP_TOP + CP_GAP) * pxm;
      [[yA, 'A'], [yB, 'B']].forEach(([y, lab]) => {
        Sim.rect(ctx, tx - tw / 2 - 3, y - 2.5, tw + 6, 5, { fill: '#c92a2a', r: 2 });
        Sim.text(ctx, lab, tx - tw / 2 - 10, y, { size: 13, bold: true, color: '#c92a2a', align: 'right' });
      });
      Sim.arrow(ctx, tx + tw / 2 + 14, yA, tx + tw / 2 + 14, yB, { color: C.green, width: 1.5, head: 7 });
      Sim.arrow(ctx, tx + tw / 2 + 14, yB, tx + tw / 2 + 14, yA, { color: C.green, width: 1.5, head: 7 });
      Sim.text(ctx, '20.0 cm', tx + tw / 2 + 20, (yA + yB) / 2, { size: 12, bold: true, color: C.green });
      // ball
      const f = st.fall;
      const dShow = f ? f.d : parseFloat(p.d);
      const br = 2.5 + dShow * 1.5;
      let by = surf - br - 6;
      if (f) by = surf + Math.min(f.t * f.vt, CP_LEN) * pxm;
      Sim.circle(ctx, tx, by, br, { fill: '#adb5bd', stroke: '#343a40', width: 1.2 });
      // stopwatch
      let shown = 0;
      if (f) {
        const tA = CP_TOP / f.vt;
        shown = clamp(f.t - tA, 0, f.tMeas);
        if (f.t * f.vt >= CP_TOP + CP_GAP) shown = f.tMeas;
      } else if (st.last) shown = st.last.tMeas;
      const sw = wide ? { x: tx, y: tubeBot + 40 } : { x: Math.min(w - 60, tx + tw / 2 + 120), y: (surf + tubeBot) / 2 };
      Sim.rect(ctx, sw.x - 48, sw.y - 14, 96, 28, { fill: '#212529', r: 5 });
      Sim.text(ctx, shown.toFixed(2) + ' s', sw.x, sw.y, { size: 15, bold: true, color: '#69db7c', align: 'center' });
      Sim.text(ctx, 'stopwatch (A → B)', sw.x, sw.y + 24, { size: 11, color: C.muted, align: 'center' });
      if (f && f.k > 1.5) Sim.text(ctx, 'time-lapse ×' + Math.round(f.k), sw.x, sw.y - 24, { size: 11, color: C.muted, align: 'center', italic: true });

      // graph of v against r²
      const gb = wide ? { x: scene.w + 60, y: 34, w: w - scene.w - 60 - 22, h: h - 34 - 40 } : { x: 56, y: scene.h + 36, w: w - 56 - 22, h: h - scene.h - 36 - 40 };
      const kNow = (2 * G * (CP_RS - CP_RF)) / (9 * cpEta(p.T)) * 1e-3;  // mm s⁻¹ per mm²
      let ymax = niceCeil(kNow * 4.2 * 1.12);
      st.data.forEach((d) => { ymax = Math.max(ymax, niceCeil(d.v * 1e3 * 1.1)); });
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 4.4, ymin: 0, ymax, xlabel: 'r² / mm²', ylabel: 'v / mm s⁻¹', title: 'terminal velocity against r²' }, gb)).axes();
      const pts = st.data.map((d) => [d.r * d.r * 1e6, d.v * 1e3]);
      const radii = new Set(st.data.map((d) => d.r.toFixed(5)));
      const fit = radii.size >= 2 ? fitLine(pts) : null;
      if (fit) g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Press “Drop the ball” to take a reading', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const pts = st.data.map((d) => [d.r * d.r, d.v]);
      const radii = new Set(st.data.map((d) => d.r.toFixed(5)));
      const out = [];
      const L = st.fall || st.last;
      if (L) out.push(['micrometer: d =', L.dMeas.toFixed(2) + ' mm']);
      if (st.last && !st.fall) {
        out.push(['time A → B =', st.last.tMeas.toFixed(2) + ' s']);
        out.push(['v = 0.200 m ÷ t =', Sim.fmt(CP_GAP / st.last.tMeas, 3) + ' m s⁻¹']);
      }
      out.push(['readings:', String(st.data.length)]);
      const fit = radii.size >= 2 && pts.length >= 3 ? fitLine(pts) : null;
      if (fit && fit.m > 0) {
        const eta = (2 * G * (CP_RS - CP_RF)) / (9 * fit.m);
        out.push(['gradient =', Sim.fmt(fit.m, 3) + ' m⁻¹ s⁻¹']);
        out.push(['η = 2g(ρs − ρf) / (9 × gradient) =', Sim.fmt(eta, 3) + ' Pa s', true]);
        out.push(['data-book value at ' + s.p.T.toFixed(1) + ' °C ≈', Sim.fmt(cpEta(s.p.T), 3) + ' Pa s']);
      } else out.push(['need 3 readings with 2+ ball sizes', 'to fit a line']);
      return out;
    }
  });

  /* ======================================================================
     5. Laminar and turbulent flow past a ball (dye-line animation)
     ====================================================================== */
  const FLOW_FACTOR = { thick: 0.55, medium: 1, runny: 1.6 };
  Sim.create('#sim-flow', {
    title: 'Laminar or turbulent? Flow past a ball',
    height: (w) => { const span = w < 560 ? 12 : 18; return Math.round((w / span) * 7.2) + 34; },
    controls: [
      { key: 'q', label: 'Flow speed (relative)', min: 1, max: 10, step: 0.1, value: 2, format: (v) => v.toFixed(1) },
      { key: 'fluid', type: 'select', label: 'Fluid', value: 'medium', options: [['thick', 'Very viscous liquid'], ['medium', 'Medium viscosity'], ['runny', 'Runny liquid (low viscosity)']] }
    ],
    animate: true,
    init(s) {
      const st = { parts: [], vort: [], emit: [], shedT: 0, shedSign: 1, lanes: [] };
      for (let y = -3.23; y <= 3.23 + 1e-9; y += 0.34) st.lanes.push(+y.toFixed(2));
      st.lanes.forEach((y, i) => {
        st.emit.push(0);
        for (let x = -5.2; x < 13; x += 0.22) {
          st.parts.push({ x, y: Math.sign(y) * solveStream(x, Math.abs(y)), lane: i, age: 0 });
        }
      });
      s.state = st;
    },
    update(s, dt) {
      const st = s.state;
      if (dt <= 0) return;
      const qe = s.p.q * FLOW_FACTOR[s.p.fluid];
      const U = 0.7 + 0.28 * s.p.q;                  // visual speed, units per second
      const eddy = qe >= 3.5 && qe < 5.5 ? (qe - 3.5) / 2 : -1;
      const turb = qe >= 5.5 ? Math.min(1, (qe - 5.5) / 4) : 0;
      // vortex shedding
      if (qe >= 5.5) {
        st.shedT += dt;
        const period = 1.5 / U;
        if (st.shedT > period) {
          st.shedT = 0;
          st.shedSign = -st.shedSign;
          const gam = -(2.0 + 1.5 * turb) * st.shedSign;   // upper vortex turns clockwise
          st.vort.push({ x: 1.35, y: 0.55 * st.shedSign, g: gam });
        }
      }
      st.vort.forEach((v) => { v.x += 0.8 * dt * U; v.y *= Math.exp(-0.25 * dt); v.g *= Math.exp(-0.12 * dt); });
      st.vort = st.vort.filter((v) => v.x < 14 && qe >= 5.5);
      const fixed = eddy >= 0 ? [{ x: 1.5 + 0.7 * eddy, y: 0.55, g: -(2.0 + eddy) }, { x: 1.5 + 0.7 * eddy, y: -0.55, g: 2.0 + eddy }] : [];
      const vs = fixed.concat(st.vort);
      const vel = (x, y) => {
        const r2 = x * x + y * y;
        let u = 1, v = 0;
        if (r2 > 1e-6) { const r4 = r2 * r2; u = 1 - (x * x - y * y) / r4; v = (-2 * x * y) / r4; }
        for (let i = 0; i < vs.length; i++) {
          const dx = x - vs[i].x, dy = y - vs[i].y;
          const k = vs[i].g / (2 * Math.PI * (dx * dx + dy * dy + 0.12));
          u -= k * dy; v += k * dx;
        }
        return [u, v];
      };
      const sub = 2, hdt = (dt * U) / sub;
      const noise = 0.55 * turb;
      for (const pt of st.parts) {
        for (let k = 0; k < sub; k++) {
          const [u, v] = vel(pt.x, pt.y);
          pt.x += u * hdt; pt.y += v * hdt;
          if (noise > 0 && pt.x > 0.8 && Math.abs(pt.y) < 1.3 + 0.2 * (pt.x - 1)) {
            pt.x += gaussian() * noise * Math.sqrt(hdt) * 0.5;
            pt.y += gaussian() * noise * Math.sqrt(hdt);
          }
          const r2 = pt.x * pt.x + pt.y * pt.y;
          if (r2 < 1.04) { const r = Math.sqrt(r2) || 1; pt.x = (pt.x / r) * 1.02; pt.y = (pt.y / r) * 1.02; }
        }
        pt.age += dt;
      }
      st.parts = st.parts.filter((pt) => pt.x < 13.5 && pt.x > -6 && Math.abs(pt.y) < 4.2 && pt.age < (pt.life || 40));
      // dye released from the back of the ball shows the eddies
      if (qe >= 3.5) {
        st.inject = (st.inject || 0) + dt;
        while (st.inject > 0.04) {
          st.inject -= 0.04;
          const up = Math.random() < 0.5 ? 1 : -1, ph = (40 + Math.random() * 35) * Math.PI / 180;
          st.parts.push({ x: 1.06 * Math.cos(ph), y: up * 1.06 * Math.sin(ph), lane: up > 0 ? 10 : 9, age: 0, life: 6 + Math.random() * 4 });
        }
      }
      // emit new dye at the left
      const spacing = 0.22 / U;
      st.lanes.forEach((y, i) => {
        st.emit[i] += dt;
        if (st.emit[i] >= spacing) { st.emit[i] -= spacing; st.parts.push({ x: -5.2, y, lane: i, age: 0 }); }
      });
      if (st.parts.length > 2600) st.parts.splice(0, st.parts.length - 2600);
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const span = w < 560 ? 12 : 18, x0 = w < 560 ? -3 : -5;
      const top = 34;
      const sc = w / span;
      const ymid = top + (h - top) / 2;
      const X = (x) => (x - x0) * sc, Y = (y) => ymid - y * sc;
      Sim.rect(ctx, 0, top, w, h - top, { fill: '#f3f8ff' });
      const nL = st.lanes.length, mid = (nL - 1) / 2;
      const cols = [C.navy, C.sky];
      ctx.save();
      for (const pt of st.parts) {
        const d = Math.abs(pt.lane - mid);
        ctx.fillStyle = d < 2 ? (pt.lane % 2 ? C.red : C.orange) : cols[pt.lane % 2];
        ctx.fillRect(X(pt.x) - 1.4, Y(pt.y) - 1.4, 2.8, 2.8);
      }
      ctx.restore();
      Sim.circle(ctx, X(0), Y(0), sc, { fill: '#868e96', stroke: '#495057', width: 2 });
      const qe = s.p.q * FLOW_FACTOR[s.p.fluid];
      if (qe >= 3.5 && qe < 5.5) {
        // curved arrows marking the two standing eddies
        const e = (qe - 3.5) / 2;
        [1, -1].forEach((up) => {
          const ex = X(1.5 + 0.7 * e), ey = Y(0.55 * up), r = 0.45 * sc;
          const a1 = up > 0 ? -2.6 : 2.6, a2 = up > 0 ? 1.6 : -1.6;
          ctx.save(); ctx.strokeStyle = 'rgba(201,42,42,0.75)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ex, ey, r, a1, a2, up < 0); ctx.stroke(); ctx.restore();
          const tx = up > 0 ? -Math.sin(a2) : Math.sin(a2), ty = up > 0 ? Math.cos(a2) : -Math.cos(a2);
          const hx = ex + r * Math.cos(a2), hy = ey + r * Math.sin(a2);
          Sim.arrow(ctx, hx - tx * 8, hy - ty * 8, hx + tx * 2, hy + ty * 2, { color: 'rgba(201,42,42,0.85)', width: 2, head: 8 });
        });
        Sim.text(ctx, 'eddies', X(1.5 + 0.7 * e) + 0.6 * sc, Y(0) , { size: 12, bold: true, color: '#c92a2a', bg: 'rgba(255,255,255,0.75)' });
      }
      const msg = qe < 3.5 ? ['Laminar flow: smooth layers that never cross', C.green]
        : qe < 5.5 ? ['Faster: a pair of eddies forms behind the ball', '#c46f00']
          : ['Turbulent wake: eddies break away and the fluid mixes', C.red];
      Sim.text(ctx, msg[0], 12, 17, { size: w < 420 ? 12 : 14, bold: true, color: msg[1] });
    },
    readout(s) {
      const qe = s.p.q * FLOW_FACTOR[s.p.fluid];
      return [
        ['flow:', qe < 3.5 ? 'laminar' : qe < 5.5 ? 'laminar, with eddies behind' : 'turbulent wake'],
        ['Stokes’ law F = 6πηrv:', qe < 3.5 ? 'valid ✓' : 'not valid ✗', true],
        ['note:', 'thicker fluids stay laminar at higher speeds']
      ];
    }
  });
})();
