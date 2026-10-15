// Progress lives only on this device (localStorage). No accounts, nothing sent anywhere.
const KEY = 'contrailPilot.v1';

const DEFAULTS = {
  trees: 0,            // currency
  owned: [],           // upgrade ids bought
  fuel: 'kerosene',    // equipped fuel: kerosene | saf | hydrogen
  badges: [],
  bestDistance: 0,     // longest landed flight, m
  flights: 0,
  seenTips: [],        // first-time tips already shown
  muted: false,
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode: play on without saving */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  return { ...DEFAULTS };
}
