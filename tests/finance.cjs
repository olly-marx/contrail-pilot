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
  // Bonds (level 3, the 2030s): not before its era; lock keeps the reserve; at most 3; pays after 10 landings, not before.
  const planted = { spruce: 40, birch: 40, oak: 40, rowan: 40, orchard: 40 };   // nature health ~41: the interest is real
  const bs = { tutorialDone: true, seeds: 20000, crystals: 0, landings: 0, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW', planted, finance: { level: 2 } };
  check(!M.buyFinance({ ...bs, flightSeconds: 0, finance: { level: 2 } }), 'bonds bought before the 2030s');
  check(M.buyFinance(bs) && M.financeLevel(bs) === 3, 'buying bonds (level 3) failed');
  check(M.lockBond(bs) && M.lockBond(bs) && M.lockBond(bs) && !M.lockBond(bs) && M.bonds(bs).length === 3, 'not exactly 3 bonds at once');
  const seedsLocked = bs.seeds; bs.landings = 9;
  check(M.payBonds(bs) === null && bs.seeds === seedsLocked, 'a bond paid out before 10 landings');
  bs.landings = 10; const pay = M.payBonds(bs), want = 3 * Math.floor(M.natureHealth(bs) / 4);
  check(want >= 30, `nature health too low to test the interest (${M.natureHealth(bs)})`);
  check(pay && pay.seeds === 3000 && pay.crystals === want && bs.seeds === seedsLocked + 3000 && !M.bonds(bs).length, `bonds paid ${JSON.stringify(pay)}, want 3000 seeds + ${want} crystals`);
  const low = { ...bs, seeds: 4400, finance: { level: 3 } };
  check(!M.lockBond(low), 'a bond dipped into the reserve');
  // The dividend (level 4, far future): +1 crystal a landing in a healthy area (own bio >= 60), at most 3 a visit; none
  // in an unhealthy area; the first visit after buying pays nothing (no landings yet).
  const N = await import(src('nature.js')), rich = Object.fromEntries(Object.keys(N.SPECIES).map(id => [id, 200]));
  const region = (await import(src('network.js'))).city('WARSAW').region;   // every project of that land done, too
  const RD = (await import(src('habitats.js'))).REGION_DATA;
  const habitat = { [region]: (RD[region] || { projects: [] }).projects.map(p => p.id), woodland: N.PROJECTS.map(p => p.id) };
  const dv = { tutorialDone: true, seeds: 20000, crystals: 0, landings: 0, flightSeconds: 1e8, areas: ['weurope'], city: 'WARSAW', planted: rich, habitat, finance: { level: 3 } };
  check(M.buyFinance(dv) && M.financeLevel(dv) === 4, 'buying the dividend (level 4) failed');
  check(M.areaBio(dv) >= 60, `test save not healthy enough (${M.areaBio(dv)})`);
  check(M.payDividend(dv) === 0, 'a dividend with no landings');
  dv.landings = 2; check(M.payDividend(dv) === 2 && dv.crystals === 2, 'two healthy landings did not pay 2');
  dv.landings = 9; check(M.payDividend(dv) === 3, 'the dividend cap (3 a visit) did not hold');
  const poor = { ...dv, planted: {}, habitat: {}, finance: { level: 4, divAt: 9 }, landings: 11 };
  check(M.payDividend(poor) === 0, 'an unhealthy area paid a dividend');
  // Save up for the next desk level (2026-10-29): at level 2 in the 2030s, the desk keeps the bonds' 5,000 (not the 3,500
  // reserve); in the 2010s (bonds not open yet) only the reserve.
  const su = era => ({ tutorialDone: true, seeds: 5200, crystals: 0, landings: 3, flightSeconds: era, areas: ['weurope'], city: 'WARSAW', finance: { level: 2 } });
  const r2 = M.rateAt(2, 0), in2030s = M.canTake(su(1e8)), in2010s = M.canTake({ ...su(0), flightSeconds: 60 * 250 });   // 250 min = the 2010s (the 2030s open at ~341)
  check(in2030s === Math.min(15, Math.floor((5200 - 5000) / r2)) && in2030s !== in2010s, `2030s, level 2: took ${in2030s}, want what is above the bonds' 5,000`);
  check(in2010s === Math.min(15, Math.floor((5200 - 3500) / r2)), `2010s, level 2: took ${in2010s}, want what is above the 3,500 reserve`);
  if (fails.length) { console.log(`FAIL finance\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS finance: 30:1 at B 40, 20:1 at B 80 (level 2: 16:1), reserve kept, cap and one trade a landing (this save: B ${B}, ${r}:1)`);
})();
