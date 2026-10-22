// The NATURE screen / wild area (src/wild.js, src/habitats.js; the user's design, 2026-10-21):
// old rewilding levels become UK habitat projects; projects are bought one by one with seeds and
// crystals once the meter allows; every project and animal has a real source; an animal can only
// appear in flight once its projects are done and the meter is high enough; seeing it in a real
// flight counts as FOUND (once, with a pop-up), and the collection shows found vs silhouettes.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/wild.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); } }, [KEY, save]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
    return p;
  };
  const get = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, priceVersion: 2 };

  // 1. Old rewilding (2 levels) became the same two projects.
  let p = await open({ ...base, seeds: 100, crystals: 10, levels: { rewild: 2, trees: 1 }, planted: { birch: 2 } });
  let s = await get(p);
  check(JSON.stringify(s.habitat.woodland) === '["meadow","hedgerow"]' && !('rewild' in s.levels), `rewild 2 -> meadow + hedgerow: ${JSON.stringify(s.habitat)} ${JSON.stringify(s.levels)}`);

  // 2. Every project and every UK animal has at least one real https source.
  const srcs = await p.evaluate(async () => { const h = await import('./src/habitats.js');
    const bad = [...h.UK_PROJECTS.filter(x => !x.src.length || x.src.some(([t, u]) => !t || !/^https:\/\//.test(u))).map(x => x.id),
      ...Object.entries(h.UK_SPECIES).filter(([, v]) => !(v.src || []).length || v.src.some(([t, u]) => !t || !/^https:\/\//.test(u))).map(([k]) => k)];
    return { bad, projects: h.UK_PROJECTS.length, animals: Object.keys(h.UK_SPECIES).length }; });
  check(srcs.bad.length === 0 && srcs.projects >= 10 && srcs.animals >= 20, `every project and animal needs a source: missing ${srcs.bad}`);

  // 3. The NATURE screen: buy "Leave dead wood" (20 seeds + 1 crystal); it shows DONE; its (i) page has sources.
  await p.click('#tabNature'); await p.waitForTimeout(300);
  check(await p.isVisible('#wProjects') && !(await p.isVisible('#hangar')), 'NATURE opens the wild area, not the hangar');
  await p.click('[data-project="deadwood"]'); await p.waitForTimeout(200);
  s = await get(p);
  check(s.habitat.woodland.includes('deadwood') && s.seeds === 80 && s.crystals === 9, `dead wood bought for 20 + 1: ${JSON.stringify(s.habitat)} ${s.seeds}/${s.crystals}`);
  check(/DONE/.test(await p.textContent('[data-pline="deadwood"]')), 'a bought project says DONE');
  // A finished tier folds to one line (with 'show'); here tier 1 is not finished, so margins is listed.
  await p.click('[data-pinfo="margins"]'); await p.waitForTimeout(200);
  const info = await p.evaluate(() => ({ text: document.getElementById('wInfoBody').textContent, links: [...document.querySelectorAll('#wInfoBody a')].map(a => a.href) }));
  check(/Flower strips/.test(info.text) && /Brown hare/.test(info.text) && info.links.length >= 2 && info.links.every(u => u.startsWith('https://')), `the field margins page: chain, who it helps, source links: ${JSON.stringify(info)}`);
  await p.click('#wInfoClose');

  // 4. Who can appear: robin needs Hedgerows; otter needs Beavers + Rewet the land + Biodiversity 65.
  const can = await p.evaluate(async () => { const n = await import('./src/nature.js'), save = game.registry.get('save');
    const r = { robin: n.canAppear(save, 'robin'), otter: n.canAppear(save, 'otter'), sky: n.wildlifeScene(save).skyKinds };
    const all = ['deadwood', 'meadow', 'margins', 'hedgerow', 'pond', 'woodland', 'voles', 'beavers', 'rewet', 'storks', 'martens'];
    const rich = { ...save, habitat: { woodland: all }, planted: { oak: 40, birch: 40, rowan: 40, orchard: 40, spruce: 40 } };
    r.otterRich = n.canAppear(rich, 'otter'); r.otterNoRewet = n.canAppear({ ...rich, habitat: { woodland: all.filter(x => x !== 'rewet') } }, 'otter');
    return r; });
  check(can.robin && !can.otter && can.sky.includes('sky-robin'), `with hedgerows: robin yes, otter no: ${JSON.stringify(can)}`);
  check(can.otterRich && !can.otterNoRewet, `otter needs beavers AND rewetting (and a rich land): ${JSON.stringify(can)}`);

  // 4b. Rarity (2026-10-22): rare and very rare animals only far into a flight, and less often.
  const rar = await p.evaluate(async () => { const n = await import('./src/nature.js'), save = game.registry.get('save');
    const rich = { ...save, habitat: { woodland: ['deadwood', 'meadow', 'margins', 'hedgerow', 'pond', 'woodland', 'voles', 'beavers', 'rewet', 'storks', 'martens'] }, planted: { oak: 40, birch: 40, rowan: 40, orchard: 40, spruce: 40 } };
    const W = n.wildlifeScene(rich), count = (km, k) => { const c = {}; for (let i = 0; i < 3000; i++) { const x = W.pickWild(km); c[x] = (c[x] || 0) + 1; } return c; };
    return { early: count(500), far: count(20000), bio: n.biodiversity(rich), lone: n.biodiversity({ planted: { oak: 40, birch: 40, rowan: 40, orchard: 40, spruce: 40 } }) }; });
  check(!rar.early['animal-otter'] && !rar.early['animal-squirrel'] && !rar.early['animal-deer'] && rar.early['animal-rabbit'] > 0, `early in a flight: no rare animals: ${JSON.stringify(rar.early)}`);
  check(rar.far['animal-otter'] > 0 && rar.far['animal-otter'] < rar.far['animal-rabbit'] / 5, `far in a flight: rare ones appear, but much less often than common: ${JSON.stringify(rar.far)}`);
  check(rar.bio === 100 && rar.lone >= 35 && rar.lone <= 45, `the meter: everything = 100; trees alone ~40: ${rar.bio}, ${rar.lone}`);

  // 5. Found: only in a real flight, once. Then the collection counts it and shows its page with a source.
  await p.evaluate(() => game.scene.getScene('game').seen('sky-robin'));   // on the menu: not a flight
  check(!((await get(p)).found || {}).robin, 'seeing an animal outside a flight does not count');
  await p.click('#tabFly'); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  // No natural animals during this check (on a slow machine one wandered on and was found too), and
  // start from an empty collection: only the robin we show should count, once.
  const found = await p.evaluate(() => { const s = game.scene.getScene('game');
    s.wildlife = { ...s.wildlife, wildPerScreen: 0, birdsPerScreen: 0, farmPerScreen: 0 }; s.save.found = {}; s.foundThisFlight = 0;
    s.seen('sky-robin'); s.seen('sky-robin'); return { n: s.foundThisFlight, at: s.save.found.robin }; });
  check(found.n === 1 && found.at > 0, `the robin is found once: ${JSON.stringify(found)}`);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.finish({ landed: true }); });
  await p.waitForTimeout(2500);
  await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(300);
  const coll = await p.evaluate(() => ({ head: document.getElementById('wFoundHead').textContent, robin: document.querySelector('[data-species="robin"]').className, otter: document.querySelector('[data-species="otter"]').textContent }));
  check(/Wildlife found: 1 \//.test(coll.head) && /got/.test(coll.robin) && /\?\?\?/.test(coll.otter), `collection: 1 found (robin), otter still ???: ${JSON.stringify(coll)}`);
  await p.click('[data-species="robin"]'); await p.waitForTimeout(200);
  check(/Robin/.test(await p.textContent('#wInfoBody')) && (await p.$$('#wInfoBody a')).length >= 1, 'the robin page names it and links its source');
  await p.click('#wInfoClose');
  // A second flight lists only ITS animals (foundIds carried over between flights: art session, 2026-10-22).
  await p.evaluate(() => game.registry.get('ui').go('fly')); await p.click('#goBtn'); await started(p);
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  const second = await p.evaluate(() => { const s = game.scene.getScene('game'); s.wildlife = { ...s.wildlife, wildPerScreen: 0, birdsPerScreen: 0, farmPerScreen: 0 };
    s.seen('sky-swallow'); s.finish({ landed: true }); return { ids: s.result && s.result.foundIds, n: s.foundThisFlight }; });
  await p.waitForTimeout(1500);
  check(JSON.stringify(second.ids) === '["swallow"]' && second.n === 1, `the second flight lists only its own new animal: ${JSON.stringify(second)}`);
  await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(300);
  await p.click('[data-species="otter"]'); await p.waitForTimeout(200);
  check(/Beavers return \+ Rewet the land/.test(await p.textContent('#wInfoBody')), `an unfound animal says what brings it: ${await p.textContent('#wInfoBody')}`);
  await p.screenshot({ path: '/tmp/wild-test.png' });
  await p.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS wild (${srcs.projects} projects, ${srcs.animals} UK animals, all sourced)`);
})();
