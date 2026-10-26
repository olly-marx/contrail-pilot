// The perfect tapper (sim engine, 2026-10-26): which obstacles can be flown at all, and how fast you must tap.
//
// 1. RECORD a sky. One reference flight (crashes off, airports out of reach, turbulence off because its kicks
//    depend on the plane) records, frame by frame, every storm / no-fly zone and every bird exactly as the
//    collision tests see them. Storms, no-fly zones and birds do not depend on where the plane is, so this IS
//    the sky for every possible tap sequence.
// 2. SEARCH. A plane is only taps: a tap sets vy = PLANE.flapVelocity, then the game's own free flight
//    (RULES.freeFall: gravity, the ceiling) moves it, and the game's own pixel tests (P.hitsStorm, P.hitBird)
//    and the ground decide a crash. Frame by frame we keep EVERY state (y, vy, frames until it may tap again)
//    that has not crashed (merged within 0.5 px and 1 px/s). If no state survives, that moment is impossible
//    for this tap model; we count it, name the obstacle, and carry on from every safe state.
// 3. TAP MODELS: a tap may follow the last one after at least 1 frame (any frame), 3 frames (50 ms),
//    6 (100 ms) or 9 (150 ms). An obstacle is: impossible (fails even at 1 frame), frame-perfect only (needs
//    < 50 ms), expert (50-100), hard (100-150), comfortable (>= 150 ms between taps is enough).
// Run: node tools/sim/tapper.mjs      PLANE=comet|jumbo|twin  KM=10000  SEEDS=1,2,3
import { createWorld } from '../../src/sim/world.js';
import { RULES } from '../../src/sim/rules.js';
import * as P from '../../src/sim/physics.js';
import { PLANE, HAZARDS, HEIGHT, GROUND_H } from '../../src/config.js';

const SKY_H = HEIGHT - GROUND_H, DT = 16.67 / 1000;
const MODELS = [1, 3, 6, 9];   // minimum frames between taps
const NAMES = ['impossible', 'frame-perfect only (< 50 ms)', 'expert (50-100 ms)', 'hard (100-150 ms)'];
const SAVES = {
  comet: { fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } },
  jumbo: { fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} } },
  twin: { fleet: { plane: 'twin', planes: { twin: {} }, systems: {}, gadgets: {} } },
};

// 1. A sky: per frame, the storms and birds the collision tests would see, and the distance and speed.
export function recordSky(save, seed, km) {
  const turb = HAZARDS.turbulence.chance; HAZARDS.turbulence.chance = 0;   // its kicks depend on the plane
  try {
    const w = createWorld({ tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2, ...save }, seed);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
    w.explain = () => false; w.nextAirport.worldX = 1e12;
    w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
    while (w.inGrace()) w.step(DT);   // the breather after take-off: the autopilot flies it
    let ids = 0; const id = new WeakMap(), tag = o => { if (!id.has(o)) id.set(o, ++ids); return id.get(o); };
    const frames = [], start = { y: w.plane.y, vy: w.plane.vy };
    while (w.distancePx < km && w.state === 'playing') {
      if (w.plane.y > 200 && w.plane.vy > -40) w.applyFlap();   // any path: the sky does not depend on it
      w.step(DT);
      frames.push({ km: w.distancePx, speed: w.speed,
        storms: w.storms.map(st => ({ id: tag(st), noFly: !!st.noFly, pics: st.pics, rects: st.rects.map(r => ({ ...r })) })),
        birds: w.birds.map(f => ({ id: tag(f), birds: f.birds.map(b => ({ x: b.x, y: b.y, key: b.key, flip: b.flip })) })) });
    }
    return { start, frames };
  } finally { HAZARDS.turbulence.chance = turb; }
}

// The plane after one frame from state s, tapping or not, with the game's own free flight.
const fallBody = { nextAirport: { worldX: 1e12 }, distancePx: 0, storms: [], kit: { flare: 1 }, speed: 1, spriteBottom: RULES.spriteBottom, freeFall: RULES.freeFall };
function move(s, tap) {
  const f = { ...fallBody, plane: { x: PLANE.x, y: s.y, vy: tap ? PLANE.flapVelocity : s.vy } };
  f.freeFall(DT);
  return f.plane;
}
// Does a plane at (y, vy) crash in this frame's sky? The game's ground and pixel tests.
const offsets = { planeOffsets: null };
function crashes(plane, fr) {
  if (plane.y - PLANE.spriteOffY + PLANE.spriteH >= SKY_H) return 'ground';
  const g = { pose: P.planePose({ plane, state: 'playing', airborne: true, autoUntil: 0, gameTime: 0 }), gameTime: 0, planeOffsets: offsets.planeOffsets };
  const pts = () => { const p = P.planePixels(g); offsets.planeOffsets = g.planeOffsets; return p; };
  for (const st of fr.storms) if (P.hitsStorm(g, st, pts)) return st.noFly ? 'no-fly' : 'storm';
  const box = { x: plane.x, y: plane.y, w: PLANE.w, h: PLANE.h };
  if (P.hitBird({ birds: fr.birds }, box, pts)) return 'birds';
  return null;
}

// 2. The search for one tap model. Returns the moments where nothing survives, with what was in the way.
export function search(sky, minGap) {
  let states = [{ y: sky.start.y, vy: sky.start.vy, cd: 0 }];
  const dead = [];
  for (let t = 0; t < sky.frames.length; t++) {
    const fr = sky.frames[t], next = new Map(), why = {};
    for (const s of states) for (const tap of s.cd === 0 ? [false, true] : [false]) {
      const p = move(s, tap), c = crashes(p, fr);
      if (c) { why[c] = (why[c] || 0) + 1; continue; }
      const cd = tap ? minGap - 1 : Math.max(0, s.cd - 1), key = `${Math.round(p.y * 2)},${Math.round(p.vy)},${cd}`;
      if (!next.has(key)) next.set(key, { y: p.y, vy: p.vy, cd });
    }
    if (!next.size) {
      // Nothing survives: name what is in the plane's way, then carry on from every height that is safe now.
      const near = fr.storms.filter(st => st.rects[0].x < PLANE.x + PLANE.w + 20 && st.rects[0].x + st.rects[0].width > PLANE.x - 20);
      dead.push({ frame: t, km: Math.round(fr.km), speed: Math.round(fr.speed), why, obstacle: near.map(st => (st.noFly ? 'no-fly:' : 'storm:') + st.id).join('+') || (fr.birds.length ? 'birds' : 'other'),
        gap: near.map(st => Math.round(st.rects[1].y - st.rects[0].height)).join('+') });
      for (let y = 0; y < SKY_H; y += 2) for (const vy of [PLANE.flapVelocity, 0, 200]) { const p = { x: PLANE.x, y, vy }; if (!crashes(p, fr)) next.set(`${y * 2},${vy},0`, { y, vy, cd: 0 }); }
    }
    states = [...next.values()];
  }
  return dead;
}

// 3. Classify each obstacle that failed under any model by the most generous model it still failed.
export function classify(sky) {
  const fails = MODELS.map(k => search(sky, k));
  const byObstacle = new Map();
  fails.forEach((list, m) => { for (const d of list) { const k = d.obstacle; if (!byObstacle.has(k)) byObstacle.set(k, { ...d, worst: m, at: [] }); const o = byObstacle.get(k); o.at.push(MODELS[m]); o.worst = Math.min(o.worst, m); } });
  return [...byObstacle.values()].map(o => ({ ...o, category: NAMES[o.worst] }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const plane = process.env.PLANE || 'comet', KM = Number(process.env.KM || 10000), seeds = (process.env.SEEDS || '1,2,3').split(',').map(Number);
  for (const seed of seeds) {
    const t0 = Date.now(), sky = recordSky(SAVES[plane], seed, KM), res = classify(sky);
    const count = Object.fromEntries(NAMES.map(n => [n, res.filter(r => r.category === n).length]));
    console.log(`${plane} seed ${seed}: ${sky.frames.length} frames (${KM} km) in ${((Date.now() - t0) / 1000).toFixed(1)} s`, JSON.stringify(count));
    for (const r of res.sort((a, b) => a.km - b.km)) console.log(`   ${String(r.km).padStart(6)} km  speed ${r.speed}  ${r.category.padEnd(30)} ${r.obstacle} gap ${r.gap}  fails at min tap gap ${r.at.join(',')} frames  (crashes: ${JSON.stringify(r.why)})`);
  }
}
