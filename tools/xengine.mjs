// Cross-engine replay check (security audit, 2026-11-19): the sim engine flies the same seeded flights in any JS engine
// (Node/V8, Chrome, Safari's JavaScriptCore via Playwright WebKit, Firefox) and returns per-step trace fingerprints.
// If two engines give different fingerprints, a server replay of a phone's flight could drift. Run: node tools/xengine.cjs
import { createWorld } from '../src/sim/world.js';
import { pilotTarget } from '../src/sim/pilots.js';
import { traceFlight } from '../src/sim/trace.js';
const SAVES = {
  none: {},
  jumboFull: { fuel: 'kerosene', priceVersion: 2, fleet: { plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { forecast: 4, atc: 4, ops: 4 }, gadgets: { magnet: 4, hold: 4, gear: 4, sensors: 4, autopilot: 4 } } },
};
export function runAll({ steps = 12000, dts = [16.67, 8.33, 33.4], plant = false } = {}) {
  const out = {};
  for (const plane of Object.keys(SAVES)) for (const pilot of ['straight', 'careful', 'smart']) for (const seed of [1, 2, 3]) for (const dt of dts) {
    const stored = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 30, mission: 99,
      planted: { oak: 5, birch: 5, rowan: 5, spruce: 5, orchard: 5 }, ...SAVES[plane], simSeed: seed };
    const w = createWorld(stored, seed);
    for (let i = 0; i < 2000 && w.state !== 'playing'; i++) w.step(dt / 1000);
    if (plant) w.kit = { ...w.kit, co2Cruise: w.kit.co2Cruise * 1.000001 };   // the planted defect (PLANT=1): CO2 one part in a million higher
    const t = traceFlight(w, () => w.step(Math.min(dt, 50) / 1000), pilotTarget, pilot, steps, 1e9);
    out[`${plane}/${pilot}/${seed}/${dt}`] = { steps: t.steps, km: t.km, heat: t.heat, chain: t.chain.filter((_, i) => i % 50 === 49 || i === t.chain.length - 1) };
  }
  return out;
}
