// THE LAND STRIP (0.78.0; Oliver, 2026-11-24: 'the little tree bars at the bottom of the in flight hud don't do anything do they? We should replace them').
// Until 0.78.0 the bottom of the flight HUD held the FOREST METER: 10 little trees for the CO2 this flight's new trees stored, and 'kinds n/5' for the kinds planted THIS
// flight. Over a full land it read 'kinds 0/5' while every drop went on the water, so it told the player nothing about what their drops were for.
// Now it shows the land under the plane and what the drops fill there: its short name, a TREE bar (trees planted of the open kinds' caps) and a WATER bar (water drops of
// DROP_CAP a kind), each filling as a drop lands; both full = the land is done ('FULL'), and the flight shows no target or PLANT button there (src/sim/rules.js landDone).
// Pure: src/GameScene.js draws it, tests/landstrip.cjs checks it.
import { REGION_DATA } from './habitats.js';
import { LAND_SHORT } from './landlabels.js';
import { treesOpen, capOf, hasTrees } from './landtrees.js';
import { localTree, UK_SLOTS } from './nature.js';
import { treeBook } from './groves.js';
import { dropsOf, DROP_CAP } from './waterways.js';

// { land, name, trees: [n, of], water: [n, of] (of 0 = the land has no water drops), done } for a land with a meter; null over the sea, the ice or a land with no trees.
export function landProgress(save, land) {
  if (!land || !REGION_DATA[land] || !hasTrees(land)) return null;
  const book = treeBook(save, land), cap = capOf(land), open = treesOpen(save, land);
  const tn = open.reduce((a, slot) => a + Math.min(cap, book[localTree(UK_SLOTS[slot], land).id] || 0), 0), tof = open.length * cap;
  const kinds = dropsOf(land), wb = (save.waterBook || {})[land] || {};
  const wn = kinds.reduce((a, k) => a + Math.min(DROP_CAP, wb[k.id] || 0), 0), wof = kinds.length * DROP_CAP;
  return { land, name: LAND_SHORT[land] || land, trees: [tn, tof], water: [wn, wof], done: tof > 0 && tn >= tof && wn >= wof };
}
// A bar's fill, 0..1 (an empty denominator reads as full: nothing to fill).
export const frac = ([n, of]) => (of > 0 ? Math.max(0, Math.min(1, n / of)) : 1);
