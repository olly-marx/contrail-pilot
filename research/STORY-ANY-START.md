# The story from any start

Status: STUDY + PROPOSAL (2026-10-26, PixelLab session). No game code, no browser. A node model over the 9 areas of
`research/AREA-BALANCE.md` and the crossing tiers of `research/PROPOSAL-10-ERAS-4-6.md` (the plane build owns it; this
proposes changes to its table). The user: players can START ANYWHERE, the story must work from any start, with a final
boss (~30,000 km).

## Decisions for you (short)

1. **Every area gets exactly one 1950s partner** (a short frontier hop), so every start has an early exit and nobody
   opens half the world in era 1. The other land borders become "second frontiers" in the 1970s or 1990s.
2. **The final boss is fixed:** the South Pacific (Auckland to Santiago, or reversed), ~30,000 km, offered in the 2030s
   **only once every other area is open**. It never opens a new area: it closes the circle. That works from any start.
3. **The four story beats in order, for everyone:** first frontier hop (1950s), first ocean (1970s), first long ocean
   (1990s, a story mission), final boss (2030s).
4. **Changes to PROPOSAL-10's tiers** (table below): add 5 frontier hops (Khartoum-Addis Ababa, Warsaw-Stockholm,
   Hanoi-Hong Kong, Mexico City-Panama, Jakarta-Darwin) and move the Mediterranean hops and Mumbai-Dubai to the 1970s.

## The model

- **Nodes:** the 9 areas (Western Europe, North Africa & Middle East, South & Southeast Asia, East Asia, North America,
  South America + Patagonia, Africa south of the Sahara, Nordic & North Atlantic, Australia + NZ) plus OCEAN (Honolulu,
  Nadi). Starters (AREA-BALANCE.md): W Europe, N America, S & SE Asia, Africa, S America, East Asia.
- **Edges:** crossings with an era tier and a kind (frontier, ocean, long, boss).
- **Pacing:** a player opens ONE area at a time (its crossing mission, then its chapter). Eras arrive by flying time,
  assumed every 2 chapters. A **wait** = no crossing on offer until the next era. The crossing with the lowest tier is
  taken first. This is a model of the shape, not of minutes: the real time per chapter needs the sim engine's player.

## Today's tiers (PROPOSAL-10 as written)

| Start | Starter | Waits | 1st frontier | 1st ocean | 1st long | Final boss at chapter |
|---|---|---|---|---|---|---|
| W Europe | yes | 0 | 0 | 2 | 6 | 9 |
| N Africa & ME | | 0 | 0 | 2 | 6 | 9 |
| S & SE Asia | yes | 0 | 0 | 2 | 6 | 9 |
| East Asia | yes | 1 | 3 | 2 | 8 | 11 |
| N America | yes | 1 | 4 | 2 | 8 | 11 |
| S America | yes | 1 | 5 | 2 | 8 | 11 |
| **Africa** | yes | **2** | 8 | 5 | 4 | **13** |
| Nordic | | 1 | 3 | 2 | 8 | 11 |
| **Australia + NZ** | | **2** | 5 | 7 | 4 | **13** |

Problems: **Africa and Australia + NZ have no exit until the 1990s** (Africa's only bridges are the South Atlantic and
the Indian Ocean; the 1,000 km Khartoum-Addis Ababa land border is missing). The Americas, East Asia and the Nordic
area wait through the 1950s. Beats arrive in different orders (Africa meets a long ocean before any frontier).

## Proposed tiers

| Era | Crossing | Areas | Kind |
|---|---|---|---|
| 1950s | Warsaw/Berlin-Stockholm (853 km) | W Europe - Nordic | frontier |
| 1950s | **Khartoum-Addis Ababa** (1,000 km, land) | N Africa & ME - Africa | frontier |
| 1950s | **Hanoi-Hong Kong** (845 km, land) | S & SE Asia - East Asia | frontier |
| 1950s | **Jakarta-Darwin** (island hops) | S & SE Asia - Australia + NZ | frontier |
| 1950s | **Mexico City-Panama** (Central America, land) | N America - S America | frontier |
| 1970s | North Atlantic (London-Reykjavik-New York, Lisbon-New York) | W Europe/Nordic - N America | ocean |
| 1970s | Arabian Sea (Muscat-Karachi, Mumbai-Dubai) | N Africa & ME - S & SE Asia | ocean |
| 1970s | Caribbean (Miami-Caracas) | N America - S America | ocean |
| 1970s | Mediterranean (Lisbon-Casablanca, Rome-Tunis, Athens-Cairo) | W Europe - N Africa & ME | second frontier |
| 1970s | Silk Road (Tashkent-Ulaanbaatar) | N Africa & ME - East Asia | second frontier |
| 1990s | South Atlantic (Lagos-Belem, Cape Town-Sao Paulo) | Africa - S America | long |
| 1990s | North Pacific (Sapporo-Anchorage) | East Asia - N America | long |
| 1990s | Singapore-Perth; Indian Ocean (Johannesburg-Antananarivo-Perth) | S & SE Asia / Africa - Australia + NZ | long |
| 2010s | Pacific islands (LA-Honolulu, Honolulu-Tokyo) | N America / East Asia - OCEAN | long |
| 2030s | Nadi-Auckland | OCEAN - Australia + NZ | long |
| 2030s | **FINAL: Auckland-Santiago** (~30,000 km mission) | Australia + NZ - S America | boss |

Mission lengths stay PROPOSAL-10's game numbers per era (1950s ~6-9k ... 2030s 22-30k, final ~30k).

## Proposed: every start

| Start | Starter | Waits | 1st frontier | 1st ocean | Final boss at chapter | Opening order (era: area) |
|---|---|---|---|---|---|---|
| W Europe | yes | 1 | 0 | 2 | 10 | 50s Nordic; 70s N America, S America; 90s N Africa & ME, Africa; 2010s S & SE Asia, East Asia; 2030s Australia + NZ, Ocean |
| N Africa & ME | | 1 | 0 | 4 | 10 | 50s Africa; 70s W Europe, Nordic; 90s N America, S America; 2010s S & SE Asia, East Asia; 2030s Australia + NZ, Ocean |
| S & SE Asia | yes | 0 | 0 | 2 | 9 | 50s East Asia, Australia + NZ; 70s N Africa & ME, Africa; 90s W Europe, Nordic; 2010s N America, S America; 2030s Ocean |
| East Asia | yes | 0 | 0 | 2 | 9 | as S & SE Asia (they join in the 1950s) |
| N America | yes | 1 | 0 | 2 | 10 | 50s S America; 70s W Europe, Nordic; 90s N Africa & ME, Africa; 2010s S & SE Asia, East Asia; 2030s Australia + NZ, Ocean |
| S America | yes | 1 | 0 | 2 | 10 | as N America, mirrored |
| Africa | yes | 1 | 0 | 4 | 10 | 50s N Africa & ME; 70s W Europe, Nordic; 90s N America, S America; ... |
| Nordic | | 1 | 0 | 2 | 10 | as W Europe |
| Australia + NZ | | 0 | 0 | 2 | 9 | as S & SE Asia |

Every start reaches the whole globe by the 2030s, with 0-1 waits, and meets the final boss at chapter 9-10 (today 9-13).

### The "first long ocean" beat

In the model the long crossings are never *needed* to open an area (frontiers and short oceans get there first), so a
player could skip them until the islands. To make the beat happen for everyone in the 1990s: make it a **1990s story
mission** ("Fly the South Atlantic"; "Fly the North Pacific"), a long crossing to an area you may already have.
Checked: by the 1990s every start has at least one long bridge touching its open areas.

## Caveats

- The model counts chapters, not minutes. Two areas open in the same era can take very different times (a 16-city
  chapter vs an 8-city one). The sim engine's player pilot should time a chapter per area.
- "Eras every 2 chapters" is an assumption; eras open by flying time (20 x n^1.5 minutes). If chapters are faster, the
  1950s pair-only rule matters even more.
- Real km of the frontier hops are short (845-1,000 km); their MISSION length is PROPOSAL-10's 1950s game number
  (~6-9k), as for every crossing.
- Australia + NZ as a start needs its 8 new airports (AREA-BALANCE.md); until then it's not a start.

## Links that exist today (measured in network.js LINKS, 2026-10-26)

Already linked: Khartoum-Addis Ababa, Hanoi-Hong Kong, Warsaw-Stockholm, Berlin-Stockholm, Jakarta-Darwin, Mexico
City-Panama. **Missing: Tashkent-Ulaanbaatar** (3,028 km, over the 2,600 km link limit): it needs a `BRIDGES` entry in
`src/cities.js`. (Colombo-Chennai is linked but is inside S & SE Asia, so it is not a crossing.)

## To agree with the plane build (owner of PROPOSAL-10)

AGREED by the plane build (2026-10-26) and applied to PROPOSAL-10.

The 5 new 1950s hops, moving the Mediterranean and Mumbai-Dubai to the 1970s, the Silk Road in the 1970s, the
Indian Ocean in the 1990s, and the fixed South Pacific finale.
