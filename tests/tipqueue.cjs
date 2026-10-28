// In-flight tips are never lost or stale (the audit, 2026-10-28). Drives GameScene's own tip methods on a real flight:
//   - a tip asked for while NOT playing (take-off / landing) is not shown and not marked seen (it fires next time);
//   - a tip queued behind another and never shown because the flight ended is UNMARKED (shows next time), the queue empty;
//   - the next flight starts with an empty queue (a scene restart keeps fields).
// Run: python3 -m http.server 8000 & node tests/tipqueue.cjs   (plant: dropTips a no-op -> must FAIL)
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
    { areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], tours: ['*'], freeGiven: true,
      missionsDone: ['L1', 'L2'], landings: 3, flights: 4, fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
  await p.goto(URL); await ready(p); await p.waitForTimeout(600);
  await p.click('#goBtn'); await started(p);
  const r1 = await p.evaluate(() => { const s = game.scene.getScene('game'); const st = s.state; return { st, shown: s.explain('tq-takeoff', 'take-off tip'), seen: s.save.seenTips.includes('tq-takeoff') }; });
  check(r1.st !== 'playing' && !r1.shown && !r1.seen, `a tip outside 'playing' is not shown and not marked (${JSON.stringify(r1)})`);
  await p.mouse.move(195, 460); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up();   // (hold to take off)
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  // A toast already up + a tip strip at the top: the toast drops below the strip, no overlap (audit #6).
  const r0 = await p.evaluate(async () => { const s = game.scene.getScene('game'); s.hitsStorm = () => false; s.hitBird = () => false; s.plane.y = 300;   // (low: the strip goes on top)
    game.registry.get('ui').toast('Night is coming!', 'A toast that is already up.', 'bad', 6); await new Promise(r => setTimeout(r, 100));
    s.explain('tq-t', 'At night a contrail traps heat like a blanket. Fly under or over the icy air to keep Earth cool!', 'lesson-hot');   /* (a real-sized tip: two lines and a picture) */ await new Promise(r => setTimeout(r, 150));
    const c = document.getElementById('coach').getBoundingClientRect(), t = document.getElementById('toast').getBoundingClientRect();
    const out = { toast: !document.getElementById('toast').hidden, coach: !document.getElementById('coach').hidden, overlap: c.bottom > t.top && t.bottom > c.top && c.right > t.left && t.right > c.left, cb: Math.round(c.bottom), tt: Math.round(t.top) };
    s.closeTip(); return out; });
  check(r0.toast && r0.coach && !r0.overlap, `a toast already up drops below the tip strip (${JSON.stringify(r0)})`);
  await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => { const s = game.scene.getScene('game'); s.hitsStorm = () => false; s.hitBird = () => false;
    const a = s.explain('tq-a', 'first tip'), q = s.explain('tq-b', 'second tip (queued)');
    return { a, q, queued: (s.tipQueue || []).length, seenB: s.save.seenTips.includes('tq-b') }; });
  check(r2.a && r2.q && r2.queued === 1 && r2.seenB, `a second tip queues behind the first (${JSON.stringify(r2)})`);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.landedAt = s.path[1]; s.finish({ landed: true }); });
  await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => game.scene.getScene('game').closeTip && game.scene.getScene('game').closeTip());
  const r3 = await p.evaluate(() => { const s = game.scene.getScene('game'); return { queued: (s.tipQueue || []).length, seenB: s.save.seenTips.includes('tq-b'), seenA: s.save.seenTips.includes('tq-a'), stored: JSON.parse(localStorage.getItem('contrailPilot.v2')).seenTips.includes('tq-b') }; });
  check(!r3.queued && !r3.seenB && !r3.stored && r3.seenA, `the flight ended: the unshown tip is unmarked (in the save too), the queue empty, the shown one stays seen (${JSON.stringify(r3)})`);
  await p.click('#againBtn'); await p.waitForTimeout(800);
  const r4 = await p.evaluate(() => (game.scene.getScene('game').tipQueue || []).length);
  check(r4 === 0, `the next flight starts with an empty tip queue (${r4})`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL tipqueue:\n - ${fails.join('\n - ')}` : 'PASS tipqueue: no tip on take-off/landing; an unshown queued tip is unmarked when the flight ends; each flight starts with an empty queue');
  process.exit(fails.length ? 1 : 0);
})();
