// THE STEER: where the flight heads by default (src/aim.js steerOf; research/ROUTE-DEFAULT-MISSION-PLAN.md; the user, 2026-11-10). Plain Node. Order: (1) the destination the player chose (save.aimCity) is 'chosen';
// (2) the ACTIVE city mission's city is 'mission' unless save.routeMode is 'explore'; (3) the nearest unvisited city: 'explore' when EXPLORE is chosen (restricted to one land by save.stayLand), 'nearest' when no city mission is open.
// STEER.mission = false is exactly 0.48.0 (only a chosen destination steers; routeFor = flightPath otherwise). EXPLORE persists in the save until switched back. Plants: tools/plants.tsv, test `steer`. Run: node tests/steer.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/aim.js'), R = await import('../src/route.js'), D = await import('../src/destination.js'), C = await import('../src/network.js');
  const base = () => ({ levels: {}, fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const s0 = base(), L = R.linksFor(s0), act = A.activeMission(s0), near = D.defaultTargetFrom(L, 'LONDON', ['LONDON']);
  check(!!act && act.city !== 'LONDON' && act.city !== near, `power: a city mission is open and its city (${act && act.city}) differs from the nearest unvisited (${near})`);
  // 1. a mission is open, nothing chosen, no mode set: the mission's city
  let st = A.steerOf(s0); check(st.why === 'mission' && st.city === act.city && !!st.mission, `a mission open and nothing chosen: the mission city: ${JSON.stringify([st.why, st.city])}`);
  const way = R.pathTo('LONDON', act.city, L), rt = A.routeFor(s0, 8); check(JSON.stringify(rt.slice(0, way.length)) === JSON.stringify(way), `the flight begins with the shortest way to the mission city: ${rt.slice(0, way.length)} vs ${way}`);
  // 2. EXPLORE: the nearest unvisited, and it persists (the mode is in the save, nothing resets it)
  const se = { ...base(), routeMode: 'explore' }; st = A.steerOf(se); check(st.why === 'explore' && st.city === near, `with explore selected the default is the nearest unvisited: ${JSON.stringify([st.why, st.city])}`);
  check(JSON.stringify(A.routeFor(se, 8)) === JSON.stringify(R.flightPath(se, 8)), 'EXPLORE flies the default path (routeFor = flightPath)');
  se.visited.push(near); const st2 = A.steerOf(se); check(st2.why === 'explore' && st2.city !== near, `EXPLORE persists after a landing: ${JSON.stringify([st2.why, st2.city])}`);
  // 3. a chosen destination beats both
  const sc = { ...base(), routeMode: 'explore' }; A.setGoto(sc, 'PARIS'); st = A.steerOf(sc); check(st.why === 'chosen' && st.city === 'PARIS', `a chosen destination wins: ${JSON.stringify([st.why, st.city])}`);
  const sm = base(); A.setGoto(sm, 'PARIS'); check(A.steerOf(sm).why === 'chosen', 'a chosen destination wins over an open mission');
  // 4. no city mission open: the nearest, called 'nearest'
  { const sn = { ...base(), missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] }; const sv = { ...sn, tutorialDone: true };
    const none = Object.assign({}, sv); const orig = A.CITY_TEMPLATES; const bak = {}; for (const k of Object.keys(orig)) { bak[k] = orig[k]; orig[k] = () => null; }
    st = A.steerOf(none); for (const k of Object.keys(bak)) orig[k] = bak[k];
    check(st.why === 'nearest' && st.city === near, `no city mission open: the nearest unvisited, why 'nearest': ${JSON.stringify([st.why, st.city])}`); }
  // 5. the A/B switch: STEER.mission = false is 0.48.0
  A.STEER.mission = false; check(JSON.stringify(A.routeFor(s0, 8)) === JSON.stringify(R.flightPath(s0, 8)), 'STEER.mission = false: the route is the default path again'); const so = A.steerOf(s0);
  check(so.why === 'nearest' && so.city === near, `STEER.mission = false: an open mission steers nothing: ${JSON.stringify([so.why, so.city])}`); A.STEER.mission = true;
  // 6. STAY IN A BIOME: only cities of that land; none left -> stayLandLeft 0
  { const reg = n => (C.city(n) || {}).region, sl = { ...base(), routeMode: 'explore', stayLand: reg('LONDON') }, g = A.steerOf(sl);
    check(g.city && reg(g.city) === sl.stayLand && g.land === sl.stayLand, `EXPLORE HERE: the target is in the chosen land: ${JSON.stringify([g.city, g.land])}`);
    check(A.stayLandLeft(sl) > 0, 'cities are left in the land');
    const all = Object.keys(L).filter(c => reg(c) === sl.stayLand); sl.visited = [...sl.visited, ...all]; check(A.stayLandLeft(sl) === 0, 'every city of the land visited: none left (the chip says Done here)');
    const g2 = A.steerOf(sl); check(!g2.land, `with the land done the target is the plain nearest: ${JSON.stringify(g2)}`); }
  // 7. no steer before the tutorial and during a crossing
  check(A.steerOf({ ...base(), tutorialDone: false }).city === null && A.steerOf({ ...base(), flyCrossing: { to: 'PARIS' } }).city === null, 'no steer before the tutorial, none during a crossing');
  if (fails.length) { console.log('FAIL steer:'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
  console.log('PASS steer: the flight heads for the chosen destination, else the open mission city, else the nearest unvisited (EXPLORE persists, EXPLORE HERE stays in a land); STEER.mission = false is 0.48.0');
})().catch(e => { console.log('FAIL steer: ' + e.stack); process.exit(1); });
