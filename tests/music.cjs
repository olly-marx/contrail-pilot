// The music WRAPPER (src/music.js) against a recording AudioContext double: plain Node, ~1 s. NOBODY has listened: this holds what a machine can hold.
// 1. before the first tap (not armed) nothing is created, whatever the settings say; 2. MUTED: arming creates no context and no node; 3. MUSIC OFF: the same; 4. POSITIVE CONTROL: armed, un-muted,
// MUSIC on: a context and nodes appear and the music plays (else 1-3 prove nothing); 5. muting stops it; 6. a cue with depth < 1 (warm) ramps the music's gain to its depth, a cue with depth 1 (tick, medal, thud' cue (tick) does not;
// 7. every sound cue has a duck depth in DUCKS (a number in (0, 1]). Plants: tools/plants.tsv (test music).
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let contexts = 0, nodes = 0, duckRamps = 0, lastDuck = 0, levelRamps = []; const clock = { t: 0 };
  const param = () => ({ value: 1, setValueAtTime() {}, cancelScheduledValues() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime(v) { if (v >= 0.45 && v <= 0.75) { duckRamps++; lastDuck = v; } else if (v > 0.02 && v < 0.1) levelRamps.push(v); } });
  const node = () => { nodes++; return { gain: param(), frequency: param(), Q: param(), connect(n) { return n; }, disconnect() {}, start() {}, stop() {}, setPeriodicWave() {}, type: '' }; };
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
  const r0 = duckRamps; S.sfx.tick(); S.sfx.medal(); S.sfx.thud(); const r1 = duckRamps; S.sfx.warm(); const r2 = duckRamps;
  check(r1 === r0 && r2 > r1 && lastDuck === S.DUCKS.warm, `cues that stand far above the tick (tick, medal, thud: depth 1) do not duck the music; 'warm' (depth ${S.DUCKS.warm}) ramps it to ${S.DUCKS.warm} (ramps ${r0} -> ${r1} -> ${r2}, last depth ${lastDuck})`);
  // the level applies at once: MIDDLE is the default; setMusicLevel('loud') ramps the music's gain to the loud value with no restart
  const P = await import('../src/musicplan.js'), startedNodes = nodes;
  levelRamps = []; M.setMusicLevel('loud');
  check(levelRamps.length > 0 && levelRamps[levelRamps.length - 1] === P.MUSIC_LEVELS.loud && M.musicPlaying() && nodes === startedNodes, `a level change applies at once: the gain ramps to ${P.MUSIC_LEVELS.loud} (ramps ${levelRamps.join(',')}), the music keeps playing (no restart)`);
  M.setMusicLevel('middle');
  // 5. mute stops it
  S.setMuted(true); M.syncMusic();
  check(!M.musicPlaying(), 'muting stops the music');
  const n0 = nodes; M.armMusic(); M.syncMusic();
  check(nodes === n0 && !M.musicPlaying(), `muted again: nothing new is created (nodes ${n0} -> ${nodes})`);
  // 7. DUCKS covers every cue
  const loose = Object.keys(S.sfx).filter(k => !(typeof S.DUCKS[k] === 'number' && S.DUCKS[k] > 0 && S.DUCKS[k] <= 1));
  check(loose.length === 0, `every cue has a duck depth in DUCKS, a number in (0, 1] (missing or invalid: ${loose.join(', ')})`);
  console.log(fails.length ? 'FAIL music:\n - ' + fails.join('\n - ') : 'PASS music (nothing before the first tap; muted and MUSIC off create nothing; it plays when allowed; thud ducks it, tick does not; every cue is classed)');
  process.exit(fails.length ? 1 : 0);
})();
