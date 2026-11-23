// Nothing grows in front of a runway (Oliver, 2026-11-23: 'the trees grow in front of the runways'). src/sim/rules.js clearOfRunways(x, half): a screen x is clear of the runway
// on screen AND of the next airport's runway before it is drawn (scenery trees and ground animals in GameScene.updateWildlife ask it; the first screen is built after the home runway).
// Plain Node. Plants (tools/plants.tsv): the not-yet-drawn runway ignored; the drawn runways ignored. Run: node tests/runwayclear.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const { PLANE, WIDTH, AIRPORT } = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: {}, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const w = createWorld(save, 3);
  for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
  // The next airport just off the right edge, not drawn yet: its runway starts at screen x = PLANE.x + worldX - distance.
  w.runways = []; w.nextAirport = { worldX: w.distancePx + WIDTH + 20 - PLANE.x, name: 'PARIS', spawned: false };
  const start = PLANE.x + w.nextAirport.worldX - w.distancePx;
  check(!w.clearOfRunways(start + 50, 20), `a tree on the coming runway (not drawn yet) is refused: x ${start + 50}`);
  check(!w.clearOfRunways(start - 10, 30), 'a tree whose half-width reaches the runway start is refused');
  check(w.clearOfRunways(start - 60, 30) && w.clearOfRunways(start + AIRPORT.runwayLen + 60, 30), 'clear ground before and after the runway is allowed');
  // A drawn runway on screen.
  w.nextAirport.spawned = true; w.runways = [{ x: 100, worldX: 0, name: 'X', parts: [] }];
  check(!w.clearOfRunways(100 + AIRPORT.runwayLen / 2, 20), 'a tree on a drawn runway is refused');
  check(w.clearOfRunways(100 + AIRPORT.runwayLen + 40, 20), 'past the drawn runway is allowed');
  if (fails.length) { console.log(`FAIL runwayclear:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log('PASS runwayclear: scenery is kept off the drawn runway and the coming one');
})();
