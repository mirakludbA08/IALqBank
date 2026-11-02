/* Chemistry topic 8: Redox chemistry and groups 1, 2 and 7 — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;
  const clamp = Sim.clamp;

  /* "2.0 × 10⁻⁵" style numbers */
  function sci(v) {
    if (v >= 0.01) return v.toPrecision(3).replace(/\.?0+$/, '');
    const e = Math.floor(Math.log10(v));
    const m = v / Math.pow(10, e);
    return m.toFixed(m < 9.95 ? 1 : 0) + ' × 10' + Sim.sup(e).replace('-', '⁻');
  }
  function wrapText(ctx, str, maxW, size) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    words.forEach((wd) => {
      const t = cur ? cur + ' ' + wd : wd;
      if (cur && Sim.measure(ctx, t, { size }) > maxW) { lines.push(cur); cur = wd; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }
  /* Bar chart of four values, one highlighted. o: { x, y, w, h, labels, vals, log, hi, title, fmt } */
  function bars(ctx, o) {
    const n = o.vals.length;
    const lo = o.log ? Math.floor(Math.log10(Math.min.apply(null, o.vals))) : 0;
    const top = o.log ? Math.ceil(Math.log10(Math.max.apply(null, o.vals)) + 0.15) : Math.max.apply(null, o.vals) * 1.15;
    const val = (v) => (o.log ? (Math.log10(v) - lo) / (top - lo) : v / top);
    Sim.text(ctx, o.title, o.x + o.w / 2, o.y - 14, { size: 12.5, bold: true, color: C.navy, align: 'center' });
    Sim.line(ctx, o.x, o.y + o.h, o.x + o.w, o.y + o.h, { color: C.axis, width: 1.5 });
    if (o.log) Sim.text(ctx, 'log scale', o.x + o.w, o.y + 2, { size: 10.5, color: C.muted, align: 'right', italic: true });
    const slot = o.w / n, bw = Math.min(56, slot * 0.6);
    for (let i = 0; i < n; i++) {
      const cx = o.x + slot * (i + 0.5);
      const hgt = Math.max(2, val(o.vals[i]) * (o.h - 16));
      const on = i === o.hi;
      Sim.rect(ctx, cx - bw / 2, o.y + o.h - hgt, bw, hgt, { fill: on ? C.orange : '#a5c8ff', r: 3 });
      Sim.text(ctx, o.fmt(o.vals[i]), cx, o.y + o.h - hgt - 9, { size: on ? 12 : 11, bold: on, color: on ? C.orange : C.ink, align: 'center' });
      Sim.text(ctx, o.labels[i], cx, o.y + o.h + 13, { size: 13, bold: on, color: on ? C.orange : C.ink, align: 'center' });
    }
  }

  /* ======================================================================
     1. Group 2 explorer
     ====================================================================== */
  const G2 = [
    { sym: 'Mg', name: 'magnesium', Z: 12, shells: 3, inner: 10, conf: '[Ne] 3s²', ion: 72,
      water: 'Very slow with cold water (Mg + 2H₂O → Mg(OH)₂ + H₂); burns in steam with a white flame (Mg + H₂O(g) → MgO + H₂)',
      flame: 'no colour', fcol: null, pH: 'about 10 (Mg(OH)₂ is almost insoluble)' },
    { sym: 'Ca', name: 'calcium', Z: 20, shells: 4, inner: 18, conf: '[Ar] 4s²', ion: 100,
      water: 'Steady fizzing in cold water; cloudy white suspension forms (Ca + 2H₂O → Ca(OH)₂ + H₂)',
      flame: 'brick red', fcol: '#d9480f', pH: 'about 12.5' },
    { sym: 'Sr', name: 'strontium', Z: 38, shells: 5, inner: 36, conf: '[Kr] 5s²', ion: 118,
      water: 'Faster fizzing in cold water; less precipitate (Sr + 2H₂O → Sr(OH)₂ + H₂)',
      flame: 'crimson red', fcol: '#d6194b', pH: 'about 12.8' },
    { sym: 'Ba', name: 'barium', Z: 56, shells: 6, inner: 54, conf: '[Xe] 6s²', ion: 135,
      water: 'Vigorous fizzing in cold water; Ba(OH)₂ dissolves (Ba + 2H₂O → Ba(OH)₂ + H₂)',
      flame: 'apple green', fcol: '#74b816', pH: 'about 13.5' }
  ];
  const G2P = {
    radius: { opt: 'Atomic radius', title: 'atomic radius / pm', vals: [160, 197, 215, 217], fmt: (v) => String(v),
      why: 'Each element down the group has one more occupied shell, so the atoms get bigger.' },
    ie1: { opt: 'First ionisation energy', title: '1st ionisation energy / kJ mol⁻¹', vals: [738, 590, 550, 503], fmt: (v) => String(v),
      why: 'The outer electrons are further from the nucleus and more shielded; this outweighs the larger nuclear charge.' },
    ie12: { opt: '1st + 2nd ionisation energies', title: '1st + 2nd ionisation energies / kJ mol⁻¹', vals: [2189, 1735, 1614, 1468], fmt: (v) => String(v),
      why: 'Forming M²⁺ means removing both outer electrons. This gets easier down the group, so reactivity increases.' },
    oh: { opt: 'Solubility of the hydroxide', title: 'solubility of M(OH)₂ / mol per 100 g water', vals: [2.0e-5, 1.5e-3, 3.4e-3, 1.5e-2], log: true, fmt: sci,
      why: 'Hydroxides become MORE soluble down the group, so their saturated solutions become more alkaline.' },
    so4: { opt: 'Solubility of the sulfate', title: 'solubility of MSO₄ / mol per 100 g water', vals: [1.83e-1, 4.66e-3, 7.11e-5, 9.43e-7], log: true, fmt: sci,
      why: 'Sulfates become LESS soluble down the group. BaSO₄ is almost insoluble, which is the basis of the sulfate test.' },
    co3: { opt: 'Carbonate decomposition temperature', title: 'decomposition temperature of MCO₃ / °C', vals: [540, 900, 1280, 1360], fmt: (v) => String(v),
      why: 'Bigger M²⁺ ions have a lower charge density, distort the carbonate ion less, and need more heat to break it up.' }
  };

  function drawAtom(ctx, cx, cy, rMax, el, t) {
    const rOut = rMax * G2P.radius.vals[G2.indexOf(el)] / 217;
    const rNuc = 9;
    // shielding region
    Sim.circle(ctx, cx, cy, rOut * 0.86, { fill: 'rgba(134,142,150,0.12)' });
    for (let k = 1; k < el.shells; k++) {
      const r = rNuc + (rOut - rNuc) * k / el.shells;
      Sim.circle(ctx, cx, cy, r, { stroke: '#ced4da', width: 1.2 });
    }
    Sim.circle(ctx, cx, cy, rOut, { stroke: C.blue, width: 1.8, dash: [4, 3] });
    Sim.circle(ctx, cx, cy, rNuc + 4, { fill: C.red });
    Sim.text(ctx, '+' + el.Z, cx, cy + 1, { size: 11, bold: true, color: '#fff', align: 'center' });
    for (let j = 0; j < 2; j++) {
      const a = -Math.PI / 2 + j * Math.PI;
      Sim.circle(ctx, cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut, 5, { fill: C.blue, stroke: '#fff', width: 1.5 });
    }
    Sim.line(ctx, cx, cy, cx + rOut, cy, { color: C.muted, width: 1, dash: [2, 3] });
    Sim.text(ctx, G2P.radius.vals[G2.indexOf(el)] + ' pm', cx + rOut / 2, cy - 9, { size: 11, color: C.muted, align: 'center' });
  }
  function drawPolarise(ctx, cx, cy, panW, el) {
    const k = 0.21;                                  // px per pm (same scale for both ions)
    const rIon = el.ion * k;
    const ix = cx - panW * 0.22;
    Sim.circle(ctx, ix, cy, rIon, { fill: 'rgba(224,49,49,0.18)', stroke: C.red, width: 2 });
    Sim.text(ctx, el.sym + '²⁺', ix, cy, { size: 13, bold: true, color: C.red, align: 'center' });
    Sim.text(ctx, el.ion + ' pm', ix, cy + rIon + 13, { size: 11, color: C.muted, align: 'center' });
    // carbonate ion: electron cloud pulled towards the cation
    const ccx = cx + panW * 0.2, R = 178 * k;     // carbonate ion radius about 178 pm
    const pull = clamp(2.3 * (72 / el.ion) * (72 / el.ion), 0.3, 2.3);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const toward = Math.max(0, -Math.cos(a));
      const r = R * (1 + 0.32 * pull * Math.pow(toward, 3));
      const x = ccx + Math.cos(a) * r, y = cy + Math.sin(a) * R * (1 - 0.08 * pull * toward);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(77,171,247,0.28)';
    ctx.fill();
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // CO3 skeleton
    const O = [[0, -18], [-16, 10], [16, 10]];
    O.forEach(([dx, dy]) => {
      Sim.line(ctx, ccx, cy, ccx + dx, cy + dy, { color: C.ink, width: 2 });
      Sim.circle(ctx, ccx + dx, cy + dy, 6, { fill: '#fff', stroke: C.red, width: 1.5 });
    });
    Sim.circle(ctx, ccx, cy, 5, { fill: C.ink });
    Sim.text(ctx, 'CO₃²⁻', ccx, cy + R + 14, { size: 12, bold: true, color: C.navy, align: 'center' });
    Sim.text(ctx, pull > 1.2 ? 'strongly distorted' : pull > 0.7 ? 'distorted' : 'slightly distorted', ccx, cy - R - 12, { size: 11.5, color: C.blue, align: 'center' });
  }

  Sim.create('#sim-chem-08-group2', {
    title: 'Group 2 explorer',
    height: (w) => (w >= 640 ? 340 : 520),
    controls: [
      { key: 'el', type: 'select', label: 'Element', options: G2.map((e, i) => [String(i), e.name + ' (' + e.sym + ')']), value: '0' },
      { key: 'prop', type: 'select', label: 'Property', options: Object.keys(G2P).map((k) => [k, G2P[k].opt]), value: 'radius' }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const el = G2[+p.el];
      const P = G2P[p.prop];
      const wide = w >= 640;
      let ax, ay, aw, ah, cb;
      if (wide) { ax = 10; ay = 10; aw = w * 0.42; ah = h - 20; cb = { x: aw + 40, y: 46, w: w - aw - 60, h: h - 46 - 40 }; }
      else { ax = 10; ay = 10; aw = w - 20; ah = 230; cb = { x: 30, y: ah + 70, w: w - 50, h: h - ah - 70 - 34 }; }
      const cx = ax + aw / 2, cy = ay + ah / 2 + 6;
      if (p.prop === 'co3') {
        Sim.text(ctx, 'charge density of the cation', cx, ay + 12, { size: 12.5, bold: true, color: C.navy, align: 'center' });
        drawPolarise(ctx, cx, cy, aw, el);
      } else {
        Sim.text(ctx, el.name + ': ' + el.conf, cx, ay + 12, { size: 12.5, bold: true, color: C.navy, align: 'center' });
        drawAtom(ctx, cx, cy, Math.min(aw, ah - 40) / 2 - 6, el, 0);
        Sim.text(ctx, el.inner + ' inner electrons shield the 2 outer ones', cx, ay + ah - 6, { size: 11.5, color: C.muted, align: 'center' });
      }
      bars(ctx, Object.assign({}, cb, { labels: G2.map((e) => e.sym), vals: P.vals, log: P.log, hi: +p.el, title: P.title, fmt: P.fmt }));
    },
    readout(s) {
      const el = G2[+s.p.el];
      const P = G2P[s.p.prop];
      const sw = el.fcol ? '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + el.fcol + ';vertical-align:-1px;margin-right:5px"></span>' : '';
      return [
        ['Trend', P.why, true],
        ['With water', el.water],
        ['Flame colour', sw + el.flame],
        ['Saturated hydroxide pH', el.pH]
      ];
    }
  });

  /* ======================================================================
     2. Halogen displacement lab
     ====================================================================== */
  const HAL = [
    { key: 'cl', x2: 'Cl₂', name: 'chlorine', ion: 'Cl⁻', salt: 'KCl', aq: 'rgba(205,235,170,0.55)', org: 'rgba(205,235,170,0.65)', aqName: 'very pale green', orgName: 'very pale green' },
    { key: 'br', x2: 'Br₂', name: 'bromine', ion: 'Br⁻', salt: 'KBr', aq: 'rgba(247,159,31,0.70)', org: 'rgba(232,89,12,0.85)', aqName: 'yellow-orange', orgName: 'orange-red' },
    { key: 'i', x2: 'I₂', name: 'iodine', ion: 'I⁻', salt: 'KI', aq: 'rgba(140,80,20,0.78)', org: 'rgba(132,46,170,0.85)', aqName: 'brown', orgName: 'violet' }
  ];
  function dispResult(a, b) {
    const X = HAL[a], Y = HAL[b];
    if (a === b) return { react: false, free: a, msg: 'No reaction: ' + X.name + ' cannot displace itself.' };
    if (a < b) {
      return {
        react: true, free: b,
        eq: X.x2 + '(aq) + 2' + Y.ion + '(aq) → 2' + X.ion + '(aq) + ' + Y.x2 + '(aq)',
        half: X.x2 + ' + 2e⁻ → 2' + X.ion + '   and   2' + Y.ion + ' → ' + Y.x2 + ' + 2e⁻',
        msg: X.name[0].toUpperCase() + X.name.slice(1) + ' is the stronger oxidising agent, so it takes electrons from ' + Y.name.replace(/ine$/, 'ide') + ' ions and frees ' + Y.name + '.'
      };
    }
    return { react: false, free: a, msg: 'No reaction: ' + X.name + ' is a weaker oxidising agent than ' + Y.name + ', so it cannot oxidise ' + Y.name.replace(/ine$/, 'ide') + ' ions.' };
  }
  function tube(ctx, x, y, tw, th, layers) {
    // layers: [{ from, to, fill }] as fractions of the height from the bottom
    const r = tw / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + th - r);
    ctx.arc(x + r, y + th - r, r, Math.PI, 0, true);
    ctx.lineTo(x + tw, y);
    ctx.clip();
    layers.forEach((L) => {
      const top = y + th - L.to * th, bot = y + th - L.from * th;
      ctx.fillStyle = L.fill;
      ctx.fillRect(x, top, tw, bot - top);
    });
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x, y + th - r);
    ctx.arc(x + r, y + th - r, r, Math.PI, 0, true);
    ctx.lineTo(x + tw, y - 4);
    ctx.strokeStyle = '#868e96';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  Sim.create('#sim-chem-08-displace', {
    title: 'Halogen displacement',
    height: (w) => (w >= 640 ? 340 : 540),
    controls: [
      { key: 'x', type: 'select', label: 'Halogen solution added', options: HAL.map((x, i) => [String(i), x.name + ' water, ' + x.x2 + '(aq)']), value: '0' },
      { key: 'y', type: 'select', label: 'Halide solution', options: HAL.map((x, i) => [String(i), 'potassium ' + x.name.replace(/ine$/, 'ide') + ', ' + x.salt + '(aq)']), value: '1' },
      { key: 'shake', type: 'check', label: 'Add cyclohexane and shake', value: false },
      { type: 'button', label: 'Clear results table', ghost: true, onClick: (s) => { s.state.tried = {}; } }
    ],
    init(s) { s.state.tried = {}; },
    draw(s) {
      const { ctx, w, h, p } = s;
      const a = +p.x, b = +p.y;
      const R = dispResult(a, b);
      s.state.tried[a + '' + b] = R.react;
      const wide = w >= 640;
      const pw = wide ? w * 0.55 : w;
      const ph = wide ? h : 300;
      // the test tube
      const tw = 56, th = 190, tx = pw / 2 - tw / 2, ty = 54;
      const F = HAL[R.free];
      let layers;
      if (p.shake) {
        layers = [
          { from: 0, to: 0.48, fill: F.aq.replace(/[\d.]+\)$/, (m) => (parseFloat(m) * 0.35).toFixed(2) + ')') },
          { from: 0.48, to: 0.72, fill: F.org }
        ];
      } else layers = [{ from: 0, to: 0.48, fill: F.aq }];
      tube(ctx, tx, ty, tw, th, layers);
      if (p.shake) {
        Sim.text(ctx, 'cyclohexane layer', tx + tw + 10, ty + th - 0.6 * th, { size: 12, color: C.ink });
        Sim.text(ctx, '(' + F.orgName + ')', tx + tw + 10, ty + th - 0.6 * th + 16, { size: 12, bold: true, color: C.ink });
        Sim.text(ctx, 'aqueous layer', tx + tw + 10, ty + th - 0.24 * th, { size: 12, color: C.ink });
      } else {
        Sim.text(ctx, 'aqueous mixture', tx + tw + 10, ty + th - 0.3 * th, { size: 12, color: C.ink });
        Sim.text(ctx, '(' + F.aqName + ')', tx + tw + 10, ty + th - 0.3 * th + 16, { size: 12, bold: true, color: C.ink });
      }
      Sim.text(ctx, HAL[a].x2 + '(aq) added to ' + HAL[b].salt + '(aq)', pw / 2, 18, { size: 13.5, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, R.react ? HAL[R.free].name + ' has been displaced' : 'no reaction', pw / 2, 38, { size: 13, bold: true, color: R.react ? C.green : C.muted, align: 'center' });
      const eqLines = wrapText(ctx, R.react ? R.eq : R.msg, pw - 30, 12.5);
      eqLines.forEach((ln, i) => Sim.text(ctx, ln, pw / 2, ty + th + 26 + i * 17, { size: 12.5, color: R.react ? C.ink : C.muted, align: 'center', bold: R.react }));

      // results grid
      const gx = wide ? pw + 10 : 16, gy = wide ? 40 : ph + 30, gw = wide ? w - pw - 26 : w - 32;
      const cw = gw / 4, ch = 34;
      Sim.text(ctx, 'Your results', gx + gw / 2, gy - 14, { size: 13, bold: true, color: C.navy, align: 'center' });
      Sim.text(ctx, 'added →', gx + cw / 2, gy + ch / 2, { size: 11, color: C.muted, align: 'center' });
      HAL.forEach((X, i) => {
        Sim.rect(ctx, gx + cw * (i + 1), gy, cw, ch, { fill: '#edf2ff', stroke: '#dee2e6', width: 1 });
        Sim.text(ctx, X.x2, gx + cw * (i + 1.5), gy + ch / 2, { size: 13, bold: true, color: C.navy, align: 'center' });
        Sim.rect(ctx, gx, gy + ch * (i + 1), cw, ch, { fill: '#edf2ff', stroke: '#dee2e6', width: 1 });
        Sim.text(ctx, X.salt, gx + cw / 2, gy + ch * (i + 1.5), { size: 13, bold: true, color: C.navy, align: 'center' });
      });
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const x = gx + cw * (i + 1), y = gy + ch * (j + 1);
          const cur = i === a && j === b;
          Sim.rect(ctx, x, y, cw, ch, { fill: cur ? '#fff4e6' : '#fff', stroke: cur ? C.orange : '#dee2e6', width: cur ? 2 : 1 });
          const k = i + '' + j;
          if (k in s.state.tried) {
            const ok = s.state.tried[k];
            Sim.text(ctx, ok ? '✓ reacts' : '✗', x + cw / 2, y + ch / 2, { size: 12.5, bold: ok, color: ok ? C.green : C.grey, align: 'center' });
          }
        }
      }
      const done = Object.keys(s.state.tried).length;
      Sim.text(ctx, done < 9 ? 'tried ' + done + ' of 9 combinations' : 'all 9 done: oxidising power Cl₂ > Br₂ > I₂', gx + gw / 2, gy + ch * 4 + 18, { size: 12, color: done < 9 ? C.muted : C.green, bold: done >= 9, align: 'center' });
    },
    readout(s) {
      const R = dispResult(+s.p.x, +s.p.y);
      if (!R.react) return [['Result', R.msg]];
      return [['Ionic equation', R.eq, true], ['Half-equations', R.half], ['Why', R.msg]];
    }
  });

  /* ======================================================================
     3. Group 7 explorer
     ====================================================================== */
  const G7 = [
    { sym: 'F', x2: 'F₂', name: 'fluorine', state: 'very pale yellow gas', col: 'rgba(240,230,140,0.35)', vapour: null, phase: 'g', rad: 71,
      ag: { txt: 'no precipitate (AgF is soluble)', col: null }, nh3: '—',
      h2so4: 'HF only (steamy fumes); acid–base reaction, no redox' },
    { sym: 'Cl', x2: 'Cl₂', name: 'chlorine', state: 'pale green gas', col: 'rgba(170,215,90,0.45)', vapour: null, phase: 'g', rad: 99,
      ag: { txt: 'white precipitate, AgCl', col: '#ffffff' }, nh3: 'dissolves in dilute ammonia',
      h2so4: 'HCl only (steamy fumes); acid–base reaction, no redox' },
    { sym: 'Br', x2: 'Br₂', name: 'bromine', state: 'red-brown liquid, orange-brown vapour', col: 'rgba(150,40,10,0.92)', vapour: 'rgba(214,110,40,0.35)', phase: 'l', rad: 114,
      ag: { txt: 'cream precipitate, AgBr', col: '#f3e5b5' }, nh3: 'dissolves in concentrated ammonia only',
      h2so4: 'HBr, then Br₂ (orange fumes) and SO₂: S reduced from +6 to +4' },
    { sym: 'I', x2: 'I₂', name: 'iodine', state: 'grey-black solid, purple vapour', col: '#343a40', vapour: 'rgba(132,46,170,0.30)', phase: 's', rad: 133,
      ag: { txt: 'pale yellow precipitate, AgI', col: '#f6e58d' }, nh3: 'insoluble, even in concentrated ammonia',
      h2so4: 'HI, then I₂ (purple fumes, black solid), SO₂, S (yellow) and H₂S (bad eggs): S reduced to +4, 0 and −2' }
  ];
  const G7P = {
    bp: { opt: 'Boiling temperature', title: 'boiling temperature / K', vals: [85, 239, 332, 457], fmt: (v) => v + ' K',
      why: 'More electrons per molecule means stronger London forces, so more energy is needed to separate the molecules.' },
    mp: { opt: 'Melting temperature', title: 'melting temperature / K', vals: [53, 172, 266, 387], fmt: (v) => v + ' K',
      why: 'Stronger London forces down the group: the halogens go from gases to a liquid to a solid.' },
    ele: { opt: 'Electrons per molecule', title: 'electrons in one X₂ molecule', vals: [18, 34, 70, 106], fmt: (v) => String(v),
      why: 'This is what makes the London forces stronger down the group.' },
    en: { opt: 'Electronegativity', title: 'electronegativity (Pauling scale)', vals: [4.0, 3.2, 3.0, 2.7], fmt: (v) => v.toFixed(1),
      why: 'Bigger atoms with more shielding attract a bonding pair less strongly.' },
    rad: { opt: 'Atomic radius', title: 'atomic (covalent) radius / pm', vals: [71, 99, 114, 133], fmt: (v) => String(v),
      why: 'One more shell of electrons for each element down the group.' }
  };

  Sim.create('#sim-chem-08-halogens', {
    title: 'Group 7 explorer',
    height: (w) => (w >= 640 ? 360 : 600),
    controls: [
      { key: 'el', type: 'select', label: 'Halogen', options: G7.map((e, i) => [String(i), e.name + ' (' + e.x2 + ')']), value: '1' },
      { key: 'prop', type: 'select', label: 'Property', options: Object.keys(G7P).map((k) => [k, G7P[k].opt]), value: 'bp' }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const i = +p.el;
      const el = G7[i];
      const P = G7P[p.prop];
      const wide = w >= 640;
      const aw = wide ? w * 0.44 : w;
      const ah = wide ? h : 300;
      // sample bottle showing the element at room temperature
      const bx = wide ? 26 : aw * 0.08, by = 50, bw = 64, bh = 120;
      Sim.text(ctx, el.x2 + ' at room temperature', bx + bw / 2 + (wide ? 50 : 40), 18, { size: 12.5, bold: true, color: C.navy, align: 'center' });
      Sim.rect(ctx, bx, by, bw, bh, { fill: '#f8f9fa', stroke: '#868e96', width: 2, r: 6 });
      Sim.rect(ctx, bx + 16, by - 12, bw - 32, 14, { fill: '#adb5bd', r: 2 });
      if (el.phase === 'g') Sim.rect(ctx, bx + 3, by + 3, bw - 6, bh - 6, { fill: el.col, r: 4 });
      else if (el.phase === 'l') { Sim.rect(ctx, bx + 3, by + 3, bw - 6, bh - 6, { fill: el.vapour, r: 4 }); Sim.rect(ctx, bx + 3, by + bh * 0.7, bw - 6, bh * 0.3 - 3, { fill: el.col, r: 3 }); }
      else {
        Sim.rect(ctx, bx + 3, by + 3, bw - 6, bh - 6, { fill: el.vapour, r: 4 });
        for (let k = 0; k < 7; k++) Sim.rect(ctx, bx + 8 + k * 7, by + bh - 14 - (k % 3) * 3, 9, 9, { fill: el.col, r: 1 });
      }
      const st = wrapText(ctx, el.state, wide ? aw - bw - 60 : aw - bw - bx - 30, 12);
      st.forEach((ln, k) => Sim.text(ctx, ln, bx + bw + 14, by + 30 + k * 16, { size: 12, color: C.ink }));
      // X–X molecule drawn to scale
      const k = 0.17;
      const r = el.rad * k;
      const mx = bx + bw + 14 + r, my = by + bh - 24;
      Sim.circle(ctx, mx, my, r, { fill: 'rgba(77,171,247,0.25)', stroke: C.blue, width: 1.5 });
      Sim.circle(ctx, mx + r * 1.25, my, r, { fill: 'rgba(77,171,247,0.25)', stroke: C.blue, width: 1.5 });
      Sim.text(ctx, el.x2 + ' (to scale)', mx + r * 0.62, my + r + 12, { size: 11, color: C.muted, align: 'center' });
      // silver nitrate test tube
      const tx = bx + 8, ty = by + bh + 30, tw = 30, th = 70;
      {
        const layers = [{ from: 0, to: 0.62, fill: 'rgba(208,228,255,0.55)' }];
        if (el.ag.col) layers.push({ from: 0, to: 0.2, fill: el.ag.col });
        tube(ctx, tx, ty, tw, th, layers);
        if (el.ag.col) {
          ctx.save();
          for (let q = 0; q < 14; q++) Sim.circle(ctx, tx + 5 + (q * 7) % 20, ty + th - 8 - ((q * 5) % 13), 2.2, { fill: el.ag.col, stroke: 'rgba(0,0,0,0.12)', width: 0.8 });
          ctx.restore();
        }
        Sim.text(ctx, 'add HNO₃(aq) then AgNO₃(aq) to ' + el.sym + '⁻(aq):', tx + tw + 12, ty + 14, { size: 12, color: C.ink });
        const ag = wrapText(ctx, el.ag.txt, (wide ? aw : w) - tx - tw - 30, 12);
        ag.forEach((ln, q) => Sim.text(ctx, ln, tx + tw + 12, ty + 32 + q * 15, { size: 12, bold: true, color: C.ink }));
      }
      const cb = wide ? { x: aw + 30, y: 48, w: w - aw - 50, h: h - 48 - 34 } : { x: 30, y: ah + 50, w: w - 50, h: h - ah - 50 - 30 };
      bars(ctx, Object.assign({}, cb, { labels: G7.map((e) => e.sym), vals: P.vals, hi: i, title: P.title, fmt: P.fmt }));
    },
    readout(s) {
      const el = G7[+s.p.el];
      const P = G7P[s.p.prop];
      return [
        ['Trend', P.why, true],
        ['Silver halide + NH₃(aq)', el.nh3],
        ['Solid Na' + el.sym + ' + conc. H₂SO₄', el.h2so4],
        ['Oxidising power of X₂', 'F₂ > Cl₂ > Br₂ > I₂'],
        ['Reducing power of X⁻', 'I⁻ > Br⁻ > Cl⁻ > F⁻']
      ];
    }
  });
})();
