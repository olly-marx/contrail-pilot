// What the autopilot pick-up does, by Autopilot level (Oliver, 2026-11-26; POWERUPS.autoTiers in src/config.js, rules.js autopilotPlan).
// Each level adds a behaviour on top of the ones before: 1-2 the middle of each storm gap only; 3 icy air by day; 4 keeps out of icy air at
// night; 5 seeds; 7 lines up with night icy air far ahead and dodges it (crystals); 9 plans through the next gaps, off screen too. And at
// every level: 20 px clear of the storm cloud above, and in its last second it settles mid-gap before handing back.
// Each check is a planted scene: the level just below must NOT do it, the level that adds it must. Plain Node, no browser.
// Run: node tests/autotiers.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { POWERUPS, PLANE, WIDTH } = await import('../src/config.js');
  const T = POWERUPS.autoTiers, fails = [];
  const check = (c, m) => { if (!c) fails.push(m); console.log(`${c ? 'ok  ' : 'FAIL'} ${m}`); };
  const world = (level, { night = false } = {}) => {
    const w = createWorld({ tutorialDone: true, autoTakeoff: true, seenTips: ['*'], tours: ['*'], priceVersion: 2, flightSeconds: 4 * 3600,
      fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: { autopilot: level } } }, 7);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.storms = []; w.birds = []; w.issrs = []; w.tokens = [];
    w.plane.y = 250; w.plane.vy = 0; w.nightDodges = 0;
    w.clock = night ? 20 : 2; w.updateDayNight(0);
    w.autoUntil = w.gameTime + 60000; w.autoFrom = w.gameTime;
    return w;
  };
  const storm = (w, x, gapTop, gapBottom) => { const st = { rects: [{ x, y: 0, width: 44, height: gapTop }, { x, y: gapBottom, width: 44, height: 600 }], parts: [] }; w.storms.push(st); return st; };
  const patch = (w, x, y, wd, h) => { w.addIssrAt(x, y, wd, h); return w.issrs[w.issrs.length - 1]; };
  const inIce = (w, i, y) => w.inIssrShape(i, { x: w.plane.x + 40, y, w: PLANE.w, h: PLANE.h });

  // Clearance and the settle (every level).
  { const w = world(T.dayIce); const st = storm(w, w.plane.x - 5, 240, 420); const y = w.autopilotPlan();
    check(y >= st.rects[0].height + POWERUPS.autoClearAbove, `clearance: under a storm cloud it keeps ${POWERUPS.autoClearAbove} px below it (plan y ${y}, cloud bottom 240)`); }
  { const w = world(T.forecast); storm(w, w.plane.x + 40, 60, 200); w.autoUntil = w.gameTime + POWERUPS.autoSettleMs / 2; const y = w.autopilotPlan();
    check(y === w.autopilotTarget(), `settle: in its last second it flies to the middle of the gap (plan ${y}, gap middle ${w.autopilotTarget()})`); }

  // 1-2: the middle of the gap, nothing else.
  { const w = world(1); storm(w, w.plane.x + 120, 60, 260); const mid = (60 + 260) / 2 - PLANE.h / 2;
    check(Math.abs(w.autopilotPlan() - mid) < 1, `level 1: flies the middle of the next storm gap (plan ${w.autopilotPlan()}, middle ${mid})`); }

  // Icy air by day: level 2 ignores it, dayIce flies into it.
  for (const lv of [T.dayIce - 1, T.dayIce]) { const w = world(lv); const i = patch(w, w.plane.x + 10, 120, 260, 60);
    const got = inIce(w, i, w.autopilotPlan());
    check(lv >= T.dayIce ? got : !got, `level ${lv}: ${lv >= T.dayIce ? 'flies into' : 'does not go for'} icy air by day (in it: ${got})`); }

  // Icy air at night: dayIce does not avoid it, nightIce does.
  for (const lv of [T.nightIce - 1, T.nightIce]) { const w = world(lv, { night: true }); const i = patch(w, w.plane.x + 10, 220, 260, 70);
    const got = inIce(w, i, w.autopilotPlan());
    check(lv >= T.nightIce ? !got : got, `level ${lv}: ${lv >= T.nightIce ? 'keeps out of' : 'does not mind'} icy air at night (in it: ${got})`); }

  // Seeds: nightIce does not steer for one, seeds does.
  for (const lv of [T.seeds - 1, T.seeds]) { const w = world(lv); w.addToken(w.plane.x + 70, 340, false); const t = w.tokens[0];
    const y = w.autopilotPlan(), near = Math.abs(y + PLANE.h / 2 - (t.y + 7)) <= w.kit.pickup;
    check(lv >= T.seeds ? near : !near, `level ${lv}: ${lv >= T.seeds ? 'steers for' : 'does not steer for'} a seed 90 px below (plan ${y}, seed ${t.y})`); }

  // Crystals: at night, real icy air far ahead and not yet in the path: crystals lines up with it (so it counts as 'in your path').
  for (const lv of [T.crystals - 1, T.crystals]) { const w = world(lv, { night: true });
    const x = w.plane.x + PLANE.w + POWERUPS.autoLineUpPx + 40, i = patch(w, Math.min(x, WIDTH - 20), 120, 200, 50);
    const cy = w.autopilotPlan() + PLANE.h / 2, lined = cy >= i.y && cy <= i.y + i.height;
    check(lv >= T.crystals ? lined : !lined, `level ${lv}: ${lv >= T.crystals ? 'lines up with' : 'does not line up with'} night icy air far ahead (plane middle ${cy}, patch ${i.y}-${i.y + i.height})`); }
  { const w = world(T.crystals, { night: true }); const i = patch(w, w.plane.x + PLANE.w + 20, 230, 200, 60); i.inPath = true;
    const got = inIce(w, i, w.autopilotPlan());
    check(!got, `level ${T.crystals}: once it is in the path, it dodges it (in it: ${got})`); }

  // Forecast: a wide gap now, a high gap next (off screen, as the next-gap hint places it). Below forecast it waits low; forecast climbs early.
  for (const lv of [T.forecast - 1, T.forecast]) { const w = world(lv); w.plane.y = 330;
    storm(w, w.plane.x + 90, 40, 420); storm(w, WIDTH + 60, 40, 170);
    const y = w.autopilotPlan(), early = y <= 170 - POWERUPS.autoClearBelow - PLANE.h + 1;
    check(lv >= T.forecast ? early : !early, `level ${lv}: ${lv >= T.forecast ? 'already at' : 'not yet at'} the height of the high gap after next (plan ${y})`); }

  if (fails.length) { console.log(`FAIL autotiers: ${fails.length}`); process.exit(1); }
  console.log('PASS autotiers: each Autopilot level adds its behaviour, and the level below does not have it');
})();
