// The flight's rules as methods (sim engine landing 5f, 2026-10-25), moved verbatim from GameScene. GameScene
// mixes them in (Object.assign(GameScene.prototype, RULES)) and the sim engine's world does the same, so both run
// exactly this code. `this` is the flight. No Phaser here: drawing and sound go through hooks the world leaves empty.
import { km, WIDTH, HEIGHT, GROUND_H, PLANE, WORLD, STORMS, ISSR, DAYNIGHT, PARCEL, HAZARDS, AIRPORT, CLIMATE, TOKENS, POWERUPS } from '../config.js';
import { GAP_HINT } from '../fleet.js';
import { REGION_DATA } from '../habitats.js';
import { flightPath, legBetween, HOME, city } from '../route.js';
import { regionBelow } from '../geo.js';
import { loadout } from '../upgrades.js';
import { makeRng } from './rng.js';
import { overlaps } from './physics.js';
import * as P from './physics.js';
import { mask } from './masks-load.js';

const SKY_H = HEIGHT - GROUND_H;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));   // = Phaser.Math.Clamp
const FLOCK_HALF = 2;   // a flock fills the box of an old 5-bird V: 26 px across, 36 px down
// PixelLab thunderclouds (the user, 2026-10-24): every storm column is a whole storm tower picture
// (tools/art/pixellab_storm.py): crown up below the gap, hanging (flipped, darker) above it.
// tools/sim/bake-masks.py bakes a mask for each: add a letter there too.
export const STORM_ART = ['c', 'd'];
const STORM_OVERLAP = 40;   // a tall column stacks another tower behind, overlapping this much

export const RULES = {
  // The flight's state, before take-off (moved from GameScene.create, sim engine 5f). this.save and
  // this.autostart are set by the caller.
  initFlight() {
    this.kit = loadout(this.save);
    this.rng = makeRng(this.save.simSeed ?? (Math.random() * 2 ** 32) >>> 0);   // physics random numbers (src/sim/rng.js); decoration keeps Math.random
    this.state = 'idle';             // idle -> takeoff -> playing -> landing | over
    this.speed = WORLD.startSpeed;
    this.distancePx = 0;
    this.elapsed = 0;
    this.stateTime = 0;
    this.storms = [];
    this.issrs = [];
    this.contrails = [];
    this.blockers = [];
    this.runways = [];
    this.trees = [];                 // planted trees: keep cooling after they scroll away
    this.plots = [];                 // soil plots on the ground to aim parcels at
    this.turbs = [];                 // turbulence zones {x, y, w, h, blobs, view}
    this.birds = [];                 // flocks {birds: [{ox, oy, x, y, key, flip, view}], x, y, phase}
    this.nextTurbAt = HAZARDS.turbulence.from;
    this.nextBirdsAt = HAZARDS.birds.from;
    this.inTurb = false;
    this.bumpIn = 0;
    this.parcelsFalling = [];
    this.nextPlotAt = PARCEL.firstAt;
    this.treeFeedback = 0;
    this.speciesIdx = 0;
    this.decor = [];                 // ponds etc. scrolling on the ground
    this.nextDecorAt = 500;
    this.storks = [];
    this.explaining = false;
    this.popups = [];
    this.tokens = [];                // floating trees to collect
    this.cargo = 0;                  // seeds on board: kept only if you land
    this.crystals = 0;               // ice crystals earned this flight: always kept
    this.nightDodges = 0;            // dodge crystals so far tonight (capped)
    this.dodgesTotal = 0;            // all nights this flight (for the online boards)
    this.nextTokenAt = 420;
    this.clock = 0;                  // drives day and night (flight school can set it)
    this.gameTime = 0;               // ms of unfrozen flight, used for contrail ages
    this.frozen = false;             // flight school pauses the action to explain
    this.school = null;
    this.nextStormAt = WIDTH + 200;  // first storm arrives after the climb-out
    this.nextIssrAt = 300;
    this.stormCount = 0;
    this.lastContrail = 0;
    this.wasInIssr = false;

    this.heat = 0;                   // net heating (play units)
    this.totalCo2 = 0;
    this.co2Rate = 0;
    this.sunBlocked = 0;
    this.heatTrapped = 0;
    this.breakdown = { co2: 0, night: 0, sun: 0, trees: 0 };
    this.feedback = { amount: 0, timer: 0 };
    this.parcels = this.kit.tree ? this.kit.tree.parcels : 0;
    this.planted = 0;
    this.forestFullSaid = false;
    this.landStored = 0;               // ...and rewilded land
    this.forestStored = 0;             // CO2 the forest has soaked up this flight (see forestStore())
    this.goldens = 0;                  // golden seeds grabbed
    this.foundIds = []; this.foundThisFlight = 0;   // animals found THIS flight (the scene object is reused between flights)
    this.bumped = false;               // shaken by turbulence
    this.parcelOnRunway = false;       // a parcel landed on a runway (oops!)
    this.speciesPlanted = new Set();   // kinds of tree planted this flight (for the online boards)
    this.lastHalf = 'day';
    this.night = { started: false, trappedAtStart: 0 };
    this.nightOwl = false;
    this.warnedHot = false;

    // The journey (src/route.js): take off from the city you last landed in, the way you chose; the
    // flight's path then follows the world-tour rule. Flight school and the first flights: LONDON towards
    // PARIS. this.path[0] is home; airportIndex = airports passed so far this flight (startCity is 0).
    this.path = flightPath(this.autostart === 'school' || !this.save.tutorialDone ? { city: HOME } : this.save);
    this.startCity = 0;
    this.homeName = this.path[0];
    this.airportIndex = 0;
    this.airportsSkipped = 0;
    this.nextAirport = this.airportAhead(0);
    this.plane = { x: PLANE.x, y: this.groundedY(), vy: 0 };
  },
  inGrace() { return this.graceUntil && this.gameTime < this.graceUntil; },
  onAutopilot() { return this.autoUntil && this.gameTime < this.autoUntil; },
  // Where the autopilot steers (plane top y): the middle of the next storm gap ahead, else a safe
  // height; nudged above or below a flock of birds near that line.
  autopilotTarget() {
    const ahead = this.storms.filter(st => st.rects[0].x + st.rects[0].width > this.plane.x - 4 && st.rects[0].x < WIDTH)
      .sort((a, b) => a.rects[0].x - b.rects[0].x)[0];
    let y = ahead ? (ahead.rects[0].height + ahead.rects[1].y) / 2 - PLANE.h / 2 : this.plane.y;
    for (const f of this.birds) {
      if (f.x > this.plane.x - 20 && f.x < this.plane.x + 220 && Math.abs(f.y - y) < 50) y = f.y > y ? f.y - 60 : f.y + 60;
    }
    return clamp(y, 40, SKY_H - 60);
  },
  // The autopilot PICK-UP's pilot: tries every height and flies the path that is best a little way
  // ahead. Storms and birds are off limits; icy air is sought by day (a shading contrail) but only if
  // the contrail will fade before dark, and avoided otherwise (it would trap heat). It uses the same
  // icy-air shape test that makes real contrails (inIssrShape), so it knows exactly where they form.
  wantContrails() {
    if (!this.isDay) return false;
    const { daySeconds: D, nightSeconds: N, blendSeconds: B } = DAYNIGHT;
    const toWarm = D - B / 2 - this.clock % (D + N);   // contrails start to warm halfway through dusk
    return toWarm > this.kit.contrailLife / 1000 + 1;
  },
  autopilotPlan() {
    const H = PLANE.h, W = PLANE.w, want = this.wantContrails();
    const ahead = [0, 12, 24, 40, 60, 85, 115, 150];
    let best = this.plane.y, bestCost = Infinity;
    for (let y = 34; y <= SKY_H - 80; y += 3) {
      let cost = Math.abs(y - this.plane.y) * 0.15;
      ahead.forEach((d, k) => {
        const w = 1 / (1 + k * 0.35);                                       // nearer matters more
        const box = { x: this.plane.x + d, y, w: W, h: H };
        for (const st of this.storms) for (const r of st.rects) {
          if (box.x < r.x + r.width + 4 && box.x + W > r.x - 4 && y < r.y + r.height + 6 && y + H > r.y - 6) cost += 1000 * w;
        }
        const pad = { x: box.x - 8, y: y - 10, w: W + 16, h: H + 20 };          // every bird's picture, with room to spare
        for (const f of this.birds) for (const bd of f.birds) if (overlaps(pad, P.birdBox(bd))) cost += 1000 * w;
        for (const i of this.issrs) if (this.inIssrShape(i, box)) cost += (want ? -40 : 600) * w;
      });
      if (cost < bestCost) { bestCost = cost; best = y; }
    }
    return best;
  },
  // Bigger Hold: grows faster. Rounded to 1 decimal so 1 + 0.6 * n never shows as 3.4000000000000004.
  multiplier() { return Math.round((1 + this.kit.perSkip * this.airportsSkipped) * 10) / 10; },
  hitbox() { return { x: this.plane.x, y: this.plane.y, w: PLANE.w, h: PLANE.h }; },
  // Hitbox y at which the sprite's wheels touch the ground.
  groundedY() { return SKY_H - PLANE.spriteH + PLANE.spriteOffY; },
  // Bottom of the drawn plane (wheels), used for ground contact.
  spriteBottom() { return this.plane.y - PLANE.spriteOffY + PLANE.spriteH; },
  runwayUnder(box) {
    return this.runways.find(r => r.x <= box.x && box.x + box.w <= r.x + AIRPORT.runwayLen && r.name !== this.homeName);
  },
  // The k-th airport ahead of the start city (0 = the next one), at worldX `from` + that leg.
  airportAhead(k, from = 0) {
    return { worldX: from + this.legKm(k), name: this.path[k + 1], spawned: false };
  },
  // Game km of leg k of this flight's path (balanced, src/network.js).
  legKm(k) { return legBetween(this.path[k], this.path[k + 1]); },
  // Parcels take turns through the kinds of tree you own, so variety comes naturally.
  treeKind() {
    const list = this.kit.tree ? this.kit.tree.species : ['spruce'];
    return list[this.speciesIdx % list.length];
  },
  // Parcels keep the plane's forward speed and drift down under a parachute, so you have to
  // drop them before you reach a soil plot. This works out which bit of ground (in today's screen
  // position) one would land on if dropped now. The ground keeps scrolling while it falls, so
  // that is the parcel's screen drift plus the scroll: it lands ahead of the plane.
  predictLanding() {
    let x = this.plane.x + PLANE.w / 2, y = this.plane.y + PLANE.h, vy = 0, vx = 0, t = 0;
    const dt = 1 / 60;
    while (y < SKY_H && t < 8) {
      t += dt;
      vy = t < PARCEL.chuteAfter ? vy + PARCEL.gravity * dt : Math.min(PARCEL.terminal, vy + PARCEL.gravity * dt);
      vx = -this.speed * (1 - Math.exp(-t / PARCEL.dragTime));   // on screen: drifts back as it slows
      x += (vx + this.speed) * dt; y += vy * dt;
    }
    return x;
  },
  // A flock at (x, y) flies at speed + extraSpeed; each storm on screen at speed. When the plane
  // reaches a storm, would the flock be near the plane and inside that storm's gap?
  flockBlocksGap(x, y, half) {   // half: the flock's size in old V steps (13 px across, 9 px down)
    const B = HAZARDS.birds, v = Math.max(1, this.speed);
    const top = y - half * 9 - 4 - B.wobble, bottom = y + half * 9 + 16 + B.wobble;   // the V's height, bird size and bobbing
    return this.storms.some(st => {
      const r = st.rects[0], t = (r.x - this.plane.x) / v;
      if (t < 0) return false;
      const fx = x - (v + B.extraSpeed) * t;
      return fx < this.plane.x + PLANE.w + 120 && fx + half * 26 + 16 > this.plane.x - 80 && top < st.rects[1].y && bottom > r.height;   // wide margin: the speed creeps up
    });
  },
  heatPct() { return this.heat * 100 / CLIMATE.dangerLine; },   // heat as % of the danger line (the warning thresholds are in %)

  spawn() {
    // Airports: draw the runway as it comes on screen; move to the next once passed.
    const na = this.nextAirport;
    if (!na.spawned && PLANE.x + na.worldX - this.distancePx <= WIDTH + 10) {
      this.addRunway(na.worldX, na.name);
      na.spawned = true;
    }
    if (this.distancePx > na.worldX + AIRPORT.runwayLen && this.state === 'playing') {
      this.airportIndex++;
      this.airportsSkipped++;
      this.explain('x-multiplier', `You flew past ${na.name}! That is fine: the next airport is ${km(this.legKm(this.airportIndex))} ahead.<br>Your <b>landing bonus</b> is now <b>x1.5</b> (top left). Each airport you pass makes it bigger. But crash, and you lose ALL your seeds!`, 'lesson-bonus');
      this.nextAirport = this.airportAhead(this.airportIndex, na.worldX);
      this.missedSign = { text: `Passed ${na.name}. Next: ${this.nextAirport.name}`, until: this.gameTime + 4000 };
    }
    const toAirport = this.nextAirport.worldX - this.distancePx;
    if (this.school) return;   // flight school places everything itself
    if (toAirport < 400 && toAirport > 0 && !this.school) this.ui.tipOnce('airport', 'Airport ahead!', 'Get low as you reach the grey runway: the plane lands itself. Or fly on for more seeds!', 'good', 3.5);

    if (this.kit.tree && this.parcels > 0 && this.distancePx >= this.nextPlotAt) {   // no parcels left: no more soil
      const x = WIDTH + 10;
      const onRunway = this.runways.some(r => x + this.kit.plotW > r.x - 10 && x < r.x + AIRPORT.runwayLen + 10)
        || this.nextAirport.worldX - this.distancePx < WIDTH - PLANE.x + 40 && this.nextAirport.worldX + AIRPORT.runwayLen - this.distancePx > WIDTH - PLANE.x - this.kit.plotW - 40;
      if (!onRunway && REGION_DATA[this.regionNow || 'woodland']) this.addPlot(x);   // no soil over the sea or the ice
      this.nextPlotAt += this.between(PARCEL.plotEvery[0], PARCEL.plotEvery[1]);
    }
    if (this.school) return;   // flight school places everything itself

    // The next-gap hint (eras): with all three systems, storm columns are made `lead` px further
    // ahead (off screen) and their gap glows at the right edge before they scroll in. lead 0 = today.
    const lead = Math.round(GAP_HINT.lead[this.kit.hintLevel] * this.speed);
    if (this.distancePx >= this.nextStormAt - WIDTH - lead) {
      const worldX = this.distancePx + (WIDTH + 10 + lead - PLANE.x);
      if (!this.inStormClearZone(worldX)) this.addStormPair(WIDTH + 10 + lead);
      this.nextStormAt += STORMS.spacing;
    }
    if (this.distancePx >= this.nextIssrAt) {
      // Forecasting (eras): good forecasts route you round a few night patches (nightPatches < 1).
      const routed = !this.isDay && this.rand() > this.kit.nightPatches;
      if (!routed && this.rand() < Math.min(1, ISSR.spawnChance * this.lateRamp())) this.addIssr();   // more icy air on long flights
      // A forecast also shows icy air that isn't there: false patches, `fakes` of all shown.
      if (this.kit.fakes && !this.school && this.rand() < Math.min(1, ISSR.spawnChance * this.lateRamp()) * this.kit.fakes / (1 - this.kit.fakes)) this.addIssr({ fake: true });
      this.nextIssrAt += ISSR.spawnEvery;
    }
    const T = HAZARDS.turbulence;
    if (this.distancePx >= this.nextTurbAt) {
      if (this.rand() < T.chance * this.kit.gapTurb) {   // ATC radar: calmer skies
        const h = this.between(T.minH, T.maxH);
        this.turbs.push({ x: WIDTH + 10, w: this.between(T.minW, T.maxW), y: this.between(30, SKY_H - 60 - h), h });
        this.newHazard('turbulence', 'NEW HAZARD: TURBULENCE', 'Wavy lines = bumpy air! Inside it your plane gets pushed about and your taps work a little late. Fly over or under it!');
      }
      this.nextTurbAt += T.every;
    }
    const B = HAZARDS.birds;
    if (this.distancePx >= this.nextBirdsAt) {
      if (this.rand() < B.chance * this.kit.gapBirds) this.addFlock();   // ATC bird advisories: fewer flocks
      this.nextBirdsAt += B.every;
    }
    if (this.distancePx >= this.nextTokenAt) {
      const chance = Math.min(TOKENS.maxChance, TOKENS.chance + TOKENS.chancePerKm * this.distancePx / 1000);
      if (this.rand() < chance) this.addToken();
      this.nextTokenAt += TOKENS.spawnEvery;
    }
    if (this.distancePx >= (this.nextPowerAt ??= POWERUPS.from)) {
      this.nextPowerAt += POWERUPS.every;
      const r = this.rand(), safHelps = !['saf100', 'hydrogen'].includes((this.ownKit || this.kit).fuelId);
      const pathY = () => clamp(this.plane.y + this.between(-50, 50), 60, SKY_H - 90);
      const firstSaf = !this.safOffered && this.distancePx >= POWERUPS.safFirstAt;
      // 0.10.2: no SAF cans before SAF exists in your era (it returns in the 2010s, PLANE-DESIGN.md section 3).
      if (!this.school && this.kit.safCans && safHelps && (firstSaf || r < POWERUPS.safChance)) {
        this.safOffered = true;
        this.addPower('saf', WIDTH + 10, pathY());
        this.ui.tipOnce('safAhead', 'SAF ahead!', 'Grab the green fuel can: cleaner fuel for a while.', 'good', 3);
      }
      else if (!this.school && this.kit.autoChance && r > 1 - this.kit.autoChance) this.addPower('auto');   // 0.10.2: only once the Autopilot gadget is bought
    }
  },
  addStormPair(x = WIDTH + 10) {
    if (this.distancePx < WORLD.warmup) this.warmStorms = this.stormCount;   // gaps only narrow after the warm-up
    let gap = Math.max(STORMS.minGap, STORMS.startGap - STORMS.gapShrinkPerPair * (this.stormCount - (this.warmStorms || 0)));
    const nf = HAZARDS.noFly;
    const noFly = this.distancePx >= nf.from && this.rand() < nf.chance;
    if (noFly) gap = Math.max(nf.minGap, gap - nf.gapLess);
    gap = Math.round(gap * this.kit.gaps);   // air traffic control (eras): better spacing, gaps up to ~3% wider
    const lo = STORMS.marginTop + gap / 2;
    const hi = SKY_H - STORMS.marginTop - gap / 2;
    const w = noFly ? nf.width : STORMS.width;
    // Leave a clear lane past any icy air already in this column (20 tries, else no storm this time).
    let gapY = null;
    for (let k = 0; k < 20 && gapY === null; k++) { const t = this.between(lo, hi); if (this.laneClear(x, w, t - gap / 2, t + gap / 2)) gapY = t; }
    if (gapY === null) return;
    if (noFly) this.addNoFlyAt(x, gapY, gap);
    else this.addStormPairAt(x, gapY, gap);
  },
  addStormPairAt(x, gapY, gap) {
    const topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: STORMS.width, height: topH };
    const bottom = { x, y: botY, width: STORMS.width, height: SKY_H - botY };
    const pics = [], pick = () => STORM_ART[this.between(0, STORM_ART.length - 1)];
    const place = (key, y) => { const t = mask(key);   // the picture's size (the baked mask is the picture's size)
      pics.push({ key, y: Math.round(y), dx: Math.round(STORMS.width / 2 - t.w / 2), flip: this.rand() < 0.5, h: t.h }); };
    for (let y = topH; y > 0;) { const k = `storm-hang-${pick()}`; const h = mask(k).h; place(k, y - h); y -= h - STORM_OVERLAP; }
    for (let y = botY; y < SKY_H;) { const k = `storm-rise-${pick()}`; place(k, y); y += mask(k).h - STORM_OVERLAP; }
    // Drawn farthest first: the picture at the gap edge is in front.
    const order = [...pics.filter(q => q.key.includes('hang')).reverse(), ...pics.filter(q => q.key.includes('rise')).reverse()];
    const st = { rects: [top, bottom], parts: [], pics: order, flashUntil: 0, nextSpark: 0 };
    this.storms.push(st);
    this.stormCount++;
    this.showStorm(st);
  },
  // Restricted airspace: thinner than a storm, but the gap is tighter.
  addNoFlyAt(x, gapY, gap) {
    const W = HAZARDS.noFly.width, topH = gapY - gap / 2, botY = gapY + gap / 2;
    const top = { x, y: 0, width: W, height: topH };
    const bottom = { x, y: botY, width: W, height: SKY_H - botY };
    const st = { rects: [top, bottom], parts: [], flashUntil: 0, noFly: true };
    this.storms.push(st);
    this.stormCount++;
    this.showNoFly(st);
    this.newHazard('noFly', 'NEW HAZARD: NO-FLY ZONE', 'Red stripes mean planes are not allowed there, like near airports or big events. Squeeze through the gap: touching it ends your flight!');
  },
  addRunway(worldX, name) {
    const rw = { x: PLANE.x + worldX - this.distancePx, worldX, name, parts: [] };   // x: the runway's start on screen (the record; its pictures follow it)
    this.runways.push(rw);
    this.showRunway(rw);
  },
  addPlot(x) {
    const pl = { x, parts: [], used: false };
    this.plots.push(pl);
    this.showPlot(pl);
  },
  // fake: a forecast's false patch (looks real, makes no contrail, puffs away when you get close).
  addIssr({ fake = false } = {}) {
    const grow = Math.sqrt(this.lateRamp());   // long flights: bigger patches (area grows with the ramp)
    const w = Math.round(this.between(ISSR.minW, ISSR.maxW) * grow);
    const h = Math.min(SKY_H - 40, Math.round(this.between(ISSR.minH, ISSR.maxH) * grow)), x = WIDTH + 10;
    // Never fill a storm gap: there is always a way through without a contrail (10 tries, else skip).
    for (let k = 0; k < 10; k++) {
      const y = this.between(10, SKY_H - h - 10);
      const blocks = this.storms.some(st => { const r = st.rects[0]; return r.x < x + w && r.x + r.width > x
        && !this.laneClear(r.x, r.width, r.height, st.rects[1].y, [...this.issrs, { x, y, width: w, height: h }]); });   // with the icy air already there
      if (!blocks) {
        const r = this.addIssrAt(x, y, w, h);
        if (fake) r.fake = true;
        else if (this.kit.late && this.rand() < this.kit.late) r.late = true;   // the forecast missed it: seen only up close
        return;
      }
    }
  },
  // An ISSR is a lumpy patch, not a box: 3-5 overlapping ellipses inside its bounding box. Every
  // ellipse crosses the box's middle line, so the patch is one piece and flying through the
  // middle always makes a contrail. The texture is masked to the ellipses.
  // Icy air is a record (src/sim/physics.js); the patch drawn for it is its .view (a tile sprite masked to the blobs).
  addIssrAt(x, y, w, h) {
    const r = P.makeIssr(this, x, y, w, h);
    this.issrs.push(r);
    this.showIssr(r);
    return r;
  },
  // Contrails are records (src/sim/physics.js); the square drawn for each is its .view.
  addContrail(time) {
    const c = P.makeContrail(this, time);
    this.contrails.push(c);
    this.showContrail(c);
  },
  // A floating tree. Often placed in a storm gap or inside icy air, so grabbing it is a choice.
  addToken(x = WIDTH + 10, y = null, golden = null) {
    if (y === null) {
      const storm = this.storms[this.storms.length - 1];
      const issr = this.issrs.find(i => i.x + i.width > WIDTH - 20);
      if (storm && storm.rects[0].x > WIDTH - 80 && !storm.hasToken) {
        storm.hasToken = true;
        const gapTop = storm.rects[0].height, gapBot = storm.rects[1].y;
        y = this.between(gapTop + 12, gapBot - 26);
        x = storm.rects[0].x + STORMS.width / 2 - 7;
      } else if (issr && this.rand() < 0.4) {
        y = this.between(issr.y + 4, issr.y + issr.height - 18);
      } else {
        y = this.between(50, SKY_H - 70);
      }
    }
    if (golden === null) golden = this.distancePx > TOKENS.goldenAfter && this.rand() < TOKENS.goldenChance;
    const t = { x, y, baseY: y, phase: this.rand() * 6, value: golden ? 3 : 1 };   // a record; its picture is .view
    this.tokens.push(t);
    this.showToken(t);
  },
  // A pick-up (POWERUPS): rides with the seeds, so it is collected in updateTokens.
  addPower(power, x = WIDTH + 10, y = this.between(60, SKY_H - 90)) {
    const t = { x, y, baseY: y, phase: this.rand() * 6, value: 0, power };
    this.tokens.push(t);
    this.showToken(t);
  },
  addFlock(x = WIDTH + 20, y = null) {
    const B = HAZARDS.birds, n = this.between(B.flock[0], B.flock[1]);
    if (y === null) {   // never a flock in a storm gap just as the plane goes through it (10 tries, else skip)
      for (let k = 0; k < 10 && y === null; k++) { const t = this.between(60, SKY_H - 90); if (!this.flockBlocksGap(x, t, FLOCK_HALF)) y = t; }
      if (y === null) return;
    }
    // A dense arrowhead of many small birds (2026-10-22: the user wanted flocks more obvious), packed
    // into the same box a 5-bird V used (FLOCK_HALF), so gap safety and difficulty barely change.
    const birds = [], W = FLOCK_HALF * 13, H = FLOCK_HALF * 9;
    for (let tries = 0; birds.length < n && tries < 400; tries++) {
      const oy = this.between(-H, H), ox = Math.min(W, Math.round(Math.abs(oy) * 1.2 + this.between(0, 9)));
      if (birds.some(q => Math.abs(q.ox - ox) < 6 && Math.abs(q.oy - oy) < 5)) continue;   // a clear gap round each bird
      birds.push({ ox, oy, x: x + ox, y: y + oy, key: 'bird-0', flip: true });   // a record, facing the plane; its image is .view
    }
    const f = { birds, x, y, half: FLOCK_HALF, phase: this.rand() * 6 };
    this.birds.push(f);
    this.showFlock(f);
    this.newHazard('birds', 'NEW HAZARD: BIRDS', 'A flock of birds is flying at you! Fly over or under them. Hitting a bird ends your flight.');
  },
  newHazard(id, title, body) {
    if (this.school) return;
    if (!this.explain(`hazard-${id}`, `<b>${title}</b><br>${body}`, `lesson-${id.toLowerCase()}`)) {
      if (!this.hazardSeen) this.hazardSeen = {};
      if (!this.hazardSeen[id]) { this.hazardSeen[id] = true; this.popup(WIDTH / 2, 84, `${{ noFly: 'No-fly zone', turbulence: 'Turbulence', birds: 'Birds' }[id]} ahead!`, '#ff8080'); }   // y 84: below the 2-line mission text
    }
  },
  // 1 until CLIMATE.lateFrom km into a flight, then grows by latePer10k every 10,000 km.
  // Only NIGHTS get harder (more and bigger icy air): day shade, and saving up cooling, stay as they are.
  lateRamp() { return P.lateRamp(this); },
  inStormClearZone(worldX) { return P.inStormClearZone(this, worldX); },
  // Old-wood boost for grown trees: 0 before FOREST.from km, rising to FOREST.boost, scaled by
  // how many kinds of tree were planted this flight (all 5 = the full boost).
  oldWood() { return P.oldWood(this); },
  // A forest can only soak up so much CO2 in one flight (more with more kinds); then it is full.
  forestStore() { return P.forestStore(this); },
  // Is there still a clear lane (plane height + margin) through the gap gTop..gBot of a storm
  // column at x..x+w, past the icy air in `issrs` that overlaps the column?
  laneClear(x, w, gTop, gBot, issrs = this.issrs) { return P.laneClear(issrs, x, w, gTop, gBot); },
  // Is any point along the plane's middle line inside the cloud's ellipses? (x, y, w, h: its box)
  // `grow`: each blob's radii x this (1 = the drawn shape). Used for the contrail margin below.
  inCloud(blobs, x, y, w, h, box, grow = 1) { return P.inCloud(blobs, x, y, w, h, box, grow); },
  // The contrail margin (eras, PLANE-DESIGN.md section 3): a hot-exhaust 1950s jet makes contrails only
  // deep inside icy air; efficient jets make them right up to (and a little past) its edge. The drawn
  // patch does not change. Everything about "being in icy air" uses this: contrails, heat, dodges, the autopilot.
  inIssrShape(i, box) { return P.inIssrShape(this, i, box); },
  issrAlpha(i, box, inside) { return P.issrAlpha(this, i, box, inside); },
  // Gap from the plane's box to a patch's box, px (0 = touching or overlapping).
  nearPx(i, box) { return P.nearPx(i, box); },
  dayNightPhase() { return P.dayNightPhase(this); },
  // What a contrail does right now (2026-10-23): the switch between cooling and warming happens HALFWAY
  // through dusk / dawn, with a short neutral stretch in the middle. cool: sunshine side; strength 0..1.
  radiationMode() { return P.radiationMode(this); },
  // World positions of the plane's drawn pixels, turned with the plane's tilt. Once per frame.
  planePixels() { return P.planePixels(this); },   // tests may stub this
  // Storms forgive a nick of up to HAZARDS.stormForgive pixels; no-fly zones forgive nothing.
  hitsStorm(st) { return P.hitsStorm(this, st, () => this.planePixels()); },
  // How many plane pixels touch the storm's (or no-fly zone's) drawn pixels. Stops counting at `enough`.
  // A storm's solid pixels are its drawn cloud pixels INSIDE the column (STORMS.width): fluff puffing
  // out beyond the column never crashes you, and empty sky never does (the user, 2026-10-24).
  stormPixelsHit(st, enough) { return P.stormPixelsHit(this, st, enough, () => this.planePixels()); },
  hitBird(box) { return P.hitBird(this, box, () => this.planePixels()); },

  // ---------- the region below (the user, 2026-10-22: real geography decides it; src/geo.js) ----------
  // The leg from the airport behind to the one ahead; how far along it the plane is, as a fraction.
  regionHere() {
    if (this.school || !this.nextAirport || this.nextAirport.worldX > 1e8) return 'woodland';
    const i = this.airportIndex, len = this.legKm(i), from = this.nextAirport.worldX - len;
    return regionBelow(city(this.path[i]), city(this.path[i + 1]), (this.distancePx - from) / len);
  },

  // Physics random numbers (sim engine, 2026-10-25): everything that changes what can happen in a flight
  // (spawns, gaps, cloud shapes, turbulence, contrail puffs) draws from this.rng, so a seed (save.simSeed,
  // tests and probes only) gives the same sky with or without drawing. Looks keep Math.random.
  // Same formulas as Phaser.Math.Between / FloatBetween.
  rand() { return this.rng(); },
  between(a, b) { return Math.floor(this.rng() * (b - a + 1) + a); },
  floatBetween(a, b) { return this.rng() * (b - a) + a; },
  setState(s) { this.state = s; this.stateTime = 0; },
};
