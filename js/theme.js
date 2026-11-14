/* IAL Prep — light and dark mode on every page. Loaded in <head> so the page is
   drawn in the right theme from the start. Dark is the default; the reader's choice
   is kept in localStorage. The button in the top bar (js/nav.js) switches. */

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

  // Dark is the site's look; light mode is the reader's choice, kept in localStorage. The switch
  // is the "Light mode" / "Dark mode" button in the top bar (js/nav.js).
  const KEY = 'ialqb_theme';
  const root = document.documentElement;
  const listeners = [];

  function saved() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    root.dataset.theme = theme === 'light' ? 'light' : 'dark';
    listeners.forEach((f) => f(root.dataset.theme));
  }

  apply(saved() || 'dark');

  window.IALQB_THEME = {
    get: () => root.dataset.theme,
    set(theme) {
      try { localStorage.setItem(KEY, theme); } catch (e) { /* storage blocked: the switch still works on this page */ }
      apply(theme);
    },
    toggle() { this.set(root.dataset.theme === 'light' ? 'dark' : 'light'); },
    onChange(f) { listeners.push(f); }
  };
})();

/* Notes pages: a topics sidebar the reader hid (its Hide button, js/script.js) stays hidden. It is
   set here, in <head>, so the page is drawn that way from the start instead of jumping. */
(function () {
  try {
    if (localStorage.getItem('ialqb_notes_nav_hidden') === '1') document.documentElement.classList.add('notes-nav-hidden');
  } catch (e) { /* storage blocked: the sidebar shows */ }
})();
