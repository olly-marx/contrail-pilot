// THE STORY'S PLAN, on HOME and in flight (Oliver, 2026-11-26, a special delivery 'Vaccines for three cities': the HOME globe was 'an ugly
// mess of lines', and in flight 'my destination target bar just says the next city like I'm in explore mode'). The REAL game:
//   1. HOME, a special delivery ready at its pickup: the globe names the plan's cities (both crate stops and the landing, the landing in
//      gold) and draws no square on the airports the flight passes between them (control: the network way has such airports);
//   2. in flight, a special delivery whose landing is more than 12 airports ahead: the route strip ends at the LANDING city with its
//      crate stop on the way (it used to end at the next airport).
// Plants (tools/plants.tsv): the network way's squares drawn again under a story; the strip's 12-airport window back.
// Run: python3 -m http.server 8000 & node tests/storyplan-ui.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const FLEET = { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: {} };
const ALL = ['weurope', 'namerica', 'sasia', 'africa', 'samerica', 'easia', 'mideast', 'nordic', 'oceania', 'aotearoa', 'patagonia'];
const offer = (id, theme, stops) => ({ id, theme, slot: 2, made: 0, title: 'Test delivery', story: 'x', pic: 'story-vaccine', level: 'hard', hearts: 3, heartsLeft: 3, payMul: 2, crate: true,
  stops, lines: stops.map(() => 'x'), stages: stops.slice(1).map(() => 3000), km: 3000 * (stops.length - 1), pay: { seeds: 900, crystals: 60 }, needs: [], reached: 1 });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (save) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, save);
    await p.goto(URL); await ready(p); await p.waitForTimeout(800); return p;
  };
  const base = { muted: true, tutorialDone: true, visited: ['LONDON', 'NAIROBI'], priceVersion: 2, freeGiven: true, freeProjectGiven: true, autoTakeoff: true, seenTips: ['*'], tours: ['*'], flights: 60, landings: 40, seeds: 5000, crystals: 100, flightSeconds: 9000, bestDistance: 60000,
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], areas: ALL, homeArea: 'weurope', homeCity: 'LONDON', fleet: FLEET };

  // 1. HOME: NAIROBI > SAO PAULO, RIO (crates) > BRASILIA (a valid one-place delivery)
  {
    const o = offer('story-901', 'vaccine', ['NAIROBI', 'SAO PAULO', 'RIO', 'BRASILIA']);
    const p = await open({ ...base, city: 'NAIROBI', storyBoard: [null, null, o], storyActive: o.id, aimCity: 'BRASILIA', storySeq: 901 });
    const r = await p.evaluate(async () => {
      await new Promise(res => setTimeout(res, 300));
      const labels = [...document.querySelectorAll('#hubLabels .globe-label')].map(e => ({ t: e.textContent, dest: e.classList.contains('dest') }));
      const { crateWay } = await import('./src/storyboard.js'), save = game.registry.get('save');
      const way = crateWay(save) || [], plan = ['NAIROBI', 'SAO PAULO', 'RIO', 'BRASILIA'], between = way.filter(n => !plan.includes(n));
      const cv = document.getElementById('hubGlobe'), g = cv.getContext('2d'), gl = cv.__globe, rc = cv.getBoundingClientRect(), k = cv.width / rc.width;
      const gold = between.map(n => { const q = gl.cityPos(n); if (!q) return null; const x = Math.round((q.x - rc.left) * k), y = Math.round((q.y - rc.top) * k), d = g.getImageData(x - 1, y - 1, 3, 3).data;
        let hit = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 240 && d[i + 1] > 195 && d[i + 1] < 225 && d[i + 2] < 110) hit++; return { n, hit }; }).filter(Boolean);
      return { labels, way, between, gold, active: save.storyActive };
    });
    const names = r.labels.map(l => l.t);
    check(r.active === 'story-901', `1. FIXTURE: the delivery is the active story (${r.active})`);
    check(r.between.length >= 1 && r.gold.length >= 1, `1. FIXTURE: the network way passes visible airports between the plan's cities (${JSON.stringify(r.between)}, visible ${r.gold.length})`);
    check(['SAO PAULO', 'RIO', 'BRASILIA'].every(n => names.includes(n)), `1. the globe names both crate stops and the landing (${JSON.stringify(r.labels)})`);
    check(r.labels.some(l => l.t === 'BRASILIA' && l.dest), `1. the landing is the gold name (${JSON.stringify(r.labels)})`);
    check(!names.some(n => r.between.includes(n)), `1. no airport on the way is named (${JSON.stringify(names)})`);
    check(r.gold.every(x => x.hit < 5), `1. no gold square on the airports on the way (${JSON.stringify(r.gold)})`);
    check(!p.errs.length, `1. no page errors (${p.errs.join(' | ')})`);
    await p.close();
  }

  // 2. in flight: LONDON > BOGOTA, DELHI (crates) > SYDNEY, a way of more than 12 airports (a tour theme: the one-place rule does not apply)
  {
    const o = offer('story-902', 'sensors', ['LONDON', 'BOGOTA', 'DELHI', 'SYDNEY']);
    const p = await open({ ...base, city: 'LONDON', storyBoard: [null, null, o], storyActive: o.id, aimCity: 'SYDNEY', storySeq: 902 });
    await p.click('#goBtn'); await p.mouse.move(195, 500); await p.mouse.down();
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 25000 }).catch(() => {}); await p.mouse.up();
    await p.waitForTimeout(400);
    const r = await p.evaluate(() => { const s = game.scene.getScene('game'), rv = s.routeView();
      return { path: s.path.length, landAt: s.path.indexOf('SYDNEY'), name: rv.name, drops: rv.drops.map(d => d.name), stripName: s.strip.name.text, dropText: s.strip.dropName.text, state: s.state }; });
    check(r.landAt > 12, `2. FIXTURE: the landing is more than 12 airports ahead (${JSON.stringify(r)})`);
    check(r.name === 'SYDNEY' && r.stripName === 'SYDNEY', `2. the strip ends at the landing city (${JSON.stringify(r)})`);
    check(r.drops.includes('BOGOTA') && r.drops.includes('DELHI') && r.dropText === 'BOGOTA 1/2', `2. both crate stops are on the strip, the next one named 'BOGOTA 1/2' (${JSON.stringify(r)})`);
    check(!p.errs.length, `2. no page errors (${p.errs.join(' | ')})`);
    await p.close();
  }
  // 3. Oliver's board: the frozen DENVER, MUMBAI, MANAUS delivery leaves it on HOME, with a notice, at no cost
  {
    const o = offer('story-9', 'vaccine', ['NAIROBI', 'DENVER', 'MUMBAI', 'MANAUS']);
    const p = await open({ ...base, city: 'NAIROBI', storyBoard: [null, null, o], storyActive: o.id, aimCity: 'MANAUS', storySeq: 9 });
    await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const s = game.registry.get('save'); return { active: s.storyActive || null, aim: s.aimCity || null, ids: (s.storyBoard || []).map(x => x && x.id), seeds: s.seeds, toast: document.body.innerText.includes('too spread out') }; });
    check(!r.active && !r.ids.includes('story-9') && r.seeds === 5000, `3. the far-apart delivery is off the board, nothing active, no fee (${JSON.stringify(r)})`);
    check(r.toast, `3. HOME says why (${JSON.stringify(r)})`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log(`FAIL storyplan-ui:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS storyplan-ui: HOME shows the plan only (crate stops and landing named, no airports on the way); the strip spans a long special delivery to its landing');
})();
