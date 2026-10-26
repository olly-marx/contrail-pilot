# Redesign proposal: a story of chapters, one land at a time

Status: PROPOSAL ONLY (2026-10-25). Nothing is built. Written by the PixelLab session at the coordinator's request,
from the user's direction (relayed 2026-10-25) and the measured facts in `research/REDESIGN-FACTS.md`. This chat did
not build the routing; the facts come from the code.

## Decisions for you (short)

1. **Start choice:** offer **5 starts**, one per big region with enough cities to stay inside for a while:
   Europe (woodland, Amsterdam), the Mediterranean (Rome), North America (plains, Chicago), East Asia (Tokyo),
   Africa (savanna, Nairobi). Not tundra or ocean (2 cities each). Pick a continent (default city) or a city?
   **Suggest: a continent, with its default city** (simpler for a child).
2. **Unlock rule** for the next land: suggest **any 2 of 3**: the land's biodiversity reaches 30; its chapter missions
   are done; its exploring challenge ("land at every city here") is done. Different children get there different ways.
3. **Mission legs:** suggest a mission is **one long flight to a named destination** with no airports in between
   (except an optional stopover the mission names), and its length is set by the mission (2,000-12,000 game km),
   not by real geography. Agree that geography gives the direction and the destination, and difficulty gives the
   distance?
4. **Restart at rollout:** keep **stats + badges + eras** (eras open by flying time, already a stat), wipe **progress**
   (lands unlocked, missions, money, fleet, nature). The online leaderboards keep everything (no database change).
   Agree, or should badges and eras restart too?
5. **Prizes:** take the bug-fix chat's lever: a chapter's missions pay about **half of the current era's price list**.

## The shape

- **Chapters = lands.** You start in one land (chapter 1). Each land you unlock is a new chapter. Eras stay as they
  are and unlock separately, by flying time (the user: "different work").
- **The globe is closed at first.** Only your unlocked lands are lit; the rest are dark. Flights can only go to
  cities in unlocked lands. Unlocked lands that border each other (the biome map in the facts) form one flying area.
- **Missions are the main loop.** On the FLY screen, instead of three directions, you see **three missions**: each
  names a destination city, its direction and its distance ("To ROME, south-east, 4,200 km: land with 10 seeds").
  Pick one and fly. Free flying is parked.

## A chapter (per land)

| Kind | How many | Example (Mediterranean) | What it teaches |
|---|---|---|---|
| Arrival | 1 | "Land in ROME" | the land is open |
| Lessons | chapter 1 only | the onboarding (below) | one new thing per flight |
| Missions | 6-8, three offered at a time | "To LISBON, 6,000 km, a night with no contrail" | skills, at a rising distance |
| Explore challenge | 1 | "Land at every city in the Mediterranean (8)" | different routes, landing |
| Nature | 1-2 | "Finish a habitat project here"; "Plant 5 trees here" | the land's biodiversity |
| Long haul | 1 | "To CASABLANCA without landing: 11,000 km" | the land's hardest flight |
| Firsts | anytime | funny cards (the bug-fix chat's list) | crashing is a memory, not a failure |

When **2 of 3** unlock conditions are met (decision 2), the bordering lands **light up** on the globe and their
arrival missions appear. Lands unlock by touching: from Europe, the Mediterranean, the boreal north, Iceland; and so on.

## How a mission flight is generated

1. **Destination:** a city in your unlocked area that the mission needs (a new city for exploring, any for skills).
2. **Direction:** the real bearing from where you are (`network.js bearing()`), shown as today's heading words.
3. **Distance:** from the mission's difficulty step, not from real km. Steps: 2,000 / 3,500 / 5,000 / 7,000 / 9,000 /
   12,000 game km. Chapter 1 uses the first two; later chapters climb.
4. **What is below:** the flight passes over the real lands between you and the destination (`geo.js legStrip()`
   already does this), stretched to the mission's length, so a long mission inside one land shows that land for longer.
5. **Hazards and gaps:** as today, by distance into the flight (turbulence from 2 km, no-fly from 8, birds from 10), so
   longer missions naturally meet more of them. Storm gaps narrow per pair as today.
6. **Heat:** the Earth bar still ends a flight; a 12,000 km mission needs a good plane or careful contrails, which is
   the skill test the user asked for. (`tools/balance.cjs` checks each step is possible with the era's plane.)

Today's airport-hopping (pass airports, the landing multiplier) can stay as an **optional stopover**: a mission may
name one ("stop at ATHENS on the way for a bonus"), so the skip-and-multiply idea is kept but no longer constant.

## Chapter 1 = the onboarding

The plane build's draft (`~/.plane-onboard`, `src/onboard.js`) already does flights 1-4 with a fence and tabs opening
one by one, and its start city is a parameter (`START_CITY`, `startIn(save, cityName)`). In the story it becomes:

- Before flight 1: **choose your start** (decision 1) and its default city replaces Amsterdam.
- Flights 1-4: the onboarding as drafted, inside the chosen land; the fence becomes "the edge of your land".
- After flight 4: the chapter's missions open (three offered).

The default cities should keep the first two legs inside the land, as Amsterdam does now (Amsterdam > Berlin > Moscow).
To agree with the plane build: the default city per start, and whether the fence uses the land's border.

## How the bug-fix chat's missions proposal fits (PROPOSAL-12)

- **Lessons:** chapter 1's onboarding flights (its "stage 0" table).
- **Challenges** (three offered, pick one): exactly the chapter missions above, but grouped by **land**, not era. Era
  toys still matter: a mission can need a gadget of your era ("with Sensors, dodge 5 icy patches").
- **Firsts:** unchanged.
- **Prizes as the price lever:** a chapter pays about half the current era's price list (decision 5), measured with its
  rewritten `tools/income.cjs`.

## Staged rollout (each stage shippable, each with gates proven by planted defects)

1. **Fix first:** mission 8 "Make your plane cleaner" looks impossible since the eras (see the facts sheet). Fix or
   replace it in today's game now; it doesn't depend on the redesign.
2. **Mission flights behind a preview switch** (`?story=on`, one device, like the PixelLab preview): three missions with
   destination, direction and distance; single long legs; today's lands all open. Measures whether long mission flights
   are fun and fair before anything else changes.
3. **Start choice + chapter 1** for **new saves only**, with the plane build's onboarding. Returning players untouched.
4. **Closed globe and unlocking** (all chapters) still behind `?story=on`, then on for new saves.
5. **The restart for everyone** (decision 4), once 2-4 are proven: one migration that keeps the stats keys and resets
   progress, with a "Welcome to the new Contrail Pilot" card. No database change: leaderboards keep the history.

## Risks

- **Fewer, longer flights** change the money: fares are per 1,000 km and the skip multiplier pays per airport. The
  price work (bug-fix chat) must run after stage 2.
- **Small lands** (tundra, ocean: 2 cities) can't hold a chapter alone: join them to a neighbour (Iceland with the
  boreal north, the ocean islands with East Asia) or give them a short "island" chapter.
- **A child stuck in one land:** the 2-of-3 rule plus the exploring challenge gives three ways out; measure with a bot.
- **Leaderboards** built for today's flights (Longest, Laps) mean something different with long missions. Not a
  database change, but the board texts need a look.

## Tests to write when built (examples)

- A mission's destination is always in your unlocked area (plant: an unlocked check removed → fails).
- A mission flight's length equals its difficulty step (plant: real km used → fails).
- A land unlocks after exactly 2 of 3 conditions (plant: 1 of 3 → fails).
- The restart keeps every stats key and resets every progress key (plant: drop `flownKm` → fails).
