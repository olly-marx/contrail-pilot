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
  // Cheap but complete: the strictest tap model (9 frames between taps) finding no dead end means every model passes.
  const clean = T.search({ start: null, frames: sky.frames }, 9);
  if (clean.length) fails.push(`the real sky should be comfortable in its first 900 km, but taps 150 ms apart die at: ${clean.map(c => c.obstacle + ' ' + c.km + ' km').join(', ')}`);
  // Plant: the first storm the plane meets gets a 30 px gap (same middle), in every frame it appears.
  const target = sky.frames.flatMap(f => f.storms).find(st => !st.noFly);
  if (!target) fails.push('no storm in the first 900 km to plant in');
  else {
    const planted = { start: null, frames: sky.frames.map(f => ({ ...f, storms: f.storms.map(st => {
      if (st.id !== target.id) return st;
      const mid = (st.rects[0].height + st.rects[1].y) / 2, top = mid - 15, bot = mid + 15;
      return { ...st, noFly: true, rects: [{ ...st.rects[0], height: top }, { ...st.rects[1], y: bot, height: 464 - bot }] };   // a solid block: no fluff holes
    }) })) };
    // Impossible = dead even when a tap is allowed on ANY frame (the most generous model).
    const res = T.search(planted, 1), hit = res.find(r => r.obstacle.includes(`:${target.id}`));
    if (!hit) fails.push(`the planted 30 px gap (storm ${target.id}) was NOT found impossible: ${JSON.stringify(res.map(r => r.obstacle))}`);
  }
  // The trap pass (gapToGap) has its own gate, tools/sim/check-gap-to-gap.mjs: ~18 min, too slow for the suite.
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS: no hard moment in a real 900 km sky; a planted 30 px gap is found and rated impossible');
})();
