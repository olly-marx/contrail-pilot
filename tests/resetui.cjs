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
const fs = require('fs');
const SHOTS = process.env.SHOTS || require('path').join(require('os').tmpdir(), 'resetui-shots');   // (not under /home: a CI runner has no such directory)
// What the page shows right now: so a red step says in one run whether the fixture or the product is wrong (screenshot + visible state + the element covering the tab's centre).
async function diag(p, tag, stage) {
  try {
    fs.mkdirSync(SHOTS, { recursive: true });
    const f = `${SHOTS}/${tag}-${stage.replace(/\W+/g, '_')}.png`; await p.screenshot({ path: f }).catch(() => {});
    const st = await p.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return !e.hidden && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
      const o = { screens: [...document.querySelectorAll('section.screen, .overlay, #sheet, #coach, #title')].filter(e => vis(e)).map(e => e.id || e.className), tabbarHidden: !!(document.getElementById('tabbar') || {}).hidden };
      o.tabs = [...document.querySelectorAll('#tabbar [data-go]')].map(e => `${e.dataset.go}:${e.hidden ? 'hidden-attr' : vis(e) ? 'visible' : 'not-rendered'}`);
      const t = document.getElementById('tabNature'); if (t) { const r = t.getBoundingClientRect(), c = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); o.tabNatureRect = [r.x, r.y, r.width, r.height].map(Math.round); o.coveredBy = c ? (c.id || c.className || c.tagName) : null; }
      const g = document.getElementById('hubGear'); o.hubGear = g ? (vis(g) ? 'visible' : 'not visible') : 'missing';
      o.sheet = (document.getElementById('sheet') || {}).innerText ? document.getElementById('sheet').innerText.replace(/\s+/g, ' ').slice(0, 120) : '';
      return o;
    }).catch(e => ({ evalError: String(e) }));
    console.log(`DIAG ${tag} at step "${stage}": ${JSON.stringify(st)}  screenshot ${f}`);
  } catch (e) { console.log(`DIAG ${tag} failed: ${e}`); }
}
// The fake device keys (no real pilot code or token). A key counts as SURVIVING a reset only if it still holds exactly this seeded text: a key the game writes
// itself after the reload (the Supabase client may write contrailPilot.auth again) holds other text and is only reported as a NOTE, never a failure.
const FAKE = { pilot: { first: 'Testy', word: 'Puffin', tag: 11 }, code: 'FAKE-CODE-0000', firstName: 'Testy', auth: { fake: true }, synced: { json: '{}', stamp: 1, serverProgress: 99 }, outbox: [{ fake: 1 }], onlineNote: 1, recoverNext: 1, landlog: [[1, 2, 3, 4, 5, 1]] };
const SEEDTEXT = Object.fromEntries(Object.entries(FAKE).map(([k, v]) => [k, JSON.stringify(v)]));
const DEVICE = ['outbox', 'onlineNote', 'recoverNext', 'landlog', 'pilot', 'code', 'firstName', 'auth', 'synced'];
// The rich save is built by the game's own code from prepareSave(null), changing only fields whose shape was read in their ensure()/migrate code
// (a hand-made records.beaten object made NATURE throw and the crash card cover the page: the first two runs of this test, 2026-11-10).
let richSave = null;
async function loadRich() {
  const { prepareSave } = await import('../src/save.js'), { recordFlight } = await import('../src/records.js'), { plantTree } = await import('../src/groves.js');
  richSave = () => {
    const s = prepareSave(null);
    Object.assign(s, { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'PARIS', visited: ['LONDON', 'PARIS'], tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], freeGiven: true,
      flights: 44, landings: 30, seeds: 777, missionsDone: ['L1', 'L2'], badgeTiers: { lap: 1 }, discovered: { desert: 1762800000000, savanna: 1762800000000 }, pilotNamed: true });
    recordFlight(s, { landed: true, distance: 5000, shade: 3 }); recordFlight(s, { landed: false, distance: 200, crash: 'bird' });   // save.records, as a flight writes it
    plantTree(s, 'woodland', 'oak');                                                                                                   // save.groves, planted
    return JSON.parse(JSON.stringify(s));
  };
}
(async () => {
  await loadRich();
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  try {
    for (const [W, H] of [[390, 844], [320, 568]]) {
      const tag = `${W}x${H}`, ctx = await b.newContext({ viewport: { width: W, height: H } }), p = await ctx.newPage();
      p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      let confirmText = ''; p.on('dialog', d => { confirmText = d.message(); d.accept(); });
      const rich = richSave();
      await p.addInitScript(({ s, fake }) => { if (!sessionStorage.getItem('fresh')) { sessionStorage.setItem('fresh', 1); localStorage.clear();
        localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s));
        for (const [k, v] of Object.entries(fake)) localStorage.setItem('s2:contrailPilot.' + k, JSON.stringify(v)); } }, { s: rich, fake: FAKE });
      await p.goto(URL); await ready(p); await p.waitForTimeout(800);
      const keys = () => p.evaluate(names => { const o = {}; for (const n of names) { const v = localStorage.getItem('contrailPilot.' + n); if (v !== null) o[n] = v; } return o; }, [...DEVICE, 'v2']);   // (the page's localStorage is the season-2 store: it adds the s2: prefix itself)
      const base = fails.length;
      const lands = async () => { await p.evaluate(() => game.registry.get('ui').go('nature')); await p.waitForTimeout(700); return p.evaluate(() => [...document.querySelectorAll('#wRegions [data-region]')].map(e => e.dataset.region)); };
      let stage = 'start';
      try {
      // 0. control
      stage = 'control: read keys and open NATURE';
      const before = await keys(), landsBefore = await lands();
      // (load-time effects on the seeded keys: recoverNext is consumed by main.js:60 takeRecoverNext; auth is dropped/replaced by the Supabase client (online.js:44, storageKey 'contrailPilot.auth');
      //  onlineNote is only taken by ui.js:366 when seenTips lacks '*' (the seed has it); outbox/synced/pilot/code/firstName/landlog are not touched without a network (online.js flush 113, syncUp 206, syncDown 225). Both consumed keys are written again just before the tap.)
      const SEEDED = DEVICE.filter(k => !['recoverNext', 'auth'].includes(k));
      check(SEEDED.every(k => k in before) && landsBefore.length > 1, `${tag}: control: the rich save has its device keys and more than one land in NATURE (keys missing ${SEEDED.filter(k => !(k in before))}, lands ${landsBefore})`);
      if (fails.length > base) { await diag(p, tag, 'control red'); await ctx.close(); continue; }   // (a red control: say why, go no further)
      await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(500);
      const bad = await p.evaluate(() => !!document.getElementById('crashCard'));
      check(!bad && p.errs.length === 0, `${tag}: THE FIXTURE: the seeded save opens NATURE and PILOT without a page error and without the crash card ("Oops, the game got stuck"): errors ${p.errs}, crash card ${bad}`);
      if (fails.length > base) { await diag(p, tag, 'fixture red'); await ctx.close(); continue; }
      // 1. RESET PROGRESS
      stage = 'tap the gear, then YOUR SAVED GAME, then RESET PROGRESS (real clicks)';
      await p.evaluate(() => { window.__oldPage = 1; localStorage.setItem('contrailPilot.recoverNext', '1'); localStorage.setItem('contrailPilot.auth', '{"fake":true}'); });   // (the nine keys are all there when RESET is tapped)
      await p.evaluate(() => game.registry.get('ui').go('fly')); await p.waitForTimeout(600);   // the gear (#hubGear) lives on the title hub (ui.js showTitle; tests/backuprestore.cjs taps it there), not on PILOT or NATURE
      await p.click('#hubGear'); await p.waitForTimeout(400);
      await p.click('#sheet [data-gear="saved"]'); await p.waitForTimeout(400);
      const resetTap = await p.$('#sheet [data-gear="reset"]');
      check(!!resetTap, `${tag}: Settings > Your saved game has a RESET PROGRESS button`);
      if (!resetTap) { await diag(p, tag, 'no RESET button'); await ctx.close(); continue; }
      await Promise.all([p.waitForEvent('load', { timeout: 15000 }).catch(() => null), resetTap.click()]);
      await ready(p); await p.waitForTimeout(800);
      check(/pilot name and code/.test(confirmText) && /nature/.test(confirmText) && /Write your pilot code down first if you want to come back to your online pilot\./.test(confirmText), `${tag}: the confirm text names nature, the pilot name and code, and says to write the pilot code down first: ${confirmText.slice(0, 400)}`);
      check(!(await p.evaluate(() => window.__oldPage)), `${tag}: RESET reloads the page`);
      stage = 'after the reload: read the keys';
      // 2. AFTER the reload
      const after = await keys(), left = DEVICE.filter(k => after[k] === SEEDTEXT[k]), rewritten = DEVICE.filter(k => k in after && after[k] !== SEEDTEXT[k]);
      check(left.length === 0, `${tag}: after the reload none of the nine seeded device keys is still stored with its seeded text (left: ${left})`);
      if (rewritten.length) console.log(`NOTE ${tag}: the game wrote these keys itself after the reload (not the seeded text, so not counted as surviving): ${rewritten.map(k => k + '=' + String(after[k]).slice(0, 60))}`);
      const sv = JSON.parse(after['v2'] || 'null') || {};
      // Each expectation about the reloaded save, with the source of why the game leaves it alone at load:
      //  flights/landings/seeds 0: DEFAULTS (save.js); pilotNamed unset: main.js:25 sets it only when a pilot exists (the pilot keys are gone);
      //  discovered: GameScene.js:556-565 writes a land only by FLYING into it, never at load; missionsDone/badgeTiers: migrateMissions/migrateBadges give a new player [] / {} (missions.js, badges.js:127);
      //  records: records.js ensure() runs only when a flight is recorded or BOARDS is opened (neither happens here); groves/planted: ensureGroves(prepareSave) of a new save has no planted tree.
      const noKeys = (o, ks) => !o || typeof o !== 'object' || ks.every(k => !(k in o));
      check(sv.flights === 0 && sv.landings === 0 && sv.seeds === 0 && !sv.pilotNamed, `${tag}: after the reload the saved game has the new-player numbers (flights ${sv.flights}, landings ${sv.landings}, seeds ${sv.seeds}, pilotNamed ${sv.pilotNamed})`);
      check(noKeys(sv.discovered, ['desert', 'savanna']), `${tag}: after the reload the lands flown over are gone (discovered ${JSON.stringify(sv.discovered)})`);
      check(!(sv.missionsDone || []).includes('L1') && !(sv.missionsDone || []).includes('L2') && noKeys(sv.badgeTiers, ['lap']), `${tag}: after the reload the missions and badges are gone (missionsDone ${JSON.stringify(sv.missionsDone)}, badgeTiers ${JSON.stringify(sv.badgeTiers)})`);
      check(!sv.records || (!(sv.records.ever || {}).longest && !(sv.records.beaten || []).length), `${tag}: after the reload the records are gone (${JSON.stringify(sv.records)})`);
      check(!/"planted":[1-9]/.test(JSON.stringify(sv.groves || {})) && !(sv.planted && sv.planted.oak), `${tag}: after the reload no tree is planted (groves ${JSON.stringify(sv.groves)}, planted ${JSON.stringify(sv.planted)})`);
      // 3. PILOT and NATURE
      stage = 'open PILOT and NATURE';
      await p.evaluate(() => game.registry.get('ui').go('pilot')); await p.waitForTimeout(700);
      const pil = await p.evaluate(() => { const v = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.offsetParent !== null; }; return { lostShown: v('pLost'), editShown: v('pEdit'), text: document.getElementById('pilot') ? document.getElementById('pilot').innerText.replace(/\s+/g, ' ').slice(0, 200) : '' }; });
      console.log(`NOTE ${tag}: PILOT after the reset: lost-pilot lines ${pil.lostShown ? 'SHOWN' : 'hidden'}, name form ${pil.editShown ? 'shown' : 'not shown'}`);
      check(!pil.lostShown && !/lost its pilot/i.test(pil.text), `${tag}: PILOT does not say this phone has lost its pilot: ${pil.text}`);
      const landsAfter = await lands();
      check(landsAfter.length === 1, `${tag}: NATURE shows only the home land after the reset (lands: ${landsAfter})`);
      check(p.errs.length === 0, `${tag}: no page errors: ${p.errs}`);
      } catch (e) { fails.push(`${tag}: exception at step "${stage}": ${String(e).split('\n')[0]}`); await diag(p, tag, stage); }
      if (fails.length > base) await diag(p, tag, 'end (' + stage + ')');
      await ctx.close();
    }
  } catch (e) { fails.push('exception: ' + e); }
  await b.close();
  console.log(fails.length ? `FAIL resetui:\n - ${fails.join('\n - ')}` : 'PASS resetui: RESET PROGRESS reloads into a brand-new player: no device or pilot keys, no nature, missions or badges, PILOT offers a new name, NATURE shows one land (390 and 320 wide)');
  process.exit(fails.length ? 1 : 0);
})();
