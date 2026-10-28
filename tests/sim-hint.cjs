// The gap-flying player can use the next-gap hint (sim engine, 2026-10-27): with useHint, a plane whose kit has a hint
// (GAP_HINT.lead > 0) plans for a gap whose column is still off-screen; without it, or with no hint, it plans exactly as
// before. twinFull (hintLevel 6, lead 1.5 s), one 6,000 km flight: the safe band differs on some frames with useHint, and
// never differs for a Comet (no hint). Plain Node. PLANT=blind (the player ignores the hint): must FAIL.
// Run: node tests/sim-hint.cjs
(async () => {
  const P = await import('../src/sim/player.js');
  const { createWorld } = await import('../src/sim/world.js');
  if (process.env.PLANT === 'blind') P.__plantHintBlind();
  const fly = fleet => { const w = createWorld({ tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2, fleet, simSeed: 3 }, 3);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
    const a = P.makePlayer({ skill: 1, seed: 3 }), b = P.makePlayer({ skill: 1, seed: 3, useHint: true });
    let differ = 0;
    for (let i = 0; i < 100000 && w.state === 'playing' && w.distancePx < 6000; i++) {
      const ba = a._band(w), bb = b._band(w); if (ba[0] !== bb[0] || ba[1] !== bb[1]) differ++;
      if (a.wantsFlap(w)) w.applyFlap(); b.wantsFlap(w); w.step(16.67 / 1000);
    }
    return { differ, hint: w.kit.hintLevel };
  };
  const twin = fly({ plane: 'twin', planes: { twin: { engines: 4, body: 4, cabin: 4 } }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 } });
  const comet = fly({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} });
  const fails = [];
  if (!(twin.hint > 0)) fails.push(`twinFull has no hint (hintLevel ${twin.hint}): the check has no power`);
  if (!(twin.differ > 0)) fails.push(`twinFull: useHint never changed the plan (0 frames)`);
  if (comet.differ !== 0) fails.push(`Comet (hintLevel ${comet.hint}): useHint changed the plan on ${comet.differ} frames, want 0`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: useHint plans ahead with a hint (twinFull: ${twin.differ} frames differ) and changes nothing without one (Comet: 0)`);
})();
