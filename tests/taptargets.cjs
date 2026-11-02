// UX gate 3 (research/UX-MASTER-PLAN.md F2, D3 rule 9): on every screen in src/screens.js, at 390x667 and 320x568, every visible thing that takes a
// tap (button, link, .rowc-tap, bar tab, sub-tab) is at least 40x40 px, and no text is smaller than 7 px. A screen whose `enforce.taps`
// is false is PENDING (red on live on purpose; src/screens.js).
// Run: python3 -m http.server 8000 & node tests/taptargets.cjs
const { runGate } = require('../tools/uxlib.cjs');
(async () => {
  const check = m => [...m.smallTaps.map(t => `tap target under 40 px: ${t}`), ...m.small.slice(0, 5).map(t => `text under 7 px: "${t}"`)];
  const { fails, notes } = await runGate({ which: 'taps', check, url: process.env.URL || 'http://localhost:8000/' });
  notes.forEach(n => console.log('  note: ' + n));
  console.log(fails.length ? `FAIL taptargets:\n - ${fails.join('\n - ')}` : 'PASS taptargets');
  process.exit(fails.length ? 1 : 0);
})();
