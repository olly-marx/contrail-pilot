// THROTTLE=4 node tests/lanes.cjs  slows THIS page's CPU 4x (Chrome's own "CPU throttling"), to rehearse a busy CI
// machine without loading the real one (other test runs share this computer). Unset or 1 = full speed (CI).
// Used to show that tests wait on the game's state, not on the clock: a test that counts a fixed time fails here.
const throttle = async p => {
  const rate = Number(process.env.THROTTLE || 1);
  if (rate > 1) await (await p.context().newCDPSession(p)).send('Emulation.setCPUThrottlingRate', { rate });
};
module.exports = { throttle };
