// Online save + pilot codes (src/online.js, migration 20261022150000_online_save.sql), against a
// FAKE Supabase that remembers state, with two "devices" (browser contexts) sharing it:
// a named pilot's changed save is uploaded; its pilot code shows on PILOT; on a second device,
// "I already have a pilot" refuses a wrong code and brings back name + progress with the right
// one; on opening, a newer online save wins but this device's unsent changes go up instead;
// a device that never synced keeps whichever save has more progress.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/onlinesave.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  // ---- the fake Supabase: one pilot, Kim the Comet 42, shared by every device ----
  const db = { code: null, save: null, stamp: 0, tries: 0 };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const device = async (seed, uid) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(String(e)));
    p.on('dialog', d => d.accept());
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async route => {
      const r = route.request(), u = new globalThis.URL(r.url()), m = r.method();
      if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (u.pathname === '/auth/v1/signup') return json(route, 200, { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: uid, exp: 9999999999 })).toString('base64') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: uid, aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
      const body = r.postDataJSON() || {}, rpc = u.pathname.replace('/rest/v1/rpc/', '');
      if (rpc === 'my_player') return json(route, 200, 'kim');
      if (rpc === 'has_pilot_code') return json(route, 200, !!db.code);
      if (rpc === 'set_pilot_code') { db.code = body.code.toLowerCase(); return json(route, 200, null); }
      if (rpc === 'put_save') { const keep = body.stamp > db.stamp; if (keep) { db.save = body.save; db.stamp = body.stamp; } return json(route, 200, keep); }
      if (rpc === 'get_save') return json(route, 200, db.save ? [{ save: db.save, stamp: db.stamp }] : []);
      if (rpc === 'pilot_login') {
        if (!(body.first.toLowerCase() === 'kim' && body.word === 'Comet' && body.tag === 42)) return json(route, 200, [{ ok: false, why: 'no such pilot' }]);
        if (body.code.toLowerCase() !== db.code) { db.tries++; return json(route, 200, [{ ok: false, why: 'wrong code' }]); }
        return json(route, 200, [{ ok: true, why: null, save: db.save, stamp: db.stamp }]);
      }
      if (u.pathname.startsWith('/rest/v1/')) return json(route, 200, []);
      return json(route, 404, { message: 'not faked' });
    });
    await p.addInitScript(([k, s]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear();
      if (s.save) localStorage.setItem(k, JSON.stringify(s.save)); if (s.pilot) localStorage.setItem('contrailPilot.pilot', JSON.stringify(s.pilot));
      if (s.synced) localStorage.setItem('contrailPilot.synced', JSON.stringify(s.synced)); } }, [KEY, seed]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    return p;
  };
  const kim = { first: 'Kim', word: 'Comet', tag: 42 };
  const base = { tutorialDone: true, muted: true, seenTips: ['*'], priceVersion: 2, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };   // a save from after the eras reset (src/fleet.js)
  const save = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);

  // 1. The phone: named pilot, progress; it uploads, and shows a pilot code.
  const phone = await device({ save: { ...base, seeds: 500, landings: 7, mission: 4, levels: { trees: 2 } }, pilot: kim }, 'phone-1');
  await p_sync(phone);
  check(db.save && db.save.seeds === 500 && db.stamp > 0, `the phone's save is uploaded: ${JSON.stringify(db.save && db.save.seeds)}`);
  await phone.click('#tabPilot'); await phone.waitForTimeout(1200);
  const code = await phone.textContent('#pCode');
  check(/^([A-Z][a-z]+ ){4}\d{2}$/.test(code) && db.code === code.toLowerCase(), `a pilot code (4 words + a number) is shown and set: "${code}"`);
  check(await phone.isVisible('#pCodeBox') && /Write this down/.test(await phone.textContent('#pCodeBox')), 'it says to write it down');

  // 2. The laptop (empty): wrong code refused; the right code brings Kim back with the progress.
  const laptop = await device({ save: { ...base } }, 'laptop-1');
  await laptop.click('#tabPilot'); await laptop.click('#pHave');
  await laptop.fill('#lFirst', 'kim'); await laptop.selectOption('#lWord', 'Comet'); await laptop.fill('#lTag', '42');
  await laptop.fill('#lCode', 'puffin puffin puffin puffin 11'); await laptop.click('#lGo'); await laptop.waitForTimeout(800);
  check(/not right/.test(await laptop.textContent('#lMsg')) && db.tries === 1, `a wrong code is refused: ${await laptop.textContent('#lMsg')}`);
  await laptop.fill('#lCode', code); await laptop.click('#lGo'); await laptop.waitForTimeout(3000); await ready(laptop);
  let ls = await save(laptop);
  check(ls.seeds === 500 && ls.mission === 4 && ls.levels.trees === 2, `the right code brings the progress: ${JSON.stringify({ seeds: ls.seeds, m: ls.mission })}`);
  check((await laptop.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.pilot')))).first === 'Kim', 'and the pilot name');

  // 3. The laptop plays on (seeds 800) and uploads; the phone, opened again, takes the newer save.
  await laptop.evaluate(() => { game.registry.get('save').seeds = 800; });
  await p_sync(laptop);
  check(db.save.seeds === 800, `the laptop's newer progress is uploaded: ${db.save.seeds}`);
  await phone.reload(); await ready(phone); await phone.waitForTimeout(3000); await ready(phone);
  check((await save(phone)).seeds === 800, `the phone, reopened, takes the newer online save: ${(await save(phone)).seeds}`);

  // 4. Unsent changes on this device win: the phone changes (seeds 900) while offline from the
  // server's view, then opens again: its change goes UP instead of being replaced.
  await phone.evaluate(k => { const s = JSON.parse(localStorage.getItem(k)); s.seeds = 900; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  db.stamp += 0; await phone.reload(); await ready(phone); await phone.waitForTimeout(2500);
  check((await save(phone)).seeds === 900 && db.save.seeds === 900, `unsent changes are kept and uploaded: phone ${(await save(phone)).seeds}, online ${db.save.seeds}`);

  // 5. First contact: a device that never synced but has MORE progress keeps its own.
  const old = await device({ save: { ...base, seeds: 50, landings: 40, mission: 15, levels: { trees: 4, soil: 3, species: 3 } }, pilot: kim }, 'tablet-1');
  await old.waitForTimeout(1500);
  check((await save(old)).landings === 40 && db.save.landings === 40, `a never-synced device with more progress keeps it (and uploads it): ${(await save(old)).landings}, online ${db.save.landings}`);

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS onlinesave');

  async function p_sync(p) { await p.evaluate(async () => { const o = await import('./src/online.js'); await o.syncUp(game.registry.get('save')); }); }
})();
