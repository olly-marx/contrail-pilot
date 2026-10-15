import { CLIMATE, CONTRAIL, ISSR } from './config.js';

// Each upgrade line has levels bought in order. Costs are in trees.
// `info` is the pop-up shown by the (i) button: short words for 7-10 year olds.
export const LINES = [
  {
    id: 'radar', name: 'Icy Air Radar', group: 'Research',
    levels: [
      { cost: 15, name: 'Humidity sensor', short: 'See icy air sooner.', reveal: 100, hidden: 0.03 },
      { cost: 45, name: 'Weather balloon', short: 'See icy air even sooner.', reveal: 150, hidden: 0.05 },
      { cost: 100, name: 'Contrail forecast', short: 'See icy air from far away!', reveal: 220, hidden: 0.08 },
    ],
    info: {
      what: 'Icy air is invisible. Scientists measure how wet the air is, so they can guess where it is.',
      why: 'If pilots know where the icy air is, they can fly a bit higher or lower and not make a contrail.',
      fact: 'Icy air is often only a few hundred metres thick. That is shorter than a walk to the shops!',
      links: ['forecast', 'project'],
    },
  },
  {
    id: 'fuel', name: 'Cleaner Fuel', group: 'Fuel',
    levels: [
      { cost: 20, name: 'A bit of SAF', short: 'A little less CO2.', fuel: 'saf25' },
      { cost: 55, name: 'Half SAF', short: 'Less CO2. Thinner contrails.', fuel: 'saf50' },
      { cost: 110, name: 'All SAF', short: 'Much less CO2. Thin contrails.', fuel: 'saf100' },
      { cost: 220, name: 'Hydrogen', short: 'ZERO CO2! But MORE contrails.', fuel: 'hydrogen' },
    ],
    info: {
      what: 'SAF is plane fuel made from things like old cooking oil. Hydrogen is a gas that burns without making CO2.',
      why: 'Less CO2 means less warming. SAF also makes less soot, so contrails are thinner. Hydrogen makes lots of water, so it makes MORE contrails!',
      fact: 'There is not enough SAF for every plane yet. Making more is a big job for the future.',
      links: ['project'],
    },
  },
  {
    id: 'engine', name: 'Better Engines', group: 'Plane',
    levels: [
      { cost: 25, name: 'Engine tune-up', short: '10% less CO2.', co2: 0.9 },
      { cost: 60, name: 'New engines', short: '20% less CO2.', co2: 0.8 },
      { cost: 120, name: 'Super engines', short: '30% less CO2.', co2: 0.7 },
    ],
    info: {
      what: 'New engines burn less fuel to fly the same distance.',
      why: 'Less fuel burned means less CO2, and less CO2 means less warming.',
      fact: 'Planes today use about half the fuel per passenger that planes used 50 years ago.',
      links: ['project'],
    },
  },
  {
    id: 'trees', name: 'Tree Planting', group: 'Trees',
    levels: [
      { cost: 30, name: 'Tree parcels', short: 'Drop 2 trees per flight. Tap the grass!', tree: 'spruce', parcels: 2 },
      { cost: 60, name: 'More parcels', short: 'Drop 4 trees per flight.', tree: 'spruce', parcels: 4 },
      { cost: 100, name: 'Oak trees', short: 'Oaks grow big and cool more.', tree: 'oak', parcels: 4 },
      { cost: 170, name: 'Fruit trees', short: '5 fruit trees. They cool the most!', tree: 'orchard', parcels: 5 },
    ],
    info: {
      what: 'Trees take CO2 out of the air as they grow.',
      why: 'Plant early in your flight: trees grow bigger and help more the longer they have.',
      fact: 'A tree takes many years to grow big. Not making CO2 in the first place works faster.',
      links: ['citizenzoo', 'project'],
    },
  },
  {
    id: 'magnet', name: 'Tree Magnet', group: 'Plane',
    levels: [
      { cost: 20, name: 'Tree magnet', short: 'Grab trees from further away.', pickup: 22 },
      { cost: 50, name: 'Strong magnet', short: 'Grab trees from even further.', pickup: 30 },
      { cost: 100, name: 'Super magnet', short: 'Trees fly to you!', pickup: 40 },
    ],
    info: {
      what: 'A pretend gadget that pulls floating trees towards your plane.',
      why: 'More trees on board means more trees when you land. Only if you land safely!',
      fact: 'In real life, trees are planted by people. Citizen Zoo plants trees in London.',
      links: ['citizenzoo'],
    },
  },
];

export const FUELS = {
  kerosene: { name: 'Normal fuel', co2: 1.0, contrailEvery: CONTRAIL.every, contrailLife: CONTRAIL.life },
  saf25:    { name: 'A bit of SAF', co2: 0.85, contrailEvery: 14, contrailLife: 6500 },
  saf50:    { name: 'Half SAF', co2: 0.7, contrailEvery: 17, contrailLife: 5500 },
  saf100:   { name: 'All SAF', co2: 0.45, contrailEvery: 22, contrailLife: 4500 },
  hydrogen: { name: 'Hydrogen', co2: 0.0, contrailEvery: 8, contrailLife: 9000 },
};

export const TREE_KINDS = {
  spruce:  { name: 'Spruce', coolPerStage: [0.15, 0.3, 0.45] },
  oak:     { name: 'Oak', coolPerStage: [0.2, 0.4, 0.6] },
  orchard: { name: 'Fruit tree', coolPerStage: [0.25, 0.5, 0.8] },
};

export const BADGES = [
  { id: 'firstLanding', name: 'First Landing', desc: 'Land at an airport.' },
  { id: 'longHaul', name: 'Long Haul', desc: 'Fly past 2 airports, then land.' },
  { id: 'treeHunter', name: 'Tree Hunter', desc: 'Land with 15 trees on board.' },
  { id: 'sunShield', name: 'Sun Shield', desc: 'Make lots of shade (-30) in one flight.' },
  { id: 'nightOwl', name: 'Night Owl', desc: 'Fly a whole night without trapping heat.' },
  { id: 'coolPlanet', name: 'Cool Planet', desc: 'Land with the planet cooler than at take off.' },
  { id: 'forester', name: 'Forester', desc: 'Plant 3 trees in one flight.' },
  { id: 'zeroCarbon', name: 'Zero Carbon Pilot', desc: 'Get the hydrogen engine.' },
];

export const level = (save, lineId) => save.levels[lineId] || 0;
export const lineById = id => LINES.find(l => l.id === id);
export const nextLevel = (save, line) => line.levels[level(save, line.id)] || null;

export function canBuy(save, line) {
  const next = nextLevel(save, line);
  return !!next && save.trees >= next.cost;
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
  const radar = level(save, 'radar') ? lineById('radar').levels[level(save, 'radar') - 1] : null;
  const trees = level(save, 'trees') ? lineById('trees').levels[level(save, 'trees') - 1] : null;
  const magnet = level(save, 'magnet') ? lineById('magnet').levels[level(save, 'magnet') - 1] : null;
  return {
    fuelId,
    co2Cruise: CLIMATE.co2Cruise * fuel.co2 * eng,
    co2Takeoff: CLIMATE.co2Takeoff * fuel.co2 * eng,
    contrailEvery: fuel.contrailEvery,
    contrailLife: fuel.contrailLife,
    revealPx: radar ? radar.reveal : ISSR.revealPx,
    hiddenAlpha: radar ? radar.hidden : ISSR.hiddenAlpha,
    tree: trees ? { kind: trees.tree, parcels: trees.parcels, ...TREE_KINDS[trees.tree] } : null,
    pickup: magnet ? magnet.pickup : 12,
  };
}
