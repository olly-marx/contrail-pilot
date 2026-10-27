# The first hour, flight by flight (season 2) — for the user to approve

Status: PROPOSAL (game chat, 2026-10-27), written after the user played 0.13.0 as a new player from Johannesburg. It fixes
their 8 findings (numbered **[U1]-[U8]** below). Nothing in it is built yet: the fixes land in S3 after the user approves.

**One rule for every row: ONE new thing per flight.** Anything not yet introduced is hidden, not just unexplained.

## Decisions for the user
1. **Text:** bubbles become friendly sentences, **at most 15 words and one idea each** [U1]. The lint gate moves from 8 to 15, and I
   re-read every line by eye.
2. **The free upgrade is a must-do** [U3, U6]. After the first landing, the results screen ends with ONE big button, **OPEN THE
   HANGAR**, instead of FLY ON. The hub's TAKE OFF is locked (greyed, with a hint) until the free part is chosen. The "later" link
   goes. (Do you prefer "locked" or just "dimmed"? I recommend locked: you said nothing forced it.)
3. **Animals wait for the NATURE lesson** [U4]: none appear in flight before lesson 2 is done, then the first one comes with a
   bubble.
4. **PixelLab for the tutorial pictures** [U2]: 10 new pictures, see the list and cost at the end. OK to spend **~14 generations**
   (of ~268)?

## The flow

| # | Where | What the player does / sees | NEW this step (one thing) | HIDDEN until later | Where they are led next |
|---|---|---|---|---|---|
| 0a | Start choice (full screen) | picks an area, then a city (e.g. Africa, Johannesburg) | "this is your part of the world" | everything else | how to play |
| 0b | How to play (one card, 3 lines) | **Tap to fly. Fly through the gaps. Land to keep your seeds.** [U2: no hangar or nature lines] | the goal | hangar, nature, trees, animals | flight school |
| 0c | Flight school, **over the START AREA's land** [U7: savanna for Johannesburg, cows/sheep fine] | tap, storm gaps, seeds, day contrail = shade, night contrail = heat, the Earth bar, landing (each a picture card + a short line) | the controls and the climate idea | animals, parcels/soil, tiles | results: "School done! Next: land at an airport." |
| 1 | Flight 1 (lesson L1: land) | storms + seeds, NO icy air at night, no parcels, no animals; "Airport ahead! Fly low to land." | landing a real flight | animals, parcels, night icy air | **results: "First landing! You earned a FREE upgrade." + one button OPEN THE HANGAR** [U3] |
| 1b | Hangar (forced, guided) | a 3-bubble tour: "Pick any FREE part!" → the part flashes → "Tap HOME to fly." | the hangar, spending | NATURE tile | hub: TAKE OFF unlocked; MISSIONS + HANGAR tiles now there [U6] |
| 2 | Flight 2 (L2: fly through icy air in daytime) | day icy air, a "shade" bubble the first time | day contrails cool | animals, parcels | results: "Lesson done! NATURE is open." + button OPEN NATURE |
| 2b | NATURE (guided) | 2 bubbles: "Projects help wild animals come back." → "Look out for them on your flights!" | nature and projects | — | hub |
| 3 | Flight 3 (L3: a night with no contrail) | **animals now appear**, the first one with a bubble ("A meerkat! Nature is waking up here.") [U4]; night icy air | night contrails warm (+ the first animal) | parcels | results → hub: NEXT = L4 |
| 4 | Flight 4 (L4: skip one airport, then land) | the landing bonus x1.5 bubble | the landing bonus | parcels | results: "The world map is open!" → hub: WORLD route choice, a 1-bubble hint "Tap a gold dot to choose your way." |
| 5 | Flight 5 (L5: plant a tree) | soil patches + the DROP button appear for the first time, with a bubble | trees | — | results → MISSIONS: the area's tier 1 list (a MISSIONS-tile hint once) |
| 6+ | free play in the area | tier 1 → 2 → 3 (the ★ crossing trial) | one mechanic per mission | crossings until the gate | — |

**Bubbles in flight** [U5, U8]:
- Every bubble stays **at least 4 s** and goes by itself after 6 s.
- **A tap on the GAME no longer closes it** (S1's "a tap closes it" is what made one vanish "in a microsecond": children tap all the
  time). A tap ON the bubble closes it after 1.5 s.
- A new bubble waits for the current one; it never replaces it.
- No toast is hidden by another bubble (`explain()` used to clear the toast instantly).
- The stray "OK" at the top after landing [U5] is to be found by the walkthrough's screenshots. The usual suspect is a coach or tour
  bubble left open when the scene ends. The rule: the results screen closes every bubble.

## How it's checked (S3 gates, each proven with a planted defect)
- **A browser WALKTHROUGH** plays a fresh **Johannesburg** start through school and flights 1-5, with a screenshot at every row. It
  asserts:
  - the ground is savanna in school and flight 1 (plant: woodland in school → fails);
  - the hangar is reached before flight 2 (plant: no OPEN THE HANGAR button → fails);
  - no animal is drawn before lesson 2 (plant: animals on → fails);
  - no bubble is up for less than 4 s (plant: a tap closes it → fails);
  - nothing is left open on the results screen.
- **The text lint:** ≤ 15 words per bubble, one sentence-ish each.

## PixelLab: the tutorial pictures [U2]
- **Existing:** 18 hand-drawn `assets/ui/lesson-*.png` pictures (tap, storm, seed, day, night, heat, land, plot, bars, bonus, gold,
  crystals, hot, tree-co2, biodiversity, turbulence, no-fly, birds).
- **Proposed:** redraw the **10 the first hour shows**, in the game's pixflux style (64x64, <= 12 colours, flat side-on, no text in
  the picture):
  1. tap (a hand tapping, the plane rising);
  2. storm gap;
  3. seed + landing;
  4. day contrail shading the ground;
  5. night contrail trapping heat;
  6. the Earth bar;
  7. landing on a runway;
  8. the hangar (a plane in a hangar with a FREE tag drawn as a star);
  9. nature (a project with an animal returning);
  10. a soil patch + falling parcel.
- **Cost (measured rates):** 1 generation per picture, 1 test call first, ~30% redos → **~14 generations**. Reviewed on a contact
  sheet before any redo.
