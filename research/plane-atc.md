# Air traffic control generations and contrail avoidance: research for Contrail Pilot

Compiled 2026-10-22 from web searches. Confidence tags:
**SOLID** means a primary or official source states it directly.
**LIKELY** means trade press or secondary reporting, consistent across sources.
**UNSURE** means a single weak source, sources that disagree, or a projection rather than a measurement.
Anything with no source is labelled **GAME PROPOSAL** and is not a factual claim.

I found **no sourced number for "how long it takes to get a level change approved"** in any generation. Every timing in the game table is a design choice, not a fact.

## Source keys

| Key | Source |
|---|---|
| FAA-LEAGUE | FAA blog, "A chair, a wheelbarrow and two flags": https://www.faa.gov/blog/clearedfortakeoff/chair-wheelbarrow-and-two-flags ; Wikipedia: https://en.wikipedia.org/wiki/Archie_League |
| GC1956 | Grand Canyon 1956 collision (secondary only): https://migflug.com/afterburner/1956-grand-canyon-mid-air-collision-faa/ ; https://thenationalparksexperience.substack.com/p/collision-over-the-grand-canyon-how |
| EC-RVSM20 | EUROCONTROL, "Celebrating 20 years of reduced vertical separation": https://www.eurocontrol.int/article/celebrating-20-years-reduced-vertical-separation |
| IAR-RVSM10 | International Airport Review, RVSM 10th anniversary: https://www.internationalairportreview.com/news/7702/eurocontrol-celebrates-the-10th-anniversary-of-rvsm |
| FAA-DRVSM | Aviation Today, domestic RVSM: https://www.aviationtoday.com/2006/04/01/editors-note-domestic-rvsm-the-next-steps/ ; DOT report https://rosap.ntl.bts.gov/view/dot/9913/dot_9913_DS1.pdf |
| PBN-AT | Aviation Today on Alaska Airlines RNP: https://www.aviationtoday.com/2012/09/01/routing-rnp/ ; https://www.aviationtoday.com/2014/06/27/alaska-airlines-saving-fuel-through-nextgen-procedures/ ; ICAO PBN slides https://www.icao.int:443/APAC/Meetings/2011_PBN/Presentation11%20J%20RuppertPBN%20Task%20Force%20Seminar.pdf |
| FRA-FRAMAK | ATC Network, FRAMaK free routes: https://www.atc-network.com/atc-news/dfs-deutsche-flugsicherung-gmbh/significant-savings-on-european-flight-routes |
| FRA-MUAC | EUROCONTROL, MUAC implements 24-hour free route airspace: https://www.eurocontrol.int/news/muac-implements-h24-fra |
| FAA-NEXTGEN | FAA, ICAO Stocktaking 2020 slides: https://www2023.icao.int/Meetings/Stocktaking2020/Documents/ICAO%20Stocktaking%202020%20-%202.3.5%20-%20Arthur%20Orton.pdf ; AIN 2010: https://ainonline.com/aviation-news/business-aviation/2010-08-27/next-gen-atc-promises-environmental-rewards |
| SESAR-2010 | SESAR at ICAO Colloquium 2010: https://www.icao.int:443/Meetings/EnvironmentalColloquium/Documents/2010-Colloquium/4_Siebert_SESAR.pdf |
| AIREON | Flight Safety Australia: https://www.flightsafetyaustralia.com/2019/04/real-time-tracking-trial-begins-over-the-north-atlantic/ ; AIN: https://ainonline.com/aviation-news/business-aviation/2019-04-02/aireons-space-based-system-ads-b-goes-live |
| MUAC-PR | EUROCONTROL press release on 2021 contrail trial: https://www.eurocontrol.int/press-release/mitigating-climate-impact-non-co2-emissions |
| SAUSEN | Sausen et al., Meteorologische Zeitschrift 33(1) 83-98 (2023 online / 2024): https://doaj.org/article/4f97e6c23af24915a04ae1ace2741973 ; DLR news: https://www.dlr.de/en/pa/latest/news/2023/changing-flight-altitudes-avoids-the-formation-of-climate-damaging-contrails |
| MUAC-2023 | EUROCONTROL MUAC contrail prevention slides, Nov 2023: https://www.eurocontrol.int/sites/default/files/2023-11/2023-11-08-contrails-conference-session-009-sitova-ehrmanntraut-muac-contrails-prevention-project.pdf |
| GOOG-AA23 | Google/American Airlines/Breakthrough Energy 2023 result, reported at: https://www.offshore-technology.com/news/ai-cuts-climate-warming-contrails-of-planes-by-54-google-study/ ; https://avweb.com/?p=128987 ; https://the-decoder.com/ai-controlled-flight-paths-reduce-contrails-to-help-protect-the-climate/ |
| GOOG-AA26 | Larger Google/AA trial, arXiv 2603.06909: https://arxiv.org/abs/2603.06909 ; summary by Hannah Ritchie: https://hannahritchie.substack.com/p/contrails-google-ai |
| BLUESKIES | NATS / Google / UK DfT "Operation Blue Skies": https://www.nats.aero/about-us/research/n/contrail-avoidance/ ; https://leehamnews.com/2026/08/18/north-atlantic-airspace-scale-contrail-trial-underway/ ; https://aerocorner.com/news/operation-blue-skies-contrail-trial/ |
| TEOH20 | Teoh et al. 2020, Environ. Sci. Technol.: https://spiral.imperial.ac.uk/handle/10044/1/78643 ; Imperial news: https://www.imperial.ac.uk/news/195294/small-altitude-changes-could-contrail-impact/ |
| LEE21 | Lee et al. 2021, Atmos. Environ. (figures as quoted by later ACP papers): https://acp.copernicus.org/articles/24/6071/2024/ (Teoh et al. 2024) |
| EC-CCO | EUROCONTROL CCO/CDO concept page: https://www.eurocontrol.int/concept/continuous-climb-and-descent-operations ; https://www.eurocontrol.int/article/collaboration-will-be-key-realising-full-benefits-continuous-descent-operations |
| ENAIRE | ENAIRE CDO release 2022: https://enaire.es/en_GB/2022_09_27/ndp_enaire_improves_continuous_descent_operations |

## 1. The ladder of ATC generations

### Gen 1: Flags, radio and fixed airways (1929 to 1950s)
- **Year:** 1929. Archie League, generally called the first US air traffic controller, began at St Louis's airfield using flags (red for hold, checkered for go), working from a wheelbarrow-mounted setup. He became its first radio controller in the early 1930s. **SOLID** [FAA-LEAGUE]
- **Kid version:** A person on the ground waved flags to tell planes when to go. Later they talked by radio, and planes flew along set "roads in the sky", reporting where they thought they were.
- **What it changed:** Without radar, controllers often had only a rough idea where a flight was. The 1956 Grand Canyon collision, where two airliners hit each other, is described as caused partly by "insufficiency of en route air traffic advisory information". It led towards the US Federal Aviation Act of 1958. **UNSURE** (secondary sources only) [GC1956]
- **Numbers on flight levels, fuel or delays:** none found.

### Gen 2: Radar control (late 1950s onward)
- **Year:** After 1958 the new Federal Aviation Agency is described as bringing in radar-based control nationwide. **UNSURE** (single blog-style source) [GC1956]
- **Kid version:** Controllers can now see every plane as a dot on a screen, so they can space them out and move them safely.
- **What it changed:** Above FL290 the vertical spacing stayed at 2,000 ft until RVSM (see Gen 3), which follows from the RVSM sources. **SOLID** [EC-RVSM20]
- No sourced fuel or delay numbers.

### Gen 3: RVSM, more flight levels (1997 North Atlantic, 2002 Europe, 2005 USA)
- **Year:** Europe on 24 January 2002, across 41 states. **SOLID** [EC-RVSM20, IAR-RVSM10]. North Atlantic first in 1997. **LIKELY** [IAR-RVSM10 search coverage]. US domestic in January 2005. **SOLID** [FAA-DRVSM]
- **Kid version:** Planes got better at holding their height exactly, so controllers allowed them to fly 1,000 ft apart instead of 2,000 ft up high. That made room for six new "lanes" between FL290 and FL410.
- **What it changed:**
  - Vertical separation from 2,000 ft to 1,000 ft above FL290; six new flight levels between FL290 and FL410. **SOLID** [EC-RVSM20, IAR-RVSM10]
  - Capacity gain: EUROCONTROL quotes "up to 20%" in one article and "25%" in another. **UNSURE** (they disagree) [EC-RVSM20, IAR-RVSM10]
  - Europe: a EUROCONTROL study found 1.6 to 2.3% less fuel burn. **LIKELY** [FAA-DRVSM, citing EUROCONTROL]
  - Europe: about EUR 3.9 billion a year average benefit to operators, mainly less delay and fuel. **LIKELY** [IAR-RVSM10]
  - USA: savings in the first year were reported as possibly $800 million against a $393 million estimate. **LIKELY** [FAA-DRVSM]
- **Contrail link:** More levels means more chances to find a level that is not icy and humid. This is a reasonable inference, not a sourced claim.

### Gen 4: Area navigation and PBN, flying your own line (1990s to 2010s)
- **Year:** Alaska Airlines first used RNP (a precise form of PBN) at Juneau in 1996, threading the Gastineau Channel between mountains. **LIKELY** [PBN-AT]
- **Kid version:** Instead of flying from radio beacon to radio beacon like a dot-to-dot, a plane's computer and GPS let it fly any accurate line, even curved paths between mountains.
- **What it changed:**
  - RNP approaches shortened an approach by about 9 nm and saved about 250 lb of fuel each. In 2011 they saved Alaska Airlines 210,000 gallons and $19 million across 27 airports. **UNSURE** (airline and trade-press figures) [PBN-AT]
  - Alaska projected about 87 gallons, around 9 minutes and about 1 tonne of CO2 saved per Seattle landing. **UNSURE** (a projection) [PBN-AT]

### Gen 5: Free route airspace, Europe (2010s onward)
- **Year:** Rolled out across Europe in the 2010s. MUAC (Maastricht) runs it 24 hours a day. **LIKELY** [FRA-MUAC]
- **Kid version:** Above a certain height there are no fixed roads at all. You choose your own straight line from entry to exit point, like walking across a field instead of following the paths.
- **What it changed:**
  - FRAMaK project: 466 direct routes over Belgium, Germany, Luxembourg and the Netherlands. Projected yearly savings about 1.5 million nm, about 9,000 t of fuel and about 30,000 t of CO2. Up to 80% of eligible aircraft used them. **LIKELY** (projection) [FRA-FRAMAK]
  - MUAC 24-hour free route: up to 40 t of fuel and 150 t of CO2 a day *if all flights use it fully*. **LIKELY** (an upper bound) [FRA-MUAC]

### Gen 6: Satellite surveillance and trajectory-based operations (2019 onward)
- **Year:** Aireon space-based ADS-B went live in April 2019. The first trial was over the North Atlantic, with NATS and NAV Canada. **SOLID** [AIREON]
- **Kid version:** Every plane broadcasts where it is, and satellites hear it even over the middle of the ocean, where there is no radar. Controllers can see you everywhere, so planes can fly closer and change course more easily. Trajectory-based operations means the plane and the ground share one agreed 4D plan (where you'll be, and when).
- **What it changed:**
  - North Atlantic in-trail separation could drop from 40 nm to as little as 14 nm. **LIKELY** (described at trial launch) [AIREON]
  - Projected up to $300 and about 2 t of CO2 saved per transatlantic flight. **UNSURE** (a projection by NATS and ICAO) [AIREON]
  - Over 95% of North Atlantic traffic was already ADS-B equipped. **LIKELY** [AIREON]
  - Expected safety-risk cut of about 76% in the North Atlantic. **UNSURE** (a projection) [AIREON]
  - FAA NextGen: 17% average CO2-per-flight reduction "measured 2010-2019" for the whole modernisation package. **UNSURE** (one FAA slide; the method is unclear) [FAA-NEXTGEN]
  - Oceanic trajectory demonstrations: 3 to 5% fuel saved per flight. **UNSURE** (2010 demonstrations) [FAA-NEXTGEN]
  - SESAR goal: 10% less ATM CO2 per flight. **SOLID** that this was the stated target (2010) [SESAR-2010]

### Gen 7: Contrail-aware ATC (2021 trials to today)
- **MUAC and DLR, 2021:** Ran from 25 January to 22 October 2021, on selected evenings and nights. Controllers moved flights off their planned level wherever ice-supersaturated regions were forecast. 209 trajectories were included. Avoidance worked with vertical changes of about 2,000 ft. **SOLID** [MUAC-PR]
  - The peer-reviewed paper reports that flights were moved every other day by up to 2,000 ft up or down, checked against satellite images. The trial was significant at the 97.5% level, meaning that on average persistent contrails can be avoided in the real world. **SOLID** [SAUSEN]
  - Limits: forecasting contrail regions is hard, and so is checking contrails from geostationary satellite images. Capacity impact is low at low traffic, but **about 20% capacity reductions** can be expected in moderate traffic for safety reasons. **SOLID** [MUAC-PR]
  - A MUAC-Google trial was planned for 2023/24. **LIKELY** that it was planned; I found no published results [MUAC-2023]
- **Google, American Airlines and Breakthrough Energy, 2023:** Pilots flew 70 test flights using AI contrail forecasts. Satellite analysis showed **64% fewer contrails** (peer-reviewed: Sonabend-W et al. 2024, doi:10.1038/s44172-024-00329-7; Google's blog said 54%), and avoiding flights burned **about 2% more fuel**. Spread across an airline's whole fleet, the extra fuel might be as little as 0.3%, which puts avoidance at about $5 to $25 per tonne of CO2-equivalent. **LIKELY** (press reports of Google's results; sources disagree on whether it ran for two or six months) [GOOG-AA23]
- **Google and American Airlines larger trial (published 2026):** About 2,400 eastbound transatlantic flights, half of them a control group. Across the 1,232 eligible flights, contrails fell by only **12%**. Flights that actually flew the avoidance plan saw **62.0%** fewer. Dispatchers chose the avoidance plan only **15%** of the time, and only **60%** of plans were flown as intended. There was no statistically significant fuel increase. **LIKELY** (secondary summary; I did not read the arXiv paper itself) [GOOG-AA26]
- **NATS "Operation Blue Skies" (UK, launched 18 August 2026):** A 30-month, £5 million trial in Shanwick oceanic airspace. Google AI forecasts contrail regions, and controllers can shift altitude by up to 2,000 ft. It runs on only 20 to 40 chosen days each winter, for seven to eight hours in quieter traffic, across the 2026 and 2027 winters. **LIKELY** [BLUESKIES]
- **Kid version:** The controller now has a map of the invisible icy-humid patches. If your plane is about to draw a long-lasting warming contrail, especially at night, they nudge you up or down a couple of thousand feet.

## 2. Contrail avoidance in practice

- **Few flights do most of the harm:** In Japanese airspace, 2.2% of flights caused 80% of contrail energy forcing. **SOLID** (a model study, one region) [TEOH20]
- **Small diversions:** Moving about 1.7% of flights 2,000 ft up or down could cut contrail forcing by up to 59.3%, for only 0.014% more total fuel and CO2. Diverting only flights with no fuel penalty still gave about a 20% cut. Adding cleaner engines on top could reach 91.8%. **SOLID** (as a model result) [TEOH20]
- **Typical altitude change:** About 2,000 ft in every source: the 2021 MUAC trial, the Teoh model and Blue Skies. **SOLID** [MUAC-PR, SAUSEN, TEOH20, BLUESKIES]
- **Fuel cost:** About 2% more per avoiding flight in the 2023 Google/AA test, about 0.3% fleet-wide, and none significant in the larger trial. **LIKELY** [GOOG-AA23, GOOG-AA26]
- **How big contrails are for climate:** In Lee et al. 2021 (for 2018), contrail cirrus effective radiative forcing was 57.4 (17 to 98) mW/m2, about 67% larger than aviation CO2's 34.3 mW/m2. The uncertainty is very wide, and Teoh et al. 2024 estimated a lower contrail forcing for 2019. Unlike CO2, contrail warming disappears within hours once you stop making them, whereas CO2 lasts for centuries (a general fact; no specific source pulled here). **SOLID** for the numbers, with large uncertainty [LEE21]
- **Limits:**
  - Forecast accuracy: forecasting ice-supersaturated regions is "difficult in practice". **SOLID** [MUAC-PR]
  - Capacity and controller workload: about 20% capacity loss in moderate traffic (corrected attribution: from a 2023 MUAC SIMULATION; the 2021 live trial made no capacity statement because traffic was too low), which is why trials run at night or on quiet days. **SOLID** [MUAC-PR, BLUESKIES]
  - Human uptake: with voluntary uptake, dispatchers used the avoidance plan only 15% of the time. **LIKELY** [GOOG-AA26]
  - Verification: satellites struggle to confirm which plane made which contrail. **SOLID** [MUAC-PR]

## 3. Continuous climb and descent, and other fuel-saving ATC ideas

- **CCO/CDO:** The plane climbs or descends smoothly instead of in steps with level-offs, which saves fuel and noise. **SOLID** [EC-CCO]
- A 2018 EUROCONTROL study put the potential across European (ECAC) airspace at about 340,000 t of fuel and over 1 million t of CO2 a year. 94% of flights climb continuously up to FL100, but only 74% do so all the way to cruise. **LIKELY** (as reported) [EC-CCO]
- Only a "modest portion" of the possible benefit is being realised. **SOLID** [EC-CCO]
- Spain (ENAIRE) authorised 36% of approaches as continuous descents in 2021, against a European average of 18%. **SOLID** [ENAIRE]
- Other ideas covered above: free routes, PBN short-cuts, and reduced oceanic separation, which lets planes get their preferred level more often.

## 4. True and surprising things a kids' game could use

1. The first air traffic controller used two flags and sat by a wheelbarrow (St Louis, 1929). [FAA-LEAGUE] SOLID
2. In 2002, Europe added six new "sky lanes" overnight by allowing 1,000 ft instead of 2,000 ft up high, across 41 countries at once. [EC-RVSM20] SOLID
3. About 2 in every 100 flights make about 80% of the contrail warming (in one study region), so you only need to move a few planes. [TEOH20] SOLID
4. Moving up or down about 2,000 ft, roughly the height of one and a half Burj Khalifas (828 m each; 2,000 ft is 610 m), is usually enough. [BLUESKIES gives 610 m] SOLID for 610 m
5. Over the middle of the ocean there is no radar, so until satellites listened in (2019), planes there were kept up to 40 nm apart nose to tail. [AIREON] LIKELY
6. Trials of contrail avoidance mostly happen at night and on quiet days, because night contrails trap heat and quiet skies leave controllers room. [MUAC-PR, BLUESKIES] SOLID
7. Real life twist: in the big 2026-published trial, the avoidance plans worked (62.0% fewer contrails) but people picked them only 15% of the time (corrected from 63%). The hardest part is getting humans to use the tool. [GOOG-AA26] LIKELY

## Game-ready summary

The unlock column is **GAME PROPOSAL** throughout. The flying controls never change; only permission, warning and reward change.

| Gen | Year | Unlocks in game (proposal) | Real-world effect (numbers) | Fun fact | Sources |
|---|---|---|---|---|---|
| 1 Flags and airways | 1929 | Fixed route; height changes only at set waypoints; long wait for permission | No sourced numbers | First controller used flags by a wheelbarrow | FAA-LEAGUE |
| 2 Radar | late 1950s | Height change allowed anywhere, after a delay; 2,000 ft steps up high | Followed the 1956 Grand Canyon collision (UNSURE) | Before radar, controllers often had only a rough idea where planes were | GC1956 |
| 3 RVSM | 2002 EU / 2005 US | Twice as many cruise levels (1,000 ft steps above FL290) | 6 new levels; up to 20-25% more capacity; 1.6-2.3% less fuel (EU) | 41 countries switched on one night | EC-RVSM20, IAR-RVSM10, FAA-DRVSM |
| 4 PBN/RNAV | 1996 onward | Shortcut / curved route option; small fuel bonus | RNP approach about 9 nm shorter, about 250 lb fuel (UNSURE) | First used to fly between mountains at Juneau, Alaska | PBN-AT |
| 5 Free route | 2010s | Choose your own straight line; route bonus | FRAMaK projection about 30,000 t CO2/yr; MUAC up to 150 t CO2/day | Up to 80% of eligible planes took the direct routes | FRA-FRAMAK, FRA-MUAC |
| 6 Satellite ADS-B and 4D trajectories | 2019 | Seen everywhere, even over ocean; faster approvals; see traffic further ahead | Ocean spacing 40 nm to 14 nm; projected about 2 t CO2/flight (UNSURE); NextGen 17% CO2/flight (UNSURE) | Satellites hear planes over the middle of the Atlantic | AIREON, FAA-NEXTGEN |
| 7 Contrail-aware ATC | 2021 trials; 2026 Blue Skies | ISSR warning ahead; controller offers a ±2,000 ft nudge; limited in busy skies | 64% fewer contrails (peer-reviewed; blog said 54%) for about 2% extra fuel on 70 flights; 62.0% where the plan was flown; about 20% capacity cost in moderate traffic | About 2% of flights cause about 80% of contrail warming | MUAC-PR, SAUSEN, GOOG-AA23, GOOG-AA26, BLUESKIES, TEOH20 |

## Biggest gaps and uncertainties
- No source gives the time it takes to get a level change approved, for any generation. Any timing in the game is invented.
- The radar-era dates and causes rest on weak secondary sources. They should be checked against FAA history pages.
- RESOLVED: the 2023 Google/AA pilot is 64% fewer contrails in the peer-reviewed paper (Sonabend-W et al. 2024); 54% was the blog figure; ~2% fuel stands.
- RVSM capacity gain is stated as both 20% and 25% by EUROCONTROL.
- Most fuel and CO2 savings for free routes, PBN and Aireon are projections, not measurements.
- Contrail forcing itself carries very wide uncertainty (17 to 98 mW/m2 ERF in Lee et al. 2021).
- The Consensus paper search was not used; peer-reviewed claims come from web-located abstracts.

> **Fact-check (2026-10-22):** every claim here was checked in `plane-verification.md` (confirmed / corrected / unconfirmed). Corrections are applied in place; game-table CO2 ratios and anything UNCONFIRMED there are GAME ESTIMATES, not measurements.
