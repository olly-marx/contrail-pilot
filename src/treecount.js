// How many trees a save has planted, in every land. UK trees are counted in save.planted (species id -> n); trees planted in any other land are
// in save.plantedIn[region][id] (src/sim/rules.js, src/nature.js). Anything that asks "has this player planted a tree?" must use this, not
// save.planted alone: a player who planted only abroad has planted {} (the 'Soil Patches' line stayed '???' for such a player). Reads only.
const num = o => Object.values(o && typeof o === 'object' ? o : {}).reduce((a, n) => a + (Number(n) || 0), 0);
export const treesPlanted = s => !s || typeof s !== 'object' ? 0 : num(s.planted) + Object.values(s.plantedIn && typeof s.plantedIn === 'object' ? s.plantedIn : {}).reduce((a, book) => a + num(book), 0);
