// Offline play (0.10.0): flights flown with the network down wait on the device (up to 100, they used to be cut to 5),
// and when the connection returns they go up in ONE call, with a "Back online! Uploading..." banner that ends in
// "All saved!". The browser's network is really cut (context.setOffline); only the server is a stand-in, and it
// applies the database's rules (supabase/migrations): single inserts 5 a minute, send_flights whole batches.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/offline.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const flight = i => ({ landed: true, distance_m: 1000 + i, shade: 0, heat_trapped: 0, night_dodges: 0, crystals: 0, plane_co2: 1, species: [], mission_done: false, lap: false, crash: null });

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };

  // One scenario = a fresh browser context + a stand-in server whose behaviour the scenario sets.
  async function scenario(name, { pilot = true, server = {}, noOnline = false } = {}, body) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    const got = { flights: [], batchCalls: 0, singles: 0, saves: 0, requests: 0, up: true, times: [], opts: { batchDelay: 0, failBatches: 0, noBatch: false, ...server } };
    await ctx.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async r => {
      got.requests++;
      if (!got.up) return r.abort('internetdisconnected');   // a dead network: no answer at all
      const u = r.request().url(), m = r.request().method(), h = { 'access-control-allow-origin': '*' };
      const json = (o, s = 200) => r.fulfill({ status: s, contentType: 'application/json', headers: h, body: JSON.stringify(o) });
      if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...h, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (/auth\/v1\//.test(u)) return json({ access_token: 'x.y.z', token_type: 'bearer', expires_in: 3600, refresh_token: 'r', user: { id: 'u1', aud: 'authenticated' } });
      if (/rpc\/send_flights/.test(u)) {
        if (got.opts.noBatch) return json({ code: 'PGRST202', message: 'Could not find the function public.send_flights(batch) in the schema cache' }, 404);
        got.batchCalls++;
        if (got.opts.batchDelay) await new Promise(res => setTimeout(res, got.opts.batchDelay));
        if (got.opts.failBatches > 0) { got.opts.failBatches--; return json({ code: '57P03', message: 'the database is starting up' }, 503); }
        const batch = JSON.parse(r.request().postData()).batch;
        if (batch.some(f => f.distance_m > 500000)) return json({ code: '23514', message: 'violates check constraint "flights_distance_m_check"' }, 400);   // whole batch or nothing
        got.flights.push(...batch); return json(batch.length);
      }
      if (/rest\/v1\/flights/.test(u) && m === 'POST') {
        const f = JSON.parse(r.request().postData());
        if (f.distance_m > 500000) return json({ code: '23514', message: 'violates check constraint "flights_distance_m_check"' }, 400);
        const now = Date.now(); got.times = got.times.filter(t => now - t < 60000);
        if (got.times.length >= 5) return json({ code: 'P0001', message: 'too many flights too fast' }, 400);
        got.times.push(now); got.singles++; got.flights.push(f); return json([], 201);
      }
      if (/rpc\/put_save/.test(u)) { got.saves++; return json(true); }
      return json([]);
    });
    await p.addInitScript(([withPilot, off]) => { if (off) window.__CP_NO_ONLINE = true; if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
      localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9 }));
      if (withPilot) localStorage.setItem('contrailPilot.pilot', JSON.stringify({ first: 'Test', word: 'Puffin', tag: 11 })); } }, [pilot, noOnline]);
    await p.goto(URL); await ready(p);
    const ctl = {
      p, got, errs,
      down: async () => { got.up = false; await ctx.setOffline(true); },
      up: async () => { got.up = true; await ctx.setOffline(false); },   // the browser fires its own 'online' event
      outbox: () => p.evaluate(async () => (await import('./src/online.js')).outboxSize()),
      banner: () => p.evaluate(() => { const e = document.getElementById('upload'); return e ? e.innerText.replace(/\s+/g, ' ') : null; }),
    };
    ctl.send = n => p.evaluate(async ([n, mk]) => { const o = await import('./src/online.js'); for (let i = 0; i < n; i++) o.sendFlight(JSON.parse(mk)[i]); return o.outboxSize(); }, [n, JSON.stringify(Array.from({ length: n }, (_, i) => flight(i)))]);
    const waitFor = async (fn, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await p.waitForTimeout(150); } return false; };
    ctl.waitFor = waitFor;
    try { await body(ctl); } catch (e) { fails.push(`${name}: threw ${e.message.split('\n')[0]}`); }
    check(errs.length === 0, `${name}: page errors ${errs.join(' | ')}`);
    await ctx.close();
  }

  // 1. The headline: 30 flights offline all kept, then ONE call, banner up and then "All saved!".
  await scenario('1 reconnect', { server: { batchDelay: 1500 } }, async c => {
    await c.down();
    check(await c.send(30) === 30, '1: 30 offline flights should all wait (the outbox used to keep 5)');
    await c.p.click('#tabBoards'); await c.p.waitForTimeout(1500);
    const msg = await c.p.textContent('#bMsg');
    check(/No internet/.test(msg) && /30 flights are saved on this device/.test(msg), `1: the boards should say the flights are safe: ${JSON.stringify(msg)}`);
    await c.p.click('#tabFly'); await c.p.waitForTimeout(300);
    check(await c.banner() === null, '1: no banner while offline');
    await c.up();
    check(await c.waitFor(async () => /Back online/.test(await c.banner() || ''), 8000), `1: the "Back online" banner should show, got ${JSON.stringify(await c.banner())}`);
    check(/30 flights/.test(await c.banner() || ''), `1: the banner should count the flights: ${JSON.stringify(await c.banner())}`);
    check(await c.waitFor(async () => /All saved/.test(await c.banner() || ''), 10000), '1: it should end with "All saved!"');
    check(await c.waitFor(async () => (await c.banner()) === null, 6000), '1: the banner should go away again');
    check(c.got.flights.length === 30 && c.got.batchCalls === 1 && c.got.singles === 0, `1: 30 flights in ONE call: ${JSON.stringify({ n: c.got.flights.length, calls: c.got.batchCalls, singles: c.got.singles })}`);
    check(await c.outbox() === 0, '1: the outbox should be empty');
    check(c.got.saves >= 1, `1: the save should be uploaded too (${c.got.saves} uploads)`);
  });

  // 2. Never a banner in flight.
  await scenario('2 mid-flight', { server: { batchDelay: 2500 } }, async c => {
    await c.down(); await c.send(6);
    await c.p.click('#goBtn'); await started(c.p);
    await c.up();
    let seen = false;
    for (let i = 0; i < 20; i++) { if (await c.banner()) seen = true; await c.p.waitForTimeout(150); }
    check(!seen, '2: the banner must never show during a flight');
    check(await c.waitFor(async () => (await c.outbox()) === 0, 8000), '2: the flights should still go up while flying');
  });

  // 3. An ordinary online flight says nothing.
  await scenario('3 online as usual', {}, async c => {
    await c.send(1);
    let seen = false;
    for (let i = 0; i < 12; i++) { if (await c.banner()) seen = true; await c.p.waitForTimeout(150); }
    check(!seen && await c.waitFor(async () => c.got.flights.length === 1, 4000), `3: one online flight goes up quietly (banner seen: ${seen}, sent: ${c.got.flights.length})`);
  });

  // 4. Flights before the pilot has a name wait, then go up once there is one.
  await scenario('4 no name yet', { pilot: false }, async c => {
    check(await c.send(3) === 3, '4: flights are kept even before a name is chosen');
    await c.p.waitForTimeout(800);
    check(c.got.flights.length === 0, '4: nothing is sent without a pilot');
    await c.p.evaluate(async () => { localStorage.setItem('contrailPilot.pilot', JSON.stringify({ first: 'Test', word: 'Puffin', tag: 11 })); (await import('./src/online.js')).flush(); });
    check(await c.waitFor(async () => c.got.flights.length === 3 && (await c.outbox()) === 0, 6000), `4: they go up after naming: ${c.got.flights.length}`);
  });

  // 5. The server is down for a moment after the connection returns: it keeps trying by itself.
  await scenario('5 retry', { server: { failBatches: 1 } }, async c => {
    await c.down(); await c.send(8); await c.up();
    await c.p.waitForTimeout(2500);
    check(await c.outbox() === 8, '5: a failed upload must not lose anything');
    check(await c.waitFor(async () => (await c.outbox()) === 0, 25000), `5: it should retry on its own (${await c.outbox()} left)`);
    check(c.got.flights.length === 8, `5: all 8 arrive: ${c.got.flights.length}`);
  });

  // 6. A database with no send_flights (0.20.0: the database takes no direct inserts any more, everything goes through send_flights): nothing is
  //    inserted flight by flight and nothing is lost: the flights wait in the outbox for the database to be ready.
  await scenario('6 no send_flights', { server: { noBatch: true } }, async c => {
    await c.down(); await c.send(4); await c.up();
    await c.p.waitForTimeout(3000);
    check(await c.outbox() === 4, `6: the 4 flights must wait on the device (${await c.outbox()} left)`);
    check(c.got.singles === 0 && c.got.flights.length === 0, `6: no direct single inserts: ${c.got.singles} singles, ${c.got.flights.length} flights`);
  });

  // 7. One flight the database will never accept must not block the rest.
  await scenario('7 bad flight', {}, async c => {
    await c.down();
    await c.p.evaluate(async mk => { const o = await import('./src/online.js'); const f = JSON.parse(mk); f[2].distance_m = 999999999; f.forEach(x => o.sendFlight(x)); }, JSON.stringify(Array.from({ length: 5 }, (_, i) => flight(i))));
    await c.up();
    check(await c.waitFor(async () => (await c.outbox()) === 0, 8000), `7: the outbox should empty (${await c.outbox()} left)`);
    check(c.got.flights.length === 4 && !c.got.flights.some(f => f.distance_m > 500000), `7: the 4 good flights arrive, the bad one is dropped: ${c.got.flights.length}`);
  });

  // 8. Progress made offline with NO flight waiting (only the save changed): the catch-up uploads the save and says so.
  await scenario('8 save only', { server: { batchDelay: 0 } }, async c => {
    await c.p.waitForTimeout(1500);   // the opening sync is done
    await c.down();
    await c.p.evaluate(() => { game.registry.get('save').seeds = 777; });   // played offline: something changed that is not a flight
    const before = c.got.saves;
    await c.up();
    check(await c.waitFor(async () => c.got.saves > before, 6000), `8: the changed save should go up on reconnect (${c.got.saves} vs ${before})`);
    check(await c.p.evaluate(async () => (await import('./src/online.js')).outboxSize()) === 0 && c.got.flights.length === 0, '8: no flights were involved');
  });

  // 9. Online OFF by design (the plane build's test mode sets window.__CP_NO_ONLINE before any module runs): nothing is queued, sent,
  //    retried or announced, and the network is never touched, even with a pilot name and the connection going and coming back.
  await scenario('9 online off by design', { noOnline: true }, async c => {
    await c.down(); check(await c.send(6) === 0, '9: flights are not queued when online is off by design');
    await c.up(); await c.p.waitForTimeout(3000);
    check(await c.banner() === null, '9: no "Back online" banner');
    check(c.got.requests === 0, `9: no request ever leaves the page (${c.got.requests} did)`);
    check(await c.p.evaluate(async () => (await (await import('./src/online.js')).leaderboard('ultimate', 'all'))) === null, '9: the boards say "not reachable" without asking');
    check(c.got.requests === 0, `9: ...and still no request (${c.got.requests})`);
  });

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS offline');
})();
