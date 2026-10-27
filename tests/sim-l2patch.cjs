// The on-rails onboarding (2026-10-27): with lesson L2 pending ("fly through icy air in daytime"), flight 2's route has
// one guaranteed daytime icy patch (src/sim/rules.js l2Patch), so a player holding mid-sky completes L2 (a real-tap
// autopilot missed it on 4 flights running without it). Season-2 save, L1 done, L2 pending, 5 seeds, a mid-height pilot:
// within the first 25 s the plane is inside icy air for >= 3 s in DAYTIME and sunBlocked reaches 3. A save with L2 done
// gets no fixed patch. PLANT=1 switches the hunk off (l2Patch = false before the first check): must FAIL. Plain Node.
// Run: node tests/sim-l2patch.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { PLANE, HEIGHT, GROUND_H } = await import('../src/config.js');
  const DT = 16.67 / 1000, MID = (HEIGHT - GROUND_H) / 2, plant = !!process.env.PLANT, fails = [];
  const save = done => ({ areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, autoTakeoff: true, priceVersion: 2, landings: 1, flights: 2,
    missionsDone: done, fuel: 'kerosene', fleet: { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} } });
  const fly = (done, seed) => {
    const w = createWorld(save(done), seed); if (plant) w.l2Patch = false;
    const fixed = []; const at = w.addIssrAt.bind(w); w.addIssrAt = (x, y, ww, hh) => { if (ww >= 450 && hh === 100) fixed.push(ww); return at(x, y, ww, hh); };
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false; w.nextAirport.worldX = 1e12;
    let inDay = 0, t = 0;
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
    while (t < 25 && w.state === 'playing') {
      if (w.plane.y > MID && w.plane.vy > -40) w.applyFlap();
      w.step(DT); t += DT;
      const box = { x: PLANE.x, y: w.plane.y, w: PLANE.w, h: 12 };
      if (w.isDay && w.issrs.some(i => !i.fake && box.x < i.x + i.width && i.x < box.x + box.w && box.y < i.y + i.height && i.y < box.y + box.h)) inDay += DT;
    }
    return { inDay: +inDay.toFixed(1), sun: +(w.sunBlocked || 0).toFixed(1), fixed: fixed.length };
  };
  for (let seed = 1; seed <= 5; seed++) {
    const r = fly(['L1'], seed);
    if (!(r.inDay >= 3 && r.sun >= 3 && r.fixed === 1)) fails.push(`seed ${seed}, L2 pending: ${JSON.stringify(r)} (want >= 3 s inside icy air by day, sunBlocked >= 3, one fixed patch)`);
    const c = fly(['L1', 'L2'], seed);
    if (c.fixed) fails.push(`seed ${seed}, L2 done: a fixed patch was spawned (${c.fixed})`);
  }
  if (fails.length) { console.log('FAIL sim-l2patch\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS sim-l2patch: with L2 pending, 5/5 seeds give >= 3 s inside daytime icy air and sunBlocked >= 3; none with L2 done');
})();
