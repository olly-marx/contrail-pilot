// THROTTLE=4 node tests/lanes.cjs  slows THIS page's CPU 4x (Chrome's own "CPU throttling"), to rehearse a busy CI
// machine without loading the real one (other test runs share this computer). Unset or 1 = full speed (CI).
// Used to show that tests wait on the game's state, not on the clock: a test that counts a fixed time fails here.
const throttle = async p => {
  const rate = Number(process.env.THROTTLE || 1);
  if (rate > 1) await (await p.context().newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate });
  // SLOWFRAMES=ms: every animation frame arrives that many ms late (a machine too busy to draw at 60 fps). Each frame is still at most 50 ms of
  // game time, so GAME time runs slower than the clock: this is what makes a test that waits a fixed WALL time (and not on game state) fail.
  // (CPU throttling alone does not do that.) Costs no real CPU.
  const slow = Number(process.env.SLOWFRAMES || 0);
  if (slow > 0) await p.addInitScript(ms => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => setTimeout(() => raf(cb), ms); }, slow);
};
module.exports = { throttle };
