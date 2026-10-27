// A new deploy reaches a phone that still holds the old page in its cache (0.11.0). REAL Chrome with its HTTP cache
// on, against a small server that behaves like GitHub Pages: every file "keep for 10 minutes" and validated by ETag.
// It serves two stamped copies of the real game (the deploy's ?v=<commit> stamping, redone here), A then B.
//   1. a phone that comes back within 10 minutes runs the cached OLD page, finds the newer version.json and, on the
//      idle menu, updates by itself: no tap, the save kept;
//   2. a browser whose plain reload keeps returning the old page (304 on the validation): the one forced fresh load
//      (?u=<commit>, tidied away at once) gets the new page;
//   3. a page that can never update (the server keeps serving the old files): tries each way ONCE, then stops, so no
//      reload loop, and the banner is what is left.
// No page.route here (Playwright switches the HTTP cache OFF when one is set): Supabase is blocked in DNS instead.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/cache.cjs
const { chromium } = require('playwright-core');
require('./lib/shipped.js');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { ready } = require('./lib/ready.js');
const root = path.join(__dirname, '..');

const tmp = fs.mkdtempSync(path.join(os.homedir(), '.cp-cache-'));
function build(V) {   // what the deploy does: copy the site, stamp every script and style address with the commit
  const d = path.join(tmp, V); fs.mkdirSync(d);
  fs.copyFileSync(path.join(root, 'index.html'), path.join(d, 'index.html')); fs.copyFileSync(path.join(root, 'style.css'), path.join(d, 'style.css'));
  fs.cpSync(path.join(root, 'src'), path.join(d, 'src'), { recursive: true });
  for (const l of ['assets', 'vendor']) fs.symlinkSync(path.join(root, l), path.join(d, l));
  for (const f of fs.readdirSync(path.join(d, 'src')).filter(f => f.endsWith('.js'))) {
    const p = path.join(d, 'src', f); fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/(from '\.\/[A-Za-z]+\.js)'/g, `$1?v=${V}'`));
  }
  const h = path.join(d, 'index.html');
  fs.writeFileSync(h, fs.readFileSync(h, 'utf8').replace(/(src|href)="(src\/main\.js|style\.css|vendor\/[a-z.]+\.js)"/g, `$1="$2?v=${V}"`));
  fs.writeFileSync(path.join(d, 'version.json'), JSON.stringify({ commit: V, version: '0.0.0', changes: [{ id: 'x-' + V, level: 'minor', notes: ['n'] }] }));
}
build('AAAAAAA'); build('BBBBBBB');

const state = { current: 'AAAAAAA', mode: 'normal', hits: [] };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); let rel = u.pathname === '/' ? '/index.html' : u.pathname;
  const isIndex = u.pathname === '/', fresh = u.searchParams.has('u');
  let dir = state.current;
  if (state.mode === 'stuck' && u.pathname !== '/version.json') dir = 'AAAAAAA';   // the files never change; only version.json says B
  const file = path.join(tmp, dir, rel);
  const log = code => state.hits.push(`${req.method} ${u.pathname}${u.search} ${code}`);
  if (state.mode === 'ignoreReloads' && isIndex && !fresh && req.headers['if-none-match']) { log(304); res.writeHead(304, { ETag: req.headers['if-none-match'], 'Cache-Control': 'max-age=600' }); return res.end(); }   // a stale answer to the validation
  fs.readFile(file, (err, body) => {
    if (err) { log(404); res.writeHead(404); return res.end(); }
    const etag = '"' + crypto.createHash('sha1').update(body).digest('hex').slice(0, 12) + '"';
    const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' }[path.extname(file)] || 'application/octet-stream';
    if (req.headers['if-none-match'] === etag) { log(304); res.writeHead(304, { ETag: etag, 'Cache-Control': 'max-age=600' }); return res.end(); }
    log(200); res.writeHead(200, { 'Content-Type': type, ETag: etag, 'Cache-Control': 'max-age=600' }); res.end(body);
  });
});

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL = `http://127.0.0.1:${server.address().port}/`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--host-resolver-rules=MAP mkucbsjzbipjaiqzrlkj.supabase.co 127.0.0.1:1'] });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const stamp = p => p.evaluate(() => ((document.querySelector('script[src*="main.js"]') || {}).getAttribute('src') || '').match(/v=([A-Z]+)/)?.[1]).catch(() => null);
  const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };

  // One phone: opens the game (version A), leaves, a deploy lands (B), it comes back.
  async function phone(name, mode, body, query = '') {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => { try { if (!sessionStorage.getItem('s')) { sessionStorage.setItem('s', '1'); localStorage.clear();   // (about:blank has no storage: the try)
      localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], landings: 9 })); } } catch (e) { /* no storage here */ } });
    state.current = 'AAAAAAA'; state.mode = 'normal'; state.hits = [];
    await p.goto(URL + query); await ready(p); await p.waitForTimeout(1200);
    check(await stamp(p) === 'AAAAAAA', `${name}: the first visit runs A`);
    await p.goto('about:blank');   // closed the app: coming back is a normal visit, not a reload
    state.current = 'BBBBBBB'; state.mode = mode; state.hits = [];
    await p.goto(URL + query);
    try { await body(p, errs); } catch (e) { fails.push(`${name}: threw ${e.message.split('\n')[0]}`); }
    check(errs.length === 0, `${name}: page errors ${errs.join(' | ')}`);
    await ctx.close();
  }

  // 1. Cached old page -> new page with no tap.
  await phone('1 plain', 'normal', async p => {
    const gotB = await until(async () => await stamp(p) === 'BBBBBBB', 15000);
    check(gotB, `1: the phone should update by itself (it runs ${await stamp(p)}; server saw ${JSON.stringify(state.hits.filter(h => /^GET \/ /.test(h)))})`);
    await ready(p);
    check(await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')).landings) === 9, '1: the save is kept (landings 9)');
    check(state.hits.filter(h => /^GET \/ 200/.test(h)).length === 1, `1: one fresh page fetched: ${JSON.stringify(state.hits.filter(h => /^GET \/ /.test(h)))}`);
  });

  // 2. The plain reload comes back old (the validation answers "not modified"): the fresh load saves it.
  await phone('2 stale reload', 'ignoreReloads', async p => {
    const gotB = await until(async () => await stamp(p) === 'BBBBBBB', 20000);
    check(gotB, `2: the forced fresh load should reach B (it runs ${await stamp(p)}; ${JSON.stringify(state.hits.filter(h => /^GET \/\??u?/.test(h)))})`);
    check(state.hits.some(h => /^GET \/\?keep=1&u=BBBBBBB 200/.test(h)), `2: the fresh address was used: ${JSON.stringify(state.hits.filter(h => /^GET \/(\?| )/.test(h)))}`);
    await p.waitForTimeout(500);
    check(await p.evaluate(() => location.search) === '?keep=1', `2: the ?u= is tidied away and the other parameter stays: ${await p.evaluate(() => location.search)}`);
  }, '?keep=1');

  // 3. A page that can never update: each way tried ONCE, then it stops; the banner is left.
  await phone('3 stuck', 'stuck', async p => {
    await p.waitForTimeout(14000);
    const pages = () => state.hits.filter(h => /^GET \/(\?u=[A-Za-z]+)? /.test(h)).length;
    const n1 = pages(); await p.waitForTimeout(8000); const n2 = pages();
    check(n2 === n1 && n1 <= 2, `3: the loop guard: at most two automatic reloads, then none (${n1} then ${n2}: ${JSON.stringify(state.hits.filter(h => /^GET \/(\?| )/.test(h)))})`);
    check(await stamp(p) === 'AAAAAAA', '3: still the old page (the server never changes it)');
    check(await until(() => p.evaluate(() => !!document.getElementById('upBanner')).catch(() => false), 8000), '3: the banner is what is left');
  });

  await b.close(); server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS cache');
})();
