// The Maori macron vowels are in the game's pixel font (the user, 2026-10-28; tools/art/add_macrons.py): each of
// A a E e I i O o U u with a macron renders in 'Pixel' (not a fallback font), with the bar in its top pixel row and the
// font's own accented body below (the same rows 2-6 as the acute letter). Plant: a glyph missing -> must FAIL.
// Run: python3 -m http.server 8000 & node tests/macrons.cjs
const { chromium } = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8000/';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const p = await b.newPage(); const fails = [];
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.goto(URL); await p.evaluate(() => document.fonts.load('8px Pixel', 'āĀ')); await p.evaluate(() => document.fonts.ready);
  const res = await p.evaluate(() => {
    const grid = (ch, fam) => { const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d');
      g.font = `8px ${fam}`; g.textBaseline = 'top'; g.fillStyle = '#000'; g.fillText(ch, 0, 0); const d = g.getImageData(0, 0, 8, 8).data;
      const rows = []; for (let y = 0; y < 8; y++) { let r = ''; for (let x = 0; x < 8; x++) r += d[(y * 8 + x) * 4 + 3] > 127 ? '#' : '.'; rows.push(r); } return rows; };
    const pairs = { 'Ā': 'Á', 'ā': 'á', 'Ē': 'É', 'ē': 'é', 'Ī': 'Í', 'ī': 'í', 'Ō': 'Ó', 'ō': 'ó', 'Ū': 'Ú', 'ū': 'ú' };
    return Object.entries(pairs).map(([m, acute]) => { const g = grid(m, 'Pixel'), fb = grid(m, 'serif'), a = grid(acute, 'Pixel');
      return { m, inFont: g.join() !== fb.join(), bar: g[0] === '.#####..' && g[1] === '........', body: g.slice(2, 7).join() === a.slice(2, 7).join(), top: g[0] }; });
  });
  for (const r of res) if (!(r.inFont && r.bar && r.body)) fails.push(`${r.m}: in the pixel font ${r.inFont}, bar on top ${r.bar} (${r.top}), the font's accented body ${r.body}`);
  await b.close();
  console.log(fails.length ? `FAIL macrons:\n - ${fails.join('\n - ')}` : `PASS macrons: ${res.map(r => r.m).join(' ')} drawn in the pixel font (bar on top, the font's own bodies)`);
  process.exit(fails.length ? 1 : 0);
})();
