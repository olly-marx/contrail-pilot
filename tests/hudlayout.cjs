// No two HUD texts overlap in flight (a player's screenshot, 2026-10-27: "Keep tonight's sky" and "Next: ISTANBUL 517 km"
// drawn over each other - season 2 mission titles wrap to 2 lines and the next-airport line was fixed at y 58).
// Phone size, season 2, a long mission title showing together with the next-airport line.
// Run: python3 -m http.server 8000 & node tests/hudlayout.cjs   (proved by a planted defect: the fixed y)
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
    { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2,
      landings: 3, flights: 4, freeGiven: true, missionsDone: ['L1', 'L2'], levels: { trees: 1 }, fleet });   // NEXT = L3, a 2-line title
  await p.goto(URL); await ready(p); await p.waitForTimeout(500);
  await p.click('#goBtn'); await started(p);
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 }).catch(() => {});
  // Bring the next airport into the "Next: <city> <km>" range, then let the HUD redraw a few frames.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.nextAirport.worldX = s.distancePx + 600; });   // (inside AIRPORT.signFrom 700: the 'Next: <city> <km>' line shows)
  await p.waitForTimeout(600);
  // The two top pop-ups the game shows (rules.js: a hazard's "… ahead!" at y 84, "NIGHT OWL!" at y 60): the audit, 2026-10-27.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.popup(144, 84, 'No-fly zone ahead!', '#ff8080'); s.popup(144, 60, 'NIGHT OWL!', '#ffe15a', 16); });
  const overlaps = () => p.evaluate(() => {
    const s = game.scene.getScene('game'), names = ['missionText', 'nextText', 'cargoText', 'multText', 'hintText', 'parcelText', 'autoText', 'kindsText', 'cleanBg', 'dropBg'];   // (+ the CLEAN and DROP buttons, 2026-10-28)
    const boxes = names.map(n => [n, s[n]]).filter(([n, t]) => t && t.visible && (t.text || n.endsWith('Bg')) && t.alpha > 0).map(([n, t]) => { const b = t.getBounds(); return { n, text: t.text || n, x: b.x, y: b.y, w: b.width, h: b.height }; })
      .concat((s.popups || []).map((q, i) => { const b = q.t.getBounds(); return { n: `popup${i}`, text: q.t.text, x: b.x, y: b.y, w: b.width, h: b.height, pop: true }; }));
    const hits = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], c = boxes[j];
      if (a.pop && c.pop) continue;   // (two pop-ups at once may stack; the check is pop-ups vs the HUD)
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) hits.push(`${a.n} "${a.text}" over ${c.n} "${c.text}"`);
    }
    return { boxes: boxes.map(b => `${b.n}@${Math.round(b.y)}+${Math.round(b.h)}`), hits, mission: s.missionText.text, next: s.nextText.text };
  });
  const r = await overlaps(); await p.waitForTimeout(900); const late = await overlaps();   // and near the end of their rise
  r.hits.push(...late.hits.map(h => `${h} (after 0.9 s)`));
  check(r.mission.includes('\n') || r.boxes.some(x => x.startsWith('missionText') && +x.split('+')[1] > 12), `the test shows a long (wrapped) mission title: ${JSON.stringify(r)}`);
  check(/Next|km/.test(r.next), `and the next-airport line at the same time: "${r.next}"`);
  check(!r.hits.length, `no two HUD texts overlap: ${r.hits.join('; ')} ${JSON.stringify(r.boxes)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  // A 2010s plane with Ops 8 (the CLEAN button beside DROP) and the forest meter's 'kinds n/3' showing: nothing in the
  // ground strip overlaps (the screenshot, 2026-10-28: 'kinds' ran under CLEAN).
  const q = await b.newPage({ viewport: { width: 390, height: 844 } }); q.errs = []; q.on('pageerror', e => q.errs.push(String(e)));
  await q.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await q.addInitScript(() => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify({ areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', priceVersion: 2, freeGiven: true, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
    flights: 40, landings: 30, seeds: 500, flightSeconds: 1e6, levels: { trees: 4 }, fleet: { plane: 'dreamliner', planes: { comet: {}, dreamliner: {} }, systems: { ops: 8 }, gadgets: {} } })); });
  await q.goto(URL); await ready(q); await q.waitForTimeout(500); await q.click('#goBtn'); await started(q);
  await q.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 }).catch(() => {});
  await q.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.setDropVisible && s.setDropVisible(true); s.dropBg.setVisible(true); s.dropLabel.setVisible(true); });
  await q.waitForTimeout(600);
  const g = await q.evaluate(() => { const s = game.scene.getScene('game'), list = ['kindsText', 'parcelText', 'hintText', 'cleanBg', 'dropBg'].map(n => [n, s[n]])
      .filter(([n, t]) => t && t.visible && (t.text || t.width)).map(([n, t]) => { const r = t.getBounds(); return { n, x: r.x, y: r.y, w: r.width, h: r.height, text: t.text }; });
    const hits = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i], c = list[j];
      if (a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h) hits.push(`${a.n} "${a.text || ''}" over ${c.n} "${c.text || ''}"`); }
    return { hits, has: list.map(x => x.n), kinds: s.kindsText && s.kindsText.text };
  });
  check(g.has.includes('cleanBg') && g.has.includes('kindsText') && /kinds/.test(g.kinds || ''), `the ground-strip check did not see CLEAN and the kinds meter: ${JSON.stringify(g)}`);
  check(!g.hits.length, `the ground strip overlaps: ${g.hits.join('; ')}`);
  check(!q.errs.length, `page errors (CLEAN flight): ${q.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL hudlayout:\n - ${fails.join('\n - ')}` : `PASS hudlayout: a wrapped mission title and the next-airport line never overlap (${r.boxes.join(', ')})`);
  process.exit(fails.length ? 1 : 0);
})();
