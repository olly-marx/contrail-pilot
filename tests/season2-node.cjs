// Season 2 in Node (the sim chat's finding, 2026-10-27): src/cities.js SEASON2_ON read `window`, so in Node it was always
// false and every Node progression study flew the classic whole-world network. With globalThis.SEASON2 = true, the
// route network must stay inside the player's unlocked areas. Run: node tests/season2-node.cjs
// (proved by a planted defect: the old `typeof window !== 'undefined' && window.SEASON2 === true` form fails it)
(async () => {
  globalThis.SEASON2 = true;
  const R = await import('../src/route.js'), A = await import('../src/areas.js'), C = await import('../src/cities.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  check(C.SEASON2_ON === true, `SEASON2_ON follows globalThis.SEASON2 in Node (got ${C.SEASON2_ON})`);
  const save = { areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM' };
  const links = R.linksFor(save), inArea = new Set(A.AREAS.weurope.cities);
  const ends = [...new Set(Object.entries(links).flatMap(([a, bs]) => [a, ...(Array.isArray(bs) ? bs : Object.keys(bs || {}))]))];
  const outside = ends.filter(n => !inArea.has(n));
  check(ends.length > 5 && !outside.length, `the network stays inside Western Europe (${ends.length} cities, outside: ${outside.slice(0, 5)})`);
  console.log(fails.length ? `FAIL season2-node:\n - ${fails.join('\n - ')}` : `PASS season2-node: SEASON2_ON in Node, the network confined to the unlocked area (${ends.length} cities)`);
  process.exit(fails.length ? 1 : 0);
})();
