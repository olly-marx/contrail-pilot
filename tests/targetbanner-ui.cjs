// THE TARGET BANNER AND THE LIGHT-UP IN A REAL FLIGHT (src/GameScene.js bannerNow / targetCity / the light-up; research/TARGET-BANNER-PLAN.md). At 390x844 and 320x568, a season 2 save in LONDON with the Warsaw-Stockholm crossing ready:
// A. with a destination set (AMSTERDAM) the flight's top text says 'Flying to AMSTERDAM' (not the mission title) and fits the screen; B. the target runway is lit when it is on screen, no other runway is, and it goes out once the plane has passed it;
// C. with no destination the top text is the mission title; D. a ready crossing's departure as the destination says 'Flying to WARSAW to cross'; E. a crossing flight's target is its arrival airport. Plants: tools/plants.tsv, test `targetbanner-ui`. Run: python3 -m http.server 8000 & node tests/targetbanner-ui.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = (aim, label) => ({ routeMode: label === 'C' ? 'explore' : 'mission',   /* C: EXPLORE is chosen, so the mission is not the steer (src/aim.js steerOf); M: the default steer is the open mission */ areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, areaBest: { weurope: 99999 }, crossingTold: ['warsaw-stockholm'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], aimCity: aim || undefined, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      for (const [label, aim] of [['A', 'AMSTERDAM'], ['C', null], ['M', null], ['D', 'WARSAW'], ['S', 'PARIS']]) {
        const tag = `${W}x${H} ${label}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
        await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
        await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed(aim, label));
        try {
          await p.goto(URL); await ready(p); await p.waitForTimeout(800);
          await p.evaluate(async () => { (await import('/src/season.js')).SEASON.offer.biodiversity = 0; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(500);
          await p.evaluate(() => game.registry.get('ui').start()); await started(p).catch(() => null);
          if (label === 'S') await p.evaluate(() => { game.scene.getScene('game').bannerNow = () => 'Flying to PARIS\nthen ROME'; });   // FORCED two-line banner (a real mission steer is x42-steer's: tests/missionsteer.cjs)
          const top = await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && s.state === 'playing' && s.missionText && s.missionText.text ? s.missionText.text : false; }, null, { timeout: 12000 }).then(h => h.jsonValue()).catch(() => null);
          log.push(`${tag}: ${JSON.stringify(top)}`);
          if (label === 'A') {
            check(top === 'Flying to AMSTERDAM', `${tag}: the top text must be 'Flying to AMSTERDAM' (not the mission title): ${JSON.stringify(top)}`);
            const fit = await p.evaluate(() => { const t = game.scene.getScene('game').missionText, r = t.getBounds(); return { l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; });
            check(fit.l >= 0 && fit.r <= 288 && fit.w <= 200, `${tag}: the banner fits the 288 px screen: ${JSON.stringify(fit)}`);
            // B. the light-up
            await p.evaluate(() => { const s = game.scene.getScene('game'); s.distancePx = s.nextAirport.worldX - 180; });
            const lit = await p.waitForFunction(() => { const s = game.scene.getScene('game'), rw = s.runways.find(r => r.name === 'AMSTERDAM'); return rw ? { lit: rw.lit, others: s.runways.filter(r => r.name !== 'AMSTERDAM').map(r => r.lit) } : false; }, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => null);
            log.push(`${tag} lit: ${JSON.stringify(lit)}`);
            check(lit && lit.lit === true && lit.others.every(x => x === false), `${tag} B: the target runway must be lit and no other: ${JSON.stringify(lit)}`);
            // the runway on screen is NOT the target any more: it must go out (a lit-everywhere bug cannot hide behind runways that are already passed)
            // (probe 17:12Z: the plane keeps flying, so a lit flag that is false later may be 'passed' or 'landing', not 'not the destination'. Hold the plane 100 px short of the runway while asking.)
            await p.evaluate(() => { game.scene.getScene('game').save.aimCity = 'PARIS'; });
            const notTarget = await p.waitForFunction(() => { const s = game.scene.getScene('game'), rw = s.runways.find(r => r.name === 'AMSTERDAM'); if (!rw) return false; s.distancePx = rw.worldX - 100; return s.state === 'playing' && rw.lit === false; }, null, { timeout: 5000, polling: 100 }).then(() => true).catch(() => false);
            check(notTarget, `${tag} B: a runway that is not the destination must not be lit while the plane is short of it and flying (the target is PARIS, AMSTERDAM is on screen)`);
            await p.evaluate(() => { game.scene.getScene('game').save.aimCity = 'AMSTERDAM'; });
            await p.evaluate(() => { const s = game.scene.getScene('game'), rw = s.runways.find(r => r.name === 'AMSTERDAM'); s.distancePx = rw.worldX + 400; });
            const out = await p.waitForFunction(() => { const s = game.scene.getScene('game'), rw = s.runways.find(r => r.name === 'AMSTERDAM'); return rw && rw.lit === false; }, null, { timeout: 5000 }).then(() => true).catch(() => false);
            check(out, `${tag} B: the runway must go out once the plane has passed it`);
          } else if (label === 'S') {
            // the second line must clear the 'PARIS 111mi: get LOW to land!' line under it by at least 2 px
            await p.evaluate(() => { const s = game.scene.getScene('game'); s.distancePx = s.nextAirport.worldX - 180; });
            const gap = await p.waitForFunction(() => { const s = game.scene.getScene('game'); if (!s.nextText.text || s.missionText.text.indexOf('\n') < 0) return false; return { next: s.nextText.text, gap: Math.round((s.nextText.getBounds().top - s.missionText.getBounds().bottom) * 10) / 10 }; }, null, { timeout: 8000 }).then(h => h.jsonValue()).catch(() => null);
            log.push(`${tag} S gap: ${JSON.stringify(gap)}`);
            check(gap && gap.gap >= 2, `${tag} S: the banner's second line must end at least 2 px above the next-airport line: ${JSON.stringify(gap)}`);
          } else if (label === 'M') {
            check(top === 'Flying to PARIS', `${tag}: with an open city mission, nothing chosen and no EXPLORE, the top text is the mission banner 'Flying to PARIS': ${JSON.stringify(top)}`);
          } else if (label === 'C') {
            check(top && !/^Flying to/.test(top), `${tag}: with EXPLORE chosen and no destination the top text is the mission title, not a banner: ${JSON.stringify(top)}`);
          } else {
            check(top === 'Flying to WARSAW to cross', `${tag} D: a ready crossing's departure must say 'Flying to WARSAW to cross': ${JSON.stringify(top)}`);
            const crossT = await p.evaluate(() => { const s = game.scene.getScene('game'); const keep = s.crossing; s.crossing = { to: 'STOCKHOLM' }; const t = s.targetCity(); s.crossing = keep; return t; });
            check(crossT === 'STOCKHOLM', `${tag} E: a crossing flight's target is its arrival airport: ${crossT}`);
          }
          check(!p.errs.length, `${tag} page errors: ${p.errs}`);
        } catch (e) { check(false, `${tag}: an exception stopped the run after the checks above: ${String(e).split('\n')[0].slice(0, 140)}`); }
        await ctx.close();
      }
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL targetbanner-ui:\n - ${fails.join('\n - ')}` : 'PASS targetbanner-ui: a destination replaces the top mission text with Flying to X (to cross for a crossing departure), the target runway lights and goes out once passed, no destination keeps the mission title; at 390 and 320');
  process.exit(fails.length ? 1 : 0);
})();
