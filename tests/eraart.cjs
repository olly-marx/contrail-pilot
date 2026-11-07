// The 2010s / 2030s / far-future airport and gadget pictures (2026-11): a plane that carries a 2010s+ sensor or autopilot, an air-traffic tower of ATC level 7-12 and a
// forecasting station of era 4-6 must get THEIR pictures, not the 1990s ones (the old code clamped every era to 2). Plain Node. Run: node tests/eraart.cjs
// Plants: tools/plants.tsv (test eraart).
const fs = require('fs'), path = require('path');
(async () => {
  const F = await import('../src/fleet.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const ERAS = ['1950s', '1970s', '1990s', '2010s', '2030s', 'future'];
  const keyFor = (gadget, level) => { const st = F.stickers({ fleet: { plane: 'jumbo', planes: { jumbo: {} }, systems: {}, gadgets: { [gadget]: level } } }); return st.length ? st[0].key : null; };
  for (let lv = 1; lv <= 12; lv++) {
    const era = Math.floor((lv - 1) / 2);
    check(keyFor('sensors', lv) === `sticker-sensor-${ERAS[era]}`, `sensors level ${lv} (era ${ERAS[era]}) -> ${keyFor('sensors', lv)}`);
    if (lv <= 10) check(keyFor('autopilot', lv) === `sticker-auto-${ERAS[era]}`, `autopilot level ${lv} (era ${ERAS[era]}) -> ${keyFor('autopilot', lv)}`);
  }
  check(keyFor('magnet', 6) === 'sticker-magnet-1990s' && keyFor('hold', 6) === 'sticker-hold-1990s', 'the 3-era gadgets still top out at the 1990s picture');
  for (let n = 1; n <= 12; n++) check(F.towerKey(n) === `tower-${n}`, `ATC level ${n} -> ${F.towerKey(n)}`);
  check(F.towerKey(0) === 'tower' && F.stationKey(0) === null, 'no systems: the plain tower, no station');
  for (let fc = 1; fc <= 12; fc++) check(F.stationKey(fc) === `station-${ERAS[Math.floor((fc - 1) / 2)]}`, `Forecasting level ${fc} -> ${F.stationKey(fc)}`);
  // every picture the game preloads exists, at the size of its older siblings
  const dir = path.join(__dirname, '..', 'assets', 'upgrades'), size = f => { const b = fs.readFileSync(path.join(dir, f + '.png')); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
  for (const k of F.UPGRADE_ART) { check(fs.existsSync(path.join(dir, k + '.png')), `${k}.png is missing`); }
  for (let n = 1; n <= 12; n++) check(size(`tower-${n}`) === '13x30', `tower-${n} is ${size(`tower-${n}`)} (want 13x30)`);
  for (const e of ERAS) check(size(`station-${e}`) === '16x16', `station-${e} is ${size(`station-${e}`)} (want 16x16)`);
  if (fails.length) { console.log('FAIL eraart\n  ' + fails.slice(0, 10).join('\n  ')); process.exit(1); }
  console.log('PASS eraart: sensors / autopilot stickers, towers 1-12 and stations follow the six eras; every picture exists');
})();
