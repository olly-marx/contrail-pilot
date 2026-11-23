// The top display after a crash (the user's report, 2026-11-02: after a crash the next flight showed the dead flight's "Passed Paris. Next: Berlin").
// Since 2026-11-23 the top of the screen is the ROUTE STRIP (src/Hud.js; the "Passed X. Next: Y" line is gone): the same bug would be a strip still
// showing the dead flight's progress. The REAL game, real taps:
//   1. fly; the plane really passes an airport without landing: the strip shows that progress (control: its plane is well along, the passed airport's tick behind it)
//   2. the plane crashes into the ground (the game's own physics); the results screen comes up
//   3. FLY ON, then TAKE OFF again (taps): for the first seconds of the new flight the strip starts again from its own take-off (plane near the start, no
//      airport behind it) and no old "Passed" words are anywhere on top. Plant: tools/plants.tsv, test routeheader. Run: python3 -m http.server 8000 & node tests/routeheader.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, flightSeconds: 2000,
    areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  const header = () => p.evaluate(() => { const s = game.scene.getScene('game'), rv = s.state === 'over' || s.crossing ? null : s.routeView();
    return { text: [s.distText, s.missionText, s.nextText].map(t => (t ? t.text : '')).join(' | '), state: s.state, t: Math.round(s.gameTime),
      f: rv ? s.distancePx / Math.max(1, rv.endX) : null, behind: rv ? rv.ticks.filter(x => x <= s.distancePx).length : null, stripX: s.strip.plane.x }; });
  const hold = async until => { await p.mouse.move(187, 400); await p.mouse.down(); await p.waitForFunction(until, null, { timeout: 25000 }).catch(() => {}); await p.mouse.up(); };

  // 1. flight one: take off, fly past the first airport (distance jumped past it: the game's own spawn() then shows its sign)
  await p.click('#goBtn'); await hold(() => game.scene.getScene('game').state === 'playing');
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextTurbAt = s.nextBirdsAt = 1e9; s.distancePx = s.nextAirport.worldX + 260; });
  await p.waitForTimeout(600);
  const h1 = await header(); check(h1.behind >= 1 && h1.stripX > 120, `control: after passing an airport the strip shows it behind the plane, the plane well along (${JSON.stringify(h1)})`);

  // 2. the plane flies into the ground
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.plane.y = 5000; });
  const over = await p.waitForFunction(() => game.scene.getScene('game').state === 'over', null, { timeout: 15000 }).then(() => true, () => false);
  check(over, 'the plane crashed (state over)');
  const resultsUp = await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).then(() => true, () => false);
  check(resultsUp, 'the results screen came up after the crash'); await p.waitForTimeout(500);
  if (process.env.RHDEBUG) console.log('after crash buttons:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.id || b.textContent.trim().slice(0, 20)))), 'results hidden:', await p.evaluate(() => document.getElementById('results').hidden), 'title hidden:', await p.evaluate(() => document.getElementById('title').hidden));

  // 3. FLY ON, TAKE OFF again: the new flight's header
  await p.click('#againBtn', { timeout: 8000 }).catch(() => check(false, 'FLY ON (the results screen button) could not be tapped')); await p.waitForTimeout(600);
  await p.click('#goBtn', { timeout: 8000 }).catch(() => check(false, 'TAKE OFF could not be tapped after the crash'));
  await hold(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state) && game.scene.getScene('game').gameTime > 100);
  const seen = [];
  for (let i = 0; i < 10; i++) { seen.push(await header()); await p.waitForTimeout(300); }
  const stale = seen.filter(h => /Passed/.test(h.text || '') || (h.behind != null && h.behind > 0) || (h.f != null && h.f > 0.3));
  check(seen.some(h => ['takeoff', 'playing'].includes(h.state)), 'the second flight really started');
  check(!stale.length, `the new flight's strip starts from its own take-off, no old progress or "Passed" words (${stale.length} of ${seen.length} samples did not: ${JSON.stringify(stale[0] || {})})`);
  check(!p.errs.length, `page errors: ${p.errs.join(' | ').slice(0, 200)}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS routeheader (after a crash the next flight\'s strip starts from its own take-off; no old progress comes back)');
})().catch(e => { console.log('FAIL\n- crashed: ' + String(e.message).split('\n')[0]); process.exit(1); });
