// Hangar + menus: buying the LAST level of an upgrade works and the screen updates (it used to
// crash the redraw, so the purchase looked like it did nothing); a grey BUY button says what is
// missing; every screen has a big BACK at the top that returns to the title.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangar.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async crystals => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(c => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 9, seeds: 1250, crystals: c, levels: { radar: 3 } })); }, crystals);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    return p;
  };
  const radarRow = p => p.evaluate(() => [...document.querySelectorAll('#hUpgrades .line')].find(e => e.textContent.includes('Icy Air Radar')).textContent.replace(/\s+/g, ' '));

  // 1. Buy the last radar level.
  let p = await open(150);   // the last radar level: 1,200 seeds + 150 crystals (crystals 1 per 8 seeds, 2026-10-22)
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-buy=radar]'); await p.waitForTimeout(400);
  const s = JSON.parse(await p.evaluate(() => localStorage.getItem('contrailPilot.v2')));
  check(s.levels.radar === 4 && s.seeds === 50 && s.crystals === 0, `last radar level should be bought: ${JSON.stringify({ radar: s.levels.radar, seeds: s.seeds, crystals: s.crystals })}`);
  check(/All done!/.test(await radarRow(p)), `the maxed row should say All done!: "${await radarRow(p)}"`);
  check(await p.textContent('#hTrees') === '50', `the seed count on screen should drop to 50, shows ${await p.textContent('#hTrees')}`);
  check(p.errs.length === 0, `buying the last level threw: ${p.errs.join(' | ')}`);

  // 2. The bar along the bottom: from EVERY screen, one tap reaches EVERY other; exactly one
  // screen is open; the right tab is lit; nothing is left open underneath (e.g. a pop-up).
  const SCREENS = { fly: 'title', hangar: 'hangar', nature: 'nature', pilot: 'pilot', boards: 'boards' };   // NATURE is its own screen since 2026-10-21
  const state = () => p.evaluate(() => ({ open: ['title', 'results', 'hangar', 'nature', 'pilot', 'boards', 'how', 'about', 'info', 'scoreInfo', 'wInfo'].filter(id => !document.getElementById(id).hidden),
    lit: [...document.querySelectorAll('#tabbar .tab.on')].map(t => t.dataset.go), bar: !document.getElementById('tabbar').hidden }));
  for (const from of Object.keys(SCREENS)) for (const to of Object.keys(SCREENS)) {
    await p.click(`[data-go=${from}]`); await p.waitForTimeout(80);
    await p.evaluate(() => { document.getElementById('about').hidden = false; });   // a pop-up left open
    await p.evaluate(to => document.querySelector(`[data-go=${to}]`).click(), to); await p.waitForTimeout(80);   // (a real pop-up covers the bar; moving must still close it)
    const st = await state();
    check(st.bar && st.open.length === 1 && st.open[0] === SCREENS[to] && st.lit.join() === to, `${from} -> ${to}: ${JSON.stringify(st)}`);
  }
  const box = await p.locator('#tabbar').boundingBox();
  check(box && box.y + box.height >= 840 && box.height >= 48, `the bar should sit at the bottom, big enough to tap: ${JSON.stringify(box)}`);
  // No bar while flying; back after the flight.
  await p.click('[data-go=fly]'); await p.click('#goBtn'); await started(p); await p.waitForTimeout(400);
  check(!(await state()).bar, 'no bar while flying');
  await p.close();

  // 3. Short of crystals: the button is grey and says what is missing.
  p = await open(143);   // 7 short of the 150 crystals
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  check(await p.isDisabled('[data-buy=radar]'), 'short of crystals: BUY should be grey');
  check(/need 7 more/.test(await radarRow(p)), `short of crystals: should say "need 7 more": "${await radarRow(p)}"`);
  await p.close();

  // 4. The plane model at the top: your parts (gear down), a card tap zooms in and previews the
  // next level, a second tap zooms out, buying sparkles.
  p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 9, priceVersion: 2, seeds: 2000, crystals: 200,
    levels: { engine: 2, gear: 1, trees: 2, soil: 1, species: 2 } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(900); await p.click('#tabHangar'); await p.waitForTimeout(300);
  const model = () => p.evaluate(() => ({ parts: [...document.querySelectorAll('#hPlane img.hp-part:not(.hp-sparkle)')].map(i => i.getAttribute('src').replace(/^assets\/|\.png$/g, '')),
    preview: document.querySelector('#hPlane .hp-preview')?.getAttribute('src') || null, zoomed: document.getElementById('hPlane').classList.contains('zoomed'),
    t: document.querySelector('#hPlane .hp-stage').style.transform, sparkle: !document.querySelector('#hPlane .hp-sparkle').hidden }));
  let m = await model();
  check(m.parts.join() === 'plane-engine-2,plane-gear-1,plane-nature-2' && !m.zoomed && /scale\(3\)/.test(m.t), `model: owned parts, gear down, nature badge 2 (5 levels), not zoomed: ${JSON.stringify(m)}`);
  await p.click('.line[data-line="engine"] .name'); await p.waitForTimeout(200);
  m = await model();
  check(m.zoomed && m.preview === 'assets/plane-engine-3.png' && m.parts.includes('plane-engine-3') && !m.parts.includes('plane-engine-2') && !/scale\(3\)/.test(m.t), `tapping Engines zooms in and previews engine 3: ${JSON.stringify(m)}`);
  // Zoomed in: the part panel says what it does; HIDE / SHOW compares with and without it; more info opens (i).
  const panel = await p.textContent('#hPart');
  check(await p.isVisible('#hPart') && /Better Engines/.test(panel) && /Next: Super engines/.test(panel) && /30% less CO2/.test(panel), `part panel: name, next level and what it does: "${panel}"`);
  await p.click('#hpToggle'); await p.waitForTimeout(100);
  m = await model();
  check(!m.parts.some(k => k.startsWith('plane-engine-')) && m.parts.includes('plane-gear-1') && /SHOW PART/.test(await p.textContent('#hpToggle')), `HIDE takes only the engines off: ${JSON.stringify(m.parts)}`);
  await p.click('#hpToggle'); await p.waitForTimeout(100);
  check((await model()).parts.includes('plane-engine-3'), 'SHOW puts them back');
  await p.click('#hpMore'); await p.waitForTimeout(200);
  check(await p.isVisible('#info') && /Better Engines/.test(await p.textContent('#iName')), 'more info opens the full (i) page');
  await p.click('#iClose');
  await p.click('.line[data-line="engine"] .name'); await p.waitForTimeout(200);
  m = await model();
  check(!m.zoomed && !m.preview && m.parts.includes('plane-engine-2'), `tapping it again zooms out: ${JSON.stringify(m)}`);
  await p.click('[data-buy="engine"]'); await p.waitForTimeout(100);
  m = await model();
  check(m.parts.includes('plane-engine-3') && m.sparkle, `buying shows the new part with sparkles: ${JSON.stringify(m)}`);
  // Scrolled down: a card far down the list still shows the model on screen (it sticks to the top).
  await p.evaluate(() => document.getElementById('hangar').scrollTo(0, 99999)); await p.waitForTimeout(200);
  const far = await p.evaluate(() => [...document.querySelectorAll('#hUpgrades .line[data-line]')].pop().dataset.line);
  await p.click(`.line[data-line="${far}"] .name`); await p.waitForTimeout(600);
  const dock = await p.evaluate(() => { const r = document.getElementById('hPlane').getBoundingClientRect(), q = document.getElementById('hPart').getBoundingClientRect(); return { top: r.top, bottom: q.bottom, scrolled: document.getElementById('hangar').scrollTop }; });
  check(dock.scrolled > 200 && dock.top >= 0 && dock.top < 40 && dock.bottom < 844 - 70, `scrolled down (${far}): the model and its panel are on screen at the top: ${JSON.stringify(dock)}`);
  await p.screenshot({ path: '/tmp/hangar-scrolled.png' });
  check(p.errs.length === 0, `model errors: ${p.errs.join(' | ')}`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS hangar');
})();
