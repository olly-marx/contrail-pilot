// A crossing flight scores NOTHING against missions (src/sim/rules.js bankFlight; the user's playtest of 0.30.2: "no mission UI/prizes during a crossing";
// the sim chat's research/CROSSING-SCORING-SIM.md measured it: income -1.5..-2.2%, no pacing change). Plain Node, the game's own engine, ~2 s.
// Two flights from the same save through createWorld + finish: an ORDINARY landing that would complete a mission (the positive control), and the same flight
// with save.flyCrossing set: no mission is done, none is paid, missionsDone is unchanged, the crossing itself is still reported. Plants: tools/plants.tsv.
(async () => {
  const { createWorld } = await import('../src/sim/world.js'), C = await import('../src/crossings.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, flights: 9, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], seeds: 0, crystals: 0, levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const fly = (save, seed = 1) => {
    const w = createWorld(save, seed);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false;
    w.nextAirport.worldX = 1e12; w.distancePx += 1200; w.cargo = 400; w.sunBlocked = 60; w.landedAt = w.path[1];   // (cargo 400 + shade 60: "Bring home seeds" and "Shade the Earth" are both met)
    w.finish({ landed: true });
    return w;
  };
  // Control: an ordinary landing completes missions and pays them.
  const s1 = base(), w1 = fly(s1), d1 = (w1.result.missions2 && w1.result.missions2.done) || [];
  check(d1.length >= 1 && s1.missionsDone.length > 5, `CONTROL: an ordinary landing completes a mission (else this test cannot fail): ${JSON.stringify([d1, s1.missionsDone.length])}`);
  // A crossing flight: the same everything, save.flyCrossing set.
  const s2 = base(), cr = C.available(s2)[0]; s2.flyCrossing = cr;
  check(!!cr, 'the fresh weurope save has a crossing to fly');
  const w2 = fly(s2), d2 = (w2.result.missions2 && w2.result.missions2.done) || [];
  check(!!w2.crossing, 'the world really flew the crossing (w.crossing is set)');
  check(d2.length === 0 && s2.missionsDone.length === 5, `a crossing flight scores no mission: done ${JSON.stringify(d2)}, missionsDone ${s2.missionsDone.length} (5 before)`);
  check(s2.seeds <= s1.seeds, `and pays no mission prize (seeds on the crossing ${s2.seeds} <= the ordinary landing ${s1.seeds})`);
  console.log(fails.length ? `FAIL crossingscore:\n - ${fails.join('\n - ')}` : 'PASS crossingscore: an ordinary landing completes missions; the same flight as a crossing scores none and pays none');
  process.exit(fails.length ? 1 : 0);
})();
