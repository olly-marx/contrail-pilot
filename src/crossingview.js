// The CROSSING as data, for the moment it opens and the stretch before it (R-A, the user's playtest of 0.29.0: "the first crossing was not obvious").
// Pure: no DOM, no clock, no random numbers. src/ui.js draws it (the sheet, the HOME row and dot, the globe arc); src/nextup.js turns it into UP NEXT rows;
// src/missionsview.js into the CROSSING block of MISSIONS. A crossing is offered only when ALL of its conditions are met (src/season.js offer.rule):
//   a landed flight of `distanceShare` of its length, the area's biodiversity, and the area's crossing trial (2 of 3 stars): whichever completes LAST is
//   the moment, and it can happen on a results card or in NATURE, so the sheet fires on whatever screen the player sees next (ui.maybeCrossingSheet).
import { available, offerCheck, offerCtx } from './crossings.js';
import { SEASON } from './season.js';
import { AREAS, areaOf } from './areas.js';
import * as M2 from './missions2.js';

const fmt = n => Math.round(n).toLocaleString('en-GB');
// The trial's stars belong to the area a crossing LEAVES from (crossings.js offerCtx), so HOME's quiet line names that area (2026-11-09: a pilot with five areas open could not tell whose stars were missing).
// Short names so the whole line fits HOME's 24-character row: 'Stars: N. America 1 of 2' is the longest.
export const AREA_SHORT = { weurope: 'W. Europe', namerica: 'N. America', sasia: 'S. Asia', africa: 'Africa', samerica: 'S. America', easia: 'E. Asia', mideast: 'Mid East', nordic: 'Nordic', oceania: 'Australia', aotearoa: 'Aotearoa', patagonia: 'Patagonia' };
export const starsLine = (k, stars) => `Stars: ${AREA_SHORT[k] || (AREAS[k] ? AREAS[k].name : k)} ${stars} of ${M2.GATE_STARS}`;
const openName = id => (AREAS[id] ? AREAS[id].name : 'the Pacific');

// state of ONE crossing: { id, from, to, km, kmText, opens, ready, told, conds: [{ key, label, status, done, frac, where }], nearest }
export function stateOf(save, c, { unlock = false } = {}) {
  const ctx = offerCtx(save, c), chk = offerCheck(c, ctx), k = areaOf(c.from);
  const needKm = Math.round(SEASON.offer.distanceShare * c.km), stars = k ? M2.starsDone(save, k) : 0;
  const conds = [
    { key: 'capability', label: `Fly ${fmt(needKm)} km`, line: `fly ${fmt(needKm)} km`, where: 'fly', done: !!chk.need.capability, frac: needKm ? Math.min(1, ctx.capabilityKm / needKm) : 1, status: chk.need.capability ? 'done' : `${fmt(ctx.capabilityKm)} km` },
    { key: 'nature', label: `Nature ${SEASON.offer.biodiversity}`, line: `nature ${Math.round(ctx.bio)} of ${SEASON.offer.biodiversity}`, where: 'nature', done: !!chk.need.nature, frac: Math.min(1, ctx.bio / SEASON.offer.biodiversity), status: chk.need.nature ? 'done' : `${Math.round(ctx.bio)}` },
    ...(chk.need.contrails !== undefined ? [{ key: 'contrails', label: 'Trial stars', line: starsLine(k, stars), bare: true, area: k, where: 'missions', done: !!chk.need.contrails, frac: Math.min(1, stars / M2.GATE_STARS), status: chk.need.contrails ? 'done' : `${stars} of ${M2.GATE_STARS}` }] : []),
  ];
  const open = conds.filter(x => !x.done), nearest = open.slice().sort((a, b) => b.frac - a.frac)[0] || null;
  return { id: c.id, from: c.from, to: c.to, km: c.km, kmText: `${fmt(c.km)} km`, opens: c.opens ? openName(c.opens) : 'the next area', ready: chk.offered || !!unlock,
    told: (save.crossingTold || []).includes(c.id), conds, nearest, crossing: c };
}

// The crossing the screens talk about: a READY one first (the one with the least to fly), else the nearest to ready (the most conditions met, then the largest progress).
export function crossingState(save, opts = {}) {
  if (!M2.isSeason2(save) || !save.tutorialDone) return null;
  const all = available(save).map(c => stateOf(save, c, opts)); if (!all.length) return null;
  const score = s => s.conds.filter(x => x.done).length + s.conds.reduce((a, x) => a + x.frac, 0) / 10;
  const ready = all.filter(s => s.ready).sort((a, b) => a.km - b.km)[0];
  return ready || all.sort((a, b) => score(b) - score(a))[0];
}
export const crossingById = (save, id, opts = {}) => { const c = available(save).find(x => x.id === id); return c ? stateOf(save, c, opts) : null; };

// The one-time announcement is due when a crossing is ready and has not been told yet.
export const momentDue = state => !!(state && state.ready && !state.told);
export function markTold(save, id) { save.crossingTold = [...new Set([...(save.crossingTold || []), id])]; return save.crossingTold; }

// The sheet's words (<= 60 words) and the HOME row's right column ("NEW 6,500 km" until the sheet has been seen, then "6,500 km").
export const FIRST_CROSSING = 'A crossing is one long flight with no stops. Distance and missions do not count: just get there.';   // (the first sheet only; the user, 2026-11-06)
export const sheetText = (s, first = false) => ({ eyebrow: 'A NEW WAY OPENS', title: `${s.to} is within reach!`, body: `A non-stop flight of ${s.kmText}. It opens ${s.opens}. ${first ? FIRST_CROSSING + ' ' : ''}Fly it when you are ready.`, go: 'FLY THE CROSSING', later: 'LATER' });
export const rightText = s => (s.told ? s.kmText : `NEW ${s.kmText}`).replace(' km', 'km');   // "NEW 6,500km" (11): the row budget is 29
// The ticks block (MISSIONS) and the nearest-condition line (HOME).
export const ticksTitle = s => `Crossing to ${s.to}`;
export const nearestLine = s => (s.nearest ? (s.nearest.bare ? s.nearest.line : `Cross: ${s.nearest.line}`) : '');   // (<= 24: HOME's UP NEXT row)
