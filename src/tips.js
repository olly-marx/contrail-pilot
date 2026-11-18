// Every teaching bubble in one place (S1 of research/PROPOSAL-HOME-MISSIONS.md, the user approved 2026-10-27):
// "far too much text in the tutorial". Each bubble (`say`) is AT MOST 15 WORDS, one idea, a friendly sentence (8 was too blunt: the user, 2026-10-27) (tests/textbudget.cjs counts them, HTML
// stripped, a ${...} value counts as one word); a picture, arrow or the thing itself flashing does the rest. The old
// long explanation stays as `more`, for the info cards a curious child opens by choice. Callers use tip(id, ...args).
// Words in a `say` may be a function of values (a city, a tree): the lint calls it with SAMPLE values.
export const CRYSTAL_WHY = { day: 'It is day', touched: 'You touched it', fake: 'It was a fake', notheading: 'You were not heading into it', limit: "Tonight's limit reached" };   // why a patch paid no crystal (<= 28 characters each; GameScene.onNoCrystal)
export const TIPS = {
  // ---- flight school (src/school.js) ----
  'school-hold':   { say: 'Hi, I\'m Captain Contrail! Press and HOLD the screen to take off.' },
  'lesson-tap':    { say: 'Tap the screen to climb. Let go, and the plane gently falls.', more: 'Tap the screen and the plane goes up. Stop tapping and it goes down.' },
  'school-tapnow': { say: 'Give it a tap now!' },
  'school-keep':   { say: 'Keep tapping to stay up in the sky.' },
  'lesson-storm':  { say: 'Storm clouds come in pairs. Fly through the gap between them.', more: 'Storm clouds come in pairs. Fly through the gap between them.' },
  'school-storm':  { say: 'Storm ahead! Aim for the gap.' },
  'lesson-seed':   { say: 'Grab the floating seeds. You only keep them if you land safely.', more: 'Seeds float in the sky. Fly into them to grab them. You only keep them if you land safely. Crash, and they are gone.' },
  'school-seeds':  { say: 'Seeds ahead! Fly into them to grab them.' },
  'lesson-day':    { say: 'In sunshine, a contrail makes shade, and shade <span class="cool">cools</span> the Earth a little.', more: 'Some air up here is icy. Fly through it and your plane leaves a cloud line: a contrail. In sunshine, the contrail can make shade. Shade cools the Earth a little.' },
  'school-icy':    { say: 'Icy air ahead! In daytime, <b>fly into it</b>.' },
  'school-missed': { say: 'You missed it, that\'s fine! Here\'s more icy air: <b>fly into it</b>.' },
  'school-shade':  { say: 'Your contrail is making shade. See the Earth bar go <b>down</b>?', more: 'You made a contrail! It is making shade on the ground below. Shade pulls the Earth bar (right) down. Down = cooler.' },
  'school-dusk':   { say: 'The sun is setting. Keep flying through the storms!' },
  'lesson-night':  { say: 'At night, a contrail traps heat like a lid on a pot. Avoid icy air!', more: 'Now it is night. There is no sun to block. A contrail is like a lid on a pot: heat cannot get out. The Earth gets hotter. So at night, fly above or below icy air. In real life, contrails warm the Earth more than they cool it, so dodging icy air at night matters most.' },
  'school-night':  { say: 'It\'s night: fly <b>above or below</b> the icy air.' },
  'school-oops':   { say: 'Oops, a night contrail: that traps heat. Next time fly around it.' },
  'school-great':  { say: 'Great flying! No night contrail. The Earth says thank you!' },
  'lesson-heat':   { say: 'Watch the Earth bar. If the red reaches the top, your flight ends.', more: 'Watch the Earth bar! CO2 and night contrails fill it red. If it reaches the top, the Earth is too hot: your flight ends and you lose your seeds. Shade and trees bring it down.' },
  'lesson-land':   { say: 'An airport is coming! Come in low and touch down before the yellow line.', more: 'Morning! An airport is coming. Fly low BEFORE the grey runway and the plane lands itself. Touch down before the yellow line: land late and you run off the end and lose half your seeds and ice crystals. Better Landing gear brakes harder and lets you come down steeper.' },
  'school-low':    { say: 'Get <b>low</b> just before the runway!' },

  // ---- first-flight coach cards (explain: one-off, never freeze the game after school) ----
  'tree-1':     { say: 'Brown ground ahead! Tap <b>PLANT</b> early, when the cross turns green.', more: 'Brown ground = a place to plant a tree! The cross shows where your tree will land and turns green on the brown patch. Tap PLANT a little before you reach it: the tree floats down AND forwards.' },
  'tree-2':     { say: 'Trees grow as you fly. Grown trees cool the Earth over their land.', more: 'A tree you plant starts as a sapling and grows over your next flights (see it in NATURE). Once it is grown it fills this land\'s Nature bar, and every flight over this land cools the Earth a little more. Saplings do almost nothing yet: trees are slow, so cleaner planes and smart contrails help faster.' },   // (the user, 2026-11-16: the old line said a tree soaks up CO2 as it grows, which grown-only cooling made untrue)
  'tree-3':     { say: 'Different kinds of tree bring much more wildlife than lots of one kind.', more: 'Your Biodiversity meter shows how full of life your land is. Different kinds of trees bring much more wildlife than lots of the same kind.' },
  'x-first-animal': { say: 'A wild animal! Nature projects and trees bring them back here.' },
  'x-gold':     { say: 'A golden seed! It\'s worth 3 seeds, and only shows up on long flights.', more: 'A golden seed is worth 3 seeds. They only appear on long flights.' },
  'x-crystals': { say: 'Ice crystals! You earn them by flying smartly around contrails at night.', more: 'Contrails are made of ice crystals. You earn them for smart contrail flying: dodging icy air at night, and nights with no contrails. Spend them in the hangar on research.' },
  'x-species':  { say: name => `A new kind of tree: <b>${name}</b>! New kinds help lots of wildlife.`, more: 'New kinds of tree fill your Biodiversity meter the most.' },
  'x-multiplier': { say: 'You skipped an airport, so your landing bonus is now <b>x1.5</b>!', more: 'You flew past an airport. That is fine: the next one is ahead. Your landing bonus grows with every airport you pass.' },
  'x-bars':     { say: 'Watch two bars: CO2 on the left, the Earth on the right.', more: 'Two bars to watch. Left: the CO2 your plane makes right now. Right: the Earth. Red = hotter, blue = cooler.' },
  'x-hot':      { say: 'The Earth is getting too hot! Land soon, or make some shade.', more: 'If the red bar on the right reaches the top, your flight is over. Land soon, make shade in the daytime, or stay out of icy air at night.' },
  'hazard-turbulence': { say: 'Wavy lines mean bumpy air. Fly over or under it if you can.', more: 'Wavy lines = bumpy air! Inside it your plane gets pushed about and your taps work a little late.' },
  'hazard-noFly':      { say: 'Red stripes are a no-fly zone. Touching one ends your flight, so squeeze through.', more: 'Red stripes mean planes are not allowed there, like near airports or big events. Squeeze through the gap.' },
  'hazard-birds':      { say: 'A flock of birds! Fly over or under them: hitting one ends your flight.', more: 'A flock of birds is flying at you. Hitting a bird ends your flight.' },

  // ---- short tips (tipOnce: a toast, title + body, both counted) ----
  bareLand:   { say: land => `${land} is bare land for now. Plant its trees to bring life back!` },
  gapArrow:   { say: 'Your team points to the next gap: follow the arrow on the right.', more: 'The arrow shows whether the next gap is above or below you. Upgrade Forecasting to see the gap itself as a gate.' },
  gapHint:    { say: 'Your team shows where the next gap is: watch the gate on the right.', more: 'Your forecasters, controllers and dispatchers work together to show where the next gap is. Red stripes: a no-fly zone.' },
  issrDay:    { say: 'A daytime contrail! It shades the ground below and cools the Earth a little.', more: 'This icy air turns exhaust into a cloud. In sunshine it can shade the Earth a little.' },
  issrNight:  { say: 'A night contrail traps heat. Climb or dive out of the icy air!', more: 'No sunlight to block, so it only traps heat.' },
  firstToken: { say: 'You grabbed a seed! Land safely to keep it.' },
  powerSaf:   { say: 'SAF is cleaner fuel: less CO2, and thinner contrails that fade sooner.', more: 'Less CO2 and less soot, so contrails are thinner and fade sooner. They still happen.' },
  airport:    { say: 'Airport ahead! Land before the yellow line.', more: 'Get low BEFORE the grey runway: the plane lands itself. Touch down after the yellow line and you run off the end and lose half. Or fly on for more seeds!' },
  safAhead:   { say: 'Cleaner fuel ahead! Grab the green can.' },
  forestFull: { say: 'Your forest is full for this flight. More kinds of tree hold much more.', more: 'A forest can only soak up so much CO2 in one flight. Plant all 5 kinds of tree to make it hold much more.' },
  firstDrop:  { say: 'Tree away! It floats down and forwards.', more: 'It floats down AND forwards. Plant it before the brown ground to grow a tree.' },
  // ---- season 2 start choice (src/startchoice.js) ----
  'start-area':   { say: 'This is your part of the world. Grow its nature, then explore further!', more: 'You will fly around this part of the world. Grow its nature and learn its skies, and one day you can cross to the next.' },
  'start-city':   { say: 'Which city is home?' },

  // ---- the free part, at the top of the hangar (src/hangar.js freePickHTML) ----
  'free-head':    { say: 'Pick ONE free part for your plane. Tap FREE! on the one you like.' },
  'free-engines': { say: 'Cleaner engines: your plane makes less CO2, so the Earth stays cooler.' },
  'free-magnet':  { say: 'A seed magnet: grab seeds from a little further away.' },
  'free-gear':    { say: 'Landing help: the runway is easier to hit when you land.' },
  'free-more':    { say: 'Or scroll down to see every part in the hangar.' },

  // ---- the School board (src/lessons.js; the user, 2026-11-16): one card per lesson, read again with REPLAY ----
  'board-head':      { say: 'Each lesson opens something new. Finish them all to graduate.' },
  'board-school':    { say: 'Tap to climb. Fly through storm gaps. Land on runways.', more: 'Tap the screen to climb and let go to sink. Storm clouds come in pairs: fly through the gap. Grab seeds, and land safely to keep them.' },
  'board-free':      { say: 'The hangar is where you make your plane cleaner.', more: 'Spend seeds and ice crystals in the HANGAR on cleaner engines, better fuel and helpers. Your first part was free.' },
  'board-L1':        { say: 'Get low just before the runway, and the plane lands itself.', more: 'An airport comes after every stretch of flying. Fly low over the grey runway and the plane lands itself. Landing keeps the seeds you grabbed.' },
  'board-L2':        { say: 'In daytime, fly into icy air: your contrail makes cooling shade.', more: 'Icy air turns your exhaust into a contrail. In sunshine a contrail shades the ground and cools the Earth a little.' },
  'board-nature':    { say: 'Your wild land: projects bring animals back and fill the Nature bar.', more: 'Each land has its own Nature bar. Projects and grown trees fill it, animals come back, and a fuller bar cools the Earth when you fly over it.' },
  'board-L3':        { say: 'At night, fly around icy air: night contrails trap heat.', more: 'With no sun to block, a night contrail is a lid on a pot: it traps heat. Fly above or below the icy patch.' },
  'board-map':       { say: 'Spin the globe, tap a city, and choose MISSION or EXPLORE.', more: 'On HOME the globe is your map. Drag it to spin it, and tap a city dot to see the way there. The chip under the globe says where your next flight goes: MISSION heads for your mission, EXPLORE for a city you have not seen.' },
  'board-L4':        { say: 'Fly past an airport and land at the next: a bigger bonus.', more: 'Every airport you fly past adds to your landing bonus. Land at the next one to keep it all.' },
  'board-trees':     { say: 'Get trees for your plane in NATURE. The first ones are free.', more: 'Your plane carries a few trees on each flight. Get more in NATURE, under Tree Planting. The first level is free.' },
  'board-practice':  { say: 'Practise dropping seeds on brown soil, with nothing else in the sky.', more: 'A seed falls forward, not straight down. Tap PLANT when the green cross is on the brown soil. In practice a miss gives the seed back.' },
  'board-L5':        { say: 'Plant a tree on brown soil on a real flight.', more: 'On a real flight, brown soil patches come along the ground while you carry trees. Tap PLANT a little before you reach one.' },
  'board-grow':      { say: 'Saplings grow as you fly. Grown trees cool their land.', more: 'A tree you plant is a sapling. It grows over your next flights, and the tree nursery in NATURE shows how many days are left. Once grown it fills its land\'s Nature bar, and every flight over that land cools the Earth more.' },
  'board-results':   { say: 'After each flight, tap the Earth line to see what warmed and cooled it.', more: 'Warmed: the CO2 your plane made and any night contrails. Cooled: daytime contrail shade, and Nature, which is your grown trees and projects cooling the land below you.' },
  'board-name':      { say: 'Choose a pilot name for the boards.', more: 'Your pilot name is how other players see you on the boards. Choose it in PILOT.' },
  'board-records':   { say: 'BOARDS keeps your best flights and badges.', more: 'BOARDS shows your best distances, your badges, and how you compare with other pilots.' },
  'board-crossings': { say: 'A crossing is one long flight that opens a new part of the world.', more: 'A crossing is one long flight with no stops. It opens a new part of the world. Each crossing card in MISSIONS has three rows: Era, Plane and Nature. When all three have a tick, fly it.' },
  // ---- the on-rails onboarding (src/tour.js railsFor; research/FLOW-FIRST-HOUR.md) ----
  'rail-school':       { say: 'You landed! Your first upgrade is FREE. Open the hangar!' },
  'rail-hangar':       { say: 'Your first upgrade is FREE. Open the hangar!' },
  'rail-boards':       { say: 'Your records! Beat your best.' },
  'rail-map':          { say: 'Your world! Drag the globe with your finger to spin it.' },
  'rail-map-city':     { say: 'Now tap a city dot on the globe.' },
  'rail-map-card':     { say: 'This is that city and the way there. Tap X to close it.' },
  'rail-map-chip':     { say: 'This says where your next flight goes. Tap it.' },
  'rail-map-mode':     { say: mission => (mission ? 'MISSION flies to your mission. EXPLORE finds a city you have not seen. Pick one!' : 'EXPLORE flies to a city you have not seen. Tap it!') },   // mission: the MISSION chip is there (src/aim.js activeMission)
  'rail-cross':        { say: 'A crossing: one long non-stop flight that opens a new part of the world.' },
  'rail-cross-era':    { say: 'Era: some crossings wait for a later era. A tick means it is done.' },
  'rail-cross-plane':  { say: 'Plane: land longer flights, or make your plane better in HANGAR.' },
  'rail-cross-nature': { say: 'Nature: plant trees and fund projects in NATURE to fill this bar.' },
  'rail-cross-next':   { say: 'This line says what to do next. Three ticks, and you can fly it!' },
  'rail-free-tap':     { say: 'Tap here to see your new jet engines.' },
  'rail-takeoff-h':    { say: 'Now take off and try them!' },
  'rail-plant':        { say: n => `You carry ${n} trees. Take off and plant them.` },   // n = the trees the plane carries (src/tour.js)
  'rail-planted':      { say: (n, unit = 'flight') => (unit === 'day' ? `Your first tree! It grows in about ${n} flying days. Unplanted trees are not saved.` : `Your first tree! It grows up in ${n} flights. Unplanted trees are not saved.`) },   // n, unit: flights, or game days (GROW_DAYS)   // n = the flights it takes (the nursery)
  'rail-parcels':      { say: 'Buy more trees for each flight here. The first level is free.' },
  'rail-free':         { say: 'Cleaner engines: less CO2, a cooler Earth. Tap FREE!' },
  'rail-payoff':       { say: 'Look: shiny new jet engines!' },
  'rail-payoff-ok':    { say: 'Look at your new part! Tap OK.' },
  'rail-payoff-label': { say: 'NEW: jet engines!' },
  'hangar-tap':        { say: 'Tap any upgrade to see what it does.' },
  'hangar-looks':      { say: 'A new look for your plane.' },
  'rail-takeoff':      { say: 'Take off! Land at the next airport.' },
  'rail-seeds':        { say: "You landed with your seeds: they're yours to spend!" },
  'rail-seeds-none':   { say: 'No seeds this time: grab the seed bags as you fly!' },
  'rail-mission':      { say: 'You finished a mission: the seeds for it are already yours!' },
  'rail-wildlife':     { say: 'Another flight now: find icy air in the daytime!' },
  'rail-takeoff2':     { say: 'Take off, and fly through icy air in daylight!' },
  'rail-trees':        { say: 'Time to plant trees! Open NATURE to get your first trees free.' },
  'rail-practice':     { say: 'A practice flight: drop seeds on brown soil. No storms, no hurry.' },
  'rail-earth':        { say: 'This line shows what warmed and cooled the Earth. Tap it after any flight.' },
  'rail-school-lesson': { say: 'A new lesson is waiting in SCHOOL.' },
  'practice-card':     { say: 'A seed falls forward, not straight down. Watch the cross on the ground.' },
  'practice-go':       { say: 'Tap <b>PLANT</b> when the green cross is on the brown soil. Plant three!' },
  'practice-done':     { say: 'Three trees! On real flights, soil comes along while you carry trees.' },
  'rail-nature':       { say: 'Animals need places to live. Let us see yours!' },
  'rail-nat-land':     { say: 'This is your wild land. It is bare now.' },
  'rail-nat-tap':      { say: 'Projects help animals come back. Tap this one to see!' },
  'rail-nat-bio':      { say: 'More kinds of life means more BIODIVERSITY. Fill this bar!' },
  'rail-nat-home':     { say: 'Fly on, and keep an eye out for wildlife on the ground!' },
  'rail-project':      { say: 'Your first one is FREE. Take it!' },
  'rail-project-done': { say: 'Projects bring animals back. Look out for them!' },
  'rail-nature-how':   { say: "Plant trees and fund projects to grow each land's nature." },
  'rail-skip':         { say: 'Fly PAST this airport and land at the next one for a bonus!' },
  'rail-bonus':        { say: 'Bonus! Flying past airports makes each landing worth more.' },
  'rail-systems':      { say: 'New in the hangar: systems that help every flight!' },
  'rail-systems-tab':  { say: 'Tap SYSTEMS.' },
  'rail-systems-line': { say: 'Forecasting shows icy air sooner. Save up for it!' },

  // ---- menu tours (src/tour.js) ----
  'tour-hello':   { say: 'Welcome, pilot! Tap <b>PILOT</b> to choose your pilot name.' },
  'tour-form':    { say: 'Type your <b>first name</b>, pick a <b>word</b>, then tap <b>SAVE MY NAME</b>.' },
  'tour-first':   { say: 'Type your <b>first name</b> here.' },
  'tour-word':    { say: 'Now pick a <b>word</b> to go with it.' },
  'tour-save':    { say: 'Tap <b>SAVE</b>!' },
  'tour-saving':  { say: 'Saving...' },
  'tour-retry':   { say: 'Try a different name, then tap <b>SAVE</b>.' },
  'tour-offline': { say: 'No internet. Choose a name later in <b>PILOT</b>.' },
  'tour-boards':  { say: 'Great name! Now tap <b>BOARDS</b>.' },
  'tour-best':    { say: 'These are the best pilots. Land long flights to join them!' },
  'tour-fly':     { say: 'Ready? Tap <b>FLY</b>!' },
  'tour-hangar':  { say: 'This is your hangar. Tap <b>HANGAR</b> to look inside!' },
  'tour-bank':    { say: 'These are your seeds and ice crystals. Spend them on upgrades.' },
  'tour-eras':    { say: 'As you fly, new eras open with new planes and systems from real history.' },
  'tour-tabs':    { say: 'Here are your plane, its helper systems and its gadgets.' },
  'tour-free':    { say: 'You earned a <b>FREE</b> upgrade! Tap any <b>FREE!</b> button to pick one.' },
  'tour-nature':  { say: 'Trees and wild places live in <b>NATURE</b>. Tap it!' },
  'tour-projects':{ say: 'Help nature here, and wild animals will come back. Look out for them!' },
  'tour-new':     { say: tab => `Something <b>NEW</b>! Tap <b>${tab}</b>.` },
  'tour-newline': { say: list => `<b>NEW:</b> ${list}! Tap <b>i</b>.` },
  'tour-lookout': { say: 'Look out for wild animals on your flights! Tap <b>HOME</b> to fly.' },
  'tour-home':    { say: 'All set! Tap <b>HOME</b>, then TAKE OFF.' },
  'tour-ok':      { say: 'Read it, then tap <b>OK</b>.' },
};

// The bubble text for an id (a function `say` gets the values). Unknown ids are a bug: shown so a test can catch it.
export function tip(id, ...args) {
  const t = TIPS[id];
  if (!t) return `[missing tip ${id}]`;
  return typeof t.say === 'function' ? t.say(...args) : t.say;
}
// Bubbles about something ON THE GROUND (soil, trees, animals, the runway) sit at the TOP of the screen, so they never cover what they are about (the user, 2026-11-16:
// "seed planting happens at the bottom so text at the top, same with landing"). Every other in-flight strip keeps the old rule (away from the plane). Keys are tip ids;
// 'x-species-<tree>' and other suffixed ids match by their base id.
export const GROUND_TIPS = ['tree-1', 'tree-2', 'tree-3', 'x-first-animal', 'x-species', 'rail-skip', 'lesson-land', 'school-low', 'lesson-plant', 'plant-', 'practice-'];
export const groundTip = id => !!id && GROUND_TIPS.some(g => id === g || (g.endsWith('-') ? id.startsWith(g) : id.startsWith(`${g}-`)));
export const more = id => (TIPS[id] && TIPS[id].more) || '';

// Words as a child reads them: HTML tags out, every other run of letters/digits is a word.
export const wordCount = html => (String(html).replace(/<[^>]+>/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'.,]*/g) || []).length;
export const BUDGET = 15;   // the user, 2026-10-27: 8 read like telegrams; friendly sentences, one idea each, <= 15 words
