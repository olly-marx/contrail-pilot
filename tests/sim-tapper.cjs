// The perfect tapper must be able to say "impossible" (sim engine, 2026-10-26). A gate that cannot fail is not a
// gate: take a real recorded sky (Comet, seed 1, the first 900 km), check the search finds no impossible moment in
// it, then narrow ONE storm's gap to 30 px in every frame (the 27 px picture plus its tilt cannot pass) and check
// the search names that storm as impossible under every tap model; and the gap-to-gap pass must find trap exits in
// a planted top-then-bottom storm pair. Plain Node.
// Run: node tests/sim-tapper.cjs
(async () => {
  const T = await import('../tools/sim/tapper.mjs');
  const sky = T.recordSky({ fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }, 1, 900);   // 900 km: long enough for the second storm to reach the plane
  const fails = [];
  const clean = T.classify({ start: null, frames: sky.frames });
  if (clean.length) fails.push(`the real sky should have no hard moment in its first 900 km, got ${clean.length}: ${clean.map(c => c.category + ' ' + c.obstacle).join(', ')}`);
  // Plant: the first storm the plane meets gets a 30 px gap (same middle), in every frame it appears.
  const target = sky.frames.flatMap(f => f.storms).find(st => !st.noFly);
  if (!target) fails.push('no storm in the first 900 km to plant in');
  else {
    const planted = { start: null, frames: sky.frames.map(f => ({ ...f, storms: f.storms.map(st => {
      if (st.id !== target.id) return st;
      const mid = (st.rects[0].height + st.rects[1].y) / 2, top = mid - 15, bot = mid + 15;
      return { ...st, noFly: true, rects: [{ ...st.rects[0], height: top }, { ...st.rects[1], y: bot, height: 464 - bot }] };   // a solid block: no fluff holes
    }) })) };
    const res = T.classify(planted), hit = res.find(r => r.obstacle.includes(`:${target.id}`));
    if (!hit) fails.push(`the planted 30 px gap (storm ${target.id}) was NOT found: ${JSON.stringify(res.map(r => [r.obstacle, r.category]))}`);
    else if (hit.category !== 'impossible') fails.push(`the planted 30 px gap was rated "${hit.category}", not impossible`);
  }
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
    const rows = T.gapToGap(shaped, [3]).filter(r => r.A === two[0] && r.B === two[1]);
    if (!rows.length) fails.push('the planted storm pair was not analysed');
    else if (!(rows[0].traps[3] > 0)) fails.push(`no trap exits found in the planted top-then-bottom pair: ${JSON.stringify(rows[0])}`);
    else if (!(rows[0].traps[3] < rows[0].exits)) fails.push(`every exit is a trap in the planted pair, so it says nothing about exit height: ${JSON.stringify(rows[0])}`);
  } else fails.push('fewer than 2 storms in the first 900 km');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS: no hard moment in a real 900 km sky; a planted 30 px gap is found and rated impossible; a planted top-then-bottom storm pair shows trap exits (some, not all)');
})();
