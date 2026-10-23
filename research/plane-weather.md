# Weather-prediction generations for Contrail Pilot

Research notes for a progression track of "weather prediction generations". These generations decide how early and how accurately icy humid air (ice-supersaturated regions, ISSRs) is revealed ahead of the plane.

Confidence labels:
- **SOLID**: a primary paper or official page states it, and I read the claim in search output from that source.
- **LIKELY**: secondary reporting, or a figure from one study that may not generalise.
- **UNSURE**: weak or indirect support. Check before using as a fact in the game.

Research date: 2026-10-22. I did not open any full PDFs. Every number comes from abstracts, snippets or secondary summaries, so each one should be checked against the original before it goes on a game screen.

## Source keys

| Key | Source |
|---|---|
| HIL26 | Hildebrandt et al. 2026, ACP 26, 6449: ERA5 vs IAGOS ISSR skill. https://acp.copernicus.org/articles/26/6449/2026/ |
| GIE20 | Gierens, Matthes, Rohs 2020, "How well can persistent contrails be predicted?", Aerospace 7, 169. https://elib.dlr.de/137051 (DOI 10.3390/aerospace7120169) |
| HOF24 | Hofer, Gierens, Rohs 2024, ACP 24, 7911. https://acp.copernicus.org/articles/24/7911/2024/ |
| TOM07 | Tompkins, Gierens, Rädel 2007, ice supersaturation in the ECMWF IFS, QJRMS. https://reading-clone.eprints-hosting.org/815 |
| ARP25 | Météo-France ARPEGE ISSR scheme preprint, 2025. https://egusphere.copernicus.org/preprints/2025/egusphere-2025-1499/egusphere-2025-1499.pdf |
| LAM09 | Lamquin et al. 2009, ECMWF UT humidity vs AIRS/CALIPSO, ACP 9, 1779. https://acp.copernicus.org/articles/9/1779/2009/ |
| SPI03 | ISSR layer-thickness summary (Spichtinger 2003; Rädel & Shine 2007), quoted in https://acp.copernicus.org/preprints/5/67/2005/acpd-5-67-2005.pdf and https://www.pa.op.dlr.de/tac/2009/proceedings/169-216.pdf |
| GS00 | Gierens & Spichtinger 2000, ISSR horizontal extent, Ann. Geophys. 18, 499. https://angeo.copernicus.org/articles/18/499/2000/ |
| GIE99 | Gierens et al. 1999, MOZAIC ice supersaturation climatology, Ann. Geophys. 17, 1218. https://angeo.copernicus.org/articles/17/1218/1999/ |
| PET20 | Petzold et al. 2020, ISSR flight-time fraction, as cited in ACP 22, 7699. https://acp.copernicus.org/articles/22/7699/2022/acp-22-7699-2022.pdf |
| RS80 | RS80-A radiosonde dry-bias correction (Miloshevich et al. 2001). https://data.ucar.edu/dataset/08cda368-d9a2-4d66-92fc-6c679eb4fb46 and https://ckanprod.data-commons.k8s.ucar.edu/dataset/performance-of-the-vaisala-rs80-a-h-and-rs90-humicap-sensors-and-the-meteolabor-snow-white-chil |
| MOZ | MOZAIC/IAGOS history and hygrometer: https://amt.copernicus.org/articles/8/1233/2015/amt-8-1233-2015.pdf ; https://research.manchester.ac.uk/en/clippings/airbus-supporting-the-worlds-scientific-community-on-climate-rese/ ; https://meetingorganizer.copernicus.org/EGU22/EGU22-3789.html ; https://agris.fao.org/search/en/records/67597cccc7a957febdf8aca4 ; https://www2023.icao.int/environmental-protection/Documents/EnvironmentalReports/2025/Envreport2025_12.pdf |
| WVSS | WVSS-II on commercial aircraft: https://stratus.ssec.wisc.edu/aspb/weeklies/archive/21/02-19/index.html ; https://amt.copernicus.org/preprints/7/8643/2014/amtd-7-8643-2014.pdf ; https://ams.confex.com/ams/91Annual/webprogram/Manuscript/Paper184449/WVSS-II%202009-2010%20Summary-AMS-2011-Text.pdf |
| OC23 | Ng et al. 2023, OpenContrails (GOES-16 ABI). https://arxiv.org/abs/2304.02122v2 ; https://research.google/pubs/contrail-detection-on-goes-16-abi-with-the-opencontrails-dataset/ |
| GOO23 | Google / American Airlines 2023 pilot. https://blog.google/technology/ai/ai-airlines-contrails-climate-change/ ; https://sites.research.google/contrails/ |
| GOO25 | Google / American Airlines 2025 trial. https://www.rdworldonline.com/googles-ai-cut-contrails-62-on-american-airlines-flights-getting-the-whole-industry-to-follow-could-be-a-harder-problem/ ; https://hannahritchie.substack.com/p/contrails-google-ai |
| COCIP | DLR CoCiP page (Schumann 2012). https://www.dlr.de/en/pa/research-transfer/research-infrastructure/models/contrail-cirrus-prediction-model-cocip |
| APC | APCEMM vs CoCiP comparison, ACP 25, 12875 (2025). https://acp.copernicus.org/articles/25/12875/2025/ ; APCEMM thesis https://dspace.mit.edu/handle/1721.1/155484 |
| AIFS | ECMWF AIFS: https://arxiv.org/html/2406.01465v2 ; https://www.ecmwf.int/node/28946 ; https://luckgrib.com/models/ecmwf_aifs/ |
| GC | GraphCast resolution and levels, as described in https://arxiv.org/pdf/2409.18529 |
| IFSOD | ECMWF open data at 0.25°. https://www.ecmwf.int/node/28999 |
| ML25 | ML correction of ERA5 RHi using IAGOS (Wang et al. 2025), as cited in https://egusphere.copernicus.org/preprints/2025/egusphere-2025-4529/egusphere-2025-4529.pdf |
| DRV25 | Driver et al. 2025, ACP 25, 16411. https://acp.copernicus.org/articles/25/16411/2025/ |
| NAS | US National Academies report on aviation contrails, ch. 2. https://www.nationalacademies.org/read/29073/chapter/5 |
| LID | Airborne DIAL water-vapour lidar assimilation: https://elib.dlr.de/48098 ; ARPA-E on-board lidar: https://arpa-e.energy.gov/sites/default/files/documents/files/PRE-TRAILS%20Project%20Descriptions_FINAL.pdf |

## 1. Why humidity at cruise height is hard (plain words)

- **Very little water up there.** At cruise height the air is so cold and dry that water vapour can fall below 50 parts per million. Small sensor errors therefore become large relative errors. [WVSS] **SOLID**
- **Weather balloons read too dry in the cold.** The older Vaisala RS80-A balloon sensor read drier and drier as it got colder. The correction factor was about 1.3 at -35 °C, rising to about 2.4 at -70 °C, so the true humidity could be more than twice the reading. [RS80] **SOLID** (for that sensor type; modern sondes are better, but I have not sourced how much better.)
- **The RS80-H also read dry at cirrus levels** below about -15 °C. One study, though, found a small wet bias in the middle and upper troposphere, so the evidence conflicts. [RS80] **LIKELY**
- **Sensor icing.** None of the sources I found discuss icing of humidity sensors directly. **UNSURE**: do not state it as a fact without another source.
- **Models dislike supersaturation.** Older forecast models removed any humidity above 100% over ice by turning it into cloud straight away. ECMWF only added an ice-supersaturation scheme to its IFS in 2007. [TOM07] **SOLID**
- **Models are still dry where it matters.** ERA5 relative humidity over ice inside ISSRs has repeatedly been found to be biased dry compared with aircraft measurements. [DRV25, HIL26] **SOLID**
- **Few measurements to feed the models.** Few humidity observations at cruise level are available to assimilate. [DRV25] **SOLID**
- **Satellites struggle in cloud.** Satellite humidity retrievals (AIRS) cannot retrieve humidity under thick high cloud and have coarse vertical resolution. Satellite datasets also tend to underestimate supersaturation. [LAM09] **SOLID**
- **Forecasts need warm-up time.** ECMWF upper-tropospheric humidity forecasts needed at least 12 hours of spin-up before they could be trusted (2009 study). [LAM09] **SOLID** (may be outdated)

## 2. The generations

### Gen 1: Pilot reports and weather balloons (radiosondes), roughly 1930s onward
- **Kid version:** "Balloons carry a little weather box up through the sky, and pilots radio in what they see. It's like checking the soup temperature with one spoon in one spot."
- **What it gives:** a point measurement where a balloon happens to be, and pilots' reports of contrails they actually see. That means very little warning ahead of the plane.
- **Skill:** no ISSR hit or false-alarm scores found. The main known problem is the cold dry bias described above (up to 2.4x at -70 °C for the RS80-A). [RS80] **SOLID** for the bias. Launch dates, launch frequency and station spacing were not sourced in this pass. **UNSURE**
- **Fun fact:** an old balloon sensor could say the air was less than half as humid as it really was. [RS80] **SOLID**

### Gen 2: Numerical weather prediction (ECMWF IFS, ERA5 reanalysis), ice supersaturation added 2007
- **Kid version:** "A supercomputer splits the sky into boxes and works out the weather in each one. But its boxes are bigger than the icy layers."
- **Skill:**
  - Gierens et al. 2020 found that models predict the contrail *formation* condition (Schmidt–Appleman) well, but not ice supersaturation. [GIE20, HOF24] **SOLID**
  - ERA5 vs IAGOS, 2011–2022: equitable threat score (ETS) 0.2–0.4, judged "weak-to-mediocre". Clear-sky ETS is 0.05–0.18, and in cloudy air ETS is mostly below 0.1. Lowering the humidity threshold to about 85–95% helps. [HIL26] **SOLID**
  - Météo-France's improved ARPEGE scheme, and the IFS: hit rate about 80% and false-alarm ratio about 30%, but only when a 150 km tolerance (about 10 minutes of flight) is allowed. [ARP25] **LIKELY** (preprint)
  - Hofer et al. 2024 added wind and dynamics data with a regression model. Results improved, but not yet enough to route flights by (paraphrase: the quoted phrase is not in the abstract). [HOF24] **SOLID**
- **Resolution / range:** ECMWF open data is 0.25° (about 28 km) at 3-hourly steps out to 10 days. [IFSOD] **SOLID** for open data. The full model is finer, but I have not sourced how much finer. **UNSURE**
- **Fun fact:** the forecast spots the icy layer only about as often as it misses it, unless you allow it to be off by about 150 km. [ARP25, HIL26] **LIKELY**

### Gen 3: Humidity sensors on airliners (MOZAIC 1994, IAGOS 2011, WVSS-II)
- **Kid version:** "Ordinary passenger jets carry a sniffer that measures the air as they fly. Every flight becomes a weather station."
- **Facts:**
  - The first MOZAIC flight was an Air France A340, Caracas–Bogotá, in August 1994. [MOZ] **SOLID**
  - MOZAIC plus IAGOS had flown more than 60,000 flights as of about 2022. [MOZ] **LIKELY** (counts differ between sources)
  - The IAGOS capacitive hygrometer has about 5% RH uncertainty. [MOZ] **SOLID**
  - A 2025 ICAO report calls it the only sensor accurate enough to reliably detect ISSRs in the upper troposphere. [MOZ] **LIKELY**
  - WVSS-II (a laser sensor on US airliners) reads slightly moist against radiosondes: mean difference 0.2 g/kg, random difference about 0.9 g/kg at cruise level. [WVSS] **LIKELY**
  - Peer-reviewed tests of WVSS-II in the upper troposphere were lacking as of 2014. [WVSS] **SOLID**
- **Skill:** these measure the truth along the flight path. They are the reference other systems are scored against, not a forecast. [ARP25, HIL26] **SOLID**
- **Fun fact:** MOZAIC data showed about 13.5% of measurements were in ice-supersaturated air [GIE99] **SOLID**. Later IAGOS work suggests about 20–25% of flight time in summer and about 35–40% in winter in the northern upper troposphere [PET20] **LIKELY**.

### Gen 4: Satellite contrail detection (geostationary infrared; GOES-16 with machine learning, about 2023)
- **Kid version:** "A satellite parked over one spot of Earth takes heat-pictures, and a computer learns to find the thin lines of contrails, day and night."
- **Facts:**
  - The OpenContrails dataset is human-labelled GOES-16 ABI imagery. The detection model uses several frames in time. [OC23] **SOLID**
  - Pixel size and image cadence are not confirmed from my sources. **UNSURE**: check the paper.
- **Skill:** this shows contrails that have *already formed*, not icy air ahead. It confirms afterwards, which is what Google used to check its avoidance trials. [GOO23] **SOLID**
- **Fun fact:** engineers labelled tens of thousands of satellite images by hand to teach the computer what a contrail looks like. [GOO23] **LIKELY**

### Gen 5: Contrail models (CoCiP 2012, APCEMM)
- **Kid version:** "Once you know where the icy air is, a contrail model works out how long each trail lives, how wide it spreads, and whether it warms or cools."
- **Facts:**
  - CoCiP (Schumann 2012, DLR) follows each contrail flight by flight, for one plane or a whole fleet. It is the most widely used model of its kind. [COCIP, APC] **SOLID**
  - APCEMM is a 2-D model with detailed ice microphysics. [APC] **SOLID**
  - In one 2025 comparison, APCEMM's time-integrated extinction (a climate-impact proxy) was 3.8 times CoCiP's. [APC] **LIKELY** (single study)
- **Skill:** a contrail model is only as good as the humidity it is given. No independent ISSR scores apply to it. [HIL26 reasoning] **LIKELY**
- **Fun fact:** two respected contrail models can disagree by nearly 4 times about how strong the same contrail is. [APC] **LIKELY**

### Gen 6: Machine-learning weather and contrail forecasts (GraphCast 2023, ECMWF AIFS 2024, Google/AA trials 2023–2025)
- **Kid version:** "A computer that learned from 40 years of past weather makes a forecast in minutes. Then another AI checks with satellites whether the plan worked."
- **Facts:**
  - AIFS runs at 0.25° (about 28 km), was updated in early 2024, and forecasts 4 times a day out to 15 days. [AIFS] **SOLID**
  - GraphCast runs at 0.25° on 13 pressure levels and was trained on ERA5. [GC] **LIKELY**
  - Because these models are trained on ERA5, they probably inherit its upper-level dry bias. That is my inference; no study tests it. **UNSURE**
  - **No published ISSR skill scores for GraphCast or AIFS were found.** **UNSURE**: a real gap.
  - A machine-learning correction of ERA5's dry bias using IAGOS data exists (Wang et al. 2025). [ML25] **LIKELY**
  - **2023 pilot:** 70 American Airlines flights used Google's predictions and made 64% fewer contrails (peer-reviewed, Sonabend-W et al. 2024; the Google blog said 54%), using about 2% more fuel. [GOO23] **SOLID**
  - **2025 trial:** about 2,400 transatlantic flights, January–May 2025. Across the 1,232 eligible flights, contrails fell 11.6%. Only 112 flights actually flew the avoidance plan, and those made 62% fewer contrails. No significant difference in fuel was found. [GOO25] **LIKELY**
- **Fun fact:** when pilots actually followed the AI plan, they made 62.0% fewer contrails. Most of the time the plan was just never used. [GOO25] **LIKELY**

### Gen 7 (future): Assimilating airliner humidity and lidar
- **Kid version:** "Lots of planes measure the air and send it straight into the forecast, and a laser on board peeks at the humidity ahead."
- **Facts:**
  - The US National Academies say ISSR forecasts "can be improved by ingesting cruise altitude meteorological observations", with water vapour the most critical measurement. [NAS] **SOLID**
  - The EU BeCoM project aims to increase routine humidity measurement at cruise level. [DRV25 search context] **UNSURE**
  - Airborne DIAL lidar measures water vapour with vertical resolution of up to a few hundred metres, which matches ISSR thickness. Past assimilation tests targeted lower-level weather, not ISSRs. [LID] **LIKELY**
  - ARPA-E has funded an on-board water-vapour lidar concept for a fraction of an airline's fleet. No results are published yet. [LID] **LIKELY**
- **Skill:** none published. Any numbers for this tier are a game proposal only.

## 3. Facts kids would find surprising
- Icy humid patches are wide but thin. Horizontal path lengths through them average about 150 km (with a large spread, s.d. about 250 km) [GS00] **SOLID**. They are typically only about 500–600 m thick (Germany), or about 0.9–1.3 km at UK sites [SPI03] **SOLID**. That is like a pancake the size of a county.
- One unusually thick case was about 3 km deep. [SPI03] **LIKELY**
- Icy humid air occurs about 20-40% of the time near the tropopause (35-40% in late winter). [PET20] **SOLID** (corrected wording)
- Air can hold more water than "100%" over ice without making cloud. Forecast models did not allow this until 2007. [TOM07] **SOLID**
- The best forecasts score only 0.2–0.4 on a scale where 1 is perfect and 0 is no better than chance. [HIL26] **SOLID**
- Soup metaphor: the upper sky is a thin clear broth with invisible layers of almost-freezing stock. You only find them by dipping a spoon (a plane) straight through.

## 4. Game-ready summary

The "In the game" column is a design proposal, not data. The real-world numbers in the "Real skill" column come from the sources listed.

| Gen | Year | In the game (proposal) | Real skill (sourced) | Fun fact | Sources |
|---|---|---|---|---|---|
| 1 Balloons and pilot reports | 1930s+ (unsourced) | Icy air shown only when you are inside it, plus a few random dots. Many misses. | No ISSR scores. Old sondes read up to 2.4x too dry at -70 °C. | A balloon could say half the real humidity. | RS80 |
| 2 NWP (IFS/ERA5) | 2007 ISS scheme | Blurry blobs a short way ahead. About 1 in 3 blobs false, many missed. | ETS 0.2–0.4 (clear sky 0.05–0.18). About 80% hits / 30% false alarms only within 150 km. 28 km grid, 10 days. | Can be about 150 km off and still count as a hit. | HIL26, ARP25, GIE20, IFSOD |
| 3 Airliner sensors | 1994 / 2011 | Exact truth along your own path and other planes' paths (shared trails). No look-ahead. | About 5% RH uncertainty. Over 60,000 flights. | Every jet becomes a weather station. | MOZ, WVSS |
| 4 Satellite detection | about 2023 | Shows contrails that already exist on a minimap. Hints where icy air is. | Detects contrails after they form. No forecast. | Tens of thousands of hand-labelled images. | OC23, GOO23 |
| 5 Contrail models | 2012 | Labels each icy zone as "warms" or "cools" (day/night). | Models disagree up to 3.8x. | Two models, one contrail, 4x disagreement. | COCIP, APC |
| 6 ML forecasts | 2023–2025 | Further look-ahead, sharper edges, fewer false alarms (still some). | AIFS 28 km, 15 days. Real trials: 64% fewer contrails (70 flights, peer-reviewed), 62% when followed (2025). ISSR skill scores unpublished. | 112 of about 1,200 flights actually used it. | AIFS, GC, GOO23, GOO25 |
| 7 Future: assimilation + lidar | future | Longest, clearest look-ahead, thin layers resolved. | No published skill. NAS says it should improve forecasts. | Laser vertical detail of a few hundred metres, the same as layer thickness. | NAS, LID |

## Biggest gaps (check before publishing)
1. No ISSR ETS, hit-rate or false-alarm scores for GraphCast or AIFS.
2. GOES contrail detection pixel size, cadence and accuracy are not yet confirmed.
3. No source found on sensor icing.
4. Radiosonde history, launch frequency and spacing, and PIREP details are unsourced.
5. All numbers are from abstracts or secondary summaries. Full papers not read.

> **Fact-check (2026-10-22):** every claim here was checked in `plane-verification.md` (confirmed / corrected / unconfirmed). Corrections are applied in place; game-table CO2 ratios and anything UNCONFIRMED there are GAME ESTIMATES, not measurements.
