/* Particle Nature of Light — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const H = 6.63e-34, CL = 3.00e8, QE = 1.60e-19, ME = 9.11e-31;
  const HEV = H / QE; // Planck constant in eV s
  const DARK = '#101a33';

  /* ---------- shared helpers ---------- */
  function lightColour(nm, a) {
    if (nm < 380) return a == null ? '#b197fc' : 'rgba(177,151,252,' + a + ')';
    if (nm > 750) return a == null ? '#ff8787' : 'rgba(255,135,135,' + a + ')';
    return Sim.spectrum(nm, a);
  }
  /* A darker version for drawing on white backgrounds. */
  function inkColour(nm) {
    if (nm < 380) return C.purple;
    if (nm > 750) return '#a61e4d';
    if (nm >= 540 && nm <= 600) return '#b08900';
    return Sim.spectrum(nm);
  }
  function regionName(nm) {
    if (nm < 380) return 'ultraviolet (invisible)';
    if (nm < 450) return 'visible: violet';
    if (nm < 495) return 'visible: blue';
    if (nm < 570) return 'visible: green';
    if (nm < 590) return 'visible: yellow';
    if (nm < 620) return 'visible: orange';
    if (nm <= 750) return 'visible: red';
    return 'infrared (invisible)';
  }
  /* A photon drawn as a short wave packet centred on (x, y), travelling at angle ang. */
  function packet(ctx, x, y, ang, half, lamPx, amp, color, width, dashed) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (dashed) ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const sig = half / 2.3;
    for (let d = -half; d <= half + 0.01; d += 1) {
      const env = Math.exp(-(d * d) / (2 * sig * sig));
      const yy = -amp * env * Math.sin((2 * Math.PI * d) / lamPx);
      if (d === -half) ctx.moveTo(d, yy); else ctx.lineTo(d, yy);
    }
    ctx.stroke();
    ctx.restore();
  }
  function wrapText(ctx, str, x, y, maxW, lh, o) {
    const words = str.split(' ');
    let line = '', yy = y;
    for (const wd of words) {
      const test = line ? line + ' ' + wd : wd;
      if (line && Sim.measure(ctx, test, o) > maxW) { Sim.text(ctx, line, x, yy, o); line = wd; yy += lh; }
      else line = test;
    }
    if (line) Sim.text(ctx, line, x, yy, o);
    return yy;
  }
  function meter(ctx, x, y, w, frac, col, label, value, narrow) {
    Sim.text(ctx, label, x, y - 10, { size: 13, bold: true, color: C.navy });
    if (!narrow) Sim.text(ctx, value, x + w, y - 10, { size: 13, bold: true, color: C.ink, align: 'right' });
    else Sim.text(ctx, value, x, y + 27, { size: 13, bold: true, color: C.ink });
    Sim.rect(ctx, x, y, w, 14, { fill: '#e9ecef', r: 7 });
    const fw = Math.max(14, w * Sim.clamp(frac, 0, 1));
    Sim.rect(ctx, x, y, fw, 14, { fill: col, r: 7, stroke: 'rgba(0,0,0,0.25)', width: 1 });
  }

  /* ======================================================================
     1. Photon energy and photon rate
     ====================================================================== */
  Sim.create('#sim-photons', {
    title: 'Photon energy and photon rate',
    height: (w) => (w < 560 ? 352 : 340),
    controls: [
      { key: 'lam', label: 'Wavelength λ', min: 200, max: 1000, step: 5, value: 650, unit: 'nm', format: (v) => v.toFixed(0) },
      { key: 'P', label: 'Beam power P', min: 0.2, max: 3, step: 0.1, value: 1, unit: 'mW', format: (v) => v.toFixed(1) }
    ],
    animate: true,
    init(s) { s.state = { ph: [], acc: 0, flash: 0 }; },
    update(s, dt) {
      const st = s.state;
      if (st.x1 == null || dt <= 0) return;
      // on-screen photon rate is proportional to the real one, N = Pλ/hc
      st.acc += 4 * s.p.P * (s.p.lam / 650) * dt;
      while (st.acc >= 1) {
        st.acc -= 1;
        st.ph.push({ x: st.x0 - 24, dy: (Math.random() * 2 - 1) * st.bh * 0.3, lam: s.p.lam });
      }
      const v = Math.max(150, s.w * 0.3);
      let hit = false;
      st.ph = st.ph.filter((q) => {
        q.x += v * dt;
        if (q.x > st.x1 + 20) { hit = true; return false; }
        return true;
      });
      if (hit) st.flash = 1;
      st.flash = Math.max(0, st.flash - dt * 5);
      if (st.ph.length > 220) st.ph.splice(0, st.ph.length - 220);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const narrow = w < 560;
      const pad = 12, bh = narrow ? 118 : 138;
      const srcW = narrow ? 58 : 76, detW = narrow ? 40 : 50;
      const x0 = pad + srcW, x1 = w - pad - detW, cy = pad + bh / 2;
      st.x0 = x0; st.x1 = x1; st.bh = bh;

      Sim.rect(ctx, 0, 0, w, bh + 2 * pad, { fill: DARK });
      ctx.fillStyle = lightColour(p.lam, 0.12);
      ctx.fillRect(x0, cy - bh * 0.38, x1 - x0, bh * 0.76);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, pad, x1 - x0, bh);
      ctx.clip();
      for (const q of st.ph) {
        const inv = q.lam < 380 || q.lam > 750;
        packet(ctx, q.x, cy + q.dy, 0, 22, 5 + q.lam * 0.016, 9, lightColour(q.lam), 2.4, inv);
      }
      ctx.restore();
      // laser and detector
      Sim.rect(ctx, pad, cy - 28, srcW, 56, { fill: '#495057', r: 6 });
      Sim.rect(ctx, x0 - 6, cy - 10, 8, 20, { fill: '#ced4da', r: 2 });
      Sim.text(ctx, 'laser', pad + srcW / 2 - 3, cy, { size: 12, bold: true, color: '#fff', align: 'center' });
      Sim.rect(ctx, x1 + 2, cy - 36, detW, 72, { fill: st.flash > 0.05 ? C.green : '#495057', r: 6 });
      Sim.text(ctx, 'detector', x1 + 2 + detW / 2, cy, { size: 11.5, bold: true, color: '#fff', align: 'center', rotate: -Math.PI / 2 });
      if (p.lam < 380 || p.lam > 750) Sim.text(ctx, 'invisible: drawn dashed', x0 + 8, pad + 12, { size: 11.5, color: '#ced4da', italic: true });

      // meters
      const E = (H * CL) / (p.lam * 1e-9), EeV = E / QE, N = (p.P * 1e-3) / E;
      let y = bh + 2 * pad + 32;
      const mx = 16, mw = w - 32;
      meter(ctx, mx, y, mw, EeV / 6.5, inkColour(p.lam), 'Energy of each photon, E = hf', EeV.toFixed(2) + ' eV  (' + Sim.fmt(E, 3) + ' J)', narrow);
      y += narrow ? 64 : 54;
      meter(ctx, mx, y, mw, N / 1.6e16, C.navy, 'Photons per second, N = P / E', Sim.fmt(N, 3) + ' per second', narrow);

      // EM spectrum strip, 200–1000 nm
      const sy = h - 44, sh = 14;
      const X = (nm) => mx + ((nm - 200) / 800) * mw;
      for (let i = 0; i < mw; i++) {
        const nm = 200 + (800 * i) / mw;
        ctx.fillStyle = nm < 380 ? '#e5dbff' : nm > 750 ? '#ffe3e3' : Sim.spectrum(nm);
        ctx.fillRect(mx + i, sy, 1.5, sh);
      }
      Sim.rect(ctx, mx, sy, mw, sh, { stroke: '#adb5bd', width: 1 });
      Sim.text(ctx, 'ultraviolet', (X(200) + X(380)) / 2, sy - 9, { size: 11.5, color: C.purple, align: 'center', bold: true });
      Sim.text(ctx, 'visible', (X(380) + X(750)) / 2, sy - 9, { size: 11.5, color: C.ink, align: 'center', bold: true });
      Sim.text(ctx, 'infrared', (X(750) + X(1000)) / 2, sy - 9, { size: 11.5, color: '#a61e4d', align: 'center', bold: true });
      [200, 400, 600, 800, 1000].forEach((nm, i) => {
        Sim.text(ctx, nm + (i === 4 ? ' nm' : ''), X(nm), sy + sh + 4, { size: 11, color: C.muted, align: i === 0 ? 'left' : i === 4 ? 'right' : 'center', baseline: 'top' });
      });
      const mxp = X(p.lam);
      Sim.line(ctx, mxp, sy - 2, mxp, sy + sh + 2, { color: C.ink, width: 2.5 });
      ctx.save();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(mxp, sy - 2); ctx.lineTo(mxp - 6, sy - 10); ctx.lineTo(mxp + 6, sy - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    readout(s) {
      const lam = s.p.lam * 1e-9;
      const f = CL / lam, E = H * f, N = (s.p.P * 1e-3) / E;
      return [
        ['f = c/λ =', Sim.fmt(f, 3) + ' Hz'],
        ['E = hf =', Sim.fmt(E, 3) + ' J'],
        ['E =', (E / QE).toFixed(2) + ' eV', true],
        ['N = P/E =', Sim.fmt(N, 3) + ' photons per second', true],
        ['region:', regionName(s.p.lam)]
      ];
    }
  });

  /* ======================================================================
     2. Photoelectric effect lab
     ====================================================================== */
  const METALS = {
    cs: { name: 'Caesium', phi: 2.1, col: '#d4b86a' },
    na: { name: 'Sodium', phi: 2.3, col: '#ced4da' },
    ca: { name: 'Calcium', phi: 2.9, col: '#e9ecef' },
    zn: { name: 'Zinc', phi: 4.3, col: '#a5b4c3' },
    cu: { name: 'Copper', phi: 4.7, col: '#d9773c' }
  };
  const K14 = HEV * 1e14; // photon energy in eV per 10¹⁴ Hz (the gradient h)
  function metalLine(g, phi, color, width) {
    const f0 = phi / K14;
    g.plot((x) => K14 * x - phi, { from: 0, to: f0, color, width, dash: [5, 4] });
    g.plot((x) => K14 * x - phi, { from: f0, to: 20, color, width });
  }

  Sim.create('#sim-photoelectric', {
    title: 'Photoelectric effect lab',
    height: (w) => (w >= 700 ? 380 : 600),
    controls: [
      {
        key: 'metal', type: 'select', label: 'Metal surface', value: 'na',
        options: Object.keys(METALS).map((k) => [k, METALS[k].name + ' (φ = ' + METALS[k].phi.toFixed(1) + ' eV)']),
        onChange: (s) => { s.state.el = []; }
      },
      { key: 'lam', label: 'Wavelength λ', min: 150, max: 700, step: 5, value: 450, unit: 'nm', format: (v) => v.toFixed(0) },
      { key: 'I', label: 'Intensity', min: 0, max: 100, step: 5, value: 60, unit: '%', format: (v) => v.toFixed(0) },
      { key: 'all', type: 'check', label: 'Show the lines for all five metals', value: false }
    ],
    animate: true,
    init(s) { s.state = { ph: [], el: [], fl: [], acc: 0 }; },
    update(s, dt) {
      const st = s.state, g = st.geo;
      if (!g || dt <= 0) return;
      const m = METALS[s.p.metal];
      const E = (HEV * CL) / (s.p.lam * 1e-9);
      st.acc += (s.p.I / 100) * 11 * (s.p.lam / 400) * dt;
      while (st.acc >= 1) {
        st.acc -= 1;
        const tx = g.px0 + 10 + Math.random() * (g.px1 - g.px0 - 20);
        st.ph.push({ tx, t: 0, d: Math.hypot(tx - g.lx, g.plateY - g.ly), lam: s.p.lam, E });
      }
      const keep = [];
      for (const q of st.ph) {
        q.t += 320 * dt;
        if (q.t < q.d) { keep.push(q); continue; }
        if (q.E > m.phi) {
          const ke = (q.E - m.phi) * Math.sqrt(Math.random());
          const sp = 22 + 230 * Math.sqrt(ke / 6.5);
          const a = (Math.random() - 0.5) * 2.0;
          st.el.push({ x: q.tx, y: g.plateY - 3, vx: sp * Math.sin(a), vy: -sp * Math.cos(a) });
        } else st.fl.push({ x: q.tx, y: g.plateY, a: 1 });
      }
      st.ph = keep;
      for (const e of st.el) { e.x += e.vx * dt; e.y += e.vy * dt; }
      st.el = st.el.filter((e) => e.y > g.T + 4 && e.x > g.L + 4 && e.x < g.R - 4);
      for (const f of st.fl) f.a -= dt * 2.5;
      st.fl = st.fl.filter((f) => f.a > 0);
      if (st.el.length > 300) st.el.splice(0, st.el.length - 300);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const m = METALS[p.metal];
      const wide = w >= 700;
      const sw = wide ? Math.round(w * 0.42) : w;
      const sh = wide ? h : 250;
      const L = 12, R = sw - 12, T = 12, B = sh - 12;
      const plateY = B - 52, px0 = L + 34, px1 = R - 34;
      const lx = L + 38, ly = T + 40;
      st.geo = { plateY, px0, px1, lx, ly, T, L, R };
      const E = (HEV * CL) / (p.lam * 1e-9);
      const ok = E > m.phi;

      // vacuum tube, lamp and light cone
      Sim.rect(ctx, L, T, R - L, B - T, { fill: DARK, r: 14 });
      if (p.I > 0) {
        ctx.save();
        ctx.fillStyle = lightColour(p.lam, 0.05 + 0.13 * (p.I / 100));
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(px0, plateY); ctx.lineTo(px1, plateY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const inv = p.lam < 380;
      for (const q of st.ph) {
        const k = q.t / q.d;
        const x = lx + (q.tx - lx) * k, y = ly + (plateY - ly) * k;
        packet(ctx, x, y, Math.atan2(plateY - ly, q.tx - lx), 13, 4 + q.lam * 0.014, 6, lightColour(q.lam), 2.2, q.lam < 380);
      }
      Sim.circle(ctx, lx, ly, 15, { fill: '#495057', stroke: '#868e96', width: 2 });
      Sim.circle(ctx, lx, ly, 8, { fill: p.I > 0 ? lightColour(p.lam) : '#343a40' });
      Sim.text(ctx, 'lamp', lx + 22, ly - 12, { size: 11.5, color: '#ced4da' });
      for (const f of st.fl) Sim.circle(ctx, f.x, f.y - 2, 3 + (1 - f.a) * 9, { stroke: 'rgba(255,212,59,' + f.a.toFixed(2) + ')', width: 1.5 });
      Sim.rect(ctx, px0, plateY, px1 - px0, 14, { fill: m.col, r: 3 });
      Sim.text(ctx, m.name + ' plate (φ = ' + m.phi.toFixed(1) + ' eV)', (px0 + px1) / 2, plateY + 30, { size: 12, color: '#dee2e6', align: 'center', bold: true });
      for (const e of st.el) Sim.circle(ctx, e.x, e.y, 3.8, { fill: C.sky, stroke: '#fff', width: 1 });
      const msg = p.I === 0 ? 'lamp off' : ok ? 'hf > φ: electrons emitted' : 'hf < φ: no electrons';
      Sim.text(ctx, msg, R - 14, T + 18, { size: 12.5, bold: true, color: p.I === 0 ? '#ced4da' : ok ? '#69db7c' : '#ff8787', align: 'right' });
      if (inv) Sim.text(ctx, 'UV photons drawn dashed', R - 14, T + 36, { size: 11, color: '#ced4da', align: 'right', italic: true });

      // graph of KE max against f
      const gb = wide ? { x: sw + 52, y: 36, w: w - sw - 52 - 18, h: h - 36 - 34 } : { x: 48, y: sh + 36, w: w - 48 - 16, h: h - sh - 36 - 30 };
      const g = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 20, ymin: -5, ymax: 7, xstep: 5, ystep: 2, xlabel: 'f / 10¹⁴ Hz', ylabel: 'KE max / eV', title: 'Maximum KE against frequency' }, gb)).axes();
      if (p.all) {
        Object.keys(METALS).forEach((k) => { if (k !== p.metal) metalLine(g, METALS[k].phi, 'rgba(91,101,115,0.45)', 1.6); });
        Sim.text(ctx, 'grey: the other metals, all parallel', g.x + g.w - 6, g.y + g.h - 10, { size: 11.5, color: C.muted, align: 'right', italic: true });
      }
      metalLine(g, m.phi, C.navy, 2.6);
      const f0 = m.phi / K14;
      g.dot(f0, 0, { color: C.orange, r: 5, label: 'f₀', dx: -7, dy: -11, align: 'right' });
      g.dot(0, -m.phi, { color: C.orange, r: 5, label: '−φ', dx: 8, dy: 12 });
      const fm = f0 + (20 - f0) * 0.55;
      Sim.text(ctx, 'gradient = h', g.px(fm) + 10, g.py(K14 * fm - m.phi) + 14, { size: 12, color: C.navy, bold: true });
      const f = CL / (p.lam * 1e-9) / 1e14;
      g.vline(f, { color: C.grey });
      if (ok) g.dot(f, E - m.phi, { color: C.red, r: 6 });
      else g.dot(f, 0, { color: C.grey, r: 6 });
      Sim.text(ctx, ok ? '● KE max = ' + (E - m.phi).toFixed(2) + ' eV' : '● f < f₀: no electrons', g.x + 12, g.y + 32, { size: 12.5, bold: true, color: ok ? C.red : C.muted });
    },
    readout(s) {
      const m = METALS[s.p.metal];
      const f = CL / (s.p.lam * 1e-9), E = HEV * f, f0 = m.phi / HEV;
      const ke = E - m.phi;
      const out = [['f =', Sim.fmt(f, 3) + ' Hz'], ['hf =', E.toFixed(2) + ' eV'], ['φ =', m.phi.toFixed(1) + ' eV'], ['f₀ = φ/h =', Sim.fmt(f0, 3) + ' Hz']];
      if (ke > 0) {
        const v = Math.sqrt((2 * ke * QE) / ME);
        out.push(['½mv²max = hf − φ =', ke.toFixed(2) + ' eV', true], ['v max =', Sim.fmt(v, 3) + ' m s⁻¹']);
        out.push(['electrons per second', s.p.I > 0 ? '∝ intensity' : 'none (lamp off)']);
      } else out.push(['hf < φ:', 'no photoelectrons at any intensity', true]);
      return out;
    }
  });

  /* ======================================================================
     3. Wave model vs photon model at a sodium surface
     ====================================================================== */
  const PHI_NA = 2.3;
  const elX = (x, pw, i) => x + pw * (0.12 + 0.18 * i);
  function modelPanel(ctx, x, y, pw, ph, isWave, st, p, E, nm) {
    Sim.rect(ctx, x, y, pw, ph, { fill: DARK, r: 12 });
    Sim.text(ctx, isWave ? 'WAVE MODEL: what it predicts' : 'PHOTON MODEL: what is observed', x + 14, y + 18, { size: 12.5, bold: true, color: isWave ? '#ffa94d' : '#69db7c' });
    let l1, l2;
    if (isWave) {
      l1 = 'Energy soaks in gradually, at any frequency.';
      l2 = st.firstW != null ? 'First electron escaped after ' + st.firstW.toFixed(1) + ' s.' : 'Waiting for the first electron… ' + st.t.toFixed(1) + ' s';
    } else if (E >= PHI_NA) {
      l1 = 'hf = ' + E.toFixed(2) + ' eV ≥ φ = ' + PHI_NA + ' eV';
      l2 = 'An electron escapes the instant a photon hits.';
    } else {
      l1 = 'hf = ' + E.toFixed(2) + ' eV < φ = ' + PHI_NA + ' eV';
      l2 = 'No electron can ever escape, however bright.';
    }
    Sim.text(ctx, l1, x + 14, y + 38, { size: 12, color: '#dee2e6' });
    Sim.text(ctx, l2, x + 14, y + 55, { size: 12, color: '#dee2e6', bold: true });
    const surf = y + ph - 68, lightTop = y + 66;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 2, lightTop, pw - 4, surf - lightTop);
    ctx.clip();
    if (isWave) {
      const sp = Sim.clamp(nm * 0.045, 10, 46);
      const off = (st.t * 45) % sp;
      for (let yy = lightTop - sp + off; yy < surf; yy += sp) {
        Sim.line(ctx, x + 10, yy, x + pw - 10, yy, { color: lightColour(nm), width: 1 + p.I * 0.22, alpha: 0.22 + p.I * 0.06 });
      }
    } else {
      for (const q of st.ph) {
        packet(ctx, elX(x, pw, q.i), lightTop + (surf - lightTop) * q.u, Math.PI / 2, 12, 4 + nm * 0.012, 5, lightColour(nm), 2.2, nm < 380 || nm > 750);
      }
    }
    // escaping electrons
    for (const o of isWave ? st.wOut : st.pOut) {
      const ey = surf - o.y;
      if (ey > lightTop - 10) Sim.circle(ctx, elX(x, pw, o.i) - 6, ey, 4, { fill: C.sky, stroke: '#fff', width: 1 });
    }
    ctx.restore();
    // metal and electrons with their energy bars
    Sim.rect(ctx, x + 8, surf, pw - 16, 58, { fill: '#868e96', r: 4 });
    Sim.text(ctx, 'sodium surface: bars show each electron’s energy', x + pw / 2, surf + 48, { size: 11, color: '#f8f9fa', align: 'center', bold: true });
    const row = isWave ? st.wave : st.phot;
    const bh = 32, bmax = PHI_NA / 0.7;
    row.forEach((e, i) => {
      const ex = elX(x, pw, i);
      Sim.circle(ctx, ex - 6, surf + 10, 5, { fill: C.sky, stroke: '#fff', width: 1.2 });
      const bx = ex + 4, by = surf + 6;
      Sim.rect(ctx, bx, by, 8, bh, { fill: '#495057', r: 2 });
      const fr = Sim.clamp(e.e / bmax, 0, 1);
      if (fr > 0) Sim.rect(ctx, bx, by + bh * (1 - fr), 8, bh * fr, { fill: e.e >= PHI_NA ? '#69db7c' : '#ffa94d', r: 2 });
      Sim.line(ctx, bx - 3, by + bh * 0.3, bx + 11, by + bh * 0.3, { color: '#fff', width: 1.5 });
    });
    Sim.text(ctx, 'φ', elX(x, pw, 0) - 18, surf + 6 + bh * 0.3, { size: 12, color: '#fff', bold: true, align: 'center' });
  }

  Sim.create('#sim-models', {
    title: 'Wave model vs photon model',
    height: (w) => (w >= 640 ? 330 : 610),
    controls: [
      { key: 'f', label: 'Frequency f', min: 3, max: 12, step: 0.1, value: 4.5, unit: '× 10¹⁴ Hz', format: (v) => v.toFixed(1) },
      { key: 'I', label: 'Intensity', min: 1, max: 10, step: 1, value: 5, format: (v) => v.toFixed(0) }
    ],
    animate: true,
    init(s) {
      const row = () => [0, 1, 2, 3, 4].map(() => ({ e: 0, k: 0.8 + 0.4 * Math.random() }));
      s.state = { t: 0, wave: row(), phot: row(), wOut: [], pOut: [], ph: [], acc: 0, firstW: null };
    },
    onChange(s) {
      const st = s.state;
      st.t = 0;
      st.firstW = null;
      st.wave.forEach((e) => { e.e = 0; });
    },
    update(s, dt) {
      const st = s.state;
      if (dt <= 0) return;
      st.t += dt;
      const E = HEV * s.p.f * 1e14;
      st.wave.forEach((e, i) => {
        e.e += 0.05 * s.p.I * e.k * dt; // wave model: energy arrives in proportion to intensity
        if (e.e >= PHI_NA) {
          st.wOut.push({ i, y: 0, v: 25 + 12 * s.p.I });
          e.e = 0;
          e.k = 0.8 + 0.4 * Math.random();
          if (st.firstW == null) st.firstW = st.t;
        }
      });
      st.acc += 0.6 * s.p.I * dt;
      while (st.acc >= 1) { st.acc -= 1; st.ph.push({ i: Math.floor(Math.random() * 5), u: 0, E }); }
      st.ph = st.ph.filter((q) => {
        q.u += dt / 0.55;
        if (q.u < 1) return true;
        const e = st.phot[q.i];
        e.e = Math.max(e.e, q.E);
        if (q.E >= PHI_NA) st.pOut.push({ i: q.i, y: 0, v: 25 + 75 * Math.sqrt(q.E - PHI_NA) });
        return false;
      });
      st.phot.forEach((e) => { e.e = Math.max(0, e.e - 5 * dt); }); // energy shared with the metal almost at once
      st.wOut.forEach((o) => { o.y += o.v * dt; });
      st.pOut.forEach((o) => { o.y += o.v * dt; });
      st.wOut = st.wOut.filter((o) => o.y < 400);
      st.pOut = st.pOut.filter((o) => o.y < 400);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      const gap = 12;
      const pw = wide ? (w - 3 * gap) / 2 : w - 2 * gap;
      const ph = wide ? h - 2 * gap : (h - 3 * gap) / 2;
      const E = HEV * p.f * 1e14;
      const nm = (CL / (p.f * 1e14)) * 1e9;
      modelPanel(ctx, gap, gap, pw, ph, true, s.state, p, E, nm);
      if (wide) modelPanel(ctx, 2 * gap + pw, gap, pw, ph, false, s.state, p, E, nm);
      else modelPanel(ctx, gap, 2 * gap + ph, pw, ph, false, s.state, p, E, nm);
    },
    readout(s) {
      const E = HEV * s.p.f * 1e14, st = s.state;
      return [
        ['hf =', E.toFixed(2) + ' eV'],
        ['φ (sodium) =', PHI_NA.toFixed(1) + ' eV'],
        ['threshold f₀ = φ/h =', (PHI_NA / HEV / 1e14).toFixed(2) + ' × 10¹⁴ Hz'],
        ['wave model: first electron', st.firstW != null ? 'after ' + st.firstW.toFixed(1) + ' s' : 'not yet'],
        ['photon model:', E >= PHI_NA ? 'emission is instant' : 'no emission at any intensity', true]
      ];
    }
  });

  /* ======================================================================
     4. Hydrogen energy levels and line spectra
     ====================================================================== */
  const LEVELS = [1, 2, 3, 4, 5, 6].map((n) => -13.6 / (n * n));
  LEVELS.push(0); // index 6 = ionisation limit
  const LPOS = [0, 0.46, 0.63, 0.735, 0.815, 0.875, 1]; // height up the diagram (not to scale)
  const nName = (i) => (i === 6 ? '∞' : String(i + 1));
  const eText = (E) => (E === 0 ? '0' : E < -10 ? E.toFixed(1) : E.toFixed(2)) + ' eV';
  const PICKS = { '3-2': [2, 1], '4-2': [3, 1], '5-2': [4, 1], '6-2': [5, 1], '2-1': [1, 0], '4-3': [3, 2], '1-3': [0, 2], '1-inf': [0, 6] };
  const allLines = () => {
    const out = {};
    for (let a = 1; a < 6; a++) for (let b = 0; b < a; b++) out[a + '-' + b] = (HEV * CL / (LEVELS[a] - LEVELS[b])) * 1e9;
    return out;
  };
  function finishAnim(st) {
    const a = st.anim;
    if (!a) return;
    st.cur = a.to;
    if (a.from !== 6 && a.to !== 6) {
      const hi = Math.max(a.from, a.to), lo = Math.min(a.from, a.to);
      st.lines[hi + '-' + lo] = a.nm;
    }
    st.anim = null;
  }
  function jump(s, to) {
    const st = s.state;
    finishAnim(st);
    if (to === st.cur) return;
    const from = st.cur;
    const dE = Math.abs(LEVELS[to] - LEVELS[from]);
    if (dE <= 0) return;
    st.anim = { from, to, t: 0, kind: LEVELS[to] < LEVELS[from] ? 'emit' : 'absorb', dE, nm: (HEV * CL / dE) * 1e9, moved: false };
    st.last = st.anim;
    if (!s.running) s.play();
  }
  function strip(ctx, x, y, w, h, kind, lines, hl) {
    const X = (nm) => x + ((nm - 380) / 370) * w;
    if (kind === 'emit') Sim.rect(ctx, x, y, w, h, { fill: '#000' });
    else for (let i = 0; i < w; i++) { ctx.fillStyle = Sim.spectrum(380 + (370 * i) / w); ctx.fillRect(x + i, y, 1.5, h); }
    Object.keys(lines).forEach((k) => {
      const nm = lines[k];
      if (nm < 380 || nm > 750) return;
      if (kind === 'emit') {
        Sim.rect(ctx, X(nm) - 4, y, 8, h, { fill: Sim.spectrum(nm, 0.35) });
        Sim.rect(ctx, X(nm) - 1.5, y, 3, h, { fill: Sim.spectrum(nm) });
      } else Sim.rect(ctx, X(nm) - 1.5, y, 3, h, { fill: '#000' });
    });
    Sim.rect(ctx, x, y, w, h, { stroke: '#adb5bd', width: 1 });
    if (kind === 'emit' && !Object.keys(lines).some((k) => lines[k] >= 380 && lines[k] <= 750)) {
      Sim.text(ctx, 'visible lines appear here as you make transitions', x + w / 2, y + h / 2, { size: 12, color: '#adb5bd', align: 'center', italic: true });
    }
    [400, 500, 600, 700].forEach((nm) => {
      Sim.line(ctx, X(nm), y + h, X(nm), y + h + 4, { color: C.axis, width: 1 });
      Sim.text(ctx, nm + (nm === 700 ? ' nm' : ''), X(nm), y + h + 6, { size: 11, color: C.muted, align: 'center', baseline: 'top' });
    });
    if (hl != null && hl >= 380 && hl <= 750) {
      const xx = X(hl);
      ctx.save();
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.moveTo(xx, y - 2); ctx.lineTo(xx - 6, y - 10); ctx.lineTo(xx + 6, y - 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  Sim.create('#sim-levels', {
    title: 'Hydrogen energy levels and spectra',
    height: (w) => (w >= 640 ? 380 : 580),
    controls: [
      {
        key: 'pick', type: 'select', label: 'Or choose a transition', value: '',
        options: [['', 'Click a level on the diagram…'], ['3-2', 'n = 3 → 2 (red)'], ['4-2', 'n = 4 → 2 (blue)'], ['5-2', 'n = 5 → 2 (violet)'], ['6-2', 'n = 6 → 2 (violet)'], ['2-1', 'n = 2 → 1 (ultraviolet)'], ['4-3', 'n = 4 → 3 (infrared)'], ['1-3', 'n = 1 → 3 (absorption)'], ['1-inf', 'n = 1 → ionised']],
        onChange: (s, v) => {
          const pr = PICKS[v];
          if (!pr) return;
          finishAnim(s.state);
          s.state.cur = pr[0];
          jump(s, pr[1]);
          s.set('pick', '');
        }
      },
      { key: 'all', type: 'check', label: 'Show every line from levels 1 to 6', value: false },
      { type: 'button', label: 'Clear spectra', ghost: true, onClick: (s) => { s.state.lines = {}; } }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state = { cur: 2, anim: null, last: null, lines: {}, lv: [] }; },
    update(s, dt) {
      const a = s.state.anim;
      if (!a) return;
      a.t += dt;
      const tMove = a.kind === 'emit' ? 0.45 : 1.0;
      if (a.t >= tMove && !a.moved) {
        a.moved = true;
        s.state.cur = a.to;
        if (a.from !== 6 && a.to !== 6) s.state.lines[Math.max(a.from, a.to) + '-' + Math.min(a.from, a.to)] = a.nm;
      }
      if (a.t >= 1.6) s.state.anim = null;
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 640;
      const dw = wide ? Math.round(w * 0.46) : w;
      const yb = wide ? h - 34 : 290, yt = 44;
      const lx0 = 62, lx1 = dw - 82;
      const yOf = (i) => yb - LPOS[i] * (yb - yt);
      Sim.text(ctx, 'Hydrogen energy levels (not to scale)', 14, 18, { size: 12.5, bold: true, color: C.navy });
      st.lv = LEVELS.map((E, i) => ({ i, y: yOf(i) }));
      st.hit = [lx0 - 50, lx1 + 74];
      LEVELS.forEach((E, i) => {
        const y = yOf(i);
        const isCur = st.cur === i && !(st.anim && !st.anim.moved);
        Sim.line(ctx, lx0, y, lx1, y, { color: i === 6 ? C.grey : C.navy, width: isCur ? 3.5 : 2, dash: i === 6 ? [6, 4] : null });
        Sim.text(ctx, 'n = ' + nName(i), lx0 - 8, y, { size: 12, color: C.ink, align: 'right', bold: isCur });
        Sim.text(ctx, eText(E), lx1 + 8, y, { size: 12, color: C.muted });
      });
      // the transition arrow and the photon
      const a = st.anim || st.last;
      const xe = lx0 + (lx1 - lx0) * 0.22, xa = lx0 + (lx1 - lx0) * 0.58;
      if (a) {
        const y1 = yOf(a.from), y2 = yOf(a.to), ym = (y1 + y2) / 2;
        Sim.arrow(ctx, xa, y1, xa, y2, { color: a.kind === 'emit' ? C.red : C.green, width: 2.5, alpha: st.anim ? 1 : 0.6 });
        if (st.anim) {
          const t = st.anim.t;
          const col = inkColour(a.nm), inv = a.nm < 380 || a.nm > 750;
          let px = null;
          if (a.kind === 'emit' && t > 0.45) px = xa + 14 + (t - 0.45) * 150;
          if (a.kind === 'absorb' && t < 0.6) px = lx1 + 60 - (t / 0.6) * (lx1 + 60 - xa - 14);
          if (px != null) {
            packet(ctx, px, ym, 0, 16, 4 + Math.min(a.nm, 1500) * 0.012, 7, col, 2.6, inv);
            Sim.text(ctx, a.kind === 'emit' ? 'photon emitted' : 'photon absorbed', px, ym - 16, { size: 11.5, color: col, align: 'center', bold: true, bg: 'rgba(255,255,255,0.85)' });
          }
        }
      }
      // the electron
      let ey = yOf(st.cur);
      if (st.anim && !st.anim.moved) {
        const t0 = st.anim.kind === 'emit' ? 0 : 0.6, t1 = st.anim.kind === 'emit' ? 0.45 : 1.0;
        const k = Sim.clamp((st.anim.t - t0) / (t1 - t0), 0, 1);
        const e = k * k * (3 - 2 * k);
        ey = Sim.lerp(yOf(st.anim.from), yOf(st.anim.to), e);
      }
      Sim.circle(ctx, xe, ey, 7, { fill: C.blue, stroke: '#fff', width: 2 });
      Sim.text(ctx, 'e⁻', xe - 14, ey - 11, { size: 11.5, color: C.blue, bold: true, align: 'center' });

      // spectra
      const sx = wide ? dw + 26 : 16, swd = wide ? w - dw - 26 - 18 : w - 32;
      const y0 = wide ? 30 : yb + 34;
      const L = st.last;
      if (L) {
        const ion = L.from === 6 || L.to === 6;
        const title = ion ? (L.to === 6 ? 'Ionisation from n = ' + nName(L.from) : 'Free electron captured into n = ' + nName(L.to)) : (L.kind === 'emit' ? 'Emission: n = ' : 'Absorption: n = ') + nName(L.from) + ' → ' + nName(L.to);
        Sim.text(ctx, title, sx, y0, { size: 14, bold: true, color: L.kind === 'emit' ? C.red : C.green });
        const l2 = ion ? (L.to === 6 ? 'needs at least ' : 'emits at least ') + L.dE.toFixed(2) + ' eV (λ ≤ ' + Sim.fmt(L.nm, 3) + ' nm)' : 'ΔE = ' + L.dE.toFixed(2) + ' eV, so λ = hc / ΔE = ' + Sim.fmt(L.nm, 3) + ' nm';
        wrapText(ctx, l2, sx, y0 + 22, swd, 17, { size: 13, color: C.ink });
        Sim.text(ctx, regionName(L.nm), sx, y0 + 42, { size: 13, color: inkColour(L.nm), bold: true });
      } else {
        Sim.text(ctx, 'Click any level to make the electron jump there.', sx, y0, { size: 13, color: C.muted, italic: true });
        Sim.text(ctx, 'Down = a photon is emitted. Up = one is absorbed.', sx, y0 + 20, { size: 13, color: C.muted, italic: true });
      }
      const lines = p.all ? allLines() : st.lines;
      const stripH = wide ? 40 : 32;
      const yE = y0 + (wide ? 96 : 84), yA = yE + stripH + (wide ? 62 : 54);
      const hl = L && !(L.from === 6 || L.to === 6) ? L.nm : null;
      Sim.text(ctx, 'Emission spectrum (glowing hydrogen)', sx, yE - 16, { size: 12, bold: true, color: C.navy });
      strip(ctx, sx, yE, swd, stripH, 'emit', lines, hl);
      Sim.text(ctx, 'Absorption spectrum (cool hydrogen)', sx, yA - 16, { size: 12, bold: true, color: C.navy });
      strip(ctx, sx, yA, swd, stripH, 'absorb', lines, hl);
      let nUV = 0, nIR = 0;
      Object.keys(lines).forEach((k) => { if (lines[k] < 380) nUV++; else if (lines[k] > 750) nIR++; });
      if (nUV + nIR > 0) Sim.text(ctx, 'Also found, but invisible: ' + nUV + ' ultraviolet, ' + nIR + ' infrared', sx, yA + stripH + 32, { size: 12, color: C.muted, italic: true });
    },
    readout(s) {
      const L = s.state.last;
      if (!L) return [['electron in', 'n = ' + nName(s.state.cur)], ['tip:', 'click a level to make it jump']];
      if (L.from === 6 || L.to === 6) {
        return [['transition', 'n = ' + nName(L.from) + ' → ' + nName(L.to)], [L.to === 6 ? 'ionisation energy =' : 'energy given out ≥', L.dE.toFixed(2) + ' eV = ' + Sim.fmt(L.dE * QE, 3) + ' J', true]];
      }
      return [
        ['transition', 'n = ' + nName(L.from) + ' → ' + nName(L.to)],
        [L.kind === 'emit' ? 'photon emitted: hf = ΔE =' : 'photon absorbed: hf = ΔE =', L.dE.toFixed(2) + ' eV'],
        ['ΔE =', Sim.fmt(L.dE * QE, 3) + ' J'],
        ['f = ΔE/h =', Sim.fmt((L.dE * QE) / H, 3) + ' Hz'],
        ['λ = c/f =', Sim.fmt(L.nm, 3) + ' nm', true],
        ['region:', regionName(L.nm)]
      ];
    },
    pointer: {
      touchAction: 'pan-y',
      down(s, pt) {
        const st = s.state;
        if (!st.hit || pt.x < st.hit[0] || pt.x > st.hit[1]) return;
        let best = null, bd = 11;
        st.lv.forEach((l) => { const d = Math.abs(l.y - pt.y); if (d < bd) { bd = d; best = l.i; } });
        if (best != null) jump(s, best);
      }
    }
  });

  /* ======================================================================
     5. Electron diffraction tube
     ====================================================================== */
  const L_TUBE = 0.135, D_SP = [2.13e-10, 1.23e-10], R_SCR = 0.065;
  const eLam = (V) => H / Math.sqrt(2 * ME * QE * Math.max(V, 1));
  function ringR(lam, d) {
    const x = lam / (2 * d);
    if (!(x < 0.7)) return null;
    return L_TUBE * Math.tan(2 * Math.asin(x));
  }

  Sim.create('#sim-diffraction', {
    title: 'Electron diffraction tube',
    height: (w) => (w >= 620 ? 330 : 490),
    controls: [
      { key: 'kV', label: 'Accelerating p.d. V', min: 1, max: 10, step: 0.1, value: 2, unit: 'kV', format: (v) => v.toFixed(1) },
      { key: 'particle', type: 'check', label: 'Particle-only prediction (no wave behaviour)', value: false }
    ],
    animate: true,
    init(s) { s.state = { el: [], hits: [], acc: 0 }; },
    update(s, dt) {
      const st = s.state;
      if (!st.geo || dt <= 0) return;
      st.acc += 45 * dt;
      while (st.acc >= 1) {
        st.acc -= 1;
        let ring = 0;
        if (!s.p.particle) { const r = Math.random(); ring = r < 0.5 ? 0 : r < 0.8 ? 1 : 2; }
        st.el.push({ u: 0, ring, az: Math.random() * Math.PI * 2, jit: Math.random() });
      }
      const lam = eLam(s.p.kV * 1000);
      const speed = 0.7 + 0.06 * s.p.kV;
      st.el = st.el.filter((e) => {
        e.u += dt * speed;
        if (e.u < 1) return true;
        const rr = e.ring === 0 ? 0.0016 * e.jit : ringR(lam, D_SP[e.ring - 1]) || 0;
        st.hits.push({ X: rr * Math.cos(e.az), Y: rr * Math.sin(e.az), a: 1 });
        return false;
      });
      st.hits.forEach((q) => { q.a -= dt * 1.1; });
      st.hits = st.hits.filter((q) => q.a > 0);
      if (st.hits.length > 400) st.hits.splice(0, st.hits.length - 400);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const wide = w >= 620;
      const sw = wide ? Math.round(w * 0.58) : w;
      const sh = wide ? h : 200;
      const cy = wide ? sh / 2 + 6 : sh / 2 + 8;
      const Rb = Math.min((sw - 40) * 0.28, sh / 2 - 20);
      const xs = sw - 16, xg = xs - 2 * Rb, xc = 30;
      const xa = xc + (xg - xc) * 0.45, cxb = xg + Rb;
      const pxm = (2 * Rb) / L_TUBE; // pixels per metre in the side view
      st.geo = true;
      const lam = eLam(p.kV * 1000);
      const rings = p.particle ? [] : D_SP.map((d) => ringR(lam, d)).filter((r) => r != null);

      // glass: neck and bulb
      Sim.rect(ctx, 14, cy - 20, xg - 8, 40, { fill: '#f1f3f5', stroke: '#adb5bd', width: 1.5, r: 8 });
      Sim.circle(ctx, cxb, cy, Rb, { fill: '#f1f3f5', stroke: '#adb5bd', width: 1.5 });
      Sim.rect(ctx, xg - 12, cy - 18.5, 26, 37, { fill: '#f1f3f5' });
      ctx.save();
      ctx.strokeStyle = '#8ce99a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cxb, cy, Rb - 3, -0.9, 0.9);
      ctx.stroke();
      ctx.restore();
      Sim.text(ctx, 'fluorescent screen', xs, cy - Rb - 8, { size: 11.5, color: C.green, align: 'right', bold: true });
      // cathode, anode, graphite
      Sim.spring(ctx, xc - 8, cy, xc + 8, cy, { coils: 3, width: 5, color: C.orange, lineWidth: 2, lead: 2 });
      Sim.rect(ctx, xa - 3, cy - 17, 6, 12, { fill: C.navy });
      Sim.rect(ctx, xa - 3, cy + 5, 6, 12, { fill: C.navy });
      Sim.rect(ctx, xg - 2, cy - 12, 4, 24, { fill: '#343a40' });
      Sim.text(ctx, 'cathode', xc, cy + 32, { size: 11.5, color: C.muted, align: 'center' });
      Sim.text(ctx, 'anode (+' + p.kV.toFixed(1) + ' kV)', xa, cy - 32, { size: 11.5, color: C.navy, align: 'center', bold: true });
      Sim.text(ctx, 'graphite', xg, cy + 32, { size: 11.5, color: C.ink, align: 'center', bold: true, bg: 'rgba(255,255,255,0.8)' });
      // beam and diffraction cones
      Sim.line(ctx, xc + 8, cy, xg, cy, { color: 'rgba(0,123,255,0.25)', width: 3 });
      const hitX = (yoff) => cxb + Math.sqrt(Math.max(0, (Rb - 3) * (Rb - 3) - yoff * yoff));
      rings.forEach((r) => {
        const yo = Math.min(r * pxm, Rb * 0.75);
        [-1, 1].forEach((sg) => Sim.line(ctx, xg, cy, hitX(yo), cy + sg * yo, { color: 'rgba(47,158,68,0.45)', width: 1.5, dash: [4, 4] }));
      });
      // electrons
      const ug = (xg - xc) / (xs - xc);
      for (const e of st.el) {
        let x, y;
        if (e.u < ug) { x = xc + (xg - xc) * (e.u / ug); y = cy + (e.jit - 0.5) * 3; }
        else {
          const rr = e.ring === 0 ? 0.0016 * e.jit : ringR(lam, D_SP[e.ring - 1]) || 0;
          const yo = Math.min(rr * pxm, Rb * 0.75) * Math.cos(e.az);
          const k = (e.u - ug) / (1 - ug);
          x = xg + (hitX(yo) - xg) * k;
          y = cy + yo * k;
        }
        Sim.circle(ctx, x, y, 2.4, { fill: C.blue });
      }

      // front view of the screen
      const fcx = wide ? sw + (w - sw) / 2 : w / 2;
      const fcy = wide ? h / 2 + 6 : sh + (h - sh) / 2 + 2;
      const Rf = wide ? Math.min((w - sw) / 2 - 18, h / 2 - 36) : Math.min(w / 2 - 20, (h - sh) / 2 - 32);
      const k = Rf / R_SCR;
      Sim.text(ctx, 'What you see on the screen', fcx, fcy - Rf - 14, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      Sim.circle(ctx, fcx, fcy, Rf, { fill: '#0d1f14', stroke: '#495057', width: 2 });
      ctx.save();
      ctx.beginPath();
      ctx.arc(fcx, fcy, Rf - 1, 0, Math.PI * 2);
      ctx.clip();
      rings.forEach((r, i) => {
        Sim.circle(ctx, fcx, fcy, r * k, { stroke: 'rgba(140,233,154,0.16)', width: 12 });
        Sim.circle(ctx, fcx, fcy, r * k, { stroke: 'rgba(140,233,154,' + (i === 0 ? 0.85 : 0.6) + ')', width: 3 });
      });
      for (const q of st.hits) Sim.circle(ctx, fcx + q.X * k, fcy + q.Y * k, 1.6, { fill: 'rgba(216,245,162,' + q.a.toFixed(2) + ')' });
      Sim.circle(ctx, fcx, fcy, 9, { fill: 'rgba(216,245,162,0.35)' });
      Sim.circle(ctx, fcx, fcy, 4.5, { fill: '#d8f5a2' });
      ctx.restore();
      const note = p.particle ? 'Particles only: a single spot, no rings' : 'Rings: radius about ' + rings.map((r) => (r * 1000).toFixed(0)).join(' mm and ') + ' mm';
      Sim.text(ctx, note, fcx, fcy + Rf + 16, { size: 12, color: C.ink, align: 'center' });
    },
    readout(s) {
      const V = s.p.kV * 1000;
      const lam = eLam(V);
      const mom = Math.sqrt(2 * ME * QE * V);
      return [
        ['KE = eV =', Sim.fmt(QE * V, 3) + ' J'],
        ['v =', Sim.fmt(mom / ME, 3) + ' m s⁻¹'],
        ['p = √(2meV) =', Sim.fmt(mom, 3) + ' kg m s⁻¹'],
        ['λ = h/p =', Sim.fmt(lam, 3) + ' m', true],
        ['compare atom spacing in graphite:', '≈ 1–2 × 10⁻¹⁰ m']
      ];
    }
  });

  /* The shared .tag style is nowrap, so the long derivation badge overflows on phones. */
  const wrapTags = () => document.querySelectorAll('.derive-head .tag').forEach((t) => { t.style.whiteSpace = 'normal'; });
  wrapTags();
  document.addEventListener('DOMContentLoaded', wrapTags);
})();
