// THE WATER LESSON in the browser (Plan C, src/waterpractice.js; Oliver 2026-11-23: 'back to school about it'). A save whose first land's water has just opened (Island forest,
// every tree kind at its cap): TAKE OFF starts the water lesson, not a flight; its drops fall straight onto three blue targets, played with real key presses when the RING is over
// the water; the last OK ends it: HOME shows, the scene is idle, the lesson is done, and nothing was written to the save's water book. Run: python3 -m http.server 8000 & node tests/waterlesson-ui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  globalThis.SEASON2 = true;
  const W = await import('../src/waterways.js'), N = await import('../src/nature.js'), H = await import('../src/habitats.js'), G = await import('../src/groves.js'), LT = await import('../src/landtrees.js');
  const r = 'islandforest';
  const save = { muted: true, school2: true, tutorialDone: true, freeGiven: true, freeUpgrade: false, freeProjectGiven: true, treePractice: true, pilotNamed: true, goodLandings: 3,
    areas: ['aotearoa'], homeArea: 'aotearoa', homeCity: 'AUCKLAND', city: 'AUCKLAND', visited: ['AUCKLAND'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], crossed: ['jakarta-darwin'],
    tours: ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'r-systems', 'r-map', 'r-bonus', 'r-trees', 'r-parcels', 'r-practice', 'nature-swipe', 'r-earth', 'r-boards', 'name', 'r-cross'],
    shownLines: ['*'], seenTips: ['x-bars'], levels: { trees: 4 }, flights: 60, landings: 40, seeds: 50, crystals: 5, tourToday: 7, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} },
    habitat: { [r]: H.REGION_DATA[r].projects.filter(p => !W.isWaterProject(r, p.id)).map(p => p.id) } };
  for (const slot of [0, 1, 2, 3, 4]) { const id = N.localTree(N.UK_SLOTS[slot], r).id; for (let i = 0; i < LT.capOf(r); i++) G.plantTree(save, r, id); }
  for (const g of Object.values(save.groves || {})) for (const t of Object.values(g)) { t.grown = t.planted; t.saplings = []; }
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { if (!sessionStorage.getItem('set')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('set', '1'); } }, save);
  await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
  check(await p.evaluate(() => game.registry.get('ui').practiceDue()) === 'water', 'the save is on the water lesson');
  await p.evaluate(() => { for (const id of ['eraCard']) { const e = document.getElementById(id); if (e) e.remove(); } const t = document.getElementById('tour'); if (t && !t.hidden) { t.hidden = true; game.registry.get('ui').tour.busy = false; } });
  await p.evaluate(() => { game.scene.getScene('game').builtWith = 'stale'; });   // (as tests/practice.cjs: the lesson starts from a restart WITH data; its end must not start it again)
  await p.click('#goBtn', { force: true }); await p.waitForTimeout(800);
  const t0 = Date.now(); let ended = false, sawWater = false, sawRing = false;
  while (Date.now() - t0 < 60000) {
    const v = await p.evaluate(() => { const s = game.scene.getScene('game'), c = document.getElementById('coach'), ok = document.getElementById('coachOk');
      const x = s.predictLanding ? s.predictLanding() : -1, pl = (s.plots || []).find(q => q.water && !q.used && x >= q.x + 6 && x <= q.x + q.w - 6);
      return { state: s.state, water: !!(s.school && s.school.waterLand), plots: (s.plots || []).filter(q => q.water).length, over: !!pl, ok: !c.hidden && !ok.hidden && !ok.disabled, title: !document.getElementById('title').hidden,
        y: s.plane.y, vy: s.plane.vy, done: !!game.registry.get('save').waterPractice }; });
    if (v.water && v.plots) sawWater = true;
    if (v.done && v.title) { ended = true; break; }
    if (v.ok) { await p.click('#coachOk').catch(() => {}); await p.waitForTimeout(200); continue; }
    if (v.state === 'takeoff' || v.state === 'idle') { await p.mouse.move(195, 460); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); continue; }
    if (v.state === 'playing' && v.over) { if (!sawRing && process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/water-ring.png` }); sawRing = true; await p.keyboard.press('t'); await p.waitForTimeout(500); }
    if (v.state === 'playing' && v.y > 300 && v.vy > -60) await p.mouse.click(195, 460);
    await p.waitForTimeout(40);
  }
  check(sawWater && sawRing, `the lesson flies over blue water targets and the ring comes over one: water ${sawWater}, ring ${sawRing}`);
  check(ended, 'three water drops and the last OK end the lesson on HOME');
  await p.waitForTimeout(4000);
  const after = await p.evaluate(() => { const s = game.scene.getScene('game'), sv = game.registry.get('save');
    return { state: s.state, school: !!s.school, title: !document.getElementById('title').hidden, done: !!sv.waterPractice, book: JSON.stringify(sv.waterBook || {}), flights: sv.flights, due: game.registry.get('ui').practiceDue() }; });
  check(after.state === 'idle' && !after.school && after.title, `HOME, no flight left running: ${JSON.stringify(after)}`);
  check(after.done && !after.due, `the lesson is done and not due again: ${JSON.stringify(after)}`);
  check(after.book === '{}' && after.flights === 60, `practice drops are not saved and it is not a flight: ${JSON.stringify(after)}`);
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL waterlesson-ui:\n - ${fails.join('\n - ')}` : 'PASS waterlesson-ui: TAKE OFF starts the water lesson, three drops on blue targets end it on HOME, the lesson done, nothing saved');
  process.exit(fails.length ? 1 : 0);
})();
