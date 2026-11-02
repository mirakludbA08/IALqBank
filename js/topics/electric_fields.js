/* Electric Fields — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const K = 8.99e9;          // 1/4πε₀ / N m² C⁻²
  const E_CH = 1.60e-19;     // electron charge / C
  const M_E = 9.11e-31;      // electron mass / kg

  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function niceStep(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mag;
  }
  function panel(ctx, b, title) {
    Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 8 });
    if (title) Sim.text(ctx, title, b.x + 10, b.y + 15, { size: 12.5, bold: true, color: C.navy });
  }
  function charge(ctx, x, y, q, r, label) {
    Sim.circle(ctx, x, y, r, { fill: q >= 0 ? C.red : C.blue, stroke: '#fff', width: 2 });
    Sim.text(ctx, q > 0 ? '+' : q < 0 ? '−' : '0', x, y + 1, { size: r * 1.3, bold: true, color: '#fff', align: 'center' });
    if (label) Sim.text(ctx, label, x, y + r + 12, { size: 12, bold: true, color: q >= 0 ? C.red : C.blue, align: 'center', bg: 'rgba(255,255,255,0.8)' });
  }
  const sgnLabel = (q, unit) => (q > 0 ? '+' : q < 0 ? '−' : '') + Math.abs(q).toFixed(Math.abs(q) % 1 ? 1 : 0) + ' ' + unit;

  /* ======================================================================
     1. Inverse-square explorer
     ====================================================================== */
  const INV = { rmin: 0.02, rmax: 0.24 };
  const invF = (p, r) => (K * p.q1 * 1e-6 * p.q2 * 1e-6) / (r * r);
  Sim.create('#sim-inverse', {
    title: "Coulomb's law: the inverse-square explorer",
    height: (w) => (w >= 700 ? 410 : 590),
    controls: [
      { key: 'q1', label: 'Charge A', min: -5, max: 5, step: 0.5, value: 2, unit: 'μC', format: (v) => (v > 0 ? '+' : '') + v.toFixed(1) },
      { key: 'q2', label: 'Charge B', min: -5, max: 5, step: 0.5, value: 2, unit: 'μC', format: (v) => (v > 0 ? '+' : '') + v.toFixed(1) },
      { type: 'button', label: 'Double r', onClick: (s) => { s.state.r = Math.min(INV.rmax, s.state.r * 2); } },
      { type: 'button', label: 'Halve r', onClick: (s) => { s.state.r = Math.max(INV.rmin, s.state.r / 2); } },
      { type: 'button', label: 'Make this r the reference', ghost: true, onClick: (s) => { s.state.r0 = s.state.r; } }
    ],
    init(s) { s.state = { r: 0.05, r0: 0.05, drag: false }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sceneH = 128;
      const xA = Math.max(70, w * 0.1);
      const pxm = (w - xA - 40) / 0.25;
      const XA = xA, XB = xA + st.r * pxm, yL = 58;
      st.geo = { xA, pxm };
      const F = invF(p, st.r), F0 = invF(p, st.r0);
      const rep = F > 0;
      // ruler
      Sim.line(ctx, xA, yL + 34, xA + 0.25 * pxm, yL + 34, { color: C.axis, width: 1 });
      for (let c = 0; c <= 25; c++) {
        const X = xA + c * 0.01 * pxm;
        Sim.line(ctx, X, yL + 34, X, yL + (c % 5 === 0 ? 42 : 38), { color: C.axis, width: 1 });
        if (c % 5 === 0) Sim.text(ctx, c + (c === 0 ? ' cm' : ''), X, yL + 52, { size: 11, color: C.muted, align: 'center' });
      }
      Sim.line(ctx, XA, yL, XB, yL, { color: C.grey, width: 1, dash: [4, 4] });
      Sim.text(ctx, 'r = ' + (st.r * 100).toFixed(1) + ' cm', (XA + XB) / 2, yL - 22, { size: 12.5, bold: true, color: C.ink, align: 'center', bg: 'rgba(255,255,255,0.85)' });
      // force arrows (equal and opposite)
      const base = wide ? 40 : 28;
      const cap = xA - 18;
      const L = F0 !== 0 ? Math.min(cap, (base * Math.abs(F)) / Math.abs(F0)) : 0;
      if (Math.abs(F) > 0 && L > 2) {
        const dirA = rep ? -1 : 1;
        Sim.arrow(ctx, XA + dirA * 14, yL, XA + dirA * (14 + L), yL, { color: C.orange, width: 3 });
        Sim.arrow(ctx, XB - dirA * 14, yL, XB - dirA * (14 + L), yL, { color: C.orange, width: 3 });
      }
      charge(ctx, XA, yL, p.q1, 13, 'A');
      charge(ctx, XB, yL, p.q2, 13, 'B');
      Sim.text(ctx, F === 0 ? 'no force' : rep ? 'repel' : 'attract', w - 14, 16, { size: 13, bold: true, color: C.orange, align: 'right' });
      Sim.text(ctx, 'drag B', XB, yL - 40, { size: 11, color: C.muted, align: 'center', italic: true });

      // graphs
      const top = sceneH + 26;
      const g1b = wide ? { x: 60, y: top, w: w / 2 - 60 - 30, h: h - top - 36 } : { x: 60, y: top, w: w - 60 - 18, h: (h - top) / 2 - 56 };
      const g2b = wide ? { x: w / 2 + 50, y: top, w: w / 2 - 50 - 20, h: h - top - 36 } : { x: 60, y: top + (h - top) / 2, w: w - 60 - 18, h: (h - top) / 2 - 36 };
      const absF = (r) => Math.abs(invF(p, r));
      const y1 = niceMax(Math.max(absF(st.r0) * 4.4, 1e-9));
      const g1 = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 25, ymin: 0, ymax: y1, xlabel: 'r / cm', ylabel: '|F| / N', title: 'force against distance' }, g1b)).axes();
      g1.plot((rc) => (rc >= 1.5 ? absF(rc / 100) : null), { color: C.navy, width: 2.5 });
      const marks = [[0.5, '4F₀'], [1, 'F₀'], [2, 'F₀/4'], [3, 'F₀/9']];
      marks.forEach(([m, lab]) => {
        const rr = st.r0 * m;
        if (rr >= INV.rmin - 1e-9 && rr <= 0.25) {
          g1.dot(rr * 100, absF(rr), { color: C.grey, r: 4 });
          g1.label(rr * 100 + 0.6, absF(rr) + 0.06 * y1, lab, { size: 11.5, color: C.grey, align: 'left', bold: false });
        }
      });
      g1.dot(st.r * 100, absF(st.r), { color: C.orange, r: 6 });
      // F against 1/r²
      const xmax2 = 1 / (INV.rmin * INV.rmin);
      const y2 = niceMax(Math.max(absF(INV.rmin) * 1.05, 1e-9));
      const g2 = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: xmax2, ymin: 0, ymax: y2, xlabel: '1/r² / m⁻²', ylabel: '|F| / N', title: 'force against 1/r²' }, g2b)).axes();
      g2.plot((x) => (Math.abs(K * p.q1 * p.q2) * 1e-12) * x, { color: C.navy, width: 2.5 });
      g2.dot(1 / (st.r * st.r), absF(st.r), { color: C.orange, r: 6 });
      g2.label(xmax2 * 0.05, y2 * 0.9, 'straight line through the origin', { size: 11.5, color: C.navy, align: 'left', bold: false });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const F = invF(p, st.r), F0 = invF(p, st.r0);
      return [
        ['r =', (st.r * 100).toFixed(1) + ' cm'],
        ['|F| =', Sim.fmt(Math.abs(F), 3) + ' N', true],
        ['r ÷ r₀ =', (st.r / st.r0).toFixed(2)],
        ['F ÷ F₀ =', F0 !== 0 ? (F / F0).toFixed(3) : '—'],
        ['(r₀/r)² =', ((st.r0 / st.r) ** 2).toFixed(3)],
        ['F × r² =', Sim.fmt(Math.abs(F) * st.r * st.r, 3) + ' N m² (constant)']
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) {
        const g = s.state.geo;
        if (!g) return;
        s.state.drag = pt.y < 128;
        this.move(s, pt);
      },
      move(s, pt) {
        const st = s.state, g = st.geo;
        if (!pt.down || !st.drag || !g) return;
        st.r = Sim.clamp(Math.round(((pt.x - g.xA) / g.pxm) * 1000) / 1000, INV.rmin, INV.rmax);
      },
      up(s) { s.state.drag = false; }
    }
  });

  /* ======================================================================
     2. V–r and E–r graphs with a tangent
     ====================================================================== */
  const VR = { rmin: 0.04, rmax: 0.5 };
  Sim.create('#sim-vr', {
    title: 'Potential and field around a point charge',
    height: (w) => (w >= 700 ? 440 : 640),
    controls: [
      { key: 'q', label: 'Charge Q', min: -10, max: 10, step: 1, value: 5, unit: 'nC', format: (v) => (v > 0 ? '+' : '') + v.toFixed(0) },
      { key: 'tan', type: 'check', label: 'Show tangent to the V–r graph', value: true }
    ],
    init(s) { s.state = { rt: 0.15, boxes: [] }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const kq = K * p.q * 1e-9;
      const wide = w >= 700;
      const pic = wide ? { x: 8, y: 8, w: w * 0.32, h: h - 16 } : { x: 8, y: 8, w: w - 16, h: 190 };
      const gx = wide ? pic.x + pic.w + 62 : 62;
      const gw = wide ? w - gx - 22 : w - gx - 18;
      const gTop = wide ? 36 : pic.y + pic.h + 34;
      const gH = (h - gTop - 30) / 2 - 34;
      const bV = { x: gx, y: gTop, w: gw, h: gH };
      const bE = { x: gx, y: gTop + gH + 68, w: gw, h: gH };
      st.boxes = [bV, bE, pic];
      const rt = st.rt;

      // picture: charge with equipotentials
      panel(ctx, pic, 'equipotentials at equal steps');
      const ox = pic.x + 22, oy = pic.y + pic.h / 2 + 10;
      const ppm = (pic.w - 36) / VR.rmax;
      ctx.save();
      ctx.beginPath();
      ctx.rect(pic.x, pic.y + 24, pic.w, pic.h - 24);
      ctx.clip();
      if (kq !== 0) {
        const dV = niceStep(Math.abs(kq) / 0.06 / 6);
        for (let n = 1; n < 40; n++) {
          const rn = Math.abs(kq) / (n * dV);
          if (rn > VR.rmax * 1.2) continue;
          if (rn < 0.03) break;
          Sim.circle(ctx, ox, oy, rn * ppm, { stroke: C.green, width: 1.3, dash: [5, 4] });
          if (n <= 4 && rn * ppm < pic.h / 2 - 20) Sim.text(ctx, (p.q > 0 ? '' : '−') + Sim.fmt(n * dV, 3) + ' V', ox + rn * ppm * 0.71 + 3, oy - rn * ppm * 0.71 - 4, { size: 11, color: C.green, align: 'left', bg: 'rgba(248,249,252,0.85)' });
        }
      }
      ctx.restore();
      Sim.line(ctx, ox, oy, ox + VR.rmax * ppm, oy, { color: C.grey, width: 1, dash: [2, 3] });
      const tx = ox + rt * ppm;
      if (kq !== 0) {
        const El = 26;
        const dir = p.q > 0 ? 1 : -1;
        Sim.arrow(ctx, tx, oy, tx + dir * El, oy, { color: C.red, width: 2.5 });
        Sim.text(ctx, 'E', tx + dir * (El + 10), oy - 1, { size: 12.5, bold: true, color: C.red, align: 'center' });
      }
      Sim.circle(ctx, tx, oy, 5, { fill: '#ffd43b', stroke: '#e67700', width: 1.5 });
      Sim.text(ctx, 'r = ' + (rt * 100).toFixed(0) + ' cm', tx, oy + 18, { size: 11.5, bold: true, color: C.ink, align: 'center', bg: 'rgba(248,249,252,0.85)' });
      charge(ctx, ox, oy, p.q, 11, sgnLabel(p.q, 'nC'));

      // V–r
      const vmax = niceMax(Math.abs(kq) / VR.rmin);
      const gV = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: VR.rmax, ymin: p.q >= 0 ? 0 : -vmax, ymax: p.q >= 0 ? vmax : 0, xlabel: 'r / m', ylabel: 'V / V', title: 'potential V = Q/4πε₀r' }, bV)).axes();
      gV.plot((r) => (r >= 0.02 ? kq / r : null), { color: C.navy, width: 2.5 });
      const Vt = kq / rt, grad = -kq / (rt * rt);
      if (p.tan && kq !== 0) {
        gV.plot((r) => Vt + grad * (r - rt), { from: Math.max(0.005, rt - 0.12), to: Math.min(VR.rmax, rt + 0.12), color: C.orange, width: 2, dash: [6, 4] });
      }
      gV.vline(rt, { color: C.grey });
      gV.dot(rt, Vt, { color: C.navy });
      // E–r
      const emax = niceMax(Math.abs(kq) / (VR.rmin * VR.rmin));
      const gE = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: VR.rmax, ymin: p.q >= 0 ? 0 : -emax, ymax: p.q >= 0 ? emax : 0, xlabel: 'r / m', ylabel: 'E / N C⁻¹', title: 'field strength E = Q/4πε₀r²' }, bE)).axes();
      gE.plot((r) => (r >= 0.02 ? kq / (r * r) : null), { color: C.red, width: 2.5 });
      gE.vline(rt, { color: C.grey });
      gE.dot(rt, kq / (rt * rt), { color: C.red });
      Sim.text(ctx, 'drag along a graph', bV.x + bV.w - 6, bV.y + 12, { size: 11, color: C.muted, align: 'right', italic: true });
    },
    readout(s) {
      const p = s.p, rt = s.state.rt;
      const kq = K * p.q * 1e-9;
      const V = kq / rt, Ef = kq / (rt * rt);
      return [
        ['r =', rt.toFixed(3) + ' m'],
        ['V =', Sim.fmt(V, 3) + ' V'],
        ['gradient of V–r (tangent) =', Sim.fmt(-kq / (rt * rt), 3) + ' V m⁻¹'],
        ['E = Q/4πε₀r² =', Sim.fmt(Ef, 3) + ' N C⁻¹', true],
        ['so E = −(gradient)', kq !== 0 ? '✓' : '—'],
        ['V ÷ r =', Sim.fmt(V / rt, 3) + ' (= E for a point charge)']
      ];
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) { this.move(s, pt); },
      move(s, pt) {
        const st = s.state;
        if (!pt.down) return;
        const [bV, bE, pic] = st.boxes;
        if (!bV) return;
        let r = null;
        if ((pt.y >= bV.y - 10 && pt.y <= bV.y + bV.h + 10) || (pt.y >= bE.y - 10 && pt.y <= bE.y + bE.h + 10)) {
          if (pt.x >= bV.x - 10 && pt.x <= bV.x + bV.w + 10) r = ((pt.x - bV.x) / bV.w) * VR.rmax;
        } else if (pt.x >= pic.x && pt.x <= pic.x + pic.w && pt.y >= pic.y && pt.y <= pic.y + pic.h) {
          r = (pt.x - (pic.x + 22)) / ((pic.w - 36) / VR.rmax);
        }
        if (r != null) st.rt = Sim.clamp(Math.round(r * 200) / 200, 0.05, 0.48);
      }
    }
  });

  /* ======================================================================
     3. Electron beam between parallel plates
     ====================================================================== */
  const PL = { L: 0.08, gun: 0.025, after: 0.075 };
  function beam(p) {
    const d = p.d / 100, v0 = p.v0 * 1e7;
    const E = p.V / d;
    const a = (E_CH * E) / M_E;
    const t = PL.L / v0;
    const yExit = 0.5 * a * t * t;
    let xHit = null;
    if (yExit > d / 2 && a > 0) xHit = v0 * Math.sqrt(d / a);
    const slope = (a * PL.L) / (v0 * v0);
    return { d, v0, E, a, t, yExit, xHit, slope };
  }
  Sim.create('#sim-plates', {
    title: 'Electron beam between parallel plates',
    height: (w) => Math.round(Sim.clamp(w * 0.4, 190, 340)),
    controls: [
      { key: 'V', label: 'p.d. across plates V', min: 0, max: 400, step: 10, value: 150, unit: 'V', format: (v) => v.toFixed(0) },
      { key: 'd', label: 'Plate separation d', min: 1, max: 5, step: 0.5, value: 2, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'v0', label: 'Electron speed', min: 1, max: 6, step: 0.5, value: 3, unit: '×10⁷ m s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'eq', type: 'check', label: 'Show equipotentials', value: true },
      { key: 'swap', type: 'check', label: 'Swap polarity', value: false }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { ph: 0 }; },
    update(s, dt) { s.state.ph += dt * (0.35 + 0.1 * s.p.v0); },
    draw(s) {
      const { ctx, w, h, p } = s;
      const b = beam(p);
      const total = PL.gun + PL.L + PL.after;
      const pxm = (w - 40) / total;
      const x0 = 14;
      const X = (x) => x0 + (PL.gun + x) * pxm;    // x measured from the start of the plates
      const cy = h / 2;
      const up = p.swap ? 1 : -1;                    // screen direction of deflection (towards + plate)
      const Y = (y) => cy + up * y * pxm;
      const half = (b.d / 2) * pxm;
      const topPos = !p.swap;

      // electron gun and screen
      Sim.rect(ctx, x0, cy - 10, PL.gun * pxm * 0.7, 20, { fill: '#495057', r: 4 });
      Sim.text(ctx, 'e⁻ gun', x0 + 4, cy - 20, { size: 11.5, color: C.muted });
      const sx = X(PL.L + PL.after);
      Sim.rect(ctx, sx, 6, 8, h - 12, { fill: '#d3f9d8', stroke: C.green, width: 1 });
      Sim.text(ctx, 'screen', sx - 4, 14, { size: 11.5, color: C.green, align: 'right' });

      // plates
      const px0 = X(0), px1 = X(PL.L);
      Sim.rect(ctx, px0, cy - half - 7, px1 - px0, 7, { fill: topPos ? C.red : C.blue });
      Sim.rect(ctx, px0, cy + half, px1 - px0, 7, { fill: topPos ? C.blue : C.red });
      Sim.text(ctx, topPos ? p.V + ' V' : '0 V', px0, cy - half - 17, { size: 12.5, bold: true, color: topPos ? C.red : C.blue });
      Sim.text(ctx, topPos ? '0 V' : p.V + ' V', px0, cy + half + 18, { size: 12.5, bold: true, color: topPos ? C.blue : C.red });
      Sim.text(ctx, topPos ? '+' : '−', px1 + 8, cy - half - 4, { size: 15, bold: true, color: topPos ? C.red : C.blue });
      Sim.text(ctx, topPos ? '−' : '+', px1 + 8, cy + half + 4, { size: 15, bold: true, color: topPos ? C.blue : C.red });
      // field lines from + to −
      if (p.V > 0) {
        const nL = Math.max(3, Math.round((px1 - px0) / 34));
        for (let i = 0; i <= nL; i++) {
          const fx = px0 + ((px1 - px0) * i) / nL;
          const yA = cy - half, yB = cy + half;
          Sim.line(ctx, fx, yA, fx, yB, { color: 'rgba(0,43,128,0.35)', width: 1.2 });
          const mid = cy + (topPos ? 1 : -1) * Math.min(10, half * 0.3);
          Sim.arrow(ctx, fx, mid - (topPos ? 7 : -7), fx, mid + (topPos ? 7 : -7), { color: 'rgba(0,43,128,0.55)', width: 1.2, head: 6 });
        }
      }
      // equipotentials
      if (p.eq) {
        for (let i = 1; i <= 3; i++) {
          const yy = cy - half + (2 * half * i) / 4;
          Sim.line(ctx, px0, yy, px1, yy, { color: C.green, width: 1.2, dash: [5, 4] });
          const Vhere = topPos ? p.V * (1 - i / 4) : p.V * (i / 4);
          if (half > 34 && i !== 2) Sim.text(ctx, Sim.fmt(Vhere, 3) + ' V', px0 - 6, yy, { size: 11, color: C.green, align: 'right' });
        }
      }
      // trajectory
      const yAt = (x) => {
        if (x <= 0) return 0;
        if (x <= PL.L) return 0.5 * b.a * (x / b.v0) ** 2;
        return b.yExit + b.slope * (x - PL.L);
      };
      const xEnd = b.xHit != null ? b.xHit : PL.L + PL.after;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, h);
      ctx.clip();
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const x = -PL.gun * 0.3 + ((xEnd + PL.gun * 0.3) * i) / 160;
        pts.push([X(x), Y(yAt(x))]);
      }
      Sim.polyline(ctx, pts, { color: 'rgba(0,123,255,0.35)', width: 2 });
      // moving electrons
      const span = xEnd + PL.gun * 0.3;
      const nE = 9;
      for (let i = 0; i < nE; i++) {
        const f = (s.state.ph + i / nE) % 1;
        const x = -PL.gun * 0.3 + f * span;
        Sim.circle(ctx, X(x), Y(yAt(x)), 3.5, { fill: C.blue });
      }
      // force arrow on one electron in the field
      if (p.V > 0) {
        const xf = Math.min(PL.L * 0.45, xEnd * 0.6);
        const ex = X(xf), ey = Y(yAt(xf));
        const fl = Math.min(30, 8 + p.V / 20);
        Sim.arrow(ctx, ex, ey, ex, ey + up * fl, { color: C.orange, width: 2.5, head: 8 });
        Sim.text(ctx, 'F = eE', ex + 8, ey + up * fl * 0.45, { size: 12, bold: true, color: '#b35c00' });
      }
      if (b.xHit != null) {
        const hx = X(b.xHit), hy = Y(b.d / 2);
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4;
          Sim.line(ctx, hx + Math.cos(a) * 3, hy + Math.sin(a) * 3, hx + Math.cos(a) * 9, hy + Math.sin(a) * 9, { color: C.orange, width: 2 });
        }
        Sim.text(ctx, 'hits the plate', hx, hy - up * 18, { size: 12.5, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.85)' });
      } else {
        const ys = Y(yAt(PL.L + PL.after));
        if (ys > 6 && ys < h - 6) Sim.circle(ctx, sx + 4, ys, 5, { fill: '#69db7c', stroke: C.green, width: 1.5 });
      }
      ctx.restore();
      Sim.text(ctx, 'L = 8.0 cm', (px0 + px1) / 2 + 20, Math.min(h - 10, cy + half + 18), { size: 11.5, color: C.muted, align: 'center' });
    },
    readout(s) {
      const b = beam(s.p);
      const out = [
        ['E = V/d =', Sim.fmt(b.E, 3) + ' V m⁻¹'],
        ['F = eE =', Sim.fmt(E_CH * b.E, 3) + ' N'],
        ['a = F/m =', Sim.fmt(b.a, 3) + ' m s⁻²'],
        ['time between plates t = L/v =', Sim.fmt(b.t, 3) + ' s']
      ];
      if (b.xHit != null) out.push(['hits the plate after', (b.xHit * 100).toFixed(1) + ' cm', true]);
      else {
        out.push(['deflection at exit ½at² =', (b.yExit * 1000).toFixed(2) + ' mm', true]);
        out.push(['angle after the plates =', ((Math.atan(b.slope) * 180) / Math.PI).toFixed(1) + '°']);
      }
      return out;
    }
  });

  /* ======================================================================
     4. Field lines and equipotentials of point charges
     ====================================================================== */
  const FM_W = 0.40; // canvas width in metres
  const PRESETS = {
    single: [[0.5, 0.5, 4]],
    neg: [[0.5, 0.5, -4]],
    dipole: [[0.36, 0.5, 4], [0.64, 0.5, -4]],
    like: [[0.36, 0.5, 4], [0.64, 0.5, 4]],
    unequal: [[0.38, 0.5, 6], [0.64, 0.5, -2]]
  };
  const LEVELS = [-1200, -600, -300, -150, 0, 150, 300, 600, 1200];
  function fmSetup(s) {
    const pr = PRESETS[s.p.preset] || PRESETS.single;
    s.state.charges = pr.map((c) => ({ fx: c[0], fy: c[1], q: c[2] }));
    s.state.charges[0].q = s.p.qa;
  }
  Sim.create('#sim-fieldmap', {
    title: 'Field lines and equipotentials',
    height: (w) => (w >= 700 ? 440 : 420),
    controls: [
      {
        key: 'preset', type: 'select', label: 'Charges', value: 'dipole',
        options: [['single', 'One positive charge'], ['neg', 'One negative charge'], ['dipole', '+ and − (a dipole)'], ['like', 'Two positive charges'], ['unequal', 'Big + and small −']],
        onChange: (s) => { const pr = PRESETS[s.p.preset] || PRESETS.single; s.set('qa', pr[0][2]); fmSetup(s); }
      },
      { key: 'qa', label: 'Charge A', min: -8, max: 8, step: 1, value: 4, unit: 'nC', format: (v) => (v > 0 ? '+' : '') + v.toFixed(0), onChange: (s, v) => { s.state.charges[0].q = v; } },
      { key: 'lines', type: 'check', label: 'Field lines', value: true },
      { key: 'eqp', type: 'check', label: 'Equipotentials', value: true }
    ],
    init(s) {
      s.state = { test: { fx: 0.5, fy: 0.22 }, drag: null };
      fmSetup(s);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const pxm = w / FM_W;
      const ch = st.charges.map((c) => ({ x: c.fx * w, y: c.fy * h, q: c.q }));
      const field = (x, y) => {
        let ex = 0, ey = 0;
        for (const c of ch) {
          const dx = (x - c.x) / pxm, dy = (y - c.y) / pxm;
          const r2 = Math.max(dx * dx + dy * dy, 1e-6);
          const r = Math.sqrt(r2);
          const k = (K * c.q * 1e-9) / (r2 * r);
          ex += k * dx; ey += k * dy;
        }
        return [ex, ey];
      };
      const pot = (x, y) => {
        let v = 0;
        for (const c of ch) {
          const r = Math.max(Math.hypot(x - c.x, y - c.y) / pxm, 1e-4);
          v += (K * c.q * 1e-9) / r;
        }
        return v;
      };
      Sim.rect(ctx, 0, 0, w, h, { fill: '#fbfcfe' });

      // equipotentials by marching squares
      if (p.eqp) {
        const gs = 6;
        const nx = Math.ceil(w / gs) + 1, ny = Math.ceil(h / gs) + 1;
        const V = new Float64Array(nx * ny);
        for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) V[j * nx + i] = Sim.clamp(pot(i * gs, j * gs), -2e4, 2e4);
        ctx.save();
        ctx.strokeStyle = 'rgba(47,158,68,0.85)';
        ctx.lineWidth = 1.3;
        for (const L of LEVELS) {
          ctx.beginPath();
          for (let j = 0; j < ny - 1; j++) {
            for (let i = 0; i < nx - 1; i++) {
              const a = V[j * nx + i], b = V[j * nx + i + 1], c = V[(j + 1) * nx + i + 1], d = V[(j + 1) * nx + i];
              const idx = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
              if (idx === 0 || idx === 15) continue;
              const x = i * gs, y = j * gs;
              const top = [x + gs * ((L - a) / (b - a)), y];
              const right = [x + gs, y + gs * ((L - b) / (c - b))];
              const bottom = [x + gs * ((L - d) / (c - d)), y + gs];
              const left = [x, y + gs * ((L - a) / (d - a))];
              const seg = (P, Q) => { ctx.moveTo(P[0], P[1]); ctx.lineTo(Q[0], Q[1]); };
              switch (idx) {
                case 1: case 14: seg(left, bottom); break;
                case 2: case 13: seg(bottom, right); break;
                case 3: case 12: seg(left, right); break;
                case 4: case 11: seg(top, right); break;
                case 6: case 9: seg(top, bottom); break;
                case 7: case 8: seg(left, top); break;
                case 5: seg(left, top); seg(bottom, right); break;
                case 10: seg(top, right); seg(left, bottom); break;
              }
            }
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      // field lines
      if (p.lines) {
        const step = 4;
        const near = (x, y, skip) => ch.findIndex((c, k) => k !== skip && Math.hypot(x - c.x, y - c.y) < 9);
        const trace = (x, y, sign, from) => {
          const pts = [[x, y]];
          let end = null;
          for (let n = 0; n < 700; n++) {
            let [ex, ey] = field(x, y);
            let m = Math.hypot(ex, ey);
            if (m < 1e-3) break;
            const mx = x + (sign * ex / m) * step * 0.5, my = y + (sign * ey / m) * step * 0.5;
            [ex, ey] = field(mx, my);
            m = Math.hypot(ex, ey);
            if (m < 1e-3) break;
            x += (sign * ex / m) * step;
            y += (sign * ey / m) * step;
            pts.push([x, y]);
            const k = near(x, y, from);
            if (k >= 0) { end = k; break; }
            if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
          }
          return { pts, end };
        };
        const lines = [];
        const hasPos = ch.some((c) => c.q > 0);
        ch.forEach((c, k) => {
          if (c.q === 0) return;
          const n = Math.max(4, Math.round(Math.abs(c.q) * 3));
          for (let j = 0; j < n; j++) {
            const ang = (2 * Math.PI * (j + 0.5)) / n;
            const sx = c.x + Math.cos(ang) * 11, sy = c.y + Math.sin(ang) * 11;
            if (c.q > 0) lines.push({ pts: trace(sx, sy, 1, k).pts, dir: 1 });
            else {
              const tr = trace(sx, sy, -1, k);
              if (!hasPos || tr.end == null || ch[tr.end].q <= 0) lines.push({ pts: tr.pts, dir: -1 });
            }
          }
        });
        lines.forEach((ln) => {
          Sim.polyline(ctx, ln.pts, { color: 'rgba(0,43,128,0.75)', width: 1.4 });
          const n = ln.pts.length;
          if (n > 14) {
            const i = Math.min(n - 3, Math.max(8, Math.round(n * 0.35)));
            const a = ln.pts[i], b = ln.pts[i + 2];
            const ux = (b[0] - a[0]) * ln.dir, uy = (b[1] - a[1]) * ln.dir;
            const L = Math.hypot(ux, uy) || 1;
            const tipx = a[0] + (ux / L) * 5, tipy = a[1] + (uy / L) * 5;
            Sim.arrow(ctx, tipx - (ux / L) * 8, tipy - (uy / L) * 8, tipx, tipy, { color: C.navy, width: 1.4, head: 8 });
          }
        });
      }

      // charges
      ch.forEach((c, k) => charge(ctx, c.x, c.y, c.q, 13, (k === 0 ? 'A ' : 'B ') + sgnLabel(c.q, 'nC')));

      // test charge and force arrow
      const tx = st.test.fx * w, ty = st.test.fy * h;
      const [ex, ey] = field(tx, ty);
      const Em = Math.hypot(ex, ey);
      if (Em > 1) {
        const L = Sim.clamp(20 + 18 * Math.log10(Em / 1000), 10, 90);
        Sim.arrow(ctx, tx, ty, tx + (ex / Em) * L, ty + (ey / Em) * L, { color: C.red, width: 3 });
      }
      Sim.circle(ctx, tx, ty, 7, { fill: '#ffd43b', stroke: '#e67700', width: 1.5 });
      Sim.text(ctx, '+', tx, ty + 0.5, { size: 11, bold: true, color: '#7a4a00', align: 'center' });
      Sim.text(ctx, 'scale: ' + (FM_W * 100).toFixed(0) + ' cm across · drag the charges and the test charge', 10, h - 12, { size: 11, color: C.muted });
      st.fieldAt = field;
      st.potAt = pot;
    },
    readout(s) {
      const st = s.state;
      if (!st.fieldAt) return [];
      const tx = st.test.fx * s.w, ty = st.test.fy * s.h;
      const [ex, ey] = st.fieldAt(tx, ty);
      const Em = Math.hypot(ex, ey);
      const V = st.potAt(tx, ty);
      const ang = (Math.atan2(-ey, ex) * 180) / Math.PI;
      return [
        ['at the test charge: E =', Sim.fmt(Em, 3) + ' N C⁻¹', true],
        ['direction of E =', ang.toFixed(0) + '° from the +x axis'],
        ['V =', Sim.fmt(V, 3) + ' V', true],
        ['force on a +1.0 nC test charge =', Sim.fmt(Em * 1e-9, 3) + ' N'],
        ['green lines:', '…, −300, −150, 0, +150, +300, … V']
      ];
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const st = s.state;
        const tx = st.test.fx * s.w, ty = st.test.fy * s.h;
        st.drag = null;
        if (Math.hypot(pt.x - tx, pt.y - ty) < 18) st.drag = 'test';
        else {
          let best = 22, bi = -1;
          st.charges.forEach((c, k) => { const d = Math.hypot(pt.x - c.fx * s.w, pt.y - c.fy * s.h); if (d < best) { best = d; bi = k; } });
          if (bi >= 0) st.drag = bi;
        }
        s.canvas.style.cursor = st.drag != null ? 'grabbing' : 'grab';
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || st.drag == null) return;
        const fx = Sim.clamp(pt.x, 14, s.w - 14) / s.w, fy = Sim.clamp(pt.y, 14, s.h - 24) / s.h;
        if (st.drag === 'test') { st.test.fx = fx; st.test.fy = fy; }
        else { st.charges[st.drag].fx = fx; st.charges[st.drag].fy = fy; }
      },
      up(s) { s.state.drag = null; s.canvas.style.cursor = 'grab'; }
    }
  });
})();
