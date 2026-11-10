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
      const x = cellOf(land, id); x.planted = whole(c.planted); x.grown = Math.min(x.planted, whole(c.grown)); x.saplings = Array.isArray(c.saplings) ? c.saplings.slice() : [];
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
  c.planted += 1; c.grown += 1;   // (step 1: a planted tree counts as grown at once; the nursery makes it a sapling in step 2)
  if (land === 'woodland') { if (!isObj(save.planted)) save.planted = {}; save.planted[id] = c.planted; }
  else { if (!isObj(save.plantedIn)) save.plantedIn = {}; if (!isObj(save.plantedIn[land])) save.plantedIn[land] = {}; save.plantedIn[land][id] = c.planted; }
  return c.planted;
}
