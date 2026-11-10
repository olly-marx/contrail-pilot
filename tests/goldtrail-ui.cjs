// THE GOLDEN CONTRAIL IN THE GAME (src/goldtrail.js, src/GameScene.js showContrail; research/LAP-REWARDS-SPEC.md L3). A real flight at 390x844 twice: a save with lapDone draws its contrail rectangles gold, a save without draws them white.
// Polls the game for the first contrail (no fixed waits); the fixture fails rather than skips. Plants: tools/plants.tsv, test `goldtrail-ui`. Run: python3 -m http.server 8000 & node tests/goldtrail-ui.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = lap => ({ areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, ...(lap ? { lapDone: true, crossed: ['lap'] } : {}) });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [label, lap, want] of [['lap', true, 0xf0b400], ['plain', false, 0xffffff]]) {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed(lap));
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(800);
        await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(500);
        await p.evaluate(() => game.registry.get('ui').start()); await started(p).catch(() => null);
        // fly: a contrail forms only inside icy air (ISSR), so a patch is put round the plane; keep the plane up and look for the first drawn contrail (poll, up to 20 s)
        const got = await p.waitForFunction(() => { const s = game.scene.getScene('game'); if (!s || s.state !== 'playing') return false; if (s.plane.y > 200 && s.plane.vy > -40) s.applyFlap(); if (!s.__gtIssr) { s.__gtIssr = true; s.addIssrAt(s.plane.x - 150, Math.max(10, s.plane.y - 70), 300, 140); }   /* (a contrail forms only inside icy air: put a patch round the plane) */ const c = (s.contrails || []).find(x => x.view && x.view.active); return c ? { fill: c.view.fillColor, n: s.contrails.length } : false; }, null, { timeout: 20000, polling: 100 }).then(h => h.jsonValue()).catch(() => null);
        log.push(`${label}: ${JSON.stringify(got)}`);
        check(!!got, `${label}: no contrail was drawn within 20 s of flying (the fixture failed, nothing to colour-check)`);
        if (got) check(got.fill === want, `${label}: the contrail rectangles are ${want.toString(16)} (${lap ? 'gold, the pilot has flown the lap' : 'white, no lap yet'}): ${got.fill.toString(16)}`);
        check(!p.errs.length, `${label}: page errors: ${p.errs}`);
      } catch (e) { check(false, `${label}: an exception stopped the run: ${String(e).split('\n')[0].slice(0, 140)}`); }
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL goldtrail-ui:\n - ${fails.join('\n - ')}` : 'PASS goldtrail-ui: a pilot who has flown the lap draws gold contrails, one who has not draws white');
  process.exit(fails.length ? 1 : 0);
})();
