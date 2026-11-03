// The 0.12.0 offer gate (user decision 2026-10-26): a crossing is OFFERED only when the BEST landed flight from its area is
// >= 70% of the crossing's km AND the area's biodiversity is >= 30 (src/crossings.js offerCtx/offerCheck, src/season.js).
// Also: the gate really is fed by flights (recordAreaBest), nothing past SEASON.maxEra is offered, "more to come" shows.
// PLANT=nogate zeroes the thresholds (the gate removed): the "cannot be offered early" checks must then FAIL.
// Plain Node. Run: node tests/offer-gate.cjs
(async () => {
  globalThis.window = { SEASON2: true };
  const X = await import('../src/crossings.js');
  const { SEASON } = await import('../src/season.js');
  const { biodiversity } = await import('../src/nature.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, flightSeconds: 1e6, areas: ['weurope'], city: 'WARSAW', missionsDone: ['weurope:night', 'weurope:shade10', 'weurope:kinds3'],   /* S3: the 3 starred missions are a condition too */
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  if (process.env.PLANT === 'nogate') { SEASON.offer.distanceShare = 0; SEASON.offer.biodiversity = 0; }
  const c = X.available(base).find(x => x.id === 'warsaw-stockholm');
  check(c && c.km === 6500, `Warsaw-Stockholm is the 6,500 km crossing: ${c && c.km}`);
  const ok = save => X.offerCheck(c, X.offerCtx(save, c)).offered;
  // plant enough trees for bio >= 30 in the start city's region (found, not assumed)
  const green = { ...base, planted: {} };
  for (const id of ['spruce', 'birch', 'oak', 'beech', 'pine', 'ash', 'rowan', 'hazel', 'willow', 'alder']) green.planted[id] = 40;
  const bio = biodiversity(green, (await import('../src/network.js')).city('AMSTERDAM').region);
  check(bio >= 30, `test setup: the planted save has biodiversity >= 30 (got ${bio})`);
  const fly = (save, km) => { const s = JSON.parse(JSON.stringify(save)); X.recordAreaBest(s, 'AMSTERDAM', km); return s; };
  const need = Math.ceil(0.7 * c.km);
  check(!ok(base), 'a fresh save is not offered the crossing');
  check(!ok(fly(base, need)), 'distance alone (no biodiversity) is not enough');
  check(!ok(green), 'biodiversity alone (no long flight) is not enough');
  check(!ok(fly(green, need - 1)), `a flight of ${need - 1} km (just under 70%) is not enough`);
  check(ok(fly(green, need)), `${need} km (70%) + biodiversity 30 offers it`);
  check(!ok(fly({ ...green, missionsDone: ['weurope:shade10'] }, need)), 'distance + biodiversity but only 1 of the 3 starred missions is not enough (any 2 of 3: the user, 2026-10-27)');
  check(ok(fly({ ...green, missionsDone: ['weurope:shade10', 'weurope:kinds3'] }, need)), 'any 2 of the 3 starred (without the night one) is enough');
  check(!ok({ ...green, areaBest: { nordic: 99999 } }), 'a long flight from ANOTHER area does not count');
  // recordAreaBest keeps the best, per area, and ignores nothing-flights
  const r = fly(fly(base, 4000), 2500); check(r.areaBest.weurope === 4000, `areaBest keeps the longest: ${JSON.stringify(r.areaBest)}`);
  check(!fly(base, 0).areaBest, 'a 0 km flight records nothing');
  // maxEra 5 (the era 6 release): every era is in; the lap is offered only once every area is open (tests/lap.cjs)...
  const na = { ...base, areas: ['namerica'], city: 'DENVER' };
  const ids = X.available(na).map(x => x.id);
  check(ids.includes('mexico-panama') || ids.includes('north-atlantic'), `a North American save has its era 0-1 crossings: ${ids}`);
  check(!ids.includes('lap') && X.available(na).every(x => x.era <= SEASON.maxEra), `the lap is not offered with one area open: ${ids}`);
  check(SEASON.maxEra === 5, `the era 6 release has every era: maxEra ${SEASON.maxEra}`);
  // ...and when everything of this release is flown, a placeholder instead of an empty screen
  const done = { ...base, areas: [...Object.keys((await import('../src/areas.js')).AREAS), 'ocean'], crossed: [] };   // (the era 4 release: the 2010s crossings reach Honolulu, the ocean)
  // The era 6 release: with every area open the ONLY crossing left is the lap; once it is flown the game is finished
  // (the ending card), and there is no "more to come" placeholder any more.
  check(X.available(done).map(c => c.id).join() === 'lap' && !X.moreToCome(done), `all areas open: only the lap is offered (${X.available(done).map(c => c.id)})`);
  const finished = { ...done, crossed: ['lap'], lapDone: true };
  check(X.available(finished).length === 0 && !X.moreToCome(finished), 'after the lap: nothing to fly and no "more to come" (the game is finished)');
  check(!X.moreToCome(base), 'a save with crossings still to fly shows no placeholder');
  // the empty FLY screen: nothing to fly now, but the next crossing opens in a later era (laterEra), told instead of silence
  const early = { ...base, flightSeconds: 0, areas: ['weurope', 'nordic'], city: 'STOCKHOLM' };
  check(X.available(early).length === 0 && X.laterEra(early) === 1, `1950s save with both era-0 crossings of its areas done: nothing now, the next opens in era 1: ${X.available(early).length} ${X.laterEra(early)}`);
  check(X.laterEra(base) === null, 'a save already in the last era has no later crossing to announce');
  console.log({ fails });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS offer-gate');
})();
