// Sim engine landing 3 (2026-10-25): the flight's rules moved from GameScene into src/sim/physics.js. This
// checks the move changed nothing: on many made-up flights every moved rule gives exactly what the old
// GameScene code gave (copied below, frozen from main at 2ed5663). Plain Node, no browser.
// Run: node tests/sim-physics.cjs        PLANT=<rule> plants a defect in that rule's frozen copy (must fail).
const PLANT = process.env.PLANT || '';

(async () => {
  const P = await import('../src/sim/physics.js');
  const { DAYNIGHT, CLIMATE, FOREST, STORMS, AIRPORT, PLANE, ISSR, CONTRAIL, RADIATION, WIDTH } = await import('../src/config.js');
  const { CONTRAIL_MARGIN } = await import('../src/fleet.js');
  const { mask } = await import('../src/sim/masks-load.js');
  const { HAZARDS } = await import('../src/config.js');
  const Clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // = Phaser.Math.Clamp
  const nudge = (name, v) => PLANT === name ? v + 1e-9 + (typeof v === 'boolean' ? 1 : 0) : v;

  // --- frozen copies of GameScene at 2ed5663 (this = the scene) ---
  const old = {
    dayNightPhase() { const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT; const p = this.clock % (D + N);
      if (p < D) return { isDay: true, toOther: Math.max(0, (p - (D - B)) / B) }; const q = p - D; return { isDay: false, toOther: Math.max(0, (q - (N - B)) / B) }; },
    radiationMode() { const { isDay, toOther: u } = old.dayNightPhase.call(this), lo = 0.5 - DAYNIGHT.neutralFrac / 2, hi = 0.5 + DAYNIGHT.neutralFrac / 2;
      const first = u < lo ? 1 - u / lo : u > hi ? (u - hi) / lo : 0; if (u <= 0) return { cool: isDay, strength: 1 }; return { cool: u < 0.5 ? isDay : !isDay, strength: first }; },
    lateRamp() { return this.isDay ? 1 : 1 + CLIMATE.latePer10k * Math.max(0, this.distancePx - CLIMATE.lateFrom) / 10000; },
    oldWood() { const ramp = Clamp((this.distancePx - FOREST.from) / FOREST.span, 0, 1); return ramp * FOREST.boost * Math.pow(Math.min(1, this.speciesPlanted.size / FOREST.kinds), FOREST.power); },
    forestStore() { return Math.max(FOREST.storeMin, FOREST.store * Math.pow(Math.min(1, this.speciesPlanted.size / FOREST.kinds), FOREST.storePower)); },
    inStormClearZone(worldX) { const a = this.nextAirport.worldX; return worldX + STORMS.width > a - AIRPORT.stormClearBefore && worldX < a + AIRPORT.runwayLen + AIRPORT.stormClearAfter; },
    laneClear(x, w, gTop, gBot, issrs) { const lane = PLANE.h + STORMS.clearLane;
      const blocked = issrs.filter(i => i.x < x + w && i.x + i.width > x && i.y < gBot && i.y + i.height > gTop).map(i => [Math.max(gTop, i.y), Math.min(gBot, i.y + i.height)]).sort((a, b) => a[0] - b[0]);
      let free = gTop; for (const [t, btm] of blocked) { if (t - free >= lane) return true; free = Math.max(free, btm); } return gBot - free >= lane; },
    inCloud(blobs, x, y, w, h, box, grow = 1) { const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      const pad = Math.max(0, grow - 1) * Math.max(w, h) / 2; if (!overlaps(box, { x: x - pad, y: y - pad, w: w + 2 * pad, h: h + 2 * pad })) return false;
      const py = box.y + box.h / 2 - y; for (let px = box.x; px <= box.x + box.w; px += 5) { const lx = px - x;
        if (blobs.some(b => ((lx - b.cx) / (b.rx * grow)) ** 2 + ((py - b.cy) / (b.ry * grow)) ** 2 <= 1)) return true; } return false; },
    inIssrShape(i, box) { return !i.fake && old.inCloud(i.blobs, i.x, i.y, i.width, i.height, box, CONTRAIL_MARGIN[this.kit.margin] || 1); },
    issrAlpha(i, box, inside) { if (inside) return ISSR.insideAlpha; if (i.entered) return ISSR.revealAlpha;
      const gapX = Math.max(0, i.x - (box.x + box.w), box.x - (i.x + i.width)); const gapY = Math.max(0, i.y - (box.y + box.h), box.y - (i.y + i.height));
      const d = Math.max(gapX, gapY); const reveal = i.late ? ISSR.revealPx : this.kit.revealPx, hidden = this.kit.hiddenAlpha;
      if (d >= reveal) return hidden; const step = Math.min(3, Math.floor((1 - d / reveal) * 4)); return hidden + (ISSR.revealAlpha - hidden) * (step / 3); },
    rays(isDay, strength) { const S = CONTRAIL.size; let blocked = 0, hits = [];
      for (let x = RADIATION.margin; x < WIDTH - RADIATION.margin; x += RADIATION.spacing) { let hit = null;
        for (const c of this.contrails) { if (x < c.x || x >= c.x + S) continue; if (!hit || (isDay ? c.y < hit.y : c.y > hit.y)) hit = c; }
        hits.push(hit ? hit.id : -1); if (hit) blocked++; }
      const rate = (isDay ? CLIMATE.sunBlockedPerCol * this.kit.vapour ** CLIMATE.dayWaterPower : CLIMATE.heatTrappedPerCol * this.kit.vapour ** CLIMATE.nightWaterPower) * blocked * strength;
      return { hits, rate }; },
    // landing 5a: drawPlane's pose and the storm pixel hit, as at 2ed5663 (sp = the sprite; alphaMask = the baked masks)
    pose() { const cx = this.plane.x - PLANE.spriteOffX + PLANE.spriteW / 2, cy = this.plane.y - PLANE.spriteOffY + PLANE.spriteH / 2;
      const flying = this.state === 'playing' || this.state === 'over', steep = this.autoUntil && this.gameTime < this.autoUntil;
      const tilt = flying ? Clamp(this.plane.vy / (steep ? 520 : 600), steep ? -0.9 : -PLANE.maxTilt, steep ? 0.9 : PLANE.maxTilt) : 0;
      return { x: Math.round(cx), y: Math.round(cy), rotation: this.state === 'takeoff' && this.airborne ? -0.15 : tilt }; },
    planePixels(sp) { const m = mask('plane'), offs = []; for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.at(x, y)) offs.push([x + 0.5 - m.w / 2, y + 0.5 - m.h / 2]);
      const c = Math.cos(sp.rotation), s = Math.sin(sp.rotation); return offs.map(([ox, oy]) => [sp.x + ox * c - oy * s, sp.y + ox * s + oy * c]); },
    stormPixelsHit(sp, st, enough) { const r0 = st.rects[0], r1 = st.rects[1], W = r0.width; if (sp.x + 40 < r0.x || sp.x - 40 > r0.x + W) return 0;
      const topH = r0.height, botY = r1.y; let n = 0;
      for (const [x, y] of old.planePixels(sp)) { const lx = x - r0.x; if (lx < 0 || lx >= W) continue; let solid = false;
        if (st.noFly) solid = y < topH || y >= botY;
        else for (const q of st.pics) { const m = mask(q.key), px = Math.floor(lx - q.dx), py = Math.floor(y - q.y);
          if (px >= 0 && py >= 0 && px < m.w && py < m.h && m.at(q.flip ? m.w - 1 - px : px, py)) { solid = true; break; } }
        if (solid && ++n >= enough) return n; }
      return n; },
    hitsStorm(sp, st) { const forgive = st.noFly ? 0 : HAZARDS.stormForgive; return old.stormPixelsHit(sp, st, forgive + 1) > forgive; },
  };
  // --- end of frozen copy ---
  const newRays = (f, isDay, strength) => { const cols = P.rayColumns(f.contrails, isDay); const blocked = cols.filter(c => c.hit).length;
    return { hits: cols.map(c => c.hit ? c.hit.id : -1), rate: P.rayRate(f, isDay, strength, blocked) }; };

  // Made-up flights from a seeded generator.
  let a = 7; const r = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }, between = (lo, hi) => lo + r() * (hi - lo);
  const blobsFor = (w, h) => Array.from({ length: 3 + Math.floor(r() * 3) }, (_, k) => ({ cx: between(0, w), cy: between(h * 0.3, h * 0.7), rx: between(10, w / 2), ry: between(h * 0.3, h / 2) }));
  const issr = () => { const w = Math.round(between(40, 220)), h = Math.round(between(20, 140)); return { x: between(-100, 400), y: between(0, 400), width: w, height: h, blobs: blobsFor(w, h), fake: r() < 0.1, entered: r() < 0.2, late: r() < 0.2 }; };
  const margins = Object.keys(CONTRAIL_MARGIN).concat([undefined]);
  const counts = {}, differ = {};
  const same = (name, x, y) => { counts[name] = (counts[name] || 0) + 1; if (JSON.stringify(nudge(name, x)) !== JSON.stringify(y)) differ[name] = (differ[name] || 0) + 1; };
  for (let k = 0; k < 20000; k++) {
    const f = { clock: between(0, 5 * (DAYNIGHT.daySeconds + DAYNIGHT.nightSeconds)), isDay: r() < 0.5, distancePx: between(0, 3e6),
      speciesPlanted: new Set(['a', 'b', 'c', 'd', 'e', 'f'].slice(0, Math.floor(r() * 7))), nextAirport: { worldX: between(0, 3e6) },
      kit: { margin: margins[Math.floor(r() * margins.length)], revealPx: between(20, 200), hiddenAlpha: between(0, 0.3), vapour: between(0.2, 1.5) },
      contrails: Array.from({ length: Math.floor(r() * 40) }, (_, id) => ({ id, x: Math.round(between(-10, 300)), y: Math.round(between(0, 460)) })) };
    if (r() < 0.1) f.clock = Math.round(f.clock / DAYNIGHT.daySeconds) * DAYNIGHT.daySeconds;   // the exact edges
    const box = { x: 60, y: between(0, 460), w: PLANE.w, h: PLANE.h }, i = issr(), issrs = Array.from({ length: Math.floor(r() * 6) }, issr);
    same('dayNightPhase', old.dayNightPhase.call(f), P.dayNightPhase(f));
    same('radiationMode', old.radiationMode.call(f), P.radiationMode(f));
    same('lateRamp', old.lateRamp.call(f), P.lateRamp(f));
    same('oldWood', old.oldWood.call(f), P.oldWood(f));
    same('forestStore', old.forestStore.call(f), P.forestStore(f));
    const wx = f.nextAirport.worldX + between(-3000, 3000); same('inStormClearZone', old.inStormClearZone.call(f, wx), P.inStormClearZone(f, wx));
    const gt = between(0, 300), gb = gt + between(20, 200), lx = between(0, 300); same('laneClear', old.laneClear(lx, 52, gt, gb, issrs), P.laneClear(issrs, lx, 52, gt, gb));
    same('inIssrShape', old.inIssrShape.call(f, i, box), P.inIssrShape(f, i, box));
    const ins = r() < 0.2; same('issrAlpha', old.issrAlpha.call(f, i, box, ins), P.issrAlpha(f, i, box, ins));
    const day = r() < 0.5, str = r(); same('rays', old.rays.call(f, day, str), newRays(f, day, str));
    // 5a: a plane near a storm column (pictures stacked from the gap outwards, as addStormPairAt does)
    f.plane = { x: 60, y: between(0, 440), vy: between(-400, 500) }; f.state = ['playing', 'over', 'takeoff', 'landing'][Math.floor(r() * 4)];
    f.airborne = r() < 0.5; f.gameTime = between(0, 1e5); f.autoUntil = r() < 0.3 ? f.gameTime + between(-500, 500) : 0;
    const pose = old.pose.call(f); same('planePose', pose, P.planePose(f));
    f.pose = { ...pose, x: pose.x + Math.floor(r() * 3) - 1 }; f.planePtsAt = null;   // the turbulence jitter
    const sx = f.pose.x + between(-80, 60), top = between(30, 300), gap = between(60, 160), bot = top + gap, pics = [];
    for (let y = top; y > 0;) { const k = `storm-hang-${r() < 0.5 ? 'c' : 'd'}`, m = mask(k); pics.push({ key: k, y: Math.round(y - m.h), dx: Math.round(26 - m.w / 2), flip: r() < 0.5 }); y -= m.h - 6; }
    for (let y = bot; y < 464;) { const k = `storm-rise-${r() < 0.5 ? 'c' : 'd'}`, m = mask(k); pics.push({ key: k, y: Math.round(y), dx: Math.round(26 - m.w / 2), flip: r() < 0.5 }); y += m.h - 6; }
    const st = { noFly: r() < 0.2, pics, rects: [{ x: sx, y: 0, width: 52, height: top }, { x: sx, y: bot, width: 52, height: 464 - bot }] };
    same('hitsStorm', old.hitsStorm(f.pose, st), P.hitsStorm(f, st, () => P.planePixels(f)));
    same('stormPixelsHit', old.stormPixelsHit(f.pose, st, 50), P.stormPixelsHit(f, st, 50, () => P.planePixels(f)));
  }
  const fails = Object.entries(differ).map(([k, n]) => `${k}: ${n} of ${counts[k]} made-up flights differ from the old GameScene code`);
  if (!counts.rays) fails.push('no comparisons ran');
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log(`PASS: ${Object.keys(counts).length} moved rules identical to the old GameScene code on ${counts.rays} made-up flights each`);
})();
