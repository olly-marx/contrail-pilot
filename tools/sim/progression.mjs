// Run the progression simulator (src/sim/progression.js) and print the per-flight rows and the timeline.
//   node tools/sim/progression.mjs                 FLIGHTS=100 SEED=1 CAREFUL=1 EVERY=10 JSON=out.json
import { progression } from '../../src/sim/progression.js';
import fs from 'fs';
const t0 = Date.now();
const r = progression({ flights: Number(process.env.FLIGHTS || 100), seed: Number(process.env.SEED || 1), careful: process.env.CAREFUL !== '0', every: Number(process.env.EVERY || 10) });
const cols = ['flight', 'skill', 'km', 'end', 'skipped', 'crossing', 'prizes', 'seeds', 'crystals', 'minutes', 'era', 'plane', 'bio', 'homeBio', 'capability', 'bought'];
if (!process.env.QUIET) { console.log(cols.join('\t')); for (const row of r.rows) console.log(cols.map(c => row[c]).join('\t')); }
console.log('\nbands', JSON.stringify(r.summary.bands));
console.log('events'); for (const e of r.events) console.log(`  flight ${e.flight}, ${e.minutes} min: ${e.what}`);
console.log(`(${r.rows.length} flights in ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
if (process.env.JSON) fs.writeFileSync(process.env.JSON, JSON.stringify(r));
