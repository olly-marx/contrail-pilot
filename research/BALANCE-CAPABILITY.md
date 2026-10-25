# Capability table: km before the Earth overheats (plane build, 2026-10-25)

User question: how far can each era's plane fly, and does a new era plane make crossings too easy?
Measured with tools/balance.cjs on 0.11.3 (dangerLine 165), crashes off (only heat ends a run), 7 skies (seeds) per case,
**median (min–max over the 7 skies)**, capped at 25,000 km. NORENDER=1 (no drawing): ~25x faster, same medians (see Method).

Upgrades: BASE nothing bought; MID the era's first levels (plane lines L1; systems and gadgets at the era's first level);
FULL everything in the era. Nature: N0 nothing; N3 trees 2 + 3 kinds + 2 UK projects; N5 trees 4 + 5 kinds + 5 projects,
with the bot dropping tree parcels on soil.

## STRAIGHT pilot: holds the middle of the sky, ignores icy air: a careless pilot

| Plane | Upgrades | N0 | N3 | N5 |
|---|---|---|---|---|
| Comet (1950s) | base | 8,988 (9–10k) | 10,370 (8–12k) | 12,076 (10–13k) |
| Comet (1950s) | mid | 10,399 (9–12k) | 12,356 (11–13k) | 15,897 (10–17k) |
| Comet (1950s) | full | 10,308 (9–12k) | 11,890 (9–12k) | 12,349 (10–16k) |
| 747 (1970s) | base | 9,831 (8–12k) | 11,929 (8–12k) | 12,468 (9–15k) |
| 747 (1970s) | mid | 11,967 (10–19k) | 12,447 (12–16k) | 16,954 (12–20k) |
| 747 (1970s) | full | 13,015 (12–17k) | 16,251 (16–18k) | 21,101 (17–21k) |
| Twin (1990s) | base | 12,849 (12–13k) | 13,701 (12–16k) | 16,371 (13–17k) |
| Twin (1990s) | mid | 12,669 (12–17k) | 14,186 (12–22k) | 17,117 (17–25k) |
| Twin (1990s) | full | 16,221 (13–21k) | 20,123 (16–21k) | ≥25,000 (25–25k) |

## CAREFUL pilot: dodges icy air at night and seeks it by day, but only once it is VISIBLE on screen: closest to a careful human

| Plane | Upgrades | N0 | N3 | N5 |
|---|---|---|---|---|
| Comet (1950s) | base | 11,000 (10–11k) | - | - |
| Comet (1950s) | mid | - | - | - |
| Comet (1950s) | full | 11,850 (12–13k) | - | - |
| 747 (1970s) | base | 12,517 (12–13k) | - | - |
| 747 (1970s) | mid | - | - | - |
| 747 (1970s) | full | 16,840 (16–21k) | - | - |
| Twin (1990s) | base | 15,355 (13–18k) | - | - |
| Twin (1990s) | mid | - | - | - |
| Twin (1990s) | full | 24,137 (20–25k) | - | - |

## SMART pilot: the same, but sees ALL icy air, even hidden: an UPPER bound, not a human

| Plane | Upgrades | N0 | N3 | N5 |
|---|---|---|---|---|
| Comet (1950s) | base | 10,443 (10–11k) | 11,746 (11–13k) | 14,216 (13–15k) |
| Comet (1950s) | mid | 12,447 (11–13k) | 13,831 (13–16k) | 17,558 (17–20k) |
| Comet (1950s) | full | 11,411 (11–12k) | 12,800 (12–13k) | 16,093 (15–17k) |
| 747 (1970s) | base | 11,897 (10–12k) | 12,587 (12–14k) | 16,116 (15–17k) |
| 747 (1970s) | mid | 13,500 (13–16k) | 15,381 (12–16k) | 21,085 (16–25k) |
| 747 (1970s) | full | 16,756 (14–20k) | 18,137 (17–20k) | ≥25,000 (25–25k) |
| Twin (1990s) | base | 15,635 (12–16k) | 16,935 (16–17k) | ≥25,000 (20–25k) |
| Twin (1990s) | mid | 19,278 (15–21k) | 20,154 (17–21k) | ≥25,000 (25–25k) |
| Twin (1990s) | full | 23,969 (20–25k) | ≥25,000 (25–25k) | ≥25,000 (25–25k) |

## The jump between eras (no nature, N0)

| Pilot | Comet full | 747 base | 747 full | Twin base | Twin full |
|---|---|---|---|---|---|
| straight | 10,308 | 9,831 | 13,015 | 12,849 | 16,221 |
| careful | 11,850 | 12,517 | 16,840 | 15,355 | 24,137 |
| smart | 11,411 | 11,897 | 16,756 | 15,635 | 23,969 |

Reading it:
- A NEW era plane with NOTHING bought flies about as far as, or a little further than, the previous era's FULLY
  upgraded plane (careful: Comet full 11,850 -> 747 base 12,517; 747 full 16,840 -> twin base 15,355). So a new
  plane alone does not make crossings easy; upgrading WITHIN the era is where the range grows (careful: 747
  +35% base -> full; twin +57%).
- Nature adds a lot on top: N5 adds roughly +20-50% for the straight pilot, and pushes the smart pilot past
  25,000 km from the 747 full onwards.
- Today's legs are 1,800-2,600 km; a 2-leg trip is ~3,600-5,200 km. Every plane in every configuration can fly
  2 legs; even the Comet BASE straight pilot reaches ~9,000 km (3-4 legs). If crossings should be hard for a
  careful pilot, the hard part must come from distance (crossings of ~10,000+ km) or other limits, not the
  base plane.

## Oddities (not explained yet)
- Comet MID beats Comet FULL for every pilot. FULL adds forecasting level 2 (false icy-air patches, which the
  bot dodges for nothing: it treats a fake patch as real) and stronger 1950s gadgets with no CO2 effect.
  Suspect the false patches; worth a check before tuning on it.
- CAREFUL sometimes beats SMART (Comet base 11,000 vs 10,443; 747 base 12,517 vs 11,897). The smart pilot
  climbs/dives for icy air it sees early and pays for it in steering; this is within the skies' spread, but it
  means "smart" is not a strict upper bound in every case.

## Method and caveats
- Speed: 6.55 ms per game step when drawing, 0.25-0.28 with NORENDER (the time was almost all WebGL buffer
  uploads: 76% bufferSubData). Grid A (24 jobs) 206 s, grid B (36 jobs) 319 s, 8 workers. A PROBE mode that also
  skipped visual updates (0.12 ms/step) was REJECTED: the skipped visuals draw from the same seeded Math.random,
  so it changes the sky (+15% km).
- Repeatability: per-sky km are NOT exactly repeatable in drawing mode (the same case gave 16,441 / 16,618 /
  17,038 km) nor under heavy load in either mode (the scene start waits on real time and on-demand art loads).
  So only MEDIANS over several skies are meaningful. Drawing vs no-drawing medians over the same 5 skies:
  17,094 vs 16,973 km (under 1%). The sim engine chat's RNG change (a separate physics stream) should remove this.
- The bots never crash (storms, birds, no-fly zones are off), never land (no landing bonus, fares, missions or
  seeds matter), and the smart pilot sees hidden icy air. ATC and forecasting only act through the kit values
  (wider gaps do not matter when storms cannot hit you). The careful pilot has no reaction delay.
- Larger time steps (STEPX) were not used: at ~4 s a run they are not needed, and they change physics.
