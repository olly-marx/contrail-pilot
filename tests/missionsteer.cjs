// THE MISSION DEFAULT ON HOME (src/aim.js steerOf, src/ui.js renderHub / openDestinationSheet, src/GameScene.js bannerNow; research/ROUTE-DEFAULT-MISSION-PLAN.md; the user, 2026-11-10). Real taps at 390x844, a season 2 save in LONDON with a city mission open:
// A. nothing chosen: the chip says 'Mission: <the mission's city>' and the FLY TO sheet says MISSION with MISSION and EXPLORE chips; B. tapping EXPLORE switches the chip to 'Explore: <the nearest unvisited>', saves routeMode 'explore' and it
// survives a reload; C. tapping MISSION switches back; D. FLY on the mission default starts a flight whose path begins with the shortest way to the mission city and whose banner reads 'Flying to <city>'. Plants: tools/plants.tsv, test `missionsteer`.
// Run: python3 -m http.server 8000 & node tests/missionsteer.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    try {
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      await p.goto(URL); await ready(p);
      await p.waitForFunction(() => { const b = document.getElementById('hubRoute'); return !!b && b.offsetParent !== null; }, null, { timeout: 15000 }).catch(() => null);
      const closeSheet = () => p.evaluate(() => { const e = document.getElementById('sheet'); if (e) e.remove(); });
      const chip = () => p.evaluate(() => document.getElementById('hubRoute').innerText.replace(/\s+/g, ' ').trim());
      const openChip = async () => { await closeSheet(); await p.click('#hubRoute', { timeout: 5000 }).catch(() => check(false, 'the route chip could not be tapped')); await p.waitForTimeout(400); };
      const sheetText = () => p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
      const exp = await p.evaluate(async () => { const A = await import('/src/aim.js'), D = await import('/src/destination.js'), R = await import('/src/route.js'), s = game.registry.get('ui').save, a = A.activeMission(s); return { m: a && a.city, n: D.defaultTargetFrom(R.linksFor(s), s.city, s.visited) }; });
      check(!!exp.m && !!exp.n && exp.m !== exp.n, `power: the mission city (${exp.m}) and the nearest unvisited (${exp.n}) are both there and differ`);
      // A
      const c0 = await chip(); log.push(`A chip: ${c0}`);
      check(c0.startsWith(`Mission: ${exp.m}`), `A: with a mission open and nothing chosen the chip says 'Mission: ${exp.m}': ${c0}`);
      await openChip(); const s0 = await sheetText(); log.push(`A sheet: ${s0}`);
      check(new RegExp(`MISSION.*${exp.m}`).test(s0) && /EXPLORE/.test(s0) && (await p.evaluate(() => !!document.getElementById('dsMission') && !!document.getElementById('dsExplore'))), `A: the sheet says MISSION with a MISSION and an EXPLORE chip: ${s0}`);
      // B
      await p.click('#dsExplore', { timeout: 4000 }).catch(() => check(false, 'B: no EXPLORE chip')); await p.waitForTimeout(500);
      const c1 = await chip(), mode = await p.evaluate(() => game.registry.get('ui').save.routeMode); log.push(`B chip: ${c1} ${mode}`);
      check(c1.startsWith(`Explore: ${exp.n}`) && mode === 'explore', `B: EXPLORE switches the chip to 'Explore: ${exp.n}' and saves the mode: ${c1} / ${mode}`);
      await p.goto(URL); await ready(p); await p.waitForFunction(() => { const b = document.getElementById('hubRoute'); return !!b && b.offsetParent !== null; }, null, { timeout: 15000 }).catch(() => null);
      const c2 = await chip(); check(c2.startsWith(`Explore: ${exp.n}`), `B: EXPLORE persists across a reload: ${c2}`);
      // C
      await openChip(); const s1 = await sheetText(); check(/EXPLORING/.test(s1), `C: in EXPLORE the sheet says EXPLORING: ${s1}`);
      await p.click('#dsMission', { timeout: 4000 }).catch(() => check(false, 'C: no MISSION chip')); await p.waitForTimeout(500);
      const c3 = await chip(); check(c3.startsWith(`Mission: ${exp.m}`), `C: MISSION switches the chip back: ${c3}`);
      // D
      await openChip();
      const fly = await p.evaluate(() => { const e = document.getElementById('sheet'), x = e && [...e.querySelectorAll('button')].find(y => /^FLY$/i.test(y.innerText.trim())); if (!x) return false; x.click(); return true; });
      check(fly, 'D: the sheet has no FLY button'); if (fly) await started(p).catch(() => null);
      const fl = await p.evaluate(async () => { const sc = game.scene.getScene('game'), R = await import('/src/route.js'), A = await import('/src/aim.js'), s = game.registry.get('ui').save, st = A.steerOf(s); return { state: sc.state, path: sc.path.slice(0, 8), want: R.pathTo(sc.path[0], st.city, R.linksFor(s)), banner: sc.bannerNow(), city: st.city }; });
      log.push(`D: ${JSON.stringify(fl)}`);
      check(['takeoff', 'playing'].includes(fl.state) && fl.want && JSON.stringify(fl.path.slice(0, fl.want.length)) === JSON.stringify(fl.want), `D: the flight begins with the shortest way to the mission city: ${JSON.stringify(fl)}`);
      check(typeof fl.banner === 'string' && fl.banner.startsWith(`Flying to ${exp.m}`), `D: the banner reads 'Flying to ${exp.m}': ${fl.banner}`);
      check(!p.errs.length, `page errors: ${p.errs}`);
    } catch (e) { check(false, `an exception stopped the run after the checks above: ${String(e).split('\n')[0].slice(0, 140)}`); }
    await ctx.close();
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL missionsteer:\n - ${fails.join('\n - ')}` : 'PASS missionsteer: with a mission open the chip says Mission: <city>, EXPLORE switches to the nearest unvisited and persists, MISSION switches back, FLY heads for the mission city with the banner');
  process.exit(fails.length ? 1 : 0);
})();
