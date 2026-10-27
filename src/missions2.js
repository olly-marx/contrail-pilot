// Season 2 missions: the teaching spine (S3 of research/PROPOSAL-HOME-MISSIONS.md, approved by the user 2026-10-27).
// - Chapter 1: five LESSONS, in order, each one new thing by doing; they reveal the hub's tiles.
// - Then each AREA has a ladder: tier 1 (try it), tier 2 (combine it), tier 3 (the crossing trial, 3 starred = the
//   gate). Any 3 of a tier open the next, so one hard mission never blocks.
// - Missions change with the STAGE of the game (the user): teach (no crossing yet), challenge (1-2 crossings),
//   mastery (3+). The same templates, harder numbers.
// - Two kinds of check: `flight(r, save, f)` on the banked flight, and `save(save, f)` on SAVE EVENTS (a purchase, a
//   project): an off-flight mission completes the moment the save changes, no flight needed (the user).
// Pure: no DOM, no random. The game (src/sim/rules.js at banking, the shop after a purchase) and the sim call it.
// Done ids live in save.missionsDone ('L1'..'L5', '<area>:<template>'); prizes go to save.unclaimed (src/rewards.js).
import { AREAS, areaOf, DEFAULT_AREA } from './areas.js';
import { projectsDone, biodiversity, regionSpecies, canAppear } from './nature.js';
import { landTrees } from './landtrees.js';
import { REGION_DATA, REGION_NAMES, TIERS } from './habitats.js';
import { city } from './route.js';
import { fleetOf } from './fleet.js';

// A season 2 save: save.areas is written only by season 2 (the start choice, src/startchoice.js, and crossings), so it is
// the declared marker; classic saves keep the 13 classic missions (src/missions.js) for the classic tests.
export const isSeason2 = save => Array.isArray(save.areas) && save.areas.length > 0;
const done = save => new Set(save.missionsDone || []);
const area = save => areaOf(save.city) || (save.homeArea || DEFAULT_AREA);
// The land "here" missions mean: the land of the city you are in, if it is in this area; else the area's start city's.
const landOf = (save, a) => { const c = city(areaOf(save.city) === a ? save.city : (AREAS[a] || {}).start); return (c && c.region) || 'woodland'; };

// ---------- stage ----------
// Crossings flown = areas opened beyond the first. (Eras add more later: the goal stage comes with the boss, M4.)
export function stageOf(save, a = null) {
  // Before any crossing: 'teach' (the lessons, the home area). After: each AREA has its own stage (the user, 2026-10-27:
  // a new area reached after 2 crossings started at mastery with no nature built there). An area starts at 'challenge'
  // and becomes 'mastery' once its crossing gate (any 2 of its 3 stars) is done in it. With no area given: the global
  // teach-or-not answer (lessons, reveals).
  const crossings = Math.max(0, (save.areas || []).length - 1);
  if (crossings === 0) return 'teach';
  if (!a) return 'challenge';
  return gateDone(save, a) ? 'mastery' : 'challenge';
}
const HARDER = { teach: 1, challenge: 2, mastery: 3 };   // numbers scale with the stage

// ---------- chapter 1: lessons ----------
export const LESSONS = [
  { id: 'L1', title: 'Land at the next airport', reveals: ['hangar', 'missions'], prize: { seeds: 60, crystals: 1 }, flight: r => r.landed },
  { id: 'L2', title: 'Fly through icy air in daytime', reveals: ['nature'], prize: { seeds: 60, crystals: 1 }, flight: r => r.sunBlocked >= 3 },
  // L3 teaches night contrails by ONE dodge (the user's audit pick, 2026-10-27): a whole clean night (nightOwl) blocked
  // weaker pilots for many flights while lessons were the only thing offered; it stays a tier-3 star, not a lesson.
  { id: 'L3', title: 'Dodge an icy patch at night', reveals: [], prize: { seeds: 70, crystals: 1 }, flight: r => (r.dodges || 0) >= 1 },
  { id: 'L4', title: 'Skip one airport, land at the next', reveals: ['world'], prize: { seeds: 70, crystals: 1 }, flight: r => r.landed && r.airportsSkipped >= 1 },
  { id: 'L5', title: 'Drop a tree on brown soil', reveals: [], prize: { seeds: 70, crystals: 2 }, flight: r => r.planted >= 1 },
];
export const lessonsLeft = save => (stageOf(save) === 'teach' ? LESSONS.filter(l => !done(save).has(l.id)) : []);
// A free part waiting ALWAYS reveals the hangar (the user, 2026-10-27, twice: the school landing grants it, but lesson L1
// - which used to be the only thing revealing the hangar - ignores school flights, and a crash on flight 1 leaves it undone).
export const revealed = (save, tile) => stageOf(save) !== 'teach' || (tile === 'hangar' && !!(save.freeUpgrade || save.freeGiven)) || (tile === 'boards' && (save.landings || 0) >= 3)   // once given, it stays (a crash on flight 1 hid it again: firsthour-real.cjs)
  || LESSONS.some(l => l.reveals.includes(tile) && done(save).has(l.id));

// ---------- the area ladder (templates; f = the fill for this area and stage) ----------
// Prizes: seeds only (crystals stay a skill reward), ~700 per area in the teach stage, x the stage factor.
export const TEMPLATES = [
  // tier 1: try it (one mechanic each)
  { id: 'land-city', tier: 1, prize: 30, title: f => `Land at ${f.city}`, flight: (r, s, f) => r.landedAt === f.city },
  { id: 'shade', tier: 1, prize: 30, title: f => `Shade the Earth ${5 * f.k} times here`, flight: (r, s, f) => f.here && r.sunBlocked >= 5 * f.k },
  { id: 'plant-tree', tier: 1, prize: 30, title: f => `Plant a ${f.treeName} in ${f.landName}`, flight: (r, s, f) => (r.treeIds || []).includes(f.treeTag) },
  { id: 'clean-gaps', tier: 1, prize: 30, title: f => `Fly ${3 * f.k} storm gaps without a scrape`, flight: (r, s, f) => (r.cleanGaps || 0) >= 3 * f.k },
  { id: 'bring', tier: 1, prize: 30, title: f => `Bring home ${10 * f.k} seeds`, flight: (r, s, f) => r.cargo >= 10 * f.k },
  { id: 'project', tier: 1, prize: 30, kind: 'save', title: () => 'Fund a nature project here', save: (s, f) => projectsDone(s, f.land).length >= 1 },
  // tier 2: combine it
  { id: 'chain', tier: 2, prize: 50, title: f => `Land at ${f.city}, then ${f.cityB}`, flight: (r, s, f) => r.landedAt === f.cityB && s.prevLanded === f.city },
  { id: 'dodge', tier: 2, prize: 50, title: f => `Dodge ${3 * f.k} icy patches at night`, flight: (r, s, f) => (r.dodges || 0) >= 3 * f.k },
  { id: 'rescue', tier: 2, prize: 50, title: f => `Plant ${2 * f.k} trees, then land at ${f.cityB}`, flight: (r, s, f) => r.planted >= 2 * f.k && r.landedAt === f.cityB },
  { id: 'spot', tier: 2, prize: 50, ready: f => !!f.animal, title: f => `Spot a ${f.animalName} from the air`, flight: (r, s, f) => !!f.animal && (r.foundIds || []).includes(f.animal) },   // offered once an animal CAN appear here
  { id: 'hazard', tier: 2, prize: 50, title: f => HAZARD[f.stage].title, flight: (r, s, f) => HAZARD[f.stage].check(r) },
  { id: 'system', tier: 2, prize: 50, kind: 'save', title: f => `Buy a helper system (level ${f.k})`, save: (s, f) => Object.values(fleetOf(s).systems || {}).some(v => v >= f.k) },
  // tier 3: the crossing trial (star = the gate)
  { id: 'night', tier: 3, star: true, prize: 60, title: f => `A whole night with no contrail over ${f.landName}`, flight: (r, s, f) => f.here && r.nightOwl },
  { id: 'shade10', tier: 3, star: true, prize: 60, title: f => `Make ${10 * f.k} shade and land`, flight: (r, s, f) => f.here && r.sunBlocked >= 10 * f.k },
  { id: 'kinds3', tier: 3, star: true, prize: 60, title: f => `Plant 3 kinds of ${f.landName} tree in one flight`, flight: (r, s, f) => f.here && kindsOf(r, f.land) >= 3 },
  { id: 'route', tier: 3, prize: 40, title: f => `Fly to ${f.cityC} without stopping`, flight: (r, s, f) => r.landedAt === f.cityC && r.airportsSkipped >= 1 },
  { id: 'golden', tier: 3, prize: 40, title: () => 'Find a golden seed and land', flight: (r, s, f) => (r.goldens || 0) >= 1 },
  { id: 'tier', tier: 3, prize: 40, kind: 'save', title: () => 'Finish a tier of nature projects here', save: (s, f) => tierFinished(s, f.land) },
];
// The hazard each stage meets (turbulence from 2,000 km; no-fly zones from 8,000 km; long clean runs for masters).
const HAZARD = {
  teach: { title: 'Ride out the turbulence and land', check: r => (r.bumped || 0) >= 1 },
  challenge: { title: 'Thread 2 no-fly zones and land', check: r => (r.noFlyPassed || 0) >= 2 },
  mastery: { title: 'Fly 10 storm gaps in a row without a scrape', check: r => (r.cleanGaps || 0) >= 10 },
};
// Distinct trees of ONE land planted this flight, from r.treeIds ('land:id'; the UK's are bare ids).
const kindsOf = (r, land) => new Set((r.treeIds || []).filter(t => (land === 'woodland' ? !t.includes(':') : t.startsWith(`${land}:`)))).size;
export const STARS = TEMPLATES.filter(t => t.star).map(t => t.id);

function tierFinished(save, land) {
  const P = (REGION_DATA[land] || {}).projects || [], have = projectsDone(save, land).map(p => p.id);
  return TIERS.some(t => { const ps = P.filter(p => p.tier === t.tier); return ps.length && ps.every(p => have.includes(p.id)); });
}

// The fill: real names of this area, and the stage's numbers. `here` = the flight started in this area.
export function fillFor(save, a, startCity = save.city) {
  const k = HARDER[stageOf(save, a)], land = landOf(save, a), cities = (AREAS[a] && AREAS[a].cities) || [];
  const city = cities.find(c => c !== (save.homeCity || AREAS[a].start) && !(save.visited || []).includes(c)) || cities[1] || cities[0];
  const landName = (REGION_NAMES[land] || 'this land').replace(/^Temperate /, '');
  const others = cities.filter(c => c !== city);
  const trees = landTrees(save, land), open = trees.filter(t => t.open), tree = open[open.length - 1] || trees[0];
  const treeTag = tree ? (land === 'woodland' ? tree.id : `${land}:${tree.id}`) : '';
  const found = save.found || {}, wild = regionSpecies(land).filter(w => w.sprite && !found[w.id] && !['cow', 'sheep'].includes(w.id));
  const animal = wild.find(w => canAppear(save, w.id, land)) || null;
  return { area: a, land, landName, city, cityB: others[0] || city, cityC: others[others.length - 1] || city, k, stage: stageOf(save, a),
    here: areaOf(startCity) === a, treeName: tree ? tree.name : 'tree', treeTag, animal: animal && animal.id, animalName: animal ? animal.name : 'wild animal' };
}
const key = (a, t) => `${a}:${t.id}`;
export const tierOpen = (save, a, tier) => tier === 1 || TEMPLATES.filter(t => t.tier === tier - 1 && done(save).has(key(a, t))).length >= 3;
// The crossing gate: ANY 2 of the 3 starred missions (the user, 2026-10-27: the sim found the night star blocked weaker
// pilots; all 3 are still there to do). GATE_STARS is the number needed.
export const GATE_STARS = 2;
export const starsDone = (save, a) => STARS.filter(id => done(save).has(`${a}:${id}`)).length;
export const gateDone = (save, a) => starsDone(save, a) >= GATE_STARS;

// What the player sees: the next lesson while any are left, else the open tiers of the area they are in, undone first.
// [{ key, title, tier, star, kind, prize: { seeds, crystals } }]
export function visible(save, startCity = save.city) {
  const left = lessonsLeft(save);
  if (left.length) { const l = left[0]; return [{ key: l.id, title: l.title, tier: 0, star: false, kind: 'flight', prize: l.prize, def: l }]; }
  const a = areaOf(startCity) || area(save), f = fillFor(save, a, startCity);
  return TEMPLATES.filter(t => tierOpen(save, a, t.tier) && !done(save).has(key(a, t)) && (!t.ready || t.ready(f))).map(t => ({
    key: key(a, t), title: t.title(f), tier: t.tier, star: !!t.star, kind: t.kind || 'flight',
    prize: { seeds: t.prize * f.k, crystals: 0 }, def: t, fill: f }));
}
export const next = save => visible(save)[0] || null;

function finish(save, list) {
  save.missionsDone = [...new Set([...(save.missionsDone || []), ...list.map(m => m.key)])];
  save.unclaimed = save.unclaimed || [];
  for (const m of list) if (!save.unclaimed.some(u => u.key === `mission:${m.key}`)) save.unclaimed.push({ key: `mission:${m.key}`, kind: 'mission', id: m.key, label: m.title, ...m.prize });
  return list;
}
// After a flight is banked (r = the flight result; save.city is still the START city). Firsts can come from any flight
// (a crash too: "Birds 1, plane 0"); missions and the daily trio need a landing (PROPOSAL-12).
export function onFlight(save, r) {
  if (!r || r.school) return [];
  const firsts = FIRSTS.filter(x => !done(save).has(`first:${x.id}`) && x.when(r)).map(x => ({ key: `first:${x.id}`, title: x.title, prize: { seeds: 0, crystals: 1 } }));
  // The rails never stall (Coordinator, 2026-10-27): lesson L2 missed on 2 flights (landed or not) -> it counts as taught, NATURE opens.
  const l2 = (lessonsLeft(save)[0] || {}).id === 'L2', L2 = LESSONS.find(l => l.id === 'L2');
  const taught = got => { if (!l2 || got.some(m => m.key === 'L2')) return got; save.l2Misses = (save.l2Misses || 0) + 1;
    return save.l2Misses >= 2 ? [...got, { key: 'L2', title: L2.title, tier: 0, star: false, kind: 'flight', prize: L2.prize, def: L2, taught: true }] : got; };
  if (!r.landed) return finish(save, taught(firsts));
  const startCity = save.city;
  const due = visible(save, startCity).filter(m => m.kind === 'flight' && (m.def.flight(r, save, m.fill) === true));
  const daily = dailyVisible(save).filter(d => d.def.flight(r, save, d.fill) === true);
  save.prevLanded = r.landedAt;   // for "land at A, then B" (read on the NEXT flight)
  return finish(save, taught([...firsts, ...due, ...daily]));
}

// ---------- Firsts: one-off funny cards (1 crystal), never in the list; they pop on the results ----------
export const FIRSTS = [
  { id: 'bird', title: 'Birds 1, plane 0. Fly over or under them next time!', when: r => r.crash === 'bird' },
  { id: 'storm', title: 'Bumped a storm cloud! Aim for the middle of the gap.', when: r => r.crash === 'storm' },
  { id: 'nofly', title: 'Told off! No-fly zones mean no flying, even a wingtip.', when: r => r.crash === 'nofly' },
  { id: 'golden', title: 'Your first golden seed: lucky pilot!', when: r => (r.goldens || 0) >= 1 },
  { id: 'skip3', title: 'Three airports skipped in one go: bold pilot!', when: r => r.landed && r.airportsSkipped >= 3 },
];

// ---------- the daily trio: three small missions a real day, from the area you are in ----------
// The DATE stays out of the rules (they run in the sim, no clock): the menu calls setDaily(save, 'YYYY-MM-DD') and the
// rules check save.daily. Picked from a small easy pool by the date, so every player gets the same three on a day.
export const DAILY_POOL = [
  { id: 'd-seeds', prize: 15, title: f => `Bring home ${8 * f.k} seeds`, flight: (r, s, f) => r.cargo >= 8 * f.k },
  { id: 'd-shade', prize: 10, title: f => `Shade the Earth ${3 * f.k} times`, flight: (r, s, f) => r.sunBlocked >= 3 * f.k },
  { id: 'd-gaps', prize: 15, title: f => `Fly ${5 * f.k} clean storm gaps`, flight: (r, s, f) => (r.cleanGaps || 0) >= 5 * f.k },
  { id: 'd-skip', prize: 20, title: () => 'Skip an airport, then land', flight: r => r.airportsSkipped >= 1 },
  { id: 'd-plant', prize: 15, title: f => `Plant ${f.k + 1} trees`, flight: (r, s, f) => r.planted >= f.k + 1 },
  { id: 'd-night', prize: 20, title: () => 'Dodge an icy patch at night', flight: r => (r.dodges || 0) >= 1 },
];
const hash = str => [...str].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function setDaily(save, date) {
  if (lessonsLeft(save).length || (save.daily && save.daily.date === date)) return;
  const pool = DAILY_POOL.slice(), pick = [];
  for (let i = 0; i < 3; i++) pick.push(pool.splice(hash(date + i) % pool.length, 1)[0].id);
  save.daily = { date, ids: pick };
}
export function dailyVisible(save) {
  if (!save.daily || lessonsLeft(save).length) return [];
  const f = fillFor(save, areaOf(save.city) || area(save));
  return save.daily.ids.map(id => DAILY_POOL.find(d => d.id === id)).filter(Boolean)
    .map(d => ({ key: `daily:${save.daily.date}:${d.id}`, title: d.title(f), prize: { seeds: d.prize * f.k, crystals: 0 }, def: d, fill: f, daily: true }))
    .filter(d => !done(save).has(d.key));
}

// After anything that changes the save outside a flight (a purchase, a project, a tree opening).
export function onSave(save) {
  if (lessonsLeft(save).length) return [];
  const due = visible(save).filter(m => m.kind === 'save' && m.def.save(save, m.fill) === true);
  return finish(save, due);
}
