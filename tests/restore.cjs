// TEMPORARY restore button (2026-10-22), against a FAKE Supabase: the password is needed to list
// pilots; claiming one rebuilds the save from its flights (best distance, missions, laps exact;
// seeds spent on upgrades), makes this device that pilot, and keeps the player's settings.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/restore.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const UID = '11111111-2222-3333-4444-555555555555', OLD = 'dddddddd-0000-0000-0000-000000000004';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [], fails = [], calls = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('dialog', d => d.accept());
  const check = (c, m) => { if (!c) fails.push(m); };
  const flights = [
    { landed: true, distance_m: 18000, crystals: 7, species: ['oak', 'birch'], mission_done: true, lap: false },
    { landed: true, distance_m: 9000, crystals: 4, species: ['oak'], mission_done: true, lap: true },
    { landed: false, distance_m: 2000, crystals: 2, species: [], mission_done: false, lap: false },
  ];
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async route => {
    const r = route.request(), u = new globalThis.URL(r.url()), m = r.method();
    if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (u.pathname === '/auth/v1/signup') return json(route, 200, { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: UID, exp: 9999999999 })).toString('base64') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: UID, aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
    const body = r.postDataJSON() || {};
    if (u.pathname === '/rest/v1/rpc/claimable_pilots') { calls.push(['list', body]);
      return body.pw === 'right-pass' ? json(route, 200, [{ id: OLD, name: 'Olly the Swift', tag: 74, flights: 3, best: 18000 }]) : json(route, 400, { message: 'wrong password' }); }
    if (u.pathname === '/rest/v1/rpc/claim_pilot') { calls.push(['claim', body]);
      return body.pw === 'right-pass' && body.old === OLD ? json(route, 200, flights) : json(route, 400, { message: 'wrong password' }); }
    return json(route, 404, { message: 'not faked' });
  });
  await p.addInitScript(() => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
    localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], priceVersion: 2, found: { cow: 1 } })); } });
  await p.goto(URL); await p.waitForTimeout(1000);
  await p.click('#tabPilot'); await p.click('#rsOpen');
  await p.fill('#rsPw', 'guess'); await p.click('#rsList'); await p.waitForTimeout(800);
  check(/not right/.test(await p.textContent('#rsMsg')) && !(await p.$('[data-claim]')), `a wrong password lists nobody: ${await p.textContent('#rsMsg')}`);
  await p.fill('#rsPw', 'right-pass'); await p.click('#rsList'); await p.waitForTimeout(800);
  check(/Olly the Swift #74/.test(await p.textContent('#rsPilots')), `the right password lists the old pilot: ${await p.textContent('#rsPilots')}`);
  await p.click(`[data-claim="${OLD}"]`); await p.waitForTimeout(2500);
  const s = await p.evaluate(() => ({ save: JSON.parse(localStorage.getItem('contrailPilot.v2')), pilot: JSON.parse(localStorage.getItem('contrailPilot.pilot')) }));
  const lv = Object.values(s.save.levels || {}).reduce((a, n) => a + n, 0);
  check(s.save.bestDistance === 18000 && s.save.mission === 2 && s.save.laps === 1 && s.save.landings === 2 && s.save.flights === 3, `history copied exactly: ${JSON.stringify({ b: s.save.bestDistance, m: s.save.mission, l: s.save.laps, la: s.save.landings, f: s.save.flights })}`);
  check(lv >= 5 && s.save.planted.oak === 2 && s.save.badges.includes('roundTheWorld'), `upgrades bought from the rebuilt seeds, trees and badges: ${lv} levels ${JSON.stringify(s.save.levels)} ${JSON.stringify(s.save.planted)}`);
  check(s.pilot && s.pilot.first === 'Olly' && s.pilot.word === 'Swift' && s.pilot.tag === 74, `this device is now Olly the Swift 74: ${JSON.stringify(s.pilot)}`);
  check(s.save.muted === true && s.save.found && s.save.found.cow, 'settings and found animals are kept');
  check(calls.some(c => c[0] === 'claim' && c[1].pw === 'right-pass'), 'the claim was sent with the password');
  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS restore (${lv} upgrade levels rebuilt)`);
})();
