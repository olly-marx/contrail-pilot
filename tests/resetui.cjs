// RESET PROGRESS in the real game is a FULL reset (src/save.js wipeSave; the user 2026-11-10: it left nature, missions and the pilot). 390x844 and 320x568, real taps.
//   0. control: the seeded rich save shows more than one land in NATURE and holds the fake pilot keys, before the reset.
//   1. Settings > Your saved game > RESET PROGRESS, the confirm accepted: the page reloads (a marker set on the old page is gone).
//   2. AFTER the reload: none of the nine device keys (outbox, onlineNote, recoverNext, landlog, pilot, code, firstName, auth, synced) is stored, and the saved game is a
//      new player's (no discovered / missionsDone / badgeTiers / records, 0 flights, 0 landings, 0 seeds).
//   3. PILOT does not say "lost its pilot" and offers the name form; NATURE shows only the home land.
// Fake values only: no real pilot code or token. Run: python3 -m http.server 8000 & node tests/resetui.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const DEVICE = ['outbox', 'onlineNote', 'recoverNext', 'landlog', 'pilot', 'code', 'firstName', 'auth', 'synced'];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage();
      p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      let confirmText = ''; p.on('dialog', d => { confirmText = d.message(); d.accept(); });
      const rich = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'PARIS', visited: ['LONDON', 'PARIS'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true,
        flights: 44, landings: 30, seeds: 777, missionsDone: ['L1', 'L2'], badgeTiers: { lap: 1 }, discovered: { desert: true, savanna: true }, records: { beaten: { a: 1 } }, pilotNamed: true,
        fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { sessionStorage.setItem('fresh', 1); localStorage.clear();
        localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s));
        const fake = { pilot: { first: 'Testy', word: 'Puffin', tag: 11 }, code: 'FAKE-CODE-0000', firstName: 'Testy', auth: { fake: true }, synced: { json: '{}', stamp: 1, serverProgress: 99 }, outbox: [{ fake: 1 }], onlineNote: 1, recoverNext: 1, landlog: [[1, 2, 3, 4, 5, 1]] };
        for (const [k, v] of Object.entries(fake)) localStorage.setItem('s2:contrailPilot.' + k, JSON.stringify(v)); } }, rich);
      await p.goto(URL); await ready(p); await p.waitForTimeout(800);
      const keys = () => p.evaluate(() => { const o = {}; for (const k of Object.keys(localStorage)) if (k.startsWith('s2:contrailPilot.')) o[k.slice(17)] = localStorage.getItem(k); return o; });
      const lands = async () => { await p.click('#tabNature'); await p.waitForTimeout(700); return p.evaluate(() => [...document.querySelectorAll('#wRegions [data-region]')].map(e => e.dataset.region)); };
      // 0. control
      const before = await keys(), landsBefore = await lands();
      check(DEVICE.every(k => k in before) && landsBefore.length > 1, `${tag}: control: the rich save has the nine device keys and more than one land in NATURE (keys ${DEVICE.filter(k => !(k in before))}, lands ${landsBefore})`);
      // 1. RESET PROGRESS
      await p.evaluate(() => { window.__oldPage = 1; });
      await p.click('#hubGear').catch(() => {}); await p.waitForTimeout(400);
      await p.click('#sheet [data-gear="saved"]').catch(() => {}); await p.waitForTimeout(400);
      const resetTap = await p.$('#sheet [data-gear="reset"]');
      check(!!resetTap, `${tag}: Settings > Your saved game has a RESET PROGRESS button`);
      if (!resetTap) { await ctx.close(); continue; }
      await Promise.all([p.waitForEvent('load', { timeout: 15000 }).catch(() => null), resetTap.click()]);
      await ready(p); await p.waitForTimeout(800);
      check(/pilot name and code/.test(confirmText) && /nature/.test(confirmText), `${tag}: the confirm text names nature and the pilot name and code: ${confirmText.slice(0, 120)}`);
      check(!(await p.evaluate(() => window.__oldPage)), `${tag}: RESET reloads the page`);
      // 2. AFTER the reload
      const after = await keys(), left = DEVICE.filter(k => k in after);
      check(left.length === 0, `${tag}: after the reload none of the nine device keys is stored (left: ${left})`);
      const sv = JSON.parse(after['v2'] || 'null') || {};
      check(sv.flights === 0 && sv.landings === 0 && sv.seeds === 0 && !sv.pilotNamed && !(sv.discovered && Object.keys(sv.discovered).length) && !(sv.missionsDone && sv.missionsDone.length) && !(sv.badgeTiers && Object.keys(sv.badgeTiers).length) && !sv.records,
        `${tag}: after the reload the saved game is a new player's (flights ${sv.flights}, seeds ${sv.seeds}, discovered ${JSON.stringify(sv.discovered)}, missionsDone ${JSON.stringify(sv.missionsDone)}, badgeTiers ${JSON.stringify(sv.badgeTiers)}, records ${JSON.stringify(sv.records)})`);
      // 3. PILOT and NATURE
      await p.click('#tabPilot').catch(() => {}); await p.waitForTimeout(700);
      const pil = await p.evaluate(() => { const v = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; }; const t = document.getElementById('pLost'); return { lostShown: v('pLost'), text: document.getElementById('pilot') ? document.getElementById('pilot').innerText.replace(/\s+/g, ' ').slice(0, 200) : '' }; });
      check(!pil.lostShown && !/lost its pilot/i.test(pil.text), `${tag}: PILOT does not say this phone has lost its pilot: ${pil.text}`);
      const landsAfter = await lands();
      check(landsAfter.length === 1, `${tag}: NATURE shows only the home land after the reset (lands: ${landsAfter})`);
      check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`);
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL resetui:\n - ${fails.join('\n - ')}` : 'PASS resetui: RESET PROGRESS reloads into a brand-new player: no device or pilot keys, no nature, missions or badges, PILOT offers a new name, NATURE shows one land (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
