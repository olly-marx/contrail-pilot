// TestFlight What to Test from CHANGES.json (0.79.0; tools/asc-whatsnew.mjs). Plain Node. Named lines:
//  1. the text names the top entry's version and lists each of its notes as a bullet, and ends with the feedback ask;
//  2. it fits App Store Connect's 4,000 characters (a long entry is cut, never refused);  3. no CHANGES: empty (nothing written).
// Plants (tools/plants.tsv): an older entry used. Run: node tests/ascwhatsnew.cjs
(async () => {
  const W = await import('../tools/asc-whatsnew.mjs'), C = require('../CHANGES.json');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const t = W.whatsNew(C);
  check(t.startsWith(`Version ${C[0].version}`) && C[0].notes.every(n => t.includes(`- ${n}`)) && /TestFlight feedback\.$/.test(t), `1. the top entry, every note, the ask: ${t.slice(0, 160)}`);
  const long = W.whatsNew([{ version: '9.9.9', notes: Array.from({ length: 80 }, (_, i) => `note ${i} `.repeat(10)) }]);
  check(long.length <= W.MAX_CHARS, `2. a long entry is cut to ${W.MAX_CHARS}: ${long.length}`);
  check(W.whatsNew([]) === '' && W.whatsNew(null) === '', '3. no entry: empty');
  if (fails.length) { console.log(`FAIL ascwhatsnew:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS ascwhatsnew: What to Test is the top CHANGES entry as bullets plus the feedback ask, under 4,000 characters');
})();
