// Hangar + menus (the fleet hangar since the eras, src/hangar.js, 2026-10-23): buying a level works
// and the screen updates; choosing a plane; next era's levels and planes are blocked; a grey BUY
// says what is missing; the bar along the bottom reaches every screen.
// Run: python3 -m http.server 8000 & npm i --no-save playwright-core && node tests/hangar.cjs
const { chromium } = require('playwright-core');
require('./lib/classic.js');
const { ready, started } = require('./lib/ready.js');
const URL = process.env.URL || 'http://localhost:8000/';

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' });
  const fails = [];
  const check = (c, m) => { if (!c) fails.push(m); };
  // A save with real progress, in the 1970s (2,000 s of flying), flying the 747, magnet at level 2.
  const open = async (crystals, more = {}) => {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.errs = []; p.on('pageerror', e => p.errs.push(String(e)));
    await p.route('https://mkucbsjzbipjaiqzrlkj.supabase.co/**', r => r.abort());
    await p.addInitScript(([c, m]) => { localStorage.clear(); localStorage.setItem('contrailPilot.v2', JSON.stringify({ tutorialDone: true, muted: true, seenTips: ['*'], tours: ['*'], flights: 30, landings: 9, seeds: 1250, crystals: c,
      flightSeconds: 2000, levels: { trees: 1 }, fleet: { plane: 'jumbo', planes: { comet: {}, jumbo: {} }, systems: {}, gadgets: { magnet: 2 } }, ...m })); }, [crystals, more]);
    await p.goto(URL); await ready(p); await p.waitForTimeout(900);
    return p;
  };
  const row = (p, name) => p.evaluate(n => [...document.querySelectorAll('#hFleet .rowc')].find(e => e.querySelector('.rowc-name').textContent === n).textContent.replace(/\s+/g, ' '), name);
  const saved = p => p.evaluate(() => JSON.parse(localStorage.getItem('contrailPilot.v2')));

  // 1. Buy the 1970s magnet level (3): 150 x 0.43 = 65 seeds, 8 crystals.
  let p = await open(150);
  await p.click('#tabHangar'); await p.waitForTimeout(300);
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  await p.click('[data-fbuy="gadget:magnet"]'); await p.waitForTimeout(400);
  // Every purchase plays the payoff (hangar feedback, 2026-10-28): the overlay, then OK keeps you in the hangar.
  await p.waitForSelector('#payOk', { state: 'visible', timeout: 5000 }).catch(() => {});
  check(await p.isVisible('#payOk'), 'buying a gadget did not play the payoff');
  if (await p.isVisible('#payOk')) await p.click('#payOk', { timeout: 4000 }).catch(e => fails.push(`the payoff's OK cannot be tapped (something covers it): ${String(e.message).split('\n')[0].slice(0, 80)}`));
  await p.waitForTimeout(200);
  check(await p.isVisible('#hFleet'), 'after the payoff OK: not in the hangar any more');
  let s = await saved(p);
  check(s.fleet.gadgets.magnet === 3 && s.seeds === 1185 && s.crystals === 142, `magnet 3 bought: ${JSON.stringify({ m: s.fleet.gadgets.magnet, seeds: s.seeds, crystals: s.crystals })}`);
  // (the redesign: the row shows 'Next: …' and the pips; the level you have shows as 3 lit pips, its name in the strip)
  const pipsOn = await p.evaluate(() => document.querySelectorAll('[data-row="gadget:magnet"] .pip.on').length);
  check(pipsOn === 3 && /Next: Stronger coil/.test(await row(p, 'Magnet')), `the row moves on: 3 pips lit (${pipsOn}), "${await row(p, 'Magnet')}"`);
  check(await p.textContent('#hTrees') === '1185', `the seed count on screen drops to 1185: ${await p.textContent('#hTrees')}`);
  // Tap-to-preview (2026-10-28): a row LOW in the list is tapped -> its preview card must be on screen (it is at the top).
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  const low = await p.$$('[data-ftap^="plane:"]');
  const vpLow = p.viewportSize(); await p.setViewportSize({ width: vpLow.width, height: 420 }); await p.waitForTimeout(200);   // (R9/R5 made the page short: on a tall screen no row is ever 'low'; a 420 px screen scrolls)
  if (low.length) { await low[low.length - 1].scrollIntoViewIfNeeded(); await low[low.length - 1].click(); await p.waitForTimeout(900);
    const vis = await p.evaluate(() => { const c = document.getElementById('hPreview'), r = c && c.getBoundingClientRect(); return !!r && r.top >= 0 && r.bottom <= innerHeight && !c.classList.contains('empty'); });
    check(vis, 'a row tapped low in the list: its preview card is not on screen'); }
  await p.setViewportSize(vpLow); await p.waitForTimeout(200);
  // Payoff stage 2 (the redesign, the user's pick): BUY from far down the list: the payoff takes the plane box's place and is
  // scrolled into view (stage 1's overlay sat off the box after Chrome's scroll anchoring moved the panel).
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  // (buy from a row's BUY with the page scrolled to the BOTTOM: the box is far off screen, so the payoff must scroll to it)
  const buyId = await p.evaluate(() => { const b = [...document.querySelectorAll('#hFleet .rowc-price[data-fbuy]')].filter(x => !x.disabled).pop(); return b ? b.dataset.fbuy : null; });
  // (R9 moved the badge grid out of the hangar, so the page is shorter than a phone screen tall: a spacer after the list stands in for it, or the box can never be scrolled off screen)
  await p.evaluate(() => { if (!document.getElementById('hSpacer')) { const d = document.createElement('div'); d.id = 'hSpacer'; d.style.height = '1500px'; document.getElementById('hFleet').after(d); } });
  if (buyId) try { await p.evaluate(() => { const r = [...document.querySelectorAll('#hFleet .rowc, #hFleet + *, #hFleet ~ *')].pop(); (r || document.querySelector('#hFleet .rowc:last-child')).scrollIntoView({ block: 'end', behavior: 'instant' }); }); await p.waitForTimeout(150);
    const boxOff = await p.evaluate(() => document.querySelector('#hFleet .fpreview').getBoundingClientRect().bottom < 0);
    check(boxOff, 'the test could not scroll the box off screen (the placement check would prove nothing)');
    { await p.evaluate(id => document.querySelector(`#hFleet .rowc-price[data-fbuy="${id}"]`).click(), buyId); await p.waitForTimeout(700);
      // Stage 2: the payoff IS the box: #payoff takes the box's place in the page (no overlay), at full width, on screen.
      const v = await p.evaluate(() => { const po = document.getElementById('payoff'), box = document.querySelector('#hFleet .fpreview'), f = po && po.querySelector('.pay-frame').getBoundingClientRect();
        return po && { inPlace: po.previousElementSibling === box && box.hidden, fixed: getComputedStyle(po).position === 'fixed', wide: f.width >= document.getElementById('hFleet').clientWidth - 6,
          onScreen: f.top >= -1 && f.bottom <= innerHeight + 1, top: Math.round(f.top), h: Math.round(f.height) }; });
      check(v && v.inPlace && !v.fixed && v.wide, `the payoff takes the box's place in the page, full width, no overlay: ${JSON.stringify(v)}`);
      check(await p.evaluate(() => !document.getElementById('hPreviewBuy')), 'no BUY in the strip under a payoff (the next item is not offered mid-payoff)');
      await p.evaluate(() => game.registry.get('ui').renderHangar()); await p.waitForTimeout(100);   /* something re-renders mid-payoff (the estimate, a toast) */
      check(await p.evaluate(() => !!document.querySelector('#payoff .pay-frame') && document.querySelector('#hFleet .fpreview').hidden), 'a re-render during the payoff leaves it in the box (render() waits for OK)');
      await p.evaluate(() => game.registry.get('ui').go('missions')); await p.waitForTimeout(150);
      const left = await p.evaluate(() => ({ paying: !!game.registry.get('ui').fleet.paying, payoff: !!document.getElementById('payoff') }));
      check(!left.paying && !left.payoff, `leaving the hangar mid-payoff ends it (no parked payoff on return): ${JSON.stringify(left)}`);
      await p.evaluate(() => game.registry.get('ui').go('hangar')); await p.waitForTimeout(300);
      check(v && v.onScreen, `the payoff's picture is on screen after a buy from far down the list (scroll anchoring once moved it): ${JSON.stringify(v)}`);
      if (await p.isVisible('#payOk')) await p.click('#payOk').catch(() => {}); await p.waitForSelector('#payOk', { state: 'visible', timeout: 6000 }).then(() => p.click('#payOk')).catch(() => {}); await p.waitForTimeout(300);
      const back = await p.evaluate(() => { const b = document.querySelector('#hFleet .fpreview'), r = b && b.getBoundingClientRect(); return b && { shown: !b.hidden, top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight }; });
      check(back && back.shown && back.bottom > 0 && back.top < back.h, `after OK the plane box is back, on screen (scroll anchoring must not throw it away): ${JSON.stringify(back)}`); } } catch (e) { fails.push(`the payoff section threw ${e.name} (a payoff that does not appear / complete as designed): ${String(e.message).split('\n')[0].slice(0, 120)}`); }
  // Nothing of the hangar is drawn past the screen's side (R0 fitscreen found the panel wider than a 320 phone: the grid's implicit
  // column grew to its widest nowrap row). Measured at 320 x 568 and at the normal size; the ghost image animation is excluded by size.
  const past = async w => p.evaluate(W => [...document.querySelectorAll('#hangar .panel, #hangar .panel *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 4).map(e => `${e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + String(e.className).split(' ')[0]} right ${Math.round(e.getBoundingClientRect().right)} > ${W}`), w);
  // The ghost preview lies EXACTLY on the plane picture (the user's screenshot, 2026-11-02: the ghost filled the whole box,
  // caption included, so it was ~14% taller: two planes). Tap a line whose next level has a part layer, then every .fghost's
  // rect must equal the base picture's within 1 px (the PICTURE, not the box with its caption).
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  await p.click('[data-ftap="plane:jumbo.engines"]'); await p.waitForTimeout(700);
  const gh = await p.evaluate(() => { const base = document.querySelector('#hFleet .fpreview img:not(.fghost)'), gs = [...document.querySelectorAll('#hFleet .fpreview img.fghost')];
    const b = base && base.getBoundingClientRect();
    return { n: gs.length, worst: b ? Math.max(0, ...gs.map(g => { const r = g.getBoundingClientRect(); return Math.max(Math.abs(r.left - b.left), Math.abs(r.top - b.top), Math.abs(r.width - b.width), Math.abs(r.height - b.height)); })) : -1 }; });
  check(gh.n >= 1, `jumbo engines: no ghost layer drawn (${gh.n}): the check would prove nothing`);
  check(gh.worst >= 0 && gh.worst <= 1, `the ghost is ${gh.worst.toFixed(1)} px off the plane picture (want <= 1): two planes drawn`);
  // ...and on the smallest phone (320 x 568): the same page resized, the same measure (the plant fails at both widths).
  const vp0 = p.viewportSize(); await p.setViewportSize({ width: 320, height: 568 }); await p.waitForTimeout(300);
  const gh320 = await p.evaluate(() => { const base = document.querySelector('#hFleet .fpreview img:not(.fghost)'), gs = [...document.querySelectorAll('#hFleet .fpreview img.fghost')];
    const b = base && base.getBoundingClientRect();
    return { n: gs.length, worst: b ? Math.max(0, ...gs.map(g => { const r = g.getBoundingClientRect(); return Math.max(Math.abs(r.left - b.left), Math.abs(r.top - b.top), Math.abs(r.width - b.width), Math.abs(r.height - b.height)); })) : -1 }; });
  check(gh320.n >= 1 && gh320.worst >= 0 && gh320.worst <= 1, `at 320 x 568 the ghost is ${gh320.worst.toFixed(1)} px off the plane picture (${gh320.n} ghosts; want <= 1)`);
  // Each shrinkable row fits the panel's inner box (the tabs once spilled past the panel's padding yet stayed inside the screen).
  const rowsOver = await p.evaluate(() => ['.hangar-head', '.ftabs', '.ftimeline'].map(sel => { const e = document.querySelector('#hangar ' + sel); if (!e) return ''; const pan = document.querySelector('#hangar .panel'), inner = pan.clientWidth - 32, w = Math.round(e.getBoundingClientRect().width);   // (a grid item never shrinks below its min-content, so a too-wide row is itself wider than the panel's inner box)
    return e.scrollWidth > e.clientWidth + 1 || w > inner + 1 ? `${sel} content ${e.scrollWidth}, box ${w} > the panel's inner ${inner}` : ''; }).filter(Boolean));
  check(rowsOver.length === 0, `at 320 x 568 a hangar row spills out of its own box: ${rowsOver.join('; ')}`);
  // ONE rogue wide row must not drag the whole panel out (the grid's implicit column; minmax(0, 1fr) pins it): TAKE OFF stays on screen.
  const rogueRight = await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'white-space:nowrap;width:max-content;font-size:9px'; d.textContent = 'x'.repeat(60); document.querySelector('#hFleet').appendChild(d); const r = document.getElementById('hGoTop').getBoundingClientRect().right; d.remove(); return Math.round(r); });
  check(rogueRight <= 321, `at 320 x 568 one 60-character nowrap row pushes TAKE OFF to ${rogueRight} px (the grid column is not pinned)`);
  const over320 = await past(320);
  check(over320.length === 0, `at 320 x 568 the hangar is drawn past the screen's side: ${over320.join('; ')}`);
  await p.setViewportSize(vp0); await p.waitForTimeout(200);
  const over390 = await past(vp0.width);
  check(over390.length === 0, `at ${vp0.width} the hangar is drawn past the screen's side: ${over390.join('; ')}`);
  // R5: the hangar top (UX plan C5). Sub-tabs directly under the strip and >= 40 px tall; no era chips, no per-tab help sentence, no plane
  // paragraph in the page (it is behind the (i)); the era is ONE line whose tap opens the six eras; a dot on a sub-tab that has news.
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  const top = await p.evaluate(() => { const q = x => document.querySelector(x), r = e => e && e.getBoundingClientRect(); const strip = r(q('#hPreview')), tabs = r(q('#hFleet .ftabs')), t0 = r(q('#hFleet .ftab'));
    return { gap: Math.round(tabs.top - strip.bottom), tabH: Math.round(t0.height), help: !!q('.ftabhelp'), chips: document.querySelectorAll('#hFleet .fera').length, era: document.querySelectorAll('#hNextPlane').length, para: /Every plane flies the same way/.test(q('#hFleet').textContent) }; });
  check(top.gap >= 0 && top.gap <= 16, `the sub-tabs sit directly under the strip (gap ${top.gap} px)`);
  check(top.tabH >= 40, `the sub-tabs are at least 40 px tall (${top.tabH})`);
  check(!top.help && top.chips === 0 && !top.para && top.era === 1, `no help sentence / era chips / plane paragraph in the page; one era line: ${JSON.stringify(top)}`);
  await p.click('#hNextPlane'); await p.waitForTimeout(200);
  const eras = await p.evaluate(() => ({ n: document.querySelectorAll('#sheet .sheet-body p b').length, txt: (document.querySelector('#sheet') || {}).textContent || '' }));
  check(eras.n === 6 && /1950s/.test(eras.txt) && /Far future/.test(eras.txt), `tapping the era line opens the six eras: ${eras.n}`);
  await p.click('#sheet .sheet-ok', { timeout: 2500 }).catch(() => fails.push('a sheet that should be open is not')); await p.waitForTimeout(150);
  await p.click('[data-pinfo]'); await p.waitForTimeout(200);
  check(/Every plane flies the same way/.test(await p.evaluate(() => (document.querySelector('#sheet') || {}).textContent || '')), 'the (i) beside the plane name opens the "every plane flies the same way" text');
  await p.click('#sheet .sheet-ok', { timeout: 2500 }).catch(() => fails.push('a sheet that should be open is not')); await p.waitForTimeout(150);
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seen = ui.save.seen || {}; ui.save.seen['hangar/gadgets'] = []; ui.save.seen['hangar/systems'] = []; ui.fleet.render(); });
  const dd = await p.evaluate(() => ({ cur: !!document.querySelector('.ftab.on .dot'), gad: !!document.querySelector('[data-ftab=gadgets] .dot') }));
  check(!dd.cur && dd.gad, `a dot on a sub-tab with news, never on the one showing: ${JSON.stringify(dd)}`);
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(250);
  check(!(await p.evaluate(() => !!document.querySelector('[data-ftab=gadgets] .dot'))), 'the gadgets dot is gone once GADGETS is showing');
  // R7: a row with a NEW item has a dot beside its name for this visit; the next visit has none (it was seen).
  await p.evaluate(() => { const ui = game.registry.get('ui'); ui.save.seen['hangar/gadgets'] = []; ui.showHangar(); });
  await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(250);
  const rd = await p.evaluate(() => ({ n: document.querySelectorAll('#hFleet .rowc .dot.row-new').length, inName: [...document.querySelectorAll('#hFleet .rowc .dot.row-new')].every(d => d.parentElement.classList.contains('rowc-top')) }));
  check(rd.n >= 1 && rd.inName, `a gadget row with a new item has a dot beside its name: ${JSON.stringify(rd)}`);
  await p.evaluate(() => game.registry.get('ui').showHangar()); await p.waitForTimeout(250);
  check(await p.evaluate(() => document.querySelectorAll('#hFleet .rowc .dot.row-new').length) === 0, 'the next visit shows no row dot (it was seen)');
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  // Choose a plane: FLY THIS on the Comet.
  await p.click('[data-ftab=plane]'); await p.waitForTimeout(200);
  check(await p.evaluate(() => document.getElementById('hNextPlane').getBoundingClientRect().height) < 40, 'the Next plane line is one short line (its bar once grew 140 px tall)');
  check(/1990s twin/.test(await p.textContent('#hNextPlane')) && /1990s/.test(await p.textContent('#hNextPlane')) && !(await p.$('.fplane.locked')), 'the 1990s twin is the one Next plane line (no silhouettes)');
  await p.click('[data-pview=comet]'); await p.waitForTimeout(300); await p.click('#hPreviewBuy'); await p.waitForTimeout(300);   // (R5: FLY THIS is the strip's button, the plane rows only preview)
  s = await saved(p);
  check(s.fleet.plane === 'comet' && /Comet 4/.test(await p.textContent('.fplane-row.flying')) && /COMET 4/.test(await p.textContent('#hFleet .tree-head')), `the Comet is chosen and its lines shown: ${s.fleet.plane}`);
  check(p.errs.length === 0, `buying threw: ${p.errs.join(' | ')}`);
  await p.close();

  // 1b. In the 1950s the 1970s level is blocked: no BUY, says when.
  p = await open(150, { flightSeconds: 60 });
  await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  check(/Opens in 1970s/.test(await row(p, 'Magnet')) && !(await p.$('[data-fbuy="gadget:magnet"]')), `1950s: magnet 3 blocked: "${await row(p, 'Magnet')}"`);
  await p.close();

  p = await open(150);
  // 2. The bar along the bottom: from EVERY screen, one tap reaches EVERY other; exactly one
  // screen is open; the right tab is lit; nothing is left open underneath (e.g. a pop-up).
  const SCREENS = { fly: 'title', hangar: 'hangar', nature: 'nature', pilot: 'pilot', boards: 'boards' };   // NATURE is its own screen since 2026-10-21
  const state = () => p.evaluate(() => ({ open: ['title', 'results', 'hangar', 'nature', 'pilot', 'boards', 'how', 'about', 'info', 'scoreInfo', 'wInfo'].filter(id => !document.getElementById(id).hidden),
    lit: [...document.querySelectorAll('#tabbar .tab.on')].map(t => t.dataset.go), bar: !document.getElementById('tabbar').hidden }));
  for (const from of Object.keys(SCREENS)) for (const to of Object.keys(SCREENS)) {
    await p.click(`[data-go=${from}]`); await p.waitForTimeout(80);
    await p.evaluate(() => { document.getElementById('about').hidden = false; });   // a pop-up left open
    await p.evaluate(to => document.querySelector(`[data-go=${to}]`).click(), to); await p.waitForTimeout(80);   // (a real pop-up covers the bar; moving must still close it)
    const st = await state();
    check(st.bar && st.open.length === 1 && st.open[0] === SCREENS[to] && st.lit.join() === to, `${from} -> ${to}: ${JSON.stringify(st)}`);
  }
  const box = await p.locator('#tabbar').boundingBox();
  check(box && box.y + box.height >= 840 && box.height >= 48, `the bar should sit at the bottom, big enough to tap: ${JSON.stringify(box)}`);
  // No bar while flying; back after the flight.
  await p.click('[data-go=fly]'); await p.click('#goBtn'); await started(p); await p.waitForTimeout(400);
  check(!(await state()).bar, 'no bar while flying');
  await p.close();

  // 3. Short of crystals: the button is grey and says what is missing.
  p = await open(1);   // 7 short of magnet 3's 8 crystals
  await p.click('#tabHangar'); await p.waitForTimeout(300); await p.click('[data-ftab=gadgets]'); await p.waitForTimeout(200);
  check(await p.isDisabled('[data-fbuy="gadget:magnet"]'), 'short of crystals: BUY should be grey');
  await p.click('[data-ftap="gadget:magnet"]'); await p.waitForTimeout(300);
  check(/need 7 more/.test(await p.textContent('#hPreview')), `short of crystals: the strip should say "need 7 more": "${await p.textContent('#hPreview')}"`);
  await p.close();

  await b.close();
  if (fails.length) { console.log('FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PASS hangar');
})();
