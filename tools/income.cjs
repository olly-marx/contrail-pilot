// Income probe: plays a whole campaign from a fresh save (flight school already done), with an
// autopilot that flies like a good player, and prints what each flight earned and what it bought.
// Used to price upgrades per stage: how many flights of saving each level costs.
//   Flying: the smart contrail pilot from tools/balance.cjs, plus it steers for seeds it can reach
//           and drops tree parcels onto soil. Crashes are OFF (it never hits storms or birds), so
//           it is a bit better than a real player.
//   Landing: at each airport it lands if flying on to the next one would get the Earth too hot
//           (heat so far per km x the next leg), or once it has passed MAXSKIP airports.
//   Buying: after each flight, the cheapest level it can afford, again and again (the free
//           upgrade after the first landing goes on the cheapest line).
// Usage: python3 -m http.server 8000 & node tools/income.cjs        FLIGHTS=80 SEED=1 MAXSKIP=3
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const FLIGHTS = Number(process.env.FLIGHTS || 80), SEED = Number(process.env.SEED || 1), MAXSKIP = Number(process.env.MAXSKIP || 3);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEED);
  await p.addInitScript(() => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'] })); } });
  await p.goto(URL);
  await p.waitForFunction(() => window.game && game.scene.getScene('game') && game.registry.get('ui'), null, { timeout: 60000 });
  await p.waitForTimeout(900);
  const log = [];
  for (let f = 0; f < FLIGHTS; f++) {
    const r = await p.evaluate(async ([MAXSKIP, process_dbg]) => {
      if (process_dbg && !window.__dbg) window.__dbg = [];
      const { DAYNIGHT } = await import('./src/config.js');
      const U = await import('./src/upgrades.js');
      const { legKm, cityIndex, cityAt } = await import('./src/route.js');
      const M = await import('./src/missions.js');
      const ui = game.registry.get('ui'), save = ui.save;
      const before = { seeds: save.seeds, crystals: save.crystals || 0, mission: save.mission || 0 };
      game.loop.sleep();
      let t0 = game.loop.now || performance.now();
      const s = game.scene.getScene('game');
      s.result = null; s.scene.restart({ go: true });
      for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t0 += 16.67; game.step(t0, 16.67); }
      ui.showOnly(null);
      for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t0 += 16.67; game.step(t0, 16.67); }
      s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false;
      let spawned = 0; const addToken = s.addToken.bind(s); s.addToken = (...a) => { const n = s.tokens.length; addToken(...a); spawned += s.tokens.length > n ? s.tokens[s.tokens.length - 1].value : 0; };
      const SKY_H = 512 - 48;
      const goodDay = () => { const c = s.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds); return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - s.kit.contrailLife / 1000; };
      let landHere = null;   // airport index we have decided to land at
      const target = () => {
        const toA = s.nextAirport.worldX - s.distancePx;
        if (landHere === null && toA < 700) {
          const rate = Math.max(0, s.heat) / Math.max(500, s.distancePx), next = legKm(s.startCity + s.airportIndex + 1);
          // Like a player following the mission card: land where the mission says, else when it gets hot.
          const m = M.current(save), here = s.nextAirport.name;
          const forMission = m && (m.id === 'land-paris' ? here === 'PARIS' : m.id.startsWith('reach-') ? cityIndex(here) >= cityIndex(m.id.slice(6).toUpperCase()) || here === 'LONDON'
            : m.id === 'seeds-5' ? s.cargo >= 5 : false);
          if (forMission || s.airportsSkipped >= MAXSKIP || s.heat + rate * next * 1.3 > 85) landHere = s.airportIndex;
          else landHere = -1 - s.airportIndex;   // fly on past this one
        }
        if (landHere !== null && landHere < 0 && -1 - landHere !== s.airportIndex) landHere = null;
        if (landHere === s.airportIndex && toA < 700) { if (window.__dbg && steps % 10 === 0) window.__dbg.push([Math.round(toA), Math.round(s.plane.y), Math.round(s.plane.vy), s.state, s.flaring]); const clear = !s.storms.some(st => st.rects[0].x + st.rects[0].width > s.plane.x - 4 && st.rects[0].x < s.plane.x + Math.max(0, toA) + 40);
          if (clear) return toA < 330 ? SKY_H : SKY_H - 90; }   // no storm before the runway: get low, then the plane lands itself
        const st = s.storms.filter(t => t.rects[0].x + t.rects[0].width > s.plane.x - 4 && t.rects[0].x < s.plane.x + 160)[0];
        const lo = st ? st.rects[0].height + 6 : 30, hi = st ? st.rects[1].y - 20 : SKY_H - 60;
        const ahead = s.issrs.filter(i => i.x < s.plane.x + 220 && i.x + i.width > s.plane.x - 10);
        const room = y => ahead.reduce((m, i) => Math.min(m, Math.max(0, i.y - (y + 14), y - 2 - (i.y + i.height))), 999);
        const depth = y => ahead.reduce((m, i) => Math.max(m, Math.min(y - 2 - i.y, i.y + i.height - (y + 14))), -999);
        const seeds = s.tokens.filter(k => k.img.active && k.img.x > s.plane.x && k.img.x < s.plane.x + 140);
        let best = (lo + hi) / 2, bestScore = -1e9;
        for (let y = lo; y <= hi; y += 4) {
          const seed = seeds.reduce((a, k) => a + (Math.abs(k.img.y - (y + 7)) < 14 ? 80 * k.value : 0), 0);
          const score = (goodDay() ? Math.min(depth(y), 40) : Math.min(room(y), 60)) + seed - Math.abs(y - s.plane.y) * 0.05;
          if (score > bestScore) { bestScore = score; best = y; }
        }
        return best;
      };
      let t = t0, steps = 0;
      while (s.state === 'playing' && steps < 1e6 && s.distancePx < 40000) {
        t += 16.67; steps++;
        if (s.plane.y > target() && s.plane.vy > -40) s.applyFlap();
        if (s.parcels > 0) { const x = s.predictLanding(), pl = s.plots.find(pl => !pl.used && !pl.aimed && x >= pl.x + 4 && x <= pl.x + s.kit.plotW - 4); if (pl) { pl.aimed = true; s.dropParcel(); } }
        game.step(t, 16.67);
      }
      for (let i = 0; i < 600 && !s.result; i++) { t += 16.67; game.step(t, 16.67); }
      const res = s.result || {};
      // Buy: free upgrade first, then the cheapest affordable level, repeatedly.
      const bought = [];
      const open = () => U.LINES.filter(l => U.nextLevel(save, l) && U.unlocked(save, l) && !U.needsMoreNature(save, l));
      if (save.freeUpgrade) { const l = open().sort((a, b) => U.nextLevel(save, a).cost - U.nextLevel(save, b).cost)[0]; if (l) { ui.buy(l.id); bought.push(`${l.id}${U.level(save, l.id)}(free)`); } }
      for (;;) {
        const l = open().filter(l => U.canBuy(save, l)).sort((a, b) => U.nextLevel(save, a).cost - U.nextLevel(save, b).cost)[0];
        if (!l) break;
        const c = U.nextLevel(save, l).cost; ui.buy(l.id); bought.push(`${l.id}${U.level(save, l.id)}:${c}`);
      }
      const spent = bought.reduce((a, x) => a + Number((x.split(':')[1]) || 0), 0);
      const levels = Object.values(save.levels).reduce((a, n) => a + n, 0);
      const dbg = window.__dbg; window.__dbg = process_dbg ? [] : null;
      return { dbg, km: res.distance || 0, landed: !!res.landed, at: res.landedAt || '', skipped: res.airportsSkipped || 0, grabbed: res.cargo || 0, spawned,
        earned: save.seeds + spent - before.seeds, crystals: (save.crystals || 0) - before.crystals,
        rewards: (res.rewards || []).map(x => `${x.kind}+${x.seeds}`).join(' '), mission: save.mission || 0, levels, bought: bought.join(' '), bank: save.seeds };
    }, [MAXSKIP, !!process.env.DEBUG]);
    if (process.env.DEBUG) console.log(JSON.stringify(r.dbg));
    log.push(r);
    console.log(`${String(f + 1).padStart(3)} ${String(r.km).padStart(6)} km ${r.landed ? 'landed ' + r.at.padEnd(12) : 'CRASH/HOT'.padEnd(19)} skip ${r.skipped} grabbed ${String(r.grabbed).padStart(3)}/${String(r.spawned).padEnd(3)} earned ${String(r.earned).padStart(4)} +${r.crystals}c bank ${String(r.bank).padStart(4)} levels ${String(r.levels).padStart(2)} m${r.mission} | ${r.rewards} | ${r.bought}`);
    if (r.levels >= 53) break;
  }
  if (process.env.JSON) console.log(JSON.stringify(log));
  await b.close();
})();
