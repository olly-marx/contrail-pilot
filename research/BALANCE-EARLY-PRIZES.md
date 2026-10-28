# Balance: early prizes trickle in slower (sim engine, 2026-10-28)

The user, on live 0.16.3: "I have WAY too much currency early on from completing missions. I do not need this much, it
should TRICKLE IN SLOWER." Target: the user's bank never sits far above the next 2-3 purchases; a beginner (s 0.75) still
never goes more than 10 flights with nothing to buy (allowed to relax to ~15 if needed: it was NOT needed).

Method: the progression simulator on main 27b229d (0.16.5) with season 2 on and the game's own crossing offer
(feat/progression-s2), Western Europe start, careful, constant skill, 4 seeds x 30 flights. s 0.75 / 0.8 land after passing
2 airports, s 0.9 / 1.0 after 4 (they chase long flights). Per flight: seeds from the flight, seeds and crystals from prizes
(claimed at once), what was spent, and the bank against the seed cost of the 3 cheapest things the shop could sell next.

## 1. Before (0.16.5), flights 1-30

| s | Seeds from flights | Seeds from prizes | Bank / next 3 purchases (median, max) | Flights with the bank > 2x the next 3 | Longest run with nothing bought |
|---|---|---|---|---|---|
| 0.75 | 203 | 1,130 (85%) | 3.7, 5.5 | 21-28 of 30 | 3-7 |
| 0.80 | 442 | 1,310 (75%) | 4.8, 6.3 | 26-29 | 3-4 |
| 0.90 | 2,296 | 3,060 (57%) | 10.1, 15.3 | 29-30 | 1-2 |
| 1.0 | 2,274 | 3,160 (58%) | 9.9, 16.1 | 28-30 | 1 |

Confirmed: prizes are most of the early money, and the user-level bank holds about TEN times the next three purchases.
Where it comes from: lessons (60-70 seeds each), area missions (30 / 50 / 60 / 40 x the stage factor) and BADGES (30 / 120 /
400 per tier): the badges are the largest part for a strong player (a good first 30 flights earns many tiers at once).

## 2. Schedules tried (seed prizes only; crystal prizes unchanged)

| Lessons / area missions / badges | s 0.75 longest empty run | s 0.8 | s 0.9 / 1.0 bank / next 3 (median) |
|---|---|---|---|
| x1 / x1 / x1 (today) | 3-7 | 3-4 | 10.1 / 9.9 |
| x0.5 / x0.5 / x1 | 3-7 | 3-4 | 8.0 / 7.8 |
| x0.33 / x0.33 / x1 | 3-7 | 3-4 | 7.1 / 7.1 |
| x0.25 / x0.25 / x1 | 3-7 | 3-4 | 6.7 / 6.8 |
| x0.33 / x0.33 / x0.33 | 6-11 (one run over 10) | 2-5 | 3.1 / 3.8 |
| **x0.33 / x0.33 / x0.15** | **6-9** | **3-6** | **3.6 / 2.6** |
| x0.5 / x0.5 / x0.25 | 6-10 | 2-5 | 3.5 / 4.2 |

Cutting lessons and missions alone barely touches the strong player (badges remain); the badge cut is what brings the bank
down. x0.33 / x0.33 / x0.15 meets both targets.

## 3. Applied (branch feat/early-prizes cb21669, on 0.16.5)

| Constant | Before | After |
|---|---|---|
| lessons L1-L5 seeds (src/missions2.js) | 60, 60, 70, 70, 70 | 20, 20, 25, 25, 25 |
| area missions, tier 1 / 2 / 3 star / 3 (x the stage factor) | 30 / 50 / 60 / 40 | 10 / 15 / 20 / 15 |
| badges T3 tiers (src/badges.js) | 30 / 120 / 400 | 5 / 20 / 60 |
| badges ONE / SECRET | 80 / 50 | 10 / 10 |
| every crystal prize | unchanged | unchanged |

Measured with the committed constants (flights 1-30):

| s | Seeds from flights | Seeds from prizes | Bank / next 3 (median, max) | Longest empty run |
|---|---|---|---|---|
| 0.75 | 158 | 150 (49%) | 0.2, 0.3 | 7-9 |
| 0.80 | 345 | 295 (46%) | 0.2, 0.3 | 2-5 |
| 0.90 | 2,217 | 720 (25%) | 3.8, 5.2 | 1-2 |
| 1.0 | 2,194 | 720 (25%) | **2.7**, 4.6 | 1-2 |

- **The user's bank now sits at ~2.7x the next three purchases (was 9.9x)**; prizes fall from ~3,160 to 720 seeds in 30 flights.
- **Beginners: never more than 9 flights with nothing to buy (gate 10 holds; no relaxation needed)**, but they now spend
  almost every seed as it comes (bank ~0.2x the next three): a tighter but not starved early game.
- What remains for strong players is mostly FLIGHT earnings (~2,200 seeds in 30 flights); the next lever, if the user still
  finds it too much, is the long-flight multiplier / fares, not prizes.

## 4. Checks and caveats

- tools/gate.sh on the branch: 42 / 42 Node tests pass (no test pins prize values).
- One start area, one player model, 4 seeds x 30 flights; the shop buys the cheapest thing first.
- The browser tests that show prize numbers on screens (missions, badges, rewards) may need their expected text updated: the
  bug-fix chat's release run will tell.
