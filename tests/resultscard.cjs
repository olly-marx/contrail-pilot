// The RESULTS card as data (src/resultscard.js; research/UX-MASTER-PLAN.md C1, F2/F4 R1). No browser: every line is held to its budget at the 320 px phone
// (8 px Pixel font = 1 em a character, 264 px of text = 33 characters; the 16 px title 16 characters), on the declared variants (landed / seven missions /
// animal + badge / plain / crash / first part / school), with the LONGEST city and big numbers. Then the meaning: the bank is what the flight ADDED, a
// crash loses the seeds it carried, missions are a count, Firsts are chips, chips are capped. The browser half (tests/fitscreen.cjs) proves the card fits.
// Run: node tests/resultscard.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const R = await import('../src/resultscard.js'), N = await import('../src/nextup.js'), M = await import('../src/missions2.js'), A = await import('../src/areas.js');
  const longest = Object.values(A.AREAS).flatMap(a => a.cities || []).sort((a, b) => b.length - a.length)[0];
  const save = { areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, flightSeconds: 600,
    fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  M.setDaily(save, '2026-11-03');
  const next = N.nextUp(save, { limit: R.NEXT_ROWS });
  const MISSIONS7 = ['Dodge 3 icy patches at night', 'A whole night with no contrail over Australian bush', 'Pass 4 storm gaps in one flight', 'Spot a wedge-tailed eagle from the air', 'Plant 3 kinds of tree', 'Land at PERTH', 'Buy a helper system for your plane'];
  const prizes = MISSIONS7.map((t, i) => ({ key: `mission:m${i}`, kind: 'mission', id: `m${i}`, label: t, seeds: 15 + 5 * i, crystals: 1 }));
  const badge = { key: 'badge:frequent:1', kind: 'badge', id: 'frequent', tier: 1, label: 'Frequent Flyer', seeds: 20, crystals: 2 };
  const flight = (over = {}) => ({ landed: true, landedAt: longest, reason: 'You hit the ground!', distance: 99990, heat: 20, breakdown: { co2: 152, night: 7, sun: 134, trees: 28 },
    earned: [{ label: 'Seeds grabbed in the sky', n: 123 }, { label: 'Long flight bonus x12', n: 400 }, { label: 'Cool Earth bonus', n: 3 }, { label: 'Passenger fares', n: 12 }], mult: 12.5, kinds: 3,
    natureGains: [{ name: 'Australian bush', gain: 4 }], crystals: 7, eraOpened: null, school: false, newRecord: true, rewards: [], foundIds: [], missions2: { done: [], next: null }, mission: null, ...over });
  const paidOf = rw => ({ seeds: rw.reduce((a, u) => a + u.seeds, 0), crystals: rw.reduce((a, u) => a + u.crystals, 0) });
  const VARIANTS = {
    rich: flight({ rewards: [...prizes, badge], foundIds: ['murraycod'], missions2: { done: MISSIONS7, next: null } }),
    seven: flight({ rewards: prizes, missions2: { done: MISSIONS7, next: null } }),
    animalbadge: flight({ rewards: [prizes[0], badge], foundIds: ['murraycod'], missions2: { done: [MISSIONS7[0]], next: null } }),
    plain: flight({ newRecord: false }),
    crash: flight({ landed: false, newRecord: false, crystals: 2, earned: [{ label: 'Seeds grabbed in the sky', n: 23, lost: true }] }),
    first: flight({ newRecord: false }),
    school: flight({ school: true, earned: [], crystals: 0, newRecord: false }),
  };
  check(Object.keys(VARIANTS).length >= 7, 'the 7 declared variants are all built');
  const LINE = R.LINE_MAX;
  for (const [name, r] of Object.entries(VARIANTS)) {
    const v = R.resultsView(r, save, { paid: paidOf(r.rewards), next, lead: name === 'first' ? 'hangar' : null });
    const tag = `${name}`;
    check(v.title.length <= 16, `${tag}: the 16 px title "${v.title}" is ${v.title.length} characters (max 16 at 320)`);
    check(v.eyebrow.length <= 20, `${tag}: eyebrow "${v.eyebrow}"`);
    check(v.maths.length <= LINE, `${tag}: maths line "${v.maths}" is ${v.maths.length} (max ${LINE})`);
    if (v.missions) { check(v.missions.line.length <= 24 && (v.missions.line + ` +${v.missions.seeds} ›`).length <= LINE, `${tag}: missions line "${v.missions.line}" + prize fits ${LINE}`); }
    if (v.earth) { check(v.earth.warm.length <= LINE && v.earth.cool.length <= LINE, `${tag}: earth lines "${v.earth.warm}" / "${v.earth.cool}" fit ${LINE}`); }
    for (const n of v.next) check(n.short.length <= 24 && n.right.length <= 9 && (n.short.length + n.right.length) <= LINE, `${tag}: UP NEXT row "${n.short}" | "${n.right}" fits`);
    check(v.next.length <= R.NEXT_ROWS, `${tag}: at most ${R.NEXT_ROWS} UP NEXT rows (${v.next.length})`);
    check(v.chips.length <= R.CHIPS_MAX && v.chips.every(c => c.label.length <= 11), `${tag}: at most ${R.CHIPS_MAX} chips, labels <= 11 characters: ${JSON.stringify(v.chips.map(c => c.label))}`);
    check(v.dist.length <= 10, `${tag}: the 26 px distance "${v.dist}" fits (max 10 characters at 320)`);
    const text = JSON.stringify([v.maths, v.missions && v.missions.line, v.earth && v.earth.warm, v.next.map(n => n.short)]);
    check(!/fact|CLAIM|Claim/.test(text), `${tag}: no random fact and no CLAIM wording on the card`);
  }
  // Meaning.
  const seven = R.resultsView(VARIANTS.seven, save, { paid: paidOf(VARIANTS.seven.rewards), next }), total = 123 + 400 + 3 + 12, prize7 = paidOf(prizes);
  check(seven.missions && seven.missions.line === '✓ 7 missions done' && seven.missions.seeds === prize7.seeds && seven.missions.titles.length === 7, `7 missions are a COUNT with their seeds: ${JSON.stringify(seven.missions && [seven.missions.line, seven.missions.seeds])}`);
  check(seven.bank.seeds === total + prize7.seeds && seven.bank.crystals === 7 + prize7.crystals && seven.bank.lost === 0, `the bank is everything this flight ADDED (carried ${total} + prizes ${prize7.seeds}): ${JSON.stringify(seven.bank)}`);
  const one = R.resultsView(VARIANTS.animalbadge, save, { paid: paidOf(VARIANTS.animalbadge.rewards), next });
  check(one.missions && one.missions.line.startsWith('✓ Dodge 3 icy') && one.chips.map(c => c.kind).join() === 'animal,badge', `1 mission shows its name; the animal and the badge are chips: ${JSON.stringify([one.missions && one.missions.line, one.chips.map(c => c.kind)])}`);
  const crash = R.resultsView(VARIANTS.crash, save, { paid: { seeds: 0, crystals: 0 }, next });
  check(crash.bank.seeds === 0 && crash.bank.lost === 23 && crash.bank.crystals === 2 && /lost/.test(crash.maths) && crash.eyebrow === 'CRASHED:' && crash.title === 'The ground', `a crash loses what it carried, keeps the crystals, and says what it hit: ${JSON.stringify([crash.bank, crash.maths, crash.title])}`);
  const school = R.resultsView(VARIANTS.school, save, { next: [] });
  check(school.school && !school.earth && !school.era && !school.maths && /SCHOOL/.test(school.eyebrow), `flight school: no maths, Earth or era: ${JSON.stringify([school.eyebrow, school.maths])}`);
  const FIRST = M.FIRSTS[0], withFirst = R.resultsView(flight({ missions2: { done: [FIRST.title, MISSIONS7[0]], next: null } }), save, { next });
  check(withFirst.chips.some(c => c.kind === 'first' && c.full === FIRST.title) && withFirst.missions && withFirst.missions.titles.length === 1, `a First is a chip, not a mission: ${JSON.stringify(withFirst.chips.map(c => c.kind))}`);
  const many = R.resultsView(flight({ rewards: [badge, { ...badge, id: 'g2', key: 'badge:g2:1' }, { ...badge, id: 'g3', key: 'badge:g3:1' }, { ...badge, id: 'g4', key: 'badge:g4:1' }, { ...badge, id: 'g5', key: 'badge:g5:1' }], foundIds: ['murraycod'] }), save, { next });
  check(many.chips.length === R.CHIPS_MAX && many.moreChips === 3 && many.allChips.length === 6, `chips are capped at ${R.CHIPS_MAX} and the rest are "+N more": ${many.chips.length} + ${many.moreChips}`);
  check(R.crashTitle('Bird strike!\nYou hit a bird.') === 'A bird' && R.crashTitle('Storm!\nYou flew into a storm.') === 'A storm' && R.crashTitle('Restricted airspace!\nFlight stopped.') === 'No-fly zone' && R.crashTitle('The planet got too hot!\nFlight grounded.') === 'Too hot', 'every real crash reason has a short title');
  const classic = R.resultsView(flight({ missions2: null, mission: { done: true, title: 'Land at PARIS', fail: '' }, rewards: [{ key: 'mission:land', kind: 'mission', id: 'land', label: 'Land at PARIS', seeds: 15, crystals: 1 }] }), { ...save, areas: undefined }, { paid: { seeds: 15, crystals: 1 }, next: [] });
  check(classic.missions && /PARIS/.test(classic.missions.line) && classic.missions.seeds === 15, `season 1: the one mission's outcome and prize on the line: ${JSON.stringify(classic.missions)}`);
  console.log(fails.length ? `FAIL resultscard:\n - ${fails.join('\n - ')}` : `PASS resultscard: 7 variants, the longest city "${longest}", every line within its 320 px budget; the bank, missions-as-a-count, chips and crash rules hold`);
  process.exit(fails.length ? 1 : 0);
})();
