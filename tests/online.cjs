// Online pilot names + leaderboards, against a FAKE Supabase (Playwright intercepts the network),
// so it needs no internet and never touches the real project. Checks what the game sends and how
// it copes with the answers: the name form, rude-name and no-internet messages, flights sent after
// a flight (never flight school, never before a name), the offline outbox (max 5), and the board.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/online.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const UID = '11111111-2222-3333-4444-555555555555';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };

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

  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5, bestDistance: 3000, mission: 3 })); } });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  const fly = async (landed = true) => {   // a short flight, ended by the game's own finish()
    await p.click('#goBtn');
    for (let i = 0; i < 60 && await p.evaluate(() => game.scene.getScene('game').state) !== 'playing'; i++) await p.waitForTimeout(100);
    await p.evaluate(l => { const s = game.scene.getScene('game'); s.distancePx = 2500; s.sunBlocked = -7; s.heatTrapped = 2; s.dodgesTotal = 1; s.speciesPlanted.add('oak'); s.finish({ landed: l }); }, landed);
    await p.waitForTimeout(2500);
    await p.evaluate(() => game.registry.get('ui').showTitle());
  };

  // 1. Title buttons.
  check(await p.isVisible('#tabPilot') && await p.isVisible('#tabBoards'), 'PILOT and BOARDS tabs should be on the title');

  // 2. A flight before having a name is not sent, and no account is made.
  await fly();
  check(net.flights.length === 0 && net.signups === 0, `nothing should be sent before a name: ${net.flights.length} flights, ${net.signups} sign-ups`);

  // 3. The name form: letters only, SAVE off until name + word.
  await p.click('#tabPilot');
  await p.fill('#pFirst', 'ol1ie!'); await p.dispatchEvent('#pFirst', 'input');
  check(await p.inputValue('#pFirst') === 'olie', `only letters should stay in the name box, got "${await p.inputValue('#pFirst')}"`);
  await p.fill('#pFirst', 'ollie'); await p.dispatchEvent('#pFirst', 'input');
  check(await p.isDisabled('#pSave'), 'SAVE should be off until a word is picked');
  await p.click('[data-word="Puffin"]');
  check(!(await p.isDisabled('#pSave')), 'SAVE should be on with a name and a word');
  const shown = await p.textContent('#pName');
  check(/^Ollie the Puffin \d\d$/.test(shown), `name preview should be "Ollie the Puffin NN", got "${shown}"`);
  await p.screenshot({ path: '/tmp/online-name.png' });

  // 4. Rude name refused by the database -> friendly message, not saved.
  net.rudeName = true;
  await p.click('#pSave'); await p.waitForTimeout(800);
  check(/different name/.test(await p.textContent('#pMsg')), `a refused name should say "Try a different name", got "${await p.textContent('#pMsg')}"`);
  check(!(await p.evaluate(() => localStorage.getItem('contrailPilot.pilot'))), 'a refused name must not be kept');
  net.rudeName = false;

  // 5. No internet -> says so.
  net.up = false;
  await p.click('#pSave'); await p.waitForTimeout(800);
  check(/No internet/.test(await p.textContent('#pMsg')), `offline should say "No internet", got "${await p.textContent('#pMsg')}"`);
  net.up = true;

  // 6. Saved.
  await p.click('#pSave'); await p.waitForTimeout(1000);
  check(net.players && net.players.first_name === 'Ollie' && net.players.word === 'Puffin' && net.players.tag >= 10 && net.players.tag <= 99, `player row sent: ${JSON.stringify(net.players)}`);
  check(await p.isHidden('#pEdit') && /^Ollie the Puffin/.test(await p.textContent('#pName')), 'after saving, the profile should show the name');
  check((await p.textContent('#tabPilotName')) === 'OLLIE', `the PILOT tab should become the first name, got "${await p.textContent('#tabPilotName')}"`);
  await p.waitForTimeout(800);
  await p.screenshot({ path: '/tmp/online-profile.png' });
  const stats = await p.textContent('#pStats');
  check(/3,000 km/.test(stats) && /2nd/.test(stats), `profile should show best flight and today's place: "${stats}"`);
  await p.click('#tabFly');

  // 7. A landed flight is sent with the right fields.
  await fly(true);
  const f = net.flights[0] || {};
  check(net.flights.length === 1, `one flight should be sent, got ${net.flights.length}`);
  check(f.landed === true && f.distance_m === 2500 && f.shade === 7 && f.heat_trapped === 2 && f.night_dodges === 1 && f.plane_co2 === 1 && f.species.join() === 'oak' && 'mission_done' in f && 'crystals' in f,
    `flight fields: ${JSON.stringify(f)}`);

  // 8. Flight school is never sent.
  await p.evaluate(() => { const s = game.scene.getScene('game'); s.school = { finished() {}, markTaught() {} }; s.finish({ landed: true }); s.school = null; });
  await p.waitForTimeout(500);
  check(net.flights.length === 1, `a flight-school flight must not be sent (${net.flights.length})`);

  // 9. Offline: flights wait (max 5), then go when the wifi is back.
  net.up = false;
  for (let i = 0; i < 7; i++) await p.evaluate(() => import('./src/online.js').then(o => o.sendFlight({ landed: false, distance_m: 10 })));
  await p.waitForTimeout(500);
  const waiting = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.outbox')).length);
  check(waiting === 5, `7 offline flights should keep the last 5, got ${waiting}`);
  net.up = true;
  await p.evaluate(() => window.dispatchEvent(new Event('online'))); await p.waitForTimeout(1500);
  check(net.flights.length === 6, `the 5 waiting flights should be sent when back online (sent ${net.flights.length - 1})`);
  check(await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.outbox')).length) === 0, 'outbox should be empty after sending');

  // 10. Leaderboard: rows shown, mine highlighted, tabs ask the right board.
  await p.waitForTimeout(1500); await p.evaluate(() => game.registry.get('ui').showTitle());
  await p.click('#tabBoards'); await p.waitForTimeout(800);
  check(/ultimate\/today/.test(await p.textContent('#bList')), 'opening the board should ask for ultimate / today');
  const me = await p.textContent('#bList li.me');
  check(me.includes('Ollie the Puffin') && me.includes('#27') && me.includes('2nd') && /585 points/.test(me), `my row: highlighted, 2nd, name, #27 apart from "585 points": "${me}"`);
  // Oops boards: every period like the other boards (TODAY only until 2026-10-21), say what they count, ask the right board.
  await p.click('[data-board="crashes"]'); await p.waitForTimeout(800);
  check(await p.isVisible('#bPeriods') && /crashes\/today/.test(await p.textContent('#bList')) && /Oops/.test(await p.textContent('#bWhat')), `crash champion: period tabs, explained: "${await p.textContent('#bWhat')}" ${await p.textContent('#bList')}`);
  check(/900 crashes/.test(await p.textContent('#bList')), `crash board shows "900 crashes": ${await p.textContent('#bList')}`);
  await p.click('[data-period="month"]'); await p.waitForTimeout(800);
  check(/crashes\/month/.test(await p.textContent('#bList')), `an Oops board asks for the chosen period: ${await p.textContent('#bList')}`);
  await p.click('[data-board="longestCrash"]'); await p.waitForTimeout(600);
  check(/longestCrash\/month/.test(await p.textContent('#bList')) && /900 km/.test(await p.textContent('#bList')), `longest crash board keeps the period, in km: ${await p.textContent('#bList')}`);
  await p.click('[data-period="today"]'); await p.waitForTimeout(600);
  await p.click('[data-board="longest"]'); await p.click('[data-period="week"]'); await p.waitForTimeout(800);
  check(/longest\/week/.test(await p.textContent('#bList')), `tabs should ask for longest / week: ${await p.textContent('#bList')}`);
  await p.screenshot({ path: '/tmp/online-board.png' });
  await p.click('#bInfo');
  check(await p.isVisible('#scoreInfo') && /land safely/.test(await p.textContent('#scoreInfo')), 'the points info should open');
  await p.screenshot({ path: '/tmp/online-points.png' });
  await p.click('#siClose');
  net.up = false; await p.click('[data-period="all"]'); await p.waitForTimeout(800);
  check(/No internet/.test(await p.textContent('#bMsg')), 'board offline should say "No internet"');

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS online');
})();
