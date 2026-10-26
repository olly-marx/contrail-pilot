# Starter area balance (for research/DESIGN-STARTER-AREAS.md)

Status: STUDY + PROPOSAL (2026-10-25, PixelLab session). No game code changed, no browser. Measured with a node script
over `src/cities.js` + `src/geo.js` (+ candidate new airports), rebuilding the route network per area exactly as
`src/network.js` does (each city links to its 5 nearest within 2,600 km, plus the sea `BRIDGES`), then flying every
take-off choice for 30 legs with the game's `choices()` / `onward()` rules confined to the area.

The user's goal: every area holds a pilot for an interesting time before the leap to the next, so areas must be
comparable. "Seen in 30 legs" = average number of different cities a pilot passes in 30 legs from any start and choice.

## Decisions for you (short)

1. **Nine areas cover the world** (table below), each of at most 2 biomes. Honolulu and Nadi are not an area: they
   become ocean stepping stones on the Pacific crossings.
2. **Add 14 airports** where areas are thin or broken: 8 for Australia + New Zealand, 3 for Patagonia, 3 for the
   Nordic area. The first two lists come from the research notes; the Nordic ones are a suggestion, not researched yet.
3. **Biome labels:** count Buenos Aires and Santiago as Patagonia (today "plains") so South America stays at 2 biomes;
   Australia and New Zealand become their own biomes (the new-regions research).
4. **Which areas are starts?** Suggest the 6 that hold a pilot best (12+ cities seen in 30 legs, or close):
   Western Europe, North America, South & Southeast Asia, Africa, South America + Patagonia, and East Asia (thinner).
   North Africa & Middle East, Nordic & North Atlantic, and Australia + NZ as later areas.

## The areas (measured)

| Area | Cities | Biomes | Connected | Dead ends | Seen in 30 legs | Best start (fewest seen from it) |
|---|---|---|---|---|---|---|
| Western Europe | 16 | woodland + mediterranean | yes | none | 10.3 | LONDON (11) |
| North America | 17 | plains + boreal | yes | none | 12.7 | DENVER (13) |
| South & Southeast Asia | 14 | monsoon + desert (Karachi) | yes | none | 12.6 | KOLKATA (13) |
| Africa south of the Sahara | 13 | savanna | yes | none | 12.2 | LAGOS (13) |
| South America + Patagonia (+3) | 15 | rainforest + patagonia | yes | none | 11.5 | MANAUS (12) |
| East Asia | 10 | eastasia | yes | none | 8.5 | SEOUL (9) |
| North Africa & Middle East | 11 | desert + mediterranean | yes | none | 8.6 | KHARTOUM (9) |
| Nordic & North Atlantic (+3) | 8 | boreal + tundra | yes | none | 8.0 | OSLO (8) |
| Australia + New Zealand (+8) | 12 | australia + newzealand | yes | none | 7.9 | MELBOURNE (8) |

For comparison, today's thin versions: South America without Patagonia 12 cities, 7.9 seen. Nordic & Iceland 5 cities,
5.0. Oceania as it is (Sydney, Perth, Darwin, Auckland, Honolulu, Nadi) has 3 dead ends (Perth, Darwin, Honolulu) and
every run gets stuck. Australia + NZ with the 7 research airports but **without Adelaide** still has Perth as a dead end
(2 runs stuck): Perth is more than 2,600 km from everything, so **Adelaide** (Perth-Adelaide ~2,130 km) is what joins
the west.

**A correction to DESIGN-STARTER-AREAS.md:** North Africa & Middle East and East Asia are **connected** with this cut.
Tashkent belongs with the Middle East (Tehran), not East Asia, where it was a dead end.

### Members

- **Western Europe:** London, Paris, Berlin, Amsterdam, Edinburgh, Dublin, Vienna, Warsaw, Kyiv, Moscow, Rome, Athens,
  Madrid, Lisbon, Barcelona, Istanbul.
- **North America:** Chicago, New York, Denver, Dallas, Atlanta, Los Angeles, Miami, Toronto, Winnipeg, Mexico City,
  Anchorage, Vancouver, Seattle, Calgary, Fairbanks, Yellowknife, Iqaluit.
- **South & Southeast Asia:** Karachi, Delhi, Mumbai, Kolkata, Chennai, Kathmandu, Dhaka, Colombo, Bangkok, Hanoi,
  Kuala Lumpur, Singapore, Jakarta, Manila.
- **Africa south of the Sahara:** Nairobi, Addis Ababa, Dar es Salaam, Johannesburg, Cape Town, Windhoek, Maputo, Luanda,
  Kinshasa, Lagos, Accra, Niamey, Antananarivo.
- **South America + Patagonia:** Manaus, Belem, Sao Paulo, Rio, Brasilia, Lima, Quito, Bogota, Caracas, Panama,
  Buenos Aires, Santiago + **Punta Arenas, Puerto Madryn, Balmaceda** (new).
- **East Asia:** Beijing, Tokyo, Shanghai, Hong Kong, Seoul, Chengdu, Osaka, Taipei, Sapporo, Ulaanbaatar.
- **North Africa & Middle East:** Casablanca, Tunis, Cairo, Khartoum, Tamanrasset, Riyadh, Dubai, Doha, Muscat, Tehran,
  Tashkent.
- **Nordic & North Atlantic:** Oslo, Stockholm, Helsinki, Reykjavik, Akureyri + **Tromso, Rovaniemi, Nuuk** (new; not
  researched yet).
- **Australia + New Zealand:** Sydney, Perth, Darwin, Auckland + **Melbourne, Brisbane, Cairns, Hobart, Adelaide,
  Wellington, Christchurch, Dunedin** (new).
- **Ocean stepping stones (no area):** Honolulu, Nadi (+ ideas: Papeete, Apia) on the Pacific crossings.

## Crossings (nearest city pair, real km; the crossing flight's length is a game number anyway)

| From | To | Real km |
|---|---|---|
| Western Europe | North Africa & Middle East | 577 (Rome-Tunis) |
| Western Europe | Nordic & North Atlantic | 853 (Warsaw-Stockholm) |
| Western Europe | Africa south of the Sahara | 3,024 (Lisbon-Niamey) |
| Western Europe | North America | 3,570 (Edinburgh-Iqaluit) |
| North Africa & Middle East | South & Southeast Asia | 912 (Muscat-Karachi) |
| North Africa & Middle East | Africa south of the Sahara | 1,000 (Khartoum-Addis Ababa) |
| North Africa & Middle East | East Asia | 3,028 (Tashkent-Ulaanbaatar) |
| South & Southeast Asia | East Asia | 845 (Hanoi-Hong Kong) |
| South & Southeast Asia | Australia + NZ | 2,746 (Jakarta-Darwin) |
| North America | South America | 1,862 (Miami-Panama) |
| North America | Nordic & North Atlantic | 823 (Iqaluit-Nuuk) |
| East Asia | North America | 4,833 (Sapporo-Anchorage) |
| South America | Africa | 5,421 (Belem-Accra) |

Every area has at least two neighbours, so no start is a dead end on the world map. Short land borders (Rome-Tunis,
Hanoi-Hong Kong) are "frontier crossings"; long sea ones are the big leaps.

## What's missing per area

| Area | Cities | Art | Research |
|---|---|---|---|
| Western Europe, North America, S & SE Asia, Africa, East Asia, N Africa & Middle East | none | done (PixelLab skylines, animals, trees, fields) | done |
| South America + Patagonia | 3 airports | 3 skylines, Patagonia animals/trees/field | done (NEW-REGIONS-SUMMARY.md) |
| Australia + New Zealand | 8 airports | 8 skylines, animals, trees, 2 fields | done for NZ + Australia; **Adelaide** needs a line in it |
| Nordic & North Atlantic | 3 airports | 3 skylines (Nordic animals exist) | **not researched** (Tromso, Rovaniemi, Nuuk are suggestions) |
| Ocean stepping stones | optional Papeete, Apia | ocean art (see the PixelLab budget note) | not researched |

Skyline art cost: ~1 generation per city at the measured rate (~14 for all new airports, with redos ~18).

## Balance notes

- **Comparable now:** the 5 big starts see 10.3-12.7 different cities in 30 legs. Western Europe is a little lower
  (10.3) than its 16 cities suggest, because its network funnels through a few hubs; still the biggest variety of lands.
- **Thinner:** East Asia, North Africa & Middle East, Nordic and Australia + NZ (7.9-8.6). They fit as LATER areas
  (by then the player has upgrades and the crossings are the point), or need 2-3 more airports each to be starts.
- **Method limits:** "seen in 30 legs" measures route variety only, not how much nature/missions an area offers, nor
  how long its crossings take. The capability estimate (DESIGN-STARTER-AREAS.md) and a mission-pacing bot are still
  needed; both need machine time from the coordinator.
