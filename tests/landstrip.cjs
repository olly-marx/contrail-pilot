// THE LAND STRIP (0.78.0; Oliver, 2026-11-24: the in-flight tree bars 'don't do anything ... we should replace them'; src/landstrip.js). Plain Node. Named lines:
//  1. a land with a meter: its short name, the tree bar counts the open kinds' trees up to the land's cap, the water bar the water drops up to DROP_CAP a kind;
//  2. done only with the trees AND the water full; the sea and the ice have no strip;
//  3. it agrees with the flight: landProgress(...).done equals the flight's landDone() with nothing in the air.
// Plants (tools/plants.tsv): the water ignored in 'done'; drops over the cap counted. Run: node tests/landstrip.cjs
(async () => {
  const S = await import('../src/landstrip.js'), W = await import('../src/waterways.js'), N = await import('../src/nature.js'), H = await import('../src/habitats.js'), G = await import('../src/groves.js'), L = await import('../src/landtrees.js');
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const r = 'polynesia', kinds = W.dropsOf(r);
  const full = () => { const s = { habitat: { [r]: H.REGION_DATA[r].projects.filter(p => !W.isWaterProject(r, p.id)).map(p => p.id) }, areas: [] };
    for (const slot of [0, 1, 2, 3, 4]) { const id = N.localTree(N.UK_SLOTS[slot], r).id; for (let i = 0; i < L.capOf(r); i++) G.plantTree(s, r, id); }
    for (const g of Object.values(s.groves || {})) for (const t of Object.values(g)) { t.grown = t.planted; t.saplings = []; }
    return s; };
  // 1.
  const empty = S.landProgress({ habitat: {}, areas: [] }, r);
  check(empty && empty.name === 'Polynesia' && empty.trees[0] === 0 && empty.trees[1] > 0 && empty.water[0] === 0 && empty.water[1] === kinds.length * W.DROP_CAP && !empty.done, `an empty land: ${JSON.stringify(empty)}`);
  const s = full(), t = S.landProgress(s, r);
  check(t.trees[0] === t.trees[1] && t.trees[1] === L.treesOpen(s, r).length * L.capOf(r), `trees full: the tree bar is full: ${JSON.stringify(t)}`);
  s.waterBook = { [r]: { [kinds[0].id]: W.DROP_CAP + 7 } };
  const w1 = S.landProgress(s, r);
  check(w1.water[0] === W.DROP_CAP && S.frac(w1.water) === 1 / kinds.length, `drops over the cap are not counted: ${JSON.stringify(w1)}`);
  // 2.
  check(!w1.done, 'trees full, water part full: not done');
  s.waterBook = { [r]: Object.fromEntries(kinds.map(k => [k.id, W.DROP_CAP])) };
  check(S.landProgress(s, r).done, 'trees and water full: done');
  check(S.landProgress(s, 'ocean') === null && S.landProgress(s, 'ice') === null && S.landProgress(s, undefined) === null, 'no strip over the sea, the ice or nowhere');
  // 3.
  const save = { ...full(), fuel: 'kerosene', priceVersion: 3, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: { trees: 4 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const w = createWorld(save, 5); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
  w.regionNow = r; w.parcelsFalling = []; w.waterPending = {}; w.dropped = {};
  for (const n of [0, W.DROP_CAP - 1, W.DROP_CAP]) { w.save.waterBook = { [r]: Object.fromEntries(kinds.map(k => [k.id, n])) };
    check(S.landProgress(w.save, r).done === w.landDone(), `strip and flight agree at ${n} drops a kind: strip ${S.landProgress(w.save, r).done}, flight ${w.landDone()}`); }
  if (fails.length) { console.log(`FAIL landstrip:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS landstrip: the land strip names the land, fills a tree bar to the open kinds\' caps and a water bar to DROP_CAP a kind, says done only with both full, and agrees with the flight');
})();
