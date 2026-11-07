// The pilot-code line in UP NEXT (src/nextup.js codeDue; the user lost a 260-flight save, 2026-11-05): from landing 10, a NAMED pilot who never opened the
// code is asked to save it; it fits a row (<= 24 characters + the right column); it stops when codeSeen is set; the lessons' rows still come first. No browser.
// Run: node tests/codeline.cjs   (proved by planted defects: tools/plants.tsv, test codeline)
(async () => {
  const N = await import('../src/nextup.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = { missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, seenTips: [], landings: 10, pilotNamed: true };
  const keys = s => N.nextUp(s, { limit: 3 }).map(r => r.key);
  check(keys(base).includes('code:save'), `landing 10, named pilot, code never opened: the line is there (${keys(base)})`);
  check(!keys({ ...base, landings: 9 }).includes('code:save'), 'not before landing 10');
  check(!keys({ ...base, pilotNamed: false }).includes('code:save') && !keys({ ...base, pilotNamed: undefined }).includes('code:save'), 'not for a device with no pilot name (no code to save)');
  check(!keys({ ...base, codeSeen: true }).includes('code:save'), 'gone once the code has been seen');
  check(!keys({ ...base, seenTips: ['*'] }).includes('code:save'), "not for the automated tests' saves");
  const row = N.nextUp(base, { limit: 3 }).find(r => r.key === 'code:save');
  check(row && row.short.length <= N.SHORT_MAX && (row.short.length + N.rightOf(row).length) <= N.ROW_MAX && row.where === 'pilot', `the row fits (${row && row.short.length}+${row && N.rightOf(row).length}) and leads to PILOT`);
  console.log(fails.length ? `FAIL codeline:\n - ${fails.join('\n - ')}` : 'PASS codeline: UP NEXT asks a named pilot to save the code from landing 10, once, and it fits a row');
  process.exit(fails.length ? 1 : 0);
})();
