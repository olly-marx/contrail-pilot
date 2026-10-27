// The player's second knob, contrail care c (src/sim/player.js, 2026-10-26). c = 0 must fly exactly as the
// barrier-only (careless) player did before the knob, and c = 1 exactly as the careful one: the golden distances below
// were flown by the code before the knob (identical, checked when it was added; re-flown 2026-10-26 on the skies of the
// plane's own random stream, again identical to the pre-knob code). c = 0.5 must differ from both on
// some sky (the knob does something in between). Comet, crashes on, s = 0.8 and 1, seeds 1-6. Plain Node.
// 0.12.0: re-flown DELIBERATELY for the new storms (STORMS startGap 200, gapShrinkPerPair 2): the pre-knob player (src/sim/player.js
// at 7841754^, careful false/true) flown on today's world gives these exact numbers, so care 0 / 1 are still the pre-knob players.
// plan: 'classic' throughout: the golden numbers were flown before threat-first planning (2026-10-26).
// The bird planner and the faster s = 1 climb (2026-10-26) are switched off here (__plantOldHazards): they change some
// s = 1 flights (4 of 24 differed by up to 50 km), and this test is about the care knob, not them.
// PLANT=care weakens the contrail term (x 0.5): must FAIL.
// Run: node tests/sim-care.cjs
const GOLD = {
  care0: [10530.619, 9586.502, 8218.673, 8204.153, 10519.428, 9135.647, 10976.856, 9780.52, 8082.072, 9022.377, 10800.35, 10904.331],
  care1: [9595.196, 9817.717, 6401.681, 8206.227, 10050.65, 1122.944, 10358.701, 9896.634, 8941.428, 10703.444, 10945.107, 10879.436],
};
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const P = await import('../src/sim/player.js');
  if (process.env.PLANT === 'care') P.__plantCareHalf();
  P.__plantOldHazards();   // the golden predates the bird planner and the faster s=1 climb (2026-10-26): it tests the care knob on the player it was flown with
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fly = (opts, seed) => { const w = createWorld(comet, seed); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60); w.explain = () => false; w.nextAirport.worldX = 1e12;
    const p = P.makePlayer({ ...opts, plan: 'classic', seed }); for (let i = 0; i < 200000 && w.state === 'playing'; i++) { if (p.wantsFlap(w)) w.applyFlap(); w.step(16.67 / 1000); } return Math.round(w.distancePx * 1000) / 1000; };
  const fails = [], got = { care0: [], care1: [], care5: [] };
  // GATE form (tools/gate.sh sets GATE=1): a SUBSET of the same skies, compared with the SAME golden numbers by index (never new skies).
  const SKIES = process.env.GATE ? (process.env.SKIES || '3').split(',').map(Number) : [1, 2, 3, 4, 5, 6], idx = [];
  for (const [si, skill] of [0.8, 1].entries()) for (const seed of SKIES) { idx.push(si * 6 + seed - 1); for (const [k, care] of [['care0', 0], ['care1', 1], ['care5', 0.5]]) got[k].push(fly({ skill, care }, seed)); }
  for (const k of ['care0', 'care1']) if (JSON.stringify(got[k]) !== JSON.stringify(idx.map(i => GOLD[k][i]))) fails.push(`${k}: ${JSON.stringify(got[k])} != before-the-knob ${JSON.stringify(idx.map(i => GOLD[k][i]))}`);
  if (got.care5.every((v, i) => v === got.care0[i] || v === got.care1[i])) fails.push(`c = 0.5 flies like c = 0 or c = 1 on every sky: the knob does nothing in between (${JSON.stringify(got.care5)})`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: care 0 and 1 fly exactly as the barrier-only and careful players did before the knob (${idx.length} skies each); care 0.5 flies differently`);
})();
