// THE TARGET BANNER AND THE LIGHT-UP, the pure part (src/targetbanner.js; research/TARGET-BANNER-PLAN.md). Plain Node: the wording ('Flying to X', '... to cross', the mission's condition on a second line), the budgets for every city, and the lit rule.
// Plants: tools/plants.tsv, test `targetbanner`. Run: node tests/targetbanner.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const B = await import('../src/targetbanner.js'), CT = await import('../src/cities.js');
  check(B.bannerText({ city: 'PARIS' }) === 'Flying to PARIS', 'a chosen destination: Flying to PARIS');
  check(B.bannerText({ city: 'SAPPORO', crossFrom: true }) === 'Flying to SAPPORO to cross', 'the departure of a ready crossing: Flying to SAPPORO to cross');
  check(B.bannerText({}) === null && B.bannerText({ city: null }) === null, 'no destination: no banner');
  check(B.bannerText({ city: 'PARIS', landed: true }) === null, 'landed there: no banner');
  const m = (id, fill) => ({ def: { id }, fill });
  check(B.bannerText({ city: 'PARIS', mission: m('land-city', { k: 1 }) }) === 'Flying to PARIS', 'a plain land-at mission has no second line');
  check(B.bannerText({ city: 'PARIS', mission: m('chain', { cityB: 'ROME' }) }) === 'Flying to PARIS\nthen ROME', 'a chain keeps its second city');
  check(B.bannerText({ city: 'PARIS', mission: m('landclean', { k: 2 }) }) === 'Flying to PARIS\nwith 6 clean gaps', 'the clean-gaps slot keeps its condition (3k)');
  check(B.bannerText({ city: 'PARIS', mission: m('stretch', {}) }) === 'Flying to PARIS\nin one flight', 'the stretch says in one flight');
  check(B.bannerText({ city: 'PARIS', mission: m('rescue', { cityB: 'PARIS', k: 1 }) }) === 'Flying to PARIS\nand plant 2 trees', 'a rescue keeps its trees');
  check(B.bannerText({ city: 'SAPPORO', crossFrom: true, mission: m('chain', { cityB: 'TOKYO' }) }) === 'Flying to SAPPORO to cross\nthen TOKYO', 'a crossing departure that is also a mission city shows both');
  // the budgets: every city, the longest line and the second line
  let longest = 0;
  for (const c of CT.CITIES) { for (const t of [B.bannerText({ city: c.name, crossFrom: true, mission: m('chain', { cityB: c.name }) })]) { const [a, b2] = t.split('\n'); longest = Math.max(longest, a.length, b2.length); check(a.length <= B.TEXT_MAX && b2.length <= B.TEXT_MAX, `${c.name}: a banner line is over ${B.TEXT_MAX} characters: "${a}" / "${b2}"`); } }
  check(longest >= 25 && longest <= B.TEXT_MAX, `power: the longest banner line is ${longest} characters (budget ${B.TEXT_MAX})`);
  // the lit rule: only the target, only until passed or landed
  check(B.isLit('PARIS', 'PARIS', false, false) === true, 'the target runway on screen is lit');
  check(B.isLit('PARIS', 'BERLIN', false, false) === false && B.isLit(null, 'PARIS', false, false) === false, 'another airport, or no target: not lit');
  check(B.isLit('PARIS', 'PARIS', true, false) === false && B.isLit('PARIS', 'PARIS', false, true) === false, 'passed or landed: not lit');
  console.log(fails.length ? `FAIL targetbanner:\n - ${fails.slice(0, 10).join('\n - ')}${fails.length > 10 ? `\n ... ${fails.length - 10} more` : ''}` : `PASS targetbanner: the banner says Flying to X (to cross for a crossing departure, the mission's condition on a second line), every city fits ${B.TEXT_MAX} characters (longest ${longest}), only the target runway lights and only until passed or landed`);
  process.exit(fails.length ? 1 : 0);
})();
