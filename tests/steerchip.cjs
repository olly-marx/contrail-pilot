// The words on the home chip (src/steerchip.js chipView; the user, 2026-11-10). Plain Node, no browser.
//  control: a far mission reads 'Mission: PARIS' (this already worked before the change).
//  1. a mission only 1-3 airports away (the hub view has aim set) ALSO reads 'Mission: PARIS' (it used to read the route form 'LONDON > PARIS (mission)').
//  2. EXPLORE reads 'Explore: X'; no city mission open reads 'Next: X'.
//  3. a destination the player chose, within 3 airports, keeps the route form with the tag 'go to'; farther than 3 airports reads 'Going to: X'.
//  4. the season 2 chip switched off (on = false) keeps the plain route form.
// Run: node tests/steerchip.cjs   (plants: tools/plants.tsv, test steerchip)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const { chipView } = await import('../src/steerchip.js');
  const said = c => (c.kind === 'word' ? `${c.word}: ${c.city}` : `${c.route.join(' > ')}${c.tag ? ` (${c.tag})` : ''}`);
  const route = ['LONDON', 'AMSTERDAM'];
  const far = chipView({ steer: { city: 'PARIS', why: 'mission' }, aim: null, route }, {});
  check(said(far) === 'Mission: PARIS', `control: a far mission reads 'Mission: PARIS': ${said(far)}`);
  const near = chipView({ steer: { city: 'PARIS', why: 'mission' }, aim: 'PARIS', route: ['LONDON', 'PARIS'] }, {});
  check(said(near) === 'Mission: PARIS', `a mission 1-3 airports away reads 'Mission: PARIS', not the route form: ${said(near)}`);
  check(said(chipView({ steer: { city: 'AMSTERDAM', why: 'explore' }, aim: null, route }, {})) === 'Explore: AMSTERDAM', 'EXPLORE reads Explore: AMSTERDAM');
  check(said(chipView({ steer: { city: 'AMSTERDAM', why: 'nearest' }, aim: null, route }, {})) === 'Next: AMSTERDAM', 'no city mission open reads Next: AMSTERDAM');
  const go = chipView({ steer: { city: 'PARIS', why: 'chosen' }, aim: 'PARIS', route: ['LONDON', 'PARIS'] }, { aimCity: 'PARIS' });
  check(said(go) === 'LONDON > PARIS (go to)', `a chosen city within 3 airports keeps the route form with (go to): ${said(go)}`);
  check(said(chipView({ steer: { city: 'ROME', why: 'chosen' }, aim: null, route }, { aimCity: 'ROME' })) === 'Going to: ROME', 'a chosen city farther than 3 airports reads Going to: ROME');
  check(said(chipView({ steer: { city: 'PARIS', why: 'mission' }, aim: null, route }, {}, false)) === 'LONDON > AMSTERDAM', 'with the season 2 chip off the plain route form stays');
  console.log(fails.length ? `FAIL steerchip:\n - ${fails.join('\n - ')}` : 'PASS steerchip: Mission / Explore / Next words for the steer (a near mission too), the route form only for a chosen city within 3 airports');
  process.exit(fails.length ? 1 : 0);
})();
