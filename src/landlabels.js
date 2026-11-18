// MAP REGIONS (the user, 2026-11-18: "on the map actually draw lines that show the regions, the biomes, where you cross from one
// biome to another, with some text"): the land names over the HOME globe. The lines are drawn by src/globe.js paint(); the names
// are DOM text in a layer over the canvas (the canvas is only 128 px: text drawn in it would be a blur), moved to each land's
// visible middle every time the globe is drawn, so they follow a drag or a spin. The layer takes no taps (pointer-events: none):
// a tap goes through to the city under it.
import { unlockedAreas } from './areas.js';
import { areaLands } from './arealand.js';

// Short names for the globe (the full REGION_NAMES do not fit a 165 px globe at 320 px wide). One per land id.
export const LAND_SHORT = {
  woodland: 'Woodland', mediterranean: 'Mediterranean', desert: 'Desert', monsoon: 'Monsoon forest', eastasia: 'Mountain forest',
  boreal: 'Boreal forest', plains: 'Plains', tundra: 'Tundra', savanna: 'Savanna', rainforest: 'Rainforest', islandforest: 'Island forest',
  bush: 'Bush', steppe: 'Steppe', polynesia: 'Polynesia',
};
// The lands a player has OPENED (declared, 2026-11-18): every land with a city in the areas they have unlocked (src/areas.js
// unlockedAreas: a crossing opens a whole region). These names are bright; the other lands get a dim name if there is room.
export const openLands = save => new Set(unlockedAreas(save).flatMap(areaLands));
export const MIN_PX = 60;          // a land needs this many visible canvas pixels for a name (a sliver at the edge gets none)
export const MIN_PX_LOCKED = 220;  // a locked land: only a big one (the opened lands come first and the globe must not fill with words)
export const MAX_LABELS = 5;

// Place the names in `box` (a positioned layer over `canvas`, the same size as the canvas's parent) for paint()'s `lands`.
// Opened lands first, biggest first; a name that would overlap one already placed, or leave the box, is left out.
export function placeLandLabels(box, canvas, lands, open) {
  if (!box || !canvas) return [];
  // Placed again when the canvas changes size (the hub is first drawn while the loading screen hides it: 0 px wide, no places).
  box.__last = [canvas, lands, open];
  if (!box.__ro && typeof ResizeObserver !== 'undefined') { box.__ro = new ResizeObserver(() => placeLandLabels(box, ...box.__last)); box.__ro.observe(canvas); }
  else if (box.__ro && box.__seen !== canvas) box.__ro.observe(canvas);
  box.__seen = canvas;
  const cr = canvas.getBoundingClientRect(), br = box.getBoundingClientRect(); if (!cr.width) return [];
  const k = cr.width / canvas.width, ox = cr.left - br.left, oy = cr.top - br.top;
  const want = lands.filter(l => LAND_SHORT[l.id] && (open.has(l.id) ? l.n >= MIN_PX : l.n >= MIN_PX_LOCKED))
    .sort((a, b) => (open.has(b.id) - open.has(a.id)) || b.n - a.n).slice(0, MAX_LABELS);
  const els = box.__els || (box.__els = {}), placed = [], shown = [];
  for (const id of Object.keys(els)) if (!want.some(l => l.id === id)) { els[id].remove(); delete els[id]; }
  for (const l of want) {
    let el = els[l.id];
    if (!el) { el = els[l.id] = document.createElement('span'); el.dataset.land = l.id; el.textContent = LAND_SHORT[l.id]; box.appendChild(el); el.__size = null; }
    const cls = `land-label${open.has(l.id) ? ' open' : ''}`; if (el.className !== cls) { el.className = cls; el.__size = null; }
    if (!el.__size || !el.__size[0]) { el.hidden = false; el.__size = [el.offsetWidth, el.offsetHeight]; }
    const [w, h] = el.__size;
    const wantL = ox + l.x * k - w / 2, wantT = oy + l.y * k - h / 2, left = Math.max(0, Math.min(wantL, br.width - w)), top = Math.max(0, Math.min(wantT, br.height - h));
    const r = { l: left, t: top, r: left + w, b: top + h };
    // A name pushed far off its land by the globe's edge (a wide name near the rim) is left out: a name must sit on its land.
    if (Math.abs(left - wantL) > 3 * k || Math.abs(top - wantT) > 3 * k || placed.some(p => r.l < p.r + 2 && r.r > p.l - 2 && r.t < p.b + 2 && r.b > p.t - 2)) { el.hidden = true; continue; }
    el.hidden = false; el.style.left = `${Math.round(left)}px`; el.style.top = `${Math.round(top)}px`; placed.push(r); shown.push(l.id);
  }
  return shown;
}
