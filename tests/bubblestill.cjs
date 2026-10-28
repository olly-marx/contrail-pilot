// The rails' bubble holds still on a PULSING target (the user's live bug, 2026-10-28: on the free-parcels step it jumped above
// and below the FREE button, ~170 px each time). The real L5 scene in NATURE at 3 phone sizes: 30 samples over 3 s, the bubble
// keeps ONE side and moves <= 6 px. Plant: the old placement (side re-decided each frame, measured with the pulse) -> 5 flips.
// Run: python3 -m http.server 8000 & node tests/bubblestill.cjs
const { chromium } = require('playwright-core'); const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
const fails = [], check = (c, m) => { if (!c) fails.push(m); };
(async () => { const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const fleet = { plane: 'comet', planes: { comet: { engines: 1 } }, systems: {}, gadgets: {} };
  const save = { areas: ['easia'], homeArea: 'easia', city: 'SEOUL', tutorialDone: true, muted: true, priceVersion: 2, seenTips: ['x-bars'], shownLines: ['trees'], freeGiven: true, freeProjectGiven: true, fleet, seeds: 0, crystals: 0, flights: 5, landings: 4, missionsDone: ['L1','L2','L3','L4'], unclaimed: [], tours: ['r-school','r-free','r-takeoff1','r-res1','r-takeoff2','r-res2','r-nature','name','r-systems','r-boards','r-bonus','nature-lead'] };
  for (const [w, h] of [[360, 640], [390, 844], [414, 736]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(s => { localStorage.clear(); localStorage.setItem('s2:contrailPilot.v2', JSON.stringify(s)); }, save);
    await p.goto(URL); await ready(p); await p.waitForTimeout(800); await p.click('#tabNature', { force: true }); 
    let ok = false; for (let i = 0; i < 40; i++) { ok = await p.evaluate(() => { const t = document.getElementById('tour'); return !t.hidden && /parcels/i.test(t.querySelector('.tbubble p').textContent); }); if (ok) break; await p.waitForTimeout(150); }
    const sides = [], tops = []; for (let i = 0; i < 30; i++) { const v = await p.evaluate(() => { const b = document.querySelector('#tour .tbubble').getBoundingClientRect(), r = document.querySelector('#tour .tring').getBoundingClientRect(); return [b.top > r.top ? 'B' : 'A', Math.round(b.top)]; }); sides.push(v[0]); tops.push(v[1]); await p.waitForTimeout(100); }
    const changes = sides.filter((s, i) => i && s !== sides[i - 1]).length, spread = Math.max(...tops) - Math.min(...tops);
    check(ok && changes === 0 && spread <= 6, `${w}x${h}: the bubble keeps one side and place over 3 s of the pulse (step ${ok}, ${changes} side changes, moved ${spread} px)`);
    await p.close(); }
  await b.close();
  console.log(fails.length ? `FAIL bubblestill:\n - ${fails.join('\n - ')}` : 'PASS bubblestill: on the pulsing FREE parcels the bubble holds its side and place at 360x640, 390x844, 414x736');
  process.exit(fails.length ? 1 : 0); })();
