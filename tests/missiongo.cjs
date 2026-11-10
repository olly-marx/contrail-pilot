// GO THERE ON A MISSION ROW (src/ui.js showMissions, src/aim.js; ROUTING V2 step 3). Real taps at 390x844 and 320x568, a season 2 save in LONDON with a city mission open: the mission's sheet offers GO THERE (not the retired AIM HERE);
// the tap sets the destination (save.aimCity) to the mission's city, HOME's chip then reads the route line '(go to)', the sheet now offers STOP GOING, and its tap clears the destination. Plants: tools/plants.tsv, test `missiongo`. Run: python3 -m http.server 8000 & node tests/missiongo.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      try {
        await p.goto(URL); await ready(p);
        await p.waitForFunction(() => !!document.getElementById('hubRoute') && document.getElementById('hubRoute').offsetParent !== null, null, { timeout: 15000 }).catch(() => null);
        const row = await p.evaluate(async () => { const V = await import('/src/missionsview.js'), ui = game.registry.get('ui'), v = V.missionsView(ui.save), r = [v.next, ...v.open].filter(Boolean).find(x => x.city && x.cityName); ui.go('missions'); return r ? { key: r.key, city: r.cityName } : null; });
        check(!!row, `${tag}: no city mission row to tap in the test save`);
        if (row) {
          await p.waitForSelector(`[data-mrow="${row.key}"]`, { timeout: 8000 }).catch(() => check(false, `${tag}: the mission row ${row.key} never appeared`));
          const sheetOf = async () => { await p.click(`[data-mrow="${row.key}"]`, { timeout: 5000 }).catch(() => check(false, `${tag}: the row could not be tapped`)); await p.waitForTimeout(400); return p.evaluate(() => { const e = document.getElementById('sheet'), a = e && e.querySelector('.sheet-action'); return { text: e ? e.innerText.replace(/\s+/g, ' ') : '', action: a ? a.innerText.trim() : null }; }); };
          const s1 = await sheetOf(); log.push(`${tag} 1: ${JSON.stringify(s1)}`);
          check(s1.action === 'GO THERE' && !/AIM HERE|STOP AIMING/.test(s1.text), `${tag} 1: the mission's sheet must offer GO THERE (and not AIM HERE): ${JSON.stringify(s1)}`);
          await p.click('#sheet .sheet-action', { timeout: 5000 }).catch(() => check(false, `${tag} 1: no action button to tap`)); await p.waitForTimeout(500);
          const aim = await p.evaluate(() => JSON.parse(localStorage.getItem('s2:contrailPilot.v2') || localStorage.getItem('contrailPilot.v2') || '{}').aimCity || null);
          check(aim === row.city, `${tag} 2: GO THERE must set the destination to the mission's city ${row.city}: ${aim}`);
          const s2 = await sheetOf(); log.push(`${tag} 2: ${JSON.stringify(s2)}`);
          check(s2.action === 'STOP GOING', `${tag} 3: the sheet now offers STOP GOING: ${JSON.stringify(s2)}`);
          await p.evaluate(() => { game.registry.get('ui').showTitle(); document.querySelectorAll('#sheet').forEach(e => e.remove()); }); await p.waitForTimeout(600);
          const chip = await p.evaluate(() => (document.getElementById('hubRoute') || { innerText: '' }).innerText.replace(/\s+/g, ' ').trim());
          check(/\(go to\)/.test(chip) && chip.includes(row.city), `${tag} 4: HOME's chip shows the route to the destination: ${chip}`);
          await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForSelector(`[data-mrow="${row.key}"]`, { timeout: 8000 }).catch(() => null);
          const s3 = await sheetOf(); await p.click('#sheet .sheet-action', { timeout: 5000 }).catch(() => check(false, `${tag} 5: no STOP GOING button to tap`)); await p.waitForTimeout(500);
          const aim2 = await p.evaluate(() => JSON.parse(localStorage.getItem('s2:contrailPilot.v2') || localStorage.getItem('contrailPilot.v2') || '{}').aimCity || null);
          check(s3.action === 'STOP GOING' && aim2 === null, `${tag} 5: STOP GOING must clear the destination: ${JSON.stringify([s3.action, aim2])}`);
        }
        check(!p.errs.length, `${tag} page errors: ${p.errs}`);
      } catch (e) { check(false, `${tag}: an exception stopped the run after the checks above: ${String(e).split('\n')[0].slice(0, 140)}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL missiongo:\n - ${fails.join('\n - ')}` : 'PASS missiongo: a city mission row offers GO THERE, the tap sets the destination, HOME shows the route (go to), STOP GOING clears it; at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
