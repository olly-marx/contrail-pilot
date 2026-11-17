// THE SCHOOL BOARD's lesson rules that Oliver tripped over (src/lessons.js). No browser.
// 2026-11-17: after saving his pilot name the board still asked him to 'choose the name': the lesson finished only when the name TOUR reached its end.
// Run: node tests/lessons.cjs   (plants in tools/plants.tsv)
(async () => {
  const fails = [], check = (c, m) => { if (!c) fails.push(m); };
  const B = await import('../src/lessons.js');
  const name = B.BOARD.find(l => l.id === 'name');
  check(name, 'the board has the name lesson');
  check(B.lessonDone({ school2: true, tours: [], pilotNamed: true }, name), 'a saved pilot name finishes the name lesson, tour or not');
  check(B.lessonDone({ school2: true, tours: ['name'] }, name), 'the finished name tour still counts');
  check(!B.lessonDone({ school2: true, tours: [] }, name), 'no name yet: the lesson is open');
  if (fails.length) { console.log('FAIL lessons\n' + fails.map(f => '  - ' + f).join('\n')); process.exit(1); }
  console.log('ok lessons: the name lesson finishes on a saved name');
})();
