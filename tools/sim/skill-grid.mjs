// Distance vs skill for the gap-flying player (src/sim/player.js), crashes ON, Comet with nothing bought, 40 skies.
// Run: node tools/sim/skill-grid.mjs   (about 70 s)
import { simulate } from '../../src/sim/simulate.js';
const comet = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
simulate(comet, { seed: 99 });
const N = 40, q = (a, f) => a[Math.min(a.length - 1, Math.floor(a.length * f))];
console.log('pilot     s     p10   p25 median   p75   p90  crashed');
for (const careful of [true, false]) for (const skill of [0.7, 0.75, 0.8, 0.85, 0.88, 0.9, 0.93, 0.96, 1]) {
  const runs = Array.from({ length: N }, (_, i) => simulate(comet, { pilot: 'player', skill, careful, seed: i + 1, crashes: true }));
  const km = runs.map(r => r.km).sort((a, b) => a - b), crashed = runs.filter(r => r.end === 'crash').length;
  console.log(`${careful ? 'careful ' : 'careless'} ${skill.toFixed(2)} ${[0.1, 0.25, 0.5, 0.75, 0.9].map(f => String(q(km, f)).padStart(6)).join('')}  ${crashed}/${N}`);
}
