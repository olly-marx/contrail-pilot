// The perfect tapper (sim engine, 2026-10-26): which obstacles can be flown at all, and how fast you must tap.
//
// 1. RECORD a sky. One reference flight (crashes off, airports out of reach, turbulence off because its kicks
//    depend on the plane) records, frame by frame, every storm / no-fly zone and every bird exactly as the
//    collision tests see them. CORRECTION (measured 2026-10-26): the sky is NOT the same for every tap sequence.
//    Each contrail puff draws its +-1 px wobble from the physics random stream, so a path that makes a different
//    number of contrails shifts every later spawn (seed 1: the first 3 storm gaps match, then they part). So
//    results here describe real, typical skies, but each path would meet a different future after its first
//    contrails. Turbulence (off here) does the same.
// 2. SEARCH. A plane is only taps: a tap sets vy = PLANE.flapVelocity, then the game's own free flight
//    (RULES.freeFall: gravity, the ceiling) moves it, and the game's own pixel tests (P.hitsStorm, P.hitBird)
//    and the ground decide a crash. Frame by frame we keep EVERY state (y, vy, frames until it may tap again)
//    that has not crashed (merged within 1 px and 1 px/s). If no state survives, that moment is impossible
//    for this tap model; we count it, name the obstacle, and carry on from every safe state.
// 3. TAP MODELS: a tap may follow the last one after at least 1 frame (any frame), 3 frames (50 ms),
//    6 (100 ms) or 9 (150 ms). An obstacle is: impossible (fails even at 1 frame), frame-perfect only (needs
//    < 50 ms), expert (50-100), hard (100-150), comfortable (>= 150 ms between taps is enough).
// Run: node tools/sim/tapper.mjs      PLANE=comet|jumbo|twin  KM=10000  SEEDS=1,2,3
import { createWorld } from '../../src/sim/world.js';
import { RULES } from '../../src/sim/rules.js';
import * as P from '../../src/sim/physics.js';
import { PLANE, HAZARDS, HEIGHT, GROUND_H, CLIMATE } from '../../src/config.js';

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
  // Heat never changes what spawns (distance and the day/night clock do), only when a flight ends: so the recording
  // flight may not overheat, or late windows (birds from 10,000 km) would be cut off.
  const danger = CLIMATE.dangerLine; CLIMATE.dangerLine = Infinity;
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
  } finally { HAZARDS.turbulence.chance = turb; CLIMATE.dangerLine = danger; }
}

// The plane after one frame from state s, tapping or not, with the game's own free flight.
const body = { nextAirport: { worldX: 1e12 }, distancePx: 0, storms: [], kit: { flare: 1 }, speed: 1, plane: { x: PLANE.x, y: 0, vy: 0 },
  spriteBottom: RULES.spriteBottom, freeFall: RULES.freeFall };   // one reused body (no airport near: no flare)
function move(s, tap) {
  body.plane.y = s.y; body.plane.vy = tap ? PLANE.flapVelocity : s.vy;
  body.freeFall(DT);
  return { x: PLANE.x, y: body.plane.y, vy: body.plane.vy };
}
// Does a plane at (y, vy) crash in this frame's sky? The game's ground and pixel tests.
// Storm and no-fly hits depend only on the picture (pose: position and tilt), so states sharing a picture in the
// same frame share that answer (memoised per frame, with the picture's pixels). Birds are tested per state: the
// game's bird test pre-filters with the hitbox (plane.y), not the picture.
let memo = new Map(), memoFrame = null, planeOffsets = null;
function crashes(plane, fr) {
  if (plane.y - PLANE.spriteOffY + PLANE.spriteH >= SKY_H) return 'ground';
  const pose = P.planePose({ plane, state: 'playing', airborne: true, autoUntil: 0, gameTime: 0 });
  if (memoFrame !== fr) { memo = new Map(); memoFrame = fr; }
  const key = `${pose.x},${pose.y},${pose.rotation}`;
  let m = memo.get(key);
  if (!m) {
    const g = { pose, gameTime: 0, planeOffsets };
    m = { g, pts: null, storm: null };
    const pts = () => { if (!m.pts) { m.pts = P.planePixels(g); planeOffsets = g.planeOffsets; } return m.pts; };
    m.ptsFn = pts;
    // A storm's solid pixels lie only above its gap's top edge or below its bottom edge (its pictures stack out from
    // the gap; a no-fly zone is solid there). A picture wholly inside the gap cannot touch it: skip the pixel test.
    const r = pose.rotation, half = (PLANE.spriteW / 2) * Math.abs(Math.sin(r)) + (PLANE.spriteH / 2) * Math.cos(r) + 1;
    for (const st of fr.storms) {
      if (pose.y - half >= st.rects[0].height && pose.y + half <= st.rects[1].y) continue;
      if (P.hitsStorm(g, st, pts)) { m.storm = st.noFly ? 'no-fly' : 'storm'; break; }
    }
    memo.set(key, m);
  }
  if (m.storm) return m.storm;
  const box = { x: plane.x, y: plane.y, w: PLANE.w, h: PLANE.h };
  if (fr.birds.length && P.hitBird({ birds: fr.birds }, box, m.ptsFn)) return 'birds';
  return null;
}

// 2. The search for one tap model. Returns the moments where nothing survives, with what was in the way.
// Every height that is safe in frame fr, falling, level or just tapped: a window's generous start.
function safeStates(fr, next = new Map()) {
  for (let y = 0; y < SKY_H; y += 2) for (const vy of [PLANE.flapVelocity, 0, 200]) { const p = { x: PLANE.x, y, vy }; if (!crashes(p, fr)) next.set(`${y},${vy},0`, { y, vy, cd: 0 }); }
  return next;
}

export function search(sky, minGap) {
  let states = sky.start ? [{ y: sky.start.y, vy: sky.start.vy, cd: 0 }] : [...safeStates(sky.frames[0]).values()];
  const dead = [];
  for (let t = 0; t < sky.frames.length; t++) {
    const fr = sky.frames[t], next = new Map(), why = {};
    for (const s of states) for (const tap of s.cd === 0 ? [false, true] : [false]) {
      const p = move(s, tap), c = crashes(p, fr);
      if (c) { why[c] = (why[c] || 0) + 1; continue; }
      const cd = tap ? minGap - 1 : Math.max(0, s.cd - 1), key = `${Math.round(p.y)},${Math.round(p.vy)},${cd}`;   // merged within 1 px and 1 px/s
      if (!next.has(key)) next.set(key, { y: p.y, vy: p.vy, cd });
    }
    if (!next.size) {
      // Nothing survives: name what is in the plane's way, then carry on from every height that is safe now.
      const near = fr.storms.filter(st => st.rects[0].x < PLANE.x + PLANE.w + 20 && st.rects[0].x + st.rects[0].width > PLANE.x - 20);
      dead.push({ frame: t, km: Math.round(fr.km), speed: Math.round(fr.speed), why, obstacle: near.map(st => (st.noFly ? 'no-fly:' : 'storm:') + st.id).join('+') || (fr.birds.length ? 'birds' : 'other'),
        gap: near.map(st => Math.round(st.rects[1].y - st.rects[0].height)).join('+') });
      safeStates(fr, next);
    }
    states = [...next.values()];
    if (process.env.PROF && t % 50 === 0) console.log("frame", t, "states", states.length);
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

// Windows of WINDOW km starting at each of FROM (km), so that later hazards (no-fly zones from 8,000 km, birds from
// 10,000 km) are sampled without searching whole flights. Each window starts from every safe height.
if (import.meta.url === `file://${process.argv[1]}`) {
  const planes = (process.env.PLANES || 'comet,jumbo,twin').split(','), seeds = (process.env.SEEDS || '1,2,3').split(',').map(Number);
  const FROM = (process.env.FROM || '0,4000,8000,12000,16000').split(',').map(Number), WINDOW = Number(process.env.WINDOW || 2000);
  const all = [];
  for (const plane of planes) for (const seed of seeds) {
    const t0 = Date.now(), sky = recordSky(SAVES[plane], seed, Math.max(...FROM) + WINDOW);
    for (const from of FROM) {
      const frames = sky.frames.filter(f => f.km >= from && f.km < from + WINDOW);
      if (!frames.length) continue;
      const res = classify({ start: null, frames });
      for (const r of res) all.push({ plane, seed, from, ...r });
      const count = NAMES.map(n => res.filter(r => r.category === n).length);
      console.log(`${plane} seed ${seed} ${from}-${from + WINDOW} km (${frames.length} frames, speed ${Math.round(frames[0].speed)}-${Math.round(frames[frames.length - 1].speed)}): impossible ${count[0]}, frame-perfect ${count[1]}, expert ${count[2]}, hard ${count[3]}  [${((Date.now() - t0) / 1000).toFixed(0)} s]`);
      for (const r of res) console.log(`     ${String(r.km).padStart(6)} km  ${r.category.padEnd(30)} ${r.obstacle} gap ${r.gap}  fails at min tap gap ${r.at.join(',')}  ${JSON.stringify(r.why)}`);
    }
  }
  if (process.env.JSON) (await import('fs')).writeFileSync(process.env.JSON, JSON.stringify(all));
}

// ---------- the gap-to-gap pass: the user's case ("climb from the bottom to the top in time") ----------

// From ONE state at frame t0, can the plane get past storm `id` (until its column is behind the plane)?
export function canPass(sky, t0, state, id, minGap) {
  let states = [{ ...state, cd: state.cd || 0 }];
  for (let t = t0; t < sky.frames.length; t++) {
    const fr = sky.frames[t], st = fr.storms.find(s => s.id === id);
    if (!st || st.rects[0].x + st.rects[0].width < PLANE.x - 40) return true;   // past it
    const next = new Map();
    for (const s of states) for (const tap of s.cd === 0 ? [false, true] : [false]) {
      const p = move(s, tap);
      if (crashes(p, fr)) continue;
      const cd = tap ? minGap - 1 : Math.max(0, s.cd - 1), key = `${Math.round(p.y)},${Math.round(p.vy)},${cd}`;
      if (!next.has(key)) next.set(key, { y: p.y, vy: p.vy, cd });
    }
    if (!next.size) return false;
    states = [...next.values()];
  }
  return true;
}

// The user's case. For each storm B after a storm A: the heights at which the plane can leave A (the full search,
// any tap timing), and per tap model, from how many of them B is impossible even with perfect play from then on.
// Such an exit is a TRAP: the only fix is to leave A at another height, so you must know about B before you reach
// A. Reported: the share of trap exits; the warning that needs (B's arrival minus A's arrival, seconds); and how far
// ahead B can be seen today (it appears at the right edge of the screen).
export function gapToGap(sky, models = [3, 6, 9], every = 10) {
  const out = [];
  const ids = [...new Set(sky.frames.flatMap(f => f.storms.map(s => s.id)))];
  const arrive = id => sky.frames.findIndex(f => { const s = f.storms.find(x => x.id === id); return s && s.rects[0].x <= PLANE.x + PLANE.w; });
  for (let k = 1; k < ids.length; k++) {
    const A = ids[k - 1], B = ids[k];
    const tExit = sky.frames.findIndex(f => { const s = f.storms.find(x => x.id === A); return s && s.rects[0].x + s.rects[0].width < PLANE.x - 40; });
    const tA = arrive(A), tB = arrive(B), tSeen = sky.frames.findIndex(f => f.storms.some(x => x.id === B));
    if (tExit < 1 || tA < 0 || tB < 0) continue;
    const reach = reachable(sky, tExit);
    if (!reach.length) continue;
    const starts = reach.filter((s, i) => i % every === 0 || i === reach.length - 1);
    const fr = sky.frames[tExit], b = sky.frames[tB].storms.find(x => x.id === B);
    const row = { A, B, km: Math.round(fr.km), speed: Math.round(fr.speed), noFly: !!(b && b.noFly), birds: sky.frames[tB].birds.length,
      exits: starts.length, seenAhead: +((tB - tSeen) * DT).toFixed(2), needWarning: +((tB - tA) * DT).toFixed(2), traps: {} };
    for (const m of models) row.traps[m] = starts.filter(s => !canPass(sky, tExit, s, B, m)).length;
    out.push(row);
  }
  return out;
}

// All states reachable at frame t (any tap timing), from every safe height at frame 0: the search of search(), kept.
function reachable(sky, tEnd) {
  let states = [...safeStates(sky.frames[0]).values()];
  for (let t = 0; t <= tEnd; t++) {
    const fr = sky.frames[t], next = new Map();
    for (const s of states) for (const tap of [false, true]) {
      const p = move(s, tap);
      if (crashes(p, fr)) continue;
      const key = `${Math.round(p.y)},${Math.round(p.vy)}`;
      if (!next.has(key)) next.set(key, { y: p.y, vy: p.vy, cd: 0 });
    }
    if (!next.size) return [];
    states = [...next.values()];
  }
  return states.sort((a, b) => a.y - b.y || a.vy - b.vy);
}
