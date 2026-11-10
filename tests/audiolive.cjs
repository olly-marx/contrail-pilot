// A REAL AudioContext RUNS and puts signal on the output (release A shipped 0.35.0 with tests that used a COUNTING wrapper and a FAKE context; the user: "I didn't hear any new sounds").
// Real Chromium with the autoplay policy ENFORCED (--autoplay-policy=user-gesture-required, and the harness default that removes it ignored), a REAL mouse click, then: 1. before the click
// the game's context may exist but is not 'running' (the browser's rule, so this test is a real policy test); 2. after the click ctx.state === 'running'; 3. a tap on the context's destination
// (every node that connects to it also feeds an AnalyserNode) shows a non-zero peak for tick, thud, reveal, era, with a declared FLOOR per cue (peak amplitude at the destination);
// 4. muted + un-muted again recovers. Floors are declared below with their reason, not inferred. Run: python3 -m http.server 8000 & node tests/audiolive.cjs   (plants: tools/plants.tsv)
// WHY THE CUE LOUDNESS IS THE LOUDEST 43 ms READ (decided on the principle, not on the outcome): the loudness of a BRIEF cue (a 70 ms flap, a 35 ms tick) is its short-term loudness, the loudest ~43 ms: the 2048 samples one AnalyserNode read sees at 48 kHz.
// A mean over the polling window averages in the silence around the cue and depends on how many reads the 8 ms timer lands inside it (CI measured the flap at 0.0050-0.0051, local 0.0053-0.0056). The music is steady, so its mean rms is its short-term loudness.
// It is measured LIVE through the game's real master chain, not rendered offline: an offline render of the flap through a fresh copy of the chain peaked at 0.011 against 0.029 for the bare tone and about 0.03-0.04 live: the DynamicsCompressor's gain depends on its
// history, so only the live chain says what the player hears (measured in the 'margin proof' turns, 2026-11-10). Both numbers are printed: LOUDEST READ (the rule) and MEAN (the old estimate).
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
    localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ musicOff: true }));   // the effect checks run WITHOUT music (the music has its own section below)
    window.__rms = (ms) => new Promise(res => { let ss = 0, n = 0; const t0 = performance.now(); const tick = () => { for (const c of window.__ctxs) if (c.__an) { c.__an.getFloatTimeDomainData(c.__buf); for (const v of c.__buf) { ss += v * v; n++; } } if (performance.now() - t0 < ms) setTimeout(tick, 8); else res(Math.sqrt(ss / Math.max(1, n))); }; tick(); });
    // The LOUDEST READ: the highest rms of any single analyser read (2048 samples = 43 ms at 48 kHz) during the window. For a brief cue this is its short-term loudness, independent of how many reads the 8 ms polling lands inside it
    // (the mean over the window, __rms, moved 0.0050-0.0056 for the flap between runs and machines).
    window.__rmsmax = (ms) => new Promise(res => { let mx = 0; const t0 = performance.now(); const tick = () => { for (const c of window.__ctxs) if (c.__an) { c.__an.getFloatTimeDomainData(c.__buf); let ss = 0; for (const v of c.__buf) ss += v * v; mx = Math.max(mx, Math.sqrt(ss / c.__buf.length)); } if (performance.now() - t0 < ms) setTimeout(tick, 4); else res(mx); }; tick(); });
  });
  await p.goto(URL); await ready(p); await p.waitForTimeout(800);
  const pre = await p.evaluate(() => window.__ctxs.filter(c => c.__ours).map(c => c.state));   // only the contexts made by src/sound.js (Phaser makes its own at boot)
  await p.evaluate(async () => { game.registry.get('save').musicOff = true; (await import('/src/music.js')).setMusicOff(true); });   // the effect checks run WITHOUT music (the music has its own section below); a fresh player's save has MUSIC on
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
  // TEST SOUND in the Settings sheet: a real tap plays a sound at the real volume and says which build runs; muted, it plays nothing and says so
  const msgOf = () => p.evaluate(() => (document.getElementById('gearSoundMsg') || {}).textContent || '');
  await p.click('#startChoice [data-area="aotearoa"]', { timeout: 3000 }).catch(() => {}); await p.click('#startChoice [data-city="AUCKLAND"]', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200);   // (a fresh player must choose a start first)
  await p.evaluate(() => { const t = document.getElementById('tour'); if (t) t.remove(); const ui = game.registry.get('ui'); if (ui.tour) ui.tour.busy = true; ui.openGear(); }); await p.waitForTimeout(400);   // (a fresh player's tour overlay would intercept the tap)
  const hasChip = !!(await p.$('#sheet [data-gear="soundtest"]'));
  check(hasChip, 'the Settings sheet has a wired TEST SOUND chip');
  if (!hasChip) { console.log('FAIL audiolive:\n - ' + fails.join('\n - ')); await b.close(); B = null; clearTimeout(T); process.exit(1); }
  let pr1 = p.evaluate(() => window.__peak(900)); await p.click('#sheet [data-gear="soundtest"]', { timeout: 4000 }); const tp = await pr1, tm = await msgOf();
  check(tp >= FLOORS.tick, `TEST SOUND plays a sound at the real volume (peak ${tp.toFixed(4)}; floor ${FLOORS.tick})`);
  check(/Did you hear it/.test(tm) && /This game is \d+\.\d+\.\d+/.test(tm), `TEST SOUND says what to check and which version runs (text: "${tm.replace(/\s+/g, ' ').slice(0, 120)}")`);
  await p.waitForTimeout(2000);
  await p.evaluate(async () => { game.registry.get('save').muted = true; (await import('/src/sound.js')).setMuted(true); (await import('/src/music.js')).syncMusic(); });
  pr1 = p.evaluate(() => window.__peak(600)); await p.click('#sheet [data-gear="soundtest"]', { timeout: 4000 }); const mp = await pr1, mm = await msgOf();
  check(mp < 0.002 && /Sound is OFF/.test(mm) && /This game is /.test(mm), `muted: TEST SOUND stays silent, says 'Sound is OFF' and the version (peak ${mp.toFixed(4)}, text "${mm.replace(/\s+/g, ' ').slice(0, 80)}")`);
  console.log('TEST SOUND peak', tp.toFixed(4), 'text:', JSON.stringify(tm), '| muted peak', mp.toFixed(4), 'text:', JSON.stringify(mm));
  await p.evaluate(async () => { game.registry.get('save').muted = false; (await import('/src/sound.js')).setMuted(false); });
  await p.waitForTimeout(2000);   // let the last cue ring out (era lasts about 1.3 s)
  const mu = await p.evaluate(async () => { const m = await import('/src/sound.js'); m.setMuted(true); let pr = window.__peak(500); m.sfx.thud(); const a = await pr; m.setMuted(false); pr = window.__peak(900); m.sfx.thud(); return { a, b: await pr }; });
  check(mu.a < 0.002, `muted: no signal (peak ${mu.a.toFixed(4)})`);
  check(mu.b >= FLOORS.thud, `un-muted again: sound is back (peak ${mu.b.toFixed(4)})`);
  // ---- MUSIC (the five songs): ONE chip cycles OFF -> SOFT -> MIDDLE -> LOUD -> OFF and saves it; at each level the cues must stand above the music (a LOUDNESS rule, rms at the destination): soft >= 2x, middle >= 1.5x,
  // loud >= 1.0x; the music never louder than rms 0.008; the levels are ordered; a quiet warning dips it to its declared depth and a cue that needs no duck does not; muted silences it. The music is song D every run (setTrackRng) so the numbers repeat. ----
  await p.evaluate(() => { game.registry.get('save').muted = false; });
  await p.waitForTimeout(2000);
  const hasMusicChip = !!(await p.$('#sheet [data-gear="music"]')); check(hasMusicChip, 'the Settings sheet has a wired MUSIC chip');
  if (hasMusicChip) {
    const chipState = () => p.evaluate(() => ({ off: game.registry.get('save').musicOff, level: game.registry.get('save').musicLevel, ls: JSON.parse(localStorage.getItem('contrailPilot.v2') || '{}'), text: (document.querySelector('#sheet [data-gear="music"]') || {}).textContent }));
    const silent0 = await p.evaluate(() => window.__rms(500)); check(silent0 < 0.0005, `MUSIC off (the start of this run): silence at the destination (rms ${silent0.toFixed(4)})`);
    // the cues alone (music off), each over its own length (seconds, declared here)
    const LEN = { tick: 0.06, flap: 0.1, coin: 0.2, thud: 0.4, crack: 0.35, reveal: 0.5, grow: 0.4, done: 0.3, medal: 0.6 };
    // each cue alone (music off): the LOUDEST READ over its own length, best of 2 plays (the rule); the MEAN of one play is printed beside it
    const cueRms = {}, cueLive = {};
    for (const [cue, len] of Object.entries(LEN)) { cueRms[cue] = 0; for (let k = 0; k < 2; k++) { const [mx, mean] = await p.evaluate(async ({ cue, ms }) => { const m = await import('/src/sound.js'); const a = window.__rmsmax(ms), b = window.__rms(ms); m.sfx[cue](); return [await a, await b]; }, { cue, ms: len * 1000 }); cueRms[cue] = Math.max(cueRms[cue], mx); cueLive[cue] = mean; await p.waitForTimeout(450); } }
    await p.evaluate(async () => { (await import('/src/music.js')).setTrackRng(() => 0.7); });   // the same loud song every run (track D: nextTrack draws index 3 of 5)
    const REQ = { soft: 2, middle: 1.5, loud: 1.0 }, music = {}, order = ['soft', 'middle', 'loud'];
    for (const lvl of order) {
      await p.click('#sheet [data-gear="music"]', { timeout: 4000 }); await p.waitForTimeout(1500);
      const st = await chipState();
      check(st.off === false && st.level === lvl && st.ls.musicOff === false && st.ls.musicLevel === lvl && st.text === `MUSIC: ${lvl.toUpperCase()}`, `the MUSIC chip cycles to ${lvl.toUpperCase()} and saves it (save ${st.off}/${st.level}, stored ${st.ls.musicOff}/${st.ls.musicLevel}, chip "${st.text}")`);
      music[lvl] = Math.max(await p.evaluate(() => window.__rms(400)), await p.evaluate(() => window.__rms(400)), await p.evaluate(() => window.__rms(400)));
      check(music[lvl] > 0.0008, `POSITIVE CONTROL at ${lvl}: the music plays and reaches the destination (rms ${music[lvl].toFixed(4)})`);
      check(music[lvl] <= 0.008, `${lvl}: the music is not loud: rms at the destination ${music[lvl].toFixed(4)} <= 0.008`);
      const weak = Object.keys(LEN).filter(cue => cueRms[cue] < REQ[lvl] * music[lvl]).map(cue => `${cue} ${cueRms[cue].toFixed(4)}`);
      check(weak.length === 0, `${lvl.toUpperCase()}: every cue's rms >= ${REQ[lvl]}x the music's rms ${music[lvl].toFixed(4)} (weak: ${weak.join(', ')})`);
      if (lvl === 'middle') {   // ducking at the default level
        const before = await p.evaluate(() => window.__rms(400));
        await p.evaluate(async () => { (await import('/src/sound.js')).sfx.warm(); }); await p.waitForTimeout(170);   // warm (depth 0.5) is over after 0.14 s: the music alone is measured while it is held at 0.5
        const during = await p.evaluate(() => window.__rms(300));
        const dw = await p.evaluate(async () => (await import('/src/sound.js')).DUCKS.warm);   // the declared depth of the quietest-warning class (K = 3, src/sound.js)
        check(during <= (dw + 0.15) * before + 0.0006, `a duck cue dips the music to its declared depth ${dw} (+0.15 allowance): rms ${before.toFixed(4)} -> ${during.toFixed(4)} while it is held`);
        await p.waitForTimeout(2500);
        const before2 = await p.evaluate(() => window.__rms(400));   // a cue with depth 1 (coin) leaves the music alone
        await p.evaluate(async () => { (await import('/src/sound.js')).sfx.coin(); }); await p.waitForTimeout(260);
        const during2 = await p.evaluate(() => window.__rms(300));
        console.log(`DUCK (middle): warm (depth ${dw}) music rms ${before.toFixed(5)} -> ${during.toFixed(5)} = ${(during / before).toFixed(2)} of before (allowed <= ${(dw + 0.15).toFixed(2)}); coin (depth 1) ${before2.toFixed(5)} -> ${during2.toFixed(5)} = ${(during2 / before2).toFixed(2)} of before (needs >= 0.9)`);
        check(during2 >= 0.9 * before2 - 0.0006, `a cue that needs no duck does not dip the music: rms ${before2.toFixed(4)} -> ${during2.toFixed(4)}`);
        await p.waitForTimeout(800);
      }
    }
    check(music.soft < music.middle && music.middle < music.loud, `the levels are ordered by loudness: soft ${music.soft.toFixed(4)} < middle ${music.middle.toFixed(4)} < loud ${music.loud.toFixed(4)}`);
    const page = 0.020, dB = m => (20 * Math.log10(m / page)).toFixed(1);   // the tailnet page's music rms for song D is 0.020 at its master 0.245
    console.log(`MUSIC LEVELS (song D): soft rms ${music.soft.toFixed(4)} (${dB(music.soft)} dB vs the page) | middle ${music.middle.toFixed(4)} (${dB(music.middle)} dB) | loud ${music.loud.toFixed(4)} (${dB(music.loud)} dB); weakest cue ${Object.entries(cueRms).sort((a, b) => a[1] - b[1])[0].join(' ')}; cue LOUDEST-READ rms ${JSON.stringify(Object.fromEntries(Object.entries(cueRms).map(([k, v]) => [k, +v.toFixed(5)])))}; MEAN (old estimate, last play) ${JSON.stringify(Object.fromEntries(Object.entries(cueLive).map(([k, v]) => [k, +v.toFixed(4)])))}; ratios flap/music soft ${(cueRms.flap / music.soft).toFixed(2)} middle ${(cueRms.flap / music.middle).toFixed(2)} loud ${(cueRms.flap / music.loud).toFixed(2)}`);
    await p.click('#sheet [data-gear="music"]', { timeout: 4000 }); await p.waitForTimeout(900);   // LOUD -> OFF
    const off = await chipState(); const offRms = await p.evaluate(() => window.__rms(500));
    check(off.off === true && off.ls.musicOff === true && off.text === 'MUSIC: OFF' && offRms < 0.0005, `the MUSIC chip cycles back to OFF, saves it and the music stops (save ${off.off}, chip "${off.text}", rms ${offRms.toFixed(4)})`);
    // muted: the music is silent too (turn it on again at MIDDLE first: OFF -> SOFT -> MIDDLE)
    await p.click('#sheet [data-gear="music"]', { timeout: 4000 }); await p.click('#sheet [data-gear="music"]', { timeout: 4000 }); await p.waitForTimeout(1200);
    await p.evaluate(async () => { game.registry.get('save').muted = true; const m = await import('/src/sound.js'), mu = await import('/src/music.js'); m.setMuted(true); mu.syncMusic(); }); await p.waitForTimeout(900);
    const mm = await p.evaluate(() => window.__rms(500)); check(mm < 0.0005, `muted: the music is silent too (rms ${mm.toFixed(4)})`);
    await p.evaluate(async () => { game.registry.get('save').muted = false; const m = await import('/src/sound.js'), mu = await import('/src/music.js'); m.setMuted(false); mu.syncMusic(); });
  }
  console.log('measured peaks:', JSON.stringify(res), 'muted/un-muted:', JSON.stringify(mu), 'states before click:', JSON.stringify(pre));
  check(errs.length === 0, `no page errors: ${errs.join(' | ').slice(0, 200)}`);
  console.log(fails.length ? 'FAIL audiolive:\n - ' + fails.join('\n - ') : 'PASS audiolive (a real context runs after a real click; tick, thud, reveal, era reach the destination above their floors; mute and un-mute work)');
  await b.close(); B = null; clearTimeout(T); process.exit(fails.length ? 1 : 0);
})().catch(async e => { console.log('FAIL audiolive: crashed: ' + String(e).slice(0, 1400)); if (B) await B.close().catch(() => {}); process.exit(1); });
