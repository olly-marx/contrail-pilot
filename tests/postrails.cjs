// After the rails: flights 3-10 as a fresh player plays them (the post-rails audit, 2026-10-28). Real taps only; the
// game's state is READ (where the plane, gaps, icy air, runway are), never written. Starts just off the rails (L1+L2
// done, the rails seen). Each round: on the hub, follow NEXT wherever it leads (NATURE, the hangar, MISSIONS' claims),
// tapping whatever is lit; then TAKE OFF and fly (gap first, icy air by day / away at night, skip the first airport
// while L4 is the lesson, land otherwise). Screenshots of every results card and hub to SHOTS. Asserts: L3, L4 and L5
// are all done by flight 10 (each never stalls: 2 misses -> taught; the first parcels are free), no strip ever covers
// the plane, no toast overlaps a strip, no page errors.
// Run: python3 -m http.server 8000 & SHOTS=/tmp/post node tests/postrails.cjs
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/', SHOTS = process.env.SHOTS || '';
const W = 390, H = 844;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); }, log = [];
  const p = await b.newPage({ viewport: { width: W, height: H } }); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fleet = { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} };
  await p.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } },
    { areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars', 'x-first-animal'], freeGiven: true, freeProjectGiven: true,
      fleet, seeds: 60, crystals: 2, flights: 3, landings: 2, missionsDone: ['L1', 'L2'], unclaimed: [], habitat: {},
      tours: ['r-school', 'r-free', 'r-takeoff1', 'r-res1', 'r-takeoff2', 'r-res2', 'r-nature', 'name', 'hangar', 'nature-lead'] });
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  let n = 0; const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` }); };
  const save = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
  const screen = () => p.evaluate(() => ['title', 'results', 'hangar', 'nature', 'missions', 'boards', 'info', 'payoff'].find(id => { const e = document.getElementById(id); return e && !e.hidden; }) || 'flight');
  // Tap what is lit (a rails step or a spotlight), close an info card or payoff; returns false when nothing needed a tap.
  const tapLit = async () => {
    if (await p.isVisible('#iClose')) { await p.click('#iClose'); return true; }
    if (await p.isVisible('#payOk')) { await p.click('#payOk'); return true; }
    const t = await p.evaluate(() => { const t = document.getElementById('tour'); if (!t || t.hidden) return null; const r = t.querySelector('.tring').getBoundingClientRect(), ok = t.querySelector('.tbubble .btn');
      return { ok: ok && !ok.hidden && ok.offsetParent !== null, x: r.left + r.width / 2, y: r.top + r.height / 2, text: t.querySelector('.tbubble p').textContent }; });
    if (!t) return false;
    log.push(`lit: ${t.text}`);
    if (t.ok) await p.click('#tour .tbubble .btn'); else await p.mouse.click(t.x, t.y);
    await p.waitForTimeout(500); return true;
  };
  const settle = async () => { for (let i = 0; i < 25 && await tapLit(); i++); };
  const look = () => p.evaluate(() => {
    const s = game.scene.getScene('game'), coach = document.getElementById('coach'), ok = document.getElementById('coachOk'), cv = document.querySelector('#game canvas'), toast = document.getElementById('toast');
    const k = cv.getBoundingClientRect(), sx = k.width / 288, sy = k.height / 512, pr = { l: k.left + s.plane.x * sx, t: k.top + (s.plane.y - 8) * sy, r: k.left + (s.plane.x + 58) * sx, b: k.top + (s.plane.y + 22) * sy };
    const cr = !coach.hidden && coach.classList.contains('tappable') ? coach.getBoundingClientRect() : null, tr = !toast.hidden ? toast.getBoundingClientRect() : null;
    const ahead = (s.storms || []).filter(st => st.rects[0].x + st.rects[0].width > s.plane.x - 4).sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    const issr = (s.issrs || []).find(i => !i.fake && i.x + i.width > s.plane.x && i.x < s.plane.x + 200);
    const md = s.save.missionsDone || [];
    return { state: s.state, y: s.plane.y, vy: s.plane.vy, day: s.isDay, results: !document.getElementById('results').hidden,
      okUp: !coach.hidden && !ok.hidden && !ok.disabled, skyH: 464, toRunway: s.nextAirport ? s.nextAirport.worldX - s.distancePx : 1e9,
      skipNow: md.includes('L3') && !md.includes('L4') && (s.airportsSkipped || 0) === 0,
      gap: ahead && ahead.rects[0].x < s.plane.x + 220 ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - 6 : null,
      issr: issr ? { top: issr.y, bot: issr.y + issr.height } : null,
      covered: !!(cr && cr.left < pr.r && pr.l < cr.right && cr.top < pr.b && pr.t < cr.bottom),
      stack: !!(cr && tr && cr.left < tr.right && tr.left < cr.right && cr.top < tr.bottom && tr.top < cr.bottom) };
  });
  const target = v => v.toRunway < 40 && v.toRunway > -220 && !v.skipNow ? 1e9 : v.gap != null ? v.gap
    : v.issr ? (v.day ? (v.issr.top + v.issr.bot) / 2 - 6 : (v.issr.top > v.skyH / 2 ? v.issr.top - 40 : v.issr.bot + 30))
    : v.toRunway < 700 && !v.skipNow ? v.skyH - 30 : v.skyH * 0.45;
  let covered = 0, stacked = 0, run = 0;   // stacked = frames in a toast-over-strip run of 3+ in a row: the game drops a toast below a strip that appears (GameScene dropToast), so ONE frame of overlap while it moves is by design and load-dependent
  for (let f = 3; f <= 10; f++) {
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);   // (a fresh page each flight, as a child reopening the game)
    await settle();
    // Follow NEXT while it leads somewhere (not a take-off lead), as a player who reads it would.
    for (let k = 0; k < 4; k++) {
      if (await screen() !== 'title') { await settle(); if (await p.isVisible('#tabFly')) { await p.click('#tabFly'); await p.waitForTimeout(500); } await settle(); continue; }
      const nx = await p.evaluate(() => { const e = document.getElementById('hubNext'); return e && e.offsetParent !== null ? e.innerText : ''; });
      if (!/NATURE|hangar|Claim|prizes/i.test(nx)) break;
      log.push(`flight ${f} NEXT: ${nx.replace(/\s+/g, ' ')}`);
      await p.click('#hubNext'); await p.waitForTimeout(800); await settle();
      for (const sel of ['#hFleet .btn.free', '#wTrees .btn.free', '#mPrizes .btn.claim']) { const el = await p.$(sel); if (el && await el.isVisible()) { await el.click(); await p.waitForTimeout(600); await settle(); } }
      if (await p.isVisible('#tabFly')) { await p.click('#tabFly'); await p.waitForTimeout(500); } await settle();
    }
    await shot(`hub-before-flight-${f}`);
    await p.click('#goBtn'); await p.waitForTimeout(400);
    const t0 = Date.now();
    while (Date.now() - t0 < 240000) {
      const v = await look();
      if (v.results) break;
      if (v.covered) covered++; run = v.stack ? run + 1 : 0; if (run >= 3) stacked++;
      if (v.okUp) { await p.click('#coachOk').catch(() => {}); continue; }
      if (v.state === 'takeoff' || v.state === 'idle') { await p.mouse.move(W / 2, H * 0.55); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); continue; }
      if (v.state === 'playing' && v.y > target(v) && v.vy > -60) await p.mouse.click(W / 2, H * 0.6);
      await p.waitForTimeout(45);
    }
    await p.waitForTimeout(3200);
    const sv = await save();
    log.push(`flight ${f}: ${(await p.evaluate(() => document.getElementById('rTitle').textContent))} | done ${sv.missionsDone.filter(k => /^L\d$/.test(k)).join(',')} | misses ${JSON.stringify(sv.lessonMisses || {})} | parcels ${(sv.levels || {}).trees || 0}`);
    await shot(`results-flight-${f}`);
    await settle();
  }
  const sv = await save();
  check(['L3', 'L4', 'L5'].every(k => sv.missionsDone.includes(k)), `L3, L4 and L5 are all done by flight 10 (${sv.missionsDone.filter(k => /^L\d$/.test(k))}; misses ${JSON.stringify(sv.lessonMisses || {})})`);
  check(!covered, `no teaching strip ever covered the plane (${covered} frames did)`);
  check(!stacked, `no toast ever overlapped a teaching strip (${stacked} frames did)`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL postrails:\n - ${fails.join('\n - ')}` : 'PASS postrails: flights 3-10 with real taps reach L5 done; no strip over the plane, no toast over a strip, no page errors');
  process.exit(fails.length ? 1 : 0);
})();
