// SPECIAL DROP-OFF CRATES (the user, 2026-11-24: "you drop an extra large crate down onto the airstrip without landing, and ... then
// you have to keep going after that"). Mixed into RULES (src/sim/rules.js), so the game and the Node engine fly the same crate.
// A flight of a special drop-off story (src/storyboard.js crateStops) carries one big crate for each crate stop on its way, in order.
// Over that stop's runway, or coming up to it, the DROP button drops it: it floats down under a big parachute (the user, 12:41: "a special
// container that'll float down"), keeping much of the plane's speed for a while (CRATE_FALL), so it must be let go BEFORE the runway. On that runway: delivered. Off it, or the runway passed with no crate: missed, and the
// rest of this flight's crates are off (the stops must be reached in order). The flight result carries { delivered, missed } and
// src/missions2.js onFlight pays a delivered stop (storyboard deliveredAt) or takes a heart for a miss.
import { PLANE, AIRPORT } from '../config.js';
import { crateStops } from '../storyboard.js';

export const CRATE_FALL = { gravity: 320, chuteAfter: 0.3, terminal: 120, dragTime: 2.2 };   // px/s^2, s, px/s under the chute, s (a tree parcel: 320, 0.25, 160, 3.0)
const SKY_H_OF = w => w.skyH;   // (set by initCrates: the ground line the rules use)

export const CRATES = {
  initCrates(skyH) {
    this.skyH = skyH;
    this.crates = !this.school && !this.crossing && this.save && this.save.tutorialDone ? crateStops(this.save) : [];
    this.cratesFalling = []; this.crateDone = []; this.crateMissed = [];
  },
  // The runway the next crate is for, while it is on screen and not yet behind the plane (null: nothing to drop on now).
  crateRunway() {
    const c = this.crates && this.crates[0]; if (!c || this.cratesFalling.some(p => p.city === c)) return null;
    return (this.runways || []).find(r => r.name === c && r.x + AIRPORT.runwayLen > this.plane.x - 40 && r.x < this.plane.x + 640) || null;   // (coming up: a floating crate is let go well before)
  },
  crateDue() { return this.state === 'playing' && !this.frozen && !!this.crateRunway(); },
  dropCrate() {
    if (!this.crateDue()) return false;
    const p = { x: this.plane.x + PLANE.w / 2, y: this.plane.y + PLANE.h, t: 0, vy: 0, city: this.crates[0], crate: true };
    this.cratesFalling.push(p); this.showParcel(p); this.playSound('flap');
    return true;
  },
  updateCrates(dt) {
    if (!this.cratesFalling || !this.cratesFalling.length) return;
    this.cratesFalling = this.cratesFalling.filter(p => {
      p.t += dt;
      p.vy = p.t < CRATE_FALL.chuteAfter ? p.vy + CRATE_FALL.gravity * dt : Math.min(CRATE_FALL.terminal, p.vy + CRATE_FALL.gravity * dt);
      p.x += -this.speed * (1 - Math.exp(-p.t / CRATE_FALL.dragTime)) * dt;
      p.y += p.vy * dt;
      if (p.y < SKY_H_OF(this)) return true;
      const rw = (this.runways || []).find(r => r.name === p.city);
      this.crateLanded(p.city, !!(rw && p.x >= rw.x && p.x <= rw.x + AIRPORT.runwayLen), p.x);
      this.unshow(p);
      return false;
    });
  },
  crateLanded(city, hit, x) {
    if (this.crates[0] !== city) return;
    if (hit) { this.crates.shift(); this.crateDone.push(city); }
    else { this.crateMissed.push(city); this.crates = []; }   // (in order: a miss ends this flight's deliveries)
    this.onCrate(city, hit, x);
  },
  // The airport `name` was passed (src/sim/rules.js spawn): its crate was never dropped = missed.
  crateAirportPassed(name) {
    if (this.crates && this.crates[0] === name && !this.cratesFalling.some(p => p.city === name)) this.crateLanded(name, false, null);
  },
  crateResult() { return { delivered: [...(this.crateDone || [])], missed: [...(this.crateMissed || [])] }; },
};
