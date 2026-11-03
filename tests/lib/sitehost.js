// Hosts REAL built sites for the service-worker tests (tests/sw*.cjs): tools/make-site.sh (the very script the deploy runs) builds each one into a temp dir,
// and a small server stands in for GitHub Pages. The root can be swapped under a running page (a new deploy), index.html can be held back, and every request is counted.
// Cache-Control is `no-store` on purpose: only the service worker's own cache may serve a file, never the browser's HTTP cache (Pages' max-age=600 would hide a missing precache).
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const repo = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

// A built site in a temp dir. mutate(dir) may change files (a redrawn picture, say); the manifest is rebuilt afterwards so it describes what is there.
function buildSite(build, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `site-${build}-`));
  const r = spawnSync(path.join(repo, 'tools/make-site.sh'), [dir, build], { cwd: repo, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`make-site.sh failed: ${r.stderr || r.stdout}`);
  if (mutate) { mutate(dir); const m = spawnSync('python3', [path.join(repo, 'tools/make-sw-manifest.py'), dir, build], { cwd: repo, encoding: 'utf8' }); if (m.status !== 0) throw new Error(m.stderr); }
  return dir;
}

function host(root, { port = 0, base = '/' } = {}) {
  const state = { root, hits: {}, holdIndex: 0, log: [] };
  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
    if (!p.startsWith(base)) { res.writeHead(404); return res.end(); }
    p = p.slice(base.length) || 'index.html';
    state.hits[p] = (state.hits[p] || 0) + 1; state.log.push(p);
    if (p === 'index.html' && state.holdIndex > 0) { state.holdIndex--; await new Promise(r => setTimeout(r, state.holdMs || 5000)); }
    const f = path.join(state.root, p);
    if (!f.startsWith(state.root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => server.listen(port, '127.0.0.1', () => ok(Object.assign(state, {
    url: `http://localhost:${server.address().port}${base}`, close: () => server.close(),
    setRoot(r) { state.root = r; }, hold(n, ms) { state.holdIndex = n; state.holdMs = ms; }, reset() { state.hits = {}; state.log = []; },
  }))));
}
module.exports = { buildSite, host, repo };
