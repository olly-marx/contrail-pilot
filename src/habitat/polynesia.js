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
  { id: 'kakerorisave', row: 'Rat bait for kakerori', name: 'Keep rats away from kakerori nests', tier: 1, band: 'cheap',
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
    src: [['Samoa Conservation Society: Protecting the Manumea (citing BirdLife International, the IUCN Red List authority, 2024: fewer than 250)', `${SCS}projects/protecting-the-manumea/`], ['Colossal Foundation and Samoa Conservation Society press release (silicon.co.uk)', 'https://www.silicon.co.uk/press-release/the-colossal-foundation-partners-with-the-samoa-conservation-society-to-find-the-critically-endangered-tooth-billed-pigeon-through-advanced-bioacoustic-technologies'], ['Samoa Observer: Plan to save Samoa\'s national bird launched', 'https://www.samoaobserver.ws/category/samoa/64553']],
    org: { name: 'Samoa Conservation Society', learn: `${SCS}projects/protecting-the-manumea/`, donate: `${SCS}about/membership-form/`, donateLabel: 'Join / support them' } },   // own domain; no donate page found, membership form is the support page its own site links to
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

  // Sea projects (the user, 2026-11-13: an island land's 100 should be mostly sea; research/BACKLOG.md W3). Researched 2026-11-13;
  // every URL fetched (status 200) and the quoted claim found on the page, except where a comment says otherwise. factChecked: false.
  { id: 'rahui', name: 'Rest part of the lagoon (rāhui)', tier: 1, band: 'big',
    short: 'A village sets aside part of its lagoon as a rāhui, an old Tahitian rule: nobody may fish there, dive there or even sail through.',
    chain: ['Part of the lagoon is left alone', 'fish there can grow and breed', 'the village and scientists check how the reef is doing'],
    fact: 'In 2014, the people of Teahupo\'o in Tahiti set aside about 5 of every 100 parts of their lagoon as a rāhui. Nobody may fish there, or even go in.',
    src: [['Mongabay: French Polynesians revive traditional rāhui (2024)', 'https://news.mongabay.com/2024/07/french-polynesians-revive-traditional-rahui-to-protect-fish-and-livelihoods/']],
    org: { name: 'The village of Teahupo\'o, with the Rāhui Center', learn: 'https://news.mongabay.com/2024/07/french-polynesians-revive-traditional-rahui-to-protect-fish-and-livelihoods/', donate: null } },   // no own site with a donate page found: no donate link
  { id: 'mantacount', name: 'Count the manta rays', tier: 2, band: 'cheap',
    short: 'Divers send in photos of the manta rays they meet, and scientists use them to tell each manta apart and learn where they live.',
    chain: ['Divers photograph manta rays', 'each photo shows which manta it is', 'scientists learn which places mantas need'],
    fact: 'The French Polynesia Manta Project began in 2015. Photos from divers have found more than 400 different manta rays across 3 of the island groups.',
    src: [['Manta Trust: French Polynesia Manta Project', 'https://www.mantatrust.org/french-polynesia']],
    org: { name: 'Observatoire des Requins de Polynésie, with the Manta Trust', learn: 'https://www.mantatrust.org/french-polynesia', donate: 'https://www.mantatrust.org/donate' } },   // own domain (the Manta Trust's)
  { id: 'sharksafe', name: 'Keep every shark safe', tier: 2, band: 'big',
    short: 'A law made all of French Polynesia\'s sea a safe place for sharks and rays: nobody may catch them or sell their fins.',
    chain: ['Sharks may not be caught', 'more sharks hunt on the reef', 'divers count the sharks to see if it works'],
    fact: 'In 2006, French Polynesia made its whole sea, about 5.5 million km², safe for every shark and ray but one, the shortfin mako. Six years later the mako was protected too.',
    src: [['Mongabay: 18 years on, how are sharks faring in French Polynesia\'s shark sanctuary? (2024)', 'https://news.mongabay.com/2024/05/18-years-on-how-are-sharks-faring-in-french-polynesias-shark-sanctuary/']],
    org: { name: 'Observatoire des Requins de Polynésie (the Shark Observatory)', learn: 'https://www.requinsdepolynesie.com/index.php', donate: 'https://www.requinsdepolynesie.com/orp/don.php' } },   // own domain (bank transfer only; the page is in French)
  { id: 'maraemoana', name: 'Make the whole ocean a park', tier: 3, band: 'mid',
    short: 'The Cook Islands made all of its ocean one big marine park, Marae Moana, with no big fishing boats or sea-bed mining close to the islands.',
    chain: ['The whole ocean becomes a park', 'the waters near each island are kept for small fishing only', 'reefs, fish and whales have room to recover'],
    fact: 'In July 2017, the Cook Islands made its whole ocean, nearly 2 million km², into Marae Moana. For 50 nautical miles round each island there is no big fishing or sea-bed mining.',
    src: [['Marae Moana (Cook Islands Government)', 'https://www.maraemoana.gov.ck/'], ['Wikipedia: Marae Moana (the 50 nautical miles)', 'https://en.wikipedia.org/wiki/Marae_Moana']],
    org: { name: 'Marae Moana (Cook Islands)', learn: 'https://www.maraemoana.gov.ck/', donate: `${TIS}join-donate/`, donateLabel: 'Support Te Ipukarea Society' } },   // TIS's own domain; that TIS worked on the park is from search results (IUCN), not a fetched page
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
  mantaray: sp('Reef manta ray', 'animal', 'rare', ['mantacount'], 'Knowing each manta from photos shows which places they need, so those places can be kept safe.', 'The French Polynesia Manta Project has found 137 different reef manta rays around Bora Bora alone.', [['Manta Trust: French Polynesia Manta Project', 'https://www.mantatrust.org/french-polynesia']]),
  reefshark: sp('Blacktip reef shark', 'animal', 'uncommon', ['sharksafe'], 'Sharks may not be caught anywhere in French Polynesia\'s sea, so they can hunt on the reef in peace.', 'Divers and dive centres help scientists count the sharks in French Polynesia\'s sea.', [['Mongabay: 18 years on, how are sharks faring in French Polynesia\'s shark sanctuary? (2024)', 'https://news.mongabay.com/2024/05/18-years-on-how-are-sharks-faring-in-french-polynesias-shark-sanctuary/']]),
  manumea: sp('Manumea (tooth-billed pigeon)', 'bird', 'legendary', ['manumeasearch'], 'Finding where the last manumea live lets villages protect those forests.', 'The manumea is one of the closest living relatives of the dodo.', [['Colossal Foundation and Samoa Conservation Society press release (silicon.co.uk)', 'https://www.silicon.co.uk/press-release/the-colossal-foundation-partners-with-the-samoa-conservation-society-to-find-the-critically-endangered-tooth-billed-pigeon-through-advanced-bioacoustic-technologies']]),
};
