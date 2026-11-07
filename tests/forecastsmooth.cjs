// Forecasting (the icy-air forecast) gets steadily better with every level (the user, 2026-11: "the detection upgrades seem intermittent"). Measured before:
// level 1 got the DEFAULT 40% false alarms / 30% missed and was WORSE than owning nothing. Now reveal rises and false alarms / misses fall at EVERY level,
// and a level-1 forecast is at worst even with no forecast. Plain Node. Run: node tests/forecastsmooth.cjs   (plants: tools/plants.tsv, test forecastsmooth)
(async () => {
  const F = await import('../src/fleet.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const kit = n => F.fleetKit({ fleet: { plane: 'comet', planes: { comet: {} }, systems: { forecast: n }, gadgets: {} } });
  const ks = Array.from({ length: 13 }, (_, n) => kit(n));
  for (let n = 1; n <= 12; n++) {
    check(ks[n].revealPx > ks[n - 1].revealPx, `reveal rises at level ${n}: ${ks[n - 1].revealPx} -> ${ks[n].revealPx}`);
    if (n >= 2) { check(ks[n].fakes <= ks[n - 1].fakes + 1e-9, `false alarms never rise at level ${n}: ${ks[n - 1].fakes} -> ${ks[n].fakes}`); check(ks[n].late <= ks[n - 1].late + 1e-9, `misses never rise at level ${n}: ${ks[n - 1].late} -> ${ks[n].late}`); }
  }
  // level 1 vs nothing: expected warning (px) for a real patch, and the share of alarms that are false
  const warn = k => (1 - k.late) * k.revealPx + k.late * 50, falseShare = k => k.fakes;
  check(warn(ks[1]) > warn(ks[0]) && falseShare(ks[1]) <= 0.2 + 1e-9, `a level-1 forecast warns earlier (${warn(ks[0])} -> ${warn(ks[1]).toFixed(1)} px) with at most 20% false alarms (${falseShare(ks[1])})`);
  check(ks[1].fakes < 0.4 && ks[1].late < 0.3, 'level 1 no longer gets the default 40% fakes / 30% late');
  // the end state is today's (levels 9-12 unchanged)
  check(ks[12].revealPx === 440 && ks[12].fakes === 0.03 && ks[12].late === 0.02 && ks[10].fakes === 0.1 && ks[9].fakes === 0.12, `levels 9-12 are as before: ${JSON.stringify([ks[9].fakes, ks[10].fakes, ks[12].fakes, ks[12].late])}`);
  if (fails.length) { console.log('FAIL forecastsmooth\n  ' + fails.slice(0, 10).join('\n  ')); process.exit(1); }
  console.log('PASS forecastsmooth: reveal up, false alarms and misses down at every Forecasting level; level 1 is no worse than nothing; end state unchanged');
})();
