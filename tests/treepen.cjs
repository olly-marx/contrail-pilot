// THE TREE PEN, THE LAND'S COOLING and THE NATURE LINE (src/treepen.js; the user, 2026-11-16: "impossible to know what the effect of trees is"). No browser.
// Holds the numbers the screens show to the rules they describe: the cooling cap is BIOME_COOL.store x meter / 100 (src/sim/rules.js), a sapling's days are its kind's
// GROW_DAYS (src/landtrees.js growNeedTenths), 'when grown' is the meter with that one sapling grown, and the results' Nature lands sum to what the flight recorded.
// Run: node tests/treepen.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const P = await import('../src/treepen.js'), C = await import('../src/config.js'), L = await import('../src/landtrees.js'), N = await import('../src/nature.js');
  const save = { missionsDone: ['L5'], levels: { trees: 1 }, habitat: { woodland: ['meadow'] },
    groves: { woodland: { birch: { planted: 3, grown: 1, saplings: [{ points: 30, fresh: false, d: true }, { points: 0, fresh: true, d: true }] }, spruce: { planted: 1, grown: 0, saplings: [{ points: 12, fresh: false, d: true }] } } } };
  const v = P.penView(save, 'woodland');
  check(v.meter === N.biomeMeter(save, 'woodland'), `the pen's meter is the biome meter the sim cools by: ${v.meter}`);
  for (const m of [0, 7, 25, 100]) check(P.coolCap(m) === Math.round(C.BIOME_COOL.store * m / 100), `coolCap(${m}) = store x meter / 100`);
  check(v.cool === P.coolCap(v.meter), 'the land card shows coolCap of its meter');
  check(v.saps.length === 3, `every sapling has a row: ${v.saps.length}`);
  for (const sp of v.saps) check(sp.days && sp.days.need === Math.round(L.growNeedTenths('woodland', sp.id, 1) / 10), `${sp.id}: days needed = its kind's GROW_DAYS: ${JSON.stringify(sp.days)}`);
  check(v.saps[0].points >= v.saps[v.saps.length - 1].points, 'most grown first');
  const birch = v.saps.find(s => s.id === 'birch');
  check(birch.gain > 0 && birch.gain === P.meterIfGrown(save, 'woodland', 'birch') - v.meter, `a native sapling adds to the meter once grown: +${birch.gain}`);
  check(JSON.stringify(save.groves.woodland.birch.saplings.length) === '2', 'meterIfGrown does not touch the save');
  check(v.grown === 1 && v.projects === 1, `made of: ${v.grown} grown, ${v.projects} projects`);
  const html = P.penHTML(v);
  check(/TREE NURSERY/.test(html) && /3 of 6 days/.test(html) && new RegExp(`-${v.cool}`).test(html), 'the card says the pen, the days and the cooling');
  // An empty land: no pen, and the card says what grown trees will do.
  const bare = P.penView({ missionsDone: [] }, 'woodland');
  check(!bare.saps.length && !/TREE NURSERY/.test(P.penHTML(bare)), 'no saplings: no pen');
  // The results card's Nature line: the lands are what the flight recorded, the next tree to grow is the one with fewest days left.
  const n = P.natureFrom({ natureBy: { woodland: 4.4, mediterranean: 1.2 }, dropCool: 0.6, grewDays: 1.34, treesGrown: 0 }, save);
  check(n.lands.length === 2 && n.lands[0][1] === 4 && n.lands[1][1] === 1, `lands by cooling: ${JSON.stringify(n.lands)}`);
  check(n.drops === 1 && n.grewDays === 1.3, `drops ${n.drops}, grew ${n.grewDays}`);
  check(n.next && n.next.left === Math.min(...v.saps.map(s => s.left)), `next to grow: ${JSON.stringify(n.next)}`);
  check(/Nature, from/.test(P.natureSheetHTML(n)) && /\+1\.3 days/.test(P.natureSheetHTML(n)), 'the sheet says where Nature came from');
  console.log(fails.length ? `FAIL treepen:\n - ${fails.join('\n - ')}` : 'PASS treepen: pen days = GROW_DAYS, land cooling = store x meter, gain = meter with the sapling grown, Nature lines = the flight\'s record');
  process.exit(fails.length ? 1 : 0);
})();
