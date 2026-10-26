// Terrain everywhere (0.10.6, user): the savanna, the rainforest, the open sea and the ice have their own
// ground and hills (tools/art/make_regions.py), including a flight that STARTS there (it used to show the
// UK woodland strips); the sea and the ice stay empty (no trees, animals or soil) and a tree parcel
// cannot be dropped there; in the savanna and rainforest the ground life follows that region's meter.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/terrain.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const start = async (city, extra = {}) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([c, x]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, priceVersion: 2, city: c, levels: { trees: 2 }, fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} }, ...x })); }, [city, extra]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    await p.evaluate(() => { const s = game.scene.getScene('game'), y0 = s.plane.y; s.events.on('preupdate', () => { s.plane.y = y0; s.plane.vy = 0; s.graceUntil = 1e12; s.heat = 0; }); });
    return p;
  };
  const terrain = p => p.evaluate(() => { const s = game.scene.getScene('game'); return { region: s.regionNow, ground: s.terrain && s.terrain.ground, hills: s.terrain && s.terrain.hills }; });

  // 1. Starting in the savanna and the rainforest: their own strips from the first moment.
  for (const [city, r] of [['NAIROBI', 'savanna'], ['MANAUS', 'rainforest']]) {
    const p = await start(city);
    const t = await terrain(p);
    check(t.region === r && t.ground === `ground-${r}` && t.hills === `hills-${r}`, `a flight from ${city} shows ${r} strips: ${JSON.stringify(t)}`);
    check(!p.errs.length, `${city}: page errors ${p.errs}`);
    await p.close();
  }

  // 2. Into the sea and the ice: the strips change (fade in), nothing lives there, and no parcel drops.
  const p = await start('NEW YORK');
  for (const r of ['ocean', 'ice']) {
    const out = await p.evaluate(rr => new Promise(res => { const s = game.scene.getScene('game');
      s.regionHere = () => rr; s.setRegion(rr);   // hold the region (the game re-checks it every frame)
      setTimeout(() => {
        const before = s.parcels, falling = s.parcelsFalling.length; s.dropParcel();
        res({ button: s.dropShown, ground: s.terrain && s.terrain.ground, life: [s.wildlife.treesPerScreen, s.wildlife.wildPerScreen, s.wildlife.farmPerScreen, s.wildlife.birdsPerScreen],
          dropped: s.parcels !== before || s.parcelsFalling.length !== falling, parcels: before });
      }, 1800); }), r);
    check(out.ground === `ground-${r}`, `${r}: its own ground strip: ${out.ground}`);
    check(out.life.every(n => n === 0), `${r}: no trees, animals, farms or birds: ${out.life}`);
    check(out.button === false, `${r}: no DROP button shown`);
    check(out.parcels > 0 && !out.dropped, `${r}: a tree parcel cannot be dropped: ${JSON.stringify(out)}`);
  }
  // ...and back over land the parcels work again.
  const land = await p.evaluate(() => { const s = game.scene.getScene('game'); s.regionHere = () => 'plains'; s.setRegion('plains'); const n = s.parcels; s.dropParcel(); return [n, s.parcels]; });
  check(land[1] === land[0] - 1, `over land a parcel drops: ${land}`);
  // 3. The savanna's ground life follows ITS meter: bare with nothing done, lush with every project.
  const life = await p.evaluate(async () => { const N = await import('/src/nature.js'), H = await import('/src/habitats.js');
    const all = H.REGION_DATA.savanna.projects.map(x => x.id);
    const lo = N.wildlifeScene({ planted: {}, habitat: {} }, 'savanna'), hi = N.wildlifeScene({ planted: {}, habitat: { savanna: all } }, 'savanna');
    return { lo: [lo.bio, lo.treesPerScreen], hi: [hi.bio, hi.treesPerScreen] }; });
  check(life.hi[0] > life.lo[0] && life.hi[1] > life.lo[1], `savanna: more trees with a higher meter: ${JSON.stringify(life)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
