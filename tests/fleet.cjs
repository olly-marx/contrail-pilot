// The plane side's data, eras 1-3 (src/fleet.js, 2026-10-23, plane build stage 2). No browser needed.
// Nothing bought = today's dials (except the Comet's own CO2); each era's prices total ~1.5x its
// budget; levels are blocked until their era opens; bought levels combine as the spec says.
// Run: node tests/fleet.cjs
(async () => {
  const F = await import('../src/fleet.js');
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;

  // Nothing bought: today's no-upgrade values (PLANE-ERAS-1-3.md section 1), flying the Comet.
  const k0 = F.fleetKit({});
  const today = { plane: 'comet', co2: 1.1, takeoff: 1, revealPx: 50, pickup: 12, perSkip: 0.5, flare: 1, dodgeCrystals: 1, dodgesPerNight: 3, autoSecs: 8, autoChance: 0, gaps: 1, fares: 1, hintLevel: 0 };
  for (const [key, v] of Object.entries(today)) check(k0[key] === v, `nothing bought: ${key} = ${k0[key]}, expected ${v}`);

  // Prices: each era totals 1.4-1.6x its budget; crystals = seeds / 8.
  const tot = [0, 0, 0];
  for (const p of F.PLANES) for (const l of Object.values(p.lines)) for (const lv of l) tot[p.era] += lv.cost;
  for (const g of [...F.SYSTEMS, ...F.GADGETS]) g.levels.forEach((lv, i) => { tot[F.levelEra(i + 1)] += lv.cost; check(lv.crystals === Math.round(lv.cost / 8), `${g.id} ${i + 1}: crystals = seeds / 8`); });
  tot.forEach((t, e) => check(t / F.ERA_BUDGET[e] >= 1.4 && t / F.ERA_BUDGET[e] <= 1.6, `era ${e} prices total ${t} = ${(t / F.ERA_BUDGET[e]).toFixed(2)}x its budget, want ~1.5x`));
  check(F.START_BONUS === 300, `start bonus 300 seeds (user, 2026-10-23): ${F.START_BONUS}`);
  check(F.SYSTEMS.length === 3 && F.GADGETS.length === 5 && [...F.SYSTEMS, ...F.GADGETS].every(g => g.levels.length === 6), 'three systems and five gadgets, 6 levels each');
  check(F.PLANES.map(p => Object.values(p.lines).map(l => l.length).join('')).join(' ') === '222 333 444', 'Comet 2, 747 3, twin 4 levels per line');

  // Era gates: the 1970s levels (3, 4) are blocked in the 1950s, open at 30 min of flying.
  const open = (secs, fleet) => Object.fromEntries(F.nextBuys({ flightSeconds: secs, fleet }).map(b => [`${b.id}${b.level}`, b.open]));
  check(open(0).magnet1 === true, 'magnet 1 open in the 1950s');
  const at3 = { systems: { atc: 2 }, gadgets: { magnet: 2 }, planes: { comet: {} } };
  check(open(1199, at3).magnet3 === false && open(1199, at3).atc3 === false, 'level 3 blocked at 19:59 of flying');
  check(open(1200, at3).magnet3 === true, 'level 3 open at 20:00');
  check(open(1200, { gadgets: { magnet: 4 }, planes: { jumbo: {} } }).magnet5 === false, 'level 5 blocked in the 1970s');
  check(open(0, { planes: { jumbo: {} } })['jumbo.engines1'] === false && open(1200, { planes: { jumbo: {} } })['jumbo.engines1'] === true, "the 747's upgrades open with the 1970s");

  // Bought levels combine: flying the 747 with engines 2, the 1950s ops level 1, magnet 2, hold 1, body 1.
  const k = F.fleetKit({ fleet: { plane: 'jumbo', planes: { comet: { engines: 2 }, jumbo: { engines: 2, body: 1 } }, systems: { ops: 1, forecast: 3 }, gadgets: { magnet: 2, hold: 1, gear: 2 } } });
  check(near(k.co2, 1.0 * 0.88 * 0.96), `747 CO2 = engines 2 (x0.88, replaces x0.93) x ops 1 (x0.96): ${k.co2}`);
  check(k.pickup === 19 && near(k.perSkip, 0.6) && near(k.flare, 1.2) && k.revealPx === 100, `gadgets and systems apply: ${JSON.stringify(k)}`);
  check(k.hintLevel === 0, 'no next-gap hint without all three systems');

  // The tree lines are not in the fleet (nature.js reads them from upgrades.js).
  const ids = [...F.SYSTEMS, ...F.GADGETS].map(g => g.id);
  check(!['trees', 'soil', 'species', 'nursery'].some(t => ids.includes(t)), 'no tree line ids in the fleet');

  console.log({ fails });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
