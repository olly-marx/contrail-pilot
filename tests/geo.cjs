// What is below the plane (src/geo.js; the user, 2026-10-22: real geography decides the region, the
// sea is its own terrain but squeezed). No browser. Run: node tests/geo.cjs
const path = require('path');
(async () => {
  const g = await import(path.resolve(__dirname, '../src/geo.js'));
  const { ROUTE, cityAt } = await import(path.resolve(__dirname, '../src/route.js'));
  const { REGIONS } = await import(path.resolve(__dirname, '../src/wildlife.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // 1. Every route city is in the region it is listed under.
  for (const [id, r] of Object.entries(REGIONS)) for (const name of r.cities) {
    const c = ROUTE.find(x => x.name === name); check(g.regionAt(c.lat, c.lon) === id, `${name} should be ${id}, is ${g.regionAt(c.lat, c.lon)}`);
  }
  // 2. Known places (declared here, by hand).
  const places = [['mid-Atlantic', 40, -40, 'ocean'], ['mid-Pacific', 30, -150, 'ocean'], ['Mediterranean Sea south of Crete', 33, 25, 'ocean'],
    ['Bay of Bengal', 15, 88, 'ocean'], ['Arabian Sea', 15, 65, 'ocean'], ['Denmark Strait', 66, -28, 'ocean'], ['Nairobi', -1.3, 36.8, 'savanna'],
    ['Manaus', -3.1, -60, 'rainforest'], ['Sao Paulo', -23.5, -46.6, 'rainforest'], ['Madrid', 40.4, -3.7, 'mediterranean'],
    ['Moscow', 55.7, 37.6, 'woodland'], ['Riyadh', 24.7, 46.7, 'desert'], ['Seoul', 37.5, 127, 'eastasia'], ['Denver', 39.7, -105, 'plains']];
  for (const [n, la, lo, want] of places) check(g.regionAt(la, lo) === want, `${n} should be ${want}, is ${g.regionAt(la, lo)}`);
  // 3. Every leg's strip covers 0..1 with no gaps and no slivers; the sea is squeezed.
  ROUTE.forEach((a, i) => {
    const b = cityAt(i + 1), s = g.legStrip(a, b);
    check(s[0].from === 0 && s[s.length - 1].to === 1 && s.every((r, k) => k === 0 || Math.abs(r.from - s[k - 1].to) < 1e-9), `${a.name}>${b.name}: strip has gaps`);
    check(s.every(r => r.to - r.from >= 0.04 - 1e-9), `${a.name}>${b.name}: a sliver under 4%`);
    check(g.regionBelow(a, b, 0) === g.regionAt(a.lat, a.lon) || s[0].to < 0.05, `${a.name}>${b.name}: starts over its own airport's region`);
  });
  const tok = ROUTE.find(c => c.name === 'TOKYO'), anc = ROUTE.find(c => c.name === 'ANCHORAGE');
  let realSea = 0; for (let i = 0; i < 200; i++) { const p = g.along(tok, anc, (i + 0.5) / 200); if (g.regionAt(p.lat, p.lon) === 'ocean') realSea++; }
  const gameSea = g.legStrip(tok, anc).filter(r => r.region === 'ocean').reduce((x, r) => x + r.to - r.from, 0);
  check(realSea > 0 && gameSea < realSea / 200, `Tokyo>Anchorage: the sea is squeezed (${Math.round(realSea / 2)}% real, ${Math.round(gameSea * 100)}% in the game)`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS geo');
})();
