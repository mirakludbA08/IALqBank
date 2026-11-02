/* Sim — a small helper library for the interactive diagrams on Physics Notes.

   Usage (from a page's js/topics/<page>.js file):

     Sim.create('#sim-id', {
       title: 'Projectile launcher',
       height: 360,                       // or (w) => Math.min(420, w * 0.6)
       controls: [
         { key: 'angle', label: 'Launch angle θ', min: 0, max: 90, step: 1, value: 45, unit: '°' },
         { key: 'metal', type: 'select', label: 'Metal', options: [['na', 'Sodium'], ['zn', 'Zinc']] },
         { key: 'trail', type: 'check', label: 'Show trail', value: true },
         { type: 'button', label: 'Launch', onClick: (s) => { ... } }
       ],
       animate: true,                     // run update/draw every frame (pauses when off-screen)
       init(s) { s.state.x = 0; },        // runs once, and again when Reset is pressed
       update(s, dt) { ... },             // physics step, dt in seconds
       draw(s) { const { ctx, w, h, p } = s; ... },
       readout: (s) => [['Range', Sim.fmt(R) + ' m'], ...],   // or an HTML string
       pointer: { down(s, pt) {}, move(s, pt) {}, up(s, pt) {} }
     });

   s.ctx is a 2D canvas context already scaled for the screen; s.w and s.h are
   the size in CSS pixels; s.p holds the current control values. */
(function (global) {
  'use strict';

  const C = {
    navy: '#002b80',
    blue: '#007bff',
    sky: '#4dabf7',
    red: '#e03131',
    orange: '#f08c00',
    green: '#2f9e44',
    purple: '#7048e8',
    pink: '#d6336c',
    teal: '#0ca678',
    grey: '#868e96',
    ink: '#333333',
    muted: '#5b6573',
    light: '#e9ecef',
    grid: '#edf1f7',
    axis: '#495057',
    bg: '#ffffff'
  };
  const FONT = 'bryant-web, sans-serif';

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- number formatting ---------- */
  const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const sup = (n) => String(n).split('').map((c) => SUP[c] || c).join('');
  function fmt(v, sig) {
    sig = sig || 3;
    if (v == null || !isFinite(v)) return '—';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e-3 && a < 1e5) {
      const d = clamp(sig - 1 - Math.floor(Math.log10(a)), 0, 6);
      let s = v.toFixed(d);
      if (s === '-0' || /^-0\.?0*$/.test(s)) s = s.replace('-', '');
      return s;
    }
    let e = Math.floor(Math.log10(a));
    let m = v / Math.pow(10, e);
    if (Math.abs(+m.toFixed(sig - 1)) >= 10) { m /= 10; e += 1; }
    return m.toFixed(sig - 1) + ' × 10' + sup(e);
  }

  /* ---------- drawing helpers ---------- */
  function setFont(ctx, o) {
    ctx.font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + (o.size || 14) + 'px ' + FONT;
  }
  function text(ctx, str, x, y, o) {
    o = o || {};
    ctx.save();
    setFont(ctx, o);
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.rotate) { ctx.translate(x, y); ctx.rotate(o.rotate); x = 0; y = 0; }
    if (o.bg) {
      const m = ctx.measureText(str);
      const pad = o.pad == null ? 4 : o.pad;
      const hgt = (o.size || 14) + pad * 2;
      let left = x - pad;
      if (ctx.textAlign === 'center') left = x - m.width / 2 - pad;
      else if (ctx.textAlign === 'right' || ctx.textAlign === 'end') left = x - m.width - pad;
      let top = y - hgt / 2;
      if (ctx.textBaseline === 'top') top = y - pad;
      else if (ctx.textBaseline === 'bottom' || ctx.textBaseline === 'alphabetic') top = y - hgt + pad;
      ctx.fillStyle = o.bg;
      roundRectPath(ctx, left, top, m.width + pad * 2, hgt, 4);
      ctx.fill();
    }
    ctx.fillStyle = o.color || C.ink;
    ctx.fillText(str, x, y);
    ctx.restore();
  }
  function measure(ctx, str, o) {
    ctx.save();
    setFont(ctx, o || {});
    const w = ctx.measureText(str).width;
    ctx.restore();
    return w;
  }
  function roundRectPath(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function rect(ctx, x, y, w, h, o) {
    o = o || {};
    ctx.save();
    roundRectPath(ctx, x, y, w, h, o.r || 0);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }
  function circle(ctx, x, y, r, o) {
    o = o || {};
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.width || 1.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); }
    ctx.restore();
  }
  function line(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = o.color || C.ink;
    ctx.lineWidth = o.width || 1.5;
    ctx.lineCap = o.cap || 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
  function polyline(ctx, pts, o) {
    o = o || {};
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.strokeStyle = o.color || C.ink;
    ctx.lineWidth = o.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (o.close) ctx.closePath();
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    ctx.stroke();
    ctx.restore();
  }
  /* Arrow from (x1,y1) to (x2,y2). Options: color, width, head, dash, label,
     labelOffset (px beyond the tip), labelColor, size. */
  function arrow(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    const color = o.color || C.ink;
    if (len < 0.5) return;
    const w = o.width || 2.5;
    const head = Math.min(o.head || Math.max(9, w * 3.4), len * 0.7);
    const ux = dx / len, uy = dy / len;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - ux * head * 0.85, y2 - uy * head * 0.85);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux * head - uy * head * 0.45, y2 - uy * head + ux * head * 0.45);
    ctx.lineTo(x2 - ux * head + uy * head * 0.45, y2 - uy * head - ux * head * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (o.label) {
      const off = o.labelOffset == null ? 14 : o.labelOffset;
      text(ctx, o.label, x2 + ux * off, y2 + uy * off, {
        color: o.labelColor || color, bold: true, align: 'center', size: o.size || 14, bg: o.labelBg
      });
    }
  }
  /* Zig-zag spring between two points. Options: coils, width (amplitude), color, lineWidth, lead. */
  function spring(ctx, x1, y1, x2, y2, o) {
    o = o || {};
    const coils = o.coils || 10, amp = o.width || 10, lead = o.lead == null ? 10 : o.lead;
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy);
    if (len < 1) return;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const body = Math.max(1, len - 2 * lead);
    ctx.save();
    ctx.strokeStyle = o.color || C.axis;
    ctx.lineWidth = o.lineWidth || 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
    const n = coils * 2;
    for (let i = 1; i <= n; i++) {
      const t = lead + (body * (i - 0.5)) / n;
      const side = i % 2 ? 1 : -1;
      ctx.lineTo(x1 + ux * t + nx * amp * side, y1 + uy * t + ny * amp * side);
    }
    ctx.lineTo(x2 - ux * lead, y2 - uy * lead);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
  /* Angle arc at (x,y) from angle a1 to a2 (radians, canvas convention: +y down). */
  function arc(ctx, x, y, r, a1, a2, o) {
    o = o || {};
    ctx.save();
    ctx.strokeStyle = o.color || C.ink;
    ctx.lineWidth = o.width || 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r, a1, a2, a2 < a1);
    ctx.stroke();
    ctx.restore();
    if (o.label) {
      const am = (a1 + a2) / 2, lr = r + (o.labelGap || 12);
      text(ctx, o.label, x + Math.cos(am) * lr, y + Math.sin(am) * lr, { color: o.color || C.ink, align: 'center', size: o.size || 14, bold: o.bold });
    }
  }

  /* ---------- graphs ----------
     const g = Sim.graph(ctx, { x, y, w, h, xmin, xmax, ymin, ymax, xlabel, ylabel, title });
     g.axes(); g.plot(fn, { color }); g.path([[x,y],...]); g.fill(fn, a, b); g.dot(x, y); g.px(x); g.py(y) */
  function niceStep(range, target) {
    const raw = range / (target || 5);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / mag;
    return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag;
  }
  function tickLabel(v, step) {
    if (Math.abs(v) < step * 1e-6) return '0';
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) return fmt(v, 2);
    const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return v.toFixed(Math.min(d, 6));
  }
  function graph(ctx, o) {
    const g = Object.assign({ xmin: 0, xmax: 1, ymin: 0, ymax: 1, grid: true, ticks: true, bg: '#fff', xticks: 5, yticks: 5 }, o);
    g.ctx = ctx;
    g.px = (x) => g.x + ((x - g.xmin) / (g.xmax - g.xmin)) * g.w;
    g.py = (y) => g.y + g.h - ((y - g.ymin) / (g.ymax - g.ymin)) * g.h;
    g.inv = (px, py) => ({
      x: g.xmin + ((px - g.x) / g.w) * (g.xmax - g.xmin),
      y: g.ymin + ((g.y + g.h - py) / g.h) * (g.ymax - g.ymin)
    });
    g.inside = (px, py) => px >= g.x && px <= g.x + g.w && py >= g.y && py <= g.y + g.h;
    g.clip = () => { ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.y, g.w, g.h); ctx.clip(); };
    g.unclip = () => ctx.restore();

    g.axes = function () {
      if (g.bg) rect(ctx, g.x, g.y, g.w, g.h, { fill: g.bg });
      const xs = g.xstep || niceStep(g.xmax - g.xmin, g.xticks);
      const ys = g.ystep || niceStep(g.ymax - g.ymin, g.yticks);
      const x0 = g.xmin <= 0 && g.xmax >= 0 ? g.px(0) : g.px(g.xmin);
      const y0 = g.ymin <= 0 && g.ymax >= 0 ? g.py(0) : g.py(g.ymin);
      ctx.save();
      if (g.grid) {
        ctx.strokeStyle = C.grid;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let v = Math.ceil(g.xmin / xs) * xs; v <= g.xmax + xs * 1e-9; v += xs) { const X = Math.round(g.px(v)) + 0.5; ctx.moveTo(X, g.y); ctx.lineTo(X, g.y + g.h); }
        for (let v = Math.ceil(g.ymin / ys) * ys; v <= g.ymax + ys * 1e-9; v += ys) { const Y = Math.round(g.py(v)) + 0.5; ctx.moveTo(g.x, Y); ctx.lineTo(g.x + g.w, Y); }
        ctx.stroke();
      }
      ctx.restore();
      line(ctx, g.x, y0, g.x + g.w, y0, { color: C.axis, width: 1.5 });
      line(ctx, x0, g.y, x0, g.y + g.h, { color: C.axis, width: 1.5 });
      if (g.ticks) {
        const fs = g.tickSize || 11;
        for (let v = Math.ceil(g.xmin / xs) * xs; v <= g.xmax + xs * 1e-9; v += xs) {
          if (Math.abs(v) < xs * 1e-6 && g.ymin < 0) continue;
          const X = g.px(v);
          line(ctx, X, y0, X, y0 + 4, { color: C.axis, width: 1 });
          text(ctx, tickLabel(v, xs), X, y0 + 6, { size: fs, color: C.muted, align: 'center', baseline: 'top' });
        }
        for (let v = Math.ceil(g.ymin / ys) * ys; v <= g.ymax + ys * 1e-9; v += ys) {
          if (Math.abs(v) < ys * 1e-6) continue;
          const Y = g.py(v);
          line(ctx, x0 - 4, Y, x0, Y, { color: C.axis, width: 1 });
          text(ctx, tickLabel(v, ys), x0 - 6, Y, { size: fs, color: C.muted, align: 'right' });
        }
      }
      if (g.xlabel) text(ctx, g.xlabel, g.x + g.w, y0 - 8, { size: 12.5, color: C.ink, align: 'right', baseline: 'bottom', bold: true });
      if (g.ylabel) text(ctx, g.ylabel, x0 + 6, g.y + 2, { size: 12.5, color: C.ink, align: 'left', baseline: 'top', bold: true });
      if (g.title) text(ctx, g.title, g.x + g.w / 2, g.y - 10, { size: 13.5, color: C.navy, align: 'center', bold: true });
      return g;
    };
    g.plot = function (fn, opt) {
      opt = opt || {};
      const a = opt.from == null ? g.xmin : opt.from;
      const b = opt.to == null ? g.xmax : opt.to;
      const n = opt.samples || Math.max(60, Math.round(g.w));
      g.clip();
      ctx.strokeStyle = opt.color || C.blue;
      ctx.lineWidth = opt.width || 2.5;
      ctx.lineJoin = 'round';
      if (opt.dash) ctx.setLineDash(opt.dash);
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const x = a + ((b - a) * i) / n;
        const y = fn(x);
        if (y == null || !isFinite(y)) { pen = false; continue; }
        const X = g.px(x), Y = clamp(g.py(y), g.y - 1e4, g.y + g.h + 1e4);
        if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; }
      }
      ctx.stroke();
      g.unclip();
      return g;
    };
    g.path = function (pts, opt) {
      opt = opt || {};
      if (!pts || pts.length < 2) return g;
      g.clip();
      polyline(ctx, pts.map((p) => [g.px(p[0]), g.py(p[1])]), { color: opt.color || C.blue, width: opt.width || 2.5, dash: opt.dash, alpha: opt.alpha });
      g.unclip();
      return g;
    };
    g.fill = function (fn, a, b, opt) {
      opt = opt || {};
      const n = opt.samples || 120;
      const base = opt.base == null ? 0 : opt.base;
      g.clip();
      ctx.fillStyle = opt.color || 'rgba(0,123,255,0.18)';
      ctx.beginPath();
      ctx.moveTo(g.px(a), g.py(base));
      for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; ctx.lineTo(g.px(x), g.py(fn(x))); }
      ctx.lineTo(g.px(b), g.py(base));
      ctx.closePath();
      ctx.fill();
      g.unclip();
      return g;
    };
    g.dot = function (x, y, opt) {
      opt = opt || {};
      circle(ctx, g.px(x), g.py(y), opt.r || 5, { fill: opt.color || C.red, stroke: opt.stroke || '#fff', width: 1.5 });
      if (opt.label) text(ctx, opt.label, g.px(x) + (opt.dx == null ? 8 : opt.dx), g.py(y) + (opt.dy == null ? -10 : opt.dy), { size: 12.5, color: opt.color || C.red, bold: true, align: opt.align || 'left' });
      return g;
    };
    g.vline = function (x, opt) { opt = opt || {}; line(ctx, g.px(x), g.y, g.px(x), g.y + g.h, { color: opt.color || C.grey, dash: opt.dash || [5, 4], width: opt.width || 1.5 }); return g; };
    g.hline = function (y, opt) { opt = opt || {}; line(ctx, g.x, g.py(y), g.x + g.w, g.py(y), { color: opt.color || C.grey, dash: opt.dash || [5, 4], width: opt.width || 1.5 }); return g; };
    g.label = function (x, y, str, opt) { text(ctx, str, g.px(x), g.py(y), Object.assign({ size: 12.5, bold: true, color: C.ink }, opt || {})); return g; };
    return g;
  }

  /* Approximate RGB colour for a visible wavelength in nm (380–780). */
  function spectrum(nm, alpha) {
    let r = 0, g = 0, b = 0;
    if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
    else if (nm <= 780) { r = 1; }
    let f = 0;
    if (nm >= 380 && nm < 420) f = 0.3 + (0.7 * (nm - 380)) / 40;
    else if (nm >= 420 && nm <= 700) f = 1;
    else if (nm > 700 && nm <= 780) f = 0.3 + (0.7 * (780 - nm)) / 80;
    const k = (c) => Math.round(255 * Math.pow(c * f, 0.8));
    if (nm < 380 || nm > 780) return alpha == null ? 'rgb(120,120,120)' : 'rgba(120,120,120,' + alpha + ')';
    return alpha == null ? 'rgb(' + k(r) + ',' + k(g) + ',' + k(b) + ')' : 'rgba(' + k(r) + ',' + k(g) + ',' + k(b) + ',' + alpha + ')';
  }

  /* ---------- the widget ---------- */
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function create(target, opts) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    if (!root) { console.warn('Sim: no element found for', target); return null; }
    opts = opts || {};
    root.classList.add('sim');
    const caption = root.querySelector(':scope > figcaption');

    const head = el('div', 'sim-head');
    head.innerHTML = '<span class="sim-badge">Interactive</span><span class="sim-title"></span>';
    head.querySelector('.sim-title').textContent = opts.title || root.dataset.title || 'Explore';
    const stage = el('div', 'sim-stage');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', opts.alt || opts.title || 'Interactive diagram');
    stage.appendChild(canvas);
    const controls = el('div', 'sim-controls');
    const buttons = el('div', 'sim-buttons');
    const readout = el('div', 'sim-readout');
    readout.setAttribute('aria-live', 'off');
    root.prepend(head, stage, controls, readout);
    if (caption) root.appendChild(caption);

    const s = {
      el: root, canvas, ctx: canvas.getContext('2d'), w: 0, h: 0,
      p: {}, state: {}, t: 0, frame: 0, running: false, pointer: null, opts,
      controls: {}
    };

    let dirty = false;
    let rafId = null;
    let visible = true;
    let last = null;

    function render() {
      dirty = false;
      const ctx = s.ctx;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      if (opts.background !== false) rect(ctx, 0, 0, s.w, s.h, { fill: opts.background || C.bg });
      try { if (opts.draw) opts.draw(s); } catch (err) { console.error('Sim draw error (' + (opts.title || '') + '):', err); s.pause(); }
      if (opts.readout && (!s.running || s.frame % 4 === 0)) updateReadout();
      s.frame++;
    }
    function updateReadout() {
      let r;
      try { r = opts.readout(s); } catch (err) { console.error('Sim readout error:', err); return; }
      if (Array.isArray(r)) {
        readout.innerHTML = r.map((item) => {
          if (!item) return '';
          const cls = item[2] ? 'ro hl' : 'ro';
          return '<span class="' + cls + '">' + item[0] + ' <b>' + item[1] + '</b></span>';
        }).join('');
      } else if (typeof r === 'string') readout.innerHTML = r;
    }
    function loop(ts) {
      rafId = null;
      if (!s.running || !visible) { last = null; return; }
      const dt = last == null ? 0 : Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const k = s.speed == null ? 1 : s.speed;
      try { if (opts.update) opts.update(s, dt * k); } catch (err) { console.error('Sim update error (' + (opts.title || '') + '):', err); s.pause(); }
      s.t += dt * k;
      render();
      if (s.running) rafId = requestAnimationFrame(loop);
    }
    function kick() {
      if (rafId == null && s.running && visible) rafId = requestAnimationFrame(loop);
    }
    s.redraw = function () {
      if (s.running && visible) return;
      if (!dirty) { dirty = true; requestAnimationFrame(() => { if (dirty) render(); }); }
    };
    s.renderNow = render;
    s.play = function () { s.running = true; last = null; syncPlay(); kick(); };
    s.pause = function () { s.running = false; syncPlay(); s.redraw(); };
    s.reset = function () {
      s.t = 0;
      s.state = {};
      if (opts.init) opts.init(s);
      s.redraw();
    };
    s.set = function (key, value) {
      const c = s.controls[key];
      s.p[key] = value;
      if (c) c.sync(value);
      s.redraw();
    };
    s.setLabel = function (key, label) {
      const c = s.controls[key];
      if (c && c.labelEl) c.labelEl.textContent = label;
    };

    /* controls */
    (opts.controls || []).forEach((c) => addControl(c));
    function addControl(c) {
      const type = c.type || 'range';
      if (type === 'button') {
        const b = el('button', 'btn' + (c.ghost ? ' ghost' : ''));
        b.type = 'button';
        b.textContent = c.label;
        b.addEventListener('click', () => { c.onClick && c.onClick(s, b); s.redraw(); });
        buttons.appendChild(b);
        if (c.key) s.controls[c.key] = { el: b, sync() {} };
        return;
      }
      if (type === 'check') {
        const wrap = el('label', 'ctrl check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!c.value;
        const span = el('span');
        span.textContent = c.label;
        wrap.append(input, span);
        s.p[c.key] = input.checked;
        input.addEventListener('change', () => { s.p[c.key] = input.checked; changed(c, input.checked); });
        controls.appendChild(wrap);
        s.controls[c.key] = { el: input, labelEl: span, sync(v) { input.checked = !!v; } };
        return;
      }
      const wrap = el('div', 'ctrl');
      const lab = el('label', 'ctrl-label');
      const name = el('span');
      name.textContent = c.label;
      lab.appendChild(name);
      const id = 'ctl-' + Math.random().toString(36).slice(2, 9);
      lab.htmlFor = id;
      if (type === 'select') {
        const sel = document.createElement('select');
        sel.id = id;
        (c.options || []).forEach((o) => {
          const op = document.createElement('option');
          op.value = Array.isArray(o) ? o[0] : o;
          op.textContent = Array.isArray(o) ? o[1] : o;
          sel.appendChild(op);
        });
        if (c.value != null) sel.value = c.value;
        s.p[c.key] = sel.value;
        sel.addEventListener('change', () => { s.p[c.key] = sel.value; changed(c, sel.value); });
        wrap.append(lab, sel);
        controls.appendChild(wrap);
        s.controls[c.key] = { el: sel, labelEl: name, sync(v) { sel.value = v; } };
        return;
      }
      const out = el('output');
      lab.appendChild(out);
      const input = document.createElement('input');
      input.type = 'range';
      input.id = id;
      input.min = c.min == null ? 0 : c.min;
      input.max = c.max == null ? 1 : c.max;
      input.step = c.step == null ? 'any' : c.step;
      input.value = c.value == null ? input.min : c.value;
      const show = (v) => { out.textContent = (c.format ? c.format(v) : fmt(v, c.sig || 3)) + (c.unit ? ' ' + c.unit : ''); };
      s.p[c.key] = parseFloat(input.value);
      show(s.p[c.key]);
      input.addEventListener('input', () => {
        const v = parseFloat(input.value);
        s.p[c.key] = v;
        show(v);
        changed(c, v);
      });
      wrap.append(lab, input);
      controls.appendChild(wrap);
      s.controls[c.key] = { el: input, labelEl: name, sync(v) { input.value = v; show(v); } };
    }
    function changed(c, v) {
      if (c.onChange) c.onChange(s, v);
      if (opts.onChange) opts.onChange(s, c.key, v);
      s.redraw();
    }

    let playBtn = null;
    function syncPlay() { if (playBtn) playBtn.textContent = s.running ? '⏸ Pause' : '▶ Play'; }
    if (opts.animate) {
      if (opts.playPause !== false) {
        playBtn = el('button', 'btn');
        playBtn.type = 'button';
        playBtn.addEventListener('click', () => (s.running ? s.pause() : s.play()));
        buttons.prepend(playBtn);
      }
    }
    if (opts.resetButton !== false && (opts.animate || opts.resetButton)) {
      const rb = el('button', 'btn ghost', '↺ Reset');
      rb.type = 'button';
      rb.addEventListener('click', () => s.reset());
      buttons.appendChild(rb);
    }
    if (buttons.children.length) controls.appendChild(buttons);

    /* pointer input */
    if (opts.pointer) {
      canvas.style.touchAction = opts.pointer.touchAction || 'none';
      canvas.style.cursor = opts.pointer.cursor || 'pointer';
      const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, down: false }; };
      canvas.addEventListener('pointerdown', (e) => {
        const pt = pos(e); pt.down = true; s.pointer = pt;
        try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
        if (opts.pointer.down) opts.pointer.down(s, pt, e);
        s.redraw();
      });
      canvas.addEventListener('pointermove', (e) => {
        const pt = pos(e); pt.down = !!(s.pointer && s.pointer.down); s.pointer = pt;
        if (opts.pointer.move) opts.pointer.move(s, pt, e);
        s.redraw();
      });
      const up = (e) => {
        const pt = pos(e); s.pointer = pt;
        if (opts.pointer.up) opts.pointer.up(s, pt, e);
        s.redraw();
      };
      canvas.addEventListener('pointerup', up);
      canvas.addEventListener('pointercancel', up);
      canvas.addEventListener('pointerleave', (e) => {
        if (s.pointer && s.pointer.down) return;
        s.pointer = null;
        if (opts.pointer.leave) opts.pointer.leave(s, e);
        s.redraw();
      });
    }

    /* sizing */
    function resize(first) {
      const w = Math.max(260, Math.round(stage.clientWidth || root.clientWidth || 600));
      let h = typeof opts.height === 'function' ? opts.height(w) : opts.height || Math.round(w / (opts.aspect || 16 / 9));
      h = Math.round(h);
      if (w === s.w && h === s.h) return;
      const r = Math.min(window.devicePixelRatio || 1, 2.5);
      s.w = w;
      s.h = h;
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
      canvas.style.height = h + 'px';
      s.ctx.setTransform(r, 0, 0, r, 0, 0);
      if (first !== true && opts.resize) opts.resize(s);
      if (first !== true) render();
    }
    resize(true);
    if (global.ResizeObserver) new ResizeObserver(() => resize()).observe(stage);
    else global.addEventListener('resize', resize);

    if (global.IntersectionObserver) {
      new IntersectionObserver((entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (visible) kick();
      }, { rootMargin: '120px' }).observe(root);
    }

    if (opts.init) opts.init(s);
    if (opts.resize) opts.resize(s);
    if (opts.animate && opts.autoplay !== false) s.play();
    else { syncPlay(); render(); }
    return s;
  }

  global.Sim = {
    create, graph, arrow, line, polyline, circle, rect, text, measure, spring, arc,
    fmt, sup, clamp, lerp, spectrum, colors: C, C, font: FONT
  };
})(window);
