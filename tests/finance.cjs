// Nature finance (src/finance.js; the user, 2026-10-27): seeds -> crystals at a rate set by your nature's health.
// No browser. Run: node tests/finance.cjs
//  The worked examples of PROPOSAL-ERAS-4-6-SYSTEMS section 5: level 1 at B 40 = 30 seeds a crystal, B 80 = 20 (the sim
//  chat's measured point), never under the floor 20; level 2 at B 80 = 16. The reserve is kept, the cap holds, one trade
//  per landing, the desk is shut before the 2010s and before a level is bought.
//  Plant (tools/plants.tsv): the rate ignores nature (B) -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const M = await import(src('finance.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  check(M.rateAt(1, 40) === 30 && M.rateAt(1, 80) === 20 && M.rateAt(1, 100) === 20, `level 1: B40 ${M.rateAt(1, 40)}, B80 ${M.rateAt(1, 80)}, B100 ${M.rateAt(1, 100)} (want 30 / 20 / 20)`);
  check(M.rateAt(2, 80) === 16 && M.rateAt(2, 0) === 40, `level 2: B80 ${M.rateAt(2, 80)} (want 16), B0 ${M.rateAt(2, 0)} (want 40)`);
  const save = { tutorialDone: true, seeds: 9000, crystals: 0, landings: 5, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW' };
  check(M.canTake(save) === 0, 'the desk trades before a level is bought');
  check(!M.buyFinance({ ...save, flightSeconds: 0 }), 'the desk can be bought before the 2010s');
  check(M.buyFinance(save) && save.seeds === 7500 && M.financeLevel(save) === 1, 'buying level 1 (1,500 seeds) failed');
  const r = M.rate(save), B = M.natureHealth(save), n = M.canTake(save);
  check(r === M.rateAt(1, B), 'the rate is not the level formula of your nature');
  check(n === Math.min(10, Math.floor((7500 - 4000) / r)), `could take ${n}, want min(10, (7500 - 4000) / ${r})`);
  const got = M.trade(save);
  check(got === n && save.crystals === n && save.seeds === 7500 - n * r, 'the trade did not move the right seeds and crystals');
  check(M.canTake(save) === 0, 'a second trade in the same landing');
  save.landings++; save.seeds = 4000 + r - 1;
  check(M.canTake(save) === 0, 'a trade dipped into the reserve');
  if (fails.length) { console.log(`FAIL finance\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS finance: 30:1 at B 40, 20:1 at B 80 (level 2: 16:1), reserve kept, cap and one trade a landing (this save: B ${B}, ${r}:1)`);
})();
