/* Topic 5: Alkenes — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const SUBD = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
  const SUPC = { '⁺': '+', '⁻': '−' };

  /* Canvas text with real subscripts (Unicode subscript digits in the string)
     and raised charges (⁺ ⁻). Returns the width drawn. */
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
    const runs = runsOf(str);
    const total = cwidth(ctx, str, o);
    let x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    if (o.bg) Sim.rect(ctx, x0 - 4, y - size / 2 - 4, total + 8, size + 8, { fill: o.bg, r: 4 });
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = o.color || C.ink;
    runs.forEach(([t, k]) => {
      ctx.font = fontOf(o, k);
      ctx.fillText(t, x0, y + (k === 1 ? size * 0.28 : k === 2 ? -size * 0.34 : 0));
      x0 += ctx.measureText(t).width;
    });
    ctx.restore();
    return total;
  }
  /* An atom or group label centred on (x, y); remembers its half-size so that
     bonds can stop at the edge of the label. */
  function label(ctx, str, x, y, o) {
    o = Object.assign({ size: 16, bold: true }, o || {});
    const w = cwidth(ctx, str, o);
    ctext(ctx, str, x, y, Object.assign({ align: 'center' }, o));
    return { x, y, hw: w / 2 + 3, hh: o.size * 0.5 + 2 };
  }
  function trimTo(a, ux, uy) {
    if (!a.hw) return 0;
    const tx = Math.abs(ux) > 1e-6 ? a.hw / Math.abs(ux) : Infinity;
    const ty = Math.abs(uy) > 1e-6 ? a.hh / Math.abs(uy) : Infinity;
    return Math.min(tx, ty);
  }
  /* Bond between two labelled atoms (objects from label()); double: 0, 1 or 2 lines extra. */
  function bond(ctx, a, b, o) {
    o = o || {};
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    const ta = trimTo(a, ux, uy), tb = trimTo(b, ux, uy);
    const col = o.color || C.ink, wd = o.width || 2;
    if (o.double) {
      const off = 3.6, nx = -uy * off, ny = ux * off;
      Sim.line(ctx, a.x + ux * ta + nx, a.y + uy * ta + ny, b.x - ux * tb + nx, b.y - uy * tb + ny, { color: col, width: wd });
      Sim.line(ctx, a.x + ux * ta - nx, a.y + uy * ta - ny, b.x - ux * tb - nx, b.y - uy * tb - ny, { color: o.color2 || col, width: wd });
    } else {
      Sim.line(ctx, a.x + ux * ta, a.y + uy * ta, b.x - ux * tb, b.y - uy * tb, { color: col, width: wd, dash: o.dash });
    }
  }
  /* Curly arrow: quadratic curve from p0 to p1 bowing through control c. */
  function curly(ctx, p0, c, p1, o) {
    o = o || {};
    const col = o.color || C.red;
    ctx.save();
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = o.width || 2;
    ctx.lineCap = 'round';
    const a = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
    const hl = 10;
    const bx = p1[0] - Math.cos(a) * hl * 0.8, by = p1[1] - Math.sin(a) * hl * 0.8;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(c[0], c[1], bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p1[0] - Math.cos(a) * hl + Math.sin(a) * hl * 0.45, p1[1] - Math.sin(a) * hl - Math.cos(a) * hl * 0.45);
    ctx.lineTo(p1[0] - Math.cos(a) * hl - Math.sin(a) * hl * 0.45, p1[1] - Math.sin(a) * hl + Math.cos(a) * hl * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function lonePair(ctx, x, y, vertical) {
    const d = 3.4;
    if (vertical) { Sim.circle(ctx, x, y - d, 1.9, { fill: C.ink }); Sim.circle(ctx, x, y + d, 1.9, { fill: C.ink }); }
    else { Sim.circle(ctx, x - d, y, 1.9, { fill: C.ink }); Sim.circle(ctx, x + d, y, 1.9, { fill: C.ink }); }
  }
  function wrapText(ctx, str, maxW, o) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (cwidth(ctx, t, o) > maxW && cur) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  /* ======================================================================
     1. Twisting a C=C bond: σ and π bonds, restricted rotation, E/Z
     ====================================================================== */
  const GROUP = {
    H: { lab: 'H', Z: 1, r: 0.22, fill: '#ffffff', name: 'H' },
    CH3: { lab: 'CH₃', Z: 6, r: 0.36, fill: '#ced4da', name: 'CH₃' },
    F: { lab: 'F', Z: 9, r: 0.27, fill: '#d8f5a2', name: 'F' },
    Cl: { lab: 'Cl', Z: 17, r: 0.32, fill: '#8ce99a', name: 'Cl' },
    Br: { lab: 'Br', Z: 35, r: 0.36, fill: '#ffa8a8', name: 'Br' }
  };
  const GOPTS = [['H', 'H'], ['CH3', 'CH₃'], ['F', 'F'], ['Cl', 'Cl'], ['Br', 'Br']];
  const PHI = 24 * Math.PI / 180;

  function ezVerdict(g, theta) {
    /* g: {a1, b1, a2, b2} — upper (a) and lower (b) groups on C1 and C2 as drawn
       at θ = 0. Past 90° the two groups on C2 have swapped sides. */
    const swapped = theta > 90;
    const up2 = swapped ? g.b2 : g.a2, lo2 = swapped ? g.a2 : g.b2;
    const res = { up1: g.a1, lo1: g.b1, up2, lo2 };
    if (g.a1 === g.b1) { res.none = 'The left carbon has two identical groups (' + GROUP[g.a1].name + ' and ' + GROUP[g.b1].name + ').'; return res; }
    if (g.a2 === g.b2) { res.none = 'The right carbon has two identical groups (' + GROUP[g.a2].name + ' and ' + GROUP[g.b2].name + ').'; return res; }
    res.p1 = GROUP[g.a1].Z > GROUP[g.b1].Z ? 'up' : 'lo';
    res.p2 = GROUP[up2].Z > GROUP[lo2].Z ? 'up' : 'lo';
    res.iso = res.p1 === res.p2 ? 'Z' : 'E';
    return res;
  }

  Sim.create('#sim-chem-05-rotation', {
    title: 'Why the C=C bond cannot rotate',
    height: (w) => (w >= 700 ? 390 : 670),
    controls: [
      { key: 'rot', label: 'Twist the right-hand carbon', min: 0, max: 180, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'a1', type: 'select', label: 'Left carbon, upper group', value: 'CH3', options: GOPTS },
      { key: 'b1', type: 'select', label: 'Left carbon, lower group', value: 'H', options: GOPTS },
      { key: 'a2', type: 'select', label: 'Right carbon, upper group', value: 'CH3', options: GOPTS },
      { key: 'b2', type: 'select', label: 'Right carbon, lower group', value: 'H', options: GOPTS }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const th = p.rot * Math.PI / 180;
      const wide = w >= 700;
      /* ---------- 3D view ---------- */
      const vw = wide ? w * 0.58 : w;
      const sc = Math.min(vw / 4.6, (wide ? h : 330) / 3.6);
      const cx = vw / 2, cy = wide ? h * 0.5 + 6 : 175;
      const P = (v) => [cx + v[0] * sc, cy - (v[1] * Math.cos(PHI) - v[2] * Math.sin(PHI)) * sc];
      const depth = (v) => v[1] * Math.sin(PHI) + v[2] * Math.cos(PHI);
      const rot = (y, z) => [y * Math.cos(th) + z * Math.sin(th), -y * Math.sin(th) + z * Math.cos(th)];
      const C1 = [-0.67, 0, 0], C2 = [0.67, 0, 0];
      const subs = [
        { g: p.a1, v: [-1.29, 0, -1.07], c: C1 },
        { g: p.b1, v: [-1.29, 0, 1.07], c: C1 }
      ];
      const ra = rot(0, -1.07), rb = rot(0, 1.07);
      subs.push({ g: p.a2, v: [1.29, ra[0], ra[1]], c: C2 }, { g: p.b2, v: [1.29, rb[0], rb[1]], c: C2 });
      const ax1 = [0, 1, 0];
      const r2 = rot(1, 0);
      const ax2 = [0, r2[0], r2[1]];
      const overlap = Math.abs(Math.cos(th));
      /* p-orbital lobes */
      const lobe = (c, ax, sgn) => {
        const pts = [];
        for (let i = 0; i < 36; i++) {
          const t = (i / 36) * Math.PI * 2;
          const along = 0.6 + 0.5 * Math.cos(t), side = 0.28 * Math.sin(t);
          pts.push(P([c[0] + side, c[1] + sgn * ax[1] * along, c[2] + sgn * ax[2] * along]));
        }
        const cen = [c[0], c[1] + sgn * ax[1] * 0.6, c[2] + sgn * ax[2] * 0.6];
        return { pts, d: depth(cen), cen };
      };
      const items = [lobe(C1, ax1, 1), lobe(C1, ax1, -1), lobe(C2, ax2, 1), lobe(C2, ax2, -1)];
      items.sort((a, b) => a.d - b.d);
      /* π overlap clouds above and below the σ bond */
      const sgnUp = Math.cos(th) >= 0 ? 1 : -1;
      const bridge = (side) => {
        const a = [C1[0], side * 0.72, 0];
        const b = [C2[0], C2[1] + side * sgnUp * ax2[1] * 0.72, side * sgnUp * ax2[2] * 0.72];
        const A = P(a), B = P(b);
        ctx.save();
        ctx.strokeStyle = 'rgba(64,192,87,' + (0.55 * overlap * overlap).toFixed(3) + ')';
        ctx.lineWidth = 0.62 * sc;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
        ctx.restore();
      };
      /* molecular plane (only meaningful while the π bond holds the two ends flat) */
      const plane = [[-1.75, 0, -1.45], [1.75, 0, -1.45], [1.75, 0, 1.45], [-1.75, 0, 1.45]].map(P);
      Sim.polyline(ctx, plane, { close: true, fill: 'rgba(0,123,255,0.05)', color: 'rgba(0,123,255,0.25)', width: 1, dash: [4, 4] });
      if (overlap > 0.02) { bridge(-1); }
      items.forEach((it) => {
        if (it.d < 0) Sim.polyline(ctx, it.pts, { close: true, fill: 'rgba(77,171,247,0.30)', color: 'rgba(28,126,214,0.75)', width: 1.2 });
      });
      /* σ bonds and atoms, back to front */
      const atoms = [{ v: C1, g: null }, { v: C2, g: null }].concat(subs.map((q) => ({ v: q.v, g: q.g, c: q.c })));
      atoms.sort((a, b) => depth(a.v) - depth(b.v));
      const A1 = P(C1), A2 = P(C2);
      Sim.line(ctx, A1[0], A1[1], A2[0], A2[1], { color: C.ink, width: 3 });
      atoms.forEach((a) => {
        const X = P(a.v);
        if (a.g) {
          const Cc = P(a.c);
          Sim.line(ctx, Cc[0], Cc[1], X[0], X[1], { color: C.ink, width: 2.5 });
        }
      });
      atoms.forEach((a) => {
        const X = P(a.v);
        if (!a.g) {
          Sim.circle(ctx, X[0], X[1], 0.26 * sc, { fill: '#343a40', stroke: '#000', width: 1 });
          ctext(ctx, 'C', X[0], X[1], { size: Math.max(11, 0.26 * sc * 0.8), bold: true, color: '#fff', align: 'center' });
        } else {
          const G = GROUP[a.g];
          Sim.circle(ctx, X[0], X[1], G.r * sc, { fill: G.fill, stroke: '#495057', width: 1.2 });
          ctext(ctx, G.lab, X[0], X[1], { size: Math.max(10, G.r * sc * (G.lab.length > 2 ? 0.6 : 0.8)), bold: true, color: C.ink, align: 'center' });
        }
      });
      if (overlap > 0.02) bridge(1);
      items.forEach((it) => {
        if (it.d >= 0) Sim.polyline(ctx, it.pts, { close: true, fill: 'rgba(77,171,247,0.30)', color: 'rgba(28,126,214,0.75)', width: 1.2 });
      });
      ctext(ctx, overlap > 0.26 ? 'π bond: p orbitals overlap sideways' : 'p orbitals at right angles: no overlap, the π bond is broken', cx, 18,
        { size: 12.5, bold: true, color: overlap > 0.26 ? C.green : C.red, align: 'center' });
      ctext(ctx, 'σ bond along the C–C axis is unaffected by twisting', cx, (wide ? h : 330) - 12, { size: 11.5, color: C.muted, align: 'center', italic: true });

      /* ---------- flat structure and the E/Z verdict ---------- */
      const fx0 = wide ? w * 0.6 : 0, fw = wide ? w * 0.4 - 10 : w, fy0 = wide ? 0 : 345;
      const ccyOff = 112;
      const ez = ezVerdict(p, p.rot);
      const ccx = fx0 + fw / 2, ccy = fy0 + ccyOff;
      const broken = overlap <= 0.26;
      Sim.rect(ctx, fx0 + 6, fy0 + 8, fw - 12, (wide ? h : 320) - 16, { fill: '#fbfcfd', stroke: C.light, r: 10 });
      ctext(ctx, 'The same molecule drawn flat', ccx, fy0 + 26, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      const L = 50;
      Sim.line(ctx, fx0 + 22, ccy, ccx - 50, ccy, { color: '#adb5bd', width: 1, dash: [5, 5] });
      Sim.line(ctx, ccx + 50, ccy, fx0 + fw - 22, ccy, { color: '#adb5bd', width: 1, dash: [5, 5] });
      const c1 = label(ctx, 'C', ccx - 34, ccy, { size: 18 }), c2 = label(ctx, 'C', ccx + 34, ccy, { size: 18 });
      bond(ctx, c1, c2, { double: !broken, width: 2.2 });
      const gpos = [
        [ez.up1, ccx - 34 - L * 0.75, ccy - L, 'up', 1], [ez.lo1, ccx - 34 - L * 0.75, ccy + L, 'lo', 1],
        [ez.up2, ccx + 34 + L * 0.75, ccy - L, 'up', 2], [ez.lo2, ccx + 34 + L * 0.75, ccy + L, 'lo', 2]
      ];
      gpos.forEach(([g, x, y, side, k]) => {
        const pri = !ez.none && !broken && ((k === 1 && ez.p1 === side) || (k === 2 && ez.p2 === side));
        if (pri) Sim.circle(ctx, x, y, 21, { fill: 'rgba(240,140,0,0.18)', stroke: C.orange, width: 2 });
        const lab = label(ctx, k === 1 && g === 'CH3' ? 'H₃C' : GROUP[g].lab, x, y, { size: 18 });
        bond(ctx, k === 1 ? c1 : c2, lab, { width: 2 });
      });
      let verdict, vcol, why;
      if (broken) { verdict = 'twisted: no π bond'; vcol = C.red; why = 'Halfway round, the p orbitals cannot overlap. Getting here costs about 270 kJ mol⁻¹, the energy of the π bond, so it does not happen at room temperature.'; }
      else if (ez.none) { verdict = 'no E/Z isomers'; vcol = C.grey; why = ez.none + ' Twisting gives the same molecule again.'; }
      else {
        verdict = ez.iso === 'Z' ? 'Z isomer' : 'E isomer'; vcol = ez.iso === 'Z' ? C.purple : C.blue;
        why = 'Higher priority groups (larger atomic number, circled) are on ' + (ez.iso === 'Z' ? 'the same side' : 'opposite sides') + ' of the double bond.';
      }
      ctext(ctx, verdict, ccx, ccy + 84, { size: 21, bold: true, color: vcol, align: 'center' });
      wrapText(ctx, why, fw - 40, { size: 12 }).slice(0, 4).forEach((ln, i) => ctext(ctx, ln, ccx, ccy + 112 + i * 17, { size: 12, color: C.muted, align: 'center' }));
    },
    readout: (s) => {
      const o = Math.abs(Math.cos(s.p.rot * Math.PI / 180));
      const ez = ezVerdict(s.p, s.p.rot);
      return [
        ['Twist', s.p.rot.toFixed(0) + '°'],
        ['p-orbital overlap (π bond)', Math.round(o * 100) + ' %', true],
        ['Isomer', o <= 0.26 ? '— (not an alkene)' : ez.none ? 'no E/Z isomers' : ez.iso]
      ];
    }
  });

  /* ======================================================================
     2. Electrophilic addition: step through the mechanism
     ====================================================================== */
  const ALKENES = {
    ethene: { name: 'ethene', up1: 'H', lo1: 'H', up2: 'H', lo2: 'H', prod: { 1: 'Xethane', 2: 'Xethane', X2: '1,2-diXethane' } },
    propene: { name: 'propene', up1: 'H', lo1: 'H', up2: 'CH₃', lo2: 'H', prod: { 1: '1-Xpropane', 2: '2-Xpropane', X2: '1,2-diXpropane' } },
    but1ene: { name: 'but-1-ene', up1: 'H', lo1: 'H', up2: 'CH₂CH₃', lo2: 'H', prod: { 1: '1-Xbutane', 2: '2-Xbutane', X2: '1,2-diXbutane' } },
    mprop: { name: '2-methylpropene', up1: 'H', lo1: 'H', up2: 'CH₃', lo2: 'CH₃', prod: { 1: '1-X-2-methylpropane', 2: '2-X-2-methylpropane', X2: '1,2-diX-2-methylpropane' } },
    but2ene: { name: 'but-2-ene', up1: 'CH₃', lo1: 'H', up2: 'CH₃', lo2: 'H', prod: { 1: '2-Xbutane', 2: '2-Xbutane', X2: '2,3-diXbutane' } }
  };
  const REAG = {
    HBr: { e: 'H', nu: 'Br', halo: 'bromo', two: false },
    HCl: { e: 'H', nu: 'Cl', halo: 'chloro', two: false },
    Br2: { e: 'Br', nu: 'Br', halo: 'bromo', two: true }
  };
  const isAlkyl = (g) => g !== 'H';
  /* number of carbon atoms bonded to C⁺ if the electrophile adds to carbon k (1 or 2) */
  function cationClass(alk, k) {
    const other = k === 1 ? 2 : 1;
    const gs = other === 1 ? [alk.up1, alk.lo1] : [alk.up2, alk.lo2];
    return 1 + gs.filter(isAlkyl).length;
  }
  const CLASSN = ['', 'primary', 'secondary', 'tertiary'];
  function plan(p) {
    const alk = ALKENES[p.alk], rg = REAG[p.reag];
    const c1 = cationClass(alk, 1), c2 = cationClass(alk, 2);    // E adds to C1 → cation on C2 etc.
    let eTo;
    const symmetric = c1 === c2;
    if (symmetric) eTo = 1;
    else {
      const majorTo = c1 > c2 ? 1 : 2;
      eTo = (p.route === 'minor' && !rg.two) ? (majorTo === 1 ? 2 : 1) : majorTo;
    }
    const plus = eTo === 1 ? 2 : 1;
    const cls = eTo === 1 ? c1 : c2;
    const name = (key) => {
      let n = alk.prod[key];
      if (rg.two) return n.replace('diX', 'di' + rg.halo);
      return n.replace('X', rg.halo);
    };
    const productName = rg.two ? name('X2') : name(String(plus));
    const majorName = rg.two ? name('X2') : name(String(c1 >= c2 ? 2 : 1));
    const minorName = rg.two ? null : name(String(c1 >= c2 ? 1 : 2));
    const isMajor = symmetric || rg.two || (cls === Math.max(c1, c2));
    return { alk, rg, eTo, plus, cls, symmetric, productName, majorName, minorName, isMajor, c1, c2 };
  }

  function drawMechanism(ctx, pl, step, ox, oy, k) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(k, k);
    const { alk, rg, eTo, plus } = pl;
    const X1 = 250, X2 = 340, Y = 112;
    const sp3 = step > 0;
    const c1 = label(ctx, 'C', X1, Y), c2 = label(ctx, 'C', X2, Y);
    const grp = (g, side) => (side === 'L' && g === 'CH₃' ? 'H₃C' : side === 'L' && g === 'CH₂CH₃' ? 'CH₃CH₂' : g);
    if (!sp3) {
      bond(ctx, c1, c2, { double: true, width: 2.2, color2: C.blue });
      const d = 50;
      const g1 = label(ctx, grp(alk.up1, 'L'), X1 - d * 0.87, Y - d * 0.62);
      const g2 = label(ctx, grp(alk.lo1, 'L'), X1 - d * 0.87, Y + d * 0.62);
      const g3 = label(ctx, alk.up2, X2 + d * 0.87, Y - d * 0.62);
      const g4 = label(ctx, alk.lo2, X2 + d * 0.87, Y + d * 0.62);
      bond(ctx, c1, g1); bond(ctx, c1, g2); bond(ctx, c2, g3); bond(ctx, c2, g4);
      /* the electrophile below, nearer the carbon it will bond to */
      const ex = eTo === 1 ? X1 + 22 : X2 - 22;
      const E = label(ctx, rg.e, ex, 178), N = label(ctx, rg.nu, ex, 240);
      bond(ctx, E, N);
      ctext(ctx, 'δ+', ex + 22, 170, { size: 13, bold: true, color: C.blue });
      ctext(ctx, 'δ−', ex + 24, 248, { size: 13, bold: true, color: C.red });
      /* arrow 1: π electrons to the electrophile; arrow 2: E–Nu bond pair to Nu */
      const mid = (X1 + X2) / 2;
      const side = eTo === 1 ? 1 : -1;
      curly(ctx, [mid, Y + 8], [(mid + ex) / 2 + side * 28, 143], [ex + side * 4, 166]);
      curly(ctx, [ex + 1, 209], [ex + 36, 212], [ex + 12, 233]);
      if (rg.two) ctext(ctx, 'induced dipole', ex - 30, 209, { size: 11.5, italic: true, color: C.muted, align: 'right' });
    } else {
      bond(ctx, c1, c2, { width: 2.2 });
      const up1 = label(ctx, grp(alk.up1, 'L'), X1, Y - 52), out1 = label(ctx, grp(alk.lo1, 'L'), X1 - 62, Y);
      const up2 = label(ctx, alk.up2, X2, Y - 52), out2 = label(ctx, alk.lo2, X2 + 62, Y);
      bond(ctx, c1, up1); bond(ctx, c1, out1); bond(ctx, c2, up2); bond(ctx, c2, out2);
      const ce = eTo === 1 ? c1 : c2, cp = eTo === 1 ? c2 : c1;
      const E = label(ctx, rg.e, ce.x, Y + 54);
      bond(ctx, ce, E);
      if (step === 1) {
        ctext(ctx, '+', cp.x + (plus === 2 ? 13 : -13), Y - 14, { size: 18, bold: true, color: C.red, align: 'center' });
        const nx = cp.x + (plus === 2 ? 26 : -26);
        const N = label(ctx, rg.nu, nx, 212);
        lonePair(ctx, nx - 16, 212, true);
        lonePair(ctx, nx, 196, false);
        ctext(ctx, '−', nx + 15, 202, { size: 15, bold: true, color: C.red, align: 'center' });
        void N;
        const sgn = plus === 2 ? -1 : 1;
        curly(ctx, [nx - 2, 191], [cp.x + sgn * 34, 160], [cp.x + sgn * 3, Y + 13]);
        const tag = CLASSN[pl.cls] + ' carbocation';
        ctext(ctx, tag, cp.x, Y - 84, { size: 12, bold: true, color: C.purple, align: 'center', bg: 'rgba(243,240,255,0.95)' });
      } else {
        const N = label(ctx, rg.nu, cp.x, Y + 54);
        bond(ctx, cp, N);
      }
    }
    ctx.restore();
  }

  const STEP_TEXT = [
    (pl) => pl.rg.two
      ? 'As Br₂ approaches the electron-rich π bond, the π electrons repel the electrons in the Br–Br bond, inducing a dipole. The π electrons are attracted to Br<sup>δ+</sup>: a pair moves from the π bond to form a C–Br bond, and the Br–Br bond breaks heterolytically, both electrons going to the other bromine.'
      : (pl.rg.e === 'H' ? 'H–' + pl.rg.nu + ' is polar because ' + pl.rg.nu + ' is more electronegative than H. The electron-rich π bond attracts H<sup>δ+</sup>: a pair of π electrons moves to form a new C–H bond, and the H–' + pl.rg.nu + ' bond breaks heterolytically, both electrons going to ' + pl.rg.nu + '.' : ''),
    (pl) => 'The intermediate is a <b>' + CLASSN[pl.cls] + ' carbocation</b>: the positive carbon is bonded to ' + pl.cls + ' other carbon atom' + (pl.cls > 1 ? 's' : '') + '. ' +
      (pl.symmetric ? 'Both carbons of the C=C are alike, so either way gives the same carbocation. ' : pl.rg.two ? 'Whichever carbon the first bromine adds to, the second bromine ends up on the other one, so the product is the same. ' : (pl.isMajor ? 'This is the more stable of the two possible carbocations: its alkyl groups release electrons and spread out the positive charge. ' : 'This is the less stable of the two possible carbocations (fewer electron-releasing alkyl groups), so it forms less often. ')) +
      'A lone pair on the ' + (pl.rg.nu === 'Br' ? 'bromide' : 'chloride') + ' ion forms a bond to C<sup>+</sup>.',
    (pl) => 'Product: <b>' + pl.productName + '</b>' + (pl.rg.two || pl.symmetric ? ' (the only product).' : pl.isMajor ? ' — the <b>major</b> product, formed via the more stable carbocation.' : ' — the <b>minor</b> product, formed via the less stable carbocation.')
  ];

  Sim.create('#sim-chem-05-addition', {
    title: 'Electrophilic addition, one step at a time',
    height: (w) => Math.round(Math.min(1.35, (w - 16) / 360) * 280 + 40),
    controls: [
      { key: 'alk', type: 'select', label: 'Alkene', value: 'propene', options: [['ethene', 'ethene'], ['propene', 'propene'], ['but1ene', 'but-1-ene'], ['mprop', '2-methylpropene'], ['but2ene', 'but-2-ene']], onChange: (s) => { s.state.step = 0; } },
      { key: 'reag', type: 'select', label: 'Reagent', value: 'HBr', options: [['HBr', 'hydrogen bromide, HBr'], ['HCl', 'hydrogen chloride, HCl'], ['Br2', 'bromine, Br₂']], onChange: (s) => { s.state.step = 0; } },
      { key: 'route', type: 'select', label: 'Route', value: 'major', options: [['major', 'more stable carbocation'], ['minor', 'less stable carbocation']], onChange: (s) => { s.state.step = 0; } },
      { type: 'button', label: '◀ Back', ghost: true, onClick: (s) => { s.state.step = Math.max(0, s.state.step - 1); } },
      { type: 'button', label: 'Next step ▶', onClick: (s) => { s.state.step = Math.min(2, s.state.step + 1); } }
    ],
    init(s) { s.state = { step: 0 }; },
    draw(s) {
      const { ctx, w } = s;
      const pl = plan(s.p);
      const k = Math.min(1.35, (w - 16) / 360);
      const ox = (w - 360 * k) / 2 - 140 * k;
      const titles = ['Step 1: the electrophile attacks the π bond', 'Step 2: the carbocation is attacked by the negative ion', 'Step 3: the addition product'];
      ctext(ctx, titles[s.state.step], w / 2, 18, { size: 14, bold: true, color: C.navy, align: 'center' });
      for (let i = 0; i < 3; i++) Sim.circle(ctx, w / 2 - 16 + i * 16, 36, 4.5, { fill: i <= s.state.step ? C.green : C.light });
      drawMechanism(ctx, pl, s.state.step, ox, 34, k);
    },
    readout: (s) => {
      const pl = plan(s.p);
      let html = '<div style="flex-basis:100%;font-size:15.5px;line-height:1.55"><b>Step ' + (s.state.step + 1) + ' of 3.</b> ' + STEP_TEXT[s.state.step](pl) + '</div>';
      if (!pl.rg.two && !pl.symmetric) {
        html += '<span class="ro">Major product <b>' + pl.majorName + '</b></span> <span class="ro">Minor product <b>' + pl.minorName + '</b></span>';
      }
      return html;
    }
  });

  /* ======================================================================
     3. Addition polymers: from monomer to repeat unit to chain
     ====================================================================== */
  const MONO = {
    ethene: { name: 'ethene', poly: 'poly(ethene)', g: ['H', 'H', 'H', 'H'], mr: 28.0, use: 'carrier bags, bottles, cling film' },
    propene: { name: 'propene', poly: 'poly(propene)', g: ['H', 'H', 'H', 'CH₃'], mr: 42.0, use: 'crates, ropes, carpet fibres' },
    chloroethene: { name: 'chloroethene', poly: 'poly(chloroethene), PVC', g: ['H', 'H', 'H', 'Cl'], mr: 62.5, use: 'water pipes, window frames, cable insulation' },
    tfe: { name: 'tetrafluoroethene', poly: 'poly(tetrafluoroethene), PTFE', g: ['F', 'F', 'F', 'F'], mr: 100.0, use: 'non-stick coatings' },
    but2ene: { name: 'but-2-ene', poly: 'poly(but-2-ene)', g: ['CH₃', 'H', 'CH₃', 'H'], mr: 56.0, use: '' },
    styrene: { name: 'phenylethene', poly: 'poly(phenylethene)', g: ['H', 'H', 'H', 'C₆H₅'], mr: 104.0, use: 'packaging and insulation (expanded polystyrene)' },
    mma: { name: 'methyl 2-methylpropenoate', poly: 'poly(methyl 2-methylpropenoate)', g: ['H', 'H', 'CH₃', 'COOCH₃'], mr: 100.0, use: 'a tough, clear substitute for glass' }
  };
  /* g = [C1 upper, C1 lower, C2 upper, C2 lower] */

  Sim.create('#sim-chem-05-polymer', {
    title: 'Addition polymers: monomer → repeat unit → chain',
    height: (w) => (w >= 560 ? Math.round(Math.min(1.3, (w - 16) / 600) * 362 + 10) : Math.round(Math.min(1.3, (w - 16) / 320) * 600 + 10)),
    controls: [
      { key: 'm', type: 'select', label: 'Monomer', value: 'propene', options: Object.keys(MONO).map((k) => [k, MONO[k].name]) },
      { key: 'n', label: 'Repeat units in the chain section', min: 1, max: 4, step: 1, value: 3, format: (v) => v.toFixed(0) },
      { key: 'shade', type: 'check', label: 'Shade each repeat unit', value: true }
    ],
    draw(s) {
      const { ctx, w, p } = s;
      const M = MONO[p.m];
      const wide = w >= 560;
      /* layout in design units: side by side when wide, stacked on a phone */
      const L = wide
        ? { DW: 600, mono: [95, 155, 90], nX: 22, name: [125, 160], arrow: [238, 90, 292, 90], ru: [375, 445, 90], stub: [322, 498], br: [338, 482, 30, 150], rn: [490, 156], rlab: [410, 172], chain: [300, 265, 4], cap: 346 }
        : { DW: 320, mono: [130, 190, 80], nX: 52, name: [160, 150], arrow: [160, 170, 160, 210], ru: [125, 195, 290], stub: [72, 248], br: [88, 232, 230, 350], rn: [240, 356], rlab: [160, 374], chain: [160, 480, 2], cap: 566 };
      const k = Math.min(1.3, (w - 16) / L.DW);
      ctx.save();
      ctx.translate((w - L.DW * k) / 2, 6);
      ctx.scale(k, k);
      const G = M.g;
      const gl = (g, left) => (left && g === 'CH₃' ? 'H₃C' : g);
      /* monomer */
      const [mx1, mx2, my] = L.mono;
      ctext(ctx, 'n', L.nX, my + 2, { size: 20, bold: true, italic: true, color: C.navy });
      const m1 = label(ctx, 'C', mx1, my), m2 = label(ctx, 'C', mx2, my);
      bond(ctx, m1, m2, { double: true, width: 2.2 });
      const d = 46;
      [[G[0], mx1 - d * 0.75, my - d * 0.75, m1, true], [G[1], mx1 - d * 0.75, my + d * 0.75, m1, true], [G[2], mx2 + d * 0.75, my - d * 0.75, m2, false], [G[3], mx2 + d * 0.75, my + d * 0.75, m2, false]].forEach(([g, x, y, c, left]) => {
        bond(ctx, c, label(ctx, gl(g, left), x, y, { size: 15 }));
      });
      ctext(ctx, M.name, L.name[0], L.name[1], { size: 12.5, color: C.muted, align: 'center' });
      Sim.arrow(ctx, L.arrow[0], L.arrow[1], L.arrow[2], L.arrow[3], { color: C.ink, width: 2.2 });
      /* repeat unit with brackets */
      const [rx1, rx2, ry] = L.ru;
      const r1 = label(ctx, 'C', rx1, ry), r2 = label(ctx, 'C', rx2, ry);
      bond(ctx, r1, r2);
      Sim.line(ctx, L.stub[0], ry, r1.x - r1.hw, ry, { color: C.ink, width: 2 });
      Sim.line(ctx, r2.x + r2.hw, ry, L.stub[1], ry, { color: C.ink, width: 2 });
      [[G[0], rx1, ry - 48, r1], [G[1], rx1, ry + 48, r1], [G[2], rx2, ry - 48, r2], [G[3], rx2, ry + 48, r2]].forEach(([g, x, y, c]) => bond(ctx, c, label(ctx, g, x, y, { size: 15 })));
      const [bl, brx, bt, bb] = L.br;
      const br = (x, dir) => Sim.polyline(ctx, [[x + dir * 7, bt], [x, bt], [x, bb], [x + dir * 7, bb]], { color: C.ink, width: 2 });
      br(bl, 1); br(brx, -1);
      ctext(ctx, 'n', L.rn[0], L.rn[1], { size: 18, bold: true, italic: true, color: C.navy });
      ctext(ctx, 'repeat unit of ' + M.poly, L.rlab[0], L.rlab[1], { size: 12.5, color: C.muted, align: 'center' });
      /* a section of chain */
      const n = Math.min(Math.round(p.n), L.chain[2]);
      const sp = 58;
      const x0 = L.chain[0] - (2 * n - 1) * sp / 2;
      const yb = L.chain[1];
      for (let u = 0; u < n; u++) {
        if (p.shade) Sim.rect(ctx, x0 + 2 * u * sp - 24, yb - 60, 2 * sp - 10, 120, { fill: u % 2 ? 'rgba(11,122,96,0.08)' : 'rgba(240,140,0,0.10)', r: 8 });
      }
      Sim.line(ctx, x0 - 34, yb, x0 - 12, yb, { color: C.ink, width: 2 });
      Sim.line(ctx, x0 + (2 * n - 1) * sp + 12, yb, x0 + (2 * n - 1) * sp + 34, yb, { color: C.ink, width: 2 });
      let prev = null;
      for (let i = 0; i < 2 * n; i++) {
        const c = label(ctx, 'C', x0 + i * sp, yb, { size: 15 });
        if (prev) bond(ctx, prev, c);
        const up = i % 2 === 0 ? G[0] : G[2], lo = i % 2 === 0 ? G[1] : G[3];
        bond(ctx, c, label(ctx, up, c.x, yb - 44, { size: 14 }));
        bond(ctx, c, label(ctx, lo, c.x, yb + 44, { size: 14 }));
        prev = c;
      }
      const cap = 'section of ' + M.poly + ', ' + n + ' repeat unit' + (n > 1 ? 's' : '') + (n < Math.round(p.n) ? ' (more on a wider screen)' : '');
      wrapText(ctx, cap, L.DW - 20, { size: 12.5 }).forEach((ln, i) => ctext(ctx, ln, L.chain[0], L.cap + i * 16, { size: 12.5, color: C.muted, align: 'center' }));
      ctx.restore();
    },
    readout: (s) => {
      const M = MONO[s.p.m];
      const rows = [['Polymer', M.poly], ['M<sub>r</sub> of monomer = M<sub>r</sub> of repeat unit', M.mr.toFixed(1), true], ['Backbone', 'saturated C–C chain']];
      if (M.use) rows.push(['Used for', M.use]);
      return rows;
    }
  });
})();
