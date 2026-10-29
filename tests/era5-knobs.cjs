// The era 5 kit knob in the flight rules (the sim chat's conditions, 2026-10-28). No browser. Run: node tests/era5-knobs.cjs
//  Bird detection (Sensors 10, birdWobbleMul 0.35): every flock bobs +- wobble x 0.35 (22 x 0.35 = 7.7 px), not the full 22.
//  Plant (tools/plants.tsv): the multiplier ignored -> the bob is +-22 -> FAIL.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  const S = await import(src('sim/simulate.js')), { HAZARDS } = await import(src('config.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const bob = gad => { let worst = 0, n = 0;
    S.simulate({ tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, flightSeconds: 1e7,
      fleet: { plane: 'truss', planes: { comet: {}, truss: {} }, systems: {}, gadgets: { sensors: gad } } },
      { pilot: 'careful', seed: 4, maxKm: 16000, onStep: w => { for (const f of w.birds) { const b = f.birds[0]; if (b.y == null) continue; worst = Math.max(worst, Math.abs(b.y - Math.round(f.y + b.oy))); n++; } } });
    return { worst, n }; };
  const want = HAZARDS.birds.wobble * 0.35, det = bob(10), none = bob(0);
  check(det.n > 100 && none.n > 100, `too few flock frames (${det.n}, ${none.n})`);
  check(det.worst <= want + 1.5 && det.worst >= want - 2, `bird detection 10: bob +-${det.worst} px, want +-${want.toFixed(1)}`);
  check(none.worst >= HAZARDS.birds.wobble - 2, `no detection: bob +-${none.worst} px, want +-${HAZARDS.birds.wobble}`);
  if (fails.length) { console.log(`FAIL era5-knobs\n  ${fails.join('\n  ')}`); process.exit(1); }
  console.log(`PASS era5-knobs: flocks bob +-${det.worst} px with bird detection 10 (+-${none.worst} without)`);
})();
