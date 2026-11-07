// Storage persistence (src/persist.js; the user lost a 260-flight save, 2026-11-05, most likely to Chrome's 'clear site data when you close all windows').
// The game cannot see that setting, but it can ASK for persistent storage; if the browser will not promise (false), ONE plain note from landing 8 says to
// write the pilot code down. A fake navigator.storage: no browser.
// Run: node tests/persist.cjs   (proved by planted defects: tools/plants.tsv, test persist)
(async () => {
  const P = await import('../src/persist.js');
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const nav = (persist, persisted) => ({ storage: { ...(persist ? { persist } : {}), ...(persisted ? { persisted } : {}) } });
  let calls = 0;
  P.resetAsked(); check((await P.askPersist(nav(async () => { calls++; return false; }))) === false, 'persist() false -> false (the browser will not promise)');
  P.resetAsked(); check((await P.askPersist(nav(async () => true))) === true, 'persist() true -> true');
  P.resetAsked(); check((await P.askPersist(nav(async () => false, async () => true))) === true, 'already persisted -> true, without asking again');
  P.resetAsked(); check((await P.askPersist({})) === null && (await P.askPersist(null)) === null, 'no storage API -> null (nothing to say)');
  P.resetAsked(); check((await P.askPersist(nav(async () => { throw new Error('no'); }))) === null, 'persist() throws -> null');
  P.resetAsked(); await P.askPersist(nav(async () => { calls++; return false; })); const before = calls; await P.askPersist(nav(async () => { calls++; return false; }));
  check(calls === before, 'asked once per page load');
  const save = (landings, seenTips = []) => ({ landings, seenTips });
  check(P.noteDue(save(8), false) && P.noteDue(save(12), false), 'the note is due from landing 8 when the browser said false');
  check(!P.noteDue(save(7), false), 'not before landing 8');
  check(!P.noteDue(save(9), true) && !P.noteDue(save(9), null), 'not when the browser promised, or does not say');
  check(!P.noteDue(save(9, [P.PERSIST_TIP]), false), 'once only');
  check(!P.noteDue(save(9, ['*']), false), "not for the automated tests' saves ('*')");
  check(/pilot code/.test(P.noteText(true)) && /Pick a pilot name/.test(P.noteText(false)) && P.noteText(true).split(' ').length < 30, 'the note says what to do, with or without a pilot name');
  console.log(fails.length ? `FAIL persist:\n - ${fails.join('\n - ')}` : 'PASS persist: asked once, false is noted once from landing 8, true or unknown is silent');
  process.exit(fails.length ? 1 : 0);
})();
