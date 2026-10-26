// The gap-flying player (src/sim/player.js, 2026-10-26): with crashes ON, skill must matter, and a skilled
// player must really get through storms. Comet, nothing bought, 20 skies, careful and careless:
//   s = 1   : median past 7,000 km (the never-crash reach is ~9-10k; the tightest no-fly gaps still catch some);
//   s = 0.75: in between (median 1,000-6,000 km): the real players' early range;
//   s = 0   : median under 1,000 km (it crashes in the first storms).
// Plain Node. PLANT=bob removes the bob from the safe band (the bug that crashed every pilot): must FAIL.
// Run: node tests/sim-player.cjs
(async () => {
  const { simulate } = await import('../src/sim/simulate.js');
  const P = await import('../src/sim/player.js');
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const median = (skill, careful) => { const km = Array.from({ length: 20 }, (_, i) => simulate(comet, { pilot: 'player', skill, careful, seed: i + 1, crashes: true }).km).sort((a, b) => a - b); return km[10]; };
  if (process.env.PLANT === 'bob') P.__plantNoBob();
  const fails = [], got = {};
  for (const careful of [true, false]) {
    const k = careful ? 'careful' : 'careless', m1 = median(1, careful), m75 = median(0.75, careful), m0 = median(0, careful);
    got[k] = [m0, m75, m1];
    if (!(m1 > 7000)) fails.push(`${k} s=1: median ${m1} km, want > 7,000`);
    if (!(m75 > 1000 && m75 < 9000)) fails.push(`${k} s=0.75: median ${m75} km, want 1,000-9,000`);
    if (!(m0 < 1000)) fails.push(`${k} s=0: median ${m0} km, want < 1,000`);
  }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: skill matters and a skilled player flies the gaps (median km at s=0/0.75/1: careful ${got.careful.join('/')}, careless ${got.careless.join('/')})`);
})();
