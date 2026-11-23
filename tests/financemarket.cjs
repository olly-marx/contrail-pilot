// The finance market (src/finance.js; the user, 2026-11-13): a TWO-WAY exchange at the market's true rate plus a gap set by
// the WHOLE WORLD's biodiversity, and the nature fund; both move once a GAME DAY (30 s flown, save.flightSeconds), not on
// the real clock. No browser. Run: node tests/financemarket.cjs
//  Market: the true rate is the same for the same game days, stays inside 15..40 over 20,000 days, and moves day to day;
//  you get less than you pay at every level, B and price; the gap shrinks as the world gets healthier; the rate reads
//  worldBiodiversity; the price does not move with real time, only with flying; selling caps at the crystals you hold.
//  Fund (rework 2026-11-23, Oliver: 'trend more upwards with some noise that make badly timed withdrawals lose money'):
//  the daily step is bounded with mean ~0; same days same growth; a game day's move is bounded; a healthy world grows faster
//  than a bare one; the noise returns to the trend (held 10 flights: ahead after the fee in >= 90% of starts at B 10,
//  held 1 flight: behind in >= 50%); the price stays within 25% of its trend; invest takes any amount up to the cap and
//  your seeds; take out pays value less the fee; an old { seeds, day } holding still reads.
//  Plants (tools/plants.tsv): no spread; the bonus ignores nature; real time instead of game time; no pull back to the
//  trend (a random walk); no fee: each -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const M = await import(src('finance.js')), N = await import(src('nature.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // --- the market
  const rates = M.trueRates(0, 20000), lo = Math.min(...rates), hi = Math.max(...rates);
  check(lo >= 15 && hi <= 40, `the true rate left 15..40 over 20,000 game days (${lo}..${hi})`);
  const dayMove = rates.slice(1).reduce((a, r, i) => a + Math.abs(Math.log(r / rates[i])), 0) / (rates.length - 1);
  check(dayMove >= 0.04, `the true rate moves only ${(100 * dayMove).toFixed(1)}% a game day on average (the user, 2026-11-13: 'should fluctuate a bit more'; want 4% or more)`);
  check(M.trueRate(1234) === M.trueRates(1230, 1240)[4], 'the same game day gave two true rates');
  let bad = '';
  for (let lv = 1; lv <= 4 && !bad; lv++) for (let B = 0; B <= 100 && !bad; B += 10) for (const T of [15, 25, 40]) {
    const p = M.buyAt(lv, B, T), g = M.sellAt(lv, B, T); if (!(g < p && g >= 1)) bad = `level ${lv}, B ${B}, market ${T}: get ${g}, pay ${p}`;
  }
  check(!bad, `you can get as much as you pay: ${bad}`);
  check(M.gapAt(1, 0) > M.gapAt(1, 100), 'the gap does not shrink with world nature');
  const base = { tutorialDone: true, seeds: 9000, crystals: 20, landings: 5, flightSeconds: 1e7, areas: ['weurope'], city: 'WARSAW', finance: { level: 1 }, planted: { spruce: 40, birch: 40, oak: 40, rowan: 40, orchard: 40 } };
  check(M.natureHealth(base) !== N.worldBiodiversity(base), 'test save: home nature equals the world, so the check proves nothing');
  check(M.financeBio(base) === N.worldBiodiversity(base), `the exchange reads ${M.financeBio(base)}, want the whole world's ${N.worldBiodiversity(base)}`);
  // Game time, not real time: the same save reads the same price an hour later; flying 30 s moves it to the next day.
  const realNow = Date.now, r0 = M.rate(base), d0 = M.gameDay(base); Date.now = () => realNow() + 7 * 24 * 3600e3;
  let dayLater = [M.gameDay(base), M.rate(base)]; Date.now = realNow;
  check(dayLater[0] === d0 && dayLater[1] === r0, 'the market moved with the real clock');
  const flown = { ...base, flightSeconds: base.flightSeconds + M.GAME_DAY };
  check(M.gameDay(flown) === d0 + 1, `30 s flown did not move one game day (${M.gameDay(flown) - d0})`);
  const sv = JSON.parse(JSON.stringify(base)), sr = M.sellRate(sv);
  check(M.maxSell(sv) === 20 && M.sell(sv, 50) === 20 && sv.crystals === 0 && sv.seeds === 9000 + 20 * sr, 'selling 50 of 20 crystals did not sell exactly the 20 at the sell rate');
  check(M.sellBlock(sv) === 'No crystals to sell' && M.sell(sv, 1) === 0, 'selling with no crystals');
  check(M.maxSell({ ...base, flightSeconds: 0, finance: { level: 1 } }) === 0, 'selling before the 2010s');
  const ms = M.marketSeries(base);
  check(ms.length === 20 && ms.every(r => r.get < r.true && r.true < r.pay), 'the graph rows are not 20 days of get < market < pay');
  // --- the fund
  let mean = 0, maxStep = 0; for (let d = 0; d < 20000; d++) { const z = M.stepAt(d); mean += z; maxStep = Math.max(maxStep, Math.abs(z)); }
  mean /= 20000;
  check(Math.abs(mean) < 0.05 && maxStep <= Math.sqrt(3) + 1e-9, `daily steps: mean ${mean.toFixed(3)}, max ${maxStep.toFixed(3)}`);
  check(M.growth(500, 900, 50) === M.growth(500, 900, 50) && M.growth(500, 500, 50) === 1 && M.growth(500, 400, 50) === 1, 'growth: same days differ, or a non-positive span grew');
  let worst = 0; for (let d = 0; d < 5000; d++) worst = Math.max(worst, Math.abs(Math.log(M.growth(d, d + 1, 50))));
  check(worst < Math.log(1.08), `a game day moved the fund by ${(100 * (Math.exp(worst) - 1)).toFixed(1)}% (want under 8%)`);
  const span = 300, runs = 40; let up = 0, down = 0;
  for (let i = 0; i < runs; i++) { const a = i * span; up += Math.log(M.growth(a, a + span, 100)); down += Math.log(M.growth(a, a + span, 0)); }
  check(up / runs > down / runs + 0.3, `a healthy world does not grow clearly faster (${(up / runs).toFixed(2)} vs ${(down / runs).toFixed(2)} log over ${span} days)`);
  // Trend with noise: 3 game days a flight (the sim's era-3 pilot), the low end of era-3 world nature (B 10).
  const share = (flights, beh) => { let n = 0, k = 0; for (let d = 200; d < 6200; d += 7, k++) { const g = M.growth(d, d + 3 * flights, 10) * (1 - M.FUND.fee); if (beh ? g < 1 : g > 1) n++; } return n / k; };
  const ahead10 = share(10, false), behind1 = share(1, true), ahead40 = share(40, false);
  check(ahead10 >= 0.9, `held 10 flights, ahead after the fee in only ${(100 * ahead10).toFixed(0)}% of starts (want 90%+: an upward trend)`);
  check(ahead40 >= 0.99, `held 40 flights, ahead in only ${(100 * ahead40).toFixed(0)}% of starts`);
  check(behind1 >= 0.5, `taken out after 1 flight, behind in only ${(100 * behind1).toFixed(0)}% of starts (want 50%+: badly timed withdrawals lose)`);
  let far = 0; const xs = M.fundNoise(0, 20000); for (const x of xs) far = Math.max(far, Math.abs(x));
  check(far < Math.log(1.25), `the price strayed ${(100 * (Math.exp(far) - 1)).toFixed(0)}% from its trend over 20,000 game days (want under 25%)`);
  // Invest any amount; the cap; take out; an old holding.
  const L1 = M.FINANCE.levels[0], fs = JSON.parse(JSON.stringify(base)); fs.seeds = 1200;
  check(M.investBlock(fs) === null && M.canInvest(fs) === 1200 && M.invest(fs, 700) === 700 && fs.seeds === 500 && M.fundValue(fs) === 700 && M.fundOf(fs).paid === 700, 'investing 700 of 1,200 seeds did not move 700 into the fund');
  check(M.invest(fs, 1e6) === 500 && fs.seeds === 0 && M.investBlock(fs) === 'No seeds to put in', `investing more than you have: ${fs.seeds} left, block '${M.investBlock(fs)}'`);
  const cs = JSON.parse(JSON.stringify(base)); cs.seeds = 1e6;
  check(M.invest(cs, 1e6) === L1.fund && M.fundValue(cs) === L1.fund && M.investBlock(cs) === 'Fund full', `the fund cap: holding ${M.fundValue(cs)}, want ${L1.fund}`);
  cs.flightSeconds += 30 * M.GAME_DAY; const v1 = M.fundValue(cs), want = Math.floor(L1.fund * M.growth(M.gameDay(cs) - 30, M.gameDay(cs), M.financeBio(cs)));
  check(v1 === want, `value after 30 game days ${v1}, want ${want}`);
  const before = cs.seeds, paid = M.cashOut(cs);
  check(paid === Math.floor(v1 * (1 - M.FUND.fee)) && cs.seeds === before + paid && !M.fundOf(cs), `take out paid ${paid}, want ${Math.floor(v1 * (1 - M.FUND.fee))} and an empty fund`);
  check(M.FUND.fee >= 0.01, `the fee is ${M.FUND.fee}: without one, a quick in-and-out never loses`);
  const old = { ...base, finance: { level: 1, fund: { seeds: 3000, day: M.gameDay(base) - 9 } } };
  check(M.fundValue(old) === Math.floor(3000 * M.growth(M.gameDay(base) - 9, M.gameDay(base), M.financeBio(base))) && M.fundOf(old).paid === 3000, 'an old { seeds, day } holding does not read');
  const news = Array.from({ length: 800 }, (_, d) => M.newsOn(d)).filter(Boolean);
  check(news.length > 60 && news.length < 150 && news.some(n => n.up) && news.some(n => !n.up), `news days ${news.length} of 800 (want about 100, both kinds)`);
  const fser = M.fundSeries(base);
  check(fser.length === 20 && fser[0].trend === 100 && fser.every(r => Number.isFinite(r.price)), 'the fund graph is not 20 finite game days with its trend from 100');
  if (fails.length) { console.log(`FAIL financemarket\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS financemarket: true rate ${lo}..${hi}, ${(100 * dayMove).toFixed(1)}% a game day, you pay > market > you get everywhere, world B ${M.financeBio(base)}, game time only; fund at B 10: ahead after 10 flights ${(100 * ahead10).toFixed(0)}%, 40 flights ${(100 * ahead40).toFixed(0)}%, behind after 1 flight ${(100 * behind1).toFixed(0)}%, at most ${(100 * (Math.exp(far) - 1)).toFixed(0)}% off trend, worst game day ${(100 * (Math.exp(worst) - 1)).toFixed(1)}%`);
})();
