/* IAL Prep, old design (og/): the newer site's small features, in the old look.
   - Back to top: a round button above the light/dark button, once the page is a screen down.
   - Notes that pop up for a moment ("Question done", "Answer spaces off"): window.OGX.toast().
   Loaded with defer on every page under og/ (tools/build-og.py adds it), with css/og-extras.css. */
(function () {
  'use strict';

  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Pop-up notes ----------
     toast(title, text, small): a card at the bottom left for a few seconds; a newer one replaces it. */
  let box = null;
  let timer = 0;
  function toast(title, text, small) {
    if (!box) {
      box = document.createElement('div');
      box.className = 'og-toasts';
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'og-toast';
    const b = document.createElement('strong');
    b.textContent = title;
    t.appendChild(b);
    if (text) { const s = document.createElement('span'); s.textContent = text; t.appendChild(s); }
    if (small) { const m = document.createElement('small'); m.textContent = small; t.appendChild(m); }
    box.replaceChildren(t);
    requestAnimationFrame(() => t.classList.add('is-on'));
    clearTimeout(timer);
    timer = setTimeout(() => {
      t.classList.remove('is-on');
      setTimeout(() => t.remove(), calm() ? 0 : 250);
    }, 3200);
  }

  /* ---------- Back to top ---------- */
  function backToTop() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'og-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.title = 'Back to top';
    btn.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 16.5V4m0 0L4.5 9.5M10 4l5.5 5.5"/></svg>';
    document.body.appendChild(btn);
    let raf = 0;
    const paint = () => {
      raf = 0;
      const on = window.scrollY > Math.max(400, window.innerHeight * 0.9);
      btn.classList.toggle('is-on', on);
      document.body.classList.toggle('og-top-on', on);
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(paint); };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    paint();
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
      // Keyboard users carry on from the top of the page: its heading, or the main content.
      const h = Array.from(document.querySelectorAll('h1')).find((x) => x.offsetParent !== null) || document.querySelector('main');
      if (h) {
        if (!h.hasAttribute('tabindex')) {
          h.setAttribute('tabindex', '-1');
          h.addEventListener('blur', () => h.removeAttribute('tabindex'), { once: true });
        }
        h.focus({ preventScroll: true });
      }
    });
  }

  window.OGX = { toast: toast };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', backToTop); else backToTop();
})();
