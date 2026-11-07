/* Tries the mock paper maker's chooser (js/mock-pick.js) on every Unit, many times over, and says
   how well the mocks follow the study report.

   Usage, from the repository root: node tools/pipeline/check_mocks.cjs [runs] [subject ...]

   Every mock must have the marks of the real paper, no question twice, and every slot filled with
   a question of the same marks and section. It reports, per Unit: the average and worst gap between a
   topic's share in the mock and in the report (percentage points); how much two mocks overlap; the most
   questions one mock took from a single paper; and how many spec points came up twice in a mock. */
const fs = require('fs');
const { pick } = require('../../js/mock-pick.js');

const runs = Number(process.argv[2]) || 200;
const subjects = process.argv.slice(3).length ? process.argv.slice(3) : ['physics', 'chemistry', 'biology', 'maths'];
let failures = 0;

for (const subject of subjects) {
  const file = 'data/mock-' + subject + '.json';
  if (!fs.existsSync(file)) { console.log(subject + ': no data file'); continue; }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('\n' + subject);
  console.log('unit      qs frames  avg gap  worst gap  overlap  most/paper  spec repeats  ms/mock');
  for (const unit of data.units) {
    if (!unit.frames.length) { console.log(unit.code.padEnd(8) + 'NO FRAMES'); failures++; continue; }
    let sumGap = 0;
    let gaps = 0;
    let worst = 0;
    let overlap = 0;
    let most = 0;
    let repeats = 0;
    let prev = null;
    const t0 = Date.now();
    for (let r = 0; r < runs; r++) {
      const mock = pick(unit, (r + 1) * 2654435761 >>> 0, []);
      const ids = mock.slots.map((s) => s.q.i);
      const marks = mock.slots.reduce((t, s) => t + s.q.m, 0);
      if (marks !== mock.marks || marks !== unit.marks) { console.log('  wrong marks', unit.code, marks); failures++; }
      if (new Set(ids).size !== ids.length) { console.log('  question twice', unit.code); failures++; }
      mock.slots.forEach((s) => { if (s.q.m !== s.m || s.q.k !== s.k) { console.log('  slot mismatch', unit.code, s.q.i); failures++; } });
      mock.topics.forEach((t) => {
        const g = Math.abs(t.got - t.want);
        sumGap += g;
        gaps++;
        if (g > worst) worst = g;
      });
      if (prev) overlap += ids.filter((x) => prev.has(x)).length / ids.length;
      prev = new Set(ids);
      const perPaper = new Map();
      const perSpec = new Map();
      mock.slots.forEach((s) => {
        perPaper.set(s.q.p, (perPaper.get(s.q.p) || 0) + 1);
        s.q.s.forEach((p) => perSpec.set(p[0], (perSpec.get(p[0]) || 0) + 1));
      });
      most = Math.max(most, ...perPaper.values());
      perSpec.forEach((n) => { if (n > 1) repeats += n - 1; });
    }
    const ms = (Date.now() - t0) / runs;
    console.log(unit.code.padEnd(8) + String(unit.qs.length).padStart(4) + String(unit.frames.length).padStart(7) +
      (sumGap / gaps).toFixed(2).padStart(9) + worst.toFixed(1).padStart(11) + ((100 * overlap / (runs - 1)).toFixed(1) + '%').padStart(9) +
      String(most).padStart(12) + (repeats / runs).toFixed(1).padStart(14) + ms.toFixed(0).padStart(9));
  }
}
console.log(failures ? '\n' + failures + ' FAILED' : '\nall mocks correct');
process.exitCode = failures ? 1 : 0;
