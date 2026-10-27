// The airports of the world journey (the user, 2026-10-22: 50-100 cities covering every region, any
// direction). Coordinates are the airports'. Each city's region comes from src/geo.js (tests/geo.cjs
// checks it matches `region` here). The network joins each city to its nearest neighbours, plus the
// declared BRIDGES over the oceans (src/route.js).
const BASE_CITIES = [
  // UK and Europe (woodland)
  { name: 'LONDON', lat: 51.47, lon: -0.45, region: 'woodland' },
  { name: 'PARIS', lat: 49.01, lon: 2.55, region: 'woodland' },
  { name: 'BERLIN', lat: 52.36, lon: 13.50, region: 'woodland' },
  { name: 'AMSTERDAM', lat: 52.31, lon: 4.76, region: 'woodland' },
  { name: 'EDINBURGH', lat: 55.95, lon: -3.37, region: 'woodland' },
  { name: 'DUBLIN', lat: 53.42, lon: -6.27, region: 'woodland' },
  { name: 'VIENNA', lat: 48.11, lon: 16.57, region: 'woodland' },
  { name: 'WARSAW', lat: 52.17, lon: 20.97, region: 'woodland' },
  { name: 'KYIV', lat: 50.34, lon: 30.89, region: 'woodland' },
  { name: 'MOSCOW', lat: 55.97, lon: 37.41, region: 'woodland' },
  // Mediterranean
  { name: 'ROME', lat: 41.80, lon: 12.25, region: 'mediterranean' },
  { name: 'ATHENS', lat: 37.94, lon: 23.94, region: 'mediterranean' },
  { name: 'MADRID', lat: 40.47, lon: -3.56, region: 'mediterranean' },
  { name: 'LISBON', lat: 38.77, lon: -9.13, region: 'mediterranean' },
  { name: 'BARCELONA', lat: 41.30, lon: 2.08, region: 'mediterranean' },
  { name: 'ISTANBUL', lat: 41.26, lon: 28.74, region: 'mediterranean' },
  { name: 'TUNIS', lat: 36.85, lon: 10.23, region: 'mediterranean' },
  { name: 'CASABLANCA', lat: 33.37, lon: -7.59, region: 'mediterranean' },
  // Desert
  { name: 'CAIRO', lat: 30.12, lon: 31.41, region: 'desert' },
  { name: 'DUBAI', lat: 25.25, lon: 55.36, region: 'desert' },
  { name: 'RIYADH', lat: 24.96, lon: 46.70, region: 'desert' },
  { name: 'DOHA', lat: 25.27, lon: 51.61, region: 'desert' },
  { name: 'MUSCAT', lat: 23.59, lon: 58.28, region: 'desert' },
  { name: 'TEHRAN', lat: 35.42, lon: 51.15, region: 'desert' },
  { name: 'KARACHI', lat: 24.90, lon: 67.16, region: 'desert' },
  { name: 'TASHKENT', lat: 41.26, lon: 69.28, region: 'desert' },
  { name: 'TAMANRASSET', lat: 22.81, lon: 5.45, region: 'desert' },
  { name: 'KHARTOUM', lat: 15.59, lon: 32.55, region: 'desert' },
  // Monsoon and rainforest Asia
  { name: 'DELHI', lat: 28.56, lon: 77.10, region: 'monsoon' },
  { name: 'BANGKOK', lat: 13.69, lon: 100.75, region: 'monsoon' },
  { name: 'MUMBAI', lat: 19.09, lon: 72.87, region: 'monsoon' },
  { name: 'KOLKATA', lat: 22.65, lon: 88.45, region: 'monsoon' },
  { name: 'CHENNAI', lat: 12.99, lon: 80.17, region: 'monsoon' },
  { name: 'KATHMANDU', lat: 27.70, lon: 85.36, region: 'monsoon' },
  { name: 'DHAKA', lat: 23.84, lon: 90.40, region: 'monsoon' },
  { name: 'COLOMBO', lat: 7.18, lon: 79.88, region: 'monsoon' },
  { name: 'HANOI', lat: 21.22, lon: 105.81, region: 'monsoon' },
  { name: 'KUALA LUMPUR', lat: 2.74, lon: 101.70, region: 'monsoon' },
  { name: 'SINGAPORE', lat: 1.36, lon: 103.99, region: 'monsoon' },
  { name: 'JAKARTA', lat: -6.13, lon: 106.66, region: 'monsoon' },
  { name: 'MANILA', lat: 14.51, lon: 121.02, region: 'monsoon' },
  // East Asia
  { name: 'BEIJING', lat: 40.08, lon: 116.58, region: 'eastasia' },
  { name: 'TOKYO', lat: 35.55, lon: 139.78, region: 'eastasia' },
  { name: 'SHANGHAI', lat: 31.14, lon: 121.81, region: 'eastasia' },
  { name: 'HONG KONG', lat: 22.31, lon: 113.91, region: 'eastasia' },
  { name: 'SEOUL', lat: 37.46, lon: 126.44, region: 'eastasia' },
  { name: 'CHENGDU', lat: 30.58, lon: 103.95, region: 'eastasia' },
  { name: 'OSAKA', lat: 34.43, lon: 135.23, region: 'eastasia' },
  { name: 'TAIPEI', lat: 25.08, lon: 121.23, region: 'eastasia' },
  { name: 'SAPPORO', lat: 42.78, lon: 141.69, region: 'eastasia' },
  { name: 'ULAANBAATAR', lat: 47.84, lon: 106.77, region: 'eastasia' },
  // Boreal forest and mountains (North America and Scandinavia)
  { name: 'ANCHORAGE', lat: 61.17, lon: -150.00, region: 'boreal' },
  { name: 'VANCOUVER', lat: 49.19, lon: -123.18, region: 'boreal' },
  { name: 'SEATTLE', lat: 47.45, lon: -122.31, region: 'boreal' },
  { name: 'CALGARY', lat: 51.13, lon: -114.02, region: 'boreal' },
  { name: 'FAIRBANKS', lat: 64.82, lon: -147.86, region: 'boreal' },
  { name: 'YELLOWKNIFE', lat: 62.46, lon: -114.44, region: 'boreal' },
  { name: 'IQALUIT', lat: 63.76, lon: -68.56, region: 'boreal' },
  { name: 'OSLO', lat: 60.19, lon: 11.10, region: 'boreal' },
  { name: 'STOCKHOLM', lat: 59.65, lon: 17.92, region: 'boreal' },
  { name: 'HELSINKI', lat: 60.32, lon: 24.96, region: 'boreal' },
  // Plains and eastern forest (and the grasslands of the south)
  { name: 'CHICAGO', lat: 41.97, lon: -87.90, region: 'plains' },
  { name: 'NEW YORK', lat: 40.64, lon: -73.78, region: 'plains' },
  { name: 'DENVER', lat: 39.86, lon: -104.67, region: 'plains' },
  { name: 'DALLAS', lat: 32.90, lon: -97.04, region: 'plains' },
  { name: 'ATLANTA', lat: 33.64, lon: -84.43, region: 'plains' },
  { name: 'LOS ANGELES', lat: 33.94, lon: -118.41, region: 'plains' },
  { name: 'MIAMI', lat: 25.79, lon: -80.29, region: 'plains' },
  { name: 'TORONTO', lat: 43.68, lon: -79.63, region: 'plains' },
  { name: 'WINNIPEG', lat: 49.91, lon: -97.24, region: 'plains' },
  { name: 'MEXICO CITY', lat: 19.44, lon: -99.07, region: 'plains' },
  { name: 'BUENOS AIRES', lat: -34.82, lon: -58.54, region: 'plains' },
  { name: 'SANTIAGO', lat: -33.39, lon: -70.79, region: 'plains' },
  // Iceland
  { name: 'REYKJAVIK', lat: 63.99, lon: -22.60, region: 'tundra' },
  { name: 'AKUREYRI', lat: 65.66, lon: -18.07, region: 'tundra' },
  // African savanna
  { name: 'NAIROBI', lat: -1.32, lon: 36.93, region: 'savanna' },
  { name: 'ADDIS ABABA', lat: 8.98, lon: 38.80, region: 'savanna' },
  { name: 'DAR ES SALAAM', lat: -6.88, lon: 39.20, region: 'savanna' },
  { name: 'JOHANNESBURG', lat: -26.14, lon: 28.24, region: 'savanna' },
  { name: 'CAPE TOWN', lat: -33.97, lon: 18.60, region: 'savanna' },
  { name: 'WINDHOEK', lat: -22.48, lon: 17.47, region: 'savanna' },
  { name: 'MAPUTO', lat: -25.92, lon: 32.57, region: 'savanna' },
  { name: 'LUANDA', lat: -8.86, lon: 13.23, region: 'savanna' },
  { name: 'KINSHASA', lat: -4.39, lon: 15.44, region: 'savanna' },
  { name: 'LAGOS', lat: 6.58, lon: 3.32, region: 'savanna' },
  { name: 'ACCRA', lat: 5.61, lon: -0.17, region: 'savanna' },
  { name: 'NIAMEY', lat: 13.48, lon: 2.18, region: 'savanna' },
  { name: 'ANTANANARIVO', lat: -18.80, lon: 47.48, region: 'savanna' },
  // South American rainforest
  { name: 'MANAUS', lat: -3.04, lon: -60.05, region: 'rainforest' },
  { name: 'BELEM', lat: -1.38, lon: -48.48, region: 'rainforest' },
  { name: 'SAO PAULO', lat: -23.43, lon: -46.47, region: 'rainforest' },
  { name: 'RIO', lat: -22.81, lon: -43.25, region: 'rainforest' },
  { name: 'BRASILIA', lat: -15.87, lon: -47.92, region: 'rainforest' },
  { name: 'LIMA', lat: -12.02, lon: -77.11, region: 'rainforest' },
  { name: 'QUITO', lat: -0.13, lon: -78.36, region: 'rainforest' },
  { name: 'BOGOTA', lat: 4.70, lon: -74.15, region: 'rainforest' },
  { name: 'CARACAS', lat: 10.60, lon: -66.99, region: 'rainforest' },
  { name: 'PANAMA', lat: 9.07, lon: -79.38, region: 'rainforest' },
  // Australia and New Zealand (no region of their own yet: desert / woodland for now)
  { name: 'SYDNEY', lat: -33.95, lon: 151.18, region: 'desert' },
  { name: 'PERTH', lat: -31.94, lon: 115.97, region: 'desert' },
  { name: 'DARWIN', lat: -12.41, lon: 130.88, region: 'desert' },
  { name: 'AUCKLAND', lat: -37.01, lon: 174.79, region: 'woodland' },
  // Island stepping stones over the big oceans
  { name: 'HONOLULU', lat: 21.32, lon: -157.92, region: 'ocean' },
  { name: 'NADI', lat: -17.76, lon: 177.44, region: 'ocean' },
];

// Ocean crossings (the nearest-neighbour links never make these): declared, both ways.
// SEASON 2 (the redesign, research/AREA-BALANCE.md): 14 new airports, in the game ONLY with ?season2=1 (src/season2.js),
// so the live network is unchanged. Regions are what src/geo.js says, except two the coarse land mask gets wrong
// (Hobart reads as sea, Nuuk as ice): declared here. The new biomes (patagonia, australia, newzealand) and skylines
// are later work (art budget); until then these use today's regions.
export const S2_CITIES = [
  { name: 'PUNTA ARENAS', lat: -53.00, lon: -70.85, region: 'plains' },
  { name: 'PUERTO MADRYN', lat: -42.76, lon: -65.10, region: 'plains' },
  { name: 'BALMACEDA', lat: -45.92, lon: -71.69, region: 'plains' },
  { name: 'MELBOURNE', lat: -37.67, lon: 144.84, region: 'desert' },
  { name: 'BRISBANE', lat: -27.38, lon: 153.12, region: 'desert' },
  { name: 'CAIRNS', lat: -16.88, lon: 145.75, region: 'desert' },
  { name: 'HOBART', lat: -42.84, lon: 147.51, region: 'woodland' },   // geo.js: ocean (mask too coarse)
  { name: 'ADELAIDE', lat: -34.95, lon: 138.53, region: 'desert' },
  { name: 'WELLINGTON', lat: -41.33, lon: 174.81, region: 'woodland' },
  { name: 'CHRISTCHURCH', lat: -43.49, lon: 172.53, region: 'woodland' },
  { name: 'DUNEDIN', lat: -45.93, lon: 170.20, region: 'woodland' },
  { name: 'TROMSO', lat: 69.68, lon: 18.92, region: 'boreal' },
  { name: 'ROVANIEMI', lat: 66.56, lon: 25.83, region: 'boreal' },
  { name: 'NUUK', lat: 64.19, lon: -51.68, region: 'tundra' },   // geo.js: ice
];
export const SEASON2_ON = globalThis.SEASON2 === true;   // (globalThis = window in the browser; the Node sim can set it too)
export const CITIES = SEASON2_ON ? [...BASE_CITIES, ...S2_CITIES] : BASE_CITIES;
// Season 2 only: the Silk Road (3,028 km, over the 2,600 km link limit; research/STORY-ANY-START.md).
export const S2_BRIDGES = [['TASHKENT', 'ULAANBAATAR']];
export const BRIDGES = [
  ['LONDON', 'REYKJAVIK'], ['REYKJAVIK', 'NEW YORK'], ['REYKJAVIK', 'IQALUIT'], ['LISBON', 'NEW YORK'],
  ['TOKYO', 'ANCHORAGE'], ['SAPPORO', 'ANCHORAGE'], ['LOS ANGELES', 'HONOLULU'], ['HONOLULU', 'NADI'], ['HONOLULU', 'TOKYO'],
  ['NADI', 'AUCKLAND'], ['NADI', 'SYDNEY'], ['AUCKLAND', 'SYDNEY'], ['AUCKLAND', 'SANTIAGO'],
  ['JAKARTA', 'DARWIN'], ['DARWIN', 'SYDNEY'], ['PERTH', 'SYDNEY'], ['SINGAPORE', 'PERTH'], ['PERTH', 'ANTANANARIVO'], ['ANTANANARIVO', 'JOHANNESBURG'],
  ['CAPE TOWN', 'SAO PAULO'], ['LAGOS', 'BELEM'], ['MIAMI', 'CARACAS'], ['MIAMI', 'PANAMA'], ['MEXICO CITY', 'PANAMA'],
  ['MUMBAI', 'DUBAI'], ['COLOMBO', 'CHENNAI'], ['MANILA', 'TAIPEI'], ['MANILA', 'HONG KONG'], ['CASABLANCA', 'LISBON'],
  ['TUNIS', 'ROME'], ['ATHENS', 'CAIRO'],
];
