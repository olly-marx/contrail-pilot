// Missions: the spine of the game. One goal per flight, done in order. Early ones teach the
// basics; later ones need a cleaner plane (CO2 overheats the Earth long before CAIRO on normal
// fuel) or a specific upgrade. `check(r)` looks at the flight result; `progress(s)` is the live
// line under the distance; `needs` says what to buy if the mission is impossible without it.
import { AIRPORT } from './config.js';

const airportNo = name => AIRPORT.names.indexOf(name) + 1;   // PARIS = 1
const reach = name => {
  const n = airportNo(name);
  return {
    id: `reach-${name.toLowerCase()}`, icon: 'mi-airports',
    title: `Reach ${name}`, sub: `Fly past ${n - 1} airport${n > 2 ? 's' : ''} and land at the ${n === 2 ? '2nd' : n === 3 ? '3rd' : n + 'th'}.`,
    check: r => r.landed && r.airportsSkipped >= n - 1,
    progress: s => s.state === 'landing' || s.state === 'over' ? '' : `${name}: ${Math.max(0, n - 1 - s.airportsSkipped)} more airport${n - 1 - s.airportsSkipped === 1 ? '' : 's'} to pass`,
    fail: r => r.landed ? `You landed after ${r.airportsSkipped} airport${r.airportsSkipped === 1 ? '' : 's'}. ${name} needs ${n - 1}.` : `You got past ${r.airportsSkipped} airport${r.airportsSkipped === 1 ? '' : 's'}. Land safely at ${name}!`,
  };
};

export const MISSIONS = [
  { id: 'land-paris', icon: 'mi-land', title: 'Land in PARIS', sub: 'Fly to the first airport. Get low as you reach the runway.',
    check: r => r.landed && r.airportsSkipped === 0, progress: s => s.airportsSkipped ? 'Passed PARIS! Land at the next airport to practise.' : s.nextAirport ? `PARIS: ${Math.max(0, Math.round(s.nextAirport.worldX - s.distancePx))} m` : '',
    fail: r => r.landed ? `You landed in ${r.landedAt}. PARIS is the FIRST airport.` : 'Get LOW just before the grey runway. The plane lands itself!' },
  { id: 'seeds-5', icon: 'mi-seed', title: 'Land with 5 seeds', sub: 'Grab seeds in the sky. You only keep them if you land.',
    check: r => r.landed && r.cargo >= 5, progress: s => `Seeds on board: ${s.cargo}/5`,
    fail: r => r.landed ? `You landed with ${r.cargo}. Grab 5 next time!` : `You had ${r.cargo} seeds but did not land.` },
  { id: 'clean-night', icon: 'mi-night', title: 'A night with no contrail', sub: 'Fly a whole night without touching icy air. Dodging it also earns ice crystals.',
    check: r => r.nightOwl, progress: s => s.isDay ? 'Wait for night...' : (s.night.started && s.heatTrapped - s.night.trappedAtStart < 0.5 ? 'Night: no contrail yet!' : 'Night: contrail made. Next night!'),
    fail: () => 'At night, fly above or below the icy air.' },
  reach('AMSTERDAM'),
  { id: 'shade-10', icon: 'mi-shade', title: 'Make 10 shade in one flight', sub: 'In sunshine, fly INTO icy air. Your contrail shades the Earth.',
    check: r => r.sunBlocked >= 10, progress: s => `Shade: ${Math.min(10, Math.floor(s.sunBlocked))}/10`,
    fail: r => `You made ${Math.floor(r.sunBlocked)} shade. Fly into icy air when the sun is up.` },
  { ...reach('ROME'), tip: 'Normal fuel overheats the Earth before ROME. Try Cleaner Fuel or Better Engines.' },
  { id: 'plant-tree', icon: 'mi-tree', title: 'Plant a tree', sub: 'Drop a tree parcel onto brown soil.', needs: { line: 'trees', text: 'Tree parcels (hangar, NATURE)' },
    check: r => r.planted >= 1, progress: s => s.kit.tree ? `Trees planted: ${s.planted}/1` : 'Needs Tree parcels from the hangar',
    fail: () => 'Press DROP a little before the brown soil. The X shows where it lands.' },
  { ...reach('CAIRO'), tip: 'A long one. You will need better engines AND cleaner fuel.' },
  { id: 'crystals-5', icon: 'mi-crystal', title: 'Earn 5 ice crystals in one flight', sub: 'Dodge icy air at night. Radar shows it from further away.',
    check: r => r.crystals >= 5, progress: s => `Ice crystals: ${s.crystals}/5`,
    fail: r => `You earned ${r.crystals}. Dodging icy air at night earns them.` },
  { ...reach('NEW YORK'), icon: 'mi-globe', title: 'Round the world to NEW YORK', tip: 'The big one: across the whole world. Only the cleanest plane can do it.' },
];

export const current = save => MISSIONS[save.mission || 0] || null;   // null: all done
export const allDone = save => (save.mission || 0) >= MISSIONS.length;
// Can this mission be done with what the player owns? (Only hard gates; CO2 does the rest.)
export const blocked = (save, m) => !!(m && m.needs && !((save.levels || {})[m.needs.line] > 0));
