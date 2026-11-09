// A static server for the repo root that answers like GitHub Pages does for the picture/code files: Last-Modified, ETag, `Cache-Control: max-age=600`,
// and 304 on a matching If-None-Match. WHY (2026-11-09): `python3 -m http.server` sends Last-Modified and NO Cache-Control, so a browser uses HEURISTIC freshness
// (10% of the file's age). In a fresh checkout every file is seconds old, a picture the loader fetched is stale almost at once and the <img> that shows it later
// REVALIDATES over the network: tests/preloadgate.cjs then counted 37 + 8 tap-time fetches that no real player ever makes (Pages sends max-age=600).
// Measured: touching every file under assets/ flipped that test from PASS to FAIL on a cold 2-core run. Only tests that are ABOUT the browser cache need this.
const http = require('http'), fs = require('fs'), path = require('path');
const repo = path.resolve(__dirname, '../..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml' };

// opts.maxAge: seconds (default 600, what Pages sends); opts.header: false leaves Cache-Control out (the plants use it to show what the old server did).
function serve({ root = repo, maxAge = 600 } = {}) {
  const hits = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname).replace(/^\/+/, '') || 'index.html';
    const f = path.join(root, p);
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    const st = fs.statSync(f), etag = `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    hits.push(p);
    const h = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Last-Modified': st.mtime.toUTCString(), ETag: etag };
    if (maxAge !== null) h['Cache-Control'] = `max-age=${maxAge}`;
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); return res.end(); }
    res.writeHead(200, { ...h, 'Content-Length': st.size });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => server.listen(0, '127.0.0.1', () => ok({ url: `http://localhost:${server.address().port}/`, hits, close: () => new Promise(r => server.close(r)) })));
}
module.exports = { serve, repo };
