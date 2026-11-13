// How many trees a save has planted, in every land (src/groves.js: one record for every land; the old save.planted / save.plantedIn are folded in, so an older save counts the same).
// Anything that asks "has this player planted a tree?" uses this. Reads only.
import { treesPlantedTotal, treesGrownTotal } from './groves.js';
export const treesPlanted = s => !s || typeof s !== 'object' ? 0 : treesPlantedTotal(s);
export const treesGrown = s => !s || typeof s !== 'object' ? 0 : treesGrownTotal(s);
