// Collision masks from src/sim/masks.js (baked by tools/sim/bake-masks.py), with the same shape as
// GameScene.alphaMask(): { w, h, at(x, y) } where at() floors x, y and is false outside the picture.
import { MASK_DATA } from './masks.js';

const cache = {};
export function mask(key) {
  if (cache[key]) return cache[key];
  const d = MASK_DATA[key];
  if (!d) throw new Error(`no baked mask for '${key}': add it to tools/sim/bake-masks.py`);
  const { w, h } = d, stride = (w + 7) >> 3, bin = atob(d.bits), solid = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) solid[y * w + x] = (bin.charCodeAt(y * stride + (x >> 3)) >> (7 - (x & 7))) & 1;
  const at = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x] === 1; };
  return (cache[key] = { w, h, at });
}
export const MASK_KEYS = Object.keys(MASK_DATA);
