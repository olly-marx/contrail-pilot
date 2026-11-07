// The next-gap hint's level from the three systems (fleet.js gapHintLevel; the user, 2026-11: "the window detection upgrades seem intermittent").
// Was min(Forecasting, ATC, Ops): nothing until all three had a level. Now each system alone gives a faint hint (level 1 = 0.5 s) and the level grows
// with the levels above the weakest system's; EQUAL levels (every balanced save, and 12/12/12) give exactly the old value, so the late game is unchanged.
// Plain Node, ~1 s. Run: node tests/gaphint2.cjs.  Plants: tools/plants.tsv (test gaphint2).
(async () => {
  const F = await import('../src/fleet.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const g = F.gapHintLevel, lead = l => F.GAP_HINT.lead[l];
  for (let k = 0; k <= 12; k++) check(g(k, k, k) === k, `equal levels are unchanged: ${k}/${k}/${k} -> ${g(k, k, k)} (want ${k})`);
  let mono = true, never = true;
  for (let a = 0; a <= 12; a++) for (let b = 0; b <= 12; b++) for (let c = 0; c <= 12; c++) {
    const v = g(a, b, c);
    if (v < Math.min(a, b, c)) never = false;                                   // never below today's rule
    if (a < 12 && g(a + 1, b, c) < v) mono = false; if (b < 12 && g(a, b + 1, c) < v) mono = false; if (c < 12 && g(a, b, c + 1) < v) mono = false;   // buying never makes it worse
  }
  check(never, 'the hint is never below the old min(F, A, O)'); check(mono, 'buying any level never lowers the hint');
  // SOMETHING after buying ANY one system:
  check(g(1, 0, 0) === 1 && g(0, 1, 0) === 1 && g(0, 0, 1) === 1, `one level of any one system gives the faint hint: ${g(1, 0, 0)} ${g(0, 1, 0)} ${g(0, 0, 1)}`);
  check(lead(g(1, 0, 0)) === 0.5 && F.GAP_HINT.alpha[1] === 0.25, 'that faint hint is 0.5 s ahead at alpha 0.25');
  check(g(0, 0, 0) === 0 && lead(0) === 0, 'no systems: no hint');
  // It GROWS as you add (the exact numbers):
  const T = [[12, 0, 0, 2], [12, 12, 0, 4], [6, 6, 0, 2], [3, 1, 0, 1], [6, 6, 6, 6], [12, 12, 11, 11], [12, 12, 12, 12], [4, 4, 1, 1 + Math.floor(6 / 6)]];
  for (const [a, b, c, want] of T) check(g(a, b, c) === want, `F${a} A${b} O${c} -> level ${g(a, b, c)} (want ${want}, ${lead(want)} s)`);
  check(lead(g(12, 12, 12)) === 2.7 && F.GAP_HINT.alpha[12] === 0.94, 'the end state is today\'s: 2.7 s at alpha 0.94');
  // The kit the game and the engine read:
  const kit = s => F.fleetKit({ fleet: { plane: 'comet', planes: { comet: {} }, systems: s, gadgets: {} } });
  check(kit({ forecast: 1 }).hintLevel === 1 && kit({ atc: 1 }).hintLevel === 1 && kit({ ops: 1 }).hintLevel === 1 && kit({}).hintLevel === 0, 'fleetKit.hintLevel follows gapHintLevel');
  if (fails.length) { console.log('FAIL gaphint2\n  ' + fails.slice(0, 10).join('\n  ')); process.exit(1); }
  console.log('PASS gaphint2: each system alone gives a faint hint, it grows with the levels above the weakest, equal levels and 12/12/12 are unchanged');
})();
