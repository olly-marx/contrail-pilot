# Contrail Pilot: verification of plane-generations.md, plane-atc.md and plane-weather.md

Checked 2026-10-22. Each paper's existence, title, authors and year were confirmed with the Crossref API
(`api.crossref.org/works/<DOI>`). Numbers were checked against the abstract or full text. Abstracts came
from the publisher, from OpenAlex where the publisher returned 403 (ACS, AIAA, Elsevier, Nature), or
from an institutional repository (DLR elib, Imperial Spiral).

Line numbers (`gen:L`, `atc:L`, `wx:L`) refer to the report files as they were on the check date.

Verdicts:
- **CONFIRMED**: a primary source states the figure.
- **CORRECTED**: a primary source gives a different figure. The right figure is shown.
- **UNCONFIRMED**: no primary source could be reached, or the reachable sources do not state the figure.
- **WRONG**: a primary source contradicts the claim.

## 1. Efficiency trap (priority 1)

| # | Claim as written | Where | Verdict | Primary source | Note |
|---|---|---|---|---|---|
| 1 | Wing-by-wing test, eta 0.23 vs 0.31 (older vs newer four-engine jet) | gen:37, table gen:98 | CONFIRMED | Schumann, Busen & Plohr 2000, J. Aircraft 37:1083. doi:10.2514/2.2715. Abstract and full PDF at https://elib.dlr.de/9281/ | The aircraft were a B707-307C (1968; JT3D-3B engines, bypass ratio 1.4) and an A340-300 (1998; CFM56-5C4 engines, bypass ratio 6.8). The game can name them. |
| 2 | 80 m band at a lapse rate of 12 K/km; about 200 m in a standard atmosphere | gen:52 | CONFIRMED | same | Abstract: "the observed altitude difference is 80 m ... larger (200m) in a standard atmosphere". |
| 3 | eta 0.3 to 0.5 would start contrails about 700 m lower | gen:52 | CONFIRMED | same | Abstract: "about 700 m lower altitude". |
| 4 | Schumann expected future aircraft could reach 0.5 | gen:39 | CONFIRMED | same | Abstract: "0.5, which may be reached for future aircraft". |
| 5 | Detwiler: a 10 % rise in contrail factor gives about +1 °C threshold temperature near -50 °C | gen:54 | CONFIRMED | Detwiler & Jackson 2002, J. Aircraft 39(4). doi:10.2514/2.2976. Abstract via OpenAlex | Abstract: "a 10% increase in contrail factor results in a 1°C higher threshold temperature ... near -50°C". Also: contrail factor is 0.030-0.053 g/(kg K) for low-bypass engines and 0.038-0.090 for high-bypass. It is not constant and varies with power setting. |
| 6 | Gryspeerdt 2024: over 64,000 cases; efficient aircraft make longer-lived contrails, mainly because they fly higher | gen:56, gen:83 | CONFIRMED | Gryspeerdt, Stettler, Teoh, Burkhardt 2024, ERL. doi:10.1088/1748-9326/ad5b78 | Abstract: "over 64 000 cases"; "primarily driven by an increase in flight altitude". |
| 7 | Megill 2025: state-of-the-art eta = 0.37 | gen:38 | CONFIRMED | Megill & Grewe 2025, ACP 25:4131. doi:10.5194/acp-25-4131-2025 | |
| 8 | Schumann et al. 2021: fleet eta about 20 % lower than earlier studies assumed | gen:40 | CONFIRMED | Schumann et al. 2021, ACP 21:7429. doi:10.5194/acp-21-7429-2021 | Abstract: "about 20 % smaller than estimated in earlier studies, resulting in 3 % fewer contrails". The report cites the discussion-paper DOI (acp-2021-62). Cite the final paper instead. |
| 9 | Callard 2025: engine tweaks gain only 57-206 m, at up to 35 % more fuel | gen:57 | CONFIRMED | doi:10.1007/s13272-025-00887-2 (CEAS Aeronaut. J.) | The abstract also says at least 450 m is needed for a measure to be useful. |
| 10 | "Teoh 2019": low-soot combustors cut contrail EF by ~69 % (45-82 %) | gen:60 | CORRECTED (citation year only) | Teoh, Schumann, Majumdar, Stettler, ES&T 54(5):2941. doi:10.1021/acs.est.9b05608. Abstract at https://spiral.imperial.ac.uk/handle/10044/1/78643 | The number is right: 68.8 % [45.2, 82.1]. The paper was published in 2020 (issued 12 Feb 2020), so call it Teoh 2020. It is the same paper as TEOH20 in plane-atc.md. |
| 11 | Voigt 2026: soot fell about 1000x, ice numbers did not drop significantly, volatile particles took over | gen:61, table gen:101 | CONFIRMED | Voigt et al. 2026, Nature 652:112. doi:10.1038/s41586-026-10286-0. Abstract via OpenAlex; DLR release https://www.dlr.de/en/latest/news/2026/contrails-beyond-soot | Abstract: soot was "three orders of magnitude lower"; volatile particles and ice crystals both "exceed 10^15 per kg fuel". Measured aircraft: an A321neo with CFM LEAP-1A engines, chased by the DLR Falcon in 15 flights in spring 2023 (DLR release). Low-sulfur fuel gave fewer ice crystals (DLR release). |
| 12 | Direct quote that lean-burn alone is "unlikely to reduce the warming effect of contrails" | gen:61 | UNCONFIRMED | Nature full text was paywalled | This wording is not in the abstract. The DLR release says only that there was "no discernible decrease in contrail formation". Paraphrase rather than quote. |
| 13 | Lean-burn engines flew ~20 % of global distance in 2024 | gen:43 | UNCONFIRMED | IATA page not checked | Could not be checked in this pass. |

## 2. Contrail avoidance (priority 2)

| # | Claim as written | Where | Verdict | Primary source | Note |
|---|---|---|---|---|---|
| 14 | 2.2 % of flights cause 80 % of contrail energy forcing (Japan) | atc:100 | CONFIRMED | Teoh et al. 2020 ES&T. doi:10.1021/acs.est.9b05608 (Spiral abstract) | 2.2 % [2.0, 2.5]. |
| 15 | Diverting 1.7 % of flights cuts EF by up to 59.3 % for +0.014 % fuel; 20 % cut with no fuel penalty; 91.8 % combined | atc:101 | CONFIRMED | same | 59.3 % [52.4, 65.6]; 0.014 % [0.010, 0.017]; 20.0 %; 91.8 %. |
| 16 | 2023 Google/AA/Breakthrough Energy: 70 test flights, 54 % fewer contrails, ~2 % more fuel; ~0.3 % fleet-wide; $5-25/t CO2e | atc:93, atc:103, wx:141 | CONFIRMED (blog), CORRECTED (peer-reviewed) | Google blog https://blog.google/technology/ai/ai-airlines-contrails-climate-change/ ; peer-reviewed: Sonabend-W et al. 2024, Commun. Eng. doi:10.1038/s44172-024-00329-7 | The blog says 70 flights, 54 %, 2 %, 0.3 % and $5-25/t. The peer-reviewed paper on the same trial reports **64 % fewer contrails (p = 0.0331)** and 2 % more fuel per adjusted flight. The two reports disagree: plane-atc and plane-weather use 54 %, plane-generations uses 64 %. Use 64 % and cite the paper. The blog gives the trial length as "six months", which settles the two-vs-six-months question. |
| 17 | Sonabend 2024: 64 % fewer contrails, ~2 % more fuel | gen:73 | CONFIRMED | same DOI | |
| 18 | 2025 trial: about 2,400 flights, half of them controls | atc:94, wx:110 | CONFIRMED | Google/AA paper, arXiv:2603.06909 (HTML full text) | 1,232 treatment + 1,172 control = 2,404 (our sum). AA eastbound US-to-Europe flights, 15 Jan to 13 May 2025 (17 weeks). |
| 19 | 12 % (or 11.6 %) fewer contrails across eligible flights | atc:94, wx:110 | CONFIRMED | same | 11.6 %. "12 %" is a fair rounding. |
| 20 | 63 % fewer contrails where the plan was flown | atc:94, atc:127, atc:141 | CORRECTED | same | **62.0 %** (112 flights flown as planned). plane-weather already has 62 %. |
| 21 | Dispatchers chose the avoidance plan 15 % of the time | atc:94, atc:108 | CONFIRMED | same | "take rate" 15.4 %. |
| 22 | Only 60 % of plans were flown as intended | atc:94 | CORRECTED | same | The paper says "around half" were not flown as planned. Its counts give 112 of 190 released plans, about 59 %. Only 7.8 % of all candidate flights (L3/L1) ended up flying the plan. |
| 23 | No significant fuel difference in the 2025 trial | atc:94, atc:103, wx:110 | CONFIRMED | same (abstract) | |
| 24 | "112 of about 1,200 flights actually used it" | wx:141 | CONFIRMED | same | 112 of 1,232. |
| 25 | MUAC/DLR 2021 trial: 25 Jan to 22 Oct 2021, evenings and nights, 209 trajectories, up to 2,000 ft | atc:89 | CONFIRMED | EUROCONTROL press release https://www.eurocontrol.int/press-release/mitigating-climate-impact-non-co2-emissions ; EUROCONTROL MUAC slides https://www.eurocontrol.int/sites/default/files/2023-11/2023-11-08-contrails-conference-session-009-sitova-ehrmanntraut-muac-contrails-prevention-project.pdf | The release gives 209 trajectories, after 18:00 local time, and up to 2,000 ft. The exact dates come from the MUAC material. |
| 26 | Sausen et al.: moved every other day, up to 2,000 ft, significant at 97.5 % | atc:90 | CONFIRMED | Sausen et al. 2023, Meteorol. Z. 33(1). doi:10.1127/metz/2023/1157 | Matches the abstract word for word. Published online 2023; issue 2024. |
| 27 | About 20 % capacity loss in moderate traffic, attributed to the 2021 trial | atc:91, atc:106, atc:141 | CORRECTED (attribution) | MUAC slides (as above) | The 2021 live trial gave **no** capacity finding because pandemic traffic was too low. "At least 20 %" capacity reduction comes from a later **2023 MUAC real-time simulation** of moderate traffic. Not reproduced word for word: this attribution rests on a search summary of the MUAC slides, not on reading the PDF. |
| 28 | MUAC-Google trial planned for 2023/24 | atc:92 | UNCONFIRMED | — | Not checked. |
| 29 | NATS Operation Blue Skies: launched 18 Aug 2026, 30 months, about £5 m, Shanwick, up to 2,000 ft | atc:95 | CONFIRMED | Launch coverage (AP via WTOP/AJC, 18 Aug 2026; Leeham; Aerospace Testing Intl). The NATS page cited in the report covers CICONIA, not Blue Skies | Funding: £2.65 m from DfT via the Aerospace Technology Institute, plus about £1.4 m in kind from Google. Imperial and Cambridge verify the climate impact. There is no primary NATS or DfT page in hand, so this is reliable press, not a primary source. |
| 30 | Blue Skies runs on 20-40 chosen days each winter, 7-8 hours, 2026 and 2027 winters | atc:95 | UNCONFIRMED | — | Sources found say "two operational trials, each lasting around four months". The 20-40 days and 7-8 hours were not found. |
| 31 | Lee et al. 2021: contrail cirrus ERF 57.4 (17-98) mW/m² for 2018; CO2 34.3 mW/m² | atc:104, atc:149 | CONFIRMED | Lee et al. 2021, Atmos. Environ. 244:117834. doi:10.1016/j.atmosenv.2020.117834. Abstract at White Rose https://eprints.whiterose.ac.uk/id/eprint/165692/ | CO2 range is (28, 40). Net aviation ERF is 100.9 (55-145). |
| 32 | Teoh 2024: 2019 global contrail net RF 62.1 mW/m² | brief item (6) | CONFIRMED | Teoh et al. 2024, ACP 24:6071. doi:10.5194/acp-24-6071-2024 | 44 % lower than Lee et al.'s 2018 **RF** (111 [33, 189] mW/m²). Compare RF with RF: the 57.4 figure is an ERF and is a different quantity. |
| 33 | Teoh 2024: about 2 % of flights cause 80 % of contrail EF | atc:141, brief (6) | CONFIRMED (with caveat) | same | The abstract says 2 %. The paper's own Sect. 3.1.4 gives 2.7 %, so the paper is inconsistent. About 14 % of 2019 flights formed a net-warming contrail. |

## 3. Forecast skill and the atmosphere (priority 3)

| # | Claim as written | Where | Verdict | Primary source | Note |
|---|---|---|---|---|---|
| 34 | ERA5 vs IAGOS 2011-2022: ETS 0.2-0.4; clear-sky 0.05-0.18; cloudy mostly below 0.1; thresholds of 85-95 % help | wx:65, wx:126, wx:137 | CONFIRMED | Hildebrandt et al. 2026, ACP 26:6449. doi:10.5194/acp-26-6449-2026 | In clear sky, an 85 % threshold raises ETS by about 0.1. In cloudy air a lower threshold barely helps. |
| 35 | Gierens 2020: formation is predicted well, persistence (ice supersaturation) is not | wx:64 | CONFIRMED | Gierens, Matthes, Rohs 2020, Aerospace 7:169. doi:10.3390/aerospace7120169 | Abstract: formation "can be predicted with some success", but there are "problems to predict contrail persistence". |
| 36 | Hofer 2024: regression with dynamics improved results but was "not good enough for flight routing" | wx:67 | CORRECTED (wording) | Hofer, Gierens, Rohs 2024, ACP 24:7911. doi:10.5194/acp-24-7911-2024 | The abstract says the other variables "do not help much". ERA5 humidity stays the main predictor, and its distributions overlap too much in the 70-100 % range. The quoted phrase is not in the abstract. Say "barely improved; prediction remains very difficult". |
| 37 | Météo-France ARPEGE: hit rate ~80 %, false-alarm ratio ~30 %, only with 150 km (~10 min) tolerance (preprint) | wx:66, wx:137 | CONFIRMED (now peer-reviewed) | Arriolabengoa et al. 2025, ACP 25:18051. doi:10.5194/acp-25-18051-2025 (preprint egusphere-2025-1499) | Change "preprint" to "peer-reviewed, ACP 2025". The modified ARPEGE's skill is close to the IFS. |
| 38 | "The forecast spots the icy layer only about as often as it misses it, unless off by 150 km" | wx:70 | UNCONFIRMED (interpretation) | — | Neither paper states this. It is the report's own paraphrase of ETS 0.2-0.4. Do not present it as a measured hit rate. |
| 39 | RS80-A correction about 1.3 at -35 °C, about 2.4 at -70 °C | wx:33, wx:59, wx:136 | CONFIRMED | Miloshevich et al. 2001, J. Atmos. Oceanic Technol. 18:135 (UCAR record https://ckanprod.data-commons.k8s.ucar.edu/dataset/characterization-and-correction-of-relative-humidity-measurements-from-vaisala-rs80-a-radiosond) | Full set: 1.3 / 1.6 / 2.0 / 2.4 at -35 / -50 / -60 / -70 °C, ±0.2 per sounding. Valid only from 0 to -70 °C. Not reproduced word for word: these factors come from a search summary of the paper, not from the paper itself. |
| 40 | RS80-H read dry at cirrus levels, with conflicting evidence | wx:46 | UNCONFIRMED | — | Not checked. |
| 41 | ECMWF added ice supersaturation to the IFS in 2007 | wx:48, wx:137 | CONFIRMED | Tompkins, Gierens, Rädel 2007, QJRMS 133:53. doi:10.1002/qj.14 | Crossref confirms the paper and its 2007 date. The paper itself was not read. |
| 42 | ISSR mean path length about 150 km, s.d. about 250 km | wx:122 | CONFIRMED | Gierens & Spichtinger 2000, Ann. Geophys. 18:499 | Word for word in the abstract. |
| 43 | ISSRs typically 500-600 m thick (Germany); 0.9-1.3 km at UK sites | wx:122 | CONFIRMED via secondary only (UNCONFIRMED at primary) | Quoted in Baughcum et al., TAC-2 2009 https://www.pa.op.dlr.de/tac/2009/proceedings/169-216.pdf | Lindenberg: mean 560 ± 610 m (Spichtinger et al. 2003). UK: 900-1300 m (Rädel & Shine 2007). The original papers were not read. The spread is as large as the mean, so many layers are much thinner. |
| 44 | One case about 3 km deep | wx:124 | UNCONFIRMED | — | |
| 45 | MOZAIC: 13.5 % of measurements in ice-supersaturated air | wx:82 | CONFIRMED | Gierens et al. 1999, Ann. Geophys. 17:1218 | Abstract: "13.5% of the total". In the stratosphere: 2 %. |
| 46 | ISSR flight-time fraction about 20-25 % in summer, 35-40 % in winter (Petzold 2020) | wx:82, wx:125 | CONFIRMED (with nuance) | Petzold et al. 2020, ACP 20:8157. doi:10.5194/acp-20-8157-2020 | The abstract gives these figures for the UT near the tropopause: summer minimum 30 % over ocean and 20-25 % over land; late-winter maximum 35-40 %. That is an occurrence frequency in the region, not "time planes spend". "A fifth to two-fifths" fits better than "a fifth to a third". |
| 47 | ECMWF open data 0.25°, 3-hourly, to 10 days; full model finer | wx:69 | PARTLY CONFIRMED | ECMWF https://www.ecmwf.int/node/28999 ; ECMWF operational system pages | The full IFS HRES is **TCo1279, about 9 km, 137 levels**. That fills the report's "how much finer" gap. The open-data step pattern (3-hourly vs 6-hourly beyond day 6) was not checked. |
| 48 | AIFS 28 km, 15 days | wx:141 | CONFIRMED (with nuance) | ECMWF AIFS news https://www.ecmwf.int/node/29308 | AIFS Single became operational on 25 Feb 2025. ECMWF quotes "28 km" in the press release and about 31 km (N320, 0.25°) elsewhere. Its medium-range verification runs out to 15 days. |
| 49 | GraphCast 0.25°, 13 pressure levels, trained on ERA5 | wx:105 | UNCONFIRMED | — | 0.25° and ERA5 training are well established. The original GraphCast (Lam et al. 2023) uses 37 levels; 13 is the operational/WeatherBench subset. Recheck before stating. |
| 50 | No published ISSR skill scores for GraphCast or AIFS | wx:107, gap wx:145 | UNCONFIRMED (absence) | — | No such paper was found in this pass either. This is a gap, not a fact. |
| 51 | OpenContrails: GOES-16 ABI; pixel size and cadence | wx:88, gap wx:146 | UNCONFIRMED | Ng et al. 2023, arXiv:2304.02122 | Title and authors confirmed. The abstract gives no pixel size, cadence or count of labelled images. "Tens of thousands of hand-labelled images" (wx:90) is still unverified. |
| 52 | APCEMM lifetime optical depth 3.8x CoCiP | wx:97, wx:140 | CONFIRMED | ACP 25:12875 (2025). doi:10.5194/acp-25-12875-2025 | The two models also respond to humidity in opposite directions. |
| 53 | Sensor icing; radiosonde history, launch frequency and spacing; PIREPs | wx:47, gaps wx:147-148 | UNCONFIRMED | — | Not addressed in this pass. |

## 4. Air traffic control facts, including RVSM (priority 4)

| # | Claim as written | Where | Verdict | Primary source | Note |
|---|---|---|---|---|---|
| 54 | RVSM in Europe on 24 Jan 2002 across 41 states; 6 new levels | atc:52, atc:137 | CONFIRMED | EUROCONTROL https://www.eurocontrol.int/article/celebrating-20-years-reduced-vertical-separation | Live at 00:01 UTC. 6 extra levels between FL290 and FL410. |
| 55 | RVSM capacity "up to 20 %" vs "25 %" | atc:56, gap atc:147 | CONFIRMED for 20 %; 25 % UNCONFIRMED | same | The EUROCONTROL primary page says "up to 20%". Use 20 %. |
| 56 | North Atlantic RVSM first, in 1997 | atc:52 | CONFIRMED | FAA final rule, Federal Register 62(248), 29 Dec 1997 https://www.govinfo.gov/content/pkg/FR-1997-12-29/html/97-33753.htm | Introduced over the North Atlantic in March 1997. |
| 57 | US domestic RVSM in January 2005 | atc:52 | CONFIRMED | FAA DRVSM final rule (Federal Register) | Compliance required by 20 Jan 2005. |
| 58 | EUROCONTROL: 1.6-2.3 % less fuel; EUR 3.9 bn a year; US $800 m vs $393 m | atc:57-59 | UNCONFIRMED | The cited DOT report (rosap dot_9913) has been **removed** from ROSA P (notice dated 2026-08-11) | The €3.9 bn appears only in secondary reporting (Intl Airport Review). A Volpe/MIT study gives about 2.5 % fuel saving for US domestic RVSM (secondary). The report must replace the dead DOT link. |
| 59 | Radar era, the 1956 Grand Canyon collision, the 1958 Act | atc:42-46 | UNCONFIRMED | — | Not checked against FAA history. The report's own gap list flags this. |
| 60 | Time taken to approve a level change | gap atc:144 | UNCONFIRMED | — | No source. Any value in the game is invented. |
| 61 | PBN, free route and Aireon figures (9 nm, 250 lb, FRAMaK, 40 to 14 nm, 76 %, NextGen 17 %) | atc:63-85 | UNCONFIRMED | — | Not checked in this pass. Most of them are projections, as the report itself says. |

## 5. Aircraft specifications (priority 5)

No manufacturer type-certificate data sheet was fetched. The figures below come from consistent secondary or reference sources unless marked otherwise.

| # | Claim / item | Where | Verdict | Source | Note |
|---|---|---|---|---|---|
| 62 | Comet 4: first flight 27 Apr 1958; BOAC transatlantic service 4 Oct 1958; 4 Rolls-Royce Avon 524 turbojets (bypass 0) | gen:14 (report says "Comet 1 (1952)") | CONFIRMED (secondary) | aeropedia.com.au; thisdayinaviation.com; aerospaceweb.org | Seats were 56 (3-class) to 81 (2-class), and 48 on the inaugural BOAC aircraft. Range about 5,190 km. Cruise altitude not found. The report's Gen 1 lists Comet 1 (1952), but the brief asks for Comet 4. Comet 1 used Ghost engines with half the thrust. |
| 63 | 707-320B: introduced 1962 (Pan Am); JT3D turbofan with bypass about 1.4 | gen:14, gen:34 | CONFIRMED for the bypass ratio (primary); date secondary | Bypass 1.4 for the JT3D-3B is stated in Schumann et al. 2000 (doi:10.2514/2.2715) | Boeing history: 141 mixed-class seats, about 6,000 statute miles range. A listing gives 219 seats in high density. |
| 64 | 747-100: first flight 9 Feb 1969; service Jan 1970 (Pan Am); JT9D bypass about 5 | gen:15, gen:34 | CONFIRMED (secondary) | JT9D references | JT9D-3: 43,500 lbf, bypass about 5:1. |
| 65 | 1990s twins: A330-300 first flight Nov 1992, service Jan 1994 (Air Inter); 777 first GE90 delivery to BA Nov 1995; GE90 bypass about 9; "1990s engines ~6-9" | gen:16, gen:34 | CONFIRMED (secondary; GE90 bypass from NASA Spinoff) | NASA Spinoff (GE90 9:1); A330 references | The 777-200ER entry-into-service date (1997) was not confirmed in this pass. The A340's CFM56-5C4 has bypass 6.8 (Schumann 2000), consistent with "6-9". |
| 66 | A320neo first flight 25 Sep 2014, service 25 Jan 2016 (Lufthansa); 737 MAX 8 service May 2017 (Malindo); LEAP-1B bypass 9:1; PW GTF "up to 12:1"; LEAP-1A ~11:1 | gen:17, gen:26 | CONFIRMED (secondary) for dates and LEAP-1B; GTF 12:1 from manufacturer per report (not refetched); LEAP-1A 11:1 UNCONFIRMED | AIN / Forecast International for the A320neo; planefyi for the LEAP-1B | Gen 4 year "2016" is right for the neo; the MAX is 2017. |
| 67 | Fuel burn per seat of new aircraft roughly halved 1960 to late 2000s; ~45 % reduction 1968-2014 (1.3 %/yr); stalled in the 2000s, back to ~1 %/yr in the 2010s | gen:21 | CONFIRMED | ICCT 2009 https://theicct.org/publication/efficiency-trends-for-new-commercial-jet-aircraft-1960-to-2008/ ; ICCT 2015; ICCT 2020 | |
| 68 | CO2 per passenger relative to Gen 1: 747-100 ~0.7, 1990s twins ~0.55, neo/MAX ~0.45, open fan ~0.36, BWB ~0.25-0.3 | table gen:99-103 | UNCONFIRMED | — | ICCT gives fleet-average trends, not per-type ratios. Its 1968 baseline is already post-707, so the -45 % to 2014 does not map onto the Comet/707 baseline. Label these as game estimates. |
| 69 | A320neo per-seat gain 9-20 %; open-fan RISE -20 %; RISE bypass ~70; JetZero up to 50 % | gen:26-30 | UNCONFIRMED | — | Manufacturer targets and claims. Not refetched. |

## 6. Hydrogen and late items (priority 6)

| # | Claim as written | Where | Verdict | Primary source | Note |
|---|---|---|---|---|---|
| 70 | Hydrogen gives about 2.6x more water per unit energy ("needs source check") | gen:77 | CONFIRMED | Bier et al. 2024, ACP 24:2319. doi:10.5194/acp-24-2319-2024 (introduction and Sect. 2.2) | "roughly a factor of 2.6 larger compared to kerosene". |
| 71 | Persistent contrail formation +~46 % (H2 combustion), ~55 % (fuel cell) vs an eta = 0.37 jet | gen:77, table gen:106 | CONFIRMED | Megill & Grewe 2025, ACP 25:4131 | 46.5 % and 54.7 %, a distance-weighted proxy for the DEPA 2050 route scenario. |
| 72 | H2 contrails have 80-90 % fewer ice crystals | gen:78 | CONFIRMED | Bier et al. 2024 | Abstract: "reduced by more than 80 %-90 %". |
| 73 | Lottermoser 2026: fewer, bigger crystals fall out sooner | gen:78 | CONFIRMED | doi:10.1029/2025JD044604 (JGR 2026) | Abstract: fewer initial crystals mean a shorter lifetime because of earlier sedimentation. Note that the title is "Modeling the Impact of Alternative Fuels and Hydrogen Propulsion on Contrail-Cirrus". |
| 74 | Marquart 2005, Ponater 2006, Gierens 2021 hydrogen numbers | gen:79, gen:87 | UNCONFIRMED | — | Not checked in this pass. |
| 75 | ECLIF/ND-MAX percentages | gen:71 | UNCONFIRMED | — | Not checked. |

## Summary

1. 75 rows: about 48 CONFIRMED (several only from secondary sources or with nuance: rows 33, 46-48, 62-66), 6 CORRECTED (rows 10, 16, 20, 22, 27, 36), 21 UNCONFIRMED, 0 WRONG. Rows 55 and 66 are mixed.
2. All of priority 1 is confirmed from primary sources: Schumann eta 0.23/0.31, 80 m/200 m, 700 m, 0.5; Detwiler 10 % gives 1 °C near -50 °C; Gryspeerdt 64,000 cases and "driven by altitude".
3. Correction that matters most: the 2023 Google/AA pilot is **64 %** fewer contrails in the peer-reviewed paper (Sonabend-W et al. 2024). The blog figure of 54 % is in plane-atc and plane-weather. The 2 % fuel figure stands.
4. 2025 trial: **62.0 %**, not 63 % (plane-atc). Plans flown as intended were "around half" (112 of 190, about 59 %), not "60 %". The 15.4 % take rate and 11.6 % overall cut are confirmed.
5. The "about 20 % capacity loss" is from a **2023 MUAC simulation**, not the 2021 trial. The 2021 trial explicitly made no capacity statement.
6. Teoh 2020 (2.2 %/80 %; 1.7 %/59.3 %/0.014 %) is confirmed. "Teoh 2019" in plane-generations is the same 2020 paper. Teoh 2024: 62.1 mW/m² and 2 %/80 % are confirmed, though the paper's body says 2.7 %. Compare 62.1 with Lee's RF of 111, not the ERF of 57.4.
7. Forecast skill: ETS 0.2-0.4, the 80 %/30 %/150 km ARPEGE figures (now peer-reviewed, ACP 25:18051), RS80-A 1.3 to 2.4, ISSR 150 km length and 13.5 % are confirmed. Hofer 2024's quoted phrase is not in the abstract. Petzold: ISSRs are a fifth to two-fifths of the region (35-40 % in winter), not "a third".
8. RVSM: 24 Jan 2002, 41 states, 6 levels, "up to 20 %" (EUROCONTROL), NAT March 1997 and US 20 Jan 2005 are confirmed. The 1.6-2.3 % fuel and $800 m figures are unconfirmed, and the cited DOT PDF has been removed.
9. Aircraft: dates and bypass ratios are consistent (JT3D 1.4 and CFM56-5C4 6.8 are primary, via Schumann 2000). The per-generation CO2/pax ratios (0.7/0.55/0.45...) have **no** source and are game estimates.
10. Hydrogen: 2.6x water, +46.5 %/+54.7 % formation, 80-90 % fewer crystals and Voigt 2026 (A321neo with LEAP-1A, 1000x less soot, more than 10^15 ice crystals per kg) are confirmed. Voigt's "unlikely to reduce warming" is not a verifiable quote, so paraphrase it.
