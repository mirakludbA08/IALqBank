/* Biology 3b: Mitosis, meiosis and reproduction — interactive diagrams
   1. The cell cycle and the stages of mitosis, with the DNA content per cell
   2. Independent assortment in metaphase I: 2ⁿ kinds of gamete */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;
  const lerp = Sim.lerp;
  const NB = ' ';
  const MAT = '#e03131';   // maternal chromosomes
  const PAT = '#1c7ed6';   // paternal chromosomes

  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const seg = (f, a, b) => clamp((f - a) / (b - a), 0, 1);
  function group(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
  function big(n) { return n < 1e7 ? group(n) : Sim.fmt(n, 3); }
  function rng(seed) { let s = seed >>> 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  function ell(ctx, x, y, rx, ry, o) {
    o = o || {};
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.2, rx), Math.max(0.2, ry), 0, 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }
  function seg2(ctx, x1, y1, x2, y2, col, wdt, alpha) {
    Sim.line(ctx, x1, y1, x2, y2, { color: col, width: wdt, alpha });
  }

  /* ======================================================================
     1. The cell cycle and mitosis
     ====================================================================== */
  const STAGES = [
    { key: 'G1', name: 'Interphase: G1', dur: 10, anim: 1.6 },
    { key: 'S', name: 'Interphase: S phase', dur: 8, anim: 1.8 },
    { key: 'G2', name: 'Interphase: G2', dur: 4.5, anim: 1.4 },
    { key: 'P', name: 'Prophase', dur: 0.4, anim: 3.4 },
    { key: 'M', name: 'Metaphase', dur: 0.25, anim: 2.2 },
    { key: 'A', name: 'Anaphase', dur: 0.1, anim: 2.6 },
    { key: 'T', name: 'Telophase', dur: 0.25, anim: 2.8 },
    { key: 'C', name: 'Cytokinesis', dur: 0.5, anim: 2.8 }
  ];
  const T0 = [];
  STAGES.reduce((acc, g) => { T0.push(acc); return acc + g.dur; }, 0);   // start times; the cycle is 24 h
  function describe(i, plant) {
    return [
      'The cell grows and makes proteins and organelles. The DNA is spread out as chromatin, so no separate chromosomes can be seen.',
      'The DNA is replicated. Each chromosome becomes two identical sister chromatids, so the DNA content doubles.',
      'The cell keeps growing, makes proteins for division such as spindle proteins, and builds up ATP. The copied DNA is checked.',
      'The chromosomes coil up and become visible as two sister chromatids joined at the centromere. The nucleolus disappears' + (plant ? ', the spindle forms' : ', the centrioles move to opposite poles and the spindle forms') + ', and at the end the nuclear envelope breaks down.',
      'The chromosomes line up on the equator of the spindle. Each one is attached by its centromere to spindle fibres from both poles.',
      'The centromeres split. The spindle fibres shorten and pull the sister chromatids of every chromosome to opposite poles, centromere first.',
      'The chromatids, now called chromosomes, reach the poles and uncoil. A nuclear envelope forms around each group, the nucleoli reappear and the spindle breaks down.',
      plant
        ? 'Vesicles from the Golgi apparatus gather at the equator and fuse to form a cell plate, which grows out to the side walls. Two genetically identical cells result.'
        : 'A ring of protein fibres under the membrane tightens to form a cleavage furrow, which deepens until two genetically identical cells separate.'
    ][i];
  }
  function stageOf(u) {
    const i = clamp(Math.floor(u), 0, 7);
    return { i, f: clamp(u - i, 0, 1) };
  }
  const timeOf = (i, f) => T0[i] + f * STAGES[i].dur;
  function dnaOf(i, f) {
    if (i === 0) return 1;
    if (i === 1) return 1 + f;
    if (i === 7 && f >= 0.999) return 1;
    return 2;
  }

  /* Four chromosomes (2n = 4): a long and a short homologous pair. */
  const CHR = [
    { len: 0.4, col: MAT, my: -0.53, pp: [-0.2, -0.17], pa: 0.7 },
    { len: 0.24, col: PAT, my: -0.15, pp: [0.23, -0.21], pa: -0.5 },
    { len: 0.4, col: PAT, my: 0.23, pp: [-0.17, 0.2], pa: -0.95 },
    { len: 0.24, col: MAT, my: 0.61, pp: [0.21, 0.17], pa: 1.25 }
  ];
  /* Chromatin threads (unit circle), drawn in any nucleus while the DNA is uncoiled. */
  const THREADS = (function () {
    const r = rng(7), out = [];
    for (let k = 0; k < 9; k++) {
      const a0 = r() * Math.PI * 2, r0 = Math.sqrt(r()) * 0.6;
      let x = Math.cos(a0) * r0, y = Math.sin(a0) * r0, a = r() * Math.PI * 2;
      const pts = [[x, y]];
      for (let j = 0; j < 6; j++) {
        a += (r() - 0.5) * 2.2;
        x += Math.cos(a) * 0.17; y += Math.sin(a) * 0.17;
        const d = Math.hypot(x, y);
        if (d > 0.8) { x *= 0.8 / d; y *= 0.8 / d; a += Math.PI * 0.6; }
        pts.push([x, y]);
      }
      out.push({ pts, col: k % 2 ? PAT : MAT });
    }
    return out;
  })();
  function chromatin(ctx, x, y, r, alpha, dx) {
    if (alpha <= 0.01) return;
    THREADS.forEach((t) => {
      Sim.polyline(ctx, t.pts.map((q) => [x + (q[0] + (dx || 0)) * r, y + (q[1] + (dx || 0) * 0.6) * r]), { color: t.col, width: 1.3, alpha: alpha * 0.55 });
    });
  }
  /* A nucleus: double envelope, chromatin and nucleolus. env/nuc/chr are opacities. */
  function nucleus(ctx, x, y, r, o) {
    if (o.env > 0.01) {
      const dash = o.env < 0.999 ? [6, 5] : null;
      Sim.circle(ctx, x, y, r, { fill: 'rgba(229,219,255,' + (0.75 * o.env) + ')' });
      ctx.save();
      ctx.globalAlpha = o.env;
      Sim.circle(ctx, x, y, r, { stroke: '#5f3dc4', width: 1.6, dash });
      Sim.circle(ctx, x, y, r - 3, { stroke: '#5f3dc4', width: 1.1, dash });
      ctx.restore();
    }
    chromatin(ctx, x, y, r, o.chr || 0);
    if (o.copy) chromatin(ctx, x, y, r, o.copy, 0.05);
    if (o.nuc > 0.01) {
      ctx.save();
      ctx.globalAlpha = o.nuc;
      Sim.circle(ctx, x + r * 0.2, y - r * 0.2, r * 0.2, { fill: '#5f3dc4' });
      ctx.restore();
    }
  }
  /* A chromosome of two sister chromatids side by side, along angle ang. */
  function chromosome(ctx, x, y, ang, len, th, col, alpha) {
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux, sep = th * 0.62;
    [-1, 1].forEach((sg) => {
      const ox = nx * sep * sg, oy = ny * sep * sg;
      seg2(ctx, x + ox - (ux * len) / 2, y + oy - (uy * len) / 2, x + ox + (ux * len) / 2, y + oy + (uy * len) / 2, col, th, alpha);
    });
    Sim.circle(ctx, x, y, th * 0.75, { fill: 'rgba(33,37,41,' + (0.85 * alpha) + ')' });
  }
  /* One chromatid: centromere at (x, y), arms trailing towards the equator at ±beta. */
  function chromatid(ctx, x, y, dir, beta, len, th, col, alpha) {
    const back = dir < 0 ? 0 : Math.PI;
    [beta, -beta].forEach((b) => {
      const a = back + b;
      seg2(ctx, x, y, x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2, col, th, alpha);
    });
    Sim.circle(ctx, x, y, th * 0.6, { fill: 'rgba(33,37,41,' + (0.8 * alpha) + ')' });
  }
  function centrioles(ctx, x, y, sz, alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    Sim.rect(ctx, x - sz, y - sz * 0.35, sz * 2, sz * 0.7, { fill: '#2f9e44', r: 1.5 });
    Sim.rect(ctx, x + sz * 0.15, y - sz * 1.2, sz * 0.7, sz * 2, { fill: '#2f9e44', r: 1.5 });
    ctx.restore();
  }
  /* Cell outline: an ellipse pinched at the equator by p (animal) */
  function animalPath(ctx, x, y, rx, ry, p) {
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const t = (i / 140) * Math.PI * 2, c = Math.cos(t);
      const X = x + rx * c, Y = y + ry * Math.sin(t) * (1 - p * Math.exp(-Math.pow(c / 0.3, 2)));
      if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
    }
    ctx.closePath();
  }

  function mitLayout(w) {
    const wide = w >= 700;
    if (wide) {
      const rw = Math.round(w * 0.52);
      const R = Math.min(108, (rw - 30) / 3.1);
      return { wide, R, ox: rw / 2 + 6, oy: 56 + R + 6, rL: 8, rR: rw, gb: { x: rw + 52, y: 44, w: w - rw - 52 - 22, h: 380 - 44 - 44 } };
    }
    const R = clamp((w - 24) / 3.4, 58, 82);
    const oy = 58 + R;
    return { wide, R, ox: w / 2, oy, rL: 8, rR: w - 8, gb: { x: 50, y: oy + R + 66, w: w - 50 - 18, h: 150 } };
  }

  /* Everything that changes through the cycle, worked out once per frame. */
  function geometry(u, plant, L) {
    const { i, f } = stageOf(u);
    const R = L.R, ox = L.ox, oy = L.oy;
    const g = { i, f, R, ox, oy, plant };
    // cell shape
    g.rx = plant ? 1.2 * R : i < 5 ? R : i === 5 ? lerp(R, 1.1 * R, ease(f)) : i === 6 ? lerp(1.1 * R, 1.18 * R, ease(f)) : 1.18 * R;
    g.ry = plant ? 0.9 * R : i < 5 ? R : i === 5 ? lerp(R, 0.94 * R, ease(f)) : 0.94 * R;
    g.pinch = !plant && i === 7 ? ease(f) : 0;
    g.poleX = g.rx - 0.13 * R;
    // nucleus in interphase / prophase
    g.rn = 0.55 * R;
    g.env = i <= 2 ? 1 : i === 3 ? 1 - seg(f, 0.6, 0.85) : 0;
    g.nuc = i <= 2 ? 1 : i === 3 ? 1 - seg(f, 0, 0.35) : 0;
    // daughter nuclei from telophase on
    g.dn = i === 6 ? ease(seg(f, 0.15, 1)) : i === 7 ? 1 : 0;
    g.dnNuc = i === 6 ? seg(f, 0.45, 1) : i === 7 ? 1 : 0;
    g.dx = 0.7 * R;
    g.drn = 0.38 * R;
    // spindle
    g.spindle = i === 3 ? seg(f, 0.35, 1) : i === 4 || i === 5 ? 1 : i === 6 ? 1 - ease(f) : 0;
    // chromosomes
    const th = Math.max(2.2, R * 0.062);
    g.chr = CHR.map((c) => {
      const L0 = c.len * R;
      const out = { col: c.col, kind: 'none' };
      if (i === 3) {
        const cond = ease(seg(f, 0, 0.7));
        const mv = ease(seg(f, 0.8, 1)) * 0.65;
        out.kind = 'pair';
        out.x = ox + lerp(c.pp[0] * R, 0, mv);
        out.y = oy + lerp(c.pp[1] * R, c.my * R, mv);
        out.ang = lerp(c.pa, Math.PI / 2, mv);
        out.len = L0 * lerp(1.35, 1, cond);
        out.th = lerp(1.2, th, cond);
        out.alpha = lerp(0.35, 1, cond);
      } else if (i === 4) {
        const mv = lerp(0.65, 1, ease(seg(f, 0, 0.25)));
        out.kind = 'pair';
        out.x = ox + lerp(c.pp[0] * R, 0, mv);
        out.y = oy + lerp(c.pp[1] * R, c.my * R, mv);
        out.ang = lerp(c.pa, Math.PI / 2, mv);
        out.len = L0; out.th = th; out.alpha = 1;
      } else if (i === 5 || i === 6) {
        const e = i === 5 ? ease(f) : 1;
        const sep = th * 0.62;
        const xEnd = 0.66 * R;
        out.kind = 'split';
        out.dx = sep + e * (xEnd - sep);
        out.y = oy + c.my * R * (i === 5 ? 1 - 0.38 * e : lerp(0.62, 0.5, ease(f)));
        out.beta = Math.PI / 2 - (Math.PI / 2 - 0.42) * e;
        out.len = i === 6 ? L0 * lerp(1, 1.4, ease(f)) : L0;
        out.th = i === 6 ? lerp(th, 1.2, ease(f)) : th;
        out.alpha = i === 6 ? lerp(1, 0, ease(seg(f, 0.2, 1))) : 1;
        if (i === 6) out.dx = lerp(xEnd, g.dx, ease(f));
      }
      return out;
    });
    // centrioles (animal cells only)
    if (!plant) {
      const top = -0.75 * R;
      if (i <= 2) {
        g.cen = [[ox + 0.05 * R, oy + top, 1], [ox + 0.24 * R, oy + top + 0.02 * R, i === 0 ? 0 : i === 1 ? ease(seg(f, 0.3, 1)) : 1]];
      } else if (i === 3) {
        const e = ease(seg(f, 0.05, 0.75));
        const pa = (a0, a1, r0, r1) => { const a = lerp(a0, a1, e), r = lerp(r0, r1, e); return [ox + Math.cos(a) * r, oy + Math.sin(a) * r, 1]; };
        g.cen = [pa(Math.atan2(top, 0.05 * R), -Math.PI, Math.hypot(0.05 * R, top), g.poleX), pa(Math.atan2(top, 0.24 * R), 0, Math.hypot(0.24 * R, top), g.poleX)];
      } else g.cen = [[ox - g.poleX, oy, 1], [ox + g.poleX, oy, 1]];
    }
    return g;
  }

  function drawSpindle(ctx, g) {
    if (g.spindle <= 0.01) return;
    const { ox, oy, R } = g;
    const col = 'rgba(73,80,87,' + (0.55 * g.spindle) + ')';
    const poles = [[ox - g.poleX, -1], [ox + g.poleX, 1]];
    const spread = g.plant ? 0.16 * R : 0;
    poles.forEach(([px, side]) => {
      const pyOf = (ty) => oy + (spread * (ty - oy)) / (0.8 * R);
      if (g.i === 3) {
        // the spindle grows out from the separating centrioles (animal) or the two poles (plant)
        const reach = g.f < 0.7 ? 0.42 * seg(g.f, 0.35, 0.7) : 0.42 + 0.5 * seg(g.f, 0.7, 1);
        const cen = g.cen ? g.cen[side < 0 ? 0 : 1] : null;
        [-0.62, -0.3, 0, 0.3, 0.62].forEach((ty) => {
          const tx = ox, tyy = oy + ty * R;
          const sx = cen ? cen[0] : px, sy = cen ? cen[1] : pyOf(tyy);
          Sim.line(ctx, sx, sy, sx + (tx - sx) * reach, sy + (tyy - sy) * reach, { color: col, width: 1.2 });
        });
        return;
      }
      // polar fibres that overlap past the equator
      [-0.72, 0.72].forEach((ty) => {
        const tx = ox - side * (0.16 + (g.i === 5 ? 0.12 * ease(g.f) : g.i === 6 ? 0.12 : 0)) * R, tyy = oy + ty * R * 0.95;
        Sim.line(ctx, px, pyOf(tyy), tx, tyy, { color: col, width: 1.1 });
      });
      // kinetochore fibres to the centromeres
      g.chr.forEach((c) => {
        let cx, cy;
        if (c.kind === 'pair') {
          cx = c.x + side * c.th * 0.62; cy = c.y;
        } else if (c.kind === 'split') {
          cx = ox + side * c.dx; cy = c.y;
        } else return;
        Sim.line(ctx, px, pyOf(cy), cx, cy, { color: col, width: 1.3 });
      });
    });
  }

  function drawCell(ctx, g) {
    const { ox, oy, R } = g;
    if (g.plant) {
      Sim.rect(ctx, ox - g.rx - 5, oy - g.ry - 5, 2 * g.rx + 10, 2 * g.ry + 10, { fill: '#b2f2bb', stroke: '#2b8a3e', width: 2, r: 8 });
      Sim.rect(ctx, ox - g.rx, oy - g.ry, 2 * g.rx, 2 * g.ry, { fill: '#f4fce3', stroke: '#5c940d', width: 1.2, r: 5 });
    } else {
      animalPath(ctx, ox, oy, g.rx, g.ry, g.pinch);
      ctx.save();
      ctx.fillStyle = '#fff4e6';
      ctx.strokeStyle = '#e8590c';
      ctx.lineWidth = 2.4;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // cell plate (plant cytokinesis)
    if (g.plant && g.i === 7) {
      const f = g.f;
      if (f < 0.35) {
        const n = 3 + Math.round(f * 20);
        for (let k = 0; k < n; k++) Sim.circle(ctx, ox + ((k * 37) % 7 - 3) * 0.6, oy + (k - (n - 1) / 2) * 0.07 * R, 3, { fill: 'rgba(92,148,13,0.75)' });
      } else {
        const half = lerp(0.3 * R, g.ry, ease(seg(f, 0.35, 1)));
        Sim.rect(ctx, ox - 2.5, oy - half, 5, 2 * half, { fill: '#2b8a3e', r: 2 });
        if (f < 0.98) [-1, 1].forEach((sg) => { for (let k = 0; k < 3; k++) Sim.circle(ctx, ox + (k - 1) * 4, oy + sg * (half + 4 + k * 2), 2.5, { fill: 'rgba(92,148,13,0.75)' }); });
      }
    }
    drawSpindle(ctx, g);
    // original nucleus
    if (g.i <= 3) {
      nucleus(ctx, ox, oy, g.rn, {
        env: g.env, nuc: g.nuc,
        chr: g.i <= 2 ? 1 : 1 - seg(g.f, 0, 0.3),
        copy: g.i === 1 ? ease(g.f) : g.i === 2 ? 1 : g.i === 3 ? 1 - seg(g.f, 0, 0.3) : 0
      });
    }
    // daughter nuclei
    if (g.dn > 0.01) {
      [-1, 1].forEach((sg) => nucleus(ctx, ox + sg * g.dx, oy, g.drn, { env: g.dn, nuc: g.dnNuc, chr: g.dn }));
    }
    // chromosomes
    g.chr.forEach((c) => {
      if (c.kind === 'pair') chromosome(ctx, c.x, c.y, c.ang, c.len, c.th, c.col, c.alpha);
      else if (c.kind === 'split' && c.alpha > 0.01) {
        [-1, 1].forEach((sg) => chromatid(ctx, ox + sg * c.dx, c.y, sg, c.beta, c.len, c.th, c.col, c.alpha));
      }
    });
    if (g.cen) g.cen.forEach((q) => centrioles(ctx, q[0], q[1], Math.max(4, R * 0.06), q[2]));
  }

  /* Labels with leader lines, in four slots above and below the cell. */
  function labelsFor(g) {
    const { ox, oy, R, i, f } = g;
    const out = [];
    const c0 = g.chr[0], c2 = g.chr[2], c3 = g.chr[3];
    if (i <= 2) {
      out.push({ slot: 'tl', t: 'nucleolus', ax: ox + g.rn * 0.2, ay: oy - g.rn * 0.2 });
      out.push({ slot: 'bl', t: i === 1 ? 'chromatin (DNA copying)' : 'chromatin', ax: ox - g.rn * 0.35, ay: oy + g.rn * 0.3 });
      out.push({ slot: 'br', t: 'nuclear envelope', ax: ox + g.rn * 0.71, ay: oy + g.rn * 0.71 });
      if (!g.plant) out.push({ slot: 'tr', t: i === 0 ? 'centrioles' : 'centrioles (copied)', ax: g.cen[0][0] + 4, ay: g.cen[0][1] });
      else out.push({ slot: 'tr', t: 'cell wall', ax: ox + g.rx + 2, ay: oy - g.ry + 12 });
    } else if (i === 3) {
      out.push({ slot: 'tl', t: 'two sister chromatids', ax: c0.x - Math.cos(c0.ang) * c0.len * 0.3, ay: c0.y - Math.sin(c0.ang) * c0.len * 0.3 });
      out.push({ slot: 'bl', t: 'centromere', ax: c2.x, ay: c2.y });
      if (f > 0.5 && f < 0.88) out.push({ slot: 'br', t: 'envelope breaking down', ax: ox + g.rn * 0.71, ay: oy + g.rn * 0.71 });
      else if (f < 0.35) out.push({ slot: 'br', t: 'nucleolus disappearing', ax: ox + g.rn * 0.2, ay: oy - g.rn * 0.2 });
      else out.push({ slot: 'br', t: 'spindle forming', ax: ox + g.poleX * 0.6, ay: oy + 0.18 * R });
      if (!g.plant) out.push({ slot: 'tr', t: 'centrioles move apart', ax: g.cen[1][0], ay: g.cen[1][1] });
    } else if (i === 4) {
      out.push({ slot: 'tl', t: 'equator', ax: ox, ay: oy - 0.8 * R });
      out.push({ slot: 'bl', t: 'centromere', ax: c2.x, ay: c2.y });
      out.push({ slot: 'br', t: 'spindle fibre', ax: ox + (g.poleX + c3.th) / 2, ay: (oy + c3.y) / 2 });
      out.push({ slot: 'tr', t: g.plant ? 'spindle pole' : 'centrioles at pole', ax: ox + g.poleX, ay: oy });
    } else if (i === 5) {
      out.push({ slot: 'tl', t: 'chromatids pulled apart', ax: ox - c0.dx - 6, ay: c0.y - 6 });
      out.push({ slot: 'tr', t: 'centromere first', ax: ox + g.chr[1].dx, ay: g.chr[1].y });
      out.push({ slot: 'br', t: 'spindle fibres shorten', ax: ox + (g.poleX + c3.dx) / 2, ay: oy + (c3.y - oy) / 2 });
    } else if (i === 6) {
      out.push({ slot: 'tl', t: 'nuclear envelope re-forms', ax: ox - g.dx - g.drn * 0.6, ay: oy - g.drn * 0.8 });
      out.push({ slot: 'bl', t: 'chromosomes uncoil', ax: ox - g.dx + g.drn * 0.1, ay: oy + g.drn * 0.25 });
      if (f > 0.45) out.push({ slot: 'tr', t: 'nucleolus reappears', ax: ox + g.dx + g.drn * 0.2, ay: oy - g.drn * 0.2 });
      out.push({ slot: 'br', t: 'spindle breaks down', ax: ox + 0.2 * R, ay: oy + 0.62 * R });
    } else {
      if (g.plant) out.push({ slot: 'tr', t: 'cell plate', ax: ox + 2, ay: oy - lerp(0.25, 0.8, ease(seg(f, 0.35, 1))) * g.ry });
      else out.push({ slot: 'tr', t: 'cleavage furrow', ax: ox, ay: oy - g.ry * (1 - g.pinch) - 1 });
      out.push({ slot: 'bl', t: 'nucleus of a new cell', ax: ox - g.dx, ay: oy + g.drn * 0.6 });
      out.push({ slot: 'br', t: 'genetically identical', ax: ox + g.dx, ay: oy + g.drn * 0.6 });
    }
    return out;
  }
  function drawLabels(ctx, g, L) {
    const top = g.oy - Math.max(g.ry, g.R) - 18, bot = g.oy + Math.max(g.ry, g.R) + 22;
    labelsFor(g).forEach((lb) => {
      const left = lb.slot[1] === 'l';
      const ty = lb.slot[0] === 't' ? top : bot;
      const tx = left ? L.rL + 4 : L.rR - 4;
      const wdt = Sim.measure(ctx, lb.t, { size: 12, bold: true });
      const ex = left ? tx + wdt + 4 : tx - wdt - 4;
      Sim.line(ctx, ex, ty, lb.ax, lb.ay, { color: 'rgba(73,80,87,0.7)', width: 1 });
      Sim.circle(ctx, lb.ax, lb.ay, 2.2, { fill: C.ink });
      Sim.text(ctx, lb.t, tx, ty, { size: 12, bold: true, color: C.ink, align: left ? 'left' : 'right', bg: 'rgba(255,255,255,0.88)', pad: 2 });
    });
  }

  function step(s, d) {
    const { i } = stageOf(s.p.u);
    s.pause();
    s.set('u', clamp(i + d, 0, 7) + 0.6);
  }

  Sim.create('#sim-bio-3b-mitosis', {
    title: 'The cell cycle and mitosis',
    alt: 'A cell with two pairs of chromosomes drawn at each stage of the cell cycle and mitosis, beside a graph of DNA content per cell against time',
    height: (w) => { const L = mitLayout(w); return L.wide ? 380 : L.gb.y + L.gb.h + 42; },
    controls: [
      { key: 'u', label: 'Stage', min: 0, max: 8, step: 0.01, value: 3.6, format: (v) => STAGES[stageOf(v).i].name },
      { key: 'cell', type: 'select', label: 'Cell', value: 'animal', options: [['animal', 'Animal cell'], ['plant', 'Plant cell (root tip)']] },
      { key: 'labels', type: 'check', label: 'Labels', value: true },
      { type: 'button', label: '◀ Previous stage', ghost: true, onClick: (s) => step(s, -1) },
      { type: 'button', label: 'Next stage ▶', onClick: (s) => step(s, 1) }
    ],
    animate: true,
    autoplay: false,
    resetButton: false,
    update(s, dt) {
      let u = s.p.u;
      if (u >= 7.999) u = 0;
      const { i } = stageOf(u);
      u += dt / STAGES[i].anim;
      if (u >= 8) { u = 8; s.set('u', u); s.pause(); return; }
      s.set('u', u);
    },
    draw(s) {
      const { ctx, w, p } = s;
      const L = mitLayout(w);
      const g = geometry(p.u, p.cell === 'plant', L);
      const st = STAGES[g.i];
      Sim.text(ctx, st.name, L.wide ? L.rL + 8 : 12, 16, { size: 15, bold: true, color: C.navy });
      Sim.text(ctx, 'diploid number 2n = 4', L.wide ? L.rR - 8 : w - 12, 16, { size: 12, color: C.muted, align: 'right' });
      drawCell(ctx, g);
      if (p.labels) drawLabels(ctx, g, L);

      /* DNA content per cell against time */
      const gr = Sim.graph(ctx, Object.assign({ xmin: 0, xmax: 27, ymin: 0, ymax: 2.5, xstep: 6, ystep: 0.5, xlabel: 'time / h', ylabel: 'DNA per cell / arbitrary units', title: 'DNA content per cell' }, L.gb)).axes();
      const bands = [[0, 10, 'rgba(76,127,217,0.13)', 'G1'], [10, 18, 'rgba(47,158,68,0.13)', 'S'], [18, 22.5, 'rgba(230,119,0,0.13)', 'G2'], [22.5, 23.5, 'rgba(214,51,108,0.22)', 'M'], [23.5, 24, 'rgba(112,72,232,0.22)', ''], [24, 27, 'rgba(76,127,217,0.13)', 'G1']];
      bands.forEach(([a, b, col, lab]) => {
        Sim.rect(ctx, gr.px(a), gr.y, gr.px(b) - gr.px(a), gr.h, { fill: col });
        if (lab) Sim.text(ctx, lab, (gr.px(a) + gr.px(b)) / 2, gr.py(0.55), { size: 11.5, bold: true, color: C.muted, align: 'center' });
      });
      gr.path([[0, 1], [10, 1], [18, 2], [24, 2], [24, 1], [27, 1]], { color: C.navy, width: 2.5 });
      const t = timeOf(g.i, g.f);
      gr.dot(t, dnaOf(g.i, g.f), { color: C.red, r: 6 });
    },
    readout(s) {
      const { i, f } = stageOf(s.p.u);
      const plant = s.p.cell === 'plant';
      const chrom = i === 0 ? '4, each one DNA molecule' : i === 1 ? '4, being copied' : i <= 4 ? '4, each of two sister chromatids' : i === 5 ? '8 (4 moving to each pole)' : i === 6 ? '8 (4 in each new nucleus)' : '4 in each new cell';
      const dna = i === 1 ? (1 + f).toFixed(2) + ' units (replicating)' : dnaOf(i, f) === 1 ? (i === 7 ? '1 unit in each new cell' : '1 unit') : '2 units';
      const t = timeOf(i, f);
      const items = [
        ['<b>' + STAGES[i].name + '</b>', '', true],
        ['time since the cell formed:', t.toFixed(1) + ' h of 24 h'],
        ['DNA per cell:', dna],
        ['chromosomes:', chrom]
      ];
      return items.map((it) => '<span class="ro' + (it[2] ? ' hl' : '') + '">' + it[0] + (it[1] ? ' <b>' + it[1] + '</b>' : '') + '</span>').join('') +
        '<span class="ro" style="flex-basis:100%">' + describe(i, plant) + '</span>';
    }
  });

  /* ======================================================================
     2. Independent assortment: 2ⁿ combinations
     ====================================================================== */
  const SIZE = (k) => 1 - (0.55 * k) / 22;    // pair 1 largest, as in a karyotype

  function asLayout(w) {
    const wide = w >= 700;
    if (wide) {
      const cw = Math.round(w * 0.5);
      return { wide, ox: cw / 2, oy: 172, rx: Math.min(cw * 0.42, 175), ry: 124, chipY: 318, cw, px: cw + 24, py: 22, pw: w - cw - 44, ph: 360 };
    }
    return { wide, ox: w / 2, oy: 142, rx: Math.min(w * 0.42, 160), ry: 108, chipY: 276, cw: w, px: 14, py: 352, pw: w - 28, ph: 230 };
  }
  function gamete(ctx, x, y, cw, ch, bits, n, o) {
    o = o || {};
    Sim.rect(ctx, x, y, cw, ch, { fill: o.fill || '#fff', stroke: o.stroke || '#ced4da', width: o.lw || 1.2, r: 6 });
    const sp = (cw - 8) / n;
    const bw = clamp(sp * 0.6, 1.6, 9);
    for (let k = 0; k < n; k++) {
      const hk = (ch - 10) * SIZE(k);
      const bx = x + 4 + sp * (k + 0.5) - bw / 2;
      Sim.rect(ctx, bx, y + ch - 5 - hk, bw, hk, { fill: bits[k] ? MAT : PAT, r: Math.min(2, bw / 2) });
    }
  }
  function shuffle(s) {
    s.state.o = s.state.o.map(() => Math.random() < 0.5);
  }

  Sim.create('#sim-bio-3b-assortment', {
    title: 'Independent assortment: 2ⁿ kinds of gamete',
    alt: 'A cell in metaphase I with homologous pairs lined up on the equator in random orientations, and the gametes that can result',
    height: (w) => (w >= 700 ? 392 : 600),
    controls: [
      { key: 'n', label: 'Pairs of homologous chromosomes n', min: 1, max: 23, step: 1, value: 3, format: (v) => v.toFixed(0) },
      { type: 'button', label: 'New random line-up', onClick: (s) => shuffle(s) }
    ],
    init(s) {
      const o = [];
      for (let k = 0; k < 23; k++) o.push(k % 3 !== 1);
      s.state = { o, rows: [] };
    },
    pointer: {
      down(s, pt) {
        const st = s.state;
        const hit = st.rows.find((r) => pt.y >= r.y0 && pt.y < r.y1 && Math.abs(pt.x - r.x) < r.hw);
        if (hit) st.o[hit.k] = !st.o[hit.k];
      }
    },
    draw(s) {
      const { ctx, w, p } = s;
      const st = s.state;
      const L = asLayout(w);
      const n = p.n;
      const { ox, oy, rx, ry } = L;

      /* metaphase I */
      Sim.text(ctx, 'Metaphase I: tap a pair to flip it', L.wide ? 14 : 12, 18, { size: 14, bold: true, color: C.navy });
      ell(ctx, ox, oy, rx, ry, { fill: '#fff4e6', stroke: '#e8590c', width: 2.4 });
      Sim.line(ctx, ox, oy - ry + 8, ox, oy + ry - 8, { color: C.grey, dash: [5, 5], width: 1.2 });
      Sim.text(ctx, 'equator', ox + 5, oy - ry + 12, { size: 11, color: C.muted });
      const poleL = ox - rx + 16, poleR = ox + rx - 16;
      const plateH = 1.62 * ry;
      const slot = plateH / n;
      const maxLen = Math.min(slot * 0.86, 0.42 * ry);
      const th = clamp(slot * 0.13, 1.4, 4.6);
      const sep = th * 0.62;
      st.rows = [];
      for (let k = 0; k < n; k++) {
        const y = oy - plateH / 2 + (k + 0.5) * slot;
        const len = maxLen * SIZE(k);
        const xl = ox - th * 1.6, xr = ox + th * 1.6;
        const matLeft = st.o[k];
        Sim.line(ctx, poleL, oy + (y - oy) * 0.12, xl - sep, y, { color: 'rgba(73,80,87,0.4)', width: 1 });
        Sim.line(ctx, poleR, oy + (y - oy) * 0.12, xr + sep, y, { color: 'rgba(73,80,87,0.4)', width: 1 });
        chromosome(ctx, xl, y, Math.PI / 2, len, th, matLeft ? MAT : PAT, 1);
        chromosome(ctx, xr, y, Math.PI / 2, len, th, matLeft ? PAT : MAT, 1);
        if (n <= 8) Sim.text(ctx, String(k + 1), ox + Math.max(28, th * 6), y, { size: 11, color: C.muted, align: 'left' });
        st.rows.push({ k, y0: y - slot / 2, y1: y + slot / 2, x: ox, hw: Math.max(40, rx * 0.5) });
      }
      centrioles(ctx, poleL, oy, 5, 1);
      centrioles(ctx, poleR, oy, 5, 1);
      Sim.text(ctx, 'pole', poleL + 2, oy + 16, { size: 11, color: C.muted, align: 'center' });
      Sim.text(ctx, 'pole', poleR - 2, oy + 16, { size: 11, color: C.muted, align: 'center' });

      // the gametes this line-up gives
      const left = st.o.slice(0, n), right = left.map((b) => !b);
      const chipW = Math.min(150, Math.max(60, n * 9 + 16)), chipH = 30;
      const gx1 = ox - chipW - 18, gx2 = ox + 18;
      Sim.text(ctx, 'gametes from this line-up', ox, L.chipY - 12, { size: 12, bold: true, color: C.ink, align: 'center' });
      gamete(ctx, gx1, L.chipY, chipW, chipH, left, n, { stroke: C.navy, lw: 2 });
      gamete(ctx, gx2, L.chipY, chipW, chipH, right, n, { stroke: C.navy, lw: 2 });
      Sim.text(ctx, 'left pole', gx1 + chipW / 2, L.chipY + chipH + 10, { size: 11, color: C.muted, align: 'center' });
      Sim.text(ctx, 'right pole', gx2 + chipW / 2, L.chipY + chipH + 10, { size: 11, color: C.muted, align: 'center' });

      /* all the possibilities */
      const total = Math.pow(2, n);
      let y = L.py;
      Sim.text(ctx, 'Possible gametes = 2ⁿ = 2' + Sim.sup(n) + ' = ' + group(total), L.px, y + 8, { size: 14.5, bold: true, color: C.navy });
      y += 30;
      if (n <= 4) {
        const cols = n <= 2 ? total : 4;
        const rowsN = Math.ceil(total / cols);
        const gap = 10;
        const cw = Math.min(110, (L.pw - gap * (cols - 1)) / cols);
        const ch = Math.min(40, (L.ph - (y - L.py) - 40 - gap * (rowsN - 1)) / rowsN);
        for (let gi = 0; gi < total; gi++) {
          const bits = [];
          for (let k = 0; k < n; k++) bits.push(((gi >> (n - 1 - k)) & 1) === 0);
          const isL = bits.every((b, k) => b === left[k]), isR = bits.every((b, k) => b === right[k]);
          const cx = L.px + (gi % cols) * (cw + gap), cy = y + Math.floor(gi / cols) * (ch + gap);
          gamete(ctx, cx, cy, cw, ch, bits, n, isL || isR ? { stroke: C.navy, lw: 2.5, fill: '#e7f5ff' } : {});
        }
        y += rowsN * (ch + gap) + 6;
        Sim.text(ctx, 'outlined: the two made by this line-up', L.px, y + 6, { size: 12, italic: true, color: C.muted });
      } else {
        const lines = [
          'Too many to list. Each pair lines up independently of every other pair, so every extra pair doubles the number of combinations.',
          'In humans n = 23, so one person can make 2²³ = 8' + NB + '388' + NB + '608 different combinations of chromosomes in their gametes, before crossing over adds even more.'
        ];
        lines.forEach((tx) => {
          const words = tx.split(' ');
          let cur = '';
          words.forEach((wd) => {
            const tt = cur ? cur + ' ' + wd : wd;
            if (cur && Sim.measure(ctx, tt, { size: 13.5 }) > L.pw) { Sim.text(ctx, cur, L.px, y, { size: 13.5, color: C.ink, baseline: 'top' }); y += 19; cur = wd; } else cur = tt;
          });
          if (cur) { Sim.text(ctx, cur, L.px, y, { size: 13.5, color: C.ink, baseline: 'top' }); y += 19; }
          y += 10;
        });
      }
      // legend
      const ly = L.wide ? L.ph + 14 : L.py + L.ph + 4;
      Sim.rect(ctx, L.px, ly - 6, 12, 12, { fill: MAT, r: 2 });
      Sim.text(ctx, 'from the mother', L.px + 18, ly, { size: 12, color: C.ink });
      Sim.rect(ctx, L.px + 130, ly - 6, 12, 12, { fill: PAT, r: 2 });
      Sim.text(ctx, 'from the father', L.px + 148, ly, { size: 12, color: C.ink });
    },
    readout(s) {
      const n = s.p.n, total = Math.pow(2, n);
      return [
        ['n =', n + ' pairs (2n = ' + 2 * n + ')'],
        ['different gametes 2ⁿ =', big(total), true],
        ['chance a gamete gets only maternal chromosomes:', '1/' + big(total)],
        ['different zygotes from one couple (2ⁿ)² =', big(total * total)]
      ];
    }
  });
})();
