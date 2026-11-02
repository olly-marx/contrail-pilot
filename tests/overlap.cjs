// UX gate 2 (research/UX-MASTER-PLAN.md F2, D3 rule 10): nothing under anything. On every screen and sub-tab in src/screens.js, at
// 390x667 and 320x568: no two leaf text/button/picture boxes intersect (text extents, not padded boxes), and no text is cut off (a box
// that hides overflow yet has more text than room, or text drawn past the screen's side). NATURE: every discovered land, every tier open
// (as rowfit does). This is the gap rowfit left: a nowrap name running UNDER the absolutely placed price passed all of rowfit's checks.
// A screen whose `enforce.overlap` is false is PENDING (red on live on purpose; src/screens.js).
// Run: python3 -m http.server 8000 & node tests/overlap.cjs
const { runGate } = require('../tools/uxlib.cjs');
(async () => {
  const check = m => [...m.overlaps.map(o => `overlap ${o}`), ...m.clipped.map(c => `cut text "${c}"`)];
  const { fails, notes } = await runGate({ which: 'overlap', check, url: process.env.URL || 'http://localhost:8000/' });
  notes.forEach(n => console.log('  note: ' + n));
  console.log(fails.length ? `FAIL overlap:\n - ${fails.join('\n - ')}` : 'PASS overlap');
  process.exit(fails.length ? 1 : 0);
})();
