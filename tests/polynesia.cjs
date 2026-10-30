// Aotearoa & Polynesia (the user, 2026-10-29/30: Aotearoa was "too small"; it grows with 4 Pacific islands). No browser:
// 1. the area has 8 cities incl. NUKU'ALOFA, APIA, RAROTONGA, PAPEETE (the apostrophe kept), named "Aotearoa & Polynesia";
// 2. the islands' region is 'polynesia' (declared: the land mask reads them as sea) and REGION_DATA has it;
// 3. the route from AUCKLAND does not loop home early (first return home after >= 6 legs) and visits the islands;
// 4. NADI and HONOLULU stay ocean stones, and every Pacific crossing still joins two different sides;
// 5. every city is linked within the area (no island stranded); 6. skyline keys have no quote.
// Run: node tests/polynesia.cjs   (proved by planted defects)
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/areas.js'), R = await import('../src/route.js'), X = await import('../src/crossings.js'), H = await import('../src/habitats.js'), C = await import('../src/cities.js');
  const area = A.AREAS.aotearoa, isles = ["NUKU'ALOFA", 'APIA', 'RAROTONGA', 'PAPEETE'];
  check(area && area.name === 'Aotearoa & Polynesia' && area.start === 'AUCKLAND' && area.cities.length === 8 && isles.every(c => area.cities.includes(c)), `the area: ${JSON.stringify(area)}`);
  for (const n of isles) { const c = C.CITIES.find(x => x.name === n); check(c && c.region === 'polynesia', `${n} is in the polynesia region (${c && c.region})`); }
  check(!!H.REGION_DATA.polynesia && H.REGION_NAMES.polynesia === 'Polynesian islands', 'REGION_DATA and REGION_NAMES have polynesia');
  const save = { areas: ['aotearoa'], homeArea: 'aotearoa', city: 'AUCKLAND', visited: ['AUCKLAND'], missionsDone: [] };
  const path = R.flightPath(save, 16), back = path.indexOf('AUCKLAND', 1);
  check(back === -1 || back >= 6, `no early loop home: ${path.slice(0, 12).join(' > ')} (home again at leg ${back})`);
  check(isles.every(c => path.slice(0, 12).includes(c)), `the first 12 stops visit every island: ${path.slice(0, 12).join(' > ')}`);
  const links = R.linksFor(save);
  check(area.cities.every(c => (links[c] || []).some(n => area.cities.includes(n))), 'every city links to another city in the area');
  check(['HONOLULU', 'NADI'].every(c => A.OCEAN_STONES.includes(c) && !A.areaOf(c)), 'NADI and HONOLULU stay ocean stones');
  for (const id of ['nadi-auckland', 'tasman', 'auckland-santiago', 'pacific-islands', 'honolulu-tokyo']) {
    const c = X.crossingById(id), [a, b] = c ? X.sides(c) : [];
    check(c && a !== b, `crossing ${id} still joins two different sides (${a} / ${b})`);
  }
  const keys = isles.map(n => n.toLowerCase().replace(/[^a-z0-9]/g, ''));
  check(keys.every(k => /^[a-z0-9]+$/.test(k)) && keys[0] === 'nukualofa', `skyline keys are plain: ${keys}`);
  const inst = require('fs').readFileSync(`${__dirname}/../tools/art/install_skylines.py`, 'utf8');
  check(/re\.sub\('\[\^a-z0-9\]', '', city\.lower\(\)\)/.test(inst), 'install_skylines.py keeps only letters and digits in a key');
  const PD = await import('../src/habitat/polynesia.js'), wild = require('fs').readFileSync(`${__dirname}/../src/wild.js`, 'utf8');
  const scs = PD.PROJECTS.find(x => /Samoa Conservation Society/.test(x.org.name));
  check(scs && /membership/.test(scs.org.donate) && /join/i.test(scs.org.donateLabel || '') && /o\.donateLabel \|\| 'Help them \(donate\)'/.test(wild), 'a membership form is labelled "Join / support", not "Donate"');
  check(PD.PROJECTS.length === 7 && !PD.PROJECTS.some(x => x.id === 'coralschool'), `7 projects, the unconfirmed nursery dropped (${PD.PROJECTS.map(x => x.id)})`);
  check(/fewer than 250/.test(scs.fact) && scs.src.some(([t]) => /BirdLife/.test(t)), 'manumea: BirdLife\'s fewer than 250, cited');
  check(/const FIELD_ART = \[[^\]]*'polynesia'/.test(wild), 'NATURE draws the polynesia field (FIELD_ART lists it; the browser turn found it missing)');
  console.log(fails.length ? `FAIL polynesia:\n - ${fails.join('\n - ')}` : `PASS polynesia: 8 cities, islands in 'polynesia', ${path.slice(0, 11).join(' > ')}, stones and crossings intact`);
  process.exit(fails.length ? 1 : 0);
})();
