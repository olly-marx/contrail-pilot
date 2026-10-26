// The ORACLE contrail pilot (sim engine, 2026-10-26): the ceiling of contrail care. Is "care is worth at most
// x1.45" the game's limit or the player model's? This pilot sees ALL icy air ahead, plans its height across gaps
// with perfect taps, and flies the gaps with no skill error (crashes ON).
//
// 1. Record a reference sky (as tools/sim/tapper.mjs: storms, no-fly zones, birds; turbulence off), plus every icy-
//    air patch and the day/night state, per frame. None of these depend on the plane (except a fake forecast patch
//    popping when the plane comes near, which can shift later spawns: checked every frame below).
// 2. Plan in rolling stretches: search every tap sequence over the next HORIZON frames (the tapper's search: the
//    game's freeFall and pixel tests), keeping per merged state the best contrail score so far, where each frame
//    inside icy air (the game's inIssrShape) costs +1 at night and earns -1 in a good day window (the pilots'
//    goodDay rule). Take the best end state, trace back its taps, and FLY the first EXECUTE frames of them in the
//    REAL game world, then plan again from where the real plane is.
// 3. Report the real game's km and heat (not the proxy), and whether the real sky ever parted from the recording.
// The proxy: time in icy air, not heat itself (heat depends on which light columns contrail squares block over
// time, which a frame-by-frame search cannot hold). So this is perfect icy-air ROUTING.
// Run: node tools/sim/oracle.mjs      PLANES=comet,jumbo,twin SEEDS=1,2,3 KM=25000
import { createWorld } from '../../src/sim/world.js';
import { RULES } from '../../src/sim/rules.js';
import * as P from '../../src/sim/physics.js';
import { goodDay } from '../../src/sim/pilots.js';
import { PLANE, HAZARDS, HEIGHT, GROUND_H, CLIMATE } from '../../src/config.js';
import { recordSky } from './tapper.mjs';

const SKY_H = HEIGHT - GROUND_H, DT = 16.67 / 1000;
const HORIZON = Number(process.env.HORIZON || 600), EXECUTE = Number(process.env.EXECUTE || 300);
const SAVES = {
  comet: { fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } },
  jumbo: { fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} } },
  twin: { fleet: { plane: 'twin', planes: { twin: {} }, systems: {}, gadgets: {} } },
};
const BASE = { tutorialDone: true, autoTakeoff: true, landings: 30, mission: 99, fuel: 'kerosene', priceVersion: 2 };

// Icy air and the day/night state per frame, from a world stepped in lockstep with the tapper's recording.
function recordIcy(save, seed, km) {
  const turb = HAZARDS.turbulence.chance, danger = CLIMATE.dangerLine;
  HAZARDS.turbulence.chance = 0; CLIMATE.dangerLine = Infinity;
  try {
    const w = createWorld({ ...BASE, ...save }, seed);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
    w.explain = () => false; w.nextAirport.worldX = 1e12; w.hitsStorm = () => false; w.hitBird = () => false; w.spriteBottom = () => -1;
    while (w.inGrace()) w.step(DT);
    const out = [];
    while (w.distancePx < km && w.state === 'playing') {
      if (w.plane.y > 200 && w.plane.vy > -40) w.applyFlap();
      w.step(DT);
      out.push({ good: goodDay(w), night: !w.isDay, kit: { margin: w.kit.margin, contrailLife: w.kit.contrailLife }, clock: w.clock,
        issrs: w.issrs.filter(i => !i.fake).map(i => ({ x: i.x, y: i.y, width: i.width, height: i.height, blobs: i.blobs })) });
    }
    return out;
  } finally { HAZARDS.turbulence.chance = turb; CLIMATE.dangerLine = danger; }
}

// The tapper's search step, as a best-score (Viterbi) search with taps on any frame.
const body = { nextAirport: { worldX: 1e12 }, distancePx: 0, storms: [], kit: { flare: 1 }, speed: 1, plane: { x: PLANE.x, y: 0, vy: 0 },
  spriteBottom: RULES.spriteBottom, freeFall: RULES.freeFall };
const move = (s, tap) => { body.plane.y = s.y; body.plane.vy = tap ? PLANE.flapVelocity : s.vy; body.freeFall(DT); return { x: PLANE.x, y: body.plane.y, vy: body.plane.vy }; };
let planeOffsets = null;
function crashes(plane, fr) {
  if (plane.y - PLANE.spriteOffY + PLANE.spriteH >= SKY_H) return true;
  const g = { pose: P.planePose({ plane, state: 'playing', airborne: true, autoUntil: 0, gameTime: 0 }), gameTime: 0, planeOffsets };
  let pts = null; const ptsFn = () => { if (!pts) { pts = P.planePixels(g); planeOffsets = g.planeOffsets; } return pts; };
  const r = g.pose.rotation, half = (PLANE.spriteW / 2) * Math.abs(Math.sin(r)) + (PLANE.spriteH / 2) * Math.cos(r) + 1;
  for (const st of fr.storms) {
    if (g.pose.y - half >= st.rects[0].height && g.pose.y + half <= st.rects[1].y) continue;
    if (P.hitsStorm(g, st, ptsFn)) return true;
  }
  return fr.birds.length > 0 && P.hitBird({ birds: fr.birds }, { x: plane.x, y: plane.y, w: PLANE.w, h: PLANE.h }, ptsFn);
}
const icyCost = (plane, ic) => {
  if (!ic.night && !ic.good) return 0;
  const box = { x: plane.x, y: plane.y, w: PLANE.w, h: PLANE.h };
  const inside = ic.issrs.some(i => P.inIssrShape({ kit: ic.kit }, i, box));
  return inside ? (ic.night ? 1 : -1) : 0;
};

// Plan from `start` at frame t0 over the next frames: the best tap list (true/false per frame).
function plan(sky, icy, t0, start, horizon) {
  let layer = [{ y: start.y, vy: start.vy, cost: 0, parent: -1, tap: false }];
  const layers = [];
  for (let t = t0; t < Math.min(sky.frames.length, t0 + horizon); t++) {
    const fr = sky.frames[t], next = new Map();
    layer.forEach((s, idx) => {
      for (const tap of [false, true]) {
        const p = move(s, tap);
        if (crashes(p, fr)) continue;
        const cost = s.cost + icyCost(p, icy[t]), key = `${Math.round(p.y)},${Math.round(p.vy)}`;
        const have = next.get(key);
        if (!have || cost < have.cost) next.set(key, { y: p.y, vy: p.vy, cost, parent: idx, tap });
      }
    });
    if (!next.size) break;   // nothing survives: fly what we have (the real plane will crash there)
    layers.push(layer = [...next.values()]);
  }
  if (!layers.length) return [];
  let best = layers[layers.length - 1].reduce((a, b) => (b.cost < a.cost ? b : a)), taps = [];
  for (let k = layers.length - 1; k >= 0; k--) { taps.push(best.tap); if (k > 0) best = layers[k - 1][best.parent]; }
  return taps.reverse();
}

export function oracleFlight(save, seed, km) {
  const t0 = Date.now(), sky = recordSky(save, seed, km), icy = recordIcy(save, seed, km);
  // The real game, from the same start as the recording (turbulence off there too, so the skies match).
  const turb = HAZARDS.turbulence.chance; HAZARDS.turbulence.chance = 0;
  try {
    const w = createWorld({ ...BASE, ...save }, seed);
    for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
    w.explain = () => false; w.nextAirport.worldX = 1e12;
    while (w.inGrace()) w.step(DT);
    let t = 0, parted = -1, drifted = 0;
    while (w.state === 'playing' && t < sky.frames.length) {
      const taps = plan(sky, icy, t, { y: w.plane.y, vy: w.plane.vy }, HORIZON);
      if (!taps.length) { w.step(DT); t++; continue; }
      // The plan was traced through MERGED states (within 1 px), so its exact tap sequence can drift from what was
      // checked. Replay it exactly first, and fly only up to 20 frames before the first frame it would crash.
      let safe = taps.length, s = { y: w.plane.y, vy: w.plane.vy };
      for (let k = 0; k < taps.length; k++) { s = move(s, taps[k]); if (crashes(s, sky.frames[t + k])) { safe = k; break; } }
      if (safe < taps.length) drifted++;
      const n = Math.max(1, Math.min(EXECUTE, safe - 20, taps.length));
      for (let k = 0; k < n && w.state === 'playing'; k++, t++) {
        if (taps[k]) w.applyFlap();
        w.step(DT);
        const fr = sky.frames[t];
        if (parted < 0 && fr && JSON.stringify(w.storms.map(s => Math.round(s.rects[0].x))) !== JSON.stringify(fr.storms.map(s => Math.round(s.rects[0].x)))) parted = t;
      }
    }
    const B = w.breakdown, r1 = v => Math.round(v * 10) / 10;
    return { km: Math.round(w.distancePx), end: w.state === 'playing' ? 'recorded sky ended' : /hot/.test(w.endReason) ? 'overheat' : (w.endReason || '').split('\n')[0],
      heat: r1(w.heat), night: r1(B.night), sun: r1(B.sun), co2: r1(B.co2), skyParted: parted < 0 ? null : Math.round(sky.frames[parted].km), plansDrifted: drifted, s: Math.round((Date.now() - t0) / 1000) };
  } finally { HAZARDS.turbulence.chance = turb; }
}

// CLIMATE='{"co2ToHeat":0.75,...}': other heat numbers for the whole run (heat never changes what spawns).
if (import.meta.url === `file://${process.argv[1]}`) {
  const planes = (process.env.PLANES || 'comet').split(','), seeds = (process.env.SEEDS || '1').split(',').map(Number), KM = Number(process.env.KM || 25000);
  const over = JSON.parse(process.env.CLIMATE || '{}');
  Object.assign(CLIMATE, over);
  for (const plane of planes) for (const seed of seeds) console.log(plane, 'seed', seed, Object.keys(over).length ? 'CLIMATE ' + JSON.stringify(over) : 'today', JSON.stringify(oracleFlight(SAVES[plane], seed, KM)));
}
