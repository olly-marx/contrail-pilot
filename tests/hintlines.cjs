// THE GAP HINT, ONE FLAVOUR PER LINE (src/hintlines.js, fleet.js fleetKit; the user, 2026-11-10: 'nerf everyone, no refund'; research/DESIGN-UPGRADE-BAR.md part A4, GAP-HINT-LEVELS-PLAN.md section 9). Plain Node, no browser. Replaces tests/gaphint2.cjs (the shared level is gone).
// 1. for every (forecast, atc, ops) in 0..12 cubed: any line at 1 or more gives at least the ARROW (the first line bought gives a usable arrow), with all three at 0 nothing shows; 2. the GATE only from Forecasting 3, the SECOND gate and the climb
// boost only from ATC 10 (boost 1 / 2 / 3 at 10 / 11 / 12), every Ops cue at its own level; 3. the ATC warning time: 0.5 s at level 1, +0.2 s a level to 2.2 s at 9, 2.4 at 10, capped at 2.5 (11, 12); 0.5 s when only another line is bought; 4. levels 1 and 2 of
// each hint line cost x0.6 (15 and 33 seeds), level 3 is unchanged (65); 5. the hangar words: 13 levels a line, at most 28 characters. Run: node tests/hintlines.cjs.  Plants: tools/plants.tsv, test hintlines.
(async () => {
  const H = await import('../src/hintlines.js'), F = await import('../src/fleet.js'), W = await import('../src/hintwords.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const kit = (f, a, o) => F.fleetKit({ fleet: { plane: 'comet', planes: { comet: {} }, systems: { forecast: f, atc: a, ops: o }, gadgets: {} } });
  let bad1 = [], bad2 = [], bad3 = [];
  for (let f = 0; f <= 12; f++) for (let a = 0; a <= 12; a++) for (let o = 0; o <= 12; o++) {
    const k = kit(f, a, o), h = H.hintFlags(k), any = f + a + o > 0, tag = `F${f} A${a} O${o}`;
    if (any !== (h.arrow && k.hintLead > 0) || (!any && (h.gate || h.second || h.icon || k.hintBoost))) bad1.push(tag);
    if (h.gate !== (any && f >= 3) || h.second !== (any && a >= 10) || k.hintBoost !== (a >= 12 ? 3 : a >= 11 ? 2 : a >= 10 ? 1 : 0)) bad2.push(`${tag} gate ${h.gate} second ${h.second} boost ${k.hintBoost}`);
    if (h.red !== (any && o >= 2) || h.blink !== (any && o >= 3) || h.big !== (any && o >= 4) || h.icon !== (any && o >= 5) || h.lit !== (o >= 6) || h.tick !== (any && o >= 7) || h.length !== (o >= 8) || h.size !== (o >= 10)) bad3.push(tag);
    if (h.fill !== (f >= 4) || h.centre !== (f >= 5) || h.linger !== (f >= 7 ? 1 : 0)) bad3.push(tag + ' (gate look)');
  }
  check(bad1.length === 0, `the first line bought gives the arrow, and nothing shows with no line: wrong for ${bad1.length} combinations (first ${bad1[0]})`);
  check(bad2.length === 0, `the gate comes only from Forecasting 3, the second gate and the boost only from ATC 10 (boost 1/2/3): wrong for ${bad2.length} (first ${bad2[0]})`);
  check(bad3.length === 0, `each Ops cue starts at its own level (red 2, blink 3, bigger 4, icon 5, lit 6, tick 7, length 8, size 10) and Forecasting's fill 4 / centre 5 / linger 7: wrong for ${bad3.length} (first ${bad3[0]})`);
  // 3. the warning time (the ATC line only).
  const lead = a => kit(0, a, 0).hintLead, steps = [];
  for (let a = 2; a <= 9; a++) steps.push(Math.round((lead(a) - lead(a - 1)) * 100) / 100);
  check(lead(1) === 0.5 && lead(2) === 0.8 && lead(9) === 2.2 && steps.slice(1).every(s => s === 0.2), `ATC lead 0.5 s at level 1, 0.8 at 2, then +0.2 a level to 2.2 at 9 (got ${[1, 2, 3, 9].map(lead)})`);
  check(lead(10) === 2.4 && lead(11) === 2.5 && lead(12) === 2.5 && Math.max(...H.ATC_LEAD) === 2.5, `the warning time is capped at 2.5 s (levels 10, 11, 12: ${lead(10)}, ${lead(11)}, ${lead(12)})`);
  check(kit(12, 0, 12).hintLead === 0.5 && kit(1, 0, 0).hintLead === 0.5 && kit(0, 0, 0).hintLead === 0, 'with no ATC the warning is 0.5 s (any other line bought), and 0 with no line at all: the spawn lead of a Forecasting-only player is the arrow\'s');
  // 4. prices: x0.6 on levels 1 and 2 of each hint line, level 3 as before.
  for (const id of ['forecast', 'atc', 'ops']) {
    const lv = F.SYSTEMS.find(s => s.id === id).levels;
    check(lv[0].cost === 15 && lv[1].cost === 33 && lv[0].crystals === 2 && lv[1].crystals === 4, `${id}: levels 1 and 2 cost 15 and 33 seeds (2 and 4 crystals): ${lv[0].cost}/${lv[1].cost} (${lv[0].crystals}/${lv[1].crystals})`);
    check(lv[2].cost === 65 && lv[2].crystals === 8, `${id}: level 3 is unchanged at 65 seeds, 8 crystals (got ${lv[2].cost}/${lv[2].crystals})`);
  }
  // 5. the words for the hangar bar.
  for (const id of ['forecast', 'atc', 'ops']) {
    const t = W.HINT_WORDS[id], long = t.flat().filter(s => s.length > 28);
    check(t.length === 13 && long.length === 0 && t[12][1] === 'Fully upgraded' && W.hintWords(id, 3).now === t[3][0], `${id}: 13 levels of words, none over 28 characters (too long: ${long.join(' | ')})`);
  }
  check(kit(3, 4, 5).hintLevel === undefined, 'the single shared hintLevel is gone from the kit');
  if (fails.length) { console.log('FAIL hintlines:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS hintlines: arrow with any line, gate from Forecasting 3, second gate and boost count from ATC 10, cues by Ops level, warning 0.5-2.5 s, levels 1-2 at x0.6, words under 28 characters');
})();
