// Missions: the spine of the game. One goal per flight, done in order. Early ones teach the
// basics; later ones need a cleaner plane (CO2 overheats the Earth long before CAIRO on normal
// fuel) or a specific upgrade. `check(r)` looks at the flight result; `progress(s)` is the live
// line under the distance; `needs` says what to buy if the mission is impossible without it.
import { km } from './config.js';
import { cityIndex, stopsBetween, LAP_KM } from './route.js';

// Reach a city on the journey (src/route.js): done when you land there or anywhere further along
// the loop, including back at LONDON (a lap), so a player who is already past it is never stuck.
const reach = name => {
  const at = cityIndex(name);
  const stops = s => stopsBetween(s.startCity + s.airportIndex, at);   // 1 = it is the next airport
  return {
    id: `reach-${name.toLowerCase()}`, icon: 'mi-airports',
    title: `Reach ${name}`, sub: `Fly east along the journey and land in ${name}. Every city you land in is your next start.`,
    check: r => r.landed && (r.lap || cityIndex(r.landedAt) >= at),
    progress: s => s.state === 'landing' || s.state === 'over' ? '' : `${name}: ${stops(s) <= 1 ? 'the next airport!' : `${stops(s)} airports away`}`,
    fail: r => r.landed ? `You landed in ${r.landedAt}. Keep flying east to ${name}!` : `Land safely to move on along the journey to ${name}.`,
  };
};

export const MISSIONS = [
  { id: 'land-paris', icon: 'mi-land', title: 'Land in PARIS', sub: 'Fly to the first airport. Get low as you reach the runway.',
    check: r => r.landed && r.landedAt === 'PARIS', progress: s => s.airportsSkipped ? 'Passed PARIS! Land at the next airport to practise.' : s.nextAirport ? `PARIS: ${km(s.nextAirport.worldX - s.distancePx)}` : '',
    fail: r => r.landed ? `You landed in ${r.landedAt}. PARIS is the FIRST airport.` : 'Get LOW just before the grey runway. The plane lands itself!' },
  { id: 'seeds-5', icon: 'mi-seed', title: 'Land with 5 seeds', sub: 'Grab seeds in the sky. You only keep them if you land.',
    check: r => r.landed && r.cargo >= 5, progress: s => `Seeds on board: ${s.cargo}/5`,
    fail: r => r.landed ? `You landed with ${r.cargo}. Grab 5 next time!` : `You had ${r.cargo} seeds but did not land.` },
  { id: 'clean-night', icon: 'mi-night', title: 'A night with no contrail', sub: 'Fly a whole night without touching icy air. Dodging it also earns ice crystals.',
    check: r => r.nightOwl, progress: s => s.isDay ? 'Wait for night...' : (s.night.started && s.heatTrapped - s.night.trappedAtStart < 0.5 ? 'Night: no contrail yet!' : 'Night: contrail made. Next night!'),
    fail: () => 'At night, fly above or below the icy air.' },
  reach('BERLIN'),
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
  // Stage 3, long haul: the hazards of long flights. Two funny ones count a crash: done the first
  // time it happens (or straight away if it already has).
  { id: 'turbulence', icon: 'mi-airports', title: 'Bump through turbulence', sub: 'Turbulence starts 4,000 km into a flight. Fly into the wavy air and feel the bumps!',
    check: r => r.bumped, progress: s => s.bumped ? 'Bumpy! Now land or fly on.' : s.distancePx < 4000 ? `Turbulence from 4,000 km: ${km(4000 - s.distancePx)} to go` : 'Find the wavy air!',
    fail: r => r.distance < 4000 ? 'Turbulence only starts 4,000 km into a flight. Fly further!' : 'Fly INTO the wavy air.' },
  { id: 'far-10000', icon: 'mi-airports', title: 'Fly 10,000 km and land', sub: 'A really long flight. Land safely at the end!',
    check: r => r.landed && r.distance >= 10000, progress: s => `${km(Math.min(10000, s.distancePx))} / 10,000 km`,
    fail: r => r.landed ? `You flew ${km(r.distance)}. Keep going to 10,000 km!` : 'So close! Land safely to finish it.' },
  { id: 'oops-birds', icon: 'mi-airports', title: 'Crash into birds for the first time', sub: 'Birds appear 10,000 km into a flight. They fly fast! Find out the hard way...',
    check: r => !!(r.crashes && r.crashes.bird), progress: s => s.distancePx < 10000 ? `Birds from 10,000 km: ${km(10000 - s.distancePx)} to go` : 'Birds about!',
    fail: r => r.distance < 10000 ? 'Birds only appear 10,000 km into a flight.' : 'You missed them all! Next time, maybe...', done: 'OUCH! Birds fly fast. Now you know: watch out for them!' },
  { id: 'oops-nofly', icon: 'mi-airports', title: 'Get told off by air traffic control', sub: 'No-fly zones start 8,000 km into a flight. What happens if you fly into one?',
    check: r => !!(r.crashes && r.crashes.nofly), progress: s => s.distancePx < 8000 ? `No-fly zones from 8,000 km: ${km(8000 - s.distancePx)} to go` : 'Red and white = no-fly zone!',
    fail: r => r.distance < 8000 ? 'No-fly zones only start 8,000 km into a flight.' : 'You stayed out. Good pilot! (But this mission wants a telling-off...)', done: 'TOLD OFF! Real pilots must never fly into a no-fly zone.' },
  // Stage 4, nature builder.
  { id: 'kinds-3', icon: 'mi-tree', title: 'Plant 3 kinds of tree in one flight', sub: 'Your parcels take turns through your kinds of tree.', needs: { line: 'species', level: 2, text: 'Oak (hangar, NATURE)' },
    check: r => r.kinds >= 3, progress: s => `Kinds planted: ${s.speciesPlanted.size}/3`, fail: r => `You planted ${r.kinds} kind${r.kinds === 1 ? '' : 's'}. Hit more brown soil!` },
  { id: 'kinds-5', icon: 'mi-tree', title: 'Plant ALL 5 kinds in one flight', sub: 'A full forest! Only a forest of every kind can soak up enough CO2 for the longest flights.',
    needs: { lines: [['species', 4], ['trees', 4]], text: 'Fruit trees AND Tree drop plane (NATURE)' },
    check: r => r.kinds >= 5, progress: s => `Kinds planted: ${s.speciesPlanted.size}/5`, fail: r => `You planted ${r.kinds} kinds. Don't miss the soil!` },
  { id: 'beavers', icon: 'mi-tree', title: 'Bring back the beavers', sub: 'Rewild your land until beavers can come home, then fly.', needs: { project: 'beavers', text: 'Beavers return (NATURE)' },
    check: r => (r.projects || []).includes('beavers'), progress: () => 'Beavers are home!', fail: () => 'Rewild your land in the hangar.' },
  // Stage 5, round the world.
  { id: 'far-20000', icon: 'mi-globe', title: 'Fly 20,000 km and land', sub: 'Half way round the world in one go!',
    check: r => r.landed && r.distance >= 20000, progress: s => `${km(Math.min(20000, s.distancePx))} / 20,000 km`,
    fail: r => r.landed ? `You flew ${km(r.distance)}.` : 'Land safely to finish it.' },
  { id: 'nonstop-lap', icon: 'mi-globe', title: 'Round the world without landing', sub: 'All the way round in ONE flight, then land. You will need a full forest of every kind!',
    check: r => r.landed && r.distance >= LAP_KM, progress: s => `${km(Math.min(LAP_KM, s.distancePx))} / ${km(LAP_KM)}`,
    fail: r => `You flew ${km(r.distance)}. Plant all 5 kinds of tree early in the flight!` },
];

export const current = save => MISSIONS[save.mission || 0] || null;   // null: all done
export const allDone = save => (save.mission || 0) >= MISSIONS.length;
// Can this mission be done with what the player owns? (Only hard gates; CO2 does the rest.)
// `needs`: { line, level } (level 1 if not given), or { lines: [[line, level], ...] } for several.
export const blocked = (save, m) => !!(m && m.needs && (m.needs.project ? !((save.habitat || {}).woodland || []).includes(m.needs.project) : (m.needs.lines || [[m.needs.line, m.needs.level || 1]]).some(([l, n]) => !(((save.levels || {})[l] || 0) >= n))));
