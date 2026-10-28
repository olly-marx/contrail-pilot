// The first tree parcels are FREE in season 2 once lesson L4 is done (the user, 2026-10-28: L5 must never be blocked by
// money; the Forecasting system cost exactly the same 25 seeds + 3 crystals and a rail said "buy it"). Free once; the
// next level costs; not before L4; not in classic. Plant: freeParcels always false -> must FAIL. Plain Node.
(async () => {
  const U = await import('../src/upgrades.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const s2 = x => ({ areas: ['easia'], homeArea: 'easia', missionsDone: ['L1', 'L2', 'L3', 'L4'], seeds: 0, crystals: 0, levels: {}, ...x });
  let s = s2({});
  check(U.freeParcels(s, 'trees') && U.buyLevel(s, 'trees') && s.levels.trees === 1 && s.seeds === 0 && s.crystals === 0 && s.freeParcelsGiven, `after L4, 0 seeds/0 crystals: the first parcels are free (${JSON.stringify(s.levels)})`);
  check(!U.buyLevel(s, 'trees') && s.levels.trees === 1, 'free once: the next level costs (and 0 seeds cannot buy it)');
  s = s2({ missionsDone: ['L1', 'L2', 'L3'] }); check(!U.freeParcels(s, 'trees') && !U.buyLevel(s, 'trees'), 'not before L4 (one new thing at a time)');
  s = { missionsDone: ['L4'], seeds: 0, crystals: 0, levels: {} }; check(!U.freeParcels(s, 'trees'), 'classic (no areas): not free');
  s = s2({ freeUpgrade: true }); U.buyLevel(s, 'trees'); check(s.freeUpgrade === true, 'the free parcels do not use up the free hangar part');
  check(!U.freeParcels(s2({}), 'forecast'), 'only the parcels line');
  if (fails.length) { console.log('FAIL freeparcels\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS freeparcels: after L4 the first tree parcels are free (once, season 2 only, not before L4)');
})();
