/* IAL Prep — the answer space under each question in the question bank: a ruled page to write or
   draw on with a stylus, a mouse or a finger. window.IALQB_INK.pad(id, marks, label) returns the
   element; js/topicbank.js puts one under each question.

   - Its height follows the question's marks: 4 lines, and 3 more for each mark (up to 30). The bar
     with the arrow along its foot adds 6 lines (up to 60); the "remove added space" tool takes the
     added lines away again, all but those that have writing on them.
   - Tools: pen and eraser (the eraser takes out whole strokes it touches), three colours, three
     sizes, undo, redo, clear and remove added space (all of them can be undone).
   - With a stylus, the stylus writes and a finger scrolls the page (so a resting hand does not
     draw). Without one, a finger writes and two fingers scroll. A stylus once used is remembered.
   - Strokes are kept as points on a page 1000 units wide, so a drawing keeps its place whatever
     width the card is drawn at, and are saved in this browser (IndexedDB, 'ialqb-ink'), one record
     per question. Colours are kept as names, so ink stays readable in dark and light mode.
   - A page is only set up when it comes near the screen. */
(function () {
  'use strict';

  const W = 1000;          // the page's width in its own units
  const LINE = 40;         // the gap between ruled lines, in those units
  const SIZES = [2.2, 4, 7];
  const ERASE = 16;        // how near the eraser has to come to a stroke, in page units
  const COLOURS = {
    dark: { ink: '#f1f1ee', blue: '#6cc4ff', red: '#ff6a5e', ground: '#141415', rule: 'rgba(255,255,255,0.09)', margin: 'rgba(255,255,255,0.05)' },
    light: { ink: '#141414', blue: '#0b5fd6', red: '#c4141c', ground: '#fbfbf8', rule: 'rgba(0,0,0,0.12)', margin: 'rgba(0,0,0,0.05)' }
  };
  const theme = () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
  const linesFor = (marks) => Math.min(30, 4 + 3 * Math.max(1, marks || 1));

  /* ---------- Saving ---------- */
  const cache = new Map();   // id -> { s: [strokes], extra: lines added }
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      if (!window.indexedDB) { resolve(null); return; }
      let req;
      try { req = indexedDB.open('ialqb-ink', 1); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => req.result.createObjectStore('pads');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    return dbp;
  }
  function load(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    return db().then((d) => new Promise((resolve) => {
      const empty = { s: [], extra: 0 };
      if (!d) { cache.set(id, empty); resolve(empty); return; }
      try {
        const req = d.transaction('pads').objectStore('pads').get(id);
        req.onsuccess = () => { const v = req.result || empty; if (!cache.has(id)) cache.set(id, v); resolve(cache.get(id)); };
        req.onerror = () => { cache.set(id, empty); resolve(empty); };
      } catch (e) { cache.set(id, empty); resolve(empty); }
    }));
  }
  const timers = new Map();
  function save(id) {
    clearTimeout(timers.get(id));
    timers.set(id, setTimeout(() => {
      const v = cache.get(id);
      db().then((d) => {
        if (!d || !v) return;
        try {
          const st = d.transaction('pads', 'readwrite').objectStore('pads');
          if (!v.s.length && !v.extra) st.delete(id); else st.put(v, id);
        } catch (e) { /* storage blocked: the drawing stays for this visit */ }
      });
    }, 400));
  }

  let penSeen = false;
  try { penSeen = localStorage.getItem('ialqb_ink_pen') === '1'; } catch (e) { /* storage blocked */ }

  /* ---------- Drawing ---------- */
  // A stroke: { c: colour name, z: size 0-2, p: [x, y, pressure 0-100, ...] } in page units.
  function drawStroke(ctx, st, k, pal) {
    const p = st.p;
    const base = SIZES[st.z] * k;
    ctx.strokeStyle = pal[st.c] || pal.ink;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (p.length <= 3) {
      ctx.beginPath();
      ctx.arc(p[0] * k, p[1] * k, base * 0.6, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Short segments, each as wide as the pressure at its start, along a smoothed line.
    for (let i = 3; i < p.length; i += 3) {
      const x0 = p[i - 3] * k, y0 = p[i - 2] * k, x1 = p[i] * k, y1 = p[i + 1] * k;
      const pr = (p[i - 1] + p[i + 2]) / 200;
      ctx.lineWidth = base * (0.55 + 0.9 * pr);
      ctx.beginPath();
      if (i >= 6) {
        const mx0 = (p[i - 6] * k + x0) / 2, my0 = (p[i - 5] * k + y0) / 2;
        ctx.moveTo(mx0, my0);
        ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      } else {
        ctx.moveTo(x0, y0);
        ctx.lineTo((x0 + x1) / 2, (y0 + y1) / 2);
      }
      ctx.stroke();
    }
    const n = p.length;
    ctx.lineWidth = base * (0.55 + 0.9 * p[n - 1] / 100);
    ctx.beginPath();
    ctx.moveTo((p[n - 6] * k + p[n - 3] * k) / 2, (p[n - 5] * k + p[n - 2] * k) / 2);
    ctx.lineTo(p[n - 3] * k, p[n - 2] * k);
    ctx.stroke();
  }

  const ICON = {
    pen: '<path d="m4 16 1-4 8.5-8.5a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3L8 15z"/><path d="m12 5 3 3"/>',
    eraser: '<path d="m8.5 16.5 8-8a1.6 1.6 0 0 0 0-2.3l-2.7-2.7a1.6 1.6 0 0 0-2.3 0L3.5 11.5a1.6 1.6 0 0 0 0 2.3l2.7 2.7zM8.5 16.5H17M6.5 8.5l5 5"/>',
    undo: '<path d="M7.5 5 4 8.5 7.5 12"/><path d="M4 8.5h8a4 4 0 0 1 0 8H9"/>',
    redo: '<path d="M12.5 5 16 8.5 12.5 12"/><path d="M16 8.5H8a4 4 0 0 0 0 8h3"/>',
    clear: '<path d="M4.5 6h11M8 6V4.5h4V6M6 6l.8 10h6.4L14 6"/>',
    more: '<path d="M5 8l5 5 5-5"/>',
    reset: '<path d="M10 2.5v5m0 0L7.5 5M10 7.5 12.5 5M10 17.5v-5m0 0-2.5 2.5m2.5-2.5 2.5 2.5M4 10h12"/>'
  };
  const svg = (k) => '<svg viewBox="0 0 20 20" aria-hidden="true">' + ICON[k] + '</svg>';

  const pads = new Set();
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); e.target.__ink && e.target.__ink.init(); } }), { rootMargin: '600px 0px' })
    : null;

  function pad(id, marks, label) {
    const box = document.createElement('div');
    box.className = 'ink';
    box.innerHTML =
      '<div class="ink-bar" role="toolbar" aria-label="Answer space tools">' +
        '<span class="ink-title">Answer space</span>' +
        '<div class="ink-tools">' +
          '<button type="button" class="ink-btn" data-tool="pen" aria-pressed="true" title="Pen" aria-label="Pen">' + svg('pen') + '</button>' +
          '<button type="button" class="ink-btn" data-tool="eraser" aria-pressed="false" title="Eraser: takes out whole strokes" aria-label="Eraser">' + svg('eraser') + '</button>' +
          '<span class="ink-sep" aria-hidden="true"></span>' +
          '<button type="button" class="ink-btn ink-sw" data-colour="ink" aria-pressed="true" title="Ink" aria-label="Ink colour"><i></i></button>' +
          '<button type="button" class="ink-btn ink-sw" data-colour="blue" aria-pressed="false" title="Blue" aria-label="Blue"><i></i></button>' +
          '<button type="button" class="ink-btn ink-sw" data-colour="red" aria-pressed="false" title="Red" aria-label="Red"><i></i></button>' +
          '<span class="ink-sep" aria-hidden="true"></span>' +
          '<button type="button" class="ink-btn ink-sz" data-size="0" aria-pressed="true" title="Fine" aria-label="Fine line"><i></i></button>' +
          '<button type="button" class="ink-btn ink-sz" data-size="1" aria-pressed="false" title="Medium" aria-label="Medium line"><i></i></button>' +
          '<button type="button" class="ink-btn ink-sz" data-size="2" aria-pressed="false" title="Thick" aria-label="Thick line"><i></i></button>' +
          '<span class="ink-sep" aria-hidden="true"></span>' +
          '<button type="button" class="ink-btn" data-ink="undo" title="Undo" aria-label="Undo" disabled>' + svg('undo') + '</button>' +
          '<button type="button" class="ink-btn" data-ink="redo" title="Redo" aria-label="Redo" disabled>' + svg('redo') + '</button>' +
          '<button type="button" class="ink-btn" data-ink="clear" title="Clear the page (Undo brings it back)" aria-label="Clear" disabled>' + svg('clear') + '</button>' +
          '<button type="button" class="ink-btn" data-ink="reset" title="Remove the added space (lines with writing on them stay)" aria-label="Remove added space" disabled>' + svg('reset') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="ink-page"><canvas role="img"></canvas></div>' +
      '<button type="button" class="ink-more" title="Six more lines" aria-label="More space">' + svg('more') + '<span>More space</span></button>';
    const page = box.querySelector('.ink-page');
    const canvas = box.querySelector('canvas');
    canvas.setAttribute('aria-label', 'Answer space' + (label ? ' for ' + label : '') + ': write or draw your working here');
    const base = linesFor(marks);
    const setHeight = (extra) => { page.style.aspectRatio = W + ' / ' + ((base + (extra || 0)) * LINE); };
    setHeight(0);

    let data = null;
    let ready = false;
    let tool = 'pen';
    let colour = 'ink';
    let size = 0;
    const undo = [];
    const redo = [];
    let ctx = null;
    let k = 1;          // CSS pixels per page unit
    let ro = null;

    function paintBar() {
      box.querySelectorAll('[data-tool]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === tool)));
      box.querySelectorAll('[data-colour]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.colour === colour)));
      box.querySelectorAll('[data-size]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === size)));
      box.querySelector('[data-ink="undo"]').disabled = !undo.length;
      box.querySelector('[data-ink="redo"]').disabled = !redo.length;
      box.querySelector('[data-ink="clear"]').disabled = !data || !data.s.length;
      box.querySelector('.ink-more').disabled = !!data && base + data.extra >= 60;
      box.querySelector('[data-ink="reset"]').disabled = !data || keepLines() === null;
      box.classList.toggle('is-eraser', tool === 'eraser');
    }

    // How many added lines Remove added space would leave: enough for the lowest writing, and no
    // more than there are now. null when nothing would go.
    function keepLines() {
      let low = 0;
      data.s.forEach((st) => { for (let j = 1; j < st.p.length; j += 3) if (st.p[j] > low) low = st.p[j]; });
      const need = Math.max(0, Math.ceil((low + 14) / LINE) - base);
      return need < data.extra ? need : null;
    }

    function size2canvas() {
      const r = page.getBoundingClientRect();
      if (!r.width) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      k = r.width / W;
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return true;
    }
    function render() {
      if (!ready || !ctx) return;
      const pal = COLOURS[theme()];
      const w = canvas.width, h = canvas.height;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = pal.ground;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      // Ruled lines, as on the paper's answer pages, and a faint margin.
      const lines = base + data.extra;
      ctx.strokeStyle = pal.rule;
      ctx.lineWidth = 1;
      for (let i = 1; i < lines; i++) {
        const y = Math.round(i * LINE * k) + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W * k, y);
        ctx.stroke();
      }
      ctx.strokeStyle = pal.margin;
      ctx.beginPath();
      ctx.moveTo(Math.round(56 * k) + 0.5, 0);
      ctx.lineTo(Math.round(56 * k) + 0.5, lines * LINE * k);
      ctx.stroke();
      data.s.forEach((st) => drawStroke(ctx, st, k, pal));
    }

    function init() {
      if (ready) return;
      load(id).then((d) => {
        data = d;
        ready = true;
        setHeight(data.extra);
        requestAnimationFrame(() => { if (size2canvas()) render(); });
        if ('ResizeObserver' in window) {
          let last = 0;
          ro = new ResizeObserver((es) => {
            const w = Math.round(es[0].contentRect.width);
            if (w && w !== last) { last = w; if (size2canvas()) render(); }
          });
          ro.observe(page);
        }
        paintBar();
      });
    }

    // Page units from a pointer event.
    function at(e) {
      const r = canvas.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) / k), Math.round((e.clientY - r.top) / k), Math.round((e.pressure || 0.5) * 100)];
    }
    const distSeg = (px, py, ax, ay, bx, by) => {
      const dx = bx - ax, dy = by - ay;
      const l = dx * dx + dy * dy;
      let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    };
    function eraseAt(x, y, gone) {
      const keep = [];
      data.s.forEach((st, i) => {
        const p = st.p;
        let hit = false;
        for (let j = 0; j < p.length && !hit; j += 3) {
          if (j + 3 < p.length) hit = distSeg(x, y, p[j], p[j + 1], p[j + 3], p[j + 4]) < ERASE + SIZES[st.z];
          else hit = Math.hypot(x - p[j], y - p[j + 1]) < ERASE + SIZES[st.z];
        }
        if (hit) gone.push([i + gone.length, st]); else keep.push(st);
      });
      if (keep.length !== data.s.length) { data.s = keep; render(); }
    }

    let stroke = null;      // the stroke being drawn
    let erased = null;      // strokes the eraser has taken out in this movement
    let drawId = null;
    const touches = new Map();
    let panY = null;

    function cancelStroke() {
      if (stroke) { stroke = null; render(); }
      drawId = null;
    }
    canvas.addEventListener('pointerdown', (e) => {
      if (!ready) return;
      if (e.pointerType === 'pen' && !penSeen) {
        penSeen = true;
        try { localStorage.setItem('ialqb_ink_pen', '1'); } catch (err) { /* storage blocked */ }
      }
      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, e.clientY);
        // A stylus writes and fingers scroll; without one, a second finger turns writing into scrolling.
        if (penSeen || touches.size > 1) {
          if (touches.size > 1) cancelStroke();
          panY = e.clientY;
          return;
        }
      }
      if (e.button > 0 || drawId !== null) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      drawId = e.pointerId;
      const pt = at(e);
      if (tool === 'eraser') {
        erased = [];
        eraseAt(pt[0], pt[1], erased);
      } else {
        stroke = { c: colour, z: size, p: pt };
        drawStroke(ctx, stroke, k, COLOURS[theme()]);
      }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && panY !== null && e.pointerId !== drawId) {
        const was = touches.get(e.pointerId);
        if (was != null) {
          window.scrollBy(0, (was - e.clientY) / Math.max(1, touches.size));
          touches.set(e.pointerId, e.clientY);
        }
        return;
      }
      if (e.pointerId !== drawId) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      (evs.length ? evs : [e]).forEach((ev) => {
        const pt = at(ev);
        if (tool === 'eraser') { eraseAt(pt[0], pt[1], erased); return; }
        const p = stroke.p;
        if (Math.abs(pt[0] - p[p.length - 3]) + Math.abs(pt[1] - p[p.length - 2]) < 2) return;
        p.push(pt[0], pt[1], pt[2]);
        // Draw just the newest piece; the whole line is drawn smoothly again when it ends.
        const n = p.length;
        const pal = COLOURS[theme()];
        ctx.strokeStyle = pal[stroke.c] || pal.ink;
        ctx.lineCap = 'round';
        ctx.lineWidth = SIZES[stroke.z] * k * (0.55 + 0.9 * (p[n - 4] + p[n - 1]) / 200);
        ctx.beginPath();
        ctx.moveTo(p[n - 6] * k, p[n - 5] * k);
        ctx.lineTo(p[n - 3] * k, p[n - 2] * k);
        ctx.stroke();
      });
    });
    const end = (e) => {
      if (e.pointerType === 'touch') {
        touches.delete(e.pointerId);
        if (!touches.size) panY = null;
      }
      if (e.pointerId !== drawId) return;
      drawId = null;
      if (tool === 'eraser') {
        if (erased && erased.length) { undo.push({ t: 'erase', g: erased }); redo.length = 0; save(id); }
        erased = null;
      } else if (stroke) {
        if (e.type === 'pointercancel') { cancelStroke(); return; }
        data.s.push(stroke);
        undo.push({ t: 'add', st: stroke });
        redo.length = 0;
        stroke = null;
        render();
        save(id);
      }
      paintBar();
    };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', (e) => { if (e.pointerId === drawId) end(e); });

    function apply(step, back) {
      if (step.t === 'add') {
        if (back) data.s.splice(data.s.lastIndexOf(step.st), 1); else data.s.push(step.st);
      } else if (step.t === 'erase') {
        if (back) step.g.slice().sort((a, b) => a[0] - b[0]).forEach(([i, st]) => data.s.splice(Math.min(i, data.s.length), 0, st));
        else step.g.forEach(([, st]) => { const i = data.s.indexOf(st); if (i >= 0) data.s.splice(i, 1); });
      } else if (step.t === 'clear') {
        data.s = back ? step.all.slice() : [];
      } else if (step.t === 'size') {
        data.extra = back ? step.from : step.to;
        setHeight(data.extra);
        requestAnimationFrame(() => { size2canvas(); render(); });
        return;
      }
      render();
    }
    box.querySelector('.ink-bar').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !ready) return;
      if (b.dataset.tool) tool = b.dataset.tool;
      else if (b.dataset.colour) { colour = b.dataset.colour; tool = 'pen'; }
      else if (b.dataset.size) { size = +b.dataset.size; tool = 'pen'; }
      else if (b.dataset.ink === 'undo' && undo.length) { const s = undo.pop(); apply(s, true); redo.push(s); save(id); }
      else if (b.dataset.ink === 'redo' && redo.length) { const s = redo.pop(); apply(s, false); undo.push(s); save(id); }
      else if (b.dataset.ink === 'clear' && data.s.length) { const s = { t: 'clear', all: data.s.slice() }; apply(s, false); undo.push(s); redo.length = 0; save(id); }
      else if (b.dataset.ink === 'reset' && keepLines() !== null) { const s = { t: 'size', from: data.extra, to: keepLines() }; apply(s, false); undo.push(s); redo.length = 0; save(id); }
      paintBar();
    });
    box.querySelector('.ink-more').addEventListener('click', () => {
      if (!ready || base + data.extra >= 60) return;
      const s = { t: 'size', from: data.extra, to: Math.min(60 - base, data.extra + 6) };
      apply(s, false);
      undo.push(s);
      redo.length = 0;
      save(id);
      paintBar();
    });

    box.__ink = { init: init, render: render };
    pads.add(box);
    if (io) io.observe(box); else setTimeout(init, 0);
    return box;
  }

  // Ink follows light and dark mode.
  const redrawAll = () => pads.forEach((b) => { if (!b.isConnected) { pads.delete(b); return; } b.__ink.render(); });
  if (window.IALQB_THEME) window.IALQB_THEME.onChange(() => requestAnimationFrame(redrawAll));

  window.IALQB_INK = { pad: pad };
})();
