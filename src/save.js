// Progress lives only on this device (localStorage). No accounts, nothing sent anywhere.
// v2: upgrade lines with levels, tree cargo economy, tutorial flag. v1 saves are not carried over.
import { migrateMissions } from './missions.js';
import { migrateBadges } from './badges.js';
import { migrateCity } from './route.js';

const KEY = 'contrailPilot.v2';
// A second copy, written with every save (2026-10-22: a phone lost a save). If the main copy is
// missing or cannot be read, the game loads this one. An unreadable save is kept aside under
// UNREADABLE, never overwritten. (A browser that wipes ALL of a site's storage wipes both.)
const BACKUP = KEY + '.backup', UNREADABLE = KEY + '.unreadable';

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
  flownKm: 0,          // every km flown (not flight school): "times round the Earth" = flownKm / EARTH_KM
  laps: 0,             // laps of the old 16-city loop (before 2026-10-22); kept, and counted into flownKm once
  visited: ['LONDON'], // cities landed in (a first landing in a new city pays a bonus)
  mission: 0,          // how many missions are done (src/missions.js); which ones: missionsDone
  unclaimed: [],       // prizes waiting for the player to tap CLAIM (src/rewards.js)
  coolLandings: 0,     // landings with the Earth cooler than at take-off (Cool Planet badge)
  // missionsDone and badgeTiers are NOT defaults: a save without them is converted from the old
  // mission list and badges once (missions.js migrateMissions, badges.js migrateBadges).
  muted: false,
  priceVersion: 2,     // saves from before the 2026-10-21 price change are re-valued once (src/reprice.js)
};

function readRaw(key) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return undefined; }   // undefined: there but unreadable
}

export function loadSave() {
  try {
    let saved = readRaw(KEY);
    if (saved === undefined) {   // unreadable: keep it aside, never write over it unseen
      try { if (!localStorage.getItem(UNREADABLE)) localStorage.setItem(UNREADABLE, localStorage.getItem(KEY)); } catch (e) {}
    }
    if (!saved || typeof saved !== 'object') saved = readRaw(BACKUP);
    if (!saved || typeof saved !== 'object') return structuredClone(DEFAULTS);
    const s = { ...DEFAULTS, ...saved };
    if (!('priceVersion' in saved)) s.priceVersion = 1;   // from before the price change: re-valued once (src/reprice.js)
    if ('trees' in s) { s.seeds = (s.seeds || 0) + s.trees; delete s.trees; }   // money was called 'trees' before 2026-10-16
    migrateMissions(s);   // 2026-10-22: missions became lessons, badges became tiered achievements
    migrateBadges(s);
    migrateCity(s);       // 2026-10-22: the city became a name in a world network of ~100
    delete s.challenges;
    return s;
  } catch (e) {
    return structuredClone(DEFAULTS);
  }
}

export function writeSave(save) {
  try { const raw = JSON.stringify(save); localStorage.setItem(KEY, raw); localStorage.setItem(BACKUP, raw); } catch (e) { /* private mode: play on without saving */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(BACKUP); } catch (e) {}
  return structuredClone(DEFAULTS);
}
