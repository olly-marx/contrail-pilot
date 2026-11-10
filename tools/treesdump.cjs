// THE IDENTITY DUMP for trees step 1 (src/groves.js; the Coordinator, 2026-11-10: compare against the OLD CODE's actual output).
//   node tools/treesdump.cjs <repo dir> <save.json> [...]                         print the dump of one checkout (a save file, or a game backup file with a .save inside)
//   node tools/treesdump.cjs --compare <old dir> <new dir> <save.json> [...]      dump BOTH checkouts and diff them: prints IDENTICAL (exit 0) or every path that differs (exit 1)
//   ... --new-saves a.json,b.json   (compare mode) give the NEW side different save files of the same count: the POSITIVE CONTROL (a diff that cannot go red proves nothing)
// It prints, for every save and every land, what the game's own readers return: the biodiversity meter, what one more tree of each planted kind would add (plantGainHere / plantGain), the land's five trees
// with their counts (landTrees), the wildlife scene's tree kinds, the total (treesPlanted) and the records tags (treeTags). Only EXPORTED functions are called, so the old and the new code both answer.
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
async function dump(dir, files) {
  globalThis.SEASON2 = true;
  const imp = rel => import(pathToFileURL(path.resolve(dir, rel)).href);
  const N = await imp('src/nature.js'), L = await imp('src/landtrees.js'), T = await imp('src/treecount.js'), R = await imp('src/records.js'), H = await imp('src/habitats.js');
  const out = {};
  files.forEach((f, i) => {
    const raw = JSON.parse(fs.readFileSync(f, 'utf8')), save = raw.save && typeof raw.save === 'object' ? raw.save : raw;
    const lands = ['woodland', ...Object.keys(H.REGION_DATA).filter(k => k !== 'woodland')], r = { total: T.treesPlanted(save), tags: R.treeTags(save).sort(), lands: {} };
    for (const land of lands) {
      const kinds = [...new Set([...Object.keys(land === 'woodland' ? save.planted || {} : (save.plantedIn || {})[land] || {}), 'spruce', 'oak', 'acacia'])].sort();
      r.lands[land] = {
        meter: N.biodiversity(save, land),
        gain: Object.fromEntries(kinds.map(id => [id, Math.round(1e6 * (land === 'woodland' ? N.plantGain(save, id) : N.plantGainHere(save, land, id))) / 1e6])),
        trees: L.landTrees(save, land).map(t => [t.slot, t.id, t.open, t.n, t.full]),
        scene: N.wildlifeScene(save, land).treeKinds,
      };
    }
    out[`save${i}`] = r;
  });
  return out;
}
const diff = (a, b, p = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) === !Array.isArray(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.flatMap(k => diff(a[k], b[k], p ? `${p}.${k}` : k));
  }
  return [`${p}: old ${JSON.stringify(a)} -> new ${JSON.stringify(b)}`];
};
(async () => {
  const argv = process.argv.slice(2);
  if (argv[0] === '--compare') {
    let rest = argv.slice(1), alt = null; const k = rest.indexOf('--new-saves'); if (k >= 0) { alt = rest[k + 1].split(','); rest = [...rest.slice(0, k), ...rest.slice(k + 2)]; }
    const [oldDir, newDir, ...files] = rest;
    if (!oldDir || !newDir || !files.length || (alt && alt.length !== files.length)) { console.error('usage: node tools/treesdump.cjs --compare <old dir> <new dir> <save.json> [...] [--new-saves a.json,b.json]'); process.exit(2); }
    const a = await dump(oldDir, files), b = await dump(newDir, alt || files), d = diff(a, b);
    if (!d.length && !JSON.stringify(a).length) { console.log('DIFFERENT: both dumps are empty'); process.exit(1); }
    console.log(d.length ? `DIFFERENT (${d.length} paths):\n${d.slice(0, 25).join('\n')}` : `IDENTICAL: the old and the new code give the same answers (${JSON.stringify(a).length} bytes)`);
    process.exit(d.length ? 1 : 0);
  }
  const [dir, ...files] = argv;
  if (!dir || !files.length) { console.error('usage: node tools/treesdump.cjs <repo dir> <save.json> [...]'); process.exit(2); }
  console.log(JSON.stringify(await dump(dir, files), null, 1));
})().catch(e => { console.error(String(e && e.stack || e)); process.exit(1); });
