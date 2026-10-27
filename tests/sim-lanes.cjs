// Storm gaps always keep a clear lane (Node port of tests/lanes.cjs, test-speed batch 2): no icy air filling a storm gap (so a
// contrail-free night is possible) and no flock of birds sitting in a gap as the plane goes through it. Flies a long stretch on the
// sim engine (src/sim/world.js = the game's own rules) with birds and icy air turned up to always spawn, checking every step.
// PLANTS (edit src/sim/rules.js, each must FAIL this test; the browser lanes.cjs must fail the same ones before it is retired):
//   addIssr guard:  sed -i 's/      if (!blocks) {/      if (true) {/' src/sim/rules.js
//   flock guard:    sed -i 's/if (!this.flockBlocksGap(x, t, FLOCK_HALF)) y = t;/y = t;/' src/sim/rules.js
// Plain Node, ~seconds. Run: node tests/sim-lanes.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { HAZARDS, ISSR, PLANE } = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fresh = seed => { const w = createWorld(save, seed); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60); w.explain = () => false;
    w.hitsStorm = () => false; w.hitBird = () => false; w.finish = () => {}; return w; };

  // 1. The OTHER half of the rule: with a storm already ahead, 200 icy patches must never fill its gap.
  {
    const w = fresh(1);
    w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.issrs.forEach(i => { i.x = -999; });
    w.addStormPairAt(400, 230, 130);   // a storm just off the right edge, gap 165..295
    const st = w.storms[w.storms.length - 1], r = st.rects[0]; let blocked = 0, made = 0;
    for (let i = 0; i < 200; i++) { const n = w.issrs.length; w.addIssr(); if (w.issrs.length > n) made++; if (!w.laneClear(r.x, r.width, r.height, st.rects[1].y)) blocked++; }
    check(made > 20, `the guard check placed icy air (${made} of 200 tries): the test would prove nothing otherwise`);
    check(blocked === 0, `icy air filled the gap of a storm that was already ahead ${blocked} times in 200 tries`);
  }

  // 1b. The birds' half of the same direct check (found by planting: the long run below almost never has a flock arrive in a gap by
  // chance, so it could not see the guard in addFlock go missing): a storm placed so a flock spawned now would meet the plane in its
  // gap; 300 flocks must never overlap that gap.
  {
    const w = fresh(3), B = HAZARDS.birds, v = Math.max(1, w.speed);
    w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.birds.length = 0;
    const t = (390 + 20 - w.plane.x) / (v + B.extraSpeed), rx = w.plane.x + v * t;
    w.addStormPairAt(rx, 230, 130);   // gap 165..295 at the x where a new flock would reach the plane
    const st = w.storms[w.storms.length - 1], gTop = st.rects[0].height, gBot = st.rects[1].y; let made = 0, inGap = 0;
    for (let i = 0; i < 300; i++) {
      const n = w.birds.length; w.addFlock();
      if (w.birds.length > n) { made++; const f = w.birds[w.birds.length - 1];
        if (f.y - 2 * 9 - 4 - B.wobble < gBot && f.y + 2 * 9 + 16 + B.wobble > gTop) inGap++; w.birds.length = n; }
    }
    check(made > 20, `the bird guard check placed flocks (${made} of 300 tries): the test would prove nothing otherwise`);
    check(inGap === 0, `${inGap} of ${made} flocks were placed where they would sit in the gap as the plane arrives`);
  }

  // 2. A long run with spawns cranked up, every step checked (same numbers as the browser test).
  const w = fresh(2);
  HAZARDS.birds.chance = 1; HAZARDS.birds.every = 250; ISSR.spawnChance = 1;
  w.distancePx = 9800; w.nextBirdsAt = 9900; w.nextIssrAt = 9800; w.nextStormAt = 9800 + 100; w.nextAirport.worldX = 1e9;
  const L = { gapsSeen: 0, issrBlocked: [], birdBlocked: [], flocks: 0, issrs: 0 }, seenFlocks = new Set(), seenIssrs = new Set(), passed = new Set();
  let steps = 0;
  while (steps < 400000 && !(L.gapsSeen >= 30 && L.flocks >= 12 && L.issrs >= 22)) {
    w.step(16.67 / 1000); steps++; w.heat = 0;
    if (w.plane.y > 220 && w.plane.vy > -40) w.applyFlap();
    w.birds.forEach(f => seenFlocks.add(f)); w.issrs.forEach(i => seenIssrs.add(i)); L.flocks = seenFlocks.size; L.issrs = seenIssrs.size;
    for (const st of w.storms) {
      const r = st.rects[0], gTop = r.height, gBot = st.rects[1].y;
      if (r.x > 390) continue;
      if (!w.laneClear(r.x, r.width, gTop, gBot)) L.issrBlocked.push({ d: Math.round(w.distancePx), gTop, gBot });
      if (r.x < w.plane.x + PLANE.w && r.x + r.width > w.plane.x && !passed.has(st)) {
        passed.add(st); L.gapsSeen++;
        const inGap = w.birds.some(f => f.birds.some(bd => bd.x < w.plane.x + PLANE.w + 20 && bd.x + 12 > w.plane.x - 10 && bd.y < gBot && bd.y + 10 > gTop));
        if (inGap) L.birdBlocked.push({ d: Math.round(w.distancePx), gTop, gBot });
      }
    }
  }
  check(L.gapsSeen >= 20 && L.flocks >= 8 && L.issrs >= 15, `the run should see plenty of storms, flocks and icy air: ${JSON.stringify({ gaps: L.gapsSeen, flocks: L.flocks, issrs: L.issrs, steps })}`);
  check(L.issrBlocked.length === 0, `icy air filled a storm gap ${L.issrBlocked.length} steps, e.g. ${JSON.stringify(L.issrBlocked[0])}`);
  check(L.birdBlocked.length === 0, `birds sat in a storm gap as the plane went through ${L.birdBlocked.length} times, e.g. ${JSON.stringify(L.birdBlocked[0])}`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS sim-lanes (${L.gapsSeen} gaps, ${L.flocks} flocks, ${L.issrs} icy patches, ${steps} steps)`);
})();
