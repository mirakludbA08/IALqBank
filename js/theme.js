/* IAL Prep — light and dark mode on every page. Loaded in <head> so the page is
   drawn in the right theme from the start. The reader's choice is kept in
   localStorage; until they choose, the page follows the device setting. The
   round button in the bottom corner switches between the two. */

/* The site's home is ialprep.com. It used to be mirakludba08.github.io/IALqBank, and it can also
   be reached at www.ialprep.com or a Cloudflare pages.dev address. Each address keeps its own
   saved progress, so an old address sends the visitor to the same page on ialprep.com and takes
   their progress (every "ialqb" key) along in the # part of the address. ialprep.com adds it to
   anything saved there already and puts the address back as it was. */
(function () {
  'use strict';
  const HOME = 'ialprep.com';
  const TAG = '#ialqb-move=';
  const host = location.hostname;
  if (host === 'www.' + HOME || host === 'mirakludba08.github.io' || /\.pages\.dev$/.test(host)) {
    const path = host === 'mirakludba08.github.io' ? location.pathname.replace(/^\/IALqBank(\/|$)/, '/') : location.pathname;
    const saved = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf('ialqb') === 0) saved[k] = localStorage.getItem(k);
      }
    } catch (e) { /* storage blocked: nothing to take */ }
    const carry = Object.keys(saved).length ? TAG + encodeURIComponent(JSON.stringify({ d: saved, h: location.hash })) : location.hash;
    location.replace('https://' + HOME + path + location.search + carry);
    return;
  }
  if (location.hash.indexOf(TAG) !== 0) return;
  let moved = null;
  try { moved = JSON.parse(decodeURIComponent(location.hash.slice(TAG.length))); } catch (e) { moved = null; }
  try { history.replaceState(null, '', location.pathname + location.search + ((moved && moved.h) || '')); } catch (e) { /* leave the address */ }
  if (!moved || !moved.d) return;
  try {
    Object.keys(moved.d).forEach((k) => {
      if (k.indexOf('ialqb') !== 0) return;
      const mine = localStorage.getItem(k);
      if (mine == null) { localStorage.setItem(k, moved.d[k]); return; }
      // Saved at both addresses: lists (done, review later, selected) are joined; for "where you
      // left off" the later one wins; anything else keeps what ialprep.com already has.
      let a, b;
      try { a = JSON.parse(mine); b = JSON.parse(moved.d[k]); } catch (e) { return; }
      if (Array.isArray(a) && Array.isArray(b)) localStorage.setItem(k, JSON.stringify([...new Set(a.concat(b))]));
      else if (a && b && typeof a === 'object' && typeof b === 'object' && (b.at || 0) > (a.at || 0)) localStorage.setItem(k, moved.d[k]);
    });
  } catch (e) { /* storage blocked */ }
})();

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
