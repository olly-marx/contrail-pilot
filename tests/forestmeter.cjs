// Planting on a flight (2026-10-22): no soil patches once your parcels are gone; "BIODIVERSITY UP!"
// only for a new kind (the same kind again says nothing, it used to say "+0.0"); the forest meter
// (10 little trees, bottom right) grows as the forest soaks up CO2, dims what your kinds can't hold,
// and says FULL! when full; and soil patches are spaced unevenly.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/forestmeter.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  // Owns the first tree level (parcels + oak); has planted an oak before.
  await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'],
    tours: ['name', 'hangar', 'nature', 'wild'], freeGiven: true, priceVersion: 2, missionsDone: [], badgeTiers: {}, levels: { trees: 1 }, planted: { oak: 3 } })); });
  await p.goto(URL); await ready(p); await p.waitForTimeout(400);
  await p.click('#goBtn');
  await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.sys.isActive() && s.state === 'playing'; }, null, { timeout: 20000 });

  const r = await p.evaluate(async () => { const s = game.scene.getScene('game'); const wait = ms => new Promise(r => setTimeout(r, ms));
    s.graceUntil = s.gameTime + 600000; s.heat = 0;
    const out = { kinds: s.kit.tree && s.kit.tree.species, meter: s.meterTrees.length };
    // Popups: the same kind again says nothing about biodiversity; a new kind says BIODIVERSITY UP.
    const said = []; const pop = s.popup.bind(s); s.popup = (x, y, t, ...a) => { said.push(t); return pop(x, y, t, ...a); };
    const plant = kind => { s.addPlot(200); const pl = s.plots[s.plots.length - 1]; s.parcelLanded(pl.x + 10, kind); };
    plant('oak'); await wait(600); out.again = said.filter(t => /biodiversity/i.test(t));
    said.length = 0; plant('birch'); await wait(600); out.fresh = said.filter(t => /biodiversity/i.test(t));
    // Meter: empty -> half the biggest forest -> full.
    const tex = () => s.meterTrees.map(m => +m.texture.key.slice(-1));
    s.forestStored = 0; s.updateForestMeter(); out.empty = tex();
    s.forestStored = 0.5 * 1e9; s.forestStored = Math.min(s.forestStored, s.forestStore()); s.updateForestMeter();
    out.cap = s.forestStore(); out.capped = tex(); out.dim = s.meterTrees.map(m => m.alpha < 1 ? 1 : 0); s.updateTexts(false); out.label = s.parcelText.text;
    // Soil: none once the parcels are gone.
    let added = 0; const add = s.addPlot.bind(s); s.addPlot = x => { added++; return add(x); };   // patches scroll off and are removed: count the calls
    s.nextAirport.worldX = s.distancePx + 50000;   // no runway in the way
    s.parcels = 0; s.nextPlotAt = s.distancePx; await wait(1500); out.plotsAfterEmpty = added;
    added = 0; s.parcels = 5; s.nextPlotAt = s.distancePx; await wait(800); out.plotsWithParcels = added;
    return out; });
  check(r.meter === 10, `forest meter: 10 slots when you own trees: ${r.meter}`);
  check(r.again.length === 0, `planting a kind you already have says nothing about biodiversity: ${JSON.stringify(r.again)}`);
  check(r.fresh.some(t => /BIODIVERSITY UP/.test(t)), `a new kind says BIODIVERSITY UP: ${JSON.stringify(r.fresh)}`);
  check(r.empty.every(k => k === 0), `empty forest: bare soil in every slot: ${r.empty}`);
  check(r.capped.some(k => k === 3) && r.dim.some(Boolean) && /FOREST FULL!/.test(r.label), `a full 2-kind forest: grown trees, the slots it can't hold dimmed, FULL!: ${JSON.stringify(r)}`);
  check(r.plotsAfterEmpty === 0, `no soil patches with no parcels left: ${r.plotsAfterEmpty}`);
  check(r.plotsWithParcels >= 1, `soil patches come back with parcels (positive control): ${r.plotsWithParcels}`);

  // Uneven gaps: the spacing range itself (Phaser.Math.Between over PARCEL.plotEvery) is wide.
  const gaps = await p.evaluate(async () => { const s = game.scene.getScene('game'); const out = [];
    for (let i = 0; i < 40; i++) { const a = s.nextPlotAt; s.parcels = 5; s.nextPlotAt = s.distancePx; const d0 = s.nextPlotAt; await new Promise(r => setTimeout(r, 30)); if (s.nextPlotAt > d0) out.push(s.nextPlotAt - d0); }
    return out; });
  const lo = Math.min(...gaps), hi = Math.max(...gaps);
  check(gaps.length >= 10 && hi - lo > 250, `soil patch gaps vary a lot (${gaps.length} gaps, ${lo}..${hi})`);

  console.log({ r, gaps: [lo, hi, gaps.length], fails, errs });
  await b.close();
  if (fails.length || errs.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
