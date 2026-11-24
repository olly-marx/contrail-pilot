// REAL TERRAIN under a crossing (Oliver, 2026-11-24: 'Tunis-Rome is nearly all sea'; the lap flew over his homeland the whole way round).
// A crossing's own leg shows the real land and sea of its great circle (src/geo.js surfaceAt, legStrip(a, b, true)); the lap is the whole
// circle round from home, leaving due west (lapPoint); the departure land's nature cools the crossing all the way (src/sim/rules.js coolLand).
// Expectations DECLARED here by hand from a map, not read back from the code. No browser. Run: node tests/realterrain.cjs
const path = require('path');
(async () => {
  const g = await import(path.resolve(__dirname, '../src/geo.js'));
  const N = await import(path.resolve(__dirname, '../src/network.js'));
  const C = await import(path.resolve(__dirname, '../src/crossings.js'));
  const { RULES } = await import(path.resolve(__dirname, '../src/sim/rules.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const share = (s, want) => s.filter(r => want(r.region)).reduce((x, r) => x + r.to - r.from, 0);
  const sea = s => share(s, r => r === 'ocean'), real = (a, b) => g.legStrip(N.city(a), N.city(b), true);
  // 1. Sea where the real route is sea (shares from the map, with room for the 0.5 degree mask).
  for (const [a, b, lo, hi] of [['ROME', 'TUNIS', 0.85, 1], ['LISBON', 'NEW YORK', 0.85, 1], ['KARACHI', 'MUSCAT', 0.85, 1], ['SANTIAGO', 'AUCKLAND', 0.85, 1],
    ['LAGOS', 'BELEM', 0.6, 0.9], ['ISTANBUL', 'TEHRAN', 0, 0.2]]) {
    const v = sea(real(a, b)); check(v >= lo && v <= hi, `${a}>${b}: sea ${Math.round(v * 100)}%, want ${lo * 100}-${hi * 100}%`);
  }
  // 2. Land where it crosses land: Lagos > Belem ends over the Amazon; Istanbul > Tehran is Turkey and Iran.
  check(share(real('LAGOS', 'BELEM'), r => r === 'rainforest') > 0, 'LAGOS>BELEM: no rainforest at the end');
  check(share(real('ISTANBUL', 'TEHRAN'), r => r !== 'ocean') > 0.8, 'ISTANBUL>TEHRAN: should be mostly land');
  // 3. THE LAP from Lagos: the Atlantic, South America (rainforest), the Pacific, Indonesia (monsoon), the Indian Ocean, Africa (savanna); mostly sea.
  const lagos = N.city('LAGOS'), lap = g.legStrip(lagos, lagos, true), kinds = new Set(lap.map(r => r.region));
  for (const k of ['ocean', 'rainforest', 'monsoon', 'savanna']) check(kinds.has(k), `the Lagos lap never flies over ${k} (${[...kinds].join(', ')})`);
  check(sea(lap) > 0.55 && sea(lap) < 0.85, `the Lagos lap: sea ${Math.round(sea(lap) * 100)}%, want 55-85% (the Earth is ~70% sea)`);
  check(share(lap, r => r === 'savanna') < 0.35, `the Lagos lap: ${Math.round(share(lap, r => r === 'savanna') * 100)}% over the homeland`);
  check(lap[0].region === 'savanna' && lap[lap.length - 1].region === 'savanna', 'the Lagos lap must take off and land over savanna');
  const dLon = (x, y) => Math.abs((((x - y) % 360) + 540) % 360 - 180), half = g.lapPoint(lagos, 0.5);
  check(Math.abs(half.lat + lagos.lat) < 1 && dLon(half.lon, lagos.lon + 180) < 1, `the lap's halfway point should be Lagos's antipode, is ${half.lat.toFixed(1)},${half.lon.toFixed(1)}`);
  const q = g.lapPoint(lagos, 0.1); check(q.lon < lagos.lon - 20, `the lap leaves west: 10% in it is at lon ${q.lon.toFixed(1)}`);
  // 4. Every crossing route: the real strip covers 0..1 with no gaps, and takes off and lands over its airports' own land.
  for (const c of C.CROSSINGS.filter(x => x.kind === 'route')) for (const [a, b] of [[c.a, c.b], [c.b, c.a]]) {
    const s = real(a, b), ra = N.city(a).region, rb = N.city(b).region;
    check(s[0].from === 0 && s[s.length - 1].to === 1 && s.every((r, k) => k === 0 || Math.abs(r.from - s[k - 1].to) < 1e-9), `${a}>${b}: real strip has gaps`);
    if (ra !== 'ocean') check(s[0].region === ra, `${a}>${b}: takes off over ${s[0].region}, not ${ra}`);
    if (rb !== 'ocean') check(s[s.length - 1].region === rb, `${a}>${b}: lands over ${s[s.length - 1].region}, not ${rb}`);
  }
  // 5. Normal legs keep the squeezed sea (unchanged): Lisbon > New York's game strip is not the real one.
  check(sea(g.legStrip(N.city('LISBON'), N.city('NEW YORK'))) < sea(real('LISBON', 'NEW YORK')), 'a normal leg should keep the squeezed sea');
  // 6. The flight: a crossing's own leg reads the real strip, and its cooling stays with the departure land.
  const fake = { crossing: { from: 'LAGOS', to: 'LAGOS', km: 40000, kind: 'lap' }, airportIndex: 0, path: ['LAGOS', 'LAGOS'], nextAirport: { worldX: 40000 }, distancePx: 20000, school: null, legKm: () => 40000 };
  const mid = RULES.regionHere.call(fake);
  check(mid !== 'savanna', `halfway round the lap the plane is over ${mid}, should be the far side of the Earth`);
  check(RULES.coolLand.call({ ...fake, regionNow: 'ocean' }) === 'savanna', 'a crossing over the sea should be cooled by its departure land (savanna)');
  check(RULES.coolLand.call({ ...fake, crossing: null, regionNow: 'ocean' }) === 'ocean', 'a normal flight is cooled by the land below');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS realterrain');
})();
