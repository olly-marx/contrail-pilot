// The 2026-10-21 price change (src/reprice.js): an old save is re-valued once, at full value
// (bank + what it paid at the old prices), and its plane rebuilt at the new prices from levels it
// already had, branches kept valid, fuel still owned; a kid-friendly message shows once.
// Saves already on the new prices, saves with nothing bought, and no save at all are left alone.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/reprice.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const errs = [], fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); if (v) localStorage.setItem(k, JSON.stringify(v)); } }, [KEY, save]);
    await p.goto(URL); await p.waitForTimeout(1200);
    return p;
  };
  const get = p => p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  const all = { radar: 4, fuel: 4, engine: 5, cabin: 4, trees: 4, soil: 3, species: 4, rewild: 6, magnet: 3, airframe: 3, wings: 2, gear: 2, hold: 3, lens: 2, forecast: 2, nursery: 2 };
  const old = { tutorialDone: true, muted: true, seenTips: [], tours: ['name', 'hangar'], flights: 60, landings: 30, mission: 12, badges: ['zeroCarbon', 'roundTheWorld'], laps: 1, bestDistance: 17000,
    seeds: 120, crystals: 10, fuel: 'hydrogen', levels: all };

  // 1. A fully bought old save.
  let p = await open(old);
  let s = await get(p);
  const { LINES } = await p.evaluate(async () => ({ LINES: (await import('./src/upgrades.js')).LINES.map(l => ({ id: l.id, requires: l.requires, costs: l.levels.map(v => [v.cost, v.crystals]) })) }));
  const { OLD_PRICES } = await p.evaluate(async () => ({ OLD_PRICES: (await import('./src/reprice.js')).OLD_PRICES }));
  // (rewilding became habitat projects, kept as they are: not part of the worth)
  let worth = [old.seeds, old.crystals]; for (const [id, n] of Object.entries(all)) for (let i = 0; i < n && id !== 'rewild'; i++) { worth[0] += OLD_PRICES[id][i][0]; worth[1] += OLD_PRICES[id][i][1]; }
  let spent = [0, 0]; for (const [id, n] of Object.entries(s.levels)) for (let i = 0; i < n; i++) { const c = LINES.find(l => l.id === id).costs[i]; spent[0] += c[0]; spent[1] += c[1]; }
  check(s.priceVersion === 2 && s.repriced, 'the old save is re-valued');
  check(JSON.stringify((s.habitat || {}).woodland) === JSON.stringify(['meadow', 'hedgerow', 'pond', 'voles', 'beavers', 'storks']) && !('rewild' in s.levels), `old rewilding (6 levels) became the same 6 habitat projects: ${JSON.stringify(s.habitat)}`);
  check(spent[0] + s.seeds === worth[0] && spent[1] + s.crystals === worth[1], `full value: new cost of kept levels + bank = old worth: ${spent} + ${s.seeds}/${s.crystals} vs ${worth}`);
  check(Object.entries(s.levels).every(([id, n]) => n <= (all[id] || 0)), `never more than it had: ${JSON.stringify(s.levels)}`);
  check(Object.entries(s.levels).every(([id, n]) => { const l = LINES.find(x => x.id === id); return !n || !l.requires || (s.levels[l.requires.line] || 0) >= l.requires.level; }), `branches stay valid: ${JSON.stringify(s.levels)}`);
  check((s.levels.fuel || 0) < 4 && s.fuel !== 'hydrogen', `hydrogen (1,800 now) is gone and the fuel is one it still owns: fuel ${s.levels.fuel}, ${s.fuel}`);
  const cheapest = LINES.flatMap(l => (s.levels[l.id] || 0) < all[l.id] && (!l.requires || (s.levels[l.requires.line] || 0) >= l.requires.level) ? [l.costs[s.levels[l.id] || 0]] : []);
  check(cheapest.every(([c, cr]) => c > s.seeds || cr > s.crystals), `nothing it had is still affordable from the bank: bank ${s.seeds}/${s.crystals}`);
  check(s.mission === 12 && s.laps === 1 && s.bestDistance === 17000 && s.badges.includes('roundTheWorld') && s.flights === 60, 'missions, laps, records, badges stay');
  const msg = await p.textContent('#repriced');
  check(await p.isVisible('#repriced') && /New hangar prices/.test(msg) && new RegExp(`${worth[0]} seeds`).test(msg) && /Cleaner Fuel/.test(msg), `the message shows, with the worth and what to save up for: ${msg}`);
  check(await p.evaluate(() => document.getElementById('tour').hidden), 'no tour on top of the message');
  await p.screenshot({ path: '/tmp/repriced.png' });
  await p.click('#rpOk'); await p.waitForTimeout(400);
  check(!(await p.isVisible('#repriced')), 'OK closes it');
  const kept = JSON.stringify((await get(p)).levels);
  await p.reload(); await p.waitForTimeout(1200);
  check(!(await p.isVisible('#repriced')) && JSON.stringify((await get(p)).levels) === kept, 'once only: no message and no second re-value after a reload');
  await p.close();

  // 2. Left alone: a save already on the new prices, one with nothing bought, and no save.
  p = await open({ ...old, priceVersion: 2 });
  const { rewild, ...noRewild } = all, ns = await get(p);
  check(JSON.stringify(ns.levels) === JSON.stringify(noRewild) && ns.habitat.woodland.length === 6 && !(await p.isVisible('#repriced')), `a new-price save is not re-valued (its rewilding still becomes projects): ${JSON.stringify(ns.levels)}`);
  await p.close();
  p = await open({ ...old, levels: {}, seeds: 40 });
  s = await get(p);
  check(s.seeds === 40 && !s.repriced && !(await p.isVisible('#repriced')), `nothing bought: nothing changes: ${s.seeds}`);
  await p.close();
  p = await open(null);
  check(!(await p.isVisible('#repriced')), 'no save: no message');
  await p.close();

  check(errs.length === 0, `page errors: ${errs.join(' | ')}`);
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS reprice (worth ${worth[0]} seeds, kept ${Object.values(JSON.parse(kept)).reduce((a, n) => a + n, 0)} of 53 levels)`);
})();
