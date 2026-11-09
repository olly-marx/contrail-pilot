// A REAL AudioContext RUNS and puts signal on the output (release A shipped 0.35.0 with tests that used a COUNTING wrapper and a FAKE context; the user: "I didn't hear any new sounds").
// Real Chromium with the autoplay policy ENFORCED (--autoplay-policy=user-gesture-required, and the harness default that removes it ignored), a REAL mouse click, then: 1. before the click
// the game's context may exist but is not 'running' (the browser's rule, so this test is a real policy test); 2. after the click ctx.state === 'running'; 3. a tap on the context's destination
// (every node that connects to it also feeds an AnalyserNode) shows a non-zero peak for tick, thud, reveal, era, with a declared FLOOR per cue (peak amplitude at the destination);
// 4. muted + un-muted again recovers. Floors are declared below with their reason, not inferred. Run: python3 -m http.server 8000 & node tests/audiolive.cjs   (plants: tools/plants.tsv)
const { chromium } = require('playwright-core');
const { ready } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';
// FLOORS (peak amplitude at the destination, full scale = 1), declared from a MEASURED baseline of the 0.34 build in this same harness: flap .0379, coin .0476, land .0578, buy .0535, crash .191, fanfare .059.
// A new cue must reach about the old peak (within ~1 dB, the new waves are softer): tick (the menu click; was the flap) >= .034; thud (a crash) >= .17; reveal (was buy) >= .048; era (was fanfare) >= .05.
const FLOORS = { tick: 0.034, thud: 0.17, reveal: 0.048, era: 0.05 };
let B = null; const T = setTimeout(() => { console.log('GLOBAL TIMEOUT'); process.exit(2); }, 120000);   // never hang, never relaunch
(async () => {
  const b = B = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', ignoreDefaultArgs: ['--autoplay-policy=no-user-gesture-required'], args: ['--autoplay-policy=user-gesture-required'] });
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: false }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
  await p.addInitScript(() => {   // a tap on every context's destination: every node connecting to it also feeds an analyser (nothing else changes)
    window.__ctxs = []; const Orig = window.AudioContext;
    // The autoplay POLICY, modelled on the page's REAL user activation: headless Chromium here does NOT enforce it (measured: a new AudioContext is 'running' before any gesture even with
    // --autoplay-policy set), so a context starts suspended and resume() only takes effect once navigator.userActivation.hasBeenActive (a real click sets it): Chrome's rule.
    window.AudioContext = class extends Orig { constructor(...a) { super(...a); this.__ours = /\/src\/sound\.js/.test(new Error().stack); window.__ctxs.push(this); if (!navigator.userActivation.hasBeenActive) super.suspend(); }
      resume() { return navigator.userActivation.hasBeenActive ? super.resume() : Promise.resolve(); } };
    const conn = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { if (dest instanceof AudioDestinationNode) { const c = dest.context; if (!c.__an) { c.__an = c.createAnalyser(); c.__an.fftSize = 2048; c.__buf = new Float32Array(2048); } conn.call(this, c.__an); } return conn.call(this, dest, ...a); };
    window.__peak = (ms) => new Promise(res => { let pk = 0; const t0 = performance.now(); const tick = () => { for (const c of window.__ctxs) if (c.__an) { c.__an.getFloatTimeDomainData(c.__buf); for (const v of c.__buf) pk = Math.max(pk, Math.abs(v)); } if (performance.now() - t0 < ms) setTimeout(tick, 8); else res(pk); }; tick(); });
    localStorage.clear();
  });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  const pre = await p.evaluate(() => window.__ctxs.filter(c => c.__ours).map(c => c.state));   // only the contexts made by src/sound.js (Phaser makes its own at boot)
  await p.mouse.click(195, 400); await p.waitForTimeout(400);   // a REAL click: the first tap on the page
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.showTitle && 0; }); 
  const S = await p.evaluate(async () => { const m = await import('/src/sound.js'); (m.sfx.tick || m.sfx.flap)(); await new Promise(r => setTimeout(r, 300)); return window.__ctxs.filter(c => c.__ours).map(c => c.state); });
  check(S.length > 0, `the first cue after a real click created an AudioContext (contexts ${S.length}, before the click: ${JSON.stringify(pre)})`);
  check(pre.length === 0, `NO AudioContext exists before the first gesture (a context made at page load starts suspended; states ${JSON.stringify(pre)})`);
  check(S.length > 0 && S.every(s => s === 'running'), `after a REAL click and a cue the context is running (states ${JSON.stringify(S)}; before the click ${JSON.stringify(pre)})`);
  if (process.env.CUES) {   // MEASURE ONLY (a comparison against another build): CUES=flap,coin,land,crash URL=... node tests/audiolive.cjs
    const out = {}; for (const cue of process.env.CUES.split(',')) out[cue] = +(await p.evaluate(async (cue) => { const m = await import('/src/sound.js'); const pr = window.__peak(900); m.sfx[cue](); return pr; }, cue)).toFixed(4);
    console.log('PEAKS', JSON.stringify(out), 'states', JSON.stringify(S)); await b.close(); process.exit(0); }
  // a suspended context (a backgrounded tab, an iOS interruption) is resumed by the next cue
  const rs = await p.evaluate(async () => { for (const c of window.__ctxs.filter(c => c.__ours)) await c.suspend(); const m = await import('/src/sound.js'); m.sfx.tick(); await new Promise(r => setTimeout(r, 400)); return window.__ctxs.filter(c => c.__ours).map(c => c.state); });
  check(rs.length > 0 && rs.every(x => x === 'running'), `a suspended context is resumed by the next cue (states ${JSON.stringify(rs)})`);
  const res = {};
  for (const cue of Object.keys(FLOORS)) { res[cue] = await p.evaluate(async (cue) => { const m = await import('/src/sound.js'); const pr = window.__peak(900); m.sfx[cue](); return pr; }, cue); }
  for (const [cue, floor] of Object.entries(FLOORS)) check(res[cue] >= floor, `'${cue}' reaches the destination with peak ${res[cue].toFixed(4)} (floor ${floor}; 0 = silence)`);
  // muted: silence; un-muted again: sound again (the recovery path)
  await p.waitForTimeout(2000);   // let the last cue ring out (era lasts about 1.3 s)
  const mu = await p.evaluate(async () => { const m = await import('/src/sound.js'); m.setMuted(true); let pr = window.__peak(500); m.sfx.thud(); const a = await pr; m.setMuted(false); pr = window.__peak(900); m.sfx.thud(); return { a, b: await pr }; });
  check(mu.a < 0.002, `muted: no signal (peak ${mu.a.toFixed(4)})`);
  check(mu.b >= FLOORS.thud, `un-muted again: sound is back (peak ${mu.b.toFixed(4)})`);
  console.log('measured peaks:', JSON.stringify(res), 'muted/un-muted:', JSON.stringify(mu), 'states before click:', JSON.stringify(pre));
  check(errs.length === 0, `no page errors: ${errs.join(' | ').slice(0, 200)}`);
  console.log(fails.length ? 'FAIL audiolive:\n - ' + fails.join('\n - ') : 'PASS audiolive (a real context runs after a real click; tick, thud, reveal, era reach the destination above their floors; mute and un-mute work)');
  await b.close(); B = null; clearTimeout(T); process.exit(fails.length ? 1 : 0);
})().catch(async e => { console.log('FAIL audiolive: crashed: ' + String(e).slice(0, 300)); if (B) await B.close().catch(() => {}); process.exit(1); });
