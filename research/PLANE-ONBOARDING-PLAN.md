# Onboarding plan: one new thing at a time (DRAFT for the user, 2026-10-25, plane build)

User brief (via the coordinator): the game has got complicated; hide half of it until it is unlocked;
one new thing per flight; start inside one biome with one goal; a gentle RESTRICTED AIRSPACE try-again
(keeps seeds) if you fly past the target in the early flights; balance learning and playing; a longer
hands-off breather while learning (~1 s in normal flights). Flow matters more than looks.
Status: DRAFT. Built UNPUSHED in its own worktree, testable with ?newplayer=1, after this plan.

## 1. What a new player gets today (measured 2026-10-24, live 0.11.0, bot reading at ~2.5 words/s)
| Part | Time | Learning (frozen) | Playing | Notes |
|---|---|---|---|---|
| "How to play" card | ~10 s | all | 0 | before Flight School |
| Flight School (London to Paris) | ~137 s | ~92 s (67%) | ~45 s | 17 steps: 7 lesson cards with diagrams + 3 tap cards. Two runs of back-to-back freezes: seeds + day icy air (26 s frozen in a row); Earth bar + landing (31 s in a row) |
| Name tour, right after school | 10 steps | all | 0 | PILOT, name, word, SAVE, BOARDS, FLY: before any real flight |
| Flight 1 | NOT MEASURED YET | | | From the code: an "x-bars" lesson at lift-off; toasts for the first seed, the airport, the first contrail; a turbulence LESSON card at 2,000 km (since 0.10.3 that is inside flight 1); the crystals lesson; "fly past an airport" lesson if they do |
| After flight 1 | 7 steps | all | 0 | hangar tour (FREE upgrade, (i), NATURE) |
| All 5 tabs | visible from the start | | | FLY, HANGAR, NATURE, PILOT, BOARDS |
Measured flights (2026-10-25, live 0.11.2, same bot; the bot is invincible except at landings and missed the
runway on flights 1, 2 and 4, so those ended at ~1,560 km: their pop-up COUNTS are valid, their lengths are not):
| Part | Frozen pop-ups | Toasts | Notes |
|---|---|---|---|
| Flight School | 10 cards, 97 s frozen of 139 s (70%) | 3 | seeds, day icy air, night icy air, Earth bar, landing all inside school |
| Menus after school + flight 1 | | | 126 s of tours and menus before flight 2 (name tour 10 steps, hangar tour 7 steps) |
| Flights 1, 2 (to ~1,560 km) | 0 | "Night is coming!" | the x-bars lesson never got a clear moment |
| Flight 3 (fly on, ~20,600 km) | 6 cards, ~70 s frozen: passed-an-airport (2,051 km), TURBULENCE (2,651), ICE CRYSTALS (4,835), GOLDEN seed (5,057), NO-FLY zone (8,251), BIRDS (10,001) | Sunrise x3, bare land, overheating | a new hazard card every ~2-3 min of flying |
Breather after every pop-up today: GRACE_MS = 1,500 ms (the plane flies itself, then hands back; first tap ends it).
The per-flight numbers for flights 1-4 still need the one-browser measurement (the bot now gets through
school; it tripped on the first real take-off, fixed, rerun pending a quiet slot).

## 2. Proposed flow
Start city: AMSTERDAM (Temperate woodland), first legs AMSTERDAM > BERLIN > MOSCOW, all woodland
(computed: regionBelow stays 'woodland' for both legs). Woodland is also where your own trees (spruce,
birch, oak...) grow, so the tree lessons match the land. Flight School stays a separate guided flight.

| Flight | Goal | New this flight (ONE thing) | Hidden until later | Fence | Breather |
|---|---|---|---|---|---|
| School | Land at the runway | Tap, storm gap, landing (3 lessons, was 7) | everything else | n/a | 3.0 s |
| 1 | Land at BERLIN | Seeds: grab them, keep them only if you land | HANGAR, NATURE, PILOT, BOARDS tabs; route choice; icy air; turbulence, birds, no-fly | past Berlin: "Restricted airspace! You were cleared to land in Berlin. Try again" - keeps seeds, counts as not landed | 3.0 s |
| after 1 | | HANGAR opens: short tour, ONE free upgrade | | | |
| 2 | Land at MOSCOW | Contrails by day: icy air makes a contrail, shade cools (the Earth bar) | NATURE, PILOT, BOARDS; route choice; night icy air; turbulence+ | past Moscow | 3.0 s |
| after 2 | | NATURE opens: your land's meter, plant trees, projects | | | |
| 3 | Land at the next airport | Night contrails: dodge icy air at night, ice crystals | PILOT, BOARDS; turbulence from this flight | past the target | 2.0 s |
| after 3 | | ROUTES: the globe and the 3 ways open on FLY; PILOT: choose your name | | | |
| 4 | Your choice of route | Fly past an airport for the landing bonus (the fence comes OFF) | BOARDS | OFF from here | 1.0 s |
| after 4 | | BOARDS open | | | |
| 5+ | Normal game | hazards at their usual distances, eras, missions | nothing | off | 1.0 s |

Rules:
- A hidden tab is not shown at all (not greyed). Each reveal: one short "tap here" walk-through (the tour code).
- One pop-up at a time, never two freezes back to back: a lesson waits until ~5 s of free flying has passed.
- Things already taught are never taught again (seenTips, as today).
- Breather: 3.0 s in school and flights 1-2 (a new player needs to find the plane again after reading;
  the 1.5 s today is often over before their eyes are back on it), 2.0 s in flight 3, 1.0 s from flight 4
  (user: "like a second"). The autopilot PICK-UP (8 s) is unchanged: it only exists once the Autopilot gadget
  is bought (0.10.3), long after onboarding.
- Returning players (tutorialDone, or any flights > 0) skip all of this: everything stays open.
- Online: no pilot name until flight 3 means nothing is uploaded until then (flights wait in the outbox, which
  only sends with a pilot: the bug-fix chat's 0.11.0 outbox). TO CHECK with the bug-fix chat.

## 3. Decisions for the user
1. Cut Flight School to 3 lessons and move seeds / day contrails / night contrails into flights 1-3? (proposed: yes)
2. Start in Amsterdam (woodland)? Alternatives in one biome: Dubai (desert), Vancouver (boreal), Manaus (rainforest).
3. The fence wording, and whether a fenced flight counts toward flying time for eras (proposed: yes, it was flown).
4. Breather 3.0 / 2.0 / 1.0 s.

## 4. Still to measure (one browser, quiet slot)
Flights 1-4 today: time to first pop-up, frozen seconds per flight, seconds of free flying between pop-ups.
