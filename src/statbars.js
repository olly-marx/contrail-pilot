// Stat bars (plane build, 2026-10-28; shared with NATURE): one bar per stat, NOW against THEN (what a purchase would make it).
// The user: "If it's stats only, we should have a BAR that measures that stat, which we see get lower."
//   statBarsHTML(rows) -> HTML. rows: [{ label, now, then, min, max, better: 'higher' | 'lower', onoff }]
//     solid fill = what stays; stripes = what the purchase adds (better 'higher') or takes away (better 'lower');
//     the delta ("-12%") is coloured by whether the change is good.
//   animateBars(root): every bar in root slides from NOW to THEN (the stripes go solid / vanish). Call it after the
//     HTML is in the page; CSS does the motion (.sbar-fill transition).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const frac = (r, v) => clamp((v - r.min) / ((Math.max(r.max, r.now, r.then) - r.min) || 1), 0, 1);
const pct = v => `${(v * 100).toFixed(1)}%`;

export function deltaText(r) {
  if (r.onoff) return r.then ? 'ON' : 'OFF';
  if (!r.now) return r.then ? 'NEW' : '';
  const d = (r.then - r.now) / Math.abs(r.now) * 100;
  return `${d > 0 ? '+' : ''}${Math.abs(d) < 1 ? d.toFixed(1) : Math.round(d)}%`;
}
export const isBetter = r => (r.better === 'lower' ? r.then < r.now : r.then > r.now);

export function barHTML(r) {
  const a = r.onoff ? (r.now ? 1 : 0) : frac(r, r.now), b = r.onoff ? (r.then ? 1 : 0) : frac(r, r.then);
  const solid = Math.min(a, b), ghost = Math.abs(b - a), good = isBetter(r);
  return `<div class="sbar" data-now="${a}" data-then="${b}"><span class="sbar-label">${r.label}</span>`
    + `<span class="sbar-track"><span class="sbar-fill" style="width:${pct(a)}"></span>`
    + `<span class="sbar-ghost ${b > a ? 'add' : 'cut'}" style="left:${pct(solid)};width:${pct(ghost)}"></span></span>`
    + `<span class="sbar-delta ${good ? 'good' : 'bad'}">${deltaText(r)}</span></div>`;
}
export const statBarsHTML = rows => `<div class="sbars">${rows.map(barHTML).join('')}</div>`;

export function animateBars(root) {
  (root || document).querySelectorAll('.sbar').forEach(el => {
    const fill = el.querySelector('.sbar-fill'), ghost = el.querySelector('.sbar-ghost');
    fill.style.width = pct(+el.dataset.then); ghost.style.opacity = '0'; el.classList.add('done');
  });
}
