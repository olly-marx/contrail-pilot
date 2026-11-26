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
// pays its stage at 1,000 seeds and 80 crystals per 15,000 km (the user's yardstick, doubled on 2026-11-23), the moment it is reached. A finished offer
// leaves the board and its slot is filled again, sized at that moment.
import { CITIES } from './cities.js';
import { AREAS, areaOf, unlockedAreas, citiesOf } from './areas.js';
import { pathTo, linksFor, legBetween, city as cityAt, realKm } from './route.js';
import { capFor } from './capability.js';
import { fleetOf, GADGETS } from './fleet.js';
import { LINES } from './upgrades.js';
import { animalPortrait } from './animalart.js';
// The card picture of a story: its own art (story-vaccine, story-crate: assets/ui, declared in src/preload.js STORY_ART), else the
// animal's portrait through the one place that knows where it is (PixelLab when drawn: src/animalart.js).
export const STORY_PICS = ['story-vaccine', 'story-crate'];
export const storyPicUrl = pic => (STORY_PICS.includes(pic) ? `assets/ui/portrait-${pic}-0.png` : animalPortrait({ sprite: pic, portrait: `assets/ui/portrait-${pic}` }) || 'assets/ui/portrait-story-crate-0.png');

export const STORY = { on: true, slots: 3, fit: [0.55, 0.85], stretch: [1.15, 1.35], maxStops: 4 };
export const SEEDS_PER_KM = 1000 / 15000, CRYSTALS_PER_KM = 80 / 15000;   // (the user, 2026-11-23: 'at least 2x' the first anchor of 500 seeds and 40 crystals per 15,000 km)
export const storyPay = (km, mul = 1) => ({ seeds: Math.round(km * SEEDS_PER_KM * mul), crystals: Math.round(km * CRYSTALS_PER_KM * mul) });

// DIFFICULTY (the user, 2026-11-24, Plan A): built into each story when it is offered and stored with it.
// `fit`: each stage as a share of the pilot's reach. `hearts`: crashes allowed on the story's flights (null: as many tries as you
// like); at 0 the story FAILS and leaves the board. `pay`: multiplier on storyPay. `stops`: theme sizes it may use.
// Slots: 0 easy, 1 medium (impossible instead, 1 time in IMPOSSIBLE_EVERY, seeded), 2 hard (the upgrade story: its stretch band or need).
export const LEVELS = {
  easy:       { name: 'Easy',       fit: [0.35, 0.55], hearts: null, pay: 1,   stops: [2] },
  medium:     { name: 'Medium',     fit: [0.55, 0.85], hearts: 5,    pay: 1.3, stops: [2, 3] },
  hard:       { name: 'Hard',       fit: [0.75, 0.95], hearts: 3,    pay: 1.7, stops: [3, 4] },
  impossible: { name: 'Impossible', fit: [0.9, 1.0],   hearts: 1,    pay: 3,   stops: [4] },
};
export const IMPOSSIBLE_EVERY = 4;
// ONE GO (the user, 2026-11-24: "failure-free stories where you have to actually do it all in one go"): a hard story now and then
// (1 time in ONE_GO.every, by the offer's own number) allows no crash at all: 1 heart, better pay.
export const ONE_GO = { every: 3, hearts: 1, pay: 2.2 };
// SPECIAL DELIVERY (the user, 2026-11-24: "you drop an extra large crate down onto the airstrip without landing ... then you have to
// keep going after that"): a hard story of 3+ stops now and then (1 time in CRATE.every hard offers that are not one go). Land at the
// pickup; then ONE flight passes over every middle stop, where a big crate is dropped onto that airport's runway (src/sim/crates.js),
// and lands at the last stop. Landing at a crate stop does not count. A missed crate costs a heart (the stop is flown again).
export const CRATE = { every: 2, pay: 2.5 };
export const isCrateStop = (o, i) => !!(o && o.crate && i > 0 && i < o.stops.length - 1);
// ONE STORY AT A TIME (the user, 2026-11-24): dropping the active story (ACCEPT on another one, or a FREE FLIGHT) costs a fee:
// a share of what the dropped story still had to pay, at least FEE.min seeds, never more than the player has.
export const FEE = { share: 0.1, min: 50 };
// ONE PLACE (Oliver, 2026-11-25: 'a big storm ... affected London, Oslo, and Papeete ... Papeete is not even close'): a theme about one
// event or one place (`near: true`: a storm, an outbreak, reserves near each other) keeps its delivery stops ({1}..{n}) within NEAR_KM
// real km of each other. The pickup {0} may be far away (help is flown in). A theme without `near` is a tour and chains as before.
export const NEAR_KM = 1500;
const realBetween = (a, b) => { const A = cityAt(a), B = cityAt(b); return A && B ? realKm(A, B) : Infinity; };
export const nearAll = (c, others) => others.every(o => realBetween(c, o) <= NEAR_KM);

// THEMES: the story's words, with {0}..{3} for the stops in order (0 = the pickup). `stops`: how many cities. `areas`: where it
// may be set (null: anywhere open). `pic`: assets/ui/portrait-<pic>-0.png. `needs`: [{ gadget | line: id, level }] makes it an
// upgrade story (it is offered in the third slot). Words: plain, kind, for children; facts kept general (no numbers or names).
export const THEMES = [
  { id: 'vaccine', near: true, stops: 4, pic: 'story-vaccine', title: 'Vaccines for three cities',
    story: 'A new vaccine is ready in {0}. Hospitals in {1}, {2} and {3} are waiting for it.',
    lines: ['The vaccine is packed in ice. Off you go!', 'Nurses in {1} take the first box.', '{2} has its vaccine. One more stop.', '{3} has the last box. Every hospital is ready!'] },
  { id: 'relief', near: true, stops: 4, pic: 'story-crate', title: 'Supplies after a big storm',
    story: 'A big storm has passed. Tents, blankets and water filters from {0} are needed in {1}, {2} and {3}.',
    lines: ['The hold is full of tents and blankets.', '{1} gets its tents first.', 'Water filters for {2}. One more stop!', '{3} has everything it needs. Well flown!'] },
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
  { id: 'orangutans', near: true, stops: 3, pic: 'animal-orangutan', areas: ['sasia'], title: 'Trees for orangutans',
    story: 'Orangutans live high in the rainforest trees. Teams in {1} and {2} are replanting forest so they can move between patches.',
    lines: ['Young rainforest trees on board.', 'The team in {1} starts planting.', 'The new trees join two patches of forest!'] },
  { id: 'pandas', stops: 2, pic: 'animal-panda', areas: ['easia'], title: 'Bamboo for pandas',
    story: 'Giant pandas eat bamboo almost all day. A panda centre near {1} needs a new kind of bamboo from {0}.',
    lines: ['Bamboo shoots, carefully wrapped.', 'The pandas sniff the new bamboo.'] },
  { id: 'elephants', near: true, stops: 3, pic: 'animal-africanelephant', areas: ['africa'], title: 'Water for elephants',
    story: 'In the dry season elephants walk far to find water. Reserves near {1} and {2} need pump parts from {0}.',
    lines: ['Pump parts are loaded.', 'The waterhole near {1} is full again.', 'Elephants drink at {2}!'] },
  { id: 'salmon', near: true, stops: 3, pic: 'animal-cohosalmon', areas: ['namerica'], title: 'Salmon river',
    story: 'Salmon swim up rivers to lay their eggs. A river team from {0} is clearing old dams near {1} and {2}.',
    lines: ['The river team packs their tools.', 'One river runs free near {1}.', 'And another near {2}: the salmon can swim up!'] },
  { id: 'bison', stops: 2, pic: 'animal-bison', areas: ['namerica'], title: 'Bison on the prairie',
    story: 'Bison help prairie grass grow back. A park near {1} is ready for a small herd: fly the grass seed from {0}.',
    lines: ['Grass seed for the bison meadow.', 'The bison step out onto the prairie.'] },
  { id: 'dolphins', stops: 2, pic: 'animal-riverdolphin', areas: ['samerica'], title: 'Pink river dolphins',
    story: 'Pink river dolphins live in the Amazon. Scientists in {1} listen to them with underwater microphones from {0}.',
    lines: ['Underwater microphones on board.', 'Clicks and whistles: the dolphins are here!'] },
  { id: 'puffins', near: true, stops: 3, pic: 'sky-puffin', areas: ['nordic', 'weurope'], title: 'Puffins on the cliffs',
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
    const from = stops[stops.length - 1], drops = stops.slice(1), more = theme.stops - stops.length - 1;
    // (ONE PLACE: every delivery stop near the ones already chosen; the first one only where enough cities are near it)
    const ok = c => !theme.near || (drops.length ? nearAll(c, drops) : pool.filter(x => x !== c && x !== start && nearAll(x, [c])).length >= more);
    const cand = pool.filter(c => !stops.includes(c) && ok(c)).map(c => ({ c, km: wayKm(save, from, c) })).filter(o => o.km);
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
  const level = levelFor(slot, seq), L = LEVELS[level], oneGo = level === 'hard' && seq % ONE_GO.every === 0, crateTry = level === 'hard' && !oneGo && seq % CRATE.every === 0;
  const sized = t => (t.level ? t.level === level : L.stops.includes(t.stops) || (level === 'impossible' && t.stops === 3));   // (a theme written for a level, tools/stories/generate.mjs, goes to that level; else by size; impossible: 3 long stages, or 2 when no 4-stop theme fits)
  const fits = THEMES.filter(t => !onBoard.has(t.id) && (upgrade || !t.needs) && citiesFor(save, t).length >= t.stops)
    .map(t => ({ t, w: sized(t) ? 0 : 1 }));   // (a theme of the level's size first; any other theme after, so a small map still gets an offer)
  const order = fits.map(x => ({ ...x, r: rnd() })).sort((a, b) => a.w - b.w || a.r - b.r).map(x => x.t);
  // Two passes: first only stories that really use the pilot's range (the longest stage at least half the target: a theme set in a
  // small area cannot be stretched, the user: "it was like 4,000 meters when we're easily flying 15,000"), then anything that fits.
  for (const pass of [0, 1]) for (const theme of order) {
    const gadget = upgrade && theme.needs && missingNeeds(save, theme.needs).length > 0;   // an upgrade story by its gadget/nature need
    const crateHere = crateTry && theme.stops >= 3;
    const band = upgrade && !gadget && !crateHere ? STORY.stretch : L.fit;   // (a special delivery is the third slot's special: sized to fly now, no stretch)   // (a special delivery is ONE flight: its whole way, every stage, fits the reach)
    const target = Math.round(reach * (band[0] + rnd() * (band[1] - band[0])) / (crateHere ? theme.stops - 1 : 1));
    if (crateTry && pass === 0 && theme.stops < 3) continue;   // (a special delivery needs a middle stop: try the 3-4 stop themes first)
    const got = pickStops(save, theme, target, rnd); if (!got) continue;
    const stretchNeed = upgrade && !gadget && !crateHere ? Math.max(...got.stages) : 0;
    if (upgrade && !gadget && !crateHere && stretchNeed <= reach) continue;   // the open network could not make it longer than today's reach: try another theme
    if (!upgrade && Math.max(...got.stages) > reach) continue;   // (a fit story must be flyable today)
    if (crateHere && got.stages.reduce((a, b) => a + b, 0) > reach) continue;
    if (pass === 0 && Math.max(...got.stages) < target * 0.5) continue;
    const km = got.stages.reduce((a, b) => a + b, 0), crate = crateHere, payMul = crate ? CRATE.pay : oneGo ? ONE_GO.pay : L.pay;
    return { id: `story-${seq}`, theme: theme.id, slot, made: save.flights || 0, title: theme.title, story: fillWords(theme.story, got.stops), pic: theme.pic,
      level, hearts: oneGo ? ONE_GO.hearts : L.hearts, payMul, ...(oneGo ? { oneGo: true } : {}), ...(crate ? { crate: true } : {}),
      stops: got.stops, lines: theme.lines.map(l => fillWords(l, got.stops)), stages: got.stages, km, pay: storyPay(km, payMul),
      needs: gadget ? theme.needs : stretchNeed ? [{ reach: stretchNeed }] : [] };
  }
  return null;
}
// The level of slot `slot`'s next offer: 0 easy, 1 medium (impossible 1 time in IMPOSSIBLE_EVERY, by the offer's own number), 2 hard.
export const levelFor = (slot, seq) => (slot === 0 ? 'easy' : slot === 2 ? 'hard' : seq % IMPOSSIBLE_EVERY === 0 ? 'impossible' : 'medium');
const missingNeeds = (save, needs) => needs.map(needInfo).filter(i => i && !has(save, i));

// Fill the empty slots (idempotent; returns true when the save changed). An offer already made is never touched.
// AN OFFER THAT BREAKS THE ONE-PLACE RULE (Oliver, 2026-11-26: 'Vaccines for three cities: drop on DENVER, MUMBAI, land at MANAUS',
// about 48,800 km over 23 airports in one flight): offers are frozen when made, so one made before 0.79.2 kept its far-apart stops.
// A one-place theme whose delivery stops are not all within NEAR_KM of each other is taken off the board (its slot is made again).
// The active one goes too when it is a special delivery (nothing is paid before the whole run) or no delivery stop is reached yet;
// a stop-by-stop story already under way is left to finish. No fee, no heart, not counted as dropped or failed. Returns the titles.
export const brokenNear = o => { const t = o && THEMES.find(x => x.id === o.theme); if (!t || !t.near) return false;
  const d = o.stops.slice(1); return d.some((c, i) => !nearAll(c, d.slice(i + 1))); };
export function retireBroken(save) {
  const out = [];
  save.storyBoard = (save.storyBoard || []).map(o => {
    if (!brokenNear(o)) return o;
    const active = o.id === save.storyActive;
    if (active && !o.crate && (o.reached || 0) > 1) return o;
    if (active) { delete save.storyActive; if (save.aimCity === storyAim(o)) delete save.aimCity; }
    out.push(o.title); return null;
  });
  return out;
}
export function fillBoard(save) {
  if (!STORY.on) return false;
  const gone = retireBroken(save); if (gone.length) save.storyRetired = gone;
  const b = save.storyBoard = Array.isArray(save.storyBoard) ? save.storyBoard : [];
  let changed = gone.length > 0;
  for (let i = 0; i < STORY.slots; i++) if (!b[i]) { const o = makeOffer(save, i); if (o) { b[i] = o; changed = true; } }
  return changed;
}

// ---------- the active story ----------
export const activeStory = save => (save.storyBoard || []).find(o => o && o.id === save.storyActive) || null;
// WHERE THE STORY GOES NOW (its destination, save.aimCity): the next stop; on a special delivery ready to fly (at the pickup) the LAST
// stop, the crate stops being dropped on the way; after a failed delivery the pickup again (o.back: 'fly back to the first place').
export const crateRunReady = o => !!(o && o.crate && !o.back && isCrateStop(o, o.reached || 0));
export const storyAim = o => (!o ? null : o.back ? o.stops[0] : crateRunReady(o) ? o.stops[o.stops.length - 1] : o.stops[o.reached || 0]);
export const nextStop = save => storyAim(activeStory(save));
// What the active story still pays (its stages not yet reached), and the fee for dropping it (0 with no active story).
export function leftPay(o) { const n = o.reached || 0; return storyPay(o.stages.slice(Math.max(0, n - 1)).reduce((a, b) => a + b, 0), o.payMul || 1); }
export function dropFee(save) {
  const o = activeStory(save); if (!o) return 0;
  return Math.min(save.seeds || 0, Math.max(FEE.min, Math.round(leftPay(o).seeds * FEE.share)));
}
// The hearts left on a story (null: unlimited).
export const heartsLeft = o => (o && o.hearts ? (o.heartsLeft == null ? o.hearts : o.heartsLeft) : null);
// End the active story without finishing it: it leaves the board (its slot is filled again by fillBoard). `why`: 'drop' | 'failed'.
function endStory(save, why) {
  const o = activeStory(save); if (!o) return null;
  save.storyBoard = save.storyBoard.map(x => (x === o ? null : x));
  delete save.storyActive; if (save.aimCity === storyAim(o)) delete save.aimCity;
  if (why === 'failed') save.storiesFailed = (save.storiesFailed || 0) + 1; else save.storiesDropped = (save.storiesDropped || 0) + 1;
  return o;
}
// Drop the active story (FREE FLIGHT, or replacing it): pays the fee. Returns the fee paid, or -1 with no active story.
export function drop(save) {
  if (!activeStory(save)) return -1;
  const fee = dropFee(save); save.seeds = (save.seeds || 0) - fee; endStory(save, 'drop'); return fee;
}
// LEAVING A STORY (the user, 2026-11-24: "once a story is active, it is the thing that you need to be doing"; going off on a tangent
// fails it; free flight is always there to get out). A flight whose destination is not the story's next stop, a FREE FLIGHT, or a
// crossing ends the story as FAILED (no fee: the story and what it still had to pay are lost). Swapping for another story (ACCEPT)
// is the one that costs the fee.
export const offStory = save => { const o = activeStory(save); return !!(o && save.aimCity && save.aimCity !== storyAim(o)); };
export function leave(save) { return endStory(save, 'failed'); }
// The story's next stop as the destination again (after something cleared it, or BACK TO MY STORY).
export function reaim(save) { const o = activeStory(save); if (o) { settle(save); save.aimCity = storyAim(o); } return !!o; }
// A special delivery ready to fly while the plane is somewhere else (a save from 0.79, which let a delivery go on over several flights):
// it flies back to the pickup first. Idempotent.
export function settle(save) { const o = activeStory(save); if (crateRunReady(o) && save.city !== o.stops[0]) { o.back = true; if (save.aimCity) save.aimCity = storyAim(o); } }
// ACCEPT. One story at a time: with another one active, it is dropped first and the fee paid (the caller shows the fee before).
export function accept(save, id) {
  const o = (save.storyBoard || []).find(x => x && x.id === id);
  if (!o || missing(save, o).length) return false;
  if (save.storyActive && save.storyActive !== o.id) drop(save);
  save.storyActive = o.id; o.reached = o.reached || 0;
  if (o.hearts && o.heartsLeft == null) o.heartsLeft = o.hearts;
  save.aimCity = storyAim(o);   // the destination (src/aim.js): the strip and the lit runway point at the next stop
  return true;
}
// A crash on a story flight (src/missions2.js onFlight): one heart less; at 0 the story fails. Returns { id, title, hearts, of, failed }
// or null (no active story, or an easy one: as many tries as you like).
export function crashed(save) {
  const o = activeStory(save); if (!o || !o.hearts) return null;
  o.heartsLeft = Math.max(0, heartsLeft(o) - 1);
  const failed = o.heartsLeft === 0, out = { id: o.id, title: o.title, hearts: o.heartsLeft, of: o.hearts, failed, ...storyShape(o) };
  if (failed) endStory(save, 'failed');
  return out;
}
// A MISSED STOP (0.79.0; Oliver, 2026-11-24: 'I forgot to land. I just missed the airport ... I don't know what happens to the story'): a landed story flight that flew PAST the
// next stop (not a crate stop) costs a heart, as a crash does; at 0 the story fails. The story goes on from wherever the plane landed (the next stop stays the destination).
// An Easy story has no hearts: nothing is lost, the results card still says so. Returns { id, title, missed, hearts, of, failed, ...shape } or null (no active story).
export function missed(save, city) {
  const o = activeStory(save); if (!o) return null;
  if (!o.hearts) return { id: o.id, title: o.title, missed: city, hearts: null, of: null, failed: false, ...storyShape(o) };
  return { ...crashed(save), missed: city };
}
// After a landing at `city` (src/missions2.js onFlight): the next stop reached? Pays its stage straight away. Returns
// { title, city, line, n, of, done, pay } or null.
export function landedAt(save, city) {
  const o = activeStory(save); if (!o || o.back || o.stops[o.reached || 0] !== city || isCrateStop(o, o.reached || 0)) return null;
  return reach(save, o, city);
}
// BACK AT THE PICKUP after a failed special delivery: the next flight from here is the one-flight delivery again. True when it was.
export function landedBack(save, city) {
  const o = activeStory(save); if (!o || !o.back || city !== o.stops[0]) return false;
  delete o.back; save.aimCity = storyAim(o); return true;
}
// A SPECIAL DELIVERY FLIGHT (Oliver, 2026-11-25: 'one singular flight that gets you through all three. You start on the first one ... make
// the drop, then you land at the end'). Called by src/missions2.js onFlight for a flight that took off from the pickup with the crates on
// board (save.city is still the start). It counts only WHOLE: every crate on its runway AND the landing at the last stop; then every crate
// stop and the last stop are reached and paid together. Anything else (a crash, a missed crate, a landing anywhere else, a crate stop
// too) costs ONE heart and nothing is reached; the flight's own crystals are kept as on any flight; a plane that landed away from the
// pickup must fly back to it (o.back) for the next try. Returns { events: [reach results] } or { hurt } (null: not a delivery flight).
export function crateRun(save, r) {
  const o = activeStory(save), drops = crateStops(save); if (!o || !drops.length) return null;
  const last = o.stops[o.stops.length - 1], got = (r.crates && r.crates.delivered) || [], miss = (r.crates && r.crates.missed) || [];
  if (r.landed && r.landedAt === last && drops.every(c => got.includes(c)) && !miss.length)
    return { events: [...drops.map(c => reach(save, o, c)), reach(save, o, last)] };
  const why = miss.length ? { crate: miss[0] } : r.landed ? { early: r.landedAt, last } : {};   // (a crash: the plain heart)
  const h = crashed(save); if (!h) return null;
  if (!h.failed && r.landed && r.landedAt !== o.stops[0]) { o.back = true; save.aimCity = storyAim(o); }
  return { hurt: { ...h, ...storyShape(o), back: !h.failed && r.landed && r.landedAt !== o.stops[0] ? o.stops[0] : null, ...why } };   // (why last: its `crate` is the city, storyShape's is a flag)
}
// STRICT STOPS (Oliver, 2026-11-25: 'you have to land at the requisite places, unless it's one of those ... as many tries as you want
// stories. But you should lose a life if you land somewhere that's not predetermined'). Once the pickup is reached, a landing anywhere
// but the story's next stop costs a heart (src/storyboard.js crashed). Before the pickup, and flying back to it after a failed delivery,
// only flying PAST it costs one (0.79.0 missed: those trips may need several flights). Easy (no hearts): nothing is lost; the card still
// says a passed stop was missed. Returns the heart record ({ ..., off | missed }) or null (nothing to say).
export function offPlan(save, city, passed = []) {
  const o = activeStory(save); if (!o || !city) return null;
  const aim = storyAim(o); if (city === aim) return null;
  const strict = (o.reached || 0) >= 1 && !o.back, flewPast = passed.includes(aim);
  if (!strict && !flewPast) return null;
  if (!o.hearts) return flewPast ? missed(save, aim) : null;
  return flewPast ? missed(save, aim) : { ...crashed(save), off: city, aim };
}
// A crate delivered onto `city`'s runway (src/sim/crates.js, read by src/missions2.js onFlight): that crate stop is reached and paid.
export function deliveredAt(save, city) {
  const o = activeStory(save); if (!o || o.stops[o.reached || 0] !== city || !isCrateStop(o, o.reached || 0)) return null;
  return reach(save, o, city);
}
// The crate stops a flight from here should drop on, in order (the next stop on, while they are crate stops). Empty: none.
export function crateStops(save) {
  const o = activeStory(save); if (!crateRunReady(o) || save.city !== o.stops[0]) return [];   // (the one flight starts at the pickup)
  const out = []; for (let i = o.reached || 0; isCrateStop(o, i); i++) out.push(o.stops[i]); return out;
}
// The way a special delivery flies in ONE flight: from here over every crate stop to the last stop (null: not a crate flight now).
export function crateWay(save, links) {
  const o = activeStory(save), drops = crateStops(save); if (!drops.length) return null;
  const via = [save.city, ...drops, o.stops[o.stops.length - 1]], way = [save.city];
  for (let i = 1; i < via.length; i++) { const p = pathTo(via[i - 1], via[i], links || linksOf(save)); if (!p) return null; way.push(...p.slice(1)); }
  return way;
}
function reach(save, o, city) {
  const i = o.reached || 0, stage = i === 0 ? 0 : o.stages[i - 1], pay = i === 0 ? { seeds: 0, crystals: 0 } : storyPay(stage, o.payMul || 1);
  o.reached = i + 1;
  const done = o.reached >= o.stops.length;
  if (done && o.pay) { const p = o.paid || { seeds: 0, crystals: 0 }; pay.seeds = o.pay.seeds - p.seeds; pay.crystals = o.pay.crystals - p.crystals; }   // (the last stop pays the rest: the stages add up to the stored pay exactly)
  else o.paid = { seeds: ((o.paid || {}).seeds || 0) + pay.seeds, crystals: ((o.paid || {}).crystals || 0) + pay.crystals };
  if (done) {
    save.storiesDone = (save.storiesDone || 0) + 1;
    save.storyBoard = save.storyBoard.map(x => (x === o ? null : x));
    delete save.storyActive; if (save.aimCity === city) delete save.aimCity;
  } else save.aimCity = storyAim(o);
  return { id: o.id, title: o.title, city, line: o.lines[i] || '', n: i + 1, of: o.stops.length, done, pay, ...storyShape(o) };
}
// What the results card needs to draw a story (src/resultscard.js storyView): its level, its stops and how many are reached, its hearts.
// Copied at the moment of the event, because a finished or failed story has already left the board.
export const storyShape = o => ({ level: o.level || null, oneGo: !!o.oneGo, crate: !!o.crate, stops: [...(o.stops || [])], reached: o.reached || 0,
  heartsLeft: heartsLeft(o), heartsOf: o.hearts || null });
// The mission row the rest of the game sees (src/missions2.js visible; src/aim.js steers to its city): the active story, or null.
export function storyRow(save) {
  const o = activeStory(save); if (!o) return null;
  const left = o.stages.slice(Math.max(0, (o.reached || 0) - 1)).reduce((a, b) => a + b, 0);
  const aim = storyAim(o), what = o.back ? `fly back to ${aim}` : crateRunReady(o) ? `drop on ${crateStopsOf(o).join(', ')}, land at ${aim}` : `land at ${aim}`;
  return { key: `story:${o.id}`, title: `${o.title}: ${what}`, tier: 0, star: false, kind: 'story',
    prize: storyPay(left, o.payMul || 1), def: { id: 'story' }, fill: { city: aim } };
}
export function crateStopsOf(o) { const out = []; for (let i = o.reached || 0; isCrateStop(o, i); i++) out.push(o.stops[i]); return out;
}
