// Waits for the game itself instead of a fixed time (2026-10-22: with 380+ pictures, tests that
// slept 0.6-2.3 s raced the loader on slow CI machines and failed at random).
//   ready(p):   the page has finished loading the game (scene up, every texture loaded).
//   started(p): after TAKE OFF, the restarted scene is built and the flight has begun.
// Neither throws: if the condition never comes, the test goes on and its own checks fail.
// (Before main.js runs, `game` is the <div id="game"> element: check it is the Phaser game.)
const ready = p => p.waitForFunction(() => { const s = window.game && window.game.scene && game.scene.getScene('game');
  return !!(s && s.sys.isActive() && game.registry.get('ui') && s.textures.exists('puff') && !s.load.isLoading()); }, null, { timeout: 60000 }).catch(() => {});
const started = p => p.waitForFunction(() => { const s = window.game && window.game.scene && game.scene.getScene('game');
  return !!(s && s.sys.isActive() && s.nextAirport && s.state !== 'idle'); }, null, { timeout: 15000 }).catch(() => {});
module.exports = { ready, started };
