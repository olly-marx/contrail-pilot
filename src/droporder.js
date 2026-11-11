// THE DROP ORDER (TREES V2 step 3, research/DESIGN-TREES-V2.md section C; the user, 2026-11-10: "The DROP ORDER of the trees depends on what is unlocked AND whether the diversity allows: no point planting MORE spruce if that is overpopulated").
// The next tree dropped in a land is chosen by the game, so a child never picks and always knows what will land: among the land's OPEN kinds (src/landtrees.js treesOpen) it is the kind with the FEWEST trees (planted, saplings included, plus the
// parcels already released this flight that have not landed yet); a kind at its cap (TREE_CAP, 9) is skipped; a tie goes to the lowest slot. Nothing left: the grove is full (null). Pure and deterministic: no random numbers.
import { treesOpen, TREE_CAP } from './landtrees.js';
import { localTree, UK_SLOTS } from './nature.js';
import { treeBook } from './groves.js';
import { visible } from './missions2.js';

// THE SIM'S A/B SWITCH (research M-T6; flippable in Node like ROUTE_AIM.on): on = this order (shipping state); off = the old turns through the open kinds (speciesIdx % open.length).
export const DROP_ORDER = { on: true, preferMission: true };
// THE MISSION'S KIND (the user, 2026-11-11: while a 'Plant a <tree>' mission is open the drop order PREFERS that kind): the tag of the open plant-tree mission ('oak' in the woodland, '<land>:<id>' elsewhere: the same tag
// src/missions2.js compares with the flight's treeIds), or null. Read once per flight (src/sim/rules.js reset), not per frame. DROP_ORDER.preferMission = false is the sim's second arm (research M-T7b): fewest-first only.
export const missionTag = save => { const m = visible(save).find(x => x.def && x.def.id === 'plant-tree'); return m && m.fill && m.fill.treeTag ? m.fill.treeTag : null; };

// pending: { treeId: n } parcels released this flight in this land that have not landed (or missed) yet.
export function nextTree(save, land, pending = {}, prefer = null) {
  const book = treeBook(save, land);
  const cand = treesOpen(save, land).map(slot => { const t = localTree(UK_SLOTS[slot], land); return { slot, id: t.id, name: t.name, tag: land === 'woodland' ? t.id : `${land}:${t.id}`, n: (book[t.id] || 0) + (pending[t.id] || 0) }; });
  const room = cand.filter(c => c.n < TREE_CAP);
  const want = DROP_ORDER.preferMission && prefer ? room.find(c => c.tag === prefer) : null;   // the open mission's kind first, but ONLY while it has room (the cap of 9 still wins)
  if (want) return want;
  return room.length ? room.reduce((a, c) => (c.n < a.n ? c : a)) : null;
}
// The word on the button: the first word of the tree's name, upper case, at most 8 letters ('Next: OAK').
export const shortName = name => String(name || '').split(' ')[0].toUpperCase().slice(0, 8);
