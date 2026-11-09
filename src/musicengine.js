// The music ENGINE: plays one track on a Web Audio context (src/musicplan.js says WHAT to play; this turns it into oscillators). A lookahead scheduler on the audio clock: the timer only
// decides when to look, every note time is computed from ctx.currentTime, so timer jitter never reaches the music and a loop has no seam. Used by the game (src/music.js) and by the
// preview page (tools/make-music-preview.mjs inlines this file), so what is heard on the tailnet is what ships.
import { SONGS } from './musicdata.js';
import { MUSIC_PASSES, DRUMS_ON, BAR_STEPS, expandSong, stepSeconds, stepEvents } from './musicplan.js';
export { SONGS };

function pulseWave(ctx, d) {   // a pulse wave of duty d from its Fourier series
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  for (let n = 1; n < N; n++) { re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); im[n] = (2 / (n * Math.PI)) * (1 - Math.cos(n * Math.PI * d)); }
  return ctx.createPeriodicWave(re, im);
}

export class Player {
  // ctx: an AudioContext; out: the node to play into; song: SONGS[id]; startAt: audio time of the first step; passes: times the track plays through.
  constructor(ctx, out, song, { passes = MUSIC_PASSES, startAt = null, drums = DRUMS_ON } = {}) {
    this.ctx = ctx; this.song = song; this.bars = expandSong(song); this.sl = stepSeconds(song);
    this.total = this.bars.length * BAR_STEPS * passes; this.step = 0; this.nodes = 0;
    this.startAt = startAt == null ? ctx.currentTime + 0.08 : startAt; this.next = this.startAt;
    this.gain = ctx.createGain(); this.gain.connect(out);
    this.waves = {}; for (const d of [0.125, 0.25, 0.5]) this.waves[d] = pulseWave(ctx, d);
    this.drums = !!drums && !!song.voices.drums;
    if (this.drums) {   // ONE shared noise buffer and one filter each for the hats and the snares (fewer nodes per hit: a hit is a source and a gain)
      const n = Math.floor(ctx.sampleRate), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noise = b;
      this.hatF = ctx.createBiquadFilter(); this.hatF.type = 'highpass'; this.hatF.frequency.value = 7000; this.hatF.connect(this.gain);
      this.snF = ctx.createBiquadFilter(); this.snF.type = 'bandpass'; this.snF.frequency.value = 1800; this.snF.Q.value = 0.8; this.snF.connect(this.gain);
    }
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
  // A burst of the shared noise through a gain with a fast decay, into filter f.
  burst(t, vol, decay, f) {
    const c = this.ctx, src = c.createBufferSource(), g = c.createGain();
    src.buffer = this.noise; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(g); g.connect(f); src.start(t, Math.random() * 0.5, decay + 0.02); this.nodes += 2;
  }
  // The drums (synthesized chip drums, no files). kick: a sine that drops from 160 to 45 Hz in 0.12 s; snare: a noise burst through a band-pass (+ an optional short tone); hat: a short high-passed burst.
  drum(e, t) {
    const c = this.ctx;
    if (e.kind === 'kick') {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(e.vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.22); this.nodes += 2;
    } else if (e.kind === 'snare') {
      this.burst(t, e.vol, 0.13, this.snF);
      if (e.tone) { const o = c.createOscillator(), g = c.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(e.tone, t); o.frequency.exponentialRampToValueAtTime(e.tone * 0.6, t + 0.08); g.gain.setValueAtTime(e.vol * 0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.1); this.nodes += 2; }
    } else if (e.kind === 'hat') this.burst(t, e.vol, 0.03, this.hatF);
  }
  // Schedule every step that falls in the next 120 ms. Returns false when the track has no more steps to schedule.
  tick() {
    while (this.step < this.total && this.next < this.ctx.currentTime + 0.12) {
      for (const e of stepEvents(this.song, this.bars, this.step, { drums: this.drums })) { if (e.kind === 'kick' || e.kind === 'snare' || e.kind === 'hat') this.drum(e, this.next); else this.voice(e, this.next); }
      this.step++; this.next += this.sl;
    }
    return this.step < this.total;
  }
}
