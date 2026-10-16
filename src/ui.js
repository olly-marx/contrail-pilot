// HTML screens around the game: title, results, hangar (shop), info pop-ups, tips and flight school.
import { LINES, BADGES, FUELS, level, nextLevel, canBuy, fuelChoices, unlocked, unlockText, needsMoreNature } from './upgrades.js';
import { biodiversity, stage, STAGES, NATURE_FACTS, SPECIES } from './nature.js';
import { LINKS } from './links.js';
import { writeSave, resetSave } from './save.js';
import { sfx, setMuted, unlockAudio } from './sound.js';

export const FACTS_BASE = [
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

export const FACTS = [...FACTS_BASE, ...NATURE_FACTS];
const $ = id => document.getElementById(id);

// The Wild Land meter as HTML: a bar plus the stage name.
export function meterHTML(save) {
  const b = biodiversity(save), st = stage(b);
  return `<div class="meter"><span class="mlabel">Wild Land</span><span class="mtrack"><span class="mfill" style="width:${b}%"></span>${STAGES.slice(1).map(x => `<i style="left:${x.at}%"></i>`).join('')}</span><b>${st.name}</b></div>`;
}
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
    $('hGoBtn').onclick = () => this.start();
    $('hGoTop').onclick = () => this.start();
    $('howBtn').onclick = () => { $('how').hidden = false; };
    $('howClose').onclick = () => { $('how').hidden = true; };
    // Tap anywhere on the results while it is revealing to skip to the end.
    $('results').addEventListener('pointerdown', () => { this.skipReveal = true; }, true);
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
    $('tNew').hidden = !this.hasNew();
    const any = Object.values(this.save.planted || {}).some(n => n > 0);
    $('tMeter').innerHTML = any ? meterHTML(this.save) : '';
    this.showOnly('title');
  }

  // ---------- results ----------
  // Something to spend in the hangar? Drives the NEW! tags and the glowing button.
  hasNew() { return !!this.save.freeUpgrade || LINES.some(l => canBuy(this.save, l)); }   // canBuy checks unlocks

  // Arcade-style reveal: title slams in, distance counts up, trees tally, the total stamps down,
  // then the Earth bars grow one by one. A tap skips to the end.
  async showResults(r) {
    const steps = [...document.querySelectorAll('#results .step')];
    steps.forEach(el => el.classList.remove('in'));
    this.skipReveal = false;
    const wait = ms => new Promise(res => (this.skipReveal ? res() : setTimeout(res, ms)));
    const show = el => el.classList.add('in');
    const count = async (el, to, ms, fmt = v => v) => {
      const t0 = performance.now();
      while (!this.skipReveal) {
        const f = Math.min(1, (performance.now() - t0) / ms);
        el.textContent = fmt(Math.round(to * f));
        if (f >= 1) break;
        await new Promise(res => requestAnimationFrame(res));
      }
      el.textContent = fmt(to);
    };

    $('rTitle').textContent = r.school ? 'Flight school done!' : r.landed ? `Landed in ${r.landedAt}!` : r.reason.replace('\n', ' ');
    $('rRecord').hidden = !r.newRecord;
    $('rDist').textContent = '0';
    $('rGrab').textContent = '0';
    $('rMultRow').hidden = true; $('rCoolRow').hidden = true; $('rLost').hidden = true;
    $('rNatureRow').hidden = true;
    $('rNature').textContent = `+${r.natureGain}`;
    $('rTotalRow').classList.remove('zero', 'stamp');
    $('rGain').textContent = '+0';
    for (const id of ['barCo2', 'barNight', 'barSun', 'barTrees']) $(id).style.width = '0';
    for (const id of ['rCo2', 'rNight', 'rSun', 'rTreesCool']) $(id).textContent = '';
    $('rFree').hidden = !this.save.freeUpgrade;
    $('rSkip').hidden = false;
    $('rHangarBtn').classList.toggle('glow', this.hasNew());
    $('rNew').hidden = !this.hasNew();
    $('rHangarBtn').firstChild.textContent = this.save.freeUpgrade ? 'FREE UPGRADE ' : 'HANGAR ';
    const nb = r.newBadges.map(id => BADGES.find(x => x.id === id)?.name).filter(Boolean);
    $('rBadges').hidden = !nb.length;
    $('rBadges').innerHTML = nb.length ? `NEW BADGE: <b>${nb.join(', ')}</b>` : '';
    $('rFact').textContent = FACTS[Math.floor(Math.random() * FACTS.length)];
    this.showOnly('results');

    const [title, dist, record, tally, earth, ...rest] = steps;
    show(title);
    await wait(350);
    show(dist); await count($('rDist'), r.distance, 600);
    if (r.newRecord) { show(record); sfx.buy(); }
    await wait(200);

    // Trees: tally what was grabbed, then the bonuses, then stamp the total.
    show(tally);
    const grab = r.earned[0] ? r.earned[0].n : 0;
    await count($('rGrab'), grab, 400);
    const mult = r.earned.find(e => e.label.startsWith('Long'));
    if (mult) { await wait(250); $('rMultRow').hidden = false; $('rMult').textContent = `x${(1 + mult.n / Math.max(1, grab)).toFixed(1).replace('.0', '')}`; $('rMultRow').classList.add('stamp'); sfx.coin(); }
    if (r.earned.some(e => e.label.startsWith('Cool'))) { await wait(250); $('rCoolRow').hidden = false; $('rCoolRow').classList.add('stamp'); sfx.coin(); }
    if (r.natureGain > 0) { await wait(250); $('rNatureRow').hidden = false; $('rNatureRow').classList.add('stamp'); sfx.plant(); }
    await wait(300);
    const total = r.earned.reduce((a, e) => a + e.n, 0);
    if (r.landed) {
      $('rTotalRow').classList.add('stamp');
      await count($('rGain'), total, 300, v => `+${v}`);
      if (total) sfx.buy();
    } else {
      $('rGain').textContent = `+${total}`;
      await wait(300);
      $('rTotalRow').classList.add('zero', 'stamp');
      $('rLost').hidden = false;
      sfx.nope();
    }
    await wait(450);

    // The Earth: each cause grows in turn.
    show(earth);
    this.drawEarthFace($('rFace'), r.heat);
    const b = r.breakdown;
    const scale = Math.max(30, b.co2, b.night, b.sun, b.trees);
    const bars = [['barCo2', 'rCo2', b.co2, '+'], ['barNight', 'rNight', b.night, '+'], ['barSun', 'rSun', b.sun, '-'], ['barTrees', 'rTreesCool', b.trees, '-']];
    for (const [bar, label, v, sg] of bars) {
      $(bar).style.width = `${Math.min(100, (v / scale) * 100)}%`;
      $(label).textContent = `${sg}${Math.round(v)}`;
      if (v >= 0.5) { sg === '+' ? sfx.warm() : sfx.cool(); await wait(380); }
    }
    await wait(200);
    for (const el of rest) { if (!el.hidden) show(el); }
    $('rSkip').hidden = true;
  }

  // Small pixel Earth for the results, matching the in-game face.
  drawEarthFace(el, heat) {
    const mood = heat < 0 ? 0 : heat < 50 ? 1 : heat < 80 ? 2 : 3;
    const body = ['3fa8e0', '5fb860', 'e8a33c', 'e0483c'][mood];
    const mouth = ["<rect x='6' y='11' width='1' height='1'/><rect x='7' y='12' width='4' height='1'/><rect x='11' y='11' width='1' height='1'/>",
      "<rect x='7' y='12' width='4' height='1'/>",
      "<rect x='7' y='11' width='4' height='1'/><rect x='6' y='12' width='1' height='1'/><rect x='11' y='12' width='1' height='1'/>",
      "<rect x='7' y='11' width='4' height='1'/><rect x='6' y='12' width='1' height='1'/><rect x='11' y='12' width='1' height='1'/>"][mood];
    const sweat = mood >= 2 ? "<rect x='14' y='3' width='2' height='3' fill='%239fe0ff'/>" + (mood === 3 ? "<rect x='1' y='6' width='2' height='3' fill='%239fe0ff'/>" : '') : '';
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 18' shape-rendering='crispEdges'><rect x='4' y='0' width='10' height='18'/><rect x='0' y='4' width='18' height='10'/><rect x='2' y='2' width='14' height='14'/><g fill='%23${body}'><rect x='5' y='1' width='8' height='16'/><rect x='1' y='5' width='16' height='8'/><rect x='3' y='3' width='12' height='12'/></g><rect x='4' y='5' width='3' height='3' fill='%232f7a2f'/><rect x='12' y='10' width='3' height='2' fill='%232f7a2f'/><rect x='6' y='7' width='2' height='2'/><rect x='10' y='7' width='2' height='2'/>${mouth}${sweat}</svg>`;
    el.style.backgroundImage = `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
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
    const free = !!s.freeUpgrade;
    $('hHint').innerHTML = free ? '<b>Pick ONE upgrade for FREE!</b> Tap <b>i</b> to learn what it does.' : 'Spend your trees. Tap <b>i</b> to learn more.';

    const choices = fuelChoices(s);
    const current = choices.includes(s.fuel) ? s.fuel : choices[choices.length - 1];
    $('hFuel').innerHTML = choices.length > 1
      ? 'Fuel: ' + choices.map(f => `<button class="btn ${current === f ? 'on' : ''}" data-fuel="${f}" type="button">${FUELS[f].name}</button>`).join('')
      : '';
    $('hFuel').querySelectorAll('[data-fuel]').forEach(btn => btn.onclick = () => {
      s.fuel = btn.dataset.fuel; writeSave(s); sfx.coin(); this.renderHangar();
    });

    let lastGroup = null;
    $('hUpgrades').innerHTML = LINES.map(line => {
      // The Nature group gets a header with the Wild Land meter.
      const head = line.group === 'Nature' && lastGroup !== 'Nature' && unlocked(s, line)
        ? `<div class="nature-head"><h3>NATURE</h3>${meterHTML(s)}<p class="small">Plant different kinds of trees and rewild land to fill it.</p></div>` : '';
      lastGroup = line.group;
      if (!unlocked(s, line)) {
        return `<div class="line locked"><div><div class="group">${line.group}</div><div class="name">???</div><div class="small">${unlockText(line)}</div></div></div>`;
      }
      const have = level(s, line.id), next = nextLevel(s, line);
      const pips = line.levels.map((_, i) => `<span class="pip ${i < have ? 'on' : ''}"></span>`).join('');
      const nowName = have ? line.levels[have - 1].name : 'Not yet';
      const waitBio = needsMoreNature(s, line);
      const isFree = free && next && have === 0 && !waitBio;
      const ok = isFree || canBuy(s, line);
      const btn = waitBio ? `<span class="small">needs Wild Land ${next.needsBio}</span>`
        : `<button class="btn ${isFree ? 'free' : ok ? 'go' : ''}" data-buy="${line.id}" type="button" ${ok ? '' : 'disabled'}>${isFree ? 'FREE!' : next.cost + ' trees'}</button>`;
      const nextRow = next
        ? `<div class="next"><span>Next: <b>${next.name}</b>. ${next.short}</span>${btn}</div>`
        : '<div class="next"><span><b>All done!</b></span></div>';
      return head + `<div class="line ${next ? '' : 'maxed'} ${isFree ? 'pick' : ''}">
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
    const isFree = s.freeUpgrade && level(s, id) === 0;
    if (!isFree && !canBuy(s, line)) { sfx.nope(); return; }
    if (isFree) s.freeUpgrade = false; else s.trees -= next.cost;
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
      `<li class="${i < have ? 'have' : ''}"><b>${l.name}</b> (${l.cost} trees${l.needsBio ? `, Wild Land ${l.needsBio}` : ''}): ${l.short}${i < have ? ' - yours!' : ''}` +
      (l.species ? `<br><span class="small">${SPECIES[l.species].fact}</span>` : '') + '</li>').join('');
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
  // waiting=true: the game is frozen until the player continues. button=true (the default): only
  // the OK button continues, enabled after a short pause so a tap meant for the plane can't hit it.
  // button=false: a tap anywhere continues (the "tap the screen" lesson in flight school).
  coach(text, waiting, school = true, button = true) {
    $('coachText').innerHTML = text;
    const ok = $('coachOk');
    this.coachButton = !!waiting && button;
    $('coachTap').hidden = !waiting || this.coachButton;
    ok.hidden = !this.coachButton;
    if (this.coachButton) { ok.disabled = true; clearTimeout(this.okTimer); this.okTimer = setTimeout(() => { ok.disabled = false; }, 700); }
    $('coach').classList.toggle('waiting', !!waiting);
    $('coach').hidden = false;
    $('coach').classList.toggle('high', !school);   // explanations sit high, so the ground stays visible
    $('skipSchool').hidden = !school;
  }
  hideCoach() { $('coach').hidden = true; $('skipSchool').hidden = true; this.coachButton = false; }
}
