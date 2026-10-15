import { CLIMATE, CONTRAIL, ISSR } from './config.js';

// Everything the shop sells. `needs` = must own that first. Costs are in trees.
export const UPGRADES = [
  {
    id: 'sensor', track: 'Research', name: 'Humidity sensor', cost: 6,
    blurb: 'See ISSRs from further away.',
    science: 'Better humidity measurements show where ice supersaturated air is.',
  },
  {
    id: 'forecast', track: 'Research', name: 'Forecast model', cost: 20, needs: 'sensor',
    blurb: 'See ISSRs long before you reach them.',
    science: 'Contrail forecasts let pilots change height to miss ISSRs. Real scientists work on this!',
  },
  {
    id: 'saf', track: 'Fuel', name: 'Sustainable fuel (SAF)', cost: 10,
    blurb: 'Less CO2. Thinner contrails that fade faster.',
    science: 'SAF is made from waste like used cooking oil. It makes less soot, so fewer ice crystals.',
  },
  {
    id: 'hydrogen', track: 'Fuel', name: 'Hydrogen engine', cost: 35, needs: 'saf',
    blurb: 'Zero CO2! But MORE contrails. Careful at night.',
    science: 'Burning hydrogen makes no CO2, but lots of water vapour, so contrails form more easily.',
  },
  {
    id: 'parcels', track: 'Planting', name: 'Tree parcels', cost: 8,
    blurb: 'Drop 3 trees per flight. Tap the ground to plant.',
    science: 'Trees take CO2 out of the air as they grow. The earlier you plant, the more they help.',
  },
  {
    id: 'oak', track: 'Planting', name: 'Oak saplings', cost: 18, needs: 'parcels',
    blurb: '5 parcels per flight. Oaks cool more.',
    science: 'Big broadleaf trees store more carbon than small ones.',
  },
  {
    id: 'orchard', track: 'Planting', name: 'Fruit trees', cost: 30, needs: 'oak',
    blurb: '6 parcels. Fruit trees cool the most.',
    science: 'Fruit trees feed people and wildlife as well as storing carbon.',
  },
];

export const FUELS = {
  kerosene: { name: 'Kerosene', co2: 1.0, contrailEvery: CONTRAIL.every, contrailLife: CONTRAIL.life },
  saf:      { name: 'SAF',      co2: 0.6, contrailEvery: 22,             contrailLife: 4500 },
  hydrogen: { name: 'Hydrogen', co2: 0.0, contrailEvery: 8,              contrailLife: 9000 },
};

export const TREES = {
  none:    null,
  spruce:  { name: 'Spruce', parcels: 3, coolPerStage: [0.15, 0.3, 0.45] },
  oak:     { name: 'Oak',    parcels: 5, coolPerStage: [0.2, 0.4, 0.6] },
  orchard: { name: 'Fruit',  parcels: 6, coolPerStage: [0.25, 0.5, 0.8] },
};

export const BADGES = [
  { id: 'firstLanding', name: 'First Landing', desc: 'Land at an airport.' },
  { id: 'longHaul', name: 'Long Haul', desc: 'Fly past 2 airports, then land.' },
  { id: 'sunShield', name: 'Sun Shield', desc: 'Block 30 sunlight in one flight.' },
  { id: 'nightOwl', name: 'Night Owl', desc: 'Fly a whole night without trapping heat.' },
  { id: 'coolPlanet', name: 'Cool Planet', desc: 'Land with the planet cooler than when you started.' },
  { id: 'forester', name: 'Forester', desc: 'Plant 3 trees in one flight.' },
  { id: 'zeroCarbon', name: 'Zero Carbon Pilot', desc: 'Get the hydrogen engine.' },
];

export const owns = (save, id) => save.owned.includes(id);

export function canBuy(save, u) {
  if (owns(save, u.id)) return false;
  if (u.needs && !owns(save, u.needs)) return false;
  return save.trees >= u.cost;
}

// The flight settings that come from what the player owns.
export function loadout(save) {
  const fuelId = owns(save, save.fuel) || save.fuel === 'kerosene' ? save.fuel : 'kerosene';
  const fuel = FUELS[fuelId];
  const tree = owns(save, 'orchard') ? TREES.orchard : owns(save, 'oak') ? TREES.oak : owns(save, 'parcels') ? TREES.spruce : null;
  return {
    fuelId,
    co2Cruise: CLIMATE.co2Cruise * fuel.co2,
    co2Takeoff: CLIMATE.co2Takeoff * Math.max(fuel.co2, 0),
    contrailEvery: fuel.contrailEvery,
    contrailLife: fuel.contrailLife,
    revealPx: owns(save, 'forecast') ? 200 : owns(save, 'sensor') ? 110 : ISSR.revealPx,
    hiddenAlpha: owns(save, 'forecast') ? 0.08 : owns(save, 'sensor') ? 0.03 : ISSR.hiddenAlpha,
    tree,
  };
}
