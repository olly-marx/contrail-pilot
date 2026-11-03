// Wild animals start on flight 3, after the NATURE lesson (the user, 2026-10-29: "supposed to be the third flight"). No browser:
// 1. the scene's gate reads L2; 2. no rails line before flight 3 tells the player to watch for wildlife (R9a's last step after
// flight 1 and the flight-2 take-off talk about the icy air, flight 2's goal); 3. the wildlife line comes at the end of the NATURE
// tour, just before flight 3. tests/walkthrough.cjs checks the flights themselves. Run: node tests/wildflight3.cjs
const fs = require('fs');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const { tip } = await import('../src/tips.js');
  const scene = fs.readFileSync(`${__dirname}/../src/GameScene.js`, 'utf8'), tour = fs.readFileSync(`${__dirname}/../src/tour.js`, 'utf8');
  check(/wildAllowed\(\) \{[^\n]*includes\('L2'\)/.test(scene), 'wildAllowed() opens after L2 (flight 3)');
  const animal = /wildlife|animal/i;
  for (const id of ['rail-wildlife', 'rail-takeoff2']) check(!animal.test(tip(id)) && /icy air/i.test(tip(id)), `${id} (before flight 2) talks about the icy air, not animals: "${tip(id)}"`);
  check(/wildlife/i.test(tip('rail-nat-home')), `the wildlife line is at the end of the NATURE tour (before flight 3): "${tip('rail-nat-home')}"`);
  check(/where === 'nature' && d\('L2'\)[^\n]*r-nature/.test(tour) && /rail-nat-home/.test(tour), 'rail-nat-home is in the NATURE tour, which needs L2');
  console.log(fails.length ? `FAIL wildflight3:\n - ${fails.join('\n - ')}` : 'PASS wildflight3: animals from L2; flights 1-2 talk about the icy air; the wildlife line comes before flight 3');
  process.exit(fails.length ? 1 : 0);
})();
