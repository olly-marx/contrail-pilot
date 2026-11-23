// STORY MISSIONS (the user, 2026-11-22/23): the main missions, replacing the area ladders (src/missions2.js TEMPLATES).
// Real tasks with a story ("collect vaccine in LONDON and deliver it to KINSHASA, NAIROBI and MAPUTO"), sized for the pilot.
// Pure: no DOM, no clock, no Math.random (a seeded stream from save.storySeq), so the sim and the game agree.
//
// THE BOARD (save.storyBoard): three offers. Each offer is MADE ONCE, when its slot is empty, and then never changes: its cities,
// its stage lengths and its pay are stored ("they're sized based on your level when they're offered ... the mission is still in
// Europe ... the amount it pays is the same"). Sizing: reach = the larger of the plane's estimate (src/capability.js) and the
// farthest the player has really flown (save.bestDistance, save.areaBest); each stage from one stop to the next is a share of it.
// Two offers fit now (stages 55-85% of reach). The third NEEDS AN UPGRADE ("1 in 3 ... requires you to upgrade something"): either
// a stage 15-35% longer than today's reach (it opens when the reach grows: plane or nature upgrades), or a gadget/nature level.
// ACCEPT makes it the active story: its next stop becomes the flight's destination (save.aimCity, src/aim.js), so the route strip
// and the lit runway point there. A stop counts when you LAND there (any number of flights; a crash changes nothing). Each stop
// pays its stage at the user's yardstick, 500 seeds and 40 crystals per 15,000 km, the moment it is reached. A finished offer
// leaves the board and its slot is filled again, sized at that moment.
import { CITIES } from './cities.js';
import { AREAS, areaOf, unlockedAreas, citiesOf } from './areas.js';
import { pathTo, linksFor, legBetween } from './route.js';
import { capFor } from './capability.js';
import { fleetOf, GADGETS } from './fleet.js';
import { LINES } from './upgrades.js';

export const STORY = { on: true, slots: 3, fit: [0.55, 0.85], stretch: [1.15, 1.35], maxStops: 4 };
export const SEEDS_PER_KM = 500 / 15000, CRYSTALS_PER_KM = 40 / 15000;
export const storyPay = km => ({ seeds: Math.round(km * SEEDS_PER_KM), crystals: Math.round(km * CRYSTALS_PER_KM) });

// THEMES: the story's words, with {0}..{3} for the stops in order (0 = the pickup). `stops`: how many cities. `areas`: where it
// may be set (null: anywhere open). `pic`: assets/ui/portrait-<pic>-0.png. `needs`: [{ gadget | line: id, level }] makes it an
// upgrade story (it is offered in the third slot). Words: plain, kind, for children; facts kept general (no numbers or names).
export const THEMES = [
  { id: 'vaccine', stops: 4, pic: 'story-vaccine', title: 'Vaccines for three cities',
    story: 'A new vaccine is ready in {0}. Hospitals in {1}, {2} and {3} are waiting for it.',
    lines: ['The vaccine is packed in ice. Off you go!', 'Nurses in {1} take the first box.', '{2} has its vaccine. One more stop.', '{3} has the last box. Every hospital is ready!'] },
  { id: 'wind', stops: 2, pic: 'story-crate', needs: [{ gadget: 'hold', level: 2 }], title: 'Parts for a wind farm',
    story: 'A wind farm near {1} needs new turbine parts from {0}. They are big, so you need a bigger hold.',
    lines: ['Turbine parts are loaded into the hold.', 'The wind farm is turning again: clean power for thousands of homes!'] },
  { id: 'pump', stops: 2, pic: 'story-crate', needs: [{ gadget: 'hold', level: 1 }], title: 'A solar water pump',
    story: 'A village near {1} needs a solar water pump from {0}, so animals and people have water in the dry season.',
    lines: ['The pump is strapped down in the hold.', 'Fresh water! The pump runs on sunshine.'] },
  { id: 'seedbank', stops: 3, pic: 'tree-oak', title: 'Seeds from the seed bank',
    story: 'The seed bank in {0} is sending seeds of native trees to {1} and {2}, where people are planting new forests.',
    lines: ['Boxes of seeds fill your hold.', 'The first forest team in {1} gets its seeds.', '{2} has its seeds. The planting starts tomorrow!'] },
  { id: 'scientists', stops: 3, pic: 'story-crate', title: 'Scientists on tour',
    story: 'A team of climate scientists in {0} wants to measure the air above {1} and {2}. Fly them there!',
    lines: ['The scientists climb aboard with their instruments.', 'The first measurements over {1} are done.', 'All done in {2}: the team has the data it needs!'] },
  { id: 'saplings', stops: 2, pic: 'tree-oak', needs: [{ line: 'trees', level: 2 }], title: 'Young trees for a new wood',
    story: 'A town near {1} wants a new wood. Fly young trees from the nursery in {0}, and plant some on the way.',
    lines: ['Young trees, carefully packed.', 'The town plants its new wood!'] },
  { id: 'sensors', stops: 3, pic: 'story-crate', needs: [{ gadget: 'sensors', level: 2 }], title: 'Weather station parts',
    story: 'Weather stations near {1} and {2} need new parts from {0}. Your sensors help you check the air on the way.',
    lines: ['Weather station parts on board.', '{1} can measure the weather again.', '{2} too: better forecasts for everyone!'] },
  { id: 'storks', stops: 3, pic: 'sky-stork', areas: ['weurope', 'mideast', 'africa', 'nordic'], title: 'Count the storks',
    story: 'Scientists want to know how many storks fly between Europe and Africa this year. Fly their counter from {0} along the route.',
    lines: ['The stork counter is on board.', 'Storks circle over {1}.', 'The count is done in {2}!'] },
  { id: 'tigers', stops: 2, pic: 'animal-tiger', areas: ['sasia'], title: 'Cameras for tigers',
    story: 'Rangers count tigers with cameras hidden in the forest. They need new memory cards from {0} in {1}.',
    lines: ['A box of memory cards and batteries.', 'The first photo: a tiger walking past!'] },
  { id: 'orangutans', stops: 3, pic: 'animal-orangutan', areas: ['sasia'], title: 'Trees for orangutans',
    story: 'Orangutans live high in the rainforest trees. Teams in {1} and {2} are replanting forest so they can move between patches.',
    lines: ['Young rainforest trees on board.', 'The team in {1} starts planting.', 'The new trees join two patches of forest!'] },
  { id: 'pandas', stops: 2, pic: 'animal-panda', areas: ['easia'], title: 'Bamboo for pandas',
    story: 'Giant pandas eat bamboo almost all day. A panda centre near {1} needs a new kind of bamboo from {0}.',
    lines: ['Bamboo shoots, carefully wrapped.', 'The pandas sniff the new bamboo.'] },
  { id: 'elephants', stops: 3, pic: 'animal-africanelephant', areas: ['africa'], title: 'Water for elephants',
    story: 'In the dry season elephants walk far to find water. Reserves near {1} and {2} need pump parts from {0}.',
    lines: ['Pump parts are loaded.', 'The waterhole near {1} is full again.', 'Elephants drink at {2}!'] },
  { id: 'salmon', stops: 3, pic: 'animal-cohosalmon', areas: ['namerica'], title: 'Salmon river',
    story: 'Salmon swim up rivers to lay their eggs. A river team from {0} is clearing old dams near {1} and {2}.',
    lines: ['The river team packs their tools.', 'One river runs free near {1}.', 'And another near {2}: the salmon can swim up!'] },
  { id: 'bison', stops: 2, pic: 'animal-bison', areas: ['namerica'], title: 'Bison on the prairie',
    story: 'Bison help prairie grass grow back. A park near {1} is ready for a small herd: fly the grass seed from {0}.',
    lines: ['Grass seed for the bison meadow.', 'The bison step out onto the prairie.'] },
  { id: 'dolphins', stops: 2, pic: 'animal-riverdolphin', areas: ['samerica'], title: 'Pink river dolphins',
    story: 'Pink river dolphins live in the Amazon. Scientists in {1} listen to them with underwater microphones from {0}.',
    lines: ['Underwater microphones on board.', 'Clicks and whistles: the dolphins are here!'] },
  { id: 'puffins', stops: 3, pic: 'sky-puffin', areas: ['nordic', 'weurope'], title: 'Puffins on the cliffs',
    story: 'Puffins nest in burrows on sea cliffs. Bird scientists from {0} count them near {1} and {2}.',
    lines: ['The bird scientists are on board.', 'Puffins with orange beaks fly past {1}.', 'The puffin count is done!'] },
  { id: 'koalas', stops: 2, pic: 'story-crate', areas: ['oceania'], title: 'Trees for koalas',
    story: 'Koalas eat the leaves of gum trees. A wildlife park near {1} is planting more: fly the saplings from {0}.',
    lines: ['Gum tree saplings on board.', 'The new trees go in. The koalas will have lunch for years!'] },
];

// ---------- sizing ----------
// The pilot's reach in game km: the larger of the plane's estimate for this area and the farthest really flown (the user, 2026-11-23:
// "my plane says 17,000, but I've flown 25,000 with it"). 4,000 km at the very start, before anything is known.
export function reachOf(save) {
  const a = areaOf(save.city) || null, cap = a ? capFor(save, a) : 0;
  return Math.max(4000, cap || 0, save.bestDistance || 0, ...Object.values(save.areaBest || {}).map(Number).filter(Number.isFinite));
}
// Game km of the shortest way a -> b over the open network (null: no way).
const LINKS_CACHE = new WeakMap();
const linksOf = save => { let L = LINKS_CACHE.get(save); if (!L) { L = linksFor(save); LINKS_CACHE.set(save, L); } return L; };
export function wayKm(save, a, b) {
  const p = pathTo(a, b, linksOf(save)); if (!p || p.length < 2) return null;
  let km = 0; for (let i = 1; i < p.length; i++) km += legBetween(p[i - 1], p[i]); return km;
}
// A small seeded stream (mulberry32) so an offer is the same in the sim and the game.
function stream(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

// The open cities a theme may use (its areas, if it names any, among the open ones).
function citiesFor(save, theme) {
  const open = unlockedAreas(save), keys = theme.areas ? open.filter(k => theme.areas.includes(k)) : open;
  return citiesOf(keys).filter(c => CITIES.some(x => x.name === c));
}
// Choose the stops: a pickup, then each next stop the city whose way from the last is closest to `target` km (never a city twice).
function pickStops(save, theme, target, rnd) {
  const pool = citiesFor(save, theme); if (pool.length < theme.stops) return null;
  const start = pool[Math.floor(rnd() * pool.length)], stops = [start], stages = [];
  while (stops.length < theme.stops) {
    const from = stops[stops.length - 1];
    const cand = pool.filter(c => !stops.includes(c)).map(c => ({ c, km: wayKm(save, from, c) })).filter(o => o.km);
    if (!cand.length) return null;
    cand.sort((x, y) => Math.abs(x.km - target) - Math.abs(y.km - target) || (x.c < y.c ? -1 : 1));
    const best = cand.slice(0, 3)[Math.floor(rnd() * Math.min(3, cand.length))];   // one of the three closest: variety
    stops.push(best.c); stages.push(best.km);
  }
  return { stops, stages };
}
const fillWords = (t, stops) => t.replace(/\{(\d)\}/g, (m, i) => stops[+i] || '');

// ---------- the needs of an upgrade story ----------
function needInfo(n) {
  if (n.reach) return { kind: 'reach', km: n.reach, tab: 'hangar', text: 'a plane that flies further (plane or nature upgrades)' };
  const kind = n.gadget ? 'gadget' : n.line ? 'line' : null; if (!kind) return null;
  const list = kind === 'gadget' ? GADGETS : LINES, item = list.find(x => x.id === n[kind]); if (!item) return null;
  const lv = item.levels[(n.level || 1) - 1];
  return { kind, id: n[kind], level: n.level || 1, tab: kind === 'line' ? 'nature' : 'hangar', text: `${item.name}: ${lv ? lv.name : `level ${n.level}`}` };
}
const has = (save, i) => (i.kind === 'reach' ? reachOf(save) >= i.km
  : i.kind === 'line' ? ((save.levels || {})[i.id] || 0) >= i.level : (fleetOf(save).gadgets[i.id] || 0) >= i.level);
// What an offer still needs (empty: it can be accepted).
export const missing = (save, offer) => (offer.needs || []).map(needInfo).filter(i => i && !has(save, i));

// ---------- making an offer ----------
// One offer for slot `slot` (0, 1 fit; 2 the upgrade story). Stored as-is: { id, theme, title, story, pic, stops, lines, stages, km, pay, needs, slot, made }.
export function makeOffer(save, slot) {
  const seq = save.storySeq = (save.storySeq || 0) + 1, rnd = stream(hash(`${save.homeCity || ''}|${seq}|${slot}`));
  const reach = reachOf(save), upgrade = slot === 2, onBoard = new Set((save.storyBoard || []).filter(Boolean).map(o => o.theme));
  const fits = THEMES.filter(t => !onBoard.has(t.id) && (upgrade || !t.needs) && citiesFor(save, t).length >= t.stops);
  const order = fits.map(t => ({ t, r: rnd() })).sort((a, b) => a.r - b.r).map(x => x.t);
  // Two passes: first only stories that really use the pilot's range (the longest stage at least half the target: a theme set in a
  // small area cannot be stretched, the user: "it was like 4,000 meters when we're easily flying 15,000"), then anything that fits.
  for (const pass of [0, 1]) for (const theme of order) {
    const gadget = upgrade && theme.needs && missingNeeds(save, theme.needs).length > 0;   // an upgrade story by its gadget/nature need
    const band = upgrade && !gadget ? STORY.stretch : STORY.fit;
    const target = Math.round(reach * (band[0] + rnd() * (band[1] - band[0])));
    const got = pickStops(save, theme, target, rnd); if (!got) continue;
    const stretchNeed = upgrade && !gadget ? Math.max(...got.stages) : 0;
    if (upgrade && !gadget && stretchNeed <= reach) continue;   // the open network could not make it longer than today's reach: try another theme
    if (!upgrade && Math.max(...got.stages) > reach) continue;   // (a fit story must be flyable today)
    if (pass === 0 && Math.max(...got.stages) < target * 0.5) continue;
    const km = got.stages.reduce((a, b) => a + b, 0);
    return { id: `story-${seq}`, theme: theme.id, slot, made: save.flights || 0, title: theme.title, story: fillWords(theme.story, got.stops), pic: theme.pic,
      stops: got.stops, lines: theme.lines.map(l => fillWords(l, got.stops)), stages: got.stages, km, pay: storyPay(km),
      needs: gadget ? theme.needs : stretchNeed ? [{ reach: stretchNeed }] : [] };
  }
  return null;
}
const missingNeeds = (save, needs) => needs.map(needInfo).filter(i => i && !has(save, i));

// Fill the empty slots (idempotent; returns true when the save changed). An offer already made is never touched.
export function fillBoard(save) {
  if (!STORY.on) return false;
  const b = save.storyBoard = Array.isArray(save.storyBoard) ? save.storyBoard : [];
  let changed = false;
  for (let i = 0; i < STORY.slots; i++) if (!b[i]) { const o = makeOffer(save, i); if (o) { b[i] = o; changed = true; } }
  return changed;
}

// ---------- the active story ----------
export const activeStory = save => (save.storyBoard || []).find(o => o && o.id === save.storyActive) || null;
export const nextStop = save => { const o = activeStory(save); return o ? o.stops[o.reached || 0] : null; };
export function accept(save, id) {
  const o = (save.storyBoard || []).find(x => x && x.id === id);
  if (!o || missing(save, o).length) return false;
  save.storyActive = o.id; o.reached = o.reached || 0;
  save.aimCity = o.stops[o.reached];   // the destination (src/aim.js): the strip and the lit runway point at the next stop
  return true;
}
export function pause(save) { delete save.storyActive; delete save.aimCity; }
// After a landing at `city` (src/missions2.js onFlight): the next stop reached? Pays its stage straight away. Returns
// { title, city, line, n, of, done, pay } or null.
export function landedAt(save, city) {
  const o = activeStory(save); if (!o || o.stops[o.reached || 0] !== city) return null;
  const i = o.reached || 0, stage = i === 0 ? 0 : o.stages[i - 1], pay = i === 0 ? { seeds: 0, crystals: 0 } : storyPay(stage);
  o.reached = i + 1;
  const done = o.reached >= o.stops.length;
  if (done) {
    save.storiesDone = (save.storiesDone || 0) + 1;
    save.storyBoard = save.storyBoard.map(x => (x === o ? null : x));
    delete save.storyActive; if (save.aimCity === city) delete save.aimCity;
  } else save.aimCity = o.stops[o.reached];
  return { title: o.title, city, line: o.lines[i] || '', n: i + 1, of: o.stops.length, done, pay };
}
// The mission row the rest of the game sees (src/missions2.js visible; src/aim.js steers to its city): the active story, or null.
export function storyRow(save) {
  const o = activeStory(save); if (!o) return null;
  const left = o.stages.slice(Math.max(0, (o.reached || 0) - 1)).reduce((a, b) => a + b, 0);
  return { key: `story:${o.id}`, title: `${o.title}: land at ${o.stops[o.reached || 0]}`, tier: 0, star: false, kind: 'story',
    prize: storyPay(left), def: { id: 'story' }, fill: { city: o.stops[o.reached || 0] } };
}
