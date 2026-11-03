// Two-biome areas (the user via the Coordinator, 2026-10-30; the sim: tasman never opened for Polynesia beginners, because the
// crossing gate read only the area START's land). For every starter area with more than one land:
//   1. the crossing gate's nature reading is the BEST of the area's lands: nature grown only in the non-start land counts;
//   2. NATURE opens on the CHOSEN home city's land (save.homeCity, set by the start choice), not the area start's;
//   3. old saves with no homeCity keep the area start's land.
// No browser. Run: node tests/arealand.cjs   (proved by planted defects)
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  globalThis.window = globalThis.window || {}; globalThis.document = globalThis.document || { getElementById: () => null };
  const A = await import('../src/areas.js'), N = await import('../src/network.js'), X = await import('../src/crossings.js'), L = await import('../src/arealand.js'), NA = await import('../src/nature.js'), H = await import('../src/habitats.js');
  const W = await import('../src/wild.js').catch(e => ({ err: e }));
  let two = 0;
  for (const [k, a] of Object.entries(A.AREAS)) {
    if (!a.starter) continue;
    const lands = L.areaLands(k); if (lands.length < 2) continue; two++;
    const startLand = N.city(a.start).region, other = lands.find(r => r !== startLand), otherCity = a.cities.find(n => N.city(n).region === other);
    // Grow nature ONLY in the other land until it reads >= 30 (planted trees of many kinds there).
    const save = { areas: [k], homeArea: k, city: a.start, visited: [a.start], missionsDone: [], planted: {}, habitat: {}, levels: {} };
    save.habitat[other] = (H.REGION_DATA[other].projects || H.REGION_DATA[other].PROJECTS || []).map(x => x.id);   /* every project in the OTHER land done */
    const bioOther = NA.biodiversity(save, other), bioStart = NA.biodiversity(save, startLand);
    if (process.env.DBG) console.log(k, other, bioOther, startLand, bioStart);
    check(bioOther >= 30 && bioStart === 0, `${k}: the seeded nature is in ${other} only (${bioOther}) and ${startLand} reads 0 (${bioStart}); else this proves nothing`);
    const c = X.CROSSINGS.find(x => A.areaOf(x.a) === k || A.areaOf(x.b) === k);
    const ctx = c && X.offerCtx(save, { ...c, from: A.areaOf(c.a) === k ? c.a : c.b });
    check(ctx && ctx.bio === Math.max(bioOther, bioStart), `${k}: the gate reads the best land (${ctx && ctx.bio} vs ${other} ${bioOther}, ${startLand} ${bioStart})`);
    if (!W.err) {
      check(W.homeRegion({ ...save, homeCity: otherCity }) === other, `${k}: home ${otherCity} opens NATURE on ${other} (${W.homeRegion({ ...save, homeCity: otherCity })})`);
      check(W.homeRegion({ ...save, homeCity: a.start }) === startLand, `${k}: home ${a.start} opens on ${startLand}`);
      check(W.homeRegion(save) === startLand, `${k}: an old save with no homeCity keeps ${startLand}`);
    }
  }
  check(two >= 5, `at least 5 two-biome starter areas checked (${two})`);
  if (W.err) { const src = require('fs').readFileSync(`${__dirname}/../src/wild.js`, 'utf8'); check(/n = save\.homeCity \|\| \(a && a\.start\)/.test(src), 'homeRegion prefers save.homeCity (static check: wild.js needs a browser)'); }
  const sc = require('fs').readFileSync(`${__dirname}/../src/startchoice.js`, 'utf8');
  check(/save\.homeCity = name/.test(sc), 'the start choice records the chosen home city');
  console.log(fails.length ? `FAIL arealand:\n - ${fails.join('\n - ')}` : `PASS arealand: ${two} two-biome areas; the gate reads the best land; NATURE opens on the chosen home city's land${W.err ? ' (homeRegion checked statically)' : ''}`);
  process.exit(fails.length ? 1 : 0);
})();
