// The CROSSING as data, for the moment it opens and the stretch before it (R-A, the user's playtest of 0.29.0: "the first crossing was not obvious").
// Pure: no DOM, no clock, no random numbers. src/ui.js draws it (the sheet, the HOME row and dot, the globe arc); src/nextup.js turns it into UP NEXT rows;
// src/missionsview.js into the CROSSING block of MISSIONS. A crossing is READY by status (src/crossings.js readiness: Era, Plane, Nature; the trial stars are no longer a gate and where the player is does not
// matter): whichever tick completes LAST is the moment, and it can happen on a results card or in NATURE, so the sheet fires on whatever screen the player sees next (ui.maybeCrossingSheet).
import { upcoming, readiness, planeProgress } from './crossings.js';
import { SEASON } from './season.js';
import { AREAS } from './areas.js';
import * as M2 from './missions2.js';

const fmt = n => Math.round(n).toLocaleString('en-GB');
// HOW HARD a crossing is, as a word (the user, 2026-11-09: 'there should NEVER be any numbers there; the distance should be the difficulty'). The ladder follows the eras: every crossing is harder than the one before.
export const DIFFICULTY = ['Easy', 'Medium', 'Hard', 'Harder', 'Very hard', 'The lap'];
export const difficultyOf = c => DIFFICULTY[Math.min(DIFFICULTY.length - 1, c.kind === 'lap' ? DIFFICULTY.length - 1 : Math.max(0, c.era || 0))];
export const NEED_FAR = 'a longer landed flight from here';
const openName = id => (AREAS[id] ? AREAS[id].name : 'the Pacific');

// state of ONE crossing: { id, from, to, km, difficulty, opens, ready, told, conds: [{ key, label, line, plain, status, done, frac, where }], nearest, crossing }. The three ticks, in order: Era, Plane, Nature.
export function stateOf(save, c, { unlock = false } = {}) {
  const rd = readiness(save, c), pp = planeProgress(save, c), need = SEASON.offer.biodiversity;
  const conds = [
    { key: 'era', label: 'Era', line: 'a later era', plain: 'A later era brings it.', where: 'fly', done: rd.era, frac: rd.era ? 1 : 0, status: rd.era ? 'done' : 'later' },
    { key: 'plane', label: 'Plane', line: 'upgrade your plane', plain: 'Upgrade your plane.', where: 'hangar', done: rd.plane, frac: pp, status: rd.plane ? 'done' : (pp >= 0.75 ? 'nearly' : 'not yet') },
    { key: 'nature', label: `Nature ${need}`, line: `nature ${rd.natureHave} of ${need}`, plain: `Plant trees. Nature ${rd.natureHave} of ${need}`, where: 'nature', done: rd.nature, frac: Math.min(1, rd.natureHave / need), status: rd.nature ? 'done' : `${rd.natureHave}` },
  ];
  const open = conds.filter(x => !x.done), nearest = open.slice().sort((a, b) => b.frac - a.frac)[0] || null;
  return { id: c.id, from: c.from, to: c.to, km: c.km, difficulty: difficultyOf(c), opens: c.opens ? openName(c.opens) : 'the next area', ready: rd.ready || !!unlock,
    told: (save.crossingTold || []).includes(c.id), conds, nearest, crossing: c };
}

// The crossing the screens talk about: a READY one first (the one with the least to fly), else the nearest to ready (the most conditions met, then the largest progress).
export function crossingState(save, opts = {}) {
  if (!M2.isSeason2(save) || !save.tutorialDone) return null;
  const all = upcoming(save).map(c => stateOf(save, c, opts)); if (!all.length) return null;
  const score = s => s.conds.filter(x => x.done).length + s.conds.reduce((a, x) => a + x.frac, 0) / 10;
  const ready = all.filter(s => s.ready).sort((a, b) => a.km - b.km)[0];
  return ready || all.sort((a, b) => score(b) - score(a))[0];
}
export const crossingById = (save, id, opts = {}) => { const c = upcoming(save).find(x => x.id === id); return c ? stateOf(save, c, opts) : null; };

// The one-time announcement is due when a crossing is ready and has not been told yet.
export const momentDue = state => !!(state && state.ready && !state.told);
export function markTold(save, id) { save.crossingTold = [...new Set([...(save.crossingTold || []), id])]; return save.crossingTold; }

// The sheet's words (<= 60 words) and the HOME row's right column ("NEW Easy" until the sheet has been seen, then "Easy").
export const FIRST_CROSSING = 'A crossing is one long flight with no stops. Missions do not count: just get there.';   // (the first sheet only; the user, 2026-11-06)
export const sheetText = (s, first = false) => ({ eyebrow: 'A NEW WAY OPENS', title: `${s.to} is within reach!`, body: `A non-stop flight. How hard: ${s.difficulty}. It opens ${s.opens}. ${first ? FIRST_CROSSING + ' ' : ''}Fly it when you are ready.`, go: 'FLY THE CROSSING', later: 'LATER' });
export const rightText = s => (s.told ? s.difficulty : `NEW ${s.difficulty}`);   // "NEW Easy": the row budget is 29 (fitRow shortens the left side)
// The ticks block (MISSIONS) and the nearest-condition line (HOME).
export const ticksTitle = s => `Crossing to ${s.to}`;
export const nearestLine = s => (s.nearest ? (s.nearest.bare ? s.nearest.line : `Cross: ${s.nearest.line}`) : '');   // (<= 24: HOME's UP NEXT row)
// The route sheet's crossing lines and the ending card (src/ui.js): no distance anywhere.
export const routeCrossRest = c => `, non-stop, ${difficultyOf(c)}${c.opens ? ` (opens ${openName(c.opens)})` : ''}`;
export const routeLapRest = c => `: from ${c.from} round the world and home, non-stop`;
export const endingBody = city => `From ${city} all the way round and back home. Every area open, and the sky still cool behind you.`;

// THE HOME BOX and the CROSSINGS screen (CROSSINGS V2, research/DESIGN-CROSSINGS-V2.md): the next crossing, three ticks that fill in, one plain line, no distance and no number but nature's own meter.
// boxView -> { title, route, word, ticks: [{ label, done }], line, ready, where }; screenView adds the button. Texts are budgeted (route <= 28, line <= 28) and checked by tests/crossbox.cjs.
export const boxView = s => {
  const ticks = [['Era', 'era'], ['Plane', 'plane'], ['Nature', 'nature']].map(([label, key]) => ({ label, done: !!(s.conds.find(c => c.key === key) || {}).done }));
  const line = s.ready ? 'Ready!' : s.nearest ? s.nearest.plain : '';
  return { title: 'NEXT CROSSING', route: `${s.from} > ${s.to}`, word: s.difficulty, ticks, line, ready: !!s.ready, where: s.ready ? 'sheet' : s.nearest ? s.nearest.where : 'fly', id: s.id };
};
export const screenView = s => {
  const b = boxView(s), n = s.nearest, button = s.ready ? { label: `CROSS TO ${s.to}`, act: 'cross' } : n && n.where === 'hangar' ? { label: 'HANGAR', act: 'hangar' } : n && n.where === 'nature' ? { label: 'NATURE', act: 'nature' } : null;
  return { ...b, eyebrow: 'NEXT CROSSING', opens: s.opens, button };
};
