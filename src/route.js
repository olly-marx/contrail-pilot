// The journey: a loop of real cities eastwards round the world, from LONDON back to LONDON.
// Each flight takes off from the city you last landed in (save.city) and the airports ahead are
// the next cities on the loop. Leg lengths are the real great-circle distances between the
// airports, stretched to at least LEG_MIN (London-Paris is only 347 km) and capped at LEG_MAX
// (ocean crossings), so every leg stays playable. Getting back to LONDON completes a lap.
export const LEG_MIN = 1000;   // shorter and a plane that is never tapped drifts down onto the runway by itself
export const LEG_MAX = 3000;

export const ROUTE = [
  { name: 'LONDON', lat: 51.47, lon: -0.45 },
  { name: 'PARIS', lat: 49.01, lon: 2.55 },
  { name: 'BERLIN', lat: 52.36, lon: 13.50 },
  { name: 'ROME', lat: 41.80, lon: 12.25 },
  { name: 'ATHENS', lat: 37.94, lon: 23.94 },
  { name: 'CAIRO', lat: 30.12, lon: 31.41 },
  { name: 'DUBAI', lat: 25.25, lon: 55.36 },
  { name: 'DELHI', lat: 28.56, lon: 77.10 },
  { name: 'BANGKOK', lat: 13.69, lon: 100.75 },
  { name: 'BEIJING', lat: 40.08, lon: 116.58 },
  { name: 'TOKYO', lat: 35.55, lon: 139.78 },
  { name: 'ANCHORAGE', lat: 61.17, lon: -150.00 },
  { name: 'VANCOUVER', lat: 49.19, lon: -123.18 },
  { name: 'CHICAGO', lat: 41.97, lon: -87.90 },
  { name: 'NEW YORK', lat: 40.64, lon: -73.78 },
  { name: 'REYKJAVIK', lat: 63.99, lon: -22.60 },
];

const rad = d => d * Math.PI / 180;
// Great-circle distance in km (haversine).
export function realKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}
export const cityAt = i => ROUTE[((i % ROUTE.length) + ROUTE.length) % ROUTE.length];
export const cityIndex = name => ROUTE.findIndex(c => c.name === name);
// Game length (km) of the leg from city i to city i + 1, rounded to 10 km.
export const legKm = i => Math.round(Math.min(LEG_MAX, Math.max(LEG_MIN, realKm(cityAt(i), cityAt(i + 1)))) / 10) * 10;
// How many stops from city `from` to city `to`, going forwards round the loop (0 = same city).
export const stopsBetween = (from, to) => ((to - from) % ROUTE.length + ROUTE.length) % ROUTE.length;
