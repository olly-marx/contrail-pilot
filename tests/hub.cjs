// The season 2 hub (S2 of research/PROPOSAL-HOME-MISSIONS.md; src/hub.js). No browser.
// 1. at most HUB_WORDS words, for real saves from a fresh pilot to everything done, and with the longest crossing names;
// 2. the bar's tabs (HANGAR, NATURE, MISSIONS) appear only once their reveal mission is done (R3: the tiles are gone); 3. NEXT is the mission on
// top, and a ready crossing replaces it. (Classic saves here: season 2's UP NEXT is tests/nextup.cjs.)
// Run: node tests/hub.cjs   (proved by planted defects)
(async () => {
  const H = await import('../src/hub.js'), T = await import('../src/tips.js'), M = await import('../src/missions.js'), { CROSSINGS } = await import('../src/crossings.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const save = n => ({ city: 'AMSTERDAM', tutorialDone: true, missionsDone: M.MISSIONS.slice(0, n).map(m => m.id) });
  const longest = CROSSINGS.map(c => `${c.from} to ${c.to}`).sort((a, b) => b.length - a.length)[0];
  for (let n = 0; n <= M.MISSIONS.length; n++) {
    for (const crossingReady of [null, longest]) {
      const v = H.hubView(save(n), { badges: { hangar: 'FREE', nature: 'NEW' }, crossingReady });
      const recount = T.wordCount([v.next ? v.next.title : '', ...v.route, 'TAKE OFF'].join(' '));
      check(v.words === recount, `${n} done: the hub's own count ${v.words} matches a recount ${recount} (a count that is not real proves nothing)`);
      check(v.words <= H.HUB_WORDS, `${n} missions done${crossingReady ? ', a crossing ready' : ''}: ${v.words} words on the hub (max ${H.HUB_WORDS})`);
      if (crossingReady) check(v.next && v.next.crossing && v.next.title.includes(crossingReady), `a ready crossing replaces NEXT (${JSON.stringify(v.next)})`);
      else { const m = M.current(save(n)); check(m ? v.next && v.next.id === m.id : v.next === null, `${n} done: NEXT is the top mission ${m && m.id} (${JSON.stringify(v.next)})`); }
      for (const t of ['hangar', 'nature', 'missions']) {
        const due = save(n).missionsDone.includes(H.REVEALS[t]);
        check(H.revealed(save(n), t) === due, `${n} done: the bar's ${t} tab ${due ? 'should' : 'should not'} show`);
      }
      check(v.worldChoice === save(n).missionsDone.includes(H.REVEALS.world), `${n} done: the route choice opens with ${H.REVEALS.world}`);
    }
  }
  check(!['hangar', 'nature', 'missions'].some(t => H.revealed(save(0), t)), 'a brand-new pilot has no HANGAR, NATURE or MISSIONS tab: only NEXT and TAKE OFF');
  check(Array.isArray(H.hubView(save(0)).up) && !('tiles' in H.hubView(save(0))), 'the hub view has UP NEXT rows and no tiles any more');
  console.log(fails.length ? `FAIL hub:\n - ${fails.slice(0, 12).join('\n - ')}` : `PASS hub: <= ${H.HUB_WORDS} words for all ${M.MISSIONS.length + 1} stages (longest crossing too), bar tabs by reveal, NEXT = top mission or a ready crossing`);
  process.exit(fails.length ? 1 : 0);
})();
