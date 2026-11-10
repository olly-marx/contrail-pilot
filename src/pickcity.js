// TAP ANY CITY (ROUTING V2 step 1, research/DESIGN-ROUTING-V2.md; the user, 2026-11-09: "I should be able to click any city I want to go to and fly there, even in a different region, by the most direct route").
// Pure: no DOM, no clock, no random numbers. src/ui.js shows the card; src/globe.js uses nearestDot for the tap. A tap on the globe shows the city's NAME and its STOPS, then FLY;
// FLY sets the player's standing aim (save.aimCity, src/aim.js setGoto), the same field GO TO uses, and the flights steer there by the shortest way over the open network. No distances anywhere.
import { AREAS, areaOf, unlockedAreas } from './areas.js';
import { CROSSINGS, LADDER, sides } from './crossings.js';
import { linksFor, pathTo, legBetween } from './route.js';
import { capFor } from './capability.js';
import { city } from './network.js';

// Plain names of the crossings for the line 'Opens with the <name> crossing' (declared, one per crossing: tests/pickcity.cjs checks there is one for each).
export const CROSSING_NAMES = {
  'warsaw-stockholm': 'Baltic', 'khartoum-addis': 'Red Sea', 'hanoi-hongkong': 'South China', 'jakarta-darwin': 'Timor Sea', 'mexico-panama': 'Central America',
  tasman: 'Tasman', patagonia: 'Patagonia', 'north-atlantic': 'North Atlantic', 'reykjavik-newyork': 'Iceland', 'arabian-sea': 'Arabian Sea', caribbean: 'Caribbean',
  mediterranean: 'Mediterranean', 'silk-road': 'Silk Road', 'south-atlantic': 'South Atlantic', 'north-pacific': 'North Pacific', 'singapore-perth': 'Singapore',
  'indian-ocean': 'Indian Ocean', 'pacific-islands': 'Pacific Islands', 'honolulu-tokyo': 'Hawaii', 'nadi-auckland': 'Fiji', 'auckland-santiago': 'South Pacific', lap: 'Round the World',
};
export const MAX_DOTS = 6;   // the dots show at most six stops, then a plus (the HOME box does the same)

// The crossing that opens an area: one of its crossings whose OTHER end is already open, else the first of its crossings on the ladder. null if it has none.
export function openerOf(save, area) {
  const open = unlockedAreas(save), cs = CROSSINGS.filter(c => c.kind !== 'lap' && sides(c).includes(area));
  const next = cs.filter(c => open.includes(sides(c).find(s => s !== area)));
  return (next.length ? next : cs).slice().sort((a, b) => LADDER.indexOf(a.id) - LADDER.indexOf(b.id))[0] || null;   // the FIRST on the ladder: the one the player will meet first (src/crossings.js LADDER)
}

// What a tap on a city shows. state: 'here' | 'closed' | 'noroute' | 'ok' (only 'ok' can FLY).
export function cityCard(save, name) {
  if (!city(name)) return null;
  const card = (state, line, extra = {}) => ({ name, state, line, canFly: state === 'ok', stops: 0, dots: 0, moreDots: false, crossing: null, ...extra });
  if (save.city === name) return card('here', 'You are here.');
  const area = areaOf(name);
  if (area && !unlockedAreas(save).includes(area)) {
    const c = openerOf(save, area);
    return card('closed', c ? `Opens with the ${CROSSING_NAMES[c.id]} crossing` : 'Not open yet.', { crossing: c ? c.id : null });
  }
  const L = linksFor(save), path = L[save.city] && L[name] ? pathTo(save.city, name, L) : null;
  if (!path) {
    const pat = AREAS.patagonia.cities, split = pat.includes(name) !== pat.includes(save.city);   // one end in Patagonia, the other not, and no bridge yet
    return card('noroute', split && !(save.crossed || []).includes('patagonia') ? 'The Patagonia crossing flies there.' : 'No flight route there yet.', { crossing: split ? 'patagonia' : null });
  }
  const stops = path.length - 1;
  return card('ok', `${stops} stop${stops === 1 ? '' : 's'}`, { stops, dots: Math.min(stops, MAX_DOTS), moreDots: stops > MAX_DOTS });
}

// The whole way to a tapped city, for the globe's gold line: [the player's city, ..., the city] over the open network, or null (here, closed area, no route). Pure.
export function routeOf(save, name) {
  const c = cityCard(save, name);
  if (!c || c.state !== 'ok') return null;
  return pathTo(save.city, name, linksFor(save));
}

// HOW FAR (the user, 2026-11-10; research/ROUTE-ON-MAP-PLAN.md section 4): the airports the route passes and the trip as ONE flight in game km (the unit of the flights the player already reads), rounded to 100.
// routeKm: the sum of the route's legs (legBetween: the engine flies exactly these lengths). reachKm: the larger of the plane's capability estimate and the longest landed flight (the 'take the larger' rule the crossings use);
// 0 when neither is known: then no verdict is given (a player who has never landed a flight is told only the figure). Never a percentage, never the words range or capability, never a crossing's number.
export const routeKm = path => path.slice(1).reduce((a, c, i) => a + legBetween(path[i], c), 0);
export const roundKm = km => Math.round(km / 100) * 100;
export const reachKm = save => Math.max(Number(capFor(save, areaOf(save.city))) || 0, Number(save.bestDistance) || 0);
export function tripLine(save, name) {
  const way = routeOf(save, name); if (!way) return null;
  const airports = way.length - 2, km = roundKm(routeKm(way)), reach = reachKm(save);
  const first = airports === 0 ? 'Direct' : `${airports} airport${airports === 1 ? '' : 's'} on the way`;
  const verdict = reach > 0 && routeKm(way) > reach ? 'More than one flight: stops help.' : null;
  return { airports, km, reach, verdict, line: `${first}, about ${km.toLocaleString('en-GB')} km.` };
}

// The tap rule: the NEAREST dot within r canvas pixels of the finger (a tap picks the nearest city within a finger's width, never the first in the list). dots: [{ name, x, y }].
export function nearestDot(dots, x, y, r) {
  let best = null, bd = r;
  for (const d of dots) { const e = Math.hypot(d.x - x, d.y - y); if (e < bd) { bd = e; best = d; } }
  return best;
}
