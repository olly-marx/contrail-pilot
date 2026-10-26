// Can a perfect tapper get from each gap to the next? (sim engine, 2026-10-26) The level generator placed no-fly
// zones back to back with the second gap further up or down than any tapping reaches in the time between them (at
// s=1, 4 of 12 no-fly deaths on twinFull were such pairs). Per consecutive pair of columns A, B in a recorded sky:
//   need  = how far the hitbox must move from A's clear band to B's (picture 12 px above, 15 below the hitbox top)
//   time  = from A's column clearing the plane's tail to B's column reaching its nose, at the frame's speed
//   reach = climb 245 px/s (a tap every frame) or a dive from rest (900 px/s^2, capped at 400 px/s)
// A pair with need > reach is IMPOSSIBLE whatever you do. CONFIRM=1 runs the exact tap search (tapper.mjs, every tap
// sequence) on a window round the worst pair, to show the bound is not crying wolf.
// Run: node tools/sim/check-reach.mjs   PLANES=comet,twin SEEDS=1-6 KM=20000   (exit 1 if any pair is impossible)
// PLANT=trap moves two neighbouring gaps to the bottom then the top: must FAIL (and CONFIRM=1 must find nothing survives).
import * as T from './tapper.mjs';
import { PLANE } from '../../src/config.js';
const planes = (process.env.PLANES || 'comet,twin').split(','), [s0, s1] = (process.env.SEEDS || '1-6').split('-').map(Number), KM = +(process.env.KM || 20000);
const SAVES = { comet: { fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } },
  twin: { fleet: { plane: 'twin', planes: { twin: { engines: 4, body: 4, cabin: 4 } }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 } } } };
const UP = 12, DOWN = 15, nose = PLANE.x - PLANE.spriteOffX + PLANE.spriteW, tail = PLANE.x - PLANE.spriteOffX;
export function pairs(sky) {
  const cols = new Map();   // id -> { first frame its column reaches the nose, gap, noFly, x at that frame, width }
  sky.frames.forEach((f, t) => { for (const st of f.storms) if (!cols.has(st.id) && st.rects[0].x <= nose)
    cols.set(st.id, { id: st.id, t, km: f.km, speed: f.speed, noFly: st.noFly, top: st.rects[0].height, bot: st.rects[1].y, w: st.rects[0].width }); });
  const list = [...cols.values()].sort((a, b) => a.t - b.t), out = [];
  for (let i = 1; i < list.length; i++) {
    const A = list[i - 1], B = list[i];
    // A's column clears the tail (W + spriteW px after it reached the nose); B reaches the nose at B.t.
    const time = Math.max(0, (B.t - A.t) / 60 - (A.w + PLANE.spriteW) / A.speed);
    const up = Math.max(0, (A.top + UP) - (B.bot - DOWN)), down = Math.max(0, (B.top + UP) - (A.bot - DOWN));
    const climb = 245 * time, dive = Math.min(450 * time * time, 400 * time);
    out.push({ A: A.id, B: B.id, km: Math.round(B.km), t: B.t, kinds: (A.noFly ? 'NF' : 'S') + '>' + (B.noFly ? 'NF' : 'S'), time: +time.toFixed(2), up, down, slack: Math.round(Math.min(climb - up, dive - down)), tA: A.t });
  }
  return out;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  let bad = 0;
  for (const plane of planes) for (let seed = s0; seed <= s1; seed++) {
    const sky = T.recordSky(SAVES[plane], seed, KM);
    if (process.env.PLANT === 'trap') {   // negative control: two neighbouring columns, gap at the bottom then the top (must FAIL)
      const ids = [...new Set(sky.frames.flatMap(f => f.storms.map(st => st.id)))].slice(60, 62);   // late (fast): about 1 s between them
      for (const f of sky.frames) for (const st of f.storms) { const k = ids.indexOf(st.id); if (k < 0) continue;
        const [top, bot] = k === 0 ? [350, 440] : [20, 110]; st.noFly = true; st.rects[0].height = top; st.rects[1].y = bot; }   // solid blocks, as no-fly zones
    }
    const ps = pairs(sky), imp = ps.filter(p => p.slack < 0);
    bad += imp.length;
    console.log(`${plane} seed ${seed}: ${ps.length} pairs, impossible ${imp.length}, tight (slack < 20 px) ${ps.filter(p => p.slack >= 0 && p.slack < 20).length}`);
    for (const p of imp) console.log(`   ${p.km} km ${p.kinds} time ${p.time}s need up ${Math.round(p.up)} / down ${Math.round(p.down)}, short by ${-p.slack} px`);
    if (process.env.CONFIRM && imp.length) {
      const p = imp.sort((a, b) => a.slack - b.slack)[0], frames = sky.frames.slice(Math.max(0, p.tA - 30), p.t + 90);
      const dead = T.search({ start: null, frames }, 1);
      console.log(`   exact search round the worst (${p.km} km): ${dead.length ? 'NOTHING SURVIVES at ' + dead.map(d => d.km + ' km ' + d.obstacle).join(', ') : 'a path exists (the bound is too strict here)'}`);
    }
  }
  if (bad) { console.log(`FAIL: ${bad} impossible gap pairs`); process.exit(1); }
  console.log('PASS: every gap is reachable from the one before');
}
