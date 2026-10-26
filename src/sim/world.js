// The sim engine's flight (2026-10-25): a plain object that runs the SAME rules as the game (src/sim/rules.js),
// with the game's drawing, sound and text hooks left empty. No Phaser, no DOM: runs in Node.
//   const w = createWorld(save, seed);   // a flight from a stored save (copied, never changed), physics seeded by seed
import { RULES } from './rules.js';
import { prepareSave } from '../save.js';

const nothing = () => {};

// What the game draws or says, which the engine skips. Each is a GameScene method of the same name.
export const VIEW_HOOKS = {
  showStorm: nothing, showNoFly: nothing, showRunway: nothing, showPlot: nothing, showIssr: nothing,
  showContrail: nothing, showToken: nothing, showFlock: nothing, showParcel: nothing, unshow: nothing,
  popup: nothing, burst: nothing, explainWhenClear: nothing, coolSparkle: nothing, enterIssr: nothing,
  playSound: nothing, buzz: nothing, shake: nothing,
onSeed: nothing, onPower: nothing, onCrystals: nothing, onLand: nothing, onPopFake: nothing,
  onDayHalf: nothing, onParcelMissed: nothing, onFinish: nothing, persist: nothing,
  showTree(tree) { tree.art = tree.kind; },
  explain() { return false; },   // a lesson pop-up would pause the game: the engine has none
  setRegion(r) { this.regionNow = r; },   // the game also fades the ground to the new land
  // Delayed actions (a tap in turbulence works a little late), timed like Phaser's: each frame's time is
  // added first, and an action runs once its delay has passed.
  later(ms, fn) { (this.timers ||= []).push({ left: ms, fn }); },
  runTimers(ms) {
    if (!this.timers || !this.timers.length) return;
    const due = [];
    this.timers = this.timers.filter(t => { t.left -= ms; if (t.left <= 0) { due.push(t.fn); return false; } return true; });
    for (const fn of due) fn();
  },
};

export function createWorld(save, seed) {
  const w = Object.assign(Object.create(null), RULES, VIEW_HOOKS);
  w.save = prepareSave(structuredClone({ ...save, simSeed: seed >>> 0 }));   // as the game loads it
  w.autostart = 'normal';
  w.ui = { tipOnce: nothing, toast: nothing };
  w.initFlight();
  w.regionNow = null; w.setRegion(w.regionHere());
  w.takeOff();   // as the game's startFlight
  return w;
}
