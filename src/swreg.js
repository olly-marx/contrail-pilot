// Registers the service worker (sw.js, 0.25.0) on a DEPLOYED page only: a page with no ?v build stamp (local copies, every test) never registers one, exactly like src/updates.js.
// Kill switch, two ways: `?nosw=1` on the address, and `"sw": false` in version.json (the deploy writes it, tools/make-site.sh: a file SW-OFF at the repo root turns it off).
// Either one unregisters every worker and deletes every cp-* cache, so a bad worker can always be undone.
// After the page has loaded, it tells the worker everything it may need offline (src/preload.js's list + the files Phaser loaded): the worker fetches what it lacks.
const stamp = () => window.__CP_VERSION || new URL(import.meta.url).searchParams.get('v') || ((/[?&]v=([^&]+)/.exec((document.querySelector('script[src*="main.js"]') || {}).src || '')) || [])[1] || null;   // (a module from the worker's cache has no ?v of its own)

export async function killServiceWorker() {
  try { const c = navigator.serviceWorker.controller; if (c) c.postMessage({ kill: true }); } catch (e) { /* no worker controls this page */ }   // it stops answering at once
  try { for (const k of await caches.keys()) if (k.startsWith('cp-')) await caches.delete(k); } catch (e) { /* no Cache Storage */ }
  // Not awaited: Chrome queues an unregister behind the registration's other jobs (an update check can hold it for ~30 s); the worker above is already silent.
  try { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); } catch (e) { /* nothing registered */ }
}

// urls: absolute or page-relative picture addresses to keep for offline.
export async function startServiceWorker(urls = []) {
  if (!('serviceWorker' in navigator) || !stamp()) return 'skipped';
  if (new URLSearchParams(location.search).get('nosw')) { await killServiceWorker(); return 'killed (?nosw)'; }
  try {
    const v = await (await fetch('version.json', { cache: 'no-store' })).json();
    if (v && v.sw === false) { await killServiceWorker(); return 'killed (version.json)'; }
  } catch (e) { /* offline: the worker we have keeps working */ }
  try {
    const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
    reg.update().catch(() => { /* offline: the worker we have keeps working */ });   // look for a NEW sw.js on every visit (a navigation alone only checks once a day)
    // A new worker waits behind the old one (skipWaiting inside install is not honoured while pages are open): tell it to take over as soon as it is installed.
    const promote = () => { if (reg.waiting) reg.waiting.postMessage({ skip: true }); };
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') promote(); }); });
    promote();
    const fill = urls.map(u => new URL(u, location.href).href);
    const post = () => { const sw = navigator.serviceWorker.controller || reg.active; if (sw) sw.postMessage({ fill }); };
    // A NEW worker (an update) becomes active after this page has loaded: it says so, and gets the list again.
    navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.sw === 'ready') post(); });
    await navigator.serviceWorker.ready; post();
    return 'registered';
  } catch (e) { return 'failed: ' + e.message; }
}
