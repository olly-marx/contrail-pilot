// Node gate for the DECLARED screen table (src/screens.js): no screen can be added to index.html without being declared, and the table is well-formed.
// (research/UX-MASTER-PLAN.md D3 rule 14: a gate that guesses which screens exist is not a gate.)  Run: node tests/uxscreens.cjs
const fs = require('fs'), path = require('path');
(async () => {
  const { SCREENS, RESULT_VARIANTS, MIN_VARIANTS, VIEWPORTS } = await import('../src/screens.js');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // Every full menu screen (section.overlay.screen) is declared, or deliberately exempt (pilot is a preview-only screen).
  const EXEMPT = { pilot: 'preview-only tab (window.CP_PREVIEW), not shipped' };
  const sections = [...html.matchAll(/<section id="(\w+)" class="overlay[^"]*\bscreen\b/g)].map(m => m[1]);
  check(sections.length >= 6, `found ${sections.length} menu screens in index.html (expected >= 6): the pattern is stale`);
  for (const id of sections) check(Object.values(SCREENS).some(s => s.root === '#' + id) || EXEMPT[id], `index.html screen #${id} is not declared in src/screens.js SCREENS (or exempt)`);
  for (const [k, s] of Object.entries(SCREENS)) {
    check(html.includes(`id="${s.root.slice(1)}"`), `${k}: root ${s.root} is not in index.html`);
    check(['fits', 'first'].includes(s.scroll), `${k}: scroll must be 'fits' or 'first'`);
    check(typeof s.budget === 'number' && s.budget > 0, `${k}: budget`);
    check(['fit', 'overlap', 'taps'].every(f => typeof s.enforce[f] === 'boolean'), `${k}: enforce needs boolean fit/overlap/taps`);
    check(/^R\d+$/.test(s.from), `${k}: from names the release that enforces it (R<n>)`);
    check(s.scroll !== 'first' || (s.first && s.primary), `${k}: a 'first' screen needs both first and primary selectors`);
  }
  check(RESULT_VARIANTS.length >= MIN_VARIANTS, `RESULT_VARIANTS has ${RESULT_VARIANTS.length} < ${MIN_VARIANTS}`);
  check(VIEWPORTS.some(([w, h]) => w === 320 && h === 568) && VIEWPORTS.some(([w, h]) => w === 390 && h === 667), 'both gated sizes (390x667 and 320x568) are declared');
  console.log(fails.length ? `FAIL uxscreens:\n - ${fails.join('\n - ')}` : `PASS uxscreens: ${sections.length} menu screens, ${Object.keys(SCREENS).length} declared`);
  process.exit(fails.length ? 1 : 0);
})();
