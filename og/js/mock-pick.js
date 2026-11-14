/* IAL Prep mock papers: choosing the questions (no page or PDF work here; js/mock.js does that).

   data/mock-<subject>.json (tools/pipeline/build_mock_data.py) holds, for each Unit, the study
   report's topic shares, the real papers as lists of slots, and every whole question that can go
   in a mock.

   A mock starts from a real paper, picked at random, and keeps its shape: the same number of
   questions, the same marks on each in the same order, the same sections. That makes the total
   exact and the paper feel right (short questions first, the big ones late). Each slot is then
   filled with a whole question from any paper of the Unit that has the same marks in the same
   section. tools/pipeline/build_mock_data.py only keeps shapes with enough questions to fill them.

   Which questions is settled by simulated annealing. Starting from a random fill, it keeps
   swapping one question for another and scoring the paper; a worse paper is sometimes accepted
   early on, which is what keeps two mocks from looking alike, and less and less often as it
   cools. The score (lower is better) adds up:
     - how far each topic's marks are from its share in the study report (this one matters most);
     - how far the spec points the report names as the most asked are from their shares;
     - the same spec point asked twice;
     - too many questions from one paper;
     - a question far from where it stood in its own paper (late questions are harder);
     - a different number of parts from the real question in that slot;
     - questions already used in this person's other mocks of the Unit. */
(function (root) {
  'use strict';

  const WEIGHT = { point: 0.25, repeat: 2.5, paper: 6, place: 3, parts: 0.4, seen: 1 };
  const START_HEAT = 4;
  const END_HEAT = 0.04;
  const STEPS_PER_SLOT = 400;
  const FRAMES_TRIED = 3;
  const MOST_FRAMES = 8;
  const CLOSE_ENOUGH = 5;       // percentage points: the furthest a topic should be from its share

  // A small seeded random number generator (mulberry32): the same seed gives the same mock.
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const slotKey = (k, m) => k + '|' + m;

  function score(unit, slots, fill, marks, seen) {
    const qs = unit.qs;
    const got = new Array(unit.cats.length).fill(0);
    const pointGot = new Map();
    const usedSpec = new Map();
    const usedPaper = new Map();
    let e = 0;
    fill.forEach((qi, i) => {
      const q = qs[qi];
      q.c.forEach((c) => { got[c[0]] += c[1]; });
      q.s.forEach((p) => {
        usedSpec.set(p[0], (usedSpec.get(p[0]) || 0) + 1);
        pointGot.set(p[0], (pointGot.get(p[0]) || 0) + p[1]);
      });
      usedPaper.set(q.p, (usedPaper.get(q.p) || 0) + 1);
      const d = q.pos - slots[i].pos;
      e += WEIGHT.place * d * d + WEIGHT.parts * Math.abs(q.np - slots[i].np);
      if (seen.has(q.i)) e += WEIGHT.seen;
    });
    unit.cats.forEach((cat, k) => {
      const want = cat[2] / 100 * marks;
      e += (got[k] - want) * (got[k] - want);
    });
    unit.points.forEach((p) => {
      const want = p[1] / 100 * marks;
      const d = (pointGot.get(p[0]) || 0) - want;
      e += WEIGHT.point * d * d;
    });
    usedSpec.forEach((n) => { if (n > 1) e += WEIGHT.repeat * (n - 1); });
    const cap = Math.max(1, Math.ceil(slots.length / 6));
    usedPaper.forEach((n) => { if (n > cap) e += WEIGHT.paper * (n - cap) * (n - cap); });
    return e;
  }

  /* unit: one entry of the data file's units. seed: any whole number. avoid: ids of questions to
     use only if it helps (those in this person's other mocks). Returns the chosen questions in
     paper order, the real paper it was shaped on, and how the topics came out. */
  function pick(unit, seed, avoid) {
    const random = seeded(seed);
    const seen = new Set(avoid || []);
    const groups = new Map();
    unit.qs.forEach((q, i) => {
      const key = slotKey(q.k, q.m);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(i);
    });
    // Some papers' shapes suit the report less well (a big slot with few questions to fill it), so
    // a few are tried and the mock that follows the report best is kept, and more if a topic is
    // still a long way off.
    const order = unit.frames.map((f, i) => [random(), i]).sort((a, b) => a[0] - b[0]).map((x) => unit.frames[x[1]]);
    const topicMarks = (r) => {
      const got = new Array(unit.cats.length).fill(0);
      r.chosen.forEach((q) => q.c.forEach((c) => { got[c[0]] += c[1]; }));
      return got;
    };
    const farthest = (r) => Math.max.apply(null, topicMarks(r).map((g, k) => Math.abs(100 * g / r.marks - unit.cats[k][2])));
    let result = null;
    for (let i = 0; i < order.length && i < MOST_FRAMES; i++) {
      const tried = fillFrame(unit, order[i], groups, seen, random);
      if (!result || tried.score < result.score) result = tried;
      if (i + 1 >= FRAMES_TRIED && farthest(result) <= CLOSE_ENOUGH) break;
    }
    const got = topicMarks(result);
    return {
      seed: seed,
      frame: result.frame.paper,
      marks: result.marks,
      minutes: unit.minutes,
      slots: result.slots.map((s, i) => ({ k: s.k, m: s.m, h: s.h, q: result.chosen[i] })),
      topics: unit.cats.map((cat, k) => ({ name: cat[0], report: cat[1], want: cat[2], got: 100 * got[k] / result.marks }))
    };
  }

  // Fills one real paper's slots: a random fill, then annealing. Returns the best fill it saw.
  function fillFrame(unit, frame, groups, seen, random) {
    const marks = frame.slots.reduce((t, s) => t + s.m, 0);
    const slots = frame.slots.map((s, i) => ({
      k: s.k, m: s.m, np: s.np, h: s.h, pos: frame.slots.length > 1 ? i / (frame.slots.length - 1) : 0
    }));
    const taken = new Set();
    const choices = slots.map((s) => groups.get(slotKey(s.k, s.m)) || []);
    // Slots with the fewest questions to choose from go first.
    const fill = new Array(slots.length).fill(-1);
    slots.map((s, i) => i).sort((a, b) => choices[a].length - choices[b].length).forEach((i) => {
      const free = choices[i].filter((q) => !taken.has(q));
      const q = free[Math.floor(random() * free.length)];
      fill[i] = q;
      taken.add(q);
    });
    let now = score(unit, slots, fill, marks, seen);
    let best = fill.slice();
    let bestScore = now;
    const steps = STEPS_PER_SLOT * slots.length;
    const cooling = Math.pow(END_HEAT / START_HEAT, 1 / steps);
    let heat = START_HEAT;
    for (let n = 0; n < steps; n++, heat *= cooling) {
      const i = Math.floor(random() * slots.length);
      const list = choices[i];
      const next = list[Math.floor(random() * list.length)];
      if (taken.has(next)) continue;
      const old = fill[i];
      fill[i] = next;
      const after = score(unit, slots, fill, marks, seen);
      if (after <= now || random() < Math.exp((now - after) / heat)) {
        taken.delete(old);
        taken.add(next);
        now = after;
        if (now < bestScore) { bestScore = now; best = fill.slice(); }
      } else {
        fill[i] = old;
      }
    }
    return { frame: frame, slots: slots, marks: marks, score: bestScore, chosen: best.map((qi) => unit.qs[qi]) };
  }

  const api = { pick: pick, seeded: seeded };
  root.IALQB_MOCK_PICK = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
