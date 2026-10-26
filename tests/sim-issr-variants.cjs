// The icy-air spawn variants do what they say, and keep the amount of icy air (sim engine, 2026-10-26).
// 3 flights x 15,000 km per variant (Comet, crashes off, heat off). Checks against today's rule:
//   thin  (thinK 0.4):     patches ~0.4 x as tall (+-15%), the same area per 10,000 km (+-10%), the same night share;
//   lane  (laneExtra 40):  the 10th-percentile clear lane through storm gaps >= the rule (plane + clearLane + 40);
//   reveal (revealBoost 3): exactly today's sky, and a patch 100 px away is shown (today it is hidden beyond 50 px; the fade keeps the outer quarter of the range hidden).
// PLANT=1 passes the switches as no-ops (thinK 1, laneExtra 0, revealBoost 1): must FAIL. Plain Node.
// Run: node tests/sim-issr-variants.cjs
(async () => {
  const { measure } = await import('../tools/sim/issr-variants.mjs');
  const P = await import('../src/sim/physics.js');
  const { ISSR } = await import('../src/config.js');
  const plant = !!process.env.PLANT, o = { flights: 3, km: 15000 };
  const V = plant ? { thin: { thinK: 1 }, lane: { laneExtra: 0 }, reveal: { revealBoost: 1 } } : { thin: { thinK: 0.4 }, lane: { laneExtra: 40 }, reveal: { revealBoost: 3 } };
  const today = measure({}, o), thin = measure(V.thin, o), lane = measure(V.lane, o), reveal = measure(V.reveal, o);
  const fails = [], near = (a, b, f) => Math.abs(a - b) <= f * Math.abs(b);
  if (!near(thin.meanH, 0.4 * today.meanH, 0.15)) fails.push(`thin: mean height ${thin.meanH}, want ~${Math.round(0.4 * today.meanH)}`);
  if (!near(thin.areaPer10k, today.areaPer10k, 0.10)) fails.push(`thin: area ${thin.areaPer10k} vs today ${today.areaPer10k}`);
  if (!(lane.laneP10 >= lane.minLaneRule) || !(lane.minLaneRule > today.minLaneRule)) fails.push(`lane: p10 lane ${lane.laneP10} px, rule ${lane.minLaneRule} (today's rule ${today.minLaneRule})`);
  if (JSON.stringify(reveal) !== JSON.stringify(today)) fails.push('reveal: the sky changed (it should only change when icy air is shown)');
  for (const [k, m] of [['thin', thin], ['lane', lane]]) if (Math.abs(m.nightShare - today.nightShare) > 0.05) fails.push(`${k}: night share ${m.nightShare} vs today ${today.nightShare}`);
  // Reveal distance: a patch 100 px ahead, hidden today, shown with the variant.
  const f = { kit: { revealPx: ISSR.revealPx, hiddenAlpha: 0 } }, i = { x: 60 + 50 + 100, y: 100, width: 100, height: 60 }, box = { x: 60, y: 100, w: 50, h: 12 };
  const keep = ISSR.revealBoost; ISSR.revealBoost = V.reveal.revealBoost;
  const shown = P.issrAlpha(f, i, box, false) > 0; ISSR.revealBoost = keep; if (keep === undefined) delete ISSR.revealBoost;
  if (!shown) fails.push('reveal: a patch 100 px ahead is still hidden');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: thin ${thin.meanH}/${today.meanH} px tall, area ${thin.areaPer10k}/${today.areaPer10k}; lane p10 ${lane.laneP10} >= ${lane.minLaneRule}; reveal: the same sky, shown from 100 px`);
})();
