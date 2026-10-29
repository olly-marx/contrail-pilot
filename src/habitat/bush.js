// bush (Australia, "Australian bush"): habitat projects and the animals they bring back. Researched 2026-10-24 in 3 passes
// (notes outside the repo: ~/contrail-research/australia.v3.md, every number grepped in the raw page). factChecked: false.
// DONATE rule (the user via the Coordinator, 2026-10-28): only the organisation's own domain, or the page its own site links
// to; the chain is noted beside each link. The koala is RARE (federally Endangered in Qld/NSW/ACT: the user's decision).
const AM = 'https://australian.museum/learn/animals/', AWC = 'https://www.australianwildlife.org/';
export const PROJECTS = [
  { id: 'platypusbank', name: 'Fence and plant the riverbank', tier: 1, band: 'cheap',
    short: 'Keep cattle off creek banks and plant native bushes and trees along the water.',
    chain: ['Fence the bank', 'plants grow back thick', 'platypuses can hide from foxes and dig burrows'],
    fact: 'A good rule of thumb is a strip of plants at least 30 metres wide on both banks of a small creek, and at least 50 metres on both banks of a big river.',
    src: [['Australian Platypus Conservancy: Managing platypus bank habitats', 'https://platypus.asn.au/protecting-and-improving-bank-habitats/']],
    org: { name: 'Australian Platypus Conservancy', learn: 'https://platypus.asn.au/protecting-and-improving-bank-habitats/', donate: 'https://platypus.asn.au/how-you-can-help/' } },   // own domain
  { id: 'koalacare', name: 'Koala trees and rescue', tier: 1, band: 'cheap',
    short: 'Plant the gum trees koalas eat, and rescue and look after hurt koalas.',
    chain: ['Plant food trees', 'koalas have homes and food', 'hurt koalas are cared for and let go'],
    fact: 'Koala Conservation Australia has looked after more than 5,000 koalas and planted 14,000 trees.',
    src: [['Koala Conservation Australia', 'https://koalaconservationaustralia.org.au/']],
    org: { name: 'Koala Conservation Australia', learn: 'https://koalaconservationaustralia.org.au/', donate: 'https://koalaconservationaustralia.org.au/collections/donations' } },   // own domain
  { id: 'gouldianfire', name: 'Early burns for finches', tier: 2, band: 'mid',
    short: 'Rangers light small, cool fires early in the dry season so big hot fires do not burn finch homes later.',
    chain: ['Small early burns', 'big late fires are stopped', 'finches keep their seeds and nest trees'],
    fact: 'In 2015 the Kija project burned about 15,200 square kilometres early and protected six Gouldian finch populations.',
    src: [['WWF-Australia: Gouldian finch (Kija Fire and Feathers)', 'https://wwf.org.au/what-we-do/species/gouldian-finch'], ['AWC: Gouldian finch', `${AWC}animals/gouldian-finch`]],
    org: { name: 'WWF-Australia, with the Kija Rangers and the Kimberley Land Council', learn: 'https://wwf.org.au/what-we-do/species/gouldian-finch', donate: 'https://wwf.org.au/donate' } },   // own domain (general page)
  { id: 'cassowarylink', name: 'Cassowary rainforest corridors', tier: 2, band: 'mid',
    short: 'Plant rainforest trees and buy back land so cassowaries can walk between forest patches.',
    chain: ['Replant and protect forest links', 'cassowaries can roam safely', 'they spread the seeds that grow new trees'],
    fact: 'Cassowaries are the only animals that can spread the seeds of more than 70 kinds of big-fruited rainforest trees.',
    src: [['Mission Beach Cassowaries', 'https://www.missionbeachcassowaries.com/'], ['C4: Community for Coastal and Cassowary Conservation', 'https://cassowaryconservation.org/']],
    org: { name: 'Community for Coastal and Cassowary Conservation (C4), Mission Beach', learn: 'https://cassowaryconservation.org/', donate: 'https://cassowaryconservation.org/donate/' } },   // own domain
  { id: 'numbatwa', name: 'Numbat helpers', tier: 2, band: 'mid',
    short: 'Look after numbat bushland and control the foxes and cats that hunt numbats.',
    chain: ['Fewer foxes and cats', 'numbats survive', 'more numbats are found in the wild'],
    fact: 'Numbats were down to around 300 in the late 1970s. Today about 2,000 to 3,000 are left in the wild.',
    src: [['Project Numbat', 'https://www.numbat.org.au/'], ['AWC: Numbat', `${AWC}animals/numbat`]],
    org: { name: 'Project Numbat (supports the Numbat Recovery Program)', learn: 'https://www.numbat.org.au/', donate: 'https://www.numbat.org.au/donations' } },   // own domain
  { id: 'westernshield', name: 'Fox and cat control in the south-west', tier: 2, band: 'mid',
    short: 'Rangers control foxes and feral cats over huge areas of bush so small animals can live safely.',
    chain: ['Fewer foxes and cats', 'small animals survive', 'numbats, quokkas and woylies spread again'],
    fact: 'Western Shield in Western Australia is 30 years old, and its fox and cat control now covers 4.7 million hectares.',
    src: [['WA Government: Western Shield celebrates 30 years', 'https://www.wa.gov.au/government/media-statements/Cook%20Labor%20Government/Western-Shield-celebrates-30-years-of-protecting-native-wildlife-20260907'], ['DBCA: Western Shield', 'https://www.dbca.wa.gov.au/management/threat-management/invasive-animals/western-shield']],
    org: { name: 'Dept of Biodiversity, Conservation and Attractions (Government of Western Australia)', learn: 'https://www.dbca.wa.gov.au/management/threat-management/invasive-animals/western-shield', donate: null } },
  { id: 'kirefuge', name: 'Island refuge after the fires', tier: 2, band: 'mid',
    short: 'After a huge fire, fence off a patch of bush and keep cats out so tiny animals can recover.',
    chain: ['A fenced, cat-free refuge', 'the bush grows back', 'the island\'s rarest little marsupial bounces back'],
    fact: 'The fence protects 369 hectares of unburnt and regrowing bush on Kangaroo Island, and the refuge was declared cat-free in 2021.',
    src: [['AWC: The recovery of the Kangaroo Island dunnart', `${AWC}news-and-resources/news/the-recovery-of-the-kangaroo-island-dunnart`]],
    org: { name: 'Australian Wildlife Conservancy (Western River Refuge)', learn: `${AWC}news-and-resources/news/the-recovery-of-the-kangaroo-island-dunnart`, donate: `${AWC}donate` } },   // own domain
  { id: 'catfree', name: 'Cat-proof fenced havens', tier: 3, band: 'big',
    short: 'Build big fences that keep feral cats and foxes out, then bring back animals that have gone from the wild.',
    chain: ['A predator-proof fence', 'cats and foxes are kept out', 'lost animals are brought back'],
    fact: 'AWC has started 50 groups of 20 threatened animals across 10 places.',
    src: [['AWC: Restoring wildlife', `${AWC}what-we-do/restoring-wildlife`], ['AWC: Fighting weeds and feral animals', `${AWC}what-we-do/fighting-weeds-and-feral-animals`], ['Arid Recovery: Our reserve', 'https://aridrecovery.org.au/what-we-do/our-reserve']],
    org: { name: 'Australian Wildlife Conservancy (AWC)', learn: `${AWC}what-we-do/fighting-weeds-and-feral-animals`, donate: `${AWC}donate` } },   // own domain
  { id: 'bilbyfund', name: 'Bilby comeback', tier: 3, band: 'big',
    short: 'Keep bilbies safe inside a cat-proof fence, then let some go into the wild where bilbies used to live.',
    chain: ['A safe fenced home', 'bilbies breed', 'some are let go in the wild, with feral cats watched'],
    fact: 'In 2026, 150 bilbies were let go in the wild at Currawinya National Park in Queensland, where wild bilbies were last seen in the 1970s.',
    src: [['Save the Bilby Fund: Bilbies are back in the wild at Currawinya', 'https://savethebilbyfund.org.au/bilbies-are-back-in-the-wild-at-currawinya-150-released/'], ['Save the Bilby Fund: Help bilbies', 'https://savethebilbyfund.org.au/help-bilbies/']],
    org: { name: 'Save the Bilby Fund (with Queensland Parks and Wildlife Service)', learn: 'https://savethebilbyfund.org.au/help-bilbies/', donate: 'https://savethebilbyfund.org.au/donate/' } },   // own domain
  { id: 'devilprog', name: 'Save the Tasmanian Devil', tier: 3, band: 'big',
    short: 'Keep a safe, healthy group of devils and let some go in places where wild devils are sick.',
    chain: ['A safe breeding group', 'healthy devils are released', 'wild devils get new, stronger family lines'],
    fact: 'A 2017 trial let 33 healthy devils from the safe group go at one spot, and the wild devils there then had more varied genes.',
    src: [['NRE Tasmania: Save the Tasmanian Devil Program brings dream to reality', 'https://nre.tas.gov.au/about-the-department/news/save-the-tasmanian-devil-program-brings-dream-to-reality']],
    org: { name: 'Save the Tasmanian Devil Program (Tasmanian Government)', learn: 'https://nre.tas.gov.au/about-the-department/news/save-the-tasmanian-devil-program-brings-dream-to-reality',
      donate: null } },   // none: the program's own donate pages loop, and the university appeal is not linked from them (rule: own domain or linked from it)
  { id: 'wombatsafe', name: 'Hairy-nosed wombat helpers', tier: 3, band: 'big',
    short: 'Count the wombats, map where they could live, and look after the last few.',
    chain: ['Count wombats and map the plants', 'they get more safe places to live', 'numbers grow'],
    fact: 'The northern hairy-nosed wombat was once down to 35. There are now over 400, which is still very few.',
    src: [['Wombat Foundation', 'https://www.wombatfoundation.com.au/']],
    org: { name: 'The Wombat Foundation', learn: 'https://www.wombatfoundation.com.au/', donate: 'https://www.wombatfoundation.com.au/#getinvolved' } },   // own domain (its home page's donate panel)
];
const sp = (name, kind, rarity, needs, why, fact, src) => ({ name, kind, rarity, needs, why, fact, src });
export const SPECIES = {
  redkangaroo: sp('Red kangaroo', 'animal', 'common', [], 'Red kangaroos like open plains, grass and woodland.', 'A baby red kangaroo is the size of a jellybean when it is born, then climbs into its mum\'s pouch.', [['Australian Museum: Red Kangaroo', `${AM}mammals/red-kangaroo/`]]),
  emu: sp('Emu', 'bird', 'common', [], 'Emus live in forest and woodland.', 'Dad emu sits on the eggs and does not eat, drink or leave the nest the whole time.', [['Australian Museum: Emu', `${AM}birds/emu/`]]),
  kookaburra: sp('Laughing kookaburra', 'bird', 'common', [], 'Kookaburras live wherever there are suitable trees.', 'A kookaburra\'s "laugh" is really a shout telling other birds to keep away.', [['Australian Museum: Laughing Kookaburra', `${AM}birds/laughing-kookaburra/`]]),
  echidna: sp('Short-beaked echidna', 'animal', 'common', [], 'Echidnas live in forests, grassland and dry places all over Australia, even Tasmania.', 'An echidna lays one egg at a time, and catches ants and termites with a sticky tongue.', [['Australian Museum: Short-beaked Echidna', `${AM}mammals/short-beaked-echidna/`]]),
  cockatoo: sp('Sulphur-crested cockatoo', 'bird', 'common', [], 'These cockatoos are loud and easy to spot, and often live near people\'s homes.', 'A sulphur-crested cockatoo can live up to 80 years in captivity.', [['Australian Museum: Sulphur-crested Cockatoo', `${AM}birds/sulphur-crested-cockatoo/`]]),
  wombat: sp('Common wombat', 'animal', 'uncommon', [], 'Wombats dig their burrows on slopes above creeks and gullies in the cool forests of the south-east.', 'Wombats spend about two thirds of their lives in their burrows.', [['Australian Museum: Bare-nosed Wombat', `${AM}mammals/bare-nosed-wombat/`]]),
  wedgetail: sp('Wedge-tailed eagle', 'bird', 'uncommon', [], 'Wedge-tailed eagles live from the coast up to the mountains.', 'Its wings stretch 2.3 metres across, and it eats mostly dead animals it finds.', [['Australian Museum: Wedge-tailed Eagle', `${AM}birds/wedge-tailed-eagle/`]]),
  platypus: sp('Platypus', 'animal', 'uncommon', ['platypusbank'], 'Planted, fenced riverbanks give platypuses cover from foxes and places to dig burrows.', 'A platypus finds food with its bill, which can sense electricity, and it closes its eyes, ears and nose under water.', [['Australian Museum: Platypus', `${AM}mammals/platypus/`], ['Australian Platypus Conservancy', 'https://platypus.asn.au/protecting-and-improving-bank-habitats/']]),
  quokka: sp('Quokka', 'animal', 'uncommon', ['westernshield'], 'Quokkas live in the south-west near Perth. Fox and cat control, and Rottnest Island having no foxes, help them.', 'A quokka is one of the smallest wallabies, about 40 to 54 cm long.', [['Australian Museum: Quokka', `${AM}mammals/quokka/`], ['DBCA: Western Shield', 'https://www.dbca.wa.gov.au/management/threat-management/invasive-animals/western-shield']]),
  murraycod: sp('Murray cod', 'animal', 'uncommon', [], 'Murray cod live in the rivers of the Murray-Darling area.', 'The Murray cod is Australia\'s biggest freshwater fish. It can reach 1.8 m long, though most seen are about 70 cm.', [['Australian Museum: Murray Cod', `${AM}fishes/murray-cod-maccullochella-peelii/`]]),
  koala: sp('Koala', 'animal', 'rare', ['koalacare'], 'Koalas need gum forests, and planting food trees gives them homes. Hurt koalas get care.', 'Koalas eat mostly eucalyptus leaves and spend most of their time in the trees.', [['Australian Museum: Koala', `${AM}mammals/koala/`], ['Koala Conservation Australia', 'https://koalaconservationaustralia.org.au/']]),
  bilby: sp('Greater bilby', 'animal', 'rare', ['catfree', 'bilbyfund'], 'Bilbies are kept safe inside cat-proof fences, and some are now being let go in the wild again.', 'A bilby digs a spiral burrow up to 3 metres long.', [['AWC: Greater bilby', `${AWC}animals/greater-bilby`], ['Australian Museum: Greater Bilby', `${AM}mammals/greater-bilby/`]]),
  numbat: sp('Numbat', 'animal', 'rare', ['numbatwa', 'catfree', 'westernshield'], 'Foxes and cats are the main danger. Controlling them, and fenced havens, keep numbats safe.', 'Numbats eat almost only termites.', [['AWC: Numbat', `${AWC}animals/numbat`], ['Project Numbat', 'https://www.numbat.org.au/']]),
  woylie: sp('Woylie (brush-tailed bettong)', 'animal', 'rare', ['catfree', 'westernshield'], 'Woylies live inside fenced havens and where foxes and cats are controlled.', 'Woylies dig up about 6 tonnes of soil a year, hunting for underground fungi called truffles.', [['AWC: Brush-tailed bettong (woylie)', `${AWC}animals/brush-tailed-bettong-woylie`]]),
  bettong: sp('Burrowing bettong', 'animal', 'rare', ['catfree'], 'Burrowing bettongs have been brought back inside fenced havens.', 'Burrowing bettongs live in big shared burrows of 20 to 40 animals, some with 4 to 94 entrances.', [['AWC: Burrowing bettong', `${AWC}animals/burrowing-bettong`]]),
  nailtail: sp('Bridled nailtail wallaby', 'animal', 'rare', ['catfree'], 'Fenced predator-free areas let this wallaby live safely again.', 'People thought this wallaby had died out, until a few were found by chance in 1973.', [['AWC: Bridled nailtail wallaby', `${AWC}animals/bridled-nailtail-wallaby`]]),
  phascogale: sp('Red-tailed phascogale', 'animal', 'rare', ['catfree'], 'Cats are the main cause of its decline, so it is moved into fenced, cat-free areas.', 'A red-tailed phascogale weighs up to only 68 grams.', [['AWC: Red-tailed phascogale', `${AWC}animals/red-tailed-phascogale`]]),
  nquoll: sp('Northern quoll', 'animal', 'rare', ['gouldianfire', 'catfree'], 'Big hot fires late in the dry season, and feral cats, leave quolls with nowhere to hide. Early small burns and cat control help.', 'Every northern quoll has a spot pattern on its back like a fingerprint, so scientists can tell them apart.', [['AWC: Northern quoll', `${AWC}animals/northern-quoll`], ['Charles Darwin University: Quoll-ity research', 'https://www.cdu.edu.au/news/quoll-ity-research-aims-help-northern-quoll-bounce-back']]),
  devil: sp('Tasmanian devil', 'animal', 'legendary', ['devilprog'], 'A sickness that gives devils lumps on their faces spread through the wild ones, so a safe group of healthy devils is bred and some are let go.', 'Tasmanian devils eat mostly dead animals, and their strong jaws crunch up bones and fur too.', [['Australian Museum: Tasmanian Devil', `${AM}mammals/tasmanian-devil/`], ['NRE Tasmania: Save the Tasmanian Devil Program', 'https://nre.tas.gov.au/about-the-department/news/save-the-tasmanian-devil-program-brings-dream-to-reality']]),
  cassowary: sp('Southern cassowary', 'bird', 'legendary', ['cassowarylink'], 'Cassowaries need rainforest linked together. Replanted corridors let them roam and spread seeds.', 'Dad cassowary sits on the eggs and raises the chicks on his own.', [['Australian Museum: Southern Cassowary', `${AM}birds/southern-cassowary/`], ['C4', 'https://cassowaryconservation.org/']]),
  hairynosed: sp('Northern hairy-nosed wombat', 'animal', 'legendary', ['wombatsafe'], 'These wombats once dropped to 35 animals. People now count them and map new homes for them.', 'There were once only 35 of them. Now there are over 400, which is still very few.', [['Wombat Foundation', 'https://www.wombatfoundation.com.au/']]),
  gouldian: sp('Gouldian finch', 'bird', 'legendary', ['gouldianfire'], 'Big hot fires late in the dry season burn the seeds and nest hollows. Early, small burns protect them.', 'A Gouldian finch has a green back, yellow belly and purple chest, and nests only in tree hollows or holes in termite mounds.', [['Australian Museum: Gouldian Finch', `${AM}birds/gouldian-finch/`], ['AWC: Gouldian finch', `${AWC}animals/gouldian-finch`]]),
  kidunnart: sp('Kangaroo Island dunnart', 'animal', 'legendary', ['kirefuge'], 'Fire burnt almost all of its home. A fenced, cat-free refuge gave it a safe place to recover.', 'A Kangaroo Island dunnart weighs less than 25 grams.', [['AWC: The recovery of the Kangaroo Island dunnart', `${AWC}news-and-resources/news/the-recovery-of-the-kangaroo-island-dunnart`]]),
};
