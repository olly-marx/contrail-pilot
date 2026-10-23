# Contrail Pilot -- jet generations research (2026-10-22)

Confidence tags: **SOLID** (several good sources), **LIKELY** (one good source), **UNSURE** (weak/secondary source, or our own estimate).
Source keys in [brackets] are listed at the end. Where only a press claim or search snippet backed a number, it is marked as such. **Verify any number before printing it in the game.**

Honest scope note: the web searches covered the contrail science well (peer-reviewed abstracts). Per-aircraft numbers (bypass ratio, seats, range) for the older jets were *not* all retrieved from primary sources in this pass; those are tagged UNSURE and flagged "needs check".

---

## 1. The ladder of jet generations

| # | Generation | Example | Year | Kid-friendly description |
|---|---|---|---|---|
| 1 | Early turbojet airliner | de Havilland Comet 1 (1952), Boeing 707 (1958) | 1950s | A loud, thirsty pipe that blasts hot air out the back. All the air goes through the fire. |
| 2 | First high-bypass widebody | Boeing 747-100 (1970) | 1970 | A giant fan out front pushes lots of air *around* the engine core. More push for less fuel, and room for hundreds of people. |
| 3 | Efficient twins | Boeing 777 / A330 era | 1990s | Two big, efficient engines instead of four. |
| 4 | New-engine narrowbodies | A320neo (GTF or LEAP), 737 MAX (LEAP) | 2016 | Bigger fans, a gearbox (GTF) so the fan and turbine each spin at their best speed, and a lean-burn combustor (LEAP) that makes far less soot. |
| 5 | Open fan | CFM RISE demonstrator | 2030s target | Take the case off the fan so it can be huge. |
| 6 | Blended wing body | NASA X-48 (subscale tests), JetZero Z4 | 2027 first flight target | The whole plane is a wing, so it lifts with less drag. |
| 7 | Hydrogen | Airbus ZEROe concepts | "later than 2035" | Burns hydrogen: no CO2 and no soot, but more water vapour. |

### Numbers per generation

**Fuel burn trend across history.** New-aircraft fuel burn per seat-km roughly halved from 1960 to the late 2000s (ICCT 2009: efficiency "approximately doubled" since 1960); ICCT 2015 found ~45 % reduction 1968-2014 (~1.3 %/yr); progress stalled in the 2000s and returned to ~1 %/yr in the 2010s [ICCT2009, ICCT2015, ICCT2020]. **SOLID** (ICCT series; read via report summaries, not the full PDFs).

**Gen 4, A320neo.** Per-seat fuel burn claims range from ~20 % (manufacturer-type claim via Wikipedia) to 16-17 % (Aircraft Commerce) to 9-10 % in 2018 operator data [NEO-WIKI, AC2018, AIRINSIGHT]. **LIKELY** that the real gain is 10-20 %; use "about 15 % better" for the game. P&W GTF bypass ratio "up to 12:1" (manufacturer) [PW-GTF]; LEAP-1A ~11:1 (secondary). **LIKELY.**

**Gen 5, open fan.** CFM RISE target is **20 % lower fuel burn/CO2 than today's best engines**, designed to also run on SAF and hydrogen; noise is the main challenge; service target mid-2030s [GE-RISE, AIN2024]. **LIKELY** (a target, not a measured value). A bypass ratio around 70 is often quoted for RISE; this pass did **not** confirm it. **UNSURE.**

**Gen 6, blended wing.** JetZero claims **up to 50 %** less fuel (other statements say 30-50 %), ~250 seats, ~5,000 nmi range, first full-scale flight targeted 2027 with a USAF-backed $235M contract. A January 2026 Hamburg University of Applied Sciences study challenged the 30-50 % claim [IE-JETZERO, AXIOS2026]. **UNSURE** (company claim, disputed).

**Gen 7, hydrogen.** In February 2025 Airbus pushed ZEROe beyond 2035 (by up to ~10 years), cut the budget by about a quarter, and cancelled the A380 fuel-cell flight test, citing slow green-hydrogen supply [CW-ZEROE, ELECTRIVE]. **SOLID.**

**Gens 1-3 (bypass ratio, cruise altitude, seats).** Typical textbook values are: early turbojets bypass 0, early 707 turbofans ~1.4, JT9D on the 747-100 ~5, 1990s widebody engines ~6-9, cruise ~10-12 km. **UNSURE, not retrieved in this pass. Needs check before use.**

**Overall propulsion efficiency eta** (the number that matters for contrails, Section 2):
- Schumann's wing-by-wing test compared aircraft with eta = **0.23 vs 0.31** (an older vs newer four-engine jet) [SCH2000-JA]. **SOLID** (two Schumann papers).
- "State-of-the-art conventional aircraft" eta = **0.37** in Megill et al. 2025 [MEGILL2025]. **LIKELY.**
- Schumann expected future aircraft could reach **0.5** [SCH2000-JA]. **LIKELY.**
- Schumann et al. 2021 note fleet eta was about 20 % lower than earlier studies assumed [SCH2021]. **LIKELY.**

**Soot (nvPM).** Conventional rich-quench-lean (RQL) combustors sit in the "soot-rich" regime. Lean-burn combustors (e.g. LEAP's TAPS) cut soot particle number by about **three orders of magnitude (1000x)** [VOIGT2026, TEOH2024]. Lean-burn engines flew ~20 % of global distance in 2024 [IATA-vPM]. **SOLID.** Hydrogen combustion produces **no soot** [BIER2024]. **SOLID.**

---

## 2. The efficiency trap

**Schmidt-Appleman criterion (SAc), simply put.** Hot, wet exhaust mixes with cold air. Picture a straight line on a temperature-vs-water graph running from "exhaust" to "outside air". If any point on that line passes the water-saturation curve, droplets form and freeze, and you get a contrail. The slope of the line (the "contrail factor" G) is the extra water per unit of extra heat. **Whether the contrail then *lasts* depends on the air being ice-supersaturated (an ISSR).** That second condition is the game's ISSR mechanic.

**Why efficiency matters.** Engine efficiency eta is the fraction of fuel energy that turns into pushing the plane. The rest leaves as heat. A more efficient engine produces the **same water per kg of fuel but less heat**, so its exhaust is cooler and wetter relative to its warmth. The mixing line gets steeper and crosses saturation at **warmer** outside air, so contrails form lower down and more often [SCH2000-AST]. **SOLID.** (Soup metaphor: same pot of broth, less fire under it. The steam fogs your glasses sooner because there's less heat to keep it invisible.)

**The numbers:**
- Wing-by-wing flight (eta 0.23 vs 0.31): there was an altitude band where only the efficient jet made a contrail. The band was **80 m** thick at the day's lapse rate of 12 K/km, which would be about **200 m** in a standard atmosphere. Going from eta 0.3 to 0.5 would start contrails about **700 m lower** [SCH2000-JA]. **SOLID.**
- Detwiler et al.: a **10 % rise in contrail factor is about +1 °C threshold temperature** near -50 °C [DETWILER2002]. **LIKELY.**
- Climatology: higher eta raises potential contrail occurrence (Paris radiosondes) [WOLF2023]. The design effect shrinks with altitude, and **ice supersaturation is the main limit** whatever the aircraft [MEGILL2025]. **SOLID.**
- Satellites (over 64,000 cases): more fuel-efficient aircraft make longer-lived detectable contrails more often, **mainly because they fly higher**, not only because of eta [GRYSPEERDT2024]. **LIKELY.** This is a great game point.
- Tweaking engine settings to dodge contrails gains only 57-206 m of altitude, at up to 35 % more fuel. Not worth it [CALLARD2025]. **LIKELY.**

**Is it offset?** Schumann (2000) said the net climate effect "has not yet been quantified" [SCH2000-AST]. Since then:
- Fewer soot particles give fewer, bigger ice crystals. Those contrails are thinner, fall out sooner and warm less. Teoh et al. 2020 (the same ES&T paper; the report earlier called it 'Teoh 2019') estimated widespread low-soot combustors could cut contrail energy forcing by ~69 % (range 45-82 %) [TEOH2019]. **LIKELY.**
- **BUT** in-flight measurements behind an A321neo with lean-burn engines (Voigt et al., *Nature* 2026) found soot fell ~1000x while **contrail ice crystal numbers did not drop significantly**. Volatile particles (sulfur, organics, lubrication oil vapour) took over as seeds. Lean-burn alone is "unlikely to reduce the warming effect of contrails"; low-sulfur fuel helps [VOIGT2026]. **LIKELY** (one major study, but it is direct measurement). Teoh-group work (2025) likewise warns that models ignoring volatile particles underestimate ice numbers for lean-burn engines [TEOH2025-vPM]. **This is the biggest open question.**
- CO2 savings are certain and permanent; the contrail penalty depends on weather. No consensus number for the net trade-off was found. **UNSURE.**

---

## 3. Soot and contrail ice by generation

- With conventional fuel and engines, contrail ice crystal number scales roughly **in proportion to soot number** [KARCHER2015]. **SOLID.**
- When soot is very low, entrained ambient and volatile particles set the floor [KARCHER2015, BIER2024, VOIGT2026]. **SOLID.**
- Fewer initial ice crystals mean a shorter contrail-cirrus life and less radiative impact. The relationship is nonlinear [LOTTERMOSER2026, BIER2024]. **SOLID.**
- Cleaner, low-aromatic fuels (SAF blends in the ECLIF/ND-MAX flights) reduced soot and ice numbers. **LIKELY.** The specific percentages were not retrieved in this pass; see Voigt et al. 2021, *Commun. Earth Environ.*, doi:10.1038/s43247-021-00174-y. Needs check.
- Contrails make up a large share of aviation warming. The 2019 global contrail net RF was 62 mW/m² (range 35-75) [TEOH2024]; a later estimate is ~80±20 mW/m² [IATA-vPM]. **Just 2 % of flights caused 80 % of contrail energy forcing** [TEOH2024; also TEOH2019 for Japan]. **SOLID.**
- Avoidance works in practice. In a randomised trial, pilots who adjusted altitude produced **64 % fewer** detectable contrails for about **2 % more fuel** on adjusted flights [SONABEND2024]. **LIKELY.**

## 4. Hydrogen and contrails

- Hydrogen produces about 2.6x more water per unit of energy, so the contrail factor is higher and contrails form **more often**. Persistent contrail formation is up **~46 %** for H2 combustion (fuel cells ~55 %) vs an eta=0.37 kerosene jet [MEGILL2025]. Richardson 2025 agrees that H2 and efficient fuel cells promote formation [RICHARDSON2025]. **SOLID** on direction. The 2.6x figure is from general knowledge and needs a source check.
- **No soot**, so ice forms on ambient aerosol. That gives **80-90 % fewer ice crystals** [BIER2024], so contrails are thinner, with bigger crystals that fall out sooner [LOTTERMOSER2026]. **SOLID.**
- Net effect: early models found H2 contrail RF anywhere from **30 % lower to 30 % higher** than kerosene, with thinner contrails offset by more coverage [MARQUART2005]. Cryoplane fleet climate impact was ~15-50 % lower (best ~30 %) including CO2 [PONATER2006]. Gierens 2021 says fuel-cell contrails are frequent but mostly short and thin, and recommends them on climate grounds [GIERENS2021]. **LIKELY / UNSURE.** Still unresolved.

## 5. Other true, surprising, game-usable facts

- **Flying higher is not always cleaner.** Efficient jets fly higher and make more long-lived contrails [GRYSPEERDT2024]. Changing altitude by a small amount dodges most warming contrails [TEOH2019, SONABEND2024]. Flying ~0.8 km higher in winter and lower in summer reduces contrail probability over Paris [WOLF2023]. **LIKELY.**
- **A few flights do most of the damage** (2 % of flights cause 80 %) [TEOH2024]. **SOLID.**
- **Day vs night:** contrails cool a bit by day (reflect sunlight) and only trap heat at night. This matches the game's mechanic; see the Teoh group's "strongly warming/cooling segments" tied to flight scheduling [TEOH2024]. **LIKELY.**
- **Seats and load factor:** CO2 per passenger is fuel ÷ passengers, so a full plane beats a half-empty "better" plane. **Logic, not a sourced number.**
- **Fuel-cell / hydrogen contrails can form even near the ground** in cold weather [GIERENS2021]. **LIKELY.**
- Winglets: commonly cited as saving a few % of fuel. **UNSURE, not checked in this pass.**

---

## Game-ready summary

CO2 per passenger relative to Gen 1 is a **rough game value** built from the ICCT trend (about halving 1960 to 2010) plus manufacturer targets. It is not a measured series. Contrail tendency follows eta and fuel (Section 2/4).

| Gen | Example | Year | CO2/pax (vs Gen1) | Soot | Contrail tendency | Fun fact | Sources |
|---|---|---|---|---|---|---|---|
| 1 | Comet / 707 | 1952-58 | 1.00 | High | Lowest (eta ~0.23) | Hottest exhaust = fewest contrails! | SCH2000-JA, ICCT2009 |
| 2 | 747-100 | 1970 | ~0.7 (UNSURE) | High | Low-med | First "jumbo"; a big fan pushes air around the core | ICCT2015 |
| 3 | 1990s twins | ~1995 | ~0.55 (UNSURE) | Med-high | Medium (eta ~0.3) | Same idea, two engines not four | ICCT2020, SCH2000-JA |
| 4 | A320neo / 737 MAX | 2016 | ~0.45 (UNSURE) | Low (lean-burn ~1000x less) | Med-high (eta ~0.37) | 1000x less soot, yet the ice crystals barely dropped | VOIGT2026, MEGILL2025 |
| 5 | Open fan (RISE) | 2030s | ~0.36 (target -20 %) | Low | High | No case on the fan | GE-RISE |
| 6 | Blended wing | ~2030s | ~0.25-0.3 (claim, disputed) | Low | High | The whole plane is a wing | IE-JETZERO |
| 7 | Hydrogen | >2035 | ~0 CO2 in flight | None | Highest (+~46 %) but thin, short-lived | More contrails, but wispier | MEGILL2025, BIER2024 |

---

## Sources
- [SCH2000-AST] Schumann 2000, Aerosp. Sci. Technol. https://doi.org/10.1016/S1270-9638(00)01062-2
- [SCH2000-JA] Schumann et al. 2000, J. Aircraft. https://doi.org/10.2514/2.2715
- [DETWILER2002] Detwiler & Jackson 2002, J. Aircraft. https://doi.org/10.2514/2.2976
- [SCH2021] Schumann et al. 2021, ACP (COVID contrails). https://doi.org/10.5194/acp-2021-62
- [MEGILL2025] Megill et al. 2025, ACP. https://doi.org/10.5194/acp-25-4131-2025
- [RICHARDSON2025] Richardson 2025, J. Propul. Power. https://doi.org/10.2514/1.B39430
- [WOLF2023] Wolf et al. 2023, ACP. https://doi.org/10.5194/acp-23-287-2023
- [GRYSPEERDT2024] Gryspeerdt et al. 2024, ERL. https://doi.org/10.1088/1748-9326/ad5b78
- [CALLARD2025] Callard et al. 2025, CEAS Aeronaut. J. https://doi.org/10.1007/s13272-025-00887-2
- [VOIGT2026] Voigt et al. 2026, Nature. https://doi.org/10.1038/s41586-026-10286-0
- [TEOH2019] Teoh et al. 2019, ES&T. https://doi.org/10.1021/acs.est.9b05608
- [TEOH2024] Teoh et al. 2024, ACP. https://doi.org/10.5194/acp-24-6071-2024
- [TEOH2025-vPM] ACP 2025 vPM paper. https://acp.copernicus.org/articles/25/18617/2025/
- [IATA-vPM] IATA summary. https://www.iata.org/en/iata-repository/publications/economic-reports/the-impact-of-vpm-on-contrail-cirrus-radiative-forcing
- [KARCHER2015] Kärcher et al. 2015, JGR. https://doi.org/10.1002/2015JD023491
- [KARCHER2018] Kärcher 2018, Nat. Commun. https://doi.org/10.1038/s41467-018-04068-0
- [BIER2024] Bier et al. 2024, ACP. https://acp.copernicus.org/articles/24/2319/2024/
- [LOTTERMOSER2026] Lottermoser et al. 2026, JGR. https://doi.org/10.1029/2025JD044604
- [ZINK2026] Zink et al. 2026, ACP. https://doi.org/10.5194/acp-26-3145-2026
- [MARQUART2005] Marquart et al. 2005 (cryoplane contrail RF). https://elib.dlr.de/18915/
- [PONATER2006] Ponater et al. 2006, Atmos. Environ. https://elib.dlr.de/44784/
- [GIERENS2021] Gierens 2021, Aerospace. https://doi.org/10.3390/aerospace8060164
- [SONABEND2024] Sonabend-W et al. 2024, Commun. Eng. https://doi.org/10.1038/s44172-024-00329-7
- [ICCT2009] https://theicct.org/publication/efficiency-trends-for-new-commercial-jet-aircraft-1960-to-2008/
- [ICCT2015] https://theicct.org/?p=1199
- [ICCT2020] https://theicct.org/wp-content/uploads/2021/06/Aircraft-fuel-burn-trends-sept2020.pdf
- [NEO-WIKI] https://en.wikipedia.org/wiki/Airbus_A320neo_family
- [AC2018] https://aircraft-commerce.com/wp-content/uploads/aircraft-commerce-docs/Flight%20Operations/2018/117_FLTOPS_A.pdf
- [AIRINSIGHT] https://airinsight.com/airbus-a320neo-family-fuel-burn-numbers/
- [PW-GTF] https://www.rtx.com/prattwhitney/products/commercial-engines/gtf/family
- [GE-RISE] https://www.geaerospace.com/news/articles/product/future-flight-engine-maker-unveils-new-technology-development-program-cut-co2
- [AIN2024] https://backend.ainonline.com/aviation-news/air-transport/2024-07-19/cfm-ramps-rise-open-fan-engine-testing
- [IE-JETZERO] https://interestingengineering.com/transportation/worlds-first-blended-wing-jet-promises-5000-nm-range-and-50-fuel-savings
- [AXIOS2026] https://axios.com/2026/04/22/blended-wing-airplane-design
- [CW-ZEROE] https://www.compositesworld.com/news/airbus-pushes-zeroe-aircraft-project-timeline-to-2040s
- [ELECTRIVE] https://www.electrive.com/2025/02/10/airbus-pauses-hydrogen-aviation-project

> **Fact-check (2026-10-22):** every claim here was checked in `plane-verification.md` (confirmed / corrected / unconfirmed). Corrections are applied in place; game-table CO2 ratios and anything UNCONFIRMED there are GAME ESTIMATES, not measurements.
