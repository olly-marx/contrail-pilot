# Proposal 12: tiered missions and re-pricing

Written 2026-10-24 by the bug-fix chat. Research and proposal only: nothing built, nothing run (the CPU-heavy measurements are listed at the end and
need a test turn). Numbers come from the code and from `research/PLANE-DESIGN.md` section 9; where I estimate, I say so.
The first-flights table is **for the plane build to adjust**: it has no draft yet (it is measuring today's new-player timeline first) and told me its
decided rules, which I used. It will not touch `missions.js`, `rewards.js` or `fleet.js` prices; any price change goes past it first.

## Decisions for you (the user)

1. **Three kinds of goals, one screen?** I recommend: **Lessons** (the first flights: one new thing per flight, in order, as today), **Challenges** (from
   then on, three offered per stage, pick one: replaces the planned "flight jobs"), and **Firsts** (a funny card the first time something happens, a small
   prize). Badges stay as they are (long-term achievements). Or keep one chain of missions?
2. **What is a "stage"?** I recommend: the first ~6 flights are the lessons; after that the stage is the **era** (1950s, 1970s, 1990s, future): it
   already exists, shows on every screen and unlocks the new gadgets, so each stage's challenges can use the toys the player just got.
3. **Funny crash "firsts": yes?** About 8 in 10 flights end in a crash today, so crashing is normal; a card with a joke the first time you hit a bird
   would make it a good memory. Risk: children may crash on purpose. I suggest they pay only **1 ice crystal** (never seeds), once each, and never
   count as a mission goal. Your call, and your taste on the jokes (drafts below).
4. **How much should prizes pay?** Today the 13 missions pay **1,755 seeds and 169 crystals** in total, and badges about **7,700** once, against a
   1950s price list of about **920** seeds and flying itself earning only about **9 to 19 seeds a flight**. So prizes, not flying, pay for the early
   upgrades. I propose each stage's missions pay about **half** of that stage's price list, so they matter but flying still matters. Agree?
5. **Price bands ("flights of saving"):** I propose every upgrade level costs between **1 and 12** flights of income at the typical income of the stage
   it unlocks in (cheap 1 to 2, middle 3 to 6, big 8 to 12), and no level is worth more than twice, or less than half, the value per seed of its stage's
   median. These are targets to measure against; you may want different ones.
6. **What is "value" for a gadget or a system?** Distance before overheating is easy to measure for planes; for a magnet radius or a forecast it is not.
   I suggest value = **extra seeds per flight** and **extra landings in ten flights**, measured with a bot. Needs the plane build's agreement.
7. **Research from other Imperial groups** (your 2026-10-21 note: super-tiered upgrades that present other groups' research): still needs YOU to name
   groups or projects; nothing here depends on it.
8. **Measuring needs a test turn** (CPU-heavy, about an hour of machine time): see "What to measure".

## What exists today

- **13 sequential missions** (`src/missions.js`): land; land with 5 seeds; 10 shade; a night with no contrail; fly past an airport then land; plant a tree;
  5 ice crystals; make your plane cleaner; reach a new part of the world; bump through turbulence; 3 kinds of tree in one flight; bring wildlife back;
  the world tour. One at a time, in order (`save.mission`); a finished one waits in "claim" (`src/rewards.js`) and pays only when the child taps CLAIM.
- **Prize rule today:** mission `i` pays `15 + 20i` seeds and `1 + 2i` crystals (the 13th: 255 seeds, 25 crystals). Nothing is tied to the era or the price list.
- **Eras economy** (`src/fleet.js`): three planes (Comet, Jumbo, Twin), six levels of each system and gadget (for example the magnet: 25, 55, 65, 120, 165,
  245 seeds), engines/body/cabin lines; `ERA_BUDGET` 600/1,500/3,500 seeds scaled so an era totals about 1.5 times its budget (the 1950s: about 920);
  `START_BONUS` 300 seeds for returning players, 0 for new ones; eras open at 20 x n^1.5 minutes of flying (the plane build's number).
- **Measured play** (525 flights, 9 players, mostly you, Lola and testers, so NOT how a festival child plays): 20% of flights land; sky seeds per flight
  8.7 (flights 1 to 20), 10.2 (21 to 50), 19.0 (51+); per landed flight 20, 25, 81 (median).
- **What the flight result already records** (so most missions need no new code): landed, landed-at, distance, cargo, crystals, sun shade, night
  with no contrail, airports skipped, trees planted, bumped (turbulence), new region, and the crash reason (storm, bird, no-fly, ground, overheat).
- **A stale tool, now fixed (2026-10-24, uncommitted in my worktree):** `tools/income.cjs` (plays a campaign and prices upgrades in "flights of saving") imported
  `src/upgrades.js`, the RETIRED plane lines, and also several functions that no longer exist (`legKm`, `cityAt`), so it could not run at all. It is rewritten for
  `src/fleet.js` (see "Re-pricing: the method"); a 2-flight sanity run works. `tools/balance.cjs` (how far a
  plane flies before overheating) was updated for the eras planes and still measures km, not money.

## The income picture (my estimate from the numbers above, to be measured)

A player flies about 20 minutes before the 1970s open. Legs are now 2.6 to 3.4 km (20 to 30 s), so that is roughly 17 to 40 flights: about
**150 to 350 seeds from flying**, against a 1950s price list of about **920**. The gap is filled by prizes: missions (1,755 in all), badges, the
planned crystal exchange, fares and first-landing prizes. So **the order and size of the prizes decide when the next plane is affordable**: they are
the main pricing lever, which is why missions and re-pricing are one proposal.

## Proposal: stages and missions (draft, to tune)

### Stage 0: the first flights (lessons) **for the plane build to adjust**

Its rules (decided so far): one new thing per flight; after flight 1 the HANGAR opens, after 2 NATURE, after 3 the pilot name, after 4 the leaderboards;
route choosing on the globe somewhere in between; hidden parts truly hidden; a new player starts in one biome with one goal, "Land at the next airport";
early on, flying past the target gives a gentle "restricted airspace, try again" that keeps the seeds.

| flight | new thing | lesson mission (reuses today's) | prize | opens after |
|---|---|---|---|---|
| 1 | landing | Land at the next airport (`land`) | 15 seeds, 1 crystal | the HANGAR (first part free) |
| 2 | seeds | Land with 5 seeds (`seeds-5`) | 35 seeds, 3 crystals | NATURE |
| 3 | trees | Plant a tree (`plant-tree`) | 55 seeds, 5 crystals | the pilot name |
| 4 | day contrails | Make 10 shade in one flight (`shade-10`) | 75 seeds, 7 crystals | the leaderboards |
| 5 | night | A night with no contrail (`clean-night`) | 95 seeds, 9 crystals | choosing your way on the globe |
| 6 | the bonus | Fly past an airport, then land (`pass-1`) | 115 seeds, 11 crystals | stage 1 |

The prize numbers are today's formula for a chain of six (seeds 15 + 20i); they sum to 390 seeds, so a child can buy a few 1950s parts by flight 6.
**Open question for the plane build:** the order above moves `plant-tree` earlier (today it is 6th) so it matches "NATURE after flight 2".

### Stages 1 to 4: challenges (three offered, pick one per flight) and firsts

A challenge needs only fields the result already has unless marked **(new)**.

| stage | era | example challenges (about 8 per stage; the player sees 3) | uses |
|---|---|---|---|
| 1 "Learning the sky" | 1950s | Land with 8 seeds; Earn 5 ice crystals in one flight; Fly past 2 airports, then land; Plant 3 kinds of tree in one flight; Reach a new part of the world; Bump through turbulence; Make your plane cleaner (buy any part) | cargo, crystals, trees, region, bumped |
| 2 "The jet age" | 1970s | Make 25 shade; Land at a city you have not visited; Two nights with no contrail in one flight; Fly 3 airports without a contrail at night; **(new)** Watch a fake forecast patch puff away; Land with a full cabin | forecast, ATC, fares |
| 3 "Modern times" | 1990s | Dodge 5 icy patches at night (**new** counter); Land in 3 different lands in one flight; Bring a new animal to NATURE; Make 50 shade in a landed flight | sensors, forecast, nature |
| 4 "The future" | future planes | Fly a whole lap (the world tour); Land with the Earth cooler than at take-off; fly with a fuel of the future | SAF, hydrogen, fiction planes |

**Firsts** (a funny card plus 1 crystal, once each; none gives seeds; none is a mission goal). Draft jokes, kid-safe, for your taste:

| first time you... | trigger | draft card |
|---|---|---|
| hit a bird | crash reason bird | "Tweet! Birds 1, plane 0. They had the right of way." |
| fly into a storm | crash reason storm | "You made friends with a storm. It was not friendly." |
| enter reserved sky | crash reason no-fly | "Oops! That sky was reserved. Even planes need a ticket." |
| land away from a runway | crash reason ground | "Great landing! Wrong place, though." |
| overheat the Earth | crash reason overheat | "The Earth got a fever. Trees and shady contrails cool it down." |
| bump through turbulence | `bumped` | "Wheee! That was the bumpy air." |
| fly through the night | night began | "Stars out! Contrails keep the heat in at night: fly above or below." |
| plant all 5 kinds in one flight | planted kinds | "A whole forest in one flight!" |

### Prizes by stage (to decide, decision 4)

Each stage's missions together pay about **half of that stage's price list**: roughly 450 seeds in the 1950s (list about 920), 1,100 in the 1970s (about
2,250), 2,600 in the 1990s (about 5,250), and crystals at the present 1 crystal per 8 seeds, so a mission is "worth a flight or two of saving", not a
whole plane. Today's formula (a single rising line up to 255 seeds) would pay the late missions far more than a whole 1950s part: it must change.

## Re-pricing: the method (what to measure, in order)

1. **DONE: `tools/income.cjs` now prices the eras economy.** A new player (0 seeds, or `START=300` for a returning one) flies a campaign with the smart
   pilot, taps CLAIM ALL after every flight, buys the cheapest open level through `buyFleet`, and prints per flight: seeds from flying, seeds from prizes,
   minutes flown, era, what it bought; then per-era income and an `INCOME {...}` line. A 2-flight sanity run: flights earned 18 and 38 seeds from flying and
   155 and 95 from prizes (so prizes dominate, as estimated), about a minute of play each, five 25-seed parts bought. Known limits: it does not chase
   mission goals, so mission and badge prizes arrive only as it plays; crashes are off, so it is a little better than a real child.
2. **DONE: the price ladder with its gates, `tools/price-ladder.mjs`** (pure data, a second to run). On today's data the **era-total gate passes**: the 1950s,
   1970s and 1990s price lists total 920, 2,235 and 5,235 seeds = 1.53, 1.49, 1.50 times their budgets (the 1.5 the code comment promises); the
   monotone and crystal gates pass. With the PLACEHOLDER income (flying only: 9, 10, 19 seeds a flight) 14 levels fall outside "1 to 12 flights of saving": the
   top level of every system and gadget (245 seeds, 12.9 flights in the 1990s) and the last level of the Jumbo and Twin lines (13 to 16). Prizes add a lot of
   income, so this is NOT yet a verdict: it needs the real income from step 3. `--selftest` proves the gates can fail: a good fixture passes and five planted
   mispricings (a level 10x too dear, far too cheap, a later level cheaper than an earlier one, an era total too high, crystals out of step) each trip their
   own gate; I also broke each gate in a scratch copy and the self-test failed every time.
3. **Income by stage** from the probe, three bot skills (careless, average, careful) times 5 seeds (the way `balance.cjs` does it), 150 flights each, with and
   without claiming prizes, then `INCOME='...' node tools/price-ladder.mjs`; plus the real data (the flights table) filtered to players with 20+ flights.
4. **Value per level** (decision 6): planes by `balance.cjs` (km before overheating); gadgets and systems by the bot with and without the level
   (extra seeds per flight, extra landings in ten flights). Not built yet: it needs the plane build's agreement on what a gadget's value is.
5. **Add the value gates** (no level worth more than twice or less than half the median value per seed of its stage) to `tools/price-ladder.mjs`, validated the
   same way (a planted level that gives nothing, a planted dominant level).

**Cost:** steps 1 and 2 are done and cost seconds. Steps 3 and 4 are CPU-heavy (the probe runs faster than real time but with a browser per bot): my guess is an hour
of machine time in total, but I have not timed a long run (the 2-flight sanity run took 75 s of wall clock for about 3 s of CPU, mostly start-up waits), so the first
real turn should begin with a 10-flight timing run. It needs a test turn.

## Risks and what I did not do

- **The sample is not children.** The measured income comes mostly from you and testers; a festival child lands far less often. Prizes must not assume skill.
- **Funny crash cards** may encourage crashing (decision 3); the 1-crystal, once-each rule limits it.
- **Missions and onboarding must be built together** with the plane build (the first-flights table is theirs to change) and the hidden-parts rule.
- **Nothing was run.** Every number above is from the code, from `PLANE-DESIGN.md` section 9, or my arithmetic (shown).
