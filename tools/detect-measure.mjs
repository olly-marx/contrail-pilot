const { createWorld } = await import('../src/sim/world.js');
const { LOOKS, fleetKit } = await import('../src/fleet.js').catch(() => ({}));
const F = await import('../src/fleet.js');
const levelOf = n => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, mission: 99,
  fleet: { plane: 'dreamliner', planes: { dreamliner: {} }, systems: { forecast: n }, gadgets: {} } });
const DT = 16.67 / 1000, HORIZON = Number(process.argv[3] || 30000), N = Number(process.argv[2] || 100);
const stat = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; const sd = Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); return [m, sd]; };
console.log('lvl reveal fakes late | per sky over', HORIZON, 'px: patches real_early real_late fakes | fake share of shown (mean sd min max) | late share of real (mean sd min max)');
for (let n = 0; n <= 12; n++) {
  const rows = [];
  for (let seed = 1; seed <= N; seed++) {
    const w = createWorld(levelOf(n), seed); w.explain = () => false;
    for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(DT);
    w.finish = () => {};   // flown by nobody: never ends
    w.nextStormAt = w.nextTurbAt = w.nextBirdsAt = 1e9; w.storms.forEach(st => st.rects.forEach(r => { r.x = -999; })); w.birds = [];
    const seen = new Set(); let steps = 0;
    while (w.distancePx < HORIZON && steps < 400000) { w.plane.y = 120; w.plane.vy = 0; w.heat = 0; w.step(DT); steps++; for (const i of w.issrs) seen.add(i); }
    const all = [...seen], fake = all.filter(i => i.fake).length, late = all.filter(i => !i.fake && i.late).length, early = all.length - fake - late;
    rows.push({ all: all.length, fake, late, early });
  }
  const sh = rows.map(r => (r.early + r.fake) ? r.fake / (r.early + r.fake) : 0), lt = rows.map(r => (r.early + r.late) ? r.late / (r.early + r.late) : 0);
  const k = F.fleetKit ? null : null;
  const fmt = a => { const [m, sd] = stat(a); return `${m.toFixed(2)} ${sd.toFixed(2)} ${Math.min(...a).toFixed(2)} ${Math.max(...a).toFixed(2)}`; };
  console.log(String(n).padStart(2), '|', stat(rows.map(r => r.all))[0].toFixed(1), stat(rows.map(r => r.early))[0].toFixed(1), stat(rows.map(r => r.late))[0].toFixed(1), stat(rows.map(r => r.fake))[0].toFixed(1), '|', fmt(sh), '|', fmt(lt));
}
