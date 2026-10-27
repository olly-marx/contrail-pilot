// Wild-area tree layouts (the user, 2026-10-25: "all of the wild areas have the same trees in the same arrangement"):
// two lands with the same planting show their trees in DIFFERENT places; a land shows the same layout again on a
// second visit; no tree's base stands on a built feature; the UK keeps its hand-placed spots (TREE_SPOTS).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/treelayout.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], fails = [], check = (c, m) => { if (!c) fails.push(m); };
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], freeGiven: true,
    priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, discovered: { desert: 1, savanna: 1 },
    planted: { oak: 12, birch: 12 }, habitat: { desert: ['reserve', 'ggw', 'mangroves', 'wadi', 'lakes'] },
    plantedIn: { desert: { acacia: 12, datepalm: 12 }, savanna: { acacia: 12, baobab: 12 } } })); });
  await p.goto(URL); await ready(p);
  const look = async r => {
    await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(300);
    await p.evaluate(r => document.querySelector(`#wRegions [data-region="${r}"]`).click(), r); await p.waitForTimeout(500);
    return p.evaluate(() => ({ trees: [...document.querySelectorAll('#wScene .wf.tree')].map(e => [parseInt(e.style.left), parseInt(e.style.top)]),
      feats: [...document.querySelectorAll('#wScene .wf.feat')].map(e => [parseInt(e.style.left), parseInt(e.style.top), e.naturalWidth || 64, e.naturalHeight || 32]) }));
  };
  const d1 = await look('desert'), s1 = await look('savanna'), u = await look('woodland'), d2 = await look('desert');
  const key = t => JSON.stringify(t.trees);
  check(d1.trees.length >= 8 && s1.trees.length >= 8, `trees shown: desert ${d1.trees.length}, savanna ${s1.trees.length}`);
  check(key(d1) !== key(s1), `desert and savanna trees are in different places: ${key(d1)} vs ${key(s1)}`);
  check(key(d1) === key(d2), `the same land shows the same layout again: ${key(d1)} vs ${key(d2)}`);
  const onFeat = d1.trees.filter(([x, y]) => d1.feats.some(([fx, fy, w, h]) => x >= fx && x <= fx + 64 && y >= fy - 32 && y <= fy));
  check(d1.feats.length === 5 && onFeat.length === 0, `no tree stands on a built feature: ${JSON.stringify(onFeat)} (features ${d1.feats.length})`);
  const UK = [[200, 84], [176, 90], [266, 88], [126, 92], [100, 96], [84, 132], [226, 120], [190, 160], [24, 124], [150, 166], [270, 156], [56, 164]];
  check(u.trees.length === 12 && u.trees.every(([x, y], i) => x === UK[i][0] && y === UK[i][1]), `the UK keeps its hand-placed spots: ${key(u)}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS treelayout');
})();
