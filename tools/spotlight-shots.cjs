// Screenshots of every rails/tour step on seeded saves (research/SPOTLIGHT-SUBJECT.md): what is lit, where the bubble sits. Usage:
//   URL=http://127.0.0.1:<port>/ NODE_PATH=... OUT=shots/before node tools/spotlight-shots.cjs [W,H ...]   (default 390x844 and 320x568)
// For each case it opens the screen, then repeats: screenshot -> record the step (text, ring, bubble, the dim hole) -> advance (OK button, else a real tap at the ring's centre) until the tour ends or `max` steps.
// Steps that need typing (the name form) stop after 2 steps. Output: <OUT>/<case>-<n>-<W>.png and <OUT>/steps.jsonl. READ-ONLY on the game: each case uses its own throwaway page.
const { chromium } = require('playwright-core'); const fs = require('fs');
const { ready } = require('../tests/lib/ready.js');
const URL = process.env.URL, OUT = process.env.OUT || 'shots/spot'; fs.mkdirSync(OUT, { recursive: true });
const sizes = (process.argv.slice(2).length ? process.argv.slice(2) : ['390x844', '320x568']).map(s => s.split('x').map(Number));
const { base, CASES, RES } = require('../tests/lib/spotcases.js');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const log = fs.createWriteStream(`${OUT}/steps.jsonl`, { flags: 'a' });
  try {
    for (const [W, H] of sizes) for (const [id, over, screen, max] of CASES) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: false }), p = await ctx.newPage();
      await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
      await p.addInitScript(s => { if (!sessionStorage.getItem('fresh')) { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); sessionStorage.setItem('fresh', '1'); } }, { ...base, ...over });
      try {
        await p.goto(URL); await ready(p); await p.waitForTimeout(900);
        await p.evaluate(([screen, RES]) => { const ui = game.registry.get('ui'); ui.tour.busy = false; if (screen === 'hangar') ui.showHangar(); else if (screen === 'nature') ui.go('nature'); else if (screen === 'results') { ui.showResults(RES); setTimeout(() => { ui.skipReveal = true; }, 60); } else ui.showTitle(); }, [screen, RES]);
        for (let n = 1; n <= max; n++) {
          const up = await p.waitForFunction(() => { const t = document.getElementById('tour'); return t && !t.hidden && t.querySelector('.tbubble p') && t.querySelector('.tbubble p').textContent; }, null, { timeout: n === 1 ? 6000 : 3000 }).then(() => true).catch(() => false);
          if (!up) { log.write(JSON.stringify({ id, W, H, n, none: true }) + '\n'); break; }
          await p.waitForTimeout(500);
          const info = await p.evaluate(() => { const t = document.getElementById('tour'), q = s => t.querySelector(s), r = e => { if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.top), Math.round(x.right), Math.round(x.bottom)]; };
            const ok = q('.tbubble .btn'); return { text: q('.tbubble p').textContent, ring: r(q('.tring')), bubble: r(q('.tbubble')), okShown: !!ok && !ok.hidden, bar: r(document.querySelector('.tabbar:not([hidden])')) }; });
          await p.screenshot({ path: `${OUT}/${id}-${n}-${W}.png` }); log.write(JSON.stringify({ id, W, H, n, ...info }) + '\n');
          if (id === 'name' && n >= 2) break;
          if (info.okShown) await p.click('#tour .tbubble .btn'); else if (info.ring) await p.mouse.click((info.ring[0] + info.ring[2]) / 2, (info.ring[1] + info.ring[3]) / 2);
          await p.waitForTimeout(800);
        }
      } catch (e) { log.write(JSON.stringify({ id, W, H, error: String(e).slice(0, 160) }) + '\n'); }
      await ctx.close();
    }
  } finally { log.end(); await b.close(); const files = fs.readdirSync(OUT).filter(f => f.endsWith('.png')); console.log(`${files.length} screenshots, ${(files.reduce((a, f) => a + fs.statSync(`${OUT}/${f}`).size, 0) / 1048576).toFixed(1)} MB in ${OUT}`); }
})();
