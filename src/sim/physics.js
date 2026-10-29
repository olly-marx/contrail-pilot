// The flight's rules with no drawing (sim engine landing 3, 2026-10-25): moved out of GameScene so the game
// and the engine run the same code. `f` is the flight: the GameScene today, the engine's world later.
// Each function reads only the fields it names. Nothing here draws, plays a sound or uses Phaser.
import { WIDTH, HEIGHT, GROUND_H, PLANE, STORMS, ISSR, CONTRAIL, DAYNIGHT, RADIATION, CLIMATE, AIRPORT, FOREST, HAZARDS } from '../config.js';
import { CONTRAIL_MARGIN } from '../fleet.js';
import { mask } from './masks-load.js';

export const SKY_H = HEIGHT - GROUND_H;

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------- day, night and radiation (f.clock, seconds) ----------

export function dayNightPhase(f) {
  const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
  const p = f.clock % (D + N);
  if (p < D) return { isDay: true, toOther: Math.max(0, (p - (D - B)) / B) };
  const q = p - D;
  return { isDay: false, toOther: Math.max(0, (q - (N - B)) / B) };
}

// What a contrail does right now (2026-10-23): the switch between cooling and warming happens HALFWAY
// through dusk / dawn, with a short neutral stretch in the middle. cool: sunshine side; strength 0..1.
export function radiationMode(f) {
  const { isDay, toOther: u } = dayNightPhase(f), lo = 0.5 - DAYNIGHT.neutralFrac / 2, hi = 0.5 + DAYNIGHT.neutralFrac / 2;
  const first = u < lo ? 1 - u / lo : u > hi ? (u - hi) / lo : 0;   // fading out of the old mode / into the new one
  if (u <= 0) return { cool: isDay, strength: 1 };
  return { cool: u < 0.5 ? isDay : !isDay, strength: first };
}

// Light (day) and heat (night) are fixed columns. Per column, the contrail square that blocks it: sun comes
// down, so the highest contrail blocks it; heat comes up, so the lowest one does. [{ x, hit }] (hit: null or a contrail).
export function rayColumns(contrails, isDay) {
  const S = CONTRAIL.size, out = [];
  for (let x = RADIATION.margin; x < WIDTH - RADIATION.margin; x += RADIATION.spacing) {
    let hit = null;
    for (const c of contrails) {
      if (x < c.x || x >= c.x + S) continue;
      if (!hit || (isDay ? c.y < hit.y : c.y > hit.y)) hit = c;
    }
    out.push({ x, hit });
  }
  return out;
}

// Heat per second from `blocked` columns (negative = cooling). f.kit.vapour.
// Planted defects for tests/era4-knobs.cjs (each must FAIL it): the era 4-6 kit knobs ignored.
export const KNOB_PLANTS = { gapAdd: false, nightHeat: false, clean: false, wobble: false };
export function rayRate(f, isDay, strength, blocked) {
  return (isDay ? CLIMATE.sunBlockedPerCol * f.kit.vapour ** CLIMATE.dayWaterPower : CLIMATE.heatTrappedPerCol * f.kit.vapour ** CLIMATE.nightWaterPower * (KNOB_PLANTS.nightHeat ? 1 : f.kit.nightHeatMul ?? 1)) * blocked * strength;   // nightHeatMul: eras 4-6 (planes + Ops), x1 = exact before
}

// 1 until CLIMATE.lateFrom km into a flight, then grows by latePer10k every 10,000 km. Only NIGHTS get harder.
// f.isDay, f.distancePx.
export function lateRamp(f) { return f.isDay ? 1 : 1 + CLIMATE.latePer10k * Math.max(0, f.distancePx - CLIMATE.lateFrom) / 10000; }

// ---------- forest (f.distancePx, f.speciesPlanted) ----------

export function oldWood(f) {
  const ramp = Math.max(0, Math.min(1, (f.distancePx - FOREST.from) / FOREST.span));
  return ramp * FOREST.boost * Math.pow(Math.min(1, f.speciesPlanted.size / FOREST.kinds), FOREST.power);
}
// A forest can only soak up so much CO2 in one flight (more with more kinds); then it is full.
export function forestStore(f) { return Math.max(FOREST.storeMin, FOREST.store * Math.pow(Math.min(1, f.speciesPlanted.size / FOREST.kinds), FOREST.storePower)); }

// ---------- storms and airports ----------

export function inStormClearZone(f, worldX) {
  const a = f.nextAirport.worldX;
  return worldX + STORMS.width > a - AIRPORT.stormClearBefore && worldX < a + AIRPORT.runwayLen + AIRPORT.stormClearAfter;
}

// Is there a plane-sized lane free of icy air between gTop and gBot, at x..x+w?
// lane: how tall the free lane must be (default: the plane + STORMS.clearLane; the ISSR.laneExtra variant asks more).
export function laneClear(issrs, x, w, gTop, gBot, lane = PLANE.h + STORMS.clearLane) {
  // Fake (forecast) patches never count: they make no contrails, and one pops only when the plane comes near, so
  // counting it would let how you fly change where later storms and icy air go (2026-10-26).
  const blocked = issrs.filter(i => !i.fake && i.x < x + w && i.x + i.width > x && i.y < gBot && i.y + i.height > gTop)
    .map(i => [Math.max(gTop, i.y), Math.min(gBot, i.y + i.height)]).sort((a, b) => a[0] - b[0]);
  let free = gTop;
  for (const [t, btm] of blocked) { if (t - free >= lane) return true; free = Math.max(free, btm); }
  return gBot - free >= lane;
}

// ---------- icy air (ISSR) ----------

// Is any point along the plane's middle line inside the cloud's ellipses? (x, y, w, h: its box)
// `grow`: each blob's radii x this (1 = the drawn shape). Used for the contrail margin.
export function inCloud(blobs, x, y, w, h, box, grow = 1) {
  const pad = Math.max(0, grow - 1) * Math.max(w, h) / 2;
  if (!overlaps(box, { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad })) return false;
  const py = box.y + box.h / 2 - y;
  for (let px = box.x; px <= box.x + box.w; px += 5) {
    const lx = px - x;
    if (blobs.some(b => ((lx - b.cx) / (b.rx * grow)) ** 2 + ((py - b.cy) / (b.ry * grow)) ** 2 <= 1)) return true;
  }
  return false;
}
// The contrail margin (eras, PLANE-DESIGN.md section 3): everything about "being in icy air" uses this. f.kit.margin.
export function inIssrShape(f, i, box) { return !i.fake && inCloud(i.blobs, i.x, i.y, i.width, i.height, box, CONTRAIL_MARGIN[f.kit.margin] || 1); }

// How visible a patch is: hidden until the plane is within reveal range, then a three-step fade. f.kit.
export function issrAlpha(f, i, box, inside) {
  if (inside) return ISSR.insideAlpha;
  if (i.entered) return ISSR.revealAlpha;   // once found, it stays found
  const gapX = Math.max(0, i.x - (box.x + box.w), box.x - (i.x + i.width));
  const gapY = Math.max(0, i.y - (box.y + box.h), box.y - (i.y + i.height));
  const d = Math.max(gapX, gapY);
  // ISSR.revealBoost (a variant, off unless set): icy air shows from this many times further away.
  // (ISSR.revealNightOnly: the boost only while contrails warm, i.e. at night.)
  const boost = ISSR.revealBoost && !(ISSR.revealNightOnly && f.isDay) ? ISSR.revealBoost : 1;
  const reveal = (i.late ? ISSR.revealPx : f.kit.revealPx) * boost, hidden = f.kit.hiddenAlpha;   // a missed patch: only seen up close
  if (d >= reveal) return hidden;
  const step = Math.min(3, Math.floor((1 - d / reveal) * 4));
  return hidden + (ISSR.revealAlpha - hidden) * (step / 3);
}

export function nearPx(i, box) {
  return Math.max(0, i.x - (box.x + box.w), box.x - (i.x + i.width), i.y - (box.y + box.h), box.y - (i.y + i.height));
}

// ---------- contrails (records { x, y, born }; the game hangs its square on .view) ----------

// A new puff behind the plane, +-1 px (it decides which light column it blocks). From the PLANE's random stream
// (f.planeBetween), so how many contrails you make never changes what spawns. f.plane.
export function makeContrail(f, time) {
  const s = CONTRAIL.size;
  return { x: f.plane.x - PLANE.spriteOffX, y: f.plane.y + PLANE.h / 2 - s / 2 + f.planeBetween(-1, 1), born: time };
}

// Drift and age the puffs: f.contrails keeps the live ones; returns the ones that just went (to un-draw).
// f.kit.contrailLife.
export function ageContrails(f, dt, time) {
  const life = f.kit.contrailLife, gone = [];
  f.contrails = f.contrails.filter(c => {
    if (time - c.born > life || c.x < -10) { gone.push(c); return false; }
    c.x -= CONTRAIL.drift * dt;
    return true;
  });
  return gone;
}
// Fades in three steps so it stays pixel-art crisp.
export function contrailAlpha(f, c, time) { return [0.95, 0.65, 0.35][Math.floor(((time - c.born) / f.kit.contrailLife) * 3)]; }

// ---------- icy air records { x, y, width, height, blobs, alpha, fake, late, entered, popped, ... } ----------

// A lumpy patch: 3-5 overlapping ellipses inside its box, each crossing the middle line, so flying through
// the middle always makes a contrail. Draws from the physics stream in a fixed order. f.kit, f.between, f.floatBetween.
export function makeIssr(f, x, y, w, h) { return { x, y, width: w, height: h, blobs: cloudBlobs(f, w, h), alpha: f.kit.hiddenAlpha }; }
// The ellipses of a cloud w x h (icy air, turbulence), in its own box.
export function cloudBlobs(f, w, h) {
  const n = Math.max(3, Math.min(5, Math.round(w / 70))), blobs = [];
  for (let k = 0; k < n; k++) {
    const rx = Math.min(w / 2, (w / n) * f.floatBetween(0.75, 1.0));
    const cx = Math.max(rx, Math.min(w - rx, (k + 0.5) * w / n + f.between(-6, 6)));
    const ry = h * f.floatBetween(0.32, 0.5);
    const cy = Math.max(ry, Math.min(h - ry, h / 2 + f.floatBetween(-0.15, 0.15) * h));
    blobs.push({ cx, cy, rx, ry });
  }
  return blobs;
}

// A false forecast patch, popped when the plane comes near (FORECAST.popPx): fades out over popMs of game
// time, then is moved off screen to be cleared away. f.gameTime.
export const POP_MS = 300;
export function popIssr(f, i) { i.popped = true; i.popAt = f.gameTime; i.popAlpha = i.alpha; }
export function fadePopped(f, i) {
  const k = Math.min(1, (f.gameTime - i.popAt) / POP_MS);
  i.alpha = i.popAlpha * (1 - k);
  if (k >= 1) i.x = -1e4;
}

// ---------- the plane's drawn pose and pixel collisions (f.pose: { x, y, rotation }, whole pixels) ----------

// Where the plane's picture is centred and how it is tilted. The pixel hit tests use this, not the hitbox.
// f.plane, f.state, f.airborne, f.autoUntil, f.gameTime.
export function planePose(f) {
  const x = Math.round(f.plane.x - PLANE.spriteOffX + PLANE.spriteW / 2);
  const y = Math.round(f.plane.y - PLANE.spriteOffY + PLANE.spriteH / 2);
  const flying = f.state === 'playing' || f.state === 'over';
  const steep = f.autoUntil && f.gameTime < f.autoUntil;   // the autopilot pick-up banks hard
  const lim = steep ? 0.9 : PLANE.maxTilt;
  const tilt = flying ? Math.max(-lim, Math.min(lim, f.plane.vy / (steep ? 520 : 600))) : 0;
  return { x, y, rotation: f.state === 'takeoff' && f.airborne ? -0.15 : tilt };
}

// World positions of the plane's solid pixels, turned with its tilt. Once per game time (cached on f).
export function planePixels(f) {
  if (f.planePtsAt === f.gameTime && f.planePts) return f.planePts;
  const m = mask('plane'), p = f.pose;
  if (!f.planeOffsets) {
    f.planeOffsets = [];
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.at(x, y)) f.planeOffsets.push([x + 0.5 - m.w / 2, y + 0.5 - m.h / 2]);
  }
  const c = Math.cos(p.rotation), s = Math.sin(p.rotation);
  f.planePts = f.planeOffsets.map(([ox, oy]) => [p.x + ox * c - oy * s, p.y + ox * s + oy * c]);
  f.planePtsAt = f.gameTime;
  return f.planePts;
}

// How many plane pixels touch the storm's (or no-fly zone's) solid pixels, counting up to `enough`. A storm's
// solid pixels are its cloud pictures' pixels INSIDE the column: fluff outside never crashes you.
// pts(): the plane's pixels (only asked for when the plane is level with the storm).
export function stormPixelsHit(f, st, enough, pts) {
  const r0 = st.rects[0], r1 = st.rects[1], W = r0.width;
  if (f.pose.x + 40 < r0.x || f.pose.x - 40 > r0.x + W) return 0;   // not level with it
  const topH = r0.height, botY = r1.y;
  let n = 0;
  for (const [x, y] of pts()) {
    const lx = x - r0.x;
    if (lx < 0 || lx >= W) continue;
    let solid = false;
    if (st.noFly) solid = y < topH || y >= botY;   // a no-fly zone is a solid block
    else for (const q of st.pics) {
      const m = mask(q.key), px = Math.floor(lx - q.dx), py = Math.floor(y - q.y);   // whole pixels BEFORE mirroring
      if (px >= 0 && py >= 0 && px < m.w && py < m.h && m.at(q.flip ? m.w - 1 - px : px, py)) { solid = true; break; }
    }
    if (solid && ++n >= enough) return n;
  }
  return n;
}
// Storms forgive a nick of up to HAZARDS.stormForgive pixels; no-fly zones forgive nothing.
export function hitsStorm(f, st, pts) {
  const forgive = st.noFly ? 0 : HAZARDS.stormForgive;
  return stormPixelsHit(f, st, forgive + 1, pts) > forgive;
}

// ---------- birds: flocks { x, y, half, phase, birds: [{ ox, oy, x, y, key, flip }] } ----------

// A bird's picture box (its mask's size).
export function birdBox(b) { const m = mask(b.key); return { x: b.x, y: b.y, w: m.w, h: m.h }; }

// Does any plane pixel land on a bird's solid pixel? pts(): the plane's pixels.
export function hitBird(f, box, pts) {
  for (const fl of f.birds) for (const b of fl.birds) {
    const m = mask(b.key);
    if (!overlaps(box, { x: b.x - 12, y: b.y - 16, w: m.w + 24, h: m.h + 32 })) continue;   // far away: skip
    for (const [x, y] of pts()) {
      let lx = x - b.x; const ly = y - b.y;
      if (b.flip) lx = m.w - 1 - lx;
      if (m.at(lx, ly)) return true;
    }
  }
  return false;
}
