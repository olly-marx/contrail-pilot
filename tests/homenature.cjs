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
  for (const [area, city, want] of [['patagonia', 'PUNTA ARENAS', 'Patagonian steppe'], ['aotearoa', 'AUCKLAND', 'Island forest'], ['oceania', 'SYDNEY', 'Australian bush'], ['weurope', 'AMSTERDAM', 'Temperate woodland']]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
      { areas: [area], homeArea: area, city, tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, missionsDone: ['L1', 'L2'], landings: 3, flights: 4,
        fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    await p.click('#tabNature'); await p.waitForTimeout(800);
    const on = await p.evaluate(() => (document.querySelector('#wRegions .btn.on') || {}).textContent || '');
    rows.push(`${city}: ${on.trim()}`);
    if (!on.includes(want) || errs.length) fails.push(`${city}: NATURE opens on "${on.trim()}", want "${want}"${errs.length ? ` (errors: ${errs})` : ''}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL homenature:\n - ${fails.join('\n - ')}` : `PASS homenature: ${rows.join('; ')}`);
  process.exit(fails.length ? 1 : 0);
})();
