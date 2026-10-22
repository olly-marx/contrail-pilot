import {
  km, WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS,
  TAKEOFF, AIRPORT, CRYSTALS, DAYNIGHT, RADIATION, CLIMATE, TOKENS, CARGO, PARCEL, HAZARDS,
  FOREST,
} from './config.js';
import { School } from './school.js';
import { Hud } from './Hud.js';
import { loadout } from './upgrades.js';
import { sendFlight } from './online.js';
import { ROUTE, cityAt, legKm } from './route.js';
import { addPrizes } from './rewards.js';
import { writeSave } from './save.js';
import { sfx, buzz } from './sound.js';
import { current as currentMission, complete as completeMission, indexOf as missionIndexOf, MISSIONS } from './missions.js';
import { PART_LINES, natureBadge, natureLevels } from './planeparts.js';
import { WILDLIFE, REGIONS } from './wildlife.js';
import { LANDMARKS } from './landmarks.js';
import { SPECIES, biodiversity, plantGain, hasProject, natureCooling, projectsDone, PROJECTS, wildlifeScene } from './nature.js';

const SKY_H = HEIGHT - GROUND_H;
const GRACE_MS = 1500;   // breather after a pop-up closes: the autopilot flies, then hands back
const FONT = 'Pixel, monospace';

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function lerpColour(a, b, t) {
  const ca = Phaser.Display.Color.IntegerToColor(a), cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

// "World x" of something = the scroll distance at which its left edge reaches the plane.
// Screen x = PLANE.x + worldX - distancePx.

// How a flight ended, for the online Oops boards (from the crash message shown to the player).
const LANDMARK_SCALE = 2;   // the user: bigger landmarks (whole numbers keep the pixels crisp)

const crashKind = reason => /Bird/.test(reason) ? 'bird' : /Restricted/.test(reason) ? 'nofly' : /Storm/.test(reason) ? 'storm'
  : /too hot/.test(reason) ? 'overheat' : 'ground';

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    this.load.image('plane', 'assets/plane.png');
    for (const [id, n] of Object.entries(PART_LINES)) for (let i = 1; i <= n; i++) this.load.image(`plane-${id}-${i}`, `assets/plane-${id}-${i}.png`);
    for (let i = 1; i <= 4; i++) this.load.image(`plane-nature-${i}`, `assets/plane-nature-${i}.png`);
    this.load.image('plane-lights', 'assets/plane-lights.png');
    for (let i = 0; i < 3; i++) this.load.image(`plane-shimmer-${i}`, `assets/plane-shimmer-${i}.png`);
    for (let i = 0; i < 4; i++) this.load.image(`plane-sparkle-${i}`, `assets/plane-sparkle-${i}.png`);
    // Background strips: drawn by tools/art/make_background.py, 288 px wide, tile seamlessly.
    for (const k of ['clouds', 'hills', 'city', 'ground']) this.load.image(k, `assets/${k}.png`);
    for (const c in LANDMARKS) this.load.image(LANDMARKS[c].key, `assets/${LANDMARKS[c].key}.png`);   // art session: one per city
    // Sprites: drawn by tools/art/make_sprites.py.
    for (const k of ['storm-body', 'storm-top', 'storm-bottom', 'token', 'token-gold', 'chute', 'crate', 'bird-0', 'bird-1', 'stork',
      'plot-left', 'plot-mid', 'plot-right', 'turb', 'crystal', 'bolt-0', 'bolt-1', 'bolt-2', 'storm-flash', 'storm-flash-top', 'storm-flash-bottom', 'plot-sign', 'plot-arrow', 'runway', 'tower', 'issr-tile', 'nofly', 'face-happy', 'face-ok', 'face-hot', 'face-melting'])
      this.load.image(k, `assets/${k}.png`);
    // Background wildlife: two frames each (legs / wings).
    // Animals and birds: every species in src/wildlife.js (the loop below).
    // Every species the art session has drawn (src/wildlife.js, generated): new ones load themselves.
    for (const w of WILDLIFE) if (w.sprite) for (let f = 0; f < (w.frames || 2); f++) { const k = `${w.sprite}-${f}`; if (!this.textures.exists(k)) this.load.image(k, `assets/${k}.png`); }   // trees: 3 growth stages
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
    this.builtWith = JSON.stringify([this.save.levels, this.save.habitat]);   // scenery depends on upgrades (e.g. meadow flowers)
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
    this.bumped = false;               // shaken by turbulence
    this.parcelOnRunway = false;       // a parcel landed on a runway (oops!)
    this.speciesPlanted = new Set();   // kinds of tree planted this flight (for the online boards)
    this.lastHalf = 'day';
    this.night = { started: false, trappedAtStart: 0 };
    this.nightOwl = false;
    this.warnedHot = false;

    // The journey (src/route.js): take off from the city you last landed in; flight school always
    // starts in LONDON. airportIndex = airports passed so far this flight.
    this.startCity = this.autostart === 'school' || !this.save.tutorialDone ? 0 : (this.save.city || 0);
    this.homeName = cityAt(this.startCity).name;
    this.airportIndex = 0;
    this.airportsSkipped = 0;
    this.nextAirport = this.airportAhead(0);

    // ---- draw order: sky scenery, ISSRs, contrails, light, storms, plane, ground, HUD ----
    this.skyGfx = this.add.graphics();   // stars, sun, moon
    this.stars = Array.from({ length: 45 }, () => ({ x: Phaser.Math.Between(0, WIDTH), y: Phaser.Math.Between(0, SKY_H - 120), tw: Math.random() * 6 }));
    this.cloudsFar = this.add.tileSprite(0, 60, WIDTH, 40, 'clouds').setOrigin(0).setAlpha(0.55);
    this.hills = this.add.tileSprite(0, SKY_H - 46, WIDTH, 46, 'hills').setOrigin(0);
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
    this.planeSprite = this.add.image(0, 0, 'plane');
    this.buildPlaneParts();

    this.ground = this.add.tileSprite(0, SKY_H, WIDTH, GROUND_H, 'ground').setOrigin(0);
    this.groundFx = this.add.graphics();   // contrail shadows (day) and trapped-heat glow (night)
    this.flowers = hasProject(this.save, 'meadow') ? this.add.tileSprite(0, SKY_H + 6, WIDTH, 4, 'flowers').setOrigin(0) : null;
    this.decorLayer = this.add.layer();
    this.wildLayer = this.add.layer();     // cows, sheep and wild animals
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

  startSchool() {
    // Rebuild unless this scene is fresh, built with these upgrades AND in LONDON (school starts there).
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat]) || this.startCity !== 0) { this.scene.restart({ go: true, mode: 'school' }); return; }
    this.school = new School(this, this.ui);
    this.nextAirport = { worldX: 1e9, name: cityAt(1).name, spawned: false };
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
    this.nextAirport = { worldX: this.distancePx + legKm(this.startCity), name: cityAt(this.startCity + 1).name, spawned: false };
    this.nextStormAt = this.distancePx + WIDTH + 100;
    this.nextIssrAt = this.distancePx + 100;
    this.nextTokenAt = this.distancePx + 100;
    this.startGrace();
  }

  startFlight() {
    // Rebuild if this scene is from an old flight, or upgrades changed the scenery since.
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat])) { this.scene.restart({ go: true }); return; }
    // Upgrades may have been bought in the hangar since this scene was built.
    this.kit = loadout(this.save);
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.setState('takeoff');
    this.rollSpeed = 0;
    this.airborne = false;
    this.cargoIcon.setVisible(true); this.crysIcon.setVisible(true); this.crysText.setVisible(true);
    this.bioStart = biodiversity(this.save);   // flights is counted at lift-off: going back to the menu from the runway is not a flight
  }

  // The MENU button / Esc while parked on the runway: back to the title, nothing lost, no flight counted.
  backToMenu() {
    if (this.state !== 'takeoff' || this.airborne || this.rollSpeed >= 5 || this.school) return;   // parked only: never mid-roll
    this.ui.setRunwayBack(false);
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
      this.time.delayedCall(Phaser.Math.Between(a, b), () => { if (this.state === 'playing') this.applyFlap(); });
      return;
    }
    this.applyFlap();
  }

  applyFlap() {
    this.graceUntil = 0;   // flying again ends the breather
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
    } else if (this.state === 'playing' && this.inGrace()) {
      const target = this.autopilotTarget();
      this.plane.vy = Phaser.Math.Clamp((target - this.plane.y) * 4, -180, 180);
      this.plane.y += this.plane.vy * dt;
      this.planeSprite.setAlpha(1);
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
    this.ui.setRunwayBack(parked && !this.school && !this.frozen);
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
      if (stage !== t.stage) { t.stage = stage; if (t.sprite.active) t.sprite.setTexture(`tree-${t.kind}-${stage}`); }
      const cool = forestFull ? 0 : SPECIES[t.kind].coolPerStage[stage] * FOREST.early * (stage === 2 ? 1 + oldWood : 1) * dt;
      this.forestStored += cool;
      if (stage === 2 && t.sprite.active) t.sprite.setScale(1 + 0.15 * oldWood);   // old trees keep getting bigger
      this.heat -= cool;
      this.breakdown.trees += cool;
      this.treeFeedback += cool;
    }
    const landFull = this.landStored >= FOREST.landStore * projectsDone(this.save).length / PROJECTS.length;
    const land = landFull ? 0 : natureCooling(this.save) * dt;   // rewilded land soaks up a little CO2, until it is full
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
      i.setAlpha(this.issrAlpha(i, box, inside));
      // In your path: level with the plane while it was coming up ahead, so you had to climb or dive.
      const ahead = i.x - (box.x + box.w), cy = box.y + box.h / 2;
      if (ahead > 0 && ahead < 120 && cy >= i.y && cy <= i.y + i.height) i.inPath = true;
      // Dodged: icy air that was in your path at night, passed without making a contrail.
      if (!i.scored && i.x + i.width < box.x) {
        i.scored = true;
        if (i.inPath && !i.entered && !this.isDay && this.state === 'playing' && !this.school && this.nightDodges < this.kit.dodgesPerNight) {   // Weather Forecast: more per night
          this.nightDodges++; this.dodgesTotal++;
          this.earnCrystals(this.kit.dodgeCrystals, 'dodged icy air!');   // Crystal Lens: more per dodge
        }
      }
      i.tilePositionY += dt * 4;
    }
    this.updateTokens(dt, box);
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
    if (this.inGrace()) { this.updateTexts(inIssr); return; }   // the breather: nothing can crash you
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
  lateRamp() { return this.isDay ? 1 : 1 + CLIMATE.latePer10k * Math.max(0, this.distancePx - CLIMATE.lateFrom) / 10000; }

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
    const tilt = flying ? Phaser.Math.Clamp(this.plane.vy / 600, -PLANE.maxTilt, PLANE.maxTilt) : 0;
    this.planeSprite.setRotation(this.state === 'takeoff' && this.airborne ? -0.15 : tilt);
    this.syncPlaneParts();
  }

  // One image per owned upgrade part, plus the nature badge, lights, engine shimmer and sparkles.
  buildPlaneParts() {
    const lv = id => (this.save.levels || {})[id] || 0, add = (key, kind) => { const img = this.add.image(0, 0, key); this.planeParts.push({ img, kind }); return img; };
    this.planeParts = [];
    for (const id of Object.keys(PART_LINES)) if (lv(id)) add(`plane-${id}-${Math.min(lv(id), PART_LINES[id])}`, id === 'gear' ? 'gear' : 'part');
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
    const w = WILDLIFE.find(x => x.sprite === sprite);
    if (!w) return;
    this.save.found = this.save.found || {};
    if (this.save.found[w.id]) return;
    this.save.found[w.id] = Date.now();
    this.foundThisFlight = (this.foundThisFlight || 0) + 1;
    this.time.delayedCall(1500, () => this.popup(WIDTH / 2, SKY_H - 60, `NEW ANIMAL: ${w.name.toUpperCase()}!`, '#ffe15a', 14));
  }

  buildWildlife() {
    this.wildlife = wildlifeScene(this.save);
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
      const t = this.add.image(atX, SKY_H + 1, `tree-${pick(W.treeKinds)}-2`).setOrigin(0.5, 1).setScale(Phaser.Math.FloatBetween(0.9, 1.1));
      this.farTreeLayer.add(t); this.life.push({ img: t, k: 1 });
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
    if (due('wild', W.wildPerScreen)) animal(pick(W.wildKinds));
    if (due('bird', W.birdsPerScreen)) {
      const b = pick(W.skyKinds);
      const img = this.add.image(atX, Phaser.Math.Between(70, SKY_H - 70), `${b}-0`).setOrigin(0.5).setAlpha(0.85);
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
    this.hills.tilePositionX += dx * 0.3;
    this.city.tilePositionX += dx * 0.55;
    this.landmarks = this.landmarks.filter(l => { l.x -= dx * 0.55; if (l.x + l.width < -10) { l.destroy(); return false; } return true; });
    this.ground.tilePositionX += dx;
    if (this.hedge) this.hedge.tilePositionX += dx;
    if (this.flowers) this.flowers.tilePositionX += dx;
    // Ponds (with a beaver dam once beavers are back) and storks gliding far away.
    if (this.distancePx >= this.nextDecorAt && hasProject(this.save, 'pond') && dx > 0) {
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
    if (hasProject(this.save, 'storks') && dx > 0 && Math.random() < 0.002 && this.storks.length < 2) {
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
    const x = Math.round(30 + f * (WIDTH - 60)), y = Math.round(70 - Math.sin(f * Math.PI) * 30);
    if (isDay) {
      g.fillStyle(COLOURS.sun, 0.35).fillRect(x - 9, y - 7, 18, 14).fillRect(x - 7, y - 9, 14, 18);
      g.fillStyle(COLOURS.sun).fillRect(x - 6, y - 5, 12, 10).fillRect(x - 5, y - 6, 10, 12);
    } else {
      g.fillStyle(0xf4f1e8, 0.25).fillRect(x - 8, y - 6, 16, 12).fillRect(x - 6, y - 8, 12, 16);
      g.fillStyle(0xf4f1e8).fillRect(x - 5, y - 4, 10, 8).fillRect(x - 4, y - 5, 8, 10);
      g.fillStyle(0xc9c4b4).fillRect(x - 2, y - 2, 2, 2).fillRect(x + 2, y + 1, 2, 2).fillRect(x - 3, y + 2, 1, 1);  // craters
    }
    const tint = lerpColour(lerpColour(0xffffff, 0x4a5a80, n), 0xff7a5a, (this.heatLevel ? this.heatLevel() : 0) * 0.7);
    this.hills.setTint(tint);
    this.city.setTint(tint);
    for (const l of this.landmarks) l.setTint(tint);
    this.ground.setTint(tint);
    this.cloudsFar.setAlpha(0.55 - 0.35 * n);
  }

  // ---------- airports ----------

  addRunway(worldX, name) {
    const x = PLANE.x + worldX - this.distancePx;
    const strip = this.add.tileSprite(x, SKY_H, AIRPORT.runwayLen, 6, 'runway').setOrigin(0);   // centre dash every 20 px
    const parts = [strip];
    // Control tower at the far end.
    parts.push(this.add.image(x + AIRPORT.runwayLen - 17, SKY_H, 'tower').setOrigin(0, 1));
    parts.push(this.add.text(x + AIRPORT.runwayLen / 2, SKY_H + 8, name,
      { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0));
    this.runwayLayer.add(parts);
    this.runways.push({ worldX, name, parts, strip });
    // The city's landmark, in the skyline (it scrolls at 0.55 x the ground): start it where it will
    // stand just behind the runway's middle as the runway passes the middle of the screen.
    const lm = LANDMARKS[name];
    if (lm && this.textures.exists(lm.key)) {
      const d = x + AIRPORT.runwayLen / 2 - WIDTH / 2;
      const img = this.add.image(WIDTH / 2 + 24 + 0.55 * d, SKY_H, lm.key).setOrigin(0.5, 1).setScale(LANDMARK_SCALE);
      this.landmarkLayer.add(img); this.landmarks.push(img);
    }
  }

  runwayUnder(box) {
    return this.runways.find(r => r.strip.x <= box.x && box.x + box.w <= r.strip.x + AIRPORT.runwayLen && r.name !== this.homeName);
  }

  // The k-th airport ahead of the start city (0 = the next one), at worldX `from` + that leg.
  airportAhead(k, from = 0) {
    return { worldX: from + legKm(this.startCity + k), name: cityAt(this.startCity + k + 1).name, spawned: false };
  }

  inStormClearZone(worldX) {
    const a = this.nextAirport.worldX;
    return worldX + STORMS.width > a - AIRPORT.stormClearBefore && worldX < a + AIRPORT.runwayLen + AIRPORT.stormClearAfter;
  }

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
  oldWood() {
    const ramp = Phaser.Math.Clamp((this.distancePx - FOREST.from) / FOREST.span, 0, 1);
    return ramp * FOREST.boost * Math.pow(Math.min(1, this.speciesPlanted.size / FOREST.kinds), FOREST.power);
  }
  // A forest can only soak up so much CO2 in one flight (more with more kinds); then it is full.
  forestStore() { return Math.max(FOREST.storeMin, FOREST.store * Math.pow(Math.min(1, this.speciesPlanted.size / FOREST.kinds), FOREST.storePower)); }

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
    const sprite = this.add.image(cx, SKY_H + 1, `tree-${kind}-0`).setOrigin(0.5, 1).setScale(0.2);
    this.treeLayer.add(sprite);
    this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.easeOut' });
    plot.parts.push(sprite);
    this.trees.push({ sprite, kind, plantedAt: this.elapsed, stage: 0 });
    this.planted++;
    this.speciesPlanted.add(kind);
    this.burst(cx, SKY_H - 2, 0x8dffb0, 12);
    this.burst(cx, SKY_H - 2, 0xffe15a, 6);
    // Biodiversity: a new kind of tree is a big boost; the same kind again adds less.
    const first = !(this.save.planted[kind] > 0);
    const gain = plantGain(this.save, kind);
    this.save.planted[kind] = (this.save.planted[kind] || 0) + 1;
    this.popup(cx, SKY_H - 24, `${SPECIES[kind].name.toUpperCase()} PLANTED!`, '#8dffb0', 8);
    this.time.delayedCall(450, () => this.popup(cx, SKY_H - 36, `+${gain.toFixed(1)} biodiversity${first ? ' (new kind!)' : ''}`, first ? '#ffe15a' : '#b8f5c8'));
    sfx.plant();
    buzz(30);
    // Tree school, steps 2 and 3 (step 1 is the first soil patch): what a tree does for the
    // climate, then Biodiversity. A new native kind's fact waits until both are done.
    const taught = this.explain('tree-2', '<b>TREE SCHOOL</b><br>Your tree takes <b>CO2</b> out of the air as it grows. Bigger trees take a bit more.<br>But trees are slow! A <b>cleaner plane</b> and <b>smart contrails</b> help the Earth much more.', 'lesson-tree-co2');
    if (taught) this.explainWhenClear('tree-3', '<b>TREE SCHOOL</b><br>Your <b>Biodiversity</b> meter shows how full of life your land is.<br><b>Different kinds</b> of trees bring much more wildlife than lots of the same kind. Fill it up!', 'lesson-biodiversity');
    else if (first && SPECIES[kind].native) this.explain(`x-species-${kind}`, `<b>${SPECIES[kind].name}!</b> ${SPECIES[kind].fact}<br>New kinds of tree fill your <b>Biodiversity</b> meter the most.`);
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
      this.explain('x-multiplier', `You flew past ${na.name}! That is fine: the next airport is ${km(legKm(this.startCity + this.airportIndex))} ahead.<br>Your <b>landing bonus</b> is now <b>x1.5</b> (top left). Each airport you pass makes it bigger. But crash, and you lose ALL your seeds!`, 'lesson-bonus');
      this.nextAirport = this.airportAhead(this.airportIndex, na.worldX);
      this.missedSign = { text: `Passed ${na.name}. Next: ${this.nextAirport.name}`, until: this.gameTime + 4000 };
    }
    const toAirport = this.nextAirport.worldX - this.distancePx;
    if (this.school) return;   // flight school places everything itself
    if (toAirport < 400 && toAirport > 0 && !this.school) this.ui.tipOnce('airport', 'Airport ahead!', 'Get low as you reach the grey runway: the plane lands itself. Or fly on for more seeds!', 'good', 3.5);

    if (this.kit.tree && this.distancePx >= this.nextPlotAt) {
      const x = WIDTH + 10;
      const onRunway = this.runways.some(r => x + this.kit.plotW > r.strip.x - 10 && x < r.strip.x + AIRPORT.runwayLen + 10)
        || this.nextAirport.worldX - this.distancePx < WIDTH - PLANE.x + 40 && this.nextAirport.worldX + AIRPORT.runwayLen - this.distancePx > WIDTH - PLANE.x - this.kit.plotW - 40;
      if (!onRunway) this.addPlot(x);
      this.nextPlotAt += Phaser.Math.Between(PARCEL.plotEvery[0], PARCEL.plotEvery[1]);
    }
    if (this.school) return;   // flight school places everything itself

    if (this.distancePx >= this.nextStormAt - WIDTH) {
      const worldX = this.distancePx + (WIDTH + 10 - PLANE.x);
      if (!this.inStormClearZone(worldX)) this.addStormPair();
      this.nextStormAt += STORMS.spacing;
    }
    if (this.distancePx >= this.nextIssrAt) {
      if (Math.random() < Math.min(1, ISSR.spawnChance * this.lateRamp())) this.addIssr();   // more icy air on long flights
      this.nextIssrAt += ISSR.spawnEvery;
    }
    const T = HAZARDS.turbulence;
    if (this.distancePx >= this.nextTurbAt) {
      if (Math.random() < T.chance) {
        const h = Phaser.Math.Between(T.minH, T.maxH);
        this.turbs.push({ x: WIDTH + 10, w: Phaser.Math.Between(T.minW, T.maxW), y: Phaser.Math.Between(30, SKY_H - 60 - h), h });
        this.newHazard('turbulence', 'NEW HAZARD: TURBULENCE', 'Wavy lines = bumpy air! Inside it your plane gets pushed about and your taps work a little late. Fly over or under it!');
      }
      this.nextTurbAt += T.every;
    }
    const B = HAZARDS.birds;
    if (this.distancePx >= this.nextBirdsAt) {
      if (Math.random() < B.chance) this.addFlock();
      this.nextBirdsAt += B.every;
    }
    if (this.distancePx >= this.nextTokenAt) {
      const chance = Math.min(TOKENS.maxChance, TOKENS.chance + TOKENS.chancePerKm * this.distancePx / 1000);
      if (Math.random() < chance) this.addToken();
      this.nextTokenAt += TOKENS.spawnEvery;
    }
  }

  addFlock(x = WIDTH + 20, y = null) {
    const B = HAZARDS.birds, n = Phaser.Math.Between(B.flock[0], B.flock[1]);
    if (y === null) {   // never a flock in a storm gap just as the plane goes through it (10 tries, else skip)
      for (let k = 0; k < 10 && y === null; k++) { const t = Phaser.Math.Between(60, SKY_H - 90); if (!this.flockBlocksGap(x, t, n)) y = t; }
      if (y === null) return;
    }
    const birds = [];
    for (let i = 0; i < n; i++) {
      // A loose V shape.
      const ox = Math.abs(i - (n - 1) / 2) * 13, oy = (i - (n - 1) / 2) * 9;
      const img = this.add.image(x + ox, y + oy, 'bird-0').setOrigin(0).setFlipX(true);   // facing the plane
      this.birdLayer.add(img);
      birds.push({ img, ox, oy });
    }
    this.birds.push({ birds, x, y, phase: Math.random() * 6 });
    this.newHazard('birds', 'NEW HAZARD: BIRDS', 'A flock of birds is flying at you! Fly over or under them. Hitting a bird ends your flight.');
  }

  // A flock at (x, y) flies at speed + extraSpeed; each storm on screen at speed. When the plane
  // reaches a storm, would the flock be near the plane and inside that storm's gap?
  flockBlocksGap(x, y, n) {
    const B = HAZARDS.birds, v = Math.max(1, this.speed), half = (n - 1) / 2;
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
      if (!this.hazardSeen[id]) { this.hazardSeen[id] = true; this.popup(WIDTH / 2, 70, `${{ noFly: 'No-fly zone', turbulence: 'Turbulence', birds: 'Birds' }[id]} ahead!`, '#ff8080'); }
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
        this.plane.vy += Phaser.Math.Between(-T.bump, T.bump);
        this.bumped = true;
        this.bumpIn = Phaser.Math.FloatBetween(T.bumpEvery[0], T.bumpEvery[1]);
        this.cameras.main.shake(80, 0.004);
      }
      const j = Phaser.Math.Between(-1, 1);
      this.planeSprite.x += j;
      for (const o of this.planeParts) o.img.x += j;
    }

    // Birds fly towards you, bobbing up and down; hitting one ends the flight.
    const B = HAZARDS.birds;
    for (const f of this.birds) {
      f.x -= B.extraSpeed * dt;
      // Birds steer out of a storm gap the plane is about to fly through (a flock there would
      // leave no way past). The spawn check usually prevents it; this catches the rest.
      const n = f.birds.length, half = (n - 1) / 2, top = f.y - half * 9 - 4 - B.wobble, bottom = f.y + half * 9 + 16 + B.wobble;
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
  alphaMask(key) {
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
  stormPixelsHit(st, enough) {
    const r0 = st.rects[0], r1 = st.rects[1], W = r0.width;
    const sp = this.planeSprite;
    if (sp.x + 40 < r0.x || sp.x - 40 > r0.x + W) return 0;   // not level with it
    const topH = r0.height, botY = r1.y;
    const cap = this.alphaMask('storm-top'), capB = this.alphaMask('storm-bottom'), body = this.alphaMask('storm-body');
    let n = 0;
    for (const [x, y] of this.planePixels()) {
      const lx = x - r0.x;
      if (lx < 0 || lx >= W) continue;
      let solid;
      if (st.noFly) solid = y < topH || y >= botY;   // a no-fly zone is a solid block
      else if (y < topH) solid = y >= topH - 10 ? capB.at(lx, y - (topH - 10)) : body.at(lx, y % body.h);
      else if (y >= botY) solid = y < botY + 10 ? cap.at(lx, y - botY) : body.at(lx, (y - botY - 10) % body.h);
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
        y = Phaser.Math.Between(gapTop + 12, gapBot - 26);
        x = storm.rects[0].x + STORMS.width / 2 - 7;
      } else if (issr && Math.random() < 0.4) {
        y = Phaser.Math.Between(issr.y + 4, issr.y + issr.height - 18);
      } else {
        y = Phaser.Math.Between(50, SKY_H - 70);
      }
    }
    if (golden === null) golden = this.distancePx > TOKENS.goldenAfter && Math.random() < TOKENS.goldenChance;
    if (golden) this.time.delayedCall(700, () => this.explain('x-gold', 'A <b>GOLDEN seed</b>! It is worth <b>3 seeds</b>. They only appear on long flights.', 'lesson-gold'));
    const img = this.add.image(x, y, golden ? 'token-gold' : 'token').setOrigin(0);
    this.fxLayer.add(img);
    this.tokens.push({ img, baseY: y, phase: Math.random() * 6, value: golden ? 3 : 1 });
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

  addStormPair() {
    if (this.distancePx < WORLD.warmup) this.warmStorms = this.stormCount;   // gaps only narrow after the warm-up
    let gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * (this.stormCount - (this.warmStorms || 0)));
    const nf = HAZARDS.noFly;
    const noFly = this.distancePx >= nf.from && Math.random() < nf.chance;
    if (noFly) gap = Math.max(nf.minGap, gap - nf.gapLess);
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    const w = noFly ? nf.width : STORMS.width, x = WIDTH + 10;
    // Leave a clear lane past any icy air already in this column (20 tries, else no storm this time).
    let gapY = null;
    for (let k = 0; k < 20 && gapY === null; k++) { const t = Phaser.Math.Between(lo, hi); if (this.laneClear(x, w, t - gap / 2, t + gap / 2)) gapY = t; }
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

  addStormPairAt(x, gapY, gap) {
    const topH = gapY - gap / 2, botY = gapY + gap / 2;
    // Collision boxes are plain rectangles; the drawn cloud is a tiled body plus a rounded cap.
    const top = { x, y: 0, width: STORMS.width, height: topH };
    const bottom = { x, y: botY, width: STORMS.width, height: SKY_H - botY };
    const parts = [
      this.add.tileSprite(x, 0, STORMS.width, Math.max(1, topH - 10), 'storm-body').setOrigin(0),
      this.add.image(x, topH - 10, 'storm-bottom').setOrigin(0),
      this.add.tileSprite(x, botY + 10, STORMS.width, Math.max(1, SKY_H - botY - 10), 'storm-body').setOrigin(0),
      this.add.image(x, botY, 'storm-top').setOrigin(0),
    ];
    this.stormLayer.add(parts);
    this.storms.push({ rects: [top, bottom], parts, flashUntil: 0 });
    this.stormCount++;
  }

  // Now and then a storm flickers with lightning: the cloud lights up (flash overlays drawn
  // pixel-identical to the storm) and a bolt hangs from the top column's cap, twice in quick
  // succession. Purely for looks: bolts are not in the collision check.
  updateLightning(time) {
    for (const st of this.storms) {
      if (st.noFly) continue;
      if (!st.flash && Math.random() < 0.002 && st.rects[0].x < WIDTH) this.flashStorm(st, time);
      if (st.flash) {
        const t = time - st.flash.t0, on = t < 90 || (t > 150 && t < 230);   // flicker: on, off, on
        st.flash.fx.forEach(o => o.setVisible(on));
        if (t >= 230) { st.flash.fx.forEach(o => o.destroy()); st.parts = st.parts.filter(o => !st.flash.fx.includes(o)); st.flash = null; }
      }
    }
  }

  flashStorm(st, time) {
        const [bodyT, capT, bodyB, capB] = st.parts, x = st.rects[0].x, topH = st.rects[0].height;
        const fx = [
          this.add.tileSprite(bodyT.x, bodyT.y, bodyT.width, bodyT.height, 'storm-flash').setOrigin(0),
          this.add.image(capT.x, capT.y, 'storm-flash-bottom').setOrigin(0),
          this.add.tileSprite(bodyB.x, bodyB.y, bodyB.width, bodyB.height, 'storm-flash').setOrigin(0),
          this.add.image(capB.x, capB.y, 'storm-flash-top').setOrigin(0),
          this.add.image(x + 22 + Phaser.Math.Between(-8, 8), topH - 2, `bolt-${Phaser.Math.Between(0, 2)}`).setOrigin(0.5, 0),
        ];
        this.stormLayer.add(fx);
        st.parts.push(...fx);   // scroll with the storm
        st.flash = { fx, t0: time };
  }


  addIssr() {
    const grow = Math.sqrt(this.lateRamp());   // long flights: bigger patches (area grows with the ramp)
    const w = Math.round(Phaser.Math.Between(ISSR.minW, ISSR.maxW) * grow);
    const h = Math.min(SKY_H - 40, Math.round(Phaser.Math.Between(ISSR.minH, ISSR.maxH) * grow)), x = WIDTH + 10;
    // Never fill a storm gap: there is always a way through without a contrail (10 tries, else skip).
    for (let k = 0; k < 10; k++) {
      const y = Phaser.Math.Between(10, SKY_H - h - 10);
      const blocks = this.storms.some(st => { const r = st.rects[0]; return r.x < x + w && r.x + r.width > x
        && !this.laneClear(r.x, r.width, r.height, st.rects[1].y, [...this.issrs, { x, y, width: w, height: h }]); });   // with the icy air already there
      if (!blocks) { this.addIssrAt(x, y, w, h); return; }
    }
  }

  // Is there still a clear lane (plane height + margin) through the gap gTop..gBot of a storm
  // column at x..x+w, past the icy air in `issrs` that overlaps the column?
  laneClear(x, w, gTop, gBot, issrs = this.issrs) {
    const lane = PLANE.h + STORMS.clearLane;
    const blocked = issrs.filter(i => i.x < x + w && i.x + i.width > x && i.y < gBot && i.y + i.height > gTop)
      .map(i => [Math.max(gTop, i.y), Math.min(gBot, i.y + i.height)]).sort((a, b) => a[0] - b[0]);
    let free = gTop;
    for (const [t, btm] of blocked) { if (t - free >= lane) return true; free = Math.max(free, btm); }
    return gBot - free >= lane;
  }

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
      const rx = Math.min(w / 2, (w / n) * Phaser.Math.FloatBetween(0.75, 1.0));
      const cx = Phaser.Math.Clamp((k + 0.5) * w / n + Phaser.Math.Between(-6, 6), rx, w - rx);
      const ry = h * Phaser.Math.FloatBetween(0.32, 0.5);
      const cy = Phaser.Math.Clamp(h / 2 + Phaser.Math.FloatBetween(-0.15, 0.15) * h, ry, h - ry);
      r.blobs.push({ cx, cy, rx, ry });
    }
    const m = this.make.graphics({ x: r.x, y: r.y }, false);
    m.fillStyle(0xffffff);
    for (const b of r.blobs) m.fillEllipse(b.cx, b.cy, b.rx * 2, b.ry * 2, 24);
    r.maskGfx = m;
    r.setMask(m.createGeometryMask());
  }

  // Is any point along the plane's middle line inside the cloud's ellipses? (x, y, w, h: its box)
  inCloud(blobs, x, y, w, h, box) {
    if (!overlaps(box, { x, y, w, h })) return false;
    const py = box.y + box.h / 2 - y;
    for (let px = box.x; px <= box.x + box.w; px += 5) {
      const lx = px - x;
      if (blobs.some(b => ((lx - b.cx) / b.rx) ** 2 + ((py - b.cy) / b.ry) ** 2 <= 1)) return true;
    }
    return false;
  }
  inIssrShape(i, box) { return this.inCloud(i.blobs, i.x, i.y, i.width, i.height, box); }

  issrAlpha(i, box, inside) {
    if (inside) return ISSR.insideAlpha;
    if (i.entered) return ISSR.revealAlpha;   // once found, it stays found
    // Distance from the plane to the ISSR's nearest edge, horizontally and vertically.
    const gapX = Math.max(0, i.x - (box.x + box.w), box.x - (i.x + i.width));
    const gapY = Math.max(0, i.y - (box.y + box.h), box.y - (i.y + i.height));
    const d = Math.max(gapX, gapY);
    const reveal = this.kit.revealPx, hidden = this.kit.hiddenAlpha;
    if (d >= reveal) return hidden;
    // Three-step fade keeps the pixel-art look instead of a smooth gradient.
    const step = Math.min(3, Math.floor((1 - d / reveal) * 4));
    return hidden + (ISSR.revealAlpha - hidden) * (step / 3);
  }

  enterIssr() {
    sfx.issr();
    this.popup(this.plane.x + 25, this.plane.y - 12, 'CONTRAIL!', '#ffffff');
    if (this.isDay) this.ui.tipOnce('issrDay', 'You made a contrail!', 'This icy air turns exhaust into a cloud. In sunshine it shades the Earth: COOLER.', 'good', 4);
    else this.ui.tipOnce('issrNight', 'Contrail at night!', 'No sunlight to block, so it only traps heat: HOTTER. Climb or dive out!', 'bad', 4);
  }

  addContrail(time) {
    const s = CONTRAIL.size;
    const r = this.add.rectangle(this.plane.x - PLANE.spriteOffX, this.plane.y + PLANE.h / 2 - s / 2 + Phaser.Math.Between(-1, 1), s, s, COLOURS.contrail).setOrigin(0);
    r.born = time;
    this.contrailLayer.add(r);
    this.contrails.push(r);
  }

  scroll(dx) {
    for (const s of this.storms) { for (const p of s.parts) p.x -= dx; for (const r of s.rects) r.x -= dx; }
    this.storms = this.storms.filter(s => {
      if (s.rects[0].x + STORMS.width < -5) { s.parts.forEach(p => p.destroy()); return false; }
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
    const life = this.kit.contrailLife;
    this.contrails = this.contrails.filter(c => {
      const age = time - c.born;
      if (age > life || c.x < -10) { c.destroy(); return false; }
      c.x -= CONTRAIL.drift * dt;
      // Fade in three steps so it stays pixel-art crisp instead of a smooth gradient.
      const step = Math.floor((age / life) * 3);
      c.setAlpha([0.95, 0.65, 0.35][step]);
      return true;
    });
  }

  // ---------- day, night and radiation ----------

  dayNightPhase() {
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const p = this.clock % (D + N);
    if (p < D) return { isDay: true, toOther: Math.max(0, (p - (D - B)) / B) };
    const q = p - D;
    return { isDay: false, toOther: Math.max(0, (q - (N - B)) / B) };
  }

  updateDayNight(time) {
    const { isDay, toOther } = this.dayNightPhase();
    const from = isDay ? COLOURS.skyDay : DAYNIGHT.skyNight;
    const to = isDay ? DAYNIGHT.skyNight : COLOURS.skyDay;
    this.cameras.main.setBackgroundColor(lerpColour(from, to, toOther));
    this.isDay = isDay;
    this.drawSky(time);

    // Teach the switch the moment it starts.
    const half = isDay ? (toOther > 0 ? 'dusk' : 'day') : (toOther > 0 ? 'dawn' : 'night');
    if (half !== this.lastHalf) {
      // The banner only for the first few of each: after that the sky and the sound say it.
      const banner = k => { const seen = this.save.dayNightSeen || (this.save.dayNightSeen = {}); seen[k] = (seen[k] || 0) + 1; return seen[k] <= DAYNIGHT.bannerTimes; };
      if (half === 'dusk') { sfx.dusk(); if (banner('dusk')) this.ui.toast('Night is coming!', 'At night contrails TRAP heat. Avoid the icy air!', 'bad', 3); }
      if (half === 'dawn') { sfx.dawn(); if (banner('dawn')) this.ui.toast('Sunrise!', 'In sunshine contrails BLOCK sunlight. Find the icy air!', 'good', 3); }
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
    const { isDay, toOther } = this.dayNightPhase();
    const strength = 1 - toOther;            // fade out through dusk / dawn
    if (strength <= 0) return;

    for (const c of this.blockers) if (c.active) c.setFillStyle(COLOURS.contrail);
    this.blockers = [];

    const S = CONTRAIL.size;
    let blocked = 0;
    for (let x = RADIATION.margin; x < WIDTH - RADIATION.margin; x += RADIATION.spacing) {
      // Sun comes down, so the highest contrail in the column blocks it; heat comes up,
      // so the lowest one does.
      let hit = null;
      for (const c of this.contrails) {
        if (x < c.x || x >= c.x + S) continue;
        if (!hit || (isDay ? c.y < hit.y : c.y > hit.y)) hit = c;
      }
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
        hit.setFillStyle(isDay ? COLOURS.cool : COLOURS.warm);
        this.blockers.push(hit);
      }
    }

    if (!scoring) return;
    const rate = (isDay ? CLIMATE.sunBlockedPerCol * this.kit.vapour ** CLIMATE.dayWaterPower : CLIMATE.heatTrappedPerCol * this.kit.vapour ** CLIMATE.nightWaterPower) * blocked * strength;
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

  // ---------- heat feedback: the player should feel that warming is bad ----------
  heatLevel() { return Phaser.Math.Clamp((this.heat - 30) / 70, 0, 1); }

  drawHeatFx(time) {
    const g = this.heatFx, lvl = this.heatLevel();
    g.clear();
    if (lvl > 0) {
      // Red creeping in from the edges, in pixel steps; past 75 it beats like a heart.
      const beat = this.heat > 75 ? 0.5 + 0.5 * Math.max(0, Math.sin(time / 140)) ** 8 : 0;
      const depth = Math.round(10 + 30 * lvl + 10 * beat);
      for (let i = 0; i < 4; i++) {
        const d = Math.round(depth * (1 - i / 4)), a = (0.08 + 0.18 * lvl + 0.15 * beat) * (i + 1) / 4;
        g.fillStyle(0xd02020, a);
        g.fillRect(0, 0, WIDTH, d).fillRect(0, SKY_H - d, WIDTH, d).fillRect(0, d, d, SKY_H - 2 * d).fillRect(WIDTH - d, d, d, SKY_H - 2 * d);
      }
    }
    for (const t of [50, 75, 90]) {
      if (this.heat >= t && !this.heatWarned[t]) {
        this.heatWarned[t] = true;
        buzz(t === 90 ? [80, 60, 80, 60, 160] : t === 75 ? [80, 60, 80] : 60);
        if (t >= 75) this.popup(WIDTH - 50, 70, t === 90 ? 'DANGER!' : 'TOO HOT!', '#ff5a5a', 16);
      }
      if (this.heat < t - 10) this.heatWarned[t] = false;   // re-arm after cooling down
    }
    if (this.heat > 75 && time > this.nextBeat && this.state === 'playing') {
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
      { fontFamily: FONT, fontSize: `${size}px`, color: colour, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
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

  updateTexts(inIssr) {
    this.distText.setText(km(this.distancePx / WORLD.pxPerMetre));

    const toAirport = Math.round(this.nextAirport.worldX - this.distancePx);
    if (this.state === 'landing') this.nextText.setText(`Welcome to ${this.landedAt}!`);
    else if (toAirport <= 0) this.nextText.setText(`${this.nextAirport.name}: glide down to land!`);
    else if (toAirport < 300) this.nextText.setText(`${this.nextAirport.name} ${toAirport}m: get LOW to land!`);
    else if (toAirport < AIRPORT.signFrom) this.nextText.setText(`Next: ${this.nextAirport.name} ${km(toAirport)}`);
    else if (this.missedSign && this.gameTime < this.missedSign.until) this.nextText.setText(`${this.missedSign.text} ${km(toAirport)}`);
    else this.nextText.setText('');
    // The mission line: what this flight is for.
    const mis = this.school ? null : currentMission(this.save);
    this.missionText.setText(mis && this.state !== 'over' ? mis.progress(this) : '');

    if (inIssr) this.hintText.setText(this.isDay ? 'ICY AIR! shade: cooler' : 'ICY AIR! heat trapped!');
    else if (this.inTurb) this.hintText.setText('TURBULENCE! tap early');
    else this.hintText.setText('');

    const forest = this.trees.length ? `FOREST x${this.trees.length}` : '';
    const soilSoon = this.plots.length > 0 || this.distancePx >= PARCEL.firstAt - WIDTH;   // no hint before any soil can appear
    this.parcelText.setText(this.kit.tree && this.state !== 'over' ? (this.parcels && soilSoon ? `drop on soil! ${forest}` : forest) : '');
    const showDrop = this.kit.tree && this.parcels > 0 && this.state === 'playing' && !this.frozen;
    this.setDropVisible(showDrop);
    if (showDrop) this.dropLabel.setText(`DROP x${this.parcels}\n${SPECIES[this.treeKind()].name.toUpperCase()}`);
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
    const gained = landed ? earned.reduce((a, e) => a + e.n, 0) : 0;
    if (!landed && this.cargo) this.popup(this.plane.x + 25, this.plane.y - 14, `-${this.cargo} seeds lost!`, '#ff6a5a', 16);

    if (landed) this.save.landings = (this.save.landings || 0) + 1;
    if (landed && heat < 0 && !this.school) this.save.coolLandings = (this.save.coolLandings || 0) + 1;   // Cool Planet badge
    const crash = landed ? null : crashKind(reason);
    if (crash && !this.school) { this.save.crashes = this.save.crashes || {}; this.save.crashes[crash] = (this.save.crashes[crash] || 0) + 1; }
    // Mission: done or not, and move on to the next one.
    // The journey: landing moves you to that city; reaching LONDON again (or passing it) is a lap.
    const reached = this.startCity + this.airportIndex + 1;   // index along the loop, past ROUTE.length after LONDON
    const lap = landed && !this.school && reached >= ROUTE.length;
    const mission = this.school ? null : currentMission(this.save);
    const partial = { landed, landedAt: this.landedAt, lap, cargo: this.cargo, nightOwl: this.nightOwl, airportsSkipped: this.airportsSkipped, sunBlocked: this.sunBlocked, planted: this.planted, crystals: this.crystals,
      crash, crashes: this.save.crashes || {}, distance: m, kinds: this.speciesPlanted.size, bumped: this.bumped, goldens: this.goldens,
      onRunway: this.parcelOnRunway, forestFull: this.forestFullSaid, projects: projectsDone(this.save).map(p => p.id) };
    const missionDone = !!(mission && mission.check(partial, this.save));
    const missionIndex = missionDone ? missionIndexOf(mission) : null;
    if (missionDone) completeMission(this.save, mission);
    const nextMission = this.school ? null : currentMission(this.save);
    const natureGain = biodiversity(this.save) - (this.bioStart || 0);
    if (landed && !this.school) { this.save.city = reached % ROUTE.length; if (lap) this.save.laps = (this.save.laps || 0) + 1; }
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
      rewards,
      mission: mission ? { title: mission.title, done: missionDone, doneText: missionDone ? mission.done || '' : '', fail: missionDone ? '' : mission.fail(partial, this.save), next: nextMission ? nextMission.title : null, last: !nextMission && missionDone } : null, natureGain, bio: biodiversity(this.save),
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
