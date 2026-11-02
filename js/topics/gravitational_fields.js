/* Gravitational Fields — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const G = 6.67e-11;
  const ME = 5.97e24;        // Earth mass / kg
  const RE = 6.37e6;         // Earth radius / m
  const MMOON = 7.35e22;     // Moon mass / kg
  const DEM = 3.84e8;        // Earth–Moon distance / m
  const GME = G * ME;
  const SPACE = '#0b1d4d';

  /* ---------- shared helpers ---------- */
  function stars(ctx, w, h, n, seed) {
    let x = seed || 1;
    const rnd = () => (x = (x * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const px = rnd() * w, py = rnd() * h, r = 0.4 + rnd() * 1.1, a = 0.25 + rnd() * 0.55;
      Sim.circle(ctx, px, py, r, { fill: 'rgba(255,255,255,' + a.toFixed(2) + ')' });
    }
  }
  function earth(ctx, x, y, r) {
    if (r <= 0) return;
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#8fd0ff');
    g.addColorStop(1, '#1b4fa8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function moon(ctx, x, y, r) {
    if (r <= 0) return;
    ctx.save();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, '#f1f3f5');
    g.addColorStop(1, '#868e96');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function legend(ctx, x, y, items) {
    Sim.rect(ctx, x - 6, y - 10, 118, items.length * 16 + 4, { fill: 'rgba(255,255,255,0.88)', r: 4 });
    items.forEach((it, i) => {
      const yy = y + i * 16;
      Sim.line(ctx, x, yy, x + 18, yy, { color: it[1], width: it[2] || 2.5, dash: it[3] });
      Sim.text(ctx, it[0], x + 24, yy, { size: 11.5, color: C.ink });
    });
  }

  /* ======================================================================
     1. Earth–Moon line: where the fields cancel
     ====================================================================== */
  Sim.create('#sim-neutral', {
    title: 'Earth and Moon: where do the fields cancel?',
    height: (w) => (w >= 640 ? 470 : 560),
    controls: [
      { key: 'k', label: 'Mass of the right-hand body', min: 1, max: 81, step: 1, value: 1, unit: '× Moon', format: (v) => v.toFixed(0) },
      { key: 'showV', type: 'check', label: 'Show the potential V along the line', value: false }
    ],
    init(s) { s.state = { f: 0.62, geo: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const m2 = p.k * MMOON, GM2 = G * m2;
      const left = 62, right = 46, gw = w - left - right;
      const X = (xm) => left + (xm / DEM) * gw;
      const RB = Math.max(12, Math.min(30, gw * 0.075));
      const rm = Math.max(6, RB * Math.cbrt(m2 / ME));
      const fmin = (RB + 10) / gw, fmax = 1 - (rm + 10) / gw;
      st.geo = { left, gw, fmin, fmax };
      const f = Sim.clamp(st.f, fmin, fmax);
      const f0 = 1 / (1 + Math.sqrt(m2 / ME));
      const x0 = f0 * DEM;
      const gN = GME / (x0 * x0);
      const x = f * DEM;
      const gE = GME / (x * x), gM = GM2 / ((DEM - x) * (DEM - x));
      const gnet = gM - gE; // positive = towards the right-hand body

      /* the scene */
      const SH = 122, sy = 60;
      Sim.rect(ctx, 0, 0, w, SH, { fill: SPACE });
      stars(ctx, w, SH, 60, 11);
      Sim.line(ctx, X(0), sy, X(DEM), sy, { color: 'rgba(255,255,255,0.35)', width: 1.5, dash: [4, 5] });
      earth(ctx, X(0), sy, RB);
      moon(ctx, X(DEM), sy, rm);
      Sim.text(ctx, 'Earth', X(0), sy + RB + 12, { size: 12, color: '#dbe4ff', align: 'center', bold: true });
      Sim.text(ctx, p.k === 1 ? 'Moon' : p.k + ' × Moon', X(DEM), sy + Math.max(rm, 12) + 12, { size: 12, color: '#dbe4ff', align: p.k === 1 ? 'center' : 'right', bold: true });
      Sim.line(ctx, X(x0), sy - 30, X(x0), sy + 30, { color: '#ffc078', width: 1.5, dash: [3, 3] });
      Sim.text(ctx, 'neutral point', X(x0), 12, { size: 11.5, color: '#ffc078', align: 'center', bold: true });
      const px = X(x);
      const sc = 52 / gN;
      const lenE = Math.min(gE * sc, 150), lenM = Math.min(gM * sc, 150);
      if (lenE > 3) Sim.arrow(ctx, px, sy - 13, px - lenE, sy - 13, { color: '#74c0fc', width: 3, head: 9 });
      if (lenM > 3) Sim.arrow(ctx, px, sy - 13, px + lenM, sy - 13, { color: '#ced4da', width: 3, head: 9 });
      if (lenE > 30) Sim.text(ctx, 'Earth', px - lenE / 2, sy - 26, { size: 11.5, color: '#a5d8ff', align: 'center', bold: true });
      if (lenM > 30) Sim.text(ctx, p.k === 1 ? 'Moon' : 'body', px + lenM / 2, sy - 26, { size: 11.5, color: '#e9ecef', align: 'center', bold: true });
      const lenR = Math.min(Math.abs(gnet) * sc, 150);
      if (lenR > 4) {
        Sim.arrow(ctx, px, sy + 15, px + Math.sign(gnet) * lenR, sy + 15, { color: '#8ce99a', width: 3.5, head: 10 });
        if (lenR > 40) Sim.text(ctx, 'resultant', px + (Math.sign(gnet) * lenR) / 2, sy + 29, { size: 11.5, color: '#8ce99a', align: 'center', bold: true });
      } else Sim.text(ctx, 'resultant ≈ 0', px, sy + 22, { size: 12, color: '#8ce99a', align: 'center', bold: true });
      Sim.circle(ctx, px, sy, 7, { fill: '#fff', stroke: C.navy, width: 2 });

      /* graphs */
      const top = SH + 30;
      const avail = h - top - 30;
      let gb, vb = null;
      if (p.showV) {
        const gh = (avail - 52) / 2;
        gb = { x: left, y: top, w: gw, h: gh };
        vb = { x: left, y: top + gh + 52, w: gw, h: gh };
      } else gb = { x: left, y: top, w: gw, h: avail };
      const ymax = 3 * gN;
      const D8 = DEM / 1e8;
      const gg = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: D8, ymin: -ymax, ymax, xlabel: '', ylabel: 'g / N kg⁻¹', title: 'g along the line (+ = to the right)' }, gb)).axes();
      Sim.text(ctx, 'x (distance from Earth) / 10⁸ m', gb.x + gb.w, gb.y + gb.h + 14, { size: 12.5, bold: true, align: 'right' });
      const gEarth = (xu) => -GME / ((xu * 1e8) ** 2);
      const gMoon = (xu) => GM2 / ((DEM - xu * 1e8) ** 2);
      gg.vline(x0 / 1e8, { color: C.orange, dash: [4, 4] });
      gg.plot(gEarth, { from: 0.04, to: D8, color: C.blue, width: 2 });
      gg.plot(gMoon, { from: 0, to: D8 - 0.02, color: C.grey, width: 2 });
      gg.plot((xu) => gEarth(xu) + gMoon(xu), { from: 0.04, to: D8 - 0.02, color: C.green, width: 3.2 });
      gg.vline(x / 1e8, { color: C.navy, dash: [2, 3], width: 1 });
      gg.dot(x / 1e8, gnet, { color: C.green });
      legend(ctx, gb.x + (gb.w > 420 ? 110 : 84), gb.y + 14, [["Earth's field", C.blue], [p.k === 1 ? "Moon's field" : "body's field", C.grey], ['resultant', C.green, 3.2]]);

      if (vb) {
        const Vf = (xu) => (-GME / (xu * 1e8) - GM2 / (DEM - xu * 1e8)) / 1e6;
        const Vn = Vf(x0 / 1e8);
        const span = 0.45 * Math.abs(Vn);
        const gv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: D8, ymin: Vn - span, ymax: Vn + 0.2 * span, xlabel: '', ylabel: 'V / MJ kg⁻¹', title: 'potential along the line' }, vb)).axes();
        gv.vline(x0 / 1e8, { color: C.orange, dash: [4, 4] });
        gv.plot(Vf, { from: 0.04, to: D8 - 0.02, color: C.purple, width: 3 });
        const xu = x / 1e8, slope = -gnet * 100; // MJ kg⁻¹ per 10⁸ m
        gv.plot((t) => Vf(xu) + slope * (t - xu), { from: xu - 0.35, to: xu + 0.35, color: C.orange, width: 2, dash: [6, 4] });
        gv.dot(xu, Vf(xu), { color: C.purple });
        gv.dot(x0 / 1e8, Vn, { color: C.orange, r: 4, label: 'max V where g = 0', dx: x0 / DEM > 0.7 ? -10 : 10, dy: -12, align: x0 / DEM > 0.7 ? 'right' : 'left' });
      }
    },
    readout(s) {
      const p = s.p, st = s.state;
      const m2 = p.k * MMOON, GM2 = G * m2;
      const geo = st.geo || { fmin: 0.05, fmax: 0.97 };
      const x = Sim.clamp(st.f, geo.fmin, geo.fmax) * DEM;
      const gE = GME / (x * x), gM = GM2 / ((DEM - x) * (DEM - x));
      const gnet = gM - gE;
      const f0 = 1 / (1 + Math.sqrt(m2 / ME));
      const out = [
        ['distance from Earth x =', Sim.fmt(x, 3) + ' m'],
        ["Earth's g =", Sim.fmt(gE, 3) + ' N kg⁻¹'],
        [(p.k === 1 ? "Moon's" : "body's") + ' g =', Sim.fmt(gM, 3) + ' N kg⁻¹'],
        ['resultant =', Sim.fmt(Math.abs(gnet), 2) + ' N kg⁻¹ ' + (Math.abs(gnet) < 2e-5 ? '' : gnet < 0 ? 'towards Earth' : 'to the right'), true],
        ['neutral point at x =', Sim.fmt(f0 * DEM, 3) + ' m (' + f0.toFixed(3) + ' of the way)']
      ];
      if (p.showV) out.push(['V =', Sim.fmt((-GME / x - GM2 / (DEM - x)) / 1e6, 3) + ' MJ kg⁻¹']);
      return out;
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) { this.move(s, pt); },
      move(s, pt) {
        if (!pt.down) return;
        const g = s.state.geo;
        if (!g) return;
        s.state.f = Sim.clamp((pt.x - g.left) / g.gw, g.fmin, g.fmax);
      }
    }
  });

  /* ======================================================================
     2. Field lines and equipotentials around one or two masses
     ====================================================================== */
  const MS_TABLE = [null, [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[0, 3]], null];
  function marching(V, ins, nx, ny, cell, L, out) {
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const ia = j * nx + i, ib = ia + 1, ic = ia + nx + 1, id = ia + nx;
        if (ins[ia] || ins[ib] || ins[ic] || ins[id]) continue;
        const a = V[ia], b = V[ib], c = V[ic], d = V[id];
        const idx = (a < L ? 1 : 0) | (b < L ? 2 : 0) | (c < L ? 4 : 0) | (d < L ? 8 : 0);
        const tbl = MS_TABLE[idx];
        if (!tbl) continue;
        const edge = (e) => {
          let t;
          if (e === 0) { t = (L - a) / (b - a); return [(i + t) * cell, j * cell]; }
          if (e === 1) { t = (L - b) / (c - b); return [(i + 1) * cell, (j + t) * cell]; }
          if (e === 2) { t = (L - c) / (d - c); return [(i + 1 - t) * cell, (j + 1) * cell]; }
          t = (L - d) / (a - d); return [i * cell, (j + 1 - t) * cell];
        };
        for (const sg of tbl) {
          const p1 = edge(sg[0]), p2 = edge(sg[1]);
          out.push(p1[0], p1[1], p2[0], p2[1]);
        }
      }
    }
  }
  function fieldMasses(s) {
    const st = s.state;
    const list = [{ x: st.m1.x, y: st.m1.y, M: ME, R: 1 }];
    if (s.p.two) {
      const q = s.p.ratio;
      list.push({ x: st.m2.x, y: st.m2.y, M: q * ME, R: Math.max(0.45, Math.cbrt(q)) });
    }
    return list;
  }
  function gAt(ms, wx, wy) {
    let gx = 0, gy = 0;
    for (const m of ms) {
      const dx = m.x - wx, dy = m.y - wy;
      const d = Math.max(Math.hypot(dx, dy), m.R);
      const mag = (G * m.M) / ((d * RE) * (d * RE));
      gx += (mag * dx) / d;
      gy += (mag * dy) / d;
    }
    return [gx, gy];
  }
  function potAt(ms, wx, wy) {
    let v = 0;
    for (const m of ms) v -= (G * m.M) / (Math.max(Math.hypot(wx - m.x, wy - m.y), m.R) * RE);
    return v;
  }
  function placeMasses(s) {
    const st = s.state;
    const wide = s.w >= 640;
    if (s.p.two) {
      st.m1 = wide ? { x: -4, y: 0 } : { x: 0, y: 3 };
      st.m2 = wide ? { x: 4.2, y: 0 } : { x: 0, y: -3.4 };
      st.probe = wide ? { x: 0.3, y: 2.6 } : { x: 2.6, y: 0 };
    } else {
      st.m1 = { x: 0, y: 0 };
      st.m2 = wide ? { x: 4.2, y: 0 } : { x: 0, y: -3.4 };
      st.probe = wide ? { x: 3.2, y: 2 } : { x: 2.4, y: 2.6 };
    }
    st.cache = null;
  }
  function buildField(s, ms) {
    const { w, h } = s;
    const u = s.state.u;
    const cell = 5, nx = Math.ceil(w / cell) + 1, ny = Math.ceil(h / cell) + 1;
    const V = new Float64Array(nx * ny), ins = new Uint8Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const wx = (i * cell - w / 2) / u, wy = (h / 2 - j * cell) / u;
        let v = 0, inside = 0;
        for (const m of ms) {
          const d = Math.hypot(wx - m.x, wy - m.y);
          if (d < m.R) inside = 1;
          v -= (G * m.M) / (Math.max(d, m.R) * RE);
        }
        V[j * nx + i] = v;
        ins[j * nx + i] = inside;
      }
    }
    const img = document.createElement('canvas');
    img.width = nx;
    img.height = ny;
    const ictx = img.getContext('2d');
    const data = ictx.createImageData(nx, ny);
    const Vs = GME / RE;
    for (let k = 0; k < nx * ny; k++) {
      const t = Math.pow(Sim.clamp(-V[k] / Vs, 0, 1), 0.75);
      data.data[k * 4] = Math.round(255 - t * 120);
      data.data[k * 4 + 1] = Math.round(255 - t * 90);
      data.data[k * 4 + 2] = Math.round(255 - t * 18);
      data.data[k * 4 + 3] = 255;
    }
    ictx.putImageData(data, 0, 0);
    const segs = [];
    for (let L = -5e6; L >= -60e6; L -= 5e6) marching(V, ins, nx, ny, cell, L, segs);
    // field lines, traced outwards from each mass (opposite to g)
    const lines = [];
    const xmax = w / 2 / u + 0.3, ymax = h / 2 / u + 0.3, ds = 2.5 / u;
    ms.forEach((m, idx) => {
      const n = idx === 0 ? 16 : Math.max(6, Math.round(16 * s.p.ratio));
      const off = ms.length > 1 ? Math.PI / n : 0;
      for (let k = 0; k < n; k++) {
        const a = off + (2 * Math.PI * k) / n;
        let x = m.x + (m.R + 0.02) * Math.cos(a), y = m.y + (m.R + 0.02) * Math.sin(a);
        const pts = [[x, y]];
        let pdx = 0, pdy = 0;
        for (let step = 0; step < 900; step++) {
          const gv = gAt(ms, x, y);
          const mag = Math.hypot(gv[0], gv[1]);
          if (!(mag > 1e-12)) break;
          const dx = -gv[0] / mag, dy = -gv[1] / mag;
          if (step > 0 && dx * pdx + dy * pdy < -0.3) break;
          pdx = dx; pdy = dy;
          x += dx * ds; y += dy * ds;
          if (Math.abs(x) > xmax || Math.abs(y) > ymax) { pts.push([x, y]); break; }
          if (ms.some((o) => Math.hypot(x - o.x, y - o.y) < o.R)) break;
          pts.push([x, y]);
        }
        lines.push(pts);
      }
    });
    return { img, segs, lines, nx, ny, cell };
  }
  function fixProbe(s, ms) {
    const pr = s.state.probe;
    for (const m of ms) {
      const d = Math.hypot(pr.x - m.x, pr.y - m.y);
      const need = m.R + 0.15;
      if (d >= need) continue;
      if (d < 1e-6) { pr.x = m.x + need; pr.y = m.y; continue; }
      pr.x = m.x + ((pr.x - m.x) * need) / d;
      pr.y = m.y + ((pr.y - m.y) * need) / d;
    }
  }

  Sim.create('#sim-gfield', {
    title: 'Field lines and equipotentials',
    height: (w) => (w >= 640 ? Math.round(Math.min(480, w * 0.5)) : 430),
    controls: [
      { key: 'two', type: 'check', label: 'Add a second mass', value: false, onChange: (s) => placeMasses(s) },
      { key: 'ratio', label: 'Second mass m₂ ÷ m₁', min: 0.1, max: 1, step: 0.05, value: 0.5, format: (v) => v.toFixed(2) },
      { key: 'lines', type: 'check', label: 'Field lines', value: true },
      { key: 'equi', type: 'check', label: 'Equipotentials', value: true }
    ],
    init(s) { s.state = { drag: null, cache: null, u: 40 }; placeMasses(s); },
    resize(s) { s.state.cache = null; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const u = w / (w >= 640 ? 20 : 11);
      st.u = u;
      const ms = fieldMasses(s);
      fixProbe(s, ms);
      const key = [w, h, p.two, p.ratio, st.m1.x, st.m1.y, st.m2.x, st.m2.y].join(',');
      if (!st.cache || st.cache.key !== key) { st.cache = buildField(s, ms); st.cache.key = key; }
      const cache = st.cache;
      const P = (q) => [w / 2 + q[0] * u, h / 2 - q[1] * u];
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(cache.img, -cache.cell / 2, -cache.cell / 2, cache.nx * cache.cell, cache.ny * cache.cell);
      ctx.restore();
      if (p.equi) {
        ctx.save();
        ctx.strokeStyle = 'rgba(47,158,68,0.9)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        const sg = cache.segs;
        for (let i = 0; i < sg.length; i += 4) { ctx.moveTo(sg[i], sg[i + 1]); ctx.lineTo(sg[i + 2], sg[i + 3]); }
        ctx.stroke();
        ctx.restore();
        if (!p.two) {
          [10, 20, 30].forEach((mv) => {
            const rr = GME / (mv * 1e6) / RE;
            const a = (150 * Math.PI) / 180;
            const q = P([st.m1.x + rr * Math.cos(a), st.m1.y + rr * Math.sin(a)]);
            if (q[0] > 20 && q[1] > 10 && q[1] < h - 10) Sim.text(ctx, '−' + mv, q[0], q[1], { size: 11.5, color: C.green, bold: true, align: 'center', bg: 'rgba(255,255,255,0.85)', pad: 2 });
          });
        }
      }
      if (p.lines) {
        cache.lines.forEach((pts) => {
          if (pts.length < 2) return;
          Sim.polyline(ctx, pts.map(P), { color: C.navy, width: 1.4, alpha: 0.85 });
          const i = Math.min(pts.length - 4, Math.round(36 * (s.w >= 640 ? 1 : 0.7)));
          if (i >= 1) {
            const a = P(pts[i + 3]), b = P(pts[i]);
            Sim.arrow(ctx, a[0], a[1], b[0], b[1], { color: C.navy, width: 1.6, head: 10 });
          }
        });
      }
      // masses
      ms.forEach((m, i) => {
        const c = P([m.x, m.y]);
        if (i === 0) earth(ctx, c[0], c[1], m.R * u); else moon(ctx, c[0], c[1], m.R * u);
        Sim.circle(ctx, c[0], c[1], m.R * u, { stroke: i === 0 ? C.navy : '#495057', width: 1.5 });
        Sim.text(ctx, i === 0 ? 'm₁' : 'm₂', c[0], c[1], { size: 14, bold: true, color: i === 0 ? '#fff' : '#212529', align: 'center' });
      });
      if (p.two) {
        const q = p.ratio, f0 = 1 / (1 + Math.sqrt(q));
        const n = P([st.m1.x + f0 * (st.m2.x - st.m1.x), st.m1.y + f0 * (st.m2.y - st.m1.y)]);
        Sim.line(ctx, n[0] - 5, n[1] - 5, n[0] + 5, n[1] + 5, { color: C.orange, width: 2.5 });
        Sim.line(ctx, n[0] - 5, n[1] + 5, n[0] + 5, n[1] - 5, { color: C.orange, width: 2.5 });
        Sim.text(ctx, 'g = 0', n[0] + 8, n[1] - 12, { size: 12, bold: true, color: '#b35c00', bg: 'rgba(255,255,255,0.8)', pad: 2 });
      }
      // probe
      const pr = P([st.probe.x, st.probe.y]);
      const gv = gAt(ms, st.probe.x, st.probe.y);
      const gm = Math.hypot(gv[0], gv[1]);
      const len = Sim.clamp(gm * 32, 0, 120);
      if (gm > 1e-9 && len > 3) Sim.arrow(ctx, pr[0], pr[1], pr[0] + (gv[0] / gm) * len, pr[1] - (gv[1] / gm) * len, { color: C.red, width: 3, label: 'g', labelOffset: 12 });
      Sim.circle(ctx, pr[0], pr[1], 9, { fill: '#fff', stroke: C.red, width: 2.5 });
      Sim.circle(ctx, pr[0], pr[1], 3, { fill: C.red });
      const note = (p.equi ? 'green: equipotentials every 5 MJ kg⁻¹' : '') + (p.equi && p.lines ? '   ' : '') + (p.lines ? 'navy: field lines' : '');
      if (note) Sim.text(ctx, note, 10, h - 12, { size: 11.5, color: C.ink, bg: 'rgba(255,255,255,0.85)', pad: 3 });
      Sim.text(ctx, 'drag the masses or the probe', w - 10, 14, { size: 11.5, color: C.muted, align: 'right', italic: true, bg: 'rgba(255,255,255,0.8)', pad: 2 });
    },
    readout(s) {
      const st = s.state;
      const ms = fieldMasses(s);
      const gv = gAt(ms, st.probe.x, st.probe.y);
      const V = potAt(ms, st.probe.x, st.probe.y);
      const d1 = Math.hypot(st.probe.x - st.m1.x, st.probe.y - st.m1.y);
      return [
        ['probe: g =', Sim.fmt(Math.hypot(gv[0], gv[1]), 3) + ' N kg⁻¹'],
        ['V =', Sim.fmt(V / 1e6, 3) + ' MJ kg⁻¹', true],
        ['distance from m₁ =', d1.toFixed(2) + ' R = ' + Sim.fmt(d1 * RE, 3) + ' m'],
        ['work to take 1 kg from here to infinity =', Sim.fmt(-V / 1e6, 3) + ' MJ'],
        ['m₁ = Earth: ', '5.97 × 10²⁴ kg, R = 6.37 × 10⁶ m']
      ];
    },
    pointer: {
      cursor: 'grab',
      down(s, pt) {
        const st = s.state, u = st.u, w = s.w, h = s.h;
        const P = (q) => [w / 2 + q.x * u, h / 2 - q.y * u];
        const ms = fieldMasses(s);
        const pp = P(st.probe);
        st.drag = null;
        if (Math.hypot(pt.x - pp[0], pt.y - pp[1]) < 22) st.drag = 'probe';
        else {
          const c1 = P(st.m1);
          if (Math.hypot(pt.x - c1[0], pt.y - c1[1]) < ms[0].R * u + 8) st.drag = 'm1';
          else if (s.p.two) {
            const c2 = P(st.m2);
            if (Math.hypot(pt.x - c2[0], pt.y - c2[1]) < ms[1].R * u + 8) st.drag = 'm2';
          }
        }
        s.canvas.style.cursor = st.drag ? 'grabbing' : 'grab';
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || !st.drag) return;
        const u = st.u;
        const hx = s.w / 2 / u, hy = s.h / 2 / u;
        const wx = Sim.clamp((pt.x - s.w / 2) / u, -hx + 0.3, hx - 0.3);
        const wy = Sim.clamp((s.h / 2 - pt.y) / u, -hy + 0.3, hy - 0.3);
        if (st.drag === 'probe') { st.probe = { x: wx, y: wy }; return; }
        const ms = fieldMasses(s);
        const me = st.drag === 'm1' ? ms[0] : ms[1];
        const lim = (v, r, hh) => Sim.clamp(v, -hh + r, hh - r);
        const nxp = { x: lim(wx, me.R, hx), y: lim(wy, me.R, hy) };
        if (ms.length > 1) {
          const other = st.drag === 'm1' ? ms[1] : ms[0];
          if (Math.hypot(nxp.x - other.x, nxp.y - other.y) < me.R + other.R + 0.6) return;
        }
        st[st.drag] = nxp;
      },
      up(s) { s.state.drag = null; s.canvas.style.cursor = 'grab'; }
    }
  });

  /* ======================================================================
     3. g–r and V–r graphs for the Earth
     ====================================================================== */
  const gSurf = GME / (RE * RE);
  const VSurf = -GME / RE;
  function gOf(r) { return r >= 1 ? gSurf / (r * r) : gSurf * r; }                  // r in Earth radii
  function VOf(r) { return r >= 1 ? VSurf / r : (VSurf * (3 - r * r)) / 2; }        // J kg⁻¹
  Sim.create('#sim-gr', {
    title: 'g and V around the Earth',
    height: (w) => (w >= 640 ? 510 : 560),
    controls: [
      { key: 'r', label: 'Distance from the centre r', min: 0, max: 8, step: 0.05, value: 2, unit: 'Earth radii', format: (v) => v.toFixed(2),
        onChange: (s, v) => { if (!s.p.inside && v < 1) s.set('r', 1); } },
      { key: 'tan', type: 'check', label: 'Show the tangent to the V–r graph', value: true },
      { key: 'inside', type: 'check', label: 'Show inside the Earth (beyond the spec)', value: false,
        onChange: (s, on) => { if (!on && s.p.r < 1) s.set('r', 1); } }
    ],
    init(s) { s.state = { geo: null }; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const r = p.inside ? Sim.clamp(p.r, 0.02, 8) : Sim.clamp(p.r, 1, 8);
      const left = 64, right = 26, gw = w - left - right;
      const X = (rr) => left + (rr / 8) * gw;
      /* scene */
      const SH = 96, sy = SH / 2;
      Sim.rect(ctx, 0, 0, w, SH, { fill: SPACE });
      stars(ctx, w, SH, 50, 3);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, SH);
      ctx.clip();
      earth(ctx, X(0), sy, X(1) - X(0));
      ctx.restore();
      Sim.line(ctx, X(0), sy, X(8), sy, { color: 'rgba(255,255,255,0.3)', width: 1.2, dash: [4, 5] });
      [['ISS', 1.064], ['GPS', 4.17], ['geostationary', 6.62]].forEach(([n, rr]) => {
        Sim.circle(ctx, X(rr), sy, 3, { fill: '#ffd43b' });
        Sim.text(ctx, n, X(rr) + (n === 'ISS' ? 4 : 0), sy - 14, { size: 11.5, color: '#ffe066', align: n === 'ISS' ? 'left' : 'center' });
      });
      const pg = gOf(r);
      const px = X(r);
      const alen = Math.min(pg * 9, px - 6);
      if (alen > 3) Sim.arrow(ctx, px, sy + 14, px - alen, sy + 14, { color: '#ff8787', width: 3, head: 9 });
      Sim.text(ctx, 'g', px - alen / 2, sy + 28, { size: 13, bold: true, color: '#ffa8a8', align: 'center' });
      Sim.circle(ctx, px, sy, 7, { fill: '#fff', stroke: C.red, width: 2 });

      /* graphs */
      const top = SH + 32, gap = 50;
      const gh = (h - top - 28 - gap) / 2;
      const gb = { x: left, y: top, w: gw, h: gh };
      const vb = { x: left, y: top + gh + gap, w: gw, h: gh };
      st.geo = { left, gw, top, bottom: vb.y + vb.h };
      const gg = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 8, ymin: 0, ymax: 10.5, xstep: 1, ystep: 2, xlabel: 'r / Earth radii', ylabel: '' }, gb)).axes();
      Sim.text(ctx, 'g / N kg⁻¹', gb.x - 4, gb.y - 12, { size: 12.5, bold: true, align: 'left', color: C.red });
      if (!p.inside) {
        Sim.rect(ctx, gg.px(0), gg.y, gg.px(1) - gg.px(0), gg.h, { fill: 'rgba(134,142,150,0.16)' });
        if (gg.px(1) - gg.px(0) > 50) Sim.text(ctx, 'inside', (gg.px(0) + gg.px(1)) / 2, gg.y + gg.h / 2 + 16, { size: 11.5, color: C.muted, align: 'center', italic: true });
      } else {
        gg.plot((t) => gSurf * t, { from: 0, to: 1, color: C.pink, width: 2.5, dash: [6, 4] });
        Sim.text(ctx, 'pink: inside the Earth (beyond the spec)', gg.px(1.5), gg.py(8.6), { size: 11.5, color: C.pink, bold: true });
      }
      gg.plot((t) => gSurf / (t * t), { from: 1, to: 8, color: C.red, width: 3 });
      gg.vline(r, { color: C.navy, width: 1, dash: [3, 3] });
      gg.dot(r, pg, { color: C.red });

      const vmin = p.inside ? -100 : -70;
      const gv = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 8, ymin: vmin, ymax: 0, xstep: 1, ystep: p.inside ? 20 : 10, xlabel: '', ylabel: '' }, vb)).axes();
      Sim.text(ctx, 'V / MJ kg⁻¹', vb.x - 4, vb.y - 12, { size: 12.5, bold: true, align: 'left', color: C.purple });
      if (!p.inside) {
        Sim.rect(ctx, gv.px(0), gv.y, gv.px(1) - gv.px(0), gv.h, { fill: 'rgba(134,142,150,0.16)' });
      } else {
        gv.plot((t) => VOf(t) / 1e6, { from: 0, to: 1, color: C.pink, width: 2.5, dash: [6, 4] });
      }
      gv.plot((t) => VSurf / t / 1e6, { from: 1, to: 8, color: C.purple, width: 3 });
      gv.vline(r, { color: C.navy, width: 1, dash: [3, 3] });
      Sim.text(ctx, 'r / Earth radii', gv.x + gv.w, gv.y + gv.h + 14, { size: 12.5, bold: true, align: 'right' });
      const Vr = VOf(r) / 1e6;
      if (p.tan) {
        const slope = (pg * RE) / 1e6; // MJ kg⁻¹ per Earth radius
        gv.plot((t) => Vr + slope * (t - r), { from: Math.max(0, r - 1.1), to: Math.min(8, r + 1.1), color: C.orange, width: 2.2, dash: [7, 4] });
        // gradient triangle
        const dx = Math.min(1, 8 - r);
        if (dx > 0.3) {
          const x1 = r, x2 = r + dx, y1 = Vr, y2 = Vr + slope * dx;
          if (y2 <= 0) {
            Sim.line(ctx, gv.px(x1), gv.py(y1), gv.px(x2), gv.py(y1), { color: C.green, width: 1.5, dash: [4, 3] });
            Sim.line(ctx, gv.px(x2), gv.py(y1), gv.px(x2), gv.py(y2), { color: C.green, width: 1.5, dash: [4, 3] });
            Sim.text(ctx, 'gradient = ' + Sim.fmt(pg, 3) + ' N kg⁻¹', gv.px(x2) + 6, (gv.py(y1) + gv.py(y2)) / 2, { size: 12, color: C.green, bold: true, bg: 'rgba(255,255,255,0.85)', pad: 2, align: gv.px(x2) > gv.x + gv.w - 150 ? 'right' : 'left' });
          }
        }
      }
      gv.dot(r, Vr, { color: C.purple });
    },
    readout(s) {
      const p = s.p;
      const r = p.inside ? Sim.clamp(p.r, 0.02, 8) : Sim.clamp(p.r, 1, 8);
      const g = gOf(r);
      const out = [
        ['r =', r.toFixed(2) + ' R = ' + Sim.fmt(r * RE, 3) + ' m'],
        ['g =', Sim.fmt(g, 3) + ' N kg⁻¹', true],
        ['g ÷ g(surface) =', Sim.fmt(g / gSurf, 3)]
      ];
      if (r >= 1) out.push(['(R/r)² =', Sim.fmt(1 / (r * r), 3)]);
      out.push(['V =', Sim.fmt(VOf(r) / 1e6, 3) + ' MJ kg⁻¹']);
      out.push(['gradient of V–r =', Sim.fmt(g, 3) + ' J kg⁻¹ m⁻¹ = N kg⁻¹', true]);
      if (r < 1) out.push(['inside (uniform-density model)', 'beyond the spec']);
      return out;
    },
    pointer: {
      cursor: 'ew-resize',
      touchAction: 'pan-y',
      down(s, pt) { this.move(s, pt); },
      move(s, pt) {
        if (!pt.down) return;
        const g = s.state.geo;
        if (!g) return;
        let r = ((pt.x - g.left) / g.gw) * 8;
        r = Sim.clamp(Math.round(r * 20) / 20, s.p.inside ? 0 : 1, 8);
        s.set('r', r);
      }
    }
  });

  /* ======================================================================
     4. Newton's cannonball: orbit simulator
     ====================================================================== */
  function classify(v0, r0) {
    const vc = Math.sqrt(GME / r0);
    const q = (v0 / vc) * (v0 / vc);
    if (q >= 2) return { kind: 'escape', r2: Infinity, vc, q };
    if (Math.abs(q - 1) < 0.012) return { kind: 'circle', r2: r0, vc, q };
    const r2 = (r0 * q) / (2 - q);
    if (q > 1) return { kind: 'ellipse', r2, vc, q };
    if (r2 <= RE) return { kind: 'fall', r2, vc, q };
    return { kind: 'ellipse', r2, vc, q };
  }
  function viewRadius(c, r0) {
    if (c.kind === 'escape') return Math.min(12 * RE, Math.max(3 * r0, 4 * RE));
    return Sim.clamp(Math.max(r0, c.r2) * 1.12, 1.3 * RE, 12 * RE);
  }
  const OUTCOME = {
    fall: 'falls back to Earth',
    circle: 'circular orbit',
    ellipse: 'elliptical orbit',
    escape: 'escapes (beyond the spec)'
  };
  function fire(s) {
    const st = s.state;
    const r0 = RE + s.p.h * 1e3;
    const v0 = s.p.v * 1e3;
    const c = classify(v0, r0);
    const Tc = 2 * Math.PI * Math.sqrt((r0 * r0 * r0) / GME);
    let warp = Tc / 7;
    if (c.kind === 'circle' || c.kind === 'ellipse') {
      const a = (r0 + c.r2) / 2;
      warp = Math.max(warp, (2 * Math.PI * Math.sqrt((a * a * a) / GME)) / 9);
    }
    if (st.fly && st.fly.pts.length > 2) {
      st.trails.push(st.fly.pts);
      if (st.trails.length > 4) st.trails.shift();
    }
    st.fly = { x: 0, y: r0, vx: v0, vy: 0, c, warp, view: viewRadius(c, r0), pts: [[0, r0]], swept: 0, done: null, r0, v0 };
    if (!s.running) s.play();
  }
  function accel(x, y) {
    const r = Math.hypot(x, y);
    const k = -GME / (r * r * r);
    return [k * x, k * y];
  }

  Sim.create('#sim-orbit', {
    title: "Newton's cannonball: from falling to orbiting",
    height: (w) => (w >= 640 ? 480 : 430),
    controls: [
      { key: 'v', label: 'Launch speed v', min: 2, max: 12, step: 0.05, value: 6.5, unit: 'km s⁻¹', format: (v) => v.toFixed(2) },
      { key: 'h', label: 'Launch height above the ground', min: 200, max: 5000, step: 100, value: 800, unit: 'km', format: (v) => v.toFixed(0),
        onChange: (s) => { s.state.fly = null; s.state.trails = []; } },
      { key: 'arrows', type: 'check', label: 'Show force and velocity arrows', value: true },
      { type: 'button', label: 'Fire', onClick: (s) => fire(s) },
      { type: 'button', label: 'Set v to √(GM/r)', ghost: true, onClick: (s) => { const r0 = RE + s.p.h * 1e3; s.set('v', Math.sqrt(GME / r0) / 1e3); fire(s); } },
      { type: 'button', label: 'Clear trails', ghost: true, onClick: (s) => { s.state.trails = []; } }
    ],
    animate: true,
    resetButton: false,
    init(s) {
      s.state = { trails: [], fly: null };
      fire(s);
    },
    update(s, dt) {
      const f = s.state.fly;
      if (!f || f.done || dt <= 0) return;
      let rem = dt * f.warp;
      let guard = 0;
      let { x, y, vx, vy } = f;
      const lim = f.c.kind === 'escape' ? f.view * 1.5 : Math.max(30 * RE, f.c.r2 * 1.5);
      while (rem > 0 && guard < 4000) {
        const r = Math.hypot(x, y);
        const hs = Math.min(rem, 0.003 * 2 * Math.PI * Math.sqrt((r * r * r) / GME));
        const a1 = accel(x, y);
        const nx = x + vx * hs + 0.5 * a1[0] * hs * hs;
        const ny = y + vy * hs + 0.5 * a1[1] * hs * hs;
        const a2 = accel(nx, ny);
        vx += 0.5 * (a1[0] + a2[0]) * hs;
        vy += 0.5 * (a1[1] + a2[1]) * hs;
        const dAng = Math.atan2(nx * y - ny * x, nx * x + ny * y);
        f.swept += dAng;
        x = nx; y = ny;
        rem -= hs;
        guard++;
        const rn = Math.hypot(x, y);
        if (rn <= RE) {
          x *= RE / rn; y *= RE / rn;
          f.done = 'crash';
          break;
        }
        if (rn > lim) { f.done = 'escaped'; break; }
      }
      Object.assign(f, { x, y, vx, vy });
      if (Math.abs(f.swept) < 2 * Math.PI + 0.05 || f.c.kind === 'escape') {
        if (f.pts.length < 3000) f.pts.push([x, y]);
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const r0 = RE + p.h * 1e3;
      const cNow = classify(p.v * 1e3, r0);
      const f = st.fly;
      const Rv = f ? f.view : viewRadius(cNow, r0);
      const k = (Math.min(w, h) / 2 - 16) / Rv;
      const cx = w / 2, cy = h / 2;
      const P = (x, y) => [cx + x * k, cy - y * k];
      Sim.rect(ctx, 0, 0, w, h, { fill: SPACE });
      stars(ctx, w, h, 110, 5);
      // reference circle for a circular orbit at the launch height
      Sim.circle(ctx, cx, cy, r0 * k, { stroke: 'rgba(255,255,255,0.28)', width: 1.2, dash: [5, 6] });
      // atmosphere and Earth
      Sim.circle(ctx, cx, cy, RE * k + 4, { fill: 'rgba(116,192,252,0.18)' });
      earth(ctx, cx, cy, RE * k);
      // mountain up to the launch point
      const th = Sim.clamp(0.5 * (p.h * 1e3) / RE + 0.05, 0.06, 0.45);
      const base1 = P(-RE * Math.sin(th), RE * Math.cos(th)), base2 = P(RE * Math.sin(th), RE * Math.cos(th));
      const peak = P(0, r0);
      Sim.polyline(ctx, [base1, peak, base2], { color: '#5c4a3a', width: 1.5, fill: '#8d7556', close: true });
      const snow = 0.22;
      Sim.polyline(ctx, [[peak[0] + (base1[0] - peak[0]) * snow, peak[1] + (base1[1] - peak[1]) * snow], peak, [peak[0] + (base2[0] - peak[0]) * snow, peak[1] + (base2[1] - peak[1]) * snow]], { color: '#f1f3f5', width: 1, fill: '#f8f9fa', close: true });
      Sim.rect(ctx, peak[0] - 2, peak[1] - 7, 16, 7, { fill: '#343a40', r: 2 });
      // trails
      st.trails.forEach((tr) => Sim.polyline(ctx, tr.map((q) => P(q[0], q[1])), { color: '#ffd43b', width: 1.6, alpha: 0.3 }));
      if (f) {
        Sim.polyline(ctx, f.pts.map((q) => P(q[0], q[1])).concat([P(f.x, f.y)]), { color: '#ffd43b', width: 2.4 });
        const b = P(f.x, f.y);
        if (p.arrows && !f.done) {
          const r = Math.hypot(f.x, f.y), sp = Math.hypot(f.vx, f.vy);
          const g = GME / (r * r);
          const fl = Sim.clamp(g * 5, 6, 60), vl = Sim.clamp((sp / 1e3) * 6, 6, 80);
          Sim.arrow(ctx, b[0], b[1], b[0] - (f.x / r) * fl, b[1] + (f.y / r) * fl, { color: '#ff6b6b', width: 3, label: 'F', labelOffset: 11 });
          if (sp > 0) Sim.arrow(ctx, b[0], b[1], b[0] + (f.vx / sp) * vl, b[1] - (f.vy / sp) * vl, { color: '#74c0fc', width: 3, label: 'v', labelOffset: 11 });
        }
        Sim.circle(ctx, b[0], b[1], 5, { fill: '#fff', stroke: '#ffd43b', width: 2 });
        if (f.done === 'crash') Sim.text(ctx, '✕', b[0], b[1], { size: 18, bold: true, color: '#ff6b6b', align: 'center' });
      }
      // labels
      const c = f ? f.c : cNow;
      let msg = OUTCOME[c.kind];
      if (f && f.done === 'crash') msg = 'hit the ground';
      if (f && f.done === 'escaped') msg = 'escaped (beyond the spec)';
      Sim.text(ctx, msg, 12, 18, { size: 14, bold: true, color: c.kind === 'escape' ? '#ffc078' : '#fff', bg: 'rgba(0,43,128,0.85)', pad: 5 });
      if (f && Math.abs(f.v0 - p.v * 1e3) > 1) Sim.text(ctx, 'press Fire to use the new speed', 12, 44, { size: 12, color: '#dbe4ff', italic: true });
      if (w >= 640) {
        legend2(ctx, w - 196, h - 52);
      }
      Sim.text(ctx, 'dashed: circular orbit at the launch height', 12, h - 14, { size: 11.5, color: 'rgba(255,255,255,0.75)' });
    },
    readout(s) {
      const p = s.p, st = s.state;
      const r0 = RE + p.h * 1e3;
      const vc = Math.sqrt(GME / r0);
      const out = [
        ['circular-orbit speed √(GM/r) =', Sim.fmt(vc / 1e3, 3) + ' km s⁻¹', true],
        ['v ÷ √(GM/r) =', Sim.fmt((p.v * 1e3) / vc, 3)]
      ];
      const f = st.fly;
      if (f) {
        const r = Math.hypot(f.x, f.y), sp = Math.hypot(f.vx, f.vy);
        out.push(['outcome:', f.done === 'crash' ? 'hit the ground' : OUTCOME[f.c.kind]]);
        out.push(['now: height =', (r - RE < 1 ? '0' : Sim.fmt((r - RE) / 1e3, 3)) + ' km']);
        out.push(['speed =', Sim.fmt(sp / 1e3, 3) + ' km s⁻¹']);
        out.push(['g = GM/r² =', Sim.fmt(GME / (r * r), 3) + ' N kg⁻¹']);
        if (f.c.kind === 'circle') out.push(['period T = 2πr/v =', Sim.fmt((2 * Math.PI * f.r0) / f.v0 / 60, 3) + ' min', true]);
      }
      out.push(['escape speed √(2GM/r) (beyond the spec) =', Sim.fmt((Math.SQRT2 * vc) / 1e3, 3) + ' km s⁻¹']);
      return out;
    }
  });
  function legend2(ctx, x, y) {
    Sim.rect(ctx, x - 10, y - 14, 192, 44, { fill: 'rgba(0,0,0,0.25)', r: 6 });
    Sim.arrow(ctx, x, y, x + 24, y, { color: '#ff6b6b', width: 3, head: 8 });
    Sim.text(ctx, 'gravitational force', x + 32, y, { size: 11.5, color: '#fff' });
    Sim.arrow(ctx, x, y + 17, x + 24, y + 17, { color: '#74c0fc', width: 3, head: 8 });
    Sim.text(ctx, 'velocity', x + 32, y + 17, { size: 11.5, color: '#fff' });
  }

  /* ======================================================================
     5. T² against r³: weighing the central body
     ====================================================================== */
  const DAY = 86400, HOUR = 3600, YEAR = 3.156e7;
  const SYSTEMS = {
    jupiter: {
      label: "Jupiter's moons", body: 'Jupiter', M: 1.898e27, R: 6.99e7, color: '#e8b07a', tu: [DAY, 'days'],
      items: [['Io', 4.217e8, 1.769 * DAY], ['Europa', 6.711e8, 3.551 * DAY], ['Ganymede', 1.0704e9, 7.155 * DAY], ['Callisto', 1.8827e9, 16.689 * DAY]]
    },
    sun: {
      label: 'Inner planets', body: 'Sun', M: 1.989e30, R: 6.96e8, color: '#ffd43b', tu: [YEAR, 'years'],
      items: [['Mercury', 5.79e10, 0.2408 * YEAR], ['Venus', 1.082e11, 0.6152 * YEAR], ['Earth', 1.496e11, 1.0 * YEAR], ['Mars', 2.279e11, 1.8809 * YEAR]]
    },
    earth: {
      label: "Earth's satellites", body: 'Earth', M: 5.97e24, R: 6.37e6, color: '#4dabf7', tu: [HOUR, 'hours'],
      items: [['ISS', 6.78e6, 92.7 * 60], ['GPS', 2.656e7, 11.967 * HOUR], ['Galileo', 2.96e7, 14.08 * HOUR], ['geostationary', 4.216e7, 23.934 * HOUR]]
    }
  };
  const DOT_VIEW = ['#4dabf7', '#69db7c', '#ffa8a8', '#e599f7'];
  const DOT_GRAPH = [C.blue, C.green, C.red, C.purple];
  let keplerSys = 'jupiter';
  const rOuter = (sys) => sys.items[sys.items.length - 1][1];

  Sim.create('#sim-kepler', {
    title: 'T² against r³: weigh the central body',
    height: (w) => (w >= 700 ? 400 : 620),
    controls: [
      { key: 'sys', type: 'select', label: 'System', value: 'jupiter', options: [['jupiter', "Jupiter's moons"], ['sun', 'Inner planets round the Sun'], ['earth', "Earth's satellites"]],
        onChange: (s, v) => { keplerSys = v; s.set('rt', s.p.rt); s.state.ang = [0, 1.6, 3.1, 4.4, 2.2]; } },
      { key: 'own', type: 'check', label: 'Add your own moon', value: false },
      { key: 'rt', label: 'Your moon’s radius r', min: 0.2, max: 1.5, step: 0.01, value: 0.75,
        format: (v) => Sim.fmt(v * rOuter(SYSTEMS[keplerSys]), 3) + ' m' }
    ],
    animate: true,
    init(s) { s.state = { ang: [0, 1.6, 3.1, 4.4, 2.2] }; },
    update(s, dt) {
      const sys = SYSTEMS[s.p.sys];
      const st = s.state;
      const T0 = sys.items[0][2];
      const scale = T0 / 1.6; // innermost orbit takes 1.6 s
      sys.items.forEach((it, i) => { st.ang[i] = (st.ang[i] + (2 * Math.PI * dt * scale) / it[2]) % (2 * Math.PI); });
      const r = s.p.rt * rOuter(sys);
      const T = 2 * Math.PI * Math.sqrt((r * r * r) / (G * sys.M));
      st.ang[4] = (st.ang[4] + (2 * Math.PI * dt * scale) / T) % (2 * Math.PI);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const sys = SYSTEMS[p.sys];
      const wide = w >= 700;
      const view = wide ? { x: 0, y: 0, w: Math.min(330, w * 0.36), h } : { x: 0, y: 0, w, h: 250 };
      Sim.rect(ctx, view.x, view.y, view.w, view.h, { fill: SPACE });
      stars(ctx, view.w, view.h, 45, 9);
      const vcx = view.x + view.w / 2, vcy = view.y + view.h / 2;
      const rmaxShow = rOuter(sys) * (p.own ? Math.max(1, p.rt) : 1);
      const kk = (Math.min(view.w, view.h) / 2 - 14) / rmaxShow;
      const bodyR = Math.max(6, sys.R * kk);
      sys.items.forEach((it, i) => {
        Sim.circle(ctx, vcx, vcy, it[1] * kk, { stroke: 'rgba(255,255,255,0.25)', width: 1 });
      });
      if (sys.body === 'Earth') earth(ctx, vcx, vcy, bodyR);
      else Sim.circle(ctx, vcx, vcy, bodyR, { fill: sys.color });
      sys.items.forEach((it, i) => {
        const a = st.ang[i], rr = it[1] * kk;
        Sim.circle(ctx, vcx + rr * Math.cos(a), vcy - rr * Math.sin(a), 4.5, { fill: DOT_VIEW[i], stroke: '#fff', width: 1 });
      });
      const rOwn = p.rt * rOuter(sys);
      if (p.own) {
        const rr = rOwn * kk;
        Sim.circle(ctx, vcx, vcy, rr, { stroke: 'rgba(255,212,59,0.6)', width: 1.2, dash: [4, 4] });
        Sim.circle(ctx, vcx + rr * Math.cos(st.ang[4]), vcy - rr * Math.sin(st.ang[4]), 5, { fill: '#ffd43b', stroke: '#fff', width: 1 });
      }
      Sim.text(ctx, sys.body + ' (not to scale for size)', view.x + 10, view.y + view.h - 12, { size: 11.5, color: 'rgba(255,255,255,0.8)' });

      // graph
      const r3 = sys.items.map((it) => it[1] ** 3), T2 = sys.items.map((it) => it[2] ** 2);
      const TOwn = 2 * Math.PI * Math.sqrt((rOwn * rOwn * rOwn) / (G * sys.M));
      let xMaxSI = Math.max.apply(null, r3), yMaxSI = Math.max.apply(null, T2);
      if (p.own) { xMaxSI = Math.max(xMaxSI, rOwn ** 3); yMaxSI = Math.max(yMaxSI, TOwn * TOwn); }
      const ex = Math.floor(Math.log10(xMaxSI)), ey = Math.floor(Math.log10(yMaxSI));
      const xs = Math.pow(10, ex), ys = Math.pow(10, ey);
      const gb = wide ? { x: view.w + 70, y: 34, w: w - view.w - 70 - 24, h: h - 34 - 46 } : { x: 62, y: view.h + 40, w: w - 62 - 22, h: h - view.h - 40 - 46 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: (xMaxSI / xs) * 1.12, ymin: 0, ymax: (yMaxSI / ys) * 1.15, xlabel: 'r³ / 10' + Sim.sup(ex) + ' m³', ylabel: 'T² / 10' + Sim.sup(ey) + ' s²', title: 'T² against r³ for ' + sys.label.replace('Inner planets', 'the inner planets') }, gb)).axes();
      let sxx = 0, sxy = 0;
      r3.forEach((x, i) => { sxx += x * x; sxy += x * T2[i]; });
      const kSI = sxx > 0 ? sxy / sxx : 0;
      const kG = (kSI * xs) / ys;
      g.plot((x) => kG * x, { color: C.orange, width: 2, dash: [7, 4] });
      const x1 = g.xmax * 0.45, x2 = g.xmax * 0.8;
      Sim.line(ctx, g.px(x1), g.py(kG * x1), g.px(x2), g.py(kG * x1), { color: C.green, width: 1.5, dash: [4, 3] });
      Sim.line(ctx, g.px(x2), g.py(kG * x1), g.px(x2), g.py(kG * x2), { color: C.green, width: 1.5, dash: [4, 3] });
      Sim.text(ctx, 'gradient = 4π²/GM', g.px(x2) + 6, g.py(kG * (x1 + x2) / 2), { size: 12, color: C.green, bold: true, bg: 'rgba(255,255,255,0.85)', pad: 2, align: g.px(x2) + 140 > g.x + g.w ? 'right' : 'left' });
      const crowd = [];
      sys.items.forEach((it, i) => {
        const X = r3[i] / xs, Y = T2[i] / ys;
        g.dot(X, Y, { color: DOT_GRAPH[i], r: 5.5 });
        if (X < g.xmax * 0.07) crowd.push(it[0]);
        else {
          const tw = Sim.measure(ctx, it[0], { size: 11.5, bold: true });
          const leftSide = g.px(X) - 8 - tw > g.x + 6;
          Sim.text(ctx, it[0], g.px(X) + (leftSide ? -8 : 9), g.py(Y) - (leftSide ? 10 : 2), { size: 11.5, bold: true, color: DOT_GRAPH[i], align: leftSide ? 'right' : 'left', bg: 'rgba(255,255,255,0.8)', pad: 2 });
        }
      });
      if (crowd.length) Sim.text(ctx, '(' + crowd.join(', ') + ' close to the origin)', g.x + 14, g.y + 34, { size: 11.5, color: C.muted, italic: true });
      if (p.own) {
        g.dot((rOwn ** 3) / xs, (TOwn * TOwn) / ys, { color: C.orange, r: 6, label: 'your moon', dx: 8, dy: 12 });
      }
    },
    readout(s) {
      const p = s.p;
      const sys = SYSTEMS[p.sys];
      let sxx = 0, sxy = 0;
      sys.items.forEach((it) => { const x = it[1] ** 3, y = it[2] ** 2; sxx += x * x; sxy += x * y; });
      const kSI = sxx > 0 ? sxy / sxx : 0;
      const M = kSI > 0 ? (4 * Math.PI * Math.PI) / (G * kSI) : 0;
      const out = [
        ['gradient =', Sim.fmt(kSI, 3) + ' s² m⁻³'],
        ['M = 4π² ÷ (G × gradient) =', Sim.fmt(M, 3) + ' kg', true],
        ['accepted mass of ' + sys.body + ':', Sim.fmt(sys.M, 3) + ' kg']
      ];
      if (p.own) {
        const r = p.rt * rOuter(sys);
        const T = 2 * Math.PI * Math.sqrt((r * r * r) / (G * sys.M));
        out.push(['your moon: T =', Sim.fmt(T / sys.tu[0], 3) + ' ' + sys.tu[1], true]);
      }
      return out;
    }
  });
})();
