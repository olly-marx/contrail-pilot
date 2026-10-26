# Proposal: trees belong to their land

Status: DIRECTION APPROVED by the user (2026-10-25, via the coordinator); rules below marked DECIDED. Still nothing built.
Originally a proposal (2026-10-25, PixelLab session). Nothing built, no browser. Measured from the code on main.
Fits `research/DESIGN-STARTER-AREAS.md` (starter areas of up to 2 biomes, distance is the score, nature is how you fly
further). The planting itself (parcels, soil patches, DROP, trees growing in flight) does not change.

## Decisions for you (short)

1. **Who unlocks a land's trees?** Suggest: that land's own nature progress. Its plantation tree (slot 0) is free from
   the start; each of its 4 native trees opens with one nature step there (a project, a mission, finding animals,
   biodiversity). The hangar no longer sells tree kinds.
2. **What stays in the hangar?** Suggest: the **planting tools**, same for every land: how many parcels you carry,
   how big the soil patches are, how fast the nursery grows trees. Bought once, they work everywhere.
3. **The forest boost ("5 kinds for the longest flights"):** count **different trees planted in one flight**, of
   whatever lands you fly over. A two-biome starter area offers up to 10 kinds, so a child can reach 5 in many ways.
4. **Restart:** nothing to migrate, since everyone restarts (the old `levels.species` simply goes).

## DECIDED rules (the user, 2026-10-25)

**(a) One visibility rule everywhere: you see the trees YOU planted in that land.**
- In flight, a land starts with a few of its plantation tree; each native kind appears below once you have planted it
  there. The biodiversity meter still sets HOW MANY trees show (`treesPerScreen`, 2 lonely trees up to ~30).
- Today this is true only for the UK. Other lands show all 5 of their trees whatever you planted (`src/nature.js`
  `wildlifeScene`: `const local = WILDLIFE.filter(... w.region === region ...)` is used as `treeKinds` for every land
  except the UK). The change: `treeKinds` for any land = its plantation tree + the kinds in `save.plantedIn[land]`
  (the UK: `save.planted`, as now).
- The wild area (NATURE field) stays as it is: it already shows only what you planted there (0.11.2, 0.11.4).

**(b) Make the two jobs a tree does VISIBLE.**
- **Biodiversity (NATURE):** each kind shows its count toward the cap, e.g. **"Oak 4/9"**, **"Spruce 9/9 full"**. Points
  level off at 9 of a kind (measured: `6 x sqrt(n)` caps at 18 for natives at n = 9, `2 x sqrt(n)` caps at 6 for the
  plantation tree at n = 9), so the 9 tells a child when planting more of that kind stops helping and a new kind is
  better.
- **Cooling (in flight):** a small **"kinds this flight 3/5"** next to the forest meter, because cooling, the old-wood
  boost and the forest store all depend on the different kinds planted THIS flight (`FOREST.kinds = 5`).

## How it works today (measured, plain words)

- **Five shop lines** (`src/upgrades.js`): *Tree Planting* (2, 3, 4, then 6 parcels a flight), *Soil Patches* (wider
  patches, easier to hit), *Tree Species* (birch 30, oak 150, rowan 210, fruit trees 550 seeds, plus crystals), and
  *Tree Nursery* (trees grow faster). You always have **spruce**.
- **Slots:** what you own is a list of **UK kinds** (`speciesOwned()`: spruce + the species bought). Each is a slot
  (`nature.js UK_SLOTS`: spruce 0, birch 1, oak 2, rowan 3, orchard 4).
- **Over another land**, a parcel plants **that land's tree for the same slot** (`localTree()`, `src/habitat/trees.js`
  `REGION_TREES`: 5 per land, slot 0 the plantation tree, e.g. Aleppo pine, Chinese fir, loblolly pine). So buying
  "oak" in the hangar means planting baobabs over Africa and kapok over the Amazon. **That's the jump the user feels:**
  the trees change under you, unlocked by a shop line that names UK trees.
- **Where trees count:** UK plantings go to `save.planted`, other lands' to `save.plantedIn[land]`; they feed each
  land's biodiversity meter, and since 0.11.2 the wild area shows them.
- **The forest boost** (`config.js FOREST`): from 10,000 km into a flight, grown trees cool more, scaled by
  (different kinds planted THIS flight / 5)^2. Kinds are counted by **slot** (`speciesPlanted.add(kind)`, the UK
  kind), so 5 slots = 5 kinds wherever they grew. Measured (tools/balance.cjs PLANT=1): all 5 kinds ~33,000 km,
  4 kinds ~26,000, no trees ~25,000. A forest also fills up (`store`), so it can't cool for ever.

## The proposal

### 1. Each land's trees, unlocked by that land

Every land keeps its 5 trees (`REGION_TREES`; the UK keeps spruce, birch, oak, rowan, apple). In each land:

| Tree | Opens when | Example (Africa, savanna) |
|---|---|---|
| Slot 0, the plantation tree | from the start, as soon as the land is yours | eucalyptus |
| Native 1 | your **first habitat project** there | umbrella thorn acacia |
| Native 2 | the land's **biodiversity reaches 20** | baobab |
| Native 3 | you have **found 5 of its animals** | sycamore fig |
| Native 4 | a **mission** of that land ("plant 3 kinds here in one flight") | marula |

Each opening is a small moment: a card with the tree's PixelLab picture and its fact ("Baobabs can store water in
their trunks"), and it appears in that land's NATURE page. The same 4 rules everywhere, so it's easy to learn, but each
land's trees and order are its own.

### 2. What a parcel plants

Over a land, a parcel plants one of **that land's unlocked trees**, cycling through them so a flight mixes kinds
(as the parcels cycle through owned kinds today). Over a land you haven't unlocked any trees in, it plants nothing
special: the land's plantation tree, like spruce today. Over sea and ice: no planting, as now.

### 3. What stays bought (the hangar's "Nature" side)

- **Parcels** (2 / 3 / 4 / 6 per flight), **Soil patches** (64 / 80 / 96 px), **Nursery** (faster growth). They're about
  planting, not about which tree, so they stay as they are, prices to be re-read by the pricing work.
- **Tree Species** goes. Its prices (30-550 seeds) disappear from the shop, which frees early seeds for the plane.

### 4. The forest boost per area

Count **different tree species planted in one flight** (the local id, not the UK slot). In a one-biome area that's
the land's 5 trees; in a two-biome starter area (e.g. Western Europe: woodland + Mediterranean) up to 10, and a flight
that crosses both can mix them. The boost formula stays (kinds / 5)^2, capped at 5 kinds. Variety shows twice: the
boost itself, and the biodiversity meter (a new kind already adds much more than a repeat).

Balance check before building: rerun `tools/balance.cjs PLANT=1` with "kinds counted by species", to confirm a full
forest still lands near one lap (~33,000 km), and the coordinator's capability estimate uses the same count.

### 5. How a child sees it

- **NATURE page of each land:** its 5 trees in a row, open ones in colour, locked ones as silhouettes with one line:
  "Finish a project here to plant acacias."
- **In flight:** the popup already names the tree ("BAOBAB PLANTED!").
- **Results:** "3 kinds of tree today: forest bonus x0.36" (the boost made visible).

## Risks

- **Slower first trees in a new land:** you start each land with only its plantation tree. That's intended (nature is
  how you go further), but the first project must be affordable early in each land; check with the pricing work.
- **Two-biome areas** make 5 kinds easier than one-biome areas. Fine if the starter areas are balanced against each
  other; the crossing estimate should use each area's real tree count.
- **Code:** `speciesOwned()`, `loadout()`'s tree part, the forest kind count in GameScene, NATURE's tree list and the
  hangar's line list change; the UK's `save.planted` and `plantedIn` stay.

## Tests to write when built

- A land's native tree opens exactly on its rule (plant: open on any land's project → fails).
- A parcel over a land plants only that land's unlocked trees (plant: a locked tree planted → fails).
- The boost counts species, not slots (plant: count slots → a mixed two-biome flight scores wrong → fails).
- The hangar no longer lists Tree Species; parcels, soil and nursery remain (plant: the line back → fails).
