// The globe on the FLY screen (the user, 2026-10-22 and 2026-10-24): a real map of the land (src/landmask.js, Natural Earth,
// made by tools/art/make_landmask.py), turned and tilted so the WHOLE route ahead is in view and centred, every airport a dot, the
// route in gold, and you can DRAG it round. Drawn per pixel into a small canvas that the page shows crisp (image-rendering:
// pixelated): for each pixel, undo the projection to a latitude and longitude and look the land up in the mask.
import { LAND_W, LAND_H, LAND_RLE, ISLANDS } from './landmask.js';
import { regionAt, along } from './geo.js';
import { CITIES } from './cities.js';

export const SIZE = 128;   // the canvas is SIZE x SIZE pixels (the page scales it, never smooths it)
const LAND = { woodland: [94, 154, 74], mediterranean: [154, 168, 90], desert: [217, 181, 106], monsoon: [63, 138, 82], eastasia: [111, 163, 106],
  boreal: [47, 110, 78], plains: [167, 184, 96], tundra: [157, 176, 160], savanna: [194, 163, 78], rainforest: [45, 122, 58], islandforest: [58, 132, 92], polynesia: [64, 168, 104], bush: [176, 150, 84], steppe: [184, 172, 118], ice: [238, 244, 248] };
const FALLBACK = [122, 154, 106], SEA = [43, 95, 158], SHALLOW = [74, 130, 190], INK = [27, 27, 47];
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;

// ---------- the land ----------
let mask = null, islands = null, regions = null;
function getMask() {
  if (mask) return mask;
  mask = new Uint8Array(LAND_W * LAND_H);
  LAND_RLE.split('|').forEach((row, j) => { let i = 0, v = 0; for (const t of row.split(',')) { const n = parseInt(t, 36); if (v) mask.fill(1, j * LAND_W + i, j * LAND_W + i + n); i += n; v ^= 1; } });
  return mask;
}
export const isLand = (lat, lon) => getMask()[Math.min(LAND_H - 1, Math.max(0, Math.floor((90 - lat) / 180 * LAND_H))) * LAND_W + (((Math.floor((lon + 180) / 360 * LAND_W) % LAND_W) + LAND_W) % LAND_W)] === 1;
// The colour of the ground: the declared regions (src/geo.js) at one-degree cells, blurred over about 6 degrees so the
// ground fades from one region to the next instead of showing the boxes' straight edges.
function region(lat, lon) {
  if (!regions) {
    const W = 360, H = 180, names = Object.keys(LAND), a = new Float32Array(W * H * 3);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const r = regionAt(89.5 - j, -179.5 + i), c = LAND[r] || FALLBACK; a.set(c, (j * W + i) * 3); }
    const blur = (src, along) => { const out = new Float32Array(src.length), n = along === 'x' ? W : H, m = along === 'x' ? H : W, K = 3;
      for (let j = 0; j < (along === 'x' ? H : W); j++) for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) { let t = 0, w = 0;
        for (let d = -K; d <= K; d++) { const ii = along === 'x' ? ((i + d + n) % n) : Math.min(n - 1, Math.max(0, i + d)); t += src[(along === 'x' ? j * W + ii : ii * W + j) * 3 + ch]; w++; }
        out[(along === 'x' ? j * W + i : i * W + j) * 3 + ch] = t / w; }
      return out; };
    regions = blur(blur(a, 'x'), 'y');
  }
  const k = (Math.min(179, Math.max(0, Math.floor(90 - lat))) * 360 + (((Math.floor(lon + 180) % 360) + 360) % 360)) * 3;
  return [regions[k], regions[k + 1], regions[k + 2]];
}

// ---------- the view: a camera frame on the sphere ----------
// { c, r, u }: unit vectors; c = the point in the middle of the picture (towards you), r = right, u = up.
const vec = (lat, lon) => { const p = rad(lat), l = rad(lon); return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const n = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const mix = (a, b, s, t) => [a[0] * s + b[0] * t, a[1] * s + b[1] * t, a[2] * s + b[2] * t];

// A frame looking at (lat, lon) with north up, then turned by `roll` radians.
export function frameAt(lat, lon, roll = 0) {
  const c = vec(lat, lon), l = rad(lon), p = rad(lat);
  const east = [-Math.sin(l), Math.cos(l), 0], north = [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)];
  return { c, r: mix(east, north, Math.cos(roll), Math.sin(roll)), u: mix(east, north, -Math.sin(roll), Math.cos(roll)) };
}
// The frame that shows the route: centred on the middle of the first cities that fit (all within `reach` degrees of
// the middle, always at least the next city), north up.
export function frameRoute(path, reach = 68) {
  const pts = path.map(k => vec(k.lat, k.lon));
  let n = Math.min(pts.length, 2), centre = norm(mix(pts[0], pts[1] || pts[0], 1, 1));
  for (let k = 3; k <= pts.length; k++) {
    const m = norm(pts.slice(0, k).reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]));
    if (pts.slice(0, k).every(p => deg(Math.acos(Math.max(-1, Math.min(1, dot(p, m))))) <= reach)) { n = k; centre = m; } else break;
  }
  // North stays up (turning the picture to lay the route flat put half the world upside down: measured on TOKYO, whose route
  // runs east to west). The tilt and the turn come from centring on the route.
  // A short route (TOKYO to SEOUL) would bunch up in the middle: zoom in until it fills about 0.8 of the picture, up to 1.35x (more would crop the globe into a square map: the curved edge must still show).
  const base = frameAt(deg(Math.asin(centre[2])), deg(Math.atan2(centre[1], centre[0])));
  const spread = Math.max(0.05, ...pts.slice(0, n).map(p => Math.max(Math.abs(dot(p, base.r)), Math.abs(dot(p, base.u)))));
  return { ...base, zoom: Math.max(1, Math.min(1.35, 0.8 / spread)), n };
}
// Turn the frame by a drag of (dx, dy) pixels on a globe of radius R pixels (the surface follows the finger).
export function turn(f, dx, dy, R) {
  const a = dx / R, b = dy / R, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  let c = mix(f.c, f.r, ca, -sa), r = mix(f.r, f.c, ca, sa);
  const c2 = mix(c, f.u, cb, sb), u = mix(f.u, c, cb, -sb);
  return { c: norm(c2), r: norm(r), u: norm(u), zoom: f.zoom || 1 };
}
// Where a point is in the picture: [x, y] in -1..1 (y down; beyond that when zoomed in), or null on the far side.
export function project(f, lat, lon) {
  const v = vec(lat, lon); if (dot(v, f.c) < 0) return null;
  const z = f.zoom || 1;
  return [dot(v, f.r) * z, -dot(v, f.u) * z];
}

// ---------- drawing ----------
// Draw the globe seen through frame `f`. `path` = city objects ahead (here first). `quality` 1 = one sample per pixel (while
// dragging), 2 = five (still): the edges of small islands and coasts come out cleaner.
export function paint(canvas, f, path, quality = 2, ways = [], lit = null) {
  const g = canvas.getContext('2d'), S = canvas.width, R = S / 2 - 1, c0 = S / 2, Z = f.zoom || 1;
  const img = g.createImageData(S, S), px = img.data, landAt = new Uint8Array(S * S), rgb = new Uint8Array(S * S * 3), inDisc = new Uint8Array(S * S);
  const off = quality > 1 ? [[0, 0], [0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]] : [[0, 0]];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const nx = (x + 0.5 - c0) / (R * Z), ny = (y + 0.5 - c0) / (R * Z), k = y * S + x;
    if (nx * nx + ny * ny > 1) continue;
    inDisc[k] = 1;
    let votes = 0, lat0 = 0, lon0 = 0;
    for (let s = 0; s < off.length; s++) {
      const ax = nx + off[s][0] / (R * Z), ay = ny + off[s][1] / (R * Z), z2 = 1 - ax * ax - ay * ay, z = z2 > 0 ? Math.sqrt(z2) : 0;
      const v = [f.r[0] * ax - f.u[0] * ay + f.c[0] * z, f.r[1] * ax - f.u[1] * ay + f.c[1] * z, f.r[2] * ax - f.u[2] * ay + f.c[2] * z];
      const lat = deg(Math.asin(Math.max(-1, Math.min(1, v[2])))), lon = deg(Math.atan2(v[1], v[0]));
      if (s === 0) { lat0 = lat; lon0 = lon; }
      if (isLand(lat, lon)) votes++;
    }
    landAt[k] = votes * 2 > off.length ? 1 : 0;
    const z = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lit = 0.62 + 0.38 * z * (0.8 + 0.2 * (-nx - ny) / 1.4);   // a soft round shading
    const base = landAt[k] ? region(lat0, lon0) : SEA;
    for (let ch = 0; ch < 3; ch++) rgb[k * 3 + ch] = Math.max(0, Math.min(255, base[ch] * lit));
  }
  // Small islands (too small for a sample) as single pixels, then coast lines: land touching sea gets a darker edge,
  // sea touching land a lighter shelf, both one pixel wide.
  for (const [lat, lon] of getIslands()) { const q = project(f, lat, lon); if (q) { const x = Math.round(c0 + q[0] * R - 0.5), y = Math.round(c0 + q[1] * R - 0.5); if (x >= 0 && y >= 0 && x < S && y < S && inDisc[y * S + x]) landAt[y * S + x] = landAt[y * S + x] || 2; } }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x; if (!inDisc[k]) continue;
    let [r, gg, b] = [rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]];
    if (landAt[k] === 2) { r = 86; gg = 128; b = 84; }   // a speck of island: its own green, no coast line round it
    const edge = d => { const xx = x + d[0], yy = y + d[1]; return xx >= 0 && yy >= 0 && xx < S && yy < S && inDisc[yy * S + xx] ? landAt[yy * S + xx] === 1 : null; };
    const nb = [edge([1, 0]), edge([-1, 0]), edge([0, 1]), edge([0, -1])];
    if (landAt[k] === 1 && nb.some(v => v === false)) { r *= 0.62; gg *= 0.66; b *= 0.62; }
    else if (!landAt[k] && nb.some(v => v === true)) { r = r * 0.55 + SHALLOW[0] * 0.45; gg = gg * 0.55 + SHALLOW[1] * 0.45; b = b * 0.55 + SHALLOW[2] * 0.45; }
    px[k * 4] = r; px[k * 4 + 1] = gg; px[k * 4 + 2] = b; px[k * 4 + 3] = 255;
  }
  // The outline of the globe: one dark ring.
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = y * S + x; if (!inDisc[k]) continue;
    const rim = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= S || yy >= S ? Z <= 1 : !inDisc[yy * S + xx]; });   // (zoomed in, the picture's edge is not the globe's)
    if (rim) { px[k * 4] = INK[0]; px[k * 4 + 1] = INK[1]; px[k * 4 + 2] = INK[2]; }
  }
  g.putImageData(img, 0, 0);
  const to = (lat, lon) => { const q = project(f, lat, lon); return q && [Math.round(c0 + q[0] * R), Math.round(c0 + q[1] * R)]; };
  // Every airport a dot.
  // Every city a white dot, on LAND: a port that falls on a sea pixel at this size is moved to the nearest land pixel (up to 3 away).
  const dots = [];
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const k of CITIES) {
    const q = to(k.lat, k.lon); if (!q || q[0] < 0 || q[1] < 0 || q[0] >= S || q[1] >= S) continue;
    let [dx, dy] = q, on = !!landAt[dy * S + dx], best = on ? 0 : 1e9;
    if (!on) for (let oy = -3; oy <= 3; oy++) for (let ox = -3; ox <= 3; ox++) {
      const xx = q[0] + ox, yy = q[1] + oy, d = ox * ox + oy * oy;
      if (xx >= 0 && yy >= 0 && xx < S && yy < S && landAt[yy * S + xx] && d < best) { best = d; dx = xx; dy = yy; on = true; }
    }
    // Season 2: an airport outside your unlocked areas (`lit`: their network, src/route.js linksFor) is a dim dot.
    g.fillStyle = !lit || k.name in lit ? 'rgba(255,255,255,0.9)' : 'rgba(40,40,60,0.75)';
    g.fillRect(dx, dy, 1, 1); dots.push({ name: k.name, x: dx, y: dy, onLand: on });
  }
  // The way ahead: gold, drawn in whole pixels (no smoothing), a square at each airport.
  g.fillStyle = '#ffd34d';
  let prev = null;
  for (let i = 0; i + 1 < path.length; i++) for (let t = 0; t <= 1.0001; t += 0.02) {
    const p = along(path[i], path[i + 1], t), q = to(p.lat, p.lon);
    if (!q) { prev = null; continue; }
    if (prev) for (let s = 0; s <= 4; s++) g.fillRect(Math.round(prev[0] + (q[0] - prev[0]) * s / 4) - 1, Math.round(prev[1] + (q[1] - prev[1]) * s / 4) - 1, 2, 2);
    prev = q;
  }
  for (const k of path.slice(1)) { const q = to(k.lat, k.lon); if (q) { g.fillStyle = '#1b1b2f'; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); g.fillStyle = '#ffd34d'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); } }
  // The other ways you could choose: their first airport as a light square (tap it to go that way).
  for (const w of ways) { if (path[1] && w.name === path[1].name) continue; const q = to(w.lat, w.lon); if (q) { g.fillStyle = '#1b1b2f'; g.fillRect(q[0] - 3, q[1] - 3, 6, 6); g.fillStyle = '#eaf6ff'; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); } }
  const h = path[0] && to(path[0].lat, path[0].lon);
  if (h) { g.fillStyle = '#1b1b2f'; g.fillRect(h[0] - 4, h[1] - 4, 8, 8); g.fillStyle = '#ff5a4d'; g.fillRect(h[0] - 3, h[1] - 3, 6, 6); }   // you are here
  return { dots };
}
function getIslands() { return islands || (islands = ISLANDS); }

// Make the globe live: drag to turn it (the surface follows the finger, then coasts a little), tap one of the first-step
// airports (`ways`: city objects) to choose that way. A touch that moved less than TAP_PX and ended within TAP_MS is a TAP,
// never a drag; anything that moved further is a drag and never picks. The picture is redrawn only when it changes: at one
// sample a pixel while it moves, five once it settles. Returns { frame(), nudge(dx), destroy() }.
export const TAP_PX = 6, TAP_MS = 400;
export function attachGlobe(canvas, path, { ways = [], onPick = null, lit = null } = {}) {
  let f = frameRoute(path.length ? path : [CITIES[0]]);
  canvas.width = canvas.height = SIZE;
  canvas.style.touchAction = 'none';   // this canvas only: the page still scrolls everywhere else
  canvas.style.cursor = 'grab';
  let down = null, wantQuality = 1, coast = null, raf = 0, alive = true;
  // One redraw a frame at most, however many events came in; the best quality asked for since the last one.
  const redraw = q => { wantQuality = Math.max(wantQuality, q); if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (!alive) return; paint(canvas, f, path, wantQuality, ways, lit); wantQuality = 1; }); };
  const scale = () => canvas.width / (canvas.getBoundingClientRect().width || canvas.width);   // canvas pixels per screen pixel
  const R = () => canvas.width / 2 - 1;
  const hit = (ev) => {   // the way dot under the finger, if any (within 8 canvas pixels)
    const r = canvas.getBoundingClientRect(), k = scale(), x = (ev.clientX - r.left) * k, y = (ev.clientY - r.top) * k;
    let best = null, bd = 8;
    for (const w of ways) { const q = project(f, w.lat, w.lon); if (!q) continue; const d = Math.hypot(canvas.width / 2 + q[0] * R() - x, canvas.height / 2 + q[1] * R() - y); if (d < bd) { bd = d; best = w; } }
    return best;
  };
  const onDown = ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* no such live pointer (a synthetic event): the drag works without capture */ }
    coast = null;
    down = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, t0: performance.now(), moved: false, vx: 0, vy: 0, t: performance.now() };
  };
  const onMove = ev => {
    if (!down || ev.pointerId !== down.id) return;
    if (!down.moved && Math.hypot(ev.clientX - down.x0, ev.clientY - down.y0) < TAP_PX) return;   // still a tap so far
    if (!down.moved) { down.moved = true; down.x = down.x0; down.y = down.y0; canvas.style.cursor = 'grabbing'; }
    const k = scale(), dx = (ev.clientX - down.x) * k, dy = (ev.clientY - down.y) * k, now = performance.now(), dt = Math.max(1, now - down.t);
    f = turn(f, dx, dy, R()); down.vx = dx / dt * 16; down.vy = dy / dt * 16; down.x = ev.clientX; down.y = ev.clientY; down.t = now;
    redraw(1);
  };
  const onUp = ev => {
    if (!down || ev.pointerId !== down.id) return;
    const d = down; down = null; canvas.style.cursor = 'grab';
    if (!d.moved && performance.now() - d.t0 <= TAP_MS) { const w = hit(ev); if (w && onPick) onPick(w.name); return; }   // a tap
    if (!d.moved) return;   // a long press that did not move: nothing
    coast = { vx: d.vx, vy: d.vy };   // a little coast after the finger lifts
    const step = () => { if (!alive || !coast || down) return; coast.vx *= 0.9; coast.vy *= 0.9;
      if (Math.hypot(coast.vx, coast.vy) < 0.15) { coast = null; redraw(2); return; }
      f = turn(f, coast.vx, coast.vy, R()); redraw(1); requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  const onCancel = ev => { if (down && ev.pointerId === down.id) { down = null; canvas.style.cursor = 'grab'; redraw(2); } };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);
  paint(canvas, f, path, 2, ways, lit);
  // nudge(dx): turn by dx canvas pixels, as a drag would (the hub's spin buttons, S2 of PROPOSAL-HOME-MISSIONS.md).
  return { frame: () => f, nudge(dx) { coast = null; f = turn(f, dx, 0, R()); redraw(2); }, destroy() { alive = false; if (raf) cancelAnimationFrame(raf); for (const [n, h] of [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel]]) canvas.removeEventListener(n, h); } };
}

// The old entry point (src/ui.js): draw the globe for `path`, framed on the route; pass { ways, onPick } to make it live.
export function drawGlobe(canvas, here, path, opts = {}) {
  if (canvas.__globe) canvas.__globe.destroy();
  return (canvas.__globe = attachGlobe(canvas, path.length ? path : [here], opts));
}
