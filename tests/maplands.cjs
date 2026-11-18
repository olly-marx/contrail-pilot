// MAP REGIONS (the user, 2026-11-18: "on the map actually draw lines that show the regions, the biomes, where you cross from one biome
// to another, with some text"): src/globe.js paint() draws a pale dashed line where two lands meet; src/landlabels.js names each land
// over the HOME globe and moves the names with every redraw. Real game, season 2, 390x844 and 320x568:
//   A. LINES (pixel check on the hub's own canvas): the test undoes the globe's projection itself (frame() -> lat/lon -> geo.js regionAt
//      on the same one-degree cells) and finds the pixels where the land changes region; at least 40% of them are line-coloured (pale),
//      while at most 3% of pixels deep inside one land are (the line is where lands meet, not everywhere).
//   B. NAMES: the opened lands (src/areas.js unlockedAreas -> src/arealand.js areaLands) are named in the bright style, a locked land
//      never is; with North Africa & the Middle East open, a player in CAIRO sees "Desert" bright. Each name sits over its own land (the
//      land under its middle, by the same undone projection). Names do not overlap, stay inside the globe, at most 5.
//   C. TAPS GO THROUGH: the element under a name's middle is not the name (pointer-events: none), so a city under it can be tapped.
//   D. NAMES FOLLOW A DRAG: after a real mouse drag the names have moved with the globe and are still over their own lands.
// Plants: tools/plants.tsv, test `maplands`. Run: python3 -m http.server 8000 & node tests/maplands.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const base = { homeArea: 'weurope', homeCity: 'LONDON', visited: ['LONDON'], tutorialDone: true, autoTakeoff: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, freeProjectGiven: true,
  freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
const CASES = [
  { W: 390, H: 844, seed: { ...base, areas: ['weurope', 'nordic', 'africa', 'mideast'], city: 'CAIRO' }, bright: 'desert' },
  { W: 320, H: 568, seed: { ...base, areas: ['weurope', 'nordic', 'africa', 'mideast'], city: 'CAIRO' }, bright: 'desert' },
  { W: 390, H: 844, seed: { ...base, areas: ['weurope', 'nordic'], city: 'ROME' }, bright: 'woodland', locked: 'desert' },
];

// In the page: everything the checks need, computed from the canvas and the globe's frame, independently of paint()'s own bookkeeping.
const look = () => (async () => {
  const G = await import('/src/globe.js'), Geo = await import('/src/geo.js'), A = await import('/src/areas.js'), AL = await import('/src/arealand.js');
  const cv = document.getElementById('hubGlobe'), g = cv.__globe, f = g.frame(), S = cv.width, R = S / 2 - 1, c0 = S / 2, Z = f.zoom || 1;
  const px = cv.getContext('2d').getImageData(0, 0, S, S).data;
  const geoAt = (x, y) => { const nx = (x + 0.5 - c0) / (R * Z), ny = (y + 0.5 - c0) / (R * Z), z2 = 1 - nx * nx - ny * ny; if (z2 <= 0) return null; const z = Math.sqrt(z2);
    const v = [0, 1, 2].map(i => f.r[i] * nx - f.u[i] * ny + f.c[i] * z), lat = Math.asin(Math.max(-1, Math.min(1, v[2]))) * 180 / Math.PI, lon = Math.atan2(v[1], v[0]) * 180 / Math.PI;
    return { lat, lon, land: G.isLand(lat, lon), region: Geo.regionAt(Math.floor(lat) + 0.5, Math.floor(lon) + 0.5) }; };
  const grid = []; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) grid.push(geoAt(x, y));
  const at = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? null : grid[y * S + x]);
  const real = q => q && q.land && q.region !== 'ocean' && q.region !== 'ice';
  const solid = (x, y) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([dx, dy]) => { const q = at(x + dx, y + dy); return q && q.land; });   // not a coast pixel
  const pale = (x, y) => { const k = (y * S + x) * 4; return px[k] > 200 && px[k + 1] > 195 && px[k + 2] > 165 && px[k + 2] < 235; };
  let edge = 0, edgePale = 0, inner = 0, innerPale = 0;
  for (let y = 2; y < S - 2; y++) for (let x = 2; x < S - 2; x++) {
    const q = at(x, y); if (!real(q) || !solid(x, y)) continue;
    const rt = at(x + 1, y), dn = at(x, y + 1);
    if ((real(rt) && rt.region !== q.region) || (real(dn) && dn.region !== q.region)) { edge++; if (pale(x, y)) edgePale++; continue; }
    let deep = true; for (let dy = -3; dy <= 3 && deep; dy++) for (let dx = -3; dx <= 3; dx++) { const o = at(x + dx, y + dy); if (!o || !o.land || o.region !== q.region) { deep = false; break; } }
    if (deep) { inner++; if (pale(x, y)) innerPale++; }
  }
  // the names
  const wrap = document.querySelector('.hub-globe-wrap').getBoundingClientRect(), cr = cv.getBoundingClientRect(), k = S / cr.width;
  const save = game.registry.get('ui').save, open = [...new Set(A.unlockedAreas(save).flatMap(AL.areaLands))];
  const labels = [...document.querySelectorAll('#hubLands .land-label')].filter(e => !e.hidden && e.offsetWidth).map(e => {
    const r = e.getBoundingClientRect(), mx = r.left + r.width / 2, my = r.top + r.height / 2, cx = Math.floor((mx - cr.left) * k), cy = Math.floor((my - cr.top) * k);
    let over = false; for (let dy = -4; dy <= 4 && !over; dy++) for (let dx = -4; dx <= 4; dx++) { const q = at(cx + dx, cy + dy); if (q && q.land && q.region === e.dataset.land) { over = true; break; } }
    const hitEl = document.elementFromPoint(mx, my);
    return { id: e.dataset.land, text: e.textContent, open: e.classList.contains('open'), x: Math.round(mx), y: Math.round(my), over, box: [r.left, r.top, r.right, r.bottom],
      inside: r.left >= wrap.left - 1 && r.right <= wrap.right + 1 && r.top >= wrap.top - 1 && r.bottom <= wrap.bottom + 1, through: !!hitEl && hitEl !== e && !e.contains(hitEl), under: hitEl ? hitEl.id || hitEl.tagName : null };
  });
  const overlap = labels.some((a, i) => labels.some((b, j) => j > i && a.box[0] < b.box[2] && a.box[2] > b.box[0] && a.box[1] < b.box[3] && a.box[3] > b.box[1]));
  return { edge, edgePale, inner, innerPale, labels, overlap, open, canvas: { x: cr.left, y: cr.top, w: cr.width } };
})();

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const C of CASES) {
      const tag = `${C.W}x${C.H} ${C.seed.city}`, ctx = await b.newContext({ viewport: { width: C.W, height: C.H } }), p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, C.seed);
      try {
        await p.goto(URL); await ready(p);
        await p.waitForFunction(() => { const c = document.getElementById('hubGlobe'); return c && c.__globe && c.getBoundingClientRect().width > 50; }, null, { timeout: 15000 }).catch(() => null);
        await p.waitForTimeout(500);
        const a = await p.evaluate(look);
        log.push(`${tag} lines ${a.edgePale}/${a.edge} pale at the meeting pixels, ${a.innerPale}/${a.inner} inside; names ${JSON.stringify(a.labels.map(l => [l.text, l.open, l.over, l.under]))}`);
        // A. lines where lands meet
        check(a.edge >= 30 && a.edgePale >= 0.4 * a.edge, `${tag} A: the pixels where two lands meet should carry the pale line (${a.edgePale} of ${a.edge} do; at least 40%)`);
        check(a.inner >= 500 && a.innerPale <= 0.03 * a.inner, `${tag} A: pixels deep inside one land should not be line-coloured (${a.innerPale} of ${a.inner}; at most 3%)`);
        // B. names
        check(a.labels.length >= 2 && a.labels.length <= 5, `${tag} B: 2 to 5 land names on the globe: ${JSON.stringify(a.labels.map(l => l.text))}`);
        check(a.labels.every(l => l.open === a.open.includes(l.id)), `${tag} B: a name is bright exactly when its land is opened (${a.open.join(',')}): ${JSON.stringify(a.labels.map(l => [l.id, l.open]))}`);
        check(a.labels.some(l => l.id === C.bright && l.open), `${tag} B: the opened land ${C.bright} is named, bright: ${JSON.stringify(a.labels.map(l => [l.id, l.open]))}`);
        if (C.locked) check(!a.open.includes(C.locked) && a.labels.every(l => l.id !== C.locked || !l.open), `${tag} B: the locked ${C.locked} is never named bright`);
        check(a.labels.every(l => l.over), `${tag} B: each name sits over its own land: ${JSON.stringify(a.labels.filter(l => !l.over).map(l => l.id))}`);
        check(a.labels.every(l => l.inside) && !a.overlap, `${tag} B: names inside the globe and not overlapping: ${JSON.stringify(a.labels.map(l => [l.text, l.inside]))} overlap ${a.overlap}`);
        // C. taps go through the names
        check(a.labels.every(l => l.through), `${tag} C: a tap on a name reaches the globe under it: ${JSON.stringify(a.labels.map(l => [l.text, l.under]))}`);
        // D. a real drag: the names move with the globe and stay on their lands
        const before = Object.fromEntries(a.labels.map(l => [l.id, l])), cx = a.canvas.x + a.canvas.w / 2, cy = a.canvas.y + a.canvas.w / 2;
        await p.mouse.move(cx, cy); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(cx - i * 6, cy + i); await p.waitForTimeout(20); } await p.mouse.up();
        // wait for the globe to stop (the coast ends with one sharp redraw; under load it takes longer)
        let key = '', still = 0; for (let i = 0; i < 40 && still < 3; i++) { await p.waitForTimeout(250); const k2 = await p.evaluate(() => document.getElementById('hubGlobe').__globe.frame().c.map(v => v.toFixed(5)).join()); still = k2 === key ? still + 1 : 0; key = k2; }
        await p.waitForTimeout(300);
        const d = await p.evaluate(look), moved = d.labels.filter(l => before[l.id]).map(l => ({ id: l.id, dx: l.x - before[l.id].x }));
        log.push(`${tag} after the drag: ${JSON.stringify(d.labels.map(l => [l.text, l.over]))} moved ${JSON.stringify(moved)}`);
        const med = moved.map(m => m.dx).sort((x, y) => x - y)[moved.length >> 1];   // (the median: one land's middle can shift less as more of it comes into view)
        check(moved.length >= 1 && med < -15, `${tag} D: after a drag to the left the names move left with the globe (median move ${med} px): ${JSON.stringify(moved)}`);
        check(d.labels.length >= 1 && d.labels.every(l => l.over), `${tag} D: after the drag each name is still over its own land: ${JSON.stringify(d.labels.map(l => [l.id, l.over]))}`);
        check(d.edge >= 30 && d.edgePale >= 0.4 * d.edge, `${tag} D: after the drag the lines are still where the lands meet (${d.edgePale} of ${d.edge})`);
        check(errs.length === 0, `${tag}: page errors: ${errs.join(' | ')}`);
        if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}maplands-${C.W}x${C.H}-${C.seed.city}.png` });
      } finally { await ctx.close(); }
    }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS maplands');
})();
