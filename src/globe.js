// A little globe for the FLY screen (the user, 2026-10-22: three direction buttons and a globe that
// shows where they go). Drawn in pixels on a canvas: the Earth turned so your city is in the middle,
// land coloured by region (the same declared map the flight uses, src/geo.js), every airport a dot,
// and the chosen way ahead as a gold line through the next airports.
import { regionAt, along } from './geo.js';
import { CITIES } from './cities.js';

const LAND = { woodland: '#5e9a4a', mediterranean: '#9aa85a', desert: '#d9b56a', monsoon: '#3f8a52', eastasia: '#6fa36a',
  boreal: '#2f6e4e', plains: '#a7b860', tundra: '#9db0a0', savanna: '#c2a34e', rainforest: '#2d7a3a', ice: '#eef4f8' };
const rad = d => d * Math.PI / 180;

// Orthographic projection centred on (lat0, lon0): [x, y] in -1..1, or null on the far side.
function project(lat, lon, lat0, lon0) {
  const p = rad(lat), l = rad(lon - lon0), p0 = rad(lat0);
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
  if (cosc < 0) return null;
  return [Math.cos(p) * Math.sin(l), -(Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l))];
}

// The land as dots, worked out once (every 3 degrees; the boxes are coarse anyway).
let landDots = null;
function land() {
  if (landDots) return landDots;
  landDots = [];
  for (let lat = -88.5; lat < 90; lat += 3) for (let lon = -178.5; lon < 180; lon += 3) {
    const r = regionAt(lat, lon); if (r !== 'ocean') landDots.push([lat, lon, LAND[r] || '#7a9a6a']);
  }
  return landDots;
}

// Draw: `here` = { lat, lon } of your city; `path` = city objects ahead (here first).
export function drawGlobe(canvas, here, path) {
  const g = canvas.getContext('2d'), S = canvas.width, R = S / 2 - 2, c = S / 2;
  g.clearRect(0, 0, S, S);
  g.fillStyle = '#2b5f9e'; g.beginPath(); g.arc(c, c, R, 0, 7); g.fill();
  const at = (lat, lon) => { const q = project(lat, lon, here.lat, here.lon); return q && [Math.round(c + q[0] * R), Math.round(c + q[1] * R)]; };
  const px = Math.max(2, Math.round(R / 22));
  for (const [lat, lon, col] of land()) { const q = at(lat, lon); if (q) { g.fillStyle = col; g.fillRect(q[0] - px / 2, q[1] - px / 2, px, px); } }
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const k of CITIES) { const q = at(k.lat, k.lon); if (q) g.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
  // The way ahead: great-circle hops, gold, with a dot at each airport.
  g.strokeStyle = '#ffd34d'; g.lineWidth = Math.max(2, R / 40); g.beginPath();
  let pen = false;
  for (let i = 0; i + 1 < path.length; i++) for (let f = 0; f <= 1.0001; f += 0.05) {
    const p = along(path[i], path[i + 1], f), q = at(p.lat, p.lon);
    if (!q) { pen = false; continue; }
    if (pen) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); pen = true;
  }
  g.stroke();
  g.fillStyle = '#ffd34d';
  for (const k of path.slice(1)) { const q = at(k.lat, k.lon); if (q) g.fillRect(q[0] - 2, q[1] - 2, 4, 4); }
  g.fillStyle = '#ff5a4d'; g.fillRect(c - 3, c - 3, 6, 6);   // you are here
  g.strokeStyle = '#1b1b2f'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, R, 0, 7); g.stroke();
}
