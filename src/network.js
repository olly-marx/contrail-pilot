// The world network (the user, 2026-10-22): ~100 airports, any direction. Each city links to its
// nearest neighbours (up to NEAR, within NEAR_KM) plus the declared ocean BRIDGES (src/cities.js).
// Leg lengths in the game are BALANCED, not real (the user: no very short legs, no endless ones):
// every leg is LEG_LO to LEG_HI game km (about 14-20 s of flying), longer real hops a bit longer.
import { CITIES, BRIDGES } from './cities.js';
import { realKm } from './geo.js';

export const NEAR = 5, NEAR_KM = 2600;   // (4 left Nairobi with two NORTH buttons)
export const LEG_LO = 1800, LEG_HI = 2600, REAL_LO = 800, REAL_HI = 5000;
export const legGameKm = real => Math.round((LEG_LO + (LEG_HI - LEG_LO) * Math.min(1, Math.max(0, (real - REAL_LO) / (REAL_HI - REAL_LO)))) / 10) * 10;

export const city = name => CITIES.find(c => c.name === name);
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
// Compass bearing from a to b (0 = north, 90 = east).
export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

// LINKS[name] = sorted list of neighbour names.
export const LINKS = (() => {
  const L = Object.fromEntries(CITIES.map(c => [c.name, new Set()]));
  const link = (a, b) => { L[a].add(b); L[b].add(a); };
  for (const c of CITIES) CITIES.filter(o => o !== c).map(o => [o, realKm(c, o)]).filter(([, d]) => d <= NEAR_KM)
    .sort((x, y) => x[1] - y[1]).slice(0, NEAR).forEach(([o]) => link(c.name, o.name));
  for (const [a, b] of BRIDGES) link(a, b);
  return Object.fromEntries(Object.entries(L).map(([k, v]) => [k, [...v].sort()]));
})();

// The heading words a child sees on the three buttons.
const WORDS = ['NORTH', 'NORTH-EAST', 'EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST'];
export const headingWord = deg => WORDS[Math.round(deg / 45) % 8];
const gap = (x, y) => { const d = Math.abs(x - y) % 360; return d > 180 ? 360 - d : d; };

// The three choices before take-off: the neighbours pointing in the most different directions
// (the three whose closest pair is furthest apart); fewer if the city has fewer links.
export function choices(name) {
  const here = city(name), opts = LINKS[name].map(n => ({ name: n, deg: bearing(here, city(n)) }));
  if (opts.length <= 3) return opts.sort((a, b) => a.deg - b.deg);
  let best = null, score = -1;
  for (let i = 0; i < opts.length; i++) for (let j = i + 1; j < opts.length; j++) for (let k = j + 1; k < opts.length; k++) {
    const t = [opts[i], opts[j], opts[k]], s = Math.min(gap(t[0].deg, t[1].deg), gap(t[0].deg, t[2].deg), gap(t[1].deg, t[2].deg));
    if (s > score) { score = s; best = t; }
  }
  return best.sort((a, b) => a.deg - b.deg);
}

// Past an airport you keep going the same way: the next one is the neighbour that turns least
// (never straight back).
export function onward(prev, cur) {
  const p = city(prev), c = city(cur), heading = (bearing(c, p) + 180) % 360;
  return LINKS[cur].filter(n => n !== prev).map(n => ({ n, t: gap(bearing(c, city(n)), heading) })).sort((a, b) => a.t - b.t)[0].n;
}
// The chain of airports ahead after choosing `first` from `from` (for the globe and the flight).
export function pathAhead(from, first, count = 6) {
  const out = [from, first];
  while (out.length < count + 1) out.push(onward(out[out.length - 2], out[out.length - 1]));
  return out.slice(1);
}
