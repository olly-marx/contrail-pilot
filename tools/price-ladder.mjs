// Price ladder and its acceptance gates for the ERAS economy (src/fleet.js). Pure data: no browser, runs in a second.
// (PROPOSAL-12, 2026-10-24: "re-measure every upgrade's price per stage: no level useless or dominant".)
//
//   node tools/price-ladder.mjs                         the real ladder against the default income, with the gates
//   INCOME='{"0":9,"1":10,"2":19}' node tools/price-ladder.mjs    your own seeds-a-flight per era (tools/income.cjs prints an INCOME line)
//   node tools/price-ladder.mjs --selftest              proves the gates can fail (a good fixture passes, each planted mispricing trips its gate)
//
// The gates (the numbers are TARGETS from the proposal, for the user to change; BANDS below):
//   band      every level costs between minFlights and maxFlights flights of income at its era's income ("flights of saving").
//   monotone  within a line (one system, one gadget, one plane line) a later level never costs less than an earlier one (seeds or crystals).
//   eratotal  the prices of an era together are about 1.5 x that era's budget (ERA_BUDGET: fleet.js says so; this is the check).
//   crystals  crystals are about seeds / 8 (fleet.js price()), so the two currencies stay in step.
// The default income is a PLACEHOLDER: the flying-only means measured in research/PLANE-DESIGN.md section 9 (8.7, 10.2, then 19 seeds a flight);
// prizes add a lot more (a fresh two-flight run of tools/income.cjs earned 18 and 38 from flying and 155 and 95 from prizes), so run income.cjs
// for many flights and pass its INCOME line before trusting a verdict. Value (what a level DOES) is a separate, measured gate: not here.
import { pathToFileURL } from 'url';

export const BANDS = { minFlights: 1, maxFlights: 12, eraTotal: [1.2, 1.8], crystalsPerSeed: 8, crystalSlack: 1 };
export const DEFAULT_INCOME = { 0: 9, 1: 10, 2: 19 };

// Every purchasable level of the real game: [{ line, level, cost, crystals, era }].
export function realLadder(F) {
  const items = [];
  for (const [kind, list] of [['system', F.SYSTEMS], ['gadget', F.GADGETS]])
    for (const g of list) g.levels.forEach((lv, i) => items.push({ line: `${kind}:${g.id}`, level: i + 1, cost: lv.cost, crystals: lv.crystals || 0, era: F.levelEra(i + 1) }));
  for (const p of F.PLANES) for (const line of Object.keys(F.PLANE_LINES)) (p.lines[line] || []).forEach((lv, i) => items.push({ line: `plane:${p.id}.${line}`, level: i + 1, cost: lv.cost, crystals: lv.crystals || 0, era: p.era }));
  return items;
}

// The gates. Returns [{ gate, where, msg }]; an empty list = every gate passes.
export function check(items, income, budget, bands = BANDS) {
  const bad = [];
  const label = it => `${it.line} L${it.level} (${it.cost} seeds, era ${it.era})`;
  for (const it of items) {
    const inc = income[it.era];
    if (!(inc > 0)) { bad.push({ gate: 'band', where: label(it), msg: `no income given for era ${it.era}` }); continue; }
    const flights = it.cost / inc;
    if (flights < bands.minFlights) bad.push({ gate: 'band', where: label(it), msg: `only ${flights.toFixed(1)} flights of saving (min ${bands.minFlights})` });
    if (flights > bands.maxFlights) bad.push({ gate: 'band', where: label(it), msg: `${flights.toFixed(1)} flights of saving (max ${bands.maxFlights})` });
    if (Math.abs(it.crystals - it.cost / bands.crystalsPerSeed) > bands.crystalSlack + 1e-9) bad.push({ gate: 'crystals', where: label(it), msg: `${it.crystals} crystals for ${it.cost} seeds (expected about ${(it.cost / bands.crystalsPerSeed).toFixed(1)})` });
  }
  const lines = new Map();
  for (const it of items) { if (!lines.has(it.line)) lines.set(it.line, []); lines.get(it.line).push(it); }
  for (const [name, list] of lines) {
    list.sort((a, b) => a.level - b.level);
    for (let i = 1; i < list.length; i++) if (list[i].cost < list[i - 1].cost || list[i].crystals < list[i - 1].crystals) bad.push({ gate: 'monotone', where: `${name} L${list[i].level}`, msg: `costs ${list[i].cost} seeds / ${list[i].crystals} crystals but the level before costs ${list[i - 1].cost} / ${list[i - 1].crystals}` });
  }
  const totals = {};
  for (const it of items) totals[it.era] = (totals[it.era] || 0) + it.cost;
  for (const [era, total] of Object.entries(totals)) {
    if (!(budget[era] > 0)) continue;
    const ratio = total / budget[era];
    if (ratio < bands.eraTotal[0] || ratio > bands.eraTotal[1]) bad.push({ gate: 'eratotal', where: `era ${era}`, msg: `prices total ${total} seeds = ${ratio.toFixed(2)} x the budget ${budget[era]} (wanted ${bands.eraTotal[0]} to ${bands.eraTotal[1]})` });
  }
  return bad;
}

// ---- the self-test: a fixture that passes, and plants that must each trip THEIR gate ----
function selftest() {
  const fixture = () => [   // one line, 3 levels, era 0: income 10 a flight, budget 100 -> total 140 = 1.4 x
    { line: 'sys:a', level: 1, cost: 20, crystals: 2, era: 0 }, { line: 'sys:a', level: 2, cost: 40, crystals: 5, era: 0 }, { line: 'sys:a', level: 3, cost: 80, crystals: 10, era: 0 }];
  const income = { 0: 10 }, budget = { 0: 100 };
  const plants = [
    ['one level 10x too dear', it => { it[1].cost = 400; it[1].crystals = 50; }, 'band'],
    ['one level far too cheap', it => { it[0].cost = 2; it[0].crystals = 0; }, 'band'],
    ['a later level cheaper than an earlier one', it => { it[1].cost = 30; it[1].crystals = 4; it[2].cost = 20; it[2].crystals = 2; }, 'monotone'],
    ['era total too high, every level in band', it => { for (let k = 0; k < 6; k++) it.push({ line: 'sys:b', level: k + 1, cost: 20, crystals: 2, era: 0 }); }, 'eratotal'],
    ['crystals out of step with seeds', it => { it[2].crystals = 1; }, 'crystals'],
  ];
  const fails = [];
  const control = check(fixture(), income, budget);
  if (control.length) fails.push(`the good fixture should pass but tripped: ${control.map(v => v.gate + ': ' + v.msg).join('; ')}`);
  for (const [name, plant, gate] of plants) {
    const it = fixture(); plant(it);
    const got = check(it, income, budget);
    if (!got.some(v => v.gate === gate)) fails.push(`planted "${name}" should trip the ${gate} gate, got [${got.map(v => v.gate).join(', ') || 'nothing'}]`);
  }
  if (fails.length) { console.log('SELFTEST FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`SELFTEST PASS: the good fixture passes and all ${plants.length} planted mispricings trip their gate`);
}

// ---- the real ladder ----
async function main() {
  if (process.argv.includes('--selftest')) return selftest();
  const F = await import('../src/fleet.js');
  const income = process.env.INCOME ? JSON.parse(process.env.INCOME) : DEFAULT_INCOME;
  const items = realLadder(F);
  console.log(`income (seeds a flight per era): ${JSON.stringify(income)}${process.env.INCOME ? '' : '   <- PLACEHOLDER (flying only, PLANE-DESIGN s9); pass INCOME from tools/income.cjs'}`);
  console.log('\nera | levels | total seeds | budget | x budget | cheapest..dearest level (flights of saving)');
  for (const era of [...new Set(items.map(i => i.era))].sort()) {
    const here = items.filter(i => i.era === era), total = here.reduce((a, i) => a + i.cost, 0), f = here.map(i => i.cost / income[era]);
    console.log(` ${era}  | ${String(here.length).padStart(3)}    | ${String(total).padStart(6)}      | ${String(F.ERA_BUDGET[era]).padStart(5)}  | ${(total / F.ERA_BUDGET[era]).toFixed(2)}     | ${Math.min(...f).toFixed(1)}..${Math.max(...f).toFixed(1)}`);
  }
  const bad = check(items, income, F.ERA_BUDGET);
  console.log(`\n${bad.length} gate violation(s)${bad.length ? ':' : ' (every gate passes)'}`);
  for (const v of bad.slice(0, 40)) console.log(`  [${v.gate}] ${v.where}: ${v.msg}`);
  if (bad.length > 40) console.log(`  ... and ${bad.length - 40} more`);
  process.exit(bad.length ? 1 : 0);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
