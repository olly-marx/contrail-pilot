# Balance: earnings against upgrade prices under season 2 (sim engine, 2026-10-27). INTERIM

Task A from the user: per skill, do seeds and crystals per flight match upgrade prices, does each upgrade arrive at a
sensible point, do experts reach crossing 3 at a fair time, is any level starved or flooded? Measured on 0.15.0
(714542e) + feat/progression-s2: the progression simulator with season 2 on in Node and the GAME's own crossing offer
(crossings.available + offerCheck(offerCtx)), Western Europe start, careful, constant skill, 4 seeds x 200 flights.
Landing: s 0.75 / 0.8 land after passing 2 airports, s 0.9 / 1.0 after 4, and all "chase the gate" (when only a
crossing's distance blocks it, fly on to 70% of its km before landing).

## 1. Today's pacing (no change)

| s | Crossing 1 (flight) | Crossing 2 | Crossing 3 | Seeds banked @50 / @100 / @200 | Crystals @200 | Items in 200 | Flights with nothing bought | Longest empty run |
|---|---|---|---|---|---|---|---|---|
| 0.75 | 68-109 | none | none | 700 / 1,800 / 750 | 14 | 66-71 | 149-153 | 12-25 |
| 0.80 | 38-66 | 103-164 (3 of 4) | none | 1,900 / 1,400 / 800 | 91 | 74-80 | 138-147 | 10-34 |
| 0.90 | 18-25 | 20-30 | none | 5,800 / 9,400 / 17,200 | 25 | 98-101 | 123-127 | 6-10 |
| 1.0 | 19-24 | 20-26 | none | 5,800 / 9,400 / 17,300 | 33 | 99-103 | 124-127 | 6-9 |

When upgrades arrive (median flight bought): experts get every era-1 level 1 by flight ~5, the jumbo lines at ~15, the
twin at ~51 (era 2 opens), levels 4 at ~40-65, levels 5 at ~95-125, level 6 from ~140. Typical (0.8): the jumbo at ~25,
the twin at ~86, levels 4 at ~100-135. Beginners (0.75): the twin at ~113, levels 4 from ~155.

- **Experts are FLOODED with seeds and paced by CRYSTALS.** The bank grows ~60 seeds a flight unspent (17,000 by flight 200)
  while crystals sit near 0-30: each top-level item waits for crystals.
- **Typical and beginners are SEED-limited** (banks 800-1,900, crystals piling up for 0.8). Beginners' empty runs reach
  12-25 flights; with S4's missions the early hour is fine (section 2 of BALANCE-EARLY-SHOP.md), the gap is later.
- **Crossing 3 is never reached by anyone in 200 flights, and that is the MODEL, not the prices.** In season 2 each
  crossing has its own departure area and its gate counts that area alone. The 18,000 km crossing (north-pacific) leaves
  from Anchorage (North America): at flight 150 the expert had North America's best landed flight 0 and biodiversity 20.
  The model flies on from wherever it last landed and never chooses to build up a new area. A real player aiming for
  crossing 3 would. So "when do experts reach crossing 3" is NOT measured yet: it needs an area-choosing strategy in the
  progression sim.

**Design question for the user (from the Coordinator):** crossing 3's gate counts ONLY its departure area (North America for
north-pacific): its best landed flight, its biodiversity (the meter of its start city's land) and its own starred missions.
So a player who has built up Western Europe starts again from zero there (how many flights that takes is measured by the pursue runs, section 3): projects, missions and a long
landed flight in the new area. Is rebuilding nature in each new area intended (it is the "new land, new nature" story), or
should part of it carry over (e.g. the biodiversity condition counts your best area, or the missions only)?

## 2. Re-pricing options measured so far

| Option | s 0.80 | s 0.90 | s 1.0 |
|---|---|---|---|
| none | items 74-80, crossing 2 in 3 of 4 | items 98-101, bank 17,200, empty 123-127 | items 99-103, bank 17,300, empty 124-127 |
| Exchange desk, reserve 1,500, 20 seeds : 1 crystal | items 75-78, **crossing 2 in 0 of 4** (its seeds went to crystals, not projects: bio and missions lag) | **items 210-219**, bank ~1,500, empty 71-78 | **items 209-214**, bank ~1,500, empty 73-78 |

Reading: an exchange fixes the experts' flood (twice the items, a third fewer empty flights) but with a 1,500 reserve it
hurts the typical player's crossing 2. Typical players bank 800-1,900, so a reserve above that (~4,000) should leave them
untouched. **Next run: reserve 4,000.**

## 3. Still to do (needs machine time)

1. Exchange reserve 4,000 (s 0.8 / 0.9 / 1.0): confirm typical players keep crossing 2 and experts keep the gain.
2. An area-choosing strategy in the progression sim (go for the crossing whose gate is nearest, fly from its area), then
   the crossing-3 timing per skill.
3. A re-pricing table for the late seed sink, if the exchange is not wanted (e.g. raise the SEED price of levels 5-6
   and lower their crystal price).

Caveats: one start area (Western Europe); 4 seeds per cell; the shop buys the cheapest first; area borders now real.
