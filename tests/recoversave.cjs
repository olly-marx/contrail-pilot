// RECOVER AN EARLIER SAVE (Settings; src/save.js stashSave / restoreStashed, src/ui.js openRecover; the user lost a 260-flight save, 2026-11-05).
// Real taps in the shipped game: the gear sheet has the entry; it lists the kept saves in plain words (date, flights, landings); a tap asks to confirm
// (CANCEL changes nothing); GO BACK TO IT puts that save back and keeps the one it replaced; RESET PROGRESS says it can be recovered, and keeps the save.
// Run: python3 -m http.server 8000 & node tests/recoversave.cjs   (proved by planted defects: tools/plants.tsv, test recoversave)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['x-bars', 'records-intro'], tours: ['*'], priceVersion: 2, fleet, areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] };
  const now = { ...base, flights: 260, landings: 188, seeds: 100 }, earlier = { ...base, flights: 123, landings: 77, seeds: 111 };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(([cur, old]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
    localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(cur));
    localStorage.setItem('s2:contrailPilot.v2.replaced-1', JSON.stringify({ at: Date.UTC(2026, 10, 5), reason: 'test', flights: old.flights, landings: old.landings, raw: JSON.stringify(old) })); } }, [now, earlier]);
  await p.goto(URL); await ready(p); await p.waitForTimeout(900);
  const main = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));   // (in the page the season-2 layer adds the s2: prefix itself)
  const stash = n => p.evaluate(n => { const v = localStorage.getItem(`contrailPilot.v2.replaced-${n}`); return v && JSON.parse(v); }, 1);
  const sheetText = () => p.evaluate(() => { const s = document.getElementById('sheet'); return s ? s.innerText : ''; });

  await p.click('#hubGear'); await p.waitForTimeout(300); await p.click('#sheet [data-gear="saved"]'); await p.waitForTimeout(250);
  check(/RECOVER AN EARLIER SAVE/.test(await sheetText()), 'YOUR SAVED GAME (Settings, second page) has RECOVER AN EARLIER SAVE');
  await p.click('#sheet [data-gear="recover"]'); await p.waitForTimeout(300);
  const list = await sheetText();
  check(/123 flights, 77 landings/.test(list) && /Nov/.test(list), `the entry lists the kept save in plain words (date, flights, landings): ${JSON.stringify(list.slice(0, 120))}`);
  check((await p.$$('#sheet [data-restore]')).length === 1, 'one kept save, one row');
  await p.click('#sheet [data-restore="1"]'); await p.waitForTimeout(300);
  check(/Go back to this save\?/.test(await sheetText()) && /kept too/.test(await sheetText()), 'a tap asks to confirm and says the game now is kept too');
  await p.click('#sheet .sheet-ok'); await p.waitForTimeout(200);   // CANCEL
  check((await main()).seeds === 100, 'CANCEL changes nothing');
  await p.click('#hubGear'); await p.click('#sheet [data-gear="saved"]'); await p.waitForTimeout(250); await p.click('#sheet [data-gear="recover"]'); await p.click('#sheet [data-restore="1"]'); await p.waitForTimeout(200);
  await Promise.all([p.waitForEvent('load'), p.click('#sheet .sheet-action')]);
  await ready(p); await p.waitForTimeout(700);
  const back = await main(), kept = await stash(1);
  check(back.seeds === 111 && back.flights === 123, `GO BACK TO IT: the earlier save is the game now: ${JSON.stringify({ seeds: back.seeds, flights: back.flights })}`);
  check(kept && kept.flights === 260, `... and the save it replaced is kept: ${JSON.stringify(kept && kept.flights)}`);

  // RESET PROGRESS: the confirm says it can be recovered; the save is kept
  let msg = '';
  p.once('dialog', d => { msg = d.message(); d.accept(); });
  await p.click('#hubGear'); await p.click('#sheet [data-gear="saved"]'); await p.waitForTimeout(250); await p.click('#sheet [data-gear="reset"]'); await p.waitForTimeout(500);
  check(/RECOVER AN EARLIER SAVE/.test(msg), `the reset confirm says the game can be recovered: ${JSON.stringify(msg)}`);
  const afterReset = await stash(1);
  check(afterReset && afterReset.flights === 123 && ((await main()) || {}).flights !== 123, `a reset keeps the save it deletes: ${JSON.stringify(afterReset && afterReset.flights)}`);
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL recoversave:\n - ${fails.join('\n - ')}` : 'PASS recoversave: Settings lists the kept saves, a confirm, GO BACK keeps the current one, a reset is recoverable');
  process.exit(fails.length ? 1 : 0);
})();
