/* IALqBank study report page (report.html?s=<subject>).
   Loads the subject's report from reports/<Subject> - Exam Study Report.md and shows it in the
   site's style: headings, paragraphs, lists and tables, with a contents list beside it (a
   drop-down under the navigation bar on a phone) that follows the section being read. Spec
   codes in the text (S25, C6.5, B2.15, P1.2.3, P3.results) link to their questions in the
   question bank. The reports only use headings, paragraphs, lists, tables, bold, italic and
   rules, so that is all this reads. Needs js/sitemap.js. */
(function () {
  'use strict';

  const SITE = window.IALQB_SITE || {};
  const params = new URLSearchParams(location.search);
  const subject = SITE[params.get('s')] ? params.get('s') : 'physics';
  const S = SITE[subject];
  document.body.dataset.subject = subject;

  const $ = (sel, root) => (root || document).querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const barHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--site-nav-h')) || 0;
  const narrow = window.matchMedia('(max-width: 980px)');

  // Spec codes as each subject writes them. Practical-skills codes (P3.results) are shared.
  const CODES = {
    physics: /\b(S\d{1,3}|P[36]\.[a-z]+)\b/g,
    chemistry: /\b(C\d{1,2}\.\d{1,2}|P[36]\.[a-z]+)\b/g,
    biology: /\b(B\d\.\d{1,2}|P[36]\.[a-z]+)\b/g,
    maths: /\b((?:FP[1-3]|P[1-4]|M[1-3]|S[1-3]|D1)\.\d+\.\d+)\b/g
  };
  const EXAMPLE = { physics: 'S25', chemistry: 'C6.5', biology: 'B2.15', maths: 'P1.2.3' };

  /* ---------- Markdown to page ---------- */
  const BLOCK = /^(#{1,6}\s|\s*\||\s*([-*+]|\d+[.)])\s+|\s*(---|\*\*\*|___)\s*$)/;

  function blocks(md) {
    const lines = md.replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (!line.trim()) { i++; continue; }
      if ((m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line))) { out.push({ type: 'h', level: m[1].length, text: m[2] }); i++; continue; }
      if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { i++; continue; }   // section rules: the headings already separate sections
      if (/^\s*\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        out.push({ type: 'table', rows: rows });
        continue;
      }
      if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
        const items = [];
        while (i < lines.length) {
          const l = lines[i];
          if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) items.push(l);
          else if (l.trim() && /^\s{2,}\S/.test(l) && items.length) items[items.length - 1] += ' ' + l.trim();
          else break;
          i++;
        }
        out.push({ type: 'list', lines: items });
        continue;
      }
      const para = [line.trim()];
      i++;
      while (i < lines.length && lines[i].trim() && !BLOCK.test(lines[i])) para.push(lines[i++].trim());
      out.push({ type: 'p', text: para.join(' ') });
    }
    return out;
  }

  // **bold** and *italic*, with spec codes turned into links to the question bank.
  function inline(host, text, linkCodes) {
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/);
    parts.forEach((part) => {
      if (!part) return;
      let target = host;
      let body = part;
      if (/^\*\*[^*]+\*\*$/.test(part)) { target = host.appendChild(el('strong')); body = part.slice(2, -2); }
      else if (/^\*[^*\s][^*]*\*$/.test(part)) { target = host.appendChild(el('em')); body = part.slice(1, -1); }
      if (!linkCodes) { target.appendChild(document.createTextNode(body)); return; }
      const re = new RegExp(CODES[subject].source, 'g');
      let last = 0;
      let m;
      while ((m = re.exec(body))) {
        if (m.index > last) target.appendChild(document.createTextNode(body.slice(last, m.index)));
        const a = el('a', 'rp-code', m[1]);
        a.href = 'questions.html?s=' + subject + '&code=' + encodeURIComponent(m[1]);
        a.title = 'Practise ' + m[1] + ' questions';
        target.appendChild(a);
        last = m.index + m[0].length;
      }
      if (last < body.length) target.appendChild(document.createTextNode(body.slice(last)));
    });
    return host;
  }

  function list(lines) {
    // Nesting comes from the indentation of each item's marker.
    const root = { indent: -1, kids: [] };
    const stack = [root];
    lines.forEach((line) => {
      const m = /^(\s*)([-*+]|\d+)[.)]?\s+(.*)$/.exec(line);
      const item = { indent: m[1].replace(/\t/g, '    ').length, ordered: /\d/.test(m[2]), num: parseInt(m[2], 10), text: m[3], kids: [] };
      while (stack.length > 1 && stack[stack.length - 1].indent >= item.indent) stack.pop();
      stack[stack.length - 1].kids.push(item);
      stack.push(item);
    });
    const frag = document.createDocumentFragment();
    const draw = (items, host) => {
      let box = null;
      items.forEach((it) => {
        if (!box || (box.tagName === 'OL') !== it.ordered) {
          box = host.appendChild(el(it.ordered ? 'ol' : 'ul'));
          if (it.ordered && it.num > 1) box.start = it.num;
        }
        const li = box.appendChild(inline(el('li'), it.text, true));
        if (it.kids.length) draw(it.kids, li);
      });
    };
    draw(root.kids, frag);
    return frag;
  }

  const NUMERIC = /^(\*\*)?[<>~≈]?\s?[-+−]?[\d,]*\.?\d+\s?%?(\*\*)?$|^[-–—]$/;

  function table(rows) {
    const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
    const head = cells(rows[0]);
    let body = rows.slice(1);
    let align = [];
    if (body.length && /^[\s|:-]+$/.test(body[0])) {
      align = cells(body[0]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : ''));
      body = body.slice(1);
    }
    body = body.map(cells);
    // A column of numbers is right-aligned so the digits line up.
    const numeric = head.map((h, c) => {
      const vals = body.map((r) => r[c] || '').filter(Boolean);
      return vals.length > 0 && vals.filter((v) => NUMERIC.test(v)).length / vals.length >= 0.7;
    });
    const wrap = el('div', 'rp-table');
    wrap.tabIndex = 0;   // a wide table scrolls sideways; this lets the keyboard scroll it too
    const t = wrap.appendChild(el('table'));
    const thead = t.appendChild(el('thead')).appendChild(el('tr'));
    head.forEach((h, c) => {
      const th = inline(el('th'), h, false);
      th.scope = 'col';
      if (numeric[c]) th.className = 'num';
      thead.appendChild(th);
    });
    const tbody = t.appendChild(el('tbody'));
    body.forEach((r) => {
      const tr = tbody.appendChild(el('tr'));
      if (/^\*\*/.test(r[0] || '')) tr.className = 'rp-total';
      head.forEach((h, c) => {
        const td = inline(el('td'), r[c] || '', true);
        if (numeric[c] || align[c] === 'right') td.className = 'num';
        tr.appendChild(td);
      });
    });
    return wrap;
  }

  const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';

  function build(md) {
    const body = $('#rp-body');
    const toc = $('#rp-toc-list');
    const used = new Set();
    let tocH2 = null;
    let sawTitle = false;
    let lede = false;
    blocks(md).forEach((b) => {
      if (b.type === 'h' && b.level === 1 && !sawTitle) { sawTitle = true; return; }
      if (b.type === 'p' && sawTitle && !lede && !body.firstChild) {
        // The paragraph under the report's own title becomes the page's introduction.
        inline($('#rp-lede'), b.text, false);
        lede = true;
        return;
      }
      if (b.type === 'h') {
        const level = Math.min(Math.max(b.level, 2), 4);
        let id = slug(b.text);
        while (used.has(id)) id += '-x';
        used.add(id);
        const h = inline(el('h' + level, 'rp-h' + level), b.text, false);
        h.id = id;
        body.appendChild(h);
        if (level === 2 || level === 3) {
          const li = el('li');
          const a = el('a', null, b.text);
          a.href = '#' + id;
          a.dataset.target = id;
          li.appendChild(a);
          if (level === 2 || !tocH2) {
            toc.appendChild(li);
            tocH2 = li;
          } else {
            let sub = tocH2.querySelector('ol');
            if (!sub) sub = tocH2.appendChild(el('ol'));
            sub.appendChild(li);
          }
        }
        return;
      }
      if (b.type === 'p') body.appendChild(inline(el('p'), b.text, true));
      else if (b.type === 'list') body.appendChild(list(b.lines));
      else if (b.type === 'table') body.appendChild(table(b.rows));
    });
  }

  /* ---------- Contents: follows the section being read ---------- */
  function wireContents() {
    const heads = Array.from(document.querySelectorAll('#rp-body h2, #rp-body h3'));
    const links = new Map(Array.from(document.querySelectorAll('#rp-toc-list a')).map((a) => [a.dataset.target, a]));
    const bar = $('#rp-tocbar');
    const now = $('#rp-tocbar-now');
    const toc = $('#rp-toc');

    const setOpen = (open) => {
      toc.classList.toggle('is-open', open);
      bar.setAttribute('aria-expanded', String(open));
    };
    bar.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
    document.addEventListener('click', (e) => { if (!toc.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toc.classList.contains('is-open')) { setOpen(false); bar.focus(); } });

    $('#rp-toc-list').addEventListener('click', (e) => {
      const a = e.target.closest('a[data-target]');
      if (!a) return;
      e.preventDefault();
      const h = document.getElementById(a.dataset.target);
      if (!h) return;
      setOpen(false);
      h.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' });
      try { history.replaceState(null, '', '#' + h.id); } catch (err) { /* address cannot change here */ }
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
    });

    let ticking = false;
    let shown = null;
    const mark = () => {
      ticking = false;
      const line = barHeight() + (narrow.matches ? 70 : 24);
      let at = heads[0];
      heads.forEach((h) => { if (h.getBoundingClientRect().top <= line) at = h; });
      if (!at || at === shown) return;
      shown = at;
      links.forEach((a) => { a.classList.remove('is-current'); a.removeAttribute('aria-current'); });
      document.querySelectorAll('#rp-toc-list li.is-open').forEach((li) => li.classList.remove('is-open'));
      const a = links.get(at.id);
      if (!a) return;
      a.classList.add('is-current');
      a.setAttribute('aria-current', 'location');
      const top = a.closest('#rp-toc-list > li');
      if (top) top.classList.add('is-open');
      now.textContent = top ? top.querySelector('a').textContent : '';
      // Keep the current entry in view in a long sidebar.
      if (!narrow.matches) {
        const list = $('#rp-toc-list');
        const r = a.getBoundingClientRect();
        const lr = list.getBoundingClientRect();
        if (r.top < lr.top || r.bottom > lr.bottom) a.scrollIntoView({ block: 'nearest' });
      }
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
    window.addEventListener('resize', mark);
    mark();
  }

  function init() {
    const label = S.label;
    document.title = label + ' study report · IALqBank';
    $('#rp-title').textContent = label + ' study report';
    $('#rp-example').textContent = EXAMPLE[subject];
    $('#rp-bank').href = 'questions.html?s=' + subject;
    $('#rp-bank').textContent = 'Practise ' + label + ' questions';
    $('#rp-papers').href = 'papers.html?s=' + subject;
    $('#rp-print').addEventListener('click', () => window.print());
    // Print (and "Save as PDF", on iPhone too) in light mode, as the notes pages do.
    const root = document.documentElement;
    let theme = null;
    window.addEventListener('beforeprint', () => { theme = root.dataset.theme; root.dataset.theme = 'light'; });
    window.addEventListener('afterprint', () => { if (theme) root.dataset.theme = theme; });

    fetch(S.report, { cache: 'no-cache' })   // the report is rebuilt now and then: always check for a newer copy
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then((md) => {
        build(md);
        $('#rp-status').hidden = true;
        $('#rp').hidden = false;
        wireContents();
        if (location.hash) {
          const h = document.getElementById(decodeURIComponent(location.hash.slice(1)));
          if (h) setTimeout(() => h.scrollIntoView({ block: 'start' }), 0);
        }
      })
      .catch((err) => {
        $('#rp-status').textContent = 'The report could not be loaded (' + err.message + '). Try reloading the page.';
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
