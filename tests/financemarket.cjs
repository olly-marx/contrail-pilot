// The finance market (src/finance.js; the user, 2026-11-13): a TWO-WAY exchange at the market's true rate plus a gap set by
// the WHOLE WORLD's biodiversity, and the nature fund; both move once a GAME DAY (30 s flown, save.flightSeconds), not on
// the real clock. No browser. Run: node tests/financemarket.cjs
//  Market: the true rate is the same for the same game days, stays inside 15..40 over 20,000 days, and moves day to day;
//  you get less than you pay at every level, B and price; the gap shrinks as the world gets healthier; the rate reads
//  worldBiodiversity; the price does not move with real time, only with flying; one trade either way a landing.
//  Fund: the daily step is bounded with mean ~0; same days same growth; a game day's move is bounded; a healthy world grows
//  faster than a bare one; at B 8 a full fund earns on average about a fifth of a flight's ~12 seeds a flight and beats
//  its fee within 100 flights; invest keeps the reserve and the cap; cash out pays value less the fee.
//  Plants (tools/plants.tsv): no spread; the drift ignores nature; real time instead of game time; home nature instead of
//  the world; a fund that loses on average at low nature: each -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };
  const M = await import(src('finance.js')), N = await import(src('nature.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // --- the market
  const rates = M.trueRates(0, 20000), lo = Math.min(...rates), hi = Math.max(...rates);
  check(lo >= 15 && hi <= 40, `the true rate left 15..40 over 20,000 game days (${lo}..${hi})`);
  check(new Set(rates.slice(0, 20)).size > 5, 'the true rate hardly moves day to day');
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
  const sv = JSON.parse(JSON.stringify(base)), sr = M.sellRate(sv), k = M.canSell(sv);
  check(k === 10, `could sell ${k} crystals, want the level's cap 10`);
  check(M.sell(sv) === k && sv.crystals === 10 && sv.seeds === 9000 + k * sr, 'the sale did not move the right seeds and crystals');
  check(M.canSell(sv) === 0 && M.canTake(sv) === 0, 'a second trade (either way) in the same landing');
  check(M.canSell({ ...base, flightSeconds: 0, finance: { level: 1 } }) === 0, 'selling before the 2010s');
  const ms = M.marketSeries(base);
  check(ms.length === 20 && ms.every(r => r.get < r.true && r.true < r.pay), 'the graph rows are not 20 days of get < market < pay');
  // --- the fund
  let mean = 0, maxStep = 0; for (let d = 0; d < 20000; d++) { const z = M.stepAt(d); mean += z; maxStep = Math.max(maxStep, Math.abs(z)); }
  mean /= 20000;
  check(Math.abs(mean) < 0.05 && maxStep <= Math.sqrt(3) + 1e-9, `daily steps: mean ${mean.toFixed(3)}, max ${maxStep.toFixed(3)}`);
  check(M.growth(500, 900, 50) === M.growth(500, 900, 50) && M.growth(500, 500, 50) === 1 && M.growth(500, 400, 50) === 1, 'growth: same days differ, or a non-positive span grew');
  let worst = 0; for (let d = 0; d < 5000; d++) worst = Math.max(worst, Math.abs(Math.log(M.growth(d, d + 1, 50))));
  check(worst < Math.log(1.04), `a game day moved the fund by ${(100 * (Math.exp(worst) - 1)).toFixed(1)}% (want under 4%)`);
  const span = 300, runs = 40; let up = 0, down = 0;
  for (let i = 0; i < runs; i++) { const a = i * span; up += Math.log(M.growth(a, a + span, 100)); down += Math.log(M.growth(a, a + span, 0)); }
  check(up / runs > down / runs + 0.3, `a healthy world does not grow clearly faster (${(up / runs).toFixed(2)} vs ${(down / runs).toFixed(2)} log over ${span} days)`);
  // Worth having at B 8 (the sim's era-3 world, 2026-11-13; 1.35 game days and ~12 seeds a flight, provisional):
  const perFlight = 2000 * M.driftAt(8) * 1.35, flights = 100, days = Math.round(flights * 1.35);
  check(perFlight >= 0.1 * 12 && perFlight <= 0.4 * 12, `a full fund drifts ${perFlight.toFixed(2)} seeds a flight at B 8 (want 10% to 40% of 12)`);
  let ahead = 0; const tries = 400;
  for (let i = 0; i < tries; i++) if (M.growth(i * 977, i * 977 + days, 8) * (1 - M.FUND.fee) > 1) ahead++;
  check(ahead / tries >= 0.75, `after ${flights} flights at B 8 a fund is ahead (after the fee) in only ${ahead} of ${tries} starts (want 3 in 4)`);
  const fs = JSON.parse(JSON.stringify(base)); fs.seeds = 4600;
  check(M.canInvest(fs) === 500 && M.invest(fs) === 500 && fs.seeds === 4100 && M.fundValue(fs) === 500, 'investing 500 did not move 500 seeds into the fund');
  check(M.canInvest(fs) === 100, `the reserve (4,000) was not kept: could invest ${M.canInvest(fs)}, want 100`);
  const cs = JSON.parse(JSON.stringify(base)); cs.seeds = 1e6; let put = 0; while (M.invest(cs)) put++;
  check(M.fundValue(cs) === M.FINANCE.levels[0].fund && put === 4, `the fund cap: holding ${M.fundValue(cs)} after ${put} taps, want ${M.FINANCE.levels[0].fund}`);
  cs.flightSeconds += 30 * M.GAME_DAY; const v1 = M.fundValue(cs), want = Math.floor(2000 * M.growth(M.gameDay(cs) - 30, M.gameDay(cs), M.financeBio(cs)));
  check(v1 === want, `value after 30 game days ${v1}, want ${want}`);
  const before = cs.seeds, paid = M.cashOut(cs);
  check(paid === Math.floor(v1 * (1 - M.FUND.fee)) && cs.seeds === before + paid && !M.fundOf(cs), `cash out paid ${paid}, want ${Math.floor(v1 * (1 - M.FUND.fee))} and an empty fund`);
  const news = Array.from({ length: 800 }, (_, d) => M.newsOn(d)).filter(Boolean);
  check(news.length > 60 && news.length < 150 && news.some(n => n.up) && news.some(n => !n.up), `news days ${news.length} of 800 (want about 100, both kinds)`);
  check(M.fundSeries(base).length === 20, 'the fund graph is not 20 game days');
  if (fails.length) { console.log(`FAIL financemarket\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS financemarket: true rate ${lo}..${hi}, you pay > market > you get everywhere, world B ${M.financeBio(base)}, game time only; fund at B 8: ${perFlight.toFixed(2)} seeds a flight, ahead after ${flights} flights in ${ahead}/${tries}, worst game day ${(100 * (Math.exp(worst) - 1)).toFixed(1)}%`);
})();
