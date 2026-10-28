// A sound that will not start must never show the "Oops, the game got stuck" card (live bug 2026-10-28, iPhone CriOS 156 on REOPENING the app:
// "Promise: Failed to start the audio device" on a healthy game). Two halves, both in plain Node:
//   1. src/crash.js: the global unhandledrejection handler ignores audio-start/playback refusals but still shows the card for a real error (and keeps ignoring offline errors);
//   2. src/sound.js: a rejected AudioContext.resume() is caught at its source (no unhandled rejection) and retried at the next sound.
// PLANTS (tools/plants.tsv, test `audiocrash`; each must FAIL this test). Run: node tests/audiocrash.cjs
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const unhandled = []; process.on('unhandledRejection', e => unhandled.push(String((e && e.message) || e)));
  const deviceErr = () => Object.assign(new Error('Failed to start the audio device'), { name: 'NotAllowedError' });

  // 1. The crash catcher with a fake window/document.
  const handlers = {}, cards = [];
  globalThis.window = { addEventListener: (t, f) => { handlers[t] = f; } };
  globalThis.document = { createElement: () => ({ style: {}, set innerHTML(v) { this.html = v; }, querySelector: () => ({}) }), body: { appendChild: c => cards.push(c) } };
  globalThis.navigator = { userAgent: 'test' };
  const C = await import('../src/crash.js');
  const mk = () => { cards.length = 0; C.catchCrashes(() => 'state', () => {}); };
  const reject = reason => handlers.unhandledrejection({ reason });
  mk(); reject(deviceErr());
  check(cards.length === 0, 'a rejected "Failed to start the audio device" (NotAllowedError) must NOT show the stuck card');
  mk(); reject(new DOMException ? new DOMException('The play() request was interrupted by a call to pause()', 'AbortError') : new Error('AbortError'));
  check(cards.length === 0, 'an AbortError from media playback must NOT show the stuck card');
  mk(); reject(new Error('AudioContext was not allowed to start'));
  check(cards.length === 0, 'an AudioContext refusal must NOT show the stuck card');
  mk(); reject(new Error('Failed to fetch'));
  check(cards.length === 0, 'an offline error is still ignored');
  mk(); reject(new TypeError("undefined is not an object (evaluating 'save.areas')"));
  check(cards.length === 1 && /save\.areas/.test(cards[0].html), 'a REAL error still shows the stuck card (the catcher still works)');
  check(C.isBenignAudioRejection(deviceErr()) && !C.isBenignAudioRejection(new Error('x is not a function')) && !C.isBenignAudioRejection(null), 'isBenignAudioRejection tells audio refusals from real errors');

  // 2. sound.js: resume() rejects (an app that was backgrounded); no unhandled rejection, and the next sound tries again.
  let resumes = 0;
  class FakeAC { constructor() { this.state = 'suspended'; this.currentTime = 0; this.destination = {}; }
    resume() { resumes++; return Promise.reject(deviceErr()); }
    createOscillator() { return { type: '', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: () => ({ connect() {} }), start() {}, stop() {} }; }
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: x => x }; } }
  globalThis.window.AudioContext = FakeAC;
  const S = await import('../src/sound.js');
  S.unlockAudio();
  await new Promise(r => setTimeout(r, 30));
  check(unhandled.length === 0, `a rejected AudioContext.resume() is caught in sound.js (unhandled: ${unhandled.join(' | ')})`);
  const before = resumes; S.unlockAudio(); await new Promise(r => setTimeout(r, 30));
  check(resumes > before, 'the next unlock/sound tries to resume again (quiet retry)');

  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS audiocrash (audio refusals never show the stuck card, a real error still does, sound.js catches and retries)');
})().catch(e => { console.log('FAIL (the test itself threw, so no verdict was reached): ' + (e && e.stack || e)); process.exit(1); });   // (our own unhandledRejection listener would otherwise swallow it and exit 0)
