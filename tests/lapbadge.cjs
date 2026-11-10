// THE LAP COMPLETE BADGE (src/badges.js 'lap'; research/LAP-REWARDS-SPEC.md; the user, 2026-11-10). Plain Node. One-tier badge, 10 seeds + 4 crystals, earned when you land back home on the lap crossing (r.lapLanded, set at the bank), and by any
// later flight of a save whose lapDone is already true (history-based; paid once). No other crossing earns it. THE ORDER: RULES.bankFlight pays badges BEFORE GameScene.onFinish calls completeCrossing, so on the lap flight itself save.lapDone is
// not set yet: the badge has to arrive on that flight through r.lapLanded, not one flight late. Plants: tools/plants.tsv, test `lapbadge`. Run: node tests/lapbadge.cjs
globalThis.SEASON2 = true;
const fs = require('fs'), path = require('path');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const B = await import('../src/badges.js'), X = await import('../src/crossings.js'), RW = await import('../src/rewards.js');
  const run = f => { try { return f(); } catch (e) { check(false, `an exception: ${String(e).split('\\n')[0].slice(0, 120)}`); return null; } };
  const flight = extra => ({ landed: true, landedAt: 'LONDON', distance: 1000, airportsSkipped: 0, cargo: 0, heat: 0, dodges: 0, ...extra });
  const base = () => ({ seeds: 0, crystals: 0, visited: ['LONDON'], badgeTiers: {}, totals: {}, crashes: {}, landings: 3, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON' });
  const e = B.badgeById('lap');
  check(!!e && e.name === 'Lap Complete' && e.tiers.length === 1 && e.tiers[0].goal === 1 && e.tiers[0].seeds === 10 && e.tiers[0].crystals === 4 && e.theme === 'explorer', `power: the 'Lap Complete' entry is one tier, goal 1, 10 seeds + 4 crystals: ${JSON.stringify(e && [e.name, e.tiers])}`);
  // 1. a save that has not flown the lap: nothing
  run(() => { const s = base(); check(!B.earnBadges(s, flight()).some(w => w.id === 'lap'), 'a normal flight earns no Lap Complete'); });
  // 2. THE LAP FLIGHT ITSELF: the bank runs before completeCrossing, so lapDone is false and r.lapLanded carries it
  run(() => { const s = base(); const w = B.earnBadges(s, flight({ lapLanded: true })).filter(x => x.id === 'lap'); check(w.length === 1 && w[0].seeds === 10 && w[0].crystals === 4, `the lap flight earns the badge on that flight (r.lapLanded, lapDone not set yet): ${JSON.stringify(w)}`); });
  // 3. once only
  run(() => { const s = base(); B.earnBadges(s, flight({ lapLanded: true })); const again = B.earnBadges(s, flight({ lapLanded: true })).filter(x => x.id === 'lap'); check(again.length === 0, `a second flight does not award it again: ${JSON.stringify(again)}`); });
  // 4. a save whose lap was flown before this release: the badge on its NEXT flight, the prize paid once through the real prize path
  run(() => { const s = { ...base(), lapDone: true, crossed: ['lap'] }; const p1 = RW.addPrizes(s, flight(), null, 0), p2 = RW.addPrizes(s, flight(), null, 0);
    const got = p1.filter(x => x.kind === 'badge' && x.id === 'lap');
    check(got.length === 1 && got[0].seeds === 10 && got[0].crystals === 4, `an old lapDone save gets the badge on its next flight with 10 seeds + 4 crystals: ${JSON.stringify(got)}`);
    check(p2.filter(x => x.id === 'lap').length === 0, 'and the prize is paid once (the next flight pays nothing for it)'); });
  // 5. no other crossing sets it: every rung, landed through the real completeCrossing, then a flight is banked
  run(() => { let n = 0; for (const def of X.CROSSINGS) { const s = base(); const c = { ...def, from: def.a || s.city, to: def.kind === 'lap' ? s.city : def.b, opens: def.id }; X.completeCrossing(s, c); n++;
      const w = B.earnBadges(s, flight()).filter(x => x.id === 'lap'); check(def.kind === 'lap' ? w.length === 1 : w.length === 0, `${def.id}: Lap Complete is earned by the lap only: ${JSON.stringify(w)}`); }
    check(n >= 22, `power: ${n} crossings tried`); });
  // 6. THE ORDER, pinned in the source: bankFlight (which pays) computes lapLanded itself; GameScene calls completeCrossing only after finish() -> bankFlight
  { const rules = fs.readFileSync(path.join(__dirname, '../src/sim/rules.js'), 'utf8'), gs = fs.readFileSync(path.join(__dirname, '../src/GameScene.js'), 'utf8');
    const iBank = rules.indexOf('this.bankFlight({ landed, reason });'), iLap = rules.indexOf("lapLanded: !!(landed && this.crossing && this.crossing.kind === 'lap' && this.save.city === this.crossing.to)");
    check(iLap > 0 && rules.indexOf('addPrizes(this.save', rules.indexOf('bankFlight({ landed = false')) < iLap, 'bankFlight passes lapLanded (a landed lap flight home) into addPrizes, which pays the badge at the bank');
    check(iBank > 0 && gs.indexOf('completeCrossing(this.save, this.crossing)') > 0, 'power: finish() banks the flight and GameScene.onFinish completes the crossing afterwards (that is why lapDone is not set at the bank)'); }
  if (fails.length) { console.log('FAIL lapbadge:'); fails.forEach(f => console.log(' - ' + f)); process.exit(1); }
  console.log('PASS lapbadge: Lap Complete (10 seeds + 4 crystals) arrives on the lap flight itself, once; an old lapDone save gets it on its next flight, paid once; no other crossing earns it; the bank-before-completeCrossing order is pinned');
})().catch(e => { console.log('FAIL lapbadge:\n - ' + e.stack); process.exit(1); });
