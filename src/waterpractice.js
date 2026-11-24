// THE WATER LESSON (Plan C; Oliver, 2026-11-23: 'People need to be taught about water projects when they unlock their first, like back to school about it').
// When a land's trees are full its WATER opens (src/waterways.js): from then on, drops over that land go to the blue water targets, and water projects open in NATURE.
// The School board (src/lessons.js 'water') opens this lesson as soon as any land's water is open. Like the tree practice flight (src/practice.js): a school flight, nothing
// banked, a crash bumps the plane back, a miss gives the drop back, nothing is written to the save (rules.js waterLanded skips the book in a school). It pins the land
// (school.waterLand, read by rules.js dropLand) so the drops are that land's water life wherever the plane flies. Three blue targets; three hits end it (save.waterPractice).
import { Practice } from './practice.js';
import { tip } from './tips.js';
import { WIDTH } from './config.js';
import { writeSave } from './save.js';
import { waterLessonLand } from './lessons.js';

export const WATER_HITS = 3;
export class WaterPractice extends Practice {
  makeSteps() {
    const s = this.s;
    this.practice = true;
    this.waterLand = waterLessonLand(s.save) || 'woodland';
    const plots = () => { [0, 320, 640].forEach(dx => s.addPlot(WIDTH + 10 + dx, true)); };
    return [
      { say: tip('school-hold'), done: () => s.state === 'playing', top: true },
      { say: tip('water-card'), tap: true, pic: 'lesson-plot', top: true, setup: () => { this.holdClock = true; s.clock = 2; s.parcels = Math.max(s.parcels || 0, WATER_HITS); } },
      { say: tip('water-go'), top: true,
        setup: () => { this.hits0 = s.waterDrops || 0; plots(); },
        retry: () => { if (!s.plots.some(pl => !pl.used && pl.water && pl.x > s.plane.x - 40)) plots(); s.parcels = Math.max(s.parcels, WATER_HITS - ((s.waterDrops || 0) - this.hits0)); },
        done: () => (s.waterDrops || 0) - this.hits0 >= WATER_HITS },
      { say: tip('water-done'), tap: true, top: true },
    ];
  }
  end() {
    const s = this.s;
    s.save.waterPractice = true; writeSave(s.save);
    s.school = null; s.frozen = false; this.ui.hideCoach();
    s.scene.restart({});   // (EMPTY data: see src/practice.js end)
    this.ui.showTitle();
    this.ui.toast('Lesson done!', 'Water life', 'good', 3);
  }
}
