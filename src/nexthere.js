// "Next here": one card per land in NATURE saying what to do next (2026-10-26). The biodiversity gate is the slow part
// of progress (research/PROGRESSION-SIM.md), so show the next tree to open with its progress, the next project tier,
// and the animal to look out for. Pure (no DOM): src/wild.js draws it, tests/nexthere.cjs checks it.
import { biodiversity, projectsDone, regionSpecies, canAppear } from './nature.js';
import { TIERS } from './habitats.js';
import { landTrees, foundHere, OPENS } from './landtrees.js';
import { isSeason2 } from './missions2.js';

// Progress toward each native slot's rule: [have, need] (src/landtrees.js OPENS, same order).
const PROGRESS = [null,
  (save, land) => [projectsDone(save, land).length, 1],
  (save, land) => [biodiversity(save, land), 20],
  (save, land) => [foundHere(save, land), 5],
  (save, land) => (isSeason2(save) ? [OPENS[4].ok(save, land) ? 1 : 0, 1] : [biodiversity(save, land), 40])];   // season 2: the 'kinds3' mission (S3)

const FARM = ['cow', 'sheep'];   // always there (nature.js wildlifeScene leaves them out of the wild animals)

export function nextHere(save, land) {
  const bio = biodiversity(save, land), found = save.found || {};
  const shut = landTrees(save, land).find(t => !t.open);
  let tree = null;
  if (shut) { const [have, need] = PROGRESS[shut.slot](save, land); tree = { name: shut.name, rule: shut.rule, have: Math.min(have, need), need }; }
  const t = TIERS.find(x => bio < x.needs);
  const tier = t ? { tier: t.tier, name: t.name, have: bio, need: t.needs } : null;
  // The animal: one you can already meet out there (not found yet), else the closest to coming back.
  const left = regionSpecies(land).filter(w => w.sprite && !found[w.id] && !FARM.includes(w.id));
  const now = left.filter(w => canAppear(save, w.id, land));
  const done = projectsDone(save, land).map(p => p.id);
  const gapOf = w => (w.c.needs || []).filter(n => !done.includes(n)).length * 100 + Math.max(0, (w.c.bio || 0) - bio);
  const pick = now.length ? now[0] : left.slice().sort((a, b) => gapOf(a) - gapOf(b))[0];
  const animal = pick ? { id: pick.id, name: pick.name, ready: now.includes(pick) } : null;
  return { tree, tier, animal };
}
