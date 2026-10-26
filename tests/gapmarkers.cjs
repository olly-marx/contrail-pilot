// Clearer next-gap hint (research/PROPOSAL-GAP-MARKERS.md; the user, 2026-10-26: no base gates, systems only,
// readable in daylight, ON by default). 0. default on, gate clear of the heat meter. No browser.
// 1. no systems = no gate, ever; 2. with the systems a gate shows exactly as far ahead as GAP_HINT.lead, not earlier;
// 3. no-fly gates differ from storm gates; 4. the arrow points from the plane towards the gap; 5. in a real flight
// (the sim engine, the game's rules) gates appear with all three systems and never without them.
// Run: node tests/gapmarkers.cjs   (proved by planted defects)
(async () => {
  const G = await import('../src/gapmarkers.js'), C = await import('../src/config.js'), F = await import('../src/fleet.js');
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const W = C.WIDTH, v = 130, L = F.GAP_HINT.lead[1];
  const pair = (secs, noFly, top = 150, bot = 250) => ({ noFly, rects: [{ x: W + secs * v, height: top }, { y: bot }] });
  // 0. On by default (the user, 2026-10-26: clearer markers, not optional ones); ?gapmarkers=off is the way out.
  check(C.FEATURES.gapMarkers === true, `the clearer hint is the default (FEATURES.gapMarkers ${C.FEATURES.gapMarkers})`);
  // The gate stays clear of the heat meter at the right edge (src/Hud.js: bar at WIDTH - 6 - 8, ticks 3 px wider).
  check(G.GATE_RIGHT < G.METER_LEFT && G.METER_LEFT === W - 6 - 8 - 3 && G.GATE_RIGHT - 20 - 7 > 0, `gate right edge ${G.GATE_RIGHT} left of the meter at ${G.METER_LEFT}`);
  // 1-2. When.
  check(!G.gateFor(pair(0.1, false), 190, v, 0) && !G.gateFor(pair(0.1, true), 190, v, 0), 'no systems: no gate, storm or no-fly');
  check(G.gateFor(pair(L - 0.05, false), 190, v, L), `systems level 1: a gate ${L} s ahead`);
  check(!G.gateFor(pair(L + 0.2, false), 190, v, L), 'not earlier than the systems allow');
  check(!G.gateFor({ noFly: false, rects: [{ x: W - 1, height: 150 }, { y: 250 }] }, 190, v, L), 'no gate once the column is on screen');
  // 3. Kinds.
  check(G.gateFor(pair(0.3, true), 190, v, L).kind === 'nofly' && G.gateFor(pair(0.3, false), 190, v, L).kind === 'storm', 'storm and no-fly gates differ');
  // 4. The arrow.
  check(G.gateFor(pair(0.3, false, 50, 150), 380, v, L).arrow === -1, 'gap above the plane: arrow up');
  check(G.gateFor(pair(0.3, false, 300, 420), 40, v, L).arrow === 1, 'gap below the plane: arrow down');
  check(G.gateFor(pair(0.3, false, 150, 250), 194, v, L).arrow === 0, 'level with the gap: no arrow');
  check(G.gateFor(pair(0.3, false, 300, 420), 40, v, L).blink && !G.gateFor(pair(0.3, false, 150, 250), 180, v, L).blink, 'a big jump blinks');
  // 5. Real flights.
  const gates = systems => {
    const w = createWorld({ autoTakeoff: true, tutorialDone: true, landings: 30, levels: {}, fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems, gadgets: {} } }, 1);
    w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false;
    for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(1 / 60);   // take-off, as simulate()
    const lead = F.GAP_HINT.lead[w.kit.hintLevel] || 0; let n = 0;
    for (let i = 0; i < 20000 && w.state === 'playing'; i++) {
      if (w.plane.y > 250) w.applyFlap(); w.step(1 / 60);
      if (w.storms.some(st => G.gateFor(st, w.plane.y, w.speed, lead))) n++;
    }
    return n;
  };
  const none = gates({}), two = gates({ forecast: 2, atc: 2 }), all = gates({ forecast: 1, atc: 1, ops: 1 });
  check(none === 0 && two === 0, `no gates without all three systems (none ${none}, two of three ${two} frames)`);
  check(all > 100, `all three systems: gates show (${all} frames)`);
  console.log(fails.length ? `FAIL gapmarkers:\n - ${fails.join('\n - ')}` : `PASS gapmarkers: systems-only gates (${all} frames with all three, 0 without), right timing, kinds, arrows`);
  process.exit(fails.length ? 1 : 0);
})();
