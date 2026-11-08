// The note after the online copy replaced a game here (src/online.js syncDown sets contrailPilot.onlineNote; src/ui.js noteOnlineReplaced): ONE plain toast on the next
// title, with where the other game is, cleared once shown, never twice, and not when nothing was replaced. Real page, shipped game, supabase blocked.
// Run: python3 -m http.server 8000 & node tests/onlinenote.cjs   (proved by planted defects: tools/plants.tsv, test onlinenote)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  const base = { tutorialDone: true, muted: true, seenTips: ['x-bars', 'records-intro'], tours: ['*'], priceVersion: 2, fleet, areas: ['weurope'], homeArea: 'weurope', city: 'AMSTERDAM', freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], flights: 14, landings: 6, seeds: 50 };
  const open = async note => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([s, n]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); if (n) localStorage.setItem('s2:contrailPilot.onlineNote', '1'); } }, [base, note]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(1500);
    return p;
  };
  const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && !t.hidden ? t.innerText : ''; });
  const flag = p => p.evaluate(() => localStorage.getItem('contrailPilot.onlineNote'));   // (in the page the season-2 layer adds the s2: prefix itself)

  let p = await open(true);
  const t1 = await toast(p);
  check(/YOUR ONLINE GAME WAS NEWER/i.test(t1) && /We kept it/.test(t1) && /RECOVER AN EARLIER SAVE/.test(t1), `the note is shown, in plain words, with where the other game is: ${JSON.stringify(t1)}`);
  check((await flag(p)) === null, 'the note is cleared once shown');
  check(!p.errs.length, `page errors ${p.errs}`);
  await p.reload(); await ready(p); await p.waitForTimeout(1500);
  check(!/ONLINE GAME WAS NEWER/i.test(await toast(p)), 'it is not shown a second time');
  await p.close();
  p = await open(false);
  check(!/ONLINE GAME WAS NEWER/i.test(await toast(p)), 'no note when nothing was replaced');
  await p.close();
  await b.close();
  console.log(fails.length ? `FAIL onlinenote:\n - ${fails.join('\n - ')}` : 'PASS onlinenote: one plain note after the online copy replaced a game, once, never when nothing was replaced');
  process.exit(fails.length ? 1 : 0);
})();
