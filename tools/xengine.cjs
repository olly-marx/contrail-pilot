// Runs tools/xengine.mjs in Node and in Playwright's chromium, webkit and firefox (whichever are installed) and compares.
// PLANT=1 nudges one number in the browser runs only, to show the comparison can fail.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const pw = require('playwright-core');
const types = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.html': 'text/html' };
(async () => {
  const { runAll } = await import('./xengine.mjs');
  let t0 = Date.now(); const ref = runAll(); console.log(`node: ${Object.keys(ref).length} flights in ${Date.now() - t0} ms`);
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
    if (q.url === '/') { r.setHeader('content-type', 'text/html'); return r.end('<!doctype html><title>x</title>'); }
    fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise(ok => srv.listen(0, ok)); const url = `http://127.0.0.1:${srv.address().port}/`;
  let bad = 0;
  for (const name of ['chromium', 'webkit', 'firefox']) {
    let b; try { b = await pw[name].launch(name === 'chromium' ? { executablePath: '/usr/bin/google-chrome' } : {}); } catch (e) { console.log(`${name}: not installed (${e.message.split('\n')[0].slice(0, 60)})`); continue; }
    const p = await b.newPage(); await p.goto(url);
    t0 = Date.now();
    const got = await p.evaluate(async plant => (await import('/tools/xengine.mjs')).runAll({ plant }), !!process.env.PLANT);
    const ms = Date.now() - t0, keys = Object.keys(ref);
    const diffs = keys.filter(k => JSON.stringify(ref[k].chain) !== JSON.stringify(got[k] && got[k].chain));
    const first = k => { const a = ref[k].chain, g = got[k].chain; const i = a.findIndex((v, j) => v !== g[j]); return `${k}: first differs near step ${(i + 1) * 50}; km ${ref[k].km} vs ${got[k].km}, heat ${ref[k].heat} vs ${got[k].heat}`; };
    console.log(`${name}: ${keys.length - diffs.length}/${keys.length} flights identical to node (${ms} ms)`);
    diffs.slice(0, 6).forEach(k => console.log('   ', first(k)));
    bad += diffs.length; await b.close();
  }
  srv.close(); process.exit(bad ? 1 : 0);
})();
