// LEARN MORE (Oliver, 2026-11-19): a real organisation or research programme behind a nature project or a plane part,
// one tap from the card that says it is done. The link sits behind the grown-up gate (hold 2 s), as the org links in the
// project info (src/wild.js orgHTML): the game is for children and never sends them off-site on one tap.
// Every URL here was opened in headless Chrome on 2026-11-19 (tools/linkcheck.cjs); tests/learnmore.cjs checks the shape.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The research behind the 2030s and far-future plane parts, by level name (src/fleet.js; names must match exactly).
// Only parts with a real programme of that name; a part with none gets no LEARN MORE.
const RISE = { name: 'CFM RISE open-fan engine (GE Aerospace)', url: 'https://www.geaerospace.com/news/articles/product/future-flight-engine-maker-unveils-new-technology-development-program-cut-co2' };
const JETZERO = { name: 'JetZero blended-wing airliner', url: 'https://www.jetzero.aero/' };
export const PART_RESEARCH = {
  'Open-fan engines: no casing round the fan': RISE,
  'Bigger open fans': RISE,
  'Hybrid-electric assist': { name: 'NASA electric powertrain flight tests', url: 'https://www.nasa.gov/directorates/armd/iasp/epfd/' },
  'Folding wingtips (fit at the gate)': { name: 'NASA Sustainable Flight Demonstrator', url: 'https://www.nasa.gov/directorates/armd/iasp/sfd/' },
  'Blended wing body (JetZero, 2030)': JETZERO,
  'Wide cabin in the wing': JETZERO,
  'Fuel-cell pods along the wing': { name: 'Airbus ZEROe hydrogen aircraft', url: 'https://www.airbus.com/en/innovation/energy-transition/hydrogen/zeroe-our-hydrogen-powered-aircraft' },
  'Superconducting motors': { name: 'Airbus Cryoprop superconducting motor', url: 'https://www.airbus.com/en/newsroom/press-releases/2024-05-airbus-takes-superconductivity-research-for-hydrogen-powered' },
  'Insulated liquid-hydrogen tanks': { name: 'FlyZero hydrogen aircraft study (UK)', url: 'https://www.ati.org.uk/what-we-do/research-innovation/flyzero/' },
};

// The LEARN MORE button (a hold-to-open gate) and the link it shows. `who` = the organisation's name.
export function learnHTML(who, url) {
  return `<div class="learn"><button class="btn gate learn-gate" type="button"><span class="gate-fill"></span><span class="gate-label">LEARN MORE</span></button>
    <p class="small learn-msg">Grown-ups: press and hold for 2 seconds.</p>
    <p class="learn-link" hidden><a href="${esc(url)}" target="_blank" rel="noopener">${esc(who)} &gt;</a></p></div>`;
}

// Hold 2 s: the link shows (and hides again after 10 s, or 0.5 s after it is opened), as the gate in src/wild.js.
export function wireLearn(root) {
  const btn = root && root.querySelector('.learn-gate'); if (!btn) return;
  const msg = root.querySelector('.learn-msg'), box = root.querySelector('.learn-link');
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
