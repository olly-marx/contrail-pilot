// Progress lives only on this device (localStorage). No accounts, nothing sent anywhere.
// v2: upgrade lines with levels, tree cargo economy, tutorial flag. v1 saves are not carried over.
const KEY = 'contrailPilot.v2';

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
  city: 0,             // the journey: index into ROUTE (src/route.js) of the city you are in; flights start there
  laps: 0,             // times round the world back to LONDON
  mission: 0,          // index into MISSIONS (src/missions.js); the game's spine
  muted: false,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const s = { ...DEFAULTS, ...JSON.parse(raw) };
    if ('trees' in s) { s.seeds = (s.seeds || 0) + s.trees; delete s.trees; }   // money was called 'trees' before 2026-10-16
    return s;
  } catch (e) {
    return structuredClone(DEFAULTS);
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode: play on without saving */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return structuredClone(DEFAULTS);
}
