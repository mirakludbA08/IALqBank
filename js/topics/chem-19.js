/* Chemistry topic 19: Organic nitrogen compounds — interactive diagrams */
(function () {
  'use strict';
  const C = Sim.C;

  /* ======================================================================
     1. Glycine: cation, zwitterion and anion against pH (pKa 2.34 and 9.60)
     ====================================================================== */
  const PK1 = 2.34, PK2 = 9.60;
  function forms(pH) {
    const h = Math.pow(10, -pH), k1 = Math.pow(10, -PK1), k2 = Math.pow(10, -PK2);
    const d = h * h + h * k1 + k1 * k2;
    return { cat: h * h / d, zw: h * k1 / d, an: k1 * k2 / d };
  }
  const NAMES = {
    cat: ['cation', '⁺H₃N–CH₂–COOH', C.red],
    zw: ['zwitterion', '⁺H₃N–CH₂–COO⁻', C.purple],
    an: ['anion', 'H₂N–CH₂–COO⁻', C.blue]
  };

  Sim.create('#sim-chem-19-zwitterion', {
    title: 'Glycine at different pH',
    height: 300,
    controls: [{ key: 'pH', label: 'pH', min: 0, max: 14, step: 0.1, value: 6, format: (v) => v.toFixed(1) }],
    draw(s) {
      const { ctx, w, h, p } = s;
      const f = forms(p.pH);
      const main = Object.keys(f).reduce((a, b) => (f[a] > f[b] ? a : b));
      Sim.text(ctx, NAMES[main][1], w / 2, 26, { size: 20, bold: true, color: NAMES[main][2], align: 'center' });
      Sim.text(ctx, 'main form: ' + NAMES[main][0], w / 2, 48, { size: 12.5, color: C.muted, align: 'center' });
      const g = Sim.graph(ctx, { x: 50, y: 64, w: w - 70, h: h - 64 - 44, xmin: 0, xmax: 14, ymin: 0, ymax: 1, xstep: 2, ystep: 0.25, xlabel: 'pH', ylabel: 'fraction' });
      g.axes();
      Object.keys(NAMES).forEach((k) => g.plot((x) => forms(x)[k], { color: NAMES[k][2], width: 2.6, samples: 200 }));
      g.vline(p.pH, { color: C.ink, dash: [4, 4], width: 1.2 });
      g.label(1.0, 0.92, 'cation', { color: C.red, size: 12 });
      g.label(6, 1.04, 'zwitterion', { color: C.purple, size: 12, align: 'center' });
      g.label(13, 0.92, 'anion', { color: C.blue, size: 12, align: 'right' });
    },
    readout(s) {
      const f = forms(s.p.pH);
      const pc = (x) => (100 * x).toFixed(x > 0.999 || x < 0.001 ? 2 : 1) + '%';
      return [
        ['Cation', pc(f.cat)], ['Zwitterion', pc(f.zw), true], ['Anion', pc(f.an)],
        ['No overall charge (isoelectric point)', 'pH ' + ((PK1 + PK2) / 2).toFixed(2)]
      ];
    }
  });

  /* ======================================================================
     2. Building condensation and addition polymers
     ====================================================================== */
  const POLY = {
    nylon: { name: 'nylon 6,6', type: 'polyamide (condensation)', m: ['HOOC(CH₂)₄COOH', 'H₂N(CH₂)₆NH₂'], lab: ['diacid', 'diamine'], unit: '–CO(CH₂)₄CO–NH(CH₂)₆NH–', link: 'amide, –CONH–', small: 'H₂O' },
    nyloncl: { name: 'nylon 6,6 from the diacyl dichloride', type: 'polyamide (condensation)', m: ['ClOC(CH₂)₄COCl', 'H₂N(CH₂)₆NH₂'], lab: ['diacyl dichloride', 'diamine'], unit: '–CO(CH₂)₄CO–NH(CH₂)₆NH–', link: 'amide, –CONH–', small: 'HCl' },
    kevlar: { name: 'Kevlar', type: 'polyamide (condensation)', m: ['HOOC–C₆H₄–COOH', 'H₂N–C₆H₄–NH₂'], lab: ['diacid', 'diamine'], unit: '–CO–C₆H₄–CO–NH–C₆H₄–NH–', link: 'amide, –CONH–', small: 'H₂O' },
    pet: { name: 'Terylene (PET)', type: 'polyester (condensation)', m: ['HOOC–C₆H₄–COOH', 'HOCH₂CH₂OH'], lab: ['diacid', 'diol'], unit: '–CO–C₆H₄–CO–O–CH₂CH₂–O–', link: 'ester, –COO–', small: 'H₂O' },
    peptide: { name: 'a polypeptide of alanine', type: 'polyamide (condensation)', m: ['H₂NCH(CH₃)COOH'], lab: ['amino acid'], unit: '–NH–CH(CH₃)–CO–', link: 'peptide (amide), –CONH–', small: 'H₂O' },
    addition: { name: 'poly(propenamide)', type: 'addition polymer', m: ['CH₂=CHCONH₂'], lab: ['alkene monomer'], unit: '–CH₂–CH(CONH₂)–', link: 'C–C bonds from the opened C=C', small: null }
  };
  const BLOCK = [C.blue, C.orange];

  Sim.create('#sim-chem-19-polymer', {
    title: 'Polymer builder',
    height: 260,
    controls: [
      { key: 'poly', type: 'select', label: 'Polymer', options: Object.keys(POLY).map((k) => [k, POLY[k].name]), value: 'nylon' },
      { key: 'n', label: 'Monomers joined', min: 2, max: 12, step: 1, value: 6, format: (v) => v.toFixed(0) }
    ],
    draw(s) {
      const { ctx, w, h, p } = s;
      const P = POLY[p.poly];
      const N = p.n;
      // monomer key
      P.m.forEach((m, i) => {
        Sim.rect(ctx, 16 + i * (w / 2), 14, 16, 16, { fill: BLOCK[i], r: 3 });
        Sim.text(ctx, P.lab[i] + ': ' + m, 38 + i * (w / 2), 23, { size: 12.5, color: C.ink });
      });
      // the chain
      const bw = Math.min(56, (w - 60) / (N * 1.3)), gap = bw * 0.3, y = 80;
      const x0 = (w - (N * bw + (N - 1) * gap)) / 2;
      for (let i = 0; i < N; i++) {
        const x = x0 + i * (bw + gap);
        Sim.rect(ctx, x, y, bw, 34, { fill: BLOCK[P.m.length === 1 ? 0 : i % 2], r: 5 });
        if (i < N - 1) {
          Sim.line(ctx, x + bw, y + 17, x + bw + gap, y + 17, { color: C.ink, width: 3 });
          if (P.small && bw > 30) Sim.text(ctx, P.link.split(',')[0], x + bw + gap / 2, y + 48, { size: 9.5, color: C.muted, align: 'center' });
        }
      }
      Sim.text(ctx, '…', x0 - 14, y + 18, { size: 18, color: C.ink, align: 'center' });
      Sim.text(ctx, '…', x0 + N * (bw + gap) - gap + 12, y + 18, { size: 18, color: C.ink, align: 'center' });
      // repeat unit
      Sim.text(ctx, 'repeat unit:  [ ' + P.unit + ' ]', w / 2, y + 82, { size: w >= 600 ? 15 : 12.5, bold: true, color: C.navy, align: 'center' });
      // small molecules given off
      if (P.small) {
        const k = N - 1;
        Sim.text(ctx, k + ' × ' + P.small + ' given off', w / 2, y + 112, { size: 13, bold: true, color: C.red, align: 'center' });
        for (let i = 0; i < Math.min(k, 20); i++) Sim.circle(ctx, w / 2 - 95 + (i % 10) * 21, y + 132 + Math.floor(i / 10) * 18, 7, { fill: P.small === 'HCl' ? '#c0eb75' : '#a5d8ff', stroke: '#868e96', width: 1 });
      } else {
        Sim.text(ctx, 'nothing is given off: the C=C bonds simply open and join', w / 2, y + 112, { size: 13, bold: true, color: C.green, align: 'center' });
      }
    },
    readout(s) {
      const P = POLY[s.p.poly];
      const N = s.p.n;
      return [
        ['Type', P.type, true],
        ['Link formed', P.link],
        ['Small molecules lost', P.small ? (N - 1) + ' ' + P.small + ' for ' + N + ' monomers (one per link)' : 'none']
      ];
    }
  });
})();
