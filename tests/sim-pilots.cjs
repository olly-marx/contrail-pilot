// Simulation engine, landing 0 (2026-10-25): the test pilots and the seeded random numbers moved out of
// tools/balance.cjs into src/sim/. This checks the move changed nothing: on thousands of made-up flights,
// src/sim/pilots.js picks the same height as the code balance.cjs had (copied below, frozen), and
// src/sim/rng.js gives the same numbers as balance.cjs's Math.random. Plain Node, no browser.
// Run: node tests/sim-pilots.cjs
const SKY_H = 512 - 48;
const DAYNIGHT_KEYS = ['daySeconds', 'nightSeconds', 'blendSeconds'];

// --- frozen copy of tools/balance.cjs as of 2026-10-25, with the plane build's uncommitted careful pilot (s = the scene) ---
function oldTarget(s, pilot, DAYNIGHT) {
  const goodDay = () => { const c = s.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds);
    return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - s.kit.contrailLife / 1000; };
  if (pilot === 'straight') return 200;
  const st = s.storms.filter(t => t.rects[0].x + t.rects[0].width > s.plane.x - 4 && t.rects[0].x < s.plane.x + 160)[0];
  const lo = st ? st.rects[0].height + 6 : 30, hi = st ? st.rects[1].y - 20 : SKY_H - 60;
  let best = (lo + hi) / 2, bestScore = -1e9;
  const seen = i => pilot !== 'careful' || i.alpha > (s.kit.hiddenAlpha || 0) + 0.01;
  const ahead = s.issrs.filter(i => seen(i) && i.x < s.plane.x + 220 && i.x + i.width > s.plane.x - 10);
  const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
  const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
  for (let y = lo; y <= hi; y += 4) {
    const score = (goodDay() ? Math.min(depth(y), 40) : Math.min(room(y), 60)) - Math.abs(y - s.plane.y) * 0.05;
    if (score > bestScore) { bestScore = score; best = y; }
  }
  return best;
}
function oldRandom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// --- end of frozen copy ---

(async () => {
  const { pilotTarget, PILOTS } = await import('../src/sim/pilots.js');
  const { makeRng } = await import('../src/sim/rng.js');
  const { DAYNIGHT } = await import('../src/config.js');
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };

  // Random numbers: same sequence for several seeds.
  for (const seed of [0, 1, 2, 3, 12345, 0xffffffff]) {
    const a = makeRng(seed), b = oldRandom(seed);
    let same = true; for (let i = 0; i < 10000; i++) if (a() !== b()) { same = false; break; }
    check(same, `rng seed ${seed}: differs from balance.cjs's Math.random`);
  }

  // Pilots: made-up flights covering day and night, storms near and far, icy air revealed and hidden.
  const r = oldRandom(99), between = (lo, hi) => lo + r() * (hi - lo);
  let n = 0, differ = 0;
  for (let k = 0; k < 4000; k++) {
    const f = {
      plane: { x: 60, y: between(0, SKY_H) },
      clock: between(0, 4 * (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds)),
      kit: { contrailLife: between(3000, 12000), hiddenAlpha: r() < 0.5 ? 0 : between(0, 0.3) },
      storms: Array.from({ length: Math.floor(r() * 3) }, () => { const x = between(-80, 400), top = between(20, 200), gap = between(80, 180);
        return { rects: [{ x, y: 0, width: 52, height: top }, { x, y: top + gap, width: 52, height: SKY_H - top - gap }] }; }),
      issrs: Array.from({ length: Math.floor(r() * 5) }, () => ({ x: between(-100, 400), y: between(0, SKY_H - 40), width: between(40, 200), height: between(20, 120), alpha: r() })),
    };
    for (const p of PILOTS) { n++; if (pilotTarget(f, p) !== oldTarget(f, p, DAYNIGHT)) differ++; }
  }
  check(differ === 0, `pilots: ${differ} of ${n} made-up flights pick a different height than balance.cjs did`);
  check(DAYNIGHT_KEYS.every(k => typeof DAYNIGHT[k] === 'number'), 'config DAYNIGHT has the day/night lengths the pilots use');

  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: rng matches balance.cjs on 6 seeds; pilots identical on ${n} made-up flights`);
})();
