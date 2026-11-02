/* Nuclear & Particle Physics — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const QE = 1.60e-19, MP = 1.67e-27, MEV = 1.60e-13;

  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const m = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / m;
    const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (const k of steps) if (n <= k + 1e-9) return k * m;
    return 10 * m;
  }

  /* ---------- particle symbols with bars, subscripts and superscripts ---------- */
  const SUP = { '+': '⁺', '−': '⁻', '-': '⁻', '0': '⁰' };
  const mainOf = (s) => s.b + (s.sup ? s.sup.split('').map((c) => SUP[c] || c).join('') : '');
  function symWidth(ctx, s, size) {
    const wm = Sim.measure(ctx, mainOf(s), { size, bold: true });
    const ws = s.sub ? Sim.measure(ctx, s.sub, { size: Math.max(11, size * 0.72), bold: true }) + 1 : 0;
    return wm + ws;
  }
  function drawSym(ctx, s, x, y, o) {
    o = o || {};
    const size = o.size || 16, color = o.color || C.ink;
    const W = symWidth(ctx, s, size);
    let x0 = x;
    if (o.align === 'center') x0 = x - W / 2;
    else if (o.align === 'right') x0 = x - W;
    const main = mainOf(s);
    const wb = Sim.measure(ctx, s.b, { size, bold: true });
    const wm = Sim.measure(ctx, main, { size, bold: true });
    Sim.text(ctx, main, x0, y, { size, bold: true, color });
    if (s.bar) Sim.line(ctx, x0 + wb * 0.08, y - size * 0.62, x0 + wb * 0.92, y - size * 0.62, { color, width: Math.max(1.4, size / 11), cap: 'butt' });
    if (s.sub) Sim.text(ctx, s.sub, x0 + wm + 1, y + size * 0.34, { size: Math.max(11, size * 0.72), bold: true, color });
    return W;
  }

  /* ======================================================================
     1. Rutherford alpha scattering
     ====================================================================== */
  const ELEMENTS = { 13: 'aluminium', 26: 'iron', 29: 'copper', 47: 'silver', 50: 'tin', 78: 'platinum', 79: 'gold', 82: 'lead', 92: 'uranium' };
  const D_REF = (2.88 * 79) / 5; // fm: head-on closest approach, 5 MeV alpha on gold
  const VIEW_H = 8 * D_REF;      // half-height of the view in fm
  const BEAM = 3 * VIEW_H;       // alphas are aimed anywhere within ±BEAM
  const BINS = [['< 10°', 0, 10], ['10° – 30°', 10, 30], ['30° – 90°', 30, 90], ['> 90°', 90, 181]];
  function closest(s) { return (2.88 * s.p.Z) / s.p.E; } // fm (ke² = 1.44 MeV fm, alpha charge 2e)
  function alphaPath(b, d, X0, X1, H) {
    let x = -X0, y = b, vx = 1, vy = 0;
    const pts = [[x, y]];
    const k = d / 2;
    const DT = 3;
    let tAcc = 0, next = DT;
    const acc = (px, py) => { const r = Math.max(Math.hypot(px, py), 0.2 * d); const r3 = r * r * r; return [(k * px) / r3, (k * py) / r3]; };
    let a = acc(x, y);
    for (let i = 0; i < 30000; i++) {
      const r = Math.hypot(x, y), vm = Math.hypot(vx, vy);
      const dt = Math.min(DT, (0.04 * r) / Math.max(vm, 0.05));
      x += vx * dt + 0.5 * a[0] * dt * dt;
      y += vy * dt + 0.5 * a[1] * dt * dt;
      const a2 = acc(x, y);
      vx += 0.5 * (a[0] + a2[0]) * dt;
      vy += 0.5 * (a[1] + a2[1]) * dt;
      a = a2;
      tAcc += dt;
      if (tAcc >= next) { pts.push([x, y]); next += DT; }
      if (x > X1 + 40 || x < -X0 - 40 || Math.abs(y) > H + 40) { pts.push([x, y]); break; }
    }
    return pts;
  }
  function rutherGeom(s) {
    const wide = s.w >= 700;
    const view = wide ? { x: 0, y: 0, w: s.w - 270, h: s.h } : { x: 0, y: 0, w: s.w, h: 290 };
    const scale = (view.h / 2 - 8) / VIEW_H; // px per fm
    const cx = view.x + view.w * 0.55, cy = view.y + view.h / 2;
    return { wide, view, scale, cx, cy, X0: (cx - view.x) / scale, X1: (view.x + view.w - cx) / scale };
  }
  function fireAlphas(s, n, drawn) {
    const st = s.state;
    const G = rutherGeom(s);
    const d = closest(s);
    for (let i = 0; i < n; i++) {
      const b = (Math.random() * 2 - 1) * BEAM;
      const th = s.p.model === 'nuc' ? (2 * Math.atan(d / (2 * Math.abs(b) + 1e-9)) * 180) / Math.PI : 0;
      st.count[BINS.findIndex((B) => th >= B[1] && th < B[2])]++;
      st.total++;
      if (drawn && Math.abs(b) < VIEW_H) {
        const pts = s.p.model === 'nuc' ? alphaPath(b, d, G.X0, G.X1, VIEW_H) : [[-G.X0, b], [G.X1 + 40, b]];
        if (s.p.model !== 'nuc') { const L = G.X0 + G.X1 + 40; const m = Math.ceil(L / 3); for (let j = 1; j < m; j++) pts.splice(j, 0, [-G.X0 + (L * j) / m, b]); }
        st.live.push({ pts, i: -Math.random() * (n > 1 ? 160 : 0), th });
      }
    }
    if (!s.running) s.play();
  }
  Sim.create('#sim-rutherford', {
    title: 'Rutherford alpha scattering',
    height: (w) => (w >= 700 ? 420 : 500),
    controls: [
      { key: 'model', type: 'select', label: 'Model of the atom', value: 'nuc', options: [['nuc', 'Nuclear model (tiny nucleus)'], ['pud', 'Plum pudding model']], onChange: (s) => clearR(s) },
      { key: 'Z', label: 'Proton number of the foil Z', min: 13, max: 92, step: 1, value: 79, format: (v) => v.toFixed(0) + (ELEMENTS[v] ? ' (' + ELEMENTS[v] + ')' : '') , onChange: (s) => clearR(s) },
      { key: 'E', label: 'Alpha kinetic energy', min: 1, max: 10, step: 0.5, value: 5, unit: 'MeV', format: (v) => v.toFixed(1), onChange: (s) => clearR(s) },
      { type: 'button', label: 'Fire 1', onClick: (s) => fireAlphas(s, 1, true) },
      { type: 'button', label: 'Fire 25', onClick: (s) => fireAlphas(s, 25, true) },
      { type: 'button', label: 'Fire 1000', onClick: (s) => fireAlphas(s, 1000, false) },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => clearR(s) }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) {
      s.state = { live: [], traces: [], count: [0, 0, 0, 0], total: 0 };
      fireAlphas(s, 25, true);
    },
    update(s, dt) {
      const st = s.state;
      st.live.forEach((a) => { a.i += dt * 230; });
      const done = st.live.filter((a) => a.i >= a.pts.length - 1);
      if (done.length) {
        done.forEach((a) => st.traces.push(a));
        st.live = st.live.filter((a) => a.i < a.pts.length - 1);
        if (st.traces.length > 80) st.traces.splice(0, st.traces.length - 80);
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const G = rutherGeom(s);
      const { view, scale, cx, cy } = G;
      const X = (fx) => cx + fx * scale, Y = (fy) => cy - fy * scale;
      ctx.save();
      ctx.beginPath(); ctx.rect(view.x, view.y, view.w, view.h); ctx.clip();
      if (p.model === 'pud') {
        Sim.rect(ctx, view.x, view.y, view.w, view.h, { fill: '#fff0f3' });
        for (let i = 0; i < 9; i++) {
          const ex = view.x + ((i * 0.37 + 0.11) % 1) * view.w, ey = view.y + ((i * 0.61 + 0.23) % 1) * view.h;
          Sim.circle(ctx, ex, ey, 4, { fill: C.blue });
          Sim.text(ctx, '−', ex, ey, { size: 9, bold: true, color: '#fff', align: 'center' });
        }
      }
      // faint traces then live alphas
      const col = (th) => (th > 90 ? C.red : th > 30 ? C.orange : th > 10 ? '#e8a100' : C.navy);
      st.traces.forEach((a) => Sim.polyline(ctx, a.pts.map((q) => [X(q[0]), Y(q[1])]), { color: col(a.th), width: 1.4, alpha: 0.4 }));
      st.live.forEach((a) => {
        if (a.i < 0) return;
        const k = Math.min(a.pts.length - 1, Math.floor(a.i));
        const pts = a.pts.slice(0, k + 1).map((q) => [X(q[0]), Y(q[1])]);
        Sim.polyline(ctx, pts, { color: col(a.th), width: 2 });
        const q = pts[pts.length - 1];
        Sim.circle(ctx, q[0], q[1], 4.5, { fill: C.red, stroke: '#fff', width: 1.5 });
      });
      if (p.model === 'nuc') {
        Sim.circle(ctx, cx, cy, 6, { fill: C.red, stroke: '#7a1010', width: 1.5 });
        Sim.text(ctx, 'nucleus, +' + p.Z + 'e', cx + 10, cy + 16, { size: 12, color: C.red, bold: true, bg: 'rgba(255,255,255,0.8)' });
        // a circle at the head-on closest approach distance
        const d = closest(s);
        if (d * scale > 8) Sim.circle(ctx, cx, cy, d * scale, { stroke: 'rgba(224,49,49,0.45)', width: 1.2, dash: [3, 4] });
      } else {
        Sim.text(ctx, 'positive charge spread through the whole atom', view.x + view.w / 2, view.y + view.h - 14, { size: 12, color: C.pink, bold: true, align: 'center', bg: 'rgba(255,255,255,0.8)' });
      }
      ctx.restore();
      Sim.text(ctx, 'α beam →', view.x + 8, view.y + 14, { size: 12.5, bold: true, color: C.navy });
      const bar = 100; // fm
      Sim.line(ctx, view.x + 10, view.y + view.h - 30, view.x + 10 + bar * scale, view.y + view.h - 30, { color: C.ink, width: 3, cap: 'butt' });
      Sim.text(ctx, '100 fm = 10⁻¹³ m', view.x + 10, view.y + view.h - 44, { size: 11.5, color: C.ink, bold: true });

      // tally panel
      const tp = G.wide ? { x: w - 258, y: 14, w: 244, h: h - 28 } : { x: 10, y: 300, w: w - 20, h: h - 310 };
      Sim.rect(ctx, tp.x, tp.y, tp.w, tp.h, { fill: '#f5f7fb', r: 10 });
      Sim.text(ctx, 'Deflection tally (' + st.total + ' fired)', tp.x + 12, tp.y + 18, { size: 13, bold: true, color: C.navy });
      const rowH = G.wide ? 46 : 30, labW = 74, bx = tp.x + 12 + labW, bw = tp.w - 24 - labW - 54;
      BINS.forEach((B, i) => {
        const y = tp.y + 40 + i * rowH;
        const frac = st.total ? st.count[i] / st.total : 0;
        Sim.text(ctx, B[0], tp.x + 12, y + 9, { size: 12, color: C.ink, bold: true });
        Sim.rect(ctx, bx, y, bw, 18, { fill: '#e9ecef', r: 4 });
        if (frac > 0) Sim.rect(ctx, bx, y, Math.max(2, bw * frac), 18, { fill: col(B[1] + 1), r: 4 });
        Sim.text(ctx, (100 * frac).toFixed(1) + '%', bx + bw + 6, y + 9, { size: 12, color: C.ink, bold: true });
      });
      const back = st.count[3];
      const msg = st.total ? (back ? 'about 1 in ' + Math.round(st.total / back) + ' bounced back' : 'none bounced back yet') : 'fire some alphas';
      Sim.text(ctx, msg, tp.x + 12, tp.y + 40 + 4 * rowH + 8, { size: 12.5, color: back ? C.red : C.muted, bold: true });
      if (G.wide) {
        Sim.text(ctx, 'Only alphas passing through', tp.x + 12, tp.y + 40 + 4 * rowH + 36, { size: 11.5, color: C.muted });
        Sim.text(ctx, 'this zoomed view are drawn.', tp.x + 12, tp.y + 40 + 4 * rowH + 52, { size: 11.5, color: C.muted });
      }
    },
    readout(s) {
      const st = s.state;
      const d = closest(s);
      return [
        ['closest approach (head-on) =', s.p.model === 'nuc' ? d.toFixed(1) + ' fm = ' + Sim.fmt(d * 1e-15, 2) + ' m' : 'n/a'],
        ['fired:', String(st.total)],
        ['deflected > 90°:', st.total ? ((100 * st.count[3]) / st.total).toFixed(2) + '%' : '—', true]
      ];
    }
  });
  function clearR(s) { s.state.live = []; s.state.traces = []; s.state.count = [0, 0, 0, 0]; s.state.total = 0; }

  /* ======================================================================
     2. Linear accelerator
     ====================================================================== */
  function nTubes(w) { return w >= 700 ? 8 : 6; }
  function linacPlan(s) {
    const n = nTubes(s.w);
    const L = [];
    for (let j = 1; j <= n; j++) L.push(s.p.equal ? 1 : Math.sqrt(j));
    let E = 0, tau = 0;
    const segs = [], kicks = [];
    for (let i = 0; i <= n; i++) {
      const gain = Math.pow(-1, i) * Math.cos(Math.PI * tau);
      E = Math.max(0.05, E + gain);
      kicks.push({ tau, gain, E });
      const v = Math.sqrt(E);
      if (i === n) { segs.push({ j: n + 1, tau0: tau, tau1: tau + 1.6, v, E }); break; }
      const dt = L[i] / v;
      segs.push({ j: i + 1, tau0: tau, tau1: tau + dt, v, E });
      tau += dt;
    }
    return { n, L, segs, kicks };
  }
  function linacInject(s) { s.state.plan = linacPlan(s); s.state.tau = -0.5; if (!s.running) s.play(); }
  Sim.create('#sim-linac', {
    title: 'Linear accelerator (linac)',
    height: (w) => (w >= 700 ? 380 : 400),
    controls: [
      { key: 'V0', label: 'Peak p.d. between tubes', min: 20, max: 200, step: 10, value: 100, unit: 'kV', format: (v) => v.toFixed(0) },
      { key: 'f', label: 'Supply frequency', min: 5, max: 40, step: 1, value: 10, unit: 'MHz', format: (v) => v.toFixed(0) },
      { key: 'equal', type: 'check', label: 'Make all tubes the same length', value: false, onChange: (s) => linacInject(s) },
      { type: 'button', label: 'Inject a proton', onClick: (s) => linacInject(s) }
    ],
    animate: true,
    resetButton: false,
    init(s) { s.state = { tau: -0.5 }; s.state.plan = linacPlan(s); },
    update(s, dt) {
      const st = s.state;
      st.tau += dt * 0.75;
      const last = st.plan.segs[st.plan.segs.length - 1];
      if (st.tau > last.tau1 + 0.6) linacInject(s);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const plan = st.plan;
      if (plan.n !== nTubes(w)) { st.plan = linacPlan(s); return; }
      const n = plan.n;
      const tau = st.tau;
      const cosT = Math.cos(Math.PI * Math.max(tau, 0));
      const gap = 24, left = 58, right = 30;
      let designTot = 0;
      for (let j = 1; j <= n; j++) designTot += Math.sqrt(j);
      const unit = (w - left - right - (n + 1) * gap) / designTot;
      const ty = 70, th = 44;
      // positions: gap i centre and tube j start/end
      const gapC = [], tubeX = [];
      let x = left;
      for (let i = 0; i <= n; i++) {
        gapC.push(x + gap / 2);
        x += gap;
        if (i < n) { const Lp = plan.L[i] * unit; tubeX.push([x, x + Lp]); x += Lp; }
      }
      // source (tube 0)
      const srcPhi = cosT; // (−1)^0
      Sim.rect(ctx, left - 46, ty + 6, 46, th - 12, { fill: srcPhi > 0 ? 'rgba(224,49,49,' + (0.15 + 0.35 * Math.abs(srcPhi)) + ')' : 'rgba(0,123,255,' + (0.15 + 0.35 * Math.abs(srcPhi)) + ')', stroke: C.axis, width: 1.5, r: 4 });
      Sim.text(ctx, 'source', left - 23, ty - 8, { size: 11.5, color: C.muted, align: 'center' });
      // beam pipe
      Sim.line(ctx, left - 2, ty + th / 2, w - 6, ty + th / 2, { color: '#dee2e6', width: 2, dash: [4, 4] });
      // tubes
      for (let j = 1; j <= n; j++) {
        const phi = Math.pow(-1, j) * cosT;
        const [x0, x1] = tubeX[j - 1];
        const a = 0.15 + 0.45 * Math.abs(phi);
        Sim.rect(ctx, x0, ty, x1 - x0, th, { fill: phi > 0 ? 'rgba(224,49,49,' + a + ')' : 'rgba(0,123,255,' + a + ')', stroke: C.axis, width: 1.5, r: 5 });
        if (x1 - x0 > 16) Sim.text(ctx, phi > 0 ? '+' : '−', (x0 + x1) / 2, ty + 12, { size: 14, bold: true, color: phi > 0 ? C.red : C.blue, align: 'center' });
        Sim.text(ctx, String(j), (x0 + x1) / 2, ty + th + 12, { size: 11, color: C.muted, align: 'center' });
      }
      // gap fields
      for (let i = 0; i <= n - 1; i++) {
        const fwd = Math.pow(-1, i) * cosT;
        const L = 4 + 7 * Math.abs(fwd);
        const gx = gapC[i];
        if (Math.abs(fwd) > 0.08) Sim.arrow(ctx, gx - (fwd > 0 ? L : -L), ty - 10, gx + (fwd > 0 ? L : -L), ty - 10, { color: fwd > 0 ? C.green : C.red, width: 2.6, head: 8 });
      }
      Sim.text(ctx, 'arrows in the gaps: electric field (green = forwards)', w / 2, 16, { size: 12, color: C.muted, align: 'center', italic: true });
      // supply bus bars
      const yA = ty + th + 30, yB = ty + th + 44;
      Sim.line(ctx, left - 34, yA, tubeX[n - 1][1], yA, { color: C.ink, width: 1.5 });
      Sim.line(ctx, left - 34, yB, tubeX[n - 1][1], yB, { color: C.ink, width: 1.5 });
      for (let j = 1; j <= n; j++) {
        const xm = (tubeX[j - 1][0] + tubeX[j - 1][1]) / 2;
        const yb = j % 2 ? yA : yB;
        Sim.line(ctx, xm, ty + th + 18, xm, yb, { color: C.ink, width: 1.5 });
        Sim.circle(ctx, xm, yb, 2.5, { fill: C.ink });
      }
      Sim.line(ctx, left - 23, ty + th - 6, left - 23, yB, { color: C.ink, width: 1.5 });
      Sim.circle(ctx, left - 23, yB, 2.5, { fill: C.ink });
      Sim.circle(ctx, left - 44, (yA + yB) / 2, 9, { fill: '#fff', stroke: C.ink, width: 1.5 });
      Sim.text(ctx, '~', left - 44, (yA + yB) / 2 - 1, { size: 15, bold: true, color: C.ink, align: 'center' });

      // the proton
      let px = left - 23, E = 0;
      if (tau >= 0) {
        const sg = plan.segs.find((q) => tau >= q.tau0 && tau < q.tau1) || plan.segs[plan.segs.length - 1];
        const f = Sim.clamp((tau - sg.tau0) / (sg.tau1 - sg.tau0), 0, 1);
        const j = sg.j;
        const xa = gapC[j - 1];
        const xb = j <= n ? gapC[j] : gapC[n] + (sg.v * unit * 1.6);
        px = xa + (xb - xa) * f;
        E = sg.E;
      }
      if (px < w + 10) {
        Sim.circle(ctx, px, ty + th / 2, 6.5, { fill: C.red, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, '+', px, ty + th / 2, { size: 10, bold: true, color: '#fff', align: 'center' });
      }

      // energy graph
      const gb = { x: 60, y: yB + 46, w: w - 60 - 24, h: h - yB - 46 - 34 };
      const last = plan.segs[plan.segs.length - 1];
      const tauMax = Math.max(2, last.tau1);
      const halfNs = 1000 / (2 * p.f); // ns per half-period
      const Emax = niceMax((n + 1) * p.V0 * 1.05);
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: tauMax * halfNs, ymin: 0, ymax: Emax, xlabel: 't / ns', ylabel: 'kinetic energy / keV', title: 'energy gained' }, gb)).axes();
      const pts = [];
      let Eacc = 0;
      plan.kicks.forEach((k) => { if (k.tau <= tau) { pts.push([k.tau * halfNs, Eacc * p.V0]); Eacc = k.E; pts.push([k.tau * halfNs, Eacc * p.V0]); } });
      if (pts.length) { pts.push([Math.min(tau, tauMax) * halfNs, Eacc * p.V0]); g.path(pts, { color: C.navy, width: 2.6 }); }
      if (!p.equal) g.plot((t) => Math.min(n + 1, Math.floor(t / halfNs + 1e-9) + 1) * p.V0, { color: 'rgba(47,158,68,0.5)', width: 1.4, dash: [5, 4] });
      void E;
    },
    readout(s) {
      const st = s.state, p = s.p, plan = st.plan;
      const sg = st.tau >= 0 ? plan.segs.find((q) => st.tau >= q.tau0 && st.tau < q.tau1) || plan.segs[plan.segs.length - 1] : null;
      const E = sg ? sg.E : 0;
      const Ej = E * p.V0 * 1e3 * QE;
      const v = Math.sqrt((2 * Ej) / MP);
      const half = 1 / (2 * p.f * 1e6);
      const out = [
        ['where:', !sg ? 'at the source' : sg.j <= plan.n ? 'inside tube ' + sg.j : 'leaving the linac'],
        ['kinetic energy =', Sim.fmt(E * p.V0, 3) + ' keV', true],
        ['speed =', Sim.fmt(v, 3) + ' m s⁻¹'],
        ['half-period T/2 =', Sim.fmt(half * 1e9, 3) + ' ns']
      ];
      if (sg && sg.j <= plan.n) out.push(['length of this tube =', Sim.fmt(plan.L[sg.j - 1] * Math.sqrt((2 * p.V0 * 1e3 * QE) / MP) * half, 3) + ' m']);
      return out;
    }
  });

  /* ======================================================================
     3. Cyclotron
     ====================================================================== */
  const R_DEE = 0.5;
  function cycInject(s) {
    const p = s.p;
    const Emax = Math.pow(p.B * QE * R_DEE, 2) / (2 * MP);
    const dE = QE * p.V * 1e6;
    const nCross = Math.max(1, Emax / dE);
    const Th = Sim.clamp(9 / nCross, 0.12, 0.6);
    s.state = { t: 0, k: 0, E: 0, y: 0, Th, Tosc: Th * (p.detune ? 1.08 : 1), trail: [[0, 0]], hist: [[0, 0]], out: null, done: false, cross: [], kMax: Math.ceil(2.5 * nCross + 10) };
    cycCross(s); // the first push across the gap at t = 0
    if (!s.running) s.play();
  }
  function cycCross(s) {
    const st = s.state, p = s.p;
    const k = st.k;
    const gain = QE * p.V * 1e6 * Math.cos(Math.PI * k * (st.Th / st.Tosc - 1));
    st.E = Math.max(0.2 * QE * p.V * 1e6, st.E + gain);
    st.cross.push([k * st.Th, gain > 0]);
    const pm = Math.sqrt(2 * MP * st.E);
    const r = pm / (p.B * QE);
    const dir = k % 2 === 0 ? 1 : -1;
    const c = st.y + dir * r;
    st.seg = { r, dir, c, y0: st.y, t0: k * st.Th };
    st.hist.push([k + 1, st.E / MEV]);
    if (Math.abs(c) + r > 0.95 * R_DEE) st.seg.exit = true;
  }
  function cycPos(seg, f) {
    const ph = Math.PI * f;
    if (seg.dir > 0) return [seg.r * Math.sin(ph), seg.c - seg.r * Math.cos(ph)];
    return [-seg.r * Math.sin(ph), seg.c + seg.r * Math.cos(ph)];
  }
  Sim.create('#sim-cyclotron', {
    title: 'Cyclotron',
    height: (w) => (w >= 700 ? 420 : 360 + 2 * 150),
    controls: [
      { key: 'B', label: 'Magnetic flux density B', min: 0.6, max: 1.5, step: 0.05, value: 1, unit: 'T', format: (v) => v.toFixed(2), onChange: (s) => cycInject(s) },
      { key: 'V', label: 'Peak p.d. across the gap', min: 0.3, max: 1.5, step: 0.1, value: 0.8, unit: 'MV', format: (v) => v.toFixed(1), onChange: (s) => cycInject(s) },
      { key: 'detune', type: 'check', label: 'Detune the oscillator by 8%', value: false, onChange: (s) => cycInject(s) },
      { type: 'button', label: 'Inject a proton', onClick: (s) => cycInject(s) }
    ],
    animate: true,
    resetButton: false,
    init(s) { cycInject(s); },
    update(s, dt) {
      const st = s.state;
      if (st.done) { st.t += dt; if (st.t > st.doneAt + 2.5) cycInject(s); return; }
      st.t += dt;
      if (st.out) {
        st.out.L += dt * 900;
        if (st.out.L > 1400) { st.done = true; st.doneAt = st.t; }
        return;
      }
      const seg = st.seg;
      let f = (st.t - seg.t0) / st.Th;
      if (seg.exit && f >= 0.5) {
        const q = cycPos(seg, 0.5);
        st.trail.push(q);
        st.out = { x: q[0], y: q[1], dir: seg.dir, L: 0 };
        return;
      }
      if (f >= 1) {
        const q = cycPos(seg, 1);
        st.trail.push(q);
        st.y = q[1];
        st.k++;
        if (st.k > st.kMax) { st.done = true; st.doneAt = st.t; return; }
        cycCross(s);
        f = (st.t - st.seg.t0) / st.Th;
      }
      const q = cycPos(st.seg, Sim.clamp(f, 0, 1));
      const lastP = st.trail[st.trail.length - 1];
      if (Math.hypot(q[0] - lastP[0], q[1] - lastP[1]) > 0.004) st.trail.push(q);
      if (st.trail.length > 20000) st.trail.splice(0, 2000);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const Rpx = wide ? 182 : Math.min(160, w / 2 - 14);
      const cx = wide ? 210 : w / 2, cy = wide ? h / 2 : 180;
      const sc = Rpx / R_DEE;
      const X = (x) => cx + x * sc, Y = (y) => cy - y * sc;
      const gapPx = 12;
      const vNow = Math.cos((Math.PI * st.t) / st.Tosc); // + means the left dee is positive
      // dees
      const dee = (side) => {
        const phi = side < 0 ? vNow : -vNow;
        const a = 0.12 + 0.3 * Math.abs(phi);
        ctx.save();
        ctx.beginPath();
        if (side > 0) ctx.arc(cx + gapPx / 2, cy, Rpx, -Math.PI / 2, Math.PI / 2);
        else ctx.arc(cx - gapPx / 2, cy, Rpx, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.closePath();
        ctx.fillStyle = phi > 0 ? 'rgba(224,49,49,' + a + ')' : 'rgba(0,123,255,' + a + ')';
        ctx.fill();
        ctx.strokeStyle = C.axis; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        Sim.text(ctx, phi > 0 ? '+' : '−', cx + side * (Rpx * 0.72), cy - Rpx * 0.62, { size: 20, bold: true, color: phi > 0 ? C.red : C.blue, align: 'center' });
      };
      dee(-1); dee(1);
      // field crosses
      for (let gx = -Rpx + 16; gx < Rpx; gx += 30) {
        for (let gy = -Rpx + 16; gy < Rpx; gy += 30) {
          if (gx * gx + gy * gy > (Rpx - 10) * (Rpx - 10) || Math.abs(gx) < gapPx) continue;
          Sim.line(ctx, cx + gx - 3, cy + gy - 3, cx + gx + 3, cy + gy + 3, { color: 'rgba(73,80,87,0.35)', width: 1.2 });
          Sim.line(ctx, cx + gx + 3, cy + gy - 3, cx + gx - 3, cy + gy + 3, { color: 'rgba(73,80,87,0.35)', width: 1.2 });
        }
      }
      // gap field arrow (from + dee to − dee)
      if (Math.abs(vNow) > 0.1) {
        const L = 14 * Math.abs(vNow);
        const d = vNow > 0 ? 1 : -1;
        Sim.arrow(ctx, cx - d * L, cy + Rpx * 0.82, cx + d * L, cy + Rpx * 0.82, { color: C.green, width: 2.2, head: 7 });
        Sim.text(ctx, 'E', cx, cy + Rpx * 0.82 - 12, { size: 12, bold: true, color: C.green, align: 'center' });
      }
      Sim.text(ctx, 'B into the page', cx, cy - Rpx - 10 > 8 ? cy - Rpx - 8 : 10, { size: 11.5, color: C.muted, align: 'center' });
      // trail
      const pts = st.trail.map((q) => [X(q[0]), Y(q[1])]);
      let cur;
      if (st.out) {
        const o = st.out;
        cur = [X(o.x), Y(o.y) - o.dir * o.L];
        pts.push(cur);
      } else if (!st.done) {
        const f = Sim.clamp((st.t - st.seg.t0) / st.Th, 0, 1);
        const q = cycPos(st.seg, f);
        cur = [X(q[0]), Y(q[1])];
        pts.push(cur);
      }
      Sim.polyline(ctx, pts, { color: C.navy, width: 1.8 });
      if (cur && cur[0] > -10 && cur[0] < w + 10) {
        Sim.circle(ctx, cur[0], cur[1], 5.5, { fill: C.red, stroke: '#fff', width: 1.5 });
      }
      if (st.out) Sim.text(ctx, 'beam extracted', X(st.out.x) + st.out.dir * 12, Y(st.out.y) - st.out.dir * 60, { size: 12, bold: true, color: C.green, align: st.out.dir > 0 ? 'left' : 'right', bg: 'rgba(255,255,255,0.85)' });

      // graphs
      const boxes = wide
        ? [{ x: 470, y: 36, w: w - 470 - 22, h: (h - 36 - 40) / 2 - 30 }, { x: 470, y: 36 + (h - 36 - 40) / 2 + 24, w: w - 470 - 22, h: (h - 36 - 40) / 2 - 24 }]
        : [{ x: 56, y: 360 + 26, w: w - 56 - 16, h: 150 - 56 }, { x: 56, y: 360 + 150 + 26, w: w - 56 - 16, h: 150 - 56 }];
      const span = 6 * st.Th;
      const t1 = Math.max(span, st.t), t0 = t1 - span;
      const gv = Sim.graph(ctx, Object.assign({ xmin: t0, xmax: t1, ymin: -1.2, ymax: 1.2, xlabel: 't', ylabel: 'gap p.d. / V₀', title: 'p.d. across the gap', ticks: false }, boxes[0])).axes();
      gv.plot((t) => Math.cos((Math.PI * t) / st.Tosc), { color: C.purple, width: 2.2 });
      st.cross.forEach(([tc, good], i) => {
        if (tc < t0 || tc > t1) return;
        const sign = i % 2 === 0 ? 1 : -1; // the useful sign alternates with direction
        gv.dot(tc, Math.cos((Math.PI * tc) / st.Tosc), { color: good ? C.green : C.red, r: 5 });
        void sign;
      });
      Sim.text(ctx, 'dots: when the proton crosses the gap', boxes[0].x + boxes[0].w, boxes[0].y + boxes[0].h + 12, { size: 11, color: C.muted, align: 'right' });
      const Emax = Math.pow(p.B * QE * R_DEE, 2) / (2 * MP) / MEV;
      const nMax = Math.max(4, st.hist.length + 1);
      const ge = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: nMax, ymin: 0, ymax: niceMax(Emax * 1.1), xlabel: 'crossings', ylabel: 'Eₖ / MeV', title: 'kinetic energy' }, boxes[1])).axes();
      ge.path(st.hist, { color: C.navy, width: 2.4 });
      ge.hline(Emax, { color: 'rgba(47,158,68,0.6)' });
      ge.label(nMax * 0.98, Emax + niceMax(Emax * 1.1) * 0.07, 'maximum: dee edge', { size: 11, color: C.green, align: 'right', bold: false });
    },
    readout(s) {
      const st = s.state, p = s.p;
      const f = (p.B * QE) / (2 * Math.PI * MP);
      const r = st.seg ? st.seg.r : 0;
      const Emax = Math.pow(p.B * QE * R_DEE, 2) / (2 * MP) / MEV;
      return [
        ['f = BQ/2πm =', Sim.fmt(f / 1e6, 3) + ' MHz', true],
        ['time per half-turn =', Sim.fmt(Math.PI * MP / (p.B * QE) * 1e9, 3) + ' ns (same every turn)'],
        ['Eₖ now =', Sim.fmt(st.E / MEV, 3) + ' MeV'],
        ['radius now =', Sim.fmt(r, 3) + ' m'],
        ['max Eₖ (r = 0.50 m) =', Sim.fmt(Emax, 3) + ' MeV']
      ];
    }
  });

  /* ======================================================================
     4. Bubble-chamber track viewer
     ====================================================================== */
  const TP = {
    p: { lab: 'p', q: 1, m: 938.3, kl: 0.3 },
    em: { lab: 'e⁻', q: -1, m: 0.511, kl: 1.1 },
    ep: { lab: 'e⁺', q: 1, m: 0.511, kl: 1.1 },
    pip: { lab: 'π⁺', q: 1, m: 139.6, kl: 0.18 },
    pim: { lab: 'π⁻', q: -1, m: 139.6, kl: 0.18 },
    mup: { lab: 'μ⁺', q: 1, m: 105.7, kl: 0.18 },
    mum: { lab: 'μ⁻', q: -1, m: 105.7, kl: 0.18 }
  };
  const PX_PER_M = (w) => (w >= 700 ? w / 1.0 : w / 0.9);
  function trackPts(s, type, x, y, a, pMeV, maxLenPx, stopX) {
    const t = TP[type];
    const sc = PX_PER_M(s.w);
    const sgnIn = s.p.rev ? -1 : 1;
    const pts = [];
    let p = pMeV, len = 0;
    const ds = 2;
    while (len < maxLenPx && p > 4) {
      const beta = p / Math.sqrt(p * p + t.m * t.m);
      pts.push([x, y, beta]);
      const rpx = (3.333e-3 * p / s.p.B) * sc;
      a += (-t.q * sgnIn * ds) / Math.max(rpx, 1);
      x += ds * Math.cos(a); y += ds * Math.sin(a);
      len += ds;
      if (s.p.loss) p -= (t.kl * p + 5 * Math.min(6, 1 / (beta * beta))) * (ds / sc);
      if (x < -10 || x > s.w + 10 || y < -10 || y > s.h + 10) break;
      if (stopX != null && x >= stopX) break;
    }
    return { pts, a, x, y, p };
  }
  function fireTrack(s, archive) {
    const st = s.state, p = s.p, w = s.w, h = s.h;
    if (archive !== false) st.old = st.old.concat([st.ev]).filter(Boolean).slice(-3);
    const ev = { tracks: [], t: 0, notes: [] };
    if (p.ev === 'single') {
      const tr = trackPts(s, p.part, 6, h * 0.5, 0, p.p, 9000);
      ev.tracks.push({ pts: tr.pts, t0: 0, label: TP[p.part].lab, q: TP[p.part].q });
    } else if (p.ev === 'pair') {
      const vx = w * 0.24, vy = h * 0.5;
      ev.tracks.push({ pts: [[0, vy, 1], [vx, vy, 1]], t0: 0, label: 'γ', neutral: true });
      const t0 = vx / 600;
      const a = trackPts(s, 'em', vx, vy, -0.06, p.p / 2, 9000);
      const b = trackPts(s, 'ep', vx, vy, 0.06, p.p / 2, 9000);
      ev.tracks.push({ pts: a.pts, t0, label: 'e⁻', q: -1 }, { pts: b.pts, t0, label: 'e⁺', q: 1 });
      ev.vertex = [vx, vy];
    } else if (p.ev === 'vee') {
      const vx = w * 0.3, vy = h * 0.5;
      ev.tracks.push({ pts: [[0, vy, 1], [vx, vy, 1]], t0: 0, label: 'K⁰', neutral: true });
      const t0 = vx / 600;
      const ang = 22 * Math.PI / 180, pp = p.p / (2 * Math.cos(ang));
      const a = trackPts(s, 'pip', vx, vy, -ang, pp, 9000);
      const b = trackPts(s, 'pim', vx, vy, ang, pp, 9000);
      ev.tracks.push({ pts: a.pts, t0, label: 'π⁺', q: 1 }, { pts: b.pts, t0, label: 'π⁻', q: -1 });
      ev.vertex = [vx, vy];
    } else {
      const first = trackPts(s, 'pip', 6, h * 0.62, 0, p.p, 9000, w * 0.42);
      ev.tracks.push({ pts: first.pts, t0: 0, label: 'π⁺', q: 1 });
      const t0 = first.pts.length * 2 / 600;
      if (first.x >= w * 0.42 - 3) {
        const aMu = first.a - 0.32;
        const pmu = 0.8 * first.p;
        const mu = trackPts(s, 'mup', first.x, first.y, aMu, pmu, 9000);
        ev.tracks.push({ pts: mu.pts, t0, label: 'μ⁺', q: 1 });
        // neutrino direction from momentum conservation: p_ν = p_π − p_μ
        const nx = first.p * Math.cos(first.a) - pmu * Math.cos(aMu), ny = first.p * Math.sin(first.a) - pmu * Math.sin(aMu);
        const nl = Math.hypot(nx, ny) || 1;
        const L = Math.min(w, h) * 0.45;
        ev.tracks.push({ pts: [[first.x, first.y, 1], [first.x + (nx / nl) * L, first.y + (ny / nl) * L, 1]], t0, label: 'ν', neutral: true });
        ev.vertex = [first.x, first.y];
      }
    }
    st.ev = ev;
    if (!s.running) s.play();
  }
  function drawTrack(ctx, tr, shown, faded) {
    const pts = tr.pts;
    if (pts.length < 2) return;
    const nShow = Math.min(pts.length, Math.floor(shown / 2) + 1);
    if (nShow < 1) return;
    if (tr.neutral) {
      const a = pts[0], b = pts[Math.min(pts.length - 1, nShow - 1)];
      const fx = pts.length === 2 ? Math.min(1, shown / Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])) : 1;
      const ex = pts.length === 2 ? a[0] + (pts[1][0] - a[0]) * fx : b[0], ey = pts.length === 2 ? a[1] + (pts[1][1] - a[1]) * fx : b[1];
      Sim.line(ctx, a[0], a[1], ex, ey, { color: 'rgba(134,142,150,' + (faded ? 0.25 : 0.7) + ')', width: 1.3, dash: [3, 6] });
      return;
    }
    let acc = 0;
    const col = faded ? 'rgba(51,51,51,0.28)' : tr.q > 0 ? '#c92a2a' : '#1c3d8c';
    for (let i = 1; i < nShow; i++) {
      const q = pts[i];
      acc += 2;
      const spacing = Sim.clamp(5 * q[2] * q[2], 1.6, 5);
      if (acc >= spacing) {
        acc = 0;
        Sim.circle(ctx, q[0], q[1], 1.4 + 1.1 * (1 - q[2] * q[2]), { fill: col });
      }
    }
  }
  Sim.create('#sim-tracks', {
    title: 'Bubble-chamber track viewer',
    height: (w) => (w >= 700 ? 420 : 380),
    controls: [
      { key: 'ev', type: 'select', label: 'Event', value: 'single', options: [['single', 'A single charged particle'], ['pair', 'Pair production: γ → e⁻ + e⁺'], ['vee', 'Neutral particle decays: K⁰ → π⁺ + π⁻'], ['kink', 'Decay in flight: π⁺ → μ⁺ + ν']], onChange: (s) => fireTrack(s) },
      { key: 'part', type: 'select', label: 'Particle (single)', value: 'p', options: [['p', 'proton'], ['em', 'electron'], ['ep', 'positron'], ['pip', 'π⁺ (positive pion)'], ['pim', 'π⁻ (negative pion)'], ['mum', 'μ⁻ (muon)']], onChange: (s) => { if (s.p.ev === 'single') fireTrack(s); } },
      { key: 'p', label: 'Momentum p', min: 20, max: 400, step: 5, value: 150, unit: 'MeV/c', format: (v) => v.toFixed(0), onChange: (s) => fireTrack(s, false) },
      { key: 'B', label: 'Flux density B', min: 0.5, max: 3, step: 0.1, value: 1.5, unit: 'T', format: (v) => v.toFixed(1), onChange: (s) => fireTrack(s, false) },
      { key: 'rev', type: 'check', label: 'Field out of the page', value: false, onChange: (s) => fireTrack(s, false) },
      { key: 'loss', type: 'check', label: 'Energy loss by ionisation', value: true, onChange: (s) => fireTrack(s, false) },
      { type: 'button', label: 'Fire', onClick: (s) => fireTrack(s) },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { s.state.old = []; s.state.ev = null; } }
    ],
    animate: true,
    resetButton: false,
    init(s) { s.state = { old: [], ev: null }; fireTrack(s); },
    update(s, dt) {
      const ev = s.state.ev;
      if (!ev) return;
      ev.t += dt;
      const endT = Math.max(...ev.tracks.map((t) => t.t0 + (t.pts.length * 2) / 600));
      if (ev.t > endT + 0.2) { ev.t = endT + 0.2; s.pause(); }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      Sim.rect(ctx, 0, 0, w, h, { fill: '#fbf8ef' });
      // faint field marks
      for (let x = 20; x < w; x += 40) for (let y = 20; y < h; y += 40) {
        if (p.rev) { Sim.circle(ctx, x, y, 3, { stroke: 'rgba(120,110,90,0.25)', width: 1 }); }
        else { Sim.line(ctx, x - 3, y - 3, x + 3, y + 3, { color: 'rgba(120,110,90,0.25)', width: 1 }); Sim.line(ctx, x + 3, y - 3, x - 3, y + 3, { color: 'rgba(120,110,90,0.25)', width: 1 }); }
      }
      st.old.forEach((ev) => ev.tracks.forEach((tr) => drawTrack(ctx, tr, 1e9, true)));
      const ev = st.ev;
      if (ev) {
        ev.tracks.forEach((tr) => {
          const shown = (ev.t - tr.t0) * 600;
          if (shown <= 0) return;
          drawTrack(ctx, tr, shown, false);
          // label near the start of each visible track
          const k = Math.min(tr.pts.length - 1, Math.max(0, Math.floor(Math.min(shown, 150) / 2)));
          const q = tr.pts[Math.min(k, tr.pts.length - 1)];
          if (q) Sim.text(ctx, tr.label + (tr.neutral ? ' (no track)' : ''), q[0] + 6, q[1] + (tr.q < 0 ? 16 : -14), { size: 12.5, bold: true, color: tr.neutral ? C.muted : tr.q > 0 ? '#c92a2a' : '#1c3d8c', bg: 'rgba(251,248,239,0.85)' });
        });
        if (ev.vertex) Sim.circle(ctx, ev.vertex[0], ev.vertex[1], 4, { stroke: C.green, width: 2 });
      }
      Sim.text(ctx, 'B ' + (p.rev ? 'out of' : 'into') + ' the page', w - 10, 14, { size: 12, bold: true, color: C.navy, align: 'right', bg: 'rgba(251,248,239,0.9)' });
      const sc = PX_PER_M(w);
      Sim.line(ctx, 12, h - 14, 12 + 0.1 * sc, h - 14, { color: C.ink, width: 3, cap: 'butt' });
      Sim.text(ctx, '10 cm', 12, h - 28, { size: 11.5, bold: true, color: C.ink });
    },
    readout(s) {
      const p = s.p;
      const r = (3.333e-3 * p.p) / p.B;
      const out = [
        ['p =', p.p.toFixed(0) + ' MeV/c = ' + Sim.fmt(p.p * 5.33e-22, 3) + ' kg m s⁻¹'],
        ['r = p/BQ (start) =', Sim.fmt(r, 3) + ' m', true]
      ];
      if (p.ev === 'single') {
        const t = TP[p.part];
        out.push(['curls', (t.q > 0) !== p.rev ? 'anticlockwise: positive' : 'clockwise: negative']);
      } else if (p.ev === 'pair') out.push(['charge:', '0 → (−1) + (+1) ✔']);
      else if (p.ev === 'vee') out.push(['charge:', '0 → (+1) + (−1) ✔']);
      else out.push(['charge:', '+1 → (+1) + 0 ✔']);
      return out;
    }
  });

  /* ======================================================================
     5. Quark builder
     ====================================================================== */
  const QK = {
    u: { s: { b: 'u' }, q: 2, col: '#e03131' }, d: { s: { b: 'd' }, q: -1, col: '#2f9e44' }, s: { s: { b: 's' }, q: -1, col: '#1971c2' },
    U: { s: { b: 'u', bar: true }, q: -2, col: '#e03131', anti: true }, D: { s: { b: 'd', bar: true }, q: 1, col: '#2f9e44', anti: true }, S: { s: { b: 's', bar: true }, q: 1, col: '#1971c2', anti: true }
  };
  const QORDER = ['u', 'd', 's', 'U', 'D', 'S'];
  const HADRONS = {
    'd,u,u': 'proton, p', 'd,d,u': 'neutron, n', 'u,u,u': 'Δ⁺⁺ (delta)', 'd,d,d': 'Δ⁻ (delta)',
    'd,s,u': 'Λ⁰ (lambda)', 's,u,u': 'Σ⁺ (sigma)', 'd,d,s': 'Σ⁻ (sigma)', 's,s,u': 'Ξ⁰ (xi)', 'd,s,s': 'Ξ⁻ (xi)', 's,s,s': 'Ω⁻ (omega)',
    'D,U,U': 'antiproton, p̄', 'D,D,U': 'antineutron, n̄', 'U,U,U': 'anti-Δ⁺⁺', 'D,D,D': 'anti-Δ⁻',
    'D,S,U': 'anti-lambda', 'S,U,U': 'anti-sigma', 'D,D,S': 'anti-sigma', 'S,S,U': 'anti-xi', 'D,S,S': 'anti-xi', 'S,S,S': 'anti-omega',
    'D,u': 'π⁺ (positive pion)', 'U,d': 'π⁻ (negative pion)', 'U,u': 'π⁰ (neutral pion)', 'D,d': 'π⁰ (neutral pion)',
    'S,u': 'K⁺ (kaon)', 'U,s': 'K⁻ (kaon)', 'S,d': 'K⁰ (neutral kaon)', 'D,s': 'anti-K⁰ (neutral kaon)', 'S,s': 'φ (phi meson)'
  };
  function wrapText(ctx, str, x, y, maxW, o, lh) {
    const words = str.split(' ');
    let line = '', yy = y;
    words.forEach((wd) => {
      const t = line ? line + ' ' + wd : wd;
      if (Sim.measure(ctx, t, o) > maxW && line) { Sim.text(ctx, line, x, yy, o); line = wd; yy += lh; } else line = t;
    });
    if (line) Sim.text(ctx, line, x, yy, o);
    return yy + lh;
  }
  function thirds(n) {
    if (n === 0) return '0';
    if (n % 3 === 0) return (n > 0 ? '+' : '−') + Math.abs(n / 3);
    return (n > 0 ? '+' : '−') + Math.abs(n) + '/3';
  }
  function analyse(list) {
    const nq = list.filter((c) => !QK[c].anti).length, na = list.length - nq;
    const Q = list.reduce((a, c) => a + QK[c].q, 0);
    const B = nq - na; // in thirds
    let type, ok = false, why = '';
    if (!list.length) { type = 'empty'; why = 'Tap or drag quarks from the tray into the bag.'; }
    else if (list.length === 1) { type = 'not allowed'; why = 'Quarks are never found on their own.'; }
    else if (list.length === 2) {
      if (nq === 1) { type = 'meson'; ok = true; why = 'A quark and an antiquark: a meson.'; }
      else { type = 'not allowed'; why = 'Two quarks (or two antiquarks) do not make a hadron.'; }
    } else {
      if (nq === 3) { type = 'baryon'; ok = true; why = 'Three quarks: a baryon.'; }
      else if (na === 3) { type = 'antibaryon'; ok = true; why = 'Three antiquarks: an antibaryon.'; }
      else { type = 'not allowed'; why = 'Quarks and antiquarks mixed in threes do not form a hadron.'; }
    }
    const key = list.slice().sort().join(',');
    const name = ok ? HADRONS[key] || (type === 'meson' ? 'a meson' : 'a ' + type) : '';
    return { Q, B, type, ok, why, name };
  }
  function qGeom(s) {
    const wide = s.w >= 700;
    const bag = wide ? { x: s.w * 0.24, y: 130, r: 98 } : { x: s.w / 2, y: 104, r: 82 };
    const n = QORDER.length;
    const tw = wide ? 64 : Math.min(56, (s.w - 20) / n);
    const ty = s.h - 38;
    const tokens = QORDER.map((c, i) => ({ c, x: s.w / 2 + (i - (n - 1) / 2) * tw, y: ty }));
    return { wide, bag, tokens, tr: wide ? 22 : 19 };
  }
  function inBagPos(G, k, n) {
    const r = G.bag.r * 0.45;
    if (n === 1) return [G.bag.x, G.bag.y];
    if (n === 2) return [G.bag.x + (k ? r * 0.75 : -r * 0.75), G.bag.y];
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return [G.bag.x + r * Math.cos(a), G.bag.y + r * Math.sin(a) + 6];
  }
  function drawQuark(ctx, c, x, y, r) {
    const qd = QK[c];
    if (qd.anti) Sim.circle(ctx, x, y, r, { fill: '#fff', stroke: qd.col, width: 3 });
    else Sim.circle(ctx, x, y, r, { fill: qd.col, stroke: '#fff', width: 2 });
    drawSym(ctx, qd.s, x, y + 1, { size: r * 0.95, color: qd.anti ? qd.col : '#fff', align: 'center' });
  }
  Sim.create('#sim-quarks', {
    title: 'Quark builder',
    height: (w) => (w >= 700 ? 330 : 440),
    controls: [
      { type: 'button', label: 'Remove last', ghost: true, onClick: (s) => { s.state.list.pop(); } },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { s.state.list = []; } }
    ],
    init(s) { s.state = { list: ['u', 'u', 'd'], drag: null }; },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const G = qGeom(s);
      const A = analyse(st.list);
      // bag
      Sim.circle(ctx, G.bag.x, G.bag.y, G.bag.r, { fill: A.ok ? '#ebfbee' : st.list.length ? '#fff0f0' : '#f5f7fb', stroke: A.ok ? C.green : st.list.length ? C.red : '#ced4da', width: 2.5, dash: [7, 5] });
      st.list.forEach((c, k) => { const q = inBagPos(G, k, st.list.length); drawQuark(ctx, c, q[0], q[1], G.tr + 4); });
      if (!st.list.length) Sim.text(ctx, 'empty', G.bag.x, G.bag.y, { size: 14, italic: true, color: C.muted, align: 'center' });
      // info
      const ix = G.wide ? w * 0.47 : 18, iy = G.wide ? 46 : 208;
      Sim.text(ctx, A.ok ? A.name : A.type === 'empty' ? 'Build a hadron' : 'Not a real particle', ix, iy, { size: G.wide ? 21 : 17, bold: true, color: A.ok ? C.navy : A.type === 'empty' ? C.muted : C.red });
      const maxW = w - ix - 14;
      let yy = wrapText(ctx, A.why, ix, iy + 28, maxW, { size: 13.5, color: C.ink }, 19);
      if (st.list.length) {
        yy += 6;
        yy = wrapText(ctx, 'charge: ' + st.list.map((c) => thirds(QK[c].q)).join(' ') + ' = ' + thirds(A.Q) + (A.Q % 3 === 0 ? '' : ' (not a whole number)'), ix, yy, maxW, { size: 13.5, bold: true, color: A.Q % 3 === 0 ? C.ink : C.red }, 19);
        yy = wrapText(ctx, 'baryon number: ' + st.list.map((c) => (QK[c].anti ? '−1/3' : '+1/3')).join(' ') + ' = ' + thirds(A.B), ix, yy + 4, maxW, { size: 13.5, bold: true, color: A.B % 3 === 0 ? C.ink : C.red }, 19);
        if (A.ok) Sim.text(ctx, 'type: ' + A.type + (A.type === 'meson' ? ' (B = 0)' : A.type === 'baryon' ? ' (B = +1)' : ' (B = −1)'), ix, yy + 4, { size: 13.5, color: C.green, bold: true });
      }
      // tray
      Sim.rect(ctx, 8, G.tokens[0].y - G.tr - 22, w - 16, 2 * G.tr + 34, { fill: '#f5f7fb', r: 10 });
      Sim.text(ctx, 'quarks', G.tokens[0].x, G.tokens[0].y - G.tr - 11, { size: 11, color: C.muted, align: 'center' });
      Sim.text(ctx, 'antiquarks', G.tokens[3].x, G.tokens[3].y - G.tr - 11, { size: 11, color: C.muted, align: 'center' });
      G.tokens.forEach((t) => drawQuark(ctx, t.c, t.x, t.y, G.tr));
      if (st.drag && st.drag.moved) drawQuark(ctx, st.drag.c, st.drag.x, st.drag.y, G.tr + 2);
    },
    readout(s) {
      const A = analyse(s.state.list);
      return [
        ['quarks in the bag:', String(s.state.list.length)],
        ['total charge =', thirds(A.Q) + ' e', A.ok],
        ['baryon number =', thirds(A.B)]
      ];
    },
    pointer: {
      cursor: 'pointer',
      touchAction: 'pan-y',
      down(s, pt) {
        const st = s.state;
        const G = qGeom(s);
        const tok = G.tokens.find((t) => Math.hypot(pt.x - t.x, pt.y - t.y) < G.tr + 6);
        if (tok) { st.drag = { c: tok.c, x: pt.x, y: pt.y, sx: pt.x, sy: pt.y, moved: false }; return; }
        for (let k = st.list.length - 1; k >= 0; k--) {
          const q = inBagPos(G, k, st.list.length);
          if (Math.hypot(pt.x - q[0], pt.y - q[1]) < G.tr + 6) { st.list.splice(k, 1); return; }
        }
      },
      move(s, pt) {
        const d = s.state.drag;
        if (!d || !pt.down) return;
        d.x = pt.x; d.y = pt.y;
        if (Math.hypot(pt.x - d.sx, pt.y - d.sy) > 6) d.moved = true;
      },
      up(s, pt, e) {
        const st = s.state, d = st.drag;
        st.drag = null;
        if (!d || (e && e.type === 'pointercancel')) return;
        const G = qGeom(s);
        const inBag = Math.hypot(pt.x - G.bag.x, pt.y - G.bag.y) < G.bag.r + 10;
        if ((!d.moved || inBag) && st.list.length < 3) st.list.push(d.c);
      }
    }
  });

  /* ======================================================================
     6. Interaction checker: charge, baryon number, lepton number
     ====================================================================== */
  const PT = {
    p: { s: { b: 'p' }, Q: 1, B: 1, L: 0, m: 938.3 },
    pbar: { s: { b: 'p', bar: true }, Q: -1, B: -1, L: 0, m: 938.3 },
    n: { s: { b: 'n' }, Q: 0, B: 1, L: 0, m: 939.6 },
    nbar: { s: { b: 'n', bar: true }, Q: 0, B: -1, L: 0, m: 939.6 },
    em: { s: { b: 'e', sup: '−' }, Q: -1, B: 0, L: 1, m: 0.511 },
    ep: { s: { b: 'e', sup: '+' }, Q: 1, B: 0, L: -1, m: 0.511 },
    ve: { s: { b: 'ν', sub: 'e' }, Q: 0, B: 0, L: 1, m: 0 },
    vebar: { s: { b: 'ν', bar: true, sub: 'e' }, Q: 0, B: 0, L: -1, m: 0 },
    mum: { s: { b: 'μ', sup: '−' }, Q: -1, B: 0, L: 1, m: 105.7 },
    mup: { s: { b: 'μ', sup: '+' }, Q: 1, B: 0, L: -1, m: 105.7 },
    vm: { s: { b: 'ν', sub: 'μ' }, Q: 0, B: 0, L: 1, m: 0 },
    vmbar: { s: { b: 'ν', bar: true, sub: 'μ' }, Q: 0, B: 0, L: -1, m: 0 },
    pip: { s: { b: 'π', sup: '+' }, Q: 1, B: 0, L: 0, m: 139.6 },
    pim: { s: { b: 'π', sup: '−' }, Q: -1, B: 0, L: 0, m: 139.6 },
    pi0: { s: { b: 'π', sup: '0' }, Q: 0, B: 0, L: 0, m: 135.0 },
    g: { s: { b: 'γ' }, Q: 0, B: 0, L: 0, m: 0 }
  };
  const TRAY = ['p', 'pbar', 'n', 'nbar', 'em', 'ep', 've', 'vebar', 'mum', 'mup', 'pip', 'pim', 'pi0', 'g'];
  const RX = {
    bminus: [['n'], ['p', 'em', 'vebar']],
    nonu: [['n'], ['p', 'em']],
    bplus: [['p'], ['n', 'ep', 've']],
    pidecay: [['pip'], ['mup', 'vm']],
    mudecay: [['mum'], ['em', 'vebar', 'vm']],
    anni: [['em', 'ep'], ['g', 'g']],
    pair: [['g'], ['em', 'ep']],
    ppi0: [['p', 'p'], ['p', 'p', 'pi0']],
    pnpi: [['p', 'p'], ['p', 'n', 'pip']],
    pdecay: [['p'], ['pip', 'pi0']],
    ppbar: [['p', 'pbar'], ['pip', 'pim', 'pi0']],
    capture: [['p', 'em'], ['n', 've']],
    npi: [['n'], ['p', 'pim']],
    pin: [['pim', 'p'], ['n', 'pi0']]
  };
  function sides(s) {
    if (s.p.rx === 'build') return [s.state.L, s.state.R];
    const r = RX[s.p.rx];
    return [r[0], r[1]];
  }
  function sideBtnLabel(s) { return 'Adding to: ' + (s.state.side === 'L' ? 'before' : 'after') + ' (switch)'; }
  function toBuild(s) { if (s.p.rx !== 'build') s.set('rx', 'build'); }
  Sim.create('#sim-conserve', {
    title: 'Interaction checker',
    height: (w) => (w >= 700 ? 410 : 600),
    controls: [
      {
        key: 'rx', type: 'select', label: 'Reaction', value: 'bminus',
        options: [
          ['bminus', 'β⁻ decay: n → p + e⁻ + ν̄ₑ'], ['nonu', 'n → p + e⁻ (no antineutrino)'], ['bplus', 'β⁺ decay: p → n + e⁺ + νₑ'],
          ['pidecay', 'π⁺ → μ⁺ + ν_μ'], ['mudecay', 'μ⁻ → e⁻ + ν̄ₑ + ν_μ'], ['anni', 'Annihilation: e⁻ + e⁺ → γ + γ'], ['pair', 'Pair production: γ → e⁻ + e⁺'],
          ['ppi0', 'p + p → p + p + π⁰'], ['pnpi', 'p + p → p + n + π⁺'], ['pdecay', 'p → π⁺ + π⁰'], ['ppbar', 'p + p̄ → π⁺ + π⁻ + π⁰'],
          ['capture', 'Electron capture: p + e⁻ → n + νₑ'], ['npi', 'n → p + π⁻'], ['pin', 'π⁻ + p → n + π⁰'], ['build', 'Build your own…']
        ]
      },
      { key: 'side', type: 'button', label: 'Adding to: before (switch)', onClick: (s, b) => { toBuild(s); s.state.side = s.state.side === 'L' ? 'R' : 'L'; b.textContent = sideBtnLabel(s); } },
      { type: 'button', label: 'Undo', ghost: true, onClick: (s) => { toBuild(s); const arr = s.state.side === 'L' ? s.state.L : s.state.R; arr.pop(); } },
      { type: 'button', label: 'Clear', ghost: true, onClick: (s) => { toBuild(s); s.state.L = []; s.state.R = []; s.state.side = 'L'; const c = s.controls.side; if (c) c.el.textContent = sideBtnLabel(s); } }
    ],
    init(s) { s.state = { L: ['p', 'p'], R: ['p', 'p', 'pbar', 'p'], side: 'L' }; },
    draw(s) {
      const { ctx, w, h } = s;
      const st = s.state;
      const wide = w >= 700;
      const build = s.p.rx === 'build';
      const [Ls, Rs] = sides(s);
      // equation
      const size = wide ? 24 : 17;
      const parts = [];
      const pushSide = (arr) => { if (!arr.length) parts.push({ t: '?' }); arr.forEach((k, i) => { if (i) parts.push({ t: ' + ' }); parts.push({ s: PT[k].s }); }); };
      pushSide(Ls); parts.push({ t: '  →  ' }); pushSide(Rs);
      const widthOf = (q, sz) => (q.s ? symWidth(ctx, q.s, sz) : Sim.measure(ctx, q.t, { size: sz, bold: true }));
      let sz = size, tot = parts.reduce((a, q) => a + widthOf(q, sz), 0);
      if (tot > w - 24) { sz = (size * (w - 24)) / tot; tot = parts.reduce((a, q) => a + widthOf(q, sz), 0); }
      let x = (w - tot) / 2;
      const ey = 34;
      parts.forEach((q) => {
        if (q.s) x += drawSym(ctx, q.s, x, ey, { size: sz, color: C.navy });
        else { Sim.text(ctx, q.t, x, ey, { size: sz, bold: true, color: C.muted }); x += Sim.measure(ctx, q.t, { size: sz, bold: true }); }
      });
      if (build) Sim.text(ctx, 'tap the tray to add to the ' + (st.side === 'L' ? 'left (before)' : 'right (after)') + ' side', w / 2, ey + 26, { size: 12, italic: true, color: C.purple, align: 'center' });
      // tables
      const sum = (arr, k) => arr.reduce((a, c) => a + PT[c][k], 0);
      const colW = wide ? 52 : 44, nameW = wide ? 70 : 58, rowH = wide ? 24 : 21;
      const tblW = nameW + 3 * colW;
      const top = ey + (build ? 46 : 32);
      const blocks = wide ? [[w / 2 - tblW - 30, top, 'Before', Ls], [w / 2 + 30, top, 'After', Rs]] : [[(w - tblW) / 2, top, 'Before', Ls], [(w - tblW) / 2, top + rowH * (Ls.length + 3) + 6, 'After', Rs]];
      let blockBottom = top;
      blocks.forEach(([bx, by, title, arr]) => {
        Sim.text(ctx, title, bx, by + rowH / 2, { size: 13.5, bold: true, color: C.navy });
        ['Q', 'B', 'L'].forEach((k, i) => Sim.text(ctx, k, bx + nameW + colW * (i + 0.5), by + rowH / 2, { size: 13.5, bold: true, color: C.navy, align: 'center' }));
        arr.forEach((c, r) => {
          const yy = by + rowH * (r + 1.5);
          if (r % 2 === 0) Sim.rect(ctx, bx - 4, yy - rowH / 2, tblW + 8, rowH, { fill: '#f5f7fb' });
          drawSym(ctx, PT[c].s, bx + 6, yy, { size: 16, color: C.ink });
          ['Q', 'B', 'L'].forEach((k, i) => Sim.text(ctx, thirds(3 * PT[c][k]), bx + nameW + colW * (i + 0.5), yy, { size: 13.5, color: C.ink, align: 'center' }));
        });
        const yt = by + rowH * (arr.length + 1.5);
        Sim.line(ctx, bx - 4, yt - rowH / 2, bx + tblW + 4, yt - rowH / 2, { color: C.axis, width: 1.5 });
        Sim.text(ctx, 'total', bx + 6, yt, { size: 13.5, bold: true, color: C.ink });
        ['Q', 'B', 'L'].forEach((k, i) => Sim.text(ctx, thirds(3 * sum(arr, k)), bx + nameW + colW * (i + 0.5), yt, { size: 13.5, bold: true, color: C.navy, align: 'center' }));
        blockBottom = Math.max(blockBottom, yt + rowH / 2);
      });
      if (wide) Sim.text(ctx, '→', w / 2, top + rowH * 2, { size: 26, bold: true, color: C.muted, align: 'center' });
      // verdict
      const vy = blockBottom + (wide ? 22 : 18);
      const names = { Q: 'Charge', B: 'Baryon number', L: 'Lepton number' };
      const fails = [];
      const lineX = wide ? w / 2 - 190 : 18;
      if (Ls.length && Rs.length) {
        ['Q', 'B', 'L'].forEach((k, i) => {
          const a = sum(Ls, k), b = sum(Rs, k), ok = a === b;
          if (!ok) fails.push(names[k].toLowerCase());
          Sim.text(ctx, (ok ? '✔ ' : '✘ ') + names[k] + ': ' + thirds(3 * a) + ' → ' + thirds(3 * b), lineX, vy + i * 21, { size: 13.5, bold: true, color: ok ? C.green : C.red });
        });
        const mL = Ls.reduce((a, c) => a + PT[c].m, 0), mR = Rs.reduce((a, c) => a + PT[c].m, 0);
        let eTxt, eOk = true;
        if (Ls.length === 1 && PT[Ls[0]].m > 0) {
          eOk = mL >= mR;
          eTxt = (eOk ? '✔ ' : '✘ ') + 'Energy: rest energy ' + mL.toFixed(1) + ' MeV → ' + mR.toFixed(1) + ' MeV' + (eOk ? '' : ' (products too heavy)');
        } else if (Ls.length === 1) eTxt = 'Energy: the photon needs at least ' + mR.toFixed(2) + ' MeV';
        else eTxt = 'Energy: OK if the particles bring enough kinetic energy';
        Sim.text(ctx, eTxt, lineX, vy + 63, { size: wide ? 13.5 : 12, bold: eTxt[0] === '✔' || eTxt[0] === '✘', color: eTxt[0] === '✘' ? C.red : eTxt[0] === '✔' ? C.green : C.muted });
        if (!eOk) fails.push('energy');
        const ok = !fails.length;
        let verdict = ok ? 'Possible' : 'Impossible: ' + fails.join(' and ') + (fails.length > 1 ? ' are' : ' is') + ' not conserved';
        if (!ok && fails.length === 1 && fails[0] === 'energy') verdict = 'Impossible for a particle at rest: not enough rest energy';
        if (ok && s.p.rx === 'bplus') verdict = 'Allowed by Q, B and L, but only inside a nucleus';
        const vfs = wide ? 17 : 14;
        Sim.text(ctx, verdict, lineX, vy + 94, { size: vfs, bold: true, color: ok ? C.green : C.red });
      } else {
        Sim.text(ctx, 'Add particles to both sides to check the reaction.', lineX, vy, { size: 13.5, italic: true, color: C.muted });
      }
      // tray (build mode)
      {
        const per = wide ? 14 : 7;
        const tw = Math.min(58, (w - 24) / per), rows = Math.ceil(TRAY.length / per);
        const ty0 = h - rows * 40 - 8;
        Sim.rect(ctx, 6, ty0 - 26, w - 12, rows * 40 + 28, { fill: '#f5f7fb', r: 10 });
        Sim.text(ctx, build ? 'tray: tap a particle to add it' : 'tap a particle to start building your own reaction', w / 2, ty0 - 14, { size: 11.5, color: C.muted, align: 'center' });
        TRAY.forEach((k, i) => {
          const r = Math.floor(i / per), c = i % per;
          const nIn = Math.min(per, TRAY.length - r * per);
          const tx = w / 2 + (c - (nIn - 1) / 2) * tw, tyy = ty0 + 14 + r * 40;
          Sim.rect(ctx, tx - tw / 2 + 3, tyy - 15, tw - 6, 30, { fill: '#fff', stroke: '#c5d0e0', width: 1.5, r: 7 });
          drawSym(ctx, PT[k].s, tx, tyy - 1, { size: 16, color: C.navy, align: 'center' });
        });
        st.tray = { per, tw, ty0 };
      }
    },
    readout(s) {
      const [Ls, Rs] = sides(s);
      const sum = (arr, k) => arr.reduce((a, c) => a + PT[c][k], 0);
      const ok = Ls.length && Rs.length && ['Q', 'B', 'L'].every((k) => sum(Ls, k) === sum(Rs, k));
      return [['Q, B and L all conserved?', Ls.length && Rs.length ? (ok ? 'yes' : 'no') : '—', !!ok]];
    },
    pointer: {
      cursor: 'pointer',
      touchAction: 'pan-y',
      down(s, pt) {
        const st = s.state, T = st.tray;
        if (!T) return;
        TRAY.forEach((k, i) => {
          const r = Math.floor(i / T.per), c = i % T.per;
          const nIn = Math.min(T.per, TRAY.length - r * T.per);
          const tx = s.w / 2 + (c - (nIn - 1) / 2) * T.tw, tyy = T.ty0 + 14 + r * 40;
          if (Math.abs(pt.x - tx) < T.tw / 2 - 2 && Math.abs(pt.y - tyy) < 16) {
            if (s.p.rx !== 'build') { s.set('rx', 'build'); st.L = []; st.R = []; st.side = 'L'; const c = s.controls.side; if (c) c.el.textContent = sideBtnLabel(s); }
            const arr = st.side === 'L' ? st.L : st.R;
            if (arr.length < 4) arr.push(k);
          }
        });
      }
    }
  });
})();
