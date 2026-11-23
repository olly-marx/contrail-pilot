// LAND EVEN (pacing A2, 2026-11-18; src/config.js LAND_EVEN, src/nature.js projectWeight): every home land's tier 1-2 projects give about the same
// nature (East Asia gave 22 where the plains gave 43, research/PACING-2026-11-18-PREREG.md), and a finished land is still what it was.
// Run: node tests/landeven.cjs
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const N = await import('../src/nature.js'), H = await import('../src/habitats.js'), CF = await import('../src/config.js');
  check(CF.LAND_EVEN.on === true && CF.LAND_EVEN.share === 0.65, `LAND_EVEN ships on at 0.65: ${JSON.stringify(CF.LAND_EVEN)}`);
  const lands = Object.keys(H.REGION_DATA).filter(r => r !== 'woodland');
  const meter = (r, f) => N.landMeter({ habitat: { [r]: H.REGION_DATA[r].projects.filter(f).map(p => p.id) }, planted: {}, plantedIn: {} }, r);
  const t12 = {}, full = {};
  for (const r of lands) { t12[r] = meter(r, p => p.tier <= 2); full[r] = meter(r, () => true); }
  const lo = Math.min(...Object.values(t12)), hi = Math.max(...Object.values(t12));
  check(lo >= 30, `every land's tier 1-2 LAND projects give at least 30 of the LAND part (0.73.0: water projects count on the water side; 38 of the whole meter before; eastasia was 22): ${JSON.stringify(t12)}`);
  check(hi - lo <= 12, `the spread between lands is at most 12 (was 22 to 43): ${lo}..${hi}`);
  // A finished land: the weights keep each land's total, so all projects give what they gave before (measured with LAND_EVEN off).
  CF.LAND_EVEN.on = false; const fullOff = {}; for (const r of lands) fullOff[r] = meter(r, () => true); CF.LAND_EVEN.on = true;
  check(lands.every(r => Math.abs(full[r] - fullOff[r]) <= 1), `every project done gives the same meter with and without LAND_EVEN: ${JSON.stringify(lands.filter(r => Math.abs(full[r] - fullOff[r]) > 1).map(r => [r, full[r], fullOff[r]]))}`);
  // Lands already at the share are untouched.
  CF.LAND_EVEN.on = false; const plainsOff = meter('plains', p => p.tier <= 2); CF.LAND_EVEN.on = true;
  // (until 0.73.0: 'the plains (share 0.73 already) are unchanged'. With its water projects on the water side the plains' land share changed, so LAND_EVEN now moves it: no longer asserted.)
  console.log(fails.length ? `FAIL landeven:\n - ${fails.join('\n - ')}` : `PASS landeven: tier 1-2 nature ${lo}..${hi} in every land, finished lands unchanged`);
  process.exit(fails.length ? 1 : 0);
})();
