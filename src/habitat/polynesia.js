// polynesia (Tonga, Samoa, Cook Islands, French Polynesia; "Polynesian islands"): habitat projects and the animals they
// bring back. Researched 2026-10-30 in one pass; every URL below was fetched (WebFetch or curl, status 200) and the page
// was checked for the claim (notes: /tmp/poly/notes.md). Some pages are in French. factChecked: false.
// DONATE rule (the user via the Coordinator, 2026-10-28): the organisation's own domain, or the page its own site links to.
// Each org.donate below records which in a trailing comment.
const TIS = 'https://tiscookislands.org/';
const SOP = 'https://manu.pf/', SOPD = 'https://manu.pf/produit/donation/';
const SCS = 'https://samoaconservationsociety.com/';
const TMM = 'https://www.temanaotemoana.org/en/';
const TS = 'https://www.tetiaroasociety.org/';
export const PROJECTS = [
  { id: 'kakerorisave', name: 'Keep rats away from kakerori nests', tier: 1, band: 'cheap',
    short: 'Every year, volunteers put out rat bait in a forest on Rarotonga, so the kakerori birds can raise their chicks.',
    chain: ['Rat bait goes out each year', 'fewer rats climb to the nests', 'more kakerori chicks grow up'],
    fact: 'There were fewer than 30 kakerori in the wild in the early 1990s. Now there are more than 700.',
    src: [['Te Ipukarea Society: The Takitumu Conservation Area', `${TIS}the-takitumu-conservation-area/`], ['Cook Islands News: Kākerōri project wins major conservation award', 'https://www.cookislandsnews.com/uncategorised/national/local/environment/kakerori-revitalisation-project-wins-major-conservation-award/']],
    org: { name: 'Te Ipukarea Society (Takitumu Conservation Area)', learn: `${TIS}the-takitumu-conservation-area/`, donate: `${TIS}join-donate/` } },   // own domain
  { id: 'coralplant', name: 'Plant baby corals on the reef', tier: 1, band: 'mid',
    short: 'Divers grow small pieces of coral in an underwater nursery, then plant them back on the reef in Moorea.',
    chain: ['Coral pieces grow in a nursery', 'they are planted on the reef', 'fish come back to live in the coral'],
    fact: 'Coral Gardeners started in Moorea in 2017. It has now planted more than 240,000 corals in French Polynesia, Fiji and Thailand.',
    src: [['Tahiti Tourisme: Adopt a coral in Moorea', 'https://www.tahititourisme.com/adopt-a-coral-in-moorea/'], ['Coral Gardeners', 'https://coralgardeners.org/']],
    org: { name: 'Coral Gardeners', learn: 'https://coralgardeners.org/', donate: 'https://coralgardeners.org/donate' } },   // own domain
  { id: 'monarchguard', name: 'Save the Tahiti monarch', tier: 2, band: 'mid',
    short: 'Bird workers watch every nest of this tiny black bird, trap rats and plant back native trees in its valleys.',
    chain: ['Nests are watched and rats are trapped', 'more chicks leave the nest', 'the monarch spreads to new valleys'],
    fact: 'Only 19 Tahiti monarchs were left in 1998. Now there are more than 120.',
    src: [['BirdLife International: Last chance (2023)', 'https://www.birdlife.org/news/2023/01/10/last-chance']],
    org: { name: 'SOP Manu (Société d\'Ornithologie de Polynésie)', learn: SOP, donate: SOPD } },   // own domain
  { id: 'manumeasearch', name: 'Find and protect the manumea', tier: 2, band: 'mid',
    short: 'People in Samoa listen for the rare manumea pigeon with sound recorders, and villages agree to keep its forest safe.',
    chain: ['Recorders listen in the forest', 'people learn where the birds live', 'villages protect those forests'],
    fact: 'The manumea is Samoa\'s national bird, and BirdLife thinks fewer than 250 are left.',   /* (BirdLife 2024, cited by SCS; Colossal says fewer than 100: the cautious, standard figure is used) */
    src: [['Samoa Conservation Society: Protecting the Manumea', `${SCS}projects/protecting-the-manumea/`], ['Colossal Foundation and Samoa Conservation Society press release (silicon.co.uk)', 'https://www.silicon.co.uk/press-release/the-colossal-foundation-partners-with-the-samoa-conservation-society-to-find-the-critically-endangered-tooth-billed-pigeon-through-advanced-bioacoustic-technologies'], ['Samoa Observer: Plan to save Samoa\'s national bird launched', 'https://www.samoaobserver.ws/category/samoa/64553']],
    org: { name: 'Samoa Conservation Society', learn: `${SCS}projects/protecting-the-manumea/`, donate: `${SCS}about/membership-form/` } },   // own domain; no donate page found, membership form is the support page its own site links to
  { id: 'turtleclinic', name: 'Care for hurt sea turtles', tier: 2, band: 'mid',
    short: 'A turtle clinic in Moorea treats hurt sea turtles, and a team watches the beaches where turtles lay their eggs.',
    chain: ['Hurt turtles are treated', 'they swim free again', 'nests on the beach are counted and kept safe'],
    fact: 'The turtle clinic opened in 2004. Since 2007, the team has patrolled Tetiaroa\'s beaches each nesting season to find and mark turtle nests.',
    src: [['Te Mana o Te Moana: Conservation', `${TMM}conservation/`], ['Tetiaroa Society: 2024 Impact Report', `${TS}2024-impact-report`]],
    org: { name: 'Te Mana o Te Moana', learn: `${TMM}conservation/`, donate: `${TMM}donate/` } },   // own domain
  { id: 'tetiaroarats', name: 'Make Tetiaroa rat-free', tier: 2, band: 'mid',
    short: 'Teams cleared rats off the little islands of Tetiaroa atoll, one by one, so seabirds, crabs and baby turtles are safe.',
    chain: ['Rats are cleared island by island', 'cameras check they stay gone', 'seabirds and crabs come back'],
    fact: 'The work began on one islet in 2018. In June 2026, no rats were found on any of the islets being checked.',
    src: [['Tetiaroa Society: Rat eradication', `${TS}programs/conservation/tarp-rat-eradication`]],
    org: { name: 'Tetiaroa Society (with Island Conservation)', learn: `${TS}programs/conservation/tarp-rat-eradication`, donate: `${TS}donate` } },   // own domain
  { id: 'atollrats', name: 'Clear rats from far-off atolls', tier: 3, band: 'big',
    short: 'A big team sailed to remote atolls and used helicopters to clear rats, so rare birds could nest safely again.',
    chain: ['Ships and helicopters reach the atolls', 'rats are cleared from five islands', 'rare doves and seabirds come back'],
    fact: 'Rats were cleared from five of six islands, about 1,200 hectares. The rare Polynesian ground-dove now lives on three restored islands.',
    src: [['BirdLife International: It worked! Rare birds recovering', 'https://www.birdlife.org/news/2021/11/22/it-worked-rare-birds-recovering-thanks-to-ambitious-island-restoration/'], ['Island Conservation: Expedition to save the Polynesian ground-dove', 'https://www.islandconservation.org/update-from-the-field-expedition-to-save-critically-endangered-polynesian-ground-dove-on-track-to-be-a-success/']],
    org: { name: 'BirdLife, SOP Manu and Island Conservation', learn: 'https://www.birdlife.org/news/2021/11/22/it-worked-rare-birds-recovering-thanks-to-ambitious-island-restoration/', donate: 'https://www.islandconservation.org/donate/' } },   // Island Conservation's own domain (linked from its own project page)
  { id: 'coralschool', name: 'A school coral garden in Vava\'u', tier: 2, band: 'cheap',
    short: 'Children in a village school in Tonga snorkel each week to look after a coral nursery they can see from their classroom.',
    chain: ['Corals grow in a nursery', 'children clean and count them', 'the reef and its fish get help'],
    fact: 'The nursery began in 2012. Each week the students snorkel to measure the corals and count fish.',
    src: [['Khaled bin Sultan Living Oceans Foundation: Backyard classroom', 'https://livingoceansfoundation.org/backyard-classroom']],
    org: { name: 'Vava\'u Environmental Protection Association (VEPA)', learn: 'https://vavauenvironment.org/', donate: 'https://vavauenvironment.org/donate/' } },   // own domain
];

const sp = (name, kind, rarity, needs, why, fact, src) => ({ name, kind, rarity, needs, why, fact, src });
const ADW = 'https://animaldiversity.org/accounts/';
export const SPECIES = {
  flyingfox: sp('Pacific flying fox', 'animal', 'common', [], 'Flying foxes live on Pacific islands out to the Cook Islands, and feed on fruit and flowers.', 'About 30 out of every 100 kinds of plant on Samoa need flying foxes to carry their pollen or seeds.', [['Animal Diversity Web: Pteropus tonganus', `${ADW}Pteropus_tonganus/`]]),
  reefheron: sp('Pacific reef heron', 'bird', 'common', [], 'Reef herons live throughout Polynesia and hunt small fish and crabs in shallow water on the reef.', 'Some reef herons are dark grey and some are pure white, but they are the same kind of bird.', [['NZ Birds Online: Reef heron', 'https://www.nzbirdsonline.org.nz/species/reef-heron'], ['Wikipedia: Pacific reef heron', 'https://en.wikipedia.org/wiki/Pacific_reef_heron']]),
  whitetern: sp('White tern', 'bird', 'common', [], 'White terns nest on islands with trees, and they come back when rats are gone.', 'A white tern lays its egg on a bare branch with no nest, and the chick holds on with strong feet.', [['Wikipedia: Common white tern', 'https://en.wikipedia.org/wiki/Common_white_tern'], ['Tetiaroa Society: 2024 Impact Report', `${TS}2024-impact-report`]]),
  imperialpigeon: sp('Pacific imperial pigeon', 'bird', 'common', [], 'This big pigeon lives in the forests of Samoa, Tonga and the Cook Islands, and eats fruit.', 'In Tonga it eats the fruit of at least 38 kinds of native tree, and it is one of the most important birds for planting their big seeds.', [['Victoria University of Wellington thesis: Pacific pigeons as seed dispersers in Tonga', 'https://ir.wgtn.ac.nz/handle/123456789/22092'], ['Wikipedia: Pacific imperial pigeon', 'https://en.wikipedia.org/wiki/Pacific_imperial_pigeon']]),
  humpback: sp('Humpback whale', 'animal', 'common', [], 'Humpbacks swim to the warm waters of Tonga each winter to have their calves.', 'A humpback can grow up to about 18 m long, and some swim about 8,000 km between feeding and breeding waters.', [['NOAA Fisheries: Humpback whale', 'https://www.fisheries.noaa.gov/species/humpback-whale'], ['IMMA factsheet: Tongan Archipelago', 'https://www.marinemammalhabitat.org/wp-content/uploads/imma-factsheets/PacificIslands/tongan-archipelago-PacificIslands.pdf']]),
  greenturtle: sp('Green sea turtle', 'animal', 'uncommon', ['turtleclinic'], 'Turtles that are hurt get treated, and their nesting beaches are watched.', 'Green turtles are named after the colour of their fat, and they eat mostly seagrass and seaweed.', [['NOAA Fisheries: Green turtle', 'https://www.fisheries.noaa.gov/species/green-turtle']]),
  coconutcrab: sp('Coconut crab', 'animal', 'uncommon', ['tetiaroarats'], 'Coconut crabs do better on islands where the rats have been cleared.', 'The coconut crab is the biggest animal with jointed legs that lives on land. It can weigh up to 4 kg.', [['Animal Diversity Web: Birgus latro', `${ADW}Birgus_latro/`], ['Tetiaroa Society: Rat eradication', `${TS}programs/conservation/tarp-rat-eradication`]]),
  malau: sp('Malau (Tongan megapode)', 'bird', 'uncommon', [], 'The malau lives only on the volcano island of Niuafo\'ou in Tonga.', 'The malau does not sit on its eggs. It buries them in soil warmed by the volcano and lets the heat do the work.', [['Key Biodiversity Areas: Niuafo\'ou', 'https://www.keybiodiversityareas.org/site/factsheet/24503']]),
  kakerori: sp('Kakerori (Rarotonga monarch)', 'bird', 'rare', ['kakerorisave'], 'Rats eat kakerori eggs and chicks, so rat control lets more chicks grow up.', 'Young kakerori are orange. By their fourth year they have turned all grey.', [['Birds of the World: Rarotonga Monarch', 'https://birdsoftheworld.org/bow/species/rarmon1/cur/introduction'], ['Wikipedia: Rarotonga monarch', 'https://en.wikipedia.org/wiki/Rarotonga_monarch']]),
  tahitimonarch: sp('Tahiti monarch (ʻōmāmā)', 'bird', 'rare', ['monarchguard'], 'Trapping rats and guarding nests helps this tiny bird in the valleys of Tahiti.', 'The grown-up bird is shiny black with a pale blue beak, and it is only about 15 cm long.', [['Birds of the World: Tahiti Monarch', 'https://birdsoftheworld.org/bow/species/tahmon2/cur/introduction'], ['Wikipedia: Tahiti monarch', 'https://en.wikipedia.org/wiki/Tahiti_monarch']]),
  manumea: sp('Manumea (tooth-billed pigeon)', 'bird', 'legendary', ['manumeasearch'], 'Finding where the last manumea live lets villages protect those forests.', 'The manumea is one of the closest living relatives of the dodo.', [['Colossal Foundation and Samoa Conservation Society press release (silicon.co.uk)', 'https://www.silicon.co.uk/press-release/the-colossal-foundation-partners-with-the-samoa-conservation-society-to-find-the-critically-endangered-tooth-billed-pigeon-through-advanced-bioacoustic-technologies']]),
};
