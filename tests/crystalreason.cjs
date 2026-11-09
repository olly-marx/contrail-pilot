// WHY A PATCH PAID NO CRYSTAL, and the widened 'in your path' (src/sim/rules.js crystalReason; the user, 2026-11-09). Plain Node on the sim engine (the game's own rules), night and day, one icy-air patch per case:
//   a. a patch level with the plane when it is still FAR (on screen, more than 120 px ahead) that the player then avoids earns 1 crystal (it used to count only within 120 px);
//   b. a patch that never lined up with the plane: no crystal, reason 'notheading'; c. by day: 'day'; d. the plane flew into it: 'touched' (and a contrail, no crystal); e. a fake patch: 'fake';
//   f. tonight's cap used up: 'limit'. Each reason is told once, and the paid case tells nothing. Plants: tools/plants.tsv, test `crystalreason`. Run: node tests/crystalreason.cjs
(async () => {
  const { createWorld } = await import('../src/sim/world.js'), { CRYSTAL_WHY } = await import('../src/tips.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99, crystals: 0, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const DT = 1 / 60;
  function pass({ night = true, mode, fake = false, capUsed = false, farX = 160 }) {   // mode: 'near' (passes 25 px above), 'through', 'dive' (avoids at the last moment), 'early' (level while far, avoids at once)
    const w = createWorld(save, 1), reasons = []; w.onNoCrystal = r => reasons.push(r);
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(DT);
    w.explain = () => false; w.hitsStorm = () => false; w.hitBird = () => false;
    w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.storms = []; w.nextStormAt = w.nextIssrAt = w.nextTurbAt = w.nextBirdsAt = 1e9; w.issrs = [];
    const clock = night ? 19 : 2; w.clock = clock; w.heat = 0; w.graceUntil = 0; if (capUsed) w.nightDodges = w.kit.dodgesPerNight;
    const y = 250, h = 60, i = w.addIssrAt(w.plane.x + farX, mode === 'near' ? y - h - 25 : y - h / 2, 120, h); i.fake = !!fake;
    let py = y - 6, most = 0;
    for (let n = 0; n < 5.5 * 60; n++) {
      most = Math.max(most, w.contrails.length);
      const gap = i.x - (w.plane.x + 50);
      if (mode === 'dive' && gap < 40) py = y + h / 2 + 4;
      if (mode === 'early' && gap < farX - 70) py = y + h / 2 + 40;   // out of the patch's height while it is still far
      w.plane.y = py; w.plane.vy = 0; w.heat = 0; w.clock = clock;
      w.step(DT);
    }
    return { crystals: w.crystals, reasons, contrails: most };
  }
  const early = pass({ mode: 'early', farX: 200 }), near = pass({ mode: 'near' }), day = pass({ night: false, mode: 'dive' }), through = pass({ mode: 'through' }), fake = pass({ mode: 'dive', fake: true }), capped = pass({ mode: 'dive', capUsed: true }), dive = pass({ mode: 'dive' });
  check(dive.crystals === 1 && dive.reasons.length === 0, `control: a patch level with the plane that it dives under at the last moment pays 1 and tells nothing: ${JSON.stringify(dive)}`);
  check(early.crystals === 1 && early.reasons.length === 0, `a patch level with the plane while still far and then avoided pays 1: ${JSON.stringify(early)}`);
  check(near.crystals === 0 && near.reasons.join() === 'notheading', `a patch that never lined up: no crystal, reason notheading: ${JSON.stringify(near)}`);
  check(day.crystals === 0 && day.reasons.join() === 'day', `by day: no crystal, reason day: ${JSON.stringify(day)}`);
  check(through.crystals === 0 && through.contrails > 0 && through.reasons.join() === 'touched', `flown into: a contrail, no crystal, reason touched: ${JSON.stringify(through)}`);
  check(fake.crystals === 0 && fake.reasons.join() === 'fake', `a fake patch: reason fake: ${JSON.stringify(fake)}`);
  check(capped.crystals === 0 && capped.reasons.join() === 'limit', `tonight's cap used up: reason limit: ${JSON.stringify(capped)}`);
  check(Object.keys(CRYSTAL_WHY).sort().join() === 'day,fake,limit,notheading,touched' && Object.values(CRYSTAL_WHY).every(t => t.length <= 28), `the five reason lines exist and fit 28 characters: ${JSON.stringify(CRYSTAL_WHY)}`);
  console.log(fails.length ? `FAIL crystalreason:\n - ${fails.join('\n - ')}` : 'PASS crystalreason: the widened path pays, and every unpaid patch has its one reason');
  process.exit(fails.length ? 1 : 0);
})();
