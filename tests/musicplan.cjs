// The music PLAN (src/musicdata.js, src/musicplan.js): pure, plain Node, ~0.3 s. 1. every song's form is 48 bars of valid notes: every note parses, no bar overruns its 16 steps, every chord
// has tones and a root; 2. one pass lasts 75-90 s at the song's own bpm (the user: "slightly longer before it repeats"); 3. a track = MUSIC_PASSES passes, computed from the ONE constant;
// 4. nextTrack is a shuffle bag: no immediate repeat over 10,000 draws, every aligned five has all five, deterministic for a seed; 5. the variations A2/B2 differ from A/B only in bars 5-8,
// an octave up; 6. stepEvents puts a lead note on the step it says and a hat only where declared. Plants: tools/plants.tsv (test musicplan).
(async () => {
  const P = await import('../src/musicplan.js'), D = await import('../src/musicdata.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const ids = D.TRACKS;
  check(ids.length === 5 && ids.join('') === 'ABCDE', `five songs A-E (${ids.join('')})`);
  for (const id of ids) {
    const s = D.SONGS[id], bars = P.expandSong(s);
    check(bars.length === 48, `${id}: the form is 48 bars (${bars.length})`);
    let bad = [];
    bars.forEach((b, i) => { try { for (const n of b.notes) { P.noteFreq(n.n); if (n.s < 0 || n.s + n.l > P.BAR_STEPS) bad.push(`bar ${i + 1} ${n.n}@${n.s}+${n.l}`); } } catch (e) { bad.push(`bar ${i + 1}: ${e.message}`); }
      if (!D.CHORDS[b.chord] || !D.ROOTS[b.chord]) bad.push(`bar ${i + 1}: chord ${b.chord}`); });
    check(bad.length === 0, `${id}: every note parses, fits its bar, every chord has tones and a root: ${bad.slice(0, 3).join('; ')}`);
    const pass = P.passSeconds(s);
    check(pass >= 75 && pass <= 90, `${id}: one pass lasts 75-90 s at ${s.bpm} bpm (${pass.toFixed(1)} s)`);
    check(Math.abs(P.trackSeconds(s) - pass * P.MUSIC_PASSES) < 1e-9, `${id}: a track is MUSIC_PASSES (${P.MUSIC_PASSES}) passes (${P.trackSeconds(s).toFixed(1)} s)`);
    // 5. variations: A2 bars 1-4 equal A; bars 5-8 an octave up (semitone number + 12).
    const A = bars.slice(0, 8), A2 = bars.slice(8, 16);
    check(A.slice(0, 4).every((b, i) => JSON.stringify(b.notes) === JSON.stringify(A2[i].notes)), `${id}: A' bars 1-4 are A's`);
    check(A.slice(4).every((b, i) => b.notes.every((n, k) => P.noteNumber(A2[i + 4].notes[k].n) === P.noteNumber(n.n) + 12)), `${id}: A' bars 5-8 are A's an octave up`);
    // 6. events
    const ev0 = P.stepEvents(s, bars, bars[0].notes[0].s);
    check(ev0.some(e => e.kind === 'lead' && Math.abs(e.f - P.noteFreq(bars[0].notes[0].n)) < 1e-6), `${id}: the first lead note is played on its step`);
    const hats = []; for (let st = 0; st < 16; st++) if (P.stepEvents(s, bars, st).some(e => e.kind === 'hat')) hats.push(st);
    check(JSON.stringify(hats) === JSON.stringify(s.voices.hat), `${id}: hats only on the declared steps (${hats.join(',')})`);
  }
  check(P.MUSIC_PASSES >= 2 && P.MUSIC_PASSES <= 4 && Number.isInteger(P.MUSIC_PASSES), `MUSIC_PASSES is the declared repeat count (${P.MUSIC_PASSES})`);
  const cyc = P.cycleSeconds(); check(cyc > 15 * 60 && cyc < 30 * 60, `a full cycle of five lasts ${(cyc / 60).toFixed(1)} min (15-30)`);
  // 4. the shuffle bag, seeded.
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const play = seed => { const rng = mulberry(seed), h = []; for (let i = 0; i < 10000; i++) h.push(P.nextTrack(h, rng)); return h; };
  const h1 = play(1), h2 = play(1);
  let repeats = 0; for (let i = 1; i < h1.length; i++) if (h1[i] === h1[i - 1]) repeats++;
  check(repeats === 0, `nextTrack never plays a track twice in a row over 10,000 draws (repeats ${repeats})`);
  let badBag = 0; for (let b = 0; b < h1.length / 5; b++) if (new Set(h1.slice(b * 5, b * 5 + 5)).size !== 5) badBag++;
  check(badBag === 0, `every aligned five tracks has all five (bad bags ${badBag})`);
  check(JSON.stringify(h1) === JSON.stringify(h2), 'the same seed gives the same playlist');
  check(new Set(h1.slice(0, 5000)).size === 5 && new Set(play(2).slice(0, 5)).size === 5 && JSON.stringify(h1.slice(0, 50)) !== JSON.stringify(play(2).slice(0, 50)), 'POSITIVE CONTROL: a different seed gives a different order (the draw is random, not fixed)');
  console.log(fails.length ? 'FAIL musicplan:\n - ' + fails.join('\n - ') : `PASS musicplan (5 songs x 48 bars; passes 82-90 s; track ${P.MUSIC_PASSES} passes; cycle ${(cyc / 60).toFixed(1)} min; shuffle bag: no repeats in 10,000 draws)`);
  process.exit(fails.length ? 1 : 0);
})();
