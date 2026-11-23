// Nature finance (src/finance.js; the user, 2026-10-27): seeds -> crystals at a rate set by your nature's health.
// No browser. Run: node tests/finance.cjs
//  The worked examples of PROPOSAL-ERAS-4-6-SYSTEMS section 5: level 1 at B 40 = 30 seeds a crystal, B 80 = 20 (the sim
//  chat's measured point), never under the floor 20; level 2 at B 80 = 16. 2026-11-23 rework: no reserve, any amount up to what
//  the seeds pay for, as many trades as you like, a greyed button says why; the desk is shut before the 2010s and before a level is bought.
//  Plant (tools/plants.tsv): the rate ignores nature (B) -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const M = await import(src('finance.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const T = 25; check(M.buyAt(1, 0, T) === 38 && M.buyAt(1, 100, T) === 28 && M.buyAt(1, 50, T) === 28 && M.buyAt(1, 20, T) === 32, `level 1 at market 25: B0 ${M.buyAt(1, 0, T)}, B20 ${M.buyAt(1, 20, T)}, B50 ${M.buyAt(1, 50, T)}, B100 ${M.buyAt(1, 100, T)} (want 38 / 32 / 28 / 28: steep early, the user 2026-11-13)`);
  check(M.buyAt(2, 0, T) < M.buyAt(1, 0, T) && M.buyAt(4, 0, T) < M.buyAt(2, 0, T), `higher desk levels do not trim the gap (B0: ${[1, 2, 3, 4].map(l => M.buyAt(l, 0, T))})`);
  const L1 = M.FINANCE.levels[0], L3 = M.FINANCE.levels[2], after1 = 4000 - L1.cost;
  const save = { tutorialDone: true, seeds: 4000, crystals: 0, landings: 5, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW' };
  check(M.maxBuy(save) === 0 && M.buyBlock(save) === 'Open the desk first', 'the desk trades before a level is bought');
  check(!M.buyFinance({ ...save, flightSeconds: 0 }), 'the desk can be bought before the 2010s');
  check(L1.cost <= 2000, `opening the desk costs ${L1.cost} seeds (want at most 2,000: an era-3 pilot holds 100 to 3,900, the progression sim 2026-11-23)`);
  check(M.buyFinance(save) && save.seeds === after1 && M.financeLevel(save) === 1, `buying level 1 (${L1.cost} seeds) failed`);
  const r = M.rate(save), B = M.financeBio(save), n = M.maxBuy(save);
  check(r === M.buyAt(1, B, M.trueRate(M.gameDay(save))), 'the rate is not the market rate plus the gap of the world nature');
  check(n === Math.floor(after1 / r), `could buy ${n}, want every crystal the seeds pay for: ${Math.floor(after1 / r)} (no reserve)`);
  check(M.trade(save, 3) === 3 && save.crystals === 3 && save.seeds === after1 - 3 * r, 'buying 3 did not move the right seeds and crystals');
  check(M.trade(save, 2) === 2 && save.crystals === 5, 'a second trade in the same landing was refused (the rework dropped one-trade-a-landing)');
  check(M.trade(save, 1e6) === Math.floor((after1 - 5 * r) / r) && save.seeds < r, 'buying more than you can afford did not stop at what the seeds pay for');
  check(M.maxBuy(save) === 0 && M.buyBlock(save) === `Need ${r} seeds for a crystal`, `a buy you cannot afford says '${M.buyBlock(save)}'`);
  check(!/landing/i.test(M.buyBlock(save) + M.sellBlock({ ...save, crystals: 0 })), 'a greyed button still talks about landings');
  // Bonds (level 3, the 2030s): not before its era; lock keeps the reserve; at most 3; pays after 10 landings, not before.
  const planted = { spruce: 40, birch: 40, oak: 40, rowan: 40, orchard: 40 };   // nature health ~41: the interest is real
  const bs = { tutorialDone: true, seeds: 160000, crystals: 0, landings: 0, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW', planted, finance: { level: 2 } };
  check(!M.buyFinance({ ...bs, flightSeconds: 0, finance: { level: 2 } }), 'bonds bought before the 2030s');
  check(M.buyFinance(bs) && M.financeLevel(bs) === 3, 'buying bonds (level 3) failed');
  check(M.lockBond(bs) && M.lockBond(bs) && M.lockBond(bs) && !M.lockBond(bs) && M.bonds(bs).length === 3, 'not exactly 3 bonds at once');
  const seedsLocked = bs.seeds; bs.landings = 9;
  check(M.payBonds(bs) === null && bs.seeds === seedsLocked, 'a bond paid out before 10 landings');
  bs.landings = 10; const pay = M.payBonds(bs), want = 3 * M.bondCrystals(bs, L3.bond);
  check(want >= 18 * 5, `(0.73.0: no water done, health ~32; interest x5 crystals) nature health too low to test the interest (${M.natureHealth(bs)})`);
  check(pay && pay.seeds === 3 * L3.bond.lock && pay.crystals === want && bs.seeds === seedsLocked + 3 * L3.bond.lock && !M.bonds(bs).length, `bonds paid ${JSON.stringify(pay)}, want ${3 * L3.bond.lock} seeds + ${want} crystals`);
  const low = { ...bs, seeds: L3.bond.lock - 1, finance: { level: 3 } };
  check(!M.lockBond(low), 'a bond locked more seeds than you have');
  // The dividend (level 4, far future): +1 crystal a landing in a healthy area (own bio >= 60), at most 3 a visit; none
  // in an unhealthy area; the first visit after buying pays nothing (no landings yet).
  const N = await import(src('nature.js')), rich = Object.fromEntries(Object.keys(N.SPECIES).map(id => [id, 200]));
  const region = (await import(src('network.js'))).city('WARSAW').region;   // every project of that land done, too
  const RD = (await import(src('habitats.js'))).REGION_DATA;
  const habitat = { [region]: (RD[region] || { projects: [] }).projects.map(p => p.id), woodland: N.PROJECTS.map(p => p.id) };
  const dv = { tutorialDone: true, seeds: 160000, crystals: 0, landings: 0, flightSeconds: 1e8, areas: ['weurope'], city: 'WARSAW', planted: rich, habitat, finance: { level: 3 } };
  check(M.buyFinance(dv) && M.financeLevel(dv) === 4, 'buying the dividend (level 4) failed');
  check(M.areaBio(dv) >= 60, `test save not healthy enough (${M.areaBio(dv)})`);
  check(M.payDividend(dv) === 0, 'a dividend with no landings');
  const per = M.FINANCE.levels[3].dividend.perLanding, dcap = M.FINANCE.levels[3].dividend.cap;   // (0.73.0: x7 crystals, 7 a landing, 21 a visit)
  dv.landings = 2; check(M.payDividend(dv) === 2 * per && dv.crystals === 2 * per, `two healthy landings did not pay ${2 * per}`);
  dv.landings = 9; check(M.payDividend(dv) === dcap, `the dividend cap (${dcap} a visit) did not hold`);
  const poor = { ...dv, planted: {}, habitat: {}, finance: { level: 4, divAt: 9 }, landings: 11 };
  check(M.payDividend(poor) === 0, 'an unhealthy area paid a dividend');
  if (fails.length) { console.log(`FAIL finance\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS finance: at market 25 you pay 38 on a bare world, 28 on a healthy one, levels trim the gap, no reserve, any amount, honest greyed buttons (this save: B ${B}, you pay ${r})`);
})();
