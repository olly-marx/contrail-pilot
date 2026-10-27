// The ON-RAILS onboarding, proven foolproof (the user, 2026-10-27: "the ONLY thing they should be able to do is what you want
// them to do ... you absolutely have got to make sure that everything is fool proof and WORKS").
// A fresh profile at 390x844, real taps only (the game's state is READ, as a player reads the screen, never written).
// At EVERY rails step it asserts: (a) exactly ONE tappable thing on the whole screen (a hit test every 16 px), the target or
// the bubble's OK; (b) the target and the bubble are fully on screen; (c) in flight, no teaching strip covers the plane;
// (d) each tap has its effect (the next screen, the part bought, the seeds added). A screenshot of every step (SHOTS=dir).
// Run: python3 -m http.server 8000 & SHOTS=/tmp/rails node tests/onrails.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/', SHOTS = process.env.SHOTS || '';
const W = 390, H = 844;
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); sessionStorage.setItem('fresh', '1'); } });
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  let n = 0; const shot = async name => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${String(++n).padStart(2, '0')}-${name}.png` }); };

  // (a)+(b): what a finger can reach, everywhere on the screen, and where the bubble and target are.
  const audit = () => p.evaluate(() => {
    const tour = document.getElementById('tour'), up = tour && !tour.hidden, reach = new Map();
    for (let y = 8; y < innerHeight; y += 16) for (let x = 8; x < innerWidth; x += 16) {
      const el = document.elementFromPoint(x, y); if (!el || el.closest('#tour .tdim')) continue;   // the dim layer swallows the tap
      const c = el.closest('button, a, input, select, [data-go], [data-project], [data-fbuy], [data-area], [data-city], canvas');
      if (c && !c.disabled && getComputedStyle(c).pointerEvents !== 'none') reach.set(c, `${c.id || c.className}|${(c.textContent || '').trim().slice(0, 24)}`);
    }
    const ring = up ? tour.querySelector('.tring').getBoundingClientRect() : null, bub = up ? tour.querySelector('.tbubble').getBoundingClientRect() : null;
    const inView = r => !r || (r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1);
    return { up, text: up ? tour.querySelector('.tbubble p').textContent : '', reach: [...reach.values()],
      ringIn: inView(ring), bubbleIn: inView(bub), ring: ring && { l: ring.left, t: ring.top, w: ring.width, h: ring.height } };
  });
  // One rails step: wait for its bubble (or a modal), check (a)+(b), screenshot, tap the one target, check (d).
  const step = async (name, expect, effect, { modal = null } = {}) => {
    let a = null;
    for (let i = 0; i < 60; i++) { a = await audit(); if (modal ? await p.$(modal) : a.up && expect.test(a.text)) break; await p.waitForTimeout(150); }
    await shot(name);
    check(modal || (a.up && expect.test(a.text)), `${name}: the rails step shows ("${a.text}")`);
    check(a.reach.length === 1, `${name}: exactly ONE thing can be tapped (${a.reach.length}: ${a.reach.join(' / ')}; ring ${JSON.stringify(a.ring)})`);
    check(a.ringIn && a.bubbleIn, `${name}: the target and the sentence are fully on screen (ring ${a.ringIn}, bubble ${a.bubbleIn})`);
    if (!modal && !a.up) return;   // (no bubble: already recorded as a failure above; nothing to tap)
    if (modal) await p.click(modal);
    else { const okBtn = await p.$('#tour .tbubble .btn:not([hidden])'); if (okBtn && await okBtn.isVisible()) await okBtn.click(); else await p.mouse.click(a.ring.l + a.ring.w / 2, a.ring.t + a.ring.h / 2); }
    await p.waitForTimeout(700);
    if (effect) check(await p.evaluate(effect), `${name}: the tap had its effect`);
  };

  // Flying with real taps (the same eye as tests/firsthour-real.cjs), checking (c) and the flight's rules as it goes.
  const look = () => p.evaluate(() => {
    const s = game.scene.getScene('game'), coach = document.getElementById('coach'), ok = document.getElementById('coachOk'), cv = document.querySelector('#game canvas');
    const k = cv.getBoundingClientRect(), sx = k.width / 288, sy = k.height / 512, pr = { l: k.left + s.plane.x * sx, t: k.top + (s.plane.y - 8) * sy, r: k.left + (s.plane.x + 58) * sx, b: k.top + (s.plane.y + 22) * sy };
    const cr = !coach.hidden && coach.classList.contains('tappable') ? coach.getBoundingClientRect() : null;
    const ahead = (s.storms || []).filter(st => st.rects[0].x + st.rects[0].width > s.plane.x - 4).sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    const issr = (s.issrs || []).find(i => i.x + i.width > s.plane.x && i.x < s.plane.x + 200);
    return { state: s.state, school: !!s.school, y: s.plane.y, vy: s.plane.vy, day: s.isDay, results: !document.getElementById('results').hidden,
      okUp: !coach.hidden && !ok.hidden && !ok.disabled, tapStep: !coach.hidden && coach.classList.contains('waiting') && ok.hidden,
      skyH: 464, toRunway: s.nextAirport ? s.nextAirport.worldX - s.distancePx : 1e9,
      gap: ahead && ahead.rects[0].x < s.plane.x + 220 ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - 6 : null,
      issr: issr ? { top: issr.y, bot: issr.y + issr.height } : null,
      covered: !!(cr && cr.left < pr.r && pr.l < cr.right && cr.top < pr.b && pr.t < cr.bottom), turbs: (s.turbs || []).length,
      wild: (s.life || []).filter(x => x.kind && !/animal-(cow|sheep)/.test(x.kind)).length };
  });
  const target = v => v.toRunway < 40 && v.toRunway > -220 ? 1e9 : v.gap != null ? v.gap
    : v.issr ? (v.day ? (v.issr.top + v.issr.bot) / 2 - 6 : (v.issr.top > v.skyH / 2 ? v.issr.top - 40 : v.issr.bot + 30))
    : v.toRunway < 700 ? v.skyH - 30 : v.skyH * 0.45;
  const fly = async (label, seconds, rules = {}) => {
    const t0 = Date.now(); let covered = 0, turbs = 0, wild = 0;
    while (Date.now() - t0 < seconds * 1000) {
      const v = await look();
      if (v.results) break;
      if (v.covered) covered++; turbs = Math.max(turbs, v.turbs); wild = Math.max(wild, v.wild);
      if (v.okUp) { await p.click('#coachOk').catch(() => {}); continue; }
      if (v.tapStep) { await p.mouse.click(W / 2, H * 0.55); await p.waitForTimeout(150); continue; }
      if (v.state === 'takeoff' || v.state === 'idle') { await p.mouse.move(W / 2, H * 0.55); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); continue; }
      if (v.state === 'playing' && v.y > target(v) && v.vy > -60) await p.mouse.click(W / 2, H * 0.6);
      await p.waitForTimeout(45);
    }
    await p.waitForTimeout(3200);   // the results reveal
    check(await p.evaluate(() => !document.getElementById('results').hidden), `${label}: the flight ended with the results`);
    check(!covered, `${label}: no teaching strip ever covered the plane (${covered} frames did)`);
    if (rules.noTurb) check(!turbs, `${label}: no turbulence yet (${turbs})`);
    if (rules.noWild) check(!wild, `${label}: no wild animals yet (${wild})`);
  };

  // R1-R3: start choice (Seoul), how to play, flight school (choice screens: several options by design).
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="easia"]'); await p.click('#startChoice [data-city="SEOUL"]'); await p.waitForTimeout(1200); await ready(p);
  await p.click('#goBtn'); await p.waitForTimeout(500); await shot('how-to'); await p.click('#howClose'); await p.waitForTimeout(500);
  await fly('flight school', 300);
  // R4-R7.
  await step('R4-school-done', /FREE/i, () => !document.getElementById('hangar').hidden);
  await step('R5-hangar-free', /Cleaner engines/i, () => !JSON.parse(localStorage.getItem('contrailPilot.v2')).freeUpgrade);
  await step('R6-payoff', /./, () => document.getElementById('payoff').hidden && !document.getElementById('title').hidden, { modal: '#payOk' });
  await step('R7-takeoff', /Take off/i, () => !document.getElementById('title').hidden || game.scene.getScene('game').state !== 'idle');
  // R8-R9: flight 1, then the seeds, the mission's prize, and the wildlife hint.
  await fly('flight 1', 240, { noTurb: true, noWild: true });
  const seeds0 = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).seeds);
  await step('R9a-seeds', /seeds/i, null);
  await step('R9b-claim', /mission/i, () => true);
  check(await p.evaluate(s0 => JSON.parse(localStorage.getItem('contrailPilot.v2')).seeds > s0, seeds0), 'R9b: claiming added the seeds');
  await step('R9c-wildlife', /wildlife/i, () => !document.getElementById('title').hidden);
  await step('R10-takeoff2', /animals/i, null);
  // R10-R11: flight 2, then NATURE and its free first project.
  await fly('flight 2', 240, { noTurb: true });
  // A player can miss the daytime icy air: FLY ON and fly again (up to 3 more flights), as they would. NATURE must follow L2.
  for (let i = 0; i < 3 && !(await p.evaluate(() => (JSON.parse(localStorage.getItem('contrailPilot.v2')).missionsDone || []).includes('L2'))); i++) {
    await p.evaluate(() => { const t = document.getElementById('tour'); return t && !t.hidden; }) && await p.click('#tour .tbubble .btn:not([hidden])').catch(() => {});
    await p.click('#againBtn'); await p.waitForTimeout(800);
    if (await p.evaluate(() => !document.getElementById('title').hidden)) await p.click('#goBtn');
    await fly(`flight 2 retry ${i + 1}`, 240, { noTurb: true });
  }
  await step('R11a-nature', /NATURE/i, () => !document.getElementById('nature').hidden);
  await step('R11b-free-project', /FREE/i, () => (JSON.parse(localStorage.getItem('contrailPilot.v2')).habitat || {}) && JSON.parse(localStorage.getItem('contrailPilot.v2')).freeProjectGiven === true);
  await step('R11c-projects', /animals back/i, null);
  await step('R11d-how', /trees/i, null);
  await step('R11e-home', /wild animals/i, () => !document.getElementById('title').hidden);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL onrails:\n - ${fails.join('\n - ')}` : 'PASS onrails: every rails step has exactly one tappable target, fully on screen, each tap works; no strip covers the plane; flights 1-2 follow the rails rules');
  process.exit(fails.length ? 1 : 0);
})();
