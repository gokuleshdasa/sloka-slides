/* Śloka Slides — service worker: routes commands, stores decks, opens the slideshow. */
importScripts('common.js');

const MAX_DECKS = 15;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    const add = (id, title, contexts) => chrome.contextMenus.create({ id, title, contexts });
    add('present-sel', 'Present selection as slides', ['selection']);
    add('collect-sel', 'Add selection to slide collection', ['selection']);
    add('links-sel', 'Present all linked pages in selection', ['selection']);
    add('present-page', 'Present this page as slides', ['page']);
    add('collect-page', 'Add this page to slide collection', ['page']);
    add('map-site', 'Map this site’s layout…', ['page']);
  });
  refreshBadge();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const map = {
    'present-sel': ['present', 'selection'],
    'collect-sel': ['collect', 'selection'],
    'links-sel': ['present', 'links'],
    'present-page': ['present', 'page'],
    'collect-page': ['collect', 'page'],
    'map-site': ['pick'],
  };
  const [cmd, scope] = map[info.menuItemId] || [];
  if (cmd) run({ cmd, scope, tabId: tab.id }).then((r) => r && r.error && notify(tab.id, r.error));
});

chrome.commands.onCommand.addListener(async (command, tab) => {
  tab = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
  if (!tab) return;
  const r = await run({ cmd: command === 'collect' ? 'collect' : 'present', scope: 'auto', tabId: tab.id });
  if (r && r.error) notify(tab.id, r.error);
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || !msg.cmd) return;
  if (msg.cmd === 'openDeck') { openDeck(msg.deck).then(reply); return true; }
  run({ ...msg, tabId: msg.tabId || (sender.tab && sender.tab.id) }).then(reply, (e) => reply({ error: String(e && e.message || e) }));
  return true;
});

async function notify(tabId, text) {
  try { await chrome.tabs.sendMessage(tabId, { type: 'toast', text, ms: 3500 }); } catch { /* restricted page */ }
}

async function ensureContent(tabId) {
  try {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'ping' });
    if (r && r.ok) return true;
  } catch { /* not injected yet */ }
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ['src/common.js', 'src/content.js'] });
    return true;
  } catch (e) {
    return false;
  }
}

const RESTRICTED = 'This page can’t be read by extensions (browser pages, the Web Store and some PDFs). Use “Paste text” instead.';

async function run({ cmd, scope, tabId }) {
  if (cmd === 'probe' || cmd === 'present' || cmd === 'collect' || cmd === 'pick') {
    if (!(await ensureContent(tabId))) return { error: RESTRICTED };
  }
  if (cmd === 'probe') return chrome.tabs.sendMessage(tabId, { type: 'probe' });
  if (cmd === 'pick') return chrome.tabs.sendMessage(tabId, { type: 'pick' });
  if (cmd === 'present' || cmd === 'collect') {
    const r = await chrome.tabs.sendMessage(tabId, { type: 'extract', scope });
    if (!r || r.error) return r || { error: 'Nothing found.' };
    if (!r.verses.length) return { error: 'No verses were detected here. Try selecting the text first, or map this site’s layout.' };
    if (cmd === 'present') return openDeck({ title: r.title, source: r.url, method: r.method, verses: r.verses });
    const col = await getCollection();
    col.items.push({ id: VS.uid(), title: r.title, url: r.url, verses: r.verses, added: Date.now() });
    await setCollection(col);
    notify(tabId, `Added ${r.verses.length} verse${r.verses.length === 1 ? '' : 's'} · collection now has ${countVerses(col)}`);
    return { ok: true, added: r.verses.length, total: countVerses(col) };
  }
  if (cmd === 'presentCollection') {
    const col = await getCollection();
    const verses = col.items.flatMap((i) => i.verses);
    if (!verses.length) return { error: 'The collection is empty.' };
    const title = col.items.length === 1 ? col.items[0].title : `${col.items.length} pages · ${verses.length} verses`;
    return openDeck({ title, source: '', method: 'Collection', verses });
  }
  if (cmd === 'clearCollection') { await setCollection({ items: [] }); return { ok: true }; }
  if (cmd === 'openRecent') return openTab(msg_deckUrl(scope));
  return { error: `Unknown command ${cmd}` };
}

const msg_deckUrl = (id) => chrome.runtime.getURL(`slides/slides.html#deck=${encodeURIComponent(id)}`);

async function openDeck(deck) {
  const id = VS.uid();
  const index = (await VS.store.get('local', 'deckIndex')) || [];
  const entry = { id, title: deck.title || 'Untitled', count: deck.verses.length, created: Date.now(), source: deck.source || '' };
  index.unshift(entry);
  const drop = index.splice(MAX_DECKS);
  await chrome.storage.local.set({ [`deck:${id}`]: { ...deck, id, created: entry.created }, deckIndex: index });
  if (drop.length) await chrome.storage.local.remove(drop.map((d) => `deck:${d.id}`));
  await openTab(msg_deckUrl(id));
  return { ok: true, id };
}

async function openTab(url) {
  const s = await VS.loadSettings();
  if (s.openIn === 'window') {
    const w = await chrome.windows.create({ url, type: 'popup', state: 'maximized' });
    return { ok: true, windowId: w.id };
  }
  await chrome.tabs.create({ url });
  return { ok: true };
}

async function getCollection() { return (await VS.store.get('local', 'collection')) || { items: [] }; }
async function setCollection(c) { await VS.store.set('local', 'collection', c); refreshBadge(c); }
const countVerses = (c) => c.items.reduce((n, i) => n + i.verses.length, 0);

async function refreshBadge(c) {
  c = c || (await getCollection());
  const n = countVerses(c);
  chrome.action.setBadgeBackgroundColor({ color: '#d9661e' });
  chrome.action.setBadgeText({ text: n ? String(n) : '' });
}
chrome.storage.onChanged.addListener((ch, area) => { if (area === 'local' && ch.collection) refreshBadge(ch.collection.newValue || { items: [] }); });
