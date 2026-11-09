// The music ENGINE: plays one track on a Web Audio context (src/musicplan.js says WHAT to play; this turns it into oscillators). A lookahead scheduler on the audio clock: the timer only
// decides when to look, every note time is computed from ctx.currentTime, so timer jitter never reaches the music and a loop has no seam. Used by the game (src/music.js) and by the
// preview page (tools/make-music-preview.mjs inlines this file), so what is heard on the tailnet is what ships.
import { SONGS } from './musicdata.js';
import { MUSIC_PASSES, BAR_STEPS, expandSong, stepSeconds, stepEvents } from './musicplan.js';
export { SONGS };

function pulseWave(ctx, d) {   // a pulse wave of duty d from its Fourier series
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  for (let n = 1; n < N; n++) { re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(n * Math.PI * d)); }
  return ctx.createPeriodicWave(re, im);
}

export class Player {
  // ctx: an AudioContext; out: the node to play into; song: SONGS[id]; startAt: audio time of the first step; passes: times the track plays through.
  constructor(ctx, out, song, { passes = MUSIC_PASSES, startAt = null } = {}) {
    this.ctx = ctx; this.song = song; this.bars = expandSong(song); this.sl = stepSeconds(song);
    this.total = this.bars.length * BAR_STEPS * passes; this.step = 0; this.nodes = 0;
    this.startAt = startAt == null ? ctx.currentTime + 0.08 : startAt; this.next = this.startAt;
    this.gain = ctx.createGain(); this.gain.connect(out);
    this.waves = {}; for (const d of [0.125, 0.25, 0.5]) this.waves[d] = pulseWave(ctx, d);
  }
  get endTime() { return this.startAt + this.total * this.sl; }
  get done() { return this.step >= this.total; }
  fade(from, to, t0, secs) { const g = this.gain.gain; g.cancelScheduledValues(0); g.setValueAtTime(from, Math.max(t0, this.ctx.currentTime)); g.linearRampToValueAtTime(to, Math.max(t0, this.ctx.currentTime) + secs); }
  voice(e, t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), len = e.steps * this.sl;
    if (e.duty) o.setPeriodicWave(this.waves[e.duty]); else o.type = e.type;
    o.frequency.setValueAtTime(e.f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vol, t + 0.01);
    g.gain.setValueAtTime(e.vol, t + Math.max(0.011, len * 0.7)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + len + 0.02); this.nodes += 2;
  }
  hat(t) {
    const c = this.ctx, n = Math.floor(c.sampleRate * 0.03), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = 0.025; s.buffer = b; s.connect(f); f.connect(g); g.connect(this.gain); s.start(t); this.nodes += 3;
  }
  // Schedule every step that falls in the next 120 ms. Returns false when the track has no more steps to schedule.
  tick() {
    while (this.step < this.total && this.next < this.ctx.currentTime + 0.12) {
      for (const e of stepEvents(this.song, this.bars, this.step)) { if (e.kind === 'hat') this.hat(this.next); else this.voice(e, this.next); }
      this.step++; this.next += this.sl;
    }
    return this.step < this.total;
  }
}
