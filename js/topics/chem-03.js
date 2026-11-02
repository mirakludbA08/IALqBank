/* Chemistry Topic 3, Bonding and structure: interactive diagrams (built with js/sim.js) */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* ---------- small 3D helpers shared by the shape and polarity diagrams ---------- */
  const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  function rot(v, yaw, pitch) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x1 = v[0] * cy + v[2] * sy, z1 = -v[0] * sy + v[2] * cy;
    return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  }
  function ball(ctx, x, y, r, col, rim) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, col);
    g.addColorStop(1, rim || col);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();
    ctx.restore();
  }
  function lobe(ctx, x0, y0, dx, dy, len, wid, dots) {
    const ang = Math.atan2(dy, dx);
    const cx = x0 + dx * len * 0.62, cy = y0 + dy * len * 0.62;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(len * 0.5, wid * 0.6), wid / 2, ang, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(214,51,132,0.18)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(214,51,132,0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    if (dots) {
      const px = -Math.sin(ang), py = Math.cos(ang);
      const ex = x0 + dx * len * 0.78, ey = y0 + dy * len * 0.78;
      Sim.circle(ctx, ex + px * wid * 0.17, ey + py * wid * 0.17, 2.6, { fill: '#a61e4d' });
      Sim.circle(ctx, ex - px * wid * 0.17, ey - py * wid * 0.17, 2.6, { fill: '#a61e4d' });
    }
  }
  /* Electron-pair directions for 2 to 6 pairs, and which positions lone pairs take. */
  const T = Math.sqrt(8) / 3, H3 = Math.sqrt(3) / 2;
  const DIRS = {
    2: [[1, 0, 0], [-1, 0, 0]],
    3: [[0, 1, 0], [-H3, -0.5, 0], [H3, -0.5, 0]],
    4: [[0, 1, 0], [T, -1 / 3, 0], [-T / 2, -1 / 3, T * H3], [-T / 2, -1 / 3, -T * H3]],
    5: [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-0.5, 0, H3], [-0.5, 0, -H3]],
    6: [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]
  };
  const LP_POS = { 2: [[]], 3: [[], [0]], 4: [[], [0], [0, 1]], 5: [[], [2], [3, 4], [2, 3, 4]], 6: [[], [0], [0, 1]] };
  /* Bonding directions pushed away from the lone pairs (for the picture only). */
  function geometry(bp, lp) {
    const n = bp + lp;
    const dirs = DIRS[n];
    const lpIdx = LP_POS[n][lp];
    const lps = lpIdx.map((i) => dirs[i]);
    const sum = lps.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
    const bonds = dirs.filter((_, i) => !lpIdx.includes(i)).map((v) => norm([v[0] - 0.045 * sum[0], v[1] - 0.045 * sum[1], v[2] - 0.045 * sum[2]]));
    return { bonds, lps };
  }

  /* ======================================================================
     1. Ionic lattice, molten ionic compound and metal: sliding layers and
        conducting electricity
     ====================================================================== */
  const COLS = 8, ROWS = 5, TOP = 2;
  function newParticles(st) {
    st.ions = [];
    for (let k = 0; k < 36; k++) st.ions.push({ x: 0.06 + Math.random() * 0.88, y: 0.08 + Math.random() * 0.84, q: k % 2 ? -1 : 1, a: Math.random() * 6.28 });
    st.els = [];
    for (let k = 0; k < 46; k++) st.els.push({ x: Math.random(), y: Math.random(), a: Math.random() * 6.28 });
  }
  Sim.create('#sim-chem-03-lattice', {
    title: 'Ionic and metallic lattices under stress',
    alt: 'Rows of ions in a lattice; the top two rows can be slid sideways, showing attraction or repulsion between the layers, with an optional power supply',
    height: (w) => (w >= 560 ? 380 : 430),
    controls: [
      { key: 'kind', type: 'select', label: 'Substance', value: 'ionic', options: [['ionic', 'solid ionic compound (NaCl)'], ['molten', 'molten ionic compound'], ['metal', 'solid metal']] },
      { key: 'shift', label: 'Slide the top layers', min: 0, max: 1, step: 0.01, value: 0, format: (v) => v.toFixed(2) + ' × ion spacing' },
      { key: 'power', type: 'check', label: 'Connect a power supply', value: false }
    ],
    animate: true,
    init(s) { s.state.split = 0; newParticles(s.state); },
    update(s, dt) {
      const st = s.state, p = s.p;
      const target = p.kind === 'ionic' && p.shift >= 0.8 ? 1 : 0;
      st.split += clamp(target - st.split, -dt * 2, dt * 2);
      if (p.kind === 'molten') {
        st.ions.forEach((o) => {
          o.a += (Math.random() - 0.5) * 6 * dt;
          o.x += Math.cos(o.a) * 0.08 * dt;
          o.y += Math.sin(o.a) * 0.08 * dt;
          if (p.power) o.x += (o.q > 0 ? -1 : 1) * 0.07 * dt;
          if (o.y < 0.06 || o.y > 0.94) { o.a = -o.a; o.y = clamp(o.y, 0.06, 0.94); }
          if (o.x < 0.04 || o.x > 0.96) {
            if (p.power) { o.x = 0.3 + Math.random() * 0.4; o.y = 0.08 + Math.random() * 0.84; } // discharged; another ion takes its place
            else { o.a = Math.PI - o.a; o.x = clamp(o.x, 0.04, 0.96); }
          }
        });
      }
      if (p.kind === 'metal') {
        st.els.forEach((e) => {
          e.a += (Math.random() - 0.5) * 8 * dt;
          e.x += Math.cos(e.a) * 0.12 * dt + (p.power ? 0.10 * dt : 0);
          e.y += Math.sin(e.a) * 0.12 * dt;
          if (e.y < 0 || e.y > 1) { e.a = -e.a; e.y = clamp(e.y, 0, 1); }
          if (e.x > 1) e.x -= 1;
          if (e.x < 0) e.x += 1;
        });
      }
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const narrow = w < 560;
      const boxX = 34, boxY = 46, boxW = w - 68, boxH = h - 46 - 64;
      const d = Math.min((boxW - 20) / (COLS + 1), boxH / (ROWS + 0.64));
      const ox = boxX + (boxW - (COLS - 1) * d - d) / 2;
      const oy = boxY + (boxH - (ROWS + 0.64) * d) / 2 + 1.22 * d;   // room above for the top layers to lift
      // electrodes and supply
      if (p.power) {
        Sim.rect(ctx, 8, boxY, 12, boxH, { fill: '#495057', r: 2 });
        Sim.rect(ctx, w - 20, boxY, 12, boxH, { fill: '#495057', r: 2 });
        Sim.text(ctx, '−', 14, boxY - 12, { size: 18, bold: true, color: C.navy, align: 'center' });
        Sim.text(ctx, '+', w - 14, boxY - 12, { size: 18, bold: true, color: C.red, align: 'center' });
      }
      let msg = '', msgCol = C.ink, current = false;
      if (p.kind === 'molten') {
        Sim.rect(ctx, boxX, boxY, boxW, boxH, { fill: '#fff9db', stroke: '#e9ecef', r: 6 });
        st.ions.forEach((o) => {
          const x = boxX + o.x * boxW, y = boxY + o.y * boxH;
          const r = o.q > 0 ? d * 0.22 : d * 0.32;
          ball(ctx, x, y, r, o.q > 0 ? '#ff8787' : '#69db7c', o.q > 0 ? '#c92a2a' : '#2b8a3e');
          Sim.text(ctx, o.q > 0 ? '+' : '−', x, y + 1, { size: Math.max(10, r), bold: true, color: '#fff', align: 'center' });
        });
        current = p.power;
        msg = p.power ? 'Ions are free to move: Na⁺ drifts to the − electrode, Cl⁻ to the +. A current flows.' : 'The lattice has broken down: ions move freely, so there are no layers to slide.';
        msgCol = p.power ? C.green : C.muted;
      } else {
        const metal = p.kind === 'metal';
        const sx = p.shift * d;
        const lift = st.split * d * 0.8;
        if (metal) Sim.rect(ctx, boxX, boxY, boxW, boxH, { fill: 'rgba(77,171,247,0.10)', r: 6 });
        // interface between the moving and fixed layers
        const yTop = oy + (TOP - 1) * d - lift, yBot = oy + TOP * d;
        const facing = [];
        if (!metal) {
          for (let i = 0; i < COLS; i++) {
            const xt = ox + i * d + sx;
            let best = -1, bd = 1e9;
            for (let k = 0; k < COLS; k++) { const dd = Math.abs(ox + k * d - xt); if (dd < bd) { bd = dd; best = k; } }
            if (bd > d * 0.3) continue;
            const qt = (i + TOP - 1) % 2 === 0 ? 1 : -1, qb = (best + TOP) % 2 === 0 ? 1 : -1;
            facing.push({ xt, xb: ox + best * d, same: qt === qb });
          }
          facing.forEach((f) => { if (!f.same) Sim.line(ctx, f.xt, yTop, f.xb, yBot, { color: C.green, width: 4, alpha: 0.7 }); });
        }
        if (metal) {
          st.els.forEach((e) => {
            const x = boxX + e.x * boxW, y = boxY + e.y * boxH;
            Sim.circle(ctx, x, y, 2.6, { fill: C.blue });
          });
        }
        for (let j = 0; j < ROWS; j++) {
          for (let i = 0; i < COLS; i++) {
            const moving = j < TOP;
            let x = ox + i * d + (moving ? sx : 0), y = oy + j * d - (moving ? lift : 0);
            if (!metal && !p.power && s.running) { x += Math.sin(s.t * 23 + i * 1.7 + j) * 1.2; y += Math.cos(s.t * 19 + j * 2.3 + i) * 1.2; }
            if (metal) {
              ball(ctx, x, y, d * 0.33, '#a5d8ff', '#1c7ed6');
              Sim.text(ctx, '+', x, y + 1, { size: Math.max(11, d * 0.3), bold: true, color: '#0b4f8a', align: 'center' });
            } else {
              const q = (i + j) % 2 === 0 ? 1 : -1;
              const r = q > 0 ? d * 0.27 : d * 0.4;
              ball(ctx, x, y, r, q > 0 ? '#ff8787' : '#69db7c', q > 0 ? '#c92a2a' : '#2b8a3e');
              Sim.text(ctx, q > 0 ? '+' : '−', x, y + 1, { size: Math.max(11, r * 0.9), bold: true, color: '#fff', align: 'center' });
            }
          }
        }
        if (!metal && st.split > 0.3) {
          const yc = (yTop + yBot) / 2, pts = [];
          for (let x = boxX + 4, k = 0; x <= boxX + boxW - 4; x += 14, k++) pts.push([x, yc + (k % 2 ? 5 : -5)]);
          Sim.polyline(ctx, pts, { color: C.red, width: 1.5, alpha: Math.min(1, st.split) * 0.7, dash: [4, 3] });
        }
        facing.forEach((f) => {
          if (!f.same) return;
          const xm = (f.xt + f.xb) / 2, ym = (yTop + yBot) / 2, half = (yBot - yTop) / 2;
          Sim.arrow(ctx, xm, ym - 3, xm, ym - Math.max(10, half - d * 0.08), { color: C.red, width: 3, head: 9 });
          Sim.arrow(ctx, xm, ym + 3, xm, ym + Math.max(10, half - d * 0.08), { color: C.red, width: 3, head: 9 });
        });
        if (metal) {
          current = p.power;
          msg = p.shift > 0.05 ? 'The layers slide, but every ion still sits in the same sea of electrons: the bonding is unchanged, so the metal bends.' : 'Positive ions in a sea of delocalised electrons. Slide the top layers.';
          if (p.power) msg = 'Delocalised electrons drift towards the + terminal: metals conduct as solids. ' + (p.shift > 0.05 ? 'The slid layers make no difference.' : '');
          msgCol = p.power || p.shift > 0.05 ? C.green : C.muted;
        } else {
          if (p.shift < 0.2) { msg = 'Opposite charges face each other across the layers: strong attraction (green).'; msgCol = C.muted; }
          else if (p.shift < 0.8) { msg = 'Keep going: the attraction between the layers is weakening.'; msgCol = C.orange; }
          else { msg = 'Like charges now face each other and repel (red): the crystal splits. Ionic solids are brittle.'; msgCol = C.red; }
          if (p.power) { msg = 'No current: the ions are fixed in the lattice and can only vibrate.'; msgCol = C.red; }
        }
      }
      // label and status line
      const key = p.kind === 'metal' ? 'blue dots: delocalised electrons' : 'red: Na⁺   green: Cl⁻';
      Sim.text(ctx, key, boxX, 20, { size: 12, color: C.muted });
      if (p.power) {
        const bx = w - 120, by = 20;
        Sim.circle(ctx, bx, by, 8, { fill: current ? '#ffe066' : '#e9ecef', stroke: C.axis, width: 1.5 });
        Sim.text(ctx, current ? 'bulb lights' : 'bulb off', bx + 14, by, { size: 12, bold: true, color: current ? C.green : C.muted });
      }
      const lines = [];
      if (narrow && Sim.measure(ctx, msg, { size: 12.5, bold: true }) > w - 24) {
        const words = msg.split(' ');
        let cur = '';
        words.forEach((wd) => { const t = cur ? cur + ' ' + wd : wd; if (cur && Sim.measure(ctx, t, { size: 12.5, bold: true }) > w - 24) { lines.push(cur); cur = wd; } else cur = t; });
        lines.push(cur);
      } else lines.push(msg);
      lines.forEach((t, i) => Sim.text(ctx, t, w / 2, h - 40 + i * 17 - (lines.length > 1 ? 8 : -6), { size: 12.5, bold: true, color: msgCol, align: 'center' }));
    },
    readout(s) {
      const p = s.p;
      if (p.kind === 'molten') return [['Mobile charge carriers', 'ions'], ['Conducts', p.power ? 'yes' : 'yes, once connected', true]];
      if (p.kind === 'metal') return [['Mobile charge carriers', 'delocalised electrons'], ['Conducts', 'yes', true], ['Under stress', 'layers slide: malleable']];
      return [['Mobile charge carriers', 'none'], ['Conducts', 'no', true], ['Under stress', p.shift >= 0.8 ? 'shatters: brittle' : 'holds together']];
    }
  });

  /* ======================================================================
     2. Electron-pair repulsion: shape explorer
     ====================================================================== */
  const SHAPES = {
    '2,0': ['linear', '180°', 'BeCl₂, CO₂ (each C=O counts as one region)'],
    '3,0': ['trigonal planar', '120°', 'BF₃, AlCl₃, NO₃⁻'],
    '2,1': ['bent (V-shaped)', 'a little under 120° (SO₂: 119°)', 'SO₂, counting each S=O as one region'],
    '4,0': ['tetrahedral', '109.5°', 'CH₄, SiCl₄, NH₄⁺'],
    '3,1': ['trigonal pyramidal', '107°', 'NH₃, PCl₃, H₃O⁺'],
    '2,2': ['bent (V-shaped)', '104.5°', 'H₂O, OF₂'],
    '5,0': ['trigonal bipyramidal', '120° and 90°', 'PCl₅ (gas), PF₅'],
    '4,1': ['distorted tetrahedron (see-saw)', 'about 102° and 173°, squeezed from 120° and 180°', 'SF₄'],
    '3,2': ['T-shaped', 'about 87.5°, squeezed from 90°', 'ClF₃'],
    '2,3': ['linear', '180°', 'XeF₂, I₃⁻'],
    '6,0': ['octahedral', '90°', 'SF₆'],
    '5,1': ['square pyramidal', 'about 85°, squeezed from 90°', 'BrF₅'],
    '4,2': ['square planar', '90°', 'XeF₄']
  };
  const ARR = { 2: 'linear', 3: 'trigonal planar', 4: 'tetrahedral', 5: 'trigonal bipyramidal', 6: 'octahedral' };
  const MAXLP = { 2: 3, 3: 2, 4: 2, 5: 1, 6: 0 };

  Sim.create('#sim-chem-03-vsepr', {
    title: 'Shapes of molecules: electron-pair repulsion',
    alt: 'A rotating three-dimensional model of a central atom with the chosen numbers of bonding pairs, drawn as bonded atoms, and lone pairs, drawn as lobes',
    height: (w) => (w >= 600 ? 390 : 500),
    controls: [
      { key: 'bp', label: 'Bonding pairs', min: 2, max: 6, step: 1, value: 4, format: (v) => v.toFixed(0), onChange: (s, v) => { if (s.p.lp > MAXLP[v]) s.set('lp', MAXLP[v]); } },
      { key: 'lp', label: 'Lone pairs', min: 0, max: 3, step: 1, value: 0, format: (v) => v.toFixed(0), onChange: (s, v) => { if (v > MAXLP[s.p.bp]) s.set('lp', MAXLP[s.p.bp]); } },
      { key: 'showLp', type: 'check', label: 'Show lone pairs', value: true },
      { key: 'spin', type: 'check', label: 'Turn slowly', value: true }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state.yaw = 0.45; s.state.pitch = 0.32; s.state.drag = null; },
    update(s, dt) { if (s.p.spin && !s.state.drag) s.state.yaw += dt * 0.45; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const bp = p.bp, lp = Math.min(p.lp, MAXLP[p.bp]);
      const info = SHAPES[bp + ',' + lp];
      const wide = w >= 600;
      // text panel
      const tx = 16, ty = 22, tw = wide ? w * 0.4 : w - 32;
      const fs = wide ? 14 : 13;
      Sim.text(ctx, info[0], tx, ty, { size: wide ? 20 : 17, bold: true, color: C.navy });
      const lines = [
        ['Electron pairs: ' + (bp + lp) + ' (' + bp + ' bonding, ' + lp + ' lone)', C.ink],
        ['Pairs arranged: ' + ARR[bp + lp], C.ink],
        ['Bond angle: ' + info[1], C.red],
        ['Examples: ' + info[2], C.muted]
      ];
      let y = ty + 26;
      lines.forEach(([t, col]) => {
        const words = t.split(' ');
        let cur = '';
        words.forEach((wd) => { const tt = cur ? cur + ' ' + wd : wd; if (cur && Sim.measure(ctx, tt, { size: fs }) > tw) { Sim.text(ctx, cur, tx, y, { size: fs, color: col, bold: col === C.red }); y += fs + 6; cur = wd; } else cur = tt; });
        Sim.text(ctx, cur, tx, y, { size: fs, color: col, bold: col === C.red });
        y += fs + 8;
      });
      if (lp > 0 && wide) {
        Sim.text(ctx, 'Lone pairs repel more than bonding', tx, y + 6, { size: 12.5, color: '#a61e4d', italic: true });
        Sim.text(ctx, 'pairs, so they squeeze the bonds together.', tx, y + 22, { size: 12.5, color: '#a61e4d', italic: true });
      }
      Sim.text(ctx, 'drag to turn', wide ? w - 14 : w / 2, h - 12, { size: 11.5, color: C.muted, align: wide ? 'right' : 'center', italic: true });
      // molecule
      const cx = wide ? w * 0.7 : w / 2, cy = wide ? h / 2 + 6 : y + (h - y) / 2;
      const R = wide ? Math.min(w * 0.25, h * 0.38) : Math.min(w * 0.36, (h - y) * 0.4);
      const geo = geometry(bp, lp);
      const items = [];
      geo.bonds.forEach((v) => { const r = rot(v, st.yaw, st.pitch); items.push({ kind: 'b', r, z: r[2] }); });
      if (p.showLp) geo.lps.forEach((v) => { const r = rot(v, st.yaw, st.pitch); items.push({ kind: 'l', r, z: r[2] }); });
      items.push({ kind: 'c', z: 0 });
      items.sort((a, b) => a.z - b.z);
      const rc = R * 0.2, ra = R * 0.15;
      items.forEach((it) => {
        if (it.kind === 'c') { ball(ctx, cx, cy, rc, '#868e96', '#343a40'); Sim.text(ctx, 'A', cx, cy + 1, { size: rc * 0.8, bold: true, color: '#fff', align: 'center' }); return; }
        const sx = it.r[0], sy = -it.r[1];
        if (it.kind === 'b') {
          const x = cx + sx * R, yy = cy + sy * R;
          const shade = 0.75 + 0.25 * it.z;
          Sim.line(ctx, cx, cy, x, yy, { color: 'rgba(73,80,87,' + shade.toFixed(2) + ')', width: Math.max(4, R * 0.07), cap: 'round' });
          ball(ctx, x, yy, ra * (0.9 + 0.1 * it.z), '#74c0fc', '#1864ab');
        } else {
          const l = Math.hypot(sx, sy);
          const dx = l > 0.05 ? sx / l : 0, dy = l > 0.05 ? sy / l : -1;
          lobe(ctx, cx, cy, dx, dy, R * (0.3 + 0.38 * l), R * 0.34, true);
        }
      });
      if (!p.showLp && lp > 0) Sim.text(ctx, '(lone pairs hidden: the shape counts atoms only)', cx, cy + R + 22, { size: 11.5, color: C.muted, align: 'center', italic: true });
    },
    pointer: {
      down(s, pt) { s.state.drag = { x: pt.x, y: pt.y, yaw: s.state.yaw, pitch: s.state.pitch }; },
      move(s, pt) {
        const d = s.state.drag;
        if (!d || !pt.down) return;
        s.state.yaw = d.yaw + (pt.x - d.x) * 0.012;
        s.state.pitch = clamp(d.pitch + (pt.y - d.y) * 0.012, -1.4, 1.4);
      },
      up(s) { s.state.drag = null; },
      cursor: 'grab'
    },
    readout(s) {
      const bp = s.p.bp, lp = Math.min(s.p.lp, MAXLP[s.p.bp]);
      const info = SHAPES[bp + ',' + lp];
      return [['Shape', info[0], true], ['Bond angle', info[1]]];
    }
  });

  /* ======================================================================
     3. Polar bonds and polar molecules, with the charged-rod test
     ====================================================================== */
  const EN = { H: 2.1, B: 2.0, C: 2.5, N: 3.0, O: 3.5, Cl: 3.0, Na: 0.9 };
  const COL = { H: ['#f8f9fa', '#868e96'], C: ['#495057', '#212529'], N: ['#4dabf7', '#1864ab'], O: ['#ff6b6b', '#c92a2a'], Cl: ['#8ce99a', '#2b8a3e'], B: ['#fcc2d7', '#a61e4d'], Na: ['#b197fc', '#5f3dc4'] };
  function tetraMol(center, outer) {        // outer: 4 symbols in the four tetrahedral positions
    const atoms = [[center, 0, 0, 0]];
    DIRS[4].forEach((v, i) => atoms.push([outer[i], v[0], v[1], v[2]]));
    return { atoms, bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] };
  }
  function shapeMol(center, outer, bp, lp) {
    const g = geometry(bp, lp);
    const atoms = [[center, 0, 0, 0]];
    g.bonds.forEach((v, i) => atoms.push([outer[i], v[0], v[1], v[2]]));
    return { atoms, bonds: g.bonds.map((_, i) => [0, i + 1]), lps: g.lps };
  }
  const MOLS = {
    h2: { name: 'hydrogen, H₂', atoms: [['H', -0.45, 0, 0], ['H', 0.45, 0, 0]], bonds: [[0, 1]], state: 'gas' },
    cl2: { name: 'chlorine, Cl₂', atoms: [['Cl', -0.55, 0, 0], ['Cl', 0.55, 0, 0]], bonds: [[0, 1]], state: 'gas' },
    hcl: { name: 'hydrogen chloride, HCl', atoms: [['H', -0.5, 0, 0], ['Cl', 0.5, 0, 0]], bonds: [[0, 1]], state: 'gas' },
    co2: Object.assign(shapeMol('C', ['O', 'O'], 2, 0), { name: 'carbon dioxide, CO₂', state: 'gas', dbl: true }),
    h2o: Object.assign(shapeMol('O', ['H', 'H'], 2, 2), { name: 'water, H₂O', state: 'liquid', D: 1.85 }),
    nh3: Object.assign(shapeMol('N', ['H', 'H', 'H'], 3, 1), { name: 'ammonia, NH₃', state: 'gas' }),
    bcl3: Object.assign(shapeMol('B', ['Cl', 'Cl', 'Cl'], 3, 0), { name: 'boron trichloride, BCl₃', state: 'gas' }),
    ch4: Object.assign(tetraMol('C', ['H', 'H', 'H', 'H']), { name: 'methane, CH₄', state: 'gas' }),
    ccl4: Object.assign(tetraMol('C', ['Cl', 'Cl', 'Cl', 'Cl']), { name: 'tetrachloromethane, CCl₄', state: 'liquid', D: 0 }),
    chcl3: Object.assign(tetraMol('C', ['H', 'Cl', 'Cl', 'Cl']), { name: 'trichloromethane, CHCl₃', state: 'liquid', D: 1.04 }),
    ch2cl2: Object.assign(tetraMol('C', ['H', 'H', 'Cl', 'Cl']), { name: 'dichloromethane, CH₂Cl₂', state: 'liquid', D: 1.60 }),
    nacl: { name: 'sodium chloride, NaCl (ionic)', atoms: [['Na', -0.55, 0, 0], ['Cl', 0.62, 0, 0]], bonds: [], state: 'solid', ionic: true }
  };
  /* Bond dipoles point to the more electronegative atom; C–H (difference 0.4) is treated as non-polar. */
  function dipoles(M) {
    const list = [];
    let net = [0, 0, 0], maxD = 0, maxPair = null;
    M.bonds.forEach(([i, j]) => {
      const a = M.atoms[i], b = M.atoms[j];
      const d = EN[b[0]] - EN[a[0]];
      if (Math.abs(d) > Math.abs(maxD)) { maxD = d; maxPair = [a[0], b[0]]; }
      if (Math.abs(d) < 0.45) return;
      const v = norm([b[1] - a[1], b[2] - a[2], b[3] - a[3]]);
      const s = d > 0 ? 1 : -1;
      const vec = [v[0] * s * Math.abs(d), v[1] * s * Math.abs(d), v[2] * s * Math.abs(d)];
      list.push({ i, j, d: Math.abs(d), neg: d > 0 ? j : i, pos: d > 0 ? i : j, vec });
      net = [net[0] + vec[0], net[1] + vec[1], net[2] + vec[2]];
    });
    if (M.ionic) { maxD = EN.Cl - EN.Na; maxPair = ['Na', 'Cl']; }
    const mag = Math.hypot(net[0], net[1], net[2]);
    return { list, net, mag: mag < 1e-3 ? 0 : mag, maxD: Math.abs(maxD), maxPair };
  }

  Sim.create('#sim-chem-03-polarity', {
    title: 'Polar bonds, polar molecules',
    alt: 'A molecule with arrows showing each bond dipole and the overall dipole, a jet of liquid running past a charged rod, and a scale from covalent to ionic bonding',
    height: (w) => (w >= 620 ? 420 : 600),
    controls: [
      { key: 'mol', type: 'select', label: 'Substance', value: 'h2o', options: Object.keys(MOLS).map((k) => [k, MOLS[k].name]) },
      { key: 'rod', type: 'select', label: 'Charge on the rod', value: '+', options: [['+', 'positive (rubbed acetate)'], ['-', 'negative (rubbed polythene)']] }
    ],
    animate: true,
    playPause: false,
    resetButton: false,
    init(s) { s.state.yaw = 0.35; s.state.pitch = 0.22; s.state.flow = 0; s.state.bend = 0; },
    update(s, dt) {
      const st = s.state;
      if (!st.drag) st.yaw += dt * 0.25;
      st.flow = (st.flow + dt * 60) % 24;
      const M = MOLS[s.p.mol];
      const target = M.state === 'liquid' ? (M.D || 0) / 1.85 : 0;
      st.bend += clamp(target - st.bend, -dt * 1.5, dt * 1.5);
    },
    draw(s) {
      const { ctx, w, h, p } = s;
      const st = s.state;
      const M = MOLS[p.mol];
      const D = dipoles(M);
      const wide = w >= 620;
      /* --- molecule panel --- */
      const mw = wide ? w * 0.58 : w, mh = wide ? h - 92 : 300;
      const cx = mw / 2, cy = 72 + (mh - 72) / 2;
      const R = Math.min(mw * 0.3, (mh - 72) * 0.42);
      const polar = D.mag > 0;
      Sim.text(ctx, M.ionic ? 'ionic: electrons transferred, no molecules' : polar ? 'polar molecule' : 'non-polar molecule', 14, 18, { size: 15, bold: true, color: M.ionic ? C.purple : polar ? C.red : C.green });
      const P = M.atoms.map((a) => rot([a[1], a[2], a[3]], M.ionic ? 0 : st.yaw, M.ionic ? 0 : st.pitch));
      const scr = (r) => [cx + r[0] * R, cy - r[1] * R];
      if (M.ionic) {
        const a = scr(P[0]), b = scr(P[1]);
        ball(ctx, a[0], a[1], R * 0.22, COL.Na[0], COL.Na[1]);
        ball(ctx, b[0], b[1], R * 0.36, COL.Cl[0], COL.Cl[1]);
        Sim.text(ctx, 'Na⁺', a[0], a[1], { size: 15, bold: true, color: '#fff', align: 'center' });
        Sim.text(ctx, 'Cl⁻', b[0], b[1], { size: 16, bold: true, color: '#fff', align: 'center' });
        Sim.text(ctx, 'full charges, not δ+ and δ−', cx, cy + R * 0.62, { size: 12.5, color: C.muted, align: 'center' });
      } else {
        // lone pairs (drawn faintly behind)
        (M.lps || []).forEach((v) => {
          const r = rot(v, st.yaw, st.pitch);
          const l = Math.hypot(r[0], r[1]);
          lobe(ctx, cx, cy, l > 0.05 ? r[0] / l : 0, l > 0.05 ? -r[1] / l : -1, R * (0.25 + 0.3 * l), R * 0.28, true);
        });
        // bonds first, then the atoms from the back to the front
        M.bonds.forEach(([a, b]) => {
          const pa = scr(P[a]), pb = scr(P[b]);
          if (M.dbl) {
            const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy) || 1;
            const nx = -dy / l * 4, ny = dx / l * 4;
            Sim.line(ctx, pa[0] + nx, pa[1] + ny, pb[0] + nx, pb[1] + ny, { color: '#495057', width: 4 });
            Sim.line(ctx, pa[0] - nx, pa[1] - ny, pb[0] - nx, pb[1] - ny, { color: '#495057', width: 4 });
          } else Sim.line(ctx, pa[0], pa[1], pb[0], pb[1], { color: '#495057', width: 5 });
        });
        const items = M.atoms.map((a, i) => ({ i, z: P[i][2] }));
        items.sort((a, b) => a.z - b.z);
        items.forEach(({ i }) => {
          const a = M.atoms[i];
          const q = scr(P[i]);
          const r = (a[0] === 'H' ? 0.13 : a[0] === 'Cl' ? 0.2 : 0.17) * R * (0.92 + 0.08 * P[i][2]);
          ball(ctx, q[0], q[1], r, COL[a[0]][0], COL[a[0]][1]);
          Sim.text(ctx, a[0], q[0], q[1] + 1, { size: Math.max(11, r * 0.75), bold: true, color: a[0] === 'H' ? C.ink : '#fff', align: 'center' });
        });
        // partial charges and bond dipole arrows
        const charge = {};
        D.list.forEach((b) => { charge[b.neg] = '−'; if (charge[b.pos] !== '−') charge[b.pos] = '+'; });
        Object.keys(charge).forEach((i) => {
          const q = scr(P[i]);
          const dx = q[0] - cx, dy = q[1] - cy, l = Math.hypot(dx, dy);
          const ox = l > 2 ? dx / l * R * 0.3 : 0, oy = l > 2 ? dy / l * R * 0.3 : -R * 0.3;
          Sim.text(ctx, 'δ' + charge[i], q[0] + ox, q[1] + oy, { size: 14, bold: true, color: charge[i] === '−' ? C.red : C.blue, align: 'center', bg: 'rgba(255,255,255,0.8)', pad: 2 });
        });
        D.list.forEach((b) => {
          const pa = scr(P[b.pos]), pb = scr(P[b.neg]);
          const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy);
          if (l < 12) return;
          const nx = -dy / l * 13, ny = dx / l * 13;
          const s0 = 0.28, s1 = 0.78;
          Sim.arrow(ctx, pa[0] + dx * s0 + nx, pa[1] + dy * s0 + ny, pa[0] + dx * s1 + nx, pa[1] + dy * s1 + ny, { color: C.orange, width: 2, head: 7 });
        });
        if (polar) {
          const n = rot(D.net, st.yaw, st.pitch);
          const nl = Math.hypot(n[0], n[1]);
          const L = R * clamp(0.45 + D.mag * 0.4, 0.5, 1.05);
          if (nl > 0.08 * D.mag) {
            const ux = n[0] / nl, uy = -n[1] / nl;
            Sim.arrow(ctx, cx - ux * L * 0.5, cy - uy * L * 0.5, cx + ux * L * 0.5, cy + uy * L * 0.5, { color: C.red, width: 5, head: 15, alpha: 0.85 });
          }
          Sim.text(ctx, 'big red arrow: overall dipole', 14, 38, { size: 11.5, color: C.red });
        } else if (D.list.length) Sim.text(ctx, 'bond dipoles cancel by symmetry', 14, 38, { size: 11.5, color: C.green });
        if (D.list.length) Sim.text(ctx, 'orange arrows: bond dipoles, pointing to δ−', 14, 54, { size: 11.5, color: '#d9480f' });
        if (M.atoms.some((a) => a[0] === 'C') && M.atoms.some((a) => a[0] === 'H')) Sim.text(ctx, 'C–H bonds are treated as non-polar', 14, mh - 6, { size: 11, color: C.muted, italic: true });
      }
      /* --- jet panel --- */
      const jx0 = wide ? mw + 10 : 10, jy0 = wide ? 10 : mh + 6;
      const jw = wide ? w - mw - 20 : w - 20, jh = wide ? h - 92 - 10 : h - mh - 92;
      Sim.rect(ctx, jx0, jy0, jw, jh, { fill: '#f8f9fa', r: 8 });
      const nozX = jx0 + jw * 0.38, nozY = jy0 + 20;
      Sim.rect(ctx, nozX - 7, jy0 + 2, 14, 16, { fill: '#dee2e6', stroke: C.axis, width: 1.2 });
      Sim.text(ctx, 'burette jet', nozX + 12, jy0 + 10, { size: 11, color: C.muted });
      const rodX = nozX + jw * 0.32, rodY = jy0 + jh * 0.5;
      const liquid = M.state === 'liquid';
      if (liquid) {
        const bend = st.bend * jw * 0.24;
        const yEnd = jy0 + jh - 12;
        const pts = [];
        for (let k = 0; k <= 30; k++) {
          const t = k / 30;
          const y = nozY + t * (yEnd - nozY);
          const pull = bend * Math.pow(t, 1.6);
          pts.push([nozX + pull, y]);
        }
        Sim.polyline(ctx, pts, { color: '#4dabf7', width: 4 });
        for (let k = 0; k < 6; k++) {
          const t = ((st.flow / 24 + k / 6) % 1);
          const q = pts[Math.round(t * 30)];
          Sim.circle(ctx, q[0], q[1], 2.2, { fill: '#1971c2' });
        }
        if (st.bend > 0.05) {
          // a few molecules near the rod, turned with the opposite end towards it
          const near = pts[17];
          const sign = p.rod === '+' ? 1 : -1;
          Sim.text(ctx, sign > 0 ? 'δ− ends turn to the rod' : 'δ+ ends turn to the rod', near[0] - 6, near[1] + 26, { size: 11, color: C.purple, align: 'right' });
        }
      } else {
        Sim.text(ctx, M.state === 'gas' ? 'a gas at room temperature:' : 'a solid at room temperature:', jx0 + jw / 2, jy0 + jh / 2 - 9, { size: 12, color: C.muted, align: 'center' });
        Sim.text(ctx, 'it cannot be run as a jet', jx0 + jw / 2, jy0 + jh / 2 + 9, { size: 12, color: C.muted, align: 'center' });
      }
      // charged rod
      Sim.rect(ctx, rodX, rodY - 8, jx0 + jw - rodX - 6, 16, { fill: p.rod === '+' ? '#ffe3e3' : '#e7f5ff', stroke: p.rod === '+' ? C.red : C.blue, width: 1.5, r: 6 });
      for (let x = rodX + 8; x < jx0 + jw - 12; x += 13) Sim.text(ctx, p.rod === '+' ? '+' : '−', x, rodY + 1, { size: 12, bold: true, color: p.rod === '+' ? C.red : C.blue, align: 'center' });
      Sim.text(ctx, 'charged rod', rodX + 4, rodY + 20, { size: 11, color: C.muted });
      /* --- bonding scale --- */
      const sx0 = 20, sx1 = w - 20, sy = h - 46;
      const grd = ctx.createLinearGradient(sx0, 0, sx1, 0);
      grd.addColorStop(0, '#d3f9d8'); grd.addColorStop(0.55, '#fff3bf'); grd.addColorStop(1, '#e5dbff');
      Sim.rect(ctx, sx0, sy, sx1 - sx0, 16, { fill: grd, stroke: '#ced4da', width: 1, r: 8 });
      const xOf = (v) => sx0 + (v / 3.0) * (sx1 - sx0);
      Sim.line(ctx, xOf(1.7), sy - 3, xOf(1.7), sy + 19, { color: C.grey, dash: [3, 3], width: 1.2 });
      Sim.text(ctx, 'non-polar', sx0, sy + 30, { size: 11, color: C.green });
      Sim.text(ctx, 'polar covalent', xOf(1.0), sy + 30, { size: 11, color: '#e67700', align: 'center' });
      Sim.text(ctx, 'mainly ionic', sx1, sy + 30, { size: 11, color: C.purple, align: 'right' });
      const mx = xOf(D.maxD);
      Sim.line(ctx, mx, sy - 6, mx, sy + 22, { color: C.ink, width: 3 });
      const lab = D.maxPair ? D.maxPair[0] + '–' + D.maxPair[1] + ': difference ' + D.maxD.toFixed(1) : '';
      Sim.text(ctx, lab, clamp(mx, sx0 + 60, sx1 - 60), sy - 13, { size: 12, bold: true, color: C.ink, align: 'center', bg: 'rgba(255,255,255,0.9)' });
    },
    pointer: {
      down(s, pt) { s.state.drag = { x: pt.x, yaw: s.state.yaw }; },
      move(s, pt) { const d = s.state.drag; if (d && pt.down) s.state.yaw = d.yaw + (pt.x - d.x) * 0.012; },
      up(s) { s.state.drag = null; },
      cursor: 'grab'
    },
    readout(s) {
      const M = MOLS[s.p.mol];
      const D = dipoles(M);
      const r = [];
      if (M.ionic) return [['Bonding', 'ionic, electronegativity difference 2.1', true]];
      r.push(['Largest electronegativity difference', D.maxD.toFixed(1)]);
      r.push(['Molecule', D.mag > 0 ? 'polar' : 'non-polar', true]);
      if (M.state === 'liquid') r.push(['Jet', D.mag > 0 ? 'bends towards the rod (either charge)' : 'not deflected']);
      return r;
    }
  });
})();
