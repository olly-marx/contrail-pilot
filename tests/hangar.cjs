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
    await p.addInitScript(c => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 9, seeds: 200, crystals: c, levels: { radar: 2 } })); }, crystals);
    await p.goto(URL); await p.waitForTimeout(900);
    return p;
  };
  const radarRow = p => p.evaluate(() => [...document.querySelectorAll('#hUpgrades .line')].find(e => e.textContent.includes('Icy Air Radar')).textContent.replace(/\s+/g, ' '));

  // 1. Buy the last radar level.
  let p = await open(9);
  await p.click('#hangarBtn'); await p.waitForTimeout(300);
  await p.click('[data-buy=radar]'); await p.waitForTimeout(400);
  const s = JSON.parse(await p.evaluate(() => localStorage.getItem('contrailPilot.v2')));
  check(s.levels.radar === 3 && s.seeds === 130 && s.crystals === 4, `last radar level should be bought: ${JSON.stringify({ radar: s.levels.radar, seeds: s.seeds, crystals: s.crystals })}`);
  check(/All done!/.test(await radarRow(p)), `the maxed row should say All done!: "${await radarRow(p)}"`);
  check(await p.textContent('#hTrees') === '130', `the seed count on screen should drop to 130, shows ${await p.textContent('#hTrees')}`);
  check(p.errs.length === 0, `buying the last level threw: ${p.errs.join(' | ')}`);

  // 2. BACK at the top of each screen returns to the title.
  for (const [btn, back, name] of [['#hangarBtn', '#hBackTop', 'hangar'], ['#pilotBtn', '#pBackTop', 'my pilot'], ['#boardsBtn', '#bBackTop', 'leaderboard']]) {
    await p.evaluate(() => game.registry.get('ui').showTitle());
    await p.click(btn); await p.waitForTimeout(300);
    const box = await p.locator(back).boundingBox();
    check(box && box.y < 300 && box.height >= 24, `${name}: BACK should be big and near the top: ${JSON.stringify(box)}`);
    await p.click(back); await p.waitForTimeout(300);
    check(await p.isVisible('#goBtn'), `${name}: BACK should return to the title`);
  }
  await p.close();

  // 3. Short of crystals: the button is grey and says what is missing.
  p = await open(2);
  await p.click('#hangarBtn'); await p.waitForTimeout(300);
  check(await p.isDisabled('[data-buy=radar]'), 'short of crystals: BUY should be grey');
  check(/need 3 more/.test(await radarRow(p)), `short of crystals: should say "need 3 more": "${await radarRow(p)}"`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS hangar');
})();
