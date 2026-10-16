import { CLIMATE, CONTRAIL, ISSR, PARCEL } from './config.js';
import { SPECIES, PROJECTS, biodiversity } from './nature.js';

// Each upgrade line has levels bought in order. Costs are in trees.
// `info` is the pop-up shown by the (i) button: short words for 7-10 year olds.
export const LINES = [
  {
    id: 'radar', name: 'Icy Air Radar', group: 'Research',
    levels: [
      { cost: 10, crystals: 1, name: 'Humidity sensor', short: 'See icy air sooner.', reveal: 100, hidden: 0.03 },
      { cost: 30, crystals: 2, name: 'Weather balloon', short: 'See icy air even sooner.', reveal: 150, hidden: 0.05 },
      { cost: 70, crystals: 5, name: 'Contrail forecast', short: 'See icy air from far away!', reveal: 220, hidden: 0.08 },
    ],
    info: {
      what: 'Icy air is invisible. Scientists measure how wet the air is, so they can guess where it is.',
      why: 'If pilots know where the icy air is, they can fly a bit higher or lower and not make a contrail.',
      fact: 'Icy air is often only a few hundred metres thick. That is shorter than a walk to the shops!',
      links: ['forecast', 'project'],
    },
  },
  {
    id: 'fuel', name: 'Cleaner Fuel', group: 'Fuel', unlock: { landings: 3 },
    levels: [
      { cost: 15, crystals: 1, name: 'A bit of SAF', short: 'A little less CO2.', fuel: 'saf25' },
      { cost: 40, crystals: 2, name: 'Half SAF', short: 'Less CO2. Thinner contrails.', fuel: 'saf50' },
      { cost: 75, crystals: 4, name: 'All SAF', short: 'Much less CO2. Thin contrails.', fuel: 'saf100' },
      { cost: 155, crystals: 9, name: 'Hydrogen', short: 'ZERO CO2! But MORE contrails.', fuel: 'hydrogen' },
    ],
    info: {
      what: 'SAF is plane fuel made from things like old cooking oil. Hydrogen is a gas that burns without making CO2.',
      why: 'Less CO2 means less warming. SAF also makes less soot, so contrails are thinner. Hydrogen makes lots of water, so it makes MORE contrails!',
      fact: 'There is not enough SAF for every plane yet. Making more is a big job for the future.',
      links: ['project'],
    },
  },
  {
    id: 'engine', name: 'Better Engines', group: 'Plane', unlock: { landings: 3 },
    levels: [
      { cost: 20, crystals: 1, name: 'Engine tune-up', short: '10% less CO2.', co2: 0.9 },
      { cost: 40, crystals: 2, name: 'New engines', short: '20% less CO2.', co2: 0.8 },
      { cost: 85, crystals: 5, name: 'Super engines', short: '30% less CO2.', co2: 0.7 },
    ],
    info: {
      what: 'New engines burn less fuel to fly the same distance.',
      why: 'Less fuel burned means less CO2, and less CO2 means less warming.',
      fact: 'Planes today use about half the fuel per passenger that planes used 50 years ago.',
      links: ['project'],
    },
  },
  {
    id: 'cabin', name: 'Greener Cabin', group: 'Plane', unlock: { landings: 1 },
    levels: [
      { cost: 5, crystals: 1, name: 'Cheaper veggie meals', short: 'More people pick veggie food.', co2: 0.98 },
      { cost: 15, crystals: 1, name: 'No single-use plastic', short: 'Refill water, less rubbish.', co2: 0.96 },
      { cost: 25, crystals: 1, name: 'Only the food ordered', short: 'Less wasted food to carry.', co2: 0.94 },
      { cost: 40, crystals: 2, name: 'Lighter trolleys and seats', short: 'A lighter plane burns less fuel.', co2: 0.92 },
    ],
    info: {
      what: 'Airlines can make small changes inside the plane: the food, the cups, and how heavy things are.',
      why: 'Meat makes much more CO2 to farm than veggie food. And every bit of weight a plane carries needs fuel to lift.',
      fact: 'These changes are small next to cleaner fuel and engines, but every little bit adds up!',
      links: ['project'],
    },
  },
  {
    id: 'trees', name: 'Tree Planting', group: 'Trees',
    levels: [
      { cost: 20, crystals: 1, name: 'Tree parcels', short: 'Drop 2 trees per flight onto brown soil.', parcels: 2 },
      { cost: 35, crystals: 2, name: 'More parcels', short: 'Drop 3 trees per flight.', parcels: 3 },
      { cost: 65, crystals: 4, name: 'Big cargo hold', short: 'Drop 4 trees per flight.', parcels: 4 },
      { cost: 105, crystals: 6, name: 'Tree drop plane', short: 'Drop 6 trees per flight!', parcels: 6 },
    ],
    info: {
      what: 'Parcels hold young trees. Drop them from your plane onto brown soil to plant them.',
      why: 'Trees take CO2 out of the air as they grow. Plant early: they grow bigger and help more.',
      fact: 'A tree takes many years to grow big. Not making CO2 in the first place works faster.',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'soil', name: 'Soil Patches', group: 'Trees', unlock: { planted: 1 },
    levels: [
      { cost: 10, crystals: 1, name: 'Bigger soil patches', short: 'Easier to hit with a parcel.', plotW: 64 },
      { cost: 30, crystals: 2, name: 'Huge soil patches', short: 'Really easy to hit!', plotW: 80 },
    ],
    info: {
      what: 'Patches of ready soil where your tree parcels can land and grow.',
      why: 'Bigger patches are easier to hit, so fewer trees are wasted.',
      fact: 'In real life, people get the ground ready first: clearing weeds and choosing the right spot for each tree.',
      links: ['citizenzoo'],
    },
  },
  {
    id: 'species', name: 'Tree Species', group: 'Nature', unlock: { planted: 1 },
    levels: [
      { cost: 20, crystals: 1, name: 'Birch', short: 'A new native tree. Big boost for nature!', species: 'birch' },
      { cost: 40, crystals: 2, name: 'Oak', short: 'Home to over 2,000 kinds of wildlife.', species: 'oak' },
      { cost: 60, crystals: 3, name: 'Rowan', short: 'Berries for the birds.', species: 'rowan' },
      { cost: 90, crystals: 5, name: 'Fruit trees', short: 'Food for people, bees and birds.', species: 'orchard' },
    ],
    info: {
      what: 'You start with spruce. It grows fast but few animals live in it. Native trees are trees that have always grown here.',
      why: 'Every NEW kind of tree you plant fills your Biodiversity meter much more than planting the same kind again.',
      fact: 'A wood with many kinds of trees is home to many more animals than rows of just one kind.',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'rewild', name: 'Rewilding', group: 'Nature', unlock: { planted: 1 },
    levels: PROJECTS.map(p => ({ cost: p.cost, crystals: p.crystals, name: p.name, short: p.short, needsBio: p.needs, project: p.id })),
    info: {
      what: 'Rewilding means helping nature look after itself again: wild places, and bringing back animals that used to live here.',
      why: 'Each project fills your Biodiversity meter, and healthy land soaks up a little CO2 on every flight.',
      fact: 'Beaver dams slow floods and make wetlands that store carbon. Citizen Zoo works with beavers in London!',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'magnet', name: 'Seed Magnet', group: 'Plane',
    levels: [
      { cost: 15, crystals: 1, name: 'Seed magnet', short: 'Grab seeds from further away.', pickup: 22 },
      { cost: 35, crystals: 2, name: 'Strong magnet', short: 'Grab seeds from even further.', pickup: 30 },
      { cost: 70, crystals: 4, name: 'Super magnet', short: 'Seeds fly to you!', pickup: 40 },
    ],
    info: {
      what: 'A pretend gadget that pulls floating seeds towards your plane.',
      why: 'More seeds on board means more seeds when you land. Only if you land safely!',
      fact: 'In real life, trees are planted by people. Citizen Zoo plants trees in London.',
      links: ['citizenzoo'],
    },
  },
];

export const FUELS = {
  // `water`: water vapour in the exhaust (drawn as white wisps). Hydrogen makes about 2.5x as much.
  kerosene: { name: 'Normal fuel', co2: 1.0, water: 1.0, contrailEvery: CONTRAIL.every, contrailLife: CONTRAIL.life },
  saf25:    { name: 'A bit of SAF', co2: 0.85, water: 1.05, contrailEvery: 14, contrailLife: 6500 },
  saf50:    { name: 'Half SAF', co2: 0.7, water: 1.1, contrailEvery: 17, contrailLife: 5500 },
  saf100:   { name: 'All SAF', co2: 0.45, water: 1.15, contrailEvery: 22, contrailLife: 4500 },
  hydrogen: { name: 'Hydrogen', co2: 0.0, water: 2.5, contrailEvery: 8, contrailLife: 9000 },
};


export const BADGES = [
  { id: 'firstLanding', name: 'First Landing', desc: 'Land at an airport.' },
  { id: 'longHaul', name: 'Long Haul', desc: 'Fly past 2 airports, then land.' },
  { id: 'treeHunter', name: 'Seed Hunter', desc: 'Land with 15 seeds on board.' },
  { id: 'sunShield', name: 'Sun Shield', desc: 'Make lots of shade (-30) in one flight.' },
  { id: 'nightOwl', name: 'Night Owl', desc: 'Fly a whole night without trapping heat.' },
  { id: 'coolPlanet', name: 'Cool Planet', desc: 'Land with the planet cooler than at take off.' },
  { id: 'forester', name: 'Forester', desc: 'Plant 3 trees in one flight.' },
  { id: 'zeroCarbon', name: 'Zero Carbon Pilot', desc: 'Get the hydrogen engine.' },
];

// The hangar has two tabs: the plane (and contrail research) first, nature second.
export const tabOf = line => (['Trees', 'Nature'].includes(line.group) ? 'nature' : 'plane');

export const level = (save, lineId) => save.levels[lineId] || 0;
export const lineById = id => LINES.find(l => l.id === id);
export const nextLevel = (save, line) => line.levels[level(save, line.id)] || null;

// Lines appear as you progress, so the hangar isn't overwhelming at the start.
export function unlocked(save, line) {
  const u = line.unlock;
  if (!u) return true;
  if (u.landings && (save.landings || 0) < u.landings) return false;
  if (u.planted && Object.values(save.planted || {}).reduce((a, n) => a + n, 0) < u.planted) return false;
  return true;
}
export function unlockText(line) {
  const u = line.unlock || {};
  return u.landings ? `Unlocks after ${u.landings} landing${u.landings > 1 ? 's' : ''}` : u.planted ? 'Unlocks when you plant your first tree' : '';
}

// Is the next level waiting for the Biodiversity meter to grow?
export function needsMoreNature(save, line) {
  const next = nextLevel(save, line);
  return !!(next && next.needsBio && biodiversity(save) < next.needsBio);
}

export function canBuy(save, line) {
  const next = nextLevel(save, line);
  return !!next && unlocked(save, line) && !needsMoreNature(save, line) && save.seeds >= next.cost && (save.crystals || 0) >= (next.crystals || 0);
}

// Tree kinds you can plant: spruce, plus each native species unlocked.
export function speciesOwned(save) {
  return ['spruce', ...lineById('species').levels.slice(0, level(save, 'species')).map(l => l.species)];
}

// Fuels the player may pick: normal, their best SAF, and hydrogen once bought.
export function fuelChoices(save) {
  const owned = lineById('fuel').levels.slice(0, level(save, 'fuel')).map(l => l.fuel);
  const bestSaf = owned.filter(f => f.startsWith('saf')).pop();
  return ['kerosene', ...(bestSaf ? [bestSaf] : []), ...(owned.includes('hydrogen') ? ['hydrogen'] : [])];
}

// The flight settings that come from what the player owns.
export function loadout(save) {
  const choices = fuelChoices(save);
  const fuelId = choices.includes(save.fuel) ? save.fuel : choices[choices.length - 1];
  const fuel = FUELS[fuelId];
  const eng = level(save, 'engine') ? lineById('engine').levels[level(save, 'engine') - 1].co2 : 1;
  const cabin = level(save, 'cabin') ? lineById('cabin').levels[level(save, 'cabin') - 1].co2 : 1;
  const radar = level(save, 'radar') ? lineById('radar').levels[level(save, 'radar') - 1] : null;
  const trees = level(save, 'trees') ? lineById('trees').levels[level(save, 'trees') - 1] : null;
  const soil = level(save, 'soil') ? lineById('soil').levels[level(save, 'soil') - 1] : null;
  const magnet = level(save, 'magnet') ? lineById('magnet').levels[level(save, 'magnet') - 1] : null;
  return {
    fuelId,
    co2Cruise: CLIMATE.co2Cruise * fuel.co2 * eng * cabin,
    co2Takeoff: CLIMATE.co2Takeoff * fuel.co2 * eng * cabin,
    // Exhaust plume: grey puffs as dark as the CO2, white wisps as thick as the water vapour.
    smoke: fuel.co2 * eng * cabin,
    vapour: fuel.water,
    contrailEvery: fuel.contrailEvery,
    contrailLife: fuel.contrailLife,
    revealPx: radar ? radar.reveal : ISSR.revealPx,
    hiddenAlpha: radar ? radar.hidden : ISSR.hiddenAlpha,
    tree: trees ? { parcels: trees.parcels, species: speciesOwned(save) } : null,
    pickup: magnet ? magnet.pickup : 12,
    plotW: soil ? soil.plotW : PARCEL.plotW,
  };
}
