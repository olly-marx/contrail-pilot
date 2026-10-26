// The /preview/ build (tools/build-preview.sh, deploy.yml job preview-bundle): the redesign served under /preview/ of
// the SAME origin as the live game. Self-contained: the "redesign" is this checkout plus a small season2.js that
// follows the contract (REDESIGN=<dir> uses a real redesign checkout instead). The site is assembled like deploy.yml.
// Checks: forced season 2 on, offline (no request to Supabase), every key under s2:, the origin-wide flag never
// written, noindex, a PREVIEW tag, the preview's own version.json (an update check at /preview/ never looks at the
// live build's), and the live game at / unchanged by a visit to /preview/ (same keys, not season 2).
// PLANT=leak makes the stub season2.js write the origin-wide flag: the run must then FAIL.
// Run: node tests/preview.cjs   (needs: npm i --no-save playwright-core; a Chrome)
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { ready } = require('./lib/ready.js');
const ROOT = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.homedir(), '.cp-preview-'));   // (under ~, like worktrees: not /tmp)
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: 'pipe' }).toString();
const copy = (from, to, names) => { fs.mkdirSync(to, { recursive: true }); for (const n of names) fs.cpSync(path.join(from, n), path.join(to, n), { recursive: true }); };
const STUB = `(function () {
  if (window.SEASON2_FORCE !== true) return;
  const real = window.localStorage, P = 's2:';
  ${process.env.PLANT === 'leak' ? "real.setItem('contrailPilot.season2Mode', '1');" : ''}
  const store = { getItem: k => real.getItem(P + k), setItem: (k, v) => real.setItem(P + k, String(v)), removeItem: k => real.removeItem(P + k), clear() {}, key: () => null, length: 0 };
  Object.defineProperty(window, 'localStorage', { configurable: true, get: () => store });
  const f = window.fetch.bind(window);
  window.fetch = (u, ...a) => (/supabase\\.co/.test(String((u && u.url) || u)) ? Promise.reject(new TypeError('preview: offline')) : f(u, ...a));
  window.SEASON2 = true; window.__CP_NO_ONLINE = true;
})();`;

(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  // 1. the "redesign" checkout and the live bundle (stamped like deploy.yml, so updates.js checks run)
  const red = process.env.REDESIGN || path.join(tmp, 'redesign');
  if (!process.env.REDESIGN) {
    copy(ROOT, red, ['index.html', 'style.css', 'src', 'assets', 'vendor']);
    fs.writeFileSync(path.join(red, 'src/season2.js'), STUB);
    fs.writeFileSync(path.join(red, 'index.html'), fs.readFileSync(path.join(red, 'index.html'), 'utf8').replace('<script src="vendor/phaser.min.js">', '<script src="src/season2.js"></script>\n  <script src="vendor/phaser.min.js">'));
  }
  const site = path.join(tmp, 'site');
  copy(ROOT, site, ['index.html', 'style.css', 'src', 'assets', 'vendor']);
  const V = 'live000';
  sh('sed', ['-i', '-E', `s#(from '\\./[A-Za-z0-9]+\\.js)'#\\1?v=${V}'#g`, ...fs.readdirSync(path.join(site, 'src')).filter(f => f.endsWith('.js')).map(f => path.join(site, 'src', f))]);
  sh('sed', ['-i', '-E', `s#(src|href)="(src/main\\.js|src/newplayer\\.js|style\\.css|vendor/[a-z.]+\\.js)"#\\1="\\2?v=${V}"#g`, path.join(site, 'index.html')]);
  fs.writeFileSync(path.join(site, 'version.json'), JSON.stringify({ commit: V, changes: [] }));
  const PV = 'prev111';
  sh('bash', [path.join(ROOT, 'tools/build-preview.sh'), red, path.join(site, 'preview'), PV]);
  // 2. serve it, and count what the pages ask for
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let f = path.join(site, decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f));
  }).listen(0);
  const base = `http://localhost:${srv.address().port}`;
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });   // ONE context: one origin, one storage, like a phone
  const seen = [], errs = [];
  ctx.on('request', r => seen.push(new URL(r.url())));
  const keys = p => p.evaluate(() => Object.keys(localStorage).sort());
  const rawKeys = p => p.evaluate(() => { const ks = []; for (let i = 0; i < window.localStorage.length; i++) ks.push(window.localStorage.key(i)); return ks.sort(); });
  const seed = { tutorialDone: true, muted: true, seenTips: ['*'], priceVersion: 2 };
  // 3. the live game first: its keys are the baseline
  const live = await ctx.newPage(); live.on('pageerror', e => errs.push('live: ' + e));
  await live.addInitScript(s => { if (!localStorage.getItem('contrailPilot.v2')) localStorage.setItem('contrailPilot.v2', JSON.stringify(s)); }, seed);
  await live.goto(base + '/'); await ready(live); await live.waitForTimeout(1500);
  check(await live.evaluate(() => !window.SEASON2), 'the live game must not be season 2');
  const liveKeys = await rawKeys(live), liveSave = await live.evaluate(() => localStorage.getItem('contrailPilot.v2'));
  // 4. the preview, in the same browser
  for (const q of ['', '?season2=off', '?season2=reset']) {
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push('preview: ' + e));
    await p.goto(`${base}/preview/${q}`); await ready(p); await p.waitForTimeout(1500);
    const st = await p.evaluate(() => ({ s2: window.SEASON2 === true, offline: window.__CP_NO_ONLINE === true, tag: (document.getElementById('previewTag') || {}).textContent || '',
      noindex: !!document.querySelector('meta[name=robots][content*=noindex]'), title: document.title }));
    check(st.s2 && st.offline, `/preview/${q}: season 2 forced on and offline: ${JSON.stringify(st)}`);
    check(/^PREVIEW prev111/.test(st.tag), `/preview/${q}: visible PREVIEW tag: "${st.tag}"`);
    check(st.noindex && /^PREVIEW/.test(st.title), `/preview/${q}: noindex and a PREVIEW title`);
    await p.close();
  }
  const after = await rawKeys(live);
  const added = after.filter(k => !liveKeys.includes(k));
  check(added.length > 0 && added.every(k => k.startsWith('s2:')), `the preview wrote only s2: keys, got: ${JSON.stringify(added)}`);
  check(!after.includes('contrailPilot.season2Mode'), 'the origin-wide season 2 flag must never be written by the preview');
  check(await live.evaluate(() => localStorage.getItem('contrailPilot.v2')) === liveSave, 'the live save must be untouched by visiting the preview');
  // 5. nothing went to the database; the version checks stayed in their own folder
  check(!seen.some(u => /supabase\.co/.test(u.hostname)), 'no request to Supabase from the preview');
  const vj = seen.filter(u => u.pathname.endsWith('version.json')).map(u => u.pathname);
  check(vj.includes('/preview/version.json') && vj.includes('/version.json'), `both builds check their own version.json: ${JSON.stringify([...new Set(vj)])}`);
  check(!errs.length, 'page errors: ' + errs.join(' | '));
  // 6. the live game still loads on its own after all that
  await live.reload(); await ready(live);
  check(await live.evaluate(() => !window.SEASON2), 'the live game after the preview visit is still not season 2');
  await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  if (fails.length) { console.log('FAIL preview:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('OK preview: forced season 2, offline, s2: only, tagged, noindex, own version.json; live game untouched');
})().catch(e => { console.log('FAIL preview:', e); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {} process.exit(1); });
