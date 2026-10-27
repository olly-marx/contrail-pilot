// MY RECORDS (the boards for season 2, research/PROPOSAL-BOARDS-S2.md; the user's answers 2026-10-27): 4 GOOD and 4 OOPS boards, no points,
// two periods (THIS WEEK, EVER). Online is off in season 2, so each board shows YOUR number on this device; the ranking against other pilots
// comes back with online. Pure (no storage, no clock, no screen): `recordFlight` is called where a flight is banked (RULES.bankFlight in
// src/sim/rules.js, shared by the game and the Node engine); the menu calls `rollWeek` with today's date (the rules have no clock, like setDaily).
//
//   save.records = { ever: Counts, week: Counts + { start, kindsBase, missionsBase }, fresh: [board ids beaten, until the screen is opened] }
//   Counts = { longest, cool, longestCrash, shortest, bird, crashes }   (distances as the game shows them, km)
// KINDS and MISSIONS are not counted here: they are read from the save (planted / plantedIn, missionsDone). Their THIS WEEK number is
// "now minus what you had when the week began" (kindsBase, missionsBase).
import { km } from './config.js';

const n = v => Number(v).toLocaleString('en-GB');
export const BOARDS = [
  { id: 'longest', name: 'FURTHEST FLIGHT', best: 'max', rule: 'Your longest flight that landed.', fmt: km },
  { id: 'kinds', name: 'TREE KINDS', rule: 'Different kinds of tree you have planted (a kind counts once in each land).', fmt: v => `${n(v)} kind${v == 1 ? '' : 's'}` },
  { id: 'cool', name: 'COOL SKIES', rule: 'Shade you made in the sun minus the heat your night contrails trapped, flight by flight (a bad flight scores 0).', fmt: v => n(Math.round(v)) },
  { id: 'missions', name: 'MISSIONS', rule: 'Missions you have finished.', fmt: v => `${n(v)} done` },
  { id: 'longestCrash', name: 'LONGEST CRASH', oops: true, best: 'max', rule: 'The furthest you flew before you crashed. Oops!', fmt: km },
  { id: 'shortest', name: 'SHORTEST FLIGHT', oops: true, best: 'min', rule: 'The soonest a flight ended in a crash. Oops, already?', fmt: km },
  { id: 'bird', name: 'BIRD MAGNET', oops: true, rule: 'Flights that ended in a bird strike.', fmt: v => `${n(v)} strike${v == 1 ? '' : 's'}` },
  { id: 'crashes', name: 'MOST CRASHES', oops: true, rule: 'Flights that ended in a crash.', fmt: v => `${n(v)} crash${v == 1 ? '' : 'es'}` },
];
export const PERIODS = [{ id: 'week', name: 'THIS WEEK' }, { id: 'ever', name: 'EVER' }];

const counts = () => ({ longest: 0, cool: 0, longestCrash: 0, shortest: null, bird: 0, crashes: 0 });
const ensure = save => {
  const r = save.records = save.records || {};
  r.ever = { ...counts(), ...(r.ever || {}) };
  r.week = { ...counts(), start: null, kindsBase: [], missionsBase: 0, ...(r.week || {}) };
  r.fresh = r.fresh || [];
  return r;
};

// The kinds of tree a save has planted: UK kinds bare, other lands' as 'land:id' (the same tags the boards use).
export function treeTags(save) {
  const tags = [];
  for (const [id, c] of Object.entries(save.planted || {})) if (c > 0) tags.push(id);
  for (const [land, book] of Object.entries(save.plantedIn || {})) for (const [id, c] of Object.entries(book || {})) if (c > 0) tags.push(`${land}:${id}`);
  return tags;
}

// A finished flight (not flight school). f = { landed, distance, crash: 'bird' | 'storm' | 'nofly' | 'overheat' | 'ground' | null, shade, heatTrapped }.
// Returns the boards whose BEST was beaten: [{ id, period }] (the totals have no "new record").
export function recordFlight(save, f) {
  const r = ensure(save), beaten = [];
  const net = true ? (f.shade || 0) - (f.heatTrapped || 0) : 0;
  for (const period of ['ever', 'week']) {
    const c = r[period];
    if (f.landed) {
      if (f.distance > c.longest) { if (true) beaten.push({ id: 'longest', period }); c.longest = f.distance; }   // (the first one is a start, not a record beaten)
      c.cool += net;
    } else {
      c.crashes += 0;
      if (f.crash) c.bird += 1;
      if (f.distance > c.longestCrash) { if (c.longestCrash > 0) beaten.push({ id: 'longestCrash', period }); c.longestCrash = f.distance; }
      if (c.shortest === null || f.distance > c.shortest) { if (c.shortest !== null) beaten.push({ id: 'shortest', period }); c.shortest = f.distance; }
    }
  }
  for (const b of beaten) if (!r.fresh.includes(b.id)) r.fresh.push(b.id);
  return beaten;
}

// The Monday (ISO date) of the week that contains the ISO date `iso` ('2026-10-27' -> '2026-10-26').
export function mondayOf(iso) {
  const d = new Date(`${iso}T00:00:00Z`), back = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

// The menu calls this with today's date: a new week starts the THIS WEEK numbers from zero, and remembers where KINDS and MISSIONS stood.
export function rollWeek(save, iso) {
  const r = ensure(save), start = mondayOf(iso);

  r.week = { ...counts(), start, kindsBase: treeTags(save), missionsBase: (save.missionsDone || []).length };
  return true;
}

// Every number the screen shows: values(save)[period][boardId] (null = nothing yet, shown as a dash).
export function values(save) {
  const r = ensure(save), tags = treeTags(save), done = (save.missionsDone || []).length;
  const pick = (c, period) => ({
    longest: c.longest || null,
    kinds: period === 'ever' ? tags.length : tags.length,
    cool: c.cool,
    missions: period === 'ever' ? done : done,
    longestCrash: c.longestCrash || null,
    shortest: c.shortest,
    bird: c.bird,
    crashes: c.crashes,
  });
  return { ever: pick(r.ever, 'ever'), week: pick(r.week, 'week') };
}

// The boards beaten since the screen was last opened (the NEW RECORD! mark); opening the screen clears them.
export const fresh = save => ensure(save).fresh.slice();
export function clearFresh(save) { ensure(save).fresh = []; }
