// Pick-ups and the day/night gradient (2026-10-22, POWERUPS in src/config.js):
// SAF can: All-SAF numbers for a while (less CO2, contrails shorter-lived), then your own fuel back.
// Autopilot: steers by itself, keeps out of icy air, can still crash, and a tap takes control back.
// Day/night: a long twilight, and the 'Night is coming!' warning well before it is dark.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/powerups.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {} })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);
  await p.click('#goBtn');
  await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.sys.isActive() && s.state === 'playing'; }, null, { timeout: 20000 });
  // A clear sky: no storms, birds or icy air unless a check puts them there.
  const clear = () => p.evaluate(() => { const s = game.scene.getScene('game');
    for (const st of s.storms) st.rects.forEach(r => { r.x = -999; }); s.birds = []; s.issrs.forEach(i => { i.x = -999; });
    s.nextStormAt = s.nextIssrAt = s.nextBirdsAt = s.nextTurbAt = 1e9; s.graceUntil = s.gameTime + 60000; s.plane.y = 200; });
  await clear();

  // SAF.
  const saf = await p.evaluate(async () => { const s = game.scene.getScene('game');
    const before = { co2: s.kit.co2Cruise, life: s.kit.contrailLife, fuel: s.kit.fuelId };
    s.addPower('saf', s.plane.x + 10, s.plane.y + 6);
    await new Promise(r => setTimeout(r, 400));
    const during = { co2: s.kit.co2Cruise, life: s.kit.contrailLife, on: s.safUntil > s.gameTime };
    s.safUntil = s.gameTime + 1;   // run it out
    await new Promise(r => setTimeout(r, 300));
    return { before, during, after: { co2: s.kit.co2Cruise, life: s.kit.contrailLife, on: !!s.safUntil } }; });
  check(saf.during.on && saf.during.co2 < saf.before.co2 * 0.8 && saf.during.life < saf.before.life, `SAF: less CO2, shorter-lived contrails: ${JSON.stringify(saf)}`);
  check(!saf.after.on && saf.after.co2 === saf.before.co2 && saf.after.life === saf.before.life, `SAF runs out back to your own fuel: ${JSON.stringify(saf)}`);

  // Autopilot: keeps out of icy air (the breather's autopilot does not need to).
  const ice = await p.evaluate(() => { const s = game.scene.getScene('game');
    s.issrs.push({ x: s.plane.x + 20, y: s.plane.y - 30, width: 200, height: 80, fake: true });
    const inIce = y => y + 12 > s.plane.y - 30 && y < s.plane.y + 50;
    const r = { avoid: inIce(s.autopilotTarget(true)), plain: inIce(s.autopilotTarget(false)) };
    s.issrs = s.issrs.filter(i => !i.fake);
    return r; });
  check(!ice.avoid && ice.plain, `autopilot pick-up steers out of icy air: ${JSON.stringify(ice)}`);
  // Grab one: it flies (no falling), the label says how to take control, a tap takes it back.
  const auto = await p.evaluate(async () => { const s = game.scene.getScene('game');
    s.graceUntil = 0; s.plane.y = 200; s.plane.vy = 0;
    s.addPower('auto', s.plane.x + 10, s.plane.y + 6);
    await new Promise(r => setTimeout(r, 1200));
    const on = s.onAutopilot(), label = s.autoText.visible ? s.autoText.text : '', y = s.plane.y;
    s.flap();
    const off = !s.onAutopilot();
    return { on, label, y, off }; });
  check(auto.on && auto.y > 120 && auto.y < 330, `autopilot flies the plane level, not falling: ${JSON.stringify(auto)}`);
  check(/TAP to take control/.test(auto.label), `autopilot says how to take control: ${JSON.stringify(auto)}`);
  check(auto.off, `a tap takes control back: ${JSON.stringify(auto)}`);

  // Day/night: twilight long enough to see, and the warning comes while it is still light.
  const tw = await p.evaluate(() => { const s = game.scene.getScene('game');
    const half = t => { s.clock = t; const { isDay, toOther } = s.dayNightPhase(); return { isDay, toOther, n: s.nightAmount() }; };
    let start = null, dark = null;
    for (let t = 0; t < 30; t += 0.1) { const h = half(t); if (start === null && h.isDay && h.toOther > 0) start = t; if (dark === null && !h.isDay) dark = t; }
    return { start, dark }; });
  check(tw.start !== null && tw.dark - tw.start >= 5, `sunset lasts at least 5 s before night: ${JSON.stringify(tw)}`);

  console.log({ saf, ice, auto, tw, fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
