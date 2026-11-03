// The MISSIONS screen as DATA (research/UX-MASTER-PLAN.md C3; R4). Pure: no DOM, no clock, no random numbers. src/ui.js showMissions draws it;
// tests/missionsview.cjs holds its budgets and meaning. Rows come from the same sources as HOME and the results: nextUp for the pinned row,
// missions2 for the rest, so a mission is never worded two ways. Every line is held to the 320 px phone (the pixel font: ~8.2 px a
// character at 8 px, so ~28 characters of a row's second line beside the price column).
import * as M2 from './missions2.js';
import { AREAS, areaOf, DEFAULT_AREA } from './areas.js';
import { nextUp, itemOf, clip, rightOf } from './nextup.js';
import { CITY_TEMPLATES } from './aim.js';

export const HOW_MAX = 28;       // a row's second line (the "how")
export const NAME_MAX = 24;      // a row's name (nextup.SHORT_MAX)
// A small pictogram per mission (the 8 existing code-drawn icons: assets/ui/mi-*.png; own pictograms are a later art task).
export const ICONS = {
  L1: 'mi-land', L2: 'mi-shade', L3: 'mi-night', L4: 'mi-airports', L5: 'mi-tree',
  'land-city': 'mi-land', shade: 'mi-shade', 'plant-tree': 'mi-tree', 'clean-gaps': 'mi-airports', bring: 'mi-seed', project: 'mi-tree',
  chain: 'mi-land', dodge: 'mi-night', rescue: 'mi-tree', spot: 'mi-globe', hazard: 'mi-airports', system: 'mi-crystal',
  night: 'mi-night', shade10: 'mi-shade', kinds3: 'mi-tree', route: 'mi-globe', golden: 'mi-seed', tier: 'mi-tree',
  'd-seeds': 'mi-seed', 'd-shade': 'mi-shade', 'd-gaps': 'mi-airports', 'd-skip': 'mi-airports', 'd-plant': 'mi-tree', 'd-night': 'mi-night',
  'e-km': 'mi-globe', 'e-seeds': 'mi-seed', 'e-gaps': 'mi-airports',
  'st-km': 'mi-globe', 'st-seeds': 'mi-seed', 'st-gaps': 'mi-airports', 'st-land': 'mi-land', 'st-plant': 'mi-tree',
};
// The one-line "how" under a mission's name (declared copy; the full title and the tip are in the row's sheet).
export const HOW = {
  shade: 'Fly through icy air by day', 'plant-tree': 'Plant it on your flight', 'clean-gaps': 'No scrapes, in one flight', bring: 'Land with seeds on board',
  project: 'In NATURE: fund any project', chain: 'Land at both, in order', dodge: 'Night flight, icy patches', rescue: 'Plant first, then land',
  spot: 'Fly over it to find it', system: 'In HANGAR, then SYSTEMS', night: 'Land after a clean night', shade10: 'Shade a lot, then land',
  kinds3: 'Different trees, one go', route: 'Fly past an airport, land', golden: 'Grab it, then land', tier: 'Finish them all in NATURE',
  'e-km': 'A crash counts too', 'e-seeds': 'A crash counts too', 'e-gaps': 'A crash counts too',
};
const HAZARD_HOW = { teach: 'Fly on, then land', challenge: 'Keep out of the red zones', mastery: 'No scrapes, ten in a row' };
const DAILY_HOW = 'Today: one flight';
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
  const top = up[0] || null;
  v.next = top ? row(save, top, vis) : null;
  // 3. OPEN: every open mission except the pinned one.
  v.open = vis.filter(m => !top || m.key !== top.key).map(m => row(save, itemOf(save, m), vis));
  // 4. TODAY: the day's trio, and the streak.
  const daily = teach ? [] : M2.dailyVisible(save);
  v.today = { rows: daily.map(m => row(save, itemOf(save, m), vis)), streak: M2.streakBonus(save) };
  // 5. COMING UP: the next tier as ONE line with its opener and the count; at tier 3 the crossing trial's stars. Nothing further ahead (surprise stays).
  v.comingUp = teach ? null : tierNow < 3 ? `Tier ${tierNow + 1} · after 3 of tier ${tierNow} (${Math.min(doneInTier, 3)}/3)` : !M2.gateDone(save, a) ? `Crossing trial: ${stars}/${M2.GATE_STARS} stars` : null;
  // 6. STEADY: the cumulative goals with progress.
  v.steady = teach ? [] : M2.steadyVisible(save, a).map(m => ({ key: m.key, short: clip(m.def.short(m.target, {}), NAME_MAX), full: m.title, icon: ICONS[m.def.id], how: `${m.progress.toLocaleString('en')} / ${m.target.toLocaleString('en')}`,
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
    const how = n.lead ? n.full : n.stops ? `${n.stops} ${n.stops === 1 ? 'stop' : 'stops'} on your route` : lesson || hazard || (def && def.id && (m.daily && !HOW[id] ? DAILY_HOW : HOW[id])) || (n.daily ? DAILY_HOW : '');
    return { key: n.key, short: n.short, full: n.full, how: clip(how, HOW_MAX), icon: ICONS[id] || (n.lead ? 'mi-globe' : 'mi-seed'), prize: m ? m.prize.seeds : 0, star: !!(m && m.star),
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
