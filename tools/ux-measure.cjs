// One-off MEASUREMENT (not a gate): research/UX-MASTER-PLAN.md section F3. Renders every screen in src/screens.js at 390x667 and 320x568 with the
// declared rich save (tools/uxlib.cjs) and prints the markdown table for research/UX-MEASURE.md.
// Run: python3 -m http.server 8137 & NODE_PATH=<node_modules> node tools/ux-measure.cjs > out.md     (URL=... CHROME=... override)
const { chromium } = require('playwright-core');
const { openPage, views } = require('./uxlib.cjs');
(async () => {
  const { SCREENS, VIEWPORTS } = await import('../src/screens.js');
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const out = ['| screen | viewport | scrollHeight | clientHeight | scrollTop | first-card top | primary bottom | bar top | text < 7 px | overlaps | cut text | taps < 40 px | verdict | examples |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  const notes = [];
  for (const [W, H] of VIEWPORTS) {
    const p = await openPage(b, W, H, process.env.URL || 'http://localhost:8137/');
    for (const key of Object.keys(SCREENS)) for (const v of await views(p, key, SCREENS)) {
      const m = v.m, s = SCREENS[key];
      const verdict = [m.scrollHeight > m.clientHeight + 1 && 'SCROLLS', m.primBottom != null && m.primBottom > m.barTop && 'PRIMARY UNDER BAR', m.firstBottom != null && m.firstBottom > m.barTop && 'FIRST CARD UNDER BAR',
        m.overlaps.length && 'OVERLAP', m.clipped.length && 'CUT TEXT', m.small.length && 'SMALL TEXT', m.smallTaps.length && 'SMALL TAPS'].filter(Boolean).join(' + ') || 'ok';
      out.push(`| ${v.name} | ${W}x${H} | ${m.scrollHeight} | ${m.clientHeight} | ${m.scrollTop} | ${m.firstTop ?? '-'} | ${m.primBottom ?? '-'} | ${m.barTop} | ${m.small.length} | ${m.overlaps.length} | ${m.clipped.length} | ${m.smallTaps.length} | ${verdict} | ${[m.overlaps[0], m.clipped[0] && 'cut: ' + m.clipped[0]].filter(Boolean).join(' / ')} |`);
    }
    if (p.errs.length) notes.push(`page errors at ${W}: ${p.errs.slice(0, 2).join(' | ')}`);
    await p.close();
  }
  await b.close();
  console.log(out.join('\n')); if (notes.length) console.log('\nNOTES:\n- ' + notes.join('\n- '));
})();
