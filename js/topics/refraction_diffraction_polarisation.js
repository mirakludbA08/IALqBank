/* Refraction, Diffraction & Polarisation — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const DEG = Math.PI / 180;
  const CL = 3.00e8;
  const TAU = Math.PI * 2;

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
    if (Math.abs(d) < 1e-12) return null;
    const m = (n * sxy - sx * sy) / d;
    return { m, c: (sy - m * sx) / n };
  }
  function fitOrigin(pts) {
    let sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sxx += x * x; sxy += x * y; });
    return sxx > 1e-12 ? sxy / sxx : null;
  }
  /* double-headed arrow */
  function dblArrow(ctx, x1, y1, x2, y2, o) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    Sim.arrow(ctx, mx, my, x2, y2, o);
    Sim.arrow(ctx, mx, my, x1, y1, o);
  }

  /* ======================================================================
     1. Snell's law ray box
     ====================================================================== */
  const MEDIA = {
    air: { name: 'Air', n: 1.00, fill: '#ffffff' },
    water: { name: 'Water', n: 1.33, fill: '#e3f0ff' },
    glass: { name: 'Glass', n: 1.50, fill: '#e3f5ef' },
    diamond: { name: 'Diamond', n: 2.42, fill: '#efe9ff' }
  };
  const MEDIA_OPTS = [['air', 'Air (n = 1.00)'], ['water', 'Water (n = 1.33)'], ['glass', 'Glass (n = 1.50)'], ['diamond', 'Diamond (n = 2.42)']];

  /* Fresnel reflectance for unpolarised light (only used for ray brightness) */
  function reflectance(n1, n2, th1) {
    const s1 = Math.sin(th1), c1 = Math.cos(th1);
    const s2 = (n1 * s1) / n2;
    if (s2 >= 1) return 1;
    const c2 = Math.sqrt(1 - s2 * s2);
    const ds = n1 * c1 + n2 * c2, dp = n2 * c1 + n1 * c2;
    if (ds < 1e-9 || dp < 1e-9) return 1;
    const rs = (n1 * c1 - n2 * c2) / ds;
    const rp = (n2 * c1 - n1 * c2) / dp;
    return Sim.clamp((rs * rs + rp * rp) / 2, 0, 1);
  }
  function rayBox(ctx, x, y, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    Sim.rect(ctx, -40, -10, 40, 20, { fill: '#343a40', r: 4 });
    Sim.rect(ctx, -3, -4, 3, 8, { fill: '#ffd43b' });
    ctx.restore();
  }

  Sim.create('#sim-snell', {
    title: "Snell's law ray box",
    height: (w) => (w >= 640 ? 430 : 400),
    controls: [
      { key: 'm1', type: 'select', label: 'Top medium (ray starts here)', value: 'air', options: MEDIA_OPTS },
      { key: 'm2', type: 'select', label: 'Bottom medium', value: 'glass', options: MEDIA_OPTS },
      { key: 'th', label: 'Angle of incidence θ₁', min: 0, max: 89, step: 0.5, value: 35, unit: '°', format: (v) => v.toFixed(1) },
      { key: 'wf', type: 'check', label: 'Show wavefronts', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const m1 = MEDIA[p.m1], m2 = MEDIA[p.m2];
      const n1 = m1.n, n2 = m2.n;
      const th1 = p.th * DEG;
      const s2 = (n1 * Math.sin(th1)) / n2;
      const tir = s2 > 1;
      const th2 = tir ? 0 : Math.asin(s2);
      const R = reflectance(n1, n2, th1);
      const Ox = Math.round(w / 2), Oy = Math.round(h / 2);
      s.state.O = [Ox, Oy];
      const L = Math.min(w / 2 - 22, h / 2 - 32);
      const d1 = [Math.sin(th1), Math.cos(th1)];
      const d2 = [Math.sin(th2), Math.cos(th2)];

      Sim.rect(ctx, 0, 0, w, Oy, { fill: m1.fill });
      Sim.rect(ctx, 0, Oy, w, h - Oy, { fill: m2.fill });

      /* wavefronts across a beam of finite width */
      if (p.wf) {
        const hw = 18, c1 = Math.max(Math.cos(th1), 0.05);
        const foot = hw / c1;
        const lam1 = 26 / n1, lam2 = 26 / n2;
        const drawBand = (poly, dir, lam, mFrom, mTo, col) => {
          ctx.save();
          ctx.beginPath();
          poly.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
          ctx.closePath();
          ctx.fillStyle = 'rgba(224,49,49,0.07)';
          ctx.fill();
          ctx.clip();
          const e = [dir[1], -dir[0]];
          const half = foot + hw + 20;
          for (let m = mFrom; m <= mTo; m++) {
            const cx = Ox + m * lam * dir[0], cy = Oy + m * lam * dir[1];
            Sim.line(ctx, cx - e[0] * half, cy - e[1] * half, cx + e[0] * half, cy + e[1] * half, { color: col, width: 1.6 });
          }
          ctx.restore();
        };
        const A = [Ox - foot, Oy], B = [Ox + foot, Oy];
        drawBand([A, B, [B[0] - L * d1[0], B[1] - L * d1[1]], [A[0] - L * d1[0], A[1] - L * d1[1]]], d1, lam1, -Math.ceil((L + foot) / lam1) - 1, 0, 'rgba(0,43,128,0.55)');
        if (!tir) drawBand([A, B, [B[0] + L * d2[0], B[1] + L * d2[1]], [A[0] + L * d2[0], A[1] + L * d2[1]]], d2, lam2, 0, Math.ceil((L + foot) / lam2) + 1, 'rgba(0,43,128,0.55)');
      }

      Sim.line(ctx, 0, Oy, w, Oy, { color: C.axis, width: 2 });
      Sim.line(ctx, Ox, 10, Ox, h - 10, { color: C.grey, dash: [6, 5], width: 1.3 });
      Sim.text(ctx, 'normal', Ox + 6, 14, { size: 11.5, color: C.muted, italic: true });

      const lab = { size: 13, bold: true, color: C.navy, bg: 'rgba(255,255,255,0.85)' };
      const sub = { size: 12, color: C.muted, bg: 'rgba(255,255,255,0.85)', pad: 3 };
      Sim.text(ctx, m1.name + ', n₁ = ' + n1.toFixed(2), w - 10, 16, Object.assign({ align: 'right' }, lab));
      Sim.text(ctx, 'v₁ = ' + Sim.fmt(CL / n1, 3) + ' m s⁻¹', w - 10, 35, Object.assign({ align: 'right' }, sub));
      Sim.text(ctx, m2.name + ', n₂ = ' + n2.toFixed(2), 10, h - 35, lab);
      Sim.text(ctx, 'v₂ = ' + Sim.fmt(CL / n2, 3) + ' m s⁻¹', 10, h - 16, sub);

      /* critical-angle guide */
      if (n1 > n2) {
        const Cc = Math.asin(n2 / n1);
        const ex = Ox - L * 0.92 * Math.sin(Cc), ey = Oy - L * 0.92 * Math.cos(Cc);
        Sim.line(ctx, Ox, Oy, ex, ey, { color: C.orange, width: 1.5, dash: [4, 4] });
        /* put the label on the side of the C line away from the incident ray */
        const side = th1 > Cc ? 1 : -1;
        const lx = Ox - L * 0.62 * Math.sin(Cc) + side * 30 * Math.cos(Cc);
        const ly = Oy - L * 0.62 * Math.cos(Cc) - side * 30 * Math.sin(Cc);
        Sim.text(ctx, 'C = ' + (Cc / DEG).toFixed(1) + '°', lx, ly, { size: 12.5, bold: true, color: '#b35c00', align: 'center', bg: 'rgba(255,255,255,0.85)' });
      }

      /* rays */
      const S = [Ox - L * d1[0], Oy - L * d1[1]];
      const red = C.red;
      Sim.arrow(ctx, S[0], S[1], (S[0] + Ox) / 2, (S[1] + Oy) / 2, { color: red, width: 3 });
      Sim.line(ctx, (S[0] + Ox) / 2, (S[1] + Oy) / 2, Ox, Oy, { color: red, width: 3 });
      rayBox(ctx, S[0], S[1], Math.atan2(d1[1], d1[0]));

      const Rf = [Ox + L * d1[0], Oy - L * d1[1]];
      const rAlpha = Math.max(0.22, R), rW = 1.3 + 1.9 * R;
      Sim.line(ctx, Ox, Oy, Rf[0], Rf[1], { color: red, width: rW, alpha: rAlpha });
      Sim.arrow(ctx, Ox, Oy, (Ox + Rf[0]) / 2, (Oy + Rf[1]) / 2, { color: red, width: rW, alpha: rAlpha });

      if (!tir) {
        const T = [Ox + L * d2[0], Oy + L * d2[1]];
        const tA = Math.max(0.25, 1 - R), tW = 1.3 + 1.9 * (1 - R);
        Sim.line(ctx, Ox, Oy, T[0], T[1], { color: red, width: tW, alpha: tA });
        Sim.arrow(ctx, Ox, Oy, (Ox + T[0]) / 2, (Oy + T[1]) / 2, { color: red, width: tW, alpha: tA });
        if (th2 > 1.5 * DEG) Sim.arc(ctx, Ox, Oy, 50, Math.PI / 2 - th2, Math.PI / 2, { color: C.blue, width: 2, label: 'θ₂', labelGap: 14, bold: true });
      } else {
        Sim.text(ctx, 'Total internal reflection', Ox + Math.min(w * 0.25, 150), Oy + 40, { size: 14, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.9)' });
        Sim.text(ctx, 'θ₁ > C: no refracted ray', Ox + Math.min(w * 0.25, 150), Oy + 62, { size: 12.5, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.9)' });
      }
      if (th1 > 1.5 * DEG) {
        Sim.arc(ctx, Ox, Oy, 42, -Math.PI / 2 - th1, -Math.PI / 2, { color: C.navy, width: 2, label: 'θ₁', labelGap: 14, bold: true });
        Sim.arc(ctx, Ox, Oy, 30, -Math.PI / 2, -Math.PI / 2 + th1, { color: C.grey, width: 1.5 });
      }
      if (n1 === n2) Sim.text(ctx, 'Same medium: no refraction, no reflection', Ox, Oy + 40, { size: 12.5, color: C.muted, align: 'center', italic: true, bg: 'rgba(255,255,255,0.85)' });
      else if (!p.wf && p.th < 3) Sim.text(ctx, 'Drag on the top half to move the ray', Ox, Oy - L - 20, { size: 12, color: C.muted, align: 'center', italic: true, bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const p = s.p;
      const n1 = MEDIA[p.m1].n, n2 = MEDIA[p.m2].n;
      const th1 = p.th * DEG;
      const s2 = (n1 * Math.sin(th1)) / n2;
      const out = [['n₁ sin θ₁ =', (n1 * Math.sin(th1)).toFixed(3)]];
      if (s2 <= 1) {
        out.push(['θ₂ =', (Math.asin(s2) / DEG).toFixed(1) + '°', true]);
        out.push(['n₂ sin θ₂ =', (n2 * s2).toFixed(3)]);
      } else out.push(['θ₂:', 'none (total internal reflection)', true]);
      if (n1 > n2) out.push(['critical angle C = sin⁻¹(n₂/n₁) =', (Math.asin(n2 / n1) / DEG).toFixed(1) + '°']);
      else out.push(['critical angle:', n1 === n2 ? 'none (same medium)' : 'none (n₂ > n₁)']);
      out.push(['λ₂ / λ₁ = v₂ / v₁ =', (n1 / n2).toFixed(3)]);
      out.push(['share reflected (Fresnel, beyond spec) ≈', Math.round(reflectance(n1, n2, th1) * 100) + '%']);
      return out;
    },
    pointer: {
      cursor: 'grab',
      touchAction: 'pan-y',
      down(s, pt) { this.move(s, pt); },
      move(s, pt) {
        if (!pt.down || !s.state.O) return;
        const [Ox, Oy] = s.state.O;
        if (pt.y >= Oy - 4) return;
        const ang = Math.atan2(Math.abs(pt.x - Ox), Oy - pt.y) / DEG;
        s.set('th', Math.round(Sim.clamp(ang, 0, 89) * 2) / 2);
      }
    }
  });

  /* ======================================================================
     2. Glass block: plot sin i against sin r
     ====================================================================== */
  const BLOCKS = { A: 1.52, B: 1.49, C: 1.62 };
  Sim.create('#sim-glassblock', {
    title: 'Virtual experiment: refractive index of a block',
    height: (w) => (w >= 640 ? 390 : 640),
    controls: [
      {
        key: 'blk', type: 'select', label: 'Block', value: 'A',
        options: [['A', 'Block A (n unknown)'], ['B', 'Block B (n unknown)'], ['C', 'Block C (n unknown)']],
        onChange: (s) => { s.state.data = []; }
      },
      { key: 'i', label: 'Angle of incidence i', min: 5, max: 80, step: 1, value: 30, unit: '°', format: (v) => v.toFixed(0) },
      { type: 'button', label: 'Trace the ray and measure r', onClick: (s) => measureBlock(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; } }
    ],
    init(s) { s.state = { data: [] }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const n = BLOCKS[p.blk];
      const wide = w >= 640;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.46), h } : { x: 0, y: 0, w, h: 300 };
      const ii = p.i * DEG;
      const rr = Math.asin(Math.sin(ii) / n);
      /* paper */
      Sim.rect(ctx, sc.x + 8, sc.y + 8, sc.w - 16, sc.h - 16, { fill: '#fbfbf7', stroke: '#dee2e6', width: 1 });
      ctx.save();
      ctx.beginPath();
      ctx.rect(sc.x + 8, sc.y + 8, sc.w - 16, sc.h - 16);
      ctx.clip();
      const bw = Math.min(sc.w * 0.64, 300);
      const bh = Math.min(sc.h * 0.36, bw * 0.6);
      const bx = sc.x + (sc.w - bw) / 2, by = sc.y + sc.h * 0.36;
      Sim.rect(ctx, bx, by, bw, bh, { fill: 'rgba(120,200,190,0.28)', stroke: '#5c9e96', width: 2 });
      Sim.text(ctx, 'block', bx + bw - 8, by + bh - 12, { size: 12, color: '#3d7a72', align: 'right', italic: true });
      const E = [bx + bw * 0.34, by];
      /* normal at entry */
      Sim.line(ctx, E[0], by - 60, E[0], by + bh * 0.9, { color: C.grey, dash: [5, 4], width: 1.2 });
      /* incident ray */
      const Lin = Math.min((by - sc.y - 50) / Math.max(Math.cos(ii), 0.05), (E[0] - sc.x - 52) / Math.max(Math.sin(ii), 0.05));
      const S = [E[0] - Lin * Math.sin(ii), E[1] - Lin * Math.cos(ii)];
      Sim.line(ctx, S[0], S[1], E[0], E[1], { color: C.red, width: 2.5 });
      Sim.arrow(ctx, S[0], S[1], (S[0] + E[0]) / 2, (S[1] + E[1]) / 2, { color: C.red, width: 2.5 });
      rayBox(ctx, S[0], S[1], Math.atan2(Math.cos(ii), Math.sin(ii)));
      /* ray in the block */
      const X = [E[0] + bh * Math.tan(rr), by + bh];
      Sim.line(ctx, E[0], E[1], X[0], X[1], { color: C.red, width: 2.5 });
      /* undeviated continuation (dashed) */
      const kc = Math.min(bh / Math.max(Math.cos(ii), 0.05), 1e4);
      Sim.line(ctx, E[0], E[1], E[0] + kc * Math.sin(ii), E[1] + kc * Math.cos(ii), { color: C.grey, width: 1.2, dash: [3, 4] });
      /* emerging ray, parallel to the incident ray */
      const Lout = Math.min((sc.y + sc.h - 18 - X[1]) / Math.max(Math.cos(ii), 0.05), (sc.x + sc.w - 14 - X[0]) / Math.max(Math.sin(ii), 0.05));
      const Q = [X[0] + Lout * Math.sin(ii), X[1] + Lout * Math.cos(ii)];
      Sim.line(ctx, X[0], X[1], Q[0], Q[1], { color: C.red, width: 2.5 });
      Sim.arrow(ctx, X[0], X[1], X[0] + Lout * 0.55 * Math.sin(ii), X[1] + Lout * 0.55 * Math.cos(ii), { color: C.red, width: 2.5 });
      /* crosses marking the rays */
      const cross = (x, y) => { Sim.line(ctx, x - 5, y - 5, x + 5, y + 5, { color: C.navy, width: 2 }); Sim.line(ctx, x - 5, y + 5, x + 5, y - 5, { color: C.navy, width: 2 }); };
      cross(S[0] + (E[0] - S[0]) * 0.25, S[1] + (E[1] - S[1]) * 0.25);
      cross(X[0] + (Q[0] - X[0]) * 0.45, X[1] + (Q[1] - X[1]) * 0.45);
      cross(X[0] + (Q[0] - X[0]) * 0.92, X[1] + (Q[1] - X[1]) * 0.92);
      /* angles */
      Sim.arc(ctx, E[0], E[1], 34, -Math.PI / 2 - ii, -Math.PI / 2, { color: C.navy, width: 2, label: 'i', labelGap: 12, bold: true });
      if (rr > 2 * DEG) Sim.arc(ctx, E[0], E[1], 40, Math.PI / 2 - rr, Math.PI / 2, { color: C.blue, width: 2, label: 'r', labelGap: 12, bold: true });
      const last = st.data.length ? st.data[st.data.length - 1] : null;
      if (last && last[0] === p.i) Sim.text(ctx, 'measured r = ' + last[1] + '°', sc.x + 18, sc.y + sc.h - 24, { size: 12.5, bold: true, color: C.blue, bg: 'rgba(255,255,255,0.9)' });
      ctx.restore();

      /* graph */
      const gb = wide ? { x: sc.w + 54, y: 34, w: w - sc.w - 54 - 22, h: h - 34 - 42 } : { x: 54, y: 340, w: w - 54 - 22, h: h - 340 - 42 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 0.7, ymin: 0, ymax: 1.0, xstep: 0.1, ystep: 0.2, xlabel: 'sin r', ylabel: 'sin i', title: 'sin i against sin r' }, gb)).axes();
      const pts = st.data.map(([a, b]) => [Math.sin(b * DEG), Math.sin(a * DEG)]);
      const fit = fitLine(pts);
      if (fit && pts.length >= 2) g.plot((x) => fit.m * x + fit.c, { color: C.orange, width: 2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Set i, then press “Trace the ray”', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const pts = st.data.map(([a, b]) => [Math.sin(b * DEG), Math.sin(a * DEG)]);
      const out = [['readings:', String(st.data.length)]];
      if (st.data.length) {
        const l = st.data[st.data.length - 1];
        out.push(['last: i =', l[0] + '°, r = ' + l[1] + '°']);
      }
      const fit = fitLine(pts);
      if (fit && pts.length >= 3) {
        out.push(['gradient = n =', fit.m.toFixed(3), true]);
        out.push(['intercept =', fit.c.toFixed(3)]);
        if (pts.length >= 6) out.push(['accepted value for this block:', BLOCKS[s.p.blk].toFixed(2)]);
        else out.push(['take 6 readings to', 'see the accepted value']);
      } else if (pts.length) out.push(['take at least 3 readings', 'to fit a line']);
      return out;
    }
  });
  function measureBlock(s) {
    const n = BLOCKS[s.p.blk];
    const r = Math.asin(Math.sin(s.p.i * DEG) / n) / DEG;
    const rMeas = Math.max(1, Math.round(r + gaussian() * 0.6));
    s.state.data.push([s.p.i, rMeas]);
    if (s.state.data.length > 24) s.state.data.shift();
  }

  /* ======================================================================
     3. Huygens' construction: a gap or an obstacle in a ripple tank
     ====================================================================== */
  const LUT = (() => {
    const lo = [236, 244, 255], hi = [8, 45, 120];
    const out = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(lo[c] + (hi[c] - lo[c]) * t);
    }
    return out;
  })();
  function huygensField(st, mode, lamPx, aPx, bx, cols, rows, cell, yc) {
    const n = cols * rows;
    if (!st.re || st.re.length !== n) { st.re = new Float32Array(n); st.im = new Float32Array(n); }
    const re = st.re, im = st.im;
    const k = TAU / lamPx;
    const N = Math.max(3, Math.min(90, Math.ceil(aPx / (lamPx / 3))));
    const dy = aPx / N;
    const ys = [];
    for (let j = 0; j < N; j++) ys.push(yc - aPx / 2 + (j + 0.5) * dy);
    const norm = dy / Math.sqrt(lamPx);
    const c4 = Math.cos(-Math.PI / 4), s4 = Math.sin(-Math.PI / 4);
    const rmin = lamPx * 0.3;
    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) * cell;
      for (let c = 0; c < cols; c++) {
        const xp = (c + 0.5) * cell - bx;
        const idx = r * cols + c;
        if (xp <= 0) { re[idx] = Math.cos(k * xp); im[idx] = Math.sin(k * xp); continue; }
        let sr = 0, si = 0;
        for (let j = 0; j < N; j++) {
          const d = y - ys[j];
          let rr = Math.sqrt(xp * xp + d * d);
          if (rr < rmin) rr = rmin;
          const amp = (0.5 * (1 + xp / rr)) / Math.sqrt(rr);
          const ph = k * rr;
          sr += amp * Math.cos(ph);
          si += amp * Math.sin(ph);
        }
        let ur = norm * (sr * c4 - si * s4);
        let ui = norm * (sr * s4 + si * c4);
        if (mode === 'obstacle') { ur = Math.cos(k * xp) - ur; ui = Math.sin(k * xp) - ui; }
        re[idx] = ur;
        im[idx] = ui;
      }
    }
  }

  Sim.create('#sim-huygens', {
    title: "Huygens' wavelets at a gap or an obstacle",
    height: (w) => (w >= 640 ? 390 : 360),
    controls: [
      { key: 'mode', type: 'select', label: 'What the waves meet', value: 'gap', options: [['gap', 'A gap in a barrier'], ['obstacle', 'An obstacle']] },
      { key: 'lam', label: 'Wavelength λ', min: 1.0, max: 3.0, step: 0.1, value: 1.5, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'a', label: 'Gap (or obstacle) width a', min: 0.5, max: 10, step: 0.1, value: 6, unit: 'cm', format: (v) => v.toFixed(1) },
      { key: 'wl', type: 'check', label: 'Show Huygens wavelets', value: true },
      { key: 'min', type: 'check', label: 'First minimum, a sin θ = λ (beyond the spec)', value: false }
    ],
    animate: true,
    init(s) { s.state = { key: '' }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const ppc = h / 24;
      const lamPx = p.lam * ppc, aPx = p.a * ppc;
      const bx = Math.round(w * 0.27);
      const yc = h / 2;
      const cell = w < 520 ? 3 : 4;
      const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      const key = [p.mode, p.lam, p.a, w, h].join('|');
      if (st.key !== key) {
        huygensField(st, p.mode, lamPx, aPx, bx, cols, rows, cell, yc);
        st.key = key;
        if (!st.off || st.off.width !== cols || st.off.height !== rows) {
          st.off = document.createElement('canvas');
          st.off.width = cols;
          st.off.height = rows;
          st.octx = st.off.getContext('2d');
          st.img = st.octx.createImageData(cols, rows);
        }
      }
      const frac = (s.t * 0.7) % 1;
      const ph = frac * TAU;
      const cp = Math.cos(ph), sp = Math.sin(ph);
      const data = st.img.data, re = st.re, im = st.im;
      for (let i = 0, n = cols * rows; i < n; i++) {
        let v = re[i] * cp + im[i] * sp;
        v = v >= 0 ? Math.pow(Math.min(v, 1.6) / 1.6, 0.6) : -Math.pow(Math.min(-v, 1.6) / 1.6, 0.6);
        const li = Math.round((0.5 + 0.5 * v) * 255) * 3;
        const o = i * 4;
        data[o] = LUT[li]; data[o + 1] = LUT[li + 1]; data[o + 2] = LUT[li + 2]; data[o + 3] = 255;
      }
      st.octx.putImageData(st.img, 0, 0);
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(st.off, 0, 0, cols * cell, rows * cell);
      ctx.restore();

      /* barrier or obstacle */
      const bar = { fill: '#3b4148' };
      if (p.mode === 'gap') {
        Sim.rect(ctx, bx - 4, 0, 8, yc - aPx / 2, bar);
        Sim.rect(ctx, bx - 4, yc + aPx / 2, 8, h - yc - aPx / 2, bar);
      } else Sim.rect(ctx, bx - 4, yc - Math.max(aPx, 3) / 2, 8, Math.max(aPx, 3), bar);

      /* Huygens wavelets */
      if (p.wl) {
        const srcs = [];
        if (p.mode === 'gap') {
          const M = aPx < lamPx * 0.8 ? 1 : 5;
          for (let j = 0; j < M; j++) srcs.push(M === 1 ? yc : yc - aPx / 2 + (aPx * j) / (M - 1));
        } else {
          for (let j = 0; j < 3; j++) { const off = aPx / 2 + lamPx * (0.35 + 0.8 * j); srcs.push(yc - off, yc + off); }
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx + 4, 0, w - bx - 4, h);
        ctx.clip();
        ctx.strokeStyle = 'rgba(240,140,0,0.95)';
        ctx.lineWidth = 1.6;
        for (const yj of srcs) {
          for (let m = 0; m < 2; m++) {
            const r = (m + frac) * lamPx;
            if (r < 2) continue;
            ctx.beginPath();
            ctx.arc(bx, yj, r, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
          }
        }
        ctx.restore();
        srcs.forEach((yj) => Sim.circle(ctx, bx, yj, 3.2, { fill: C.orange, stroke: '#fff', width: 1 }));
      }

      /* first minimum (single-slit condition, off-spec) */
      if (p.min && p.mode === 'gap') {
        if (p.lam < p.a) {
          const th = Math.asin(p.lam / p.a);
          const Lr = (w - bx) * 1.2;
          [-1, 1].forEach((sg) => Sim.line(ctx, bx, yc, bx + Lr * Math.cos(th), yc + sg * Lr * Math.sin(th), { color: C.red, width: 2, dash: [7, 5] }));
          const lx = Math.min(w - 70, bx + (w - bx) * 0.62);
          const ly = yc - (lx - bx) * Math.tan(th);
          if (ly > 18) Sim.text(ctx, 'first minimum: θ = ' + (th / DEG).toFixed(0) + '°', lx, Math.max(ly - 14, 14), { size: 12.5, bold: true, color: C.red, align: 'center', bg: 'rgba(255,255,255,0.9)' });
          else Sim.text(ctx, 'first minimum: θ = ' + (th / DEG).toFixed(0) + '°', w - 10, 16, { size: 12.5, bold: true, color: C.red, align: 'right', bg: 'rgba(255,255,255,0.9)' });
        } else Sim.text(ctx, 'λ ≥ a: no minimum at all', w - 10, 18, { size: 12.5, bold: true, color: C.red, align: 'right', bg: 'rgba(255,255,255,0.9)' });
      }

      /* labels */
      const lx0 = 12;
      dblArrow(ctx, lx0, 24, lx0 + lamPx, 24, { color: C.red, width: 2, head: 7 });
      Sim.text(ctx, 'λ = ' + p.lam.toFixed(1) + ' cm', lx0, 46, { size: 12.5, bold: true, color: C.red, bg: 'rgba(255,255,255,0.9)' });
      if (aPx > 10) {
        dblArrow(ctx, bx - 16, yc - aPx / 2, bx - 16, yc + aPx / 2, { color: '#b35c00', width: 2, head: 7 });
        Sim.text(ctx, 'a', bx - 26, yc, { size: 14, bold: true, color: '#b35c00', align: 'right', bg: 'rgba(255,255,255,0.9)' });
      }
      Sim.text(ctx, 'ripple tank, seen from above', w - 10, h - 14, { size: 11.5, color: C.navy, align: 'right', italic: true, bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const p = s.p;
      const r = p.a / p.lam;
      let verdict;
      if (p.mode === 'gap') {
        verdict = r < 1 ? 'a < λ: circular waves, but little energy gets through' : r <= 2 ? 'a ≈ λ: lots of spreading' : r <= 5 ? 'some spreading at the edges' : 'a ≫ λ: little spreading';
      } else {
        verdict = r <= 1.5 ? 'obstacle ≈ λ: waves close in behind it' : r <= 4 ? 'a partial shadow' : 'obstacle ≫ λ: a shadow behind it';
      }
      const out = [['λ =', p.lam.toFixed(1) + ' cm'], ['a =', p.a.toFixed(1) + ' cm'], ['a / λ =', r.toFixed(2)], [verdict, '', true]];
      if (p.min && p.mode === 'gap') out.push(['first minimum (beyond spec): θ =', p.lam < p.a ? (Math.asin(p.lam / p.a) / DEG).toFixed(1) + '°' : 'none']);
      return out;
    }
  });

  /* ======================================================================
     4. Two (or three) polarising filters
     ====================================================================== */
  Sim.create('#sim-polar', {
    title: 'Polariser and analyser',
    height: (w) => (w >= 640 ? 440 : 410),
    controls: [
      { key: 'p1', label: 'Polariser axis (from vertical)', min: 0, max: 180, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'p2', label: 'Analyser axis (from vertical)', min: 0, max: 360, step: 1, value: 30, unit: '°', format: (v) => v.toFixed(0) },
      { key: 'mid', type: 'check', label: 'Third filter at 45° between them (beyond the spec)', value: false }
    ],
    animate: true,
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const sh = wide ? 260 : 215;
      const y0 = sh / 2 + 4;
      const R = Math.min(72, sh * 0.3, w * 0.12);
      const KB = 0.42, TB = 0.2;
      const proj = (xc, a, b) => [xc + b * KB, y0 - a + b * TB];
      const lampX = 26, detX = w - 30 - R * KB;
      const f1X = w * (wide ? 0.3 : 0.33), f2X = w * (wide ? 0.68 : 0.69);
      const filters = [{ x: f1X, ang: p.p1, name: 'polariser' }];
      if (p.mid) filters.push({ x: (f1X + f2X) / 2, ang: 45, name: '45° filter' });
      filters.push({ x: f2X, ang: p.p2, name: 'analyser' });
      const t = s.t;

      Sim.rect(ctx, 0, 0, w, sh, { fill: '#f6f8fc' });
      Sim.line(ctx, lampX, y0, detX, y0, { color: '#adb5bd', width: 1.2, dash: [4, 5] });
      /* lamp */
      Sim.circle(ctx, lampX, y0, 13, { fill: '#ffd43b', stroke: '#f08c00', width: 2 });
      Sim.text(ctx, 'lamp', lampX - 10, y0 + 30, { size: 12, color: C.muted });

      /* unpolarised light: random directions */
      const A0 = R * 0.62;
      const tick = Math.floor(t * 5);
      for (let x = lampX + 30, i = 0; x < f1X - 14; x += 28, i++) {
        for (let k = 0; k < 2; k++) {
          const seed = Math.sin((i * 12.9898 + (tick + k * 7) * 78.233)) * 43758.5453;
          const psi = (seed - Math.floor(seed)) * Math.PI;
          const a = A0 * Math.cos(psi), b = A0 * Math.sin(psi);
          const P = proj(x, a, b), Q = proj(x, -a, -b);
          dblArrow(ctx, Q[0], Q[1], P[0], P[1], { color: C.orange, width: 2, head: 7, alpha: 0.85 });
        }
      }

      /* polarised wave between and after the filters */
      let amp = A0 * Math.SQRT1_2;
      let I = 0.5;
      const kw = TAU / 46, cw = 70;
      const wave = (xa, xb, ang, A) => {
        if (xb - xa < 4) return;
        const u = [Math.cos(ang * DEG), Math.sin(ang * DEG)];
        const pts = [];
        for (let x = xa; x <= xb; x += 3) {
          const v = A * Math.sin(kw * (x - cw * t));
          pts.push(proj(x, v * u[0], v * u[1]));
          if (Math.round((x - xa) / 3) % 4 === 0) {
            const q = pts[pts.length - 1];
            Sim.line(ctx, x, y0, q[0], q[1], { color: C.red, width: 1, alpha: 0.35 });
          }
        }
        Sim.polyline(ctx, pts, { color: C.red, width: 2.4 });
      };
      for (let j = 0; j < filters.length; j++) {
        const f = filters[j];
        if (j > 0) {
          const c = Math.cos((f.ang - filters[j - 1].ang) * DEG);
          amp *= c;
          I *= c * c;
        }
        f.I = I;
        const xEnd = j + 1 < filters.length ? filters[j + 1].x : detX;
        wave(f.x + 6, xEnd - 6, f.ang, amp);
      }

      /* filters */
      filters.forEach((f) => {
        const ring = [];
        for (let k = 0; k <= 48; k++) { const q = (k / 48) * TAU; ring.push(proj(f.x, R * Math.cos(q), R * Math.sin(q))); }
        Sim.polyline(ctx, ring, { close: true, color: '#495057', width: 2, fill: 'rgba(134,142,150,0.22)' });
        const th = f.ang * DEG;
        const u = [Math.cos(th), Math.sin(th)], pv = [-Math.sin(th), Math.cos(th)];
        for (let o = -0.75; o <= 0.751; o += 0.25) {
          const hc = R * Math.sqrt(Math.max(0, 1 - o * o));
          const A = proj(f.x, o * R * pv[0] - hc * u[0], o * R * pv[1] - hc * u[1]);
          const B = proj(f.x, o * R * pv[0] + hc * u[0], o * R * pv[1] + hc * u[1]);
          Sim.line(ctx, A[0], A[1], B[0], B[1], { color: '#343a40', width: 1, alpha: 0.45 });
        }
        const A = proj(f.x, -R * 0.95 * u[0], -R * 0.95 * u[1]), B = proj(f.x, R * 0.95 * u[0], R * 0.95 * u[1]);
        dblArrow(ctx, A[0], A[1], B[0], B[1], { color: C.navy, width: 2.5, head: 8 });
        Sim.text(ctx, f.name, f.x, y0 + R + 22, { size: 12.5, bold: true, color: C.navy, align: 'center' });
        Sim.text(ctx, f.ang.toFixed(0) + '°', f.x, y0 + R + 39, { size: 12, color: C.muted, align: 'center' });
      });

      /* screen lit by the transmitted light */
      const lit = Sim.clamp(I / 0.5, 0, 1);
      const sq = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => proj(detX, a * R * 0.75, b * R * 0.75));
      const col = 'rgb(' + Math.round(52 + 203 * lit) + ',' + Math.round(58 + 154 * lit) + ',' + Math.round(64 - 5 * lit) + ')';
      Sim.polyline(ctx, sq, { close: true, color: '#343a40', width: 2, fill: col });
      Sim.text(ctx, 'screen', detX, y0 + R + 22, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'I = ' + I.toFixed(2) + ' I₀', detX, y0 + R + 39, { size: 12, color: C.muted, align: 'center' });
      Sim.text(ctx, 'unpolarised', (lampX + f1X) / 2, 16, { size: 12.5, bold: true, color: '#b35c00', align: 'center' });
      Sim.text(ctx, 'plane polarised', (f1X + f2X) / 2, 16, { size: 12.5, bold: true, color: C.red, align: 'center' });

      /* intensity graph */
      const gb = { x: 50, y: sh + 34, w: w - 50 - 20, h: h - sh - 34 - 44 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 360, ymin: 0, ymax: 0.62, xstep: 90, ystep: 0.1, ylabel: 'I / I₀', title: 'Transmitted intensity as the analyser turns' }, gb)).axes();
      const curve = (a2) => {
        if (p.mid) return 0.5 * Math.pow(Math.cos((45 - p.p1) * DEG), 2) * Math.pow(Math.cos((a2 - 45) * DEG), 2);
        return 0.5 * Math.pow(Math.cos((a2 - p.p1) * DEG), 2);
      };
      g.plot(curve, { color: C.orange, width: 2.2 });
      g.dot(p.p2, curve(p.p2), { color: C.red, r: 5.5 });
      Sim.text(ctx, 'analyser angle / °', gb.x + gb.w, gb.y + gb.h + 28, { size: 12.5, bold: true, align: 'right' });
      Sim.text(ctx, "curve: Malus's law, beyond the spec", gb.x + gb.w - 6, g.py(0.575), { size: 11.5, color: '#c2410c', align: 'right', italic: true, bg: 'rgba(255,255,255,0.85)' });
    },
    readout(s) {
      const p = s.p;
      let between = Math.abs(p.p2 - p.p1) % 180;
      if (between > 90) between = 180 - between;
      let I = 0.5;
      if (p.mid) I *= Math.pow(Math.cos((45 - p.p1) * DEG), 2) * Math.pow(Math.cos((p.p2 - 45) * DEG), 2);
      else I *= Math.pow(Math.cos((p.p2 - p.p1) * DEG), 2);
      const out = [
        ['angle between polariser and analyser =', between.toFixed(0) + '°'],
        ['after the polariser: I =', '0.50 I₀'],
        ['reaching the screen: I =', I.toFixed(3) + ' I₀', true]
      ];
      if (!p.mid && between === 90) out.push(['crossed filters:', 'no light gets through']);
      if (!p.mid && between === 0) out.push(['axes parallel:', 'all the polarised light passes']);
      out.push(['I = ½I₀cos²θ', "Malus's law (beyond spec)"]);
      return out;
    }
  });

  /* ======================================================================
     5. Core practical 6: diffraction grating
     ====================================================================== */
  const LASERS = { red: 650, hene: 633, green: 532, violet: 405, mystery: null };
  const lamOf = (s) => (LASERS[s.p.laser] == null ? s.state.mystery : LASERS[s.p.laser]);
  const newMystery = () => 560 + Math.round(Math.random() * 120);
  const MAX_SCREEN = 2.0; // largest spot distance from the centre you could measure, m

  Sim.create('#sim-grating', {
    title: 'Core practical 6: laser and diffraction grating',
    height: (w) => (w >= 720 ? 400 : 660),
    controls: [
      {
        key: 'laser', type: 'select', label: 'Laser', value: 'red',
        options: [['red', 'Red diode, 650 nm'], ['hene', 'Helium–neon, 633 nm'], ['green', 'Green, 532 nm'], ['violet', 'Violet, 405 nm'], ['mystery', 'Mystery laser (λ hidden)']],
        onChange: (s) => { s.state.data = []; if (s.p.laser === 'mystery') s.state.mystery = newMystery(); }
      },
      {
        key: 'N', type: 'select', label: 'Grating', value: '300',
        options: [['80', '80 lines per mm'], ['100', '100 lines per mm'], ['300', '300 lines per mm'], ['600', '600 lines per mm']],
        onChange: (s) => { s.state.data = []; }
      },
      { key: 'D', label: 'Grating to screen distance D', min: 0.3, max: 2.0, step: 0.05, value: 1.0, unit: 'm', format: (v) => v.toFixed(2) },
      { type: 'button', label: 'Measure the spots', onClick: (s) => measureGrating(s) },
      { type: 'button', label: 'Clear results', ghost: true, onClick: (s) => { s.state.data = []; s.state.last = null; } }
    ],
    init(s) { s.state = { data: [], mystery: newMystery(), last: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 720;
      const sc = wide ? { x: 0, y: 0, w: Math.round(w * 0.58), h } : { x: 0, y: 0, w, h: 330 };
      const lam = lamOf(s) * 1e-9;
      const d = 1e-3 / parseFloat(p.N);
      const colr = Sim.spectrum(lamOf(s));
      /* dark lab */
      Sim.rect(ctx, sc.x, sc.y, sc.w, sc.h, { fill: '#121c33' });
      const y0 = sc.y + sc.h / 2;
      const gx = sc.x + Math.max(74, sc.w * 0.15);
      const scale = (sc.w - (gx - sc.x) - 40) / 2.05;
      const sx = gx + p.D * scale;
      const half = sc.h / 2 - 12;
      /* laser and beam */
      Sim.rect(ctx, sc.x + 10, y0 - 9, 44, 18, { fill: '#adb5bd', r: 3 });
      Sim.rect(ctx, sc.x + 54, y0 - 4, 6, 8, { fill: '#868e96' });
      Sim.text(ctx, 'laser', sc.x + 32, y0 + 22, { size: 11.5, color: '#c5d0e6', align: 'center' });
      Sim.line(ctx, sc.x + 60, y0, gx, y0, { color: colr, width: 3 });
      /* screen */
      Sim.line(ctx, sx, sc.y + 8, sx, sc.y + sc.h - 8, { color: '#dee2e6', width: 4 });
      Sim.text(ctx, 'screen', sx - 6, sc.y + 14, { size: 11.5, color: '#c5d0e6', align: 'right' });
      /* orders */
      const spots = [];
      const nmax = Math.floor(d / lam - 1e-9);
      for (let n = -nmax; n <= nmax; n++) {
        const sn = (n * lam) / d;
        if (Math.abs(sn) >= 0.999) continue;
        const th = Math.asin(sn);
        const dyPx = p.D * Math.tan(th) * scale;
        const fade = Math.max(0.35, 1 - 0.1 * Math.abs(n));
        if (Math.abs(dyPx) <= half) {
          Sim.line(ctx, gx, y0, sx, y0 - dyPx, { color: colr, width: 1.4, alpha: 0.5 * fade });
          spots.push({ n, y: y0 - dyPx });
          Sim.circle(ctx, sx, y0 - dyPx, 9, { fill: Sim.spectrum(lamOf(s), 0.25 * fade) });
          Sim.circle(ctx, sx, y0 - dyPx, 4.5, { fill: colr });
        } else {
          const tt = half / Math.abs(dyPx);
          Sim.line(ctx, gx, y0, gx + (sx - gx) * tt, y0 - dyPx * tt, { color: colr, width: 1.4, alpha: 0.35 * fade });
        }
      }
      /* order labels */
      let lastY = -1e9;
      spots.slice().sort((a, b) => a.y - b.y).forEach((q) => {
        if (q.y - lastY < 15) return;
        lastY = q.y;
        Sim.text(ctx, 'n = ' + (q.n < 0 ? '−' + (-q.n) : q.n), sx + 12, q.y, { size: 11.5, color: '#e9ecef' });
      });
      /* grating */
      Sim.rect(ctx, gx - 3, y0 - 34, 6, 68, { fill: '#e9ecef' });
      for (let k = -30; k <= 30; k += 6) Sim.line(ctx, gx - 3, y0 + k, gx + 3, y0 + k, { color: '#495057', width: 1 });
      Sim.text(ctx, 'grating', gx, y0 + 48, { size: 11.5, color: '#c5d0e6', align: 'center' });
      /* measurement annotations for first order */
      const s1 = lam / d;
      if (s1 < 0.999) {
        const th1 = Math.asin(s1);
        const dy1 = p.D * Math.tan(th1) * scale;
        if (dy1 <= half && dy1 > 14) {
          dblArrow(ctx, sx - 14, y0, sx - 14, y0 - dy1, { color: '#ffd43b', width: 1.8, head: 7 });
          Sim.text(ctx, 'x₁', sx - 22, y0 - dy1 / 2, { size: 13, bold: true, color: '#ffd43b', align: 'right' });
        }
        const ra = Math.min(90, (sx - gx) * 0.5);
        if (th1 > 3 * DEG) Sim.arc(ctx, gx, y0, ra, -th1, 0, { color: '#ffd43b', width: 1.8 });
        if (th1 > 3 * DEG && sx - gx >= 130) Sim.text(ctx, 'θ₁', gx + ra + 6, y0 - 9, { size: 13, bold: true, color: '#ffd43b' });
        if (dy1 > half) Sim.text(ctx, 'first-order spots are off this view', (gx + sx) / 2, sc.y + 16, { size: 11.5, color: '#ffd43b', align: 'center', italic: true });
      }
      const yD = sc.y + sc.h - 18;
      dblArrow(ctx, gx, yD, sx, yD, { color: '#c5d0e6', width: 1.5, head: 7 });
      Sim.text(ctx, 'D = ' + p.D.toFixed(2) + ' m', (gx + sx) / 2, yD - 12, { size: 12, bold: true, color: '#e9ecef', align: 'center', bg: 'rgba(18,28,51,0.85)' });

      /* graph */
      const gb = wide ? { x: sc.w + 50, y: 34, w: w - sc.w - 50 - 20, h: h - 34 - 42 } : { x: 50, y: sc.h + 40, w: w - 50 - 20, h: h - sc.h - 40 - 42 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 5.5, ymin: 0, ymax: 1, xstep: 1, ystep: 0.2, xlabel: 'order n', ylabel: 'sin θ', title: 'sin θ against n' }, gb)).axes();
      const pts = st.data.map((q) => [q.n, q.sin]);
      const m = fitOrigin(pts);
      if (m != null && pts.length >= 2) g.plot((x) => m * x, { color: C.orange, width: 2 });
      pts.forEach((q) => g.dot(q[0], q[1], { color: C.navy, r: 4.5 }));
      if (!pts.length) Sim.text(ctx, 'Press “Measure the spots”', gb.x + gb.w / 2, gb.y + gb.h / 2, { size: 13, color: C.muted, align: 'center', italic: true });
    },
    readout(s) {
      const st = s.state;
      const lamNm = lamOf(s);
      const d = 1e-3 / parseFloat(s.p.N);
      const nmax = Math.floor(d / (lamNm * 1e-9) - 1e-9);
      const out = [
        ['d = 1/N =', Sim.fmt(d * 1e6, 3) + ' µm'],
        ['highest order =', String(nmax)],
        ['spots in total =', String(2 * nmax + 1)]
      ];
      if (st.last) out.push(['first-order spots apart:', st.last.sep.toFixed(3) + ' m, so θ₁ = ' + st.last.th.toFixed(1) + '°']);
      const pts = st.data.map((q) => [q.n, q.sin]);
      const m = fitOrigin(pts);
      if (m != null && pts.length >= 1) {
        out.push(['gradient = λ/d =', m.toFixed(4)]);
        out.push(['λ = gradient × d =', Math.round(m * d * 1e9) + ' nm', true]);
        if (LASERS[s.p.laser] == null && pts.length >= 6) out.push(['mystery laser actually:', lamNm + ' nm']);
        else if (LASERS[s.p.laser] != null) out.push(['label on the laser:', lamNm + ' nm']);
      } else if (LASERS[s.p.laser] == null) out.push(['λ =', 'hidden: measure it']);
      return out;
    }
  });
  function measureGrating(s) {
    const lam = lamOf(s) * 1e-9;
    const d = 1e-3 / parseFloat(s.p.N);
    const D = s.p.D;
    const Dm = D + gaussian() * 0.003;
    let first = null;
    for (let n = 1; n <= 5; n++) {
      const sn = (n * lam) / d;
      if (sn >= 0.999) break;
      const x = D * Math.tan(Math.asin(sn));
      if (x > MAX_SCREEN) break;
      const sep = Math.round((2 * x + gaussian() * 0.003) * 1000) / 1000;
      const th = Math.atan(sep / 2 / Dm);
      s.state.data.push({ n, sin: Math.sin(th) });
      if (n === 1) first = { sep, th: th / DEG };
    }
    if (s.state.data.length > 40) s.state.data.splice(0, s.state.data.length - 40);
    s.state.last = first;
  }
})();
