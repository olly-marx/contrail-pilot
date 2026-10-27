// Hazards check: turbulence, no-fly zones and birds only appear after their distance; turbulence
// delays taps; touching a no-fly zone or a bird ends the flight with the right reason.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hazards.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, tours: ['*'], autoTakeoff: true, muted: true, seenTips: ['x-bars', 'x-multiplier', 'x-gold', 'x-hot', 'x-plots', 'tree-1', 'tree-2', 'tree-3'] })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const scene = (fn, a) => p.evaluate(fn, a);
  // Birds come on a 55% roll each chance; with bad luck none came in the window this test watches
  // (it failed ~1 run in 6, and blocked deploys). Here every chance brings birds: the test is about
  // what birds do, not how lucky the roll is.
  const start = async () => { await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    await p.evaluate(async () => { (await import('./src/config.js')).HAZARDS.birds.chance = 1; });
    await p.click('#goBtn'); await started(p); await p.waitForTimeout(2300); };
  // A new hazard shows a short bubble WITHOUT pausing (S1, the user 2026-10-27); nothing to dismiss.
  let sawBubble = false, sawFreeze = false;
  const dismiss = async () => {
    const st = await p.evaluate(() => { const s = game.scene.getScene('game'); return { ex: s.explaining, frozen: s.frozen }; });
    if (st.ex) sawBubble = true; if (st.frozen) sawFreeze = true;
  };
  const hold = (y = 200) => scene(y => { const s = game.scene.getScene('game'); s.plane.y = y; s.plane.vy = 0; s.heat = 0; }, y);

  // 1. Early in a flight: no hazards. Count what spawns over the first ~1800 m (turbulence from 2,000 m since 0.10.0).
  await start();
  for (let i = 0; i < 40; i++) {
    await scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); s.plane.y = 200; s.plane.vy = 0; s.heat = 0; s.distancePx = Math.min(s.distancePx + 95, 1800); });
    await dismiss();
    await p.waitForTimeout(30);
  }
  // Each hazard records a first-seen tip the moment it spawns, so check for any of those.
  let c = await scene(() => { const s = game.scene.getScene('game'); return { d: s.distancePx, seen: JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips.filter(t => t.startsWith('hazard-')) }; });
  check(c.d > 1500, `test should have flown past 1500 m, got ${c.d}`);
  check(c.seen.length === 0, `hazards appeared before their distance: ${JSON.stringify(c)}`);

  // 1b. No no-fly zone before 8 km (turbulence may appear from 2 km).
  await start();
  for (let i = 0; i < 60; i++) {
    await scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.rects.forEach(r => { if (!st.noFly) r.y = -9999; })); s.plane.y = 200; s.plane.vy = 0; s.heat = 0; s.distancePx = Math.min(s.distancePx + 120, 7600); });
    await dismiss();
    await p.waitForTimeout(30);
  }
  const nf = await scene(() => ({ d: game.scene.getScene('game').distancePx, seen: JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips.includes('hazard-noFly') }));
  check(nf.d > 7000 && !nf.seen, `no-fly zone appeared before 8000 m: ${JSON.stringify(nf)}`);

  // 2. Far into a flight: all three appear. Loop until they have (each new hazard pauses for its
  // tip and a breather, so a slow machine needs more steps), up to a generous limit.
  await start();
  const allSeen = () => p.evaluate(() => { const t = JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips; return ['hazard-turbulence', 'hazard-noFly', 'hazard-birds'].every(h => t.includes(h)); });
  for (let i = 0; i < 600 && !(i % 20 === 0 && await allSeen()); i++) {
    await scene(() => { const s = game.scene.getScene('game'); s.storms.forEach(st => st.rects.forEach(r => { r.y = -9999; })); s.birds.forEach(f => f.birds.forEach(b => b.y = -999)); s.birds.forEach(f => { f.y = -999; });
      s.plane.y = 200; s.plane.vy = 0; s.heat = 0; s.distancePx = Math.max(s.distancePx, 10000) + 60; });
    await dismiss();
    await p.waitForTimeout(30);
  }
  let c2 = await scene(() => { const s = game.scene.getScene('game'); return { turbsSeen: s.nextTurbAt > 2500, birdsSeen: s.nextBirdsAt > 6000, noFly: s.storms.some(x => x.noFly), state: s.state }; });
  const spawned = await scene(() => { const s = game.scene.getScene('game'); return { t: s.turbs.length + (s.hazardSeen?.turbulence ? 1 : 0), seen: JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips }; });
  check(spawned.seen.includes('hazard-turbulence'), 'turbulence never appeared after 2000 m');
  check(sawBubble && !sawFreeze, `a new hazard shows its bubble without pausing (bubble ${sawBubble}, paused ${sawFreeze})`);
  check(spawned.seen.includes('hazard-noFly'), 'no-fly zone never appeared after 8000 m');
  check(spawned.seen.includes('hazard-birds'), 'birds never appeared after 10000 m');

  // 3. Turbulence delays a tap.
  await start();
  await hold();
  await scene(() => { const s = game.scene.getScene('game'); s.storms = []; s.turbs.push({ x: 0, w: 288, y: 0, h: 448 }); });
  await p.waitForTimeout(80); await dismiss(); await p.waitForTimeout(40);
  const t = await scene(() => new Promise(res => { const s = game.scene.getScene('game'); const f0 = s.flaps || 0; s.flap(); const now = (s.flaps || 0) - f0;
    setTimeout(() => res({ now, later: (s.flaps || 0) - f0, inTurb: s.inTurb }), 400); }));
  check(t.inTurb, 'plane should be in the turbulence zone');
  check(t.now === 0, `tap in turbulence should not act at once (${t.now} applied)`);
  check(t.later === 1, `tap in turbulence should act after a delay (${t.later} applied)`);
  // Control: outside turbulence the same tap acts at once.
  await scene(() => { const s = game.scene.getScene('game'); s.turbs = []; });
  await p.waitForTimeout(60);
  const u = await scene(() => { const s = game.scene.getScene('game'); const f0 = s.flaps || 0; s.flap(); return (s.flaps || 0) - f0; });
  check(u === 1, `tap outside turbulence should act at once (${u} applied)`);
  // Turbulence is a patch: flying under it is smooth.
  await scene(() => { const s = game.scene.getScene('game'); s.plane.y = 300; s.plane.vy = 0; s.turbs.push({ x: 0, w: 288, y: 40, h: 100 }); });
  await p.waitForTimeout(60);
  const under = await scene(() => game.scene.getScene('game').inTurb);
  check(!under, 'flying under a turbulence patch should not count as inside it');

  // 4. A no-fly zone ends the flight with its own reason.
  await start();
  await scene(() => { const s = game.scene.getScene('game'); s.storms = []; s.nextStormAt = 1e9; s.addNoFlyAt(s.plane.x + 10, s.plane.y + 200, 90); });
  await p.waitForTimeout(100); await dismiss();
  await scene(() => { game.scene.getScene('game').graceUntil = 0; });   // skip the post-tip breather (tested in controls.cjs)
  await p.waitForTimeout(300);
  let r = await scene(() => game.scene.getScene('game').result);
  check(r && /Restricted/.test(r.reason), `no-fly zone should end the flight as restricted airspace, got ${r && r.reason}`);

  // 5. A bird strike ends the flight.
  await start();
  await scene(() => { const s = game.scene.getScene('game'); s.storms = []; s.nextStormAt = 1e9; s.addFlock(s.plane.x + 20, s.plane.y); });
  await p.waitForTimeout(100); await dismiss();
  await scene(() => { game.scene.getScene('game').graceUntil = 0; });   // skip the post-tip breather (tested in controls.cjs)
  for (let i = 0; i < 10; i++) { await scene(() => { const s = game.scene.getScene('game'); if (s.state === 'playing') { s.plane.vy = 0; s.birds.forEach(f => { f.y = s.plane.y + 2; f.phase = 0; }); } }); await p.waitForTimeout(40); }
  r = await scene(() => game.scene.getScene('game').result);
  check(r && /Bird/.test(r.reason), `birds should end the flight as a bird strike, got ${r && r.reason}`);

  console.log({ fails, errs });
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
