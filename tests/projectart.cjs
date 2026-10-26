// Nature-project art (the user, 2026-10-24: PixelLab for all nature projects): every project in every region has a
// 32x32 icon and a field feature that load; a region's done projects appear in its wild-area field at 1x, one per
// REGION_SPOTS spot (in the region's project order, all different spots); UK ones keep their SLOTS.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/projectart.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], fails = [], check = (c, m) => { if (!c) fails.push(m); };
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const DESERT = ['reserve', 'ggw', 'mangroves', 'wadi', 'lakes'];
  await p.addInitScript(d => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], freeGiven: true,
    priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, discovered: { desert: 1 }, habitat: { desert: d, woodland: ['pond'] },
    planted: { oak: 6, birch: 4 }, plantedIn: { desert: { acacia: 4, datepalm: 2 } } })); }, DESERT);
  await p.goto(URL); await ready(p);
  const art = await p.evaluate(async () => {
    const { REGION_DATA } = await import('./src/habitats.js');
    const ids = [...new Set(Object.values(REGION_DATA).flatMap(r => (r.projects || []).map(q => q.id)))];
    const size = src => new Promise(res => { const i = new Image(); i.onload = () => res([i.width, i.height]); i.onerror = () => res(null); i.src = src; });
    const bad = [];
    for (const id of ids) { const ic = await size(`assets/ui/proj-${id}.png`), fe = await size(`assets/ui/wild-${id}.png`);
      if (!ic || ic[0] !== 32 || ic[1] !== 32) bad.push(`proj-${id}:${ic}`); if (!fe || fe[0] > 64 || fe[1] > 32) bad.push(`wild-${id}:${fe}`); }
    return { n: ids.length, bad };
  });
  check(art.n >= 100 && art.bad.length === 0, `every project has a 32x32 icon and a feature up to 64x32: ${art.bad.join(' ')} (of ${art.n})`);
  const field = async region => {
    await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(400);
    await p.evaluate(r => document.querySelector(`#wRegions [data-region="${r}"]`).click(), region); await p.waitForTimeout(500);
    return p.$$eval('#wScene .wf.feat', els => els.map(e => ({ src: e.getAttribute('src').split('/').pop(), x: e.style.left, y: e.style.top, t: e.style.transform })));
  };
  const d = await field('desert');
  check(d.length === DESERT.length && DESERT.every(id => d.some(f => f.src === `wild-${id}.png`)), `desert: one feature per done project: ${JSON.stringify(d.map(f => f.src))}`);
  check(new Set(d.map(f => f.x + ',' + f.y)).size === d.length, `desert: every feature in its own spot: ${JSON.stringify(d.map(f => f.x + ',' + f.y))}`);
  check(d.every(f => /scale\(1\)/.test(f.t)), `features drawn at 1x: ${JSON.stringify(d.map(f => f.t))}`);
  const u = await field('woodland');
  check(u.length === 1 && u[0].src === 'wild-pond.png' && u[0].x === '118px' && u[0].y === '150px', `UK: the pond in its SLOTS spot: ${JSON.stringify(u)}`);
  // Only trees that suit the land (the user, 2026-10-24): desert shows its acacias and palms, never the UK oaks.
  const trees = async r => { await field(r); return p.$$eval('#wScene .wf.tree', els => els.map(e => e.getAttribute('src').split('/').pop())); };
  const dt = await trees('desert'), ut = await trees('woodland');
  check(dt.length > 0 && dt.every(f => /tree-(acacia|datepalm)-2\.png/.test(f)), `desert field: only desert trees: ${dt}`);
  check(ut.length > 0 && ut.every(f => /tree-(oak|birch)-2\.png/.test(f)), `UK field: the UK plantings: ${ut}`);
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS projectart (${art.n} projects)`);
})();
