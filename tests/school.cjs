// Flight school check: a first-time player is sent to flight school, every step can be completed
// by doing what the captain says, the flight ends with a landing, and school is marked done.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/school.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: process.env.SHOTS ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(700);

  const label = await p.textContent('#goBtn');
  if (label.trim() !== 'START') fails.push('first-time button should say START, got ' + label);
  await p.click('#goBtn');
  // How to play comes first.
  await p.waitForTimeout(300);
  if (!await p.isVisible('#how')) fails.push('START should show How to play before flight school');
  await p.click('#howClose'); await p.waitForTimeout(300);

  const seen = [], lessons = {};
  let held = false;
  let shot = 0;
  for (let i = 0; i < 1500; i++) {
    const st = await p.evaluate(() => {
      const s = game.scene.getScene('game'), sc = s.school;
      const coach = document.getElementById('coach');
      const pic = document.getElementById('coachPic');
      return { step: sc ? sc.i : -1, waiting: coach.classList.contains('waiting') && !coach.hidden,
        text: document.getElementById('coachText').textContent, state: s.state, school: !!sc,
        lesson: !pic.hidden && !coach.hidden ? { frozen: s.frozen, dim: !document.getElementById('coachDim').hidden, src: pic.getAttribute('src') } : null };
    });
    if (st.lesson) lessons[st.step] = st.lesson;
    if (!seen.includes(st.step)) {
      seen.push(st.step);
      if (process.env.SHOTS) { await p.waitForTimeout(250); await p.screenshot({ path: `${process.env.SHOTS}/school-${String(shot++).padStart(2, '0')}.png` }); }
    }
    if (st.state === 'over') break;
    if (st.waiting) { await p.click(await p.isVisible('#coachOk') ? '#coachOk' : '#coach'); await p.waitForTimeout(120); continue; }
    // Take off the way the captain says: press and hold until the plane is flying.
    if (st.state === 'takeoff') { if (!held) { held = true; await p.mouse.move(195, 400); await p.mouse.down(); } await p.waitForTimeout(100); continue; }
    if (held) { held = false; await p.mouse.up(); }

    // Autopilot that does what the captain asks.
    const tap = await p.evaluate(() => {
      const s = game.scene.getScene('game'), sc = s.school;
      if (!sc || s.state !== 'playing') return false;
      const step = sc.i;
      let target = 220;
      const storm = s.storms.find(st => st.rects[0].x + 44 > s.plane.x);
      const issr = s.issrs.find(i => i.x + i.width > s.plane.x);
      const token = s.tokens[0];
      if (storm) target = storm.rects[0].height + (storm.rects[1].y - storm.rects[0].height) / 2 - 6;
      else if (token) target = token.baseY - 2;
      else if (issr && s.isDay) target = issr.y + issr.height / 2 - 6;
      else if (issr && !s.isDay) target = issr.y + issr.height + 40;      // fly below at night
      const toA = s.nextAirport.worldX - s.distancePx;
      if (toA < 140 && toA > -150) return false;                           // glide down to land
      return s.plane.y > target && s.plane.vy > -40;
    });
    if (tap) await p.mouse.click(195, 300);
    await p.waitForTimeout(40);
  }

  const end = await p.evaluate(() => ({ r: game.scene.getScene('game').result, save: JSON.parse(localStorage.getItem('contrailPilot.v2')) }));
  await p.waitForTimeout(1500);
  if (!await p.isVisible('#results')) fails.push('flight school should end on the results');
  // Every lesson (a diagram) is shown with the game frozen and dimmed behind it.
  const ls = Object.values(lessons);
  if (ls.length !== 7) fails.push(`expected 7 diagram lessons, saw ${ls.length}`);
  if (!ls.every(l => l.frozen && l.dim && /lesson-/.test(l.src))) fails.push(`every lesson should freeze and dim the game: ${JSON.stringify(ls)}`);
  if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/school-${String(shot++).padStart(2, '0')}.png` });
  // Missing the icy air must not get flight school stuck: more icy air appears.
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p2.goto(URL); await p2.evaluate(() => localStorage.clear()); await p2.reload(); await p2.waitForTimeout(700);
  await p2.click('#goBtn'); await p2.waitForTimeout(300); await p2.click('#howClose'); await p2.waitForTimeout(300); await p2.mouse.move(195, 400); await p2.mouse.down(); await p2.waitForTimeout(2500); await p2.mouse.up();
  const stuck = await p2.evaluate(() => new Promise(res => { const s = game.scene.getScene('game'), sc = s.school;
    sc.i = 8; sc.next(); s.frozen = false; const first = sc.issr;   // step 9: day icy air
    const iv = setInterval(() => { s.plane.y = sc.issr === first ? 420 - 60 : s.plane.y; s.plane.vy = 0; s.contrails.forEach(c => c.destroy()); s.contrails = []; }, 16);
    setTimeout(() => { clearInterval(iv); res({ step: sc.i, newIssr: sc.issr !== first, text: document.getElementById("coachText").textContent }); }, 9000); }));   // a 300 px patch takes ~6 s to pass
  if (!(stuck.step === 9 && stuck.newIssr && /Missed it/.test(stuck.text))) fails.push(`missing the icy air should bring more, not get stuck: ${JSON.stringify(stuck)}`);
  await p2.close();

  console.log({ stepsSeen: seen, landed: end.r && end.r.landed, cargo: end.r && end.r.cargo, seeds: end.save.seeds, tutorialDone: end.save.tutorialDone, errs });
  if (!end.r || !end.r.landed) fails.push('flight school did not end in a landing');
  if (!end.save.tutorialDone) fails.push('tutorialDone not saved');
  const steps = seen.filter(x => x >= 0 && x < 16);   // 16 = finished
  if (steps.length !== 16 || Math.max(...seen) > 16) fails.push(`flight school should be exactly 16 steps (7 diagram lessons), all completed; saw ${JSON.stringify(steps)}`);
  if (!(await p.isVisible('#results'))) fails.push('results not shown after school');
  if ((await p.textContent('#rTitle')).toLowerCase().indexOf('school') < 0) fails.push('results do not say flight school');
  // Second visit: the button says TAKE OFF and starts a normal flight.
  await p.click('#againBtn'); await p.waitForTimeout(500);
  if (await p.evaluate(() => !!game.scene.getScene('game').school)) fails.push('second flight went to school again');
  if (errs.length) fails.push('page errors');
  console.log(fails.length ? 'FAIL: ' + fails.join('; ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
