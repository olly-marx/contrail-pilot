// Waits for the game itself instead of a fixed time (2026-10-22: with 380+ pictures, tests that
// slept 0.6-2.3 s raced the loader on slow CI machines and failed at random).
//   ready(p):   the page has finished loading the game (scene up, every texture loaded).
//   started(p): after TAKE OFF, the restarted scene is built and the flight has begun (taking off or
//               flying: NOT 'over', which a previous flight leaves behind; the art session caught it).
// Neither throws (a timeout prints one READY/STARTED TIMEOUT line to stderr, so the failure that follows says why, 2026-10-28): if the condition never comes, the test goes on and its own checks fail.
// (Before main.js runs, `game` is the <div id="game"> element: check it is the Phaser game.)
const ready = p => p.waitForFunction(() => { const s = window.game && window.game.scene && game.scene.getScene('game');
  return !!(s && s.sys.isActive() && game.registry.get('ui') && s.textures.exists('puff') && !s.load.isLoading()); }, null, { timeout: 60000 }).catch(() => { console.error('READY TIMEOUT: the game was not ready 60 s after the page loaded (a stuck load looks like a click timeout later)'); });
const started = p => p.waitForFunction(() => { const s = window.game && window.game.scene && game.scene.getScene('game');
  return !!(s && s.sys.isActive() && s.nextAirport && ['takeoff', 'playing'].includes(s.state)); }, null, { timeout: 15000 }).catch(() => { console.error('STARTED TIMEOUT: the flight had not started 15 s after TAKE OFF'); });
module.exports = { ready, started };
