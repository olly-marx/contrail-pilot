// THE 'WHY NO CRYSTAL' LINE IN A REAL NIGHT FLIGHT (src/GameScene.js onNoCrystal, src/sim/rules.js crystalReason; the user, 2026-11-09). 390x844, a real flight started with TAKE OFF, night forced. A patch of icy air that never lined up with
// the plane passes: ONE line appears, 'You were not heading into it'; a second patch right after shows nothing (at most one every 12 s of flight); after 13 s of flight the next patch shows its line again; and while a tip is up
// (scene.explaining) no line is shown over it. Plants: tools/plants.tsv, test `crystalpopup`. Run: python3 -m http.server 8000 & node tests/crystalpopup.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['x-bars', 'airport', 'takeoff', 'x-crystals', 'x-hot', 'tree-1', 'gapHint'], tours: ['*'],
  freeGiven: true, freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, seed);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
    await p.click('#goBtn');
    const flying = await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s && s.state === 'playing'; }, null, { timeout: 25000 }).then(() => true).catch(() => false);
    check(flying, 'the flight did not start'); if (!flying) throw new Error('no flight');
    const r = await p.evaluate(async () => {
      const s = game.scene.getScene('game'), shown = [], orig = s.popup.bind(s); s.popup = (x, y, text, c) => { if (!/^NEW ANIMAL/.test(text)) shown.push(text); return orig(x, y, text, c); };
      s.graceUntil = 1e12; s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false; s.storms.forEach(st => st.rects.forEach(rr => { rr.x = -999; })); s.storms = []; s.nextStormAt = s.nextIssrAt = s.nextTurbAt = s.nextBirdsAt = 1e9; s.issrs = [];
      const hold = setInterval(() => { s.plane.y = 250; s.plane.vy = 0; s.clock = 19; s.heat = 0; }, 16), wait = ms => new Promise(r => setTimeout(r, ms));
      const patch = async () => { s.addIssrAt(s.plane.x + 160, 250 - 60 - 25, 120, 60); await wait(5500); };   // 25 px above the plane: never lines up
      await patch(); const first = shown.slice();
      await patch(); const second = shown.slice();
      s.gameTime += 13000; await patch(); const third = shown.slice();
      s.explaining = true; s.gameTime += 13000; const before = shown.length; s.onNoCrystal('notheading'); const tipNew = shown.length - before; s.explaining = false;   // the sim does not step while a tip is up, so the hook is called directly: past the 12 s limit, only the tip guard can stop the line
      clearInterval(hold); return { first, second, third, tipNew };
    });
    log.push(JSON.stringify(r));
    const L = 'You were not heading into it';
    check(r.first.length === 1 && r.first[0] === L, `a missed cloud shows ONE reason line: ${JSON.stringify(r.first)}`);
    check(r.second.length === 1, `a second cloud right after shows nothing (one per 12 s): ${JSON.stringify(r.second)}`);
    check(r.third.length === 2 && r.third[1] === L, `after 13 s of flight the next cloud shows its line again: ${JSON.stringify(r.third)}`);
    check(r.tipNew === 0, `no line is shown over a tip (new lines while a tip is up, 13 s after the last line): ${JSON.stringify(r)}`);
    check(!p.errs.length, `page errors: ${p.errs.join('; ')}`); await ctx.close();
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL crystalpopup:\n - ${fails.join('\n - ')}` : 'PASS crystalpopup: a missed night cloud shows one reason line, one per 12 s, never over a tip');
  process.exit(fails.length ? 1 : 0);
})();
