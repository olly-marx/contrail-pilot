// A player's progress must survive (0.15.3, a real player lost it twice on 0.15.x). In the game AS SHIPPED (no classic shim), in a real
// persistent browser profile (so "close and reopen" is real):
//   1. start choice -> a flight banked by the game's own landing code -> a plain reload keeps seeds, flights, area; a full close + reopen too;
//   2. the self-update's fresh load (updates.js adds ?u=<version> and reloads) keeps them;
//   3. ?season2=reset in the URL (a saved icon or bookmark made while the link existed) does NOT wipe a shipped save, on any number of opens;
//   4. players see no "SEASON 2" tag and no reset link (the old 40x8 px link wiped the save with no question);
//   5. the preview mode (testers, SEASON2_FORCE false) still wipes on ?season2=reset, ONCE: the URL is stripped, and progress made after
//      it survives a plain reload (before the fix the URL stayed and every reload wiped again).
// PLANTS (edit src/season2.js; each must FAIL this test):
//   no strip:       sed -i "s/^    try { const u = new URL(location.href); u.searchParams.delete('season2'); history.replaceState.*$/    \/\/ plant/" src/season2.js
//   shipped wipes:  sed -i 's/    if (!FORCE) mine().forEach(k => real.removeItem(k));/    mine().forEach(k => real.removeItem(k));/' src/season2.js
//   tag for players: sed -i 's/  if (!FORCE) { if (document.body) tag();/  { if (document.body) tag();/' src/season2.js
// Run: python3 -m http.server 8000 & URL=http://localhost:8000/ node tests/saveloss.cjs   (about 40 s)
const { chromium } = require('playwright-core');
const fs = require('fs'), os = require('os'), path = require('path');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saveloss-'));
  const open = async (force) => {
    const c = await chromium.launchPersistentContext(dir, { executablePath: process.env.CHROME || '/usr/bin/google-chrome', viewport: { width: 390, height: 844 } });
    await c.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    if (force === false) await c.addInitScript(() => { window.SEASON2_FORCE = false; });   // the preview mode only
    const p = c.pages()[0] || await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    return [c, p];
  };
  const state = p => p.evaluate(() => { const g = (window.game && game.registry && game.registry.get('save')) || {}; return { url: location.search, areas: g.areas, city: g.city, seeds: g.seeds, flights: g.flights, landings: g.landings, tag: !!document.getElementById('s2Tag'), link: !!document.querySelector('a[href*="season2=reset"]') }; });
  const load = async (p, q = '') => { await p.goto(URL + q); await ready(p); await p.waitForTimeout(700); };

  // 1. A real banked landing.
  let [c, p] = await open();
  await load(p);
  await p.click('#startChoice [data-area="weurope"]'); await p.click('#startChoice [data-city="LONDON"]'); await p.waitForTimeout(700);
  await p.evaluate(async () => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeUpgrade: false, freeGiven: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 3, flights: 4, seeds: 500 }); (await import('/src/save.js')).writeSave(s); });
  await load(p);
  await p.click('#goBtn'); await started(p);
  await p.evaluate(() => { const g = game.scene.getScene('game'); g.graceUntil = 1e12; g.landedAt = g.path[1]; g.distancePx = 3000; g.finish({ landed: true }); });
  await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(800);
  const banked = await state(p);
  check(banked.seeds >= 500 && banked.landings >= 4 && banked.areas && banked.areas[0] === 'weurope', `the landing banked progress: ${JSON.stringify(banked)}`);
  const same = (a, b) => a.seeds === b.seeds && a.flights === b.flights && a.landings === b.landings && JSON.stringify(a.areas) === JSON.stringify(b.areas) && a.city === b.city;
  await p.reload(); await ready(p); await p.waitForTimeout(700);
  const r1 = await state(p);
  check(same(banked, r1), `a plain reload keeps the progress: ${JSON.stringify(banked)} -> ${JSON.stringify(r1)}`);
  // 2. The self-update's fresh load.
  await load(p, '?u=abc123');
  const r2 = await state(p);
  check(same(banked, r2), `the update's fresh load (?u=) keeps the progress: ${JSON.stringify(r2)}`);
  // 4. No tag, no reset link for players.
  check(!r2.tag && !r2.link, `players see no SEASON 2 tag and no reset link: ${JSON.stringify({ tag: r2.tag, link: r2.link })}`);
  // 3. The reset URL does nothing to a shipped save, on repeated opens.
  for (let i = 0; i < 2; i++) { await load(p, '?season2=reset'); }
  const r3 = await state(p);
  check(same(banked, r3) && !/season2/.test(r3.url), `?season2=reset does not wipe a shipped save (twice) and leaves the URL clean: ${JSON.stringify(r3)}`);
  // Full close and reopen.
  await c.close(); [c, p] = await open(); await load(p);
  const r4 = await state(p);
  check(same(banked, r4), `a full close + reopen keeps the progress: ${JSON.stringify(r4)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await c.close();

  // 5. The preview mode: the wipe happens once.
  [c, p] = await open(false);
  await load(p, '?season2=1');   // preview on
  await p.evaluate(async () => { const s = game.registry.get('save'); Object.assign(s, { seeds: 500, flights: 12 }); (await import('/src/save.js')).writeSave(s); });
  await load(p, '?season2=reset');
  const w0 = await state(p);
  check(w0.seeds === 0 && !/season2/.test(w0.url), `preview: the reset wipes once and strips the URL: ${JSON.stringify(w0)}`);
  await p.evaluate(async () => { const s = game.registry.get('save'); Object.assign(s, { seeds: 300, flights: 5 }); (await import('/src/save.js')).writeSave(s); });
  await p.reload(); await ready(p); await p.waitForTimeout(700);
  const w1 = await state(p);
  check(w1.seeds === 300 && w1.flights === 5, `preview: progress made after the reset survives a plain reload: ${JSON.stringify(w1)}`);
  await c.close();
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(fails.length ? 'FAIL saveloss:\n - ' + fails.join('\n - ') : 'PASS saveloss: a banked landing survives reload, close + reopen and the update load; the reset URL cannot wipe a shipped save; no tag or reset link for players; the preview reset wipes once');
  process.exit(fails.length ? 1 : 0);
})();
