// An UPDATE reaches a player who already has the service worker, and nothing old is ever served (0.25.0). The real bundle (tools/make-site.sh) built four times (aaaaaaa, bbbbbbb,
// ccccccc, ddddddd), hosted under /contrail-pilot/ like GitHub Pages, the server swapped under a running page like a new deploy:
//   1. A online: installed + filled. version.json is never cached (it changes the moment the server does).
//   2. B deploys (one picture redrawn): a revisit runs build B; the redrawn picture arrives (B's bytes), an UNCHANGED picture is copied forward, not downloaded again;
//      caches are cp-aaaaaaa + cp-bbbbbbb (current + previous) + cp-meta.
//   3. C deploys: cp-aaaaaaa is purged (current + previous only).
//   4. D deploys while index.html is slow (20 s, far over the worker's 3 s): the cached shell opens at once (build C), and src/updates.js (which reads version.json outside the
//      cache) still takes the player to D: it can never be stuck on an old build.
// RAW CHROME, NOT PLAYWRIGHT (tests/lib/rawchrome.js): under Playwright the worker updates of this scenario stalled in ~1 run in 3 (a tooling artefact: 0 stalls in 13 raw runs).
// The first failed check ends the run (the later steps depend on it) and names its step. Chrome: $CHROME or /usr/bin/google-chrome (CI sets CHROME), the launch switches are in lib/rawchrome.js.
// PLANTS: tools/plants.tsv, test `swupdate` (each must FAIL this test). Run: node tests/swupdate.cjs
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { buildSite, host } = require('./lib/sitehost.js');
const { SAVE } = require('./lib/swpage.js');
const raw = require('./lib/rawchrome.js');

class Stop extends Error {}
(async () => {
  const fails = []; let stepName = 'start'; const T0 = Date.now();
  const step = m => { stepName = `${m} at ${((Date.now() - T0) / 1000).toFixed(0)}s`; if (process.env.SWDEBUG) console.log(`[${stepName}]`); };
  const check = (c, m) => { if (!c) { fails.push(`[${stepName}] ${m}`); throw new Stop(); } };
  const REDRAWN = 'assets/ui/captain-point.png', SAME = 'assets/ui/lesson-bars.png';
  const dirs = {
    aaaaaaa: buildSite('aaaaaaa'),
    bbbbbbb: buildSite('bbbbbbb', d => fs.copyFileSync(path.join(d, 'assets/ui/icon-seed.png'), path.join(d, REDRAWN))),   // a redrawn picture
    ccccccc: buildSite('ccccccc'), ddddddd: buildSite('ddddddd'),
  };
  const hashOf = (b, f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(dirs[b], f))).digest('hex');
  const h = await host(dirs.aaaaaaa, { base: '/contrail-pilot/' });
  const url = h.url.replace('localhost', '127.0.0.1');
  const c = await raw.launch({ pidfile: path.join(os.tmpdir(), 'swupdate-chrome.pid') });
  try {
    await c.onNewDocument(`if (!localStorage.getItem('s2:contrailPilot.v2')) localStorage.setItem('s2:contrailPilot.v2', ${JSON.stringify(JSON.stringify(SAVE))});
      window.__sw = []; if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => window.__sw.push(e.data));`);
    const READY = `(() => { const s = window.game && window.game.scene && game.scene.getScene('game'); return !!(s && s.sys.isActive() && game.registry.get('ui') && s.textures.exists('puff') && !s.load.isLoading() && !document.getElementById('loader')); })()`;
    const stamp = () => c.eval(`((/[?&]v=([^&]+)/.exec((document.querySelector('script[src*="main.js"]') || {}).src || '')) || [])[1] || null`);
    const caches = () => c.eval(`caches.keys().then(k => k.sort())`);
    const sha1 = f => c.eval(`fetch(${JSON.stringify(f)}).then(r => r.arrayBuffer()).then(async b => [...new Uint8Array(await crypto.subtle.digest('SHA-1', b))].map(x => x.toString(16).padStart(2, '0')).join(''))`);
    const swMsg = (kind, build, ms) => c.until(`window.__sw.some(m => m.sw === '${kind}' && m.build === '${build}')`, ms);
    const visit = async build => {
      h.setRoot(dirs[build]); h.reset(); step(`visit ${build}`);
      const r = await c.goto(url, 60000); check(r.ok, `the page of build ${build} did not load (${r.ms} ms)`);
      check(await c.until(READY, 60000), `build ${build}: the game was never ready`);
      check(await swMsg('ready', build, 90000), `build ${build}: its worker never became active`);
      check(await swMsg('filled', build, 90000), `build ${build}: its worker never finished filling its cache`);
    };

    // 1. A, and version.json never cached
    await visit('aaaaaaa');
    check(await stamp() === 'aaaaaaa', 'A: the page runs build A');
    check(await sha1(REDRAWN) === hashOf('aaaaaaa', REDRAWN), "A: the picture is A's");
    const vj = () => c.eval(`fetch('version.json').then(r => r.json()).then(v => v.commit)`);
    check(await vj() === 'aaaaaaa', 'version.json says A');
    h.setRoot(dirs.bbbbbbb);   // the deploy lands while the page is open
    check(await vj() === 'bbbbbbb', 'version.json is NEVER served from the cache (it changed to B at once)');
    h.setRoot(dirs.aaaaaaa);

    // 2. B: the redrawn picture arrives, an unchanged one is copied
    await visit('bbbbbbb');
    check(await stamp() === 'bbbbbbb', `B: the revisit runs build B (got ${await stamp()})`);
    check(await sha1(REDRAWN) === hashOf('bbbbbbb', REDRAWN), "B: the REDRAWN picture is B's bytes (not the old one from the previous cache)");
    check(!h.hits[SAME], `B: an unchanged picture was copied forward, not downloaded again (${h.hits[SAME] || 0} requests)`);
    check((h.hits[REDRAWN] || 0) >= 1, 'B: the redrawn picture was fetched again');
    let names = await caches();
    check(JSON.stringify(names) === JSON.stringify(['cp-aaaaaaa', 'cp-bbbbbbb', 'cp-meta']), `B: caches are the current + previous build + meta (${(names || []).join(', ')})`);

    // 3. C: the oldest cache goes
    await visit('ccccccc');
    names = await caches();
    check(JSON.stringify(names) === JSON.stringify(['cp-bbbbbbb', 'cp-ccccccc', 'cp-meta']), `C: the cache of build A was purged (${(names || []).join(', ')})`);
    check(await stamp() === 'ccccccc', 'C: the page runs build C');

    // 4. D with a SLOW index.html: opens from the cache, then updates.js moves it to D
    h.setRoot(dirs.ddddddd); h.reset(); h.hold(1, 20000); step('D slow: goto');
    const d = await c.goto(url, 60000);
    check(d.ok, `D slow: the page did not load at all within 60 s`);
    check(d.ms < 15000, `D slow: the page did not wait for the slow index.html (${(d.ms / 1000).toFixed(1)} s)`);
    check(await stamp() === 'ccccccc', `D slow: the cached shell opened (build C) instead of waiting for the server (got ${await stamp()})`);
    step('D slow: waiting for updates.js');
    check(await c.until(`((document.querySelector('script[src*="main.js"]') || {}).src || '').includes('ddddddd')`, 90000), 'D slow: the player was never taken to build D (stuck on the old build)');
  } catch (e) { if (!(e instanceof Stop)) fails.push(`[${stepName}] crashed: ${String(e.message).split('\n')[0]}`); }
  c.close(); h.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS swupdate (raw Chrome: A -> B: redrawn picture arrives, unchanged copied, caches current+previous; C purges A; a slow index.html still ends on D; version.json never cached)');
  process.exit(0);
})().catch(e => { console.log('FAIL\n- crashed: ' + String(e.message).split('\n')[0]); process.exit(1); });
