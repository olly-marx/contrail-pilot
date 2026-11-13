// The crossing as a pure experience, release 1 (the user's playtest of 0.30.2): while a CROSSING is in flight the HUD shows no distance and no mission.
// The crossing starts as FLY THE CROSSING starts it (ui.flyCrossing; crossingmoment taps that button for real); the test then reads the scene's HUD texts at three distances from the gateway. 375x667 and 320x568.
// A positive control: the same HUD, with the crossing switched off, DOES show a distance line near an airport and a mission line (or the checks below could not fail).
// Run: python3 -m http.server 8000 & node tests/crossinghud.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const U = require('../tools/uxlib.cjs');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const SETUP = () => { const s = game.registry.get('save'), ui = game.registry.get('ui');
    Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], crossed: [], crossingTold: ['mediterranean'], unclaimed: [], seeds: 500, crystals: 50 });
    ui.tour.busy = true; ui.showTitle(); };
  for (const [W, H] of [[375, 667], [320, 568]]) {
    const tag = `${W}x${H}`, p = await U.openPage(b, W, H, URL);
    await p.evaluate(SETUP); await p.waitForTimeout(500);
    await p.evaluate(async () => { const V = await import('/src/crossingview.js'), cs = V.crossingById(game.registry.get('save'), 'mediterranean', { unlock: true }); game.registry.get('ui').flyCrossing(cs); });   // (what FLY THE CROSSING does after its sheet: crossingmoment taps it for real)
    await p.waitForFunction(() => { const g = game.scene.getScene('game'); return g && g.crossing && ['takeoff', 'playing'].includes(g.state); }, null, { timeout: 20000 }).catch(() => {});
    const on = await p.evaluate(() => { const g = game.scene.getScene('game'); return !!(g && g.crossing); });
    check(on, `${tag}: a crossing flight started (the HUD cannot be asked about otherwise)`);
    if (!on) { await p.close(); continue; }
    // The HUD at three distances from the gateway: far, inside the sign range, and the last 250 m.
    const hud = await p.evaluate(() => { const g = game.scene.getScene('game'), out = {}; const at = (name, left) => { g.state = 'playing'; g.distancePx = Math.max(0, g.nextAirport.worldX - left); g.updateTexts(false); out[name] = { next: g.nextText.text, mission: g.missionText.text, dist: g.distText.text }; };
      at('far', 4000); at('sign', 600); at('last', 250);
      const c = g.crossing; g.crossing = null; at('ctl', 600); g.crossing = c; return out; });
    for (const k of ['far', 'sign', 'last']) {
      const h = hud[k];
      check(!/\d\s*(km|m)\b/i.test(h.next), `${tag}: the crossing HUD shows a distance to the airport (${k}): "${h.next}"`);
      check(h.mission === '', `${tag}: the crossing HUD shows a mission line (${k}): "${h.mission}"`);
      check(!/\d\s*(km|m)\b/i.test(h.dist), `${tag}: the top bar shows a distance (${k}): "${h.dist}"`);
    }
    check(hud.last.next === 'Glide down to land!', `${tag}: in the last 300 m the crossing says "Glide down to land!": "${hud.last.next}"`);
    check(/\d\s*(km|m)\b/i.test(hud.ctl.next) && hud.ctl.mission !== '', `${tag}: POSITIVE CONTROL: the same HUD without the crossing shows a distance and a mission (else this test cannot fail): ${JSON.stringify(hud.ctl)}`);
    check(!p.errs.length, `${tag}: no page errors: ${p.errs.slice(0, 2)}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL crossinghud:\n - ${fails.join('\n - ')}` : 'PASS crossinghud: a crossing flight shows no distance and no mission on the HUD; the last call is "Glide down to land!"');
  process.exit(fails.length ? 1 : 0);
})();
