// Run a (formerly classic) browser test against the game AS SHIPPED: season 2 (test-speed triage, 2026-10-27; classic is retired,
// index.html forces season 2 so no player reaches classic). `require('./lib/shipped.js')` where a test used `require('./lib/classic.js')`.
// Season 2 keeps its save under 's2:' keys; a test that writes 'contrailPilot.v2' directly gets a shim that prefixes the keys it touches (the
// page's own season-2 layer already prefixes: a key that starts with 's2:' is left alone). A save with no `areas` gets the first starter
// area (West Europe, LONDON unless the save names a city), so the start choice does not cover TAKE OFF. Nothing else changes.
// Proven 2026-10-27: the same page reports window.SEASON2 false without it and true (season-2 tag showing) with it.
const { chromium } = require('playwright-core');
if (!chromium.__classic) {
  const shim = () => { const P = 's2:', pro = Storage.prototype, g = pro.getItem, s = pro.setItem, r = pro.removeItem, pre = k => (String(k).startsWith(P) ? String(k) : P + k);
    pro.getItem = function (k) { return g.call(this, pre(k)); }; pro.setItem = function (k, v) {
      // A classic save has no start area, so the shipped game would put the start choice over TAKE OFF: give it the first starter area (and keep a city the save already names).
      if (pre(k) === 's2:contrailPilot.v2') try { const o = JSON.parse(v); if (o && typeof o === 'object' && !Array.isArray(o.areas)) { o.areas = ['weurope']; o.homeArea = 'weurope'; o.city = o.city || 'LONDON'; v = JSON.stringify(o); } } catch (e) {}
      return s.call(this, pre(k), v); }; pro.removeItem = function (k) { return r.call(this, pre(k)); }; };
  const launch = chromium.launch.bind(chromium);
  chromium.launch = async (...a) => {
    const b = await launch(...a), newContext = b.newContext.bind(b), newPage = b.newPage.bind(b);
    b.newContext = async (...o) => { const c = await newContext(...o); await c.addInitScript(shim); return c; };
    b.newPage = async (...o) => { const p = await newPage(...o); await p.context().addInitScript(shim); return p; };
    return b;
  };
  chromium.__classic = true;
}
