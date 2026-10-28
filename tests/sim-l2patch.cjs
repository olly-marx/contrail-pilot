// The on-rails onboarding (2026-10-27): with lesson L2 pending ("fly through icy air in daytime"), flight 2's route has
// one guaranteed daytime icy patch (src/sim/rules.js l2Patch), so a player holding mid-sky completes L2 (a real-tap
// autopilot missed it on 4 flights running without it). Season-2 save, L1 done, L2 pending, 5 seeds, a mid-height pilot:
// within the first 25 s the plane is inside icy air for >= 3 s in DAYTIME and sunBlocked reaches 3. A save with L2 done
// gets no fixed patch. PLANT=1 switches the hunk off (l2Patch = false before the first check): must FAIL. Plain Node.
// Run: node tests/sim-l2patch.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { PLANE, HEIGHT, GROUND_H, WIDTH } = await import('../src/config.js');
  const P = await import('../src/sim/physics.js');
  const DT = 16.67 / 1000, MID = (HEIGHT - GROUND_H) / 2, plant = !!process.env.PLANT, fails = [], GAPS = process.env.GAPS !== '0';
  const save = done => ({ areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, autoTakeoff: true, priceVersion: 2, landings: 1, flights: 2,
    missionsDone: done, fuel: 'kerosene', fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
  const fly = (done, seed) => {
    const w = createWorld(save(done), seed); if (plant) w.l2Patch = false;
    const fixed = []; const at = w.addIssrAt.bind(w); w.addIssrAt = (x, y, ww, hh) => { const r = at(x, y, ww, hh); if (x >= WIDTH + 10 && hh === 200 && ww >= 560) fixed.push(r); return r; };
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false; w.nextAirport.worldX = 1e12;
    let inDay = 0, t = 0, seenAt200 = null, overlap = 0;   // the patch must be VISIBLE as the plane nears it (sim chat: hiddenAlpha)
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
    while (t < 25 && w.state === 'playing') {
      // The browser pilot's eye (tests/onrails.cjs): a storm gap ahead first, else the icy air by day, else mid-sky.
      const ahead = w.storms.filter(st => st.rects[0].x + st.rects[0].width > PLANE.x - 4).sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
      const icy = w.issrs.find(i => !i.fake && i.x + i.width > PLANE.x && i.x < PLANE.x + 200);
      const aim = GAPS && ahead && ahead.rects[0].x < PLANE.x + 220 ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - 6 : icy && w.isDay ? icy.y + icy.height / 2 - 6 : MID;
      if (w.plane.y > aim && w.plane.vy > -60) w.applyFlap();
      w.step(DT); t += DT;
      const box = { x: PLANE.x, y: w.plane.y, w: PLANE.w, h: 12 };
      if (fixed[0] && w.issrs.includes(fixed[0])) for (const st of w.storms) { const c = st.rects[0]; if (c.x < fixed[0].x + fixed[0].width && fixed[0].x < c.x + c.width) overlap++; }   // (sim chat: no storm column in the patch's x-span)
      if (fixed[0] && seenAt200 == null && fixed[0].x - (box.x + box.w) <= 200) seenAt200 = P.issrAlpha(w, fixed[0], box, false);
      if (w.isDay && w.issrs.some(i => !i.fake && box.x < i.x + i.width && i.x < box.x + box.w && box.y < i.y + i.height && i.y < box.y + box.h)) inDay += DT;
    }
    return { inDay: +inDay.toFixed(1), sun: +(w.sunBlocked || 0).toFixed(1), fixed: fixed.length, alpha200: seenAt200, stormFrames: overlap };
  };
  for (let seed = 1; seed <= (+process.env.SEEDS || 5); seed++) {
    const r = fly(['L1'], seed);
    if (!(r.inDay >= 3 && r.sun >= 3 && r.fixed === 1 && r.alpha200 > 0 && !r.stormFrames)) fails.push(`seed ${seed}, L2 pending: ${JSON.stringify(r)} (want >= 3 s inside icy air by day, sunBlocked >= 3, one fixed patch, visible from 200 px, no storm column across it)`);
    const c = fly(['L1', 'L2'], seed);
    if (c.fixed) fails.push(`seed ${seed}, L2 done: a fixed patch was spawned (${c.fixed})`);
  }
  if (fails.length) { console.log('FAIL sim-l2patch\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS sim-l2patch: with L2 pending and a storm-gap-following pilot, ${+process.env.SEEDS || 5}/${+process.env.SEEDS || 5} seeds give >= 3 s inside daytime icy air and sunBlocked >= 3; none with L2 done`);
})();
