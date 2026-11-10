// THE IDENTITY DUMP for trees step 1 (src/groves.js; the Coordinator, 2026-11-10: compare against the OLD CODE's actual output). Run the SAME script against two checkouts and diff the JSON:
//   node tools/treesdump.cjs <repo dir> <save.json> [...]      (a save file or a game backup file with a .save inside)
// It prints, for every save and every land, what the game's own readers return: the biodiversity meter, what one more tree of each planted kind would add (plantGainHere / plantGain), the land's five trees
// with their counts (landTrees), the wildlife scene's tree kinds, the total (treesPlanted) and the records tags (treeTags). Only EXPORTED functions are called, so the old and the new code both answer.
const fs = require('fs'), path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const [dir, ...files] = process.argv.slice(2);
  if (!dir || !files.length) { console.error('usage: node tools/treesdump.cjs <repo dir> <save.json> [...]'); process.exit(2); }
  globalThis.SEASON2 = true;
  const imp = rel => import(pathToFileURL(path.resolve(dir, rel)).href);
  const N = await imp('src/nature.js'), L = await imp('src/landtrees.js'), T = await imp('src/treecount.js'), R = await imp('src/records.js'), H = await imp('src/habitats.js');
  const out = {};
  for (const f of files) {
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
    out[path.basename(f)] = r;
  }
  console.log(JSON.stringify(out, null, 1));
})().catch(e => { console.error(String(e && e.stack || e)); process.exit(1); });
