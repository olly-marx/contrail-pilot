// NATURE in every region (2026-10-22, the user's design): a region's tab opens once you have been
// there (landed in one of its cities); savanna and rainforest wait for an airport. Each region has its
// own projects, meter and animals, bought into save.habitat[region]; animals not drawn yet show a "?";
// who runs a project is shown, with links behind the grown-up gate (hold 2 s).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/regions.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
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
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    return p;
  };
  const get = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const tab = (p, r) => p.evaluate(r => { const e = document.querySelector(`[data-region="${r}"]`); return e && { off: e.disabled, text: e.textContent.trim() }; }, r);
  const base = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9, priceVersion: 2 };

  // 1. Never been anywhere but London: only the UK tab opens.
  let p = await open({ ...base, seeds: 500, crystals: 50, visited: ['LONDON'] });
  await p.click('#tabNature'); await p.waitForTimeout(300);
  check(!(await tab(p, 'woodland')).off && (await tab(p, 'mediterranean')).off, `only the UK is open before travelling: ${JSON.stringify(await tab(p, 'mediterranean'))}`);
  await p.close();

  // 2. Been to Rome: the Mediterranean opens; the desert says "fly there"; the savanna says "soon".
  p = await open({ ...base, seeds: 500, crystals: 50, visited: ['LONDON', 'PARIS', 'BERLIN', 'ROME'], habitat: { woodland: ['deadwood'] } });
  await p.click('#tabNature'); await p.waitForTimeout(300);
  const med = await tab(p, 'mediterranean'), des = await tab(p, 'desert'), sav = await tab(p, 'savanna');
  check(!med.off && des.off && /fly there/.test(des.text) && sav.off && /soon/.test(sav.text), `tabs: ${JSON.stringify({ med, des, sav })}`);
  const ukMeter = await p.textContent('#wMeter');
  await p.click('[data-region="mediterranean"]'); await p.waitForTimeout(300);

  // 3. Its own projects (not the UK's), its own meter, and buying puts it in save.habitat.mediterranean.
  const list = await p.evaluate(() => [...document.querySelectorAll('[data-pline]')].map(e => e.dataset.pline));
  check(list.includes('olives') && !list.includes('deadwood'), `Mediterranean projects listed, not the UK's: ${list}`);
  const price = await p.evaluate(async () => { const h = await import('./src/habitats.js'); return h.REGION_DATA.mediterranean.projects.find(x => x.id === 'olives'); });
  await p.click('[data-project="olives"]'); await p.waitForTimeout(200);
  const s = await get(p);
  check(JSON.stringify(s.habitat.mediterranean) === '["olives"]' && JSON.stringify(s.habitat.woodland) === '["deadwood"]', `bought into its own region: ${JSON.stringify(s.habitat)}`);
  check(s.seeds === 500 - price.cost && s.crystals === 50 - price.crystals, `paid ${price.cost} + ${price.crystals}: ${s.seeds} / ${s.crystals}`);
  const meters = await p.evaluate(async () => { const n = await import('./src/nature.js'), sv = game.registry.get('save');
    return { uk: n.biodiversity(sv), med: n.biodiversity(sv, 'mediterranean'), des: n.biodiversity(sv, 'desert') }; });
  check(meters.med > 0 && meters.des === 0 && meters.uk === (await p.evaluate(async () => (await import('./src/nature.js')).biodiversity(game.registry.get('save')))), `one meter per region: ${JSON.stringify(meters)}`);
  check((await p.textContent('#wMeter')) !== ukMeter || meters.med === meters.uk, 'the meter shown is the region\'s own');
  check(!(await p.isVisible('#wTrees')), 'tree upgrades are a UK thing: hidden in other regions');

  // 4. Who runs it: the name shows; the links only after a grown-up holds the button for 2 s.
  await p.click('[data-pinfo="olives"]'); await p.waitForTimeout(200);
  const before = await p.evaluate(() => ({ org: !!document.querySelector('#wInfoBody .w-org b'), shown: !document.querySelector('.w-orglinks').hidden }));
  check(before.org && !before.shown, `org named, links hidden until the gate: ${JSON.stringify(before)}`);
  const g = await p.$('.w-gate'), bb = await g.boundingBox();
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.waitForTimeout(600); await p.mouse.up();
  check(await p.evaluate(() => document.querySelector('.w-orglinks').hidden), 'a short tap does not open the links');
  await p.mouse.down(); await p.waitForTimeout(2300); await p.mouse.up();
  const after = await p.evaluate(() => ({ shown: !document.querySelector('.w-orglinks').hidden, urls: [...document.querySelectorAll('.w-orglinks a')].map(a => a.href) }));
  check(after.shown && after.urls.length >= 1 && after.urls.every(u => u.startsWith('https://')), `held 2 s: links show: ${JSON.stringify(after)}`);
  await p.click('#wInfoClose');

  // 5. Animals not drawn yet: a "?" card, and their page says they are being drawn.
  const undrawn = await p.evaluate(async () => { const n = await import('./src/nature.js'); return n.regionSpecies('mediterranean').filter(w => !w.sprite).map(w => w.id); });
  check(undrawn.length > 0, 'some Mediterranean animals are not drawn yet (test needs one)');
  if (undrawn.length) {
    check(!!(await p.$(`[data-species="${undrawn[0]}"] .w-nopic`)), `${undrawn[0]}: a "?" picture`);
    await p.click(`[data-species="${undrawn[0]}"]`); await p.waitForTimeout(200);
    check(/still drawing/.test(await p.textContent('#wInfoBody')), 'an undrawn animal says it is being drawn');
    await p.click('#wInfoClose');
  }
  // 6. The lynx needs rabbits AND a richer land; a drawn common one can appear straight away.
  const can = await p.evaluate(async () => { const n = await import('./src/nature.js'), sv = game.registry.get('save');
    return { boar: n.canAppear(sv, 'boar', 'mediterranean'), lynx: n.canAppear(sv, 'lynxiberian', 'mediterranean'),
      lynxRich: n.canAppear({ habitat: { mediterranean: ['olives', 'firegraze', 'dehesa', 'turtlebeach', 'reedcut', 'flamingoisland', 'rabbits', 'vultures', 'bearsmart', 'chamoisreturn'] } }, 'lynxiberian', 'mediterranean') }; });
  check(can.boar && !can.lynx && can.lynxRich, `who can appear: ${JSON.stringify(can)}`);
  await p.screenshot({ path: '/tmp/regions-test.png', fullPage: true });
  await p.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS regions');
})();
