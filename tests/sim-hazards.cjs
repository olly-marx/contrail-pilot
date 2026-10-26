// The gap-flying player and birds (sim engine, 2026-10-26): at s = 1 it used to lose ~22% of the flocks it met (it
// kept above or below a flock while it needed to cross its height for the next gap); the look-ahead planner in
// src/sim/player.js times its taps round the birds. Comet, nothing bought, heat off, s = 1, 12 skies to 14,000 km:
//   bird strikes per flock met <= 0.10.
// Plain Node. PLANT=old flies the pre-fix play (the band only, the old flock box): must FAIL.
// Run: node tests/sim-hazards.cjs
(async () => {
  const { simulate } = await import('../src/sim/simulate.js');
  const P = await import('../src/sim/player.js');
  if (process.env.PLANT === 'old') P.__plantOldHazards();
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  let flocks = 0, strikes = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const seen = new Set();
    const r = simulate({ ...comet, simSeed: seed }, { pilot: 'player', skill: 1, careful: true, budget: 0.5, seed, crashes: true, maxKm: 14000, overrides: { CLIMATE: { dangerLine: Infinity } },
      onStep: w => { for (const f of w.birds) if (!seen.has(f) && f.x < w.plane.x) { seen.add(f); flocks++; } } });
    if (/Bird/.test(r.reason || '')) strikes++;
  }
  const rate = strikes / Math.max(1, flocks);
  if (flocks < 15) { console.log(`FAIL\n- only ${flocks} flocks met: the check has no power`); process.exit(1); }
  if (rate > 0.10) { console.log(`FAIL\n- s=1 hit ${strikes} of ${flocks} flocks (${rate.toFixed(3)}), want <= 0.10`); process.exit(1); }
  console.log(`PASS: s=1 hit ${strikes} of ${flocks} flocks (${rate.toFixed(3)} <= 0.10)`);
})();
