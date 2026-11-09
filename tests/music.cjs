// The music WRAPPER (src/music.js) against a recording AudioContext double: plain Node, ~1 s. NOBODY has listened: this holds what a machine can hold.
// 1. before the first tap (not armed) nothing is created, whatever the settings say; 2. MUTED: arming creates no context and no node; 3. MUSIC OFF: the same; 4. POSITIVE CONTROL: armed, un-muted,
// MUSIC on: a context and nodes appear and the music plays (else 1-3 prove nothing); 5. muting stops it; 6. a 'duck' cue (thud) ramps the music's gain to 0.25, a 'keep' cue (tick) does not;
// 7. every sound cue is classed in DUCKS (duck or keep). Plants: tools/plants.tsv (test music).
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let contexts = 0, nodes = 0, duckRamps = 0; const clock = { t: 0 };
  const param = () => ({ value: 1, setValueAtTime() {}, cancelScheduledValues() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime(v) { if (Math.abs(v - 0.25) < 1e-9) duckRamps++; } });
  const node = () => { nodes++; return { gain: param(), frequency: param(), connect(n) { return n; }, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {}, type: '' }; };
  class FakeAC { constructor() { contexts++; this.state = 'running'; this.sampleRate = 8000; this.destination = {}; }
    get currentTime() { return clock.t; }
    resume() { return Promise.resolve(); } suspend() { return Promise.resolve(); }
    createOscillator() { return node(); } createGain() { return node(); } createBiquadFilter() { return node(); } createDynamicsCompressor() { return node(); }
    createPeriodicWave() { return {}; } createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } createBufferSource() { return node(); } }
  globalThis.window = { AudioContext: FakeAC }; globalThis.navigator = {};
  const S = await import('../src/sound.js'), M = await import('../src/music.js');
  // 1. not armed
  M.setMusicOff(false); M.syncMusic();
  check(contexts === 0 && nodes === 0 && !M.musicPlaying(), `before the first tap nothing is created (contexts ${contexts}, nodes ${nodes})`);
  // 2. muted
  S.setMuted(true); M.armMusic();
  check(contexts === 0 && nodes === 0 && !M.musicPlaying(), `MUTED: arming creates no context and no node (contexts ${contexts}, nodes ${nodes})`);
  // 3. music off
  S.setMuted(false); M.setMusicOff(true);
  check(contexts === 0 && nodes === 0 && !M.musicPlaying(), `MUSIC OFF: no context and no node (contexts ${contexts}, nodes ${nodes})`);
  // 4. positive control
  M.setMusicOff(false);
  const nStart = nodes; clock.t = 3; await new Promise(r => setTimeout(r, 120));   // the audio clock moves: the scheduler must look ahead and schedule more notes
  check(contexts === 1 && M.musicPlaying() && nStart >= 6 && nodes > nStart + 10, `POSITIVE CONTROL: armed, un-muted, MUSIC on: the music plays and keeps scheduling (contexts ${contexts}, nodes ${nStart} -> ${nodes})`);
  // 6. ducking (before muting: the music is playing)
  const r0 = duckRamps; S.sfx.tick(); const r1 = duckRamps; S.sfx.thud(); const r2 = duckRamps;
  check(r1 === r0 && r2 > r1, `a 'keep' cue (tick) does not duck the music, a 'duck' cue (thud) ramps it to 0.25 (ramps ${r0} -> ${r1} -> ${r2})`);
  // 5. mute stops it
  S.setMuted(true); M.syncMusic();
  check(!M.musicPlaying(), 'muting stops the music');
  const n0 = nodes; M.armMusic(); M.syncMusic();
  check(nodes === n0 && !M.musicPlaying(), `muted again: nothing new is created (nodes ${n0} -> ${nodes})`);
  // 7. DUCKS covers every cue
  const loose = Object.keys(S.sfx).filter(k => !['duck', 'keep'].includes(S.DUCKS[k]));
  check(loose.length === 0, `every cue is classed in DUCKS as duck or keep (unclassed: ${loose.join(', ')})`);
  console.log(fails.length ? 'FAIL music:\n - ' + fails.join('\n - ') : 'PASS music (nothing before the first tap; muted and MUSIC off create nothing; it plays when allowed; thud ducks it, tick does not; every cue is classed)');
  process.exit(fails.length ? 1 : 0);
})();
