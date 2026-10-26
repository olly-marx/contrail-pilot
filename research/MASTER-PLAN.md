# Contrail Pilot: master mechanics plan, v1 (coordinator, 2026-10-26)

Status: a PLAN for the user to read and amend. Nothing here is built unless marked LIVE. Every number is MEASURED (with
its source) or PROPOSED (a target, to be checked with the simulation engine before building). [OPEN] marks a user decision.
Sources: research/BALANCE-CAPABILITY.md, research/BALANCE-HEAT-TWEAK.md, research/AREA-BALANCE.md,
research/REDESIGN-FACTS.md, ~/cp-fixes/research/BALANCE-TIME-TO-EARN.md, ~/cp-fixes/research/PROPOSAL-12-MISSIONS.md,
research/PROPOSAL-TREES.md, research/PROPOSAL-08/09/10-*.md, research/PLANE-ONBOARDING-PLAN.md, the live flights table.

---------------------------------------------------------------------------------------------------------------------
## Part A. What the game is, and the one rule that holds it together

**Purpose (the user):** learn how contrails work; enjoy upgrading planes through the eras; grow biodiversity, find
balance, invest in real conservation projects and see how life is interconnected.

**Lineage (the user):** Flappy Bird. People want to GO FAR. Distance is the score.

**The rule:** the planet overheating is how the game steers players. You cannot fly far without contrail skill, a good
plane and balanced nature, and you never leave your starting area without them. Every system below either (a) lets you go
further, or (b) shows you why you could not.

**The era ladder is sacred (the user, 2026-10-26).** Each era takes over where the previous one tops out:
| Plane | Reach today (careless -> careful, nothing bought -> fully upgraded), MEASURED, crashes off |
|---|---|
| Comet (1950s) | ~9,000 -> ~10,600 bare; up to ~11,900 fully upgraded |
| 747 (1970s) | ~10,200 -> ~12,100 bare; up to ~16,800 fully upgraded |
| Twin (1990s) | ~12,200 -> ~15,600 bare; up to ~24,100 fully upgraded |
Full nature adds +20-50% on top. Any tuning must keep this staircase (see Part F).
CAVEAT (MEASURED by the sim chat, 2026-10-26): every crashes-off number in this plan is a NEVER-CRASH upper bound. With
crashes on, all three test pilots hit the first storm at ~400 km in 20/20 skies: they were built for heat studies and
don't fly gaps. Crashes-on numbers use the gap-flying 'player' pilot (src/sim/player.js, skill knob s). MEASURED
(Comet bare, crashes on, 40 skies, median km): careful s=0.70 1,348; 0.75 2,496; 0.80 7,975; 1.00 9,610 (vs ~10.6k
never-crash); careless s=0.70 5,932; 0.75 8,250; 1.00 9,407. The curve is very steep around s=0.75-0.80, and below
s~0.85 careless flies FURTHER than careful at the same skill (chasing/dodging icy air means more manoeuvring, so more
crashes); this may be true for children too, and matters for Part F.

---------------------------------------------------------------------------------------------------------------------
## Part B. The world: starter areas and crossings

### B1. Nine areas, at most two biomes each (MEASURED: research/AREA-BALANCE.md)
| Area | Cities | Biomes | Variety (cities seen per 30 legs) | Role |
|---|---|---|---|---|
| North America | 17 | plains + boreal | 12.7 | starter |
| South & Southeast Asia | 14 | monsoon (+Karachi) | 12.6 | starter |
| Africa south of the Sahara | 13 | savanna | 12.2 | starter |
| South America + Patagonia | 15 (+3 new) | rainforest + patagonia | 11.5 | starter |
| Western Europe | 16 | woodland + mediterranean | 10.3 | starter |
| East Asia | 10 | eastasia | 8.5 | starter (thin) or later |
| North Africa & Middle East | 11 | desert + mediterranean | 8.6 | later |
| Nordic & North Atlantic | 8 (+3) | boreal + tundra | 8.0 | later |
| Australia + New Zealand | 12 (+8, incl. Adelaide) | australia + newzealand | 7.9 | later |
Ocean stepping stones (no area): Honolulu, Nadi (+ ideas: Papeete, Apia). [OPEN] a full Polynesia area instead.
14 new airports are needed (8 Aus/NZ, 3 Patagonia, 3 Nordic). Areas below ~10 cities-seen hold a pilot ~25-35% less long;
PROPOSED: they are "later" areas (reached after a crossing, when the pilot already has goals), not starts.

### B2. Inside an area: free flight (as today, confined)
- Take-off: choose one of 3 directions; past each airport the flight carries on the least-turn way. MEASURED: confined to
  any of the 9 areas this never dead-ends; a pilot passes 8-13 different cities in 30 legs.
- Legs stay 1,800-2,600 game km (today). Landing banks seeds (x1.5 per airport skipped, as today). Distance is the score.
- The globe shows only unlocked areas lit; the rest dark with a padlock and "needs: ..." on tap.

### B3. Crossings: how you leave an area (PROPOSED)
Two kinds:
- **Frontier crossings** (land/sea borders inside the Old World: Europe <-> N Africa/ME, ME <-> S Asia, N Africa <-> Africa,
  S Asia <-> E Asia, Europe <-> Nordic). Real distances are short (616-2,300 km), so the length is a GAME number.
- **Ocean crossings** (the chapter bosses): North Atlantic (Lisbon/Reykjavik -> New York), South Atlantic (Lagos -> Belem,
  Cape Town -> Sao Paulo), North Pacific (Anchorage -> Tokyo), Pacific islands (Los Angeles -> Honolulu -> Nadi -> Auckland),
  Indian Ocean (Singapore/Antananarivo -> Perth).

A crossing is ONE dedicated non-stop mission flight (progress bar, no distance meter) to the next area's gateway city.
CURRENT (user direction 2026-10-26; PROPOSAL-10): lengths are GAME numbers climbing by era: 1950s ~6-9k, 1970s ~10-15k,
1990s ~14-20k, 2010s ~18-25k, 2030s ~22-30k; FINAL Auckland-Santiago ~30,000 km; the whole globe open in the 2030s. Each is
to be re-sized from the sim's crashes-on 'player' pilot at s~0.9. Tanker (PROPOSAL-REFUELLING, recommended): a rendezvous
at 50% of the bar; the refuelling gadget adds 33/66% then 25/50/75%; no gadget = no rendezvous; it banks seeds, no heat relief.
SUPERSEDED (kept for the record; too short: the user wants ~30,000 km by the end, and the tiers below topped out at 17k.
Do not cite these lengths; the idea of tiers tied to eras still stands):
| Tier | Example | Crossing length (game km) | Who can make it (careful pilot, crashes off, measured reach) |
|---|---|---|---|
| 1 frontier | Europe -> N Africa & ME | 7,000 | Comet with some upgrades + nature (reach 10.6-11.9k bare-full) |
| 2 frontier/short ocean | N Africa -> Africa; Europe -> Nordic | 9,000 | upgraded Comet + good nature, or a 747 |
| 3 ocean | North Atlantic, South Atlantic | 11,000 | 747 (12.1k bare); a Comet only with full upgrades + full nature |
| 4 long ocean | Pacific, Indian Ocean | 14,000 | upgraded 747 + nature, or a twin |
| 5 Pacific islands | Honolulu -> Auckland | 17,000 | upgraded twin + nature |
Why these numbers: crash-free reach is an upper bound; MEASURED real players reach 3,800-7,500 km (top 10%) in flights 1-20
and ~9,900 by flights 21-50. So tier 1 (7,000) is a real achievement around flights 25-50, and tier 3 (11,000) needs the
747 era AND skill, which matches history (jet transatlantic service began 1958, the wide-body 747 in 1970).
[OPEN] The exact numbers come from the engine: tier length = the careful pilot's median reach with the tier's expected
plane + nature, minus a margin so ~30-50% of careful attempts succeed.

### B4. When a crossing is OFFERED (PROPOSED)
All three, so every one of the user's three goals is required:
1. **Plane + nature can make it:** the capability estimate (Part E) >= the crossing length.
2. **Nature:** this area's biodiversity >= 30 (balanced: at least 2 projects and 3 tree kinds).
3. **Contrail skill:** this area's contrail missions done (e.g. a clean night, a shade day, a forecast flight).
[OPEN] all three, or any two of three (the game chat suggested 2 of 3 so children can get there different ways).
When offered: a card in the hangar and on the FLY screen ("You're ready to cross the Atlantic: Lisbon -> New York,
11,000 km non-stop"). Attempting it is a choice; failing costs only that flight's seeds (crystals kept, as today); retry
any time. Landing it: a big "new continent" moment (the era-card style), the next area lights up, its first mission opens.

---------------------------------------------------------------------------------------------------------------------
## Part C. Progression timeline (a careful player; MEASURED where marked, else PROPOSED)

Measured clocks (perfect bot, income.cjs, 4 seeds): eras open after 20 / 77 / 181 min of flying = flights 17 / 63 / 148;
the whole current upgrade ladder is bought by ~5-5.5 h (245-270 flights); seeds banked: ~680 at 20 min, ~2,200 at 77 min,
~5,200 at 181 min, 9-10k unspent at the end; seeds per flight (flying + prizes) median 74 / 59 / 62 / 66 by era (1950s
mean 88: 40 of it one-off prizes). Real players fly shorter flights, so their clock runs slower in flights but similar in
minutes (eras open by flying TIME).

| Stage | Flights (careful player) | Time | Plane | What happens | Distance that matters |
|---|---|---|---|---|---|
| 0 Onboarding (chapter 1) | 1-4 | ~5 min | Comet bare | one new thing per flight; fence; hangar after 1, nature after 2, routes + name after 3, boards after 4 | land at the next airport (1,800-2,600) |
| 1 Home area | 5-30 | 5-35 min | Comet, first upgrades | area missions (lessons -> challenges), first projects, first native trees | 2-6k; best flights meet the heat |
| 2 Ready for tier 1 | ~25-50 | 30-60 min | Comet + nature | biodiversity 30, contrail missions done, capability >= 7,000 | crossing 7,000 |
| 3 Second area | 40-70 | 50-80 min | Comet -> 747 opens at 77 min | new biomes, new trees, new missions; the 747 arrives | 6-10k |
| 4 Ocean ready | ~70-120 | 80-130 min | 747 + upgrades | both areas' nature balanced; capability >= 11,000 | crossing 11,000 |
| 5 New continent | 100-160 | 2-3 h | 747 -> twin at 181 min | a new continent and its biomes | 10-16k |
| 6 Long oceans | 150-260 | 3-5 h | twin + upgrades | Pacific / Indian Ocean (14,000), islands (17,000) | 14-24k |
| 7 Late game | 250+ | 5 h+ | twin full, eras 4-6 (PROPOSAL-10) | world tour, rare animals, boards | 20k+ |
**PROGRESSION SIM v1 RESULTS (research/PROGRESSION-SIM.md, MEASURED, 3 skies x 150 flights, crashes on, no areas yet).** CAVEAT (2026-10-26): these were measured with an engine bug (saves leaking visited cities/unclaimed prizes between simulated players in one process; fixed in 0.11.8; the game itself was never affected). Being re-run; expect small changes to prizes/badges and possibly the crossing timings. Re-run done (8254969): conclusions hold; best early fit careless s=0.70 (flights 1-5), careful s=0.72 (6-10):
- Eras open at 20 and 77 min of flying for every kind of player (the 747 at flights 27-48): the era clock works.
- Real-like players (skill s~0.70-0.75, fitted to the live table without the user) get NO crossing in 150 flights. A
  learning careful player (s 0.72 -> 0.88) gets tier 1 at flights 126 and 135 in 2 of 3 skies and NOT by flight 150 in
  the third (home biodiversity 27) [CORRECTED after the leak fix; the first run said 'flights 127-142 in all 3 skies':
  too optimistic, do not cite it], ~3x LATER than the table above,
  then tiers 2-4 in a burst of 5-20 flights. => the timeline above is too optimistic, and tiers 2-4 are too close together.
- The binding gate is NATURE (home biodiversity >= 30), not capability: never-crash capability is 16-24k for everyone by
  flight 150, far above every tier. Without areas the player wanders between lands and spreads nature thin; confining
  flights to an area may fix much of this (next sim version).
- Real players barely improve over 50 flights (median 3.2k -> 4.0k; only the top 10% grows, 7.5k -> 9.9k) and land only
  ~21%. The sim fits flights 21-50 poorly (next: a per-player "fly on" tendency).
- Crystals are the bottleneck (0-15 most of the run), confirming Part D.
- At the same skill, careless flies FURTHER than careful below s~0.85 (more manoeuvring, more crashes): rewarding
  contrail skill can push beginners into crashing. Part F must be judged with crashes ON.
IMPLICATIONS (PROPOSED, to re-measure with areas): (1) the capability shown in the hangar must be the CRASHES-ON estimate
(gap-flying player at a typical skill), not the never-crash ~20k, which would mislead a child who crashes at 3-5k; or
labelled "if you fly perfectly". (2) Tier lengths should be set from crashes-on reach, spaced so tiers don't come in a burst.
(3) The nature gate (biodiversity 30) may be too slow, or nature too thin when spread over lands: re-check with areas.
Pacing rule (PROPOSED): roughly one new area per hour of play early, slowing to one per 1.5-2 h, so each area holds a pilot
"an interesting time" (user). The engine + income model will check every row before building (Part I).

---------------------------------------------------------------------------------------------------------------------
## Part D. Money: seeds and crystals

- **Seeds:** from flying (sky seeds, banked only on landing; x1.5 per airport skipped) and prizes (missions, badges, city
  firsts). Spent on plane levels and habitat projects.
- **Crystals:** always kept (even on a crash): night dodging (+1 per icy air avoided at night, max 3 a night), a clean
  night (+2), prizes. Every upgrade costs at least 1 crystal (price/8).
- MEASURED (bug-fix chat, income.cjs with crystals logged): CRYSTALS are the binding currency: the crystal bank sits at
  0-11 all game while seeds pile up to ~9,200. Crystals earned per flight: ~2-3 (1950s), ~3 (1970s/90s), ~4 (2010s);
  eras 2-3 get almost none from prizes. Confirmed independently by the progression sim (0-15 most of the run).
  That is GOOD for the purpose: crystals come from night contrail skill, so contrail skill gates upgrades.
- PROPOSED (PROPOSAL-09): a crystal exchange 10 seeds : 1 crystal? [OPEN: it would weaken the skill gate above; suggest
  the reverse only (crystals -> seeds) or none]. A nature dividend: +2% landing seeds per finished project in this area, up
  to +20%. Each area's missions pay about half of that stage's price list (PROPOSAL-12's lever).
- City prizes become the "land at every city in <area>" mission.

---------------------------------------------------------------------------------------------------------------------
## Part E. Capability: the engine's job in the game

- LIVE (0.11.7): the whole flight runs in plain JavaScript, bit-identical to the game, ~0.45 s per flight on this
  machine (src/sim/simulate.js: simulate(), capability()).
- In the game: capability(save) = the careful pilot's median reach with your plane + this area's nature, over a few seeded
  skies. MEASURED (desktop): 5-12 us per step; one Comet flight ~32 ms, a full 747 66-103 ms; a 3-flight estimate ~322 ms,
  so ~1.3-2.6 s on a phone (a guess: 4-8x slower; to measure on a real phone). So NOT inline: run it in a Web Worker
  when the hangar opens, cached per save (capabilityLater() runs a few ms per frame, identical result), or use a table
  precomputed by the engine at build time (plane level x nature level). Bigger time steps are NOT a shortcut (MEASURED:
  medians moved up to 11% at 33/50 ms).
- Shown in the hangar as a bar: "Your plane + nature can reach ~9,400 km. Atlantic crossing: 11,000." Every upgrade and
  project shows "+600 km" before you buy it. This makes the link between nature, planes and distance visible.

---------------------------------------------------------------------------------------------------------------------
## Part F. Heat: making the planet bite early, without breaking the ladder [OPEN, measuring]

- MEASURED: early real flights end by crashing (median 2-5k) before heat (~9k careless Comet). Heat matters from ~50 flights.
- MEASURED: the lever that separates careless from careful is NIGHT contrail heat; lowering the danger line hurts both
  alike (wrong lever). Raising night heat flattens the era ladder (later planes' contrail margins take it hardest).
- The user (2026-10-26): today's ladder is right; a slight tweak towards overheating only. New engine study (running): the
  gentlest change that widens the careless/careful gap WITHIN each era while keeping each era above the last and missions
  (1,800-5,200 km) safe. "No change" is an allowed outcome.
- RESULT (plane build, Node engine, 15 skies, crashes off; careless/careful, bare planes):
  | | Comet | 747 | Twin |
  |---|---|---|---|
  | today | 9,318 / 10,618 (gap 14%) | 8,759 / 11,927 (36%) | 12,275 / 14,844 |
  | RECOMMENDED: day shade 1.2 (from 0.66) + night ramp 0.93->2.5 by 8,000 km, scaled x1 Comet, x0.3 747, x0 twin | 8,540 / 10,652 (25%) | 8,687 / 12,562 (45%) | 13,040 / 16,737 |
  Why day shade: the Comet's hot exhaust rarely makes contrails, so careful Comet pilots differ mainly by seeking DAY
  shade. The careful ladder holds (10.7k < 12.6k < 16.7k); a careless beginner still reaches ~8,500 (missions safe).
  Note: today a bare 747 flown carelessly already goes LESS far than a bare Comet flown carelessly. [OPEN] ship this
  or keep today ("no change" is defensible). Needs a small code change (a per-plane night factor + the ramp in rules.js).
- **CRASHES-ON VERDICT (plane build, Node, 20 skies, player pilot s 0.72/0.80/0.90, 2026-10-26):**
  (a) Below s~0.9, CRASHES decide almost everything; heat changes only the share of flights ending by overheating.
  (b) Careful contrail flying costs beginners heavily: at s 0.72 careful pilots crash at ~2,000-2,800 km vs careless
  ~8,200, in EVERY plane. => a core design tension: the lesson (care about contrails) currently makes children crash.
  (c) The heat recommendation should NOT ship: it never raises careful medians and hurts careless Comet beginners
  (overheat endings 10% -> 35% at s 0.72). Verdict: NO CHANGE to heat. If careful flying should pay, the lever is obstacle
  difficulty / steering cost (e.g. icy air placed so seeking/avoiding it doesn't force risky climbs through gaps), not heat.
  (d) The era-step CO2 multipliers (747 x0.85, twin x0.6) are SAFE: they never hurt anyone measured and lift the 747 at
  s 0.9 (careful 10,013 -> 10,861). Ready to ship if the user wants clear steps.
- **USER DESIGN TARGET (2026-10-26): skill is a spectrum of TWO things, dodging and contrail care.** Perfect dodging with
  no contrail care must be punished by OVERHEATING; contrail care with mediocre dodging must CRASH; the best result sits at
  high dodging AND high care; unskilled players fail at both. MEASURED today (SKILL-CROSSOVER.md): barrier-only is best at
  every skill; heat limits only the Comet at high skill; care at best ties from s~0.85. Work: a two-knob pilot (sim chat),
  then a tuning grid (plane build: BALANCE-TWO-SKILLS.md) with pass criteria (optimum at high/high; barrier-only perfect
  >= 25-30% short; contrail-first mediocre crashes early; era ladder; missions), then the progression comparison.
  REFINED (user): the two limits must BALANCE IN DISTANCE: D_crash(s) (dodging) and D_heat(c) (contrail care) on the same
  scale, so distance ~= min(D_crash(s), D_heat(c)); matched skills give matched limits. Tune D_heat(c) to line up with
  D_crash(s) per plane; report the km mismatch at each level, before and after.
  MEASURED: D_heat(c) is flat today (heat is mostly CO2: a plane property); lining up needs care worth ~x1.8, the best
  of 60 settings reached x1.45. Next: shift the heat budget from CO2 to contrails, keeping c=0.5 fixed (also more faithful
  to the science: contrail warming estimated above aviation CO2's, Lee et al. 2021, to verify). USER CONSTRAINTS: (1) care
  must be UPGRADABLE AWAY (forecast/ATC/autopilot/sensors/cleaner engines/SAF shrink the care gap); (2) newer planes must
  NOT get harder (the efficiency trap must not compound; the era ladder holds).
  DECISION (user, 2026-10-26): KEEP the efficiency trap (newer planes make more contrails: the science) and make icy air
  EASIER TO AVOID in all eras by its SHAPE and PLACEMENT (thin bands, a clear lane near gaps, earlier reveal), so careful
  flying stops causing crashes. Basis: ISSRs are mostly thin layers; small altitude changes avoid most contrail forcing
  (Teoh et al. 2020, to verify). Sim chat: switchable spawn-rule variants; plane build: measures them (BALANCE-TWO-SKILLS s6).
  Science notes (verified by plane build): Lee et al. 2021 contrail-cirrus ERF 57.4 vs CO2 34.3 mW/m2; Burkhardt et al.
  2018: 80% fewer ice crystals -> ~50% less forcing; Voigt et al. 2021: low-aromatic SAF 50-70% fewer soot/ice crystals;
  CAUTION: the lean-burn combustor does NOT reduce ice crystals (its card must not claim it).
  USER FEEDBACK (2026-10-26): NO wider storm lanes (too easy; gaps are already very wide). An expert could fly forever
  through storms alone; real crashes come in the NO-FLY (from 8k) and BIRD (from 10k) regimes, so results must be split by
  distance band. The simulated careful pilot was unrealistic (chased contrails, ignored storm threats): a THREAT-FIRST
  careful mode (survival first, contrail moves only with spare margin) becomes the default for balance work.
  DONE (sim chat): plan:'threat' is the new default player: at s>=0.9 ZERO storm crashes before 8k; crashes come from no-fly
  (8-10k) and birds (10k+), matching the user; medians 12.3-13.5k (old ~10.3k). The careful crashes were from contrail
  heights at the EDGE of the safe band (late taps clip clouds), not greed; a risk budget fixes it (s 0.72 care 1: 2,488 ->
  8,435 km). SUPERSEDED: every crashes-on result in this plan measured with the OLD player (SKILL-CROSSOVER, the crashes-on
  verdict above, BALANCE-TWO-SKILLS s5-6, PROGRESSION-SIM) may flip; the skill scale also changed (re-calibration running).
  Do not cite those numbers until re-run.

---------------------------------------------------------------------------------------------------------------------
## Part G. Nature: projects, trees, animals

- **Biodiversity per area** (0-100): trees ~40, projects ~60. Native tree kind 6 x sqrt(n) up to 18; plantation tree
  2 x sqrt(n) up to 6; both full at 9 planted (cumulative over flights). Variety beats quantity.
- **Projects:** 8-11 real, sourced projects per area (99 researched + 33 for the new regions), in tiers that open at
  biodiversity thresholds; each brings back named animals (knock-on chains) and adds land cooling during flights.
- **Trees (PROPOSAL-TREES.md, direction approved):** each area's 5 trees open by that area's nature (plantation tree free;
  native 1 = first project; 2 = biodiversity 20; 3 = 5 animals found; 4 = an area mission). The hangar keeps only planting
  tools (parcels, soil, nursery). One visibility rule: you see the trees YOU planted, in flight and in the wild area. Visible
  counts: "Oak 4/9" in Nature; "kinds this flight 3/5" by the forest meter.
- **Cooling** (per flight, MEASURED from the code): trees planted this flight cool as they grow; the old-wood boost (from
  10,000 km) and the forest store both scale with the number of KINDS planted this flight. That is why nature = distance.
- **Animals:** appear below you by the area's biodiversity and rarity; found animals fill the wild area. PixelLab art for
  189 animals is LIVE; new regions need ~69 animals + 15 trees (~290 generations; 263 left; see the art budget, Part K).
- **Web of life** (PROPOSED): Nature shows each project linked to the animals it brings back and what depends on them.

---------------------------------------------------------------------------------------------------------------------
## Part H. Missions

- **Lessons** = chapter 1 (onboarding flights 1-4) and one lesson per new mechanic as it opens.
- **Area missions** = templates filled per area (cities, projects, species, biomes): land at every city in <area>; fund
  <project> and see <animal> return; plant 3 kinds of <area> tree in one flight; a clean night over <biome>; make 10 shade
  on a day flight; fly past an airport and land at the next; reach <distance> in one flight; a forecast flight (era 2+).
- **Challenges:** three offered, pick one (replaces the planned flight jobs).
- **Firsts:** funny one-off cards + 1 crystal ("Birds 1, plane 0").
- Prizes are the main early income lever: each area's missions pay about half that stage's price list.
- MEASURED bug fixed (0.11.3): mission 8 asked for retired upgrade lines and blocked missions 9-13.

---------------------------------------------------------------------------------------------------------------------
## Part I. How we verify the plan before building (the engine)

1. Capability grid: every era plane x upgrade level x nature level x pilot, 15+ seeds (seconds now).
2. Income + crystals per flight by stage (income.cjs; crystals logged).
3. A progression simulator (PROPOSED, sim chat): a scripted careful player that flies, banks, buys cheapest-useful, funds
   projects, plants, attempts crossings when offered; outputs the Part C timeline (flights, minutes, seeds, crystals, areas
   unlocked) per starting area. This is what checks "every area holds a pilot an interesting time".
4. Real-player data after rollout (the flights table) compared with the simulator.

---------------------------------------------------------------------------------------------------------------------
## Part J. Restart and rollout

- Everyone restarts from scratch (the user). [OPEN] badges, records and online boards: a new season (wipe) or kept as
  all-time.
- Staged rollout (PROPOSED): (1) engine + capability + tuning (no visible change); (2) trees rework + visible counts;
  (3) areas + confined network + crossings + new airports; (4) onboarding chapter 1 + start choice; (5) area missions;
  (6) the restart (one big release with a "new world" card).

---------------------------------------------------------------------------------------------------------------------
## Part L. User direction added 2026-10-26 (to fold into the parts above)
- **Clear era steps:** a brand-new plane flown CARELESSLY should at least match the previous era's plane flown CAREFULLY.
  Today the 747 careless barely beats the Comet careless; the twin careless already beats the 747 careful. Tune with each
  plane's starting multipliers (base CO2 etc.), not the climate (plane build, engine study).
- **Whole globe by era 5:** crossings are scheduled to eras (tiers aligned with each era's reach); the final areas sit
  behind really hard, long missions, so players are very good by then (eras 4-6: PROPOSAL-10).
- **In-flight refuelling (new mechanic):** on long mission/crossing flights with no airports, call a tanker; a plane flies
  alongside for a stretch and banks the seeds collected so far, so a later crash keeps them (PROPOSAL-REFUELLING.md).
- **Impossible obstacles are kept on purpose:** some gaps need a bottom-to-top climb that is possible only with
  frame-perfect taps from the previous gap, or not at all. They create the need for the autopilot and for forecast/research
  hints. The engine's perfect-tapper study will count them per 10,000 km and the warning time each would need.
- RESULTS (plane build, 2026-10-26, Node, 15 skies, crashes off): research/BALANCE-ERA-STEPS.md: starting CO2 Comet x1.1
  (unchanged), 747 x0.85 (from 1.0), twin x0.6 (from 0.8) gives 747 careless 11,505 >= Comet careful 10,618 and twin careless
  16,051 >= 747 careful 14,510, keeping within-era growth (747 full careful 21,479). 747 x0.9 just misses. Crashes-on check
  pending. PROPOSAL-10 'crossings by era': 1950s frontier hops; 1970s North Atlantic + Caribbean; 1990s South Atlantic +
  North Pacific + Singapore-Perth; 2010s Pacific islands + Indian Ocean; 2030s Oceania, whole globe by its end, final hard
  mission Auckland-Santiago (9,653 real km); far future = global missions. PROPOSAL-REFUELLING.md: CALL TANKER on crossing
  flights (10+ seeds, 1,500 km since start/last bank), hold formation under the tanker a few seconds with hazards on; success
  banks the seeds, failure loses nothing; gadget line by era (probe-and-drogue 1950s, boom 1970s...); no heat relief.
- **USER DIRECTION (2026-10-26, supersedes the tier table in B3 and the refuelling trigger above):** crossing lengths are
  arbitrary GAME numbers climbing with the eras; by the 2030s players fly ~30,000 km and the FINAL challenge is ~30,000 km,
  genuinely hard. Missions show NO distance meter, only a progress bar at the top (boss level); the player balances Earth
  heating and obstacle skill. The tanker exists only on missions, is not free or on demand, and is not triggered by an
  absolute distance (suggested: one rendezvous per mission flight at a fixed point of the progress bar, e.g. 50%; higher
  refuelling-gadget levels add a second; alternatives: pick-up, % of flight, one per flight). Plane build reworking
  PROPOSAL-10 and PROPOSAL-REFUELLING.
- **STORY FROM ANY START (research/STORY-ANY-START.md, game chat, node model):** with PROPOSAL-10's tiers every start
  reaches the whole globe by the 2030s, but Africa and Australia+NZ had NO exit until the 1990s and the boss came at chapter
  9-13. Fix: one 1950s frontier partner per area (+5 hops: Warsaw-Stockholm, Khartoum-Addis Ababa, Hanoi-Hong Kong,
  Jakarta-Darwin, Mexico City-Panama); Mediterranean, Mumbai-Dubai and the Silk Road in the 1970s; Indian Ocean in the
  1990s. FINAL RULE: the South Pacific bridge Auckland-Santiago (either direction), offered only when every other area is
  open, so it closes the circle from any start. Result: every start gets 0-1 waits and the boss at chapter 9-10; the same
  beats in the same order (frontier 1950s, ocean 1970s, long ocean as a 1990s story mission, boss 2030s). Counts chapters,
  not minutes; timing needs the progression sim with areas.
- **Simulation taps:** every simulated pilot drives the game only by taps through the same flap physics (to confirm in
  SIM-ENGINE.md).

---------------------------------------------------------------------------------------------------------------------
## Part K. Open decisions for the user (running list)
1. Heat tweak (after the engine study; "no change" allowed).
2. Crossing offer rule: all three conditions, or two of three.
3. Crossing lengths per tier (engine will propose exact values).
4. Restart scope: badges/records/boards.
5. Honolulu/Nadi: island runway (recommended) or land; Polynesia as an area or stepping stones.
6. Crystal exchange direction (seeds -> crystals would weaken the skill gate).
7. PixelLab budget (263 left): new-region animals (~290 needed) vs plane art vs tutorial art; options in
   research/PIXELLAB-BUDGET-NEW-REGIONS.md.
8. Proposals waiting: kiosk (18), boards (13), hazards (14), knowledge base (15), motion (8), money (9), eras 4-6 (10).
