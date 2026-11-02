/* Biology 1a: Chemistry for biologists — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp, lerp = Sim.lerp;
  const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const SUBS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  const sub = (n) => String(n).split('').map((c) => SUBS[c] || c).join('');

  /* ======================================================================
     Condensation and hydrolysis: glucose units joined by glycosidic bonds
     ====================================================================== */
  const DUR = 2.4;          // seconds for one condensation or hydrolysis
  const WATER_BG = '#d0ebff', WATER_INK = '#1864ab';

  function geom(s, nUnits) {
    const { w, h } = s;
    const maxN = w < 420 ? 3 : w < 560 ? 4 : 6;
    const N = Math.max(maxN, nUnits || 1);
    const r = clamp((w - 40) / (N * 2.9 + 0.9), 15, 40);
    const fs = clamp(r * 0.4, 10.5, 15);
    return {
      maxN, r, fs,
      S: 2.9 * r,                       // centre-to-centre spacing of the rings
      x0: 22 + r,                       // centre of the first ring
      cy: Math.round(h * 0.47),         // centre line of the chain
      L: Math.max(0.6 * r, fs * 1.35),  // length of a vertical bond to a side group
      gap: 1.4 * r                      // extra space while the bond forms or breaks
    };
  }
  /* Haworth ring. f = +1 for the usual orientation, −1 for a unit turned over
     (every other β-glucose in a 1,4-linked chain). */
  function ringPts(cx, cy, r, f) {
    return {
      C1: [cx + r, cy], C2: [cx + 0.5 * r, cy + 0.45 * r * f], C3: [cx - 0.5 * r, cy + 0.45 * r * f],
      C4: [cx - r, cy], C5: [cx - 0.5 * r, cy - 0.45 * r * f], O5: [cx + 0.5 * r, cy - 0.45 * r * f]
    };
  }
  function atom(ctx, str, x, y, fs, color) {
    Sim.circle(ctx, x, y, fs * 0.62, { fill: '#fff' });
    Sim.text(ctx, str, x, y + 0.5, { size: fs, bold: true, color: color || C.ink, align: 'center' });
  }
  function water(ctx, x, y, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    Sim.text(ctx, 'H₂O', x, y, { size: 12.5, bold: true, color: WATER_INK, align: 'center', bg: WATER_BG, pad: 4 });
    ctx.restore();
  }
  /* Direction (+1 down, −1 up) of the –OH on C1 and on C4 of unit i. */
  const flipOf = (beta, i) => (beta && i % 2 === 1 ? -1 : 1);
  const dirC1 = (beta, i) => (beta ? -1 : 1) * flipOf(beta, i);
  const dirC4 = (beta, i) => flipOf(beta, i);

  /* One glucose ring with its side groups. o.c1 / o.c4: 'OH' to draw the free
     –OH group, anything else to leave that carbon's group to the caller. */
  function drawUnit(ctx, cx, G, o) {
    const { r, fs, L, cy } = G;
    const f = o.f;
    const P = ringPts(cx, cy, r, f);
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    const ring = [P.C1, P.C2, P.C3, P.C4, P.C5, P.O5];
    Sim.polyline(ctx, ring, { close: true, fill: '#eef5ff', color: C.ink, width: 1.6 });
    for (let i = 0; i < 6; i++) {
      const a = ring[i], b = ring[(i + 1) % 6];
      if (a[1] >= cy - 0.1 && b[1] >= cy - 0.1 && (a[1] > cy + 0.1 || b[1] > cy + 0.1)) Sim.line(ctx, a[0], a[1], b[0], b[1], { color: C.ink, width: 4.2 });
    }
    const small = Math.max(10, fs * 0.82);
    const stick = (pt, dir, label, opt) => {
      opt = opt || {};
      const x = pt[0], y = pt[1];
      Sim.line(ctx, x, y, x, y + dir * (L - fs * 0.45), { color: C.ink, width: 1.4 });
      Sim.text(ctx, label, x, y + dir * L, { size: opt.size || small, color: opt.color || C.ink, align: 'center', bold: !!opt.bold, bg: '#fff', pad: 1 });
    };
    // CH2OH on carbon 5 (above the ring, or below when the unit is turned over)
    stick(P.C5, -f, 'CH₂OH', { size: small, bold: false });
    if (o.all) {
      stick(P.C2, f, 'OH'); stick(P.C2, -f, 'H');
      stick(P.C3, -f, 'OH'); stick(P.C3, f, 'H');
      stick(P.C5, f, 'H');
      stick(P.C1, -o.d1, 'H');
      stick(P.C4, -o.d4, 'H');
    }
    if (o.c1 === 'OH') freeOH(ctx, P.C1[0], G, o.d1, 'right', o.hl1);
    if (o.c4 === 'OH') freeOH(ctx, P.C4[0], G, o.d4, 'left', o.hl4);
    atom(ctx, 'O', P.O5[0], P.O5[1], fs, C.red);
    Sim.text(ctx, '1', P.C1[0] - r * 0.22, cy, { size: fs * 0.72, color: C.muted, align: 'center' });
    Sim.text(ctx, '4', P.C4[0] + r * 0.22, cy, { size: fs * 0.72, color: C.muted, align: 'center' });
    ctx.restore();
  }
  /* A free –OH on C1 (H written to the right) or on C4 (H written to the left). */
  function freeOH(ctx, x, G, d, side, hl) {
    const { cy, L, fs } = G;
    const y = cy + d * L;
    Sim.line(ctx, x, cy, x, y - d * fs * 0.5, { color: C.ink, width: 1.4 });
    const hx = x + (side === 'right' ? 1 : -1) * fs * 0.78;
    atom(ctx, 'O', x, y, fs, hl === 'OH' ? C.red : C.ink);
    Sim.text(ctx, 'H', hx, y + 0.5, { size: fs, bold: true, color: hl ? C.red : C.ink, align: 'center' });
  }
  function drawBond(ctx, x1, x4, ox, d, G, alpha) {
    const yO = G.cy + d * G.L;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    Sim.line(ctx, x1, G.cy, ox, yO, { color: C.ink, width: 1.6 });
    Sim.line(ctx, ox, yO, x4, G.cy, { color: C.ink, width: 1.6 });
    atom(ctx, 'O', ox, yO, G.fs, C.red);
    ctx.restore();
  }
  function poolSlot(s, G, i) {
    const lab = s.w < 420 ? 'H₂O released:' : 'water released into solution:';
    const x0 = 16 + Sim.measure(s.ctx, lab, { size: 12.5, bold: true }) + 32;
    return { x: x0 + i * 46, y: s.h - 24, lab };
  }
  function moleculeName(n, beta) {
    if (n === 1) return beta ? 'β-glucose (a monosaccharide)' : 'α-glucose (a monosaccharide)';
    if (n === 2) return beta ? 'a disaccharide of two β-glucose units' : 'maltose (a disaccharide)';
    return beta ? 'a chain of ' + n + ' β-glucose units' : 'a chain of ' + n + ' α-glucose units';
  }
  function flash(st, msg) { st.msg = msg; st.msgT = 3; }
  function startReaction(s, kind) {
    const st = s.state;
    if (st.anim) return;
    const G = geom(s, st.n);
    const narrow = s.w < 500;
    if (kind === 'cond' && st.n >= G.maxN) { flash(st, narrow ? 'Long enough: hydrolyse it or press Reset.' : 'The chain is long enough to see the pattern. Hydrolyse it, or press Reset.'); return; }
    if (kind === 'hyd' && st.n <= 1) { flash(st, narrow ? 'No glycosidic bond left to break.' : 'A single glucose has no glycosidic bond left to hydrolyse.'); return; }
    st.anim = { kind, t: 0 };
    st.msg = '';
  }

  Sim.create('#sim-bio-1a-glycosidic', {
    title: 'Condensation and hydrolysis: building a chain of glucose',
    alt: 'Glucose rings joined by glycosidic bonds, with a water molecule released for each bond formed',
    height: (w) => (w < 560 ? 290 : 300),
    controls: [
      { key: 'type', type: 'select', label: 'Monomer', value: 'alpha', options: [['alpha', 'α-glucose'], ['beta', 'β-glucose (needed later, for cellulose)']] },
      { key: 'all', type: 'check', label: 'Show every –H and –OH', value: false },
      { type: 'button', label: 'Condensation: add a glucose', onClick: (s) => startReaction(s, 'cond') },
      { type: 'button', label: 'Hydrolysis: remove a glucose', onClick: (s) => startReaction(s, 'hyd') }
    ],
    animate: true,
    playPause: false,
    init(s) { s.state = { n: 1, anim: null, msg: '', msgT: 0 }; },
    update(s, dt) {
      const st = s.state;
      if (st.msgT > 0) { st.msgT -= dt; if (st.msgT <= 0) st.msg = ''; }
      const a = st.anim;
      if (!a) return;
      a.t += dt / DUR;
      if (a.t >= 1) {
        st.n += a.kind === 'cond' ? 1 : -1;
        st.anim = null;
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const beta = p.type === 'beta';
      const a = st.anim;
      const nUnits = st.n + (a && a.kind === 'cond' ? 1 : 0);
      const G = geom(s, nUnits);
      const { r, cy, fs, L } = G;
      const xs = [];
      for (let i = 0; i < nUnits; i++) xs.push(G.x0 + i * G.S);
      const alphas = xs.map(() => 1);
      const k = nUnits - 1;          // the unit that is arriving or leaving
      const j = k - 1;               // its neighbour in the chain
      let pa = 0, pb = 0, pc = 0;
      if (a && a.kind === 'cond') {
        pa = ease(a.t / 0.28); pb = ease((a.t - 0.42) / 0.22); pc = ease((a.t - 0.64) / 0.36);
        const target = xs[k] + G.gap * (1 - pc);
        xs[k] = lerp(w + r * 1.6, target, pa);
      } else if (a && a.kind === 'hyd') {
        pa = ease(a.t / 0.32); pb = ease((a.t - 0.32) / 0.23); pc = ease((a.t - 0.55) / 0.45);
        xs[k] += G.gap * pb + (w + r * 1.6 - xs[k] - G.gap) * pc;
        alphas[k] = 1 - 0.75 * pc;
      }
      const special = a && j >= 0;   // the bond at the end of the chain is being made or broken

      /* heading */
      const shownN = a ? (a.kind === 'cond' ? (a.t > 0.5 ? st.n + 1 : st.n) : (a.t > 0.5 ? st.n - 1 : st.n)) : st.n;
      Sim.text(ctx, moleculeName(shownN, beta), 14, 18, { size: 14, bold: true, color: C.navy });
      let sub2 = shownN > 1 ? (shownN - 1) + ' × ' + (beta ? 'β' : 'α') + '-1,4-glycosidic bond' + (shownN > 2 ? 's' : '') : 'no glycosidic bonds yet';
      const narrow = w < 500;
      if (a && a.kind === 'cond') sub2 = narrow ? 'condensation: –OH + –H → H₂O' : 'condensation: –OH from carbon 1 + –H from carbon 4 → H₂O';
      if (a && a.kind === 'hyd') sub2 = narrow ? 'hydrolysis: H₂O added, bond broken' : 'hydrolysis: water is added and the glycosidic bond breaks';
      Sim.text(ctx, sub2, 14, 38, { size: 12.5, color: a ? (a.kind === 'cond' ? C.green : C.purple) : C.muted, bold: !!a });

      /* bonds between the settled units */
      for (let i = 0; i < nUnits - 1; i++) {
        if (special && i === j) continue;
        const x1 = xs[i] + r, x4 = xs[i + 1] - r;
        drawBond(ctx, x1, x4, (x1 + x4) / 2, dirC1(beta, i), G);
      }
      /* the rings */
      for (let i = 0; i < nUnits; i++) {
        const isK = special && i === k, isJ = special && i === j;
        drawUnit(ctx, xs[i], G, {
          f: flipOf(beta, i), d1: dirC1(beta, i), d4: dirC4(beta, i), all: p.all, alpha: alphas[i],
          c1: i === nUnits - 1 && !isJ ? 'OH' : 'none',
          c4: i === 0 && !isK ? 'OH' : 'none'
        });
      }

      /* the bond being made or broken, and its water molecule */
      if (special) {
        const d = dirC1(beta, j);
        const x1 = xs[j] + r, x4 = xs[k] - r;
        const yG = cy + d * L;                        // level of the O atoms
        const yW = cy + d * (L + fs * 1.9 + r * 0.25);  // where the water forms
        const xW = x1 + (G.S - 2 * r + G.gap) / 2;
        const slotIdx = a.kind === 'cond' ? st.n - 1 : st.n - 2;
        const slot = poolSlot(s, G, slotIdx);
        if (a.kind === 'cond') {
          // free –OH on C1 of unit j: O and H leave as part of the water
          if (pb < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - pb;
            Sim.line(ctx, x1, cy, x1, yG - d * fs * 0.5, { color: C.ink, width: 1.4 });
            ctx.restore();
          }
          // C4 of unit k keeps its O, which becomes the bridge
          const oxStart = x4, oxEnd = x4 - (G.S - 2 * r) / 2;
          const ox = lerp(oxStart, oxEnd, pc);
          Sim.line(ctx, x4, cy, ox, yG, { color: C.ink, width: 1.6 });
          if (pb > 0) {
            ctx.save(); ctx.globalAlpha = pb;
            Sim.line(ctx, x1, cy, ox, yG, { color: C.ink, width: 1.6 });
            ctx.restore();
          }
          atom(ctx, 'O', ox, yG, fs, pb > 0.5 ? C.red : C.ink);
          if (pb < 0.92) {
            // the three atoms that become water move together
            const O1 = [lerp(x1, xW, pb), lerp(yG, yW, pb)];
            const H1 = [lerp(x1 + fs * 0.78, xW + fs * 0.8, pb), lerp(yG, yW - d * fs * 0.25, pb)];
            const H4 = [lerp(x4 - fs * 0.78, xW - fs * 0.8, pb), lerp(yG, yW - d * fs * 0.25, pb)];
            atom(ctx, 'O', O1[0], O1[1], fs, C.red);
            Sim.text(ctx, 'H', H1[0], H1[1] + 0.5, { size: fs, bold: true, color: C.red, align: 'center' });
            Sim.text(ctx, 'H', H4[0], H4[1] + 0.5, { size: fs, bold: true, color: C.red, align: 'center' });
          } else {
            water(ctx, lerp(xW, slot.x, pc), lerp(yW, slot.y, pc));
          }
          if (pa > 0.8 && pb < 0.15) {
            Sim.text(ctx, 'these atoms form water', xW, cy + d * (L + fs * 2.4), { size: 11.5, italic: true, color: C.red, align: 'center' });
          }
        } else {
          // hydrolysis: water arrives, splits into –OH (to C1) and –H (to the O on C4)
          const ox = lerp(x1 + (G.S - 2 * r) / 2, x4, pb);
          if (pb < 1) {
            ctx.save(); ctx.globalAlpha = 1 - pb;
            Sim.line(ctx, x1, cy, ox, yG, { color: C.ink, width: 1.6 });
            ctx.restore();
          }
          ctx.save(); ctx.globalAlpha = alphas[k];
          Sim.line(ctx, x4, cy, ox, yG, { color: C.ink, width: 1.6 });
          atom(ctx, 'O', ox, yG, fs, pb > 0.5 ? C.ink : C.red);
          ctx.restore();
          if (pa < 1 || pb <= 0) {
            water(ctx, lerp(slot.x, xW, pa), lerp(slot.y, yW, pa));
          } else {
            // pieces of the water molecule moving to their new places
            const OH = [lerp(xW, x1, pb), lerp(yW, yG, pb)];
            const Hx = lerp(xW - fs * 0.8, x4 - fs * 0.78, pb), Hy = lerp(yW, yG, pb);
            if (pb > 0.3) {
              ctx.save(); ctx.globalAlpha = (pb - 0.3) / 0.7;
              Sim.line(ctx, x1, cy, x1, yG - d * fs * 0.5, { color: C.ink, width: 1.4 });
              ctx.restore();
            }
            atom(ctx, 'O', OH[0], OH[1], fs, C.red);
            Sim.text(ctx, 'H', OH[0] + fs * 0.78, OH[1] + 0.5, { size: fs, bold: true, color: C.red, align: 'center' });
            ctx.save(); ctx.globalAlpha = alphas[k];
            Sim.text(ctx, 'H', Hx, Hy + 0.5, { size: fs, bold: true, color: C.red, align: 'center' });
            ctx.restore();
          }
          if (pc > 0.15) Sim.text(ctx, 'free glucose', Math.min(w - 50, xs[k]), cy - 1.25 * r - fs, { size: 12, italic: true, color: C.muted, align: 'center' });
        }
      }

      /* the pool of released water */
      const s0 = poolSlot(s, G, 0);
      Sim.text(ctx, s0.lab, 14, s0.y, { size: 12.5, bold: true, color: WATER_INK });
      let nPool = st.n - 1;
      if (a && a.kind === 'hyd') nPool = st.n - 2;
      for (let i = 0; i < nPool; i++) { const q = poolSlot(s, G, i); water(ctx, q.x, q.y); }
      if (nPool <= 0 && !(a && a.kind === 'cond' && pc > 0)) Sim.text(ctx, 'none yet', s0.x - 18, s0.y, { size: 12, italic: true, color: C.muted });
      if (st.msg) Sim.text(ctx, st.msg, w / 2, h - 52, { size: 12.5, color: '#fff', bg: C.orange, align: 'center', pad: 5 });
    },
    readout(s) {
      const st = s.state, beta = s.p.type === 'beta';
      const n = st.n;
      return [
        ['glucose units:', String(n)],
        ['glycosidic bonds:', String(n - 1) + (n > 1 ? ' (' + (beta ? 'β' : 'α') + '-1,4)' : '')],
        ['water released in making it:', String(n - 1) + ' H₂O'],
        ['formula:', 'C' + sub(6 * n) + 'H' + sub(10 * n + 2) + 'O' + sub(5 * n + 1), true],
        ['Mr = 180n − 18(n − 1) =', String(162 * n + 18)],
        [n >= 3 ? (beta ? 'cellulose:' : 'amylose:') : 'to hydrolyse it fully:', n >= 3 ? (beta ? 'thousands of β-glucose units, every other one turned over' : 'an unbranched α-1,4 chain thousands of units long') : (n - 1) + ' H₂O needed']
      ];
    }
  });
  /* ======================================================================
     Building a triglyceride: glycerol + three fatty acids by condensation
     ====================================================================== */
  // A fatty acid tail as a zigzag; an unsaturated (cis) one bends at its C=C.
  function tail(ctx, x, y, unsat, col) {
    const L = 15, n = 14;
    let dir = 0, px = x, py = y;
    const pts = [[px, py]];
    for (let i = 0; i < n; i++) {
      if (unsat && i === 7) dir += 0.7;
      px += Math.cos(dir) * L;
      py += Math.sin(dir) * L;
      const off = (i % 2 ? -6 : 6);
      pts.push([px - Math.sin(dir) * off, py + Math.cos(dir) * off]);
    }
    Sim.polyline(ctx, pts, { color: col, width: 2.2 });
    if (unsat) {
      const a = pts[7], b = pts[8];
      Sim.line(ctx, a[0] + 4, a[1] - 4, b[0] + 4, b[1] - 4, { color: C.red, width: 2 });
      Sim.text(ctx, 'C=C', (a[0] + b[0]) / 2 + 6, (a[1] + b[1]) / 2 - 12, { size: 10.5, bold: true, color: C.red });
    }
    return pts[pts.length - 1];
  }

  Sim.create('#sim-bio-1a-lipid', {
    title: 'Building a triglyceride',
    height: 320,
    controls: [
      { key: 'a', type: 'select', label: 'Fatty acid 1', options: [['sat', 'saturated'], ['unsat', 'unsaturated']], value: 'sat' },
      { key: 'b', type: 'select', label: 'Fatty acid 2', options: [['sat', 'saturated'], ['unsat', 'unsaturated']], value: 'sat' },
      { key: 'c', type: 'select', label: 'Fatty acid 3', options: [['sat', 'saturated'], ['unsat', 'unsaturated']], value: 'unsat' },
      { key: 'joined', label: 'Ester bonds formed', min: 0, max: 3, step: 1, value: 3, format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const kinds = [p.a, p.b, p.c];
      const gx = 26, rows = [70, 150, 230];
      // glycerol backbone
      for (let i = 0; i < 2; i++) Sim.line(ctx, gx + 21, rows[i] + 10, gx + 21, rows[i + 1] - 10, { color: C.ink, width: 2.2 });
      Sim.text(ctx, 'glycerol', gx + 4, rows[2] + 34, { size: 12, bold: true, color: C.navy });
      rows.forEach((y, i) => {
        const joined = i < p.joined;
        Sim.text(ctx, 'C', gx + 16, y, { size: 14, bold: true, color: C.ink });
        const fx = joined ? gx + 50 : gx + 110;
        if (joined) {
          Sim.text(ctx, '–O–C', gx + 30, y, { size: 14, bold: true, color: C.red });
          Sim.text(ctx, 'O', gx + 74, y - 22, { size: 13, bold: true, color: C.red });
          Sim.line(ctx, gx + 78, y - 15, gx + 78, y - 7, { color: C.red, width: 2 });
          Sim.line(ctx, gx + 82, y - 15, gx + 82, y - 7, { color: C.red, width: 2 });
          tail(ctx, gx + 90, y, kinds[i] === 'unsat', kinds[i] === 'unsat' ? C.orange : C.blue);
        } else {
          Sim.text(ctx, '–OH', gx + 30, y, { size: 14, bold: true, color: C.ink });
          Sim.text(ctx, 'HO–C', fx, y, { size: 14, bold: true, color: C.ink });
          Sim.text(ctx, 'O', fx + 30, y - 22, { size: 13, bold: true, color: C.ink });
          Sim.line(ctx, fx + 34, y - 15, fx + 34, y - 7, { color: C.ink, width: 2 });
          Sim.line(ctx, fx + 38, y - 15, fx + 38, y - 7, { color: C.ink, width: 2 });
          tail(ctx, fx + 48, y, kinds[i] === 'unsat', kinds[i] === 'unsat' ? C.orange : C.blue);
        }
      });
      // water released
      const wx = w - 120;
      Sim.text(ctx, 'water released', wx, 34, { size: 12, bold: true, color: C.navy });
      for (let i = 0; i < p.joined; i++) {
        Sim.circle(ctx, wx + 18 + i * 34, 64, 13, { fill: '#a5d8ff', stroke: '#4dabf7', width: 1 });
        Sim.text(ctx, 'H₂O', wx + 18 + i * 34, 65, { size: 10, bold: true, color: C.navy, align: 'center' });
      }
      const unsat = kinds.filter((k) => k === 'unsat').length;
      const state = p.joined < 3 ? '' : unsat === 0 ? 'tails pack closely: a solid fat' : 'kinked tails cannot pack closely: a liquid oil';
      if (state) Sim.text(ctx, state, w - 20, h - 18, { size: 12.5, bold: true, color: unsat ? C.orange : C.blue, align: 'right' });
    },
    readout(s) {
      const p = s.p;
      const kinds = [p.a, p.b, p.c];
      const unsat = kinds.filter((k) => k === 'unsat').length;
      return [
        ['Reaction', 'condensation: each ester bond releases one H₂O', true],
        ['So far', p.joined + ' ester bond' + (p.joined === 1 ? '' : 's') + ', ' + p.joined + ' H₂O released'],
        ['At room temperature', p.joined < 3 ? 'not yet a triglyceride' : unsat === 0 ? 'saturated: straight tails pack closely, so it is a solid (a fat)' : unsat + ' unsaturated tail' + (unsat > 1 ? 's' : '') + ': cis C=C bends stop close packing, so weaker forces and a liquid (an oil)'],
        ['Hydrolysis', 'adding 3 H₂O back (with lipase) breaks the ester bonds again']
      ];
    }
  });

})();
