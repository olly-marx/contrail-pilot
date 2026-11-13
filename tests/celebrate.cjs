// The celebration kit (src/celebrate.js; research/CELEBRATION-KIT.md): plain Node, a tiny fake DOM, ~0.3 s. NOBODY has WATCHED a burst yet (that is the browser turn): this holds what a machine can hold.
// 1. sizes: small 8 / medium 16 / large 24 sparkles, never above PARTICLE_CAP (24); 2. the specs are deterministic and stay inside REACH_PX of the centre; 3. a burst: a layer with the right number of sparkles, the cue played ONCE by
// the kit, the layer removed at settle; 4. once per host: a second call does nothing; 5. reduced motion: NO sparkles, no push, the cue still plays, a still outline; 6. the declared events: every cue exists in sound.js, the big
// moments are large, and a crash/loss is NOT celebrated; 7. the CSS: the layer never takes a tap (pointer-events none), is clipped, nothing loops, and reduce-motion stills it. Plants: tools/plants.tsv (test celebrate).
const fs = require('fs'), path = require('path');
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const K = await import('../src/celebrate.js'), S = await import('../src/sound.js');
  // a tiny fake DOM
  const mk = tag => { const e = { tag, children: [], parent: null, dataset: {}, className: '', _classes: new Set(), style: { vars: {}, setProperty(k, v) { this.vars[k] = v; } },
    classList: { add: c => e._classes.add(c), remove: c => e._classes.delete(c), contains: c => e._classes.has(c) }, appendChild(c) { c.parent = e; e.children.push(c); return c; }, remove() { if (e.parent) e.parent.children = e.parent.children.filter(x => x !== e); } }; e.ownerDocument = { createElement: mk }; return e; };
  const run = (size, { reduced = false, cue = 'reveal' } = {}) => { const host = mk('div'), played = [], timers = []; const ok = K.celebrate(host, { size, cue }, { sfx: { reveal: () => played.push('reveal') }, reduced, schedule: (fn, ms) => timers.push([fn, ms]) }); return { host, ok, played, timers }; };
  // 1. sizes
  const cnt = s => { const r = run(s); const layer = r.host.children[0]; return layer ? layer.children.length : 0; };
  check(cnt('small') === 8 && cnt('medium') === 16 && cnt('large') === 24, `sparkles: small 8, medium 16, large 24 (got ${cnt('small')}/${cnt('medium')}/${cnt('large')})`);
  check(K.PARTICLE_CAP === 24 && Object.values(K.SIZES).every(s => s.particles <= K.PARTICLE_CAP) && K.particleSpecs(100).length <= K.PARTICLE_CAP, `no burst makes more than ${K.PARTICLE_CAP} sparkles (specs for 100: ${K.particleSpecs(100).length})`);
  // 2. specs
  const a = K.particleSpecs(24), b = K.particleSpecs(24);
  check(JSON.stringify(a) === JSON.stringify(b), 'the sparkle specs are deterministic (no random numbers)');
  check(a.every(p => Math.hypot(p.x, p.y) <= K.REACH_PX + 1 && p.delay >= 0 && p.delay <= 0.3 && K.PALETTE.includes(p.colour)), `every sparkle stays within ${K.REACH_PX} px of the centre, starts within 0.3 s and uses the game's palette`);
  // 3. a burst
  const r = run('large');
  check(r.ok && r.host.dataset.celebrated === '1' && r.host.children.length === 1 && r.host.children[0].className === 'cel-layer', 'a burst adds one sparkle layer to the host and marks it celebrated');
  check(r.played.join() === 'reveal', `the kit plays the cue exactly once (played ${r.played.length})`);
  check(r.host.classList.contains('cel-push'), 'a large burst pushes the card');
  r.timers.forEach(([fn]) => fn());
  check(r.host.children.length === 0 && !r.host.classList.contains('cel-push'), 'at settle the layer is gone and the push class is removed');
  check(!run('small').host.classList.contains('cel-push'), 'a small burst does not push the card');
  // 4. once per host
  const o = run('medium'); const again = K.celebrate(o.host, { size: 'medium', cue: 'reveal' }, { sfx: { reveal: () => o.played.push('reveal') }, reduced: false, schedule: () => {} });
  check(!again && o.host.children.length === 1 && o.played.length === 1, `a second celebration of the same host does nothing (returned ${again}, layers ${o.host.children.length}, cues ${o.played.length})`);
  // 5. reduced motion
  const q = run('large', { reduced: true });
  check(q.host.children.length === 0 && !q.host.classList.contains('cel-push') && q.host.classList.contains('cel-still') && q.played.length === 1, `reduced motion: no sparkles, no push, the cue still plays, a still outline (layers ${q.host.children.length}, cues ${q.played.length})`);
  const rp = K.celebrationPlan('large', { reduced: true }), np = K.celebrationPlan('large');
  check(rp.particles === 0 && rp.push === false && rp.still === true && np.particles === 24 && np.push === true && np.still === false, `the plan for reduced motion has no sparkles and no push, a still outline (reduced ${JSON.stringify(rp)}; normal ${np.particles} sparkles)`);
  // 6. the declared events
  const ev = Object.entries(K.CELEBRATIONS);
  const noCue = ev.filter(([, c]) => typeof S.sfx[c.cue] !== 'function' || !K.SIZES[c.size]).map(([k]) => k);
  check(noCue.length === 0 && ev.length >= 6, `every declared event has a real cue and a real size (bad: ${noCue.join(', ') || 'none'}; ${ev.length} events)`);
  check(K.CELEBRATIONS['crossing-landed'].size === 'large' && K.CELEBRATIONS['era-opens'].size === 'large' && K.CELEBRATIONS['nature-funded'].size === 'small', 'the big moments are large (crossing landed, era opens), a nature project is small');
  const bad = Object.keys(K.CELEBRATIONS).filter(k => /crash|lost|fail|overheat|grounded/.test(k));
  check(bad.length === 0 && K.celebrateEvent(mk('div'), 'crossing-lost', { sfx: {}, reduced: false, schedule: () => {} }) === false, `a crash or a loss is NOT celebrated (events: ${bad.join(', ') || 'none'}; crossing-lost plays nothing)`);
  // 6b. the lap (the game's ending): longer than any crossing, three waves, every layer gone at settle
  const L = K.CELEBRATIONS['lap-landed'];
  check(L && K.SIZES[L.size] && K.SIZES[L.size].settleMs > K.SIZES[K.CELEBRATIONS['crossing-landed'].size].settleMs, `the lap's burst lasts longer than a crossing's (lap ${L && K.SIZES[L.size] && K.SIZES[L.size].settleMs} ms)`);
  { const host = mk('div'), q = []; let now = 0, made = 0, last = 0, steps = 0; const realAppend = host.appendChild; host.appendChild = c => { made++; return realAppend.call(host, c); };
    K.celebrateEvent(host, 'lap-landed', { sfx: { era: () => {} }, reduced: false, schedule: (fn, ms) => q.push([now + ms, fn]) });
    while (q.length && steps++ < 100) { q.sort((a, b) => a[0] - b[0]); const [t, fn] = q.shift(); now = t; fn(); if (host.children.length) last = now; }
    check(made === 3 && steps < 100, `the lap bursts in three waves (layers made ${made}, timer steps ${steps})`);
    check(host.children.length === 0 && last <= K.SIZES.lap.settleMs, `at settle (${K.SIZES.lap.settleMs} ms) every wave's layer is gone (left ${host.children.length}, last layer seen at ${last} ms)`); }
  // 7. the CSS
  const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');
  const rule = sel => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')); return m ? m[1] : ''; };
  const layer = rule('.cel-layer');
  check(/pointer-events:\s*none/.test(layer) && /overflow:\s*hidden/.test(layer), 'the sparkle layer never takes a tap (pointer-events none) and is clipped to the card (overflow hidden)');
  check(!/infinite/.test(rule('.cel-layer i')) && !/infinite/.test(rule('.cel-push')), 'nothing in the kit loops (no infinite animation)');
  check(/@media \(prefers-reduced-motion: reduce\) \{[^@]*\.cel-layer \{ display: none; \}[^@]*animation: none/.test(css), 'reduce motion hides the layer and stills the push');
  console.log(fails.length ? 'FAIL celebrate:\n - ' + fails.join('\n - ') : `PASS celebrate (sparkles 8/16/24 under the cap of ${K.PARTICLE_CAP}, deterministic, one cue, once per host, reduced motion has none, ${ev.length} declared events, a crash is not one, the layer never takes a tap)`);
  process.exit(fails.length ? 1 : 0);
})();
