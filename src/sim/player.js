// A pilot that really flies storm gaps (sim engine, 2026-10-26), for flights with crashes ON (the progression
// simulator). The test pilots in pilots.js aim with the 12 px hitbox and fall past their target, so they hit the
// first storm (measured: 20/20 skies at ~400 km); they stay as they are for the crashes-off balance studies.
//
//   const p = makePlayer({ skill, careful, seed });   p.wantsFlap(w) -> true when it taps this frame
//
// It plans with the drawn picture's box (what a crash is tested on), with room for its own bob, and aims for the
// safe band of the next storm gap. Inside that band it makes its contrail choice: careful = the careful pilot's
// (out of revealed icy air at night, into it by day); careless = it ignores icy air.
// skill s (0..1) makes it more or less human, with three kinds of error drawn from its OWN seeded stream (the
// flight's physics stream is never touched, so the engine stays the game):
//   reaction delay: it sees the plane where it was up to 250 ms ago (x (1 - s));
//   aim noise:      its target is off by up to +-30 px (x (1 - s)), redrawn every half second;
//   missed taps:    up to 30% of the frames it wants to tap, it does not (x (1 - s)).
// s = 1 is a never-wrong player (it can still be caught by a gap too tight for the bob); s = 0 is very sloppy.
import { PLANE, HEIGHT, GROUND_H, DAYNIGHT } from '../config.js';
import { makeRng } from './rng.js';

const SKY_H = HEIGHT - GROUND_H;
const TOP = PLANE.spriteOffY, BOT = PLANE.spriteH - PLANE.spriteOffY;   // the picture above / below the hitbox top
// Its target is the LOW point of its bob: it taps when the plane falls past the target, and a tap lifts the plane
// ~37 px (flapVelocity^2 / 2 gravity) above that before it falls again. So the whole bob, target-BOB .. target,
// must clear the gap, and the picture tilts by up to PLANE.maxTilt, which moves its ends ~TILT px up or down.
let BOB = Math.ceil(PLANE.flapVelocity ** 2 / (2 * PLANE.gravity));
export function __plantNoBob() { BOB = 0; }   // tests/sim-player.cjs plants the old bug: the gate must fail
const TILT = Math.ceil(PLANE.spriteW / 2 * Math.sin(PLANE.maxTilt) / 2);
const MARGIN = 6;   // px kept clear of the cloud's edge
const FALL = 8;     // the fall past the target before a tap takes hold (one frame at the 400 px/s top speed is ~7 px)

export function makePlayer({ skill = 0.7, careful = true, seed = 1 } = {}) {
  const s = Math.max(0, Math.min(1, skill)), rnd = makeRng((seed * 2654435761) >>> 0 ^ 0x5eed);
  const delayFrames = Math.round(0.25 * (1 - s) * 60), noisePx = 30 * (1 - s), missRate = 0.3 * (1 - s);
  const past = [];   // the plane's y and vy over the last frames: what it "sees" with its reaction delay
  let noise = 0, noiseAt = -1;

  // The heights (hitbox top y) at which the whole picture clears the next gap's clouds, with room for the bob.
  const safeBand = w => {
    let lo = 30, hi = SKY_H - 70;   // open sky: keep off the very top and well off the ground
    const ahead = w.storms.filter(t => t.rects[0].x + t.rects[0].width > w.plane.x - 10 && t.rects[0].x < w.plane.x + 200)
      .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    if (ahead) { lo = ahead.rects[0].height + TOP + BOB + TILT + MARGIN; hi = ahead.rects[1].y - BOT - TILT - MARGIN - FALL; }
    for (const f of w.birds) {   // a flock near the plane's line: keep above or below it
      if (f.x > w.plane.x + 220 || f.x + 60 < w.plane.x - 20) continue;
      const fTop = f.y - 30, fBot = f.y + 40, mid = (lo + hi) / 2;
      if (fBot > lo && fTop < hi) { if (mid < f.y) hi = Math.min(hi, fTop - BOT - MARGIN); else lo = Math.max(lo, fBot + TOP + MARGIN); }
    }
    lo += noisePx; hi -= noisePx;   // a less precise player keeps further from the edges (by its own aim error)
    if (hi < lo) { const m = (lo + hi) / 2; lo = hi = m; }   // too tight: the middle is the best try
    return [lo, hi];
  };

  const goodDay = w => { const c = w.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds);
    return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - w.kit.contrailLife / 1000; };

  // Where it wants to be: in the safe band; careful pilots then pick by icy air (seen only once revealed).
  const target = w => {
    const [lo, hi] = safeBand(w);
    if (!careful || hi - lo < 4) return (lo + hi) / 2;
    const ahead = w.issrs.filter(i => i.alpha > (w.kit.hiddenAlpha || 0) + 0.01 && i.x < w.plane.x + 220 && i.x + i.width > w.plane.x - 10);
    if (!ahead.length) return (lo + hi) / 2;
    const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
    const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
    const day = goodDay(w);
    let best = (lo + hi) / 2, bestScore = -1e9;
    for (let y = lo; y <= hi; y += 4) {
      const score = (day ? Math.min(depth(y), 40) : Math.min(room(y), 60)) - Math.abs(y - w.plane.y) * 0.05;
      if (score > bestScore) { bestScore = score; best = y; }
    }
    return best;
  };

  return {
    skill: s, _band: w => safeBand(w), _target: w => target(w),   // (for debugging)
    wantsFlap(w) {
      past.push([w.plane.y, w.plane.vy]);
      if (past.length > delayFrames + 1) past.shift();
      const [y, vy] = past[0];   // what it sees: the plane delayFrames ago
      if (w.gameTime - noiseAt > 500) { noiseAt = w.gameTime; noise = (rnd() * 2 - 1) * noisePx; }
      const want = y > target(w) + noise && vy > -40;   // tap at the low point of the bob (a look-ahead here lifted the whole bob too high)
      return want && rnd() >= missRate;
    },
  };
}
