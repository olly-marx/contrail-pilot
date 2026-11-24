// THE WATER LESSON (Plan C; Oliver, 2026-11-23: 'People need to be taught about water projects when they unlock their first, like back to school about it'). Plain Node:
//  1. the School board has a 'water' lesson; it stays locked while no land's water is open, opens (and is the current lesson) when the first land's trees are full, and is done by save.waterPractice;
//  2. its land is the one the player is in when that land's water is open;
//  3. in the lesson flight (a school with waterLand) drops are that land's water life wherever the plane is, a miss gives the drop back, and a hit is NOT written to the save.
// Plants (tools/plants.tsv, test `waterlesson`). Run: node tests/waterlesson.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const LS = await import('../src/lessons.js'), W = await import('../src/waterways.js'), N = await import('../src/nature.js'), H = await import('../src/habitats.js'), G = await import('../src/groves.js');
  const LT = await import('../src/landtrees.js'), { createWorld } = await import('../src/sim/world.js');
  const full = r => { const s = { habitat: { [r]: H.REGION_DATA[r].projects.filter(p => !W.isWaterProject(r, p.id)).map(p => p.id) }, areas: [] };
    for (const slot of [0, 1, 2, 3, 4]) { const id = N.localTree(N.UK_SLOTS[slot], r).id; for (let i = 0; i < LT.capOf(r); i++) G.plantTree(s, r === 'woodland' ? 'woodland' : r, id); }
    for (const g of Object.values(s.groves || {})) for (const t of Object.values(g)) { t.grown = t.planted; t.saplings = []; }
    return s; };
  // 1. The board.
  const wl = LS.BOARD.find(l => l.id === 'water');
  check(wl && wl.kind === 'practice', `the School board has a water practice lesson: ${JSON.stringify(wl && [wl.id, wl.kind])}`);
  const dry = { tutorialDone: true, school2: true, city: 'AUCKLAND' };
  check(!LS.waterLessonLand(dry) && !LS.lessonOpen(dry, wl), 'no water open anywhere: the water lesson is locked');
  const wet = { ...full('islandforest'), tutorialDone: true, school2: true, city: 'AUCKLAND' };
  check(LS.waterLessonLand(wet) === 'islandforest' && LS.lessonOpen(wet, wl) && !LS.lessonDone(wet, wl), `Island forest's trees full: the lesson opens on that land: ${LS.waterLessonLand(wet)}`);
  check(LS.lessonDone({ ...wet, waterPractice: true }, wl), 'save.waterPractice marks it done');
  // 2. Its land: the one you are in when its water is open, else the first with open water.
  const two = { ...full('islandforest'), tutorialDone: true, city: 'LONDON' };
  check(LS.waterLessonLand(two) === 'islandforest', `away from it, the lesson still finds the open water: ${LS.waterLessonLand(two)}`);
  // 3. The lesson flight.
  const save = { ...full('islandforest'), fuel: 'kerosene', priceVersion: 3, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: { trees: 4 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const w = createWorld(save, 7); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
  w.regionNow = 'woodland'; w.frozen = false; w.parcels = 3; w.school = { practice: true, waterLand: 'islandforest' };
  check(w.waterOpen() && w.dropLand() === 'islandforest', `in the lesson the drops are for the lesson's land wherever the plane is: open ${w.waterOpen()}, land ${w.dropLand()}`);
  w.plots = []; w.addPlot(200, true); w.dropParcel(); const d = w.parcelsFalling[w.parcelsFalling.length - 1];
  check(d && d.water && W.dropsOf('islandforest').some(k => k.id === d.kind), `the drop is Island forest water life: ${JSON.stringify(d && [d.water, d.kind])}`);
  const before = w.parcels; w.waterLanded(900, d.kind, 'islandforest');
  check(w.parcels === before + 1, `a miss in the lesson gives the drop back: ${before} -> ${w.parcels}`);
  w.dropParcel(); const e = w.parcelsFalling[w.parcelsFalling.length - 1]; const hits = w.waterDrops || 0; w.waterLanded(210, e.kind, 'islandforest');
  check((w.waterDrops || 0) === hits + 1 && !((w.save.waterBook || {}).islandforest), `a hit counts for the lesson and is not written to the save: drops ${w.waterDrops}, book ${JSON.stringify(w.save.waterBook || {})}`);
  if (fails.length) { console.log(`FAIL waterlesson:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS waterlesson: the board opens a water lesson with the first open water, on that land; its flight drops that land\'s water life, a miss gives it back, nothing is saved');
})();
