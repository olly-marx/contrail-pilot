// The ONE pop-up (research/UX-MASTER-PLAN.md B8, D2): eyebrow, title, body (<= SHEET_WORDS words), optional picture, optional one
// action, OK. Closes on OK or a tap outside the card; fits 320x568 (tests/fitscreen.cjs). It replaces #info / #wInfo over time (R10);
// in R0 nothing calls it yet, so it is inert. Built on first use (no markup in index.html).
export const SHEET_WORDS = 60;
export const wordCount = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;

// opts: { eyebrow, title, body | html, pic (url), action: { label, onTap }, ok: 'OK' }. Returns the close function.
export function showSheet(opts = {}) {
  let el = document.getElementById('sheet');
  if (el) el.remove();
  el = document.createElement('section');
  el.id = 'sheet'; el.className = 'overlay top sheet-wrap';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  el.innerHTML = '<div class="sheet card" role="dialog">'
    + (opts.eyebrow ? `<p class="eyebrow">${esc(opts.eyebrow)}</p>` : '')
    + `<h2 class="sheet-title">${esc(opts.title)}</h2>`
    + (opts.pic ? `<img class="sheet-pic" src="${esc(opts.pic)}" alt="">` : '')
    + (opts.html ? `<div class="sheet-body">${opts.html}</div>` : `<p class="sheet-body">${esc(opts.body)}</p>`)   // html: markup built by the caller from numbers it owns (R1: the tally rows, the Earth bars)
    + '<div class="sheet-buttons">'
    + (opts.action ? `<button class="btn go sheet-action" type="button">${esc(opts.action.label)}</button>` : '')
    + `<button class="btn sheet-ok${opts.action ? '' : ' go'}" type="button">${esc(opts.ok || 'OK')}</button></div></div>`;
  document.body.appendChild(el);
  const close = () => { el.remove(); };
  el.querySelector('.sheet-ok').onclick = close;
  el.onclick = e => { if (e.target === el) close(); };   // a tap outside the card
  const a = el.querySelector('.sheet-action');
  if (a) a.onclick = () => { close(); opts.action.onTap && opts.action.onTap(); };
  return close;
}
