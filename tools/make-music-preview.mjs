// Builds tools/music-preview.html from the game's OWN music files (src/musicdata.js, src/musicplan.js, src/musicengine.js), inlined, so the page plays exactly what the game plays.
// Run: node tools/make-music-preview.mjs   (rewrites tools/music-preview.html; a single self-contained file, offline).
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url)), src = n => fs.readFileSync(path.join(here, '../src', n), 'utf8');
const strip = t => t.replace(/^import .*$/gm, '').replace(/^export \{[^}]*\};?\s*$/gm, '').replace(/^export (const|function|class) /gm, '$1 ');
const code = ['musicdata.js', 'musicplan.js', 'musicengine.js'].map(n => strip(src(n))).join('\n');
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Contrail Pilot: the five songs (listen)</title>
<style>
  body { font: 16px/1.4 system-ui, sans-serif; max-width: 560px; margin: 16px auto; padding: 0 12px; background: #10182a; color: #eef; }
  h1 { font-size: 20px; } h2 { font-size: 17px; margin: 0 0 4px; }
  .card { background: #1b2842; border: 2px solid #ffe15a; border-radius: 6px; padding: 10px 12px; margin: 12px 0; }
  button { font: inherit; padding: 10px 14px; margin: 4px 6px 4px 0; border: 2px solid #1b1b2f; border-radius: 4px; background: #ffe15a; color: #1b1b2f; cursor: pointer; }
  button.stop { background: #cfe6ff; } small, .note { color: #b8c8e8; display: block; }
  label { display: block; margin: 8px 0; } input[type=range] { width: 100%; }
</style></head><body>
<h1>Contrail Pilot: the five songs</h1>
<p class="note">Made in this page with Web Audio (no sound files, works offline); the code is the game's own music code. These versions have a BEAT (kick, snare and hi-hat, synthesized chip drums: not a studio kick). Each song plays its LONG form once (about 80-90 seconds): A, then A again a little higher, then a new B part, B higher, then A twice more. In the game each song repeats a few times, then the next one starts. Nobody on the team has heard these: they are drafts for your ears.</p>
<label>Volume <input id="vol" type="range" min="0" max="100" value="70"></label>
<div id="cards"></div>
<div class="card"><h2>Playlist</h2><small>The five songs in a random order, each once (a shuffle: the same song never plays twice in a row), with a one second crossfade. In the game each song plays three times before the next.</small>
  <button id="plist">Play playlist</button><button class="stop" id="pstop">Stop</button></div>
<div class="card"><h2>Duck test</h2><small>While a song plays, press this: a short bright reward sound plays and the music dips under it for about 1.5 seconds, then comes back.</small><button id="duck">Play reward sound over the music</button></div>
<p class="note" id="status">Stopped.</p>
<script>
'use strict';
${code}
if (typeof window !== 'undefined') window.MUSIC = { SONGS, TRACKS, Player, expandSong, passSeconds, trackSeconds, cycleSeconds, nextTrack, MUSIC_PASSES, noteFreq };
if (typeof document !== 'undefined') {
  let ctx = null, master = null, duck = null, timer = null, cur = null, nxt = null, hist = [], mode = null;
  const $ = id => document.getElementById(id), status = t => { $('status').textContent = t; };
  function chain() { if (ctx) return; ctx = new (window.AudioContext || window.webkitAudioContext)(); duck = ctx.createGain(); master = ctx.createGain(); const cp = ctx.createDynamicsCompressor(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5000; duck.connect(master); master.connect(lp); lp.connect(cp); cp.connect(ctx.destination); master.gain.value = $('vol').value / 100 * 0.35; }
  function stop() { if (timer) clearInterval(timer); timer = null; cur = nxt = null; mode = null; hist = []; status('Stopped.'); }
  function start(id, playlist) { chain(); if (ctx.state !== 'running') ctx.resume(); stop(); duck.gain.setValueAtTime(1, ctx.currentTime); mode = playlist ? 'list' : 'one';
    hist = [id]; cur = new Player(ctx, duck, SONGS[id], { passes: 1 }); timer = setInterval(pump, 25);
    status('Playing ' + id + ' ' + SONGS[id].name + ': ' + SONGS[id].key + ', ' + SONGS[id].bpm + ' bpm, long form about ' + Math.round(passSeconds(SONGS[id])) + ' s.'); }
  function pump() { if (!cur) return; cur.tick(); if (nxt) nxt.tick();
    if (mode === 'list' && !nxt && ctx.currentTime >= cur.endTime - 1) { const id = nextTrack(hist, Math.random); hist.push(id); nxt = new Player(ctx, duck, SONGS[id], { passes: 1, startAt: cur.endTime - 1 }); nxt.fade(0, 1, cur.endTime - 1, 1); cur.fade(1, 0, cur.endTime - 1, 1);
      status('Playing ' + hist[hist.length - 2] + ', next ' + id + ' (' + SONGS[id].name + ').'); }
    if (cur.done && ctx.currentTime > cur.endTime) { if (nxt) { cur = nxt; nxt = null; } else stop(); } }
  $('cards').innerHTML = TRACKS.map(id => { const s = SONGS[id]; return '<div class="card"><h2>' + id + ': ' + s.name + '</h2><small>' + s.key + ', ' + s.bpm + ' bpm, long form ' + Math.round(passSeconds(s)) + ' s.</small><button data-p="' + id + '">Play long form</button><button class="stop" data-s="1">Stop</button></div>'; }).join('');
  document.querySelectorAll('[data-p]').forEach(b => b.onclick = () => start(b.dataset.p, false));
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = stop); $('pstop').onclick = stop;
  $('plist').onclick = () => start(nextTrack([], Math.random), true);
  $('vol').oninput = () => { if (master) master.gain.value = $('vol').value / 100 * 0.35; };
  $('duck').onclick = () => { chain(); if (ctx.state !== 'running') ctx.resume(); const t = ctx.currentTime;
    duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(duck.gain.value, t); duck.gain.linearRampToValueAtTime(0.25, t + 0.12); duck.gain.setValueAtTime(0.25, t + 1.3); duck.gain.linearRampToValueAtTime(1, t + 1.8);
    [659, 784, 988, 1319].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; const s = t + 0.1 + i * 0.12;
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.16, s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5); o.connect(g); g.connect(master); o.start(s); o.stop(s + 0.55); }); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && ctx && ctx.state === 'running') ctx.suspend(); else if (!document.hidden && ctx && mode) ctx.resume(); });
}
</script></body></html>
`;
fs.writeFileSync(path.join(here, 'music-preview.html'), html);
console.log('wrote tools/music-preview.html', html.length, 'bytes');
