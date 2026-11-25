// SPECIAL DELIVERY CRATES (src/sim/crates.js, src/storyboard.js crate stories; the user, 2026-11-24). Plain Node, the sim engine.
// 1. Some hard offers are special deliveries (crate: true, 3+ stops); the board still makes easy/medium/hard by slot.
// 2. With one active and the pickup reached, the flight's path runs from here over every crate stop to the last stop (one flight).
// 3. Over the crate stop's runway the drop is the crate (not a tree); it falls fast and lands a short way behind: dropped over the
//    runway it floats onto it (delivered) only when let go the right way before it (at 150 px/s from 150 px up: about 50-200 px early);
//    let go over the runway it floats past (missed); far too early it falls short; a runway passed with no crate is a miss.
// 4. onFlight (Oliver, 2026-11-25): the delivery is ONE flight from the pickup: every crate on its runway AND the landing at the last stop
//    reach and pay every stop together. A missed crate, a crash, or a landing anywhere else costs one heart, reaches nothing, and a
//    plane that landed away must fly back to the pickup (no heart on the way back) before the crates are loaded again.
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
  for (const c of crates) check(c.km <= B.reachOf(s), `a special delivery is one flight: its whole way ${c.km} km fits the reach ${B.reachOf(s)}`);
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
  const cruise = w => { w.speed = 150; w.plane.y = 150; };
  w.parcels = 3; const parcels0 = w.parcels; cruise(w);
  runwayAt(w, w.plane.x + 120);   // the runway starts 120 px ahead: the floating crate carries on onto it
  check(w.crateDue(), 'over the runway a crate is due');
  w.dropParcel();
  check(w.cratesFalling.length === 1 && w.parcels === parcels0, 'the drop is the crate, not a tree');
  fall(w);
  check(JSON.stringify(w.crateResult().delivered) === JSON.stringify([drops[0]]), `let go 120 px before the runway it floats onto it: ${JSON.stringify(w.crateResult())}`);
  const w4 = fly(); cruise(w4); runwayAt(w4, w4.plane.x - 30); w4.dropParcel(); fall(w4);
  check(w4.crateResult().missed[0] === drops[0], `let go over the runway it floats past the end: ${JSON.stringify(w4.crateResult())}`);
  const w2 = fly(); cruise(w2); runwayAt(w2, w2.plane.x + 450);   // far too early
  check(w2.crateDue(), 'a runway coming up is due');
  w2.dropParcel(); fall(w2);
  check(w2.crateResult().missed[0] === drops[0] && !w2.crates.length, `dropped far too early it misses, and this flight's other crates are off: ${JSON.stringify(w2.crateResult())}`);
  const w3 = fly(); w3.crateAirportPassed(drops[0]);
  check(w3.crateResult().missed[0] === drops[0], 'a runway passed with no crate is a miss');
  // 4. onFlight: the delivery is ONE flight (Oliver, 2026-11-25). Each failure is one heart, reaches nothing, and the plane flies back to the pickup.
  const A = o.stops[0], other = ['PARIS', 'MADRID', 'ROME', 'BERLIN', 'CAIRO'].find(c => !o.stops.includes(c)), story = () => B.activeStory(s), hearts = () => B.heartsLeft(story());
  story().hearts = story().heartsLeft = 9;   // (enough hearts for every case below)
  let got = [];
  const storySeeds = () => got.filter(m => /^story:/.test(m.key)).reduce((a, m) => a + (m.prize.seeds || 0), 0);
  const flyFrom = (from, r) => { s.city = from; got = M2.onFlight(s, { distance: 1000, crates: { delivered: [], missed: [] }, ...r }); if (r.landed) s.city = r.landedAt; };
  let h0 = hearts();
  flyFrom(A, { landed: true, landedAt: other, crates: { delivered: [], missed: [drops[0]] } });
  check(hearts() === h0 - 1 && s.storyHurt && s.storyHurt.crate === drops[0] && story().reached === 1 && story().back && s.aimCity === A, `a missed crate costs a heart and sends the plane back to ${A}: ${h0} -> ${hearts()}, ${JSON.stringify(s.storyHurt && s.storyHurt.crate)}, back ${story().back}, aim ${s.aimCity}`);
  check(!B.crateStops(s).length, 'away from the pickup the flight carries no crates');
  h0 = hearts(); flyFrom(other, { landed: true, landedAt: other === 'PARIS' ? 'MADRID' : 'PARIS' });
  check(hearts() === h0, 'flying back to the pickup may take a landing on the way (no heart)');
  flyFrom(s.city, { landed: true, landedAt: A });
  check(!story().back && !s.storyHurt && hearts() === h0 && JSON.stringify(B.crateStops(s)) === JSON.stringify(drops) && s.aimCity === last, `back at ${A}: the crates are on board again and the destination is ${last} (${s.aimCity})`);
  h0 = hearts();
  flyFrom(A, { landed: true, landedAt: drops[0], crates: { delivered: drops, missed: [] } });
  check(hearts() === h0 - 1 && story().reached === 1 && storySeeds() === 0 && s.storyHurt && s.storyHurt.early === drops[0], `crates delivered but a landing before ${last} costs a heart and pays nothing: ${h0} -> ${hearts()}, reached ${story().reached}, story seeds ${storySeeds()}`);
  flyFrom(s.city, { landed: true, landedAt: A });
  h0 = hearts(); flyFrom(A, { landed: false, crates: { delivered: drops.slice(0, 1), missed: [] } });
  check(hearts() === h0 - 1 && story().reached === 1 && !story().back, `a crash on the delivery costs one heart (not two) and the plane is still at ${A}: ${h0} -> ${hearts()}`);
  const pay = o.pay.seeds;
  flyFrom(A, { landed: true, landedAt: last, crates: { delivered: drops, missed: [] } });
  check(!s.storyActive && storySeeds() === pay && got.filter(m => /^story:/.test(m.key)).length === o.stops.length - 1 && (s.storiesDone || 0) === 1, `every crate on its runway and the landing at ${last}: the whole story is done and paid at once (${storySeeds()} of ${pay} seeds)`);
  if (fails.length) { console.log('FAIL crates\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS crates (special delivery offers, one flight over every crate stop, the crate falls onto the runway or misses, the delivery counts only whole, any failure is one heart and back to the pickup)');
})();
