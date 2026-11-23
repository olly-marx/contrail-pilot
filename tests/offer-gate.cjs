// The offer gate. V4 (0.73.0, Oliver 2026-11-23): a crossing is OFFERED when the plane's range or the best landed flight from ANY area reaches the WHOLE
// crossing (src/crossings.js offerCtx/offerCheck, src/season.js distanceShare 1). Until 0.73.0: 70% from its own area AND biodiversity 30 AND the starred missions.
// Also: the gate really is fed by flights (recordAreaBest), nothing past SEASON.maxEra is offered, "more to come" shows.
// PLANT=nogate zeroes the thresholds (the gate removed): the "cannot be offered early" checks must then FAIL.
// Plain Node. Run: node tests/offer-gate.cjs
(async () => {
  (await import('../src/storyboard.js')).STORY.on = false;   // (2026-11-23) this test checks the AREA LADDER (its missions or its crossing stars), retired by story missions (src/storyboard.js) but still in the code: it runs with the ladder on
  globalThis.window = { SEASON2: true };
  const X = await import('../src/crossings.js');
  const { SEASON } = await import('../src/season.js');
  const { biodiversity } = await import('../src/nature.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, flightSeconds: 1e6, areas: ['weurope'], city: 'ROME', missionsDone: ['weurope:night', 'weurope:shade10', 'weurope:kinds3'],   /* S3: the 3 starred missions are a condition too */
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  if (process.env.PLANT === 'nogate') { SEASON.offer.distanceShare = 0; }
  const c = X.available(base).find(x => x.id === 'mediterranean');   // CROSSINGS V3: Western Europe's first crossing
  check(c && c.km === 12000, `the Mediterranean (Easy) is 12,000 km (0.73.0: 7,000 before; SEASON.step.km[0]): ${c && c.km}`);
  const ok = save => X.offerCheck(c, X.offerCtx(save, c)).offered;
  // plant enough trees for bio >= 30 in the start city's region (found, not assumed)
  const green = { ...base, planted: {} };
  for (const id of ['spruce', 'birch', 'oak', 'beech', 'pine', 'ash', 'rowan', 'hazel', 'willow', 'alder']) green.planted[id] = 40;
  const bio = biodiversity(green, (await import('../src/network.js')).city('AMSTERDAM').region);
  // (V4: nature is no longer asked; the green save stays to show a green save without the range is still not offered.)
  const fly = (save, km) => { const s = JSON.parse(JSON.stringify(save)); X.recordAreaBest(s, 'AMSTERDAM', km); return s; };
  // V4 (0.73.0, Oliver 2026-11-23): a crossing is offered when the RANGE or a landed flight reaches the WHOLE crossing, from any area; no nature, no missions, no era.
  const need = c.km;
  check(!ok(base), 'a fresh save is not offered the crossing');
  check(!ok(fly(green, need - 1)), `a flight of ${need - 1} km (just under the crossing) is not enough, whatever the nature`);
  check(ok(fly(base, need)), `${need} km (the whole crossing) offers it with no nature and no starred missions`);
  check(ok({ ...base, missionsDone: [], areaBest: { nordic: need } }), 'a long flight from ANOTHER area counts (range is status, not location)');
  // recordAreaBest keeps the best, per area, and ignores nothing-flights
  const r = fly(fly(base, 4000), 2500); check(r.areaBest.weurope === 4000, `areaBest keeps the longest: ${JSON.stringify(r.areaBest)}`);
  check(!fly(base, 0).areaBest, 'a 0 km flight records nothing');
  // maxEra 5 (the era 6 release): every era is in; the lap is offered only once every area is open (tests/lap.cjs)...
  const na = { ...base, areas: ['namerica'], city: 'DENVER' };
  const ids = X.available(na).map(x => x.id);
  check(ids.length === 1 && ids[0] === 'caribbean', `a North American save is offered ONE crossing, its shortest (the Caribbean, Medium): ${ids}`);
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
  check(X.laterEra(base) === null && X.available({ ...base, flightSeconds: 0, areas: ['weurope', 'mideast'], city: 'TUNIS' }).length === 1, 'V4: no crossing waits for an era (laterEra is always null; a 1950s save with one crossing made is offered the next)');
  console.log({ fails });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS offer-gate');
})();
