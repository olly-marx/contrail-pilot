// Week-2 flight check: takeoff, day/night radiation, skip one airport, land at the next,
// overheat ends the run, ground away from a runway is still a crash.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/flight.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

async function fly(p, { landAt, keepCool = false }) {
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn');
  // TAKE OFF restarts the scene; wait until it is built (CI failed twice reading nextAirport too early).
  await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.sys.isActive() && s.nextAirport && s.state !== 'idle'; }, null, { timeout: 15000 });
  // Hazards have their own test; keep this flight about takeoff, day/night and landing.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.nextTurbAt = s.nextBirdsAt = 1e9; });
  const log = { states: new Set(), maxCo2: 0, sawNight: false, heatSamples: [] };
  for (let i = 0; i < 2400; i++) {   // (0.9.1: the 2nd airport is 5,200+ km away)
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
  // Fresh progress for every load (so upgrades don't change the physics), flight school already done.
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] })); });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];

  // Passing an airport and landing at the next one: since 0.9.1 legs are 2,600-3,400 km, so the 2nd airport is
  // 5,200+ km away, past where a plane with no upgrades overheats (~5,000 km). This check is about the landing
  // mechanics, not heat, so the heat is held down for it (keepCool); the heat checks below use real physics.
  const a = await fly(p, { landAt: 1, keepCool: true });
  console.log('land-at-2nd:', JSON.stringify(a));
  if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
  if (!a.result || !a.result.landed) fails.push('did not land');
  else if (a.result.landedAt !== a.second) fails.push(`landed at wrong airport ${a.result.landedAt}, want the 2nd on the path, ${a.second}`);   // (the path depends on the chosen way: src/route.js)
  if (!a.states.includes('takeoff') || !a.states.includes('landing')) fails.push('missing takeoff/landing state');
  if (!a.sawNight) fails.push('never reached night');

  // Radiation, deterministically: lay a line of contrails, force day or night, count hits.
  for (const [label, elapsed, key] of [['night', 16, 'heatTrapped'], ['day', 1, 'sunBlocked']]) {
    await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await p.waitForTimeout(2200);
    const before = await p.evaluate((elapsed) => { const s = game.scene.getScene('game');
      s.clock = elapsed;
      s.heat = 0; s.sunBlocked = 0; s.heatTrapped = 0; s.storms.forEach(st => st.parts.forEach(r => r.destroy())); s.storms = [];
      s.nextStormAt = 1e9;   // no storms during the probe
      return s.heat; }, elapsed);
    for (let i = 0; i < 20; i++) {
      await p.evaluate(() => { const s = game.scene.getScene('game'); s.plane.y = 100; s.plane.vy = 0;
        if (s.contrails.length < 72) for (let x = 0; x < 288; x += 4) { const r = s.add.rectangle(x, 200, 4, 4, 0xffffff).setOrigin(0); r.born = s.time.now; s.contrailLayer.add(r); s.contrails.push(r); } });
      await p.waitForTimeout(150);
    }
    const r = await p.evaluate(() => { const s = game.scene.getScene('game'); return { sunBlocked: s.sunBlocked, heatTrapped: s.heatTrapped, heat: Math.round(s.heat), state: s.state }; });
    console.log('radiation ' + label + ':', JSON.stringify(r));
    if (!(r[key] > 0)) fails.push(label + ': no ' + key);
    if (label === 'night' && r.sunBlocked > 0) fails.push('sunbeams at night');
    if (label === 'day' && r.heatTrapped > 0) fails.push('heat trapped by day');
  }

  // Overheat: force heat to the line mid-flight.
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await p.waitForTimeout(2600);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.heat = 100; });   // past the take-off breather
  await p.waitForTimeout(200);
  const oh = await p.evaluate(() => game.scene.getScene('game').result);
  console.log('overheat:', JSON.stringify(oh));
  if (!oh || oh.landed) fails.push('overheat did not end the run');

  // Ground away from a runway is a crash.
  await p.goto(URL); await ready(p); await p.waitForTimeout(600); await p.click('#goBtn'); await started(p); await p.waitForTimeout(6000);
  const cr = await p.evaluate(() => game.scene.getScene('game').result);
  console.log('no-tap:', JSON.stringify(cr));
  if (!cr || cr.landed) fails.push('ground away from runway did not crash');

  console.log('errors', errs);
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
