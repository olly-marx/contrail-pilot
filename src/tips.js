// Every teaching bubble in one place (S1 of research/PROPOSAL-HOME-MISSIONS.md, the user approved 2026-10-27):
// "far too much text in the tutorial". Each bubble (`say`) is AT MOST 8 WORDS (tests/textbudget.cjs counts them, HTML
// stripped, a ${...} value counts as one word); a picture, arrow or the thing itself flashing does the rest. The old
// long explanation stays as `more`, for the info cards a curious child opens by choice. Callers use tip(id, ...args).
// Words in a `say` may be a function of values (a city, a tree): the lint calls it with SAMPLE values.
export const TIPS = {
  // ---- flight school (src/school.js) ----
  'school-hold':   { say: 'Press and HOLD to take off!' },
  'lesson-tap':    { say: 'Tap to climb. Let go to fall.', more: 'Tap the screen and the plane goes up. Stop tapping and it goes down.' },
  'school-tapnow': { say: 'Tap now!' },
  'school-keep':   { say: 'Keep tapping to stay up!' },
  'lesson-storm':  { say: 'Fly through the gaps!', more: 'Storm clouds come in pairs. Fly through the gap between them.' },
  'school-storm':  { say: 'Storm ahead! Through the gap.' },
  'lesson-seed':   { say: 'Grab seeds. Land to keep them.', more: 'Seeds float in the sky. Fly into them to grab them. You only keep them if you land safely. Crash, and they are gone.' },
  'school-seeds':  { say: 'Seeds ahead! Grab them.' },
  'lesson-day':    { say: 'Daytime contrails make shade: <span class="cool">cooler</span>!', more: 'Some air up here is icy. Fly through it and your plane leaves a cloud line: a contrail. In sunshine, the contrail can make shade. Shade cools the Earth a little.' },
  'school-icy':    { say: 'Icy air ahead! <b>Fly INTO it</b>.' },
  'school-missed': { say: 'Missed it! Here is more: <b>fly INTO it</b>!' },
  'school-shade':  { say: 'Your contrail makes shade: Earth bar <b>down</b>!', more: 'You made a contrail! It is making shade on the ground below. Shade pulls the Earth bar (right) down. Down = cooler.' },
  'school-dusk':   { say: 'Sunset... keep flying through the storms!' },
  'lesson-night':  { say: 'At night, contrails trap heat. Avoid icy air!', more: 'Now it is night. There is no sun to block. A contrail is like a lid on a pot: heat cannot get out. The Earth gets hotter. So at night, fly above or below icy air. In real life, contrails warm the Earth more than they cool it, so dodging icy air at night matters most.' },
  'school-night':  { say: 'Night! Fly <b>above or below</b> icy air.' },
  'school-oops':   { say: 'Oops, a night contrail: heat trapped!' },
  'school-great':  { say: 'Great flying! No night contrail!' },
  'lesson-heat':   { say: 'Red bar full? Flight over.', more: 'Watch the Earth bar! CO2 and night contrails fill it red. If it reaches the top, the Earth is too hot: your flight ends and you lose your seeds. Shade and trees bring it down.' },
  'lesson-land':   { say: 'Fly low over the runway.', more: 'Morning! An airport is coming. Fly low as you reach the grey runway. At the end, the plane lands itself.' },
  'school-low':    { say: 'Get <b>low</b> just before the runway!' },

  // ---- first-flight coach cards (explain: one-off, never freeze the game after school) ----
  'tree-1':     { say: 'Press <b>DROP</b> just before brown soil.', more: 'Brown soil = a place to plant a tree! Press DROP a little before you reach it: parcels float down AND forwards.' },
  'tree-2':     { say: 'Trees soak up CO2 as they grow.', more: 'Your tree takes CO2 out of the air as it grows. Bigger trees take a bit more. But trees are slow! A cleaner plane and smart contrails help the Earth faster.' },
  'tree-3':     { say: 'Different kinds of tree bring more wildlife!', more: 'Your Biodiversity meter shows how full of life your land is. Different kinds of trees bring much more wildlife than lots of the same kind.' },
  'x-gold':     { say: 'A GOLDEN seed: worth 3!', more: 'A golden seed is worth 3 seeds. They only appear on long flights.' },
  'x-crystals': { say: 'Ice crystals! Earned by smart contrail flying.', more: 'Contrails are made of ice crystals. You earn them for smart contrail flying: dodging icy air at night, and nights with no contrails. Spend them in the hangar on research.' },
  'x-species':  { say: name => `<b>${name}!</b> Nature up!`, more: 'New kinds of tree fill your Biodiversity meter the most.' },
  'x-multiplier': { say: 'Skipped one: landing bonus <b>x1.5</b>!', more: 'You flew past an airport. That is fine: the next one is ahead. Your landing bonus grows with every airport you pass.' },
  'x-bars':     { say: 'Left: CO2. Right: the Earth. Keep it low!', more: 'Two bars to watch. Left: the CO2 your plane makes right now. Right: the Earth. Red = hotter, blue = cooler.' },
  'x-hot':      { say: 'Earth too hot! Land soon, or shade.', more: 'If the red bar on the right reaches the top, your flight is over. Land soon, make shade in the daytime, or stay out of icy air at night.' },
  'hazard-turbulence': { say: 'Turbulence: bumpy air! Fly over or under.', more: 'Wavy lines = bumpy air! Inside it your plane gets pushed about and your taps work a little late.' },
  'hazard-noFly':      { say: 'No-fly zone! Touching it ends your flight.', more: 'Red stripes mean planes are not allowed there, like near airports or big events. Squeeze through the gap.' },
  'hazard-birds':      { say: 'Birds! Fly over or under them.', more: 'A flock of birds is flying at you. Hitting a bird ends your flight.' },

  // ---- short tips (tipOnce: a toast, title + body, both counted) ----
  bareLand:   { say: land => `${land}: bare land. Plant trees!` },
  gapHint:    { say: 'The gate shows the next gap!', more: 'Your forecasters, controllers and dispatchers work together to show where the next gap is. Red stripes: a no-fly zone.' },
  issrDay:    { say: 'Daytime contrail: a little shade, cooler!', more: 'This icy air turns exhaust into a cloud. In sunshine it can shade the Earth a little.' },
  issrNight:  { say: 'Night contrail: traps heat! Climb or dive!', more: 'No sunlight to block, so it only traps heat.' },
  firstToken: { say: 'Seed on board! Land to keep it.' },
  powerSaf:   { say: 'SAF: cleaner fuel, thinner contrails!', more: 'Less CO2 and less soot, so contrails are thinner and fade sooner. They still happen.' },
  airport:    { say: 'Airport ahead! Get low to land.', more: 'Get low as you reach the grey runway: the plane lands itself. Or fly on for more seeds!' },
  safAhead:   { say: 'SAF ahead! Grab the green can.' },
  forestFull: { say: 'Forest full! More kinds hold more.', more: 'A forest can only soak up so much CO2 in one flight. Plant all 5 kinds of tree to make it hold much more.' },
  firstDrop:  { say: 'Parcel away! Drop before the soil.', more: 'It floats down AND forwards. Drop it before the brown soil to plant a tree.' },
  // ---- menu tours (src/tour.js) ----
  'tour-hello':   { say: 'Welcome, pilot! Tap <b>PILOT</b> to choose a name.' },
  'tour-first':   { say: 'Type your <b>first name</b> here.' },
  'tour-word':    { say: 'Now pick a <b>word</b> to go with it.' },
  'tour-save':    { say: 'Tap <b>SAVE</b>!' },
  'tour-saving':  { say: 'Saving...' },
  'tour-retry':   { say: 'Try a different name, then tap <b>SAVE</b>.' },
  'tour-offline': { say: 'No internet. Choose a name later in <b>PILOT</b>.' },
  'tour-boards':  { say: 'Great name! Now tap <b>BOARDS</b>.' },
  'tour-best':    { say: 'The best pilots. Land long flights to join!' },
  'tour-fly':     { say: 'Ready? Tap <b>FLY</b>!' },
  'tour-hangar':  { say: 'Your <b>hangar</b>! Tap <b>HANGAR</b>.' },
  'tour-bank':    { say: 'Your seeds and ice crystals. Spend them here.' },
  'tour-eras':    { say: 'New eras bring new planes and systems!' },
  'tour-tabs':    { say: 'Your plane, its systems and gadgets.' },
  'tour-free':    { say: 'A <b>FREE</b> upgrade! Tap any <b>FREE!</b> button.' },
  'tour-nature':  { say: 'Trees and wild places: tap <b>NATURE</b>!' },
  'tour-projects':{ say: 'Help nature here: animals come back!' },
  'tour-new':     { say: tab => `Something <b>NEW</b>! Tap <b>${tab}</b>.` },
  'tour-newline': { say: list => `<b>NEW:</b> ${list}! Tap <b>i</b>.` },
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
export const BUDGET = 8;
