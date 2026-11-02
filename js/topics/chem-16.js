/* Chemistry topic 16: Redox equilibria — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const RT_F = 0.0257;   // RT/F at 298 K, in volts

  /* ======================================================================
     1. Build a cell from two half-cells
     ====================================================================== */
  // ox and red: [coefficient, formula] for each side of the half-equation (H⁺ and H₂O included).
  const COUPLES = {
    mg: { label: 'Mg²⁺ / Mg', E: -2.37, n: 2, ox: [[1, 'Mg²⁺']], red: [[1, 'Mg']], el: 'Mg', elCol: '#adb5bd', sol: 'rgba(230,236,245,0.8)', L: 'Mg(s) | Mg²⁺(aq)', R: 'Mg²⁺(aq) | Mg(s)' },
    zn: { label: 'Zn²⁺ / Zn', E: -0.76, n: 2, ox: [[1, 'Zn²⁺']], red: [[1, 'Zn']], el: 'Zn', elCol: '#adb5bd', sol: 'rgba(230,236,245,0.8)', L: 'Zn(s) | Zn²⁺(aq)', R: 'Zn²⁺(aq) | Zn(s)' },
    fe: { label: 'Fe²⁺ / Fe', E: -0.44, n: 2, ox: [[1, 'Fe²⁺']], red: [[1, 'Fe']], el: 'Fe', elCol: '#868e96', sol: 'rgba(178,222,180,0.7)', L: 'Fe(s) | Fe²⁺(aq)', R: 'Fe²⁺(aq) | Fe(s)' },
    ni: { label: 'Ni²⁺ / Ni', E: -0.25, n: 2, ox: [[1, 'Ni²⁺']], red: [[1, 'Ni']], el: 'Ni', elCol: '#ced4da', sol: 'rgba(120,200,120,0.7)', L: 'Ni(s) | Ni²⁺(aq)', R: 'Ni²⁺(aq) | Ni(s)' },
    h: { label: 'H⁺ / H₂ (SHE)', E: 0.0, n: 2, ox: [[2, 'H⁺']], red: [[1, 'H₂']], el: 'Pt', elCol: '#495057', sol: 'rgba(230,236,245,0.8)', gas: 'H₂', L: 'Pt | H₂(g) | H⁺(aq)', R: 'H⁺(aq) | H₂(g) | Pt' },
    cu: { label: 'Cu²⁺ / Cu', E: 0.34, n: 2, ox: [[1, 'Cu²⁺']], red: [[1, 'Cu']], el: 'Cu', elCol: '#d9480f', sol: 'rgba(77,171,247,0.75)', L: 'Cu(s) | Cu²⁺(aq)', R: 'Cu²⁺(aq) | Cu(s)' },
    i2: { label: 'I₂ / I⁻', E: 0.54, n: 2, ox: [[1, 'I₂']], red: [[2, 'I⁻']], el: 'Pt', elCol: '#495057', sol: 'rgba(160,90,20,0.6)', L: 'Pt | I⁻(aq), I₂(aq)', R: 'I₂(aq), I⁻(aq) | Pt' },
    fe3: { label: 'Fe³⁺ / Fe²⁺', E: 0.77, n: 1, ox: [[1, 'Fe³⁺']], red: [[1, 'Fe²⁺']], el: 'Pt', elCol: '#495057', sol: 'rgba(230,160,60,0.6)', L: 'Pt | Fe²⁺(aq), Fe³⁺(aq)', R: 'Fe³⁺(aq), Fe²⁺(aq) | Pt' },
    ag: { label: 'Ag⁺ / Ag', E: 0.80, n: 1, ox: [[1, 'Ag⁺']], red: [[1, 'Ag']], el: 'Ag', elCol: '#dee2e6', sol: 'rgba(230,236,245,0.8)', L: 'Ag(s) | Ag⁺(aq)', R: 'Ag⁺(aq) | Ag(s)' },
    br: { label: 'Br₂ / Br⁻', E: 1.09, n: 2, ox: [[1, 'Br₂']], red: [[2, 'Br⁻']], el: 'Pt', elCol: '#495057', sol: 'rgba(200,90,30,0.55)', L: 'Pt | Br⁻(aq), Br₂(aq)', R: 'Br₂(aq), Br⁻(aq) | Pt' },
    cl: { label: 'Cl₂ / Cl⁻', E: 1.36, n: 2, ox: [[1, 'Cl₂']], red: [[2, 'Cl⁻']], el: 'Pt', elCol: '#495057', sol: 'rgba(200,230,150,0.55)', gas: 'Cl₂', L: 'Pt | Cl⁻(aq) | Cl₂(g)', R: 'Cl₂(g) | Cl⁻(aq) | Pt' },
    mn: { label: 'MnO₄⁻ / Mn²⁺ (acid)', E: 1.51, n: 5, ox: [[1, 'MnO₄⁻'], [8, 'H⁺']], red: [[1, 'Mn²⁺'], [4, 'H₂O']], el: 'Pt', elCol: '#495057', sol: 'rgba(150,40,150,0.6)', L: 'Pt | Mn²⁺(aq), MnO₄⁻(aq)', R: 'MnO₄⁻(aq), Mn²⁺(aq) | Pt' }
  };
  // Electrode potential when the main oxidised species is at concentration c (everything else standard).
  const Eof = (K, c) => K.E + (RT_F / K.n) * K.ox[0][0] * Math.log(c);
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  function overall(Rd, Ox) {
    // Rd is reduced (goes forwards), Ox is oxidised (goes backwards); balance the electrons.
    const L = Rd.n * Ox.n / gcd(Rd.n, Ox.n);
    const mR = L / Rd.n, mO = L / Ox.n;
    const left = {}, right = {};
    const add = (side, list, m) => list.forEach(([k, f]) => { side[f] = (side[f] || 0) + k * m; });
    add(left, Rd.ox, mR); add(left, Ox.red, mO);
    add(right, Rd.red, mR); add(right, Ox.ox, mO);
    Object.keys(left).forEach((f) => {   // cancel anything on both sides (H⁺, H₂O, Fe²⁺)
      if (right[f]) { const k = Math.min(left[f], right[f]); left[f] -= k; right[f] -= k; }
    });
    const str = (side) => Object.keys(side).filter((f) => side[f] > 0).map((f) => (side[f] === 1 ? '' : side[f]) + f).join(' + ');
    return str(left) + ' → ' + str(right);
  }

  function halfCell(ctx, x, y, w, h, K, sign) {
    // beaker with solution, electrode, and a gas inlet for gas electrodes
    Sim.rect(ctx, x + 3, y + h * 0.3, w - 6, h * 0.7 - 3, { fill: K.sol });
    Sim.polyline(ctx, [[x, y + 10], [x, y + h], [x + w, y + h], [x + w, y + 10]], { color: '#868e96', width: 2.5 });
    const ex = x + w * 0.42;
    Sim.rect(ctx, ex, y - 30, 16, h * 0.78, { fill: K.elCol, stroke: '#343a40', width: 1, r: 2 });
    Sim.text(ctx, K.el, ex + 8, y + h * 0.55, { size: 11, bold: true, color: K.el === 'Pt' || K.el === 'Fe' ? '#fff' : '#212529', align: 'center' });
    if (K.gas) {
      Sim.line(ctx, x + w * 0.78, y - 34, x + w * 0.78, y + h * 0.75, { color: '#868e96', width: 3 });
      for (let i = 0; i < 4; i++) Sim.circle(ctx, x + w * 0.74 + (i % 2) * 8, y + h * 0.78 - i * 12, 3, { stroke: '#868e96', width: 1 });
      Sim.text(ctx, K.gas + '(g)', x + w * 0.78, y - 42, { size: 11, color: C.muted, align: 'center' });
    }
    Sim.text(ctx, sign, ex + 8, y - 44, { size: 20, bold: true, color: sign === '+' ? C.red : C.blue, align: 'center' });
    return ex + 8;
  }

  Sim.create('#sim-chem-16-cell', {
    title: 'Build an electrochemical cell',
    height: (w) => (w >= 640 ? 330 : 380),
    controls: [
      { key: 'L', type: 'select', label: 'Left half-cell', options: Object.keys(COUPLES).map((k) => [k, COUPLES[k].label + '  (' + (COUPLES[k].E > 0 ? '+' : '') + COUPLES[k].E.toFixed(2) + ' V)']), value: 'zn' },
      { key: 'R', type: 'select', label: 'Right half-cell', options: Object.keys(COUPLES).map((k) => [k, COUPLES[k].label + '  (' + (COUPLES[k].E > 0 ? '+' : '') + COUPLES[k].E.toFixed(2) + ' V)']), value: 'cu' },
      { key: 'cL', label: 'Left: concentration of oxidised form', min: -2, max: 0.3, step: 0.1, value: 0, unit: 'mol dm⁻³', format: (v) => Sim.fmt(Math.pow(10, v), 2) },
      { key: 'cR', label: 'Right: concentration of oxidised form', min: -2, max: 0.3, step: 0.1, value: 0, unit: 'mol dm⁻³', format: (v) => Sim.fmt(Math.pow(10, v), 2) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const A = COUPLES[p.L], B = COUPLES[p.R];
      const EL = Eof(A, Math.pow(10, p.cL)), ER = Eof(B, Math.pow(10, p.cR));
      const E = ER - EL;
      const bw = Math.min(150, w * 0.3), bh = 110, y = 120;
      const lx = w * 0.25 - bw / 2, rx = w * 0.75 - bw / 2;
      const neg = E >= 0 ? 'L' : 'R';
      const xL = halfCell(ctx, lx, y, bw, bh, A, neg === 'L' ? '−' : '+');
      const xR = halfCell(ctx, rx, y, bw, bh, B, neg === 'R' ? '−' : '+');
      // salt bridge
      ctx.save();
      ctx.strokeStyle = 'rgba(240,200,120,0.9)';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(lx + bw * 0.8, y + bh * 0.55);
      ctx.lineTo(lx + bw * 0.8, y + 4);
      ctx.lineTo(rx + bw * 0.2, y + 4);
      ctx.lineTo(rx + bw * 0.2, y + bh * 0.55);
      ctx.stroke();
      ctx.restore();
      Sim.text(ctx, 'salt bridge (KNO₃)', w / 2, y - 6, { size: 11, color: C.muted, align: 'center' });
      // wire and voltmeter
      const wy = 36;
      Sim.polyline(ctx, [[xL, y - 30], [xL, wy], [w / 2 - 24, wy]], { color: '#343a40', width: 2 });
      Sim.polyline(ctx, [[w / 2 + 24, wy], [xR, wy], [xR, y - 30]], { color: '#343a40', width: 2 });
      Sim.circle(ctx, w / 2, wy, 24, { fill: '#fff', stroke: '#343a40', width: 2 });
      Sim.text(ctx, (E >= 0 ? '+' : '−') + Math.abs(E).toFixed(2) + ' V', w / 2, wy + 1, { size: 13, bold: true, color: C.navy, align: 'center' });
      // electron flow, from the negative electrode to the positive one
      if (Math.abs(E) > 0.005) {
        const fromL = neg === 'L';
        const y2 = wy + 14;
        const xa = fromL ? xL + 30 : xR - 30, xb = fromL ? w / 2 - 34 : w / 2 + 34;
        Sim.arrow(ctx, xa, y2, xb, y2, { color: C.orange, width: 2, head: 7 });
        const xc = fromL ? w / 2 + 34 : w / 2 - 34, xd = fromL ? xR - 30 : xL + 30;
        Sim.arrow(ctx, xc, y2, xd, y2, { color: C.orange, width: 2, head: 7 });
        Sim.text(ctx, 'e⁻', fromL ? xL + 40 : xR - 40, y2 + 12, { size: 12, bold: true, color: C.orange, align: 'center' });
      }
      Sim.text(ctx, A.label, lx + bw / 2, y + bh + 16, { size: 12, bold: true, color: C.ink, align: 'center' });
      Sim.text(ctx, B.label, rx + bw / 2, y + bh + 16, { size: 12, bold: true, color: C.ink, align: 'center' });
      Sim.text(ctx, A.L + ' || ' + B.R, w / 2, h - 14, { size: w >= 640 ? 13 : 11, color: C.navy, align: 'center' });
    },
    readout(s) {
      const p = s.p;
      const A = COUPLES[p.L], B = COUPLES[p.R];
      const std = Math.abs(p.cL) < 1e-9 && Math.abs(p.cR) < 1e-9;
      const EL = Eof(A, Math.pow(10, p.cL)), ER = Eof(B, Math.pow(10, p.cR));
      const E = ER - EL;
      const rows = [[std ? 'E°cell = E°right − E°left' : 'Ecell (non-standard)', (E >= 0 ? '+' : '−') + Math.abs(E).toFixed(2) + ' V', true]];
      if (p.L === p.R && std) {
        rows.push(['Same half-cell twice', 'no potential difference']);
        return rows;
      }
      const Rd = E >= 0 ? B : A, Ox = E >= 0 ? A : B;
      rows.push(['Reduced (positive electrode)', Rd.label]);
      rows.push(['Oxidised (negative electrode)', Ox.label]);
      rows.push(['Feasible reaction', p.L === p.R ? 'a concentration cell: the more concentrated side is reduced' : overall(Rd, Ox)]);
      if (E < 0) rows.push(['Note', 'E is negative as drawn: the right-hand electrode is negative, so the reaction runs the other way']);
      return rows;
    }
  });

  /* ======================================================================
     2. Iodine–thiosulfate titration: copper in brass
     25.0 cm³ portion, iodine from 1.57 × 10⁻³ mol Cu²⁺; thiosulfate 0.100 mol dm⁻³.
     ====================================================================== */
  const NI2 = 7.85e-4, CTHIO = 0.100, VEND = 2 * NI2 / CTHIO * 1000;   // 15.70 cm³
  const LATE = 0.6;   // starch added early: the complex lets go of its iodine slowly, so the colour lingers

  Sim.create('#sim-chem-16-iodine', {
    title: 'Iodine–thiosulfate titration',
    height: 300,
    controls: [
      { key: 'v', label: 'Thiosulfate added from the burette', min: 0, max: 20, step: 0.05, value: 0, unit: 'cm³', format: (v) => v.toFixed(2) },
      { type: 'button', label: 'Add starch', onClick: (s) => { if (s.state.starchAt == null) s.state.starchAt = s.p.v; s.redraw(); } },
      { type: 'button', label: 'Start again', ghost: true, onClick: (s) => { s.state.starchAt = null; s.set('v', 0); } }
    ],
    init(s) { s.state.starchAt = null; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const left = Math.max(0, 1 - p.v / VEND);           // fraction of the iodine still there
      const early = st.starchAt != null && st.starchAt < VEND * 0.8;
      const blueLeft = st.starchAt != null && (p.v < VEND || (early && p.v < VEND + LATE));
      // burette
      const bx = w / 2 - 8, by = 14, bh = 120;
      Sim.rect(ctx, bx, by, 16, bh, { fill: '#f8f9fa', stroke: '#868e96', width: 1.5, r: 3 });
      Sim.rect(ctx, bx + 2, by + 2 + (bh - 4) * (p.v / 50), 12, (bh - 4) * (1 - p.v / 50), { fill: 'rgba(208,228,255,0.9)' });
      Sim.line(ctx, w / 2, by + bh, w / 2, by + bh + 16, { color: '#868e96', width: 3 });
      Sim.text(ctx, 'Na₂S₂O₃(aq)', bx + 24, by + 20, { size: 11, color: C.muted });
      // conical flask
      const fx = w / 2 - 60, fy = by + bh + 26, fw = 120, fh = 110, neck = 30;
      let fill;
      if (blueLeft) fill = 'rgba(20,24,80,' + (early ? 0.92 : (0.35 + 0.55 * Math.min(1, left * 8 + 0.2))).toFixed(2) + ')';
      else if (left > 0) fill = 'rgba(160,90,20,' + (0.08 + 0.7 * left).toFixed(2) + ')';
      else fill = 'rgba(240,240,236,0.6)';
      const ly = fy + fh * 0.4;
      const wAt = (yy) => (fw / 2 - neck / 2) * (yy - (fy + 24)) / (fh - 24);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(fx + fw / 2 - neck / 2 - wAt(ly), ly);
      ctx.lineTo(fx + 2, fy + fh - 2);
      ctx.lineTo(fx + fw - 2, fy + fh - 2);
      ctx.lineTo(fx + fw / 2 + neck / 2 + wAt(ly), ly);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();
      // white copper(I) iodide precipitate
      for (let i = 0; i < 26; i++) Sim.circle(ctx, fx + 16 + ((i * 29) % (fw - 32)), fy + fh - 8 - (i % 3) * 3, 2, { fill: '#f1e9da', stroke: '#c9bfa8', width: 0.6 });
      if (early && blueLeft) for (let i = 0; i < 6; i++) Sim.circle(ctx, fx + 30 + i * 11, fy + fh - 22 - (i % 2) * 6, 4, { fill: '#0b0c3a' });
      Sim.polyline(ctx, [[fx + fw / 2 - neck / 2, fy], [fx + fw / 2 - neck / 2, fy + 24], [fx, fy + fh], [fx + fw, fy + fh], [fx + fw / 2 + neck / 2, fy + 24], [fx + fw / 2 + neck / 2, fy]], { color: '#868e96', width: 2 });
      // status text beside the flask
      const tx = fx + fw + 24;
      let msg;
      if (blueLeft) msg = early ? 'blue-black, with dark specks of starch–iodine complex' : 'blue-black: iodine still left';
      else if (left > 0.25) msg = 'yellow-brown iodine';
      else if (left > 0) msg = st.starchAt == null ? 'pale yellow: add the starch now' : 'nearly there';
      else msg = 'colourless: end point passed';
      Sim.text(ctx, msg, tx, fy + 40, { size: 12.5, bold: true, color: C.ink });
      Sim.text(ctx, p.v.toFixed(2) + ' cm³ added', tx, fy + 60, { size: 12, color: C.muted });
    },
    readout(s) {
      const p = s.p, st = s.state;
      const early = st.starchAt != null && st.starchAt < VEND * 0.8;
      const vEnd = early ? VEND + LATE : VEND;
      const nLeft = Math.max(0, NI2 - p.v / 1000 * CTHIO / 2);
      const rows = [
        ['Iodine left in the flask', Sim.fmt(nLeft, 3) + ' mol', true],
        ['Starch', st.starchAt == null ? 'not added yet' : 'added at ' + st.starchAt.toFixed(2) + ' cm³' + (early ? ' (too early)' : '')]
      ];
      if (st.starchAt != null && p.v >= vEnd) {
        const cu = (vEnd / 1000) * CTHIO * 10 * 63.5;
        rows.push(['Titre at the colour change', vEnd.toFixed(2) + ' cm³ → copper = ' + (cu / 1.50 * 100).toFixed(1) + '%' + (early ? ' (true value 66.5%)' : '')]);
      }
      return rows;
    }
  });
})();
