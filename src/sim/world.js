// The sim engine's flight (2026-10-25): a plain object that runs the SAME rules as the game (src/sim/rules.js),
// with the game's drawing, sound and text hooks left empty. No Phaser, no DOM: runs in Node.
//   const w = createWorld(save, seed);   // a flight from a stored save (copied, never changed), physics seeded by seed
import { RULES } from './rules.js';
import { prepareSave } from '../save.js';

const nothing = () => {};

// What the game draws or says, which the engine skips. Each is a GameScene method of the same name.
export const VIEW_HOOKS = {
  showStorm: nothing, showNoFly: nothing, showRunway: nothing, showPlot: nothing, showIssr: nothing,
  showContrail: nothing, showToken: nothing, showFlock: nothing,
  popup: nothing, burst: nothing, explainWhenClear: nothing,
  explain() { return false; },   // a lesson pop-up would pause the game: the engine has none
  setRegion(r) { this.regionNow = r; },   // the game also fades the ground to the new land
};

export function createWorld(save, seed) {
  const w = Object.assign(Object.create(null), RULES, VIEW_HOOKS);
  w.save = prepareSave(structuredClone({ ...save, simSeed: seed >>> 0 }));   // as the game loads it
  w.autostart = 'normal';
  w.ui = { tipOnce: nothing, toast: nothing };
  w.initFlight();
  w.regionNow = null; w.setRegion(w.regionHere());
  return w;
}
