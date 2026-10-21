import { CLIMATE, CONTRAIL, ISSR, PARCEL, CARGO, CRYSTALS, cz } from './config.js';
import { SPECIES, PROJECTS, biodiversity } from './nature.js';

// Each upgrade line has levels bought in order. Costs are in seeds (+ ice crystals).
// `tree`: which upgrade tree it sits in (Plane / Fuel / Science / Nature). `requires`: a branch
// opens only once another line has reached a level, e.g. { line: 'engine', level: 1 }.
// `info` is the pop-up shown by the (i) button: short words for 7-10 year olds.
export const LINES = [
  {
    id: 'radar', name: 'Icy Air Radar', group: 'Research', tree: 'Science',
    levels: [
      { cost: 15, crystals: 1, name: 'Humidity sensor', short: 'See icy air sooner.', reveal: 100, hidden: 0.03 },
      { cost: 40, crystals: 2, name: 'Weather balloon', short: 'See icy air even sooner.', reveal: 150, hidden: 0.05 },
      { cost: 400, crystals: 22, name: 'Contrail forecast', short: 'See icy air from far away!', reveal: 220, hidden: 0.08 },
      { cost: 1200, crystals: 67, name: 'Satellite humidity', short: 'Satellites spot icy air across the sky.', reveal: 300, hidden: 0.11 },
    ],
    info: {
      what: 'Icy air is invisible. Scientists measure how wet the air is, so they can guess where it is.',
      why: 'If pilots know where the icy air is, they can fly a bit higher or lower and not make a contrail.',
      fact: 'Icy air is often only a few hundred metres thick. That is shorter than a walk to the shops!',
      links: ['trial', 'project'],
    },
  },
  {
    id: 'fuel', name: 'Cleaner Fuel', group: 'Fuel', tree: 'Fuel', unlock: { landings: 3 },
    levels: [
      { cost: 30, crystals: 2, name: 'A bit of SAF', short: 'A little less CO2.', fuel: 'saf25' },
      { cost: 150, crystals: 8, name: 'Half SAF', short: 'Less CO2. Thinner contrails.', fuel: 'saf50' },
      { cost: 550, crystals: 31, name: 'All SAF', short: 'Much less CO2. Thin contrails.', fuel: 'saf100' },
      { cost: 1800, crystals: 100, name: 'Hydrogen', short: 'ZERO CO2! But MORE contrails.', fuel: 'hydrogen' },
    ],
    info: {
      what: 'SAF is plane fuel made from things like old cooking oil. Hydrogen is a gas that burns without making CO2.',
      why: 'Less CO2 means less warming. SAF also makes less soot, so contrails are thinner. Hydrogen makes lots of water, so it makes MORE contrails!',
      fact: 'There is not enough SAF for every plane yet. Making more is a big job for the future.',
      links: ['brahmal', 'project'],
    },
  },
  {
    id: 'engine', name: 'Better Engines', group: 'Plane', tree: 'Plane', unlock: { landings: 3 },
    levels: [
      { cost: 30, crystals: 2, name: 'Engine tune-up', short: '10% less CO2.', co2: 0.9 },
      { cost: 150, crystals: 8, name: 'New engines', short: '20% less CO2.', co2: 0.8 },
      { cost: 500, crystals: 28, name: 'Super engines', short: '30% less CO2.', co2: 0.7 },
      { cost: 1200, crystals: 67, name: 'Open-rotor engines', short: 'Giant open fans: 38% less CO2.', co2: 0.62 },
      { cost: 1500, crystals: 83, name: 'Next-gen engines', short: '45% less CO2!', co2: 0.55 },
    ],
    info: {
      what: 'New engines burn less fuel to fly the same distance.',
      why: 'Less fuel burned means less CO2, and less CO2 means less warming.',
      fact: 'Planes today use about half the fuel per passenger that planes used 50 years ago.',
      links: ['brahmal', 'project'],
    },
  },
  {
    id: 'cabin', name: 'Greener Cabin', group: 'Plane', tree: 'Plane', unlock: { landings: 1 },
    levels: [
      { cost: 10, crystals: 1, name: 'Cheaper veggie meals', short: 'More people pick veggie food.', co2: 0.98 },
      { cost: 20, crystals: 1, name: 'No single-use plastic', short: 'Refill water, less rubbish.', co2: 0.96 },
      { cost: 35, crystals: 2, name: 'Only the food ordered', short: 'Less wasted food to carry.', co2: 0.94 },
      { cost: 90, crystals: 5, name: 'Lighter trolleys and seats', short: 'A lighter plane burns less fuel.', co2: 0.92 },
    ],
    info: {
      what: 'Airlines can make small changes inside the plane: the food, the cups, and how heavy things are.',
      why: 'Meat makes much more CO2 to farm than veggie food. And every bit of weight a plane carries needs fuel to lift.',
      fact: 'These changes are small next to cleaner fuel and engines, but every little bit adds up!',
      links: ['brahmal', 'project'],
    },
  },
  {
    id: 'trees', name: 'Tree Planting', group: 'Trees', tree: 'Nature',
    levels: [
      { cost: 25, crystals: 1, name: 'Tree parcels', short: 'Drop 2 trees per flight onto brown soil.', parcels: 2 },
      { cost: 40, crystals: 2, name: 'More parcels', short: 'Drop 3 trees per flight.', parcels: 3 },
      { cost: 450, crystals: 25, name: 'Big cargo hold', short: 'Drop 4 trees per flight.', parcels: 4 },
      { cost: 650, crystals: 36, name: 'Tree drop plane', short: 'Drop 6 trees per flight!', parcels: 6 },
    ],
    info: {
      what: 'Parcels hold young trees. Drop them from your plane onto brown soil to plant them.',
      why: 'Trees take CO2 out of the air as they grow. Plant early: they grow bigger and help more.',
      fact: 'A tree takes many years to grow big. Not making CO2 in the first place works faster.',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'soil', name: 'Soil Patches', group: 'Trees', tree: 'Nature', unlock: { planted: 1 },
    levels: [
      { cost: 20, crystals: 1, name: 'Bigger soil patches', short: 'Easier to hit with a parcel.', plotW: 64 },
      { cost: 90, crystals: 5, name: 'Huge soil patches', short: 'Really easy to hit!', plotW: 80 },
      { cost: 150, crystals: 8, name: 'Giant soil patches', short: 'You can hardly miss!', plotW: 96 },
    ],
    info: {
      what: 'Patches of ready soil where your tree parcels can land and grow.',
      why: 'Bigger patches are easier to hit, so fewer trees are wasted.',
      fact: 'In real life, people get the ground ready first: clearing weeds and choosing the right spot for each tree.',
      links: ['citizenzoo'],
    },
  },
  {
    id: 'species', name: 'Tree Species', group: 'Nature', tree: 'Nature', unlock: { planted: 1 },
    levels: [
      { cost: 30, crystals: 2, name: 'Birch', short: 'A new native tree. Big boost for nature!', species: 'birch' },
      { cost: 150, crystals: 8, name: 'Oak', short: 'Home to over 2,000 kinds of wildlife.', species: 'oak' },
      { cost: 210, crystals: 12, name: 'Rowan', short: 'Berries for the birds.', species: 'rowan' },
      { cost: 550, crystals: 31, name: 'Fruit trees', short: 'Food for people, bees and birds.', species: 'orchard' },
    ],
    info: {
      what: 'You start with spruce. It grows fast but few animals live in it. Native trees are trees that have always grown here.',
      why: 'Every NEW kind of tree you plant fills your Biodiversity meter much more than planting the same kind again.',
      fact: 'A wood with many kinds of trees is home to many more animals than rows of just one kind.',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'rewild', name: 'Rewilding', group: 'Nature', tree: 'Nature', unlock: { planted: 1 },
    levels: PROJECTS.map(p => ({ cost: p.cost, crystals: p.crystals, name: p.name, short: p.short, needsBio: p.needs, project: p.id })),
    info: {
      what: 'Rewilding means helping nature look after itself again: wild places, and bringing back animals that used to live here.',
      why: 'Each project fills your Biodiversity meter, and healthy land soaks up a little CO2 on every flight.',
      fact: 'Beaver dams slow floods and make wetlands that store carbon.' + cz(' Citizen Zoo works with beavers in London!'),
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'magnet', name: 'Seed Magnet', group: 'Plane', tree: 'Plane',
    levels: [
      { cost: 20, crystals: 1, name: 'Seed magnet', short: 'Grab seeds from further away.', pickup: 22 },
      { cost: 40, crystals: 2, name: 'Strong magnet', short: 'Grab seeds from even further.', pickup: 30 },
      { cost: 380, crystals: 21, name: 'Super magnet', short: 'Seeds fly to you!', pickup: 40 },
    ],
    info: {
      what: 'A pretend gadget that pulls floating seeds towards your plane.',
      why: 'More seeds on board means more seeds when you land. Only if you land safely!',
      fact: cz('In real life, trees are planted by people. Citizen Zoo plants trees in London.', 'In real life, trees are planted by people, often volunteers.'),
      links: ['citizenzoo'],
    },
  },
  {
    id: 'airframe', name: 'Lighter Plane', group: 'Plane', tree: 'Plane', requires: { line: 'engine', level: 1 },
    levels: [
      { cost: 120, crystals: 7, name: 'Carbon-fibre parts', short: 'Take-off and landing make 15% less CO2.', takeoff: 0.85 },
      { cost: 400, crystals: 22, name: 'Lighter body', short: 'Take-off and landing make 30% less CO2.', takeoff: 0.7 },
      { cost: 1100, crystals: 61, name: 'Super-light plane', short: 'Take-off and landing make 40% less CO2.', takeoff: 0.6 },
    ],
    info: {
      what: 'A plane is made of thousands of parts. New materials like carbon fibre are strong but light.',
      why: 'A lighter plane needs less push to climb, so take-off burns less fuel.',
      fact: 'The Boeing 787 is about half carbon fibre. It is much lighter than older metal planes.',
      links: ['brahmal'],
    },
  },
  {
    id: 'wings', name: 'Long Wings', group: 'Plane', tree: 'Plane', requires: { line: 'airframe', level: 1 },
    levels: [
      { cost: 150, crystals: 8, name: 'Longer wings', short: 'Less fuel to stay up: 5% less CO2.', co2: 0.95 },
      { cost: 450, crystals: 25, name: 'Glider wings', short: 'Glider-like wings: 10% less CO2.', co2: 0.9 },
    ],
    info: {
      what: 'Long thin wings make lots of lift without much drag, like a glider.',
      why: 'More lift for less drag means the engines work less hard, so they burn less fuel.',
      fact: 'Some new plane wings are so long that the tips fold up so the plane fits at the airport!',
      links: ['brahmal'],
    },
  },
  {
    id: 'gear', name: 'Landing Gear', group: 'Plane', tree: 'Plane', unlock: { landings: 3 },
    levels: [
      { cost: 30, crystals: 2, name: 'Smart landing gear', short: 'The plane lines up for landing sooner.', flare: 1.25 },
      { cost: 140, crystals: 8, name: 'Auto-land helper', short: 'Landing is much easier.', flare: 1.5 },
    ],
    info: {
      what: 'Planes have computers that help them line up with the runway.',
      why: 'A safe landing keeps all your seeds, so landing well matters a lot!',
      fact: 'Big airports have radio beams that guide planes down, even in fog.',
      links: ['brahmal'],
    },
  },
  {
    id: 'hold', name: 'Bigger Hold', group: 'Plane', tree: 'Plane', requires: { line: 'magnet', level: 1 },
    levels: [
      { cost: 150, crystals: 8, name: 'Bigger hold', short: 'Landing bonus grows faster: +0.6 per airport.', perSkip: 0.6 },
      { cost: 500, crystals: 28, name: 'Huge hold', short: '+0.7 per airport passed.', perSkip: 0.7 },
      { cost: 1300, crystals: 72, name: 'Cargo giant', short: '+0.8 per airport passed!', perSkip: 0.8 },
    ],
    info: {
      what: 'The hold is the space under the floor where bags and cargo go.',
      why: 'Fly past airports before landing and your landing bonus grows. A bigger hold makes it grow faster.',
      fact: 'But crash, and you lose ALL your seeds. Is it worth the risk?',
      links: [],
    },
  },
  {
    id: 'lens', name: 'Crystal Lens', group: 'Research', tree: 'Science', requires: { line: 'radar', level: 1 },
    levels: [
      { cost: 150, crystals: 8, name: 'Crystal lens', short: '2 ice crystals for each icy air dodged at night.', dodge: 2 },
      { cost: 500, crystals: 28, name: 'Crystal scope', short: '3 ice crystals for each dodge!', dodge: 3 },
    ],
    info: {
      what: 'Scientists look at contrail ice crystals with special cameras on planes and satellites.',
      why: 'The better we understand contrails, the better we can avoid the warming ones.',
      fact: 'Contrail ice crystals are tiny: about 10 of them would fit across a human hair.',
      links: ['trial', 'project'],
    },
  },
  {
    id: 'forecast', name: 'Weather Forecast', group: 'Research', tree: 'Science', requires: { line: 'lens', level: 1 },
    levels: [
      { cost: 180, crystals: 10, name: 'Night forecast', short: 'Up to 5 dodges count each night.', dodgesPerNight: 5 },
      { cost: 1200, crystals: 67, name: 'Supercomputer forecast', short: 'Up to 8 dodges count each night!', dodgesPerNight: 8 },
    ],
    info: {
      what: 'Weather forecasts use supercomputers to guess where icy air will be hours ahead.',
      why: 'If pilots know where the icy air is at night, they can plan to fly around it.',
      fact: 'Real trials have tested moving a few flights up or down to avoid warming contrails.',
      links: ['trial', 'project'],
    },
  },
  {
    id: 'nursery', name: 'Tree Nursery', group: 'Trees', tree: 'Nature', requires: { line: 'trees', level: 2 },
    levels: [
      { cost: 140, crystals: 8, name: 'Tree nursery', short: 'Your trees grow up faster.', grow: 0.7 },
      { cost: 450, crystals: 25, name: 'Big nursery', short: 'Trees grow up twice as fast!', grow: 0.5 },
    ],
    info: {
      what: 'A tree nursery grows young trees until they are strong enough to plant out.',
      why: 'Older, stronger young trees grow up faster, so they start taking in more CO2 sooner.',
      fact: 'Some trees are grown from seeds collected from old trees nearby, so they suit the local land.',
      links: ['citizenzoo'],
    },
  },
];

export const FUELS = {
  // `water`: water vapour in the exhaust (drawn as white wisps). Hydrogen makes about 2.5x as much.
  kerosene: { name: 'Normal fuel', co2: 1.0, water: 1.0, contrailEvery: CONTRAIL.every, contrailLife: CONTRAIL.life },
  saf25:    { name: 'A bit of SAF', co2: 0.9, water: 1.05, contrailEvery: 14, contrailLife: 6500 },
  saf50:    { name: 'Half SAF', co2: 0.8, water: 1.1, contrailEvery: 17, contrailLife: 5500 },
  saf100:   { name: 'All SAF', co2: 0.65, water: 1.15, contrailEvery: 22, contrailLife: 4500 },
  hydrogen: { name: 'Hydrogen', co2: 0.25, water: 2.5,   // co2 0.25: making hydrogen uses energy, so never quite zero
    contrailEvery: 8, contrailLife: 9000 },
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
  { id: 'roundTheWorld', name: 'Round the World', desc: 'Fly all the way round the world, back to LONDON.' },
];

// The hangar has two tabs: the plane (and contrail research) first, nature second.
export const tabOf = line => (['Trees', 'Nature'].includes(line.group) ? 'nature' : 'plane');

export const level = (save, lineId) => save.levels[lineId] || 0;
export const lineById = id => LINES.find(l => l.id === id);
export const nextLevel = (save, line) => line.levels[level(save, line.id)] || null;

// Lines appear as you progress, so the hangar isn't overwhelming at the start.
export function unlocked(save, line) {
  if (!branchOpen(save, line)) return false;
  const u = line.unlock;
  if (!u) return true;
  if (u.landings && (save.landings || 0) < u.landings) return false;
  if (u.planted && Object.values(save.planted || {}).reduce((a, n) => a + n, 0) < u.planted) return false;
  return true;
}
// A branch: is the line it grows from at the level it needs? (Separate from `unlock` above.)
export const branchOpen = (save, line) => !line.requires || level(save, line.requires.line) >= line.requires.level;
export const requiresText = line => line.requires ? `Needs ${lineById(line.requires.line).name} ${line.requires.level}` : '';
export function unlockText(line, save = null) {
  if (save && !branchOpen(save, line)) return requiresText(line);
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
  const at = (id, key, none) => level(save, id) ? lineById(id).levels[level(save, id) - 1][key] : none;   // the bought level's value
  const airframe = at('airframe', 'takeoff', 1);
  const wings = at('wings', 'co2', 1);   // Long Wings: less CO2. (Upgrades never change the controls: players learn them.)
  return {
    fuelId,
    co2Cruise: CLIMATE.co2Cruise * fuel.co2 * eng * cabin * wings,
    co2Takeoff: CLIMATE.co2Takeoff * fuel.co2 * eng * cabin * wings * airframe,
    // Exhaust plume: grey puffs as dark as the CO2, white wisps as thick as the water vapour.
    smoke: fuel.co2 * eng * cabin * wings,
    vapour: fuel.water,
    contrailEvery: fuel.contrailEvery,
    contrailLife: fuel.contrailLife,
    revealPx: radar ? radar.reveal : ISSR.revealPx,
    hiddenAlpha: radar ? radar.hidden : ISSR.hiddenAlpha,
    tree: trees ? { parcels: trees.parcels, species: speciesOwned(save) } : null,
    pickup: magnet ? magnet.pickup : 12,
    plotW: soil ? soil.plotW : PARCEL.plotW,
    flare: at('gear', 'flare', 1),                // x the landing window (AIRPORT.flareFrom / flareHeight)
    perSkip: at('hold', 'perSkip', CARGO.multiplierPerSkip),
    dodgeCrystals: at('lens', 'dodge', CRYSTALS.dodge),
    dodgesPerNight: at('forecast', 'dodgesPerNight', CRYSTALS.dodgesPerNight),
    grow: at('nursery', 'grow', 1),               // x the time a tree takes to grow
  };
}
