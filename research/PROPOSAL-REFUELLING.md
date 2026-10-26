# Proposal: in-flight refuelling on missions (plane build, REWORKED 2026-10-26). PROPOSAL ONLY, nothing built

User direction: the tanker is ONLY on missions; it is not free or on demand; it is not triggered by an absolute
distance. It BANKS the seeds collected so far (a later crash keeps them).

## Decisions for the user (top)
1. Which way does the tanker come? RECOMMENDED: (A) a fixed rendezvous on the mission's progress bar (one per
   mission, at 50%), with the Refuelling gadget's higher levels adding more (33% and 66%). Alternatives below.
2. Is the rendezvous a skill test (hold formation for a few seconds)? Proposed: yes, short and forgiving: fail and
   nothing is banked, nothing is lost.
3. No heat relief from the tanker (heat stays the lesson)? Proposed: yes.

## The options compared
| Option | How it works | For | Against |
|---|---|---|---|
| A. Fixed rendezvous on the progress bar (recommended) | a marker on the mission bar at 50%; at that point the tanker arrives and you fly into its box | readable (you can see it coming on the bar), fair (same for everyone), fits the boss-level bar, scales with the gadget (more marks) | none big; the mission designer must keep the 50% mark clear of the worst obstacles |
| B. A pick-up in the sky | a tanker token floats like a power-up; grab it to start the rendezvous | familiar (like SAF/autopilot) | random: some missions never offer one; it becomes luck, not planning |
| C. A percentage of the flight, any time | after 40% the player may call it once | player choice | is "on demand", which the user ruled out; easy to waste |
| D. One per flight, automatic | it simply arrives once per mission | simplest | no skill, no gadget growth, no decision |

## How A plays
- The mission bar shows a small tanker icon at 50% (and at 33% / 66% with the higher gadget level).
- Near the mark, the tanker flies in from behind and settles above the plane; a box shows where to hold.
- Hold inside it for the hold time (a bar fills). Storms, birds and icy air keep coming; the tanker does not stop them.
- Success: "SEEDS BANKED!": the seeds carried so far are kept even if you crash later. Fail (out of the box for over
  1 s, or a crash): the tanker peels away; nothing banked, nothing lost; that rendezvous is gone.
- Contrail lesson: the tanker makes contrails too, so a rendezvous in icy air at night traps heat for both planes.

## The Refuelling gadget (missions only; estimates)
| Era | Level | Rendezvous per mission | Hold | Box |
|---|---|---|---|---|
| 1950s | Probe and drogue (hose and basket) | 1 (50%) | 8 s | +-24 px |
| 1970s | Flying boom | 2 (33%, 66%) | 6 s | +-30 px |
| 1990s | Better boom, autopilot hold | 2 | 5 s | +-36 px |
| 2010s+ | later eras | 3 (25%, 50%, 75%) | 4 s | +-40 px |
Without the gadget, a mission has no rendezvous at all (the gadget is how you prepare for the long crossings).

## Real history for the fact cards (TO VERIFY before any appears in the game: none fact-checked yet)
- The first air-to-air refuelling: two US Army Air Service DH-4B biplanes, 1923 (verify).
- Probe-and-drogue: developed in Britain by Alan Cobham's Flight Refuelling Ltd from the 1930s (verify).
- 1949: the B-50 "Lucky Lady II" flew non-stop round the world, refuelled in flight (verify).
- The flying boom: Boeing, early 1950s; tankers like the KC-135 from 1957 (verify).
- Airliners do NOT refuel in flight today: the card says it is a game idea.

## Touches (when built)
Needs the mission system and its progress bar from the redesign (DESIGN-STARTER-AREAS.md). Then: a gadget line in
src/fleet.js, the tanker as a world record in src/sim (formation box and timer in rules.js, so the Node engine and
tests fly it), the bar's markers, a results row "Seeds banked in flight", one tanker sprite per era (PixelLab ~3-6
generations each).
