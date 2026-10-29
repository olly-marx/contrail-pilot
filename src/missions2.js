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
import { LINES, nextLevel, unlocked, needsMoreNature } from './upgrades.js';

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
  { id: 'L1', title: 'Land at the next airport', reveals: ['hangar', 'missions'], prize: { seeds: 20, crystals: 1 }, flight: r => r.landed },
  { id: 'L2', title: 'Fly through icy air in daytime', reveals: ['nature'], prize: { seeds: 20, crystals: 1 }, flight: r => r.sunBlocked >= 3 },
  // L3 teaches night contrails by ONE dodge (the user's audit pick, 2026-10-27): a whole clean night (nightOwl) blocked
  // weaker pilots for many flights while lessons were the only thing offered; it stays a tier-3 star, not a lesson.
  { id: 'L3', title: 'Dodge an icy patch at night', reveals: [], prize: { seeds: 25, crystals: 1 }, flight: r => (r.dodges || 0) >= 1 },
  { id: 'L4', title: 'Skip one airport, land at the next', reveals: ['world'], prize: { seeds: 25, crystals: 1 }, flight: r => r.landed && r.airportsSkipped >= 1 },
  { id: 'L5', title: 'Drop a tree on brown soil', reveals: [], prize: { seeds: 25, crystals: 2 }, flight: r => r.planted >= 1 },
];
export const lessonsLeft = save => (stageOf(save) === 'teach' ? LESSONS.filter(l => !done(save).has(l.id)) : []);
// A free part waiting ALWAYS reveals the hangar (the user, 2026-10-27, twice: the school landing grants it, but lesson L1
// - which used to be the only thing revealing the hangar - ignores school flights, and a crash on flight 1 leaves it undone).
export const revealed = (save, tile) => stageOf(save) !== 'teach' || (tile === 'hangar' && !!(save.freeUpgrade || save.freeGiven)) || (tile === 'boards' && (save.landings || 0) >= 3)   // once given, it stays (a crash on flight 1 hid it again: firsthour-real.cjs)
  || LESSONS.some(l => l.reveals.includes(tile) && done(save).has(l.id));

// Seed prizes x~0.33 on 2026-10-28 (the user: too much currency early; research/BALANCE-EARLY-PRIZES.md): lessons were
// 60/60/70/70/70, tiers 30/50/60/40. Crystal prizes unchanged.
// ---------- the area ladder (templates; f = the fill for this area and stage) ----------
// Prizes: seeds only (crystals stay a skill reward), ~700 per area in the teach stage, x the stage factor.
export const TEMPLATES = [
  // tier 1: try it (one mechanic each)
  { id: 'land-city', tier: 1, prize: 10, title: f => `Land at ${f.city}`, flight: (r, s, f) => r.landedAt === f.city },
  { id: 'shade', tier: 1, prize: 10, title: f => `Shade the Earth ${5 * f.k} times here`, flight: (r, s, f) => f.here && r.sunBlocked >= 5 * f.k },
  { id: 'plant-tree', tier: 1, prize: 10, title: f => `Plant a ${f.treeName} in ${f.landName}`, flight: (r, s, f) => (r.treeIds || []).includes(f.treeTag) },
  { id: 'clean-gaps', tier: 1, prize: 10, title: f => `Fly ${3 * f.k} storm gaps without a scrape`, flight: (r, s, f) => (r.cleanGaps || 0) >= 3 * f.k },
  { id: 'bring', tier: 1, prize: 10, title: f => `Bring home ${10 * f.k} seeds`, flight: (r, s, f) => r.cargo >= 10 * f.k },
  { id: 'project', tier: 1, prize: 10, kind: 'save', title: () => 'Fund a nature project here', save: (s, f) => projectsDone(s, f.land).length >= 1 },
  // tier 2: combine it
  { id: 'chain', tier: 2, prize: 15, title: f => `Land at ${f.city}, then ${f.cityB}`, flight: (r, s, f) => r.landedAt === f.cityB && s.prevLanded === f.city },
  { id: 'dodge', tier: 2, prize: 15, title: f => `Dodge ${3 * f.k} icy patches at night`, flight: (r, s, f) => (r.dodges || 0) >= 3 * f.k },
  { id: 'rescue', tier: 2, prize: 15, title: f => `Plant ${2 * f.k} trees, then land at ${f.cityB}`, flight: (r, s, f) => r.planted >= 2 * f.k && r.landedAt === f.cityB },
  { id: 'spot', tier: 2, prize: 15, ready: f => !!f.animal, title: f => `Spot a ${f.animalName} from the air`, flight: (r, s, f) => !!f.animal && (r.foundIds || []).includes(f.animal) },   // offered once an animal CAN appear here
  { id: 'hazard', tier: 2, prize: 15, title: f => HAZARD[f.stage].title, flight: (r, s, f) => HAZARD[f.stage].check(r) },
  { id: 'system', tier: 2, prize: 15, kind: 'save', title: f => `Buy a helper system (level ${f.k})`, save: (s, f) => Object.values(fleetOf(s).systems || {}).some(v => v >= f.k) },
  // tier 3: the crossing trial (star = the gate)
  { id: 'night', tier: 3, star: true, prize: 20, title: f => `A whole night with no contrail over ${f.landName}`, flight: (r, s, f) => f.here && r.nightOwl },
  { id: 'shade10', tier: 3, star: true, prize: 20, title: f => `Make ${10 * f.k} shade and land`, flight: (r, s, f) => f.here && r.sunBlocked >= 10 * f.k },
  { id: 'kinds3', tier: 3, star: true, prize: 20, title: f => `Plant ${f.kinds} kinds of ${f.landName} tree in one flight`, flight: (r, s, f) => f.here && kindsOf(r, f.land) >= f.kinds },   // f.kinds: the kinds OPEN in that land, 2..3 (2026-10-28: a land plateauing below biodiversity 20 has only 2, so a fixed 3 was impossible)
  { id: 'route', tier: 3, prize: 15, title: f => `Fly to ${f.cityC} without stopping`, flight: (r, s, f) => r.landedAt === f.cityC && r.airportsSkipped >= 1 },
  { id: 'golden', tier: 3, prize: 15, title: () => 'Find a golden seed and land', flight: (r, s, f) => (r.goldens || 0) >= 1 },
  { id: 'tier', tier: 3, prize: 15, kind: 'save', title: () => 'Finish a tier of nature projects here', save: (s, f) => tierFinished(s, f.land) },
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
  const home = save.homeCity || (AREAS[a] && AREAS[a].start), others = cities.filter(c => c !== city && c !== home);   // not the home city (the audit: '...then MANAUS' for a Manaus start)
  const trees = landTrees(save, land), open = trees.filter(t => t.open), tree = open[open.length - 1] || trees[0];
  const kinds = Math.max(2, Math.min(3, open.length));   // the '3 kinds' star asks for what this land can grow now (at least 2)
  const treeTag = tree ? (land === 'woodland' ? tree.id : `${land}:${tree.id}`) : '';
  const found = save.found || {}, wild = regionSpecies(land).filter(w => w.sprite && !found[w.id] && !['cow', 'sheep'].includes(w.id));
  const animal = wild.find(w => canAppear(save, w.id, land)) || null;
  return { area: a, land, landName, city, cityB: others[0] || city, cityC: others[others.length - 1] || city, k, stage: stageOf(save, a),
    here: areaOf(startCity) === a, treeName: tree ? tree.name : 'tree', treeTag, kinds, animal: animal && animal.id, animalName: animal ? animal.name : 'wild animal' };
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
  // Lifetime totals for the cumulative badges (src/badges.js distance/collector/threader; crashes count). Counted here, not in
  // rewards.js, because only this call gets cleanGaps; it runs before addPrizes in the same flight (src/sim/rules.js).
  const tot = save.totals = save.totals || { km: 0, seeds: 0, gaps: 0 };
  tot.km += r.distance || 0; tot.seeds += Math.max(0, r.cargo || 0); tot.gaps += r.cleanGaps || 0;
  const firsts = FIRSTS.filter(x => !done(save).has(`first:${x.id}`) && x.when(r)).map(x => ({ key: `first:${x.id}`, title: x.title, prize: { seeds: 0, crystals: 1 } }));
  // The rails never stall (the user, 2026-10-28; L2 first on 2026-10-27): any lesson after L1 missed on 2 flights (landed
  // or not) counts as taught. A per-lesson count (save.lessonMisses; the old save.l2Misses is carried over). L5 counts a
  // miss only once tree parcels are owned (before that the flight could not try it).
  const cur = lessonsLeft(save)[0];
  const taught = got => {
    if (!cur || cur.id === 'L1' || got.some(m => m.key === cur.id)) return got;
    if (cur.id === 'L5' && !((save.levels || {}).trees > 0)) return got;
    const lm = save.lessonMisses = save.lessonMisses || {};
    if (cur.id === 'L2' && save.l2Misses) lm.L2 = Math.max(lm.L2 || 0, save.l2Misses);
    lm[cur.id] = (lm[cur.id] || 0) + 1;
    return lm[cur.id] >= 2 ? [...got, { key: cur.id, title: cur.title, tier: 0, star: false, kind: 'flight', prize: cur.prize, def: cur, taught: true }] : got; };
  const steady = steadyTick(save, r);
  const easyDaily = dailyVisible(save).filter(d => d.easy && d.def.flight(r, save, d.fill) === true);
  if (!r.landed) return finish(save, taught([...firsts, ...steady, ...easyDaily]));
  const startCity = save.city;
  const due = visible(save, startCity).filter(m => m.kind === 'flight' && (m.def.flight(r, save, m.fill) === true));
  const daily = dailyVisible(save).filter(d => d.def.flight(r, save, d.fill) === true);
  save.prevLanded = r.landedAt;   // for "land at A, then B" (read on the NEXT flight)
  return finish(save, taught([...firsts, ...steady, ...due, ...daily]));
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
// The daily trio starts AFTER lesson L3, alongside the remaining lessons (the user, 2026-10-29: beginners ran out of things
// to do). Slot A is always EASY and any flight counts, a crash too; slots B and C come from the pool. A STREAK of days with at
// least one daily done adds +2 seeds to each daily prize, up to +10; a missed day halves it (kind to children).
export const DAILY_EASY = [
  { id: 'e-km', prize: 10, easy: true, title: () => 'Fly 1,000 km (a crash counts too)', flight: r => (r.distance || 0) >= 1000 },
  { id: 'e-seeds', prize: 10, easy: true, title: () => 'Pick up 8 seeds in the sky', flight: r => (r.cargo || 0) >= 8 },
  { id: 'e-gaps', prize: 10, easy: true, title: () => 'Pass 4 storm gaps', flight: r => (r.cleanGaps || 0) >= 4 },
];
const dailiesOpen = save => isSeason2(save) && done(save).has('L3');
const dailyDef = id => DAILY_POOL.find(d => d.id === id) || DAILY_EASY.find(d => d.id === id);
// NEED-BASED pay (the sim's c), round 3, 2026-10-29): the steady prizes and the streak bonus pay in full only while the bank is
// below the cheapest upgrade on sale (free ones aside). A rich pilot gets 1 seed a rung and no streak bonus, so the new prizes
// help the beginner who is saving up and barely feed the expert, whose bank is far above the next purchase.
export function saving(save) {
  const costs = LINES.filter(l => unlocked(save, l) && !needsMoreNature(save, l)).map(l => nextLevel(save, l)).filter(n => n && n.cost > 0).map(n => n.cost);
  return !costs.length || (save.seeds || 0) < Math.min(...costs);
}
export const streakBonus = save => (saving(save) ? Math.min(5, (save.dailyStreak || {}).days || 0) : 0);   // +1 a day, up to +5 (was +2 to +10: the sim's c), 2026-10-29)
export function setDaily(save, date) {
  if (!dailiesOpen(save) || (save.daily && save.daily.date === date)) return;
  // The streak: the old day counts if any of its dailies was done; a gap of more than a day halves it.
  const st = save.dailyStreak = save.dailyStreak || { days: 0, last: null };
  if (save.daily && save.daily.date !== date) {
    const didOld = save.daily.ids.some(id => done(save).has(`daily:${save.daily.date}:${id}`));
    const gap = Math.round((Date.parse(date) - Date.parse(save.daily.date)) / 86400000);
    st.days = didOld && gap === 1 ? st.days + 1 : Math.floor(st.days / 2) + (didOld ? 1 : 0);
  }
  const easy = DAILY_EASY[hash(date + 'e') % DAILY_EASY.length].id;
  const pool = DAILY_POOL.slice(), pick = [easy];
  for (let i = 0; i < 2; i++) pick.push(pool.splice(hash(date + i) % pool.length, 1)[0].id);
  save.daily = { date, ids: pick };
}
export function dailyVisible(save) {
  if (!save.daily || !dailiesOpen(save)) return [];
  const f = fillFor(save, areaOf(save.city) || area(save)), bonus = streakBonus(save);
  return save.daily.ids.map(dailyDef).filter(Boolean)
    .map(d => ({ key: `daily:${save.daily.date}:${d.id}`, title: d.title(f), prize: { seeds: d.prize * f.k + bonus, crystals: 0 }, def: d, fill: f, daily: true, easy: !!d.easy }))
    .filter(d => !done(save).has(d.key));
}

// ---------- (1) the STEADY lane (the user, 2026-10-29): cumulative goals with progress bars, crashes count ----------
// Two per area are always on show after L3; each is a LADDER (done: the next rung at x1.5, the same prize). Steady goals do
// NOT count toward opening the next tier (tierOpen reads TEMPLATES keys only), so good players' pace is unchanged.
export const STEADY = [
  { id: 'st-km', base: 2000, prize: 5, title: (t, f) => `Fly ${t.toLocaleString('en')} km in ${AREAS[f.area] ? AREAS[f.area].name : 'this area'}`, add: r => Math.round(r.distance || 0) },
  { id: 'st-seeds', base: 20, prize: 5, title: t => `Pick up ${t} seeds in the sky`, add: r => r.cargo || 0 },
  { id: 'st-gaps', base: 10, prize: 5, title: t => `Fly through ${t} storm gaps`, add: r => r.cleanGaps || 0 },
  { id: 'st-land', base: 2, prize: 5, title: (t, f) => `Land ${t} times in ${AREAS[f.area] ? AREAS[f.area].name : 'this area'}`, add: r => (r.landed ? 1 : 0) },
  { id: 'st-plant', base: 5, prize: 5, ready: s => ((s.levels || {}).trees || 0) > 0, title: (t, f) => `Plant ${t} trees in ${f.landName}`, add: r => r.planted || 0 },
];
const steadyOf = (save, a) => ((save.steady = save.steady || {})[a] = save.steady[a] || {});
export const rungTarget = (d, rung) => Math.round(d.base * Math.pow(1.25, rung));
export function steadyVisible(save, a = area(save)) {
  if (!dailiesOpen(save) || !AREAS[a]) return [];
  const st = steadyOf(save, a), f = fillFor(save, a), ready = STEADY.filter(d => !d.ready || d.ready(save));
  const turn = Object.values(st).reduce((n, x) => n + (x.rung || 0), 0);
  return [0, 1].map(i => ready[(turn + i) % ready.length]).filter((d, i, arr) => d && arr.indexOf(d) === i).map(d => {
    const x = st[d.id] || { rung: 0, n: 0 }, target = rungTarget(d, x.rung);
    return { key: `steady:${a}:${d.id}:${x.rung}`, title: d.title(target, f), target, progress: Math.min(target, x.n), prize: { seeds: !saving(save) ? 1 : x.rung < 2 ? d.prize : 3, crystals: 0 }, def: d, steady: true };
  });
}
// After every banked flight (landed or not): add to the steady goals on show in the flight's start area; full ones pay.
function steadyTick(save, r) {
  const a = areaOf(save.city); if (!a) return [];
  const st = steadyOf(save, a), out = [];
  for (const v of steadyVisible(save, a)) {
    const x = st[v.def.id] = st[v.def.id] || { rung: 0, n: 0 };
    x.n += v.def.add(r);
    if (x.n >= v.target) { out.push({ key: v.key, title: v.title, prize: v.prize, steady: true }); x.rung++; x.n = 0; }
  }
  return out;
}

// After anything that changes the save outside a flight (a purchase, a project, a tree opening).
export function onSave(save) {
  if (lessonsLeft(save).length) return [];
  const due = visible(save).filter(m => m.kind === 'save' && m.def.save(save, m.fill) === true);
  return finish(save, due);
}
