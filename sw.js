// Contrail Pilot's service worker (0.25.0, user decision 2026-11-02: the game must start and play with no internet after one online visit).
// BUILD is the deploy's commit (tools/make-site.sh writes it in), so every deploy changes this file's bytes and the browser installs the new worker.
//   cp-<BUILD>   one cache per build: that build's code (index.html, style.css, vendor/, src/**) and its pictures.
//   cp-meta      two small entries: which build is current and which was before (kept for pages still running old code).
// Rules (src/swreg.js registers this only on a deployed, ?v-stamped page):
//   * index.html / navigation   network-first with a 3 s timeout (always the newest shell online; the cached one offline)
//   * version.json              NEVER cached (src/updates.js must see the real newest version)
//   * code (src/**, vendor/, style.css)   cache-first in the cache of the build named by its ?v= (else the current build); stored under the plain path
//   * pictures (assets/**)      cache-first in the CURRENT build's cache only, never revalidated (a tap makes no network request); freshness is kept at install:
//                               assets-manifest.json {file: sha1} is diffed against the previous build's, unchanged files are COPIED forward, changed ones are not
//                               (so a redrawn picture is fetched again, never served from an old cache)
//   * everything else (Supabase, other origins)   untouched
// The page sends {fill: [urls]} after it has loaded: the worker fetches what it does not have yet, so the next visit works offline.
const BUILD = '__BUILD__';
const CUR = 'cp-' + BUILD;
const META = 'cp-meta';
const NAV_TIMEOUT_MS = 3000;
const path = u => new URL(u, self.registration.scope).pathname.replace(new URL(self.registration.scope).pathname, '');   // 'src/x.js'
const isCode = p => p === '' || p === 'index.html' || p === 'style.css' || p === 'manifest.webmanifest' || p.startsWith('src/') || p.startsWith('vendor/');
const say = async msg => { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(msg); };

const meta = async (key, value) => {
  const c = await caches.open(META);
  if (value === undefined) { const r = await c.match('/' + key); return r ? r.text() : null; }
  await c.put('/' + key, new Response(value));
};
const manifestOf = async name => { if (!(await caches.has(name))) return null; const c = await caches.open(name); const r = await c.match('assets-manifest.json'); return r ? r.json() : null; };

self.addEventListener('install', e => e.waitUntil((async () => {
  // The kill switch also reaches a worker that is only now updating: version.json says "sw": false -> clear every cp-* cache, unregister, and fail the install (nothing is created).
  const ver = await fetch('version.json', { cache: 'no-store' }).then(r => r.json()).catch(() => ({}));
  if (ver.sw === false) { for (const k of await caches.keys()) if (k.startsWith('cp-')) await caches.delete(k); self.registration.unregister(); throw new Error('service worker switched off (version.json)'); }   // (unregister is NOT awaited: its job waits behind this very install)
  const fresh = await (await fetch('assets-manifest.json', { cache: 'no-store' })).json();
  const cache = await caches.open(CUR);
  const prevName = await meta('current');
  const prev = prevName && prevName !== CUR ? await manifestOf(prevName) : null;
  // Pictures that did not change since the previous build are copied from its cache (no download); changed or new ones wait for the page's fill.
  if (prev) {
    const old = await caches.open(prevName);
    const keep = (await old.keys()).filter(req => { const p = path(req.url); return p.startsWith('assets/') && prev.files[p] && prev.files[p] === fresh.files[p]; });
    for (let i = 0; i < keep.length; i += 32) await Promise.all(keep.slice(i, i + 32).map(async req => { const r = await old.match(req); if (r) await cache.put(req, r); }));
  }
  // This build's code, stored under its plain path (the page asks for it with ?v=<build> or without).
  await Promise.all(fresh.shell.map(async p => { const r = await fetch(p === 'index.html' ? './' : p, { cache: 'no-store' }); if (!r.ok) throw new Error('precache ' + p + ' ' + r.status); await cache.put(p, r.clone()); if (p === 'index.html') await cache.put('./', r); }));
  await cache.put('assets-manifest.json', new Response(JSON.stringify(fresh)));
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  const before = await meta('current');
  if (before !== CUR) { await meta('previous', before || ''); await meta('current', CUR); }   // (cache NAMES, not build ids)
  const keep = new Set([CUR, META, await meta('previous')]);
  for (const k of await caches.keys()) if (k.startsWith('cp-') && !keep.has(k)) await caches.delete(k);   // current + previous only
  await self.clients.claim();
  await say({ sw: 'ready', build: BUILD });
})()));

const networkFirst = async req => {
  const cache = await caches.open(CUR);
  try {
    const live = await Promise.race([fetch(req, { cache: 'no-cache' }), new Promise((_, no) => setTimeout(() => no(new Error('slow')), NAV_TIMEOUT_MS))]);
    if (live.ok) { cache.put('./', live.clone()); cache.put('index.html', live.clone()); }
    return live;
  } catch (err) {
    return (await cache.match('./')) || (await cache.match('index.html')) || fetch(req);
  }
};
const cacheFirst = async (req, name) => {
  if (name !== CUR && !(await caches.has(name))) return fetch(req);   // (no cache of that build: never create one just by asking)
  const cache = await caches.open(name);
  const u = new URL(req.url); const hit = await cache.match(u.origin + u.pathname);   // exact: code is stored under its plain path, pictures have no query (an ignoreSearch match scans every entry)
  // A response from the cache carries the URL it was stored under (no ?v=): a module would then get an import.meta.url without its build stamp, and src/updates.js
  // would think this is a local copy and never check for updates. A fresh Response has no URL of its own, so the page's request URL is used.
  if (hit) return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers: hit.headers });
  const live = await fetch(req);
  if (live.status === 200 && name === CUR) cache.put(u.origin + u.pathname, live.clone());
  return live;
};

self.addEventListener('fetch', e => {
  if (killed) return;
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  const p = path(req.url);
  if (p === 'sw.js' || p === 'assets-manifest.json') return;
  if (p === 'version.json') return e.respondWith(fetch(req, { cache: 'no-store' }));
  if (req.mode === 'navigate' || p === '' || p === 'index.html') return e.respondWith(networkFirst(req));
  if (isCode(p)) { const v = url.searchParams.get('v'); return e.respondWith(cacheFirst(req, v ? 'cp-' + v : CUR).catch(() => fetch(req))); }
  if (p.startsWith('assets/')) return e.respondWith(cacheFirst(req, CUR));
});

// The page's list of everything it has loaded or may show (src/swreg.js): fetch what is missing, 4 at a time, from the browser's own cache first.
let filling = false, killed = false;   // killed: the page's kill switch (src/swreg.js): answer nothing, the page goes to the network
self.addEventListener('message', e => {
  if (e.data && e.data.kill) { killed = true; return; }
  if (e.data && e.data.skip) { self.skipWaiting(); return; }
  if (!e.data || !Array.isArray(e.data.fill) || filling) return;   // (one fill at a time: the page sends its list again when a new worker activates)
  filling = true;
  e.waitUntil((async () => {
    const cache = await caches.open(CUR); const todo = e.data.fill.filter(Boolean); let n = 0, added = 0, failed = 0;
    await Promise.all(Array.from({ length: 4 }, async () => { while (n < todo.length) {
      const u = todo[n++];
      try {
        if (await cache.match(u)) continue;
        const r = await fetch(u, { cache: 'force-cache' }); if (r.status === 200) { await cache.put(u, r); added++; } else failed++;
      } catch (err) { failed++; /* offline now, or the cache refused: the next visit fills it */ } } }));
    filling = false; await say({ sw: 'filled', build: BUILD, files: todo.length, added, failed });
  })());
});
