# Balance part B: time to earn (Comet, 747, Twin)

Written 2026-10-25 by the bug-fix chat for the Coordinator's balance study (with the plane build's part A: km before overheating).
Tool: `tools/income.cjs` (rewritten for the fleet economy; `NORENDER=1`), 4 full campaigns, seeds 1 to 4, each played from a **new-player save**
until every fleet level is bought (245 to 270 flights, 304 to 334 minutes of flying). Raw logs: `/tmp/chat3-full{1..4}.log` (not kept in the repo).

## What the pilot is (read this before the numbers: it flatters the player)
- The **smart contrail pilot** of `tools/balance.cjs` plus: steers for seeds it can reach, drops tree parcels on soil, **never crashes** (storms and birds are
  switched off), lands at an airport when flying on would get the Earth too hot or after passing 3 airports, and taps **CLAIM ALL** after every flight.
  So it is the best case: a careless beginner (crashes, forgets prizes) is slower. How much slower needs the real players' distance per flight
  (answered later by the Coordinator's live query: see 'Real beginners' at the end).
- It buys the **cheapest open level it can afford**, again and again (fleet only: plane lines, systems, gadgets). It does NOT buy nature (tree lines, species,
  habitat projects), so those are priced below as "flights of saving", not timed.
- A flight lasts **7,300 km = 1.2 minutes** (every flight: it lands after 3 passed airports, never overheats). Flights are Comet-hot only in era 0; later planes could fly further, but the bot lands on the same rule.
- `NORENDER=1` (no drawing). Checked against drawing runs: km medians equal (7,307 to 7,311 over 3 seeds); per-seed income is noisy (prizes are lumpy):
  era-0 income per flight was 137/122/134 drawing vs 137/107/99 with NORENDER (n = 3, not significant). Use the medians below, not one seed. Seeds 5 to 7 not run.

## The era clock (measured, equals `src/eras.js`)
Era n opens after `20 x n^1.5` more minutes of flying: **20, 77 and 181 minutes in total** for the 1970s, 1990s and 2010s (57, 104 more each).
Measured on the four runs: the 1970s opened at flight 17 (20.2 to 20.5 min), the 1990s at flight 63 to 64 (76.7 to 77.2 min), the 2010s at flight 147 to 149 (180.7 to 181.4 min).
The whole ladder was bought at **304 to 334 minutes (245 to 270 flights)**.

## Income (seeds a flight, flying + prizes, median over the four runs)
| era | flights in it (a run) | median seeds a flight | mean | of which prizes (mean) |
|---|---|---|---|---|
| 1950s | 16 | 74 | 88 | 40 |
| 1970s | 46 | 59 | 65 | 7 |
| 1990s | 84 | 62 | 63 | 3 |
| 2010s | 110 | 66 | 72 | 8 |

The first era's income is **inflated by one-off prizes** (the missions and badges paid early: about 40 seeds a flight of 88). A beginner who
does not claim them, or reaches them slowly, earns about half that at first.

## The main finding: CRYSTALS set the pace, not seeds (MEASURED on seed 1, 261 flights, `JSON=1`, run on 0.11.7)
The seed bank sits far above the prices all game while the crystal bank is 0 to 11:

| when | seeds in the bank (4 runs, before the era opens) | crystals in the bank (seed 1) |
|---|---|---|
| 1970s open (min 20, flight 17) | 635 to 759 | 2 |
| 1990s open (min 77, flight 63) | 2,193 to 2,438 | 0 |
| 2010s open (min 181, flight 148) | 5,172 to 5,660 | 1 |
| end (flight 261, min 324) | 9,239 left unspent | 4 |

Over the whole run the bot **spent 8,365 seeds and 1,058 crystals** (the price ratio is crystals about seeds / 8: 8,365 / 8 = 1,046), but **earned about 17,600 seeds**.
So crystals are spent almost exactly as fast as they are earned (every purchase waits for the next few crystals), and seeds are about **2 times more than the ladder needs**.
Crystals a flight: 1950s 2.25 from flying + 2.94 from prizes; 1970s 3.2 + 0.4; 1990s 3.2 + 0.0; 2010s 4.4 + 0.4 (flying = night dodging, about 3 to 4 a flight; prizes only early).
That is why each level is bought 20 to 100 minutes after its era opened (table below): the pace is about **4 crystals a flight, 1.2 minutes a flight**, and a level costs 3 to 39 crystals (price / 8).

Consequences: (1) the seed prices are not the hurdle for this pilot; seeds pile up, so the nature projects (20 to 1,800 seeds) are affordable early and cost the fleet nothing,
because the fleet is held back by crystals; (2) if the intent is for prices to be the hurdle, the crystal income (night dodges: `dodgeCrystals`, `dodgesPerNight`, mission prizes) or the crystal prices
need to change, not the seed prices; (3) `tools/price-ladder.mjs` checks the crystal PRICE ratio but not the crystal INCOME, which is the binding side; its band gate should be rerun per currency;
(4) a real child dodges less at night, crashes early and earns far fewer crystals (see 'Real beginners'), so for them the fleet is slower still.

## When each level is bought (median over 4 runs; minutes of flying from a new save)
Columns: price in seeds, flight number, minutes, range over the four runs.

| level | price | flight | minute | range (min) |
|---|---|---|---|---|
| atc L1 | 25 | 1 | 1 | 1-1 |
| forecast L1 | 0 | 1 | 1 | 1-1 |
| magnet L1 | 25 | 1 | 1 | 1-1 |
| ops L1 | 25 | 1 | 1 | 1-1 |
| hold L1 | 25 | 2 | 2 | 1-2 |
| gear L1 | 25 | 2 | 2 | 2-2 |
| sensors L1 | 25 | 2 | 2 | 2-4 |
| autopilot L1 | 25 | 2 | 3 | 2-4 |
| comet.cabin L1 | 25 | 3 | 4 | 3-4 |
| comet.engines L1 | 30 | 4 | 5 | 4-5 |
| comet.body L1 | 30 | 5 | 6 | 5-7 |
| forecast L2 | 55 | 6 | 7 | 6-8 |
| atc L2 | 55 | 8 | 10 | 8-12 |
| ops L2 | 55 | 10 | 13 | 11-14 |
| magnet L2 | 55 | 11 | 13 | 11-14 |
| hold L2 | 55 | 12 | 14 | 12-16 |
| gear L2 | 55 | 12 | 15 | 12-18 |
| sensors L2 | 55 | 15 | 18 | 12-29 |
| jumbo.body L1 | 35 | 17 | 20 | 20-24 |
| jumbo.cabin L1 | 30 | 17 | 20 | 20-22 |
| autopilot L2 | 55 | 18 | 22 | 13-31 |
| jumbo.engines L1 | 40 | 20 | 23 | 23-25 |
| comet.cabin L2 | 55 | 22 | 27 | 17-35 |
| forecast L3 | 65 | 24 | 29 | 27-37 |
| atc L3 | 65 | 26 | 31 | 29-40 |
| ops L3 | 65 | 28 | 34 | 29-42 |
| magnet L3 | 65 | 30 | 37 | 33-43 |
| hold L3 | 65 | 31 | 38 | 34-45 |
| gear L3 | 65 | 33 | 40 | 35-48 |
| sensors L3 | 65 | 36 | 43 | 36-50 |
| autopilot L3 | 65 | 39 | 47 | 37-54 |
| comet.engines L2 | 70 | 40 | 49 | 18-59 |
| comet.body L2 | 70 | 42 | 52 | 19-60 |
| jumbo.cabin L2 | 70 | 46 | 56 | 45-64 |
| jumbo.body L2 | 75 | 48 | 57 | 47-66 |
| jumbo.engines L2 | 85 | 50 | 60 | 51-69 |
| forecast L4 | 120 | 54 | 66 | 60-72 |
| atc L4 | 120 | 62 | 76 | 62-92 |
| twin.cabin L1 | 50 | 64 | 77 | 77-78 |
| twin.engines L1 | 60 | 66 | 79 | 77-82 |
| twin.body L1 | 60 | 67 | 81 | 78-84 |
| ops L4 | 120 | 68 | 82 | 65-100 |
| twin.cabin L2 | 105 | 71 | 86 | 82-87 |
| magnet L4 | 120 | 71 | 87 | 70-105 |
| hold L4 | 120 | 78 | 95 | 74-108 |
| gear L4 | 120 | 82 | 100 | 91-112 |
| sensors L4 | 120 | 86 | 105 | 100-118 |
| autopilot L4 | 120 | 94 | 114 | 106-124 |
| twin.engines L2 | 125 | 100 | 121 | 110-131 |
| twin.body L2 | 125 | 103 | 127 | 114-137 |
| jumbo.cabin L3 | 130 | 108 | 132 | 116-144 |
| jumbo.body L3 | 140 | 115 | 141 | 127-151 |
| jumbo.engines L3 | 150 | 122 | 149 | 133-160 |
| forecast L5 | 165 | 128 | 157 | 141-166 |
| atc L5 | 165 | 134 | 164 | 153-172 |
| ops L5 | 165 | 141 | 173 | 161-187 |
| magnet L5 | 165 | 147 | 180 | 165-187 |
| hold L5 | 165 | 156 | 190 | 172-194 |
| gear L5 | 165 | 161 | 198 | 178-202 |
| sensors L5 | 165 | 168 | 206 | 184-211 |
| autopilot L5 | 165 | 174 | 214 | 194-216 |
| twin.cabin L3 | 170 | 180 | 219 | 197-223 |
| twin.body L3 | 195 | 183 | 223 | 201-228 |
| twin.engines L3 | 205 | 188 | 231 | 206-234 |
| forecast L6 | 245 | 194 | 239 | 216-240 |
| atc L6 | 245 | 198 | 242 | 227-251 |
| ops L6 | 245 | 202 | 248 | 236-256 |
| magnet L6 | 245 | 211 | 258 | 246-264 |
| hold L6 | 245 | 214 | 265 | 254-270 |
| gear L6 | 245 | 219 | 272 | 262-279 |
| sensors L6 | 245 | 227 | 282 | 269-291 |
| autopilot L6 | 245 | 234 | 290 | 280-297 |
| twin.cabin L4 | 265 | 244 | 299 | 288-309 |
| twin.body L4 | 285 | 250 | 309 | 295-321 |
| twin.engines L4 | 310 | 256 | 316 | 304-334 |

Reading it: every line's level 1 is bought by flight 5 (minute 6), level 2 of the eight systems and gadgets by flight 6 to 18 (minute 7 to 22), then level 3 at flights 24 to 39
(minute 29 to 47), level 4 at 54 to 94 (minute 66 to 114), level 5 at 128 to 174 (minute 157 to 214) and level 6 at 194 to 234 (minute 239 to 290). Each level is therefore
bought 20 to 100 minutes AFTER its era opened (levels 3 and 4: era 1970s, open from minute 20; levels 5 and 6: 1990s, open from minute 77), which is the evidence for the paragraph above.
The Comet's own level 2 (engines, body, cabin) is bought only at flights 22 to 42 because the bot buys cheaper things first: a property of the bot, not of the prices.

## The nature steps (priced, not timed)
Fleet-first buying leaves them untouched, so here is the price in flights of saving at that era's median income (seeds a flight 74, 59, 62, 66):
- Tree lines: Tree parcels L1 25 seeds (0.3 flights in the 1950s), More parcels 40, Big cargo hold 450 (7.6 flights at 59), Tree drop plane 650 (11 flights at 59).
- Soil: 20, 90, 150. Species: Birch 30, Oak 150 (2 flights), Rowan 210 (3.5 at 59), Fruit trees 550 (9 flights at 59). Nursery 140 and 450.
- First UK habitat projects (tier 1): 20, 30, 60, 140 seeds: each under 2 flights; tier 2: 170 to 700 (3 to 12 flights); tier 3: 550 to 1,800 (9 to 30 flights at the 1970s income).
  Other lands' tiers: tier 1 is 20 to 60, tier 2 300 to 450, tier 3 900 to 1,300.
- A "first kind of tree" needs only Tree parcels (25) plus Birch (30): **55 seeds, under one flight of saving in the first era.** Three kinds (Oak) needs 205 seeds in all: 2 to 3 flights.
- With the surplus above (680 idle seeds at minute 20), the bot could buy every tier-1 project in the UK and four of the tier-2 ones before the 1970s open. Whether that is wanted is the design question.

## Caveats and what is not measured
1. **Perfect pilot, no crashes.** Real flights end early by crashing (median 2,000 to 5,000 km for beginners, about 20% land: see 'Real beginners'); the figures here are a lower bound on a real child's time.
2. Only 4 seeds, medians; per-seed prizes noisy. 7 seeds were planned.
3. The bot buys cheapest-first: the order in the table is the bot's, a child buys in another order. Totals do not depend on it.
4. Nature is not in the loop; the study cannot say whether the nature spend delays fleet purchases (it would, but the surplus suggests room).
5. A 2-seed identity check of `NORENDER` against drawing was inconclusive per seed (the scene start waits on real time) but medians agree.
7. Crystal income measured on ONE seed (seed 1) only; seeds 2 to 4 logged seeds only.
6. `PROBE` stubs (skip sky, texts and so on) were not used: the plane build found they change the sky through the shared random numbers.

## Real beginners (answered 2026-10-25; the Coordinator ran the read-only live query, I did not)
Eight real players (the user's own account excluded): flights 1 to 20 end at a median of **2,000 to 5,000 game km** (90th percentile 3.8 to 7.5 thousand), flights 51 and later
at a median of 5.6 thousand (90th percentile 12.6 thousand), and only about **20% of flights land**. This bot flies 7,300 km and lands every time. So real beginners crash long
before heat could end a flight (a Comet overheats near 9,000 km), and a real flight pays well under this bot's (it banks seeds only for a landing, and crashes lose the cargo):
**every 'minutes' and 'flights' figure above is a lower bound; a real child is several times slower** (not quantified: a bot that crashes like a beginner would be needed).
The number of 8 players is small.
