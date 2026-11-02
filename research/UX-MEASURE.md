# UX-MEASURE: the baseline on live 0.25.2 (origin/main 6fa5857), BEFORE any UX release

Measured 2026-11-02 by `tools/ux-measure.cjs` (a one-off script, NOT a gate; it renders every screen declared in `src/screens.js` through `tools/uxlib.cjs`, the same measuring code the gates use). Real Chrome via Playwright, touch on, 390x667 and 320x568, ~45 s a run:
`python3 -m http.server 8137 &` then `URL=http://localhost:8137/ NODE_PATH=<node_modules> node tools/ux-measure.cjs`.
This table replaces the (est.) numbers in `~/contrail-research/UX-MASTER-PLAN.md` sections A and C. **Re-run it and APPEND a table after every release R1-R10.** (An earlier table for 0.25.1, written before `tools/uxlib.cjs` existed, had cruder "clipped" and tap columns; the numbers for height, first card and primary button were identical.)

## The declared "rich" save
West Europe start (LONDON), lessons L1-L5 done, tour steps done, 5,000 seeds and 200 crystals (upgrades affordable), 12 landings, lands discovered = woodland + bush + mediterranean, 8 unclaimed prizes (7 missions + 1 badge). RESULTS is driven through `ui.showResults(r)` with the reveal skipped, for the declared variants `rich` (7 missions, Murray cod, badge, record), `seven` (7 missions), `animalbadge`, `plain`, `crash`, `first` (a free upgrade waiting) and `school`. HANGAR is measured after tapping each sub-tab; NATURE as it opens and for bush / woodland / mediterranean with every tier forced open (as `rowfit` does). `scrollTop` is reset to 0 before measuring.

## Columns
`scrollHeight`/`clientHeight`: of the screen's overlay. `first-card top`: first card of the screen (RESULTS the missions box, HOME the NEXT box, MISSIONS/HANGAR/NATURE the first row). `primary bottom`: the screen's primary button (HANGAR/NATURE: the first row's price button until the plan's strip/NEXT line exist). `bar top`: top of the tab bar; a primary or first card whose bottom is greater is UNDER the bar. `text < 7 px`: text boxes with a font under 7 px. `overlaps`: pairs of leaf text/button boxes whose text extents intersect (stacked pictures excluded). `cut text`: a box that hides overflow yet has more text than room, or text drawn past the screen's side. `taps < 40 px`: tappable things smaller than 40x40.

## Baseline (live 0.25.2, before R0)
| screen | viewport | scrollHeight | clientHeight | scrollTop | first-card top | primary bottom | bar top | text < 7 px | overlaps | cut text | taps < 40 px | verdict | examples |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| results/rich | 390x667 | 1703 | 667 | 0 | 105 | 1617 | 607 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/seven | 390x667 | 1535 | 667 | 0 | 105 | 1449 | 607 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/animalbadge | 390x667 | 1568 | 667 | 0 | 105 | 1482 | 607 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/plain | 390x667 | 789 | 667 | 0 | 105 | 703 | 607 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/crash | 390x667 | 828 | 667 | 0 | 105 | 742 | 607 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/first | 390x667 | 872 | 667 | 0 | 105 | 786 | 607 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/school | 390x667 | 740 | 667 | 0 | 105 | 654 | 607 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| home | 390x667 | 1040 | 667 | 0 | 58 | 450 | 607 | 2 | 2 | 0 | 15 | SCROLLS + OVERLAP + SMALL TEXT + SMALL TAPS | "◀" x "hub-globe" |
| missions | 390x667 | 1383 | 667 | 0 | 103 | 131 | 607 | 0 | 0 | 0 | 9 | SCROLLS + SMALL TAPS |  |
| hangar/plane | 390x667 | 2599 | 667 | 0 | 581 | 608 | 607 | 25 | 0 | 0 | 11 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + SMALL TEXT + SMALL TAPS |  |
| hangar/systems | 390x667 | 2381 | 667 | 0 | 581 | 611 | 607 | 25 | 0 | 0 | 10 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + SMALL TEXT + SMALL TAPS |  |
| hangar/gadgets | 390x667 | 2494 | 667 | 0 | 581 | 611 | 607 | 25 | 0 | 0 | 14 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + SMALL TEXT + SMALL TAPS |  |
| nature/as opened | 390x667 | 2109 | 667 | 0 | 565 | 606 | 607 | 41 | 1 | 23 | 13 | SCROLLS + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Field margins and bee ba" x "60 8" / cut: Desert fly there |
| nature/bush (tiers open) | 390x667 | 2268 | 667 | 0 | 588 | 628 | 607 | 38 | 7 | 23 | 25 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Koala trees and rescue" x "20 3" / cut: Desert fly there |
| nature/woodland (tiers open) | 390x667 | 2490 | 667 | 0 | 565 | 606 | 607 | 41 | 2 | 23 | 26 | SCROLLS + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Field margins and bee ba" x "60 8" / cut: Desert fly there |
| nature/mediterranean (tiers open) | 390x667 | 2115 | 667 | 0 | 588 | 628 | 607 | 34 | 5 | 23 | 23 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Keep the oak pastures" x "60 8" / cut: Desert fly there |
| boards | 390x667 | 667 | 667 | 0 | - | - | 607 | 0 | 0 | 0 | 10 | SMALL TAPS |  |
| results/rich | 320x568 | 1760 | 568 | 0 | 105 | 1674 | 508 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/seven | 320x568 | 1592 | 568 | 0 | 105 | 1506 | 508 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/animalbadge | 320x568 | 1610 | 568 | 0 | 105 | 1524 | 508 | 0 | 0 | 0 | 9 | SCROLLS + PRIMARY UNDER BAR + SMALL TAPS |  |
| results/plain | 320x568 | 789 | 568 | 0 | 105 | 703 | 508 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/crash | 320x568 | 828 | 568 | 0 | 105 | 742 | 508 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/first | 320x568 | 872 | 568 | 0 | 105 | 786 | 508 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| results/school | 320x568 | 740 | 568 | 0 | 105 | 654 | 508 | 0 | 0 | 0 | 0 | SCROLLS + PRIMARY UNDER BAR |  |
| home | 320x568 | 1064 | 568 | 0 | 58 | 431 | 508 | 2 | 2 | 0 | 15 | SCROLLS + OVERLAP + SMALL TEXT + SMALL TAPS | "◀" x "hub-globe" |
| missions | 320x568 | 1484 | 568 | 0 | 103 | 131 | 508 | 0 | 0 | 0 | 9 | SCROLLS + SMALL TAPS |  |
| hangar/plane | 320x568 | 2692 | 568 | 0 | 602 | 629 | 508 | 25 | 0 | 21 | 11 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + CUT TEXT + SMALL TEXT + SMALL TAPS | cut: TAKE OFF |
| hangar/systems | 320x568 | 2474 | 568 | 0 | 602 | 632 | 508 | 25 | 0 | 6 | 10 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + CUT TEXT + SMALL TEXT + SMALL TAPS | cut: TAKE OFF |
| hangar/gadgets | 320x568 | 2587 | 568 | 0 | 602 | 632 | 508 | 25 | 0 | 0 | 14 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + SMALL TEXT + SMALL TAPS |  |
| nature/as opened | 320x568 | 2180 | 568 | 0 | 584 | 625 | 508 | 41 | 6 | 24 | 13 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Brings back: 2 animals" x "FREE!" / cut: Mediterranean scrub |
| nature/bush (tiers open) | 320x568 | 2323 | 568 | 0 | 599 | 639 | 508 | 38 | 21 | 27 | 25 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Brings back: 1 animal" x "FREE!" / cut: Mediterranean scrub |
| nature/woodland (tiers open) | 320x568 | 2580 | 568 | 0 | 584 | 625 | 508 | 41 | 19 | 24 | 26 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Brings back: 2 animals" x "FREE!" / cut: Mediterranean scrub |
| nature/mediterranean (tiers open) | 320x568 | 2202 | 568 | 0 | 612 | 652 | 508 | 34 | 17 | 24 | 23 | SCROLLS + PRIMARY UNDER BAR + FIRST CARD UNDER BAR + OVERLAP + CUT TEXT + SMALL TEXT + SMALL TAPS | "Brings back: 2 animals" x "FREE!" / cut: Mediterranean scrub |
| boards | 320x568 | 568 | 568 | 0 | - | - | 508 | 0 | 0 | 0 | 10 | SMALL TAPS |  |

## Reading it
- **RESULTS scrolls on every variant, both sizes**: rich 1,703 / 1,760 px (plan est. ~1,300) against 667 / 568, and even the plain landing is 789 px. FLY ON ends at 654-1,674 px, always under the bar (607 / 508). RESULTS has no overlaps and no cut text; its 9 small taps are the CLAIM buttons (51x19 px).
- **HOME scrolls** (1,040 / 1,064 px); TAKE OFF itself is above the bar. 2 overlaps = the globe's spin arrows on the globe (probably by design: an allow-list decision for R3), 2 text boxes under 7 px (tile badges), 15 small taps (the tiny buttons, the gear).
- **HANGAR and NATURE: the first row is below the bar** (first row top 565-612, bar at 607 / 508; at 320x568 the first row is wholly under the bar).
- **NATURE overlaps (the user's screenshot, now measured): 390x667 bush 7, mediterranean 5, woodland 2; 320x568 bush 21, woodland 19, mediterranean 17** (names and fact lines under the price buttons). HANGAR has 0 overlaps.
- **REAL BUG FOUND, not in the plan: on a 320-wide phone the HANGAR panel is wider than the screen** (text right edges at 332-341 px: TAKE OFF, the "Future" era chip, captions, badge text). NATURE's land-tab row is cut mid-word at both sizes (the plan's known "Mediterranean s").
- **Text under 7 px**: HANGAR 25, NATURE 34-41, HOME 2. Tap targets under 40 px exist on every screen (BOARDS 10).
- BOARDS fits (667 x 667, 568 x 568) with no overlaps; only its tap sizes fail.
- The tab bar is 60 px high at both sizes (plan confirmed).

## What R0 changes (the "after" for rows)
The `.rowc` regrow (price a grid item in the flow, names and fact lines may wrap) takes NATURE overlaps to 0 at both sizes and keeps HANGAR at 0 (`tests/overlap.cjs`). No screen height changed; the table above is the before for R1-R10. Gate flags that are PENDING (red on live on purpose) are listed in `src/screens.js`; each release flips its own.

## Caveats
One rich save; the lesson-lead and era-opened results variants are not run yet. Per-block heights inside a screen (title, tally, claims ...) are not measured here; they arrive with R1.
