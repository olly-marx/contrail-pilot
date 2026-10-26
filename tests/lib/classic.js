// Since 0.12.0 index.html turns season 2 ON for everyone (window.SEASON2_FORCE = true unless it is already `false`).
// Most tests were written for the classic game (one London-first world, the real save, online), so requiring this
// file DECLARES that: every browser context a test makes gets window.SEASON2_FORCE = false before the page's scripts
// run (then the ?season2=1 / ?season2=off switch of src/season2.js works as before). A test that wants the shipped
// default adds its own init script after (`window.SEASON2_FORCE = undefined`); tests/season2.cjs does.
const { chromium } = require('playwright-core');
if (!chromium.__classic) {
  const launch = chromium.launch.bind(chromium);
  const declare = ctx => ctx.addInitScript(() => { window.SEASON2_FORCE = false; }).then(() => ctx);
  chromium.launch = async (...a) => {
    const b = await launch(...a), newContext = b.newContext.bind(b), newPage = b.newPage.bind(b);
    b.newContext = async (...o) => declare(await newContext(...o));
    b.newPage = async (...o) => { const p = await newPage(...o); await p.context().addInitScript(() => { window.SEASON2_FORCE = false; }); return p; };
    return b;
  };
  chromium.__classic = true;
}
