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
    const small = { fontFamily: 'monospace', fontSize: '8px', color: COLOURS.text, stroke: '#000', strokeThickness: 2 };

    // Left: CO2 production-rate gauge.
    const gx = 6;
    scene.add.rectangle(gx - 1, BAR_TOP - 1, BAR_W + 2, BAR_H + 2, COLOURS.hudBack, 0.45).setOrigin(0);
    this.co2Fill = scene.add.rectangle(gx, BAR_TOP + BAR_H, BAR_W, 0, COLOURS.co2).setOrigin(0, 1);
    scene.add.text(gx + BAR_W / 2, BAR_TOP - 4, 'CO2', small).setOrigin(0.5, 1);

    // Right: net-heating bar with a zero line and the danger line at the top.
    const hx = WIDTH - 6 - BAR_W;
    this.hx = hx;
    scene.add.rectangle(hx - 1, BAR_TOP - 1, BAR_W + 2, BAR_H + 2, COLOURS.hudBack, 0.45).setOrigin(0);
    this.zeroY = barY(0, CLIMATE.barMin, CLIMATE.dangerLine);
    this.heatFill = scene.add.rectangle(hx, this.zeroY, BAR_W, 0, COLOURS.warm).setOrigin(0);
    scene.add.rectangle(hx - 2, this.zeroY, BAR_W + 4, 1, 0xffffff).setOrigin(0);
    scene.add.rectangle(hx - 3, BAR_TOP, BAR_W + 6, 2, COLOURS.warm).setOrigin(0);

    // Planet face above the heating bar, drawn from blocks.
    this.face = scene.add.graphics();
    this.faceX = hx + BAR_W / 2;
    this.faceY = BAR_TOP - 14;
  }

  setCo2(rate) {
    const h = Math.round(Phaser.Math.Clamp(rate / CLIMATE.gaugeMax, 0, 1) * BAR_H);
    this.co2Fill.height = h;
    this.co2Fill.setFillStyle(rate > CLIMATE.co2Cruise * 1.5 ? 0xd0d0d0 : COLOURS.co2);
  }

  setHeat(heat) {
    const y = barY(heat, CLIMATE.barMin, CLIMATE.dangerLine);
    if (heat >= 0) {
      this.heatFill.setPosition(this.hx, y).setSize(BAR_W, this.zeroY - y).setFillStyle(COLOURS.warm);
    } else {
      this.heatFill.setPosition(this.hx, this.zeroY + 1).setSize(BAR_W, y - this.zeroY).setFillStyle(COLOURS.cool);
    }
    this.drawFace(heat);
  }

  drawFace(heat) {
    const g = this.face, x = this.faceX, y = this.faceY;
    const mood = heat < 0 ? 'happy' : heat < 50 ? 'ok' : heat < 80 ? 'hot' : 'melting';
    const body = { happy: 0x3fa8e0, ok: 0x5fb860, hot: 0xe8a33c, melting: 0xe0483c }[mood];
    g.clear();
    // A 16x16 pixel "circle": stacked rows of decreasing width.
    g.fillStyle(0x000000);
    g.fillRect(x - 5, y - 9, 10, 18); g.fillRect(x - 9, y - 5, 18, 10); g.fillRect(x - 7, y - 7, 14, 14);
    g.fillStyle(body);
    g.fillRect(x - 4, y - 8, 8, 16); g.fillRect(x - 8, y - 4, 16, 8); g.fillRect(x - 6, y - 6, 12, 12);
    g.fillStyle(0x2f7a2f);                       // a continent, so it reads as Earth
    g.fillRect(x - 5, y - 4, 3, 3); g.fillRect(x + 3, y + 1, 3, 2);
    g.fillStyle(0x000000);                       // eyes
    g.fillRect(x - 3, y - 2, 2, 2); g.fillRect(x + 1, y - 2, 2, 2);
    if (mood === 'happy') { g.fillRect(x - 3, y + 2, 1, 1); g.fillRect(x - 2, y + 3, 4, 1); g.fillRect(x + 2, y + 2, 1, 1); }
    else if (mood === 'ok') { g.fillRect(x - 2, y + 3, 4, 1); }
    else { g.fillRect(x - 2, y + 2, 4, 1); g.fillRect(x - 3, y + 3, 1, 1); g.fillRect(x + 2, y + 3, 1, 1); }
    if (mood === 'hot' || mood === 'melting') {  // sweat drops
      g.fillStyle(0x9fe0ff);
      g.fillRect(x + 6, y - 6, 2, 3);
      if (mood === 'melting') g.fillRect(x - 8, y - 3, 2, 3);
    }
  }
}
