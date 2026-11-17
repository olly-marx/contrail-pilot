// THE FLIGHT SCHOOL BOARD (the user, 2026-11-16: "a school thing made more formal? Like it has lessons that unlock?"; proposal approved the same day: "Build it").
// Sixteen lessons in courses, in order. Each one opens one thing, and nothing appears on the bar before its lesson (the tab holds: src/missions2.js revealed reads
// `reached`). The five old lessons L1..L5 keep their ids, goals and prizes (src/missions2.js LESSONS); the new ones carry no prize, so the economy and the sim are unchanged.
// A lesson is DONE by what has really happened (a lesson id in missionsDone, a rails tour in save.tours, a tree grown...). `passive` lessons (watch it grow) never block
// the ones after them: they finish on their own while the player flies.
// Saves from before the board (no save.school2) are not held back: every lesson whose thing the old rules had already shown counts as done (oldDone), so no tab
// disappears from an existing player. Pure: no DOM.
import { treesPlanted } from './treecount.js';
import { treesGrownTotal } from './groves.js';

const md = s => new Set(s.missionsDone || []);
const tour = (s, id) => (s.tours || []).includes(id) || (s.tours || []).includes('*');
const L = id => s => md(s).has(id);
// What the OLD rules had already shown a player (src/missions2.js revealed before 2026-11-16), for saves without school2.
const oldShown = { runway: L('L1'), map: L('L4'), name: s => (s.landings || 0) >= 5, records: s => (s.landings || 0) >= 5, trees: L('L4'), practice: s => treesPlanted(s) > 0 || md(s).has('L5'), results: s => (s.flights || 0) >= 1, crossings: s => (s.areas || []).length > 1 };

export const BOARD = [
  { id: 'school',    course: 'Flying',       title: 'Flight school',             short: 'Fly, dodge, land.',                           pic: 'lesson-tap',  kind: 'fly',    done: s => !!s.tutorialDone },
  { id: 'free',      course: 'Your plane',   title: 'Your free part',            short: 'Pick a part in the hangar.',                  pic: 'lesson-hangar', kind: 'screen', where: 'hangar', done: s => !!s.freeGiven && !s.freeUpgrade },
  { id: 'L1',        course: 'Airports',     title: 'Land at the next airport',  short: 'Fly low over the runway.',                    pic: 'lesson-land', kind: 'fly',    done: L('L1') },
  // Bad landings (the user, 2026-11-17): done by one landing that stopped on the runway. A player already past L2 when this lesson arrived is not held back by it.
  { id: 'runway',    course: 'Airports',     title: 'Land before the line',      short: 'Touch down before the yellow line.',          pic: 'lesson-land', kind: 'fly',    done: s => (s.goodLandings || 0) > 0 || md(s).has('L2') },
  { id: 'L2',        course: 'Contrails',    title: 'Icy air in daytime',        short: 'Daytime contrails make shade.',               pic: 'lesson-day',  kind: 'fly',    done: L('L2') },
  { id: 'nature',    course: 'Nature',       title: 'Your wild land',            short: 'Take your free nature project.',              pic: 'lesson-nature', kind: 'screen', where: 'nature', done: s => tour(s, 'r-nature') || !!s.freeProjectGiven },
  { id: 'L3',        course: 'Contrails',    title: 'Dodge icy air at night',    short: 'Night contrails trap heat.',                  pic: 'lesson-night', kind: 'fly',   done: L('L3') },
  { id: 'map',       course: 'Airports',     title: 'Choose where to fly',       short: 'Spin the globe, tap a city.',                 pic: 'lesson-land', kind: 'screen', where: 'fly', done: s => tour(s, 'r-map') },
  { id: 'L4',        course: 'Airports',     title: 'Skip one, land at the next', short: 'Each airport you pass adds a bonus.',        pic: 'lesson-bonus', kind: 'fly',   done: L('L4') },
  { id: 'trees',     course: 'Trees',        title: 'Get your trees',            short: 'Free tree parcels in NATURE.',                pic: 'lesson-plot', kind: 'screen', where: 'nature', done: s => ((s.levels || {}).trees || 0) > 0 },
  { id: 'practice',  course: 'Trees',        title: 'Tree practice flight',      short: 'Drop seeds on brown soil, no storms.',        pic: 'lesson-plot', kind: 'practice', done: s => !!s.treePractice },
  { id: 'L5',        course: 'Trees',        title: 'Drop a tree on brown soil', short: 'Plant one on a real flight.',                 pic: 'lesson-plot', kind: 'fly',    done: L('L5') },
  { id: 'grow',      course: 'Trees',        title: 'Watch it grow',             short: 'Saplings grow as you fly. See NATURE.',       pic: 'lesson-tree-co2', kind: 'passive', where: 'nature', done: s => treesGrownTotal(s) > 0 },
  { id: 'results',   course: 'Your flights', title: 'Reading your flight',       short: 'What warmed and cooled the Earth.',           pic: 'lesson-heat', kind: 'read',   done: s => tour(s, 'r-earth') },
  { id: 'name',      course: 'Pilot',        title: 'Your pilot name',           short: 'Choose the name on the boards.',              pic: 'lesson-bars', kind: 'screen', where: 'pilot', done: s => tour(s, 'name') || s.pilotNamed === true },   // a saved name finishes it even if the tour was left before its end (Oliver, 2026-11-17: still said 'save pilot name' after saving)
  { id: 'records',   course: 'Pilot',        title: 'Your records',              short: 'Your best flights.',                          pic: 'lesson-bars', kind: 'screen', where: 'boards', done: s => tour(s, 'r-boards') },
  { id: 'crossings', course: 'The world',    title: 'Crossings',                 short: 'How to open the next part of the world.',     pic: 'lesson-bonus', kind: 'read',  done: s => tour(s, 'r-cross') || (s.areas || []).length > 1 },
];
export const lessonDone = (s, l) => !!l.done(s) || (!s.school2 && !!(oldShown[l.id] && oldShown[l.id](s)));
// The lesson the player is on: the first not done that is not passive. null = graduated.
export function current(s) { return BOARD.find(l => l.kind !== 'passive' && !lessonDone(s, l)) || null; }
// Reached: done, or the current one, or passive and every lesson before it done (a tab held for a lesson shows from the moment that lesson starts).
export function reached(s, id) {
  const i = BOARD.findIndex(l => l.id === id); if (i < 0) return true;
  if (lessonDone(s, BOARD[i])) return true;
  return BOARD.slice(0, i).every(l => l.kind === 'passive' || lessonDone(s, l));
}
export const graduated = s => BOARD.every(l => lessonDone(s, l));
// The board as rows: [{ ...lesson, state: 'done' | 'now' | 'growing' | 'lock' }], and how many are done.
export function boardView(s) {
  const now = current(s);
  const rows = BOARD.map(l => ({ id: l.id, course: l.course, title: l.title, short: l.short, pic: l.pic, kind: l.kind, where: l.where || null,
    state: lessonDone(s, l) ? 'done' : now && now.id === l.id ? 'now' : l.kind === 'passive' && reached(s, l.id) ? 'growing' : 'lock' }));
  return { rows, done: rows.filter(r => r.state === 'done').length, total: rows.length, now: now ? now.id : null, graduated: !now && rows.every(r => r.state === 'done') };
}
