// Every city mission can be reached on the route (the user, 2026-11-02: "a mission says fly to Berlin but Berlin is never
// reachable"; research/ROUTE-BUGS.md). The route AIMS at an open city mission (src/aim.js): the shortest way there, then the
// normal tour. For EVERY season-2 starter area x EVERY start city in it x EVERY city template (declared below):
//   the mission's city is at most MAX_LEGS stops along routeTo(save, target) (and at least 2 for 'route', which must pass an
//   airport); a chain's second city likewise from its first. Plus the wiring: aimTarget picks the first open city mission and
//   routeFor flies routeTo for it.
// AIM=off measures TODAY's tour (the aim switched off): it reports how many targets are out of reach, and fails (that is the
// point: run it once red on today's behaviour). Run: node tests/missionreach.cjs   (proved by planted defects)
globalThis.SEASON2 = true;
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const A = await import('../src/areas.js'), M = await import('../src/missions2.js'), AIM = await import('../src/aim.js');
  if (process.env.AIM === 'off') AIM.ROUTE_AIM.on = false;
  // DECLARED: the mission templates that name a city (a new one must be added here AND to src/aim.js CITY_TEMPLATES).
  const CITY = ['land-city', 'chain', 'rescue', 'route'];
  const naming = M.TEMPLATES.filter(t => /\$\{f\.city[BC]?\}/.test(String(t.title))).map(t => t.id).sort();
  check(JSON.stringify(naming) === JSON.stringify([...CITY].sort()) && JSON.stringify(Object.keys(AIM.CITY_TEMPLATES).sort()) === JSON.stringify([...CITY].sort()),
    `the city templates are declared everywhere (missions2 names a city in: ${naming}; aim.js: ${Object.keys(AIM.CITY_TEMPLATES)})`);
  let cases = 0; const far = [], per = {};
  const at = (path, t) => path.indexOf(t, 1);
  for (const [a, area] of Object.entries(A.AREAS)) {
    if (!area.starter) continue;
    for (const c of area.cities) {
      const save = { areas: [a], homeArea: a, homeCity: area.start, city: c, visited: [c], tutorialDone: true, missionsDone: ['L1', 'L2', 'L3', 'L4', 'L5'], levels: {}, habitat: {},
        fleet: { plane: 'comet', planes: { comet: {} }, systems: {}, gadgets: {} } };
      const f = M.fillFor(save, a, c);
      for (const tid of CITY) {
        const t = AIM.CITY_TEMPLATES[tid](f, save); if (!t || t === c) continue;
        const i = at(AIM.routeTo(save, t, tid, 12), t); cases++; (per[a] = per[a] || { cases: 0, far: 0 }).cases++;
        if (i < (tid === 'route' ? 2 : 1) || i > AIM.MAX_LEGS) far.push(`${a} ${c} ${tid} -> ${t} at stop ${i}`);
        if (tid === 'chain' && f.cityB && f.cityB !== f.city) {   // its second city, from its first (after landing there)
          const s2 = { ...save, city: f.city, visited: [c, f.city], prevLanded: f.city }, t2 = AIM.CITY_TEMPLATES.chain(f, s2);
          const j = at(AIM.routeTo(s2, t2, 'chain', 12), t2); cases++; per[a].cases++;
          if (j < 1 || j > AIM.MAX_LEGS) far.push(`${a} ${f.city} chain(2nd) -> ${t2} at stop ${j}`);
        }
      }
      // The wiring, once per start: the aim is the first open city mission's city, and routeFor flies the aimed route.
      const aim = AIM.aimTarget(save), first = M.visible(save).find(m => AIM.CITY_TEMPLATES[m.def.id]);
      if (AIM.ROUTE_AIM.on && first) {
        const want = AIM.CITY_TEMPLATES[first.def.id](first.fill, save);
        check(aim === (want === c ? aim : want), `${a} ${c}: aimTarget is the first open city mission's city (${aim} vs ${want})`);
        if (aim) check(AIM.routeFor(save, 12).join() === AIM.routeTo(save, aim, first.def.id, 12).join(), `${a} ${c}: routeFor flies the aimed route`);
      }
    }
  }
  // Per area (the user asked to see how bad today's routing is): cases and how many are out of reach.
  for (const f of far) per[f.split(' ')[0]].far++;
  console.log(`missionreach${AIM.ROUTE_AIM.on ? '' : ' (AIM=off: today\'s tour)'} per area, out of reach / checked: ` + Object.entries(per).map(([a, v]) => `${a} ${v.far}/${v.cases}`).join(', '));
  check(cases > 100, `enough cases checked (${cases}); else this proves nothing`);
  check(!far.length, `city missions out of reach (> ${AIM.MAX_LEGS} stops, or a 'route' with no airport to pass): ${far.length} of ${cases}: ${far.slice(0, 8).join('; ')}`);
  console.log(fails.length ? `FAIL missionreach${AIM.ROUTE_AIM.on ? '' : ' (AIM=off: today\'s tour)'}:\n - ${fails.join('\n - ')}` : `PASS missionreach: ${cases} city missions from every start in every starter area are within ${AIM.MAX_LEGS} stops on the aimed route`);
  process.exit(fails.length ? 1 : 0);
})();
