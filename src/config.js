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
  speedGain: 1.5,    // px/s added per second flown
  maxSpeed: 170,
  pxPerMetre: 1,     // distance shown = px scrolled / this
};

export const STORMS = {
  width: 44,
  startGap: 150,
  minGap: 105,
  gapShrinkPerPair: 2,
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
  seconds: 2.0,        // auto-climb with no player control
  climbVelocity: -90,
};

export const AIRPORT = {
  every: 1500,         // px (= m) between airports
  runwayLen: 220,
  stormClearBefore: 120,  // no storms this far before the runway...
  stormClearAfter: 40,    // ...or this far after it
  signFrom: 700,       // show "Next: PARIS" this far ahead
  rollSeconds: 1.4,    // decelerate along the runway after touchdown
  names: ['PARIS', 'AMSTERDAM', 'BERLIN', 'ROME', 'MADRID', 'OSLO', 'ATHENS', 'CAIRO', 'DUBAI', 'DELHI', 'BEIJING', 'TOKYO', 'SYDNEY'],
  home: 'LONDON',
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
  co2ToHeat: 1.8,      // heat per second per gauge unit
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
