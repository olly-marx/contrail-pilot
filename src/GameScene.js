import {
  km, WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS,
  AIRPORT, CRYSTALS, DAYNIGHT, RADIATION, CLIMATE, TOKENS, PARCEL, HAZARDS,
  FOREST, POWERUPS, FEATURES,
} from './config.js';
import { School } from './school.js';
import * as P from './sim/physics.js';   // the flight's rules, shared with the sim engine
import { RULES, STORM_ART } from './sim/rules.js';   // the flight's rules as methods, shared with the sim engine
import { mask } from './sim/masks-load.js';
import { MASK_DATA } from './sim/masks.js';
import { Hud } from './Hud.js';
import { sendFlight } from './online.js';
import { flightPath, city, HOME, schoolSave } from './route.js';
import { crossingPath, completeCrossing } from './crossings.js';
import { AREAS } from './areas.js';
import { writeSave } from './save.js';
import { gateFor, MARK, GATE_RIGHT } from './gapmarkers.js';
import { tip } from './tips.js';
const TIP_MAX = 6, TIP_MIN_TAP = 2;   // a tip bubble goes by itself after TIP_MAX s; a tap ON it closes it after TIP_MIN_TAP s (never pauses the game)
import { CONTRAIL_MARGIN, GAP_HINT, UPGRADE_ART, lookFiles, stickers, fleetOf, levelEra } from './fleet.js';
import { composeOnto } from './planelook.js';
import { sfx, buzz } from './sound.js';
import { current as currentMission, MISSIONS } from './missions.js';
import { isSeason2, next as s2Next, revealed as s2Revealed } from './missions2.js';
import { PART_LINES, natureBadge, natureLevels } from './planeparts.js';
import { WILDLIFE, REGIONS } from './wildlife.js';
import { animalDir, animalPortrait } from './animalart.js';
import { LANDMARKS } from './landmarks.js';
import { SPECIES, biodiversity, plantGain, hasProject, wildlifeScene, regionSpecies } from './nature.js';
import { REGION_DATA, REGION_NAMES } from './habitats.js';

const SKY_H = HEIGHT - GROUND_H;
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
    this.wildOK0 = null;
    this.dropTips && this.tipQueue && this.dropTips();   // a scene restart keeps fields: no tip carried from the last flight   // decided once per flight (L1 completes on touchdown: no animal on the landing roll of flight 1)
    this.builtWith = JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet]);   // scenery depends on upgrades (e.g. meadow flowers)
    this.makeTextures();
    this.initFlight();   // the flight's state: kit, random stream, world, heat, path (src/sim/rules.js)

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
    this.crossGfx = this.add.graphics().setDepth(5);   // season 2: a crossing's progress bar, in place of the distance (drawCrossingBar)
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
    // "kinds 3/5": cooling, the old-wood boost and the forest store all grow with the kinds planted THIS flight.
    this.kindsText = this.meterTrees.length ? this.add.text(126, HEIGHT - 22, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#8dffb0' }).setOrigin(0, 0).setDepth(5) : null;
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



  startSchool() {
    // Rebuild unless this scene is fresh, built with these upgrades AND at the school's start (LONDON; season 2: your own city).
    // The checks run in this order on purpose: a tap before the scene's create() (slow phone, assets still loading) has no state and no
    // save yet, and must just restart (0.12.2 crashed here with `save.areas` of undefined on an iPhone).
    const stale = () => { const sp = flightPath(schoolSave(this.save)); return this.path[0] !== sp[0] || this.path[1] !== sp[1]; };
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet]) || stale()) { this.scene.restart({ go: true, mode: 'school' }); return; }
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
    const pathNow = () => (this.school ? this.path : this.save.flyCrossing ? crossingPath(this.save.flyCrossing) : flightPath(this.save.tutorialDone ? this.save : schoolSave(this.save)));   // (school: set by startSchool; lazy: a tap before create() has no save)
    if (this.state !== 'idle' || this.builtWith !== JSON.stringify([this.save.levels, this.save.habitat, this.save.fleet])
      || (p => p[0] !== this.path[0] || p[1] !== this.path[1])(pathNow())) { this.scene.restart({ go: true }); return; }
    this.takeOff();   // the flight's rules (src/sim/rules.js): kit, random stream, onto the runway
    this.cargoIcon.setVisible(true); this.crysIcon.setVisible(true); this.crysText.setVisible(true);
    this.regionBanner(this.regionNow);   // which land you take off from, and its meter
  }

  // Esc while parked on the runway: back to the title, nothing lost, no flight counted.
  backToMenu() {
    if (this.state !== 'takeoff' || this.airborne || this.rollSpeed >= 5 || this.school) return;   // parked only: never mid-roll
    this.scene.restart();
    this.ui.showTitle();
  }

  // A new mechanic, once per device: a short bubble at the top (src/tips.js) while you keep flying; it never freezes the
  // game (S1). The user, 2026-10-27, after playing 0.13.0: one "vanished in literally a microsecond". So a bubble stays at
  // least TIP_MIN s and goes by itself at TIP_MAX s; a tap on the GAME (children tap all the time) never closes it, only a
  // tap ON the bubble after TIP_MIN_TAP s; a new bubble waits its turn instead of replacing the one showing; and a bubble
  // never clears a toast. seenTips containing '*' skips all explanations (used by automated tests).
  // `pic`: an assets/ui/*.png drawing shown with the words; text only until the file exists.
  // Tips queued but never shown (the flight ended): unmark them so they show next time, and empty the queue.
  dropTips() {
    const ids = (this.tipQueue || []).map(q => q[2]).filter(Boolean);
    if (ids.length) { this.save.seenTips = this.save.seenTips.filter(t => !ids.includes(t)); writeSave(this.save); }
    this.tipQueue = [];
  }

  explain(id, html, pic = null) {
    if (this.school) return false;
    const seen = this.save.seenTips;
    if (seen.includes(id) || seen.includes('*')) return false;
    if (this.state !== 'playing') return false;   // not on take-off or the landing flare: it fires the next time instead (the audit, 2026-10-28)
    seen.push(id);
    writeSave(this.save);
    if (this.explaining) { (this.tipQueue = this.tipQueue || []).push([html, pic, id]); return true; }   // waits its turn
    this.showTip(html, pic);
    return true;
  }
  // Season 2: wild animals (and scenery birds) only once the NATURE lesson (L2) is done: one new thing at a time.
  wildAllowed() { if (this.wildOK0 == null) this.wildOK0 = !isSeason2(this.save) || (this.save.missionsDone || []).includes('L1'); return this.wildOK0; }   // from flight 2 (the user's rails, 2026-10-27)

  showTip(html, pic) {
    this.explaining = true;   // a bubble is up (NOT frozen)
    this.tipAt = this.time.now;
    // A small strip, never over the plane: at the top, or at the bottom when the plane is high (the user, 2026-10-27).
    this.ui.coach(html, false, false, false, pic);
    document.getElementById('coach').classList.toggle('strip-low', this.plane.y < HEIGHT * 0.4);
    // A toast already up (dusk, SAF, a token) drops below a top strip instead of sitting under it (the audit, 2026-10-28).
    const coachEl = document.getElementById('coach'), toastEl = document.getElementById('toast');
    if (toastEl && !toastEl.hidden && !coachEl.classList.contains('strip-low')) toastEl.style.top = `${Math.round(coachEl.getBoundingClientRect().bottom + 6)}px`;
    const mine = this.tipSerial = (this.tipSerial || 0) + 1;
    this.time.delayedCall(TIP_MAX * 1000, () => { if (this.tipSerial === mine && this.explaining) this.closeTip(); });
  }
  closeTip() {
    this.explaining = false; this.ui.hideCoach(); document.getElementById('toast').style.top = '';
    if (this.state !== 'playing') { this.dropTips(); return; }   // the flight ended: unshown tips are unmarked, not lost
    const q = (this.tipQueue || []).shift();
    if (q) this.time.delayedCall(400, () => { if (!this.explaining && this.state === 'playing') this.showTip(q[0], q[1]); else { this.tipQueue.unshift(q); this.dropTips(); } });
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

  onCoachTap(fromBubble = false) {
    // A tip bubble: only a tap ON it closes it, and not before TIP_MIN_TAP s; a tap on the game just flies (returns false).
    if (this.explaining) { if (fromBubble && this.time.now - this.tipAt >= TIP_MIN_TAP * 1000) this.closeTip(); return false; }
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









  // The plane's picture at this.pose (worked out by the rules each frame).
  showPlane() {
    this.planeSprite.setPosition(this.pose.x, this.pose.y).setRotation(this.pose.rotation);
    this.syncPlaneParts();
  }
  // Work the pose out again from the plane (after moving it by hand: tests, flight school), and show it.
  drawPlane() {
    this.pose = P.planePose(this);
    this.showPlane();
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
    if (bio === 0 && this.state === 'playing') this.ui.tipOnce('bareLand', tip('bareLand', REGION_NAMES[r]), '', 'good', 5);
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
    const clearOfRunway = x => !this.runways || !this.runways.some(r => r.x < x + 20 && r.x + AIRPORT.runwayLen > x - 20);
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
    // Season 2: no wild animals before the NATURE lesson (L2), then the first one is explained (the user: one new thing at a time).
    const wildOK = this.wildAllowed();
    if (wildOK && due('wild', W.wildPerScreen)) { const k = W.pickWild(this.distancePx); if (k && this.textures.exists(`${k}-0`)) { animal(k); if (isSeason2(this.save)) this.explain('x-first-animal', tip('x-first-animal')); } }   // (still loading: not yet)   // rarer ones only far into a flight
    const b = wildOK && due('bird', W.birdsPerScreen) && W.pickSky(this.distancePx);   // null: no bird this far in (or before the NATURE lesson)
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
    if (this.hedge) this.hedge.tilePositionX += dx;
    if (this.flowers) this.flowers.tilePositionX += dx;
    // Ponds (with a beaver dam once beavers are back) and storks gliding far away.
    const uk = this.regionNow === 'woodland';   // UK projects show over the UK only
    if (this.distancePx >= this.nextDecorAt && uk && hasProject(this.save, 'pond') && dx > 0) {
      const x = WIDTH + 10;
      if (!this.runways.some(r => r.x < x + 40 && r.x + AIRPORT.runwayLen > x - 10)) {
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
    if (this.kindsText) this.kindsText.setText(`kinds ${Math.min(this.speciesPlanted.size, FOREST.kinds)}/${FOREST.kinds}`);
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


  // The runway's pictures: strip, tower, weather station, name, and the city's landmark in the skyline.
  showRunway(rw) {
    const { x, name } = rw;
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
    rw.parts = parts; rw.strip = strip;
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





  // ---------- trees ----------








  showPlot(pl) {
    const x = pl.x;
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
    pl.parts = parts; pl.marker = marker;
    if (this.parcels > 0) this.time.delayedCall(900, () => this.explain('tree-1', tip('tree-1'), 'lesson-plot'));
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






  showFlock(f) {
    for (const b of f.birds) { b.view = this.add.image(b.x, b.y, b.key).setOrigin(0).setFlipX(b.flip); this.birdLayer.add(b.view); }
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








  // A seed's (or pick-up's) picture. A golden seed is explained the first time.
  showToken(t) {
    t.view = this.add.image(t.x, t.y, t.power ? `power-${t.power}` : t.value > 1 ? 'token-gold' : 'token').setOrigin(0);
    this.fxLayer.add(t.view);
    if (t.value > 1) this.time.delayedCall(700, () => this.explain('x-gold', tip('x-gold'), 'lesson-gold'));
  }




  // Storm cloud tints, top to base: a column rising from the ground has a bright, sunlit crown; one hanging from
  // A storm pair: PixelLab storm towers. The bottom column's crown touches the gap edge from below, the top
  // column's hanging base from above, so every gap's narrowest point is exactly `gap`. A column taller
  // than one picture stacks another behind it. st.pics: { key, dx (from the column's left), y, flip }.
  // A no-fly zone's pictures: red-striped blocks with edges and NO / FLY.
  showNoFly(st) {
    const [top, bottom] = st.rects, x = top.x, W = top.width, topH = top.height, botY = bottom.y;
    const style = { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#d02a2a', strokeThickness: 3 };
    st.parts = [
      this.add.tileSprite(x, 0, W, topH, 'nofly').setOrigin(0),
      this.add.tileSprite(x, botY, W, SKY_H - botY, 'nofly').setOrigin(0),
      this.add.rectangle(x, topH - 2, W, 2, 0x8a1010).setOrigin(0),
      this.add.rectangle(x, botY, W, 2, 0x8a1010).setOrigin(0),
      this.add.text(x + W / 2, topH - 12, 'NO', style).setOrigin(0.5),
      this.add.text(x + W / 2, botY + 12, 'FLY', style).setOrigin(0.5),
    ];
    this.stormLayer.add(st.parts);
  }

  // A storm's pictures (st.pics, farthest first), cropped at the ground line.
  showStorm(st) {
    const x = st.rects[0].x;
    st.parts = st.pics.map(q => { const im = this.add.image(x + q.dx, q.y, q.key).setOrigin(0).setFlipX(q.flip);
      im.cropH = Math.min(q.h, SKY_H - q.y);   // never below the ground line
      return im.setCrop(0, 0, im.width, im.cropH); });
    this.stormLayer.add(st.parts);
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





  showIssr(r) {
    const v = r.view = this.add.tileSprite(r.x, r.y, r.width, r.height, 'issr-tile').setOrigin(0).setAlpha(r.alpha);
    v.tilePositionX = Phaser.Math.Between(0, 31); v.tilePositionY = Phaser.Math.Between(0, 31);   // looks: the texture's offset
    this.maskToBlobs(v, r.blobs);
    this.issrLayer.add(v);
  }

  // Masks sprite v to the ellipses. Keep v.maskGfx at the sprite's x, y.
  maskToBlobs(v, blobs) {
    const m = v.maskGfx = this.make.graphics({ x: v.x, y: v.y }, false);
    m.fillStyle(0xffffff);
    for (const b of blobs) m.fillEllipse(b.cx, b.cy, b.rx * 2, b.ry * 2, 24);
    v.setMask(m.createGeometryMask());
  }








  // The next-gap hint: a faint gate at the right edge, at the height of a storm gap still off screen.
  drawGapHint() {
    const lv = this.kit.hintLevel;
    if (!lv || this.school) return;
    if (FEATURES.gapMarkers) return this.drawGapGates(GAP_HINT.lead[lv]);
    const g = this.gapHintGfx || (this.gapHintGfx = this.add.graphics().setDepth(50));
    g.clear();
    for (const st of this.storms) {
      const x = st.rects[0].x;
      if (x < WIDTH) continue;   // on screen: no hint needed
      const top = st.rects[0].height, bot = st.rects[1].y, a = GAP_HINT.alpha[lv] * (0.75 + 0.25 * Math.sin(this.gameTime / 120));
      g.fillStyle(0xffe15a, a);
      g.fillRect(WIDTH - 4, top, 4, 3); g.fillRect(WIDTH - 4, bot - 3, 4, 3); g.fillRect(WIDTH - 2, top, 2, bot - top);
      if (!this.hintTipped) { this.hintTipped = true; this.ui.tipOnce('gapHint', tip('gapHint'), '', 'good', 4); }
    }
  }




  // Clearer next-gap hint (on by default, ?gapmarkers=off to opt out; research/PROPOSAL-GAP-MARKERS.md): still only with the three systems and
  // as far ahead as they spawn columns, but readable in daylight: a gate with a dark outline, no-fly zones in red and
  // white stripes, and an arrow at the plane's height pointing to the nearest gap. Which gate and when: src/gapmarkers.js.
  drawGapGates(lead) {
    const g = this.gapHintGfx || (this.gapHintGfx = this.add.graphics().setDepth(50));
    g.clear();
    const pulse = 0.8 + 0.2 * Math.sin(this.gameTime / 120), R = GATE_RIGHT, x = R - 8, edge = MARK.outline;   // left of the heat meter
    let first = null;
    for (const st of this.storms) {
      const m = gateFor(st, this.plane.y, this.speed, lead);
      if (!m) continue;
      const a = (0.6 + 0.4 * m.near) * pulse, col = m.kind === 'nofly' ? 0xff4040 : 0xffd23a;
      g.fillStyle(col, 0.18 * a); g.fillRect(x + 1, m.top, 7, m.bot - m.top);   // the opening, faintly
      g.fillStyle(edge, 0.85 * a);   // dark outline first: it is what reads against a bright day sky
      g.fillRect(x, m.top - 13, 8, 15); g.fillRect(x, m.bot - 2, 8, 15); g.fillRect(R - 4, m.top, 4, m.bot - m.top);
      if (m.kind === 'nofly') {   // striped edges, like the zone itself
        for (let y = 0; y < 12; y += 4) { g.fillStyle(y % 8 ? 0xffffff : col, a); g.fillRect(x + 1, m.top - 12 + y, 6, 4); g.fillRect(x + 1, m.bot - 1 + y, 6, 4); }
      } else { g.fillStyle(col, a); g.fillRect(x + 1, m.top - 12, 6, 12); g.fillRect(x + 1, m.bot - 1, 6, 12); }
      g.fillStyle(col, a); g.fillRect(R - 3, m.top, 2, m.bot - m.top);
      if (!first || m.ahead < first.ahead) first = m;
    }
    if (first && first.arrow && (!first.blink || Math.floor(this.gameTime / 180) % 2 === 0)) {   // the nearest gate only
      const y = this.plane.y + PLANE.h / 2, ax = GATE_RIGHT - 20, d = first.arrow * 8;
      g.fillStyle(edge, 0.9); g.fillTriangle(ax - 7, y - first.arrow, ax + 7, y - first.arrow, ax, y + d + first.arrow * 2);
      g.fillStyle(first.kind === 'nofly' ? 0xff4040 : 0xffd23a, 1); g.fillTriangle(ax - 5, y, ax + 5, y, ax, y + d);
    }
    if (first && !this.hintTipped) { this.hintTipped = true; this.ui.tipOnce('gapHint', tip('gapHint'), '', 'good', 4); }
  }

  enterIssr() {
    sfx.issr();
    this.popup(this.plane.x + 25, this.plane.y - 12, 'CONTRAIL!', '#ffffff');
    if (this.isDay) this.ui.tipOnce('issrDay', tip('issrDay'), '', 'good', 4);
    else this.ui.tipOnce('issrNight', tip('issrNight'), '', 'bad', 4);
  }


  showContrail(c) {
    const s = CONTRAIL.size;
    c.view = this.add.rectangle(c.x, c.y, s, s, COLOURS.contrail).setOrigin(0);
    this.contrailLayer.add(c.view);
  }



  // ---------- day, night and radiation ----------







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

  update(time, deltaMs) {
    // (clamped so a background tab doesn't teleport the plane; HALF speed while a teaching strip shows, so a child can read it
    // without crashing: the user, 2026-10-27)
    const dt = Math.min(deltaMs, 50) / 1000 * (this.explaining && !this.school ? 0.5 : 1);
    this.updatePopups(dt);
    if (this.state === 'idle') { this.updateScenery(dt * 30); return; }
    if (this.school) this.school.update(dt);
    if (this.frozen) { this.scoreRays(dt, false); this.drawRays(this.gameTime); this.drawSky(this.gameTime); return; }
    const { dx, inIssr, over } = this.step(dt);   // the flight's rules (src/sim/rules.js): data only
    this.syncViews(dt, dx, inIssr, over);
  }

  // Draw the frame the rules just stepped: every picture where its record says (sim engine 5f).
  // over: the flight had already ended before this frame (only the contrails fade and the rays show).
  syncViews(dt, dx, inIssr, over) {
    const time = this.gameTime;
    if (over) { this.syncContrails(time); this.drawRays(time); return; }
    this.showPlane();
    if (this.state === 'takeoff') this.holdText.setText(this.airborne ? '' : 'HOLD\nto take off!').setScale(1 + 0.08 * Math.sin(this.gameTime / 150));
    else this.holdText.setText('');
    if (this.state === 'playing' && (this.inGrace() || this.onAutopilot())) {
      this.planeSprite.setAlpha(1);
      const left = Math.ceil((this.autoUntil - this.gameTime) / 1000), locked = this.gameTime < (this.autoFrom || 0) + POWERUPS.autoLockMs;
      this.autoText.setText(this.onAutopilot() ? (locked ? `AUTOPILOT ${left}` : `AUTOPILOT ${left} - TAP to take control`) : 'AUTOPILOT - tap to fly!');
      this.autoText.setPosition(Math.max(this.autoText.width / 2 + 4, this.plane.x + PLANE.w / 2), Math.max(10, this.plane.y - 14)).setVisible(true);
    } else if (this.state === 'playing') {
      this.planeSprite.setAlpha(1);
      this.autoText.setVisible(false);
    }
    // Trees: their growth stage, and old trees keep getting bigger.
    const oldWood = this.oldWood();
    for (const t of this.trees) if (t.view && t.view.active) {
      if (t.viewStage !== t.stage) { t.viewStage = t.stage; t.view.setTexture(`tree-${t.art || t.kind}-${t.stage}`); }
      if (t.stage === 2) t.view.setScale(1 + 0.15 * oldWood);
    }
    this.updateScenery(dx);
    this.updateExhaust(dt, dx);
    this.drawSkyNow(time);
    this.updateLightning(time);
    // Pictures follow their records. Storms, runways and plots move all their parts by how far the record moved.
    const follow = (r, x) => { const d = x - r.viewX; if (d) for (const p of r.parts) p.x += d; r.viewX = x; };
    for (const s of this.storms) follow(s, s.rects[0].x);
    for (const rw of this.runways) follow(rw, rw.x);
    const bob = Math.round(Math.sin(this.gameTime / 180) * 2);
    for (const pl of this.plots) { follow(pl, pl.x); pl.marker.setVisible(!pl.used && this.parcels > 0).setY(SKY_H - 18 + bob); }
    for (const i of this.issrs) {
      i.view.tilePositionY += dt * 4;
      i.view.setPosition(i.x, i.y).setAlpha(i.alpha); i.view.maskGfx.setPosition(i.x, i.y);
    }
    for (const t of this.tokens) t.view.setPosition(t.x, t.y);
    this.updateForestMeter();
    this.turbGfx.clear();
    for (const z of this.turbs) {
      // Tileable gusts (assets/turb.png): drift sideways and churn slowly up and down.
      if (!z.view) { z.view = this.turbLayer.add(this.add.tileSprite(z.x, z.y, z.w, z.h, 'turb').setOrigin(0)); this.maskToBlobs(z.view, z.blobs); }
      z.view.setPosition(Math.round(z.x), z.y); z.view.maskGfx.setPosition(z.view.x, z.view.y);
      z.view.tilePositionX += 20 * dt;
      z.view.tilePositionY = Math.round(Math.sin(this.gameTime / 700));
    }
    const night = this.nightAmount() > 0.5;   // dark birds vanish on a night sky: draw them pale
    for (const f of this.birds) for (const b of f.birds) {
      b.view.setPosition(b.x, b.y).setTexture(b.key);
      if (night) b.view.setTintFill(0xd8def0); else b.view.clearTint();
    }
    for (const p of this.parcelsFalling) {
      if (p.t >= PARCEL.chuteAfter) p.chute.setVisible(true);
      p.view.setPosition(p.x, p.y).setRotation(Math.sin(p.t * 6) * 0.15);   // swing under the parachute
    }
    this.drawAim();
    this.syncContrails(time);
    this.drawRays(time);
    this.drawGapHint();

    this.hud.setCo2(this.co2Rate);
    this.hud.setHeat(this.heat, time);
    this.drawHeatFx(time);
    this.updateTexts(inIssr);
  }

  syncContrails(time) {
    for (const c of this.contrails) c.view.setPosition(c.x, c.y).setAlpha(P.contrailAlpha(this, c, time));
  }

  // ---------- what the rules show and say (src/sim/rules.js calls these; the sim engine leaves them empty) ----------

  // A record has left the flight: take its pictures away.
  unshow(r) {
    if (r.parts) r.parts.forEach(p => p.destroy());
    if (r.view) { if (r.view.maskGfx) r.view.maskGfx.destroy(); r.view.destroy(); }
    if (r.birds) r.birds.forEach(b => b.view && b.view.destroy());
  }
  playSound(name) { sfx[name](); }
  buzz(ms) { buzz(ms); }
  shake(ms, amount) { this.cameras.main.shake(ms, amount); }
  later(ms, fn) { this.time.delayedCall(ms, fn); }
  runTimers() {}   // Phaser runs the game's timers
  persist() { writeSave(this.save); }
  onSeed(t, tx, ty) {
    this.popup(tx, ty - 8, `+${t.value} seed${t.value > 1 ? 's' : ''}`, t.value > 1 ? '#ffe15a' : '#8dffb0');
    this.burst(tx, ty, 0x4caf50, 5);
    sfx.coin();
    this.tweens.add({ targets: this.cargoIcon, scale: 1.4, duration: 80, yoyo: true });
    if (this.cargo === t.value) this.ui.tipOnce('firstToken', tip('firstToken'), '', 'good', 3.5);
  }
  onPower(power, tx, ty) {
    if (power === 'saf') {
      this.popup(tx, ty - 8, 'SAF! Cleaner fuel', '#8dffb0');
      this.ui.tipOnce('powerSaf', tip('powerSaf'), '', 'good', 4);
    } else this.popup(tx, ty - 8, 'AUTOPILOT!', '#ffe15a');
    this.burst(tx, ty, power === 'saf' ? 0x8dffb0 : 0x8ac8ff, 8);
    sfx.coin();
  }
  onCrystals(n, why) {
    sfx.coin();
    this.popup(this.plane.x + 25, this.plane.y - 16, `+${n} crystal${n > 1 ? 's' : ''}: ${why}`, '#9fe0ff');
    const c = this.add.image(this.plane.x + 25, this.plane.y, 'crystal').setScale(2);
    this.fxLayer.add(c);
    this.tweens.add({ targets: c, x: this.crysIcon.x, y: this.crysIcon.y, scale: 1, duration: 600, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
    this.explain('x-crystals', tip('x-crystals'), 'lesson-crystals');
  }
  onLand() {
    this.drawPlane();
    sfx.land();
    this.burst(this.plane.x + 10, SKY_H - 2, 0xd8d4c8, 10);
    this.popup(this.plane.x + 25, SKY_H - 40, 'TOUCHDOWN!', '#ffe15a', 16);
  }
  onPopFake(i) {
    const cx = i.x + i.width / 2, cy = i.y + i.height / 2;
    this.popup(cx, cy - 6, 'Forecast wrong!', '#cfe6ff', 8);
    for (let k = 0; k < 8; k++) {
      const sp = this.add.image(cx + Phaser.Math.Between(-i.width / 3, i.width / 3), cy + Phaser.Math.Between(-i.height / 3, i.height / 3), `plane-sparkle-${k % 4}`);
      this.tweens.add({ targets: sp, y: sp.y - 12, alpha: 0, duration: 600 + k * 40, onComplete: () => sp.destroy() });
    }
  }
  // Dusk and dawn: a sound, and a banner the first few times (after that the sky and the sound say it).
  onDayHalf(half) {
    const banner = k => { const seen = this.save.dayNightSeen || (this.save.dayNightSeen = {}); seen[k] = (seen[k] || 0) + 1; return seen[k] <= DAYNIGHT.bannerTimes; };
    if (half === 'dusk') { sfx.dusk(); if (banner('dusk')) this.ui.toast('Night is coming!', 'At night contrails TRAP heat. Avoid the icy air!', 'bad', 3); }
    if (half === 'dawn') { sfx.dawn(); if (banner('dawn')) this.ui.toast('Sunrise!', 'In sunshine a contrail can shade the Earth a little. Night ones trap heat.', 'good', 3); }
  }
  // The sky's colour (from the clock alone) and its sun, moon and stars.
  drawSkyNow(time) {
    const { isDay: skyDay, toOther } = this.dayNightPhase();
    const from = skyDay ? COLOURS.skyDay : DAYNIGHT.skyNight;
    const to = skyDay ? DAYNIGHT.skyNight : COLOURS.skyDay;
    this.cameras.main.setBackgroundColor(lerpColour(from, to, toOther));
    this.drawSky(time);
  }
  onParcelMissed(x, onRunway) {
    this.burst(x, SKY_H, 0xc8a165, 6);
    this.popup(x, SKY_H - 14, onRunway ? 'on the runway!' : 'missed!', '#ff8080');
    sfx.nope();
  }
  showParcel(p) {
    const crate = this.add.image(0, 0, 'crate');
    p.chute = this.add.image(0, -8, 'chute').setVisible(false);
    p.view = this.add.container(p.x, p.y, [p.chute, crate]);
    this.fxLayer.add(p.view);
  }
  // A tree planted on plot: its picture (the land's own tree if drawn, else the UK one), and what it means.
  showTree(tree, plot, here, first) {
    const kind = tree.kind;
    const art = tree.art = this.textures.exists(`tree-${here.id}-0`) ? here.id : kind;
    const cx = plot.x + this.kit.plotW / 2;
    const sprite = tree.view = this.add.image(cx, SKY_H + 1, `tree-${art}-0`).setOrigin(0.5, 1).setScale(0.2);
    tree.viewStage = 0;
    this.treeLayer.add(sprite);
    this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.easeOut' });
    plot.parts.push(sprite);
    this.burst(cx, SKY_H - 2, 0x8dffb0, 12);
    this.burst(cx, SKY_H - 2, 0xffe15a, 6);
    this.popup(cx, SKY_H - 24, `${here.name.toUpperCase()} PLANTED!`, '#8dffb0', 8);
    if (first) this.time.delayedCall(450, () => this.popup(cx, SKY_H - 36, 'BIODIVERSITY UP! (new kind)', '#ffe15a'));   // the same kind again adds almost nothing: say nothing
    sfx.plant();
    buzz(30);
    // Tree school, steps 2 and 3 (step 1 is the first soil patch): what a tree does for the
    // climate, then Biodiversity. A new native kind's fact waits until both are done.
    const taught = this.explain('tree-2', tip('tree-2'), 'lesson-tree-co2');
    if (taught) this.explainWhenClear('tree-3', tip('tree-3'), 'lesson-biodiversity');
    else if (first && here.native) this.explain(`x-species-${here.id}`, tip('x-species', here.name),
      animalPortrait(WILDLIFE.find(w => w.kind === 'tree' && w.id === here.id) || {}) || null);   // the tree's picture, as on its NATURE card (user, 0.11.1)
  }

  // The light (day) and heat (night) columns the rules found (this.rays): each beam drawn up to the contrail
  // that blocks it, which is tinted cool or warm.
  drawRays(time) {
    const g = this.rayGfx, ground = this.groundFx;
    g.clear(); ground.clear();
    for (const c of this.blockers) if (c.view.active) c.view.setFillStyle(COLOURS.contrail);
    this.blockers = [];
    if (!this.rays || this.rays.strength <= 0) return;
    const { isDay, strength, cols } = this.rays, S = CONTRAIL.size;
    for (const { x, hit } of cols) {
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
      if (hit && hit.view.active) {
        hit.view.setFillStyle(isDay ? COLOURS.cool : COLOURS.warm);
        this.blockers.push(hit);
      }
    }
  }

  // Blue sparkles at the Earth face when contrails or trees cool it.
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
    // A pop-up at the top starts BELOW the HUD stack (mission line + next-airport line), allowing for its 1.1 s rise
    // (vy -22 = ~24 px): the audit, 2026-10-27, after a player's overlapping HUD texts.
    if (y < 110) { const hud = this.hudBottom(); t.y = Math.max(t.y, hud + t.height / 2 + 26); }
    // Keep popups on screen.
    t.x = Phaser.Math.Clamp(t.x, Math.min(t.width / 2 + 24, WIDTH / 2), WIDTH - Math.min(t.width / 2 + 24, WIDTH / 2));   // clear of the side bars
    this.fxLayer.add(t);
    this.popups.push({ t, life: 1.1, vy: -22 });
  }

  // The lowest pixel of the HUD's text stack at the top (the next-airport line under the mission line).
  hudBottom() {
    const live = [this.missionText, this.nextText].filter(t => t && t.visible && t.text);
    return live.length ? Math.max(...live.map(t => t.y + t.height)) : 40;
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
    if (this.crossing) this.drawCrossingBar();
    else this.distText.setText(km(this.distancePx / WORLD.pxPerMetre));

    const toAirport = Math.round(this.nextAirport.worldX - this.distancePx);
    // R12 (rails): the first flight after lesson 3, before the first airport: teach flying PAST it (the user, 2026-10-27).
    if (isSeason2(this.save) && !this.school && this.state === 'playing' && toAirport > 150 && toAirport < 650) {
      const md = this.save.missionsDone || [];
      if (md.includes('L3') && !md.includes('L4')) this.explain('rail-skip', tip('rail-skip'));
    }
    // Lesson L4 ("skip one airport, land at the next"): no landing call at the FIRST airport, it would contradict the lesson (the audit, 2026-10-28).
    const skipThis = isSeason2(this.save) && !this.school && this.airportsSkipped === 0 && (this.save.missionsDone || []).includes('L3') && !(this.save.missionsDone || []).includes('L4');
    if (this.state === 'landing') this.nextText.setText(`Welcome to ${this.landedAt}!`);
    else if (skipThis && toAirport < AIRPORT.signFrom) this.nextText.setText(`${this.nextAirport.name} ${Math.max(0, toAirport)}m: fly PAST this one!`);
    else if (toAirport <= 0) this.nextText.setText(`${this.nextAirport.name}: glide down to land!`);
    else if (toAirport < (this.kit.airportEarly ? 450 : 300)) this.nextText.setText(`${this.nextAirport.name} ${toAirport}m: get LOW to land!`);   // ATC (eras): the call comes sooner
    else if (toAirport < AIRPORT.signFrom) this.nextText.setText(`Next: ${this.nextAirport.name} ${km(toAirport)}`);
    else if (this.missedSign && this.gameTime < this.missedSign.until) this.nextText.setText(`${this.missedSign.text} ${km(toAirport)}`);
    else this.nextText.setText('');
    this.fitText(this.nextText, WIDTH - 12);
    // The mission line: what this flight is for.
    if (isSeason2(this.save)) { const n = this.school ? null : s2Next(this.save);   // season 2 (S3): the NEXT goal (a scene restart keeps fields, so no cache)
      this.missionText.setText(n && this.state !== 'over' ? n.title : ''); }
    else { const mis = this.school ? null : currentMission(this.save);
      this.missionText.setText(mis && this.state !== 'over' ? mis.progress(this) : ''); }
    // The "Next: <city>" line sits UNDER the mission line, however many lines that wraps to (a player saw two HUD lines
    // drawn over each other: season 2 mission titles wrap to 2 lines, the next line was fixed at y 58).
    this.nextText.y = this.missionText.text ? this.missionText.y + this.missionText.height + 1 : this.missionText.y;

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

  // Season 2 crossing (src/crossings.js; MASTER-PLAN B3): a boss-level progress bar to the gateway, no distance meter.
  drawCrossingBar() {
    const c = this.crossing, f = Math.max(0, Math.min(1, this.distancePx / c.km)), w = 150, x = (WIDTH - w) / 2, y = 22;
    this.distText.setFontSize(8).setText(`TO ${c.to}`);
    this.crossGfx.clear().fillStyle(0x1b1b2f, 0.85).fillRect(x - 2, y - 2, w + 4, 10).fillStyle(0xffd34d, 1).fillRect(x, y, Math.round(w * f), 6);
  }

  // The flight has ended (rules.finish set the state): the crash or landing, the save, and the results.
  // The flight has ended and the rules have banked it (bankFlight: this.result, this.bank): the crash or
  // landing effects, the online boards, and the results screen.
  onFinish({ landed = false, reason = '', sound = 'crash' }) {
    const { m, missionDone, lap, crash, gained } = this.bank;
    this.hud.setCo2(0);
    this.ui.endToasts();   // a fresh toast finishes its 2 s (the user: one vanished at once)
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

    if (this.school) this.school.finished(this.result);
    else sendFlight({   // to the online boards, if this device has a pilot name; queued when offline
      landed, distance_m: m, shade: Math.max(0, -this.sunBlocked), heat_trapped: this.heatTrapped, night_dodges: this.dodgesTotal,
      crystals: this.crystals, plane_co2: this.kit.co2Cruise, species: [...this.speciesTags], mission_done: missionDone,
      lap, crash,
    });
    if (this.crossing) {   // season 2: landing the crossing (at the gateway or beyond) opens the area; either way it is over
      if (landed) completeCrossing(this.save, this.crossing);
      this.result.crossing = { id: this.crossing.id, landed, opens: this.crossing.opens, to: this.crossing.to };
      delete this.save.flyCrossing;
      writeSave(this.save);
    }
    if (gained) this.time.delayedCall(landed ? 600 : 0, () => sfx.coin());
    this.time.delayedCall(landed ? 900 : 1100, () => this.ui.showResults(this.result));
  }
}

// The flight's rules (src/sim/rules.js) are GameScene methods too: the game and the sim engine run the same code.
Object.assign(GameScene.prototype, RULES);
