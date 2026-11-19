# Learn-more screens: handoff notes (2026-11-19)

No game code written yet. Branch `learn-more` off origin/main c2d3649, worktree ~/Documents/contrail/worktrees/cp-learn.

## Where things are

- Project buy: `WildScreen.buy(id)` in src/wild.js (re-renders, then `this.field.arrive(id)` and a toast). Hook the
  zoom + card here. Feature position: `this.field.spotsOf(id)` (bottom-left [x, y] in the 288 x 170 field, src/water.js FW/FH).
  The field is `.wfield` scaled by `Field.fit()` with `transform-origin: 0 0`; zoom by changing that transform.
- Existing grown-up gate for outside links: `orgHTML(o)` + `gate(root)` in src/wild.js (hold 2 s). Reuse it for "Learn more".
- Plane-part payoff to imitate: `payoff()` in src/hangar.js.
- Tutorial clash: tour step r-nature (src/tour.js ~line 134) taps the FREE project then points at #wMeter with OK.
  A blocking card there would cover it; skip or defer the card while `this.ui.tour.busy`.

## Organisation links

Region projects (src/habitat/*.js) all have `org.learn`. Checked 2026-11-19 with curl and headless Chrome:
- BROKEN: tundra.js `old.ni.is/...` (domain does not resolve). Replacement checked 200: https://www.natt.is/en
- BROKEN: rainforest.js `https://www.sementesdoxingu.org.br/` (certificate error; http redirects to ISA).
  Replacement checked 200: https://www.socioambiental.org/en (Instituto Socioambiental).
- Behind a Cloudflare check (not verifiable headless, real sites): amazonconservation.org, wildlifetrusts.org.
- All other region org links returned 200.

UK projects (src/habitats.js UK_PROJECTS) have NO `org`. Proposed, each checked 200 except where noted:
deadwood Buglife https://www.buglife.org.uk/ · meadow Plantlife https://www.plantlife.org.uk/ ·
margins Bumblebee Conservation Trust https://www.bumblebeeconservation.org/ · hedgerow PTES https://ptes.org/ ·
pond Freshwater Habitats Trust https://freshwaterhabitats.org.uk/ · woodland Woodland Trust https://www.woodlandtrust.org.uk/ ·
voles The Wildlife Trusts https://www.wildlifetrusts.org/ (Cloudflare check) · beavers Beaver Trust https://beavertrust.org/ ·
rewet IUCN UK Peatland Programme https://www.iucn-uk-peatlandprogramme.org/ · storks White Stork Project https://www.whitestorkproject.org/ ·
martens Vincent Wildlife Trust https://www.vwt.org.uk/

Link checker: tools/linkcheck.cjs
(`node tools/linkcheck.cjs <path>/node_modules/playwright-core <urls...>`, uses /usr/bin/google-chrome).

Plane upgrades one-liner + Learn more: not started.
