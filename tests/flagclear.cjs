// The loading screen's "a flight is on" flag (src/loader.js loading.flying, set by GameScene.startFlight) must be CLEARED when the flight ends, or the idle picture
// fetch (tier 2) never runs again and the menus go back to fetching on a tap. Every way a flight ends in the game:
//   1. a crash / landing: rules.js finish() -> GameScene.onFinish (forced here by calling finish() the way the game does)
//   2. Esc while parked on the runway: GameScene.backToMenu
// After each: the flag is false and the loader's tier-2 queue starts shrinking again (its fetches resume). Control first: the flag IS on while the flight is.
// PLANTS: tools/plants.tsv, test `flagclear` (each must FAIL this test). Run: python3 -m http.server 8000 & node tests/flagclear.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { muted: true, tutorialDone: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, flightSeconds: 2000, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON',
    fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
  const open = async () => {
    const p = await b.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, save);
    await p.goto(URL); await ready(p); await p.waitForTimeout(500);
    return p;
  };
  const flag = p => p.evaluate(() => window.cpLoading.flying);
  const queue = p => p.evaluate(() => (window.cpLoading.queue || []).length);
  // The tier-2 fetches go on: the queue gets shorter within a few seconds (the loader takes one picture every ~20 ms when idle).
  const resumes = async p => { const q0 = await queue(p); await p.waitForTimeout(2500); return { q0, q1: await queue(p) }; };
  const takeOff = async p => {
    await p.click('#goBtn'); await p.waitForFunction(() => game.scene.getScene('game').state === 'takeoff', null, { timeout: 15000 });
  };

  // 1. a crash ends the flight
  let p = await open();
  check(await flag(p) === false, 'before take-off the flag is off');
  await takeOff(p);
  check(await flag(p) === true, 'control: the flag is ON once the flight has started');
  await p.evaluate(() => { const g = game.scene.getScene('game'); g.finish({ reason: 'You hit the ground!' }); });   // the game's own ending (rules.js finish -> onFinish)
  await p.waitForTimeout(300);
  check(await flag(p) === false, 'a crash/landing (finish -> onFinish) clears the flag');
  let r = await resumes(p); check(r.q1 < r.q0, `after the crash the tier-2 fetches resume (queue ${r.q0} -> ${r.q1})`);
  check(!p.errs.length, `page errors (crash case): ${p.errs.join(' | ').slice(0, 160)}`);
  await p.close();

  // 2. Esc on the runway ends it (back to the title)
  p = await open();
  await takeOff(p);
  check(await flag(p) === true, 'control: the flag is ON when parked on the runway after START');
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  check(await flag(p) === false, 'Esc on the runway (backToMenu) clears the flag');
  r = await resumes(p); check(r.q1 < r.q0, `after Esc the tier-2 fetches resume (queue ${r.q0} -> ${r.q1})`);
  check(!p.errs.length, `page errors (Esc case): ${p.errs.join(' | ').slice(0, 160)}`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS flagclear (loading.flying is on while a flight is, off after a crash/landing and after Esc on the runway, and the idle picture fetch then resumes)');
})();
