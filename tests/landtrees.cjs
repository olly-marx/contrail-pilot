// Trees belong to their land (research/PROPOSAL-TREES.md, the tree rework). No browser.
// 1. each native slot opens on ITS land's rule only; 2. a parcel plants only open trees of the land it was dropped
// over; 3. the forest counts SPECIES (local ids), not UK slots; 4. the hangar sells planting tools, not tree kinds;
// 5. in flight a land shows only its plantation tree + what you planted there; 6. "Oak 4/9" counts.
// Run: node tests/landtrees.cjs   (proved by planted defects, see CHANGES.json)
(async () => {
  const L = await import('../src/landtrees.js'), N = await import('../src/nature.js'), U = await import('../src/upgrades.js');
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const base = { levels: {}, planted: {}, plantedIn: {}, habitat: {}, found: {} };
  const { REGION_DATA } = await import('../src/habitats.js');
  const proj = land => REGION_DATA[land].projects[0];

  // 1. Opening rules, per land.
  check(eq(L.treesOpen(base, 'savanna'), [0]), `fresh: only the plantation tree (${L.treesOpen(base, 'savanna')})`);
  check(eq(L.treesOpen(base, 'ocean'), []) && eq(L.treesOpen(base, 'ice'), []), 'no trees on the sea or the ice');
  const p1 = { ...base, habitat: { savanna: [proj('savanna').id] } };
  check(L.treesOpen(p1, 'savanna').includes(1), 'a project in the savanna opens its native 1');
  check(!L.treesOpen(p1, 'mediterranean').includes(1) && !L.treesOpen(p1, 'woodland').includes(1), "...and not another land's");
  for (const land of ['woodland', 'savanna', 'mediterranean']) {
    const bio = s => N.biodiversity(s, land), open = s => L.treesOpen(s, land);
    // plant trees until the meter passes 20 then 40; the slot must open exactly when the meter crosses
    const s = structuredClone(base), book = land === 'woodland' ? s.planted : (s.plantedIn[land] = {});
    const ids = L.landTrees(s, land).map(t => t.id);
    let ok = true;
    for (let i = 0; i < 60 && bio(s) < 45; i++) {
      book[ids[i % 5]] = (book[ids[i % 5]] || 0) + 1;
      ok = ok && open(s).includes(2) === (bio(s) >= 20) && open(s).includes(4) === (bio(s) >= 40);
    }
    check(ok, `${land}: natives 2 and 4 open exactly at biodiversity 20 and 40`);
    const animals = N.regionSpecies(land).slice(0, 5).map(w => w.id), f = {};
    animals.slice(0, 4).forEach(id => f[id] = 1);
    check(!open({ ...base, found: f }).includes(3), `${land}: 4 animals found: native 3 still shut`);
    f[animals[4]] = 1;
    check(open({ ...base, found: f }).includes(3), `${land}: 5 animals found: native 3 opens`);
  }

  // 2 + 3. Planting in a flight (the sim engine, the game's rules).
  const save = { ...base, levels: { trees: 4 }, landings: 30, tutorialDone: true, habitat: { savanna: [proj('savanna').id] } };
  const w = createWorld(save, 1);
  const kinds = [];
  for (const region of ['savanna', 'mediterranean']) {
    w.regionNow = region;
    for (let i = 0; i < 6; i++) { const k = w.treeKind(); kinds.push([region, k]); w.speciesIdx++; }
  }
  const slots = (r) => [...new Set(kinds.filter(k => k[0] === r).map(k => N.UK_SLOTS.indexOf(k[1])))].sort();
  check(eq(slots('savanna'), [0, 1]), `savanna parcels cycle its open trees 0 and 1 (${slots('savanna')})`);
  check(eq(slots('mediterranean'), [0]), `mediterranean parcels: only its plantation tree (${slots('mediterranean')})`);
  // two lands, the same slot 0: two different species
  w.plots.push({ x: 1000, used: false }, { x: 2000, used: false });
  w.parcelLanded(1001, 'spruce', 'savanna'); w.parcelLanded(2001, 'spruce', 'mediterranean');
  check(w.speciesPlanted.size === 2, `slot 0 in two lands = 2 kinds for the forest (${[...w.speciesPlanted]})`);
  check(JSON.stringify([...w.speciesTags]) === '["savanna:eucalyptus","mediterranean:aleppopine"]', `boards get each tree with its land: ${[...w.speciesTags]}`);
  check((w.save.plantedIn.savanna || {}).eucalyptus === 1 && (w.save.plantedIn.mediterranean || {}).aleppopine === 1, 'each counted in the land it was dropped over');

  // 4. The hangar.
  check(!U.lineById('species'), 'no Tree Species line in the hangar');
  check(['trees', 'soil', 'nursery'].every(id => U.lineById(id)), 'parcels, soil patches and the nursery remain');
  check(!('species' in (U.loadout({ levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, fuel: 'kerosene' }).tree || {})), 'the kit carries no bought tree kinds');

  // 5. What a land shows in flight.
  const seen = { ...base, planted: { spruce: 2, oak: 1 }, plantedIn: { savanna: { baobab: 1 } } };
  check(eq(N.wildlifeScene(seen, 'woodland').treeKinds, ['spruce', 'oak']), `UK: spruce + oak (${N.wildlifeScene(seen, 'woodland').treeKinds})`);
  check(eq(N.wildlifeScene(seen, 'savanna').treeKinds, ['eucalyptus', 'baobab']), `savanna: eucalyptus + baobab (${N.wildlifeScene(seen, 'savanna').treeKinds})`);
  check(eq(N.wildlifeScene(seen, 'mediterranean').treeKinds, ['aleppopine']), `mediterranean: only its plantation tree (${N.wildlifeScene(seen, 'mediterranean').treeKinds})`);

  // 6. Counts toward the cap.
  const ct = L.landTrees({ ...base, planted: { oak: 4, spruce: 11 } }, 'woodland');
  check(L.countText(ct[2]) === 'Oak 4/9' && L.countText(ct[0]) === 'Spruce 9/9 full', `counts: ${ct.map(L.countText)}`);

  console.log(fails.length ? `FAIL landtrees:\n - ${fails.join('\n - ')}` : 'PASS landtrees: trees open per land, parcels plant open trees, the forest counts species, the hangar sells tools');
  process.exit(fails.length ? 1 : 0);
})();
