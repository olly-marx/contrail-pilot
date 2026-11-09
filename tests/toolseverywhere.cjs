// THE PLANTING TOOLS ARE ON EVERY NATURE SCREEN (the user, 2026-11-09: "when I started in Australia, I could only make upgrades to my tree count and soil from the Australian nature screen, which doesn't make any sense").
// Tree parcels, soil patches and the nursery are bought once and work in every land (levels are global). src/wild.js showed them on the HOME land's tab only. A season 2 save with an Australian home and a second land open:
// the tools (#wTrees with the parcels, soil and nursery cards) are visible on the home land AND on the other land. 390x844. Plants: tools/plants.tsv, test `toolseverywhere`.
// Run: python3 -m http.server 8000 & node tests/toolseverywhere.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } },
      { areas: ['oceania', 'aotearoa'], homeArea: 'oceania', homeCity: 'MELBOURNE', city: 'MELBOURNE', visited: ['MELBOURNE', 'SYDNEY', 'AUCKLAND'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true,
        freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 500, crystals: 40, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, planted: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
    await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(800);
    for (const region of ['bush', 'islandforest']) {
      const r = await p.evaluate(rg => { const w = game.registry.get('ui').wild; w.region = rg; w.render(); const t = document.getElementById('wTrees'), vis = !t.hidden && t.getClientRects().length > 0;
        return { region: rg, visible: vis, cards: [...t.querySelectorAll('[data-line]')].map(e => e.dataset.line), home: w.home() }; }, region);
      log.push(JSON.stringify(r));
      check(r.visible, `${region}: the planting tools are not shown on this land's NATURE screen (home land ${r.home})`);
      check(['trees', 'soil', 'nursery'].every(id => r.cards.includes(id)), `${region}: the cards are ${JSON.stringify(r.cards)}, want trees, soil and nursery`);
    }
    check(!p.errs.length, `page errors: ${p.errs.join('; ')}`); await ctx.close();
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL toolseverywhere:\n - ${fails.join('\n - ')}` : 'PASS toolseverywhere: tree parcels, soil and nursery are on the home land and on the other land');
  process.exit(fails.length ? 1 : 0);
})();
