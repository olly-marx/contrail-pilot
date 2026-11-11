// THE SILENT MISSION AIM IS RETIRED (ROUTING V2 step 3, src/aim.js, src/hub.js, src/missionsview.js; the user, 2026-11-09). Plain Node. An open city mission no longer steers a flight by itself: aimTarget is only the player's destination (save.aimCity: GO TO,
// a mission row's GO THERE, a tapped city); with none the default destination flies (src/destination.js). HOME's view has no skip chip any more. An old save's 'AIM HERE' (save.aimKey) becomes a standing destination if its mission still names a city and
// nothing else is set, and the per-trip skip (save.skipAim) is dropped, once. A FLIGHT ALREADY IN PROGRESS is not touched: a flight lives only in the running page (a reload ends it), the save is migrated only when HOME is drawn (src/ui.js renderHub), and until then an old aimKey steers nothing
// (section 4b: aimTarget ignores it), so there is no half-migrated flight; the crash-retry that used to keep skipAim now flies the default path. The mission row whose city is the destination says so. Plants: tools/plants.tsv, test `gothere`. Run: node tests/gothere.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/aim.js'), M = await import('../src/missions2.js'), R = await import('../src/route.js'), H = await import('../src/hub.js'), V = await import('../src/missionsview.js');
  A.STEER.mission = false;   // this test is the 0.48.0 rule (only a chosen destination steers); tests/steer.cjs covers the mission default
  const base = () => ({ levels: {}, fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'],
    missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const s0 = base(), open = A.aimOpen(s0);
  check(!!open && open !== 'LONDON', `power: a city mission is open and names a city (${open})`);
  // 1. nothing is aimed by an open mission
  check(A.aimTarget(s0) === null, `an open city mission does not aim the flight: ${A.aimTarget(s0)}`);
  check(JSON.stringify(A.routeFor(s0, 8)) === JSON.stringify(R.flightPath(s0, 8)), 'the route with no destination is the default path (routeFor = flightPath)');
  const hv = H.hubView(s0); check(!('skip' in hv) && hv.aim === null, `HOME's view has no skip chip and no aim: ${JSON.stringify([('skip' in hv), hv.aim])}`);
  // 2. GO THERE: the mission's city becomes the destination
  const s1 = base(); A.setGoto(s1, open);
  check(A.aimTarget(s1) === open, `a destination set by GO THERE is the aim: ${A.aimTarget(s1)}`);
  const way = R.pathTo('LONDON', open, R.linksFor(s1)), path = A.routeFor(s1, 8);
  check(JSON.stringify(path.slice(0, way.length)) === JSON.stringify(way), `the flight begins with the shortest way there: ${path.slice(0, way.length)} vs ${way}`);
  // 3. the mission row whose city is the destination is marked
  const rows = v => [v.next, ...v.open].filter(Boolean), row = rows(V.missionsView(s1)).find(r => r.cityName === open);
  check(row && row.city && row.aimed && rows(V.missionsView(s1)).filter(r => r.aimed).length === 1, `the row whose city is the destination says so, and only that one: ${JSON.stringify(row && [row.key, row.cityName, row.aimed])}`);
  check(!rows(V.missionsView(s0)).some(r => r.aimed), 'with no destination no row is marked');
  // 4. old saves: AIM HERE becomes a destination, the skip is dropped, once
  { const m = M.visible(s0).find(x => x.def && A.CITY_TEMPLATES[x.def.id]), s = { ...base(), aimKey: m && m.key, skipAim: true };
    check(A.migrateAim(s) === true && s.aimCity === A.CITY_TEMPLATES[m.def.id](m.fill, s) && !('aimKey' in s) && !('skipAim' in s), `AIM HERE becomes a destination, the skip goes: ${JSON.stringify([s.aimCity, 'aimKey' in s, 'skipAim' in s])}`);
    const again = JSON.stringify(s); check(A.migrateAim(s) === false && JSON.stringify(s) === again, 'the migration runs once (idempotent)');
    const keep = { ...base(), aimKey: m.key, aimCity: 'PARIS' }; A.migrateAim(keep); check(keep.aimCity === 'PARIS' && !('aimKey' in keep), 'a destination already set is kept');
    const stale = { ...base(), aimKey: 'weurope:no-such-mission', skipAim: false }; A.migrateAim(stale); check(!('aimCity' in stale) && !('aimKey' in stale) && !('skipAim' in stale), 'a stale AIM HERE key gives no destination and is dropped'); }
  // 4b. before HOME has migrated a save, an old aimKey / skipAim changes nothing about the route (no half-migrated flight): the flight follows the default path
  { const m = M.visible(s0).find(x => x.def && A.CITY_TEMPLATES[x.def.id]), old = { ...base(), aimKey: m.key, skipAim: true };
    check(A.aimTarget(old) === null && JSON.stringify(A.routeFor(old, 8)) === JSON.stringify(R.flightPath(old, 8)) && JSON.stringify(A.routeFor(old, 8)) === JSON.stringify(A.routeFor(base(), 8)), 'an old save with aimKey and skipAim, not yet migrated, flies the same default path as a save without them'); }
  // 5. the retired names are gone from the module
  check(!('toggleSkip' in A) && !('SKIP_TEXT' in A), 'toggleSkip and SKIP_TEXT are gone from src/aim.js');
  console.log(fails.length ? `FAIL gothere:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : 'PASS gothere: an open city mission no longer steers a flight, GO THERE sets the destination and the row says so, HOME has no skip chip, an old AIM HERE becomes a destination once and the skip is dropped');
  process.exit(fails.length ? 1 : 0);
})();
