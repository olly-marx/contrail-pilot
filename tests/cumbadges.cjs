// Cumulative badges and the MISSIONS badge bars (the user, 2026-10-29; src/badges.js, totals in src/missions2.js onFlight).
// 1. km, seeds and storm gaps add up over flights, crashes too; 2. the totals earn Sky Miles / Seed Collector / Gap Threader
// at their bronze goals, with the T3 prizes; 3. nearBadges lists the closest ones with value < goal.
// Run: node tests/cumbadges.cjs   (proved by planted defects)
(async () => {
  const M = await import('../src/missions2.js'), B = await import('../src/badges.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const s = { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', visited: ['AMSTERDAM'], missionsDone: [], unclaimed: [], tutorialDone: true, levels: {}, habitat: {},
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const fl = landed => ({ landed, landedAt: 'BERLIN', cargo: 10, distance: 1000, cleanGaps: 5, sunBlocked: 0, planted: 0, airportsSkipped: 0, nightOwl: false, kinds: 0, bumped: 0, goldens: 0, dodges: 0 });
  for (let i = 0; i < 5; i++) M.onFlight(s, fl(i % 2 === 0));
  check(s.totals.km === 5000 && s.totals.seeds === 50 && s.totals.gaps === 25, `totals add up, crashes too: ${JSON.stringify(s.totals)}`);
  const won = B.earnBadges(s, { landed: false, distance: 0, cargo: 0 });
  for (const id of ['distance', 'collector', 'threader'])
    check(won.some(w => w.id === id && w.tier === 1 && w.seeds === 5), `${id} bronze is earned from the totals: ${JSON.stringify(won.map(w => w.id))}`);
  check(!B.earnBadges(s, { landed: false, distance: 0, cargo: 0 }).length, 'nothing earned twice');
  s.badgeTiers.frequent = 3; s.landings = 250;   /* a finished badge must not get a bar */
  const near = B.nearBadges(s);
  check(near.length === 3 && near.every(x => x.value < x.goal), `3 badge bars, each not yet full: ${JSON.stringify(near.map(x => [x.b.id, x.value, x.goal]))}`);
  check(B.medal('distance', 1) === 'assets/ui/badge-longhaul-1.png', 'new badges borrow existing medal art');
  console.log(fails.length ? `FAIL cumbadges:\n - ${fails.join('\n - ')}` : 'PASS cumbadges: totals count crashes; Sky Miles, Seed Collector, Gap Threader earn once; badge bars');
  process.exit(fails.length ? 1 : 0);
})();
