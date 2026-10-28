// Hangar + menus (the fleet hangar since the eras, src/hangar.js, 2026-10-23): buying a level works
// and the screen updates; choosing a plane; next era's levels and planes are blocked; a grey BUY
// says what is missing; the bar along the bottom reaches every screen.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangar.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  // A save with real progress, in the 1970s (2,000 s of flying), flying the 747, magnet at level 2.
  const open = async (crystals, more = {}) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([c, m]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, crystals: c,
      flightSeconds: 2000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: { magnet: 2 } }, ...m })); }, [crystals, more]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    return p;
  };
  const row = (p, name) => p.evaluate(n => [...document.querySelectorAll('#hFleet .fline')].find(e => e.querySelector('.name').textContent === n).textContent.replace(/\s+/g, ' '), name);
  const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));

  // 1. Buy the 1970s magnet level (3): 150 x 0.43 = 65 seeds, 8 crystals.
  let p = await open(150);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  await p.click('[data-fbuy="gadget:magnet"]'); await p.waitForTimeout(400);
  // Every purchase plays the payoff (hangar feedback, 2026-10-28): the overlay, then OK keeps you in the hangar.
  await p.waitForSelector('#payOk', { state: 'visible', timeout: 5000 }).catch(() => {});
  check(await p.isVisible('#payOk'), 'buying a gadget did not play the payoff');
  if (await p.isVisible('#payOk')) await p.click('#payOk');
  await p.waitForTimeout(200);
  check(await p.isVisible('#hFleet'), 'after the payoff OK: not in the hangar any more');
  let s = await saved(p);
  check(s.fleet.gadgets.magnet === 3 && s.seeds === 1185 && s.crystals === 142, `magnet 3 bought: ${JSON.stringify({ m: s.fleet.gadgets.magnet, seeds: s.seeds, crystals: s.crystals })}`);
  check(/Electromagnet/.test(await row(p, 'Magnet')) && /Next: Stronger coil/.test(await row(p, 'Magnet')), `the row moves on: "${await row(p, 'Magnet')}"`);
  check(await p.textContent('#hTrees') === '1185', `the seed count on screen drops to 1185: ${await p.textContent('#hTrees')}`);
  // Choose a plane: FLY THIS on the Comet.
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  check(/Opens in the 1990s/.test(await p.textContent('.fplane.locked')), 'the 1990s twin is a locked silhouette');
  await p.click('[data-fly=comet]'); await p.waitForTimeout(300);
  s = await saved(p);
  check(s.fleet.plane === 'comet' && /Comet 4/.test(await p.textContent('.fplane.flying')) && /COMET 4/.test(await p.textContent('#hFleet .tree-head')), `the Comet is chosen and its lines shown: ${s.fleet.plane}`);
  check(p.errs.length === 0, `buying threw: ${p.errs.join(' | ')}`);
  await p.close();

  // 1b. In the 1950s the 1970s level is blocked: no BUY, says when.
  p = await open(150, { flightSeconds: 60 });
  await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  check(/blocked until the 1970s/.test(await row(p, 'Magnet')) && !(await p.$('[data-fbuy="gadget:magnet"]')), `1950s: magnet 3 blocked: "${await row(p, 'Magnet')}"`);
  await p.close();

  p = await open(150);
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
  p = await open(1);   // 7 short of magnet 3's 8 crystals
  await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  check(await p.isDisabled('[data-fbuy="gadget:magnet"]'), 'short of crystals: BUY should be grey');
  check(/need 7 more/.test(await row(p, 'Magnet')), `short of crystals: should say "need 7 more": "${await row(p, 'Magnet')}"`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS hangar');
})();
