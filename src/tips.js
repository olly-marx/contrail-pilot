// Every teaching bubble in one place (S1 of research/PROPOSAL-HOME-MISSIONS.md, the user approved 2026-10-27):
// "far too much text in the tutorial". Each bubble (`say`) is AT MOST 15 WORDS, one idea, a friendly sentence (8 was too blunt: the user, 2026-10-27) (tests/textbudget.cjs counts them, HTML
// stripped, a ${...} value counts as one word); a picture, arrow or the thing itself flashing does the rest. The old
// long explanation stays as `more`, for the info cards a curious child opens by choice. Callers use tip(id, ...args).
// Words in a `say` may be a function of values (a city, a tree): the lint calls it with SAMPLE values.
export const TIPS = {
  // ---- flight school (src/school.js) ----
  'school-hold':   { say: 'Hi, I\'m Captain Cumulus! Press and HOLD the screen to take off.' },
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
  'lesson-land':   { say: 'An airport is coming! Fly low over the runway and the plane lands itself.', more: 'Morning! An airport is coming. Fly low as you reach the grey runway. At the end, the plane lands itself.' },
  'school-low':    { say: 'Get <b>low</b> just before the runway!' },

  // ---- first-flight coach cards (explain: one-off, never freeze the game after school) ----
  'tree-1':     { say: 'Brown soil is where trees grow. Press <b>DROP</b> just before you reach it.', more: 'Brown soil = a place to plant a tree! Press DROP a little before you reach it: parcels float down AND forwards.' },
  'tree-2':     { say: 'Your tree soaks up CO2 as it grows. Bigger trees soak up more.', more: 'Your tree takes CO2 out of the air as it grows. Bigger trees take a bit more. But trees are slow! A cleaner plane and smart contrails help the Earth faster.' },
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
  gapHint:    { say: 'Your team shows where the next gap is: watch the gate on the right.', more: 'Your forecasters, controllers and dispatchers work together to show where the next gap is. Red stripes: a no-fly zone.' },
  issrDay:    { say: 'A daytime contrail! It shades the ground below and cools the Earth a little.', more: 'This icy air turns exhaust into a cloud. In sunshine it can shade the Earth a little.' },
  issrNight:  { say: 'A night contrail traps heat. Climb or dive out of the icy air!', more: 'No sunlight to block, so it only traps heat.' },
  firstToken: { say: 'You grabbed a seed! Land safely to keep it.' },
  powerSaf:   { say: 'SAF is cleaner fuel: less CO2, and thinner contrails that fade sooner.', more: 'Less CO2 and less soot, so contrails are thinner and fade sooner. They still happen.' },
  airport:    { say: 'Airport ahead! Fly low over the runway to land.', more: 'Get low as you reach the grey runway: the plane lands itself. Or fly on for more seeds!' },
  safAhead:   { say: 'Cleaner fuel ahead! Grab the green can.' },
  forestFull: { say: 'Your forest is full for this flight. More kinds of tree hold much more.', more: 'A forest can only soak up so much CO2 in one flight. Plant all 5 kinds of tree to make it hold much more.' },
  firstDrop:  { say: 'Parcel away! It floats down and forwards, so drop it before the soil.', more: 'It floats down AND forwards. Drop it before the brown soil to plant a tree.' },
  // ---- season 2 start choice (src/startchoice.js) ----
  'start-area':   { say: 'This is your part of the world. Grow its nature, then explore further!', more: 'You will fly around this part of the world. Grow its nature and learn its skies, and one day you can cross to the next.' },
  'start-city':   { say: 'Which city is home?' },

  // ---- menu tours (src/tour.js) ----
  'tour-hello':   { say: 'Welcome, pilot! Tap <b>PILOT</b> to choose your pilot name.' },
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
export const more = id => (TIPS[id] && TIPS[id].more) || '';

// Words as a child reads them: HTML tags out, every other run of letters/digits is a word.
export const wordCount = html => (String(html).replace(/<[^>]+>/g, ' ').match(/[A-Za-z0-9][A-Za-z0-9'.,]*/g) || []).length;
export const BUDGET = 15;   // the user, 2026-10-27: 8 read like telegrams; friendly sentences, one idea each, <= 15 words
