/* IAL Prep — the Settings page (settings.html). Each choice is saved in localStorage the moment it
   is made, under the keys the rest of the site reads:
     ialqb_theme          'dark' (the default) or 'light'           js/theme.js
     ialqb_ms_side        '0' turns off the mark scheme beside the question (on unless '0')  js/topicbank.js
     ialqb_ink            '0' turns off the answer space under each question (on unless '0') js/ink.js
     ialqb_tb_source      'past' leaves out the AI practice questions ('' or 'ai' keeps them)  js/topicbank.js
     ialqb_tb_noregional  '1' leaves out Pearson's regional papers                           js/topicbank.js
     ialqb_style          'og' shows the old design, the site before the restyle (og/)     js/theme.js
   The panel beside the options describes the one under the pointer or in focus, as the game's
   options screen does, with a sketch of the layout it gives. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };
  const CTL = () => window.CTL || { typeIn: (n, t) => { n.textContent = t; }, toast() {} };

  // A small sketch of a question card: the paper and its mark scheme, side by side or one under
  // the other, as the setting would show them.
  function sketch(side) {
    const lines = (x, y, w, n) => Array.from({ length: n }, (_, i) => '<path d="M' + x + ',' + (y + i * 9) + 'h' + (w - (i % 3 === 2 ? w * 0.35 : 0)) + '"/>').join('');
    if (side) {
      return '<svg viewBox="0 0 320 184" class="st-sketch">' +
        '<rect class="st-sk-card" x="1" y="1" width="318" height="182"/>' +
        '<rect class="st-sk-paper" x="14" y="16" width="160" height="138"/>' + '<g class="st-sk-ink">' + lines(26, 32, 132, 10) + '</g>' +
        '<rect class="st-sk-ms" x="186" y="16" width="120" height="138"/>' + '<g class="st-sk-accent">' + lines(196, 32, 100, 9) + '</g>' +
        '<text x="94" y="172" class="st-sk-label">Question</text><text x="246" y="172" class="st-sk-label">Mark scheme</text>' +
        '</svg>';
    }
    return '<svg viewBox="0 0 320 184" class="st-sketch">' +
      '<rect class="st-sk-card" x="1" y="1" width="318" height="182"/>' +
      '<rect class="st-sk-paper" x="14" y="12" width="292" height="84"/>' + '<g class="st-sk-ink">' + lines(28, 26, 264, 7) + '</g>' +
      '<rect class="st-sk-ms" x="14" y="104" width="292" height="66"/>' + '<g class="st-sk-accent">' + lines(28, 118, 264, 4) + '</g>' +
      '</svg>';
  }

  const INFO = {
    theme: {
      title: 'Mode',
      text: () => 'Dark is the site’s own look. Light mode has a grey background, paper-coloured panels and black type, for bright rooms. The button in the top bar switches between them too.'
    },
    og: {
      title: 'CRAZY AIDZ mode',
      text: () => 'The site as it looked before this design: the navy bar, white cards and the topic list down the side of the question bank. Everything added since comes too: the answer spaces, focus mode, the mark scheme beside the question, back to top and these settings. Turn it off on the same Settings page to come back.'
    },
    side: {
      title: 'Mark scheme beside the question',
      text: () => ($('#s-side').checked
        ? 'On. Opening a question’s mark scheme (its button, or the M key) puts it beside the question, so you can read both together; it stays in view while a long question scrolls by, and the filters move behind their button while it is open. '
        : 'Off. Opening a question’s mark scheme (its button, or the M key) shows it under the question.') +
        ($('#s-side').checked ? 'On a phone or a narrow window it opens under the question instead.' : ''),
      figure: () => sketch($('#s-side').checked)
    },
    ink: {
      title: 'Answer space under each question',
      text: () => ($('#s-ink').checked ? 'On. ' : 'Off. ') + 'A ruled space under each question to write your answer on, with a stylus, a mouse or a finger: a pen and an eraser, three colours, three sizes, undo and redo. It is as long as the question’s marks need; the bar with the arrow under it adds lines, and a tool takes the added lines away again. The Answer spaces button on the question bank’s bottom bar (or W) switches it too. With a stylus, a finger scrolls the page; without one, two fingers do. What you write is kept in this browser.'
    },
    ai: {
      title: 'Include AI practice questions',
      text: () => 'Shows the practice questions written for the site, and the ones predicted for the next exams, with the past-paper questions. The question bank has the same tick box in its filters.'
    },
    regional: {
      title: 'Leave out regional papers',
      text: () => 'Pearson’s regional versions of a paper (paper A), set since 2025 alongside the main one. Biology’s repeat the main papers question for question, so the bank already leaves those out.'
    }
  };

  let shown = '';
  function describe(key, force) {
    if (!INFO[key] || (key === shown && !force)) return;
    shown = key;
    document.querySelectorAll('.st-row').forEach((r) => r.classList.toggle('is-hot', r.dataset.key === key));
    const i = INFO[key];
    CTL().typeIn($('#info-title'), i.title);
    $('#info-text').textContent = i.text();
    const fig = $('#info-figure');
    fig.innerHTML = i.figure ? i.figure() : '';
    fig.hidden = !i.figure;
  }

  const saved = (what, value) => CTL().toast('Setting saved', what + ': ' + value, 'Saved in this browser.', 'check');

  function start() {
    // Mode
    const seg = $('#s-theme');
    const paintTheme = (t) => seg.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.v === t;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    const T = window.IALQB_THEME;
    paintTheme(T ? T.get() : document.documentElement.dataset.theme);
    if (T) T.onChange(paintTheme);
    const pickTheme = (b) => {
      if (!T || b.getAttribute('aria-checked') === 'true') return;
      T.set(b.dataset.v);
      saved('Mode', b.textContent);
    };
    seg.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) pickTheme(b); });
    seg.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const bs = Array.from(seg.querySelectorAll('button'));
      const j = (bs.indexOf(document.activeElement) + 1) % bs.length;
      bs[j].focus();
      pickTheme(bs[j]);
    });

    // The old design: saved, then the same page in it (js/theme.js sends every page there from now on).
    const og = $('#s-og');
    og.checked = false;
    og.addEventListener('change', () => {
      if (!og.checked) return;
      set('ialqb_style', 'og');
      describe('og', true);
      setTimeout(() => { location.href = '/og' + location.pathname + location.search; }, 250);
    });

    // The question bank's choices
    const side = $('#s-side');
    side.checked = get('ialqb_ms_side') !== '0';
    side.addEventListener('change', () => {
      set('ialqb_ms_side', side.checked ? null : '0');
      describe('side', true);
      saved('Mark scheme beside the question', side.checked ? 'On' : 'Off');
    });
    const ink = $('#s-ink');
    ink.checked = get('ialqb_ink') !== '0';
    ink.addEventListener('change', () => {
      set('ialqb_ink', ink.checked ? null : '0');
      describe('ink', true);
      saved('Answer space under each question', ink.checked ? 'On' : 'Off');
    });
    const ai = $('#s-ai');
    ai.checked = get('ialqb_tb_source') !== 'past';
    ai.addEventListener('change', () => {
      const was = get('ialqb_tb_source');
      set('ialqb_tb_source', ai.checked ? (was === 'ai' ? 'ai' : '') : 'past');
      saved('Include AI practice questions', ai.checked ? 'On' : 'Off');
    });
    const reg = $('#s-regional');
    reg.checked = get('ialqb_tb_noregional') === '1';
    reg.addEventListener('change', () => {
      set('ialqb_tb_noregional', reg.checked ? '1' : '');
      saved('Leave out regional papers', reg.checked ? 'On' : 'Off');
    });

    // The description panel follows the pointer and the focus.
    const opts = $('.st-options');
    opts.addEventListener('mouseover', (e) => { const r = e.target.closest('.st-row'); if (r) describe(r.dataset.key); });
    opts.addEventListener('focusin', (e) => { const r = e.target.closest('.st-row'); if (r) describe(r.dataset.key); });
    describe('side', true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
