// R8 (research/R8-AUTOCLAIM-SURVEY.md): prizes are PAID the moment they are earned; there is no CLAIM step. Node, about a second.
//   1. addPrizes (a flight's mission + badges) pays into the bank at once, exactly, and leaves nothing waiting;
//   2. sumPrizes adds seeds and crystals;
//   3. migrateClaims pays an OLDER save's waiting prizes once, empties the list, and a second call pays nothing (idempotent);
//   4. migrateClaims leaves a save with nothing waiting alone and returns null.
// (A mission done by a purchase or a project pays at the buy itself: tests/missions2.cjs section 2. In the browser: tests/rewards.cjs.)
// PLANTS: tools/plants.tsv, test `autoclaim` (each must FAIL this test). Run: node tests/autoclaim.cjs
(async () => {
  const R = await import('../src/rewards.js'), { MISSIONS } = await import('../src/missions.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // 1. A landing in PARIS earns mission 1 and the bronze badges for 10 landings / 2,500 km; they are PAID by addPrizes.
  const s = { seeds: 10, crystals: 0, landings: 10, visited: ['LONDON'], planted: {}, crashes: {}, levels: {}, badgeTiers: {} };
  const added = R.addPrizes(s, { landed: true, landedAt: 'PARIS', distance: 2500, cargo: 3 }, MISSIONS[0], 0);
  const sum = R.sumPrizes(added);
  check(added.length >= 2 && added.some(p => p.key === 'mission:land'), `the flight earned mission 1 and at least one badge: ${added.map(p => p.key)}`);
  check(sum.seeds > 0 && sum.crystals > 0, `the prizes are worth something: ${JSON.stringify(sum)}`);
  check(s.seeds === 10 + sum.seeds && s.crystals === sum.crystals, `addPrizes PAID them at once, exactly: ${s.seeds} / ${s.crystals} (expected ${10 + sum.seeds} / ${sum.crystals})`);
  check(!(s.unclaimed || []).length, `nothing is left waiting: ${JSON.stringify(s.unclaimed)}`);
  // 2. sumPrizes
  const two = R.sumPrizes([{ seeds: 15, crystals: 1 }, { seeds: 20 }, { crystals: 2 }]);
  check(two.seeds === 35 && two.crystals === 3, `sumPrizes adds seeds and crystals: ${JSON.stringify(two)}`);
  // 3. The migration of an older save that still holds two prizes.
  const old = { seeds: 5, crystals: 1, unclaimed: [{ key: 'mission:land', seeds: 15, crystals: 1 }, { key: 'badge:frequent:1', seeds: 20, crystals: 2 }] };
  const m1 = R.migrateClaims(old);
  check(m1 && m1.seeds === 35 && m1.crystals === 3 && old.seeds === 40 && old.crystals === 4 && old.unclaimed.length === 0, `the migration pays +35 +3 once and empties the list: ${JSON.stringify(m1)} -> ${old.seeds} / ${old.crystals} / ${old.unclaimed.length} waiting`);
  const m2 = R.migrateClaims(old);
  check(m2 === null && old.seeds === 40 && old.crystals === 4, `a second migration pays nothing (idempotent): ${JSON.stringify(m2)} -> ${old.seeds} / ${old.crystals}`);
  // 4. Nothing waiting.
  const clean = { seeds: 7, crystals: 0 };
  check(R.migrateClaims(clean) === null && clean.seeds === 7 && clean.crystals === 0, 'a save with nothing waiting is left alone');
  console.log(fails.length ? `FAIL autoclaim:\n - ${fails.join('\n - ')}` : 'PASS autoclaim: prizes are paid at once, exactly; the migration pays an older save once');
  process.exit(fails.length ? 1 : 0);
})();
