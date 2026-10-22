// Missions: the lessons. One goal per flight, in order, each teaching one idea of the game (and
// showing its lesson picture where there is one). Achievements are badges (src/badges.js), not
// missions. `check(r, save)` looks at the flight result; `progress(s)` is the live HUD line (kept
// SHORT: about 25 characters a line, two lines at most); `needs` says what to buy first.
// Done missions are save.missionsDone (ids); save.mission is how many are done (pilot.js, restore.js).
// No mission names a city that could end up BEHIND you: you fly on from wherever you land.
import { km } from './config.js';
import { cityIndex, stopsBetween } from './route.js';

// Reach a city on the journey: done when you land there or anywhere further along the loop,
// including back at LONDON (a lap), so a player who is already past it is never stuck.
export const reach = (name, extra = {}) => {
  const at = cityIndex(name);
  const stops = s => stopsBetween(s.startCity + s.airportIndex, at);   // 1 = it is the next airport
  return {
    id: `reach-${name.toLowerCase().replace(' ', '')}`, icon: 'mi-airports',
    title: `Reach ${name}`, sub: `Fly east and land in ${name}, or anywhere past it. You always fly on from where you land.`,
    check: r => r.landed && (r.lap || cityIndex(r.landedAt) >= at),
    progress: s => (s.state === 'landing' || s.state === 'over' ? '' : `${name}: ${stops(s) <= 1 ? 'next stop!' : `${stops(s)} stops away`}`),
    fail: r => (r.landed ? `You landed in ${r.landedAt}. Keep flying east to ${name}!` : `Land safely to move on towards ${name}.`),
    ...extra,
  };
};

export const MISSIONS = [
  { id: 'land', icon: 'mi-land', lesson: 'lesson-land', title: 'Land at an airport', sub: 'Get low as you reach the grey runway. The plane lands itself!',
    check: r => r.landed, progress: s => (s.nextAirport ? `${s.nextAirport.name}: ${km(s.nextAirport.worldX - s.distancePx)}` : ''),
    fail: () => 'Get LOW just before the grey runway.' },
  { id: 'seeds-5', icon: 'mi-seed', lesson: 'lesson-seed', title: 'Land with 5 seeds', sub: 'Grab seeds in the sky. You only keep them if you land.',
    check: r => r.landed && r.cargo >= 5, progress: s => `Seeds: ${s.cargo}/5`,
    fail: r => (r.landed ? `You landed with ${r.cargo}. Grab 5!` : `You had ${r.cargo} seeds but did not land.`) },
  { id: 'shade-10', icon: 'mi-shade', lesson: 'lesson-day', title: 'Make 10 shade in one flight', sub: 'In sunshine, fly INTO icy air. Your contrail shades the Earth.',
    check: r => r.sunBlocked >= 10, progress: s => `Shade: ${Math.min(10, Math.floor(s.sunBlocked))}/10`,
    fail: r => `You made ${Math.floor(r.sunBlocked)} shade. Fly into icy air when the sun is up.` },
  { id: 'clean-night', icon: 'mi-night', lesson: 'lesson-night', title: 'A night with no contrail', sub: 'Fly a whole night without touching icy air.',
    check: r => r.nightOwl,
    progress: s => (s.isDay ? 'Wait for night...' : (s.night.started && s.heatTrapped - s.night.trappedAtStart < 0.5 ? 'Night: no contrail yet!' : 'Contrail made. Next night!')),
    fail: () => 'At night, fly above or below the icy air.' },
  { id: 'pass-1', icon: 'mi-airports', lesson: 'lesson-bonus', title: 'Fly past an airport, then land', sub: 'Every airport you pass makes your landing bonus bigger. Crash and you lose your seeds!',
    check: r => r.landed && r.airportsSkipped >= 1, progress: s => (s.airportsSkipped ? `Bonus x${s.multiplier()}! Now land` : 'Fly past the next airport'),
    fail: r => (r.landed ? 'Fly past one airport before you land.' : 'So close! Land to keep the bonus.') },
  { id: 'plant-tree', icon: 'mi-tree', lesson: 'lesson-plot', title: 'Plant a tree', sub: 'Drop a tree parcel onto brown soil.', needs: { line: 'trees', text: 'Tree parcels (NATURE)' },
    check: r => r.planted >= 1, progress: s => (s.kit.tree ? `Trees planted: ${s.planted}/1` : 'Needs Tree parcels'),
    fail: () => 'Press DROP a little before the brown soil.' },
  { id: 'crystals-5', icon: 'mi-crystal', lesson: 'lesson-crystals', title: 'Earn 5 ice crystals in one flight', sub: 'Dodge icy air at night. Radar shows it from further away.',
    check: r => r.crystals >= 5, progress: s => `Ice crystals: ${s.crystals}/5`,
    fail: r => `You earned ${r.crystals}. Dodge icy air at night.` },
  { id: 'go-clean', icon: 'mi-shade', lesson: 'lesson-bars', title: 'Make your plane cleaner', sub: 'CO2 heats the Earth. Buy Cleaner Fuel or Better Engines in the hangar, then land a flight.',
    check: (r, save) => r.landed && (((save.levels || {}).fuel || 0) + ((save.levels || {}).engine || 0)) >= 1,
    progress: s => ((((s.save.levels || {}).fuel || 0) + ((s.save.levels || {}).engine || 0)) >= 1 ? 'Cleaner plane! Now land' : 'Buy a cleaner plane first'),
    fail: (r, save) => ((((save.levels || {}).fuel || 0) + ((save.levels || {}).engine || 0)) >= 1 ? 'Land safely to finish it.' : 'Buy Cleaner Fuel or Better Engines in the hangar.') },
  reach('CAIRO', { tip: 'A long way. Normal fuel overheats the Earth first: make your plane cleaner.' }),
  { id: 'turbulence', icon: 'mi-airports', lesson: 'lesson-turbulence', title: 'Bump through turbulence', sub: 'Turbulence starts 4,000 km into a flight. Fly into the wavy air!',
    check: r => r.bumped, progress: s => (s.bumped ? 'Bumpy! Land or fly on' : s.distancePx < 4000 ? `Turbulence in ${km(4000 - s.distancePx)}` : 'Find the wavy air!'),
    fail: r => (r.distance < 4000 ? 'Turbulence starts 4,000 km into a flight.' : 'Fly INTO the wavy air.') },
  { id: 'kinds-3', icon: 'mi-tree', lesson: 'lesson-biodiversity', title: 'Plant 3 kinds of tree in one flight', sub: 'Your parcels take turns through your kinds of tree.', needs: { line: 'species', level: 2, text: 'Oak (NATURE)' },
    check: r => r.kinds >= 3, progress: s => `Kinds planted: ${s.speciesPlanted.size}/3`, fail: r => `You planted ${r.kinds} kind${r.kinds === 1 ? '' : 's'}. Hit more soil!` },
  { id: 'rewild', icon: 'mi-tree', title: 'Bring wildlife back', sub: 'Do a habitat project in your Wild Area (NATURE), then fly.',
    needs: { anyProject: true, text: 'A habitat project (NATURE)' },
    check: r => (r.projects || []).length >= 1, progress: () => 'Wildlife is coming back!', fail: () => 'Do a habitat project in NATURE.' },
  reach('LONDON', { id: 'world', icon: 'mi-globe', title: 'Fly round the world', sub: 'Keep flying east, flight after flight, all the way back to LONDON.',
    check: r => r.landed && r.lap, tip: 'Only the cleanest plane, and a forest of every kind, gets you all the way round.' }),
];

const doneSet = save => new Set(save.missionsDone || []);
export const current = save => { const d = doneSet(save); return MISSIONS.find(m => !d.has(m.id)) || null; };   // null: all done
export const allDone = save => !current(save);
export const indexOf = m => MISSIONS.indexOf(m);
export function complete(save, m) {
  save.missionsDone = [...new Set([...(save.missionsDone || []), m.id])];
  save.mission = save.missionsDone.filter(id => MISSIONS.some(x => x.id === id)).length;
}
// Can this mission be done with what the player owns? `needs`: { line, level }, several { lines },
// { project }, or { anyProject }.
export const blocked = (save, m) => {
  if (!m || !m.needs) return false;
  const n = m.needs, proj = (save.habitat || {}).woodland || [];
  if (n.anyProject) return proj.length === 0;
  if (n.project) return !proj.includes(n.project);
  return (n.lines || [[n.line, n.level || 1]]).some(([l, lv]) => !(((save.levels || {})[l] || 0) >= lv));
};

// Saves from before 2026-10-22 stored only save.mission, a position in the OLD list of 19. Each new
// mission counts as done if the old position shows the player had learnt that idea.
const OLD_DONE_AFTER = { land: 1, 'seeds-5': 2, 'clean-night': 3, 'shade-10': 5, 'pass-1': 4, 'plant-tree': 7, 'go-clean': 6,
  'reach-cairo': 8, 'crystals-5': 9, turbulence: 11, 'kinds-3': 15, rewild: 17, world: 19 };
export function migrateMissions(save) {
  if (save.missionsDone) return;
  const old = save.mission || 0;
  save.missionsDone = MISSIONS.filter(m => old >= OLD_DONE_AFTER[m.id]).map(m => m.id);
  save.mission = save.missionsDone.length;
}
