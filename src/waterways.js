// WATERWAYS (0.73.0; Oliver, 2026-11-23: plan https://claude.ai/artifact/V6LViLcX23qAiG7kQXb983). Each land's nature meter is split between its LAND and its WATER,
// by how much water the land really has: 'say 60% of your biodiversity should come from land and 40% from water ... scaled adaptively based on the biome ... Polynesia
// might come out to be like 80% from the waterways'. The land part is today's meter (trees + land projects); the water part is filled by WATER DROPS on the water targets
// in flight (half) and by the land's WATER PROJECTS (half). The water opens once the land's biome is full (every open tree kind at its cap).
// Water-heavy lands get a smaller tree cap so the land side is quick and the player moves on to the water ('you should very quickly finish the land-based projects').
// Pure data and arithmetic, no DOM: src/nature.js reads it for the meter, src/landtrees.js for the cap, the flight (src/sim/rules.js) for drops.

// The WATER share of each land's 100 (the land share is the rest). First guesses from the water each land declares (src/water.js WATER); Oliver's anchors: desert ~5, default 40,
// Polynesia ~80. A land not listed (the sea, the ice) has no meter.
export const WATER_SHARE = {
  polynesia: 80, islandforest: 50, rainforest: 50, monsoon: 45, boreal: 45, woodland: 40, tundra: 40,
  mediterranean: 35, plains: 35, eastasia: 35, bush: 30, steppe: 25, savanna: 20, desert: 5,
};
export const waterShare = land => WATER_SHARE[land] ?? 0;
export const landShare = land => 100 - waterShare(land);

// Projects that belong to the WATER side (declared, by id, from src/habitats.js / src/habitat/*.js: rivers, wetlands, coasts, reefs and the sea). Every other project is LAND.
// The desert keeps one (Oliver: 'all of the projects basically, except maybe one, should be land-based'): its wadi. Its coastal projects (mangroves, reef...) stay on the land side there.
export const WATER_PROJECTS = {
  woodland: ['pond', 'voles', 'beavers', 'rewet'],
  mediterranean: ['turtlebeach', 'reedcut', 'flamingoisland'],
  desert: ['wadi'],
  monsoon: ['mangroves', 'peatdams', 'gharialhatch'],
  eastasia: ['storkrice', 'zhalong'],
  boreal: ['culvert', 'beavermove', 'elwha'],
  plains: ['potholes', 'platte', 'oysters'],
  tundra: ['ditchblock', 'eiderguard', 'rivers', 'sealcount'],
  savanna: [],
  rainforest: ['riverbeach', 'fishcount', 'dolphins', 'otterwatch'],
  islandforest: ['whitebait', 'hoihoplant', 'nzdolphins'],
  bush: ['platypusbank'],
  steppe: ['whalesea', 'kelpsea', 'fjordwatch', 'penguinsea'],
  polynesia: ['coralplant', 'turtleclinic', 'rahui', 'mantacount', 'sharksafe', 'maraemoana'],
};
export const isWaterProject = (land, id) => (WATER_PROJECTS[land] || []).includes(id);

// The TREE CAP per kind in a land: 9 where the land share is 60 or more, smaller where water dominates (never under 3). Points are scaled so a land's trees at its cap score
// what 9 of a kind score (src/nature.js), so the land side still reaches its full share.
export const BASE_CAP = 9;
export const treeCap = land => Math.max(3, Math.min(BASE_CAP, Math.round(BASE_CAP * landShare(land) / 60)));

// WATER DROPS: what the player drops on the water targets once the land's biome is full. Two or three kinds per land, each with a cap (like trees). `fact`: one line,
// `verify: true` = written from general knowledge, not yet checked against a source (the game must not present it as checked; tools/factcheck lists them).
const V = { verify: true };
export const DROP_CAP = 6;
// The water targets in flight: narrower and rarer than soil plots (PARCEL.plotW 48-96 px, every 180-600 px), so the water fills slower ('much harder ... fewer targets').
// PLAN C (Oliver, 2026-11-24: 'the water dropping is impossible ... still drop but it's steeper? Maybe a slightly bigger target'). Measured: a water drop fell under the TREE
// parachute (src/config.js PARCEL) and drifted 53-239 px forward before landing, by height and speed (start 90 / top 140 px/s; plane 100-400 px up), onto a 28 px target: the spot
// moved by more than four targets with the plane's height. Now it falls fast with no parachute (gravity, dragTime) and drifts 23-46 px, close under the plane at any height, onto 44 px.
// (was: w 28, every [600, 1400], the tree parachute)
export const WATER_PLOT = { w: 44, every: [500, 1000], gravity: 600, dragTime: 0.35 };
export const WATER_DROPS = {
  woodland: [{ id: 'gravel', name: 'Gravel bed', fact: 'Salmon and trout lay their eggs in clean river gravel.', ...V }, { id: 'willow', name: 'Willow stakes', fact: 'Willow cuttings root in wet banks and hold the soil.', ...V }, { id: 'reeds', name: 'Reed plugs', fact: 'Reed beds clean water and shelter birds.', ...V }],
  mediterranean: [{ id: 'seagrass', name: 'Seagrass', fact: 'Posidonia seagrass meadows shelter young fish.', ...V }, { id: 'reeds', name: 'Reed plugs', fact: 'Reed beds clean water and shelter birds.', ...V }],
  desert: [{ id: 'oasis', name: 'Oasis palms', fact: 'Date palms shade an oasis so other plants can grow.', ...V }],
  monsoon: [{ id: 'mangrove', name: 'Mangrove seedlings', fact: 'Mangroves protect coasts from storms and are fish nurseries.', ...V }, { id: 'lotus', name: 'Lotus seeds', fact: 'Lotus and water plants shelter fish in still water.', ...V }],
  eastasia: [{ id: 'reeds', name: 'Reed plugs', fact: 'Reed beds clean water and shelter cranes.', ...V }, { id: 'rice', name: 'Wet rice fields', fact: 'Flooded fields give herons and storks food.', ...V }],
  boreal: [{ id: 'gravel', name: 'Gravel bed', fact: 'Salmon need clean gravel to lay their eggs.', ...V }, { id: 'logs', name: 'River logs', fact: 'Fallen logs make pools where young fish hide.', ...V }],
  plains: [{ id: 'oyster', name: 'Oyster shells', fact: 'Oyster reefs filter the water as they feed.', ...V }, { id: 'reeds', name: 'Wetland plants', fact: 'Prairie wetlands are where many ducks nest.', ...V }],
  tundra: [{ id: 'gravel', name: 'Gravel bed', fact: 'Arctic char and salmon spawn on gravel.', ...V }, { id: 'kelp', name: 'Kelp', fact: 'Kelp forests shelter fish and feed sea urchins.', ...V }],
  savanna: [{ id: 'papyrus', name: 'Papyrus', fact: 'Papyrus swamps filter lake water.', ...V }, { id: 'lilies', name: 'Water lilies', fact: 'Lily pads shade the water for fish and frogs.', ...V }],
  rainforest: [{ id: 'fruit', name: 'Flooded-forest seeds', fact: 'In flooded forests, fish eat fruit and spread the seeds.', ...V }, { id: 'turtle', name: 'Turtle nests', fact: 'River turtles lay eggs on sandy river beaches.', ...V }],
  islandforest: [{ id: 'flax', name: 'Flax by streams', fact: 'Stream-side plants shade the water and shelter whitebait eggs.', ...V }, { id: 'kelp', name: 'Kelp', fact: 'Kelp forests shelter fish and crayfish.', ...V }],
  bush: [{ id: 'reeds', name: 'River reeds', fact: 'Reeds and banks give platypus places to dig burrows.', ...V }, { id: 'logs', name: 'River logs', fact: 'Snags in rivers make homes for Murray cod.', ...V }],
  steppe: [{ id: 'kelp', name: 'Kelp', fact: 'Giant kelp forests line cold southern coasts.', ...V }, { id: 'gravel', name: 'Gravel bed', fact: 'Native fish spawn on clean river gravel.', ...V }],
  polynesia: [{ id: 'coral', name: 'Coral fragments', fact: 'Coral fragments can be grown and planted back on reefs.', ...V }, { id: 'seagrass', name: 'Seagrass', fact: 'Seagrass feeds turtles and holds the sand.', ...V }, { id: 'clam', name: 'Giant clams', fact: 'Giant clams filter the water on a reef.', ...V }],
};
export const dropsOf = land => WATER_DROPS[land] || [];

// The WATER meter of a land, 0..100: half from drops (each kind up to DROP_CAP, all kinds full = 50), half from its water projects done (by their points; a land with none
// gets the whole 100 from drops). `done`: the water project ids funded there. `book`: save.waterBook[land] = { dropId: n }.
export function waterMeter(land, book = {}, done = [], projects = []) {
  const kinds = dropsOf(land); if (!kinds.length) return 0;
  const dropFrac = kinds.reduce((a, k) => a + Math.min(DROP_CAP, book[k.id] || 0), 0) / (kinds.length * DROP_CAP);
  const water = projects.filter(p => isWaterProject(land, p.id));
  if (!water.length) return Math.round(100 * dropFrac);
  const all = water.reduce((a, p) => a + p.bio, 0), got = water.filter(p => done.includes(p.id)).reduce((a, p) => a + p.bio, 0);
  return Math.round(50 * dropFrac + 50 * (all ? got / all : 0));
}
// The land's whole meter from its two parts (each 0..100).
export const combine = (land, landMeter, water) => Math.min(100, Math.round(landMeter * landShare(land) / 100 + water * waterShare(land) / 100));

// YIELD: a funded water project pays this many seeds on every landing, anywhere ('when you've got these projects going ... it starts producing stuff for you').
export const YIELD_PER_PROJECT = 40;   // seeds a landing per water project (a tier 2 project, ~2,400 seeds after the PRICE SCALE, pays back in about 60 landings)
