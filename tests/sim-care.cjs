// The player's second knob, contrail care c (src/sim/player.js, 2026-10-26). c = 0 must fly exactly as the
// barrier-only (careless) player did before the knob, and c = 1 exactly as the careful one: the golden distances below
// were flown by the code before the knob (identical, checked when it was added; re-flown 2026-10-26 on the skies of the
// plane's own random stream, again identical to the pre-knob code). c = 0.5 must differ from both on
// some sky (the knob does something in between). Comet, crashes on, s = 0.8 and 1, seeds 1-6. Plain Node.
// plan: 'classic' throughout: the golden numbers were flown before threat-first planning (2026-10-26).
// PLANT=care weakens the contrail term (x 0.5): must FAIL.
// Run: node tests/sim-care.cjs
const GOLD = {
  care0: [8208.301, 6825.451, 7054.934, 8898.912, 4525.783, 8685.141, 10506.004, 6827.421, 9073.616, 9868.113, 4529.348, 6827.421],
  care1: [1606.42, 6827.421, 8668.275, 3657.27, 4525.783, 2275.044, 10506.004, 6827.421, 9415.298, 10103.627, 9523.544, 6829.39],
};
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const P = await import('../src/sim/player.js');
  if (process.env.PLANT === 'care') P.__plantCareHalf();
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fly = (opts, seed) => { const w = createWorld(comet, seed); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60); w.explain = () => false; w.nextAirport.worldX = 1e12;
    const p = P.makePlayer({ ...opts, plan: 'classic', seed }); for (let i = 0; i < 200000 && w.state === 'playing'; i++) { if (p.wantsFlap(w)) w.applyFlap(); w.step(16.67 / 1000); } return Math.round(w.distancePx * 1000) / 1000; };
  const fails = [], got = { care0: [], care1: [], care5: [] };
  for (const skill of [0.8, 1]) for (let seed = 1; seed <= 6; seed++) for (const [k, care] of [['care0', 0], ['care1', 1], ['care5', 0.5]]) got[k].push(fly({ skill, care }, seed));
  for (const k of ['care0', 'care1']) if (JSON.stringify(got[k]) !== JSON.stringify(GOLD[k])) fails.push(`${k}: ${JSON.stringify(got[k])} != before-the-knob ${JSON.stringify(GOLD[k])}`);
  if (got.care5.every((v, i) => v === got.care0[i] || v === got.care1[i])) fails.push(`c = 0.5 flies like c = 0 or c = 1 on every sky: the knob does nothing in between (${JSON.stringify(got.care5)})`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: care 0 and 1 fly exactly as the barrier-only and careful players did before the knob (12 skies each); care 0.5 flies differently`);
})();
