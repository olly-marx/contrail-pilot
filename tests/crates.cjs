// SPECIAL DELIVERY CRATES (src/sim/crates.js, src/storyboard.js crate stories; the user, 2026-11-24). Plain Node, the sim engine.
// 1. Some hard offers are special deliveries (crate: true, 3+ stops); the board still makes easy/medium/hard by slot.
// 2. With one active and the pickup reached, the flight's path runs from here over every crate stop to the last stop (one flight).
// 3. Over the crate stop's runway the drop is the crate (not a tree); it falls fast and lands a short way behind: dropped over the
//    runway's start it lands ON the runway (delivered); dropped well before, it misses; a runway passed with no crate is a miss.
// 4. onFlight: a delivered crate reaches and pays its stop (no landing there needed); a miss costs a heart; LANDING at a crate stop
//    does not count.
// Plants: tools/plants.tsv, test crates. Run: node tests/crates.cjs
(async () => {
  const B = await import('../src/storyboard.js'), M2 = await import('../src/missions2.js'), { routeFor } = await import('../src/aim.js');
  const { createWorld } = await import('../src/sim/world.js'), CF = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, seenTips: ['*'], tours: ['*'],
    landings: 120, flights: 200, seeds: 3000, crystals: 20, bestDistance: 25000, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} } };
  // 1.
  const { prepareSave } = await import('../src/save.js'); const s = prepareSave(structuredClone(base)); const offers = [];
  for (let q = 0; q < 12; q++) { s.storyBoard = [null, null, null]; const o = B.makeOffer(s, 2); if (o) offers.push(o); }
  const crates = offers.filter(o => o.crate);
  check(crates.length >= 2 && crates.every(o => o.stops.length >= 3 && o.level === 'hard' && !o.oneGo && o.payMul === B.CRATE.pay), `some hard offers are special deliveries: ${offers.map(o => `${o.stops.length}${o.crate ? 'C' : ''}`).join(' ')}`);
  const o = structuredClone(crates[0]); o.needs = [];
  // 2.
  s.storyBoard = [null, null, o]; s.city = o.stops[0]; B.accept(s, o.id);
  check(B.landedAt(s, o.stops[0]), 'the pickup is a landing');
  const drops = B.crateStops(s), last = o.stops[o.stops.length - 1];
  check(drops.length === o.stops.length - 2 && drops[0] === o.stops[1], `crate stops: ${drops}`);
  const path = routeFor(s); const at = c => path.indexOf(c);
  check(drops.every(c => at(c) > 0) && at(last) > Math.max(...drops.map(at)) && drops.every((c, i) => !i || at(c) > at(drops[i - 1])), `one flight over ${drops} to ${last}: ${path.slice(0, 12)}`);
  check(B.landedAt(s, drops[0]) === null && (B.activeStory(s).reached || 0) === 1, 'landing at a crate stop does not count');
  // 3. In the engine.
  const fly = () => { const w = createWorld(s, 7); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60); w.frozen = false; return w; };
  const w = fly();
  check(JSON.stringify(w.crates) === JSON.stringify(drops), `the flight carries a crate for each stop: ${w.crates}`);
  const runwayAt = (w, x) => { w.runways = []; w.addRunway(w.distancePx + x - CF.PLANE.x, drops[0]); return w.runways[0]; };
  const fall = w => { for (let i = 0; i < 600 && w.cratesFalling.length; i++) { for (const r of w.runways) r.x -= w.speed / 60; w.updateCrates(1 / 60); } };   // (the ground and its runway scroll by at the flight's speed)
  w.parcels = 3; const parcels0 = w.parcels;
  runwayAt(w, w.plane.x + 20);   // the runway starts just ahead of the plane
  check(w.crateDue(), 'over the runway a crate is due');
  w.dropParcel();
  check(w.cratesFalling.length === 1 && w.parcels === parcels0, 'the drop is the crate, not a tree');
  fall(w);
  check(JSON.stringify(w.crateResult().delivered) === JSON.stringify([drops[0]]), `dropped over the runway's start it lands on it: ${JSON.stringify(w.crateResult())}`);
  const w2 = fly(); runwayAt(w2, w2.plane.x + 250);   // well before the runway
  check(w2.crateDue(), 'a runway coming up is due');
  w2.dropParcel(); fall(w2);
  check(w2.crateResult().missed[0] === drops[0] && !w2.crates.length, `dropped far too early it misses, and this flight's other crates are off: ${JSON.stringify(w2.crateResult())}`);
  const w3 = fly(); w3.crateAirportPassed(drops[0]);
  check(w3.crateResult().missed[0] === drops[0], 'a runway passed with no crate is a miss');
  // 4. onFlight.
  const h0 = B.heartsLeft(B.activeStory(s)), seeds0 = s.seeds;
  M2.onFlight(s, { landed: true, landedAt: 'NOWHERE', crates: { delivered: [], missed: [drops[0]] }, distance: 1000 });
  check(B.heartsLeft(B.activeStory(s)) === h0 - 1 && s.storyHurt && s.storyHurt.crate === drops[0], `a missed crate costs a heart: ${h0} -> ${B.heartsLeft(B.activeStory(s))}`);
  M2.onFlight(s, { landed: true, landedAt: 'NOWHERE', crates: { delivered: [drops[0]], missed: [] }, distance: 1000 });
  const a = B.activeStory(s);
  check(a && a.reached === 2 && s.seeds > seeds0, `a delivered crate reaches and pays its stop: reached ${a && a.reached}, seeds ${seeds0} -> ${s.seeds}`);
  if (fails.length) { console.log('FAIL crates\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS crates (special delivery offers, one flight over every crate stop, the crate falls onto the runway or misses, delivered stops pay, misses cost a heart)');
})();
