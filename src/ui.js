// HTML screens around the game: title, results, hangar (shop), info pop-ups, tips and flight school.
import { LINES, BADGES, FUELS, level, nextLevel, canBuy, fuelChoices } from './upgrades.js';
import { LINKS } from './links.js';
import { writeSave, resetSave } from './save.js';
import { sfx, setMuted, unlockAudio } from './sound.js';

export const FACTS = [
  'Contrail means "condensation trail". It is made of tiny bits of ice.',
  'Where planes fly, the air is colder than -40 C. Much colder than your freezer!',
  'In dry air a contrail is gone in seconds. In icy air it can stay for hours.',
  'In the day, contrails bounce some sunlight back to space. At night they only keep heat in.',
  'Scientists think contrails warm the Earth overall. Night contrails are a big part of that.',
  'Only a few flights make most of the warming contrails. Changing their height could help a lot!',
  'Icy air is often thin. Flying a little higher or lower can be enough to miss it.',
  'SAF can be made from old cooking oil, like the oil used to fry chips!',
  'Hydrogen planes make no CO2, but they make lots of water. So they can still make contrails.',
  'Taking off burns lots of fuel. That is why short flights make the most CO2 for each km.',
  'Trees take CO2 out of the air, but it takes many years. Not making CO2 works faster.',
];

const $ = id => document.getElementById(id);
const sign = v => (v > 0 ? '+' : v < 0 ? '-' : '') + Math.abs(v);

export class UI {
  constructor(save, { onStart, onSchool }) {
    this.save = save;
    this.onStart = onStart;
    this.onSchool = onSchool;
    this.toastTimer = null;

    $('goBtn').onclick = () => this.start();
    $('againBtn').onclick = () => this.start();
    $('schoolBtn').onclick = () => this.startSchool();
    $('hangarBtn').onclick = () => this.showHangar('title');
    $('rHangarBtn').onclick = () => this.showHangar('results');
    $('hBackBtn').onclick = () => (this.hangarFrom === 'results' ? this.showOnly('results') : this.showTitle());
    $('iClose').onclick = () => { $('info').hidden = true; };
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

  // First play goes through flight school.
  start() {
    if (!this.save.tutorialDone) return this.startSchool();
    unlockAudio();
    this.showOnly(null);
    this.onStart();
  }

  startSchool() {
    unlockAudio();
    this.showOnly(null);
    this.onSchool();
  }

  showOnly(id) {
    for (const s of ['title', 'results', 'hangar']) $(s).hidden = s !== id;
  }

  showTitle() {
    $('tTrees').textContent = this.save.trees;
    $('tBest').textContent = this.save.bestDistance;
    $('goBtn').textContent = this.save.tutorialDone ? 'TAKE OFF' : 'START';
    this.showOnly('title');
  }

  // ---------- results ----------
  showResults(r) {
    $('rEyebrow').textContent = r.school ? 'Flight school complete!' : r.landed ? 'Flight complete' : 'Flight over';
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
    $('rFace').textContent = r.heat < 0 ? '(cooler!)' : r.heat < 50 ? '(a bit hotter)' : '(much hotter)';
    $('rPerKm').textContent = r.co2PerKm;

    $('rEarned').innerHTML = r.earned.map(e =>
      `<li class="${e.lost ? 'lost' : ''}"><span>${e.label}</span><b>${e.lost ? 'LOST' : '+' + e.n}</b></li>`).join('') +
      (r.landed ? '' : '<li class="lost"><span>You only keep trees if you land!</span></li>') +
      `<li><span><b>Your trees</b></span><b>${this.save.trees}</b></li>`;

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

    const choices = fuelChoices(s);
    const current = choices.includes(s.fuel) ? s.fuel : choices[choices.length - 1];
    $('hFuel').innerHTML = choices.length > 1
      ? 'Fuel: ' + choices.map(f => `<button class="btn ${current === f ? 'on' : ''}" data-fuel="${f}" type="button">${FUELS[f].name}</button>`).join('')
      : '';
    $('hFuel').querySelectorAll('[data-fuel]').forEach(btn => btn.onclick = () => {
      s.fuel = btn.dataset.fuel; writeSave(s); sfx.coin(); this.renderHangar();
    });

    $('hUpgrades').innerHTML = LINES.map(line => {
      const have = level(s, line.id), next = nextLevel(s, line);
      const pips = line.levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
      const nowName = have ? line.levels[have - 1].name : 'Not yet';
      const nextRow = next
        ? `<div class="next"><span>Next: <b>${next.name}</b>. ${next.short}</span>
             <button class="btn ${canBuy(s, line) ? 'go' : ''}" data-buy="${line.id}" type="button" ${canBuy(s, line) ? '' : 'disabled'}>${next.cost} trees</button></div>`
        : '<div class="next"><span><b>All done!</b></span></div>';
      return `<div class="line ${next ? '' : 'maxed'}">
        <div><div class="group">${line.group}</div><div class="name">${line.name}</div><div class="small">${nowName}</div><div class="pips">${pips}</div></div>
        <button class="infobtn" data-info="${line.id}" type="button" aria-label="About ${line.name}">i</button>
        ${nextRow}</div>`;
    }).join('');
    $('hUpgrades').querySelectorAll('[data-buy]').forEach(btn => btn.onclick = () => this.buy(btn.dataset.buy));
    $('hUpgrades').querySelectorAll('[data-info]').forEach(btn => btn.onclick = () => this.showInfo(btn.dataset.info));

    $('hBadges').innerHTML = BADGES.map(b =>
      `<div class="badge ${s.badges.includes(b.id) ? 'got' : ''}"><b>${b.name}</b>${b.desc}</div>`).join('');
  }

  buy(id) {
    const s = this.save, line = LINES.find(l => l.id === id), next = nextLevel(s, line);
    if (!canBuy(s, line)) { sfx.nope(); return; }
    s.trees -= next.cost;
    s.levels[id] = level(s, id) + 1;
    if (next.fuel) s.fuel = next.fuel;              // switch to the new fuel straight away
    if (next.fuel === 'hydrogen' && !s.badges.includes('zeroCarbon')) s.badges.push('zeroCarbon');
    writeSave(s);
    sfx.buy();
    this.renderHangar();
  }

  showInfo(id) {
    const line = LINES.find(l => l.id === id), have = level(this.save, id);
    $('iGroup').textContent = line.group;
    $('iName').textContent = line.name;
    $('iLevels').innerHTML = line.levels.map((l, i) =>
      `<li class="${i < have ? 'have' : ''}"><b>${l.name}</b> (${l.cost} trees): ${l.short}${i < have ? ' - yours!' : ''}</li>`).join('');
    $('iWhat').textContent = line.info.what;
    $('iWhy').textContent = line.info.why;
    $('iFact').textContent = line.info.fact;
    $('iLinks').innerHTML = line.info.links.map(k => {
      const l = LINKS[k];
      return l.url ? `<a href="${l.url}" target="_blank" rel="noopener">${l.label} &gt;</a>` : `<span>${l.label} (coming soon)</span>`;
    }).join('');
    $('info').hidden = false;
  }

  setupRealTree() {
    const btn = $('realTreeBtn');
    let timer = null;
    const cancel = () => { clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    btn.addEventListener('pointerdown', e => {
      e.preventDefault();
      $('gateMsg').hidden = false;
      btn.classList.add('holding');
      timer = setTimeout(() => { cancel(); window.open(LINKS.citizenzoo.url, '_blank', 'noopener'); }, 2000);
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
    if (!$('coach').hidden) return;   // flight school talks instead
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

  // ---------- flight school ----------
  // waiting=true: the game is frozen and a tap on the bubble (or screen) continues.
  coach(text, waiting) {
    $('coachText').innerHTML = text;
    $('coachTap').hidden = !waiting;
    $('coach').classList.toggle('waiting', !!waiting);
    $('coach').hidden = false;
    $('skipSchool').hidden = false;
  }
  hideCoach() { $('coach').hidden = true; $('skipSchool').hidden = true; }
}
