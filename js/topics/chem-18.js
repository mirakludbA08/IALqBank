/* Chemistry topic 18: Arenes — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const RAD = Math.PI / 180;

  // A curly arrow from (x1, y1) to (x2, y2), bowed sideways by `bend` pixels.
  function curly(ctx, x1, y1, x2, y2, bend, color) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const cx = mx - (dy / L) * bend, cy = my + (dx / L) * bend;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
    const ang = Math.atan2(y2 - cy, x2 - cx);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 10 * Math.cos(ang - 0.4), y2 - 10 * Math.sin(ang - 0.4));
    ctx.lineTo(x2 - 10 * Math.cos(ang + 0.4), y2 - 10 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  const vert = (cx, cy, R, k) => [cx + R * Math.cos((-90 + 60 * k) * RAD), cy + R * Math.sin((-90 + 60 * k) * RAD)];
  function hexagon(ctx, cx, cy, R, ring, skip) {
    for (let k = 0; k < 6; k++) {
      const a = vert(cx, cy, R, k), b = vert(cx, cy, R, k + 1);
      Sim.line(ctx, a[0], a[1], b[0], b[1], { color: C.ink, width: 2.2 });
    }
    if (ring === 'full') Sim.arc(ctx, cx, cy, R * 0.58, 0, Math.PI * 2, { color: C.ink, width: 2 });
    if (ring === 'horseshoe') {
      // open towards the attacked carbon (vertex 1, upper right)
      Sim.arc(ctx, cx, cy, R * 0.58, (-30 + 55) * RAD, (-30 + 305) * RAD, { color: C.ink, width: 2 });
      Sim.text(ctx, '+', cx - 2, cy + 2, { size: 18, bold: true, color: C.red, align: 'center' });
    }
    void skip;
  }

  /* ======================================================================
     1. Electrophilic substitution, step by step
     ====================================================================== */
  const RX = {
    br: { name: 'bromination', E: 'Br', Eplus: 'Br⁺', make: 'Br₂ + FeBr₃ → Br⁺ + FeBr₄⁻', regen: 'H⁺ + FeBr₄⁻ → FeBr₃ + HBr', product: 'bromobenzene' },
    no2: { name: 'nitration', E: 'NO₂', Eplus: 'NO₂⁺', make: 'HNO₃ + 2H₂SO₄ → NO₂⁺ + H₃O⁺ + 2HSO₄⁻', regen: 'H⁺ + HSO₄⁻ → H₂SO₄', product: 'nitrobenzene' },
    alk: { name: 'Friedel–Crafts alkylation', E: 'CH₂CH₃', Eplus: '⁺CH₂CH₃', make: 'CH₃CH₂Cl + AlCl₃ → CH₃CH₂⁺ + AlCl₄⁻', regen: 'H⁺ + AlCl₄⁻ → AlCl₃ + HCl', product: 'ethylbenzene' },
    acy: { name: 'Friedel–Crafts acylation', E: 'COCH₃', Eplus: 'CH₃CO⁺', make: 'CH₃COCl + AlCl₃ → CH₃CO⁺ + AlCl₄⁻', regen: 'H⁺ + AlCl₄⁻ → AlCl₃ + HCl', product: 'phenylethanone' }
  };
  const STEPS = ['1 · make the electrophile', '2 · the ring attacks E⁺', '3 · the intermediate loses H⁺', '4 · product, catalyst regenerated'];

  Sim.create('#sim-chem-18-mech', {
    title: 'Electrophilic substitution mechanisms',
    height: 300,
    controls: [
      { key: 'rx', type: 'select', label: 'Reaction', options: Object.keys(RX).map((k) => [k, RX[k].name]), value: 'no2' },
      { key: 'step', label: 'Step', min: 1, max: 4, step: 1, value: 1, format: (v) => STEPS[v - 1] }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const R = RX[p.rx];
      const cx = w * 0.42, cy = h / 2 + 10, Rr = Math.min(70, h * 0.24);
      const v1 = vert(cx, cy, Rr, 1);       // the carbon that is attacked (upper right)
      const out = [Math.cos(-30 * RAD), Math.sin(-30 * RAD)];
      Sim.text(ctx, STEPS[p.step - 1], 16, 20, { size: 13, bold: true, color: C.navy });
      if (p.step === 1) {
        Sim.text(ctx, R.make, w / 2, h / 2 - 10, { size: w >= 600 ? 18 : 14, bold: true, color: C.ink, align: 'center' });
        Sim.text(ctx, 'electrophile: ' + R.Eplus, w / 2, h / 2 + 24, { size: 14, color: C.red, align: 'center' });
        return;
      }
      if (p.step === 2) {
        hexagon(ctx, cx, cy, Rr, 'full');
        const ex = v1[0] + out[0] * 90, ey = v1[1] + out[1] * 90;
        Sim.text(ctx, R.Eplus, ex, ey, { size: 17, bold: true, color: C.red, align: 'center' });
        const s0 = [cx + Rr * 0.58 * out[0], cy + Rr * 0.58 * out[1]];
        curly(ctx, s0[0], s0[1], ex - 22, ey + 6, -30, C.red);
        Sim.text(ctx, 'the arrow starts from the delocalised ring', cx, cy + Rr + 34, { size: 12, color: C.muted, align: 'center' });
        return;
      }
      if (p.step === 3) {
        hexagon(ctx, cx, cy, Rr, 'horseshoe');
        // H and E both on the attacked carbon
        const hx = v1[0] + 16, hy = v1[1] - 34, Ex = v1[0] + 52, Ey = v1[1] + 2;
        Sim.line(ctx, v1[0], v1[1], hx, hy + 8, { color: C.ink, width: 2 });
        Sim.text(ctx, 'H', hx + 4, hy, { size: 16, bold: true, color: C.ink, align: 'center' });
        Sim.line(ctx, v1[0], v1[1], Ex - 18, Ey, { color: C.ink, width: 2 });
        Sim.text(ctx, R.E, Ex + 8, Ey + 1, { size: 15, bold: true, color: C.red });
        curly(ctx, (v1[0] + hx) / 2, (v1[1] + hy + 8) / 2, cx + Rr * 0.5, cy - Rr * 0.12, 28, C.red);
        Sim.text(ctx, 'the C–H bond electrons return to restore the ring', cx, cy + Rr + 34, { size: 12, color: C.muted, align: 'center' });
        return;
      }
      hexagon(ctx, cx, cy, Rr, 'full');
      const Ex = v1[0] + out[0] * 40, Ey = v1[1] + out[1] * 40;
      Sim.line(ctx, v1[0], v1[1], Ex, Ey, { color: C.ink, width: 2 });
      Sim.text(ctx, R.E, Ex + 4, Ey - 4, { size: 15, bold: true, color: C.red });
      Sim.text(ctx, R.product + '  +  H⁺', cx, cy + Rr + 30, { size: 14, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, R.regen, cx, cy + Rr + 52, { size: 13, color: C.ink, align: 'center' });
    },
    readout(s) {
      const R = RX[s.p.rx];
      const notes = [
        'the catalyst turns the reagent into a positive electrophile, ' + R.Eplus,
        'two electrons from the delocalised ring form a bond to the electrophile',
        'the positive intermediate has delocalisation over only five carbons; the carbon attacked holds H and ' + R.E,
        'losing H⁺ restores the stable delocalised ring, and H⁺ regenerates the catalyst'
      ];
      return [['Step ' + s.p.step, notes[s.p.step - 1], true]];
    }
  });

  /* ======================================================================
     2. Enthalpy of hydrogenation and bond lengths: Kekulé against reality
     ====================================================================== */
  Sim.create('#sim-chem-18-hydrog', {
    title: 'Is benzene cyclohexa-1,3,5-triene?',
    height: (w) => (w >= 640 ? 300 : 520),
    controls: [
      { key: 'model', type: 'select', label: 'Model', options: [['kek', 'Kekulé: three C=C bonds'], ['real', 'real benzene: delocalised']], value: 'kek' },
      { key: 'both', type: 'check', label: 'Show both on the diagram', value: false }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const wide = w >= 640;
      // enthalpy diagram: cyclohexane at the bottom
      const gx = 20, gw = wide ? w * 0.56 : w - 40, top = 30, bottom = wide ? h - 40 : 270;
      const scale = (bottom - top - 20) / 380;
      const y = (dh) => bottom - dh * scale;   // dh = enthalpy above cyclohexane
      Sim.line(ctx, gx, top - 10, gx, bottom + 6, { color: C.axis, width: 1.5 });
      Sim.text(ctx, 'enthalpy', gx + 6, top - 4, { size: 11.5, color: C.muted });
      const level = (x1, x2, dh, label, col) => {
        Sim.line(ctx, x1, y(dh), x2, y(dh), { color: col, width: 3 });
        Sim.text(ctx, label, x1, y(dh) - 8, { size: 11.5, bold: true, color: col });
      };
      level(gx + 10, gx + gw - 10, 0, 'cyclohexane', C.ink);
      // cyclohexene + H₂: −120
      level(gx + 14, gx + gw * 0.28, 120, 'cyclohexene + H₂', C.grey);
      Sim.arrow(ctx, gx + gw * 0.2, y(120), gx + gw * 0.2, y(0) - 2, { color: C.grey, width: 2 });
      Sim.text(ctx, '−120', gx + gw * 0.2 + 6, y(60), { size: 12, color: C.grey });
      const showK = p.model === 'kek' || p.both, showR = p.model === 'real' || p.both;
      const xk = gx + gw * 0.5, xr = gx + gw * 0.78;
      if (showK) {
        level(gx + gw * 0.36, gx + gw * 0.62, 360, 'Kekulé + 3H₂', C.orange);
        Sim.arrow(ctx, xk, y(360), xk, y(0) - 2, { color: C.orange, width: 2.4 });
        Sim.text(ctx, '−360 (3 × −120)', xk + 6, y(180), { size: 12, bold: true, color: C.orange });
      }
      if (showR) {
        level(gx + gw * 0.66, gx + gw - 10, 208, 'benzene + 3H₂', C.blue);
        Sim.arrow(ctx, xr, y(208), xr, y(0) - 2, { color: C.blue, width: 2.4 });
        Sim.text(ctx, '−208', xr + 6, y(104), { size: 12, bold: true, color: C.blue });
      }
      if (showK && showR) {
        Sim.arrow(ctx, gx + gw * 0.64, y(360), gx + gw * 0.64, y(208), { color: C.red, width: 2 });
        Sim.text(ctx, '152 kJ mol⁻¹: delocalisation energy', gx + gw * 0.64 - 6, y(300), { size: 11.5, bold: true, color: C.red, align: 'right' });
      }
      // the ring with its bond lengths
      const cx = wide ? w * 0.8 : w / 2, cy = wide ? h / 2 : 400, R = 62;
      for (let k = 0; k < 6; k++) {
        const a = vert(cx, cy, R, k), b = vert(cx, cy, R, k + 1);
        Sim.line(ctx, a[0], a[1], b[0], b[1], { color: C.ink, width: 2.2 });
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        if (p.model === 'kek' && k % 2 === 0) {
          const ix = cx + (mx - cx) * 0.8, iy = cy + (my - cy) * 0.8, dx = (b[0] - a[0]) * 0.32, dy = (b[1] - a[1]) * 0.32;
          Sim.line(ctx, ix - dx, iy - dy, ix + dx, iy + dy, { color: C.ink, width: 2.2 });
        }
        const lab = p.model === 'kek' ? (k % 2 === 0 ? '0.134' : '0.154') : '0.139';
        Sim.text(ctx, lab, cx + (mx - cx) * 1.32, cy + (my - cy) * 1.32, { size: 11, color: p.model === 'kek' ? C.orange : C.blue, align: 'center' });
      }
      if (p.model === 'real') Sim.arc(ctx, cx, cy, R * 0.58, 0, Math.PI * 2, { color: C.ink, width: 2 });
      Sim.text(ctx, 'C–C bond lengths / nm', cx, cy + R + 34, { size: 12, color: C.muted, align: 'center' });
    },
    readout(s) {
      return s.p.model === 'kek'
        ? [['Kekulé predicts', 'ΔH(hydrogenation) = −360 kJ mol⁻¹, and two different bond lengths', true], ['It also predicts', 'quick addition with bromine water, like an alkene']]
        : [['Measured', 'ΔH(hydrogenation) = −208 kJ mol⁻¹, all bonds 0.139 nm', true], ['So benzene is', '152 kJ mol⁻¹ more stable than Kekulé\'s structure, and resists addition']];
    }
  });
})();
