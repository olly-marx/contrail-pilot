// The CROSSING as data, for the moment it opens and the stretch before it (R-A, the user's playtest of 0.29.0: "the first crossing was not obvious").
// Pure: no DOM, no clock, no random numbers. src/ui.js draws it (the sheet, the HOME row and dot, the globe arc); src/nextup.js turns it into UP NEXT rows;
// src/missionsview.js into the CROSSING block of MISSIONS. A crossing is READY by status (src/crossings.js readiness: Era, Plane, Nature; the trial stars are no longer a gate and where the player is does not
// matter): whichever tick completes LAST is the moment, and it can happen on a results card or in NATURE, so the sheet fires on whatever screen the player sees next (ui.maybeCrossingSheet).
import { upcoming, readiness, planeProgress, ladderSplit, rungOf } from './crossings.js';
import { pathTo, linksFor } from './route.js';
import { SEASON } from './season.js';
import { AREAS, opensName } from './areas.js';
import * as M2 from './missions2.js';
import { CROSSING_WORDS, crossingWord, crossingReward, prizeText } from './missionprize.js';

const fmt = n => Math.round(n).toLocaleString('en-GB');
// HOW HARD a crossing is, as a word (the user, 2026-11-09: 'there should NEVER be any numbers there; the distance should be the difficulty'). The ladder follows the eras: every crossing is harder than the one before.
export const DIFFICULTY = CROSSING_WORDS;   // (src/missionprize.js: the word and the prize come from the same list)
export const difficultyOf = crossingWord;
export const NEED_FAR = 'a longer landed flight';   // (not 'from here': the plane tick counts a flight from ANY area)
const openName = id => opensName(id);   // CROSSINGS V3: the region it opens

// state of ONE crossing: { id, from, to, km, difficulty, opens, ready, told, conds: [{ key, label, line, plain, status, done, frac, where }], nearest, crossing }. The three ticks, in order: Era, Plane, Nature.
export function stateOf(save, c, { unlock = false } = {}) {
  const rd = readiness(save, c), pp = planeProgress(save, c), need = SEASON.offer.biodiversity;
  const conds = [
    { key: 'era', label: 'Era', line: 'a later era', plain: 'A later era brings it.', where: 'fly', done: rd.era, frac: rd.era ? 1 : 0, status: rd.era ? 'done' : 'later' },
    { key: 'plane', label: 'Plane', line: 'a better plane', plain: 'Fly farther or upgrade plane', where: 'hangar', done: rd.plane, frac: pp, status: rd.plane ? 'done' : (pp >= 0.75 ? 'nearly' : 'not yet') },
    { key: 'nature', label: `Nature ${need}`, line: `nature ${rd.natureHave} of ${need}`, plain: `Plant trees. Nature ${rd.natureHave} of ${need}`, where: 'nature', done: rd.nature, frac: Math.min(1, rd.natureHave / need), status: rd.nature ? 'done' : `${rd.natureHave}` },
  ];
  const open = conds.filter(x => !x.done), nearest = open.slice().sort((a, b) => b.frac - a.frac)[0] || null;
  // WHERE the player is matters only for DOING the crossing (CROSSINGS V2 step 3): at its departure airport the player crosses, elsewhere the box says 'Go to <city>' with one dot per hop left
  // (the shortest way over the open network, src/aim.js GO TO); hops is null when no way is known.
  const atDeparture = save.city === c.from; let hops = null;
  if (!atDeparture) { try { const p = pathTo(save.city, c.from, linksFor(save)); hops = p ? p.length - 1 : null; } catch (e) { hops = null; } }
  return { atDeparture, hops, aimOn: !!save.aimCity && save.aimCity === c.from && !atDeparture, id: c.id, from: c.from, to: c.to, km: c.km, difficulty: difficultyOf(c), prize: crossingReward(difficultyOf(c)), opens: c.opens ? openName(c.opens) : 'the next area', ready: rd.ready || !!unlock,
    told: (save.crossingTold || []).includes(c.id), conds, nearest, crossing: c };
}

// The crossing the screens talk about: the NEXT one by the ladder (src/crossings.js ladderSplit: only HARDER than the highest crossed, plus a lower one that is the only way to open an area). A READY higher one first
// (the lowest rung), else a ready exception, else the nearest to ready among the higher, then the exceptions, then (nothing else left) the easier ones. `easier` lists the lower ones for the CROSSINGS screen.
export function crossingState(save, opts = {}) {
  if (!M2.isSeason2(save) || !save.tutorialDone) return null;
  const sp = ladderSplit(save), st = list => list.map(c => stateOf(save, c, opts));
  const higher = st(sp.higher), exception = st(sp.exception), easier = st(sp.easier);
  if (!higher.length && !exception.length && !easier.length) return null;
  const score = s => s.conds.filter(x => x.done).length + s.conds.reduce((a, x) => a + x.frac, 0) / 10;
  const lowest = list => list.filter(s => s.ready).sort((a, b) => rungOf(a.crossing) - rungOf(b.crossing))[0];
  const nearest = list => list.slice().sort((a, b) => score(b) - score(a) || rungOf(a.crossing) - rungOf(b.crossing))[0];
  const pick = lowest(higher) || lowest(exception) || nearest(higher) || nearest(exception) || lowest(easier) || nearest(easier);
  const lower = [...exception, ...easier].filter(s => s !== pick).sort((a, b) => rungOf(a.crossing) - rungOf(b.crossing));
  return { ...pick, easier: lower.map(s => ({ id: s.id, from: s.from, to: s.to, difficulty: s.difficulty, ready: s.ready, state: s })) };
}
export const crossingById = (save, id, opts = {}) => { const c = upcoming(save).find(x => x.id === id); return c ? stateOf(save, c, opts) : null; };

// The one-time announcement is due when a crossing is ready and has not been told yet.
export const momentDue = state => !!(state && state.ready && !state.told);
export function markTold(save, id) { save.crossingTold = [...new Set([...(save.crossingTold || []), id])]; return save.crossingTold; }

// The sheet's words (<= 60 words) and the HOME row's right column ("NEW Easy" until the sheet has been seen, then "Easy").
export const FIRST_CROSSING = 'A crossing is one long flight with no stops. Missions do not count: just get there.';   // (the first sheet only; the user, 2026-11-06)
export const sheetText = (s, first = false) => ({ eyebrow: 'A NEW WAY OPENS', title: `${s.to} is within reach!`, body: `A non-stop flight. How hard: ${s.difficulty}. It opens ${s.opens}. ${first ? FIRST_CROSSING + ' ' : ''}Fly it when you are ready.`, go: 'FLY THE CROSSING', later: 'LATER' });
export const rightText = s => (s.told ? s.difficulty : `NEW ${s.difficulty}`);   // "NEW Easy": the row budget is 29 (fitRow shortens the left side)
// The ticks block (MISSIONS).
export const ticksTitle = s => `Crossing to ${s.to}`;
// The route sheet's crossing lines and the ending card (src/ui.js): no distance anywhere.
export const routeCrossRest = c => `, non-stop, ${difficultyOf(c)}${c.opens ? ` (opens ${openName(c.opens)})` : ''}`;
export const routeLapRest = c => `: from ${c.from} round the world and home, non-stop`;
export const endingBody = city => `From ${city} all the way round and back home. Every area open, and the sky still cool behind you.`;

// THE HOME BOX and the CROSSINGS screen (CROSSINGS V2, research/DESIGN-CROSSINGS-V2.md): the next crossing, three ticks that fill in, one plain line, no distance and no number but nature's own meter.
// boxView -> { title, route, word, ticks: [{ label, done }], line, ready, where }; screenView adds the button. Texts are budgeted (route <= 28, line <= 28) and checked by tests/crossbox.cjs.
export const boxView = s => {
  const ticks = [['Era', 'era'], ['Plane', 'plane'], ['Nature', 'nature']].map(([label, key]) => ({ label, done: !!(s.conds.find(c => c.key === key) || {}).done }));
  // Ready: at the departure airport 'Ready! Tap to cross.', elsewhere 'Ready! Go to <city>' with one dot per hop left (at most 6, then 'more'); a GO TO already set shows 'on' (the player may stop it).
  // (A departure the open network cannot reach, e.g. the stepping stones HONOLULU and NADI, has no way to go to: it says 'Ready! Tap to cross.' and crosses from where the player is, as before.)
  const elsewhere = s.ready && !s.atDeparture && Number.isFinite(s.hops), line = s.ready ? (elsewhere ? `Ready! Go to ${s.from}` : 'Ready! Tap to cross.') : s.nearest ? s.nearest.plain : '';
  const hops = elsewhere ? s.hops : 0;
  return { title: 'NEXT CROSSING', route: `${s.from} > ${s.to}`, word: s.difficulty, prize: prizeText(s.prize), ticks, line, ready: !!s.ready, where: s.ready ? (elsewhere ? 'goto' : 'sheet') : s.nearest ? s.nearest.where : 'fly', id: s.id,
    dots: Math.min(hops, 6), moreDots: hops > 6, aimOn: !!(elsewhere && s.aimOn), city: s.from, atDeparture: !!s.atDeparture };
};
export const screenView = s => {
  const b = boxView(s), n = s.nearest, button = s.ready ? (b.where === 'goto' ? { label: `GO TO ${s.from}`, act: 'goto' } : { label: `CROSS TO ${s.to}`, act: 'cross' }) : n && n.where === 'hangar' ? { label: 'HANGAR', act: 'hangar' } : n && n.where === 'nature' ? { label: 'NATURE', act: 'nature' } : null;
  return { ...b, eyebrow: 'NEXT CROSSING', opens: s.opens, button, link: s.ready && s.atDeparture ? 'fly normally' : null,
    easier: (s.easier || []).map(e => ({ id: e.id, label: `${e.from} > ${e.to}`, word: e.difficulty, ready: !!e.ready })) };
};
