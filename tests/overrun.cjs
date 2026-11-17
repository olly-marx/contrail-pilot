// Bad landings (the user, 2026-11-17; src/sim/rules.js land / freeFall / bankFlight, src/config.js AIRPORT.overrunKeep, steepVy, crashCrystalKeep).
// Controlled approaches, no taps, nothing in the sky: the plane is put at a height H over the ground, D px before the runway's start
// (D < 0: already over it), with 11 seeds and 5 ice crystals on board, landing window (kit.flare) x1 or x2.
//   A  low from far out, x1        -> landed, not overran, all 11 seeds and 5 crystals kept
//   B  high at the runway start, x1 -> landed (not a crash), overran, 6 seeds (half rounded up) and 3 crystals kept; the results card says so
//   C  the same approach, x2        -> landed, not overran (steeper way down and harder brakes): the gear is what saves it
//   D  a crash (no runway), x1      -> 3 of 5 crystals kept
//   F  the barrier at the end is hit (onOverrun) exactly once on B, never on A or C
//   E  the roll-out stops short of the runway's end on every landing judged good (the rule's own geometry, checked from frames)
//   G  one gear step (x1.2) stops in time where x1 runs off the end (the gear's pull is the landing window squared)
// Plain Node. PLANT=overrun (never judged) | keepAll (nothing lost) | flat (no steeper way down) | linear (gear pull not squared): each must FAIL.  Run: node tests/overrun.cjs
(async () => {
  const R = await import('../src/sim/rules.js');
  const { createWorld } = await import('../src/sim/world.js');
  const { resultsView } = await import('../src/resultscard.js');
  const { PLANE, CLIMATE, HEIGHT, GROUND_H, AIRPORT } = await import('../src/config.js');
  if (process.env.PLANT) R.FIELD_PLANTS[process.env.PLANT] = true;
  CLIMATE.dangerLine = Infinity;
  const SKY_H = HEIGHT - GROUND_H, fails = [];
  const fly = ({ H, D, flare, runway = true }) => {
    const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, levels: {}, planted: {},
      fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
    const w = createWorld(save, 7); let barrier = 0; w.onOverrun = () => { barrier++; };
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    for (let i = 0; i < 600; i++) { w.graceUntil = 0; w.storms = []; w.birds = []; w.plane.y = 150; w.plane.vy = 0; w.nextAirport.worldX = w.distancePx + 5000; w.step(1 / 60); }   // up to cruising speed, no airport near
    w.explain = () => false; w.graceUntil = 0; w.autoUntil = 0; w.kit.flare = flare;
    w.runways = []; w.nextAirport = { worldX: runway ? w.distancePx + D : w.distancePx + 1e9, name: 'PARIS', spawned: false };
    w.plane.y = SKY_H - H + PLANE.spriteOffY - PLANE.spriteH; w.plane.vy = 0; w.cargo = 11; w.crystals = 5;
    const speed0 = w.speed; let stopNose = null, rwEnd = null;
    for (let i = 0; i < 20000 && w.state !== 'over'; i++) {
      w.storms = []; w.birds = []; w.tokens = [];
      if (w.state === 'landing' && w.runways.length) { stopNose = w.plane.x + PLANE.w; rwEnd = w.runways[0].x + AIRPORT.runwayLen; }
      w.step(1 / 60);
    }
    return { w, r: w.result, speed0, stopNose, rwEnd, barrier };
  };
  const check = (name, ok, line) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${line}`); if (!ok) fails.push(name); };
  const say = o => `landed ${o.r.landed} overran ${o.r.overran} seeds +${o.r.gained} crystals ${o.r.crystals} (lost ${o.r.crystalsLost}) touchdown pos ${o.r.touchdown && o.r.touchdown.pos} speed ${Math.round(o.speed0)} stop ${o.stopNose && Math.round(o.stopNose - o.rwEnd)} px past the end`;
  const A = fly({ H: 60, D: 250, flare: 1 });
  check('A low from far out, x1', A.r.landed && !A.r.overran && A.r.gained === 11 && A.r.crystals === 5, say(A));
  const B = fly({ H: 120, D: 0, flare: 1 });
  const vB = resultsView(B.r, B.w.save);
  check('B high at the runway start, x1', B.r.landed && B.r.overran && B.r.gained === 6 && B.r.crystals === 3 && B.r.crystalsLost === 2, say(B));
  check('B results card', vB.eyebrow === 'BAD LANDING IN' && vB.maths === 'Off the runway: half lost' && vB.tally.some(t => t[0] === 'Ran off the runway' && t[1] === '-5') && vB.tally.some(t => t[0] === 'Ice crystals lost' && t[1] === '-2'),
    `eyebrow "${vB.eyebrow}" maths "${vB.maths}" tally ${JSON.stringify(vB.tally)}`);
  const C = fly({ H: 120, D: 0, flare: 2 });
  check('C the same approach, x2', C.r.landed && !C.r.overran && C.r.gained === 11 && C.r.crystals === 5, say(C));
  const Dc = fly({ H: 60, D: 0, flare: 1, runway: false });
  check('D crash keeps half the crystals', !Dc.r.landed && Dc.r.crystals === 3 && Dc.r.crystalsLost === 2, say(Dc));
  // E: the geometry. Where the nose really stopped (frames) against the runway's end, for every landing above.
  for (const [n, o] of [['A', A], ['B', B], ['C', C]]) if (o.r.landed) check(`E ${n} stop vs end`, (o.stopNose <= o.rwEnd + 0.5) === !o.r.overran, `nose stopped ${Math.round(o.stopNose - o.rwEnd)} px from the end, overran ${o.r.overran}`);
  check('F barrier: once on the overrun, never on a good landing', B.barrier === 1 && A.barrier === 0 && C.barrier === 0, `A ${A.barrier}, B ${B.barrier}, C ${C.barrier}`);
  // G: one gear step is felt. The same approach (arriving 160 px up over the runway's start) runs off the end at x1 and stops in time at x1.2 (the squared pull; linear x1.2 is not enough).
  const G1 = fly({ H: 160, D: 0, flare: 1 }), G2 = fly({ H: 160, D: 0, flare: 1.2 });
  check('G one gear step (x1.2) saves a high approach that x1 overruns', G1.r.overran && G2.r.landed && !G2.r.overran, `x1: ${say(G1)} | x1.2: ${say(G2)}`);
  console.log(fails.length ? `FAILED: ${fails.join(', ')}` : 'PASS');
  process.exit(fails.length ? 1 : 0);
})();
