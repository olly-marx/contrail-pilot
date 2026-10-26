// Week-2 flight check: takeoff, day/night radiation, skip one airport, land at the next,
// overheat ends the run, ground away from a runway is still a crash.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/flight.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const { throttle } = require('./lib/throttle.js');
const URL = process.env.URL || 'http://localhost:8000/';
// Wait for the plane to be flying (not taking off): what the fixed 2.2-2.6 s waits below were standing in for.
const airborne = p => p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 60000 });
// Wait until the scene has a result (the run ended), however slowly this machine gets there.
const ended = (p, ms) => p.waitForFunction(() => !!game.scene.getScene('game').result, null, { timeout: ms }).catch(() => {});

async function fly(p, { landAt, keepCool = false }) {
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn');
  // TAKE OFF restarts the scene; wait until it is built (CI failed twice reading nextAirport too early).
  await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.sys.isActive() && s.nextAirport && s.state !== 'idle'; }, null, { timeout: 15000 });
  // Hazards have their own test; keep this flight about takeoff, day/night and landing.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextTurbAt = s.nextBirdsAt = 1e9; });
  const log = { states: new Set(), maxCo2: 0, sawNight: false, heatSamples: [] };
  const t0 = Date.now();
  for (let i = 0; Date.now() - t0 < 300000; i++) {   // (it ends when the run does; 5 minutes only guards a stall)
    const r = await p.evaluate(([landAt, keepCool]) => { const s = game.scene.getScene('game');
      if (keepCool && s.heat > 60) s.heat = 60;   // (see the land-at-2nd note below)
      const toA = s.nextAirport.worldX - s.distancePx;
      // Land the way the game teaches: within 300 m of the runway get LOW, then stop tapping near it
      // and let the flare do the rest.
      const approach = s.airportIndex === landAt && toA < 300 && toA > -150;
      const landing = approach && toA < 60;
      const next = s.storms.find(st => st.rects[0].x + 44 > s.plane.x);
      const target = landing ? 999 : next ? next.rects[0].height + (next.rects[1].y - next.rects[0].height) / 2 - 2 : approach ? s.groundedY() - 60 : 200;
      return { tap: s.state === 'playing' && s.plane.y > target && s.plane.vy > -50,
        state: s.state, co2: s.co2Rate, isDay: s.isDay, heat: s.heat, result: s.result || null, second: s.path && s.path[2] }; }, [landAt, keepCool]);
    log.states.add(r.state); log.maxCo2 = Math.max(log.maxCo2, r.co2);
    if (r.isDay === false) log.sawNight = true;
    if (i % 40 === 0) log.heatSamples.push(Math.round(r.heat));
    log.second = r.second;
    if (r.state === 'over') { log.result = r.result; break; }
    if (r.tap) await p.mouse.click(195, 400);
    await p.waitForTimeout(40);
  }
  log.states = [...log.states];
  return log;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await throttle(p);   // THROTTLE=4: rehearse a busy machine (tests/lib/throttle.js)
  // Fresh progress for every load (so upgrades don't change the physics), flight school already done.
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];

  // Passing an airport and landing at the next one, with real heat (0.10.0: legs are 1,800-2,600 km again, so
  // the 2nd airport is within an un-upgraded Comet's heat range; 0.9.1's longer legs needed keepCool here).
  const a = await fly(p, { landAt: 1, keepCool: false });
  console.log('land-at-2nd:', JSON.stringify(a));
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
  if (!a.result || !a.result.landed) fails.push('did not land');
  else if (a.result.landedAt !== a.second) fails.push(`landed at wrong airport ${a.result.landedAt}, want the 2nd on the path, ${a.second}`);   // (the path depends on the chosen way: src/route.js)
  if (!a.states.includes('takeoff') || !a.states.includes('landing')) fails.push('missing takeoff/landing state');
  if (!a.sawNight) fails.push('never reached night');

  // Radiation, deterministically: lay a line of contrails, force day or night, count hits.
  for (const [label, elapsed, key] of [['night', 16, 'heatTrapped'], ['day', 1, 'sunBlocked']]) {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await airborne(p);
    const before = await p.evaluate((elapsed) => { const s = game.scene.getScene('game');
      s.clock = elapsed;
      s.heat = 0; s.sunBlocked = 0; s.heatTrapped = 0; s.storms.forEach(st => st.parts.forEach(r => r.destroy())); s.storms = [];
      s.nextStormAt = 1e9;   // no storms during the probe
      return s.heat; }, elapsed);
    // Lay contrails and let the game run until it has MEASURED something and stepped at least 90 frames (so the
    // "no sunbeams at night / no heat by day" checks have had time to be wrong), not for 20 x 150 ms.
    const f0 = await p.evaluate(() => game.loop.frame);
    for (let i = 0; i < 400; i++) {
      await p.evaluate(() => { const s = game.scene.getScene('game'); s.plane.y = 100; s.plane.vy = 0;
        if (s.contrails.length < 72) for (let x = 0; x < 288; x += 4) { const r = s.add.rectangle(x, 200, 4, 4, 0xffffff).setOrigin(0); s.contrailLayer.add(r); s.contrails.push({ x, y: 200, born: s.time.now, view: r }); } });
      await p.waitForTimeout(150);
      if (await p.evaluate(([key, f0]) => game.scene.getScene('game')[key] > 0 && game.loop.frame - f0 >= 90, [key, f0])) break;
    }
    const r = await p.evaluate(() => { const s = game.scene.getScene('game'); return { sunBlocked: s.sunBlocked, heatTrapped: s.heatTrapped, heat: Math.round(s.heat), state: s.state }; });
    console.log('radiation ' + label + ':', JSON.stringify(r));
    if (!(r[key] > 0)) fails.push(label + ': no ' + key);
    if (label === 'night' && r.sunBlocked > 0) fails.push('sunbeams at night');
    if (label === 'day' && r.heatTrapped > 0) fails.push('heat trapped by day');
  }

  // Overheat: force heat to the line mid-flight.
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await airborne(p);
  await p.evaluate(async () => { const { CLIMATE } = await import('/src/config.js'); const s = game.scene.getScene('game'); s.graceUntil = 0; s.heat = CLIMATE.dangerLine; });   // past the take-off breather (the danger line)
  await ended(p, 15000);   // the game ends the run on its next step; this machine may be slow
  const oh = await p.evaluate(() => game.scene.getScene('game').result);
  console.log('overheat:', JSON.stringify(oh));
  if (!oh || oh.landed) fails.push('overheat did not end the run');
  else if (!/too hot/.test(String(oh.reason))) fails.push(`the run ended, but not because of the heat (a fall to the ground would also end it): ${JSON.stringify(oh.reason)}`);   // (waiting for ANY result let a crash pass for 'overheat')

  // Ground away from a runway is a crash.
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p);
  // No taps: the plane falls to the ground. Nothing else may end the run first (a storm can reach the plane about when the ground does:
  // seen in a full run, 2026-10-24), so there are no storms, birds or turbulence in this step.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextStormAt = s.nextTurbAt = s.nextBirdsAt = 1e9; s.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); s.birds = []; });
  await ended(p, 90000);
  const cr = await p.evaluate(() => game.scene.getScene('game').result);
  console.log('no-tap:', JSON.stringify(cr));
  if (!cr || cr.landed) fails.push('ground away from runway did not crash');
  else if (!/ground/.test(String(cr.reason))) fails.push(`the run ended, but not by hitting the ground: ${JSON.stringify(cr.reason)}`);

  // A storm hit ENDS the flight. collisions.cjs checks which pixels count and the long tests switch hitting off, so this is the only
  // step that checks the consequence: a storm column put over the plane in a real flight must end the run with the storm reason.
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await airborne(p);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextStormAt = s.nextTurbAt = s.nextBirdsAt = 1e9; s.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); s.birds = [];
    s.graceUntil = 0; s.plane.y = 180; s.plane.vy = 0; s.addStormPairAt(s.plane.x - 10, 440, 100); });   // the top column (0..390) covers the plane
  await ended(p, 15000);
  const st = await p.evaluate(() => game.scene.getScene('game').result);
  console.log('storm hit:', JSON.stringify(st && { landed: st.landed, reason: st.reason }));
  if (!st || st.landed) fails.push('a storm hit did not end the flight');
  else if (!/storm/i.test(String(st.reason))) fails.push(`the run ended, but not by the storm: ${JSON.stringify(st.reason)}`);

  console.log('errors', errs);
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
