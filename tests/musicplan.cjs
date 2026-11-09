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
    const shifts = A.slice(4).map((b, i) => A2[i + 4].notes.map((n, k) => P.noteNumber(n.n) - P.noteNumber(b.notes[k].n)));
    check(shifts.every(sh => sh.every(x => x === sh[0]) && [-12, 0, 12].includes(sh[0])), `${id}: A' bars 5-8 are A's, each bar a whole octave down, up or unchanged (shifts ${shifts.map(sh => sh[0]).join(',')})`);
    // v2 (the family: too high-pitched): the lead as HEARD stays inside [LEAD_MIN, LEAD_MAX] and the bass drives like C's
    const r = P.leadRange(s);
    check(s.variation === 'up' || (r.hi <= P.noteNumber(P.LEAD_MAX) && r.lo >= P.noteNumber(P.LEAD_MIN)), `${id}: no lead note above ${P.LEAD_MAX} or below ${P.LEAD_MIN} as heard (note numbers ${r.lo}..${r.hi}; transpose ${s.transpose})`);
    check(s.voices.bass.length === 8 && s.voices.drums && s.voices.drums.hat.join() === '2,6,10,14', `${id}: a driving bass (8 notes a bar) and a hat on every off-beat (bass ${s.voices.bass.length}, hat ${s.voices.drums && s.voices.drums.hat.join(',')})`);
    // 6. events
    const ev0 = P.stepEvents(s, bars, bars[0].notes[0].s);
    check(ev0.some(e => e.kind === 'lead' && Math.abs(e.f - P.noteFreq(bars[0].notes[0].n) * Math.pow(2, (s.transpose || 0) / 12)) < 1e-6), `${id}: the first lead note is played on its step`);
    // the BEAT: each drum is played on exactly its declared steps (bar 1, no fill), the drums switch is separate (drums: false = none), the fill is in the last bar of a section only
    const on = k => { const r = []; for (let st = 0; st < 16; st++) if (P.stepEvents(s, bars, st).some(e => e.kind === k)) r.push(st); return r; }, d = s.voices.drums;
    check(JSON.stringify(on('hat')) === JSON.stringify(d.hat), `${id}: hats only on the declared steps (${on('hat').join(',')})`);
    check(JSON.stringify(on('kick')) === JSON.stringify([...d.kick, ...(d.kickGhost || [])].sort((a, b) => a - b)), `${id}: kicks (and ghost kicks) only on the declared steps (${on('kick').join(',')})`);
    check(JSON.stringify(on('snare')) === JSON.stringify(d.snare.slice().sort((a, b) => a - b)), `${id}: snares only on the declared steps in an ordinary bar (${on('snare').join(',')})`);
    const noDrums = []; for (let st = 0; st < 16; st++) if (P.stepEvents(s, bars, st, { drums: false }).some(e => ['kick', 'snare', 'hat'].includes(e.kind))) noDrums.push(st);
    check(noDrums.length === 0, `${id}: the drums switch is separate: drums false plays no drum at all (found on steps ${noDrums.join(',')})`);
    if (d.fill && d.fill.snare && d.fill.snare.length) { const fillSteps = []; for (let st = 0; st < 16; st++) if (P.stepEvents(s, bars, 7 * 16 + st).some(e => e.kind === 'snare')) fillSteps.push(st); check(d.fill.snare.every(x => fillSteps.includes(x)), `${id}: the last bar of a section carries its snare fill (steps ${fillSteps.join(',')})`); }
  }
  const hv = id => D.SONGS[id].voices.drums.hatVol, kv = id => D.SONGS[id].voices.drums.kickVol;
  check(hv('E') < hv('B') && hv('B') < hv('A') && hv('E') === Math.min(...ids.map(hv)), `E keeps the quietest tick (hat volume A ${hv('A')}, B ${hv('B')}, D ${hv('D')}, E ${hv('E')})`);
  check(kv('E') === Math.min(...ids.map(kv)) && D.SONGS.E.voices.drums.snare.length === 0, `E keeps the quietest beat: the softest kick (${kv('E')}) and no snare`);
  const bv = id => D.SONGS[id].voices.bassVol || 0.12;
  check(bv('E') === Math.min(...ids.map(bv)) && bv('B') < bv('A') && bv('A') === bv('C') && bv('C') === bv('D') && bv('C') >= 0.15, `the bass: E stays the quietest, B below A, C and D (bass volume A ${bv('A')}, B ${bv('B')}, C ${bv('C')}, D ${bv('D')}, E ${bv('E')}; C at least .15 = 25 percent over v3)`);
  check(['C', 'D'].every(id => D.SONGS[id].voices.drums.kick.join() === '0,4,8,12' && D.SONGS[id].voices.drums.snare.join() === '4,12'), 'C and D: four-on-the-floor kick (0,4,8,12) and a clap on 2 and 4 (4,12)');
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
