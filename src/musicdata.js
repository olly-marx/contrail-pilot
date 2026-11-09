// The five background songs as DATA (research/ARCADE-SONG.md; the user: "he likes the songs, add them to the game"; the family: faster, like C). Original chip-tune: a pulse lead,
// a narrow-pulse arpeggio, a triangle bass and (some songs) a soft noise tick, written as notes. No audio files, nothing to attribute: the tunes are original and the chord loops are
// common practice. NOBODY has been able to listen except the user: these are drafts for his ear.
// BASS LEVEL (bassVol, the user's ear, v4: 'slightly louder' = +25 percent, about +2 dB over v3): A, C, D .15; B .125; E .10 (the quietest song). The engine default is .12.
// DRUMS (voices.drums, synthesized, no files; these are chip drums, not a studio kick): kick = steps (kickGhost = quieter extra kicks), snare = steps (snareTone: Hz of a short tone under the noise, 0 = noise only), hat = steps; *Vol = gain; fill = extra snare steps in the LAST bar of every 8-bar section (a phrase marker).
// FORMAT. A song: bpm (one line to change its tempo), transpose (semitones, applied to every voice: the notes are WRITTEN in the original key and SOUND lower; v2: the family found the songs high-pitched), voices, sections. A section: 8 bars of 16 sixteenth-note steps. A bar's melody: "step note length, ..." (length in sixteenths).
// The form is FORM in src/musicplan.js: A, A2, B, B2, A, A2 (A2 / B2 = the same section with bars 5-8 an octave up and the arpeggio reversed: made by expandSong, not written here).
export const CHORDS = { C: ['C4', 'E4', 'G4'], G: ['G3', 'B3', 'D4'], Am: ['A3', 'C4', 'E4'], F: ['F3', 'A3', 'C4'], Em: ['E3', 'G3', 'B3'], D: ['D4', 'F#4', 'A4'], A: ['A3', 'C#4', 'E4'], Bm: ['B3', 'D4', 'F#4'], 'F#m': ['F#3', 'A3', 'C#4'] };
export const ROOTS = { C: 'C3', G: 'G2', Am: 'A2', F: 'F2', Em: 'E2', D: 'D3', A: 'A2', Bm: 'B2', 'F#m': 'F#2' };

export const SONGS = {
  A: { name: 'Bright Morning', key: 'A major pentatonic (written in C, sounding 3 semitones lower)', bpm: 132, transpose: -3,
    voices: { bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 7, 2]], bassVol: 0.15, arp: { every: 2, order: [0, 1, 2, 1], duty: 0.125, vol: 0.05 }, drums: { kick: [0, 8], kickGhost: [6], kickVol: 0.2, snare: [4, 12], snareTone: 190, snareVol: 0.1, hat: [2, 6, 10, 14], hatVol: 0.025, fill: { snare: [12, 14, 15] } }, lead: { duty: 0.25, vol: 0.09 } },
    sections: {
      A: { chords: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], melody: ['0 E5 4,4 G5 4,8 A5 4,12 G5 4', '0 D5 4,4 E5 2,6 D5 2,8 G4 8', '0 A4 4,4 C5 4,8 E5 4,12 D5 4', '0 C5 4,4 A4 4,8 G4 8',
        '0 E5 4,4 G5 4,8 C6 4,12 A5 4', '0 G5 4,4 E5 2,6 D5 2,8 E5 8', '0 A5 4,4 G5 4,8 E5 4,12 C5 4', '0 D5 4,4 E5 4,8 G5 4,12 D5 2,14 E5 2'] },
      B: { chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'C'], melody: ['2 C5 2,4 A4 2,6 C5 2,8 D5 4,12 C5 4', '0 D5 2,2 G5 2,4 E5 4,8 D5 4,12 G4 4', '0 E5 4,4 G5 2,6 E5 2,8 D5 8', '0 C5 2,2 E5 2,4 A5 4,8 G5 4,12 E5 4',
        '0 A5 4,4 G5 2,6 E5 2,8 D5 4,12 C5 4', '0 D5 4,4 E5 4,8 G5 8', '0 E5 2,2 D5 2,4 C5 4,8 E5 4,12 G5 4', '0 G5 8,8 E5 4,12 D5 4'] } } },
  B: { name: 'Wide Sky', key: 'F major pentatonic (written in G, sounding 2 semitones lower)', bpm: 128, transpose: -2,
    voices: { bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 7, 2]], bassVol: 0.125, arp: { every: 2, order: [0, 1, 2, 1], duty: 0.25, vol: 0.04 }, drums: { kick: [0, 10], kickGhost: [], kickVol: 0.16, snare: [8], snareTone: 0, snareVol: 0.08, hat: [2, 6, 10, 14], hatVol: 0.02, fill: { snare: [14, 15] } }, lead: { duty: 0.5, vol: 0.08 } },
    sections: {
      A: { chords: ['G', 'D', 'Em', 'C', 'G', 'D', 'Em', 'C'], melody: ['0 B4 8,8 D5 6,14 E5 2', '0 D5 8,8 A4 8', '0 G4 4,4 B4 4,8 E5 8', '0 D5 4,4 B4 4,8 G4 8',
        '0 D5 8,8 E5 4,12 G5 4', '0 A5 4,4 G5 4,8 E5 4,12 D5 4', '0 B4 4,4 E5 4,8 D5 4,12 B4 4', '0 G4 8,8 E5 8'] },
      B: { chords: ['C', 'G', 'D', 'Em', 'C', 'G', 'D', 'D'], melody: ['0 E5 8,8 D5 4,12 B4 4', '0 G5 4,4 E5 4,8 D5 8', '0 A4 4,4 D5 4,8 E5 8', '0 B4 8,8 G4 8',
        '0 E5 4,4 G5 4,8 A5 8', '0 B5 4,4 A5 4,8 G5 8', '0 A5 4,4 E5 4,8 D5 8', '0 D5 8,8 E5 4,12 D5 4'] } } },
  C: { name: 'Tailwind', key: 'C major pentatonic (A minor feel)', bpm: 136, transpose: 0, variation: 'up',
    voices: { bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 7, 2]], bassVol: 0.15, arp: { every: 4, order: [2, 1, 0, 1], duty: 0.125, vol: 0.035 }, drums: { kick: [0, 4, 8, 12], kickGhost: [], kickVol: 0.2, snare: [4, 12], snareTone: 190, snareVol: 0.1, hat: [2, 6, 10, 14], hatVol: 0.025, fill: { snare: [12, 14, 15] } }, lead: { duty: 0.25, vol: 0.085 } },
    sections: {
      A: { chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'], melody: ['0 A4 2,2 C5 2,4 E5 4,8 E5 2,10 D5 2,12 C5 4', '0 C5 2,2 A4 2,4 C5 4,8 A4 2,10 G4 2,12 A4 4', '0 E5 2,2 G5 2,4 E5 4,8 D5 2,10 E5 2,12 G5 4', '0 D5 2,2 E5 2,4 D5 4,8 G4 2,10 A4 2,12 D5 4',
        '0 E5 2,2 G5 2,4 A5 4,8 G5 2,10 E5 2,12 C5 4', '0 A5 2,2 G5 2,4 E5 4,8 C5 2,10 E5 2,12 A5 4', '0 G5 4,4 E5 4,8 G5 2,10 A5 2,12 G5 4', '0 E5 2,2 D5 2,4 C5 2,6 D5 2,8 E5 8'] },
      B: { chords: ['F', 'G', 'Am', 'Am', 'F', 'G', 'C', 'G'], melody: ['0 C5 2,2 A4 2,4 C5 2,6 D5 2,8 C5 4,12 A4 4', '0 D5 2,2 E5 2,4 G5 4,8 E5 2,10 D5 2,12 E5 4', '0 A5 2,2 G5 2,4 E5 4,8 C5 4,12 E5 4', '0 A4 2,2 C5 2,4 E5 4,8 D5 8',
        '0 A5 4,4 G5 2,6 E5 2,8 C5 4,12 D5 4', '0 E5 2,2 G5 2,4 A5 4,8 G5 2,10 E5 2,12 D5 4', '0 E5 4,4 C5 4,8 E5 2,10 G5 2,12 E5 4', '0 D5 2,2 E5 2,4 D5 2,6 C5 2,8 A4 8'] } } },
  D: { name: 'Landfall', key: 'C major pentatonic (written in D, sounding 2 semitones lower)', bpm: 140, transpose: -2,
    voices: { bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 7, 2]], bassVol: 0.15, arp: { every: 2, order: [0, 2, 1, 2], duty: 0.125, vol: 0.045 }, drums: { kick: [0, 4, 8, 12], kickGhost: [], kickVol: 0.2, snare: [4, 12], snareTone: 190, snareVol: 0.1, hat: [2, 6, 10, 14], hatVol: 0.025, fill: { snare: [12, 13, 14, 15] } }, lead: { duty: 0.25, vol: 0.085 } },
    sections: {
      A: { chords: ['D', 'G', 'D', 'A', 'Bm', 'G', 'A', 'D'], melody: ['0 A4 4,4 D5 4,8 F#5 8', '0 E5 4,4 D5 4,8 B4 8', '0 F#5 4,4 A5 4,8 B5 4,12 A5 4', '0 E5 8,8 F#5 4,12 E5 4',
        '0 D5 4,4 F#5 4,8 B5 8', '0 A5 4,4 F#5 4,8 D5 8', '0 E5 4,4 F#5 4,8 A5 4,12 F#5 4', '0 D5 8,8 A4 4,12 D5 4'] },
      B: { chords: ['G', 'A', 'Bm', 'F#m', 'G', 'A', 'D', 'D'], melody: ['0 B4 4,4 D5 4,8 B5 8', '0 A5 4,4 F#5 4,8 E5 8', '0 D5 4,4 F#5 4,8 B5 4,12 A5 4', '0 F#5 8,8 E5 4,12 D5 4',
        '0 B5 4,4 A5 4,8 F#5 4,12 D5 4', '0 E5 4,4 A5 4,8 F#5 8', '0 D5 4,4 F#5 4,8 A5 4,12 B5 4', '0 A5 8,8 F#5 4,12 E5 4'] } } },
  E: { name: 'Night Sky', key: 'A minor pentatonic', bpm: 128, transpose: 0,
    voices: { bass: [[0, 0, 2], [2, 0, 2], [4, 0, 2], [6, 0, 2], [8, 0, 2], [10, 0, 2], [12, 0, 2], [14, 7, 2]], bassVol: 0.1, arp: { every: 2, order: [0, 1, 2, 1], duty: 0.25, vol: 0.035 }, drums: { kick: [0, 8], kickGhost: [], kickVol: 0.1, snare: [], snareTone: 0, snareVol: 0.05, hat: [2, 6, 10, 14], hatVol: 0.012, fill: {} }, lead: { duty: 0.5, vol: 0.07 } },
    sections: {
      A: { chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am'], melody: ['0 E5 8,8 C5 4,12 A4 4', '0 A4 6,6 C5 2,8 D5 8', '0 E5 4,4 G5 4,8 E5 8', '0 D5 8,8 G4 4,12 D5 4',
        '0 A5 8,8 G5 4,12 E5 4', '0 C5 4,4 D5 4,8 A4 8', '0 G5 4,4 E5 4,8 D5 8', '0 E5 8,8 A4 8'] },
      B: { chords: ['F', 'C', 'G', 'Am', 'F', 'C', 'G', 'G'], melody: ['0 C5 4,4 A4 4,8 C5 8', '0 E5 4,4 G5 4,8 E5 8', '0 D5 4,4 G5 4,8 A5 8', '0 E5 8,8 C5 4,12 A4 4',
        '0 A4 4,4 C5 4,8 D5 4,12 C5 4', '0 G5 4,4 E5 4,8 G5 8', '0 A5 4,4 G5 4,8 D5 8', '0 D5 8,8 E5 8'] } } },
};
export const TRACKS = Object.keys(SONGS);   // the playlist: A B C D E
