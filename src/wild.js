// The NATURE screen: the wild area (the user's design, 2026-10-21). Per region: a little scene of
// the land with the animals you have found, the habitat meter, habitat projects to buy (things
// people really do for nature, each with a knock-on chain and sources), the tree upgrades, and
// the collection of animals: found ones with their portrait and fact, the rest as silhouettes
// that say what they need. Animals are never bought: they appear on flights (GameScene.seen).
// UK first; the other regions are listed as coming soon.
import { writeSave } from './save.js';
import { sfx } from './sound.js';
import { LINES, tabOf } from './upgrades.js';
import { biodiversity, projectsDone, PROJECTS, canAppear, ukSpecies } from './nature.js';
import { UK_SPECIES } from './habitats.js';
import { REGIONS } from './wildlife.js';
import { meterHTML } from './ui.js';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
const cost = p => `${p.cost}<i class="seedicon"></i>${p.crystals ? ` ${p.crystals}<i class="crysicon"></i>` : ''}`;
const links = src => (src || []).length
  ? `<p class="label">Find out more</p><div class="links">${src.map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} &gt;</a>`).join('')}</div>`
  : '<p class="small">Our scientists are checking where this fact comes from.</p>';
// Regions still to come (not on the route yet: the user asked for them anyway).
const MORE = { savanna: 'African savanna', rainforest: 'South American rainforest' };

export class WildScreen {
  constructor(ui) {
    this.ui = ui;
    this.save = ui.save;
    this.region = 'woodland';
    $('wInfoClose').onclick = () => { $('wInfo').hidden = true; };
  }

  done() { return projectsDone(this.save).map(p => p.id); }

  render() {
    const s = this.save;
    $('wSeeds').textContent = s.seeds; $('wCrystals').textContent = s.crystals || 0;
    const regions = [...Object.entries(REGIONS).map(([id, r]) => [id, r.name]), ...Object.entries(MORE)];
    $('wRegions').innerHTML = regions.map(([id, name]) => `<button class="btn ${id === this.region ? 'on' : ''}" type="button" data-region="${id}" ${id === 'woodland' ? '' : 'disabled'} title="${id === 'woodland' ? '' : 'Coming soon'}">${esc(id === 'woodland' ? 'UK' : name)}${id === 'woodland' ? '' : ' <small>soon</small>'}</button>`).join('');
    $('wMeter').innerHTML = meterHTML(s);
    this.renderScene();
    this.renderProjects();
    // Trees: the tree upgrade lines (planting parcels, soil, kinds of tree, the nursery).
    $('wTrees').innerHTML = LINES.filter(l => tabOf(l) === 'nature').map(l => this.ui.lineCardHTML(l)).join('');
    $('wTrees').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.ui.buy(b.dataset.buy));
    $('wTrees').querySelectorAll('[data-info]').forEach(b => b.onclick = () => this.ui.showInfo(b.dataset.info));
    this.renderFound();
  }

  // The land: hills, ground, and the animals you have found (standing, or flying above).
  renderScene() {
    const found = ukSpecies().filter(w => this.found(w.id));
    let x = 6;
    const bits = found.map((w, i) => {
      const fly = w.kind === 'bird' && w.pose !== 'standing';
      const left = (x = (x + 37 + (i * 53) % 29) % 250);
      // Backdrop (art session): 288 x 120, grass line at y=100: feet at y=103 (bottom 17/120).
      return `<img class="w-critter ${fly ? 'fly' : ''}" src="assets/${w.sprite}-0.png" alt="${esc(w.name)}" style="left:${(left / 288 * 100).toFixed(1)}%;${fly ? `top:${(8 + (i * 17) % 36) / 1.2}%` : `bottom:${(17 / 120 * 100).toFixed(1)}%`}">`;
    }).join('');
    $('wScene').style.backgroundImage = `url('assets/ui/scene-${this.region}.png')`;
    $('wScene').innerHTML = `${bits}${found.length ? '' : '<p class="w-empty">No wild animals yet. Start a habitat project!</p>'}`;
  }

  found(id) { return !!(this.save.found || {})[id]; }

  renderProjects() {
    const s = this.save, done = this.done(), bio = biodiversity(s);
    $('wProjects').innerHTML = PROJECTS.map(p => {
      const have = done.includes(p.id), waiting = bio < p.needs, ok = !have && !waiting && s.seeds >= p.cost && (s.crystals || 0) >= p.crystals;
      const btn = have ? '<span class="w-done">DONE</span>'
        : waiting ? `<span class="small">needs Biodiversity ${p.needs}</span>`
        : `<button class="btn ${ok ? 'go' : ''}" type="button" data-project="${p.id}" ${ok ? '' : 'disabled'}>${cost(p)}</button>`;
      return `<div class="line project ${have ? 'maxed' : ''}" data-pline="${p.id}">
        <div><div class="name"><img class="w-icon" src="assets/ui/proj-${p.id}.png" alt="">${esc(p.name)}</div><div class="small">${esc(p.short)}</div>
        <div class="w-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</div></div>
        <button class="infobtn" type="button" data-pinfo="${p.id}" aria-label="About ${esc(p.name)}">i</button>
        <div class="next">${btn}</div></div>`;
    }).join('');
    $('wProjects').querySelectorAll('[data-project]').forEach(b => b.onclick = () => this.buy(b.dataset.project));
    $('wProjects').querySelectorAll('[data-pinfo]').forEach(b => b.onclick = () => this.projectInfo(b.dataset.pinfo));
  }

  buy(id) {
    const s = this.save, p = PROJECTS.find(x => x.id === id);
    if (!p || this.done().includes(id) || biodiversity(s) < p.needs || s.seeds < p.cost || (s.crystals || 0) < p.crystals) { sfx.nope(); return; }
    s.seeds -= p.cost; s.crystals -= p.crystals;
    s.habitat = s.habitat || {}; s.habitat.woodland = [...(s.habitat.woodland || []), id];
    writeSave(s); sfx.buy();
    this.render();
    // Who might come now?
    const now = ukSpecies().filter(w => canAppear(s, w.id) && !this.found(w.id) && UK_SPECIES[w.id].needs.includes(id));
    if (now.length) this.ui.toast(`${p.name}: done!`, `Look out on your flights for: ${now.map(w => w.name).join(', ')}!`, 'good', 4);
  }

  projectInfo(id) {
    const p = PROJECTS.find(x => x.id === id);
    const helps = ukSpecies().filter(w => UK_SPECIES[w.id].needs.includes(id)).map(w => w.name);
    $('wInfoBody').innerHTML = `<p class="eyebrow">Habitat project</p><h2>${esc(p.name)}</h2><p>${esc(p.short)}</p>
      <div><p class="label">What happens next?</p><p class="w-chain">${p.chain.map(esc).join(' <b>&rarr;</b> ')}</p></div>
      <div class="fact"><p class="label">Did you know?</p><p>${esc(p.fact)}</p></div>
      ${helps.length ? `<p><b>Helps bring back:</b> ${helps.map(esc).join(', ')}</p>` : ''}${links(p.src)}`;
    $('wInfo').hidden = false;
  }

  // The collection: every UK animal. Found: portrait + name. Not yet: a silhouette and a hint.
  renderFound() {
    const all = ukSpecies(), n = all.filter(w => this.found(w.id)).length;
    $('wFoundHead').textContent = `Wildlife found: ${n} / ${all.length}`;
    $('wFound').innerHTML = all.map(w => {
      const got = this.found(w.id), pic = w.portrait ? `${w.portrait}-0.png` : `assets/${w.sprite}-0.png`;
      return `<button class="w-card ${got ? 'got' : ''}" type="button" data-species="${w.id}"><img src="${esc(pic)}" alt=""><span>${got ? esc(w.name) : '???'}</span></button>`;
    }).join('');
    $('wFound').querySelectorAll('[data-species]').forEach(b => b.onclick = () => this.speciesInfo(b.dataset.species));
  }

  speciesInfo(id) {
    const w = ukSpecies().find(x => x.id === id), c = UK_SPECIES[id], got = this.found(id);
    const names = c.needs.map(n => PROJECTS.find(p => p.id === n).name);
    const hint = canAppear(this.save, id) ? 'It can live here now! Look out for it on your flights.'
      : `To bring it here: ${names.length ? names.map(esc).join(' + ') : 'a healthier land'}${c.bio ? `, and Biodiversity ${c.bio}` : ''}.`;
    const pic = w.portrait ? `${w.portrait}-0.png` : `assets/${w.sprite}-0.png`;
    $('wInfoBody').innerHTML = got
      ? `<p class="eyebrow">Found!</p><h2>${esc(w.name)}</h2><img class="w-portrait" src="${esc(pic)}" alt="">
        <div><p class="label">Why it lives here</p><p>${esc(c.why)}</p></div>
        ${c.fact ? `<div class="fact"><p class="label">Did you know?</p><p>${esc(c.fact)}</p></div>` : ''}${links(c.src)}`
      : `<p class="eyebrow">Not found yet</p><h2>???</h2><img class="w-portrait w-shadow" src="${esc(pic)}" alt=""><p>${hint}</p>`;
    $('wInfo').hidden = false;
  }
}
