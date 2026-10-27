// Ice crystals (Node port of the dodge half of tests/crystals.cjs, test-speed batch 3): dodging icy air you saw coming at night earns a
// crystal and it is kept after a crash; a daytime dodge earns none; icy air that was never in your path earns none; a night contrail
// earns none. Runs on the sim engine (the game's own rules). The old test also checked the classic 'trees -> seeds' save migration (a
// retired save), the NATURE buy button and the hangar/NATURE tab split (screens): those stay in the browser tier / are triaged separately.
// PLANTS (edit src/sim/rules.js; each must FAIL this test):
//   no dodge crystal:  sed -i 's/this.earnCrystals(this.kit.dodgeCrystals, /this.earnCrystals(0 * this.kit.dodgeCrystals, /' src/sim/rules.js
//   day counts:        sed -i 's/if (!i.fake \&\& i.inPath \&\& !i.entered \&\& !this.isDay \&\&/if (!i.fake \&\& i.inPath \&\& !i.entered \&\&/' src/sim/rules.js
//   no path needed:    sed -i 's/if (!i.fake \&\& i.inPath \&\& !i.entered \&\& !this.isDay/if (!i.fake \&\& !i.entered \&\& !this.isDay/' src/sim/rules.js
//   contrail ok:       sed -i 's/if (!i.fake \&\& i.inPath \&\& !i.entered \&\& !this.isDay/if (!i.fake \&\& i.inPath \&\& !this.isDay/' src/sim/rules.js
//   lost on crash:     sed -i 's/this.save.crystals = (this.save.crystals || 0) + this.crystals;/this.save.crystals = (this.save.crystals || 0) + (landed ? this.crystals : 0);/' src/sim/rules.js
// Plain Node, ~1 s. Run: node tests/sim-crystals.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99, crystals: 0,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const DT = 1 / 60;
  function pass({ night, through, dive = false }) {
    const w = createWorld(save, 1);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(DT);
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false;
    w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.storms = []; w.nextStormAt = w.nextIssrAt = w.nextTurbAt = w.nextBirdsAt = 1e9; w.issrs = [];
    const clock = night ? 15 + 4 : 2; w.clock = clock; w.heat = 0; w.graceUntil = 0;
    const y = 250, h = 60;
    // through: flies the middle. dive: icy air level with the plane, which dives under it at the last moment. Otherwise: passes 25 px above.
    const i = w.addIssrAt(w.plane.x + 160, through || dive ? y - h / 2 : y - h - 25, 120, h);
    let py = y - 6, most = 0;
    for (let n = 0; n < 4.5 * 60; n++) {   // 4.5 s, as the browser test
      most = Math.max(most, w.contrails.length);
      if (dive && i.x - (w.plane.x + 50) < 40) py = y + h / 2 + 4;
      w.plane.y = py; w.plane.vy = 0; w.heat = 0; w.clock = clock;
      w.step(DT);
    }
    const crystals = w.crystals;
    w.plane.y = 600; for (let n = 0; n < 120 && w.state !== 'over'; n++) w.step(DT);   // crash: crystals are still banked
    return { crystals, contrails: most, saved: w.save.crystals, over: w.state === 'over' };
  }
  const nightDodge = pass({ night: true, through: false, dive: true });
  const nightNear = pass({ night: true, through: false });
  const dayDodge = pass({ night: false, through: false, dive: true });
  const nightThrough = pass({ night: true, through: true });
  check(nightDodge.crystals === 1, `dodging icy air at night should earn 1 crystal: ${JSON.stringify(nightDodge)}`);
  check(nightDodge.over && nightDodge.saved === 1, `crystals should be kept after a crash: ${JSON.stringify(nightDodge)}`);
  check(nightNear.crystals === 0, `icy air that was never in your path should earn none: ${JSON.stringify(nightNear)}`);
  check(dayDodge.crystals === 0, `dodging icy air by day should earn none: ${JSON.stringify(dayDodge)}`);
  check(nightThrough.contrails > 0 && nightThrough.crystals === 0, `a night contrail should earn none: ${JSON.stringify(nightThrough)}`);
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS sim-crystals', JSON.stringify({ nightDodge, nightNear, dayDodge, nightThrough }));
})();
