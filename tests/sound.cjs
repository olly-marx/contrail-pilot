// The sound core (src/sound.js; research/SOUND-DESIGN.md, release A). Plain Node, a recording AudioContext double, ~1 s. NOBODY has listened to these sounds: this test holds
// what a machine CAN hold: 1. ONE muted flag: with setMuted(true) no AudioContext and no node is created by any cue, and no vibration;
// 2. a positive control: unmuted, every cue makes sound (else check 1 proves nothing); 3. never harsh: no square or sawtooth anywhere, no noise above NOISE_MAX (0.1),
// no cue louder than the cap; 4. the four ways a flight ends are four different, soft sounds, and the rules pass them (thud ground, crack storm, flutter bird,
// nofly restricted airspace); 5. no menu click borrows the flying flap sound (sfx.flap only in-flight, through the rules' playSound).
// Plants: tools/plants.tsv (test sound).
const fs = require('fs'), path = require('path');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  let contexts = 0, nodes = [], vibrations = 0;
  const param = (rec) => ({ value: 0, setValueAtTime(v) { rec.vals.push(v); }, linearRampToValueAtTime(v) { rec.vals.push(v); }, exponentialRampToValueAtTime(v) { rec.vals.push(v); }, set v(x) {} });
  const mk = (kind, extra = {}) => { const rec = { kind, vals: [], ...extra }; rec.gain = param(rec); rec.frequency = param(rec); rec.connect = n => n; Object.defineProperty(rec.gain, 'value', { get: () => rec.vals[rec.vals.length - 1], set: v => rec.vals.push(v) }); rec.start = () => {}; rec.stop = () => {}; nodes.push(rec); return rec; };
  class FakeAC { constructor() { contexts++; this.state = 'running'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() { return mk('osc'); } createGain() { return mk('gain'); } createBiquadFilter() { return mk('filter'); } createDynamicsCompressor() { return mk('comp'); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; } createBufferSource() { return mk('noise'); } }
  globalThis.window = { AudioContext: FakeAC }; globalThis.navigator = { vibrate: () => { vibrations++; } };
  const S = await import('../src/sound.js');
  const names = Object.keys(S.sfx);
  // 1. muted: nothing at all.
  S.setMuted(true); S.unlockAudio();
  for (const n of names) S.sfx[n](); S.buzz([100]);
  check(contexts === 0 && nodes.length === 0 && vibrations === 0, `MUTED: no AudioContext, no node, no vibration (contexts ${contexts}, nodes ${nodes.length}, vibrations ${vibrations})`);
  // 2. positive control + 3. never harsh, per cue.
  S.setMuted(false);
  const per = {};
  for (const n of names) { const from = nodes.length; S.sfx[n](); per[n] = nodes.slice(from); }
  check(contexts === 1, `un-muted: one context is created (${contexts})`);
  for (const n of names) check(per[n].some(x => x.kind === 'osc' || x.kind === 'noise'), `POSITIVE CONTROL: the cue '${n}' makes sound when un-muted`);
  const bad = [];
  for (const n of names) for (const x of per[n]) if (x.kind === 'osc' && !['sine', 'triangle'].includes(x.type)) bad.push(`${n}:${x.type}`);
  check(bad.length === 0, `no harsh wave: every tone is sine or triangle (found ${bad.join(', ')})`);
  const loud = [];
  // noise level: the gain node created right after the buffer source in noise() carries the clamp
  for (const n of names) { const ns = per[n]; for (let i = 0; i < ns.length; i++) if (ns[i].kind === 'noise') { const gn = ns.slice(i).find(q => q.kind === 'gain')   /* noise() makes the source, then its gain */; const v = Math.max(...gn.vals); if (v > S.NOISE_MAX + 1e-9) loud.push(`${n}:${v}`); } }
  check(S.NOISE_MAX <= 0.1 && loud.length === 0, `noise never above 0.1 (NOISE_MAX ${S.NOISE_MAX}; loud: ${loud.join(', ')})`);
  const peak = {};
  for (const n of names) { const gs = per[n].filter(x => x.kind === 'gain'); peak[n] = gs.length ? Math.max(...gs.map(g => Math.max(...g.vals))) : 0; }
  const over = names.filter(n => peak[n] > 0.2);
  check(over.length === 0, `no cue louder than 0.2 gain (${over.map(n => n + ':' + peak[n]).join(', ')})`);
  // 4. death kinds: distinct, and the rules pass them.
  const kinds = ['thud', 'crack', 'flutter', 'nofly'], sig = n => per[n].map(x => x.kind + (x.type || '')).join(',') + ':' + per[n].length;
  check(kinds.every(k => names.includes(k)), 'the four death sounds exist: thud, crack, flutter, nofly');
  check(new Set(kinds.map(sig)).size === 4 && !kinds.some(k => per[k].filter(x => x.kind === 'osc' && x.type === 'sawtooth').length), 'the four death sounds are four different recipes');
  const { createWorld } = await import('../src/sim/world.js');
  const base = () => ({ fuel: 'kerosene', priceVersion: 2, tutorialDone: true, autoTakeoff: true, muted: true, seenTips: ['*'], landings: 9, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } });
  const die = (setup) => { const w = createWorld(base(), 1); for (let i = 0; i < 4000 && w.state !== 'playing'; i++) w.step(1 / 60); w.explain = () => false; let got = null; w.onFinish = e => { got = e.sound; }; setup(w); for (let i = 0; i < 600 && got === null; i++) w.step(1 / 60); return got; };
  const ground = die(w => { w.plane.y = 1e4; w.runwayUnder = () => null; });
  check(ground === 'thud', `the rules end a ground hit with 'thud' (got ${ground})`);
  const storm = die(w => { const st = { noFly: false, rects: [{ x: 100, y: 0, width: 5, height: 5 }, { x: 100, y: 0, width: 5, height: 5 }] }; w.storms = [st]; w.hitsStorm = q => q === st; });
  const nofly = die(w => { const st = { noFly: true, rects: [{ x: 100, y: 0, width: 5, height: 5 }, { x: 100, y: 0, width: 5, height: 5 }] }; w.storms = [st]; w.hitsStorm = q => q === st; });
  const bird = die(w => { w.hitsStorm = () => false; w.hitBird = () => true; });
  check(storm === 'crack', `a storm ends with 'crack' (got ${storm})`);
  check(nofly === 'nofly', `restricted airspace ends with 'nofly' (got ${nofly})`);
  check(bird === 'flutter', `a bird ends with 'flutter' (got ${bird})`);
  // 4b. the release-B celebration cues exist, and every cue (but the 'crash' alias of 'thud') is its own recipe: tones with their first frequencies.
  const p1 = ['reveal', 'era', 'grow', 'done', 'medal', 'welcome', 'softfail', 'tick'];
  check(p1.every(k => names.includes(k)), `the P1 cues exist: ${p1.filter(k => !names.includes(k)).join(', ') || 'all'}`);
  const sig2 = n => per[n].map(x => x.kind === 'osc' ? `${x.type}${Math.round(x.vals[0])}` : x.kind === 'noise' ? 'n' : '').join(',');
  const dup = {}; for (const n of names.filter(n => n !== 'crash')) (dup[sig2(n)] = dup[sig2(n)] || []).push(n);
  const same = Object.values(dup).filter(a => a.length > 1);
  check(same.length === 0, `every cue is its own recipe (identical: ${same.map(a => a.join('=')).join(' | ')})`);
  // 5. no menu click is the flying flap.
  const bad5 = [];
  for (const f of fs.readdirSync(path.join(__dirname, '../src'))) if (f.endsWith('.js') && f !== 'sound.js') { const t = fs.readFileSync(path.join(__dirname, '../src', f), 'utf8'); if (/sfx\.flap\b/.test(t)) bad5.push(f); }
  check(bad5.length === 0, `no module uses sfx.flap as a click (the flying flap goes through the rules' playSound): ${bad5.join(', ')}`);
  console.log(fails.length ? 'FAIL sound:\n - ' + fails.join('\n - ') : `PASS sound (${names.length} cues: muted = nothing created; all soft; four death sounds, passed by the rules; no menu click is the flap)`);
  process.exit(fails.length ? 1 : 0);
})();
