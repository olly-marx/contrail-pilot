# Art brief: the region animals, project icons and scenes (game session, 2026-10-22)

For a NEW art session (the user, 2026-10-22; confirmed 2026-10-23: a THIRD chat does the region art below). Source of truth: src/habitat/<region>.js (names, facts) and src/habitats.js.
This list is generated from the data; regenerate rather than hand-edit. Match the existing style (tools/art/make_sprites.py):
each animal needs a 2-frame flight sprite (animal-<id> walking on the ground, or sky-<id> flying) AND a portrait
(assets/ui/portrait-animal-<id>-0.png or portrait-sky-<id>-0.png), then an entry in src/wildlife.js WILDLIFE with
region, kind, pose, sprite, portrait. The game picks it up by itself (regionSpecies() in src/nature.js).

## Mediterranean (mediterranean)

Animals to draw (6), rarest first:
- `cinereous` Cinereous vulture (bird, rare)
- `imperialeagle` Spanish imperial eagle (bird, rare)
- `loggerhead` Loggerhead turtle (animal, rare)
- `chamois` Apennine chamois (animal, rare)
- `ocellatedlizard` Ocellated lizard (animal, uncommon)
- `pelican` Dalmatian pelican (bird, uncommon)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `olives`, `firegraze`, `dehesa`, `turtlebeach`, `reedcut`, `flamingoisland`, `rabbits`, `vultures`, `bearsmart`, `chamoisreturn`

Field backdrop: assets/ui/field-mediterranean.png (288 x 170, horizon at y=60, like field-woodland).

## Desert (desert)

Animals to draw (6), rarest first:
- `scimitaroryx` Scimitar-horned oryx (animal, legendary)
- `arabianleopard` Arabian leopard (animal, legendary)
- `tahr` Arabian tahr (animal, rare)
- `houbara` Houbara bustard (bird, rare)
- `dorcas` Dorcas gazelle (animal, uncommon)
- `ibex` Nubian ibex (animal, uncommon)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `reserve`, `ggw`, `mangroves`, `wadi`, `lakes`, `reef`, `flamingowetland`, `oryxreturn`, `sahara`, `houbarabreed`, `leopardbreed`

Field backdrop: assets/ui/field-desert.png (288 x 170, horizon at y=60, like field-woodland).

## Monsoon & rainforest (monsoon)

Animals to draw (7), rarest first:
- `cloudedleopard` Clouded leopard (animal, legendary)
- `sumatranrhino` Sumatran rhino (animal, legendary)
- `fishingcat` Fishing cat (animal, rare)
- `smoothotter` Smooth-coated otter (animal, rare)
- `whitevulture` White-rumped vulture (bird, rare)
- `gharial` Gharial (animal, rare)
- `chital` Spotted deer (chital) (animal, common)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `hornbillnest`, `mangroves`, `patrols`, `pandaforest`, `corridors`, `tigerreserve`, `peatdams`, `vulturezones`, `gharialhatch`, `rhinomove`, `gibbonrelease`, `rhinosanctuary`

Field backdrop: assets/ui/field-monsoon.png (288 x 170, horizon at y=60, like field-woodland).

## East Asia (eastasia)

Animals to draw (8), rarest first:
- `ibis` Crested ibis (bird, legendary)
- `fishowl` Blakiston's fish owl (bird, legendary)
- `amamirabbit` Amami rabbit (animal, legendary)
- `amurtiger` Siberian tiger (animal, legendary)
- `amurleopard` Amur leopard (animal, legendary)
- `orientalstork` Oriental stork (bird, rare)
- `moonbear` Moon bear (animal, rare)
- `firefly` Genji firefly (animal, uncommon)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `satoyama`, `grainforgreen`, `cranefeed`, `storkrice`, `zhalong`, `bamboo`, `ibisrelease`, `storkreturn`, `owlbox`, `mongoose`, `tigerpark`, `bearreturn`

Field backdrop: assets/ui/field-eastasia.png (288 x 170, horizon at y=60, like field-woodland).

## Boreal & mountains (boreal)

Animals to draw (4), rarest first:
- `marmot` Vancouver Island marmot (animal, legendary)
- `cohosalmon` Coho salmon (animal, uncommon)
- `dipper` American dipper (bird, uncommon)
- `nutcracker` Clark's nutcracker (bird, uncommon)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `culvert`, `bearsmart`, `whitebark`, `beavermove`, `crossings`, `eaglereserve`, `elwha`, `cariboupen`, `wolves`, `marmots`

Field backdrop: assets/ui/field-boreal.png (288 x 170, horizon at y=60, like field-woodland).

## Plains & forest (plains)

Animals to draw (11), rarest first:
- `swiftfox` Swift fox (animal, legendary)
- `ferret` Black-footed ferret (animal, legendary)
- `whoopingcrane` Whooping crane (bird, legendary)
- `sandhill` Sandhill crane (bird, rare)
- `prairiechicken` Greater prairie-chicken (bird, rare)
- `monarch` Monarch butterfly (animal, uncommon)
- `swift` Chimney swift (bird, uncommon)
- `warbler` Palm warbler (bird, uncommon)
- `oyster` Eastern oyster (animal, uncommon)
- `teal` Blue-winged teal (bird, uncommon)
- `chickadee` Black-capped chickadee (bird, common)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `milkweed`, `lightsout`, `swifttower`, `oaks`, `burn`, `potholes`, `platte`, `oysters`, `fences`, `bisonhome`, `ferretrelease`

Field backdrop: assets/ui/field-plains.png (288 x 170, horizon at y=60, like field-woodland).

## Iceland (tundra)

Animals to draw (9), rarest first:
- `whitetailedeagle` White-tailed eagle (bird, legendary)
- `godwit` Black-tailed godwit (bird, rare)
- `harlequin` Harlequin duck (bird, rare)
- `atlanticsalmon` Atlantic salmon (animal, rare)
- `harbourseal` Harbour seal (animal, rare)
- `goldenplover` Golden plover (bird, uncommon)
- `whimbrel` Whimbrel (bird, uncommon)
- `redshank` Redshank (bird, uncommon)
- `eider` Common eider (bird, common)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `sanddrift`, `birch`, `ditchblock`, `lupin`, `minkout`, `eiderguard`, `puffling`, `foxsafe`, `rivers`, `eaglewatch`, `sealcount`

Field backdrop: assets/ui/field-tundra.png (288 x 170, horizon at y=60, like field-woodland).

## African savanna (savanna)

Animals to draw (19), rarest first:
- `wilddog` African wild dog (animal, legendary)
- `blackrhino` Black rhino (animal, legendary)
- `whiterhino` White rhino (animal, legendary)
- `grevyszebra` Grevy's zebra (animal, legendary)
- `hirola` Hirola (animal, legendary)
- `africanelephant` African elephant (animal, rare)
- `lion` Lion (animal, rare)
- `africanleopard` Leopard (animal, rare)
- `secretarybird` Secretary bird (bird, rare)
- `groundhornbill` Southern ground-hornbill (bird, rare)
- `cheetah` Cheetah (animal, rare)
- `capebuffalo` African buffalo (animal, uncommon)
- `hippo` Hippo (animal, uncommon)
- `crownedcrane` Grey crowned crane (bird, uncommon)
- `wildebeest` Wildebeest (animal, uncommon)
- `giraffe` Giraffe (animal, uncommon)
- `hyena` Spotted hyena (animal, uncommon)
- `warthog` Warthog (animal, common)
- `zebra` Plains zebra (animal, common)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `beehive`, `boma`, `guarddogs`, `weeds`, `vulturesafe`, `conservancy`, `grazing`, `hornbillrescue`, `rhinosanct`, `kaza`, `gorongosa`

Field backdrop: assets/ui/field-savanna.png (288 x 170, horizon at y=60, like field-woodland).

## Amazon & Atlantic Forest (rainforest)

Animals to draw (21), rarest first:
- `glt` Golden lion tamarin (animal, legendary)
- `muriqui` Southern muriqui (animal, legendary)
- `giantotter` Giant otter (animal, legendary)
- `riverdolphin` Pink river dolphin (animal, legendary)
- `jaguar` Jaguar (animal, legendary)
- `harpy` Harpy eagle (bird, legendary)
- `orinocogoose` Orinoco goose (bird, rare)
- `scarletmacaw` Scarlet macaw (bird, rare)
- `ghlt` Golden-headed lion tamarin (animal, rare)
- `riverturtle` Giant river turtle (animal, rare)
- `pirarucu` Pirarucu (arapaima) (animal, rare)
- `tapir` South American tapir (animal, rare)
- `toucan` White-throated toucan (bird, uncommon)
- `hoatzin` Hoatzin (bird, uncommon)
- `poisonfrog` Dyeing poison frog (animal, uncommon)
- `skimmer` Black skimmer (bird, uncommon)
- `capybara` Capybara (animal, common)
- `sloth` Brown-throated sloth (animal, common)
- `squirrelmonkey` Squirrel monkey (animal, common)
- `howler` Howler monkey (animal, common)
- `agouti` Agouti (animal, common)

Project icons (assets/ui/proj-<id>.png, same size as the UK ones): `seeds`, `brazilnut`, `cacao`, `macawbox`, `indigenous`, `riverbeach`, `fishcount`, `dolphins`, `corridor`, `bridges`, `pact`, `otterwatch`, `tapirwork`

Field backdrop: assets/ui/field-rainforest.png (288 x 170, horizon at y=60, like field-woodland).

## Also needed

- Terrain strips for savanna and rainforest (ground-<id>.png, hills-<id>.png, as make_regions.py) and their trees.
- OCEAN terrain (the user, 2026-10-22: ocean is its own terrain): a sea ground strip + hills (waves/horizon), and a few
  seabirds (e.g. albatross, gannet) for over the sea.
- Order: the user said start with whatever helps most; suggested: savanna and rainforest animals (nothing drawn yet),
  then the very rare and rare animals in other regions, then icons, then backdrops.

TOTAL: 91 animals, 101 project icons, 9 field backdrops.

## Trees for each region (2026-10-22; src/habitat/trees.js)

Each region has 5 tree slots matching the UK (basic, then 4 natives). Draw as the UK trees: tree-<id>-0/1/2 (3 growth
stages) + a portrait, and a WILDLIFE entry with kind 'tree' and the region. Until drawn, the UK tree of the same slot stands in.

- mediterranean: `aleppopine` Aleppo pine (slot 0), `corkoak` Cork oak (slot 2), `strawberrytree` Strawberry tree (slot 3)
- desert: `mesquite` Mesquite (slot 0), `ghaf` Ghaf (slot 2), `sidr` Sidr (Christ's thorn jujube) (slot 3)
- monsoon: `oilpalm` Oil palm (slot 0), `jamun` Jamun (Java plum) (slot 3), `mango` Mango (slot 4)
- eastasia: `chinesefir` Chinese fir (slot 0), `persimmon` Persimmon (kaki) (slot 4)
- boreal: `aspen` Aspen (slot 2), `saskatoon` Saskatoon berry (slot 4)
- plains: `loblolly` Loblolly pine (slot 0), `cottonwood` Eastern cottonwood (slot 1), `dogwood` Flowering dogwood (slot 3)
- tundra: `lodgepole` Lodgepole pine (slot 0), `willow` Tea-leaved willow (slot 2), `juniper` Juniper (slot 4)
- savanna: `eucalyptus` Eucalyptus (slot 0), `baobab` Baobab (slot 2), `fig` Sycamore fig (slot 3), `marula` Marula (slot 4)
- rainforest: `eucalyptus` Eucalyptus (slot 0), `cecropia` Cecropia (slot 1), `kapok` Kapok (slot 2), `jucara` Juçara palm (slot 3), `brazilnut` Brazil nut (slot 4)

## City landmarks (2026-10-22; src/cities.js)

The world network has 104 airports; 88 have no landmark yet (src/landmarks.js, one per city, behind the runway):

AMSTERDAM, EDINBURGH, DUBLIN, VIENNA, WARSAW, KYIV, MOSCOW, MADRID, LISBON, BARCELONA, ISTANBUL, TUNIS, CASABLANCA, RIYADH, DOHA, MUSCAT, TEHRAN, KARACHI, TASHKENT, TAMANRASSET, KHARTOUM, MUMBAI, KOLKATA, CHENNAI, KATHMANDU, DHAKA, COLOMBO, HANOI, KUALA LUMPUR, SINGAPORE, JAKARTA, MANILA, SHANGHAI, HONG KONG, SEOUL, CHENGDU, OSAKA, TAIPEI, SAPPORO, ULAANBAATAR, SEATTLE, CALGARY, FAIRBANKS, YELLOWKNIFE, IQALUIT, OSLO, STOCKHOLM, HELSINKI, DENVER, DALLAS, ATLANTA, LOS ANGELES, MIAMI, TORONTO, WINNIPEG, MEXICO CITY, BUENOS AIRES, SANTIAGO, AKUREYRI, NAIROBI, ADDIS ABABA, DAR ES SALAAM, JOHANNESBURG, CAPE TOWN, WINDHOEK, MAPUTO, LUANDA, KINSHASA, LAGOS, ACCRA, NIAMEY, ANTANANARIVO, MANAUS, BELEM, SAO PAULO, RIO, BRASILIA, LIMA, QUITO, BOGOTA, CARACAS, PANAMA, SYDNEY, PERTH, DARWIN, AUCKLAND, HONOLULU, NADI

## Status and handover notes (2026-10-23, game session)

DONE already (do not redo): all 91 region animals and 27 regional trees are drawn by the dial generator
(tools/art/species.py -> make_wildlife.py) and live in the game. The lists above were the to-do at the time.

STILL TO DO for the third chat:
- Field backdrops: assets/ui/field-<region>.png for the 9 regions (make_wildarea.py; wild.js FIELD_ART lists which exist:
  add each region id there when its backdrop lands).
- Project icons: assets/ui/proj-<id>.png for the 101 region projects (ids in src/habitat/<region>.js).
- City landmarks: the 88 cities listed above (make_landmarks.py, src/landmarks.js).
- Ground/hills strips for OCEAN, SAVANNA and RAINFOREST (make_regions.py; then add those ids to REGIONS in species.py so
  src/wildlife.js REGIONS has them; GameScene.setRegion uses REGIONS[r].ground/.hills and keeps the last land's strips
  when an entry is missing). Seabirds for over the ocean would be welcome.
- Missing animal TEMPLATES (shapes.py), where the dial versions are weak: fish (cohosalmon, atlanticsalmon, pirarucu),
  sea turtle (loggerhead, riverturtle), shell (oyster), insects (firefly, monarch), scimitar/ibex/hooked horns (scimitaroryx,
  ibex, chamois), long thin snout (gharial), owl face (fishowl), bottle trunk tree (baobab), neck patches (giraffe), lips
  (blackrhino, whiterhino), V chest mark (moonbear).
  HOLD THIS ONE: the game session is trialling PixelLab (MCP) for animal art: flat 2D pixflux sprites (~32 px, ~10 colours)
  in flight and pixen 64 px cards for a collection screen. If the user adopts it, those animals will come from PixelLab and the
  templates are not needed. Ask the game session first.

Rules learnt the hard way:
- Storm clouds (2026-10-24): PixelLab storm towers, tools/art/pixellab_storm.py -> storm-rise/hang-<v>(-flash).png +
  storm-spark-*.png. The crash shape is the drawn tower pixels INSIDE the 44 px column, and every gap's narrowest point
  is exactly the gap asked for (tests/stormart.cjs). (Before: make_storm.py repainted storm-body/top/bottom inside a
  fixed outline; that file and those PNGs are gone.)
- Generators are deterministic: after any run, existing PNGs you did not mean to change must be byte-identical (git status).
- Region art loads on demand (GameScene.queueArt): a new species is fetched when a flight path crosses its region.
- PixelLab is registered for sessions started in /home/ojm only (local scope); drive it with a headless `claude -p` call
  (see STATE.md). Keep a provenance line (prompt, tool, date) next to every generated PNG. Ask the user before spending credits.
