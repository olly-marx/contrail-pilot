// Bad landings (2026-11-17): the economy with and without the new rule, for pilots that come in too high on a share of approaches.
// Arms: LATE x RULE. RULE 'today' = keep everything (AIRPORT.overrunKeep = crashCrystalKeep = 1; the steeper way down and the brakes
// only move where the plane stops, never what it keeps); 'new' = the shipped numbers.
//   node tools/sim/landing-econ.mjs   FLIGHTS=60 SEEDS=4 LATES=0,0.15,0.3
import { progression } from '../../src/sim/progression.js';
import { AIRPORT } from '../../src/config.js';
const FLIGHTS = Number(process.env.FLIGHTS || 60), SEEDS = Number(process.env.SEEDS || 4), LATES = (process.env.LATES || '0,0.15,0.3').split(',').map(Number);
const NEW = { overrunKeep: AIRPORT.overrunKeep, crashCrystalKeep: AIRPORT.crashCrystalKeep };
const at = [20, 40, FLIGHTS];
for (const late of LATES) for (const rule of ['today', 'new']) {
  Object.assign(AIRPORT, rule === 'new' ? NEW : { overrunKeep: 1, crashCrystalKeep: 1 });
  const sum = { gained: 0, cGot: 0, cLost: 0, era: 0, minutes: 0, seeds: at.map(() => 0), crystals: at.map(() => 0), landed: 0, overran: 0, flights: 0, byFlare: {} };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const r = progression({ flights: FLIGHTS, seed, late, every: 1000 });
    at.forEach((n, k) => { const row = r.rows[Math.min(n, r.rows.length) - 1]; sum.seeds[k] += row.seeds; sum.crystals[k] += row.crystals; });
    const last = r.rows[r.rows.length - 1]; sum.era += last.era; sum.minutes += last.minutes;
    for (const row of r.rows) {
      sum.flights++; sum.gained += row.gained; sum.cGot += row.crystalsGot; sum.cLost += row.crystalsLost; if (row.landed) sum.landed++; if (row.overran) sum.overran++;
      const f = (Math.round((row.flare || 1) * 4) / 4).toFixed(2), b = sum.byFlare[f] || (sum.byFlare[f] = { landed: 0, overran: 0 });
      if (row.landed) b.landed++; if (row.overran) b.overran++;
    }
  }
  const avg = a => a.map(x => Math.round(x / SEEDS)).join('/');
  const by = Object.entries(sum.byFlare).sort().map(([f, b]) => `x${f} ${b.overran}/${b.landed}`).join(', ');
  console.log(`late ${late} ${rule.padEnd(5)}: flight seeds banked per flight ${(sum.gained / sum.flights).toFixed(2)}, flight crystals kept per flight ${(sum.cGot / sum.flights).toFixed(3)} (lost ${(sum.cLost / sum.flights).toFixed(3)}); seeds held at flights ${at.join('/')} = ${avg(sum.seeds)}; crystals = ${avg(sum.crystals)}; era at the end ${(sum.era / SEEDS).toFixed(2)}, minutes ${(sum.minutes / SEEDS).toFixed(0)}; landed ${sum.landed}/${sum.flights}; overran ${sum.overran} (${(100 * sum.overran / Math.max(1, sum.landed)).toFixed(1)}% of landings); overruns/landings by landing window: ${by}`);
}
