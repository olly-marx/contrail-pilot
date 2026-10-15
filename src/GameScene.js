import { WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, CONTRAIL, COLOURS } from './config.js';

const SKY_H = HEIGHT - GROUND_H;

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  create() {
    this.state = 'ready';            // ready -> playing -> over
    this.speed = WORLD.startSpeed;
    this.distancePx = 0;
    this.elapsed = 0;
    this.storms = [];
    this.issrs = [];
    this.contrails = [];
    this.nextStormAt = WIDTH + 40;   // scroll distance at which the next storm pair spawns
    this.nextIssrAt = 0;
    this.stormCount = 0;
    this.lastContrail = 0;

    // Draw order: ISSRs, contrails, storms, plane, ground, HUD.
    this.issrLayer = this.add.layer();
    this.contrailLayer = this.add.layer();
    this.stormLayer = this.add.layer();

    this.plane = { x: PLANE.x, y: SKY_H / 2, vy: 0 };
    this.planeBody = this.add.rectangle(0, 0, PLANE.w, PLANE.h, COLOURS.plane).setOrigin(0);
    this.planeTail = this.add.rectangle(0, 0, 4, 6, COLOURS.planeTail).setOrigin(0);

    this.add.rectangle(0, SKY_H, WIDTH, GROUND_H, COLOURS.ground).setOrigin(0);
    this.add.rectangle(0, SKY_H, WIDTH, 3, COLOURS.groundEdge).setOrigin(0);

    const font = { fontFamily: 'monospace', fontSize: '16px', color: COLOURS.text, stroke: '#000', strokeThickness: 3 };
    this.distText = this.add.text(WIDTH / 2, 12, '0 m', font).setOrigin(0.5, 0);
    this.msgText = this.add.text(WIDTH / 2, HEIGHT / 2 - 40, 'CONTRAIL PILOT\n\nTap to fly', { ...font, align: 'center' }).setOrigin(0.5);
    this.issrHint = this.add.text(WIDTH / 2, SKY_H + 14, '', { ...font, fontSize: '11px' }).setOrigin(0.5, 0);

    this.input.on('pointerdown', () => this.flap());
    this.input.keyboard.on('keydown-SPACE', () => this.flap());
    this.input.keyboard.on('keydown-UP', () => this.flap());

    this.drawPlane();
  }

  flap() {
    if (this.state === 'ready') {
      this.state = 'playing';
      this.msgText.setText('');
    } else if (this.state === 'over') {
      if (this.time.now - this.overAt > 600) this.scene.restart();   // avoid instant restart from a panic tap
      return;
    }
    this.plane.vy = PLANE.flapVelocity;
  }

  update(time, deltaMs) {
    const dt = Math.min(deltaMs, 50) / 1000;   // clamp so a background tab doesn't teleport the plane
    if (this.state === 'ready') {
      this.plane.y = SKY_H / 2 + Math.sin(time / 300) * 6;
      this.drawPlane();
      return;
    }
    if (this.state === 'over') {
      this.updateContrails(dt, time);
      return;
    }

    this.elapsed += dt;
    this.speed = Math.min(WORLD.maxSpeed, WORLD.startSpeed + WORLD.speedGain * this.elapsed);
    const dx = this.speed * dt;
    this.distancePx += dx;

    // Plane physics
    this.plane.vy = Math.min(PLANE.maxFall, this.plane.vy + PLANE.gravity * dt);
    this.plane.y += this.plane.vy * dt;
    if (this.plane.y < 0) { this.plane.y = 0; this.plane.vy = 0; }
    this.drawPlane();

    this.spawn();
    this.scroll(dx);

    const box = { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h };
    if (box.y + box.h >= SKY_H) return this.gameOver('You hit the ground!');
    for (const s of this.storms) {
      for (const r of s.rects) {
        if (overlaps(box, { x: r.x, y: r.y, w: r.width, h: r.height })) return this.gameOver('Turbulence!\nYou hit a storm.');
      }
    }

    let inIssr = false;
    for (const i of this.issrs) {
      const inside = overlaps(box, { x: i.x, y: i.y, w: i.width, h: i.height });
      if (inside) { inIssr = true; i.entered = true; }
      i.setAlpha(this.issrAlpha(i, box, inside));
    }
    if (inIssr && time - this.lastContrail > CONTRAIL.every) {
      this.lastContrail = time;
      this.addContrail(time);
    }
    this.issrHint.setText(inIssr ? 'In an ice supersaturated region!' : '');
    this.updateContrails(dt, time);

    this.distText.setText(`${Math.floor(this.distancePx / WORLD.pxPerMetre)} m`);
  }

  drawPlane() {
    // Tilt is faked with a 1-2 px tail offset; real sprites come later.
    this.planeBody.setPosition(Math.round(this.plane.x), Math.round(this.plane.y));
    this.planeTail.setPosition(Math.round(this.plane.x), Math.round(this.plane.y) - 4);
  }

  spawn() {
    if (this.distancePx >= this.nextStormAt - WIDTH) {
      this.addStormPair();
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
    // Distance from the plane's nose to the ISSR's nearest edge, horizontally and vertically.
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
  }

  updateContrails(dt, time) {
    this.contrails = this.contrails.filter(c => {
      const age = time - c.born;
      if (age > CONTRAIL.life || c.x < -10) { c.destroy(); return false; }
      c.x -= CONTRAIL.drift * dt;
      // Fade in three steps so it stays pixel-art crisp instead of a smooth gradient.
      const step = Math.floor((age / CONTRAIL.life) * 3);
      c.setAlpha([0.95, 0.65, 0.35][step]);
      return true;
    });
  }

  gameOver(reason) {
    this.state = 'over';
    this.overAt = this.time.now;
    this.cameras.main.shake(150, 0.01);
    const m = Math.floor(this.distancePx / WORLD.pxPerMetre);
    this.distText.setText(`${m} m`);
    this.msgText.setText(`${reason}\n\n${m} m flown\n\nTap to try again`);
    this.issrHint.setText('');
  }
}
