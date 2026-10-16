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
    return [
      { say: 'Hi pilot! I am Captain Cumulus. Let\'s learn to fly.<br><b>Press and HOLD</b> the screen to take off!', done: () => s.state === 'playing' },
      { say: '<b>Tap the screen</b> to fly up.<br>Stop tapping and you go down.', tap: true, flapOnTap: true },
      { say: 'Keep tapping to stay in the sky!', done: () => this.t > 3 },
      { say: '<b>Storm clouds!</b> Fly through the gap.',
        setup: () => { this.storm = stormAt(Phaser.Math.Clamp(s.plane.y + 6, 120, SKY_H - 120)); },
        done: () => this.storm.rects[0].x + STORMS.width < s.plane.x },
      { say: '<b>Seeds!</b> Fly into them to grab them. Seeds grow into trees!',
        setup: () => { const y = Phaser.Math.Clamp(s.plane.y, 80, SKY_H - 100); [0, 40, 80].forEach(dx => s.addToken(ahead() + dx, y, false)); },
        done: () => s.tokens.length === 0 },
      { say: () => s.cargo
          ? `You grabbed <b>${s.cargo}</b>! Your seeds are <b>on board</b> (top left).<br>You only keep them if you <b>land safely</b>.`
          : 'Missed them! That is OK. Seeds you grab go <b>on board</b> (top left). You only keep them if you <b>land safely</b>.',
        tap: true },
      { say: 'Some air up here is <b>icy</b>. You can\'t see it until you are close. Fly into the icy air ahead!',
        setup: () => { this.issr = s.addIssrAt(ahead(), Phaser.Math.Clamp(s.plane.y - 35, 20, SKY_H - 120), 300, 80); },
        done: () => s.contrails.length > 25 },
      { say: 'See the white line? That is a <b>contrail</b>: a cloud made by your plane.<br>It is <b>daytime</b>, so the contrail makes <b>shade</b>. Shade cools the Earth! <span class="cool">Blue = cooler</span>.',
        tap: true },
      { say: 'Now it is <b>night</b>...', setup: () => { this.holdClock = false; s.clock = DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds; },
        done: () => !s.isDay && s.nightAmount() > 0.95 },
      { say: 'At night a contrail is like a <b>blanket</b>. It keeps heat in, and the Earth gets <span class="warm">HOTTER</span>.<br>So at night, <b>stay out of icy air</b>!',
        tap: true, setup: () => { this.holdClock = true; } },
      { say: 'Icy air ahead! Fly <b>above or below</b> it.',
        setup: () => { this.night = s.heatTrapped; this.issr = s.addIssrAt(ahead() + 40, Phaser.Math.Clamp(s.plane.y - 30, 70, SKY_H - 160), 220, 70); },
        done: () => this.issr.x + this.issr.width < s.plane.x - 10 },
      { say: () => (s.heatTrapped - this.night > 0.5
          ? 'Oops, a night contrail! See the red? That is heat trapped. Next time fly around it.'
          : 'Great flying! No night contrail. The Earth says thank you!'), tap: true },
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
    if (step.flapOnTap) { this.next(); this.s.flap(); return true; }
    this.next();
    return true;
  }

  update(dt) {
    const step = this.steps[this.i];
    if (!step || step.tap) return;
    this.t += dt;
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
