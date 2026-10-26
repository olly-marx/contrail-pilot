# Design: starter areas, free flight, and earned crossings (DRAFT, 2026-10-25)

Status: design agreed in conversation with the user (coordinator chat). Nothing built. Numbers marked MEASURED come from
the routing code on origin/main (network.js LINKS, onward(), cities.js) rebuilt offline in node; nothing else is measured yet.
Inputs: research/REDESIGN-FACTS.md, research/REDESIGN-STORY.md (game chat), ~/cp-fixes/research/PROPOSAL-12-MISSIONS.md.

## The principle (the user's words, condensed)
Contrail Pilot descends from Flappy Bird: people want to GO FAR. Distance stays the score. But the planet overheating is
how the game steers behaviour: you cannot fly far without understanding contrails, optimising your plane and growing a
balanced nature. Without those you stay stuck, overheating, and you never leave your starting area.

## The loop
1. **Pick a starter area** (max two biomes). Everyone restarts from scratch at rollout.
2. **Free flight inside it**: endless, as today (take-off choice, then onward past airports), but the route network only
   contains your unlocked area(s). Back and forth between its cities; distance is the score.
3. **Missions** are generic templates filled in with your area (its cities, its projects, its species, its biomes):
   "land at every city in <area>", "fund <project> and see <animal> return", "a clean night over <biome>", and so on.
   They teach the levers that make you go further, and their prizes pay for upgrades.
4. **A capability estimate** (plane + nature + trees) says how far you can fly. When it reaches the distance to the next
   area's starter city, the game OFFERS the crossing.
5. **The crossing** is one dedicated mission flight: from your current city to the next area's starter city, set right at
   the edge of what your plane and nature can reach for a pilot of skill A. Land it and the new area unlocks; fail and you
   can try again (or improve and come back).
6. Eras unlock separately, by flying time, as today.

## Starter areas (MEASURED: free flight confined to each, 30 legs from every take-off choice)
| Area | Cities | Biomes | Free flight confined there |
|---|---|---|---|
| Western Europe | 16 | woodland + mediterranean | endless, no dead ends, ~12 cities seen per 30 legs |
| Africa south of the Sahara | 13 | savanna | endless, ~12 |
| South Asia | 14 | monsoon (+ Karachi, desert) | endless, ~13 |
| North America | 17 | plains + boreal | endless, ~14 |
| South America | 12 | rainforest + plains (Buenos Aires, Santiago) | endless, ~8 |
| Nordic & Iceland | 5 | boreal + tundra | works but small: a later area, not a start |
| North Africa & Middle East | 10 | desert + mediterranean | NOT connected as I first cut it (Tashkent placed in East Asia). AMENDED: with Tashkent moved to the Middle East it IS connected (research/AREA-BALANCE.md, ~8.6 cities per 30 legs) |
| East Asia | 11 | eastasia | AMENDED: connected once Tashkent moves out (~8.5 cities per 30 legs) |
| Oceania | 6 | - | not usable today (Perth, Darwin, Honolulu dead ends). AMENDED: Australia + NZ with 8 new airports incl. ADELAIDE (which removes Perth's dead end) works (~7.9); Honolulu/Nadi become ocean stepping stones, not an area (research/AREA-BALANCE.md) |

Crossings already in the network (real km): Lisbon-New York 5,405; New York-Reykjavik 4,164; Cape Town-Sao Paulo 6,351;
Belem-Lagos 5,817; Anchorage-Tokyo 5,565; Honolulu-Los Angeles 4,108; Perth-Singapore 3,912. Old-World land borders are
short (Lisbon-Casablanca 616, Athens-Cairo 1,108): those become "frontier crossings" sized by the capability estimate,
not by real km (the crossing length is a game number anyway).

## Open questions
- The capability estimate: build it from tools/balance.cjs (smart/straight pilots, km to overheat per plane + forest);
  "skill A" = which pilot? Needs a measured table per era plane x nature level (machine time).
- Default starter city per area (first two legs stay inside, as Amsterdam does).
- The tree system rework (the user wants one: what is wrong with it today?).
- Ocean biomes on the crossings (fish/whales below, marine projects): art budget (see PIXELLAB-BUDGET-NEW-REGIONS.md).
- Restart: everything resets; do badges/records and the online leaderboards (database) reset too?
- Fixing the two disconnected areas and Oceania's dead ends.

## Amendment (2026-10-25, coordinator)
See research/AREA-BALANCE.md (game chat): 9 areas, max 2 biomes each, all connected, no dead ends, 14 new airports.
The 'NOT connected' verdicts above were artefacts of my own area cut (Tashkent in East Asia), not of the network: do not
cite them as a network problem. Do not assume the AREA-BALANCE cut is final either: it is a proposal.
