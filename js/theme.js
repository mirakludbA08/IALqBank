/* IAL Prep — light and dark mode on every page. Loaded in <head> so the page is
   drawn in the right theme from the start. The reader's choice is kept in
   localStorage; until they choose, the page follows the device setting. The
   round button in the bottom corner switches between the two. */
(function () {
  'use strict';

  const KEY = 'ialqb_theme';
  const root = document.documentElement;
  const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const ICONS = {
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 1 1 9.8 3.5a6.8 6.8 0 0 0 10.7 10.7z"/></svg>',
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function current() {
    return saved() || (media && media.matches ? 'dark' : 'light');
  }

  function apply(theme) {
    root.dataset.theme = theme;
    const btn = document.querySelector('.theme-toggle');
    if (!btn) return;
    const label = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    btn.setAttribute('aria-label', label);
    btn.title = label;
    // Show the mode the button switches to.
    btn.innerHTML = theme === 'dark' ? ICONS.light : ICONS.dark;
  }

  apply(current());
  if (media && media.addEventListener) media.addEventListener('change', () => { if (!saved()) apply(current()); });

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch (e) { /* storage blocked: the switch still works on this page */ }
      apply(next);
    });
    document.body.appendChild(btn);
    apply(root.dataset.theme);
  });
})();
