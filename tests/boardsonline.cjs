// ONLINE BOARDS in the shipped game (0.19.0; research/M8-ONLINE.md), against a FAKE Supabase (Playwright intercepts the network: no internet,
// never the real project). Checks what the game sends and how it copes with the answers:
//   1. BOARDS asks leaderboard(board, period) for the picked card and period (THIS WEEK = 'week', EVER = 'ever') and lists the answer, your own row marked (you);
//   2. no pilot name yet: no request, the screen says to pick a name in PILOT (the cards still show your own numbers);
//   3. a landed flight is sent with the client VERSION and missions_done, and the shade is the shade made (it was always 0);
//   4. the database refusing an old game (SQLSTATE CP001, 'update required') shows "Update to keep playing!" and keeps the flights;
//   5. no connection: the cards still show your numbers, no error screen.
// PLANTS (tools/plants.tsv, test `boardsonline`; each must FAIL this test). Run: python3 -m http.server 8000 & node tests/boardsonline.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const UID = '11111111-2222-3333-4444-555555555555';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const net = { up: true, tooOld: false, boards: [], sent: [], puts: [] };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['x-bars', 'records-intro'], tours: ['*'], priceVersion: 2, flights: 6, landings: 3, seeds: 100, fleet, areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'] };
  const open = async (pilot) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async route => {
      const r = route.request(), u = new globalThis.URL(r.url()), m = r.method();
      if (!net.up) return route.abort('internetdisconnected');
      if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (u.pathname === '/auth/v1/signup') return json(route, 200, { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: UID, exp: 9999999999 })).toString('base64') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
      if (u.pathname === '/rest/v1/rpc/leaderboard') {
        const q = r.postDataJSON(); net.boards.push(`${q.board}/${q.period}`);
        return json(route, 200, [{ place: 1, name: `Ben the Heron`, tag: 12, score: 12000, is_me: false }, { place: 12, name: 'Ann the Robin', tag: 11, score: 5000, is_me: true }]);
      }
      if (u.pathname === '/rest/v1/rpc/send_flights') {
        const q = r.postDataJSON();
        if (net.tooOld) return json(route, 400, { code: 'CP001', message: 'update required' });
        net.sent.push(q); return json(route, 200, q.batch.length);
      }
      if (u.pathname === '/rest/v1/rpc/put_save') { net.puts.push(r.postDataJSON()); return json(route, 200, true); }
      return json(route, 404, { message: 'not faked: ' + m + ' ' + u.pathname });
    });
    await p.addInitScript(([s, pl]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); if (pl) localStorage.setItem('s2:contrailPilot.pilot', JSON.stringify(pl)); } }, [base, pilot]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(700);
    return p;
  };
  const text = (p, sel) => p.evaluate(s => document.querySelector(s) ? document.querySelector(s).innerText : '', sel);

  // 2. No pilot name: nothing is asked, the screen says so.
  let p = await open(null);
  await p.click('#tabBoards'); await p.waitForTimeout(600);
  check(net.boards.length === 0, `no name, no request to the boards: ${net.boards}`);
  check(/Pick a name in PILOT/.test(await text(p, '#bMsg')), `no name: the screen says to pick one in PILOT: "${await text(p, '#bMsg')}"`);
  check(await p.isVisible('#bBoards .btn.rec'), 'the cards (your own numbers) still show without a name');
  await p.close();

  // 1. A pilot: the ranking of the picked board and period.
  p = await open({ first: 'Ann', word: 'Robin', tag: 11 });
  check(await p.isVisible('#tabPilot'), 'the PILOT tab is there after the 3rd landing');
  await p.click('#tabBoards'); await p.waitForTimeout(800);
  check(net.boards.includes('longest/week'), `BOARDS asks for the first card, THIS WEEK: ${net.boards}`);
  const rows = await p.evaluate(() => [...document.querySelectorAll('#bList li')].map(li => li.innerText.replace(/\s+/g, ' ').trim()));
  check(rows.length === 2 && /1st.*Ben the Heron.*12,000 km/.test(rows[0]) && /12th.*Ann the Robin.*\(you\).*5,000 km/.test(rows[1]), `the ranking is listed, you marked: ${JSON.stringify(rows)}`);
  check(await p.evaluate(() => !!document.querySelector('#bList li.me')), 'your own row is marked');
  await p.click('#bPeriods [data-period="ever"]'); await p.waitForTimeout(500);
  check(net.boards.includes('longest/ever'), `EVER asks for ever, not week again: ${net.boards}`);
  await p.click('#bBoards [data-board="shortest"]'); await p.waitForTimeout(500);
  check(net.boards.includes('shortest/ever'), `tapping a card asks for that board: ${net.boards}`);
  check(!['ultimate', 'today', 'month', 'all'].some(w => net.boards.some(x => x.includes(w))), `no retired board or period is asked for: ${net.boards}`);

  // 3. A landed flight: client version, missions_done, and the shade made.
  await p.evaluate(() => game.registry.get('ui').go('fly'));
  await p.waitForTimeout(300); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.distancePx = 2500; s.sunBlocked = 7; s.heatTrapped = 2; s.finish({ landed: true }); });
  await p.waitForTimeout(3000);
  const call = net.sent[0];
  const ver = await p.evaluate(async () => (await import('/src/version.js')).VERSION);
  check(call && call.client === ver, `the flight goes up with the client version ${ver}: ${JSON.stringify(call && call.client)}`);
  const f = call && call.batch && call.batch[0];
  check(f && f.landed === true && f.shade === 7 && f.heat_trapped === 2, `shade is the shade made (7), heat 2: ${JSON.stringify(f)}`);
  check(f && Number.isInteger(f.missions_done) && f.missions_done >= 0, `missions_done is sent as a whole number: ${JSON.stringify(f && f.missions_done)}`);
  check(!p.errs.length, `page errors: ${p.errs}`);

  // 4. An old game is refused: say so, keep the flights.
  net.tooOld = true; net.sent.length = 0;
  await p.evaluate(() => game.registry.get('ui').go('fly'));
  await p.waitForTimeout(300); await p.click('#goBtn');
  for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12; s.distancePx = 1500; s.finish({ landed: true }); });
  await p.waitForTimeout(3000);
  await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(1200);
  check(/Update to keep playing/.test(await text(p, '#upload')), `an old game is told to update: "${await text(p, '#upload')}"`);
  check(await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.outbox') || '[]').length) >= 1, 'the refused flights are kept on the device');
  await p.close(); net.tooOld = false;

  // 5. No connection: the cards still show your numbers, no error.
  net.up = false;
  p = await open({ first: 'Ann', word: 'Robin', tag: 11 });
  await p.click('#tabBoards'); await p.waitForTimeout(800);
  check(await p.isVisible('#bBoards .btn.rec') && !(await p.evaluate(() => document.querySelectorAll('#bList li').length)), 'offline: the cards show, no ranking, no list');
  check(!p.errs.length, `page errors offline: ${p.errs}`);
  await p.close(); await b.close();
  console.log(fails.length ? `FAIL boardsonline:\n - ${fails.join('\n - ')}` : 'PASS boardsonline: ranking per board + period, you marked, flights up with client + missions_done + the shade, old game told to update, offline keeps your numbers');
  process.exit(fails.length ? 1 : 0);
})();
