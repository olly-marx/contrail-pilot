import { WIDTH, HEIGHT } from './config.js';
import { GameScene } from './GameScene.js';
import { loadSave, writeSave } from './save.js';
import { repriceSave } from './reprice.js';
import { UI } from './ui.js';
import { PilotScreens } from './pilot.js';
import { flush } from './online.js';
import { Tour } from './tour.js';

const save = loadSave();
if (repriceSave(save)) writeSave(save);   // once, for saves from before the new prices

// Wait for the pixel font so canvas text doesn't render in a fallback font first.
try { await document.fonts.load('8px Pixel'); } catch (e) { /* play on with the fallback */ }

const scene = () => game.scene.getScene('game');
const ui = new UI(save, { onStart: () => scene().startFlight(), onSchool: () => scene().startSchool() });
document.getElementById('skipSchool').onclick = () => scene().skipSchool();
// Back to the menu from the runway. Stop the press reaching the window, where it would count as HOLD.
const runwayBack = document.getElementById('runwayBack');
runwayBack.addEventListener('pointerdown', e => e.stopPropagation());
runwayBack.onclick = () => scene().backToMenu();
// Tips close only with their OK button. The bubble itself counts as a tap only for the
// flight-school "tap the screen" step, which has no button.
document.getElementById('coachOk').addEventListener('click', e => { e.stopPropagation(); scene().onCoachTap(); });
document.getElementById('coach').addEventListener('pointerdown', () => { if (!ui.coachButton) scene().onCoachTap(); });

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
ui.pilot = new PilotScreens(save);
ui.tour = new Tour(ui);   // "tap here" tutorials (src/tour.js)
ui.tour.maybe('title');
flush();   // flights saved while offline last time
