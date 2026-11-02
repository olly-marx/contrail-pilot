// Shared bits of the service-worker tests (tests/sw*.cjs).
const { ready } = require('./ready.js');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const ARGS = ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'];   // the online sync is refused by name resolution (a routed page would change what the cache does)
const SAVE = { muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, flightSeconds: 2000, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON',
  levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
// Before any page script: keep the save across visits (written once), and record every message the worker sends the page.
const prepare = async ctxOrPage => ctxOrPage.addInitScript(save => {
  if (!localStorage.getItem('s2:contrailPilot.v2')) localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(save));
  window.__sw = []; if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => window.__sw.push(e.data));
}, SAVE);
const swMessage = (p, sw, build, ms = 60000) => p.waitForFunction(([sw, build]) => window.__sw.some(m => m.sw === sw && (!build || m.build === build)), [sw, build], { timeout: ms, polling: 200 });
const stamp = p => p.evaluate(() => { const s = document.querySelector('script[src*="main.js"]'); return (/[?&]v=([^&]+)/.exec(s ? s.getAttribute('src') : '') || [])[1] || null; });
const cacheNames = p => p.evaluate(async () => (await caches.keys()).sort());
const sha1 = async (p, url) => p.evaluate(async u => { const r = await fetch(u); const b = await r.arrayBuffer(); return [...new Uint8Array(await crypto.subtle.digest('SHA-1', b))].map(x => x.toString(16).padStart(2, '0')).join(''); }, url);
module.exports = { ready, CHROME, ARGS, SAVE, prepare, swMessage, stamp, cacheNames, sha1 };
