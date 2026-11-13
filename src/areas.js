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
// REGIONS (CROSSINGS V3, the user 2026-11-13: '6 regions, 5 crossings plus the lap ... each harder than the last'): the areas open a whole REGION at a time. Your start opens your
// home region; each crossing opens another region. Areas stay (missions, start cities, nature are per area); only what opens together changed.
export const REGIONS = {
  europe: { name: 'Europe', areas: ['weurope', 'nordic'] },
  afme: { name: 'Africa & the Middle East', areas: ['africa', 'mideast'] },
  asia: { name: 'Asia', areas: ['sasia', 'easia'] },
  namerica: { name: 'North America', areas: ['namerica'] },
  samerica: { name: 'South America', areas: ['samerica', 'patagonia'] },
  oceania: { name: 'Oceania', areas: ['oceania', 'aotearoa'] },
};
export const regionOfArea = k => Object.keys(REGIONS).find(r => REGIONS[r].areas.includes(k)) || null;
export const regionName = r => (REGIONS[r] ? REGIONS[r].name : 'the Pacific');
// An area's display name for 'opens ...' lines: the REGION it belongs to.
export const opensName = k => regionName(regionOfArea(k));
// Every key plus the other areas of its region (keys that are no area, e.g. 'ocean', are kept as they are). Order: the keys first, then what was added.
export const withRegions = keys => { const out = [...(keys || [])]; for (const k of keys || []) { const r = regionOfArea(k); if (r) for (const a of REGIONS[r].areas) if (!out.includes(a)) out.push(a); } return out; };
// Regions with every area open.
export const regionsOpen = keys => Object.keys(REGIONS).filter(r => REGIONS[r].areas.every(a => (keys || []).includes(a)));
// The default for a new season 2 player until the start choice (M2): Western Europe, from Amsterdam (PLANE-ONBOARDING-PLAN).
export const DEFAULT_AREA = 'weurope';
export const areaOf = name => Object.keys(AREAS).find(k => AREAS[k].cities.includes(name)) || null;
// (save.areas may also hold 'ocean', the Pacific stepping stones a crossing to Honolulu/Nadi opens: not an area with cities of its own.)
export const unlockedAreas = save => { const ks = withRegions(save.areas || []).filter(k => AREAS[k]); return ks.length ? ks : withRegions([DEFAULT_AREA]); };   // (CROSSINGS V3: a whole region opens together)
export const citiesOf = keys => keys.flatMap(k => AREAS[k].cities);
