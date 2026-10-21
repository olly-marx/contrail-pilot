// Plane upgrade overlays (drawn by the art session: tools/art/, assets/plane-*.png). Each is 74x39,
// the 62x27 base plus a 6 px margin, centred on the plane. Looks only: collisions use 'plane'.
// Shared by the flying plane (GameScene) and the hangar model (ui.js).
export const PART_LINES = { wings: 2, engine: 5, gear: 2, hold: 3, lens: 2, airframe: 3, fuel: 4, cabin: 4, radar: 4, magnet: 3, forecast: 2 };   // draw order
export const NATURE_LINES = ['trees', 'soil', 'species', 'rewild', 'nursery'];   // total levels -> the tail badge ('rewild' = habitat projects done: natureLevels)
// Levels for the badge: upgrade levels plus habitat projects done (src/habitats.js) counted as 'rewild'.
export const natureLevels = save => ({ ...(save.levels || {}), rewild: ((save.habitat || {}).woodland || []).length });
export const natureStage = n => n >= 15 ? 4 : n >= 10 ? 3 : n >= 5 ? 2 : n >= 1 ? 1 : 0;
export const natureBadge = levels => natureStage(NATURE_LINES.reduce((a, id) => a + ((levels || {})[id] || 0), 0));
// Overlay keys for a set of levels, bottom to top.
export function partKeys(levels, { gear = true } = {}) {
  const keys = [];
  for (const [id, max] of Object.entries(PART_LINES)) { const n = Math.min((levels || {})[id] || 0, max); if (n && (gear || id !== 'gear')) keys.push(`plane-${id}-${n}`); }
  const b = natureBadge(levels);
  if (b) keys.push(`plane-nature-${b}`);
  return keys;
}
// Where each line's part is, in base-plane pixels [x, y, w, h] (art session, 2026-10-21). Fuel and
// airframe cover most of the plane: show it all. Nature lines share the tail badge.
export const ZOOM = { engine: [12, 18, 33, 12], wings: [-8, 6, 11, 13], cabin: [15, 9, 46, 10], gear: [26, 17, 32, 15], hold: [36, 17, 21, 10],
  magnet: [39, -6, 14, 17], radar: [33, 2, 36, 19], lens: [43, 18, 17, 11], forecast: [19, 0, 16, 14], nature: [2, 1, 13, 13] };
export const zoomBox = id => ZOOM[NATURE_LINES.includes(id) ? 'nature' : id] || null;
