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
import { projectsDone, biodiversity } from './nature.js';
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
export function stageOf(save) {
  const crossings = Math.max(0, (save.areas || []).length - 1);
  return crossings === 0 ? 'teach' : crossings <= 2 ? 'challenge' : 'mastery';
}
const HARDER = { teach: 1, challenge: 2, mastery: 3 };   // numbers scale with the stage

// ---------- chapter 1: lessons ----------
export const LESSONS = [
  { id: 'L1', title: 'Land at the next airport', reveals: ['hangar', 'missions'], prize: { seeds: 60, crystals: 1 }, flight: r => r.landed },
  { id: 'L2', title: 'Fly through icy air in daytime', reveals: ['nature'], prize: { seeds: 60, crystals: 1 }, flight: r => r.sunBlocked >= 3 },
  { id: 'L3', title: "Keep tonight's sky contrail-free", reveals: [], prize: { seeds: 70, crystals: 1 }, flight: r => r.nightOwl },
  { id: 'L4', title: 'Skip one airport, land at the next', reveals: ['world'], prize: { seeds: 70, crystals: 1 }, flight: r => r.landed && r.airportsSkipped >= 1 },
  { id: 'L5', title: 'Drop a tree on brown soil', reveals: [], prize: { seeds: 70, crystals: 2 }, flight: r => r.planted >= 1 },
];
export const lessonsLeft = save => (stageOf(save) === 'teach' ? LESSONS.filter(l => !done(save).has(l.id)) : []);
export const revealed = (save, tile) => stageOf(save) !== 'teach' || LESSONS.some(l => l.reveals.includes(tile) && done(save).has(l.id));

// ---------- the area ladder (templates; f = the fill for this area and stage) ----------
// Prizes: seeds only (crystals stay a skill reward), ~700 per area in the teach stage, x the stage factor.
export const TEMPLATES = [
  // tier 1: try it
  { id: 'land-city', tier: 1, prize: 30, title: f => `Land at ${f.city}`, flight: (r, s, f) => r.landed && r.landedAt === f.city },
  { id: 'shade', tier: 1, prize: 30, title: f => `Shade the Earth ${5 * f.k} times here`, flight: (r, s, f) => f.here && r.sunBlocked >= 5 * f.k },
  { id: 'plant', tier: 1, prize: 30, title: f => `Plant ${2 * f.k} trees in one flight`, flight: (r, s, f) => r.planted >= 2 * f.k },
  { id: 'bring', tier: 1, prize: 30, title: f => `Bring home ${10 * f.k} seeds`, flight: (r, s, f) => r.landed && r.cargo >= 10 * f.k },
  { id: 'project', tier: 1, prize: 30, kind: 'save', title: () => 'Fund a nature project here', save: (s, f) => projectsDone(s, f.land).length >= 1 },
  // tier 2: combine it
  { id: 'dodge', tier: 2, prize: 50, title: f => `Dodge ${3 * f.k} icy patches at night`, flight: (r, s, f) => (r.dodges || 0) >= 3 * f.k },
  { id: 'skip2', tier: 2, prize: 50, title: f => `Skip ${1 + f.k} airports, then land`, flight: (r, s, f) => r.landed && r.airportsSkipped >= 1 + f.k },
  { id: 'system', tier: 2, prize: 50, kind: 'save', title: f => `Buy a helper system (level ${f.k})`, save: (s, f) => Object.values(fleetOf(s).systems || {}).some(v => v >= f.k) },
  { id: 'rich', tier: 2, prize: 50, title: f => `Land with ${20 * f.k} seeds`, flight: (r, s, f) => r.landed && r.cargo >= 20 * f.k },
  { id: 'bumpy', tier: 2, prize: 50, title: () => 'Ride out turbulence and land', flight: (r, s, f) => r.landed && (r.bumped || 0) >= 1 },
  // tier 3: the crossing trial (star = the gate, PROPOSAL-12's trio)
  { id: 'night', tier: 3, star: true, prize: 60, title: f => `A whole night with no contrail over ${f.landName}`, flight: (r, s, f) => f.here && r.nightOwl },
  { id: 'shade10', tier: 3, star: true, prize: 60, title: f => `Make ${10 * f.k} shade and land`, flight: (r, s, f) => f.here && r.landed && r.sunBlocked >= 10 * f.k },
  { id: 'kinds3', tier: 3, star: true, prize: 60, title: f => `Plant 3 kinds of ${f.landName} tree in one flight`, flight: (r, s, f) => f.here && r.kinds >= 3 },   // S4: per-land, from r.treeIds
  { id: 'golden', tier: 3, prize: 40, title: () => 'Find a golden seed and land', flight: (r, s, f) => r.landed && (r.goldens || 0) >= 1 },
  { id: 'tier', tier: 3, prize: 40, kind: 'save', title: () => 'Finish a tier of nature projects here', save: (s, f) => tierFinished(s, f.land) },
];
export const STARS = TEMPLATES.filter(t => t.star).map(t => t.id);

function tierFinished(save, land) {
  const P = (REGION_DATA[land] || {}).projects || [], have = projectsDone(save, land).map(p => p.id);
  return TIERS.some(t => { const ps = P.filter(p => p.tier === t.tier); return ps.length && ps.every(p => have.includes(p.id)); });
}

// The fill: real names of this area, and the stage's numbers. `here` = the flight started in this area.
export function fillFor(save, a, startCity = save.city) {
  const k = HARDER[stageOf(save)], land = landOf(save, a), cities = (AREAS[a] && AREAS[a].cities) || [];
  const city = cities.find(c => c !== (save.homeCity || AREAS[a].start) && !(save.visited || []).includes(c)) || cities[1] || cities[0];
  const landName = (REGION_NAMES[land] || 'this land').replace(/^Temperate /, '');
  return { area: a, land, landName, city, k, here: areaOf(startCity) === a };
}
const key = (a, t) => `${a}:${t.id}`;
export const tierOpen = (save, a, tier) => tier === 1 || TEMPLATES.filter(t => t.tier === tier - 1 && done(save).has(key(a, t))).length >= 3;
export const gateDone = (save, a) => STARS.every(id => done(save).has(`${a}:${id}`));

// What the player sees: the next lesson while any are left, else the open tiers of the area they are in, undone first.
// [{ key, title, tier, star, kind, prize: { seeds, crystals } }]
export function visible(save, startCity = save.city) {
  const left = lessonsLeft(save);
  if (left.length) { const l = left[0]; return [{ key: l.id, title: l.title, tier: 0, star: false, kind: 'flight', prize: l.prize, def: l }]; }
  const a = areaOf(startCity) || area(save), f = fillFor(save, a, startCity);
  return TEMPLATES.filter(t => tierOpen(save, a, t.tier) && !done(save).has(key(a, t))).map(t => ({
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
// After a flight is banked (r = the flight result; save.city is still the START city). A crash completes nothing.
export function onFlight(save, r) {
  if (!r || r.school || !r.landed) return [];   // a crash completes nothing (PROPOSAL-12): every flight mission needs a landing
  const startCity = save.city;
  const due = visible(save, startCity).filter(m => m.kind === 'flight' && (m.def.flight(r, save, m.fill) === true));
  return finish(save, due);
}
// After anything that changes the save outside a flight (a purchase, a project, a tree opening).
export function onSave(save) {
  if (lessonsLeft(save).length) return [];
  const due = visible(save).filter(m => m.kind === 'save' && m.def.save(save, m.fill) === true);
  return finish(save, due);
}
