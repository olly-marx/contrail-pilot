# Proposal 9: money features (plane build, 2026-10-25). PROPOSAL ONLY, nothing built

Written against research/DESIGN-STARTER-AREAS.md (distance is the score, missions pay for upgrades, starter areas,
earned crossings). Flight jobs are REPLACED by the bug-fix chat's Challenges (~/cp-fixes/research/PROPOSAL-12-MISSIONS.md).

## Decisions for the user (top)
1. Crystal exchange: yes or no, and at what rate? Proposed: yes, 10 crystals -> 1 seed, in the hangar, at most
   once per landing. Today crystals pile up (players hold ~350) while seeds are scarce.
2. Nature dividend: yes? Proposed: yes, small: +2% of a landing's seeds per finished project IN THAT AREA (cap
   +20%). It makes nature pay in the currency players want, and ties to the area they rewild.
3. First landing in each city: keep today's prize (+15 seeds +1 crystal, rewards.js NEW_CITY) and turn it into the
   area mission "land at every city in <area>" with a bigger set prize? Proposed: yes; the per-city prize stays.
4. Fares stay as built (seeds per 1,000 km x Cabin). OK?

## Why each
| Feature | Problem it fixes | Lesson it carries |
|---|---|---|
| Crystal exchange | Crystals pile up with nothing to buy; seeds block progress | smart contrail flying (which earns crystals) pays off twice |
| Nature dividend | Projects feel like a cost, not an investment | healthy nature gives back (ecosystem services) |
| City prizes -> area mission | "Go everywhere" already exists as a prize; starter areas need goals | explore your area before you cross |

## Numbers (estimates, to measure)
- Exchange: 10:1 keeps a crystal worth about the seeds/8 hangar ratio after a small "fee"; at today's balances a
  player turns ~350 crystals into ~35 seeds, so it can't buy an era.
- Dividend: an average landing pays ~20-80 seeds; 5 projects = +10% = +2-8 seeds. Deliberately small: it's a
  message, not a money printer.
- All three through the same claim flow as missions (rewards.js), so the results screen shows them.

## Touches (when built)
rewards.js (claims), hangar.js (the exchange button), GameScene.finish (dividend row), ui.js results. No
database changes: the online save already carries seeds and crystals.
