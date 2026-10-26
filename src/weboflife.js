// Web of life (MASTER-PLAN Part G): which animals each habitat project helps bring back, and what else they need.
// Data: each animal's `needs` (project ids) in src/habitats.js REGION_DATA / nature.js UK_SPECIES, the same rule
// canAppear() uses. Pure (no DOM): src/wild.js draws it, tests/weboflife.cjs checks it.
import { regionSpecies, projectsDone } from './nature.js';

// [{ id, name, found, more: [project ids still needed besides this one], bio }] for one project of one land.
export function broughtBack(save, land, projectId) {
  const done = projectsDone(save, land).map(p => p.id), found = save.found || {};
  return regionSpecies(land).filter(w => (w.c.needs || []).includes(projectId)).map(w => ({
    id: w.id, name: w.name, w, found: !!found[w.id], bio: w.c.bio || 0,
    more: w.c.needs.filter(n => n !== projectId && !done.includes(n)) }));
}
