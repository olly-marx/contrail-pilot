// The flight's rules as methods (sim engine landing 5f, 2026-10-25), moved verbatim from GameScene. GameScene
// mixes them in (Object.assign(GameScene.prototype, RULES)) and the sim engine's world does the same, so both run
// exactly this code. `this` is the flight. No Phaser here: drawing and sound go through hooks the world leaves empty.
import { WIDTH, HEIGHT, GROUND_H, PLANE, DAYNIGHT, PARCEL, HAZARDS, AIRPORT, CLIMATE } from '../config.js';
import { legBetween } from '../route.js';
import { overlaps } from './physics.js';
import * as P from './physics.js';

const SKY_H = HEIGHT - GROUND_H;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // = Phaser.Math.Clamp

export const RULES = {
  inGrace() { return this.graceUntil && this.gameTime < this.graceUntil; },
  onAutopilot() { return this.autoUntil && this.gameTime < this.autoUntil; },
  // Where the autopilot steers (plane top y): the middle of the next storm gap ahead, else a safe
  // height; nudged above or below a flock of birds near that line.
  autopilotTarget() {
    const ahead = this.storms.filter(st => st.rects[0].x + st.rects[0].width > this.plane.x - 4 && st.rects[0].x < WIDTH)
      .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    let y = ahead ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - PLANE.h / 2 : this.plane.y;
    for (const f of this.birds) {
      if (f.x > this.plane.x - 20 && f.x < this.plane.x + 220 && Math.abs(f.y - y) < 50) y = f.y > y ? f.y - 60 : f.y + 60;
    }
    return clamp(y, 40, SKY_H - 60);
  },
  // The autopilot PICK-UP's pilot: tries every height and flies the path that is best a little way
  // ahead. Storms and birds are off limits; icy air is sought by day (a shading contrail) but only if
  // the contrail will fade before dark, and avoided otherwise (it would trap heat). It uses the same
  // icy-air shape test that makes real contrails (inIssrShape), so it knows exactly where they form.
  wantContrails() {
    if (!this.isDay) return false;
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const toWarm = D - B / 2 - this.clock % (D + N);   // contrails start to warm halfway through dusk
    return toWarm > this.kit.contrailLife / 1000 + 1;
  },
  autopilotPlan() {
    const H = PLANE.h, W = PLANE.w, want = this.wantContrails();
    const ahead = [0, 12, 24, 40, 60, 85, 115, 150];
    let best = this.plane.y, bestCost = Infinity;
    for (let y = 34; y <= SKY_H - 80; y += 3) {
      let cost = Math.abs(y - this.plane.y) * 0.15;
      ahead.forEach((d, k) => {
        const w = 1 / (1 + k * 0.35);                                       // nearer matters more
        const box = { x: this.plane.x + d, y, w: W, h: H };
        for (const st of this.storms) for (const r of st.rects) {
          if (box.x < r.x + r.width + 4 && box.x + W > r.x - 4 && y < r.y + r.height + 6 && y + H > r.y - 6) cost += 1000 * w;
        }
        const pad = { x: box.x - 8, y: y - 10, w: W + 16, h: H + 20 };          // every bird's picture, with room to spare
        for (const f of this.birds) for (const bd of f.birds) if (overlaps(pad, P.birdBox(bd))) cost += 1000 * w;
        for (const i of this.issrs) if (this.inIssrShape(i, box)) cost += (want ? -40 : 600) * w;
      });
      if (cost < bestCost) { bestCost = cost; best = y; }
    }
    return best;
  },
  // Bigger Hold: grows faster. Rounded to 1 decimal so 1 + 0.6 * n never shows as 3.4000000000000004.
  multiplier() { return Math.round((1 + this.kit.perSkip * this.airportsSkipped) * 10) / 10; },
  hitbox() { return { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h }; },
  // Hitbox y at which the sprite's wheels touch the ground.
  groundedY() { return SKY_H - PLANE.spriteH + PLANE.spriteOffY; },
  // Bottom of the drawn plane (wheels), used for ground contact.
  spriteBottom() { return this.plane.y - PLANE.spriteOffY + PLANE.spriteH; },
  runwayUnder(box) {
    return this.runways.find(r => r.x <= box.x && box.x + box.w <= r.x + AIRPORT.runwayLen && r.name !== this.homeName);
  },
  // The k-th airport ahead of the start city (0 = the next one), at worldX `from` + that leg.
  airportAhead(k, from = 0) {
    return { worldX: from + this.legKm(k), name: this.path[k + 1], spawned: false };
  },
  // Game km of leg k of this flight's path (balanced, src/network.js).
  legKm(k) { return legBetween(this.path[k], this.path[k + 1]); },
  // Parcels take turns through the kinds of tree you own, so variety comes naturally.
  treeKind() {
    const list = this.kit.tree ? this.kit.tree.species : ['spruce'];
    return list[this.speciesIdx % list.length];
  },
  // Parcels keep the plane's forward speed and drift down under a parachute, so you have to
  // drop them before you reach a soil plot. This works out which bit of ground (in today's screen
  // position) one would land on if dropped now. The ground keeps scrolling while it falls, so
  // that is the parcel's screen drift plus the scroll: it lands ahead of the plane.
  predictLanding() {
    let x = this.plane.x + PLANE.w / 2, y = this.plane.y + PLANE.h, vy = 0, vx = 0, t = 0;
    const dt = 1 / 60;
    while (y < SKY_H && t < 8) {
      t += dt;
      vy = t < PARCEL.chuteAfter ? vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, vy + PARCEL.gravity * dt);
      vx = -this.speed * (1 - Math.exp(-t / PARCEL.dragTime));   // on screen: drifts back as it slows
      x += (vx + this.speed) * dt; y += vy * dt;
    }
    return x;
  },
  // A flock at (x, y) flies at speed + extraSpeed; each storm on screen at speed. When the plane
  // reaches a storm, would the flock be near the plane and inside that storm's gap?
  flockBlocksGap(x, y, half) {   // half: the flock's size in old V steps (13 px across, 9 px down)
    const B = HAZARDS.birds, v = Math.max(1, this.speed);
    const top = y - half * 9 - 4 - B.wobble, bottom = y + half * 9 + 16 + B.wobble;   // the V's height, bird size and bobbing
    return this.storms.some(st => {
      const r = st.rects[0], t = (r.x - this.plane.x) / v;
      if (t < 0) return false;
      const fx = x - (v + B.extraSpeed) * t;
      return fx < this.plane.x + PLANE.w + 120 && fx + half * 26 + 16 > this.plane.x - 80 && top < st.rects[1].y && bottom > r.height;   // wide margin: the speed creeps up
    });
  },
  heatPct() { return this.heat * 100 / CLIMATE.dangerLine; },   // heat as % of the danger line (the warning thresholds are in %)
};
