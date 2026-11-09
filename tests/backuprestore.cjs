// BACK UP MY GAME in the real game (src/ui.js openBackup / openRestore; research/BACKUP-MY-GAME.md). 375x667 and 320x568, real taps.
//   1. Settings shows BACK UP MY GAME, RESTORE A BACKUP and "Last backup: never";
//   2. DOWNLOAD A FILE gives contrail-pilot-backup-<name>-<date>.json: a readable backup with no pilot code; "Last backup" shows today after it;
//   3. a corrupt text is refused with its words and NOTHING in storage changes;
//   4. a good backup shows the card (backup vs now), and GO BACK TO IT keeps the game now as the newest safety copy, then the backup is live after the reload.
// Run: python3 -m http.server 8000 & node tests/backuprestore.cjs   (plants in tools/plants.tsv)
const { chromium } = require('playwright-core');
const fs = require('fs');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const [W, H] of [[375, 667], [320, 568]]) {
    const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H }, acceptDownloads: true }), p = await ctx.newPage();
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    const fleet = { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} };
    await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); localStorage.setItem('contrailPilot.code', JSON.stringify('zzz secret code words 42')); sessionStorage.setItem('fresh', '1'); } },
      { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['*'], tours: ['*'], freeGiven: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], landings: 40, flights: 44, seeds: 900, fleet });
    await p.goto(URL); await ready(p); await p.waitForTimeout(800);
    const store = () => p.evaluate(() => ({ cur: JSON.parse(localStorage.getItem('contrailPilot.v2') || 'null'), r1: JSON.parse(localStorage.getItem('contrailPilot.v2.replaced-1') || 'null') }));
    const sheetText = () => p.evaluate(() => { const e = document.getElementById('sheet'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    const settings = async () => { await p.click('#hubGear'); await p.waitForTimeout(400); };
    // 1. Settings
    await settings(); let t = await sheetText();
    check(/BACK UP MY GAME/.test(t) && /RESTORE A BACKUP/.test(t) && /Last backup: never/.test(t), `${tag}: Settings shows BACK UP MY GAME, RESTORE A BACKUP and "Last backup: never": ${t.slice(0, 160)}`);
    // 2. download
    await p.click('#sheet [data-gear="backup"]'); await p.waitForTimeout(400);
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#sheet [data-bk="download"]').catch(() => null)]);
    check(!!dl, `${tag}: DOWNLOAD A FILE never produced a download`);
    let text = '';
    if (dl) { text = fs.readFileSync(await dl.path(), 'utf8'); check(/^contrail-pilot-backup-player-\d{4}-\d\d-\d\d\.json$/.test(dl.suggestedFilename()), `${tag}: the file name: ${dl.suggestedFilename()}`); }
    let o = null; try { o = JSON.parse(text); } catch (e) { /* checked below */ }
    check(o && o.format === 'contrail-pilot-backup' && o.save && o.save.flights === 44 && !/zzz secret code/.test(text), `${tag}: the file is a backup of this game (44 flights) and holds no pilot code: ${text.slice(0, 80)}`);
    await p.click('#sheet .sheet-ok').catch(() => {}); await p.waitForTimeout(300); await settings(); t = await sheetText();
    check(/Last backup: 20\d\d-\d\d-\d\d/.test(t), `${tag}: "Last backup" shows a date after a backup: ${t.slice(-60)}`);
    await p.click('#sheet .sheet-ok').catch(() => {}); await p.waitForTimeout(300);
    // the game moves on: 7 flights now (so the backup is richer)
    await p.evaluate(() => { const s = game.registry.get('save'); s.flights = 7; s.landings = 6; s.seeds = 50; game.registry.get('ui').persist(); }); await p.waitForTimeout(300);
    const before = await store();
    // 3. a corrupt text is refused and changes nothing
    await settings(); await p.click('#sheet [data-gear="restore"]'); await p.waitForTimeout(400);
    { const i = text.lastIndexOf('"flights":44'); await p.fill('#bkText', text.slice(0, i) + '"flights":45' + text.slice(i + '"flights":44'.length)); }   /* the LAST one, inside the sealed save: the header's summary is not sealed */ await p.click('#sheet [data-bk="check"]'); await p.waitForTimeout(300);
    t = await sheetText(); const mid = await store();
    check(/cut\s*short or changed/.test(t) && JSON.stringify(mid.cur) === JSON.stringify(before.cur) && !mid.r1, `${tag}: a corrupt text is refused ("looks cut short or changed") and storage is unchanged: ${t.slice(-80)}`);
    // 4. a good backup: the card, then GO BACK TO IT
    await p.fill('#bkText', text); await p.click('#sheet [data-bk="check"]'); await p.waitForTimeout(400);
    t = await sheetText();
    check(/Found a backup/.test(t) && /Backup: 44 flights/.test(t) && /Now: 7 flights/.test(t) && /Your game now is kept too/.test(t), `${tag}: the card shows the backup beside the game now: ${t.slice(0, 200)}`);
    await p.click('#sheet .sheet-action'); await p.waitForFunction(() => document.readyState === 'complete' && !!window.game, null, { timeout: 15000 }).catch(() => {}); await ready(p); await p.waitForTimeout(800);
    const after = await store();
    check(after.cur && after.cur.flights === 44 && after.r1 && JSON.parse(after.r1.raw).flights === 7, `${tag}: after GO BACK the backup is live (44 flights) and the game it replaced (7 flights) is the newest safety copy: ${JSON.stringify([after.cur && after.cur.flights, after.r1 && JSON.parse(after.r1.raw).flights])}`);
    check(!p.errs.length, `${tag}: no page errors: ${p.errs.slice(0, 2)}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails.length ? `FAIL backuprestore:\n - ${fails.join('\n - ')}` : 'PASS backuprestore: Settings offers BACK UP / RESTORE; a download is a backup without the pilot code; a corrupt text changes nothing; GO BACK keeps the game it replaces');
  process.exit(fails.length ? 1 : 0);
})();
