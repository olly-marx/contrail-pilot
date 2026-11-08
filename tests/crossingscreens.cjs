// The crossing's OWN ending screens, in the real game (release 2; the user's playtest of 0.30.2). 375x667 and 320x568, real taps on the screens' buttons.
//   LANDING: a crossing flight that lands shows the payoff-style screen (A NEW WAY OPENED / WELCOME TO <city>!, a picture that loaded, one FLY ON), NOT the results card, with no km;
//            FLY ON goes to HOME and the area is open in the save.
//   CRASH:   a crossing flight that crashes shows NOT THIS TIME with TRY AGAIN + HOME, no km; TRY AGAIN flies the same crossing again at once; nothing opened.
// The flight is started the way FLY THE CROSSING starts it (ui.flyCrossing; crossingmoment taps that button for real) and ended through the scene's own finish().
// Run: python3 -m http.server 8000 & node tests/crossingscreens.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const U = require('../tools/uxlib.cjs');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const SETUP = () => { const s = game.registry.get('save'), ui = game.registry.get('ui');
    Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], crossed: [], crossingTold: ['warsaw-stockholm'], unclaimed: [], seeds: 500, crystals: 50 });
    ui.tour.busy = true; ui.showTitle(); };
  const startCrossing = async p => { await p.evaluate(SETUP); await p.waitForTimeout(500);
    await p.evaluate(async () => { const V = await import('/src/crossingview.js'), cs = V.crossingById(game.registry.get('save'), 'warsaw-stockholm', { unlock: true }); game.registry.get('ui').flyCrossing(cs); });
    await p.waitForFunction(() => { const g = game.scene.getScene('game'); return g && g.crossing && ['takeoff', 'playing'].includes(g.state); }, null, { timeout: 20000 }).catch(() => {});
    return p.evaluate(() => { const g = game.scene.getScene('game'); return !!(g && g.crossing); }); };
  const end = p => p.waitForFunction(() => { const e = document.getElementById('crossEnd'); return e && !e.hidden; }, null, { timeout: 12000 })
    .then(() => p.waitForFunction(() => { const i = document.querySelector('#crossEnd .cend-pic'); return !i || i.complete; }, null, { timeout: 8000 }).catch(() => {}))   // the picture loads AFTER the card shows: wait for it to finish (a broken one finishes with naturalWidth 0: still a named failure)
    .then(() => p.evaluate(() => { const e = document.getElementById('crossEnd'); return { text: e.innerText.replace(/\s+/g, ' '), btns: [...e.querySelectorAll('[data-end]')].map(x => x.textContent), pic: (() => { const i = e.querySelector('.cend-pic'); return i ? i.naturalWidth : -1; })(), results: !document.getElementById('results').hidden, card: (() => { const r = e.querySelector('.payoff-card').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, h: innerHeight }; })() }; })).catch(() => null);
  for (const [W, H] of [[375, 667], [320, 568]]) {
    const tag = `${W}x${H}`;
    // LANDING
    let p = await U.openPage(b, W, H, URL);
    if (!(await startCrossing(p))) { check(false, `${tag}: the crossing flight did not start`); await p.close(); continue; }
    await p.evaluate(() => { const g = game.scene.getScene('game'); g.graceUntil = 0; g.landedAt = g.path[1]; g.finish({ landed: true }); });
    let e = await end(p);
    check(!!e, `${tag}: a landed crossing never showed its own screen (#crossEnd)`);
    if (e) {
      check(/A NEW WAY OPENED/.test(e.text) && /WELCOME TO/.test(e.text) && e.btns.join() === 'FLY ON', `${tag}: the landing screen reads A NEW WAY OPENED / WELCOME TO ... with one FLY ON: ${e.text} ${e.btns}`);
      check(!/\bkm\b/i.test(e.text) && !e.results, `${tag}: the landing shows a distance or the results card: ${e.text}, results shown ${e.results}`);
      check(e.pic > 0, `${tag}: the landing picture did not load (naturalWidth ${e.pic})`);
      check(e.card.top >= 0 && e.card.bottom <= e.card.h, `${tag}: the landing card fits the screen (${Math.round(e.card.top)}-${Math.round(e.card.bottom)} of ${e.card.h})`);
      await p.click('#crossEnd [data-end="on"]');
      await p.waitForFunction(() => !document.getElementById('title').hidden && document.getElementById('crossEnd').hidden, null, { timeout: 8000 }).catch(() => {});   // HOME is a condition, not a fixed 800 ms
      const after = await p.evaluate(() => ({ home: !document.getElementById('title').hidden, gone: document.getElementById('crossEnd').hidden, areas: JSON.parse(localStorage.getItem('contrailPilot.v2')).areas }));
      check(after.home && after.gone && after.areas.includes('nordic'), `${tag}: FLY ON goes HOME and the new area is open: ${JSON.stringify(after)}`);
    }
    check(!p.errs.length, `${tag}: no page errors (landing): ${p.errs.slice(0, 2)}`); await p.close();
    // CRASH
    p = await U.openPage(b, W, H, URL);
    if (!(await startCrossing(p))) { check(false, `${tag}: the crossing flight did not start (crash)`); await p.close(); continue; }
    await p.evaluate(() => { const g = game.scene.getScene('game'); g.graceUntil = 0; g.finish({ reason: 'Bird strike!\nYou hit a bird.' }); });
    e = await end(p);
    check(!!e, `${tag}: a crashed crossing never showed its own screen (#crossEnd)`);
    if (e) {
      check(/NOT THIS TIME/.test(e.text) && e.btns.join() === 'TRY AGAIN,HOME', `${tag}: the crash screen offers TRY AGAIN and HOME: ${e.text} ${e.btns}`);
      check(!/\bkm\b/i.test(e.text) && !e.results, `${tag}: the crash shows a distance or the results card: ${e.text}, results shown ${e.results}`);
      check(e.card.top >= 0 && e.card.bottom <= e.card.h, `${tag}: the crash card fits the screen (${Math.round(e.card.top)}-${Math.round(e.card.bottom)} of ${e.card.h})`);
      await p.click('#crossEnd [data-end="again"]');
      const again = await p.waitForFunction(() => { const g = game.scene.getScene('game'); return g && g.crossing && ['takeoff', 'playing'].includes(g.state); }, null, { timeout: 15000 }).then(() => true).catch(() => false);
      const st = await p.evaluate(() => ({ areas: JSON.parse(localStorage.getItem('contrailPilot.v2')).areas }));
      check(again && !st.areas.includes('nordic'), `${tag}: TRY AGAIN flies the same crossing at once and nothing opened (flew again ${again}, areas ${JSON.stringify(st.areas)})`);
    }
    check(!p.errs.length, `${tag}: no page errors (crash): ${p.errs.slice(0, 2)}`); await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL crossingscreens:\n - ${fails.join('\n - ')}` : 'PASS crossingscreens: a crossing lands on its own WELCOME screen and crashes on NOT THIS TIME (TRY AGAIN works), with no distance and no results card');
  process.exit(fails.length ? 1 : 0);
})();
