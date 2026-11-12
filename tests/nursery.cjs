// THE NURSERY: saplings and growth (src/groves.js; TREES V2 step 2). Plain Node. A planted tree is a SAPLING; every banked flight (landed or crashed) after the planting flight gives it one point; it is grown when it has the points
// its nursery asks (10 with none, 8 with the hangar nursery's first level, 6 with its second): a tree planted in flight f is grown at the end of flight f + need; the planting flight's own point is not counted; planted = grown + growing always;
// only GROWN trees are in the scenery; the real engine plants a sapling and banks the growth. Plants: tools/plants.tsv, test `nursery`. Run: node tests/nursery.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const G = await import('../src/groves.js'), N = await import('../src/nature.js');
  const cell = (s, land, id) => ((s.groves || {})[land] || {})[id] || { planted: 0, grown: 0, saplings: [] };
  const flights = (s, n, need) => { for (let i = 0; i < n; i++) G.growGroves(s, need); };
  // 1. the need by nursery level
  check(G.needFromGrow(1) === 10 && G.needFromGrow(0.7) === 8 && G.needFromGrow(0.5) === 6, `the need: none 10, level 1 (grow 0.7) 8, level 2 (grow 0.5) 6: ${[1, 0.7, 0.5].map(G.needFromGrow)}`);
  // 2. a tree planted in flight f is grown at the end of flight f + need (the planting flight's own point is not counted)
  for (const need of [10, 8, 6]) {
    const s = { planted: {}, plantedIn: {} }; G.plantTree(s, 'woodland', 'oak'); G.plantTree(s, 'woodland', 'oak');   // planted in flight f
    G.growGroves(s, need);                                                                                             // the end of flight f: no point yet
    check(cell(s, 'woodland', 'oak').planted === 2 && cell(s, 'woodland', 'oak').grown === 0 && cell(s, 'woodland', 'oak').saplings.length === 2 && cell(s, 'woodland', 'oak').saplings.every(x => x.points === 0 && x.fresh === false), `need ${need}: after the planting flight the saplings have no point: ${JSON.stringify(cell(s, 'woodland', 'oak'))}`);
    flights(s, need - 1, need); check(cell(s, 'woodland', 'oak').grown === 0, `need ${need}: still growing at the end of flight f + ${need - 1}: ${JSON.stringify(cell(s, 'woodland', 'oak'))}`);
    flights(s, 1, need); check(cell(s, 'woodland', 'oak').grown === 2 && cell(s, 'woodland', 'oak').saplings.length === 0, `need ${need}: grown at the end of flight f + ${need}: ${JSON.stringify(cell(s, 'woodland', 'oak'))}`);
  }
  // 3. batches planted a flight apart grow up a flight apart (a ramp, not a step)
  { const s = {}, need = 8; G.plantTree(s, 'woodland', 'spruce'); G.growGroves(s, need); G.plantTree(s, 'woodland', 'spruce'); G.growGroves(s, need);   // A in flight f, B in f+1
    flights(s, need - 1, need); const atA = cell(s, 'woodland', 'spruce').grown; flights(s, 1, need); const atB = cell(s, 'woodland', 'spruce').grown;
    check(atA === 1 && atB === 2, `the batch planted one flight later is grown one flight later: ${atA} then ${atB}`); }
  // 4. the nursery status the NATURE page shows
  { const s = {}; for (let i = 0; i < 3; i++) G.plantTree(s, 'savanna', 'acacia'); G.growGroves(s, 8); flights(s, 5, 8);
    const st = G.nurseryStatus(s, 'savanna', 8), none = G.nurseryStatus(s, 'tundra', 8);
    check(st.growing === 3 && st.nextIn === 3 && none.growing === 0 && none.nextIn === null, `3 saplings, 5 flights in, need 8: next in 3 flights: ${JSON.stringify(st)} / ${JSON.stringify(none)}`); }
  // 5. the invariants over a long pseudo-random history: planted = grown + growing, nothing ever shrinks, the old keys mirror planted
  { const s = { planted: { spruce: 2 }, plantedIn: { desert: { acacia: 1 } } }; let seed = 12345, last = {};
    const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
    for (let i = 0; i < 400; i++) {
      if (rnd(3) === 0) G.plantTree(s, ['woodland', 'desert', 'savanna'][rnd(3)], ['spruce', 'oak', 'acacia'][rnd(3)]);
      G.growGroves(s, [10, 8, 6][rnd(3)]);
      for (const [land, L] of Object.entries(s.groves)) for (const [id, c] of Object.entries(L)) {
        const k = `${land}/${id}`, p = last[k] || { planted: 0, grown: 0 };
        if (c.planted !== c.grown + c.saplings.length) { check(false, `step ${i}: ${k} planted ${c.planted} != grown ${c.grown} + growing ${c.saplings.length}`); i = 1e9; break; }
        if (c.planted < p.planted || c.grown < p.grown) { check(false, `step ${i}: ${k} shrank`); i = 1e9; break; }
        const mirror = land === 'woodland' ? s.planted[id] : s.plantedIn[land][id]; if (mirror !== c.planted) { check(false, `step ${i}: ${k} mirror ${mirror} != planted ${c.planted}`); i = 1e9; break; }
        last[k] = { planted: c.planted, grown: c.grown };
      } } }
  // 6. grownBook vs treeBook; an old save has no saplings and growth changes nothing
  { const s = { planted: { spruce: 3 } }; G.plantTree(s, 'woodland', 'oak');
    check(JSON.stringify(G.treeBook(s, 'woodland')) === JSON.stringify({ spruce: 3, oak: 1 }) && JSON.stringify(G.grownBook(s, 'woodland')) === JSON.stringify({ spruce: 3 }), `treeBook counts planted (with the sapling), grownBook only grown: ${JSON.stringify([G.treeBook(s, 'woodland'), G.grownBook(s, 'woodland')])}`);
    const old = { planted: { spruce: 3, birch: 2 }, plantedIn: { desert: { acacia: 4 } } }; G.growGroves(old, 8);
    check(G.treesPlantedTotal(old) === 9 && G.grownBook(old, 'woodland').spruce === 3 && Object.values(old.groves).every(L => Object.values(L).every(c => c.saplings.length === 0)), 'an old save: every tree grown, growth changes nothing'); }
  // 7. only GROWN trees are in the scenery
  { const s = { planted: {}, plantedIn: {}, areas: ['weurope'], habitat: {} }; G.plantTree(s, 'woodland', 'oak');
    const kinds = () => N.wildlifeScene(s, 'woodland').treeKinds;
    check(!kinds().includes('oak'), `a sapling is not in the scenery: ${kinds()}`);
    flights(s, 9, 8); check(kinds().includes('oak'), `the grown oak is in the scenery: ${kinds()}`); }
  // 8. the real engine: a parcel that lands on soil plants a SAPLING, and banking the flight does not grow the tree planted in it; the next flight does
  { const W = await import('../src/sim/world.js'), { fresh } = { fresh: () => ({}) };
    const save = { areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', tutorialDone: true, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, levels: { trees: 1 } };
    const w = W.createWorld(save, 1); for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.plots.push({ x: 100, used: false }); w.parcelLanded(101, 'spruce', 'woodland');
    const c1 = cell(w.save, 'woodland', 'spruce');
    check(c1.planted === 1 && c1.grown === 0 && c1.saplings.length === 1 && c1.saplings[0].fresh === true, `the engine planted a fresh sapling: ${JSON.stringify(c1)}`);
    w.bankFlight({ landed: false, reason: 'test' });
    const c2 = cell(w.save, 'woodland', 'spruce');
    check(c2.saplings.length === 1 && c2.saplings[0].points === 0 && c2.saplings[0].fresh === false, `banking the planting flight gives the sapling no point: ${JSON.stringify(c2)}`);
    G.growGroves(w.save, 10); check(cell(w.save, 'woodland', 'spruce').saplings[0].points === 1, 'the next flight gives it its first point'); }
  console.log(fails.length ? `FAIL nursery:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : 'PASS nursery: saplings grow one point per banked flight after the planting flight and are grown at f + 10, 8 or 6; planted = grown + growing; only grown trees are in the scenery; the engine plants a sapling');
  process.exit(fails.length ? 1 : 0);
})();
