// All gameplay tuning lives here so playtesting changes are one-line edits.
export const WIDTH = 288;   // Flappy Bird's original resolution
export const HEIGHT = 512;
export const GROUND_H = 48;

export const PLANE = {
  x: 70,
  w: 20,
  h: 10,
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
  spacing: 190,      // px between storm pairs
  marginTop: 40,     // gap centre never closer than this to the top/ground
};

export const ISSR = {
  minW: 140, maxW: 320,
  minH: 50, maxH: 110,
  spawnEvery: 260,   // px of scroll between ISSR spawn attempts
  spawnChance: 0.75,
  alpha: 0.12,       // faint at the start; research upgrades will raise this
};

export const CONTRAIL = {
  size: 4,
  every: 40,         // ms between squares while inside an ISSR
  life: 7000,        // ms until fully faded
  drift: 6,          // px/s extra leftward spread
};

export const COLOURS = {
  skyDay: 0x6ec6e8,
  ground: 0x5a8f3c,
  groundEdge: 0x3e6b28,
  plane: 0xf2f2f2,
  planeTail: 0xd94040,
  storm: 0x4a4e69,
  stormEdge: 0x22223b,
  issr: 0xbfe8ff,
  contrail: 0xffffff,
  text: '#ffffff',
};
