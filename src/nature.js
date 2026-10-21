import { cz } from './config.js';
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

// Bought in order in the hangar, with seeds AND ice crystals. `bio` is the Biodiversity points it adds; `needs` is the meter
// level you must reach first. Effects in the world are drawn in GameScene.
export const PROJECTS = [
  { id: 'meadow', name: 'Wildflower meadow', cost: 30, crystals: 2, bio: 8, needs: 3,
    short: 'Flowers for bees and butterflies.',
    fact: 'Since the 1930s, the UK has lost almost all its wildflower meadows. Bees need them!' },
  { id: 'hedgerow', name: 'Hedgerows', cost: 140, crystals: 8, bio: 10, needs: 8,
    short: 'Green lines that animals travel along.',
    fact: 'Hedgerows are like wildlife roads: hedgehogs, birds and bats use them to get around.' },
  { id: 'pond', name: 'Pond', cost: 170, crystals: 9, bio: 12, needs: 15,
    short: 'A home for frogs and dragonflies.',
    fact: 'A new pond can have frogs, newts and dragonflies living in it in just one year.' },
  { id: 'voles', name: 'Water voles return', cost: 450, crystals: 25, bio: 10, needs: 22,
    short: 'Bring back Ratty from The Wind in the Willows!',
    fact: 'Water voles are one of the UK\'s fastest-disappearing mammals. Ponds and wild riverbanks help them come back.' },
  { id: 'beavers', name: 'Beavers return', cost: 550, crystals: 31, bio: 15, needs: 32,
    short: 'Nature\'s engineers build dams and wetlands.',
    fact: 'Beaver dams slow down floods and make wetlands that store carbon and water.' + cz(' Citizen Zoo works with beavers in London!') },
  { id: 'storks', name: 'White storks return', cost: 1300, crystals: 72, bio: 15, needs: 45,
    short: 'Big birds back in the sky!',
    fact: 'White storks used to nest in Britain hundreds of years ago. Now they are coming back.' },
];

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

// Rewilding projects are bought in order as levels of the 'rewild' upgrade line.
export const projectsDone = save => PROJECTS.slice(0, (save.levels || {}).rewild || 0);
export const hasProject = (save, id) => projectsDone(save).some(p => p.id === id);
// Healthy land soaks up a little CO2 on every flight.
export const natureCooling = save => 0.04 * projectsDone(save).length;

// Background wildlife you can see but not hit, rebuilt each flight from the Biodiversity meter.
// A bare field is sad on purpose: a few cows and sheep, a few spruce all the same, empty sky.
// As the meter grows: more trees (of the kinds you have planted), wild animals, then birds.
// Add new animals/birds here (with an `at` meter level) as new regions unlock.
export const WILD_ANIMALS = [
  { id: 'rabbit', at: 8 }, { id: 'hedgehog', at: 20 }, { id: 'fox', at: 40 }, { id: 'deer', at: 65 },
];
export const SKY_BIRDS = [
  { id: 'robin', at: 8 }, { id: 'swallow', at: 20 }, { id: 'buzzard', at: 40 },
];
export function wildlifeScene(save) {
  const bio = biodiversity(save);
  const planted = Object.keys(save.planted || {}).filter(k => SPECIES[k] && save.planted[k] > 0);
  const treeKinds = bio < 8 ? ['spruce'] : [...new Set(['spruce', ...planted])];
  const wild = WILD_ANIMALS.filter(a => bio >= a.at).map(a => a.id);
  return {
    bio,
    treesPerScreen: 2 + bio / 8,                  // 2 lonely spruce up to ~14 trees
    treeKinds,
    farmPerScreen: 1.5,                           // cows and sheep: always a few, never many
    wildPerScreen: wild.length ? 1 + bio / 20 : 0,
    wildKinds: wild,
    skyKinds: SKY_BIRDS.filter(b => bio >= b.at).map(b => b.id),
    birdsPerScreen: bio < 8 ? 0 : bio / 25,      // none at first, up to 4
  };
}
