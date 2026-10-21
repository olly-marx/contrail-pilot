import { cz } from './config.js';
import { UK_PROJECTS, UK_SPECIES } from './habitats.js';
import { WILDLIFE } from './wildlife.js';
// Nature: tree species, rewilding projects and the Biodiversity meter (barren land to rainforest).
// The meter is kept across flights. Variety counts more than numbers: the first tree of a new
// native kind is a big boost; more of the same kind adds less and less.

// coolPerStage: Earth cooling per second as seedling / young / grown, before FOREST (config.js)
// scales it: x0.5 on short flights, an old-wood boost after 10,000 km, and a limit on how much a
// forest soaks up in one flight. A cleaner plane and contrail choices are the big levers; trees
// matter most on the longest flights, where a forest of all 5 kinds is needed for a lap.
export const SPECIES = {
  spruce:  { name: 'Spruce', native: false, coolPerStage: [0.02, 0.05, 0.1],
    fact: 'Spruce grows fast, so it soaks up CO2 quickly. But rows of one kind of tree are home to very few animals.' },
  birch:   { name: 'Birch', native: true, coolPerStage: [0.02, 0.04, 0.09],
    fact: 'Birch is one of the first trees to grow on bare land. It makes space for other plants to follow.' },
  oak:     { name: 'Oak', native: true, coolPerStage: [0.02, 0.05, 0.12],
    fact: 'One big oak tree can be home to over 2,000 kinds of insects, birds, fungi and more!' },
  rowan:   { name: 'Rowan', native: true, coolPerStage: [0.02, 0.04, 0.09],
    fact: 'Rowan berries feed birds like thrushes in autumn.' },
  orchard: { name: 'Fruit tree', native: true, coolPerStage: [0.03, 0.06, 0.13],
    fact: 'Fruit trees feed people, bees and birds. Old orchards are full of wildlife.' },
};

// Habitat projects (src/habitats.js): bought one by one on the NATURE screen, each once the
// meter reaches its `needs`. `bio` is the Biodiversity points it adds. Effects in the world are
// drawn in GameScene (meadow flowers, hedges, ponds, beaver dams, storks).
export const PROJECTS = UK_PROJECTS;

export const STAGES = [
  { at: 0, name: 'Barren land' },
  { at: 8, name: 'Grassland' },
  { at: 20, name: 'Young woodland' },
  { at: 40, name: 'Forest' },
  { at: 65, name: 'Rainforest!' },
];

export const NATURE_FACTS = [
  'Right tree, right place: planting trees on a peat bog can release more carbon than the trees take in!',
  'A wood with many kinds of trees is home to many more animals than rows of just one kind.',
  'Sometimes the best way to grow a wood is to leave land alone and let it grow back by itself.',
  'Old trees store much more carbon than young ones. Looking after old woods matters a lot.',
  'Rewilding means helping nature look after itself again, like bringing back animals that used to live here.',
];

// Points from one species, given how many have been planted: grows slowly with repeats.
function speciesPoints(id, n) {
  if (!n) return 0;
  return SPECIES[id].native ? Math.min(18, 6 * Math.sqrt(n)) : Math.min(6, 2 * Math.sqrt(n));
}

export function biodiversity(save) {
  let b = 0;
  for (const [id, n] of Object.entries(save.planted || {})) b += speciesPoints(id, n);
  for (const p of projectsDone(save)) b += p.bio;
  return Math.min(100, Math.round(b));
}

// What one more tree of this kind adds (shown as a popup when it is planted).
export function plantGain(save, id) {
  const n = (save.planted || {})[id] || 0;
  return speciesPoints(id, n + 1) - speciesPoints(id, n);
}

export function stage(bio) { return [...STAGES].reverse().find(s => bio >= s.at); }

// Projects done in the UK (save.habitat.woodland; before 2026-10-21 the 'rewild' line, see migrateHabitat).
export const projectsDone = save => PROJECTS.filter(p => ((save.habitat || {}).woodland || []).includes(p.id));
export const hasProject = (save, id) => projectsDone(save).some(p => p.id === id);
// Healthy land soaks up a little CO2 on every flight.
export const natureCooling = save => 0.04 * projectsDone(save).length;

// UK species that can appear now: their projects done and the meter high enough (UK_SPECIES).
export const ukSpecies = () => WILDLIFE.filter(w => w.region === 'woodland' && w.sprite && UK_SPECIES[w.id]);
export const canAppear = (save, id) => { const c = UK_SPECIES[id], done = projectsDone(save).map(p => p.id);
  return !!c && c.needs.every(n => done.includes(n)) && biodiversity(save) >= c.bio; };

// Background wildlife you can see but not hit, rebuilt each flight from the habitat (above).
// A bare field is sad on purpose: a few cows and sheep, a few spruce all the same, empty sky.
// As projects bring life back: more trees (of the kinds you have planted), wild animals, birds.
export function wildlifeScene(save) {
  const bio = biodiversity(save);
  const planted = Object.keys(save.planted || {}).filter(k => SPECIES[k] && save.planted[k] > 0);
  const treeKinds = bio < 8 ? ['spruce'] : [...new Set(['spruce', ...planted])];
  const here = ukSpecies().filter(w => canAppear(save, w.id) && !['cow', 'sheep'].includes(w.id));
  const wild = here.filter(w => w.kind === 'animal' || w.pose === 'standing').map(w => w.sprite);   // walk or stand on the ground
  const sky = here.filter(w => w.kind === 'bird' && w.pose !== 'standing').map(w => w.sprite);
  return {
    bio,
    treesPerScreen: 2 + bio / 8,                  // 2 lonely spruce up to ~14 trees
    treeKinds,
    farmPerScreen: 1.5,                           // cows and sheep: always a few, never many
    wildPerScreen: wild.length ? 1 + bio / 20 : 0,
    wildKinds: wild,                              // texture prefixes, e.g. 'animal-otter', 'sky-heron'
    skyKinds: sky,
    birdsPerScreen: sky.length ? 0.4 + bio / 25 : 0,    birdsPerScreen: bio < 8 ? 0 : bio / 25,      // none at first, up to 4
  };
}
