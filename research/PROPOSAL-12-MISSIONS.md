# Proposal 12 (rewritten for season 2): the one missions design

Rewritten 2026-10-27 by the bug-fix chat. Supersedes the 2026-10-24 version (it is in git history: `git show d1ca9d1:research/PROPOSAL-12-MISSIONS.md`).
Folds in: `PROPOSAL-TREE-MISSIONS.md` (per-land tree missions), `PLANE-ONBOARDING-PLAN.md` (one new thing per flight), `MASTER-PLAN.md` Part H
(area missions), `BALANCE-EARLY-SHOP.md` (sim chat, measured under 0.12.1). Built by the plane build in M4. Nothing here is built; every NUMBER below is
a proposal that the progression sim must confirm (acceptance gates at the end), not a measurement.

## Decisions for the user (4, each with my recommendation)

1. **Which missions gate a crossing, and all three or two of three?** Recommend: each area has THREE gate missions, "a clean night here", "make 10 shade
   on a landed day flight here", "plant 3 kinds of this land's tree in one flight" (the last also opens that land's 4th tree), and the crossing
   needs ALL of them (plus biodiversity 30 and the 70% landed flight, as today). Why all three is safe: the sim shows biodiversity 30 is what holds a
   crossing back (flights 18-68), and these three missions are done on the way to it, so they add skill, not waiting.
2. **How do beginners get enough seeds, if prizes are not simply doubled?** Recommend: FRONT-LOAD seeds-only prizes. The six lessons (onboarding) pay
   330 seeds and each area's 8 missions pay ~800, all in the first ~25 flights, with crystals untouched. That is about the same seed total as the
   measured "double the mission prizes" option, but it comes from more missions earlier, not a bigger number on the same ones, and experts (who are
   crystal-limited) gain nothing. Agree with the principle? The numbers are for the sim to confirm.
3. **One list per area, not one mission at a time?** Today a child sees one mission, in a fixed order, and a hard one (a clean night) can stall the
   chain. Recommend: the six lessons stay in order (they teach); after that each area shows its 8 missions as a list, any order, the three gate
   missions starred. A finished one still waits for CLAIM.
4. **Onboarding reveal order in season 2** (the plane build's plan, adapted because PILOT and BOARDS are resting): HANGAR opens after lesson 1 (with one
   free part), NATURE after lesson 2, the globe and route choice after lesson 4, the crossing card only when a crossing is first offered. Confirm?

Not needing a decision now: Firsts (funny cards, 1 crystal once) and Challenges (three offered, pick one) from the 2026-10-24 version are kept as LATER
work for 0.13+; the draft jokes are in git history.

## 1. What a child sees

1. **Chapter 1: six lessons** (onboarding; one new thing per flight; the plane build's reveal rules and breathers stay theirs). Each lesson is a mission
   with a prize and, from lesson 1, a reveal.
2. **Your area's list: 8 missions**, three starred (the gate). The same eight templates in every area, filled with that area's cities, biome and trees.
3. **When the three starred missions, biodiversity 30 and the 70% flight are all done**, the crossing is offered (card on FLY). Landing it opens the
   next area, and its own list of 8 missions appears. Old areas' lists stay.

## 2. Chapter 1: the lessons (replaces the first six of today's thirteen)

| # | mission (today's id) | the one new thing | opens after it (season 2) | prize |
|---|---|---|---|---|
| L1 | Land at an airport (`land`) | landing | HANGAR, one free part | 30 seeds, 1 crystal |
| L2 | Land with 5 seeds (`seeds-5`) | seeds are kept only if you land | NATURE | 40 seeds, 1 crystal |
| L3 | Make 10 shade in one flight (`shade-10`) | day contrails cool | (nothing: let it settle) | 50 seeds, 1 crystal |
| L4 | A night with no contrail (`clean-night`) | night contrails warm | the globe: choose your way | 60 seeds, 1 crystal |
| L5 | Fly past an airport, then land (`pass-1`) | the landing bonus (the early fence comes off) | (nothing) | 70 seeds, 1 crystal |
| L6 | Plant a tree (`plant-tree`) | trees | (nothing) | 80 seeds, 1 crystal |

Total 330 seeds, 6 crystals. The cheapest 1950s parts cost about 25 seeds, so a beginner who completes a lesson every ~1.7 flights can buy something
after almost every lesson. (Today's formula gave 15 + 20i seeds and 1 + 2i crystals per mission: the first six paid 390 seeds and 36 crystals; the
this table pays fewer crystals on purpose, see section 5.) The later of today's thirteen (`crystals-5`, `go-clean`, `reach-cairo`, `turbulence`, `kinds-3`,
`rewild`, `world`) become area missions or are retired as listed in section 3. `src/missions.js` lessons keep their `check`/`fail`/`progress` text.

## 3. The area list: 8 templates (★ = gate)

Same wording in every area with `<area>` / `<biome>` / `<land>` filled in from `src/areas.js` and `REGION_NAMES`. Needs a landed flight unless marked.

| # | template | check (from the flight result, `r`) | prize (1950s, seeds) |
|---|---|---|---|
| A1 ★ | A clean night over `<biome>` | `r.nightOwl` and the flight started in this area | 80 |
| A2 ★ | Make 10 shade on a day flight here | landed, `r.sunBlocked >= 10`, started here | 80 |
| A3 ★ | Plant 3 kinds of `<land>` tree in one flight | landed, 3 distinct `land:id` tags of THIS land in one flight (NEW result field, see section 4) | 100 |
| A4 | Land at 4 different cities of `<area>` | `save.visited` count inside the area | 60 |
| A5 | Fund a project here and see its animal | a project of this land done (`r.projects`) | 80 |
| A6 | Fly 4,000 km and land | landed, `r.distance >= 4000`, started here | 100 |
| A7 | Fly past 2 airports, then land | landed, `r.airportsSkipped >= 2` | 100 |
| A8 | Earn 5 ice crystals in one flight | `r.crystals >= 5` | 100 |

About 700 seeds and 0 crystals per area in the 1950s. From the 1970s on the same eight are worth the era's price-list ratio (x2.4, x5.7: the
price lists are 920, 2,235, 5,235 seeds), and A6's distance steps up with the crossing lengths (the gate's own 70% flight is the natural top). A forecast
flight and "dodge 5 icy patches at night" replace A7/A8 from the 1990s when forecasts and sensors exist. Retired from today's list: `go-clean`
(buying a part is not a skill), `reach-cairo` (the crossing is the new-part-of-the-world mission), `turbulence` (not area-specific; becomes a Firsts card
later), `world` (the whole globe is the end of the story, not a mission), `kinds-3` (replaced by A3).

## 4. What the builder (M4) needs

- **Data:** `save.missionsDone` stays a list of ids; ids become `lesson:<id>` and `area:<areaKey>:<A1..A8>`. Migration: a season 2 save has none. The
  classic 13 stay for classic saves (tests still run classic). `MISSIONS` in `src/missions.js` keeps the lessons; a new `AREA_MISSIONS(areaKey)` builds
  the eight from the template table. The Pilot stat "Missions done n / N" counts the lessons plus all areas' missions.
- **New result fields** (`src/sim/rules.js`, the sim chat approves rules.js changes): `r.area` (area of `r.from`, via `areaOf`) and `r.landKinds`
  (distinct tree ids planted this flight, grouped by land, from `speciesTags`). Everything else A1-A8 need is already in the result (`nightOwl`,
  `sunBlocked`, `airportsSkipped`, `crystals`, `projects`, `distance`, `landed`); `save.visited` gives A4.
- **The gate's missing condition:** `offerCtx` passes `missionsDone = A1 && A2 && A3 of the crossing's from-area`. The hook is already in place
  (`offerCheck` skips the condition while `ctx.missionsDone` is undefined: src/crossings.js).
- **Land trees:** `src/landtrees.js` OPENS[4] becomes "A3 done in this land" (replaces the biodiversity-40 placeholder), as PROPOSAL-TREE-MISSIONS.md.
- **Mission screen:** the NATURE/FLY mission card becomes the area list (starred rows); CLAIM works as today (`src/rewards.js`; `missionReward(i)` becomes
  a lookup of the table above instead of `15 + 20i`).
- **Tests with planted defects** (each plant must fail): a gate mission done in ANOTHER area does not offer the crossing; a crashed flight completes
  nothing (drop the landed check -> fails); A3 counts only this land's trees (a mixed two-land flight must not complete it); the crossing is not offered
  with two of the three done; OPENS[4] follows A3, not biodiversity; prizes are seeds-only for A1-A8 (a planted crystal prize fails); the smoke suite
  (`tests/season2-smoke.cjs`) shows the list, the stars and the offer.

## 5. Prize sizing against BALANCE-EARLY-SHOP.md, and what the sim must confirm

Facts from the sim (0.12.1, 4 seeds x 100 flights): beginners (s 0.75) have 72-78 empty flights of 100 and a longest empty run of 22-42, SEED-starved
(20-70 seeds banked, crystals 50-90 because night dodging pays them regardless); experts (s 0.9-1.0) have runs of 4-8 and are CRYSTAL-limited (~7,500
seeds banked, 0-22 crystals). Doubling mission seeds cut the beginners' longest run to 7-15 and did nothing for experts.

The design does the same job without a bigger multiplier: 330 (lessons) + ~700 (one area's list) = ~1,030 seeds, mostly inside the first 25 flights,
against +1,755 seeds if all 13 of today's missions were doubled (less the ones a beginner has not reached yet). Crystals: lessons give 1 each, area missions 0, so an expert's crystal pace does not
move; the shop's crystal gate keeps rewarding night skill. Rough check for the beginner: flying earns 9-19 seeds a flight; the missions add ~40 a flight
over the first 25; the cheapest levels are ~25 seeds, so a beginner can buy something every 1-2 flights while the starter list lasts.

**Acceptance gates for the sim chat (progression sim with the lesson/area schedule instead of `15 + 20i`):**
1. s = 0.75: longest empty run <= 10 flights (now 22-42) over 4 seeds x 100 flights, maxSkip 4.
2. s = 0.9 / 1.0: empty share and crystal bank within 3 points / a few crystals of the 0.12.1 numbers (they must not speed up).
3. Crossing 1 is not offered earlier than biodiversity 30 allows (the missions must not delay it either: flight of the gate trio <= flight of bio 30 at s 0.8).
4. A seed-prize-only change moves nothing else: the first-crossing flight number is unchanged for s >= 0.9.
If gate 1 fails, raise the lesson prizes first (cheapest to change), then A1-A3; do not touch crystal prices (BALANCE-EARLY-SHOP.md option A did not help).

## 6. Risks

- **Mission fatigue:** 6 + 8 per area is a lot to read; the list shows only the next 3 undone plus the starred ones (a builder choice, not a rule).
- **Too many night/shade checks** depend on the sky giving a night or icy air; the lessons already do and children manage them. A1 is the hardest (a whole
  clean night), which is why it is a gate and not the first lesson.
- **Area attribution:** a flight counts for the area it STARTED in (`r.from`); a crossing flight starts in the old area and counts there.
- **Numbers are a first draft**; the sim sets them. The shape (seeds front-loaded, crystals untouched, gate trio starred) is what the user decides.
- Nothing was run or built for this rewrite; sources: the repo at `d1ca9d1`, `research/BALANCE-EARLY-SHOP.md`, `research/MASTER-PLAN.md`, `research/PLANE-ONBOARDING-PLAN.md`.
