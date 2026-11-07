// The gear sheet on HOME (R10, research/UX-MASTER-PLAN.md C2/F4; src/ui.js openGear): the four small buttons, reset and the credit behind ONE gear,
// as a sheet. Real taps at 390x667 and 320x568: the gear opens it; it has HOW TO PLAY, FLIGHT SCHOOL, SOUND, ABOUT US and RESET PROGRESS, each a
// >= 40 px target, the whole sheet on screen; SOUND flips and keeps the sheet open; ABOUT and HOW open their screens (the sheet closes);
// FLIGHT SCHOOL starts the school; RESET asks first (cancelled here: nothing is lost).
// Run: python3 -m http.server 8000 & node tests/gear.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
  for (const [W, H] of [[390, 667], [320, 568]]) {
    const tag = `${W}x${H}`, p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: true });
    const errs = []; p.on('pageerror', e => errs.push(String(e))); let asked = 0; p.on('dialog', d => { asked++; d.dismiss(); });
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); },
      { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, muted: false, seenTips: ['*'], tours: ['*'], priceVersion: 2, landings: 5, flights: 6, seeds: 80, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    const saveNow = () => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));
    check(await p.evaluate(() => !!document.getElementById('hubGear') && document.getElementById('hubGear').offsetParent !== null), `${tag}: HOME has the gear`);
    check(await p.evaluate(() => !document.querySelector('#title .buttons') || document.querySelector('#title .buttons').offsetParent === null), `${tag}: the four small buttons are not on HOME any more`);
    await p.click('#hubGear'); await p.waitForTimeout(300);
    const sh = await p.evaluate(() => { const s = document.getElementById('sheet'), c = s && s.querySelector('.sheet'), r = c && c.getBoundingClientRect();
      return { open: !!s, btns: s ? [...s.querySelectorAll('[data-gear]')].map(e => { const q = e.getBoundingClientRect(); return { g: e.dataset.gear, h: Math.round(q.height), w: Math.round(q.width) }; }) : [], top: r && Math.round(r.top), bottom: r && Math.round(r.bottom), vh: innerHeight, credit: s ? /AEIS/.test(s.textContent) : false }; });
    check(sh.open && sh.btns.map(x => x.g).join() === 'how,school,sound,about,recover,reset', `${tag}: the gear opens the sheet with its 6 buttons (0.31.0: RECOVER AN EARLIER SAVE): ${JSON.stringify(sh.btns)}`);
    check(sh.btns.every(x => x.h >= 40 && x.w >= 40) && sh.top >= 0 && sh.bottom <= sh.vh, `${tag}: every button is a 40 px target and the sheet is on screen: ${JSON.stringify([sh.btns.map(x => x.h), sh.top, sh.bottom, sh.vh])}`);
    check(sh.credit, `${tag}: the credit is in the sheet`);
    // SOUND flips and the sheet stays open.
    const before = (await saveNow()).muted; await p.click('#sheet [data-gear="sound"]'); await p.waitForTimeout(200);
    const after = await p.evaluate(() => ({ muted: JSON.parse(localStorage.getItem('contrailPilot.v2')).muted, label: document.querySelector('#sheet [data-gear="sound"]').textContent, open: !!document.getElementById('sheet') }));
    check(after.muted === !before && after.open && new RegExp(after.muted ? 'OFF' : 'ON').test(after.label), `${tag}: SOUND flips, is saved, and the sheet stays open: ${JSON.stringify(after)}`);
    // ABOUT and HOW open their screens and close the sheet.
    await p.click('#sheet [data-gear="about"]'); await p.waitForTimeout(250);
    check(await p.evaluate(() => !document.getElementById('about').hidden && !document.getElementById('sheet')), `${tag}: ABOUT US opens About and the sheet closes`);
    await p.click('#aboutClose'); await p.click('#hubGear'); await p.click('#sheet [data-gear="how"]'); await p.waitForTimeout(250);
    check(await p.evaluate(() => !document.getElementById('how').hidden && !document.getElementById('sheet')), `${tag}: HOW TO PLAY opens How to play and the sheet closes`);
    await p.click('#howClose');
    // FLIGHT SCHOOL starts the school; RESET asks first.
    await p.evaluate(() => { window.__school = 0; game.registry.get('ui').startSchool = () => { window.__school++; }; });
    await p.click('#hubGear'); await p.click('#sheet [data-gear="school"]'); await p.waitForTimeout(250);
    check(await p.evaluate(() => window.__school === 1 && !document.getElementById('sheet')), `${tag}: FLIGHT SCHOOL starts the school and the sheet closes`);
    const seeds = (await saveNow()).seeds; await p.click('#hubGear'); await p.click('#sheet [data-gear="reset"]'); await p.waitForTimeout(300);
    check(asked === 1 && (await saveNow()).seeds === seeds, `${tag}: RESET asks first (cancelled: nothing lost): asked ${asked}, seeds ${seeds} -> ${(await saveNow()).seeds}`);
    check(!errs.length, `${tag}: no page errors: ${errs.slice(0, 2)}`);
    await p.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL gear:\n - ${fails.join('\n - ')}` : 'PASS gear: at 390x667 and 320x568 one gear opens one sheet with how to play, flight school, sound, about, reset and the credit');
  process.exit(fails.length ? 1 : 0);
})();
