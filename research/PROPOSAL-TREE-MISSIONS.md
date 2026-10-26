# Proposal: each land's mission that opens its 4th tree

Status: PROPOSAL only (game chat, 2026-10-26; the coordinator approved it as a proposal). Not built: the missions
redesign (PROPOSAL-12-MISSIONS.md) and the area missions (MASTER-PLAN Part H) are waiting on the user. Today native 4
opens at biodiversity 40 in that land, a placeholder marked TODO in `src/landtrees.js` (OPENS[4]).

## The idea in one line
Each land's 4th native tree opens when you finish **that land's tree mission: "Plant 3 kinds of <land> tree in one
flight"**. MASTER-PLAN Part H already lists this template among the area missions.

## Why this mission
- **It teaches the forest rule.** The boost and the store grow with the kinds planted in ONE flight (`FOREST.kinds`).
  This is the mission that makes a child plant a mix on purpose.
- **It always fits the order.** It needs 3 open kinds in that land, which you have once natives 1 and 2 are open (a
  project, biodiversity 20) plus the plantation tree. So it can't come too early and never blocks: native 3 (5 animals
  found) is not needed for it.
- **It reads the existing data.** `speciesTags` already records 'land:id' per flight (the tree rework), so the check
  is: at least 3 distinct ids with this land's prefix in one landed flight. A crash doesn't count, like other missions.

## One example per land

| Land | Mission text | Trees it can use (slot 0-2) | Opens (native 4) |
|---|---|---|---|
| United Kingdom | Plant 3 kinds of British tree in one flight | spruce, birch, oak | apple (orchard) |
| Mediterranean | Plant 3 kinds of Mediterranean tree in one flight | Aleppo pine, stone pine, cork oak | olive |
| Savanna | Plant 3 kinds of savanna tree in one flight | eucalyptus, acacia, baobab | marula |

(The other lands follow the same pattern, from `REGION_TREES`. The text uses the land's name from `REGION_NAMES`.)

## What it needs, when missions get areas
- A per-land mission record, e.g. `save.landMissions[land] = ['trees-3', ...]`. Missions today are one global list in
  order (`save.missionsDone`), so this has to wait for area missions; it is not a hack on the global list.
- `src/landtrees.js` OPENS[4] becomes `ok: (save, land) => (save.landMissions?.[land] || []).includes('trees-3')`, and
  the placeholder goes. The NATURE silhouette says "Plant 3 kinds of tree here in one flight".
- The prize follows PROPOSAL-12's pricing for that stage. The tree itself is the main reward.

## Tests when built
- The mission completes only with 3 distinct trees of THAT land in one landed flight (plant: count kinds from any land
  → a mixed two-land flight completes it wrongly → fails).
- Native 4 opens on the mission, not on biodiversity 40 (plant: the old placeholder → fails).
- A crashed flight doesn't complete it (plant: drop the landed check → fails).

## Open for the user
- Keep "3 kinds in one flight" for every land, or scale it with era (3 in era 1-2, 4 later)? Suggest 3 everywhere:
  simple, and the 4th tree is the prize.
