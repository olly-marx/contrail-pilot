// Missions: the lessons. One goal per flight, in order, each teaching one idea of the game (and
// showing its lesson picture where there is one). Achievements are badges (src/badges.js), not
// missions. `check(r, save)` looks at the flight result; `progress(s)` is the live HUD line (kept
// SHORT: about 25 characters a line, two lines at most); `needs` says what to buy first.
// Done missions are save.missionsDone (ids); save.mission is how many are done (pilot.js, restore.js).
// No mission names one city: you can fly any way from wherever you land (2026-10-22), so it might never come.
import { km, HAZARDS } from './config.js';
import { REGION_NAMES } from './habitats.js';
import { fleetOf } from './fleet.js';

// A cleaner plane = an engines upgrade bought on any plane you own (the old fuel / engine lines were retired at the
// eras reset, so the mission must read the fleet, 0.11.3).
export const cleanerPlane = save => Object.values(fleetOf(save).planes).some(p => (p.engines || 0) >= 1);

// The world tour (2026-10-22): every region but the UK discovered from the air (GameScene.setRegion).
export const tourLeft = save => Object.keys(REGION_NAMES).filter(r => r !== 'woodland' && !((save || {}).discovered || {})[r]);

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
  { id: 'go-clean', icon: 'mi-shade', lesson: 'lesson-bars', title: 'Make your plane cleaner', sub: 'CO2 heats the Earth. Buy better Engines for your plane in the hangar, then land a flight.',
    check: (r, save) => r.landed && cleanerPlane(save),
    progress: s => (cleanerPlane(s.save) ? 'Cleaner plane! Now land' : 'Buy better Engines first'),
    fail: (r, save) => (cleanerPlane(save) ? 'Land safely to finish it.' : 'Buy better Engines in the hangar.') },
  // (id kept from 'Reach CAIRO' before 2026-10-22, so it stays done for those who did it.)
  { id: 'reach-cairo', icon: 'mi-airports', title: 'Reach a new part of the world', sub: 'Choose a direction and land somewhere with new land and new animals.',
    tip: 'A long way. Normal fuel overheats the Earth first: make your plane cleaner.',
    check: r => r.landed && r.newRegion, progress: s => (s.state === 'landing' || s.state === 'over' ? '' : 'Land in a new land!'),
    fail: r => (r.landed ? `${r.landedAt} is not new land. Try another direction!` : 'Land safely to reach new land.') },
  { id: 'turbulence', icon: 'mi-airports', lesson: 'lesson-turbulence', title: 'Bump through turbulence', sub: `Turbulence starts ${km(HAZARDS.turbulence.from)} into a flight. Fly into the wavy air!`,
    check: r => r.bumped, progress: s => (s.bumped ? 'Bumpy! Land or fly on' : s.distancePx < HAZARDS.turbulence.from ? `Turbulence in ${km(HAZARDS.turbulence.from - s.distancePx)}` : 'Find the wavy air!'),
    fail: r => (r.distance < HAZARDS.turbulence.from ? `Turbulence starts ${km(HAZARDS.turbulence.from)} into a flight.` : 'Fly INTO the wavy air.') },
  { id: 'kinds-3', icon: 'mi-tree', lesson: 'lesson-biodiversity', title: 'Plant 3 kinds of tree in one flight', sub: 'Your parcels take turns through your kinds of tree.', needs: { line: 'species', level: 2, text: 'Oak (NATURE)' },
    check: r => r.kinds >= 3, progress: s => `Kinds planted: ${s.speciesPlanted.size}/3`, fail: r => `You planted ${r.kinds} kind${r.kinds === 1 ? '' : 's'}. Hit more soil!` },
  { id: 'rewild', icon: 'mi-tree', title: 'Bring wildlife back', sub: 'Do a habitat project in your Wild Area (NATURE), then fly.',
    needs: { anyProject: true, text: 'A habitat project (NATURE)' },
    check: r => (r.projects || []).length >= 1, progress: () => 'Wildlife is coming back!', fail: () => 'Do a habitat project in NATURE.' },
  // (id kept from 'Fly round the world' before 2026-10-22.)
  { id: 'world', icon: 'mi-globe', title: 'World tour', sub: 'Fly over every part of the world: deserts, rainforests, ice and more. Each one you fly over opens in NATURE.',
    tip: 'Only the cleanest plane, and a forest of every kind, gets you all the way round.',
    check: (r, save) => tourLeft(save).length === 0, progress: s => `Lands to discover: ${tourLeft(s.save).length}`,
    fail: (r, save) => `Still to discover: ${tourLeft(save).map(x => REGION_NAMES[x]).join(', ')}.` },
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
  const n = m.needs, proj = Object.values(save.habitat || {}).flat();   // a project in any region
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
