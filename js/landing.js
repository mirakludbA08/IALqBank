/* IAL Prep landing page: "Pick up where you left off" and each subject's progress.
   Both come from this browser's storage, written by the question bank (js/topicbank.js):
   ialqb_last is the last topic and question used, ialqb_tb_done_<subject> the questions
   marked done and ialqb_tb_total_<subject> how many questions the subject has. */
(function () {
  'use strict';

  const LABELS = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', maths: 'Maths' };
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  function ago(time) {
    const mins = Math.round((Date.now() - time) / 60000);
    if (!(mins >= 0)) return '';
    const rtf = window.Intl && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }) : null;
    const say = (n, unit) => (rtf ? rtf.format(-n, unit) : n + ' ' + unit + (n === 1 ? '' : 's') + ' ago');
    if (mins < 1) return 'just now';
    if (mins < 60) return say(mins, 'minute');
    if (mins < 60 * 24) return say(Math.round(mins / 60), 'hour');
    return say(Math.round(mins / 1440), 'day');
  }

  // The last place studied: a question in the bank, a notes page section or the past papers.
  // js/nav.js (loaded first) knows how to describe and link each kind.
  function resume() {
    const last = read('ialqb_last');
    const place = window.IALQB_PLACE;
    if (!last || !LABELS[last.s] || !place) return;
    const words = place.describe(last);
    document.getElementById('resume-where').textContent = words[1];
    if (last.at) {
      const when = document.getElementById('resume-when');
      when.textContent = 'Last there ' + ago(last.at) + '.';
      when.hidden = false;
    }
    document.getElementById('resume-go').href = place.href(last);
    const box = document.getElementById('resume');
    box.dataset.subject = last.s;    // the subject's accent (css/control.css)
    box.hidden = false;
  }

  // Questions done in each subject, on its card: the count, its share and a thin bar that fills.
  function progress() {
    document.querySelectorAll('[data-progress]').forEach((box) => {
      const s = box.dataset.progress;
      const done = (read('ialqb_tb_done_' + s) || []).length;
      if (!done) return;
      const total = read('ialqb_tb_total_' + s);
      const line = el('p', 'subject-progress-line');
      line.appendChild(el('span', null, total
        ? done.toLocaleString() + ' of ' + total.toLocaleString() + ' questions done'
        : done.toLocaleString() + (done === 1 ? ' question done' : ' questions done')));
      box.appendChild(line);
      if (total) {
        const share = Math.max(0, Math.min(1, done / total));
        line.appendChild(el('b', 'subject-progress-pc', Math.round(100 * share) + '%'));
        const bar = el('div', 'ctl-meter');
        bar.setAttribute('aria-hidden', 'true');
        bar.appendChild(el('span'));
        bar.style.setProperty('--p', '0');
        box.appendChild(bar);
        // Set after the first frame, so the bar fills in as the page comes up.
        requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty('--p', String(Math.max(0.005, share)))));
      }
      box.hidden = false;
    });
  }

  resume();
  progress();
})();
