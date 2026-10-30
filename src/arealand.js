// An area's lands (the user via the Coordinator, 2026-10-30): an area can span two biomes (Western Europe: woodland and
// mediterranean; Aotearoa & Polynesia: islandforest and polynesia). Its nature is the BEST of its lands, so a player is never
// held back for growing the land they actually fly over (the sim: tasman never opened for beginners who planted in Polynesia
// while the gate read Auckland's land only). Used by the crossing gate (src/crossings.js) and the finance desk (src/finance.js).
import { AREAS } from './areas.js';
import { city } from './network.js';
import { biodiversity } from './nature.js';

export const areaLands = k => [...new Set(((AREAS[k] || {}).cities || []).map(n => (city(n) || {}).region).filter(Boolean))];
export const bestAreaBio = (save, k) => Math.max(0, ...areaLands(k).map(r => biodiversity(save, r)));
