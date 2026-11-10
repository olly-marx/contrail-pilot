// TAP ANY CITY ON HOME (src/pickcity.js, src/globe.js onCity, src/ui.js showCityCard; ROUTING V2 step 1). Real taps at 390x844 and 320x568, a season 2 save in AMSTERDAM with the route choice open:
// A. a tap on a city dot opens the card with its name and 'N stop(s)' and a FLY button; B. FLY sets the aim (save.aimCity), clears the first-step heading and starts a flight; C. a city in a closed area (SYDNEY)
// shows 'Opens with the ... crossing' and NO FLY; D. your own city says 'You are here.' and no FLY; the card fits on screen. Plants: tools/plants.tsv, test `citytap`. Run: python3 -m http.server 8000 & node tests/citytap.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
      await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
      // A. tap a visible city that is not our own
      const target = await p.evaluate(() => { const g = document.getElementById('hubGlobe').__globe; for (const n of ['PARIS', 'BERLIN', 'LONDON', 'BRUSSELS', 'COPENHAGEN']) { const q = g && g.cityPos(n); if (q) return { name: n, x: q.x, y: q.y }; } return null; });
      check(!!target, `${tag} A: the HOME globe shows none of the nearby cities to tap (the globe is not live or the route choice is closed): ${JSON.stringify(target)}`);
      if (target) {
        await p.mouse.click(target.x, target.y); await p.waitForTimeout(500);
        const card = await p.evaluate(() => { const e = document.getElementById('sheet'); const r = e && e.getBoundingClientRect(); const fly = e && [...e.querySelectorAll('button')].find(x => /^FLY$/i.test(x.innerText.trim())); return { text: e ? e.innerText.replace(/\s+/g, ' ').trim() : '', fly: !!fly, inside: !!r && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1 }; });
        log.push(`${tag} A: ${JSON.stringify(card)}`);
        check(new RegExp(`FLY TO.*${target.name}.*\\d stops?`).test(card.text) && card.fly && card.inside, `${tag} A: the tap on ${target.name} did not open the card with its name, its stops and a FLY button on screen: ${JSON.stringify(card)}`);
        check(!/\bkm\b|\d{3,}/.test(card.text), `${tag} A: a distance reaches the player: ${card.text}`);
        const dot = await p.evaluate(() => { const d = document.querySelector('#sheet .hc-dot'); const r = d && d.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; });
        check(dot && dot[0] >= 8 && dot[1] >= 8, `${tag} A: the stop dots are as heavy as the text (8 px squares): ${JSON.stringify(dot)}`);
        // B. FLY sets the aim and starts the flight
        if (card.fly) await p.evaluate(() => { const e = document.getElementById('sheet'); [...e.querySelectorAll('button')].find(x => /^FLY$/i.test(x.innerText.trim())).click(); });   // (no FLY: the named check above already failed)
        await started(p).catch(() => null);
        const fl = await p.evaluate(() => ({ aim: JSON.parse(localStorage.getItem('s2:contrailPilot.v2') || localStorage.getItem('contrailPilot.v2') || '{}').aimCity || null, state: game.scene.getScene('game').state }));
        check(fl.aim === target.name && ['takeoff', 'playing'].includes(fl.state), `${tag} B: FLY did not set the aim to ${target.name} and start the flight: ${JSON.stringify(fl)}`);
      }
      // C and D on a fresh title screen
      await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
      const sheet = nm => p.evaluate(n => { game.registry.get('ui').showCityCard(n); const e = document.getElementById('sheet'); return { text: e ? e.innerText.replace(/\s+/g, ' ').trim() : '', fly: !!(e && [...e.querySelectorAll('button')].find(x => /^FLY$/i.test(x.innerText.trim()))) }; }, nm);
      const closed = await sheet('SYDNEY'); log.push(`${tag} C: ${JSON.stringify(closed)}`);
      check(/Opens with the Tasman crossing/.test(closed.text) && !closed.fly, `${tag} C: a closed-area city must say 'Opens with the Tasman crossing' (the first on the ladder that opens Oceania) and offer no FLY: ${JSON.stringify(closed)}`);
      await p.evaluate(() => { const e = document.getElementById('sheet'); if (e) e.remove(); });
      const here = await sheet('AMSTERDAM'); log.push(`${tag} D: ${JSON.stringify(here)}`);
      check(/You are here/.test(here.text) && !here.fly, `${tag} D: your own city must say 'You are here.' and offer no FLY: ${JSON.stringify(here)}`);
      check(!p.errs.length, `${tag} page errors: ${p.errs}`);
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL citytap:\n - ${fails.join('\n - ')}` : 'PASS citytap: a tap on a city shows its name and stops with FLY (which sets the aim and starts the flight); a closed city names its crossing, your own city says here, neither can fly; at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
