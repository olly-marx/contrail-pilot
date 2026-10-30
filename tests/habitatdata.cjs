// Region habitat data (src/habitat/<region>.js, 2026-10-22): every rule the user set for the research.
// No browser: imports the modules directly. Run: node tests/habitatdata.cjs
const path = require('path');
const REGIONS = ['mediterranean', 'desert', 'monsoon', 'eastasia', 'boreal', 'plains', 'tundra', 'savanna', 'rainforest', 'islandforest', 'bush', 'steppe', 'polynesia'];
const RARITIES = ['common', 'uncommon', 'rare', 'legendary'];
const errs = [];
const bad = (r, id, msg) => errs.push(`${r}/${id}: ${msg}`);
const wiki = u => /wikipedia\.org/.test(u);
const okUrl = u => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);
const kidText = (r, id, what, s) => {
  if (typeof s !== 'string' || !s.trim()) return bad(r, id, `${what} missing`);
  if (/VERIFIED|PARTIAL|REWORD|\bTODO\b|game logic/i.test(s)) bad(r, id, `${what} has reviewer notes: "${s}"`);
};
const srcOk = (r, id, src) => {
  if (!Array.isArray(src) || !src.length) return bad(r, id, 'no sources');
  for (const s of src) if (!Array.isArray(s) || s.length !== 2 || !s[0] || !okUrl(s[1])) bad(r, id, `bad source ${JSON.stringify(s)}`);
  if (src.every(s => wiki(s[1]))) bad(r, id, 'Wikipedia is its only source');
};

(async () => {
  const { WILDLIFE } = await import(path.resolve(__dirname, '../src/wildlife.js'));
  const drawnName = Object.fromEntries(WILDLIFE.map(w => [w.id, w.name]));
  const seen = {};   // species id -> name, across regions (a shared id must be the same animal)
  for (const r of REGIONS) {
    let m;
    try { m = await import(path.resolve(__dirname, `../src/habitat/${r}.js`)); }
    catch (e) { errs.push(`${r}: cannot load: ${e.message}`); continue; }
    const P = m.PROJECTS, S = m.SPECIES;
    if (!Array.isArray(P) || P.length < 8) { errs.push(`${r}: needs at least 8 projects`); continue; }
    const pids = new Set();
    for (const p of P) {
      if (!/^[a-z0-9]+$/.test(p.id || '')) bad(r, p.id, 'bad id');
      if (pids.has(p.id)) bad(r, p.id, 'duplicate project id');
      pids.add(p.id);
      if (![1, 2, 3].includes(p.tier)) bad(r, p.id, 'tier must be 1, 2 or 3');
      if (!['cheap', 'mid', 'big'].includes(p.band)) bad(r, p.id, 'band must be cheap/mid/big');
      for (const k of ['name', 'short', 'fact']) kidText(r, p.id, k, p[k]);
      if (!Array.isArray(p.chain) || p.chain.length < 2) bad(r, p.id, 'chain needs 2+ steps');
      else p.chain.forEach(c => kidText(r, p.id, 'chain', c));
      srcOk(r, p.id, p.src);
      const o = p.org;
      if (!o || !o.name || !okUrl(o.learn)) bad(r, p.id, 'org needs a name and a learn url');
      else if (o.donate !== null && !okUrl(o.donate)) bad(r, p.id, 'org.donate must be a url or null');
    }
    for (const t of [1, 2, 3]) if (!P.some(p => p.tier === t)) errs.push(`${r}: no tier ${t} project`);
    for (const [id, s] of Object.entries(S || {})) {
      if (!/^[a-z0-9]+$/.test(id)) bad(r, id, 'bad id');
      if (pids.has(id)) bad(r, id, 'species id equals a project id');
      if (!['animal', 'bird'].includes(s.kind)) bad(r, id, 'kind must be animal or bird');
      if (!RARITIES.includes(s.rarity)) bad(r, id, 'bad rarity');
      if (!Array.isArray(s.needs)) bad(r, id, 'needs must be an array');
      else {
        for (const n of s.needs) if (!pids.has(n)) bad(r, id, `needs unknown project "${n}"`);
        if (['rare', 'legendary'].includes(s.rarity) && !s.needs.length) bad(r, id, 'rare animals must need a project');
      }
      for (const k of ['name', 'why', 'fact']) kidText(r, id, k, s[k]);
      srcOk(r, id, s.src);
      // A drawn id means that drawing: a different animal must have its own id (and may borrow a sprite).
      if (drawnName[id] && !s.sprite && !sameAnimal(drawnName[id], s.name)) bad(r, id, `id is drawn as "${drawnName[id]}", not "${s.name}"`);
      if (seen[id] && !sameAnimal(seen[id], s.name)) bad(r, id, `id also used for "${seen[id]}" in another region`);
      seen[id] = seen[id] || s.name;
    }
    const used = new Set(Object.values(S || {}).flatMap(s => s.needs || []));
    console.log(`${r}: ${P.length} projects, ${Object.keys(S || {}).length} animals, ${P.filter(p => !used.has(p.id)).length} projects bring no animal`);
  }
  // Trees (src/habitat/trees.js): every region, slots 0-4 once each, every fact sourced (not Wikipedia alone).
  const { REGION_TREES } = await import(path.resolve(__dirname, '../src/habitat/trees.js'));
  for (const r of REGIONS) {
    const t = REGION_TREES[r] || [];
    if (JSON.stringify(t.map(x => x.slot).sort()) !== '[0,1,2,3,4]') errs.push(`${r}: trees must fill slots 0-4 once each: ${t.map(x => x.slot)}`);
    for (const x of t) {
      if (!/^[a-z]+$/.test(x.id || '')) bad(r, x.id, 'bad tree id');
      for (const k of ['name', 'short', 'fact']) kidText(r, x.id, k, x[k]);
      srcOk(r, x.id, x.src);
    }
  }
  if (errs.length) { console.log(errs.join('\n')); console.log(`FAIL: ${errs.length} problems`); process.exit(1); }
  console.log('habitatdata: all regions pass');
})();

// The same animal: same name (ignoring brackets), or a pair DECLARED here (no guessing from names).
const SAME = [['Wild goat', 'Iberian ibex'], ['Brown bear', 'Brown bear (grizzly)'], ['Ostrich', 'North African ostrich'],
  ['Swallow', 'Barn swallow'], ['Grey heron', 'Heron'], ['Bald eagle', 'Bald eagle'], ['Water buffalo', 'Wild water buffalo'],
  ['Macaque', 'Rhesus macaque'], ['Hornbill', 'Great hornbill'], ['Peacock', 'Indian peafowl'], ['Gibbon', 'Lar gibbon'],
  ['Orangutan', 'Bornean orangutan'], ['Rhino', 'Indian rhino'], ['Indian rhinoceros', 'Indian rhino'], ['Tiger', 'Bengal tiger'],
  ['Box turtle', 'Eastern box turtle'], ['Cardinal', 'Northern cardinal'], ['Skunk', 'Striped skunk'],
  ['Prairie dog', 'Black-tailed prairie dog'], ['Raven', 'Common raven'], ['Beaver', 'North American beaver'],
  ['Caribou', 'Mountain caribou'], ['Saker falcon', 'Saker falcon'], ['Jerboa', 'Lesser Egyptian jerboa'],
  ['Horned viper', 'Horned viper'], ['Dromedary camel', 'Dromedary camel (herded)'], ['Puffin', 'Atlantic puffin'],
  ['Reindeer', 'Reindeer'], ['Icelandic horse', 'Icelandic horse'], ['Tanuki', 'Tanuki (raccoon dog)'],
  ['Red-crowned crane', 'Red-crowned crane'], ['Chameleon', 'Common chameleon']];
function sameAnimal(a, b) {
  const n = s => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return n(a) === n(b) || a === b || SAME.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}
