/* Śloka Slides — slideshow engine */
(async function () {
  const VS = self.VS;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const root = document.documentElement;

  const st = {
    s: null,           // settings
    deck: null,
    id: null,
    slides: [],
    idx: 0,
    verseSlide: [],    // verse index → first slide index
    marks: new Map(),  // verse index → Set of highlighted words
    searchTerm: '',
    autoOn: false,
    autoTimer: 0,
    lastSaved: '',
  };

  const LAYOUT_NEUTRAL = new Set(['mode', 'lightTheme', 'darkTheme', 'customTheme', 'bgStyle', 'transition', 'showArrows', 'showProgress',
    'progressHeight', 'showTicks', 'showCorner', 'showCounter', 'showClock', 'autoMode', 'autoSeconds', 'wpm', 'wheelNav', 'clickNav',
    'openIn', 'rememberPosition']);

  /* ================================================================ */
  /* Boot                                                             */
  /* ================================================================ */
  /* ================================================================ */
  /* Deck                                                             */
  /* ================================================================ */
  async function loadDeck() {
    const h = new URLSearchParams(location.hash.slice(1));
    st.id = h.get('deck');
    st.deck = st.id ? await VS.store.get('local', `deck:${st.id}`) : null;
    if (!st.deck || !Array.isArray(st.deck.verses) || !st.deck.verses.length) {
      st.deck = JSON.parse(JSON.stringify(VS.SAMPLE));
      st.demo = true;
      st.id = null;
    } else st.demo = false;
    st.deck.verses = st.deck.verses.map((v) => ({
      ref: String(v.ref || ''),
      script: String(v.script || ''),
      translit: String(v.translit || ''),
      synonyms: String(v.synonyms || ''),
      translation: (v.translation || []).map(VS.sanitize).filter(Boolean),
      purport: (v.purport || []).map(VS.sanitize).filter(Boolean),
      src: v.src || '',
    }));
    st.marks.clear();
    document.title = `${st.deck.title || 'Slides'} · Śloka Slides`;
  }
  const saveDeck = () => { if (st.id) VS.store.set('local', `deck:${st.id}`, st.deck); };

  async function saveNewDeck(deck) {
    const id = VS.uid();
    const created = Date.now();
    if (VS.hasChrome) {
      const index = (await VS.store.get('local', 'deckIndex')) || [];
      index.unshift({ id, title: deck.title, count: deck.verses.length, created, source: deck.source || '' });
      const drop = index.splice(15);
      await chrome.storage.local.set({ [`deck:${id}`]: { ...deck, id, created }, deckIndex: index });
      if (drop.length) await chrome.storage.local.remove(drop.map((d) => `deck:${d.id}`));
    } else {
      await VS.store.set('local', `deck:${id}`, { ...deck, id, created });
    }
    history.replaceState(null, '', `#deck=${id}`);
    await loadDeck();
    repaginate(true);
    buildVerseList();
  }

  /* ================================================================ */
  /* Look & typography                                                */
  /* ================================================================ */
  const mqDark = matchMedia('(prefers-color-scheme: dark)');
  function applyLook() {
    const s = st.s;
    const t = VS.resolveTheme(s, mqDark.matches);
    for (const k of ['bg', 'surface', 'fg', 'muted', 'accent', 'accent2']) root.style.setProperty(`--${k}`, t[k] || t.accent);
    root.dataset.dark = String(!!t.dark);
    root.dataset.bgstyle = s.bgStyle;
    root.dataset.tr = s.transition;
    root.style.setProperty('--ph', `${s.progressHeight}px`);
    document.body.classList.toggle('no-arrows', !s.showArrows);
    document.body.classList.toggle('no-progress', !s.showProgress);
    document.body.classList.toggle('no-ticks', !s.showTicks);
    document.body.classList.toggle('no-corner', !s.showCorner);
    document.body.classList.toggle('no-counter', !s.showCounter);
    document.body.classList.toggle('show-clock', !!s.showClock);
    $$('.sw-t').forEach((b) => b.classList.toggle('on', b.dataset.key === t.key));
  }

  function applyTypography() {
    const s = st.s;
    const fs = Math.max(10, s.fontSize * (s.scaleWithWindow ? innerHeight / 1080 : 1));
    root.style.setProperty('--fs', `${fs.toFixed(2)}px`);
    root.style.setProperty('--lh', s.lineHeight);
    root.style.setProperty('--ls', `${s.letterSpacing}em`);
    root.style.setProperty('--ws', `${s.wordSpacing}em`);
    root.style.setProperty('--maxw', `${s.contentWidth}vw`);
    root.style.setProperty('--align', s.textAlign);
    root.style.setProperty('--valign', s.vcenter ? 'center' : 'flex-start');
    root.style.setProperty('--f-body', VS.fontStack('body', s.fontBody));
    root.style.setProperty('--f-script', `${VS.fontStack('script', s.fontScript)}, ${VS.fontStack('body', s.fontBody)}`);
    root.style.setProperty('--f-head', VS.fontStack('head', s.fontHead));
    for (const k of Object.keys(s.scale)) root.style.setProperty(`--sc-${k}`, s.scale[k]);
    root.dataset.translitItalic = String(!!s.translitItalic);
    root.dataset.translationBold = String(!!s.translationBold);
    root.dataset.syn = s.synonymsStyle;
    root.dataset.verseAlign = s.verseAlign;
  }

  let fontLink = null;
  function loadFonts() {
    const s = st.s;
    const fams = [
      VS.FONTS.body.find((f) => f.id === s.fontBody),
      VS.FONTS.script.find((f) => f.id === s.fontScript),
      VS.FONTS.head.find((f) => f.id === s.fontHead),
    ].filter((f) => f && f.gf);
    const href = fams.length ? `https://fonts.googleapis.com/css2?${[...new Set(fams.map((f) => f.gf))].map((g) => `family=${g}`).join('&')}&display=swap` : '';
    if (!href) { if (fontLink) fontLink.remove(); fontLink = null; return; }
    if (fontLink && fontLink.getAttribute('href') === href) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.onload = () => { document.fonts.ready.then(() => repaginate()); if (fontLink && fontLink !== l) fontLink.remove(); fontLink = l; };
    document.head.appendChild(l);
    if (!fontLink) fontLink = l;
  }

  /* ================================================================ */
  /* Blocks                                                           */
  /* ================================================================ */
  const group = (k) => (k === 'script' || k === 'translit' ? 'verse' : k);
  function verseBlocks(v, vi) {
    const s = st.s;
    const out = [];
    for (const k of s.order) {
      if (!s.show[k]) continue;
      if ((k === 'script' || k === 'translit') && v[k]) out.push({ k, lines: v[k].split('\n') });
      else if (k === 'synonyms' && v.synonyms) out.push({ k, items: VS.parseSynonyms(v.synonyms) });
      else if (k === 'translation' || k === 'purport') v[k].forEach((html, pi) => out.push({ k, html, pi }));
    }
    // Glue the recited closing line onto the very last purport paragraph of the
    // whole deck, so it can never land alone on a slide of its own.
    if (s.endNote && vi === st.deck.verses.length - 1 && s.show.purport && v.purport.length) {
      const note = (s.endNoteText || VS.DEFAULTS.endNoteText || '').trim();
      if (note) for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].k === 'purport') { out[i] = { ...out[i], endNote: note }; break; }
      }
    }
    let prev = null;
    out.forEach((b, o) => {
      b.v = vi; b.o = o; b.off = 0;
      b.first = group(b.k) !== prev;
      prev = group(b.k);
    });
    return out;
  }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function labelEl(k, pk) {
    const l = el('div', 'lbl');
    if (pk) l.dataset.pk = pk;
    l.append(VS.SECTION_LABELS[k] || k);
    return l;
  }

  function renderBlock(b) {
    if (b.k === 'vhead') {
      const vh = el('div', 'blk b-vhead', b.text);
      vh.dataset.v = b.v;
      return vh;
    }
    const e = el('div', `blk b-${b.k}`);
    e.dataset.v = b.v;
    if (b.first && st.s.labels && group(b.k) !== 'verse') e.appendChild(labelEl(b.k, `${b.v}:${b.k}`));
    if (b.lines) e.appendChild(el('div', 'tx', b.lines.join('\n')));
    else if (b.items) {
      const list = el('div', 'tx list');
      b.items.forEach((it, i) => {
        const sp = el('span', 'syn');
        if (it.w) sp.append(el('span', 'w', it.w), el('span', 'd', '—'));
        sp.append(el('span', 'm', it.m));
        list.appendChild(sp);
        if (i < b.items.length - 1) list.appendChild(el('span', 'sep', '•'));
      });
      e.appendChild(list);
    } else {
      const tx = el('div', 'tx');
      tx.innerHTML = b.html; // sanitized on load
      e.appendChild(tx);
    }
    if (b.endNote) e.appendChild(el('div', 'end-note', b.endNote));
    return e;
  }

  function refRange(slide) {
    const refs = slide.verses.map((vi) => st.deck.verses[vi].ref).filter(Boolean);
    if (refs.length <= 1) return refs[0] || '';
    const a = refs[0], b = refs[refs.length - 1];
    const pa = a.match(/^(.*?)(\d+)$/), pb = b.match(/^(.*?)(\d+)$/);
    return pa && pb && pa[1] === pb[1] ? `${a}–${pb[2]}` : `${a} – ${b}`;
  }

  function renderSlide(slide) {
    const sec = el('section', 'slide');
    if (slide.title) {
      sec.classList.add('title-slide');
      const body = el('div', 'slide-body');
      const inner = el('div', 'inner');
      inner.append(el('div', 't-title', st.deck.title || 'Untitled'), el('div', 't-orn'), el('div', 't-sub', slide.sub || ''));
      body.appendChild(inner);
      sec.appendChild(body);
      return sec;
    }
    if (slide.verses.length > 1) sec.classList.add('multi');
    const head = el('header', 'slide-head');
    const ref = refRange(slide);
    head.appendChild(el('span', 'ref', ref));
    if (slide.firstOfVerse) head.classList.add('first');
    if (!ref) head.classList.add('hidden');
    const hm = st.s.headerMode || 'verse';
    const showHead = hm === 'all' || (hm === 'verse' && slide.primaryGroup === 'verse');
    if (!showHead) head.classList.add('off');
    const body = el('div', 'slide-body');
    const inner = el('div', 'inner');
    if (slide.cont) inner.appendChild(labelEl(slide.cont, `${slide.verses[0]}:${slide.cont}`));
    for (const b of slide.blocks) inner.appendChild(renderBlock(b));
    body.appendChild(inner);
    sec.append(head, body);
    if (slide.hintPurport) {
      const cue = el('div', 'purport-cue');
      cue.append(el('span', 'cw', VS.SECTION_LABELS.purport || 'Purport'), ' follows', el('span', 'chev', '⌄'));
      body.appendChild(cue);
    }
    return sec;
  }

  /* ---------- splitting long blocks ---------- */
  function splitHtml(html, mode) {
    const bre = mode === 'word' ? /\s+/g : /([.!?।॥]+["'”’)\]]*)\s+(?=[^a-z])/g;
    const parts = [];
    const stack = [];
    let cur = '';
    const close = () => stack.slice().reverse().map((t) => `</${t}>`).join('');
    const reopen = () => stack.map((t) => `<${t}>`).join('');
    for (const tok of html.split(/(<[^>]+>)/)) {
      if (!tok) continue;
      if (tok[0] === '<') {
        cur += tok;
        const m = tok.match(/^<(\/?)(\w+)/);
        if (m && m[2].toLowerCase() !== 'br') { if (m[1]) stack.pop(); else stack.push(m[2].toLowerCase()); }
        continue;
      }
      let last = 0, mm;
      bre.lastIndex = 0;
      while ((mm = bre.exec(tok))) {
        const end = mm.index + (mode === 'word' ? 0 : mm[1].length);
        cur += tok.slice(last, end);
        if (cur.replace(/<[^>]+>/g, '').trim()) { parts.push(cur + close()); cur = reopen(); }
        last = mm.index + mm[0].length;
      }
      cur += tok.slice(last);
    }
    if (cur.replace(/<[^>]+>/g, '').trim()) parts.push(cur);
    else if (parts.length) parts[parts.length - 1] += cur;
    return parts.length ? parts : [html];
  }
  function unitsOf(b) {
    if (b.lines) return b.lines;
    if (b.items) return b.items;
    return b._units || (b._units = splitHtml(b.html, 'sentence'));
  }
  function piece(b, units, a, z) {
    const p = { ...b, off: b.off + a, first: b.first && a === 0 && b.off === 0, part: true };
    delete p._units;
    if (z < units.length) delete p.endNote; // closing note stays with the final chunk only
    if (b.lines) p.lines = units.slice(a, z);
    else if (b.items) p.items = units.slice(a, z);
    else p.html = units.slice(a, z).join(' ');
    return p;
  }

  /* ================================================================ */
  /* Pagination                                                       */
  /* ================================================================ */
  function paginate() {
    const s = st.s;
    const m = $('#measure');
    const slides = [];
    let cur = null, curEl = null, inner = null, body = null;

    const mount = () => {
      curEl = renderSlide(cur);
      m.replaceChildren(curEl);
      inner = curEl.querySelector('.inner');
      body = curEl.querySelector('.slide-body');
    };
    const open = (vi, firstBlock, firstOfVerse) => {
      cur = { verses: [vi], blocks: [], firstOfVerse: !!firstOfVerse, cont: null, primaryGroup: firstBlock ? group(firstBlock.k) : null };
      if (firstBlock && !firstBlock.first && s.labels && group(firstBlock.k) !== 'verse') cur.cont = firstBlock.k;
      slides.push(cur);
      mount();
    };
    const fits = () => body.scrollHeight <= body.clientHeight + 1 && inner.scrollWidth <= inner.clientWidth + 2;
    const tryAdd = (b) => {
      const e = renderBlock(b);
      inner.appendChild(e);
      if (fits()) { cur.blocks.push(b); return true; }
      e.remove();
      return false;
    };
    const hasBody = () => cur.blocks.some((b) => b.k !== 'vhead');

    const splitPlace = (b, intoCurrent) => {
      let units = unitsOf(b).slice();
      let mode = b.html != null ? 'sentence' : 'unit';
      let start = 0;
      while (start < units.length) {
        let lo = 1, hi = units.length - start, best = 0;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const e = renderBlock(piece(b, units, start, start + mid));
          inner.appendChild(e);
          const ok = fits();
          e.remove();
          if (ok) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        const minUnits = intoCurrent && start === 0 && hasBody() ? Math.min(2, units.length) : 1;
        if (best < minUnits) {
          if (hasBody()) { open(b.v, piece(b, units, start, start + 1)); continue; }
          if (mode === 'sentence') {
            // a single sentence taller than the screen → split it into words
            const words = splitHtml(units[start], 'word');
            if (words.length > 1) { units = units.slice(0, start).concat(words, units.slice(start + 1)); mode = 'word'; continue; }
          }
          best = 1; // cannot split further: show it anyway (the slide scrolls)
        }
        // Keep tidy breaks. A whole sentence may move to the next slide, but never
        // leave a lonely sliver behind: balance a forced word-split, and never orphan
        // a single sentence / word-meaning.
        const rem = units.length - (start + best);
        if (rem > 0) {
          if (mode === 'word') {
            if (rem < best) { const half = Math.ceil((best + rem) / 2); if (half < best) best = half; }
          } else if (best >= 3 && rem === 1) best -= 1;
        }
        const p = piece(b, units, start, start + best);
        inner.appendChild(renderBlock(p));
        cur.blocks.push(p);
        start += best;
        if (start < units.length) open(b.v, piece(b, units, start, start + 1));
      }
    };

    const place = (b, vi) => {
      if (s.layout === 'section' && b.first && hasBody()) open(vi, b);
      if (tryAdd(b)) return;
      const splittable = b.k === 'purport' || (b.k === 'translation' && !b.first);
      if (hasBody() && splittable) { splitPlace(b, true); return; }
      if (hasBody()) { open(vi, b); if (tryAdd(b)) return; }
      splitPlace(b, false);
    };

    if (s.titleSlide && st.deck.verses.length > 1) {
      const refs = st.deck.verses.map((v) => v.ref).filter(Boolean);
      slides.push({ title: true, verses: [0], blocks: [], sub: refs.length ? `${refs[0]} — ${refs[refs.length - 1]} · ${st.deck.verses.length} verses` : `${st.deck.verses.length} verses` });
    }

    st.deck.verses.forEach((v, vi) => {
      const blocks = verseBlocks(v, vi);
      if (!blocks.length) return;
      const short = s.combineShort && s.layout === 'flow' && !(s.show.purport && v.purport.length);
      const vh = { k: 'vhead', v: vi, o: -1, off: 0, text: v.ref };

      if (short && cur && cur.combo) {
        cur.verses.push(vi);
        mount(); // re-render: header now shows a range and .multi reveals the verse headings
        const added = [];
        let ok = tryAdd(vh);
        if (ok) added.push(vh);
        for (const b of blocks) { if (!ok) break; ok = tryAdd(b); if (ok) added.push(b); }
        if (ok) return;
        cur.blocks.splice(cur.blocks.length - added.length, added.length);
        cur.verses.pop();
        mount();
        cur.combo = false;
      }

      open(vi, blocks[0], true);
      const startCount = slides.length;
      if (short) tryAdd(vh);
      for (const b of blocks) place(b, vi);
      cur.combo = short && slides.length === startCount;
    });

    if (!slides.length) slides.push({ verses: [0], blocks: [{ k: 'purport', v: 0, o: 0, off: 0, html: 'Nothing to show — all sections are hidden.', first: false }] });

    m.replaceChildren();
    // anchors & verse → slide map
    st.verseSlide = [];
    slides.forEach((sl, i) => {
      const b = sl.blocks.find((x) => x.k !== 'vhead');
      sl.anchor = sl.title ? { v: -1, o: 0, off: 0 } : { v: sl.verses[0], o: b ? b.o : 0, off: b ? b.off : 0 };
      if (!sl.title) for (const vi of sl.verses) if (st.verseSlide[vi] == null) st.verseSlide[vi] = i;
    });
    // Faded "Purport follows" hint: a slide whose last content is a translation and
    // whose next slide opens that same verse's purport.
    if (s.purportCue) slides.forEach((sl, i) => {
      if (sl.title) return;
      const last = [...sl.blocks].reverse().find((x) => x.k !== 'vhead');
      if (!last || last.k !== 'translation') return;
      const nx = slides[i + 1];
      if (!nx || nx.title) return;
      const nb = nx.blocks.find((x) => x.k !== 'vhead');
      if (nb && nb.k === 'purport' && nb.v === last.v) sl.hintPurport = true;
    });
    // Multi-part section counts, e.g. "Purport 1 of 3" on every part including the first.
    const secSlides = {};
    slides.forEach((sl, i) => {
      if (sl.title) return;
      const seen = new Set();
      sl.blocks.forEach((b) => {
        if (b.k === 'vhead' || group(b.k) === 'verse') return;
        const key = `${b.v}:${b.k}`;
        if (seen.has(key)) return;
        seen.add(key);
        (secSlides[key] = secSlides[key] || []).push(i);
      });
    });
    slides.forEach((sl) => { if (!sl.title) sl.partInfo = {}; });
    for (const [key, arr] of Object.entries(secSlides)) {
      if (arr.length < 2) continue;
      arr.forEach((i, n) => { slides[i].partInfo[key] = { n: n + 1, total: arr.length }; });
    }
    st.slides = slides;
    buildTicks();
  }
  function enrichLabels(node, slide) {
    if (!slide || !slide.partInfo) return;
    node.querySelectorAll('.lbl[data-pk]').forEach((l) => {
      const info = slide.partInfo[l.dataset.pk];
      if (!info) return;
      const c = el('span', 'lbl-part', `${info.n} of ${info.total}`);
      l.appendChild(c);
    });
  }

  const cmpAnchor = (a, b) => a.v - b.v || a.o - b.o || a.off - b.off;
  function indexForAnchor(a) {
    if (!a) return 0;
    let best = 0;
    st.slides.forEach((sl, i) => { if (cmpAnchor(sl.anchor, a) <= 0) best = i; });
    return best;
  }

  let rpTimer = 0;
  function repaginate(now) {
    clearTimeout(rpTimer);
    const run = () => {
      const anchor = st.slides[st.idx] && st.slides[st.idx].anchor;
      applyTypography();
      paginate();
      show(indexForAnchor(anchor), 0);
    };
    if (now === true) run(); else rpTimer = setTimeout(run, 90);
  }

  /* ================================================================ */
  /* Showing slides                                                   */
  /* ================================================================ */
  function decorate(slideEl, slide) {
    const terms = [];
    for (const vi of slide.verses) {
      const set = st.marks.get(vi);
      if (set) terms.push(...set);
    }
    if (st.searchTerm) terms.push(st.searchTerm);
    if (terms.length) highlightTerms(slideEl.querySelector('.inner'), terms);
  }

  function show(i, dir) {
    i = Math.max(0, Math.min(st.slides.length - 1, i));
    const slide = st.slides[i];
    st.idx = i;
    const stage = $('#stage');
    const node = renderSlide(slide);
    decorate(node, slide);
    enrichLabels(node, slide);
    wireEditing(node, slide);
    const old = [...stage.children].filter((c) => !c.classList.contains('leaving'));
    if (dir && st.s.transition !== 'none' && old.length) {
      const d = dir > 0 ? 'fwd' : 'back';
      old.forEach((o) => { o.classList.add('leaving'); o.dataset.dir = d; setTimeout(() => o.remove(), 600); });
      node.classList.add('entering');
      node.dataset.dir = d;
      stage.appendChild(node);
      node.getBoundingClientRect();
      requestAnimationFrame(() => node.classList.remove('entering'));
    } else {
      stage.replaceChildren(node);
    }
    updateChrome();
    if (st.s.rememberPosition && st.id) VS.store.set('local', `pos:${st.id}`, slide.anchor);
    scheduleAuto();
  }
  const next = () => { if (st.idx < st.slides.length - 1) show(st.idx + 1, 1); else stopAutoAtEnd(); };
  const prev = () => { if (st.idx > 0) show(st.idx - 1, -1); };
  function nextVerse() {
    const cur = currentVerse();
    const t = st.verseSlide.findIndex((s, vi) => vi > cur && s != null && s > st.idx);
    if (t >= 0) show(st.verseSlide[t], 1);
  }
  function prevVerse() {
    const cur = currentVerse();
    const start = st.verseSlide[cur];
    if (start != null && start < st.idx) { show(start, -1); return; }
    for (let vi = cur - 1; vi >= 0; vi--) if (st.verseSlide[vi] != null && st.verseSlide[vi] < st.idx) { show(st.verseSlide[vi], -1); return; }
  }
  const currentVerse = () => { const sl = st.slides[st.idx]; return sl ? sl.verses[sl.verses.length - 1] : 0; };

  function updateChrome() {
    const n = st.slides.length;
    const slide = st.slides[st.idx];
    const pct = n ? ((st.idx + 1) / n) * 100 : 100;
    $('#progressFill').style.width = `${pct}%`;
    $('#progress').setAttribute('aria-valuenow', Math.round(pct));
    const ref = slide.title ? (st.deck.title || '') : refRange(slide) || st.deck.title || '';
    $('#cornerRef').textContent = ref;
    $('#cornerCount').textContent = `${st.idx + 1} / ${n}`;
    $('#prev').disabled = st.idx === 0;
    $('#next').disabled = st.idx === n - 1;
    document.title = `${ref ? ref + ' · ' : ''}${st.deck.title || 'Śloka Slides'}`;
    $$('.vitem').forEach((b) => b.classList.toggle('cur', slide.verses.includes(+b.dataset.v)));
    const curItem = $('.vitem.cur');
    if (curItem && $('#navigator').classList.contains('open')) curItem.scrollIntoView({ block: 'nearest' });
  }

  function buildTicks() {
    const t = $('#ticks');
    t.replaceChildren();
    const n = st.slides.length;
    if (n < 2) return;
    const seen = new Set();
    st.verseSlide.forEach((si) => {
      if (si == null || si === 0 || seen.has(si)) return;
      seen.add(si);
      const i = el('i');
      i.style.left = `${(si / n) * 100}%`;
      t.appendChild(i);
    });
  }

  /* ================================================================ */
  /* Highlighting                                                     */
  /* ================================================================ */
  const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  function foldMap(str) {
    let f = '';
    const idx = [];
    for (let i = 0; i < str.length; i++) {
      const c = fold(str[i]);
      for (let j = 0; j < c.length; j++) { f += c[j]; idx.push(i); }
    }
    idx.push(str.length);
    return { f, idx };
  }
  function highlightTerms(rootEl, terms) {
    const fterms = [...new Set(terms.map(fold).filter((t) => t.length > 0))];
    if (!rootEl || !fterms.length) return;
    const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const text = node.nodeValue;
      const { f, idx } = foldMap(text);
      const ranges = [];
      for (const t of fterms) {
        let p = 0;
        while ((p = f.indexOf(t, p)) >= 0) {
          const a = idx[p], z = idx[p + t.length];
          const wordish = /^[\p{L}\p{M}]+$/u.test(t);
          const before = text[a - 1], after = text[z];
          const isL = (ch) => ch && /[\p{L}\p{M}]/u.test(ch);
          if (!wordish || (!isL(before) && !isL(after))) ranges.push([a, z]);
          p += t.length;
        }
      }
      if (!ranges.length) continue;
      ranges.sort((x, y) => x[0] - y[0]);
      const frag = document.createDocumentFragment();
      let last = 0;
      for (const [a, z] of ranges) {
        if (a < last) continue;
        frag.append(text.slice(last, a), el('mark', '', text.slice(a, z)));
        last = z;
      }
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }

  function wordAt(x, y) {
    const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
    if (!r || r.startContainer.nodeType !== 3) return null;
    const t = r.startContainer.nodeValue;
    let a = r.startOffset, z = r.startOffset;
    const isL = (ch) => /[\p{L}\p{M}‌‍-]/u.test(ch);
    while (a > 0 && isL(t[a - 1])) a--;
    while (z < t.length && isL(t[z])) z++;
    const w = t.slice(a, z).replace(/^-+|-+$/g, '');
    return w.length ? { w, node: r.startContainer } : null;
  }

  /* ================================================================ */
  /* Auto-advance                                                     */
  /* ================================================================ */
  function slideWords(slide) {
    const text = slide.blocks.map((b) => (b.lines ? b.lines.join(' ') : b.items ? b.items.map((i) => `${i.w} ${i.m}`).join(' ') : (b.html || b.text || '').replace(/<[^>]+>/g, ''))).join(' ');
    return text.split(/\s+/).filter(Boolean).length;
  }
  function setAuto(on) {
    st.autoOn = on;
    $('#autoBtn').classList.toggle('on', on);
    scheduleAuto();
    if (on) toast(`Auto-advance on · ${effectiveAutoMode() === 'pace' ? `${st.s.wpm} words/min` : `${st.s.autoSeconds}s per slide`}`);
  }
  const effectiveAutoMode = () => (st.s.autoMode === 'off' ? 'pace' : st.s.autoMode);
  function scheduleAuto() {
    clearTimeout(st.autoTimer);
    const ring = $('#autoRing');
    ring.style.transition = 'none';
    ring.style.width = '0';
    if (!st.autoOn) return;
    const slide = st.slides[st.idx];
    const secs = effectiveAutoMode() === 'fixed' ? st.s.autoSeconds : Math.max(6, (slideWords(slide) / st.s.wpm) * 60 + 3);
    ring.getBoundingClientRect();
    ring.style.transition = `width ${secs}s linear`;
    ring.style.width = '100%';
    st.autoTimer = setTimeout(next, secs * 1000);
  }
  function stopAutoAtEnd() { if (st.autoOn) { setAuto(false); toast('End of slides'); } }

  /* ================================================================ */
  /* Settings changes                                                 */
  /* ================================================================ */
  let saveTimer = 0;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { st.lastSaved = JSON.stringify(st.s); VS.saveSettings(st.s); }, 250);
  }
  function setSetting(path, value) {
    VS.setPath(st.s, path, value);
    persist();
    afterSettingsChange([path.split('.')[0]]);
  }
  function afterSettingsChange(keys) {
    applyLook();
    applyTypography();
    if (keys.some((k) => k.startsWith('font'))) loadFonts();
    if (keys.some((k) => !LAYOUT_NEUTRAL.has(k))) repaginate();
    if (keys.includes('autoMode')) setAuto(st.s.autoMode !== 'off');
    else if (keys.includes('autoSeconds') || keys.includes('wpm')) scheduleAuto();
    syncTools();
  }

  /* ================================================================ */
  /* Quick tools                                                      */
  /* ================================================================ */
  function buildTools() {
    const fill = (sel, list) => {
      const s = $(sel);
      for (const f of list) { const o = el('option', '', f.label); o.value = f.id; s.appendChild(o); }
    };
    fill('#selBody', VS.FONTS.body);
    fill('#selScript', VS.FONTS.script);
    fill('#selHead', VS.FONTS.head);
    const sw = $('#swatches');
    for (const [key, t] of Object.entries(VS.THEMES)) {
      const b = el('button', 'sw-t');
      b.dataset.key = key;
      b.title = `${t.name}${t.dark ? ' (dark)' : ''}`;
      b.style.background = t.bg;
      b.style.setProperty('--a', t.accent);
      b.onclick = () => {
        if (t.dark) { st.s.darkTheme = key; st.s.mode = 'dark'; } else { st.s.lightTheme = key; st.s.mode = 'light'; }
        persist();
        afterSettingsChange(['mode']);
      };
      sw.appendChild(b);
    }
    if (st.s.customTheme) {
      const t = st.s.customTheme;
      const b = el('button', 'sw-t');
      b.dataset.key = 'custom';
      b.title = 'Custom';
      b.style.background = t.bg;
      b.style.setProperty('--a', t.accent);
      b.onclick = () => { if (t.dark) { st.s.darkTheme = 'custom'; st.s.mode = 'dark'; } else { st.s.lightTheme = 'custom'; st.s.mode = 'light'; } persist(); afterSettingsChange(['mode']); };
      sw.appendChild(b);
    }

    $$('#tools [data-bind]').forEach((c) => {
      const path = c.dataset.bind;
      if (c.classList.contains('seg')) {
        c.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => setSetting(path, b.value)));
      } else if (c.type === 'checkbox') {
        c.addEventListener('change', () => setSetting(path, c.checked));
      } else if (c.type === 'range') {
        c.addEventListener('input', () => setSetting(path, parseFloat(c.value)));
      } else {
        c.addEventListener('change', () => setSetting(path, c.value));
      }
    });
    syncTools();
  }
  const fmt = (path, v) => {
    if (path === 'fontSize') return `${v}px`;
    if (path === 'contentWidth') return `${v}%`;
    if (path === 'autoSeconds') return `${v}s`;
    if (path === 'letterSpacing' || path === 'wordSpacing') return `${(+v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}em`;
    if (path.startsWith('scale.')) return `${Math.round(v * 100)}%`;
    return String(+(+v).toFixed(2));
  };
  function syncTools() {
    $$('#tools [data-bind]').forEach((c) => {
      const path = c.dataset.bind;
      const v = VS.getPath(st.s, path);
      if (c.classList.contains('seg')) c.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.value === String(v)));
      else if (c.type === 'checkbox') c.checked = !!v;
      else if (c.type === 'range') {
        if (document.activeElement !== c) c.value = v;
        const o = c.parentElement.querySelector('output');
        if (o) o.textContent = fmt(path, v);
      } else c.value = v;
    });
  }

  /* ================================================================ */
  /* Navigator & search                                               */
  /* ================================================================ */
  const plain = (h) => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
  function verseText(v) {
    return [v.ref, v.script, v.translit, v.synonyms, ...v.translation.map(plain), ...v.purport.map(plain)].join(' \n ');
  }
  function buildVerseList() {
    const list = $('#verseList');
    list.replaceChildren();
    const q = fold($('#search').value.trim());
    st.deck.verses.forEach((v, vi) => {
      if (st.verseSlide[vi] == null) return;
      let snippet = plain(v.translation[0] || '') || v.translit.split('\n')[0] || plain(v.purport[0] || '');
      if (q) {
        const full = verseText(v);
        const { f, idx } = foldMap(full);
        const p = f.indexOf(q);
        if (p < 0) return;
        const a = idx[p], z = idx[p + q.length];
        const s0 = Math.max(0, a - 50);
        snippet = null;
        const span = el('span');
        span.append(s0 > 0 ? '…' : '', full.slice(s0, a), el('mark', '', full.slice(a, z)), full.slice(z, z + 90));
        const b = item(v, vi);
        b.appendChild(span);
        list.appendChild(b);
        return;
      }
      const b = item(v, vi);
      b.appendChild(el('span', '', snippet.slice(0, 160)));
      list.appendChild(b);
    });
    if (!list.children.length) list.appendChild(el('p', 'muted', q ? 'No matches.' : 'No verses.'));
    const src = st.deck.source;
    const meta = $('#deckMeta');
    meta.replaceChildren(`${st.deck.title || 'Untitled'} · ${st.deck.verses.length} verse${st.deck.verses.length === 1 ? '' : 's'} · ${st.slides.length} slides`);
    if (src && /^https?:/.test(src)) { meta.append(' · '); const a = el('a', '', 'source'); a.href = src; a.target = '_blank'; a.rel = 'noopener'; meta.append(a); }
    updateChrome();
  }
  function item(v, vi) {
    const b = el('button', 'vitem');
    b.dataset.v = vi;
    b.appendChild(el('b', '', v.ref || `Part ${vi + 1}`));
    b.onclick = () => jumpToVerse(vi, fold($('#search').value.trim()));
    return b;
  }
  function jumpToVerse(vi, term) {
    let target = st.verseSlide[vi];
    if (target == null) return;
    st.searchTerm = term || '';
    if (term) {
      for (let i = target; i < st.slides.length && st.slides[i].verses.includes(vi); i++) {
        const n = renderSlide(st.slides[i]);
        if (fold(n.textContent).includes(term)) { target = i; break; }
      }
    }
    show(target, target > st.idx ? 1 : -1);
  }

  /* ================================================================ */
  /* Panels                                                           */
  /* ================================================================ */
  const toggleDrawer = (id, force) => {
    const d = $(id);
    const on = force == null ? !d.classList.contains('open') : force;
    d.classList.toggle('open', on);
    $(`#toolbar [data-act="${id === '#tools' ? 'tools' : 'nav'}"]`).classList.toggle('on', on);
    if (id === '#navigator' && on) { updateChrome(); setTimeout(() => $('#search').focus(), 50); }
    if (id === '#navigator' && !on) { $('#search').blur(); }
    return on;
  };
  const toggleModal = (id, force) => {
    const m = $(id);
    const on = force == null ? m.hidden : force;
    m.hidden = !on;
    return on;
  };
  function togglePaste(force) {
    if (toggleModal('#paste', force)) setTimeout(() => $('#pasteText').focus(), 30);
  }
  function openJump() {
    toggleModal('#jump', true);
    const inp = $('#jumpInput');
    inp.value = '';
    $('#jumpHint').textContent = `${st.deck.verses.length} verses in this deck`;
    setTimeout(() => inp.focus(), 20);
  }
  function doJump(q) {
    q = q.trim();
    if (!q) return;
    const fq = fold(q);
    const refs = st.deck.verses.map((v) => fold(v.ref));
    let vi = refs.findIndex((r) => r === fq);
    if (vi < 0) vi = refs.findIndex((r) => r.endsWith(fq) && !/\d/.test(r[r.length - fq.length - 1] || ''));
    if (vi < 0) vi = refs.findIndex((r) => new RegExp(`(^|\\D)${fq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\D|$)`).test(r));
    if (vi < 0 && /^\d+$/.test(q)) vi = Math.min(st.deck.verses.length, +q) - 1;
    if (vi >= 0 && st.verseSlide[vi] != null) { toggleModal('#jump', false); jumpToVerse(vi); }
    else $('#jumpHint').textContent = `No verse “${q}” found.`;
  }

  let toastTimer = 0;
  function toast(msg, ms = 2200) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('on'), ms);
  }

  function exportDeck() {
    const data = JSON.stringify({ format: 'sloka-slides', version: 1, ...st.deck }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = `${(st.deck.title || 'slides').replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 60)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  async function exportSettings() {
    const profiles = await VS.loadProfiles();
    const data = JSON.stringify({ format: 'sloka-slides-settings', version: 1, settings: st.s, profiles }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'sloka-slides-settings.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('Settings exported');
  }
  async function importSettings(file) {
    try {
      const d = JSON.parse(await file.text());
      if (!d.settings && !Array.isArray(d.profiles)) throw new Error('bad');
      if (d.settings) {
        st.s = VS.merge(VS.DEFAULTS, d.settings);
        st.s.order = [...new Set((st.s.order || []).filter((k) => VS.DEFAULTS.order.includes(k)).concat(VS.DEFAULTS.order))];
        st.lastSaved = JSON.stringify(st.s);
        await VS.saveSettings(st.s);
      }
      if (Array.isArray(d.profiles)) {
        const ids = new Set(d.profiles.map((p) => p.id));
        const existing = (await VS.loadProfiles()).filter((p) => !ids.has(p.id));
        await VS.saveProfiles(d.profiles.concat(existing));
      }
      loadFonts();
      afterSettingsChange(Object.keys(VS.DEFAULTS));
      toast('Settings imported');
    } catch { toast('That file is not a Śloka Slides settings backup.'); }
  }

  function exportPDF() {
    if (!st.slides.length) { toast('Nothing to export yet.'); return; }
    // Size each printed page to the exact on-screen slide box, so whatever fits on
    // screen fits the page identically — no clipping, one slide per page.
    const live = $('#stage .slide:not(.leaving)');
    const rect = live ? live.getBoundingClientRect() : { width: innerWidth, height: innerHeight };
    const w = Math.max(200, Math.round(rect.width));
    const h = Math.max(200, Math.round(rect.height));

    const old = $('#print-root');
    if (old) old.remove();
    const root = el('div');
    root.id = 'print-root';
    for (const slide of st.slides) {
      const sheet = el('div', 'psheet');
      const node = renderSlide(slide);
      decorate(node, slide);
      enrichLabels(node, slide);
      sheet.appendChild(node);
      root.appendChild(sheet);
    }
    document.body.appendChild(root);

    let sz = document.getElementById('print-size');
    if (!sz) { sz = document.createElement('style'); sz.id = 'print-size'; document.head.appendChild(sz); }
    sz.textContent = `@media print{@page{size:${w}px ${h}px;margin:0}#print-root .psheet{width:${w}px;height:${h}px}}`;

    document.body.classList.add('printing');
    const cleanup = () => {
      document.body.classList.remove('printing');
      root.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    toast('Choose “Save as PDF” in the print dialog', 3000);
    // let the DOM settle (fonts already loaded) before opening the dialog
    const go = () => setTimeout(() => { try { window.print(); } catch { cleanup(); toast('Printing was blocked by the browser.'); } }, 80);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => toast('Full screen was blocked — press F11'));
  }

  const SECTION_SIZE_NAMES = { script: 'Devanāgarī', translit: 'Transliteration', synonyms: 'Word-for-word', translation: 'Translation', purport: 'Purport' };
  const slideSections = (slide) => {
    const keys = new Set();
    (slide.blocks || []).forEach((b) => { if (b.k !== 'vhead' && b.k in st.s.scale) keys.add(b.k); });
    return [...keys];
  };
  // Adjust the global per-section size for whatever sections are on this slide.
  // These live in settings and save automatically, so every future verse uses the last size.
  function bumpSlide(dir) {
    const slide = st.slides[st.idx];
    const keys = slide && !slide.title ? slideSections(slide) : [];
    if (!keys.length) { toast('Nothing to resize on this slide', 900); return; }
    keys.forEach((k) => { st.s.scale[k] = Math.min(2, Math.max(0.5, +((st.s.scale[k] || 1) + (dir > 0 ? 0.06 : -0.06)).toFixed(3))); });
    persist();
    afterSettingsChange(['scale']);
    const label = keys.map((k) => SECTION_SIZE_NAMES[k] || k).join(' + ');
    toast(`${label} · ${Math.round(st.s.scale[keys[0]] * 100)}% — saved for all verses`, 1300);
  }
  function resetSlideScale() {
    const slide = st.slides[st.idx];
    const keys = slide && !slide.title ? slideSections(slide) : [];
    let any = false;
    keys.forEach((k) => { if (st.s.scale[k] !== VS.DEFAULTS.scale[k]) { st.s.scale[k] = VS.DEFAULTS.scale[k]; any = true; } });
    if (any) { persist(); afterSettingsChange(['scale']); toast('Section size reset', 1000); }
  }
  function bumpAll(dir) {
    setSetting('fontSize', Math.min(96, Math.max(14, st.s.fontSize + (dir > 0 ? 2 : -2))));
    toast(`All slides · text ${st.s.fontSize}px`, 900);
  }

  /* ---------- editable verse numbers ---------- */
  function startEditRef(vi, container) {
    if (!container || container.querySelector('.ref-input') || !st.deck.verses[vi]) return;
    const cur = st.deck.verses[vi].ref || '';
    const input = el('input', 'ref-input');
    input.value = cur;
    input.spellcheck = false;
    input.setAttribute('aria-label', 'Verse number');
    container.replaceChildren(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const val = input.value.trim();
      if (save && val !== cur) {
        st.deck.verses[vi].ref = val;
        saveDeck();
        repaginate(true);   // vhead text is snapshotted at pagination — rebuild it
        buildVerseList();
        toast('Verse number updated', 900);
      } else {
        show(st.idx, 0);
      }
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', () => finish(true));
    input.addEventListener('click', (e) => e.stopPropagation());
  }
  function wireOne(container, vi) {
    if (!container || container.querySelector('.ed-btn')) return;
    container.classList.add('ref-edit');
    const b = el('button', 'ed-btn', '✎');
    b.title = 'Edit verse number (Enter to save, Esc to cancel)';
    b.tabIndex = -1;
    b.addEventListener('click', (e) => { e.stopPropagation(); startEditRef(vi, container); });
    container.appendChild(b);
  }
  function wireEditing(node, slide) {
    if (!slide || slide.title || !slide.verses) return;
    node.querySelectorAll('.b-vhead').forEach((vh) => { const vi = +vh.dataset.v; if (!Number.isNaN(vi)) wireOne(vh, vi); });
    const refEl = node.querySelector('.slide-head .ref');
    if (refEl && slide.verses.length === 1) wireOne(refEl, slide.verses[0]);
  }
  function editCurrentRef() {
    const slide = st.slides[st.idx];
    if (!slide || slide.title || !slide.verses) { toast('Nothing to rename here', 900); return; }
    const node = $('#stage .slide:not(.leaving)');
    if (!node) return;
    const vh = node.querySelector('.b-vhead');
    if (vh) { startEditRef(+vh.dataset.v, vh); return; }
    const head = node.querySelector('.slide-head');
    const refEl = node.querySelector('.slide-head .ref');
    if (refEl) { if (head) head.classList.remove('hidden', 'off'); startEditRef(slide.verses[0], refEl); }
  }

  function act(a) {
    switch (a) {
      case 'nav': toggleDrawer('#navigator'); break;
      case 'tools': toggleDrawer('#tools'); break;
      case 'font+': bumpSlide(1); break;
      case 'font-': bumpSlide(-1); break;
      case 'font+all': bumpAll(1); break;
      case 'font-all': bumpAll(-1); break;
      case 'dark': {
        const t = VS.resolveTheme(st.s, mqDark.matches);
        setSetting('mode', t.dark ? 'light' : 'dark');
        break;
      }
      case 'auto': setAuto(!st.autoOn); break;
      case 'full': toggleFullscreen(); break;
      case 'help': toggleModal('#help'); break;
      case 'paste': togglePaste(); break;
      case 'export': exportDeck(); break;
      case 'import': $('#importFile').click(); break;
      case 'expset': exportSettings(); break;
      case 'impset': $('#importSettingsFile').click(); break;
      case 'pdf': exportPDF(); break;
      case 'options': if (VS.hasChrome && chrome.runtime.openOptionsPage) chrome.runtime.openOptionsPage(); else location.href = '../options/options.html'; break;
      case 'reset': {
        const keep = { order: st.s.order, show: st.s.show, customTheme: st.s.customTheme };
        st.s = VS.merge(VS.DEFAULTS, keep);
        persist();
        loadFonts();
        afterSettingsChange(Object.keys(VS.DEFAULTS));
        toast('Look reset to defaults');
        break;
      }
      default:
    }
  }

  /* ================================================================ */
  /* Events                                                           */
  /* ================================================================ */
  function bindEvents() {
    $('#prev').onclick = prev;
    $('#next').onclick = next;
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) { let a = b.dataset.act; if (e.altKey && (a === 'font+' || a === 'font-')) a += 'all'; act(a); return; }
      const inStage = e.target.closest('#stage');
      if (inStage && document.body.classList.contains('hlmode')) {
        const w = wordAt(e.clientX, e.clientY);
        const blk = e.target.closest('[data-v]');
        if (w && blk) {
          const vi = +blk.dataset.v;
          const set = st.marks.get(vi) || new Set();
          const key = fold(w.w);
          const had = [...set].find((x) => fold(x) === key);
          if (had) set.delete(had); else set.add(w.w);
          st.marks.set(vi, set);
          show(st.idx, 0);
        }
        return;
      }
      if (inStage && st.s.clickNav && !window.getSelection().toString()) { if (e.shiftKey) prev(); else next(); }
    });

    // progress bar scrubbing
    const prog = $('#progress');
    const idxAt = (x) => Math.max(0, Math.min(st.slides.length - 1, Math.floor((x / innerWidth) * st.slides.length)));
    prog.addEventListener('mousemove', (e) => {
      const i = idxAt(e.clientX);
      const sl = st.slides[i];
      const tip = $('#progressTip');
      tip.textContent = `${sl.title ? 'Title' : refRange(sl) || 'Slide'} · ${i + 1}/${st.slides.length}`;
      tip.style.left = `${Math.max(70, Math.min(innerWidth - 70, e.clientX))}px`;
    });
    prog.addEventListener('click', (e) => { const i = idxAt(e.clientX); show(i, i > st.idx ? 1 : -1); });

    // search
    $('#search').addEventListener('input', () => {
      buildVerseList();
      if (!$('#search').value.trim() && st.searchTerm) { st.searchTerm = ''; show(st.idx, 0); }
    });
    $('#search').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = $('#verseList .vitem'); if (first) first.click(); }
      if (e.key === 'Escape') { toggleDrawer('#navigator', false); }
      e.stopPropagation();
    });
    $('#jump form').addEventListener('submit', (e) => { e.preventDefault(); doJump($('#jumpInput').value); });
    $('#jumpInput').addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleModal('#jump', false); e.stopPropagation(); });
    $('#pasteText').addEventListener('keydown', (e) => { if (e.key === 'Escape') togglePaste(false); e.stopPropagation(); });
    $('#pasteGo').onclick = async () => {
      const text = $('#pasteText').value;
      const verses = VS.parseText(text);
      if (!verses.length) { toast('Could not find any verse text in what you pasted.'); return; }
      togglePaste(false);
      await saveNewDeck({ title: verses[0].ref ? `${verses[0].ref}${verses.length > 1 ? ` – ${verses[verses.length - 1].ref}` : ''}` : 'Pasted text', source: '', method: 'Pasted text', verses });
      toast(`Created ${verses.length} verse${verses.length === 1 ? '' : 's'}`);
    };
    $('#importFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const d = JSON.parse(await f.text());
        if (!Array.isArray(d.verses)) throw new Error('bad');
        await saveNewDeck({ title: d.title || f.name, source: d.source || '', verses: d.verses });
        toast('Deck imported');
      } catch { toast('That file is not a Śloka Slides deck.'); }
      e.target.value = '';
    });
    $('#importSettingsFile').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (f) await importSettings(f);
      e.target.value = '';
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.matches('input, textarea, select') && e.target.type !== 'checkbox') return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); exportPDF(); return; }
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') { e.preventDefault(); bumpAll(1); return; }
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') { e.preventDefault(); bumpAll(-1); return; }
        if (e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); setSetting('fontSize', VS.DEFAULTS.fontSize); toast('All slides · text size reset', 900); return; }
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      const modalOpen = $$('.modal').some((m) => !m.hidden);
      if (k === 'Escape') {
        $$('.modal').forEach((m) => { m.hidden = true; });
        toggleDrawer('#navigator', false);
        toggleDrawer('#tools', false);
        $('#curtain').className = '';
        document.body.classList.remove('laser', 'spot', 'hlmode');
        return;
      }
      if (modalOpen) { if (k === '?' ) toggleModal('#help', false); return; }
      if ($('#curtain').className && !['b', 'B', 'w', 'W', '.'].includes(k)) { $('#curtain').className = ''; e.preventDefault(); return; }
      const handled = true;
      switch (k) {
        case 'ArrowRight': case 'PageDown': case ' ': case 'Enter': case 'n': case 'N': next(); break;
        case 'ArrowLeft': case 'PageUp': case 'Backspace': case 'p': case 'P': prev(); break;
        case 'ArrowDown': nextVerse(); break;
        case 'ArrowUp': prevVerse(); break;
        case 'Home': show(0, -1); break;
        case 'End': show(st.slides.length - 1, 1); break;
        case 'f': case 'F': toggleFullscreen(); break;
        case 't': case 'T': toggleDrawer('#tools'); break;
        case 'g': case 'G': toggleDrawer('#navigator'); break;
        case '/': toggleDrawer('#navigator', true); break;
        case 'j': case 'J': openJump(); break;
        case '+': case '=': act('font+'); break;
        case '-': case '_': act('font-'); break;
        case '0': resetSlideScale(); break;
        case 'e': case 'E': case 'r': case 'R': editCurrentRef(); break;
        case 'd': case 'D': act('dark'); break;
        case 'a': case 'A': setAuto(!st.autoOn); break;
        case 'b': case 'B': case '.': $('#curtain').className = $('#curtain').className === 'black' ? '' : 'black'; break;
        case 'w': case 'W': $('#curtain').className = $('#curtain').className === 'white' ? '' : 'white'; break;
        case 'l': case 'L': document.body.classList.toggle('laser'); break;
        case 's': case 'S': toast(document.body.classList.toggle('spot') ? 'Spotlight on — hover a paragraph' : 'Spotlight off', 1400); break;
        case 'h': case 'H': toast(document.body.classList.toggle('hlmode') ? 'Highlighter on — click words to mark them' : 'Highlighter off', 1600); break;
        case '?': toggleModal('#help'); break;
        case '1': case '2': case '3': case '4': case '5': {
          const key = ['script', 'translit', 'synonyms', 'translation', 'purport'][+k - 1];
          setSetting(`show.${key}`, !st.s.show[key]);
          toast(`${{ script: 'Devanāgarī', translit: 'Transliteration', synonyms: 'Word-for-word', translation: 'Translation', purport: 'Purport' }[key]} ${st.s.show[key] ? 'shown' : 'hidden'}`, 1200);
          break;
        }
        default: return;
      }
      if (handled) e.preventDefault();
    });

    // idle chrome
    let idleT = 0;
    const wake = () => {
      document.body.classList.remove('idle');
      clearTimeout(idleT);
      idleT = setTimeout(() => {
        if ($$('.drawer.open').length || $('#toolbar:hover')) return;
        document.body.classList.add('idle');
      }, 2600);
    };
    document.addEventListener('mousemove', (e) => {
      wake();
      if (document.body.classList.contains('laser')) { const l = $('#laser'); l.style.left = `${e.clientX}px`; l.style.top = `${e.clientY}px`; }
    });
    wake();

    // wheel
    let wheelLock = 0;
    document.addEventListener('wheel', (e) => {
      if (!st.s.wheelNav || e.target.closest('.drawer, .modal')) return;
      const now = Date.now();
      if (now < wheelLock || Math.abs(e.deltaY) < 20) return;
      wheelLock = now + 450;
      if (e.deltaY > 0) next(); else prev();
    }, { passive: true });

    // touch
    let tx = 0, ty = 0;
    document.addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && !e.target.closest('.drawer, .modal')) { if (dx < 0) next(); else prev(); }
    }, { passive: true });

    window.addEventListener('resize', () => repaginate());
    mqDark.addEventListener('change', () => { applyLook(); });
    window.addEventListener('hashchange', async () => { await loadDeck(); repaginate(true); buildVerseList(); });

    // clock
    const tick = () => { $('#clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    tick();
    setInterval(tick, 15000);

    // settings edited in another tab (options page)
    if (VS.hasChrome) {
      chrome.storage.onChanged.addListener((ch, area) => {
        if (area !== 'sync' || !ch.settings) return;
        const raw = JSON.stringify(VS.merge(VS.DEFAULTS, ch.settings.newValue || {}));
        if (raw === st.lastSaved) return;
        const before = st.s;
        st.s = VS.merge(VS.DEFAULTS, ch.settings.newValue || {});
        st.lastSaved = raw;
        const changed = Object.keys(VS.DEFAULTS).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(st.s[k]));
        loadFonts();
        afterSettingsChange(changed);
      });
    }
  }

  async function boot() {
    st.s = await VS.loadSettings();
    st.lastSaved = JSON.stringify(st.s);
    await loadDeck();
    buildTools();
    applyLook();
    applyTypography();
    loadFonts();
    paginate();
    const saved = st.s.rememberPosition && st.id ? await VS.store.get('local', `pos:${st.id}`) : null;
    show(saved ? indexForAnchor(saved) : 0, 0);
    if (st.s.autoMode !== 'off') setAuto(true);
    buildVerseList();
    bindEvents();
    if (st.demo && window.top === window && !location.hash.includes('paste')) toast('This is a sample verse. Open a scripture page and click the extension to present it.', 5200);
    if (location.hash.includes('paste')) togglePaste(true);
    document.fonts && document.fonts.ready.then(() => repaginate());
  }

  boot();

  // expose for debugging / tests
  window.__vs = { st, show, repaginate, exportPDF };
})();
