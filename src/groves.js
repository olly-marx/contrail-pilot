// ONE TREE RECORD FOR EVERY LAND (TREES V2 step 1, research/DESIGN-TREES-V2.md section A; the user, 2026-11-10: "The UK is not unique at all").
// save.groves[land][treeId] = { planted, grown, saplings: [] }. `planted` is what used to be counted in save.planted (the UK, land 'woodland') and in save.plantedIn[land][id]
// (every other land); `grown` is how many of those are fully grown (step 1: all of them, so nothing changes on screen); `saplings` is reserved for the nursery (step 2).
// Nothing is lost and nothing is reset: groveView() folds the OLD keys in, taking the larger count per kind, so a save written by an older game (or an older device through online sync)
// still counts; plantTree() writes the groves AND mirrors the count into the old keys for one release (the online progress, records and older clients read them).
// Pure except ensureGroves / plantTree (they write the save they are given). No random numbers, no clock.
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);
const whole = n => Math.max(0, Math.floor(Number(n) || 0));

// The merged view: { land: { id: { planted, grown, saplings } } }. Never mutates the save.
export function groveView(save) {
  const out = {};
  const cellOf = (land, id) => { const L = out[land] || (out[land] = {}); return L[id] || (L[id] = { planted: 0, grown: 0, saplings: [] }); };
  if (isObj(save) && isObj(save.groves)) {
    for (const [land, L] of Object.entries(save.groves)) if (isObj(L)) for (const [id, c] of Object.entries(L)) {
      if (!isObj(c)) continue;
      const x = cellOf(land, id), sap = (Array.isArray(c.saplings) ? c.saplings : []).filter(isObj).map(s => ({ points: whole(s.points), fresh: !!s.fresh }));
      x.saplings = sap; x.grown = whole(c.grown); x.planted = Math.max(whole(c.planted), x.grown + sap.length);   // planted = grown + still growing
    }
  }
  const fold = (land, book) => {
    if (!isObj(book)) return;
    for (const [id, n0] of Object.entries(book)) { const n = whole(n0); if (!n) continue; const x = cellOf(land, id); if (x.planted < n) { x.grown += n - x.planted; x.planted = n; } }
  };
  if (isObj(save)) { fold('woodland', save.planted); if (isObj(save.plantedIn)) for (const [land, book] of Object.entries(save.plantedIn)) fold(land, book); }
  return out;
}
// Trees planted in a land by kind: { id: n } (kinds with none are left out). 'woodland' is the UK.
export const treeBook = (save, land) => Object.fromEntries(Object.entries(groveView(save)[land] || {}).filter(([, c]) => c.planted > 0).map(([id, c]) => [id, c.planted]));
// Lands that have any tree.
export const groveLands = save => Object.entries(groveView(save)).filter(([, L]) => Object.values(L).some(c => c.planted > 0)).map(([land]) => land);
// Every tree planted, in every land.
export const treesPlantedTotal = save => Object.values(groveView(save)).reduce((a, L) => a + Object.values(L).reduce((b, c) => b + c.planted, 0), 0);
// The groves of a copy of this save with `n` trees of this kind in this land (for 'what would one more tree add' questions: the save itself is not touched).
export function groveWith(save, land, id, n) {
  const g = groveView(save), L = g[land] || (g[land] = {}), c = L[id] || (L[id] = { planted: 0, grown: 0, saplings: [] });
  c.planted = n; c.grown = n; return g;
}
// Make the save carry the merged groves (once at load, and before every planting). Idempotent.
export function ensureGroves(save) { if (!isObj(save)) return null; save.groves = groveView(save); return save.groves; }
// One tree planted in this land (the tree's own id in that land). Writes the groves and mirrors the old keys. Returns the new count of that kind.
export function plantTree(save, land, id) {
  const g = ensureGroves(save), L = g[land] || (g[land] = {}), c = L[id] || (L[id] = { planted: 0, grown: 0, saplings: [] });
  c.planted += 1; c.saplings.push({ points: 0, fresh: true });   // (step 2: a planted tree is a SAPLING; it is grown after the nursery's flights, growGroves)
  if (land === 'woodland') { if (!isObj(save.planted)) save.planted = {}; save.planted[id] = c.planted; }
  else { if (!isObj(save.plantedIn)) save.plantedIn = {}; if (!isObj(save.plantedIn[land])) save.plantedIn[land] = {}; save.plantedIn[land][id] = c.planted; }
  return c.planted;
}

// ---- TREES V2 step 2: saplings and the nursery (research/DESIGN-TREES-V2.md section B) ----
// A tree grows one point for every flight banked AFTER the one that planted it (landed or crashed; a sapling never dies), and is grown when it has `need` points: 10 with no nursery, 8 with the Tree Nursery's
// first level, 6 with its second (the hangar line's two levels: kit.grow 1, 0.7, 0.5). The planting flight's own point is not counted: a tree planted in flight f is grown at the end of flight f + need.
export const NURSERY_NEED = [10, 8, 6];
export const needFromGrow = grow => (grow <= 0.5 ? NURSERY_NEED[2] : grow <= 0.7 ? NURSERY_NEED[1] : NURSERY_NEED[0]);
// Trees fully grown in a land by kind: { id: n }. The scenery and the NATURE picture show these only.
export const grownBook = (save, land) => Object.fromEntries(Object.entries(groveView(save)[land] || {}).filter(([, c]) => c.grown > 0).map(([id, c]) => [id, c.grown]));
// One banked flight: every sapling that was not planted in THIS flight gets a point; those with `need` points become grown. Returns how many grew up.
export function growGroves(save, need) {
  const g = ensureGroves(save); let up = 0;
  for (const L of Object.values(g)) for (const c of Object.values(L)) {
    const keep = [];
    for (const s of c.saplings) {
      if (s.fresh) { keep.push({ points: s.points, fresh: false }); continue; }
      const p = s.points + 1;
      if (p >= need) { c.grown += 1; up += 1; } else keep.push({ points: p, fresh: false });
    }
    c.saplings = keep;
  }
  return up;
}
// What the nursery is doing in a land: how many saplings are growing and in how many more flights the next one is grown (null when none).
export function nurseryStatus(save, land, need) {
  const cells = Object.values(groveView(save)[land] || {}), saps = cells.flatMap(c => c.saplings);
  return { growing: saps.length, nextIn: saps.length ? Math.max(1, Math.min(...saps.map(s => need - s.points))) : null };
}
