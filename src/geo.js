// What is below the plane (the user, 2026-10-22: real geography decides the region). A flight leg is
// the real great circle between two airports; the plane's progress along the GAME leg is mapped onto
// it, and the point below is looked up in LAND: boxes [region, south, north, west, east] in degrees,
// checked in order (first match wins, so small special places come first). Not in any box = ocean.
// Hand-drawn and coarse on purpose: it is DECLARED here, so it can be read and corrected.
// tests/geo.cjs checks every route city lands in its region and known seas are sea.
export const LAND = [
  // Islands and small places first.
  ['tundra', 63, 67, -25, -13],            // Iceland
  ['ice', 59.5, 70, -54, -40],             // Greenland (south)
  ['ice', 70, 84, -73, -18],               // Greenland (north)
  ['woodland', 49.8, 59, -11, 2],          // Britain and Ireland
  ['eastasia', 30, 46, 129, 146],          // Japan
  ['eastasia', 22, 25.5, 120, 122],        // Taiwan
  ['monsoon', 5.5, 10, 79.5, 82],          // Sri Lanka
  ['monsoon', -9, 7, 95, 120],             // Sumatra, Borneo, Java
  ['savanna', -26, -12, 43, 51],           // Madagascar
  ['ice', -90, -62, -180, 180],            // Antarctica
  // Europe and the Mediterranean.
  ['mediterranean', 36, 44, -10, 3.5],     // Iberia
  ['mediterranean', 37.5, 46, 6.5, 19],    // Italy and the south of France coast
  ['mediterranean', 34.8, 35.7, 23.5, 26.3],   // Crete
  ['mediterranean', 36.3, 42, 19.5, 36],   // Greece, Turkey's coast
  ['mediterranean', 30, 37.5, -10, 11.5],  // north-west Africa's coast (Morocco, Algeria, Tunisia)
  ['boreal', 58, 72, 5, 32],               // Norway, Sweden, Finland
  ['woodland', 43, 60, -5, 40],            // the rest of Europe
  ['boreal', 55, 72, 5, 180],              // Scandinavia and Siberia's forests
  ['boreal', 60, 72, -180, -168],          // Chukotka
  // Africa and Arabia.
  ['desert', 15, 31.5, -17, 34],           // Sahara, Egypt (to the Mediterranean shore)
  ['desert', 12, 32, 34, 60],              // Sinai, Arabia
  ['desert', 25, 40, 44, 60],              // Iran
  ['desert', 24, 40, 60, 70],              // Iran, Afghanistan, Pakistan
  ['desert', 36, 50, 50, 100],             // Central Asian deserts, Gobi
  ['savanna', -35, 15, -17, 52],           // the rest of Africa
  // Asia.
  ['monsoon', 7, 30, 68, 82],              // India
  ['monsoon', 20, 30, 82, 97],             // north-east India, Bangladesh
  ['monsoon', 7, 28, 92, 110],             // Myanmar, Thailand, Indochina
  ['monsoon', 5, 19, 117, 127],            // the Philippines
  ['eastasia', 18, 55, 100, 135],          // China, Korea
  ['woodland', 40, 55, 40, 50],            // the plains north of the Caucasus
  // The Americas.
  ['tundra', 66, 84, -170, -60],           // Arctic North America
  ['boreal', 50, 72, -168, -55],           // Alaska and Canada
  ['boreal', 41, 50, -125, -110],          // the Rockies and Pacific north-west
  ['plains', 25, 50, -110, -60],           // the Great Plains to New York
  ['plains', 30, 41, -125, -110],          // California and the south-west
  ['plains', 15, 30, -118, -80],           // Mexico
  ['rainforest', 7, 15, -92, -77],         // Central America
  ['rainforest', -25, 11, -82, -34],       // the Amazon and the Atlantic Forest
  ['plains', -56, -25, -76, -48],          // the Pampas and Patagonia (no region of their own yet)
  // Australia and New Zealand (no region of their own yet: part B will decide).
  ['desert', -39, -11, 113, 154],          // Australia
  ['islandforest', -47, -34, 166, 179],        // New Zealand
];

const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
// Great-circle distance in km (haversine).
export function realKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
const wrap = lon => ((lon + 540) % 360) - 180;

// The region at a latitude/longitude (one of the REGION_DATA ids, 'ocean' or 'ice').
export function regionAt(lat, lon) {
  lon = wrap(lon);
  for (const [r, s, n, w, e] of LAND) if (lat >= s && lat <= n && lon >= w && lon <= e) return r;
  return 'ocean';
}

// The point a fraction f (0..1) of the way along the great circle from a to b ({ lat, lon }).
export function along(a, b, f) {
  const p1 = rad(a.lat), l1 = rad(a.lon), p2 = rad(b.lat), l2 = rad(b.lon);
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  if (d === 0) return { lat: a.lat, lon: a.lon };
  const A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
  const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
  const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
  const z = A * Math.sin(p1) + B * Math.sin(p2);
  return { lat: deg(Math.atan2(z, Math.hypot(x, y))), lon: deg(Math.atan2(y, x)) };
}

// The sea is squeezed (the user, 2026-10-22: ocean is its own terrain, but shorter than it really
// is): a stretch of ocean takes OCEAN_SHARE of the game distance it would take over land.
export const OCEAN_SHARE = 0.35;
const SAMPLES = 200;
const MIN_RUN = 0.04;   // shorter runs merge into a neighbour

// A leg's strip: what is below from take-off to landing, as runs [{ region, from, to }] in GAME
// fractions (0..1), with the ocean squeezed. Cached per pair of airports.
const cache = new Map();
export function legStrip(a, b) {
  const key = `${a.lat},${a.lon}>${b.lat},${b.lon}`;
  if (cache.has(key)) return cache.get(key);
  const cells = [];
  for (let i = 0; i < SAMPLES; i++) { const p = along(a, b, (i + 0.5) / SAMPLES); cells.push(regionAt(p.lat, p.lon)); }
  const w = cells.map(r => (r === 'ocean' ? OCEAN_SHARE : 1)), total = w.reduce((x, y) => x + y, 0);
  const runs = []; let at = 0;
  cells.forEach((r, i) => {
    const to = at + w[i] / total, last = runs[runs.length - 1];
    if (last && last.region === r) last.to = to; else runs.push({ region: r, from: at, to });
    at = to;
  });
  // Merge slivers (a 1% blip of sea between two bits of land would just flicker): give them to the run before.
  for (let i = runs.length - 1; i > 0; i--) if (runs[i].to - runs[i].from < MIN_RUN) { runs[i - 1].to = runs[i].to; runs.splice(i, 1); }
  for (let i = runs.length - 1; i > 0; i--) if (runs[i].region === runs[i - 1].region) { runs[i - 1].to = runs[i].to; runs.splice(i, 1); }
  if (runs.length > 1 && runs[0].to < MIN_RUN) { runs[1].from = 0; runs.shift(); }
  runs[runs.length - 1].to = 1;
  // The runway is never on the sea (0.11.3): a coastal airport's own land (Lisbon is 20 km from the coast) is a short run that the
  // merging above gives to the sea, so put it back: the first and last MIN_RUN of a leg show the land under the airport.
  const home = regionAt(a.lat, a.lon), dest = regionAt(b.lat, b.lon);
  if (home !== 'ocean' && runs[0].region !== home) { for (const r of runs) r.from = Math.max(r.from, MIN_RUN); while (runs.length > 1 && runs[0].to <= MIN_RUN) runs.shift(); runs[0].from = MIN_RUN; runs.unshift({ region: home, from: 0, to: MIN_RUN }); }
  if (dest !== 'ocean' && runs[runs.length - 1].region !== dest) { for (const r of runs) r.to = Math.min(r.to, 1 - MIN_RUN); while (runs.length > 1 && runs[runs.length - 1].from >= 1 - MIN_RUN) runs.pop(); runs[runs.length - 1].to = 1 - MIN_RUN; runs.push({ region: dest, from: 1 - MIN_RUN, to: 1 }); }
  cache.set(key, runs);
  return runs;
}

// The region below at game fraction f (0..1) of the leg from a to b.
export function regionBelow(a, b, f) {
  const runs = legStrip(a, b), x = Math.min(1, Math.max(0, f));
  return (runs.find(r => x >= r.from && x <= r.to) || runs[runs.length - 1]).region;
}
