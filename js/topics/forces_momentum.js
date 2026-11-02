/* Forces & Momentum — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 9.81;
  const DEG = Math.PI / 180;
  const BG = 'rgba(255,255,255,0.88)';

  /* toFixed without "-0.0" */
  function fx(v, d) {
    if (!isFinite(v)) return '—';
    const s = v.toFixed(d);
    return /^-0(\.0+)?$/.test(s) ? s.slice(1) : s;
  }
  function niceStep(range, target) {
    const raw = Math.max(1e-9, range) / (target || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  function niceMax(v) {
    const st = niceStep(v, 4);
    return Math.ceil(v / st) * st;
  }
  const smooth = (x) => { x = Sim.clamp(x, 0, 1); return x * x * (3 - 2 * x); };

  /* ======================================================================
     1. Free-body diagram on a slope
     ====================================================================== */
  function slopeSolve(p) {
    const th = p.th * DEG, W = p.m * G;
    const along = W * Math.sin(th), perp = W * Math.cos(th);
    const R = perp, fmax = p.mu * R, D = p.P - along; // up the slope is positive
    let f, status;
    if (Math.abs(D) <= fmax + 1e-9) { f = -D; status = 'rest'; }
    else { f = -Math.sign(D) * fmax; status = D > 0 ? 'up' : 'down'; }
    const F = D + f;
    return { th, W, along, perp, R, fmax, D, f, F, a: F / p.m, status };
  }

  Sim.create('#sim-slope', {
    title: 'Free-body diagram on a slope',
    height: (w) => (w >= 640 ? 390 : 520),
    controls: [
      { key: 'th', label: 'Slope angle θ', min: 0, max: 60, step: 1, value: 25, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'm', label: 'Mass m', min: 1, max: 10, step: 0.5, value: 6, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'P', label: 'Pull up the slope P', min: 0, max: 80, step: 1, value: 0, unit: 'N', format: (v) => v.toFixed(0) },
      { key: 'mu', label: 'Friction coefficient μ (beyond the spec)', min: 0, max: 1, step: 0.05, value: 0.3, format: (v) => v.toFixed(2) },
      { key: 'comp', type: 'check', label: 'Resolve the weight', value: true }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const r = slopeSolve(p);
      const wide = w >= 640;
      const SW = wide ? Math.round(w * 0.58) : w;
      const SH = wide ? h : 310;
      const th = r.th, cs = Math.cos(th), sn = Math.sin(th), tn = Math.tan(th);
      const u = [cs, -sn], n = [-sn, -cs];
      const Cx = SW * 0.46, Cy = SH * 0.56;
      const yg = SH - 10;
      const k = (SH * 0.4) / (10 * G); // px per newton (heaviest block fits)

      Sim.rect(ctx, 0, 0, SW, SH, { fill: '#f6f9fe' });
      // ground and slope
      const yAt = (x) => Cy - (x - Cx) * tn;
      const xi = tn > 1e-4 ? Cx - (yg - Cy) / tn : -1e9;
      const poly = xi > 0 ? [[0, yg], [xi, yg], [SW, yAt(SW)], [SW, SH], [0, SH]] : [[0, yAt(0)], [SW, yAt(SW)], [SW, SH], [0, SH]];
      Sim.polyline(ctx, poly, { close: true, fill: '#e8dfcc', color: '#e8dfcc', width: 1 });
      if (xi > 0) Sim.line(ctx, 0, yg, xi, yg, { color: '#8c7a62', width: 2.5 });
      Sim.line(ctx, Math.max(0, xi), yAt(Math.max(0, xi)), SW, yAt(SW), { color: '#8c7a62', width: 2.5 });
      // angle marker
      if (p.th >= 3) {
        const D = SW * 0.32;
        const Q = [Cx - u[0] * D, Cy - u[1] * D];
        if (Q[1] < yg - 6) {
          Sim.line(ctx, Q[0], Q[1], Q[0] - 64, Q[1], { color: C.grey, width: 1.2, dash: [5, 4] });
          Sim.arc(ctx, Q[0], Q[1], 34, Math.PI - th, Math.PI, { color: C.ink, label: 'θ', labelGap: 12 });
        } else Sim.arc(ctx, xi, yg, 36, -th, 0, { color: C.ink, label: 'θ', labelGap: 12 });
      }

      // block (centre Bc)
      const b = wide ? 46 : 40;
      const Bc = [Cx + n[0] * b / 2, Cy + n[1] * b / 2];
      ctx.save();
      ctx.translate(Bc[0], Bc[1]);
      ctx.rotate(-th);
      Sim.rect(ctx, -b / 2, -b / 2, b, b, { fill: '#cfe0ff', stroke: C.navy, width: 2, r: 3 });
      ctx.restore();

      const tip = (o, dir, F) => [o[0] + dir[0] * F * k, o[1] + dir[1] * F * k];
      const lab = (str, color) => ({ color, width: 3, label: str, labelOffset: 16, labelBg: BG, size: 13 });
      // weight and its components
      const Wt = tip(Bc, [0, 1], r.W);
      if (p.comp) {
        Sim.arrow(ctx, Bc[0], Bc[1], Wt[0], Wt[1], { color: C.red, width: 2, dash: [6, 4], alpha: 0.75 });
        Sim.text(ctx, 'W = ' + fx(r.W, 1) + ' N', Wt[0] - 8, Wt[1] - 4, { size: 13, color: C.red, bold: true, align: 'right', bg: BG });
        if (r.along * k > 6) {
          const t1 = tip(Bc, [-u[0], -u[1]], r.along);
          Sim.arrow(ctx, Bc[0], Bc[1], t1[0], t1[1], { color: C.pink, width: 2.8 });
          const lx = t1[0] - u[0] * 34 + n[0] * 12, ly = t1[1] - u[1] * 34 + n[1] * 12;
          Sim.text(ctx, 'mg sin θ', lx, ly, { size: 12.5, color: C.pink, bold: true, align: 'center', bg: BG });
        }
        if (r.perp * k > 6) {
          const t2 = tip(Bc, [-n[0], -n[1]], r.perp);
          Sim.arrow(ctx, Bc[0], Bc[1], t2[0], t2[1], { color: C.pink, width: 2.8 });
          Sim.text(ctx, 'mg cos θ', t2[0] - n[0] * 14 + 6, t2[1] - n[1] * 14, { size: 12.5, color: C.pink, bold: true, align: 'left', bg: BG });
        }
        if (p.th >= 8) Sim.arc(ctx, Bc[0], Bc[1], 34, Math.PI / 2 - th, Math.PI / 2, { color: C.pink, label: 'θ', labelGap: 10, size: 13 });
      } else {
        Sim.arrow(ctx, Bc[0], Bc[1], Wt[0], Wt[1], lab('W = ' + fx(r.W, 1) + ' N', C.red));
      }
      // normal reaction
      const Rt = tip(Bc, n, r.R);
      if (r.R * k > 4) Sim.arrow(ctx, Bc[0], Bc[1], Rt[0], Rt[1], lab('R = ' + fx(r.R, 1) + ' N', C.blue));
      // pull
      if (p.P > 0.5) {
        const Pt = tip(Bc, u, p.P);
        Sim.arrow(ctx, Bc[0], Bc[1], Pt[0], Pt[1], lab('P = ' + fx(p.P, 0) + ' N', C.orange));
      }
      // friction, drawn at the contact surface
      if (Math.abs(r.f) * k > 4) {
        const dir = r.f > 0 ? u : [-u[0], -u[1]];
        const o = [Cx + dir[0] * b / 2 - n[0] * 7, Cy + dir[1] * b / 2 - n[1] * 7];
        const Ft = tip(o, dir, Math.abs(r.f));
        Sim.arrow(ctx, o[0], o[1], Ft[0], Ft[1], { color: C.purple, width: 3 });
        const L = Math.abs(r.f) * k;
        const fl = r.f > 0 ? [o[0] + dir[0] * (L / 2 + 20) - n[0] * 16, o[1] + dir[1] * (L / 2 + 20) - n[1] * 16] : [o[0] + dir[0] * (L + 46) + n[0] * 19, o[1] + dir[1] * (L + 46) + n[1] * 19];
        Sim.text(ctx, 'friction ' + fx(Math.abs(r.f), 1) + ' N', fl[0], fl[1], { size: 12.5, color: C.purple, bold: true, align: 'center', bg: BG });
      }
      Sim.circle(ctx, Bc[0], Bc[1], 3.5, { fill: C.ink });

      // panel: forces along the slope
      const P0 = wide ? { x: SW + 24, y: 22, w: w - SW - 40 } : { x: 14, y: SH + 14, w: w - 28 };
      Sim.text(ctx, 'Forces along the slope', P0.x, P0.y, { size: 14, bold: true, color: C.navy });
      const up = [], down = [];
      if (p.P > 0) up.push(['P', p.P, C.orange]);
      if (r.f > 1e-6) up.push(['friction', r.f, C.purple]);
      down.push(['mg sin θ', r.along, C.pink]);
      if (r.f < -1e-6) down.push(['friction', -r.f, C.purple]);
      const sum = (a) => a.reduce((t, q) => t + q[1], 0);
      const labW = 92;
      const barW = Math.max(60, P0.w - labW - 8);
      const maxV = Math.max(sum(up), sum(down), 5);
      const sc = barW / maxV;
      const rowBar = (y, label, segs) => {
        Sim.text(ctx, label, P0.x, y, { size: 12.5, color: C.muted });
        let x = P0.x + labW;
        Sim.rect(ctx, x, y - 9, barW, 18, { fill: '#f1f3f7', r: 4 });
        segs.forEach((q) => {
          const ww = q[1] * sc;
          Sim.rect(ctx, x, y - 9, ww, 18, { fill: q[2], r: 3 });
          if (ww > 64) Sim.text(ctx, q[0] + ' ' + fx(q[1], 1), x + ww / 2, y, { size: 11.5, color: '#fff', bold: true, align: 'center' });
          else if (ww > 30) Sim.text(ctx, fx(q[1], 1), x + ww / 2, y, { size: 11.5, color: '#fff', bold: true, align: 'center' });
          x += ww;
        });
      };
      rowBar(P0.y + 28, 'up the slope', up);
      rowBar(P0.y + 56, 'down the slope', down);
      const Fabs = Math.abs(r.F);
      Sim.text(ctx, 'resultant', P0.x, P0.y + 84, { size: 12.5, color: C.muted });
      Sim.rect(ctx, P0.x + labW, P0.y + 75, barW, 18, { fill: '#f1f3f7', r: 4 });
      if (Fabs * sc > 1) Sim.rect(ctx, P0.x + labW, P0.y + 75, Fabs * sc, 18, { fill: C.green, r: 3 });
      Sim.text(ctx, fx(Fabs, 1) + ' N' + (r.status === 'up' ? ' up' : r.status === 'down' ? ' down' : ''), P0.x + labW + Math.min(barW - 4, Fabs * sc + 6), P0.y + 84, { size: 12, color: C.green, bold: true, align: Fabs * sc + 70 > barW ? 'right' : 'left' });

      const y2 = P0.y + 118;
      Sim.text(ctx, 'Perpendicular to the slope', P0.x, y2, { size: 14, bold: true, color: C.navy });
      Sim.text(ctx, 'R = mg cos θ = ' + fx(r.R, 1) + ' N, so these balance', P0.x, y2 + 22, { size: 12.5, color: C.ink });
      const msg = r.status === 'rest'
        ? 'Resultant = 0: no acceleration (1st law)'
        : 'a = F/m = ' + fx(Math.abs(r.a), 2) + ' m s⁻² ' + (r.status === 'up' ? 'up' : 'down') + ' the slope';
      Sim.text(ctx, msg, P0.x, y2 + 50, { size: 13.5, bold: true, color: r.status === 'rest' ? C.navy : C.green });
      if (r.status === 'rest' && p.mu > 0 && Math.abs(r.f) > 0.05) {
        Sim.text(ctx, 'friction is holding it (max μR = ' + fx(r.fmax, 1) + ' N)', P0.x, y2 + 70, { size: 12, color: C.muted, italic: true });
      }
    },
    readout(s) {
      const r = slopeSolve(s.p);
      const dir = r.status === 'up' ? ' up the slope' : r.status === 'down' ? ' down the slope' : '';
      return [
        ['W = mg =', fx(r.W, 1) + ' N'],
        ['mg sin θ =', fx(r.along, 1) + ' N'],
        ['R = mg cos θ =', fx(r.R, 1) + ' N'],
        ['friction =', fx(Math.abs(r.f), 1) + ' N'],
        ['resultant =', fx(Math.abs(r.F), 2) + ' N'],
        ['a = F/m =', fx(Math.abs(r.a), 2) + ' m s⁻²' + dir, true]
      ];
    }
  });

  /* ======================================================================
     2. Lift and bathroom scales
     ====================================================================== */
  const LIFT = {
    up: { segs: [[0, 1, 0], [1, 3, 1.5], [3, 8, 0], [8, 10, -1.5], [10, 11, 0]], T: 11, v: [-1, 4], y: [0, 21] },
    down: { segs: [[0, 1, 0], [1, 3, -1.5], [3, 8, 0], [8, 10, 1.5], [10, 11, 0]], T: 11, v: [-4, 1], y: [-21, 0] },
    drop: { segs: [[0, 1, 0], [1, 3, -G], [3, 5, G], [5, 6, 0]], T: 6, v: [-25, 5], y: [-2 * G * 2, 0] }
  };
  function kin(segs, t) {
    let v = 0, y = 0, a = 0;
    for (const sg of segs) {
      if (t < sg[0]) break;
      a = sg[2];
      const d = Math.min(t, sg[1]) - sg[0];
      y += v * d + 0.5 * sg[2] * d * d;
      v += sg[2] * d;
      if (t < sg[1]) break;
    }
    return { a, v, y };
  }
  function liftPhase(a, v) {
    if (Math.abs(a) < 1e-6) return Math.abs(v) < 1e-6 ? 'at rest' : v > 0 ? 'moving up at constant speed' : 'moving down at constant speed';
    if (a < -G + 0.01) return 'free fall: weightless';
    if (a > 0) return v < -1e-6 ? 'slowing down while moving down' : 'speeding up upwards';
    return v > 1e-6 ? 'slowing down while moving up' : 'speeding up downwards';
  }
  function drawPerson(ctx, x, feet, hgt, color) {
    const hr = hgt * 0.1;
    Sim.circle(ctx, x, feet - hgt + hr, hr, { fill: color });
    Sim.line(ctx, x, feet - hgt + 2 * hr, x, feet - hgt * 0.42, { color, width: hgt * 0.07 });
    Sim.line(ctx, x, feet - hgt * 0.42, x - hgt * 0.12, feet, { color, width: hgt * 0.06 });
    Sim.line(ctx, x, feet - hgt * 0.42, x + hgt * 0.12, feet, { color, width: hgt * 0.06 });
    Sim.line(ctx, x, feet - hgt * 0.72, x - hgt * 0.17, feet - hgt * 0.47, { color, width: hgt * 0.05 });
    Sim.line(ctx, x, feet - hgt * 0.72, x + hgt * 0.17, feet - hgt * 0.47, { color, width: hgt * 0.05 });
  }

  Sim.create('#sim-lift', {
    title: 'Lift and bathroom scales',
    height: (w) => (w >= 640 ? 400 : 640),
    controls: [
      {
        key: 'trip', type: 'select', label: 'Journey', value: 'up',
        options: [['up', 'Lift going up'], ['down', 'Lift going down'], ['drop', 'Drop-tower ride (free fall, then brake)']],
        onChange: (s) => { s.reset(); s.play(); }
      },
      { key: 'm', label: 'Your mass m', min: 30, max: 120, step: 1, value: 70, unit: 'kg', format: (v) => v.toFixed(0) }
    ],
    animate: true,
    init(s) {
      const k0 = kin(LIFT[s.p.trip].segs, 0);
      s.state = { t: 0, rec: [[0, 0, s.p.m * (G + k0.a)]], done: false };
    },
    update(s, dt) {
      const st = s.state;
      if (st.done) { s.reset(); return; }
      const pr = LIFT[s.p.trip];
      st.t = Math.min(pr.T, st.t + dt);
      const k = kin(pr.segs, st.t);
      st.rec.push([st.t, k.v, s.p.m * (G + k.a)]);
      if (st.t >= pr.T) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state, pr = LIFT[p.trip];
      const k = kin(pr.segs, st.t);
      const R = p.m * (G + k.a);
      const wide = w >= 640;
      let shaft, panel, g1, g2;
      if (wide) {
        shaft = { x: 16, y: 14, w: 110, h: h - 28 };
        panel = { x: 140, y: 14, w: 210, h: h - 28 };
        const gx = 412, gw = w - gx - 20;
        const gh = (h - 34 - 74) / 2;
        g1 = { x: gx, y: 34, w: gw, h: gh };
        g2 = { x: gx, y: 34 + gh + 54, w: gw, h: gh };
      } else {
        shaft = { x: 10, y: 10, w: 86, h: 262 };
        panel = { x: 106, y: 10, w: w - 114, h: 262 };
        g1 = { x: 54, y: 312, w: w - 72, h: 112 };
        g2 = { x: 54, y: 312 + 112 + 60, w: w - 72, h: 112 };
      }
      // shaft and car
      Sim.rect(ctx, shaft.x, shaft.y, shaft.w, shaft.h, { fill: '#eef1f5', stroke: '#ced4da', width: 1, r: 4 });
      const ch = wide ? 74 : 58;
      const frac = (k.y - pr.y[0]) / (pr.y[1] - pr.y[0] || 1);
      const carTop = shaft.y + 6 + (1 - Sim.clamp(frac, 0, 1)) * (shaft.h - 12 - ch);
      for (let i = 1; i < 8; i++) {
        const fy = shaft.y + (shaft.h * i) / 8;
        Sim.line(ctx, shaft.x, fy, shaft.x + 8, fy, { color: '#adb5bd', width: 2 });
        Sim.line(ctx, shaft.x + shaft.w - 8, fy, shaft.x + shaft.w, fy, { color: '#adb5bd', width: 2 });
      }
      Sim.line(ctx, shaft.x + shaft.w / 2, shaft.y, shaft.x + shaft.w / 2, carTop, { color: '#495057', width: 2 });
      Sim.rect(ctx, shaft.x + 10, carTop, shaft.w - 20, ch, { fill: '#dbe8ff', stroke: C.navy, width: 2, r: 3 });
      drawPerson(ctx, shaft.x + shaft.w / 2, carTop + ch - 9, ch * 0.62, C.navy);
      Sim.rect(ctx, shaft.x + shaft.w / 2 - 12, carTop + ch - 9, 24, 5, { fill: '#495057', r: 1 });
      if (Math.abs(k.v) > 0.02) {
        const len = Sim.clamp(k.v * (wide ? 9 : 7), -60, 60);
        Sim.arrow(ctx, shaft.x + shaft.w - 4, carTop + ch / 2, shaft.x + shaft.w - 4, carTop + ch / 2 - len, { color: C.green, width: 2.5, head: 8 });
      }

      // force panel: person on scales + free-body diagram
      Sim.text(ctx, 'Forces on you', panel.x + panel.w / 2, panel.y + 8, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      const feet = panel.y + panel.h - 34;
      const px = panel.x + panel.w * 0.26;
      drawPerson(ctx, px, feet, wide ? 120 : 104, '#9aa5b5');
      Sim.rect(ctx, px - 30, feet, 60, 12, { fill: '#495057', r: 3 });
      Sim.rect(ctx, px - 34, feet + 14, 68, 20, { fill: '#212529', r: 4 });
      Sim.text(ctx, fx(R / G, 1) + ' kg', px, feet + 24, { size: 13, bold: true, color: '#69db7c', align: 'center' });
      // FBD
      const fxp = panel.x + panel.w * 0.72;
      const wmax = 120 * G, upF = p.trip === 'drop' ? 2.05 : 1.2;
      const kk = (panel.h - 62) / ((upF + 1) * wmax);
      const cy = panel.y + 30 + upF * wmax * kk + 4;
      const W = p.m * G;
      Sim.arrow(ctx, fxp, cy, fxp, cy + W * kk, { color: C.red, width: 3, label: 'W ' + fx(W, 0) + ' N', labelOffset: 13, labelBg: BG, size: 12.5 });
      if (R * kk > 3) Sim.arrow(ctx, fxp, cy, fxp, cy - R * kk, { color: C.blue, width: 3, label: 'R ' + fx(R, 0) + ' N', labelOffset: 13, labelBg: BG, size: 12.5 });
      else Sim.text(ctx, 'R = 0', fxp, cy - 22, { size: 12.5, bold: true, color: C.blue, align: 'center', bg: BG });
      const Fres = R - W;
      if (Math.abs(Fres) * kk > 4) Sim.arrow(ctx, fxp + 34, cy, fxp + 34, cy - Fres * kk, { color: C.green, width: 2.5, alpha: 0.9 });
      if (Math.abs(Fres) * kk > 12) Sim.text(ctx, 'ma', fxp + 42, cy - Fres * kk / 2, { size: 12.5, bold: true, color: C.green });
      Sim.circle(ctx, fxp, cy, 4.5, { fill: C.ink });

      // graphs
      const gv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: pr.T, ymin: pr.v[0], ymax: pr.v[1], xlabel: 't / s', ylabel: 'v / m s⁻¹ (up +)', title: 'velocity of the lift', xstep: pr.T > 8 ? 2 : 1 }, g1)).axes();
      const Rmax = niceMax((p.trip === 'drop' ? 2.2 : 1.35) * p.m * G);
      const gR = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: pr.T, ymin: 0, ymax: Rmax, xlabel: 't / s', ylabel: 'R / N', title: 'scale reading R', xstep: pr.T > 8 ? 2 : 1 }, g2)).axes();
      gR.hline(W, { color: C.red, dash: [6, 4] });
      Sim.text(ctx, 'mg', gR.x + gR.w - 4, gR.py(W) - 9, { size: 12, color: C.red, bold: true, align: 'right', bg: BG });
      gv.path(st.rec.map((q) => [q[0], q[1]]), { color: C.green, width: 2.6 });
      gR.path(st.rec.map((q) => [q[0], q[2]]), { color: C.blue, width: 2.6 });
      gv.dot(st.t, k.v, { color: C.green });
      gR.dot(st.t, R, { color: C.blue });
    },
    readout(s) {
      const st = s.state, k = kin(LIFT[s.p.trip].segs, st.t);
      const R = s.p.m * (G + k.a);
      const W = s.p.m * G;
      const feel = Math.abs(R - W) < 0.5 ? 'normal' : R < 0.5 ? 'weightless' : R > W ? 'heavier' : 'lighter';
      return [
        ['t =', fx(st.t, 1) + ' s'],
        ['a =', fx(k.a, 2) + ' m s⁻²'],
        ['v =', fx(k.v, 2) + ' m s⁻¹'],
        ['R = m(g + a) =', fx(R, 0) + ' N', true],
        ['you feel', feel],
        ['lift is', liftPhase(k.a, k.v)]
      ];
    }
  });

  /* ======================================================================
     3. Skydiver and terminal velocity
     ====================================================================== */
  const K_FREE = 0.24, K_CHUTE = 30, T_SKY = 40, DEPLOY = 3.0;
  const skyK = (st) => (st.chute ? K_FREE + (K_CHUTE - K_FREE) * Math.pow(Sim.clamp((st.t - st.t0) / DEPLOY, 0, 1), 3) : K_FREE);

  Sim.create('#sim-sky', {
    title: 'Skydiver: reaching terminal velocity',
    height: (w) => (w >= 640 ? 390 : 610),
    controls: [
      { key: 'm', label: 'Mass of skydiver and kit', min: 50, max: 120, step: 1, value: 80, unit: 'kg', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Open parachute', onClick: (s) => { const st = s.state; if (!st.chute && !st.done) { st.chute = true; st.t0 = st.t; } if (!s.running && !st.done) s.play(); } }
    ],
    animate: true,
    init(s) {
      s.speed = 2;
      s.state = { t: 0, v: 0, fall: 0, chute: false, t0: 0, rec: [[0, 0, 0, s.p.m * G]], done: false, maxD: 0 };
    },
    update(s, dt) {
      const st = s.state;
      if (st.done) { s.reset(); return; }
      const n = Math.max(1, Math.ceil(dt / 0.002)), hh = dt / n;
      const m = s.p.m;
      for (let i = 0; i < n; i++) {
        const D = skyK(st) * st.v * st.v;
        const a = (m * G - D) / m;
        st.v = Math.max(0, st.v + a * hh);
        st.fall += st.v * hh;
        st.t += hh;
      }
      const D = skyK(st) * st.v * st.v;
      st.maxD = Math.max(st.maxD, D);
      st.rec.push([st.t, st.v, D, m * G]);
      if (st.t >= T_SKY) { st.done = true; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const sc = wide ? { x: 0, y: 0, w: Math.round(Math.min(280, w * 0.3)), h } : { x: 0, y: 0, w, h: 232 };
      // sky
      const grad = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
      grad.addColorStop(0, '#cfe6ff');
      grad.addColorStop(1, '#eef6ff');
      ctx.fillStyle = grad;
      ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
      const pxm = 3.5;
      for (let i = 0; i < 6; i++) {
        const cx0 = sc.x + sc.w * ((i * 0.37 + 0.12) % 1);
        const base = (i * sc.h) / 6;
        const yy = sc.y + ((((base - st.fall * pxm) % (sc.h + 60)) + sc.h + 60) % (sc.h + 60)) - 30;
        Sim.circle(ctx, cx0, yy, 13, { fill: 'rgba(255,255,255,0.9)' });
        Sim.circle(ctx, cx0 + 14, yy + 3, 10, { fill: 'rgba(255,255,255,0.9)' });
        Sim.circle(ctx, cx0 - 14, yy + 4, 9, { fill: 'rgba(255,255,255,0.9)' });
      }
      const cx = sc.x + sc.w / 2, cy = sc.y + sc.h * 0.5;
      // skydiver
      const dep = st.chute ? smooth((st.t - st.t0) / DEPLOY) : 0;
      if (st.chute) {
        const cw = 18 + 62 * dep, chh = 8 + 24 * dep, top = cy - 46 - 28 * dep;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, top + chh, cw, chh, 0, Math.PI, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = C.orange;
        ctx.fill();
        ctx.restore();
        Sim.line(ctx, cx - cw, top + chh, cx - 5, cy - 14, { color: '#495057', width: 1 });
        Sim.line(ctx, cx + cw, top + chh, cx + 5, cy - 14, { color: '#495057', width: 1 });
      }
      const col = C.navy;
      Sim.circle(ctx, cx, cy - 18, 6.5, { fill: col });
      Sim.line(ctx, cx, cy - 11, cx, cy + 8, { color: col, width: 5 });
      if (st.chute) {
        Sim.line(ctx, cx, cy - 8, cx - 6, cy - 20, { color: col, width: 3 });
        Sim.line(ctx, cx, cy - 8, cx + 6, cy - 20, { color: col, width: 3 });
        Sim.line(ctx, cx, cy + 8, cx - 4, cy + 24, { color: col, width: 3.5 });
        Sim.line(ctx, cx, cy + 8, cx + 4, cy + 24, { color: col, width: 3.5 });
      } else {
        Sim.line(ctx, cx, cy - 7, cx - 17, cy - 17, { color: col, width: 3 });
        Sim.line(ctx, cx, cy - 7, cx + 17, cy - 17, { color: col, width: 3 });
        Sim.line(ctx, cx, cy + 8, cx - 13, cy + 22, { color: col, width: 3.5 });
        Sim.line(ctx, cx, cy + 8, cx + 13, cy + 22, { color: col, width: 3.5 });
      }
      // forces
      const W = p.m * G, D = skyK(st) * st.v * st.v;
      const kk = (sc.h * 0.3) / (120 * G);
      const maxUp = sc.h * 0.44;
      Sim.arrow(ctx, cx + 30, cy, cx + 30, cy + W * kk, { color: C.red, width: 3, label: 'W ' + fx(W, 0) + ' N', labelOffset: 13, labelBg: BG, size: 12.5 });
      if (D * kk > 3) {
        const len = Math.min(D * kk, maxUp);
        Sim.arrow(ctx, cx - 30, cy, cx - 30, cy - len, { color: C.blue, width: 3, label: 'D ' + fx(D, 0) + ' N', labelOffset: 13, labelBg: BG, size: 12.5 });
      }
      Sim.text(ctx, fx(st.fall, 0) + ' m fallen', sc.x + 8, sc.y + sc.h - 12, { size: 12, color: C.muted });

      // graphs
      let b1, b2;
      if (wide) {
        const gx = sc.w + 58, gw = w - gx - 20, gh = (h - 40 - 70) / 2;
        b1 = { x: gx, y: 30, w: gw, h: gh };
        b2 = { x: gx, y: 30 + gh + 58, w: gw, h: gh };
      } else {
        b1 = { x: 54, y: sc.h + 34, w: w - 72, h: 130 };
        b2 = { x: 54, y: sc.h + 34 + 130 + 60, w: w - 72, h: 130 };
      }
      const gv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_SKY, ymin: 0, ymax: 70, xlabel: 't / s', ylabel: 'v / m s⁻¹', title: 'velocity–time' }, b1)).axes();
      const k = skyK(st);
      const vt = Math.sqrt((p.m * G) / k);
      if (!st.chute || st.t - st.t0 > DEPLOY) {
        gv.hline(vt, { color: C.grey });
        Sim.text(ctx, 'terminal velocity ' + fx(vt, 1) + ' m s⁻¹', gv.x + gv.w - 4, gv.py(vt) - 10, { size: 11.5, color: C.muted, align: 'right', bg: BG });
      }
      gv.path(st.rec.map((q) => [q[0], q[1]]), { color: C.navy, width: 2.6 });
      gv.dot(st.t, st.v, { color: C.navy });
      const fmax = niceMax(Math.max(2.2 * W, st.maxD * 1.08));
      const gf = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: T_SKY, ymin: 0, ymax: fmax, xlabel: 't / s', ylabel: 'force / N', title: 'weight and drag', yticks: 4 }, b2)).axes();
      gf.path(st.rec.map((q) => [q[0], q[3]]), { color: C.red, width: 2.2, dash: [6, 4] });
      gf.path(st.rec.map((q) => [q[0], q[2]]), { color: C.blue, width: 2.6 });
      gf.dot(st.t, D, { color: C.blue });
      Sim.text(ctx, 'W', gf.x + 8, gf.py(W) - 10, { size: 12, color: C.red, bold: true });
      Sim.text(ctx, 'D', gf.px(Math.min(st.t, T_SKY)) + 8, gf.py(Math.min(D, fmax)) + 12, { size: 12, color: C.blue, bold: true });
    },
    readout(s) {
      const st = s.state, W = s.p.m * G, D = skyK(st) * st.v * st.v;
      const F = W - D;
      let phase;
      if (Math.abs(F) < 0.02 * W) phase = 'W = D: terminal velocity';
      else if (F > 0) phase = 'W > D: speeding up';
      else phase = 'D > W: slowing down';
      return [
        ['t =', fx(st.t, 1) + ' s'],
        ['v =', fx(st.v, 1) + ' m s⁻¹'],
        ['W =', fx(W, 0) + ' N'],
        ['D =', fx(D, 0) + ' N'],
        ['a = (W − D)/m =', fx(F / s.p.m, 2) + ' m s⁻² (down +)'],
        ['', phase, true]
      ];
    }
  });

  /* ======================================================================
     4. Newton's third law pairs: book on a table
     ====================================================================== */
  const BOOK_M = 2.0;
  function n3Forces(P) {
    const Wb = BOOK_M * G, R = Wb + P;
    return [
      { on: 'book', pair: 'grav', type: 'gravitational', dir: 1, F: Wb, name: 'W', by: 'Earth pulls book' },
      { on: 'book', pair: 'contact', type: 'contact', dir: -1, F: R, name: 'R', by: 'table pushes book' },
      { on: 'book', pair: 'hand', type: 'contact', dir: 1, F: P, name: 'P', by: 'hand pushes book' },
      { on: 'table', pair: 'contact', type: 'contact', dir: 1, F: R, name: 'R', by: 'book pushes table' },
      { on: 'Earth', pair: 'grav', type: 'gravitational', dir: -1, F: Wb, name: 'W', by: 'book pulls Earth' },
      { on: 'hand', pair: 'hand', type: 'contact', dir: -1, F: P, name: 'P', by: 'book pushes hand' }
    ].filter((f) => f.F > 0.01);
  }
  const PAIR_TEXT = {
    grav: ['Earth', 'gravitational'],
    contact: ['table', 'contact'],
    hand: ['hand', 'contact']
  };

  Sim.create('#sim-n3', {
    title: 'Newton’s third law pairs: book on a table',
    height: (w) => (w >= 640 ? 470 : 624),
    controls: [
      {
        key: 'pair', type: 'select', label: 'Highlight', value: 'grav',
        options: [
          ['grav', 'N3 pair: Earth and book (gravitational)'],
          ['contact', 'N3 pair: table and book (contact)'],
          ['hand', 'N3 pair: hand and book (contact)'],
          ['book', 'All forces on the book (not an N3 pair)'],
          ['none', 'Nothing highlighted']
        ]
      },
      { key: 'P', label: 'Your hand pushes down on the book', min: 0, max: 30, step: 1, value: 0, unit: 'N', format: (v) => v.toFixed(0) }
    ],
    init(s) { s.state = { hits: [] }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const forces = n3Forces(p.P);
      const sel = p.pair;
      const isHi = (f) => (sel === 'book' ? f.on === 'book' : sel === f.pair);
      // scene
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.34), h: h - 70 } : { x: 0, y: 0, w, h: 170 };
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#f6f9fe' });
      const ex = sc.x + sc.w / 2, eR = sc.w * 1.6;
      ctx.save();
      ctx.beginPath();
      ctx.rect(sc.x, sc.y, sc.w, sc.h);
      ctx.clip();
      Sim.circle(ctx, ex, sc.y + sc.h - 34 + eR, eR, { fill: '#b2d8a4', stroke: '#6b9a5b', width: 2 });
      ctx.restore();
      Sim.text(ctx, 'Earth', ex, sc.y + sc.h - 14, { size: 13, bold: true, color: '#3b6d2e', align: 'center' });
      const groundY = sc.y + sc.h - 34;
      const tw = Math.min(170, sc.w * 0.62), tx = ex - tw / 2, ty = groundY - 70;
      Sim.rect(ctx, tx, ty, tw, 10, { fill: '#a07a4a', r: 2 });
      Sim.rect(ctx, tx + 10, ty + 10, 8, groundY - ty - 10, { fill: '#8c6d46' });
      Sim.rect(ctx, tx + tw - 18, ty + 10, 8, groundY - ty - 10, { fill: '#8c6d46' });
      Sim.text(ctx, 'table', tx + tw / 2, ty + 30, { size: 13, bold: true, color: '#6d5232', align: 'center' });
      const bw = 64, bh = 18;
      Sim.rect(ctx, ex - bw / 2, ty - bh, bw, bh, { fill: C.navy, r: 3 });
      Sim.text(ctx, 'book', ex, ty - bh / 2, { size: 12, bold: true, color: '#fff', align: 'center' });
      if (p.P > 0) {
        const hy = ty - bh;
        Sim.rect(ctx, ex - 18, hy - 22, 36, 22, { fill: '#f3c9a8', stroke: '#c48b63', width: 1.5, r: 8 });
        Sim.rect(ctx, ex - 9, sc.y + 8, 18, hy - 22 - sc.y - 6, { fill: '#f3c9a8', stroke: '#c48b63', width: 1.5, r: 4 });
        Sim.text(ctx, 'hand', ex + 26, hy - 12, { size: 12.5, bold: true, color: '#a0603a' });
      }

      // panels
      const bodies = ['book', 'table', 'Earth', 'hand'];
      const titles = { book: 'Forces on the book', table: 'Forces on the table', Earth: 'Forces on the Earth', hand: 'Forces on your hand' };
      const notes = { table: '(other forces not shown)', Earth: '(other forces not shown)', hand: '(other forces not shown)' };
      let boxes = {};
      if (wide) {
        const x0 = sc.w + 14, pw = (w - x0 - 14 - 10) / 2, ph = (h - 70 - 10) / 2 - 4;
        bodies.forEach((b, i) => { boxes[b] = { x: x0 + (i % 2) * (pw + 10), y: 4 + Math.floor(i / 2) * (ph + 10), w: pw, h: ph }; });
      } else {
        const pw = (w - 30) / 2, ph = 176;
        bodies.forEach((b, i) => { boxes[b] = { x: 10 + (i % 2) * (pw + 10), y: sc.h + 10 + Math.floor(i / 2) * (ph + 8), w: pw, h: ph }; });
      }
      const maxF = BOOK_M * G + p.P;
      const kpx = (Math.min(boxes.book.h, 200) / 2 - 44) / maxF;
      st.hits = [];
      const mids = {};
      bodies.forEach((b) => {
        const bx = boxes[b];
        Sim.rect(ctx, bx.x, bx.y, bx.w, bx.h, { fill: '#fbfcff', stroke: '#dfe5ee', width: 1.2, r: 8 });
        Sim.text(ctx, titles[b], bx.x + 10, bx.y + 14, { size: 12.5, bold: true, color: C.navy });
        if (notes[b]) Sim.text(ctx, notes[b], bx.x + bx.w / 2, bx.y + bx.h - 10, { size: 11, color: C.muted, align: 'center', italic: true });
        const cx = bx.x + bx.w / 2, cy = bx.y + bx.h / 2 + 2;
        const list = forces.filter((f) => f.on === b);
        if (b === 'hand' && !list.length) {
          Sim.text(ctx, 'Push with the slider', cx, cy, { size: 12, color: C.muted, align: 'center', italic: true });
          return;
        }
        const downs = list.filter((f) => f.dir > 0);
        list.forEach((f) => {
          let ox = 0;
          if (f.dir > 0 && downs.length > 1) ox = downs.indexOf(f) === 0 ? -16 : 16;
          const hi = sel === 'none' || isHi(f);
          const color = f.type === 'gravitational' ? C.red : C.blue;
          const x1 = cx + ox, y1 = cy, y2 = cy + f.dir * f.F * kpx;
          Sim.arrow(ctx, x1, y1, x1, y2, { color, width: hi && sel !== 'none' ? 4 : 2.8, alpha: hi ? 1 : 0.22 });
          const ly = y2 + f.dir * 11;
          const lx = x1 + (ox < 0 ? -4 : ox > 0 ? 4 : 0);
          Sim.text(ctx, f.name + ' ' + fx(f.F, 1) + ' N', lx, ly, { size: 12, bold: true, color, align: ox < 0 ? 'right' : ox > 0 ? 'left' : 'center', bg: hi ? BG : null });
          st.hits.push({ x: x1, y1: Math.min(y1, y2), y2: Math.max(y1, y2), pair: f.pair });
          if (isHi(f) && sel !== 'book') mids[f.on] = [x1, (y1 + y2) / 2, color];
        });
        Sim.circle(ctx, cx, cy, 4, { fill: C.ink });
      });
      // link the two forces of a pair
      const ends = Object.values(mids);
      if (ends.length === 2) {
        const [a, b2] = ends;
        const dx = b2[0] - a[0], dy = b2[1] - a[1], dl = Math.hypot(dx, dy) || 1;
        let px = -dy / dl, py = dx / dl;
        if (px > 1e-6 || (Math.abs(px) <= 1e-6 && py > 0)) { px = -px; py = -py; }
        const cxq = (a[0] + b2[0]) / 2 + px * 48, cyq = (a[1] + b2[1]) / 2 + py * 48;
        ctx.save();
        ctx.strokeStyle = a[2];
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo(cxq, cyq, b2[0], b2[1]);
        ctx.stroke();
        ctx.restore();
      }

      // property check-list
      const ty0 = wide ? h - 58 : h - 70;
      let lines;
      if (sel === 'book') {
        const R = BOOK_M * G + p.P;
        lines = [
          ['✘ all act on the same body (the book), so not an N3 pair', C.red],
          ['✘ different types: W is gravitational, R is contact', C.red],
          ['They balance because the book is in equilibrium (1st law)', C.navy],
          ['R = W + P = ' + fx(R, 1) + ' N, but W stays ' + fx(BOOK_M * G, 1) + ' N', C.navy]
        ];
      } else if (sel === 'none') {
        lines = [['Click any arrow to highlight its Newton’s third law partner.', C.muted]];
      } else {
        const pt = PAIR_TEXT[sel];
        const F = sel === 'grav' ? BOOK_M * G : sel === 'contact' ? BOOK_M * G + p.P : p.P;
        if (F < 0.01) lines = [['Push with your hand to create this interaction.', C.muted]];
        else {
          lines = [
            ['✔ act on different bodies: the book and the ' + pt[0], C.green],
            ['✔ same type of force: both ' + pt[1], C.green],
            ['✔ equal size: both ' + fx(F, 1) + ' N', C.green],
            ['✔ opposite directions, along the same line', C.green]
          ];
        }
      }
      if (wide && lines.length === 4) {
        const half = (w - 20) / 2;
        lines.forEach((ln, i) => Sim.text(ctx, ln[0], 12 + (i % 2) * half, ty0 + 12 + Math.floor(i / 2) * 22, { size: 13, color: ln[1], bold: i < 2 && sel === 'book' }));
      } else {
        lines.forEach((ln, i) => Sim.text(ctx, ln[0], 12, ty0 + 6 + i * 17, { size: wide ? 13 : 12, color: ln[1] }));
      }
    },
    readout(s) {
      const Wb = BOOK_M * G, P = s.p.P, R = Wb + P;
      return [
        ['on the book: W =', fx(Wb, 1) + ' N down'],
        ['P =', fx(P, 0) + ' N down'],
        ['R =', fx(R, 1) + ' N up'],
        ['resultant on the book =', '0 (equilibrium)', true]
      ];
    },
    pointer: {
      touchAction: 'pan-y',
      down(s, pt) {
        let best = null, bd = 16;
        s.state.hits.forEach((hh) => {
          const dy = pt.y < hh.y1 ? hh.y1 - pt.y : pt.y > hh.y2 ? pt.y - hh.y2 : 0;
          const d = Math.hypot(pt.x - hh.x, dy);
          if (d < bd) { bd = d; best = hh; }
        });
        if (best) s.set('pair', best.pair);
      }
    }
  });

  /* ======================================================================
     5. Collisions and explosions on an air track
     ====================================================================== */
  const TRACK = 2.0;
  const halfLen = (m) => 0.07 + 0.045 * m;
  function collideSolve(p) {
    const mA = p.mA, mB = p.mB, M = mA + mB;
    if (p.mode === 'explode') {
      const u = p.uA, E = p.E;
      return { uA: u, uB: u, vA: u - Math.sqrt((2 * E * mB) / (mA * M)), vB: u + Math.sqrt((2 * E * mA) / (mB * M)), meet: true };
    }
    const uA = p.uA, uB = p.uB;
    if (uA - uB <= 1e-9) return { uA, uB, vA: uA, vB: uB, meet: false };
    const e = p.type === 'stick' ? 0 : p.type === 'elastic' ? 1 : 0.5;
    const P = mA * uA + mB * uB;
    return { uA, uB, vA: (P - mB * e * (uA - uB)) / M, vB: (P + mA * e * (uA - uB)) / M, meet: true };
  }
  const KE = (m, v) => 0.5 * m * v * v;

  Sim.create('#sim-collide', {
    title: 'Air track: collisions and explosions',
    height: (w) => (w >= 640 ? 372 : 512),
    controls: [
      {
        key: 'mode', type: 'select', label: 'Event', value: 'collide',
        options: [['collide', 'Collision: A runs into B'], ['explode', 'Explosion (spring release)']],
        onChange: (s, v) => {
          s.setLabel('uA', v === 'explode' ? 'Starting velocity (A and B)' : 'Velocity of A before');
          s.setLabel('uB', v === 'explode' ? 'Velocity of B (not used)' : 'Velocity of B before');
        }
      },
      { key: 'type', type: 'select', label: 'Collision type', value: 'stick', options: [['stick', 'Sticky: they join together'], ['elastic', 'Perfectly bouncy (elastic)'], ['part', 'Partly bouncy']] },
      { key: 'mA', label: 'Mass of A', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'mB', label: 'Mass of B', min: 0.2, max: 2, step: 0.1, value: 1, unit: 'kg', format: (v) => v.toFixed(1) },
      { key: 'uA', label: 'Velocity of A before', min: -1, max: 1, step: 0.05, value: 0.6, unit: 'm s⁻¹', format: (v) => fx(v, 2) },
      { key: 'uB', label: 'Velocity of B before', min: -1, max: 1, step: 0.05, value: 0, unit: 'm s⁻¹', format: (v) => fx(v, 2) },
      { key: 'E', label: 'Spring energy (explosion)', min: 0.05, max: 1, step: 0.05, value: 0.3, unit: 'J', format: (v) => v.toFixed(2) }
    ],
    onChange(s) { s.reset(); s.play(); },
    animate: true,
    init(s) {
      const p = s.p, lA = halfLen(p.mA), lB = halfLen(p.mB);
      if (p.mode === 'explode') {
        s.state = { xA: TRACK / 2 - lA - 0.025, xB: TRACK / 2 + lB + 0.025, vA: p.uA, vB: p.uA, hit: false, t: 0, done: false };
      } else {
        s.state = { xA: 0.5, xB: 1.5, vA: p.uA, vB: p.uB, hit: false, t: 0, done: false };
      }
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (st.done) { s.reset(); return; }
      const lA = halfLen(p.mA), lB = halfLen(p.mB);
      const n = 6, hh = dt / n;
      for (let i = 0; i < n; i++) {
        st.xA += st.vA * hh;
        st.xB += st.vB * hh;
        st.t += hh;
        if (!st.hit) {
          if (p.mode === 'explode') {
            if (st.t >= 0.6) { const r = collideSolve(p); st.vA = r.vA; st.vB = r.vB; st.hit = true; }
          } else if (st.xB - lB - (st.xA + lA) <= 0 && st.vA > st.vB) {
            const r = collideSolve(p);
            st.vA = r.vA; st.vB = r.vB; st.hit = true;
            const over = (st.xA + lA) - (st.xB - lB);
            if (over > 0) { st.xA -= over / 2; st.xB += over / 2; }
          }
        }
      }
      if (st.xA - lA <= 0 || st.xB + lB >= TRACK || st.t > 9) {
        st.xA = Sim.clamp(st.xA, lA, TRACK - lA);
        st.xB = Sim.clamp(st.xB, lB, TRACK - lB);
        st.done = true;
        s.pause();
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const r = collideSolve(p);
      const x0 = 18, x1 = w - 18, kx = (x1 - x0) / TRACK;
      const X = (x) => x0 + x * kx;
      const railY = 112;
      // track
      Sim.rect(ctx, x0 - 6, railY, x1 - x0 + 12, 12, { fill: '#adb5bd', r: 3 });
      for (let x = x0 + 6; x < x1; x += 14) Sim.circle(ctx, x, railY + 4, 1.4, { fill: '#6c757d' });
      Sim.rect(ctx, x0 - 10, railY - 14, 6, 26, { fill: '#495057' });
      Sim.rect(ctx, x1 + 4, railY - 14, 6, 26, { fill: '#495057' });
      const lA = halfLen(p.mA), lB = halfLen(p.mB);
      const vlab = [];
      const gl = (x, l, m, color, name, v, side) => {
        const left = X(x - l), right = X(x + l);
        Sim.rect(ctx, left, railY - 30, right - left, 28, { fill: color, r: 4 });
        if (right - left > 72) Sim.text(ctx, name + ' ' + m.toFixed(1) + ' kg', (left + right) / 2, railY - 16, { size: 11.5, bold: true, color: '#fff', align: 'center' });
        else {
          Sim.text(ctx, name, (left + right) / 2, railY - 16, { size: 12, bold: true, color: '#fff', align: 'center' });
          Sim.text(ctx, m.toFixed(1) + ' kg', (left + right) / 2, railY + 24, { size: 11.5, bold: true, color, align: 'center' });
        }
        // bumpers
        const bx = side > 0 ? right : left;
        if (p.mode === 'collide') {
          if (p.type === 'stick') Sim.rect(ctx, bx - (side > 0 ? 0 : 5), railY - 24, 5, 16, { fill: '#343a40', r: 1 });
          else if (side > 0) Sim.spring(ctx, bx, railY - 16, bx + 14, railY - 16, { coils: 3, width: 5, lead: 2, color: '#343a40' });
        }
        const cx = (left + right) / 2;
        let lift = 0;
        if (vlab.length && Math.abs(vlab[0] - cx) < 96) lift = 36;
        vlab.push(cx);
        if (Math.abs(v) > 0.01) {
          const len = Sim.clamp(v * 70, -120, 120);
          Sim.arrow(ctx, cx, railY - 46 - lift, cx + len, railY - 46 - lift, { color, width: 2.8, head: 9 });
          Sim.text(ctx, fx(v, 2) + ' m s⁻¹', Sim.clamp(cx + len / 2, 42, w - 42), railY - 62 - lift, { size: 12, bold: true, color, align: 'center', bg: BG });
        } else Sim.text(ctx, 'at rest', cx, railY - 46 - lift, { size: 12, color: C.muted, align: 'center' });
      };
      if (p.mode === 'explode' && !st.hit) {
        Sim.spring(ctx, X(st.xA + lA), railY - 16, X(st.xB - lB), railY - 16, { coils: 4, width: 6, lead: 1, color: C.green });
      }
      gl(st.xA, lA, p.mA, C.blue, 'A', st.vA, 1);
      gl(st.xB, lB, p.mB, C.orange, 'B', st.vB, -1);
      let note = '';
      if (p.mode === 'collide' && !r.meet) note = 'A is not catching B, so they never collide: make A faster than B.';
      else if (!st.hit) note = p.mode === 'explode' ? 'Spring compressed…' : 'Watch the collision…';
      if (note) Sim.text(ctx, note, w / 2, railY + 42, { size: 12.5, italic: true, color: C.muted, align: 'center' });

      // panels
      const top = 166;
      const PM = wide ? { x: 16, y: top, w: w / 2 - 28, h: h - top - 8 } : { x: 10, y: top, w: w - 20, h: 178 };
      const PK = wide ? { x: w / 2 + 12, y: top, w: w / 2 - 28, h: h - top - 8 } : { x: 10, y: top + 188, w: w - 20, h: h - top - 196 };
      const showAfter = st.hit || (p.mode === 'collide' && !r.meet);
      // momentum
      const pa0 = p.mA * r.uA, pb0 = p.mB * r.uB, pa1 = p.mA * r.vA, pb1 = p.mB * r.vB;
      Sim.rect(ctx, PM.x, PM.y, PM.w, PM.h, { fill: '#fbfcff', stroke: '#dfe5ee', width: 1.2, r: 8 });
      Sim.text(ctx, 'Momentum / kg m s⁻¹ (right +)', PM.x + 10, PM.y + 14, { size: 12.5, bold: true, color: C.navy });
      const lw = 78, zx = PM.x + lw + (PM.w - lw - 16) / 2, half = (PM.w - lw - 16) / 2 - 34;
      const pmax = Math.max(0.3, Math.abs(pa0), Math.abs(pb0), Math.abs(pa1), Math.abs(pb1), Math.abs(pa0 + pb0));
      const ps = half / pmax;
      Sim.line(ctx, zx, PM.y + 28, zx, PM.y + PM.h - 8, { color: C.axis, width: 1.2 });
      const pbar = (y, label, val, color, thick) => {
        Sim.text(ctx, label, PM.x + 10, y, { size: 12, color: C.muted });
        const len = val * ps;
        if (Math.abs(len) > 0.5) Sim.rect(ctx, Math.min(zx, zx + len), y - (thick ? 7 : 5), Math.abs(len), thick ? 14 : 10, { fill: color, r: 2 });
        Sim.text(ctx, fx(val, 2), zx + len + (val >= 0 ? 5 : -5), y, { size: 11.5, bold: true, color, align: val >= 0 ? 'left' : 'right' });
      };
      const gy = (PM.h - 50) / 7;
      Sim.text(ctx, 'before', PM.x + 10, PM.y + 34, { size: 12, bold: true, color: C.ink });
      pbar(PM.y + 34 + gy, '  A', pa0, C.blue);
      pbar(PM.y + 34 + 2 * gy, '  B', pb0, C.orange);
      pbar(PM.y + 34 + 3 * gy, '  total', pa0 + pb0, C.navy, true);
      Sim.text(ctx, 'after', PM.x + 10, PM.y + 34 + 4 * gy, { size: 12, bold: true, color: C.ink });
      if (showAfter) {
        pbar(PM.y + 34 + 5 * gy, '  A', pa1, C.blue);
        pbar(PM.y + 34 + 6 * gy, '  B', pb1, C.orange);
        pbar(PM.y + 34 + 7 * gy, '  total', pa1 + pb1, C.navy, true);
      } else Sim.text(ctx, 'waiting…', zx, PM.y + 34 + 5.5 * gy, { size: 12, italic: true, color: C.muted, align: 'center' });

      // kinetic energy
      Sim.rect(ctx, PK.x, PK.y, PK.w, PK.h, { fill: '#fbfcff', stroke: '#dfe5ee', width: 1.2, r: 8 });
      Sim.text(ctx, 'Kinetic energy / J', PK.x + 10, PK.y + 14, { size: 12.5, bold: true, color: C.navy });
      const k0a = KE(p.mA, r.uA), k0b = KE(p.mB, r.uB), k1a = KE(p.mA, r.vA), k1b = KE(p.mB, r.vB);
      const extra = p.mode === 'explode' ? p.E : 0;
      const lost = p.mode === 'collide' ? Math.max(0, k0a + k0b - k1a - k1b) : 0;
      const tot = Math.max(1e-6, k0a + k0b + extra);
      const bx0 = PK.x + 62, bw = PK.w - 62 - 14, es = bw / tot;
      const ebar = (y, segs) => {
        let x = bx0;
        Sim.rect(ctx, bx0, y - 10, bw, 20, { fill: '#f1f3f7', r: 3 });
        segs.forEach((q) => {
          const ww = q[0] * es;
          if (ww > 0.5) Sim.rect(ctx, x, y - 10, ww, 20, { fill: q[1], r: 2 });
          if (ww > 40) Sim.text(ctx, fx(q[0], 2), x + ww / 2, y, { size: 11.5, bold: true, color: '#fff', align: 'center' });
          x += ww;
        });
      };
      const yb = PK.y + 44, ya = PK.y + 80;
      Sim.text(ctx, 'before', PK.x + 10, yb, { size: 12, bold: true, color: C.ink });
      ebar(yb, [[k0a, C.blue], [k0b, C.orange], [extra, C.green]]);
      Sim.text(ctx, 'after', PK.x + 10, ya, { size: 12, bold: true, color: C.ink });
      if (showAfter) ebar(ya, [[k1a, C.blue], [k1b, C.orange], [lost, '#adb5bd']]);
      else Sim.text(ctx, 'waiting…', bx0 + bw / 2, ya, { size: 12, italic: true, color: C.muted, align: 'center' });
      const ly = PK.y + 112;
      Sim.rect(ctx, PK.x + 10, ly - 6, 12, 12, { fill: C.blue, r: 2 });
      Sim.text(ctx, 'A', PK.x + 26, ly, { size: 12, color: C.ink });
      Sim.rect(ctx, PK.x + 44, ly - 6, 12, 12, { fill: C.orange, r: 2 });
      Sim.text(ctx, 'B', PK.x + 60, ly, { size: 12, color: C.ink });
      if (p.mode === 'explode') {
        Sim.rect(ctx, PK.x + 78, ly - 6, 12, 12, { fill: C.green, r: 2 });
        Sim.text(ctx, 'elastic energy from the spring', PK.x + 94, ly, { size: 12, color: C.ink });
      } else {
        Sim.rect(ctx, PK.x + 78, ly - 6, 12, 12, { fill: '#adb5bd', r: 2 });
        Sim.text(ctx, 'lost to thermal energy and sound', PK.x + 94, ly, { size: 12, color: C.ink });
      }
      if (showAfter && PK.h > 130) {
        const msg = p.mode === 'explode' ? 'KE increased by ' + fx(extra, 2) + ' J' : lost < 1e-4 ? 'No KE lost: an elastic collision' : fx((lost / Math.max(1e-9, k0a + k0b)) * 100, 0) + '% of the KE was transferred';
        Sim.text(ctx, msg, PK.x + 10, ly + 24, { size: 12.5, bold: true, color: C.navy });
      }
    },
    readout(s) {
      const p = s.p, r = collideSolve(p);
      const P0 = p.mA * r.uA + p.mB * r.uB, P1 = p.mA * r.vA + p.mB * r.vB;
      return [
        ['total p before =', fx(P0, 3) + ' kg m s⁻¹'],
        ['total p after =', fx(P1, 3) + ' kg m s⁻¹', true],
        ['v of A after =', fx(r.vA, 3) + ' m s⁻¹'],
        ['v of B after =', fx(r.vB, 3) + ' m s⁻¹'],
        ['KE before =', fx(KE(p.mA, r.uA) + KE(p.mB, r.uB), 3) + ' J'],
        ['KE after =', fx(KE(p.mA, r.vA) + KE(p.mB, r.vB), 3) + ' J']
      ];
    }
  });
})();
