// THE TREE PRACTICE FLIGHT (src/practice.js; the School board, the user 2026-11-16). A save on the 'practice' lesson: TAKE OFF starts the practice, not a flight; three
// seeds on the soil with real key presses; the last OK ends it: HOME shows, the scene is idle (no flight left running behind HOME), the lesson is done, and no practice tree
// was written to the save. Run: python3 -m http.server 8000 & node tests/practice.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const save = { muted: true, school2: true, tutorialDone: true, freeGiven: true, freeUpgrade: false, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON',
    missionsDone: ['L1', 'L2', 'L3', 'L4'], tours: ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'r-systems', 'r-map', 'r-bonus', 'r-trees', 'r-parcels', 'r-practice', 'nature-swipe'],
    shownLines: ['*'], seenTips: ['x-bars'], levels: { trees: 1 }, flights: 6, landings: 7, seeds: 50, crystals: 5, freeProjectGiven: true, habitat: { woodland: ['meadow'] }, tourToday: 7 };
  await p.addInitScript(s => { if (!sessionStorage.getItem('set')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('set', '1'); } }, save);
  await p.goto(URL); await ready(p); await p.waitForTimeout(1200);
  check(await p.evaluate(() => game.registry.get('ui').practiceDue()), 'the save is on the practice lesson');
  if (process.env.DBG) { await p.screenshot({ path: '/tmp/claude-1000/-home-ojm/1c6e48ad-8434-5bc9-b602-74225227abe6/scratchpad/pr0.png' }); console.log(await p.evaluate(() => [...document.querySelectorAll('section.overlay, .overlay')].filter(e => !e.hidden).map(e => e.id)), await p.evaluate(() => JSON.stringify(game.registry.get('save').areas) + ' | ' + Object.keys(localStorage).join(',') + ' | ' + (localStorage.getItem('contrailPilot.v2') || '').slice(0, 160))); }
  for (let i = 0; i < 3 && await p.isVisible('#eraCard'); i++) { await p.click('#eraCard button').catch(() => {}); await p.waitForTimeout(500); }   // (a save this far on is shown its era once)
  await p.evaluate(() => { const e = document.getElementById('eraCard'); if (e) e.remove(); });   // (a save this far on is shown its era once; not this test's subject)
  // The scene is rebuilt on the way in (as after buying the tree parcels: the upgrades changed), so the practice starts from a restart WITH data: its end must not start it again.
  await p.evaluate(() => { game.scene.getScene('game').builtWith = 'stale'; });
  await p.click('#goBtn'); await p.waitForTimeout(800);
  const t0 = Date.now(); let ended = false;
  while (Date.now() - t0 < 60000) {
    const v = await p.evaluate(() => { const s = game.scene.getScene('game'), c = document.getElementById('coach'), ok = document.getElementById('coachOk');
      const pl = (s.plots || []).find(q => !q.used && q.x > s.plane.x);
      return { state: s.state, practice: !!(s.school && s.school.practice), ok: !c.hidden && !ok.hidden && !ok.disabled, title: !document.getElementById('title').hidden, dx: pl ? pl.x - s.plane.x : null, y: s.plane.y, vy: s.plane.vy, done: !!game.registry.get('save').treePractice }; });
    if (v.done && v.title) { ended = true; break; }
    if (v.ok) { await p.click('#coachOk').catch(() => {}); await p.waitForTimeout(200); continue; }
    if (v.state === 'takeoff' || v.state === 'idle') { await p.mouse.move(195, 460); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); continue; }
    if (v.state === 'playing' && v.dx != null && v.dx > 90 && v.dx < 140) { await p.keyboard.press('t'); await p.waitForTimeout(400); }
    if (v.state === 'playing' && v.y > 300 && v.vy > -60) await p.mouse.click(195, 460);
    await p.waitForTimeout(45);
  }
  check(ended, 'three practice trees and the last OK end the lesson on HOME');
  await p.waitForTimeout(4000);
  const after = await p.evaluate(() => { const s = game.scene.getScene('game'), sv = game.registry.get('save');
    return { state: s.state, school: !!s.school, coach: !document.getElementById('coach').hidden, title: !document.getElementById('title').hidden, done: !!sv.treePractice, groves: JSON.stringify(sv.groves || {}), flights: sv.flights }; });
  check(after.state === 'idle' && !after.school, `no flight left running behind HOME: ${JSON.stringify(after)}`);
  check(!after.coach && after.title, `HOME, no bubble: ${JSON.stringify(after)}`);
  check(!/saplings":\[\{/.test(after.groves), `practice trees are not saved: ${after.groves}`);
  check(after.flights === 6, `the practice is not a flight: flights ${after.flights}`);
  check(!errs.length, `page errors: ${errs}`);
  await b.close();
  console.log(fails.length ? `FAIL practice:\n - ${fails.join('\n - ')}` : 'PASS practice: TAKE OFF starts the practice, three seeds end it on HOME with the scene idle, the lesson done, nothing saved');
  process.exit(fails.length ? 1 : 0);
})();
