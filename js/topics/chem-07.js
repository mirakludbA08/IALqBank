/* Topic 7: Intermolecular forces — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const SUBD = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const SUPC = { '⁺': '+', '⁻': '−' };

  /* Canvas text with real subscripts (Unicode subscript digits) and raised charges. */
  function runsOf(str) {
    const runs = [];
    for (const ch of String(str)) {
      const k = SUBD.indexOf(ch) >= 0 ? 1 : SUPC[ch] ? 2 : 0;
      const t = k === 1 ? String(SUBD.indexOf(ch)) : k === 2 ? SUPC[ch] : ch;
      if (runs.length && runs[runs.length - 1][1] === k) runs[runs.length - 1][0] += t;
      else runs.push([t, k]);
    }
    return runs;
  }
  const fontOf = (o, k) => (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + (k ? (o.size || 14) * 0.72 : (o.size || 14)) + 'px ' + Sim.font;
  function cwidth(ctx, str, o) {
    o = o || {};
    ctx.save();
    let w = 0;
    runsOf(str).forEach(([t, k]) => { ctx.font = fontOf(o, k); w += ctx.measureText(t).width; });
    ctx.restore();
    return w;
  }
  function ctext(ctx, str, x, y, o) {
    o = o || {};
    const size = o.size || 14;
    const total = cwidth(ctx, str, o);
    let x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    if (o.bg) Sim.rect(ctx, x0 - 5, y - size / 2 - 5, total + 10, size + 10, { fill: o.bg, r: 5, stroke: o.border, width: 1 });
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = o.color || C.ink;
    runsOf(str).forEach(([t, k]) => {
      ctx.font = fontOf(o, k);
      ctx.fillText(t, x0, y + (k === 1 ? size * 0.28 : k === 2 ? -size * 0.34 : 0));
      x0 += ctx.measureText(t).width;
    });
    ctx.restore();
    return total;
  }

  /* ======================================================================
     1. London forces: an instantaneous dipole induces dipoles next door
     ====================================================================== */
  const PART = {
    He: { lab: 'He', fam: 'noble', e: 2, r: 20, bp: 4 },
    Ne: { lab: 'Ne', fam: 'noble', e: 10, r: 25, bp: 27 },
    Ar: { lab: 'Ar', fam: 'noble', e: 18, r: 33, bp: 87 },
    Kr: { lab: 'Kr', fam: 'noble', e: 36, r: 38, bp: 120 },
    Xe: { lab: 'Xe', fam: 'noble', e: 54, r: 44, bp: 165 },
    F2: { lab: 'F₂', fam: 'hal', e: 18, r: 22, bp: 85, di: true },
    Cl2: { lab: 'Cl₂', fam: 'hal', e: 34, r: 28, bp: 239, di: true },
    Br2: { lab: 'Br₂', fam: 'hal', e: 70, r: 32, bp: 332, di: true },
    I2: { lab: 'I₂', fam: 'hal', e: 106, r: 37, bp: 457, di: true }
  };
  const ORDER = { noble: ['He', 'Ne', 'Ar', 'Kr', 'Xe'], hal: ['F2', 'Cl2', 'Br2', 'I2'] };
  const polar = (q) => Math.min(1, 0.18 + 0.82 * Math.pow(q.e / 106, 0.6));   // how easily the cloud distorts (0–1)
  function gauss() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function drawParticle(ctx, q, x, y, scale, off) {
    /* off: displacement of the electron cloud along x, as a fraction of the radius (−1..1) */
    const r = q.r * scale;
    const d = q.di ? r * 0.85 : 0;
    const dx = off * r * 0.42;
    const lobe = (cx) => {
      const g = ctx.createRadialGradient(cx + dx, y, r * 0.1, cx + dx, y, r * 1.08);
      g.addColorStop(0, 'rgba(77,171,247,0.62)');
      g.addColorStop(0.7, 'rgba(77,171,247,0.30)');
      g.addColorStop(1, 'rgba(77,171,247,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx + dx, y, r * (1 + Math.abs(off) * 0.12), r * (1 - Math.abs(off) * 0.06), 0, 0, Math.PI * 2);
      ctx.fill();
    };
    if (q.di) { lobe(x - d / 2); lobe(x + d / 2); } else lobe(x);
    const nuc = Math.max(3, r * 0.14);
    if (q.di) { Sim.circle(ctx, x - d / 2, y, nuc, { fill: '#c92a2a' }); Sim.circle(ctx, x + d / 2, y, nuc, { fill: '#c92a2a' }); }
    else Sim.circle(ctx, x, y, nuc, { fill: '#c92a2a' });
    /* partial charges once the dipole is noticeable */
    const a = Math.abs(off);
    if (a > 0.18) {
      const half = (q.di ? d / 2 : 0) + r * 0.95;
      const neg = off > 0 ? 1 : -1;
      const sz = 11 + 8 * clamp((a - 0.18) / 0.6, 0, 1);
      ctext(ctx, 'δ−', x + neg * half, y - r * 0.95 - 6, { size: sz, bold: true, color: C.red, align: 'center' });
      ctext(ctx, 'δ+', x - neg * half, y - r * 0.95 - 6, { size: sz, bold: true, color: C.blue, align: 'center' });
    }
  }

  Sim.create('#sim-chem-07-london', {
    title: 'London forces: instantaneous and induced dipoles',
    height: (w) => (w >= 700 ? 330 : 520),
    controls: [
      { key: 'sp', type: 'select', label: 'Particles', value: 'Ar', options: [['He', 'helium, He'], ['Ne', 'neon, Ne'], ['Ar', 'argon, Ar'], ['Kr', 'krypton, Kr'], ['Xe', 'xenon, Xe'], ['F2', 'fluorine, F₂'], ['Cl2', 'chlorine, Cl₂'], ['Br2', 'bromine, Br₂'], ['I2', 'iodine, I₂']] },
      { key: 'slow', type: 'check', label: 'Slow motion', value: false }
    ],
    animate: true,
    init(s) { s.state = { a: 0, b: 0, c: 0, va: 0, hist: [] }; },
    update(s, dt) {
      const st = s.state;
      if (s.p.slow) dt *= 0.25;
      const q = PART[s.p.sp];
      const k = polar(q);
      /* A: random fluctuation (a smoothed random walk pulled back to zero) */
      st.va += (-st.va * 6 - st.a * 30) * dt + gauss() * 9 * Math.sqrt(dt);
      st.a += st.va * dt;
      st.a = clamp(st.a, -1, 1);
      /* B and C follow, each a little weaker and a little later */
      const tau = 0.06;
      st.b += ((k * 0.9 * st.a) - st.b) * Math.min(1, dt / tau);
      st.c += ((k * 0.9 * st.b) - st.c) * Math.min(1, dt / tau);
      st.hist.push(st.a * st.b);
      if (st.hist.length > 240) st.hist.shift();
    },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const q = PART[s.p.sp];
      const k = polar(q);
      const wide = w >= 700;
      const vw = wide ? w * 0.64 : w;
      const scale = Math.min(1.4, (vw - 56) / 320);
      const y = wide ? h * 0.48 : 150;
      const gap = (q.di ? 2.9 : 2.25) * q.r * scale + 18;
      const xs = [vw / 2 - gap, vw / 2, vw / 2 + gap];
      const offs = [st.a * k, st.b, st.c];
      /* attraction between facing δ− and δ+ */
      for (let i = 0; i < 2; i++) {
        const f = offs[i] * offs[i + 1];
        if (f > 0.02) {
          const x1 = xs[i] + (q.di ? 1.4 : 1) * q.r * scale, x2 = xs[i + 1] - (q.di ? 1.4 : 1) * q.r * scale;
          Sim.line(ctx, x1, y, x2, y, { color: 'rgba(47,158,68,' + clamp(f * 3, 0.2, 0.9).toFixed(2) + ')', width: 2 + 6 * clamp(f * 2, 0, 1), dash: [4, 4] });
        }
      }
      xs.forEach((x, i) => drawParticle(ctx, q, x, y, scale, offs[i]));
      const lab = ['instantaneous', 'induced', 'induced'];
      const ly = y + (q.di ? 1.25 : 1.2) * 44 * scale + 18;
      xs.forEach((x, i) => {
        ctext(ctx, lab[i], x, ly, { size: 12, color: i ? C.purple : C.navy, align: 'center', bold: !i });
        ctext(ctx, 'dipole', x, ly + 15, { size: 12, color: i ? C.purple : C.navy, align: 'center', bold: !i });
      });
      ctext(ctx, q.lab + ': ' + q.e + ' electrons per particle', vw / 2, 20, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      if (vw >= 520) ctext(ctx, 'green dashes: attraction between δ− on one particle and δ+ on the next', vw / 2, wide ? h - 16 : 300, { size: 11.5, italic: true, color: C.muted, align: 'center' });
      else { ctext(ctx, 'green dashes: attraction between δ− on', vw / 2, 286, { size: 11.5, italic: true, color: C.muted, align: 'center' }); ctext(ctx, 'one particle and δ+ on the next', vw / 2, 302, { size: 11.5, italic: true, color: C.muted, align: 'center' }); }

      /* boiling temperatures of the family */
      const fam = ORDER[q.fam];
      const bx = wide ? vw + 14 : 40, by = wide ? 40 : 340, bw = wide ? w - vw - 30 : w - 60, bh = wide ? h - 92 : 140;
      const maxBp = q.fam === 'noble' ? 200 : 500;
      ctext(ctx, 'boiling temperature / K', bx + bw / 2, by - 18, { size: 12, bold: true, color: C.ink, align: 'center' });
      Sim.line(ctx, bx, by + bh, bx + bw, by + bh, { color: C.axis, width: 1.5 });
      const slot = bw / fam.length;
      fam.forEach((key, i) => {
        const p = PART[key];
        const bhh = bh * p.bp / maxBp;
        const x = bx + i * slot + slot * 0.18;
        const sel = key === s.p.sp;
        Sim.rect(ctx, x, by + bh - bhh, slot * 0.64, bhh, { fill: sel ? C.blue : '#a5d8ff', r: 3 });
        ctext(ctx, String(p.bp), x + slot * 0.32, by + bh - bhh - 9, { size: 11.5, bold: sel, color: sel ? C.blue : C.muted, align: 'center' });
        ctext(ctx, p.lab, x + slot * 0.32, by + bh + 13, { size: 12.5, bold: sel, color: C.ink, align: 'center' });
      });
    },
    readout: (s) => {
      const q = PART[s.p.sp];
      return [
        ['Electrons', String(q.e)],
        ['Boiling temperature', q.bp + ' K (' + String(q.bp - 273).replace('-', '−') + ' °C)', true],
        ['State at 25 °C', q.bp < 298 ? 'gas' : q.lab === 'I₂' ? 'solid' : 'liquid']
      ];
    }
  });

  /* ======================================================================
     2. Boiling temperatures of the hydrides of groups 14 to 17
     ====================================================================== */
  const HYD = {
    14: { col: C.grey, name: 'group 14', m: [['CH₄', 112, 'L'], ['SiH₄', 161, 'L'], ['GeH₄', 185, 'L'], ['SnH₄', 221, 'L']] },
    15: { col: C.blue, name: 'group 15', m: [['NH₃', 240, 'LDH'], ['PH₃', 185, 'LD'], ['AsH₃', 211, 'LD'], ['SbH₃', 256, 'LD']] },
    16: { col: C.red, name: 'group 16', m: [['H₂O', 373, 'LDH'], ['H₂S', 213, 'LD'], ['H₂Se', 232, 'LD'], ['H₂Te', 271, 'LD']] },
    17: { col: C.green, name: 'group 17', m: [['HF', 293, 'LDH'], ['HCl', 188, 'LD'], ['HBr', 206, 'LD'], ['HI', 238, 'LD']] }
  };
  const ELEC = [10, 18, 36, 54];
  /* where each label sits relative to its point: [dx, dy, align] */
  const LAB = { 'PH₃': [9, 13, 'left'], 'SiH₄': [9, 12, 'left'], 'HBr': [9, 12, 'left'], 'GeH₄': [9, 12, 'left'], 'H₂S': [9, -11, 'left'], 'HCl': [-9, 13, 'right'] };
  const html = (t) => String(t).replace(/[₀-₉]+/g, (m) => '<sub>' + m.split('').map((c) => SUBD.indexOf(c)).join('') + '</sub>');
  function fit(pts) {
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; });
    const m = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    return { m, c: (sy - m * sx) / n };
  }
  function hydGeom(s) {
    const { w, h } = s;
    const wide = w >= 640;
    const gb = { x: 62, y: 26, w: (wide ? w * 0.66 : w) - 84, h: h - 84 - (wide ? 0 : 150) };
    return { wide, gb, g: Sim.graph(s.ctx, Object.assign({ xmin: 1.6, xmax: 5.4, ymin: 50, ymax: 400 }, gb)) };
  }
  function hydPoints(s) {
    const { g } = hydGeom(s);
    const pts = [];
    [14, 15, 16, 17].forEach((grp) => {
      if (!s.p['g' + grp]) return;
      HYD[grp].m.forEach((m, i) => pts.push({ grp, i, m, x: g.px(i + 2), y: g.py(m[1]) }));
    });
    return pts;
  }

  Sim.create('#sim-chem-07-hydrides', {
    title: 'Boiling temperatures of the hydrides of groups 14–17',
    height: (w) => (w >= 640 ? 420 : 560),
    controls: [
      { key: 'g14', type: 'check', label: 'Group 14', value: true },
      { key: 'g15', type: 'check', label: 'Group 15', value: true },
      { key: 'g16', type: 'check', label: 'Group 16', value: true },
      { key: 'g17', type: 'check', label: 'Group 17', value: true },
      { key: 'trend', type: 'check', label: 'Show the trend expected without hydrogen bonds', value: false }
    ],
    init(s) { s.state = { pick: { grp: 16, i: 0 } }; },
    pointer: {
      move(s, pt) {
        let best = null, bd = 22;
        hydPoints(s).forEach((p) => { const d = Math.hypot(p.x - pt.x, p.y - pt.y); if (d < bd) { bd = d; best = p; } });
        if (best) s.state.pick = { grp: best.grp, i: best.i };
      },
      down(s, pt) { this.move(s, pt); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const { wide, gb, g } = hydGeom(s);
      /* axes by hand: x is the period */
      Sim.rect(ctx, gb.x, gb.y, gb.w, gb.h, { fill: '#fff' });
      for (let t = 50; t <= 400; t += 50) {
        const Y = g.py(t);
        Sim.line(ctx, gb.x, Y, gb.x + gb.w, Y, { color: C.grid, width: 1 });
        ctext(ctx, String(t), gb.x - 6, Y, { size: 11, color: C.muted, align: 'right' });
      }
      for (let per = 2; per <= 5; per++) {
        const X = g.px(per);
        Sim.line(ctx, X, gb.y, X, gb.y + gb.h, { color: C.grid, width: 1 });
        ctext(ctx, 'period ' + per, X, gb.y + gb.h + 12, { size: 11.5, color: C.ink, align: 'center' });
        ctext(ctx, ELEC[per - 2] + ' electrons', X, gb.y + gb.h + 27, { size: 10.5, color: C.muted, align: 'center' });
      }
      Sim.line(ctx, gb.x, gb.y + gb.h, gb.x + gb.w, gb.y + gb.h, { color: C.axis, width: 1.5 });
      Sim.line(ctx, gb.x, gb.y, gb.x, gb.y + gb.h, { color: C.axis, width: 1.5 });
      Sim.text(ctx, 'boiling temperature / K', gb.x - 46, gb.y + gb.h / 2, { size: 12, bold: true, color: C.ink, align: 'center', rotate: -Math.PI / 2 });
      g.hline(273, { color: '#adb5bd', dash: [3, 5], width: 1 });
      ctext(ctx, '0 °C', gb.x + 6, g.py(273) - 8, { size: 10.5, color: C.muted, align: 'left' });
      [14, 15, 16, 17].forEach((grp) => {
        if (!p['g' + grp]) return;
        const H = HYD[grp];
        g.path(H.m.map((m, i) => [i + 2, m[1]]), { color: H.col, width: 2.2 });
        if (p.trend && grp !== 14) {
          const f = fit(H.m.slice(1).map((m, i) => [i + 3, m[1]]));
          g.path([[2, f.m * 2 + f.c], [5, f.m * 5 + f.c]], { color: H.col, width: 1.5, dash: [5, 5] });
          g.dot(2, f.m * 2 + f.c, { color: '#fff', stroke: H.col, r: 4 });
          Sim.circle(ctx, g.px(2), g.py(f.m * 2 + f.c), 4.5, { stroke: H.col, width: 2 });
        }
        H.m.forEach((m, i) => {
          g.dot(i + 2, m[1], { color: H.col, r: 5 });
          const lp = LAB[m[0]] || (i === 3 ? [10, 0, 'left'] : [-9, -11, 'right']);
          ctext(ctx, m[0], g.px(i + 2) + lp[0], g.py(m[1]) + lp[1], { size: 12, bold: true, color: H.col, align: lp[2] });
        });
      });
      const pk = s.state.pick;
      if (p['g' + pk.grp]) {
        const m = HYD[pk.grp].m[pk.i];
        Sim.circle(ctx, g.px(pk.i + 2), g.py(m[1]), 10, { stroke: C.ink, width: 2 });
      }
      /* legend */
      const lx = gb.x + gb.w - 92, ly = gb.y + 14;
      [14, 15, 16, 17].forEach((grp, i) => {
        Sim.line(ctx, lx, ly + i * 17, lx + 18, ly + i * 17, { color: HYD[grp].col, width: 2.5 });
        ctext(ctx, HYD[grp].name, lx + 24, ly + i * 17, { size: 11.5, color: p['g' + grp] ? C.ink : C.grey });
      });

      /* details of the picked molecule */
      const m = HYD[pk.grp].m[pk.i];
      const dx = wide ? gb.x + gb.w + 26 : 20, dy = wide ? 40 : gb.y + gb.h + 56, dw = wide ? w - dx - 12 : w - 40;
      Sim.rect(ctx, dx - 10, dy - 22, dw + 6, wide ? h - 70 : 140, { fill: '#f8f9fa', stroke: C.light, r: 10 });
      ctext(ctx, m[0], dx, dy, { size: 22, bold: true, color: HYD[pk.grp].col });
      ctext(ctx, ELEC[pk.i] + ' electrons · boils at ' + m[1] + ' K (' + String(m[1] - 273).replace('-', '−') + ' °C)', dx, dy + 26, { size: 12, color: C.muted });
      const forces = [['L', 'London forces', true], ['D', 'permanent dipole–dipole', m[2].includes('D')], ['H', 'hydrogen bonds', m[2].includes('H')]];
      forces.forEach(([k, t, on], i) => {
        const yy = dy + 54 + i * 22;
        Sim.circle(ctx, dx + 7, yy, 7, { fill: on ? (k === 'H' ? C.red : k === 'D' ? C.orange : C.blue) : C.light });
        ctext(ctx, t, dx + 20, yy, { size: 12.5, color: on ? C.ink : C.grey, bold: on && k === 'H' });
      });
      let note;
      if (m[2].includes('H')) note = 'H is bonded to ' + (pk.grp === 15 ? 'N' : pk.grp === 16 ? 'O' : 'F') + ', which has a lone pair: hydrogen bonds between molecules make it boil far higher than the trend predicts.';
      else if (pk.grp === 14) note = 'Tetrahedral and symmetrical, so non-polar: London forces only. Boiling temperature rises with the number of electrons.';
      else note = 'A weakly polar molecule, but London forces dominate: the trend follows the number of electrons.';
      if (wide) {
        const words = note.split(' ');
        let line = '', yy = dy + 130;
        words.forEach((wd) => {
          const t = line ? line + ' ' + wd : wd;
          if (cwidth(ctx, t, { size: 12 }) > dw - 10) { ctext(ctx, line, dx, yy, { size: 12, color: C.ink }); yy += 17; line = wd; } else line = t;
        });
        if (line) ctext(ctx, line, dx, yy, { size: 12, color: C.ink });
      }
      ctext(ctx, wide ? 'Point at a molecule on the graph' : 'Tap a point on the graph', wide ? dx : w - 30, wide ? h - 26 : dy, { size: 11, italic: true, color: C.muted, align: wide ? 'left' : 'right' });
    },
    readout: (s) => {
      const r = [];
      if (s.p.trend) {
        [[16, 'H₂O'], [17, 'HF'], [15, 'NH₃']].forEach(([grp, lab]) => {
          const H = HYD[grp];
          const f = fit(H.m.slice(1).map((m, i) => [i + 3, m[1]]));
          const pred = Math.round(f.m * 2 + f.c);
          r.push([html(lab) + ' expected / actual', pred + ' K / ' + H.m[0][1] + ' K', grp === 16]);
        });
      } else {
        const pk = s.state.pick, m = HYD[pk.grp].m[pk.i];
        r.push(['Selected', html(m[0])], ['Boiling temperature', m[1] + ' K', true]);
      }
      return r;
    }
  });

  /* ======================================================================
     3. Same number of electrons, different forces
     ====================================================================== */
  const SETS = {
    e18: [['ethane', 'CH₃CH₃', -88.6, 'L'], ['fluoromethane', 'CH₃F', -78.4, 'LD'], ['methanol', 'CH₃OH', 64.7, 'LDH']],
    e26: [['propane', 'CH₃CH₂CH₃', -42.1, 'L'], ['fluoroethane', 'CH₃CH₂F', -37.7, 'LD'], ['methoxymethane', 'CH₃OCH₃', -24.8, 'LD'], ['ethanol', 'CH₃CH₂OH', 78.4, 'LDH']],
    e34: [['butane', 'CH₃CH₂CH₂CH₃', -0.5, 'L'], ['methoxyethane', 'CH₃OCH₂CH₃', 7.4, 'LD'], ['chloroethane', 'CH₃CH₂Cl', 12.3, 'LD'], ['propan-1-ol', 'CH₃CH₂CH₂OH', 97.2, 'LDH']]
  };
  const FCOL = { L: C.blue, D: C.orange, H: C.red };
  const FNAME = { L: 'London', D: 'dipole–dipole', H: 'hydrogen bonds' };

  function drawCompareNarrow(ctx, w, list) {
    const x0 = 12, bw = w - 90;
    const px = (K) => x0 + (K / 400) * bw;
    ctext(ctx, 'boiling temperature / K', x0, 16, { size: 12, bold: true, color: C.ink });
    [0, 100, 200, 300, 400].forEach((K) => ctext(ctx, String(K), px(K), 34, { size: 10.5, color: C.muted, align: 'center' }));
    const top = 46, rowH = 84;
    Sim.line(ctx, px(298), top - 4, px(298), top + rowH * list.length - 10, { color: C.orange, width: 1.2, dash: [5, 4] });
    ctext(ctx, '25 °C', px(298) + 4, top + rowH * list.length - 4, { size: 10.5, color: C.orange, bold: true });
    list.forEach(([name, f, bp, forces], i) => {
      const y = top + i * rowH;
      const K = bp + 273;
      const parts = forces.split('');
      ctext(ctx, name, x0, y + 8, { size: 12.5, bold: true, color: C.ink });
      ctext(ctx, f, x0 + cwidth(ctx, name, { size: 12.5, bold: true }) + 8, y + 8, { size: 11.5, color: C.muted });
      Sim.rect(ctx, x0, y + 20, px(K) - x0, 18, { fill: FCOL[parts[parts.length - 1]], r: 3 });
      ctext(ctx, Math.round(K) + ' K', px(K) + 6, y + 29, { size: 12, bold: true, color: C.ink });
      let cx = x0;
      parts.forEach((k) => {
        Sim.circle(ctx, cx + 5, y + 52, 5, { fill: FCOL[k] });
        ctext(ctx, FNAME[k], cx + 13, y + 52, { size: 11, color: C.ink });
        cx += 13 + cwidth(ctx, FNAME[k], { size: 11 }) + 12;
      });
    });
  }

  Sim.create('#sim-chem-07-compare', {
    title: 'Same number of electrons, different forces',
    height: (w) => (w >= 560 ? 380 : 400),
    controls: [
      { key: 'set', type: 'select', label: 'Molecules with', value: 'e26', options: [['e18', '18 electrons each'], ['e26', '26 electrons each'], ['e34', '34 electrons each']] }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const list = SETS[p.set];
      if (w < 560) { drawCompareNarrow(ctx, w, list); return; }
      const gx = 58, gy = 30, gw = w - gx - 16, gh = h - 30 - 130;
      const ymax = 400;
      const py = (K) => gy + gh - (K / ymax) * gh;
      for (let K = 0; K <= ymax; K += 100) {
        Sim.line(ctx, gx, py(K), gx + gw, py(K), { color: C.grid, width: 1 });
        ctext(ctx, String(K), gx - 6, py(K), { size: 11, color: C.muted, align: 'right' });
      }
      Sim.line(ctx, gx, py(298), gx + gw, py(298), { color: C.orange, width: 1.2, dash: [6, 4] });
      ctext(ctx, '25 °C', gx + gw - 4, py(298) - 9, { size: 11, color: C.orange, align: 'right', bold: true });
      Sim.text(ctx, 'boiling temperature / K', gx - 44, gy + gh / 2, { size: 12, bold: true, color: C.ink, align: 'center', rotate: -Math.PI / 2 });
      Sim.line(ctx, gx, gy + gh, gx + gw, gy + gh, { color: C.axis, width: 1.5 });
      const slot = gw / list.length;
      list.forEach(([name, f, bp, forces], i) => {
        const K = bp + 273;
        const x = gx + i * slot + slot * 0.22, bw = slot * 0.56;
        const top = py(K);
        /* bar coloured by the strongest force present */
        const parts = forces.split('');
        Sim.rect(ctx, x, top, bw, gy + gh - top, { fill: FCOL[parts[parts.length - 1]], r: 3 });
        ctext(ctx, Math.round(K) + ' K', x + bw / 2, top - 22, { size: 12.5, bold: true, color: C.ink, align: 'center' });
        ctext(ctx, '(' + String(bp).replace('-', '−') + ' °C)', x + bw / 2, top - 8, { size: 10.5, color: C.muted, align: 'center' });
        const fsz = slot < 110 ? 10.5 : 12.5;
        ctext(ctx, name, x + bw / 2, gy + gh + 16, { size: fsz, bold: true, color: C.ink, align: 'center' });
        ctext(ctx, f, x + bw / 2, gy + gh + 33, { size: fsz, color: C.muted, align: 'center' });
        parts.forEach((k, j) => {
          const yy = gy + gh + 52 + j * 17;
          Sim.circle(ctx, x + bw / 2 - cwidth(ctx, FNAME[k], { size: 11 }) / 2 - 9, yy, 5, { fill: FCOL[k] });
          ctext(ctx, FNAME[k], x + bw / 2 + 2, yy, { size: 11, color: C.ink, align: 'center' });
        });
      });
    },
    readout: (s) => {
      const list = SETS[s.p.set];
      const alkane = list[0], alcohol = list[list.length - 1];
      return [
        ['Electrons per molecule', s.p.set.slice(1)],
        ['Alcohol boils higher than the alkane by', (alcohol[2] - alkane[2]).toFixed(1) + ' K', true]
      ];
    }
  });
})();
