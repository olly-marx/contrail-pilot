// Progress lives only on this device (localStorage). No accounts, nothing sent anywhere.
// v2: upgrade lines with levels, tree cargo economy, tutorial flag. v1 saves are not carried over.
import { migrateMissions } from './missions.js';
import { migrateBadges } from './badges.js';
import { migrateCity } from './route.js';
import { newFleet, migrateFleet, syncFleet } from './fleet.js';

const KEY = 'contrailPilot.v2';
// A second copy, written with every save (2026-10-22: a phone lost a save). If the main copy is
// missing or cannot be read, the game loads this one. An unreadable save is kept aside under
// UNREADABLE, never overwritten. (A browser that wipes ALL of a site's storage wipes both.)
const BACKUP = KEY + '.backup', UNREADABLE = KEY + '.unreadable';
// Safety copies (the user lost a 260-flight save, 2026-11-05): before anything REPLACES the local save (the online copy, another pilot's, a reset, a load
// failure) the current one is kept under replaced-1 (newest) .. replaced-3, and the Settings sheet can bring one back. A blank save is never kept.
const STASH_N = 3, STASH = n => `${KEY}.replaced-${n}`;

const DEFAULTS = {
  seeds: 0,            // main money: grabbed in the sky, kept only if you land safely (was 'trees')
  crystals: 0,         // ice crystals: earned by smart contrail flying, kept even if you crash
  levels: {},          // upgrade line id -> levels bought
  fuel: 'kerosene',    // chosen fuel id
  badges: [],
  bestDistance: 0,     // longest landed flight, m
  flights: 0,
  seenTips: [],        // first-time tips already shown
  dayNightSeen: {},    // dusk/dawn -> how many times the day/night banner has shown (it stops after DAYNIGHT.bannerTimes)
  tutorialDone: false,
  freeUpgrade: false,  // true after the first landing until the free upgrade is picked
  freeGiven: false,
  landings: 0,
  planted: {},         // species id -> trees planted, all flights (drives the Biodiversity meter)
  city: 'LONDON',      // the journey: the city you are in (src/route.js); flights start there. (An index before 2026-10-22.)
  heading: null,       // the first city of the direction chosen before take-off (one of route.js choices)
  aimKey: null,        // 'AIM HERE' (the MISSIONS screen, src/aim.js): the key of the city mission the route aims at; null = the first open one
  skipAim: false,      // 'Skip the mission route this trip' (src/aim.js): kept by a crash, cleared by the next landing (rules.js, with heading)
  flightSeconds: 0,    // real seconds flown, take-off to landing or crash (src/eras.js: eras open by flying time)
  flownKm: 0,          // every km flown (not flight school): "times round the Earth" = flownKm / EARTH_KM
  laps: 0,             // laps of the old 16-city loop (before 2026-10-22); kept, and counted into flownKm once
  visited: ['LONDON'], // cities landed in (a first landing in a new city pays a bonus)
  mission: 0,          // how many missions are done (src/missions.js); which ones: missionsDone
  unclaimed: [],       // retired in R8 (prizes are paid the moment they are earned); only src/rewards.js migrateClaims reads an older save's list, once
  coolLandings: 0,     // landings with the Earth cooler than at take-off (Cool Planet badge)
  // missionsDone and badgeTiers are NOT defaults: a save without them is converted from the old
  // mission list and badges once (missions.js migrateMissions, badges.js migrateBadges).
  fleet: null,         // the plane side since the eras (src/fleet.js): planes owned, systems, gadgets. Set below.
  muted: false,
  musicOff: false,     // the MUSIC chip in Settings (src/music.js); the one `muted` flag still wins. A game-only field: tests/sim-bank.cjs VIEW_ONLY
  priceVersion: 2,     // saves from before the 2026-10-21 price change are re-valued once (src/reprice.js)
};

// How far a save has got: only things that never go down (seeds are spent, so they are not counted). One number, so two saves can be compared:
// the online copy never replaces a save with MORE progress, and a blank save never replaces one that has some (src/online.js, writeSave below).
export function progressOf(s) {
  if (!s || typeof s !== 'object') return 0;
  const sum = o => Object.values(o && typeof o === 'object' ? o : {}).reduce((a, n) => a + (Number(n) || 0), 0);
  const missions = Math.max(Number(s.mission) || 0, Array.isArray(s.missionsDone) ? s.missionsDone.length : 0);
  const planes = s.fleet && s.fleet.planes ? Math.max(0, Object.keys(s.fleet.planes).length - 1) : 0;   // (the first plane is everyone's: a new save must score 0)
  return (Number(s.landings) || 0) + (Number(s.flights) || 0) / 10 + missions * 3 + sum(s.levels) * 2 + sum(s.planted) / 2 + planes;
}
// Blank: nothing worth keeping (a brand-new player, or the defaults after a failed load). Under 1 point = no landing and fewer than 10 flights.
export const isBlank = s => progressOf(s) < 1;

function readRaw(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return undefined; }   // undefined: there but unreadable
}

// A stored save made whole: defaults filled in and old saves brought up to date. Pure (no storage), so the
// sim engine (src/sim/world.js) prepares a save exactly as the game does. A missing save: a new player.
export function prepareSave(saved) {
  if (!saved || typeof saved !== 'object') return { ...structuredClone(DEFAULTS), fleet: newFleet() };
  const s = { ...DEFAULTS, ...saved };
  if (!('priceVersion' in saved)) s.priceVersion = 1;   // from before the price change: re-valued once (src/reprice.js)
  if ('trees' in s) { s.seeds = (s.seeds || 0) + s.trees; delete s.trees; }   // money was called 'trees' before 2026-10-16
  migrateMissions(s);   // 2026-10-22: missions became lessons, badges became tiered achievements
  migrateBadges(s);
  migrateCity(s);       // 2026-10-22: the city became a name in a world network of ~100
  delete s.challenges;
  if (!saved.fleet) migrateFleet(s);   // 2026-10-23: the eras reset (plane side only)
  syncFleet(s);
  return s;
}

// HELD: a save was there but could not be read (or made whole). The game starts a blank save IN MEMORY and writes NOTHING until the player says what to do
// (src/main.js shows the card: TRY AGAIN, or START A NEW GAME after a second tap). Without it the blank save was written over the main copy AND the backup.
let held = null;
export const heldReason = () => held;
export const holdWrites = reason => { held = reason || 'unreadable'; };
export const releaseHold = () => { held = null; };

const keepUnreadable = raw => { try { if (raw && !localStorage.getItem(UNREADABLE)) localStorage.setItem(UNREADABLE, raw); } catch (e) {} };

export function loadSave() {
  const blank = () => ({ ...structuredClone(DEFAULTS), fleet: newFleet() });
  try {
    let saved = readRaw(KEY), why = null;
    if (saved === undefined) {   // unreadable: keep it aside, never write over it unseen
      why = 'unreadable'; keepUnreadable(localStorage.getItem(KEY));
    }
    if (!saved || typeof saved !== 'object') {
      const bk = readRaw(BACKUP);
      if (bk === undefined) { why = 'unreadable'; keepUnreadable(localStorage.getItem(BACKUP)); }
      saved = bk;
    }
    try { const s = prepareSave(saved); if (saved && typeof saved === 'object') why = null; else if (why) holdWrites(why); return s; }
    catch (e) {   // the copy parsed but could not be made whole: keep its text, try the other copy
      keepUnreadable(localStorage.getItem(KEY));
      const bk = readRaw(BACKUP);
      if (bk && typeof bk === 'object') { try { return prepareSave(bk); } catch (e2) { /* both bad */ } }
      holdWrites('unreadable');
      return blank();
    }
  } catch (e) {
    holdWrites('unreadable');
    return blank();
  }
}

// opts.allowBlank: the caller MEANS to replace what is there with a blank save (a reset, START A NEW GAME).
export function writeSave(save, opts = {}) {
  if (held) return;   // see HELD above
  try {
    if (!opts.allowBlank && isBlank(save)) {   // a blank save never replaces one that has progress, in either copy
      const a = readRaw(KEY), b = readRaw(BACKUP);
      if ((a && !isBlank(a)) || (b && !isBlank(b))) return;
    }
    const raw = JSON.stringify(save); localStorage.setItem(KEY, raw); localStorage.setItem(BACKUP, raw);
  } catch (e) { /* private mode: play on without saving */ }
}

// Keep the CURRENT local save (main copy, else the backup) before something replaces it. Newest is replaced-1; the three newest are kept.
// Skips a blank save and a copy identical to the newest one. Returns true if it kept one.
export function stashSave(reason) {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(BACKUP);
    if (!raw) return false;
    let o; try { o = JSON.parse(raw); } catch (e) { return false; }   // unreadable ones are kept under UNREADABLE
    if (isBlank(o)) return false;
    const top = (() => { try { return JSON.parse(localStorage.getItem(STASH(1))); } catch (e) { return null; } })();
    if (top && top.raw === raw) return false;
    for (let n = STASH_N; n > 1; n--) { const prev = localStorage.getItem(STASH(n - 1)); if (prev) localStorage.setItem(STASH(n), prev); else localStorage.removeItem(STASH(n)); }
    localStorage.setItem(STASH(1), JSON.stringify({ at: Date.now(), reason: reason || '', flights: o.flights || 0, landings: o.landings || 0, raw }));
    return true;
  } catch (e) { return false; }
}
// What the Settings sheet lists: [{ n, at, reason, flights, landings }] newest first.
export function listStashed() {
  const out = [];
  for (let n = 1; n <= STASH_N; n++) {
    try { const e = JSON.parse(localStorage.getItem(STASH(n))); if (e && e.raw) out.push({ n, at: e.at, reason: e.reason, flights: e.flights, landings: e.landings }); } catch (e) { /* skip */ }
  }
  return out;
}
// Put safety copy n back as the local save (the current one is kept first). The caller reloads the page. Returns true on success.
export function restoreStashed(n) {
  try {
    const e = JSON.parse(localStorage.getItem(STASH(n)));
    if (!e || !e.raw) return false;
    JSON.parse(e.raw);   // it must still be readable
    stashSave('before going back to an earlier save');
    localStorage.setItem(KEY, e.raw); localStorage.setItem(BACKUP, e.raw);
    releaseHold();
    return true;
  } catch (e) { return false; }
}

// Put a READ and MIGRATED backup (src/backup.js readBackup) in as the local save. The current game is kept FIRST (the three rolling safety copies): if it has progress and
// the copy did not take, NOTHING is replaced ('not-kept'). The caller reloads the page. Returns 'ok' | 'not-kept' | 'error'.
export function restoreFromBackup(save) {
  try {
    const cur = localStorage.getItem(KEY) || localStorage.getItem(BACKUP);
    let curObj = null; try { curObj = cur ? JSON.parse(cur) : null; } catch (e) { curObj = null; }
    stashSave('before restoring a backup');
    if (cur && curObj && !isBlank(curObj)) {
      let top = null; try { top = JSON.parse(localStorage.getItem(STASH(1))); } catch (e) { top = null; }
      if (!top || top.raw !== cur) return 'not-kept';
    }
    const raw = JSON.stringify(save); localStorage.setItem(KEY, raw); localStorage.setItem(BACKUP, raw);
    releaseHold();
    return 'ok';
  } catch (e) { return 'error'; }
}

export function resetSave() {
  stashSave('before a reset');   // a reset can be undone from Settings: RECOVER AN EARLIER SAVE
  try { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP); } catch (e) {}
  releaseHold();
  return { ...structuredClone(DEFAULTS), fleet: newFleet() };
}
