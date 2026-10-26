// A pilot that really flies storm gaps (sim engine, 2026-10-26), for flights with crashes ON (the progression
// simulator). The test pilots in pilots.js aim with the 12 px hitbox and fall past their target, so they hit the
// first storm (measured: 20/20 skies at ~400 km); they stay as they are for the crashes-off balance studies.
//
//   const p = makePlayer({ skill, care, seed, land });   p.wantsFlap(w) -> true when it taps this frame
//   care c (0..1): contrail care, the second knob (2026-10-26). careful: true/false is the same as care 1/0.
//   budget (0..1, default 1): the share of the safe band (around its middle) the contrail choice may use.
//   plan: 'threat' (default since 2026-10-26: plans for the next gap as soon as it is on screen, climbs fast) or
//   'classic' (only the nearest gap within 200 px; slow climb: the earlier numbers).
//   land(w) -> true: it wants to land at the next airport. From 700 px out it holds low (still clearing storms);
//   once no storm is left between it and the runway and the flare can reach it, it stops tapping and lets the
//   game's landing flare put it down.
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
import { PLANE, HEIGHT, GROUND_H, DAYNIGHT, AIRPORT, WIDTH } from '../config.js';
import { makeRng } from './rng.js';

const SKY_H = HEIGHT - GROUND_H;
const TOP = PLANE.spriteOffY, BOT = PLANE.spriteH - PLANE.spriteOffY;   // the picture above / below the hitbox top
// Its target is the LOW point of its bob: it taps when the plane falls past the target, and a tap lifts the plane
// ~37 px (flapVelocity^2 / 2 gravity) above that before it falls again. So the whole bob, target-BOB .. target,
// must clear the gap, and the picture tilts by up to PLANE.maxTilt, which moves its ends ~TILT px up or down.
let BOB = Math.ceil(PLANE.flapVelocity ** 2 / (2 * PLANE.gravity));
let CARE_W = 1;
export function __plantCareHalf() { CARE_W = 0.5; }   // tests/sim-care.cjs plants a weakened contrail term: must FAIL
export function __plantNoBob() { BOB = 0; }   // tests/sim-player.cjs plants the old bug: the gate must fail
const TILT = Math.ceil(PLANE.spriteW / 2 * Math.sin(PLANE.maxTilt) / 2);
const MARGIN = 6;   // px kept clear of the cloud's edge
const FALL = 8;     // the fall past the target before a tap takes hold (one frame at the 400 px/s top speed is ~7 px)

export function makePlayer({ skill = 0.7, careful = true, care = careful ? 1 : 0, budget = 1, plan = 'threat', seed = 1, land = null } = {}) {
  const threat = plan !== 'classic';
  const c = Math.max(0, Math.min(1, care));
  const s = Math.max(0, Math.min(1, skill)), rnd = makeRng((seed * 2654435761) >>> 0 ^ 0x5eed);
  const delayFrames = Math.round(0.25 * (1 - s) * 60), noisePx = 30 * (1 - s), missRate = 0.3 * (1 - s);
  const past = [];   // the plane's y and vy over the last frames: what it "sees" with its reaction delay
  let noise = 0, noiseAt = -1;

  // The heights (hitbox top y) at which the whole picture clears the next gap's clouds, with room for the bob.
  const safeBand = w => {
    let lo = 30, hi = SKY_H - 70;   // open sky: keep off the very top and well off the ground
    const gapBand = st => [st.rects[0].height + TOP + BOB + TILT + MARGIN, st.rects[1].y - BOT - TILT - MARGIN - FALL];
    if (!threat) {   // 'classic' (before 2026-10-26): only the nearest gap within 200 px
      const ahead = w.storms.filter(t => t.rects[0].x + t.rects[0].width > w.plane.x - 10 && t.rects[0].x < w.plane.x + 200)
        .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
      if (ahead) [lo, hi] = gapBand(ahead);
    } else {
      // 'threat' (default, the user's feedback): plan for the NEXT gap as soon as it is on screen. While still in
      // the current gap, aim where the two safe bands overlap; if they do not, at the current band's edge nearest
      // the next one, so the climb or dive starts early.
      const on = w.storms.filter(t => t.rects[0].x + t.rects[0].width > w.plane.x - 10 && t.rects[0].x < WIDTH).sort((a, b) => a.rects[0].x - b.rects[0].x);
      if (on.length) {
        [lo, hi] = gapBand(on[0]);
        if (on[1]) {
          const [nlo, nhi] = gapBand(on[1]);
          if (Math.max(lo, nlo) <= Math.min(hi, nhi)) { lo = Math.max(lo, nlo); hi = Math.min(hi, nhi); }
          else if (nhi < lo) hi = lo; else lo = hi;   // no overlap: the edge nearest the next gap
        }
      }
    }
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

  // Where it wants to be: in the safe band, picking by contrail care c (icy air counts only once revealed).
  // Each height y in the band scores  c x contrail(y)  -  (1 - c) x |y - band middle|  -  0.05 x |y - plane|,
  // where contrail(y) is how deep y is in icy air by day (up to 40 px) or how far from it at night (up to 60 px).
  // c = 0: barrier-only, the band's middle (exactly). c = 1: contrail-first, today's careful choice (exactly).
  // In between it gives up some safety margin for contrail benefit.
  const target = w => {
    const [lo, hi] = safeBand(w);
    // A seed or pick-up coming up inside the safe band: go for it (both kinds of player do).
    const seed = w.tokens.filter(k => k.x > w.plane.x && k.x < w.plane.x + 160 && k.y - 2 >= lo && k.y - 2 <= hi).sort((a, b) => a.x - b.x)[0];
    if (seed) return seed.y - 2;
    if (c === 0 || hi - lo < 4) return (lo + hi) / 2;
    const ahead = w.issrs.filter(i => i.alpha > (w.kit.hiddenAlpha || 0) + 0.01 && i.x < w.plane.x + 220 && i.x + i.width > w.plane.x - 10);
    if (!ahead.length) return (lo + hi) / 2;
    const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
    const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
    const day = goodDay(w);
    let best = (lo + hi) / 2, bestScore = -1e9;
    const mid = (lo + hi) / 2;
    // Risk budget (2026-10-26): the contrail choice may use only the inner `budget` share of the safe band around its
    // middle (1 = the whole band, as before). Measured: at low dodging skill the best contrail height is usually at
    // the band's EDGE, where late or missed taps clip the cloud; a budget keeps the choice away from it.
    const half = (hi - lo) / 2 * Math.max(0, Math.min(1, budget)), clo = budget >= 1 ? lo : mid - half, chi = budget >= 1 ? hi : mid + half;
    for (let y = clo; y <= chi; y += 4) {
      const contrail = CARE_W * (day ? Math.min(depth(y), 40) : Math.min(room(y), 60));
      const score = (c === 1 ? contrail : c * contrail - (1 - c) * Math.abs(y - mid)) - Math.abs(y - w.plane.y) * 0.05;
      if (score > bestScore) { bestScore = score; best = y; }
    }
    return best;
  };

  // Coming in to land: 'low' (hold low), 'glide' (leave it to the flare), or null (not yet).
  const approach = w => {
    const toStart = w.nextAirport.worldX - w.distancePx;
    if (toStart > 700 || toStart < -AIRPORT.runwayLen) return null;
    const clear = !w.storms.some(st => st.rects[0].x + st.rects[0].width > w.plane.x - 4 && st.rects[0].x < w.plane.x + Math.max(0, toStart) + PLANE.w);
    return clear && toStart < AIRPORT.flareFrom * w.kit.flare ? 'glide' : 'low';
  };

  return {
    skill: s, care: c, _band: w => safeBand(w), _target: w => target(w),   // (for debugging)
    wantsFlap(w) {
      const landing = land && land(w) ? approach(w) : null;
      if (landing === 'glide') return false;
      past.push([w.plane.y, w.plane.vy]);
      if (past.length > delayFrames + 1) past.shift();
      const [y, vy] = past[0];   // what it sees: the plane delayFrames ago
      if (w.gameTime - noiseAt > 500) { noiseAt = w.gameTime; noise = (rnd() * 2 - 1) * noisePx; }
      const aim = landing === 'low' ? Math.max(target(w), Math.min(safeBand(w)[1], SKY_H - 95)) : target(w);
      // Tap at the low point of the bob (a look-ahead here lifted the whole bob too high). 'threat': well below the
      // aim, tap fast to climb (a real player hammers taps) instead of waiting for each bob to end.
      const want = y > aim + noise && (vy > -40 || (threat && y > aim + noise + 2 * BOB && vy > -180));
      return want && rnd() >= missRate;
    },
  };
}
