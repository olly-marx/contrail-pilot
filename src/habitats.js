// Habitat projects and what they bring back, per region (2026-10-21, the user's design): you buy
// things people really do for nature (or a reintroduction that changes the land); each has a
// knock-on chain a child can follow and raises that region's habitat meter. Animals are NEVER
// bought: a species appears in flights over its region once its `needs` projects are done and the
// meter is high enough, and seeing it on screen counts as finding it. Researched 2026-10-21 (UK);
// every fact has a source for the group to check before the festival (see `src`).
// UK first; other regions follow.
import { cz } from './config.js';   // Citizen Zoo mentions only when that feature is on

// Projects (UK woodland & farmland), cheap to big, in 3 TIERS (the user, 2026-10-22: the screen
// showed too many at once): 1 first steps, 2 wetter and wilder (Biodiversity 12), 3 bring them
// back (Biodiversity 30). `needs`: the meter level to buy (the same for a whole tier).
// `chain`: the knock-on effect, step by step. `bio`: meter points it adds.
export const TIERS = [
  { tier: 1, name: 'First steps', needs: 0 },
  { tier: 2, name: 'Wetter and wilder', needs: 12 },
  { tier: 3, name: 'Bring them back', needs: 30 },
];

export const UK_PROJECTS = [
  { id: 'deadwood', name: 'Leave dead wood', cost: 20, crystals: 2, bio: 4, tier: 1, needs: 0,
    short: 'Leave fallen logs to rot instead of tidying them.',
    chain: ['Rotting logs', 'beetles, grubs and fungi', 'woodpeckers feed and nest in the holes'],
    fact: "Dead, rotting wood is home to thousands of creatures, like about 650 kinds of beetle, and woodpeckers nest in the holes.", src: [["Worcestershire Wildlife Trust: dead wood", "https://www.worcswildlifetrust.co.uk/node/3757"]] },
  { id: 'meadow', name: 'Wildflower meadow', cost: 30, crystals: 4, bio: 8, tier: 1, needs: 0,
    short: 'Sow wild flowers and cut them for hay once a year.',
    chain: ['Meadow flowers', 'bees and grasshoppers', 'swallows swoop in to feed'],
    fact: 'Almost all (97%) of the UK\'s wildflower meadows have gone since your great-grandparents were young.',
    src: [['Plantlife: meadow loss (BBC Wildlife)', 'https://www.discoverwildlife.com/news/wildflower-favourites-are-in-danger-due-to-devastation-of-grasslands-and-meadows/']] },
  { id: 'margins', name: 'Field margins and bee banks', cost: 60, crystals: 8, bio: 6, tier: 1, needs: 0,
    short: 'Wild flower strips round fields, and bare sunny banks for wild bees.',
    chain: ['Flower strips', 'wild bees, butterflies and voles', 'hares hide in the long grass, owls hunt the voles'],
    fact: 'Honeybees are farm animals! WILD bees need wild flowers, and about 7 in 10 of our wild bees nest in holes in the ground.',
    src: [['Bumblebee Conservation Trust: honeybees and wild bees', 'https://www.bumblebeeconservation.org/wp-content/uploads/2024/06/BBCT212-Honeybee-Statement-08.23.pdf'],
      ['GWCT: ground-nesting bees', 'https://www.gwct.org.uk/blogs/news/2026/august/beneath-our-feet-the-secret-lives-of-ground-nesting-bees/'],
      ['Defra: flower-rich margins on farms', 'https://defrafarming.blog.gov.uk/create-and-maintain-flower-rich-margins-and-plots/'],
      ['GWCT: a future for brown hares', 'https://www.gwct.org.uk/media/1287729/A-future-for-brown-hares.pdf']] },
  { id: 'hedgerow', name: 'Hedgerows', cost: 140, crystals: 18, bio: 10, tier: 1, needs: 0,
    short: 'Plant hawthorn, hazel and blackthorn hedges; trim them only every few years.',
    chain: ['Thick hedges', 'berries, nuts and nest spots', 'leafy roads for dormice, hedgehogs and birds'],
    fact: 'Hazel dormice can live their whole lives in a hedge, using it like a leafy motorway.',
    src: [['PTES: hedgerows for hazel dormice', 'https://ptes.org/campaigns/dormice/hazel-dormouse-conservation/hedgerow-management-for-hazel-dormice/']] },
  { id: 'pond', name: 'Pond', cost: 170, crystals: 21, bio: 12, tier: 2, needs: 12,
    short: 'Dig a shallow pond with no fish and gentle sloping edges.',
    chain: ['New pond', 'dragonflies, frogs and newts', 'herons come to hunt'],
    fact: "New clean ponds come to life fast: dragonflies are usually the first to arrive.", src: [["University of York: new ponds boost wildlife", "https://york.ac.uk/news-and-events/news/2020/research/ponds-boost-wildlife"]] },
  { id: 'woodland', name: 'Plant native woodland', cost: 300, crystals: 38, bio: 12, tier: 2, needs: 12,
    short: 'Plant oak, birch, rowan and hazel, and let the wood grow wild.',
    chain: ['Native trees', 'caterpillars, acorns and berries', 'owls and woodpeckers nest in old trees'],
    fact: "UK oak trees support more than 2,300 different kinds of wildlife, more than any other native tree!", src: [["Mitchell et al. 2019: the oak ecology database", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6600707"]] },
  { id: 'voles', name: 'Water voles return', cost: 450, crystals: 56, bio: 10, tier: 2, needs: 12,
    short: 'Stop American mink, restore riverbanks, release water voles.',
    chain: ['Safe, plant-lined banks', 'water voles dig and graze', 'food for owls and herons'],
    fact: 'Water voles are "Ratty" from The Wind in the Willows. They almost vanished because of escaped American mink.',
    src: [['Oxford: water vole decline and mink', 'https://ora.ox.ac.uk/objects/uuid:00a2f58a-c187-45a1-a346-3850dea60c19'],
      ['Epsom & Ewell: water voles back on the Hogsmill' + cz(' (with Citizen Zoo)'), 'https://www.epsom-ewell.gov.uk/node/36264']] },
  { id: 'beavers', name: 'Beavers return', cost: 550, crystals: 69, bio: 15, tier: 3, needs: 30,
    short: 'Release a licensed beaver family onto a stream.',
    chain: ['Beaver dams', 'ponds and wetlands', 'more fish and frogs', 'otters, kingfishers and herons feast'],
    fact: 'Beaver dams make new wetlands that help wildlife such as fish, and help slow floods.' + cz(' Citizen Zoo works with beavers in London!'),
    src: [['University of Exeter: River Otter Beaver Trial', 'https://news-archive.exeter.ac.uk/2020/february/title_778479_en.html'],
      ['GOV.UK: five-year beaver trial completed', 'https://gov.uk/government/news/five-year-beaver-reintroduction-trial-successfully-completed'],
      ['Beaver Trust: beavers back in Ealing, London' + cz(' (with Citizen Zoo)'), 'https://beavertrust.org/ealing-beaver-project-the-journey-to-bring-beavers-back-to-central-london/']] },
  { id: 'rewet', name: 'Rewet the land', cost: 700, crystals: 88, bio: 10, tier: 2, needs: 12,
    short: 'Block old drains so fields turn back into marsh.',
    chain: ['Wet, squelchy land', 'reeds, insects and frogs', 'herons and kingfishers'],
    fact: "Blocking drains keeps rain on the land like a sponge, which slows floods downstream.", src: [["Cumbria Wildlife Trust: slowing the flow", "https://www.cumbriawildlifetrust.org.uk/fighting-climate-crisis/combating-effects/slow-the-flow"]] },
  { id: 'storks', name: 'White storks return', cost: 1300, crystals: 162, bio: 15, tier: 3, needs: 30,
    short: 'Young storks are released on big, wild, wet land.',
    chain: ['Big wild wetland', 'frogs, worms and insects', 'storks nest on treetops'],
    fact: 'In 2020 white storks bred at Knepp in West Sussex, the first in Britain for about 600 years!',
    src: [['Knepp: young storks begin a new life', 'https://knepp.co.uk/2024/08/young-storks-begin-new-life-at-knepp/'],
      ['National Geographic: storks nest in Britain after six centuries', 'https://www.nationalgeographic.com/animals/article/white-storks-nesting-britain-after-six-centuries']] },
  { id: 'martens', name: 'Pine martens return', cost: 1800, crystals: 225, bio: 12, tier: 3, needs: 30,
    short: 'Move pine martens into big, joined-up woods.',
    chain: ['Pine martens', 'fewer grey squirrels', 'red squirrels come back'],
    fact: 'Pine martens have been brought back to Wales. Where martens return, grey squirrels drop and red squirrels can come back.',
    src: [['Vincent Wildlife Trust: pine martens arrive in Wales', 'https://www.vwt.org.uk/news-media/news/pine-martens-arrive-in-wales'], ['University of Aberdeen: pine martens help red squirrels', 'https://www.abdn.ac.uk/news/11655/']] },
];

// How often an animal of each rarity is picked when one appears (weight), and how far into a flight
// (km) it can first be seen: rare ones need long flights (the user, 2026-10-22).
export const RARITY = {
  common:    { weight: 10,  from: 0,    name: 'Common' },
  uncommon:  { weight: 4,   from: 1500, name: 'Uncommon' },
  rare:      { weight: 1.5, from: 4000, name: 'Rare' },
  legendary: { weight: 0.5, from: 8000, name: 'Very rare' },
};

// What each UK animal needs before it can appear: projects done + habitat meter level. Rarer
// ones need more. A bare field is sad on purpose: only farm animals until there is a little life. `why`: one line on why it came. `src`: [title, url] for its fact.
export const UK_SPECIES = {
  cow: { rarity: 'common', needs: [], bio: 0, why: 'Farm animals. Gentle grazing keeps meadows full of flowers.',
    fact: "Grazing animals like cows and sheep stop meadows turning into scrub, so wildflowers keep growing.", src: [["The Ecologist: meadows need grazing (Plantlife)", "https://theecologist.org/2018/aug/03/cattle-fed-wildflowers-could-help-save-dwindling-meadows"]] },
  sheep: { rarity: 'common', needs: [], bio: 0, why: 'Farm animals. Gentle grazing keeps meadows full of flowers.',
    fact: "Grazing animals like cows and sheep stop meadows turning into scrub, so wildflowers keep growing.", src: [["The Ecologist: meadows need grazing (Plantlife)", "https://theecologist.org/2018/aug/03/cattle-fed-wildflowers-could-help-save-dwindling-meadows"]] },
  rabbit: { rarity: 'common', needs: [], bio: 3, why: 'Rabbits graze short grass and dig burrows called warrens.',
    fact: "Rabbits nibble grass and live in big groups in underground tunnels called warrens.", src: [["The Wildlife Trusts: rabbit", "https://www.wildlifetrusts.org/wildlife-explorer/mammals/rabbit"]] },
  fox: { rarity: 'common', needs: [], bio: 4, why: 'Red foxes live almost everywhere, even in cities.',
    fact: "Red foxes live almost everywhere in the UK, even in towns and cities.", src: [["The Wildlife Trusts: red fox", "https://www.wildlifetrusts.org/wildlife-explorer/mammals/red-fox"]] },
  buzzard: { rarity: 'common', needs: [], bio: 4, why: 'Buzzards hunt rabbits and voles over open land.',
    fact: "Buzzards are now the most common bird of prey in the UK.", src: [["RSPB: buzzard", "https://www.rspb.org.uk/birds-and-wildlife/buzzard"]] },
  robin: { rarity: 'common', needs: ['hedgerow'], bio: 0, why: 'Robins nest in thick hedges and eat insects and worms.',
    fact: "Robins follow gardeners about to grab the worms and grubs they dig up.", src: [["RSPB: robin", "https://www.rspb.org.uk/birds-and-wildlife/robin"]] },
  swallow: { rarity: 'common', needs: ['meadow'], bio: 0, why: 'Swallows catch the insects buzzing over the meadow.',
    fact: "Swallows swoop low to catch flying insects, then fly all the way to Africa for winter.", src: [["RSPB: swallow", "https://www.rspb.org.uk/birds-and-wildlife/swallow"]] },
  heron: { rarity: 'uncommon', needs: ['pond'], bio: 15, why: 'Herons hunt frogs and fish in shallow water.',
    fact: "Grey herons stand as still as statues at the water's edge, waiting to catch their food.", src: [["BTO: grey heron", "https://www.bto.org/understanding-birds/birdfacts/grey-heron"]] },
  frog: { rarity: 'uncommon', needs: ['pond'], bio: 15, why: 'Frogs lay their spawn in ponds with no fish.',
    fact: "Common frogs lay their spawn in shallow water, even in small garden ponds.", src: [["Froglife: common frog", "https://www.froglife.org/info-advice/amphibians-and-reptiles/common-frog/"]] },
  hedgehog: { rarity: 'uncommon', needs: ['hedgerow'], bio: 15, why: 'Hedges and rough corners give hedgehogs safe places to travel, hide and find food.',
    fact: "Countryside hedgehogs have dropped by a third to three-quarters since 2000, and losing hedgerows is part of the reason.", src: [["Natural History Museum: rural hedgehogs decline", "https://nhm.ac.uk/discover/news/2022/february/britains-rural-hedgehogs-see-dramatic-population-decline.html"]] },
  badger: { rarity: 'uncommon', needs: ['hedgerow'], bio: 20, why: 'Badgers dig their setts in hedge banks and woods, and eat lots of earthworms.',
    fact: "Badgers live in family groups in burrows called setts and can eat hundreds of earthworms in one night.", src: [["The Wildlife Trusts: badger", "https://www.wildlifetrusts.org/wildlife-explorer/mammals/badger"]] },
  hare: { rarity: 'uncommon', needs: ['margins', 'meadow'], bio: 20, why: 'Hares hide in long grass at the edges of fields.',
    fact: "Brown hares don't dig burrows: they rest in shallow dips in the grass called forms.", src: [["The Wildlife Trusts: brown hare", "https://www.wildlifetrusts.org/wildlife-explorer/mammals/brown-hare"]] },
  barnowl: { rarity: 'rare', needs: ['margins', 'meadow'], bio: 30, why: 'Barn owls hunt the voles living in the long grass.',
    fact: "Barn owls mainly hunt field voles, and nest in buildings and nest boxes.", src: [["Barn Owl Trust: barn owl facts", "https://www.barnowltrust.org.uk/barn-owl-facts/"]] },
  woodpecker: { rarity: 'rare', needs: ['deadwood', 'woodland'], bio: 30, why: 'Woodpeckers find grubs in dead wood and drum on old trees.',
    fact: "Great spotted woodpeckers drum loudly on trees and eat insects, grubs, seeds and nuts.", src: [["RSPB: great spotted woodpecker", "https://www.rspb.org.uk/birds-and-wildlife/great-spotted-woodpecker"]] },
  deer: { rarity: 'rare', needs: ['woodland'], bio: 30, why: 'Red deer need big woods to shelter in.',
    fact: "Red deer are the UK's biggest wild land animal.", src: [["Countryfile: biggest wild land animal in the UK", "https://www.countryfile.com/wildlife/mammals/biggest-wild-land-animal-uk"]] },
  owl: { rarity: 'rare', needs: ['woodland', 'deadwood'], bio: 35, why: 'Tawny owls nest in holes in old trees.',
    fact: "Tawny owls nest in holes in old trees and hunt mice and voles at night.", src: [["Woodland Trust: tawny owl", "https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/animals/birds/tawny-owl/"]] },
  watervole: { rarity: 'rare', needs: ['voles'], bio: 25, why: 'Water voles came back to the safe, leafy riverbanks.',
    fact: "Water voles disappeared from many rivers because their riverbank homes were destroyed and escaped American mink hunt them.", src: [["The Wildlife Trusts: water voles", "https://www.wildlifetrusts.org/node/3921"]] },
  dormouse: { rarity: 'rare', needs: ['hedgerow', 'woodland'], bio: 45, why: 'Dormice need thick hedges joined up to woods.',
    fact: "Hazel dormice live in old woods joined by thick hedges, and sleep through winter for about five months.", src: [["PTES: about hazel dormice", "https://ptes.org/campaigns/dormice/about-hazel-dormice/"]] },
  kingfisher: { rarity: 'legendary', needs: ['beavers', 'rewet'], bio: 55, why: 'Beaver pools and wetlands are full of the little fish kingfishers dive for.',
    fact: "Kingfishers need clean rivers full of small fish, and dig nest tunnels almost a metre long into riverbanks.", src: [["Wildlife Trust: the kingfisher", "https://www.hiwwt.org.uk/node/4936"]] },
  stork: { rarity: 'legendary', needs: ['storks'], bio: 50, why: 'Storks found big, wet, wild land with plenty of frogs to eat.',
    fact: "In 2020 white storks bred at Knepp, the first in Britain for about 600 years.", src: [["National Geographic: storks nest in Britain again", "https://www.nationalgeographic.com/animals/article/white-storks-nesting-britain-after-six-centuries"]] },
  otter: { rarity: 'legendary', needs: ['beavers', 'rewet'], bio: 65, why: 'Otters came back for the fish in the beaver ponds and clean, wet land.',
    fact: "Otters nearly vanished because of poisonous farm chemicals. Once those were banned and rivers got cleaner, they came back to every county in England.", src: [["Live Science: otters return to England", "https://www.livescience.com/30697-otters-return-to-england.html"]] },
  pinemarten: { rarity: 'legendary', needs: ['martens'], bio: 60, why: 'Pine martens live in big, joined-up woods.',
    fact: "Pine martens have been brought back to Wales from Scotland.", src: [["Vincent Wildlife Trust: pine martens arrive in Wales", "https://www.vwt.org.uk/news-media/news/pine-martens-arrive-in-wales"]] },
  squirrel: { rarity: 'legendary', needs: ['woodland', 'martens'], bio: 75, why: 'Pine martens keep grey squirrels away, so red squirrels can come back.',
    fact: "Bigger grey squirrels push out red squirrels and carry squirrelpox, which kills reds.", src: [["Woodland Trust: red squirrel", "https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/animals/mammals/red-squirrel/"], ["University of Aberdeen: pine martens help red squirrels", "https://www.abdn.ac.uk/news/11655/"]] },
};

// Saves from before 2026-10-21 bought rewilding in this order as the 'rewild' upgrade line.
export const OLD_REWILD_ORDER = ['meadow', 'hedgerow', 'pond', 'voles', 'beavers', 'storks'];
export function migrateHabitat(save) {
  save.habitat = save.habitat || {};
  const n = (save.levels || {}).rewild || 0;
  if (n) {
    save.habitat.woodland = [...new Set([...(save.habitat.woodland || []), ...OLD_REWILD_ORDER.slice(0, n)])];
    delete save.levels.rewild;
    return true;
  }
  return false;
}
