// Land or sea at a point, from the Natural Earth land mask (src/landmask.js, 0.5 degree cells). Shared by the globe (src/globe.js)
// and the real terrain under a crossing (src/geo.js surfaceAt). No browser.
import { LAND_W, LAND_H, LAND_RLE, ISLANDS } from './landmask.js';

let mask = null;
export function getMask() {
  if (mask) return mask;
  mask = new Uint8Array(LAND_W * LAND_H);
  LAND_RLE.split('|').forEach((row, j) => { let i = 0, v = 0; for (const t of row.split(',')) { const n = parseInt(t, 36); if (v) mask.fill(1, j * LAND_W + i, j * LAND_W + i + n); i += n; v ^= 1; } });
  return mask;
}
export const isLand = (lat, lon) => getMask()[Math.min(LAND_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * LAND_H))) * LAND_W + (((Math.floor((lon + 180) / 360 * LAND_W) % LAND_W) + LAND_W) % LAND_W)] === 1;
// Land, or within `r` degrees of one of the mask's small islands (land too small for a cell centre: Tahiti, the Azores...).
export const isLandOrIsland = (lat, lon, r = 0.4) => isLand(lat, lon) || ISLANDS.some(([a, o]) => Math.abs(a - lat) < r && Math.abs((((o - lon) + 540) % 360) - 180) < r);
