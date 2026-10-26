# Proposal 14: more hazards and the upgrades that help with them

Status: PROPOSAL ONLY (2026-10-24, PixelLab session). Nothing is built. The user's rule: **the controls do not
change** (hold to climb, tap, nothing new to learn with the fingers).

## What is there today (read from `src/config.js` HAZARDS and `src/fleet.js`)

- Storms (the gap), icy air (contrails), turbulence patches from 2 km (bumps the plane), no-fly zones from 8 km,
  bird flocks from 10 km.
- Upgrades that already help: ATC "Computer radar" makes storm gaps calmer (`gapTurb: 0.85`), ATC "Bird-strike
  advisories" makes 25 % fewer flocks in gaps (`gapBirds: 0.75`), Sensors and Forecasting show icy air earlier.
- Eras: 1950s, 1970s, 1990s, 2010s, 2030s, far future. Each system/gadget level belongs to an era.

## New hazards (each one is something you SEE coming and fly round, with the same controls)

| Hazard | What it does | Looks like | When it starts | Real science line for kids |
|---|---|---|---|---|
| **Downdraft** | A column of sinking air: while you are inside it, the plane falls a little faster (gravity x1.3). Fly round it or climb early. | Pale streaks pointing down under a storm's base. | 1970s era, from 6 km | "Storms pull air down hard underneath. Pilots fly round them." |
| **Volcanic ash** | A grey cloud band: touching it adds CO2 and dims the screen edge for 2 s (no crash). A forecast shows it. | Grey-brown haze with a tiny volcano on the ground below. | 1990s era, rare (1 in 4 long legs) | "Ash can stop jet engines. Since 1982 planes are warned and fly round it." |
| **Crosswind on landing** | The runway approach drifts the plane slightly up or down. The landing flare still works, it just needs a steadier hand. | A windsock by the runway, arrows in the air. | 1950s era already (it is about landing), gentle | "Wind across the runway makes landing tricky. Pilots point into the wind." |

Each hazard has a **first-time tip** (the existing `explain()` pop-up, one diagram from `make_diagrams.py`)
and never appears in Flight School.

## Upgrades that help (fit into the existing systems; no new screen)

| Upgrade | Where | Effect | Era |
|---|---|---|---|
| **Gust alleviation** (real: load-alleviation systems, 1970s-80s) | new level line on the Autopilot gadget, or a 4th system "Turbulence control" | turbulence bumps 30 % smaller, downdraft pull x1.15 instead of x1.3 | 1970s, better in 2010s |
| **Bird radar** (real: airport avian radar, 2000s) | extends ATC level 6 "Bird-strike advisories" | flocks shown 1 s earlier with a small "!" | 2010s |
| **Volcanic Ash Advisory Centres** (real, set up after 1982) | a Forecasting level | ash shown from further away, never a surprise | 1990s |
| **Wind shear alert** (real: 1980s-90s, after downdraft accidents) | Sensors level | downdrafts glow red a little earlier | 1990s |

Rule of thumb for balance: each new hazard must be **dodgeable without any upgrade**; upgrades only make it
gentler or show it earlier. That keeps the game fair for a brand-new player.

## Risks and checks

- **Too much at once for young players:** the hazards start in later eras and later in a flight; the first-time
  tip pauses the game, as tips do today.
- **Balance:** the plane build chat's balance bot (`tools/balance.cjs`) should measure flight length before and
  after, era by era, with a target such as "no more than 10 % shorter".
- **Art:** each hazard needs 1 small PixelLab picture (about 3-6 generations in total) plus a diagram.
- **Tests:** per hazard, a gate in the style of `tests/collisions.cjs`: it appears only after its era and distance
  (plant: era check removed → fails); its upgrade weakens it (plant: upgrade ignored → fails); it never crashes the
  plane by itself (ash, crosswind).
