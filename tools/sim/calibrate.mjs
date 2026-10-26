// Calibrate the progression player against the real players (tools/sim/real-players.json, the user excluded):
// for each constant skill s, careful/careless and maxSkip, run PLAYERS independent 50-flight progressions and
// compare each flight band's median km, p90 km and landed share with the real table. Prints a table and the
// best-scoring settings per band. Score = |log(median ratio)| + |log(p90 ratio)| + 2 x |landed diff|.
//   node tools/sim/calibrate.mjs        PLAYERS=4 FLIGHTS=50
import { progression } from '../../src/sim/progression.js';
import fs from 'fs';
const real = JSON.parse(fs.readFileSync(new URL('./real-players.json', import.meta.url))).bands;
const PLAYERS = Number(process.env.PLAYERS || 4), FLIGHTS = Number(process.env.FLIGHTS || 50);
const BANDS = [[1, 5, ['1', '2', '3', '4', '5']], [6, 10, ['6-10']], [11, 20, ['11-20']], [21, 50, ['21-50']]];
const realBand = names => { const b = real.filter(x => names.includes(x.flights)); const med = b.map(x => x.median).sort((a, c) => a - c);
  return { median: med[Math.floor(med.length / 2)], p90: Math.max(...b.map(x => x.p90)), landed: b.reduce((a, x) => a + x.landed, 0) / b.length }; };
const q = (xs, f) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * f))]; };
const out = [];
const SKILLS = (process.env.SKILLS || '0.8,0.82,0.84,0.86,0.88,0.9,0.95').split(',').map(Number);
for (const careful of [true, false]) for (const s of SKILLS) for (const maxSkip of (careful ? [1, 2, 3] : [0])) {
  const rows = [];
  for (let p = 1; p <= PLAYERS; p++) rows.push(...progression({ careful, skill: () => s, flights: FLIGHTS, seed: p, maxSkip, every: 25, capSeeds: [1] }).rows);
  const res = BANDS.map(([a, b, names]) => { const r = rows.filter(x => x.flight >= a && x.flight <= b), km = r.map(x => x.km), want = realBand(names);
    const got = { median: q(km, 0.5), p90: q(km, 0.9), landed: r.filter(x => x.landed).length / r.length };
    return { band: `${a}-${b}`, got, want, score: Math.abs(Math.log(got.median / want.median)) + Math.abs(Math.log(got.p90 / want.p90)) + 2 * Math.abs(got.landed - want.landed) }; });
  out.push({ careful, s, maxSkip, res });
  console.log(`${careful ? 'careful ' : 'careless'} s=${s} skip=${maxSkip}  ` + res.map(r => `${r.band}: ${r.got.median}/${r.got.p90}/${Math.round(r.got.landed * 100)}% (${r.score.toFixed(2)})`).join('  '));
}
console.log('\nreal: ' + BANDS.map(([a, b, n]) => { const w = realBand(n); return `${a}-${b}: ${w.median}/${w.p90}/${Math.round(w.landed * 100)}%`; }).join('  '));
console.log('best per band:');
for (let i = 0; i < BANDS.length; i++) { const best = [...out].sort((a, b) => a.res[i].score - b.res[i].score).slice(0, 3);
  console.log(`  ${BANDS[i][0]}-${BANDS[i][1]}: ` + best.map(o => `${o.careful ? 'careful' : 'careless'} s=${o.s} skip=${o.maxSkip} (${o.res[i].score.toFixed(2)})`).join(', ')); }
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(out));
