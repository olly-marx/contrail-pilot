// The menu pictures, DECLARED by subject (the loading screen, 2026-11-02; user decision: nothing is fetched when the player taps).
// Every <img> / background-image under assets/ that a menu shows is listed here, built from the game's own data tables (never a directory scan):
//   tier 1  what THIS save can show on a tap: the hangar, the badges, the lands the player has and the trip chosen on HOME. The loading screen waits for it.
//   tier 2  every other land's menu art, fetched when the game is idle (never while flying) and the moment a land is discovered.
// tests/preloadlist.cjs (Node) checks every file here exists, and that every picture file the menus can use is in a tier or in UNUSED below;
// tests/preloadgate.cjs (browser) checks that nothing under assets/ is fetched after 'ready' except by the loader.
import { WILDLIFE } from './wildlife.js';
import { REGION_DATA } from './habitats.js';
import { regionSpecies } from './nature.js';
import { animalPortrait, animalDir } from './animalart.js';
import { BADGES, medal, tierOf } from './badges.js';
import { PLANES, LOOKS, STICKERS, fleetOf } from './fleet.js';
import { discovered } from './wild.js';

// Single pictures the screens use (src/ui.js, tour.js, welcome.js, school.js, hub.js): declared one by one.
export const FIXED_UI = [
  'assets/ui/captain-point.png', 'assets/ui/icon-seed.png', 'assets/ui/icon-crystal.png', 'assets/ui/hangar-bg.png', 'assets/ui/hangar-spot.png',
  'assets/ui/focus-corner.png', 'assets/ui/lesson-hangar.png', 'assets/ui/lesson-nature.png', 'assets/ui/card-frame-locked.png',
  'assets/ui/badge-locked.png', 'assets/ui/badge-secret.png', 'assets/ui/badge-oops-1.png',
];
// The lesson pictures (school, tips, the missions screen), the mission icons and the pieces style.css draws from: explicit names, each used by a screen.
const names = (pre, list) => list.map(n => `assets/ui/${pre}${n}.png`);
export const LESSON_ART = names('lesson-', ['bars', 'biodiversity', 'birds', 'bonus', 'crystals', 'day', 'gold', 'heat', 'hot', 'land', 'night', 'nofly', 'plot', 'seed', 'storm', 'tap', 'tree-co2', 'turbulence']);
export const MISSION_ICONS = names('mi-', ['airports', 'crystal', 'globe', 'land', 'night', 'seed', 'shade', 'tree']);
export const STYLE_ART = ['assets/ui/tour-finger.png', 'assets/ui/captain-stand.png', 'assets/ui/card-frame.png'];
export const ERA_PICS = ['1950s', '1970s', '1990s'];   // the eras with a drawn picture; the later ones show the painted gradient (src/welcome.js), so no file is asked for
export const ERA_ART = ERA_PICS.map(id => `assets/ui/era-${id}.png`);
// Everything under assets/ui and assets/pixellab/ui that no screen shows: kept on disk, never preloaded. A picture file in a tier, here, or covered by
// the rule below, or tests/preloadlist.cjs fails (a new picture must be declared on purpose).
export const UNUSED = names('scene-', ['boreal', 'bush', 'desert', 'eastasia', 'islandforest', 'mediterranean', 'monsoon', 'plains', 'polynesia', 'rainforest', 'savanna', 'steppe', 'tundra', 'woodland'])
  .concat(names('logo-', ['aeis', 'citizenzoo', 'cz', 'imperial-i', 'imperial']));   // the logos are <img> in index.html: loaded with the page, before 'ready'
// Old generated portraits (assets/ui/portrait-<sprite>-0.png) kept as the fallback for a species that has a PixelLab portrait: shown only with ?pixelart=off.
export const isLegacyPortrait = f => /^assets\/ui\/portrait-/.test(f);

const FIELD_REGIONS = ['woodland', 'mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest', 'bush', 'steppe', 'polynesia'];
export const LANDS = Object.keys(REGION_DATA);

const projectIds = region => ((REGION_DATA[region] || {}).projects || []).map(p => p.id);

// One land's NATURE art: its field, project icons and field features, every animal / bird / tree portrait, and the two frames of each animal drawn in the field.
export function regionArt(region) {
  const out = [];
  if (FIELD_REGIONS.includes(region)) out.push(`assets/ui/field-${region}.png`);
  for (const id of projectIds(region)) out.push(`assets/ui/proj-${id}.png`, `assets/ui/wild-${id}.png`);
  const seen = new Set();
  for (const w of [...WILDLIFE.filter(x => x.region === region), ...regionSpecies(region)]) {
    const key = w.sprite || w.id; if (seen.has(key)) continue; seen.add(key);
    const p = animalPortrait(w); if (p) out.push(p);
    if (w.sprite && w.kind !== 'tree') for (let f = 0; f < (w.frames || 2); f++) out.push(`${animalDir(w.sprite)}/${w.sprite}-${f}.png`);
  }
  return out;
}

// The hangar. Every plane's picture; the part and gadget overlays: for a save, only its OWNED planes, and per line only the levels bought + the next one (the one a
// purchase shows); with no save, all of them (tier 2 = the rest).
export function hangarArt(save) {
  const out = [];
  const fleet = save && fleetOf(save);
  for (const p of PLANES) {
    if (p.portrait) out.push(p.portrait);
    const L = LOOKS[p.id]; if (!L || (fleet && !fleet.planes[p.id])) continue;
    const levels = fleet ? fleet.planes[p.id] : null;
    for (const line of ['engines', 'body', 'cabin']) for (const part of L[line].slice(0, levels ? (levels[line] || 0) + 1 : undefined)) if (part) out.push(`assets/ui/upgrades/hangar-${L.art}-${part}.png`);
    if (!L.noGadgetArt) for (const s of Object.values(STICKERS)) out.push(`assets/ui/upgrades/gadget-${L.art}-${s.art}.png`);
  }
  return out;
}
// The badge medals: for a save, the tier earned and the next one (what a landing can award); with no save, all of them. (The locked / secret pictures are FIXED_UI.)
export function badgeArt(save) {
  const out = [];
  for (const b of BADGES) for (let t = 1; t <= b.tiers.length; t++) if (!save || t <= tierOf(save, b.id) + 1) out.push(medal(b.id, t));
  return out;
}

// The lands this save has: its home land, those flown over or landed in, and the lands of the trip chosen on HOME (`trip`: region names).
export const landsOf = (save, trip = []) => LANDS.filter(r => discovered(save, r) || trip.includes(r));

const uniq = list => [...new Set(list)];
export function tier1(save, trip = []) {
  return uniq([...FIXED_UI, ...LESSON_ART, ...MISSION_ICONS, ...STYLE_ART, ...ERA_ART, ...hangarArt(save), ...badgeArt(save), ...landsOf(save, trip).flatMap(regionArt)]);
}
export function tier2(save, trip = []) {
  const have = new Set(tier1(save, trip));
  return everything().filter(f => !have.has(f));
}
// The whole declared set (what the Node test checks against the files on disk).
export const everything = () => uniq([...FIXED_UI, ...LESSON_ART, ...MISSION_ICONS, ...STYLE_ART, ...ERA_ART, ...hangarArt(), ...badgeArt(), ...LANDS.flatMap(regionArt)]);
