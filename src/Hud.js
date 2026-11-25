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

    // Planet face above the heating bar: PixelLab, two frames per mood so the sweat runs down
    // (tools/art/pixellab_faces.py + face_sweat.py). 32 px wide: kept 1 px inside the right edge of the screen.
    this.faceX = Math.min(hx + BAR_W / 2, WIDTH - 17);
    this.faceY = BAR_TOP - 18;
    this.face = scene.add.image(this.faceX, this.faceY, 'face-ok-0');
    // A blinking frame around the Earth bar, for the flight-school lesson about overheating.
    this.frame = scene.add.rectangle(hx - 6, BAR_TOP - 30, BAR_W + 12, BAR_H + 36).setOrigin(0).setStrokeStyle(2, 0xffe15a).setVisible(false).setDepth(5);
    this.frameTween = scene.tweens.add({ targets: this.frame, alpha: 0.2, duration: 300, yoyo: true, repeat: -1, paused: true });
  }

  highlight(on) {
    this.frame.setVisible(on).setAlpha(1);
    if (on) this.frameTween.resume(); else this.frameTween.pause();
  }

  setCo2(rate) {
    const h = Math.round(Phaser.Math.Clamp(rate / CLIMATE.gaugeMax, 0, 1) * BAR_H);
    this.co2Fill.setSize(BAR_W, h);   // setSize keeps the bottom origin; .height alone grew it downwards
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
    const shake = heat > 0.75 * CLIMATE.dangerLine ? Math.round(Math.sin(time / 35)) : 0;
    this.face.x = this.faceX + shake;
    this.drawFace(heat, time);
  }

  drawFace(heat, time = 0) {
    const pc = heat * 100 / CLIMATE.dangerLine, mood = heat < 0 ? 'happy' : pc < 50 ? 'ok' : pc < 80 ? 'hot' : 'melting';
    this.face.setTexture(`face-${mood}-${Math.floor(time / 350) % 2}`);   // two frames: the sweat runs down
  }
}

// THE ROUTE STRIP (the user, 2026-11-23: "the text at the top ... is always the wrong city and there's just too much text";
// approved mock-up, research/../scratch hud-mock). One bar under the distance, from the city you took off from to the city the
// flight is heading for (GameScene.targetCity: the destination, the mission's city, or the nearest unvisited one): a small
// plane rides it, each airport on the way is a tick, the target is a gold flag (blinking when it is close), and its name sits
// under the bar's end. Words never sit on the line: the plane and the ticks ride the line, the name sits under its end.
// A crossing hides it (the crossing's own bar replaces both: GameScene.drawCrossingBar).
export const STRIP = { x0: 92, x1: WIDTH - 48, y: 31, h: 21 };   // (h 19 until 0.79.1: the 25% taller font (0.79.0) ran the name out of the bottom, Oliver's screenshot 2026-11-25)   // (left of x0 - 6: seeds, crystals and the x1.5 bonus)
export class RouteStrip {
  constructor(scene) {
    const { x0, x1, y, h } = STRIP;
    this.bg = scene.add.rectangle(x0 - 6, y - 4, x1 - x0 + 12, h, 0x1b1b2f, 0.72).setOrigin(0).setDepth(6);
    this.gfx = scene.add.graphics().setDepth(7);
    this.plane = scene.add.image(x0, y + 2, 'plane-comet').setScale(0.3).setDepth(8);
    this.name = scene.add.text(x1 + 2, y + 5, '', { fontFamily: 'Pixel, monospace', fontSize: '7px', color: '#ffe15a', stroke: '#000', strokeThickness: 2 }).setOrigin(1, 0).setDepth(8);
    this.parts = [this.bg, this.gfx, this.plane, this.name];
    this.setVisible(false);
  }
  setVisible(on) { for (const p of this.parts) p.setVisible(on); this.shown = on; return this; }
  // f: 0..1 from take-off to the target; ticks: [0..1] the airports on the way; name: the target; flag: draw the gold flag
  // (false: a plain square, e.g. no destination set); blinkOff: this frame of the blink hides the flag.
  draw({ f, ticks = [], name, flag = true, blinkOff = false }) {
    const { x0, x1, y } = STRIP, g = this.gfx, end = x1 - 6, X = t => Math.round(x0 + Math.max(0, Math.min(1, t)) * (end - x0));
    const px = X(f);
    g.clear();
    g.fillStyle(0x7ee8ff).fillRect(x0, y + 1, px - x0, 2);                       // flown
    g.fillStyle(0xffffff, 0.8);
    for (let x = px + 8; x < end - 3; x += 5) g.fillRect(x, y + 1, 3, 2);         // still to fly
    g.fillStyle(0xffffff).fillRect(x0 - 2, y, 4, 4);                              // where you took off
    for (const t of ticks) { const tx = X(t); g.fillStyle(t <= f ? 0x7ee8ff : 0xc8ccd8).fillRect(tx - 1, y - 1, 2, 6); }   // airports on the way
    if (flag) {
      g.fillStyle(0xffffff).fillRect(end, y - 5, 2, 11);
      if (!blinkOff) g.fillStyle(0xffc23d).fillRect(end + 2, y - 5, 6, 4);
    } else g.fillStyle(0xffffff).fillRect(end - 2, y - 1, 6, 6);
    this.plane.setPosition(px, y + 2);
    this.name.setText(name || '').setFontSize(7);   // a long name ('WINDHOEK', 'ANTANANARIVO') shrinks to fit inside the bar (to 5 px): it never runs past the box
    for (let fs = 7; this.name.width > x1 - x0 - 10 && fs > 5;) this.name.setFontSize(--fs);
  }
}
