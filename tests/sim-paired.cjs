// The same seed is the same sky, however you fly (2026-10-26). Draws that happen only because of how you fly (the
// contrail puff's wobble, turbulence kicks and judder) come from the plane's own stream (rngPlane), so they never
// shift what spawns. Two very different pilots (one hugging y = 120, one y = 300, so different icy air, contrails
// and turbulence) fly the same seed 15,000 km with crashes and heat off: every storm gap, icy-air patch and bird
// flock they meet must be identical. Plain Node.
// PLANT=1 routes the plane's draws back into the physics stream: must FAIL.
// Run: node tests/sim-paired.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { CLIMATE } = await import('../src/config.js');
  CLIMATE.dangerLine = Infinity;
  const save = { tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fly = (seed, yAim) => {
    const w = createWorld(save, seed);
    if (process.env.PLANT) { w.planeBetween = w.between; w.planeFloatBetween = w.floatBetween; }
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
    const seen = new Set(), spawns = []; let puffs = 0, bumps = 0;
    const ac = w.addContrail.bind(w); w.addContrail = t => { puffs++; ac(t); };
    while (w.distancePx < 15000 && w.state === 'playing') {
      if (w.plane.y > yAim && w.plane.vy > -40) w.applyFlap();
      const vy = w.plane.vy; w.step(16.67 / 1000); if (w.bumped && Math.abs(w.plane.vy - vy) > 100) bumps++;
      for (const s of w.storms) if (!seen.has(s)) { seen.add(s); spawns.push(`storm ${s.noFly ? 'nofly' : ''} ${s.rects[0].height.toFixed(3)}`); }
      for (const i of w.issrs) if (!seen.has(i)) { seen.add(i); spawns.push(`icy ${i.y} ${i.width}x${i.height} ${i.fake ? 'fake' : ''}`); }
      for (const f of w.birds) if (!seen.has(f)) { seen.add(f); spawns.push(`birds ${f.y.toFixed(3)} ${f.birds.length}`); }
    }
    return { spawns, puffs, turbs: w.turbs.length };
  };
  const fails = [];
  for (const seed of [1, 2, 3]) {
    const a = fly(seed, 120), b = fly(seed, 300);
    if (a.puffs === b.puffs) fails.push(`seed ${seed}: the two pilots made the same number of contrails (${a.puffs}): not a real test`);
    const n = Math.min(a.spawns.length, b.spawns.length), i = a.spawns.findIndex((s, k) => k < n && s !== b.spawns[k]);
    if (i >= 0) fails.push(`seed ${seed}: spawn ${i} differs: "${a.spawns[i]}" vs "${b.spawns[i]}" (contrails ${a.puffs} vs ${b.puffs})`);
    if (Math.abs(a.spawns.length - b.spawns.length) > 3) fails.push(`seed ${seed}: ${a.spawns.length} vs ${b.spawns.length} spawns`);
  }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS: two very different pilots meet identical storms, icy air and birds for 15,000 km on 3 seeds');
})();
