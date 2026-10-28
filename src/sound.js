// Tiny chiptune effects synthesised with Web Audio, so there are no sound files to load.
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* no sound: play on */ } }   // refused (backgrounded app): quietly try again at the next sound
  return ctx;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }
// Browsers only allow audio after a user gesture; call this from the first tap.
export function unlockAudio() { ac(); }

function tone({ freq = 440, to = null, dur = 0.1, type = 'square', vol = 0.08, delay = 0 }) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise({ dur = 0.3, vol = 0.12 }) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain();
  s.buffer = buf; g.gain.value = vol;
  s.connect(g).connect(a.destination);
  s.start();
}

// Phone vibration (Android browsers; iPhones ignore it). Off when sound is muted.
export function buzz(pattern) {
  if (muted || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

export const sfx = {
  heartbeat: () => { tone({ freq: 70, to: 50, dur: 0.12, type: 'sine', vol: 0.18 }); tone({ freq: 70, to: 50, dur: 0.12, type: 'sine', vol: 0.12, delay: 0.18 }); },
  flap: () => tone({ freq: 520, to: 780, dur: 0.07, vol: 0.04 }),
  issr: () => tone({ freq: 900, to: 1300, dur: 0.12, type: 'triangle', vol: 0.06 }),
  cool: () => tone({ freq: 1400, to: 1800, dur: 0.06, type: 'sine', vol: 0.03 }),
  warm: () => tone({ freq: 220, to: 160, dur: 0.12, type: 'sawtooth', vol: 0.03 }),
  plant: () => { tone({ freq: 400, dur: 0.06, vol: 0.05 }); tone({ freq: 600, dur: 0.08, vol: 0.05, delay: 0.06 }); },
  land: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.14, vol: 0.06, delay: i * 0.09 })),
  crash: () => { noise({ dur: 0.4, vol: 0.15 }); tone({ freq: 200, to: 50, dur: 0.4, type: 'sawtooth', vol: 0.06 }); },
  overheat: () => [440, 370, 311, 262].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'sawtooth', vol: 0.05, delay: i * 0.12 })),
  coin: () => { tone({ freq: 988, dur: 0.06, vol: 0.05 }); tone({ freq: 1319, dur: 0.12, vol: 0.05, delay: 0.06 }); },
  buy: () => [659, 784, 988, 1319].forEach((f, i) => tone({ freq: f, dur: 0.09, vol: 0.05, delay: i * 0.06 })),
  nope: () => tone({ freq: 180, dur: 0.15, vol: 0.05 }),
  dusk: () => [784, 659, 523].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.05, delay: i * 0.15 })),
  fanfare: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, dur: i === 6 ? 0.5 : 0.16, type: 'triangle', vol: 0.06, delay: i * 0.13 })),   // a new era (src/welcome.js)
  dawn: () => [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.05, delay: i * 0.15 })),
};
