// THE STREAK MISSIONS ON THE MISSIONS SCREEN (release B: src/missionsview.js, src/missionplan.js ownStreak, src/missions2.js). Real taps, 390x844 and 320x568, a season 2 save in LONDON with tiers 1 to 3 open. Named lines, in order:
//   FIXTURE  both streak rows are on the MISSIONS screen
//   1. the rows are named 'Land 2 long flights' and 'Land 3 long flights' with the how-lines '0 of 2 in a row' and '0 of 3 in a row'
//   2. the sheet of Land 2 names the stored distance (3,100 km for the Comet) and the rule about a crash
//   3. with a stored count of 1 the Land 2 row says '1 of 2 in a row'
// Run: python3 -m http.server 8000 & node tests/streakui.cjs   (plants: tools/plants.tsv, test streakui)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'streakui-shots');   // (not under /home: a CI runner has no such directory)
const URL = process.env.URL || 'http://localhost:8000/';
const T12 = ['shade', 'plant-tree', 'clean-gaps', 'dodge', 'spot', 'hazard'].map(x => `weurope:${x}`);
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 500, crystals: 50, levels: {}, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5', ...T12], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let shotsOk = true; try { if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS); } catch (e) { shotsOk = false; console.log(`NOTE: screenshots off, cannot make ${SHOTS}: ${e.code || e}`); }   // (not recursive: that can loop on an uncreatable path)
  const shot = (p, name) => (shotsOk ? p.screenshot({ path: `${SHOTS}/${name}` }).catch(() => {}) : Promise.resolve());
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      let stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        const r2 = '[data-mrow="weurope:streak2"]', r3 = '[data-mrow="weurope:streak3"]';
        const open = async () => { await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(500); };
        const info = sel => p.evaluate(s => { const e = document.querySelector(s); return e ? { name: e.querySelector('.rowc-name').textContent.trim(), how: e.querySelector('.m-how').textContent.trim() } : null; }, sel);
        stage = 'open MISSIONS'; await open();
        const a = await info(r2), c = await info(r3);
        check(!!a && !!c, `${tag}: FIXTURE: both streak rows are on the MISSIONS screen: ${JSON.stringify([a, c])}`);
        if (!a || !c) { await ctx.close(); continue; }
        await shot(p, `${tag}-streak-rows.png`);
        check(/^Land 2 long flights/.test(a.name) && a.how === '0 of 2 in a row' && /^Land 3 long flights/.test(c.name) && c.how === '0 of 3 in a row', `${tag}: the rows are named Land 2 / Land 3 long flights with '0 of N in a row': ${JSON.stringify([a, c])}`);
        stage = 'tap the Land 2 row'; await p.click(r2); await p.waitForTimeout(400);
        const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
        await shot(p, `${tag}-streak-sheet.png`);
        check(!!sh && /3,?100/.test(sh) && /crash/i.test(sh), `${tag}: the sheet names the stored distance (3,100 km) and the crash rule: ${JSON.stringify(sh)}`);
        stage = 'seed a count'; await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.missionStreak = { ...(ui.save.missionStreak || {}), 'weurope:streak2': 1 }; });
        await p.keyboard.press('Escape').catch(() => {}); await open(); const a1 = await info(r2);
        check(!!a1 && a1.how === '1 of 2 in a row', `${tag}: with a stored count of 1 the row says '1 of 2 in a row': ${JSON.stringify(a1)}`);
        check(!p.errs.length, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL streakui:\n - ${fails.join('\n - ')}` : 'PASS streakui: Land 2 / Land 3 long flights show their count in a row, the sheet names the stored distance and the crash rule (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
