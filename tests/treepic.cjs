// Planting a new native tree (0.11.x, user): the pop-up about it shows the tree's picture, the same
// portrait as its NATURE card (src/animalart.js), in the UK and in another land.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/treepic.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const plant = async (city, kind) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    // Tree school done (tree-2/3 seen), so a new kind's fact pop-up is next.
    await p.addInitScript(c => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true,
      seenTips: ['tree-1', 'tree-2', 'tree-3', 'airport', 'x-bars', 'x-multiplier', 'x-crystals', 'bareLand'], tours: ['name', 'hangar', 'nature', 'wild'], flights: 20, landings: 6, priceVersion: 2, city: c,
      levels: { trees: 2, species: 4 }, planted: { spruce: 1 }, fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} } })); }, city);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(k => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.explaining = false; s.frozen = false;
      s.addPlot(100); const pl = s.plots[s.plots.length - 1]; s.parcelLanded(pl.x + 2, k);
      const img = document.getElementById('coachPic');
      return { shown: !document.getElementById('coach').hidden, pic: img.hidden ? null : img.getAttribute('src'), text: document.getElementById('coachText').textContent }; }, kind);
    await p.waitForTimeout(400);
    r.loaded = await p.evaluate(() => { const i = document.getElementById('coachPic'); return !i.hidden && i.naturalWidth > 0; });
    r.errs = p.errs;
    if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
    await p.close();
    return r;
  };
  const uk = await plant('LONDON', 'oak');
  check(uk.shown && /portrait-tree-oak-0\.png$/.test(uk.pic || '') && uk.loaded, `planting the first oak: its picture in the pop-up: ${JSON.stringify(uk)}`);
  const sav = await plant('NAIROBI', 'birch');   // the savanna's slot-1 tree
  check(sav.shown && /portrait-tree-/.test(sav.pic || '') && !/oak|birch/.test(sav.pic) && sav.loaded, `a savanna tree shows its own picture: ${JSON.stringify(sav)}`);
  check(!uk.errs.length && !sav.errs.length, `page errors: ${uk.errs} ${sav.errs}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
