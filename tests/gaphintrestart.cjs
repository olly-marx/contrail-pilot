// THE GAP HINT IS DRAWN ON EVERY FLIGHT, not only the first after a page load (the tester, 2026-11-10: "literally alternating flights, gap predictions on, then the next flight missing").
// The cause: GameScene.drawGapGates kept its graphics object on the scene (this.gapHintGfx) and the scene is RESTARTED for every flight after the first, which destroys the old display list: from flight 2 on the field pointed at a destroyed
// object and nothing was drawn. Here: three consecutive flights through the real path (HOME TAKE OFF -> startFlight -> restart), with the three systems on. At each flight, by named line: a gate came up in the sky; the scene's gap graphics is ALIVE (in this scene's display list);
// and it HOLDS the gate (a non-empty command buffer while a gate is up). 390x844. Plants: tools/plants.tsv, test `gaphintrestart`. Run: python3 -m http.server 8000 & node tests/gaphintrestart.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } },
      { areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 30, flights: 40, seeds: 0, crystals: 0,
        missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: {} } });
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    for (let n = 1; n <= 3; n++) {
      await p.click('#goBtn');
      const flying = await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && s.state === 'playing'; }, null, { timeout: 25000 }).then(() => true).catch(() => false);
      check(flying, `flight ${n}: the flight never started (HOME TAKE OFF)`);
      if (!flying) break;
      const seen = await p.evaluate(async () => {
        const G = await import('/src/gapmarkers.js'), F = await import('/src/fleet.js'), s = game.scene.getScene('game'); s.graceUntil = 1e12; s.hitsStorm = () => false; s.hitBird = () => false;
        const lead = s.kit.hintLead || 0; let up = false, alive = null, drawn = null;
        for (let i = 0; i < 160 && !(up && drawn !== null); i++) {   // up to ~16 s: wait for a gate to come up, then read the graphics in the same frame
          await new Promise(r => setTimeout(r, 100));
          if (s.plane.y > 250) s.plane.vy = Math.min(s.plane.vy || 0, -40);
          if (s.storms.some(st => G.gateFor(st, s.plane.y, s.speed, lead))) { up = true; const g = s.gapHintGfx; alive = !!(g && g.scene && s.children.exists(g)); drawn = !!(g && g.commandBuffer && g.commandBuffer.length > 0); }
        }
        return { up, alive, drawn, level: s.kit.hintLead };
      });
      log.push(`flight ${n}: level ${seen.level}, gate up ${seen.up}, graphics alive ${seen.alive}, holds the gate ${seen.drawn}`);
      check(seen.up, `flight ${n}: no gate ever came up in the sky (the flight did not reach a storm: the case does not reach the check)`);
      check(seen.up && seen.alive, `flight ${n}: the gap hint's graphics is not alive in this flight's scene (a destroyed object from an earlier flight)`);
      check(seen.up && seen.drawn, `flight ${n}: the gap hint's graphics does not hold the gate (nothing is drawn)`);
      // land, back to HOME, the next flight starts through startFlight (a scene restart)
      await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 0; s.landedAt = s.path[1]; s.finish({ landed: true }); });
      await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).catch(() => {});
      await p.evaluate(() => { game.registry.get('ui').skipReveal = true; game.registry.get('ui').showTitle(); }); await p.waitForTimeout(900);
    }
    check(!p.errs.length, `no page errors: ${p.errs.slice(0, 2)}`);
    await ctx.close();
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL gaphintrestart:\n - ${fails.join('\n - ')}` : 'PASS gaphintrestart: the gap hint is drawn in the scene of each of three consecutive flights');
  process.exit(fails.length ? 1 : 0);
})();
