// THE DROP ORDER (src/droporder.js, src/sim/rules.js treeKind/dropParcel/parcelLanded; TREES V2 step 3). Plain Node. The next tree dropped in a land is the OPEN kind with the FEWEST trees (planted, saplings and the parcels released but not yet landed
// counted); a kind at its cap of 9 is skipped; a tie goes to the lowest slot; nothing left means the grove is full (null). The engine: two drops in a row plant two different kinds, a landed parcel is no longer pending, a full grove keeps the tree.
// Plants: tools/plants.tsv, test `droporder`. Run: node tests/droporder.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const D = await import('../src/droporder.js'), L = await import('../src/landtrees.js'), N = await import('../src/nature.js'), G = await import('../src/groves.js');
  const base = () => ({ areas: ['weurope'], homeArea: 'weurope', tutorialDone: true, planted: {}, plantedIn: {}, habitat: { woodland: ['deadwood', 'meadow', 'margins', 'pond', 'hedgerow', 'woodland', 'voles'] },
    found: { rabbit: 1, fox: 1, buzzard: 1, robin: 1, swallow: 1, heron: 1 }, missionsDone: ['weurope:kinds3'] });
  const idOf = slot => N.localTree(N.UK_SLOTS[slot], 'woodland').id;
  const s0 = base(), open = L.treesOpen(s0, 'woodland');
  check(open.length >= 3, `power: this save opens ${open.length} kinds in the woodland (need 3 or more to test an order): ${open}`);
  // 1. the first drop is the kind with the fewest trees, the lowest slot on a tie
  check(D.nextTree(s0, 'woodland').slot === open[0], `an empty land starts with its lowest open slot: ${JSON.stringify(D.nextTree(s0, 'woodland'))}`);
  // 2. fewest first, with the parcels already released this flight counted: a run of drops spreads over the kinds
  { const s = base(), pending = {}, seq = []; for (let i = 0; i < open.length * 2; i++) { const n = D.nextTree(s, 'woodland', pending); seq.push(n.slot); pending[n.id] = (pending[n.id] || 0) + 1; }
    const counts = Object.values(pending), spread = Math.max(...counts) - Math.min(...counts);
    check(spread === 0 && new Set(seq.slice(0, open.length)).size === open.length, `${open.length * 2} drops give every kind two trees and the first ${open.length} are all different: ${seq}`); }
  // 3. the kind that already has many is not chosen again (no more spruce when it is overpopulated)
  { const s = base(); for (let i = 0; i < 8; i++) G.plantTree(s, 'woodland', idOf(open[0]));
    const n = D.nextTree(s, 'woodland'); check(n && n.slot !== open[0], `8 of the first kind planted: the next is another kind, not that one: ${JSON.stringify(n)}`); }
  // 4. a kind at its cap is skipped even when the others have as many
  { const s = base(); for (const sl of open) for (let i = 0; i < (sl === open[0] ? 9 : 5); i++) G.plantTree(s, 'woodland', idOf(sl));
    const n = D.nextTree(s, 'woodland'); check(n && n.slot !== open[0] && n.n === 5, `the full kind (9) is skipped: ${JSON.stringify(n)}`); }
  // 5. saplings count: they are planted trees
  { const s = base(); G.plantTree(s, 'woodland', idOf(open[0])); const n = D.nextTree(s, 'woodland'); check(n.slot !== open[0], `a sapling counts toward its kind: ${JSON.stringify(n)}`); }
  // 6. every open kind at the cap: the grove is full
  { const s = base(); for (const sl of open) for (let i = 0; i < 9; i++) G.plantTree(s, 'woodland', idOf(sl)); check(D.nextTree(s, 'woodland') === null, 'every open kind at 9: the grove is full (null)'); }
  // 7. deterministic, and the same in another land (its own tree names)
  check(JSON.stringify(D.nextTree(s0, 'woodland')) === JSON.stringify(D.nextTree(base(), 'woodland')), 'the same save gives the same answer (no random numbers)');
  { const s = base(), n = D.nextTree(s, 'savanna'); check(n && N.localTree(N.UK_SLOTS[n.slot], 'savanna').id === n.id && n.n === 0, `another land names its own tree: ${JSON.stringify(n)}`); }
  check(D.nextTree(base(), 'ocean') === null && D.nextTree(base(), 'ice') === null, 'the sea and the ice have no trees');
  check(D.shortName('Sessile oak') === 'SESSILE' && D.shortName('Oak') === 'OAK' && D.shortName('Strawberrytree extra') === 'STRAWBER', 'the button word is the first word, upper case, at most 8 letters');
  // 8. the real engine: two drops plant two different kinds; a landed parcel is no longer pending; a full grove keeps the tree
  { const W = await import('../src/sim/world.js');
    const save = { ...base(), city: 'LONDON', fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, levels: { trees: 3 } };
    const w = W.createWorld(save, 1); w.holding = true; for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);   // (holding: the engine waits on the runway until the HOLD, src/sim/rules.js takeoff; measured 2026-11-12: without it the world stays in 'takeoff' for ever)
    w.frozen = false; w.regionNow = 'woodland'; w.parcels = 4;
    w.dropParcel(); w.dropParcel();
    const kinds = w.parcelsFalling.map(p => p.kind);
    check(w.parcelsFalling.length === 2 && kinds[0] !== kinds[1] && w.parcels === 2, `two drops in a row release two different kinds: ${kinds} (parcels left ${w.parcels})`);
    const pend = Object.values(w.dropped).reduce((a, n) => a + n, 0); check(pend === 2, `two parcels are pending: ${JSON.stringify(w.dropped)}`);
    w.plots.push({ x: 100, used: false }); const p0 = w.parcelsFalling[0]; w.parcelLanded(101, p0.kind, p0.region);
    check(Object.values(w.dropped).reduce((a, n) => a + n, 0) === 1, `a landed parcel is no longer pending: ${JSON.stringify(w.dropped)}`);
    for (const sl of open) for (let i = 0; i < 9; i++) G.plantTree(w.save, 'woodland', idOf(sl)); w.dropped = {}; const before = w.parcels; w.dropParcel();
    check(w.parcels === before && w.parcelsFalling.length === 2, `a full grove keeps the tree: parcels ${w.parcels} (was ${before})`); }
  // 9. THE MISSION'S KIND (the user, 2026-11-11; src/droporder.js missionTag, DROP_ORDER.preferMission; the sim's second arm, research M-T7b): a preferred tag wins over fewest-first while its kind has room
  { const s = base(); for (let i = 0; i < 3; i++) G.plantTree(s, 'woodland', idOf(open[0]));   // open[0] has the MOST trees, so fewest-first alone would not pick it
    const tag0 = idOf(open[0]), n = D.nextTree(s, 'woodland', {}, tag0), m = D.nextTree(s, 'woodland', {});
    check(m.slot !== open[0] && n.slot === open[0], `a preferred kind wins over fewest-first (without the preference: slot ${m.slot}; with it: slot ${n.slot}, wanted ${open[0]})`);
    check(D.nextTree(s, 'woodland', {}, 'savanna:baobab').slot === m.slot, 'a tag that is not one of this land\'s open kinds changes nothing'); }
  // 10. the cap of 9 still wins over the preference
  { const s = base(); for (let i = 0; i < 9; i++) G.plantTree(s, 'woodland', idOf(open[0]));
    const n = D.nextTree(s, 'woodland', {}, idOf(open[0])); check(n && n.slot !== open[0], `a preferred kind at its cap of 9 is NOT chosen: ${JSON.stringify(n)}`); }
  // 11. the sim's switch: preferMission off = fewest-first only
  { const s = base(); for (let i = 0; i < 3; i++) G.plantTree(s, 'woodland', idOf(open[0])); D.DROP_ORDER.preferMission = false;
    const n = D.nextTree(s, 'woodland', {}, idOf(open[0])); D.DROP_ORDER.preferMission = true; check(n.slot !== open[0], `DROP_ORDER.preferMission = false ignores the preference: ${JSON.stringify(n)}`); }
  // 12. the engine: with a 'Plant a <tree>' mission open the first drop is that kind (the tag is read once at the start of the flight)
  { const W = await import('../src/sim/world.js'), Sv = await import('../src/save.js');
    const save = Object.assign(Sv.prepareSave(null), { ...base(), city: 'LONDON', homeCity: 'LONDON', visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }, levels: { trees: 3 } });
    const tag = D.missionTag(save);
    check(!!tag, `power: a save with the lessons done has an open plant-tree mission with a tree tag: '${tag}'`);
    if (tag) { for (let i = 0; i < 3; i++) for (const sl of open) if (idOf(sl) !== tag) G.plantTree(save, 'woodland', idOf(sl));   // every OTHER kind has 3 trees; the mission's kind has none: fewest-first would pick it anyway, so give it MORE
      for (let i = 0; i < 5; i++) G.plantTree(save, 'woodland', tag);
      const w = W.createWorld(save, 1); w.holding = true; for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);   // (holding: the engine waits on the runway until the HOLD, src/sim/rules.js takeoff; measured 2026-11-12: without it the world stays in 'takeoff' for ever)
      w.frozen = false; w.regionNow = 'woodland'; w.parcels = 4; w.dropParcel();
      const got = w.parcelsFalling[0] && w.parcelsFalling[0].kind;
      check(w.preferTag === tag && !!got, `the world read the mission's tag at the start of the flight (preferTag '${w.preferTag}', wanted '${tag}')`);
      check(!!got && N.localTree(got, 'woodland').id === tag, `the first drop plants the mission's kind although the other kinds have fewer trees: dropped '${got && N.localTree(got, 'woodland').id}', wanted '${tag}'`); } }
  console.log(fails.length ? `FAIL droporder:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : 'PASS droporder: the next tree is the open kind with the fewest trees (saplings and pending parcels counted), a full kind is skipped, a tie goes to the lowest slot, a full grove is null; the engine plants different kinds in a row and keeps the tree in a full grove');
  process.exit(fails.length ? 1 : 0);
})();
