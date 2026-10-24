// NEW PLAYER TEST mode (user, 2026-10-24): play as a brand-new player on your own phone without touching
// your real game. A plain script (not a module) loaded BEFORE everything else, so the game never notices:
//   ?newplayer=1      turn it on (remembered on this device until ?newplayer=off)
//   ?newplayer=reset  wipe the test player only, and start again from zero (stays on)
//   ?newplayer=off    back to your real game, exactly as you left it
// While on: every localStorage key the game uses (save, pilot, outbox, sync, updates, previews, sign-in) is
// stored under a separate 'np:' prefix, and nothing goes to the online server (no uploads, no boards).
(function () {
  const real = window.localStorage, FLAG = 'contrailPilot.newplayerMode', P = 'np:';
  const q = new URLSearchParams(location.search).get('newplayer');
  try {
    if (q === 'off') real.removeItem(FLAG);
    if (q === '1' || q === 'on' || q === 'reset') real.setItem(FLAG, '1');
    if (real.getItem(FLAG) !== '1') return;
  } catch (e) { return; }   // no storage at all (private mode): nothing to protect
  const mine = () => { const ks = []; for (let i = 0; i < real.length; i++) { const k = real.key(i); if (k && k.startsWith(P)) ks.push(k); } return ks; };
  if (q === 'reset') mine().forEach(k => real.removeItem(k));
  const store = {
    getItem: k => real.getItem(P + k),
    setItem: (k, v) => real.setItem(P + k, String(v)),
    removeItem: k => real.removeItem(P + k),
    clear: () => mine().forEach(k => real.removeItem(k)),
    key: i => { const k = mine()[i]; return k ? k.slice(P.length) : null; },
    get length() { return mine().length; },
  };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => store });
  // Offline to the world: the online server is unreachable (the game treats it as no internet).
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, ...a) => (/supabase\.co/.test(String((u && u.url) || u)) ? Promise.reject(new TypeError('new player test: offline')) : realFetch(u, ...a));
  window.NEWPLAYER_TEST = true;
  window.__CP_NO_ONLINE = true;   // src/online.js (bug-fix chat): sending, syncing and the online listeners do nothing
  const tag = () => {
    const d = document.createElement('div');
    d.id = 'npTag';
    d.innerHTML = 'NEW PLAYER TEST <a href="?newplayer=reset">reset</a> <a href="?newplayer=off">exit</a>';
    d.style.cssText = 'position:fixed;left:4px;top:4px;z-index:99;background:#c0392b;color:#fff;font:8px Pixel,monospace;padding:3px 5px;border-radius:3px;pointer-events:auto';
    d.querySelectorAll('a').forEach(a => { a.style.color = '#ffe15a'; a.style.marginLeft = '4px'; });
    document.body.appendChild(d);
  };
  if (document.body) tag(); else document.addEventListener('DOMContentLoaded', tag);
})();
