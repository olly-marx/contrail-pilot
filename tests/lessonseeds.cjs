// A lesson flight always offers seeds a beginner will pick up (the user's playtest, 2026-10-29: "I landed my second flight with
// none... shouldn't be possible"; the results said 'Seeds grabbed 0' and the captain said "You landed with your seeds"). Engine:
//   1. season 2 with L1 (or L2) next: TOKENS.lessonSeeds seeds are placed at the plane's height, never inside a storm column, and
//      a pilot who just flies level (storms off) picks them up;
//   2. once the lessons are past L2, and in flight school, none are placed (so later flights are unchanged);
//   3. the rails' R9a words: 0 seeds never says "your seeds".
// Run: node tests/lessonseeds.cjs   (proved by planted defects)
globalThis.SEASON2 = true;
(async () => {
  const { createWorld } = await import('../src/sim/world.js'), { TOKENS, STORMS, WIDTH } = await import('../src/config.js'), { tip } = await import('../src/tips.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = done => ({ areas: ['weurope'], homeArea: 'weurope', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, priceVersion: 2, landings: 1, flights: 1, missionsDone: done, fuel: 'kerosene',
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const fly = (done, seed) => {
    const w = createWorld(save(done), seed);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
    w.hitsStorm = () => false; w.storms = []; w.nextStormAt = 1e12;   /* a level beginner: no storms to dodge */
    const start = w.cargo || 0; w.step(1 / 60); const first = w.lessonSeeds || 0;   /* (w.tokens is re-filtered every step: count from the engine's own lessonSeeds) */
    for (let i = 0; i < 60 * 40 && w.state === 'playing'; i++) { if (w.plane.y > 220) w.applyFlap(); w.step(1 / 60); }
    return { placed: { length: first - (w.lessonSeeds || 0) }, got: (w.cargo || 0) - start, km: Math.round(w.distancePx) };
  };
  for (const seed of [1, 2, 3]) {
    const a = fly([], seed);   /* L1 next */
    check(a.placed.length === TOKENS.lessonSeeds, `seed ${seed}, L1 next: ${TOKENS.lessonSeeds} seeds placed (${a.placed.length}, ${a.km} px)`);
    check(a.got >= TOKENS.lessonSeeds, `seed ${seed}, L1 next: a level pilot picks them up (cargo +${a.got})`);
    const b = fly(['L1'], seed);   /* L2 next */
    check(b.placed.length === TOKENS.lessonSeeds, `seed ${seed}, L2 next: seeds placed too (${b.placed.length})`);
    const c = fly(['L1', 'L2'], seed);   /* L3 next: unchanged */
    check(c.placed.length === 0, `seed ${seed}, L3 next: none placed (${c.placed.length})`);
  }
  // Never inside a storm column: with storms ON, every placed seed is clear of every storm's x at the moment it appears.
  const w = createWorld(save([]), 7); for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60);
  w.hitsStorm = () => false; let bad = 0, n = 0; const tagged = new Set();
  for (let i = 0; i < 60 * 40 && w.state === 'playing'; i++) { if (w.plane.y > 220) w.applyFlap(); w.step(1 / 60);
    if (w.lessonSeeds < (tagged.last ?? TOKENS.lessonSeeds)) { n++; if (w.storms.some(st => Math.abs(st.rects[0].x - (WIDTH + 10)) < STORMS.width)) bad++; } tagged.last = w.lessonSeeds; }
  check(n > 0 && bad === 0, `with storms: ${n} placed, ${bad} inside a storm column`);
  check(!/your seeds/i.test(tip('rail-seeds-none')) && /No seeds/.test(tip('rail-seeds-none')), 'the 0-seed words do not say "your seeds"');
  const tour = require('fs').readFileSync(`${__dirname}/../src/tour.js`, 'utf8');
  check(/tip\(this\.ui\.lastGrab > 0 \? 'rail-seeds' : 'rail-seeds-none'\)/.test(tour), 'R9a picks its words from the seeds grabbed');
  console.log(fails.length ? `FAIL lessonseeds:\n - ${fails.join('\n - ')}` : `PASS lessonseeds: ${TOKENS.lessonSeeds} seeds placed and picked up on L1/L2 flights, none after; clear of storms; 0-seed words`);
  process.exit(fails.length ? 1 : 0);
})();
