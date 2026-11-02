// ONE source for "what is new": fresh(save), dots(save), markSeen(save, scope). Pure (no DOM): the UI asks, it never decides.
// Replaces shopSeen / shownLines / treesSeen / records.fresh / the hub badges (research: ~/contrail-research/UX-MASTER-PLAN.md B4).
//
// A KEY names one thing that can be new ('gadget:magnet:3', 'project:meadow', 'tree:2', 'animal:badger', 'badge:coolplanet:1').
// A SCOPE is the sub-screen it lives on ('hangar/plane', 'hangar/systems', 'hangar/gadgets', 'nature/<land>', 'boards/records',
// 'boards/badges'). save.seen[scope] = the keys the player has been SHOWN there. fresh = keys that exist now and are not in seen.
// 'Shown' means the sub-screen's own render called markSeen WHILE VISIBLE: there is no timer, and a hidden render must not call it
// (so NATURE can no longer clear the hangar's dot: the old ui.js:287 bug was one shared list).
// markSeen REPLACES the scope's list with the keys that exist now, so a key that went away (you spent the seeds) and comes back
// is new again; a key that stays is not.
// Not here yet (other lanes): missions ('tier:<n>', 'done:<key>', the game chat's) and 'fly:<plane>' for a plane just joined.
import { nextBuys, canAfford } from './fleet.js';
import { LINES, canBuy, level, tabOf } from './upgrades.js';
import { REGION_DATA } from './habitats.js';
import { biodiversity, regionSpecies } from './nature.js';
import { landTrees } from './landtrees.js';
import { BADGES, tierOf } from './badges.js';

const KIND_SCOPE = { plane: 'hangar/plane', system: 'hangar/systems', gadget: 'hangar/gadgets' };
export const HANGAR_SCOPES = ['hangar/plane', 'hangar/systems', 'hangar/gadgets'];
export const BOARD_SCOPES = ['boards/records', 'boards/badges'];

// Things in the fleet you could buy right now: 'plane:comet.engines:2', 'system:atc:1', 'gadget:magnet:3'. (Moved here from
// hangar.js so the dots do not need the DOM-bound hangar module; hangar.js re-exports it.)
export const fleetBuyable = save => nextBuys(save).filter(b => b.open && canAfford(save, b)).map(b => `${b.kind}:${b.id}:${b.level}`);

// The lands the NATURE screen can show, HOME FIRST. DECLARED by the caller (wild.js discovered() / homeRegion()); the default is
// the UK plus every land flown over, which is only a fallback for tests and old callers.
export const defaultLands = save => ['woodland', ...Object.keys(save.discovered || {}).filter(r => r !== 'woodland' && REGION_DATA[r])];

// Every key that exists right now, by scope: { scope: [keys] }. Empty scopes are left out.
export function current(save, { lands = defaultLands(save) } = {}) {
  const out = {}, add = (scope, key) => (out[scope] = out[scope] || []).push(key);
  for (const b of nextBuys(save)) if (b.open && canAfford(save, b)) add(KIND_SCOPE[b.kind] || 'hangar/plane', `${b.kind}:${b.id}:${b.level}`);
  // The old upgrade lines (planting tools, trees): the Trees / Nature groups live on NATURE's home tab, the rest in the hangar.
  for (const l of LINES) if (canBuy(save, l)) add(tabOf(l) === 'nature' ? `nature/${lands[0] || 'woodland'}` : 'hangar/plane', `line:${l.id}:${level(save, l.id) + 1}`);
  for (const land of lands) {
    const scope = `nature/${land}`, data = REGION_DATA[land];
    if (data) {
      const done = ((save.habitat || {})[land] || []), bio = biodiversity(save, land);
      for (const p of data.projects) if (!done.includes(p.id) && bio >= p.needs && save.seeds >= p.cost && (save.crystals || 0) >= p.crystals) add(scope, `project:${p.id}`);
    }
    for (const t of landTrees(save, land)) if (t.open && t.slot > 0) add(scope, `tree:${t.slot}`);   // slot 0 is open from the start: not news
    for (const w of regionSpecies(land)) if (w.kind === 'animal' && (save.found || {})[w.id]) add(scope, `animal:${w.id}`);
  }
  // Boards: a record beaten (recordFlight writes save.records.beaten as 'record:<id>:<period>:<new value>', so a LATER beat is a new key)
  // and a badge tier earned.
  for (const k of ((save.records || {}).beaten || [])) add('boards/records', k);
  for (const b of BADGES) for (let t = 1; t <= tierOf(save, b.id); t++) add('boards/badges', `badge:${b.id}:${t}`);
  return out;
}

// fresh(save) -> { scope: [keys not yet seen] }. Only scopes with something new appear.
export function fresh(save, opts) {
  const seen = save.seen || {}, out = {};
  for (const [scope, keys] of Object.entries(current(save, opts))) {
    const f = keys.filter(k => !(seen[scope] || []).includes(k));
    if (f.length) out[scope] = f;
  }
  return out;
}

// dots(save) -> { 'hangar/plane': true, hangar: true, 'nature/woodland': true, nature: true, boards: true, ... } lit entries only.
// A bottom tab ('hangar', 'nature', 'boards') is lit iff any of its sub-scopes is; a ROW is lit iff its key is in fresh(save)[scope].
export function dots(save, opts) {
  const out = {};
  for (const scope of Object.keys(fresh(save, opts))) { out[scope] = true; out[scope.split('/')[0]] = true; }
  return out;
}
export const isFresh = (save, scope, key, opts) => (fresh(save, opts)[scope] || []).includes(key);

// The sub-screen is SHOWING: everything on it is now seen. Call it from that screen's render, never from a hidden one.
// Returns true if the save changed (the caller persists).
export function markSeen(save, scope, opts) {
  const now = current(save, opts)[scope] || [];
  save.seen = save.seen || {};
  const before = save.seen[scope] || [];
  if (before.length === now.length && before.every((k, i) => k === now[i])) return false;
  save.seen[scope] = now.slice();
  return true;
}

// Once, when the save has no save.seen: everything already buyable / open / found / earned counts as seen (no dot storm on the
// release). Returns true if it ran.
export function migrateSeen(save, opts) {
  if (save.seen) return false;
  save.seen = {};
  for (const [scope, keys] of Object.entries(current(save, opts))) save.seen[scope] = keys.slice();
  return true;
}
