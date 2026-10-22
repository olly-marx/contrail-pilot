# Art brief: the region animals, project icons and scenes (game session, 2026-10-22)

For a NEW art session (the user, 2026-10-22). Source of truth: src/habitat/<region>.js (names, facts) and src/habitats.js.
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
