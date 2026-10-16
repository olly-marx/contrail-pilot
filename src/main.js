import { WIDTH, HEIGHT } from './config.js';
import { GameScene } from './GameScene.js';
import { loadSave } from './save.js';
import { UI } from './ui.js';

const save = loadSave();

// Wait for the pixel font so canvas text doesn't render in a fallback font first.
try { await document.fonts.load('8px Pixel'); } catch (e) { /* play on with the fallback */ }

const scene = () => game.scene.getScene('game');
const ui = new UI(save, { onStart: () => scene().startFlight(), onSchool: () => scene().startSchool() });
document.getElementById('skipSchool').onclick = () => scene().skipSchool();
// Taps on the flight-school bubble count as taps on the game.
document.getElementById('coach').addEventListener('pointerdown', () => scene().onCoachTap());

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,        // no smoothing: every pixel stays a crisp block
  roundPixels: true,
  backgroundColor: '#6ec6e8',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
  callbacks: { preBoot: g => { g.registry.set('save', save); g.registry.set('ui', ui); } },
});
window.game = game;   // exposed for debugging and automated tests

ui.showTitle();
