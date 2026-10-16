import {
  WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS,
  TAKEOFF, AIRPORT, DAYNIGHT, RADIATION, CLIMATE, TOKENS, CARGO, PARCEL,
} from './config.js';
import { School } from './school.js';
import { Hud } from './Hud.js';
import { loadout } from './upgrades.js';
import { writeSave } from './save.js';
import { sfx, buzz } from './sound.js';

const SKY_H = HEIGHT - GROUND_H;
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

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  preload() {
    this.load.image('plane', 'assets/plane.png');
  }

  init(data) { this.autostart = data && data.go ? data.mode || 'normal' : null; }

  create() {
    this.save = this.registry.get('save');
    this.ui = this.registry.get('ui');
    this.kit = loadout(this.save);
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
    this.parcelsFalling = [];
    this.nextPlotAt = 200;
    this.treeFeedback = 0;
    this.popups = [];
    this.tokens = [];                // floating trees to collect
    this.cargo = 0;                  // trees on board: kept only if you land
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
    this.lastHalf = 'day';
    this.night = { started: false, trappedAtStart: 0 };
    this.nightOwl = false;
    this.warnedHot = false;

    this.airportIndex = 0;
    this.airportsSkipped = 0;
    this.nextAirport = { worldX: AIRPORT.every, name: AIRPORT.names[0], spawned: false };

    // ---- draw order: sky scenery, ISSRs, contrails, light, storms, plane, ground, HUD ----
    this.skyGfx = this.add.graphics();   // stars, sun, moon
    this.stars = Array.from({ length: 45 }, () => ({ x: Phaser.Math.Between(0, WIDTH), y: Phaser.Math.Between(0, SKY_H - 120), tw: Math.random() * 6 }));
    this.cloudsFar = this.add.tileSprite(0, 60, WIDTH, 40, 'clouds').setOrigin(0).setAlpha(0.55);
    this.hills = this.add.tileSprite(0, SKY_H - 46, WIDTH, 46, 'hills').setOrigin(0);
    this.city = this.add.tileSprite(0, SKY_H - 30, WIDTH, 30, 'city').setOrigin(0);

    this.issrLayer = this.add.layer();
    this.contrailLayer = this.add.layer();
    this.rayGfx = this.add.graphics();
    this.stormLayer = this.add.layer();

    this.plane = { x: PLANE.x, y: this.groundedY(), vy: 0 };
    this.planeSprite = this.add.image(0, 0, 'plane');

    this.add.rectangle(0, SKY_H, WIDTH, GROUND_H, COLOURS.ground).setOrigin(0);
    this.add.rectangle(0, SKY_H, WIDTH, 3, COLOURS.groundEdge).setOrigin(0);
    this.groundFx = this.add.graphics();   // contrail shadows (day) and trapped-heat glow (night)
    this.plotLayer = this.add.layer();
    this.aimGfx = this.add.graphics();     // where a parcel dropped now would land
    this.treeLayer = this.add.layer();
    this.runwayLayer = this.add.layer();
    this.addRunway(-60, AIRPORT.home);     // home runway under the plane
    this.fxLayer = this.add.layer();       // particles and popups

    this.heatFx = this.add.graphics();   // red edges when the Earth overheats
    this.heatWarned = { 50: false, 75: false, 90: false };
    this.nextBeat = 0;
    this.hud = new Hud(this);
    this.hud.setCo2(0);
    this.hud.setHeat(0);

    const font = { fontFamily: FONT, fontSize: '16px', color: COLOURS.text, stroke: '#000', strokeThickness: 4 };
    this.distText = this.add.text(WIDTH / 2, 8, '', font).setOrigin(0.5, 0);
    this.nextText = this.add.text(WIDTH / 2, 30, '', { ...font, fontSize: '8px', strokeThickness: 3 }).setOrigin(0.5, 0);
    this.hintText = this.add.text(4, SKY_H + 22, '', { ...font, fontSize: '8px', strokeThickness: 3, lineSpacing: 4 }).setOrigin(0, 0);
    this.parcelText = this.add.text(4, HEIGHT - 11, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#8dffb0' }).setOrigin(0, 0);

    this.cargoIcon = this.add.image(28, 12, 'token').setOrigin(0, 0);
    this.cargoText = this.add.text(45, 13, '0', { ...font, fontSize: '8px', strokeThickness: 3 }).setOrigin(0, 0);
    this.multText = this.add.text(60, 13, '', { ...font, fontSize: '8px', strokeThickness: 3, color: '#ffe15a' }).setOrigin(0, 0);
    this.cargoIcon.setVisible(false);

    this.input.on('pointerdown', p => this.onTap(p));
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
    this.input.keyboard.on('keydown-UP', () => this.flap());
    this.input.keyboard.on('keydown-T', () => this.dropParcel());
    this.input.keyboard.on('keydown-DOWN', () => this.dropParcel());
    // DROP button, drawn in the ground strip so it sits in the same place on every screen.
    const bx = WIDTH - 70, by = SKY_H + 12;
    this.dropBox = { x: bx, y: by, w: 64, h: 32 };
    this.dropBg = this.add.rectangle(bx, by, 64, 32, 0x4caf50).setOrigin(0).setStrokeStyle(2, 0x1b1b2f);
    this.dropLabel = this.add.text(bx + 32, by + 16, 'DROP', { ...font, fontSize: '8px', strokeThickness: 3, align: 'center', lineSpacing: 3 }).setOrigin(0.5);
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
    if (this.textures.exists('hills')) return;
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Far clouds: puffy blobs, tiling across 288 px.
    g.clear();
    const puff = (x, y, w) => { g.fillStyle(0xffffff); g.fillRect(x + 4, y, w - 8, 10); g.fillRect(x, y + 4, w, 8); g.fillRect(x + 8, y - 4, w / 2, 6); };
    puff(10, 16, 46); puff(110, 22, 36); puff(190, 12, 60);
    g.generateTexture('clouds', WIDTH, 40);

    // Hills: two sine waves whose periods divide 288, so the strip tiles seamlessly.
    g.clear();
    for (let x = 0; x < WIDTH; x++) {
      const h = Math.round(22 + 9 * Math.sin((2 * Math.PI * x) / 144) + 6 * Math.sin((2 * Math.PI * x) / 57.6 + 1));
      g.fillStyle(0x7fb48a).fillRect(x, 46 - h, 1, h);
      g.fillStyle(0x9cc9a5).fillRect(x, 46 - h, 1, 2);
    }
    g.generateTexture('hills', WIDTH, 46);

    // City skyline with lit windows.
    g.clear();
    let x = 2;
    const rnd = new Phaser.Math.RandomDataGenerator(['contrail']);
    while (x < WIDTH - 14) {
      const w = rnd.between(10, 22), h = rnd.between(8, 28);
      g.fillStyle(0x5d6d88).fillRect(x, 30 - h, w, h);
      g.fillStyle(0xbfd3e6);
      for (let wy = 30 - h + 3; wy < 28; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) if (rnd.frac() < 0.6) g.fillRect(wx, wy, 2, 2);
      x += w + rnd.between(2, 10);
    }
    g.generateTexture('city', WIDTH, 30);

    // Trees: three growth stages for each species.
    const tree = (key, stage, kind) => {
      g.clear();
      const trunk = 0x7a4a24, leaf = kind === 'spruce' ? 0x2e7d32 : 0x4caf50, dark = kind === 'spruce' ? 0x1b5e20 : 0x2e7d32;
      const [w, h] = [[3, 4], [7, 9], [11, 14]][stage];
      const trunkH = Math.max(1, Math.round(h / 4));
      g.fillStyle(trunk).fillRect(Math.floor(w / 2) - (stage ? 1 : 0), h - trunkH, stage ? 2 : 1, trunkH);
      const crownH = h - trunkH;
      if (kind === 'spruce') {
        for (let row = 0; row < crownH; row++) {
          const rw = Math.max(1, Math.round((row + 1) / crownH * w));
          g.fillStyle(row % 3 === 2 ? dark : leaf).fillRect(Math.floor((w - rw) / 2), row, rw, 1);
        }
      } else {
        g.fillStyle(dark).fillRect(1, 1, w - 2, crownH - 1);
        g.fillStyle(leaf).fillRect(0, 2, w, Math.max(1, crownH - 3)).fillRect(2, 0, Math.max(1, w - 4), crownH);
        if (kind === 'orchard' && stage === 2) { g.fillStyle(0xe53935); [[2, 3], [7, 2], [4, 6], [8, 6]].forEach(([fx, fy]) => g.fillRect(fx, fy, 2, 2)); }
      }
      g.generateTexture(key, w, h);
    };
    for (const kind of ['spruce', 'oak', 'orchard']) for (let s = 0; s < 3; s++) tree(`tree-${kind}-${s}`, s, kind);

    // Storm column body: irregular cloud lumps with light from the left; tiles every 48 px.
    const SW = STORMS.width, dark = 0x3b3f58, mid = 0x4a4e69, light = 0x5f6382, rim = 0x7a7e9c;
    g.clear();
    const TH = 48;
    for (let y = 0; y < TH; y++) {
      const t = (2 * Math.PI * y) / TH;
      const l = Math.round(3 + 2.5 * Math.sin(t) + 1.5 * Math.sin(3 * t + 1));       // left edge inset
      const r = Math.round(3 + 2.5 * Math.sin(t + 2) + 1.5 * Math.sin(2 * t + 4));   // right edge inset
      const w = SW - l - r;
      g.fillStyle(mid).fillRect(l, y, w, 1);
      g.fillStyle(light).fillRect(l, y, Math.round(w * 0.3), 1);                   // lit side
      g.fillStyle(rim).fillRect(l, y, 1, 1);                                       // bright rim
      g.fillStyle(dark).fillRect(SW - r - Math.round(w * 0.25), y, Math.round(w * 0.25), 1);  // shadow side
    }
    g.generateTexture('storm-body', SW, TH);

    // Rounded cloud ends: one for the hanging storm's bottom, one for the rising storm's top.
    const cap = (key, flip) => {
      g.clear();
      const rows = [[10, 24], [6, 32], [3, 38], [1, 42], [0, 44], [0, 44], [0, 44], [0, 44], [0, 44], [0, 44]];
      rows.forEach(([x0, w], i) => {
        const y = flip ? 9 - i : i;
        g.fillStyle(mid).fillRect(x0, y, w, 1);
        g.fillStyle(i < 2 ? light : mid).fillRect(x0, y, Math.min(4, w), 1);
      });
      g.fillStyle(light).fillRect(8, flip ? 3 : 5, 10, 2).fillRect(24, flip ? 2 : 6, 8, 2);
      g.generateTexture(key, SW, 10);
    };
    cap('storm-top', false);      // rounded top of a rising storm (widest at the bottom of the cap)
    cap('storm-bottom', true);    // rounded bottom of a hanging storm

    // ISSR fill: pale ice with scattered crystal sparkles, tiling every 32 px.
    g.clear();
    g.fillStyle(COLOURS.issr).fillRect(0, 0, 32, 32);
    const flake = (fx, fy) => { g.fillStyle(0x8fc9ef).fillRect(fx, fy - 1, 1, 3).fillRect(fx - 1, fy, 3, 1); g.fillStyle(0xffffff).fillRect(fx, fy, 1, 1); };
    [[5, 6], [20, 3], [12, 15], [27, 19], [4, 25], [18, 28]].forEach(([fx, fy]) => flake(fx, fy));
    g.fillStyle(0xb5ddf5).fillRect(9, 10, 1, 1).fillRect(24, 11, 1, 1).fillRect(14, 23, 1, 1).fillRect(29, 29, 1, 1);
    g.generateTexture('issr-tile', 32, 32);

    // Floating tree token: a tree in a white bubble (and a golden one worth 3).
    const token = (key, ring) => {
      g.clear();
      g.fillStyle(ring).fillRect(4, 0, 6, 14).fillRect(0, 4, 14, 6).fillRect(2, 2, 10, 10);
      g.fillStyle(0xffffff).fillRect(4, 1, 6, 12).fillRect(1, 4, 12, 6).fillRect(3, 2, 8, 10).fillRect(2, 3, 10, 8);
      g.fillStyle(0x2e7d32).fillRect(6, 3, 2, 1);
      g.fillStyle(0x4caf50).fillRect(5, 4, 4, 2);
      g.fillStyle(0x2e7d32).fillRect(4, 6, 6, 2);
      g.fillStyle(0x7a4a24).fillRect(6, 8, 2, 3);
      g.generateTexture(key, 14, 14);
    };
    g.clear();
    g.fillStyle(0xffffff).fillRect(1, 0, 7, 1).fillRect(0, 1, 9, 2);
    g.fillStyle(0xe0483c).fillRect(3, 0, 3, 1).fillRect(3, 1, 3, 2);
    g.fillStyle(0xdddddd).fillRect(0, 3, 1, 3).fillRect(8, 3, 1, 3).fillRect(4, 3, 1, 3);
    g.generateTexture('chute', 9, 6);
    g.clear();
    g.fillStyle(0x7a4a24).fillRect(2, 4, 1, 5);
    g.fillStyle(0xf4f1e8).fillRect(0, 0, 6, 4);
    g.fillStyle(0x4caf50).fillRect(2, 1, 2, 2);
    g.generateTexture('plot-sign', 6, 9);
    g.clear();
    g.fillStyle(0x1b5e20).fillRect(0, 0, 9, 1).fillRect(1, 1, 7, 1).fillRect(2, 2, 5, 1).fillRect(3, 3, 3, 1).fillRect(4, 4, 1, 1);
    g.fillStyle(0x8dffb0).fillRect(1, 0, 7, 1).fillRect(2, 1, 5, 1).fillRect(3, 2, 3, 1);
    g.generateTexture('plot-arrow', 9, 5);
    token('token', 0x2e7d32);
    token('token-gold', 0xffc23d);
    g.destroy();
  }

  setState(s) { this.state = s; this.stateTime = 0; }

  startSchool() {
    if (this.state !== 'idle') { this.scene.restart({ go: true, mode: 'school' }); return; }
    this.school = new School(this, this.ui);
    this.nextAirport = { worldX: 1e9, name: AIRPORT.names[0], spawned: false };
    this.startFlight();
    this.school.begin();
  }

  // Leave flight school and carry on as a normal flight.
  skipSchool() {
    if (!this.school) return;
    this.school = null;
    this.frozen = false;
    this.ui.hideCoach();
    this.save.tutorialDone = true;
    writeSave(this.save);
    this.nextAirport = { worldX: this.distancePx + AIRPORT.every, name: AIRPORT.names[0], spawned: false };
    this.nextStormAt = this.distancePx + WIDTH + 100;
    this.nextIssrAt = this.distancePx + 100;
    this.nextTokenAt = this.distancePx + 100;
  }

  startFlight() {
    if (this.state !== 'idle') { this.scene.restart({ go: true }); return; }
    // Upgrades may have been bought in the hangar since this scene was built.
    this.kit = loadout(this.save);
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.setState('takeoff');
    this.cargoIcon.setVisible(true);
    if (!this.school) {
      this.save.flights++;
      writeSave(this.save);
      this.ui.tipOnce('takeoff', 'Take off!', 'Tap to fly up. Grab the trees. Land to keep them!', 'good', 3);
    }
  }

  setDropVisible(v) { this.dropBg.setVisible(v); this.dropLabel.setVisible(v); this.dropShown = v; }

  onTap(p) {
    if (this.school && this.school.onTap()) return;   // flight school uses the tap to continue
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
    this.plane.vy = PLANE.flapVelocity;
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
    } else {
      this.speed = this.school ? WORLD.startSpeed : Math.min(WORLD.maxSpeed, WORLD.startSpeed + WORLD.speedGain * this.elapsed);
    }
    const dx = this.speed * dt;
    this.distancePx += dx;

    // Plane
    if (this.state === 'takeoff') {
      this.plane.vy = TAKEOFF.climbVelocity;
      this.plane.y += this.plane.vy * dt;
      if (this.stateTime >= TAKEOFF.seconds) { this.setState('playing'); this.plane.vy = 0; }
    } else if (this.state === 'playing') {
      this.plane.vy = Math.min(PLANE.maxFall, this.plane.vy + PLANE.gravity * dt);
      this.plane.y += this.plane.vy * dt;
      if (this.plane.y < 0) { this.plane.y = 0; this.plane.vy = 0; }
    }
    this.drawPlane();

    // CO2: high during takeoff and the landing roll, steady while cruising.
    this.co2Rate = (this.state === 'playing') ? this.kit.co2Cruise : this.kit.co2Takeoff;
    this.totalCo2 += this.co2Rate * dt;
    const co2Heat = this.co2Rate * CLIMATE.co2ToHeat * dt;
    this.heat += co2Heat;
    this.breakdown.co2 += co2Heat;

    // Trees keep cooling for the rest of the flight, more as they grow.
    for (const t of this.trees) {
      const age = this.elapsed - t.plantedAt;
      const stage = age < 4 ? 0 : age < 9 ? 1 : 2;
      if (stage !== t.stage) { t.stage = stage; if (t.sprite.active) t.sprite.setTexture(`tree-${t.kind}-${stage}`); }
      const cool = this.kit.tree.coolPerStage[stage] * dt;
      this.heat -= cool;
      this.breakdown.trees += cool;
      this.treeFeedback += cool;
    }
    if (this.treeFeedback >= 1) {
      this.popup(WIDTH / 2, SKY_H - 12, `-${this.treeFeedback.toFixed(1)} from your forest`, '#8dffb0');
      this.coolSparkle();
      this.treeFeedback = 0;
    }

    this.spawn();
    this.scroll(dx);
    this.updateScenery(dx);
    this.updateDayNight(time);
    this.updateLightning(time);

    const box = this.hitbox();
    let inIssr = false;
    for (const i of this.issrs) {
      const inside = overlaps(box, { x: i.x, y: i.y, w: i.width, h: i.height });
      if (inside) { inIssr = true; i.entered = true; }
      i.setAlpha(this.issrAlpha(i, box, inside));
      i.tilePositionY += dt * 4;
    }
    this.updateTokens(dt, box);
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
    if (this.heat >= CLIMATE.dangerLine * 0.75 && !this.warnedHot) {
      this.warnedHot = true;
      this.ui.toast('Planet overheating!', this.isDay ? 'Make contrails in the sunshine, or land soon!' : 'Stay out of icy air at night, or land soon!', 'bad', 3);
    }
    if (this.heat >= CLIMATE.dangerLine) return this.finish({ reason: 'The planet got too hot!\nFlight grounded.', sound: 'overheat' });
    if (this.spriteBottom() >= SKY_H) {
      const rw = this.runwayUnder(box);
      if (rw) return this.land(rw);
      return this.finish({ reason: 'You hit the ground!' });
    }
    for (const s of this.storms) {
      for (const r of s.rects) {
        if (overlaps(box, { x: r.x, y: r.y, w: r.width, h: r.height })) return this.finish({ reason: 'Turbulence!\nYou hit a storm.' });
      }
    }
  }

  multiplier() { return 1 + CARGO.multiplierPerSkip * this.airportsSkipped; }

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
    this.planeSprite.setRotation(this.state === 'takeoff' ? -0.15 : tilt);
  }

  // ---------- scenery ----------

  updateScenery(dx) {
    this.cloudsFar.tilePositionX += dx * 0.15;
    this.hills.tilePositionX += dx * 0.3;
    this.city.tilePositionX += dx * 0.55;
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
    this.cloudsFar.setAlpha(0.55 - 0.35 * n);
  }

  // ---------- airports ----------

  addRunway(worldX, name) {
    const x = PLANE.x + worldX - this.distancePx;
    const strip = this.add.rectangle(x, SKY_H, AIRPORT.runwayLen, 6, COLOURS.runway).setOrigin(0);
    const parts = [strip];
    for (let m = 8; m < AIRPORT.runwayLen - 8; m += 20) {
      parts.push(this.add.rectangle(x + m, SKY_H + 2, 10, 2, COLOURS.runwayMark).setOrigin(0));
    }
    // Control tower at the far end.
    parts.push(this.add.rectangle(x + AIRPORT.runwayLen - 14, SKY_H - 22, 6, 22, 0xd8d4c8).setOrigin(0));
    parts.push(this.add.rectangle(x + AIRPORT.runwayLen - 17, SKY_H - 28, 12, 7, 0x3e4a61).setOrigin(0));
    parts.push(this.add.text(x + AIRPORT.runwayLen / 2, SKY_H + 8, name,
      { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0));
    this.runwayLayer.add(parts);
    this.runways.push({ worldX, name, parts, strip });
  }

  runwayUnder(box) {
    return this.runways.find(r => r.strip.x <= box.x && box.x + box.w <= r.strip.x + AIRPORT.runwayLen && r.name !== AIRPORT.home);
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

  treeKind() { return this.kit.tree ? this.kit.tree.kind : 'spruce'; }

  // Parcels keep the plane's forward speed and drift down under a parachute, so you have to
  // drop them before you reach a soil plot. This works out where one would land if dropped now.
  predictLanding() {
    let x = this.plane.x + PLANE.w / 2, y = this.plane.y + PLANE.h, vy = 0, vx = 0, t = 0;
    const dt = 1 / 60;
    while (y < SKY_H && t < 8) {
      t += dt;
      vy = t < PARCEL.chuteAfter ? vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, vy + PARCEL.gravity * dt);
      vx = -this.speed * (1 - Math.exp(-t / PARCEL.dragTime));   // on screen: drifts back as it slows
      x += vx * dt; y += vy * dt;
    }
    return x;
  }

  dropParcel() {
    if (this.state !== 'playing' || !this.kit.tree || this.frozen) return;
    if (this.parcels <= 0) { sfx.nope(); return; }
    this.parcels--;
    const crate = this.add.rectangle(0, 0, 5, 5, 0xc8a165).setStrokeStyle(1, 0x7a4a24);
    const chute = this.add.image(0, -7, 'chute').setVisible(false);
    const box = this.add.container(this.plane.x + PLANE.w / 2, this.plane.y + PLANE.h, [chute, crate]);
    this.fxLayer.add(box);
    this.parcelsFalling.push({ box, chute, t: 0, vy: 0 });
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
      this.parcelLanded(p.box.x);
      p.box.destroy();
      return false;
    });
  }

  parcelLanded(x) {
    const plot = this.plots.find(pl => !pl.used && x >= pl.x - 3 && x <= pl.x + PARCEL.plotW + 3);
    if (!plot) {
      this.burst(x, SKY_H, 0xc8a165, 6);
      this.popup(x, SKY_H - 14, 'missed!', '#ff8080');
      sfx.nope();
      return;
    }
    plot.used = true;
    const cx = plot.x + PARCEL.plotW / 2, kind = this.treeKind();
    const sprite = this.add.image(cx, SKY_H + 1, `tree-${kind}-0`).setOrigin(0.5, 1).setScale(0.2);
    this.treeLayer.add(sprite);
    this.tweens.add({ targets: sprite, scale: 1, duration: 300, ease: 'Back.easeOut' });
    plot.parts.push(sprite);
    this.trees.push({ sprite, kind, plantedAt: this.elapsed, stage: 0 });
    this.planted++;
    this.burst(cx, SKY_H - 2, 0x8dffb0, 12);
    this.burst(cx, SKY_H - 2, 0xffe15a, 6);
    this.popup(cx, SKY_H - 24, 'TREE PLANTED!', '#8dffb0', 8);
    sfx.plant();
    buzz(30);
    this.ui.tipOnce('firstTree', 'Tree planted!', 'It cools the Earth for the rest of your flight. Plant early: trees grow!', 'good', 3.5);
  }

  addPlot(x) {
    const W = PARCEL.plotW;
    // A raised mound of dark soil with furrows, a little sign, and a marker that bobs above it.
    const parts = [
      this.add.rectangle(x + 2, SKY_H - 3, W - 4, 3, 0x7a4a24).setOrigin(0),
      this.add.rectangle(x, SKY_H, W, 6, 0x6a3c1c).setOrigin(0),
    ];
    for (let i = 4; i < W - 3; i += 6) parts.push(this.add.rectangle(x + i, SKY_H - 2, 3, 1, 0x4a2a10).setOrigin(0));
    parts.push(this.add.image(x + W - 3, SKY_H - 3, 'plot-sign').setOrigin(0.5, 1));
    const marker = this.add.image(x + W / 2, SKY_H - 18, 'plot-arrow').setOrigin(0.5);
    parts.push(marker);
    this.plotLayer.add(parts);
    this.plots.push({ x, parts, marker, used: false });
  }

  drawAim() {
    const g = this.aimGfx;
    g.clear();
    if (!this.kit.tree || this.parcels <= 0 || this.state !== 'playing') return;
    const x = Math.round(this.predictLanding());
    const onPlot = this.plots.some(pl => !pl.used && x >= pl.x - 3 && x <= pl.x + PARCEL.plotW + 3);
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
      this.popup(WIDTH / 2, 60, `Long flight! Landing bonus x${this.multiplier()}`, '#ffe15a');
      if (this.airportsSkipped === 1) this.ui.tipOnce('skipped', 'Flying on!', 'Longer flights = more trees when you land. But crash and you lose them all!', 'good', 3.5);
      this.nextAirport = {
        worldX: na.worldX + AIRPORT.every,
        name: AIRPORT.names[this.airportIndex % AIRPORT.names.length],
        spawned: false,
      };
    }
    const toAirport = this.nextAirport.worldX - this.distancePx;
    if (this.school) return;   // flight school places everything itself
    if (toAirport < 400 && toAirport > 0 && !this.school) this.ui.tipOnce('airport', 'Airport ahead!', 'Stop tapping and glide onto the grey runway to land. Or fly on for more trees!', 'good', 3.5);

    if (this.kit.tree && this.distancePx >= this.nextPlotAt) {
      const x = WIDTH + 10;
      const onRunway = this.runways.some(r => x + PARCEL.plotW > r.strip.x - 10 && x < r.strip.x + AIRPORT.runwayLen + 10)
        || this.nextAirport.worldX - this.distancePx < WIDTH - PLANE.x + 40 && this.nextAirport.worldX + AIRPORT.runwayLen - this.distancePx > WIDTH - PLANE.x - PARCEL.plotW - 40;
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
      if (Math.random() < ISSR.spawnChance) this.addIssr();
      this.nextIssrAt += ISSR.spawnEvery;
    }
    if (this.distancePx >= this.nextTokenAt) {
      const chance = Math.min(TOKENS.maxChance, TOKENS.chance + TOKENS.chancePerKm * this.distancePx / 1000);
      if (Math.random() < chance) this.addToken();
      this.nextTokenAt += TOKENS.spawnEvery;
    }
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
        this.popup(tx, ty - 8, `+${t.value} tree${t.value > 1 ? 's' : ''}`, t.value > 1 ? '#ffe15a' : '#8dffb0');
        this.burst(tx, ty, 0x4caf50, 5);
        sfx.coin();
        this.tweens.add({ targets: this.cargoIcon, scale: 1.4, duration: 80, yoyo: true });
        if (this.cargo === t.value) this.ui.tipOnce('firstToken', 'You grabbed a tree!', 'It is on board now (top left). Land safely to keep it!', 'good', 3.5);
        t.img.destroy();
        return false;
      }
      if (t.img.x < -20) { t.img.destroy(); return false; }
      return true;
    });
  }

  addStormPair() {
    const gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * this.stormCount);
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    this.addStormPairAt(WIDTH + 10, Phaser.Math.Between(lo, hi), gap);
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

  // Now and then a storm flickers with lightning.
  updateLightning(time) {
    for (const st of this.storms) {
      if (st.flashUntil && time > st.flashUntil) { st.parts.forEach(p => p.clearTint()); st.flashUntil = 0; }
      else if (!st.flashUntil && Math.random() < 0.002) {
        st.parts.forEach(p => p.setTint(0xe8e8ff));
        st.flashUntil = time + 90;
      }
    }
  }

  addIssr() {
    const w = Phaser.Math.Between(ISSR.minW, ISSR.maxW);
    const h = Phaser.Math.Between(ISSR.minH, ISSR.maxH);
    this.addIssrAt(WIDTH + 10, Phaser.Math.Between(10, SKY_H - h - 10), w, h);
  }

  addIssrAt(x, y, w, h) {
    const r = this.add.tileSprite(x, y, w, h, 'issr-tile').setOrigin(0).setAlpha(this.kit.hiddenAlpha);
    r.tilePositionX = Phaser.Math.Between(0, 31); r.tilePositionY = Phaser.Math.Between(0, 31);
    this.issrLayer.add(r);
    this.issrs.push(r);
    return r;
  }

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
    for (const i of this.issrs) i.x -= dx;
    this.issrs = this.issrs.filter(i => {
      if (i.x + i.width < -5) { i.destroy(); return false; }
      return true;
    });
    for (const c of this.contrails) c.x -= dx;
    for (const rw of this.runways) for (const p of rw.parts) p.x -= dx;
    this.runways = this.runways.filter(rw => {
      if (rw.strip.x + AIRPORT.runwayLen < -5) { rw.parts.forEach(p => p.destroy()); return false; }
      return true;
    });

    for (const t of this.tokens) t.img.x -= dx;
    const bob = Math.round(Math.sin(this.gameTime / 180) * 2);
    for (const pl of this.plots) {
      pl.x -= dx; for (const part of pl.parts) part.x -= dx;
      pl.marker.setVisible(!pl.used && this.parcels > 0).setY(SKY_H - 18 + bob);
    }
    this.plots = this.plots.filter(pl => { if (pl.x + PARCEL.plotW < -30) { pl.parts.forEach(p => p.destroy()); return false; } return true; });
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
      if (half === 'dusk') { sfx.dusk(); this.ui.toast('Night is coming!', 'At night contrails TRAP heat. Avoid the icy air!', 'bad', 3); }
      if (half === 'dawn') { sfx.dawn(); this.ui.toast('Sunrise!', 'In sunshine contrails BLOCK sunlight. Find the icy air!', 'good', 3); }
      // Night Owl: a whole night flown without trapping any heat.
      if (half === 'night' && this.state === 'playing') this.night = { started: true, trappedAtStart: this.heatTrapped };
      if (half === 'dawn' && this.night.started && this.heatTrapped - this.night.trappedAtStart < 0.5) {
        this.nightOwl = true;
        this.popup(WIDTH / 2, 60, 'NIGHT OWL!', '#ffe15a', 16);
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
    const rate = (isDay ? CLIMATE.sunBlockedPerCol : CLIMATE.heatTrappedPerCol) * blocked * strength;
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
    t.x = Phaser.Math.Clamp(t.x, t.width / 2 + 2, WIDTH - t.width / 2 - 2);
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
    this.distText.setText(`${Math.floor(this.distancePx / WORLD.pxPerMetre)}m`);

    const toAirport = Math.round(this.nextAirport.worldX - this.distancePx);
    if (this.state === 'landing') this.nextText.setText(`Welcome to ${this.landedAt}!`);
    else if (toAirport <= 0) this.nextText.setText(`${this.nextAirport.name}: glide down to land!`);
    else if (toAirport < 300) this.nextText.setText(`${this.nextAirport.name} ${toAirport}m: glide down!`);
    else if (toAirport < AIRPORT.signFrom) this.nextText.setText(`Next: ${this.nextAirport.name} ${toAirport}m`);
    else this.nextText.setText('');

    if (inIssr) this.hintText.setText(this.isDay ? 'ICY AIR! shade: cooler' : 'ICY AIR! heat trapped!');
    else this.hintText.setText('');

    const forest = this.trees.length ? `FOREST x${this.trees.length}` : '';
    this.parcelText.setText(this.kit.tree && this.state !== 'over' ? (this.parcels ? `drop on soil! ${forest}` : forest) : '');
    const showDrop = this.kit.tree && this.parcels > 0 && this.state === 'playing' && !this.frozen;
    this.setDropVisible(showDrop);
    if (showDrop) this.dropLabel.setText(`DROP\nx${this.parcels}`);
    this.cargoText.setText(`${this.cargo}`);
    this.multText.setText(this.airportsSkipped ? `x${this.multiplier()}` : '');
    this.multText.x = this.cargoText.x + this.cargoText.width + 4;
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
    earned.push({ label: `Trees grabbed in the sky`, n: this.cargo, lost: !landed });
    if (mult > 1 && this.cargo) earned.push({ label: `Long flight bonus x${mult}`, n: Math.round(this.cargo * (mult - 1)), lost: !landed });
    if (heat < 0) earned.push({ label: 'Cooler Earth bonus', n: CARGO.coolBonus, lost: !landed });
    const gained = landed ? earned.reduce((a, e) => a + e.n, 0) : 0;
    if (!landed && this.cargo) this.popup(this.plane.x + 25, this.plane.y - 14, `-${this.cargo} trees lost!`, '#ff6a5a', 16);

    const newBadges = [];
    const award = (id, cond) => { if (cond && !this.save.badges.includes(id)) { this.save.badges.push(id); newBadges.push(id); } };
    award('firstLanding', landed);
    award('longHaul', landed && this.airportsSkipped >= 2);
    award('sunShield', this.sunBlocked >= 30);
    award('nightOwl', this.nightOwl);
    award('coolPlanet', landed && heat < 0);
    award('forester', this.planted >= 3);
    award('treeHunter', landed && this.cargo >= 15);

    const newRecord = landed && !this.school && m > this.save.bestDistance;
    if (newRecord) this.save.bestDistance = m;
    this.save.trees += gained;
    // The first safe landing earns one free upgrade, to show what the hangar is for.
    if (landed && !this.save.freeGiven) { this.save.freeGiven = true; this.save.freeUpgrade = true; }
    writeSave(this.save);

    this.result = {
      landed, landedAt: this.landedAt, reason, distance: m, heat, co2PerKm: Number(perKm),
      sunBlocked: Math.round(this.sunBlocked * 10) / 10, heatTrapped: Math.round(this.heatTrapped * 10) / 10,
      breakdown: { ...this.breakdown }, earned, gained, newBadges, newRecord, planted: this.planted,
      cargo: this.cargo, school: !!this.school,
    };
    if (this.school) this.school.finished(this.result);
    if (gained) this.time.delayedCall(landed ? 600 : 0, () => sfx.coin());
    this.time.delayedCall(landed ? 900 : 1100, () => this.ui.showResults(this.result));
  }
}
