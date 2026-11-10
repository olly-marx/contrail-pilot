// ONE TREE RECORD FOR EVERY LAND (src/groves.js; TREES V2 step 1). Plain Node. The old keys (save.planted = the UK, save.plantedIn[land]) are folded into save.groves with nothing lost: counts, kinds and the total the game
// asks everywhere (treesPlanted) are exactly the old numbers; plantTree writes the groves and mirrors the old keys; the larger count per kind wins when an older game's save disagrees; the records tags and the biodiversity
// meter read the same trees. Plants: tools/plants.tsv, test `groves`. Run: node tests/groves.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const G = await import('../src/groves.js'), T = await import('../src/treecount.js'), N = await import('../src/nature.js'), RC = await import('../src/records.js');
  const old = () => ({ planted: { spruce: 3, birch: 2 }, plantedIn: { mediterranean: { 'aleppo-pine': 4, olive: 1 }, savanna: { acacia: 2 } } });
  const total = s => Object.values(s.planted || {}).reduce((a, n) => a + n, 0) + Object.values(s.plantedIn || {}).reduce((a, b) => a + Object.values(b).reduce((x, n) => x + n, 0), 0);
  // 1. the migration keeps every kind in every land
  const a = old(), before = JSON.stringify(a), v = G.groveView(a);
  check(JSON.stringify(a) === before, 'groveView does not touch the save');
  const at = (g, l, id) => ((g[l] || {})[id] || {}).planted;
  check(at(v, 'woodland', 'spruce') === 3 && at(v, 'woodland', 'birch') === 2 && at(v, 'mediterranean', 'aleppo-pine') === 4 && at(v, 'mediterranean', 'olive') === 1 && at(v, 'savanna', 'acacia') === 2, `every old count is in the groves: ${JSON.stringify(v)}`);
  check(Object.values(v).every(L => Object.values(L).every(c => c.grown === c.planted && Array.isArray(c.saplings))), 'step 1: every existing tree counts as fully grown');
  check(G.treesPlantedTotal(a) === 12 && T.treesPlanted(a) === 12 && total(a) === 12, `the total is the old total: ${G.treesPlantedTotal(a)} / ${T.treesPlanted(a)}`);
  check(JSON.stringify(G.treeBook(a, 'woodland')) === JSON.stringify({ spruce: 3, birch: 2 }) && JSON.stringify(G.treeBook(a, 'savanna')) === JSON.stringify({ acacia: 2 }) && JSON.stringify(G.treeBook(a, 'tundra')) === '{}', 'treeBook gives a land\'s kinds and an empty land gives {}');
  check(JSON.stringify(G.groveLands(a).sort()) === JSON.stringify(['mediterranean', 'savanna', 'woodland']), `the lands with trees: ${G.groveLands(a)}`);
  // 2. ensureGroves is idempotent and keeps the old keys (a safety copy for one release)
  const b = old(); G.ensureGroves(b); const once = JSON.stringify(b.groves); G.ensureGroves(b);
  check(JSON.stringify(b.groves) === once && JSON.stringify(b.planted) === JSON.stringify(old().planted) && JSON.stringify(b.plantedIn) === JSON.stringify(old().plantedIn), 'ensureGroves twice gives the same groves and leaves the old keys alone');
  // 3. an older game's save with MORE trees wins per kind (the larger count), the rest is kept
  const c = old(); G.ensureGroves(c); c.planted.spruce = 5; c.plantedIn.savanna.acacia = 1; c.plantedIn.desert = { 'date-palm': 2 };
  const vc = G.groveView(c);
  check(at(vc, 'woodland', 'spruce') === 5 && at(vc, 'savanna', 'acacia') === 2 && at(vc, 'desert', 'date-palm') === 2 && ((vc.woodland || {}).spruce || {}).grown === 5, `the larger count wins per kind and a land only the old key knows is added: ${JSON.stringify(vc)}`);
  // 4. plantTree: one more tree in a land, groves and the mirror
  const d = old();
  check(G.plantTree(d, 'woodland', 'oak') === 1 && G.plantTree(d, 'woodland', 'spruce') === 4 && G.plantTree(d, 'savanna', 'acacia') === 3 && G.plantTree(d, 'tundra', 'larch') === 1, 'plantTree returns the new count of that kind in that land');
  check(d.planted.oak === 1 && d.planted.spruce === 4 && d.plantedIn.savanna.acacia === 3 && d.plantedIn.tundra.larch === 1, `the old keys mirror the groves: ${JSON.stringify([d.planted, d.plantedIn])}`);
  check(d.groves.woodland.spruce.planted === 4 && d.groves.woodland.spruce.grown === 3 && d.groves.woodland.spruce.saplings.length === 1 && T.treesPlanted(d) === 16, `a planted tree is a SAPLING (the 3 old ones stay grown): ${JSON.stringify(d.groves.woodland.spruce)}, total ${T.treesPlanted(d)} (want 16)`);
  // 5. nothing else of a save is touched and bad data does not throw
  check(G.treesPlantedTotal(null) === 0 && G.treesPlantedTotal({}) === 0 && G.treesPlantedTotal({ planted: 'x', plantedIn: [1], groves: 5 }) === 0 && T.treesPlanted(undefined) === 0, 'a missing or malformed record counts as zero trees and does not throw');
  // 6. the readers that used the old keys give the same answers: the meter, the plant gain, the records tags
  const e = { planted: { spruce: 3, birch: 2 }, plantedIn: { mediterranean: { 'aleppo-pine': 4 } }, habitat: {}, areas: ['weurope'] };
  const bioOld = N.biodiversity(e, 'woodland'), bioMed = N.biodiversity(e, 'mediterranean');
  const f = JSON.parse(JSON.stringify(e)); G.ensureGroves(f);
  check(N.biodiversity(f, 'woodland') === bioOld && N.biodiversity(f, 'mediterranean') === bioMed, `the biodiversity meter is the same after the migration: ${N.biodiversity(f, 'woodland')} vs ${bioOld}`);
  check(JSON.stringify(RC.treeTags(f).sort()) === JSON.stringify(['birch', 'mediterranean:aleppo-pine', 'spruce']), `the records tags are unchanged (UK kinds plain, other lands land:id): ${RC.treeTags(f)}`);
  check(N.plantGainHere(f, 'mediterranean', 'aleppo-pine') > 0 && N.plantGain(f, 'oak') > 0, 'what one more tree adds is still worked out');
  // 7. A REAL PLAYER'S SAVE (an anonymous copy of the user's tester's: tests/fixtures/trees-save.json, trees, habitat and areas only): every count, the meter and the records tags are IDENTICAL before and after the migration, and equal the old keys' own numbers.
  const fs = require('fs'), path = require('path'), file = path.join(__dirname, 'fixtures', 'trees-save.json');
  check(fs.existsSync(file), 'the fixture tests/fixtures/trees-save.json is missing (a test that skips itself where its fixture is missing cannot fail)');
  if (fs.existsSync(file)) {
    const real = JSON.parse(fs.readFileSync(file, 'utf8')), legacy = JSON.stringify([real.planted, real.plantedIn]);
    const WANT = { woodland: 74, mediterranean: 102, tundra: 7, boreal: 43, plains: 63, desert: 52, rainforest: 25 };   // the old keys' sums, worked out by hand from the fixture
    const snap = s => ({ lands: Object.fromEntries(Object.keys(WANT).map(l => [l, G.treeBook(s, l)])), total: T.treesPlanted(s), meters: Object.fromEntries(Object.keys(WANT).map(l => [l, N.biodiversity(s, l)])), tags: RC.treeTags(s).sort() });
    const b0 = snap(real), mig = JSON.parse(JSON.stringify(real)); G.ensureGroves(mig); const a0 = snap(mig), a1 = snap(JSON.parse(JSON.stringify(mig)));
    check(JSON.stringify(b0) === JSON.stringify(a0) && JSON.stringify(a0) === JSON.stringify(a1), `the real save counts the same before and after the migration (and after a save round trip): ${JSON.stringify(b0.meters)} vs ${JSON.stringify(a0.meters)}`);
    for (const [land, want] of Object.entries(WANT)) check(Object.values(a0.lands[land]).reduce((x, n) => x + n, 0) === want, `${land}: ${Object.values(a0.lands[land]).reduce((x, n) => x + n, 0)} trees (the old keys say ${want})`);
    check(a0.total === 366, `the whole save's tree total is 366: ${a0.total}`);
    check(JSON.stringify([mig.planted, mig.plantedIn]) === legacy, 'the old keys are left exactly as they were');
    check(Object.values(mig.groves).every(L => Object.values(L).every(c => c.grown === c.planted && c.saplings.length === 0)), 'every tree of the real save counts as fully grown');
    check(a0.tags.length === 26 && a0.tags.includes('spruce') && a0.tags.includes('mediterranean:aleppopine') && a0.tags.includes('boreal:aspen'), `the records tags are the kinds planted (UK plain, other lands land:id): ${a0.tags.length}`);
  }
  console.log(fails.length ? `FAIL groves:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : 'PASS groves: every old tree count is in the one record, the totals and the meter and the records tags are unchanged, plantTree mirrors the old keys, the larger count wins');
  process.exit(fails.length ? 1 : 0);
})();
