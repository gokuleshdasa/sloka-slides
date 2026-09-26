/* Śloka Slides — shared helpers (loaded by content script, popup, options and slideshow). */
(function () {
  if (self.VS && self.VS.__ready) return;
  const VS = { __ready: true };

  /* ------------------------------------------------------------------ */
  /* Fields                                                             */
  /* ------------------------------------------------------------------ */
  VS.FIELDS = [
    { key: 'ref', label: 'Verse number', hint: 'e.g. “ŚB 8.1.2” or “Text 2”', color: '#f59e0b' },
    { key: 'script', label: 'Devanāgarī / Bengali', hint: 'original script', color: '#ef4444' },
    { key: 'translit', label: 'Transliteration', hint: 'roman verse text', color: '#8b5cf6' },
    { key: 'synonyms', label: 'Word-for-word', hint: 'synonyms', color: '#3b82f6' },
    { key: 'translation', label: 'Translation', hint: '', color: '#10b981' },
    { key: 'purport', label: 'Purport', hint: 'commentary', color: '#ec4899' },
  ];
  VS.CONTAINER_FIELD = { key: 'container', label: 'Verse block', hint: 'optional — one box per verse', color: '#64748b' };
  VS.ORDER = { ref: 0, script: 1, translit: 2, synonyms: 3, translation: 4, purport: 5 };
  VS.SECTION_LABELS = {
    script: 'Verse', translit: 'Verse', synonyms: 'Word for word',
    translation: 'Translation', purport: 'Purport',
  };

  /* Built-in site profiles (best effort — can be overridden with the mapper). */
  VS.BUILTIN_PROFILES = [
    {
      id: 'builtin-vedabase',
      name: 'Vedabase.io (built-in)',
      builtin: true,
      host: 'vedabase.io',
      path: '*',
      container: '',
      fields: {
        ref: 'h1',
        script: '.av-devanagari, .av-bengali',
        translit: '.av-verse_text',
        synonyms: '.av-synonyms',
        translation: '.av-translation',
        purport: '.av-purport',
      },
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Themes & fonts                                                     */
  /* ------------------------------------------------------------------ */
  VS.THEMES = {
    parchment: { name: 'Parchment', dark: false, bg: '#f4ead5', surface: '#ebdfc4', fg: '#3a2c1d', muted: '#8a7458', accent: '#a0431a', accent2: '#6b4e16' },
    saffron:   { name: 'Saffron Dawn', dark: false, bg: '#fff8ef', surface: '#fde9d2', fg: '#2a211b', muted: '#8c7766', accent: '#e0600d', accent2: '#b4400a' },
    tulasi:    { name: 'Tulasī', dark: false, bg: '#f1f7f0', surface: '#dfeedd', fg: '#1d2b21', muted: '#6d8272', accent: '#2d7a47', accent2: '#1f5c35' },
    lotus:     { name: 'Lotus', dark: false, bg: '#fdf3f7', surface: '#f8dfea', fg: '#37192a', muted: '#94707f', accent: '#c02667', accent2: '#8d1a4b' },
    paper:     { name: 'Clean Paper', dark: false, bg: '#ffffff', surface: '#eef1f5', fg: '#141a22', muted: '#6b7684', accent: '#1f55d6', accent2: '#153c99' },
    midnight:  { name: 'Midnight Temple', dark: true, bg: '#0e1014', surface: '#1a1d24', fg: '#ece5d6', muted: '#8f8a80', accent: '#f2a93b', accent2: '#e0822c' },
    yamuna:    { name: 'Yamunā Blue', dark: true, bg: '#0a1330', surface: '#15204a', fg: '#e5ebff', muted: '#8d98c2', accent: '#79cdf7', accent2: '#b59cff' },
    ember:     { name: 'Ember', dark: true, bg: '#1a110e', surface: '#2a1c17', fg: '#f4e6da', muted: '#a38c7c', accent: '#ff9447', accent2: '#ffc26b' },
    forest:    { name: 'Vṛndāvana Night', dark: true, bg: '#0d1812', surface: '#16261d', fg: '#e0efe5', muted: '#86a192', accent: '#82e3a2', accent2: '#e8d27c' },
    projector: { name: 'Projector (max contrast)', dark: true, bg: '#000000', surface: '#161616', fg: '#ffffff', muted: '#a0a0a0', accent: '#ffd400', accent2: '#ffffff' },
  };

  VS.FONTS = {
    body: [
      { id: 'Gentium Book Plus', label: 'Gentium Book Plus (best diacritics)', gf: 'Gentium+Book+Plus:ital,wght@0,400;0,700;1,400', fallback: 'Georgia, serif' },
      { id: 'EB Garamond', label: 'EB Garamond', gf: 'EB+Garamond:ital,wght@0,400;0,600;1,400', fallback: 'Georgia, serif' },
      { id: 'Crimson Pro', label: 'Crimson Pro', gf: 'Crimson+Pro:ital,wght@0,400;0,600;1,400', fallback: 'Georgia, serif' },
      { id: 'Noto Serif', label: 'Noto Serif', gf: 'Noto+Serif:ital,wght@0,400;0,700;1,400', fallback: 'Georgia, serif' },
      { id: 'Lora', label: 'Lora', gf: 'Lora:ital,wght@0,400;0,600;1,400', fallback: 'Georgia, serif' },
      { id: 'Literata', label: 'Literata', gf: 'Literata:ital,wght@0,400;0,600;1,400', fallback: 'Georgia, serif' },
      { id: 'Noto Sans', label: 'Noto Sans', gf: 'Noto+Sans:ital,wght@0,400;0,700;1,400', fallback: 'system-ui, sans-serif' },
      { id: 'Inter', label: 'Inter', gf: 'Inter:wght@400;600', fallback: 'system-ui, sans-serif' },
      { id: 'Atkinson Hyperlegible', label: 'Atkinson Hyperlegible (low vision)', gf: 'Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400', fallback: 'system-ui, sans-serif' },
      { id: 'Georgia', label: 'Georgia (system, offline)', gf: '', fallback: 'serif' },
      { id: 'system-ui', label: 'System sans (offline)', gf: '', fallback: 'sans-serif' },
    ],
    script: [
      { id: 'Tiro Devanagari Sanskrit', label: 'Tiro Devanagari Sanskrit', gf: 'Tiro+Devanagari+Sanskrit:ital@0;1', fallback: 'serif' },
      { id: 'Noto Serif Devanagari', label: 'Noto Serif Devanagari', gf: 'Noto+Serif+Devanagari:wght@400;600', fallback: 'serif' },
      { id: 'Martel', label: 'Martel', gf: 'Martel:wght@400;600', fallback: 'serif' },
      { id: 'Kalam', label: 'Kalam (handwritten)', gf: 'Kalam:wght@400;700', fallback: 'serif' },
      { id: 'Noto Serif Bengali', label: 'Noto Serif Bengali', gf: 'Noto+Serif+Bengali:wght@400;600', fallback: 'serif' },
      { id: 'serif', label: 'System default (offline)', gf: '', fallback: 'serif' },
    ],
    head: [
      { id: 'Cormorant Garamond', label: 'Cormorant Garamond', gf: 'Cormorant+Garamond:wght@500;700', fallback: 'Georgia, serif' },
      { id: 'Cinzel', label: 'Cinzel (engraved)', gf: 'Cinzel:wght@500;700', fallback: 'Georgia, serif' },
      { id: 'Philosopher', label: 'Philosopher', gf: 'Philosopher:wght@400;700', fallback: 'sans-serif' },
      { id: 'Gentium Book Plus', label: 'Same as body', gf: 'Gentium+Book+Plus:wght@400;700', fallback: 'Georgia, serif' },
      { id: 'Inter', label: 'Inter', gf: 'Inter:wght@500;700', fallback: 'system-ui, sans-serif' },
    ],
  };
  VS.fontStack = (group, id) => {
    const f = (VS.FONTS[group] || []).find((x) => x.id === id);
    const fb = f ? f.fallback : 'serif';
    return /^(serif|sans-serif|system-ui|Georgia)$/.test(id) ? `${id}, ${fb}` : `"${id}", ${fb}`;
  };

  VS.DEFAULTS = {
    mode: 'auto',              // auto | light | dark
    lightTheme: 'parchment',
    darkTheme: 'midnight',
    customTheme: null,         // {bg,surface,fg,muted,accent,accent2,dark}
    bgStyle: 'glow',           // plain | glow | mandala | aurora
    fontBody: 'Gentium Book Plus',
    fontScript: 'Tiro Devanagari Sanskrit',
    fontHead: 'Cormorant Garamond',
    fontSize: 36,              // px at a 1080px-tall screen
    scaleWithWindow: true,
    lineHeight: 1.5,
    letterSpacing: 0,          // em
    wordSpacing: 0,            // em
    contentWidth: 82,          // % of screen width
    textAlign: 'justify',      // left | justify | center
    verseAlign: 'center',
    scale: { script: 1.1, translit: 1.08, synonyms: 0.78, translation: 1.08, purport: 1 },
    show: { script: true, translit: true, synonyms: true, translation: true, purport: true },
    order: ['script', 'translit', 'synonyms', 'translation', 'purport'],
    labels: true,
    translitItalic: true,
    translationBold: true,
    synonymsStyle: 'flow',     // flow | list
    layout: 'section',         // flow (fit as much as possible) | section (each section on its own slide)
    combineShort: true,        // put several short (no-purport) verses on one slide
    endNote: true,             // recited closing line after the final purport
    endNoteText: 'Thus ends the Bhaktivedanta Purport.',
    purportCue: true,          // faded "Purport follows" hint when the purport is on the next slide
    vcenter: true,
    headerMode: 'verse',       // top verse-number header: all | verse (only verse slides) | off
    titleSlide: false,         // opening slide with the deck title
    transition: 'fade',        // none | fade | slide | rise | zoom
    showArrows: true,
    showProgress: true,
    progressHeight: 3,
    showTicks: true,
    showCorner: true,
    showCounter: true,
    showClock: false,
    autoMode: 'off',           // off | fixed | pace
    autoSeconds: 40,
    wpm: 150,
    wheelNav: false,
    clickNav: false,
    openIn: 'tab',             // tab | window
    rememberPosition: true,
    disabledBuiltins: [],
  };

  /* ------------------------------------------------------------------ */
  /* Storage                                                            */
  /* ------------------------------------------------------------------ */
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  VS.hasChrome = !!hasChrome;
  VS.store = {
    async get(area, key) {
      if (hasChrome) {
        const r = await chrome.storage[area].get(key);
        return r[key];
      }
      try { return JSON.parse(localStorage.getItem(`vs:${area}:${key}`)); } catch { return undefined; }
    },
    async set(area, key, value) {
      if (hasChrome) return chrome.storage[area].set({ [key]: value });
      try { localStorage.setItem(`vs:${area}:${key}`, JSON.stringify(value)); } catch { /* ignore */ }
    },
    async remove(area, key) {
      if (hasChrome) return chrome.storage[area].remove(key);
      try { localStorage.removeItem(`vs:${area}:${key}`); } catch { /* ignore */ }
    },
  };

  const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);
  VS.merge = function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!isObj(over)) return out;
    for (const k of Object.keys(over)) {
      if (isObj(base[k]) && isObj(over[k])) out[k] = merge(base[k], over[k]);
      else if (over[k] !== undefined) out[k] = over[k];
    }
    return out;
  };
  VS.loadSettings = async () => {
    const s = VS.merge(VS.DEFAULTS, (await VS.store.get('sync', 'settings')) || {});
    // make sure order holds every section exactly once
    const all = VS.DEFAULTS.order;
    s.order = [...new Set((s.order || []).filter((k) => all.includes(k)).concat(all))];
    return s;
  };
  VS.saveSettings = (s) => VS.store.set('sync', 'settings', s);
  VS.loadProfiles = async () => (await VS.store.get('local', 'profiles')) || [];
  VS.saveProfiles = (p) => VS.store.set('local', 'profiles', p);
  /** User mappings + the built-in ones that are not switched off. */
  VS.activeProfiles = async () => {
    const off = (await VS.loadSettings()).disabledBuiltins || [];
    return (await VS.loadProfiles()).concat(VS.BUILTIN_PROFILES.filter((p) => !off.includes(p.id)));
  };

  VS.getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  VS.setPath = (obj, path, val) => {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = isObj(o[ks[i]]) ? o[ks[i]] : {};
    o[ks[ks.length - 1]] = val;
  };

  VS.resolveTheme = (s, prefersDark) => {
    const dark = s.mode === 'dark' || (s.mode === 'auto' && prefersDark);
    const key = dark ? s.darkTheme : s.lightTheme;
    if (key === 'custom' && s.customTheme) return { name: 'Custom', ...s.customTheme, key };
    return { ...(VS.THEMES[key] || VS.THEMES[dark ? 'midnight' : 'parchment']), key };
  };

  /* ------------------------------------------------------------------ */
  /* Profiles                                                           */
  /* ------------------------------------------------------------------ */
  const globRe = (g) => new RegExp('^' + String(g || '*').split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i');
  VS.hostMatches = (pattern, host) => {
    pattern = String(pattern || '').toLowerCase().replace(/^www\./, '');
    host = String(host || '').toLowerCase().replace(/^www\./, '');
    if (!pattern) return false;
    if (pattern.includes('*')) return globRe(pattern).test(host);
    return host === pattern || host.endsWith('.' + pattern);
  };
  VS.matchProfile = (url, profiles) => {
    let u;
    try { u = new URL(url); } catch { return null; }
    const all = profiles || [];
    const hits = all.filter((p) => p.enabled !== false && VS.hostMatches(p.host, u.hostname) && globRe(p.path || '*').test(u.pathname));
    hits.sort((a, b) => (a.builtin ? 1 : 0) - (b.builtin ? 1 : 0) || String(b.path || '').replace(/\*/g, '').length - String(a.path || '').replace(/\*/g, '').length);
    return hits[0] || null;
  };

  /* ------------------------------------------------------------------ */
  /* DOM → clean text / html                                            */
  /* ------------------------------------------------------------------ */
  const BLOCK = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL', 'CENTER']);
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'BUTTON', 'SELECT', 'TEXTAREA', 'INPUT', 'IFRAME', 'OBJECT', 'CANVAS', 'VIDEO', 'AUDIO', 'IMG', 'VS-PICKER']);
  const INLINE = { EM: 'em', I: 'em', STRONG: 'strong', B: 'strong', SUP: 'sup', SUB: 'sub', U: 'u' };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  VS.esc = esc;

  /**
   * Walk an element and return one entry per visual line/paragraph:
   *   [{ text, html }]  — html contains only <em>, <strong>, <sup>, <sub>, <u>.
   */
  VS.blocks = function blocks(root, opts = {}) {
    const out = [];
    let text = '';
    let html = '';
    const open = [];
    const flush = () => {
      const t = text.replace(/\s+/g, ' ').trim();
      if (t) {
        let h = html + open.slice().reverse().map((x) => `</${x}>`).join('');
        h = h.replace(/\s+/g, ' ').trim().replace(/<(em|strong|sup|sub|u)>\s*<\/\1>/g, '');
        out.push({ text: t, html: h });
      }
      text = '';
      html = open.map((x) => `<${x}>`).join('');
    };
    const hidden = (el) => {
      if (!opts.skipHidden || !el.ownerDocument.defaultView) return false;
      try {
        const cs = el.ownerDocument.defaultView.getComputedStyle(el);
        return cs.display === 'none' || cs.visibility === 'hidden';
      } catch { return false; }
    };
    const walk = (n) => {
      if (n.nodeType === 3) {
        text += n.nodeValue;
        html += esc(n.nodeValue);
        return;
      }
      if (n.nodeType !== 1 && n.nodeType !== 11) return;
      const tag = n.tagName || '';
      if (SKIP.has(tag) || (n.nodeType === 1 && (n.getAttribute('aria-hidden') === 'true' || hidden(n)))) return;
      if (tag === 'BR') { flush(); return; }
      const isBlock = BLOCK.has(tag);
      const inl = INLINE[tag];
      if (isBlock) flush();
      if (inl) { open.push(inl); html += `<${inl}>`; }
      for (let c = n.firstChild; c; c = c.nextSibling) walk(c);
      if (inl) { open.pop(); html += `</${inl}>`; }
      if (isBlock) flush();
    };
    walk(root);
    flush();
    return out;
  };

  /** Re-sanitize a html fragment (from storage) through an allow-list. */
  VS.sanitize = function sanitize(html) {
    if (typeof DOMParser === 'undefined') return esc(html);
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const walk = (n) => {
      let s = '';
      for (let c = n.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) s += esc(c.nodeValue);
        else if (c.nodeType === 1) {
          const t = INLINE[c.tagName];
          if (c.tagName === 'BR') s += '<br>';
          else if (c.tagName === 'MARK') s += `<mark>${walk(c)}</mark>`;
          else if (t) s += `<${t}>${walk(c)}</${t}>`;
          else if (!SKIP.has(c.tagName)) s += walk(c);
        }
      }
      return s;
    };
    return walk(doc.body.firstChild || doc.body);
  };

  /* ------------------------------------------------------------------ */
  /* Text heuristics                                                    */
  /* ------------------------------------------------------------------ */
  const INDIC = /[ऀ-ॿঀ-৿꣠-ꣿ]/;
  VS.hasIndic = (s) => INDIC.test(s);

  const LABELS = [
    [/^(synonyms?|word[\s-]*for[\s-]*word|word[\s-]*by[\s-]*word|word meanings?|padārtha|শব্দার্থ)\s*:?$/i, 'synonyms'],
    [/^(translation|anuvāda|अनुवाद|অনুবাদ)\s*:?$/i, 'translation'],
    [/^(purport|commentary|explanation|tātparya|bhāvārtha|तात्पर्य|তাৎপর্য)\s*:?$/i, 'purport'],
    [/^(devanagari|devanāgarī|bengali|verse text|text)\s*:?$/i, 'verse'],
  ];
  VS.labelOf = (s) => {
    const t = String(s).trim();
    if (t.length > 40) return null;
    for (const [re, k] of LABELS) if (re.test(t)) return k;
    return null;
  };

  const REF_RES = [
    /^(texts?|verses?|ślokas?|slokas?|mantras?|sūtras?|sutras?)\s+\d+(\s*[-–—]\s*\d+)?\.?$/i,
    /^[\p{L}.'’\- ]{1,32}?\s*\d+(\.\d+){1,3}(\s*[-–—]\s*\d+)?$/u,
    /^(ŚB|SB|BG|Bg\.?|CC|Cc\.?|NOI|NoI|ISO|Īśo|Iso|ŚU|SU|Śrī Īśopaniṣad|Sri Isopanisad)\s+[\p{L}\s.]*\d+(\s*[-–—]\s*\d+)?$/iu,
    /^\d+(\.\d+){1,3}(\s*[-–—]\s*\d+)?$/,
  ];
  VS.refLike = (s) => {
    const t = String(s).trim();
    if (!t || t.length > 44 || /^chapter\b/i.test(t)) return false;
    return REF_RES.some((re) => re.test(t));
  };

  /**
   * Parse a list of lines ({text, html}) into verses.
   * opts.keepPreamble: keep text found before the first verse number (selection / pasted text).
   */
  VS.parseLines = function parseLines(lines, opts = {}) {
    const verses = [];
    let cur = null;
    let sec = null;
    const pre = [];
    const newVerse = (ref) => {
      cur = { ref: ref || '', script: [], translit: [], synonyms: [], translation: [], purport: [] };
      verses.push(cur);
      sec = null;
    };
    const put = (ln) => {
      if (sec && sec !== 'verse') { cur[sec].push(ln); return; }
      if (VS.hasIndic(ln.text)) { cur.script.push(ln); return; }
      const noLater = !cur.synonyms.length && !cur.translation.length && !cur.purport.length;
      if (noLater && ln.text.length <= 140) cur.translit.push(ln);
      else if (!cur.translation.length) cur.translation.push(ln);
      else cur.purport.push(ln);
    };
    const hasLabels = lines.some((l) => VS.labelOf(l.text));
    const hasRefs = lines.some((l) => VS.refLike(l.text));

    for (const ln of lines) {
      if (VS.refLike(ln.text)) { newVerse(ln.text.trim()); continue; }
      const lab = VS.labelOf(ln.text);
      if (lab) {
        if (!cur) {
          newVerse('');
          if (opts.keepPreamble || !hasRefs) pre.splice(0).forEach(put);
        }
        sec = lab;
        continue;
      }
      if (!cur) { pre.push(ln); continue; }
      put(ln);
    }

    if (!verses.length) {
      // No structure at all: an ordinary article → one "verse" whose body is the purport.
      if (!pre.length) return [];
      if (!hasLabels && pre.every((l) => !VS.hasIndic(l.text)) && pre.length > 3) {
        return [VS.finishVerse({ ref: '', script: [], translit: [], synonyms: [], translation: [], purport: pre })];
      }
      newVerse('');
      pre.forEach(put);
    }
    return verses.map(VS.finishVerse).filter(VS.hasContent);
  };

  VS.parseText = (text, opts) => VS.parseLines(
    String(text).replace(/\r/g, '').split('\n').map((t) => t.trim()).filter(Boolean).map((t) => ({ text: t, html: esc(t) })),
    { keepPreamble: true, ...opts },
  );

  VS.finishVerse = (v) => ({
    ref: String(v.ref || '').replace(/\s+/g, ' ').trim(),
    script: v.script.map((l) => l.text).join('\n'),
    translit: v.translit.map((l) => l.text).join('\n'),
    synonyms: v.synonyms.map((l) => l.text).join(' ').trim(),
    translation: v.translation.map((l) => l.html).filter(Boolean),
    purport: v.purport.map((l) => l.html).filter(Boolean),
  });
  VS.hasContent = (v) => !!(v && (v.script || v.translit || v.synonyms || (v.translation && v.translation.length) || (v.purport && v.purport.length)));

  /** "word — meaning; word — meaning" → [{w, m}] */
  VS.parseSynonyms = (s) => {
    const text = String(s || '').trim();
    if (!text) return [];
    const parts = [];
    let depth = 0, buf = '';
    for (const ch of text) {
      if (ch === '(' || ch === '[') depth++;
      if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
      if (ch === ';' && depth === 0) { parts.push(buf); buf = ''; } else buf += ch;
    }
    parts.push(buf);
    return parts.map((p) => p.trim()).filter(Boolean).map((p) => {
      const m = p.match(/^(.+?)\s+[—–―-]{1,2}\s+(.+)$/s) || p.match(/^(.+?)\s*[—–―]\s*(.+)$/s);
      return m ? { w: m[1].trim(), m: m[2].trim().replace(/\.$/, '') } : { w: '', m: p.replace(/\.$/, '') };
    });
  };

  VS.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  VS.SAMPLE = {
    title: 'Śrīmad-Bhāgavatam 8.1.2 (sample)',
    source: '',
    verses: [{
      ref: 'ŚB 8.1.2',
      script: 'मन्वन्तरे हरेर्जन्म कर्माणि च महीयस: ।\nगृणन्ति कवयो ब्रह्मंस्तानि नो वद श‍ृण्वताम् ॥ २ ॥',
      translit: 'manvantare harer janma\nkarmāṇi ca mahīyasaḥ\ngṛṇanti kavayo brahmaṁs\ntāni no vada śṛṇvatām',
      synonyms: 'manvantare — during the change of manvantaras (one Manu following another); hareḥ — of the Supreme Personality of Godhead; janma — appearance; karmāṇi — and activities; ca — also; mahīyasaḥ — of the supremely glorified; gṛṇanti — describe; kavayaḥ — the great learned persons who have perfect intelligence; brahman — O learned brāhmaṇa (Śukadeva Gosvāmī); tāni — all of them; naḥ — to us; vada — please describe; śṛṇvatām — who are very eager to hear.',
      translation: ['O learned brāhmaṇa, Śukadeva Gosvāmī, the great learned persons who are completely intelligent describe the activities and appearance of the Supreme Personality of Godhead during the various manvantaras. We are very eager to hear about these narrations. Kindly describe them.'],
      purport: [
        'The Supreme Personality of Godhead has different varieties of incarnations, including the <em>guṇa-avatāras, manvantara-avatāras, līlā-avatāras</em> and <em>yuga-avatāras,</em> all of which are described in the <em>śāstras.</em> Without reference to the <em>śāstras</em> there can be no question of accepting anyone as an incarnation of the Supreme Personality of Godhead. Therefore, as especially mentioned here, <em>gṛṇanti kavayaḥ:</em> the descriptions of various incarnations are accepted by great learned scholars with perfect intelligence. At the present time, especially in India, so many rascals are claiming to be incarnations, and people are being misled. Therefore, the identity of an incarnation should be confirmed by the descriptions of the <em>śāstras</em> and by wonderful activities. As described in this verse by the word <em>mahīyasaḥ,</em> the activities of an incarnation are not ordinary magic or jugglery, but are wonderful activities. Thus any incarnation of the Supreme Personality of Godhead must be supported by the statements of the <em>śāstra</em> and must actually perform wonderful activities. Parīkṣit Mahārāja was eager to hear about the Manus of different ages. There are fourteen Manus during a day of Brahmā, and the age of each Manu lasts for seventy-one <em>yugas.</em> Thus there are thousands of Manus during the life of Brahmā.',
      ],
    }],
  };

  self.VS = VS;
})();
