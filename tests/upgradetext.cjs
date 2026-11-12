// THE WORDS OF EVERY UPGRADE LEVEL (src/upgradetext.js upgradeCard; BLOCK2-PLAN item 4, DESIGN-UPGRADE-BAR.md B3). Plain Node, no browser. For EVERY line of the shop (every plane's Engines / Wings & body / Cabin, every system, every gadget,
// every nature tool) and for EVERY level n from 0 to the last, the card of a save that owns n levels must say, by named lines:
//   0. the three hint lines (forecast, atc, ops) use the sim chat's words from src/hintwords.js, not the level effects (wired in block 2)
//   1. the line is known and has at least one level; its card has a title and 'count' equal to its levels
//   2. 'Now' at level n is the words of level n ('nothing yet' at 0) and 'Next' is the name and effect of level n + 1: so the bar can never say a different thing from the level it describes
//   3. the last level has no Next and no price and is 'max'; any other level has a Next and a price equal to the level's own cost and crystals
//   4. every word is non-empty and a 'Now' is at most 70 characters, a 'Next' at most 110 (the strip wraps; the browser test checks it fits at 320)
//   5. levels with NO effect text (their words are only their name) are LISTED in the pass message; this line only fails on a level without a name. The list is MEASURED by this test's first run: a declared ceiling is pinned after it (BLOCK2-PLAN item 4)
// Plants: tools/plants.tsv, test `upgradetext`. Run: node tests/upgradetext.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const T = await import('../src/upgradetext.js'), F = await import('../src/fleet.js'), S = await import('../src/save.js'), U = await import('../src/upgrades.js'), H = await import('../src/hintwords.js');
  const withLevel = (kind, id, n) => {
    const s = S.prepareSave(null), f = s.fleet;
    if (kind === 'plane') { const [pid, line] = id.split('.'); s.fleet = { ...f, plane: pid, planes: { ...f.planes, [pid]: { ...(f.planes[pid] || {}), [line]: n } } }; }
    else if (kind === 'system') s.fleet = { ...f, systems: { ...f.systems, [id]: n } };
    else if (kind === 'gadget') s.fleet = { ...f, gadgets: { ...f.gadgets, [id]: n } };
    else s.levels = { ...(s.levels || {}), [id]: n };
    return s;
  };
  // 0. THE THREE HINT LINES use the sim chat's words (src/hintwords.js), not the level effects: forecast level 0 'No forecast yet' / 'An arrow to the gap'; atc level 3 'Warning 1.0 s early'; ops at its last level has no Next
  { const fc = T.upgradeCard(withLevel('system', 'forecast', 0), 'system', 'forecast'), at = T.upgradeCard(withLevel('system', 'atc', 3), 'system', 'atc'), op = T.upgradeCard(withLevel('system', 'ops', 12), 'system', 'ops');
    check(fc.now === 'No forecast yet' && fc.next === 'An arrow to the gap' && at.now === 'Warning 1.0 s early' && op.next === null && op.max === true, `0: the hint lines use src/hintwords.js: forecast 0 '${fc.now}' / '${fc.next}', atc 3 '${at.now}', ops 12 next ${op.next} max ${op.max}`); }
  const lines = T.allLines(), noEffect = [];
  check(lines.length >= 40, `power: the shop has ${lines.length} lines (planes x 3, systems, gadgets, nature tools); fewer than 40 means the table did not load`);
  let cards = 0, maxNow = 0, maxNext = 0;
  for (const [kind, id] of lines) {
    const c0 = T.upgradeCard(withLevel(kind, id, 0), kind, id);
    if (!c0 || !(c0.count >= 1) || !c0.title) { check(false, `1: ${kind}:${id} has no card, no level or no title: ${JSON.stringify(c0)}`); continue; }
    for (let n = 0; n <= c0.count; n++) {
      const c = T.upgradeCard(withLevel(kind, id, n), kind, id); cards++;
      const lvNow = n ? levelOf(kind, id, n - 1) : null, lvNext = n < c0.count ? levelOf(kind, id, n) : null;
      let sayNow = lvNow ? (kind === 'nature' ? (lvNow.short || lvNow.name) : T.wordsOf(lvNow)) : T.NOTHING_YET; let sayNext = lvNext ? (kind === 'nature' ? (lvNext.short || lvNext.name) : T.nextWords(lvNext)) : null;
      if (kind === 'system' && T.HINT_LINE_IDS.includes(id)) { const hw = H.hintWords(id, n); sayNow = hw.now; sayNext = n === c0.count ? null : hw.next; }   // the gap-hint lines: their words are the sim chat's tables (src/hintwords.js)
      check(c.have === n && c.count === c0.count, `1: ${kind}:${id} at level ${n}: have ${c.have}, count ${c.count}`);
      check(c.now === sayNow && c.next === sayNext, `2: ${kind}:${id} at level ${n}: Now '${c.now}' (want '${sayNow}'), Next '${c.next}' (want '${sayNext}')`);
      if (n === c0.count) check(c.max === true && c.next === null && c.price === null, `3: ${kind}:${id} at its last level (${n}) is not max with no Next and no price: ${JSON.stringify(c)}`);
      else check(c.max === false && !!c.next && c.price && c.price.seeds === (lvNext.cost || 0) && c.price.crystals === (lvNext.crystals || 0), `3: ${kind}:${id} at level ${n}: Next or price wrong: ${JSON.stringify(c)}`);
      check(!!c.now && (n === c0.count ? c.next === null : !!c.next), `4: ${kind}:${id} at level ${n} has an empty word`);
      maxNow = Math.max(maxNow, c.now.length); maxNext = Math.max(maxNext, (c.next || '').length);
      check(c.now.length <= 70 && (c.next || '').length <= 110, `4: ${kind}:${id} at level ${n}: Now ${c.now.length} / Next ${(c.next || '').length} characters (limits 70 / 110): '${c.now}' / '${c.next}'`);
    }
    for (let i = 0; i < c0.count; i++) { const lv = levelOf(kind, id, i); if (!lv.name) check(false, `5: ${kind}:${id} level ${i + 1} has no name`); if (kind !== 'nature' && !F.effectText(lv)) noEffect.push(`${kind}:${id}#${i + 1}`); }
  }
  function levelOf(kind, id, i) {
    if (kind === 'plane') { const [pid, line] = id.split('.'); return F.planeById(pid).lines[line][i]; }
    if (kind === 'system') return F.SYSTEMS.find(g => g.id === id).levels[i];
    if (kind === 'gadget') return F.GADGETS.find(g => g.id === id).levels[i];
    return U.LINES.find(l => l.id === id).levels[i];
  }
  console.log(fails.length ? `FAIL upgradetext:\n - ${fails.slice(0, 12).join('\n - ')}${fails.length > 12 ? `\n ... ${fails.length - 12} more` : ''}` : `PASS upgradetext: ${lines.length} lines, ${cards} cards: Now and Next match the level words, the last level is max, prices equal the levels' own (longest Now ${maxNow}, longest Next ${maxNext}); ${noEffect.length} levels have only a name for words: ${noEffect.join(' ') || 'none'}`);
  process.exit(fails.length ? 1 : 0);
})();
