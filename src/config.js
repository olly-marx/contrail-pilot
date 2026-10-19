// All gameplay tuning lives here so playtesting changes are one-line edits.
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

export const WORLD = {
  startSpeed: 90,    // px/s scroll speed
  speedGain: 0.55,   // px/s added per second flown after the warm-up (top speed ~1.5 min in)
  maxSpeed: 140,
  warmup: 1500,      // m: no speed-up or narrowing gaps before the first airport
  pxPerMetre: 1,     // distance shown = px scrolled / this
};

export const STORMS = {
  width: 44,
  startGap: 150,
  minGap: 115,
  gapShrinkPerPair: 1,   // only counts pairs after WORLD.warmup
  spacing: 260,      // px between storm pairs
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
  every: 1500,         // px (= m) between airports
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
  // The route east from London, then across the Pacific to NEW YORK (the last mission), then round again.
  names: ['PARIS', 'AMSTERDAM', 'BERLIN', 'ROME', 'ATHENS', 'CAIRO', 'DUBAI', 'DELHI', 'BEIJING', 'TOKYO', 'LOS ANGELES', 'NEW YORK'],
  home: 'LONDON',
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

// Hazards that join the storms as the flight gets longer (distances in m = px).
export const HAZARDS = {
  stormForgive: 5,   // plane pixels that may brush a storm cloud before it counts as a crash (no-fly and birds: 0)
  // A patch of bumpy air (like an ISSR) you can fly over or under.
  turbulence: { from: 4000, every: 650, chance: 0.5, minW: 140, maxW: 220, minH: 90, maxH: 150, delay: [30, 120], bump: 60, bumpEvery: [0.3, 0.6] },
  noFly:      { from: 8000, chance: 0.45, width: 30, gapLess: 28, minGap: 82 },
  birds:      { from: 10000, every: 700, chance: 0.55, flock: [4, 6], extraSpeed: 45, wobble: 22 },
};

export const PARCEL = {
  gravity: 320,        // px/s^2 until the parachute opens
  chuteAfter: 0.25,    // s
  terminal: 160,       // px/s falling under the parachute
  dragTime: 3.0,       // s; how quickly the parcel loses the plane's forward speed
  plotW: 48,           // soil plot width on the ground (the Soil upgrade line widens it)
  plotEvery: [260, 420],  // px between soil plots
  firstAt: 1000,       // m: soil plots start 1 km in
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
  daySeconds: 15,
  nightSeconds: 15,
  blendSeconds: 3,     // dusk / dawn colour blend at the end of each half
  skyNight: 0x1b2140,
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
  dangerLine: 100,
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
