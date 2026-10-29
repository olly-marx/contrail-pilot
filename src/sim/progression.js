// The progression simulator (sim engine, 2026-10-26): a scripted player flies flight after flight from a fresh
// save, on the game's own rules: the flight (src/sim/rules.js, crashes ON, the gap-flying player pilot), the bank
// (RULES.bankFlight), and the shop (fleet.js buyFleet, upgrades.js buyLevel, nature.js fundProject). It checks the
// MASTER-PLAN timeline: when eras open, when crossings are offered and made, the bank over time.
//
//   progression(opts) -> { flights: [row...], summary }
//   opts: careful (true), skill(n) (skill on flight n; default a learning curve), flights (100), seed (1),
//         tiers ([7000, 9000, 11000, 14000, 17000] crossing lengths), every (10: capability estimate every N flights),
//         maxSkip (3: airports a careful player passes before it must land; careless players draw 0-2 per flight),
//         capSeeds ([1, 2, 3]), start ({}: extra stored-save fields, e.g. { city: 'LONDON' })
// What is NOT modelled (v1): areas and their borders (the game does not have them yet: the player flies the game's
// routes and its nature is the land it is over), area missions as a crossing condition, steering for sky seeds,
// the crystal exchange. Prizes (missions, badges) are claimed straight after each flight.
import { createWorld } from './world.js';
import { makePlayer } from './player.js';
import { capability } from './simulate.js';
import { makeRng } from './rng.js';
import { CLIMATE } from '../config.js';
import { nextBuys, canAfford, buyFleet, fleetOf, choosePlane, PLANES } from '../fleet.js';
import { LINES, nextLevel, level, canBuy, buyLevel, unlocked, needsMoreNature, freeParcels } from '../upgrades.js';
import { biodiversity, fundProject, projectsDone } from '../nature.js';
import { REGION_DATA } from '../habitats.js';
import { eraProgress } from '../eras.js';
import { claim } from '../rewards.js';
import { city } from '../route.js';
import { SEASON2_ON } from '../cities.js';
import { SEASON } from '../season.js';
import { AREAS, areaOf } from '../areas.js';
import { available, offerCheck, offerCtx, completeCrossing } from '../crossings.js';
import { onSave as missionsOnSave } from '../missions2.js';

// Test switches (tests/sim-progression-s2.cjs plants each; it must FAIL): nostars = offer crossings without the area's
// missions; nocomplete = a landed crossing opens nothing.
export const PROG_PLANTS = { nostars: false, nocomplete: false };

const DT = 16.67 / 1000;
// A player who learns: s rises from 0.75 towards 0.9 over ~30 flights. A parameter, NOT fitted yet (PROGRESSION-SIM.md).
export const LEARNING = n => 0.75 + 0.15 * (1 - Math.exp(-n / 30));

// One flight from `save` (a stored save). Returns the world after it ended (its save is the banked save).
export function flyOne(save, { seed, skill, careful, budget = 0.5, maxSkip, crossing = 0, maxSteps = 400000, useHint = false, landFrom = 0 }) {
  const w = createWorld(save, seed);
  w.save.autoTakeoff = true;
  for (let i = 0; i < 3000 && w.state !== 'playing'; i++) w.step(DT);
  w.explain = () => false;
  if (crossing && !w.crossing) { w.nextAirport.worldX = crossing; w.nextAirport.name = w.path[1]; }   // classic: one non-stop flight to the gateway (season 2: the rules fly save.flyCrossing's path)
  // Land here? A crossing: always at its gateway. Otherwise (as tools/income.cjs): when the heat so far per km x the
  // next leg would overheat the Earth, or once it has passed maxSkip airports.
  // landFrom (season 2, chaseGate): going for a crossing's distance gate, it flies on past maxSkip until landFrom km.
  const land = () => crossing ? true : (w.airportsSkipped >= maxSkip && w.distancePx >= landFrom)
    || w.heat + (w.heat / Math.max(1, w.distancePx)) * w.legKm(w.airportIndex + 1) >= CLIMATE.dangerLine * 0.9;
  const pilot = makePlayer({ skill, careful, budget, seed, land, useHint });   // threat-first planning (the default); careful choices within the inner half of the safe band
  for (let i = 0; i < maxSteps && (w.state === 'playing' || w.state === 'landing'); i++) {
    if (w.state === 'playing') {
      if (pilot.wantsFlap(w)) w.applyFlap();
      if (w.parcels > 0) { const x = w.predictLanding(), pl = w.plots.find(p => !p.used && !p.aimed && x >= p.x + 4 && x <= p.x + w.kit.plotW - 4); if (pl) { pl.aimed = true; w.dropParcel(); } }
    }
    w.step(DT);
  }
  if (w.state !== 'over') w.finish({ reason: 'simulator step limit' });
  return w;
}

// The cheapest affordable thing, again and again: plane/system/gadget levels, upgrade lines, the land's projects.
// The first-landing free upgrade goes on the cheapest level-1 line. Returns what was bought.
export function shop(save, region) {
  const bought = [];
  const options = () => [
    ...nextBuys(save).filter(b => b.open && canAfford(save, b)).map(b => ({ cost: b.cost, name: `${b.id}${b.level}`, buy: () => buyFleet(save, b.kind, b.id) })),
    // The first tree parcels are FREE in season 2 once L4 is done (upgrades.js freeParcels; the game offers them in NATURE): take them
    // even when the player could not pay (2026-10-29: without this the model never planted for lesson L5).
    ...LINES.filter(l => nextLevel(save, l) && unlocked(save, l) && !needsMoreNature(save, l) && (canBuy(save, l) || freeParcels(save, l.id))).map(l => ({ cost: freeParcels(save, l.id) ? 0 : nextLevel(save, l).cost, name: `${l.id}${level(save, l.id) + 1}${freeParcels(save, l.id) ? '(free)' : ''}`, buy: () => buyLevel(save, l.id) })),
    ...((REGION_DATA[region] || {}).projects || []).filter(p => !projectsDone(save, region).some(d => d.id === p.id) && biodiversity(save, region) >= p.needs && save.seeds >= p.cost && (save.crystals || 0) >= p.crystals)
      .map(p => ({ cost: p.cost, name: `project:${p.id}`, buy: () => fundProject(save, region, p.id) })),
  ];
  if (save.freeUpgrade) {
    const free = [...nextBuys(save).filter(b => b.open && b.level === 1).map(b => ({ cost: b.cost, name: `${b.id}1(free)`, buy: () => buyFleet(save, b.kind, b.id, { free: true }) && ((save.freeUpgrade = false) || true) })),
      ...LINES.filter(l => nextLevel(save, l) && unlocked(save, l) && level(save, l.id) === 0).map(l => ({ cost: nextLevel(save, l).cost, name: `${l.id}1(free)`, buy: () => buyLevel(save, l.id) }))]
      .sort((a, b) => a.cost - b.cost)[0];
    if (free && free.buy()) bought.push(free.name);
  }
  for (let k = 0; k < 50; k++) {
    const o = options().sort((a, b) => a.cost - b.cost)[0];
    if (!o || !o.buy()) break;
    bought.push(o.name);
  }
  // Fly the newest plane in the fleet (a new era's plane joins it when its era opens).
  const f = fleetOf(save), newest = [...PLANES].reverse().find(p => f.planes[p.id]);
  if (newest && f.plane !== newest.id) choosePlane(save, newest.id);
  return bought;
}

export function progression({ careful = true, skill = LEARNING, flights = 100, seed = 1, tiers = [7000, 9000, 11000, 14000, 17000],
  every = 10, maxSkip = 3, capSeeds = [1, 2, 3], start = {}, beforeFlight = null, useHint = false, chaseGate = false, pursue = false } = {}) {
  let save = { tutorialDone: true, muted: true, seenTips: ['*'], landings: 0, ...start };
  const rnd = makeRng(seed * 7919 + 13), rows = [], events = [];
  let tier = 0, cap = null, eraWas = 0;
  for (let n = 1; n <= flights; n++) {
    const s = skill(n), region = null;
    // Season 2 (SEASON2_ON and a save with areas, 2026-10-27): the GAME's own offer (crossings.js available + offerCheck
    // (offerCtx): best landed flight from the area, its biodiversity, its starred missions), as the hub's NEXT button picks it
    // (ui.js). Classic: the old capability rule over `tiers`.
    const s2 = SEASON2_ON && Array.isArray(save.areas) && save.areas.length > 0;
    if (beforeFlight) beforeFlight(save, n);
    const home = (city(save.city) || {}).region, homeBio = REGION_DATA[home] ? biodiversity(save, home) : biodiversity(save);
    let c2 = null, crossing = 0;
    // pursue (season 2): go for the FRONTIER crossing (the newest era on offer, then the shortest) by flying every ordinary
    // flight from its departure city, so that area's best flight, missions and projects build up (its gate counts only
    // its own area). Without it the player flies on from wherever it last landed.
    if (s2 && pursue && !save.flyCrossing) {
      // Switch only when the frontier is in ANOTHER area, and then to that area's own start city: the missions are filled
      // from the start city, so hopping between cities would reset their progress (measured: crossing 1 at flight 49-163).
      const front = available(save).sort((a, b) => b.era - a.era || a.km - b.km)[0], k = front && areaOf(front.from);
      if (k && k !== areaOf(save.city) && AREAS[k]) save.city = AREAS[k].start;
    }
    if (s2) {
      c2 = available(save).find(c => { const ctx = offerCtx(save, c); if (PROG_PLANTS.nostars) delete ctx.missionsDone; return offerCheck(c, ctx).offered; }) || null;
      if (c2) { save.flyCrossing = c2; crossing = c2.km; }
    } else {
      if (n === 1 || n % every === 0) cap = capability(save, { pilots: ['careful'], seeds: capSeeds }).careful.median;
      // Offered (MASTER-PLAN B4, conditions 1 and 2; area missions are not modelled): the plane + nature can make it,
      // and the land of the city you are in has biodiversity >= 30.
      const offered = tier < tiers.length && cap >= tiers[tier] && homeBio >= 30;
      crossing = offered ? tiers[tier] : 0;
    }
    // chaseGate: when a crossing's distance (the best landed flight) is short and its nature is met, aim to land beyond it
    // (also while its missions are still open: they are done in parallel).
    let landFrom = 0;
    if (s2 && chaseGate && !c2) for (const c of available(save)) { const ctx = offerCtx(save, c), need = offerCheck(c, ctx).need;
      if (!need.capability && need.nature) landFrom = Math.max(landFrom, Math.ceil(SEASON.offer.distanceShare * c.km) + 50); }
    const w = flyOne(save, { seed: seed * 100000 + n, skill: s, careful, crossing, useHint, landFrom, maxSkip: careful ? maxSkip : Math.floor(rnd() * 3) });
    save = w.save;
    const here = w.regionNow && REGION_DATA[w.regionNow] ? w.regionNow : 'woodland';
    if (c2) {   // as GameScene.finish: a landed crossing opens the far side; the crossing is over either way
      if (w.landed && !PROG_PLANTS.nocomplete) completeCrossing(save, c2);
      delete save.flyCrossing;
    }
    if (crossing) {
      const made = c2 ? !!w.landed : w.landed && w.distancePx >= crossing - 50;
      events.push({ flight: n, minutes: +(save.flightSeconds / 60).toFixed(1), what: `crossing ${crossing} km ${made ? 'MADE' : 'failed'}` });
      if (made && !c2) tier++;
    }
    const prizes = claim(save);   // a child taps CLAIM on every finished mission and badge
    const bought = shop(save, here);
    if (s2) { const done = missionsOnSave(save); if (done.length) claim(save); }   // save-event missions (a purchase, a project), as the game checks after a buy
    const era = eraProgress(save).index;
    if (era > eraWas) { events.push({ flight: n, minutes: +(save.flightSeconds / 60).toFixed(1), what: `era ${era} opens (${fleetOf(save).plane})` }); eraWas = era; }
    rows.push({ flight: n, skill: +s.toFixed(3), km: Math.round(w.distancePx), landed: !!w.landed, end: w.landed ? 'landed' : (w.endReason || '').split('\n')[0],
      skipped: w.airportsSkipped, crossing: crossing || '', crossingId: c2 ? c2.id : '', areas: s2 ? [...save.areas] : null, seeds: save.seeds, crystals: save.crystals || 0, minutes: +(save.flightSeconds / 60).toFixed(1),
      era, plane: fleetOf(save).plane, bio: biodiversity(save, here), region: here, homeBio, prizes: prizes.seeds, capability: cap, bought: bought.join(' ') });
  }
  return { rows, events, summary: summarise(rows, events) };
}

function summarise(rows, events) {
  const band = (a, b) => rows.filter(r => r.flight >= a && r.flight <= b);
  const q = (xs, f) => { const s = [...xs].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * f))] : null; };
  const bands = [[1, 5], [6, 10], [11, 20], [21, 50], [51, 1e9]].map(([a, b]) => { const r = band(a, b); return r.length ? {
    flights: b > 1e8 ? `${a}+` : `${a}-${b}`, n: r.length, median: q(r.map(x => x.km), 0.5), p90: q(r.map(x => x.km), 0.9), landed: +(r.filter(x => x.landed).length / r.length).toFixed(2) } : null; }).filter(Boolean);
  return { bands, events, last: rows[rows.length - 1] };
}
