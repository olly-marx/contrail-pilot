// SEASON 2 areas (src/areas.js, research/AREA-BALANCE.md): with ?season2=1 you fly only inside your unlocked areas.
// No browser. Run: node tests/areas.cjs
//  OFF (the live game): the world network is EXACTLY today's (a fingerprint of LINKS; update it only on purpose).
//  ON (a child process with window.SEASON2): every area is joined up, no dead ends, and every flight path from every
//  city and take-off choice stays inside the area; two areas together join up too; Honolulu/Nadi stay out.
const path = require('path'), crypto = require('crypto'), { execFileSync } = require('child_process');
const LIVE_LINKS = '5d56aca22854190f';   // sha256(JSON(LINKS)) of the live network, 104 cities (28841f6)
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  if (!process.env.AREAS_ON) {
    const N = await import(src('network.js'));
    const h = crypto.createHash('sha256').update(JSON.stringify(N.LINKS)).digest('hex').slice(0, 16);
    check(h === LIVE_LINKS, `switch OFF: the live network changed (${h}, ${Object.keys(N.LINKS).length} cities)`);
    let out = '';
    try { out = execFileSync(process.execPath, [__filename], { env: { ...process.env, AREAS_ON: '1' } }).toString(); } catch (e) { out = String(e.stdout); }
    check(/PASS/.test(out), `switch ON:\n${out}`);
  } else {
    globalThis.window = { SEASON2: true };
    const { AREAS, OCEAN_STONES } = await import(src('areas.js'));
    const { CITIES } = await import(src('cities.js'));
    const route = await import(src('route.js')), net = await import(src('network.js'));
    const names = new Set(CITIES.map(c => c.name)), all = Object.values(AREAS).flatMap(a => a.cities);
    check(all.length === new Set(all).size, 'a city is in two areas');
    check(CITIES.every(c => all.includes(c.name) || OCEAN_STONES.includes(c.name)), 'a city is in no area');
    const confined = (keys, label) => {
      const mine = keys.flatMap(k => AREAS[k].cities);
      route.flightPath({ areas: keys, city: AREAS[keys[0]].start, tutorialDone: true }, 1);
      const L = net.LINKS;
      check(Object.keys(L).length === mine.length, `${label}: network has ${Object.keys(L).length} cities, want ${mine.length}`);
      for (const c of mine) {
        check(names.has(c), `${label}: no airport ${c}`);
        check((L[c] || []).length >= 2, `${label}: ${c} is a dead end`);
        for (const o of route.choices(c)) { const p = route.tourPath(c, o.name, 30); const out = p.filter(x => !mine.includes(x));
          check(!out.length, `${label}: ${c} via ${o.name} leaves the area (${out[0]})`); }
      }
    };
    for (const k of Object.keys(AREAS)) confined([k], k);
    confined(['weurope', 'nordic'], 'weurope+nordic');
    confined(['sasia', 'easia', 'oceania'], 'sasia+easia+oceania');
  }
  console.log({ fails: fails.slice(0, 8) });
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
