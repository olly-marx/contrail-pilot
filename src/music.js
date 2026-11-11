// Background music for every scene: ONE playlist of five original songs (src/musicdata.js), played by the engine (src/musicengine.js) through the SAME gate and master chain as the effects
// (src/sound.js audioBus): muted, or MUSIC off, = no context and no node. Nothing starts before the first tap. Each track plays MUSIC_PASSES times (src/musicplan.js; 1 = once), then the next one
// (nextTrack: a shuffle bag, never the same track twice in a row) with a CROSSFADE_S overlap. Effects that carry a warning or a reward duck the music (src/sound.js DUCKS).
import { audioBus, isMuted, setDuckHook } from './sound.js';
import { SONGS, Player } from './musicengine.js';
import { nextTrack, CROSSFADE_S, MUSIC_LEVELS, DEFAULT_MUSIC_LEVEL } from './musicplan.js';

let levelName = DEFAULT_MUSIC_LEVEL, drumsOn = true, armed = false, off = false, timer = null, ctx = null, level = null, duckNode = null, cur = null, nxt = null, hist = [];
export const musicPlaying = () => !!timer;

// The beat is a separate switch from MUSIC for the tests (the harness can hear the music with and without drums); the MUSIC chip still turns everything off. New tracks use it.
// Test hook: the function nextTrack draws with (the harness picks a fixed loud song so its level measurement is repeatable). Default Math.random.
let trackRng = Math.random;
export function setTrackRng(f) { trackRng = f || Math.random; }
export function setDrums(v) { drumsOn = !!v; }
// The level (soft / middle / loud) applies at once: a short ramp on the music's gain, no restart.
export function setMusicLevel(name) {
  levelName = MUSIC_LEVELS[name] ? name : DEFAULT_MUSIC_LEVEL;
  if (level) { const g = level.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(MUSIC_LEVELS[levelName], t + 0.15); }
}
export function setMusicOff(v) { off = !!v; syncMusic(); }
// The FIRST TAP arms the music (a context made before a tap starts suspended: src/sound.js); until then nothing is created, whatever the settings say.
export function armMusic() { armed = true; syncMusic(); }
function startMusic() {   // (not exported: every start goes through syncMusic, the one place that checks MUSIC off and the mute flag; audioBus is the second, independent mute guard)
  if (!armed || timer) return;
  const b = audioBus(); if (!b) return;
  ctx = b.ctx;
  level = ctx.createGain(); level.gain.value = MUSIC_LEVELS[levelName]; duckNode = ctx.createGain(); duckNode.connect(level); level.connect(b.out);
  const id = nextTrack(hist, trackRng); hist.push(id);
  cur = new Player(ctx, duckNode, SONGS[id], { drums: drumsOn }); cur.fade(0, 1, ctx.currentTime, CROSSFADE_S);
  timer = setInterval(pump, 25);
}
export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (level) { try { level.gain.cancelScheduledValues(0); level.gain.setValueAtTime(level.gain.value, ctx.currentTime); level.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25); const l = level, d = duckNode; setTimeout(() => { try { l.disconnect(); d.disconnect(); } catch (e) { /* already gone */ } }, 400); } catch (e) { /* context gone */ } }
  cur = nxt = level = duckNode = null;
}
// Call after the mute flag or the MUSIC setting changes (a tap): starts or stops to match.
export function syncMusic() { if (off || isMuted()) stopMusic(); else startMusic(); }
// A quiet warning or reward cue (src/sound.js DUCKS says how far): the music's gain goes to `depth` in 0.1 s, holds 0.5 s, comes back in 0.5 s (1.1 s in all).
export function duckMusic(depth = 0.5) {
  if (!duckNode) return;
  const g = duckNode.gain, t = ctx.currentTime;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(depth, t + 0.1); g.setValueAtTime(depth, t + 0.6); g.linearRampToValueAtTime(1, t + 1.1);
}
setDuckHook(duckMusic);

function pump() {
  if (!cur) return;
  if (isMuted() || off) return stopMusic();
  if (ctx.state !== 'running') ctx.resume().catch(() => {});   // (a backgrounded app: try again quietly)
  cur.tick(); if (nxt) nxt.tick();
  if (!nxt && ctx.currentTime >= cur.endTime - CROSSFADE_S) {   // the next track starts one crossfade before this one ends
    const id = nextTrack(hist, trackRng); hist.push(id);
    nxt = new Player(ctx, duckNode, SONGS[id], { startAt: cur.endTime - CROSSFADE_S, drums: drumsOn });
    nxt.fade(0, 1, cur.endTime - CROSSFADE_S, CROSSFADE_S); cur.fade(1, 0, cur.endTime - CROSSFADE_S, CROSSFADE_S);
  }
  if (cur.done && ctx.currentTime > cur.endTime) { cur = nxt; nxt = null; }
}
// A hidden tab is silent (the context sleeps); it wakes with the tab.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => { if (!ctx) return; if (document.hidden) { if (ctx.state === 'running') ctx.suspend().catch(() => {}); } else if (timer) ctx.resume().catch(() => {}); });
