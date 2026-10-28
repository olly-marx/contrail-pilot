// The flight's rules as methods (sim engine landing 5f, 2026-10-25), moved verbatim from GameScene. GameScene
// mixes them in (Object.assign(GameScene.prototype, RULES)) and the sim engine's world does the same, so both run
// exactly this code. `this` is the flight. No Phaser here: drawing and sound go through hooks the world leaves empty.
import { km, WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, DAYNIGHT, PARCEL, HAZARDS, AIRPORT, CLIMATE, TOKENS, POWERUPS, TAKEOFF, CRYSTALS, FOREST, CARGO } from '../config.js';
import { tip } from '../tips.js';
import { GAP_HINT, FORECAST, FARES, syncFleet, PLANES } from '../fleet.js';
import { SPECIES, natureCooling, projectsDone, PROJECTS, localTree, biodiversity } from '../nature.js';
import { treesOpen, slotKind } from '../landtrees.js';
import { current as currentMission, complete as completeMission, indexOf as missionIndexOf } from '../missions.js';
import { isSeason2, onFlight as s2Flight, next as s2NextMission, lessonsLeft as s2LessonsLeft } from '../missions2.js';
import { addPrizes } from '../rewards.js';
import { eraProgress } from '../eras.js';
import { REGION_DATA, REGION_NAMES } from '../habitats.js';
import { flightPath, legBetween, HOME, city, EARTH_KM, schoolSave } from '../route.js';
import { crossingPath, recordAreaBest } from '../crossings.js';   // season 2 crossings (redesign)
import { regionBelow } from '../geo.js';
import { loadout, FUELS } from '../upgrades.js';
// Planted defects for tests/sim-result-fields.cjs (each must FAIL it): scrape = every gap counts as clean; nofly = a
// no-fly zone counts when the nose reaches it (a crash in it counts too); trees = treeIds left empty.
// Planted defects for tests/sim-twists.cjs (each must FAIL it): still = no twist ever moves; early = twists ignore `from`.
export const TWIST_PLANTS = { still: false, early: false };
export const FIELD_PLANTS = { scrape: false, nofly: false, trees: false };
import { recordFlight } from '../records.js';
import { makeRng } from './rng.js';
import { overlaps } from './physics.js';
import * as P from './physics.js';
import { mask } from './masks-load.js';

const SKY_H = HEIGHT - GROUND_H;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // = Phaser.Math.Clamp
const crashKind = reason => /Bird/.test(reason) ? 'bird' : /Restricted/.test(reason) ? 'nofly' : /Storm/.test(reason) ? 'storm'
  : /too hot/.test(reason) ? 'overheat' : 'ground';
const GRACE_MS = 1500;   // breather after a pop-up closes: the autopilot flies, then hands back
const FLOCK_HALF = 2;   // a flock fills the box of an old 5-bird V: 26 px across, 36 px down
// PixelLab thunderclouds (the user, 2026-10-24): every storm column is a whole storm tower picture
// (tools/art/pixellab_storm.py): crown up below the gap, hanging (flipped, darker) above it.
// tools/sim/bake-masks.py bakes a mask for each: add a letter there too.
export const STORM_ART = ['c', 'd'];
const STORM_OVERLAP = 40;   // a tall column stacks another tower behind, overlapping this much

export const RULES = {
  // Onto the runway (moved from GameScene.startFlight): the kit as bought now, a fresh random stream, take-off.
  takeOff() {
    // Upgrades may have been bought in the hangar since this scene was built.
    this.kit = loadout(this.save);
    const seed = this.save.simSeed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rng = makeRng(seed);   // physics random numbers, one stream per flight (src/sim/rng.js): what SPAWNS
    this.rngPlane = makeRng((seed ^ 0x9E3779B9) >>> 0);   // the plane's own random numbers (see planeBetween)
    this.safUntil = 0; this.autoUntil = 0; this.ownKit = null; this.nextPowerAt = POWERUPS.from; this.safOffered = false;   // pick-ups
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.setState('takeoff');
    this.rollSpeed = 0;
    this.airborne = false;
    this.flySeconds = 0;   // real flying time this flight, for the eras (src/eras.js)
    this.bioStartAll = Object.fromEntries(Object.keys(REGION_NAMES).map(r => [r, biodiversity(this.save, r)]));   // every land's meter, for the results
    this.bioStart = biodiversity(this.save);   // flights is counted at lift-off: going back to the menu from the runway is not a flight
  },
  // The flight's state, before take-off (moved from GameScene.create, sim engine 5f). this.save and
  // this.autostart are set by the caller.
  initFlight() {
    this.kit = loadout(this.save);
    const seed = this.save.simSeed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rng = makeRng(seed);   // physics random numbers (src/sim/rng.js): what spawns; decoration keeps Math.random
    this.rngPlane = makeRng((seed ^ 0x9E3779B9) >>> 0);   // the plane's own random numbers (see planeBetween)
    this.state = 'idle';             // idle -> takeoff -> playing -> landing | over
    this.speed = WORLD.startSpeed;
    this.distancePx = 0;
    this.elapsed = 0;
    this.stateTime = 0;
    this.storms = [];
    this.issrs = [];
    this.contrails = [];
    this.blockers = [];
    this.runways = [];
    this.trees = [];                 // planted trees: keep cooling after they scroll away
    this.plots = [];                 // soil plots on the ground to aim parcels at
    this.turbs = [];                 // turbulence zones {x, y, w, h, blobs, view}
    this.birds = [];                 // flocks {birds: [{ox, oy, x, y, key, flip, view}], x, y, phase}
    this.nextTurbAt = HAZARDS.turbulence.from;
    this.nextBirdsAt = HAZARDS.birds.from;
    this.inTurb = false;
    this.bumpIn = 0;
    this.parcelsFalling = [];
    this.nextPlotAt = PARCEL.firstAt;
    this.treeFeedback = 0;
    this.speciesIdx = 0;
    this.decor = [];                 // ponds etc. scrolling on the ground
    this.nextDecorAt = 500;
    this.storks = [];
    this.explaining = false;
    this.popups = [];
    this.tokens = [];                // floating trees to collect
    this.cargo = 0;                  // seeds on board: kept only if you land
    this.crystals = 0;               // ice crystals earned this flight: always kept
    this.nightDodges = 0;            // dodge crystals so far tonight (capped)
    this.dodgesTotal = 0;            // all nights this flight (for the online boards)
    this.nextTokenAt = 420;
    this.clock = 0;                  // drives day and night (flight school can set it)
    this.gameTime = 0;               // ms of unfrozen flight, used for contrail ages
    this.frozen = false;             // flight school pauses the action to explain
    this.school = null;
    this.nextStormAt = WIDTH + 200;  // first storm arrives after the climb-out
    this.nextIssrAt = 300;
    this.l2Patch = null;             // season 2, lesson L2 pending: one daytime icy patch is guaranteed (decided at the first ISSR check)
    this.stormCount = 0;
    this.lastContrail = 0;
    this.wasInIssr = false;
    // Contrail-free cruise (Ops 8+, eras 4-6): while the player holds it (cleanHeld, set by GameScene from input; always
    // false in the engine: the model never uses it), no contrail is made, for up to kit.cleanSecs each night.
    this.cleanHeld = false;
    this.cleanLeft = 0;

    this.heat = 0;                   // net heating (play units)
    this.totalCo2 = 0;
    this.co2Rate = 0;
    this.sunBlocked = 0;
    this.heatTrapped = 0;
    this.breakdown = { co2: 0, night: 0, sun: 0, trees: 0 };
    this.feedback = { amount: 0, timer: 0 };
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.planted = 0;
    this.forestFullSaid = false;
    this.landStored = 0;               // ...and rewilded land
    this.forestStored = 0;             // CO2 the forest has soaked up this flight (see forestStore())
    this.goldens = 0;                  // golden seeds grabbed
    this.foundIds = []; this.foundThisFlight = 0;   // animals found THIS flight (the scene object is reused between flights)
    this.cleanGaps = 0; this.noFlyPassed = 0;   // storm gaps passed without a scrape, no-fly zones passed (missions; countPasses)
    this.bumped = false;               // shaken by turbulence
    this.parcelOnRunway = false;       // a parcel landed on a runway (oops!)
    this.speciesPlanted = new Set();   // kinds of tree planted this flight: local ids (forest boost, missions)
    this.speciesTags = new Set();      // the same with their land, 'land:id' (UK: bare id), for the boards (the Nature board counts land-tagged kinds, the user 2026-10-26)
    this.lastHalf = 'day';
    this.night = { started: false, trappedAtStart: 0 };
    this.nightOwl = false;
    this.warnedHot = false;

    // The journey (src/route.js): take off from the city you last landed in, the way you chose; the
    // flight's path then follows the world-tour rule. Flight school and the first flights: LONDON towards
    // PARIS. this.path[0] is home; airportIndex = airports passed so far this flight (startCity is 0).
    // Season 2 (src/crossings.js, redesign only): a CROSSING mission flies from its departure to the next area's gateway
    // in one leg of crossing.km, then on through that area. Read from the save only (pure: the Node engine flies it too).
    this.crossing = this.autostart !== 'school' && this.save.tutorialDone && this.save.flyCrossing || null;   // (never before school is done)
    this.path = this.crossing ? crossingPath(this.crossing)
      : flightPath(this.autostart === 'school' || !this.save.tutorialDone ? schoolSave(this.save) : this.save);
    this.startCity = 0;
    this.homeName = this.path[0];
    this.airportIndex = 0;
    this.airportsSkipped = 0;
    this.nextAirport = this.airportAhead(0);
    this.plane = { x: PLANE.x, y: this.groundedY(), vy: 0 };
    this.pose = P.planePose(this);
  },
  inGrace() { return this.graceUntil && this.gameTime < this.graceUntil; },
  onAutopilot() { return this.autoUntil && this.gameTime < this.autoUntil; },
  // Where the autopilot steers (plane top y): the middle of the next storm gap ahead, else a safe
  // height; nudged above or below a flock of birds near that line.
  autopilotTarget() {
    const ahead = this.storms.filter(st => st.rects[0].x + st.rects[0].width > this.plane.x - 4 && st.rects[0].x < WIDTH)
      .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    let y = ahead ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - PLANE.h / 2 : this.plane.y;
    for (const f of this.birds) {
      if (f.x > this.plane.x - 20 && f.x < this.plane.x + 220 && Math.abs(f.y - y) < 50) y = f.y > y ? f.y - 60 : f.y + 60;
    }
    return clamp(y, 40, SKY_H - 60);
  },
  // The autopilot PICK-UP's pilot: tries every height and flies the path that is best a little way
  // ahead. Storms and birds are off limits; icy air is sought by day (a shading contrail) but only if
  // the contrail will fade before dark, and avoided otherwise (it would trap heat). It uses the same
  // icy-air shape test that makes real contrails (inIssrShape), so it knows exactly where they form.
  wantContrails() {
    if (!this.isDay) return false;
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const toWarm = D - B / 2 - this.clock % (D + N);   // contrails start to warm halfway through dusk
    return toWarm > this.kit.contrailLife / 1000 + 1;
  },
  autopilotPlan() {
    const H = PLANE.h, W = PLANE.w, want = this.wantContrails();
    const ahead = [0, 12, 24, 40, 60, 85, 115, 150];
    let best = this.plane.y, bestCost = Infinity;
    for (let y = 34; y <= SKY_H - 80; y += 3) {
      let cost = Math.abs(y - this.plane.y) * 0.15;
      ahead.forEach((d, k) => {
        const w = 1 / (1 + k * 0.35);                                       // nearer matters more
        const box = { x: this.plane.x + d, y, w: W, h: H };
        for (const st of this.storms) for (const r of st.rects) {
          if (box.x < r.x + r.width + 4 && box.x + W > r.x - 4 && y < r.y + r.height + 6 && y + H > r.y - 6) cost += 1000 * w;
        }
        const pad = { x: box.x - 8, y: y - 10, w: W + 16, h: H + 20 };          // every bird's picture, with room to spare
        for (const f of this.birds) for (const bd of f.birds) if (overlaps(pad, P.birdBox(bd))) cost += 1000 * w;
        for (const i of this.issrs) if (this.inIssrShape(i, box)) cost += (want ? -40 : 600) * w;
      });
      if (cost < bestCost) { bestCost = cost; best = y; }
    }
    return best;
  },
  // Bigger Hold: grows faster. Rounded to 1 decimal so 1 + 0.6 * n never shows as 3.4000000000000004.
  multiplier() { return Math.round((1 + this.kit.perSkip * this.airportsSkipped) * 10) / 10; },
  hitbox() { return { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h }; },
  // Hitbox y at which the sprite's wheels touch the ground.
  groundedY() { return SKY_H - PLANE.spriteH + PLANE.spriteOffY; },
  // Bottom of the drawn plane (wheels), used for ground contact.
  spriteBottom() { return this.plane.y - PLANE.spriteOffY + PLANE.spriteH; },
  runwayUnder(box) {
    // Home is landable when the route loops back to it (a 3-city area's 3rd stop: the sim chat, 2026-10-28, beginners crashed
    // on a drawn home runway); only a DEPARTURE runway (at or behind the start, worldX <= 0) is never 'landed' on.
    return this.runways.find(r => r.x <= box.x && box.x + box.w <= r.x + AIRPORT.runwayLen && !(r.name === this.homeName && r.worldX <= 0));
  },
  // The k-th airport ahead of the start city (0 = the next one), at worldX `from` + that leg.
  airportAhead(k, from = 0) {
    return { worldX: from + this.legKm(k), name: this.path[k + 1], spawned: false };
  },
  // Game km of leg k of this flight's path (balanced, src/network.js).
  legKm(k) { return this.crossing && k === 0 ? this.crossing.km : legBetween(this.path[k], this.path[k + 1]); },
  // Parcels take turns through the kinds of tree you own, so variety comes naturally.
  // Each land's own open trees (src/landtrees.js), taken in turn so a flight mixes kinds. The UK slot kind is
  // returned: growth and cooling use its SPECIES row; localTree() names the land's own tree.
  treeKind() {
    const open = treesOpen(this.save, this.regionNow || 'woodland');
    return slotKind(open.length ? open[this.speciesIdx % open.length] : 0);
  },
  // Parcels keep the plane's forward speed and drift down under a parachute, so you have to
  // drop them before you reach a soil plot. This works out which bit of ground (in today's screen
  // position) one would land on if dropped now. The ground keeps scrolling while it falls, so
  // that is the parcel's screen drift plus the scroll: it lands ahead of the plane.
  predictLanding() {
    let x = this.plane.x + PLANE.w / 2, y = this.plane.y + PLANE.h, vy = 0, vx = 0, t = 0;
    const dt = 1 / 60;
    while (y < SKY_H && t < 8) {
      t += dt;
      vy = t < PARCEL.chuteAfter ? vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, vy + PARCEL.gravity * dt);
      vx = -this.speed * (1 - Math.exp(-t / PARCEL.dragTime));   // on screen: drifts back as it slows
      x += (vx + this.speed) * dt; y += vy * dt;
    }
    return x;
  },
  // A flock at (x, y) flies at speed + extraSpeed; each storm on screen at speed. When the plane
  // reaches a storm, would the flock be near the plane and inside that storm's gap?
  flockBlocksGap(x, y, half) {   // half: the flock's size in old V steps (13 px across, 9 px down)
    const B = HAZARDS.birds, v = Math.max(1, this.speed);
    // Bird detection (Sensors 9-10, era 5): kit.birdWobbleMul x the bob, here and in the flock's motion and collision bands.
    // In these spawn retries a smaller bob lets a different number of tries pass, so an era-5 sky parts from the same seed's
    // era-4 sky: no new draws, a different sky of the same kind (as the twists). x1 = exact for eras 1-4.
    const wob = B.wobble * (P.KNOB_PLANTS.wobble ? 1 : this.kit.birdWobbleMul ?? 1);
    const top = y - half * 9 - 4 - wob, bottom = y + half * 9 + 16 + wob;   // the V's height, bird size and bobbing
    return this.storms.some(st => {
      const r = st.rects[0], t = (r.x - this.plane.x) / v;
      if (t < 0) return false;
      const fx = x - (v + B.extraSpeed) * t;
      return fx < this.plane.x + PLANE.w + 120 && fx + half * 26 + 16 > this.plane.x - 80 && top < st.rects[1].y && bottom > r.height;   // wide margin: the speed creeps up
    });
  },
  heatPct() { return this.heat * 100 / CLIMATE.dangerLine; },   // heat as % of the danger line (the warning thresholds are in %)

  spawn() {
    // Airports: draw the runway as it comes on screen; move to the next once passed.
    const na = this.nextAirport;
    if (!na.spawned && PLANE.x + na.worldX - this.distancePx <= WIDTH + 10) {
      this.addRunway(na.worldX, na.name);
      na.spawned = true;
    }
    if (this.distancePx > na.worldX + AIRPORT.runwayLen && this.state === 'playing') {
      this.airportIndex++;
      this.airportsSkipped++;
      this.explain('x-multiplier', tip('x-multiplier'), 'lesson-bonus');
      this.nextAirport = this.airportAhead(this.airportIndex, na.worldX);
      this.missedSign = { text: `Passed ${na.name}. Next: ${this.nextAirport.name}`, until: this.gameTime + 4000 };
    }
    const toAirport = this.nextAirport.worldX - this.distancePx;
    if (this.school) return;   // flight school places everything itself
    if (toAirport < 400 && toAirport > 0 && !this.school) this.ui.tipOnce('airport', tip('airport'), '', 'good', 3.5);

    // Soil plots come on schedule whether or not you have parcels left (no parcels: no soil is shown), so dropping
    // parcels never shifts the physics random stream, and so never changes the sky (2026-10-26; it used to stop the
    // schedule, measured: seed 1 flew a different sky after the last parcel).
    if (this.kit.tree && this.distancePx >= this.nextPlotAt) {
      const x = WIDTH + 10;
      const onRunway = this.runways.some(r => x + this.kit.plotW > r.x - 10 && x < r.x + AIRPORT.runwayLen + 10)
        || this.nextAirport.worldX - this.distancePx < WIDTH - PLANE.x + 40 && this.nextAirport.worldX + AIRPORT.runwayLen - this.distancePx > WIDTH - PLANE.x - this.kit.plotW - 40;
      if (this.parcels > 0 && !onRunway && REGION_DATA[this.regionNow || 'woodland']) this.addPlot(x);   // no parcels, the sea or the ice: no soil
      this.nextPlotAt += this.between(PARCEL.plotEvery[0], PARCEL.plotEvery[1]);
    }
    if (this.school) return;   // flight school places everything itself

    // The next-gap hint (eras): with all three systems, storm columns are made `lead` px further
    // ahead (off screen) and their gap glows at the right edge before they scroll in. lead 0 = today.
    const lead = Math.round(GAP_HINT.lead[this.kit.hintLevel] * this.speed);
    if (this.distancePx >= this.nextStormAt - WIDTH - lead) {
      const worldX = this.distancePx + (WIDTH + 10 + lead - PLANE.x);
      if (!this.inStormClearZone(worldX)) this.addStormPair(WIDTH + 10 + lead);
      this.nextStormAt += STORMS.spacing;
    }
    if (this.distancePx >= this.nextIssrAt) {
      // The on-rails onboarding (2026-10-27): with lesson L2 pending ("fly through icy air in daytime"), the FIRST check
      // places one wide mid-sky patch at fixed geometry (no rand() for placement), met in daylight (~5-11 s after take-off).
      // makeIssr's cloud shape draws from the physics stream, so this one flight's later spawns shift (L2-pending flights only).
      if (this.l2Patch == null) this.l2Patch = !this.school && isSeason2(this.save) && (s2LessonsLeft(this.save)[0] || {}).id === 'L2';
      if (this.l2Patch) { this.l2Patch = false; const h = 200, y = Math.max(20, Math.min(SKY_H - 40 - h, this.plane.y + 6 - h / 2)); const pw = Math.max(560, 5 * this.speed + PLANE.w), ahead = this.storms.filter(st => st.rects[0].x + st.rects[0].width > this.plane.x), x0 = Math.max(WIDTH + 10, ...ahead.map(st => st.rects[0].x + st.rects[0].width + 10)); this.addIssrAt(x0, y, pw, h).entered = true; this.nextStormAt = Math.max(this.nextStormAt, this.distancePx + x0 + pw + PLANE.w); }   // tall, at the plane's altitude, ~5 s long, after the storms already on screen and none until its tail + a plane (a gap pulled the pilot out; sim chat's fix): hard to miss (Coordinator, 2026-10-28)   // shown from the start: the lesson's patch must be seen
      // Forecasting (eras): good forecasts route you round a few night patches (nightPatches < 1).
      const routed = !this.isDay && this.rand() > this.kit.nightPatches;
      if (!routed && this.rand() < Math.min(1, ISSR.spawnChance * this.lateRamp())) this.addIssr();   // more icy air on long flights
      // A forecast also shows icy air that isn't there: false patches, `fakes` of all shown.
      if (this.kit.fakes && !this.school && this.rand() < Math.min(1, ISSR.spawnChance * this.lateRamp()) * this.kit.fakes / (1 - this.kit.fakes)) this.addIssr({ fake: true });
      this.nextIssrAt += ISSR.spawnEvery;
    }
    const T = HAZARDS.turbulence;
    if (this.distancePx >= this.nextTurbAt) {
      if (this.rand() < T.chance * this.kit.gapTurb) {   // ATC radar: calmer skies
        const h = this.between(T.minH, T.maxH);
        this.turbs.push({ x: WIDTH + 10, w: this.between(T.minW, T.maxW), y: this.between(30, SKY_H - 60 - h), h });
        this.newHazard('turbulence');
      }
      this.nextTurbAt += T.every;
    }
    const B = HAZARDS.birds;
    if (this.distancePx >= this.nextBirdsAt) {
      if (this.rand() < this.squeezed(B.chance, 'capBirds') * this.kit.gapBirds) this.addFlock();   // ATC bird advisories: fewer flocks
      this.nextBirdsAt += B.every;
    }
    if (this.distancePx >= this.nextTokenAt) {
      const chance = Math.min(TOKENS.maxChance, TOKENS.chance + TOKENS.chancePerKm * this.distancePx / 1000);
      if (this.rand() < chance) this.addToken();
      this.nextTokenAt += TOKENS.spawnEvery;
    }
    if (this.distancePx >= (this.nextPowerAt ??= POWERUPS.from)) {
      this.nextPowerAt += POWERUPS.every;
      const r = this.rand(), safHelps = !['saf100', 'hydrogen'].includes((this.ownKit || this.kit).fuelId);
      const pathY = () => clamp(this.plane.y + this.between(-50, 50), 60, SKY_H - 90);
      const firstSaf = !this.safOffered && this.distancePx >= POWERUPS.safFirstAt;
      // 0.10.2: no SAF cans before SAF exists in your era (it returns in the 2010s, PLANE-DESIGN.md section 3).
      if (!this.school && this.kit.safCans && safHelps && (firstSaf || r < POWERUPS.safChance)) {
        this.safOffered = true;
        this.addPower('saf', WIDTH + 10, pathY());
        this.ui.tipOnce('safAhead', tip('safAhead'), '', 'good', 3);
      }
      else if (!this.school && this.kit.autoChance && r > 1 - this.kit.autoChance) this.addPower('auto');   // 0.10.2: only once the Autopilot gadget is bought
    }
  },
  addStormPair(x = WIDTH + 10) {
    if (this.distancePx < WORLD.warmup) this.warmStorms = this.stormCount;   // gaps only narrow after the warm-up
    let gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * (this.stormCount - (this.warmStorms || 0)));
    const nf = HAZARDS.noFly;
    const noFly = this.distancePx >= nf.from && this.rand() < this.squeezed(nf.chance, 'capNoFly');
    if (noFly) gap = Math.max(nf.minGap, gap - nf.gapLess + (P.KNOB_PLANTS.gapAdd ? 0 : this.kit.noFlyGapAdd || 0));   // ATC 8 (2010s, free route airspace): wider no-fly gaps
    gap = Math.round(gap * this.kit.gaps);   // air traffic control (eras): better spacing, gaps up to ~3% wider
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    const w = noFly ? nf.width : STORMS.width;
    // Leave a clear lane past any icy air already in this column (20 tries, else no storm this time);
    // with the ISSR.laneExtra variant, a lane that much taller.
    let gapY = null;
    for (let k = 0; k < 20 && gapY === null; k++) { const t = this.between(lo, hi); if (this.laneClear(x, w, t - gap / 2, t + gap / 2, this.issrs, ISSR.laneExtra ? PLANE.h + STORMS.clearLane + ISSR.laneExtra : undefined)) gapY = t; }
    if (gapY === null) return;
    if (noFly) this.addNoFlyAt(x, gapY, gap);
    else this.addStormPairAt(x, gapY, gap);
  },
  addStormPairAt(x, gapY, gap) {
    const topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: STORMS.width, height: topH };
    const bottom = { x, y: botY, width: STORMS.width, height: SKY_H - botY };
    const pics = [], pick = () => STORM_ART[this.between(0, STORM_ART.length - 1)];
    const place = (key, y) => { const t = mask(key);   // the picture's size (the baked mask is the picture's size)
      pics.push({ key, y: Math.round(y), dx: Math.round(STORMS.width / 2 - t.w / 2), flip: this.rand() < 0.5, h: t.h }); };
    for (let y = topH; y > 0;) { const k = `storm-hang-${pick()}`; const h = mask(k).h; place(k, y - h); y -= h - STORM_OVERLAP; }
    for (let y = botY; y < SKY_H;) { const k = `storm-rise-${pick()}`; place(k, y); y += mask(k).h - STORM_OVERLAP; }
    // Drawn farthest first: the picture at the gap edge is in front.
    const order = [...pics.filter(q => q.key.includes('hang')).reverse(), ...pics.filter(q => q.key.includes('rise')).reverse()];
    const st = { rects: [top, bottom], parts: [], pics: order, flashUntil: 0, nextSpark: 0 };
    if (this.twistOn(STORMS.pulse)) {   // era-6 twist: the gap breathes; its phase comes from where it spawned (no draw)
      for (const q of order) q.y0 = q.y;
      st.pulse = { top: topH, bot: botY, phase: (this.distancePx * 0.0137) % (2 * Math.PI) };
    }
    this.storms.push(st);
    this.stormCount++;
    this.showStorm(st);
  },
  // Restricted airspace: thinner than a storm, but the gap is tighter.
  addNoFlyAt(x, gapY, gap) {
    const W = HAZARDS.noFly.width, topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: W, height: topH };
    const bottom = { x, y: botY, width: W, height: SKY_H - botY };
    const st = { rects: [top, bottom], parts: [], flashUntil: 0, noFly: true };
    if (this.twistOn(HAZARDS.noFly.drift)) {   // era-4 twist: the gap drifts, first towards the side with more room
      const m = STORMS.marginTop + gap / 2;
      st.drift = { c: gapY, gap, lo: m, hi: SKY_H - m, v: HAZARDS.noFly.drift.pxs * (gapY < SKY_H / 2 ? 1 : -1) * (HAZARDS.noFly.drift.away ? -1 : 1) };   // away: start towards LESS room (harder)
    }
    this.storms.push(st);
    this.stormCount++;
    this.showNoFly(st);
    this.newHazard('noFly');
  },
  addRunway(worldX, name) {
    const rw = { x: PLANE.x + worldX - this.distancePx, worldX, name, parts: [] };   // x: the runway's start on screen (the record; its pictures follow it)
    this.runways.push(rw);
    this.showRunway(rw);
  },
  addPlot(x) {
    const pl = { x, parts: [], used: false };
    this.plots.push(pl);
    this.showPlot(pl);
  },
  // fake: a forecast's false patch (looks real, makes no contrail, puffs away when you get close).
  addIssr({ fake = false } = {}) {
    const grow = Math.sqrt(this.lateRamp());   // long flights: bigger patches (area grows with the ramp)
    let w = Math.round(this.between(ISSR.minW, ISSR.maxW) * grow);
    let h = Math.min(SKY_H - 40, Math.round(this.between(ISSR.minH, ISSR.maxH) * grow)), x = WIDTH + 10;
    // Spawn-rule variants (2026-10-26, for the steering-cost study; all OFF unless set, so today's sky is unchanged):
    // ISSR.thinK: thin layers, thinK x as tall and 1/thinK x as wide (the same area), like real ice-supersaturated
    // layers a few hundred metres deep.
    if (ISSR.thinK) { w = Math.round(w / ISSR.thinK); h = Math.max(16, Math.round(h * ISSR.thinK)); }
    // Never fill a storm gap: there is always a way through without a contrail (10 tries, else skip).
    for (let k = 0; k < 10; k++) {
      const y = this.between(10, SKY_H - h - 10);
      const blocks = this.storms.some(st => { const r = st.rects[0]; return r.x < x + w && r.x + r.width > x
        && !this.laneClear(r.x, r.width, r.height, st.rects[1].y, [...this.issrs, { x, y, width: w, height: h }], ISSR.laneExtra ? PLANE.h + STORMS.clearLane + ISSR.laneExtra : undefined); });   // with the icy air already there
      // (ISSR.laneExtra, a variant: the clear lane through every storm gap is laneExtra px taller than today's.)
      if (!blocks) {
        const r = this.addIssrAt(x, y, w, h);
        if (fake) r.fake = true;
        else if (this.kit.late && this.rand() < this.kit.late) r.late = true;   // the forecast missed it: seen only up close
        return;
      }
    }
  },
  // An ISSR is a lumpy patch, not a box: 3-5 overlapping ellipses inside its bounding box. Every
  // ellipse crosses the box's middle line, so the patch is one piece and flying through the
  // middle always makes a contrail. The texture is masked to the ellipses.
  // Icy air is a record (src/sim/physics.js); the patch drawn for it is its .view (a tile sprite masked to the blobs).
  addIssrAt(x, y, w, h) {
    const r = P.makeIssr(this, x, y, w, h);
    this.issrs.push(r);
    this.showIssr(r);
    return r;
  },
  // Contrails are records (src/sim/physics.js); the square drawn for each is its .view.
  addContrail(time) {
    const c = P.makeContrail(this, time);
    this.contrails.push(c);
    this.showContrail(c);
  },
  // A floating tree. Often placed in a storm gap or inside icy air, so grabbing it is a choice.
  addToken(x = WIDTH + 10, y = null, golden = null) {
    if (y === null) {
      const storm = this.storms[this.storms.length - 1];
      const issr = this.issrs.find(i => i.x + i.width > WIDTH - 20);
      if (storm && storm.rects[0].x > WIDTH - 80 && !storm.hasToken) {
        storm.hasToken = true;
        const gapTop = storm.rects[0].height, gapBot = storm.rects[1].y;
        y = this.between(gapTop + 12, gapBot - 26);
        x = storm.rects[0].x + STORMS.width / 2 - 7;
      } else if (issr && this.rand() < 0.4) {
        y = this.between(issr.y + 4, issr.y + issr.height - 18);
      } else {
        y = this.between(50, SKY_H - 70);
      }
    }
    if (golden === null) golden = this.distancePx > TOKENS.goldenAfter && this.rand() < TOKENS.goldenChance;
    const t = { x, y, baseY: y, phase: this.rand() * 6, value: golden ? 3 : 1 };   // a record; its picture is .view
    this.tokens.push(t);
    this.showToken(t);
  },
  // A pick-up (POWERUPS): rides with the seeds, so it is collected in updateTokens.
  addPower(power, x = WIDTH + 10, y = this.between(60, SKY_H - 90)) {
    const t = { x, y, baseY: y, phase: this.rand() * 6, value: 0, power };
    this.tokens.push(t);
    this.showToken(t);
  },
  addFlock(x = WIDTH + 20, y = null) {
    const B = HAZARDS.birds, n = this.between(B.flock[0], B.flock[1]);
    if (y === null) {   // never a flock in a storm gap just as the plane goes through it (10 tries, else skip)
      for (let k = 0; k < 10 && y === null; k++) { const t = this.between(60, SKY_H - 90); if (!this.flockBlocksGap(x, t, FLOCK_HALF)) y = t; }
      if (y === null) return;
    }
    // A dense arrowhead of many small birds (2026-10-22: the user wanted flocks more obvious), packed
    // into the same box a 5-bird V used (FLOCK_HALF), so gap safety and difficulty barely change.
    const birds = [], W = FLOCK_HALF * 13, H = FLOCK_HALF * 9;
    for (let tries = 0; birds.length < n && tries < 400; tries++) {
      const oy = this.between(-H, H), ox = Math.min(W, Math.round(Math.abs(oy) * 1.2 + this.between(0, 9)));
      if (birds.some(q => Math.abs(q.ox - ox) < 6 && Math.abs(q.oy - oy) < 5)) continue;   // a clear gap round each bird
      birds.push({ ox, oy, x: x + ox, y: y + oy, key: 'bird-0', flip: true });   // a record, facing the plane; its image is .view
    }
    const f = { birds, x, y, half: FLOCK_HALF, phase: this.rand() * 6 };
    if (this.twistOn(HAZARDS.birds.turn)) f.turn = { dir: y < SKY_H / 2 ? 1 : -1, left: -1 };   // era-5 twist: it will change height once
    this.birds.push(f);
    this.showFlock(f);
    this.newHazard('birds');
  },
  newHazard(id) {
    if (this.school) return;
    if (!this.explain(`hazard-${id}`, tip(`hazard-${id}`), `lesson-${id.toLowerCase()}`)) {
      if (!this.hazardSeen) this.hazardSeen = {};
      if (!this.hazardSeen[id]) { this.hazardSeen[id] = true; this.popup(WIDTH / 2, 84, `${{ noFly: 'No-fly zone', turbulence: 'Turbulence', birds: 'Birds' }[id]} ahead!`, '#ff8080'); }   // y 84: below the 2-line mission text
    }
  },
  // 1 until CLIMATE.lateFrom km into a flight, then grows by latePer10k every 10,000 km.
  // Only NIGHTS get harder (more and bigger icy air): day shade, and saving up cooling, stay as they are.
  lateRamp() { return P.lateRamp(this); },
  inStormClearZone(worldX) { return P.inStormClearZone(this, worldX); },
  // Old-wood boost for grown trees: 0 before FOREST.from km, rising to FOREST.boost, scaled by
  // how many kinds of tree were planted this flight (all 5 = the full boost).
  oldWood() { return P.oldWood(this); },
  // A forest can only soak up so much CO2 in one flight (more with more kinds); then it is full.
  forestStore() { return P.forestStore(this); },
  // Is there still a clear lane (plane height + margin) through the gap gTop..gBot of a storm
  // column at x..x+w, past the icy air in `issrs` that overlaps the column?
  laneClear(x, w, gTop, gBot, issrs = this.issrs, lane) { return P.laneClear(issrs, x, w, gTop, gBot, lane); },
  // Is any point along the plane's middle line inside the cloud's ellipses? (x, y, w, h: its box)
  // `grow`: each blob's radii x this (1 = the drawn shape). Used for the contrail margin below.
  inCloud(blobs, x, y, w, h, box, grow = 1) { return P.inCloud(blobs, x, y, w, h, box, grow); },
  // The contrail margin (eras, PLANE-DESIGN.md section 3): a hot-exhaust 1950s jet makes contrails only
  // deep inside icy air; efficient jets make them right up to (and a little past) its edge. The drawn
  // patch does not change. Everything about "being in icy air" uses this: contrails, heat, dodges, the autopilot.
  inIssrShape(i, box) { return P.inIssrShape(this, i, box); },
  issrAlpha(i, box, inside) { return P.issrAlpha(this, i, box, inside); },
  // Gap from the plane's box to a patch's box, px (0 = touching or overlapping).
  nearPx(i, box) { return P.nearPx(i, box); },
  dayNightPhase() { return P.dayNightPhase(this); },
  // What a contrail does right now (2026-10-23): the switch between cooling and warming happens HALFWAY
  // through dusk / dawn, with a short neutral stretch in the middle. cool: sunshine side; strength 0..1.
  radiationMode() { return P.radiationMode(this); },
  // World positions of the plane's drawn pixels, turned with the plane's tilt. Once per frame.
  planePixels() { return P.planePixels(this); },   // tests may stub this
  // Storms forgive a nick of up to HAZARDS.stormForgive pixels; no-fly zones forgive nothing.
  hitsStorm(st) { return P.hitsStorm(this, st, () => this.planePixels()); },
  // How many plane pixels touch the storm's (or no-fly zone's) drawn pixels. Stops counting at `enough`.
  // A storm's solid pixels are its drawn cloud pixels INSIDE the column (STORMS.width): fluff puffing
  // out beyond the column never crashes you, and empty sky never does (the user, 2026-10-24).
  stormPixelsHit(st, enough) { return P.stormPixelsHit(this, st, enough, () => this.planePixels()); },
  hitBird(box) { return P.hitBird(this, box, () => this.planePixels()); },

  // ---------- the region below (the user, 2026-10-22: real geography decides it; src/geo.js) ----------
  // The leg from the airport behind to the one ahead; how far along it the plane is, as a fraction.
  regionHere() {
    // Flight school flies over your START city's land (season 2 starts anywhere; the user flew a Johannesburg start over UK woodland).
    // A coastal start that maps to the open sea or the ice keeps 'woodland' (nothing could be planted or shown there).
    if (this.school) { const r = (city(this.save.city) || {}).region; return r && !['ocean', 'ice'].includes(r) ? r : 'woodland'; }
    if (!this.nextAirport || this.nextAirport.worldX > 1e8) return 'woodland';   // the never-landing test/sim pilots: unchanged (sim baselines)
    const i = this.airportIndex, len = this.legKm(i), from = this.nextAirport.worldX - len;
    return regionBelow(city(this.path[i]), city(this.path[i + 1]), (this.distancePx - from) / len);
  },

  // Physics random numbers (sim engine, 2026-10-25): everything that changes what can happen in a flight
  // (spawns, gaps, cloud shapes, turbulence, contrail puffs) draws from this.rng, so a seed (save.simSeed,
  // tests and probes only) gives the same sky with or without drawing. Looks keep Math.random.
  // Same formulas as Phaser.Math.Between / FloatBetween.
  rand() { return this.rng(); },
  // The PLANE's random numbers (2026-10-26): draws that happen only because of how you fly (the contrail puff's
  // +-1 px wobble, turbulence kicks and judder, a tap's delay in turbulence) come from their own stream, so they
  // never shift what spawns: the same seed is the same storms, icy air and birds whoever flies it.
  planeBetween(a, b) { return Math.floor(this.rngPlane() * (b - a + 1) + a); },
  planeFloatBetween(a, b) { return this.rngPlane() * (b - a) + a; },
  between(a, b) { return Math.floor(this.rng() * (b - a + 1) + a); },
  floatBetween(a, b) { return this.rng() * (b - a) + a; },
  setState(s) { this.state = s; this.stateTime = 0; },

  // One frame of the flight (moved from GameScene.update, sim engine 5f). dt: seconds, already clamped.
  // Changes only the flight's data: what is seen and heard goes through hooks (show*, popup, sound...), and the
  // game draws the frame afterwards (GameScene.syncViews). Returns { dx, inIssr, over } for the drawing.
  step(dt) {
    this.runTimers(dt * 1000);   // the engine's delayed taps (in the game, Phaser's timers run these)
    this.gameTime += dt * 1000;
    const time = this.gameTime;   // contrail ages etc. stop while frozen
    if (this.state === 'over') {
      this.updateContrails(dt, time);
      this.scoreRays(dt, false);
      return { dx: 0, inIssr: false, over: true };
    }
    if (!this.school || !this.school.holdClock) this.clock += dt;

    this.elapsed += dt;
    this.stateTime += dt;
    if (this.airborne && !this.school) this.flySeconds += dt;   // not while frozen (tips) or paused: update stops then

    // Speed: ramps up while flying, rolls to a stop after touchdown.
    if (this.state === 'landing') {
      this.speed = Math.max(0, this.landingSpeed * (1 - this.stateTime / AIRPORT.rollSeconds));
    } else if (this.state === 'takeoff') {
      // Holding speeds the plane up along the runway; letting go slows it down again.
      const held = this.holding || this.save.autoTakeoff || this.airborne;   // autoTakeoff: tests only
      this.rollSpeed = held ? Math.min(TAKEOFF.liftSpeed, this.rollSpeed + TAKEOFF.rollAccel * dt) : Math.max(0, this.rollSpeed - TAKEOFF.rollBrake * dt);
      this.speed = this.rollSpeed;
      this.elapsed = 0;   // the speed ramp starts at lift-off
    } else {
      if (this.distancePx < WORLD.warmup) this.warmTime = this.elapsed;   // speed-up starts after the warm-up leg
      this.speed = this.school ? WORLD.startSpeed : Math.min(WORLD.maxSpeed, WORLD.startSpeed + WORLD.speedGain * (this.elapsed - (this.warmTime || 0)));
    }
    const dx = this.speed * dt;
    this.distancePx += dx;

    // Plane
    if (this.state === 'takeoff') {
      if (!this.airborne && this.rollSpeed >= TAKEOFF.liftSpeed) {
        this.airborne = true; this.stateTime = 0;
        if (!this.school) { this.save.flights++; this.persist(); }   // a flight counts from lift-off
      }
      this.plane.vy = this.airborne ? TAKEOFF.climbVelocity : 0;
      this.plane.y += this.plane.vy * dt;
      if (this.airborne && this.stateTime >= TAKEOFF.seconds) {
        this.setState('playing'); this.plane.vy = 0;
        if (!this.school) { this.popup(WIDTH / 2, SKY_H / 2, 'Now TAP to fly!', '#ffe15a', 16); this.startGrace(); }
        if (!this.school) this.explainWhenClear('x-bars', tip('x-bars'), 'lesson-bars');
      }
    } else if (this.state === 'playing' && (this.inGrace() || this.onAutopilot())) {
      const auto = this.onAutopilot();
      const target = auto ? this.autopilotPlan() : this.autopilotTarget();
      const lim = auto ? POWERUPS.autoClimb : 180;
      this.plane.vy = clamp((target - this.plane.y) * (auto ? 10 : 4), -lim, lim);
      this.plane.y += this.plane.vy * dt;
    } else if (this.state === 'playing') {
      this.freeFall(dt);
    }
    this.pose = P.planePose(this);   // the picture's centre and tilt: the pixel hit tests use it

    // CO2: high during takeoff and the landing roll, steady while cruising.
    const parked = this.state === 'takeoff' && !this.airborne && this.rollSpeed < 5;   // engines idle: waiting for the HOLD
    this.co2Rate = parked ? 0 : (this.state === 'playing') ? this.kit.co2Cruise * (this.flaring ? AIRPORT.flareCo2 : 1) : this.kit.co2Takeoff;
    this.totalCo2 += this.co2Rate * dt;
    const co2Heat = this.co2Rate * CLIMATE.co2ToHeat * dt;
    this.heat += co2Heat;
    this.breakdown.co2 += co2Heat;

    // Trees keep cooling for the rest of the flight, more as they grow; on long flights a mixed
    // forest grows into old wood (FOREST in config.js).
    const oldWood = this.oldWood(), forestFull = this.trees.length > 0 && this.forestStored >= this.forestStore();
    if (forestFull && !this.forestFullSaid) {
      this.forestFullSaid = true;
      this.popup(WIDTH / 2, SKY_H - 24, 'Your forest is full of carbon!', '#ffe15a', 10);
      this.ui.tipOnce('forestFull', tip('forestFull'), '', 'good', 4.5);
    }
    for (const t of this.trees) {
      const age = this.elapsed - t.plantedAt;
      const g = this.kit.grow, stage = age < 4 * g ? 0 : age < 9 * g ? 1 : 2;   // Tree Nursery: grows faster
      t.stage = stage;
      const cool = forestFull ? 0 : SPECIES[t.kind].coolPerStage[stage] * FOREST.early * (stage === 2 ? 1 + oldWood : 1) * dt;
      this.forestStored += cool;
      this.heat -= cool;
      this.breakdown.trees += cool;
      this.treeFeedback += cool;
    }
    const landFull = this.landStored >= FOREST.landStore * projectsDone(this.save).length / PROJECTS.length;
    const land = landFull ? 0 : natureCooling(this.save, this.regionNow) * dt;   // rewilded land soaks up a little CO2, until it is full
    this.landStored += land;
    this.heat -= land; this.breakdown.trees += land;
    if (this.treeFeedback >= 1) {
      this.popup(WIDTH / 2, SKY_H - 12, `-${this.treeFeedback.toFixed(1)} from your forest`, '#8dffb0');
      this.coolSparkle();
      this.treeFeedback = 0;
    }

    this.spawn();
    this.scroll(dx);
    this.updateRegion(dx);
    this.updateDayNight(time);

    const box = this.hitbox();
    let inIssr = false;
    for (const i of this.issrs) {
      const inside = this.inIssrShape(i, box);
      if (inside) { inIssr = true; i.entered = true; }
      if (i.popped) P.fadePopped(this, i); else i.alpha = this.issrAlpha(i, box, inside);
      if (i.fake && !i.popped && this.nearPx(i, box) < FORECAST.popPx) this.popFake(i);
      // In your path: level with the plane while it was coming up ahead, so you had to climb or dive.
      const ahead = i.x - (box.x + box.w), cy = box.y + box.h / 2;
      if (ahead > 0 && ahead < 120 && cy >= i.y && cy <= i.y + i.height) i.inPath = true;
      // Dodged: icy air that was in your path at night, passed without making a contrail.
      if (!i.scored && i.x + i.width < box.x) {
        i.scored = true;
        if (!i.fake && i.inPath && !i.entered && !this.isDay && this.state === 'playing' && !this.school && this.nightDodges < this.kit.dodgesPerNight) {   // Weather Forecast: more per night
          this.nightDodges++; this.dodgesTotal++;
          this.earnCrystals(this.kit.dodgeCrystals, 'dodged icy air!');   // Crystal Lens: more per dodge
        }
      }
    }
    this.updateTokens(dt, box);
    this.updatePowers();
    this.updateHazards(dt, box);
    this.updateTwists(dt);
    this.updateParcels(dt);
    if (inIssr && !this.wasInIssr && this.state === 'playing') this.enterIssr();
    this.wasInIssr = inIssr;
    // Contrail-free cruise: held, at night, meter left -> inside icy air but no puff. Skipping a puff also skips its
    // rngPlane wobble draw: that is the PLANE stream, so the sky (this.rng) is unaffected (sim-paired stays green).
    const clean = !P.KNOB_PLANTS.clean && this.cleanHeld && !this.isDay && this.cleanLeft > 0;
    if (clean && inIssr) this.cleanLeft = Math.max(0, this.cleanLeft - dt * 1000);
    if (inIssr && !clean && this.state !== 'landing' && time - this.lastContrail > this.kit.contrailEvery) {
      this.lastContrail = time;
      this.addContrail(time);
    }
    this.updateContrails(dt, time);
    this.scoreRays(dt, true);

    const out = { dx, inIssr };
    if (this.state === 'landing') {
      if (this.stateTime >= AIRPORT.rollSeconds) this.finish({ landed: true });
      return out;
    }
    if (this.state !== 'playing') return out;

    if (this.school) { this.school.forgive(box); return out; }
    this.countPasses();   // before the breather/autopilot return: columns they fly past are marked, not counted
    if (this.inGrace() || this.onAutopilot()) return out;   // the breather and the autopilot pick-up: nothing can crash you
    if (this.heat >= CLIMATE.dangerLine * 0.75 && !this.warnedHot) {
      this.warnedHot = true;
      if (this.explain('x-hot', tip('x-hot'), 'lesson-hot')) return out;
      this.ui.toast('Planet overheating!', this.isDay ? 'Make contrails in the sunshine, or land soon!' : 'Stay out of icy air at night, or land soon!', 'bad', 3);
    }
    if (this.heat >= CLIMATE.dangerLine) { this.finish({ reason: 'The planet got too hot!\nFlight grounded.', sound: 'overheat' }); return out; }
    if (this.spriteBottom() >= SKY_H) {
      const rw = this.runwayUnder(box);
      if (rw) this.land(rw);
      else this.finish({ reason: 'You hit the ground!' });
      return out;
    }
    // Pixel-accurate: the plane's drawn pixels against the hazard's drawn pixels. Storms forgive a
    // nick (a few pixels); no-fly zones and birds forgive nothing.
    for (const s of this.storms) {
      if (this.hitsStorm(s)) {
        this.finish({ reason: s.noFly ? 'Restricted airspace!\nFlight stopped.' : 'Storm!\nYou flew into a storm.' });
        return out;
      }
    }
    if (this.hitBird(box)) this.finish({ reason: 'Bird strike!\nYou hit a bird.' });
    return out;
  },

  // Mission counters (PROPOSAL-HOME-MISSIONS, 2026-10-27). A column counts once its whole picture is past the plane's
  // tail: a storm gap only if no storm pixel touched the plane while level with it (a forgiven nick is still a scrape),
  // a no-fly zone always (it forgives nothing, so being past it means it was threaded). Columns the breather or the
  // autopilot flew any part of do not count. No random draws: the counters never change the flight.
  countPasses() {
    const tail = this.plane.x - PLANE.spriteOffX, nose = tail + PLANE.spriteW, helped = this.inGrace() || this.onAutopilot();
    for (const s of this.storms) {
      const r = s.rects[0];
      if (s.passed || r.x > nose) continue;
      if (helped) s.helped = true;
      if (FIELD_PLANTS.nofly && s.noFly && !s.helped && !s.early) { s.early = true; this.noFlyPassed++; }
      if (!s.noFly && !s.scraped && !helped && !FIELD_PLANTS.scrape && this.stormPixelsHit(s, 1) > 0) s.scraped = true;
      if (r.x + r.width < tail) {
        s.passed = true;
        if (!s.helped) { if (s.noFly) { if (!FIELD_PLANTS.nofly) this.noFlyPassed++; } else if (!s.scraped) this.cleanGaps++; }
      }
    }
  },

  // ---------- era 4-6 twists (PROPOSAL-ERAS-4-6-SYSTEMS, 2026-10-27) ----------
  // A twist is on when the flight's era (the plane's era; kit.era lets the sim stand in for planes not built yet) is at
  // least its era AND the flight has reached its `from`. Eras 0-2 (Comet, jumbo, twin) never meet one. None draws a number.
  flightEra() { if (this.kit.era !== undefined) return this.kit.era; const p = PLANES.find(q => q.id === this.kit.plane); return p ? p.era : 0; },
  twistOn(cfg) { return !!cfg && this.flightEra() >= cfg.era && (TWIST_PLANTS.early || this.distancePx >= cfg.from); },
  // A spawn chance under the long-haul squeeze: + add per `every` km past `from`, capped. (Moves a threshold only.)
  squeezed(chance, cap) {
    const Q = HAZARDS.squeeze;
    if (!this.twistOn(Q)) return chance;
    return Math.min(Q[cap], chance + Q.add * (1 + Math.floor((this.distancePx - Q.from) / Q.every)));
  },
  // Drifting no-fly gaps and pulsing storm gaps move every frame (their rects, and a storm's cloud pictures with them).
  updateTwists(dt) {
    if (TWIST_PLANTS.still) return;
    for (const st of this.storms) {
      if (st.drift) {
        const d = st.drift; d.c += d.v * dt;
        if (d.c < d.lo) { d.c = d.lo; d.v = -d.v; } else if (d.c > d.hi) { d.c = d.hi; d.v = -d.v; }
        st.rects[0].height = d.c - d.gap / 2; st.rects[1].y = d.c + d.gap / 2; st.rects[1].height = SKY_H - st.rects[1].y;
      }
      if (st.pulse) {
        const P = STORMS.pulse, p = st.pulse, off = P.amp * Math.sin(p.phase + 2 * Math.PI * (this.gameTime / 1000) / P.period);
        st.rects[0].height = p.top + off; st.rects[1].y = p.bot - off; st.rects[1].height = SKY_H - st.rects[1].y;
        for (const q of st.pics) q.y = Math.round(q.y0 + (q.key.includes('hang') ? off : -off));
      }
    }
  },

  // The land below, once the flight has moved (the game also fades its ground in, and may discover the land).
  updateRegion(dx) { if (dx > 0) this.setRegion(this.regionHere()); },

  // Bank a finished flight as the game does (moved from GameScene.finish): the seeds you carry home (x the
  // long-flight multiplier, + the cool-Earth bonus and fares, only if landed), crystals (always kept), records,
  // the journey, eras, missions and prizes, into this.save; the flight's result into this.result. Returns this.bank.
  bankFlight({ landed = false, reason = '' }) {
    const m = Math.floor(this.distancePx / WORLD.pxPerMetre);
    const km = m / 1000;
    const perKm = km > 0 ? (this.totalCo2 / km).toFixed(1) : '-';
    const heat = Math.round(this.heat);

    // Trees: only what you carry home. Longer flights multiply it; a cooler Earth adds a bonus.
    const earned = [];
    const mult = this.multiplier();
    earned.push({ label: `Seeds grabbed in the sky`, n: this.cargo, lost: !landed });
    if (mult > 1 && this.cargo) earned.push({ label: `Long flight bonus x${mult}`, n: Math.round(this.cargo * (mult - 1)), lost: !landed });
    if (heat < 0) earned.push({ label: 'Cooler Earth bonus', n: CARGO.coolBonus, lost: !landed });
    // Fares (eras): a landed flight pays per 1,000 km, by plane, x the Cabin upgrades (src/fleet.js FARES).
    const fares = landed && !this.school ? Math.round((FARES[this.kit.plane] || 0) * m / 1e6 * this.kit.fares) : 0;
    if (fares) earned.push({ label: 'Passenger fares', n: fares, lost: false });
    const gained = landed ? earned.reduce((a, e) => a + e.n, 0) : 0;
    if (!landed && this.cargo) this.popup(this.plane.x + 25, this.plane.y - 14, `-${this.cargo} seeds lost!`, '#ff6a5a', 16);

    if (landed) this.save.landings = (this.save.landings || 0) + 1;
    if (landed && heat < 0 && !this.school) this.save.coolLandings = (this.save.coolLandings || 0) + 1;   // Cool Planet badge
    const crash = landed ? null : crashKind(reason);
    if (crash && !this.school) { this.save.crashes = this.save.crashes || {}; this.save.crashes[crash] = (this.save.crashes[crash] || 0) + 1; }
    // MY RECORDS (src/records.js): the 8 boards' running numbers, kept in the save; flight school does not count.
    if (!this.school) recordFlight(this.save, { landed, distance: m, crash, shade: this.sunBlocked, heatTrapped: this.heatTrapped });
    // Mission: done or not, and move on to the next one.
    // The journey: landing moves you to that city; reaching LONDON again (or passing it) is a lap.
    // Times round the Earth (flownKm / EARTH_KM, the real size of the Earth): `lap` = one more this flight.
    const flownBefore = this.save.flownKm || 0, flown = this.school ? flownBefore : flownBefore + m;
    const lap = !this.school && Math.floor(flown / EARTH_KM) > Math.floor(flownBefore / EARTH_KM);
    // A new part of the world: landing in a region you had never landed in before.
    const landReg = landed && city(this.landedAt) ? city(this.landedAt).region : null;
    const newRegion = !!landReg && !this.school && !(this.save.visited || []).some(n => city(n) && city(n).region === landReg);
    const s2 = isSeason2(this.save);   // season 2: many missions at once (src/missions2.js); classic: one in order
    const mission = this.school || s2 ? null : currentMission(this.save);
    const partial = { landed, landedAt: this.landedAt, lap, newRegion, cargo: this.cargo, nightOwl: this.nightOwl, airportsSkipped: this.airportsSkipped, sunBlocked: this.sunBlocked, planted: this.planted, crystals: this.crystals,
      crash, crashes: this.save.crashes || {}, distance: m, kinds: this.speciesPlanted.size, bumped: this.bumped, goldens: this.goldens,
      onRunway: this.parcelOnRunway, forestFull: this.forestFullSaid, projects: projectsDone(this.save).map(p => p.id) };
    const missionDone = !!(mission && mission.check(partial, this.save));
    const missionIndex = missionDone ? missionIndexOf(mission) : null;
    if (missionDone) completeMission(this.save, mission);
    const nextMission = this.school || s2 ? null : currentMission(this.save);
    // (save.city is still the START city here: "here" missions count where the flight began.)
    // S4: the mission fields (src/sim/rules.js countPasses; the sim chat, 86a6a02) go in too, so area missions can read them.
    const s2Done = !this.school && s2 ? s2Flight(this.save, { ...partial, dodges: this.dodgesTotal, treeIds: [...this.speciesTags],
      cleanGaps: this.cleanGaps || 0, noFlyPassed: this.noFlyPassed || 0, foundIds: [...(this.foundIds || [])] }) : [];
    const s2Next = s2 && !this.school ? s2NextMission(this.save) : null;
    const natureGain = biodiversity(this.save) - (this.bioStart || 0);
    // Each land whose meter rose this flight (0.11.1: the results used to show the UK's only).
    const natureGains = this.school ? [] : Object.keys(REGION_NAMES).map(r => ({ region: r, name: REGION_NAMES[r], gain: biodiversity(this.save, r) - ((this.bioStartAll || {})[r] || 0) })).filter(g => g.gain > 0);
    if (!this.school) this.save.flownKm = flown;
    const eraBefore = eraProgress(this.save).index;
    if (!this.school) this.save.flightSeconds = (this.save.flightSeconds || 0) + (this.flySeconds || 0);   // crashes count too
    const eraOpened = !this.school && eraProgress(this.save).index > eraBefore ? eraProgress(this.save).era.name : null;
    const newPlane = eraOpened ? syncFleet(this.save, { fly: true }) : null;   // a new era's plane joins the fleet
    if (landed && !this.school) { this.save.city = this.landedAt; this.save.heading = null; }   // choose a new direction from here
    const newRecord = landed && !this.school && m > this.save.bestDistance;
    if (newRecord) this.save.bestDistance = m;
    if (landed && !this.school && !this.crossing) recordAreaBest(this.save, this.homeName, m);   // season 2 offer gate (src/crossings.js): game and engine keep the same save
    this.save.seeds += gained;
    this.save.crystals = (this.save.crystals || 0) + this.crystals;   // always kept: smart flying counts even if you crash
    // The first safe landing earns one free upgrade, to show what the hangar is for.
    if (landed && !this.save.freeGiven) { this.save.freeGiven = true; this.save.freeUpgrade = true; }
    // Missions and badges are prizes to CLAIM, not paid now (src/rewards.js, src/badges.js).
    const rewards = this.school ? [] : [...s2Done.map(d => ({ key: `mission:${d.key}`, kind: 'mission', id: d.key, label: d.title, ...d.prize })), ...addPrizes(this.save, { ...partial, sunBlocked: this.sunBlocked, heat, distance: m, lap, dodges: this.dodgesTotal,
      kinds: this.speciesPlanted.size, heatTrapped: this.heatTrapped }, missionDone ? mission : null, missionIndex)];
    const newBadges = rewards.filter(p => p.kind === 'badge').map(p => p.id);
    this.persist();   // the game writes the save (the engine keeps it in memory)

    this.result = {
      landed, landedAt: this.landedAt, from: this.homeName, lap, reason, distance: m, heat, co2PerKm: Number(perKm),
      sunBlocked: Math.round(this.sunBlocked * 10) / 10, heatTrapped: Math.round(this.heatTrapped * 10) / 10,
      breakdown: { ...this.breakdown }, earned, gained, newBadges, newRecord, planted: this.planted, kinds: this.speciesPlanted.size,
      cargo: this.cargo, crystals: this.crystals, school: !!this.school, airportsSkipped: this.airportsSkipped, nightOwl: this.nightOwl, mult,
      flyMinutes: this.school ? 0 : (this.flySeconds || 0) / 60, eraOpened, newPlane: newPlane ? newPlane.name : null,
      rewards, foundIds: [...(this.foundIds || [])],
      missions2: s2 ? { done: s2Done.map(d => d.title), next: s2Next ? s2Next.title : null } : null,
      // Mission fields (PROPOSAL-HOME-MISSIONS): trees planted this flight ('land:id', UK bare), clean storm gaps, no-fly
      // zones passed. Animals found: foundIds above (the game's 'seen' hook fills it; [] in Node).
      treeIds: FIELD_PLANTS.trees ? [] : [...this.speciesTags], cleanGaps: this.school ? 0 : this.cleanGaps, noFlyPassed: this.school ? 0 : this.noFlyPassed,
      mission: mission ? { title: mission.title, done: missionDone, doneText: missionDone ? mission.done || '' : '', fail: missionDone ? '' : mission.fail(partial, this.save), next: nextMission ? nextMission.title : null, last: !nextMission && missionDone } : null, natureGain, natureGains, bio: biodiversity(this.save),
    };
    this.bank = { m, missionDone, lap, crash, gained };
    return this.bank;
  },

  // The plane in free flight for one frame: gravity, the landing flare, the ceiling. Moved out of step() so the
  // perfect-tapper study (tools/sim/tapper.mjs) moves its plane with exactly this code.
  freeFall(dt) {
    this.plane.vy = Math.min(PLANE.maxFall, this.plane.vy + PLANE.gravity * dt);
    // Landing flare: when you are low and falling, the runway is within reach, and NO storm is
    // between you and it, the plane levels out and floats down onto the runway. With a storm in
    // the way you fall normally, so you can dive through its gap. Flaring burns extra CO2.
    this.flaring = false;
    const toStart = this.nextAirport.worldX - this.distancePx;          // runway start, ahead of the plane's x
    const drop = SKY_H - this.spriteBottom();
    const clearPath = !this.storms.some(st => st.rects[0].x + st.rects[0].width > this.plane.x - 4 && st.rects[0].x < this.plane.x + Math.max(0, toStart) + PLANE.w);
    const room = toStart + AIRPORT.runwayLen - PLANE.w - 10;          // runway left before the far end
    if (this.plane.vy > 0 && drop < AIRPORT.flareHeight * this.kit.flare && toStart < AIRPORT.flareFrom * this.kit.flare && room > 0 && clearPath) {   // Landing Gear: wider window
      const v = Math.max(1, this.speed);
      // Before the runway: sink just slowly enough to reach it. Over it: gently, but fast
      // enough to touch down before the far end.
      const cap = toStart > 0 ? Math.max(15, drop / ((toStart + 20) / v)) : Math.max(AIRPORT.flareVy, drop / (room / v));
      this.plane.vy = Math.min(this.plane.vy, cap);
      this.flaring = true;
    }
    this.plane.y += this.plane.vy * dt;
    if (this.plane.y < 0) { this.plane.y = 0; this.plane.vy = 0; }
  },

  // The flight ends: landed, or why not. The game then shows the results (GameScene.onFinish).
  finish({ landed = false, reason = '', sound = 'crash' }) {
    this.setState('over');
    this.co2Rate = 0;
    this.landed = landed; this.endReason = reason;
    this.bankFlight({ landed, reason });
    this.onFinish({ landed, reason, sound });
  },

  updateTokens(dt, box) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    this.tokens = this.tokens.filter(t => {
      t.phase += dt * 4;
      const tx = t.x + 7, ty = t.y + 7;
      // Distance from the token's centre to the plane's hitbox.
      const dxB = Math.max(box.x - tx, 0, tx - (box.x + box.w)), dyB = Math.max(box.y - ty, 0, ty - (box.y + box.h));
      const d = Math.hypot(dxB, dyB);
      if (this.kit.pickup > 12 && d < this.kit.pickup * 2.5) {
        // Magnet: pull towards the plane.
        const a = Math.atan2(cy - ty, cx - tx);
        t.x += Math.cos(a) * TOKENS.magnetPull * dt;
        t.baseY += Math.sin(a) * TOKENS.magnetPull * dt;
      }
      t.y = Math.round(t.baseY + Math.sin(t.phase) * TOKENS.bob);
      if (d <= this.kit.pickup - 6 && this.state === 'playing' && t.power) {
        this.usePower(t.power, tx, ty);
        this.unshow(t);
        return false;
      }
      if (d <= this.kit.pickup - 6 && this.state === 'playing') {
        this.cargo += t.value;
        if (t.value > 1) this.goldens++;
        this.onSeed(t, tx, ty);
        this.unshow(t);
        return false;
      }
      if (t.x < -20) { this.unshow(t); return false; }
      return true;
    });
  },

  usePower(power, tx, ty) {
    if (power === 'saf') {
      // Swap to All-SAF numbers for a while, then back to your own fuel (this.ownKit).
      if (!this.ownKit) this.ownKit = this.kit;
      const own = this.ownKit, saf = FUELS.saf100, f = saf.co2 / FUELS[own.fuelId].co2;
      this.kit = { ...own, co2Cruise: own.co2Cruise * f, co2Takeoff: own.co2Takeoff * f, smoke: own.smoke * f,
        vapour: saf.water, contrailEvery: saf.contrailEvery, contrailLife: saf.contrailLife };
      this.safUntil = this.gameTime + POWERUPS.safSeconds * 1000;
    } else {
      this.autoUntil = this.gameTime + this.kit.autoSecs * 1000; this.autoFrom = this.gameTime;
    }
    this.onPower(power, tx, ty);
  },

  // Timed pick-ups running out.
  updatePowers() {
    if (this.safUntil && this.gameTime >= this.safUntil) { this.safUntil = 0; this.kit = this.ownKit; this.ownKit = null; this.popup(this.plane.x + 20, this.plane.y - 10, 'SAF used up', '#c8c8c8'); }
    if (this.autoUntil && this.gameTime >= this.autoUntil) { this.autoUntil = 0; this.popup(this.plane.x + 20, this.plane.y - 10, 'You have control!', '#ffe15a'); }
  },

  updateHazards(dt, box) {
    // Turbulence: wavy lines; inside it, taps lag and the plane gets bumped.
    this.inTurb = false;
    for (const z of this.turbs) {
      if (!z.blobs) z.blobs = P.cloudBlobs(this, z.w, z.h);   // its shape: made on its first frame (physics random stream)
      if (this.inCloud(z.blobs, z.x, z.y, z.w, z.h, box)) this.inTurb = true;
    }
    this.turbs = this.turbs.filter(z => { if (z.x + z.w > -10) return true; this.unshow(z); return false; });
    if (this.inTurb && this.state === 'playing') {
      this.bumpIn -= dt;
      if (this.bumpIn <= 0) {
        const T = HAZARDS.turbulence;
        this.plane.vy += this.planeBetween(-T.bump, T.bump);
        this.bumped = true;
        this.bumpIn = this.planeFloatBetween(T.bumpEvery[0], T.bumpEvery[1]);
        this.shake(80, 0.004);
      }
      this.pose.x += this.planeBetween(-1, 1);   // the plane judders: its picture, and so its pixel hits, move 1 px
    }

    // Birds fly towards you, bobbing up and down; hitting one ends the flight.
    const B = HAZARDS.birds;
    for (const f of this.birds) {
      f.x -= B.extraSpeed * dt;
      // Birds steer out of a storm gap the plane is about to fly through (a flock there would
      // leave no way past). The spawn check usually prevents it; this catches the rest.
      const wob = B.wobble * (P.KNOB_PLANTS.wobble ? 1 : this.kit.birdWobbleMul ?? 1);   // bird detection (see flockBlocksGap)
      const half = f.half ?? (f.birds.length - 1) / 2, top = f.y - half * 9 - 4 - wob, bottom = f.y + half * 9 + 16 + wob;
      for (const st of this.storms) {
        const r = st.rects[0], gTop = r.height, gBot = st.rects[1].y;
        if (r.x + r.width < this.plane.x - 10 || r.x > this.plane.x + 200) continue;     // only gaps the plane is reaching
        if (f.x > r.x + r.width + 40 || f.x + half * 26 + 16 < this.plane.x - 40) continue;   // flock not near that column
        if (top < gBot && bottom > gTop) f.y += (f.y - (gTop + gBot) / 2 < 0 ? -1 : 1) * 160 * dt;
      }
      if (f.turn) {   // era-5 twist: at `at` of the screen the flock slides dy px over `secs`, towards the side with more room
        const T = B.turn;
        if (f.turn.left < 0 && f.x < WIDTH * T.at) f.turn.left = T.secs;
        if (f.turn.left > 0 && !TWIST_PLANTS.still) { const k = Math.min(dt, f.turn.left); f.y += f.turn.dir * T.dy * k / T.secs; f.turn.left -= k; if (f.turn.left <= 0) f.turn.left = 0; }
      }
      f.phase += dt * 2;
      const fy = f.y + Math.sin(f.phase) * wob;
      const frame = Math.floor(this.gameTime / 120) % 2;
      for (const b of f.birds) { b.x = Math.round(f.x + b.ox); b.y = Math.round(fy + b.oy); b.key = `bird-${frame}`; }
    }
    this.birds = this.birds.filter(f => { if (f.x < -60) { this.unshow(f); return false; } return true; });
  },

  // Ice crystals: the contrail currency, for smart flying (dodging icy air at night, clean nights).
  // Daytime contrails earn none: in real life they are not always cooling.
  earnCrystals(n, why) {
    this.crystals += n;
    this.onCrystals(n, why);
  },

  land(rw) {
    this.landedAt = rw.name;
    this.landingSpeed = this.speed;
    this.plane.y = this.groundedY();
    this.plane.vy = 0;
    this.setState('landing');
    this.pose = P.planePose(this);
    this.onLand();
  },

  applyFlap() {
    if (this.onAutopilot() && this.gameTime < this.autoFrom + POWERUPS.autoLockMs) return;   // the tap that grabbed it must not cancel it
    this.graceUntil = 0;   // flying again ends the breather
    if (this.onAutopilot()) { this.autoUntil = 0; this.popup(this.plane.x + 20, this.plane.y - 10, 'You have control!', '#ffe15a'); }   // ...and the autopilot pick-up
    this.plane.vy = PLANE.flapVelocity;
    this.flaps = (this.flaps || 0) + 1;
    this.playSound('flap');
  },

  flap() {
    if (this.state !== 'playing') return;
    if (this.inTurb) {
      // Turbulence: the tap works, but a little late.
      const [a, b] = HAZARDS.turbulence.delay;
      this.later(this.planeBetween(a, b), () => { if (this.state === 'playing') this.applyFlap(); });
      return;
    }
    this.applyFlap();
  },

  // A breather after a pop-up closes: for a moment the AUTOPILOT flies (towards the next storm
  // gap, round birds) and nothing can crash you, so a tap you were about to make isn't too late.
  // Your first tap ends it and you fly as normal. (It used to just hover, which felt stuck.)
  startGrace() {
    if (this.state !== 'playing') return;
    this.graceUntil = this.gameTime + GRACE_MS;
    this.plane.vy = 0;
  },

  // A false patch, close up: it puffs into sparkles with "Forecast wrong!" (user, draft 2) and is gone.
  popFake(i) {
    P.popIssr(this, i);   // fades out by game time (src/sim/physics.js)
    this.onPopFake(i);
  },

  updateContrails(dt, time) {
    for (const c of P.ageContrails(this, dt, time)) this.unshow(c);
  },

  // Everything ahead moves left by dx; what has gone off screen is dropped.
  scroll(dx) {
    for (const s of this.storms) for (const r of s.rects) r.x -= dx;
    this.storms = this.storms.filter(s => {
      if (s.rects[0].x + STORMS.width < -16) { this.unshow(s); return false; }   // (the cloud puffs out past the column)
      return true;
    });
    for (const i of this.issrs) i.x -= dx;
    this.issrs = this.issrs.filter(i => {
      if (i.x + i.width < -5) { this.unshow(i); return false; }
      return true;
    });
    for (const c of this.contrails) c.x -= dx;
    for (const rw of this.runways) rw.x -= dx;
    this.runways = this.runways.filter(rw => {
      if (rw.x + AIRPORT.runwayLen < -5) { this.unshow(rw); return false; }
      return true;
    });
    for (const t of this.tokens) t.x -= dx;
    for (const z of this.turbs) z.x -= dx;
    for (const f of this.birds) f.x -= dx;
    for (const pl of this.plots) pl.x -= dx;
    this.plots = this.plots.filter(pl => { if (pl.x + this.kit.plotW < -30) { this.unshow(pl); return false; } return true; });
  },

  // Day and night: this.isDay = "contrails cool now". The sky is drawn from the clock alone (GameScene.drawSkyNow).
  updateDayNight(time) {
    const { isDay: skyDay, toOther } = this.dayNightPhase();
    this.isDay = this.radiationMode().cool;
    // Teach the switch the moment it starts.
    const half = skyDay ? (toOther > 0 ? 'dusk' : 'day') : (toOther > 0 ? 'dawn' : 'night');
    if (half !== this.lastHalf) {
      this.onDayHalf(half);
      // Night Owl: a whole night flown without trapping any heat.
      if (half === 'night') { this.nightDodges = 0; this.cleanLeft = (this.kit.cleanSecs || 0) * 1000; }   // the clean-cruise meter refills each night
      if (half === 'night' && this.state === 'playing') this.night = { started: true, trappedAtStart: this.heatTrapped };
      if (half === 'dawn' && this.night.started && this.heatTrapped - this.night.trappedAtStart < 0.5) {
        this.nightOwl = true;
        this.popup(WIDTH / 2, 60, 'NIGHT OWL!', '#ffe15a', 16);
        this.earnCrystals(CRYSTALS.cleanNight, 'clean night!');
      }
      if (half === 'dawn') this.night.started = false;
      this.lastHalf = half;
    }
  },

  // Light (day) and heat (night) are fixed columns. Each frame we find, per column, the contrail
  // square that blocks it (this.rays, which the game draws) and score the block.
  scoreRays(dt, scoring) {
    const { cool: isDay, strength } = this.radiationMode();   // fades out, is neutral at the halfway point, fades in the other way
    this.rays = { isDay, strength, cols: strength > 0 ? P.rayColumns(this.contrails, isDay) : [] };
    if (strength <= 0 || !scoring) return;
    const blocked = this.rays.cols.filter(c => c.hit).length;
    const rate = P.rayRate(this, isDay, strength, blocked);
    this.heat += rate * dt;
    if (isDay) { this.sunBlocked += -rate * dt; this.breakdown.sun += -rate * dt; }
    else { this.heatTrapped += rate * dt; this.breakdown.night += rate * dt; }

    // Every so often, show what the contrails just did as a floating number.
    this.feedback.amount += rate * dt;
    this.feedback.timer += dt;
    if (this.feedback.timer >= 0.8) {
      const amt = this.feedback.amount;
      if (Math.abs(amt) >= 0.3) {
        const cooling = amt < 0;
        this.popup(this.plane.x + 6, this.plane.y - 10, `${cooling ? '-' : '+'}${Math.abs(amt).toFixed(1)} ${cooling ? 'cooler' : 'hotter'}`, cooling ? '#7fd3ff' : '#ff6a5a');
        if (cooling) { this.playSound('cool'); this.coolSparkle(); } else { this.playSound('warm'); this.buzz(25); }
      }
      this.feedback = { amount: 0, timer: 0 };
    }
  },

  updateParcels(dt) {
    this.parcelsFalling = this.parcelsFalling.filter(p => {
      p.t += dt;
      p.vy = p.t < PARCEL.chuteAfter ? p.vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, p.vy + PARCEL.gravity * dt);
      p.x += -this.speed * (1 - Math.exp(-p.t / PARCEL.dragTime)) * dt;
      p.y += p.vy * dt;
      if (p.y < SKY_H) return true;
      this.parcelLanded(p.x, p.kind, p.region);
      this.unshow(p);
      return false;
    });
  },

  parcelLanded(x, kind, region = this.regionNow || 'woodland') {
    const plot = this.plots.find(pl => !pl.used && x >= pl.x - 3 && x <= pl.x + this.kit.plotW + 3);
    if (!plot) {
      const onRunway = this.runways.some(r => x >= r.x && x <= r.x + AIRPORT.runwayLen);
      if (onRunway) this.parcelOnRunway = true;   // a funny challenge
      this.onParcelMissed(x, onRunway);
      return;
    }
    plot.used = true;
    // The tree for this slot in the land below (the user, 2026-10-22).
    const here = localTree(kind, region);   // the land it was dropped over
    const tree = { kind, plantedAt: this.elapsed, stage: 0 };   // kind: growth and cooling (UK slot)
    this.trees.push(tree);
    this.planted++;
    this.speciesPlanted.add(here.id);   // kinds = SPECIES (local ids), not UK slots (PROPOSAL-TREES.md §4)
    this.speciesTags.add(here.uk ? here.id : `${region}:${here.id}`);   // ids repeat across lands (oak, acacia...): each land's counts on its own
    // Biodiversity: a new kind of tree is a big boost; the same kind again adds less.
    // Counted where it grows: UK trees in save.planted, other regions' in save.plantedIn[region].
    const book = here.uk ? this.save.planted : ((this.save.plantedIn = this.save.plantedIn || {})[region] = (this.save.plantedIn[region] || {}));
    const first = !(book[here.id] > 0);
    book[here.id] = (book[here.id] || 0) + 1;
    this.showTree(tree, plot, here, first);
  },

  dropParcel() {
    if (this.state !== 'playing' || !this.kit.tree || this.frozen) return;
    if (this.parcels <= 0) { this.playSound('nope'); return; }
    // Over the open sea and the ice nothing can be planted (user, 2026-10-24): keep the parcel.
    if (['ocean', 'ice'].includes(this.regionNow)) {
      this.playSound('nope');
      if (!this.saidNoSoil) { this.saidNoSoil = true; this.popup(this.plane.x + 20, this.plane.y - 12, this.regionNow === 'ocean' ? 'No land to plant on!' : 'Nothing grows on the ice!', '#cfe6ff'); }
      return;
    }
    this.parcels--;
    const p = { x: this.plane.x + PLANE.w / 2, y: this.plane.y + PLANE.h, t: 0, vy: 0, kind: this.treeKind(), region: this.regionNow || 'woodland' };   // a record; the crate is .view
    this.parcelsFalling.push(p);
    this.showParcel(p);
    this.speciesIdx++;
    this.playSound('flap');
    this.ui.tipOnce('firstDrop', tip('firstDrop'), '', 'good', 3.5);
  },
};
