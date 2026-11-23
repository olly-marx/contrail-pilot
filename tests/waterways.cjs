// WATERWAYS (0.73.0; Oliver 2026-11-23, plan https://claude.ai/artifact/V6LViLcX23qAiG7kQXb983; src/waterways.js, src/nature.js, src/sim/rules.js). Plain Node. Named lines:
//  1. every land with a meter has a water share; Polynesia is mostly water, the desert mostly land; the meter of a land with every LAND project and its trees at the cap reads its land share;
//  2. the tree cap is smaller where water dominates (Polynesia under 9, the UK 9);
//  3. the water part: drops fill half, water projects the other half; the meter adds the two by their shares;
//  4. water projects stay shut until the land's biome is full, land projects open by the LAND part;
//  5. in flight, a full biome makes the targets WATER targets, a water drop on one counts in save.waterBook and raises the water part; a miss counts nothing;
//  6. each funded water project pays YIELD_PER_PROJECT seeds on a landing.
// Plants (tools/plants.tsv): the water part ignored in the meter; water projects open before the biome is full; a water drop never counts. Run: node tests/waterways.cjs
(async () => {
  const W = await import('../src/waterways.js'), N = await import('../src/nature.js'), H = await import('../src/habitats.js'), G = await import('../src/groves.js');
  const L = await import('../src/landtrees.js'), { createWorld } = await import('../src/sim/world.js'), CF = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const lands = Object.keys(H.REGION_DATA);
  // 1.
  check(lands.every(r => W.waterShare(r) > 0 && W.waterShare(r) < 100), `every land has a water share: ${lands.filter(r => !(W.waterShare(r) > 0)).join(',')}`);
  check(W.waterShare('polynesia') >= 70 && W.waterShare('desert') <= 10 && W.waterShare('woodland') === 40, 'Polynesia mostly water, the desert mostly land, the UK 40');
  const full = r => { const s = { habitat: { [r]: H.REGION_DATA[r].projects.filter(p => !W.isWaterProject(r, p.id)).map(p => p.id) }, areas: [] };
    for (const slot of [0, 1, 2, 3, 4]) { const id = N.localTree(N.UK_SLOTS[slot], r).id; for (let i = 0; i < L.capOf(r); i++) G.plantTree(s, r === 'woodland' ? 'woodland' : r, id); }
    for (const g of Object.values(s.groves || {})) for (const t of Object.values(g)) { t.grown = t.planted; t.saplings = []; }
    return s; };
  for (const r of ['woodland', 'polynesia', 'desert', 'mediterranean']) { const s = full(r), P = N.biodiversityParts(s, r);
    check(P.land >= 95 && Math.abs(P.total - W.landShare(r)) <= 2, `${r}: every land project and full trees: land ${P.land}, total ${P.total}, want about the land share ${W.landShare(r)}`); }
  // 2.
  check(L.capOf('polynesia') < 9 && L.capOf('polynesia') >= 3 && L.capOf('woodland') === 9, `tree caps: Polynesia ${L.capOf('polynesia')}, UK ${L.capOf('woodland')}`);
  // 3.
  const kinds = W.dropsOf('polynesia'), wp = H.REGION_DATA.polynesia.projects.filter(p => W.isWaterProject('polynesia', p.id));
  check(W.waterMeter('polynesia', Object.fromEntries(kinds.map(k => [k.id, W.DROP_CAP])), [], H.REGION_DATA.polynesia.projects) === 50, 'every drop kind at its cap: the water part is 50');
  check(W.waterMeter('polynesia', {}, wp.map(p => p.id), H.REGION_DATA.polynesia.projects) === 50, 'every water project: the water part is 50');
  { const dry = full('polynesia'), wet = { ...full('polynesia'), waterBook: { polynesia: Object.fromEntries(kinds.map(k => [k.id, W.DROP_CAP])) } };
    check(N.biodiversity(wet, 'polynesia') >= N.biodiversity(dry, 'polynesia') + 30, `the meter counts the water: dry ${N.biodiversity(dry, 'polynesia')}, every drop in ${N.biodiversity(wet, 'polynesia')}`); }
  check(W.combine('polynesia', 100, 100) === 100 && W.combine('polynesia', 100, 0) === W.landShare('polynesia'), 'the meter adds the parts by their shares');
  // 4.
  const p0 = { ...full('polynesia'), seeds: 1e9, crystals: 1e9 }, wid = wp[0].id;
  const notFull = { habitat: {}, seeds: 1e9, crystals: 1e9 };
  check(!N.projectOpen(notFull, 'polynesia', wp[0]) && !N.fundProject(notFull, 'polynesia', wid), 'a water project is shut before the biome is full');
  check(N.waterOpenHere(p0, 'polynesia') && N.projectOpen(p0, 'polynesia', wp.find(p => p.tier === 1) || wp[0]), 'with the biome full the first water project opens');
  // 5. flight
  const save = { ...full('polynesia'), fuel: 'kerosene', priceVersion: 3, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: { trees: 4 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const w = createWorld(save, 5); for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
  w.regionNow = 'polynesia'; w.frozen = false; w.parcels = 5;
  check(w.waterOpen(), 'the flight sees the water open over a full Polynesia');
  w.plots = []; w.addPlot(200, true); const before = N.waterPart(w.save, 'polynesia');
  w.dropParcel(); const p = w.parcelsFalling[w.parcelsFalling.length - 1];
  check(p && p.water && kinds.some(k => k.id === p.kind), `the drop is a water drop: ${JSON.stringify(p && [p.water, p.kind])}`);
  w.waterLanded(210, p.kind, 'polynesia');
  check(((w.save.waterBook || {}).polynesia || {})[p.kind] === 1 && N.waterPart(w.save, 'polynesia') > before, `a water drop on a water target counts: ${JSON.stringify(w.save.waterBook)} water part ${before} -> ${N.waterPart(w.save, 'polynesia')}`);
  w.dropParcel(); const q = w.parcelsFalling[w.parcelsFalling.length - 1]; w.waterLanded(600, q.kind, 'polynesia');
  check(((w.save.waterBook || {}).polynesia || {})[q.kind] === (q.kind === p.kind ? 1 : undefined), 'a miss counts nothing');
  // 6. yield
  const ys = { ...save, habitat: { ...save.habitat, polynesia: [...save.habitat.polynesia, wp[0].id, wp[1].id] } };
  const w2 = createWorld(ys, 6); for (let i = 0; i < 3000 && w2.state !== 'playing'; i++) w2.step(1 / 60);
  w2.distancePx = 3000; w2.landedAt = w2.path[1]; w2.finish({ landed: true });
  const yrow = (w2.result.earned || []).find(e => e.label === 'Water projects');
  check(yrow && yrow.n === 2 * W.YIELD_PER_PROJECT, `two water projects pay ${2 * W.YIELD_PER_PROJECT} on a landing: ${JSON.stringify(yrow)}`);
  // 7. NATURE placement: every water project of a land with water stands by or in it (src/water.js PLACE); the UK pond keeps its own slot (declared there).
  const WA = await import('../src/water.js'), off = [];
  for (const [land, ids] of Object.entries(W.WATER_PROJECTS)) if (WA.WATER[land]) for (const id of ids) if (!['water', 'shore'].includes(WA.PLACE[id]) && id !== 'pond') off.push(`${land}:${id}`);
  check(!off.length, `water projects placed on dry land in the NATURE field: ${off.join(', ')}`);
  if (fails.length) { console.log(`FAIL waterways:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS waterways: shares by land, smaller tree caps where water dominates, drops + projects fill the water half and half, water projects wait for a full biome, water drops count only on water, projects pay a yield');
})();
