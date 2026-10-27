// The mission fields of the flight result (src/sim/rules.js, 2026-10-27, PROPOSAL-HOME-MISSIONS): r.treeIds,
// r.cleanGaps, r.noFlyPassed. Each is checked against the test's OWN bookkeeping from the frames (onStep), not against
// the rules' counters:
//   treeIds     = the land-tagged trees that appeared in save.planted / plantedIn during the flight (UK: bare id);
//   cleanGaps   = storm columns whose picture got fully past the plane's tail with 0 storm pixels on the plane while
//                 level (physics stormPixelsHit), none of it under the breather or autopilot;
//   noFlyPassed = no-fly columns fully past the tail, same exclusion.
// Comet with Tree Planting 2 + Soil 1, the gap-flying player (s = 0.85, and 0.8 on three skies where it survives a scrape), heat off,
// 9 flights to 12,000 km. Power checks: some scraped gaps, some no-fly zones passed, and a crash in a no-fly zone or a
// planted tree, so each planted defect has something to get wrong.
// Plain Node. PLANT=scrape | nofly | trees (FIELD_PLANTS in rules.js): must FAIL.  Run: node tests/sim-result-fields.cjs
(async () => {
  const R = await import('../src/sim/rules.js');
  const { createWorld } = await import('../src/sim/world.js');
  const { makePlayer } = await import('../src/sim/player.js');
  const P = await import('../src/sim/physics.js');
  const { PLANE, CLIMATE } = await import('../src/config.js');
  if (process.env.PLANT) R.FIELD_PLANTS[process.env.PLANT] = true;
  CLIMATE.dangerLine = Infinity;
  const fails = [], power = { scraped: 0, nofly: 0, nfCrash: 0, trees: 0 }, rows = [];
  // Skies 1-6 at s = 0.85; skies 2, 6 and 9 again at s = 0.8, where a forgiven nick is survived (scanned 2026-10-27:
  // s = 0.8 survived a scrape in skies 2, 6, 9, 15, 27, 28 of 40; s = 0.9 in none).
  // GATE form (tools/gate.sh sets GATE=1): sky 6 at 0.85 (the no-fly crash) and the three s = 0.8 scrape skies; every power check below still has its case.
  const CASES = process.env.GATE ? [[6, 0.85], [2, 0.8], [6, 0.8], [9, 0.8]] : [[1, 0.85], [2, 0.85], [3, 0.85], [4, 0.85], [5, 0.85], [6, 0.85], [2, 0.8], [6, 0.8], [9, 0.8]];
  for (const [seed, skill] of CASES) {
    const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: { trees: 2, soil: 1 }, planted: {},
      fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, simSeed: seed };
    const w = createWorld(save, seed);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.nextAirport.worldX = 1e12;
    const before = JSON.stringify([w.save.planted || {}, w.save.plantedIn || {}]);
    const pl = makePlayer({ skill, careful: true, budget: 0.5, seed });
    const mine = new Map();   // storm -> { scraped, helped, done }
    let clean = 0, nf = 0;
    for (let i = 0; i < 400000 && w.state === 'playing' && w.distancePx < 12000; i++) {
      if (pl.wantsFlap(w)) w.applyFlap();
      if (w.parcels > 0) { const x = w.predictLanding(), p = w.plots.find(q => !q.used && !q.aimed && x >= q.x + 4 && x <= q.x + w.kit.plotW - 4); if (p) { p.aimed = true; w.dropParcel(); } }
      // The test's own bookkeeping, before the frame moves (as the rules count, in step()).
      const tail = w.plane.x - PLANE.spriteOffX, nose = tail + PLANE.spriteW, helped = w.inGrace() || w.onAutopilot();
      for (const s of w.storms) {
        const r = s.rects[0]; if (r.x > nose) continue;
        const m = mine.get(s) || { scraped: false, helped: false, done: false }; mine.set(s, m);
        if (m.done) continue;
        if (helped) m.helped = true;
        if (!s.noFly && !helped && P.stormPixelsHit(w, s, 1, () => P.planePixels(w)) > 0) m.scraped = true;
        if (r.x + r.width < tail) { m.done = true; if (!m.helped) { if (s.noFly) nf++; else if (!m.scraped) clean++; } }
      }
      w.step(16.67 / 1000);
    }
    if (w.state === 'playing') w.finish({ reason: 'test end' });
    const r = w.result;
    for (const m of mine.values()) if (m.scraped) power.scraped++;
    power.nofly += nf; if (/Restricted/.test(r.reason || '')) power.nfCrash++;
    // Trees the save gained this flight, land-tagged (UK bare), in no particular order.
    const [p0, i0] = JSON.parse(before), gained = [];
    for (const [id, n] of Object.entries(w.save.planted || {})) if (n > (p0[id] || 0)) gained.push(id);
    for (const [land, book] of Object.entries(w.save.plantedIn || {})) for (const [id, n] of Object.entries(book)) if (n > ((i0[land] || {})[id] || 0)) gained.push(`${land}:${id}`);
    power.trees += gained.length;
    const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
    rows.push(`${seed}@${skill}: ${Math.round(w.distancePx)} km ${(r.reason || '').split('\n')[0]} trees ${r.treeIds.join('+') || '-'} clean ${r.cleanGaps}/${clean} nofly ${r.noFlyPassed}/${nf}`);
    if (!Array.isArray(r.treeIds) || !same(r.treeIds, gained)) fails.push(`seed ${seed}@${skill}: treeIds ${JSON.stringify(r.treeIds)} != planted ${JSON.stringify(gained)}`);
    if (r.cleanGaps !== clean) fails.push(`seed ${seed}@${skill}: cleanGaps ${r.cleanGaps} != ${clean}`);
    if (r.noFlyPassed !== nf) fails.push(`seed ${seed}@${skill}: noFlyPassed ${r.noFlyPassed} != ${nf}`);
  }
  if (!(power.scraped > 0 && power.nofly > 0 && power.nfCrash > 0 && power.trees > 0)) fails.push(`no power: ${JSON.stringify(power)} (want scraped gaps, no-fly passes, a no-fly crash and planted trees)`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ') + '\n  ' + rows.join('\n  ')); process.exit(1); }
  console.log(`PASS: treeIds, cleanGaps and noFlyPassed match the frames in ${CASES.length} flights (${JSON.stringify(power)})\n  ` + rows.join('\n  '));
})();
