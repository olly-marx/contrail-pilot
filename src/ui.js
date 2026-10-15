// HTML screens around the game: title/briefing, results, hangar (shop) and in-flight tips.
import { UPGRADES, BADGES, FUELS, owns, canBuy } from './upgrades.js';
import { writeSave, resetSave } from './save.js';
import { sfx, setMuted, unlockAudio } from './sound.js';

// TODO(citizen-zoo): replace with the page Citizen Zoo gives us, keeping the ref tag.
export const CITIZEN_ZOO_URL = 'https://www.citizenzoo.org/?ref=contrailpilot';

export const FACTS = [
  'Contrail is short for "condensation trail". Water vapour from the engines freezes into tiny ice crystals in air colder than about -40 C.',
  'In dry air a contrail vanishes in seconds. In ice supersaturated air it can last for hours and spread into a thin cloud.',
  'By day, contrails reflect some sunlight back to space. At night there is no sunlight to reflect, so they only trap heat.',
  'Overall, scientists think contrails warm the planet. Night-time contrails are a big part of that.',
  'A small number of flights make most of the warming contrails. Changing the height of just those flights could help a lot.',
  'ISSRs are often only a few hundred metres thick. Flying a little higher or lower can be enough to miss them.',
  'SAF makes less soot. Fewer soot particles means fewer ice crystals, so contrails are thinner and fade sooner.',
  'Hydrogen planes make no CO2, but they make lots of water vapour, so they can still make contrails.',
  'Taking off and climbing burns lots of fuel. That is why short flights make the most CO2 per kilometre.',
  'Trees take CO2 out of the air as they grow, but it takes many years. Not making the CO2 in the first place works faster.',
];

const $ = id => document.getElementById(id);
const sign = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v);

export class UI {
  constructor(save, { onStart }) {
    this.save = save;
    this.onStart = onStart;
    this.toastTimer = null;

    $('goBtn').onclick = () => this.start();
    $('againBtn').onclick = () => this.start();
    $('hangarBtn').onclick = () => this.showHangar('title');
    $('rHangarBtn').onclick = () => this.showHangar('results');
    $('hBackBtn').onclick = () => (this.hangarFrom === 'results' ? this.showOnly('results') : this.showTitle());
    $('resetBtn').onclick = () => {
      if (!confirm('Delete all trees, upgrades and badges on this device?')) return;
      Object.assign(this.save, resetSave());
      this.renderHangar();
    };
    this.setupMute();
    this.setupRealTree();
    window.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && !$('title').hidden) { e.preventDefault(); this.start(); }
    });
  }

  start() {
    unlockAudio();
    this.showOnly(null);
    this.onStart();
  }

  showOnly(id) {
    for (const s of ['title', 'results', 'hangar']) $(s).hidden = s !== id;
  }

  showTitle() {
    $('tTrees').textContent = this.save.trees;
    $('tBest').textContent = this.save.bestDistance;
    this.showOnly('title');
  }

  // ---------- results ----------
  showResults(r) {
    $('rEyebrow').textContent = r.landed ? 'Flight complete' : 'Flight over';
    $('rTitle').textContent = r.landed ? `Landed in ${r.landedAt}!` : r.reason.replace('\n', ' ');
    $('rRecord').hidden = !r.newRecord;
    $('rDist').textContent = r.distance;

    const b = r.breakdown;
    const scale = Math.max(30, b.co2 + b.night, b.sun + b.trees);
    const pct = v => `${Math.min(100, (v / scale) * 100)}%`;
    $('barCo2').style.width = pct(b.co2);
    $('barNight').style.width = pct(b.night);
    $('barSun').style.width = pct(b.sun);
    $('barTrees').style.width = pct(b.trees);
    $('rCo2').textContent = sign(Math.round(b.co2));
    $('rNight').textContent = sign(Math.round(b.night));
    $('rSun').textContent = sign(-Math.round(b.sun));
    $('rTreesCool').textContent = sign(-Math.round(b.trees));
    $('rTotal').textContent = sign(r.heat);
    $('rFace').textContent = r.heat < 0 ? '(cooler!)' : r.heat < 50 ? '(a bit warmer)' : '(much warmer)';
    $('rPerKm').textContent = r.co2PerKm;

    $('rEarned').innerHTML = r.earned.map(e =>
      `<li class="${e.lost ? 'lost' : ''}"><span>${e.label}</span><b>${e.lost ? 'lost' : '+' + e.n}</b></li>`).join('') +
      `<li><span><b>Total trees</b></span><b>${this.save.trees}</b></li>`;

    const nb = r.newBadges.map(id => BADGES.find(x => x.id === id)?.name).filter(Boolean);
    $('rBadges').hidden = !nb.length;
    $('rBadges').innerHTML = nb.length ? `NEW BADGE${nb.length > 1 ? 'S' : ''}: <b>${nb.join(', ')}</b>` : '';
    $('rFact').textContent = FACTS[Math.floor(Math.random() * FACTS.length)];
    this.showOnly('results');
  }

  // ---------- hangar ----------
  showHangar(from) {
    this.hangarFrom = from;
    this.renderHangar();
    this.showOnly('hangar');
  }

  renderHangar() {
    const s = this.save;
    $('hTrees').textContent = s.trees;

    const fuels = ['kerosene', 'saf', 'hydrogen'].filter(f => f === 'kerosene' || owns(s, f));
    $('hFuel').innerHTML = fuels.length > 1
      ? 'Fuel: ' + fuels.map(f => `<button class="btn ${s.fuel === f ? 'on' : ''}" data-fuel="${f}" type="button">${FUELS[f].name}</button>`).join('')
      : '';
    $('hFuel').querySelectorAll('[data-fuel]').forEach(btn => btn.onclick = () => {
      s.fuel = btn.dataset.fuel; writeSave(s); sfx.coin(); this.renderHangar();
    });

    $('hUpgrades').innerHTML = UPGRADES.map(u => {
      const have = owns(s, u.id);
      const locked = u.needs && !owns(s, u.needs);
      const needName = locked ? UPGRADES.find(x => x.id === u.needs).name : '';
      const btn = have ? '<b>OWNED</b>'
        : locked ? `<span class="small">needs ${needName}</span>`
        : `<button class="btn ${canBuy(s, u) ? 'go' : ''}" data-buy="${u.id}" type="button" ${canBuy(s, u) ? '' : 'disabled'}>${u.cost} trees</button>`;
      return `<div class="up ${have ? 'owned' : ''} ${locked ? 'locked' : ''}">
        <div><div class="track">${u.track}</div><div class="name">${u.name}</div></div>${btn}
        <p class="blurb">${u.blurb}</p><p class="sci">${u.science}</p></div>`;
    }).join('');
    $('hUpgrades').querySelectorAll('[data-buy]').forEach(btn => btn.onclick = () => this.buy(btn.dataset.buy));

    $('hBadges').innerHTML = BADGES.map(b =>
      `<div class="badge ${s.badges.includes(b.id) ? 'got' : ''}"><b>${b.name}</b>${b.desc}</div>`).join('');
  }

  buy(id) {
    const s = this.save, u = UPGRADES.find(x => x.id === id);
    if (!canBuy(s, u)) { sfx.nope(); return; }
    s.trees -= u.cost;
    s.owned.push(id);
    if (id === 'saf' || id === 'hydrogen') s.fuel = id;         // equip new fuel straight away
    if (id === 'hydrogen' && !s.badges.includes('zeroCarbon')) s.badges.push('zeroCarbon');
    writeSave(s);
    sfx.buy();
    this.renderHangar();
  }

  setupRealTree() {
    const btn = $('realTreeBtn');
    let timer = null;
    const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      $('gateMsg').hidden = false;
      btn.classList.add('holding');
      timer = setTimeout(() => { cancel(); window.open(CITIZEN_ZOO_URL, '_blank', 'noopener'); }, 2000);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => btn.addEventListener(ev, cancel));
    btn.addEventListener('click', e => e.preventDefault());
  }

  setupMute() {
    const btn = $('muteBtn');
    const apply = () => { setMuted(this.save.muted); btn.textContent = `sound: ${this.save.muted ? 'off' : 'on'}`; };
    btn.onclick = () => { this.save.muted = !this.save.muted; writeSave(this.save); apply(); };
    apply();
  }

  // ---------- in-flight tips ----------
  toast(title, body, kind = '', secs = 3.5) {
    const t = $('toast');
    t.className = `toast ${kind}`;
    t.innerHTML = `<b>${title}</b>${body}`;
    t.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => (t.hidden = true), secs * 1000);
  }
  hideToast() { clearTimeout(this.toastTimer); $('toast').hidden = true; }

  // Show a tip only the first time on this device.
  tipOnce(id, title, body, kind, secs) {
    if (this.save.seenTips.includes(id)) return false;
    this.save.seenTips.push(id);
    writeSave(this.save);
    this.toast(title, body, kind, secs);
    return true;
  }
}
