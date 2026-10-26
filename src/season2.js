// SEASON 2 PREVIEW (the redesign, coordinator plan 2026-10-26): areas, crossings, the start choice, chapter 1.
// Built behind this switch so the live game is untouched until the restart release. A plain script (not a
// module) loaded BEFORE everything else, like src/newplayer.js:
//   ?season2=1      turn it on (remembered on this device until ?season2=off)
//   ?season2=reset  wipe the season 2 player only, and start again from zero (stays on)
//   ?season2=off    back to your real game, exactly as you left it
// The /preview/ build (bug-fix chat's deploy) injects window.SEASON2_FORCE = true before this script: season 2 is
// then always on, ?season2=off is ignored, and the mode flag is NEVER written (localStorage is per origin, not per
// path: a written flag would boot the LIVE game into season 2 for anyone who had opened /preview/). 'reset' still
// wipes the s2: keys only; there is no 'exit' link.
// While on: every localStorage key the game uses is stored under a separate 's2:' prefix, nothing goes to the
// online server, and window.SEASON2 is true (src/config.js FEATURES.season2).
(function () {
  const real = window.localStorage, FLAG = 'contrailPilot.season2Mode', P = 's2:';
  const q = new URLSearchParams(location.search).get('season2');
  const FORCE = window.SEASON2_FORCE === true;
  if (!FORCE) try {
    if (q === 'off') real.removeItem(FLAG);
    if (q === '1' || q === 'on' || q === 'reset') real.setItem(FLAG, '1');
    if (real.getItem(FLAG) !== '1') return;
  } catch (e) { return; }
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
  const realFetch = window.fetch.bind(window);
  window.fetch = (u, ...a) => (/supabase\.co/.test(String((u && u.url) || u)) ? Promise.reject(new TypeError('season 2 preview: offline')) : realFetch(u, ...a));
  window.SEASON2 = true;
  window.__CP_NO_ONLINE = true;
  const tag = () => {
    const d = document.createElement('div');
    d.id = 's2Tag';
    d.innerHTML = FORCE ? 'SEASON 2 <a href="?season2=reset">reset</a>' : 'SEASON 2 <a href="?season2=reset">reset</a> <a href="?season2=off">exit</a>';
    d.style.cssText = 'position:fixed;right:4px;top:4px;z-index:99;background:#1f6f8b;color:#fff;font:8px Pixel,monospace;padding:3px 5px;border-radius:3px;pointer-events:auto';
    d.querySelectorAll('a').forEach(a => { a.style.color = '#ffe15a'; a.style.marginLeft = '4px'; });
    document.body.appendChild(d);
  };
  if (document.body) tag(); else document.addEventListener('DOMContentLoaded', tag);
})();
