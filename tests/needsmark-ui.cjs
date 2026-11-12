// THE ASTERISK ON A MISSION THAT NEEDS AN UPGRADE (src/missionsview.js row, src/ui.js goToLine, src/wild.js toolId; research MISSION-REVAMP-PLAN.md section 3). Real taps, 390x844 and 320x568, a season 2 save in LONDON
// with tier 1 open and Tree Planting NOT owned. Named lines, in order:
//   FIXTURE  the plant-tree mission row is on the MISSIONS screen
//   1. the row shows the asterisk after its name and 'Needs 2 parcels' in the how-line
//   2. a tap on the row opens a sheet that says '* You need: Tree parcels' and offers GO TO NATURE
//   3. a tap on GO TO NATURE shows NATURE with the Tree Planting row selected (previewing) and on screen
//   4. once the save owns Tree Planting level 1 the row shows no asterisk and no 'Needs' (a derived marker: nothing to clear)
// Run: python3 -m http.server 8000 & node tests/needsmark-ui.cjs   (plants: tools/plants.tsv, test needsmark-ui)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const fs = require('fs'), os = require('os'), path = require('path');
const SHOTS = process.env.SHOTS || path.join(os.tmpdir(), 'needsmark-shots');   // (not under /home: a CI runner has no such directory)
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 500, crystals: 50, levels: {}, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
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
        const rowSel = '[data-mrow="weurope:plant-tree"]';
        const open = async () => { await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(500); };
        const rowInfo = () => p.evaluate(sel => { const e = document.querySelector(sel); return e ? { name: e.querySelector('.rowc-name').textContent.trim(), how: e.querySelector('.m-how').textContent.trim() } : null; }, rowSel);
        stage = 'open MISSIONS'; await open();
        let r0 = await rowInfo();
        check(!!r0, `${tag}: FIXTURE: the plant-tree row is on the MISSIONS screen`);
        if (!r0) { await ctx.close(); continue; }
        await shot(p, `${tag}-missions-asterisk.png`);
        check(/\*$/.test(r0.name) && r0.how === 'Needs 2 trees', `${tag}: the row shows the asterisk and 'Needs 2 trees': ${JSON.stringify(r0)}`);
        stage = 'tap the row'; await p.click(rowSel); await p.waitForTimeout(400);
        const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return e ? { text: e.innerText.replace(/\s+/g, ' '), action: (e.querySelector('.sheet-action') || {}).textContent || null } : null; });
        check(!!sh && /\* You need: Plant trees/.test(sh.text) && sh.action === 'GO TO NATURE', `${tag}: the sheet says '* You need: Plant trees' and offers GO TO NATURE: ${JSON.stringify(sh)}`);
        stage = 'tap GO TO NATURE'; await p.click('#sheet .sheet-action').catch(() => {}); await p.waitForTimeout(700);
        const nat = await p.evaluate(() => { const e = document.querySelector('[data-line="trees"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { previewing: e.classList.contains('previewing'), onScreen: r.bottom > 0 && r.top < innerHeight, natureShown: !!document.querySelector('#nature') && !document.getElementById('nature').hidden }; });
        await shot(p, `${tag}-nature-after-tap.png`);
        check(!!nat && nat.natureShown && nat.previewing && nat.onScreen, `${tag}: GO TO NATURE shows NATURE with the Tree Planting row selected and on screen: ${JSON.stringify(nat)}`);
        stage = 'own Tree Planting'; await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.levels = { ...(ui.save.levels || {}), trees: 1 }; });
        await open(); const r1 = await rowInfo();
        check(!!r1 && !/\*$/.test(r1.name) && !/^Needs/.test(r1.how), `${tag}: once Tree Planting is owned the row shows no asterisk and no Needs: ${JSON.stringify(r1)}`);
        check(!p.errs.length, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL needsmark-ui:\n - ${fails.join('\n - ')}` : 'PASS needsmark-ui: a planting mission without the upgrade shows an asterisk and Needs N parcels, its sheet takes the player to the Tree Planting row on NATURE, and the marker goes when the upgrade is owned (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
