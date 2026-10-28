// What is below the plane (src/geo.js; the user, 2026-10-22: real geography decides the region, the
// sea is its own terrain but squeezed). No browser. Run: node tests/geo.cjs
const path = require('path');
(async () => {
  const g = await import(path.resolve(__dirname, '../src/geo.js'));
  const { CITIES } = await import(path.resolve(__dirname, '../src/cities.js'));
  const N = await import(path.resolve(__dirname, '../src/network.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // 1. Every airport is in the region its entry in src/cities.js says (declared there, checked here).
  for (const c of CITIES) check(g.regionAt(c.lat, c.lon) === c.region, `${c.name} should be ${c.region}, is ${g.regionAt(c.lat, c.lon)}`);
  // 2. Known places (declared here, by hand).
  const places = [['Hobart (Tasmania)', -42.84, 147.51, 'bush'], ['Melbourne', -37.67, 144.84, 'bush'], ['Adelaide', -34.95, 138.53, 'bush'], ['Cairns', -16.9, 145.75, 'bush'], ['Wellington (NZ)', -41.33, 174.81, 'islandforest'], ['Lake Taupō (NZ)', -38.8, 175.9, 'islandforest'], ['Queenstown (NZ)', -45.03, 168.66, 'islandforest'], ['mid-Atlantic', 40, -40, 'ocean'], ['mid-Pacific', 30, -150, 'ocean'], ['Mediterranean Sea south of Crete', 33, 25, 'ocean'],
    ['Bay of Bengal', 15, 88, 'ocean'], ['Arabian Sea', 15, 65, 'ocean'], ['Denmark Strait', 66, -28, 'ocean'], ['Nairobi', -1.3, 36.8, 'savanna'],
    ['Manaus', -3.1, -60, 'rainforest'], ['Sao Paulo', -23.5, -46.6, 'rainforest'], ['Madrid', 40.4, -3.7, 'mediterranean'],
    ['Moscow', 55.7, 37.6, 'woodland'], ['Riyadh', 24.7, 46.7, 'desert'], ['Seoul', 37.5, 127, 'eastasia'], ['Denver', 39.7, -105, 'plains']];
  for (const [n, la, lo, want] of places) check(g.regionAt(la, lo) === want, `${n} should be ${want}, is ${g.regionAt(la, lo)}`);
  // 2b. No runway on the sea (user, 0.11.3: "some cities are shown over sea"). Every airway's first and last stretch shows
  // the land under its airport. The only exceptions are the two island airports DECLARED here (region 'ocean' in cities.js).
  const ISLANDS = ['HONOLULU', 'NADI'];
  for (const c of CITIES) check((c.region === 'ocean') === ISLANDS.includes(c.name), `${c.name}: region '${c.region}' but the declared island list says ${ISLANDS.includes(c.name)}`);
  for (const [an, list] of Object.entries((await import(path.resolve(__dirname, '../src/network.js'))).LINKS)) for (const bn of list) {
    const NN = await import(path.resolve(__dirname, '../src/network.js')), a = NN.city(an), b = NN.city(bn), s = g.legStrip(a, b);
    if (!ISLANDS.includes(an)) check(s[0].region !== 'ocean', `${an}>${bn}: the take-off airport ${an} is over the sea`);
    if (!ISLANDS.includes(bn)) check(s[s.length - 1].region !== 'ocean', `${an}>${bn}: the landing airport ${bn} is over the sea`);
  }
  // 3. Every airway's strip covers 0..1 with no gaps and no slivers.
  for (const [an, list] of Object.entries(N.LINKS)) for (const bn of list) {
    const a = N.city(an), b = N.city(bn), s = g.legStrip(a, b);
    check(s[0].from === 0 && s[s.length - 1].to === 1 && s.every((r, k) => k === 0 || Math.abs(r.from - s[k - 1].to) < 1e-9), `${an}>${bn}: strip has gaps`);
    check(s.every(r => r.to - r.from >= 0.04 - 1e-9) || s.length === 1, `${an}>${bn}: a sliver under 4%`);
  }
  const tok = N.city('TOKYO'), anc = N.city('ANCHORAGE');
  let realSea = 0; for (let i = 0; i < 200; i++) { const p = g.along(tok, anc, (i + 0.5) / 200); if (g.regionAt(p.lat, p.lon) === 'ocean') realSea++; }
  const gameSea = g.legStrip(tok, anc).filter(r => r.region === 'ocean').reduce((x, r) => x + r.to - r.from, 0);
  check(realSea > 0 && gameSea < realSea / 200, `Tokyo>Anchorage: the sea is squeezed (${Math.round(realSea / 2)}% real, ${Math.round(gameSea * 100)}% in the game)`);
  // 4. The world tour (the user, 2026-10-22: a long enough flight sees every city before repeating one):
  // from EVERY city and each of its three ways, legs until all cities are seen. Measured with this rule:
  // median 108, worst 117 for 104 cities; "turn least" alone needed a median of 127.
  const R = await import(path.resolve(__dirname, '../src/route.js'));
  const lens = [];
  for (const c of CITIES) for (const o of N.choices(c.name)) {
    const t = R.tourPath(c.name, o.name, 3 * CITIES.length), seen = new Set();
    let k = 0; while (seen.size < CITIES.length) seen.add(t[k++]);
    lens.push(k - 1);
  }
  lens.sort((a, b) => a - b);
  const med = lens[lens.length >> 1], worst = lens[lens.length - 1];
  check(med <= CITIES.length * 1.1 && worst <= CITIES.length * 1.2, `world tours: median ${med}, worst ${worst} legs for ${CITIES.length} cities (want <= 110% and 120%)`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS geo');
})();
