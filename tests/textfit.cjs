// In-flight text must fit its box (0.11.3, the user: the airport call ran off the screen, the new-biome banner did not fit,
// the DROP button showed the tree's name). Measured on the live scene's text objects at 390 and 320 px wide (the game
// is 288 game-px wide and scaled to fit, so fitting 288 means fitting any phone). Longest names are used on purpose.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/textfit.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  for (const width of [390, 320]) {
    const p = await b.newPage({ viewport: { width, height: 700 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(() => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      freeGiven: true, priceVersion: 2, seeds: 50, flights: 5, landings: 4, levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } })); });
    await p.goto(URL); await ready(p); await p.waitForTimeout(500);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 30000 });
    const m = await p.evaluate(async () => {
      const s = game.scene.getScene('game'), W = s.scale.gameSize.width, out = {};
      const { CITIES } = await import('./src/cities.js'), { REGION_NAMES } = await import('./src/habitats.js');
      const longest = [...CITIES].sort((a, b) => b.name.length - a.name.length)[0].name;
      // 1. the airport call, in each of its forms, with the longest city name
      s.nextAirport = { ...s.nextAirport, name: longest }; out.longest = longest;
      const forms = [() => { s.nextAirport.worldX = s.distancePx + 200; }, () => { s.nextAirport.worldX = s.distancePx - 5; }, () => { s.nextAirport.worldX = s.distancePx + 50000; s.missedSign = { text: `Passed ${longest}. Next: ${longest}`, until: s.gameTime + 4000 }; }];
      out.airport = forms.map(f => { f(); s.updateTexts(false); return { text: s.nextText.text, w: s.nextText.width, x: s.nextText.x }; });
      // 2. the biome banner for every land, and the discovery popup
      out.banners = Object.keys(REGION_NAMES).map(r => { s.regionBanner(r); const c = s.banner, t = c.list.filter(o => o.text !== undefined); const bg = c.list[0];
        return { r, texts: t.map(o => o.text), widths: t.map(o => o.width), box: bg.width, bgH: bg.height, bottom: Math.max(...t.map(o => o.y + o.height / 2)) }; });
      out.popup = Object.keys(REGION_NAMES).map(r => { s.popups.length = 0; s.popup(W / 2, 100, `YOU DISCOVERED:\n${REGION_NAMES[r].toUpperCase()}!`, '#8dffb0', 12); const t = s.popups[s.popups.length - 1].t; return { r, w: t.width, left: t.x - t.width / 2, right: t.x + t.width / 2 }; });
      // 3. the DROP button label
      s.parcels = 12; s.kit.tree = s.kit.tree || { parcels: 12 }; s.state = 'playing'; s.regionNow = 'woodland'; s.updateTexts(false);
      out.drop = { text: s.dropLabel.text, w: s.dropLabel.width, h: s.dropLabel.height, box: s.dropBox, shown: s.dropShown };
      out.W = W; out.canvas = (() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { w: r.width, vw: innerWidth }; })();
      return out;
    });
    const tag = `${width}px`;
    check(m.canvas.w <= width + 1, `${tag}: the canvas is ${m.canvas.w} px wide`);
    m.airport.forEach((a, i) => check(a.w <= m.W - 8, `${tag}: airport call ${i} "${a.text}" is ${Math.round(a.w)} game-px wide, the screen is ${m.W}`));
    check(m.airport.every(a => a.text), `${tag}: every form of the airport call must have text: ${JSON.stringify(m.airport.map(a => a.text))}`);
    m.banners.forEach(bn => { bn.widths.forEach((w, i) => check(w <= bn.box - 6, `${tag}: banner ${bn.r} text "${bn.texts[i]}" is ${Math.round(w)} wide in a ${bn.box} box`));
      check(bn.bottom <= bn.bgH / 2, `${tag}: banner ${bn.r} text runs below its box (${bn.bottom} > ${bn.bgH / 2})`); check(bn.box <= m.W, `${tag}: banner ${bn.r} box wider than the screen`); });
    m.popup.forEach(q => check(q.left >= 0 && q.right <= m.W, `${tag}: the discovery popup for ${q.r} spans ${Math.round(q.left)}..${Math.round(q.right)} of ${m.W}`));
    check(m.drop.shown && m.drop.text === `SEND A\nSEED x12`, `${tag}: the DROP button label should be "SEND A / SEED x12", is ${JSON.stringify(m.drop.text)} (shown ${m.drop.shown})`);
    check(m.drop.w <= m.drop.box.w - 6 && m.drop.h <= m.drop.box.h - 4, `${tag}: the DROP label is ${Math.round(m.drop.w)}x${Math.round(m.drop.h)} in a ${m.drop.box.w}x${m.drop.box.h} button`);
    check(p.errs.length === 0, `${tag}: page errors: ${p.errs.join(' | ')}`);
    await p.close();
  }
  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('textfit OK: airport call, biome banner, discovery popup and the DROP label fit at 390 and 320 px');
})();
