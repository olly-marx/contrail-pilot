// The loading screen (2026-11-02; user decision: a short screen at the start that gets every picture ready, with a contrail being drawn).
// A little plane flies across a pixel sky and draws a white contrail as REAL files arrive (files loaded / files to load, never a timer).
// Two steps count: the game's own art (Phaser: GameScene.preload) and tier 1 of src/preload.js (the pictures this save's menus show).
// When both are done and the scene is built the screen goes: it stops catching taps at once (pointer-events) and is removed after a short fade.
// Tier 2 (every other land's menu art) is fetched afterwards, one picture at a time, only when the game is idle (never while flying).
// 0.79.0 (Oliver, 2026-11-24: 'the loading screen ... needs some proper pixel lab animation'): the canvas is 192 x 108 game pixels, scaled up with image-rendering: pixelated.
// Its art is PixelLab's (assets/loader/: an 8-frame night-to-dawn sky over a runway, stars twinkling and lights blinking; a 4-frame airliner, bobbing, its light blinking),
// two small sheets fetched first; until they arrive (and if they never do) the old code drawing stands in: flat sky bands and a 12 x 6 pixel plane.
import { tier1, tier2, regionArt, everything } from './preload.js';
import { startServiceWorker } from './swreg.js';
import { city, schoolSave } from './route.js';
import { routeFor } from './aim.js';   // the aimed route (src/aim.js): the same path the flight will fly
import { crossingPath } from './crossings.js';
import { FACTS } from './ui.js';   // (already in the module graph: main.js loads ui.js before loading.start runs; a static import so the deploy's ?v= stamp applies)

export const FACT_AFTER_MS = 2000, FACT_MAX_WORDS = 15;   // UX plan decision 4: one fact only on a load that takes longer than 2 s; it never takes a tap
const words = t => t.trim().split(/\s+/).length;
const W = 192, H = 108;
const SKY_SHEET = 'assets/loader/loader-sky.png', PLANE_SHEET = 'assets/loader/loader-plane.png', SKY_FRAMES = 8, PLANE_FRAMES = 4, PLANE_W = 64, PLANE_H = 32;
const sheet = url => { const im = new Image(); im.decoding = 'async'; im.src = url; return im; };
const SPRITE_FRAME = /^assets\/(pixellab\/)?(animal|sky)-[^/]*\.png$/;   // the in-flight frames of an animal (not the menu portraits under ui/)
const SKY = ['#10142b', '#16204a', '#1d2f66', '#264080', '#3a5a9c', '#5b82b8'];   // night to dawn, flat bands
const FLYING = ['takeoff', 'playing', 'landing'];

// The lands of the trip a save would fly next (the chosen crossing, else the usual path): their art is tier 1.
export function tripLands(save) {
  try {
    const path = save.flyCrossing ? crossingPath(save.flyCrossing) : routeFor(save.tutorialDone ? save : schoolSave(save));   // (the same choice as GameScene's pathNow)
    return [...new Set(path.map(n => (city(n) || {}).region).filter(Boolean))];
  } catch (e) { return []; }
}

// One picture, fetched with fetch(): the browser's cache keeps it for the <img> that shows it later (nothing is held in memory here). The X-Preload header
// marks the request as the loader's own: tests/preloadgate.cjs allows only those after 'ready'.
const fetchPicture = url => fetch(url, { headers: { 'X-Preload': '1' } }).then(r => r.blob()).catch(() => {});
async function fetchAll(list, onEach, lanes = 12) {
  let next = 0;
  await Promise.all(Array.from({ length: lanes }, async () => { while (next < list.length) { const url = list[next++]; await fetchPicture(url); onEach(); } }));
}

export const loading = {
  phaser: { done: 0, total: 0 }, menus: { done: 0, total: 0 }, sceneBuilt: false, menusDone: false, finished: false, shown: 0, trail: [],
  phaserUrls: [], cv: null, ctx: null, save: null, flying: false,   // flying: set by GameScene.startFlight (school included), cleared by onFinish / backToMenu

  start(save) {
    this.save = save; window.cpLoading = this;   // (for tests/preloadgate.cjs, like window.game)
    this.list = tier1(save, tripLands(save));   // known up front, so the total (and the plane) never jumps back when the menu step starts
    this.menus = { done: 0, total: this.list.length };
    // The menu pictures start loading NOW, beside Phaser's own files (their latency overlaps); only the animal frames wait for Phaser (it loads the trip's own: the same files, fetched once).
    this.early = this.list.filter(f => !SPRITE_FRAME.test(f)); this.late = this.list.filter(f => SPRITE_FRAME.test(f));
    this.earlyDone = fetchAll(this.early, () => { this.menus.done++; });
    const box = document.getElementById('loader'); if (!box) return;
    this.cv = box.querySelector('canvas'); this.txt = box.querySelector('.loader-count');
    this.ctx = this.cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.skyImg = sheet(SKY_SHEET); this.planeImg = sheet(PLANE_SHEET);
    this.t0 = performance.now(); this.factTimer = setTimeout(() => this.showFact(), FACT_AFTER_MS);
    this.reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = t => { if (this.finished) return; this.draw(t); requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    setTimeout(() => { if (!this.finished) { this.sceneBuilt = this.menusDone = true; this.maybeFinish(); } }, 60000);   // fail open: a stuck download must never keep the game covered
  },
  // A long load (> FACT_AFTER_MS): ONE short fact under the counter, so waiting is not empty. Plain text on the loading screen, which takes no taps.
  showFact() {
    const box = document.getElementById('loader'); if (this.finished || !box || box.querySelector('.loader-fact')) return;
    const pool = FACTS.filter(f => words(f) <= FACT_MAX_WORDS);
    const p = document.createElement('p'); p.className = 'loader-fact'; p.textContent = pool[Math.floor(Math.random() * pool.length)] || '';
    if (p.textContent) box.appendChild(p);
  },
  // Real progress: the fraction of all files (both steps) that have arrived.
  fraction() {
    const total = this.phaser.total + this.menus.total;
    const f = total ? Math.min(1, (this.phaser.done + this.menus.done) / total) : 0;
    this.maxF = Math.max(this.maxF || 0, f); return this.maxF;   // never lower: Phaser's total arrives after the menu step has started, and must not pull the plane back
  },
  // GameScene.preload: files done / files to load, from Phaser's own loader.
  onPhaser(done, total) { this.phaser = { done, total }; },
  // Phaser has every game picture: now tier 1 of the menu pictures.
  async onPhaserComplete() {
    if (this.menusStarted) return; this.menusStarted = true;
    await this.earlyDone;
    await fetchAll(this.late, () => { this.menus.done++; });
    this.menusDone = true; this.maybeFinish();
  },
  // GameScene.create (the first time): the scene is built.
  onSceneBuilt() { this.sceneBuilt = true; this.maybeFinish(); },
  maybeFinish() {
    if (this.finished || !this.sceneBuilt || !this.menusDone) return;
    this.finished = true; this.tDone = performance.now(); document.body.dataset.loaded = '1'; clearTimeout(this.factTimer);   // (tDone: for tests/loadercount.cjs)
    const box = document.getElementById('loader'); if (box) { box.style.pointerEvents = 'none'; box.classList.add('done'); setTimeout(() => box.remove(), 450); }
    this.startPump();
    startServiceWorker([...this.phaserUrls, ...everything()]).then(r => { window.cpSw = r; });   // (0.25.0) the worker keeps all of it for offline; does nothing on a page with no ?v build stamp
  },

  draw(t) {
    const c = this.ctx, f = this.fraction();
    this.shown += (f - this.shown) * (this.reduce ? 1 : 0.12);   // eases toward the real fraction, never backwards
    const art = this.skyImg && this.skyImg.complete && this.skyImg.naturalWidth > 0, plane = this.planeImg && this.planeImg.complete && this.planeImg.naturalWidth > 0;
    if (art) c.drawImage(this.skyImg, (this.reduce ? 0 : Math.floor(t / 160) % SKY_FRAMES) * W, 0, W, H, 0, 0, W, H);   // the PixelLab sky, about 6 frames a second
    else {
      for (let b = 0; b < SKY.length; b++) { c.fillStyle = SKY[b]; c.fillRect(0, Math.floor(b * H / SKY.length), W, Math.ceil(H / SKY.length)); }
      c.fillStyle = '#ffffff'; for (const [x, y] of [[16, 12], [54, 24], [120, 10], [166, 28], [88, 18]]) { if ((Math.floor(t / 400) + x) % 5) c.fillRect(x, y, 1, 1); }   // twinkling stars
    }
    // The plane: x follows the progress, y rides a gentle wave; the contrail is the path it has flown.
    const px = Math.round(4 + this.shown * (W - (plane ? PLANE_W - 8 : 22))), py = Math.round(34 + Math.sin(this.shown * 9) * 8);
    if (!this.trail.length || this.trail[this.trail.length - 1][0] !== px) this.trail.push([px, py]);
    for (let i = 0; i < this.trail.length; i++) {
      const [x, y] = this.trail[i], age = this.trail.length - i;
      c.fillStyle = age < 28 ? '#ffffff' : age < 80 ? '#dbe8f7' : '#a9c1de';
      c.fillRect(x, y, 1, 2); if (age < 120) c.fillRect(x, y + 2, 1, 1); if (age < 36) c.fillRect(x, y - 1, 1, 1);   // fat near the plane, thin behind (0.79.0: 2 px base on the 192 px canvas)
      if (age > 40 && age % 7 === 0) c.fillRect(x, y + 4 + (age % 3), 1, 1);   // the trail puffs out and drifts down as it ages
    }
    // A pixel plane, 12 x 6: white body, grey wing, red tail, a lit window.
    const sp = ['....wwwwww..', '.rrwwwwwwwww', 'rrrwwbwwwwww', '.rrwwwwwwwwg', '....gggggg..', '....g.......'];
    const col = { w: '#f4f4f4', r: '#e0463c', g: '#8c97a8', b: '#ffd34d' };
    if (plane) c.drawImage(this.planeImg, (this.reduce ? 0 : Math.floor(t / 140) % PLANE_FRAMES) * PLANE_W, 0, PLANE_W, PLANE_H, px - 10, py - 13, PLANE_W, PLANE_H);   // its tail (left, rows ~10-14 of the sprite) on the trail
    else sp.forEach((row, yy) => [...row].forEach((ch, xx) => { if (col[ch]) { c.fillStyle = col[ch]; c.fillRect(px + xx, py + yy - 1, 1, 1); } }));
    if (this.txt) this.txt.textContent = this.phaser.total ?   // (the counter waits for Phaser's total: M is then fixed, it never turns '0 / 264' into 'N / 714')
       `${this.phaser.done + this.menus.done} / ${this.phaser.total + this.menus.total}` : '';
  },

  // Tier 2: every other land's menu art, one picture at a time, only while the game is idle; a newly discovered land jumps the queue.
  startPump() {
    if (navigator.connection && navigator.connection.saveData) return;
    const scene = () => window.game && game.scene.getScene('game');
    this.queue = tier2(this.save, tripLands(this.save));
    let trip = tripLands(this.save).join();
    const step = async () => {
      const s = scene();
      // DECLARED by the scene: `flying` is on for the whole flight, flight school included. The other two checks are only a second guard.
      const inMenus = !document.getElementById('tabbar').hidden;
      if (document.hidden || this.flying || !inMenus || (s && FLYING.includes(s.state))) return setTimeout(step, 1000);   // never while flying (or in the background)
      const now = tripLands(this.save).join();
      if (now !== trip) {   // a different trip was chosen on HOME: its lands' art, and its animals' flight frames, go first (before TAKE OFF, never mid-flight)
        trip = now; for (const r of now.split(',')) this.promote(r);
        if (s && s.queueArt && s.queueArt(s.artLands(now.split(',')))) s.load.start();
      }
      if (!this.queue.length) return setTimeout(step, 2000);   // (idle: look again for a new trip)
      await fetchPicture(this.queue.shift());
      setTimeout(step, 20);
    };
    step();
  },
  // A land just discovered (GameScene.setRegion): its art goes to the front of the queue.
  promote(region) { if (!this.queue) return; const set = new Set(regionArt(region)); this.queue = [...regionArt(region).filter(f => this.queue.includes(f)), ...this.queue.filter(f => !set.has(f))]; },
};
