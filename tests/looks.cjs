// Upgrade looks (0.10.4, art session's approved art): bought plane-line levels show on the plane in flight
// (a composed 'plane-look' texture) and in the hangar picture; Engines and Cabin show only their newest look,
// Wings & body all; gadget stickers by era; the airport tower follows your ATC level and a weather station
// your Forecasting era. Collisions are unchanged (still alphaMask('plane'): tests/collisions.cjs).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/looks.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const F = await import('../src/fleet.js');
  const parts = (id, lv) => F.lookParts(id, lv).map(x => x.part).join();
  check(parts('jumbo', { engines: 3, body: 3, cabin: 3 }) === 'nextgen,upperdeck,winglet,glass,business', `747 all: newest engines, every body part, newest cabin look: ${parts('jumbo', { engines: 3, body: 3, cabin: 3 })}`);
  check(parts('jumbo', { cabin: 2 }) === '', 'levels with no look add nothing');
  check(parts('twin', { engines: 3 }) === 'giantfan', `the twin's engines 3 (no look) keeps the giant fan: ${parts('twin', { engines: 3 })}`);
  check(!F.lookFiles('jumbo', { body: 2 }, 'flight').parts.includes('plane-747-winglet') && F.lookFiles('jumbo', { body: 2 }, 'hangar').parts.some(p => /winglet/.test(p)), 'winglets: hangar only');

  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fly = async fleet => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(f => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 30, landings: 9, seeds: 400, crystals: 60, flightSeconds: 1500, priceVersion: 2, levels: {}, fleet: f })); }, fleet);
    await p.goto(URL); await ready(p); await p.waitForTimeout(400);
    await p.click('#tabHangar');
    // The composed picture is drawn when its images have loaded: wait for it (up to 6 s; plain if nothing is bought).
    await p.waitForFunction(() => /^data:/.test(document.querySelector('#hFleet .fpreview img').getAttribute('src')), null, { timeout: 6000 }).catch(() => {});
    const hangarSrc = await p.evaluate(() => document.querySelector('#hFleet .fpreview img').getAttribute('src').slice(0, 30));
    await p.click('#tabFly'); await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(() => { const s = game.scene.getScene('game'); s.graceUntil = 1e12;
      const key = s.planeSprite.texture.key;
      // How many pixels the look changes vs the plain sprite.
      const px = k => { const img = s.textures.get(k).getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      let changed = 0; if (key === 'plane-look') { const a = px('plane-look'), b = px('plane-747'); for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 3] !== b[i + 3]) changed++; }
      s.addRunway(s.distancePx + 400, 'TEST');
      const tex = s.runways[s.runways.length - 1].parts.filter(o => o.texture && /^(tower|station)/.test(o.texture.key)).map(o => o.texture.key);
      return { key, changed, stickers: s.planeParts.map(o => o.img.texture.key).filter(k => k.startsWith('sticker-')), tex: [...new Set(tex)] }; });
    r.hangarSrc = hangarSrc; r.errs = errs;
    await p.close();
    return r;
  };
  const plain = await fly({ plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} });
  const full = await fly({ plane: 'jumbo', planes: { jumbo: { engines: 3, body: 3, cabin: 3 } }, systems: { atc: 4, forecast: 3 }, gadgets: { magnet: 3, gear: 1, autopilot: 6 } });
  check(plain.key === 'plane-747' && !plain.stickers.length && plain.tex.join() === 'tower' && /plane-hangar-jumbo/.test(plain.hangarSrc), `nothing bought: the plain 747, old tower, no station: ${JSON.stringify(plain)}`);
  const gadgetsOnly = await fly({ plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: { magnet: 1 } });
  check(/^data:image\/png/.test(gadgetsOnly.hangarSrc) && gadgetsOnly.key === 'plane-747', `a gadget alone shows in the hangar picture (overlay): ${gadgetsOnly.hangarSrc}`);
  check(full.key === 'plane-look' && full.changed > 100, `upgraded 747 in flight: composed look changes ${full.changed} pixels`);
  check(/^data:image\/png/.test(full.hangarSrc), `upgraded 747 in the hangar: composed picture: ${full.hangarSrc}`);
  check(['sticker-magnet-1970s', 'sticker-gear-1950s', 'sticker-auto-1990s'].every(k => full.stickers.includes(k)), `stickers by era of the level: ${full.stickers}`);
  check(full.tex.includes('tower-4') && full.tex.includes('station-1970s'), `airport: tower 4 for ATC 4, 1970s station for Forecasting 3: ${full.tex}`);
  check(!plain.errs.length && !full.errs.length, `page errors: ${plain.errs} ${full.errs}`);
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
