// SEASON 2 areas (the redesign; research/AREA-BALANCE.md cut, MASTER-PLAN.md Part B): nine areas of at most two
// biomes. You fly freely inside the areas you have unlocked (src/network.js useAreas); a crossing mission opens the
// next. Honolulu and Nadi belong to no area: they are ocean stepping stones on the Pacific crossings.
export const AREAS = {
  weurope: { name: 'Western Europe', starter: true, start: 'AMSTERDAM', cities: ['LONDON', 'PARIS', 'BERLIN', 'AMSTERDAM', 'EDINBURGH', 'DUBLIN', 'VIENNA', 'WARSAW', 'KYIV', 'MOSCOW', 'ROME', 'ATHENS', 'MADRID', 'LISBON', 'BARCELONA', 'ISTANBUL'] },
  namerica: { name: 'North America', starter: true, start: 'DENVER', cities: ['CHICAGO', 'NEW YORK', 'DENVER', 'DALLAS', 'ATLANTA', 'LOS ANGELES', 'MIAMI', 'TORONTO', 'WINNIPEG', 'MEXICO CITY', 'ANCHORAGE', 'VANCOUVER', 'SEATTLE', 'CALGARY', 'FAIRBANKS', 'YELLOWKNIFE', 'IQALUIT'] },
  sasia: { name: 'South & Southeast Asia', starter: true, start: 'KOLKATA', cities: ['KARACHI', 'DELHI', 'MUMBAI', 'KOLKATA', 'CHENNAI', 'KATHMANDU', 'DHAKA', 'COLOMBO', 'BANGKOK', 'HANOI', 'KUALA LUMPUR', 'SINGAPORE', 'JAKARTA', 'MANILA'] },
  africa: { name: 'Africa south of the Sahara', starter: true, start: 'LAGOS', cities: ['NAIROBI', 'ADDIS ABABA', 'DAR ES SALAAM', 'JOHANNESBURG', 'CAPE TOWN', 'WINDHOEK', 'MAPUTO', 'LUANDA', 'KINSHASA', 'LAGOS', 'ACCRA', 'NIAMEY', 'ANTANANARIVO'] },
  samerica: { name: 'South America', starter: true, start: 'MANAUS', cities: ['MANAUS', 'BELEM', 'SAO PAULO', 'RIO', 'BRASILIA', 'LIMA', 'QUITO', 'BOGOTA', 'CARACAS', 'PANAMA', 'BUENOS AIRES', 'SANTIAGO'] },
  easia: { name: 'East Asia', starter: true, start: 'SEOUL', cities: ['BEIJING', 'TOKYO', 'SHANGHAI', 'HONG KONG', 'SEOUL', 'CHENGDU', 'OSAKA', 'TAIPEI', 'SAPPORO', 'ULAANBAATAR'] },
  mideast: { name: 'North Africa & Middle East', starter: false, start: 'KHARTOUM', cities: ['CASABLANCA', 'TUNIS', 'CAIRO', 'KHARTOUM', 'TAMANRASSET', 'RIYADH', 'DUBAI', 'DOHA', 'MUSCAT', 'TEHRAN', 'TASHKENT'] },
  nordic: { name: 'Nordic & North Atlantic', starter: false, start: 'OSLO', cities: ['OSLO', 'STOCKHOLM', 'HELSINKI', 'REYKJAVIK', 'AKUREYRI', 'TROMSO', 'ROVANIEMI', 'NUUK'] },
  oceania: { name: 'Australia', starter: true, start: 'MELBOURNE', cities: ['SYDNEY', 'PERTH', 'DARWIN', 'MELBOURNE', 'BRISBANE', 'CAIRNS', 'HOBART', 'ADELAIDE'] },
  // New regions are their own starter areas (the user via the Coordinator, 2026-10-28): Aotearoa New Zealand, the Island forest.
  aotearoa: { name: 'Aotearoa & Polynesia', starter: true, start: 'AUCKLAND', cities: ['AUCKLAND', 'WELLINGTON', 'CHRISTCHURCH', 'DUNEDIN', "NUKU'ALOFA", 'APIA', 'RAROTONGA', 'PAPEETE'] },   // Polynesia added 2026-10-30 (the user)
  patagonia: { name: 'Patagonia', starter: true, start: 'PUNTA ARENAS', cities: ['PUNTA ARENAS', 'PUERTO MADRYN', 'BALMACEDA'] },
};
export const OCEAN_STONES = ['HONOLULU', 'NADI'];
// The default for a new season 2 player until the start choice (M2): Western Europe, from Amsterdam (PLANE-ONBOARDING-PLAN).
export const DEFAULT_AREA = 'weurope';
export const areaOf = name => Object.keys(AREAS).find(k => AREAS[k].cities.includes(name)) || null;
// (save.areas may also hold 'ocean', the Pacific stepping stones a crossing to Honolulu/Nadi opens: not an area with cities of its own.)
export const unlockedAreas = save => { const ks = (save.areas || []).filter(k => AREAS[k]); return ks.length ? ks : [DEFAULT_AREA]; };
export const citiesOf = keys => keys.flatMap(k => AREAS[k].cities);
