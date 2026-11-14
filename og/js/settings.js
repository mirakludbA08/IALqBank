/* IAL Prep, old design: the Settings page (og/settings.html). The same choices, saved under the
   same keys, as the newer site's js/settings.js:
     ialqb_theme          'light' or 'dark'
     ialqb_style          'og' keeps the old design; unticking it goes back to the new one
     ialqb_ms_side        '0' turns off the mark scheme beside the question
     ialqb_ink            '0' turns off the answer space under each question
     ialqb_tb_source      'past' leaves out the AI practice questions
     ialqb_tb_noregional  '1' leaves out Pearson's regional papers */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
  const saved = (what, on) => window.OGX && window.OGX.toast('Setting saved', what + ': ' + on, 'Saved in this browser.');

  function start() {
    // Mode
    const seg = $('#s-theme');
    const T = window.IALQB_THEME;
    const paint = (t) => seg.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.v === t;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    paint(T ? T.get() : document.documentElement.dataset.theme);
    if (T) T.onChange(paint);
    const pick = (b) => {
      if (!T || b.getAttribute('aria-checked') === 'true') return;
      T.set(b.dataset.v);
      saved('Mode', b.textContent);
    };
    seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pick(b); });
    seg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const bs = Array.from(seg.querySelectorAll('button'));
      const j = (bs.indexOf(document.activeElement) + 1) % bs.length;
      bs[j].focus();
      pick(bs[j]);
    });

    // The old design: unticked, back to the same page in the new one.
    const og = $('#s-og');
    og.addEventListener('change', () => {
      if (og.checked) return;
      set('ialqb_style', null);
      setTimeout(() => { location.href = location.pathname.replace(/^\/og(?=\/)/, '') + location.search; }, 200);
    });

    const box = (id, key, isOn, write, what) => {
      const b = $(id);
      b.checked = isOn(get(key));
      b.addEventListener('change', () => { set(key, write(b.checked)); saved(what, b.checked ? 'On' : 'Off'); });
    };
    box('#s-side', 'ialqb_ms_side', (v) => v !== '0', (on) => (on ? null : '0'), 'Mark scheme beside the question');
    box('#s-ink', 'ialqb_ink', (v) => v !== '0', (on) => (on ? null : '0'), 'Answer space under each question');
    box('#s-ai', 'ialqb_tb_source', (v) => v !== 'past', (on) => (on ? (get('ialqb_tb_source') === 'ai' ? 'ai' : '') : 'past'), 'Include AI practice questions');
    box('#s-regional', 'ialqb_tb_noregional', (v) => v === '1', (on) => (on ? '1' : ''), 'Leave out regional papers');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
