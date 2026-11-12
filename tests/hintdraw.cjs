// THE GAP HINT AS DRAWN, ONE FLAVOUR PER LINE (src/GameScene.js drawGapGates, src/hintlines.js, src/gapmarkers.js; research/DESIGN-UPGRADE-BAR.md part A). A real flight at 390x844 and 320x568 per case; the plane is held high, the scene reports what
// each frame drew (scene.hintDrawn: { inRange, gates, arrow, red, icon, lit, size }), and the flags are OR-ed over 9 s of frames (max for gates). Cases (systems -> must draw):
//   none                      -> nothing at all (no arrow, no gate, no icon).
//   forecast 2, ops 2         -> the ARROW and NO gate, NO icon (Forecasting 1-2 give no gate; the icon starts at Ops 5), and the arrow turns red when urgent (Ops 2).
//   forecast 3, ops 5         -> ONE gate (never two without ATC 10), the arrow, the icon (not lit: lit is Ops 6).
//   forecast 3, atc 10, ops 6 -> TWO gates (the second gate is ATC 10), the icon lit while a gap is in range. (The real ATC 10 warning is 2.4 s = 216 px at the first leg's 90 px/s, which is shorter than the 230 px between pairs: the second gate
//                                shows once the plane is past the first airport. So the test lifts the kit's hintLead to 3.2 s after checking it is 2.4: it tests the DRAWING, tests/hintlines.cjs holds the table.)
// Screenshots (the right edge, and the whole screen) go to SHOTS, else os.tmpdir() (a non-recursive mkdir). Run: python3 -m http.server 8000 & node tests/hintdraw.cjs   (proved by planted defects: tools/plants.tsv, test hintdraw)
const { chromium } = require('playwright-core'), fs = require('fs'), os = require('os'), path = require('path');
require('./lib/shipped.js');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/', OUT = process.env.SHOTS || os.tmpdir();
try { fs.mkdirSync(OUT); } catch (e) { /* exists */ }
const CASES = [
  { id: 'none', systems: {}, sizes: [[390, 844]] },
  { id: 'arrow', systems: { forecast: 2, ops: 2 }, sizes: [[390, 844], [320, 568]] },
  { id: 'gate-icon', systems: { forecast: 3, ops: 5 }, sizes: [[390, 844]] },
  { id: 'second', systems: { forecast: 3, atc: 10, ops: 6 }, sizes: [[390, 844], [320, 568]], lead: 3.2 },
];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const fly = async (cs, W, H) => {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', e => errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(sy => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], tours: ['*'],
      flights: 20, landings: 6, seeds: 200, flightSeconds: 8000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: sy, gadgets: {} } })); }, cs.systems);
    await p.goto(URL); await ready(p); await p.waitForTimeout(300);
    await p.click('#goBtn');
    await p.waitForFunction(() => game.scene.getScene('game').state === 'playing', null, { timeout: 20000 });
    const r = await p.evaluate(lead => new Promise(res => {
      const s = game.scene.getScene('game'); s.graceUntil = 1e12;
      const realLead = s.kit.hintLead; if (lead) s.kit.hintLead = lead;
      s.events.on('preupdate', () => { s.plane.y = 30; s.plane.vy = 0; });   // held high: the gaps are below, so the arrow points down
      const acc = { realLead, frames: 0, drawn: 0, inRange: 0, gates: 0, arrow: false, red: false, icon: 0, lit: false, size: null };
      const t = setInterval(() => { const d = s.hintDrawn; acc.frames++; if (!d) return; acc.drawn++; acc.inRange = Math.max(acc.inRange, d.inRange); acc.gates = Math.max(acc.gates, d.gates);
        acc.arrow = acc.arrow || d.arrow; acc.red = acc.red || d.red; if (d.icon) acc.icon++; acc.lit = acc.lit || d.lit; acc.size = acc.size || d.size; }, 30);
      setTimeout(() => { clearInterval(t); res(acc); }, 9000);
    }), cs.lead || 0);
    const tag = `${cs.id}-${W}x${H}`;
    await p.screenshot({ path: path.join(OUT, `hintdraw-${tag}.png`) });
    await p.screenshot({ path: path.join(OUT, `hintdraw-edge-${tag}.png`), clip: { x: W - 80, y: 0, width: 80, height: H - 60 } });
    r.errs = errs; await p.close(); return r;
  };
  const ONLY = process.env.HD_CASES ? process.env.HD_CASES.split(',') : null, FIRST_SIZE_ONLY = !!process.env.HD_CASES;   // HD_CASES=arrow,second: only those cases, at 390 only (the short run a plant needs; the control runs everything)
  for (const cs of CASES.filter(c => !ONLY || ONLY.includes(c.id))) for (const [W, H] of cs.sizes.filter(z => !FIRST_SIZE_ONLY || z[0] === 390)) {
    const r = await fly(cs, W, H), tag = `${cs.id} @ ${W}x${H}`;
    check(!r.errs.length, `${tag}: no page errors ${r.errs}`);
    if (cs.id === 'none') check(r.drawn === 0 && r.gates === 0 && !r.arrow && r.icon === 0, `${tag}: no hint line bought draws NOTHING (frames drawn ${r.drawn}, gates ${r.gates}, arrow ${r.arrow}, icon frames ${r.icon})`);
    if (cs.id === 'arrow') {
      check(r.arrow && r.drawn > 50, `${tag}: Forecasting 2 + Ops 2 draw the ARROW (arrow ${r.arrow}, frames ${r.drawn})`);
      check(r.gates === 0, `${tag}: and NO gate below Forecasting 3 (most gates drawn in one frame: ${r.gates})`);
      check(r.icon === 0, `${tag}: and NO icon below Ops 5 (icon frames ${r.icon})`);
      check(r.red, `${tag}: the arrow turns red when urgent from Ops 2 (red seen ${r.red})`);
    }
    if (cs.id === 'gate-icon') {
      check(r.gates === 1, `${tag}: Forecasting 3 draws ONE gate, never two without ATC 10 (most gates in one frame: ${r.gates})`);
      check(r.arrow, `${tag}: the arrow shows with the gate (${r.arrow})`);
      check(r.icon > 50 && r.icon === r.drawn, `${tag}: the icon is steady from Ops 5 (icon frames ${r.icon} of ${r.drawn})`);
      check(!r.lit, `${tag}: but it is not lit before Ops 6 (lit ${r.lit})`);
    }
    if (cs.id === 'second') {
      check(r.realLead === 2.4, `${tag}: ATC 10 is a 2.4 s warning in the kit (got ${r.realLead})`);
      check(r.gates === 2, `${tag}: ATC 10 draws a SECOND gate (most gates in one frame: ${r.gates}, in range ${r.inRange})`);
      check(r.icon === r.drawn && r.drawn > 50 && r.lit, `${tag}: the icon is steady and lit while a gap is in range from Ops 6 (icon frames ${r.icon} of ${r.drawn}, lit ${r.lit})`);
    }
  }
  console.log({ fails });
  await b.close();
  if (fails.length) { console.log('FAIL hintdraw:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('PASS hintdraw: arrow only below Forecasting 3 and Ops 5, one gate from Forecasting 3, a second gate at ATC 10, the steady icon from Ops 5, lit from Ops 6, nothing with no line');
})();
