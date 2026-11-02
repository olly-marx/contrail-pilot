// The loading screen's picture list (src/preload.js, 2026-11-02): every picture a menu can show is DECLARED in a tier (or marked unused on purpose), every declared file
// exists, the two tiers never overlap, and the lands a save has (plus the trip chosen on HOME) are in tier 1. Plain Node, no browser.
// PLANTS: tools/plants.tsv, test `preloadlist` (each must FAIL this test). Run: node tests/preloadlist.cjs
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
(async () => {
  const P = await import(path.join(root, 'src/preload.js'));
  const { REGIONS: WREG } = await import(path.join(root, 'src/wildlife.js'));
  const { BADGES, medal } = await import(path.join(root, 'src/badges.js'));
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const exists = f => fs.existsSync(path.join(root, f));
  const all = P.everything(), set = new Set(all);

  // 1. Every declared file exists (a typo would be a silent 404 at the loading screen).
  const missing = all.filter(f => !exists(f)); check(!missing.length, `${missing.length} declared files are not on disk: ${missing.slice(0, 5).join(' ')}`);
  // 2. Every picture file the menus can use is declared, unused on purpose, or an old portrait a PixelLab one replaces. A new picture must be declared on purpose.
  const disk = ['assets/ui', 'assets/pixellab/ui'].flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.png')).map(f => `${d}/${f}`));
  const unused = new Set(P.UNUSED);
  const orphans = disk.filter(f => !set.has(f) && !unused.has(f) && !(P.isLegacyPortrait(f) && (/-1\.png$/.test(f) || exists(f.replace('assets/ui/', 'assets/pixellab/ui/').replace(/-\d\.png$/, '-0.png')))));
  check(!orphans.length, `${orphans.length} picture files are in no tier, not unused, not replaced: ${orphans.slice(0, 6).join(' ')}`);
  check(P.UNUSED.every(f => exists(f) && !set.has(f)), 'every UNUSED entry exists on disk and is not also declared');
  // 2b. welcome.js asks only for era pictures that exist: every era without one is one of the later eras.
  const { ERAS } = await import(path.join(root, 'src/eras.js'));
  check(ERAS.every(e => P.ERA_PICS.includes(e.id) === exists(`assets/ui/era-${e.id}.png`)), 'ERA_PICS lists exactly the eras that have a picture on disk');
  // 3. Tiers: disjoint, and together the whole set.
  const save = { tutorialDone: true, areas: ['weurope'], homeArea: 'weurope', city: 'LONDON' };
  const t1 = P.tier1(save), t2 = P.tier2(save), s1 = new Set(t1);
  check(t2.every(f => !s1.has(f)), 'tier 2 repeats a tier-1 file');
  check(new Set([...t1, ...t2]).size === set.size, `tier 1 + tier 2 are the whole declared set (${new Set([...t1, ...t2]).size} of ${set.size})`);
  // 4. Tier 1 holds what a tap shows right away: the hangar, every badge medal, the home land's field + animals; not another land's.
  check(BADGES.every(b => Array.from({ length: b.tiers.length }, (_, i) => medal(b.id, i + 1)).every(f => s1.has(f))), 'tier 1 holds every badge medal');
  check(s1.has('assets/ui/plane-hangar-jumbo.png') && s1.has('assets/ui/badge-locked.png') && s1.has('assets/ui/captain-point.png'), 'tier 1 holds the hangar pictures and the single UI pictures');
  check(s1.has('assets/ui/field-woodland.png') && s1.has('assets/pixellab/ui/portrait-animal-fox-0.png'), 'tier 1 holds the home land (woodland): its field and the fox portrait');
  check(!s1.has('assets/ui/field-savanna.png'), 'tier 1 does not hold a land the player does not have (savanna)');
  const t1trip = P.tier1(save, ['savanna']), t2trip = P.tier2(save, ['savanna']);
  check(t1trip.includes('assets/ui/field-savanna.png') && !t2trip.includes('assets/ui/field-savanna.png'), 'a land on the chosen trip moves from tier 2 into tier 1');
  const flown = P.tier1({ ...save, discovered: { desert: true } });
  check(flown.includes('assets/ui/field-desert.png'), 'a land flown over (save.discovered) is in tier 1');
  // 5. A land's flight animals (setRegion -> wildlifeScene, loadPathArt) are in its menu list too, and every land's strips exist (GameScene.preload loads them all).
  const art = P.regionArt('savanna');
  check(art.some(f => /\/(animal|sky)-[a-z]+-0\.png$/.test(f) && !f.includes('/ui/')), `a land's two flight frames per animal are listed (savanna: ${art.length} files)`);
  const strips = Object.entries(WREG).flatMap(([r, t]) => [t.ground, t.hills]).filter(k => k && !['ground', 'hills'].includes(k));
  check(strips.every(k => exists(`assets/${k}.png`)), 'every land strip (ground, hills) exists on disk');
  check(/for \(const r in REGIONS\) for \(const k of \[REGIONS\[r\]\.ground, REGIONS\[r\]\.hills\]\)/.test(fs.readFileSync(path.join(root, 'src/GameScene.js'), 'utf8')), 'GameScene.preload still loads every land strip up front (setRegion fetches nothing)');

  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS preloadlist (${all.length} pictures declared: tier 1 ${t1.length} for a fresh West Europe save, tier 2 ${t2.length}; ${P.UNUSED.length} unused on purpose; none orphaned, none missing)`);
})();
