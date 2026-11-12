// Clearer next-gap hint (research/PROPOSAL-GAP-MARKERS.md; the user, 2026-10-26: no base gates, systems only,
// readable in daylight, ON by default). 0. default on, gate clear of the heat meter. No browser.
// 1. no systems = no gate, ever; 2. with the systems a gate shows exactly as far ahead as the kit's hintLead (src/hintlines.js ATC_LEAD), not earlier;
// 3. no-fly gates differ from storm gates; 4. the arrow points from the plane towards the gap; 5. in a real flight
// (the sim engine, the game's rules) gates appear with all three systems and never without them.
// Run: node tests/gapmarkers.cjs   (proved by planted defects)
(async () => {
  const G = await import('../src/gapmarkers.js'), C = await import('../src/config.js'), F = await import('../src/fleet.js'), H = await import('../src/hintlines.js');
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const W = C.WIDTH, v = 130, L = H.ATC_LEAD[1];
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
  // 6. Presence (2026-11-07): systems on and no gate up = a fixed bracket that carries no gap information; a gate up or no systems = none.
  const pa = G.presenceFor(L, false), pb = G.presenceFor(H.ATC_LEAD[12], false);   // (presenceFor is no longer drawn since 2026-11-11: the Ops icon replaced the bracket; the function stays for now)
  check(pa && pb && pa.top === pb.top && pa.bot === pb.bot && pa.x === pb.x && pa.alpha === pb.alpha, 'the presence bracket is the same at every level (no information in it)');
  check(G.presenceFor(0, false) === null, 'no systems: no presence bracket');
  check(G.presenceFor(L, true) === null, 'a real gate is up: no presence bracket');
  check(pa && pa.bot < (C.HEIGHT - C.GROUND_H) / 2, `the bracket sits in the upper half of the sky (rows ${pa && pa.top}..${pa && pa.bot}), clear of mid-sky where the heat meter marker rests`);
  const sky = C.HEIGHT - C.GROUND_H;   // the real sky height (512 - 48 = 464): the bracket's centre is a quarter down, rows 92..140
  check(pa && pa.top === Math.round(sky / 4) - 24 && pa.bot === Math.round(sky / 4) + 24, `the bracket is centred a quarter down the real sky (${sky}): rows ${pa && pa.top}..${pa && pa.bot}`);
  check(pa && pa.alpha <= 0.4 && pa.right <= G.GATE_RIGHT && pa.x < pa.right, `quiet (alpha ${pa && pa.alpha}) and left of the meter`);
  // 7. One flavour per line (2026-11-11): the gate LINGERS after its column reaches the screen only with a linger time (Forecasting 7+); the Ops ICON only from Ops 5, lit and sized by its own levels.
  const half = { noFly: false, rects: [{ x: W - 0.5 * v, height: 150 }, { y: 250 }] };   // the column is half a second onto the screen
  check(!G.gateFor(half, 190, v, L, 0) && G.gateFor(half, 190, v, L, H.LINGER_S), `a gate lingers ${H.LINGER_S} s after its column reaches the screen only when asked (linger 0: gone; linger ${H.LINGER_S}: still there)`);
  const fl = o => H.hintFlags(F.fleetKit({ fleet: { plane: 'comet', planes: { comet: {} }, systems: o, gadgets: {} } })), gate1 = { wide: 100 }, gate2 = { wide: 200 };
  check(G.iconFor(fl({ ops: 4 }), gate1) === null && G.iconFor(fl({ ops: 5 }), gate1) && G.iconFor(fl({}), gate1) === null, 'the forecast-on icon starts at Ops 5 (not at 4, not with no system)');
  check(!G.iconFor(fl({ ops: 5 }), gate1).lit && G.iconFor(fl({ ops: 6 }), gate1).lit && !G.iconFor(fl({ ops: 6 }), null).lit, 'the icon lights from Ops 6 only while a gap is in range');
  check(G.iconFor(fl({ ops: 9 }), gate1).gapSize === null && G.iconFor(fl({ ops: 10 }), gate1).gapSize === 'narrow' && G.iconFor(fl({ ops: 10 }), gate2).gapSize === 'wide', 'the icon shows the next gap\'s size (narrow / wide) from Ops 10 only');
  // 5. Real flights.
  const gates = systems => {
    const w = createWorld({ autoTakeoff: true, tutorialDone: true, landings: 30, levels: {}, fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems, gadgets: {} } }, 1);
    w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false;
    for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(1 / 60);   // take-off, as simulate()
    const lead = w.kit.hintLead || 0; let n = 0;
    for (let i = 0; i < 20000 && w.state === 'playing'; i++) {
      if (w.plane.y > 250) w.applyFlap(); w.step(1 / 60);
      if (w.storms.some(st => G.gateFor(st, w.plane.y, w.speed, lead))) n++;
    }
    return n;
  };
  const none = gates({}), two = gates({ forecast: 2, atc: 2 }), all = gates({ forecast: 1, atc: 1, ops: 1 });
  check(none === 0 && two > 0 && two < all * 4, `no systems: no gates (${none}); two systems already give a (fainter, shorter) gate (${two} frames; 2026-11: each system alone gives the arrow, src/hintlines.js)`);
  check(all > 100, `all three systems: gates show (${all} frames)`);
  console.log(fails.length ? `FAIL gapmarkers:\n - ${fails.join('\n - ')}` : `PASS gapmarkers: systems-only gates (${all} frames with all three, 0 without), right timing, kinds, arrows`);
  process.exit(fails.length ? 1 : 0);
})();
