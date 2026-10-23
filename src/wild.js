// The NATURE screen: the wild area (the user's design, 2026-10-21). Per region: a little scene of
// the land with the animals you have found, the habitat meter, habitat projects to buy (things
// people really do for nature, each with a knock-on chain and sources), the tree upgrades, and
// the collection of animals: found ones with their portrait and fact, the rest as silhouettes
// that say what they need. Animals are never bought: they appear on flights (GameScene.seen).
// Every region since 2026-10-22: a region's tab opens once you have been there (landed in one of
// its cities, or flown over it).
import { writeSave } from './save.js';
import { sfx } from './sound.js';
import { LINES, tabOf } from './upgrades.js';
import { biodiversity, projectsDone, canAppear, regionSpecies } from './nature.js';
import { TIERS, RARITY, REGION_NAMES, REGION_DATA } from './habitats.js';
import { CITIES } from './cities.js';
import { meterHTML } from './ui.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const cost = p => `${p.cost}<i class="seedicon"></i>${p.crystals ? ` ${p.crystals}<i class="crysicon"></i>` : ''}`;
const links = src => (src || []).length
  ? `<p class="label">Find out more</p><div class="links">${src.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} &gt;</a>`).join('')}</div>`
  : '<p class="small">Our scientists are checking where this fact comes from.</p>';
// Regions with a drawn field (assets/ui/field-<region>.png); the others show a plain panel for now.
const FIELD_ART = ['woodland'];

// Been there: the UK always; other regions once flown over, or landed in one of their cities.
export function discovered(save, region) {
  if (region === 'woodland') return true;
  if ((save.discovered || {})[region]) return true;   // flown over (GameScene.setRegion)
  return (save.visited || []).some(n => (CITIES.find(c => c.name === n) || {}).region === region);   // src/cities.js
}

export class WildScreen {
  constructor(ui) {
    this.ui = ui;
    this.save = ui.save;
    this.region = 'woodland';
    $('wInfoClose').onclick = () => { $('wInfo').hidden = true; };
  }

  get projects() { return REGION_DATA[this.region].projects; }
  get species() { return REGION_DATA[this.region].species; }
  animals() { return regionSpecies(this.region); }
  done() { return projectsDone(this.save, this.region).map(p => p.id); }
  bio() { return biodiversity(this.save, this.region); }

  render() {
    const s = this.save;
    if (!discovered(s, this.region)) this.region = 'woodland';
    $('wSeeds').textContent = s.seeds; $('wCrystals').textContent = s.crystals || 0;
    $('wRegions').innerHTML = Object.entries(REGION_NAMES).map(([id, name]) => {
      const open = discovered(s, id);
      return `<button class="btn ${id === this.region ? 'on' : ''}" type="button" data-region="${id}" ${open ? '' : 'disabled'}
        title="${open ? '' : 'Fly there to discover it'}">${esc(name)}${open ? '' : ' <small>fly there</small>'}</button>`;
    }).join('');
    $('wRegions').querySelectorAll('[data-region]:not([disabled])').forEach(b => b.onclick = () => {
      if (b.dataset.region === this.region) return;
      sfx.flap(); this.region = b.dataset.region; this.openTiers = []; this.render();
    });
    $('wMeter').innerHTML = meterHTML(s, this.bio());
    this.renderScene();
    this.renderProjects();
    // Trees: the tree upgrade lines (planting parcels, soil, kinds of tree, the nursery). UK trees only.
    const uk = this.region === 'woodland';
    $('wTrees').hidden = !uk;
    if ($('wTrees').previousElementSibling) $('wTrees').previousElementSibling.hidden = !uk;
    $('wTrees').innerHTML = uk ? LINES.filter(l => tabOf(l) === 'nature').map(l => this.ui.lineCardHTML(l)).join('') : '';
    $('wTrees').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.ui.buy(b.dataset.buy));
    $('wTrees').querySelectorAll('[data-info]').forEach(b => b.onclick = () => this.ui.showInfo(b.dataset.info));
    this.renderFound();
  }

  // The land as a 2D field you look across (2026-10-22): the habitat features of every project done,
  // the trees you have planted, and the animals you have found wandering about (see Field below).
  renderScene() {
    const s = this.save, done = this.done();
    if (this.field) this.field.stop();
    this.field = null;
    if (!FIELD_ART.includes(this.region)) {
      $('wScene').innerHTML = `<p class="w-empty">${esc(REGION_NAMES[this.region])}: a picture of this land is being drawn.</p>`;
      return;
    }
    const found = this.animals().filter(w => w.sprite && this.found(w.id));
    const planted = Object.entries(s.planted || {}).filter(([, n]) => n > 0);
    this.field = new Field($('wScene'), this.region, done, planted, found);
    if (!found.length && !done.length) $('wScene').insertAdjacentHTML('beforeend', '<p class="w-empty">Bare land. Start a habitat project, and plant trees on your flights!</p>');
  }

  found(id) { return !!(this.save.found || {})[id]; }

  renderProjects() {
    // In tiers (the user, 2026-10-22: all 11 at once was confusing): open tiers show their projects;
    // the next locked tier is one card saying what opens it; later tiers stay hidden.
    const s = this.save, done = this.done(), bio = this.bio(), P = this.projects;
    const card = p => {
      const have = done.includes(p.id), ok = !have && s.seeds >= p.cost && (s.crystals || 0) >= p.crystals;
      const btn = have ? '<span class="w-done">DONE</span>'
        : `<button class="btn ${ok ? 'go' : ''}" type="button" data-project="${p.id}" ${ok ? '' : 'disabled'}>${cost(p)}</button>`;
      return `<div class="line project ${have ? 'maxed' : ''}" data-pline="${p.id}">
        <div><div class="name"><img class="w-icon" src="assets/ui/proj-${p.id}.png" alt="" onerror="this.style.visibility='hidden'">${esc(p.name)}</div><div class="small">${esc(p.short)}</div>
        <div class="w-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</div></div>
        <button class="infobtn" type="button" data-pinfo="${p.id}" aria-label="About ${esc(p.name)}">i</button>
        <div class="next">${btn}</div></div>`;
    };
    const how = this.region === 'woodland' ? 'Plant trees and finish the projects above!' : 'Finish the projects above!';
    const open = TIERS.filter(t => bio >= t.needs), next = TIERS.find(t => bio < t.needs);
    $('wProjects').innerHTML = open.map(t => {
      const ps = P.filter(p => p.tier === t.tier), n = ps.filter(p => done.includes(p.id)).length;
      const finished = n === ps.length, shown = !finished || (this.openTiers || []).includes(t.tier);   // a finished tier folds to one line
      return `<p class="w-tier">Tier ${t.tier}: ${esc(t.name)} <span class="small">${finished ? '&#10003; ' : ''}${n} / ${ps.length} done</span>`
        + (finished ? ` <button class="btn tiny" type="button" data-tier-toggle="${t.tier}">${shown ? 'hide' : 'show'}</button>` : '') + '</p>'
        + (shown ? ps.map(card).join('') : '');
    }).join('') + (next ? `<div class="line project locked" data-tier-locked="${next.tier}"><div><div class="name">Tier ${next.tier}: ${esc(next.name)}</div>
        <div class="small">Reach Biodiversity <b>${next.needs}</b> to unlock ${P.filter(p => p.tier === next.tier).length} more projects. ${how}</div></div></div>` : '');
    $('wProjects').querySelectorAll('[data-project]').forEach(b => b.onclick = () => this.buy(b.dataset.project));
    $('wProjects').querySelectorAll('[data-pinfo]').forEach(b => b.onclick = () => this.projectInfo(b.dataset.pinfo));
    $('wProjects').querySelectorAll('[data-tier-toggle]').forEach(b => b.onclick = () => {
      const t = Number(b.dataset.tierToggle), o = this.openTiers || [];
      this.openTiers = o.includes(t) ? o.filter(x => x !== t) : [...o, t]; this.renderProjects();
    });
  }

  buy(id) {
    const s = this.save, r = this.region, p = this.projects.find(x => x.id === id);
    if (!p || this.done().includes(id) || this.bio() < p.needs || s.seeds < p.cost || (s.crystals || 0) < p.crystals) { sfx.nope(); return; }
    s.seeds -= p.cost; s.crystals -= p.crystals;
    s.habitat = s.habitat || {}; s.habitat[r] = [...(s.habitat[r] || []), id];
    writeSave(s); sfx.buy();
    this.render();
    // Who might come now? (only animals that are drawn can turn up in flight)
    const now = this.animals().filter(w => w.sprite && canAppear(s, w.id, r) && !this.found(w.id) && w.c.needs.includes(id));
    if (now.length) this.ui.toast(`${p.name}: done!`, `Look out on your flights for: ${now.map(w => w.name).join(', ')}!`, 'good', 4);
  }

  projectInfo(id) {
    const p = this.projects.find(x => x.id === id);
    const helps = this.animals().filter(w => w.c.needs.includes(id)).map(w => w.name);
    $('wInfoBody').innerHTML = `<p class="eyebrow">Habitat project</p><h2>${esc(p.name)}</h2><p>${esc(p.short)}</p>
      <div><p class="label">What happens next?</p><p class="w-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</p></div>
      <div class="fact"><p class="label">Did you know?</p><p>${esc(p.fact)}</p></div>
      ${helps.length ? `<p><b>Helps bring back:</b> ${helps.map(esc).join(', ')}</p>` : ''}${links(p.src)}${p.org ? orgHTML(p.org) : ''}`;
    $('wInfo').hidden = false;
    if (p.org) gate($('wInfoBody'));
  }

  // The collection: every animal of this region. Found: portrait + name. Not yet: a silhouette and a hint.
  renderFound() {
    const all = this.animals(), n = all.filter(w => this.found(w.id)).length;
    $('wFoundHead').textContent = `Wildlife found: ${n} / ${all.length}`;
    $('wFound').innerHTML = all.map(w => {
      const got = this.found(w.id), r = w.c.rarity || 'common';
      return `<button class="w-card ${got ? 'got' : ''} r-${r}" type="button" data-species="${w.id}">${picHTML(w)}<span>${got ? esc(w.name) : '???'}</span><small class="w-rarity">${RARITY[r].name}</small></button>`;
    }).join('');
    $('wFound').querySelectorAll('[data-species]').forEach(b => b.onclick = () => this.speciesInfo(b.dataset.species));
  }

  speciesInfo(id) {
    const w = this.animals().find(x => x.id === id), c = w.c, got = this.found(id);
    const names = c.needs.map(n => this.projects.find(p => p.id === n).name);
    const rr = RARITY[c.rarity || 'common'], far = rr.from ? ` ${rr.name} animals only show up ${rr.from.toLocaleString('en-GB')} km or more into a flight.` : '';
    const hint = !w.sprite ? 'Our artists are still drawing this animal. Soon you can find it on your flights!'
      : canAppear(this.save, id, this.region) ? `It can live here now! Look out for it on your flights.${far}`
      : `To bring it here: ${names.length ? names.map(esc).join(' + ') : 'a healthier land'}${c.bio ? `, and Biodiversity ${c.bio}` : ''}.`;
    $('wInfoBody').innerHTML = got
      ? `<p class="eyebrow">Found! ${rr.name}</p><h2>${esc(w.name)}</h2>${picHTML(w, 'w-portrait')}
        <div><p class="label">Why it lives here</p><p>${esc(c.why)}</p></div>
        ${c.fact ? `<div class="fact"><p class="label">Did you know?</p><p>${esc(c.fact)}</p></div>` : ''}${links(c.src)}`
      : `<p class="eyebrow">Not found yet: ${rr.name}</p><h2>???</h2>${picHTML(w, 'w-portrait w-shadow')}<p>${hint}</p>`;
    $('wInfo').hidden = false;
  }
}

// An animal's picture: its portrait, its sprite, or (not drawn yet) a question mark.
function picHTML(w, cls = '') {
  const pic = w.portrait ? `${w.portrait}-0.png` : w.sprite ? `assets/${w.sprite}-0.png` : '';
  return pic ? `<img class="${cls}" src="${esc(pic)}" alt="">` : `<span class="w-nopic ${cls}">?</span>`;
}

// Who runs a project, and links to them (the user's goal, 2026-10-22: a knowledge base of real
// projects people can support). The game takes no payments: the links sit behind the grown-up gate.
function orgHTML(o) {
  return `<div class="w-org"><p class="label">Who does this?</p><p><b>${esc(o.name)}</b></p>
    <button class="btn green gate w-gate" type="button"><span class="gate-fill"></span><span class="gate-label">ASK A GROWN-UP</span></button>
    <div class="links w-orglinks" hidden><a href="${esc(o.learn)}" target="_blank" rel="noopener">Learn about them &gt;</a>${o.donate ? `<a href="${esc(o.donate)}" target="_blank" rel="noopener">Help them (donate) &gt;</a>` : ''}</div>
    <p class="small w-gatemsg">Grown-ups: press and HOLD the button for 2 seconds.</p></div>`;
}
// Hold 2 s to show the links (as the Citizen Zoo gate in ui.js; links hide again after 10 s).
function gate(root) {
  const btn = root.querySelector('.w-gate'), box = root.querySelector('.w-orglinks'), msg = root.querySelector('.w-gatemsg');
  if (!btn) return;
  let timer = null, back = null;
  const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
  const reset = () => { clearTimeout(back); box.hidden = true; btn.hidden = false; msg.hidden = false; };
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    btn.classList.add('holding');
    timer = setTimeout(() => { cancel(); btn.hidden = true; msg.hidden = true; box.hidden = false; back = setTimeout(reset, 10000); }, 2000);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, cancel));
  btn.addEventListener('contextmenu', e => e.preventDefault());
  box.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setTimeout(reset, 500)));
}

// ---------- the Wild Area field (art session, 2026-10-22) ----------
// A 288 x 170 field (assets/ui/field-<region>.png, horizon at y=60) drawn in game pixels inside a
// box scaled to the screen. Features are at 2x (their art is 1x); trees (2 px/unit) and animals
// (1.5 px/unit) at 1x, so a fox is about as wide as a tree. Things lower
// down the field are nearer, so they are drawn in front. Animals walk to a spot, pause, pick
// another, and face the way they go; flying birds cross the sky and come round again.
const FW = 288, FH = 170, HORIZON = 60, GROUND = [HORIZON + 8, FH - 2];
// Where each project's feature goes: [x, y] of its bottom-left corner, in field pixels (at 2x).
const SLOTS = { hedgerow: [[0, 72], [96, 72], [192, 72]], woodland: [[4, 98]], martens: [[96, 124]], storks: [[150, 108]],
  deadwood: [[60, 118]], margins: [[206, 96]], pond: [[118, 150]], voles: [[236, 170]], beavers: [[242, 142]],
  rewet: [[2, 168]], meadow: [[176, 132], [40, 146]] };
// Planted trees: up to 12, in spots clear of the features, by how many of each kind you planted.
const TREE_SPOTS = [[200, 84], [176, 90], [266, 88], [126, 92], [100, 96], [84, 132], [226, 120], [190, 160], [24, 124], [150, 166], [270, 156], [56, 164]];

class Field {
  constructor(el, region, done, planted, found) {
    this.el = el;
    el.innerHTML = '';
    el.classList.add('wfield-box');
    const f = this.f = document.createElement('div');
    f.className = 'wfield';
    f.style.backgroundImage = `url('assets/ui/field-${region}.png')`;
    el.appendChild(f);
    const put = (src, x, y, k, cls = '') => {   // bottom-left at (x, y), scaled k
      const img = document.createElement('img');
      img.src = src; img.alt = ''; img.className = `wf ${cls}`;
      img.style.left = `${x}px`; img.style.top = `${y}px`; img.style.zIndex = Math.round(y);
      img.style.transform = `translateY(-100%) scale(${k})`;
      f.appendChild(img);
      return img;
    };
    for (const id of done) for (const [x, y] of SLOTS[id] || []) put(`assets/ui/wild-${id}.png`, x, y, 2, 'feat');
    const total = planted.reduce((a, [, n]) => a + n, 0);
    const kinds = planted.flatMap(([id, n]) => Array(n).fill(id));
    const nTrees = Math.min(TREE_SPOTS.length, Math.ceil(total / 2));
    for (let i = 0; i < nTrees; i++) {
      const kind = kinds[Math.floor((i + 0.5) / nTrees * kinds.length)];
      const [x, y] = TREE_SPOTS[i];
      put(`assets/tree-${kind}-2.png`, x, y, 1, 'tree').style.transform = 'translate(-50%, -100%)';   // 1x (drawn at 2 px/unit), centred on x
    }
    // Animals: start at random spots; birds that fly take the sky.
    this.critters = found.map((w, i) => {
      const fly = w.kind === 'bird' && w.pose !== 'standing';
      const c = { w, fly, img: put(`assets/${w.sprite}-0.png`, 0, 0, 1, 'critter'), frame: 0, t: Math.random(), pause: Math.random() * 2,
        x: 20 + Math.random() * (FW - 40), y: fly ? 14 + Math.random() * 30 : GROUND[0] + Math.random() * (GROUND[1] - GROUND[0]),
        speed: fly ? 22 + Math.random() * 10 : 6 + Math.random() * 6, dir: Math.random() < 0.5 ? -1 : 1 };
      if (!fly) this.pick(c);
      return c;
    });
    this.fit();
    this.last = performance.now();
    this.raf = requestAnimationFrame(t => this.step(t));
  }

  fit() { this.f.style.transform = `scale(${this.el.clientWidth / FW})`; }
  pick(c) { c.tx = 10 + Math.random() * (FW - 20); c.ty = GROUND[0] + Math.random() * (GROUND[1] - GROUND[0]); }
  stop() { cancelAnimationFrame(this.raf); this.raf = null; }

  step(now) {
    if (!this.raf) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (this.el.offsetParent !== null) {           // only while the NATURE screen is showing
      this.fit();
      for (const c of this.critters) this.move(c, dt);
    }
    this.raf = requestAnimationFrame(t => this.step(t));
  }

  move(c, dt) {
    let moving = true;
    if (c.fly) {                                    // across the sky, then round again
      c.x += c.dir * c.speed * dt;
      if (c.x > FW + 20) c.x = -20; if (c.x < -20) c.x = FW + 20;
      c.y += Math.sin(c.t * 2) * 4 * dt;
    } else if (c.pause > 0) {
      c.pause -= dt; moving = false;
    } else {
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 1) { c.pause = 1 + Math.random() * 3; this.pick(c); moving = false; }
      else { c.x += dx / d * c.speed * dt; c.y += dy / d * c.speed * 0.6 * dt; if (Math.abs(dx) > 0.5) c.dir = dx < 0 ? -1 : 1; }
    }
    c.t += dt;
    const frame = moving ? Math.floor(c.t / (c.fly ? 0.18 : 0.25)) % 2 : 0;   // 0 when standing still (not `false`)
    if (frame !== c.frame) { c.frame = frame; c.img.src = `assets/${c.w.sprite}-${frame}.png`; }
    const im = c.img;
    im.style.left = `${Math.round(c.x - im.naturalWidth / 2)}px`;
    im.style.top = `${Math.round(c.y)}px`;
    im.style.zIndex = c.fly ? 500 : Math.round(c.y);
    im.style.transform = `translateY(-100%) scaleX(${c.dir})`;   // sprites face right; flip to walk left
  }
}
