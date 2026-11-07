// The two screens a CROSSING flight ends on (release 2 of the crossing-as-a-pure-experience plan; the user's playtest of 0.30.2: "its OWN landing screen and its OWN crash
// screen, like when you get a new plane"; research/CROSSING-EXPERIENCE.md). Pure: no DOM, no clock, no random numbers. src/ui.js showCrossingEnd draws it; tests/crossingend.cjs holds
// its budgets and meaning. NO distance anywhere (no km, no metres, no record), no missions, no seeds count: a crossing is a pure flight.
import { AREAS } from './areas.js';
import { LANDMARKS } from './landmarks.js';
import { planeById } from './fleet.js';

export const TITLE_MAX = 26;   // "WELCOME TO " + the longest city name + "!" (the payoff card is 380 px at most; the title wraps to two lines beyond this)
export const LINE_MAX = 26;    // a paragraph line at 10 px in the 320 px card: MEASURED ~27 characters fit (the pixel font is ~10 px a character at 10 px), so 26. (The 8 px alternative was too small for 7-10 year olds.)
const areaName = id => (AREAS[id] ? AREAS[id].name : 'the Pacific');

// r: the flight's result (r.crossing = { id, kind, landed, opens, to }, r.landedAt, r.crystals, r.cargo); save: after the flight; first: this was the player's first crossing.
export function endView(r, save, { first = false } = {}) {
  const c = r.crossing || {};
  if (c.landed) {
    const city = r.landedAt || c.to, lm = LANDMARKS[city];
    const nm = areaName(c.opens), lines = [`${nm[0].toUpperCase()}${nm.slice(1)}`, 'is open to you!', first ? 'New missions are open!' : 'More cities to fly to!'];
    return { kind: 'landed', eyebrow: 'A NEW WAY OPENED', title: `WELCOME TO ${city}!`, lines, pic: lm ? `assets/${lm.key}.png` : null, buttons: [{ id: 'on', label: 'FLY ON' }] };
  }
  const f = save && save.fleet ? planeById(save.fleet.plane) : null, kept = r.crystals || 0, lost = r.cargo || 0;
  const lines = ['Try again!', kept ? `You keep ${kept} ice ${kept === 1 ? 'crystal' : 'crystals'}.` : 'Plane and nature are safe.'];
  if (lost > 0) lines.push('Carried seeds are lost.');
  return { kind: 'crash', eyebrow: 'THE CROSSING', title: 'NOT THIS TIME', lines, pic: f && f.portrait ? f.portrait : null, buttons: [{ id: 'again', label: 'TRY AGAIN' }, { id: 'home', label: 'HOME' }] };
}
