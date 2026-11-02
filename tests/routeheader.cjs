// The top display after a crash (the user's report, 2026-11-02: after a crash the next flight showed the dead flight's "Passed Paris. Next: Berlin"). The REAL game, real taps:
//   1. fly; the plane really passes an airport without landing: the game itself shows "Passed X. Next: Y" (control: the sign IS shown while it is live)
//   2. the plane crashes into the ground (the game's own physics); the results screen comes up
//   3. FLY ON, then TAKE OFF again (taps): for the first seconds of the new flight the header must show only the NEW leg, never a "Passed" sign
// The fix lives in two places that each cover the other (rules.js initFlight resets missedSign; GameScene's header only shows a sign about THIS leg), so only BOTH removed bring the bug
// back: the plant is a JOINT plant (tools/prove-plants.sh, files a,b). Chrome: $CHROME or /usr/bin/google-chrome. Run: python3 -m http.server 8000 & node tests/routeheader.cjs
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
  const header = () => p.evaluate(() => { const s = game.scene.getScene('game'); return { text: s.nextText ? s.nextText.text : null, sign: s.missedSign ? s.missedSign.text : null, state: s.state, t: Math.round(s.gameTime) }; });
  const hold = async until => { await p.mouse.move(187, 400); await p.mouse.down(); await p.waitForFunction(until, null, { timeout: 25000 }).catch(() => {}); await p.mouse.up(); };

  // 1. flight one: take off, fly past the first airport (distance jumped past it: the game's own spawn() then shows its sign)
  await p.click('#goBtn'); await hold(() => game.scene.getScene('game').state === 'playing');
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextTurbAt = s.nextBirdsAt = 1e9; s.distancePx = s.nextAirport.worldX + 5000; });
  const sawSign = await p.waitForFunction(() => /Passed/.test(game.scene.getScene('game').nextText.text), null, { timeout: 8000 }).then(() => true, () => false);
  const h1 = await header(); check(sawSign, `control: the game shows its "Passed X. Next: Y" sign after passing an airport (header "${h1.text}")`);

  // 2. the plane flies into the ground
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.plane.y = 5000; });
  const over = await p.waitForFunction(() => game.scene.getScene('game').state === 'over', null, { timeout: 15000 }).then(() => true, () => false);
  check(over, 'the plane crashed (state over)');
  await p.waitForTimeout(800);

  // 3. FLY ON, TAKE OFF again: the new flight's header
  await p.evaluate(() => { const a = document.getElementById('againBtn'); if (a && !a.hidden) a.click(); }); await p.waitForTimeout(600);
  await p.click('#goBtn', { timeout: 8000 }).catch(() => check(false, 'TAKE OFF could not be tapped after the crash'));
  await hold(() => ['takeoff', 'playing'].includes(game.scene.getScene('game').state) && game.scene.getScene('game').gameTime > 100);
  const seen = [];
  for (let i = 0; i < 10; i++) { seen.push(await header()); await p.waitForTimeout(300); }
  const stale = seen.filter(h => /Passed/.test(h.text || ''));
  check(seen.some(h => ['takeoff', 'playing'].includes(h.state)), 'the second flight really started');
  check(!stale.length, `the new flight's header never shows the old flight's sign (${stale.length} of ${seen.length} samples did: "${(stale[0] || {}).text}", game time ${(stale[0] || {}).t} ms)`);
  check(!p.errs.length, `page errors: ${p.errs.join(' | ').slice(0, 200)}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS routeheader (after a crash the next flight\'s header shows only its own leg; the old "Passed" sign never comes back)');
})().catch(e => { console.log('FAIL\n- crashed: ' + String(e.message).split('\n')[0]); process.exit(1); });
