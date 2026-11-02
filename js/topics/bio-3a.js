/* Biology 3a: Cell structure — interactive diagrams
   1. Magnification = image size ÷ actual size (replaces the old inline slider)
   2. Calibrating an eyepiece graticule with a stage micrometer, then measuring a cell */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const NB = ' ';

  /* 10000 -> "10 000" (the page writes ×10 000) */
  function group(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
  function num(v) { return Math.abs(v) >= 1000 ? group(v) : String(+v.toFixed(3)); }
  function fmtMag(m) { return '×' + (m >= 100 ? group(m) : Sim.fmt(m, 3)); }
  function fmtUm(um) { return um < 1 ? group(um * 1000) + ' nm' : num(um) + ' µm'; }

  function wrapLines(ctx, str, maxW, o) {
    const words = String(str).split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, t, o) > maxW) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  /* Wrapped text from (x, y) downwards; returns the y below the last line. */
  function para(ctx, str, x, y, maxW, o) {
    o = Object.assign({ size: 13 }, o || {});
    const lh = Math.round(o.size * 1.38);
    const lines = wrapLines(ctx, str, maxW, o);
    lines.forEach((ln, i) => Sim.text(ctx, ln, x, y + i * lh, Object.assign({}, o, { baseline: 'top' })));
    return y + lines.length * lh;
  }
  function ell(ctx, x, y, rx, ry, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), o.rot || 0, 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }
  /* Smooth closed blob through points at angles i/n·2π with radius r·f[i]. */
  const CHEEK = [1, 0.93, 0.97, 0.9, 0.96, 0.99, 1, 0.94, 0.9, 0.97, 0.95, 0.92];
  function blob(ctx, cx, cy, r, f, o) {
    const n = f.length;
    const pt = (i) => { const a = (i / n) * Math.PI * 2; const k = f[(i + n) % n]; return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.86]; };
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = pt(i), b = pt(i + 1);
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my); else ctx.quadraticCurveTo(a[0], a[1], mx, my);
    }
    ctx.closePath();
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; ctx.stroke(); }
    ctx.restore();
  }
  const frac = (v) => v - Math.floor(v);

  /* ======================================================================
     1. Magnification = image size ÷ actual size
     ====================================================================== */
  const SPEC = {
    mito: { name: 'Mitochondrion', um: 2, dim: 'length', a: 'a mitochondrion' },
    bact: { name: 'Rod-shaped bacterium', um: 3, dim: 'length', a: 'a bacterium' },
    rbc: { name: 'Red blood cell', um: 7.5, dim: 'diameter', a: 'a red blood cell' },
    nuc: { name: 'Nucleus', um: 10, dim: 'diameter', a: 'a nucleus' },
    cheek: { name: 'Human cheek cell', um: 60, dim: 'width', a: 'a cheek cell' },
    ribo: { name: 'Ribosome', um: 0.025, dim: 'width', a: 'a ribosome' }
  };
  const SPEC_OPTS = [
    ['mito', 'Mitochondrion (2 µm long)'],
    ['bact', 'Rod-shaped bacterium (3 µm long)'],
    ['rbc', 'Red blood cell (7.5 µm across)'],
    ['nuc', 'Nucleus (10 µm across)'],
    ['cheek', 'Human cheek cell (60 µm across)'],
    ['ribo', 'Ribosome (25 nm across)']
  ];

  /* Draws the specimen with its left edge at x0, spanning Lp pixels; returns its height in px. */
  function drawSpecimen(ctx, kind, x0, cy, Lp) {
    const cx = x0 + Lp / 2;
    if (kind === 'mito') {
      const rx = Lp / 2, ry = Lp * 0.2;
      ell(ctx, cx, cy, rx, ry, { fill: '#ffe8cc', stroke: '#d9480f', width: clamp(Lp / 70, 1, 2.5) });
      if (Lp > 24) {
        const d = clamp(Lp * 0.025, 2, 5);
        const irx = rx - d, iry = ry - d;
        ell(ctx, cx, cy, irx, iry, { fill: '#fff4e6', stroke: '#e8590c', width: clamp(Lp / 90, 1, 2) });
        const n = clamp(Math.round(Lp / 16), 3, 9);
        for (let i = 0; i < n; i++) {
          const x = cx - irx * 0.78 + (i * 1.56 * irx) / (n - 1);
          const yEdge = iry * Math.sqrt(Math.max(0, 1 - Math.pow((x - cx) / irx, 2)));
          const top = i % 2 === 0;
          Sim.line(ctx, x, top ? cy - yEdge : cy + yEdge, x, top ? cy + iry * 0.3 : cy - iry * 0.3, { color: '#e8590c', width: clamp(Lp / 45, 1.2, 3.5) });
        }
      }
      return 2 * ry;
    }
    if (kind === 'bact') {
      const hh = Lp / 3;
      Sim.rect(ctx, x0, cy - hh / 2, Lp, hh, { r: hh / 2, fill: '#e6fcf5', stroke: '#087f5b', width: clamp(Lp / 45, 1, 3.5) });
      if (Lp > 30) {
        ctx.save();
        ctx.strokeStyle = '#7048e8';
        ctx.lineWidth = clamp(Lp / 120, 1, 2);
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * Math.PI * 2, r = 1 + 0.14 * Math.sin(a * 7);
          const X = cx + Math.cos(a) * Lp * 0.17 * r, Y = cy + Math.sin(a) * hh * 0.22 * r;
          if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.stroke();
        ctx.restore();
        for (let i = 0; i < 16; i++) {
          const u = frac(i * 0.618 + 0.05), v = frac(i * 0.382 + 0.31);
          const x = x0 + hh * 0.5 + u * (Lp - hh), y = cy + (v - 0.5) * hh * 0.62;
          if (Math.abs(x - cx) < Lp * 0.2 && Math.abs(y - cy) < hh * 0.25) continue;
          Sim.circle(ctx, x, y, clamp(Lp / 160, 0.8, 2.2), { fill: '#495057' });
        }
      }
      return hh;
    }
    if (kind === 'rbc') {
      Sim.circle(ctx, cx, cy, Lp / 2, { fill: '#ff8787', stroke: '#c92a2a', width: clamp(Lp / 80, 1, 2.5) });
      Sim.circle(ctx, cx, cy, Lp * 0.22, { fill: '#ffa8a8' });
      return Lp;
    }
    if (kind === 'nuc') {
      const r = Lp / 2, d = clamp(Lp * 0.025, 1.5, 4);
      Sim.circle(ctx, cx, cy, r, { fill: '#e5dbff', stroke: '#5f3dc4', width: clamp(Lp / 110, 1, 2.2) });
      if (Lp > 26) {
        Sim.circle(ctx, cx, cy, r - d, { stroke: '#5f3dc4', width: clamp(Lp / 140, 0.8, 1.8) });
        for (let i = 0; i < 10; i++) {   // nuclear pores: gaps in the double membrane
          const a = (i / 10) * Math.PI * 2 + 0.2;
          Sim.line(ctx, cx + Math.cos(a) * (r + 1.5), cy + Math.sin(a) * (r + 1.5), cx + Math.cos(a) * (r - d - 1.5), cy + Math.sin(a) * (r - d - 1.5), { color: '#e5dbff', width: clamp(Lp / 70, 2, 5), cap: 'butt' });
        }
        for (let i = 0; i < 22; i++) {   // chromatin
          const a = frac(i * 0.618) * Math.PI * 2, rr = Math.sqrt(frac(i * 0.414 + 0.2)) * r * 0.78;
          Sim.circle(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, clamp(Lp / 90, 0.8, 3), { fill: 'rgba(95,61,196,0.45)' });
        }
      }
      Sim.circle(ctx, cx + r * 0.18, cy - r * 0.12, r * 0.26, { fill: '#5f3dc4' });
      return Lp;
    }
    if (kind === 'cheek') {
      const r = Lp / 2;
      blob(ctx, cx, cy, r, CHEEK, { fill: '#fff0f6', stroke: '#d6336c', width: clamp(Lp / 110, 1, 2.2) });
      Sim.circle(ctx, cx - r * 0.12, cy + r * 0.05, r * 0.17, { fill: '#e599f7', stroke: '#862e9c', width: 1.2 });
      return Lp * 0.86;
    }
    // ribosome: large and small subunit, Lp across
    ell(ctx, cx, cy + Lp * 0.12, Lp / 2, Lp * 0.28, { fill: '#ffd8a8', stroke: '#e67700', width: clamp(Lp / 90, 1, 2.2) });
    ell(ctx, cx - Lp * 0.04, cy - Lp * 0.22, Lp * 0.36, Lp * 0.2, { fill: '#ffc078', stroke: '#e67700', width: clamp(Lp / 90, 1, 2.2) });
    return Lp * 0.84;
  }

  function pickBar(um) {
    const nice = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
    let b = nice[0];
    nice.forEach((v) => { if (v <= um * 0.5 + 1e-12) b = v; });
    return b;
  }
  function verdict(sp, mag) {
    if (sp.um < 0.2) return { light: false, short: 'electron microscope', head: 'Electron microscope needed', text: sp.name + 's (about 25 nm) are smaller than the resolution of a light microscope (about 200 nm), so no magnification of a light image could show one.' };
    if (mag <= 1500) return { light: true, short: 'light microscope is enough', head: 'A light microscope is enough', text: fmtMag(mag) + ' is within its useful range (up to about ×1500).' };
    return { light: false, short: 'electron microscope', head: 'Electron microscope needed', text: 'Beyond about ×1500 a light microscope only enlarges a blurred image.' };
  }

  function magLayout(w) {
    const wide = w >= 640;
    const k = wide ? clamp((w * 0.5 - 50) / 100, 2, 2.6) : clamp((w - 50) / 100, 2, 2.6);
    const x0 = wide ? 28 : Math.round((w - 100 * k) / 2);
    const top = 34;
    const frameH = 100 * k + 30;
    const base = top + frameH;
    return {
      wide, k, x0, top, frameH, base,
      px: wide ? x0 + 100 * k + 44 : 16,
      py: wide ? 22 : base + 84,
      pw: wide ? w - (x0 + 100 * k + 44) - 18 : w - 32
    };
  }

  function drawLogBar(ctx, x, y, wd, mag) {
    const X = (m) => x + (Math.log10(clamp(m, 1, 1e7)) / 7) * wd;
    Sim.rect(ctx, x, y, X(1500) - x, 14, { fill: 'rgba(47,158,68,0.25)' });
    Sim.rect(ctx, X(1500), y, x + wd - X(1500), 14, { fill: 'rgba(112,72,232,0.22)' });
    Sim.text(ctx, 'light: up to ×1500', x, y - 9, { size: 11.5, color: '#2b8a3e', bold: true });
    Sim.text(ctx, 'electron microscope', x + wd, y - 9, { size: 11.5, color: '#5f3dc4', bold: true, align: 'right' });
    for (let e = 0; e <= 7; e++) {
      const X0 = x + (e / 7) * wd;
      Sim.line(ctx, X0, y + 14, X0, y + 19, { color: C.axis, width: 1 });
      const lab = e === 0 ? '×1' : e === 1 ? '×10' : e === 2 ? '×100' : '×10' + Sim.sup(e);
      Sim.text(ctx, lab, X0, y + 21, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
    }
    const mx = X(mag);
    Sim.line(ctx, mx, y - 2, mx, y + 16, { color: C.navy, width: 2.5 });
    ctx.save();
    ctx.fillStyle = C.navy;
    ctx.beginPath();
    ctx.moveTo(mx, y - 2); ctx.lineTo(mx - 6, y - 10); ctx.lineTo(mx + 6, y - 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  Sim.create('#sim-bio-3a-magnification', {
    title: 'Magnification = image size ÷ actual size',
    alt: 'A specimen drawn against a millimetre ruler at a chosen image size, with the magnification worked out and the type of microscope needed',
    height: (w) => { const L = magLayout(w); return L.wide ? L.base + 76 : L.base + 84 + 290; },
    controls: [
      { key: 'spec', type: 'select', label: 'Specimen', value: 'mito', options: SPEC_OPTS },
      { key: 'img', label: 'Length in the image', min: 1, max: 100, step: 1, value: 20, unit: 'mm', format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, p } = s;
      const L = magLayout(w);
      const sp = SPEC[p.spec];
      const mag = (p.img * 1000) / sp.um;
      const Lp = p.img * L.k;
      const cy = L.top + 22 + (L.frameH - 22) / 2;

      /* the image, drawn on a mm ruler */
      Sim.rect(ctx, L.x0 - 14, L.top - 4, 100 * L.k + 28, L.frameH + 4, { fill: '#f8f9fa', r: 8 });
      Sim.text(ctx, sp.name + ': actual ' + sp.dim + ' ' + fmtUm(sp.um), L.x0 - 12, 16, { size: 13.5, bold: true, color: C.navy });
      const hgt = drawSpecimen(ctx, p.spec, L.x0, cy, Lp);
      // dimension line for the image size
      const dy = Math.max(L.top + 12, cy - hgt / 2 - 12);
      Sim.line(ctx, L.x0, dy - 6, L.x0, dy + 6, { color: C.blue, width: 1.5 });
      Sim.line(ctx, L.x0 + Lp, dy - 6, L.x0 + Lp, dy + 6, { color: C.blue, width: 1.5 });
      if (Lp > 22) {
        Sim.arrow(ctx, L.x0 + Lp / 2, dy, L.x0 + 1, dy, { color: C.blue, width: 1.5, head: 7 });
        Sim.arrow(ctx, L.x0 + Lp / 2, dy, L.x0 + Lp - 1, dy, { color: C.blue, width: 1.5, head: 7 });
      } else Sim.line(ctx, L.x0, dy, L.x0 + Lp, dy, { color: C.blue, width: 1.5 });
      const lab = 'image ' + p.img.toFixed(0) + ' mm';
      if (Lp > Sim.measure(ctx, lab, { size: 12, bold: true }) + 16) Sim.text(ctx, lab, L.x0 + Lp / 2, dy - 9, { size: 12, bold: true, color: C.blue, align: 'center', bg: 'rgba(248,249,250,0.9)', pad: 2 });
      else Sim.text(ctx, lab, L.x0 + Lp + 8, dy, { size: 12, bold: true, color: C.blue });

      // ruler
      const ry = L.base + 10;
      Sim.rect(ctx, L.x0, ry - 4, Lp, 4, { fill: 'rgba(0,123,255,0.35)' });
      Sim.line(ctx, L.x0, ry, L.x0 + 100 * L.k, ry, { color: C.axis, width: 1.5 });
      const labStep = L.k < 2.4 ? 20 : 10;
      for (let mm = 0; mm <= 100; mm++) {
        const x = L.x0 + mm * L.k;
        const tl = mm % 10 === 0 ? 9 : mm % 5 === 0 ? 6 : 3.5;
        Sim.line(ctx, x, ry, x, ry + tl, { color: C.axis, width: 1, cap: 'butt' });
        if (mm % labStep === 0) Sim.text(ctx, String(mm), x, ry + 11, { size: 10.5, color: C.muted, align: 'center', baseline: 'top' });
      }
      Sim.text(ctx, 'mm', L.x0 + 100 * L.k + 4, ry + 3, { size: 10.5, color: C.muted, baseline: 'top' });

      // scale bar, as printed on a micrograph
      const barUm = pickBar(sp.um);
      const barPx = Math.max(2, (barUm / sp.um) * Lp);
      const sy = L.base + 52;
      Sim.rect(ctx, L.x0, sy - 3, barPx, 6, { fill: C.ink });
      const barMm = (barUm * mag) / 1000;
      Sim.text(ctx, 'scale bar ' + fmtUm(barUm) + ' = ' + (barMm >= 1000 ? group(barMm) : String(+barMm.toPrecision(3))) + ' mm in this image', L.x0 + barPx + 8, sy, { size: 12, color: C.ink });

      /* the working */
      const x = L.px;
      let y = L.py;
      const big = L.pw >= 330 ? 14 : 13;
      Sim.text(ctx, 'magnification = image size ÷ actual size', x, y, { size: big, bold: true, color: C.navy, baseline: 'top' });
      y += 23;
      Sim.text(ctx, '= ' + p.img.toFixed(0) + ' mm ÷ ' + fmtUm(sp.um), x + 8, y, { size: 13.5, baseline: 'top' });
      y += 21;
      Sim.text(ctx, '= ' + group(p.img * 1000) + ' µm ÷ ' + num(sp.um) + ' µm', x + 8, y, { size: 13.5, baseline: 'top' });
      Sim.text(ctx, '(same units first)', x + 8 + Sim.measure(ctx, '= ' + group(p.img * 1000) + ' µm ÷ ' + num(sp.um) + ' µm', { size: 13.5 }) + 8, y + 1, { size: 11.5, italic: true, color: C.muted, baseline: 'top' });
      y += 22;
      Sim.text(ctx, '= ' + fmtMag(mag), x + 8, y, { size: 19, bold: true, color: C.blue, baseline: 'top' });
      y += 36;
      const v = verdict(sp, mag);
      const tw = L.pw - 20;
      const lines = wrapLines(ctx, v.text, tw, { size: 13 });
      const bh = lines.length * 18 + 34;
      const vcol = v.light ? '#2b8a3e' : '#5f3dc4';
      Sim.rect(ctx, x, y, L.pw, bh, { fill: v.light ? 'rgba(47,158,68,0.12)' : 'rgba(112,72,232,0.12)', stroke: v.light ? '#2f9e44' : '#7048e8', width: 1.5, r: 8 });
      Sim.text(ctx, v.head, x + 10, y + 8, { size: 13.5, bold: true, baseline: 'top', color: vcol });
      lines.forEach((ln, i) => Sim.text(ctx, ln, x + 10, y + 28 + i * 18, { size: 13, baseline: 'top', color: vcol }));
      y += bh + 32;
      drawLogBar(ctx, x + 4, y, L.pw - 12, mag);
    },
    readout(s) {
      const p = s.p, sp = SPEC[p.spec];
      const mag = (p.img * 1000) / sp.um;
      return [
        ['actual ' + sp.dim + ':', fmtUm(sp.um)],
        ['image ' + sp.dim + ':', p.img.toFixed(0) + ' mm = ' + group(p.img * 1000) + ' µm'],
        ['magnification:', fmtMag(mag), true],
        ['needs:', verdict(sp, mag).short]
      ];
    }
  });

  /* ======================================================================
     2. Eyepiece graticule and stage micrometer
     ====================================================================== */
  const MIC = '#1c4fa0';
  const GSPEC = {
    cheek: { name: 'a human cheek cell', um: 60 },
    onion: { name: 'an onion epidermis cell', um: 200 },
    rbc: { name: 'a red blood cell', um: 7.5 }
  };
  const kOf = (obj) => 100 / obj;  // µm per eyepiece division, ×10 eyepiece with a 100-division graticule
  const START = { cal: 21.7, meas: 14.3 };  // where each slide sits after the objective is changed (eyepiece divisions)

  function gLayout(w) {
    const wide = w >= 700;
    const D = wide ? 380 : Math.min(w - 20, 420);
    const cx = wide ? 16 + D / 2 : w / 2;
    const cy = 14 + D / 2;
    return {
      wide, D, cx, cy, G: D * 0.84,
      px: wide ? 16 + D + 30 : 18,
      py: wide ? 30 : 14 + D + 22,
      pw: wide ? w - (16 + D + 30) - 20 : w - 36
    };
  }
  /* Position of the slide's zero (micrometer 0 line or the specimen's left edge), in eyepiece divisions from the graticule 0. */
  const zeroOf = (s) => 50 + s.state.pos[s.p.mode] / kOf(+s.p.obj);
  const objLen = (s) => (s.p.mode === 'cal' ? 1000 : GSPEC[s.p.spec].um) / kOf(+s.p.obj);
  function setZero(s, z) {
    const k = kOf(+s.p.obj);
    z = clamp(z, -objLen(s) + 3, 97);
    if (Math.abs(z) < 0.6) z = 0;   // snap onto the graticule zero
    s.state.pos[s.p.mode] = (z - 50) * k;
    if (s.p.mode === 'cal' && z === 0) s.state.calDone[s.p.obj] = true;
  }
  function calInfo(s) {
    const k = kOf(+s.p.obj);
    const z = zeroOf(s);
    const aligned = Math.abs(z) < 1e-6;
    let N = 0, M = 0;
    if (aligned) {
      for (let j = 1; j <= 100; j++) {
        const e = (j * 10) / k;
        if (e > 100 + 1e-9) break;
        if (Math.abs(e - Math.round(e)) < 1e-6) { N = Math.round(e); M = j * 10; }
      }
    }
    return { k, z, aligned, N, M };
  }
  function measInfo(s) {
    const k = kOf(+s.p.obj);
    const z = zeroOf(s);
    const sp = GSPEC[s.p.spec];
    const span = sp.um / k;
    const read = Math.round(span * 2) / 2;
    return { k, z, aligned: Math.abs(z) < 1e-6, span, read, len: read * k, tooBig: span > 100, tooSmall: span < 5, sp };
  }

  function drawGraticule(ctx, gx0, ppe, y) {
    Sim.line(ctx, gx0, y, gx0 + 100 * ppe, y, { color: '#111', width: 1.2, cap: 'butt' });
    for (let i = 0; i <= 100; i++) {
      const x = gx0 + i * ppe;
      const tl = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
      Sim.line(ctx, x, y - tl, x, y, { color: '#111', width: 1, cap: 'butt' });
      if (i % 10 === 0) Sim.text(ctx, String(i), x, y - 18, { size: 10.5, color: '#111', bold: true, align: 'center', baseline: 'bottom' });
    }
  }
  function drawMicrometer(ctx, X, z, k, ppe, y, lw) {
    const len = 1000 / k;
    Sim.rect(ctx, X(z) - 6, y - 3, len * ppe + 12, 42, { fill: 'rgba(77,171,247,0.12)' });
    Sim.line(ctx, X(z), y, X(z + len), y, { color: MIC, width: lw, cap: 'butt' });
    const minorPx = (10 / k) * ppe;
    const labStep = [100, 200, 500, 1000].find((v) => (v / k) * ppe >= 30) || 1000;
    for (let j = 0; j <= 100; j++) {
      const um = j * 10;
      const isMaj = um % 100 === 0, isMid = um % 50 === 0;
      if (!isMaj && !isMid && minorPx < 2.5) continue;
      if (!isMaj && minorPx * 5 < 2.5) continue;
      const x = X(z + um / k);
      Sim.line(ctx, x, y, x, y + (isMaj ? 18 : isMid ? 12 : 8), { color: MIC, width: lw, cap: 'butt' });
      if (um % labStep === 0) Sim.text(ctx, String(um), x, y + 21, { size: 10.5, color: MIC, bold: true, align: 'center', baseline: 'top' });
    }
    Sim.text(ctx, 'stage scale in µm', Math.max(X(z), X(-5)) + 4, y + 47, { size: 11, italic: true, color: MIC, baseline: 'top' });
  }
  function drawGSpec(ctx, kind, xL, cy, spu) {
    if (kind === 'cheek') {
      const W = 60 * spu;
      blob(ctx, xL + W / 2, cy, W / 2, CHEEK, { fill: 'rgba(214,51,108,0.16)', stroke: '#c2255c', width: clamp(spu * 0.6, 1, 2.5) });
      Sim.circle(ctx, xL + W * 0.44, cy + W * 0.03, Math.max(1, W * 0.085), { fill: 'rgba(134,46,156,0.55)' });
      return;
    }
    if (kind === 'onion') {
      const W = 200 * spu, H = 50 * spu, lw = clamp(spu * 2.5, 1, 4);
      const cell = (x, y, strong) => Sim.rect(ctx, x, y - H / 2, W, H, { fill: strong ? 'rgba(130,201,30,0.16)' : 'rgba(130,201,30,0.07)', stroke: strong ? '#5c940d' : 'rgba(92,148,13,0.55)', width: lw });
      [-1, 1].forEach((row) => [-1.5, -0.5, 0.5, 1.5].forEach((c) => cell(xL + c * W, cy + row * H, false)));
      cell(xL - W, cy, false);
      cell(xL + W, cy, false);
      cell(xL, cy, true);
      ell(ctx, xL + W * 0.3, cy + H * 0.08, Math.max(1, 10 * spu), Math.max(1, 7 * spu), { fill: 'rgba(92,148,13,0.45)' });
      return;
    }
    const r = Math.max(1, 3.75 * spu);
    Sim.circle(ctx, xL + r, cy, r, { fill: 'rgba(224,49,49,0.55)', stroke: '#c92a2a', width: clamp(spu * 0.3, 0.8, 2) });
    Sim.circle(ctx, xL + r, cy, r * 0.42, { fill: 'rgba(255,168,168,0.8)' });
  }

  function panelLines(s) {
    const p = s.p, obj = +p.obj, tot = obj * 10;
    const out = [];
    if (p.mode === 'cal') {
      const c = calInfo(s);
      out.push({ t: 'Calibrating at ×' + obj + ' (×' + tot + ' in total)', title: true });
      out.push({ t: 'Stage micrometer: 1 mm split into 100 divisions, so 1 division = 10 µm.', c: C.muted });
      if (!c.aligned) {
        out.push({ t: '1. Drag the blue stage scale until its 0 sits exactly on the eyepiece 0.', c: C.blue, b: true });
        out.push({ t: '2. Find a point further along where the two scales match exactly.', c: C.muted });
        out.push({ t: '3. One eyepiece division = stage length ÷ number of eyepiece divisions.', c: C.muted });
      } else {
        out.push({ t: '1. ✓ The zero lines are lined up.', c: '#2b8a3e' });
        out.push({ t: '2. The scales match again at eyepiece division ' + c.N + (p.work ? ', which is ' + c.M + ' µm on the stage.' : ' (green line). Read the stage scale there.'), c: C.blue, b: true });
        out.push(p.work
          ? { t: '3. One eyepiece division = ' + c.M + ' µm ÷ ' + c.N + ' = ' + num(c.k) + ' µm at this magnification.', c: C.navy, b: true }
          : { t: '3. Work out the length of one eyepiece division. Tick “Show the calculation” to check.', c: C.muted });
        out.push({ t: 'Use the furthest matching point you can: the reading error is shared over more divisions.', c: C.muted, i: true });
      }
    } else {
      const m = measInfo(s);
      out.push({ t: 'Measuring ' + m.sp.name + ' at ×' + obj + ' (×' + tot + ')', title: true });
      out.push(m.aligned ? { t: '1. ✓ Its left edge is on the eyepiece 0.', c: '#2b8a3e' } : { t: '1. Drag the slide so the left edge of the cell sits on the eyepiece 0.', c: C.blue, b: true });
      if (m.tooBig) out.push({ t: '2. It runs past the end of the scale: change to a lower-power objective.', c: C.orange, b: true });
      else {
        out.push({ t: '2. Count the eyepiece divisions across it' + (m.aligned && p.work ? ': about ' + num(m.read) + '.' : '.'), c: m.aligned ? C.blue : C.muted, b: m.aligned });
        out.push(m.aligned && p.work
          ? { t: '3. Length = ' + num(m.read) + ' × ' + num(m.k) + ' µm = ' + num(m.len) + ' µm.', c: C.navy, b: true }
          : { t: '3. Multiply by the length of one eyepiece division at this objective.', c: C.muted });
        if (m.tooSmall) out.push({ t: 'It covers only a few divisions, so the reading is imprecise: try a higher-power objective.', c: '#b35c00' });
      }
      if (!s.state.calDone[p.obj]) out.push({ t: 'You have not calibrated the ×' + obj + ' objective yet: put the stage micrometer on the stage first.', c: '#b35c00', i: true });
    }
    return out;
  }

  Sim.create('#sim-bio-3a-graticule', {
    title: 'Calibrating an eyepiece graticule',
    alt: 'The view down a microscope: an eyepiece graticule scale over a stage micrometer or a cell, which can be dragged to line up the scales',
    height: (w) => { const L = gLayout(w); return L.wide ? 14 + L.D + 16 : L.py + 250; },
    controls: [
      { key: 'obj', type: 'select', label: 'Objective lens (eyepiece ×10)', value: '40', options: [['4', '×4'], ['10', '×10'], ['40', '×40'], ['100', '×100']],
        onChange: (s) => {
          const k = kOf(+s.p.obj);
          s.state.pos.cal = (START.cal - 50) * k;
          s.state.pos.meas = (START.meas - 50) * k;
        } },
      { key: 'mode', type: 'select', label: 'On the stage', value: 'cal', options: [['cal', 'Stage micrometer (calibrate)'], ['meas', 'A cell (measure)']] },
      { key: 'spec', type: 'select', label: 'Cell to measure', value: 'cheek', options: [['cheek', 'Human cheek cell'], ['onion', 'Onion epidermis cell'], ['rbc', 'Red blood cell']],
        onChange: (s) => { if (s.p.mode !== 'meas') s.set('mode', 'meas'); } },
      { key: 'work', type: 'check', label: 'Show the calculation', value: false },
      { type: 'button', label: 'Line up the zero', ghost: true, onClick: (s) => setZero(s, 0) }
    ],
    init(s) {
      const k = kOf(40);
      s.state = { pos: { cal: (START.cal - 50) * k, meas: (START.meas - 50) * k }, calDone: {}, drag: null, rawZ: 0 };
    },
    pointer: {
      touchAction: 'pan-y',
      cursor: 'grab',
      down(s, pt) {
        const L = gLayout(s.w);
        if (Math.hypot(pt.x - L.cx, pt.y - L.cy) > L.D / 2) return;
        s.state.drag = pt.x;
        s.state.rawZ = zeroOf(s);
        s.canvas.style.cursor = 'grabbing';
      },
      move(s, pt) {
        const st = s.state;
        if (!pt.down || st.drag == null) return;
        const L = gLayout(s.w);
        st.rawZ += (pt.x - st.drag) / (L.G / 100);
        st.drag = pt.x;
        setZero(s, st.rawZ);
      },
      up(s) { s.state.drag = null; s.canvas.style.cursor = 'grab'; }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const L = gLayout(w);
      const obj = +p.obj, k = kOf(obj);
      const ppe = L.G / 100, spu = ppe / k;
      const gx0 = L.cx - L.G / 2;
      const X = (e) => gx0 + e * ppe;
      const z = zeroOf(s);

      Sim.rect(ctx, L.cx - L.D / 2 - 6, L.cy - L.D / 2 - 6, L.D + 12, L.D + 12, { fill: '#212529', r: 16 });
      Sim.circle(ctx, L.cx, L.cy, L.D / 2, { fill: '#fdfbf2' });
      ctx.save();
      ctx.beginPath();
      ctx.arc(L.cx, L.cy, L.D / 2, 0, Math.PI * 2);
      ctx.clip();
      if (p.mode === 'cal') {
        drawMicrometer(ctx, X, z, k, ppe, L.cy + 3, clamp(spu, 1, 3));
        const c = calInfo(s);
        if (c.aligned) {
          [0, c.N].forEach((e) => Sim.line(ctx, X(e), L.cy - 22, X(e), L.cy + 26, { color: 'rgba(47,158,68,0.85)', width: 3 }));
        }
      } else {
        drawGSpec(ctx, p.spec, X(z), L.cy, spu);
        const m = measInfo(s);
        if (m.aligned) Sim.line(ctx, X(0), L.cy - 22, X(0), L.cy + 22, { color: 'rgba(47,158,68,0.85)', width: 2.5 });
        if (m.aligned && p.work && !m.tooBig) Sim.line(ctx, X(m.span), L.cy - 22, X(m.span), L.cy + 22, { color: 'rgba(47,158,68,0.85)', width: 2.5 });
      }
      drawGraticule(ctx, gx0, ppe, L.cy);
      ctx.restore();
      Sim.text(ctx, 'drag to move the slide', L.cx, L.cy + L.D / 2 - 18, { size: 11.5, italic: true, color: C.muted, align: 'center' });
      Sim.text(ctx, '×' + obj + ' objective', L.cx, L.cy - L.D / 2 + 22, { size: 12, bold: true, color: C.navy, align: 'center' });

      /* steps panel */
      let y = L.py;
      panelLines(s).forEach((ln) => {
        const o = ln.title ? { size: 14.5, bold: true, color: C.navy } : { size: 13, bold: !!ln.b, italic: !!ln.i, color: ln.c || C.ink };
        y = para(ctx, ln.t, L.px, y, L.pw, o) + (ln.title ? 6 : 5);
      });
    },
    readout(s) {
      const p = s.p, obj = +p.obj;
      const out = [['objective:', '×' + obj], ['total magnification:', '×' + obj * 10]];
      if (p.mode === 'cal') {
        const c = calInfo(s);
        out.push(['zero lines:', c.aligned ? 'lined up' : 'not lined up yet']);
        if (c.aligned && p.work) out.push(['1 eyepiece division =', num(c.k) + ' µm', true]);
      } else {
        const m = measInfo(s);
        if (m.tooBig) out.push(['cell:', 'too big for this objective']);
        else if (m.aligned && p.work) {
          out.push(['eyepiece divisions:', num(m.read)]);
          out.push(['length =', num(m.len) + ' µm', true]);
        } else out.push(['left edge on 0:', m.aligned ? 'yes' : 'not yet']);
      }
      return out;
    }
  });
})();
