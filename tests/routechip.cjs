// R-B of the UX plan (the user's playtest of 0.29.0: "the map is interactive, but that is not clear"): at 375x667 and 320x568, REAL taps.
//   1. the globe has a caption ("Spin it. Tap a city to fly.") inside its picture until it has been used; HOME still fits;
//   2. the first spin (the arrow, or a drag on the globe) removes it for good (a save flag);
//   3. the route line is a 40 px CHIP with an arrow; a tap opens the FLY TO sheet (NEXT, the city, CHANGE, FLY; ROUTING V2 step 2) and does NOT push the page down;
//   4. a way chosen in the sheet is saved, the sheet stays open, and HOME's chip shows it when the sheet closes; the panel is handed back (it can open again).
// Run: python3 -m http.server 8000 & node tests/routechip.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const U = require('../tools/uxlib.cjs');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const sheet = p => p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
  const home = p => p.evaluate(() => { game.registry.get('save').unclaimed = []; game.registry.get('ui').showTitle(); });
  for (const [W, H] of [[375, 667], [320, 568]]) {
    const tag = `${W}x${H}`; let p = await U.openPage(b, W, H, URL);
    await p.evaluate(() => { const s = game.registry.get('save'); s.tours = (s.tours || []).filter(t => t !== 'globe-hint' && t !== '*'); }); await home(p); await p.waitForTimeout(600);
    // 1. the caption, and HOME still fits.
    const h0 = await p.evaluate(() => { const h = document.getElementById('hubHint'), g = document.getElementById('hubGlobe').getBoundingClientRect(), r = h.getBoundingClientRect(), R = document.getElementById('title'), c = document.getElementById('hubRoute').getBoundingClientRect(), go = document.getElementById('goBtn').getBoundingClientRect(), bar = document.getElementById('tabbar').getBoundingClientRect();
      return { shown: !h.hidden && r.height > 0, text: h.textContent, inGlobe: r.top >= g.top && r.bottom <= g.bottom + 1 && r.left >= g.left - 1 && r.right <= g.right + 1, chipH: Math.round(c.height), chipText: document.getElementById('hubRoute').textContent, tag: document.getElementById('hubRoute').tagName, fits: R.scrollHeight <= R.clientHeight, goBottom: Math.round(go.bottom), barTop: Math.round(bar.top) }; });
    check(h0.shown && /Tap a city to fly/.test(h0.text) && h0.inGlobe, `${tag}: the globe's caption shows inside its picture: ${JSON.stringify(h0)}`);
    check(h0.tag === 'BUTTON' && h0.chipH >= 40 && /›/.test(h0.chipText), `${tag}: the route line is a 40 px chip with an arrow: ${JSON.stringify([h0.tag, h0.chipH, h0.chipText])}`);
    check(h0.fits && h0.goBottom <= h0.barTop, `${tag}: HOME does not scroll and TAKE OFF is above the bar with the caption and the chip (fits ${h0.fits}; TAKE OFF ${h0.goBottom} vs bar ${h0.barTop})`);
    // 2. the first spin removes it for good.
    await p.click('#hubSpinR'); await p.waitForTimeout(300);
    const h1 = await p.evaluate(() => ({ hidden: document.getElementById('hubHint').hidden, saved: (JSON.parse(localStorage.getItem('contrailPilot.v2')).tours || []).includes('globe-hint') }));
    await home(p); await p.waitForTimeout(300);
    check(h1.hidden && h1.saved && await p.evaluate(() => document.getElementById('hubHint').hidden), `${tag}: the first spin removes the caption for good: ${JSON.stringify(h1)}`);
    // 3. the chip opens the FLY TO sheet (ROUTING V2 step 2: after the tutorial the route chip names the default destination; the old 'Which way?' sheet is for the tutorial and the classic game); the page does not move.
    const before = await p.evaluate(() => { const R = document.getElementById('title'); return { sh: R.scrollHeight, st: R.scrollTop }; });
    await p.click('#hubRoute'); await p.waitForTimeout(500);
    const open = await p.evaluate(() => ({ sheet: (document.getElementById('sheet') || {}).innerText, change: !!document.getElementById('dsChange'), sh: document.getElementById('title').scrollHeight, st: document.getElementById('title').scrollTop }));
    check(open.sheet && /NEXT|MISSION|EXPLORING/.test(open.sheet) && open.change && open.sh === before.sh && open.st === before.st, `${tag}: the chip opens the FLY TO sheet (NEXT, CHANGE) and nothing is pushed: ${JSON.stringify([open.change, before, open.sh, open.st])}`);
    if (!open.change) { await p.close(); continue; }   // the sheet did not open (named above), nothing below can be asked of it
    // 4. close: HOME's chip still names the next city; the sheet can open again.
    await p.click('#sheet .sheet-ok'); await p.waitForTimeout(400);
    const closed = await p.evaluate(() => ({ chip: document.getElementById('hubRoute').textContent, sheet: !!document.getElementById('sheet') }));
    check(!closed.sheet && /Next:|Mission:|Explore:|▶/.test(closed.chip), `${tag}: closing leaves HOME's chip naming where the flight goes: ${JSON.stringify(closed)}`);
    await p.click('#hubRoute'); await p.waitForTimeout(300);
    check(!!(await sheet(p)) && /NEXT|MISSION/.test(await sheet(p)), `${tag}: the FLY TO sheet opens a second time`);
    check(!p.errs.length, `${tag}: no page errors: ${p.errs.slice(0, 2)}`);
    await p.close();
    // 2b. a DRAG on the globe removes the caption too.
    p = await U.openPage(b, W, H, URL);
    await p.evaluate(() => { const s = game.registry.get('save'); s.tours = (s.tours || []).filter(t => t !== 'globe-hint' && t !== '*'); }); await home(p); await p.waitForTimeout(500);
    const g = await p.evaluate(() => { const r = document.getElementById('hubGlobe').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await p.mouse.move(g.x, g.y); await p.mouse.down(); for (let i = 1; i <= 6; i++) { await p.mouse.move(g.x + 8 * i, g.y); await p.waitForTimeout(16); } await p.mouse.up(); await p.waitForTimeout(300);
    check(await p.evaluate(() => document.getElementById('hubHint').hidden), `${tag}: a drag on the globe removes the caption`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL routechip:\n - ${fails.join('\n - ')}` : 'PASS routechip: the globe says what it does until it is used; the route line is a 40 px chip that opens a sheet without pushing the page');
  process.exit(fails.length ? 1 : 0);
})();
