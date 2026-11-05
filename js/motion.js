/* IAL Prep — how the site moves. Buttons sink a little while pressed and spring back
   when let go, so a tap feels like a tap (with a short vibration tick on phones that
   allow it). Page changes are animated in styles.css; this file marks the browsers
   that cannot animate between pages, so they fade the new page in instead. Loaded in
   <head> on every page, right after theme.js, before the page is drawn. */
(function () {
  'use strict';

  const root = document.documentElement;
  const calm = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  // Browsers that animate from one page to the next by themselves (cross-page view
  // transitions) also have the pagereveal event. The rest get html.no-vt.
  if (!('onpagereveal' in window)) root.classList.add('no-vt');

  // Everything that acts as a button, including links styled as one.
  const TACTILE = [
    'button', 'summary', '[role="button"]', '.btn',
    '.logo', '.bank-back', '.nav-link', '.nav-links li a', '.page-nav a', '.unit-card li a', '.toc a',
    '.bank-logo', '.subject-tab', '.subject-links a', '.paper-pdf', '.drawer-link'
  ].join(', ');

  const PRESSED = '0.95';
  const presses = new Map();

  function target(e) {
    const el = e.target.closest ? e.target.closest(TACTILE) : null;
    return el && !el.disabled && el.getAttribute('aria-disabled') !== 'true' ? el : null;
  }

  // The `scale` property is used rather than `transform`, so the press adds to any
  // hover tilt or nudge a button already has instead of replacing it.
  function press(el) {
    if (!el.animate || (calm && calm.matches)) return;
    const old = presses.get(el);
    if (old) old.cancel();
    presses.set(el, el.animate([{ scale: '1' }, { scale: PRESSED }], { duration: 90, easing: 'ease-out', fill: 'forwards' }));
  }

  function release(el) {
    const anim = presses.get(el);
    if (!anim) return;
    presses.delete(el);
    const now = parseFloat(getComputedStyle(el).scale) || 1;
    anim.cancel();
    // A quick tap lets go before the button has moved, so it still dips once.
    const frames = now > 0.97
      ? [{ scale: String(now), easing: 'ease-out' }, { scale: PRESSED, offset: 0.3, easing: 'cubic-bezier(.34, 1.56, .64, 1)' }, { scale: '1' }]
      : [{ scale: String(now), easing: 'cubic-bezier(.34, 1.56, .64, 1)' }, { scale: '1' }];
    el.animate(frames, { duration: now > 0.97 ? 300 : 260 });
  }

  function releaseAll() {
    Array.from(presses.keys()).forEach(release);
  }

  document.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    const el = target(e);
    if (el) press(el);
  }, { passive: true });
  document.addEventListener('pointerup', releaseAll, { passive: true });
  document.addEventListener('pointercancel', releaseAll, { passive: true });
  window.addEventListener('blur', releaseAll);

  document.addEventListener('click', (e) => {
    const el = target(e);
    if (!el) return;
    // Enter or Space on a focused button: no pointer, so play the whole tap here.
    if (e.detail === 0) { press(el); release(el); }
    // A tiny tick on phones that support it (Android; iPhones do not allow it).
    if (navigator.vibrate && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      try { navigator.vibrate(8); } catch (err) { /* vibration blocked: the visual press is enough */ }
    }
  });
})();
