# Two skills: dodging (s) and contrail care (c) - balancing the crash and heat limits (plane build, 2026-10-26)

> **SUPERSEDED 2026-10-26 for every crashes-ON result (sections 1-6):** they used the old 'classic' player, which the
> user judged unrealistic (it chased contrails and hugged the safe band's edge; storm crashes before 8k that the user
> does not have). The sim engine's new default (plan 'threat', f688e89) plus a risk budget replaces it, and its skill
> scale is steeper (old s values do not carry over). Conclusions that MAY FLIP: "care never pays with crashes on",
> "revealBoost hurts careful flying" (the sim chat measured it as edge-hugging: fixed by budget 0.25), and the bare
> new plane gap with crashes on. Crashes-OFF results (D_heat, Variant A's three criteria) do not depend on the pilot's
> dodging and are NOT superseded. Do not cite the crashes-on tables against the new player; do not assert the
> opposite either until re-measured.

User target: D_crash(s) (how far crashes let you go, by dodging skill) and D_heat(c) (how far heat lets you go, by
contrail care) on the SAME scale, so the actual distance ~ min(D_crash(s), D_heat(c)) rewards both skills.
Engine: the sim's two-knob 'player' pilot (feat/sim-engine 413cc60; care c=0 is exactly the old careless pilot,
c=1 the old careful one). D_crash: crashes ON, heat switched off (danger line out of reach), c=0. D_heat: crashes
OFF, s=1. 20 skies (D_heat sweeps: 16), median km. Difficulty and weather untouched except where a row says so.

## 1. Today's two curves

| Plane | D_crash at s = 0.60 / 0.70 / 0.80 / 0.90 / 1.00 | D_heat at c = 0 / 0.5 / 1 |
|---|---|---|
| Comet bare | 1,833 / 6,161 / 8,666 / 11,195 / 10,818 | 9,654 / 9,894 / 10,115 |
| Comet full | 2,496 / 5,732 / 8,666 / 10,966 / 11,574 | 12,296 / 12,552 / 12,706 |
| 747 bare | 1,823 / 7,748 / 8,437 / 10,186 / 10,274 | 10,513 / 11,081 / 11,015 |
| 747 full | 2,507 / 7,585 / 9,125 / 10,735 / 11,655 | 16,121 / 16,151 / 16,641 |
| Twin bare | 1,830 / 5,951 / 8,666 / 10,290 / 10,274 | 12,618 / 12,893 / 13,047 |
| Twin full | 2,267 / 6,843 / 9,125 / 9,584 / 12,272 | 20,410 / 21,017 / 22,235 |

**D_crash rises steeply with skill (1,800 -> ~11,000 km, the same for every plane: crashes, not the plane, set
it). D_heat is FLAT in care (Comet 9,654 at c=0, 10,115 at c=1; every plane within ~10%).** Today heat comes mostly
from CO2, which care cannot change, so the heat limit is set by the PLANE, not by the player's contrail skill.
To line the curves up on the Comet, D_heat would need roughly 6,000 at c=0 (a mediocre dodger's crash limit) and
~11,000 at c=1: care worth about x1.8.

## 2. Can the knobs make care matter? (Comet bare, D_heat at c = 0 / 0.5 / 1, s=1, crashes off)

| Setting | c=0 | c=0.5 | c=1 | c=1 / c=0 |
|---|---|---|---|---|
| CO2->heat x1.5, night 8, icy patch max height 60 | 5,273 | 6,218 | 7,770 | 1.47 |
| CO2->heat x1.5, night 6, day shade -1.5 | 5,397 | 5,401 | 7,909 | 1.47 |
| CO2->heat x1.5, night 6, day shade -0.66 | 5,120 | 5,055 | 7,498 | 1.46 |
| CO2->heat x1.2, night 8, reveal 150 | 5,345 | 6,355 | 7,524 | 1.41 |
| CO2->heat x1.5, night 8, icy patch max height 40 | 5,632 | 6,877 | 7,684 | 1.36 |
| CO2->heat x0.7, night 6, day shade -0.66 | 8,402 | 8,450 | 11,275 | 1.34 |
| CO2->heat x1.2, night 4, icy patch max height 60 | 8,759 | 9,695 | 11,588 | 1.32 |
| CO2->heat x1.5, night 6, reveal 150 | 5,397 | 6,520 | 6,964 | 1.29 |
| CO2->heat x1.5, night 4, day shade -0.66 | 6,454 | 6,635 | 8,179 | 1.27 |
| CO2->heat x1.2, night 4, icy-free lane 90 | 8,944 | 10,446 | 11,193 | 1.25 |
| CO2->heat x1.5, night 6, icy patch max height 60 | 6,588 | 7,817 | 8,186 | 1.24 |
| CO2->heat x0.7, night 4, day shade -1.5 | 13,656 | 12,877 | 16,707 | 1.22 |
| CO2->heat x1.2, night 8, icy patch max height 60 | 7,051 | 7,954 | 8,626 | 1.22 |
| CO2->heat x0.7, night 4, day shade -0.66 | 12,772 | 12,331 | 15,495 | 1.21 |
(Today: CO2->heat 1.5, night 0.93, day shade -0.66: 9,654 / 9,894 / 10,115, ratio 1.05. The 14 best of 60 settings
are shown; all in /tmp/bal/two/sw.)

Findings:
- The best care leverage any setting reaches is about x1.45 (MORE CO2 heat with a much
  heavier night weight: CO2->heat 1.5, night 6-8, day shade 1.5, optionally smaller icy patches). The target needs
  ~x1.8, and those settings also drag the whole heat curve down to ~5,000-8,000 km, below what good dodgers reach.
- HALF care (c=0.5) is worth almost nothing in most settings: the benefit only appears near c=1.
- A wider icy-free lane through storm gaps (placement) made icy air rarer overall, not more avoidable: no help.
- A longer reveal (what forecasting upgrades do) helps a little at most.

## 3. Conclusion so far (no setting proposed)
With today's world and this player model, NO combination of night weight, day shade, CO2 heat, icy-air size or
placement, or reveal distance makes contrail care shape the heat limit as much as dodging shapes the crash limit.
Two things to check before any tuning decision:
1. The player model's ceiling: does the careful player (care term only inside the gap's safe band, 50 px reveal)
   avoid as many night contrails as a good human could? A perfect-information oracle pilot (sees all icy air,
   plans across gaps) would show how much care COULD be worth. That is the sim chat's model; I've asked it.
2. The steering-cost lever (the user's list): letting a contrail move cost less risk, e.g. icy air never spawning
   inside the band the plane must fly to clear the next gap. That needs a change in the game's spawn rules to test.
Until one of those changes the picture, the honest answer is: today the heat limit is a PLANE property, and care
adds at most ~5-45% depending on settings.

## 4. Shifting the heat budget from CO2 to contrails, the middle kept fixed (coordinator's idea, 2026-10-26)

Science check: Lee et al. (Atmospheric Environment, 2021) put aviation's 2018 contrail-cirrus effective radiative
forcing at 57.4 mW/m^2 against 34.3 for its CO2 (the University of Leeds eprint of the paper); one later paper cites
the same study as 2020. ERF (not RF) is the right comparison. So making contrails the bigger heat lever is faithful.

Method: CO2->heat scaled to 70% / 50% / 35% of today; night-contrail weight AND day shade scaled by one factor,
solved by bisection so that the Comet's D_heat at c=0.5 stays at today's ~9,900 km (factors: 6.6 / 10.1 / 11.8).
Crashes off, s=1, 16 skies.

**Today (CO2 x1, contrails x1)**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,654 | 9,807 | 10,115 | 1.05 |
| Comet full | 12,412 | 12,552 | 12,930 | 1.04 |
| 747 bare | 10,410 | 11,100 | 10,839 | 1.04 |
| 747 full | 16,121 | 16,275 | 16,462 | 1.02 |
| Twin bare | 12,618 | 12,751 | 13,047 | 1.03 |
| Twin full | 20,410 | 21,017 | 21,372 | 1.05 |

**CO2 x0.7, contrails x6.6**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,086 | 11,586 | 12,839 | 1.41 |
| Comet full | 12,517 | 12,821 | 16,452 | 1.31 |
| 747 bare | 8,356 | 9,065 | 8,882 | 1.06 |
| 747 full | 9,016 | 9,089 | 12,851 | 1.43 |
| Twin bare | 8,557 | 8,654 | 9,048 | 1.06 |
| Twin full | 8,527 | 9,054 | 12,340 | 1.45 |

**CO2 x0.5, contrails x10.1**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,001 | 11,976 | 16,401 | 1.82 |
| Comet full | 12,524 | 12,835 | 17,339 | 1.38 |
| 747 bare | 5,073 | 8,880 | 8,814 | 1.74 |
| 747 full | 8,515 | 8,859 | 12,564 | 1.48 |
| Twin bare | 5,414 | 8,033 | 8,293 | 1.53 |
| Twin full | 5,282 | 8,389 | 8,859 | 1.68 |

**CO2 x0.35, contrails x11.8**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,020 | 12,284 | 16,723 | 1.85 |
| Comet full | 12,655 | 12,865 | 17,878 | 1.41 |
| 747 bare | 5,044 | 8,890 | 8,823 | 1.75 |
| 747 full | 8,123 | 8,496 | 12,564 | 1.55 |
| Twin bare | 5,386 | 5,423 | 8,152 | 1.51 |
| Twin full | 4,359 | 5,490 | 8,666 | 1.99 |

- It WORKS for the Comet: care becomes worth x1.8 at a 50:50 split (9,001 -> 16,401 km), the middle unchanged.
- It BREAKS THE ERA LADDER: the 747 and twin make contrails nearer the edge of icy air (the efficiency trap), so
  with contrails weighing ~10x they overheat FIRST (bare 747 at c=0: 5,073 km vs Comet 9,001).
- So the 50:50 split was re-run with the later planes' contrail margins brought towards the Comet's:

**50:50 + 747 margin 0.85, twin 0.9 (from 1.0 / 1.12)**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,001 | 11,976 | 16,401 | 1.82 |
| Comet full | 12,524 | 12,835 | 17,339 | 1.38 |
| 747 bare | 8,157 | 11,657 | 12,774 | 1.57 |
| 747 full | 16,508 | 12,086 | 20,256 | 1.23 |
| Twin bare | 8,740 | 9,844 | 12,944 | 1.48 |
| Twin full | 12,828 | 12,592 | 16,410 | 1.28 |

**50:50 + 747 and twin margins 0.8**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,001 | 11,976 | 16,401 | 1.82 |
| Comet full | 12,524 | 12,835 | 17,339 | 1.38 |
| 747 bare | 12,032 | 8,400 | 12,685 | 1.05 |
| 747 full | 8,852 | 16,364 | 13,087 | 1.48 |
| Twin bare | 12,534 | 8,448 | 13,064 | 1.04 |
| Twin full | 8,626 | 16,700 | 24,714 | 2.87 |

**50:50 + every plane at the Comet margin 0.75 (no efficiency trap)**

| Plane | c=0 | c=0.5 | c=1 | care x |
|---|---|---|---|---|
| Comet bare | 9,001 | 11,976 | 16,401 | 1.82 |
| Comet full | 12,524 | 12,835 | 17,339 | 1.38 |
| 747 bare | 9,110 | 12,265 | 16,660 | 1.83 |
| 747 full | 12,219 | 16,863 | 21,498 | 1.76 |
| Twin bare | 12,349 | 12,578 | 16,938 | 1.37 |
| Twin full | 21,568 | 17,043 | 28,847 | 1.34 |

- With every plane at the Comet's margin, care is worth x1.3-1.8 everywhere and the bare planes sit level
  (c=1: 16,401 / 16,660 / 16,938): the era steps would then have to come from CO2 and upgrades alone
  (BALANCE-ERA-STEPS.md), and the 'efficiency trap' lesson (efficient engines make MORE contrails, confirmed
  science) would be lost. Intermediate margins give non-monotonic, noisy medians.
- NOISE WARNING: with contrails weighing ~10x, a flight's heat hinges on whether it meets one more icy night, so
  outcomes are bimodal and 16-sky medians jump (e.g. 747 full 16,508 at c=0 vs 12,086 at c=0.5). Any choice
  needs 40+ skies.

Status: no setting proposed. The direction (contrails as the bigger heat lever) is scientifically sound and does
make care matter, but only if the efficiency trap is softened or compensated per era, which is a design call. The
sim chat is building an ORACLE pilot (perfect icy-air routing) to show the ceiling of care; the steering-cost
spawn rule is not tested yet.

## 5. Care upgradable away, era ladder kept (user's two constraints, coordinator's variant, 2026-10-26)

Science for the upgrade lever (verified): fewer soot particles -> fewer, larger ice crystals -> contrails that warm
less. Burkhardt, Bock & Bier (npj Clim. Atmos. Sci., 2018): 80% fewer initial ice crystals -> ~50% less contrail-cirrus
forcing (a halving -> ~20%); Voigt et al. (Commun. Earth Environ., 2021): low-aromatic SAF gave 50-70% fewer soot and ice
crystals in flight tests (DLR: a 50/50 blend halved the crystals, an estimated 20-30% lower contrail climate impact).
(Note: the lean-burn combustor is different: Voigt 2026, already in the game, found soot down ~1000x but ice crystals
barely changed, so the combustor card must not claim fewer contrails.)

Model: the efficiency trap is KEPT (later planes' wider contrail margins). Each plane's upgrades multiply its night heat
AND day shade per contrail by a factor (bare 1 / mid / full). 35:65 split (CO2->heat x0.35, contrail weights x11.8),
40 skies, crashes OFF, s=1. Variant A: Comet 1 / 0.75 / 0.5, 747 1 / 0.6 / 0.3, twin 1 / 0.5 / 0.15.

| Plane | D_heat at c = 0 / 0.5 / 1 | care x |
|---|---|---|
| Comet base | 8,876 / 11,690 / 16,142 | 1.82 |
| Comet mid | 12,993 / 12,748 / 16,595 | 1.28 |
| Comet full | 17,110 / 18,326 / 21,332 | 1.25 |
| 747 base | 5,044 / 8,833 / 8,850 | 1.75 |
| 747 mid | 11,604 / 12,585 / 16,350 | 1.41 |
| 747 full | 20,851 / 20,497 / 25,265 | 1.21 |
| Twin base | 5,186 / 5,811 / 8,279 | 1.60 |
| Twin mid | 12,319 / 12,940 / 16,469 | 1.34 |
| Twin full | 29,631 / 33,799 / 37,981 | 1.28 |

Crashes OFF, all three pass: (1) the FULL plane of each era beats the previous era's full plane at every care level
(c=0: 17,110 < 20,851 < 29,631; c=1: 21,332 < 25,265 < 37,981); (2) care matters less once invested (care x: Comet
1.82 -> 1.25, 747 1.75 -> 1.21, twin 1.60 -> 1.28); (3) the bare Comet keeps x1.82. A BARE new plane sits below the
previous era (747 bare c=0 5,044): the efficiency trap shows, as intended.

### Crashes ON (the sim's player, s 0.72 = beginner, 0.90 = good; 40 skies; km (share ending by overheat))

| Plane | today s0.72 c=0 / 0.5 / 1 | today s0.90 c=0 / 0.5 / 1 | A s0.72 | A s0.90 |
|---|---|---|---|---|
| Comet base | 8,239 (12%) / 7,289 (0%) / 2,716 (5%) | 9,067 (55%) / 9,136 (57%) / 9,125 (47%) | 7,542 (40%) / 5,271 (25%) / 2,338 (7%) | 7,530 (75%) / 8,437 (57%) / 8,435 (47%) |
| Comet mid | 8,204 (0%) / 6,136 (0%) / 2,277 (0%) | 10,046 (20%) / 9,816 (27%) / 10,046 (30%) | 7,746 (17%) / 5,905 (7%) / 2,277 (0%) | 8,435 (35%) / 8,895 (37%) / 9,355 (30%) |
| Comet full | 8,715 (0%) / 7,293 (0%) / 2,231 (0%) | 11,363 (32%) / 10,276 (25%) / 11,047 (35%) | 8,664 (5%) / 7,293 (2%) / 2,231 (0%) | 11,563 (12%) / 10,161 (7%) / 10,214 (15%) |
| 747 base | 8,204 (5%) / 6,423 (7%) / 2,251 (0%) | 9,353 (45%) / 9,134 (35%) / 9,584 (37%) | 5,199 (52%) / 3,435 (37%) / 2,110 (7%) | 5,325 (75%) / 5,406 (62%) / 5,709 (77%) |
| 747 mid | 8,219 (0%) / 6,193 (0%) / 1,572 (0%) | 11,195 (40%) / 10,504 (22%) / 10,966 (22%) | 8,204 (15%) / 5,456 (17%) / 1,572 (0%) | 8,584 (45%) / 9,211 (35%) / 9,816 (25%) |
| 747 full | 8,479 (0%) / 6,142 (0%) / 2,088 (0%) | 10,735 (12%) / 10,504 (12%) / 10,882 (12%) | 8,479 (0%) / 6,142 (0%) / 2,088 (0%) | 10,276 (15%) / 10,504 (2%) / 10,882 (5%) |
| Twin base | 8,223 (0%) / 6,147 (0%) / 2,469 (0%) | 10,159 (15%) / 9,584 (5%) / 9,615 (12%) | 5,216 (57%) / 4,387 (40%) / 2,056 (7%) | 5,108 (87%) / 5,183 (80%) / 5,220 (82%) |
| Twin mid | 8,683 (0%) / 5,934 (0%) / 1,135 (0%) | 10,966 (17%) / 11,425 (12%) / 10,737 (7%) | 8,458 (27%) / 5,679 (12%) / 1,135 (0%) | 9,125 (42%) / 10,506 (37%) / 10,203 (25%) |
| Twin full | 8,479 (0%) / 5,447 (0%) / 1,320 (0%) | 10,177 (2%) / 10,504 (5%) / 10,506 (7%) | 8,479 (0%) / 5,447 (0%) / 1,320 (0%) | 10,177 (0%) / 10,504 (0%) / 10,506 (0%) |

With crashes on, variant A FAILS the user's second constraint for real players:
- A newly unlocked BARE 747 or twin drops to ~5,000-5,700 km for everyone (75-87% of flights overheat at s 0.90, and
  care does not rescue it: c=1 gives 5,709 / 5,220), while the full Comet they leave reaches ~10,000-11,500. Switching
  to the new plane is a big step DOWN until it is upgraded.
- Beginners (s 0.72) lose ~35% with a bare later plane (747 8,204 -> 5,199) and ~10% in a bare Comet.
- Full planes are unchanged (crashes, not heat, limit them), so the ladder at the top is flat with crashes on, as today.
- Care still does not pay with crashes on at either skill (c=1 crashes early at s 0.72; c=1 ~ c=0 at s 0.90).

Status: no proposal. The crash-free design works; for real players a new plane must not arrive bare: e.g. it comes with
its era's first contrail upgrade fitted (its 'mid' factor), or the trap only bites at c=0 beyond a first stretch. Both
are design calls for the user; I can measure either in minutes.

### 5b. Two fixes for the bare new plane (measured 2026-10-26; both FAIL; superseded as the main path by section 6)
F1: a new plane arrives with its first contrail upgrade fitted (747 bare factor 0.6, twin 0.5). F2: the contrail
factor ramps 0.5 -> 1 over the first 6,000 km of each flight. 35:65 + Variant A, 40 skies, crashes ON, median km at
c = 0 / 0.5 / 1. Pass needs a bare new plane >= the full Comet the player leaves, at every s.

| Case | s 0.72 | s 0.80 | s 0.90 |
|---|---|---|---|
| Comet full (left behind) | 8,664 / 7,293 / 2,231 | 8,683 / 8,477 / 6,386 | 11,563 / 10,161 / 10,214 |
| 747 bare, A | 5,199 / 3,435 / 2,110 | 5,264 / 4,940 / 4,903 | 5,325 / 5,406 / 5,703 |
| 747 bare, F1 | 7,285 / 5,216 / 2,251 | 7,746 / 7,746 / 5,574 | 8,179 / 8,204 / 8,431 |
| 747 bare, F2 | 5,683 / 4,938 / 2,251 | 5,531 / 5,432 / 5,053 | 7,285 / 7,746 / 7,695 |
| Twin bare, A | 5,216 / 4,387 / 2,056 | 4,943 / 4,965 / 4,759 | 5,108 / 5,174 / 5,220 |
| Twin bare, F1 | 8,204 / 5,214 / 2,469 | 7,975 / 7,975 / 6,136 | 8,649 / 8,593 / 8,666 |
| Twin bare, F2 | 7,285 / 4,755 / 2,469 | 5,395 / 5,449 / 5,000 | 5,475 / 7,055 / 7,741 |

F1 roughly halves the drop but a bare new plane is still ~15-30% below the full Comet (s 0.90: ~8.2-8.7k vs
~10.2-11.6k); beginners (s 0.72, c 0) still lose ~5-16%. F2 is weaker than F1. Crashes off, F1 bare 747 9.0-12.9k and
twin 12.4-12.8k (vs full Comet 17.1-21.3k). Neither passes; care still does not pay with crashes on (c=1 <= c=0).

## 6. Icy air easier to avoid by shape and placement (user direction 2026-10-26; measured; NO proposal)

Sim chat's switches (feat/sim-engine 7703b79, off = today's sky bit-identical): ISSR.thinK 0.4 (bands 0.4x as tall,
2.5x as wide, same area), ISSR.laneExtra 40 (the clear lane through each gap 40 px taller, at spawn and at storm
placement), ISSR.revealBoost 3 (icy air shows from 3x further). Crashes ON, the sim's player, 40 skies, median km at
c = 0 / 0.5 / 1. Script /tmp/bal/six.mjs (worktree ~/.plane-issr at 7703b79).

| Setting | Case | s 0.72 | s 0.80 | s 0.90 |
|---|---|---|---|---|
| today, switches off | Comet base | 8,239 / 7,289 / 2,716 | 8,486 / 8,488 / 7,131 | 9,067 / 9,136 / 9,125 |
| today, switches off | Comet full | 8,715 / 7,293 / 2,231 | 8,687 / 8,477 / 6,386 | 11,363 / 10,276 / 11,047 |
| today, switches off | 747 base | 8,204 / 6,423 / 2,251 | 8,437 / 8,221 / 7,285 | 9,353 / 9,134 / 9,584 |
| today, switches off | Twin base | 8,223 / 6,147 / 2,469 | 8,458 / 8,227 / 6,136 | 10,159 / 9,584 / 9,615 |
| today, switches off | Twin full | 8,479 / 5,447 / 1,320 | 9,125 / 8,929 / 4,332 | 10,177 / 10,504 / 10,506 |
| today, all three | Comet base | 8,242 / 2,513 / 1,363 | 8,675 / 8,287 / 5,460 | 10,004 / 10,044 / 9,963 |
| today, all three | Comet full | 8,670 / 3,151 / 1,786 | 9,146 / 8,483 / 5,953 | 12,118 / 11,563 / 11,195 |
| today, all three | 747 base | 7,811 / 2,489 / 1,401 | 8,469 / 8,442 / 6,825 | 10,274 / 10,560 / 10,506 |
| today, all three | Twin base | 8,206 / 2,754 / 1,570 | 8,694 / 7,748 / 4,301 | 10,288 / 10,506 / 11,193 |
| today, all three | Twin full | 8,675 / 2,948 / 1,309 | 9,355 / 8,708 / 4,802 | 14,646 / 15,106 / 12,345 |
| 35:65+A, off | Comet base | 7,542 / 5,271 / 2,338 | 7,870 / 7,746 / 5,100 | 7,530 / 8,437 / 8,435 |
| 35:65+A, off | Comet full | 8,664 / 7,293 / 2,231 | 8,683 / 8,477 / 6,386 | 11,563 / 10,161 / 10,214 |
| 35:65+A, off | 747 base | 5,199 / 3,435 / 2,110 | 5,264 / 4,940 / 4,903 | 5,325 / 5,406 / 5,703 |
| 35:65+A, off | Twin base | 5,216 / 4,387 / 2,056 | 4,943 / 4,965 / 4,759 | 5,108 / 5,174 / 5,220 |
| 35:65+A, off | Twin full | 8,479 / 5,447 / 1,320 | 9,125 / 8,929 / 4,332 | 10,177 / 10,504 / 10,506 |
| 35:65+A, thinK 0.4 | Comet base | 7,299 / 5,570 / 1,836 | 6,825 / 7,979 / 5,356 | 7,746 / 8,204 / 8,574 |
| 35:65+A, thinK 0.4 | Comet full | 8,250 / 5,905 / 2,707 | 8,702 / 8,685 / 7,746 | 10,177 / 10,504 / 11,193 |
| 35:65+A, thinK 0.4 | 747 base | 5,159 / 2,954 / 1,560 | 5,341 / 6,159 / 5,091 | 7,746 / 6,598 / 8,664 |
| 35:65+A, thinK 0.4 | Twin base | 5,084 / 4,306 / 2,000 | 5,430 / 5,382 / 5,243 | 5,328 / 5,442 / 5,240 |
| 35:65+A, thinK 0.4 | Twin full | 8,704 / 3,403 / 1,804 | 9,383 / 8,681 / 7,516 | 12,116 / 10,737 / 10,966 |
| 35:65+A, laneExtra 40 | Comet base | 7,852 / 6,365 / 4,755 | 8,471 / 8,225 / 7,768 | 10,046 / 9,125 / 9,125 |
| 35:65+A, laneExtra 40 | Comet full | 8,469 / 5,683 / 2,485 | 8,948 / 8,206 / 8,448 | 10,046 / 10,046 / 10,166 |
| 35:65+A, laneExtra 40 | 747 base | 7,752 / 6,230 / 2,986 | 8,262 / 8,204 / 7,514 | 8,939 / 8,895 / 8,835 |
| 35:65+A, laneExtra 40 | Twin base | 7,325 / 5,677 / 2,949 | 7,975 / 7,762 / 8,169 | 8,204 / 8,704 / 8,895 |
| 35:65+A, laneExtra 40 | Twin full | 8,494 / 5,445 / 1,147 | 9,125 / 8,685 / 3,836 | 12,830 / 11,505 / 11,553 |
| 35:65+A, revealBoost 3 | Comet base | 7,542 / 3,432 / 1,360 | 7,870 / 7,055 / 3,844 | 7,530 / 7,746 / 8,895 |
| 35:65+A, revealBoost 3 | Comet full | 8,664 / 2,758 / 895 | 8,683 / 8,498 / 4,570 | 11,563 / 10,186 / 11,193 |
| 35:65+A, revealBoost 3 | 747 base | 5,199 / 4,905 / 1,579 | 5,264 / 5,253 / 3,187 | 5,325 / 5,546 / 5,540 |
| 35:65+A, revealBoost 3 | Twin base | 5,216 / 3,836 / 1,326 | 4,943 / 5,260 / 2,195 | 5,108 / 5,315 / 7,516 |
| 35:65+A, revealBoost 3 | Twin full | 8,479 / 6,437 / 1,321 | 9,125 / 8,664 / 2,478 | 10,177 / 10,966 / 11,216 |
| 35:65+A, lane+reveal | Comet base | 7,852 / 4,755 / 1,605 | 8,471 / 7,538 / 4,340 | 10,046 / 9,584 / 9,125 |
| 35:65+A, lane+reveal | Comet full | 8,469 / 3,432 / 1,136 | 8,948 / 8,717 / 7,285 | 10,046 / 10,873 / 10,181 |
| 35:65+A, lane+reveal | 747 base | 7,752 / 4,113 / 1,803 | 8,262 / 7,289 / 4,797 | 8,939 / 8,603 / 8,462 |
| 35:65+A, lane+reveal | Twin base | 7,325 / 4,529 / 1,554 | 7,975 / 7,975 / 4,586 | 8,204 / 8,861 / 8,895 |
| 35:65+A, lane+reveal | Twin full | 8,494 / 3,430 / 1,317 | 9,125 / 8,679 / 2,920 | 12,830 / 11,425 / 10,735 |
| 35:65+A, all three | Comet base | 8,242 / 2,513 / 1,363 | 8,673 / 8,287 / 5,460 | 11,425 / 10,299 / 10,735 |
| 35:65+A, all three | Comet full | 8,670 / 3,151 / 1,786 | 9,146 / 8,483 / 5,953 | 12,118 / 11,563 / 11,195 |
| 35:65+A, all three | 747 base | 7,758 / 2,489 / 1,401 | 8,233 / 8,256 / 6,825 | 9,658 / 10,276 / 10,506 |
| 35:65+A, all three | Twin base | 8,204 / 2,754 / 1,570 | 8,666 / 7,748 / 4,301 | 9,816 / 10,274 / 9,816 |
| 35:65+A, all three | Twin full | 8,675 / 2,948 / 1,309 | 9,355 / 8,708 / 4,802 | 14,646 / 15,106 / 12,345 |

What it says:
- **revealBoost HURTS careful flying** (Comet full, s 0.72, c 0.5: 7,293 -> 2,758; s 0.80 c 1: 6,386 -> 4,570). The
  careful player steers for every patch it can see, so seeing more means more steering and more crashes. Caveat: this
  may be the pilot model (it reacts to all visible icy air); a real child may ignore far patches.
- **thinK alone changes little** (within the bimodal noise; careful beginners slightly worse).
- **laneExtra 40 is the only switch that helps** (35:65+A): bare 747 s 0.90 5,325 -> ~8,900 and twin 5,108 -> ~8,200-8,900;
  careful beginners lose much less (Comet bare c=1 at s 0.72: 2,338 -> 4,755); at s 0.80 care costs little
  (Comet full 8,948 / 8,206 / 8,448).
- All three together: the best ladder at s 0.90 (bare 747 9.7-10.5k vs full Comet 11.2-12.1k) but careful
  beginners collapse (c 0.5: ~2,500 everywhere), from the reveal.

Against the pass criteria (35:65+A, laneExtra 40, the best candidate):
1. Care pays with crashes on at s >= 0.8: NO. It no longer costs much, but c=1 ~ c=0 (s 0.90: Comet full 10,046 /
   10,046 / 10,166). Not yet two skills.
2. Bare new plane >= the full plane left: CLOSE, NOT YET (s 0.90: bare 747 ~8,900 vs full Comet ~10,050; s 0.72 c 0:
   7,752 vs 8,469).
3. Beginners not hurt: careless beginners about the same (Comet full s 0.72 c 0: 8,664 -> 8,469); careful ones better.
4. Icy air amount: sim chat measured laneExtra 40 at +1.5% area (thinK -1.4%); not re-measured here.

Next levers (not run): a bigger laneExtra (60-80), revealBoost only for night patches or a smaller boost (1.5),
and the sim chat's oracle pilot to see whether ANY pilot can make care pay in these skies.

Update 2026-10-26 (user, via the Coordinator): laneExtra is DROPPED (storm gaps are already wide; it makes the game too
easy). The careful player above chases contrails instead of weighing storm threats, so the section-6 care results
are not to be cited as a human's. Next round waits for the sim chat's threat-first careful player, with results split
by distance band (0-8k storms / 8-10k no-fly / 10k+ birds) and reveal night-only / x1.5 and thinK; no lane widening.
