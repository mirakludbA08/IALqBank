/* Magnetic Fields & Induction — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const DEG = Math.PI / 180;
  const QE = 1.60e-19, ME = 9.11e-31, MP = 1.67e-27;

  function niceMax(v) {
    if (!(v > 0) || !isFinite(v)) return 1;
    const m = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / m;
    const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (const k of steps) if (n <= k + 1e-9) return k * m;
    return 10 * m;
  }
  const f3 = (v) => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);
  function poly(ctx, pts, fill, stroke) {
    Sim.polyline(ctx, pts, { close: true, fill, color: stroke || 'rgba(0,0,0,0.25)', width: 1 });
  }
  /* centre-zero galvanometer; frac in −1…1 */
  function galvo(ctx, x, y, r, frac, label) {
    Sim.circle(ctx, x, y, r, { fill: '#fff', stroke: C.ink, width: 2 });
    ctx.save();
    ctx.strokeStyle = C.axis; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.78, -Math.PI / 2 - 1.05, -Math.PI / 2 + 1.05);
    ctx.stroke();
    ctx.restore();
    for (let i = -4; i <= 4; i++) {
      const a = -Math.PI / 2 + (i / 4) * 1.05;
      const r1 = r * 0.78, r2 = r * (i === 0 ? 0.6 : 0.68);
      Sim.line(ctx, x + Math.cos(a) * r1, y + r * 0.35 + Math.sin(a) * r1, x + Math.cos(a) * r2, y + r * 0.35 + Math.sin(a) * r2, { color: C.axis, width: i === 0 ? 2 : 1 });
    }
    Sim.text(ctx, '−', x - r * 0.62, y + r * 0.02, { size: 13, bold: true, color: C.blue, align: 'center' });
    Sim.text(ctx, '+', x + r * 0.62, y + r * 0.02, { size: 13, bold: true, color: C.red, align: 'center' });
    const a = -Math.PI / 2 + Sim.clamp(frac, -1, 1) * 1.05;
    Sim.line(ctx, x, y + r * 0.35, x + Math.cos(a) * r * 0.8, y + r * 0.35 + Math.sin(a) * r * 0.8, { color: C.red, width: 2.5 });
    Sim.circle(ctx, x, y + r * 0.35, 3.5, { fill: C.ink });
    Sim.text(ctx, label || 'G', x, y + r * 0.62, { size: 11, bold: true, color: C.muted, align: 'center' });
  }

  /* ======================================================================
     1. Fleming's left-hand rule explorer (oblique 3-D view)
     ====================================================================== */
  Sim.create('#sim-flhr', {
    title: "Fleming's left-hand rule: force on a wire",
    height: (w) => (w >= 700 ? 400 : 440),
    controls: [
      { key: 'th', label: 'Angle θ between wire and field', min: 0, max: 180, step: 1, value: 90, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'I', label: 'Current I (negative = reversed)', min: -5, max: 5, step: 0.5, value: 3, unit: 'A', format: (v) => v.toFixed(1) },
      { key: 'B', label: 'Flux density B', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: 'T', format: (v) => v.toFixed(2) },
      { key: 'L', label: 'Length in the field l', min: 0.02, max: 0.2, step: 0.01, value: 0.05, unit: 'm', format: (v) => v.toFixed(2) },
      { key: 'flip', type: 'check', label: 'Flip the magnet (swap N and S)', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 700;
      const S = wide ? Math.min(98, h / 4.1) : Math.min((w - 16) / 5.6, 64);
      const cx = wide ? w * 0.33 : w / 2, cy = wide ? h * 0.52 : 132;
      const P = (x, y, z) => [cx + S * (x + 0.5 * y), cy - S * (z + 0.35 * y)];
      const sgnB = p.flip ? -1 : 1;
      const th = p.th * DEG;
      const d = [Math.cos(th), Math.sin(th)];
      const Fz = -p.I * sgnB * p.L * p.B * Math.sin(th);
      // magnet blocks
      const block = (x0, x1, pole) => {
        const col = pole === 'N' ? ['#e03131', '#ff8787', '#c92a2a'] : ['#1971c2', '#74c0fc', '#1864ab'];
        const y0 = -1, y1 = 1, z0 = -0.85, z1 = 0.85;
        poly(ctx, [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], col[1]);
        poly(ctx, [P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], col[2]);
        poly(ctx, [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)], col[0]);
        const c = P((x0 + x1) / 2, y0, 0);
        Sim.text(ctx, pole, c[0], c[1], { size: 22, bold: true, color: '#fff', align: 'center' });
      };
      block(-2.3, -1.45, p.flip ? 'S' : 'N');
      block(1.45, 2.3, p.flip ? 'N' : 'S');
      // field lines
      const fl = [[-0.55, -0.45], [-0.55, 0.45], [0.55, -0.45], [0.55, 0.45], [0, 0.0]];
      fl.forEach(([y, z], i) => {
        const a = P(-1.35 * sgnB, y, z), b = P(1.35 * sgnB, y, z);
        Sim.arrow(ctx, a[0], a[1], b[0], b[1], { color: 'rgba(0,123,255,0.45)', width: 1.6, head: 9 });
        if (i === 1) { const m = P(-0.9 * sgnB, y, z); Sim.text(ctx, 'B', m[0], m[1] - 12, { size: 15, bold: true, color: C.blue, align: 'center' }); }
      });
      // reference axis for θ and the angle arc
      const o = P(0, 0, 0);
      const ref = P(0.95, 0, 0);
      Sim.line(ctx, o[0], o[1], ref[0], ref[1], { color: C.grey, width: 1.2, dash: [4, 4] });
      if (p.th > 2) {
        const arcPts = [];
        for (let k = 0; k <= 30; k++) { const ph = (th * k) / 30; arcPts.push(P(0.55 * Math.cos(ph), 0.55 * Math.sin(ph), 0)); }
        Sim.polyline(ctx, arcPts, { color: C.ink, width: 1.5 });
        const lab = P(0.75 * Math.cos(th / 2), 0.75 * Math.sin(th / 2), 0);
        Sim.text(ctx, 'θ', lab[0], lab[1], { size: 15, bold: true, color: C.ink, align: 'center' });
      }
      // the l sin θ component (perpendicular to B)
      if (Math.abs(Math.sin(th)) > 0.05 && Math.abs(Math.cos(th)) > 0.2) {
        const a = P(0, -1.25 * Math.sin(th), 0), b = P(0, 1.25 * Math.sin(th), 0);
        Sim.line(ctx, a[0], a[1], b[0], b[1], { color: 'rgba(112,72,232,0.55)', width: 2, dash: [3, 4] });
        Sim.text(ctx, 'l sin θ', b[0] + 6, b[1] - 6, { size: 12, color: C.purple, bold: true });
      }
      // wire
      const e1 = P(-1.25 * d[0], -1.25 * d[1], 0), e2 = P(1.25 * d[0], 1.25 * d[1], 0);
      Sim.line(ctx, e1[0], e1[1], e2[0], e2[1], { color: '#7a4a1c', width: 9 });
      Sim.line(ctx, e1[0], e1[1], e2[0], e2[1], { color: '#d08b45', width: 5 });
      if (Math.abs(p.I) > 0.01) {
        const sg = p.I > 0 ? 1 : -1;
        const a = P(0.35 * sg * d[0], 0.35 * sg * d[1], 0), b = P(1.05 * sg * d[0], 1.05 * sg * d[1], 0);
        Sim.arrow(ctx, a[0], a[1], b[0], b[1], { color: C.red, width: 3, head: 12 });
        Sim.text(ctx, 'I', b[0] + 12, b[1] + 10, { size: 15, bold: true, color: C.red, align: 'center' });
      }
      // force arrow
      const Fmax = 5 * 0.5 * 0.2;
      if (Math.abs(Fz) > 1e-5) {
        const len = (0.35 + 1.35 * Math.sqrt(Sim.clamp(Math.abs(Fz) / Fmax, 0, 1))) * Math.sign(Fz);
        const t = P(0, 0, len);
        Sim.arrow(ctx, o[0], o[1], t[0], t[1], { color: C.green, width: 4.5, head: 14 });
        Sim.text(ctx, 'F = ' + Sim.fmt(Math.abs(Fz), 2) + ' N', t[0] + 12, t[1] + (Fz > 0 ? 4 : -4), { size: 13.5, bold: true, color: C.green, bg: 'rgba(255,255,255,0.85)' });
      } else {
        Sim.text(ctx, 'F = 0', o[0] + 12, o[1] - 22, { size: 13.5, bold: true, color: C.green, bg: 'rgba(255,255,255,0.85)' });
      }
      Sim.circle(ctx, o[0], o[1], 3.5, { fill: C.ink });

      // left-hand key: a small triad with the same directions, plus a legend
      const kb = wide ? { x: w - 300, y: h / 2 - 118, w: 282, h: 236 } : { x: 12, y: h - 172, w: w - 24, h: 162 };
      Sim.rect(ctx, kb.x, kb.y, kb.w, kb.h, { fill: 'rgba(237,242,255,0.85)', r: 10 });
      Sim.text(ctx, 'Your left hand', kb.x + kb.w / 2, kb.y + 16, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      const Sk = wide ? 48 : 38;
      const Ok = wide ? [kb.x + kb.w / 2, kb.y + 100] : [kb.x + 72, kb.y + 86];
      const Pk = (x, y, z) => [Ok[0] + Sk * (x + 0.5 * y), Ok[1] - Sk * (z + 0.35 * y)];
      const tip = (pt, dx, dy, str, col) => Sim.text(ctx, str, pt[0] + dx, pt[1] + dy, { size: 13, bold: true, color: col, align: 'center' });
      const kf = Pk(sgnB, 0, 0);
      Sim.arrow(ctx, Ok[0], Ok[1], kf[0], kf[1], { color: C.blue, width: 3.5, head: 11 });
      tip(kf, sgnB * 12, 0, 'B', C.blue);
      const sgI = Math.sign(p.I) * (Math.sin(th) > 1e-6 ? 1 : 0);
      if (sgI !== 0) {
        const kc = Pk(0, 1.3 * sgI, 0);
        Sim.arrow(ctx, Ok[0], Ok[1], kc[0], kc[1], { color: C.red, width: 3.5, head: 11 });
        tip(kc, sgI * 9, -sgI * 8, 'I', C.red);
      }
      if (Math.abs(Fz) > 1e-5) {
        const km = Pk(0, 0, Math.sign(Fz));
        Sim.arrow(ctx, Ok[0], Ok[1], km[0], km[1], { color: C.green, width: 3.5, head: 11 });
        tip(km, 0, Fz > 0 ? -10 : 11, 'F', C.green);
      }
      Sim.circle(ctx, Ok[0], Ok[1], 3, { fill: C.ink });
      const lx = wide ? kb.x + 26 : kb.x + 150, ly = wide ? kb.y + 184 : kb.y + 48, lg = wide ? 20 : 22;
      const leg = [['First finger = Field (B)', C.blue], ['seCond finger = Current (I)', C.red], [Math.abs(Fz) > 1e-5 ? 'thuMb = Motion (force F)' : 'no force: I is along B', C.green]];
      leg.forEach((L, i) => {
        Sim.rect(ctx, lx, ly + i * lg - 5, 10, 10, { fill: L[1], r: 2 });
        Sim.text(ctx, L[0], lx + 16, ly + i * lg, { size: wide ? 12.5 : 11.5, bold: true, color: L[1] });
      });
    },
    readout(s) {
      const p = s.p;
      const th = p.th * DEG;
      const sgnB = p.flip ? -1 : 1;
      const Fz = -p.I * sgnB * p.L * p.B * Math.sin(th);
      return [
        ['sin θ =', Math.sin(th).toFixed(3)],
        ['F = BIl sin θ =', Sim.fmt(Math.abs(Fz), 3) + ' N', true],
        ['direction:', Math.abs(Fz) < 1e-6 ? 'no force' : Fz > 0 ? 'upwards' : 'downwards']
      ];
    }
  });

  /* ======================================================================
     2. A charged particle in a uniform magnetic field
     ====================================================================== */
  const PARTS = {
    p: { name: 'proton', q: 1, m: MP, light: false },
    a: { name: 'alpha particle', q: 2, m: 6.64e-27, light: false },
    e: { name: 'electron', q: -1, m: ME, light: true },
    ep: { name: 'positron', q: 1, m: ME, light: true }
  };
  const HEAVY_VIEW = 0.2, MAG = 2000;
  const fieldX = (w) => Math.max(50, (w >= 700 ? 0.3 : 0.16) * w);
  function partView(s) {
    const pt = PARTS[s.p.part];
    const half = pt.light ? HEAVY_VIEW / MAG : HEAVY_VIEW;
    return { pt, scale: (s.h / 2 - 12) / half };
  }
  function radius(pt, s) {
    return (pt.m * s.p.v * 1e6) / (Math.abs(pt.q) * QE * s.p.B);
  }
  function fire(s) {
    const st = s.state;
    const { pt, scale } = partView(s);
    st.trails = st.trails.concat(st.parts.map((q) => q.trail)).slice(-6);
    const R = radius(pt, s) * scale;
    const mk = (sgn) => ({ x: 6, y: s.h / 2, a: 0, sgn, R, trail: [[6, s.h / 2]], alive: true });
    st.parts = [mk(Math.sign(pt.q))];
    if (s.p.both) st.parts.push(mk(-Math.sign(pt.q)));
    if (!s.running) s.play();
  }
  Sim.create('#sim-particle', {
    title: 'Charged particle in a uniform magnetic field',
    height: (w) => (w >= 700 ? 400 : 380),
    controls: [
      { key: 'part', type: 'select', label: 'Particle', value: 'p', options: [['p', 'proton'], ['a', 'alpha particle'], ['e', 'electron'], ['ep', 'positron']], onChange: (s) => { s.state.trails = []; s.state.parts = []; fire(s); } },
      { key: 'dir', type: 'select', label: 'Field direction', value: 'in', options: [['in', 'into the page ⊗'], ['out', 'out of the page ⊙']], onChange: (s) => fire(s) },
      { key: 'v', label: 'Speed v', min: 0.5, max: 10, step: 0.1, value: 2, unit: '× 10⁶ m s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'B', label: 'Flux density B', min: 0.05, max: 1, step: 0.01, value: 0.2, unit: 'T', format: (v) => v.toFixed(2) },
      { key: 'both', type: 'check', label: 'Also fire the opposite charge', value: false, onChange: (s) => fire(s) },
      { type: 'button', label: 'Fire', onClick: (s) => fire(s) },
      { type: 'button', label: 'Clear trails', ghost: true, onClick: (s) => { s.state.trails = []; } }
    ],
    animate: true,
    resetButton: false,
    init(s) { s.state = { parts: [], trails: [] }; fire(s); },
    update(s, dt) {
      const st = s.state;
      const xf = fieldX(s.w);
      const u = 55 + 24 * s.p.v;
      const sgnIn = s.p.dir === 'in' ? 1 : -1;
      let any = false;
      st.parts.forEach((q) => {
        if (!q.alive) return;
        any = true;
        const n = 10, hdt = dt / n;
        for (let i = 0; i < n; i++) {
          if (q.x >= xf && q.R > 0) q.a += -q.sgn * sgnIn * (u * hdt) / q.R;
          q.x += u * Math.cos(q.a) * hdt;
          q.y += u * Math.sin(q.a) * hdt;
        }
        const last = q.trail[q.trail.length - 1];
        if (Math.hypot(q.x - last[0], q.y - last[1]) > 2.5) q.trail.push([q.x, q.y]);
        if (q.x < -20 || q.x > s.w + 20 || q.y < -20 || q.y > s.h + 20) q.alive = false;
        if (q.trail.length > 4000) q.alive = false;
      });
      if (!any) s.pause();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const xf = fieldX(w);
      const { pt, scale } = partView(s);
      // field region
      Sim.rect(ctx, xf, 0, w - xf, h, { fill: '#f3f7ff' });
      Sim.line(ctx, xf, 0, xf, h, { color: C.grey, width: 1.5, dash: [6, 5] });
      const sp = 34;
      for (let x = xf + sp / 2; x < w; x += sp) {
        for (let y = sp / 2; y < h; y += sp) {
          if (p.dir === 'in') {
            Sim.line(ctx, x - 4, y - 4, x + 4, y + 4, { color: '#a5b4d0', width: 1.5 });
            Sim.line(ctx, x + 4, y - 4, x - 4, y + 4, { color: '#a5b4d0', width: 1.5 });
          } else {
            Sim.circle(ctx, x, y, 4.5, { stroke: '#a5b4d0', width: 1.5 });
            Sim.circle(ctx, x, y, 1.6, { fill: '#a5b4d0' });
          }
        }
      }
      Sim.text(ctx, 'B ' + (p.dir === 'in' ? 'into page' : 'out of page'), w - 10, 14, { size: 12, color: C.navy, bold: true, align: 'right', bg: 'rgba(255,255,255,0.85)' });
      // scale bar
      const barM = pt.light ? 3e-5 : 0.1;
      const barPx = barM * scale;
      Sim.line(ctx, 14, h - 16, 14 + barPx, h - 16, { color: C.ink, width: 3, cap: 'butt' });
      Sim.text(ctx, pt.light ? '30 μm (view magnified ×' + MAG + ')' : '10 cm', 14, h - 30, { size: 11.5, color: C.ink, bold: true, bg: 'rgba(255,255,255,0.85)' });
      // old trails
      st.trails.forEach((tr) => Sim.polyline(ctx, tr, { color: C.grey, width: 1.5, alpha: 0.45 }));
      // current particles
      const sgnIn = p.dir === 'in' ? 1 : -1;
      st.parts.forEach((q, idx) => {
        const col = q.sgn > 0 ? C.red : C.blue;
        Sim.polyline(ctx, q.trail.concat([[q.x, q.y]]), { color: col, width: 2.5 });
        if (!q.alive) return;
        const inField = q.x >= xf;
        const hx = Math.cos(q.a), hy = Math.sin(q.a);
        const turn = -q.sgn * sgnIn; // sign of da/dt
        const nx = turn < 0 ? Math.sin(q.a) : -Math.sin(q.a);
        const ny = turn < 0 ? -Math.cos(q.a) : Math.cos(q.a);
        if (inField && idx === 0 && q.R < 4 * h) {
          const ccx = q.x + nx * q.R, ccy = q.y + ny * q.R;
          Sim.circle(ctx, ccx, ccy, q.R, { stroke: 'rgba(0,43,128,0.25)', width: 1.2, dash: [4, 5] });
          Sim.line(ctx, ccx, ccy, q.x, q.y, { color: 'rgba(0,43,128,0.45)', width: 1.2 });
          Sim.circle(ctx, ccx, ccy, 2.5, { fill: C.navy });
          if (q.R > 60) { const lx = ccx + 0.3 * (q.x - ccx) - 10 * (q.y - ccy) / q.R, ly = ccy + 0.3 * (q.y - ccy) + 10 * (q.x - ccx) / q.R; Sim.text(ctx, 'r', lx, ly, { size: 13, bold: true, color: C.navy, align: 'center' }); }
        }
        Sim.arrow(ctx, q.x, q.y, q.x + hx * 42, q.y + hy * 42, { color: C.ink, width: 2.2, head: 9, label: 'v', labelOffset: 10, size: 13 });
        if (inField) Sim.arrow(ctx, q.x, q.y, q.x + nx * 32, q.y + ny * 32, { color: C.green, width: 2.8, head: 10, label: 'F', labelOffset: 10, size: 13 });
        Sim.circle(ctx, q.x, q.y, 7.5, { fill: col, stroke: '#fff', width: 1.5 });
        Sim.text(ctx, q.sgn > 0 ? '+' : '−', q.x, q.y + 0.5, { size: 12, bold: true, color: '#fff', align: 'center' });
      });
    },
    readout(s) {
      const pt = PARTS[s.p.part];
      const v = s.p.v * 1e6, B = s.p.B;
      const F = B * Math.abs(pt.q) * QE * v;
      const r = radius(pt, s);
      const T = (2 * Math.PI * pt.m) / (B * Math.abs(pt.q) * QE);
      return [
        ['particle:', pt.name + ' (charge ' + (pt.q > 0 ? '+' : '−') + (Math.abs(pt.q) === 1 ? '' : Math.abs(pt.q)) + 'e)'],
        ['F = Bqv =', Sim.fmt(F, 3) + ' N'],
        ['radius r = mv/BQ =', Sim.fmt(r, 3) + ' m', true],
        ['time per orbit =', Sim.fmt(T, 3) + ' s'],
        ['speed:', 'constant (F ⊥ v)']
      ];
    }
  });

  /* ======================================================================
     3. Magnet and coil: Faraday and Lenz
     ====================================================================== */
  const COIL = { half: 0.05, r: 0.03 }, MAGNET = { half: 0.04, w: 0.018 };
  const ZMAX = 0.16, PHI0 = 1e-4, SPREAD = 0.05, DROP_Z = 0.1, FS = 1.0;
  const prof = (d) => Math.pow(1 + (d / SPREAD) * (d / SPREAD), -1.5);
  const dprof = (d) => (-3 * d) / (SPREAD * SPREAD) * Math.pow(1 + (d / SPREAD) * (d / SPREAD), -2.5);
  function coilFlux(s, z) { return (s.p.flip ? -1 : 1) * s.p.N * PHI0 * s.p.str * prof(z); }
  function coilEmf(s, z, v) { return -(s.p.flip ? -1 : 1) * s.p.N * PHI0 * s.p.str * dprof(z) * v; }
  function coilStart(s) {
    const st = s.state;
    st.t = 0; st.rec = []; st.v = 0; st.vs = 0;
    st.z = s.p.mode === 'drag' ? ZMAX * 0.85 : DROP_Z;
    st.running = false; st.done = false;
    st.zPrev = st.z;
  }
  function coilRelease(s) {
    if (s.p.mode === 'drag') s.set('mode', 'drop');
    coilStart(s);
    s.state.running = true;
    if (!s.running) s.play();
  }
  function coilGeom(s) {
    const wide = s.w >= 700;
    const sceneH = wide ? s.h : 360;
    const k = (sceneH - 40) / (2 * (ZMAX + MAGNET.half));
    const cx = wide ? 120 : Math.min(130, s.w * 0.33), cy = sceneH / 2;
    return { wide, sceneH, k, cx, cy, Y: (z) => cy - z * k };
  }
  Sim.create('#sim-coil', {
    title: 'Magnet and coil: induced e.m.f.',
    height: (w) => (w >= 700 ? 440 : 360 + 2 * 175),
    controls: [
      { key: 'mode', type: 'select', label: 'Mode', value: 'drop', options: [['drag', 'Drag the magnet yourself'], ['drop', 'Drop it through the coil'], ['push', 'Push it through at constant speed']], onChange: (s) => { coilStart(s); if (s.p.mode !== 'drag') { s.state.running = true; } } },
      { key: 'N', label: 'Turns on the coil N', min: 50, max: 500, step: 10, value: 200, format: (v) => v.toFixed(0) },
      { key: 'str', label: 'Magnet strength', min: 0.5, max: 2, step: 0.1, value: 1, unit: '×', format: (v) => v.toFixed(1) },
      { key: 'vp', label: 'Push speed (push mode)', min: 0.2, max: 2, step: 0.1, value: 0.6, unit: 'm s⁻¹', format: (v) => v.toFixed(1) },
      { key: 'flip', type: 'check', label: 'South pole first', value: false },
      { type: 'button', label: 'Release the magnet', onClick: (s) => coilRelease(s) }
    ],
    animate: true,
    init(s) {
      s.state = { drag: false, grabOff: 0 };
      coilStart(s);
      if (s.p.mode !== 'drag') s.state.running = true;
    },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      if (p.mode === 'drag') {
        st.t += dt;
        const vraw = (st.z - st.zPrev) / dt;
        st.zPrev = st.z;
        st.vs += (vraw - st.vs) * Math.min(1, dt / 0.06);
        st.v = st.vs;
        st.rec.push([st.t, coilFlux(s, st.z), coilEmf(s, st.z, st.v)]);
        while (st.rec.length && st.rec[0][0] < st.t - 4.2) st.rec.shift();
        return;
      }
      if (!st.running || st.done) return;
      const slow = p.mode === 'drop' ? 0.12 : Sim.clamp((2 * ZMAX) / p.vp / 2.6, 0.05, 1);
      const sdt = dt * slow;
      const n = 6;
      for (let i = 0; i < n; i++) {
        const hh = sdt / n;
        if (p.mode === 'drop') { st.v -= 9.81 * hh; } else { st.v = -p.vp; }
        st.z += st.v * hh;
        st.t += hh;
      }
      st.rec.push([st.t, coilFlux(s, st.z), coilEmf(s, st.z, st.v)]);
      if (st.z < -ZMAX) { st.z = -ZMAX; st.done = true; }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const G = coilGeom(s);
      const { k, cx, Y } = G;
      const rx = COIL.r * k, ry = rx * 0.3;
      const top = Y(COIL.half), bot = Y(-COIL.half);
      const turns = 10;
      const ty = (i) => top + ((bot - top) * i) / (turns - 1);
      // back halves of the turns
      for (let i = 0; i < turns; i++) {
        ctx.save(); ctx.strokeStyle = '#b07a3e'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.ellipse(cx, ty(i), rx, ry, 0, Math.PI, 2 * Math.PI); ctx.stroke(); ctx.restore();
      }
      // magnet
      const mz = st.z;
      const mt = Y(mz + MAGNET.half), mb = Y(mz - MAGNET.half), mw = MAGNET.w * k;
      const topPole = p.flip ? 'N' : 'S';
      const botPole = p.flip ? 'S' : 'N';
      const colOf = (pole) => (pole === 'N' ? C.red : '#1971c2');
      Sim.rect(ctx, cx - mw, mt, 2 * mw, (mb - mt) / 2, { fill: colOf(topPole) });
      Sim.rect(ctx, cx - mw, (mt + mb) / 2, 2 * mw, (mb - mt) / 2, { fill: colOf(botPole) });
      Sim.rect(ctx, cx - mw, mt, 2 * mw, mb - mt, { stroke: '#212529', width: 1.5 });
      Sim.text(ctx, topPole, cx, mt + (mb - mt) / 4, { size: 14, bold: true, color: '#fff', align: 'center' });
      Sim.text(ctx, botPole, cx, mt + (3 * (mb - mt)) / 4, { size: 14, bold: true, color: '#fff', align: 'center' });
      // front halves
      for (let i = 0; i < turns; i++) {
        ctx.save(); ctx.strokeStyle = '#d08b45'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(cx, ty(i), rx, ry, 0, 0, Math.PI); ctx.stroke(); ctx.restore();
      }
      // leads to galvanometer
      const gx = cx + rx + (G.wide ? 120 : Math.min(110, w - cx - rx - 50)), gy = G.cy + 10;
      Sim.polyline(ctx, [[cx + rx, top], [gx, top], [gx, gy - 34]], { color: C.ink, width: 2 });
      Sim.polyline(ctx, [[cx + rx, bot], [gx - 40, bot], [gx - 40, gy + 60], [gx, gy + 60], [gx, gy + 34]], { color: C.ink, width: 2 });
      const emf = st.rec.length ? st.rec[st.rec.length - 1][2] : 0;
      galvo(ctx, gx, gy, 32, emf / FS, 'G');
      Sim.text(ctx, 'centre-', gx + 38, gy - 8, { size: 11, color: C.muted });
      Sim.text(ctx, 'zero meter', gx + 38, gy + 6, { size: 11, color: C.muted });
      // Lenz: induced poles, current arrows, opposing force
      if (Math.abs(emf) > 0.02 * FS) {
        const topN = emf < 0; // flux (down) increasing → coil top becomes N
        Sim.text(ctx, topN ? 'N' : 'S', cx - rx - 14, top, { size: 15, bold: true, color: topN ? C.red : '#1971c2', align: 'center' });
        Sim.text(ctx, topN ? 'S' : 'N', cx - rx - 14, bot, { size: 15, bold: true, color: topN ? '#1971c2' : C.red, align: 'center' });
        Sim.text(ctx, 'induced', cx - rx - 14, (top + bot) / 2, { size: 11, color: C.muted, align: 'center', rotate: -Math.PI / 2 });
        const dir = topN ? 1 : -1;
        for (const i of [2, 5, 8]) {
          const yy = ty(i) + ry;
          Sim.arrow(ctx, cx - dir * 9, yy, cx + dir * 9, yy, { color: C.red, width: 2.5, head: 8 });
        }
        if (Math.abs(st.v) > 0.02) {
          // force on the magnet opposes its motion (screen +y is down, so up-moving magnet is pushed down)
          const len = Sim.clamp((Math.abs(emf) / FS) * 60, 14, 50);
          const my = (mt + mb) / 2, dy = st.v > 0 ? len : -len;
          Sim.arrow(ctx, cx + mw + 14, my, cx + mw + 14, my + dy, { color: C.green, width: 3, head: 10 });
          Sim.text(ctx, 'force opposes', cx + mw + 20, my + dy + (dy > 0 ? 10 : -24), { size: 11.5, color: C.green, bold: true });
          Sim.text(ctx, 'the motion', cx + mw + 20, my + dy + (dy > 0 ? 24 : -10), { size: 11.5, color: C.green, bold: true });
        }
      }
      if (p.mode === 'drag') Sim.text(ctx, 'drag the magnet ↕', cx, 14, { size: 12, color: C.muted, italic: true, align: 'center' });
      else if (!st.running) Sim.text(ctx, 'press “Release the magnet”', cx, 14, { size: 12, color: C.muted, italic: true, align: 'center' });

      /* graphs */
      let tlo, thi;
      if (p.mode === 'drag') { thi = Math.max(4, st.t); tlo = thi - 4; }
      else if (p.mode === 'drop') { tlo = 0; thi = 0.24; }
      else { tlo = 0; thi = niceMax((DROP_Z + ZMAX) / p.vp); }
      const A = niceMax(p.N * PHI0 * p.str * 1.08);
      let emax = 0.1;
      st.rec.forEach((r) => { emax = Math.max(emax, Math.abs(r[2])); });
      emax = niceMax(emax * 1.1);
      const boxes = G.wide
        ? [{ x: 340 + 56, y: 34, w: w - 340 - 56 - 20, h: (h - 34 - 40) / 2 - 30 }, { x: 340 + 56, y: 34 + (h - 34 - 40) / 2 + 22, w: w - 340 - 56 - 20, h: (h - 34 - 40) / 2 - 22 }]
        : [{ x: 52, y: 360 + 26, w: w - 52 - 16, h: 175 - 60 }, { x: 52, y: 360 + 175 + 26, w: w - 52 - 16, h: 175 - 60 }];
      const gf = Sim.graph(ctx, Object.assign({ xmin: tlo, xmax: thi, ymin: p.flip ? -A : 0, ymax: p.flip ? 0 : A, xlabel: 't / s', ylabel: 'NΦ / Wb', title: 'flux linkage–time' }, boxes[0])).axes();
      const ge = Sim.graph(ctx, Object.assign({ xmin: tlo, xmax: thi, ymin: -emax, ymax: emax, xlabel: 't / s', ylabel: 'ε / V', title: 'e.m.f.–time' }, boxes[1])).axes();
      gf.path(st.rec.map((r) => [r[0], r[1]]), { color: C.navy, width: 2.6 });
      ge.path(st.rec.map((r) => [r[0], r[2]]), { color: C.red, width: 2.6 });
      const last = st.rec[st.rec.length - 1];
      if (last) { gf.dot(last[0], last[1], { color: C.navy }); ge.dot(last[0], last[2], { color: C.red }); }
    },
    readout(s) {
      const st = s.state;
      const last = st.rec[st.rec.length - 1];
      const out = [
        ['magnet speed =', (Math.abs(st.v) < 0.005 ? 0 : Math.abs(st.v)).toFixed(2) + ' m s⁻¹'],
        ['NΦ =', Sim.fmt(coilFlux(s, st.z), 3) + ' Wb'],
        ['ε = −d(NΦ)/dt =', f3(last ? last[2] : 0) + ' V', true]
      ];
      if (s.p.mode !== 'drag' && st.rec.length > 2) {
        let pk1 = 0, pk2 = 0;
        st.rec.forEach((r) => { if (r[2] < pk1) pk1 = r[2]; if (r[2] > pk2) pk2 = r[2]; });
        out.push(['peaks:', pk1.toFixed(2) + ' V and +' + pk2.toFixed(2) + ' V']);
      }
      return out;
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const st = s.state;
        const G = coilGeom(s);
        const my = G.Y(st.z);
        const hw = MAGNET.w * G.k + 14, hl = MAGNET.half * G.k + 14;
        if (Math.abs(pt.x - G.cx) < hw && Math.abs(pt.y - my) < hl) {
          if (s.p.mode !== 'drag') { s.set('mode', 'drag'); const z = st.z; coilStart(s); st.z = z; st.zPrev = z; }
          st.drag = true;
          st.grabOff = pt.y - my;
          s.canvas.style.cursor = 'grabbing';
        }
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const G = coilGeom(s);
        st.z = Sim.clamp((G.cy - (pt.y - st.grabOff)) / G.k, -ZMAX, ZMAX);
      },
      up(s) { s.state.drag = false; s.canvas.style.cursor = 'grab'; }
    }
  });

  /* ======================================================================
     4. Rotating coil: e.m.f. = −gradient of flux linkage
     ====================================================================== */
  Sim.create('#sim-rotcoil', {
    title: 'Rotating coil: flux linkage and e.m.f.',
    height: (w) => (w >= 700 ? 400 : 290 + 2 * 170),
    controls: [
      { key: 'f', label: 'Rotation rate', min: 0.1, max: 2, step: 0.05, value: 0.4, unit: 'rev s⁻¹', format: (v) => v.toFixed(2) },
      { key: 'B', label: 'Flux density B', min: 0.05, max: 0.5, step: 0.01, value: 0.2, unit: 'T', format: (v) => v.toFixed(2) },
      { key: 'N', label: 'Turns N', min: 10, max: 200, step: 5, value: 100, format: (v) => v.toFixed(0) },
      { key: 'A', label: 'Coil area A', min: 20, max: 200, step: 5, value: 100, unit: 'cm²', format: (v) => v.toFixed(0) },
      { key: 'tan', type: 'check', label: 'Show the gradient (tangent)', value: true }
    ],
    animate: true,
    init(s) { s.state = { ph: 0.25 }; },
    update(s, dt) { s.state.ph += 2 * Math.PI * s.p.f * dt; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 700;
      const ph = s.state.ph;
      const th = ((ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const BAN = p.B * p.A * 1e-4 * p.N;
      const om = 2 * Math.PI * p.f;
      // top view
      const box = wide ? { x: 0, y: 0, w: 360, h } : { x: 0, y: 0, w, h: 290 };
      const ccx = box.x + box.w / 2, ccy = box.y + box.h / 2 + 4;
      const Lc = Math.min(box.w * 0.55, box.h * 0.62);
      const half = (Lc / 2) * Math.abs(Math.cos(th));
      const nl = 11, spacing = (box.h - 40) / (nl - 1);
      for (let i = 0; i < nl; i++) {
        const y = box.y + 20 + i * spacing;
        const through = Math.abs(y - ccy) < half;
        Sim.arrow(ctx, box.x + 10, y, box.x + box.w - 10, y, { color: through ? C.orange : 'rgba(0,123,255,0.35)', width: through ? 2.4 : 1.4, head: 8 });
      }
      Sim.text(ctx, 'B', box.x + box.w - 18, box.y + 10, { size: 14, bold: true, color: C.blue, align: 'center' });
      // coil, edge-on
      const cxs = Math.sin(th), cys = Math.cos(th);
      const e1 = [ccx - (Lc / 2) * cxs, ccy - (Lc / 2) * cys], e2 = [ccx + (Lc / 2) * cxs, ccy + (Lc / 2) * cys];
      Sim.line(ctx, e1[0], e1[1], e2[0], e2[1], { color: '#7a4a1c', width: 8 });
      Sim.line(ctx, e1[0], e1[1], e2[0], e2[1], { color: '#d08b45', width: 4 });
      Sim.circle(ctx, ccx, ccy, 4, { fill: C.ink });
      // normal and angle
      const nx = Math.cos(th), ny = -Math.sin(th);
      Sim.arrow(ctx, ccx, ccy, ccx + nx * 56, ccy + ny * 56, { color: C.navy, width: 2.5, head: 10, label: 'normal', labelOffset: 22, size: 12 });
      Sim.line(ctx, ccx, ccy, ccx + 46, ccy, { color: C.grey, width: 1.2, dash: [4, 4] });
      if (th > 0.05) Sim.arc(ctx, ccx, ccy, 26, 0, -th, { color: C.ink, label: 'θ', labelGap: 12, size: 13 });
      // velocity of the coil sides and the part that cuts the field
      const sideV = (e, sg) => {
        const vx = sg * nx, vy = sg * ny;
        Sim.arrow(ctx, e[0], e[1], e[0] + vx * 34, e[1] + vy * 34, { color: 'rgba(112,72,232,0.6)', width: 1.8, head: 8, dash: [4, 3] });
        if (Math.abs(vy) > 0.08) Sim.arrow(ctx, e[0], e[1], e[0], e[1] + vy * 34, { color: C.purple, width: 3, head: 9 });
      };
      sideV(e2, 1); sideV(e1, -1);
      Sim.text(ctx, 'top view: coil spins about the black dot', box.x + box.w / 2, box.y + box.h - 8, { size: 11.5, color: C.muted, align: 'center', italic: true, bg: 'rgba(255,255,255,0.85)' });

      // graphs over two periods
      const T = 1 / p.f;
      const tnow = (((ph / om) % (2 * T)) + 2 * T) % (2 * T);
      const fmax = niceMax(BAN * 1.1), emax = niceMax(BAN * om * 1.1);
      const boxes = wide
        ? [{ x: 360 + 64, y: 34, w: w - 360 - 64 - 20, h: (h - 34 - 40) / 2 - 30 }, { x: 360 + 64, y: 34 + (h - 34 - 40) / 2 + 22, w: w - 360 - 64 - 20, h: (h - 34 - 40) / 2 - 22 }]
        : [{ x: 56, y: 290 + 26, w: w - 56 - 16, h: 170 - 58 }, { x: 56, y: 290 + 170 + 26, w: w - 56 - 16, h: 170 - 58 }];
      const gf = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2 * T, ymin: -fmax, ymax: fmax, xlabel: 't / s', ylabel: 'NΦ / Wb', title: 'flux linkage NΦ = BAN cos θ' }, boxes[0])).axes();
      const ge = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 2 * T, ymin: -emax, ymax: emax, xlabel: 't / s', ylabel: 'ε / V', title: 'e.m.f. = −gradient of the NΦ graph' }, boxes[1])).axes();
      gf.plot((t) => BAN * Math.cos(om * t), { color: C.navy, width: 2.4 });
      ge.plot((t) => BAN * om * Math.sin(om * t), { color: C.red, width: 2.4 });
      const fNow = BAN * Math.cos(th), eNow = BAN * om * Math.sin(th);
      if (p.tan) {
        const grad = -BAN * om * Math.sin(th);
        const span = 0.16 * T;
        gf.plot((t) => fNow + grad * (t - tnow), { from: Math.max(0, tnow - span), to: Math.min(2 * T, tnow + span), color: C.orange, width: 2.2 });
      }
      gf.vline(tnow, { color: 'rgba(134,142,150,0.6)' });
      ge.vline(tnow, { color: 'rgba(134,142,150,0.6)' });
      gf.dot(tnow, fNow, { color: C.navy });
      ge.dot(tnow, eNow, { color: C.red });
    },
    readout(s) {
      const p = s.p;
      const th = ((s.state.ph % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      const BAN = p.B * p.A * 1e-4 * p.N, om = 2 * Math.PI * p.f;
      const grad = -BAN * om * Math.sin(th);
      return [
        ['θ =', (th / DEG).toFixed(0) + '°'],
        ['NΦ =', Sim.fmt(BAN * Math.cos(th), 3) + ' Wb'],
        ['gradient d(NΦ)/dt =', Sim.fmt(grad, 3) + ' Wb s⁻¹'],
        ['ε = −gradient =', Sim.fmt(-grad, 3) + ' V', true],
        ['peak NΦ =', Sim.fmt(BAN, 3) + ' Wb'],
        ['peak ε =', Sim.fmt(BAN * om, 3) + ' V']
      ];
    }
  });

  /* ======================================================================
     5. Mutual induction between two coils
     ====================================================================== */
  const MUT_WIN = 5, BETA = 4e-5;
  function coupling(p) { return Math.pow(1 + (p.sep / 2.5) * (p.sep / 2.5), -1.5) * (p.iron ? 12 : 1); }
  function toggleSwitch(s, b) {
    const st = s.state;
    st.closed = !st.closed;
    if (b) b.textContent = st.closed ? 'Open the switch' : 'Close the switch';
    if (!s.running) s.play();
  }
  function drawCoilH(ctx, x0, x1, y, r, turns, color) {
    // a horizontal coil drawn as loops seen side-on
    for (let i = 0; i < turns; i++) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / turns;
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.28, r, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); ctx.restore();
    }
    for (let i = 0; i < turns; i++) {
      const x = x0 + ((x1 - x0) * (i + 0.5)) / turns;
      ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.28, r, 0, Math.PI / 2, (3 * Math.PI) / 2); ctx.stroke(); ctx.restore();
    }
  }
  Sim.create('#sim-mutual', {
    title: 'Mutual induction: switching a primary coil',
    height: (w) => (w >= 700 ? 460 : 232 + 2 * 170),
    controls: [
      { key: 'Imax', label: 'Steady primary current (rheostat)', min: 0.5, max: 3, step: 0.1, value: 2, unit: 'A', format: (v) => v.toFixed(1) },
      { key: 'tau', label: 'How slowly the current changes', min: 0.03, max: 0.5, step: 0.01, value: 0.12, unit: 's', format: (v) => v.toFixed(2) },
      { key: 'Ns', label: 'Turns on the secondary', min: 50, max: 500, step: 10, value: 200, format: (v) => v.toFixed(0) },
      { key: 'sep', label: 'Gap between the coils', min: 0, max: 8, step: 0.5, value: 2, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'iron', type: 'check', label: 'Soft iron core through both coils', value: false },
      { key: 'sw', type: 'button', label: 'Close the switch', onClick: (s, b) => { s.state.auto = 0; toggleSwitch(s, b); } }
    ],
    animate: true,
    resetButton: false,
    init(s) { s.state = { t: 0, I: 0, closed: false, rec: [[0, 0, 0]], dIdt: 0, auto: 1 }; },
    update(s, dt) {
      const st = s.state, p = s.p;
      if (dt <= 0) return;
      if (st.auto === 1 && st.t > 0.8) { st.auto = 2; toggleSwitch(s, s.controls.sw && s.controls.sw.el); }
      else if (st.auto === 2 && st.t > 3.2) { st.auto = 0; toggleSwitch(s, s.controls.sw && s.controls.sw.el); }
      const target = st.closed ? p.Imax : 0;
      const I0 = st.I;
      st.I = target + (st.I - target) * Math.exp(-dt / p.tau);
      st.dIdt = (st.I - I0) / dt;
      st.t += dt;
      const emf = -p.Ns * BETA * coupling(p) * st.dIdt;
      st.rec.push([st.t, st.I, emf]);
      while (st.rec.length && st.rec[0][0] < st.t - MUT_WIN - 0.2) st.rec.shift();
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 700;
      const sceneW = wide ? Math.min(w, 620) : w;
      const ax = wide ? (w - sceneW) / 2 : 0;
      const yA = 92, r = 34;
      const coilL = Math.min(130, sceneW * 0.3);
      const gapPx = (p.sep / 8) * Math.min(130, sceneW * 0.22) + 14;
      const totalW = 2 * coilL + gapPx;
      const x0 = ax + (sceneW - totalW) / 2;
      const p0 = x0, p1 = x0 + coilL, s0 = p1 + gapPx, s1 = s0 + coilL;
      const kap = coupling(p);
      const emf = st.rec.length ? st.rec[st.rec.length - 1][2] : 0;
      // iron core
      if (p.iron) Sim.rect(ctx, p0 - 16, yA - 12, s1 - p0 + 32, 24, { fill: '#adb5bd', stroke: '#868e96', width: 1.5, r: 3 });
      // flux arrows along the axis
      const frac = p.Imax > 0 ? Sim.clamp(st.I / 3, 0, 1) : 0;
      if (frac > 0.02) {
        const lines = [-18, -6, 6, 18];
        lines.forEach((dy) => {
          Sim.arrow(ctx, p0 - 10, yA + dy, p1 + 10, yA + dy, { color: 'rgba(0,123,255,' + (0.25 + 0.6 * frac) + ')', width: 2, head: 8 });
          const reach = Sim.clamp((kap / 2.2) * frac, 0, 1);
          if (reach > 0.03) Sim.arrow(ctx, s0 - 6, yA + dy, s1 + 10, yA + dy, { color: 'rgba(0,123,255,' + (0.15 + 0.7 * reach) + ')', width: 2, head: 8 });
        });
      }
      drawCoilH(ctx, p0, p1, yA, r, 8, '#d08b45');
      drawCoilH(ctx, s0, s1, yA, r, 10, '#a0522d');
      Sim.text(ctx, 'primary', (p0 + p1) / 2, yA - r - 14, { size: 13, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'secondary', (s0 + s1) / 2, yA - r - 14, { size: 13, bold: true, color: C.navy, align: 'center' });
      // induced field in the secondary (Lenz)
      if (Math.abs(emf) > 0.01) {
        const dir = st.dIdt > 0 ? -1 : 1;
        const mx = (s0 + s1) / 2;
        Sim.arrow(ctx, mx - dir * 34, yA + r + 14, mx + dir * 34, yA + r + 14, { color: C.purple, width: 3, head: 10 });
        Sim.text(ctx, dir < 0 ? 'Lenz: the secondary’s field opposes the increase' : 'Lenz: the secondary’s field opposes the decrease', ax + sceneW / 2, 16, { size: 12, color: C.purple, bold: true, align: 'center', bg: 'rgba(255,255,255,0.85)' });
      }
      // primary circuit: battery, switch, rheostat
      const cyb = yA + r + 60;
      const X = (f) => p0 + f * coilL;
      Sim.polyline(ctx, [[X(0.03), yA + r - 4], [X(0.03), cyb], [X(0.2), cyb]], { color: C.ink, width: 2 });
      Sim.line(ctx, X(0.2), cyb - 12, X(0.2), cyb + 12, { color: C.ink, width: 2.5 });
      Sim.line(ctx, X(0.2) + 8, cyb - 6, X(0.2) + 8, cyb + 6, { color: C.ink, width: 5 });
      Sim.line(ctx, X(0.2) + 8, cyb, X(0.4), cyb, { color: C.ink, width: 2 });
      // switch
      Sim.circle(ctx, X(0.4), cyb, 3.5, { fill: C.ink });
      if (st.closed) Sim.line(ctx, X(0.4), cyb, X(0.6), cyb, { color: C.navy, width: 3.5 });
      else Sim.line(ctx, X(0.4), cyb, X(0.58), cyb - 14, { color: C.navy, width: 3.5 });
      Sim.circle(ctx, X(0.6), cyb, 3.5, { fill: '#fff', stroke: C.ink, width: 2 });
      Sim.line(ctx, X(0.6) + 3, cyb, X(0.68), cyb, { color: C.ink, width: 2 });
      Sim.rect(ctx, X(0.68), cyb - 7, X(0.88) - X(0.68), 14, { fill: '#fff', stroke: C.ink, width: 2 });
      Sim.arrow(ctx, X(0.68) + 2, cyb + 12, X(0.88), cyb - 12, { color: C.ink, width: 1.5, head: 6 });
      Sim.polyline(ctx, [[X(0.88), cyb], [X(0.97), cyb], [X(0.97), yA + r - 4]], { color: C.ink, width: 2 });
      Sim.text(ctx, st.closed ? 'switch closed' : 'switch open', X(0.5), cyb + 26, { size: 11.5, color: st.closed ? C.green : C.muted, bold: true, align: 'center' });
      // secondary circuit with meter
      const gx = (s0 + s1) / 2, gy = cyb + 4;
      Sim.polyline(ctx, [[s0 + 4, yA + r - 4], [s0 + 4, gy], [gx - 28, gy]], { color: C.ink, width: 2 });
      Sim.polyline(ctx, [[s1 - 4, yA + r - 4], [s1 - 4, gy], [gx + 28, gy]], { color: C.ink, width: 2 });
      galvo(ctx, gx, gy, 27, emf / 1.0, 'G');

      /* graphs */
      const thi = Math.max(MUT_WIN, st.t), tlo = thi - MUT_WIN;
      let emax = 0.1;
      st.rec.forEach((q) => { emax = Math.max(emax, Math.abs(q[2])); });
      emax = niceMax(emax * 1.1);
      const top = wide ? 262 : 232;
      const boxes = wide
        ? [{ x: 50, y: top, w: (w - 50 - 20 - 60) / 2, h: h - top - 30 }, { x: 50 + (w - 50 - 20 - 60) / 2 + 60, y: top, w: (w - 50 - 20 - 60) / 2, h: h - top - 30 }]
        : [{ x: 50, y: top + 24, w: w - 50 - 16, h: 170 - 58 }, { x: 50, y: top + 170 + 24, w: w - 50 - 16, h: 170 - 58 }];
      const gi = Sim.graph(ctx, Object.assign({ xmin: tlo, xmax: thi, ymin: 0, ymax: 3.3, xlabel: 't / s', ylabel: 'I / A', title: 'primary current' }, boxes[0])).axes();
      const ge = Sim.graph(ctx, Object.assign({ xmin: tlo, xmax: thi, ymin: -emax, ymax: emax, xlabel: 't / s', ylabel: 'ε / V', title: 'e.m.f. in the secondary' }, boxes[1])).axes();
      gi.path(st.rec.map((q) => [q[0], q[1]]), { color: C.navy, width: 2.6 });
      ge.path(st.rec.map((q) => [q[0], q[2]]), { color: C.red, width: 2.6 });
      const last = st.rec[st.rec.length - 1];
      if (last) { gi.dot(last[0], last[1], { color: C.navy }); ge.dot(last[0], last[2], { color: C.red }); }
    },
    readout(s) {
      const st = s.state, p = s.p;
      const last = st.rec[st.rec.length - 1];
      const link = p.Ns * BETA * coupling(p) * st.I;
      return [
        ['primary current =', st.I.toFixed(2) + ' A'],
        ['dI/dt =', Sim.fmt(Math.abs(st.dIdt) < 1e-3 ? 0 : st.dIdt, 3) + ' A s⁻¹'],
        ['secondary NΦ =', Sim.fmt(link, 3) + ' Wb'],
        ['ε =', f3(last ? last[2] : 0) + ' V', true]
      ];
    }
  });
})();
