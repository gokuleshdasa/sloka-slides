/* Śloka Slides — settings page */
(async function () {
  const VS = self.VS;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let s = await VS.loadSettings();
  let profiles = await VS.loadProfiles();

  /* ---------- saving ---------- */
  let t = 0;
  function save() {
    clearTimeout(t);
    t = setTimeout(async () => {
      await VS.saveSettings(s);
      const el = $('#saved');
      el.textContent = 'Saved ✓';
      el.classList.add('flash');
      setTimeout(() => { el.textContent = 'All changes save automatically'; el.classList.remove('flash'); }, 1200);
    }, 200);
  }
  let pt = 0;
  const saveProfiles = () => { clearTimeout(pt); pt = setTimeout(() => VS.saveProfiles(profiles), 300); };

  /* ---------- generic bindings ---------- */
  const fill = (sel, list) => { for (const f of list) { const o = document.createElement('option'); o.value = f.id; o.textContent = f.label; $(sel).appendChild(o); } };
  fill('#fBody', VS.FONTS.body);
  fill('#fScript', VS.FONTS.script);
  fill('#fHead', VS.FONTS.head);

  const fmt = (k, v) => {
    if (k === 'fontSize') return `${v}px`;
    if (k === 'contentWidth') return `${v}%`;
    if (k === 'autoSeconds') return `${v}s`;
    if (k === 'progressHeight') return `${v}px`;
    if (k === 'letterSpacing' || k === 'wordSpacing') return `${(+v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}em`;
    if (k.startsWith('scale.')) return `${Math.round(v * 100)}%`;
    return String(+(+v).toFixed(2));
  };

  function bind() {
    $$('[data-k]').forEach((c) => {
      const k = c.dataset.k;
      if (c.classList.contains('seg') || c.classList.contains('choice')) {
        c.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { VS.setPath(s, k, b.value); save(); sync(); }));
      } else if (c.type === 'checkbox') c.addEventListener('change', () => { VS.setPath(s, k, c.checked); save(); });
      else if (c.type === 'range') c.addEventListener('input', () => { VS.setPath(s, k, parseFloat(c.value)); save(); sync(); });
      else c.addEventListener('change', () => { VS.setPath(s, k, c.value); save(); });
    });
  }
  function sync() {
    $$('[data-k]').forEach((c) => {
      const v = VS.getPath(s, c.dataset.k);
      if (c.classList.contains('seg') || c.classList.contains('choice')) c.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.value === String(v)));
      else if (c.type === 'checkbox') c.checked = !!v;
      else if (c.type === 'range') {
        if (document.activeElement !== c) c.value = v;
        const o = c.closest('.field').querySelector('output');
        if (o) o.textContent = fmt(c.dataset.k, v);
      } else c.value = v;
    });
    renderThemes();
    renderOrder();
  }

  /* ---------- themes ---------- */
  function themeCard(key, th, which) {
    const b = document.createElement('button');
    b.className = 'theme';
    b.dataset.key = key;
    const sw = document.createElement('span');
    sw.className = 'sw';
    sw.style.background = th.bg;
    sw.innerHTML = '<i></i><i></i><i></i><i></i>';
    const [a, l1, l2, l3] = sw.children;
    a.style.background = th.accent;
    l1.style.background = th.fg; l1.style.opacity = '.75';
    l2.style.background = th.fg; l2.style.opacity = '.5'; l2.style.width = '85%';
    l3.style.background = th.accent2 || th.accent; l3.style.opacity = '.6'; l3.style.width = '60%';
    const nm = document.createElement('span');
    nm.className = 'nm';
    nm.textContent = th.name;
    b.append(sw, nm);
    b.classList.toggle('on', s[which] === key);
    b.onclick = () => { s[which] = key; if (s.mode !== 'auto') s.mode = which === 'darkTheme' ? 'dark' : 'light'; save(); sync(); };
    return b;
  }
  function renderThemes() {
    const L = $('#lightThemes'), D = $('#darkThemes');
    L.replaceChildren(); D.replaceChildren();
    for (const [k, th] of Object.entries(VS.THEMES)) (th.dark ? D : L).appendChild(themeCard(k, th, th.dark ? 'darkTheme' : 'lightTheme'));
    if (s.customTheme) {
      const c = { name: 'Custom', ...s.customTheme };
      (c.dark ? D : L).appendChild(themeCard('custom', c, c.dark ? 'darkTheme' : 'lightTheme'));
    }
  }
  const baseCustom = () => s.customTheme || { ...VS.THEMES.midnight, name: undefined };
  function syncCustom() {
    const c = baseCustom();
    $$('[data-c]').forEach((i) => { if (i.type === 'checkbox') i.checked = !!c.dark; else i.value = c[i.dataset.c] || '#000000'; });
  }
  $$('[data-c]').forEach((i) => i.addEventListener('input', () => {
    const c = { ...baseCustom() };
    delete c.name;
    c[i.dataset.c] = i.type === 'checkbox' ? i.checked : i.value;
    s.customTheme = c;
    save();
    renderThemes();
  }));
  $('#useCustomLight').onclick = () => { s.customTheme = { ...baseCustom(), dark: false }; delete s.customTheme.name; s.lightTheme = 'custom'; s.mode = 'light'; save(); sync(); syncCustom(); };
  $('#useCustomDark').onclick = () => { s.customTheme = { ...baseCustom(), dark: true }; delete s.customTheme.name; s.darkTheme = 'custom'; s.mode = 'dark'; save(); sync(); syncCustom(); };

  /* ---------- section order ---------- */
  const NAMES = { script: 'Devanāgarī / Bengali', translit: 'Transliteration', synonyms: 'Word-for-word (synonyms)', translation: 'Translation', purport: 'Purport' };
  let dragKey = null;
  function renderOrder() {
    const ol = $('#order');
    ol.replaceChildren();
    s.order.forEach((k, i) => {
      const li = document.createElement('li');
      li.draggable = true;
      li.dataset.k = k;
      li.classList.toggle('off', !s.show[k]);
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!s.show[k];
      cb.title = 'Show this section';
      cb.onchange = () => { s.show[k] = cb.checked; save(); renderOrder(); };
      const h = document.createElement('span'); h.className = 'h'; h.textContent = '⋮⋮';
      h.style.flex = 'none';
      const nm = document.createElement('span'); nm.textContent = NAMES[k];
      const up = document.createElement('button'); up.textContent = '↑'; up.disabled = i === 0;
      const dn = document.createElement('button'); dn.textContent = '↓'; dn.disabled = i === s.order.length - 1;
      up.onclick = () => move(i, i - 1);
      dn.onclick = () => move(i, i + 1);
      li.append(h, cb, nm, up, dn);
      li.addEventListener('dragstart', () => { dragKey = k; li.classList.add('drag'); });
      li.addEventListener('dragend', () => { li.classList.remove('drag'); dragKey = null; });
      li.addEventListener('dragover', (e) => e.preventDefault());
      li.addEventListener('drop', (e) => { e.preventDefault(); if (dragKey && dragKey !== k) move(s.order.indexOf(dragKey), i); });
      ol.appendChild(li);
    });
  }
  function move(a, b) {
    const [x] = s.order.splice(a, 1);
    s.order.splice(b, 0, x);
    save();
    renderOrder();
  }

  /* ---------- site profiles ---------- */
  function renderProfiles() {
    const box = $('#profiles');
    box.replaceChildren();
    const all = profiles.concat(VS.BUILTIN_PROFILES.map((p) => ({ ...p })));
    if (!all.length) box.textContent = 'No mappings yet.';
    all.forEach((p) => {
      const node = $('#profileTpl').content.firstElementChild.cloneNode(true);
      $('.p-name', node).textContent = p.name || p.host || 'Untitled';
      $('.p-host', node).textContent = `${p.host || '—'}${p.path && p.path !== '*' ? ' · ' + p.path : ''}`;
      $('.p-badge', node).textContent = p.builtin ? 'built-in' : `${Object.values(p.fields || {}).filter(Boolean).length} fields`;
      const fieldsBox = $('.p-fields', node);
      for (const f of VS.FIELDS) {
        const l = document.createElement('label');
        const sp = document.createElement('span');
        const dot = document.createElement('i'); dot.style.background = f.color;
        sp.append(dot, f.label);
        const inp = document.createElement('input');
        inp.dataset.f = f.key;
        inp.placeholder = 'CSS selector';
        inp.spellcheck = false;
        inp.value = (p.fields || {})[f.key] || '';
        l.append(sp, inp);
        fieldsBox.appendChild(l);
      }
      $$('[data-p]', node).forEach((i) => {
        const k = i.dataset.p;
        if (i.type === 'checkbox') i.checked = p.enabled !== false; else i.value = p[k] || '';
      });
      if (p.builtin) {
        $$('input', node).forEach((i) => { if (i.dataset.p !== 'enabled') i.disabled = true; });
        $('.del', node).remove();
        const cb = $('[data-p="enabled"]', node);
        cb.checked = !(s.disabledBuiltins || []).includes(p.id);
        cb.onchange = () => {
          const set = new Set(s.disabledBuiltins || []);
          if (cb.checked) set.delete(p.id); else set.add(p.id);
          s.disabledBuiltins = [...set];
          save();
        };
        $('.dup', node).textContent = 'Copy & customise';
      } else {
        $$('[data-p]', node).forEach((i) => i.addEventListener(i.type === 'checkbox' ? 'change' : 'input', () => {
          p[i.dataset.p] = i.type === 'checkbox' ? i.checked : i.value.trim();
          $('.p-name', node).textContent = p.name || p.host || 'Untitled';
          saveProfiles();
        }));
        $$('[data-f]', node).forEach((i) => i.addEventListener('input', () => { p.fields = p.fields || {}; p.fields[i.dataset.f] = i.value.trim(); saveProfiles(); }));
        $('.del', node).onclick = () => { if (confirm(`Delete the mapping “${p.name || p.host}”?`)) { profiles = profiles.filter((x) => x !== p); saveProfiles(); renderProfiles(); } };
      }
      $('.dup', node).onclick = () => {
        const c = JSON.parse(JSON.stringify(p));
        c.id = VS.uid(); delete c.builtin; c.name = `${(p.name || p.host).replace(/ \(built-in\)$/, '')} (my copy)`; c.enabled = true;
        profiles.unshift(c); saveProfiles(); renderProfiles();
        $('#profiles details').open = true;
      };
      box.appendChild(node);
    });
  }
  $('#addProfile').onclick = () => {
    profiles.unshift({ id: VS.uid(), name: 'New mapping', host: '', path: '*', container: '', fields: {}, enabled: true });
    saveProfiles();
    renderProfiles();
    $('#profiles details').open = true;
  };

  /* ---------- decks ---------- */
  async function renderDecks() {
    const idx = (await VS.store.get('local', 'deckIndex')) || [];
    const ul = $('#deckList');
    ul.replaceChildren();
    if (!idx.length) { const li = document.createElement('li'); li.textContent = 'No slideshows yet.'; li.style.color = 'var(--muted)'; ul.appendChild(li); }
    for (const d of idx) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = `../slides/slides.html#deck=${encodeURIComponent(d.id)}`;
      a.target = '_blank';
      a.textContent = d.title;
      const sm = document.createElement('small');
      sm.textContent = `${d.count} verse${d.count === 1 ? '' : 's'} · ${new Date(d.created).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Delete';
      rm.onclick = async () => {
        const list = ((await VS.store.get('local', 'deckIndex')) || []).filter((x) => x.id !== d.id);
        await VS.store.set('local', 'deckIndex', list);
        await VS.store.remove('local', `deck:${d.id}`);
        await VS.store.remove('local', `pos:${d.id}`);
        renderDecks();
      };
      li.append(a, sm, rm);
      ul.appendChild(li);
    }
  }
  $('#openPaste').onclick = () => window.open('../slides/slides.html#paste', '_blank');
  $('#openSample').onclick = () => window.open('../slides/slides.html', '_blank');
  $('#pvOpen').onclick = (e) => { e.preventDefault(); window.open('../slides/slides.html', '_blank'); };

  /* ---------- backup ---------- */
  $('#exportAll').onclick = () => {
    const data = JSON.stringify({ format: 'sloka-slides-settings', version: 1, settings: s, profiles }, null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    a.download = 'sloka-slides-settings.json';
    a.click();
  };
  $('#importAll').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.settings) { s = VS.merge(VS.DEFAULTS, d.settings); await VS.saveSettings(s); }
      if (Array.isArray(d.profiles)) {
        const ids = new Set(d.profiles.map((p) => p.id));
        profiles = d.profiles.concat(profiles.filter((p) => !ids.has(p.id)));
        await VS.saveProfiles(profiles);
      }
      sync(); syncCustom(); renderProfiles();
      alert('Imported.');
    } catch { alert('That file could not be read.'); }
    e.target.value = '';
  };
  $('#resetAll').onclick = async () => {
    if (!confirm('Reset every setting to its default? (Site mappings are kept.)')) return;
    s = VS.merge(VS.DEFAULTS, {});
    await VS.saveSettings(s);
    sync(); syncCustom();
  };

  /* ---------- preview scaling ---------- */
  const fitPreview = () => {
    const f = $('.pv-frame');
    if (!f) return;
    $('#pv').style.transform = `scale(${f.clientWidth / 1600})`;
  };
  new ResizeObserver(fitPreview).observe($('.pv-frame'));
  fitPreview();

  if (VS.hasChrome) chrome.storage.onChanged.addListener((ch, area) => {
    if (area === 'local' && ch.profiles) { profiles = ch.profiles.newValue || []; if (!document.activeElement || !document.activeElement.closest('#profiles')) renderProfiles(); }
    if (area === 'local' && ch.deckIndex) renderDecks();
  });

  bind();
  sync();
  syncCustom();
  renderProfiles();
  renderDecks();
})();
