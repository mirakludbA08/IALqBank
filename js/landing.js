/* IALqBank landing page: "Pick up where you left off" and each subject's progress.
   Both come from this browser's storage, written by the question bank (js/topicbank.js):
   ialqb_last is the last topic and question used, ialqb_tb_done_<subject> the questions
   marked done and ialqb_tb_total_<subject> how many questions the subject has. */
(function () {
  'use strict';

  const LABELS = { physics: 'Physics', chemistry: 'Chemistry', biology: 'Biology', maths: 'Maths' };
  const read = (key) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; } };

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

  function resume() {
    const last = read('ialqb_last');
    if (!last || !LABELS[last.s]) return;
    let href = 'questions.html?s=' + last.s;
    if (last.path && last.path.length) href += '&t=' + encodeURIComponent(last.path.join(' > '));
    if (last.item) href += '&at=' + encodeURIComponent(last.item);
    const where = [LABELS[last.s] + ' question bank', last.path && last.path.length ? last.path[last.path.length - 1] : 'all topics'];
    const text = document.getElementById('resume-where');
    text.textContent = where.join(' · ');
    if (last.name) {
      text.appendChild(document.createElement('br'));
      text.appendChild(document.createTextNode('Last question: ' + last.name + (last.at ? ', ' + ago(last.at) : '')));
    }
    document.getElementById('resume-go').href = href;
    const box = document.getElementById('resume');
    box.dataset.subject = last.s;    // the subject's colours, from bank.css
    box.hidden = false;
  }

  function progress() {
    document.querySelectorAll('[data-progress]').forEach((box) => {
      const s = box.dataset.progress;
      const done = (read('ialqb_tb_done_' + s) || []).length;
      if (!done) return;
      const total = read('ialqb_tb_total_' + s);
      const p = document.createElement('p');
      p.textContent = total
        ? done.toLocaleString() + ' of ' + total.toLocaleString() + ' questions done'
        : done.toLocaleString() + (done === 1 ? ' question done' : ' questions done');
      box.appendChild(p);
      if (total) {
        const bar = document.createElement('div');
        bar.className = 'subject-progress-bar';
        bar.setAttribute('aria-hidden', 'true');
        const fill = document.createElement('span');
        fill.style.width = Math.max(1, Math.min(100, (100 * done) / total)) + '%';
        bar.appendChild(fill);
        box.appendChild(bar);
      }
      box.hidden = false;
    });
  }

  resume();
  progress();
})();
