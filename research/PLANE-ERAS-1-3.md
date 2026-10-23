# Plane side, eras 1-3 (1950s, 1970s, 1990s): formal spec, DRAFT 2 (approved by the user, 2026-10-23)

> Fact-check applied 2026-10-23 (research/plane-verification-eras.md: 21 confirmed, 13 corrected, 2 wrong era,
> 3 unconfirmed). Items still marked (verify) are UNCONFIRMED or rest on secondary sources only.

Extends research/PLANE-DESIGN.md. Numbers are GAME VALUES (est.) on today's dials (src/upgrades.js /
config.js). Facts marked (verify) must be checked against a primary source before they appear in the game
(fact-check: research/plane-verification-eras.md). Prices below are BEFORE scaling (section 7).

## Contents
1. Structure  2. Era gates  3. Planes  4. Systems  5. Gadgets  6. Combined systems hint  7. Prices  8. Looks

## 1. Structure
- **Plane** (per plane; kept in your FLEET with its upgrades; choose which plane to fly): lines Engines,
  Wings & body, Cabin. 1950s plane 2 levels per line, 1970s 3, 1990s 4.
- **Systems** (fleet-wide, never reset): Forecasting, Air traffic control, Fuel & operations.
- **Gadgets** (fleet-wide, never reset, era technology): Magnet, Cargo hold, Landing gear, Sensors, Autopilot.
- Systems and gadgets: **2 levels per line per era**; later levels show "blocked until the 1970s", etc.
- Only the plane is new each era. Flying time counts with any plane. Hangar tabs: Plane | Systems | Gadgets.
- Nothing bought = today's no-upgrade values (revealPx 50, pickup 12, perSkip 0.5, flare 1, dodge 1 / 3 a
  night, autopilot pick-up 8 s at 6%).

## 2. Era gates (flying time, crashes count; era n = 30 x n^1.5 min)
| Era | Opens at | Time in era | Typical sky seeds earned in it (flight log) | Budget |
|---|---|---|---|---|
| 1950s | start | 30 min | ~300 (+ early badges and missions) | ~600 |
| 1970s | 30 min | 85 min | ~1,100 | ~1,500 |
| 1990s | 1.9 h | 156 min | ~3,200 | ~3,500 |

## 3. Planes
| Era | Plane | Base CO2 | Contrail margin | Fact card |
|---|---|---|---|---|
| 1950s | Comet 4 (new art) | x1.25 | deep inside icy air only (eta ~0.23, Schumann 2000: CONFIRMED) | Hot, thirsty exhaust makes the fewest contrails |
| 1970s | 747 (today's plane, the user's favourite) | x1.00 | inside | The first jumbo, with big fans |
| 1990s | Twin-engine widebody (A330/777-style, new art) | x0.80 | to the edge (eta ~0.3) | Two big engines instead of four |
Fares (NEW): a landed flight pays 1 seed per 1,000 km per passenger x the cabin bonus (est.; tune). Card: a
fuller plane = less CO2 per passenger.

**Comet 4**
| Line | L | Name and real thing | Effect | Cost | Look |
|---|---|---|---|---|---|
| Engines | 1 | Rolls-Royce Avon turbojets, tuned | CO2 x0.95 | 40 | Hangar: polished intake lips |
| Engines | 2 | Thrust reversers (verify) | landing window x1.15 | 90 | Flight + hangar: reverser doors on the exhausts |
| Wings & body | 1 | Pinion fuel tanks (verify) | cargo +0.05 per airport skipped | 40 | Flight: bump on the wing's leading edge; hangar: pods |
| Wings & body | 2 | Oval windows and thicker skin: the metal-fatigue lesson of the 1954 accidents (cracks began at the corners of cut-outs) | landing window x1.1 (a sturdier plane) | 90 | Hangar: oval windows |
| Cabin | 1 | Tourist class (verify) | fares +10% | 30 | Hangar: denser window row |
| Cabin | 2 | Jet-age galley (hot meals at 35,000 ft) | fares +20% | 70 | Hangar: galley door |

**747 jumbo**
| Line | L | Name and real thing | Effect | Cost | Look |
|---|---|---|---|---|---|
| Engines | 1 | JT9D high-bypass turbofans | CO2 x0.93 | 90 | Flight + hangar: big fan faces |
| Engines | 2 | Hush-kit nacelles | CO2 x0.88 | 200 | Flight: longer pods |
| Engines | 3 | Next-gen engines (747-400 era) | CO2 x0.80 | 350 | Hangar: new pylons and nacelles |
| Wings & body | 1 | Stretched upper deck (747-300) | cargo +1 step | 80 | Flight: longer hump |
| Wings & body | 2 | Winglets (747-400) (verify) | CO2 x0.95 | 180 | Flight + hangar: upturned tips |
| Wings & body | 3 | Glass cockpit | landing window x1.1 | 320 | Hangar: new cockpit frame |
| Cabin | 1 | Upper-deck lounge (verify) | fares +10% | 70 | Hangar: lounge windows on the hump |
| Cabin | 2 | Wide-body economy, nine or ten across | fares +20% | 160 | - |
| Cabin | 3 | Business class (around 1979, verify) | fares +35% | 300 | Hangar: livery stripe |

**1990s twin**
| Line | L | Name and real thing | Effect | Cost | Look |
|---|---|---|---|---|---|
| Engines | 1 | FADEC: engines run by computer | CO2 x0.95 | 150 | - |
| Engines | 2 | Giant-fan engines (GE90-style, verify) | CO2 x0.88 | 300 | Flight + hangar: huge pods |
| Engines | 3 | Low-emission combustor (soot down; contrail ice barely changes: Voigt 2026 CONFIRMED) | CO2 x0.86 | 500 | - |
| Engines | 4 | Wide-chord fan blades (Rolls-Royce 1984; composite on the GE90, 1995) | CO2 x0.82 | 750 | Hangar: broad blades in the intake |
| Wings & body | 1 | Composite tail | take-off x0.92 | 150 | Hangar: darker tail panels |
| Wings & body | 2 | Winglets (A330/A340, 1993) | CO2 x0.96 | 300 | Flight + hangar: upturned tips |
| Wings & body | 3 | Fly-by-wire (verify) | landing window x1.1 | 480 | - |
| Wings & body | 4 | Riblet film, 'sharkskin' (flight-tested on an A320, late 1980s; airline use only from 2022) | CO2 x0.95 | 700 | Hangar: fine sheen |
| Cabin | 1 | Seat-back screens | fares +10% | 120 | - |
| Cabin | 2 | XL overhead bins | fares +20% | 260 | - |
| Cabin | 3 | Premium economy (1992) | fares +30% | 420 | Hangar: livery band |
| Cabin | 4 | Flat beds in first class (1995) | fares +45% | 650 | Hangar: upper-window glow |

## 4. Systems (2 levels per era; look = at every airport)
**Forecasting** (revealPx; fake-patch share; late-patch share; night odds)
| Era | L | Real technology | Effect | Cost |
|---|---|---|---|---|
| 1950s | 1 | Pilot reports and weather balloons | reveal 60 | 30 |
| 1950s | 2 | First computer weather forecasts (Sweden 1954, USA 1955) (balloon sensors read up to 2.4x too dry: CONFIRMED) | reveal 75; fakes 40% -> 35% | 70 |
| 1970s | 3 | Global forecast model (ECMWF, 1979) | reveal 100 | 150 |
| 1970s | 4 | Better forecast models | reveal 130; fakes 30% | 280 |
| 1990s | 5 | Humidity sensors on airliners (MOZAIC 1994: CONFIRMED) | reveal 160; late 30% -> 20% | 400 |
| 1990s | 6 | Sharing airliner data | reveal 200; 5% fewer night patches in your path | 600 |
Look: 1950s weather-balloon launcher; 1970s forecast office with a radar dome; 1990s data dishes (and the
humidity probe on the plane, via the Sensors gadget).

**Air traffic control**
| Era | L | Real technology | Effect | Cost |
|---|---|---|---|---|
| 1950s | 1 | Fixed airways and radio | gaps +0.5% | 30 |
| 1950s | 2 | Position reports | gaps +1% | 70 |
| 1970s | 3 | Computer radar with altitude readout | turbulence near gaps -15% | 150 |
| 1970s | 4 | Better radar | gaps +2%; "airport ahead" earlier | 280 |
| 1990s | 5 | RVSM, fewer gaps between flight levels (North Atlantic March 1997: CONFIRMED) | gaps +3% | 400 |
| 1990s | 6 | Bird-strike advisories (verify) | flocks in gaps -25% | 600 |
Look: the control TOWER at every airport: 1950s brick tower, radio mast and signal flags; 1970s concrete
tower with a spinning radar dish; 1990s tall glass-topped tower with a satellite dish.

**Fuel & operations** (SAF began in 2009; early levels are real fuel-saving methods)
| Era | L | Real technology | Effect | Cost |
|---|---|---|---|---|
| 1950s | 1 | Standard kerosene jet fuel (Jet A, 1959) | CO2 x0.98 | 30 |
| 1950s | 2 | Best cruise speed (verify) | CO2 x0.96 | 70 |
| 1970s | 3 | Oil-crisis savings: lighter loads (1973) (verify) | take-off x0.92 | 150 |
| 1970s | 4 | Taxi on fewer engines (verify) | take-off x0.86 | 280 |
| 1990s | 5 | Cost-index flight planning (verify) | CO2 x0.94 | 400 |
| 1990s | 6 | Weight-saving programme | CO2 x0.92; take-off x0.82 | 600 |
Look: 1950s a fuel bowser; 1970s fuel tanks; 1990s hydrant fuelling and a pushback tug.

## 5. Gadgets (2 levels per era; costs 1950s 30/70, 1970s 150/280, 1990s 400/600; look = on the plane)
| Gadget (dial) | 1950s L1 / L2 | 1970s L3 / L4 | 1990s L5 / L6 | Look |
|---|---|---|---|---|
| Magnet (pickup px; 12) | Horseshoe magnet 16 / bigger 19 | Electromagnet 22 / stronger coil 26 | Neodymium magnet (1982, verify) 30 / 34 | red horseshoe stuck to the side -> copper coil -> silver disc (decoration, not collision) |
| Cargo hold (perSkip; 0.5) | Mail sacks 0.55 / 0.6 | Cargo containers (ULDs, verify) 0.65 / 0.7 | Roller floor 0.75 / 0.8 | sacks at the hold door -> belly fairing -> bigger fairing |
| Landing gear (flare; 1) | ILS beams (verify) 1.1 / 1.2 | Autoland (Trident 1965, verify) 1.3 / 1.4 | GPS approaches (verify) 1.5 / 1.6 | two-wheel legs -> four-wheel bogies -> six-wheel bogies |
| Sensors (dodge, dodges a night; 1, 3) | Thermometer 1,4 / better 2,4 | Weather radar 2,5 / colour radar 2,6 | Humidity sensor (WVSS-I, verify) 3,6 / 3,8 | nose thermometer probe -> radar nose cone -> side humidity probe |
| Autopilot (pick-up s, chance; 8 s, 6%) | Height hold 8 s / 9 s | Autothrottle 10 s 7% / 11 s | Flight management computer 12 s 8% / 13 s 9% | antenna on top -> two -> satellite dome |

## 6. Combined systems hint (the next-gate reveal)
Needs at least L1 in ALL THREE systems; its strength follows the LOWEST of the three:
| Lowest systems level | Gate hint |
|---|---|
| 1 | very faint flicker at the right edge, 0.5 s before the gate comes on screen |
| 2 | faint, 0.7 s ahead |
| 3 | 0.9 s |
| 4 | 1.1 s, clearer |
| 5 | 1.3 s |
| 6 | 1.5 s ahead, clear |
Later eras continue. First time: a tip ("Your forecasters, controllers and dispatchers are working together").

## 7. Prices
Unscaled totals: 1950s 1,160; 1970s 5,190; 1990s 12,780 (1.9x, 3.5x, 3.7x the budgets). Scale each era so
its total is ~1.5x its budget (x0.78, x0.43, x0.41): a typical player can buy about two thirds before moving
on. Final prices after the build chat simulates income. Crystals = seeds / 8.

## 8. Looks (rules)
- In flight: changes stay inside the original outline +-2 px (collisions use the base 'plane' mask); tiny
  probes and antennas are fine, big additions are not. One plane drawn per generation (PLANE-ART-RECIPE.md);
  a LIVERY you choose, earned from milestones and badges.
- Hangar portrait: shows every upgrade clearly, as whole-plane variants.
- Systems show at the airports (tower, weather station, fuel depot), not on the plane.
