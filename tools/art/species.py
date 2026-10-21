"""The wild-area species list: the single source for names, regions, facts and drawing dials.

Run from the repo root:  python3 tools/art/make_wildlife.py
That draws every species that has dials (assets/animal-<id>-0/1.png, assets/sky-<id>-0/1.png)
and writes src/wildlife.js for the game. Species without dials yet are listed with art: null.

Facts are short and kid-friendly; factChecked stays False until a person has checked them.
Region ids match the Phase 2 table in STATE.md.
"""

REGIONS = {
    'woodland':      {'name': 'Woodland & farms', 'cities': ['LONDON', 'PARIS', 'BERLIN']},
    'mediterranean': {'name': 'Mediterranean', 'cities': ['ROME', 'ATHENS']},
    'desert':        {'name': 'Desert', 'cities': ['CAIRO', 'DUBAI']},
    'monsoon':       {'name': 'Monsoon & rainforest', 'cities': ['DELHI', 'BANGKOK']},
    'eastasia':      {'name': 'East Asia & mountains', 'cities': ['BEIJING', 'TOKYO']},
    'boreal':        {'name': 'Boreal & mountains', 'cities': ['ANCHORAGE', 'VANCOUVER']},
    'plains':        {'name': 'Plains & eastern forest', 'cities': ['CHICAGO', 'NEW YORK']},
    'tundra':        {'name': 'Volcanic tundra', 'cities': ['REYKJAVIK']},
}

# kind: 'animal' (walks on the ground: animal-<id>-0/1), 'bird' (flies: sky-<id>-0/1)
# art: generator dials (see creatures.py), 'hand' (already hand-drawn in make_sprites.py), or None (to do)
SPECIES = [
    # ---- woodland (hand-drawn already) ----
    dict(id='rabbit', name='Rabbit', region='woodland', kind='animal', art='hand',
         fact='Rabbits thump the ground with their back feet to warn each other of danger.'),
    dict(id='hedgehog', name='Hedgehog', region='woodland', kind='animal', art='hand',
         fact='A hedgehog has about 5,000 spines and rolls into a prickly ball when scared.'),
    dict(id='fox', name='Red fox', region='woodland', kind='animal', art='hand',
         fact='Foxes can hear a mouse squeak from 100 metres away.'),
    dict(id='deer', name='Red deer', region='woodland', kind='animal', art='hand',
         fact='A stag grows a new set of antlers every year.'),
    dict(id='cow', name='Cow', region='woodland', kind='animal', art='hand',
         fact='Cows have best friends and get stressed when they are apart.'),
    dict(id='sheep', name='Sheep', region='woodland', kind='animal', art='hand',
         fact='Sheep can remember the faces of up to 50 other sheep.'),
    dict(id='robin', name='Robin', region='woodland', kind='bird', art='hand',
         fact='Robins sing all year round, even in winter.'),
    dict(id='swallow', name='Swallow', region='woodland', kind='bird', art='hand',
         fact='Swallows fly all the way to Africa and back every year.'),
    dict(id='buzzard', name='Buzzard', region='woodland', kind='bird', art='hand',
         fact='Buzzards circle high on warm rising air without flapping.'),

    # ---- mediterranean ----
    dict(id='boar', name='Wild boar', region='mediterranean', kind='animal',
         fact='Wild boar dig up the ground with their snouts to find roots and bugs.',
         art=dict(template='quad', body=(9, 4), leg=1, colour='#5a4030', shade='#3e2a1e', pattern='bristle',
                  pattern_colour='#2b1e14', head=(3, 3), snout=2, snout_colour='#7a5a48', tusk=True,
                  ears='pointy', ear_colour='#3e2a1e', tail='curl', legs='#2b2b33')),
    dict(id='tortoise', name='Hermann\'s tortoise', region='mediterranean', kind='animal',
         fact='Tortoises can live for more than 100 years.',
         art=dict(template='low', body=(7, 3), colour='#a07a30', shade='#5a4418', plates=True, skin='#9a8a5a',
                  tail=True)),
    dict(id='lizard', name='Wall lizard', region='mediterranean', kind='animal',
         fact='If a predator grabs its tail, a lizard can drop it and grow a new one.',
         art=dict(template='long', body=(5, 2), tail_len=6, colour='#6a8a3a', shade='#4a6a28',
                  pattern='dots', pattern_colour='#2b3a18')),
    dict(id='goat', name='Wild goat', region='mediterranean', kind='animal',
         fact='Wild goats can climb almost straight up rocky cliffs.',
         art=dict(template='quad', body=(8, 3), leg=2, colour='#a08060', shade='#7a5a40', head=(2, 2), neck=2,
                  snout=1, horns='curved', horn_colour='#5a4a3a', beard='#5a4030', ears='round', tail='short', legs='#5a4030',
                  hoof='#2b2b33')),
    dict(id='hoopoe', name='Hoopoe', region='mediterranean', kind='bird',
         fact='A hoopoe raises its orange crest like a fan when it lands.',
         art=dict(template='flyer', body=(4, 1), colour='#e0a060', head='#e0a060', wing='#2b2b33',
                  bars='#ffffff', crest='#e07030', beak='#2b2b33', beak_len=1, span=3, broad=True)),
    dict(id='beeeater', name='Bee-eater', region='mediterranean', kind='bird',
         fact='Bee-eaters catch bees in the air and rub off the sting before eating them.',
         art=dict(template='flyer', body=(4, 1), colour='#3ab0a0', head='#a0522d', belly='#f0d040',
                  wing='#40a8a0', wing_tip='#2a7fb0', beak='#2b2b33', beak_len=1, span=3, long_tail=True)),

    # ---- desert ----
    dict(id='camel', name='Dromedary camel', region='desert', kind='animal', art=dict(template='quad', body=(10, 4), leg=4, colour='#c9a06a', shade='#a07a48', head=(3, 2), neck=4, snout=1, hump=(3, 5, 3), ears='round', tail='tuft', legs='#a07a48', hoof='#5a4030'),
         fact='A camel\'s hump stores fat, not water.'),
    dict(id='fennec', name='Fennec fox', region='desert', kind='animal', art=dict(template='quad', body=(6, 3), leg=1, colour='#f0d8a8', shade='#d0b080', head=(2, 2), neck=1, snout=1, snout_colour='#ffffff', ears='long', ear_inner='#f2a3a8', tail='bushy', tail_tip='#2b2b33', legs='#d0b080'),
         fact='Fennec foxes have giant ears that let heat escape and keep them cool.'),
    dict(id='oryx', name='Arabian oryx', region='desert', kind='animal', art=dict(template='quad', body=(9, 3), leg=3, colour='#f4f1e8', shade='#d9d4c4', head=(2, 2), neck=2, snout=1, mask='#2b2b33', horns='long', horn_colour='#2b2b33', ears='round', tail='tuft', legs='#2b2b33', hoof='#2b2b33'),
         fact='The Arabian oryx was saved from extinction and returned to the wild.'),
    dict(id='jerboa', name='Jerboa', region='desert', kind='animal', art=dict(template='hopper', body=(3, 2), colour='#d8b888', shade='#b09060', ear_len=3, ear_inner='#f2a3a8', tail_colour='#ffffff'),
         fact='Jerboas hop like tiny kangaroos across the sand.'),
    dict(id='falcon', name='Saker falcon', region='desert', kind='bird', art=dict(template='flyer', body=(4, 1), colour='#8a6a4a', head='#5a4030', belly='#e8dcc8', wing='#7a5a3a', wing_tip='#3a2a1e', beak='#e0c040', beak_len=1, span=3),
         fact='Falcons dive at more than 200 km/h to catch their prey.'),

    # ---- monsoon & rainforest ----
    dict(id='elephant', name='Asian elephant', region='monsoon', kind='animal', art=dict(template='quad', body=(11, 6), leg=3, leg_width=2, colour='#8a8a92', shade='#6a6a72', head=(4, 4), snout=0, trunk=4, tusk=True, ears='big', ear_colour='#7a7a82', tail='tuft', legs='#7a7a82'),
         fact='An elephant\'s trunk has about 40,000 muscles.'),
    dict(id='macaque', name='Macaque', region='monsoon', kind='animal', art=dict(template='sitter', body=(4, 5), colour='#a08a6a', shade='#7a6a4a', face='#e8a090', head=(3, 3), ears='round', tail='long'),
         fact='Macaques live in big family groups called troops.'),
    dict(id='tiger', name='Tiger', region='monsoon', kind='animal', art=dict(template='quad', body=(10, 4), leg=2, colour='#e8822a', shade='#c0601a', belly='#f4f1e8', pattern='stripes', pattern_colour='#2b2b33', head=(3, 3), snout=1, snout_colour='#f4f1e8', ears='round', tail='ringed', tail_tip='#2b2b33', legs='#e8822a'),
         fact='No two tigers have the same stripes.'),
    dict(id='hornbill', name='Hornbill', region='monsoon', kind='bird', art=dict(template='flyer', body=(5, 1), colour='#2b2b33', head='#2b2b33', belly='#f4f1e8', wing='#2b2b33', wing_tip='#f4f1e8', beak='#f0c030', beak_len=3, big_head=True, span=3, broad=True, long_tail=True),
         fact='Hornbills spread seeds, so they help forests grow.'),
    dict(id='peacock', name='Peacock', region='monsoon', kind='bird', art=dict(template='wader', body=(4, 3), leg=2, colour='#1a5ab0', shade='#123f80', neck=3, neck_colour='#1a5ab0', head_colour='#1a5ab0', crest='#1a8a6a', beak='#5a5a5a', train='#2a8a5a', train_eye='#1a5ab0', legs='#8a8a8a'),
         fact='A peacock\'s tail train can have more than 200 feathers.'),

    # ---- east asia & mountains ----
    dict(id='panda', name='Giant panda', region='eastasia', kind='animal', art=dict(template='quad', body=(8, 4), leg=2, colour='#f4f1e8', shade='#d9d4c4', pattern='band', pattern_colour='#2b2b33', head=(4, 3), snout=1, eye_patch=True, ears='round', ear_colour='#2b2b33', tail='short', legs='#2b2b33'),
         fact='Pandas spend about 12 hours a day eating bamboo.'),
    dict(id='tanuki', name='Tanuki', region='eastasia', kind='animal', art=dict(template='quad', body=(7, 3), leg=1, colour='#8a7050', shade='#5a4a30', head=(3, 2), neck=1, snout=1, snout_colour='#d8c8a8', mask='#2b2b33', ears='round', ear_colour='#2b2b33', tail='bushy', tail_tip='#2b2b33', legs='#2b2b33'),
         fact='The tanuki is a dog that looks like a raccoon.'),
    dict(id='snowmonkey', name='Snow monkey', region='eastasia', kind='animal', art=dict(template='sitter', body=(4, 5), colour='#b8b0a8', shade='#908880', face='#e86060', head=(3, 3), ears='round', tail=None),
         fact='Snow monkeys warm up in hot springs in winter.'),
    dict(id='crane', name='Red-crowned crane', region='eastasia', kind='bird', art=dict(template='wader', body=(5, 3), leg=5, colour='#f4f1e8', shade='#d9d4c4', wing='#2b2b33', neck=4, neck_colour='#2b2b33', head_colour='#2b2b33', crest='#e02020', beak='#a0a080', beak_len=2, legs='#2b2b33'),
         fact='Cranes dance together, leaping and bowing.'),

    # ---- boreal & mountains ----
    dict(id='moose', name='Moose', region='boreal', kind='animal', art=dict(template='quad', body=(10, 5), leg=4, colour='#4a3424', shade='#2e2016', head=(3, 3), neck=1, head_drop=2, snout=2, snout_colour='#4a3424', horns='palmate', horn_colour='#c9b08a', ears='round', tail='short', legs='#3a2818', hoof='#1b1b1f'),
         fact='Moose are great swimmers and dive for water plants.'),
    dict(id='bear', name='Brown bear', region='boreal', kind='animal', art=dict(template='quad', body=(10, 5), leg=2, leg_width=2, colour='#6a4428', shade='#4a2e18', hump=(7, 3, 1), head=(3, 3), snout=1, snout_colour='#8a6040', ears='round', tail='short', legs='#4a2e18'),
         fact='Bears can smell food from kilometres away.'),
    dict(id='beaver', name='Beaver', region='boreal', kind='animal', art=dict(template='quad', body=(7, 3), leg=1, colour='#7a5030', shade='#5a3820', head=(2, 2), snout=1, ears='round', tail='flat', tail_colour='#3a2a20', legs='#3a2a20'),
         fact='Beaver dams make ponds that many other animals use.'),
    dict(id='eagle', name='Bald eagle', region='boreal', kind='bird', art=dict(template='flyer', body=(5, 1), colour='#4a3020', head='#ffffff', wing='#4a3020', wing_tip='#2b1e14', beak='#f0c030', beak_len=1, big_head=True, span=4, broad=True),
         fact='Bald eagles build the biggest nests of any bird in North America.'),

    # ---- plains & eastern forest ----
    dict(id='bison', name='American bison', region='plains', kind='animal', art=dict(template='quad', body=(10, 5), leg=2, colour='#6a4a2a', shade='#4a321c', hump=(6, 4, 2), mane='#4a321c', head=(3, 3), head_drop=1, snout=1, horns='curved', horn_colour='#2b2b33', tail='tuft', legs='#3a2818'),
         fact='Bison can run as fast as a horse.'),
    dict(id='raccoon', name='Raccoon', region='plains', kind='animal', art=dict(template='quad', body=(7, 3), leg=1, colour='#8a8a90', shade='#6a6a70', head=(3, 2), neck=1, snout=1, snout_colour='#f4f1e8', mask='#2b2b33', ears='pointy', tail='ringed', tail_tip='#2b2b33', legs='#2b2b33'),
         fact='Raccoons use their clever hands to open things.'),
    dict(id='prairiedog', name='Prairie dog', region='plains', kind='animal', art=dict(template='sitter', body=(3, 4), colour='#c09a6a', shade='#9a7a50', face='#d8b888', head=(3, 2), ears='round'),
         fact='Prairie dogs dig huge underground towns.'),
    dict(id='cardinal', name='Cardinal', region='plains', kind='bird', art=dict(template='flyer', body=(4, 1), colour='#d02020', head='#d02020', wing='#b01818', wing_tip='#801010', crest='#d02020', beak='#f08030', beak_len=1, span=2),
         fact='Male cardinals are bright red so they stand out in snow.'),

    # ---- volcanic tundra ----
    dict(id='arcticfox', name='Arctic fox', region='tundra', kind='animal', art=dict(template='quad', body=(7, 3), leg=1, colour='#f4f4f8', shade='#d0d4dc', head=(3, 2), neck=1, snout=1, ears='round', tail='bushy', tail_colour='#f4f4f8', legs='#d0d4dc'),
         fact='Arctic foxes turn white in winter to hide in the snow.'),
    dict(id='puffin', name='Puffin', region='tundra', kind='bird', art=dict(template='wader', body=(4, 4), leg=1, colour='#2b2b33', belly='#f4f1e8', neck=1, head_colour='#2b2b33', beak='#f07030', beak_len=2, legs='#f07030'),
         fact='Puffins can carry ten or more fish in their beak at once.'),
]

for sp in SPECIES:
    sp.setdefault('factChecked', False)

# Trees per region: kind 'tree' -> tree-<id>-0/1/2 (three growth stages). 'hand' = drawn in make_sprites.py.
TREES = [
    dict(id='spruce', name='Norway spruce', region='woodland', art='hand', fact='Spruce trees stay green all winter.'),
    dict(id='birch', name='Silver birch', region='woodland', art='hand', fact='Birch bark is white to reflect sunlight.'),
    dict(id='oak', name='English oak', region='woodland', art='hand', fact='An oak can live for 1,000 years.'),
    dict(id='rowan', name='Rowan', region='woodland', art='hand', fact='Rowan berries are a winter feast for birds.'),
    dict(id='orchard', name='Apple tree', region='woodland', art='hand', fact='There are thousands of kinds of apple.'),
    dict(id='olive', name='Olive', region='mediterranean', fact='Some olive trees are more than 2,000 years old.',
         art=dict(shape='round', leaf='#8a9a6a', lit='#aab890', dark='#6a7a50', trunk='#7a6a5a', fruit='#3a4a2a')),
    dict(id='cypress', name='Italian cypress', region='mediterranean', fact='Cypress trees grow tall and thin like green flames.',
         art=dict(shape='cypress', leaf='#2e5e34', lit='#4a7e4a', dark='#1e4224', w=(4, 5), h=(10, 17), trunk_h=(1, 1))),
    dict(id='umbrellapine', name='Umbrella pine', region='mediterranean', fact='Pine nuts come from the cones of umbrella pines.',
         art=dict(shape='umbrella', leaf='#3e6e3a', lit='#5a8e50', dark='#2a4e28', w=(8, 13), trunk_h=(1, 1), trunk='#8a5a3a')),
    dict(id='datepalm', name='Date palm', region='desert', fact='One date palm can grow 100 kg of dates a year.',
         art=dict(shape='palm', leaf='#4a8a3a', lit='#6aaa50', dark='#2e6a28', trunk='#9a7a4a', h=(10, 16), dates=True)),
    dict(id='acacia', name='Acacia', region='desert', fact='Acacia roots reach deep underground to find water.',
         art=dict(shape='umbrella', leaf='#6a8a3a', lit='#8aaa50', dark='#4a6a28', w=(9, 15), trunk_h=(1, 1), trunk='#6a4a2a')),
    dict(id='banyan', name='Banyan', region='monsoon', fact='A banyan grows new trunks from roots that hang down from its branches.',
         art=dict(shape='banyan', leaf='#2e7a3a', lit='#4a9a4a', dark='#1e5a28', trunk='#8a6a4a', w=(8, 13))),
    dict(id='bamboo', name='Bamboo', region='monsoon', fact='Some bamboo can grow almost a metre in one day.',
         art=dict(shape='bamboo', leaf='#6aaa3a', lit='#9ad06a', dark='#4a7a28', h=(10, 16))),
    dict(id='teak', name='Teak', region='monsoon', fact='Teak wood is so tough it is used to build boats.',
         art=dict(shape='round', leaf='#5a8a2a', lit='#7aaa40', dark='#3e6a1e', trunk='#7a5a3a')),
    dict(id='cherry', name='Cherry blossom', region='eastasia', fact='In Japan, people hold picnics under the cherry blossom each spring.',
         art=dict(shape='blossom', leaf='#f2a8c0', lit='#ffd0e0', dark='#d080a0', flower='#ffffff', trunk='#5a3a30')),
    dict(id='maple', name='Japanese maple', region='eastasia', fact='Maple leaves turn bright red in autumn.',
         art=dict(shape='round', leaf='#d04030', lit='#f07050', dark='#a02a20', trunk='#5a3a30')),
    dict(id='pine', name='Japanese black pine', region='eastasia', fact='Pines can grow on rocky cliffs by the sea.',
         art=dict(shape='umbrella', leaf='#2e5e3a', lit='#4a7e50', dark='#1e4228', w=(7, 12), trunk_h=(1, 2), trunk='#5a4a3a')),
    dict(id='fir', name='Subalpine fir', region='boreal', fact='Fir trees have soft, flat needles.',
         art=dict(shape='cone', leaf='#2e5a44', lit='#4a7a5a', dark='#1e3e30', h=(10, 16), snow=True)),
    dict(id='prairiegrass', name='Big bluestem grass', region='plains', fact='Prairie grass roots can go 3 metres underground.',
         art=dict(shape='grass', leaf='#8aa04a', lit='#b0c070', dark='#6a7a30', w=(6, 9), h=(7, 10))),
    dict(id='sugarmaple', name='Sugar maple', region='plains', fact='Maple syrup is made from the sap of sugar maples.',
         art=dict(shape='round', leaf='#e8822a', lit='#f8a84a', dark='#c0601a', trunk='#6a4a3a')),
    dict(id='moss', name='Woolly moss', region='tundra', fact='Moss can cover old lava fields for hundreds of years.',
         art=dict(shape='moss', leaf='#8aa070', lit='#b0c090', dark='#6a7a50', flower='#d080c0', h=(5, 6))),
    dict(id='birchscrub', name='Dwarf birch', region='tundra', fact='Dwarf birch hugs the ground to stay out of the cold wind.',
         art=dict(shape='scrub', leaf='#8aaa3a', lit='#aac860', dark='#6a8a28', h=(4, 5), trunk_h=(1, 1))),
]
for t in TREES:
    t.setdefault('factChecked', False)
