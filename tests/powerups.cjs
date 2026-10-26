// Pick-ups and the day/night gradient (2026-10-22, POWERUPS in src/config.js):
// SAF can: All-SAF numbers for a while (less CO2, contrails shorter-lived), then your own fuel back.
// Autopilot: steers by itself, keeps out of icy air, can still crash, and a tap takes control back.
// Day/night: a long twilight, and the 'Night is coming!' warning well before it is dark.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/powerups.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
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
    tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {},
    flightSeconds: 4 * 3600, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: { autopilot: 1 } } })); });   // 0.10.2: SAF cans from the 2010s, autopilot pick-ups with the gadget
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

  // Autopilot pick-up's planner (autopilotPlan): real icy air (addIssrAt) level with the plane.
  // By day with time to spare it flies INTO it (a shading contrail); at night, or so late in the day
  // that the contrail would last into the dark, it keeps out. Birds in the way: it goes round.
  const plan = await p.evaluate(() => { const s = game.scene.getScene('game'); const { daySeconds: D } = { daySeconds: 15 };
    s.plane.y = 200; s.issrs.forEach(i => { i.x = -999; });
    s.addIssrAt(s.plane.x + 10, 180, 220, 60); const ice = s.issrs[s.issrs.length - 1];
    const inIce = y => s.inIssrShape(ice, { x: s.plane.x + 40, y, w: 50, h: 12 });
    const at = clock => { s.clock = clock; s.updateDayNight(0); return inIce(s.autopilotPlan()); };
    const r = { day: at(2), lateDay: at(12), night: at(20) };
    ice.x = -999;
    s.addFlock(s.plane.x + 60, s.plane.y + 6); const f = s.birds[s.birds.length - 1];
    const y = s.autopilotPlan();
    r.bird = f.birds.some(b => y < b.y + s.alphaMask(b.key).h + 4 && y + 12 > b.y - 4);
    s.birds = s.birds.filter(x => x !== f); f.birds.forEach(b => b.view.destroy());
    s.clock = 2; s.updateDayNight(0);
    return r; });
  check(plan.day && !plan.lateDay && !plan.night, `autopilot seeks icy air only by day with time for the contrail to fade before dark: ${JSON.stringify(plan)}`);
  check(!plan.bird, `autopilot goes round birds: ${JSON.stringify(plan)}`);
  // Grab one: it flies, ignores the grabbing tap, says how to take control, can't crash, then a tap takes it back.
  const auto = await p.evaluate(async () => { const s = game.scene.getScene('game');
    s.graceUntil = 0; s.plane.y = 200; s.plane.vy = 0;
    s.addPower('auto', s.plane.x + 10, s.plane.y + 6);
    await new Promise(r => setTimeout(r, 300));
    s.flap();
    const lockedOn = s.onAutopilot(), lockLabel = s.autoText.text;
    await new Promise(r => setTimeout(r, 1500));
    const on = s.onAutopilot(), label = s.autoText.visible ? s.autoText.text : '', y = s.plane.y;
    // A storm right on the plane: it must not crash while on autopilot.
    s.storms.push({ rects: [{ x: s.plane.x - 5, y: 0, width: 70, height: 600 }, { x: s.plane.x - 5, y: 700, width: 70, height: 1 }], parts: [], fake: true });
    await new Promise(r => setTimeout(r, 300));
    const alive = s.state === 'playing';
    s.storms = s.storms.filter(st => !st.fake);
    s.flap();
    const off = !s.onAutopilot();
    return { lockedOn, lockLabel, on, label, y, alive, off }; });
  check(auto.lockedOn && !/TAP/.test(auto.lockLabel), `the tap right after grabbing it does not cancel it: ${JSON.stringify(auto)}`);
  check(auto.on && auto.y > 30 && auto.y < 400, `autopilot flies the plane: ${JSON.stringify(auto)}`);
  check(/TAP to take control/.test(auto.label), `autopilot says how to take control once it can be: ${JSON.stringify(auto)}`);
  check(auto.alive, `nothing can crash you on autopilot: ${JSON.stringify(auto)}`);
  check(auto.off, `a tap takes control back: ${JSON.stringify(auto)}`);
  // The first SAF can always comes, early and in your path.
  const first = await p.evaluate(async () => { const s = game.scene.getScene('game');
    s.tokens.filter(t => t.power).forEach(t => t.view.destroy()); s.tokens = s.tokens.filter(t => !t.power);
    s.safOffered = false; s.distancePx = Math.max(s.distancePx, 1600); s.nextPowerAt = s.distancePx; s.nextAirport.worldX = s.distancePx + 50000;
    const keep = s.rng; s.rng = () => 0.5;   // a roll that would give nothing
    await new Promise(r => setTimeout(r, 300));
    s.rng = keep;
    const can = s.tokens.find(t => t.power === 'saf');
    return { got: !!can, dy: can ? Math.round(can.baseY - s.plane.y) : null }; });
  check(first.got && Math.abs(first.dy) < 120, `the first SAF can comes early, near your path: ${JSON.stringify(first)}`);

  // Day/night: twilight long enough to see, and the warning comes while it is still light.
  const tw = await p.evaluate(() => { const s = game.scene.getScene('game');
    const half = t => { s.clock = t; const { isDay, toOther } = s.dayNightPhase(); return { isDay, toOther, n: s.nightAmount() }; };
    let start = null, dark = null;
    for (let t = 0; t < 30; t += 0.1) { const h = half(t); if (start === null && h.isDay && h.toOther > 0) start = t; if (dark === null && !h.isDay) dark = t; }
    return { start, dark }; });
  check(tw.start !== null && tw.dark - tw.start >= 3.5, `sunset lasts at least 3.5 s before night (was 5 with the 6 s dusk; the user shortened it to 4 s on 2026-10-23): ${JSON.stringify(tw)}`);

  console.log({ saf, plan, auto, first, tw, fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
