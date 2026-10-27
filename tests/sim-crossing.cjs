// Season 2 crossing flights in the Node engine (sim chat's conditions for the rules.js hunk, 2026-10-26): a save with
// flyCrossing flies from the departure to the gateway in ONE leg of crossing.km, then on through the new area; the path
// is pure (same save -> same path, twice, in one process, around an ordinary flight); an ordinary save is unchanged.
// PLANT=km makes the first leg the ordinary one: must FAIL. Plain Node. Run: node tests/sim-crossing.cjs
(async () => {
  globalThis.SEASON2 = true; globalThis.window = { SEASON2: true };   // (cities.js reads globalThis.SEASON2 since S4; window is for config.js FEATURES)   // the redesign's switch (src/season2.js), as the game sets it
  const { simulate } = await import('../src/sim/simulate.js');
  const { createWorld } = await import('../src/sim/world.js');
  const X = await import('../src/crossings.js');
  const { AREAS } = await import('../src/areas.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const base = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, flightSeconds: 1e6, areas: ['weurope'], city: 'WARSAW',
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const c = X.available(base).find(x => x.id === 'warsaw-stockholm');
  check(c && c.km === X.crossingKm(c), 'the 1950s Warsaw-Stockholm crossing is available from Western Europe');
  const grab = save => { let w0 = null; simulate(save, { pilot: 'careful', seed: 3, maxKm: 300, onStep: w => { if (!w0) w0 = { path: [...w.path], first: w.nextAirport.worldX, leg0: w.legKm(0) }; } }); return w0; };
  if (process.env.PLANT === 'km') c.km = undefined;
  const a = grab({ ...base, flyCrossing: c }), plain = grab(base), b = grab({ ...base, flyCrossing: c });
  check(a.path[0] === 'WARSAW' && a.path[1] === 'STOCKHOLM', `departs Warsaw for Stockholm: ${a.path.slice(0, 3)}`);
  check(a.leg0 === X.crossingKm(c), `the first leg is the crossing's ${X.crossingKm(c)} km: ${a.leg0}`);   // (the engine moves the airport itself out of reach)
  check(a.path.slice(1).every(n => AREAS.nordic.cities.includes(n)), `then on through the Nordic area: ${a.path.slice(1, 6)}`);
  check(JSON.stringify(a) === JSON.stringify(b), 'pure: the same save flies the same path after an ordinary flight in between');
  check(plain.path.every(n => AREAS.weurope.cities.includes(n)) && plain.leg0 < 3000, `an ordinary flight stays home with ordinary legs: ${plain.path.slice(0, 3)} ${plain.leg0}`);
  // "The first place you can land is B, crossing.km away" (sim chat): on the world itself, before simulate() moves airports.
  const w = createWorld({ ...base, flyCrossing: c }, 3);
  check(w.nextAirport.name === 'STOCKHOLM' && w.nextAirport.worldX === X.crossingKm(c), `first airport Stockholm at ${X.crossingKm(c)}: ${w.nextAirport.name} ${w.nextAirport.worldX}`);
  // Never before flight school is done (sim chat's edge case): such a save flies an ordinary flight.
  const early = createWorld({ ...base, tutorialDone: false, flyCrossing: c }, 3);
  check(!early.crossing && early.path[1] !== 'STOCKHOLM', `no crossing before the tutorial: ${early.path.slice(0, 2)}`);
  console.log({ fails });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS sim-crossing');
})();
