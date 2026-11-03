// The gap-flying player's landing approach (sim engine, 2026-10-29): it holds low for the runway only once no storm stands between
// it and the runway; before that it flies the gaps as usual. The old approach held low from 700 km out with storms still ahead,
// which cost beginners' landings everywhere (and made Patagonia look worse than Europe: a model artifact).
// Season 2, beginners (s 0.75) landing after passing 2 airports, Western Europe and Patagonia, 3 seeds x 12 flights each:
//   of the flights that reach the 3rd airport's leg, at least 55% land (measured ~66-67% per area; the old hold gave 28-46%).
// Plain Node. PLANT=old (__plantOldApproach): must FAIL.  Run: node tests/sim-approach.cjs
globalThis.SEASON2 = true;
(async () => {
  const P = await import('../src/sim/player.js');
  if (process.env.PLANT === 'old') P.__plantOldApproach();
  const { flyOne } = await import('../src/sim/progression.js');
  const { AREAS } = await import('../src/areas.js');
  const { SEASON2_ON } = await import('../src/cities.js');
  if (!SEASON2_ON) { console.log('FAIL\n- season 2 is not on in Node'); process.exit(1); }
  let reach = 0, land = 0; const per = [];
  for (const a of ['weurope', 'patagonia']) { let r = 0, l = 0;
    for (let seed = 1; seed <= 3; seed++) { let save = { tutorialDone: true, muted: true, seenTips: ['*'], landings: 5, areas: [a], homeArea: a, city: AREAS[a].start };
      for (let n = 1; n <= 12; n++) { const w = flyOne(save, { seed: seed * 100000 + n, skill: 0.75, careful: true, maxSkip: 2 }); if (w.airportsSkipped >= 2) { r++; if (w.landed) l++; } save = w.save; } }
    per.push(`${a} ${l}/${r}`); reach += r; land += l; }
  const rate = land / Math.max(1, reach);
  if (reach < 30) { console.log(`FAIL\n- only ${reach} flights reached leg 3: no power`); process.exit(1); }
  if (rate < 0.55) { console.log(`FAIL\n- leg-3 landing ${(100 * rate).toFixed(1)}% (${per.join(', ')}), want >= 55%`); process.exit(1); }
  console.log(`PASS: leg-3 landing ${(100 * rate).toFixed(1)}% (${per.join(', ')}) >= 55%`);
})();
