#!/usr/bin/env node
/* Build the question bank data the site loads.

   Reads every paper file in data/<subject>/*.json and writes js/data/<subject>.js.
   Papers are ordered by code (maths: P1, P2, P3, P4, then M1).

   Usage, from the repository root:
     node tools/build-data.js                 all subjects
     node tools/build-data.js chemistry       one subject

   Paper file format (data/<subject>/<name>.json):
     { "code", "title", "unit", "pdf", "questions": [
         { "id", "no", "marks", "topic", "keywords": [], "question",
           "status": "ready" | "pending", "answer", "steps": [], "images": [] } ] }
   Keep "code" and "id" stable: saved "done" and "review later" marks are keyed on them. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SUBJECTS = ['physics', 'chemistry', 'biology', 'maths'];
const RANK = { P1: 1, P2: 2, P3: 3, P4: 4, M1: 5 };

function sortKey(code) {
  // AI-written practice papers ("AI-3") come after every past paper.
  const ai = String(code).match(/^AI-(\d+)/);
  if (ai) return [99, parseInt(ai[1], 10)];
  const m = String(code).match(/^(P\d|M\d)-(\d+)/);
  return m ? [RANK[m[1]] || 9, parseInt(m[2], 10)] : [0, 0];
}

function build(subject) {
  const dir = path.join(ROOT, 'data', subject);
  if (!fs.existsSync(dir)) return;
  const papers = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return {
      file: f,
      paper: {
        code: p.code, title: p.title, unit: p.unit, pdf: p.pdf,
        // Practice questions written by AI in the Edexcel style (data/<subject>/ai-*.json).
        ...(p.ai ? { ai: true } : {}),
        questions: p.questions.map((q) => ({
          id: q.id, no: q.no, marks: q.marks, topic: q.topic,
          keywords: Array.isArray(q.keywords) ? q.keywords : [],
          question: q.question,
          status: q.status === 'ready' ? 'ready' : 'pending',
          answer: q.answer,
          steps: Array.isArray(q.steps) ? q.steps : [],
          images: Array.isArray(q.images) ? q.images : [],
          // Cropped diagrams, tables or graphs the question needs (papers/<subject>/fig/).
          figures: Array.isArray(q.figures) ? q.figures : [],
          // Where the part and the earlier text it needs sit on the page images, for the
          // Questions PDF (tools/shot-boxes.py). Absent when the part could not be placed.
          ...(Array.isArray(q.shot) ? { shot: q.shot } : {}),
          ...(Array.isArray(q.ctx) ? { ctx: q.ctx } : {}),
          // [broad topic, subtopic] from js/taxonomy.js, for the AI-written questions.
          ...(Array.isArray(q.cat) ? { cat: q.cat } : {}),
          // Written answers set out as a mark scheme: steps are the marking points, and
          // accept lists other points that would also earn credit.
          ...(q.scheme ? { scheme: true } : {}),
          ...(Array.isArray(q.accept) && q.accept.length ? { accept: q.accept } : {})
        }))
      }
    };
  }).sort((a, b) => {
    const ka = sortKey(a.paper.code), kb = sortKey(b.paper.code);
    return ka[0] - kb[0] || ka[1] - kb[1] || a.file.localeCompare(b.file, undefined, { numeric: true });
  }).map((x) => x.paper);

  // Each page slice [image, top, bottom] goes on one line, not one number per line.
  const json = JSON.stringify({ papers }, null, 1)
    .replace(/\[\s*(\d+),\s*([\d.]+),\s*([\d.]+)\s*\]/g, '[$1,$2,$3]');
  const body = 'window.BANK = window.BANK || {};\n\nwindow.BANK.' + subject + ' = ' + json + ';\n';
  fs.writeFileSync(path.join(ROOT, 'js', 'data', subject + '.js'), body);

  const count = (pred) => papers.reduce((n, p) => n + p.questions.filter(pred).length, 0);
  console.log(subject.padEnd(10), 'papers', papers.length, 'questions', count(() => true),
    'ready', count((q) => q.status === 'ready'), 'with images', count((q) => q.images.length));
}

const only = process.argv[2];
(only ? [only] : SUBJECTS).forEach(build);
