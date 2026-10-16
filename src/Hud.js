import { WIDTH, CLIMATE, COLOURS } from './config.js';

const BAR_TOP = 52;
const BAR_H = 200;
const BAR_W = 8;

// Map a value in [lo, hi] to a y on the bar (hi at the top).
function barY(v, lo, hi) {
  const t = Phaser.Math.Clamp((v - lo) / (hi - lo), 0, 1);
  return BAR_TOP + BAR_H - Math.round(t * BAR_H);
}

export class Hud {
  constructor(scene) {
    const small = { fontFamily: 'Pixel, monospace', fontSize: '8px', color: COLOURS.text, stroke: '#000', strokeThickness: 2 };

    // Left: CO2 production-rate gauge.
    const gx = 6;
    scene.add.rectangle(gx - 1, BAR_TOP - 1, BAR_W + 2, BAR_H + 2, COLOURS.hudBack, 0.45).setOrigin(0);
    this.co2Fill = scene.add.rectangle(gx, BAR_TOP + BAR_H, BAR_W, 0, COLOURS.co2).setOrigin(0, 1);
    scene.add.text(2, BAR_TOP - 4, 'CO2', small).setOrigin(0, 1);

    // Right: net-heating bar with a zero line and the danger line at the top.
    const hx = WIDTH - 6 - BAR_W;
    this.hx = hx;
    scene.add.rectangle(hx - 1, BAR_TOP - 1, BAR_W + 2, BAR_H + 2, COLOURS.hudBack, 0.45).setOrigin(0);
    this.zeroY = barY(0, CLIMATE.barMin, CLIMATE.dangerLine);
    this.heatFill = scene.add.rectangle(hx, this.zeroY, BAR_W, 0, COLOURS.warm).setOrigin(0);
    scene.add.rectangle(hx - 2, this.zeroY, BAR_W + 4, 1, 0xffffff).setOrigin(0);
    scene.add.rectangle(hx - 3, BAR_TOP, BAR_W + 6, 2, COLOURS.warm).setOrigin(0);

    // Planet face above the heating bar: one sprite per mood (tools/art/make_sprites.py).
    this.faceX = hx + BAR_W / 2;
    this.faceY = BAR_TOP - 14;
    this.face = scene.add.image(this.faceX, this.faceY, 'face-ok');
  }

  setCo2(rate) {
    const h = Math.round(Phaser.Math.Clamp(rate / CLIMATE.gaugeMax, 0, 1) * BAR_H);
    this.co2Fill.height = h;
    this.co2Fill.setFillStyle(rate > CLIMATE.co2Cruise * 1.5 ? 0xd0d0d0 : COLOURS.co2);
  }

  setHeat(heat, time = 0) {
    const y = barY(heat, CLIMATE.barMin, CLIMATE.dangerLine);
    if (heat >= 0) {
      this.heatFill.setPosition(this.hx, y).setSize(BAR_W, this.zeroY - y).setFillStyle(COLOURS.warm);
    } else {
      this.heatFill.setPosition(this.hx, this.zeroY + 1).setSize(BAR_W, y - this.zeroY).setFillStyle(COLOURS.cool);
    }
    // A hot Earth trembles.
    const shake = heat > 75 ? Math.round(Math.sin(time / 35)) : 0;
    this.face.x = this.faceX + shake;
    this.drawFace(heat);
  }

  drawFace(heat) {
    const mood = heat < 0 ? 'happy' : heat < 50 ? 'ok' : heat < 80 ? 'hot' : 'melting';
    this.face.setTexture(`face-${mood}`);
  }
}
