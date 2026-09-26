/* Śloka Slides — toolbar popup */
(async function () {
  const VS = self.VS;
  const $ = (s) => document.querySelector(s);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const send = (msg) => chrome.runtime.sendMessage({ ...msg, tabId: tab && tab.id });
  const slidesUrl = (hash) => chrome.runtime.getURL(`slides/slides.html${hash || ''}`);

  function showError(msg) {
    const e = $('#err');
    e.textContent = msg;
    e.hidden = !msg;
  }
  async function runAndClose(msg, btn) {
    showError('');
    const old = btn.innerHTML;
    btn.disabled = true;
    const r = await send(msg).catch((e) => ({ error: String(e) }));
    btn.disabled = false;
    btn.innerHTML = old;
    if (r && r.error) { showError(r.error); return false; }
    return r;
  }

  /* ---------- probe the page ---------- */
  let probe = null;
  if (tab && /^https?:|^file:/.test(tab.url || '')) {
    probe = await send({ cmd: 'probe' }).catch(() => null);
  }
  if (!probe || probe.error) {
    $('#status').textContent = 'This page can’t be read — try “Paste text”.';
    $('#present').disabled = true;
    $('#collect').disabled = true;
    $('#map').disabled = true;
  } else {
    const n = probe.count;
    const via = probe.profile ? probe.profile.name : 'smart detection';
    $('#status').textContent = n
      ? `${n} verse${n === 1 ? '' : 's'} found ${probe.hasSelection ? 'in selection ' : ''}· ${via}`
      : `No verses detected yet · ${via}`;
    $('#status').title = $('#status').textContent;
    if (probe.hasSelection) {
      $('#presentLabel').textContent = 'Present selection';
      $('#collect b').textContent = '＋ Add selection';
    }
    if (probe.links > 0) {
      $('#links').disabled = false;
      $('#links small').textContent = `Fetch ${probe.links} linked page${probe.links === 1 ? '' : 's'} as one deck`;
    }
    $('#mapSub').textContent = probe.profile && !probe.profile.builtin ? `Edit mapping for ${probe.host}` : `Teach it this site’s layout`;
  }

  /* ---------- actions ---------- */
  $('#present').onclick = async (e) => { if (await runAndClose({ cmd: 'present', scope: 'auto' }, e.currentTarget)) window.close(); };
  $('#links').onclick = async (e) => {
    $('#links small').textContent = 'Fetching pages…';
    if (await runAndClose({ cmd: 'present', scope: 'links' }, e.currentTarget)) window.close();
  };
  $('#collect').onclick = async (e) => {
    const r = await runAndClose({ cmd: 'collect', scope: 'auto' }, e.currentTarget);
    if (r) renderCollection();
  };
  $('#presentCol').onclick = async (e) => { if (await runAndClose({ cmd: 'presentCollection' }, e.currentTarget)) window.close(); };
  $('#clear').onclick = async () => { await send({ cmd: 'clearCollection' }); renderCollection(); };
  $('#map').onclick = async (e) => { if (await runAndClose({ cmd: 'pick' }, e.currentTarget)) window.close(); };
  $('#paste').onclick = () => { chrome.tabs.create({ url: slidesUrl('#paste') }); window.close(); };
  $('#demo').onclick = () => { chrome.tabs.create({ url: slidesUrl('') }); window.close(); };
  $('#settings').onclick = () => { chrome.runtime.openOptionsPage(); window.close(); };
  $('#shortcuts').onclick = () => { chrome.tabs.create({ url: 'chrome://extensions/shortcuts' }); window.close(); };

  /* ---------- collection ---------- */
  async function renderCollection() {
    const col = (await VS.store.get('local', 'collection')) || { items: [] };
    const sec = $('#collection');
    sec.hidden = !col.items.length;
    const total = col.items.reduce((n, i) => n + i.verses.length, 0);
    $('#colCount').textContent = `${total} verse${total === 1 ? '' : 's'}`;
    const list = $('#colList');
    list.replaceChildren();
    col.items.forEach((it, i) => {
      const li = document.createElement('li');
      const span = document.createElement('span');
      const refs = it.verses.map((v) => v.ref).filter(Boolean);
      span.textContent = refs.length ? (refs.length > 1 ? `${refs[0]} – ${refs[refs.length - 1]}` : refs[0]) : it.title;
      span.title = it.title;
      const em = document.createElement('em');
      em.textContent = String(it.verses.length);
      const up = document.createElement('button');
      up.textContent = '↑';
      up.title = 'Move up';
      up.disabled = i === 0;
      up.onclick = async () => { [col.items[i - 1], col.items[i]] = [col.items[i], col.items[i - 1]]; await VS.store.set('local', 'collection', col); renderCollection(); };
      const rm = document.createElement('button');
      rm.textContent = '✕';
      rm.title = 'Remove';
      rm.onclick = async () => { col.items.splice(i, 1); await VS.store.set('local', 'collection', col); renderCollection(); };
      li.append(span, em, up, rm);
      list.appendChild(li);
    });
  }

  async function renderRecent() {
    const idx = ((await VS.store.get('local', 'deckIndex')) || []).slice(0, 5);
    $('#recent').hidden = !idx.length;
    const ul = $('#recentList');
    ul.replaceChildren();
    for (const d of idx) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.textContent = d.title;
      span.title = d.title;
      const em = document.createElement('em');
      em.textContent = `${d.count} · ${new Date(d.created).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
      li.append(span, em);
      li.onclick = () => { chrome.tabs.create({ url: slidesUrl(`#deck=${encodeURIComponent(d.id)}`) }); window.close(); };
      ul.appendChild(li);
    }
  }

  renderCollection();
  renderRecent();
})();
