# UX-MEASURE: the baseline on live 0.25.1 (origin/main aca4d45)

Measured 2026-11-02 by `tools/ux-measure.cjs` (one-off script, NOT a gate; run: `python3 -m http.server 8137 &` then `NODE_PATH=<node_modules> node tools/ux-measure.cjs`; ~42 s). Real Chrome via Playwright, touch on, at 390x667 and 320x568.
This table replaces the (est.) numbers in `~/contrail-research/UX-MASTER-PLAN.md` sections A and C. Re-run and APPEND a table after every release R1-R10.

## The declared "rich" save (what every row below was rendered with)
West Europe start (LONDON), lessons L1-L5 done, tour steps all marked done, 5,000 seeds and 200 crystals (so upgrades are affordable), 12 landings, lands discovered = woodland + bush + mediterranean, 8 unclaimed prizes (7 missions + 1 badge). RESULTS is driven through `ui.showResults(r)` with the reveal skipped:
- **rich**: landed in MELBOURNE, 9,990 km, new record, 7 missions done (real-length names, one of 51 characters), Murray cod found, badge Frequent Flyer, 4 earn rows, forest bonus, 7 crystals.
- **plain**: landed, 23 seeds, nothing else. **crash**: crashed, no prizes.
HANGAR is measured after tapping each sub-tab; NATURE as it opens (home land) and for bush / woodland / mediterranean with every tier forced open (as `rowfit` does). `scrollTop` is set to 0 before measuring (columns are the TOP of the screen).

## How each column is measured
`scrollHeight` / `clientHeight`: of the screen's overlay. `first-card top`: top of the first card (RESULTS: the missions box; HOME: the NEXT box; MISSIONS: first `.mrow`; HANGAR/NATURE: first `.rowc`). `primary bottom`: bottom of the screen's primary button (RESULTS `#againBtn`, HOME `#goBtn`; MISSIONS first row; HANGAR/NATURE the first row's price button, since the plan's strip/NEXT line do not exist yet). `bar top`: top of `#tabbar` (so a primary bottom greater than it is UNDER the bar). `overlaps`: pairs of LEAF text/button/picture boxes whose text extents intersect by more than 2 px in both directions (container buttons excluded, padding that only reserves room not counted). `clipped`: a text element whose scrollWidth/Height exceeds its box.

## Baseline (live 0.25.1)
| screen | viewport | scrollHeight | clientHeight | scrollTop | first-card top | primary bottom | bar top | text < 7 px | overlaps | clipped | verdict | examples |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RESULTS rich | 390x667 | 1703 | 667 | 0 | 105 | 1617 | 607 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| RESULTS plain | 390x667 | 789 | 667 | 0 | 105 | 703 | 607 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| RESULTS crash | 390x667 | 908 | 667 | 0 | 105 | 822 | 607 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| HOME | 390x667 | 1040 | 667 | 0 | 58 | 450 | 607 | 2 | 2 | 2 | SCROLLS + OVERLAP + CLIPPED + SMALL TEXT | "◀" x "hub-globe"; "hub-globe" x "▶" / MISSIONS8; HANGARNEW |
| MISSIONS | 390x667 | 1383 | 667 | 0 | 103 | 131 | 607 | 0 | 0 | 0 | SCROLLS |  |
| HANGAR plane | 390x667 | 2599 | 667 | 0 | 581 | 608 | 607 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| HANGAR systems | 390x667 | 2381 | 667 | 0 | 581 | 611 | 607 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| HANGAR gadgets | 390x667 | 2494 | 667 | 0 | 581 | 611 | 607 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| NATURE (as opened) | 390x667 | 2109 | 667 | 0 | 565 | 606 | 607 | 41 | 1 | 0 | SCROLLS + OVERLAP + SMALL TEXT | "Field margins and bee " x "60 8" |
| NATURE bush (tiers open) | 390x667 | 2268 | 667 | 0 | 588 | 628 | 607 | 38 | 7 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Koala trees and rescue" x "20 3"; "Early burns for finche" x "300 38"; "Cassowary rainforest c" x "300 38" |
| NATURE woodland (tiers open) | 390x667 | 2490 | 667 | 0 | 565 | 606 | 607 | 41 | 2 | 0 | SCROLLS + OVERLAP + SMALL TEXT | "Field margins and bee " x "60 8"; "Plant native woodland" x "300 38" |
| NATURE mediterranean (tiers open) | 390x667 | 2115 | 667 | 0 | 588 | 628 | 607 | 34 | 5 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Keep the oak pastures" x "60 8"; "Guard turtle beaches" x "20 3"; "Cut reeds for meadows" x "300 38" |
| BOARDS | 390x667 | 667 | 667 | 0 | - | - | 607 | 0 | 0 | 0 | ok |  |
| RESULTS rich | 320x568 | 1760 | 568 | 0 | 105 | 1674 | 508 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| RESULTS plain | 320x568 | 789 | 568 | 0 | 105 | 703 | 508 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| RESULTS crash | 320x568 | 908 | 568 | 0 | 105 | 822 | 508 | 0 | 0 | 2 | SCROLLS + PRIMARY UNDER BAR + CLIPPED | +152; Nature |
| HOME | 320x568 | 1064 | 568 | 0 | 58 | 431 | 508 | 2 | 2 | 2 | SCROLLS + OVERLAP + CLIPPED + SMALL TEXT | "◀" x "hub-globe"; "hub-globe" x "▶" / MISSIONS8; HANGARNEW |
| MISSIONS | 320x568 | 1484 | 568 | 0 | 103 | 131 | 508 | 0 | 0 | 0 | SCROLLS |  |
| HANGAR plane | 320x568 | 2692 | 568 | 0 | 602 | 629 | 508 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| HANGAR systems | 320x568 | 2474 | 568 | 0 | 602 | 632 | 508 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| HANGAR gadgets | 320x568 | 2587 | 568 | 0 | 602 | 632 | 508 | 25 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR + SMALL TEXT |  |
| NATURE (as opened) | 320x568 | 2180 | 568 | 0 | 584 | 625 | 508 | 41 | 6 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Brings back: 2 animals" x "FREE!"; "Wildflower meadow" x "30 4"; "Brings back: 3 animals" x "30 4" |
| NATURE bush (tiers open) | 320x568 | 2323 | 568 | 0 | 599 | 639 | 508 | 38 | 21 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Brings back: 1 animal" x "FREE!"; "Koala trees and rescue" x "20 3"; "Brings back: 1 animal" x "20 3" |
| NATURE woodland (tiers open) | 320x568 | 2580 | 568 | 0 | 584 | 625 | 508 | 41 | 19 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Brings back: 2 animals" x "FREE!"; "Wildflower meadow" x "30 4"; "Brings back: 3 animals" x "30 4" |
| NATURE mediterranean (tiers open) | 320x568 | 2202 | 568 | 0 | 612 | 652 | 508 | 34 | 17 | 0 | SCROLLS + PRIMARY UNDER BAR + OVERLAP + SMALL TEXT | "Brings back: 2 animals" x "FREE!"; "Keep the oak pastures" x "60 8"; "Brings back: 1 animal" x "60 8" |
| BOARDS | 320x568 | 568 | 568 | 0 | - | - | 508 | 0 | 0 | 0 | ok |  |

## Reading it (what is RED on live; the positive control for `fitscreen` and `overlap`)
- **fitscreen would be RED on RESULTS, both sizes**: rich 1,703 px (390) / 1,760 px (320) against 667 / 568 (plan est. ~1,300); even the PLAIN landing is 789 px and a crash 908 px. The primary button FLY ON ends at 1,617-1,674 px: far below the screen and the bar. `scrollTop` was 0 only because this script resets it first; the bug that it opens scrolled (see the plan, A3) is a separate check for the gate.
- **fitscreen would be RED on HOME** too: 1,040 px (390) / 1,064 px (320) against 667 / 568. TAKE OFF's bottom is at 450 / 431, above the bar, so the main button is reachable, but the screen scrolls (the plan's target is "fits"). HANGAR 2,381-2,692 px, NATURE 2,109-2,580 px, MISSIONS 1,383-1,484 px scroll by design (their policy is "first card on the first screen").
- **First card on the first screen: FAILS for HANGAR and NATURE.** First `.rowc` top: HANGAR 581 (390) / 602 (320), NATURE 565-612; the bar starts at 607 / 508. At 320x568 the first HANGAR row is entirely below the bar (602 > 508), and the first NATURE row too (584-612 > 508). MISSIONS' first row is at 103.
- **overlap would be RED on NATURE, both sizes.** At 390: "Early burns for finches" x its price "300 38" and "Cassowary rainforest corridors" x "300 38" (bush, tiers open: 7 overlaps), "Koala trees and rescue..." x "20 3" and others on every land (woodland 2, mediterranean 5, as opened 1). At 320 it is much worse: 6 as opened, 21 bush, 19 woodland, 17 mediterranean (sub-lines "Brings back: 1 animal" under the FREE!/price buttons, names under prices). This confirms the plan's screenshot c49eaa82 on a machine-readable footing. HANGAR: 0 overlaps on all three tabs at both sizes (its names are short): the regrow must keep that at 0.
- **HOME has 2 overlaps** at both sizes: the globe's spin arrows sit over the globe canvas (`hubSpinL`/`hubSpinR` x `hub-globe`); that may be by design (arrows drawn on the globe) and the `overlap` gate needs a declared allow-list for it (decide in R3, not R0).
- **Text under 7 px**: HOME 2 (tile badges MISSIONS8 / HANGARNEW, also clipped), HANGAR 25 (all three tabs), NATURE 34-41, RESULTS 0, MISSIONS 0, BOARDS 0. This is the `taptargets` failure list on live.
- BOARDS (2 sub-boards, empty rich save) fits: 667 x 667 and 568 x 568, no overlaps, no small text.
- The tab bar is 60 px high at both sizes (plan's figure confirmed: 667-607, 568-508).

## Caveats (honest)
- "clipped" on RESULTS reports 2 small spans ("+152", "Nature") on every variant: these are the tally's own spans and have NOT been inspected; treat as unverified until `overlap` is built (they may be false positives from inline-block/transform).
- The HOME overlap pair is arrows over a canvas, not text under a button: a candidate for the allow-list, unverified as intended.
- The plan's per-block heights (title 40, missions box 160, tally 196 ...) were not measured separately here; only whole-screen numbers. The per-block table comes with R1 when the blocks change.
- A single rich save; the other results variants of F2 (lesson lead, era opened, first flight) are not run yet (declared table comes with the `fitscreen` gate).
