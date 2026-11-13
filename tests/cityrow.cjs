// The background city row shows only near a city (the user, 2026-11-13: "the background buildings are always present. They should only be there in close proximity
// (one storm gap either side) of a city"). src/sim/rules.js cityRowAlpha: 1 within STORMS.spacing px of the airport behind or ahead, fading to 0 over 80 px beyond;
// src/GameScene.js updateScenery sets the city strip's alpha from it. Plain Node on the engine. Plants: tools/plants.tsv, test `cityrow`. Run: node tests/cityrow.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js'), { STORMS } = await import('../src/config.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, flights: 9, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON',
    visited: ['LONDON'], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const w = createWorld(save, 1); w.holding = true;
  for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
  const ahead = w.nextAirport.worldX, len = w.legKm(w.airportIndex), behind = ahead - len, S = STORMS.spacing;
  check(ahead < 1e8 && len > 2 * S + 200, `power: a real leg long enough to have a middle (ahead ${ahead}, length ${len}, spacing ${S})`);
  const at = x => { w.distancePx = x; return w.cityRowAlpha(); };
  check(at(behind) === 1 && at(behind + S) === 1, `1: at the city behind and one storm gap past it, the buildings show: ${at(behind)}, ${at(behind + S)}`);
  check(Math.abs(at(behind + S + 40) - 0.5) < 1e-9, `2: 40 px further they are half faded: ${at(behind + S + 40)}`);
  check(at((behind + ahead) / 2) === 0, `3: in the middle of the leg there are no buildings: ${at((behind + ahead) / 2)}`);
  check(at(ahead - S) === 1 && at(ahead) === 1 && at(ahead + 10) === 1, `4: one storm gap before the next city, and at it, they show: ${at(ahead - S)}, ${at(ahead)}`);
  const t = createWorld({ ...save }, 1); t.nextAirport = { worldX: 1e12 };
  check(t.cityRowAlpha() === 1, '5: the never-landing test pilots (no airport ahead) keep the row as before');
  console.log(fails.length ? `FAIL cityrow:\n - ${fails.join('\n - ')}` : 'PASS cityrow: the background buildings show within one storm gap of the city behind or ahead, fade over 80 px, and are gone mid-leg');
  process.exit(fails.length ? 1 : 0);
})();
