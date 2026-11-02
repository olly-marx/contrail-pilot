// "New" dots (UX master plan B4): src/fresh.js is the ONE source of what is new. Node half, no browser. Run: node tests/newdot.cjs
// Checks the rules the UI relies on: separate scopes (NATURE cannot clear the hangar: the old ui.js:287 bug), 'seen' is only what
// markSeen recorded for THAT scope, a key that goes away and returns is new again, the migration marks everything already there as
// seen (no dot storm), tab dots roll up their sub-scopes.
// Plants (tools/plants.tsv): markSeen clears every scope; fresh ignores seen; markSeen unions instead of replacing.
const path = require('path');
const src = f => path.join(__dirname, '..', 'src', f);
(async () => {
  const { prepareSave } = await import(src('save.js'));
  const F = await import(src('fresh.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const rich = () => { const s = prepareSave(null); s.seeds = 1e6; s.crystals = 1e4; return s; };
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

  // POSITIVE CONTROL: a rich new save has something new in the hangar AND on NATURE, or nothing below proves anything.
  const s = rich(), f0 = F.fresh(s);
  const hs = Object.keys(f0).filter(k => k.startsWith('hangar/')), ns = Object.keys(f0).filter(k => k.startsWith('nature/'));
  check(hs.length >= 1, `a rich new save has nothing fresh in the hangar: ${JSON.stringify(Object.keys(f0))}`);
  check(ns.length >= 1, `a rich new save has nothing fresh on NATURE: ${JSON.stringify(Object.keys(f0))}`);
  const d0 = F.dots(s);
  check(d0.hangar === true && d0.nature === true, `tab dots should be lit: ${JSON.stringify(d0)}`);
  check(!F.dots(prepareSave(null)).hangar, 'a poor new save should have no hangar dot');

  // NATURE marks seen: the hangar's dot stays (the ui.js:287 bug).
  for (const sc of ns) F.markSeen(s, sc);
  const f1 = F.fresh(s);
  check(ns.every(sc => !has(f1, sc)), 'NATURE scopes still fresh after markSeen on them');
  check(hs.every(sc => has(f1, sc)), `marking NATURE seen cleared the hangar: ${JSON.stringify(Object.keys(f1))}`);
  check(F.dots(s).hangar === true && !F.dots(s).nature, `after NATURE is seen: hangar lit, nature dark: ${JSON.stringify(F.dots(s))}`);

  // Each hangar sub-screen clears only itself; the tab goes dark when the last one does.
  const order = hs.slice();
  order.forEach((sc, i) => {
    F.markSeen(s, sc);
    const f = F.fresh(s), last = i === order.length - 1;
    check(!has(f, sc), `${sc} still fresh after its own markSeen`);
    check(order.slice(i + 1).every(o => has(f, o)), `marking ${sc} cleared a sibling: ${JSON.stringify(Object.keys(f))}`);
    check(!!F.dots(s).hangar === !last, `hangar tab dot after ${i + 1}/${order.length} sub-screens seen: ${F.dots(s).hangar}`);
  });
  check(Object.keys(F.fresh(s)).length === 0, `everything seen but fresh = ${JSON.stringify(F.fresh(s))}`);
  check(F.markSeen(s, 'hangar/plane') === false, 'markSeen with nothing new should report no change (no needless write)');

  // A key that goes away (the seeds are spent) and comes back is new again; one that stays is not.
  const a = rich(); F.markSeen(a, hs[0]);
  check(!has(F.fresh(a), hs[0]), 'control: seen');
  a.seeds = 0; a.crystals = 0; F.markSeen(a, hs[0]);   // looked again while it could not be afforded
  a.seeds = 1e6; a.crystals = 1e4;
  check(has(F.fresh(a), hs[0]), `${hs[0]} became affordable again after being seen unaffordable: it should be new again`);

  // Migration: everything already there is seen, then NEW things show.
  const m = rich();
  check(F.migrateSeen(m) === true && F.migrateSeen(m) === false, 'migrateSeen runs once');
  check(Object.keys(F.fresh(m)).length === 0, `after migration nothing is fresh: ${JSON.stringify(F.fresh(m))}`);
  const p = prepareSave(null); F.migrateSeen(p); p.seeds = 1e6; p.crystals = 1e4;
  check(Object.keys(F.fresh(p)).some(k => k.startsWith('hangar/')), 'after migration, new money makes the hangar fresh');

  // Boards: a badge tier earned, a record beaten (later beats are new keys).
  const b = prepareSave(null); F.migrateSeen(b);
  b.badgeTiers = { ...(b.badgeTiers || {}), longhaul: 1 };
  check((F.fresh(b)['boards/badges'] || []).includes('badge:longhaul:1'), `badge tier 1 should be fresh: ${JSON.stringify(F.fresh(b))}`);
  F.markSeen(b, 'boards/badges'); b.badgeTiers.longhaul = 2;
  check(JSON.stringify(F.fresh(b)['boards/badges']) === '["badge:longhaul:2"]', `only tier 2 is new: ${JSON.stringify(F.fresh(b))}`);
  b.records = { beaten: ['record:longest:ever:5000'] };
  check(F.dots(b).boards === true && F.isFresh(b, 'boards/records', 'record:longest:ever:5000'), 'a beaten record lights BOARDS');
  F.markSeen(b, 'boards/records'); F.markSeen(b, 'boards/badges');
  check(!F.dots(b).boards, 'seen: BOARDS dark');
  b.records.beaten.push('record:longest:ever:6000');
  check(F.isFresh(b, 'boards/records', 'record:longest:ever:6000') && !F.isFresh(b, 'boards/records', 'record:longest:ever:5000'), 'a LATER beat of the same record is new');

  // Every scope the plan names has a producer or an explicit 'pending: R<n>'; a producer that is not pending must really produce.
  for (const [sc, who] of Object.entries(F.PRODUCERS)) check(typeof who === 'string' && who.length > 3 && (/^pending: R\d/.test(who) || !/pending/.test(who)), `scope ${sc} has no producer and no 'pending: R<n>' note`);
  check(['hangar/plane', 'hangar/systems', 'hangar/gadgets', 'nature/<land>', 'boards/records', 'boards/badges', 'missions'].every(sc => F.PRODUCERS[sc]), 'a scope the plan names is missing from PRODUCERS');
  const live = rich(); live.badgeTiers = { longhaul: 1 }; live.records = { beaten: ['record:longest:ever:1'] };
  const got = F.current(live, { missions: () => ['tier:2', 'done:L3'] });
  const bare = F.current(live);   // WITHOUT the missions hook: a scope not marked pending must produce on its own
  for (const sc of Object.keys(F.PRODUCERS).filter(k => !/pending/.test(F.PRODUCERS[k]))) {
    const real = sc === 'nature/<land>' ? Object.keys(bare).filter(k => k.startsWith('nature/')) : bare[sc] ? [sc] : [];
    check(real.length >= 1, `PRODUCERS says ${sc} is produced, but a rich save has no keys there`);
  }
  check((got.missions || []).join() === 'tier:2,done:L3' && !F.current(live).missions, 'the missions hook passes its keys through, and is empty without it');
  if (fails.length) { console.log(`FAIL newdot\n  ${fails.slice(0, 12).join('\n  ')}`); process.exit(1); }
  console.log(`PASS newdot: scopes ${hs.concat(ns).join(', ')}; separate, roll-up, re-dot, migration, boards`);
})();
