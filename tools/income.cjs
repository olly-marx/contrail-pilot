// Income probe (rewritten 2026-10-24 for the ERAS economy: src/fleet.js; it used to price the retired src/upgrades.js lines).
// Plays a whole campaign from a fresh new-player save (flight school already done) with an autopilot that flies like a good
// player, and prints, for every flight: what it earned from flying, what its prizes paid, how long it flew, which era it
// is in and what it bought. Used to price upgrades per stage: how many flights of saving each level costs.
//   Flying:   the smart contrail pilot from tools/balance.cjs, plus it steers for seeds it can reach and drops tree
//             parcels onto soil. Crashes are OFF (it never hits storms or birds), so it is a bit better than a real player.
//   Landing:  at each airport it lands if flying on to the next one would get the Earth too hot, or once it has passed
//             MAXSKIP airports. It does NOT chase mission goals: mission and badge prizes arrive only as it plays.
//   Prizes:   after each flight it taps CLAIM ALL (like a child who always does), so prize seeds are counted separately.
//   Buying:   after each flight, the cheapest open level it can afford (src/fleet.js nextBuys/buyFleet), again and again;
//             the free first upgrade (after the first landing) goes on the cheapest level-1 item.
// Output: one line a flight, then per-era income and a JSON line `INCOME {...}` (mean seeds a flight per era) that
// tools/price-ladder.mjs reads (INCOME='{"0":..}' node tools/price-ladder.mjs).
// Speed (the same two switches as tools/balance.cjs, from the plane build's profile: ~76% of a step is WebGL drawing):
//   NORENDER=1  step the game without drawing it (physics, collisions and the random numbers are the same).
//   PROBE=1     also skip what only draws (sky, aim, heat glow, exhaust puffs, texts, pop-ups, bursts, plane parts, HUD bars).
//               Animals are NOT skipped by default (sightings may pay prizes): PROBE=2 skips them too.
//   TIMING=1    print the wall-clock ms of each flight.
//   WARNING (plane build, 2026-10-25): PROBE was REJECTED for balance.cjs: the skipped visuals draw from the same seeded Math.random,
//   so skipping them changes the sky (+15% km). Use NORENDER=1 alone unless the identity gate below passes for PROBE too.
//   Per-seed results are not repeatable even when drawing (scene start waits on real time): compare MEDIANS over several seeds.
//   A fast run must give IDENTICAL km / seeds to a drawing run: check on 2 cases before trusting a fast run (see research/BALANCE-TIME-TO-EARN.md).
// Usage: python3 -m http.server 8000 & node tools/income.cjs     FLIGHTS=80 SEED=1 MAXSKIP=3 START=0 (new player; 300 = returning)
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
const START = Number(process.env.START || 0), FLIGHTS = Number(process.env.FLIGHTS || 80), SEED = Number(process.env.SEED || 1), MAXSKIP = Number(process.env.MAXSKIP || 3);
const NORENDER = Number(process.env.NORENDER || 0), PROBE = Number(process.env.PROBE || 0);

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(seed => { let a = seed >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, SEED);
  await p.addInitScript(start => { if (!sessionStorage.getItem('init')) { sessionStorage.setItem('init', 1); localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'], priceVersion: 2, flightSeconds: 0, seeds: start, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); } }, START);
  await p.goto(URL);
  await p.waitForFunction(() => window.game && game.scene.getScene('game') && game.registry.get('ui'), null, { timeout: 60000 });
  await p.waitForTimeout(900);
  const log = [];
  for (let f = 0; f < FLIGHTS; f++) {
    const r = await p.evaluate(async ([MAXSKIP, process_dbg, NORENDER, PROBE]) => {
      if (process_dbg && !window.__dbg) window.__dbg = [];
      const { DAYNIGHT, CLIMATE } = await import('./src/config.js');
      const F = await import('./src/fleet.js'), R = await import('./src/rewards.js'), E = await import('./src/eras.js');
      const ui = game.registry.get('ui'), save = ui.save;
      const before = { seeds: save.seeds, crystals: save.crystals || 0, secs: save.flightSeconds || 0 };
      game.loop.sleep();
      const wall0 = performance.now();
      if (NORENDER) game.scene.render = () => {};
      let t0 = game.loop.now || performance.now();
      const s = game.scene.getScene('game');
      s.result = null; s.scene.restart({ go: true });
      for (let i = 0; i < 3 || !(s.nextAirport && s.sys.isActive()); i++) { if (i > 3) await new Promise(r => setTimeout(r, 20)); t0 += 16.67; game.step(t0, 16.67); }
      ui.showOnly(null);
      for (let i = 0; i < 2000 && s.state !== 'playing'; i++) { t0 += 16.67; game.step(t0, 16.67); }
      s.hitsStorm = () => false; s.hitBird = () => false; s.explain = () => false;
      if (PROBE) { for (const k of ['updateExhaust', 'drawSky', 'drawAim', 'drawHeatFx', 'updateTexts', 'popup', 'burst', 'syncPlaneParts', ...(PROBE > 1 ? ['updateWildlife'] : [])]) s[k] = () => {}; s.hud.setCo2 = s.hud.setHeat = () => {}; }
      let spawned = 0; const addToken = s.addToken.bind(s); s.addToken = (...a) => { const n = s.tokens.length; addToken(...a); spawned += s.tokens.length > n ? s.tokens[s.tokens.length - 1].value : 0; };
      const SKY_H = 512 - 48;
      const goodDay = () => { const c = s.clock % (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds); return c < DAYNIGHT.daySeconds - DAYNIGHT.blendSeconds - s.kit.contrailLife / 1000; };
      let landHere = null;   // airport index we have decided to land at
      const target = () => {
        const toA = s.nextAirport.worldX - s.distancePx;
        if (landHere === null && toA < 700) {
          const rate = Math.max(0, s.heat) / Math.max(500, s.distancePx), next = s.legKm(s.airportIndex + 1);
          // Land when flying on would get the Earth too hot (85% of today's danger line), or after MAXSKIP airports passed.
          if (s.airportsSkipped >= MAXSKIP || s.heat + rate * next * 1.3 > CLIMATE.dangerLine * 0.85) landHere = s.airportIndex;
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
        const seeds = s.tokens.filter(k => k.x > s.plane.x && k.x < s.plane.x + 140);
        let best = (lo + hi) / 2, bestScore = -1e9;
        for (let y = lo; y <= hi; y += 4) {
          const seed = seeds.reduce((a, k) => a + (Math.abs(k.y - (y + 7)) < 14 ? 80 * k.value : 0), 0);
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
      // What the flight itself paid (the game banks the carried seeds, fares and dividends when the flight ends)...
      const flightSeeds = save.seeds - before.seeds, flightCrystals = (save.crystals || 0) - before.crystals;
      // ...then, like a child who always taps CLAIM ALL, the prizes (missions and badges).
      const paid = R.claim(save);
      F.syncFleet(save);   // an era that opened during the flight brings its plane
      // Buy: the free first upgrade (cheapest level-1 item), then the cheapest open level it can afford, again and again.
      const bought = []; let spent = 0;
      const cheapest = list => list.sort((a, b) => a.cost - b.cost)[0];
      if (save.freeUpgrade) { const it = cheapest(F.nextBuys(save).filter(i => i.open && i.level === 1)); if (it && F.buyFleet(save, it.kind, it.id, { free: true })) { bought.push(`${it.id}L${it.level}(free)`); save.freeUpgrade = false; } }
      for (;;) {
        const it = cheapest(F.nextBuys(save).filter(i => i.open && F.canAfford(save, i)));
        if (!it || !F.buyFleet(save, it.kind, it.id)) break;
        spent += it.cost; bought.push(`${it.id}L${it.level}:${it.cost}`);
      }
      if (ui.persist) ui.persist();
      const ep = E.eraProgress(save), owned = F.nextBuys(save);
      const dbg = window.__dbg; window.__dbg = process_dbg ? [] : null;
      return { ms: Math.round(performance.now() - wall0), dbg, km: res.distance || 0, landed: !!res.landed, at: res.landedAt || '', skipped: res.airportsSkipped || 0, grabbed: res.cargo || 0, spawned,
        flightSeeds, flightCrystals, prizeSeeds: paid.seeds, prizeCrystals: paid.crystals, spent, bought: bought.join(' '), bank: save.seeds, crystals: save.crystals || 0,
        era: ep.index, mins: Math.round(((save.flightSeconds || 0) - before.secs) / 6) / 10, totalMins: Math.round((save.flightSeconds || 0) / 6) / 10,
        openLeft: owned.filter(i => i.open).length, closedLeft: owned.filter(i => !i.open).length };
    }, [MAXSKIP, !!process.env.DEBUG, NORENDER, PROBE]);
    if (process.env.DEBUG) console.log(JSON.stringify(r.dbg));
    log.push(r);
    console.log(`${String(f + 1).padStart(3)} ${String(r.km).padStart(6)} km ${r.landed ? 'landed ' + r.at.padEnd(12) : 'CRASH/HOT'.padEnd(19)} skip ${r.skipped} grabbed ${String(r.grabbed).padStart(3)}/${String(r.spawned).padEnd(3)} flight +${String(r.flightSeeds).padStart(3)} prizes +${String(r.prizeSeeds).padStart(3)} bank ${String(r.bank).padStart(5)} era ${r.era} ${String(r.totalMins).padStart(5)} min | ${r.bought}${process.env.TIMING ? `  [${r.ms} ms]` : ''}`);
    if (!r.openLeft && !r.closedLeft) break;   // everything bought
  }
  // Income per era: mean seeds a flight from flying alone and from prizes (the numbers tools/price-ladder.mjs needs).
  const eras = {};
  for (const r of log) { const e = (eras[r.era] = eras[r.era] || { flights: 0, flight: 0, prize: 0, landed: 0 }); e.flights++; e.flight += r.flightSeeds; e.prize += r.prizeSeeds; e.landed += r.landed ? 1 : 0; }
  console.log('\nper era: flights | landed | seeds a flight from flying | seeds a flight from prizes');
  for (const [k, e] of Object.entries(eras)) console.log(`  era ${k}: ${e.flights} | ${e.landed} | ${(e.flight / e.flights).toFixed(1)} | ${(e.prize / e.flights).toFixed(1)}`);
  console.log('INCOME ' + JSON.stringify(Object.fromEntries(Object.entries(eras).map(([k, e]) => [k, Math.round(((e.flight + e.prize) / e.flights) * 10) / 10]))));
  if (process.env.JSON) console.log(JSON.stringify(log));
  await b.close();
})();
