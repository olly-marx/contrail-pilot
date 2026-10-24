// Era welcome cards (src/welcome.js, 2026-10-23): after the eras reset an old save sees "Welcome to
// the 1950s" once, with the gift and its plane; OK takes it to the FLY screen and it never shows again.
// Automated-test saves (seenTips '*') never see it. The 1970s card lists the 747 as a new plane.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/welcome.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';
// A real player's save from before the eras (no fleet), with old plane levels.
const OLD = { tutorialDone: true, muted: true, seenTips: ['issr'], tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2,
  seeds: 420, crystals: 60, flights: 35, landings: 8, bestDistance: 5200000, flownKm: 30000, city: 'PARIS', visited: ['LONDON', 'PARIS'],
  levels: { engine: 2, radar: 1, trees: 1 }, planted: { spruce: 5 } };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const open = async save => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([k, s]) => { if (sessionStorage.i) return; sessionStorage.i = 1; localStorage.clear(); localStorage.setItem(k, JSON.stringify(s)); }, [KEY, save]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(600);
    return p;
  };
  const card = p => p.evaluate(() => { const c = document.getElementById('eraCard'); return c && !c.hidden ? c.textContent.replace(/\s+/g, ' ') : ''; });

  let p = await open(OLD);
  let t = await card(p);
  check(/A NEW START/.test(t) && /Welcome to the 1950s/.test(t) && /300 seeds/.test(t) && /NEW PLANE: Comet 4/.test(t), `the reset card shows once: "${t.slice(0, 300)}"`);
  check(await p.evaluate(() => !!document.querySelector('#eraCard .ec-plane') && document.querySelector('#eraCard .ec-plane').getAttribute('src') === 'assets/plane-comet.png'), 'the Comet taxis in');
  await p.waitForSelector('#ecOk', { state: 'visible' }); await p.waitForTimeout(2800);   // the OK fades in last
  await p.click('#ecOk'); await p.waitForTimeout(400);
  check(!(await card(p)) && await p.evaluate(() => !document.getElementById('title').hidden), 'OK closes it onto the FLY screen');
  const saved = await p.evaluate(k => JSON.parse(localStorage.getItem(k)), KEY);
  check(saved.eraWelcome && saved.eraWelcome.shown === true, `remembered as shown: ${JSON.stringify(saved.eraWelcome)}`);
  await p.close();
  // Reload: never again.
  p = await open(saved);
  check(!(await card(p)), 'not shown a second time');
  await p.close();
  // An automated-test save never sees it.
  p = await open({ ...OLD, seenTips: ['*'] });
  check(!(await card(p)), 'seenTips * : no card');
  // The 1970s card: the 747 is new.
  const t70 = await p.evaluate(async () => { const { showEraWelcome } = await import('/src/welcome.js'); showEraWelcome(1); await new Promise(r => setTimeout(r, 300));
    return document.getElementById('eraCard').textContent.replace(/\s+/g, ' '); });
  check(/NEW ERA!/.test(t70) && /Welcome to the 1970s/.test(t70) && /NEW PLANE: 747 jumbo/.test(t70) && /Global forecast model/.test(t70) && /and more in the hangar/.test(t70), `1970s card: "${t70.slice(0, 300)}"`);
  check(p.errs.length === 0, `page errors: ${p.errs.join(' | ')}`);
  await p.close();

  console.log({ fails: fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
