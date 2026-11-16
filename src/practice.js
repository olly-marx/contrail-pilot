// THE TREE PRACTICE FLIGHT (School board lesson 'practice', src/lessons.js; the user, 2026-11-16: "especially tree planting ... these systems work but I think they aren't clear").
// Like flight school (src/school.js): it IS a school as far as the flight rules go (scene.school is set, so nothing spawns by itself, nothing is banked, a crash bumps the
// plane back), with its own steps: a lesson card, then three wide soil patches in daylight with nothing else in the sky. A miss gives the seed back. The trees planted
// here are practice: none is written to the save (src/sim/rules.js parcelLanded skips plantTree in a school). After three hits the lesson is done (save.treePractice)
// and the player is back on HOME. Every bubble is about the ground, so every bubble sits at the TOP (the user, 2026-11-16).
import { School } from './school.js';
import { tip } from './tips.js';
import { WIDTH } from './config.js';
import { writeSave } from './save.js';

export const PRACTICE_HITS = 3;
export class Practice extends School {
  makeSteps() {
    const s = this.s;
    this.practice = true;
    const plots = () => { [0, 300, 600].forEach(dx => s.addPlot(WIDTH + 10 + dx)); };
    return [
      { say: tip('school-hold'), done: () => s.state === 'playing', top: true },
      { say: tip('practice-card'), tap: true, pic: 'lesson-plot', top: true, setup: () => { this.holdClock = true; s.clock = 2; s.parcels = Math.max(s.parcels || 0, PRACTICE_HITS); } },
      { say: tip('practice-go'), top: true,
        setup: () => { this.hits0 = s.planted || 0; plots(); },
        // A patch that went by unplanted comes round again, so this step can always be done.
        retry: () => { if (!s.plots.some(pl => !pl.used && pl.x > s.plane.x - 40)) plots(); s.parcels = Math.max(s.parcels, PRACTICE_HITS - ((s.planted || 0) - this.hits0)); },
        done: () => (s.planted || 0) - this.hits0 >= PRACTICE_HITS },
      { say: tip('practice-done'), tap: true, top: true },
    ];
  }
  // The last tap ends the lesson: back to HOME, nothing banked.
  onTap() {
    const last = this.i === this.steps.length - 1;
    const used = super.onTap();
    if (used && last) this.end();
    return used;
  }
  end() {
    const s = this.s;
    s.save.treePractice = true; writeSave(s.save);
    s.school = null; s.frozen = false; this.ui.hideCoach();
    s.scene.restart({});   // EMPTY data, said out loud: Phaser keeps the last start's data when restart() is given none, and that was { go: true, mode: 'practice' } (the practice started again behind HOME)
    this.ui.showTitle();
    this.ui.toast('Lesson done!', 'Tree practice flight', 'good', 3);
  }
  forgive(box) { super.forgive(box); }
  finished() { this.ui.hideCoach(); }
  markTaught() {}
}
