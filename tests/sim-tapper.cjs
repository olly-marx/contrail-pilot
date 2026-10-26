// The perfect tapper must be able to say "impossible" (sim engine, 2026-10-26). A gate that cannot fail is not a
// gate: take a real recorded sky (Comet, seed 1, the first 600 km), check the search finds no impossible moment in
// it, then narrow ONE storm's gap to 30 px in every frame (the 27 px picture plus its tilt cannot pass) and check
// the search names that storm as impossible under every tap model. Plain Node.
// Run: node tests/sim-tapper.cjs
(async () => {
  const T = await import('../tools/sim/tapper.mjs');
  const sky = T.recordSky({ fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } }, 1, 600);
  const fails = [];
  const clean = T.classify({ start: null, frames: sky.frames });
  if (clean.length) fails.push(`the real sky should have no hard moment in its first 600 km, got ${clean.length}: ${clean.map(c => c.category + ' ' + c.obstacle).join(', ')}`);
  // Plant: the first storm the plane meets gets a 30 px gap (same middle), in every frame it appears.
  const target = sky.frames.flatMap(f => f.storms).find(st => !st.noFly);
  if (!target) fails.push('no storm in the first 600 km to plant in');
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
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS: no hard moment in a real 600 km sky; a planted 30 px gap is found and rated impossible');
})();
