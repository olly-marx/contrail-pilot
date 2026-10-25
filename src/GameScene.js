import {
  km, WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS,
  TAKEOFF, AIRPORT, CRYSTALS, DAYNIGHT, RADIATION, CLIMATE, TOKENS, CARGO, PARCEL, HAZARDS,
  FOREST, POWERUPS, FEATURES,
} from './config.js';
import { School } from './school.js';
import { makeRng } from './sim/rng.js';
import * as P from './sim/physics.js';   // the flight's rules, shared with the sim engine
import { mask } from './sim/masks-load.js';
import { MASK_DATA } from './sim/masks.js';
import { Hud } from './Hud.js';
import { loadout, FUELS } from './upgrades.js';
import { sendFlight } from './online.js';
import { flightPath, legBetween, city, HOME, EARTH_KM } from './route.js';
import { addPrizes } from './rewards.js';
import { writeSave } from './save.js';
import { eraProgress } from './eras.js';
import { syncFleet, CONTRAIL_MARGIN, FORECAST, GAP_HINT, FARES, UPGRADE_ART, lookFiles, stickers, fleetOf, levelEra } from './fleet.js';
import { composeOnto } from './planelook.js';
import { sfx, buzz } from './sound.js';
import { current as currentMission, complete as completeMission, indexOf as missionIndexOf, MISSIONS } from './missions.js';
import { PART_LINES, natureBadge, natureLevels } from './planeparts.js';
import { WILDLIFE, REGIONS } from './wildlife.js';
import { animalDir, animalPortrait } from './animalart.js';
import { LANDMARKS } from './landmarks.js';
import { SPECIES, biodiversity, plantGain, hasProject, natureCooling, projectsDone, PROJECTS, wildlifeScene, localTree, regionSpecies } from './nature.js';
import { regionBelow } from './geo.js';
import { REGION_DATA, REGION_NAMES } from './habitats.js';

const SKY_H = HEIGHT - GROUND_H;
const GRACE_MS = 1500;   // breather after a pop-up closes: the autopilot flies, then hands back
const FONT = 'Pixel, monospace';

const overlaps = P.overlaps;

function lerpColour(a, b, t) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

// "World x" of something = the scroll distance at which its left edge reaches the plane.
// Screen x = PLANE.x + worldX - distancePx.

// How a flight ended, for the online Oops boards (from the crash message shown to the player).
const LANDMARK_SCALE = 2;   // the user: bigger landmarks (whole numbers keep the pixels crisp)
const LANDMARK_HAZE = 0.82, LANDMARK_BACK = 6;   // skylines: a little see-through, base 6 px up behind the city row

const FLOCK_HALF = 2;   // a flock fills the box of an old 5-bird V: 26 px across, 36 px down
const crashKind = reason => /Bird/.test(reason) ? 'bird' : /Restricted/.test(reason) ? 'nofly' : /Storm/.test(reason) ? 'storm'
  : /too hot/.test(reason) ? 'overheat' : 'ground';

// PixelLab thunderclouds (the user, 2026-10-24): every storm column is a whole storm tower picture
// (tools/art/pixellab_storm.py): crown up below the gap, hanging (flipped, darker) above it.
const STORM_ART = ['c', 'd'];
const STORM_OVERLAP = 40;   // a tall column stacks another tower behind, overlapping this much

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    this.load.image('plane', 'assets/plane.png');   // the 747; also the collision mask for EVERY plane
    this.load.image('plane-comet', 'assets/plane-comet.png');   // eras (src/fleet.js): looks only
    this.load.image('plane-twin', 'assets/plane-twin.png');
    this.load.image('plane-747', 'assets/plane-747.png');   // the 1970s paint (era colour ladder)
    for (const k of UPGRADE_ART) this.load.image(k, `assets/upgrades/${k}.png`);   // upgrade looks, stickers, towers (src/fleet.js)
    for (const [id, n] of Object.entries(PART_LINES)) for (let i = 1; i <= n; i++) this.load.image(`plane-${id}-${i}`, `assets/plane-${id}-${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`plane-nature-${i}`, `assets/plane-nature-${i}.png`);
    this.load.image('plane-lights', 'assets/plane-lights.png');
    for (let i = 0; i < 3; i++) this.load.image(`plane-shimmer-${i}`, `assets/plane-shimmer-${i}.png`);
    for (let i = 0; i < 4; i++) this.load.image(`plane-sparkle-${i}`, `assets/plane-sparkle-${i}.png`);
    // Background strips: drawn by tools/art/make_background.py, 288 px wide, tile seamlessly.
    for (const k of ['clouds', 'hills', 'city', 'ground']) this.load.image(k, `assets/${k}.png`);
    for (const c in LANDMARKS) this.load.image(LANDMARKS[c].key, `assets/${LANDMARKS[c].key}.png`);   // art session: one per city
    // Sprites: drawn by tools/art/make_sprites.py.
    for (const k of [...STORM_ART.flatMap(v => [`storm-rise-${v}`, `storm-hang-${v}`, `storm-rise-${v}-flash`, `storm-hang-${v}-flash`]), 'storm-spark-0', 'storm-spark-1', 'storm-spark-2', 'token', 'token-gold', 'power-saf', 'power-auto', 'meter-tree-0', 'meter-tree-1', 'meter-tree-2', 'meter-tree-3', 'chute', 'crate', 'bird-0', 'bird-1', 'stork',
      'plot-left', 'plot-mid', 'plot-right', 'turb', 'crystal', 'bolt-0', 'bolt-1', 'bolt-2', 'plot-sign', 'plot-arrow', 'runway', 'tower', 'issr-tile', 'nofly',
      ...['happy', 'ok', 'hot', 'melting'].flatMap(m => [`face-${m}-0`, `face-${m}-1`])])   // the planet faces, 2 frames (Hud.js)
      this.load.image(k, `assets/${k}.png`);
    // Background wildlife: two frames each (legs / wings).
    // Animals and birds: every species in src/wildlife.js (the loop below).
    // Every species the art session has drawn (src/wildlife.js, generated): new ones load themselves.
    // Animals and trees: only the UK's and those of the land you are in now (2026-10-23: all 240 species
    // added ~260 requests at start-up); the rest load in the background for the lands this flight crosses.
    const sv = this.registry.get('save') || {}, home = city(typeof sv.city === 'string' ? sv.city : HOME);
    this.queueArt(['woodland', home ? home.region : 'woodland']);
    // Each region's ground strip and hills (woodland's are 'ground' and 'hills', loaded above).
    for (const r in REGIONS) for (const k of [REGIONS[r].ground, REGIONS[r].hills]) if (k && !['ground', 'hills'].includes(k)) this.load.image(k, `assets/${k}.png`);
    this.load.image('puff', 'assets/puff.png');
    for (const kind of Object.keys(SPECIES)) for (let s = 0; s < 3; s++) this.load.image(`tree-${kind}-${s}`, `assets/tree-${kind}-${s}.png`);
  }

  init(data) { this.autostart = data && data.go ? data.mode || 'normal' : null; }

  create() {
    this.save = this.registry.get('save');
    this.ui = this.registry.get('ui');
    this.kit = loadout(this.save);
    this.rng = makeRng(this.save.simSeed ?? (Math.random() * 2 ** 32) >>> 0);   // physics random numbers (src/sim/rng.js); decoration keeps Math.random
    this.builtWith = JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet]);   // scenery depends on upgrades (e.g. meadow flowers)
    this.makeTextures();

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
    this.turbs = [];                 // turbulence zones {x, w}
    this.birds = [];                 // flocks {birds: [{img, ox, oy}], x, y, phase}
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
    this.stormCount = 0;
    this.lastContrail = 0;
    this.wasInIssr = false;

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
    this.bumped = false;               // shaken by turbulence
    this.parcelOnRunway = false;       // a parcel landed on a runway (oops!)
    this.speciesPlanted = new Set();   // kinds of tree planted this flight (for the online boards)
    this.lastHalf = 'day';
    this.night = { started: false, trappedAtStart: 0 };
    this.nightOwl = false;
    this.warnedHot = false;

    // The journey (src/route.js): take off from the city you last landed in, the way you chose; the
    // flight's path then follows the world-tour rule. Flight school and the first flights: LONDON towards
    // PARIS. this.path[0] is home; airportIndex = airports passed so far this flight (startCity is 0).
    this.path = flightPath(this.autostart === 'school' || !this.save.tutorialDone ? { city: HOME } : this.save);
    this.startCity = 0;
    this.homeName = this.path[0];
    this.airportIndex = 0;
    this.airportsSkipped = 0;
    this.nextAirport = this.airportAhead(0);

    // ---- draw order: sky scenery, ISSRs, contrails, light, storms, plane, ground, HUD ----
    this.skyGfx = this.add.graphics();   // stars, sun, moon
    this.stars = Array.from({ length: 45 }, () => ({ x: Phaser.Math.Between(0, WIDTH), y: Phaser.Math.Between(0, SKY_H - 120), tw: Math.random() * 6 }));
    this.cloudsFar = this.add.tileSprite(0, 60, WIDTH, 40, 'clouds').setOrigin(0).setAlpha(0.55);
    this.hills = this.add.tileSprite(0, SKY_H - 46, WIDTH, 46, 'hills').setOrigin(0);
    this.hills2 = this.add.tileSprite(0, SKY_H - 46, WIDTH, 46, 'hills').setOrigin(0).setAlpha(0);   // the next region's hills, fading in
    this.landmarks = [];               // each city's landmark (Big Ben ...), behind its runway in the skyline
    this.landmarkLayer = this.add.layer();
    this.city = this.add.tileSprite(0, SKY_H - 30, WIDTH, 30, 'city').setOrigin(0);
    this.farTreeLayer = this.add.layer();   // background trees on the horizon
    this.hedge = hasProject(this.save, 'hedgerow') ? this.add.tileSprite(0, SKY_H - 6, WIDTH, 6, 'hedge').setOrigin(0) : null;
    this.storkLayer = this.add.layer();

    this.issrLayer = this.add.layer();
    this.contrailLayer = this.add.layer();
    this.rayGfx = this.add.graphics();
    this.stormLayer = this.add.layer();
    this.turbGfx = this.add.graphics();
    this.turbLayer = this.add.layer();
    this.birdLayer = this.add.layer();

    this.plane = { x: PLANE.x, y: this.groundedY(), vy: 0 };
    this.exhaustLayer = this.add.layer();
    this.puffs = [];
    this.nextPuff = 0;
    this.planeSprite = this.add.image(0, 0, this.planeLookKey());   // the plane flown, as upgraded; collisions stay on alphaMask('plane')
    this.buildPlaneParts();

    this.ground = this.add.tileSprite(0, SKY_H, WIDTH, GROUND_H, 'ground').setOrigin(0);
    this.ground2 = this.add.tileSprite(0, SKY_H, WIDTH, GROUND_H, 'ground').setOrigin(0).setAlpha(0);
    this.groundFx = this.add.graphics();   // contrail shadows (day) and trapped-heat glow (night)
    this.flowers = hasProject(this.save, 'meadow') ? this.add.tileSprite(0, SKY_H + 6, WIDTH, 4, 'flowers').setOrigin(0) : null;
    this.decorLayer = this.add.layer();
    this.wildLayer = this.add.layer();     // cows, sheep and wild animals
    this.regionNow = null; this.setRegion(this.regionHere(), true);   // what is below the plane (src/geo.js)
    this.loadPathArt();
    if (FEATURES.pixelReadout) this.previewReadout();
    this.buildWildlife();
    this.plotLayer = this.add.layer();
    this.aimGfx = this.add.graphics();     // where a parcel dropped now would land
    this.treeLayer = this.add.layer();
    this.runwayLayer = this.add.layer();
    this.addRunway(-60, this.homeName);    // home runway under the plane: the city you take off from
    this.fxLayer = this.add.layer();       // particles and popups

    this.heatFx = this.add.graphics();   // red edges when the Earth overheats
    this.heatWarned = { 50: false, 75: false, 90: false };
    this.nextBeat = 0;
    this.hud = new Hud(this);
    this.hud.setCo2(0);
    this.hud.setHeat(0);

    const font = { fontFamily: FONT, fontSize: '16px', color: COLOURS.text, stroke: '#000', strokeThickness: 4 };
    this.distText = this.add.text(WIDTH / 2, 8, '', font).setOrigin(0.5, 0);
    // Mission line: wraps inside the two HUD bars (about 25 characters a line) and never spills off screen.
    this.missionText = this.add.text(WIDTH / 2, 46, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#ffe15a', align: 'center',
      wordWrap: { width: 200, useAdvancedWrap: true }, maxLines: 2, lineSpacing: 2 }).setOrigin(0.5, 0);
    this.dialGfx = this.add.graphics().setDepth(5);   // day / night dial (drawDayDial)
    // Forest meter (bottom right): 10 little trees that grow as your forest soaks up CO2 this flight.
    // Measured against the biggest forest (FOREST.store, all kinds planted); slots past what your
    // kinds can hold are dimmed, so planting early, and more kinds, both show.
    // Between the bottom-left text (which names it) and the DROP button.
    this.meterTrees = this.kit && this.kit.tree ? Array.from({ length: 10 }, (_, i) =>
      this.add.image(130 + i * 9, HEIGHT - 2, 'meter-tree-0').setOrigin(0.5, 1).setDepth(5)) : [];
    this.forestFull = false;
    this.nextText = this.add.text(WIDTH / 2, 58, '', { ...font, fontSize: '8px', strokeThickness: 3 }).setOrigin(0.5, 0);
    this.hintText = this.add.text(4, SKY_H + 22, '', { ...font, fontSize: '8px', strokeThickness: 3, lineSpacing: 4 }).setOrigin(0, 0);
    this.parcelText = this.add.text(4, HEIGHT - 11, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#8dffb0' }).setOrigin(0, 0);

    this.cargoIcon = this.add.image(28, 12, 'token').setOrigin(0, 0);
    this.cargoText = this.add.text(45, 13, '0', { ...font, fontSize: '8px', strokeThickness: 3 }).setOrigin(0, 0);
    this.multText = this.add.text(60, 13, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#ffe15a' }).setOrigin(0, 0);
    this.crysIcon = this.add.image(32, 34, 'crystal').setOrigin(0.5);
    this.crysText = this.add.text(45, 30, '0', { ...font, fontSize: '8px', strokeThickness: 3, color: '#9fe0ff' }).setOrigin(0, 0);
    this.cargoIcon.setVisible(false); this.crysIcon.setVisible(false); this.crysText.setVisible(false);

    this.input.on('pointerdown', p => this.onTap(p));
    // Take-off is press-and-hold. Watched on the window so the captain's speech bubble can't swallow it.
    this.holding = false;
    const down = () => { this.holding = true; }, up = () => { this.holding = false; };
    window.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
    this.input.keyboard.on('keydown-SPACE', down); this.input.keyboard.on('keyup-SPACE', up);
    this.events.once('shutdown', () => { window.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); });
    this.autoText = this.add.text(0, 0, 'AUTOPILOT - tap to fly!', { fontFamily: FONT, fontSize: '8px', color: '#ffe15a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(10).setVisible(false);
    this.holdText = this.add.text(WIDTH / 2, SKY_H / 2, '', { fontFamily: FONT, fontSize: '16px', color: '#ffe15a', stroke: '#000', strokeThickness: 4, align: 'center', lineSpacing: 6 }).setOrigin(0.5).setDepth(10);
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
    this.input.keyboard.on('keydown-UP', () => this.flap());
    this.input.keyboard.on('keydown-T', () => this.dropParcel());
    this.input.keyboard.on('keydown-DOWN', () => this.dropParcel());
    this.input.keyboard.on('keydown-ESC', () => this.backToMenu());
    // DROP button, drawn in the ground strip so it sits in the same place on every screen.
    const bx = WIDTH - 70, by = SKY_H + 12;
    this.dropBox = { x: bx, y: by, w: 64, h: 32 };
    this.dropBg = this.add.rectangle(bx, by, 64, 32, 0x4caf50).setOrigin(0).setStrokeStyle(2, 0x1b1b2f);
    this.dropLabel = this.add.text(bx + 32, by + 16, 'DROP', { ...font, fontSize: '8px', strokeThickness: 3, align: 'center', lineSpacing: 3 }).setOrigin(0.5);
    this.dropLabel.setFontSize(7);
    this.setDropVisible(false);

    // Pause when the tab is hidden, so a phone in a pocket doesn't crash the plane.
    this.onVis = () => { if (document.hidden) this.scene.pause(); else this.scene.resume(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.events.once('shutdown', () => document.removeEventListener('visibilitychange', this.onVis));

    this.cameras.main.setBackgroundColor(COLOURS.skyDay);
    this.drawPlane();
    this.updateScenery(0);
    this.drawSky(0);
    if (this.autostart === 'school') this.startSchool();
    else if (this.autostart) this.startFlight();
  }

  // ---------- textures drawn in code (placeholders until real pixel art arrives) ----------
  makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // Per-key: a texture already loaded from a PNG wins; code only fills the gaps.
    const gen = (key, w, h) => { if (!this.textures.exists(key)) g.generateTexture(key, w, h); };

    // Rewilding you can see: flowers in the grass, hedgerows, ponds and storks.
    g.clear();
    const fr = new Phaser.Math.RandomDataGenerator(['flowers']);
    for (let x = 0; x < WIDTH; x += fr.between(3, 7)) g.fillStyle([0xffeb3b, 0xffffff, 0xe040fb, 0xff7043][fr.between(0, 3)]).fillRect(x, fr.between(0, 3), 1, 1);
    gen('flowers', WIDTH, 4);
    g.clear();
    for (let x = 0; x < WIDTH; x++) { const h = 3 + Math.round(1.5 * Math.sin(x / 3) + Math.sin(x / 7)); g.fillStyle(0x2e6b2e).fillRect(x, 6 - h, 1, h); }
    gen('hedge', WIDTH, 6);
    g.clear();
    g.fillStyle(0x3d8fd1).fillRect(2, 0, 22, 4).fillRect(0, 1, 26, 2);
    g.fillStyle(0x8fd3ff).fillRect(5, 1, 6, 1);
    gen('pond', 26, 4);
    g.clear();
    g.fillStyle(0x6d4c2f).fillRect(0, 0, 6, 2).fillRect(1, 2, 4, 1);
    gen('dam', 6, 3);
    g.destroy();
  }

  setState(s) { this.state = s; this.stateTime = 0; }

  // Physics random numbers (sim engine, 2026-10-25): everything that changes what can happen in a flight
  // (spawns, gaps, cloud shapes, turbulence, contrail puffs) draws from this.rng, so a seed (save.simSeed,
  // tests and probes only) gives the same sky with or without drawing. Looks keep Math.random.
  // Same formulas as Phaser.Math.Between / FloatBetween.
  rand() { return this.rng(); }
  between(a, b) { return Math.floor(this.rng() * (b - a + 1) + a); }
  floatBetween(a, b) { return this.rng() * (b - a) + a; }

  startSchool() {
    // Rebuild unless this scene is fresh, built with these upgrades AND in LONDON (school starts there).
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet]) || this.path[0] !== HOME || this.path[1] !== flightPath({ city: HOME })[1]) { this.scene.restart({ go: true, mode: 'school' }); return; }
    this.school = new School(this, this.ui);
    this.nextAirport = { worldX: 1e9, name: this.path[1], spawned: false };
    this.startFlight();
    this.school.begin();
  }

  // Leave flight school and carry on as a normal flight.
  skipSchool() {
    if (!this.school) return;
    this.school.markTaught();   // skipped: they chose not to be taught, but don't nag with the old tips either
    this.school = null;
    this.frozen = false;
    this.ui.hideCoach();
    this.save.tutorialDone = true;
    writeSave(this.save);
    this.nextAirport = { worldX: this.distancePx + this.legKm(0), name: this.path[1], spawned: false };
    this.nextStormAt = this.distancePx + WIDTH + 100;
    this.nextIssrAt = this.distancePx + 100;
    this.nextTokenAt = this.distancePx + 100;
    this.startGrace();
  }

  startFlight() {
    // Rebuild if this scene is from an old flight, or upgrades changed the scenery since.
    // Also if a new direction was chosen on the FLY screen since (the path is built with the scene).
    const pathNow = this.school ? this.path : flightPath(this.save.tutorialDone ? this.save : { city: HOME });   // (school: LONDON, set by startSchool)
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet])
      || pathNow[0] !== this.path[0] || pathNow[1] !== this.path[1]) { this.scene.restart({ go: true }); return; }
    // Upgrades may have been bought in the hangar since this scene was built.
    this.kit = loadout(this.save);
    this.rng = makeRng(this.save.simSeed ?? (Math.random() * 2 ** 32) >>> 0);   // physics random numbers, one stream per flight (src/sim/rng.js)
    this.safUntil = 0; this.autoUntil = 0; this.ownKit = null; this.nextPowerAt = POWERUPS.from; this.safOffered = false;   // pick-ups
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.setState('takeoff');
    this.rollSpeed = 0;
    this.airborne = false;
    this.flySeconds = 0;   // real flying time this flight, for the eras (src/eras.js)
    this.cargoIcon.setVisible(true); this.crysIcon.setVisible(true); this.crysText.setVisible(true);
    this.regionBanner(this.regionNow);   // which land you take off from, and its meter
    this.bioStartAll = Object.fromEntries(Object.keys(REGION_NAMES).map(r => [r, biodiversity(this.save, r)]));   // every land's meter, for the results
    this.bioStart = biodiversity(this.save);   // flights is counted at lift-off: going back to the menu from the runway is not a flight
  }

  // Esc while parked on the runway: back to the title, nothing lost, no flight counted.
  backToMenu() {
    if (this.state !== 'takeoff' || this.airborne || this.rollSpeed >= 5 || this.school) return;   // parked only: never mid-roll
    this.scene.restart();
    this.ui.showTitle();
  }

  // A new mechanic: pause the game and let the captain explain it, once per device.
  // seenTips containing '*' skips all explanations (used by automated tests).
  // `pic`: an assets/ui/*.png drawing shown with the words; text only until the file exists.
  explain(id, html, pic = null) {
    if (this.school || this.explaining) return false;
    const seen = this.save.seenTips;
    if (seen.includes(id) || seen.includes('*')) return false;
    seen.push(id);
    writeSave(this.save);
    this.ui.hideToast();
    this.frozen = true;
    this.explaining = true;
    this.autoText.setVisible(false);
    this.ui.coach(html, true, false, true, pic);
    return true;
  }

  // A breather after a pop-up closes: for a moment the AUTOPILOT flies (towards the next storm
  // gap, round birds) and nothing can crash you, so a tap you were about to make isn't too late.
  // Your first tap ends it and you fly as normal. (It used to just hover, which felt stuck.)
  startGrace() {
    if (this.state !== 'playing') return;
    this.graceUntil = this.gameTime + GRACE_MS;
    this.plane.vy = 0;
  }
  inGrace() { return this.graceUntil && this.gameTime < this.graceUntil; }

  // Where the autopilot steers (plane top y): the middle of the next storm gap ahead, else a safe
  // height; nudged above or below a flock of birds near that line.
  autopilotTarget() {
    const ahead = this.storms.filter(st => st.rects[0].x + st.rects[0].width > this.plane.x - 4 && st.rects[0].x < WIDTH)
      .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    let y = ahead ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - PLANE.h / 2 : this.plane.y;
    for (const f of this.birds) {
      if (f.x > this.plane.x - 20 && f.x < this.plane.x + 220 && Math.abs(f.y - y) < 50) y = f.y > y ? f.y - 60 : f.y + 60;
    }
    return Phaser.Math.Clamp(y, 40, SKY_H - 60);
  }

  // The autopilot PICK-UP's pilot: tries every height and flies the path that is best a little way
  // ahead. Storms and birds are off limits; icy air is sought by day (a shading contrail) but only if
  // the contrail will fade before dark, and avoided otherwise (it would trap heat). It uses the same
  // icy-air shape test that makes real contrails (inIssrShape), so it knows exactly where they form.
  wantContrails() {
    if (!this.isDay) return false;
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const toWarm = D - B / 2 - this.clock % (D + N);   // contrails start to warm halfway through dusk
    return toWarm > this.kit.contrailLife / 1000 + 1;
  }

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
        for (const f of this.birds) for (const bd of f.birds) if (overlaps(pad, { x: bd.img.x, y: bd.img.y, w: bd.img.width, h: bd.img.height })) cost += 1000 * w;
        for (const i of this.issrs) if (this.inIssrShape(i, box)) cost += (want ? -40 : 600) * w;
      });
      if (cost < bestCost) { bestCost = cost; best = y; }
    }
    return best;
  }

  // A tip that waits for a calm moment: flying, nothing to hit on screen. Checks every 0.5 s.
  explainWhenClear(id, html, pic = null) {
    if (this.save.seenTips.includes(id) || this.save.seenTips.includes('*')) return;
    const tryNow = () => {
      if (this.state === 'over' || this.state === 'landing') return;
      const busy = this.state !== 'playing' || this.inGrace() || this.explaining
        || this.storms.some(st => st.rects[0].x < WIDTH && st.rects[0].x + st.rects[0].width > this.plane.x - 20)
        || this.birds.length || this.turbs.length;
      if (busy) { this.time.delayedCall(500, tryNow); return; }
      this.explain(id, html, pic);
    };
    this.time.delayedCall(1200, tryNow);
  }

  onCoachTap() {
    if (this.explaining) { this.explaining = false; this.frozen = false; this.ui.hideCoach(); this.startGrace(); return true; }
    return !!(this.school && this.school.onTap());
  }

  setDropVisible(v) { this.dropBg.setVisible(v); this.dropLabel.setVisible(v); this.dropShown = v; }

  onTap(p) {
    if (this.ui.coachButton) return;   // a tip is up: only its OK button closes it
    if (this.onCoachTap()) return;     // flight school's "tap the screen" step
    const d = this.dropBox;
    if (this.dropShown && p.x >= d.x && p.x <= d.x + d.w && p.y >= d.y && p.y <= d.y + d.h) {
      this.dropParcel();
      this.tweens.add({ targets: [this.dropBg, this.dropLabel], scale: 0.9, duration: 60, yoyo: true });
      return;
    }
    // Tapping the ground strip plants a tree; anywhere else flaps.
    this.flap();
  }

  flap() {
    if (this.state !== 'playing') return;
    if (this.inTurb) {
      // Turbulence: the tap works, but a little late.
      const [a, b] = HAZARDS.turbulence.delay;
      this.time.delayedCall(this.between(a, b), () => { if (this.state === 'playing') this.applyFlap(); });
      return;
    }
    this.applyFlap();
  }

  applyFlap() {
    if (this.onAutopilot() && this.gameTime < this.autoFrom + POWERUPS.autoLockMs) return;   // the tap that grabbed it must not cancel it
    this.graceUntil = 0;   // flying again ends the breather
    if (this.onAutopilot()) { this.autoUntil = 0; this.popup(this.plane.x + 20, this.plane.y - 10, 'You have control!', '#ffe15a'); }   // ...and the autopilot pick-up
    this.plane.vy = PLANE.flapVelocity;
    this.flaps = (this.flaps || 0) + 1;
    sfx.flap();
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;   // clamp so a background tab doesn't teleport the plane
    this.updatePopups(dt);
    if (this.state === 'idle') { this.updateScenery(dt * 30); return; }
    if (this.school) this.school.update(dt);
    if (this.frozen) { this.updateRays(dt, this.gameTime, false); this.drawSky(this.gameTime); return; }
    this.gameTime += dt * 1000;
    time = this.gameTime;   // contrail ages etc. stop while frozen
    if (this.state === 'over') {
      this.updateContrails(dt, time);
      this.updateRays(dt, time, false);
      return;
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
        if (!this.school) { this.save.flights++; writeSave(this.save); }
      }
      this.holdText.setText(this.airborne ? '' : 'HOLD\nto take off!').setScale(1 + 0.08 * Math.sin(this.gameTime / 150));
      this.plane.vy = this.airborne ? TAKEOFF.climbVelocity : 0;
      this.plane.y += this.plane.vy * dt;
      if (this.airborne && this.stateTime >= TAKEOFF.seconds) {
        this.setState('playing'); this.plane.vy = 0;
        this.holdText.setText('');
        if (!this.school) { this.popup(WIDTH / 2, SKY_H / 2, 'Now TAP to fly!', '#ffe15a', 16); this.startGrace(); }
        if (!this.school) this.explainWhenClear('x-bars', 'Two bars to watch:<br><b>Left: CO2</b> your plane makes right now.<br><b>Right: the Earth</b>. Red = hotter, blue = cooler. Keep it low!', 'lesson-bars');
      }
    } else if (this.state === 'playing' && (this.inGrace() || this.onAutopilot())) {
      const auto = this.onAutopilot();
      const target = auto ? this.autopilotPlan() : this.autopilotTarget();
      const lim = auto ? POWERUPS.autoClimb : 180;
      this.plane.vy = Phaser.Math.Clamp((target - this.plane.y) * (auto ? 10 : 4), -lim, lim);
      this.plane.y += this.plane.vy * dt;
      this.planeSprite.setAlpha(1);
      const left = Math.ceil((this.autoUntil - this.gameTime) / 1000), locked = this.gameTime < (this.autoFrom || 0) + POWERUPS.autoLockMs;
      this.autoText.setText(this.onAutopilot() ? (locked ? `AUTOPILOT ${left}` : `AUTOPILOT ${left} - TAP to take control`) : 'AUTOPILOT - tap to fly!');
      this.autoText.setPosition(Math.max(this.autoText.width / 2 + 4, this.plane.x + PLANE.w / 2), Math.max(10, this.plane.y - 14)).setVisible(true);
    } else if (this.state === 'playing') {
      this.planeSprite.setAlpha(1);
      this.autoText.setVisible(false);
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
    }
    this.drawPlane();

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
      this.ui.tipOnce('forestFull', 'Forest full!', 'A forest can only soak up so much CO2 in one flight. Plant ALL 5 kinds of tree to make it hold much more!', 'good', 4.5);
    }
    for (const t of this.trees) {
      const age = this.elapsed - t.plantedAt;
      const g = this.kit.grow, stage = age < 4 * g ? 0 : age < 9 * g ? 1 : 2;   // Tree Nursery: grows faster
      if (stage !== t.stage) { t.stage = stage; if (t.sprite.active) t.sprite.setTexture(`tree-${t.art || t.kind}-${stage}`); }
      const cool = forestFull ? 0 : SPECIES[t.kind].coolPerStage[stage] * FOREST.early * (stage === 2 ? 1 + oldWood : 1) * dt;
      this.forestStored += cool;
      if (stage === 2 && t.sprite.active) t.sprite.setScale(1 + 0.15 * oldWood);   // old trees keep getting bigger
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
    this.updateScenery(dx);
    this.updateExhaust(dt, dx);
    this.updateDayNight(time);
    this.updateLightning(time);

    const box = this.hitbox();
    let inIssr = false;
    for (const i of this.issrs) {
      const inside = this.inIssrShape(i, box);
      if (inside) { inIssr = true; i.entered = true; }
      if (!i.popped) i.setAlpha(this.issrAlpha(i, box, inside));
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
      i.tilePositionY += dt * 4;
    }
    this.updateTokens(dt, box);
    this.updatePowers();
    this.updateForestMeter();
    this.updateHazards(dt, box);
    this.updateParcels(dt);
    this.drawAim();
    if (inIssr && !this.wasInIssr && this.state === 'playing') this.enterIssr();
    this.wasInIssr = inIssr;
    if (inIssr && this.state !== 'landing' && time - this.lastContrail > this.kit.contrailEvery) {
      this.lastContrail = time;
      this.addContrail(time);
    }
    this.updateContrails(dt, time);
    this.updateRays(dt, time, true);
    this.drawGapHint();

    this.hud.setCo2(this.co2Rate);
    this.hud.setHeat(this.heat, time);
    this.drawHeatFx(time);
    this.updateTexts(inIssr);

    if (this.state === 'landing') {
      if (this.stateTime >= AIRPORT.rollSeconds) this.finish({ landed: true });
      return;
    }
    if (this.state !== 'playing') return;

    if (this.school) { this.school.forgive(box); this.updateTexts(inIssr); return; }
    if (this.inGrace() || this.onAutopilot()) { this.updateTexts(inIssr); return; }   // the breather and the autopilot pick-up: nothing can crash you
    if (this.heat >= CLIMATE.dangerLine * 0.75 && !this.warnedHot) {
      this.warnedHot = true;
      if (this.explain('x-hot', 'The Earth is getting <b>too hot</b>! If the red bar on the right reaches the top, your flight is over.<br>Land soon, make <b>shade</b> in the daytime, or stay out of icy air at night.', 'lesson-hot')) return;
      this.ui.toast('Planet overheating!', this.isDay ? 'Make contrails in the sunshine, or land soon!' : 'Stay out of icy air at night, or land soon!', 'bad', 3);
    }
    if (this.heat >= CLIMATE.dangerLine) return this.finish({ reason: 'The planet got too hot!\nFlight grounded.', sound: 'overheat' });
    if (this.spriteBottom() >= SKY_H) {
      const rw = this.runwayUnder(box);
      if (rw) return this.land(rw);
      return this.finish({ reason: 'You hit the ground!' });
    }
    // Pixel-accurate: the plane's drawn pixels against the hazard's drawn pixels. Storms forgive a
    // nick (a few pixels); no-fly zones and birds forgive nothing.
    for (const s of this.storms) {
      if (this.hitsStorm(s)) {
        return this.finish({ reason: s.noFly ? 'Restricted airspace!\nFlight stopped.' : 'Storm!\nYou flew into a storm.' });
      }
    }
    if (this.hitBird(box)) return this.finish({ reason: 'Bird strike!\nYou hit a bird.' });
  }

  // 1 until CLIMATE.lateFrom km into a flight, then grows by latePer10k every 10,000 km.
  // Only NIGHTS get harder (more and bigger icy air): day shade, and saving up cooling, stay as they are.
  lateRamp() { return P.lateRamp(this); }

  // Bigger Hold: grows faster. Rounded to 1 decimal so 1 + 0.6 * n never shows as 3.4000000000000004.
  multiplier() { return Math.round((1 + this.kit.perSkip * this.airportsSkipped) * 10) / 10; }

  hitbox() { return { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h }; }

  // Hitbox y at which the sprite's wheels touch the ground.
  groundedY() { return SKY_H - PLANE.spriteH + PLANE.spriteOffY; }

  // Bottom of the drawn plane (wheels), used for ground contact.
  spriteBottom() { return this.plane.y - PLANE.spriteOffY + PLANE.spriteH; }

  drawPlane() {
    // Sprite is centred on its image; place it so the hitbox sits at spriteOff inside it.
    const cx = this.plane.x - PLANE.spriteOffX + PLANE.spriteW / 2;
    const cy = this.plane.y - PLANE.spriteOffY + PLANE.spriteH / 2;
    this.planeSprite.setPosition(Math.round(cx), Math.round(cy));
    const flying = this.state === 'playing' || this.state === 'over';
    const steep = this.onAutopilot && this.onAutopilot();   // the autopilot pick-up banks hard
    const tilt = flying ? Phaser.Math.Clamp(this.plane.vy / (steep ? 520 : 600), steep ? -0.9 : -PLANE.maxTilt, steep ? 0.9 : PLANE.maxTilt) : 0;
    this.planeSprite.setRotation(this.state === 'takeoff' && this.airborne ? -0.15 : tilt);
    this.syncPlaneParts();
  }

  // One image per owned upgrade part, plus the nature badge, lights, engine shimmer and sparkles.
  buildPlaneParts() {
    const add = (key, kind) => { const img = this.add.image(0, 0, key); this.planeParts.push({ img, kind }); return img; };
    this.planeParts = [];
    // Gadget stickers, one look per era (fleet.js STICKERS, art session). Origin at the plane's centre so
    // they turn with it: the sticker's top-left sits at (x, y) on the 62x27 plane.
    for (const st of stickers(this.save)) {
      const t = this.textures.get(st.key).getSourceImage(), img = add(st.key, st.ground ? 'gear' : 'part');
      img.setOrigin((PLANE.spriteW / 2 - st.x) / t.width, (PLANE.spriteH / 2 - st.y) / t.height);
    }
    const badge = natureBadge(natureLevels(this.save));
    if (badge) add(`plane-nature-${badge}`, 'part');
    add('plane-lights', 'lights');
    add('plane-shimmer-0', 'shimmer').setAlpha(0.8);
    add('plane-sparkle-0', 'sparkle').setVisible(false);
    this.sparkleAt = this.save.sparkle ? -1 : null;   // bought something: sparkle on take-off
  }

  syncPlaneParts() {
    const sp = this.planeSprite, t = this.gameTime || 0;
    const grounded = (this.state === 'takeoff' && !this.airborne) || this.state === 'landing' || this.flaring;   // real gear is up in flight
    const running = this.state !== 'over' && (this.co2Rate || 0) > 0;
    if (this.sparkleAt === -1 && this.airborne) { this.sparkleAt = t; this.save.sparkle = false; }
    for (const o of this.planeParts) {
      const img = o.img;
      img.setPosition(sp.x, sp.y).setRotation(sp.rotation).setFlipX(sp.flipX);
      if (o.kind === 'gear') img.setVisible(grounded && sp.visible);
      else if (o.kind === 'lights') { const c = t % 1200; img.setVisible(sp.visible && (c < 120 || (c > 240 && c < 360))); }   // double blink
      else if (o.kind === 'shimmer') { img.setVisible(running && sp.visible); img.setTexture(`plane-shimmer-${Math.floor(t / 90) % 3}`); }
      else if (o.kind === 'sparkle') { const f = this.sparkleAt === null || this.sparkleAt < 0 ? -1 : Math.floor((t - this.sparkleAt) / 70);
        img.setVisible(f >= 0 && f < 4); if (f >= 0 && f < 4) img.setTexture(`plane-sparkle-${f}`); }
      else img.setVisible(sp.visible);
      if (o.kind !== 'shimmer') img.setAlpha(sp.alpha);
    }
  }

  // ---------- scenery ----------

  // Background life from the Biodiversity meter (see wildlifeScene in nature.js). Purely for looks:
  // nothing here can be hit. Filled across the screen at the start so the first view shows it too.
  // A species shown on screen counts as FOUND (the Wild Area collection, src/wild.js). Only in a
  // real flight, once it is well on screen; the first time: a pop-up.
  seen(sprite) {
    if (this.school || this.state !== 'playing') return;
    const w = (this.wildlife && this.wildlife.who && this.wildlife.who[sprite]) || WILDLIFE.find(x => x.sprite === sprite);   // who it is HERE
    if (!w) return;
    this.save.found = this.save.found || {};
    if (this.save.found[w.id]) return;
    this.save.found[w.id] = Date.now();
    this.foundThisFlight = (this.foundThisFlight || 0) + 1;
    (this.foundIds = this.foundIds || []).push(w.id);   // for the results screen (art session: 'NEW ANIMALS')
    this.time.delayedCall(1500, () => this.popup(WIDTH / 2, SKY_H - 60, `NEW ANIMAL: ${w.name.toUpperCase()}!`, '#ffe15a', 14));
  }

  // Only on a device that opened ?pixelart=on: load time and frames per second, top right, to see if the art costs anything.
  previewReadout() {
    const el = document.getElementById('previewHud') || Object.assign(document.body.appendChild(document.createElement('div')),
      { id: 'previewHud' });
    el.style.cssText = 'position:fixed;top:2px;right:2px;z-index:50;font:9px monospace;background:rgba(0,0,0,.55);color:#8dffb0;padding:2px 4px;pointer-events:none';
    const loaded = Math.round(performance.now());
    if (this.previewTimer) this.previewTimer.remove();
    this.previewTimer = this.time.addEvent({ delay: 500, loop: true, callback: () => {
      el.textContent = `PIXEL ART PREVIEW  load ${(loaded / 1000).toFixed(1)} s  ${Math.round(this.game.loop.actualFps)} fps`; } });
  }

  // Queue the drawings (animals, birds, trees) of these lands; returns how many were queued.
  queueArt(regions) {
    let n = 0;
    for (const w of WILDLIFE) if (w.sprite && regions.includes(w.region)) for (let f = 0; f < (w.frames || 2); f++) {
      const k = `${w.sprite}-${f}`;
      const dir = animalDir(w.sprite);   // PixelLab art when it has one (src/animalart.js)
      if (!this.textures.exists(k)) { this.load.image(k, `${dir}/${k}.png`); n++; }
    }
    return n;
  }
  // After the scene is built: fetch, in the background, the drawings for every land on this flight's path
  // (a species also drawn for another land is in WILDLIFE once, under its own region, so check both).
  loadPathArt() {
    const lands = [...new Set(this.path.map(n => (city(n) || {}).region).filter(Boolean))];
    const extra = [...new Set(lands.flatMap(r => regionSpecies(r).map(w => (WILDLIFE.find(x => x.sprite === w.sprite) || {}).region).filter(Boolean)))];
    if (this.queueArt([...lands, ...extra])) {
      this.load.once('complete', () => { if (this.regionNow) this.wildlife = wildlifeScene(this.save, this.regionNow); });
      this.load.start();
    }
  }

  // ---------- the region below (the user, 2026-10-22: real geography decides it; src/geo.js) ----------
  // The leg from the airport behind to the one ahead; how far along it the plane is, as a fraction.
  regionHere() {
    if (this.school || !this.nextAirport || this.nextAirport.worldX > 1e8) return 'woodland';
    const i = this.airportIndex, len = this.legKm(i), from = this.nextAirport.worldX - len;
    return regionBelow(city(this.path[i]), city(this.path[i + 1]), (this.distancePx - from) / len);
  }

  // A new region below: its ground and hills fade in, its animals take over, and the first time a
  // region is ever flown over it is DISCOVERED (its NATURE tab opens).
  setRegion(r, instant = false) {
    if (r === this.regionNow) return;
    this.regionNow = r;
    const terrain = REGIONS[r];   // every region has strips since 0.10.7 (ocean and ice too: tools/art/make_regions.py); a missing one keeps the last land's
    // (A tileSprite's texture.key is an internal copy, so the strip keys shown are kept in this.terrain.)
    if (terrain && instant) { this.ground.setTexture(terrain.ground); this.hills.setTexture(terrain.hills); this.terrain = { ...terrain }; }
    else if (terrain && (!this.terrain || this.terrain.ground !== terrain.ground)) {
      if (this.terrainTween) this.terrainTween.complete();
      this.ground2.setTexture(terrain.ground).setAlpha(0); this.hills2.setTexture(terrain.hills).setAlpha(0);
      this.fading = { ...terrain };
      this.terrainTween = this.tweens.add({ targets: [this.ground2, this.hills2], alpha: 1, duration: 1500, onComplete: () => {
        this.ground.setTexture(this.fading.ground); this.hills.setTexture(this.fading.hills); this.terrain = this.fading;
        this.ground2.setAlpha(0); this.hills2.setAlpha(0); this.terrainTween = null; this.fading = null; } });
    }
    this.regionBanner(r);
    if (this.flowers) this.flowers.setVisible(r === 'woodland');
    if (this.hedge) this.hedge.setVisible(r === 'woodland');
    if (this.life) this.wildlife = wildlifeScene(this.save, r);   // (at the start, buildWildlife makes it)
    // Discovered only by really flying into it: not when the scene is built (that would change the save on
    // every page load, and a reopened device would then keep its own save over a newer online one).
    if (instant || this.school || this.state !== 'playing' || r === 'woodland' || !REGION_DATA[r]) return;
    this.save.discovered = this.save.discovered || {};
    if (this.save.discovered[r]) return;
    this.save.discovered[r] = Date.now();
    this.popup(WIDTH / 2, SKY_H - 80, `YOU DISCOVERED:\n${REGION_NAMES[r].toUpperCase()}!`, '#8dffb0', 12);
  }

  // Entering a land (0.11.1: each land has its own biodiversity, and players could not tell): its name
  // and meter for 2.5 s at the top of the sky. Over a bare land, once per device, how to bring it to life.
  regionBanner(r) {
    if (this.school || !REGION_NAMES[r]) return;
    const bio = biodiversity(this.save, r);
    if (this.banner) this.banner.destroy();
    const W = 220, x = WIDTH / 2, y = 90;   // under the distance and next-airport lines
    const bg = this.add.rectangle(0, 0, W, 38, 0x1b2838, 0.82).setStrokeStyle(1, 0xffe15a);
    const name = this.fitText(this.add.text(0, -12, REGION_NAMES[r].toUpperCase(), { fontFamily: FONT, fontSize: '8px', color: '#ffe15a' }).setOrigin(0.5), W - 12);
    const sub = this.add.text(0, 0, `BIODIVERSITY ${bio}`, { fontFamily: FONT, fontSize: '7px', color: '#ffe15a' }).setOrigin(0.5);
    const track = this.add.rectangle(-W / 2 + 8, 12, W - 16, 4, 0x2b4a6f).setOrigin(0, 0.5);
    const fill = this.add.rectangle(-W / 2 + 8, 12, Math.max(1, (W - 16) * bio / 100), 4, 0x8dffb0).setOrigin(0, 0.5);
    this.banner = this.add.container(x, y, [bg, name, sub, track, fill]).setDepth(60).setAlpha(0);
    this.banner.regionId = r; this.banner.bio = bio;
    this.tweens.add({ targets: this.banner, alpha: 1, duration: 250, yoyo: true, hold: 2500, onComplete: () => { if (this.banner) { this.banner.destroy(); this.banner = null; } } });
    if (bio === 0 && this.state === 'playing') this.ui.tipOnce('bareLand', `${REGION_NAMES[r]}: bare land`,
      'Each land has its own <b>biodiversity</b> (the bar at the top). Plant this land\'s trees as you fly over it, and finish its projects in NATURE: more trees and animals will appear below you.', 'good', 5);
  }

  buildWildlife() {
    this.wildlife = wildlifeScene(this.save, this.regionNow || 'woodland');
    this.life = [];
    this.lifeNext = { tree: 0, farm: 0, wild: 0, bird: 0 };
    for (let x = 0; x < WIDTH + 10; x += 4) this.updateWildlife(4, x);
  }

  updateWildlife(dx, atX = WIDTH + 12) {
    const W = this.wildlife, pick = a => a[Math.floor(Math.random() * a.length)];
    const gap = perScreen => WIDTH / perScreen * Phaser.Math.FloatBetween(0.5, 1.5);
    const clearOfRunway = x => !this.runways || !this.runways.some(r => r.strip.x < x + 20 && r.strip.x + AIRPORT.runwayLen > x - 20);
    const due = (k, perScreen) => {
      if (!perScreen) return false;
      this.lifeNext[k] -= dx;
      if (this.lifeNext[k] > 0) return false;
      this.lifeNext[k] = gap(perScreen);
      return true;
    };
    if (due('tree', W.treesPerScreen)) {
      const tk = pick(W.treeKinds);
      if (this.textures.exists(`tree-${tk}-2`)) {   // (a land's trees may still be loading)
        const t = this.add.image(atX, SKY_H + 1, `tree-${tk}-2`).setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.9, 1.1));
        this.farTreeLayer.add(t); this.life.push({ img: t, k: 1 });
      }
    }
    // `sprite`: texture prefix from src/wildlife.js ('animal-otter', 'sky-heron' for a standing bird).
    const animal = sprite => {
      if (!clearOfRunway(atX)) return;
      const left = Math.random() < 0.5, standing = sprite.startsWith('sky-');
      const img = this.add.image(atX, SKY_H + 4, `${sprite}-0`).setOrigin(0.5, 1).setFlipX(left);
      this.wildLayer.add(img);
      this.life.push({ img, k: 1, kind: sprite, walk: standing ? 0 : (left ? -1 : 1) * Phaser.Math.FloatBetween(0, 3), t: Math.random() });
      this.seen(sprite);
    };
    if (due('farm', W.farmPerScreen)) animal(pick(['animal-cow', 'animal-sheep']));
    if (due('wild', W.wildPerScreen)) { const k = W.pickWild(this.distancePx); if (k && this.textures.exists(`${k}-0`)) animal(k); }   // (still loading: not yet)   // rarer ones only far into a flight
    const b = due('bird', W.birdsPerScreen) && W.pickSky(this.distancePx);   // null: no bird this far in
    if (b && this.textures.exists(`${b}-0`)) {
      // Scenery birds fly LOW, just over the hills, small and faded: background life, never mistaken
      // for a bird-strike flock (2026-10-22). Half size = their original small sprite size.
      const img = this.add.image(atX, Phaser.Math.Between(SKY_H - 62, SKY_H - 34), `${b}-0`).setOrigin(0.5).setScale(0.5).setAlpha(0.6);
      this.storkLayer.add(img);
      this.life.push({ img, k: 0.35, kind: b, walk: Phaser.Math.FloatBetween(4, 10), t: Math.random(), bob: Math.random() * 6, y0: img.y });
      this.seen(b);
    }
    const dt = this.game.loop.delta / 1000 || 0.016;
    for (const l of this.life) {
      l.img.x -= dx * l.k - (l.walk || 0) * dt;
      if (l.kind) {
        l.t += dt;
        l.img.setTexture(`${l.kind}-${Math.floor(l.t * (l.y0 ? 4 : 2)) % 2}`);
        if (l.y0) l.img.y = l.y0 + Math.sin(l.t * 2 + l.bob) * 3;
      }
    }
    this.life = this.life.filter(l => { if (l.img.x < -30) { l.img.destroy(); return false; } return true; });
  }

  // Exhaust behind the engines: grey puffs as dark as the plane's CO2, white wisps for the water
  // vapour (hydrogen makes lots). Not to scale: real exhaust is near-invisible. Contrails are separate.
  updateExhaust(dt, dx) {
    const flying = (this.state === 'takeoff' && this.rollSpeed > 5) || this.state === 'playing' || (this.state === 'landing' && this.speed > 20);
    this.nextPuff -= dt;
    if (flying && this.nextPuff <= 0) {
      this.nextPuff = 0.03;
      const x = this.plane.x - 2, y = this.plane.y + PLANE.h / 2 + Phaser.Math.Between(-1, 1);
      const add = (tint, alpha) => {
        if (alpha <= 0.01) return;
        const img = this.add.image(x, y, 'puff').setTint(tint).setAlpha(alpha).setScale(0.6);
        this.exhaustLayer.add(img);
        this.puffs.push({ img, a0: alpha, t: 0 });
      };
      add(0x5a5a5a, 0.6 * this.kit.smoke);
      add(0xffffff, 0.12 * this.kit.vapour);
    }
    for (const p of this.puffs) {
      p.t += dt;
      const f = p.t / 0.9;
      p.img.x -= dx * 0.9;
      p.img.y -= 8 * dt;   // warm exhaust rises
      p.img.setScale(0.6 + 1.4 * f).setAlpha(p.a0 * (1 - f));
    }
    this.puffs = this.puffs.filter(p => { if (p.t >= 0.9) { p.img.destroy(); return false; } return true; });
  }

  updateScenery(dx) {
    this.cloudsFar.tilePositionX += dx * 0.15;
    this.hills.tilePositionX += dx * 0.3; this.hills2.tilePositionX = this.hills.tilePositionX;
    this.city.tilePositionX += dx * 0.55;
    this.landmarks = this.landmarks.filter(l => { l.x -= dx * 0.55; if (l.x + l.width < -10) { l.destroy(); return false; } return true; });
    this.ground.tilePositionX += dx; this.ground2.tilePositionX = this.ground.tilePositionX;
    if (dx > 0) this.setRegion(this.regionHere());
    if (this.hedge) this.hedge.tilePositionX += dx;
    if (this.flowers) this.flowers.tilePositionX += dx;
    // Ponds (with a beaver dam once beavers are back) and storks gliding far away.
    const uk = this.regionNow === 'woodland';   // UK projects show over the UK only
    if (this.distancePx >= this.nextDecorAt && uk && hasProject(this.save, 'pond') && dx > 0) {
      const x = WIDTH + 10;
      if (!this.runways.some(r => r.strip.x < x + 40 && r.strip.x + AIRPORT.runwayLen > x - 10)) {
        const parts = [this.add.image(x, SKY_H + 12, 'pond').setOrigin(0)];
        if (hasProject(this.save, 'beavers')) parts.push(this.add.image(x + 20, SKY_H + 10, 'dam').setOrigin(0));
        this.decorLayer.add(parts);
        this.decor.push(...parts);
      }
      this.nextDecorAt += Phaser.Math.Between(500, 900);
    }
    for (const d of this.decor) d.x -= dx;
    this.decor = this.decor.filter(d => { if (d.x < -40) { d.destroy(); return false; } return true; });
    if (uk && hasProject(this.save, 'storks') && dx > 0 && Math.random() < 0.002 && this.storks.length < 2) {
      const st = this.add.image(WIDTH + 10, Phaser.Math.Between(80, 160), 'stork').setOrigin(0).setAlpha(0.8);
      this.storkLayer.add(st);
      this.storks.push(st);
    }
    this.updateWildlife(dx);
    for (const st of this.storks) st.x -= dx * 0.25 + 0.3;
    this.storks = this.storks.filter(st => { if (st.x < -20) { st.destroy(); return false; } return true; });
  }

  nightAmount() {
    const { isDay, toOther } = this.dayNightPhase();
    return isDay ? toOther : 1 - toOther;
  }

  drawSky(time) {
    const n = this.nightAmount();
    const g = this.skyGfx;
    g.clear();
    // Stars twinkle in as night falls.
    if (n > 0) for (const s of this.stars) {
      g.fillStyle(0xffffff, n * (0.5 + 0.5 * Math.sin(time / 400 + s.tw))).fillRect(s.x, s.y, 1, 1);
    }
    // Sun by day, moon by night, each arcing across the top of the sky.
    const { daySeconds: D, nightSeconds: N } = DAYNIGHT;
    const p = this.clock % (D + N);
    const isDay = p < D;
    const f = isDay ? p / D : (p - D) / N;
    const { toOther } = this.dayNightPhase();
    // Sunset / sunrise: a glow in bands up from the horizon, strongest mid-twilight, so the change
    // can be seen coming (2026-10-22: with a 3 s blend players could not tell day from night).
    const glow = Math.sin(Math.min(1, toOther) * Math.PI);
    if (glow > 0) {
      const bands = 8, top = SKY_H * 0.35, bh = (SKY_H - top) / bands;
      for (let i = 0; i < bands; i++) {
        const k = (i + 1) / bands;                                  // 0 high .. 1 at the horizon
        g.fillStyle(lerpColour(DAYNIGHT.glowHigh, DAYNIGHT.glowLow, k), glow * 0.55 * k).fillRect(0, Math.round(top + i * bh), WIDTH, Math.ceil(bh));
      }
    }
    // The sun and moon swap places in the twilight (2026-10-23: the sun used to stop high in the sky
    // and the moon popped in): at dusk the sun sinks behind the hills as the moon rises where it
    // will start its arc; at dawn the moon sets as the sun rises. The twilight ends with the new body
    // at the start of its arc, so nothing jumps.
    const DROP = SKY_H - 46 + 12 - 70;                        // from the top of the arc to behind the hills
    const ease = k => k * k * (3 - 2 * k);
    const arc = fr => ({ x: Math.round(30 + fr * (WIDTH - 60)), y: 70 - Math.sin(fr * Math.PI) * 30 });
    const drawSun = (pt, drop, orange) => {
      const sun = lerpColour(COLOURS.sun, DAYNIGHT.sunSet, orange), x = pt.x, y = Math.round(pt.y + drop);
      g.fillStyle(sun, 0.35).fillRect(x - 9, y - 7, 18, 14).fillRect(x - 7, y - 9, 14, 18);
      g.fillStyle(sun).fillRect(x - 6, y - 5, 12, 10).fillRect(x - 5, y - 6, 10, 12);
    };
    const drawMoon = (pt, drop) => {
      const x = pt.x, y = Math.round(pt.y + drop);
      g.fillStyle(0xf4f1e8, 0.25).fillRect(x - 8, y - 6, 16, 12).fillRect(x - 6, y - 8, 12, 16);
      g.fillStyle(0xf4f1e8).fillRect(x - 5, y - 4, 10, 8).fillRect(x - 4, y - 5, 8, 10);
      g.fillStyle(0xc9c4b4).fillRect(x - 2, y - 2, 2, 2).fillRect(x + 2, y + 1, 2, 2).fillRect(x - 3, y + 2, 1, 1);  // craters
    };
    const gone = ease(toOther) * DROP, rising = (1 - ease(toOther)) * DROP;
    if (isDay) {
      drawSun(arc(f), gone, toOther);
      if (toOther > 0) drawMoon(arc(0), rising);
    } else {
      drawMoon(arc(f), gone);
      if (toOther > 0) drawSun(arc(0), rising, 1 - toOther);
    }
    this.drawDayDial(p / (D + N));
    const tint = lerpColour(lerpColour(0xffffff, 0x4a5a80, n), 0xff7a5a, (this.heatLevel ? this.heatLevel() : 0) * 0.7);
    this.hills.setTint(tint); this.hills2.setTint(tint);
    this.city.setTint(tint);
    for (const l of this.landmarks) l.setTint(tint);
    this.ground.setTint(tint); this.ground2.setTint(tint);
    this.cloudsFar.setAlpha(0.55 - 0.35 * n);
  }

  updateForestMeter() {
    if (!this.meterTrees.length) return;
    const fill = this.forestStored / FOREST.store * 10, cap = this.forestStore() / FOREST.store * 10;
    this.meterTrees.forEach((im, i) => {
      const k = Phaser.Math.Clamp(fill - i, 0, 1);
      im.setTexture(`meter-tree-${k <= 0.02 ? 0 : k < 0.34 ? 1 : k < 0.67 ? 2 : 3}`).setAlpha(i < Math.ceil(cap - 0.001) ? 1 : 0.3);
    });
    this.forestFull = this.trees.length > 0 && this.forestStored >= this.forestStore();   // named in parcelText
  }

  // Day / night dial under the distance: one whole cycle as a strip (day, sunset, night, sunrise)
  // with a marker for now, so you can see night coming.
  drawDayDial(t) {
    const g = this.dialGfx;
    if (!g) return;
    g.clear();
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT, T = D + N;
    const w = 60, h = 5, x0 = Math.round(WIDTH / 2 - w / 2), y0 = 36;
    const seg = (a, b, c) => g.fillStyle(c).fillRect(x0 + Math.round(a / T * w), y0, Math.round((b - a) / T * w), h);
    g.fillStyle(0x000000, 0.6).fillRect(x0 - 1, y0 - 1, w + 2, h + 2);
    seg(0, D - B, COLOURS.sun); seg(D - B, D, DAYNIGHT.glowLow); seg(D, T - B, 0x3a4680); seg(T - B, T, DAYNIGHT.glowHigh);
    const mx = x0 + Math.round(t * w);
    g.fillStyle(0xffffff).fillRect(mx - 1, y0 - 3, 2, h + 6);
    g.fillStyle(0x000000).fillRect(mx - 2, y0 - 3, 1, h + 6).fillRect(mx + 1, y0 - 3, 1, h + 6);
  }

  // ---------- airports ----------

  addRunway(worldX, name) {
    const x = PLANE.x + worldX - this.distancePx;
    const strip = this.add.tileSprite(x, SKY_H, AIRPORT.runwayLen, 6, 'runway').setOrigin(0);   // centre dash every 20 px
    const parts = [strip];
    // Control tower at the far end.
    // The tower shows your Air traffic control level; a weather station your Forecasting era (art session).
    const sys = fleetOf(this.save).systems, atc = sys.atc || 0, fc = sys.forecast || 0;
    parts.push(this.add.image(x + AIRPORT.runwayLen - 17, SKY_H, atc ? `tower-${Math.min(6, atc)}` : 'tower').setOrigin(0, 1));
    if (fc) parts.push(this.add.image(x + AIRPORT.runwayLen - 36, SKY_H, `station-${['1950s', '1970s', '1990s'][Math.min(2, levelEra(fc))]}`).setOrigin(0, 1));
    parts.push(this.add.text(x + AIRPORT.runwayLen / 2, SKY_H + 8, name,
      { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0));
    this.runwayLayer.add(parts);
    this.runways.push({ worldX, name, parts, strip });
    // The city's landmark, in the skyline (it scrolls at 0.55 x the ground): start it where it will
    // stand just behind the runway's middle as the runway passes the middle of the screen.
    const lm = LANDMARKS[name];
    if (lm && this.textures.exists(lm.key)) {
      const d = x + AIRPORT.runwayLen / 2 - WIDTH / 2;
      // PixelLab skylines (the user, 2026-10-24): big, a little hazy and set back behind the city row, so they
      // read as far away, not as something in the way.
      const img = this.add.image(WIDTH / 2 + 24 + 0.55 * d, SKY_H - LANDMARK_BACK, lm.key).setOrigin(0.5, 1).setScale(LANDMARK_SCALE).setAlpha(LANDMARK_HAZE);
      this.landmarkLayer.add(img); this.landmarks.push(img);
    }
  }

  runwayUnder(box) {
    return this.runways.find(r => r.strip.x <= box.x && box.x + box.w <= r.strip.x + AIRPORT.runwayLen && r.name !== this.homeName);
  }

  // The k-th airport ahead of the start city (0 = the next one), at worldX `from` + that leg.
  airportAhead(k, from = 0) {
    return { worldX: from + this.legKm(k), name: this.path[k + 1], spawned: false };
  }
  // Game km of leg k of this flight's path (balanced, src/network.js).
  legKm(k) { return legBetween(this.path[k], this.path[k + 1]); }

  inStormClearZone(worldX) { return P.inStormClearZone(this, worldX); }

  land(rw) {
    this.landedAt = rw.name;
    this.landingSpeed = this.speed;
    this.plane.y = this.groundedY();
    this.plane.vy = 0;
    this.setState('landing');
    this.drawPlane();
    sfx.land();
    this.burst(this.plane.x + 10, SKY_H - 2, 0xd8d4c8, 10);
    this.popup(this.plane.x + 25, SKY_H - 40, 'TOUCHDOWN!', '#ffe15a', 16);
  }

  // ---------- trees ----------

  // Old-wood boost for grown trees: 0 before FOREST.from km, rising to FOREST.boost, scaled by
  // how many kinds of tree were planted this flight (all 5 = the full boost).
  oldWood() { return P.oldWood(this); }
  // A forest can only soak up so much CO2 in one flight (more with more kinds); then it is full.
  forestStore() { return P.forestStore(this); }

  // Parcels take turns through the kinds of tree you own, so variety comes naturally.
  treeKind() {
    const list = this.kit.tree ? this.kit.tree.species : ['spruce'];
    return list[this.speciesIdx % list.length];
  }

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
  }

  dropParcel() {
    if (this.state !== 'playing' || !this.kit.tree || this.frozen) return;
    if (this.parcels <= 0) { sfx.nope(); return; }
    // Over the open sea and the ice nothing can be planted (user, 2026-10-24): keep the parcel.
    if (['ocean', 'ice'].includes(this.regionNow)) {
      sfx.nope();
      if (!this.saidNoSoil) { this.saidNoSoil = true; this.popup(this.plane.x + 20, this.plane.y - 12, this.regionNow === 'ocean' ? 'No land to plant on!' : 'Nothing grows on the ice!', '#cfe6ff'); }
      return;
    }
    this.parcels--;
    const crate = this.add.image(0, 0, 'crate');
    const chute = this.add.image(0, -8, 'chute').setVisible(false);
    const box = this.add.container(this.plane.x + PLANE.w / 2, this.plane.y + PLANE.h, [chute, crate]);
    this.fxLayer.add(box);
    this.parcelsFalling.push({ box, chute, t: 0, vy: 0, kind: this.treeKind() });
    this.speciesIdx++;
    sfx.flap();
    this.ui.tipOnce('firstDrop', 'Parcel away!', 'It floats down AND forwards. Drop it before the brown soil to plant a tree!', 'good', 3.5);
  }

  updateParcels(dt) {
    this.parcelsFalling = this.parcelsFalling.filter(p => {
      p.t += dt;
      p.vy = p.t < PARCEL.chuteAfter ? p.vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, p.vy + PARCEL.gravity * dt);
      if (p.t >= PARCEL.chuteAfter) p.chute.setVisible(true);
      p.box.x += -this.speed * (1 - Math.exp(-p.t / PARCEL.dragTime)) * dt;
      p.box.y += p.vy * dt;
      p.box.rotation = Math.sin(p.t * 6) * 0.15;   // swing under the parachute
      if (p.box.y < SKY_H) return true;
      this.parcelLanded(p.box.x, p.kind);
      p.box.destroy();
      return false;
    });
  }

  parcelLanded(x, kind) {
    const plot = this.plots.find(pl => !pl.used && x >= pl.x - 3 && x <= pl.x + this.kit.plotW + 3);
    if (!plot) {
      this.burst(x, SKY_H, 0xc8a165, 6);
      const onRunway = this.runways.some(r => x >= r.strip.x && x <= r.strip.x + AIRPORT.runwayLen);
      if (onRunway) this.parcelOnRunway = true;   // a funny challenge
      this.popup(x, SKY_H - 14, onRunway ? 'on the runway!' : 'missed!', '#ff8080');
      sfx.nope();
      return;
    }
    plot.used = true;
    const cx = plot.x + this.kit.plotW / 2;
    // The tree for this slot in the land below (the user, 2026-10-22); its picture if drawn, else the UK one.
    const here = localTree(kind, this.regionNow || 'woodland'), art = this.textures.exists(`tree-${here.id}-0`) ? here.id : kind;
    const sprite = this.add.image(cx, SKY_H + 1, `tree-${art}-0`).setOrigin(0.5, 1).setScale(0.2);
    this.treeLayer.add(sprite);
    this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.easeOut' });
    plot.parts.push(sprite);
    this.trees.push({ sprite, kind, art, plantedAt: this.elapsed, stage: 0 });   // kind: growth and cooling (UK slot)
    this.planted++;
    this.speciesPlanted.add(kind);
    this.burst(cx, SKY_H - 2, 0x8dffb0, 12);
    this.burst(cx, SKY_H - 2, 0xffe15a, 6);
    // Biodiversity: a new kind of tree is a big boost; the same kind again adds less.
    // Counted where it grows: UK trees in save.planted, other regions' in save.plantedIn[region].
    const book = here.uk ? this.save.planted : ((this.save.plantedIn = this.save.plantedIn || {})[this.regionNow] = (this.save.plantedIn[this.regionNow] || {}));
    const first = !(book[here.id] > 0);
    book[here.id] = (book[here.id] || 0) + 1;
    this.popup(cx, SKY_H - 24, `${here.name.toUpperCase()} PLANTED!`, '#8dffb0', 8);
    if (first) this.time.delayedCall(450, () => this.popup(cx, SKY_H - 36, 'BIODIVERSITY UP! (new kind)', '#ffe15a'));   // the same kind again adds almost nothing: say nothing
    sfx.plant();
    buzz(30);
    // Tree school, steps 2 and 3 (step 1 is the first soil patch): what a tree does for the
    // climate, then Biodiversity. A new native kind's fact waits until both are done.
    const taught = this.explain('tree-2', '<b>TREE SCHOOL</b><br>Your tree takes <b>CO2</b> out of the air as it grows. Bigger trees take a bit more.<br>But trees are slow! A <b>cleaner plane</b> and <b>smart contrails</b> help the Earth much more.', 'lesson-tree-co2');
    if (taught) this.explainWhenClear('tree-3', '<b>TREE SCHOOL</b><br>Your <b>Biodiversity</b> meter shows how full of life your land is.<br><b>Different kinds</b> of trees bring much more wildlife than lots of the same kind. Fill it up!', 'lesson-biodiversity');
    else if (first && here.native) this.explain(`x-species-${here.id}`, `<b>${here.name}!</b> ${here.fact}<br>New kinds of tree fill your <b>Biodiversity</b> meter the most.`,
      animalPortrait(WILDLIFE.find(w => w.kind === 'tree' && w.id === here.id) || {}) || null);   // the tree's picture, as on its NATURE card (user, 0.11.1)
  }

  addPlot(x) {
    const W = this.kit.plotW;
    // A raised mound of dark soil with furrows, a little sign, and a marker that bobs above it.
    // Built from tileable pieces so any width works (W = 8 + 8n): sunlit left slope, soil, shaded right.
    const parts = [this.add.image(x, SKY_H - 3, 'plot-left').setOrigin(0),
      this.add.tileSprite(x + 4, SKY_H - 3, W - 8, 9, 'plot-mid').setOrigin(0),
      this.add.image(x + W - 4, SKY_H - 3, 'plot-right').setOrigin(0)];
    parts.push(this.add.image(x + W - 3, SKY_H - 3, 'plot-sign').setOrigin(0.5, 1));
    const marker = this.add.image(x + W / 2, SKY_H - 18, 'plot-arrow').setOrigin(0.5);
    parts.push(marker);
    this.plotLayer.add(parts);
    this.plots.push({ x, parts, marker, used: false });
    if (this.parcels > 0) this.time.delayedCall(900, () => this.explain('tree-1', '<b>TREE SCHOOL</b><br><b>Brown soil</b> = a place to plant a tree!<br>Press <b>DROP</b> a little <b>before</b> you reach it: parcels float down AND forwards. The X shows where it will land.', 'lesson-plot'));
  }

  drawAim() {
    const g = this.aimGfx;
    g.clear();
    if (!this.kit.tree || this.parcels <= 0 || this.state !== 'playing') return;
    const x = Math.round(this.predictLanding());
    const onPlot = this.plots.some(pl => !pl.used && x >= pl.x - 3 && x <= pl.x + this.kit.plotW + 3);
    g.fillStyle(0x000000, 0.6);
    for (let i = -5; i <= 5; i++) { g.fillRect(x + i - 1, SKY_H - 6 + i, 3, 2); g.fillRect(x + i - 1, SKY_H - 6 - i, 3, 2); }
    g.fillStyle(onPlot ? 0x8dffb0 : 0xffffff, 1);
    for (let i = -5; i <= 5; i++) { g.fillRect(x + i, SKY_H - 6 + i, 1, 1); g.fillRect(x + i, SKY_H - 6 - i, 1, 1); }
  }

  // ---------- spawning and scrolling ----------

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
      this.explain('x-multiplier', `You flew past ${na.name}! That is fine: the next airport is ${km(this.legKm(this.airportIndex))} ahead.<br>Your <b>landing bonus</b> is now <b>x1.5</b> (top left). Each airport you pass makes it bigger. But crash, and you lose ALL your seeds!`, 'lesson-bonus');
      this.nextAirport = this.airportAhead(this.airportIndex, na.worldX);
      this.missedSign = { text: `Passed ${na.name}. Next: ${this.nextAirport.name}`, until: this.gameTime + 4000 };
    }
    const toAirport = this.nextAirport.worldX - this.distancePx;
    if (this.school) return;   // flight school places everything itself
    if (toAirport < 400 && toAirport > 0 && !this.school) this.ui.tipOnce('airport', 'Airport ahead!', 'Get low as you reach the grey runway: the plane lands itself. Or fly on for more seeds!', 'good', 3.5);

    if (this.kit.tree && this.parcels > 0 && this.distancePx >= this.nextPlotAt) {   // no parcels left: no more soil
      const x = WIDTH + 10;
      const onRunway = this.runways.some(r => x + this.kit.plotW > r.strip.x - 10 && x < r.strip.x + AIRPORT.runwayLen + 10)
        || this.nextAirport.worldX - this.distancePx < WIDTH - PLANE.x + 40 && this.nextAirport.worldX + AIRPORT.runwayLen - this.distancePx > WIDTH - PLANE.x - this.kit.plotW - 40;
      if (!onRunway && REGION_DATA[this.regionNow || 'woodland']) this.addPlot(x);   // no soil over the sea or the ice
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
        this.newHazard('turbulence', 'NEW HAZARD: TURBULENCE', 'Wavy lines = bumpy air! Inside it your plane gets pushed about and your taps work a little late. Fly over or under it!');
      }
      this.nextTurbAt += T.every;
    }
    const B = HAZARDS.birds;
    if (this.distancePx >= this.nextBirdsAt) {
      if (this.rand() < B.chance * this.kit.gapBirds) this.addFlock();   // ATC bird advisories: fewer flocks
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
      const pathY = () => Phaser.Math.Clamp(this.plane.y + this.between(-50, 50), 60, SKY_H - 90);
      const firstSaf = !this.safOffered && this.distancePx >= POWERUPS.safFirstAt;
      // 0.10.2: no SAF cans before SAF exists in your era (it returns in the 2010s, PLANE-DESIGN.md section 3).
      if (!this.school && this.kit.safCans && safHelps && (firstSaf || r < POWERUPS.safChance)) {
        this.safOffered = true;
        this.addPower('saf', WIDTH + 10, pathY());
        this.ui.tipOnce('safAhead', 'SAF ahead!', 'Grab the green fuel can: cleaner fuel for a while.', 'good', 3);
      }
      else if (!this.school && this.kit.autoChance && r > 1 - this.kit.autoChance) this.addPower('auto');   // 0.10.2: only once the Autopilot gadget is bought
    }
  }

  // A pick-up (POWERUPS): rides with the seeds, so it is collected in updateTokens.
  addPower(power, x = WIDTH + 10, y = this.between(60, SKY_H - 90)) {
    const img = this.add.image(x, y, `power-${power}`).setOrigin(0);
    this.fxLayer.add(img);
    this.tokens.push({ img, baseY: y, phase: this.rand() * 6, value: 0, power });
  }

  usePower(power, tx, ty) {
    const P = POWERUPS;
    if (power === 'saf') {
      // Swap to All-SAF numbers for a while, then back to your own fuel (this.ownKit).
      if (!this.ownKit) this.ownKit = this.kit;
      const own = this.ownKit, saf = FUELS.saf100, f = saf.co2 / FUELS[own.fuelId].co2;
      this.kit = { ...own, co2Cruise: own.co2Cruise * f, co2Takeoff: own.co2Takeoff * f, smoke: own.smoke * f,
        vapour: saf.water, contrailEvery: saf.contrailEvery, contrailLife: saf.contrailLife };
      this.safUntil = this.gameTime + P.safSeconds * 1000;
      this.popup(tx, ty - 8, 'SAF! Cleaner fuel', '#8dffb0');
      this.ui.tipOnce('powerSaf', 'SAF: cleaner fuel!', 'Less CO2, and less soot, so your contrails are thinner and fade sooner. They still happen!', 'good', 4);
    } else {
      this.autoUntil = this.gameTime + this.kit.autoSecs * 1000; this.autoFrom = this.gameTime;
      this.popup(tx, ty - 8, 'AUTOPILOT!', '#ffe15a');
    }
    this.burst(tx, ty, power === 'saf' ? 0x8dffb0 : 0x8ac8ff, 8);
    sfx.coin();
  }

  // Timed pick-ups running out.
  updatePowers() {
    if (this.safUntil && this.gameTime >= this.safUntil) { this.safUntil = 0; this.kit = this.ownKit; this.ownKit = null; this.popup(this.plane.x + 20, this.plane.y - 10, 'SAF used up', '#c8c8c8'); }
    if (this.autoUntil && this.gameTime >= this.autoUntil) { this.autoUntil = 0; this.popup(this.plane.x + 20, this.plane.y - 10, 'You have control!', '#ffe15a'); }
  }
  onAutopilot() { return this.autoUntil && this.gameTime < this.autoUntil; }

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
      const img = this.add.image(x + ox, y + oy, 'bird-0').setOrigin(0).setFlipX(true);   // facing the plane
      this.birdLayer.add(img);
      birds.push({ img, ox, oy });
    }
    this.birds.push({ birds, x, y, half: FLOCK_HALF, phase: this.rand() * 6 });
    this.newHazard('birds', 'NEW HAZARD: BIRDS', 'A flock of birds is flying at you! Fly over or under them. Hitting a bird ends your flight.');
  }

  // A flock at (x, y) flies at speed + extraSpeed; each storm on screen at speed. When the plane
  // reaches a storm, would the flock be near the plane and inside that storm's gap?
  flockBlocksGap(x, y, half) {   // half: the flock's size in old V steps (13 px across, 9 px down)
    const B = HAZARDS.birds, v = Math.max(1, this.speed);
    const top = y - half * 9 - 4 - B.wobble, bottom = y + half * 9 + 16 + B.wobble;   // the V's height, bird size and bobbing
    return this.storms.some(st => {
      const r = st.rects[0], t = (r.x - this.plane.x) / v;
      if (t < 0) return false;
      const fx = x - (v + B.extraSpeed) * t;
      return fx < this.plane.x + PLANE.w + 120 && fx + half * 26 + 16 > this.plane.x - 80 && top < st.rects[1].y && bottom > r.height;   // wide margin: the speed creeps up
    });
  }

  newHazard(id, title, body) {
    if (this.school) return;
    if (!this.explain(`hazard-${id}`, `<b>${title}</b><br>${body}`, `lesson-${id.toLowerCase()}`)) {
      if (!this.hazardSeen) this.hazardSeen = {};
      if (!this.hazardSeen[id]) { this.hazardSeen[id] = true; this.popup(WIDTH / 2, 84, `${{ noFly: 'No-fly zone', turbulence: 'Turbulence', birds: 'Birds' }[id]} ahead!`, '#ff8080'); }   // y 84: below the 2-line mission text
    }
  }

  updateHazards(dt, box) {
    // Turbulence: wavy lines; inside it, taps lag and the plane gets bumped.
    const g = this.turbGfx;
    g.clear();
    const cx = box.x + box.w / 2;
    this.inTurb = false;
    for (const z of this.turbs) {
      // Tileable gusts (assets/turb.png): drift sideways and churn slowly up and down.
      if (!z.img) { z.img = this.turbLayer.add(this.add.tileSprite(z.x, z.y, z.w, z.h, 'turb').setOrigin(0)); this.cloudShape(z.img, z.w, z.h); }
      z.img.setPosition(Math.round(z.x), z.y); z.img.maskGfx.setPosition(z.img.x, z.img.y);
      z.img.tilePositionX += 20 * dt;
      z.img.tilePositionY = Math.round(Math.sin(this.gameTime / 700));
      if (this.inCloud(z.img.blobs, z.x, z.y, z.w, z.h, box)) this.inTurb = true;
    }
    this.turbs = this.turbs.filter(z => { if (z.x + z.w > -10) return true; if (z.img) { z.img.maskGfx.destroy(); z.img.destroy(); } return false; });
    if (this.inTurb && this.state === 'playing') {
      this.bumpIn -= dt;
      if (this.bumpIn <= 0) {
        const T = HAZARDS.turbulence;
        this.plane.vy += this.between(-T.bump, T.bump);
        this.bumped = true;
        this.bumpIn = this.floatBetween(T.bumpEvery[0], T.bumpEvery[1]);
        this.cameras.main.shake(80, 0.004);
      }
      const j = this.between(-1, 1);
      this.planeSprite.x += j;
      for (const o of this.planeParts) o.img.x += j;
    }

    // Birds fly towards you, bobbing up and down; hitting one ends the flight.
    const B = HAZARDS.birds;
    for (const f of this.birds) {
      f.x -= B.extraSpeed * dt;
      // Birds steer out of a storm gap the plane is about to fly through (a flock there would
      // leave no way past). The spawn check usually prevents it; this catches the rest.
      const half = f.half ?? (f.birds.length - 1) / 2, top = f.y - half * 9 - 4 - B.wobble, bottom = f.y + half * 9 + 16 + B.wobble;
      for (const st of this.storms) {
        const r = st.rects[0], gTop = r.height, gBot = st.rects[1].y;
        if (r.x + r.width < this.plane.x - 10 || r.x > this.plane.x + 200) continue;     // only gaps the plane is reaching
        if (f.x > r.x + r.width + 40 || f.x + half * 26 + 16 < this.plane.x - 40) continue;   // flock not near that column
        if (top < gBot && bottom > gTop) f.y += (f.y - (gTop + gBot) / 2 < 0 ? -1 : 1) * 160 * dt;
      }
      f.phase += dt * 2;
      const fy = f.y + Math.sin(f.phase) * B.wobble;
      const frame = Math.floor(this.gameTime / 120) % 2;
      const night = this.nightAmount() > 0.5;   // dark birds vanish on a night sky: draw them pale
      for (const b of f.birds) { b.img.setPosition(Math.round(f.x + b.ox), Math.round(fy + b.oy)); b.img.setTexture(`bird-${frame}`); if (night) b.img.setTintFill(0xd8def0); else b.img.clearTint(); }
    }
    this.birds = this.birds.filter(f => { if (f.x < -60) { f.birds.forEach(b => b.img.destroy()); return false; } return true; });
  }

  hitBird(box) {
    const pts = this.planePixels();
    for (const f of this.birds) for (const b of f.birds) {
      const m = this.alphaMask(b.img.texture.key);
      if (!overlaps(box, { x: b.img.x - 12, y: b.img.y - 16, w: m.w + 24, h: m.h + 32 })) continue;   // far away: skip
      for (const [x, y] of pts) {
        let lx = x - b.img.x; const ly = y - b.img.y;
        if (b.img.flipX) lx = m.w - 1 - lx;
        if (m.at(lx, ly)) return true;
      }
    }
    return false;
  }

  // ---------- pixel collisions ----------

  // Which pixels of a texture are drawn (alpha > 40). Cached per texture key.
  // Collision masks are baked from the PNGs (src/sim/masks.js, tools/sim/bake-masks.py, 2026-10-25), so the
  // sim engine checks hits on exactly the same pixels without a canvas. A picture not baked falls back to
  // reading its canvas; tests/sim-masks.cjs checks baked == canvas for every baked one.
  alphaMask(key) { return MASK_DATA[key] ? mask(key) : this.canvasMask(key); }

  canvasMask(key) {
    this.masks = this.masks || {};
    if (this.masks[key]) return this.masks[key];
    const img = this.textures.get(key).getSourceImage(), w = img.width, h = img.height;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, w, h).data, solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 40 ? 1 : 0;
    const at = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < w && y < h && solid[y * w + x] === 1; };
    return (this.masks[key] = { w, h, at });
  }

  // World positions of the plane's drawn pixels, turned with the plane's tilt. Once per frame.
  planePixels() {
    if (this.planePtsAt === this.gameTime && this.planePts) return this.planePts;
    const m = this.alphaMask('plane'), sp = this.planeSprite;
    if (!this.planeOffsets) {
      this.planeOffsets = [];
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.at(x, y)) this.planeOffsets.push([x + 0.5 - m.w / 2, y + 0.5 - m.h / 2]);
    }
    const c = Math.cos(sp.rotation), s = Math.sin(sp.rotation);
    this.planePts = this.planeOffsets.map(([ox, oy]) => [sp.x + ox * c - oy * s, sp.y + ox * s + oy * c]);
    this.planePtsAt = this.gameTime;
    return this.planePts;
  }

  // Storms forgive a nick of up to HAZARDS.stormForgive pixels; no-fly zones forgive nothing.
  hitsStorm(st) {
    const forgive = st.noFly ? 0 : HAZARDS.stormForgive;
    return this.stormPixelsHit(st, forgive + 1) > forgive;
  }

  // How many plane pixels touch the storm's (or no-fly zone's) drawn pixels. Stops counting at `enough`.
  // A storm's solid pixels are its drawn cloud pixels INSIDE the column (STORMS.width): fluff puffing
  // out beyond the column never crashes you, and empty sky never does (the user, 2026-10-24).
  stormPixelsHit(st, enough) {
    const r0 = st.rects[0], r1 = st.rects[1], W = r0.width;
    const sp = this.planeSprite;
    if (sp.x + 40 < r0.x || sp.x - 40 > r0.x + W) return 0;   // not level with it
    const topH = r0.height, botY = r1.y;
    let n = 0;
    for (const [x, y] of this.planePixels()) {
      const lx = x - r0.x;
      if (lx < 0 || lx >= W) continue;
      let solid = false;
      if (st.noFly) solid = y < topH || y >= botY;   // a no-fly zone is a solid block
      else for (const q of st.pics) {
        const m = this.alphaMask(q.key), px = Math.floor(lx - q.dx), py = Math.floor(y - q.y);   // whole pixels BEFORE mirroring
        if (px >= 0 && py >= 0 && px < m.w && py < m.h && m.at(q.flip ? m.w - 1 - px : px, py)) { solid = true; break; }
      }
      if (solid && ++n >= enough) return n;
    }
    return n;
  }

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
    if (golden) this.time.delayedCall(700, () => this.explain('x-gold', 'A <b>GOLDEN seed</b>! It is worth <b>3 seeds</b>. They only appear on long flights.', 'lesson-gold'));
    const img = this.add.image(x, y, golden ? 'token-gold' : 'token').setOrigin(0);
    this.fxLayer.add(img);
    this.tokens.push({ img, baseY: y, phase: this.rand() * 6, value: golden ? 3 : 1 });
  }

  updateTokens(dt, box) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    this.tokens = this.tokens.filter(t => {
      t.phase += dt * 4;
      const tx = t.img.x + 7, ty = t.img.y + 7;
      // Distance from the token's centre to the plane's hitbox.
      const dxB = Math.max(box.x - tx, 0, tx - (box.x + box.w)), dyB = Math.max(box.y - ty, 0, ty - (box.y + box.h));
      const d = Math.hypot(dxB, dyB);
      if (this.kit.pickup > 12 && d < this.kit.pickup * 2.5) {
        // Magnet: pull towards the plane.
        const a = Math.atan2(cy - ty, cx - tx);
        t.img.x += Math.cos(a) * TOKENS.magnetPull * dt;
        t.baseY += Math.sin(a) * TOKENS.magnetPull * dt;
      }
      t.img.y = Math.round(t.baseY + Math.sin(t.phase) * TOKENS.bob);
      if (d <= this.kit.pickup - 6 && this.state === 'playing' && t.power) {
        this.usePower(t.power, tx, ty);
        t.img.destroy();
        return false;
      }
      if (d <= this.kit.pickup - 6 && this.state === 'playing') {
        this.cargo += t.value;
        if (t.value > 1) this.goldens++;
        this.popup(tx, ty - 8, `+${t.value} seed${t.value > 1 ? 's' : ''}`, t.value > 1 ? '#ffe15a' : '#8dffb0');
        this.burst(tx, ty, 0x4caf50, 5);
        sfx.coin();
        this.tweens.add({ targets: this.cargoIcon, scale: 1.4, duration: 80, yoyo: true });
        if (this.cargo === t.value) this.ui.tipOnce('firstToken', 'You grabbed a seed!', 'It is on board now (top left). Land safely to keep it!', 'good', 3.5);
        t.img.destroy();
        return false;
      }
      if (t.img.x < -20) { t.img.destroy(); return false; }
      return true;
    });
  }

  addStormPair(x = WIDTH + 10) {
    if (this.distancePx < WORLD.warmup) this.warmStorms = this.stormCount;   // gaps only narrow after the warm-up
    let gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * (this.stormCount - (this.warmStorms || 0)));
    const nf = HAZARDS.noFly;
    const noFly = this.distancePx >= nf.from && this.rand() < nf.chance;
    if (noFly) gap = Math.max(nf.minGap, gap - nf.gapLess);
    gap = Math.round(gap * this.kit.gaps);   // air traffic control (eras): better spacing, gaps up to ~3% wider
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    const w = noFly ? nf.width : STORMS.width;
    // Leave a clear lane past any icy air already in this column (20 tries, else no storm this time).
    let gapY = null;
    for (let k = 0; k < 20 && gapY === null; k++) { const t = this.between(lo, hi); if (this.laneClear(x, w, t - gap / 2, t + gap / 2)) gapY = t; }
    if (gapY === null) return;
    if (noFly) this.addNoFlyAt(x, gapY, gap);
    else this.addStormPairAt(x, gapY, gap);
  }

  // Restricted airspace: thinner than a storm, but the gap is tighter.
  addNoFlyAt(x, gapY, gap) {
    const W = HAZARDS.noFly.width, topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: W, height: topH };
    const bottom = { x, y: botY, width: W, height: SKY_H - botY };
    const style = { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#d02a2a', strokeThickness: 3 };
    const parts = [
      this.add.tileSprite(x, 0, W, topH, 'nofly').setOrigin(0),
      this.add.tileSprite(x, botY, W, SKY_H - botY, 'nofly').setOrigin(0),
      this.add.rectangle(x, topH - 2, W, 2, 0x8a1010).setOrigin(0),
      this.add.rectangle(x, botY, W, 2, 0x8a1010).setOrigin(0),
      this.add.text(x + W / 2, topH - 12, 'NO', style).setOrigin(0.5),
      this.add.text(x + W / 2, botY + 12, 'FLY', style).setOrigin(0.5),
    ];
    this.stormLayer.add(parts);
    this.storms.push({ rects: [top, bottom], parts, flashUntil: 0, noFly: true });
    this.stormCount++;
    this.newHazard('noFly', 'NEW HAZARD: NO-FLY ZONE', 'Red stripes mean planes are not allowed there, like near airports or big events. Squeeze through the gap: touching it ends your flight!');
  }

  // Storm cloud tints, top to base: a column rising from the ground has a bright, sunlit crown; one hanging from
  // A storm pair: PixelLab storm towers. The bottom column's crown touches the gap edge from below, the top
  // column's hanging base from above, so every gap's narrowest point is exactly `gap`. A column taller
  // than one picture stacks another behind it. st.pics: { key, dx (from the column's left), y, flip }.
  addStormPairAt(x, gapY, gap) {
    const topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: STORMS.width, height: topH };
    const bottom = { x, y: botY, width: STORMS.width, height: SKY_H - botY };
    const pics = [], pick = () => STORM_ART[this.between(0, STORM_ART.length - 1)];
    const place = (key, y) => { const t = this.textures.get(key).getSourceImage();
      pics.push({ key, y: Math.round(y), dx: Math.round(STORMS.width / 2 - t.width / 2), flip: this.rand() < 0.5, h: t.height }); };
    for (let y = topH; y > 0;) { const k = `storm-hang-${pick()}`; const h = this.textures.get(k).getSourceImage().height; place(k, y - h); y -= h - STORM_OVERLAP; }
    for (let y = botY; y < SKY_H;) { const k = `storm-rise-${pick()}`; place(k, y); y += this.textures.get(k).getSourceImage().height - STORM_OVERLAP; }
    // Drawn farthest first: the picture at the gap edge is in front.
    const order = [...pics.filter(q => q.key.includes('hang')).reverse(), ...pics.filter(q => q.key.includes('rise')).reverse()];
    const parts = order.map(q => { const im = this.add.image(x + q.dx, q.y, q.key).setOrigin(0).setFlipX(q.flip);
      im.cropH = Math.min(q.h, SKY_H - q.y);   // never below the ground line
      return im.setCrop(0, 0, im.width, im.cropH); });
    this.stormLayer.add(parts);
    this.storms.push({ rects: [top, bottom], parts, pics: order, flashUntil: 0, nextSpark: 0 });
    this.stormCount++;
  }

  // Now and then a storm flickers with lightning: the cloud lights up (the same pictures, lit) and a bolt
  // hangs from the top column, twice in quick succession. Between, tiny bolts flicker INSIDE the clouds
  // (the user, 2026-10-24: "aggressive thunder clouds"). Purely for looks: not in the collision check.
  updateLightning(time) {
    for (const st of this.storms) {
      if (st.noFly || !st.parts.length || !st.pics) continue;   // (a storm with no pictures cannot flash: tests/powerups.cjs's fake one crashed here ~1 run in 5)
      if (!st.flash && Math.random() < 0.002 && st.rects[0].x < WIDTH) this.flashStorm(st, time);
      if (st.flash) {
        const t = time - st.flash.t0, on = t < 90 || (t > 150 && t < 230);   // flicker: on, off, on
        st.flash.fx.forEach(o => o.setVisible(on));
        if (t >= 230) { st.flash.fx.forEach(o => o.destroy()); st.parts = st.parts.filter(o => !st.flash.fx.includes(o)); st.flash = null; }
      }
      if (time > st.nextSpark && st.rects[0].x < WIDTH) this.sparkStorm(st, time);
    }
  }

  // A tiny bolt for a moment at a random spot inside the cloud (on a drawn pixel, inside the column).
  sparkStorm(st, time) {
    st.nextSpark = time + Phaser.Math.Between(300, 1400);
    const q = st.pics[Phaser.Math.Between(0, st.pics.length - 1)], m = this.alphaMask(q.key), x0 = st.rects[0].x;
    for (let k = 0; k < 12; k++) {
      const px = Phaser.Math.Between(4, STORMS.width - 5) - q.dx, py = Phaser.Math.Between(6, m.h - 6), y = q.y + py;
      if (y < 4 || y > SKY_H - 4 || (y > st.rects[0].height - 4 && y < st.rects[1].y + 4)) continue;
      if (!m.at(q.flip ? m.w - 1 - px : px, py)) continue;
      const s = this.add.image(x0 + q.dx + px, y, `storm-spark-${Phaser.Math.Between(0, 2)}`).setFlipX(Math.random() < 0.5);
      this.stormLayer.add(s); st.parts.push(s);
      this.time.delayedCall(Phaser.Math.Between(60, 140), () => { s.destroy(); st.parts = st.parts.filter(o => o !== s); });
      return;
    }
  }

  flashStorm(st, time) {
    const x = st.rects[0].x, topH = st.rects[0].height;
    const fx = st.parts.filter(o => st.pics.some(q => q.key === o.texture.key)).map(o =>
      this.add.image(o.x, o.y, `${o.texture.key}-flash`).setOrigin(0).setFlipX(o.flipX).setCrop(0, 0, o.width, o.cropH));
    fx.push(this.add.image(x + 22 + Phaser.Math.Between(-8, 8), topH - 2, `bolt-${Phaser.Math.Between(0, 2)}`).setOrigin(0.5, 0));
    this.stormLayer.add(fx);
    st.parts.push(...fx);   // scroll with the storm
    st.flash = { fx, t0: time };
  }


  // fake: a forecast's false patch (looks real, makes no contrail, puffs away when you get close).
  addIssr({ fake = false } = {}) {
    const grow = Math.sqrt(this.lateRamp());   // long flights: bigger patches (area grows with the ramp)
    const w = Math.round(this.between(ISSR.minW, ISSR.maxW) * grow);
    const h = Math.min(SKY_H - 40, Math.round(this.between(ISSR.minH, ISSR.maxH) * grow)), x = WIDTH + 10;
    // Never fill a storm gap: there is always a way through without a contrail (10 tries, else skip).
    for (let k = 0; k < 10; k++) {
      const y = this.between(10, SKY_H - h - 10);
      const blocks = this.storms.some(st => { const r = st.rects[0]; return r.x < x + w && r.x + r.width > x
        && !this.laneClear(r.x, r.width, r.height, st.rects[1].y, [...this.issrs, { x, y, width: w, height: h }]); });   // with the icy air already there
      if (!blocks) {
        const r = this.addIssrAt(x, y, w, h);
        if (fake) r.fake = true;
        else if (this.kit.late && this.rand() < this.kit.late) r.late = true;   // the forecast missed it: seen only up close
        return;
      }
    }
  }

  // Is there still a clear lane (plane height + margin) through the gap gTop..gBot of a storm
  // column at x..x+w, past the icy air in `issrs` that overlaps the column?
  laneClear(x, w, gTop, gBot, issrs = this.issrs) { return P.laneClear(issrs, x, w, gTop, gBot); }


  // An ISSR is a lumpy patch, not a box: 3-5 overlapping ellipses inside its bounding box. Every
  // ellipse crosses the box's middle line, so the patch is one piece and flying through the
  // middle always makes a contrail. The texture is masked to the ellipses.
  addIssrAt(x, y, w, h) {
    const r = this.add.tileSprite(x, y, w, h, 'issr-tile').setOrigin(0).setAlpha(this.kit.hiddenAlpha);
    r.tilePositionX = Phaser.Math.Between(0, 31); r.tilePositionY = Phaser.Math.Between(0, 31);
    this.cloudShape(r, w, h);
    this.issrLayer.add(r);
    this.issrs.push(r);
    return r;
  }

  // Cloud shape for icy air and turbulence: 3-5 overlapping ellipses inside a w x h box, all
  // crossing the middle line, used as the sprite's mask. Keep maskGfx at the sprite's x, y.
  cloudShape(r, w, h) {
    const n = Phaser.Math.Clamp(Math.round(w / 70), 3, 5);
    r.blobs = [];
    for (let k = 0; k < n; k++) {
      const rx = Math.min(w / 2, (w / n) * this.floatBetween(0.75, 1.0));
      const cx = Phaser.Math.Clamp((k + 0.5) * w / n + this.between(-6, 6), rx, w - rx);
      const ry = h * this.floatBetween(0.32, 0.5);
      const cy = Phaser.Math.Clamp(h / 2 + this.floatBetween(-0.15, 0.15) * h, ry, h - ry);
      r.blobs.push({ cx, cy, rx, ry });
    }
    const m = this.make.graphics({ x: r.x, y: r.y }, false);
    m.fillStyle(0xffffff);
    for (const b of r.blobs) m.fillEllipse(b.cx, b.cy, b.rx * 2, b.ry * 2, 24);
    r.maskGfx = m;
    r.setMask(m.createGeometryMask());
  }

  // Is any point along the plane's middle line inside the cloud's ellipses? (x, y, w, h: its box)
  // `grow`: each blob's radii x this (1 = the drawn shape). Used for the contrail margin below.
  inCloud(blobs, x, y, w, h, box, grow = 1) { return P.inCloud(blobs, x, y, w, h, box, grow); }

  // The contrail margin (eras, PLANE-DESIGN.md section 3): a hot-exhaust 1950s jet makes contrails only
  // deep inside icy air; efficient jets make them right up to (and a little past) its edge. The drawn
  // patch does not change. Everything about "being in icy air" uses this: contrails, heat, dodges, the autopilot.
  inIssrShape(i, box) { return P.inIssrShape(this, i, box); }

  issrAlpha(i, box, inside) { return P.issrAlpha(this, i, box, inside); }


  // The next-gap hint: a faint gate at the right edge, at the height of a storm gap still off screen.
  drawGapHint() {
    const lv = this.kit.hintLevel;
    if (!lv || this.school) return;
    const g = this.gapHintGfx || (this.gapHintGfx = this.add.graphics().setDepth(50));
    g.clear();
    for (const st of this.storms) {
      const x = st.rects[0].x;
      if (x < WIDTH) continue;   // on screen: no hint needed
      const top = st.rects[0].height, bot = st.rects[1].y, a = GAP_HINT.alpha[lv] * (0.75 + 0.25 * Math.sin(this.gameTime / 120));
      g.fillStyle(0xffe15a, a);
      g.fillRect(WIDTH - 4, top, 4, 3); g.fillRect(WIDTH - 4, bot - 3, 4, 3); g.fillRect(WIDTH - 2, top, 2, bot - top);
      if (!this.hintTipped) { this.hintTipped = true; this.ui.tipOnce('gapHint', 'Teamwork!', 'Your forecasters, controllers and dispatchers are working together: the glow on the right shows where the next gap is.', 'good', 4); }
    }
  }

  // Gap from the plane's box to a patch's box, px (0 = touching or overlapping).
  nearPx(i, box) { return P.nearPx(i, box); }


  // A false patch, close up: it puffs into sparkles with "Forecast wrong!" (user, draft 2) and is gone.
  popFake(i) {
    i.popped = true;
    const cx = i.x + i.width / 2, cy = i.y + i.height / 2;
    this.popup(cx, cy - 6, 'Forecast wrong!', '#cfe6ff', 8);
    for (let k = 0; k < 8; k++) {
      const sp = this.add.image(cx + Phaser.Math.Between(-i.width / 3, i.width / 3), cy + Phaser.Math.Between(-i.height / 3, i.height / 3), `plane-sparkle-${k % 4}`);
      this.tweens.add({ targets: sp, y: sp.y - 12, alpha: 0, duration: 600 + k * 40, onComplete: () => sp.destroy() });
    }
    this.tweens.add({ targets: i, alpha: 0, duration: 300, onComplete: () => { i.x = -1e4; } });   // swept away by the normal clean-up
  }

  enterIssr() {
    sfx.issr();
    this.popup(this.plane.x + 25, this.plane.y - 12, 'CONTRAIL!', '#ffffff');
    if (this.isDay) this.ui.tipOnce('issrDay', 'You made a contrail!', 'This icy air turns exhaust into a cloud. In sunshine it can shade the Earth a little: cooler.', 'good', 4);
    else this.ui.tipOnce('issrNight', 'Contrail at night!', 'No sunlight to block, so it only traps heat: HOTTER. Climb or dive out!', 'bad', 4);
  }

  // Contrails are records (src/sim/physics.js); the square drawn for each is its .view.
  addContrail(time) {
    const c = P.makeContrail(this, time), s = CONTRAIL.size;
    c.view = this.add.rectangle(c.x, c.y, s, s, COLOURS.contrail).setOrigin(0);
    this.contrailLayer.add(c.view);
    this.contrails.push(c);
  }

  scroll(dx) {
    for (const s of this.storms) { for (const p of s.parts) p.x -= dx; for (const r of s.rects) r.x -= dx; }
    this.storms = this.storms.filter(s => {
      if (s.rects[0].x + STORMS.width < -16) { s.parts.forEach(p => p.destroy()); return false; }   // (the cloud puffs out past the column)
      return true;
    });
    for (const i of this.issrs) { i.x -= dx; i.maskGfx.x = i.x; i.maskGfx.y = i.y; }
    this.issrs = this.issrs.filter(i => {
      if (i.x + i.width < -5) { i.maskGfx.destroy(); i.destroy(); return false; }
      return true;
    });
    for (const c of this.contrails) c.x -= dx;
    for (const rw of this.runways) for (const p of rw.parts) p.x -= dx;
    this.runways = this.runways.filter(rw => {
      if (rw.strip.x + AIRPORT.runwayLen < -5) { rw.parts.forEach(p => p.destroy()); return false; }
      return true;
    });

    for (const t of this.tokens) t.img.x -= dx;
    for (const z of this.turbs) z.x -= dx;
    for (const f of this.birds) f.x -= dx;
    const bob = Math.round(Math.sin(this.gameTime / 180) * 2);
    for (const pl of this.plots) {
      pl.x -= dx; for (const part of pl.parts) part.x -= dx;
      pl.marker.setVisible(!pl.used && this.parcels > 0).setY(SKY_H - 18 + bob);
    }
    this.plots = this.plots.filter(pl => { if (pl.x + this.kit.plotW < -30) { pl.parts.forEach(p => p.destroy()); return false; } return true; });
  }

  updateContrails(dt, time) {
    for (const c of P.ageContrails(this, dt, time)) c.view.destroy();
    for (const c of this.contrails) c.view.setPosition(c.x, c.y).setAlpha(P.contrailAlpha(this, c, time));
  }

  // ---------- day, night and radiation ----------

  dayNightPhase() { return P.dayNightPhase(this); }


  // What a contrail does right now (2026-10-23): the switch between cooling and warming happens HALFWAY
  // through dusk / dawn, with a short neutral stretch in the middle. cool: sunshine side; strength 0..1.
  radiationMode() { return P.radiationMode(this); }


  updateDayNight(time) {
    const { isDay: skyDay, toOther } = this.dayNightPhase();
    const isDay = this.radiationMode().cool;   // this.isDay = "contrails cool now" (the sky below is drawn from the clock alone)
    const from = skyDay ? COLOURS.skyDay : DAYNIGHT.skyNight;
    const to = skyDay ? DAYNIGHT.skyNight : COLOURS.skyDay;
    this.cameras.main.setBackgroundColor(lerpColour(from, to, toOther));
    this.isDay = isDay;
    this.drawSky(time);

    // Teach the switch the moment it starts.
    const half = skyDay ? (toOther > 0 ? 'dusk' : 'day') : (toOther > 0 ? 'dawn' : 'night');
    if (half !== this.lastHalf) {
      // The banner only for the first few of each: after that the sky and the sound say it.
      const banner = k => { const seen = this.save.dayNightSeen || (this.save.dayNightSeen = {}); seen[k] = (seen[k] || 0) + 1; return seen[k] <= DAYNIGHT.bannerTimes; };
      if (half === 'dusk') { sfx.dusk(); if (banner('dusk')) this.ui.toast('Night is coming!', 'At night contrails TRAP heat. Avoid the icy air!', 'bad', 3); }
      if (half === 'dawn') { sfx.dawn(); if (banner('dawn')) this.ui.toast('Sunrise!', 'In sunshine a contrail can shade the Earth a little. Night ones trap heat.', 'good', 3); }
      // Night Owl: a whole night flown without trapping any heat.
      if (half === 'night') this.nightDodges = 0;
      if (half === 'night' && this.state === 'playing') this.night = { started: true, trappedAtStart: this.heatTrapped };
      if (half === 'dawn' && this.night.started && this.heatTrapped - this.night.trappedAtStart < 0.5) {
        this.nightOwl = true;
        this.popup(WIDTH / 2, 60, 'NIGHT OWL!', '#ffe15a', 16);
        this.earnCrystals(CRYSTALS.cleanNight, 'clean night!');
      }
      if (half === 'dawn') this.night.started = false;
      this.lastHalf = half;
    }
  }

  // Light (day) and heat (night) are fixed columns. Each frame we find, per column, the
  // contrail square that blocks it, draw the beam up to that point, and score the block.
  updateRays(dt, time, scoring) {
    const g = this.rayGfx, ground = this.groundFx;
    g.clear(); ground.clear();
    const { cool: isDay, strength } = this.radiationMode();   // fades out, is neutral at the halfway point, fades in the other way
    for (const c of this.blockers) if (c.view.active) c.view.setFillStyle(COLOURS.contrail);
    this.blockers = [];
    if (strength <= 0) return;

    const S = CONTRAIL.size;
    let blocked = 0;
    for (const { x, hit } of P.rayColumns(this.contrails, isDay)) {   // per light/heat column, the contrail blocking it
      const colour = isDay ? COLOURS.sun : COLOURS.heat;
      const a = (isDay ? RADIATION.dayAlpha : RADIATION.beamAlpha) * strength;

      if (isDay) {
        // Soft band of sunlight with a slightly brighter core.
        const end = hit ? hit.y : SKY_H;
        g.fillStyle(colour, a * 0.5).fillRect(x - 1, 0, 3, end);
        g.fillStyle(colour, a).fillRect(x, 0, 1, end);
        if (hit) {
          g.fillStyle(0xffffff, 0.9 * strength).fillRect(x - 1, hit.y - 2, 1, 1).fillRect(x + 1, hit.y - 3, 1, 1);  // glint
          // Shadow: a darker column under the contrail and a dark patch on the ground.
          g.fillStyle(0x000000, RADIATION.shadowAlpha * 0.3 * strength).fillRect(x - 1, hit.y + S, 3, SKY_H - hit.y - S);
          ground.fillStyle(0x000000, RADIATION.shadowAlpha * strength).fillRect(x - RADIATION.spacing / 2, SKY_H, RADIATION.spacing, 4);
        }
      } else {
        // Heat haze: short segments that wiggle and drift upward.
        const top = hit ? hit.y + S : 0;
        for (let y = SKY_H; y > top; y -= RADIATION.hazeSeg) {
          const off = Math.round(Math.sin((y + time * RADIATION.hazeRise) / 9 + x) * 1.4);
          const h = Math.min(RADIATION.hazeSeg, y - top);
          g.fillStyle(colour, a).fillRect(x + off, y - h, 1, h);
        }
        if (hit) {
          g.fillStyle(COLOURS.warm, 0.9 * strength).fillRect(x - 1, top + 1, 1, 1).fillRect(x + 1, top + 2, 1, 1);  // bounce
          ground.fillStyle(COLOURS.warm, RADIATION.glowAlpha * strength).fillRect(x - RADIATION.spacing / 2, SKY_H, RADIATION.spacing, 4);
        }
      }
      if (hit) {
        blocked++;
        hit.view.setFillStyle(isDay ? COLOURS.cool : COLOURS.warm);
        this.blockers.push(hit);
      }
    }

    if (!scoring) return;
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
        if (cooling) { sfx.cool(); this.coolSparkle(); } else { sfx.warm(); buzz(25); }
      }
      this.feedback = { amount: 0, timer: 0 };
    }
  }

  // The plane's picture with its bought parts layered on (src/planelook.js): a canvas texture made once
  // per scene. No parts: the plane's own sprite.
  planeLookKey() {
    const f = fleetOf(this.save), files = lookFiles(f.plane, f.planes[f.plane] || {}, 'flight');
    if (!files.parts.length || !files.parts.every(k => this.textures.exists(k))) return files.base;
    if (this.textures.exists('plane-look')) this.textures.remove('plane-look');
    const base = this.textures.get(files.base).getSourceImage(), tex = this.textures.createCanvas('plane-look', base.width, base.height);
    composeOnto(tex.getContext(), base, files.parts.map(k => this.textures.get(k).getSourceImage()));
    tex.refresh();
    return 'plane-look';
  }

  // ---------- heat feedback: the player should feel that warming is bad ----------
  heatLevel() { return Phaser.Math.Clamp((this.heatPct() - 30) / 70, 0, 1); }
  heatPct() { return this.heat * 100 / CLIMATE.dangerLine; }   // heat as % of the danger line (thresholds below are %)

  drawHeatFx(time) {
    const g = this.heatFx, lvl = this.heatLevel();
    g.clear();
    if (lvl > 0) {
      // Red creeping in from the edges, in pixel steps; past 75 it beats like a heart.
      const beat = this.heatPct() > 75 ? 0.5 + 0.5 * Math.max(0, Math.sin(time / 140)) ** 8 : 0;
      const depth = Math.round(10 + 30 * lvl + 10 * beat);
      for (let i = 0; i < 4; i++) {
        const d = Math.round(depth * (1 - i / 4)), a = (0.08 + 0.18 * lvl + 0.15 * beat) * (i + 1) / 4;
        g.fillStyle(0xd02020, a);
        g.fillRect(0, 0, WIDTH, d).fillRect(0, SKY_H - d, WIDTH, d).fillRect(0, d, d, SKY_H - 2 * d).fillRect(WIDTH - d, d, d, SKY_H - 2 * d);
      }
    }
    for (const t of [50, 75, 90]) {
      if (this.heatPct() >= t && !this.heatWarned[t]) {
        this.heatWarned[t] = true;
        buzz(t === 90 ? [80, 60, 80, 60, 160] : t === 75 ? [80, 60, 80] : 60);
        if (t >= 75) this.popup(WIDTH - 50, 70, t === 90 ? 'DANGER!' : 'TOO HOT!', '#ff5a5a', 16);
      }
      if (this.heat < t - 10) this.heatWarned[t] = false;   // re-arm after cooling down
    }
    if (this.heatPct() > 75 && time > this.nextBeat && this.state === 'playing') {
      this.nextBeat = time + Phaser.Math.Linear(900, 450, (this.heat - 75) / 25);
      sfx.heartbeat();
    }
  }

  // Blue sparkles at the Earth face when contrails or trees cool it.
  // Ice crystals: the contrail currency, for smart flying (dodging icy air at night, clean nights).
  // Daytime contrails earn none: in real life they are not always cooling.
  earnCrystals(n, why) {
    this.crystals += n;
    sfx.coin();
    this.popup(this.plane.x + 25, this.plane.y - 16, `+${n} crystal${n > 1 ? 's' : ''}: ${why}`, '#9fe0ff');
    const c = this.add.image(this.plane.x + 25, this.plane.y, 'crystal').setScale(2);
    this.fxLayer.add(c);
    this.tweens.add({ targets: c, x: this.crysIcon.x, y: this.crysIcon.y, scale: 1, duration: 600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    this.explain('x-crystals', '<b>ICE CRYSTALS!</b> Contrails are made of ice crystals. You earn them for <b>smart contrail flying</b>: dodging icy air at night, and nights with no contrails.<br>Spend them in the hangar on research and rewilding. You keep them even if you crash!', 'lesson-crystals');
  }

  coolSparkle() {
    for (let i = 0; i < 4; i++) {
      const r = this.add.rectangle(WIDTH - 10 + Phaser.Math.Between(-10, 6), 38 + Phaser.Math.Between(-8, 8), 2, 2, 0x9fe0ff);
      this.tweens.add({ targets: r, y: r.y - 10, alpha: 0, duration: 500, onComplete: () => r.destroy() });
    }
  }

  // ---------- juice ----------

  popup(x, y, text, colour = '#ffffff', size = 8) {
    const t = this.add.text(Math.round(x), Math.round(y), text,
      { fontFamily: FONT, fontSize: `${size}px`, color: colour, stroke: '#000', strokeThickness: 3, align: 'center' }).setOrigin(0.5);
    for (let fs = size; t.width > WIDTH - 16 && fs > 6;) t.setFontSize(--fs);   // 0.11.3: a long line (a biome name) shrinks to fit the screen
    // Keep popups on screen.
    t.x = Phaser.Math.Clamp(t.x, Math.min(t.width / 2 + 24, WIDTH / 2), WIDTH - Math.min(t.width / 2 + 24, WIDTH / 2));   // clear of the side bars
    this.fxLayer.add(t);
    this.popups.push({ t, life: 1.1, vy: -22 });
  }

  updatePopups(dt) {
    this.popups = this.popups.filter(p => {
      p.life -= dt;
      p.t.y += p.vy * dt;
      p.t.setAlpha(p.life < 0.3 ? p.life / 0.3 : 1);
      if (p.life <= 0) { p.t.destroy(); return false; }
      return true;
    });
  }

  burst(x, y, colour, n) {
    for (let i = 0; i < n; i++) {
      const r = this.add.rectangle(x, y, 2, 2, colour).setOrigin(0.5);
      this.fxLayer.add(r);
      this.tweens.add({
        targets: r, x: x + Phaser.Math.Between(-18, 18), y: y - Phaser.Math.Between(4, 20), alpha: 0,
        duration: Phaser.Math.Between(300, 600), onComplete: () => r.destroy(),
      });
    }
  }

  // ---------- text and the end of a flight ----------

  // Shrink a one-line Phaser text until it fits `maxW` px (0.11.3: long airport and biome names ran off the screen).
  fitText(t, maxW, base = 8, min = 5) {
    let fs = base; t.setFontSize(fs);
    while (t.width > maxW && fs > min) t.setFontSize(--fs);
    return t;
  }

  updateTexts(inIssr) {
    this.distText.setText(km(this.distancePx / WORLD.pxPerMetre));

    const toAirport = Math.round(this.nextAirport.worldX - this.distancePx);
    if (this.state === 'landing') this.nextText.setText(`Welcome to ${this.landedAt}!`);
    else if (toAirport <= 0) this.nextText.setText(`${this.nextAirport.name}: glide down to land!`);
    else if (toAirport < (this.kit.airportEarly ? 450 : 300)) this.nextText.setText(`${this.nextAirport.name} ${toAirport}m: get LOW to land!`);   // ATC (eras): the call comes sooner
    else if (toAirport < AIRPORT.signFrom) this.nextText.setText(`Next: ${this.nextAirport.name} ${km(toAirport)}`);
    else if (this.missedSign && this.gameTime < this.missedSign.until) this.nextText.setText(`${this.missedSign.text} ${km(toAirport)}`);
    else this.nextText.setText('');
    this.fitText(this.nextText, WIDTH - 12);
    // The mission line: what this flight is for.
    const mis = this.school ? null : currentMission(this.save);
    this.missionText.setText(mis && this.state !== 'over' ? mis.progress(this) : '');

    if (inIssr) this.hintText.setText(this.isDay ? 'ICY AIR! shade: cooler' : 'ICY AIR! heat trapped!');
    else if (this.inTurb) this.hintText.setText('TURBULENCE! tap early');
    else this.hintText.setText('');

    const forest = 'FOREST FULL!';   // one short line (the meter shows the rest; longer text ran into it): FULL beats the soil hint
    const soilSoon = this.plots.length > 0 || this.distancePx >= PARCEL.firstAt - WIDTH;   // no hint before any soil can appear
    this.parcelText.setText(this.kit.tree && this.state !== 'over' ? (this.forestFull ? forest : this.parcels && soilSoon ? 'drop on soil!' : '') : '');
    const showDrop = this.kit.tree && this.parcels > 0 && this.state === 'playing' && !this.frozen && !['ocean', 'ice'].includes(this.regionNow);   // nothing to plant on (0.10.7)
    this.setDropVisible(showDrop);
    if (showDrop) this.fitText(this.dropLabel.setText(`SEND A\nSEED x${this.parcels}`), this.dropBox.w - 8, 7);   // 0.11.3: one short fixed label (the tree's name spilled out of the button)
    this.cargoText.setText(`${this.cargo}`);
    this.crysText.setText(`${this.crystals}`);
    this.multText.setText(this.airportsSkipped ? `x${this.multiplier()}` : '');
    this.multText.x = this.crysText.x + this.crysText.width + 6; this.multText.y = this.crysText.y;   // row 2, clear of the distance
  }

  finish({ landed = false, reason = '', sound = 'crash' }) {
    this.setState('over');
    this.co2Rate = 0;
    this.hud.setCo2(0);
    this.ui.hideToast();
    this.hintText.setText('');
    this.parcelText.setText('');
    this.setDropVisible(false);
    this.aimGfx.clear();
    this.autoText.setVisible(false);
    if (!landed) {
      this.cameras.main.shake(200, 0.012);
      this.cameras.main.flash(150, 255, 80, 80);
      buzz([120, 40, 200]);
      this.burst(this.plane.x + PLANE.w / 2, this.plane.y + PLANE.h / 2, 0x888888, 14);
      sfx[sound]();
    }

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
    // Mission: done or not, and move on to the next one.
    // The journey: landing moves you to that city; reaching LONDON again (or passing it) is a lap.
    // Times round the Earth (flownKm / EARTH_KM, the real size of the Earth): `lap` = one more this flight.
    const flownBefore = this.save.flownKm || 0, flown = this.school ? flownBefore : flownBefore + m;
    const lap = !this.school && Math.floor(flown / EARTH_KM) > Math.floor(flownBefore / EARTH_KM);
    // A new part of the world: landing in a region you had never landed in before.
    const landReg = landed && city(this.landedAt) ? city(this.landedAt).region : null;
    const newRegion = !!landReg && !this.school && !(this.save.visited || []).some(n => city(n) && city(n).region === landReg);
    const mission = this.school ? null : currentMission(this.save);
    const partial = { landed, landedAt: this.landedAt, lap, newRegion, cargo: this.cargo, nightOwl: this.nightOwl, airportsSkipped: this.airportsSkipped, sunBlocked: this.sunBlocked, planted: this.planted, crystals: this.crystals,
      crash, crashes: this.save.crashes || {}, distance: m, kinds: this.speciesPlanted.size, bumped: this.bumped, goldens: this.goldens,
      onRunway: this.parcelOnRunway, forestFull: this.forestFullSaid, projects: projectsDone(this.save).map(p => p.id) };
    const missionDone = !!(mission && mission.check(partial, this.save));
    const missionIndex = missionDone ? missionIndexOf(mission) : null;
    if (missionDone) completeMission(this.save, mission);
    const nextMission = this.school ? null : currentMission(this.save);
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
    this.save.seeds += gained;
    this.save.crystals = (this.save.crystals || 0) + this.crystals;   // always kept: smart flying counts even if you crash
    // The first safe landing earns one free upgrade, to show what the hangar is for.
    if (landed && !this.save.freeGiven) { this.save.freeGiven = true; this.save.freeUpgrade = true; }
    // Missions and badges are prizes to CLAIM, not paid now (src/rewards.js, src/badges.js).
    const rewards = this.school ? [] : addPrizes(this.save, { ...partial, sunBlocked: this.sunBlocked, heat, distance: m, lap, dodges: this.dodgesTotal,
      kinds: this.speciesPlanted.size, heatTrapped: this.heatTrapped }, missionDone ? mission : null, missionIndex);
    const newBadges = rewards.filter(p => p.kind === 'badge').map(p => p.id);
    writeSave(this.save);

    this.result = {
      landed, landedAt: this.landedAt, from: this.homeName, lap, reason, distance: m, heat, co2PerKm: Number(perKm),
      sunBlocked: Math.round(this.sunBlocked * 10) / 10, heatTrapped: Math.round(this.heatTrapped * 10) / 10,
      breakdown: { ...this.breakdown }, earned, gained, newBadges, newRecord, planted: this.planted,
      cargo: this.cargo, crystals: this.crystals, school: !!this.school, airportsSkipped: this.airportsSkipped, nightOwl: this.nightOwl, mult,
      flyMinutes: this.school ? 0 : (this.flySeconds || 0) / 60, eraOpened, newPlane: newPlane ? newPlane.name : null,
      rewards, foundIds: [...(this.foundIds || [])],
      mission: mission ? { title: mission.title, done: missionDone, doneText: missionDone ? mission.done || '' : '', fail: missionDone ? '' : mission.fail(partial, this.save), next: nextMission ? nextMission.title : null, last: !nextMission && missionDone } : null, natureGain, natureGains, bio: biodiversity(this.save),
    };
    if (this.school) this.school.finished(this.result);
    else sendFlight({   // to the online boards, if this device has a pilot name; queued when offline
      landed, distance_m: m, shade: Math.max(0, -this.sunBlocked), heat_trapped: this.heatTrapped, night_dodges: this.dodgesTotal,
      crystals: this.crystals, plane_co2: this.kit.co2Cruise, species: [...this.speciesPlanted], mission_done: missionDone,
      lap, crash,
    });
    if (gained) this.time.delayedCall(landed ? 600 : 0, () => sfx.coin());
    this.time.delayedCall(landed ? 900 : 1100, () => this.ui.showResults(this.result));
  }
}
