// A COLD START WITH NO INTERNET (service worker, 0.25.0): after one online visit the game must start, fly and open its menus with the server gone.
// The real deployed bundle (tools/make-site.sh, tests/lib/sitehost.js), a persistent Chrome profile that is closed and reopened (a real cold start), then the server shut down.
//   online visit -> the worker precaches the shell and the page tells it every picture -> 'filled' -> close the browser -> stop the server -> reopen -> the game is ready,
//   takes off, HANGAR / NATURE / BOARDS show every picture, and no request failed except version.json (offline by nature) and the refused online sync.
// PLANTS: tools/plants.tsv, test `swoffline` (each must FAIL this test). Run: node tests/swoffline.cjs
const { chromium } = require('playwright-core');
const fs = require('fs'), os = require('os'), path = require('path');
const { buildSite, host } = require('./lib/sitehost.js');
const { ready, CHROME, ARGS, prepare, swMessage, stamp } = require('./lib/swpage.js');

(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const dir = buildSite('aaaaaaa'); const h = await host(dir);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'swprofile-'));
  const launch = () => chromium.launchPersistentContext(profile, { executablePath: CHROME, args: ARGS, viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true });

  // 1. online: install, precache, fill
  let ctx = await launch(); await prepare(ctx);
  let p = ctx.pages()[0] || await ctx.newPage();
  await p.goto(h.url); await ready(p);
  await swMessage(p, 'filled', 'aaaaaaa', 90000).catch(() => check(false, 'online: the worker never reported it had filled its cache'));
  check(await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'online: a service worker is registered');
  await ctx.close();
  h.close();   // the internet is gone

  // 2. cold start offline
  ctx = await launch(); await prepare(ctx);
  p = ctx.pages()[0] || await ctx.newPage();
  const bad = []; const ok = u => /version\.json|mkucbsjzbipjaiqzrlkj/.test(u);
  p.on('requestfailed', r => { if (!ok(r.url())) bad.push(`failed ${r.url().replace(/^.*localhost:\d+\//, '')}`); });
  p.on('response', r => { if (r.status() >= 400 && !ok(r.url())) bad.push(`${r.status()} ${r.url().replace(/^.*localhost:\d+\//, '')}`); });
  await p.goto(h.url, { timeout: 30000 }).catch(e => check(false, `offline: the page did not open (${e.message.split('\n')[0].slice(0, 80)})`));
  await ready(p);
  check(await p.evaluate(() => !!(window.game && game.scene.getScene('game') && game.scene.getScene('game').sys.isActive())), 'offline: the game scene is up');
  check(await stamp(p) === 'aaaaaaa', `offline: the cached shell is build aaaaaaa (${await stamp(p)})`);
  await p.click('#goBtn', { timeout: 8000 }).catch(() => check(false, 'offline: TAKE OFF could not be tapped'));
  await p.mouse.move(187, 400); await p.mouse.down();
  const flew = await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 25000 }).then(() => true, () => false);
  await p.mouse.up(); check(flew, 'offline: the plane took off and flew');
  await p.evaluate(() => game.registry.get('ui').go('fly')).catch(() => {});
  for (const id of ['hangar', 'nature', 'boards']) {
    await p.evaluate(id => game.registry.get('ui').go(id), id).catch(() => {}); await p.waitForTimeout(1200);
    const broken = await p.evaluate(() => [...document.images].filter(i => /\/assets\//.test(i.src) && i.complete && i.naturalWidth === 0).map(i => i.src.replace(/^.*\/assets\//, '')));
    check(!broken.length, `offline: ${id}: every picture shown loaded (${broken.slice(0, 3).join(', ')})`);
  }
  check(!bad.length, `offline: ${bad.length} request(s) failed: ${bad.slice(0, 5).join(', ')}`);
  check(await p.evaluate(() => !!navigator.serviceWorker.controller), 'offline: the page is controlled by the worker');
  await ctx.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS swoffline (a cold start with the server gone: ready, took off, HANGAR / NATURE / BOARDS drawn, 0 failed requests)');
})().catch(e => { console.log('FAIL\n- crashed: ' + e.message.split('\n')[0]); process.exit(1); });
