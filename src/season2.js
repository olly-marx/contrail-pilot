// SEASON 2 (the redesign, ON FOR EVERYONE since 0.12.0 via index.html; coordinator plan 2026-10-26): areas, crossings, the start choice, chapter 1.
// Built behind this switch so the live game is untouched until the restart release. A plain script (not a
// module) loaded BEFORE everything else, like src/newplayer.js:
//   ?season2=1      turn it on (remembered on this device until ?season2=off)
//   ?season2=reset  wipe the season 2 player only, and start again from zero (stays on)
//   ?season2=off    back to your real game, exactly as you left it
// index.html sets window.SEASON2_FORCE = true before this script (only a test sets it false first, tests/lib/classic.js): season 2 is
// then always on, ?season2=off is ignored, and the mode flag is NEVER written (localStorage is per origin, not per
// path). The old game's save is never touched: it stays under its own keys. 'reset' still
// wipes the s2: keys only; there is no 'exit' link.
// While on: every localStorage key the game uses is stored under a separate 's2:' prefix, nothing goes to the
// online server, and window.SEASON2 is true (src/config.js FEATURES.season2).
(function () {
  const real = window.localStorage, FLAG = 'contrailPilot.season2Mode', P = 's2:';
  const q = new URLSearchParams(location.search).get('season2');
  // ?preview=1 (the user, 2026-10-28): play the WHOLE onboarding as a brand-new player and save NOTHING. The game gets an
  // in-memory store, fresh on every load; the real localStorage (the s2: keys, the real save) is never read or written.
  const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
  window.CP_PREVIEW = PREVIEW;
  const FORCE = window.SEASON2_FORCE === true;
  if (!FORCE && !PREVIEW) try {
    if (q === 'off') real.removeItem(FLAG);
    if (q === '1' || q === 'on' || q === 'reset') real.setItem(FLAG, '1');
    if (real.getItem(FLAG) !== '1') return;
  } catch (e) { return; }
  const mine = () => { const ks = []; for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k && k.startsWith(P)) ks.push(k); } return ks; };
  if (q === 'reset' && !PREVIEW) {
    // 0.15.3: in the SHIPPED game (FORCE) this URL does nothing to the save: a saved home-screen icon or bookmark that still carries
    // ?season2=reset (made while the link existed) would wipe a player's progress on EVERY open. The preview mode (testers) still wipes, once.
    if (!FORCE) mine().forEach(k => real.removeItem(k));
    // The wipe happens once: the URL used to stay ?season2=reset, so every later reload, a reopened tab and the self-update reload wiped the
    // new save again (a real player lost her progress twice). The parameter is stripped either way; other parameters are kept.
    try { const u = new URL(location.href); u.searchParams.delete('season2'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (e) { /* keep going */ }
  }
  const mem = new Map();   // the preview's store: nothing outlives the page
  const store = PREVIEW ? {
    getItem: k => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: k => { mem.delete(k); },
    clear: () => mem.clear(),
    key: i => [...mem.keys()][i] ?? null,
    get length() { return mem.size; },
  } : {
    getItem: k => real.getItem(P + k),
    setItem: (k, v) => real.setItem(P + k, String(v)),
    removeItem: k => real.removeItem(P + k),
    clear: () => mine().forEach(k => real.removeItem(k)),
    key: i => { const k = mine()[i]; return k ? k.slice(P.length) : null; },
    get length() { return mine().length; },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => store });
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, ...a) => (/supabase\.co/.test(String((u && u.url) || u)) ? Promise.reject(new TypeError('season 2 preview: offline')) : realFetch(u, ...a));
  window.SEASON2 = true;
  window.__CP_NO_ONLINE = true;
  const tag = () => {
    const d = document.createElement('div');
    d.id = 's2Tag';
    d.innerHTML = 'SEASON 2 <a href="?season2=reset">reset</a> <a href="?season2=off">exit</a>';   // (preview mode only: see below)
    d.style.cssText = 'position:fixed;right:4px;top:4px;z-index:99;background:#1f6f8b;color:#fff;font:8px Pixel,monospace;padding:3px 5px;border-radius:3px;pointer-events:auto';
    d.querySelectorAll('a').forEach(a => { a.style.color = '#ffe15a'; a.style.marginLeft = '4px'; });
    document.body.appendChild(d);
  };
  // 0.15.3: players never see this tag: its reset link (a 40x8 px tap, no question) wiped a real player's save, twice. It exists only in the preview mode (FORCE unset = tests/testers); ?season2=reset stays as a tester URL.
  if (!FORCE && !PREVIEW) { if (document.body) tag(); else document.addEventListener('DOMContentLoaded', tag); }
  // The preview's tag: always visible, with the pilot name once chosen (local only).
  const ptag = () => {
    const d = document.createElement('div'); d.id = 'previewTag';
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);top:2px;z-index:99;background:#b8325c;color:#fff;font:8px Pixel,monospace;padding:3px 6px;border-radius:3px;pointer-events:none;white-space:nowrap';
    const show = () => { let p = null; try { p = JSON.parse(store.getItem('contrailPilot.pilot')); } catch (e) { /* none yet */ } d.textContent = `PREVIEW: nothing is saved${p && p.first ? ` \u00b7 Pilot: ${p.first} ${p.word || ''}` : ''}`; };
    show(); setInterval(show, 1000); document.body.appendChild(d);
  };
  if (PREVIEW) { if (document.body) ptag(); else document.addEventListener('DOMContentLoaded', ptag); }
})();
