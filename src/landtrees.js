// Each land's trees belong to that land (research/PROPOSAL-TREES.md, approved 2026-10-25/26).
// Slot 0, the plantation tree, is open from the start; each native slot opens with that land's own nature.
// The hangar no longer sells tree kinds: it keeps the planting tools (parcels, soil patches, nursery).
import { REGION_TREES } from './habitat/trees.js';
import { isSeason2 } from './missions2.js';
import { AREAS } from './areas.js';
import { city } from './route.js';
import { UK_SLOTS, SPECIES, projectsDone, biodiversity, regionSpecies, localTree } from './nature.js';

// What opens each native slot, in order (slot 1..4). Each rule reads only that land.
export const OPENS = [
  null,   // slot 0: always open
  { text: 'Finish a habitat project here', ok: (save, land) => projectsDone(save, land).length >= 1 },
  { text: 'Reach biodiversity 20 here', ok: (save, land) => biodiversity(save, land) >= 20 },
  { text: 'Find 5 of the animals here', ok: (save, land) => foundHere(save, land) >= 5 },
  // Native 4 (S3, PROPOSAL-TREE-MISSIONS.md): season 2 opens it with the area's crossing-trial mission "plant 3 kinds of
  // this land's tree in one flight" (src/missions2.js 'kinds3'), done in an area that has this land. Classic saves have
  // no area missions and keep the old rule, biodiversity 40 there.
  { text: 'Plant 3 kinds of tree here in one flight', ok: (save, land) => (isSeason2(save) ? kindsMissionDone(save, land) : biodiversity(save, land) >= 40) },
];

// Is the "3 kinds of tree" mission done in an area with this land (any of its cities stands in it)?
const kindsMissionDone = (save, land) => Object.keys(AREAS).some(a => (save.missionsDone || []).includes(`${a}:kinds3`)
  && AREAS[a].cities.some(c => { const x = city(c); return x && x.region === land; }));

const NO_TREES = ['ocean', 'ice'];
export const hasTrees = land => !NO_TREES.includes(land) && (land === 'woodland' || !!REGION_TREES[land]);

// Animals of this land you have found (save.found: id -> time; an animal may live in several lands).
export function foundHere(save, land) {
  const f = save.found || {};
  return regionSpecies(land).filter(w => f[w.id]).length;
}

// Open slots in a land, e.g. [0, 1, 2]. Nothing grows on the sea or the ice: [].
export function treesOpen(save, land) {
  if (!hasTrees(land)) return [];
  const open = [0];
  for (let s = 1; s < OPENS.length; s++) if (OPENS[s].ok(save, land)) open.push(s);
  return open;
}

// The UK kind for a slot (growth and cooling use its SPECIES row; localTree names the land's own tree).
export const slotKind = slot => UK_SLOTS[slot];

// The land's 5 trees for the NATURE page: { slot, id, name, open, n, cap, full, rule }.
export const TREE_CAP = 9;   // points level off at 9 of a kind (nature.js speciesPoints: 6 x sqrt(9) = 18, 2 x sqrt(9) = 6)
export function landTrees(save, land) {
  if (!hasTrees(land)) return [];
  const open = treesOpen(save, land), book = land === 'woodland' ? save.planted || {} : (save.plantedIn || {})[land] || {};
  return UK_SLOTS.map((kind, slot) => {
    const t = localTree(kind, land), n = book[t.id] || 0;
    return { slot, id: t.id, name: t.name, fact: t.fact, open: open.includes(slot), n, cap: TREE_CAP, full: n >= TREE_CAP, rule: OPENS[slot] && OPENS[slot].text };
  });
}
// "Oak 4/9" or "Spruce 9/9 full".
export const countText = t => `${t.name} ${Math.min(t.n, t.cap)}/${t.cap}${t.full ? ' full' : ''}`;

// Slots open now that were not open in `before` (a copy of the save from before the flight / purchase).
export const newlyOpen = (before, after, land) => treesOpen(after, land).filter(s => !treesOpen(before, land).includes(s));
