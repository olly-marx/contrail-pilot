// FLY AROUND HERE (was EXPLORE HERE until the FLY HERE row, src/wild.js renderFlyHere, 2026-11-18) on a land's NATURE page (src/wild.js; research/ROUTE-DEFAULT-MISSION-PLAN.md; the user, 2026-11-10). Real taps at 390x844 and 320x568, season 2.
//  control: with a city mission open the home chip says 'Mission: <city>', and NATURE shows FLY AROUND HERE on the home land (it still has cities to visit).
//  1. tapping FLY AROUND HERE saves stayLand = that land and routeMode 'explore', opens the FLY screen, the chip there says 'Explore: <a city of that land>', and back on NATURE the button reads STOP.
//  2. tapping STOP returns to the mission: routeMode 'mission', stayLand null, the chip says 'Mission:' again, the button reads FLY AROUND HERE.
//  3. when every city of the land is already visited the button is hidden.
// Source of each page-state expectation: wild.js renderFlyHere (kind 'here': hidden when nothing is left and not staying; the tap), aim.js stayLandLeft / steerOf, ui.js renderHub (the chip).
// Run: python3 -m http.server 8000 & node tests/exploreland.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const { CITIES } = await import('../src/cities.js');
  const land = CITIES.filter(c => c.region === 'woodland').map(c => c.name);   // (the home land of a London start)
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) for (const done of [false, true]) {
      const tag = `${W}x${H}${done ? ' all visited' : ''}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage();
      p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      const s = done ? { ...seed, visited: land } : seed;
      await p.addInitScript(x => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(x)); sessionStorage.setItem('fresh', '1'); } }, s);
      let stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        const go = id => p.evaluate(t => game.registry.get('ui').go(t), id).then(() => p.waitForTimeout(700));
        const chip = () => p.evaluate(() => document.getElementById('hubRoute').innerText.replace(/\s+/g, ' ').trim());
        const btn = () => p.evaluate(() => { const e = document.getElementById('wFlyHereBtn'); return e ? { hidden: e.hidden || e.offsetParent === null, text: e.textContent.trim() } : null; });
        const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
        if (done) {   // 3. nothing left to visit in the land: the button is hidden (the control for this is the first run below, where it shows)
          stage = 'all visited: NATURE'; await go('nature'); const e = await btn();
          check(!e || e.hidden, `${tag}: FLY AROUND HERE is hidden when every city of the land is visited: ${JSON.stringify(e)}`);
          await ctx.close(); continue;
        }
        stage = 'control: chip and NATURE'; await go('fly');
        const c0 = await chip(); check(/^Mission: /.test(c0), `${tag}: control: with a city mission open the chip says 'Mission: <city>': ${c0}`);
        await go('nature'); const e0 = await btn();
        check(!!e0 && !e0.hidden && e0.text === 'FLY AROUND HERE', `${tag}: control: NATURE shows FLY AROUND HERE on the home land: ${JSON.stringify(e0)}`);
        if (fails.length) { await ctx.close(); continue; }
        stage = 'tap FLY AROUND HERE'; await p.click('#wFlyHereBtn'); await p.waitForTimeout(700);
        const s1 = await save(), onFly = await p.evaluate(() => !document.getElementById('title').hidden && document.getElementById('nature').hidden);
        check(s1.stayLand === 'woodland' && s1.routeMode === 'explore', `${tag}: FLY AROUND HERE saves stayLand 'woodland' and routeMode 'explore': ${s1.stayLand} / ${s1.routeMode}`);
        check(onFly, `${tag}: FLY AROUND HERE opens the FLY screen`);
        const c1 = await chip(), m1 = /^Explore: (.+?) ?›?$/.exec(c1), city1 = m1 && m1[1].replace(/[^A-Z .'-]/g, '').trim();
        check(!!m1 && land.includes(city1), `${tag}: the chip says 'Explore:' and a city of that land: ${c1}`);
        await go('nature'); const e1 = await btn(); check(!!e1 && e1.text === 'STOP', `${tag}: back on NATURE the button reads STOP: ${JSON.stringify(e1)}`);
        stage = 'tap STOP'; await p.click('#wFlyHereBtn'); await p.waitForTimeout(500);
        const s2 = await save(), e2 = await btn();
        check(s2.stayLand == null && s2.routeMode === 'mission', `${tag}: STOP returns to the mission (stayLand null, routeMode 'mission'): ${s2.stayLand} / ${s2.routeMode}`);
        check(!!e2 && e2.text === 'FLY AROUND HERE', `${tag}: after STOP the button reads FLY AROUND HERE again: ${JSON.stringify(e2)}`);
        await go('fly'); const c2 = await chip(); check(/^Mission: /.test(c2), `${tag}: after STOP the chip says 'Mission:' again: ${c2}`);
        check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL exploreland:\n - ${fails.join('\n - ')}` : 'PASS exploreland: FLY AROUND HERE keeps the flight in one land, STOP returns to the mission, the button hides when the land is done (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
