// THE TREE REBALANCE (ledger row 54, 2026-11-13; the user: "the cooling should be mostly coming from the nature you have in that biome, not the trees you drop mid flight",
// and "you cannot drop more trees here because the biome is full of that species, and it would reduce your biodiversity if you overpopulated a species").
// Plain Node. Checks:
//  K. kinds3 asks only for open kinds with ROOM under the cap of 9 (src/missions2.js fillFor), and is not offered when fewer than 2 have room;
//  S. slot 4 opens when slots 0..3 are all open and fewer than 2 have room (src/landtrees.js kindsStuck), and not before;
//  F. the Forester badge counts GROWN trees, at most 9 of a kind per land (src/groves.js treesGrownTotal, src/badges.js);
//  M. the biome meter counts grown trees only; the full meter still counts saplings (src/nature.js biomeMeter / biodiversity);
//  C. with BIOME_COOL.on, a grown mixed grove cools the flight, saplings do not, and three kinds beat one stacked kind (src/sim/rules.js);
//  W. the drop button's words when every open kind is full (src/droporder.js BIOME_FULL_LABEL / BIOME_FULL_POPUP).
// Plants: tools/plants.tsv, test `rebalance`. Run: node tests/rebalance.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const M = await import('../src/missions2.js'), L = await import('../src/landtrees.js'), N = await import('../src/nature.js'), G = await import('../src/groves.js');
  const B = await import('../src/badges.js'), T = await import('../src/treecount.js'), D = await import('../src/droporder.js'), C = await import('../src/config.js');
  const base = () => ({ areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', homeCity: 'LONDON', visited: ['LONDON'], tutorialDone: true, planted: {}, plantedIn: {},
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 3 }, landings: 20, flights: 20,
    habitat: { woodland: ['deadwood', 'meadow', 'margins', 'pond', 'hedgerow', 'woodland', 'voles'] }, found: { rabbit: 1, fox: 1, buzzard: 1, robin: 1, swallow: 1, heron: 1 } });
  const idOf = slot => N.localTree(N.UK_SLOTS[slot], 'woodland').id;
  const plant = (s, slot, n) => { for (let i = 0; i < n; i++) G.plantTree(s, 'woodland', idOf(slot)); };
  const grow = (s, slot, n) => { plant(s, slot, n); const c = s.groves.woodland[idOf(slot)]; c.grown = c.planted; c.saplings = []; };
  const kinds3 = s => M.visible(s, 'LONDON').some(v => v.def && v.def.id === 'kinds3');
  // THE SHIPPED SWITCHES (the user, 2026-11-13 'release all'; the sim chat's confirm report): BIOME_COOL, NATIVE_FIRST and STAR_GROW3 ON; GROWN_METER OFF (its timing is being reworked).
  check(C.STAR_GROW3.on === true, 'R5: STAR_GROW3 ships ON');
  check(C.NATIVE_FIRST.on === true, 'P5: NATIVE_FIRST ships ON');
  check(C.BIOME_COOL.on === true && C.BIOME_COOL.rate === 0.4, `C4: BIOME_COOL ships ON at rate 0.4 (${C.BIOME_COOL.on}, ${C.BIOME_COOL.rate})`);
  check(C.GROWN_METER.on === false, 'G4: GROWN_METER ships OFF');
  check(C.GROW_DAYS.on === true, 'DY9: GROW_DAYS ships ON (the user, 2026-11-13; research/grow-days-report.txt)');
  // Each block below sets the switch it tests; everything else runs with them OFF (the rules each block names).
  C.STAR_GROW3.on = false; C.NATIVE_FIRST.on = false; C.BIOME_COOL.on = false; C.GROW_DAYS.on = false;   // (first: every check below assumes the shipped switches)
  const open = L.treesOpen(base(), 'woodland');
  check(open.length >= 4 && [0, 1, 2, 3].every(s => open.includes(s)), `power: this save opens slots 0..3 in the woodland: ${open}`);

  // K. kinds3 counts kinds with room. (Tier 3 needs 3 done in tier 2 and 3 in tier 1: mark them.)
  const tiersDone = s => { const T2 = ['chain', 'rescue', 'dodge'], T1 = ['land2', 'shade', 'plant-tree']; s.missionsDone.push(...T1.map(t => `weurope:${t}`), ...T2.map(t => `weurope:${t}`)); return s; };
  { const s = tiersDone(base()); delete s.missionsDone[s.missionsDone.indexOf('weurope:kinds3')];
    const f = M.fillFor(s, 'weurope', 'LONDON');
    check(f.kinds === 3, `K1: empty groves with ${open.length} open kinds ask for 3 kinds: ${f.kinds}`);
    check(kinds3(s), 'K1: the kinds star is offered when 3 kinds have room');
    const s2 = tiersDone(base()); plant(s2, 0, 9); plant(s2, 1, 9);
    const f2 = M.fillFor(s2, 'weurope', 'LONDON'), room2 = L.landTrees(s2, 'woodland').filter(t => t.open && !t.full).length;
    check(f2.kinds === Math.min(3, room2), `K2: two full kinds: the star asks for the kinds with room (${f2.kinds}, room ${room2})`);
    const s3 = tiersDone(base()); for (const sl of [0, 1, 2, 3]) plant(s3, sl, 9);   // slots 0..3 full: slot 4 opens (S below) and is the ONE kind with room
    const f3 = M.fillFor(s3, 'weurope', 'LONDON'), open3 = L.treesOpen(s3, 'woodland');
    check(open3.includes(4) && f3.kindsRoom === 1 && !kinds3(s3), `K3: one kind with room: the star is NOT offered (open ${open3}, room ${f3.kindsRoom}, offered ${kinds3(s3)})`); }

  { const s4 = tiersDone(base()); for (const sl of [0, 1, 2, 3]) plant(s4, sl, 9); const was = D.DROP_ORDER.mode; D.DROP_ORDER.mode = 'off';
    try { const f4 = M.fillFor(s4, 'weurope', 'LONDON'); check(f4.kindsRoom >= 2 && kinds3(s4) && !L.OPENS[4].ok(s4, 'woodland'), `K4: drop order 'off' (no cap, the game before trees v2): full kinds still have room, kinds3 is offered, slot 4 is not opened by the stuck rule (room ${f4.kindsRoom}, offered ${kinds3(s4)})`); }
    finally { D.DROP_ORDER.mode = was; } }

  // R. STAR_GROW3 (the user, 2026-11-13: 'fully grow 3 trees'): kinds3 becomes 'Grow 3 trees in <land>', done on a landed flight once the land has 3 GROWN trees, offered even on a full land
  { const was = C.STAR_GROW3.on, RES = { landed: true, landedAt: 'PARIS', cargo: 0, sunBlocked: 0, planted: 0, airportsSkipped: 0, nightOwl: false, bumped: 0, goldens: 0, dodges: 0, cleanGaps: 0, noFlyPassed: 0, treeIds: [], foundIds: [] };
    const fly = (sv, r = RES) => M.onFlight(sv, { ...r }).some(m => m.key === 'weurope:kinds3');
    try {
      C.STAR_GROW3.on = true;
      const full = tiersDone(base()); for (const sl of [0, 1, 2, 3]) plant(full, sl, 9);
      const v = M.visible(full, 'LONDON').find(x => x.def && x.def.id === 'kinds3');
      check(!!v && /^Grow 3 trees in /.test(v.title), `R1: switch on, the star is offered on a full land as 'Grow 3 trees in ...': ${v && v.title}`);
      const two = tiersDone(base()); grow(two, 1, 2); plant(two, 2, 5);
      check(!fly(two), 'R2: 2 grown trees (and saplings) do not finish it');
      const three = tiersDone(base()); grow(three, 1, 2); grow(three, 2, 1);
      check(fly(three), 'R3: 3 grown trees of any kinds finish it on a landed flight');
      const crash = tiersDone(base()); grow(crash, 1, 3);
      check(!fly(crash, { ...RES, landed: false, landedAt: null }), 'R4: a crash finishes nothing');
    } finally { C.STAR_GROW3.on = was; } }

  // N. the sapling view (src/groves.js saplingsIn / newlyGrown / markGrownSeen): the HUD bar and the wild area's enclosure read these
  { const s = base(); plant(s, 1, 2); plant(s, 2, 1);
    G.growGroves(s, 10); G.growGroves(s, 10); G.growGroves(s, 10);   // the planting flight's own point is not counted: 2 points each
    const v = G.saplingsIn(s, 'woodland', 10);
    check(v.length === 3 && v.every(x => x.points === 2 && x.left === 8 && Math.abs(x.frac - 0.2) < 1e-9), `N1: three saplings, 2 of 10 points each, 8 flights to go: ${JSON.stringify(v)}`);
    check(JSON.stringify(G.newlyGrown(s, 'woodland')) === '{}', `N2: nothing grown yet, nothing to replant: ${JSON.stringify(G.newlyGrown(s, 'woodland'))}`);
    for (let i = 0; i < 8; i++) G.growGroves(s, 10);
    const ng = G.newlyGrown(s, 'woodland');
    check(ng[idOf(1)] === 2 && ng[idOf(2)] === 1 && G.saplingsIn(s, 'woodland', 10).length === 0, `N3: all three grew up and are waiting to be replanted: ${JSON.stringify(ng)}`);
    G.markGrownSeen(s, 'woodland');
    check(JSON.stringify(G.newlyGrown(s, 'woodland')) === '{}', 'N4: once the wild area has shown them, nothing is left to replant');
    const old = { ...base(), planted: { spruce: 4 } };
    check(JSON.stringify(G.newlyGrown(old, 'woodland')) === '{}', 'N5: an old save with grown trees and no record replants nothing'); }

  // S. slot 4
  { const s = base(); s.missionsDone = s.missionsDone.filter(k => k !== 'weurope:kinds3');
    check(!L.OPENS[4].ok(s, 'woodland'), 'S1: slot 4 is shut with empty groves and no kinds3 done');
    plant(s, 0, 9); plant(s, 1, 9);
    check(!L.OPENS[4].ok(s, 'woodland'), 'S2: slot 4 is still shut with 2 of 4 kinds full (2 have room)');
    plant(s, 2, 9);
    check(L.OPENS[4].ok(s, 'woodland'), 'S3: slot 4 opens when 3 of the 4 open kinds are full (1 has room, kinds3 is never offered again)');
    const fresh = { ...base(), habitat: {}, found: {} }; fresh.missionsDone = fresh.missionsDone.filter(k => k !== 'weurope:kinds3'); plant(fresh, 0, 9);
    check(!L.OPENS[4].ok(fresh, 'woodland'), `S4: a land with only slot 0 open and full does NOT open slot 4 (open ${L.treesOpen(fresh, 'woodland')})`); }

  // F. Forester
  { const forester = B.BADGES.find(b => b.id === 'forester');
    const s = base(); plant(s, 0, 12);
    check(T.treesGrown(s) === 0 && forester.measure({}, s) === 0, `F1: 12 saplings and nothing grown: Forester counts 0 (${forester.measure({}, s)})`);
    const g = base(); grow(g, 0, 20);   // an old save may hold more than 9 of a kind (the migration counts every old tree as grown)
    check(forester.measure({}, g) === 9, `F2: 20 grown of ONE kind count 9 (the cap): ${forester.measure({}, g)}`);
    const v = base(); grow(v, 0, 5); grow(v, 1, 5); grow(v, 2, 5);
    check(forester.measure({}, v) === 15 && forester.unit === 'trees grown', `F3: 5 grown of 3 kinds count 15 ('${forester.unit}'): ${forester.measure({}, v)}`);
    check(B.progressOf(v, forester).value === 15, `F4: the badge grid shows the same number: ${B.progressOf(v, forester).value}`); }

  // M. the biome meter
  { const s = base(); plant(s, 1, 9); plant(s, 2, 9);
    const g = base(); grow(g, 1, 9); grow(g, 2, 9);
    check(N.biomeMeter(s, 'woodland') < N.biomeMeter(g, 'woodland'), `M1: saplings add nothing to the biome meter: saplings ${N.biomeMeter(s, 'woodland')} < grown ${N.biomeMeter(g, 'woodland')}`);
    check(N.biodiversity(s, 'woodland') === N.biodiversity(g, 'woodland'), `M2: the full meter (animals, NATURE) still counts saplings as before: ${N.biodiversity(s, 'woodland')} vs ${N.biodiversity(g, 'woodland')}`); }

  // C. the biome cooling (BIOME_COOL.on) in the real engine
  { const W = await import('../src/sim/world.js');
    const cool = (setup, on) => {
      const was = C.BIOME_COOL.on; C.BIOME_COOL.on = on;
      try {
        const s = { ...base(), fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }; setup(s);
        const w = W.createWorld(s, 1); w.holding = true; for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
        w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false; w.nextAirport.worldX = 1e12;   // (as tests/sim-forest.cjs: nothing ends the flight)
        const t0 = w.breakdown.trees; for (let i = 0; i < 200 && w.state === 'playing'; i++) { w.heat = 0; if (w.plane.y > 220 && w.plane.vy > -40) w.applyFlap(); w.step(0.05); }
        return { trees: w.breakdown.trees - t0, region: w.regionNow, state: w.state };
      } finally { C.BIOME_COOL.on = was; }
    };
    const mixed = cool(s => { grow(s, 1, 9); grow(s, 2, 9); grow(s, 3, 9); }, true);
    const saplings = cool(s => { plant(s, 1, 9); plant(s, 2, 9); plant(s, 3, 9); }, true);
    const stacked = cool(s => { grow(s, 1, 27); }, true);
    const none = cool(() => {}, true), off = cool(s => { grow(s, 1, 9); grow(s, 2, 9); grow(s, 3, 9); }, false), offSap = cool(s => { plant(s, 1, 9); plant(s, 2, 9); plant(s, 3, 9); }, false);
    check(mixed.region === 'woodland' && mixed.state === 'playing' && none.trees > 0, `C0 power: the flight ran 10 s over the woodland and the projects cooled (${none.trees.toFixed(3)}) (${mixed.region}, ${mixed.state})`);
    check(mixed.trees > saplings.trees, `C1: grown trees cool, saplings do not: grown ${mixed.trees.toFixed(3)} > saplings ${saplings.trees.toFixed(3)}`);
    const gain = x => x.trees - none.trees;   // what the grove adds over the projects alone
    check(gain(mixed) > 2 * gain(stacked) && gain(stacked) > 0, `C2: 9 grown of 3 kinds add more than twice what 27 of one kind add: ${gain(mixed).toFixed(3)} vs ${gain(stacked).toFixed(3)}`);
    check(Math.abs(off.trees - offSap.trees) < 1e-9, `C3: with the switch OFF grown or sapling groves cool the same (the game as 0.62.0): ${off.trees.toFixed(4)} vs ${offSap.trees.toFixed(4)}`);
  }

  // G. TREES V2 STEP 4 (GROWN_METER, ledger row 51): with the switch on, the meter counts grown trees only and a land's animals wait for a grown tree (grandfather: an animal found there)
  { const was = C.GROWN_METER.on;
    try {
      const sap = base(); plant(sap, 1, 9); plant(sap, 2, 9);
      C.GROWN_METER.on = false; const offSap = N.biodiversity(sap, 'woodland');
      C.GROWN_METER.on = true; const onSap = N.biodiversity(sap, 'woodland'), onGrown = (() => { const g = base(); grow(g, 1, 9); grow(g, 2, 9); return N.biodiversity(g, 'woodland'); })();
      check(onSap < offSap && onGrown === offSap, `G1: switch on, saplings count nothing (on ${onSap} < off ${offSap}) and grown trees count as before (${onGrown})`);
      // an animal that needs only projects this save has: find one in the woodland
      const fresh = { ...base(), found: {} }, ids = N.regionSpecies('woodland').filter(w => !['cow', 'sheep'].includes(w.id)).map(w => w.id);
      C.GROWN_METER.on = false; const can = ids.filter(id => N.canAppear(fresh, id, 'woodland'));
      check(can.length > 0, `G0 power: some woodland animal can appear with the switch off on this save: ${can.length}`);
      C.GROWN_METER.on = true;
      const id = can[0], waits = !N.canAppear(fresh, id, 'woodland');
      const one = { ...base(), found: {} }; grow(one, 0, 1); const after = N.canAppear(one, id, 'woodland');
      const sap1 = { ...base(), found: {} }; plant(sap1, 0, 1); const sapOnly = N.canAppear(sap1, id, 'woodland');
      check(waits && !sapOnly && after, `G2: switch on, '${id}' waits for a GROWN tree: no tree ${!waits ? 'appears' : 'waits'}, a sapling ${sapOnly ? 'appears' : 'waits'}, one grown tree ${after ? 'appears' : 'waits'}`);
      const old = { ...base(), found: { [id]: 1 } }; const gf = N.canAppear(old, id, 'woodland');
      check(gf, `G3: the grandfather rule: a land where '${id}' was already found keeps its animals with no grown tree`);
    } finally { C.GROWN_METER.on = was; } }

  // P. NATIVE FIRST (ledger row 49; switch off): each land's slot-1 native is open from the start; the plantation tree (slot 0) opens with the first project
  { const was = C.NATIVE_FIRST.on, X = await import('../src/nexthere.js');
    try {
      const fresh = { ...base(), habitat: {}, found: {} };
      C.NATIVE_FIRST.on = false; const off = L.treesOpen(fresh, 'woodland').join();
      C.NATIVE_FIRST.on = true; const on = L.treesOpen(fresh, 'woodland').join(), firstName = (D.nextTree(fresh, 'woodland') || {}).name;
      const lands = Object.keys((await import('../src/habitat/trees.js')).REGION_TREES).filter(l => L.hasTrees(l)), allNative = lands.every(l => L.treesOpen(fresh, l).join() === '1');
      const proj = { ...fresh, habitat: { woodland: ['deadwood'] } }, after = L.treesOpen(proj, 'woodland').join();
      let hint = null; try { hint = X.nextHere(fresh, 'woodland').tree; } catch (e) { hint = 'THREW ' + e.message; }
      check(off === '0', `P1: switch off, a new land opens only the plantation tree (slot 0): ${off}`);
      check(on === '1' && allNative && firstName === 'Birch', `P2: switch on, every land opens only its slot-1 native, the UK's first drop is Birch: woodland ${on}, all lands ${allNative}, first '${firstName}'`);
      check(after === '0,1', `P3: switch on, the first habitat project opens the plantation tree too: ${after}`);
      check(hint && hint.name === 'Spruce' && /habitat project/.test(hint.rule || ''), `P4: switch on, NATURE's next-tree card names the plantation tree and the project rule: ${JSON.stringify(hint)}`);
    } finally { C.NATIVE_FIRST.on = was; }
  }

  // DY. GROW_DAYS (the user, 2026-11-13: growth by game days flown, each kind its own time): spruce (slot 0) 4 days, orchard (slot 4) 12; nursery x0.8 / x0.6; flight points carried over
  { const was = C.GROW_DAYS.on, LT = L;
    try {
      C.GROW_DAYS.on = true;
      const days = (flown, grow = 1) => ({ flown, needOf: (land, id) => LT.growNeedTenths(land, id, grow) });
      const s = base(); plant(s, 0, 1); plant(s, 4, 1);
      G.growGroves(s, 10, days(2));   // the planting flight: does not count
      const when = {}; for (let f = 1; f <= 12; f++) { G.growGroves(s, 10, days(1.3)); const g = s.groves.woodland; for (const sl of [0, 4]) if (!when[sl] && g[idOf(sl)].grown) when[sl] = f; }
      check(LT.growNeedTenths('woodland', idOf(0)) === 40 && LT.growNeedTenths('woodland', idOf(4)) === 120, `DY1 power: spruce needs 4.0 days, the fruit tree 12.0 (${LT.growNeedTenths('woodland', idOf(0))}, ${LT.growNeedTenths('woodland', idOf(4))} tenths)`);
      check(when[0] === 4 && when[4] === 10, `DY2: at 1.3 days a flight, spruce is grown after 4 flights and the fruit tree after 10: ${JSON.stringify(when)}`);
      check(LT.growNeedTenths('woodland', idOf(0), 0.7) === 32 && LT.growNeedTenths('woodland', idOf(0), 0.5) === 24, `DY3: the nursery levels cut spruce to 3.2 and 2.4 days: ${LT.growNeedTenths('woodland', idOf(0), 0.7)}, ${LT.growNeedTenths('woodland', idOf(0), 0.5)}`);
      const long = base(); plant(long, 0, 1); G.growGroves(long, 10, days(2)); G.growGroves(long, 10, days(4.2));
      check(long.groves.woodland[idOf(0)].grown === 1, 'DY4: one long flight of 4.2 days grows a spruce at once (time flown, not flights)');
      const old = base(); plant(old, 0, 1); for (let i = 0; i < 6; i++) G.growGroves(old, 10);   // flight mode: the planting flight + 5 points of 10
      const carried = G.saplingsIn(old, 'woodland', 10, (l, id) => LT.growNeedTenths(l, id, 1))[0];
      G.growGroves(old, 10, days(1.3)); const after1 = old.groves.woodland[idOf(0)].saplings[0];
      check(carried && carried.points === 20 && after1 && after1.points === 33 && after1.d === true, `DY5: a sapling half-way in flights carries over half of its days (20 of 40 tenths), then grows by days: ${JSON.stringify([carried, after1])}`);
      const ns = G.nurseryStatus(old, 'woodland', 10, (l, id) => LT.growNeedTenths(l, id, 1));
      check(ns.unit === 'day' && ns.nextIn === 1, `DY6: NATURE's nursery line counts days: ${JSON.stringify(ns)}`);
      C.GROW_DAYS.on = false;
      const off = base(); plant(off, 0, 1); for (let i = 0; i < 3; i++) G.growGroves(off, 10);
      check(off.groves.woodland[idOf(0)].saplings[0].points === 2 && !off.groves.woodland[idOf(0)].saplings[0].d, 'DY7: switch off, a sapling still gains one point a flight');
      // the engine passes the days of the banked flight (src/sim/rules.js bankFlight)
      C.GROW_DAYS.on = true;
      const W = await import('../src/sim/world.js'), sv = { ...base(), fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }; plant(sv, 0, 1);
      sv.groves.woodland[idOf(0)].saplings[0] = { points: 0, fresh: false, d: true };
      const w = W.createWorld(sv, 1); w.holding = true; for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
      w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false; w.nextAirport.worldX = 1e12; w.flySeconds = 75; w.landedAt = w.path[1]; w.finish({ landed: true });
      const sp = w.save.groves.woodland[idOf(0)].saplings[0];
      check(sp && sp.points === 25, `DY8: the engine banks 75 s of flying as 2.5 days (25 tenths): ${JSON.stringify(sp)}`);
    } finally { C.GROW_DAYS.on = was; }
  }

  // W. words
  check(D.BIOME_FULL_LABEL === 'Biome full' && /biodiversity/.test(D.BIOME_FULL_POPUP), `W1: the full-biome words: '${D.BIOME_FULL_LABEL}' / '${D.BIOME_FULL_POPUP}'`);

  console.log(fails.length ? `FAIL rebalance:\n - ${fails.join('\n - ')}` : 'PASS rebalance: kinds3 asks only for kinds with room and is not offered below 2; slot 4 opens when slots 0..3 are open and fewer than 2 have room; Forester counts grown trees (9 a kind); the biome meter counts grown trees; biome cooling (switch) rewards grown, mixed groves; the biome-full words');
  process.exit(fails.length ? 1 : 0);
})();
