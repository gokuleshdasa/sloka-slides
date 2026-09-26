/* Śloka Slides — content script: extraction + interactive site mapper. Injected on demand. */
(function () {
  if (window.__vsContent) return;
  window.__vsContent = true;
  const VS = self.VS;
  const FIELD_KEYS = VS.FIELDS.map((f) => f.key);

  /* ================================================================== */
  /* Extraction                                                         */
  /* ================================================================== */
  const qAll = (root, sel) => {
    if (!sel || !root) return [];
    try {
      const arr = [...root.querySelectorAll(sel)];
      if (root.nodeType === 1 && root.matches(sel)) arr.unshift(root);
      return arr;
    } catch { return []; }
  };
  const docOrder = (a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
  const dropLabel = (lines) => (lines.length && VS.labelOf(lines[0].text) ? lines.slice(1) : lines);

  /** Collect {f, el} for every mapped field below root, outermost-only per field, in document order. */
  function collect(root, fields) {
    const items = [];
    for (const f of FIELD_KEYS) {
      const els = qAll(root, fields[f]);
      const set = new Set(els);
      for (const el of els) {
        let p = el.parentElement, nested = false;
        while (p) { if (set.has(p)) { nested = true; break; } p = p.parentElement; }
        if (!nested) items.push({ f, el });
      }
    }
    items.sort((a, b) => docOrder(a.el, b.el));
    return items;
  }

  function toVerse(items) {
    const v = { ref: '', script: [], translit: [], synonyms: [], translation: [], purport: [], els: [] };
    for (const { f, el } of items) {
      v.els.push(el);
      const lines = dropLabel(VS.blocks(el));
      if (f === 'ref') { if (!v.ref) v.ref = (lines[0] && lines[0].text) || ''; }
      else v[f].push(...lines);
    }
    const out = VS.finishVerse(v);
    out.els = v.els;
    return out;
  }

  /** Map a document with a profile → { verses, title } */
  function extractWithProfile(doc, profile) {
    const fields = profile.fields || {};
    const groups = [];
    if (profile.container) {
      for (const c of qAll(doc, profile.container)) groups.push(collect(c, fields));
    } else {
      // Sequential grouping: a new verse starts at a verse number, or whenever the canonical
      // order steps backwards (e.g. a Devanāgarī block after a purport).
      let cur = null, last = -1;
      for (const it of collect(doc.body || doc, fields)) {
        const o = VS.ORDER[it.f];
        const hasBody = cur && cur.some((x) => x.f !== 'ref');
        if (!cur || (it.f === 'ref' && cur.length) || (o < last && it.f !== 'ref' && hasBody)) {
          cur = [];
          groups.push(cur);
        }
        cur.push(it);
        last = o;
      }
    }
    let title = '';
    const verses = [];
    for (const g of groups) {
      const v = toVerse(g);
      if (!VS.hasContent(v)) {
        if (v.ref && !title) title = v.ref;
        continue;
      }
      // A long "ref" is really a chapter heading.
      if (v.ref && (v.ref.length > 44 || /^chapter\b/i.test(v.ref))) { if (!title) title = v.ref; v.ref = ''; }
      verses.push(v);
    }
    // Number verses that have no reference.
    let n = 0;
    for (const v of verses) { n++; if (!v.ref && verses.length > 1) v.ref = `Text ${n}`; }
    return { verses, title };
  }

  function mainRoot(doc) {
    return doc.querySelector('main article, article, main, [role=main], #content, .content, #main') || doc.body;
  }
  const JUNK = 'nav, header, footer, aside, script, style, noscript, form, button, svg, iframe, [aria-hidden="true"], [role="navigation"], .sidebar, .menu, .breadcrumb, .breadcrumbs, .share, .social, .comments';

  function extractHeuristic(doc, live) {
    const root = mainRoot(doc);
    const clone = root.cloneNode(true);
    clone.querySelectorAll(JUNK).forEach((e) => e.remove());
    let lines = VS.blocks(clone);
    if (live && lines.length < 3) lines = VS.blocks(root, { skipHidden: true });
    return { verses: VS.parseLines(lines, { keepPreamble: false }), title: '' };
  }

  function extractDoc(doc, url, profiles, live) {
    const profile = VS.matchProfile(url, profiles);
    if (profile) {
      const r = extractWithProfile(doc, profile);
      if (r.verses.length) return { ...r, method: profile.name || profile.host, profile };
    }
    const h = extractHeuristic(doc, live);
    return { ...h, method: 'Smart text detection' };
  }

  function selectionRange() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed || !sel.toString().trim()) return null;
    return sel.getRangeAt(0);
  }

  function extractSelection(range, profiles) {
    const profile = VS.matchProfile(location.href, profiles);
    if (profile) {
      const r = extractWithProfile(document, profile);
      const picked = r.verses.filter((v) => v.els.some((el) => range.intersectsNode(el)));
      if (picked.length) return { verses: picked, title: r.title, method: `${profile.name || profile.host} · selection` };
    }
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return { verses: VS.parseLines(VS.blocks(div), { keepPreamble: true }), title: '', method: 'Selection · smart text detection' };
  }

  function linksInSelection(range) {
    const here = location.href.split('#')[0];
    const seen = new Set();
    const out = [];
    const anchors = range
      ? [...document.querySelectorAll('a[href]')].filter((a) => range.intersectsNode(a))
      : [];
    for (const a of anchors) {
      let u;
      try { u = new URL(a.getAttribute('href'), location.href); } catch { continue; }
      if (u.origin !== location.origin) continue;
      u.hash = '';
      const k = u.href;
      if (k === here || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
    }
    return out;
  }

  async function extractLinks(urls, profiles) {
    const results = new Array(urls.length);
    let done = 0;
    const t = toast(`Fetching 0 / ${urls.length} pages…`);
    let i = 0;
    const worker = async () => {
      while (i < urls.length) {
        const k = i++;
        try {
          const res = await fetch(urls[k], { credentials: 'include' });
          const html = await res.text();
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const r = extractDoc(doc, urls[k], profiles, false);
          results[k] = r.verses.map((v) => ({ ...clean(v), src: urls[k] }));
        } catch { results[k] = []; }
        done++;
        t.update(`Fetching ${done} / ${urls.length} pages…`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, urls.length) }, worker));
    t.close();
    return results.flat();
  }

  const clean = (v) => { const { els, ...rest } = v; return rest; };

  async function extract(scope) {
    const profiles = await VS.activeProfiles();
    const range = selectionRange();
    let r;
    if (scope === 'links') {
      const urls = linksInSelection(range);
      if (!urls.length) return { error: 'Select some links on the page first (e.g. part of a chapter’s table of contents).' };
      const verses = await extractLinks(urls, profiles);
      r = { verses, title: document.title, method: `${urls.length} linked pages` };
    } else if (range && scope !== 'page') {
      r = extractSelection(range, profiles);
    } else {
      r = extractDoc(document, location.href, profiles, true);
    }
    return {
      title: r.title || document.title,
      url: location.href,
      method: r.method,
      verses: r.verses.map((v) => ({ ...clean(v), src: v.src || location.href })),
    };
  }

  async function probe() {
    const profiles = await VS.activeProfiles();
    const range = selectionRange();
    const profile = VS.matchProfile(location.href, profiles);
    let count = 0;
    try {
      const r = range ? extractSelection(range, profiles) : extractDoc(document, location.href, profiles, true);
      count = r.verses.length;
    } catch { /* ignore */ }
    return {
      hasSelection: !!range,
      links: range ? linksInSelection(range).length : 0,
      profile: profile ? { name: profile.name, builtin: !!profile.builtin } : null,
      count,
      title: document.title,
      host: location.hostname,
    };
  }

  /* ================================================================== */
  /* Toast                                                              */
  /* ================================================================== */
  function toast(msg, ms) {
    const host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647;left:50%;bottom:28px;transform:translateX(-50%)';
    const sh = host.attachShadow({ mode: 'open' });
    sh.innerHTML = `<style>.t{font:500 14px/1.4 system-ui,sans-serif;background:#16181d;color:#f4efe6;padding:10px 16px;border-radius:999px;box-shadow:0 8px 30px rgba(0,0,0,.35);display:flex;gap:10px;align-items:center}
      .d{width:8px;height:8px;border-radius:50%;background:#f2a93b;animation:p 1s infinite alternate}@keyframes p{to{opacity:.3}}</style><div class="t"><span class="d"></span><span class="m"></span></div>`;
    sh.querySelector('.m').textContent = msg;
    document.documentElement.appendChild(host);
    const api = { update: (m) => { sh.querySelector('.m').textContent = m; }, close: () => host.remove() };
    if (ms) setTimeout(api.close, ms);
    return api;
  }

  /* ================================================================== */
  /* Interactive site mapper                                            */
  /* ================================================================== */
  let picker = null;

  const BAD_CLASS = /(^|-)(active|hover|focus|selected|open|show|hidden|visible|current|expanded|collapsed|ng-|js-)|\d{3,}|^(is|has)-|[:[\]/@!%]/;
  function stableClasses(el) {
    return [...el.classList].filter((c) => c.length < 40 && !BAD_CLASS.test(c));
  }
  function seg(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id && !/\d/.test(el.id) && el.id.length < 40 && !/[:[\]/]/.test(el.id)) return '#' + CSS.escape(el.id);
    const cls = stableClasses(el).slice(0, 2);
    return tag + cls.map((c) => '.' + CSS.escape(c)).join('');
  }
  const count = (sel) => { try { return document.querySelectorAll(sel).length; } catch { return Infinity; } };
  function genSelector(el, max = 400) {
    const own = seg(el);
    const specific = (s) => /[.#]/.test(s);
    if (specific(own) && count(own) <= max && count(own) > 0) return own;
    const chain = [own];
    let p = el.parentElement;
    let best = null;
    for (let d = 0; p && p !== document.documentElement && d < 8; d++, p = p.parentElement) {
      const s = seg(p);
      if (!specific(s)) continue;
      chain.unshift(s);
      const sel = chain.join(' ');
      const n = count(sel);
      if (n > 0 && n <= max) { best = sel; break; }
      if (!best && n > 0) best = sel;
    }
    return best || own;
  }

  function autoDetect() {
    const out = {};
    const all = [...document.body.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b,p,div,span,dt,label')];
    const labelEls = all.filter((e) => e.children.length <= 2 && e.textContent.trim().length <= 40 && VS.labelOf(e.textContent));
    for (const e of labelEls) {
      const k = VS.labelOf(e.textContent);
      if (k === 'verse' || out[k]) continue;
      let target = e.parentElement;
      if (target && target.textContent.trim().length < e.textContent.trim().length + 20) target = target.parentElement;
      const nxt = e.nextElementSibling;
      if (nxt && nxt.textContent.trim().length > 20 && target && target.textContent.length > nxt.textContent.length * 3) target = nxt;
      if (target && target !== document.body) out[k] = genSelector(target);
    }
    const indic = all.filter((e) => e.children.length <= 6 && VS.hasIndic(e.textContent) && e.textContent.trim().length < 600);
    if (indic.length) {
      const e = indic.find((x) => !indic.some((y) => y !== x && x.contains(y))) || indic[0];
      out.script = genSelector(e);
      let nx = e.nextElementSibling;
      while (nx && !nx.textContent.trim()) nx = nx.nextElementSibling;
      if (nx && !VS.hasIndic(nx.textContent) && nx.textContent.trim().length < 400 && !VS.labelOf(nx.textContent)) out.translit = genSelector(nx);
    }
    const refEl = [...document.querySelectorAll('h1,h2,h3,h4,.verse-number,.verse-num,.text-number')].find((e) => VS.refLike(e.textContent));
    if (refEl) out.ref = genSelector(refEl);
    return out;
  }

  async function startPicker() {
    if (picker) return;
    const profiles = await VS.activeProfiles();
    const existing = VS.matchProfile(location.href, profiles);
    const state = {
      profile: existing && !existing.builtin
        ? JSON.parse(JSON.stringify(existing))
        : {
          id: VS.uid(),
          name: location.hostname.replace(/^www\./, ''),
          host: location.hostname.replace(/^www\./, ''),
          path: '*',
          container: existing ? existing.container || '' : '',
          fields: existing ? { ...existing.fields } : {},
        },
      active: null,
      hoverEl: null,
      stack: [],
    };

    const host = document.createElement('vs-picker');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none';
    const sh = host.attachShadow({ mode: 'open' });
    const colors = Object.fromEntries(VS.FIELDS.concat(VS.CONTAINER_FIELD).map((f) => [f.key, f.color]));
    sh.innerHTML = `
<style>
  :host{all:initial}
  *{box-sizing:border-box}
  .layer{position:fixed;inset:0;pointer-events:none}
  .box{position:fixed;border:2px solid var(--c);background:color-mix(in srgb,var(--c) 10%,transparent);border-radius:4px;pointer-events:none}
  .box i{position:absolute;left:-2px;top:-20px;font:600 11px/18px system-ui,sans-serif;font-style:normal;color:#fff;background:var(--c);padding:0 6px;border-radius:4px 4px 0 0;white-space:nowrap}
  .hover{border-style:dashed;border-width:2px;background:color-mix(in srgb,var(--c) 18%,transparent)}
  .panel{position:fixed;right:18px;bottom:18px;width:400px;max-height:calc(100vh - 36px);overflow:auto;pointer-events:auto;
    background:#15171c;color:#ece7de;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06);
    font:13px/1.45 system-ui,-apple-system,Segoe UI,sans-serif}
  .hd{display:flex;align-items:center;gap:10px;padding:14px 16px 10px;cursor:move;border-bottom:1px solid rgba(255,255,255,.07)}
  .hd b{font-size:14px;flex:1}
  .logo{width:26px;height:26px;border-radius:8px;background:linear-gradient(135deg,#f2a93b,#d94f1e);display:grid;place-items:center;color:#fff;font-weight:700}
  .sec{padding:10px 16px}
  .tip{color:#a39d92;font-size:12px}
  .tip kbd{font:600 11px system-ui;background:#2a2d35;border-radius:4px;padding:1px 5px;color:#fff}
  .row{display:grid;grid-template-columns:10px 1fr auto auto;gap:8px;align-items:center;padding:7px 8px;border-radius:10px;margin:2px 0}
  .row.on{background:#23262e;box-shadow:inset 0 0 0 1px var(--c)}
  .dot{width:10px;height:10px;border-radius:50%;background:var(--c)}
  .row .nm{font-weight:600}
  .row .nm small{font-weight:400;color:#8e887e;margin-left:4px}
  .row input{grid-column:2 / 5;width:100%;background:#0e1013;color:#d9d3c8;border:1px solid #2b2e36;border-radius:7px;padding:5px 8px;font:12px ui-monospace,Menlo,monospace}
  .cnt{font:600 11px system-ui;color:#8e887e;min-width:22px;text-align:right}
  button{font:600 12px system-ui;border:0;border-radius:8px;padding:6px 10px;cursor:pointer;background:#2a2d35;color:#ece7de}
  button:hover{background:#353945}
  button.pri{background:linear-gradient(135deg,#f2a93b,#e0702a);color:#1b1206}
  button.pick.on{background:var(--c);color:#fff}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  label.f{display:flex;flex-direction:column;gap:3px;font-size:11px;color:#a39d92}
  label.f input{background:#0e1013;color:#ece7de;border:1px solid #2b2e36;border-radius:7px;padding:6px 8px;font:12px system-ui}
  .foot{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px 16px;border-top:1px solid rgba(255,255,255,.07)}
  .stat{margin-left:auto;align-self:center;color:#f2a93b;font-weight:600}
  .x{background:transparent;color:#8e887e;padding:2px 6px}
</style>
<div class="layer" id="marks"></div>
<div class="layer" id="hov"></div>
<div class="panel" id="panel">
  <div class="hd" id="drag"><div class="logo">ś</div><b>Map this site</b><button class="x" id="close" title="Close">✕</button></div>
  <div class="sec tip">Click <b>Pick</b>, then click the matching part of the page. <kbd>↑</kbd> selects the parent box, <kbd>↓</kbd> goes back, <kbd>Enter</kbd> confirms, <kbd>Esc</kbd> cancels. You can also edit the CSS selectors directly.</div>
  <div class="sec" id="rows"></div>
  <div class="sec grid">
    <label class="f">Profile name<input id="pname"></label>
    <label class="f">Website (host)<input id="phost"></label>
    <label class="f" style="grid-column:1/3">Only on pages matching (path, * = any)<input id="ppath"></label>
  </div>
  <div class="foot">
    <button id="auto" title="Guess the mapping from headings like “Translation” and “Purport”">✨ Auto-detect</button>
    <button id="preview">▶ Preview</button>
    <button class="pri" id="save">Save</button>
    <span class="stat" id="stat"></span>
  </div>
</div>`;
    document.documentElement.appendChild(host);
    const $ = (s) => sh.querySelector(s);
    const rowsEl = $('#rows');
    const allFields = VS.FIELDS.concat(VS.CONTAINER_FIELD);

    const getSel = (k) => (k === 'container' ? state.profile.container : state.profile.fields[k]) || '';
    const setSel = (k, v) => { if (k === 'container') state.profile.container = v; else state.profile.fields[k] = v; };

    for (const f of allFields) {
      const r = document.createElement('div');
      r.className = 'row';
      r.dataset.k = f.key;
      r.style.setProperty('--c', f.color);
      r.innerHTML = `<span class="dot"></span><span class="nm"></span><span class="cnt"></span><button class="pick">Pick</button><input spellcheck="false" placeholder="CSS selector">`;
      r.querySelector('.nm').textContent = f.label;
      if (f.hint) { const sm = document.createElement('small'); sm.textContent = f.hint; r.querySelector('.nm').appendChild(sm); }
      const inp = r.querySelector('input');
      inp.value = getSel(f.key);
      inp.addEventListener('input', () => { setSel(f.key, inp.value.trim()); refresh(); });
      r.querySelector('.pick').addEventListener('click', () => setActive(state.active === f.key ? null : f.key));
      rowsEl.appendChild(r);
    }
    $('#pname').value = state.profile.name;
    $('#phost').value = state.profile.host;
    $('#ppath').value = state.profile.path || '*';
    $('#pname').oninput = (e) => { state.profile.name = e.target.value; };
    $('#phost').oninput = (e) => { state.profile.host = e.target.value.trim(); };
    $('#ppath').oninput = (e) => { state.profile.path = e.target.value.trim() || '*'; };

    function setActive(k) {
      state.active = k;
      state.stack = [];
      rowsEl.querySelectorAll('.row').forEach((r) => {
        r.classList.toggle('on', r.dataset.k === k);
        r.querySelector('.pick').classList.toggle('on', r.dataset.k === k);
        r.querySelector('.pick').textContent = r.dataset.k === k ? 'Picking…' : 'Pick';
      });
      host.style.cursor = k ? 'crosshair' : '';
      drawHover(null);
    }

    function boxFor(el, color, label, cls) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.width === 0) return null;
      const b = document.createElement('div');
      b.className = 'box ' + (cls || '');
      b.style.cssText = `--c:${color};left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px`;
      if (label) { const i = document.createElement('i'); i.textContent = label; b.appendChild(i); }
      return b;
    }

    let raf = 0;
    function refresh() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const marks = $('#marks');
        marks.textContent = '';
        for (const f of allFields) {
          const sel = getSel(f.key);
          const els = qAll(document, sel).filter((e) => !host.contains(e));
          const row = rowsEl.querySelector(`.row[data-k="${f.key}"]`);
          row.querySelector('.cnt').textContent = sel ? String(els.length) : '';
          els.slice(0, 250).forEach((el, i) => {
            const b = boxFor(el, f.color, `${f.label}${els.length > 1 ? ' ' + (i + 1) : ''}`);
            if (b) marks.appendChild(b);
          });
        }
        try {
          const r = extractWithProfile(document, state.profile);
          $('#stat').textContent = `${r.verses.length} verse${r.verses.length === 1 ? '' : 's'} found`;
        } catch { $('#stat').textContent = ''; }
      });
    }

    function drawHover(el) {
      const hv = $('#hov');
      hv.textContent = '';
      state.hoverEl = el;
      if (!el || !state.active) return;
      const b = boxFor(el, colors[state.active], `${el.tagName.toLowerCase()}  →  ${genSelector(el)}`, 'hover');
      if (b) hv.appendChild(b);
    }

    const inPanel = (e) => e.composedPath().includes(host);
    const onMove = (e) => {
      if (!state.active || inPanel(e)) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el !== state.hoverEl && !host.contains(el)) { state.stack = []; drawHover(el); }
    };
    const commit = () => {
      if (!state.hoverEl || !state.active) return;
      const k = state.active;
      const sel = genSelector(state.hoverEl, k === 'container' ? 2000 : 400);
      setSel(k, sel);
      rowsEl.querySelector(`.row[data-k="${k}"] input`).value = sel;
      setActive(null);
      refresh();
    };
    const onClick = (e) => {
      if (!state.active || inPanel(e)) return;
      e.preventDefault();
      e.stopPropagation();
      commit();
    };
    const swallow = (e) => { if (state.active && !inPanel(e)) { e.preventDefault(); e.stopPropagation(); } };
    const onKey = (e) => {
      if (!state.active) { if (e.key === 'Escape' && !inPanel(e)) close(); return; }
      if (e.key === 'Escape') { setActive(null); e.preventDefault(); }
      else if (e.key === 'ArrowUp' && state.hoverEl && state.hoverEl.parentElement && state.hoverEl.parentElement !== document.documentElement) {
        state.stack.push(state.hoverEl);
        drawHover(state.hoverEl.parentElement);
        e.preventDefault();
      } else if (e.key === 'ArrowDown' && state.stack.length) {
        drawHover(state.stack.pop());
        e.preventDefault();
      } else if (e.key === 'Enter') { commit(); e.preventDefault(); }
    };
    const onScroll = () => { refresh(); if (state.hoverEl) drawHover(state.hoverEl); };

    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', swallow, true);
    document.addEventListener('mouseup', swallow, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    // drag the panel
    (() => {
      const panel = $('#panel');
      let sx, sy, ox, oy;
      $('#drag').addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        const r = panel.getBoundingClientRect();
        sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
        const mv = (ev) => {
          panel.style.left = `${Math.max(0, ox + ev.clientX - sx)}px`;
          panel.style.top = `${Math.max(0, oy + ev.clientY - sy)}px`;
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
        };
        const up = () => { document.removeEventListener('mousemove', mv, true); document.removeEventListener('mouseup', up, true); };
        document.addEventListener('mousemove', mv, true);
        document.addEventListener('mouseup', up, true);
      });
    })();

    function close() {
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mousedown', swallow, true);
      document.removeEventListener('mouseup', swallow, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
      host.remove();
      picker = null;
    }

    $('#close').onclick = close;
    $('#auto').onclick = () => {
      const guess = autoDetect();
      if (!Object.keys(guess).length) { toast('Could not guess — please pick the parts manually.', 2600); return; }
      for (const [k, v] of Object.entries(guess)) {
        setSel(k, v);
        const inp = rowsEl.querySelector(`.row[data-k="${k}"] input`);
        if (inp) inp.value = v;
      }
      refresh();
    };
    $('#preview').onclick = () => {
      const r = extractWithProfile(document, state.profile);
      if (!r.verses.length) { toast('No verses found with this mapping yet.', 2400); return; }
      chrome.runtime.sendMessage({
        cmd: 'openDeck',
        deck: { title: r.title || document.title, source: location.href, verses: r.verses.map((v) => ({ ...clean(v), src: location.href })) },
      });
    };
    $('#save').onclick = async () => {
      const list = (await VS.loadProfiles()).filter((p) => p.id !== state.profile.id);
      state.profile.updated = Date.now();
      list.unshift(state.profile);
      await VS.saveProfiles(list);
      toast(`Saved mapping for ${state.profile.host}`, 2200);
      close();
    };

    picker = { close };
    refresh();
  }

  /* ================================================================== */
  /* Messaging                                                          */
  /* ================================================================== */
  chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
    if (!msg || !msg.type) return;
    if (msg.type === 'ping') { reply({ ok: true }); return; }
    if (msg.type === 'toast') { toast(msg.text, msg.ms || 2200); reply({ ok: true }); return; }
    if (msg.type === 'pick') { startPicker(); reply({ ok: true }); return; }
    if (msg.type === 'probe') { probe().then(reply, (e) => reply({ error: String(e) })); return true; }
    if (msg.type === 'extract') { extract(msg.scope).then(reply, (e) => reply({ error: String(e && e.message || e) })); return true; }
  });
})();
