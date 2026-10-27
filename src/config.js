// All gameplay tuning lives here so playtesting changes are one-line edits.

// Feature switches. citizenZoo: the Citizen Zoo partnership (the hangar's "plant a real tree"
// grown-up link, the About-page section, Learn more links, and facts naming them). Off for now;
// set true to bring it all back. Adding ?citizenzoo to the URL also turns it on (for demos).
// A switch one device can flip: open the game with ?<name>=on or ?<name>=off; it is remembered on that device
// (localStorage: '1' on, '0' off). Devices that never chose get `def`. previewChosen(name) is true only on a
// device that opened ?<name>=on (used for the PixelLab load/fps readout).
function previewSwitch(name, def = false) {
  try {
    const v = new URLSearchParams(location.search).get(name), key = `contrailPilot.preview.${name}`;
    if (v === 'on') localStorage.setItem(key, '1');
    if (v === 'off') localStorage.setItem(key, '0');
    const got = localStorage.getItem(key);
    return got === null ? def : got === '1';
  } catch (e) { return def; }
}
const previewChosen = name => { try { return localStorage.getItem(`contrailPilot.preview.${name}`) === '1'; } catch (e) { return false; } };
export const FEATURES = {
  citizenZoo: false || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('citizenzoo')),
  pixelArt: previewSwitch('pixelart', true),   // the PixelLab animals, on for everyone (the user, 2026-10-24); ?pixelart=off opts out
  pixelReadout: previewChosen('pixelart'),   // load/fps readout, only after ?pixelart=on
  season2: typeof window !== 'undefined' && window.SEASON2 === true,   // the redesign preview (src/season2.js, ?season2=1)
  gapMarkers: previewSwitch('gapmarkers', true),   // clearer next-gap hint, ON for everyone (the user, 2026-10-26; systems only, day-readable; src/gapmarkers.js); ?gapmarkers=off opts out
};
// Text that only appears with the Citizen Zoo feature on (else `off`).
export const cz = (on, off = '') => (FEATURES.citizenZoo ? on : off);
export const WIDTH = 288;   // Flappy Bird's original resolution
export const HEIGHT = 512;
export const GROUND_H = 48;

export const PLANE = {
  x: 60,             // hitbox left edge on screen
  // Hitbox is the fuselage only (forgiving); the sprite is drawn around it.
  w: 50,
  h: 12,
  spriteW: 62,       // assets/plane.png
  spriteH: 27,
  spriteOffX: 8,     // hitbox position inside the sprite
  spriteOffY: 12,
  maxTilt: 0.35,     // radians, nose up/down with vertical speed
  gravity: 900,     // px/s^2
  flapVelocity: -260,
  maxFall: 400,
};

// The game's distance unit is shown as km: PARIS at 1500 is "1500 km" (a real-ish flight
// length). The code still calls the unit m / px; only the label changes.
export const km = d => `${Math.max(0, Math.round(d)).toLocaleString('en-GB')} km`;   // 1,900 km

export const WORLD = {
  startSpeed: 90,    // px/s scroll speed
  speedGain: 0.55,   // px/s added per second flown after the warm-up (top speed ~1.5 min in)
  maxSpeed: 140,
  warmup: 1500,      // m: no speed-up or narrowing gaps before the first airport
  pxPerMetre: 1,     // distance shown = px scrolled / this
};

export const STORMS = {
  // Era 6 twist (far future): from 22,000 km a storm gap narrows and widens by +-amp px every `period` s. TBD-SIM.
  pulse: { from: 22000, era: 5, amp: 18, period: 3 },
  width: 44,
  startGap: 200,      // 150 until 0.12.0 (season 2 rescale "B": gentle first storms, same squeeze by ~10k km)
  minGap: 115,
  gapShrinkPerPair: 2,   // (1 until 0.12.0) only counts pairs after WORLD.warmup
  spacing: 230,      // px between storm pairs (260 until 0.10.0: with the shorter legs back, a busier sky per km)
  clearLane: 24,     // every storm gap keeps a lane this much taller than the plane free of icy air and birds
  marginTop: 40,     // gap centre never closer than this to the top/ground
};

export const ISSR = {
  minW: 140, maxW: 320,
  minH: 50, maxH: 110,
  spawnEvery: 180,   // px of scroll between ISSR spawn attempts
  spawnChance: 0.85,
  // ISSRs are invisible until the plane is within revealPx of one, then fade in.
  // Research upgrades will raise revealPx (see you earlier) and hiddenAlpha (faint shimmer).
  hiddenAlpha: 0,
  revealPx: 50,
  revealAlpha: 0.3,   // fully faded in, just before entry
  insideAlpha: 0.5,   // once you're in one, show it clearly so you can find the way out
};

export const CONTRAIL = {
  size: 4,
  every: 12,         // ms between squares while inside an ISSR
  life: 7000,        // ms until fully faded
  drift: 6,          // px/s extra leftward spread
};

export const TAKEOFF = {
  // Hold the screen to roll down the runway; let go and the plane just slows down (never fails).
  rollAccel: 150,      // px/s^2 while holding
  rollBrake: 60,       // px/s^2 slowing down when you let go
  liftSpeed: 90,       // roll speed at which the wheels leave the ground (= WORLD.startSpeed)
  seconds: 1.4,        // auto-climb after lift-off, then tapping takes over
  climbVelocity: -120,
};

export const AIRPORT = {
  // Which cities and how far apart: the journey in src/route.js.
  runwayLen: 220,
  stormClearBefore: 120,  // no storms this far before the runway...
  stormClearAfter: 40,    // ...or this far after it
  signFrom: 700,       // show "Next: PARIS" this far ahead
  // Landing flare: low, falling, within flareFrom of the runway start and with no storm in the
  // way, the plane floats onto the runway.
  flareFrom: 320,      // px (= m) before the runway start
  flareHeight: 80,     // px above the ground
  flareVy: 60,         // px/s: gentle sink once over the runway
  flareCo2: 1.5,       // CO2 x this while flaring
  rollSeconds: 1.4,    // decelerate along the runway after touchdown
};

export const TOKENS = {
  spawnEvery: 240,     // px between chances to place a floating tree
  chance: 0.25,        // ...rising with distance (see chancePerKm)
  chancePerKm: 0.1,
  maxChance: 0.85,
  goldenAfter: 2500,   // m; golden trees (worth 3) start appearing
  goldenChance: 0.15,
  bob: 3,              // px up/down
  magnetPull: 140,     // px/s, how fast a magnet pulls trees in
};

// Pick-ups (2026-10-22). SAF: cleaner fuel for a while: All-SAF numbers (less CO2; less soot, so
// fewer, bigger ice crystals and thinner, shorter-lived contrails). Only offered if it would help
// (not on All SAF or hydrogen). AUTOPILOT: just for fun, the plane flies itself round storms, birds
// and icy air; it can still crash, and your first tap takes control back.
export const POWERUPS = {
  every: 700,          // px between chances to place one
  from: 900,           // m before the first can appear
  safChance: 0.35,
  autoChance: 0.06,    // rarer (user, 2026-10-22)
  safFirstAt: 1500,    // m: the first SAF can always comes early, in your path
  safSeconds: 12,
  autoSeconds: 8,
  autoLockMs: 1500,    // taps are ignored this long after grabbing it (you are usually mid-tap)
  autoClimb: 480,      // px/s the autopilot may climb or dive (a tap gives 260)
};

// Hazards that join the storms as the flight gets longer (distances in m = px).
export const HAZARDS = {
  stormForgive: 5,   // plane pixels that may brush a storm cloud before it counts as a crash (no-fly and birds: 0)
  // A patch of bumpy air (like an ISSR) you can fly over or under.
  turbulence: { from: 2000,   // (4,000 until 0.10.0: now even the first leg can have bumpy air)
                every: 650, chance: 0.5, minW: 140, maxW: 220, minH: 90, maxH: 150, delay: [30, 120], bump: 60, bumpEvery: [0.3, 0.6] },
  noFly:      { from: 8000, chance: 0.45, width: 30, gapLess: 28, minGap: 82,
                // Era 4 twist (2010s, PROPOSAL-ERAS-4-6-SYSTEMS): from 14,000 km a zone's gap drifts up or down (px/s). TBD-SIM.
                drift: { from: 14000, era: 3, pxs: 20 } },
  birds:      { from: 10000, every: 700, chance: 0.55, flock: [11, 15], extraSpeed: 45, wobble: 22,   // many small birds (2026-10-22)
                // Era 5 twist (2030s): from 18,000 km a flock slides dy px once, at `at` of the screen, over `secs`. TBD-SIM.
                turn: { from: 18000, era: 4, dy: 70, at: 0.55, secs: 0.6 } },
  // The long-haul squeeze (far future): from 26,000 km, every 4,000 km the no-fly and bird chances rise by `add`. TBD-SIM.
  squeeze: { from: 26000, era: 5, every: 4000, add: 0.03, capNoFly: 0.6, capBirds: 0.7 },
};

export const PARCEL = {
  gravity: 320,        // px/s^2 until the parachute opens
  chuteAfter: 0.25,    // s
  terminal: 160,       // px/s falling under the parachute
  dragTime: 3.0,       // s; how quickly the parcel loses the plane's forward speed
  plotW: 48,           // soil plot width on the ground (the Soil upgrade line widens it)
  plotEvery: [180, 600],  // px between soil plots (was 260-420: too even, user 2026-10-22)
  firstAt: 1000,       // m: soil plots start 1 km in
};

// Trees on long flights (2026-10-21, user: the longest runs must need a full forest). Trees cool
// a little on short flights; from `from` km into a flight, GROWN trees get an old-wood boost
// that rises over `span` km up to x(1 + boost). The boost is x(kinds planted THIS flight / 5)^power,
// so only a forest of all 5 kinds gets it all. Measured 2026-10-26 by the engine (tools/sim/forest-species.mjs,
// game chat's trees-rework branch): twinFull, 6 parcels, never-crash pilot, 5 skies, smart / careful:
// no trees 27.9k / 24.9k km, today's 5 slots 38.2k / 38.1k (a lap is 32,060: LAP_KM in route.js).
// These are NEVER-CRASH UPPER BOUNDS, not what a real player reaches; every run still overheats in the end.
export const FOREST = {
  early: 0.5,     // x every tree's cooling (stage values in nature.js)
  from: 10000,    // km
  span: 15000,    // km to reach the full boost
  boost: 2,
  kinds: 5,
  power: 2,
  // A forest can only soak up so much CO2 in one flight, then it is full and stops cooling
  // (measured 2026-10-21: any cooling that never stops let a careful pilot fly for ever).
  store: 80,      // with all 5 kinds; x(kinds / 5)^storePower with fewer
  storePower: 4,
  storeMin: 12,   // ...but never less: more than a short early flight's trees soak up
  landStore: 30,  // rewilded land (natureCooling) fills up too: this much with ALL habitat projects (src/habitats.js)
};

export const CRYSTALS = {
  dodge: 1,            // icy air that was in your path at night, flown around
  dodgesPerNight: 3,   // at most this many dodge crystals each night
  cleanNight: 2,       // a whole night with no heat trapped (Night Owl)
};
export const CARGO = {
  multiplierPerSkip: 0.5,   // landing bonus: x1, x1.5, x2 ... per airport skipped
  coolBonus: 3,             // extra trees for landing with the Earth cooler than at take off
};

export const DAYNIGHT = {
  bannerTimes: 3,     // the 'Night is coming!' / 'Sunrise!' banner shows this many times per device, then only the sky + sound
  daySeconds: 15,
  nightSeconds: 15,
  blendSeconds: 4,     // dusk / dawn: sunset and sunrise at the end of each half (3, then 6 on 2026-10-22; 4 on 2026-10-23: 6 felt too long)
  neutralFrac: 0.2,    // the middle fifth of dusk / dawn: contrails neither cool nor warm. Cooling fades out before it, warming fades in after (dawn: the other way round)
  skyNight: 0x1b2140,
  glowLow: 0xff8a3d,   // sunset / sunrise glow near the horizon...
  glowHigh: 0xff6a9a,  // ...fading to pink higher up
  sunSet: 0xff7a3a,    // the sun turns orange as it sets
};

export const RADIATION = {
  spacing: 12,         // px between light/heat columns
  margin: 18,          // keep columns clear of the HUD bars
  beamAlpha: 0.16,      // night heat haze
  dayAlpha: 0.2,        // day sunlight bands (kept faint so the shadows stand out)
  hazeSeg: 6,          // px per wiggling segment of a heat column
  hazeRise: 0.05,      // how fast the wiggle drifts upward
  shadowAlpha: 0.5,    // ground shadow under a contrail (day)
  glowAlpha: 0.6,      // ground glow under a contrail (night)
};

// Units are play units, not W/m^2. The bar ends the run at dangerLine.
export const CLIMATE = {
  co2Cruise: 1.0,      // CO2 gauge reading while cruising (fuel upgrades lower this)
  co2Takeoff: 3.0,     // gauge reading during takeoff and landing
  co2ToHeat: 1.5,      // heat per second per gauge unit (normal fuel overheats at ~6.5 km: ROME needs upgrades)
  sunBlockedPerCol: -0.66,  // per second, per light column a contrail blocks (day)
  heatTrappedPerCol: 0.93,  // per second, per heat column a contrail traps (night)
  // Late game (2026-10-21): once CO2 is solved, contrails are the big thing left, as in real life.
  nightWaterPower: 1,       // night trapping x (fuel water)^this: hydrogen's extra water = thicker night contrails
  dayWaterPower: 0,         // day shade x (fuel water)^this: ...and more shade by day, so good flying pays
  lateFrom: 3000,           // km into a flight where the long-haul ramp starts...
  latePer10k: 2.0,          // ...then +this x icy air AT NIGHT (how often and how big) per 10,000 km: dodging matters more and more
  dangerLine: 165,     // 100 until 0.10.3 (user: the Comet overheated too soon; balance bot: a fully upgraded 1950s Comet now flies ~9,100-11,800 km)
  barMin: -50,
  gaugeMax: 3.0,
};

export const COLOURS = {
  skyDay: 0x6ec6e8,
  ground: 0x5a8f3c,
  groundEdge: 0x3e6b28,
  storm: 0x4a4e69,
  stormEdge: 0x22223b,
  issr: 0xf4fbff,
  contrail: 0xffffff,
  text: '#ffffff',
  runway: 0x55555f,
  runwayMark: 0xf2f2f2,
  sun: 0xffe15a,
  heat: 0xff6a3d,
  cool: 0x7fd3ff,
  warm: 0xff4040,
  co2: 0x9a9a9a,
  hudBack: 0x000000,
};
