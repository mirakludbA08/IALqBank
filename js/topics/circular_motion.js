/* Circular Motion — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const DEG = Math.PI / 180;
  const TAU = Math.PI * 2;

  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  }
  function panel(ctx, b, title) {
    Sim.rect(ctx, b.x, b.y, b.w, b.h, { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 8 });
    if (title) Sim.text(ctx, title, b.x + 10, b.y + 15, { size: 12.5, bold: true, color: C.navy });
  }
  function handle(ctx, x, y) {
    Sim.circle(ctx, x, y, 9, { fill: '#fff', stroke: C.navy, width: 2.5 });
    Sim.circle(ctx, x, y, 3, { fill: C.navy });
  }

  /* ======================================================================
     1. Radians: arc length = rθ
     ====================================================================== */
  Sim.create('#sim-radian', {
    title: 'Radians: arc length = rθ',
    height: (w) => (w >= 640 ? 360 : Math.round(Math.min(130, w / 2 - 34) * 2 + 150)),
    controls: [
      { key: 'r', label: 'Radius r', min: 2, max: 6, step: 0.5, value: 4, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'marks', type: 'check', label: 'Show radius-length pieces', value: true },
      { type: 'button', label: '1 rad', ghost: true, onClick: (s) => { s.state.th = 1; } },
      { type: 'button', label: '90°', ghost: true, onClick: (s) => { s.state.th = Math.PI / 2; } },
      { type: 'button', label: '180°', ghost: true, onClick: (s) => { s.state.th = Math.PI; } },
      { type: 'button', label: '360°', ghost: true, onClick: (s) => { s.state.th = TAU; } }
    ],
    init(s) { s.state = { th: 2.0, drag: false }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const Rmax = wide ? Math.min(h / 2 - 34, w * 0.26) : Math.min(130, w / 2 - 34);
      const k = Rmax / 6;
      const R = p.r * k;
      const cx = wide ? Rmax + 50 : w / 2, cy = wide ? h / 2 : Rmax + 30;
      st.geo = { cx, cy, R };
      const th = Sim.clamp(st.th, 0, TAU);

      Sim.circle(ctx, cx, cy, R, { stroke: '#ced4da', width: 1.5, dash: [5, 4] });
      // sector
      if (th > 0.001) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, 0, -th, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(240,140,0,0.10)';
        ctx.fill();
        ctx.restore();
      }
      // arc, in radius-length pieces
      const n = Math.ceil(th - 1e-9);
      for (let i = 0; i < n; i++) {
        const a0 = i, a1 = Math.min(i + 1, th);
        const col = !p.marks || i % 2 === 0 ? C.orange : C.blue;
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth = 6;
        ctx.lineCap = 'butt';
        ctx.beginPath();
        ctx.arc(cx, cy, R, -a0, -a1, true);
        ctx.stroke();
        ctx.restore();
        if (p.marks && a1 - a0 > 0.999) {
          const am = (a0 + a1) / 2;
          Sim.text(ctx, String(i + 1), cx + Math.cos(am) * (R + 15), cy - Math.sin(am) * (R + 15), { size: 12.5, bold: true, color: col, align: 'center' });
        }
      }
      Sim.line(ctx, cx, cy, cx + R, cy, { color: C.navy, width: 2.5 });
      Sim.line(ctx, cx, cy, cx + Math.cos(th) * R, cy - Math.sin(th) * R, { color: C.navy, width: 2.5 });
      Sim.text(ctx, 'r', cx + R / 2, cy + 12, { size: 14, bold: true, color: C.navy, align: 'center' });
      if (th > 0.05) Sim.arc(ctx, cx, cy, 22, 0, -th, { color: C.ink, width: 1.5 });
      const am = th / 2;
      if (th > 0.25) Sim.text(ctx, 'θ', cx + Math.cos(am) * 36, cy - Math.sin(am) * 36, { size: 15, bold: true, color: C.ink, align: 'center' });
      Sim.circle(ctx, cx, cy, 3.5, { fill: C.ink });
      handle(ctx, cx + Math.cos(th) * R, cy - Math.sin(th) * R);

      // the arc "unrolled" into a straight line of radius-lengths
      const sx0 = wide ? cx + Rmax + 60 : 24;
      const sx1 = w - 24;
      const sy = wide ? cy - 20 : cy + Rmax + 62;
      const seg = (sx1 - sx0) / TAU;
      Sim.text(ctx, 'the arc, straightened out', sx0, sy - 44, { size: 12.5, bold: true, color: C.navy });
      Sim.line(ctx, sx0, sy - 22, sx0 + seg, sy - 22, { color: C.navy, width: 3 });
      Sim.text(ctx, 'one radius', sx0 + seg + 8, sy - 22, { size: 12, color: C.navy });
      Sim.line(ctx, sx0, sy, sx1, sy, { color: '#e9ecef', width: 6, cap: 'butt' });
      for (let i = 0; i < n; i++) {
        const a0 = i, a1 = Math.min(i + 1, th);
        const col = !p.marks || i % 2 === 0 ? C.orange : C.blue;
        Sim.line(ctx, sx0 + a0 * seg, sy, sx0 + a1 * seg, sy, { color: col, width: 6, cap: 'butt' });
        if (p.marks) Sim.line(ctx, sx0 + a1 * seg, sy - 6, sx0 + a1 * seg, sy + 6, { color: C.ink, width: 1 });
      }
      for (let i = 1; i <= 6; i++) Sim.text(ctx, i + ' r', sx0 + i * seg, sy + 16, { size: 11, color: C.muted, align: 'center' });
      Sim.text(ctx, '2πr', sx1, sy - 12, { size: 11, color: C.muted, align: 'right' });
      Sim.text(ctx, 's = ' + th.toFixed(2) + ' × r = ' + (p.r * th).toFixed(1) + ' cm', sx0, sy + 38, { size: 14, bold: true, color: '#b35c00' });
    },
    readout(s) {
      const th = Sim.clamp(s.state.th, 0, TAU);
      return [
        ['θ =', (th / DEG).toFixed(1) + '°'],
        ['θ =', th.toFixed(3) + ' rad', true],
        ['arc length s = rθ =', (s.p.r * th).toFixed(2) + ' cm'],
        ['s / r =', th.toFixed(3)],
        ['fraction of a turn =', (th / TAU).toFixed(3)]
      ];
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const g = s.state.geo;
        if (!g) return;
        const d = Math.hypot(pt.x - g.cx, pt.y - g.cy);
        s.state.drag = d < g.R + 36 && d > 6;
        if (s.state.drag) this.move(s, pt);
      },
      move(s, pt) {
        const st = s.state, g = st.geo;
        if (!pt.down || !st.drag || !g) return;
        let a = Math.atan2(-(pt.y - g.cy), pt.x - g.cx);
        if (a < 0) a += TAU;
        if (st.th > 5.2 && a < 1.0) a = TAU;
        else if (st.th < 1.0 && a > 5.2) a = 0;
        st.th = a;
      },
      up(s) { s.state.drag = false; }
    }
  });

  /* ======================================================================
     2. Δv vector diagram builder
     ====================================================================== */
  Sim.create('#sim-deltav', {
    title: 'Where a = v²/r comes from',
    height: (w) => (w >= 700 ? 380 : 620),
    controls: [
      { key: 'dth', label: 'Angle turned Δθ', min: 2, max: 120, step: 1, value: 60, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'v', label: 'Speed v', min: 2, max: 10, step: 0.5, value: 6, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'r', label: 'Radius r', min: 1, max: 5, step: 0.5, value: 3, unit: 'm', format: (v) => v.toFixed(1) },
      { type: 'button', label: 'Shrink Δθ ▶', onClick: (s) => { s.state.shrink = true; s.play(); } },
      { type: 'button', label: 'Back to 60°', ghost: true, onClick: (s) => { s.state.shrink = false; s.pause(); s.set('dth', 60); } }
    ],
    animate: true,
    autoplay: false,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { shrink: false }; },
    update(s, dt) {
      const st = s.state;
      if (!st.shrink) { s.pause(); return; }
      const nv = Math.max(2, s.p.dth * Math.exp(-0.9 * dt));
      s.set('dth', nv);
      if (nv <= 2) { st.shrink = false; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 700;
      const L = wide ? { x: 8, y: 8, w: w * 0.48 - 12, h: h - 16 } : { x: 8, y: 8, w: w - 16, h: 300 };
      const Rb = wide ? { x: w * 0.48 + 4, y: 8, w: w * 0.52 - 12, h: h - 16 } : { x: 8, y: 316, w: w - 16, h: h - 324 };
      const d = p.dth * DEG;
      panel(ctx, L, 'Velocity at A and at B');
      panel(ctx, Rb, 'Same vectors, tail to tail');

      // circle
      const RL = Math.min(L.w, L.h) / 2 - 44;
      const cx = L.x + L.w / 2, cy = L.y + L.h / 2 + 34;
      const Lv = RL * 0.08 * p.v;
      const P = (a) => [cx + RL * Math.cos(a), cy - RL * Math.sin(a)];
      const tan = (a) => [Math.sin(a), Math.cos(a)]; // clockwise motion, screen coords
      const aA = Math.PI / 2 + d / 2, aB = Math.PI / 2 - d / 2;
      const A = P(aA), B = P(aB), M = P(Math.PI / 2);
      Sim.circle(ctx, cx, cy, RL, { stroke: '#ced4da', width: 1.5, dash: [5, 4] });
      ctx.save();
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, RL, -aA, -aB, false);
      ctx.stroke();
      ctx.restore();
      Sim.line(ctx, cx, cy, A[0], A[1], { color: C.grey, width: 1.2 });
      Sim.line(ctx, cx, cy, B[0], B[1], { color: C.grey, width: 1.2 });
      Sim.arc(ctx, cx, cy, 24, -aA, -aB, { color: C.ink });
      if (p.dth > 12) Sim.text(ctx, 'Δθ', cx, cy - 38, { size: 13, bold: true, color: C.ink, align: 'center' });
      Sim.circle(ctx, cx, cy, 3.5, { fill: C.ink });
      Sim.text(ctx, 'O', cx + 8, cy + 12, { size: 12.5, color: C.ink });
      const tA = tan(aA), tB = tan(aB);
      Sim.arrow(ctx, A[0], A[1], A[0] + tA[0] * Lv, A[1] + tA[1] * Lv, { color: C.blue, width: 3 });
      Sim.arrow(ctx, B[0], B[1], B[0] + tB[0] * Lv, B[1] + tB[1] * Lv, { color: C.red, width: 3 });
      Sim.circle(ctx, A[0], A[1], 5, { fill: C.navy });
      Sim.circle(ctx, B[0], B[1], 5, { fill: C.navy });
      Sim.text(ctx, 'A', A[0] - 12, A[1] + 6, { size: 13, bold: true, color: C.navy, align: 'right' });
      Sim.text(ctx, 'B', B[0] + 12, B[1] + 6, { size: 13, bold: true, color: C.navy });
      const dvLen = 2 * Lv * Math.sin(d / 2);
      Sim.line(ctx, M[0], M[1], cx, cy, { color: C.green, width: 1, dash: [4, 4] });
      if (dvLen > 1) Sim.arrow(ctx, M[0], M[1], M[0], M[1] + dvLen, { color: C.green, width: 3, head: Math.min(12, dvLen * 0.8) });
      Sim.text(ctx, 'Δv', M[0] + 8, M[1] + Math.max(10, dvLen / 2), { size: 13, color: C.green, bold: true });
      Sim.text(ctx, 'green: Δv drawn at the middle of the arc, pointing at O', L.x + L.w / 2, L.y + L.h - 12, { size: 11.5, color: C.green, align: 'center' });

      // vector triangle
      const LvT = Math.min(Rb.w - 120, (Rb.h - 80) / 1.75) * (0.45 + 0.055 * p.v);
      const Q = [Rb.x + 44, Rb.y + Rb.h / 2 + 8];
      const uA = [Math.cos(d / 2), -Math.sin(d / 2)], uB = [Math.cos(d / 2), Math.sin(d / 2)];
      const TA = [Q[0] + uA[0] * LvT, Q[1] + uA[1] * LvT], TB = [Q[0] + uB[0] * LvT, Q[1] + uB[1] * LvT];
      // the arc of length vΔθ
      ctx.save();
      ctx.strokeStyle = 'rgba(240,140,0,0.9)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Q[0], Q[1], LvT, -d / 2, d / 2, false);
      ctx.stroke();
      ctx.restore();
      Sim.arrow(ctx, Q[0], Q[1], TA[0], TA[1], { color: C.blue, width: 3 });
      Sim.arrow(ctx, Q[0], Q[1], TB[0], TB[1], { color: C.red, width: 3 });
      if (TB[1] - TA[1] > 1) Sim.arrow(ctx, TA[0], TA[1], TB[0], TB[1], { color: C.green, width: 3.5, head: Math.min(13, (TB[1] - TA[1]) * 0.8) });
      Sim.arc(ctx, Q[0], Q[1], 30, -d / 2, d / 2, { color: C.ink });
      if (p.dth > 10) Sim.text(ctx, 'Δθ', Q[0] + 44, Q[1], { size: 13, bold: true, color: C.ink });
      Sim.text(ctx, 'v_A', (Q[0] + TA[0]) / 2 - 6, (Q[1] + TA[1]) / 2 - 14, { size: 13.5, bold: true, color: C.blue, align: 'center' });
      Sim.text(ctx, 'v_B', (Q[0] + TB[0]) / 2 - 6, (Q[1] + TB[1]) / 2 + 14, { size: 13.5, bold: true, color: C.red, align: 'center' });
      Sim.text(ctx, 'Δv', TA[0] + 12, (TA[1] + TB[1]) / 2, { size: 13.5, bold: true, color: C.green });
      Sim.text(ctx, 'dashed arc: length vΔθ', Rb.x + Rb.w - 10, Rb.y + Rb.h - 14, { size: 11.5, color: '#b35c00', align: 'right' });
      Sim.text(ctx, '↓ towards the centre', TA[0] + 12, (TA[1] + TB[1]) / 2 + 17, { size: 11.5, color: C.green });
    },
    readout(s) {
      const { v, r } = s.p;
      const d = s.p.dth * DEG;
      const dv = 2 * v * Math.sin(d / 2);
      const dt = (r * d) / v;
      return [
        ['Δθ =', s.p.dth.toFixed(1) + '° = ' + d.toFixed(3) + ' rad'],
        ['|Δv| = 2v sin(Δθ/2) =', dv.toFixed(3) + ' m s⁻¹'],
        ['vΔθ =', (v * d).toFixed(3) + ' m s⁻¹'],
        ['|Δv| ÷ vΔθ =', (dv / (v * d)).toFixed(4), true],
        ['Δt = rΔθ / v =', dt.toFixed(3) + ' s'],
        ['average a = |Δv|/Δt =', (dv / dt).toFixed(2) + ' m s⁻²'],
        ['v²/r =', ((v * v) / r).toFixed(2) + ' m s⁻²', true]
      ];
    }
  });

  /* ======================================================================
     3. Puck on a string (top view) with "cut the string"
     ====================================================================== */
  Sim.create('#sim-string', {
    title: 'Puck on a string: centripetal force',
    height: (w) => (w >= 700 ? 400 : Math.round(w * 0.9 + 230)),
    controls: [
      { key: 'r', label: 'Radius r', min: 0.2, max: 1.0, step: 0.05, value: 0.6, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'w', label: 'Angular velocity ω', min: 0.5, max: 6, step: 0.1, value: 2.5, unit: 'rad s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'm', label: 'Mass m', min: 0.1, max: 1.0, step: 0.05, value: 0.5, unit: 'kg', format: (v) => v.toFixed(2) },
      { key: 'inner', type: 'check', label: 'Second puck at half the radius', value: false },
      { type: 'button', label: '✂ Cut the string', onClick: (s) => cutString(s) }
    ],
    animate: true,
    init(s) { s.state = { th: 0.3, cut: null, trail: [], tt: 0 }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      st.tt += dt;
      if (!st.cut) st.th = (st.th + p.w * dt) % TAU;
      else {
        st.cut.x += st.cut.vx * dt;
        st.cut.y += st.cut.vy * dt;
        st.cut.t += dt;
      }
      if (st.tt >= 0.1) {
        st.tt = 0;
        st.trail.push(st.cut ? [st.cut.x, st.cut.y] : [p.r * Math.cos(st.th), p.r * Math.sin(st.th)]);
        if (st.trail.length > (st.cut ? 40 : 14)) st.trail.shift();
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 8, y: 8, w: Math.min(h - 16, w * 0.5), h: h - 16 } : { x: 8, y: 8, w: w - 16, h: Math.round(w * 0.9) - 16 };
      const gb = wide ? { x: sc.x + sc.w + 64, y: 40, w: w - sc.x - sc.w - 64 - 22, h: h - 40 - 40 } : { x: 56, y: sc.y + sc.h + 40, w: w - 56 - 20, h: h - sc.y - sc.h - 40 - 40 };
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#e7f5ff', stroke: '#a5d8ff', width: 1.5, r: 10 });
      const cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2;
      const pxm = (Math.min(sc.w, sc.h) / 2 - 34) / 1.0;
      const X = (x) => cx + x * pxm, Y = (y) => cy - y * pxm;
      const v = p.w * p.r, a = p.w * p.w * p.r, F = p.m * a;

      Sim.circle(ctx, cx, cy, p.r * pxm, { stroke: '#74c0fc', width: 1.5, dash: [5, 5] });
      ctx.save();
      ctx.beginPath();
      ctx.rect(sc.x, sc.y, sc.w, sc.h);
      ctx.clip();
      st.trail.forEach((q) => Sim.circle(ctx, X(q[0]), Y(q[1]), 3, { fill: 'rgba(0,123,255,0.45)' }));
      let px, py;
      if (!st.cut) {
        px = X(p.r * Math.cos(st.th));
        py = Y(p.r * Math.sin(st.th));
        if (p.inner) {
          const ix = X(0.5 * p.r * Math.cos(st.th)), iy = Y(0.5 * p.r * Math.sin(st.th));
          Sim.line(ctx, cx, cy, ix, iy, { color: '#495057', width: 1.5 });
          Sim.circle(ctx, cx, cy, 0.5 * p.r * pxm, { stroke: '#d0bfff', width: 1, dash: [3, 4] });
          Sim.circle(ctx, ix, iy, 9, { fill: C.purple, stroke: '#fff', width: 2 });
          const iux = -Math.sin(st.th), iuy = -Math.cos(st.th);
          Sim.arrow(ctx, ix, iy, ix + iux * Math.min(120, 11 * v), iy + iuy * Math.min(120, 11 * v), { color: C.purple, width: 2 });
        }
        Sim.line(ctx, cx, cy, px, py, { color: '#495057', width: 1.8 });
        // force (towards centre) and velocity (tangent) arrows
        const rx = (cx - px) / (p.r * pxm), ry = (cy - py) / (p.r * pxm);
        const fl = Math.min(0.8 * p.r * pxm, 30 + 8 * F);
        Sim.arrow(ctx, px, py, px + rx * fl, py + ry * fl, { color: C.red, width: 3 });
        const ux = -Math.sin(st.th), uy = -Math.cos(st.th);
        const vl = Math.min(130, 22 * v);
        Sim.arrow(ctx, px, py, px + ux * vl, py + uy * vl, { color: C.blue, width: 3 });
        const lo = 12 + 28 * Math.abs(ry);
        Sim.text(ctx, 'T = ' + F.toFixed(1) + ' N', px + rx * fl * 0.5 + ry * lo, py + ry * fl * 0.5 - rx * lo, { size: 12, bold: true, color: C.red, align: 'center', bg: 'rgba(231,245,255,0.85)' });
        Sim.text(ctx, 'v', px + ux * (vl + 12), py + uy * (vl + 12), { size: 13, bold: true, color: C.blue, align: 'center' });
      } else {
        px = X(st.cut.x);
        py = Y(st.cut.y);
        Sim.line(ctx, X(st.cut.x0), Y(st.cut.y0), X(st.cut.x0 + st.cut.vx * 8), Y(st.cut.y0 + st.cut.vy * 8), { color: C.blue, width: 1, dash: [5, 5] });
        Sim.line(ctx, cx, cy, cx + 14, cy + 18, { color: '#495057', width: 1.8 });
        const vl = Math.min(130, 22 * v);
        Sim.arrow(ctx, px, py, px + (st.cut.vx / v) * vl, py - (st.cut.vy / v) * vl, { color: C.blue, width: 3 });
      }
      Sim.circle(ctx, cx, cy, 5, { fill: '#495057' });
      Sim.circle(ctx, px, py, 12, { fill: C.navy, stroke: '#fff', width: 2 });
      ctx.restore();
      if (st.cut) {
        Sim.text(ctx, 'No string → no resultant force →', sc.x + sc.w / 2, sc.y + 18, { size: 12.5, bold: true, color: C.navy, align: 'center', bg: 'rgba(231,245,255,0.9)' });
        Sim.text(ctx, 'straight line along the tangent', sc.x + sc.w / 2, sc.y + 36, { size: 12.5, bold: true, color: C.navy, align: 'center', bg: 'rgba(231,245,255,0.9)' });
      } else Sim.text(ctx, 'top view · frictionless table', sc.x + 10, sc.y + sc.h - 12, { size: 11.5, color: C.muted });

      // F against ω graph
      const ymax = niceMax(p.m * p.r * 36 * 1.05);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 6.5, ymin: 0, ymax, xlabel: 'ω / rad s⁻¹', ylabel: 'F / N', title: 'Centripetal force F = mrω²' }, gb)).axes();
      if (p.inner) {
        g.plot((x) => p.m * 0.5 * p.r * x * x, { color: C.purple, width: 2, dash: [6, 4] });
        g.dot(p.w, p.m * 0.5 * p.r * p.w * p.w, { color: C.purple, r: 5 });
      }
      g.plot((x) => p.m * p.r * x * x, { color: C.red, width: 2.5 });
      g.dot(p.w, F, { color: C.red, label: 'F = ' + F.toFixed(2) + ' N', dx: -10, dy: -14, align: 'right' });
      const w2 = Math.min(p.w * 2, 6.5);
      if (p.w * 2 <= 6.5) {
        g.dot(w2, p.m * p.r * w2 * w2, { color: C.grey, r: 4 });
        g.label(w2, p.m * p.r * w2 * w2, '  2ω → 4F', { size: 11.5, color: C.grey, align: 'left', bold: false });
      }
    },
    readout(s) {
      const p = s.p;
      const v = p.w * p.r;
      const out = [
        ['v = ωr =', v.toFixed(2) + ' m s⁻¹'],
        ['T = 2π/ω =', (TAU / p.w).toFixed(2) + ' s'],
        ['a = v²/r = rω² =', (p.w * p.w * p.r).toFixed(2) + ' m s⁻²'],
        ['F = mrω² =', (p.m * p.r * p.w * p.w).toFixed(2) + ' N', true]
      ];
      if (p.inner) out.push(['inner puck: v =', (v / 2).toFixed(2) + ' m s⁻¹, F = ' + (p.m * p.r * 0.5 * p.w * p.w).toFixed(2) + ' N']);
      if (s.state.cut) out.push(['string cut:', 'F = 0, so v stays ' + v.toFixed(2) + ' m s⁻¹ in a straight line']);
      return out;
    }
  });
  function cutString(s) {
    const st = s.state, p = s.p;
    if (st.cut) return;
    const x = p.r * Math.cos(st.th), y = p.r * Math.sin(st.th);
    const v = p.w * p.r;
    st.cut = { x, y, x0: x, y0: y, vx: -Math.sin(st.th) * v, vy: Math.cos(st.th) * v, t: 0 };
    st.trail = [];
    if (!s.running) s.play();
  }

  /* ======================================================================
     4. Car on a bend: friction needed rises with v²
     ====================================================================== */
  const CAR_M = 1200;
  const ROADS = { dry: 0.8, wet: 0.45, icy: 0.1 };
  function drawCar(ctx, x, y, hx, hy, col) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.atan2(hy, hx));
    Sim.rect(ctx, -13, -7, 26, 14, { fill: col, r: 4 });
    Sim.rect(ctx, 2, -5, 6, 10, { fill: '#dbe8ff', r: 2 });
    Sim.rect(ctx, -10, -5, 5, 10, { fill: '#dbe8ff', r: 2 });
    ctx.restore();
  }
  Sim.create('#sim-bend', {
    title: 'Car on a flat bend',
    height: (w) => (w >= 700 ? 380 : 560),
    controls: [
      { key: 'v', label: 'Speed v', min: 5, max: 35, step: 1, value: 15, unit: 'm s⁻¹', format: (v) => v.toFixed(0) },
      { key: 'r', label: 'Radius of bend r', min: 20, max: 150, step: 5, value: 60, unit: 'm', format: (v) => v.toFixed(0) },
      { key: 'road', type: 'select', label: 'Road surface', value: 'dry', options: [['dry', 'Dry (grip ≤ 0.80 mg)'], ['wet', 'Wet (grip ≤ 0.45 mg)'], ['icy', 'Icy (grip ≤ 0.10 mg)']] }
    ],
    animate: true,
    onChange(s) { s.state.d = 0; s.state.wait = 0; },
    init(s) { s.state = { d: 0, wait: 0 }; },
    update(s, dt) {
      const st = s.state;
      if (st.wait > 0) { st.wait -= dt; if (st.wait <= 0) st.d = 0; return; }
      st.d += dt * (50 + 6 * s.p.v);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 8, y: 8, w: w * 0.5 - 12, h: h - 16 } : { x: 8, y: 8, w: w - 16, h: 290 };
      const gb = wide ? { x: w * 0.5 + 56, y: 40, w: w * 0.5 - 56 - 22, h: h - 40 - 40 } : { x: 56, y: sc.y + sc.h + 40, w: w - 56 - 20, h: h - sc.y - sc.h - 40 - 40 };
      const k = ROADS[p.road] || 0.8;
      const Fneed = (CAR_M * p.v * p.v) / p.r, Fmax = k * CAR_M * G;
      const skid = Fneed > Fmax;
      const vmax = Math.sqrt(k * G * p.r);

      // scene
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#d3f9d8', stroke: '#b2f2bb', width: 1, r: 10 });
      const Lin = 50, Lout = 50, rw = 15;
      const Rmax = Math.min(sc.w, sc.h) - Lin - rw - 34;
      const R = Rmax * (0.36 + (0.64 * (p.r - 20)) / 130);
      const Cx = sc.x + (sc.w - (Lin + R + rw)) / 2 + Lin;
      const Cy = sc.y + (sc.h - (Lout + R + rw)) / 2 + Lout;
      // road
      ctx.save();
      ctx.strokeStyle = '#868e96';
      ctx.lineWidth = 2 * rw;
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(sc.x + 4, Cy + R);
      ctx.lineTo(Cx, Cy + R);
      ctx.arc(Cx, Cy, R, Math.PI / 2, 0, true);
      ctx.lineTo(Cx + R, sc.y + 4);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(sc.x + 4, Cy + R);
      ctx.lineTo(Cx, Cy + R);
      ctx.arc(Cx, Cy, R, Math.PI / 2, 0, true);
      ctx.lineTo(Cx + R, sc.y + 4);
      ctx.stroke();
      ctx.restore();
      Sim.circle(ctx, Cx, Cy, 3, { fill: C.ink });
      Sim.line(ctx, Cx, Cy, Cx + R * Math.SQRT1_2, Cy + R * Math.SQRT1_2, { color: C.ink, width: 1, dash: [3, 4] });
      Sim.text(ctx, 'r = ' + p.r + ' m', Cx + 8, Cy - 10, { size: 12, color: C.ink, bold: true });

      // car position along its path
      const Ra = skid ? R * Math.min(40, (p.v * p.v) / (k * G) / p.r) : R;
      const Cay = Cy + R - Ra;
      const startX = sc.x + 4 - 20;
      const L1 = Cx - startX;
      let x, y, hx, hy, off = false;
      if (st.d < L1) { x = startX + st.d; y = Cy + R; hx = 1; hy = 0; }
      else {
        const phi = (st.d - L1) / Ra;
        const phiEnd = Math.PI / 2;
        if (!skid && phi > phiEnd) {
          const e = (phi - phiEnd) * Ra;
          x = Cx + R; y = Cy - e; hx = 0; hy = -1;
          if (y < sc.y - 20) { st.d = 0; }
        } else {
          x = Cx + Ra * Math.sin(phi);
          y = Cay + Ra * Math.cos(phi);
          hx = Math.cos(phi); hy = -Math.sin(phi);
          if (skid && Math.hypot(x - Cx, y - Cy) > R + rw + 4) off = true;
          if (x > sc.x + sc.w + 20 || y < sc.y - 20 || phi > phiEnd) { if (st.wait <= 0) st.wait = 0.6; }
        }
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(sc.x, sc.y, sc.w, sc.h);
      ctx.clip();
      if (skid && st.d > L1) {
        ctx.save();
        ctx.strokeStyle = 'rgba(224,49,49,0.6)';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(Cx, Cay, Ra, Math.PI / 2, Math.PI / 2 - Math.min(Math.PI / 2, (st.d - L1) / Ra), true);
        ctx.stroke();
        ctx.restore();
      }
      drawCar(ctx, x, y, hx, hy, skid ? C.red : C.blue);
      // friction arrow towards the centre while on the bend
      if (st.d >= L1 && !(!skid && (st.d - L1) / Ra > Math.PI / 2)) {
        const dx = (skid ? Cx : Cx) - x, dy = (skid ? Cay : Cy) - y;
        const dl = Math.hypot(dx, dy) || 1;
        const fl = Math.min(60, 12 + (Math.min(Fneed, Fmax) / 1000) * 3.2);
        Sim.arrow(ctx, x, y, x + (dx / dl) * fl, y + (dy / dl) * fl, { color: C.orange, width: 3 });
      }
      ctx.restore();
      if (skid) Sim.text(ctx, off ? 'Skidded off the road!' : 'Not enough grip: skidding', sc.x + sc.w - 12, sc.y + 18, { size: 13.5, bold: true, color: C.red, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      else Sim.text(ctx, 'Grip is enough', sc.x + sc.w - 12, sc.y + 18, { size: 13.5, bold: true, color: C.green, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      Sim.text(ctx, 'orange arrow: friction on the car', sc.x + sc.w - 12, sc.y + sc.h - 12, { size: 11.5, color: '#b35c00', align: 'right', bg: 'rgba(255,255,255,0.7)' });

      // graph: F needed against v
      const ymaxKN = niceMax(Math.max(1.6 * Fmax, 1.25 * Fneed) / 1000);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 40, ymin: 0, ymax: ymaxKN, xlabel: 'v / m s⁻¹', ylabel: 'F / kN', title: 'Friction needed, mv²/r' }, gb)).axes();
      g.clip();
      ctx.fillStyle = 'rgba(224,49,49,0.07)';
      ctx.fillRect(g.x, g.y, g.w, g.py(Fmax / 1000) - g.y);
      g.unclip();
      g.hline(Fmax / 1000, { color: C.green, dash: [1, 0], width: 2 });
      g.label(39, Fmax / 1000, 'maximum grip', { size: 11.5, color: C.green, align: 'right', baseline: 'bottom' });
      g.plot((v) => (CAR_M * v * v) / p.r / 1000, { color: C.navy, width: 2.5 });
      if (vmax < 40) {
        g.vline(vmax, { color: C.green });
        g.label(vmax, 0.9 * ymaxKN, ' v_max = ' + vmax.toFixed(1) + ' m s⁻¹', { size: 11.5, color: C.green, align: vmax > 26 ? 'right' : 'left', bg: 'rgba(255,255,255,0.85)' });
      }
      g.dot(p.v, Math.min(Fneed / 1000, ymaxKN), { color: skid ? C.red : C.navy, r: 6 });
    },
    readout(s) {
      const p = s.p;
      const k = ROADS[p.road] || 0.8;
      const Fneed = (CAR_M * p.v * p.v) / p.r, Fmax = k * CAR_M * G;
      return [
        ['car mass =', CAR_M + ' kg'],
        ['friction needed mv²/r =', Sim.fmt(Fneed, 3) + ' N', true],
        ['maximum friction =', Sim.fmt(Fmax, 3) + ' N'],
        ['v_max = √(F_max r / m) =', Math.sqrt((Fmax * p.r) / CAR_M).toFixed(1) + ' m s⁻¹'],
        ['status:', Fneed > Fmax ? 'skids (needs ' + (Fneed / Fmax).toFixed(1) + '× the grip available)' : 'makes the bend']
      ];
    }
  });

  /* ======================================================================
     5. Vertical circle: tension round the loop
     ====================================================================== */
  const VM = 0.5;
  function vcInit(s) {
    s.state = { th: 0, om: s.p.vb / s.p.r, proj: null, done: false, doneT: 0, slackAt: null, trail: [], tt: 0 };
  }
  function vcTension(p, th, om) { return VM * (p.r * om * om + G * Math.cos(th)); }
  Sim.create('#sim-vertical', {
    title: 'Vertical circle: tension round the loop',
    height: (w) => (w >= 700 ? 400 : 600),
    controls: [
      { key: 'vb', label: 'Speed at the bottom', min: 2, max: 14, step: 0.5, value: 9, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'r', label: 'Radius r', min: 0.5, max: 2, step: 0.1, value: 1.0, unit: 'm', format: (v) => v.toFixed(1) },
      { key: 'mode', type: 'select', label: 'Show as', value: 'string', options: [['string', 'Ball on a string (0.50 kg)'], ['coaster', 'Toy car in a loop track (0.50 kg)']] }
    ],
    animate: true,
    onChange(s, key) { if (key !== 'mode') vcInit(s); },
    init(s) { vcInit(s); },
    update(s, dt) {
      const st = s.state, p = s.p;
      dt *= 0.6;
      if (st.done) {
        st.doneT += dt;
        if (st.doneT > 1.2) vcInit(s);
        return;
      }
      const n = 8, hdt = dt / n;
      for (let i = 0; i < n; i++) {
        if (!st.proj) {
          // RK4 for θ'' = −(g/r) sin θ
          const f = (th) => (-G / p.r) * Math.sin(th);
          const k1t = st.om, k1o = f(st.th);
          const k2t = st.om + 0.5 * hdt * k1o, k2o = f(st.th + 0.5 * hdt * k1t);
          const k3t = st.om + 0.5 * hdt * k2o, k3o = f(st.th + 0.5 * hdt * k2t);
          const k4t = st.om + hdt * k3o, k4o = f(st.th + hdt * k3t);
          st.th += (hdt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
          st.om += (hdt / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
          if (st.th > TAU) st.th -= TAU;
          if (vcTension(p, st.th, st.om) < 0) {
            const x = p.r * Math.sin(st.th), y = -p.r * Math.cos(st.th);
            st.proj = { x, y, vx: p.r * st.om * Math.cos(st.th), vy: p.r * st.om * Math.sin(st.th), t: 0 };
            st.slackAt = st.th;
          }
        } else {
          const q = st.proj;
          q.vy -= G * hdt;
          q.x += q.vx * hdt;
          q.y += q.vy * hdt;
          q.t += hdt;
          if ((q.t > 0.05 && Math.hypot(q.x, q.y) >= p.r) || q.t > 3) { st.done = true; st.doneT = 0; break; }
        }
      }
      st.tt += dt;
      if (st.tt > 0.05) {
        st.tt = 0;
        st.trail.push(st.proj ? [st.proj.x, st.proj.y] : [p.r * Math.sin(st.th), -p.r * Math.cos(st.th)]);
        if (st.trail.length > 18) st.trail.shift();
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sc = wide ? { x: 8, y: 8, w: Math.min(w * 0.45, h - 16), h: h - 16 } : { x: 8, y: 8, w: w - 16, h: 320 };
      const gb = wide ? { x: sc.x + sc.w + 64, y: 40, w: w - sc.x - sc.w - 64 - 22, h: h - 40 - 40 } : { x: 56, y: sc.y + sc.h + 40, w: w - 56 - 20, h: h - sc.y - sc.h - 40 - 40 };
      const coaster = p.mode === 'coaster';
      const cx = sc.x + sc.w / 2, cy = sc.y + sc.h / 2;
      const Rp = Math.min(sc.w, sc.h) / 2 - 46;
      const k = Rp / p.r;
      const X = (x) => cx + x * k, Y = (y) => cy - y * k;
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#f8f9fc', stroke: '#dfe5ee', width: 1, r: 10 });
      if (coaster) {
        Sim.line(ctx, cx, cy + Rp + 7, cx, sc.y + sc.h - 6, { color: '#adb5bd', width: 6 });
        Sim.circle(ctx, cx, cy, Rp + 7, { stroke: '#868e96', width: 6 });
      } else {
        Sim.circle(ctx, cx, cy, Rp, { stroke: '#ced4da', width: 1.5, dash: [5, 4] });
        Sim.circle(ctx, cx, cy, 5, { fill: '#495057' });
      }
      Sim.text(ctx, 'r = ' + p.r.toFixed(1) + ' m', sc.x + 10, sc.y + sc.h - 12, { size: 11.5, color: C.muted });
      st.trail.forEach((q) => Sim.circle(ctx, X(q[0]), Y(q[1]), 2.5, { fill: 'rgba(0,43,128,0.35)' }));

      let bx, by, T = 0, speed;
      if (!st.proj) {
        bx = X(p.r * Math.sin(st.th));
        by = Y(-p.r * Math.cos(st.th));
        T = vcTension(p, st.th, st.om);
        speed = Math.abs(p.r * st.om);
      } else {
        bx = X(st.proj.x);
        by = Y(st.proj.y);
        speed = Math.hypot(st.proj.vx, st.proj.vy);
      }
      if (!coaster) {
        if (!st.proj) Sim.line(ctx, cx, cy, bx, by, { color: '#495057', width: 1.8 });
        else Sim.line(ctx, cx, cy, bx, by, { color: '#adb5bd', width: 1.2, dash: [3, 4] });
      }
      // arrows
      const Lw = 30;
      const ux = (cx - bx), uy = (cy - by), ul = Math.hypot(ux, uy) || 1;
      if (!st.proj && T > 0.01) {
        const tl = Math.min(Rp * 0.9, (Lw * T) / (VM * G));
        Sim.arrow(ctx, bx, by, bx + (ux / ul) * tl, by + (uy / ul) * tl, { color: C.red, width: 3 });
        Sim.text(ctx, (coaster ? 'N = ' : 'T = ') + T.toFixed(1) + ' N', bx + (ux / ul) * tl * 0.55 + (uy / ul) * 16, by + (uy / ul) * tl * 0.55 - (ux / ul) * 16, { size: 12, bold: true, color: C.red, align: 'center', bg: 'rgba(248,249,252,0.85)' });
      }
      Sim.arrow(ctx, bx, by, bx, by + Lw, { color: C.green, width: 3 });
      Sim.text(ctx, 'mg', bx + 9, by + Lw - 2, { size: 12, bold: true, color: C.green });
      if (coaster) {
        const ang = st.proj ? 0 : st.th;
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(-ang);
        Sim.rect(ctx, -12, -2, 24, 12, { fill: C.navy, r: 3 });
        ctx.restore();
      } else Sim.circle(ctx, bx, by, 10, { fill: C.navy, stroke: '#fff', width: 2 });
      if (st.slackAt != null) Sim.text(ctx, coaster ? 'Car left the track!' : 'String went slack!', cx, sc.y + 18, { size: 13.5, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.85)' });
      Sim.text(ctx, 'top', cx, cy - Rp - 26, { size: 11.5, color: C.muted, align: 'center' });

      // tension against angle
      const vb2 = p.vb * p.vb;
      const Tf = (deg) => VM * (vb2 / p.r) + VM * G * (3 * Math.cos(deg * DEG) - 2);
      const reachTop = vb2 >= 2 * G * p.r * 2 ? true : false;
      const thMax = vb2 < 2 * G * p.r ? Math.acos(1 - vb2 / (2 * G * p.r)) / DEG : 180;
      const Tb = Tf(0), Tt = Tf(180);
      const ymax = niceMax(Tb * 1.12);
      const ymin = Math.min(0, reachTop ? Tt * 1.2 : Tf(thMax) * 1.2, -0.3 * ymax);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 360, ymin, ymax, xstep: 90, xlabel: 'angle from bottom / °', ylabel: (coaster ? 'N' : 'T') + ' / N', title: (coaster ? 'Normal force' : 'Tension') + ' round the circle' }, gb)).axes();
      g.clip();
      ctx.fillStyle = 'rgba(224,49,49,0.08)';
      ctx.fillRect(g.x, g.py(0), g.w, g.y + g.h - g.py(0));
      g.unclip();
      g.label(180, ymin * 0.74, coaster ? 'below zero: track would have to pull' : 'below zero: string would have to push', { size: 11, color: C.red, align: 'center', bold: false });
      if (thMax < 180) {
        g.plot(Tf, { from: 0, to: thMax, color: C.red, width: 2.5 });
        g.plot(Tf, { from: 360 - thMax, to: 360, color: C.red, width: 2.5 });
      } else g.plot(Tf, { color: C.red, width: 2.5 });
      if (!st.proj) {
        const deg = ((st.th / DEG) % 360 + 360) % 360;
        g.dot(deg, T, { color: C.navy });
      }
    },
    readout(s) {
      const p = s.p, st = s.state;
      const vb2 = p.vb * p.vb;
      const out = [];
      const speed = st.proj ? Math.hypot(st.proj.vx, st.proj.vy) : Math.abs(p.r * st.om);
      out.push(['speed now =', speed.toFixed(2) + ' m s⁻¹']);
      out.push(['at bottom: mg + mv²/r =', (VM * G + (VM * vb2) / p.r).toFixed(2) + ' N']);
      const vt2 = vb2 - 4 * G * p.r;
      if (vt2 >= 0) {
        out.push(['v at top =', Math.sqrt(vt2).toFixed(2) + ' m s⁻¹']);
        out.push(['at top: mv²/r − mg =', ((VM * vt2) / p.r - VM * G).toFixed(2) + ' N']);
      }
      out.push(['minimum speed at top √(gr) =', Math.sqrt(G * p.r).toFixed(2) + ' m s⁻¹']);
      out.push(['minimum speed at bottom √(5gr) =', Math.sqrt(5 * G * p.r).toFixed(2) + ' m s⁻¹', true]);
      const status = vb2 >= 5 * G * p.r ? 'goes all the way round' : vb2 <= 2 * G * p.r ? 'swings like a pendulum' : 'leaves the circle before the top';
      out.push(['result:', status]);
      return out;
    }
  });
})();
