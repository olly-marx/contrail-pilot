# Heat tweak study (plane build, 2026-10-25): MEASUREMENT ONLY, nothing shipped

Ask (user via the coordinator): "a slight tweak towards overheating"; missions must stay achievable. Target: STRAIGHT
(careless) Comet BASE from ~9,000 to ~6,500-7,000 km while the CAREFUL Comet stays well above, widening the gap.
Method: tools/balance.cjs NORENDER=1, 7 skies, median (min-max), crashes off, cap 25,000 km. Knobs set with
CLIMATE / ISSR overrides (tools/balance.cjs), so the game code is unchanged. Real-player context: flights 1-20 end
at a median 2,000-5,000 km (crashes, not heat), so this mainly affects players who survive long flights.

## Comet BASE, one knob at a time, then pairs

| Setting | Straight | Careful | Gap |
|---|---|---|---|
| today (night weight 0.93, icy chance 0.85, danger line 165) | 8,988 (8.8-10.4k) | 11,000 (10.4-11.4k) | 22% |
| danger line 140 | 7,924 (6.5-9.0k) | 8,861 (8.5-9.1k) | 12% |
| danger line 125 | 7,079 (6.1-8.1k) | 7,577 (7.2-8.3k) | 7% |
| day shade 0.5 (from 0.66) | 8,873 (8.4-9.4k) | 10,508 (9.5-11.1k) | 18% |
| night weight 1.2 | 8,687 (8.0-9.3k) | 10,929 (10.0-11.2k) | 26% |
| night weight 1.5 | 8,283 (6.1-9.0k) | 10,283 (9.2-11.2k) | 24% |
| night weight 2.0 | 7,795 (5.3-8.2k) | 10,372 (9.1-10.9k) | 33% |
| night weight 2.5 | 7,774 (5.0-8.6k) | 10,281 (8.4-11.1k) | 32% |
| night weight 3.0 | 5,093 (4.7-8.5k) | 9,247 (8.7-11.1k) | 82% |
| icy air chance 1.0 | 8,738 (8.5-11.3k) | 11,015 (9.5-11.5k) | 26% |
| icy patches up to 420 px wide | 8,740 (8.2-9.4k) | 10,832 (10.6-11.3k) | 24% |
| night 2.0 + icy chance 1.0 | 7,819 (5.6-8.9k) | 10,437 (8.9-11.3k) | 33% |
| night 2.5 + icy chance 1.0 | 6,429 (5.4-8.7k) | 9,921 (9.0-10.4k) | 54% |
| night 2.5 + patches up to 420 px | 6,491 (4.8-7.4k) | 9,361 (8.6-10.7k) | 44% |
| night 3.0 + icy chance 1.0 | 5,583 (4.7-8.2k) | 9,342 (8.9-10.2k) | 67% |
| night 2.5 + danger line 150 | 5,128 (4.6-7.8k) | 8,647 (8.2-9.2k) | 69% |

- Lowering the DANGER LINE cuts both pilots alike: the gap SHRINKS (22% -> 7% at 125). Not what was asked.
- Less day shade, wider patches or more icy air alone barely move anything.
- The NIGHT CONTRAIL weight is the knob that separates careless from careful: careless flights trap heat at night.
- Smallest change hitting the target: **night weight 2.5 (from 0.93) + icy-air spawn chance 1.0 (from 0.85)**:
  straight 6,429 km, careful 9,921 km (gap 54%).

## Side effects on later eras (the winning setting, with the engine fix below)

| Plane | Straight today | Straight tweak | Careful today | Careful tweak |
|---|---|---|---|---|
| Comet base | 8,988 | 6,429 | 11,000 | 9,921 |
| Comet mid | 10,399 | 8,620 | 12,643 | 10,163 |
| Comet full | 11,887 | 8,250 | 12,909 | 11,992 |
| 747 base | 9,831 | 5,497 | 12,517 | 9,405 |
| 747 full | 13,015 | 8,410 | 16,452 | 12,345 |
| Twin base | 12,849 | 6,444 | 15,355 | 11,671 |
| Twin full | 16,221 | 8,273 | 24,137 | 15,901 |

**It breaks the era ladder.** Later planes have a wider contrail margin (the efficiency trap: they make contrails
closer to the edge of icy air), so a heavier night weight hits them hardest. With the tweak, a NEW 747 with
nothing bought flies less far than a bare Comet (straight 5,497 vs 6,429; careful 9,405 vs 9,921), and a
bare twin is no better than a bare Comet. Today each new plane is at least as good as the last era's full plane.

Options for the user (no change made):
1. Ship night 2.5 + icy 1.0 as is: early game harder for careless flying, but new planes feel WORSE at first.
2. A milder step, night 2.0 + icy 1.0: straight 7,819, careful 10,437 (gap 33%); smaller era damage (not
   re-measured for later eras yet).
3. Keep the night weight and soften the efficiency trap's margins for the 747/twin (CONTRAIL_MARGIN inside 1.0 ->
   0.95, edge 1.12 -> 1.05), so later planes are not punished twice. Needs its own measurement.
4. Make the night weight grow with distance into a flight (it already ramps icy air via latePer10k), so
   early flights stay forgiving and long careless flights overheat. Needs its own measurement.

## Bug found and fixed on the way: the Comet MID > FULL oddity

Not the forecast's false patches (with them switched off: MID 12,412-12,536, FULL 11,586-11,934, still worse).
The cause was src/fleet.js: for Engines and Cabin only the NEWEST level counted, so the Comet's Engines 2 (thrust
reversers, no CO2 effect) threw away Engines 1's CO2 x0.9. Fixed: each effect now comes from the newest level that
has it (tests/fleet.cjs checks it and fails on the old rule). Comet FULL now beats MID for the careful pilot
(12,909 vs 12,643). This fix is a real bug fix and goes out in the next release.