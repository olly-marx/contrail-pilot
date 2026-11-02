// An UPDATE reaches a player who already has the service worker, and nothing old is ever served (0.25.0). The real bundle (tools/make-site.sh) built four times (aaaaaaa, bbbbbbb,
// ccccccc, ddddddd), the server swapped under a running page like a new deploy:
//   1. A online: installed + filled. version.json is never cached (it changes the moment the server does).
//   2. B deploys (one picture redrawn): a revisit runs build B; the redrawn picture arrives (B's bytes), an UNCHANGED picture is copied forward, not downloaded again;
//      caches are cp-aaaaaaa + cp-bbbbbbb (current + previous) + cp-meta.
//   3. C deploys: cp-aaaaaaa is purged (current + previous only).
//   4. D deploys while index.html is slow (> the worker's 3 s): the cached shell opens at once (build C), and src/updates.js (which reads version.json outside the cache)
//      still takes the player to D: it can never be stuck on an old build.
// PLANTS: tools/plants.tsv, test `swupdate` (each must FAIL this test). Run: node tests/swupdate.cjs
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { buildSite, host } = require('./lib/sitehost.js');
const { ready, CHROME, ARGS, prepare, swMessage, stamp, cacheNames, sha1 } = require('./lib/swpage.js');

(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const REDRAWN = 'assets/ui/captain-point.png', SAME = 'assets/ui/lesson-bars.png';
  const dirs = {
    aaaaaaa: buildSite('aaaaaaa'),
    bbbbbbb: buildSite('bbbbbbb', d => fs.copyFileSync(path.join(d, 'assets/ui/icon-seed.png'), path.join(d, REDRAWN))),   // a redrawn picture
    ccccccc: buildSite('ccccccc'), ddddddd: buildSite('ddddddd'),
  };
  const hashOf = (b, f) => crypto.createHash('sha1').update(fs.readFileSync(path.join(dirs[b], f))).digest('hex');
  const h = await host(dirs.aaaaaaa);
  const b = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });
  await prepare(ctx);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e).slice(0, 100)));
  const visit = async (build, label) => {
    h.setRoot(dirs[build]); h.reset();
    await p.goto(h.url); await ready(p);
    await swMessage(p, 'ready', build, 60000).catch(() => check(false, `${label}: the worker of build ${build} never became active`));
    await swMessage(p, 'filled', build, 90000).catch(() => check(false, `${label}: the worker of build ${build} never finished filling`));
  };

  // 1. A, and version.json never cached
  await visit('aaaaaaa', 'A');
  check(await stamp(p) === 'aaaaaaa', 'A: the page runs build A');
  check(await sha1(p, REDRAWN) === hashOf('aaaaaaa', REDRAWN), 'A: the picture is A\'s');
  const vj = () => p.evaluate(async () => (await (await fetch('version.json')).json()).commit);
  check(await vj() === 'aaaaaaa', 'version.json says A');
  h.setRoot(dirs.bbbbbbb);   // the deploy lands while the page is open
  check(await vj() === 'bbbbbbb', 'version.json is NEVER served from the cache (it changed to B at once)');
  h.setRoot(dirs.aaaaaaa);

  // 2. B: the redrawn picture arrives, an unchanged one is copied
  await visit('bbbbbbb', 'B');
  check(await stamp(p) === 'bbbbbbb', `B: the revisit runs build B (got ${await stamp(p)})`);
  check(await sha1(p, REDRAWN) === hashOf('bbbbbbb', REDRAWN), 'B: the REDRAWN picture is B\'s bytes (not the old one from the previous cache)');
  check(!h.hits[SAME], `B: an unchanged picture was copied forward, not downloaded again (${h.hits[SAME] || 0} requests)`);
  check((h.hits[REDRAWN] || 0) >= 1, 'B: the redrawn picture was fetched again');
  let names = await cacheNames(p);
  check(JSON.stringify(names) === JSON.stringify(['cp-aaaaaaa', 'cp-bbbbbbb', 'cp-meta']), `B: caches are the current + previous build + meta (${names.join(', ')})`);

  // 3. C: the oldest cache goes
  await visit('ccccccc', 'C');
  names = await cacheNames(p);
  check(JSON.stringify(names) === JSON.stringify(['cp-bbbbbbb', 'cp-ccccccc', 'cp-meta']), `C: the cache of build A was purged (${names.join(', ')})`);
  check(await stamp(p) === 'ccccccc', 'C: the page runs build C');

  // 4. D with a SLOW index.html: opens from the cache, then updates.js moves it to D
  h.setRoot(dirs.ddddddd); h.reset(); h.hold(1, 6000);
  const t0 = Date.now(); await p.goto(h.url, { timeout: 30000 }); await ready(p);
  check(await stamp(p) === 'ccccccc', `D slow: the cached shell opened (build C) within ${((Date.now() - t0) / 1000).toFixed(1)} s instead of waiting for the server`);
  check(Date.now() - t0 < 5500, `D slow: the page did not wait for the slow index.html (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  await p.waitForFunction(() => { const s = document.querySelector('script[src*="main.js"]'); return s && /v=ddddddd/.test(s.getAttribute('src')); }, null, { timeout: 60000, polling: 300 })
    .catch(() => check(false, 'D slow: the player was never taken to build D (stuck on the old build)'));
  check(!p.errs.length, `page errors: ${p.errs.join(' | ')}`);
  await b.close(); h.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS swupdate (A -> B: redrawn picture arrives, unchanged copied, caches current+previous; C purges A; a slow index.html still ends on D; version.json never cached)');
})().catch(e => { console.log('FAIL\n- crashed: ' + e.message.split('\n')[0]); process.exit(1); });
