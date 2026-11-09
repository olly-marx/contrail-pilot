// TAKE OFF IN THE HANGAR WHILE A HOME RAIL IS DUE (the user, 2026-11-09: he took off from the hangar and the HOME rails were skipped).
// src/ui.js startFromHangar + src/tour.js homeRailDue: with a rails step due on HOME the hangar's TAKE OFF goes to the FLY screen (the step starts there) and does NOT start the flight;
// with no HOME step due it starts the flight as before; and the hangar's OWN rails step (r-takeoff1, which taps #hGoTop) still starts it. 390x844, real taps, rails ON (no '*' tours).
//   A. L1 done, L2 not (r-takeoff2 is due on HOME): hangar #hGoTop -> HOME shows, the rail lights #goBtn, no flight; then #goBtn starts the flight.   (the same with the second button, #hGoBtn)
//   B. control: the same save with r-takeoff2 done: #hGoTop starts the flight.        C. no lesson done, r-takeoff1 due IN the hangar: its step runs and #hGoTop starts the flight.
// Plants: tools/plants.tsv, test `hangartakeoff`. Run: python3 -m http.server 8000 & node tests/hangartakeoff.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const DONE = ['r-school', 'r-free', 'r-payoff', 'r-res1'];
const seed = (missionsDone, tours) => ({ areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: [], tours, freeGiven: true,
  freeProjectGiven: true, freeUpgrade: false, landings: 2, flights: 2, seeds: 0, crystals: 0, missionsDone, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (s) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, s);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
    return { ctx, p };
  };
  const toHangar = async p => { await p.evaluate(() => { const t = game.registry.get('ui').tour; game.registry.get('ui').showHangar(); }); await p.waitForTimeout(900); };
  const state = p => p.evaluate(() => { const ui = game.registry.get('ui'), g = game.scene.getScene('game'); return { title: !document.getElementById('title').hidden, hangar: !document.getElementById('hangar').hidden,
    flying: !!(g && g.sys.isActive() && g.nextAirport && ['takeoff', 'playing'].includes(g.state)), busy: !!(ui.tour && ui.tour.busy), target: ui.tour && ui.tour.target ? ui.tour.target.id : null }; });
  try {
    for (const btn of ['#hGoTop', '#hGoBtn']) {   // A
      const { ctx, p } = await open(seed(['L1'], DONE)); await toHangar(p);
      const before = await state(p); check(before.hangar && !before.flying, `A ${btn}: the case does not reach the hangar: ${JSON.stringify(before)}`);
      await p.evaluate(sel => document.querySelector(sel).scrollIntoView({ block: 'center' }), btn); await p.click(btn); await p.waitForTimeout(1500);
      const a = await state(p); log.push(`A ${btn}: ${JSON.stringify(a)}`);
      check(!a.flying, `A ${btn}: TAKE OFF in the hangar started a flight while a HOME rail (r-takeoff2) was due`);
      check(a.title && !a.hangar, `A ${btn}: the player was not taken to the FLY screen (title shown ${a.title}, hangar shown ${a.hangar})`);
      check(a.busy && a.target === 'goBtn', `A ${btn}: the HOME rail does not light TAKE OFF (rail running ${a.busy}, target ${a.target})`);
      if (a.title) { await p.click('#goBtn'); await started(p); const f = await state(p); check(f.flying, `A ${btn}: TAKE OFF on HOME did not start the flight`); }
      check(!p.errs.length, `A ${btn}: page errors ${p.errs.join('; ')}`); await ctx.close();
    }
    { const { ctx, p } = await open(seed(['L1'], [...DONE, 'r-takeoff2'])); await toHangar(p);   // B: the control
      await p.click('#hGoTop'); await started(p); const c = await state(p); log.push(`B: ${JSON.stringify(c)}`);
      check(c.flying, `B control: with no HOME rail due, TAKE OFF in the hangar does not start the flight (${JSON.stringify(c)})`); await ctx.close(); }
    { const { ctx, p } = await open(seed([], ['r-school', 'r-free', 'r-payoff'])); await toHangar(p);   // C: the hangar's own rail
      const lit = await p.waitForFunction(() => { const ui = game.registry.get('ui'); return ui.tour && ui.tour.busy && ui.tour.target && ui.tour.target.id === 'hGoTop'; }, null, { timeout: 6000 }).then(() => true).catch(() => false);
      check(lit, 'C: the hangar rail r-takeoff1 does not light #hGoTop (the case does not reach the check)');
      if (lit) { await p.click('#hGoTop'); await started(p); const c = await state(p); log.push(`C: ${JSON.stringify(c)}`); check(c.flying, `C: the hangar's own TAKE OFF step no longer starts the flight (${JSON.stringify(c)})`); }
      await ctx.close(); }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL hangartakeoff:\n - ${fails.join('\n - ')}` : 'PASS hangartakeoff: a hangar TAKE OFF goes to HOME while a HOME rail is due, starts the flight otherwise, and the hangar rail still works');
  process.exit(fails.length ? 1 : 0);
})();
