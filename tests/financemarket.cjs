// The finance market (src/finance.js; the user, 2026-11-13): a TWO-WAY exchange at rates set by the WORLD's biodiversity,
// and the nature fund that grows or falls on a real clock. No browser. Run: node tests/financemarket.cjs
//  Exchange: selling pays fewer seeds a crystal than buying costs, at every level and every B (no round trip can profit);
//  the spread narrows as the world gets healthier; the rate reads worldBiodiversity; one trade either way a landing.
//  Fund: the hourly step is bounded with mean ~0; the same hours give the same growth; a day's growth stays bounded; a
//  healthy world drifts up and a bare one down over a month; invest keeps the reserve and the cap; cash out pays value
//  less the fee; the clock cannot be wound back; no growth before a whole hour.
//  Plants (tools/plants.tsv): no spread -> FAIL; the drift ignores nature -> FAIL; the clock may run backwards -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const M = await import(src('finance.js')), N = await import(src('nature.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // --- exchange
  for (let lv = 1; lv <= M.FINANCE.levels.length; lv++) for (let B = 0; B <= 100; B += 5) {
    const b = M.rateAt(lv, B), s = M.sellRateAt(lv, B);
    if (!(s < b && s >= 1)) { check(false, `level ${lv}, B ${B}: sell ${s} not below buy ${b}`); break; }
  }
  check(M.spreadAt(0) > M.spreadAt(100), `the spread does not narrow with nature (${M.spreadAt(0)} at 0, ${M.spreadAt(100)} at 100)`);
  const base = { tutorialDone: true, seeds: 9000, crystals: 20, landings: 5, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW', finance: { level: 1 }, planted: { spruce: 40, birch: 40, oak: 40, rowan: 40, orchard: 40 } };
  check(M.natureHealth(base) !== N.worldBiodiversity(base), 'test save: home nature equals world nature, so the world check proves nothing');
  check(M.financeBio(base) === N.worldBiodiversity(base), 'the exchange does not read the world\'s biodiversity');
  const sv = JSON.parse(JSON.stringify(base)), sr = M.sellRate(sv), k = M.canSell(sv);
  check(k === 10, `could sell ${k} crystals, want the level's cap 10`);
  check(M.sell(sv) === k && sv.crystals === 10 && sv.seeds === 9000 + k * sr, 'the sale did not move the right seeds and crystals');
  check(M.canSell(sv) === 0 && M.canTake(sv) === 0, 'a second trade (either way) in the same landing');
  const shut = { ...base, flightSeconds: 0, finance: { level: 1 } };
  check(M.canSell(shut) === 0, 'selling before the 2010s');
  // --- fund: the series
  let mean = 0, maxStep = 0; for (let h = 0; h < 20000; h++) { const z = M.stepAt(h); mean += z; maxStep = Math.max(maxStep, Math.abs(z)); }
  mean /= 20000;
  check(Math.abs(mean) < 0.05 && maxStep <= Math.sqrt(3) + 1e-9, `hourly steps: mean ${mean.toFixed(3)}, max ${maxStep.toFixed(3)}`);
  const h0 = M.hourOf(Date.UTC(2026, 10, 1));
  check(M.growth(h0, h0 + 500, 50) === M.growth(h0, h0 + 500, 50), 'the same hours gave different growth');
  check(M.growth(h0, h0, 50) === 1 && M.growth(h0, h0 - 5, 50) === 1, 'growth with no whole hour passed');
  let worst = 0; for (let d = 0; d < 365; d++) { const g = M.growth(h0 + 24 * d, h0 + 24 * d + 24, 50); worst = Math.max(worst, Math.abs(Math.log(g))); }
  check(worst < Math.log(1.25), `a day moved the fund by ${(100 * (Math.exp(worst) - 1)).toFixed(1)}% (want under 25%)`);
  let up = 0, down = 0; const months = 24;
  for (let m = 0; m < months; m++) { const a = h0 + m * 720; up += Math.log(M.growth(a, a + 720, 100)); down += Math.log(M.growth(a, a + 720, 0)); }
  check(up > down + 0.1 * months && up > 0, `over ${months} months: healthy world mean log-growth ${(up / months).toFixed(3)}, bare world ${(down / months).toFixed(3)} (want healthy above bare by 0.1 a month, and growing)`);
  const g = M.growth(h0, h0 + 100000, 100);
  check(g <= M.FUND.clamp[1] && g >= M.FUND.clamp[0], `growth ${g} outside the clamp`);
  // --- fund: the wallet
  const t0 = Date.UTC(2026, 10, 13, 9), fs = JSON.parse(JSON.stringify(base)); fs.seeds = 4600;
  check(M.canInvest(fs, t0) === 500, `could invest ${M.canInvest(fs, t0)}, want 500`);
  check(M.invest(fs, t0) === 500 && fs.seeds === 4100 && M.fundValue(fs, t0) === 500, 'investing 500 did not move 500 seeds into the fund');
  check(M.canInvest(fs, t0) === 100, `the reserve (4,000) was not kept: could invest ${M.canInvest(fs, t0)}, want 100`);
  const cs = JSON.parse(JSON.stringify(base)); cs.seeds = 1e6; let put = 0; while (M.invest(cs, t0)) put++;
  check(M.fundValue(cs, t0) === M.FINANCE.levels[0].fund && put === 4, `the fund cap: holding ${M.fundValue(cs, t0)} after ${put} taps, want ${M.FINANCE.levels[0].fund}`);
  const t1 = t0 + 72 * 3600e3, v1 = M.fundValue(cs, t1), want = Math.floor(2000 * M.growth(M.hourOf(t0), M.hourOf(t1), M.financeBio(cs)));
  check(v1 === want, `value after 3 days ${v1}, want ${want}`);
  const before = cs.seeds, paid = M.cashOut(cs, t1);
  check(paid === Math.floor(v1 * (1 - M.FUND.fee)) && cs.seeds === before + paid && !M.fundOf(cs), `cash out paid ${paid}, want ${Math.floor(v1 * (1 - M.FUND.fee))} and an empty fund`);
  const ck = JSON.parse(JSON.stringify(base)); ck.seeds = 1e6; M.invest(ck, t1);
  const later = M.fundValue(ck, t1 + 48 * 3600e3), wound = M.fundValue(ck, t0);
  check(wound === later, `a clock set back read a different value (${wound} vs ${later} at the latest hour seen)`);
  const news = Array.from({ length: 300 }, (_, d) => M.newsOn(d)).filter(Boolean);
  check(news.length > 60 && news.length < 140 && news.some(n => n.up) && news.some(n => !n.up), `news days ${news.length} of 300 (want about 100, both kinds)`);
  if (fails.length) { console.log(`FAIL financemarket\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS financemarket: sell below buy everywhere (spread ${M.spreadAt(0)} to ${M.spreadAt(100)}), world bio ${M.financeBio(base)}, worst day ${(100 * (Math.exp(worst) - 1)).toFixed(1)}%, month log-growth +${(up / months).toFixed(3)} healthy / ${(down / months).toFixed(3)} bare, ${news.length} news days of 300`);
})();
