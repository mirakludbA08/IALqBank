/* Builds the past-paper lists data/papers-<subject>.json and a staging folder of
   hard links (<src>/_release/<subject>/<asset>) that are uploaded as GitHub
   Release assets under the tag papers-<subject>.

   It scans the session folders of the local past-paper copy (Physics, Chem,
   Bio/Biology, Maths/Math), keeps International A Level papers only (W codes),
   picks one question paper (QP) and one mark scheme (MS) per paper, and attaches
   the few extras listed in EXTRAS below.

   Run from the repo root (Node 22, no npm packages):
     node tools/papers/build-manifest.mjs                  all subjects
     node tools/papers/build-manifest.mjs --subject=maths  one subject
   Options: --src=<folder>   past-paper root (default D:/IALqBank_D)
            --dry-run        print the summary only; write nothing
            --report=<file>  also write the full report (every skipped file) as JSON
   The staging folder must be on the same drive as the papers (hard links). */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ARGS = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
  return m ? [m[1], m[2] ?? true] : [a, true];
}));
const SRC = String(ARGS.src || 'D:/IALqBank_D').replace(/\\/g, '/').replace(/\/$/, '');
const STAGE = `${SRC}/_release`;
const DRY = !!ARGS['dry-run'];

// Pearson's "unused" Jan 2022 papers (WPH13_01_Jan22_UNUSED.pdf ...) were never sat.
// Set to true to list them as variant "U" (id WPH13U_Jan2022).
const INCLUDE_UNUSED = false;

// WFM01-03, WME01-03 and WST01-03 kept their codes when the 2018 maths spec replaced
// the 2013 one, so the same code covers papers from both specs. They are still
// examined (FP1/M1/S1 2026), so they are marked as current units here.
const SHARED_MATHS_SPEC = '2018';

const SUBJECTS = {
  physics: { dir: 'Physics', prefixes: ['WPH'], stem: 'WPH' },
  chemistry: { dir: 'Chem', prefixes: ['WCH'], stem: 'WCH' },
  biology: { dir: 'Bio/Biology', prefixes: ['WBI'], stem: 'WBI' },
  maths: { dir: 'Maths/Math', prefixes: ['WMA', 'WFM', 'WME', 'WST', 'WDM'] }
};

// One entry per unit, in spec order (current spec first). [code, name, spec]
const UNITS = {
  physics: [
    ['WPH11', 'Unit 1: Mechanics and Materials', '2018'],
    ['WPH12', 'Unit 2: Waves and Electricity', '2018'],
    ['WPH13', 'Unit 3: Practical Skills in Physics I', '2018'],
    ['WPH14', 'Unit 4: Further Mechanics, Fields and Particles', '2018'],
    ['WPH15', 'Unit 5: Thermodynamics, Radiation, Oscillations and Cosmology', '2018'],
    ['WPH16', 'Unit 6: Practical Skills in Physics II', '2018'],
    ['WPH01', 'Unit 1: Physics on the Go', '2013'],
    ['WPH02', 'Unit 2: Physics at Work', '2013'],
    ['WPH03', 'Unit 3: Exploring Physics', '2013'],
    ['WPH04', 'Unit 4: Physics on the Move', '2013'],
    ['WPH05', 'Unit 5: Physics from Creation to Collapse', '2013'],
    ['WPH06', 'Unit 6: Experimental Physics', '2013'],
    ['WPH07', 'Unit 7: Physics Practical Examination', '2013']
  ],
  chemistry: [
    ['WCH11', 'Unit 1: Structure, Bonding and Introduction to Organic Chemistry', '2018'],
    ['WCH12', 'Unit 2: Energetics, Group Chemistry, Halogenoalkanes and Alcohols', '2018'],
    ['WCH13', 'Unit 3: Practical Skills in Chemistry I', '2018'],
    ['WCH14', 'Unit 4: Rates, Equilibria and Further Organic Chemistry', '2018'],
    ['WCH15', 'Unit 5: Transition Metals and Organic Nitrogen Chemistry', '2018'],
    ['WCH16', 'Unit 6: Practical Skills in Chemistry II', '2018'],
    ['WCH01', 'Unit 1: The Core Principles of Chemistry', '2013'],
    ['WCH02', 'Unit 2: Application of Core Principles of Chemistry', '2013'],
    ['WCH03', 'Unit 3: Chemistry Laboratory Skills I', '2013'],
    ['WCH04', 'Unit 4: General Principles of Chemistry I – Rates, Equilibria and Further Organic Chemistry', '2013'],
    ['WCH05', 'Unit 5: General Principles of Chemistry II – Transition Metals and Organic Nitrogen Chemistry', '2013'],
    ['WCH06', 'Unit 6: Chemistry Laboratory Skills II', '2013'],
    ['WCH07', 'Unit 7: Chemistry Practical Examination', '2013']
  ],
  biology: [
    ['WBI11', 'Unit 1: Molecules, Diet, Transport and Health', '2018'],
    ['WBI12', 'Unit 2: Cells, Development, Biodiversity and Conservation', '2018'],
    ['WBI13', 'Unit 3: Practical Skills in Biology I', '2018'],
    ['WBI14', 'Unit 4: Energy, Environment, Microbiology and Immunity', '2018'],
    ['WBI15', 'Unit 5: Respiration, Internal Environment, Coordination and Gene Technology', '2018'],
    ['WBI16', 'Unit 6: Practical Skills in Biology II', '2018'],
    ['WBI01', 'Unit 1: Lifestyle, Transport, Genes and Health', '2013'],
    ['WBI02', 'Unit 2: Development, Plants and the Environment', '2013'],
    ['WBI03', 'Unit 3: Practical Biology and Research Skills', '2013'],
    ['WBI04', 'Unit 4: The Natural Environment and Species Survival', '2013'],
    ['WBI05', 'Unit 5: Energy, Exercise and Coordination', '2013'],
    ['WBI06', 'Unit 6: Practical Biology and Investigative Skills', '2013'],
    ['WBI07', 'Unit 7: Biology Practical Examination', '2013']
  ],
  maths: [
    ['WMA11', 'Pure Mathematics 1', '2018'],
    ['WMA12', 'Pure Mathematics 2', '2018'],
    ['WMA13', 'Pure Mathematics 3', '2018'],
    ['WMA14', 'Pure Mathematics 4', '2018'],
    ['WFM01', 'Further Pure Mathematics 1', SHARED_MATHS_SPEC],
    ['WFM02', 'Further Pure Mathematics 2', SHARED_MATHS_SPEC],
    ['WFM03', 'Further Pure Mathematics 3', SHARED_MATHS_SPEC],
    ['WME01', 'Mechanics 1', SHARED_MATHS_SPEC],
    ['WME02', 'Mechanics 2', SHARED_MATHS_SPEC],
    ['WME03', 'Mechanics 3', SHARED_MATHS_SPEC],
    ['WST01', 'Statistics 1', SHARED_MATHS_SPEC],
    ['WST02', 'Statistics 2', SHARED_MATHS_SPEC],
    ['WST03', 'Statistics 3', SHARED_MATHS_SPEC],
    ['WDM11', 'Decision Mathematics 1', '2018'],
    ['WMA01', 'Core Mathematics C12', '2013'],
    ['WMA02', 'Core Mathematics C34', '2013'],
    ['WDM01', 'Decision Mathematics 1', '2013']
  ]
};

// Extras, matched to their paper by the Pearson paper reference printed on both
// (checked by hand). Paths are relative to the subject folder.
const EXTRAS = {
  biology: {
    // P64728A: the June 2020 WBI15 paper (series cancelled) was sat in October 2020.
    '2020 october november/Question-paper (2018)/wbi1501jun-2020.pdf': { id: 'WBI15_Oct2020', label: 'Scientific article' },
    // P71884A = the January 2023 WBI15 paper, although the file sits in the 2022 Oct folder.
    '2022 Oct/Question-paper/p71884-sa-int-advanced-level-biology-wbi15-01-jan-2023.pdf': { id: 'WBI15_Jan2023', label: 'Scientific article' },
    // P70955A = the June 2022 WBI15 paper.
    'samples/Scientific_Article_Unit_5_WBI15_June_2022.pdf': { id: 'WBI15_Jun2022', label: 'Scientific article' }
  }
};
const EXTRA_SUFFIX = { 'Scientific article': 'Article' };

// Files whose content (checked by hand) belongs to another session. They are left out.
// Byte-identical copies under the wrong session are found and left out automatically.
const MISFILED = {
  biology: {
    '2025 Oct Nov/Mark-scheme/October 2025 - Unit 4 MS.pdf': 'is the Summer 2025 WBI14 mark scheme, not October 2025'
  },
  maths: {
    '2026 Jan/Mark-scheme/Maths_M2A_MS.pdf': 'is the October 2025 WME02A mark scheme (P87439A), not January 2026'
  }
};

const MONTH_ORDER = { Jan: 0, Jun: 1, Oct: 2 };
// First month of each session (0-based), for checking dates in file names.
const SESSION_START = { Jan: 0, Jun: 4, Oct: 9 };

function sessionOf(folder) {
  const m = /^(\d{4})\s*(.*)$/.exec(folder.trim());
  if (!m) return null;
  const rest = m[2].toLowerCase();
  const month = /jan/.test(rest) ? 'Jan' : /may|jun/.test(rest) ? 'Jun' : /oct|nov/.test(rest) ? 'Oct' : null;
  return month ? { year: +m[1], month } : null;
}

// Date or session written in a file name, if any.
function nameDate(base) {
  let m = /(?<![0-9])(20\d{2})(0[1-9]|1[0-2])([0-3]\d)(?![0-9])/.exec(base);
  if (m) return { kind: 'date', year: +m[1], mon: +m[2] - 1, text: m[0] };
  m = /^(\d{2})_(0[1-9]|1[0-2])_(?:QP|MS)/i.exec(base);
  if (m) return { kind: 'date', year: 2000 + +m[1], mon: +m[2] - 1, text: m[0] };
  m = /(?<![0-9])([0-3]\d)-(0[1-9]|1[0-2])-(\d{2})(?![0-9])/.exec(base);
  if (m) return { kind: 'date', year: 2000 + +m[3], mon: +m[2] - 1, text: m[0] };
  m = /(?<![a-z])(january|jan|june|jun|may|summer|october|oct|november|nov)[\s._-]*(20\d{2}|\d{2})(?![0-9])/i.exec(base);
  if (m) {
    const w = m[1].toLowerCase();
    const month = w.startsWith('jan') ? 'Jan' : /^(jun|may|sum)/.test(w) ? 'Jun' : 'Oct';
    const y = +m[2];
    return { kind: 'session', year: y < 100 ? 2000 + y : y, month, text: m[0] };
  }
  return null;
}

// True when the file-name date cannot belong to the folder's session. A session's
// papers are sat from about a month before its first month and its mark schemes
// come out within five months after it.
function dateMismatch(nd, ses) {
  if (!nd) return false;
  if (nd.kind === 'session') return nd.year !== ses.year || nd.month !== ses.month;
  const start = ses.year * 12 + SESSION_START[ses.month];
  const at = nd.year * 12 + nd.mon;
  return at < start - 1 || at > start + 5;
}

function classify(base, dirs) {
  const n = base.toLowerCase();
  if (/article|(?<![a-z])sa(?![a-z])|insert|booklet|formula/.test(n)) return 'extra';
  if (/(?<![a-z])(pef|rep)(?![a-z])|examiner/.test(n) || /(?<![A-Za-z])ER(?![A-Za-z])/.test(base)) return 'er';
  if (/(?<![a-z])(rms|msc|ms)(?![a-z])|mark-?scheme/.test(n)) return 'ms';
  if (/(?<![a-z])(que|qp)(?![a-z])|question-?paper/.test(n)) return 'qp';
  const d = dirs.join('/').toLowerCase();
  if (/examiner/.test(d)) return 'er';
  if (/mark-?scheme/.test(d)) return 'ms';
  if (/question-?paper/.test(d)) return 'qp';
  return null;
}

const LEGACY = /(?<![A-Za-z0-9])[68](?:PH|CH|BI)\d{2}|(?<![0-9])66\d{2}(?![0-9])/i;
const ANY_W = /(?<![A-Za-z])W[A-Z]{2}\d{2}/i;

// Unit code (and paper variant) from a name with a W code in it.
function codeFromName(base, prefixes) {
  const re = new RegExp(`(?<![A-Za-z])(${prefixes.join('|')})(\\d{2})(?:[\\s_/-]*0?1([A-Za-z])(?![A-Za-z]))?`, 'i');
  const m = re.exec(base);
  return m ? { code: (m[1] + m[2]).toUpperCase(), variant: m[3] ? m[3].toUpperCase() : null } : null;
}

// Unit code from the short names that have no code (U1A, Unit 4, P1, FP2, C12, M1 ...),
// using the session to pick the spec. Returns { code, variant } or { ambiguous }.
function codeFromToken(base, subject, ses) {
  const old = ses.year <= 2018;
  const current = ses.year >= 2021;
  if (subject === 'maths') {
    let tok = null;
    let variant = null;
    const pm = /PureMathematics\s*P?([1-4])/i.exec(base);
    if (pm) tok = 'P' + pm[1];
    else {
      const m = /(?<![A-Za-z0-9])(C12|C34|FP[1-3]|F[1-3]|P[1-4]|M[1-3]|S[1-3]|D1)(?:[\s_-]?([A-Za-z]))?(?![A-Za-z0-9])/i.exec(base);
      if (!m) return null;
      tok = m[1].toUpperCase();
      variant = m[2] ? m[2].toUpperCase() : null;
    }
    const n = tok.slice(-1);
    let code = null;
    if (tok === 'C12') code = 'WMA01';
    else if (tok === 'C34') code = 'WMA02';
    else if (tok[0] === 'P') code = 'WMA1' + n;
    else if (tok[0] === 'F') code = 'WFM0' + n;
    else if (tok[0] === 'M') code = 'WME0' + n;
    else if (tok[0] === 'S') code = 'WST0' + n;
    else if (tok === 'D1') code = old ? 'WDM01' : current ? 'WDM11' : null;
    return code ? { code, variant } : { ambiguous: tok };
  }
  const m = /(?<![A-Za-z0-9])U(?:nit)?[\s_-]*([1-7])(?:[\s_-]?([A-Za-z]))?(?![A-Za-z0-9])/i.exec(base);
  if (!m) return null;
  const variant = m[2] ? m[2].toUpperCase() : null;
  if (old) return { code: `${SUBJECTS[subject].stem}0${m[1]}`, variant };
  if (current && m[1] !== '7') return { code: `${SUBJECTS[subject].stem}1${m[1]}`, variant };
  return { ambiguous: 'U' + m[1] };
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
  return out;
}

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
const sessionKey = (s) => `${s.month}${s.year}`;

function buildSubject(subject) {
  const cfg = SUBJECTS[subject];
  const base = `${SRC}/${cfg.dir}`;
  const known = new Set(UNITS[subject].map((u) => u[0]));
  const extrasCfg = EXTRAS[subject] || {};
  const report = { routine: {}, listed: [], dateMismatches: [], otherCodes: [], noQP: [], duplicates: [] };
  const routine = (why) => { report.routine[why] = (report.routine[why] || 0) + 1; };
  const list = (rel, why) => report.listed.push({ file: rel, why });
  const cands = [];
  const extras = [];

  for (const abs of walk(base)) {
    const rel = abs.slice(base.length + 1);
    const parts = rel.split('/');
    const file = parts[parts.length - 1];
    const dirs = parts.slice(1, -1);
    if (extrasCfg[rel]) {
      extras.push({ abs, rel, ...extrasCfg[rel] });
      continue;
    }
    if (MISFILED[subject]?.[rel]) { list(rel, `misfiled: ${MISFILED[subject][rel]}`); continue; }
    if (!/\.pdf$/i.test(file)) { routine('not a PDF (.doc etc.)'); continue; }
    const ses = parts.length > 1 ? sessionOf(parts[0]) : null;
    if (!ses) { routine('outside session folders (samples, specimens)'); continue; }
    if (ses.year < 2014) { routine('pre-IAL session (before 2014)'); continue; }
    if (/modified/i.test(rel) || /(?<![a-z0-9])(a3|a4|18pt|24pt)(?![a-z0-9])/i.test(rel)) { routine('modified / large-print paper'); continue; }
    if (/specimen|(?<![a-z])sams?(?![a-z])/i.test(file)) { routine('outside session folders (samples, specimens)'); continue; }
    const kind = classify(file, dirs);
    if (kind === 'er') { routine('examiner report'); continue; }
    let id = codeFromName(file, cfg.prefixes);
    let byCode = !!id;
    if (!id) {
      if (ANY_W.test(file)) { list(rel, 'W code of another subject'); continue; }
      if (LEGACY.test(file)) { routine('legacy UK GCE code'); continue; }
      const t = codeFromToken(file, subject, ses);
      if (t && t.ambiguous) { list(rel, `cannot tell spec for "${t.ambiguous}" in ${sessionKey(ses)}`); continue; }
      id = t;
    }
    if (!kind) {
      if (id) list(rel, 'cannot tell if QP or MS');
      else routine('not a QP/MS and no unit code');
      continue;
    }
    if (!id) {
      if (kind === 'extra') list(rel, 'insert/article with no paper to attach to');
      else list(rel, `${kind.toUpperCase()} with no unit code that can be mapped`);
      continue;
    }
    if (kind === 'extra') { list(rel, `possible extra for ${id.code} ${sessionKey(ses)} (not in EXTRAS, skipped)`); continue; }
    if (!known.has(id.code)) report.otherCodes.push({ code: id.code, file: rel });
    if (/unused/i.test(file)) {
      if (!INCLUDE_UNUSED) { list(rel, `unused ${id.code} paper (never sat)`); continue; }
      id = { code: id.code, variant: 'U' };
    }
    const nd = nameDate(file);
    const mism = dateMismatch(nd, ses);
    const n = file.toLowerCase();
    let score = 0;
    if (kind === 'ms' && /(?<![a-z])rms(?![a-z])/.test(n)) score += 16;
    if (/updated/.test(n)) score += 8;
    if (classify(file, []) === kind) score += 4;
    if (byCode) score += 2;
    if (/\(\d\)|__\d_/.test(n)) score -= 1;
    cands.push({
      abs, rel, kind, code: id.code, variant: id.variant, ses, nd, mism, score,
      bytes: fs.statSync(abs).size,
      key: `${id.code}${id.variant || ''}_${sessionKey(ses)}`
    });
  }

  // Byte-identical copies filed under two sessions: drop the copy whose file-name
  // date does not fit its folder (e.g. a Jan 2024 paper repeated in May June 2024).
  const bySize = new Map();
  for (const c of cands) bySize.set(c.bytes, [...(bySize.get(c.bytes) || []), c]);
  const dropped = new Set();
  for (const group of bySize.values()) {
    if (group.length < 2) continue;
    const byHash = new Map();
    for (const c of group) {
      c.hash = md5(c.abs);
      byHash.set(c.hash, [...(byHash.get(c.hash) || []), c]);
    }
    for (const same of byHash.values()) {
      for (const c of same) {
        const twin = same.find((o) => o !== c && sessionKey(o.ses) !== sessionKey(c.ses) && !o.mism);
        if (c.mism && twin) {
          dropped.add(c);
          list(c.rel, `misfiled: identical to ${twin.rel} (${sessionKey(twin.ses)}), so not used for ${c.key}`);
        }
      }
    }
  }
  for (const c of cands) {
    if (c.mism && !dropped.has(c)) {
      report.dateMismatches.push({ file: c.rel, nameSays: c.nd.text, folder: sessionKey(c.ses), used: c.key });
    }
  }

  const groups = new Map();
  for (const c of cands) {
    if (dropped.has(c)) continue;
    if (!groups.has(c.key)) groups.set(c.key, { qp: [], ms: [] });
    groups.get(c.key)[c.kind].push(c);
  }
  const pick = (arr) => arr.sort((a, b) => b.score - a.score || a.rel.localeCompare(b.rel))[0];

  const papers = [];
  const assets = [];
  for (const [key, g] of groups) {
    const qp = g.qp.length ? pick(g.qp) : null;
    const ms = g.ms.length ? pick(g.ms) : null;
    for (const c of [...g.qp, ...g.ms]) {
      if (c !== qp && c !== ms) {
        const kept = c.kind === 'qp' ? qp : ms;
        report.duplicates.push({ file: c.rel, kept: kept.rel, identical: !!(c.hash && kept.hash && c.hash === kept.hash) });
      }
    }
    if (!qp) {
      report.noQP.push({ id: key, ms: ms ? ms.rel : null });
      continue;
    }
    const asset = (c, suffix) => {
      const name = `${key}_${suffix}.pdf`;
      assets.push({ name, abs: c.abs, bytes: c.bytes });
      return { file: name, bytes: c.bytes };
    };
    papers.push({
      id: key,
      code: qp.code,
      year: qp.ses.year,
      month: qp.ses.month,
      variant: qp.variant,
      qp: asset(qp, 'QP'),
      ms: ms ? asset(ms, 'MS') : null
    });
  }

  for (const x of extras) {
    const p = papers.find((q) => q.id === x.id);
    if (!p) { list(x.rel, `extra for ${x.id}, but that paper has no QP`); continue; }
    const bytes = fs.statSync(x.abs).size;
    const name = `${x.id}_${EXTRA_SUFFIX[x.label] || x.label.replace(/[^A-Za-z0-9]+/g, '')}.pdf`;
    assets.push({ name, abs: x.abs, bytes });
    (p.extra = p.extra || []).push({ file: name, label: x.label, bytes });
  }

  papers.sort((a, b) => b.year - a.year || MONTH_ORDER[b.month] - MONTH_ORDER[a.month]
    || a.code.localeCompare(b.code) || (a.variant || '').localeCompare(b.variant || ''));

  const used = new Set(papers.map((p) => p.code));
  const units = UNITS[subject].filter((u) => used.has(u[0])).map(([code, name, spec]) => ({ code, name, spec }));
  for (const code of [...used].filter((c) => !known.has(c)).sort()) units.push({ code, name: code, spec: '' });

  const names = new Set();
  for (const a of assets) {
    if (!/^[A-Za-z0-9_.-]+$/.test(a.name)) throw new Error(`bad asset name ${a.name}`);
    if (names.has(a.name)) throw new Error(`duplicate asset name ${a.name}`);
    names.add(a.name);
  }
  return { manifest: { subject, tag: `papers-${subject}`, units, papers }, assets, report };
}

// Hard-link every asset into <src>/_release/<subject>/ and remove links that are no
// longer in the list. Returns the number of files in the folder.
function stage(subject, assets) {
  const dir = `${STAGE}/${subject}`;
  fs.mkdirSync(dir, { recursive: true });
  const want = new Map(assets.map((a) => [a.name, a.abs]));
  for (const name of fs.readdirSync(dir)) {
    if (!want.has(name)) fs.unlinkSync(`${dir}/${name}`);
  }
  for (const [name, abs] of want) {
    const dst = `${dir}/${name}`;
    if (fs.existsSync(dst)) {
      const a = fs.statSync(abs, { bigint: true });
      const b = fs.statSync(dst, { bigint: true });
      if (a.ino === b.ino && a.dev === b.dev) continue;
      fs.unlinkSync(dst);
    }
    fs.linkSync(abs, dst);
  }
  return fs.readdirSync(dir).length;
}

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const chosen = ARGS.subject ? [String(ARGS.subject)] : Object.keys(SUBJECTS);
const full = {};
let largest = { bytes: 0 };
for (const subject of chosen) {
  if (!SUBJECTS[subject]) throw new Error(`unknown subject ${subject}`);
  const { manifest, assets, report } = buildSubject(subject);
  const total = assets.reduce((s, a) => s + a.bytes, 0);
  for (const a of assets) if (a.bytes > largest.bytes) largest = { ...a, subject };
  let staged = null;
  if (!DRY) {
    fs.mkdirSync(`${ROOT}/data`, { recursive: true });
    fs.writeFileSync(`${ROOT}/data/papers-${subject}.json`, JSON.stringify(manifest) + '\n');
    staged = stage(subject, assets);
  }
  const p = manifest.papers;
  const summary = {
    papers: p.length,
    withMS: p.filter((x) => x.ms).length,
    withExtra: p.filter((x) => x.extra).length,
    assets: assets.length,
    totalBytes: total,
    staged,
    over100MB: assets.filter((a) => a.bytes > 100 * 1048576).map((a) => a.name),
    units: manifest.units.map((u) => u.code)
  };
  full[subject] = { summary, ...report };
  console.log(`\n== ${subject}: ${summary.papers} papers, ${summary.withMS} with MS, ${summary.withExtra} with extras, `
    + `${summary.assets} assets, ${mb(total)}${staged === null ? '' : `, ${staged} files staged`}`);
  console.log(`   units: ${summary.units.join(' ')}`);
  console.log(`   routine skips: ${Object.entries(report.routine).map(([k, v]) => `${k} ${v}`).join('; ')}`);
  console.log(`   duplicates not used: ${report.duplicates.length} (${report.duplicates.filter((d) => d.identical).length} byte-identical)`);
  if (report.otherCodes.length) console.log(`   codes outside the unit table: ${[...new Set(report.otherCodes.map((o) => o.code))].join(' ')}`);
  for (const l of report.listed) console.log(`   skipped: ${l.file} -- ${l.why}`);
  for (const n of report.noQP) console.log(`   no QP: ${n.id}${n.ms ? ` (MS ${n.ms})` : ''}`);
  for (const d of report.dateMismatches) console.log(`   name/folder disagree: ${d.file} (name ${d.nameSays}, folder ${d.folder}) -> used as ${d.used}`);
}
console.log(`\nlargest file: ${largest.name} (${largest.subject}) ${mb(largest.bytes || 0)}`);
if (ARGS.report && ARGS.report !== true) fs.writeFileSync(String(ARGS.report), JSON.stringify(full, null, 1));
