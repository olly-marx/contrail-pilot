// THE DROP ORDER (TREES V2 step 3, research/DESIGN-TREES-V2.md section C; the user, 2026-11-10: "The DROP ORDER of the trees depends on what is unlocked AND whether the diversity allows: no point planting MORE spruce if that is overpopulated").
// AMENDED 2026-11-12: the shipping order is now 'turns' (see DROP_ORDER below); the rest of this header describes the 'fewest' mode (the sim's t0b arm).
// The next tree dropped in a land is chosen by the game, so a child never picks and always knows what will land: among the land's OPEN kinds (src/landtrees.js treesOpen) it is the kind with the FEWEST trees (planted, saplings included, plus the
// parcels already released this flight that have not landed yet); a kind at its cap (TREE_CAP, 9) is skipped; a tie goes to the lowest slot. Nothing left: the grove is full (null). Pure and deterministic: no random numbers.
import { treesOpen, TREE_CAP } from './landtrees.js';
import { localTree, UK_SLOTS } from './nature.js';
import { treeBook } from './groves.js';
import { visible } from './missions2.js';

// THE ORDER, three modes (the sim chat's switch, flippable in Node like ROUTE_AIM.on; the user, 2026-11-12: "drop in normal order unless a tree species is full", after the sim measured fewest-first at about 45 percent less tree cooling):
//   'turns'  (the shipping default)  the kinds take TURNS over the land's open kinds, as the game did before trees v2 (src/sim/rules.js treeKind: open[speciesIdx % open.length]); a kind at its cap of 9 is skipped;
//                                    the open plant-tree mission's kind goes FIRST on the first drop of a flight only (`first`), the rest take turns
//   'fewest' (the sim's t0b/t0p arm)  the kind with the fewest trees, the mission's kind on every drop (what rel-block2 shipped before this change)
//   'off'                             the game exactly as before trees v2: open[turn % open.length], no cap, no preference
// DROP_ORDER.on is kept for old sim scripts: true unless the mode is 'off'; setting it false sets 'off', true sets 'turns' back from 'off'.
export const DROP_MODES = ['turns', 'fewest', 'off'];
export const DROP_ORDER = { mode: 'turns', preferMission: true,
  get on() { return this.mode !== 'off'; }, set on(v) { this.mode = v ? (this.mode === 'off' ? 'turns' : this.mode) : 'off'; } };
// THE MISSION'S KIND (the user, 2026-11-11: while a 'Plant a <tree>' mission is open the drop order PREFERS that kind): the tag of the open plant-tree mission ('oak' in the woodland, '<land>:<id>' elsewhere: the same tag
// src/missions2.js compares with the flight's treeIds), or null. Read once per flight (src/sim/rules.js reset), not per frame. DROP_ORDER.preferMission = false is the sim's second arm (research M-T7b): fewest-first only.
export const missionTag = save => { const m = visible(save).find(x => x.def && x.def.id === 'plant-tree'); return m && m.fill && m.fill.treeTag ? m.fill.treeTag : null; };

// pending: { treeId: n } parcels released this flight in this land that have not landed (or missed) yet.
// turn: the drop counter (src/sim/rules.js speciesIdx, +1 per drop); first: this is the first drop of the flight (rules.js released === 0).
export function nextTree(save, land, pending = {}, prefer = null, turn = 0, first = false) {
  const book = treeBook(save, land);
  const cand = treesOpen(save, land).map(slot => { const t = localTree(UK_SLOTS[slot], land); return { slot, id: t.id, name: t.name, tag: land === 'woodland' ? t.id : `${land}:${t.id}`, n: (book[t.id] || 0) + (pending[t.id] || 0) }; });
  const room = cand.filter(c => c.n < TREE_CAP);
  const want = DROP_ORDER.preferMission && prefer ? room.find(c => c.tag === prefer) : null;   // the open mission's kind first, but ONLY while it has room (the cap of 9 still wins)
  if (DROP_ORDER.mode === 'off') return cand.length ? cand[turn % cand.length] : null;   // the game as it was before trees v2
  if (DROP_ORDER.mode === 'fewest') {
    if (want) return want;
    return room.length ? room.reduce((a, c) => (c.n < a.n ? c : a)) : null;
  }
  // 'turns': the open mission's kind first on the first drop, then the kinds take turns; a kind at its cap of 9 is skipped (its turn goes to the next open kind)
  if (want && first) return want;
  for (let k = 0; k < cand.length; k++) { const c = cand[(turn + k) % cand.length]; if (room.includes(c)) return c; }
  return null;
}
// The word on the button: the first word of the tree's name, upper case, at most 8 letters ('Next: OAK').
export const shortName = name => String(name || '').split(' ')[0].toUpperCase().slice(0, 8);
