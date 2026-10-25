// Biodiversity made clear (0.10.8, user): every land has its own meter, shown with the land's BIOME name
// (no "UK": that is where the projects come from); FLY shows the meter of the land you start in; NATURE says
// where the projects come from and how to raise the meter; entering a land in flight shows its name and
// meter; the results list each land whose meter rose; and rewilding brings a lot more life (steeper curve).
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/biodiversity.cjs
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const APPROVED = ['Temperate woodland', 'Mediterranean scrub', 'Desert', 'Monsoon forest', 'Temperate mountain forest', 'Boreal forest', 'Plains & forest', 'Tundra', 'African savanna', 'Tropical rainforest'];

(async () => {
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  const H = await import('../src/habitats.js'), N = await import('../src/nature.js');
  const names = Object.values(H.REGION_NAMES);
  check(names.every(n => APPROVED.includes(n)) && names.length === APPROVED.length, `every land has an approved biome name: ${names}`);
  check(!names.some(n => /\bUK\b/.test(n)), 'no land is called "UK"');
  check(Object.keys(H.REGION_NAMES).every(r => H.REGION_SOURCE[r]), 'every land says where its projects come from');
  // The steeper curve: the meter's slope is 0.28 trees per point (2 at 0, ~30 at 100).
  const all = H.REGION_DATA.savanna.projects.map(p => p.id);
  const lo = N.wildlifeScene({ planted: {}, habitat: {} }, 'savanna'), hi = N.wildlifeScene({ planted: {}, habitat: { savanna: all } }, 'savanna');
  check(lo.treesPerScreen === 2 && Math.abs((hi.treesPerScreen - lo.treesPerScreen) / hi.bio - 0.28) < 1e-9 && Math.abs((hi.wildPerScreen - lo.wildPerScreen) / hi.bio - 0.114) < 1e-9,
    `bare at 0, then +0.28 trees and +0.114 animals per point: ${JSON.stringify([lo.treesPerScreen, hi.bio, hi.treesPerScreen, hi.wildPerScreen])}`);

  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const open = async extra => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(x => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, priceVersion: 2, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: {} }, ...x })); }, extra);
    await p.goto(URL); await ready(p); await p.waitForTimeout(400);
    return p;
  };

  // FLY from Nadi: the way buttons name biomes, never "UK".
  let p = await open({ city: 'NADI' });
  const ways = await p.evaluate(() => [...document.querySelectorAll('#tJourney [data-way]')].map(b => b.textContent.replace(/\s+/g, ' ')));
  check(ways.length > 0 && !ways.some(t => /\bUK\b/.test(t)), `FLY way buttons from Nadi never say UK: ${ways}`);
  await p.close();

  // From Nairobi with savanna projects done: the FLY meter is the savanna's, labelled.
  p = await open({ city: 'NAIROBI', habitat: { savanna: all.slice(0, 2) }, discovered: { savanna: 1 } });
  const fly = await p.evaluate(() => document.getElementById('tMeter').textContent.replace(/\s+/g, ' '));
  check(/African savanna/.test(fly), `FLY shows the savanna's meter: "${fly}"`);
  // NATURE, savanna tab: name, source line, how to raise it.
  await p.click('#tabNature'); await p.waitForTimeout(300);
  await p.click('[data-region="savanna"]'); await p.waitForTimeout(300);
  const nat = await p.evaluate(() => (document.getElementById('wMeter').textContent + ' ' + document.getElementById('wMeterMore').textContent).replace(/\s+/g, ' '));
  check(/African savanna/.test(nat) && /Projects from Kenya/.test(nat) && /Raise it/.test(nat), `NATURE explains the savanna's meter: "${nat}"`);
  // In flight: the banner when the land changes, and the results row for a land whose meter rose.
  await p.click('#tabFly'); await p.click('#goBtn');
  await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
  const r = await p.evaluate(async all => { const s = game.scene.getScene('game'); s.graceUntil = 1e12;
    s.regionHere = () => 'rainforest'; s.setRegion('rainforest');
    const banner = s.banner ? { region: s.banner.regionId, text: s.banner.list[1].text + ': ' + s.banner.list[2].text } : null;
    s.save.habitat.savanna = all.slice(0, 4);   // two more savanna projects during the flight
    s.finish({ landed: true }); return { banner, gains: s.result.natureGains }; }, all);
  check(r.banner && r.banner.region === 'rainforest' && r.banner.text.startsWith('TROPICAL RAINFOREST: BIODIVERSITY'), `entering the rainforest shows its banner: ${JSON.stringify(r.banner)}`);
  check(r.gains.length === 1 && r.gains[0].name === 'African savanna' && r.gains[0].gain > 0, `results list the savanna's gain: ${JSON.stringify(r.gains)}`);
  await p.waitForFunction(() => !document.getElementById('results').hidden, null, { timeout: 10000 }); await p.click('#results'); await p.waitForTimeout(1200);
  const row = await p.evaluate(() => { const e = document.getElementById('rNatureRow'); return e.hidden ? '' : e.textContent; });
  check(/African savanna\+\d+/.test(row.replace(/\s+/g, '')) || /African savanna/.test(row), `the results show the savanna row: "${row}"`);
  check(!p.errs.length, `page errors: ${p.errs}`);
  await p.close();

  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL'); process.exit(1); }
  console.log('PASS');
})();
