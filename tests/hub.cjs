// The season 2 hub (S2 of research/PROPOSAL-HOME-MISSIONS.md; src/hub.js). No browser.
// 1. at most HUB_WORDS words, for real saves from a fresh pilot to everything done, and with the longest crossing names;
// 2. tiles appear only once their reveal mission is done, in a fixed order; 3. NEXT is the mission on top, and a ready
// crossing replaces it.
// Run: node tests/hub.cjs   (proved by planted defects)
(async () => {
  const H = await import('../src/hub.js'), T = await import('../src/tips.js'), M = await import('../src/missions.js'), { CROSSINGS } = await import('../src/crossings.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = n => ({ city: 'AMSTERDAM', tutorialDone: true, missionsDone: M.MISSIONS.slice(0, n).map(m => m.id) });
  const longest = CROSSINGS.map(c => `${c.from} to ${c.to}`).sort((a, b) => b.length - a.length)[0];
  for (let n = 0; n <= M.MISSIONS.length; n++) {
    for (const crossingReady of [null, longest]) {
      const v = H.hubView(save(n), { badges: { hangar: 'FREE', nature: 'NEW' }, crossingReady });
      const recount = T.wordCount([v.next ? v.next.title : '', ...v.route, ...v.tiles.map(t => `${t.label} ${t.badge}`), 'TAKE OFF'].join(' '));
      check(v.words === recount, `${n} done: the hub's own count ${v.words} matches a recount ${recount} (a count that is not real proves nothing)`);
      check(v.words <= H.HUB_WORDS, `${n} missions done${crossingReady ? ', a crossing ready' : ''}: ${v.words} words on the hub (max ${H.HUB_WORDS})`);
      if (crossingReady) check(v.next && v.next.crossing && v.next.title.includes(crossingReady), `a ready crossing replaces NEXT (${JSON.stringify(v.next)})`);
      else { const m = M.current(save(n)); check(m ? v.next && v.next.id === m.id : v.next === null, `${n} done: NEXT is the top mission ${m && m.id} (${JSON.stringify(v.next)})`); }
      for (const t of ['hangar', 'nature', 'missions']) {
        const due = save(n).missionsDone.includes(H.REVEALS[t]);
        check(v.tiles.some(x => x.id === t) === due, `${n} done: tile ${t} ${due ? 'should' : 'should not'} show`);
      }
      check(v.worldChoice === save(n).missionsDone.includes(H.REVEALS.world), `${n} done: the route choice opens with ${H.REVEALS.world}`);
    }
  }
  const order = H.hubView(save(M.MISSIONS.length)).tiles.map(t => t.id).join();
  check(order === 'missions,hangar,nature', `tiles in a fixed order: ${order}`);
  check(!H.hubView(save(0)).tiles.length, 'a brand-new pilot sees no tiles: only NEXT and TAKE OFF');
  console.log(fails.length ? `FAIL hub:\n - ${fails.slice(0, 12).join('\n - ')}` : `PASS hub: <= ${H.HUB_WORDS} words for all ${M.MISSIONS.length + 1} stages (longest crossing too), tiles by reveal, NEXT = top mission or a ready crossing`);
  process.exit(fails.length ? 1 : 0);
})();
