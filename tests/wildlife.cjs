// Wildlife + exhaust check: bare land is sparse (spruce only, no wild animals, no birds) and gets
// fuller and more varied as Biodiversity grows; the exhaust is grey on normal fuel and turns to white
// vapour on hydrogen; Greener Cabin lowers CO2.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/wildlife.cjs
const { chromium } = require('playwright-core');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const KEY = 'contrailPilot.v2';
const BARE = { planted: { spruce: 2 }, levels: { trees: 1 } };
const WILD = { planted: { spruce: 3, birch: 4, oak: 4, rowan: 4, orchard: 4 }, levels: { trees: 1, species: 4, rewild: 6, fuel: 4, engine: 3, cabin: 4 }, fuel: 'hydrogen' };

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], errs = [];
  const check = (c, m) => { if (!c) fails.push(m); };

  async function fly(save) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(([k, s]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 5, ...s })); }, [KEY, save]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#goBtn');
    await p.waitForFunction(() => { const s = game.scene.getScene('game'); return s.sys.isActive() && s.life && s.state !== 'idle'; }, null, { timeout: 15000 });   // the scene restarts on TAKE OFF
    // Collect what appears over a few seconds: animals are random (cows/sheep ~1.5 a screen, none on
    // the runway), so one snapshot right after take-off sometimes has none yet (failed CI once).
    const seen = new Set();
    for (let i = 0; i < 20; i++) { await p.mouse.click(195, 300); await p.waitForTimeout(200);
      (await p.evaluate(() => game.scene.getScene('game').life.map(l => l.kind || l.img.texture.key))).forEach(k => seen.add(k)); }
    const r = await p.evaluate(seen => { const s = game.scene.getScene('game');
      const kinds = new Set([...seen, ...s.life.map(l => l.kind || l.img.texture.key)]);
      return { w: s.wildlife, kinds: [...kinds], sky: s.life.filter(l => (l.kind || '').startsWith('sky-')).length,
        grey: s.puffs.filter(p => p.img.tintTopLeft !== 0xffffff).reduce((m, p) => Math.max(m, p.a0), 0),
        white: s.puffs.filter(p => p.img.tintTopLeft === 0xffffff).reduce((m, p) => Math.max(m, p.a0), 0),
        co2: s.kit.co2Cruise }; }, [...seen]);
    await p.close();
    return r;
  }
  const bare = await fly(BARE), wild = await fly(WILD);
  const cabinOnly = await fly({ ...BARE, levels: { trees: 1, cabin: 4 } });

  check(bare.w.treeKinds.join() === 'spruce', `bare land trees should all be spruce: ${bare.w.treeKinds}`);
  check(bare.w.wildKinds.length === 0 && bare.sky === 0, `bare land should have no wild animals or birds: ${bare.kinds}`);
  check(bare.kinds.some(k => /animal-(cow|sheep)/.test(k)), 'bare land should still have a few cows/sheep');
  check(wild.w.treesPerScreen > 3 * bare.w.treesPerScreen, `high biodiversity should have many more trees (${wild.w.treesPerScreen} vs ${bare.w.treesPerScreen})`);
  check(wild.w.treeKinds.length >= 4, `high biodiversity should show several tree kinds: ${wild.w.treeKinds}`);
  check(wild.sky > 0 && wild.w.wildKinds.length >= 3, `high biodiversity should have birds (${wild.sky}) and wild animals (${wild.w.wildKinds})`);
  check(bare.grey > 0.4, `normal fuel exhaust should be clearly grey (alpha ${bare.grey})`);
  check(wild.grey < 0.3 * bare.grey && wild.white > 1.5 * bare.white, `hydrogen exhaust should be mostly white vapour, far less grey than normal fuel (hydrogen CO2 is 0.25 since 2026-10-21) (grey ${wild.grey}, white ${wild.white} vs ${bare.white})`);
  check(cabinOnly.co2 < bare.co2, `Greener Cabin should lower CO2 (${cabinOnly.co2} vs ${bare.co2})`);
  check(errs.length === 0, `page errors: ${errs}`);

  console.log({ bare: { kinds: bare.kinds, grey: bare.grey, white: bare.white }, wild: { kinds: wild.kinds, sky: wild.sky, grey: wild.grey, white: wild.white }, cabinCo2: cabinOnly.co2 });
  console.log(fails.length ? 'FAIL\n- ' + fails.join('\n- ') : 'PASS');
  process.exitCode = fails.length ? 1 : 0;
  await b.close();
})();
