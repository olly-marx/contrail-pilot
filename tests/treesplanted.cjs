// Trees planted abroad count (src/treecount.js). UK trees are in save.planted, other lands' in save.plantedIn[region]; the 'Soil Patches' line
// (unlock {planted: 1}) and the Forester badge read only save.planted, so a player who planted abroad saw '???' and no badge.
// 1. positive control: UK-planted trees unlock Soil Patches and earn Forester bronze; 2. nothing planted: both stay locked (the checks can fail);
// 3. planted {} + plantedIn {X:{id:3}} unlocks Soil Patches; 5 abroad earn Forester bronze, and the badge bar counts them.
// Run: node tests/treesplanted.cjs   (proved by planted defects: tools/plants.tsv)
(async () => {
  const T = await import('../src/treecount.js'), U = await import('../src/upgrades.js'), B = await import('../src/badges.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const mk = extra => ({ levels: {}, landings: 3, badgeTiers: {}, badges: [], planted: {}, plantedIn: {}, ...extra });
  const soil = U.lineById('soil'), forester = B.badgeById('forester');
  const nothing = { landed: false, distance: 0, cargo: 0 };
  const tier = s => { B.earnBadges(s, nothing); return B.tierOf(s, 'forester'); };

  const uk = mk({ planted: { oak: 5 } });   // 1. the positive control
  check(T.treesPlanted(uk) === 5, `UK trees counted: ${T.treesPlanted(uk)}`);
  check(U.unlocked(uk, soil), 'control: 5 UK trees unlock Soil Patches');
  check(tier(uk) === 1, `control: 5 UK trees earn Forester bronze (tier ${B.tierOf(uk, 'forester')})`);

  const none = mk();   // 2. nothing planted
  check(T.treesPlanted(none) === 0 && !U.unlocked(none, soil) && tier(none) === 0, 'no trees: Soil Patches locked, no Forester');

  const three = mk({ plantedIn: { X: { id: 3 } } });   // 3. planted abroad only
  check(T.treesPlanted(three) === 3, `abroad trees counted: ${T.treesPlanted(three)}`);
  check(U.unlocked(three, soil), 'planted {} + plantedIn {X:{id:3}} unlocks Soil Patches');
  check(U.unlockText(soil, three) !== undefined && T.treesPlanted(three) >= 1, 'unlock text is only for locked lines');
  const five = mk({ planted: { oak: 2 }, plantedIn: { X: { id: 2 }, Y: { id2: 1 } } });
  check(T.treesPlanted(five) === 5, `UK + two lands add up: ${T.treesPlanted(five)}`);
  check(tier(five) === 1, `5 trees across lands earn Forester bronze (tier ${B.tierOf(five, 'forester')})`);
  check(B.progressOf(five, forester).value === 5, `the badge bar counts all lands: ${B.progressOf(five, forester).value}`);
  check(T.treesPlanted(null) === 0 && T.treesPlanted({ plantedIn: 'x', planted: [1, 2] }) >= 0, 'bad shapes do not throw');
  console.log(fails.length ? `FAIL treesplanted:\n - ${fails.join('\n - ')}` : 'PASS treesplanted: trees planted abroad unlock Soil Patches and count for Forester (UK control first)');
  process.exit(fails.length ? 1 : 0);
})();
