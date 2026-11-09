// ONE "next up" source (research/UX-MASTER-PLAN.md B3; the game chat). Pure: no DOM, no clock, no random numbers. The results card shows rows 1-2,
// HOME (R3) shows 3, MISSIONS (R4) pins row 1, so the player sees the next things in the same words on every screen.
//   nextUp(save, { crossingReady, limit }) -> [{ key, short, full, where, stops?, daily?, lead? }]
//     short  <= SHORT_MAX characters (the mission's own `short`, src/missions2.js; clipped as a safety net: tests/nextup.cjs reports any clip)
//     where  'fly' | 'hangar' | 'nature' | 'missions' (the claims lead only): what a tap on the row opens
//     stops  a city mission: how many airports away its city is from here (src/route.js wayTo, the route the aim flies)
//     lead   a MUST-DO (the free part, the first tree parcels, a crossing ready): at most one, always first
//     pic    a lead's picture (the hangar's or NATURE's lesson picture): HOME's NEXT box shows it (ui.js renderHub); R3's UP NEXT strip keeps it
// Priority: 1. the must-do lead. 2. the first open mission. 3. the first undone daily. Then more open missions, up to `limit`.
import * as M2 from './missions2.js';
import { CITY_TEMPLATES } from './aim.js';
import { linksFor, wayTo } from './route.js';
import { lineById } from './upgrades.js';
import { rightText } from './crossingview.js';

export const SHORT_MAX = 24;
export const ROW_MAX = 29;   // short + right column on ONE line at 320 px (an 8 px row with 12 px padding holds ~31 characters: measured, R1)
// The first Tree Planting level (lesson 5 needs it): affordable with the seeds and crystals in the bank? (was hub.js; the claims lead below reads it)
export const canAffordParcels = save => { const l = lineById('trees').levels[0]; return (save.seeds || 0) >= l.cost && (save.crystals || 0) >= (l.crystals || 0); };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
// The right-hand column of a row, ONE source for HOME and the results: the hop, the stops, or "today" (never a sentence). <= 9 characters.
export const rightOf = n => ('right' in n ? n.right : n.where === 'hangar' ? 'HANGAR ›' : n.where === 'nature' ? 'NATURE ›' : n.where === 'missions' ? 'CLAIM ›' : n.stops ? plural(n.stops, 'stop') : n.daily ? 'today' : '');
export const clip = (t, n = SHORT_MAX) => { t = String(t || ''); if (t.length <= n) return t; const c = t.slice(0, n - 1), sp = c.lastIndexOf(' '); return (sp > 8 ? c.slice(0, sp) : c).replace(/[ ,]+$/, '') + '…'; };

// The tab a mission's row leads to: a purchase (system) -> the hangar; a project -> NATURE; everything else is a flight.
const WHERE = { system: 'hangar', project: 'nature', tier: 'nature' };
const whereOf = m => (m.def && m.def.kind === 'save' ? WHERE[m.def.id] || 'fly' : 'fly');
const shortOf = m => clip(typeof m.def.short === 'function' ? m.def.short(m.fill || m.f || {}) : m.def.short || m.title);

function stopsFor(save, m) {
  const pick = m.def && CITY_TEMPLATES[m.def.id]; if (!pick || !m.fill) return undefined;
  const t = pick(m.fill, save); if (!t || t === save.city) return undefined;
  const L = linksFor(save), w = L[save.city] ? wayTo(save.city, t, L, m.def.id === 'route') : null;
  return w ? w.length - 1 : undefined;
}
// The title never pushes its right column onto a second line (a long city: "Nonstop to DAR ES SALAAM" + "3 stops").
export const fitRow = o => ({ ...o, short: clip(o.short, Math.min(SHORT_MAX, ROW_MAX - rightOf(o).length)) });
export const itemOf = (save, m) => fitRow({ key: m.key, short: shortOf(m), full: m.title, where: whereOf(m), ...(stopsFor(save, m) ? { stops: stopsFor(save, m) } : {}), ...(m.daily ? { daily: true } : {}) });

export function leadOf(save, crossingReady = null, crossing = null) {
  if (!M2.isSeason2(save)) return null;   // (the screens decide whether to show it: HOME hides the strip until tutorialDone, as hub.js's chain always did)
  const mid = (M2.next(save) || {}).key;
  if (crossing && crossing.ready) return fitRow({ key: 'lead:cross', short: clip(`Cross to ${crossing.to}`), full: `Crossing ready: ${crossing.from} to ${crossing.to}`, where: 'fly', right: rightText(crossing), cross: true, lead: true });   // (R-A: NEW + the distance; a tap opens the sheet, never starts a flight; the title is clipped to fit beside it)
  if (crossingReady) return { key: 'lead:cross', short: clip(`Cross to ${String(crossingReady).split(' to ').pop()}`), full: `Crossing ready: ${crossingReady}`, where: 'fly', lead: true };
  if (save.freeUpgrade && M2.revealed(save, 'hangar')) return { key: 'lead:free', short: 'Pick your free part', full: 'Open the hangar: free upgrade!', where: 'hangar', pic: 'assets/ui/lesson-hangar.png', lead: true };
  if (mid === 'L5' && !((save.levels || {}).trees)) return { key: 'lead:parcels', short: !save.freeParcelsGiven ? 'Free tree parcels' : 'Buy tree parcels', full: !save.freeParcelsGiven ? 'Free tree parcels in NATURE!' : 'Buy tree parcels in NATURE first', where: 'nature', pic: 'assets/ui/lesson-nature.png', lead: true };
  return null;
}

export const CODE_FROM_LANDING = 10;
export const codeDue = save => !!save.pilotNamed && !save.codeSeen && (save.landings || 0) >= CODE_FROM_LANDING && !(save.seenTips || []).includes('*');

export function nextUp(save, { crossingReady = null, crossing = null, limit = 3 } = {}) {
  if (!M2.isSeason2(save)) return [];
  const out = [], lead = leadOf(save, crossingReady, crossing), vis = M2.visible(save), daily = M2.lessonsLeft(save).length ? [] : M2.dailyVisible(save);
  if (lead) out.push(lead);
  if (vis[0]) out.push(itemOf(save, vis[0]));
  // Save-safety (the user lost a 260-flight save, 2026-11-05): from landing 10, a pilot who never opened the code is asked, once per visit, to write it down.
  if (codeDue(save)) out.push({ key: 'code:save', short: 'Save your pilot code', full: 'Write your pilot code down. It is the only way to get your game back on another phone, or after your browser clears its data. Open PILOT.', where: 'pilot', right: 'PILOT ›' });
  if (daily[0]) out.push(itemOf(save, daily[0]));
  for (const m of vis.slice(1)) { if (out.length >= limit) break; out.push(itemOf(save, m)); }
  return out.filter((x, i, a) => a.findIndex(y => y.key === x.key) === i).slice(0, limit);
}
