// The gap-to-gap (trap) pass must find TRAPS when they exist (sim engine, 2026-10-26). MANUAL, ~18 min: moved out
// of tests/sim-tapper.cjs because gapToGap costs ~2 s per exit (511 exits) and the suite runs every tests/*.cjs.
// Trap exits are rare (y, vy) pairs: a sparser sample (every 200th exit) found none, so do not thin it to make it fast.
// Run: node tools/sim/check-gap-to-gap.mjs   (exit 1 on failure)
import * as T from './tapper.mjs';
const sky = T.recordSky({ fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }, 1, 900);
const fails = [];
// The gap-to-gap pass must find TRAPS when they exist: plant two consecutive storms as solid blocks, the first
// with its gap at the very top, the second at the very bottom, so close behind that a plane leaving the first gap
// high cannot fall to the second in time, while one leaving it at its bottom edge can.
const two = sky.frames.flatMap(f => f.storms).filter(st => !st.noFly).map(st => st.id).filter((v, i, a) => a.indexOf(v) === i).slice(0, 2);
if (two.length === 2) {
  const shaped = { start: null, frames: sky.frames.map(f => ({ ...f, storms: f.storms.map(st => {
    const k = two.indexOf(st.id); if (k < 0) return st;
    const [top, bot] = k === 0 ? [20, 150] : [314, 444];   // gap A: 20-150 (high); gap B: 314-444 (low)
    return { ...st, noFly: true, rects: [{ ...st.rects[0], height: top }, { ...st.rects[1], y: bot, height: 464 - bot }] };
  }) })) };
  const rows = T.gapToGap(shaped, [9]).filter(r => r.A === two[0] && r.B === two[1]);
  if (!rows.length) fails.push('the planted storm pair was not analysed');
  else if (!(rows[0].traps[9] > 0)) fails.push(`no trap exits found in the planted top-then-bottom pair: ${JSON.stringify(rows[0])}`);
  else if (!(rows[0].traps[9] < rows[0].exits)) fails.push(`every exit is a trap in the planted pair, so it says nothing about exit height: ${JSON.stringify(rows[0])}`);
} else fails.push('fewer than 2 storms in the first 900 km');
if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
console.log('PASS: a planted top-then-bottom storm pair shows trap exits (some, not all)');
