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
    // Freeze, show, do. Each lesson: the game freezes and dims, a diagram explains the idea
    // (`pic`, an assets/ui/lesson-*.png), then the player tries it with only that thing on screen.
    const lesson = (pic, say, setup) => ({ say, tap: true, pic, setup });
    return [
      { say: 'Hi pilot! I am Captain Cumulus.<br><b>Press and HOLD</b> the screen to take off!', done: () => s.state === 'playing' },
      lesson('lesson-tap', '<b>Tap</b> the screen and the plane goes <b>up</b>.<br>Stop tapping and it goes <b>down</b>.'),
      { say: 'Tap now!', tap: true, flapOnTap: true },
      { say: 'Keep tapping to stay in the sky!', done: () => this.t > 2.5 },
      lesson('lesson-storm', '<b>Storm clouds</b> come in pairs. Fly through the <b>gap</b> between them.'),
      { say: 'Storm ahead! Through the gap.',
        setup: () => { this.storm = stormAt(Phaser.Math.Clamp(s.plane.y + 6, 120, SKY_H - 120)); },
        done: () => this.storm.rects[0].x + STORMS.width < s.plane.x },
      lesson('lesson-seed', '<b>Seeds</b> float in the sky. Fly into them to grab them.<br>You only <b>keep</b> them if you <b>land safely</b>. Crash, and they are gone.'),
      { say: 'Seeds ahead! Grab them.',
        setup: () => { const y = Phaser.Math.Clamp(s.plane.y, 80, SKY_H - 100); [0, 40, 80].forEach(dx => s.addToken(ahead() + dx, y, false)); },
        done: () => s.tokens.length === 0 },
      lesson('lesson-day', 'Some air up here is <b>icy</b>. Fly through it and your plane leaves a cloud line: a <b>contrail</b>.<br>In <b>sunshine</b>, the contrail makes <b>shade</b>. Shade <span class="cool">cools</span> the Earth.'),
      { say: 'Icy air ahead! <b>Fly INTO it</b>.',
        setup: () => { this.issr = this.bigIssr(); },
        // Missed it? Put more icy air right in front of the plane, so this step can always be done.
        retry: () => { if (s.contrails.length <= 25 && this.issr.x + this.issr.width < s.plane.x) { this.issr = this.bigIssr(); this.ui.coach('Missed it! That is OK. Here is more icy air: <b>fly INTO it</b>!', false); } },
        done: () => s.contrails.length > 25 },
      { say: 'You made a <b>contrail</b>! It is making <b>shade</b> on the ground below.<br>Shade pulls the Earth bar (right) <b>down</b>. Down = <span class="cool">cooler</span>.', tap: true, high: true,
        setup: () => s.hud.highlight(true) },
      lesson('lesson-night', 'At <b>night</b> there is no sun to block. A contrail is like a <b>lid on a pot</b>: heat cannot get out. The Earth gets <span class="warm">HOTTER</span>.<br>So at night, fly <b>above or below</b> icy air.'),
      { say: 'Night! Icy air ahead: fly <b>above or below</b> it.',
        setup: () => {
          s.hud.highlight(false);
          s.issrs.forEach(i => { i.maskGfx.destroy(); i.destroy(); }); s.issrs = [];   // clear the day's icy air first
          this.holdClock = true; s.clock = DAYNIGHT.daySeconds + DAYNIGHT.blendSeconds + 1;   // straight to night
          this.night = s.heatTrapped;
          this.issr = s.addIssrAt(ahead() + 40, Phaser.Math.Clamp(s.plane.y - 30, 70, SKY_H - 160), 220, 70);
          this.issr.entered = true;   // visible at once
        },
        done: () => this.issr.x + this.issr.width < s.plane.x - 10 },
      { say: () => (s.heatTrapped - this.night > 0.5
          ? 'Oops, a <b>night contrail</b>! See the <span class="warm">red</span>? That is heat trapped. Next time fly around it.'
          : 'Great flying! <b>No night contrail.</b> The Earth says thank you!'), tap: true },
      lesson('lesson-heat', 'Watch the <b>Earth bar</b>! CO2 and night contrails fill it <span class="warm">red</span>. If it reaches the <b>top</b>, the Earth is too hot: your flight <b>ends</b> and you lose your seeds.<br>Shade and trees bring it down.'),
      lesson('lesson-land', 'Morning! An <b>airport</b> is coming. <b>Stop tapping</b> and glide down onto the grey runway to land.', () => { this.holdClock = true; s.clock = 2; }),
      { say: 'Glide down onto the runway!',
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
    this.ui.coach(text, !!step.tap, !step.high, !step.flapOnTap, step.pic || null);   // high: bubble at the top, so the ground shows
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
    this.s.hud.highlight(false);
    this.s.save.tutorialDone = true;
    writeSave(this.s.save);
  }
}
