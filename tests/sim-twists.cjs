// The era 4-6 twists (src/sim/rules.js, 2026-10-27, PROPOSAL-ERAS-4-6-SYSTEMS): drifting no-fly gaps (from 14,000 km),
// turning flocks (18,000), pulsing storm gaps (22,000), the long-haul squeeze (26,000). One crashes-off flight to 32,000 km
// with the era forced to 5 (kit.era: every twist on), and the same sky at era 2 (today's twin: every twist off). Checks:
//   era 2: no column or flock carries a twist, and nothing moves vertically except by the old rules;
//   era 5: drifting zones and pulsing storms move, flocks turn; none of them spawned before its `from`;
//   no new draws: up to 14,000 km (before the first twist) both flights meet the same columns (gap size, gap centre, no-fly
//   or not) and the same flocks. After a twist starts the skies may part WITHOUT the twist drawing anything: a new flock picks
//   its height with up to 10 tries against the storm gaps (flockBlocksGap), and a moving gap changes how many tries it needs
//   (measured 2026-10-27; the same kind of effect as moving storm spawns, research/SIM-ENGINE.md). So the era-3+ sky after
//   14,000 km is a different sky of the same kind.
// Plain Node. PLANT=still | early (TWIST_PLANTS in rules.js): must FAIL.  Run: node tests/sim-twists.cjs
(async () => {
  const R = await import('../src/sim/rules.js');
  const { createWorld } = await import('../src/sim/world.js');
  const { HAZARDS, STORMS, CLIMATE } = await import('../src/config.js');
  if (process.env.PLANT) R.TWIST_PLANTS[process.env.PLANT] = true;
  CLIMATE.dangerLine = Infinity;
  const fly = era => {
    const w = createWorld({ tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2, simSeed: 4,
      fleet: { plane: 'twin', planes: { twin: { engines: 4, body: 4, cabin: 4 } }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 } } }, 4);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.explain = () => false; w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
    w.kit.era = era;
    const cols = [], flocks = [], seen = new Set(), moves = { drift: 0, pulse: 0, turn: 0 }, early = [], last = new Map();
    for (let i = 0; i < 2000000 && w.state === 'playing' && w.distancePx < 32000; i++) {
      if (w.plane.y > 220 && w.plane.vy > -40) w.applyFlap();
      for (const st of w.storms) {
        if (!seen.has(st)) { seen.add(st); cols.push({ km: Math.round(w.distancePx), noFly: !!st.noFly, gap: Math.round(st.rects[1].y - st.rects[0].height), c: Math.round(st.rects[0].height + (st.rects[1].y - st.rects[0].height) / 2) });
          if (st.drift && w.distancePx < HAZARDS.noFly.drift.from) early.push(`drift at ${Math.round(w.distancePx)}`);
          if (st.pulse && w.distancePx < STORMS.pulse.from) early.push(`pulse at ${Math.round(w.distancePx)}`); }
        const h = st.rects[0].height, p = last.get(st);
        if (p !== undefined && Math.abs(h - p) > 1e-9) { if (st.drift) moves.drift++; else if (st.pulse) moves.pulse++; else moves.other = (moves.other || 0) + 1; }
        last.set(st, h);
      }
      for (const f of w.birds) { if (!seen.has(f)) { seen.add(f); flocks.push(Math.round(w.distancePx)); if (f.turn && w.distancePx < HAZARDS.birds.turn.from) early.push(`turn at ${Math.round(w.distancePx)}`); }
        if (f.turn && f.turn.left > 0) moves.turn++; }
      w.step(16.67 / 1000);
    }
    return { cols, flocks, moves, early };
  };
  const off = fly(2), on = fly(5), fails = [];
  if (off.moves.drift || off.moves.pulse || off.moves.turn || off.moves.other) fails.push(`era 2: something moved ${JSON.stringify(off.moves)}`);
  if (!(on.moves.drift > 0)) fails.push('era 5: no no-fly gap drifted');
  if (!(on.moves.pulse > 0)) fails.push('era 5: no storm gap pulsed');
  if (!(on.moves.turn > 0)) fails.push('era 5: no flock turned');
  if (on.early.length) fails.push(`era 5: twists before their start: ${on.early.slice(0, 4).join(', ')}`);
  const pre = a => a.filter(c => c.km < HAZARDS.noFly.drift.from);
  const A = JSON.stringify(pre(off.cols)), B = JSON.stringify(pre(on.cols));
  if (A !== B) fails.push('the columns before the first twist differ between era 2 and era 5 (a twist drew numbers or acted early)');
  const F = a => JSON.stringify(a.filter(k => k < HAZARDS.noFly.drift.from));
  if (F(off.flocks) !== F(on.flocks)) fails.push('the flocks before the first twist differ between era 2 and era 5');
  if (pre(off.cols).length < 40) fails.push(`only ${pre(off.cols).length} columns before the first twist: no power`);
  // The squeeze: a threshold only. Base chance before its `from` and at era 2; + add per `every` km after, capped.
  { const w = createWorld({ tutorialDone: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'twin', planes: { twin: {} }, systems: {}, gadgets: {} } }, 1);
    const Q = HAZARDS.squeeze, nf = HAZARDS.noFly.chance, at = (km, era) => { w.distancePx = km; w.kit.era = era; return +w.squeezed(nf, 'capNoFly').toFixed(4); };
    const got = [at(25999, 5), at(26000, 5), at(30000, 5), at(200000, 5), at(30000, 2)], want = [nf, nf + Q.add, nf + 2 * Q.add, Q.capNoFly, nf].map(x => +x.toFixed(4));
    if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(`squeeze: no-fly chance at 25,999/26,000/30,000/200,000 km (era 5) and 30,000 (era 2) = ${got}, want ${want}`); }
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: twists move only from their era and distance, and draw nothing (era 5 moves: ${JSON.stringify(on.moves)}; ${pre(on.cols).length} columns match before the first twist)`);
})();
