// LEARN MORE (src/learnmore.js, Oliver 2026-11-19): the data behind the nature payoff card and the plane payoff's research link.
//   1. every key of PART_RESEARCH is a real plane level name (src/fleet.js), with a name and an https url;
//   2. every UK project has an org with a name and an https learn url (the region projects: tests/habitatdata.cjs);
//   3. no learn url is on a domain known dead (old.ni.is: the Icelandic institute moved to natt.is; sementesdoxingu.org.br: certificate error);
//   4. learnHTML escapes the name and url, and is a plain link (Oliver, 2026-11-19: no grown-up hold).
// No browser. Run: node tests/learnmore.cjs
const path = require('path');
const errs = [], check = (c, m) => { if (!c) errs.push(m); };
const okUrl = u => typeof u === 'string' && /^https:\/\/[^\s"'<>]+$/.test(u);
const DEAD = /old\.ni\.is|sementesdoxingu\.org\.br/;
(async () => {
  const L = await import(path.resolve(__dirname, '../src/learnmore.js'));
  const { PLANES } = await import(path.resolve(__dirname, '../src/fleet.js'));
  const { UK_PROJECTS } = await import(path.resolve(__dirname, '../src/habitats.js'));
  const levels = new Set(PLANES.flatMap(p => Object.values(p.lines).flat().map(l => l.name)));
  const keys = Object.keys(L.PART_RESEARCH);
  check(keys.length >= 5, `at least 5 plane parts have research links (${keys.length})`);
  for (const k of keys) { const r = L.PART_RESEARCH[k];
    check(levels.has(k), `PART_RESEARCH "${k}" is not a plane level name in src/fleet.js`);
    check(r && r.name && okUrl(r.url), `PART_RESEARCH "${k}" needs a name and an https url`); }
  for (const p of UK_PROJECTS) check(p.org && p.org.name && okUrl(p.org.learn), `UK project ${p.id} needs an org with a name and an https learn url`);
  const REGIONS = ['mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest', 'bush', 'steppe', 'polynesia'];
  for (const r of REGIONS) { const m = await import(path.resolve(__dirname, `../src/habitat/${r}.js`));
    for (const p of m.PROJECTS) { const urls = [p.org && p.org.learn, p.org && p.org.donate, ...(p.src || []).map(s => s[1])].filter(Boolean);
      for (const u of urls) check(!DEAD.test(u), `${r}/${p.id}: a dead domain: ${u}`); }
    for (const [id, s] of Object.entries(m.SPECIES || {})) for (const [, u] of s.src || []) check(!DEAD.test(u), `${r}/${id}: a dead domain: ${u}`); }
  const h = L.learnHTML('A & B <x>', 'https://example.org/?a=1&b="2"');
  check(h.includes('A &amp; B &lt;x&gt;') && h.includes('&amp;b=&quot;2&quot;'), `learnHTML escapes the name and url: ${h}`);
  check(/^<a [^>]*href="https:/.test(h) && !/hidden|gate|grown/i.test(h), `learnHTML: a plain visible link, no hold: ${h}`);
  if (errs.length) { console.log(`FAIL learnmore (${errs.length})`); errs.forEach(e => console.log(`- ${e}`)); process.exit(1); }
  console.log(`ok learnmore: ${keys.length} plane parts, ${UK_PROJECTS.length} UK projects, ${REGIONS.length} regions clean`);
})();
