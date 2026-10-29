// Hangar feedback (the user, 2026-10-28: every purchase must be SEEN, before buying and as it attaches). No browser.
// Run: node tests/hangar-feedback.cjs
//  For EVERY level of every plane line, system and gadget (and every plane switch):
//   1. it shows something: a part on the plane (lookParts / stickers change) or at least one stat bar (src/fleet.js
//      previewBars); none is silent;
//   2. every fleetKit field it changes is shown by some bar (STAT_BARS keys) or is a picture (PICTURE_KEYS), so a new
//      effect (eras 4-6) cannot slip in without a bar.
//  Plants (must FAIL): PLANT=silent adds a magnet level whose effect no rule reads; PLANT=nobar drops the pick-up bar.
const path = require('path');
const src = f => path.resolve(__dirname, '../src', f);
(async () => {
  const F = await import(src('fleet.js'));
  if (process.env.PLANT === 'silent') F.GADGETS.find(g => g.id === 'magnet').levels.splice(1, 0, { ...F.GADGETS[0].levels[0], name: 'Shiny paint', pickup: 16 });
  if (process.env.PLANT === 'nobar') F.STAT_BARS.splice(F.STAT_BARS.findIndex(b => b.id === 'pickup'), 1);
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const covered = new Set([...F.STAT_BARS.flatMap(b => b.keys), ...F.PICTURE_KEYS]);
  const look = s => { const f = F.fleetOf(s); return JSON.stringify([F.lookParts(f.plane, f.planes[f.plane]), F.stickers(s)]); };
  const base = (fleet) => ({ tutorialDone: true, fleet });
  let n = 0;
  const one = (label, save, kind, id) => {
    n++;
    const next = F.withNext(save, kind, id), a = F.fleetKit(save), b = F.fleetKit(next);
    const changed = Object.keys(b).filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    const bars = F.previewBars(save, kind, id), part = look(save) !== look(next);
    check(bars.length || part, `${label}: silent (no part, no bar)`);
    const loose = changed.filter(k => !covered.has(k));
    check(!loose.length, `${label}: changes ${loose.join(', ')} with no bar`);
  };
  for (const p of F.PLANES) for (const line of Object.keys(F.PLANE_LINES)) for (let k = 0; k < p.lines[line].length; k++)
    one(`${p.id}.${line} L${k + 1}`, base({ plane: p.id, planes: { [p.id]: { [line]: k } }, systems: {}, gadgets: {} }), 'plane', `${p.id}.${line}`);
  for (const [kind, list, box] of [['system', F.SYSTEMS, 'systems'], ['gadget', F.GADGETS, 'gadgets']]) for (const g of list) for (let k = 0; k < g.levels.length; k++)
    one(`${g.id} L${k + 1}`, base({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {}, [box]: { [g.id]: k } }), kind, g.id);
  for (const p of F.PLANES.slice(1))
    one(`fly ${p.id}`, base({ plane: 'comet', planes: { comet: {}, [p.id]: {} }, systems: {}, gadgets: {} }), 'fly', p.id);
  // The bars point the right way: a cleaner engine shrinks CO2.
  const eng = F.previewBars(base({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} }), 'plane', 'comet.engines').find(r => r.id === 'co2');
  check(eng && eng.then < eng.now && eng.better === 'lower', 'Comet engines 1: no shrinking CO2 bar');
  // A bar with no change reads 'same' in neutral grey, never a red 0% (the finance desk screenshot, 2026-10-28).
  const SB = await import(src('statbars.js')), same = SB.barHTML({ label: 'x', now: 40, then: 40, min: 0, max: 40, better: 'lower' });
  check(/>same</.test(same) && !/sbar-delta bad/.test(same), `a no-change bar: ${same}`);
  if (fails.length) { console.log(`FAIL hangar-feedback (${n} items)\n  ${fails.slice(0, 12).join('\n  ')}`); process.exit(1); }
  console.log(`PASS hangar-feedback: ${n} items, each shows a part or a bar, every changed setting has a bar`);
})();
