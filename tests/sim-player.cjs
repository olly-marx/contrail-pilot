// The gap-flying player (src/sim/player.js): with crashes ON, skill must matter, a skilled player must really get
// through storms, and (the user's expert experience, 2026-10-26) a player who makes no mistakes NEVER crashes on a
// storm in the storms-only stretch (before 8,000 km, where no-fly zones start): "I could fly forever if it was only
// storm clouds". Comet, nothing bought, heat off for the last check. Default (threat-first) planning.
//   median km: s = 0 < 1,000; s = 0 < s = 0.75 < s = 1; s = 1 > 7,000 (careful and careless);
//   s = 1: 0 storm crashes before 8,000 km in 30 skies.
// Plain Node. PLANT=bob removes the bob from the safe band (must FAIL); PLANT=classic flies the old planning (must FAIL).
// Run: node tests/sim-player.cjs
(async () => {
  const { simulate } = await import('../src/sim/simulate.js');
  const P = await import('../src/sim/player.js');
  const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  if (process.env.PLANT === 'bob') P.__plantNoBob();
  const plan = process.env.PLANT === 'classic' ? 'classic' : undefined;
  const median = (skill, careful) => { const km = Array.from({ length: 20 }, (_, i) => simulate(comet, { pilot: 'player', skill, careful, plan, seed: i + 1, crashes: true }).km).sort((a, b) => a - b); return km[10]; };
  const fails = [], got = {};
  for (const careful of [true, false]) {
    const k = careful ? 'careful' : 'careless', m1 = median(1, careful), m75 = median(0.75, careful), m0 = median(0, careful);
    got[k] = [m0, m75, m1];
    if (!(m1 > 7000)) fails.push(`${k} s=1: median ${m1} km, want > 7,000`);
    if (!(m0 < 1000)) fails.push(`${k} s=0: median ${m0} km, want < 1,000`);
    if (!(m0 < m75 && m75 < m1)) fails.push(`${k}: skill must matter: s=0/0.75/1 medians ${m0}/${m75}/${m1}`);
  }
  let stormEarly = 0;
  for (let i = 1; i <= 30; i++) { const r = simulate(comet, { pilot: 'player', skill: 1, care: 0, plan, seed: i, crashes: true, maxKm: 8000, overrides: { CLIMATE: { dangerLine: Infinity } } });
    if (r.end === 'crash' && /Storm/.test(r.reason)) stormEarly++; }
  if (stormEarly) fails.push(`s=1 crashed on a storm before 8,000 km in ${stormEarly} of 30 skies (an expert never does)`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: skill matters and a skilled player flies the gaps (median km at s=0/0.75/1: careful ${got.careful.join('/')}, careless ${got.careless.join('/')}); s=1 never crashes on a storm before 8,000 km (30 skies)`);
})();
