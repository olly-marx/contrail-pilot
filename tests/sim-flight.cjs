// Week-2 flight check, Node port of tests/flight.cjs (test-speed batch 2): takeoff, day/night radiation, skip one airport and land at the
// next, overheat ends the run, ground away from a runway is a crash, a storm hit ends the flight. Runs on the sim engine
// (src/sim/world.js = the game's own rules, proven identical by tests/sim-equiv.cjs), no browser.
// PLANTS (edit src/sim/rules.js or src/sim/physics.js; each must FAIL this test; the browser flight.cjs must fail the same ones before it is retired):
//   landing:    sed -i 's/if (rw) this.land(rw);/if (false) this.land(rw);/' src/sim/rules.js
//   overheat:   sed -i "s/if (this.heat >= CLIMATE.dangerLine) { this.finish/if (false) { this.finish/" src/sim/rules.js
//   ground:     sed -i "s/else this.finish({ reason: 'You hit the ground!' });/else {}/" src/sim/rules.js
//   night heat: sed -i 's/this.heatTrapped += rate \* dt;/this.heatTrapped += 0;/' src/sim/rules.js
//   day sun:    sed -i 's/this.sunBlocked += -rate \* dt;/this.sunBlocked += 0;/' src/sim/rules.js
//   storm hit:  sed -i 's/      if (this.hitsStorm(s)) {/      if (false) {/' src/sim/rules.js
// Plain Node, seconds. Run: node tests/sim-flight.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { CLIMATE } = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const DT = 16.67 / 1000;
  const fresh = (seed = 1) => { const w = createWorld(save, seed); w.explain = () => false; return w; };
  const airborne = w => { for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(DT); return w; };
  const calm = w => { w.nextStormAt = w.nextTurbAt = w.nextBirdsAt = 1e9; w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.birds = []; };

  // 1. Pass the first airport and land at the second, flown by the same hand-rolled pilot as the browser test (hazards off but storms live).
  {
    const w = fresh(1); w.nextTurbAt = w.nextBirdsAt = 1e9;
    const states = new Set(); let sawNight = false, steps = 0;
    const second = w.path[2];
    while (w.state !== 'over' && steps < 600000) {
      const toA = w.nextAirport.worldX - w.distancePx;
      const approach = w.airportIndex === 1 && toA < 300 && toA > -150, landing = approach && toA < 60;
      const next = w.storms.find(st => st.rects[0].x + 44 > w.plane.x);
      const target = landing ? 999 : next ? next.rects[0].height + (next.rects[1].y - next.rects[0].height) / 2 - 2 : approach ? w.groundedY() - 60 : 200;
      if (w.state === 'playing' && w.plane.y > target && w.plane.vy > -50) w.applyFlap();
      w.step(DT); steps++; states.add(w.state); if (w.isDay === false) sawNight = true;
    }
    const r = w.result;
    check(r && r.landed, `did not land: ${JSON.stringify(r && { reason: r.reason, distance: r.distance })}`);
    if (r && r.landed) check(r.landedAt === second, `landed at wrong airport ${r.landedAt}, want the 2nd on the path, ${second}`);
    check(states.has('takeoff') && states.has('landing'), 'missing takeoff/landing state');
    check(sawNight, 'never reached night');
  }

  // 2. Radiation, deterministically: a line of contrails, day or night forced by the clock, no storms; heat must be trapped at night, sun blocked by day.
  for (const [label, elapsed, key, other] of [['night', 16, 'heatTrapped', 'sunBlocked'], ['day', 1, 'sunBlocked', 'heatTrapped']]) {
    const w = airborne(fresh(2)); calm(w);
    w.clock = elapsed; w.heat = 0; w.sunBlocked = 0; w.heatTrapped = 0; w.storms = [];
    for (let i = 0; i < 400 && !(w[key] > 0 && i >= 90); i++) {
      w.plane.y = 100; w.plane.vy = 0;
      if (w.contrails.length < 72) for (let x = 0; x < 288; x += 4) w.contrails.push({ x, y: 200, born: w.gameTime, view: null });
      w.step(DT);
    }
    check(w[key] > 0, `${label}: no ${key}`);
    check(!(w[other] > 0), label === 'night' ? 'sunbeams at night' : 'heat trapped by day');
  }

  // 3. Overheat: heat forced to the line mid-flight ends the run, for the heat (not a fall).
  {
    const w = airborne(fresh(3)); calm(w); w.graceUntil = 0; w.heat = CLIMATE.dangerLine;
    for (let i = 0; i < 600 && w.state !== 'over'; i++) { if (w.plane.y > 200 && w.plane.vy > -40) w.applyFlap(); w.step(DT); }
    const oh = w.result;
    check(oh && !oh.landed, 'overheat did not end the run');
    check(oh && /too hot/.test(String(oh.reason)), `the run ended, but not because of the heat: ${JSON.stringify(oh && oh.reason)}`);
  }

  // 4. Ground away from a runway is a crash (no taps: the plane falls; nothing else may end it first).
  {
    const w = fresh(4); calm(w);
    for (let i = 0; i < 20000 && w.state !== 'over'; i++) { w.step(DT); w.heat = 0; }
    const cr = w.result;
    check(cr && !cr.landed, 'ground away from runway did not crash');
    check(cr && /ground/.test(String(cr.reason)), `the run ended, but not by hitting the ground: ${JSON.stringify(cr && cr.reason)}`);
  }

  // 5. A storm hit ENDS the flight: a storm column put over the plane ends the run with the storm reason.
  {
    const w = airborne(fresh(5)); calm(w); w.graceUntil = 0; w.plane.y = 180; w.plane.vy = 0; w.addStormPairAt(w.plane.x - 10, 440, 100);
    for (let i = 0; i < 600 && w.state !== 'over'; i++) w.step(DT);
    const st = w.result;
    check(st && !st.landed, 'a storm hit did not end the flight');
    check(st && /storm/i.test(String(st.reason)), `the run ended, but not by the storm: ${JSON.stringify(st && st.reason)}`);
  }

  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS sim-flight');
})();
