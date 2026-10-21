// "Tap here" tutorials (src/tour.js), against a FAKE Supabase like tests/online.cjs:
//   name:   first menu after flight school: PILOT, name, word, SAVE, BOARDS, FLY. Offline: says so, ends.
//   hangar: after the first flight: HANGAR, seeds, FREE upgrade, (i), OK, NATURE, TAKE OFF.
//   new:    an upgrade line opens: HANGAR, its card's (i), OK; then it is not shown again.
// Only the pointed-at button works (a tap elsewhere is swallowed); seenTips ['*'] saves never see one.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/tours.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const UID = '11111111-2222-3333-4444-555555555555';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (process.env.DEBUG) console.log(c ? 'ok  ' : 'FAIL', m.slice(0, 90)); if (!c) fails.push(m); };
  const errs = [];
  const page = async (save, pilot = null) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    p.setDefaultTimeout(4000);
  // ---- the fake Supabase ----
    const net = { up: true, rudeName: false, players: null, flights: [], signups: 0 };
    const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async route => {
      const r = route.request(), u = new globalThis.URL(r.url()), m = r.method();
      if (!net.up) return route.abort('internetdisconnected');
      if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (u.pathname === '/auth/v1/signup') {
        net.signups++;
        return json(route, 200, { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: UID, exp: 9999999999 })).toString('base64') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
      }
      if (u.pathname === '/rest/v1/players') {
        const body = r.postDataJSON();
        if (net.rudeName) return json(route, 400, { code: '23514', message: 'new row for relation "players" violates check constraint "players_first_name_check"' });
        if (m === 'PATCH') { if (!net.players) return json(route, 200, []); net.players = body; return json(route, 200, [{ id: UID }]); }
        if (m === 'POST') { net.players = body; return route.fulfill({ status: 201, body: '' }); }
      }
      if (u.pathname === '/rest/v1/flights' && m === 'POST') { net.flights.push(r.postDataJSON()); return route.fulfill({ status: 201, body: '' }); }
      if (u.pathname === '/rest/v1/rpc/leaderboard') {
        const { board, period } = r.postDataJSON();
        return json(route, 200, [{ place: 1, name: `Zara the Owl ${board}/${period}`, tag: 12, score: 900, is_me: false }, { place: 2, name: 'Ollie the Puffin', tag: 27, score: 585, is_me: true }]);
      }
      return json(route, 404, { message: 'not faked: ' + m + ' ' + u.pathname });
    });

    await p.addInitScript(([k, v, pl]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); if (pl) localStorage.setItem('contrailPilot.pilot', JSON.stringify(pl)); } }, [KEY, save, pilot]);
    await p.goto(URL); await p.waitForTimeout(1200);
    p.net = net;
    return p;
  };
  const fresh = { tutorialDone: true, autoTakeoff: true, muted: true, seenTips: [], flights: 0, landings: 0 };
  const on = async (p, sel) => { for (let i = 0; i < 30; i++) { const r = await p.evaluate(sel => { const t = document.getElementById('tour'); const ring = t && t.querySelector('.tring').getBoundingClientRect();
      const el = [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null); if (!t || t.hidden || !el) return false; const e = el.getBoundingClientRect();
      return Math.abs(ring.left + 4 - e.left) < 8 && Math.abs(ring.top + 4 - e.top) < 8; }, sel); if (r) return true; await p.waitForTimeout(150); } return false; };
  const bubble = p => p.evaluate(() => document.querySelector('#tour .tbubble p').textContent);
  const tourHidden = p => p.evaluate(() => document.getElementById('tour').hidden);
  const save = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const tapAt = async (p, sel) => { const r = await p.evaluate(sel => { const e = document.querySelector(sel).getBoundingClientRect(); return [e.left + e.width / 2, e.top + e.height / 2]; }, sel); await p.mouse.click(r[0], r[1]); };

  // 1. Name tour, online.
  let p = await page(fresh);
  check(await on(p, '#tabPilot') && /pilot name/.test(await bubble(p)), `a new pilot is pointed at PILOT: "${await bubble(p)}"`);
  await tapAt(p, '#goBtn'); await p.waitForTimeout(600);
  check(await p.evaluate(() => !document.getElementById('title').hidden && game.scene.getScene('game').state !== 'playing'), 'a tap on TAKE OFF must be swallowed while the tour points elsewhere');
  await p.click('#tabPilot');
  check(await on(p, '#pFirst'), 'then at the name box');
  await p.type('#pFirst', 'Zoe');
  check(await on(p, '#pWords'), 'then at the words');
  await p.click('[data-word="Otter"]');
  check(await on(p, '#pSave'), 'then at SAVE');
  await p.click('#pSave');
  check(await on(p, '#tabBoards'), `then at BOARDS once saved: "${await bubble(p)}"`);
  check(p.net.players && p.net.players.first_name === 'Zoe', `the name went to the database: ${JSON.stringify(p.net.players)}`);
  await p.click('#tabBoards');
  check(await on(p, '#bList') && /best pilots/.test(await bubble(p)), 'then shown the leaderboard');
  await p.click('#tour .tbubble .btn');
  check(await on(p, '#tabFly'), 'then FLY');
  await p.click('#tabFly'); await p.waitForTimeout(800);
  if (process.env.DEBUG) console.log(await tourHidden(p), (await save(p)).tours, await p.evaluate(() => [document.getElementById('hangar').hidden, document.getElementById('title').hidden, document.querySelector('#tour .tbubble p').textContent]));
  check(await tourHidden(p) && ((await save(p)).tours || []).includes('name'), 'the name tour ends and is remembered');
  await p.reload(); await p.waitForTimeout(1200);
  check(await tourHidden(p), 'and does not come back');
  await p.close();

  if (process.env.DEBUG) console.log('2.', fails);
  // 2. Name tour with no internet: says so, lets you play.
  p = await page(fresh); p.net.up = false;
  await p.click('#tabPilot'); await p.type('#pFirst', 'Zoe'); await p.click('[data-word="Otter"]'); await p.click('#pSave');
  for (let i = 0; i < 30 && !/internet/.test(await bubble(p)); i++) await p.waitForTimeout(200);
  check(/No internet/.test(await bubble(p)), `offline: the tour says so: "${await bubble(p)}"`);
  await p.click('#tour .tbubble .btn'); await p.waitForTimeout(500);
  check(await tourHidden(p), 'offline: OK ends the tour');
  await p.close();

  if (process.env.DEBUG) console.log('3.', fails);
  // 3. Hangar tour after the first flight (with the free upgrade).
  p = await page({ ...fresh, tours: ['name'], flights: 1, landings: 1, freeUpgrade: true, freeGiven: true, seeds: 12 }, { first: 'Zoe', word: 'Otter', tag: 12 });
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.showOnly('results'); ui.tour.maybe('results'); });   // don't wait: the tour waits for us
  check(await on(p, '#tabHangar'), 'hangar tour: HANGAR first');
  await p.click('#tabHangar');
  check(await on(p, '.treebank'), 'then the seeds and crystals'); await p.click('#tour .tbubble .btn');
  check(await on(p, '#hUpgrades') && /any FREE/.test(await bubble(p)), 'then the list, to pick any FREE upgrade');
  await p.click('#hUpgrades .btn.free >> nth=1');   // not the first one: the choice is yours
  check(Object.values((await save(p)).levels).reduce((a, n) => a + n, 0) === 1, 'the free upgrade was bought');
  check(await on(p, '#hUpgrades .infobtn'), 'then an (i)'); await p.click('#hUpgrades .infobtn');
  check(await on(p, '#iClose'), 'then OK on the info'); await p.click('#iClose');
  check(await on(p, '#tabNature'), 'then NATURE'); await p.click('#tabNature');
  check(await on(p, '#wProjects'), 'then the habitat projects'); await p.click('#tour .tbubble .btn');
  check(await on(p, '#tabFly'), 'then FLY'); await p.click('#tabFly'); await p.click('#goBtn'); await p.waitForTimeout(1500);
  if (process.env.DEBUG) console.log(await tourHidden(p), (await save(p)).tours, await p.evaluate(() => [document.getElementById('hangar').hidden, document.getElementById('title').hidden, document.querySelector('#tour .tbubble p').textContent]));
  check(await tourHidden(p) && ((await save(p)).tours || []).includes('hangar') && await p.evaluate(() => document.getElementById('hangar').hidden && document.getElementById('title').hidden), 'the hangar tour ends with a take-off and is remembered');
  await p.close();

  if (process.env.DEBUG) console.log('4.', fails);
  // 4. Something new unlocks: pointed at it once.
  const shown = ['radar', 'cabin', 'trees', 'magnet'];
  p = await page({ ...fresh, tours: ['name', 'hangar'], flights: 4, landings: 3, shownLines: shown }, { first: 'Zoe', word: 'Otter', tag: 12 });
  check(await on(p, '#tabHangar') && /NEW/.test(await bubble(p)), `a new line: pointed at HANGAR: "${await bubble(p)}"`);
  await p.click('#tabHangar');
  let first = ''; for (let i = 0; i < 30 && !/NEW:/.test(first); i++) { await p.waitForTimeout(150); first = await bubble(p); }
  await p.waitForTimeout(400);   // the card scrolls into view
  check(/NEW: Cleaner Fuel, Better Engines and Landing Gear/.test(first), `...then at the new lines, all named at once: "${first}"`);
  const id = await p.evaluate(() => { const r = document.querySelector('#tour .tring').getBoundingClientRect(); const e = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).find(x => x.dataset && x.dataset.info); return e && e.dataset.info; });
  await p.click(`[data-info="${id}"]`); await p.click('#iClose'); await p.waitForTimeout(400);
  const sl = (await save(p)).shownLines;
  check(id === 'fuel' && ['fuel', 'engine', 'gear'].every(x => sl.includes(x)), `all three are remembered as shown: ${id} ${sl}`);
  await p.waitForTimeout(800);
  check(await tourHidden(p), 'and no second walk-through follows');
  await p.close();

  if (process.env.DEBUG) console.log('5.', fails);
  // 5. Automated-test saves never see a tour.
  p = await page({ ...fresh, seenTips: ['*'] });
  check(await tourHidden(p), 'seenTips * : no tour');
  await p.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS tours');
})();
