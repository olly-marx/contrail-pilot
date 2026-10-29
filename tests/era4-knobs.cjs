// The era 4 kit knobs in the flight rules (the sim chat's conditions, 2026-10-28). No browser. Run: node tests/era4-knobs.cjs
//  1. noFlyGapAdd: ATC 8 (noFlyGapAdd 10) against ATC 7 (0) on the same sky: every no-fly gap is 10 px wider (x kit.gaps,
//     rounded: 10-11 px), and nothing else about the sky changes.
//  2. nightHeatMul 0.5 halves breakdown.night on the same crashes-off flight (to a fixed 6,000 km).
//  3. cleanSecs 6 with cleanHeld: the meter refills to 6 s each night; while it runs down the plane is in icy air and makes
//     no contrail; it never runs more than 6 s a night.
//  Plants (each must FAIL): PLANT=gapAdd | nightHeat | clean ignores that knob (src/sim/physics.js KNOB_PLANTS).
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  const S = await import(src('sim/simulate.js')), P = await import(src('sim/physics.js')), F = await import(src('fleet.js'));
  if (process.env.PLANT) P.KNOB_PLANTS[process.env.PLANT] = true;
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = (sys, plane = 'dreamliner') => ({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, flightSeconds: 1e7,
    fleet: { plane, planes: { comet: {}, [plane]: {} }, systems: sys, gadgets: {} } });
  // 1. no-fly gaps
  const gaps = sys => { const seen = new Map();
    S.simulate(save(sys), { pilot: 'careful', seed: 3, maxKm: 16000, onStep: w => { for (const st of w.storms) if (st.noFly && !seen.has(st)) seen.set(st, st.rects[1].y - st.rects[0].height); } });
    return [...seen.values()]; };
  // (on the twin: a plane with no no-fly help of its own, so the two flights differ ONLY by ATC 8's +10; the 787 has +8 itself)
  const gapsOn = (sys) => { const seen = new Map();
    S.simulate(save(sys, 'twin'), { pilot: 'careful', seed: 3, maxKm: 16000, onStep: w => { for (const st of w.storms) if (st.noFly && !seen.has(st)) seen.set(st, st.rects[1].y - st.rects[0].height); } });
    return [...seen.values()]; };
  const g7 = gapsOn({ atc: 7 }), g8 = gapsOn({ atc: 8 });
  check(g7.length > 3 && g7.length === g8.length, `no-fly zones: ${g7.length} vs ${g8.length} (want the same sky, > 3 zones)`);
  const d = g8.map((v, i) => v - g7[i]);
  check(d.length && d.every(x => x >= 10 && x <= 11), `no-fly gaps wider by ${[...new Set(d)].join('/')} px, want 10-11`);
  // 2. night heat
  const night = mul => S.simulate(save({}), { pilot: 'careful', seed: 5, maxKm: 6000, onStep: w => { w.kit.nightHeatMul = mul; } }).breakdown.night;
  const n1 = night(1), nh = night(0.5);
  check(n1 > 1 && Math.abs(nh / n1 - 0.5) < 0.02, `night heat ${n1} -> ${nh} with nightHeatMul 0.5 (want half)`);
  // 3. contrail-free cruise
  let refills = 0, bad = 0, used = 0, over = 0, perNight = 0, prev = null;
  S.simulate(save({ ops: 8 }), { pilot: 'careful', seed: 7, maxKm: 15000, onStep: w => {
    w.cleanHeld = true;
    if (prev && w.cleanLeft > prev.left) { refills++; check(w.cleanLeft > 6000 - 17 && w.cleanLeft <= 6000, `meter refilled to ${w.cleanLeft} ms, want 6000 (less at most one frame)`); perNight = 6000 - w.cleanLeft; }
    if (prev && w.cleanLeft < prev.left) { used++; perNight += prev.left - w.cleanLeft; if (w.contrails.length > prev.n) bad++; if (!w.wasInIssr) bad++; }
    if (perNight > 6000 + 1e-6) over++;
    prev = { left: w.cleanLeft, n: w.contrails.length };
  } });
  check(refills >= 1, `the clean-cruise meter never refilled at night (${refills})`);
  check(used > 30, `contrail-free cruise never ran (${used} steps)`);
  check(!bad, `${bad} steps made a contrail or left icy air while the meter ran`);
  check(!over, 'the meter ran more than 6 s in a night');
  if (fails.length) { console.log(`FAIL era4-knobs\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS era4-knobs: no-fly gaps +${d[0]} px (${d.length} zones), night heat x${(nh / n1).toFixed(3)}, clean cruise ${used} steps over ${refills} nights`);
})();
