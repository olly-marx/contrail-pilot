import { cz } from './config.js';
import { UK_PROJECTS, UK_SPECIES, RARITY, REGION_DATA } from './habitats.js';
import { WILDLIFE } from './wildlife.js';
import { REGION_TREES } from './habitat/trees.js';
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

export const STAGES = [   // meter names (100 = everything: see biodiversity())
  { at: 0, name: 'Barren land' },
  { at: 5, name: 'Grassland' },
  { at: 15, name: 'Young woodland' },
  { at: 35, name: 'Forest' },
  { at: 70, name: 'Wild and thriving!' },
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
  if (!n || !SPECIES[id]) return 0;   // a kind this list does not know (a regional tree, an old or odd save) scores nothing, never crashes
  return SPECIES[id].native ? Math.min(18, 6 * Math.sqrt(n)) : Math.min(6, 2 * Math.sqrt(n));
}

// The meter: 100 = everything (all 5 kinds of tree well planted AND every habitat project). Trees
// alone reach ~40, projects ~60. (Recalibrated 2026-10-22: the raw points reached 192 against a
// cap of 100, so a moderately advanced player filled it and the rare animals came too easily.)
const TREES_MAX = 4 * 18 + 6;   // speciesPoints at their caps: 4 native kinds + spruce
const RAW_MAX = () => TREES_MAX + PROJECTS.reduce((a, p) => a + p.bio, 0);
// Trees in other regions (the user, 2026-10-22): the tree upgrades unlock SLOTS. Slot 0 is the basic
// tree (spruce in the UK), slots 1-4 the natives (birch, oak, rowan, fruit trees). A parcel dropped
// over another region plants that region's tree for the slot (src/habitat/trees.js); growth and
// cooling stay the UK kind's, so balance is unchanged. Planted there: save.plantedIn[region][id].
export const UK_SLOTS = ['spruce', 'birch', 'oak', 'rowan', 'orchard'];
export function localTree(kind, region) {
  const slot = UK_SLOTS.indexOf(kind), list = REGION_TREES[region];
  if (region === 'woodland' || !list || slot < 0) return { id: kind, name: SPECIES[kind].name, native: SPECIES[kind].native, fact: SPECIES[kind].fact, uk: true };
  const t = list.find(x => x.slot === slot);
  return { id: t.id, name: t.name, native: t.slot > 0, fact: t.fact, uk: false };   // (native: worth a fact pop-up)
}
const plantedHere = (save, region) => region === 'woodland' ? save.planted || {} : ((save.plantedIn || {})[region] || {});
// Slot 0 is the plantation tree (rows of one kind: few animals), scored low like spruce, even where it is
// native (Aleppo pine, Chinese fir, loblolly pine...); slots 1-4 score like the UK natives.
const nativeHere = (region, id) => region === 'woodland' ? SPECIES[id] && SPECIES[id].native : ((REGION_TREES[region] || []).find(t => t.id === id) || { slot: 0 }).slot > 0;
const pointsHere = (region, id, n) => !n ? 0 : nativeHere(region, id) ? Math.min(18, 6 * Math.sqrt(n)) : Math.min(6, 2 * Math.sqrt(n));

// One meter per region (2026-10-22). The UK counts trees too (the trees you plant are UK trees);
// every other region is its projects only: 100 = all of that region's projects done.
export function biodiversity(save, region = 'woodland') {
  let b = 0;
  if (region === 'woodland') {
    for (const [id, n] of Object.entries(save.planted || {})) b += speciesPoints(id, n);
    for (const p of projectsDone(save)) b += p.bio;
    return Math.min(100, Math.round(b * 100 / RAW_MAX()));
  }
  if (!REGION_DATA[region]) return 0;   // the sea and the ice (src/geo.js) have no projects
  // Elsewhere: that region's trees (as the UK's: ~40 of 100) plus its projects.
  const all = REGION_DATA[region].projects;
  for (const [id, n] of Object.entries(plantedHere(save, region))) b += pointsHere(region, id, n);
  for (const p of projectsDone(save, region)) b += p.bio;
  const raw = TREES_MAX * all.reduce((a, p) => a + p.bio, 0) / PROJECTS.reduce((a, p) => a + p.bio, 0) + all.reduce((a, p) => a + p.bio, 0);
  return Math.min(100, Math.round(b * 100 / raw));
}
// The whole world: the average of every region's meter (for a world board later).
export const worldBiodiversity = save => Math.round(Object.keys(REGION_DATA).reduce((a, r) => a + biodiversity(save, r), 0) / Object.keys(REGION_DATA).length);

// What one more tree of this kind adds to the meter (shown as a popup when it is planted).
// What one more tree adds to a region's meter (local id; see localTree).
export function plantGainHere(save, region, id) {
  if (region === 'woodland') return plantGain(save, id);
  const n = plantedHere(save, region)[id] || 0, before = biodiversity(save, region);
  const s2 = { ...save, plantedIn: { ...(save.plantedIn || {}), [region]: { ...plantedHere(save, region), [id]: n + 1 } } };
  return biodiversity(s2, region) - before;
}
export function plantGain(save, id) {
  const n = (save.planted || {})[id] || 0;
  return (speciesPoints(id, n + 1) - speciesPoints(id, n)) * 100 / RAW_MAX();
}

export function stage(bio) { return [...STAGES].reverse().find(s => bio >= s.at); }

// Projects done in the UK (save.habitat.woodland; before 2026-10-21 the 'rewild' line, see migrateHabitat).
// Other regions: save.habitat[region] (2026-10-22).
export const projectsDone = (save, region = 'woodland') => !REGION_DATA[region] ? [] :   // the sea and the ice: none
  REGION_DATA[region].projects.filter(p => ((save.habitat || {})[region] || []).includes(p.id));
export const hasProject = (save, id, region = 'woodland') => projectsDone(save, region).some(p => p.id === id);
// Healthy land soaks up a little CO2 on every flight: only the land below you (the user, 2026-10-22).
export const natureCooling = (save, region = 'woodland') => 0.04 * projectsDone(save, region).length;

// UK species that can appear now: their projects done and the meter high enough (UK_SPECIES).
export const ukSpecies = () => WILDLIFE.filter(w => w.region === 'woodland' && w.sprite && UK_SPECIES[w.id]);
// Every animal of a region, drawn or not: { id, name, kind, sprite, portrait, ... } plus its entry in
// the region's data as `c`. An animal can live in several regions (the user, 2026-10-22); a species may
// borrow another's drawing (`sprite`). Not drawn yet: no sprite, so it cannot appear in flight.
const drawn = Object.fromEntries(WILDLIFE.map(w => [w.id, w]));
export function regionSpecies(region) {
  if (!REGION_DATA[region]) return [];   // the sea and the ice have no animals of their own yet
  if (region === 'woodland') return ukSpecies().map(w => ({ ...w, c: UK_SPECIES[w.id] }));
  return Object.entries(REGION_DATA[region].species).map(([id, c]) => {
    const art = c.sprite ? WILDLIFE.find(w => w.sprite === c.sprite) : drawn[id];
    return { id, name: c.name, kind: c.kind, pose: art && art.pose, sprite: art && art.sprite, portrait: art && art.portrait, c };
  });
}
export const canAppear = (save, id, region = 'woodland') => {
  const c = REGION_DATA[region] && REGION_DATA[region].species[id], done = projectsDone(save, region).map(p => p.id);
  return !!c && c.needs.every(n => done.includes(n)) && biodiversity(save, region) >= c.bio; };

// Background wildlife you can see but not hit, rebuilt each flight from the habitat (above).
// A bare field is sad on purpose: a few cows and sheep, a few spruce all the same, empty sky.
// As projects bring life back: more trees (of the kinds you have planted), wild animals, birds.
export function wildlifeScene(save, region = 'woodland') {
  // The sea and the ice (src/geo.js): no trees, no land animals; seabirds once they are drawn.
  if (region === 'ocean' || region === 'ice') return { bio: 0, treesPerScreen: 0, treeKinds: [], farmPerScreen: 0, wildPerScreen: 0,
    birdsPerScreen: 0, pickWild: () => null, pickSky: () => null, wildKinds: [], skyKinds: [], who: {}, region };
  const uk = region === 'woodland', bio = biodiversity(save, region);
  const planted = Object.keys(save.planted || {}).filter(k => SPECIES[k] && save.planted[k] > 0);
  // Trees: the UK grows the kinds you have planted; elsewhere that region's own trees (src/wildlife.js).
  const local = WILDLIFE.filter(w => w.kind === 'tree' && w.region === region && w.sprite).map(w => w.sprite.replace(/^tree-/, ''));
  const treeKinds = uk ? (bio < 4 ? ['spruce'] : [...new Set(['spruce', ...planted])]) : local;
  const here = regionSpecies(region).filter(w => w.sprite && canAppear(save, w.id, region) && !['cow', 'sheep'].includes(w.id));
  const pool = list => list.map(w => ({ sprite: w.sprite, ...RARITY[w.c.rarity || 'common'] }));
  const wild = pool(here.filter(w => w.kind === 'animal' || w.pose === 'standing'));   // walk or stand on the ground
  const sky = pool(here.filter(w => w.kind === 'bird' && w.pose !== 'standing'));
  // Pick one by rarity weight, from those that can be seen this far into the flight (null if none).
  const pick = list => km => { const ok = list.filter(x => km >= x.from), t = ok.reduce((a, x) => a + x.weight, 0);
    let r = Math.random() * t; for (const x of ok) if ((r -= x.weight) < 0) return x.sprite; return null; };
  return {
    bio,
    region,
    treesPerScreen: treeKinds.length ? 2 + bio / 6 : 0,   // 2 lonely spruce up to ~18 trees
    treeKinds,
    farmPerScreen: uk ? 1.5 : 0,                  // cows and sheep (UK): always a few, never many
    wildPerScreen: wild.length ? 0.6 + bio / 18 : 0,   // the meter decides HOW MANY animals...
    birdsPerScreen: sky.length ? 0.3 + bio / 25 : 0,
    pickWild: pick(wild),                         // ...and rarity + distance WHICH ones (texture prefix, e.g. 'animal-otter')
    pickSky: pick(sky),
    wildKinds: wild.map(x => x.sprite),           // everything that can appear here at all
    skyKinds: sky.map(x => x.sprite),
    // Which animal a drawing is HERE (one drawing can stand for another species: the Marsican bear uses the brown bear's).
    who: Object.fromEntries(here.map(w => [w.sprite, { id: w.id, name: w.name }])),
  };
}
