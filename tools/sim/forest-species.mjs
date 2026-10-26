// Forest boost: kinds counted by UK slot (today) vs by species (PROPOSAL-TREES.md §4), on the sim engine.
// The never-crash careful pilot plants on every soil patch it can hit (as tools/balance.cjs PLANT=1).
// A route is forced (w.regionHere): one biome, or two biomes alternating every LEG km (a starter area).
// Run: node tools/sim/forest-species.mjs   (game chat, 2026-10-26; measurement only, changes no rule)
// NOTE (2026-10-26): written BEFORE the tree rework, which removed levels.species: on this branch the "slots" rows
// no longer vary what is planted (parcels follow src/landtrees.js treesOpen). Kept as the record of the measurement;
// to rerun, check out 28841f6.
import { simulate } from '../../src/sim/simulate.js';
import { localTree } from '../../src/nature.js';
const SEEDS = Number(process.env.SEEDS || 5), LEG = Number(process.env.LEG || 3000), PILOT = process.env.PILOT || 'smart';
const base = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, landings: 30, mission: 99, planted: { spruce: 1 },
  fleet: process.env.TOP === '0' ? { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }
    : { plane: 'twin', planes: { twin: { engines: 4, body: 4, cabin: 4 } }, systems: { forecast: 6, atc: 6, ops: 6 }, gadgets: { magnet: 6, hold: 6, gear: 6, sensors: 6, autopilot: 6 } } };   // twinFull of tools/balance.cjs
const save = slots => ({ ...base, levels: { trees: 4, soil: 3, nursery: 0, ...(slots > 1 ? { species: slots - 1 } : {}) } });
function run({ slots, route, bySpecies, plant = true }) {
  const kms = [], kinds = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    let ids = new Set(), hooked = false;
    const r = simulate(save(slots), { pilot: PILOT, seed, onStep(w) {
      if (!hooked) {
        hooked = true;
        w.regionHere = () => route[Math.floor(w.distancePx / LEG) % route.length];
        const orig = w.parcelLanded.bind(w);
        w.parcelLanded = (x, kind) => {
          const n = w.planted; orig(x, kind);
          if (w.planted > n) { ids.add(`${w.regionNow}:${localTree(kind, w.regionNow).id}`); if (bySpecies) w.speciesPlanted = new Set(ids); }
        };
      }
      if (!plant || w.parcels <= 0) return;
      const x = w.predictLanding(), pl = w.plots.find(p => !p.used && !p.aimed && x >= p.x + 4 && x <= p.x + w.kit.plotW - 4);
      if (pl) { pl.aimed = true; w.dropParcel(); }
    } });
    kms.push(r.km); kinds.push(ids.size);
  }
  kms.sort((a, b) => a - b);
  return { median: kms[Math.floor(kms.length / 2)], kms, kinds };
}
const rows = [['no trees', { slots: 1, route: ['woodland'], plant: false }]];
for (const s of [1, 2, 3, 4, 5]) {
  rows.push([`${s} slot(s), UK only, by slot (today)`, { slots: s, route: ['woodland'] }]);
  rows.push([`${s} slot(s), 2 biomes, by slot (today)`, { slots: s, route: ['woodland', 'mediterranean'] }]);
  rows.push([`${s} per land, 2 biomes, by species`, { slots: s, route: ['woodland', 'mediterranean'], bySpecies: true }]);
}
console.log(`pilot ${PILOT}, ${SEEDS} skies, leg ${LEG} km, ${process.env.TOP === '0' ? 'Comet' : 'twin full'}, 6 parcels, giant soil`);
for (const [name, o] of rows) { const r = run(o); console.log(`${name.padEnd(40)} median ${String(r.median).padStart(6)} km  runs ${r.kms.join(' ')}  kinds ${r.kinds.join(' ')}`); }
