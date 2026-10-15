// Progress lives only on this device (localStorage). No accounts, nothing sent anywhere.
// v2: upgrade lines with levels, tree cargo economy, tutorial flag. v1 saves are not carried over.
const KEY = 'contrailPilot.v2';

const DEFAULTS = {
  trees: 0,            // currency, only added when you land safely
  levels: {},          // upgrade line id -> levels bought
  fuel: 'kerosene',    // chosen fuel id
  badges: [],
  bestDistance: 0,     // longest landed flight, m
  flights: 0,
  seenTips: [],        // first-time tips already shown
  tutorialDone: false,
  muted: false,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : structuredClone(DEFAULTS);
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
