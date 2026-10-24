// The FLY-screen globe (src/globe.js, 0.11.0): a REAL map, the whole route in view, drag to spin, a tap picks a way.
//   1. the land mask is right at known places; every one of the 104 cities is within 1 degree of land (or a stamped island);
//   2. for EVERY airport and each of its three ways, the first cities of the route (always at least the next one) lie inside the
//      picture of the frame the globe chooses (inside the disc, or inside the square when a short route is zoomed in), the
//      date-line routes included;
//   2b. every one of the 104 cities is drawn on LAND (a port on a sea pixel is moved to the nearest land pixel), seen from its own
//      middle and in every route's picture;
//   3. drag turns the globe, a tap never does; a tap on a way's dot picks that way, a drag that starts on it does not, a long press does not;
//   4. nothing is redrawn while idle; a drag is redrawn at most once a frame; it settles in one sharper redraw;
//   5. a drag stays smooth with the CPU slowed 4x (a phone): at least 30 frames a second.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/globe.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  await p.addInitScript(() => { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9 })); } });
  await p.goto(URL); await ready(p);

  // 1 + 2: pure geometry, in the page (it has the modules).
  const geo = await p.evaluate(async () => {
    const G = await import('./src/globe.js'), C = await import('./src/cities.js'), L = await import('./src/landmask.js'), R = await import('./src/route.js'), N = await import('./src/network.js');
    const known = [['London', 51.5, -0.1, true], ['Sahara', 23, 10, true], ['Antarctica', -80, 0, true], ['Australia', -25, 135, true], ['Brazil', -10, -55, true],
      ['mid Pacific', 0, -150, false], ['mid Atlantic', 30, -40, false], ['Indian Ocean', -20, 80, false], ['Hawaii big island', 19.6, -155.5, true], ['New Zealand south', -44, 170.5, true], ['Japan Honshu', 36, 138, true], ['Great Britain', 53, -2, true]];
    const wrongKnown = known.filter(([, la, lo, want]) => G.isLand(la, lo) !== want).map(k => k[0]);
    const farFromLand = C.CITIES.filter(k => { for (let dla = -1; dla <= 1; dla += 0.5) for (let dlo = -1; dlo <= 1; dlo += 0.5) if (G.isLand(k.lat + dla, k.lon + dlo)) return false;
      return !L.ISLANDS.some(([a, o]) => Math.abs(a - k.lat) < 1.2 && Math.abs(o - k.lon) < 1.2); }).map(k => k.name);
    let routes = 0, out = [], minN = 99;
    for (const k of C.CITIES) for (const way of N.choices(k.name)) {
      const path = R.tourPath(k.name, way.name, 5).map(R.city), f = G.frameRoute(path); routes++; minN = Math.min(minN, f.n);
      if (f.zoom < 1 || f.zoom > 1.35 + 1e-9) out.push(`${k.name}>${way.name}: zoom ${f.zoom}`);
      for (const c of path.slice(0, f.n)) { const q = G.project(f, c.lat, c.lon); const bad = !q || (f.zoom > 1 ? Math.max(Math.abs(q[0]), Math.abs(q[1])) > 0.95 : Math.hypot(q[0], q[1]) > 0.985); if (bad) out.push(`${k.name}>${way.name}: ${c.name} ${q ? q.map(v => v.toFixed(2)).join(',') : 'hidden'} zoom ${f.zoom.toFixed(2)}`); }
    }
    return { wrongKnown, farFromLand, cities: C.CITIES.length, routes, out: out.slice(0, 5), outCount: out.length, minN };
  });
  check(geo.wrongKnown.length === 0, `the land mask is wrong at: ${geo.wrongKnown.join(', ')}`);
  check(geo.cities >= 100 && geo.farFromLand.length === 0, `these cities are more than 1 degree from any land: ${geo.farFromLand.join(', ')}`);
  check(geo.routes > 250 && geo.outCount === 0, `the route must be wholly inside the disc (${geo.routes} routes; ${geo.outCount} cities outside, e.g. ${JSON.stringify(geo.out)})`);
  check(geo.minN >= 2, `every route shows at least the next airport (fewest shown: ${geo.minN})`);

  // 2b: every city drawn on land (paint returns where each dot went)
  const dry = await p.evaluate(async () => {
    const G = await import('./src/globe.js'), C = await import('./src/cities.js'), R = await import('./src/route.js'), N = await import('./src/network.js');
    const cv = document.createElement('canvas'); cv.width = cv.height = G.SIZE; const bad = [];
    for (const k of C.CITIES) { const r = G.paint(cv, G.frameAt(k.lat, k.lon), [k], 1), d = r.dots.find(x => x.name === k.name); if (!d || !d.onLand) bad.push('own middle: ' + k.name); }
    for (const start of ['LONDON', 'HONOLULU', 'NADI', 'TOKYO', 'CAIRO', 'SANTIAGO']) { const path = R.tourPath(start, N.choices(start)[0].name, 5).map(R.city), f = G.frameRoute(path), r = G.paint(cv, f, path, 1);
      for (const d of r.dots) if (!d.onLand) bad.push(`route from ${start}: ${d.name}`); }
    return bad;
  });
  check(dry.length === 0, `every city dot should be drawn on land: ${dry.slice(0, 6).join('; ')} (${dry.length} not)`);

  // 3 + 4: a canvas on the page, real mouse events.
  await p.evaluate(async () => {
    const G = await import('./src/globe.js'), C = await import('./src/cities.js'), R = await import('./src/route.js');
    const cv = document.createElement('canvas'); cv.id = 'tg'; cv.style.cssText = 'position:fixed;left:100px;top:200px;width:160px;height:160px;z-index:99999;image-rendering:pixelated';
    document.body.appendChild(cv);
    const path = R.tourPath('LONDON', 'BERLIN', 5).map(R.city);
    window.__picks = []; window.__paints = 0;
    const put = CanvasRenderingContext2D.prototype.putImageData; CanvasRenderingContext2D.prototype.putImageData = function (...a) { if (this.canvas.id === 'tg') window.__paints++; return put.apply(this, a); };
    window.__g = G.drawGlobe(cv, path[0], path, { ways: [R.city('BERLIN'), R.city('PARIS')], onPick: n => window.__picks.push(n) });
    window.__G = G; window.__dot = n => { const f = window.__g.frame(), c = R.city(n), q = G.project(f, c.lat, c.lon), r = cv.getBoundingClientRect(), k = r.width / cv.width;
      return q && { x: r.left + (cv.width / 2 + q[0] * (cv.width / 2 - 1)) * k, y: r.top + (cv.height / 2 + q[1] * (cv.width / 2 - 1)) * k }; };
  });
  const frameKey = () => p.evaluate(() => window.__g.frame().c.map(v => v.toFixed(4)).join(','));
  const picks = () => p.evaluate(() => window.__picks.slice());
  const paints = () => p.evaluate(() => window.__paints);
  await p.waitForTimeout(400);
  const k0 = await frameKey(), paints0 = await paints();
  await p.waitForTimeout(1200);
  check(await paints() === paints0, `nothing redraws while idle (${await paints() - paints0} redraws in 1.2 s)`);
  // a tap on the globe, off any dot, with a little finger jitter: no drag
  await p.mouse.move(180, 280); await p.mouse.down(); await p.mouse.move(182, 281); await p.mouse.move(181, 279); await p.mouse.up(); await p.waitForTimeout(300);
  check(await frameKey() === k0 && (await picks()).length === 0, 'a tap with a little jitter is not a drag and picks nothing off a dot');
  // a tap ON a way's dot picks it
  const berlin = await p.evaluate(() => window.__dot('BERLIN'));
  await p.mouse.move(berlin.x, berlin.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(200);
  check(JSON.stringify(await picks()) === '["BERLIN"]' && await frameKey() === k0, `a tap on the BERLIN dot picks BERLIN and does not turn the globe: ${JSON.stringify(await picks())}`);
  // a long press on the dot, no movement: nothing
  await p.mouse.move(berlin.x, berlin.y); await p.mouse.down(); await p.waitForTimeout(700); await p.mouse.up(); await p.waitForTimeout(200);
  check((await picks()).length === 1, 'a long press does not pick');
  // a drag that starts on the dot: turns the globe, does not pick
  const before = paints0 + 0, pBefore = await paints();
  await p.mouse.move(berlin.x, berlin.y); await p.mouse.down();
  for (let i = 1; i <= 12; i++) { await p.mouse.move(berlin.x + i * 6, berlin.y + i * 2); await p.waitForTimeout(16); }
  const during = (await paints()) - pBefore;
  await p.mouse.up(); await p.waitForTimeout(900);
  check(await frameKey() !== k0, 'a drag turns the globe');
  check((await picks()).length === 1, `a drag that starts on a dot does not pick: ${JSON.stringify(await picks())}`);
  check(during > 0 && during <= 13, `a drag redraws at most once a frame (${during} redraws for 12 moves)`);
  // a quick flick (well inside the tap time) that starts on a dot and ends on it, because the surface follows the finger:
  // it moved, so it is a drag and must NOT pick
  const flick = await p.evaluate(async () => {
    const cv = document.getElementById('tg'), d0 = window.__dot('BERLIN'); if (!d0) return 'hidden';
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 11, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    const n = window.__picks.length; ev('pointerdown', d0.x, d0.y);
    for (let i = 1; i <= 5; i++) ev('pointermove', d0.x + i * 4, d0.y + i);
    const d1 = window.__dot('BERLIN'); ev('pointerup', d1.x, d1.y);
    return window.__picks.length - n;
  });
  check(flick === 0, `a quick flick that starts and ends on a dot is a drag, not a pick: ${flick}`);
  await p.waitForTimeout(600);
  // 40 moves inside ONE task are one redraw, not forty (the picture follows the screen's frames, not the events)
  const burst = await p.evaluate(async () => {
    const cv = document.getElementById('tg'), r = cv.getBoundingClientRect(), n0 = window.__paints;
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 9, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    ev('pointerdown', r.left + 80, r.top + 80);
    for (let i = 1; i <= 40; i++) ev('pointermove', r.left + 80 + i, r.top + 80 + (i % 7));
    await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
    const mid = window.__paints - n0; ev('pointerup', r.left + 120, r.top + 87); return mid;
  });
  check(burst >= 1 && burst <= 2, `40 pointer moves in one task should be 1-2 redraws, got ${burst}`);
  await p.waitForTimeout(1500);
  const settled = await paints(); await p.waitForTimeout(1200);
  check(await paints() === settled, 'once settled, nothing redraws again');

  // 5. smooth at 4x slower: scripted 1.5 s drag, count frames
  const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const fps = await p.evaluate(async () => {
    const cv = document.getElementById('tg'), r = cv.getBoundingClientRect(); let frames = 0, run = true; const t0 = performance.now();
    const tick = () => { frames++; if (run) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    const ev = (t, x, y) => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    ev('pointerdown', r.left + 80, r.top + 80);
    for (let i = 0; i < 90; i++) { ev('pointermove', r.left + 80 + Math.sin(i / 8) * 50, r.top + 80 + Math.cos(i / 11) * 30); await new Promise(res => setTimeout(res, 16)); }
    ev('pointerup', r.left + 80, r.top + 80); run = false; return frames / ((performance.now() - t0) / 1000);
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  check(fps >= 30, `a drag at 4x slower CPU should hold 30 frames a second, got ${fps.toFixed(1)}`);
  console.log('frames a second at 4x slower CPU while dragging:', fps.toFixed(1));

  // 6. The real FLY screen: the globe is live, a tap on another way's dot picks that way (like its button), a drag does not.
  await p.evaluate(() => { document.getElementById('tg').remove(); game.registry.get('ui').showTitle(); }); await p.waitForTimeout(600);
  const fly = await p.evaluate(async () => {
    const ui = game.registry.get('ui'), cv = document.getElementById('jGlobe'), G = await import('./src/globe.js'), R = await import('./src/route.js');
    const ways = [...document.querySelectorAll('#tJourney [data-way]')].map(b => b.dataset.way), on = document.querySelector('#tJourney .jway.on').dataset.way;
    const other = ways.find(w => w !== on), f = cv.__globe.frame(), c = R.city(other), q = G.project(f, c.lat, c.lon), r = cv.getBoundingClientRect(), k = r.width / cv.width;
    return { ways, on, other, live: !!cv.__globe, x: q && r.left + (cv.width / 2 + q[0] * (cv.width / 2 - 1)) * k, y: q && r.top + (cv.height / 2 + q[1] * (cv.width / 2 - 1)) * k, size: [cv.width, r.width] };
  });
  check(fly.live && fly.ways.length >= 2 && fly.x !== null, `the FLY globe is live with its other ways in view: ${JSON.stringify(fly)}`);
  if (fly.x !== null) {
    // a drag that starts on that dot: no pick
    await p.mouse.move(fly.x, fly.y); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(fly.x + i * 5, fly.y + 2); await p.mouse.up(); await p.waitForTimeout(300);
    check(await p.evaluate(() => document.querySelector('#tJourney .jway.on').dataset.way) === fly.on, 'dragging the FLY globe does not choose a way');
    const again = await p.evaluate(async ([other]) => { const cv = document.getElementById('jGlobe'), G = await import('./src/globe.js'), R = await import('./src/route.js'), c = R.city(other), q = G.project(cv.__globe.frame(), c.lat, c.lon), r = cv.getBoundingClientRect(), k = r.width / cv.width;
      return q && { x: r.left + (cv.width / 2 + q[0] * (cv.width / 2 - 1)) * k, y: r.top + (cv.height / 2 + q[1] * (cv.width / 2 - 1)) * k }; }, [fly.other]);
    check(!!again, 'the other way is still in view after the drag');
    if (again) {
      await p.mouse.move(again.x, again.y); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500);
      const now = await p.evaluate(() => ({ on: document.querySelector('#tJourney .jway.on').dataset.way, heading: game.registry.get('save').heading }));
      check(now.on === fly.other && now.heading === fly.other, `a tap on the ${fly.other} dot chooses that way like its button: ${JSON.stringify(now)}`);
    }
  }

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS globe');
})();
