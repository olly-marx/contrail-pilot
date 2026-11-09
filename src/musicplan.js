// The music PLAN: pure functions, no Web Audio, no DOM (tests/musicplan.cjs holds them; src/musicengine.js plays the result).
import { SONGS, CHORDS, ROOTS, TRACKS } from './musicdata.js';

export const MUSIC_PASSES = 3;   // times a track plays through before the playlist moves on (the user: "repeat a few times"). ONE constant: every duration below is computed from it.
export const FORM = ['A', 'A2', 'B', 'B2', 'A', 'A2'];   // 6 sections of 8 bars = 48 bars; A2 / B2 = bars 5-8 an octave up, arpeggio reversed. The loop point (A2 -> A) is seamless.
export const BAR_STEPS = 16;
export const LEAD_MAX = 'A5', LEAD_MIN = 'E3';   // the lead's range AS HEARD (after transpose): nothing above A5 (880 Hz: the family found the songs high-pitched), nothing below E3
export const CROSSFADE_S = 1;     // seconds of overlap between two tracks
export const MUSIC_LEVEL = 0.035;   // the music bus gain (full scale = 1). MEASURED (tests/audiolive.cjs, real Chrome): at 0.1 the music rms at the destination was 0.0061 and at 0.04 0.0029, against the weakest cue (flap 0.0056): not yet 2x; 0.035 gives about 0.0025 and every cue >= 2x. A loudness rule (rms), not a peak rule; the user's ear decides if it is too quiet

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const noteNumber = n => { const m = /^([A-G])(#?)(\d)$/.exec(n); if (!m) throw new Error(`bad note ${n}`); return SEMI[m[1]] + (m[2] ? 1 : 0) + (+m[3] + 1) * 12; };
export const noteFreq = n => 440 * Math.pow(2, (noteNumber(n) - 69) / 12);
const noteName = num => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][num % 12] + (Math.floor(num / 12) - 1);

// "0 E5 4,4 G5 4" -> [{ s: 0, n: 'E5', l: 4 }, ...]
export const parseBar = str => str.split(',').map(t => { const [s, n, l] = t.trim().split(' '); return { s: +s, n, l: +l }; });
const up = (notes, semis) => notes.map(x => ({ ...x, n: noteName(noteNumber(x.n) + semis) }));

// One song -> its 48 bars: [{ chord, notes: [{s, n, l}], arpOrder }]. A2 / B2: bars 5-8 (index 4-7) an octave up, arpeggio order reversed.
// A2 / B2 bars 5-8: an octave DOWN when the lead stays at or above LEAD_MIN, else an octave up when it stays at or below LEAD_MAX, else unchanged (the arpeggio is reversed in any case).
function variation(notes, transpose) {
  const nums = notes.map(x => noteNumber(x.n) + transpose), lo = Math.min(...nums), hi = Math.max(...nums);
  if (lo - 12 >= noteNumber(LEAD_MIN)) return up(notes, -12);
  if (hi + 12 <= noteNumber(LEAD_MAX)) return up(notes, 12);
  return notes;
}
export function expandSong(song) {
  const bars = [], tr = song.transpose || 0;
  for (const name of FORM) {
    const prime = name.endsWith('2'), sec = song.sections[name[0]];
    sec.chords.forEach((chord, i) => {
      let notes = parseBar(sec.melody[i]);
      if (prime && i >= 4) notes = variation(notes, tr);
      bars.push({ chord, notes, arpOrder: prime ? song.voices.arp.order.slice().reverse() : song.voices.arp.order });
    });
  }
  return bars;
}
export const stepSeconds = song => 60 / song.bpm / 4;
export const passSeconds = song => expandSong(song).length * BAR_STEPS * stepSeconds(song);
export const trackSeconds = song => passSeconds(song) * MUSIC_PASSES;
export const cycleSeconds = () => TRACKS.reduce((t, id) => t + trackSeconds(SONGS[id]), 0);

// The playlist: a SHUFFLE BAG. All five tracks in a random order, then a new bag; the first track of a new bag is never the last track of the previous one, so a track never
// plays twice in a row and every track plays once in any five (aligned to the bags). history = the track ids played so far (oldest first); rng() in [0, 1).
export function nextTrack(history, rng) {
  const n = TRACKS.length, inBag = history.length % n, bag = history.slice(history.length - inBag);
  const pool = inBag === 0 ? TRACKS.filter(t => t !== history[history.length - 1]) : TRACKS.filter(t => !bag.includes(t));
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

// What one 16th-note step plays: pure (the engine only turns these into oscillators). stepIndex counts from 0 and wraps at the track's pass length.
export function stepEvents(song, bars, stepIndex) {
  const v = song.voices, bar = bars[Math.floor(stepIndex / BAR_STEPS) % bars.length], s = stepIndex % BAR_STEPS, out = [];
  const k12 = Math.pow(2, (song.transpose || 0) / 12);   // the whole song sounds `transpose` semitones lower
  for (const m of bar.notes) if (m.s === s) out.push({ kind: 'lead', f: noteFreq(m.n) * k12, steps: m.l, vol: v.lead.vol, duty: v.lead.duty });
  for (const [bs, semi, len] of v.bass) if (bs === s) out.push({ kind: 'bass', f: noteFreq(ROOTS[bar.chord]) * Math.pow(2, semi / 12) * k12, steps: len, vol: v.bassVol || 0.12, type: 'triangle' });
  if (s % v.arp.every === 0) { const k = bar.arpOrder[(s / v.arp.every) % bar.arpOrder.length]; out.push({ kind: 'arp', f: noteFreq(CHORDS[bar.chord][k]) * 2 * k12, steps: v.arp.every * 0.9, vol: v.arp.vol, duty: v.arp.duty }); }
  if (v.hat.includes(s)) out.push({ kind: 'hat', vol: v.hatVol || 0.025 });
  return out;
}

// The lead's range AS HEARD, in note numbers: { lo, hi } over all 48 bars (tests/musicplan.cjs holds it inside [LEAD_MIN, LEAD_MAX]).
export function leadRange(song) {
  const nums = expandSong(song).flatMap(b => b.notes.map(x => noteNumber(x.n) + (song.transpose || 0)));
  return { lo: Math.min(...nums), hi: Math.max(...nums) };
}
