// UX gate 1 (research/UX-MASTER-PLAN.md F2): every screen in src/screens.js SCREENS fits as declared, at 390x667 and 320x568.
//   scroll 'fits'  : scrollHeight <= clientHeight, scrollTop === 0, the primary button wholly above the tab bar
//   scroll 'first' : the primary action and the first card are above the tab bar without scrolling
// RESULTS runs through the declared RESULT_VARIANTS (landed / seven missions / animal+badge / crash / first / school) via ui.showResults,
// so "a flight" is not the only case. A screen whose `enforce.fit` is false is PENDING (red on live on purpose; see src/screens.js).
// Run: python3 -m http.server 8000 & node tests/fitscreen.cjs   (plants: tools/plants.tsv)
const { runGate } = require('../tools/uxlib.cjs');
(async () => {
  const { RESULT_VARIANTS, MIN_VARIANTS } = await import('../src/screens.js');
  const check = (m, s) => {
    const out = [];
    if (s.scroll === 'fits') {
      if (m.scrollHeight > m.clientHeight + 1) out.push(`scrolls (${m.scrollHeight} > ${m.clientHeight})`);
      if (m.scrollTop !== 0) out.push(`opens scrolled (scrollTop ${m.scrollTop})`);
    }
    if (s.primary) { if (m.primBottom == null) out.push('primary action not found'); else if (m.primBottom > m.barTop || m.primTop < 0) out.push(`primary ${s.primary} is not above the bar (${m.primTop}..${m.primBottom}, bar at ${m.barTop})`); }
    if (s.first) { if (m.firstBottom == null) out.push('first card not found'); else if (m.firstBottom > m.barTop) out.push(`first card ${s.first} ends at ${m.firstBottom}, below the bar (${m.barTop})`); }
    return out;
  };
  const { fails, notes } = await runGate({ which: 'fit', check, url: process.env.URL || 'http://localhost:8000/' });
  if (RESULT_VARIANTS.length < MIN_VARIANTS) fails.push(`RESULT_VARIANTS has ${RESULT_VARIANTS.length} < ${MIN_VARIANTS}: one flight is not a gate`);
  notes.forEach(n => console.log('  note: ' + n));
  console.log(fails.length ? `FAIL fitscreen:\n - ${fails.join('\n - ')}` : 'PASS fitscreen');
  process.exit(fails.length ? 1 : 0);
})();
