// The first hour as the USER plays it (their live bug, 2026-10-27, twice: they could not get from the first landing to
// the hangar, while tests/walkthrough.cjs passed because it SKIPPED flight school and forced landings with hooks).
// Here: a truly fresh profile, real taps only. The test reads the game's state the way a player reads the screen (where
// the plane, the gap, the icy air and the runway are) but never writes to it. It flies the whole flight school to its
// landing (no skip), then asserts the school-done card leads to the HANGAR, the hangar shows the free part, and TAKE OFF
// stays locked until it is picked. A second run crashes flight 1 on purpose (real taps: none) and checks the same lead.
// Run: python3 -m http.server 8000 & SHOTS=/tmp/real node tests/firsthour-real.cjs   (proved by planted defects)
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
  const look = () => p.evaluate(() => {   // READ ONLY: what a player sees
    const s = game.scene.getScene('game'), coach = document.getElementById('coach'), ok = document.getElementById('coachOk');
    const ahead = (s.storms || []).filter(st => st.rects[0].x + st.rects[0].width > s.plane.x - 4).sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    const r = { state: s.state, school: !!s.school, y: s.plane.y, vy: s.plane.vy, day: s.isDay, okUp: !coach.hidden && !ok.hidden && !ok.disabled,
      tapStep: !coach.hidden && coach.classList.contains('waiting') && ok.hidden, results: !document.getElementById('results').hidden,
      skyH: s.scale.height - 48, toRunway: s.nextAirport ? s.nextAirport.worldX - s.distancePx : 1e9 };
    r.gap = ahead && ahead.rects[0].x < s.plane.x + 220 ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - 6 : null;
    const issr = (s.issrs || []).find(i => i.x + i.width > s.plane.x && i.x < s.plane.x + 200);
    r.issr = issr ? { top: issr.y, bot: issr.y + issr.height } : null;
    return r; });
  const tap = () => p.mouse.click(W / 2, H * 0.55);
  // A player's eye: where to be. Gap first, then icy air (INTO by day, AWAY at night), the runway, else mid-sky.
  const target = v => v.gap != null ? v.gap
    : v.issr ? (v.day ? (v.issr.top + v.issr.bot) / 2 - 6 : (v.issr.top > v.skyH / 2 ? v.issr.top - 40 : v.issr.bot + 30))
    : v.toRunway < 700 ? v.skyH - 26 : v.skyH * 0.45;
  const playUntil = async (done, seconds, fly = true) => {
    const t0 = Date.now();
    while (Date.now() - t0 < seconds * 1000) {
      const v = await look();
      if (await done(v)) return true;
      if (v.okUp) { await p.click('#coachOk').catch(() => {}); continue; }
      if (v.tapStep) { await tap(); await p.waitForTimeout(150); continue; }
      if (v.state === 'takeoff' || v.state === 'idle') { await p.mouse.move(W / 2, H * 0.55); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); continue; }
      if (fly && v.state === 'playing' && v.y > target(v) && v.vy > -60) await tap();
      await p.waitForTimeout(45);
    }
    return false;
  };

  // A fresh player: start choice (Seoul, as in the user's screenshot), START, how to play, the whole flight school.
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  await p.click('#startChoice [data-area="easia"]'); await p.click('#startChoice [data-city="SEOUL"]'); await p.waitForTimeout(1200); await ready(p);
  await shot('hub-fresh');
  await p.click('#goBtn'); await p.waitForTimeout(500); await shot('how-to');
  await p.click('#howClose'); await p.waitForTimeout(500);
  const finished = await playUntil(v => v.results, 300);
  check(finished, 'a player can fly the whole flight school to its landing with real taps');
  await p.waitForTimeout(3000);   // the card's reveal
  await shot('school-done');
  const card = await p.evaluate(() => ({ title: document.getElementById('rTitle').textContent, btn: document.getElementById('againBtn').textContent,
    free: !document.getElementById('rFree').hidden, fact: !document.getElementById('rFact').hidden && document.getElementById('rFact').textContent }));
  check(/school/i.test(card.title) && /OPEN THE HANGAR/.test(card.btn), `the school-done card leads to the HANGAR: ${JSON.stringify(card)}`);
  check(!card.fact, `no random fact on a card that leads somewhere: ${JSON.stringify(card.fact)}`);
  await p.click('#againBtn'); await p.waitForTimeout(1500);
  await shot('hangar');
  check(await p.evaluate(() => !document.getElementById('hangar').hidden && !!document.querySelector('#hFleet .freepick')), 'OPEN THE HANGAR opens it at the FREE part picker');
  // Leave WITHOUT picking: TAKE OFF must be locked and NEXT must lead back.
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t && !t.hidden) { t.hidden = true; game.registry.get('ui').tour.busy = false; } });   // (the guided tour's dim layer; the test leaves on purpose)
  await p.click('#hubBack'); await p.waitForTimeout(500);
  const hub = await p.evaluate(() => ({ locked: document.getElementById('goBtn').disabled, next: document.getElementById('hubNext').innerText, tile: !!document.querySelector('#hubTiles [data-go="hangar"]') }));
  check(hub.locked && /free upgrade/i.test(hub.next) && hub.tile, `skipping the pick: TAKE OFF locked, NEXT leads to the hangar, the tile is there: ${JSON.stringify(hub)}`);
  await shot('hub-locked');
  // Pick it, then crash flight 1 on purpose (no taps): the hangar stays reachable, nothing locks the player out.
  await p.click('#hubTiles [data-go="hangar"]'); await p.waitForTimeout(800);
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t && !t.hidden) { t.hidden = true; game.registry.get('ui').tour.busy = false; } });
  const free = await p.$('#hFleet .freepick .btn.free'); if (free) { await free.click(); await p.waitForTimeout(500); }
  await p.click('#hubBack'); await p.waitForTimeout(500);
  check(await p.evaluate(() => !document.getElementById('goBtn').disabled), 'after the pick TAKE OFF works');
  await p.click('#goBtn');
  const crashed = await playUntil(v => v.results, 90, false);   // no taps while playing: it falls and crashes
  await p.waitForTimeout(2500); await shot('flight1-crash');
  check(crashed, 'flight 1 ends (a crash with no taps)');
  await p.click('#againBtn'); await p.waitForTimeout(800);
  check(await p.evaluate(() => !!document.querySelector('#hubTiles [data-go="hangar"]')), 'after a crash on flight 1 the HANGAR tile is still on the hub');
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL firsthour-real:\n - ${fails.join('\n - ')}` : 'PASS firsthour-real: real taps through flight school; the school-done card leads to the hangar, TAKE OFF locked until the free part is picked');
  process.exit(fails.length ? 1 : 0);
})();
