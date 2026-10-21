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
    dict(id='camel', name='Dromedary camel', region='desert', kind='animal', art=None,
         fact='A camel\'s hump stores fat, not water.'),
    dict(id='fennec', name='Fennec fox', region='desert', kind='animal', art=None,
         fact='Fennec foxes have giant ears that let heat escape and keep them cool.'),
    dict(id='oryx', name='Arabian oryx', region='desert', kind='animal', art=None,
         fact='The Arabian oryx was saved from extinction and returned to the wild.'),
    dict(id='jerboa', name='Jerboa', region='desert', kind='animal', art=None,
         fact='Jerboas hop like tiny kangaroos across the sand.'),
    dict(id='falcon', name='Saker falcon', region='desert', kind='bird', art=None,
         fact='Falcons dive at more than 200 km/h to catch their prey.'),

    # ---- monsoon & rainforest ----
    dict(id='elephant', name='Asian elephant', region='monsoon', kind='animal', art=None,
         fact='An elephant\'s trunk has about 40,000 muscles.'),
    dict(id='macaque', name='Macaque', region='monsoon', kind='animal', art=None,
         fact='Macaques live in big family groups called troops.'),
    dict(id='tiger', name='Tiger', region='monsoon', kind='animal', art=None,
         fact='No two tigers have the same stripes.'),
    dict(id='hornbill', name='Hornbill', region='monsoon', kind='bird', art=None,
         fact='Hornbills spread seeds, so they help forests grow.'),
    dict(id='peacock', name='Peacock', region='monsoon', kind='bird', art=None,
         fact='A peacock\'s tail train can have more than 200 feathers.'),

    # ---- east asia & mountains ----
    dict(id='panda', name='Giant panda', region='eastasia', kind='animal', art=None,
         fact='Pandas spend about 12 hours a day eating bamboo.'),
    dict(id='tanuki', name='Tanuki', region='eastasia', kind='animal', art=None,
         fact='The tanuki is a dog that looks like a raccoon.'),
    dict(id='snowmonkey', name='Snow monkey', region='eastasia', kind='animal', art=None,
         fact='Snow monkeys warm up in hot springs in winter.'),
    dict(id='crane', name='Red-crowned crane', region='eastasia', kind='bird', art=None,
         fact='Cranes dance together, leaping and bowing.'),

    # ---- boreal & mountains ----
    dict(id='moose', name='Moose', region='boreal', kind='animal', art=None,
         fact='Moose are great swimmers and dive for water plants.'),
    dict(id='bear', name='Brown bear', region='boreal', kind='animal', art=None,
         fact='Bears can smell food from kilometres away.'),
    dict(id='beaver', name='Beaver', region='boreal', kind='animal', art=None,
         fact='Beaver dams make ponds that many other animals use.'),
    dict(id='eagle', name='Bald eagle', region='boreal', kind='bird', art=None,
         fact='Bald eagles build the biggest nests of any bird in North America.'),

    # ---- plains & eastern forest ----
    dict(id='bison', name='American bison', region='plains', kind='animal', art=None,
         fact='Bison can run as fast as a horse.'),
    dict(id='raccoon', name='Raccoon', region='plains', kind='animal', art=None,
         fact='Raccoons use their clever hands to open things.'),
    dict(id='prairiedog', name='Prairie dog', region='plains', kind='animal', art=None,
         fact='Prairie dogs dig huge underground towns.'),
    dict(id='cardinal', name='Cardinal', region='plains', kind='bird', art=None,
         fact='Male cardinals are bright red so they stand out in snow.'),

    # ---- volcanic tundra ----
    dict(id='arcticfox', name='Arctic fox', region='tundra', kind='animal', art=None,
         fact='Arctic foxes turn white in winter to hide in the snow.'),
    dict(id='puffin', name='Puffin', region='tundra', kind='bird', art=None,
         fact='Puffins can carry ten or more fish in their beak at once.'),
]

for sp in SPECIES:
    sp.setdefault('factChecked', False)
