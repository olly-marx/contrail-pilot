// Water in the wild areas (the user, 2026-11-13: "water-based animals are just flopping around on the land"; src/water.js).
//   1. The declarations hold: every animal in HOMES exists, lives in a land that HAS water, and every PLACE id is a real project.
//   2. Walking: every animal of every land, started and moved by the field's own functions (startIn, nextIn, walk) for a long
//      stretch, is never outside its zone: whales and fish never on land, land animals never in the water, waders by the water.
//   3. Features: a sea project's feature stands in the water, every other one on dry land.
// No browser. Run: node tests/water.cjs   (GATE=1: fewer steps). Proved by planted defects (research/BACKLOG.md W1).
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const W = await import('../src/water.js'), WL = await import('../src/wildlife.js'), H = await import('../src/habitats.js');
  const byId = Object.fromEntries(WL.WILDLIFE.map(w => [w.id, w]));
  // 1. declarations
  for (const [id, home] of Object.entries(W.HOMES)) {
    check(byId[id], `HOMES names an animal that does not exist: ${id}`);
    if (byId[id]) check(W.hasWater(byId[id].region), `${id} (${home}) lives in ${byId[id].region}, which has no water`);
    check(['water', 'shore', 'edge'].includes(home), `${id}: unknown home ${home}`);
  }
  // the field asks homeOf (src/wild.js): it must give the declared home, and 'land' for the rest
  for (const w of WL.WILDLIFE) if (w.kind !== 'tree') check(W.homeOf(w.id) === (W.HOMES[w.id] || 'land'), `homeOf(${w.id}) is ${W.homeOf(w.id)}, declared ${W.HOMES[w.id] || 'land'}`);
  const projects = Object.fromEntries(Object.entries(H.REGION_DATA).map(([r, d]) => [r, d.projects.map(p => p.id)]));
  for (const id of Object.keys(W.PLACE)) check(Object.values(projects).some(l => l.includes(id)), `PLACE names a project that does not exist: ${id}`);
  for (const r of Object.keys(W.WATER)) check(projects[r], `WATER names a land that does not exist: ${r}`);

  // 2. walking, seeded
  let seed = 12345; const rnd = () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) ^ 0x9e3779b9) >>> 0) / 4294967296;
  const STEPS = process.env.GATE ? 1500 : 6000, dt = 0.05;
  let walkers = 0, moved = 0;
  for (const w of WL.WILDLIFE) {
    const flies = (w.kind === 'bird' || w.pose === 'flying') && w.pose !== 'standing' && w.pose !== 'ground';
    if (flies || w.kind === 'tree' || !projects[w.region]) continue;
    const home = W.HOMES[w.id] || 'land', at = W.startIn(w.region, home, rnd);
    check(at, `${w.id}: no room for a ${home} animal in ${w.region}`); if (!at) continue;
    walkers++;
    const c = { x: at[0], y: at[1], tx: at[0], ty: at[1], speed: 6 + rnd() * 6 };
    let bad = null, dist = 0;
    for (let k = 0; k < STEPS && !bad; k++) {
      const x0 = c.x, y0 = c.y;
      if (!W.walk(c, dt)) { const p = W.STILL.has(w.id) ? null : W.nextIn(w.region, home, c.x, c.y, rnd); if (p) { c.tx = p[0]; c.ty = p[1]; } }
      dist += Math.hypot(c.x - x0, c.y - y0);
      if (!W.allowed(w.region, home, c.x, c.y)) bad = [Math.round(c.x), Math.round(c.y), k, W.isWater(w.region, c.x, c.y) ? 'in water' : 'on land'];
    }
    check(!bad, `${w.id} (${home}, ${w.region}) left its zone: ${JSON.stringify(bad)}`);
    if (W.homeOf(w.id) !== 'land') check(W.STILL.has(w.id) || W.isWater(w.region, c.x, c.y) || home !== 'water', `${w.id} ended out of the water`);
    if (dist > 20 || W.STILL.has(w.id)) moved++;
  }
  check(moved >= walkers * 0.95, `animals should walk about, not stand stuck: ${moved} of ${walkers} moved`);
  // a water animal in a land with water must actually be in the water (positive control on the zone itself)
  for (const id of ['humpback', 'riverdolphin', 'murraycod']) { const r = byId[id].region, p = W.startIn(r, 'water', rnd); check(p && W.isWater(r, p[0], p[1]), `${id}: a water start is in the water`); }
  for (const r of Object.keys(W.WATER)) { const p = W.startIn(r, 'land', rnd); check(p && !W.isWater(r, p[0], p[1]), `${r}: a land start is on land`); }

  // 3. features
  const BASE = [[2, 98], [100, 92], [212, 96], [30, 136], [128, 128], [216, 140], [64, 162], [160, 156], [232, 170], [2, 170], [112, 170], [180, 112], [252, 118]];   // REGION_SPOTS (src/wild.js)
  for (const r of Object.keys(projects)) {
    if (r === 'woodland') continue;   // the UK keeps its hand-placed SLOTS
    const ids = projects[r], spots = W.featureSpots(r, ids, BASE);
    ids.forEach((id, i) => {
      const s = spots[i]; if (!s) { check(false, `${r}/${id}: no spot`); return; }
      const wet = W.isWater(r, s[0] + 24, s[1] - 2), place = W.PLACE[id] || 'land';
      check(place === 'water' ? wet : !wet, `${r}/${id} (${place}) stands ${wet ? 'in the water' : 'on land'} at ${s}`);
    });
  }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS water (${walkers} animals, ${STEPS} steps each)`);
})();
