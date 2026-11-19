// LEARN MORE (Oliver, 2026-11-19): a real organisation or research programme behind a nature project or a plane part,
// one tap from the card that says it is done. A plain link (Oliver, 2026-11-19: the grown-up hold is gone everywhere).
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

// LEARN MORE: a plain link styled as a button (Oliver, 2026-11-19: no grown-up hold, "let people just click the button").
// `who` = the organisation's name (the link's title).
export function learnHTML(who, url) {
  return `<a class="btn learn-btn" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(who)}">LEARN MORE</a>`;
}
