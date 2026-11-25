// The Maori macron vowels are in the game's pixel font (the user, 2026-10-28; tools/art/add_macrons.py): each of
// A a E e I i O o U u with a macron renders in 'Pixel' (not a fallback font), with the bar in its top pixel row and the
// font's own accented body below (the same rows as the acute letter). Plant: a glyph missing -> must FAIL.
// 0.79.0: the font is 10 rows tall (tools/art/make_tall.py doubles two rows), drawn here on its baseline in a 12-row canvas: the bar is row 2, the gap row 3, the body rows 4-10
// (were rows 0, 1 and 2-6 of 8). Every row is a whole pixel at 8 px: a blank row inside a letter fails the body comparison.
// Run: python3 -m http.server 8000 & node tests/macrons.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage(); const fails = [];
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.goto(URL); await p.evaluate(() => document.fonts.load('8px Pixel', 'āĀ')); await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(() => {
    const grid = (ch, fam) => { const c = document.createElement('canvas'); c.width = 8; c.height = 12; const g = c.getContext('2d');
      g.font = `8px ${fam}`; g.textBaseline = 'alphabetic'; g.fillStyle = '#000'; g.fillText(ch, 0, 12); /* (on the baseline: the glyphs sit on it) */ const d = g.getImageData(0, 0, 8, 12).data;
      const rows = []; for (let y = 0; y < 12; y++) { let r = ''; for (let x = 0; x < 8; x++) r += d[(y * 8 + x) * 4 + 3] > 127 ? '#' : '.'; rows.push(r); } return rows; };
    const pairs = { 'Ā': 'Á', 'ā': 'á', 'Ē': 'É', 'ē': 'é', 'Ī': 'Í', 'ī': 'í', 'Ō': 'Ó', 'ō': 'ó', 'Ū': 'Ú', 'ū': 'ú' };
    return Object.entries(pairs).map(([m, acute]) => { const g = grid(m, 'Pixel'), fb = grid(m, 'serif'), a = grid(acute, 'Pixel');
      return { m, inFont: g.join() !== fb.join(), bar: /^.?#{5,7}.?.?$/.test(g[2]) && g[2].includes('#####') && g[3] === '........', body: g.slice(4, 11).join() === a.slice(4, 11).join() && !/#[^|]*\|\.{8}\|[^|]*#/.test(g.slice(4, 11).join('|')),   /* (and no blank row INSIDE the body: a dropped row) */ top: g.slice(0, 4).join('/') }; });
  });
  for (const r of res) if (!(r.inFont && r.bar && r.body)) fails.push(`${r.m}: in the pixel font ${r.inFont}, bar on top ${r.bar} (${r.top}), the font's accented body ${r.body}`);
  await b.close();
  console.log(fails.length ? `FAIL macrons:\n - ${fails.join('\n - ')}` : `PASS macrons: ${res.map(r => r.m).join(' ')} drawn in the pixel font (bar on top, the font's own bodies)`);
  process.exit(fails.length ? 1 : 0);
})();
