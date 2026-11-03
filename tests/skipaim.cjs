// The per-trip 'Skip the mission route' choice (src/aim.js; the Coordinator + the sim chat, 2026-11-02). No browser.
// save.skipAim: set by the player on HOME; the route then flies the normal tour while the mission stays OPEN; a CRASH keeps it (so the
// retry flies the route the player chose); the next LANDING clears it (src/sim/rules.js, beside save.heading); the button shows only while a
// city mission is open; its words fit the 320 px budget (also in tests/textbudget2.cjs).
// Run: node tests/skipaim.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const AIM = await import('../src/aim.js'), M = await import('../src/missions2.js'), R = await import('../src/route.js'), H = await import('../src/hub.js');
  const { createWorld } = await import('../src/sim/world.js');
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], areas: ['weurope'], homeArea: 'weurope',
    homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  // 0. The positive control: a city mission is open and the route aims at it, or nothing below proves anything.
  const s = base(), target = AIM.aimOpen(s);
  check(!!target && AIM.aimTarget(s) === target, `a city mission is open and the route aims at it: ${target} / ${AIM.aimTarget(s)}`);
  const open = () => M.visible(s).map(m => m.key).join();
  const before = open();
  check(H.hubView(s).skip === 'off', `HOME offers the skip while the route aims: ${H.hubView(s).skip}`);
  // 1. The choice: the aim goes, the mission stays open, the button turns into an undo.
  AIM.toggleSkip(s);
  check(s.skipAim === true && AIM.aimTarget(s) === null, `skipped: the route does not aim (${AIM.aimTarget(s)})`);
  check(AIM.aimOpen(s) === target && open() === before, `skipped: the mission is still open (${open()} vs ${before}) and still names ${AIM.aimOpen(s)}`);
  check(AIM.routeFor(s, 6).join() === R.flightPath(s, 6).join(), `skipped: the route is today's tour: ${AIM.routeFor(s, 6)} vs ${R.flightPath(s, 6)}`);
  check(H.hubView(s).skip === 'on', `HOME offers the undo while skipped: ${H.hubView(s).skip}`);
  AIM.toggleSkip(s);
  check(!s.skipAim && AIM.aimTarget(s) === target, 'undone: the route aims again');
  // 2. No mission to aim at (the aim switched off): no button.
  AIM.ROUTE_AIM.on = false; const none = H.hubView(base()).skip; AIM.ROUTE_AIM.on = true;
  check(none === null, `no city mission to aim at: no skip button (${none})`);
  // 3. A real flight through the engine: a crash keeps the choice, a landing clears it.
  const fly = (finishArg, skip) => {
    const w = createWorld({ ...base(), skipAim: skip }, 1);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false;
    w.nextAirport.worldX = 1e12; w.distancePx += 1200; w.landedAt = w.nextAirport.name;
    w.finish(finishArg);
    return w;
  };
  let w = fly({ reason: 'You hit the ground!' }, true);
  check(w.save.skipAim === true, `a crash keeps the choice: ${w.save.skipAim}`);
  w.initFlight();
  check(w.save.skipAim === true, `the retry's initFlight keeps it too: ${w.save.skipAim}`);
  w = fly({ landed: true }, true);
  check(w.save.skipAim === false, `a landing clears it: ${w.save.skipAim}`);
  w = fly({ landed: true }, false);
  check(!w.save.skipAim, `a landing without a skip stays unskipped: ${w.save.skipAim}`);
  // 4. The words fit one line at 320 px (9 px Pixel font, 1 em a character, 264 px of text: 29 characters).
  for (const [k, t] of Object.entries(AIM.SKIP_TEXT)) check(t.length <= 29, `the ${k} button text fits one line at 320 (${t.length} chars): "${t}"`);
  console.log(fails.length ? `FAIL skipaim:\n - ${fails.join('\n - ')}` : 'PASS skipaim: skip keeps the mission open, a crash keeps it, a landing clears it, the button shows only while a city mission is open');
  process.exit(fails.length ? 1 : 0);
})();
