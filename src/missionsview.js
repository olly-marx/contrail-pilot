// The MISSIONS screen as DATA (research/UX-MASTER-PLAN.md C3; R4). Pure: no DOM, no clock, no random numbers. src/ui.js showMissions draws it;
// tests/missionsview.cjs holds its budgets and meaning. Rows come from the same sources as HOME and the results: nextUp for the pinned row,
// missions2 for the rest, so a mission is never worded two ways. Every line is held to the 320 px phone (the pixel font: ~8.2 px a
// character at 8 px, so ~28 characters of a row's second line beside the price column).
import * as M2 from './missions2.js';
import { AREAS, areaOf, DEFAULT_AREA } from './areas.js';
import { nextUp, itemOf, clip, rightOf } from './nextup.js';
import { CITY_TEMPLATES } from './aim.js';

export const HOW_MAX = 20;       // a row's second line (the "how"): MEASURED at 320 px, the prize shares it (a 28-character how wrapped every row to 70 px)
export const NAME_MAX = 24;      // a row's name (nextup.SHORT_MAX)
// A 32 px pictogram per mission type (PixelLab, branch mission-icons: assets/ui/mi32-*.png, composed by tools/art/compose_mission_icons.py).
export const ICONS = {
  L1: 'mi32-runway',
  L2: 'mi32-shade',
  L3: 'mi32-moonpatch',
  L4: 'mi32-nonstop',
  L5: 'mi32-sapling',
  'land-city': 'mi32-runway',
  shade: 'mi32-shade',
  'plant-tree': 'mi32-sapling',
  'clean-gaps': 'mi32-stormgap',
  bring: 'mi32-seedbag',
  project: 'mi32-natureproj',
  chain: 'mi32-twopins',
  dodge: 'mi32-moonpatch',
  rescue: 'mi32-shovel',
  spot: 'mi32-binoculars',
  hazard: 'mi32-stormgap',
  system: 'mi32-gear',
  night: 'mi32-moonpatch',
  shade10: 'mi32-shade',
  kinds3: 'mi32-forest',
  route: 'mi32-nonstop',
  golden: 'mi32-goldenseed',
  tier: 'mi32-flag',
  'd-seeds': 'mi32-seedbag',
  'd-shade': 'mi32-shade',
  'd-gaps': 'mi32-stormgap',
  'd-skip': 'mi32-nonstop',
  'd-plant': 'mi32-sapling',
  'd-night': 'mi32-moonpatch',
  'e-km': 'mi32-roadkm',
  'e-seeds': 'mi32-seedbag',
  'e-gaps': 'mi32-stormgap',
  'st-km': 'mi32-roadkm',
  'st-seeds': 'mi32-seedbag',
  'st-gaps': 'mi32-stormgap',
  'st-land': 'mi32-airport',
  'st-plant': 'mi32-sapling',
};
// The one-line "how" under a mission's name (<= 20 characters: the prize shares that line at 320 px) and the longer TIP in its sheet.
export const HOW = {
  shade: 'Icy air by day', 'plant-tree': 'Plant it in flight', 'clean-gaps': 'No scrapes', bring: 'Land with seeds', project: 'In NATURE',
  chain: 'Both, in order', dodge: 'Icy patches, night', rescue: 'Plant, then land', spot: 'Fly over it', system: 'In HANGAR: SYSTEMS',
  night: 'Clean night, land', shade10: 'Shade, then land', kinds3: 'Different trees', route: 'Fly past an airport', golden: 'Grab it, land', tier: 'Finish in NATURE',
  'e-km': 'Crash counts too', 'e-seeds': 'Crash counts too', 'e-gaps': 'Crash counts too',
};
export const TIP = {
  shade: 'Fly through icy air by day to shade the Earth.', 'plant-tree': 'Plant it on your flight, in the right land.', 'clean-gaps': 'Fly through the storm gaps with no scrapes, in one flight.',
  bring: 'Land with the seeds you picked up on board.', project: 'In NATURE, fund any habitat project.', chain: 'Land at both cities, in that order.', dodge: 'On a night flight, steer clear of icy patches.',
  rescue: 'Plant the trees first, then land at the city.', spot: 'Fly over the animal to find it from the air.', system: 'In the HANGAR, open SYSTEMS and buy a helper.', night: 'Land after a whole night with no contrail.',
  shade10: 'Make a lot of shade, then land.', kinds3: 'Plant different kinds of tree in one flight.', route: 'Fly past an airport, and land at the city.', golden: 'Grab a golden seed, then land.', tier: 'Finish every project of a tier in NATURE.',
  'e-km': 'Any flight counts, even a crash.', 'e-seeds': 'Any flight counts, even a crash.', 'e-gaps': 'Any flight counts, even a crash.',
};
const HAZARD_HOW = { teach: 'Fly on, then land', challenge: 'Avoid the red zones', mastery: '10 clean, in a row' };
const DAILY_HOW = 'Today: one flight';   // (17)
// What a finished mission is called in the DONE list (generic: the city or animal of the day is not stored).
export const DONE_NAME = {
  L1: 'Lesson: land', L2: 'Lesson: icy air by day', L3: 'Lesson: a night dodge', L4: 'Lesson: skip an airport', L5: 'Lesson: plant a tree',
  'land-city': 'Landed at a city', shade: 'Shaded the Earth', 'plant-tree': 'Planted a tree', 'clean-gaps': 'Clean storm gaps', bring: 'Brought seeds home', project: 'Funded a project',
  chain: 'Two cities in a row', dodge: 'Dodged icy patches', rescue: 'Planted, then landed', spot: 'Spotted an animal', hazard: 'Flew the hazard', system: 'Bought a system',
  night: 'A clean night', shade10: 'Lots of shade', kinds3: 'Many kinds of tree', route: 'Flew nonstop', golden: 'Found a golden seed', tier: 'Finished a tier',
};
export const INFO = { title: 'How missions work', body: 'Finish any 3 missions of a tier to open the next one. Tier 3 is the crossing trial: do any 2 of its 3 stars to cross to a new area. Daily missions change every day, and steady goals count everything you fly.' };

const keyOf = (a, t) => `${a}:${t.id}`;
const doneSet = save => new Set(save.missionsDone || []);
const areaFor = save => areaOf(save.city) || save.homeArea || DEFAULT_AREA;

export function missionsView(save) {
  const a = areaFor(save), done = doneSet(save), stage = M2.stageOf(save, a), teach = M2.lessonsLeft(save).length > 0;
  const vis = M2.visible(save), up = nextUp(save, { limit: 9 });
  // 1. The head: the area, and where you are in it.
  const lessonsDone = M2.LESSONS.filter(l => done.has(l.id)).length;
  const tierNow = [3, 2, 1].find(t => M2.tierOpen(save, a, t)) || 1, inTier = M2.TEMPLATES.filter(t => t.tier === tierNow), doneInTier = inTier.filter(t => done.has(keyOf(a, t))).length;
  const stars = M2.starsDone(save, a);
  const v = { area: (AREAS[a] && AREAS[a].name) || a, stage, teach };
  v.tierLine = teach ? `Lessons · ${lessonsDone}/${M2.LESSONS.length}` : `Tier ${tierNow} · ${doneInTier}/${inTier.length} done${tierNow === 3 ? ` · stars ${stars}/${M2.GATE_STARS}` : ''}`;
  // 2. NEXT, pinned: nextUp's top row (a must-do lead, or the first open mission), the same words as HOME and the results.
  const top = up[0] && !up[0].daily ? up[0] : null;   // a daily is never pinned (it is under TODAY): with no open mission left the screen says what a crossing needs
  v.next = top ? row(save, top, vis) : null;
  // 3. OPEN: every open mission except the pinned one.
  v.open = vis.filter(m => !top || m.key !== top.key).map(m => row(save, itemOf(save, m), vis));
  // 4. TODAY: the day's trio, and the streak.
  const daily = M2.dailyVisible(save);   // (open from lesson 3 on, alongside the remaining lessons: missions2 decides, not the stage)
  v.today = { rows: daily.map(m => row(save, itemOf(save, m), vis)), streak: M2.streakBonus(save) };
  // 5. COMING UP: the next tier as ONE line with its opener and the count; at tier 3 the crossing trial's stars. Nothing further ahead (surprise stays).
  v.comingUp = teach ? null : tierNow < 3 ? `Tier ${tierNow + 1} · after 3 of tier ${tierNow} (${Math.min(doneInTier, 3)}/3)` : !M2.gateDone(save, a) ? `Crossing trial: ${stars}/${M2.GATE_STARS} stars` : null;
  // 6. STEADY: the cumulative goals with progress.
  v.steady = M2.steadyVisible(save, a).map(m => ({ key: m.key, short: clip(m.def.short(m.target, {}), NAME_MAX), full: m.title, icon: ICONS[m.def.id], how: `${m.progress.toLocaleString('en')} / ${m.target.toLocaleString('en')}`,
    frac: m.target ? Math.min(1, m.progress / m.target) : 0, prize: m.prize.seeds }));
  // 7. DONE: a count; the list is a sheet.
  const doneIds = [...M2.LESSONS.filter(l => done.has(l.id)).map(l => l.id), ...M2.TEMPLATES.filter(t => done.has(keyOf(a, t))).map(t => t.id)];
  v.done = { count: doneIds.length, names: doneIds.map(id => DONE_NAME[id] || id) };
  v.info = INFO;
  return v;

  function row(save, n, visList) {
    const m = visList.concat(M2.dailyVisible(save)).find(x => x.key === n.key), def = m && m.def, id = def ? def.id : null;
    const hazard = id === 'hazard' ? HAZARD_HOW[stage] : null, lesson = id && /^L\d$/.test(id) ? `Lesson ${id.slice(1)} of ${M2.LESSONS.length}` : null;
    const city = !!(id && CITY_TEMPLATES[id]);
    const stopsText = n.stops ? `${n.stops} ${n.stops === 1 ? 'stop' : 'stops'} away` : null;
    const how = n.lead ? 'Do this first' : stopsText || lesson || hazard || (def && def.id && (m.daily && !HOW[id] ? DAILY_HOW : HOW[id])) || (n.daily ? DAILY_HOW : '');
    const tip = n.lead ? n.full : n.stops ? `${stopsText} on your route. Tap AIM HERE to fly there first.` : lesson ? `${lesson}: ${n.full}.` : hazard ? `${hazard}.` : (m && m.daily ? (TIP[id] || 'Today only: any flight that does it.') : TIP[id]) || '';
    return { key: n.key, short: n.short, full: n.full, how: clip(how, HOW_MAX), tip, icon: ICONS[id] || (n.where === 'hangar' ? 'mi32-gear' : n.where === 'nature' ? 'mi32-natureproj' : 'mi32-seedbag'), prize: m ? m.prize.seeds : 0, star: !!(m && m.star),
      where: n.where, lead: !!n.lead, city, aimed: !!(city && save.aimKey === n.key), daily: !!n.daily, right: rightOf(n) };
  }
}

// The keys the fresh.js MISSIONS scope carries (R2's declared hook, src/fresh.js PRODUCERS): 'tier:<n>' while tier n is open (tier 1 is not news),
// 'done:<key>' for a mission finished OFF a flight (a purchase or a project: kind 'save'). Derived from the save each time, so a key STAYS while it exists.
export function missionsFreshKeys(save) {
  if (!M2.isSeason2(save)) return [];
  const a = areaFor(save), done = doneSet(save), out = [];
  for (const t of [2, 3]) if (M2.tierOpen(save, a, t)) out.push(`tier:${t}`);
  for (const t of M2.TEMPLATES) if (t.kind === 'save' && done.has(keyOf(a, t))) out.push(`done:${keyOf(a, t)}`);
  return out;
}
