/* Biology 7a: Cellular respiration — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* Split a string into lines that fit maxW pixels. */
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

  /* ======================================================================
     1. A simple respirometer: oxygen uptake and the respiratory quotient
     ====================================================================== */
  const BORE = 1.0;                                   // capillary bore diameter / mm
  const AREA = Math.PI * Math.pow(BORE / 2, 2);       // bore cross-section / mm²
  const RATE20 = 1.6;                                 // O2 uptake at 20 °C / mm³ g⁻¹ min⁻¹
  const RUN = 5;                                      // length of one run / min
  const SEC_PER_MIN = 1.2;                            // real seconds per simulated minute
  const CAP = 200;                                    // straight part of the capillary / mm
  const START = 150;                                  // bead starts this far from the bend / mm
  const TOWARD_MAX = START - 12;                      // the bead can move this far towards the seeds
  const AWAY_MAX = CAP - START - 6;                   // ... and this far away from them
  const SUBS = {
    carb: { rq: 1.0 },
    protein: { rq: 0.9 },
    lipid: { rq: 0.7 },
    anaer: { rq: 1.3 }
  };
  /* O2 used per minute: proportional to mass, roughly doubling for every 10 °C rise. */
  const o2Rate = (p) => RATE20 * p.mass * Math.pow(2, (p.temp - 20) / 10);   // mm³ min⁻¹
  /* Speed of the bead in mm min⁻¹ (positive = towards the seeds). */
  function beadSpeed(p, abs) {
    const o2 = o2Rate(p);
    const co2 = o2 * SUBS[p.sub].rq;
    // soda lime absorbs the CO2, so the gas volume falls by the O2 used;
    // with water the volume falls by (O2 used − CO2 released)
    return (abs === 'soda' ? o2 : o2 - co2) / AREA;
  }
  function clearResults(s) {
    s.state.res = { soda: null, water: null };
    s.state.run = null;
    s.state.pos = 0;
  }
  const moveText = (d) => (Math.abs(d) < 0.05 ? '0.0 mm' : Math.abs(d).toFixed(1) + ' mm ' + (d > 0 ? 'towards' : 'away from') + ' the seeds');

  Sim.create('#sim-bio-7a-respirometer', {
    title: 'A respirometer: oxygen uptake and RQ',
    alt: 'A boiling tube of germinating seeds in a water bath, connected to a capillary tube with a coloured bead and a millimetre scale.',
    height: (w) => (w >= 640 ? 390 : 400),
    controls: [
      { key: 'sub', type: 'select', label: 'Respiratory substrate', value: 'carb', options: [['carb', 'Carbohydrate'], ['protein', 'Protein'], ['lipid', 'Lipid'], ['anaer', 'Carbohydrate, some anaerobic']], onChange: clearResults },
      { key: 'abs', type: 'select', label: 'Below the gauze', value: 'soda', options: [['soda', 'Soda lime (absorbs CO₂)'], ['water', 'Water (CO₂ not absorbed)']], onChange: (s) => { s.state.run = null; s.state.pos = 0; } },
      { key: 'mass', label: 'Mass of seeds', min: 1, max: 10, step: 0.5, value: 5, unit: 'g', format: (v) => v.toFixed(1), onChange: clearResults },
      { key: 'temp', label: 'Water bath temperature', min: 10, max: 35, step: 1, value: 20, unit: '°C', format: (v) => v.toFixed(0), onChange: clearResults },
      { type: 'button', label: 'Start a 5-minute run', onClick: (s) => { if (!s.state.run) { s.state.pos = 0; s.state.run = { abs: s.p.abs, t: 0 }; } } },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => clearResults(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { run: null, pos: 0, res: { soda: null, water: null } }; },
    update(s, dt) {
      const st = s.state, r = st.run;
      if (!r) return;
      const v = beadSpeed(s.p, r.abs);
      const lim = v >= 0 ? TOWARD_MAX : -AWAY_MAX;
      const tEnd = Math.min(RUN, Math.abs(v) < 1e-9 ? Infinity : lim / v);
      r.t = Math.min(tEnd, r.t + dt / SEC_PER_MIN);
      st.pos = v * r.t;
      if (r.t >= tEnd - 1e-9) {
        st.res[r.abs] = { d: st.pos, t: r.t, early: tEnd < RUN - 1e-9 };
        st.run = null;
      }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const narrow = w < 640;
      const fs = narrow ? 11.5 : 12.5;
      const tubeW = narrow ? 50 : 62, tubeX = narrow ? 22 : 40;
      const tcx = tubeX + tubeW / 2;
      const bungTop = 92, bungBot = 112, tubeBot = 250;
      const capY = 48;
      const x0 = tcx + 16, x1 = w - 18;
      const k = (x1 - x0) / CAP;
      const X = (mm) => x0 + mm * k;

      /* water bath */
      Sim.rect(ctx, tubeX - 14, 140, tubeW + 28, tubeBot - 140 + 12, { fill: 'rgba(77,171,247,0.16)', stroke: '#74c0fc', width: 1.5, r: 6 });
      Sim.text(ctx, 'water bath ' + p.temp.toFixed(0) + ' °C', Math.max(tcx, 58), tubeBot + 26, { size: fs, color: '#1971c2', align: 'center', bold: true });

      /* tube contents */
      const absTop = tubeBot - 40, gauzeY = absTop - 8;
      if (p.abs === 'soda') {
        Sim.rect(ctx, tubeX + 3, absTop, tubeW - 6, tubeBot - absTop - 3, { fill: '#f1f3f5', r: 6 });
        for (let i = 0; i < 26; i++) {
          const gx = tubeX + 8 + ((i * 37) % (tubeW - 16));
          const gy = absTop + 6 + ((i * 13) % 28);
          Sim.circle(ctx, gx, gy, 3.2, { fill: '#fff', stroke: '#adb5bd', width: 1 });
        }
      } else {
        Sim.rect(ctx, tubeX + 3, absTop, tubeW - 6, tubeBot - absTop - 3, { fill: 'rgba(77,171,247,0.35)', r: 6 });
      }
      // gauze platform
      Sim.line(ctx, tubeX + 3, gauzeY, tubeX + tubeW - 3, gauzeY, { color: C.grey, width: 2, dash: [3, 3] });
      // germinating seeds on the gauze
      const nSeeds = Math.round(3 + p.mass * 1.5);
      const perRow = Math.max(3, Math.floor((tubeW - 8) / 12));
      for (let i = 0; i < nSeeds; i++) {
        const row = Math.floor(i / perRow), col = i % perRow;
        const sx = tubeX + 9 + col * ((tubeW - 18) / (perRow - 1)) + (row % 2 ? 4 : 0);
        const sy = gauzeY - 6 - row * 9;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(Math.min(sx, tubeX + tubeW - 8), sy, 5.5, 4.2, 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#d8b26e';
        ctx.fill();
        ctx.strokeStyle = '#a07a3c';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
      // glass tube
      ctx.save();
      ctx.strokeStyle = C.axis;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(tubeX, bungBot - 6);
      ctx.lineTo(tubeX, tubeBot - tubeW / 2);
      ctx.arc(tcx, tubeBot - tubeW / 2, tubeW / 2, Math.PI, 0, true);
      ctx.lineTo(tubeX + tubeW, bungBot - 6);
      ctx.stroke();
      ctx.restore();
      // bung
      Sim.rect(ctx, tubeX - 3, bungTop, tubeW + 6, bungBot - bungTop, { fill: '#495057', r: 3 });

      /* capillary tube */
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#ced4da';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(tcx, bungTop + 6);
      ctx.lineTo(tcx, capY + 10);
      ctx.quadraticCurveTo(tcx, capY, tcx + 10, capY);
      ctx.lineTo(x1 + 8, capY);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3.5;
      ctx.stroke();
      ctx.restore();
      // the coloured bead
      const bx = X(START - st.pos);
      Sim.line(ctx, bx - 5 * k, capY, bx + 5 * k, capY, { color: C.red, width: 4, cap: 'butt' });

      /* millimetre scale under the capillary */
      const ry = capY + 9;
      Sim.rect(ctx, X(8), ry, X(CAP - 2) - X(8), 22, { fill: '#fff9db', stroke: '#e9c46a', width: 1 });
      const labStep = k * 10 < 16 ? 40 : k * 10 < 30 ? 20 : 10;
      for (let mm = 10; mm <= CAP - 4; mm += 5) {
        const xx = X(mm);
        const major = mm % 10 === 0;
        Sim.line(ctx, xx, ry, xx, ry + (major ? 8 : 4), { color: '#7c6a2a', width: 1, cap: 'butt' });
        const rel = Math.abs(mm - START);
        if (major && rel % labStep === 0) Sim.text(ctx, String(rel), xx, ry + 15, { size: 10, color: '#7c6a2a', align: 'center' });
      }
      Sim.text(ctx, 'distance from start (0) / mm', X(CAP - 2), ry + 34, { size: 11, color: C.muted, align: 'right' });
      Sim.text(ctx, narrow ? 'capillary tube, bore ' + BORE.toFixed(1) + ' mm' : 'capillary tube, bore ' + BORE.toFixed(1) + ' mm, with a coloured liquid bead', x0 + 4, 14, { size: 11, color: C.muted });

      /* labels for the tube */
      const lx = tubeX + tubeW + 26;
      const lab = (txt, ly, tx, ty) => {
        Sim.line(ctx, tx, ty, lx - 4, ly, { color: C.grey, width: 1 });
        Sim.text(ctx, txt, lx, ly, { size: fs, color: C.ink });
      };
      lab('rubber bung', (bungTop + bungBot) / 2, tubeX + tubeW + 3, (bungTop + bungBot) / 2);
      lab('germinating seeds (' + p.mass.toFixed(1) + ' g)', gauzeY - 22, tubeX + tubeW - 8, gauzeY - 8);
      lab('wire gauze', gauzeY + 2, tubeX + tubeW - 2, gauzeY);
      lab(p.abs === 'soda' ? 'soda lime: absorbs CO₂' : 'water: CO₂ not absorbed', absTop + 26, tubeX + tubeW - 6, absTop + 16);

      /* status line */
      const r = st.run;
      const sy = 120;
      let msg, col = C.muted;
      if (r) {
        msg = 'Running: ' + r.t.toFixed(1) + ' min of ' + RUN + ' min';
        col = C.navy;
        const v = beadSpeed(p, r.abs);
        if (Math.abs(v) > 1e-6) {
          const ax = X(START - st.pos);
          Sim.arrow(ctx, ax + (v > 0 ? 18 : -18), capY - 16, ax + (v > 0 ? -18 : 18), capY - 16, { color: C.red, width: 2, head: 8 });
        }
      } else if (st.res[p.abs]) {
        const q = st.res[p.abs];
        msg = q.early ? 'The bead reached the end of the scale after ' + q.t.toFixed(1) + ' min.' : 'Run finished after ' + RUN + ' min.';
      } else msg = 'Press “Start a 5-minute run”.';
      const msgX = Math.max(lx, x0 + 40);
      wrapText(ctx, msg, w - msgX - 12, { size: fs }).forEach((ln, i) => Sim.text(ctx, ln, msgX, sy + 26 + i * 16, { size: fs, color: col, italic: !r }));

      /* results table */
      const ty0 = 306;
      Sim.line(ctx, 12, ty0 - 14, w - 12, ty0 - 14, { color: C.light, width: 1 });
      Sim.text(ctx, 'Results at ' + p.temp.toFixed(0) + ' °C with ' + p.mass.toFixed(1) + ' g of seeds', 16, ty0 + 2, { size: fs, bold: true, color: C.navy });
      const x = st.res.soda, y = st.res.water;
      const rowTxt = (q, sym, name) => name + ': ' + (q ? sym + ' = ' + (q.d >= 0 ? '' : '−') + Math.abs(q.d).toFixed(1) + ' mm in ' + q.t.toFixed(1) + ' min' : 'not run yet');
      Sim.text(ctx, rowTxt(x, 'x', narrow ? 'Soda lime' : 'Soda lime run (O₂ used)'), 16, ty0 + 22, { size: fs, color: x ? C.ink : C.muted });
      Sim.text(ctx, rowTxt(y, 'y', narrow ? 'Water' : 'Water run (O₂ used − CO₂ made)'), 16, ty0 + 40, { size: fs, color: y ? C.ink : C.muted });
      let rq;
      if (x && y && x.d > 0) {
        const same = Math.abs(x.t - y.t) < 1e-6;
        const rx = x.d / x.t, ry2 = y.d / y.t;
        const val = ((rx - ry2) / rx).toFixed(2);
        rq = same ? 'RQ = (x − y) ÷ x = (' + x.d.toFixed(1) + ' − ' + (y.d < 0 ? '(−' + Math.abs(y.d).toFixed(1) + ')' : y.d.toFixed(1)) + ') ÷ ' + x.d.toFixed(1) + ' = ' + val
          : 'Runs of different length, so use rates: RQ = (x/t₁ − y/t₂) ÷ (x/t₁) = ' + val;
      } else rq = 'Do one run with soda lime and one with water to find the RQ.';
      wrapText(ctx, rq, w - 32, { size: fs, bold: !!(x && y) }).forEach((ln, i) => Sim.text(ctx, ln, 16, ty0 + 60 + i * 16, { size: fs, bold: !!(x && y), color: x && y ? C.green : C.muted }));
    },
    readout(s) {
      const st = s.state, p = s.p;
      const r = st.run;
      const t = r ? r.t : st.res[p.abs] ? st.res[p.abs].t : 0;
      const out = [
        ['time =', t.toFixed(1) + ' min'],
        ['bead moved', moveText(st.pos)],
        ['volume change = πr²x =', (Math.abs(st.pos) * AREA).toFixed(1) + ' mm³']
      ];
      const x = st.res.soda;
      if (x && x.t > 0) out.push(['rate of O₂ uptake =', Sim.fmt((x.d * AREA) / (x.t * p.mass), 3) + ' mm³ g⁻¹ min⁻¹', true]);
      return out;
    }
  });

  /* ======================================================================
     2. The electron transport chain and chemiosmosis
     ====================================================================== */
  const N0 = 4;            // H⁺ left in the intermembrane space when there is no gradient
  const NAD_EVERY = 1.0;   // a reduced NAD arrives about once a second
  const HOLD = 0.3;        // time an electron pair spends on each carrier / s
  const HOP = 0.4;         // time to move between carriers / s
  const PUMP_T = 0.7;      // time for a pumped H⁺ to cross the membrane / s
  const SYN_T = 0.9;       // time for an H⁺ to flow through ATP synthase / s
  const K_SYN = 0.32;      // flow through ATP synthase per s per H⁺ of gradient
  const rnd = (a, b) => a + Math.random() * (b - a);

  function etcLayout(s) {
    const { w, h } = s;
    const narrow = w < 640;
    const mY = Math.round(h * 0.42);
    const half = 15;
    return {
      narrow, mY, half,
      ims: { x0: 10, x1: w - 10, y0: 30, y1: mY - half - 6 },
      mat: { x0: 10, x1: w - 10, y0: mY + half + 6, y1: h - 40 },
      c: [w * 0.15, w * 0.33, w * 0.51],
      ox: w * 0.64,
      sx: w * 0.84,
      cw: narrow ? 28 : 36,
      dockY: mY + 62
    };
  }
  /* Positions in the intermembrane space are stored as fractions (u, v) of its box. */
  const imsXY = (L, u, v) => [L.ims.x0 + u * (L.ims.x1 - L.ims.x0), L.ims.y0 + v * (L.ims.y1 - L.ims.y0)];
  const slotXY = (L, i) => (i < 0 ? [L.c[0], L.dockY - 12] : i >= 3 ? [L.ox, L.dockY - 8] : [L.c[i], L.mY]);

  Sim.create('#sim-bio-7a-etc', {
    title: 'The electron transport chain and chemiosmosis',
    alt: 'Inner mitochondrial membrane with three electron carriers pumping hydrogen ions into the intermembrane space and ATP synthase letting them flow back to make ATP.',
    height: (w) => (w >= 640 ? 360 : 400),
    controls: [
      { key: 'o2', type: 'check', label: 'Oxygen available', value: true }
    ],
    animate: true,
    init(s) {
      const st = {
        slots: [null, null, null], hops: [], hp: [], fly: [], mat: [],
        nadT: 0.6, synAcc: 0, synCount: 0, atp: 0, water: 0, nad: 0, flashes: []
      };
      for (let i = 0; i < N0 + 9; i++) st.hp.push({ u: rnd(0.03, 0.97), v: rnd(0.15, 0.95) });
      for (let i = 0; i < N0; i++) st.mat.push({ u: rnd(0.05, 0.95), v: rnd(0.1, 0.9) });
      s.state = st;
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      const busy = (i) => st.slots[i] !== null || st.hops.some((e) => e.to === i);
      /* reduced NAD hands over its electrons and is reoxidised to NAD⁺ */
      st.nadT += dt;
      if (st.nadT >= NAD_EVERY && !busy(0)) {
        st.nadT = 0;
        st.hops.push({ from: -1, to: 0, prog: 0 });
        st.nad++;
        st.flashes.push({ kind: 'nad', t: 0 });
      }
      /* electron pairs move from carrier to carrier */
      for (let i = 2; i >= 0; i--) {
        const e = st.slots[i];
        if (!e) continue;
        e.held += dt;
        if (e.held < HOLD) continue;
        const next = i + 1;
        const canMove = next < 3 ? !busy(next) : p.o2;
        if (canMove) {
          st.slots[i] = null;
          st.hops.push({ from: i, to: next, prog: 0 });
          // energy released as the electrons leave this carrier pumps H⁺ out of the matrix
          st.fly.push({ kind: 'pump', k: i, prog: 0, u: rnd(0.03, 0.97), v: rnd(0.15, 0.95) });
        }
      }
      st.hops = st.hops.filter((e) => {
        e.prog += dt / HOP;
        if (e.prog < 1) return true;
        if (e.to < 3) st.slots[e.to] = { held: 0 };
        else { st.water++; st.flashes.push({ kind: 'water', t: 0 }); }
        return false;
      });
      /* H⁺ diffuse back through ATP synthase, down their gradient */
      const grad = st.hp.length - N0;
      if (grad > 0) st.synAcc += K_SYN * grad * dt; else st.synAcc = 0;
      while (st.synAcc >= 1 && st.hp.length > N0) {
        st.synAcc -= 1;
        let best = 0;
        st.hp.forEach((q, i) => { if (q.u > st.hp[best].u) best = i; });
        const q = st.hp.splice(best, 1)[0];
        st.fly.push({ kind: 'syn', prog: 0, u: q.u, v: q.v });
      }
      st.fly = st.fly.filter((f) => {
        f.prog += dt / (f.kind === 'pump' ? PUMP_T : SYN_T);
        if (f.prog < 1) return true;
        if (f.kind === 'pump') st.hp.push({ u: f.u, v: f.v });
        else {
          st.synCount++;
          if (st.synCount % 3 === 0) { st.atp++; st.flashes.push({ kind: 'atp', t: 0 }); }
        }
        return false;
      });
      /* random movement of the ions */
      const jig = (q, lo) => {
        q.u = clamp(q.u + (Math.random() - 0.5) * dt * 0.35, 0.02, 0.98);
        q.v = clamp(q.v + (Math.random() - 0.5) * dt * 0.5, lo, 0.97);
      };
      st.hp.forEach((q) => jig(q, 0.12));
      st.mat.forEach((q) => jig(q, 0.03));
      st.flashes = st.flashes.filter((f) => (f.t += dt) < 1.2);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const L = etcLayout(s);
      const fs = L.narrow ? 11 : 12.5;
      /* compartments */
      Sim.rect(ctx, 0, 0, w, L.mY - L.half, { fill: '#fff4e6' });
      Sim.rect(ctx, 0, L.mY + L.half, w, h - L.mY - L.half, { fill: '#edf2ff' });
      Sim.text(ctx, 'intermembrane space', 12, 14, { size: fs, bold: true, color: '#b35c00' });
      Sim.text(ctx, 'matrix', 12, h - 14, { size: fs, bold: true, color: '#3b5bdb' });
      /* membrane */
      Sim.rect(ctx, 0, L.mY - L.half, w, L.half * 2, { fill: '#fff3bf' });
      for (let x = 4; x < w; x += 9) {
        Sim.circle(ctx, x, L.mY - L.half + 3, 3, { fill: '#e9c46a' });
        Sim.circle(ctx, x, L.mY + L.half - 3, 3, { fill: '#e9c46a' });
      }
      if (!L.narrow) Sim.text(ctx, 'inner mitochondrial membrane', w - 12, L.mY - L.half - 10, { size: 11, color: '#8d6e00', align: 'right' });
      Sim.circle(ctx, w - 62, 14, 6, { fill: C.red });
      Sim.text(ctx, '+', w - 62, 14.5, { size: 11, bold: true, color: '#fff', align: 'center' });
      Sim.text(ctx, '= H⁺ ion', w - 52, 14, { size: 11.5, color: C.ink });

      /* electron path */
      Sim.line(ctx, L.c[0], L.mY, L.c[2], L.mY, { color: '#f59f00', width: 1.5, dash: [4, 4] });
      Sim.line(ctx, L.c[2], L.mY, L.ox, L.dockY - 8, { color: '#f59f00', width: 1.5, dash: [4, 4] });
      /* carriers */
      L.c.forEach((cx, i) => {
        const red = st.slots[i] !== null;
        Sim.rect(ctx, cx - L.cw / 2, L.mY - 27, L.cw, 54, { fill: red ? '#ffe066' : '#96f2d7', stroke: red ? '#f08c00' : C.teal, width: 2, r: 8 });
        Sim.text(ctx, String(i + 1), cx, L.mY + 1, { size: 12, bold: true, color: '#0b7285', align: 'center' });
      });
      Sim.text(ctx, 'electron carriers', (L.c[0] + L.c[2]) / 2, L.mY + 40, { size: fs, color: '#0b7285', align: 'center', bold: true });

      /* reduced NAD arriving */
      const dx = Math.max(L.c[0], L.narrow ? 38 : 50);
      Sim.rect(ctx, dx - 36, L.dockY - 2, 72, 22, { fill: '#e5dbff', stroke: C.purple, width: 1.5, r: 11 });
      Sim.text(ctx, 'reduced NAD', dx, L.dockY + 9, { size: 11, bold: true, color: C.purple, align: 'center' });
      /* oxygen, the final electron acceptor */
      if (p.o2) {
        Sim.circle(ctx, L.ox, L.dockY + 4, 14, { fill: '#d0ebff', stroke: C.blue, width: 1.5 });
        Sim.text(ctx, 'O₂', L.ox, L.dockY + 4, { size: 12, bold: true, color: C.blue, align: 'center' });
        Sim.text(ctx, L.narrow ? '→ H₂O' : '+ H⁺ + e⁻ → H₂O', L.ox + 18, L.dockY + 4, { size: 11.5, color: C.blue });
      } else {
        Sim.circle(ctx, L.ox, L.dockY + 4, 14, { fill: '#fff5f5', stroke: C.red, width: 1.5, dash: [3, 3] });
        Sim.text(ctx, 'no O₂', L.ox, L.dockY + 4, { size: 10.5, bold: true, color: C.red, align: 'center' });
      }

      /* ATP synthase */
      const sx = L.sx;
      Sim.rect(ctx, sx - 12, L.mY - 30, 24, 60, { fill: '#ffc9c9', stroke: C.red, width: 2, r: 6 });
      Sim.rect(ctx, sx - 3, L.mY - 26, 6, 52, { fill: '#fff' });
      Sim.line(ctx, sx, L.mY + 30, sx, L.mY + 40, { color: C.red, width: 5, cap: 'butt' });
      Sim.circle(ctx, sx, L.mY + 56, 18, { fill: '#ffc9c9', stroke: C.red, width: 2 });
      Sim.text(ctx, 'ATP synthase', sx, L.mY + 88, { size: fs, bold: true, color: '#c92a2a', align: 'center' });
      if (!L.narrow) Sim.text(ctx, 'ADP + Pᵢ → ATP', sx, L.mY + 104, { size: 11, color: '#c92a2a', align: 'center' });

      /* H⁺ ions */
      const hDot = (x, y, alpha) => {
        ctx.save();
        if (alpha != null) ctx.globalAlpha = alpha;
        Sim.circle(ctx, x, y, 6, { fill: C.red });
        Sim.text(ctx, '+', x, y + 0.5, { size: 11, bold: true, color: '#fff', align: 'center' });
        ctx.restore();
      };
      st.hp.forEach((q) => { const [x, y] = imsXY(L, q.u, q.v); hDot(x, y); });
      // a few H⁺ in the matrix: far fewer than in the intermembrane space while the gradient lasts
      st.mat.forEach((q) => hDot(w * (0.05 + q.u * 0.5), L.dockY + 34 + q.v * 36));
      st.fly.forEach((f) => {
        let x, y;
        if (f.kind === 'pump') {
          const cx = L.c[f.k] + L.cw / 2 - 6;
          const [tx, ty] = imsXY(L, f.u, f.v);
          if (f.prog < 0.6) { const a = f.prog / 0.6; x = cx; y = L.mY + 40 - a * 80; }
          else { const a = (f.prog - 0.6) / 0.4; x = Sim.lerp(cx, tx, a); y = Sim.lerp(L.mY - 40, ty, a); }
        } else {
          const [fx, fy] = imsXY(L, f.u, f.v);
          if (f.prog < 0.4) { const a = f.prog / 0.4; x = Sim.lerp(fx, sx, a); y = Sim.lerp(fy, L.mY - 36, a); }
          else { const a = (f.prog - 0.4) / 0.6; x = sx; y = L.mY - 36 + a * 76; }
        }
        hDot(x, y, f.kind === 'syn' && f.prog > 0.85 ? (1 - f.prog) / 0.15 : null);
      });

      /* electron pairs */
      const eDot = (x, y) => {
        Sim.circle(ctx, x, y, 7.5, { fill: '#ffd43b', stroke: '#e67700', width: 1.5 });
        Sim.text(ctx, 'e⁻', x, y + 0.5, { size: 9.5, bold: true, color: '#7a4b00', align: 'center' });
      };
      st.slots.forEach((e, i) => { if (e) eDot(L.c[i], L.mY - 14); });
      st.hops.forEach((e) => {
        const a = slotXY(L, e.from), b = slotXY(L, e.to);
        const ya = e.from < 0 ? a[1] : a[1] - 14, yb = e.to < 3 ? b[1] - 14 : b[1];
        eDot(Sim.lerp(a[0], b[0], e.prog), Sim.lerp(ya, yb, e.prog));
      });

      /* flashes */
      st.flashes.forEach((f) => {
        const a = 1 - f.t / 1.2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, a);
        if (f.kind === 'atp') Sim.text(ctx, 'ATP', sx + 26, L.mY + 56 - f.t * 18, { size: 14, bold: true, color: '#c92a2a' });
        if (f.kind === 'nad') Sim.text(ctx, 'NAD⁺', dx + 40, L.dockY + 9 + f.t * 10, { size: 12, bold: true, color: C.purple });
        if (f.kind === 'water') Sim.text(ctx, 'H₂O', L.ox, L.dockY + 26 + f.t * 12, { size: 12, bold: true, color: C.blue, align: 'center' });
        ctx.restore();
      });

      /* status */
      const full = st.slots.every((e) => e !== null);
      let msg, col;
      if (!p.o2 && full) { msg = 'No final electron acceptor: every carrier stays reduced, so electrons stop flowing and no more H⁺ are pumped.'; col = C.red; }
      else if (!p.o2) { msg = 'Oxygen removed: electrons are backing up along the chain…'; col = C.orange; }
      else { msg = 'Oxygen accepts the electrons at the end of the chain, so they keep flowing and H⁺ keep being pumped.'; col = C.green; }
      const lines = wrapText(ctx, msg, w * (L.narrow ? 0.62 : 0.6), { size: fs });
      lines.forEach((ln, i) => Sim.text(ctx, ln, L.narrow ? 70 : 90, h - 14 - (lines.length - 1 - i) * 15, { size: fs, color: col, bold: true }));
    },
    readout(s) {
      const st = s.state, p = s.p;
      const g = st.hp.length - N0;
      const grad = g >= 6 ? 'steep' : g >= 2 ? 'falling' : 'almost none';
      return [
        ['oxygen:', p.o2 ? 'present' : 'absent'],
        ['H⁺ gradient:', grad, true],
        ['ATP made:', String(st.atp)],
        ['water formed:', String(st.water)],
        ['reduced NAD reoxidised to NAD⁺:', String(st.nad)]
      ];
    }
  });
})();
