// Water in the wild areas (the user, 2026-11-13: "water-based animals are just flopping around on the land"; plan:
// research/BACKLOG.md W1 to W3). Each land DECLARES its water here (sea round an island, a coast, rivers, lakes), and each
// water animal DECLARES where it lives (HOMES): nothing is guessed from a name or from the picture. The NATURE field
// (src/wild.js) draws the water from MASK below, sends every animal only to points in its own zone, along a straight
// line that never leaves it, and puts each project's feature on land or in the water as PLACE says.
// Pure (no DOM): tests/water.cjs runs it in Node.
export const FW = 288, FH = 170, HORIZON = 60, GROUND = [HORIZON + 8, FH - 2];

// Shapes, in field pixels (the ground is y >= HORIZON). Kinds:
//   island {cx, cy, rx, ry}: land inside the ellipse, sea everywhere else on the ground
//   coast {side: 'bottom'|'left'|'right', at, amp, period}: sea beyond a wavy line `at` px from that side's edge
//   river {pts, w}: a band w px wide along the polyline
//   lake {cx, cy, rx, ry}: water inside the ellipse
// `look`: 'sea' (blue, beaches, a reef line round an island), 'fresh' (blue-green, muddy banks), 'brown' (Amazon water).
export const WATER = {
  polynesia: { look: 'sea', reef: true, shapes: [{ kind: 'island', cx: 144, cy: 116, rx: 120, ry: 46 }] },
  islandforest: { look: 'sea', shapes: [{ kind: 'coast', side: 'bottom', at: 20, amp: 5, period: 110 }, { kind: 'river', pts: [[58, 60], [70, 96], [50, 124], [62, 152]], w: 5 }] },
  steppe: { look: 'sea', shapes: [{ kind: 'coast', side: 'right', at: 62, amp: 8, period: 70 }] },
  tundra: { look: 'sea', shapes: [{ kind: 'coast', side: 'left', at: 46, amp: 7, period: 60 }, { kind: 'river', pts: [[206, 60], [190, 98], [210, 132], [196, 170]], w: 6 }] },
  mediterranean: { look: 'sea', shapes: [{ kind: 'coast', side: 'bottom', at: 18, amp: 4, period: 90 }, { kind: 'lake', cx: 236, cy: 92, rx: 30, ry: 9 }] },
  plains: { look: 'sea', shapes: [{ kind: 'coast', side: 'right', at: 40, amp: 6, period: 50 }, { kind: 'lake', cx: 64, cy: 106, rx: 22, ry: 7 }] },
  rainforest: { look: 'brown', shapes: [{ kind: 'river', pts: [[0, 118], [80, 108], [170, 126], [288, 110]], w: 18 }] },
  monsoon: { look: 'fresh', shapes: [{ kind: 'river', pts: [[0, 100], [100, 112], [190, 98], [288, 110]], w: 12 }] },
  boreal: { look: 'fresh', shapes: [{ kind: 'river', pts: [[150, 60], [140, 100], [170, 132], [152, 170]], w: 9 }, { kind: 'lake', cx: 60, cy: 150, rx: 30, ry: 9 }] },
  bush: { look: 'fresh', shapes: [{ kind: 'river', pts: [[0, 140], [90, 130], [180, 146], [288, 134]], w: 10 }] },
  savanna: { look: 'fresh', shapes: [{ kind: 'lake', cx: 150, cy: 122, rx: 40, ry: 12 }] },
  eastasia: { look: 'fresh', shapes: [{ kind: 'lake', cx: 80, cy: 128, rx: 44, ry: 14 }, { kind: 'lake', cx: 222, cy: 152, rx: 24, ry: 8 }] },
  woodland: { look: 'fresh', shapes: [{ kind: 'river', pts: [[246, 60], [238, 90], [252, 116], [232, 140], [226, 170]], w: 6 }] },
  // desert: no water
};

// Where each water animal lives (declared by hand, 2026-11-13; every other animal is 'land'):
//   water: always in the water (whales, dolphins, fish, sea and river turtles, oysters)
//   shore: swims, and comes out onto land near the water (seals, otters, penguins, hippos, platypus, beavers)
//   edge:  walks in the shallows and along the bank (herons, cranes, storks, flamingos, ducks that stand)
// Only animals that walk use this: a bird that flies keeps the sky.
export const HOMES = {
  humpback: 'water', rightwhale: 'water', hectors: 'water', maui: 'water', riverdolphin: 'water', greenturtle: 'water', loggerhead: 'water',
  riverturtle: 'water', pirarucu: 'water', murraycod: 'water', inanga: 'water', icefish: 'water', cohosalmon: 'water', atlanticsalmon: 'water', oyster: 'water',
  sealion: 'shore', leopardseal: 'shore', furseal: 'shore', elephantseal: 'shore', harbourseal: 'shore', huillin: 'shore', giantotter: 'shore', smoothotter: 'shore',
  otter: 'shore', watervole: 'shore', beaver: 'shore', platypus: 'shore', hippo: 'shore', capybara: 'shore', korora: 'shore', hoiho: 'shore', kingpenguin: 'shore',
  magellanicpenguin: 'shore', gharial: 'shore', frog: 'shore', fishingcat: 'shore',
  reefheron: 'edge', heron: 'edge', flamingo: 'edge', crownedcrane: 'edge', sandhill: 'edge', whoopingcrane: 'edge', crane: 'edge', orientalstork: 'edge', stork: 'edge',
  mandarinduck: 'edge', puffin: 'edge',
};
export const FISH = new Set(['pirarucu', 'murraycod', 'inanga', 'icefish', 'cohosalmon', 'atlanticsalmon']);   // mostly under, a leap now and then
export const STILL = new Set(['oyster']);                                                                     // stays where it is
export const homeOf = id => HOMES[id] || 'land';

// Where each project's feature stands (declared; every other project's feature stands on land). 'water': the art has its own
// water line (a boat, a whale's tail, kelp, a reef); 'shore': on land by the water (a beach nest, a seal rock).
export const PLACE = {
  coralplant: 'water', turtleclinic: 'shore',                                                            // polynesia
  whalesea: 'water', kelpsea: 'water', penguinsea: 'shore', fjordwatch: 'water',                          // steppe
  nzdolphins: 'water', hoihoplant: 'shore', whitebait: 'shore',                                           // islandforest
  sealcount: 'shore', rivers: 'shore', eiderguard: 'shore',                                               // tundra
  turtlebeach: 'shore', flamingoisland: 'water',                                                          // mediterranean
  oysters: 'water',                                                                                       // plains
  pond: 'land', voles: 'shore', beavers: 'shore',                                                         // woodland: its own SLOTS, kept
};

// ---------- the mask ----------
const segDist = (x, y, [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - ax - t * dx, y - ay - t * dy); };
// A river's points joined by a smooth curve (Catmull-Rom, 12 steps a span), so bends are round, not corners.
const smooth = pts => { const P = [pts[0], ...pts, pts[pts.length - 1]], out = [];
  for (let i = 1; i < P.length - 2; i++) for (let k = 0; k < 12; k++) { const t = k / 12, t2 = t * t, t3 = t2 * t;
    out.push([0, 1].map(j => 0.5 * (2 * P[i][j] + (-P[i - 1][j] + P[i + 1][j]) * t + (2 * P[i - 1][j] - 5 * P[i][j] + 4 * P[i + 1][j] - P[i + 2][j]) * t2 + (-P[i - 1][j] + 3 * P[i][j] - 3 * P[i + 1][j] + P[i + 2][j]) * t3))); }
  out.push(pts[pts.length - 1]); return out; };
const curves = new Map();
function inShape(s, x, y) {
  if (y < HORIZON) return false;
  if (s.kind === 'island') return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 > 1;
  if (s.kind === 'lake') return ((x - s.cx) / s.rx) ** 2 + ((y - s.cy) / s.ry) ** 2 <= 1;
  if (s.kind === 'river') { if (!curves.has(s)) curves.set(s, smooth(s.pts)); const c = curves.get(s); for (let i = 1; i < c.length; i++) if (segDist(x, y, c[i - 1], c[i]) <= s.w / 2) return true; return false; }
  if (s.kind === 'coast') {
    const wave = a => s.amp * Math.sin(a * 2 * Math.PI / s.period);
    if (s.side === 'bottom') return y > FH - s.at + wave(x);
    if (s.side === 'left') return x < s.at + wave(y);
    if (s.side === 'right') return x > FW - s.at + wave(y);
  }
  return false;
}
export const hasWater = region => !!WATER[region];

// MASK[region]: { water: Uint8Array (1 = water), dist: Uint8Array (pixels to the nearest pixel of the OTHER kind, capped
// at 40) }, one entry per field pixel (index y * FW + x). Built once per land.
const masks = {};
export function mask(region) {
  if (masks[region]) return masks[region];
  const W = WATER[region], n = FW * FH, water = new Uint8Array(n), dist = new Uint8Array(n).fill(40);
  if (W) for (let y = HORIZON; y < FH; y++) for (let x = 0; x < FW; x++) if (W.shapes.some(s => inShape(s, x + 0.5, y + 0.5))) water[y * FW + x] = 1;
  if (W) {   // two-pass chamfer distance to the nearest pixel of the other kind (ground only; the sky counts as land)
    for (let y = HORIZON; y < FH; y++) for (let x = 0; x < FW; x++) {
      const i = y * FW + x, me = water[i];
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && X < FW && Y >= HORIZON && Y < FH && water[Y * FW + X] !== me; })) dist[i] = 1;
    }
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < n; k++) {
      const i = pass ? n - 1 - k : k, x = i % FW, y = (i - x) / FW; if (y < HORIZON) continue;
      for (const [dx, dy] of pass ? [[1, 0], [0, 1], [1, 1], [-1, 1]] : [[-1, 0], [0, -1], [-1, -1], [1, -1]]) {
        const X = x + dx, Y = y + dy; if (X < 0 || X >= FW || Y < HORIZON || Y >= FH) continue;
        const j = Y * FW + X; if (water[j] === water[i] && dist[j] + 1 < dist[i]) dist[i] = dist[j] + 1;
      }
    }
  }
  return (masks[region] = { water, dist });
}
export const isWater = (region, x, y) => { const X = Math.floor(x), Y = Math.floor(y); if (X < 0 || X >= FW || Y < 0 || Y >= FH) return false; return mask(region).water[Y * FW + X] === 1; };

// May an animal with this home stand at (x, y)? ('land' animals keep 2 px off the water; 'water' ones 3 px off the land.)
export function allowed(region, home, x, y) {
  if (y < GROUND[0] || y > GROUND[1] || x < 4 || x > FW - 4) return false;
  const X = Math.floor(x), Y = Math.floor(y), m = mask(region), i = Y * FW + X, w = m.water[i] === 1, d = m.dist[i];
  if (!hasWater(region)) return home === 'land' || home === 'shore' || home === 'edge';   // a land with no water: nothing to keep off (no water animal lives there)
  if (home === 'water') return w && d >= 3;
  if (home === 'shore') return w ? d >= 2 : d <= 18;
  if (home === 'edge') return w ? d <= 4 : d <= 8;
  return !w && d >= 2;
}
// A straight walk stays in the zone if every pixel it can touch is allowed: samples 1 px apart, each checked with the
// corners of a 1.4 px box round it, so any point between two samples (at most 0.5 px from one) lies in a checked pixel.
const boxOk = (region, home, x, y) => allowed(region, home, x - 0.7, y - 0.7) && allowed(region, home, x + 0.7, y - 0.7) && allowed(region, home, x - 0.7, y + 0.7) && allowed(region, home, x + 0.7, y + 0.7);
export function clearPath(region, home, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; if (!boxOk(region, home, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
  return true;
}
// Every allowed spot for a home in a land, on a 2 px grid (cached).
const spotCache = {};
export function zoneSpots(region, home) {
  const k = `${region}/${home}`; if (spotCache[k]) return spotCache[k];
  const out = []; for (let y = GROUND[0]; y <= GROUND[1]; y += 2) for (let x = 6; x <= FW - 6; x += 2) if (boxOk(region, home, x + 0.5, y + 0.5)) out.push([x + 0.5, y + 0.5]);
  return (spotCache[k] = out);
}
// A start spot, and the next spot to walk to (reachable in a straight line inside the zone; null = stay and pause).
export function startIn(region, home, rnd = Math.random) { const s = zoneSpots(region, home); return s.length ? s[Math.floor(rnd() * s.length)] : null; }
export function nextIn(region, home, x, y, rnd = Math.random) {
  const s = zoneSpots(region, home); if (!s.length) return null;
  for (let tries = 0; tries < 24; tries++) { const p = s[Math.floor(rnd() * s.length)]; if (clearPath(region, home, x, y, p[0], p[1])) return p; }
  return null;
}
// One frame of walking, straight at the target (the old walk bent towards the target, so its path left a straight line):
// slower when heading up or down the field (depth), as before.
export function walk(c, dt) {
  const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
  if (d < 1) return false;
  const v = Math.min(d, c.speed * dt * (1 - 0.4 * Math.abs(dy) / d));
  c.x += dx / d * v; c.y += dy / d * v;
  return true;
}

// Feature spots: the n-th project's spot (REGION_SPOTS order, src/wild.js), moved when it does not suit its PLACE to the nearest
// spot that does and is clear of the spots already given out (64 x 32 footprints, bottom-left corner). Same land, same spots.
const FEAT_W = 64, FEAT_H = 32;
const footOk = (region, place, x, y) => {
  if (y > FH || y - 8 < GROUND[0] || x < 0 || x + 40 > FW) return false;
  const pts = [[x + 8, y - 2], [x + 24, y - 2], [x + 40, y - 2], [x + 24, y - 8]];   // the base of the art (most art is 30 to 60 px wide)
  if (!hasWater(region)) return place !== 'water';
  if (place === 'water') return pts.every(([a, b]) => isWater(region, a, b));
  if (place === 'shore') return pts.every(([a, b]) => !isWater(region, a, b)) && mask(region).dist[(y - 2) * FW + x + 24] <= 14;
  return pts.every(([a, b]) => !isWater(region, a, b) && mask(region).dist[Math.floor(b) * FW + a] >= 3);
};
const overlap = ([ax, ay], [bx, by]) => ax < bx + FEAT_W - 8 && bx < ax + FEAT_W - 8 && ay - FEAT_H + 6 < by && by - FEAT_H + 6 < ay;
export function featureSpots(region, projectIds, base) {
  const out = [];
  projectIds.forEach((id, i) => {
    const place = PLACE[id] || 'land', want = base[i % base.length];
    if (want && footOk(region, place, ...want) && !out.some(q => q && overlap(q, want))) { out.push(want); return; }
    let best = null, bd = 1e9;
    for (let y = GROUND[0] + 14; y <= FH; y += 2) for (let x = 0; x <= FW - 40; x += 2) {
      if (!footOk(region, place, x, y) || out.some(q => q && overlap(q, [x, y]))) continue;
      const d = want ? Math.hypot(x - want[0], y - want[1]) : 0; if (d < bd) { bd = d; best = [x, y]; }
    }
    if (!best) for (let y = GROUND[0] + 14; y <= FH; y += 2) for (let x = 0; x <= FW - 40; x += 2) {   // crowded: allow overlap rather than the wrong ground
      if (!footOk(region, place, x, y)) continue; const d = want ? Math.hypot(x - want[0], y - want[1]) : 0; if (d < bd) { bd = d; best = [x, y]; }
    }
    out.push(best || want);
  });
  return out;
}
// A tree's base must stand on land, 3 px from the water.
export const treeOk = (region, x, y) => !hasWater(region) || (!isWater(region, x, y - 1) && mask(region).dist[Math.floor(y - 1) * FW + Math.floor(x)] >= 3);

// ---------- drawing (browser only: a 2D context's ImageData) ----------
const LOOK = {
  sea: { deep: [47, 124, 190], shallow: [92, 176, 214], foam: [232, 246, 255], bank: [233, 214, 152], reef: [108, 200, 214], glint: [170, 220, 245] },
  fresh: { deep: [58, 128, 168], shallow: [96, 164, 190], foam: [206, 232, 240], bank: [128, 106, 70], glint: [168, 212, 228] },
  brown: { deep: [52, 98, 100], shallow: [84, 132, 124], foam: [84, 132, 124], bank: [104, 84, 52], glint: [180, 226, 222] },   // a dark, tea-coloured river (a brown one read as a road, 2026-11-13)
};
const hash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) % 1000; };
// Two frames of the water layer (the glints swap places), transparent where there is no water or bank.
export function paintWater(region, frame, img) {
  const W = WATER[region]; if (!W) return img;
  const L = LOOK[W.look], m = mask(region), d = img.data;
  for (let y = HORIZON; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x, o = i * 4, w = m.water[i], dist = m.dist[i];
    let c = null;
    if (w) {
      c = dist <= 1 ? L.foam : dist <= 4 ? L.shallow : L.deep;
      if (W.reef && dist >= 9 && dist <= 11 && hash(x, y) < 450) c = L.reef;
      if (dist > 2 && hash((x >> 2) + frame * 7, y) < 40 && y % 3 === frame % 3) c = L.glint;   // short sideways streaks
      if (y < HORIZON + 3 && dist > 1) c = L.shallow;   // a softer line where the water meets the backdrop
    } else if (dist <= 2 && y >= HORIZON) c = L.bank;
    if (c) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  }
  return img;
}
