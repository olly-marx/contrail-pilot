import { WIDTH, HEIGHT } from './config.js';
import { GameScene } from './GameScene.js';
import { loadSave, writeSave } from './save.js';
import { repriceSave } from './reprice.js';
import { migrateHabitat } from './habitats.js';
import { UI } from './ui.js';
import { PilotScreens } from './pilot.js';
import { catchUp, onUpload, syncUp, syncDown, watchSave, ensureCode, getPilot, takeRecoverNext } from './online.js';
import { pilotLost } from './recoverfirst.js';
import { askPersist } from './persist.js';
import { UploadBanner } from './uploadbanner.js';
import { Tour } from './tour.js';
import { WildScreen } from './wild.js';
import { Updates } from './updates.js';
import { catchCrashes } from './crash.js';
import { loading } from './loader.js';

const save = loadSave();
// Crash catcher (src/crash.js): an error shows a card with what broke and where, instead of a silent freeze.
const crash = catchCrashes(() => { const s = window.game && game.scene.getScene('game'); if (!s) return 'menu';
  return `state ${s.state} | ${Math.round(s.distancePx || 0)} km | next ${s.nextAirport && s.nextAirport.name} | region ${s.regionNow} | ${s.isDay ? 'day' : 'night'} | frozen ${!!s.frozen}`; },
  () => writeSave(save));
// Ask the browser to keep this site's storage (where supported), so tidy-ups don't clear the save.
askPersist();   // (src/persist.js: if the browser will not promise, ONE note from landing 8 says to write the pilot code down)
if (getPilot() && save.pilotNamed === undefined) save.pilotNamed = true;   // pilots named before 0.31.0: UP NEXT asks them once to save the code
const moved = migrateHabitat(save);   // old 'rewild' levels -> UK habitat projects (before the re-value: projects are kept as they are)
if (repriceSave(save) || moved) writeSave(save);   // once, for saves from before the new prices

// Wait for the pixel font so canvas text doesn't render in a fallback font first.
try { await document.fonts.load('8px Pixel'); } catch (e) { /* play on with the fallback */ }

const scene = () => game.scene.getScene('game');
const ui = new UI(save, { onStart: () => scene().startFlight(), onSchool: () => scene().startSchool() });
document.getElementById('skipSchool').onclick = () => scene().skipSchool();
// Tips close only with their OK button. The bubble itself counts as a tap only for the
// flight-school "tap the screen" step, which has no button.
document.getElementById('coachOk').addEventListener('click', e => { e.stopPropagation(); scene().onCoachTap(); });
document.getElementById('coach').addEventListener('pointerdown', () => { if (!ui.coachButton) scene().onCoachTap(true); });   // a tap ON the bubble

loading.start(save);   // the loading screen (src/loader.js): a contrail drawn as the game's pictures arrive
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
ui.showHeldCard();    // a save that could not be read: nothing is written until the player chooses (src/save.js)

ui.showTitle();
ui.pilot = new PilotScreens(save);
ui.wild = new WildScreen(ui);   // the NATURE screen (src/wild.js)
ui.tour = new Tour(ui);   // "tap here" tutorials (src/tour.js)
if (takeRecoverNext() && pilotLost(save, getPilot())) ui.go('pilot');   // after a restore onto a phone with no pilot: 'bring back my pilot' first (src/recoverfirst.js)
ui.tour.maybe('title');
const uploadBanner = new UploadBanner(() => { const s = game.scene.getScene('game'); return !!s && ['takeoff', 'playing', 'landing'].includes(s.state); });
onUpload(ev => uploadBanner.handle(ev));   // "Back online! Uploading..." (never mid-flight)
catchUp(true);   // flights saved while offline last time
// Online save (named pilots): take a newer online copy on opening; then upload changes every 30 s.
syncDown(save).then(online => {
  if (!online) return;
  const keep = { muted: save.muted };
  for (const k of Object.keys(save)) delete save[k];
  Object.assign(save, online, keep);
  writeSave(save);
  location.reload();   // rebuild everything from the newer save
});
watchSave(save);
ensureCode();   // named pilots from before codes get one (shown on PILOT)
setInterval(() => syncUp(save), 30000);
document.addEventListener('visibilitychange', () => { if (document.hidden) syncUp(save); });   // leaving the page

// Updates (src/updates.js): a banner when a new version is out, never during a flight; the save is
// written before any reload.
window.cpUpdates = new Updates(() => { const s = game.scene.getScene('game'); return !!s && ['takeoff', 'playing', 'landing'].includes(s.state); },
  () => writeSave(save));
crash.watchCanvas(game.canvas);
