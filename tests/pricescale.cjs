// The 0.73.0 PRICE SCALE (src/config.js PRICE_SCALE; measured 2026-11-23: with real fares the sim's learning pilot banks x8.1 the seeds and x6.7 the crystals). Plain Node.
//  1. every price is the old table x the scale: fleet levels, the tree lines, every land's projects (the finance desk is priced directly since the 2026-11-23 rework);
//  2. a save from before it has its bank scaled ONCE (seeds x PRICE_SCALE.seeds, crystals x PRICE_SCALE.crystals, bonds and the fund x PRICE_SCALE.seeds), so what it buys stays the same; a second load does not scale again;
//  3. a new save and an automated test's save ('*' tips) are not scaled.
// Plants (tools/plants.tsv): the bank never scaled; scaled on every load. Run: node tests/pricescale.cjs
(async () => {
  const C = await import('../src/config.js'), F = await import('../src/fleet.js'), U = await import('../src/upgrades.js'), H = await import('../src/habitats.js'), M = await import('../src/finance.js'), S = await import('../src/save.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const scaled = lv => lv.base && lv.cost === C.scaleSeeds(lv.base.cost) && lv.crystals === C.scaleCrystals(lv.base.crystals);
  const fleet = [...F.PLANES.flatMap(p => Object.values(p.lines).flat()), ...F.SYSTEMS.flatMap(g => g.levels), ...F.GADGETS.flatMap(g => g.levels)];
  check(fleet.length > 100 && fleet.every(scaled), `every fleet level is its table price x the scale (${fleet.filter(l => !scaled(l)).length} not)`);
  const trees = U.LINES.filter(l => !U.retired(l)).flatMap(l => l.levels);
  check(trees.length > 5 && trees.every(scaled), 'every tree line level is scaled');
  const proj = Object.values(H.REGION_DATA).flatMap(d => d.projects);
  check(proj.length > 100 && proj.every(scaled), `every habitat project is scaled (${proj.filter(p => !scaled(p)).length} not)`);
  check(M.FINANCE.levels[0].cost === 1500 && M.FINANCE.levels[3].dividend.perLanding === C.PRICE_SCALE.crystals, 'the finance desk is priced in today\'s seeds (2026-11-23 rework: 1,500, not scaled) and the dividend in scaled crystals');
  // 2. an old bank, once
  const old = { priceVersion: 2, seeds: 1000, crystals: 50, landings: 20, flights: 30, finance: { level: 3, bonds: [{ at: 1, seeds: 1000 }], fund: { seeds: 2000, day: 4 } }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const a = S.prepareSave(JSON.parse(JSON.stringify(old)));
  const X = C.PRICE_SCALE.seeds, Y = C.PRICE_SCALE.crystals;
  check(a.seeds === 1000 * X && a.crystals === 50 * Y && a.finance.bonds[0].seeds === 1000 * X && a.finance.fund.seeds === 2000 * X && a.priceVersion === C.PRICE_SCALE.version, `an old bank is scaled: ${JSON.stringify([a.seeds, a.crystals, a.finance, a.priceVersion])}`);
  const b = S.prepareSave(JSON.parse(JSON.stringify(a)));
  check(b.seeds === 1000 * X && b.crystals === 50 * Y, `a second load does not scale again: ${b.seeds}/${b.crystals}`);
  // 3. not scaled
  const fresh = S.prepareSave(null);
  check(fresh.priceVersion === C.PRICE_SCALE.version, `a new save starts at priceVersion ${C.PRICE_SCALE.version}: ${fresh.priceVersion}`);
  const t = S.prepareSave({ ...JSON.parse(JSON.stringify(old)), seenTips: ['*'] });
  check(t.seeds === 1000 && t.priceVersion === C.PRICE_SCALE.version, `a test save is marked, not scaled: ${t.seeds}`);
  if (fails.length) { console.log(`FAIL pricescale:\n - ${fails.join('\n - ')}`); process.exit(1); }
  console.log(`PASS pricescale: every price x${C.PRICE_SCALE.seeds} seeds / x${C.PRICE_SCALE.crystals} crystals, an old bank scaled once, new and test saves not`);
})();
