// Hangar + menus: buying the LAST level of an upgrade works and the screen updates (it used to
// crash the redraw, so the purchase looked like it did nothing); a grey BUY button says what is
// missing; every screen has a big BACK at the top that returns to the title.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangar.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async crystals => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(c => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 9, seeds: 200, crystals: c, levels: { radar: 3 } })); }, crystals);
    await p.goto(URL); await p.waitForTimeout(900);
    return p;
  };
  const radarRow = p => p.evaluate(() => [...document.querySelectorAll('#hUpgrades .line')].find(e => e.textContent.includes('Icy Air Radar')).textContent.replace(/\s+/g, ' '));

  // 1. Buy the last radar level.
  let p = await open(9);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-buy=radar]'); await p.waitForTimeout(400);
  const s = JSON.parse(await p.evaluate(() => localStorage.getItem('contrailPilot.v2')));
  check(s.levels.radar === 4 && s.seeds === 50 && s.crystals === 0, `last radar level should be bought: ${JSON.stringify({ radar: s.levels.radar, seeds: s.seeds, crystals: s.crystals })}`);
  check(/All done!/.test(await radarRow(p)), `the maxed row should say All done!: "${await radarRow(p)}"`);
  check(await p.textContent('#hTrees') === '50', `the seed count on screen should drop to 50, shows ${await p.textContent('#hTrees')}`);
  check(p.errs.length === 0, `buying the last level threw: ${p.errs.join(' | ')}`);

  // 2. The bar along the bottom: from EVERY screen, one tap reaches EVERY other; exactly one
  // screen is open; the right tab is lit; nothing is left open underneath (e.g. a pop-up).
  const SCREENS = { fly: 'title', hangar: 'hangar', nature: 'hangar', pilot: 'pilot', boards: 'boards' };
  const state = () => p.evaluate(() => ({ open: ['title', 'results', 'hangar', 'pilot', 'boards', 'how', 'about', 'info', 'scoreInfo'].filter(id => !document.getElementById(id).hidden),
    lit: [...document.querySelectorAll('#tabbar .tab.on')].map(t => t.dataset.go), bar: !document.getElementById('tabbar').hidden, natureTab: document.querySelector('#hTabs .on')?.dataset.tab }));
  for (const from of Object.keys(SCREENS)) for (const to of Object.keys(SCREENS)) {
    await p.click(`[data-go=${from}]`); await p.waitForTimeout(80);
    await p.evaluate(() => { document.getElementById('about').hidden = false; });   // a pop-up left open
    await p.evaluate(to => document.querySelector(`[data-go=${to}]`).click(), to); await p.waitForTimeout(80);   // (a real pop-up covers the bar; moving must still close it)
    const st = await state();
    check(st.bar && st.open.length === 1 && st.open[0] === SCREENS[to] && st.lit.join() === to, `${from} -> ${to}: ${JSON.stringify(st)}`);
    if (to === 'nature' || to === 'hangar') check(st.natureTab === (to === 'nature' ? 'nature' : 'plane'), `${from} -> ${to}: hangar should open on the ${to} tab, got ${st.natureTab}`);
  }
  const box = await p.locator('#tabbar').boundingBox();
  check(box && box.y + box.height >= 840 && box.height >= 48, `the bar should sit at the bottom, big enough to tap: ${JSON.stringify(box)}`);
  // No bar while flying; back after the flight.
  await p.click('[data-go=fly]'); await p.click('#goBtn'); await p.waitForTimeout(400);
  check(!(await state()).bar, 'no bar while flying');
  await p.close();

  // 3. Short of crystals: the button is grey and says what is missing.
  p = await open(2);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  check(await p.isDisabled('[data-buy=radar]'), 'short of crystals: BUY should be grey');
  check(/need 7 more/.test(await radarRow(p)), `short of crystals: should say "need 7 more": "${await radarRow(p)}"`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS hangar');
})();
