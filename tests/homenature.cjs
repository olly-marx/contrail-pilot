// NATURE opens on the player's HOME land (the regions run, 2026-10-28: a Punta Arenas or Auckland start opened NATURE on
// the UK's woodland, with UK projects). For a start in each new region (and the UK as a control): the active land tab is
// the home land. Plant: homeRegion() null (the old 'woodland' default) -> must FAIL.
// Run: python3 -m http.server 8000 & node tests/homenature.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], rows = [];
  // (Each fix on its own: the last case has the UK tab DISCOVERED - a Patagonia start that later landed in London - so only
  //  the 'open on the home land' line keeps NATURE at home; the bug-fix chat's prove-plants run, 2026-10-29.)
  for (const [area, city, want, been] of [['patagonia', 'PUNTA ARENAS', 'Patagonian steppe'], ['aotearoa', 'AUCKLAND', 'Island forest'], ['oceania', 'SYDNEY', 'Australian bush'], ['weurope', 'AMSTERDAM', 'Temperate woodland'], ['patagonia', 'PUNTA ARENAS', 'Patagonian steppe', 'LONDON']]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
      { areas: [area], homeArea: area, city, visited: been ? [city, been] : [city], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, missionsDone: ['L1', 'L2'], landings: 3, flights: 4,
        fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#tabNature'); await p.waitForTimeout(800);
    const on = await p.evaluate(() => (document.querySelector('#wRegions .btn.on') || {}).textContent || '');
    const ukTab = await p.evaluate(() => { const b = document.querySelector('#wRegions [data-region="woodland"]'); return b ? !b.disabled : false; });
    if (area !== 'weurope' && !been && ukTab) fails.push(`${city}: the UK tab is open to a player who never flew there`);
    rows.push(`${city}: ${on.trim()}`);
    if (!on.includes(want) || errs.length) fails.push(`${city}: NATURE opens on "${on.trim()}", want "${want}"${errs.length ? ` (errors: ${errs})` : ''}`);
    await p.close();
  }
  // Lesson 5 from non-UK starts (real taps): NEXT opens NATURE on the HOME tab, the planting card is there, and the rails'
  // FREE parcels are taken there (it used to send them to the UK's tab).
  for (const [area, city, want] of [['oceania', 'MELBOURNE', 'Australian bush'], ['africa', 'JOHANNESBURG', 'African savanna'], ['patagonia', 'PUNTA ARENAS', 'Patagonian steppe']]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
      { areas: [area], homeArea: area, city, visited: [city], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], shownLines: ['trees'], freeGiven: true, freeProjectGiven: true, missionsDone: ['L1', 'L2', 'L3', 'L4'], landings: 5, flights: 6, seeds: 0, crystals: 0, unclaimed: [],
        tours: ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'name', 'r-systems', 'r-boards', 'r-bonus', 'nature-lead'], fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#hubNext'); await p.waitForTimeout(900);
    const st = await p.evaluate(() => ({ on: (document.querySelector('#wRegions .btn.on') || {}).textContent || '', card: !document.getElementById('wTrees').hidden && !!document.querySelector('#wTrees [data-buy="trees"]') }));
    let lit = null; for (let i = 0; i < 30; i++) { lit = await p.evaluate(() => { const t = document.getElementById('tour'); if (t.hidden) return null; const r = t.querySelector('.tring').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: t.querySelector('.tbubble p').textContent }; }); if (lit && /parcels/i.test(lit.text)) break; await p.waitForTimeout(150); }
    if (lit) { await p.mouse.click(lit.x, lit.y); await p.waitForTimeout(700); }
    const got = await p.evaluate(() => (JSON.parse(localStorage.getItem('contrailPilot.v2')).levels || {}).trees || 0);
    rows.push(`L5 ${city}: ${st.on.trim()}, card ${st.card}, parcels ${got}`);
    if (!st.on.includes(want) || !st.card || got !== 1 || errs.length) fails.push(`L5 from ${city}: NATURE on "${st.on.trim()}" (want ${want}), the planting card there ${st.card}, free parcels taken ${got}${errs.length ? `, errors ${errs}` : ''}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL homenature:\n - ${fails.join('\n - ')}` : `PASS homenature: ${rows.join('; ')}`);
  process.exit(fails.length ? 1 : 0);
})();
