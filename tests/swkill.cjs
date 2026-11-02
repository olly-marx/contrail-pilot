// The service worker's KILL SWITCH and its absence on a local page (0.25.0): a bad worker must always be undoable, and a local/test page must never get one.
//   1. `"sw": false` in version.json (the deploy writes it when the file SW-OFF exists): the next visit unregisters every worker and deletes every cp-* cache.
//   2. `?nosw=1` on the address does the same.
//   3. The UNSTAMPED game (the repo as served for every test, no ?v build stamp) registers nothing.
// PLANTS: tools/plants.tsv, test `swkill` (each must FAIL this test). Run: node tests/swkill.cjs
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const { buildSite, host, repo } = require('./lib/sitehost.js');
const { ready, CHROME, ARGS, prepare, swMessage, cacheNames } = require('./lib/swpage.js');

(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const on = buildSite('aaaaaaa');
  const off = buildSite('bbbbbbb', d => { const f = path.join(d, 'version.json'); const v = JSON.parse(fs.readFileSync(f, 'utf8')); v.sw = false; fs.writeFileSync(f, JSON.stringify(v)); });
  const h = await host(on);
  const b = await chromium.launch({ executablePath: CHROME, args: ARGS });
  const regs = p => p.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  const cps = async p => (await cacheNames(p)).filter(k => k.startsWith('cp-'));
  // (polled with evaluate: waitForFunction with an async predicate treats the pending Promise as true at once, so it could never fail)
  const gone = async (p, label) => {
    let state = null;
    for (let i = 0; i < 40; i++) {
      state = await p.evaluate(async () => ({ regs: (await navigator.serviceWorker.getRegistrations()).length, cps: (await caches.keys()).filter(k => k.startsWith('cp-')) })).catch(() => null);
      if (state && state.regs === 0 && !state.cps.length) return;
      await p.waitForTimeout(400);
    }
    check(false, `${label}: the worker or its caches are still there (${JSON.stringify(state)})`);
  };
  const fresh = async () => { const ctx = await b.newContext({ viewport: { width: 375, height: 667 } }); await prepare(ctx); return { ctx, p: await ctx.newPage() }; };

  // install a worker on the good site (used by 1 and 2)
  const install = async p => { await p.goto(h.url); await ready(p); await swMessage(p, 'filled', 'aaaaaaa', 90000).catch(() => check(false, 'the worker never filled on the good site')); };

  // 1. version.json says "sw": false
  let { ctx, p } = await fresh(); h.setRoot(on);
  await install(p); check(await regs(p) === 1 && (await cps(p)).length >= 1, '1: a worker and its cache exist before the switch');
  h.setRoot(off); await p.goto(h.url); await ready(p).catch(() => {}); await gone(p, '1 (version.json sw:false)');
  await ctx.close();

  // 2. ?nosw=1
  ({ ctx, p } = await fresh()); h.setRoot(on);
  await install(p); check(await regs(p) === 1, '2: a worker exists before ?nosw=1');
  await p.goto(h.url + '?nosw=1'); await ready(p).catch(() => {}); await gone(p, '2 (?nosw=1)');
  await ctx.close();

  // 3. the unstamped game registers nothing
  const local = await host(repo, { port: 0 });
  ({ ctx, p } = await fresh());
  await p.goto(local.url); await ready(p); await p.waitForTimeout(3000);
  check(!local.hits['sw.js'], `3: an unstamped page never even asks for sw.js (${local.hits['sw.js'] || 0} requests)`);
  check(await regs(p) === 0, `3: an unstamped page has no service worker (${await regs(p)})`);
  check((await cps(p)).length === 0, '3: an unstamped page has no cp-* cache');
  await ctx.close(); await b.close(); h.close(); local.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS swkill (version.json "sw": false and ?nosw=1 each remove the worker and its caches; an unstamped page registers nothing)');
})().catch(e => { console.log('FAIL\n- crashed: ' + e.message.split('\n')[0]); process.exit(1); });
