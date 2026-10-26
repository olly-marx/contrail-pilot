# Proposal 6: plane art (the seven levels with no look, and the 747 in-flight redo)

Written 2026-10-25 by the bug-fix chat. Research and proposal only: **no PixelLab call was made and nothing was drawn.** The coordinator says **268.5
PixelLab generations remain** and that the three new regions want 69 animals + 15 trees from the same pool, so this proposal is mostly about NOT spending them.
Sources: `research/PLANE-ART-RECIPE.md` (the locked recipe), `PLANE-UPGRADE-ART-NOTES.md`, `PLANE-ART-TODO.md`, `tools/art/planes/upgrades/PROVENANCE.md`,
`src/fleet.js` (LOOKS), `src/planelook.js`, `tools/art/make_upgrades.py`.

## Decisions for you (the user)

1. **Draw the seven missing looks locally (free), in the same way as the Comet and Twin looks that already exist?** Cost: **0 generations**. That is how the
   hush-kit, riblets, premium cabin, glow and all 15 gadget stickers were made (`make_upgrades.py`, `hangar_parts.py`: deterministic recolours and small hand
   edits). My recommendation: yes, and I show you a review sheet at 2x real size before anything is wired in.
2. **Redo the 747's six in-flight variants with PixelLab?** About **18 to 36 generations** for polish on art you already approved ("alright, good for now").
   My recommendation: **not now**. If there are generations left after the animals, do only the two most visible (next-gen engines, stretched upper deck): 6 to 12.
3. **How to split the 268.5.** Proposed: **plane art 0 now, at most 60 held back** for the optional steps 4 and 5 below; **at least 208 kept for the 84 region
   sprites** (about 2.5 per sprite). I do not know what an animal costs (the 189 earlier ones were the game chat's): its measured number decides whether 208 is enough.
4. **What an "invisible" upgrade looks like.** FADEC, a low-emission combustor, fly-by-wire, seat-back screens, XL bins, an upper-deck lounge and nine-across
   seating are mostly inside the plane. Each needs a *visible cue* from the side, and your rule is that every purchase must be obvious at real size. The
   cues I propose are in the table: please say yes, or change any. (They must be neutral or metallic colours, never another era's accent.)
5. **Winglets stay hangar-only** in flight (too subtle at 62x27, as the code already does)? And the hush-kit made bolder in flight (free)?

## What exists, and the facts that decide the cost

- **Looks are layered by pixel difference** (`src/planelook.js`): every look image is the WHOLE plane with only that part changed, and the game composes a
  plane by taking, for each bought part, the pixels where it differs from the base (later parts win). **This is why PixelLab cannot simply replace a look:** it
  never leaves the other pixels untouched, so a fresh whole-plane generation "differs" everywhere and wipes out the layering. Any PixelLab result has to be
  pasted back as the masked part only: the same rule the recipe already has for hangar parts.
- **Who drew what so far** (PROVENANCE.md): in flight, ALL 18 plane looks (747: jt9d, hushkit, nextgen, upperdeck, glass, business; Comet 6; Twin 6) and all 15
  gadget stickers (5 gadgets x 3 eras), the six ATC towers and the three weather stations are **local, free** (`make_upgrades.py`). In the hangar, PixelLab inpaint-v3 made 747 nextgen, glass,
  jt9d, upperdeck, winglet, hushkit; all six Comet parts; Twin giant fan, blades, winglet (about 19 calls with the redos = **about 190 generations**, my count);
  the 747 business band and the Twin tail, riblets, premium and glow were local recolours.
- **Costs measured by the art session:** one inpaint-v3 call = **10 generations** (up to 256 px a side; measured 2026-10-24). A pixflux call at 64x28 is about 1
  generation (the recipe says about 3 per plane in total; I have not measured one, so this is an assumption to check once, by reading the balance before and after).
- **Today's gaps** (from `LOOKS` in `src/fleet.js`): the seven levels with no look at all:
  Jumbo cabin L1 *Upper-deck lounge* (30 seeds) and L2 *Wide-body economy* (70); Twin engines L1 *FADEC* (60) and L3 *Low-emission combustor* (205); Twin body L3
  *Fly-by-wire* (195); Twin cabin L1 *Seat-back screens* (50) and L2 *XL overhead bins* (105). Buying any of them changes nothing on screen today.
- **Rules to keep** (notes and recipe): marks are neutral/metallic (gold, silver, black), never an era accent; every in-flight look must be obvious at 1x;
  changes stay inside the original outline +-2 px, except engines and the upper-deck hump (up to 5 px); collisions always use the base mask; any new
  `assets/*.png` must be loaded by the game in the same change or `tests/textures.cjs` fails.

## The items, cheapest way first (draft cues to approve)

"Local" = recolour or hand edit in `make_upgrades.py` (in flight) / `hangar_parts.py` (hangar), 0 generations. "Gens" are estimates including one retry.

| # | item | cue I would draw (in flight; the hangar part is the same idea larger) | cheapest way | gens | value per generation |
|---|---|---|---|---|---|
| 1 | Jumbo cabin L1 Upper-deck lounge | warm-lit windows all along the upper deck (pale yellow, not gold) | local | 0 | infinite |
| 2 | Jumbo cabin L2 Wide-body economy | a full second window tone: every cabin window lit white-blue (a full plane) | local | 0 | infinite |
| 3 | Twin engines L1 FADEC | a small silver control box and a dark band on the nacelle | local (PixelLab only if it looks flat in the hangar: 10-20) | 0 (10-20) | infinite / low |
| 4 | Twin engines L3 Low-emission combustor | a clean pale-blue exhaust cone and a silver rear band | local | 0 | infinite |
| 5 | Twin body L3 Fly-by-wire | dark spoiler panel lines on the wing and a small antenna fin on the tail | local (PixelLab hangar polish: 10-20) | 0 (10-20) | infinite / low |
| 6 | Twin cabin L1 Seat-back screens | soft cool-blue window glow | local | 0 | infinite |
| 7 | Twin cabin L2 XL bins | the cabin roof line 1 px higher over the cabin (a bulge) | local in flight; hangar: PixelLab inpaint if the local bulge looks flat (10-20) | 0 (10-20) | infinite / low |
| 8 | 747 hush-kit bolder in flight (TODO list) | wider dark nacelle band | local | 0 | infinite |
| 9 | Recombine the `full` hangar pictures | code `combine()` over the new parts | local | 0 | n/a |
| 10 | Redo the six 747 in-flight looks with PixelLab | pixflux native 64x28, init = the approved hand-made look as the guide, strength 200-300, then paste back the part's rectangle only | PixelLab | 18-36 (all six); 6-12 for nextgen + upperdeck | low |
| 11 | In-flight PixelLab for the seven new looks | as 10, from a local guide | PixelLab | about 21-35 | lowest (62x27 hides the gain) |

## Ranking by value per generation

1. **Items 1 to 9 first: all local, 0 generations.** They fix the real problem (seven purchases that change nothing on screen) at no PixelLab cost. This is the
   whole of my recommendation for now.
2. **Hangar polish for FADEC, fly-by-wire and XL bins only if the local versions look flat** (10-20 each, 30-60 in all): the hangar is the one place a larger
   picture shows the benefit; do after the user has seen the local versions.
3. **Items 10 (two looks) next, only with leftover generations.** The 747 art is approved; the gain is polish.
4. **Item 11 last, probably never:** a shape that is 3 px tall in flight cannot show what PixelLab adds.

## Risks

- Local cues are *symbols* (a glow, a band), not photographs of a FADEC: the hangar card and the "fact" text must carry the meaning (the cards already exist).
- A local bulge for the XL bins costs outline pixels: it must stay within +-2 px of the original (the collision mask is the base's).
- The generation count assumes a pixflux call is 1 generation: unverified. I would measure it with one call before planning any batch.
- Per the team rule, **PixelLab calls take turns** with the game chat's batches (one job at a time on the account); nothing is generated until you say so.

## Suggested order if you agree

1. I draw items 1 to 9 locally and show a labelled review sheet at 2x real size (like `review-*.png`), 0 generations. 2. You approve or change the cues.
3. The plane build wires them (`LOOKS`, preload) with the textures test. 4. Then decide steps 2 and 3 of the ranking with the generations that are left.
