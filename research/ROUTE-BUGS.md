# Two routing bugs from play (2026-11-02): findings and proposals

**Status:** read-only desk analysis (no runs). Nothing here is built. It waits for a GO from the Coordinator.

## Bug 1: the stale route header after a crash

**Cause (code, `src/sim/rules.js`):**
- When the plane passes an airport, the rules set
  `this.missedSign = { text: \`Passed ${na.name}. Next: ${this.nextAirport.name}\`, until: this.gameTime + 4000 }`
  (rules.js:267).
- The HUD shows it while `this.gameTime < this.missedSign.until` (GameScene.js:1482), whenever no closer airport call applies.
- `initFlight()` resets about 84 per-flight fields, including `this.gameTime = 0`, but **not** `missedSign`. The engine object is reused between flights.

**The mechanism:**
- A flight passes Paris at gameTime ≈ 95 s, so `until` ≈ 99 s.
- It crashes before Berlin.
- The next flight starts with gameTime 0. For its first ~99 s, every frame without a nearer airport call shows **"Passed Paris. Next: Berlin"**, while the plane is flying from London toward Lisbon.
- That is exactly the user's report: a crash between two airports, then the old leg on the next flight.

**Variants.** All three share the cause:
- (a) crash, then retry;
- (b) crash, then choose a different first hop or destination;
- (c) crash during a mission leg.

Each leaves `missedSign` from the dead flight, because nothing on the new flight clears it. A **landed** flight can leak it too, if the next flight starts before the old `until` (it is in game ms, not wall time).

**Fix:**
- `this.missedSign = null;` in `initFlight()`.
- **The single source of truth for "where this flight is going"** is the engine's live leg: `this.nextAirport` (and `this.path`) of the CURRENT flight. A sign is only a transient message about that leg.
- Belt and braces: the HUD shows a sign only if its target is still `this.nextAirport` (store `to: this.nextAirport.name` in the sign and compare).
- This changes rules.js, so it needs the sim chat's sign-off. sim-equiv should be identical: the field is display-only and draws no random numbers.

**The gate (a class check, not just this field), as a Node test `flightreset`:**
- Statically list every `this.<field> =` in rules.js.
- Every field set outside `initFlight()` must be reset in `initFlight()`, OR appear in a **declared** allowlist `PERSIST` with a one-line reason each (e.g. `bank: set at take-off`).
- A behavioural half:
  1. Create a world.
  2. Fly past an airport (sign set).
  3. Crash.
  4. Run `initFlight()`.
  5. Assert `missedSign == null`, and that the HUD text the GameScene would choose names only the new leg.
- **Plant:** remove `this.missedSign = null` from `initFlight()`. Both halves FAIL.
- The scan today finds **27** fields set elsewhere and never reset in `initFlight()`:
  `airborne autoFrom autoUntil bank bioStart bioStartAll endReason flaps flaring flySeconds graceUntil hazardSeen isDay landed landedAt landingSpeed missedSign nextPowerAt ownKit rays result rollSpeed safOffered safUntil saidNoSoil warmStorms warmTime`
- Most are probably set at take-off (to classify). **Suspects of the same kind:**
  - `nextPowerAt` (set with `??=`, so a later flight may keep the old distance and get no early power-ups);
  - `autoUntil`, `safUntil`, `warmTime` (time-based, like `missedSign`).
- Each needs a verdict when the gate is built. **Unverified until then**: do not cite them as bugs yet.

## Bug 2: missions the route never reaches

**(a) How the next destination and leg order are chosen (src/route.js):**
1. **The network:** season 2 flies only the unlocked areas' cities (`linksFor` → `linksOf(citiesOf(unlockedAreas))`). Each city links to its nearest neighbours (≤ 2,600 km) plus declared bridges.
2. **The start:** `save.city` (moved ONLY by a landing; a crash leaves it).
3. **The first hop:** `save.heading` if it is one of the start's neighbours, else the FIRST neighbour in `choices()` order. The player can pick it only once the world-map choice is revealed (after L4).
4. **After that, it's a greedy tour (`tourPath`), fixed for the whole flight:**
   - at each city, go to the unseen neighbour that turns least, with a bonus for neighbours that have few unseen neighbours left (Warnsdorff's rule);
   - with no unseen neighbour, step toward the nearest unseen city;
   - when everything is seen, start again.
   - **Nothing in this looks at the mission.**
5. **In flight,** the player lands at the first airport they don't fly past (`airportsSkipped` counts the passes). So "land at X" means: X is somewhere on this flight's tour, and the player has the fuel, the skill and the capability to pass every airport before it.

**(b) Ways a mission target can be out of reach:**
1. **Tour order:** X is a valid city of the area but comes late in the greedy tour (6-10 legs). It is effectively unreachable for a beginner. This is the user's "fly to Berlin but the route never goes there".
2. **No steering before L4:** the first hop is forced to `choices()[0]`, so the whole tour is fixed. After L4 the player picks only the FIRST hop, not the order after it.
3. **The tour moves with the player:** each landing restarts the tour from the new city, so X can be 2 legs away on one flight and 7 on the next. Hence "random, nonsensical".
4. **Chain (`Land at A, then B`):** B must be early on the tour from A, which is never checked. `route` ("Fly to C without stopping") makes C the LAST of `others`, so it is often far by design.
5. **Area mismatch:** missions are filled from the area's own cities (`fillFor`), but a player in another unlocked area flies from there. The target is in a different part of a larger network.
6. **Home cases (the 0.19.x family):** a route that loops home first; the home runway is landable only when reached on the route (fixed in 0.19.2). Missions exclude the home city as a target, which is fine.
7. **Area network shape:** Aotearoa & Polynesia is a long line through Auckland. From a South Island city, Papeete is 7+ legs away in either order.

**(c) What a city mission should guarantee:**
- When a mission asking to land at city X is offered, X must be **on the route the player will fly next**, within a declared number of legs `MAX_LEGS` (proposal: **3**, matching the lessons' leg lengths), from the player's CURRENT city, in the CURRENT network.
- If no route can do that, the mission is not offered (another is filled in its place).
- For a chain: B within MAX_LEGS of A.

**(d) The fix:**
- **Make the route aim at the mission. My recommendation:** when a visible city mission targets X, and X is not the current city:
  - the flight's path = the shortest path (fewest airports, BFS: `toward()` already does this) from here to X, then the normal tour after X;
  - the player sees the order on the hub: `London ▶ Paris ▶ Berlin (mission)`.
  - This fixes both the unreachable target and the "random" feel: the route has a visible reason.
- **Alternative (no route change):** fill city missions only with cities among the first MAX_LEGS of the current path. Cheaper, but the target would shift as the player moves, which is its own confusion. I don't recommend it.
- The hub shows the next 2-3 stops, not just one hop, so the order is never a surprise.
- This changes `flightPath` (rules-shared). It needs the sim chat's sign-off: the paths change for anyone with a city mission, so this is a progression change, not identity.

**The declared reachability gate (a new Node test, `missionreach`):**
- For every season-2 starter area, every start city in it, and every stage/tier that fills city missions:
  1. Build the save.
  2. Fill the missions (`fillFor`).
  3. For each city target, compute `flightPath(save)`.
  4. Assert the target's index ≤ MAX_LEGS.
  5. For a chain, also from A to B.
- **Declared, not inferred:** the list of city-target templates (`land-city`, `chain`, `rescue`, `route`) and MAX_LEGS are constants in the test.
- **Plant:** remove the aim (flightPath back to the plain tour). It must FAIL. Today it would fail on at least the Aotearoa line and probably other areas, so it is red until the fix lands.
- `tools/sim/check-reach.mjs` does NOT fit: it measures whether a perfect tapper can get between consecutive storm gaps (physics), not the route graph. The new gate is pure graph code. It reuses `route.js` (`flightPath`, `linksFor`, `toward`) and `missions2.js` (`fillFor`, `TEMPLATES`).

## Next steps (after a GO)

1. Bug 1: the one-line reset plus the sign's `to` check. Then the `flightreset` gate with its declared PERSIST list, classifying all 27 fields (Node). The sim chat signs off on rules.js.
2. Bug 2: the `missionreach` gate FIRST, red, to measure how often missions are out of reach per area today. Then the aimed route plus the hub's 3-stop route. The sim measures progression (beginner/expert, all areas).
3. One browser turn: a crash-then-retry flight shows the new leg in the HUD; the hub shows the aimed route.
