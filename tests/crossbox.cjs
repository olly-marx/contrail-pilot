// THE HOME BOX AND THE CROSSINGS SCREEN, as data (src/crossingview.js boxView / screenView; CROSSINGS V2, research/DESIGN-CROSSINGS-V2.md). Plain Node.
// For all 22 crossings and every combination of the three ticks (Era, Plane, Nature): the box has the three ticks in that order and they say what is done; the one plain line names the open tick (and, for nature, its own
// number: the only number allowed); a ready crossing says 'Ready!' and the screen's button crosses; an open plane tick sends the player to the HANGAR, an open nature tick to NATURE, an era only waits (no button);
// the route and the line fit their budgets (28 characters); and nothing says a distance (no km, no metres, no number of 3 or more digits). The stars are not a tick. Plants: tools/plants.tsv, test `crossbox`.
// Run: node tests/crossbox.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const V = await import('../src/crossingview.js'), C = await import('../src/crossings.js');
  const base = { fuel: 'kerosene', priceVersion: 2, tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', homeCity: 'LONDON', city: 'LONDON', visited: ['LONDON'], areaBest: {}, crossed: [], missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: { trees: 1 }, fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
  const bad = s => /\bkm\b|\bmetres?\b|\bmiles?\b|\d{3,}/i.test(String(s));
  let n = 0;
  for (const c of C.CROSSINGS) {
    const cc = { ...c, from: c.a || 'LONDON', to: c.b || 'LONDON', km: C.crossingKm(c), opens: 'africa' };
    for (let mask = 0; mask < 8; mask++) {
      const st = V.stateOf(base, cc), want = [!!(mask & 1), !!(mask & 2), !!(mask & 4)];   // era, plane, nature
      st.conds.forEach((x, i) => { x.done = want[i]; x.frac = want[i] ? 1 : 0; }); st.ready = want.every(Boolean); st.nearest = st.conds.find(x => !x.done) || null;
      const b = V.boxView(st), s = V.screenView(st); n++;
      const tag = `${c.id} ${want.map(x => (x ? 'x' : '.')).join('')}`;
      check(b.ticks.map(t => t.label).join('|') === 'Era|Plane|Nature' && b.ticks.map(t => t.done).join() === want.join(), `${tag}: the box ticks are Era, Plane, Nature and say what is done: ${JSON.stringify(b.ticks)}`);
      check(b.route.length <= 28 && b.line.length <= 28 && b.title === 'NEXT CROSSING' && /Easy|Medium|Hard|Harder|Very hard|The lap/.test(b.word), `${tag}: route ${b.route.length}, line ${b.line.length}, word "${b.word}"`);
      for (const [k, v] of Object.entries({ route: b.route, line: b.line, word: b.word, button: s.button ? s.button.label : '' })) check(!bad(v), `${tag} ${k}: a distance or a long number reaches the player: "${v}"`);
      if (st.ready) check(b.line === 'Ready!' && b.where === 'sheet' && s.button && s.button.act === 'cross' && s.button.label === `CROSS TO ${cc.to}`, `${tag}: ready: line "${b.line}", where ${b.where}, button ${JSON.stringify(s.button)}`);
      else {
        const open = st.nearest.key;
        check(b.line === st.nearest.plain && !/Ready/.test(b.line), `${tag}: the plain line names the open tick: "${b.line}"`);
        check((open === 'plane' && s.button && s.button.act === 'hangar') || (open === 'nature' && s.button && s.button.act === 'nature') || (open === 'era' && s.button === null), `${tag}: the button goes where the open tick is fixed: ${open} -> ${JSON.stringify(s.button)}`);
      }
    }
  }
  check(V.boxView(V.stateOf(base, { ...C.CROSSINGS[0], from: 'WARSAW', to: 'STOCKHOLM', km: 6500, opens: 'nordic' })).ticks.length === 3 && !('stars' in V.boxView(V.stateOf(base, { ...C.CROSSINGS[0], from: 'WARSAW', to: 'STOCKHOLM', km: 6500, opens: 'nordic' }))), 'three ticks, no stars');
  console.log(fails.length ? `FAIL crossbox:\n - ${fails.slice(0, 12).join('\n - ')}${fails.length > 12 ? `\n ... and ${fails.length - 12} more` : ''}` : `PASS crossbox: ${n} box and screen states (22 crossings x 8 tick combinations) are within budget, say no distance, and send the player where the open tick is fixed`);
  process.exit(fails.length ? 1 : 0);
})();
