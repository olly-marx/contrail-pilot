// A taken pilot name gets a new number (src/online.js savePilot; migration 20261119020000_names_and_login.sql adds
// players_name_unique). Against a FAKE Supabase: the first `clash` inserts of a name are refused with Postgres 23505 on
// players_name_unique, then one goes in. Control first: no clash keeps the chosen number. PLANT=always: every insert
// clashes, and savePilot must answer why 'taken' (not 'offline', not ok).
// Run: python3 -m http.server 8000 & node tests/nametaken.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const json = (route, status, body) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const run = async clash => {
    const ctx = await b.newContext(), p = await ctx.newPage(), seen = [];
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', async route => {
      const r = route.request(), u = new globalThis.URL(r.url()), m = r.method();
      if (m === 'OPTIONS') return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
      if (u.pathname === '/auth/v1/signup') return json(route, 200, { access_token: 'x.' + Buffer.from(JSON.stringify({ sub: 'u1', exp: 9999999999 })).toString('base64') + '.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: { id: 'u1', aud: 'authenticated', role: 'authenticated', is_anonymous: true } });
      if (u.pathname === '/rest/v1/rpc/my_player') return json(route, 200, null);
      if (u.pathname === '/rest/v1/players' && m === 'PATCH') return json(route, 200, []);   // no row yet: the game inserts
      if (u.pathname === '/rest/v1/players' && m === 'POST') {
        const row = r.postDataJSON(); seen.push(row.tag);
        if (clash === 'always' || seen.length <= clash) return json(route, 409, { code: '23505', message: 'duplicate key value violates unique constraint "players_name_unique"', details: null, hint: null });
        return route.fulfill({ status: 201, body: '' });
      }
      return json(route, 200, []);
    });
    await p.goto(URL + '?preview=0');
    const res = await p.evaluate(async () => { const m = await import('/src/online.js'); return m.savePilot({ first: 'Kim', word: 'Comet', tag: 42 }); });
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.pilot') || 'null'));
    await ctx.close();
    return { res, stored, seen };
  };
  const a = await run(0);
  check(a.res.ok && a.res.tag === 42 && a.seen.length === 1 && a.stored && a.stored.tag === 42, `control: no clash keeps 42 (${JSON.stringify(a)})`);
  {
    const c = await run(2);
    check(c.res.ok && c.seen.length === 3 && c.seen[0] === 42 && c.res.tag === c.seen[2] && c.stored && c.stored.tag === c.res.tag, `two clashes: the third number is kept and stored (${JSON.stringify(c)})`);
    const z = await run('always');
    check(!z.res.ok && z.res.why === 'taken' && z.seen.length === 8 && !z.stored, `every number taken: why 'taken' after 8 tries, nothing stored (${JSON.stringify(z)})`);
  }
  await b.close();
  if (fails.length) { console.log('FAIL nametaken:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS nametaken: a taken name gets a new number (control: 42 kept; 2 clashes -> the 3rd number; all taken -> why taken)');
})();
