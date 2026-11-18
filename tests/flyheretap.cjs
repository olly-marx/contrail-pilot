// FLY HERE on a land's NATURE page, real taps (src/wild.js renderFlyHere, src/flyhere.js; the owner, 2026-11-18: he opened the desert land and could not find how to fly there).
// Shipped game (season 2), 390x844 and 320x568. A Europe player in ROME with Africa & the Middle East open, the desert land opened.
//  control: before the tap nothing is aimed (no save.aimCity, no stayLand) and the desert page says 'CAIRO is 2 stops away.' with a FLY HERE button.
//  1. tapping FLY HERE opens the FLY screen with the route aimed at CAIRO (save.aimCity CAIRO, the chip names CAIRO and is not 'Mission:' or 'Explore:'), stayLand 'desert', routeMode 'explore'.
//  2. after arriving in CAIRO (the save's city becomes CAIRO and HOME is drawn, which clears the aim: src/aim.js arrivedGoto) the flights stay in the desert: the chip says 'Explore: <a desert city>',
//     and the desert page says the flights stay in this land, with STOP.
//  3. with Africa & the Middle East NOT open the page says which crossing opens it ('first cross from ROME to TUNIS') and has no button.
// Run: python3 -m http.server 8000 & URL=http://localhost:8000/ node tests/flyheretap.cjs   (plants in tools/plants.tsv)
require('./lib/shipped.js');
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope', 'africa'], homeArea: 'weurope', homeCity: 'LONDON', city: 'ROME', visited: ['LONDON', 'PARIS', 'ROME'], discovered: { desert: true }, tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2,
  seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  globalThis.SEASON2 = true;
  const { CITIES } = await import('../src/cities.js');
  const desert = CITIES.filter(c => c.region === 'desert').map(c => c.name);
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) for (const closed of [false, true]) {
      const tag = `${W}x${H}${closed ? ' closed' : ''}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage();
      p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(x => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify(x)); sessionStorage.setItem('fresh', '1'); } }, closed ? { ...seed, areas: ['weurope'] } : seed);
      let stage = 'load';
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        const desertPage = () => p.evaluate(() => { const ui = game.registry.get('ui'); ui.go('nature'); ui.wild.region = 'desert'; ui.wild.render(); }).then(() => p.waitForTimeout(600));
        const row = () => p.evaluate(() => { const e = document.getElementById('wFlyHere'), btn = document.getElementById('wFlyHereBtn'); return e ? { hidden: e.hidden || e.offsetParent === null, line: (e.querySelector('.wfh-line') || {}).textContent || '', btn: btn ? btn.textContent.trim() : null } : null; });
        const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
        const chip = () => p.evaluate(() => document.getElementById('hubRoute').innerText.replace(/\s+/g, ' ').trim());
        const onFly = () => p.evaluate(() => !document.getElementById('title').hidden && document.getElementById('nature').hidden);
        stage = 'desert page'; await desertPage(); const r0 = await row();
        if (closed) {   // 3. the crossing that opens it, no button (the control is the open run: a button there)
          check(!!r0 && !r0.hidden && r0.line === 'To fly here, first cross from ROME to TUNIS.' && r0.btn === null, `${tag}: an unreachable land names its crossing and has no button: ${JSON.stringify(r0)}`);
          check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`); await ctx.close(); continue;
        }
        const s0 = await save();
        check(!s0.aimCity && !s0.stayLand, `${tag}: control: nothing aimed before the tap: ${s0.aimCity} / ${s0.stayLand}`);
        check(!!r0 && !r0.hidden && r0.line === 'CAIRO is 2 stops away.' && r0.btn === 'FLY HERE', `${tag}: control: the desert page offers FLY HERE to CAIRO: ${JSON.stringify(r0)}`);
        if (fails.length) { await ctx.close(); continue; }
        stage = 'tap FLY HERE'; await p.click('#wFlyHereBtn'); await p.waitForTimeout(800);
        const s1 = await save(), c1 = await chip();
        check(await onFly(), `${tag}: FLY HERE opens the FLY screen`);
        check(s1.aimCity === 'CAIRO', `${tag}: the route is aimed at CAIRO: aimCity ${s1.aimCity}`);
        check(s1.stayLand === 'desert' && s1.routeMode === 'explore', `${tag}: the stay in the desert is set for after arriving: ${s1.stayLand} / ${s1.routeMode}`);
        check(/CAIRO/.test(c1) && !/^(Mission|Explore|Next):/.test(c1), `${tag}: the FLY screen's chip shows the chosen route to CAIRO: ${c1}`);
        stage = 'arrive in CAIRO'; await p.evaluate(() => { const ui = game.registry.get('ui'), s = ui.save; s.city = 'CAIRO'; s.visited = [...(s.visited || []), 'CAIRO']; ui.persist(); ui.go('fly'); }); await p.waitForTimeout(800);
        const s2 = await save(), c2 = await chip(), m2 = /^Explore: (.+?) ?›?$/.exec(c2), city2 = m2 && m2[1].replace(/[^A-Z .'-]/g, '').trim();
        check(!s2.aimCity, `${tag}: arriving clears the aim: ${s2.aimCity}`);
        check(s2.stayLand === 'desert' && s2.routeMode === 'explore', `${tag}: after arriving the flights stay in the desert: ${s2.stayLand} / ${s2.routeMode}`);
        check(!!m2 && desert.includes(city2) && city2 !== 'CAIRO', `${tag}: after arriving the chip says 'Explore:' and another desert city: ${c2}`);
        stage = 'desert page after arriving'; await desertPage(); const r2 = await row();
        check(!!r2 && r2.line === 'Your flights stay in this land.' && r2.btn === 'STOP', `${tag}: in the desert the page says the flights stay here, with STOP: ${JSON.stringify(r2)}`);
        check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at "${stage}": ${String(e).split('\n')[0]}`); }
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL flyheretap:\n - ${fails.join('\n - ')}` : 'PASS flyheretap: FLY HERE aims the route at the land\'s nearest city, opens FLY, and the flights stay in the land after arriving; an unreachable land names its crossing (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
