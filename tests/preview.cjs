// ?preview=1 (the user, 2026-10-28): the whole onboarding as a brand-new player, NOTHING saved. Real taps where a player
// would tap. A real season-2 save is seeded first; the browser's RAW storage (Playwright storageState: every key, under
// the season-2 wrapper) must be byte-identical after a preview session that picks a start city, takes off, and saves a
// pilot name (local only). The preview shows its tag with the name; a reload of ?preview=1 is a brand-new player again;
// nothing is sent online. Plant: the preview store writing through to the real keys -> must FAIL.
// Run: python3 -m http.server 8000 & node tests/preview.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let online = 0; await ctx.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => { online++; r.abort(); });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
  // A real player's season-2 save, in the RAW storage before the game loads (once: the game's in-memory save would overwrite a later write).
  await ctx.addInitScript(s => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('seeded', '1'); } },
    { areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, seeds: 777, landings: 9, flights: 10, missionsDone: ['L1', 'L2', 'L3'], priceVersion: 2 });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  const before = JSON.stringify((await ctx.storageState()).origins);
  check(/777/.test(before), 'the real save is in the raw storage before the preview');
  // The preview: a brand-new player.
  await p.goto(URL + '?preview=1'); await ready(p); await p.waitForTimeout(800);
  const fresh = await p.evaluate(() => ({ start: !!document.querySelector('#startChoice [data-area]') && !document.getElementById('startChoice').hidden && getComputedStyle(document.getElementById('startChoice')).display !== 'none', tag: (document.getElementById('previewTag') || {}).textContent || '' }));
  check(fresh.start && /PREVIEW: nothing is saved/.test(fresh.tag), `?preview=1 opens as a brand-new player (the start choice) with the tag (${JSON.stringify(fresh)})`);
  await p.click('#startChoice [data-area="easia"]'); await p.click('#startChoice [data-city="SEOUL"]'); await p.waitForTimeout(1200); await ready(p);
  await p.click('#goBtn'); await p.waitForTimeout(500); if (await p.isVisible('#howClose')) await p.click('#howClose'); await p.waitForTimeout(400);
  await p.mouse.move(195, 460); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up(); await p.waitForTimeout(1500);   // take off: the game saves as it plays
  const pil = await p.evaluate(async () => { const O = await import('./src/online.js'); const r = await O.savePilot({ first: 'Zoe', word: 'Otter', tag: 12 }); return { r, got: O.getPilot() }; });
  await p.waitForTimeout(1200);
  const tag2 = await p.evaluate(() => document.getElementById('previewTag').textContent);
  check(pil.r.ok && pil.got && pil.got.first === 'Zoe' && /Pilot: Zoe Otter/.test(tag2), `the pilot name is saved LOCALLY in the preview and shown in the tag (${JSON.stringify(pil)}; "${tag2}")`);
  // A reload of the preview: brand-new again.
  await p.reload(); await ready(p); await p.waitForTimeout(800);
  const again = await p.evaluate(() => ({ start: !document.getElementById('startChoice').hidden && getComputedStyle(document.getElementById('startChoice')).display !== 'none', tag: document.getElementById('previewTag').textContent }));
  check(again.start && !/Zoe/.test(again.tag), `a reload of ?preview=1 is a brand-new player again (${JSON.stringify(again)})`);
  const after = JSON.stringify((await ctx.storageState()).origins);
  check(after === before, `the real storage is byte-identical after the preview (${before.length} vs ${after.length} chars)`);
  check(online === 0, `nothing was sent online (${online} requests)`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await b.close();
  console.log(fails.length ? `FAIL preview:\n - ${fails.join('\n - ')}` : 'PASS preview: a brand-new player with the tag, the pilot name local only, fresh on reload, the real storage byte-identical, nothing online');
  process.exit(fails.length ? 1 : 0);
})();
