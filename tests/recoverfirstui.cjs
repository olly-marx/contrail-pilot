// THE PILOT TAB ON A PHONE THAT LOST ITS PILOT (src/pilot.js showPilot, src/recoverfirst.js). 390x844, real taps. A seeded season 2 save with pilotNamed true and NO stored pilot:
//   the PILOT tab opens on 'bring back my pilot' (the lost-pilot lines, the login form with the first name filled from the last known name), the new-name form is NOT shown; tapping 'make a new pilot instead' shows
//   the new-name form. Control: a save that never named a pilot opens the new-name form at once, with no lost-pilot lines.
// Plants: tools/plants.tsv, test `recoverfirstui`. Run: python3 -m http.server 8000 & node tests/recoverfirstui.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const seed = named => ({ areas: ['weurope'], homeArea: 'weurope', homeCity: 'AMSTERDAM', city: 'AMSTERDAM', visited: ['AMSTERDAM'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true,
  freeProjectGiven: true, freeUpgrade: false, landings: 12, flights: 20, seeds: 0, crystals: 0, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], pilotNamed: named, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], log = [], check = (c, m) => { if (!c) fails.push(m); };
  const open = async (named, first, W, H) => {
    const ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([s, f]) => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); if (f) localStorage.setItem('s2:contrailPilot.firstName', JSON.stringify(f)); sessionStorage.setItem('fresh', '1'); } }, [seed(named), first]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1000);
    await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(700);
    return { ctx, p };
  };
  const vis = (p, id) => p.evaluate(i => { const e = document.getElementById(i); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
  try {
   for (const [W, H] of [[390, 844], [320, 568]]) {
    { const { ctx, p } = await open(true, 'Lola', W, H);   // lost
      const s = { lost: await vis(p, 'pLost'), login: await vis(p, 'pLogin'), name: await vis(p, 'pName'), edit: await vis(p, 'pEdit'), have: await vis(p, 'pHave'), first: await p.inputValue('#lFirst') }; log.push(`${W}x${H} lost: ${JSON.stringify(s)}`);
      if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/lost-${W}.png` });
      check(s.lost, 'lost pilot: the lost-pilot lines are not shown'); check(s.login, 'lost pilot: the bring-back form is not shown first'); check(!s.name, "lost pilot: the empty name line ('... the ... 11') is shown"); check(!s.edit, 'lost pilot: the NEW-name form is shown first (it must be the second choice)');
      check(s.first === 'Lola', `lost pilot: the first name is not filled from the last known name (${s.first})`);
      if (!s.lost) { check(false, 'lost pilot: no \'make a new pilot instead\' button to tap (the lost-pilot block is not shown)'); await ctx.close(); continue; }
      await p.click('#pNewInstead'); await p.waitForTimeout(400);
      if (process.env.SHOTS) await p.screenshot({ path: `${process.env.SHOTS}/new-instead-${W}.png` });
      const t = { edit: await vis(p, 'pEdit'), lost: await vis(p, 'pLost') }; log.push(`${W}x${H} after 'make a new pilot instead': ${JSON.stringify(t)}`);
      check(t.edit && !t.lost, `'make a new pilot instead' does not show the new-name form: ${JSON.stringify(t)}`);
      check(!p.errs.length, `page errors: ${p.errs.join('; ')}`); await ctx.close(); }
    { const { ctx, p } = await open(false, null, W, H);   // control: never had a pilot
      const s = { lost: await vis(p, 'pLost'), edit: await vis(p, 'pEdit') }; log.push(`${W}x${H} control: ${JSON.stringify(s)}`);
      check(!s.lost && s.edit, `control: a player who never named a pilot sees the new-name form and no lost-pilot lines: ${JSON.stringify(s)}`); await ctx.close(); }
   }
  } finally { await b.close(); }
  console.log(log.join('\n'));
  console.log(fails.length ? `FAIL recoverfirstui:\n - ${fails.join('\n - ')}` : 'PASS recoverfirstui: a phone that lost its pilot opens on bring-back first, the new name is the second choice; a player who never had a pilot sees the name form');
  process.exit(fails.length ? 1 : 0);
})();
