// THE DROP ORDER (TREES V2 step 3, research/DESIGN-TREES-V2.md section C; the user, 2026-11-10: "The DROP ORDER of the trees depends on what is unlocked AND whether the diversity allows: no point planting MORE spruce if that is overpopulated").
// The next tree dropped in a land is chosen by the game, so a child never picks and always knows what will land: among the land's OPEN kinds (src/landtrees.js treesOpen) it is the kind with the FEWEST trees (planted, saplings included, plus the
// parcels already released this flight that have not landed yet); a kind at its cap (TREE_CAP, 9) is skipped; a tie goes to the lowest slot. Nothing left: the grove is full (null). Pure and deterministic: no random numbers.
import { treesOpen, TREE_CAP } from './landtrees.js';
import { localTree, UK_SLOTS } from './nature.js';
import { treeBook } from './groves.js';

// THE SIM'S A/B SWITCH (research M-T6; flippable in Node like ROUTE_AIM.on): on = this order (shipping state); off = the old turns through the open kinds (speciesIdx % open.length).
export const DROP_ORDER = { on: true };

// pending: { treeId: n } parcels released this flight in this land that have not landed (or missed) yet.
export function nextTree(save, land, pending = {}) {
  const book = treeBook(save, land);
  const cand = treesOpen(save, land).map(slot => { const t = localTree(UK_SLOTS[slot], land); return { slot, id: t.id, name: t.name, n: (book[t.id] || 0) + (pending[t.id] || 0) }; });
  const room = cand.filter(c => c.n < TREE_CAP);
  return room.length ? room.reduce((a, c) => (c.n < a.n ? c : a)) : null;
}
// The word on the button: the first word of the tree's name, upper case, at most 8 letters ('Next: OAK').
export const shortName = name => String(name || '').split(' ')[0].toUpperCase().slice(0, 8);
