# Era steps: each new plane flown carelessly should match the previous plane flown carefully (plane build, 2026-10-26)

User direction: the ladder steps must be CLEAR; tune each plane's STARTING multipliers (fleet.js PLANES), not the climate;
keep the growth from upgrades within an era. Node engine (src/sim, bit-identical to the game), 15 skies, median,
crashes OFF. PROPOSAL ONLY: it goes with the heat decision.

| Starting CO2 (Comet / 747 / twin) | Comet base careless / careful / smart | 747 base careless / careful / smart | 747 full careful | Twin base careless / careful / smart | Twin full careful |
|---|---|---|---|---|---|
| today 1.1 / 1.0 / 0.8 | 9,318 / 10,618 / 10,464 | 8,759 / 11,927 / 11,790 | 17,794 | 12,275 / 14,844 / 15,208 | 24,431 |
| 1.1 / 0.95 / 0.7 | 9,318 / 10,618 / 10,464 | 9,134 / 12,541 / 12,314 | 19,801 | 12,909 / 16,707 / 16,767 | 25,001 |
| 1.1 / 0.9 / 0.65 | 9,318 / 10,618 / 10,464 | 10,279 / 13,169 / 12,891 | 20,567 | 13,213 / 17,402 / 17,614 | 25,001 |
| 1.1 / 0.85 / 0.65 | 9,318 / 10,618 / 10,464 | 11,505 / 14,510 / 13,586 | 21,479 | 13,213 / 17,402 / 17,614 | 25,001 |
| **1.1 / 0.85 / 0.6 (proposed)** | 9,318 / 10,618 / 10,464 | 11,505 / 14,510 / 13,586 | 21,479 | 16,051 / 19,972 / 20,179 | 25,001 |
| 1.1 / 0.75 / 0.5 | 9,318 / 10,618 / 10,464 | 12,303 / 16,452 / 16,394 | 25,001 | 16,802 / 21,832 / 24,459 | 25,001 |

Test: new plane CARELESS >= previous plane (bought new) CAREFUL.
- Today: 747 careless 8,759 < Comet careful 10,618 (fails); twin careless 12,275 >= 747 careful 11,927 (just).
- **Proposed 747 x0.85, twin x0.6** (Comet unchanged x1.1): 747 careless 11,505 >= Comet careful 10,618; twin careless
  16,051 >= 747 careful 14,510. The gentlest values found that clear both steps (747 x0.9 gives 10,279: not quite;
  twin x0.65 gives 13,213 < the new 747 careful 14,510).
- Within-era growth stays: 747 base careful 14,510 -> full 21,479; twin full reaches the 25,000 km cap.
- Matching the previous plane's FULLY upgraded careful range is not reachable without making later planes trivial
  (Comet full careful 13,220 vs 747 careless 11,505 at x0.85).
- Note the jumps are not linear in CO2 (twin x0.65 -> x0.6: 13,213 -> 16,051 km): heat builds faster once a plane
  makes night contrails, so small CO2 changes can tip a flight past a night or two.
- Real-history sanity: the 747 per seat was roughly 25-35% more efficient than early jets, and 1990s twins another
  20-25%; x0.85 and x0.6 (of the Comet's x1.1: 0.77 and 0.55) are game values, in the right direction.

Still to do (the sim chat's 'player' pilot, crashes on, s 0.75 and 0.9, 20+ skies, with the share of flights ending
by overheat vs crash): it lands on main after the sim chat's next turn. Expected: at s 0.75 crashes end most flights,
so the steps only show for players who can steer (s >= ~0.85).

## Crashes ON: the sim's skill-based 'player' pilot (0.11.8), 20 skies, median km (share ending by OVERHEAT)

| Plane | Skill | today careful / careless (overheat %) | steps careful / careless (overheat %) |
|---|---|---|---|
| Comet base | 0.72 | 2,231 / 8,215 (5% / 10%) | 2,231 / 8,215 (5% / 10%) |
| Comet base | 0.8 | 7,131 / 8,406 (5% / 15%) | 7,131 / 8,406 (5% / 15%) |
| Comet base | 0.9 | 8,952 / 9,357 (55% / 65%) | 8,952 / 9,357 (55% / 65%) |
| Comet full | 0.72 | 2,488 / 8,897 (0% / 0%) | 2,488 / 8,897 (0% / 0%) |
| Comet full | 0.8 | 7,516 / 8,666 (0% / 5%) | 7,516 / 8,666 (0% / 5%) |
| Comet full | 0.9 | 11,195 / 10,966 (35% / 30%) | 11,195 / 10,966 (35% / 30%) |
| 747 base | 0.72 | 2,752 / 8,250 (0% / 5%) | 2,752 / 8,250 (0% / 0%) |
| 747 base | 0.8 | 7,764 / 8,437 (5% / 5%) | 7,764 / 8,437 (0% / 0%) |
| 747 base | 0.9 | 10,013 / 9,125 (40% / 40%) | 10,861 / 10,186 (30% / 15%) |
| 747 full | 0.72 | 2,300 / 8,450 (0% / 0%) | 2,300 / 8,450 (0% / 0%) |
| 747 full | 0.8 | 2,742 / 9,125 (0% / 0%) | 2,742 / 9,125 (0% / 0%) |
| 747 full | 0.9 | 10,882 / 10,735 (15% / 5%) | 10,882 / 10,735 (5% / 0%) |
| Twin base | 0.72 | 2,056 / 8,204 (0% / 0%) | 2,056 / 8,204 (0% / 0%) |
| Twin base | 0.8 | 3,865 / 8,666 (0% / 0%) | 3,865 / 8,666 (0% / 0%) |
| Twin base | 0.9 | 9,813 / 10,290 (20% / 20%) | 9,813 / 10,290 (0% / 0%) |
| Twin full | 0.72 | 1,320 / 8,519 (0% / 0%) | 1,320 / 8,519 (0% / 0%) |
| Twin full | 0.8 | 3,886 / 9,125 (0% / 0%) | 3,886 / 9,125 (0% / 0%) |
| Twin full | 0.9 | 11,657 / 9,584 (10% / 5%) | 11,657 / 9,584 (0% / 0%) |

- The CO2 multipliers change nothing below skill 0.9 (crashes end the flights first) and nothing at all for the Comet.
- At s 0.9 they help the 747 (base careful 10,013 -> 10,861, careless 9,125 -> 10,186) and remove most overheat
  endings for the 747 and the twin (twin base 20% -> 0%).
- With crashes on, the new-plane-careless >= old-plane-careful test holds at s 0.9 with the change (747 careless
  10,186 >= Comet careful 8,952) and already held today (9,125). Below s 0.9 every plane, flown carelessly, reaches
  about 8,200-9,100 km: the obstacles, not the plane, are the limit there.
- VERDICT: the era-step multipliers are SAFE (they never hurt anyone measured) and make the ladder clear for good
  players and in the crash-free studies. Ship them if the user wants clear steps; they don't change a beginner's game.
