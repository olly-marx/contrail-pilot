// The name step never traps a player (the user's playtest, 2026-10-29, ?preview=1: "Tap PILOT to choose your pilot name" and
// PILOT had no name form). From the post-rails state (lessons done, no pilot name), REAL TAPS only through the name tour:
//   ?preview=1: the tour points at PILOT, the form is there, a name is typed, a word picked, SAVE tapped, the name is kept (local)
//   and the tour goes on past the name step (to BOARDS);
//   no preview (season 2, names resting): the name tour never starts.
// Run: python3 -m http.server 8000 & node tests/pilotpreview.cjs   (proved by planted defects)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const bubble = p => p.evaluate(() => { const t = document.getElementById('tour'); return t && !t.hidden ? t.querySelector('.tbubble p').textContent : ''; });
  for (const q of ['?preview=1', '']) {
    const tag = q || '(no preview)';
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ muted: true })); });
    await p.goto(URL + q); await ready(p); await p.waitForTimeout(800);
    await p.click('#startChoice [data-area="weurope"]').catch(() => {}); await p.click('#startChoice [data-city]').catch(() => {}); await p.waitForTimeout(1200);
    // After the rails: lessons done, every rails tour done, NO pilot name, then back to the menu (the tour decides from here).
    await p.evaluate(() => { const s = game.registry.get('save'); Object.assign(s, { tutorialDone: true, freeGiven: true, freeUpgrade: false, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], landings: 5,
      tours: ['hangar', 'r-boards', 'r-bonus', 'r-free', 'r-nature', 'r-parcels', 'r-res1', 'r-res2', 'r-school', 'r-systems', 'r-takeoff1', 'r-takeoff2'] });
      const t = document.getElementById('tour'); if (t) t.hidden = true; const ui = game.registry.get('ui'); ui.tour.busy = false; ui.showTitle(); });
    await p.waitForTimeout(2500);
    const hello = await bubble(p);
    if (q) {
      check(/choose your pilot name/i.test(hello), `${tag}: the name tour points at PILOT: "${hello}"`);
      await p.click('#tabPilot').catch(e => fails.push(`${tag}: tap PILOT: ${e.message.slice(0, 60)}`)); await p.waitForTimeout(900);
      const form = await p.evaluate(() => ({ first: document.getElementById('pFirst').offsetParent !== null, off: !document.getElementById('pOffNote').hidden }));
      check(form.first && !form.off, `${tag}: PILOT shows the name form (not "resting"): ${JSON.stringify(form)}`);
      await p.click('#pFirst').catch(() => {}); await p.keyboard.type('Ana'); await p.waitForTimeout(700);
      await p.click('#pWords [data-word]').catch(e => fails.push(`${tag}: pick a word: ${e.message.slice(0, 60)}`)); await p.waitForTimeout(700);
      await p.click('#pSave').catch(e => fails.push(`${tag}: SAVE: ${e.message.slice(0, 60)}`));
      let next = ''; for (let i = 0; i < 30 && !/BOARDS/.test(next); i++) { await p.waitForTimeout(300); next = await bubble(p); }
      const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.pilot') || 'null') || Object.keys(localStorage).filter(k => /pilot/i.test(k)));
      check(/BOARDS/.test(next), `${tag}: the tour goes past the name step (to BOARDS): "${next}"`);
      check(!!kept, `${tag}: the name is kept on this device: ${JSON.stringify(kept)}`);
    } else {
      check(!/pilot name/i.test(hello), `${tag}: names rest in season 2, so the name tour does not start: "${hello}"`);
    }
    check(!errs.length, `${tag}: page errors ${errs}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL pilotpreview:\n - ${fails.join('\n - ')}` : 'PASS pilotpreview: preview names a pilot with real taps and the tour goes on; outside preview the name tour does not start');
  process.exit(fails.length ? 1 : 0);
})();
