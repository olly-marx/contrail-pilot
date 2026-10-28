// The plane side, eras 1-3 (research/PLANE-ERAS-1-3.md, approved 2026-10-23). Replaces the old plane
// upgrade lines at the reset (stage 3). The tree lines in upgrades.js (trees, soil, species, nursery)
// are NOT here and stay as they are.
//   PLANES:  one per era, kept in your fleet with their own Engines / Wings & body / Cabin levels.
//   SYSTEMS: fleet-wide, 2 levels per era (Forecasting, Air traffic control, Fuel & operations).
//   GADGETS: fleet-wide, 2 levels per era (Magnet, Cargo hold, Landing gear, Sensors, Autopilot).
// Effects are GAME VALUES (est.) on today's dials. `verify: true` = the fact behind the name is not yet
// confirmed by a primary source (plane-verification-eras.md): the game must not present it as fact.
// Costs are the spec's unscaled prices x ERA_SCALE (section 7: each era totals ~1.5x its budget);
// estimates until tuned against measured income. Crystals = seeds / 8.
import { ISSR, CARGO, CRYSTALS, POWERUPS } from './config.js';
import { eraProgress } from './eras.js';

export const ERA_SCALE = [0.78, 0.43, 0.41, 0.54, 0.5, 0.46];
// Seeds a typical player earns in each era (flight log, est.). 2010s 8,000: TBD-SIM (experts bank ~17,000 by flight 200,
// BALANCE-RESCALE-S2; the sim chat re-measures with the 787 and nature finance before the era 4 release).
export const ERA_BUDGET = [600, 1500, 3500, 8000, 14000, 22000];   // 2030s 14,000, far future 22,000: TBD-SIM
export const START_BONUS = 300;                // seeds, once, at the reset (user, 2026-10-23: no refund of old plane upgrades)

const price = (era, cost) => { const seeds = Math.max(5, Math.round(cost * ERA_SCALE[era] / 5) * 5); return { cost: seeds, crystals: Math.round(seeds / 8) }; };
const L = (era, cost, name, fx, more = {}) => ({ name, ...price(era, cost), ...fx, ...more });
const V = { verify: true };

// margin: how far from icy air a contrail forms: 'deep' only deep inside, 'inside', 'edge'.
// CONTRAIL_MARGIN: the icy patch's blob radii x this when testing the plane (GameScene.inIssrShape).
// Real basis, CONFIRMED (plane-verification.md 1-4): Schumann et al. 2000 flew a B707 (eta 0.23) beside
// an A340 (eta 0.31): only the efficient A340 made a contrail; higher efficiency starts contrails in
// warmer air (eta 0.3 to 0.5: about 700 m lower). The sizes below are GAME VALUES (est.); 'inside' =
// today's game, unchanged.
// Forecast false patches puff away when the plane is this close (px, game value).
export const FORECAST = { popPx: 30 };
// The next-gap hint (PLANE-ERAS-1-3.md section 6), by the LOWEST of the three systems' levels:
// seconds of warning before a storm gap scrolls on screen, and how bright the gate is. Game values.
export const GAP_HINT = { lead: [0, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7], alpha: [0, 0.25, 0.32, 0.4, 0.5, 0.6, 0.75, 0.8, 0.85, 0.88, 0.9, 0.92, 0.94] };   // 7-8: the 2010s, 9-10: the 2030s, 11-12: far future
// Passenger fares: seeds per 1,000 km of a LANDED flight, x the Cabin upgrades (GAME VALUES, est.;
// tune against measured income ~39 seeds a flight). Bigger planes carry more people.
export const FARES = { comet: 2, jumbo: 3, twin: 4, dreamliner: 5, truss: 6, hydrogen: 7 };
export const CONTRAIL_MARGIN = { deep: 0.75, inside: 1, edge: 1.12, edge2: 1.16, edge3: 1.2, edge4: 1.3 };   // edge3: the 2030s; edge4: hydrogen (more water, +46% formation: PROPOSAL-10)   // edge2: the 2010s (the efficiency trap goes on)
export const PLANES = [
  { id: 'comet', era: 0, name: 'Comet 4', co2: 1.1, margin: 'deep', sprite: 'plane-comet', portrait: 'assets/ui/plane-hangar-comet.png',
    lines: {
      engines: [L(0, 40, 'Rolls-Royce Avon turbojets, tuned', { co2: 0.9 }), L(0, 90, 'Thrust reversers', { flare: 1.15 }, V)],
      body: [L(0, 40, 'Pinion fuel tanks', { perSkip: 0.05 }, V), L(0, 90, 'Oval windows and thicker skin', { flare: 1.1 })],
      cabin: [L(0, 30, 'Tourist class', { fares: 1.1 }, V), L(0, 70, 'Jet-age galley', { fares: 1.2 })],
    } },
  { id: 'jumbo', era: 1, name: '747 jumbo', co2: 1.0, margin: 'inside', sprite: 'plane-747', portrait: 'assets/ui/plane-hangar-jumbo.png',
    lines: {
      engines: [L(1, 90, 'JT9D high-bypass turbofans', { co2: 0.93 }), L(1, 200, 'Hush-kit nacelles', { co2: 0.88 }), L(1, 350, 'Next-gen engines (747-400 era)', { co2: 0.8 })],
      body: [L(1, 80, 'Stretched upper deck (747-300)', { perSkip: 0.05 }), L(1, 180, 'Winglets (747-400)', { co2: 0.95 }, V), L(1, 320, 'Glass cockpit', { flare: 1.1 })],
      cabin: [L(1, 70, 'Upper-deck lounge', { fares: 1.1 }, V), L(1, 160, 'Wide-body economy, nine or ten across', { fares: 1.2 }), L(1, 300, 'Business class', { fares: 1.35 }, V)],
    } },
  { id: 'twin', era: 2, name: '1990s twin', co2: 0.8, margin: 'edge', sprite: 'plane-twin', portrait: 'assets/ui/plane-hangar-twin.png',
    lines: {
      engines: [L(2, 150, 'FADEC: engines run by computer', { co2: 0.95 }), L(2, 300, 'Giant-fan engines', { co2: 0.88 }, V),
        L(2, 500, 'Low-emission combustor', { co2: 0.86 }), L(2, 750, 'Wide-chord fan blades', { co2: 0.82 })],
      body: [L(2, 150, 'Composite tail', { takeoff: 0.92 }), L(2, 300, 'Winglets (A330/A340, 1993)', { co2: 0.96 }),
        L(2, 480, 'Fly-by-wire', { flare: 1.1 }, V), L(2, 700, "Riblet film, 'sharkskin'", { co2: 0.95 })],
      cabin: [L(2, 120, 'Seat-back screens', { fares: 1.1 }), L(2, 260, 'XL overhead bins', { fares: 1.2 }),
        L(2, 420, 'Premium economy (1992)', { fares: 1.3 }), L(2, 650, 'Flat beds in first class (1995)', { fares: 1.45 })],
    } },
  // ERA 4, the 2010s (PROPOSAL-ERAS-4-6-SYSTEMS, user-approved 2026-10-28). Sized to the sim chat's crossing-4 total
  // (BALANCE-ERAS-4-6.md: CO2 x0.65 of the full twin): full twin kit CO2 0.527 -> bare 787 0.57 x Ops 6 0.88 = 0.50 (a bit
  // cleaner: the era step) -> full 0.57 x 0.85 x 0.94 x 0.92 x Ops 8 0.82 = 0.343 (x0.65). Art: code-made from the twin
  // (tools/art/make_787.py, no PixelLab until the user tops up). Facts to check before text ships: research/PLANE-FUTURE.
  // noFlyGapAdd 8: the era step (sim chat, 120 skies at s 0.9: bare 787 +8 >= full twin at 14-30k, 27k -3 pts inside the +-4 SE).
  { id: 'dreamliner', era: 3, name: '787 Dreamliner', co2: 0.57, noFlyGapAdd: 8, margin: 'edge2', sprite: 'plane-787', portrait: 'assets/ui/plane-hangar-787.png',
    lines: {
      engines: [L(3, 900, 'GEnx turbofans', { co2: 0.93 }), L(3, 1300, 'Chevron nacelles: saw-tooth edges, quieter', { co2: 0.9 }),
        L(3, 1800, 'Trent 1000 TEN engines', { co2: 0.85 })],
      body: [L(3, 900, 'One-piece carbon-fibre barrel', { co2: 0.94 }), L(3, 1300, 'Raked wingtips that flex upwards', { co2: 0.92 }),
        L(3, 1800, 'Electric brakes and systems', { takeoff: 0.9 })],
      cabin: [L(3, 700, 'Dimmable windows', { fares: 1.1 }), L(3, 1100, 'Lower cabin altitude: less tiring', { fares: 1.25 }),
        L(3, 1600, 'Business suites', { fares: 1.45 })],
    } },
  // ERA 5, the 2030s. Sized to the sim chat's crossing-5 total (BALANCE-ERAS-4-6: CO2 x0.5 of the full twin = 0.263,
  // night contrail heat x0.7): bare 0.40 x Ops 8 0.82 = 0.328 (cleaner than the full 787's 0.343), night 0.85;
  // full 0.40 x 0.92 x 0.97 x 0.97 x 0.975 x Ops 10 0.78 = 0.263, night 0.85 x Ops 10 0.82 = 0.70.
  // The last Wings & body level turns it into a blended wing (JetZero). Art: code-made (tools/art/make_787.py --truss).
  { id: 'truss', era: 4, name: 'Truss-braced wing (X-66)', co2: 0.40, nightHeat: 0.85, margin: 'edge3', sprite: 'plane-truss', portrait: 'assets/ui/plane-hangar-truss.png',
    lines: {
      engines: [L(4, 1600, 'Open-fan engines: no casing round the fan', { co2: 0.95 }), L(4, 2300, 'Bigger open fans', { co2: 0.93 }),
        L(4, 3200, 'Hybrid-electric assist', { co2: 0.92 })],
      body: [L(4, 1600, 'Folding wingtips (fit at the gate)', { co2: 0.97 }), L(4, 2300, 'Laminar-flow skin', { co2: 0.97 }),
        L(4, 3200, 'Blended wing body (JetZero, 2030)', { co2: 0.975, fares: 1.1 })],
      cabin: [L(4, 1300, 'Wide cabin in the wing', { fares: 1.15 }), L(4, 1900, 'Quiet electric taxi', { takeoff: 0.85 }),
        L(4, 2800, 'Window-wall lounge', { fares: 1.35 })],
    } },
  // ERA 6, the far future: the lap of the Earth. Sized to the sim chat's lap total (BALANCE-ERAS-4-6: CO2 x0.4 of the full
  // twin = 0.211, night contrail heat x0.4): bare 0.32 x Ops 10 0.78 = 0.25 (cleaner than the full truss wing's 0.263),
  // night 0.6; full 0.32 x 0.94 x 0.97 x 0.98 x Ops 12 0.74 = 0.211, night 0.6 x Ops 12 0.667 = 0.40. 'CO2' here is the
  // hydrogen's making and the climb (a facts check is due before text ships). Art: code-made pale silver.
  { id: 'hydrogen', era: 5, name: 'Hydrogen blended wing', co2: 0.32, nightHeat: 0.6, margin: 'edge4', sprite: 'plane-hydrogen', portrait: 'assets/ui/plane-hangar-hydrogen.png',
    lines: {
      engines: [L(5, 2600, 'Fuel-cell pods along the wing', { co2: 0.97 }), L(5, 3600, 'Superconducting motors', { co2: 0.94 }),
        L(5, 5000, 'Quieter ducted fans', { takeoff: 0.85 })],
      body: [L(5, 2600, 'Insulated liquid-hydrogen tanks', { co2: 0.97 }), L(5, 3600, 'Laminar-flow skin, all over', { co2: 0.98 }),
        L(5, 5000, 'Cabin inside the wing', { fares: 1.15 })],
      cabin: [L(5, 2000, 'Panorama seats', { fares: 1.15 }), L(5, 3000, 'Quiet cabin, no engine roar', { fares: 1.3 }),
        L(5, 4400, 'Sleep pods for the lap', { fares: 1.5 })],
    } },
];
export const PLANE_LINES = { engines: 'Engines', body: 'Wings & body', cabin: 'Cabin' };

// Systems and gadgets: level k (1..6) belongs to era floor((k-1)/2). Values are the level's dial
// settings (not multipliers on the level before), except where named *Mul.
const C = [30, 70, 150, 280, 400, 600, 900, 1300, 1800, 2500, 3400, 4500];   // unscaled gadget/system costs by level (7-12: eras 4-6)
const S = (k, name, fx, more) => L(Math.floor(k / 2), C[k], name, fx, more);
export const SYSTEMS = [
  { id: 'forecast', name: 'Forecasting', levels: [
    S(0, 'Pilot reports and weather balloons', { reveal: 60 }), S(1, 'First computer weather forecasts', { reveal: 75, fakes: 0.35 }),
    S(2, 'Global forecast model (ECMWF, 1979)', { reveal: 100, fakes: 0.35 }), S(3, 'Better forecast models', { reveal: 130, fakes: 0.3 }),
    S(4, 'Humidity sensors on airliners (MOZAIC, 1994)', { reveal: 160, fakes: 0.3, late: 0.2 }),
    S(5, 'Sharing airliner data', { reveal: 200, fakes: 0.3, late: 0.2, nightPatches: 0.95 }),
    // 2010s (eras 4-6 proposal): sharper, fewer false alarms. nightPatches stays 0.95: the measured heat totals come from
    // the plane and Ops only (BALANCE-ERAS-4-6), so forecasting adds no hidden heat cut.
    S(6, 'Satellite contrail detection (2017)', { reveal: 240, fakes: 0.25, late: 0.15, nightPatches: 0.95 }),
    S(7, 'Ensemble humidity forecasts', { reveal: 280, fakes: 0.2, late: 0.12, nightPatches: 0.95 }),
    S(8, 'AI weather models (2023+)', { reveal: 330, fakes: 0.12, late: 0.08, nightPatches: 0.95 }),
    S(9, 'Contrail forecasts in the flight plan', { reveal: 360, fakes: 0.1, late: 0.06, nightPatches: 0.95 }),
    S(10, 'Lidar sky picture', { reveal: 400, fakes: 0.05, late: 0.03, nightPatches: 0.95 }),
    S(11, 'Shared live humidity from every plane', { reveal: 440, fakes: 0.03, late: 0.02, nightPatches: 0.95 })] },
  { id: 'atc', name: 'Air traffic control', levels: [
    S(0, 'Fixed airways and radio', { gaps: 1.005 }), S(1, 'Position reports', { gaps: 1.01 }),
    S(2, 'Computer radar with altitude readout', { gaps: 1.01, gapTurb: 0.85 }), S(3, 'Better radar', { gaps: 1.02, gapTurb: 0.85, airportEarly: true }),
    S(4, 'RVSM: more flight levels (North Atlantic, 1997)', { gaps: 1.03, gapTurb: 0.85, airportEarly: true }),
    S(5, 'Bird-strike advisories', { gaps: 1.03, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75 }, V),
    // 2010s: the answer to drifting no-fly zones (they arrive at 14,000 km in the 2010s): see them early, with their drift.
    S(6, 'Satellite tracking (ADS-B)', { gaps: 1.03, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 300 }),
    S(7, 'Free route airspace', { gaps: 1.03, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 300, noFlyGapAdd: 10 }),
    // 2030s: the answer to turning flocks (they arrive at 18,000 km): the call before the turn.
    S(8, 'Contrail-aware air traffic control', { gaps: 1.04, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 350, noFlyGapAdd: 10 }),
    S(9, 'Turn calls: "flock climbing"', { gaps: 1.04, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 350, noFlyGapAdd: 10, turnShown: true }),
    // Far future: the answer to pulsing storms (from 22,000 km) and the long-haul squeeze.
    S(10, 'Automatic separation', { gaps: 1.05, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 400, noFlyGapAdd: 12, turnShown: true }),
    S(11, 'Sky-wide traffic picture', { gaps: 1.05, gapTurb: 0.85, airportEarly: true, gapBirds: 0.75, noFlyWarnPx: 400, noFlyGapAdd: 16, turnShown: true, pulseShown: true })] },
  { id: 'ops', name: 'Fuel & operations', levels: [
    S(0, 'Standard kerosene jet fuel (Jet A, 1959)', { co2: 0.96 }), S(1, 'Best cruise speed', { co2: 0.92 }, V),
    S(2, 'Oil-crisis savings: lighter loads (1973)', { co2: 0.92, takeoff: 0.92 }, V), S(3, 'Taxi on fewer engines', { co2: 0.92, takeoff: 0.86 }, V),
    S(4, 'Cost-index flight planning', { co2: 0.9, takeoff: 0.86 }, V), S(5, 'Weight-saving programme', { co2: 0.88, takeoff: 0.82 }),
    S(6, 'Sustainable fuel blends (SAF)', { co2: 0.85, takeoff: 0.82 }),
    // Contrail-free cruise (trials 2023): hold to make no contrail, cleanSecs a night. A design call (the sim cannot value it).
    S(7, 'Contrail-free cruise', { co2: 0.82, takeoff: 0.8, cleanSecs: 6 }),
    // 2030s: less night contrail heat (the measured x0.7 with the plane's 0.85), and a longer meter.
    S(8, 'Low-soot fuel: fewer ice crystals', { co2: 0.8, takeoff: 0.8, cleanSecs: 6, nightHeat: 0.9 }),
    S(9, 'Contrail-free cruise 2', { co2: 0.78, takeoff: 0.78, cleanSecs: 10, nightHeat: 0.82 }),
    // Far future: the measured x0.4 night heat with the plane's 0.6. (No contrail-free cruise by day: day contrails SHADE.)
    S(10, 'Hydrogen logistics', { co2: 0.76, takeoff: 0.7, cleanSecs: 12, nightHeat: 0.8 }),
    S(11, 'Contrail-free cruise 3', { co2: 0.74, takeoff: 0.6, cleanSecs: 14, nightHeat: 0.667 })] },   // (0.10.2: CO2 doubled for L1-2, kept rising after)
];
export const GADGETS = [
  { id: 'magnet', name: 'Magnet', levels: [S(0, 'Horseshoe magnet', { pickup: 16 }), S(1, 'Bigger horseshoe', { pickup: 19 }),
    S(2, 'Electromagnet', { pickup: 22 }), S(3, 'Stronger coil', { pickup: 26 }), S(4, 'Neodymium magnet', { pickup: 30 }, V), S(5, 'Bigger neodymium', { pickup: 34 }, V)] },
  { id: 'hold', name: 'Cargo hold', levels: [S(0, 'Mail sacks', { perSkip: 0.55 }), S(1, 'More mail sacks', { perSkip: 0.6 }),
    S(2, 'Cargo containers', { perSkip: 0.65 }, V), S(3, 'More containers', { perSkip: 0.7 }, V), S(4, 'Roller floor', { perSkip: 0.75 }), S(5, 'Longer roller floor', { perSkip: 0.8 })] },
  { id: 'gear', name: 'Landing gear', levels: [S(0, 'ILS beams', { flare: 1.1 }, V), S(1, 'Sharper ILS beams', { flare: 1.2 }, V),
    S(2, 'Autoland (Trident, 1965)', { flare: 1.3 }, V), S(3, 'Better autoland', { flare: 1.4 }, V), S(4, 'GPS approaches', { flare: 1.5 }, V), S(5, 'Precise GPS approaches', { flare: 1.6 }, V)] },
  { id: 'sensors', name: 'Sensors', levels: [S(0, 'Thermometer', { dodge: 1, perNight: 4 }), S(1, 'Better thermometer', { dodge: 2, perNight: 4 }),
    S(2, 'Weather radar', { dodge: 2, perNight: 5 }), S(3, 'Colour radar', { dodge: 2, perNight: 6 }),
    S(4, 'Humidity sensor (WVSS-I)', { dodge: 3, perNight: 6 }, V), S(5, 'Better humidity sensor', { dodge: 3, perNight: 8 }, V),
    S(6, 'Bird radar', { dodge: 3, perNight: 8, birdWarnPx: 250 }), S(7, 'Longer-range bird radar', { dodge: 3, perNight: 9, birdWarnPx: 350 }),
    // 2030s bird detection (the user's "less up/down bird movement"): steadier flocks. Sized by playtest (the sim cannot value it).
    S(8, 'Bird detection', { dodge: 3, perNight: 9, birdWarnPx: 350, birdWobble: 0.6 }), S(9, 'Better bird detection', { dodge: 3, perNight: 10, birdWarnPx: 400, birdWobble: 0.35 }),
    // Far future: bird-aware routing, fewer flocks (x the spawn chance, with ATC's advisories: kit.gapBirds, no new rule).
    S(10, 'Bird-aware routing', { dodge: 3, perNight: 10, birdWarnPx: 400, birdWobble: 0.35, birdChance: 0.85 }),
    S(11, 'Better bird-aware routing', { dodge: 3, perNight: 11, birdWarnPx: 400, birdWobble: 0.35, birdChance: 0.7 })] },
  { id: 'autopilot', name: 'Autopilot', levels: [S(0, 'Height hold', { autoSecs: 8, autoChance: 0.06 }), S(1, 'Better height hold', { autoSecs: 9, autoChance: 0.06 }),
    S(2, 'Autothrottle', { autoSecs: 10, autoChance: 0.07 }), S(3, 'Better autothrottle', { autoSecs: 11, autoChance: 0.07 }),
    S(4, 'Flight management computer', { autoSecs: 12, autoChance: 0.08 }), S(5, 'Better flight computer', { autoSecs: 13, autoChance: 0.09 }),
    S(6, 'Gap-tracking autopilot', { autoSecs: 14, autoChance: 0.09 }), S(7, 'Better gap tracking', { autoSecs: 15, autoChance: 0.1 }),
    S(8, 'Autopilot that sees birds', { autoSecs: 16, autoChance: 0.11 }), S(9, 'Better bird-aware autopilot', { autoSecs: 17, autoChance: 0.12 }),
    S(10, 'Autopilot that sees the whole sky', { autoSecs: 18, autoChance: 0.13 }), S(11, 'Best autopilot', { autoSecs: 19, autoChance: 0.14 })] },
];

export const levelEra = k => Math.floor((k - 1) / 2);   // 1-based level -> era index
export const planeById = id => PLANES.find(p => p.id === id);

// The fleet part of a save: { plane: id flown, planes: { id: { engines, body, cabin } }, systems: { id: n }, gadgets: { id: n } }.
export function fleetOf(save) {
  const f = save.fleet || {};
  return { plane: f.plane || 'comet', planes: f.planes || { comet: {} }, systems: f.systems || {}, gadgets: f.gadgets || {} };
}

// Is this level (1-based) open yet? Systems/gadgets by their era; plane lines by the plane's era.
export const eraOpen = (save, era) => eraProgress(save).index >= era;

// Everything the player could buy next, with whether its era is open (for the hangar, stage 3).
export function nextBuys(save) {
  const f = fleetOf(save), out = [];
  for (const [kind, list, owned] of [['system', SYSTEMS, f.systems], ['gadget', GADGETS, f.gadgets]])
    for (const g of list) { const n = owned[g.id] || 0, lv = g.levels[n]; if (lv) out.push({ kind, id: g.id, level: n + 1, ...lv, open: eraOpen(save, levelEra(n + 1)) }); }
  for (const p of PLANES) {
    const mine = f.planes[p.id]; if (!mine) continue;
    for (const line of Object.keys(PLANE_LINES)) { const n = mine[line] || 0, lv = p.lines[line][n]; if (lv) out.push({ kind: 'plane', id: `${p.id}.${line}`, level: n + 1, ...lv, open: eraOpen(save, p.era) }); }
  }
  return out;
}

// The flight settings from the fleet: the plane flown, its levels, systems and gadgets.
// Plane-line effects multiply (co2, flare, fares, takeoff) or add (perSkip) on top of the gadgets.
// Systems and gadgets: each level's values are the whole setting (not on top of the level before).
export function fleetKit(save) {
  const f = fleetOf(save), p = planeById(f.plane) || PLANES[0], mine = f.planes[p.id] || {};
  const at = (list, owned, id) => { const g = list.find(x => x.id === id), n = owned[id] || 0; return n ? g.levels[n - 1] : {}; };
  const sys = id => at(SYSTEMS, f.systems, id), gad = id => at(GADGETS, f.gadgets, id);
  // Engines and Cabin levels are successive versions: only the latest counts (x0.93, then x0.88...).
  // Wings & body levels are different things fitted together: they all count.
  // (Each effect comes from the newest level that HAS it: the Comet's Engines 2, thrust reversers, has no CO2
  // effect, so Engines 1's x0.9 still counts. Until 0.11.6 the newest level replaced everything, so buying
  // reversers lost the CO2 saving: found by the capability study, Comet MID out-flew FULL.)
  const newestEach = got => { const seen = new Set(); return got.slice().reverse().map(lv => {
    const keep = Object.fromEntries(Object.entries(lv).filter(([k]) => !seen.has(k) && ['co2', 'takeoff', 'flare', 'fares', 'perSkip'].includes(k)));
    Object.keys(keep).forEach(k => seen.add(k)); return keep; }); };
  const bought = Object.keys(PLANE_LINES).flatMap(line => { const got = p.lines[line].slice(0, mine[line] || 0); return line === 'body' ? got : newestEach(got); });
  const mul = key => bought.reduce((a, lv) => a * (lv[key] || 1), 1);
  const add = key => bought.reduce((a, lv) => a + (lv[key] || 0), 0);
  const ops = sys('ops'), fc = sys('forecast'), atc = sys('atc'), sen = gad('sensors'), ap = gad('autopilot');
  return {
    plane: p.id, sprite: p.sprite, margin: p.margin,
    co2: p.co2 * mul('co2') * (ops.co2 || 1),              // x CLIMATE.co2Cruise (and take-off)
    takeoff: mul('takeoff') * (ops.takeoff || 1),           // extra x on take-off and landing CO2
    fares: mul('fares'),                                    // x the fare per passenger (stage 8)
    revealPx: fc.reveal || ISSR.revealPx, hiddenAlpha: ISSR.hiddenAlpha,
    // No forecasting: icy air is seen only up close, but honestly. With a forecast: seen sooner, with
    // false patches (`fakes` of those shown) and real ones it missed (`late`). ERA5 skill 0.2-0.4 (CONFIRMED).
    fakes: fc.reveal ? fc.fakes ?? 0.4 : 0, late: fc.reveal ? fc.late ?? 0.3 : 0, nightPatches: fc.nightPatches || 1,
    gaps: atc.gaps || 1, gapTurb: atc.gapTurb || 1, gapBirds: (atc.gapBirds || 1) * (sen.birdChance || 1),   // Sensors 11-12: bird-aware routing airportEarly: !!atc.airportEarly,   // stage 6
    hintLevel: Math.min(f.systems.forecast || 0, f.systems.atc || 0, f.systems.ops || 0),   // next-gap hint (stage 7)
    pickup: gad('magnet').pickup || 12,
    perSkip: (gad('hold').perSkip || CARGO.multiplierPerSkip) + add('perSkip'),
    flare: (gad('gear').flare || 1) * mul('flare'),
    dodgeCrystals: sen.dodge || CRYSTALS.dodge, dodgesPerNight: sen.perNight || CRYSTALS.dodgesPerNight,
    // Autopilot pick-ups only once the Autopilot gadget is bought (0.10.2: they used to come for everyone).
    autoSecs: ap.autoSecs || POWERUPS.autoSeconds, autoChance: ap.autoChance || 0,
    // Eras 4-6 (PROPOSAL-ERAS-4-6-SYSTEMS): kit fields the 2010s levels set; each is 0 / 1 / false before, so eras 1-3 fly as before.
    // noFlyGapAdd: ATC 8+ AND the plane's own (the era step, 2026-10-28: the sim chat measured a BARE 787 worse than a full twin
    // past 21k, the drift costing more than its CO2 gain; a newer plane handles no-fly gaps a little better). TBD-SIM.
    noFlyWarnPx: atc.noFlyWarnPx || 0, noFlyGapAdd: (p.noFlyGapAdd || 0) + (atc.noFlyGapAdd || 0),   // (drawing; rules.js: the gap)
    cleanSecs: ops.cleanSecs || 0,                                              // Ops 8: contrail-free cruise meter (rules.js)
    nightHeatMul: (p.nightHeat || 1) * (ops.nightHeat || 1),                     // night contrail heat (src/sim/physics.js rayRate)
    birdWarnPx: sen.birdWarnPx * ((f.systems.atc || 0) >= 9 && (f.gadgets.sensors || 0) >= 9 ? 2 : 1) || 0,   // Sensors 7+: bird radar; COMBO Bird corridor (ATC 9 + Sensors 9) doubles its reach (drawing)
    birdWobbleMul: sen.birdWobble || 1,                                         // Sensors 9-10: bird detection, steadier flocks (rules.js)
    turnShown: !!atc.turnShown,                                                 // ATC 10: turning flocks show their turn (drawing)
    pulseShown: !!atc.pulseShown,                                               // ATC 12: a pulsing storm shows its beat (drawing)
    // COMBO Full situational awareness: Forecast 11 + ATC 11 + Sensors 11: the outlook shows THREE gaps (drawing).
    fullAware: (f.systems.forecast || 0) >= 11 && (f.systems.atc || 0) >= 11 && (f.gadgets.sensors || 0) >= 11,
    outlook: (f.systems.forecast || 0) >= 7 && (f.systems.atc || 0) >= 7,       // COMBO Barrier outlook: Forecast 7 + ATC 7 (drawing)
    safCans: eraProgress(save).index >= 3,   // SAF began in 2009: free SAF cans only from the 2010s era
  };
}

// The old plane upgrade lines (upgrades.js), retired at the reset. Tree lines are not here.
export const RETIRED_LINES = ['radar', 'fuel', 'engine', 'cabin', 'magnet', 'airframe', 'wings', 'gear', 'hold', 'lens', 'forecast'];
export const newFleet = () => ({ plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} });

// The one-time reset (option a, user 2026-10-23), for a save from before the fleet. ONLY plane-side
// state changes: the old plane levels go, the fuel is normal again (SAF comes back with the 2010s),
// you fly the Comet. Everything else is kept: seeds, crystals, nature (habitat, planted, trees...),
// badges, missions, records, the city and the journey. A save that has flown gets START_BONUS seeds
// and the "Welcome to the 1950s" card.
export function migrateFleet(save) {
  for (const id of RETIRED_LINES) delete (save.levels || {})[id];
  save.fuel = 'kerosene';
  save.fleet = newFleet();
  save.priceVersion = Math.max(save.priceVersion || 1, 2);   // the 2026-10-21 re-value (reprice.js) must not run on top
  if ((save.flights || 0) > 0 || (save.landings || 0) > 0) {
    save.seeds = (save.seeds || 0) + START_BONUS;
    save.eraWelcome = { era: '1950s', bonus: START_BONUS, shown: false };
  }
}

// New planes join the fleet, free, when their era opens. `fly`: also make the newest the plane you
// fly (when an era opens at the end of a flight); on loading a save the chosen plane never changes.
// Returns the plane that joined, or null.
export function syncFleet(save, { fly = false } = {}) {
  const f = save.fleet || (save.fleet = newFleet()), era = eraProgress(save).index;
  let added = null;
  for (const p of PLANES) if (p.era <= era && !f.planes[p.id]) { f.planes[p.id] = {}; added = p; }
  if (added && fly) f.plane = added.id;
  return added;
}

// ---------- buying and choosing (the hangar, src/hangar.js) ----------
// An item from nextBuys(): { kind: 'plane' | 'system' | 'gadget', id ('comet.engines' for plane lines), level, cost, crystals, open }.
export function canAfford(save, item) { return save.seeds >= item.cost && (save.crystals || 0) >= (item.crystals || 0); }

// Buy the next level of one line. `free`: the first-landing free upgrade (level 1 only). Returns true if bought.
export function buyFleet(save, kind, id, { free = false } = {}) {
  const item = nextBuys(save).find(b => b.kind === kind && b.id === id);
  if (!item || !item.open || (free ? item.level !== 1 : !canAfford(save, item))) return false;
  if (!free) { save.seeds -= item.cost; save.crystals = (save.crystals || 0) - (item.crystals || 0); }
  addLevel(save.fleet, kind, id);
  return true;
}
function addLevel(f, kind, id) {
  if (kind === 'plane') { const [p, line] = id.split('.'); f.planes[p][line] = (f.planes[p][line] || 0) + 1; }
  else { const box = kind === 'system' ? (f.systems = f.systems || {}) : (f.gadgets = f.gadgets || {}); box[id] = (box[id] || 0) + 1; }
}

// Hangar feedback (the user, 2026-10-28: "tap on things and SEE THE EFFECT before purchasing"): a COPY of the save
// with the next level of one item added (never stored), so the preview is the same fleetKit() the flight uses.
export function withNext(save, kind, id) {
  const copy = { ...save, fleet: JSON.parse(JSON.stringify(fleetOf(save))) };
  if (kind === 'fly') copy.fleet.plane = id; else addLevel(copy.fleet, kind, id);
  return copy;
}
// The stat bars (src/statbars.js): one per thing an upgrade can change. keys = the fleetKit fields it shows
// (tests/hangar-feedback.cjs: every kit field a purchase changes must be in some bar's keys).
export const STAT_BARS = [
  { id: 'co2', label: 'CO2 per km', keys: ['co2'], v: k => k.co2, min: 0, max: 1.2, better: 'lower' },
  { id: 'takeoff', label: 'Take-off CO2', keys: ['takeoff'], v: k => k.takeoff, min: 0, max: 1, better: 'lower' },
  { id: 'margin', label: 'Contrails made', keys: ['margin'], v: k => CONTRAIL_MARGIN[k.margin], min: 0.5, max: 1.3, better: 'lower' },
  { id: 'reveal', label: 'Icy air seen ahead', keys: ['revealPx'], v: k => k.revealPx, min: 0, max: 200, better: 'higher' },
  { id: 'fakes', label: 'False alarms', keys: ['fakes'], v: k => k.fakes, min: 0, max: 0.4, better: 'lower' },
  { id: 'late', label: 'Icy air missed', keys: ['late'], v: k => k.late, min: 0, max: 0.3, better: 'lower' },
  { id: 'night', label: 'Icy air at night', keys: ['nightPatches'], v: k => k.nightPatches, min: 0, max: 1, better: 'lower' },
  { id: 'gaps', label: 'Room in storm gaps', keys: ['gaps'], v: k => k.gaps, min: 1, max: 1.05, better: 'higher' },
  { id: 'gapTurb', label: 'Bumps in gaps', keys: ['gapTurb'], v: k => k.gapTurb, min: 0, max: 1, better: 'lower' },
  { id: 'gapBirds', label: 'Birds near gaps', keys: ['gapBirds'], v: k => k.gapBirds, min: 0, max: 1, better: 'lower' },
  { id: 'noFlyWarn', label: 'No-fly zones seen early', keys: ['noFlyWarnPx'], v: k => k.noFlyWarnPx, min: 0, max: 400, better: 'higher' },
  { id: 'noFlyGap', label: 'Room in no-fly gaps', keys: ['noFlyGapAdd'], v: k => k.noFlyGapAdd, min: 0, max: 20, better: 'higher' },
  { id: 'outlook', label: 'Barrier outlook', keys: ['outlook'], v: k => (k.outlook ? 1 : 0), onoff: true, better: 'higher' },
  { id: 'clean', label: 'Contrail-free cruise (s a night)', keys: ['cleanSecs'], v: k => k.cleanSecs, min: 0, max: 14, better: 'higher' },
  { id: 'nightHeat', label: 'Night contrail heat', keys: ['nightHeatMul'], v: k => k.nightHeatMul, min: 0, max: 1, better: 'lower' },
  { id: 'birdWarn', label: 'Birds seen early', keys: ['birdWarnPx'], v: k => k.birdWarnPx, min: 0, max: 400, better: 'higher' },
  { id: 'turnShown', label: 'Flock turn calls', keys: ['turnShown'], v: k => (k.turnShown ? 1 : 0), onoff: true, better: 'higher' },
  { id: 'birdWobble', label: 'Birds bobbing up and down', keys: ['birdWobbleMul'], v: k => k.birdWobbleMul, min: 0, max: 1, better: 'lower' },
  { id: 'pulseShown', label: 'Storm beat shown', keys: ['pulseShown'], v: k => (k.pulseShown ? 1 : 0), onoff: true, better: 'higher' },
  { id: 'fullAware', label: 'Full situational awareness', keys: ['fullAware'], v: k => (k.fullAware ? 1 : 0), onoff: true, better: 'higher' },
  { id: 'early', label: 'Early landing call', keys: ['airportEarly'], v: k => (k.airportEarly ? 1 : 0), onoff: true, better: 'higher' },
  { id: 'hint', label: 'Next-gap hint', keys: ['hintLevel'], v: k => k.hintLevel, min: 0, max: 6, better: 'higher' },
  { id: 'fares', label: 'Fares', keys: ['fares'], v: k => k.fares, min: 1, max: 2, better: 'higher' },
  { id: 'skip', label: 'Bonus per airport skipped', keys: ['perSkip'], v: k => k.perSkip, min: 0, max: 1, better: 'higher' },
  { id: 'flare', label: 'Landing window', keys: ['flare'], v: k => k.flare, min: 1, max: 2, better: 'higher' },
  { id: 'pickup', label: 'Pick-up reach', keys: ['pickup'], v: k => k.pickup, min: 0, max: 34, better: 'higher' },
  { id: 'dodge', label: 'Crystals per night', keys: ['dodgeCrystals', 'dodgesPerNight'], v: k => k.dodgeCrystals * k.dodgesPerNight, min: 0, max: 24, better: 'higher' },
  { id: 'autoSecs', label: 'Autopilot time', keys: ['autoSecs'], v: k => k.autoSecs, min: 0, max: 13, better: 'higher' },
  { id: 'autoChance', label: 'Autopilot pick-ups', keys: ['autoChance'], v: k => k.autoChance, min: 0, max: 0.1, better: 'higher' },
];
// Kit fields that are pictures, not stats (the plane picture shows them).
export const PICTURE_KEYS = ['plane', 'sprite'];
// The bars an item would move: [{ ...bar, now, then }]. kind 'fly' = switch to that plane (id = plane id).
export function previewBars(save, kind, id) {
  const a = fleetKit(save), b = fleetKit(withNext(save, kind, id));
  return STAT_BARS.map(d => ({ ...d, now: d.v(a), then: d.v(b) })).filter(r => r.now !== r.then);
}

// Fly any plane in your fleet (controls are the same on every plane: only what's around it changes).
export function choosePlane(save, id) {
  const f = save.fleet;
  if (!f || !f.planes[id]) return false;
  f.plane = id;
  return true;
}

// What a level does, in short words for the hangar card.
export function effectText(fx) {
  const pc = m => Math.round((1 - m) * 100);
  const out = [];
  if (fx.co2) out.push(`${pc(fx.co2)}% less CO2`);
  if (fx.takeoff) out.push(`take-off ${pc(fx.takeoff)}% less CO2`);
  if (fx.flare) out.push(`landing window x${fx.flare}`);
  if (fx.perSkip) out.push(fx.perSkip < 0.5 ? `cargo +${fx.perSkip} per airport passed` : `landing bonus +${fx.perSkip} per airport passed`);
  if (fx.fares) out.push(`fares +${Math.round((fx.fares - 1) * 100)}%`);
  if (fx.reveal) out.push(`see icy air ${fx.reveal} px ahead`);
  if (fx.fakes) out.push(`${Math.round(fx.fakes * 100)}% false patches`);
  if (fx.late) out.push(`${Math.round(fx.late * 100)}% spotted late`);
  if (fx.nightPatches) out.push('fewer icy patches in your path at night');
  if (fx.gaps) out.push(`gaps ${((fx.gaps - 1) * 100).toFixed(1).replace('.0', '')}% wider`);
  if (fx.noFlyWarnPx) out.push('see no-fly zones early, and which way they drift');
  if (fx.noFlyGapAdd) out.push(`no-fly gaps ${fx.noFlyGapAdd} px wider`);
  if (fx.cleanSecs) out.push(`hold to fly ${fx.cleanSecs} s a night with no contrail`);
  if (fx.birdWarnPx) out.push('see birds early');
  if (fx.gapTurb) out.push(`${Math.round((1 - fx.gapTurb) * 100)}% less bumpy air`);
  if (fx.airportEarly) out.push('the "get LOW to land" call comes sooner');
  if (fx.gapBirds) out.push(`${Math.round((1 - fx.gapBirds) * 100)}% fewer bird flocks`);
  if (fx.pickup) out.push(`grab seeds from ${fx.pickup} px`);
  if (fx.dodge) out.push(`${fx.dodge} crystal${fx.dodge > 1 ? 's' : ''} per dodge, ${fx.perNight} a night`);
  if (fx.autoSecs) out.push(`autopilot ${fx.autoSecs} s, found ${Math.round(fx.autoChance * 100)}% of the time`);
  return out.join(', ');
}

// ---------- looks: which art shows each bought level (art session, tools/art/planes/upgrades/) ----------
// Per plane line, one entry per level: the part's art name, or null for levels with no look in the spec.
// Files: in flight assets/upgrades/plane-<art>-<part>.png (62x27), hangar assets/ui/upgrades/hangar-<art>-<part>.png
// (400x176). Each is the WHOLE plane with only that part changed, so parts are layered by changed pixels
// (src/planelook.js). Engines and Cabin: only the newest level with a look shows; Wings & body: all of them.
export const LOOKS = {
  comet: { art: 'comet', engines: ['intakes', 'reversers'], body: ['pinion', 'oval'], cabin: ['tourist', 'galley'] },
  jumbo: { art: '747', engines: ['jt9d', 'hushkit', 'nextgen'], body: ['upperdeck', 'winglet', 'glass'], cabin: [null, null, 'business'] },
  twin: { art: 'twin', engines: [null, 'giantfan', null, 'blades'], body: ['tail', 'winglet', null, 'riblets'], cabin: [null, null, 'premium', 'glow'] },
  // The 787: no part art yet (no PixelLab for eras 4-6): its levels show as stat bars (tests/hangar-feedback.cjs).
  dreamliner: { art: '787', engines: [null, null, null], body: [null, null, null], cabin: [null, null, null], noGadgetArt: true },
  truss: { art: 'truss', engines: [null, null, null], body: [null, null, null], cabin: [null, null, null], noGadgetArt: true },
  hydrogen: { art: 'hydrogen', engines: [null, null, null], body: [null, null, null], cabin: [null, null, null], noGadgetArt: true },
};
export const NO_FLIGHT_LOOK = { '747': ['winglet'], twin: ['winglet'] };   // hangar only (too subtle in flight)
// Gadget stickers on the plane (decoration, never collision): art name, and where its top-left sits on the
// 62x27 plane, by era of the level bought (tools/art/make_upgrades.py STICKER_AT).
export const STICKERS = {
  magnet: { art: 'magnet', at: [[3, 5], [4, 5], [3, 4]] },
  hold: { art: 'hold', at: [[42, 18], [40, 19], [36, 18]] },
  gear: { art: 'gear', at: [[40, 21], [42, 22], [38, 21]], ground: true },   // gear: shown only when it is down
  sensors: { art: 'sensor', at: [[56, 12], [57, 11], [50, 15]] },
  autopilot: { art: 'auto', at: [[30, 7], [46, 3], [30, 8]] },
};
const ERA_IDS = ['1950s', '1970s', '1990s'];

// The parts showing on a plane: [{ line, part }], given its levels ({ engines: 2, ... }).
export function lookParts(planeId, levels = {}) {
  const L = LOOKS[planeId]; if (!L) return [];
  const out = [];
  for (const line of ['engines', 'body', 'cabin']) {
    const got = L[line].slice(0, levels[line] || 0).filter(Boolean);
    for (const part of line === 'body' ? got : got.slice(-1)) out.push({ line, part });
  }
  return out;
}
// Art file names for a plane's look: { base, parts } for 'flight' or 'hangar'.
export function lookFiles(planeId, levels, where = 'flight') {
  const L = LOOKS[planeId], p = planeById(planeId);
  const parts = lookParts(planeId, levels).map(x => x.part).filter(part => where === 'hangar' || !(NO_FLIGHT_LOOK[L.art] || []).includes(part));
  return where === 'flight'
    ? { base: p.sprite, parts: parts.map(part => `plane-${L.art}-${part}`) }
    : { base: p.portrait, parts: parts.map(part => `assets/ui/upgrades/hangar-${L.art}-${part}.png`) };
}
// Hangar gadget overlays for a plane (transparent 400x176, art session): one per gadget bought.
export const hangarGadgets = (save, planeId) => { const g = fleetOf(save).gadgets, art = LOOKS[planeId].art; if (LOOKS[planeId].noGadgetArt) return [];
  return Object.entries(STICKERS).filter(([id]) => g[id]).map(([, s]) => `assets/ui/upgrades/gadget-${art}-${s.art}.png`); };
// Stickers for the gadgets bought: [{ key, x, y, ground }].
export function stickers(save) {
  const g = fleetOf(save).gadgets;
  return Object.entries(STICKERS).filter(([id]) => g[id]).map(([id, s]) => {
    const era = Math.min(2, levelEra(g[id])); return { key: `sticker-${s.art}-${ERA_IDS[era]}`, x: s.at[era][0], y: s.at[era][1], ground: !!s.ground };
  });
}
// All in-flight upgrade art keys (GameScene preloads them from assets/upgrades/).
export const UPGRADE_ART = [
  ...Object.values(LOOKS).flatMap(L => ['engines', 'body', 'cabin'].flatMap(line => L[line].filter(Boolean).filter(part => !(NO_FLIGHT_LOOK[L.art] || []).includes(part)).map(part => `plane-${L.art}-${part}`))),
  ...Object.values(STICKERS).flatMap(s => ERA_IDS.map(e => `sticker-${s.art}-${e}`)),
  ...[1, 2, 3, 4, 5, 6].map(n => `tower-${n}`), ...ERA_IDS.map(e => `station-${e}`),
];
