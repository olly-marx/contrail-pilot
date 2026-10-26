// The player's second knob, contrail care c (src/sim/player.js, 2026-10-26). c = 0 must fly exactly as the
// barrier-only (careless) player did before the knob, and c = 1 exactly as the careful one: the golden distances below
// were flown by the code before the knob (identical, checked when it was added). c = 0.5 must differ from both on
// some sky (the knob does something in between). Comet, crashes on, s = 0.8 and 1, seeds 1-6. Plain Node.
// PLANT=care weakens the contrail term (x 0.5): must FAIL.
// Run: node tests/sim-care.cjs
const GOLD = {
  care0: [8932.92, 8204.153, 8437.363, 8710.458, 8204.153, 2455.844, 10280.856, 9122.802, 9881.273, 9813.339, 9760.845, 8969.096],
  care1: [8721.013, 2282.932, 8243.58, 9584.329, 8896.788, 8243.58, 9909.806, 7974.917, 8542.094, 9903.219, 9262.246, 9584.329],
};
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const P = await import('../src/sim/player.js');
  if (process.env.PLANT === 'care') P.__plantCareHalf();
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fly = (opts, seed) => { const w = createWorld(comet, seed); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60); w.explain = () => false; w.nextAirport.worldX = 1e12;
    const p = P.makePlayer({ ...opts, seed }); for (let i = 0; i < 200000 && w.state === 'playing'; i++) { if (p.wantsFlap(w)) w.applyFlap(); w.step(16.67 / 1000); } return Math.round(w.distancePx * 1000) / 1000; };
  const fails = [], got = { care0: [], care1: [], care5: [] };
  for (const skill of [0.8, 1]) for (let seed = 1; seed <= 6; seed++) for (const [k, care] of [['care0', 0], ['care1', 1], ['care5', 0.5]]) got[k].push(fly({ skill, care }, seed));
  for (const k of ['care0', 'care1']) if (JSON.stringify(got[k]) !== JSON.stringify(GOLD[k])) fails.push(`${k}: ${JSON.stringify(got[k])} != before-the-knob ${JSON.stringify(GOLD[k])}`);
  if (got.care5.every((v, i) => v === got.care0[i] || v === got.care1[i])) fails.push(`c = 0.5 flies like c = 0 or c = 1 on every sky: the knob does nothing in between (${JSON.stringify(got.care5)})`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: care 0 and 1 fly exactly as the barrier-only and careful players did before the knob (12 skies each); care 0.5 flies differently`);
})();
