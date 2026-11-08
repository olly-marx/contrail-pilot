// Soft effects synthesised with Web Audio, so there are no sound files to load (research/SOUND-DESIGN.md).
// ONE muted flag: tone() and noise() both go through gate(), the only place that may create an AudioContext. Muted = no context, no nodes.
// Nobody on the team has LISTENED to these: the volumes are deliberately low, and a loud noise or a harsh wave (square, sawtooth) is not used at all
// (tests/sound.cjs holds that). Every effect still has a picture or text beside it: sound never carries information on its own.
let ctx = null, bus = null;
let muted = false;

export const NOISE_MAX = 0.1;   // the loudest any noise burst may be (gain); tests/sound.cjs checks every cue against it

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    // master chain: gain -> low-pass (takes the buzz off any tone) -> compressor (an overlap cannot clip) -> speakers. Built defensively: a browser
    // (or a test double) that lacks a piece simply plays straight to the destination.
    try {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter(), cp = ctx.createDynamicsCompressor();
      g.gain.value = 0.6; lp.type = 'lowpass'; lp.frequency.value = 3200;
      g.connect(lp); lp.connect(cp); cp.connect(ctx.destination); bus = g;
    } catch (e) { bus = null; }
  }
  if (ctx.state !== 'running') { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* no sound: play on */ } }   // refused (backgrounded app): quietly try again at the next sound
  return ctx;
}
// The ONLY way to a context for a sound: muted gives null (and creates nothing).
function gate() { return muted ? null : ac(); }
const out = () => bus || ctx.destination;

export function setMuted(m) { muted = m; if (!m) ac(); }   // (un-muting is a tap: a fine moment to create the context)
export function isMuted() { return muted; }
// Browsers only allow audio after a user gesture; call this from the first tap. Muted: nothing is created.
export function unlockAudio() { gate(); }

function tone({ freq = 440, to = null, dur = 0.1, type = 'sine', vol = 0.05, delay = 0 }) {
  const a = gate(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, dur / 3));   // a soft attack: no click at the start
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out());
  o.start(t); o.stop(t + dur + 0.02);
}

// A short, soft burst of noise through a low-pass (cutoff Hz). vol is clamped to NOISE_MAX.
function noise({ dur = 0.25, vol = 0.06, cutoff = 900, delay = 0 }) {
  const a = gate(); if (!a) return;
  const n = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, n, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = a.createBufferSource(), g = a.createGain();
  s.buffer = buf; g.gain.value = Math.min(vol, NOISE_MAX);
  const f = a.createBiquadFilter ? a.createBiquadFilter() : null;
  if (f) { f.type = 'lowpass'; f.frequency.value = cutoff; s.connect(f); f.connect(g); } else s.connect(g);
  g.connect(out());
  s.start(a.currentTime + delay);
}

// Phone vibration (Android browsers; iPhones ignore it). Off when sound is muted.
export function buzz(pattern) {
  if (muted || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

export const sfx = {
  tick: () => tone({ freq: 880, to: 700, dur: 0.035, vol: 0.025 }),   // every menu tap (before: the flying flap sound was reused, 28 sites)
  heartbeat: () => { tone({ freq: 70, to: 50, dur: 0.12, vol: 0.16 }); tone({ freq: 70, to: 50, dur: 0.12, vol: 0.1, delay: 0.18 }); },
  flap: () => tone({ freq: 520, to: 700, dur: 0.07, type: 'triangle', vol: 0.03 }),   // flying only
  issr: () => tone({ freq: 900, to: 1200, dur: 0.12, type: 'triangle', vol: 0.04 }),
  cool: () => tone({ freq: 1400, to: 1700, dur: 0.06, vol: 0.025 }),
  warm: () => tone({ freq: 220, to: 170, dur: 0.14, type: 'triangle', vol: 0.03 }),
  plant: () => { tone({ freq: 400, dur: 0.07, type: 'triangle', vol: 0.04 }); tone({ freq: 600, dur: 0.09, type: 'triangle', vol: 0.04, delay: 0.06 }); },
  land: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.045, delay: i * 0.09 })),
  // The ways a flight ends badly: four different SOFT sounds (they used to be one noise burst plus a falling sawtooth). All fall; none is a buzz.
  thud: () => { tone({ freq: 120, to: 55, dur: 0.28, vol: 0.14 }); noise({ dur: 0.18, vol: 0.05, cutoff: 500 }); },                  // the ground
  crack: () => { noise({ dur: 0.3, vol: 0.07, cutoff: 1400 }); tone({ freq: 300, to: 130, dur: 0.3, vol: 0.05 }); },                   // a storm
  flutter: () => [700, 920, 620].forEach((f, i) => tone({ freq: f, to: f * 0.85, dur: 0.07, type: 'triangle', vol: 0.04, delay: i * 0.06 })),   // a bird
  nofly: () => [440, 330].forEach((f, i) => tone({ freq: f, to: f * 0.9, dur: 0.22, type: 'triangle', vol: 0.045, delay: i * 0.16 })),         // restricted airspace
  crash: () => sfx.thud(),   // (the name the rules default to)
  overheat: () => [440, 370, 311, 262].forEach((f, i) => tone({ freq: f, dur: 0.18, type: 'triangle', vol: 0.04, delay: i * 0.12 })),
  coin: () => { tone({ freq: 988, dur: 0.06, type: 'triangle', vol: 0.04 }); tone({ freq: 1319, dur: 0.12, type: 'triangle', vol: 0.04, delay: 0.06 }); },
  buy: () => [659, 784, 988, 1319].forEach((f, i) => tone({ freq: f, dur: 0.1, type: 'triangle', vol: 0.04, delay: i * 0.06 })),
  nope: () => tone({ freq: 220, to: 190, dur: 0.12, vol: 0.05 }),
  dusk: () => [784, 659, 523].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.045, delay: i * 0.15 })),
  // Celebration cues (release B). Every one is a short rising figure from one C-major pentatonic family; losses fall and stay soft. Names are the interface (research/SOUND-DESIGN.md).
  reveal: () => { [659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.28, type: 'triangle', vol: 0.045, delay: i * 0.09 })); noise({ dur: 0.35, vol: 0.03, cutoff: 700 }); },   // a new part arrives on the plane
  era: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.045, delay: i * 0.12 })); [784, 1047, 1319].forEach(f => tone({ freq: f, dur: 0.7, type: 'triangle', vol: 0.03, delay: 0.55 })); },   // a new era (src/welcome.js; was 'fanfare')
  grow: () => { [392, 523, 659].forEach((f, i) => tone({ freq: f, dur: 0.22, vol: 0.05, delay: i * 0.1 })); noise({ dur: 0.25, vol: 0.025, cutoff: 1800, delay: 0.05 }); },   // a nature project is funded
  done: () => [523, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.045, delay: i * 0.08 })),   // a mission is done
  medal: () => { tone({ freq: 880, dur: 0.8, vol: 0.05 }); tone({ freq: 1760, dur: 0.5, vol: 0.02 }); tone({ freq: 2217, dur: 0.35, vol: 0.012 }); },   // a badge: one bell strike with a long decay
  welcome: () => { tone({ freq: 196, to: 262, dur: 0.8, vol: 0.045 }); [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: i === 3 ? 0.55 : 0.2, type: 'triangle', vol: 0.045, delay: i * 0.11 })); },   // a crossing lands
  softfail: () => [330, 262].forEach((f, i) => tone({ freq: f, to: f * 0.95, dur: 0.26, vol: 0.05, delay: i * 0.2 })),   // a crossing is lost: two falling notes, no buzz
  dawn: () => [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.2, type: 'triangle', vol: 0.045, delay: i * 0.15 })),
};
