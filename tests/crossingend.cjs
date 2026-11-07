// The crossing's own ending as data (src/crossingend.js; release 2 of the crossing-as-a-pure-experience plan). No browser. On DECLARED results:
//   1. a landing: "A NEW WAY OPENED", WELCOME TO <city>, the area it opens, a landmark picture that EXISTS on disk, one FLY ON button; the first crossing also says new missions wait there;
//   2. a crash: "NOT THIS TIME", kind lines (what you keep; the seeds lost only when there were seeds), the plane's picture, TRY AGAIN + HOME;
//   3. NO DISTANCE or number of any kind in any text (no "km", no metres, no digits except the crystals you keep), for every crossing the game has and its longest city names;
//   4. every title and line is within its budget.
// Run: node tests/crossingend.cjs   (plants in tools/plants.tsv)
(async () => {
  const fs = require('fs'), path = require('path');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const E = await import('../src/crossingend.js'), C = await import('../src/crossings.js'), A = await import('../src/areas.js');
  const save = { fleet: { plane: 'comet', planes: { comet: {} } } };
  const text = v => [v.eyebrow, v.title, ...v.lines, ...v.buttons.map(b => b.label)].join(' | ');
  const land = (city, opens, extra = {}) => ({ landed: true, landedAt: city, crystals: 3, cargo: 40, distance: 6500, crossing: { id: 'x', kind: 'frontier', landed: true, opens, to: city }, ...extra });
  const crash = (extra = {}) => ({ landed: false, reason: 'Bird strike!\nYou hit a bird.', crystals: 2, cargo: 25, distance: 3100, crossing: { id: 'x', kind: 'frontier', landed: false, opens: 'nordic', to: 'STOCKHOLM' }, ...extra });
  // 1. The landing.
  const v1 = E.endView(land('STOCKHOLM', 'nordic'), save, { first: true });
  check(v1.kind === 'landed' && v1.eyebrow === 'A NEW WAY OPENED' && v1.title === 'WELCOME TO STOCKHOLM!' && /Nordic & North Atlantic is open to you/.test(v1.lines[0]), `the landing says where you are and what opened: ${text(v1)}`);
  check(/New missions are waiting there/.test(v1.lines[1]) && !/New missions/.test(E.endView(land('STOCKHOLM', 'nordic'), save, { first: false }).lines.join(' ')), 'the FIRST crossing says new missions wait; later ones do not');
  check(v1.buttons.length === 1 && v1.buttons[0].label === 'FLY ON', `one button, FLY ON: ${JSON.stringify(v1.buttons)}`);
  check(v1.pic && fs.existsSync(path.join(__dirname, '..', v1.pic)), `the landing picture exists on disk: ${v1.pic}`);
  // 2. The crash.
  const v2 = E.endView(crash(), save), v2b = E.endView(crash({ cargo: 0, crystals: 0 }), save);
  check(v2.kind === 'crash' && v2.title === 'NOT THIS TIME' && v2.buttons.map(b => b.label).join() === 'TRY AGAIN,HOME', `the crash offers TRY AGAIN and HOME: ${text(v2)}`);
  check(/You keep your 2 ice crystals/.test(v2.lines.join(' ')) && /seeds you carried are lost/i.test(v2.lines.join(' ')), `the crash says what you keep and what was lost: ${v2.lines}`);
  check(!/lost/i.test(v2b.lines.join(' ')) && /safe/i.test(v2b.lines.join(' ')), `a crash with nothing carried does not talk about loss: ${v2b.lines}`);
  check(v2.pic && fs.existsSync(path.join(__dirname, '..', v2.pic)), `the crash picture (the plane) exists on disk: ${v2.pic}`);
  // 3 + 4. No distance anywhere, and the budgets, for every crossing's destination (the longest names included).
  const cities = [...new Set(C.CROSSINGS.filter(x => x.kind !== 'lap').flatMap(x => [x.a, x.b]))];
  for (const city of cities) for (const opens of [null, ...Object.keys(A.AREAS)]) {
    const v = E.endView(land(city, opens), save, { first: true }), t = text(v);
    check(!/\bkm\b|\d+\s*m\b|distance|record/i.test(t) && !/\d/.test(t), `${city}/${opens}: a number or a distance in the landing: ${t}`);
    check(v.title.length <= E.TITLE_MAX && v.lines.every(l => l.length <= E.LINE_MAX), `${city}/${opens}: within budget (title ${v.title.length}, longest line ${Math.max(...v.lines.map(l => l.length))}): ${t}`);
  }
  for (const c of [crash(), crash({ crystals: 12 }), crash({ cargo: 0, crystals: 0 })]) { const t = text(E.endView(c, save)); check(!/\bkm\b|distance|record|mission/i.test(t) && E.endView(c, save).lines.every(l => l.length <= E.LINE_MAX), `a crash screen has no distance, record or mission and fits: ${t}`); }
  console.log(fails.length ? `FAIL crossingend:\n - ${fails.join('\n - ')}` : `PASS crossingend: the landing and the crash say what happened and what you keep, with no distance and no mission, for all ${cities.length} crossing cities`);
  process.exit(fails.length ? 1 : 0);
})();
