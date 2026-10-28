# Balance: earnings against upgrade prices under season 2 (sim engine, 2026-10-27)

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

**Crossing 3, investigated (2026-10-27): the model cannot reach it, and that is not a game bug.** With a strategy that works
on the frontier area ("pursue": every ordinary flight from that area's start city) and chases the 12,600 km distance gate,
crossings 1-2 come at the same flights as before, but crossing 3 is still not reached in 200 flights. At flight 150 (expert,
s 1.0) North America's biodiversity is met (38), its best landed flight is 11,628 km (short), and its stars are locked: the
save is in the MASTERY stage (3 crossings made), so mission targets are x3, and no tier-2 mission in North America is done,
so tier 3 (the stars) never opens. The model fails tier 2 there because it does not play missions: "Land at <city>, then
<cityB>" and "Plant 6 trees, then land at <cityB>" need landings at NAMED cities (it never steers for them); "Dodge 9 icy
patches at night" is hard in one flight; "Spot a raccoon" cannot happen in Node (animal sightings come from the browser's
drawing). "Buy a helper system (level 3)" is already met, but save missions tick after a purchase made while in that area
(ui.js missionsAfterSave), so it waits for one. So **crossing 3's timing is NOT measured**: it needs a mission-playing
progression player (steer for named cities, a stand-in for animal sightings), about 1-2 hours of model work.

**Design note for a playtest:** a newly opened area at the mastery stage starts with tier-2 targets already tripled (9 night
dodges, 6 trees then a named city), with no nature built there yet, and its crossing gate counts only that area. Crossing 3
may play much harder than its 18,000 km flight suggests.

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
| **Exchange desk, reserve 4,000, 20 : 1** (+ pursue) | identical to none (never banks 4,000): crossing 2 in 3 of 4 kept | **items 190-202**, bank steady ~4,000, empty 71-82 | **items 195-206**, bank ~4,000, empty 73-77 |

Reading: an exchange fixes the experts' flood (twice the items, a third fewer empty flights) but with a 1,500 reserve it
hurts the typical player's crossing 2. Typical players bank 800-1,900, so a reserve above that (~4,000) should leave them
untouched: **measured, it does** (the 4,000 row). **Recommendation: an exchange desk with a 4,000-seed reserve at 20 seeds per
crystal** turns the experts' flood into progress and leaves typical and beginner players exactly as they are. Also seen: a
typical (s 0.8) player can starve after crossing 1 (one run: 92 flights with nothing bought, bank down to 131 seeds); the
exchange does not help there (seeds, not crystals, are short). That is a seed-income question for the 2nd area (open).

## 3. Recommendation and still to do

**Recommended: add an exchange desk (seeds -> crystals, 20:1, keeping a 4,000-seed reserve).** Experts buy about twice as many
items and their bank stops flooding; typical and beginner players are untouched. **No other price change**: the early game is
fine with S4's missions, and the experts' late game is paced by crystals, which the desk addresses.

Still to do: (1) a mission-playing progression player, then crossing 3 timing per skill; (2) the typical player's seed
starvation after crossing 1 (one run of 4 went 92 flights without a purchase): a seed-income question for a 2nd area; (3) the
user's answer to the design question above.

Caveats: one start area (Western Europe); 4 seeds per cell; the shop buys the cheapest first; area borders now real.
