// A route that loops back home is landable there (the sim chat, 2026-10-28: Patagonia's 3-city route PUNTA ARENAS >
// PUERTO MADRYN > BALMACEDA > PUNTA ARENAS; the home runway was drawn as the next airport but runwayUnder() excluded the
// home city, so a beginner who skipped two airports 'landed' on it and crashed at ~5,500 km). For Patagonia and Aotearoa:
// (a) the flight's path really returns home; (b) a home runway reached ON the route (worldX > 0) is landable;
// (c) a DEPARTURE runway (at or behind the start) is still never landed on. Plant: the old exclusion -> FAIL. Plain Node.
globalThis.SEASON2 = true;
(async () => {
  const { createWorld } = await import('../src/sim/world.js'), { PLANE, AIRPORT } = await import('../src/config.js');
  const fails = [], rows = [];
  for (const [area, city] of [['patagonia', 'PUNTA ARENAS'], ['aotearoa', 'AUCKLAND']]) {
    const w = createWorld({ areas: [area], homeArea: area, city, visited: [city], tutorialDone: true, autoTakeoff: true, priceVersion: 2, landings: 9, flights: 10, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fuel: 'kerosene',
      fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }, 1);
    const loop = w.path.indexOf(city, 1);
    rows.push(`${city}: ${w.path.slice(0, 6).join(' > ')}`);
    if (loop < 1) { fails.push(`${city}: the route never returns home (${w.path.slice(0, 8)})`); continue; }
    const box = { x: PLANE.x + 10, y: 0, w: PLANE.w, h: 12 };
    w.runways = [{ x: PLANE.x, worldX: 5500, name: city, parts: [] }];   // the home runway, reached on the route
    if (!w.runwayUnder(box)) fails.push(`${city}: the home runway reached on the route (stop ${loop}) is not landable`);
    w.runways = [{ x: PLANE.x, worldX: -60, name: city, parts: [] }];    // a departure runway under the plane
    if (w.runwayUnder(box)) fails.push(`${city}: the departure runway can be 'landed' on`);
  }
  if (fails.length) { console.log('FAIL homelanding\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS homelanding: a loop home is landable, the departure runway is not (${rows.join('; ')})`);
})();
