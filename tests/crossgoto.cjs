// GO TO AND CROSS TO ON HOME (src/ui.js renderHub / openCrossings, src/aim.js; CROSSINGS V2 step 3). Real taps at 390x844 and 320x568, a season 2 save in LONDON with the Rome-Tunis crossing ready (the lever
// SEASON.offer.biodiversity = 0): A. away from the departure airport the box says 'Ready! Go to ROME' with hop dots and a GO TO ROME button, TAKE OFF stays TAKE OFF; the tap sets the aim (save.aimCity), the box then
// offers 'stop', the route line says (go to); stop clears it. B. at the airport (the player lands in ROME: the aim clears itself) the box says 'Ready! Tap to cross.', the big button reads CROSS TO TUNIS, a small
// 'fly normally' link shows, TAKE OFF's place is still above the bar, a tap on the big button opens the CROSSINGS screen (no flight starts), and 'fly normally' starts an ordinary flight.
// Plants: tools/plants.tsv, test `crossgoto`. Run: python3 -m http.server 8000 & node tests/crossgoto.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, areaBest: { weurope: 99999 }, crossingTold: ['mediterranean'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
      await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(600);
      const read = () => p.evaluate(() => { const h = document.getElementById('hubCross'), g = document.getElementById('goBtn').getBoundingClientRect(), tb = document.getElementById('tabbar').getBoundingClientRect(), f = document.getElementById('hubFly');
        return { box: h.innerText.replace(/\s+/g, ' ').trim(), dots: h.querySelectorAll('.hc-dot').length, go: !!document.getElementById('hcGo'), stop: !!document.getElementById('hcStop'), btn: document.getElementById('goBtn').innerText.trim(), fly: !f.hidden && f.getClientRects().length > 0,
          goOk: g.height > 0 && g.bottom <= tb.top + 1, aim: JSON.parse(localStorage.getItem('contrailPilot.v2')).aimCity || null, route: (document.getElementById('hubRoute') || { innerText: '' }).innerText.replace(/\s+/g, ' ') }; });
      const a0 = await read(); log.push(`${tag} A0: ${JSON.stringify(a0)}`);
      check(/Ready! Go to ROME/.test(a0.box) && a0.dots >= 1 && a0.go && !a0.stop && a0.btn === 'TAKE OFF' && !a0.fly && a0.goOk, `${tag} A: away from the airport: ${JSON.stringify(a0)}`);
      await p.click('#hcGo'); await p.waitForTimeout(600);
      const a1 = await read(); log.push(`${tag} A1: ${JSON.stringify(a1)}`);
      check(a1.aim === 'ROME' && a1.stop && !a1.go && /go to/.test(a1.route) && a1.goOk, `${tag} A: GO TO ROME did not set the aim or show 'stop' and (go to): ${JSON.stringify(a1)}`);
      await p.click('#hcStop', { timeout: 4000 }).catch(() => check(false, `${tag} A: the box has no stop button after GO TO (GO TO set no aim)`)); await p.waitForTimeout(500); const a2 = await read();
      check(a2.aim === null && a2.go && !a2.stop, `${tag} A: stop did not clear the aim: ${JSON.stringify(a2)}`);
      await p.click('#hcGo'); await p.waitForTimeout(500);
      await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.city = 'ROME'; ui.showTitle(); }); await p.waitForTimeout(700);   // the player lands in ROME
      const b0 = await read(); log.push(`${tag} B0: ${JSON.stringify(b0)}`);
      check(b0.aim === null && /Ready! Tap to cross\./.test(b0.box) && b0.dots === 0 && b0.btn === 'CROSS TO TUNIS' && b0.fly && b0.goOk, `${tag} B: at the airport: ${JSON.stringify(b0)}`);
      await p.click('#goBtn'); await p.waitForTimeout(500);
      const sh = await p.evaluate(() => { const e = document.getElementById('sheet'); return { sheet: e ? e.innerText.replace(/\s+/g, ' ') : '', fly: (JSON.parse(localStorage.getItem('contrailPilot.v2')).flyCrossing || null) }; });
      check(/ROME > TUNIS/.test(sh.sheet) && /CROSS TO TUNIS/.test(sh.sheet) && !sh.fly, `${tag} B: the big button must open the CROSSINGS screen and start no flight: ${JSON.stringify(sh)}`);
      await p.evaluate(() => { const e = document.getElementById('sheet'); if (e) e.remove(); }); await p.click('#hubFly', { timeout: 4000 }).catch(() => check(false, `${tag} B: there is no 'fly normally' link to tap at the airport`)); await started(p);
      const fl = await p.evaluate(() => ({ crossing: !!game.scene.getScene('game').crossing, state: game.scene.getScene('game').state }));
      check(!fl.crossing && ['takeoff', 'playing'].includes(fl.state), `${tag} B: 'fly normally' did not start an ordinary flight: ${JSON.stringify(fl)}`);
      check(!p.errs.length, `${tag}: page errors ${p.errs.join('; ')}`); await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL crossgoto:\n - ${fails.join('\n - ')}` : 'PASS crossgoto: GO TO sets and clears the aim, the box shows hops, the aim clears on arrival, the big button crosses at the airport and fly normally flies normally, at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
