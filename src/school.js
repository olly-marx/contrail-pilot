// Flight school: a guided first flight. Each step says something; "tap" steps freeze the game
// until the player taps, "do" steps let them fly until they have done the thing.
import { WIDTH, HEIGHT, GROUND_H, PLANE, STORMS, DAYNIGHT, AIRPORT } from './config.js';
import { writeSave } from './save.js';

const SKY_H = HEIGHT - GROUND_H;

export class School {
  constructor(scene, ui) {
    this.s = scene;
    this.ui = ui;
    this.i = -1;
    this.t = 0;             // seconds in the current step
    this.holdClock = true;  // day/night only moves when a step says so
    this.steps = this.makeSteps();
  }

  makeSteps() {
    const s = this.s;
    const ahead = () => WIDTH + 10;
    const stormAt = y => {
      const gap = 160, x = ahead();
      s.addStormPairAt(x, y, gap);
      return s.storms[s.storms.length - 1];
    };
    // Seven short steps: fly, storms, seeds, day contrails, night contrails, land. The How to play
    // card at the end puts it all on one page.
    return [
      { say: 'Hi pilot! I am Captain Cumulus.<br><b>Press and HOLD</b> the screen to take off!', done: () => s.state === 'playing' },
      { say: '<b>Tap the screen</b> to fly up. Stop tapping and you go down.', tap: true, flapOnTap: true },
      { say: '<b>Storm clouds!</b> Keep tapping and fly through the gap.',
        setup: () => { this.storm = stormAt(Phaser.Math.Clamp(s.plane.y + 6, 120, SKY_H - 120)); },
        done: () => this.storm.rects[0].x + STORMS.width < s.plane.x },
      { say: '<b>Seeds!</b> Fly into them. You only keep them if you <b>land safely</b>.',
        setup: () => { const y = Phaser.Math.Clamp(s.plane.y, 80, SKY_H - 100); [0, 40, 80].forEach(dx => s.addToken(ahead() + dx, y, false)); },
        done: () => s.tokens.length === 0 },
      { say: 'It is <b>sunny</b>. See the <b>icy air</b>? Fly INTO it! Your <b>contrail</b> makes shade, and shade <span class="cool">cools</span> the Earth.',
        setup: () => { this.issr = this.bigIssr(); },
        // Missed it? Put more icy air right in front of the plane, so this step can always be done.
        retry: () => { if (s.contrails.length <= 25 && this.issr.x + this.issr.width < s.plane.x) { this.issr = this.bigIssr(); this.ui.coach('Missed it! That is OK. Here is more icy air: <b>fly INTO it</b>!', false); } },
        done: () => s.contrails.length > 25 },
      { say: 'Now it is <b>night</b>. At night a contrail traps heat: <span class="warm">HOTTER</span>! Fly <b>above or below</b> the icy air.',
        setup: () => {
          this.holdClock = true; s.clock = DAYNIGHT.daySeconds + DAYNIGHT.blendSeconds + 1;   // straight to night
          this.issr = s.addIssrAt(ahead() + 40, Phaser.Math.Clamp(s.plane.y - 30, 70, SKY_H - 160), 220, 70);
          this.issr.entered = true;   // visible at once
        },
        done: () => this.issr.x + this.issr.width < s.plane.x - 10 },
      { say: 'Morning! <b>An airport</b> is coming. Stop tapping and <b>glide down</b> onto the grey runway.',
        setup: () => {
          this.holdClock = true; s.clock = 2;
          s.nextAirport = { worldX: s.distancePx + 520, name: AIRPORT.names[0], spawned: false };
        },
        done: () => s.state === 'landing' || s.state === 'over' },
    ];
  }

  begin() { this.next(); }

  next() {
    this.i++;
    this.t = 0;
    const step = this.steps[this.i];
    if (!step) return;
    if (step.setup) step.setup();
    const text = typeof step.say === 'function' ? step.say() : step.say;
    this.s.frozen = !!step.tap;
    this.ui.coach(text, !!step.tap, true, !step.flapOnTap);
  }

  // Returns true if flight school used the tap.
  onTap() {
    const step = this.steps[this.i];
    if (!step || !step.tap) return false;
    this.s.frozen = false;
    this.s.startGrace();
    if (step.flapOnTap) { this.next(); this.s.flap(); return true; }
    this.next();
    return true;
  }

  // Flight-school icy air: big, at the plane's height, and shown at once (no hidden reveal).
  bigIssr() {
    const s = this.s, i = s.addIssrAt(WIDTH + 10, Phaser.Math.Clamp(s.plane.y + 6 - 55, 20, SKY_H - 130), 300, 110);
    i.entered = true;   // drawn at full reveal straight away
    return i;
  }

  update(dt) {
    const step = this.steps[this.i];
    if (!step || step.tap) return;
    this.t += dt;
    if (step.retry) step.retry();
    if (step.done && step.done()) this.next();
  }

  // During flight school nothing ends the flight early: bump the plane back instead.
  forgive(box) {
    const s = this.s;
    if (s.spriteBottom() >= SKY_H) {
      const rw = s.runwayUnder(box);
      if (rw) { s.land(rw); return; }
      s.plane.vy = -260;
      s.popup(s.plane.x + 25, s.plane.y - 10, 'Whoa! Pull up!', '#ffe15a');
    }
    for (const st of s.storms) for (const r of st.rects) {
      const hit = box.x < r.x + r.width && box.x + box.w > r.x && box.y < r.y + r.height && box.y + box.h > r.y;
      if (hit && !st.bumped) {
        st.bumped = true;
        s.popup(s.plane.x + 25, s.plane.y - 10, 'Bump! Aim for the gap', '#ffe15a');
        s.cameras.main.shake(120, 0.006);
      }
    }
    s.heat = Math.min(s.heat, 90);   // no overheating in flight school
  }

  finished(result) {
    this.ui.hideCoach();
    this.s.save.tutorialDone = true;
    writeSave(this.s.save);
  }
}
