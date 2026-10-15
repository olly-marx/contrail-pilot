import {
  WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS,
  TAKEOFF, AIRPORT, DAYNIGHT, RADIATION, CLIMATE,
} from './config.js';
import { Hud } from './Hud.js';

const SKY_H = HEIGHT - GROUND_H;

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

  create() {
    this.state = 'ready';            // ready -> takeoff -> playing -> landing | over
    this.speed = WORLD.startSpeed;
    this.distancePx = 0;
    this.elapsed = 0;
    this.stateTime = 0;
    this.storms = [];
    this.issrs = [];
    this.contrails = [];
    this.rays = [];
    this.runways = [];
    this.nextStormAt = WIDTH + 200;  // first storm arrives after the climb-out
    this.nextIssrAt = 300;
    this.stormCount = 0;
    this.lastContrail = 0;
    this.lastSun = 0;
    this.lastHeat = 0;

    this.heat = 0;                   // net heating (play units)
    this.totalCo2 = 0;
    this.co2Rate = 0;
    this.sunBlocked = 0;
    this.heatTrapped = 0;
    this.hint = { text: '', until: 0 };
    this.lastHalf = 'day';

    this.airportIndex = 0;
    this.nextAirport = { worldX: AIRPORT.every, name: AIRPORT.names[0], spawned: false };

    // Draw order: ISSRs, contrails, rays, storms, plane, ground, runways, HUD.
    this.issrLayer = this.add.layer();
    this.contrailLayer = this.add.layer();
    this.rayLayer = this.add.layer();
    this.stormLayer = this.add.layer();

    this.plane = { x: PLANE.x, y: SKY_H - PLANE.h, vy: 0 };
    this.planeBody = this.add.rectangle(0, 0, PLANE.w, PLANE.h, COLOURS.plane).setOrigin(0);
    this.planeTail = this.add.rectangle(0, 0, 4, 6, COLOURS.planeTail).setOrigin(0);

    this.add.rectangle(0, SKY_H, WIDTH, GROUND_H, COLOURS.ground).setOrigin(0);
    this.add.rectangle(0, SKY_H, WIDTH, 3, COLOURS.groundEdge).setOrigin(0);
    this.runwayLayer = this.add.layer();
    this.addRunway(-60, AIRPORT.home);  // home runway under the plane

    this.hud = new Hud(this);
    this.hud.setCo2(0);
    this.hud.setHeat(0);

    const font = { fontFamily: 'monospace', fontSize: '16px', color: COLOURS.text, stroke: '#000', strokeThickness: 3 };
    this.distText = this.add.text(WIDTH / 2, 8, '0 m', font).setOrigin(0.5, 0);
    this.nextText = this.add.text(WIDTH / 2, 28, '', { ...font, fontSize: '10px' }).setOrigin(0.5, 0);
    this.hintText = this.add.text(WIDTH / 2, SKY_H + 12, '', { ...font, fontSize: '10px', align: 'center' }).setOrigin(0.5, 0);
    this.cardBack = this.add.rectangle(WIDTH / 2, HEIGHT / 2 - 30, 230, 190, 0x000000, 0.6).setVisible(false);
    this.msgText = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, 'CONTRAIL PILOT\n\nTap to take off', { ...font, align: 'center' }).setOrigin(0.5);

    this.input.on('pointerdown', () => this.flap());
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
    this.input.keyboard.on('keydown-UP', () => this.flap());

    this.cameras.main.setBackgroundColor(COLOURS.skyDay);
    this.drawPlane();
  }

  setState(s) { this.state = s; this.stateTime = 0; }

  flap() {
    if (this.state === 'ready') {
      this.setState('takeoff');
      this.msgText.setText('');
      return;
    }
    if (this.state === 'over') {
      if (this.time.now - this.overAt > 600) this.scene.restart();   // avoid instant restart from a panic tap
      return;
    }
    if (this.state === 'playing') this.plane.vy = PLANE.flapVelocity;
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;   // clamp so a background tab doesn't teleport the plane
    if (this.state === 'ready') return;
    if (this.state === 'over') {
      this.updateContrails(dt, time);
      this.updateRays(dt, time, false);
      return;
    }

    this.elapsed += dt;
    this.stateTime += dt;

    // Speed: ramps up while flying, rolls to a stop after touchdown.
    if (this.state === 'landing') {
      this.speed = Math.max(0, this.landingSpeed * (1 - this.stateTime / AIRPORT.rollSeconds));
    } else {
      this.speed = Math.min(WORLD.maxSpeed, WORLD.startSpeed + WORLD.speedGain * this.elapsed);
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
    this.co2Rate = (this.state === 'playing') ? CLIMATE.co2Cruise : CLIMATE.co2Takeoff;
    this.totalCo2 += this.co2Rate * dt;
    this.heat += this.co2Rate * CLIMATE.co2ToHeat * dt;

    this.spawn();
    this.scroll(dx);
    this.updateDayNight(time);

    const box = { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h };
    let inIssr = false;
    for (const i of this.issrs) {
      const inside = overlaps(box, { x: i.x, y: i.y, w: i.width, h: i.height });
      if (inside) { inIssr = true; i.entered = true; }
      i.setAlpha(this.issrAlpha(i, box, inside));
    }
    if (inIssr && this.state !== 'landing' && time - this.lastContrail > CONTRAIL.every) {
      this.lastContrail = time;
      this.addContrail(time);
    }
    this.updateContrails(dt, time);
    this.updateRays(dt, time, true);

    this.hud.setCo2(this.co2Rate);
    this.hud.setHeat(this.heat);
    this.updateTexts(time, inIssr);

    if (this.state === 'landing') {
      if (this.stateTime >= AIRPORT.rollSeconds) this.finish({ landed: true });
      return;
    }
    if (this.state !== 'playing') return;

    if (this.heat >= CLIMATE.dangerLine) return this.finish({ reason: 'The planet got too hot!\nFlight grounded.' });
    if (box.y + box.h >= SKY_H) {
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

  drawPlane() {
    this.planeBody.setPosition(Math.round(this.plane.x), Math.round(this.plane.y));
    this.planeTail.setPosition(Math.round(this.plane.x), Math.round(this.plane.y) - 4);
  }

  // ---------- airports ----------

  addRunway(worldX, name) {
    const x = PLANE.x + worldX - this.distancePx;
    const strip = this.add.rectangle(x, SKY_H, AIRPORT.runwayLen, 6, COLOURS.runway).setOrigin(0);
    const marks = [];
    for (let m = 8; m < AIRPORT.runwayLen - 8; m += 20) {
      marks.push(this.add.rectangle(x + m, SKY_H + 2, 10, 2, COLOURS.runwayMark).setOrigin(0));
    }
    const label = this.add.text(x + AIRPORT.runwayLen / 2, SKY_H + 26, name,
      { fontFamily: 'monospace', fontSize: '8px', color: '#ffffff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5, 0);
    const parts = [strip, ...marks, label];
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
    this.plane.y = SKY_H - PLANE.h;
    this.plane.vy = 0;
    this.setState('landing');
    this.drawPlane();
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
      this.nextAirport = {
        worldX: na.worldX + AIRPORT.every,
        name: AIRPORT.names[this.airportIndex % AIRPORT.names.length],
        spawned: false,
      };
    }

    if (this.distancePx >= this.nextStormAt - WIDTH) {
      const worldX = this.distancePx + (WIDTH + 10 - PLANE.x);
      if (!this.inStormClearZone(worldX)) this.addStormPair();
      this.nextStormAt += STORMS.spacing;
    }
    if (this.distancePx >= this.nextIssrAt) {
      if (Math.random() < ISSR.spawnChance) this.addIssr();
      this.nextIssrAt += ISSR.spawnEvery;
    }
  }

  addStormPair() {
    const gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * this.stormCount);
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    const gapY = Phaser.Math.Between(lo, hi);
    const x = WIDTH + 10;
    const top = this.add.rectangle(x, 0, STORMS.width, gapY - gap / 2, COLOURS.storm).setOrigin(0).setStrokeStyle(2, COLOURS.stormEdge);
    const bottom = this.add.rectangle(x, gapY + gap / 2, STORMS.width, SKY_H - (gapY + gap / 2), COLOURS.storm).setOrigin(0).setStrokeStyle(2, COLOURS.stormEdge);
    this.stormLayer.add([top, bottom]);
    this.storms.push({ rects: [top, bottom] });
    this.stormCount++;
  }

  addIssr() {
    const w = Phaser.Math.Between(ISSR.minW, ISSR.maxW);
    const h = Phaser.Math.Between(ISSR.minH, ISSR.maxH);
    const y = Phaser.Math.Between(10, SKY_H - h - 10);
    const r = this.add.rectangle(WIDTH + 10, y, w, h, COLOURS.issr).setOrigin(0).setAlpha(ISSR.hiddenAlpha);
    this.issrLayer.add(r);
    this.issrs.push(r);
  }

  issrAlpha(i, box, inside) {
    if (inside) return ISSR.insideAlpha;
    if (i.entered) return ISSR.revealAlpha;   // once found, it stays found
    // Distance from the plane to the ISSR's nearest edge, horizontally and vertically.
    const gapX = Math.max(0, i.x - (box.x + box.w), box.x - (i.x + i.width));
    const gapY = Math.max(0, i.y - (box.y + box.h), box.y - (i.y + i.height));
    const d = Math.max(gapX, gapY);
    if (d >= ISSR.revealPx) return ISSR.hiddenAlpha;
    // Three-step fade keeps the pixel-art look instead of a smooth gradient.
    const step = Math.min(3, Math.floor((1 - d / ISSR.revealPx) * 4));
    return ISSR.hiddenAlpha + (ISSR.revealAlpha - ISSR.hiddenAlpha) * (step / 3);
  }

  addContrail(time) {
    const s = CONTRAIL.size;
    const r = this.add.rectangle(this.plane.x - s, this.plane.y + PLANE.h / 2 - s / 2 + Phaser.Math.Between(-1, 1), s, s, COLOURS.contrail).setOrigin(0);
    r.born = time;
    this.contrailLayer.add(r);
    this.contrails.push(r);
  }

  scroll(dx) {
    for (const s of this.storms) for (const r of s.rects) r.x -= dx;
    this.storms = this.storms.filter(s => {
      if (s.rects[0].x + STORMS.width < -5) { s.rects.forEach(r => r.destroy()); return false; }
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
  }

  updateContrails(dt, time) {
    this.contrails = this.contrails.filter(c => {
      const age = time - c.born;
      if (age > CONTRAIL.life || c.x < -10) { c.destroy(); return false; }
      c.x -= CONTRAIL.drift * dt;
      if (c.flashUntil && time > c.flashUntil) { c.setFillStyle(COLOURS.contrail); c.flashUntil = 0; }
      // Fade in three steps so it stays pixel-art crisp instead of a smooth gradient.
      const step = Math.floor((age / CONTRAIL.life) * 3);
      c.setAlpha([0.95, 0.65, 0.35][step]);
      return true;
    });
  }

  // ---------- day, night and radiation ----------

  dayNightPhase() {
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const p = this.elapsed % (D + N);
    if (p < D) return { isDay: true, toOther: Math.max(0, (p - (D - B)) / B) };
    const q = p - D;
    return { isDay: false, toOther: Math.max(0, (q - (N - B)) / B) };
  }

  updateDayNight(time) {
    const { isDay, toOther } = this.dayNightPhase();
    const from = isDay ? COLOURS.skyDay : DAYNIGHT.skyNight;
    const to = isDay ? DAYNIGHT.skyNight : COLOURS.skyDay;
    this.cameras.main.setBackgroundColor(lerpColour(from, to, toOther));

    // Teach the switch the moment it starts.
    const half = isDay ? (toOther > 0 ? 'dusk' : 'day') : (toOther > 0 ? 'dawn' : 'night');
    if (half !== this.lastHalf) {
      if (half === 'dusk') this.showHint('Night is coming!\nContrails will TRAP heat.', time);
      if (half === 'dawn') this.showHint('Sunrise!\nContrails will BLOCK sunlight.', time);
      this.lastHalf = half;
    }
    this.isDay = isDay;
  }

  showHint(text, time) { this.hint = { text, until: time + 3000 }; }

  updateRays(dt, time, scoring) {
    if (scoring && this.state !== 'landing') {
      if (this.isDay && time - this.lastSun > RADIATION.sunEvery) {
        this.lastSun = time;
        const r = this.add.rectangle(Phaser.Math.Between(20, WIDTH - 20), -6, 1, 6, COLOURS.sun).setOrigin(0);
        r.kind = 'sun'; r.vy = RADIATION.sunSpeed;
        this.rayLayer.add(r); this.rays.push(r);
      }
      if (!this.isDay && time - this.lastHeat > RADIATION.heatEvery) {
        this.lastHeat = time;
        const r = this.add.rectangle(Phaser.Math.Between(20, WIDTH - 20), SKY_H - 6, 2, 5, COLOURS.heat).setOrigin(0);
        r.kind = 'heat'; r.vy = -RADIATION.heatSpeed;
        this.rayLayer.add(r); this.rays.push(r);
      }
    }

    this.rays = this.rays.filter(r => {
      r.y += r.vy * dt;
      if (r.y > SKY_H || r.y < -10) { r.destroy(); return false; }
      if (!scoring || r.bounced) return true;
      const rb = { x: r.x, y: r.y, w: r.width, h: r.height };
      const hit = this.contrails.find(c => overlaps(rb, { x: c.x, y: c.y, w: CONTRAIL.size, h: CONTRAIL.size }));
      if (!hit) return true;
      hit.flashUntil = time + 150;
      if (r.kind === 'sun') {
        // Sunlight blocked: reflected back to space, the planet cools.
        hit.setFillStyle(COLOURS.cool);
        this.heat += CLIMATE.sunBlocked;
        this.sunBlocked++;
        r.destroy();
        return false;
      }
      // Heat trapped: bounced back down to the ground, the planet warms.
      hit.setFillStyle(COLOURS.warm);
      this.heat += CLIMATE.heatTrapped;
      this.heatTrapped++;
      r.bounced = true;
      r.vy = RADIATION.heatSpeed;
      r.setFillStyle(COLOURS.warm);
      return true;
    });
  }

  // ---------- text and the end of a flight ----------

  updateTexts(time, inIssr) {
    this.distText.setText(`${Math.floor(this.distancePx / WORLD.pxPerMetre)} m`);

    const toAirport = Math.round(this.nextAirport.worldX - this.distancePx);
    if (this.state === 'landing') this.nextText.setText(`Touchdown in ${this.landedAt}!`);
    else if (toAirport <= 0) this.nextText.setText(`${this.nextAirport.name}: glide down to land!`);
    else if (toAirport < 300) this.nextText.setText(`${this.nextAirport.name} ${toAirport} m - glide down to land!`);
    else if (toAirport < AIRPORT.signFrom) this.nextText.setText(`Next airport: ${this.nextAirport.name} ${toAirport} m`);
    else this.nextText.setText('');

    if (time < this.hint.until) this.hintText.setText(this.hint.text);
    else if (inIssr) this.hintText.setText(this.isDay ? 'Ice supersaturated region!\nContrails block the sun.' : 'Ice supersaturated region!\nContrails trap heat!');
    else this.hintText.setText('');
  }

  finish({ landed = false, reason = '' }) {
    this.setState('over');
    this.overAt = this.time.now;
    this.co2Rate = 0;
    this.hud.setCo2(0);
    if (!landed) this.cameras.main.shake(150, 0.01);

    const m = Math.floor(this.distancePx / WORLD.pxPerMetre);
    const km = m / 1000;
    const perKm = km > 0 ? (this.totalCo2 / km).toFixed(1) : '-';
    const heat = Math.round(this.heat);
    this.result = { landed, landedAt: this.landedAt, distance: m, heat, co2PerKm: Number(perKm), sunBlocked: this.sunBlocked, heatTrapped: this.heatTrapped };

    const title = landed ? `Landed in ${this.landedAt}!` : reason;
    const planet = heat < 0 ? 'cooled' : 'warmed';
    this.distText.setText(`${m} m`);
    this.nextText.setText('');
    this.hintText.setText('');
    this.cardBack.setVisible(true);
    this.msgText.setFontSize(13).setText(
      `${title}\n\n${m} m flown\nYou ${planet} the planet: ${heat > 0 ? '+' : ''}${heat}\n` +
      `CO2 per km: ${perKm}\nSunbeams blocked: ${this.sunBlocked}\nHeat trapped: ${this.heatTrapped}\n\nTap to fly again`);
  }
}
